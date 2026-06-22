/* T151 — REAL-AUDIO divergence gate (Playwright + headless Chromium + a true
 * OfflineAudioContext). The synth master output was diverging exponentially through
 * the FDN reverb's feedback. The Node guard (test/synth.test.js) checks the shipped
 * CONSTANTS stay in the measured-safe envelope, but the AUTHORITATIVE proof must be
 * REAL Web Audio — an earlier analytic model FALSE-GREENED decay 0.9 while the real
 * filters still blew up. This gate renders each of the 12 styles' ACTUAL reverb
 * (the engine's own `Synth.makeReverb`, real `BiquadFilter`s + `DelayNode`s) through
 * an `OfflineAudioContext` for 5 s under continuous excitation and asserts the output
 * peak stays BOUNDED (≤ 2) — exactly the runaway the browser AnalyserNode caught.
 *
 * GUARDED / OPT-IN: SKIPS cleanly (exit 0) if no browser is present, so Node-only CI
 * is unaffected. Run locally:
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node test/browser/audio.test.js
 */
"use strict";
const { loadPlaywright, startServer, ensureBrowsersPath } = require("./_harness.js");

const RENDER_SECS = 5;          // ≥5 s per the DoD
const SEND_LEVEL = 0.22;        // the engine's music-send gain (the reverb's real input level)
const PEAK_MAX = 2.0;           // bounded ⇔ peak ≤ ~2 (the runaway hit 30–160)

let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }
function skip(why){ console.log("\nSKIP (real-audio gate not run): " + why + "\n(Node-only CI is unaffected — this is an additional, opt-in gate.)"); process.exit(0); }

