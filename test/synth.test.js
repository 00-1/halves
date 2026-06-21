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
function graphOf(patchName, opts){ const r = freshRecord(); const S = load(); S.mount({ ctx: StubCtx(r) }); S.play(patchName, 1, opts); return r; }

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
const pluckRec = freshRecord(); const S2 = load(); S2.mount({ ctx: StubCtx(pluckRec) }); S2.play("pluck", 1);
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
function drumGraph(piece){ const r = freshRecord(); const S = load(); S.mount({ ctx: StubCtx(r) }); S.drum(piece, 1); return r; }
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

console.log("\n" + (fails === 0 ? "ALL " + checks + " SYNTH CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
