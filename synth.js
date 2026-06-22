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
    // T155 — distinct PAD-class BEDS (the sustained harmonic bed is the most
    // continuously-audible voice; a different bed timbre per style is what kills the
    // "every style shares the same synth string"). Each is a genuinely different
    // SPECTRUM (waveform + filter type/feel), not a cutoff tweak — proven spectrally
    // distinct in test/browser/audio.test.js (OfflineAudioContext centroid spread).
    // airy/glassy choir: triangle (few, weak harmonics) + soft lowpass, very slow swell
    padglass: { engine:"unison", wave:"triangle", voices:3, detune:7, gain:0.20, bus:"music", pan:0,
             amp:{ a:0.9, d:0.6, s:0.85, r:1.8 }, filter:{ type:"lowpass", cut:2000, env:0.5, q:1 } },
    // electric-piano / Rhodes bed: FM (low index) sustained + mellow lowpass — bell-ish swell to a sustain
    padep: { engine:"fm", ratio:1, index:110, gain:0.20, bus:"music", pan:0,
             amp:{ a:0.05, d:0.5, s:0.6, r:0.5 }, filter:{ type:"lowpass", cut:1500, env:0.8, q:1 } },
    // retro PWM-ish square bed: bright, hollow (odd harmonics), snappier attack
    padpwm: { engine:"unison", wave:"square", voices:3, detune:9, gain:0.16, bus:"music", pan:0,
             amp:{ a:0.15, d:0.3, s:0.7, r:0.5 }, filter:{ type:"lowpass", cut:2800, env:1.0, q:2 } },
    // hollow organ stab bed: square through a BANDPASS (formant-ish, peaked) — fast/stabby
    padorgan: { engine:"unison", wave:"square", voices:2, detune:5, gain:0.18, bus:"music", pan:0,
             amp:{ a:0.01, d:0.1, s:0.8, r:0.25 }, filter:{ type:"bandpass", cut:760, env:0.15, q:7 } },
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
             lfo:{ rate:7, depth:700 } },
    // chip — a crisp fast square pluck for chiptune/8-bit arps (T139 addition)
    chip:  { engine:"mono",   wave:"square", gain:0.24, bus:"music",
             amp:{ a:0.001, d:0.06, s:0.0, r:0.02 }, filter:{ type:"lowpass", cut:4200, env:2, q:2 } }
  };
  const DRUM_PIECES = ["kick", "snare", "hat", "clap"];

  // ---- the voice renderer (impure: builds nodes; pure-structured) ------------
  // Render one patch voice at (freq, t0) for `dur` seconds into `dest`. Returns the
  // release-end time. The graph: osc(s) → [filter(+env,+LFO)] → amp(ADSR) → [pan] → dest.
  function renderVoice(ctx, dest, patch, freq, t0, dur, onVoice, lfoRate){
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
          const lfo = ctx.createOscillator(); lfo.type = "sine";
          lfo.frequency.value = (lfoRate != null && lfoRate > 0) ? lfoRate : (patch.lfo.rate || 7);   // tempo-synced wobble when provided
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
    if(onVoice) onVoice(amp.gain, rel);   // hand the amp param back so an immediate swap can release it
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
      wobble: spec.wobble || 0,          // wub LFO cycles-per-beat (0 = the patch default)
      swing: spec.swing || 0,            // delay the off-16ths by this fraction (groove)
      reverbDecay: spec.reverbDecay,     // optional per-style FDN tail length
      patches: Object.assign({ bass: "bass", pad: "pad", lead: "lead" }, spec.patches),
      kick:  spec.kick  || euclid(spec.kickK == null ? 4 : spec.kickK, 16),
      hat:   spec.hat   || euclid(spec.hatK  == null ? 8 : spec.hatK,  16),
      snare: spec.snare || rotate(euclid(spec.snareK == null ? 2 : spec.snareK, 16), 4),
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
  const M = { timer:null, spec:null, want:null, step:0, next:0, rnd:null, phrase:0, st:{ deg:0 }, intensity:0, active:[] };
  function reseedMusic(){ M.rnd = mulberry32(phraseSeed(M.spec.seed | 0, M.phrase)); }
  // Render a scheduled music voice on the music bus, registering its amp param so an
  // immediate swap can release it (drums are short → not tracked).
  function playEvent(ev, when){
    if(E.muted) return;
    if(ev.role === "drum"){ renderDrum(E.ctx, E.drum, ev.piece, when, E.noiseBuf); return; }
    const patch = (typeof ev.patch === "string") ? PATCHES[ev.patch] : ev.patch;
    if(!patch) return;
    // tempo-synced wub wobble: lock the LFO to `wobble` cycles per beat (T139)
    let lfoRate;
    if(patch.engine === "sub" && M.spec && M.spec.wobble) lfoRate = (M.spec.tempo / 60) * M.spec.wobble;
    renderVoice(E.ctx, E.music, patch, hz(ev.midi), when, ev.dur, function(g, rel){ if(M.active.length < 128) M.active.push({ g: g, until: rel }); }, lfoRate);
  }
  // Immediate-swap cleanup (T134): quickly fade the currently-sounding music voices
  // and tame the multi-second FDN-reverb tail so a switch CUTS IN CLEANLY instead of
  // the old pad/tail ringing over the new context. Only the immediate path calls this;
  // the default phrase-boundary swap keeps its natural musical ring.
  function releaseMusic(){
    if(!E.ctx) return;
    const now = E.ctx.currentTime;
    for(const v of M.active){ try{ if(v.g.cancelAndHoldAtTime) v.g.cancelAndHoldAtTime(now); else v.g.cancelScheduledValues(now); v.g.setTargetAtTime(0.0001, now, 0.025); }catch(e){} }   // ~75ms release
    M.active = [];
    if(E.music){ const g = E.music.gain; try{ g.cancelScheduledValues(now); g.setValueAtTime(1, now); g.setTargetAtTime(0.0001, now, 0.015); g.setTargetAtTime(1, now + 0.06, 0.03); }catch(e){} }   // brief bed dip→in
    if(E.reverb && E.reverb.output){ const r = E.reverb.output.gain; try{ r.cancelScheduledValues(now); r.setValueAtTime(1, now); r.setTargetAtTime(0.0001, now, 0.02); r.setTargetAtTime(1, now + 0.13, 0.06); }catch(e){} }   // kill the carry-over tail
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
      const sixteenth = (60 / M.spec.tempo) / 4;
      // swing: delay the off-16ths (odd steps) by a fraction of a 16th — the grid
      // (M.next) stays even, only the scheduled time shifts (a real groove).
      const when = (M.spec.swing && (M.step % 2 === 1)) ? M.next + sixteenth * M.spec.swing : M.next;
      for(const ev of evs) playEvent(ev, when);
      M.next += sixteenth;
      M.step++; sched++;
    }
    if(M.active.length) M.active = M.active.filter(v => v.until > now - 0.3);   // prune finished voices
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
  // The 12-style palette (T139, from docs/research-music-styles.md §2, owner-approved).
  // `menu` + `arena` kept exactly (owner likes them); 10 new spread across EVERY audible
  // lever — mode · root/register · progression · tempo · density · drum kit/Euclid · patch
  // selection · reverb (+wobble/swing/reverbDecay) — so they're obviously different songs.
  // `label` is the launcher name (handed to [A] for T140). `victory:true` = its drop is
  // the win sting (fired via sting("victory")).
  const CONTEXTS = {
    // — kept —
    menu:      { label: "Neon Lobby",        tempo: 96,  mode: "ionian",     root: 60, progression: [0, 3, 4, 0], density: 0.34, reverb: 0.26, kickK: 4, hatK: 6,  snareK: 2, leadK: 6,  leadOct: 2, patches: { pad: "padglass", bass: "bass", lead: "bell" } },
    arena:     { label: "Phrygian Onslaught", tempo: 124, mode: "phrygian",  root: 45, progression: [0, 5, 6, 4], density: 0.62, reverb: 0.16, kickK: 6, hatK: 12, snareK: 2, leadK: 9,  leadOct: 1, patches: { pad: "pad", bass: "wub",  lead: "lead" } },
    // — 10 new —
    lofi:      { label: "Lo-Fi Study",       tempo: 76,  mode: "dorian",     root: 50, progression: [0, 5, 3, 4], density: 0.24, reverb: 0.42, kickK: 1, hatK: 3,  snareK: 0, leadK: 4,  leadOct: 1, swing: 0.2,  patches: { pad: "padep", bass: "bass", lead: "pluck" } },
    ambient:   { label: "Ambient Drift",     tempo: 60,  mode: "lydian",     root: 55, progression: [0, 3, 0, 4], density: 0.14, reverb: 0.55, kickK: 0, hatK: 0, snareK: 0, leadK: 3, leadOct: 1, patches: { pad: "padglass", bass: "bass", lead: "bell" } },
    chiptune:  { label: "Chiptune Rush",     tempo: 150, mode: "pentatonic", root: 60, progression: [0, 4, 5, 3], density: 0.60, reverb: 0.04, kickK: 4, hatK: 8,  snareK: 2, leadK: 11, leadOct: 2, patches: { pad: "padpwm", bass: "bass", lead: "chip" } },
    synthwave: { label: "Synthwave Cruise",  tempo: 112, mode: "aeolian",    root: 50, progression: [0, 5, 3, 4], density: 0.42, reverb: 0.34, kickK: 4, hatK: 8,  snareK: 4, leadK: 7,  leadOct: 2, patches: { pad: "pad", bass: "bass", lead: "lead" } },
    dubstep:   { label: "Dubstep Victory",   tempo: 140, mode: "pentminor",  root: 36, progression: [0, 0, 5, 3], density: 0.40, reverb: 0.14, kickK: 4, hatK: 6,  snareK: 2, leadK: 6,  leadOct: 1, wobble: 2,  victory: true, patches: { pad: "padorgan", bass: "wub", lead: "lead" } },
    dnb:       { label: "Liquid DnB",        tempo: 174, mode: "aeolian",    root: 43, progression: [0, 5, 3, 4], density: 0.44, reverb: 0.30, kickK: 4, hatK: 10, snareK: 6, leadK: 8,  leadOct: 1, wobble: 1,  patches: { pad: "padep", bass: "wub", lead: "lead" } },
    bigroom:   { label: "Festival",          tempo: 128, mode: "lydian",     root: 57, progression: [0, 3, 4, 5], density: 0.56, reverb: 0.26, kickK: 4, hatK: 10, snareK: 4, leadK: 8,  leadOct: 2, patches: { pad: "pad", bass: "bass", lead: "lead" } },
    boss8bit:  { label: "8-Bit Boss March",  tempo: 140, mode: "phrygian",   root: 48, progression: [0, 1, 0, 5], density: 0.50, reverb: 0.10, kickK: 4, hatK: 6,  snareK: 4, leadK: 9,  leadOct: 1, patches: { pad: "padpwm", bass: "bass", lead: "chip" } },
    tropical:  { label: "Tropical Pluck",    tempo: 104, mode: "mixolydian", root: 57, progression: [0, 4, 5, 2], density: 0.40, reverb: 0.30, kickK: 3, hatK: 8,  snareK: 2, leadK: 7,  leadOct: 2, swing: 0.16, patches: { pad: "padglass", bass: "bass", lead: "bell" } },
    techno:    { label: "Hypno Techno",      tempo: 126, mode: "aeolian",    root: 45, progression: [0, 0, 5, 5], density: 0.34, reverb: 0.28, kickK: 4, hatK: 8,  snareK: 0, leadK: 5,  leadOct: 1, wobble: 0.5, patches: { pad: "padorgan", bass: "wub", lead: "lead" } }
  };
  // The 12 canonical styles (the launcher set + the distinctness gate).
  const STYLE_IDS = ["menu", "arena", "lofi", "ambient", "chiptune", "synthwave", "dubstep", "dnb", "bigroom", "boss8bit", "tropical", "techno"];
  // Back-compat ALIASES so the pre-T140 game routing keeps playing: the solve screen
  // gets the calm Lo-Fi, events get the Festival. [A]'s T140 re-routes screens to the
  // named styles and can drop these. (Not part of the distinctness set.)
  CONTEXTS.solve = CONTEXTS.lofi;
  CONTEXTS.event = CONTEXTS.bigroom;
  function setContext(name, opts){
    const c = CONTEXTS[name]; if(!c) return api;
    setReverb(c.reverb);
    if(E.reverb && E.reverb.setDecay) E.reverb.setDecay(c.reverbDecay == null ? FDN_DECAY_DEFAULT : c.reverbDecay);   // per-style tail length
    setMusic(Object.assign({ seed: hashStr(name) }, c));
    if(opts && opts.now) swapNow();
    return api;
  }
  function setReverbDecay(d){ if(E.reverb && E.reverb.setDecay) E.reverb.setDecay(d == null ? FDN_DECAY_DEFAULT : d); return api; }
  // Immediate context swap (T132): adopt the pending spec (`M.want`) RIGHT NOW —
  // re-aligned to a phrase start (clean downbeat entry) — so the new context's
  // harmony/patches/reverb take effect on the NEXT scheduled step (≤1 step), not
  // at the next phrase boundary (≤1 phrase ≈ 8–11 s, which read as "never changes").
  // No click/dropout: already-scheduled notes in the lookahead finish; only the
  // *generator* switches now. The default (phrase-boundary) swap is left untouched.
  function swapNow(){
    if(!M.want) return api;
    releaseMusic();                  // T134: cut the old voices + reverb tail so it doesn't overlap
    M.spec = M.want;
    M.step = 0; M.phrase = 0;        // re-align to a phrase start → enters on a downbeat
    M.st = { deg: 0 };
    reseedMusic();
    return api;
  }
  // A brief one-shot STING (not the loop) — the victory wub-sting; ducks the music.
  // A filtered-noise RISER (build): a bandpass swept upward + a swell, on the SFX bus.
  function noiseRiser(t, dur){
    if(!E.noiseBuf || !E.ctx.createBufferSource) return;
    const ctx = E.ctx, src = ctx.createBufferSource(); src.buffer = E.noiseBuf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; if(bp.Q) bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(7000, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    src.connect(bp); bp.connect(g); g.connect(E.sfx);
    try{ src.start(t); src.stop(t + dur + 0.15); }catch(e){}
  }
  // A cue on the UN-DUCKED sfx bus (so it cuts THROUGH, not under, the music — T128).
  // "victory"/"drop" = a real dubstep DROP: a noise riser builds, then a heavy sub-wub
  // hit (tempo-synced wobble) + a kick + a bright stab land together — an audible drop.
  function sting(name){
    if(!E.ready || E.muted || !E.ctx) return api;
    const t = E.ctx.currentTime;
    if(name === "victory" || name === "drop"){
      duck(0.8, 1.1);                                  // pull the bed well down for the drop
      noiseRiser(t, 0.42);                             // the build
      const d = t + 0.44;                              // the drop point
      renderVoice(E.ctx, E.sfx, PATCHES.wub, hz(28), d, 0.8, null, 12);   // heavy sub-wub drop (≈⅛ wobble @140)
      renderDrum(E.ctx, E.sfx, "kick", d, E.noiseBuf);                    // the impact
      play("lead", d, { midi: 60, dur: 0.5, bus: "sfx" });               // a bright stab
      [0, 7, 12].forEach(function(iv, i){ play("bell", d + 0.14 + i * 0.09, { midi: 72 + iv, dur: 0.45, bus: "sfx" }); });  // a sparkle tail
    } else {
      duck(0.5, 0.5);
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
  // T151 — TWO independent fixes keep the FDN feedback BOUNDED (it was diverging
  // exponentially — browser-measured `Synth.output()` hit 159× in 3 s):
  //
  // (1) NON-RESONANT damping. Web Audio reads a "lowpass" Q in dB (linear =
  //     10^(Q/20)); the default Q=1 is a +2 dB RESONANT peak (~1.25× linear) AT the
  //     cutoff that multiplies the feedback loop gain. Q = -3.0103 dB = linear 0.7071
  //     is a maximally-flat Butterworth — measured real-Web-Audio peak gain is
  //     exactly 1.0 (passive). This alone fixed the default 0.78 tail (159 → ~1.0).
  //
  // (2) A MEASURED-SAFE decay CAP. Even with a perfectly passive filter the real FDN
  //     develops a pole outside the unit circle above ~0.82 (the ideal "0.5·H is
  //     orthonormal ⇒ stable for decay<1" misses real biquad/fractional-delay gain).
  //     Measured via OfflineAudioContext (real BiquadFilters, 5 s continuous
  //     excitation at the 0.22 send level): 0.78 is SOLIDLY bounded (~0.45 every run),
  //     0.80 sits right ON the cliff (0.45 one run, 2.4 the next — excitation-
  //     dependent), and ≥0.82 diverges (2.4 → 9.9 → 30+). So the tail decay is CLAMPED
  //     to 0.78 (the default) — comfortably below the cliff. (ambient, which wanted a
  //     long 0.9 tail, keeps its washy identity via its high reverb SEND 0.55 + slow
  //     60 BPM instead.) Authoritative proof: test/browser/audio.test.js renders all
  //     12 styles' REAL reverb bounded ≤ 2, and 0.9 divergent.
  const FDN_DAMP_Q = -3.0103;   // dB → linear 0.7071 (Butterworth, measured passive: peak gain 1.0)
  const FDN_DECAY_DEFAULT = 0.78, FDN_DECAY_MAX = 0.78;   // 0.78: measured-safe (0.80 marginal, ≥0.82 diverges)
  function makeReverb(ctx, opts){
    opts = opts || {};
    const decay = opts.decay == null ? FDN_DECAY_DEFAULT : opts.decay;   // feedback gain (<1 → stable)
    const damp = opts.damp == null ? 3600 : opts.damp;        // tail darkening (Hz)
    const input = ctx.createGain(), output = ctx.createGain();
    const pre = ctx.createDelay(0.2); pre.delayTime.value = opts.preDelay == null ? 0.012 : opts.preDelay;
    input.connect(pre);
    const delays = [], damps = [];
    for(let i = 0; i < 4; i++){
      const dl = ctx.createDelay(0.5); dl.delayTime.value = FDN_TIMES[i];
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = damp;
      if(lp.Q) lp.Q.value = FDN_DAMP_Q;                        // T151: non-resonant (Butterworth) → loop gain ≤ decay
      dl.connect(lp); delays.push(dl); damps.push(lp);
      pre.connect(dl);                                         // input feeds every line
    }
    // unitary feedback matrix: delay_j input += Σ H[j][i]·(0.5·decay)·damped_i
    const fb = [];
    for(let j = 0; j < 4; j++) for(let i = 0; i < 4; i++){
      const g = ctx.createGain(); g.gain.value = FDN_HADAMARD[j][i] * 0.5 * decay;
      damps[i].connect(g); g.connect(delays[j]); fb.push({ g: g, coef: FDN_HADAMARD[j][i] * 0.5 });
    }
    // wide stereo tail: alternate taps hard-ish L/R into the output
    for(let i = 0; i < 4; i++){
      if(ctx.createStereoPanner){ const p = ctx.createStereoPanner(); p.pan.value = (i % 2 === 0) ? -0.6 : 0.6; damps[i].connect(p); p.connect(output); }
      else damps[i].connect(output);
    }
    return { input: input, output: output, delays: delays, damps: damps, fb: fb,
             dampHz: damp, dampQ: FDN_DAMP_Q, decay: decay,   // T151: introspection for the divergence gate
             setDamp: function(f){ for(const d of damps) try{ d.frequency.value = f; }catch(e){} },
             // T139: a longer/shorter tail per style — rescale the feedback gains (stays < 1 = stable).
             setDecay: function(dec){ const d = Math.max(0, Math.min(FDN_DECAY_MAX, dec)); for(const f of fb) try{ f.g.gain.value = f.coef * d; }catch(e){} } };
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
    mount: mount, play: play, drum: drum, setReverb: setReverb, setReverbDecay: setReverbDecay, duck: duck,
    setMusic: setMusic, setContext: setContext, swapNow: swapNow, sting: sting, start: start, stop: stop, musicPlaying: musicPlaying, intensity: intensity,
    musicState: function(){ return { spec: M.spec, want: M.want, step: M.step, phrase: M.phrase, playing: !!M.timer, activeVoices: M.active.length }; },   // introspection (tests / the [A] wire)
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
    // contexts (increment 5 / T139 12-style palette)
    CONTEXTS: CONTEXTS, STYLE_IDS: STYLE_IDS, hashStr: hashStr,
    styles: function(){ return STYLE_IDS.map(function(id){ return { id: id, label: CONTEXTS[id].label }; }); },   // launcher list (for [A]/T140)
    // introspection (tests / the [A] wire)
    buses: function(){ return { master: E.master, limiter: E.limiter, music: E.music, drum: E.drum, sfx: E.sfx, reverb: E.reverb, musicSend: E.musicSend, drumSend: E.drumSend }; },
    noiseBuffer: function(){ return E.noiseBuf; },
    // T151: the FDN topology + the (max) per-style decays — so the divergence gate
    // can faithfully simulate the reverb feedback and prove the tail is bounded.
    reverbParams: function(){
      const decays = STYLE_IDS.map(function(id){ const d = CONTEXTS[id].reverbDecay; return d == null ? FDN_DECAY_DEFAULT : d; });
      return { times: FDN_TIMES.slice(), hadamard: FDN_HADAMARD.map(function(r){ return r.slice(); }),
               dampHz: 3600, dampQ: FDN_DAMP_Q, decayDefault: FDN_DECAY_DEFAULT, decayMax: FDN_DECAY_MAX,
               styleDecays: decays };
    }
  };
  window.Synth = api;
})();
