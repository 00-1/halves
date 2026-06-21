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
ok(timers === 0, "the engine core starts NO timer/scheduler (no leak; the scheduler is a later increment)");
global.setInterval = realSI;
const src = read("synth.js");
ok(!/setInterval|requestAnimationFrame/.test(src), "synth.js core has no setInterval/RAF (one-shot voices only)");
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

console.log("\n" + (fails === 0 ? "ALL " + checks + " SYNTH CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