(async () => {
  const pw = loadPlaywright();
  if(!pw || !pw.chromium) skip("Playwright not found (set PLAYWRIGHT_PATH).");
  ensureBrowsersPath();

  const srv = await startServer();
  const base = "http://127.0.0.1:" + srv.address().port + "/index.html";
  let browser = null;
  try{ browser = await pw.chromium.launch({ headless: true }); }
  catch(e){ srv.close(); skip("Chromium launch failed: " + e.message); }

  try{
    const page = await (await browser.newContext()).newPage();
    await page.goto(base, { waitUntil: "load" });
    await page.waitForFunction(() => !!window.Synth && !!window.Synth.makeReverb && !!window.Synth.reverbParams, { timeout: 8000 });

    // Render the ENGINE'S OWN reverb per style in a real OfflineAudioContext and
    // return the peak |sample| of a 5 s tail driven by continuous noise. `decay=null`
    // → use each style's EFFECTIVE (clamped) tail, exactly as the engine plays it.
    const result = await page.evaluate(async (cfg) => {
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if(!OAC) return { unsupported: true };
      const SR = 44100, P = window.Synth.reverbParams();
      const effDecay = id => {
        const raw = window.Synth.CONTEXTS[id].reverbDecay;
        return Math.min(raw == null ? P.decayDefault : raw, P.decayMax);
      };
      async function renderPeak(decay){
        const ctx = new OAC(1, Math.round(SR * cfg.secs), SR);
        const rv = window.Synth.makeReverb(ctx, { decay: decay });   // the REAL reverb graph
        const nb = ctx.createBuffer(1, Math.round(SR * cfg.secs), SR), ch = nb.getChannelData(0);
        for(let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * cfg.level;   // continuous excitation
        const src = ctx.createBufferSource(); src.buffer = nb; src.connect(rv.input); src.start(0);
        rv.output.connect(ctx.destination);
        const out = (await ctx.startRendering()).getChannelData(0);
        let peak = 0; for(let i = 0; i < out.length; i++){ const a = Math.abs(out[i]); if(a > peak) peak = a; }
        return peak;
      }
      const styles = {};
      for(const id of window.Synth.STYLE_IDS) styles[id] = +(await renderPeak(effDecay(id))).toFixed(3);
      const diverge = +(await renderPeak(0.9)).toFixed(3);   // teeth: the old (unclamped) ambient value
      return { styles: styles, decayMax: P.decayMax, dampQ: P.dampQ, divergeAt09: diverge };
    }, { secs: RENDER_SECS, level: SEND_LEVEL });

    if(result.unsupported){ await browser.close(); srv.close(); skip("OfflineAudioContext unavailable in this browser."); }

    // every style's REAL reverb stays bounded over 5 s.
    let worst = 0, worstStyle = "";
    for(const id of Object.keys(result.styles)){
      const pk = result.styles[id];
      if(pk > worst){ worst = pk; worstStyle = id; }
      ok(pk <= PEAK_MAX, "REAL reverb BOUNDED for '" + id + "' (5 s peak " + pk + " ≤ " + PEAK_MAX + ")");
    }
    ok(worst <= PEAK_MAX, "ALL 12 styles' real Web-Audio reverb is bounded (worst " + worst + " @ '" + worstStyle + "', decayMax=" + result.decayMax + ", dampQ=" + result.dampQ + ")");

    // teeth: the SAME real render at the old unclamped ambient decay (0.9) DIVERGES —
    // so this gate genuinely catches the runaway (and the clamp to decayMax is what
    // protects ambient). This is the case the analytic model false-greened.
    ok(result.divergeAt09 > PEAK_MAX,
       "the gate HAS TEETH: the pre-fix unclamped decay 0.9 DIVERGES in real Web Audio (peak " + result.divergeAt09 + " ≫ " + PEAK_MAX + ")");

    // ---- T155: the PAD-class beds are SPECTRALLY distinct (real audio) ----------
    // The owner heard "every style shares the same synth string": all 12 contexts used
    // the SAME sawtooth pad. The golden pins patch NAMES, not timbre — so prove the beds
    // actually SOUND different: render each pad via OfflineAudioContext and measure its
    // spectral centroid (FFT). They must spread across a wide range, every pair clearly
    // separated — not a cutoff tweak on one oscillator.
    const spec = await page.evaluate(async () => {
      const SR = 44100, OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, S = window.Synth;
      if(!OAC) return { unsupported: true };
      function fft(re, im){ const n = re.length;
        for(let i = 1, j = 0; i < n; i++){ let bit = n >> 1; for(; j & bit; bit >>= 1) j ^= bit; j ^= bit; if(i < j){ const tr = re[i]; re[i] = re[j]; re[j] = tr; const ti = im[i]; im[i] = im[j]; im[j] = ti; } }
        for(let len = 2; len <= n; len <<= 1){ const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
          for(let i = 0; i < n; i += len){ let cr = 1, ci = 0;
            for(let k = 0; k < len / 2; k++){ const ur = re[i + k], ui = im[i + k];
              const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
              re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
              const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr; } } } }
      async function centroid(pad){
        const ctx = new OAC(1, Math.round(SR * 0.7), SR);
        const dest = ctx.createGain(); dest.connect(ctx.destination);
        S.renderVoice(ctx, dest, S.PATCHES[pad], S.hz(50), 0, 0.6);   // a sustained ~147 Hz bed note
        const buf = (await ctx.startRendering()).getChannelData(0);
        const N = 8192, start = Math.round(SR * 0.35);   // steady-state window (past the attack)
        const re = new Float64Array(N), im = new Float64Array(N);
        for(let i = 0; i < N; i++){ const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)); re[i] = (buf[start + i] || 0) * w; }
        fft(re, im);
        let num = 0, den = 0; for(let k = 1; k < N / 2; k++){ const mag = Math.hypot(re[k], im[k]); num += k * SR / N * mag; den += mag; }
        return den > 0 ? Math.round(num / den) : 0;
      }
      const pads = Object.keys(S.PATCHES).filter(n => n.indexOf("pad") === 0);
      const c = {}; for(const p of pads) c[p] = await centroid(p);
      return { centroids: c };
    });
    if(spec.unsupported){ /* covered by the reverb skip above */ }
    else {
      const cs = Object.entries(spec.centroids).sort((a, b) => a[1] - b[1]);
      const vals = cs.map(e => e[1]);
      let minGap = Infinity; for(let i = 1; i < vals.length; i++) minGap = Math.min(minGap, vals[i] - vals[i - 1]);
      const range = vals[vals.length - 1] - vals[0];
      ok(cs.length >= 5, "all " + cs.length + " pad beds rendered a real-audio spectrum");
      ok(new Set(vals).size === vals.length, "every pad bed has a DISTINCT spectral centroid (" + cs.map(e => e[0] + "=" + e[1]).join("  ") + ")");
      ok(minGap >= 150, "adjacent pad beds are clearly separated (min centroid gap " + minGap + " Hz ≥ 150 — audibly different, not a cutoff tweak)");
      ok(range >= 1000, "the pad beds span a WIDE timbral range (" + range + " Hz from darkest to brightest)");
    }

    // ---- T165: a context-switch FLUSH actually DRAINS the reverb tail (real audio) --
    // The switch must not let the old track's tail bleed through (the "doesn't fully
    // switch" / foghorn). Render the engine's own reverb fed one impulse, with vs
    // without a mid-tail flush(), and compare the LATER tail energy: the flush must
    // collapse it (the FDN delay lines drain), proving no carry-over past a swap.
    const fl = await page.evaluate(async () => {
      const SR = 44100, OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, S = window.Synth;
      if(!OAC) return { unsupported: true };
      async function tailAfter(doFlush){
        const ctx = new OAC(1, Math.round(SR * 1.2), SR);
        const rv = S.makeReverb(ctx, { decay: 0.78 });
        const buf = ctx.createBuffer(1, 1, SR); buf.getChannelData(0)[0] = 1;
        const src = ctx.createBufferSource(); src.buffer = buf; src.connect(rv.input); src.start(0);
        rv.output.connect(ctx.destination);
        if(doFlush) rv.flush(0.2, 0.13);     // flush 0.2 s in (as a switch would)
        const d = (await ctx.startRendering()).getChannelData(0);
        let e = 0; for(let i = Math.round(SR * 0.45); i < d.length; i++) e += d[i] * d[i];   // energy AFTER the flush window
        return e;
      }
      return { withFlush: await tailAfter(true), noFlush: await tailAfter(false) };
    });
    if(!fl.unsupported){
      ok(fl.noFlush > 0, "the un-flushed reverb has a real tail (baseline energy " + fl.noFlush.toExponential(2) + ")");
      ok(fl.withFlush < fl.noFlush * 0.05, "T165: flush() DRAINS the FDN tail — post-flush energy " + fl.withFlush.toExponential(2) + " ≪ 5% of the un-flushed " + fl.noFlush.toExponential(2) + " (no carry-over past a switch)");
    }

    await browser.close();
  } catch(e){
    fails++; console.log("  FAIL: harness error — " + (e && e.stack || e));
    try{ if(browser) await browser.close(); }catch(_){}
  } finally {
    srv.close();
  }

  console.log("\n" + (fails === 0 ? "ALL " + checks + " REAL-AUDIO CHECKS PASSED" : fails + "/" + checks + " FAILED"));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("REAL-AUDIO GATE ERROR: " + (e && e.stack || e)); process.exit(1); });
