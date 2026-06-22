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
ok(!/setTempo|tempoMult|TEMPO_MIN/.test(ssrc), "T122: sound.js no longer owns tempo (the T113 tempo slider drives Synth)");
// visibility still suspends/resumes the shared ctx (battery), without music calls
hidden = true; visHandler && visHandler(); ok(S.ctx().state === "suspended", "tab hidden suspends the shared AudioContext");
hidden = false; visHandler && visHandler(); ok(S.ctx().state === "running", "tab visible resumes the shared AudioContext");

// ---- T143/T135: separate Music + SFX volume DEFAULTS in main.js (saved prefs win) --
// Fresh music vol = 5 (0.05×, the loud synth); SFX vol = 8 (louder, so blips aren't
// lost under the music). The old single `halves.vol` migrates (in-range → music level).
ok(/function loadMusicVol\(\)[\s\S]{0,220}\? 5 :/.test(msrc) && /halves\.musicVol/.test(msrc), "T143: fresh-profile music volume = 5 (0.05×)");
// T148 — the SFX slider maps to the REAL 0→SFX_MAX(1.0×) range (not music's 0.10×):
// fresh default 60 (0.60×), stored as 0–100 (`halves.sfxLvl`), migrating T143's 0–10 ×10.
ok(/function loadSfxVol\(\)[\s\S]{0,320}return 60/.test(msrc) && /halves\.sfxLvl/.test(msrc), "T148: fresh-profile SFX volume = 60 (0.60× — clearly over the music)");
ok(/old \* 10/.test(msrc), "T148: the old 0–10 halves.sfxVol migrates ×10 to the new 0–100 scale (returning users get the louder mapping)");
ok(/setSfxVolume\(loadSfxVol\(\) \/ 100\)/.test(msrc), "T148: the SFX gain = sfxLvl/100 → up to SFX_MAX (1.0×), not capped at music's 0.10×");
ok(/function migVol\(\)[\s\S]{0,160}v <= 10\)/.test(msrc), "T143: the old single halves.vol migrates (in-range → the music level)");
ok(/function loadTempo\(\)\{[\s\S]{0,90}: 50;/.test(msrc), "T114: fresh-profile default tempo = 50 (0.5×)");
ok(/id="musicVolRange"[^>]*max="10"/.test(hsrc) && /id="sfxVolRange"[^>]*max="100"/.test(hsrc) && /id="sfxVolRange"[^>]*value="60"/.test(hsrc) && /id="tempoRange"[^>]*value="50"/.test(hsrc), "T143/T148: Music slider 0–10 (0.10× max); SFX slider 0–100 (1.0× max, default 60); tempo default 50");

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
