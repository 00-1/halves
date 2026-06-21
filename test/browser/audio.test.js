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
