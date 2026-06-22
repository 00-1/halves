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

// ---- shared MUTE master + separate SFX bus + brickwall limiter (T143) --------
S.unlock();
const master = gains[0], sfxBus = gains[1];   // unlock() creates master then the SFX bus
ok(master && master.gain.value === 1, "master is a MUTE-only shared bus (gain 1 when unmuted) — " + (master && master.gain.value));
ok(sfxBus && Math.abs(sfxBus.gain.value - 0.16) < 1e-9, "the SFX bus has its OWN gain, independent of music (" + (sfxBus && sfxBus.gain.value) + ")");
ok(comps.length === 1, "exactly one DynamicsCompressor (the safety limiter)");
const lim = comps[0];
ok(sfxBus._to.includes(master) && master._to.includes(lim) && lim._to.some(t => t && t._isDest), "SFX bus → master → limiter → destination (music routes into master too; limiter governs the sum)");
ok(lim.ratio.value >= 20 && lim.knee.value === 0 && lim.threshold.value < 0, "the limiter is a brickwall (ratio ≥ 20, hard knee, sub-0-dBFS)");

// ---- separate, live SFX volume (T143) ---------------------------------------
ok(S.SFX_MAX === 1 && typeof S.setSfxVolume === "function", "T143: SFX has its OWN clamped volume (SFX_MAX = 1.0)");
S.setSfxVolume(0.30); ok(Math.abs(sfxBus.gain.value - 0.30) < 1e-9, "setSfxVolume(0.30) sets the SFX bus gain LIVE (not the master)");
ok(master.gain.value === 1, "the SFX volume does NOT touch the master (music volume stays independent)");
S.setSfxVolume(99);   ok(Math.abs(sfxBus.gain.value - S.SFX_MAX) < 1e-9, "setSfxVolume clamps to SFX_MAX (" + sfxBus.gain.value + ") — limiter keeps it clip-safe");
S.setSfxVolume(0.16);
// mute zeroes the shared master (silences BOTH SFX + music); unmute restores unity
S.setMuted(true);  ok(master.gain.value === 0, "mute sets the shared master to 0 (silences SFX + music)");
S.setMuted(false); ok(master.gain.value === 1, "unmute restores the master to unity");

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
ok(!/setTempo|tempoMult|TEMPO_MIN/.test(ssrc), "T122: sound.js no longer owns tempo");
// visibility still suspends/resumes the shared ctx (battery), without music calls
hidden = true; visHandler && visHandler(); ok(S.ctx().state === "suspended", "tab hidden suspends the shared AudioContext");
hidden = false; visHandler && visHandler(); ok(S.ctx().state === "running", "tab visible resumes the shared AudioContext");

// ---- T224: ONE shared 0–11 volume scale, midpoint defaults, no tempo slider -------
// Both music + SFX sliders are 0–11 integers (default 6 = the midpoint). The per-bus
// gain differs (music ≈0.11× at 6, SFX ≈0.55×); 0 = silent, 11 ≈ 2× the midpoint.
ok(/function loadMusicLevel\(\)[\s\S]{0,420}return 6;/.test(msrc) && /halves\.musLv11/.test(msrc), "T224: fresh-profile music level = 6 (midpoint of 0–11)");
ok(/function loadSfxLevel\(\)[\s\S]{0,560}return 6;/.test(msrc) && /halves\.sfxLv11/.test(msrc), "T224: fresh-profile SFX level = 6 (midpoint of 0–11)");
ok(/const VOL_MAX = 11, MUSIC_MAX_GAIN = 0\.20, SFX_MAX_GAIN = 1\.0/.test(msrc), "T224: one 0–11 scale; per-bus MAX gain (music 0.20×, SFX 1.0×)");
ok(/function musicGainFor\(level\)\{ return MUSIC_MAX_GAIN \* Math\.max\(0, Math\.min\(VOL_MAX, level\)\) \/ VOL_MAX/.test(msrc) && /function sfxGainFor\(level\)/.test(msrc), "T224: gain ramps linearly 0→MAX across the 0–11 level (0 = silent)");
ok(/setSfxVolume\(sfxGainFor\(loadSfxLevel\(\)\)\)/.test(msrc), "T224: the SFX gain comes from sfxGainFor(level), not a raw /100");
ok(/migLevel\(old, 10\)/.test(msrc) && /migLevel\(a, 100\)/.test(msrc), "T224: old prefs migrate to 0–11 (music 0–10 → ×11/10; SFX 0–100 → ×11/100)");
ok(/function synthTempoMult\(\)\{ return 1; \}/.test(msrc), "T224: tempo is LOCKED to native (the tempo slider is gone)");
ok(/id="musicVolRange"[^>]*max="11"[^>]*value="6"/.test(hsrc) && /id="sfxVolRange"[^>]*max="11"[^>]*value="6"/.test(hsrc), "T224: both sliders are 0–11, default 6");
ok(!/id="tempoRange"/.test(hsrc), "T224: the Music-tempo slider is removed from the Audio menu");

// ---- T143: the dedicated Audio menu + the navigation-trap (scroll) fix --------
const css143 = read("styles.css");
ok(/<section id="audio" class="screen">/.test(hsrc), "T143: a dedicated Audio menu screen exists");
ok(/oa\.addEventListener\("click", \(\) => \{ location\.hash = "#\/audio"; \}\)/.test(msrc) && /id="openAudio"/.test(hsrc), "T146: the Audio menu is reachable from Setup (the #openAudio row routes to #/audio)");
ok(!/id="soundBtnMenu"/.test(hsrc), "T146: the home Sound nav button is removed (audio is a Setup sub-menu now)");
ok(/h === "audio"\)\{ renderAudio\(\); show\("audio"\); \}/.test(msrc), "T143: #/audio routes to the Audio menu");
ok(/id="setSound"/.test(hsrc.slice(hsrc.indexOf('id="audio"'))), "T143: the mute toggle (#setSound) lives INSIDE the Audio menu");
// the navigation-trap fix: both menus' bodies SCROLL within the safe-area height
ok((hsrc.match(/class="settings-body scroll-body"/g) || []).length >= 2, "T143: both the Settings + Audio bodies are scrollable (.scroll-body) — Back stays reachable");
ok(/\.scroll-body\{[^}]*overflow-y:auto/.test(css143) && /\.scroll-body\{[^}]*min-height:0/.test(css143), "T143: .scroll-body scrolls within the screen (overflow-y:auto, min-height:0) so .res-actions/Back can't be pushed off");
// the celebration tester unlocks audio WITHOUT restarting the music
ok(/function fireCelebrationTest\([\s\S]{0,80}ensureAudioReady\(\)/.test(msrc) && /function ensureAudioReady\(\)\{[\s\S]{0,260}setupSynth\(\)/.test(msrc) && !/function ensureAudioReady\(\)\{[\s\S]{0,260}musicForScreen/.test(msrc), "T143(4): the celebration tester unlocks audio via ensureAudioReady (setupSynth, NO musicForScreen → no music restart)");
ok(/function audioUnlock\(\)\{[\s\S]{0,160}musicPlaying[\s\S]{0,60}startMusicWhenRunning/.test(msrc), "T143/T159: audioUnlock only STARTS music if it isn't already playing, via the running-context-guarded starter (no restart on drag/tap)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " SOUND CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
