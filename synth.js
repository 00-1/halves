/*
 * Halves — synth.js · the generative-audio engine (T120, Builder B / per the
 * T119 research in docs/research-generative-audio.md).
 *
 * A SELF-CONTAINED, no-build Web Audio engine that the game can later mount and
 * drive — exposing window.Synth. It replaces the flat `osc→gain` chip sound with
 * real PATCHES: a voice renderer with ADSR amplitude envelopes, a filter with its
 * own envelope + optional LFO (the "wub"), unison/detune, FM, and noise-based
 * percussion — so contexts can differ by *instrument*, not just notes.
 *
 * PHASED build (T120, one increment per push):
 *   (1) ENGINE CORE  ← this file, this increment: AudioContext + bus graph →
 *       limiter → destination; the `adsr` + filter/LFO voice renderer; the patch
 *       table; Synth.play(). Headless-tested (patch→graph, ADSR shape, distinctness).
 *   (2) Space (FDN reverb + sends + stereo width + ducking), (3) Harmony,
 *   (4) Rhythm/variation, (5) Contexts — land in later increments.
 *
 * SCOPE: NEW standalone B-owned file only (synth.js + test/synth.test.js). It
 * NEVER edits sound.js or any existing Halves file — the [A] wiring (mount Synth,
 * route contexts, fire the win-sting, duck, retire the old scheduler) is phase 6.
 *
 * Constraints (T119 §7): pure WebAudio, NO sample assets (noise is procedurally
 * filled), no-build, no timer/RAF leak (core is one-shot; the scheduler lands in a
 * later increment), and a brickwall limiter on the master (mirrors sound.js) so
 * clipping is impossible by construction.
 *
 * Public API (window.Synth) — this increment:
 *   Synth.mount(opts?)            -> build the graph on an AudioContext (lazy; opts.ctx injects one)
 *   Synth.play(patch, when?, opts?)   one-shot voice from a patch (SFX / stings / a manual note)
 *   Synth.drum(piece, when?)      kick | snare | hat | clap
 *   Synth.setMuted(m) · Synth.isMuted() · Synth.capabilities() · Synth.dispose()
 * The pure voice/patch/envelope math is exported for headless tests.
 */
