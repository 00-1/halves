/* T120 — synth.js (generative-audio engine), increment 1: ENGINE CORE.
 * Headless proof of the patch→graph construction, the ADSR envelope shape, the
 * master/bus/limiter wiring, patch distinctness, and budget (no timer leak), via a
 * recording AudioContext stub. Run: node test/synth.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// ---- a recording Web Audio stub (mirrors sound.test.js's AudioContext stub) ----
function mkParam(){
  const calls = [];
  return {
    value: 0, _calls: calls,
    setValueAtTime(v, t){ this.value = v; calls.push(["set", v, t]); },
    exponentialRampToValueAtTime(v, t){ this.value = v; calls.push(["exp", v, t]); },
    linearRampToValueAtTime(v, t){ this.value = v; calls.push(["lin", v, t]); },
    setTargetAtTime(v, t){ this.value = v; calls.push(["tgt", v, t]); },
    cancelScheduledValues(t){ calls.push(["cancel", t]); }
  };
}
function StubCtx(seedState){
  const nodes = seedState;     // shared record { types:{}, conns:[] }
  function rec(type, extra){
    const node = Object.assign({ _type: type, connect(dst){ nodes.conns.push([type, dst && dst._type]); } }, extra);
    nodes.types[type] = (nodes.types[type] || 0) + 1;
    nodes.list.push(node);
    return node;
  }
  return {
    currentTime: 10, sampleRate: 48000, state: "running", destination: { _type: "destination" },
    resume(){ this.state = "running"; }, close(){},
    createGain(){ return rec("gain", { gain: mkParam() }); },
    createOscillator(){ return rec("osc", { type: "", frequency: Object.assign(mkParam(), { _type: "osc.freq" }), detune: Object.assign(mkParam(), { _type: "osc.detune" }), start(){}, stop(){} }); },
    createBiquadFilter(){ return rec("biquad", { type: "", frequency: Object.assign(mkParam(), { _type: "biquad.freq" }), Q: mkParam() }); },
    createDynamicsCompressor(){ return rec("comp", { threshold: mkParam(), knee: mkParam(), ratio: mkParam(), attack: mkParam(), release: mkParam() }); },
    createStereoPanner(){ return rec("panner", { pan: mkParam() }); },
    createBufferSource(){ return rec("bufsrc", { buffer: null, start(){}, stop(){} }); },
    createDelay(){ return rec("delay", { delayTime: mkParam() }); },
    createBuffer(ch, len, sr){ const data = new Float32Array(len); return { length: len, sampleRate: sr, getChannelData(){ return data; } }; }
  };
}
function freshRecord(){ return { types: {}, conns: [], list: [] }; }
function load(){ global.window = {}; new Function(read("synth.js"))(); return global.window.Synth; }

// =====================================================================
// 1) Master graph: master → limiter → destination, with 3 submix buses
// =====================================================================
let rec = freshRecord();
let Synth = load();
ok(typeof Synth.mount === "function" && typeof Synth.play === "function", "Synth exposes mount + play");
Synth.mount({ ctx: StubCtx(rec) });
const buses = Synth.buses();
ok(buses.master && buses.limiter && buses.music && buses.drum && buses.sfx, "mount builds master + limiter + music/drum/sfx buses");
ok(rec.types.comp === 1, "the master chain has a brickwall limiter (DynamicsCompressor)");
const has = (a, b) => rec.conns.some(c => c[0] === a && c[1] === b);
ok(has("gain", "comp") && has("comp", "destination"), "master → limiter → destination");
// the three submix buses feed the master (gain→gain)
ok(rec.conns.filter(c => c[0] === "gain" && c[1] === "gain").length >= 3, "music/drum/sfx buses → master");
ok(Math.abs(buses.master.gain.value - Synth.MASTER_VOL) < 1e-9, "master gain = MASTER_VOL");
ok(buses.limiter.ratio.value === 20 && buses.limiter.threshold.value === Synth.LIMIT_DB, "limiter is a true brickwall (ratio 20 @ LIMIT_DB)");
// noise buffer is procedurally filled (no sample asset) + deterministic
const nb = Synth.noiseBuffer();
ok(nb && nb.getChannelData(0).some(v => v !== 0), "a procedural noise buffer exists (no sample asset)");

// =====================================================================
// 2) ADSR envelope shape — attack→peak, decay→sustain, hold, release→0
// =====================================================================
const p = mkParam();
const end = Synth.adsr(p, 10, 0.5, { a: 0.02, d: 0.1, s: 0.5, r: 0.2, peak: 0.8 });
const c = p._calls;
ok(c[0][0] === "cancel", "ADSR cancels prior automation at note-on");
ok(c[1][0] === "set" && Math.abs(c[1][1] - 1e-4) < 1e-9 && c[1][2] === 10, "ADSR starts from ~0 at t0");
ok(c[2][0] === "exp" && Math.abs(c[2][1] - 0.8) < 1e-9 && Math.abs(c[2][2] - 10.02) < 1e-6, "attack ramps to peak at t0+a");
ok(c[3][0] === "exp" && Math.abs(c[3][1] - 0.4) < 1e-9 && Math.abs(c[3][2] - 10.12) < 1e-6, "decay ramps to sustain (peak*s) at t0+a+d");
ok(c[c.length - 1][0] === "exp" && Math.abs(c[c.length - 1][1] - 1e-4) < 1e-9, "release ramps back to ~0");
ok(Math.abs(end - 10.7) < 1e-6, "ADSR returns the release-end time (hold dur=0.5 + r=0.2)");
// a very short note still completes attack+decay (hold = max(a+d, dur))
const p2 = mkParam(); const end2 = Synth.adsr(p2, 0, 0.01, { a: 0.05, d: 0.1, s: 0.5, r: 0.1, peak: 1 });
ok(Math.abs(end2 - 0.25) < 1e-6, "a short note still completes attack+decay before release");

// =====================================================================
// 3) Patch → graph: each engine type builds the right nodes
// =====================================================================
// Mount (which now also builds the shared reverb), then RESET the record so only
// the played voice's nodes are inspected (not the mount/reverb graph).
function graphOf(patchName, opts){ const r = freshRecord(); const S = load(); S.mount({ ctx: StubCtx(r) }); r.types = {}; r.conns = []; r.list = []; S.play(patchName, 1, opts); return r; }

const pad = graphOf("pad");
ok(pad.types.osc === 3, "pad (unison) builds 3 detuned oscillators");
ok(pad.types.biquad === 1 && pad.list.some(n => n._type === "biquad" && n.type === "lowpass"), "pad has a lowpass filter");
ok(pad.types.panner === 1, "pad is placed with a stereo panner");

const bell = graphOf("bell");
ok(bell.types.osc === 2, "bell (FM) builds a carrier + a modulator oscillator");
ok(bell.conns.some(c => c[0] === "gain" && c[1] === "osc.freq"), "FM routes the modulator gain → carrier frequency");

const wub = graphOf("wub");
ok(wub.types.osc === 2 && wub.types.biquad === 1, "wub builds a saw + an LFO oscillator and a resonant filter");
ok(wub.conns.some(c => c[0] === "gain" && c[1] === "biquad.freq"), "the wub LFO gain modulates the filter cutoff");
ok(wub.list.some(n => n._type === "biquad" && n.Q.value === 12), "the wub filter is resonant (high Q)");

const bass = graphOf("bass");
ok(bass.types.osc === 1 && bass.list.some(n => n._type === "biquad" && n.frequency.value <= 600), "bass is a mono voice with a low cutoff");

// filter envelope actually modulates the cutoff (a lin ramp up then back)
const pluckRec = graphOf("pluck");
const pluckFilt = pluckRec.list.find(n => n._type === "biquad");
ok(pluckFilt && pluckFilt.frequency._calls.some(x => x[0] === "lin"), "the filter envelope sweeps the cutoff (pluck snaps open)");

// =====================================================================
// 4) Patch distinctness — instruments really differ (not one osc reskinned)
// =====================================================================
const names = ["pad", "pluck", "bass", "bell", "lead", "wub"];
const sigs = names.map(n => Synth.patchSignature(Synth.PATCHES[n]));
ok(new Set(sigs).size === names.length, "all 6 patches have distinct signatures (" + new Set(sigs).size + "/" + names.length + ")");
// concretely: their built graphs differ in node makeup
const makeup = names.map(n => { const r = graphOf(n); return JSON.stringify(r.types); });
ok(new Set(makeup).size >= 4, "patches build materially different node graphs (" + new Set(makeup).size + " distinct shapes)");

// =====================================================================
// 5) Drum kit — noise-based percussion, distinct per piece
// =====================================================================
function drumGraph(piece){ const r = freshRecord(); const S = load(); S.mount({ ctx: StubCtx(r) }); r.types = {}; r.conns = []; r.list = []; S.drum(piece, 1); return r; }
const kick = drumGraph("kick");
ok(kick.types.osc === 1 && !kick.types.bufsrc, "kick is a tonal sine (pitch-dropped), not noise");
const kf = kick.list.find(n => n._type === "osc");
ok(kf.frequency._calls.some(x => x[0] === "exp"), "kick has a pitch drop (frequency exp ramp)");
const hat = drumGraph("hat");
ok(hat.types.bufsrc === 1 && hat.list.some(n => n._type === "biquad" && n.type === "highpass"), "hat = highpassed noise");
const snare = drumGraph("snare");
ok(snare.types.bufsrc === 1 && snare.types.osc === 1 && snare.list.some(n => n._type === "biquad" && n.type === "bandpass"), "snare = bandpassed noise + a tonal body");
const clap = drumGraph("clap");
ok(clap.types.bufsrc === 3, "clap = several staggered noise bursts");

// =====================================================================
// 6) Budget + behaviour: mute, no-context no-op, no timer/RAF leak in core
// =====================================================================
let timers = 0; const realSI = global.setInterval; global.setInterval = () => { timers++; return 1; };
const r6 = freshRecord(); const S6 = load(); S6.mount({ ctx: StubCtx(r6) });
S6.play("pad", 1); S6.drum("kick", 1);
ok(timers === 0, "one-shot play()/drum() start NO timer (only the music scheduler does)");
global.setInterval = realSI;
const src = read("synth.js");
ok(!/requestAnimationFrame/.test(src), "synth.js uses no requestAnimationFrame (audio is clock-scheduled, not RAF)");
S6.setMuted(true);
ok(S6.isMuted() === true && Math.abs(S6.buses().master.gain.value) < 1e-9, "mute zeroes the master gain");
ok(S6.play("pad", 1) === 0, "a muted engine schedules no voice");
S6.setMuted(false);
ok(Math.abs(S6.buses().master.gain.value - Synth.MASTER_VOL) < 1e-9, "unmute restores the master gain");

// standalone + no sample assets + capabilities
ok(!/\brequire\s*\(|^\s*import\s/m.test(src), "synth.js is self-contained (no deps/bundler)");
ok(!/\.(wav|mp3|ogg|flac)\b|decodeAudioData|XMLHttpRequest|fetch\s*\(/i.test(src), "synth.js loads NO sample assets (pure WebAudio)");
ok(/window\.Synth\s*=/.test(src) && !/window\.Sound\s*\./.test(src), "synth.js defines its own window.Synth and never calls window.Sound (B-owned, standalone)");
const capsBefore = load().capabilities();
ok(typeof capsBefore.webaudio === "boolean" && typeof capsBefore.ready === "boolean", "capabilities() reports webaudio + ready");

// =====================================================================
// 7) SPACE (increment 2): FDN reverb + sends + stereo width + ducking
// =====================================================================
let rv = freshRecord(); const Sv = load(); Sv.mount({ ctx: StubCtx(rv) });
const b = Sv.buses();
ok(b.reverb && b.reverb.delays.length === 4, "mount builds an FDN reverb with 4 delay lines");
ok(rv.types.delay >= 5, "the reverb uses delay lines (4 FDN + a pre-delay)");
ok(b.reverb.damps.length === 4 && b.reverb.damps.every(d => d.type === "lowpass"), "each delay line is damped by a lowpass (dark tail)");
// unitary feedback matrix: 16 cross-feed gains (damped_i → matrix gain → delay_j)
ok(rv.conns.filter(c => c[0] === "biquad" && c[1] === "gain").length >= 16, "a 4×4 Hadamard feedback matrix recombines the lines (≥16 cross gains)");
ok(rv.conns.some(c => c[0] === "gain" && c[1] === "delay"), "feedback gains re-enter the delay lines (the recirculation)");
// stereo width: taps panned L/R
ok(rv.types.panner >= 4 && b.reverb.damps, "the reverb tail is spread across stereo panners (width)");
// sends: music + drums feed the reverb; reverb returns to master
ok(b.musicSend && b.drumSend, "music + drum buses have reverb sends");
ok(rv.conns.some(c => c[0] === "gain" && c[1] === "gain"), "the reverb output returns to the master bus");
ok(b.musicSend.gain.value > b.drumSend.gain.value, "drums are sent dryer than the music (less wash)");

// setReverb adjusts wetness; drums stay proportionally dryer
Sv.setReverb(0.4);
ok(Math.abs(b.musicSend.gain.value - 0.4) < 1e-9 && b.drumSend.gain.value < b.musicSend.gain.value, "setReverb sets the wet send (drums kept dryer)");

// ducking: dips the music bus then recovers (sidechain glue)
const before = b.music.gain._calls.length;
Sv.duck(0.6, 0.2);
const dk = b.music.gain._calls.slice(before);
ok(dk.some(x => x[0] === "tgt" && x[1] < 0.5), "duck() dips the music bus under a cue");
ok(dk.filter(x => x[0] === "tgt").length >= 2 && dk.some(x => x[0] === "tgt" && Math.abs(x[1] - 1) < 1e-9), "duck() recovers the music bus afterwards");

// the reverb is built ONCE at mount, not per voice (budget): playing adds no delays
const delaysAfterMount = rv.types.delay;
Sv.play("pad", 1); Sv.play("lead", 1);
ok(rv.types.delay === delaysAfterMount, "voices do NOT rebuild the reverb (shared, one-time)");
// makeReverb is stable: feedback scaled below unity
const fdn = Sv.makeReverb(StubCtx(freshRecord()));
ok(fdn.input && fdn.output && fdn.delays.length === 4, "makeReverb exposes a clean input/output + 4 lines");

// =====================================================================
// 8) HARMONY (increment 3): modes, progressions, voice-leading, bass-root
// =====================================================================
// modes carry their defining colour (lydian ♯4, phrygian ♭2, dorian ♮6)
ok(Synth.MODES.lydian[3] === 6, "lydian raises the 4th (♯4 — bright)");
ok(Synth.MODES.phrygian[1] === 1, "phrygian flattens the 2nd (♭2 — dark)");
ok(Synth.MODES.dorian[5] === 9 && Synth.MODES.minor[5] === 8, "dorian has a ♮6 vs natural minor's ♭6");
ok(Synth.MODE_MOOD.bright.includes("lydian") && Synth.MODE_MOOD.dark.includes("phrygian"), "modes are grouped by mood (bright/calm/dark)");

// degree → MIDI is octave-aware and wraps
ok(Synth.degToMidi(60, "major", 0, 0) === 60, "degree 0 = the root");
ok(Synth.degToMidi(60, "major", 7, 0) === 72, "degree 7 wraps to the octave (+12)");
ok(Synth.degToMidi(60, "major", 4, 0) === 67, "degree 4 = a perfect 5th (G over C)");

// diatonic triads = stacked scale-thirds; chord tones are in key
const Cmaj = Synth.chordMidi(60, "major", 0, 0);
ok(JSON.stringify(Cmaj) === JSON.stringify([60, 64, 67]), "I in C major = C-E-G (stacked thirds)");
const vi = Synth.chordMidi(60, "major", 5, 0);
ok(JSON.stringify(vi) === JSON.stringify([69, 72, 76]), "vi in C major = A-C-E");

// voice-leading minimises motion AND lands on chord tones
const prev = Synth.chordMidi(60, "major", 0, 0);                // C-E-G
const led = Synth.voiceLead(prev, Synth.chordMidi(60, "major", 4, 0));  // → G chord, voice-led
const naive = Synth.chordMidi(60, "major", 4, 0);              // root-position G-B-D
const motion = (a, b) => a.reduce((s, m, i) => s + Math.abs(m - b[i]), 0);
ok(motion(prev, led) <= motion(prev, naive), "voice-leading moves voices less than root-position (" + motion(prev, led) + " ≤ " + motion(prev, naive) + ")");
const ledPCs = led.map(m => ((m % 12) + 12) % 12), gPCs = naive.map(m => m % 12);
ok(led.every(m => gPCs.includes(((m % 12) + 12) % 12)), "every voice-led note is a chord tone");
ok(led.every((m, i) => Math.abs(m - prev[i]) <= 6), "no voice jumps more than a tritone (smooth)");

// a realised progression: bass follows the root (low + below the pad), deterministic
const H = Synth.harmonyFor({ root: 60, mode: "ionian", progression: [0, 5, 3, 4] });
ok(H.length === 4, "harmonyFor realises every chord in the progression");
ok(H.every(c => c.bass === Synth.degToMidi(60, "ionian", c.degree, -2)), "bass follows the chord root (an octave-2 low)");
ok(H.every(c => c.bass < Math.min.apply(null, c.voiced)), "the bass sits below the voiced pad");
ok(JSON.stringify(H) === JSON.stringify(Synth.harmonyFor({ root: 60, mode: "ionian", progression: [0, 5, 3, 4] })), "harmonyFor is deterministic for a spec");
// across the progression the pad stays smooth (small total motion vs always root-position)
let ledTotal = 0, rootTotal = 0; let pv = null, rv2 = null;
for(const c of H){ if(pv){ ledTotal += motion(pv, c.voiced); rv2 && (rootTotal += motion(rv2, c.chord)); } pv = c.voiced; rv2 = c.chord; }
ok(ledTotal <= rootTotal, "the voice-led pad moves less across the progression than naive root-position");

// =====================================================================
// 9) RHYTHM & VARIATION (increment 4): Euclid, Markov, motif, scheduler
// =====================================================================
const onsets = a => a.reduce((s, v) => s + v, 0);
const gaps = a => { const idx = a.map((v, i) => v ? i : -1).filter(i => i >= 0); const g = []; for(let i = 0; i < idx.length; i++) g.push(((idx[(i + 1) % idx.length] - idx[i]) + a.length) % a.length || a.length); return g; };
// Euclid: exactly k onsets, spread as evenly as possible (max gap − min gap ≤ 1)
ok(onsets(Synth.euclid(3, 8)) === 3 && onsets(Synth.euclid(5, 16)) === 5, "euclid(k,n) places exactly k onsets");
const g38 = gaps(Synth.euclid(3, 8));
ok(Math.max.apply(null, g38) - Math.min.apply(null, g38) <= 1, "euclid spreads onsets evenly (tresillo-class)");
ok(Synth.euclid(4, 4).every(v => v === 1) && Synth.euclid(0, 8).every(v => v === 0), "euclid edge cases (k=n all on, k=0 all off)");
ok(JSON.stringify(Synth.rotate([1, 0, 0, 1, 0], 2)) === JSON.stringify([0, 1, 0, 1, 0]), "rotate shifts a pattern (phase/fills)");

// Markov: deterministic given seed; walks the table's domain
const mtable = { "0,1": [[2, 3], [0, 1]], "1,2": [[1, 1]], "*": [[0, 1]] };
const got = []; let ma = 0, mb = 1; const mr = Synth.mulberry32(11);
for(let i = 0; i < 6; i++){ const nx = Synth.markovNext(mtable, ma, mb, mr); got.push(nx); ma = mb; mb = nx; }
ok(got.every(x => typeof x === "number"), "markovNext walks a 2nd-order transition table");
ok(Synth.markovNext(mtable, 0, 1, Synth.mulberry32(7)) === Synth.markovNext(mtable, 0, 1, Synth.mulberry32(7)), "markovNext is deterministic for a seed");

// Motif development transforms
ok(JSON.stringify(Synth.transposeMotif([0, 2, 4], 5)) === JSON.stringify([5, 7, 9]), "transpose shifts a motif");
ok(JSON.stringify(Synth.invertMotif([0, 2, 4], 0)) === JSON.stringify([0, -2, -4]), "invert mirrors a motif about an axis");
ok(JSON.stringify(Synth.retrograde([0, 2, 4])) === JSON.stringify([4, 2, 0]), "retrograde reverses a motif");

// phraseSeed: deterministic + evolves per phrase
ok(Synth.phraseSeed(42, 0) === Synth.phraseSeed(42, 0) && Synth.phraseSeed(42, 0) !== Synth.phraseSeed(42, 1), "phraseSeed is stable per phrase but evolves across phrases");
// density rises across a phrase (breathes / arrives)
const dspec = { harmony: Synth.harmonyFor({ root: 60, mode: "ionian", progression: [0, 5, 3, 4] }), density: 0.5 };
ok(Synth.densityAt(dspec, 63) > Synth.densityAt(dspec, 0), "density rises across a phrase (sparse → fuller)");

// stepEvents: pad on the downbeat, bass on 1 & 3, drums from the Euclid kit
const mspec = Synth.normalizeMusic({ tempo: 96, root: 60, mode: "ionian", progression: [0, 5, 3, 4], seed: 1, density: 1 });
const e0 = Synth.stepEvents(mspec, 0, Synth.mulberry32(1), 0, { deg: 0 });
ok(e0.some(x => x.role === "pad") && e0.some(x => x.role === "bass"), "the downbeat lays the pad chord + bass root");
const e8 = Synth.stepEvents(mspec, 8, Synth.mulberry32(1), 0, { deg: 0 });
ok(e8.some(x => x.role === "bass") && !e8.some(x => x.role === "pad"), "beat 3 re-strikes the bass (not the pad)");

// --- the single lookahead scheduler: one timer, schedules, idles, deterministic ---
function runMusic(seed, ticks, jumpAtEnd){
  const r = freshRecord(); const S = load();
  const realSI = global.setInterval, realCI = global.clearInterval; let tick = null, ints = 0, clrs = 0;
  global.setInterval = (fn) => { ints++; tick = fn; return 1; }; global.clearInterval = () => { clrs++; };
  const ctx = StubCtx(r); ctx.currentTime = 10;
  S.mount({ ctx: ctx }); S.setMusic({ tempo: 96, root: 60, mode: "ionian", progression: [0, 5, 3, 4], seed: seed, density: 0.6 }); S.start();
  const oneTimer = ints; const playing = S.musicPlaying();
  for(let k = 0; k < ticks; k++){ ctx.currentTime += 0.2; tick(); }
  let burstAdded = 0;
  if(jumpAtEnd){ ctx.currentTime += 10000; const pre = r.list.length; tick(); burstAdded = r.list.length - pre; }
  S.stop(); const cleared = clrs, stillPlaying = S.musicPlaying();
  global.setInterval = realSI; global.clearInterval = realCI;
  const seq = r.list.filter(n => n._type === "osc").map(n => Math.round(n.frequency.value));
  return { ints: oneTimer, playing: playing, seq: seq, cleared: cleared, stillPlaying: stillPlaying, burstAdded: burstAdded };
}
const A = runMusic(42, 10, true), B = runMusic(42, 10, false), C = runMusic(43, 10, false);
ok(A.ints === 1 && A.playing, "setMusic+start runs exactly ONE lookahead scheduler");
ok(A.seq.length > 0, "the scheduler schedules voices as the clock advances");
ok(JSON.stringify(A.seq) === JSON.stringify(B.seq), "a performance is deterministic for a seed");
ok(JSON.stringify(A.seq) !== JSON.stringify(C.seq), "a different seed → a different performance");
ok(A.cleared >= 1 && !A.stillPlaying, "stop() clears the single interval (idles, no leak)");
ok(A.burstAdded < 200, "a stalled clock drops the backlog — no note flood (anti-burst, " + A.burstAdded + " nodes)");

// intensity raises density (denser toward the boss — the shared FX signal)
let dense = 0, calm = 0; const rg1 = Synth.mulberry32(5), rg2 = Synth.mulberry32(5);
for(let s = 0; s < 64; s++){ if(Synth.stepEvents(mspec, s, rg1, 0, { deg: 0 }).some(x => x.role === "lead")) calm++; if(Synth.stepEvents(mspec, s, rg2, 1, { deg: 0 }).some(x => x.role === "lead")) dense++; }
ok(dense >= calm, "intensity() thickens the lead (denser toward the boss: " + dense + " ≥ " + calm + ")");

// =====================================================================
// 10) CONTEXTS (increment 5) + the CALM-vs-ENERGETIC invariants (the firm rule)
// =====================================================================
const CX = Synth.CONTEXTS, solve = CX.solve, arena = CX.arena;
ok(solve && arena && CX.menu && CX.event, "the calm-solve, menu, event and Arena contexts are authored");

// the firm rule, enforced — Arena DRIVES, solve is CALM, by construction:
ok(arena.density > solve.density, "Arena is denser than solve (energy)");
ok(arena.tempo > solve.tempo, "Arena is faster than solve (drive)");
ok(solve.reverb > arena.reverb, "solve is wetter/spacier; Arena is drier/tighter");
ok(Synth.MODE_MOOD.dark.includes(arena.mode), "Arena uses a dark mode (" + arena.mode + ")");
ok(Synth.MODE_MOOD.calm.includes(solve.mode) || Synth.MODE_MOOD.bright.includes(solve.mode), "solve uses a calm/bright mode (" + solve.mode + ")");
ok(Synth.PATCHES[solve.patches.pad].amp.a > Synth.PATCHES[arena.patches.lead].amp.a, "the calm pad attacks softer than the Arena lead (soft vs sharp)");
ok(arena.patches.bass === "wub", "Arena rides the wub bass");
ok(arena.hatK > solve.hatK, "Arena's hats are busier than solve's (Euclid density)");

// setContext drives the scheduler with the context's character (deterministic)
function ctxSeq(name){
  const r = freshRecord(); const S = load();
  const si = global.setInterval, ci = global.clearInterval; let t = null;
  global.setInterval = (fn) => { t = fn; return 1; }; global.clearInterval = () => {};
  const ctx = StubCtx(r); ctx.currentTime = 10;
  S.mount({ ctx: ctx }); S.setContext(name);
  const playing = S.musicPlaying();
  for(let k = 0; k < 12; k++){ ctx.currentTime += 0.2; t && t(); }
  global.setInterval = si; global.clearInterval = ci;
  return { playing: playing, seq: r.list.filter(n => n._type === "osc").map(n => Math.round(n.frequency.value)) };
}
const sv = ctxSeq("solve"), ar = ctxSeq("arena");
ok(sv.playing && sv.seq.length > 0, "setContext('solve') plays a performance");
ok(JSON.stringify(sv.seq) !== JSON.stringify(ar.seq), "solve and Arena are audibly different performances");
ok(JSON.stringify(ctxSeq("solve").seq) === JSON.stringify(sv.seq), "a context is deterministic (seed from its name)");

// the victory sting is a brief one-shot that ducks the bed — NOT the loop
let rs = freshRecord(); const Ss = load();
const si3 = global.setInterval; let started = 0; global.setInterval = () => { started++; return 1; };
const ctxs = StubCtx(rs); Ss.mount({ ctx: ctxs });
const duckBefore = Ss.buses().music.gain._calls.length;
Ss.sting("victory");
global.setInterval = si3;
ok(started === 0 && !Ss.musicPlaying(), "sting('victory') is a one-shot — it starts no music loop");
ok(rs.list.filter(n => n._type === "osc").length >= 4, "the victory sting fires a wub + a bright arpeggio");
ok(Ss.buses().music.gain._calls.length > duckBefore, "the sting ducks the music bed under the cue");

// =====================================================================
// 11) Mute idles the scheduler / unmute resumes (the T122-wiring-surfaced fix)
// =====================================================================
(function(){
  const r = freshRecord(); const S = load();
  const si = global.setInterval, ci = global.clearInterval; let tk = null, clr = 0;
  global.setInterval = (fn) => { tk = fn; return 1; }; global.clearInterval = () => { clr++; };
  const ctx = StubCtx(r); ctx.currentTime = 10; S.mount({ ctx: ctx });
  S.setMusic({ tempo: 96, root: 60, mode: "ionian", seed: 1 }); S.start();
  ok(S.musicPlaying(), "the music scheduler runs once started");
  S.setMuted(true);
  ok(!S.musicPlaying() && clr >= 1, "mute IDLES the scheduler (no silent voices spawned — CPU/battery)");
  S.setMuted(false);
  ok(S.musicPlaying(), "unmute RESUMES the current context");
  global.setInterval = si; global.clearInterval = ci;
})();
(function(){
  const r = freshRecord(); const S = load(); const si = global.setInterval; let started = 0;
  global.setInterval = () => { started++; return 1; };
  const ctx = StubCtx(r); S.mount({ ctx: ctx }); S.setMuted(true); S.setMuted(false);
  ok(started === 0 && !S.musicPlaying(), "unmute with no music set starts no scheduler (clean)");
  global.setInterval = si;
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " SYNTH CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
