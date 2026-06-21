/* sound.js is now SFX-ONLY (T122 — the music moved to the generative engine
 * synth.js, which mounts on this module's AudioContext + master/limiter). This
 * gate covers: the master volume + brickwall limiter (T98/T113/T114), the live
 * wide-range volume slider, mute, the pure SFX specs, and the ctx()/master()
 * exposure the Synth wire needs — and that NO music scheduler remains here.
 * Run: node test/sound.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

const gains = []; const comps = [];
function gnode(){ const g = { value: 0, setValueAtTime(v){ this.value = v; }, exponentialRampToValueAtTime(){}, cancelScheduledValues(){}, linearRampToValueAtTime(){} };
  const node = { gain: g, _to: [], connect(t){ this._to.push(t); } }; return node; }
class StubCtx {
  constructor(){ this.currentTime = 0; this.state = "running"; this.destination = { _isDest: true }; }
  createGain(){ const n = gnode(); gains.push(n); return n; }
  createOscillator(){ return { connect(){}, start(){}, stop(){}, type:"", frequency:{ value:0, setValueAtTime(){} } }; }
  createDynamicsCompressor(){ const c = { threshold:{value:0}, knee:{value:0}, ratio:{value:0}, attack:{value:0}, release:{value:0}, _to:[], connect(t){ this._to.push(t); } }; comps.push(c); return c; }
  resume(){ this.state = "running"; } suspend(){ this.state = "suspended"; }
}
let hidden = false, visHandler = null;
global.window = { AudioContext: StubCtx };
global.document = { addEventListener(e, fn){ if(e === "visibilitychange") visHandler = fn; } };
Object.defineProperty(global.document, "hidden", { get: () => hidden });

new Function(read("sound.js"))();
const S = global.window.Sound;
const ssrc = read("sound.js"), msrc = read("main.js"), hsrc = read("index.html");

// ---- master volume + brickwall limiter (T98/T113/T114) ----------------------
const VOL = 0.80;   // the bare-engine default (the app sets the calibrated default on boot)
S.unlock();
const master = gains[0];
ok(master && Math.abs(master.gain.value - VOL) < 1e-9, "master gain = the bare default VOL (" + (master && master.gain.value) + ")");
ok(comps.length === 1, "exactly one DynamicsCompressor (the safety limiter)");
const lim = comps[0];
ok(master._to.includes(lim) && lim._to.some(t => t && t._isDest), "master → limiter → destination (one shared chain; music routes in here too)");
ok(lim.ratio.value >= 20 && lim.knee.value === 0 && lim.threshold.value < 0, "the limiter is a brickwall (ratio ≥ 20, hard knee, sub-0-dBFS)");

// ---- live wide-range volume (T113/T114) -------------------------------------
ok(S.VOL_MAX === 4, "T114: VOL_MAX = 4.0 (the slider reaches genuinely loud) — " + S.VOL_MAX);
S.setVolume(1.6); ok(Math.abs(master.gain.value - 1.6) < 1e-9, "setVolume(1.6) sets the master gain LIVE to 1.6 (> 0.80)");
S.setVolume(99);  ok(Math.abs(master.gain.value - S.VOL_MAX) < 1e-9, "setVolume clamps to VOL_MAX (" + master.gain.value + ") — limiter keeps it clip-safe");
S.setVolume(0.80);
// mute zeroes the master; unmute restores
S.setMuted(true);  ok(master.gain.value === 0, "mute sets master gain to 0");
S.setMuted(false); ok(Math.abs(master.gain.value - 0.80) < 1e-9, "unmute restores the master gain");

// ---- the SFX engine is intact (pure specs) ----------------------------------
ok(typeof S.sfxSpec === "function" && typeof S.play === "function", "the SFX engine (sfxSpec/play) is intact");
["correct","skip","item","gold","topicUnlock","mastery","topic100","roundStart","roundComplete"].forEach(ev => {
  const sp = S.sfxSpec(ev); ok(sp && Array.isArray(sp.v) && sp.v.length > 0 && sp.v.every(x => x.f > 0 && x.d > 0), "sfxSpec('" + ev + "') builds real voices");
});
ok(S.sfxSpec("correct", { combo: 5 }).v[0].f > S.sfxSpec("correct", { combo: 0 }).v[0].f, "the correct chime rises with the combo streak");
["correct","skip","item","gold","topicUnlock","mastery","topic100","roundStart","roundComplete"].forEach(name => ok(typeof S[name] === "function", "the SFX trigger S." + name + "() is exposed"));

// ---- T122: ctx()/master() exposed for the Synth wire; NO music here ----------
ok(typeof S.ctx === "function" && typeof S.master === "function" && S.master() === master, "T122: sound.js exposes ctx()/master() for the Synth wire (returns the real master)");
ok(!/setMusic|stopMusic|musicPlaying|STYLES|startScheduler|setInterval|styleIndexFor|stepVoices/.test(ssrc), "T122: the old music scheduler is GONE from sound.js (no STYLES/setMusic/setInterval) — one scheduler total");
ok(!/function wub\(/.test(ssrc), "T122: the duplicate sound.js wub() is removed (Synth's wub is the one win-sting)");
ok(!/setTempo|tempoMult|TEMPO_MIN/.test(ssrc), "T122: sound.js no longer owns tempo (the T113 tempo slider drives Synth)");
// visibility still suspends/resumes the shared ctx (battery), without music calls
hidden = true; visHandler && visHandler(); ok(S.ctx().state === "suspended", "tab hidden suspends the shared AudioContext");
hidden = false; visHandler && visHandler(); ok(S.ctx().state === "running", "tab visible resumes the shared AudioContext");

// ---- T114: the owner-calibrated DEFAULTS live in main.js (saved prefs win) ---
ok(/function loadVol\(\)\{[\s\S]{0,90}: 300;/.test(msrc), "T114: fresh-profile default volume = 300 (3.0×)");
ok(/function loadTempo\(\)\{[\s\S]{0,90}: 50;/.test(msrc), "T114: fresh-profile default tempo = 50 (0.5×)");
ok(/id="volRange"[^>]*max="400"/.test(hsrc) && /id="volRange"[^>]*value="300"/.test(hsrc) && /id="tempoRange"[^>]*value="50"/.test(hsrc), "T114: the sliders reach 4.0× and default to 3.0× / 0.5×");

console.log("\n" + (fails === 0 ? "ALL " + checks + " SOUND CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