(function(){
  "use strict";

  // ---- master chain constants (mirror sound.js so the two mix consistently) ---
  const MASTER_VOL = 0.80;          // master gain (the [A] wire reconciles with T113 volume)
  const LIMIT_DB = -1.5;            // brickwall ceiling (≈0.84 linear, safely < 1.0)
  const NOISE_SEED = 0x9e3779b9;    // deterministic noise fill (testable; no sample asset)

  // ---- note + envelope helpers (pure) ----------------------------------------
  function hz(midi){ return 440 * Math.pow(2, (midi - 69) / 12); }
  function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // Schedule an ADSR onto an AudioParam (gain or filter freq). Exponential ramps
  // for amplitude (the ear is logarithmic); a floor of 1e-4 keeps exp ramps legal.
  // `dur` = how long the "key" is held; attack+decay always complete even if short.
  // Returns the time the voice is finished (release end) so the caller can stop it.
  function adsr(param, t0, dur, env){
    env = env || {};
    const a = env.a == null ? 0.01 : env.a;
    const d = env.d == null ? 0.08 : env.d;
    const s = env.s == null ? 0.6 : env.s;
    const r = env.r == null ? 0.2 : env.r;
    const peak = Math.max(1e-4, env.peak == null ? 1 : env.peak);
    const sus = Math.max(1e-4, peak * s);
    const tHold = t0 + Math.max(a + d, dur);
    if(param.cancelScheduledValues) param.cancelScheduledValues(t0);
    param.setValueAtTime(1e-4, t0);
    param.exponentialRampToValueAtTime(peak, t0 + a);
    param.exponentialRampToValueAtTime(sus, t0 + a + d);
    param.setValueAtTime(sus, tHold);
    param.exponentialRampToValueAtTime(1e-4, tHold + r);
    return tHold + r;
  }

  // ---- the patch table -------------------------------------------------------
  // A patch is data the voice renderer turns into a sub-graph. Contexts (later
  // increments) orchestrate these; the point is that pad/pluck/bass/bell/lead/wub
  // are genuinely different INSTRUMENTS, not the same oscillator with a new note.
  const PATCHES = {
    // lush detuned pad — slow soft attack, gentle lowpass (calm contexts)
    pad:   { engine:"unison", wave:"sawtooth", voices:3, detune:12, gain:0.20, bus:"music", pan:0,
             amp:{ a:0.6, d:0.4, s:0.8, r:1.2 }, filter:{ type:"lowpass", cut:1100, env:1.4, q:2 } },
    // bright plucked transient — sharp attack, filter snaps open then closes
    pluck: { engine:"mono",   wave:"triangle", gain:0.28, bus:"music",
             amp:{ a:0.002, d:0.18, s:0.0, r:0.12 }, filter:{ type:"lowpass", cut:2600, env:3.0, q:6 } },
    // round sub/bass — low cutoff, follows the root
    bass:  { engine:"mono",   wave:"sawtooth", gain:0.38, bus:"music",
             amp:{ a:0.004, d:0.2, s:0.7, r:0.1 }, filter:{ type:"lowpass", cut:520, env:1.0, q:1 } },
    // FM bell/mallet — fast attack, long decay, no sustain (impossible with raw waves)
    bell:  { engine:"fm",     ratio:2, index:220, gain:0.26, bus:"music",
             amp:{ a:0.002, d:0.5, s:0.0, r:0.3 } },
    // square lead — present mid voice
    lead:  { engine:"mono",   wave:"square", gain:0.30, bus:"music",
             amp:{ a:0.01, d:0.1, s:0.6, r:0.12 }, filter:{ type:"lowpass", cut:2200, env:1.5, q:3 } },
    // the wub — resonant lowpass swept by an LFO (T115's win-sting, generalised)
    wub:   { engine:"sub",    wave:"sawtooth", gain:0.40, bus:"music",
             amp:{ a:0.005, d:0.05, s:0.85, r:0.1 }, filter:{ type:"lowpass", cut:600, q:12 },
             lfo:{ rate:7, depth:700 } }
  };
  const DRUM_PIECES = ["kick", "snare", "hat", "clap"];

  // ---- the voice renderer (impure: builds nodes; pure-structured) ------------
  // Render one patch voice at (freq, t0) for `dur` seconds into `dest`. Returns the
  // release-end time. The graph: osc(s) → [filter(+env,+LFO)] → amp(ADSR) → [pan] → dest.
  function renderVoice(ctx, dest, patch, freq, t0, dur){
    const amp = ctx.createGain();
    // optional stereo placement (width arrives properly in the Space increment)
    if(patch.pan != null && ctx.createStereoPanner){
      const p = ctx.createStereoPanner(); p.pan.value = patch.pan;
      amp.connect(p); p.connect(dest);
    } else {
      amp.connect(dest);
    }

    // optional filter, with its own envelope (the timbre opens then closes)
    let sink = amp, filter = null;
    if(patch.filter){
      filter = ctx.createBiquadFilter();
      filter.type = patch.filter.type || "lowpass";
      if(filter.Q) filter.Q.value = patch.filter.q || 1;
      const cut = patch.filter.cut || 1200;
      filter.frequency.value = cut;
      if(patch.filter.env){
        const fa = (patch.amp && patch.amp.a) || 0.01, fd = (patch.amp && patch.amp.d) || 0.1;
        const peakCut = cut * (1 + patch.filter.env);
        if(filter.frequency.cancelScheduledValues) filter.frequency.cancelScheduledValues(t0);
        filter.frequency.setValueAtTime(cut, t0);
        filter.frequency.linearRampToValueAtTime(peakCut, t0 + fa);
        filter.frequency.linearRampToValueAtTime(cut, t0 + fa + fd);
      }
      filter.connect(amp); sink = filter;
    }

    // oscillator topology per engine type
    const oscs = [];
    switch(patch.engine){
      case "unison": {
        const n = patch.voices || 3;
        for(let i = 0; i < n; i++){
          const o = ctx.createOscillator(); o.type = patch.wave || "sawtooth"; o.frequency.value = freq;
          if(o.detune) o.detune.value = (i - (n - 1) / 2) * (patch.detune || 10);
          o.connect(sink); oscs.push(o);
        }
        break;
      }
      case "fm": {
        const car = ctx.createOscillator(); car.type = patch.wave || "sine"; car.frequency.value = freq;
        const mod = ctx.createOscillator(); mod.type = "sine"; mod.frequency.value = freq * (patch.ratio || 2);
        const mg = ctx.createGain(); mg.gain.value = patch.index || 200;
        mod.connect(mg); mg.connect(car.frequency);     // FM: modulator → carrier.frequency
        car.connect(sink); oscs.push(car, mod);
        break;
      }
      case "sub": {
        const o = ctx.createOscillator(); o.type = patch.wave || "sawtooth"; o.frequency.value = freq;
        o.connect(sink); oscs.push(o);
        if(patch.lfo && filter){                        // the wub: LFO → filter cutoff
          const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = patch.lfo.rate || 7;
          const lg = ctx.createGain(); lg.gain.value = patch.lfo.depth || 500;
          lfo.connect(lg); lg.connect(filter.frequency); oscs.push(lfo);
        }
        break;
      }
      default: {  // "mono"
        const o = ctx.createOscillator(); o.type = patch.wave || "square"; o.frequency.value = freq;
        o.connect(sink); oscs.push(o);
      }
    }

    const env = { a: undefined, d: undefined, s: undefined, r: undefined, peak: patch.gain || 0.3 };
    if(patch.amp){ env.a = patch.amp.a; env.d = patch.amp.d; env.s = patch.amp.s; env.r = patch.amp.r; }
    const rel = adsr(amp.gain, t0, dur, env);
    for(const o of oscs){ try{ o.start(t0); o.stop(rel + 0.05); }catch(e){} }
    return rel;
  }

  // Noise-based percussion (a real kit, not 3 beeps). Each hit makes a fresh
  // BufferSource over the SHARED procedurally-filled noise buffer (no sample asset).
  function renderDrum(ctx, dest, piece, t0, noiseBuf){
    const amp = ctx.createGain(); amp.connect(dest);
    const noise = function(){ const s = ctx.createBufferSource(); s.buffer = noiseBuf; return s; };
    switch(piece){
      case "snare": {
        const nz = noise(); const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800; if(bp.Q) bp.Q.value = 0.8;
        nz.connect(bp); bp.connect(amp);
        const body = ctx.createOscillator(); body.type = "triangle"; body.frequency.value = 180; body.connect(amp);
        adsr(amp.gain, t0, 0.15, { a:0.001, d:0.15, s:0, r:0.02, peak:0.5 });
        try{ nz.start(t0); nz.stop(t0 + 0.2); body.start(t0); body.stop(t0 + 0.2); }catch(e){}
        break;
      }
      case "hat": {
        const nz = noise(); const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000;
        nz.connect(hp); hp.connect(amp);
        adsr(amp.gain, t0, 0.03, { a:0.001, d:0.03, s:0, r:0.01, peak:0.3 });
        try{ nz.start(t0); nz.stop(t0 + 0.08); }catch(e){}
        break;
      }
      case "clap": {
        for(let i = 0; i < 3; i++){
          const nz = noise(); const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1500;
          const g = ctx.createGain(); nz.connect(bp); bp.connect(g); g.connect(amp);
          const tt = t0 + i * 0.012;
          adsr(g.gain, tt, 0.04, { a:0.001, d:0.04, s:0, r:0.01, peak:0.3 });
          try{ nz.start(tt); nz.stop(tt + 0.1); }catch(e){}
        }
        break;
      }
      default: {  // "kick" — sine with a pitch drop (thump, not beep)
        const o = ctx.createOscillator(); o.type = "sine";
        o.frequency.setValueAtTime(120, t0);
        o.frequency.exponentialRampToValueAtTime(45, t0 + 0.04);
        o.connect(amp);
        adsr(amp.gain, t0, 0.12, { a:0.001, d:0.12, s:0, r:0.02, peak:0.9 });
        try{ o.start(t0); o.stop(t0 + 0.25); }catch(e){}
      }
    }
    return t0 + 0.25;
  }

  // A node-type signature for a patch (headless distinctness proof — pure).
  function patchSignature(patch){
    const parts = [patch.engine];
    if(patch.filter) parts.push("filt:" + (patch.filter.type || "lowpass") + ":" + (patch.filter.cut || 0) + ":" + (patch.filter.env || 0) + ":" + (patch.filter.q || 0));
    if(patch.lfo) parts.push("lfo:" + (patch.lfo.rate || 0) + ":" + (patch.lfo.depth || 0));
    if(patch.engine === "fm") parts.push("fm:" + (patch.ratio || 0) + ":" + (patch.index || 0));
    if(patch.engine === "unison") parts.push("uni:" + (patch.voices || 0) + ":" + (patch.detune || 0));
    parts.push("amp:" + [patch.amp && patch.amp.a, patch.amp && patch.amp.d, patch.amp && patch.amp.s, patch.amp && patch.amp.r].join(","));
    return parts.join("|");
  }

  // ---- harmony (T119 §3, increment 3) — give the music somewhere to go -------
  // Modes share notes but recolour the mood (lydian bright … phrygian dark). A
  // context picks a key + mode + a chord PROGRESSION; the bass follows the chord
  // root, the pad voices the triad with VOICE-LEADING (nearest-tone motion), so
  // consonance + motion are automatic instead of random notes over a drone.
  const MODES = {
    ionian:     [0,2,4,5,7,9,11], major: [0,2,4,5,7,9,11],
    dorian:     [0,2,3,5,7,9,10],
    phrygian:   [0,1,3,5,7,8,10],
    lydian:     [0,2,4,6,7,9,11],
    mixolydian: [0,2,4,5,7,9,10],
    aeolian:    [0,2,3,5,7,8,10], minor: [0,2,3,5,7,8,10],
    pentatonic: [0,2,4,7,9], pentminor: [0,3,5,7,10]
  };
  // modes grouped by mood, for context selection (calm solve vs dark Arena).
  const MODE_MOOD = { bright: ["lydian","ionian","mixolydian"], calm: ["dorian","pentatonic","ionian"], dark: ["aeolian","phrygian"] };
  const TRIAD = [0, 2, 4];   // diatonic thirds, in scale steps

  // Scale degree → MIDI (octave-aware; degrees beyond the scale wrap up octaves).
  function degToMidi(root, modeName, degree, oct){
    const sc = MODES[modeName] || MODES.major, len = sc.length;
    const o = Math.floor(degree / len), idx = ((degree % len) + len) % len;
    return (root | 0) + ((oct || 0) + o) * 12 + sc[idx];
  }
  // The diatonic triad rooted on scale-degree `deg` (3 MIDI notes).
  function chordMidi(root, modeName, deg, oct){ return TRIAD.map(t => degToMidi(root, modeName, deg + t, oct)); }
  // bass-follows-root: the chord's root, low.
  function bassMidi(root, modeName, deg, oct){ return degToMidi(root, modeName, deg, oct == null ? -2 : oct); }

  // Voice-leading: move each previous voice to the NEAREST tone of the new chord
  // (≤6 semitones), minimising motion — the difference between flowing and blocky.
  function voiceLead(prev, chord){
    const pcs = chord.map(m => ((m % 12) + 12) % 12);
    return prev.map(function(m){
      let best = m, bestD = 99;
      for(const pc of pcs){
        let cand = m + ((((pc - (m % 12)) % 12) + 12) % 12);   // nearest pc at/above m
        if(cand - m > 6) cand -= 12;                            // …or just below, if nearer
        const d = Math.abs(cand - m);
        if(d < bestD){ bestD = d; best = cand; }
      }
      return best;
    });
  }

  // Realise a progression into per-chord { degree, chord, voiced (pad), bass }.
  // Deterministic (no RNG): same spec → same harmony. The scheduler (increment 4)
  // consumes this; harmonic rhythm (chords per bar) is the caller's tempo concern.
  function harmonyFor(spec){
    spec = spec || {};
    const root = spec.root == null ? 60 : spec.root, mode = spec.mode || "ionian";
    const prog = (spec.progression && spec.progression.length) ? spec.progression : [0, 5, 3, 4];   // I–vi–IV–V
    const padOct = spec.padOct == null ? 0 : spec.padOct, bassOct = spec.bassOct == null ? -2 : spec.bassOct;
    let voiced = null; const out = [];
    for(const deg of prog){
      const chord = chordMidi(root, mode, deg, padOct);
      voiced = voiced ? voiceLead(voiced, chord) : chord.slice();
      out.push({ degree: deg, chord: chord, voiced: voiced.slice(), bass: bassMidi(root, mode, deg, bassOct) });
    }
    return out;
  }

  // ---- rhythm & variation (T119 §4, increment 4) — structured, evolving ------
  // Replace random sprinkles with structure-plus-controlled-surprise: Euclidean
  // grooves, a Markov melodic walk, motif transforms, and a density that evolves
  // over a phrase — all seeded so a performance is deterministic yet never an
  // obvious loop (each phrase re-seeds from phraseSeed).

  // Euclid(k,n): spread k onsets as evenly as possible over n steps (Toussaint) —
  // the generator of most world-music grooves. Returns an n-length 0/1 array.
  function euclid(k, n){
    n = Math.max(1, n | 0); k = Math.max(0, Math.min(n, k | 0));
    const out = new Array(n); let bucket = 0;
    for(let i = 0; i < n; i++){ bucket += k; if(bucket >= n){ bucket -= n; out[i] = 1; } else out[i] = 0; }
    return out;
  }
  function rotate(a, by){ const n = a.length; if(!n) return a.slice(); by = ((by % n) + n) % n; return a.slice(by).concat(a.slice(0, by)); }

  // A (2nd-order) Markov step over a transition table keyed by "a,b" (falls back to
  // "b", then "*"); each row is [[next, weight], …]. Deterministic given `rnd`.
  function markovNext(table, a, b, rnd){
    const row = table[a + "," + b] || table["" + b] || table["*"];
    if(!row || !row.length) return a;
    let total = 0; for(const it of row) total += it[1];
    let r = rnd() * total, acc = 0;
    for(const it of row){ acc += it[1]; if(r < acc) return it[0]; }
    return row[row.length - 1][0];
  }

  // Motif development — transforms that make variation sound *composed*.
  function transposeMotif(m, n){ return m.map(d => d + n); }
  function invertMotif(m, axis){ const ax = axis == null ? (m.length ? m[0] : 0) : axis; return m.map(d => 2 * ax - d); }
  function retrograde(m){ return m.slice().reverse(); }

  // A stable per-phrase seed so each phrase differs but a run is reproducible.
  function phraseSeed(seed, phrase){
    let h = ((seed >>> 0) ^ Math.imul((phrase | 0) + 1, 2654435761)) >>> 0;
    h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
    return (h >>> 0) || 1;
  }
  // Density rises across a phrase (sparse → fuller) so the music breathes/arrives.
  function densityAt(spec, step){ const phraseLen = 16 * spec.harmony.length; const pos = (step % phraseLen) / phraseLen; return spec.density * (0.55 + 0.6 * pos); }

  // Snap a note to the nearest tone of a chord (≤ a tritone) — anchors the lead.
  function nearestChordTone(midi, chord){
    const pcs = chord.map(m => ((m % 12) + 12) % 12); let best = midi, bestD = 99;
    for(const pc of pcs){ let cand = midi + ((((pc - (midi % 12)) % 12) + 12) % 12); if(cand - midi > 6) cand -= 12; const dd = Math.abs(cand - midi); if(dd < bestD){ bestD = dd; best = cand; } }
    return best;
  }
  // A weighted stepwise interval (a Markov walk): mostly steps, rare leaps.
  function leadStep(rnd){ const r = rnd(); return r < 0.34 ? -1 : r < 0.68 ? 1 : r < 0.80 ? -2 : r < 0.92 ? 2 : r < 0.97 ? 0 : (r < 0.985 ? -3 : 3); }

  // Normalise a high-level music spec into the scheduler's runtime form.
  function normalizeMusic(spec){
    spec = spec || {};
    const root = spec.root == null ? 60 : spec.root, mode = spec.mode || "ionian", tempo = spec.tempo || 96;
    const harmony = spec.harmony || harmonyFor({ root: root, mode: mode, progression: spec.progression, padOct: spec.padOct, bassOct: spec.bassOct });
    return {
      tempo: tempo, seed: (spec.seed | 0) || 1, harmony: harmony, root: root, mode: mode,
      barDur: (60 / tempo) * 4,
      density: spec.density == null ? 0.4 : spec.density,
      leadOct: spec.leadOct == null ? 1 : spec.leadOct,
      patches: Object.assign({ bass: "bass", pad: "pad", lead: "lead" }, spec.patches),
      kick:  spec.kick  || euclid(spec.kickK == null ? 4 : spec.kickK, 16),
      hat:   spec.hat   || euclid(spec.hatK  == null ? 8 : spec.hatK,  16),
      snare: spec.snare || rotate(euclid(2, 16), 4),
      leadEuclid: spec.leadEuclid || euclid(spec.leadK == null ? 7 : spec.leadK, 16)
    };
  }

  // Pure: the events to schedule on one 16th-note step (deterministic given rnd +
  // the small melodic state `st`). pad on the downbeat, bass on 1 & 3, a Euclid-
  // gated Markov-walk lead (chord-anchored on strong beats), and the Euclid kit.
  function stepEvents(spec, step, rnd, intensity, st){
    st = st || { deg: 0 };
    const SPB = 16, s = step % SPB, bar = Math.floor(step / SPB);
    const chord = spec.harmony[bar % spec.harmony.length];
    const dens = Math.min(1, densityAt(spec, step) * (1 + (intensity || 0) * 0.8));
    const ev = [];
    if(s === 0) for(const m of chord.voiced) ev.push({ role:"pad", patch: spec.patches.pad, midi: m, dur: spec.barDur });
    if(s === 0 || s === 8) ev.push({ role:"bass", patch: spec.patches.bass, midi: chord.bass, dur: 0.9 });
    if(spec.leadEuclid[s] && rnd() < dens){
      st.deg += leadStep(rnd);
      if(st.deg > 6) st.deg = 6; if(st.deg < -6) st.deg = -6;
      let midi = degToMidi(spec.root, spec.mode, st.deg, spec.leadOct);
      if(s % 4 === 0) midi = nearestChordTone(midi, chord.chord);
      ev.push({ role:"lead", patch: spec.patches.lead, midi: midi, dur: 0.16 });
    }
    if(spec.kick[s]) ev.push({ role:"drum", piece:"kick" });
    if(spec.hat[s]) ev.push({ role:"drum", piece:"hat" });
    if(spec.snare && spec.snare[s]) ev.push({ role:"drum", piece:"snare" });
    return ev;
  }

  // The single lookahead scheduler (Chris Wilson "two clocks"): one setInterval,
  // schedules precise times against ctx.currentTime, drops missed steps on a stall
  // (anti-burst), idles on stop. Drives ALL voices — never a timer per part.
  const TICK_MS = 25, LOOKAHEAD = 0.1, MAX_STEPS_PER_TICK = 8;
  const M = { timer:null, spec:null, want:null, step:0, next:0, rnd:null, phrase:0, st:{ deg:0 }, intensity:0 };
  function reseedMusic(){ M.rnd = mulberry32(phraseSeed(M.spec.seed | 0, M.phrase)); }
  function playEvent(ev, when){
    if(ev.role === "drum"){ if(!E.muted) renderDrum(E.ctx, E.drum, ev.piece, when, E.noiseBuf); }
    else play(ev.patch, when, { midi: ev.midi, dur: ev.dur, bus: "music" });
  }
  function musicTick(){
    if(!E.ctx) return;
    const now = E.ctx.currentTime;
    if(M.next < now) M.next = now + 0.02;                 // stalled → resync, drop the backlog
    let sched = 0;
    while(M.next < now + LOOKAHEAD && sched < MAX_STEPS_PER_TICK){
      const phraseLen = 16 * M.spec.harmony.length;
      if(M.step % phraseLen === 0){ if(M.want !== M.spec) M.spec = M.want; M.phrase = Math.floor(M.step / phraseLen); reseedMusic(); }
      const evs = stepEvents(M.spec, M.step, M.rnd, M.intensity, M.st);
      for(const ev of evs) playEvent(ev, M.next);
      M.next += (60 / M.spec.tempo) / 4;                  // one 16th note
      M.step++; sched++;
    }
  }
  function startScheduler(){
    if(M.timer || !E.ready || E.muted || !M.want || typeof setInterval === "undefined") return;
    if(!M.spec){ M.spec = M.want; M.step = 0; M.phrase = 0; M.st = { deg: 0 }; reseedMusic(); }
    M.next = E.ctx.currentTime + 0.06;
    M.timer = setInterval(musicTick, TICK_MS);
  }
  function setMusic(spec){
    const ns = normalizeMusic(spec); M.want = ns;
    if(!M.spec){ M.spec = ns; M.step = 0; M.phrase = 0; M.st = { deg: 0 }; reseedMusic(); }
    startScheduler(); return api;
  }
  function start(){ startScheduler(); return api; }
  function stop(){ if(M.timer){ clearInterval(M.timer); M.timer = null; } return api; }
  function musicPlaying(){ return !!M.timer; }
  function intensity(x){ M.intensity = Math.max(0, Math.min(1, x || 0)); return api; }

  // ---- contexts (T119 §5, increment 5) — the calm/energetic rule, authored ----
  // Each context bundles the levers (tempo · mode · harmonic rhythm · density ·
  // patches · kit · reverb) so solve is CALM and Arena DRIVES *by construction*.
  // The calm-vs-energetic invariants are enforced as tests.
  function hashStr(s){ let h = 2166136261 >>> 0; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const CONTEXTS = {
    // CALM: slow, sparse, consonant, soft, wet — Dorian/pentatonic, soft pad + pluck
    solve: { tempo: 80,  mode: "dorian",   progression: [0, 5, 3, 4], density: 0.26, reverb: 0.36,
             kickK: 2, hatK: 4, leadK: 5, leadOct: 1, patches: { pad: "pad", bass: "bass", lead: "pluck" } },
    menu:  { tempo: 88,  mode: "ionian",   progression: [0, 3, 4, 0], density: 0.30, reverb: 0.30,
             kickK: 3, hatK: 6, leadK: 6, leadOct: 1, patches: { pad: "pad", bass: "bass", lead: "bell" } },
    // BRIGHT: floating Lydian for the event/wonder context
    event: { tempo: 100, mode: "lydian",   progression: [0, 4, 5, 3], density: 0.42, reverb: 0.30,
             kickK: 4, hatK: 8, leadK: 7, leadOct: 1, patches: { pad: "pad", bass: "bass", lead: "bell" } },
    // ENERGETIC: fast, dense, dark Aeolian, driving Euclid kit + the WUB bass, dry
    arena: { tempo: 120, mode: "aeolian",  progression: [0, 5, 6, 4], density: 0.60, reverb: 0.16,
             kickK: 4, hatK: 12, leadK: 9, leadOct: 1, patches: { pad: "pad", bass: "wub", lead: "lead" } }
  };
  function setContext(name, opts){
    const c = CONTEXTS[name]; if(!c) return api;
    setReverb(c.reverb);
    setMusic(Object.assign({ seed: hashStr(name) }, c));
    if(opts && opts.now) swapNow();
    return api;
  }
  // Immediate context swap (T132): adopt the pending spec (`M.want`) RIGHT NOW —
  // re-aligned to a phrase start (clean downbeat entry) — so the new context's
  // harmony/patches/reverb take effect on the NEXT scheduled step (≤1 step), not
  // at the next phrase boundary (≤1 phrase ≈ 8–11 s, which read as "never changes").
  // No click/dropout: already-scheduled notes in the lookahead finish; only the
  // *generator* switches now. The default (phrase-boundary) swap is left untouched.
  function swapNow(){
    if(!M.want) return api;
    M.spec = M.want;
    M.step = 0; M.phrase = 0;        // re-align to a phrase start → enters on a downbeat
    M.st = { deg: 0 };
    reseedMusic();
    return api;
  }
  // A brief one-shot STING (not the loop) — the victory wub-sting; ducks the music.
  function sting(name){
    if(!E.ready || E.muted || !E.ctx) return api;
    const t = E.ctx.currentTime;
    duck(0.6, 0.6);                                   // dip the bed under the cue
    if(name === "victory"){
      play("wub", t, { midi: 36, dur: 0.9, bus: "sfx" });                       // a low wub swell
      [0, 4, 7, 12].forEach(function(iv, i){ play("bell", t + i * 0.08, { midi: 72 + iv, dur: 0.4, bus: "sfx" }); });  // rising bright arp
    } else {
      play("bell", t, { midi: 72, dur: 0.3, bus: "sfx" });
    }
    return api;
  }

  // ---- space: a Feedback-Delay-Network reverb (T119 §6, increment 2) ---------
  // 4 delay lines, each damped by a lowpass, recombined through a unitary
  // (Hadamard) feedback matrix scaled by `decay<1` so it is dense but stable —
  // the algorithmic-reverb recipe (cheap, real-time-tweakable, no sample IR). The
  // four taps are panned L/R for a wide stereo tail (our dry mono is the biggest
  // "cheap" tell). Built ONCE at mount; buses send into it.
  const FDN_TIMES = [0.0297, 0.0371, 0.0411, 0.0437];   // mutually-prime-ish (s)
  const FDN_HADAMARD = [[1,1,1,1],[1,-1,1,-1],[1,1,-1,-1],[1,-1,-1,1]];
  function makeReverb(ctx, opts){
    opts = opts || {};
    const decay = opts.decay == null ? 0.78 : opts.decay;     // feedback gain (<1 → stable)
    const damp = opts.damp == null ? 3600 : opts.damp;        // tail darkening (Hz)
    const input = ctx.createGain(), output = ctx.createGain();
    const pre = ctx.createDelay(0.2); pre.delayTime.value = opts.preDelay == null ? 0.012 : opts.preDelay;
    input.connect(pre);
    const delays = [], damps = [];
    for(let i = 0; i < 4; i++){
      const dl = ctx.createDelay(0.5); dl.delayTime.value = FDN_TIMES[i];
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = damp;
      dl.connect(lp); delays.push(dl); damps.push(lp);
      pre.connect(dl);                                         // input feeds every line
    }
    // unitary feedback matrix: delay_j input += Σ H[j][i]·(0.5·decay)·damped_i
    for(let j = 0; j < 4; j++) for(let i = 0; i < 4; i++){
      const g = ctx.createGain(); g.gain.value = FDN_HADAMARD[j][i] * 0.5 * decay;
      damps[i].connect(g); g.connect(delays[j]);
    }
    // wide stereo tail: alternate taps hard-ish L/R into the output
    for(let i = 0; i < 4; i++){
      if(ctx.createStereoPanner){ const p = ctx.createStereoPanner(); p.pan.value = (i % 2 === 0) ? -0.6 : 0.6; damps[i].connect(p); p.connect(output); }
      else damps[i].connect(output);
    }
    return { input: input, output: output, delays: delays, damps: damps,
             setDamp: function(f){ for(const d of damps) try{ d.frequency.value = f; }catch(e){} } };
  }

  // ---- engine state + graph --------------------------------------------------
  const E = { ctx:null, master:null, limiter:null, music:null, drum:null, sfx:null,
              reverb:null, musicSend:null, drumSend:null, noiseBuf:null, muted:false, ready:false };

  function makeNoiseBuffer(ctx){
    const sr = ctx.sampleRate || 44100, len = Math.max(1, Math.floor(sr));   // 1 s, reused
    if(!ctx.createBuffer) return null;
    const buf = ctx.createBuffer(1, len, sr), data = buf.getChannelData(0), rng = mulberry32(NOISE_SEED);
    for(let i = 0; i < len; i++) data[i] = rng() * 2 - 1;
    return buf;
  }

  // master → limiter → destination, with music / drum / sfx submix buses → master.
  function buildGraph(ctx){
    E.master = ctx.createGain(); E.master.gain.value = E.muted ? 0 : MASTER_VOL;
    if(ctx.createDynamicsCompressor){
      E.limiter = ctx.createDynamicsCompressor();
      try{ E.limiter.threshold.value = LIMIT_DB; E.limiter.knee.value = 0; E.limiter.ratio.value = 20; E.limiter.attack.value = 0.003; E.limiter.release.value = 0.25; }catch(e){}
      E.master.connect(E.limiter); E.limiter.connect(ctx.destination);
    } else {
      E.master.connect(ctx.destination);
    }
    E.music = ctx.createGain(); E.music.gain.value = 1; E.music.connect(E.master);
    E.drum  = ctx.createGain(); E.drum.gain.value = 1;  E.drum.connect(E.master);
    E.sfx   = ctx.createGain(); E.sfx.gain.value = 1;   E.sfx.connect(E.master);
    // space: one shared reverb; music + drums send into it (dry stays on master)
    E.reverb = makeReverb(ctx);
    E.reverb.output.connect(E.master);
    E.musicSend = ctx.createGain(); E.musicSend.gain.value = 0.22; E.music.connect(E.musicSend); E.musicSend.connect(E.reverb.input);
    E.drumSend  = ctx.createGain(); E.drumSend.gain.value = 0.10;  E.drum.connect(E.drumSend);   E.drumSend.connect(E.reverb.input);
    E.noiseBuf = makeNoiseBuffer(ctx);
  }
  // Set the reverb send (wetness); drums get half the music send.
  function setReverb(wet){ wet = wet == null ? 0.22 : Math.max(0, wet); if(E.musicSend) E.musicSend.gain.value = wet; if(E.drumSend) E.drumSend.gain.value = wet * 0.45; }
  // Duck the music under a cue (sidechain glue): dip the music bus, then recover.
  function duck(amount, dur){
    if(!E.ready || !E.music || !E.ctx) return;
    const t = E.ctx.currentTime, a = amount == null ? 0.5 : Math.max(0, Math.min(1, amount)), d = dur == null ? 0.25 : dur, g = E.music.gain;
    try{
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value == null ? 1 : g.value, t);
      g.setTargetAtTime(Math.max(1e-4, 1 - a), t, 0.02);     // fast dip
      g.setTargetAtTime(1, t + d, 0.12);                      // smooth recover
    }catch(e){}
  }

  function busFor(name){ return name === "music" ? E.music : name === "drum" ? E.drum : E.sfx; }

  function mount(opts){
    opts = opts || {};
    if(!E.ready){
      let ctx = opts.ctx || null;
      if(!ctx){
        try{ const AC = (typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext)) || (typeof AudioContext !== "undefined" ? AudioContext : null); if(AC) ctx = new AC(); }catch(e){ ctx = null; }
      }
      if(!ctx) return api;
      E.ctx = ctx;
      try{ buildGraph(ctx); E.ready = true; }catch(e){ E.ctx = null; E.ready = false; return api; }
    }
    if(E.ctx && E.ctx.state === "suspended"){ try{ E.ctx.resume(); }catch(e){} }
    return api;
  }

  // One-shot voice. `patch` = a name in PATCHES or a patch object. opts: { midi|freq,
  // dur, bus }. Returns the scheduled release-end time (0 if not playing).
  function play(patch, when, opts){
    if(!E.ready || E.muted || !E.ctx) return 0;
    opts = opts || {};
    const ctx = E.ctx, t0 = when != null ? when : ctx.currentTime;
    const p = (typeof patch === "string") ? PATCHES[patch] : patch;
    if(!p) return 0;
    const bus = busFor(opts.bus || p.bus || "sfx");
    const freq = opts.freq != null ? opts.freq : hz(opts.midi != null ? opts.midi : 60);
    const dur = opts.dur != null ? opts.dur : 0.3;
    return renderVoice(ctx, bus, p, freq, t0, dur);
  }

  function drum(piece, when){
    if(!E.ready || E.muted || !E.ctx) return 0;
    return renderDrum(E.ctx, E.drum, piece, when != null ? when : E.ctx.currentTime, E.noiseBuf);
  }

  // Mute zeroes the master AND idles the music scheduler (so a muted app spawns
  // no silent voices — CPU/battery on the Poco-X3 budget); unmute resumes the
  // current context. Mirrors sound.js's setMuted contract (the [A] wire calls both).
  function setMuted(m){
    E.muted = !!m;
    if(E.master){ try{ E.master.gain.value = E.muted ? 0 : MASTER_VOL; }catch(e){} }
    if(E.muted) stop(); else startScheduler();   // startScheduler is a no-op if no music was set
  }
  function isMuted(){ return E.muted; }
  function capabilities(){
    let webaudio = false;
    try{ webaudio = (typeof window !== "undefined" && !!(window.AudioContext || window.webkitAudioContext)) || (typeof AudioContext !== "undefined"); }catch(e){}
    return { webaudio: webaudio, ready: E.ready };
  }
  function dispose(){
    if(E.ctx && E.ctx.close){ try{ E.ctx.close(); }catch(e){} }
    E.ctx = E.master = E.limiter = E.music = E.drum = E.sfx = E.noiseBuf = null; E.ready = false;
  }

  const api = {
    // runtime API
    mount: mount, play: play, drum: drum, setReverb: setReverb, duck: duck,
    setMusic: setMusic, setContext: setContext, swapNow: swapNow, sting: sting, start: start, stop: stop, musicPlaying: musicPlaying, intensity: intensity,
    musicState: function(){ return { spec: M.spec, want: M.want, step: M.step, phrase: M.phrase, playing: !!M.timer }; },   // introspection (tests / the [A] wire)
    setMuted: setMuted, isMuted: isMuted, capabilities: capabilities, dispose: dispose,
    output: function(){ return E.master; },     // the [A] wire can re-route this into Sound's master
    // budget/data
    MASTER_VOL: MASTER_VOL, LIMIT_DB: LIMIT_DB, PATCHES: PATCHES, DRUM_PIECES: DRUM_PIECES,
    // pure helpers (headless-tested)
    hz: hz, adsr: adsr, mulberry32: mulberry32, makeReverb: makeReverb,
    renderVoice: renderVoice, renderDrum: renderDrum, patchSignature: patchSignature,
    // harmony (increment 3)
    MODES: MODES, MODE_MOOD: MODE_MOOD, degToMidi: degToMidi, chordMidi: chordMidi,
    bassMidi: bassMidi, voiceLead: voiceLead, harmonyFor: harmonyFor,
    // rhythm & variation (increment 4)
    euclid: euclid, rotate: rotate, markovNext: markovNext, phraseSeed: phraseSeed,
    transposeMotif: transposeMotif, invertMotif: invertMotif, retrograde: retrograde,
    densityAt: densityAt, stepEvents: stepEvents, normalizeMusic: normalizeMusic,
    // contexts (increment 5)
    CONTEXTS: CONTEXTS, hashStr: hashStr,
    // introspection (tests / the [A] wire)
    buses: function(){ return { master: E.master, limiter: E.limiter, music: E.music, drum: E.drum, sfx: E.sfx, reverb: E.reverb, musicSend: E.musicSend, drumSend: E.drumSend }; },
    noiseBuffer: function(){ return E.noiseBuf; }
  };
  window.Synth = api;
})();
