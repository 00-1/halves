/* T69/T98 — audio volume: master raised to a clearly-audible 0.80 with a brickwall
 * LIMITER guaranteeing no clipping, music a balanced background, mute + visibility
 * behaviour intact. Drives window.Sound under a stub AudioContext.
 * Run: node test/sound.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

const gains = []; let oscCount = 0; const comps = [];
function gnode(){ const g = { value: 0, setValueAtTime(v){ this.value = v; }, exponentialRampToValueAtTime(){}, cancelScheduledValues(){}, linearRampToValueAtTime(){} };
  const node = { gain: g, _to: [], connect(t){ this._to.push(t); } }; return node; }
class StubCtx {
  constructor(){ this.currentTime = 0; this.state = "running"; this.destination = { _isDest: true }; }
  createGain(){ const n = gnode(); gains.push(n); return n; }
  createOscillator(){ oscCount++; return { connect(){}, start(){}, stop(){}, type:"", frequency:{ value:0, setValueAtTime(){} } }; }
  createDynamicsCompressor(){ const c = { threshold:{value:0}, knee:{value:0}, ratio:{value:0}, attack:{value:0}, release:{value:0}, _to:[], connect(t){ this._to.push(t); } }; comps.push(c); return c; }
  resume(){ this.state = "running"; } suspend(){ this.state = "suspended"; }
}
let visHandler = null, hidden = false;
global.window = { AudioContext: StubCtx };
global.document = { hidden: false, addEventListener(e, fn){ if(e === "visibilitychange") visHandler = fn; } };
Object.defineProperty(global.document, "hidden", { get: () => hidden });
let timers = 0;
global.setInterval = () => (++timers, timers); global.clearInterval = () => { timers = Math.max(0, timers - 1); };

new Function(read("sound.js"))();
new Function(read("modes.js"))();
const S = global.window.Sound, MODES = global.window.MODES;
const VOL = 0.80;

S.unlock();
const master = gains[0];
ok(master && Math.abs(master.gain.value - VOL) < 1e-9, "master gain = VOL (" + (master && master.gain.value) + " = " + VOL + ")");
ok(VOL >= 0.7 && VOL <= 0.85, "VOL raised into the clearly-louder band 0.70–0.85 (" + VOL + ")");

// T98 — a brickwall limiter on master → limiter → destination guarantees no clip
ok(comps.length === 1, "exactly one DynamicsCompressor (the safety limiter) is created");
const lim = comps[0];
ok(master._to.includes(lim), "master routes into the limiter (not straight to destination)");
ok(lim._to.some(t => t && t._isDest), "the limiter routes to the destination (master → limiter → out)");
ok(!master._to.some(t => t && t._isDest), "master no longer connects directly to the destination (limiter is in-path)");
ok(lim.ratio.value >= 20 && lim.knee.value === 0, "the compressor is a brickwall LIMITER (ratio ≥ 20:1, hard knee)");
ok(lim.threshold.value < 0 && lim.threshold.value >= -3, "limiter threshold clamps just under 0 dBFS (" + lim.threshold.value + " dB)");
ok(lim.attack.value <= 0.005, "limiter attack is fast enough to catch transients (" + lim.attack.value + "s)");

// music: a balanced background gain, well under a single SFX voice but audible
S.setMusic(0);
ok(S.musicPlaying(), "music scheduler runs after setMusic");
const musicGain = gains.find((g, i) => i > 0 && g.gain.value > 0 && g.gain.value < 1);
ok(musicGain && Math.abs(musicGain.gain.value - 0.09) < 1e-9, "musicGain = 0.09 (balanced background)");
// worst-case master OUTPUT before the limiter: SFX ≲0.5 + music step ~1.5×0.09, × VOL.
// Even pre-limiter this stays < 1.0; the limiter then guarantees the final ceiling.
const worst = (0.5 + 1.5 * musicGain.gain.value) * VOL;
ok(worst < 1.0, "worst-case pre-limiter peak ≈ " + worst.toFixed(3) + " < 1.0 (the limiter is a backstop, not a crutch)");

// mute zeroes the master and stops music; unmute restores + resumes
S.setMuted(true);
ok(master.gain.value === 0, "mute sets master gain to 0");
ok(!S.musicPlaying(), "mute stops the music scheduler");
S.setMuted(false);
ok(Math.abs(master.gain.value - VOL) < 1e-9, "unmute restores master gain to VOL");
ok(S.musicPlaying(), "unmute resumes the music scheduler");

// visibility: hidden stops music + suspends; visible resumes
hidden = true; visHandler && visHandler();
ok(!S.musicPlaying(), "tab hidden stops the music scheduler");
hidden = false; visHandler && visHandler();
ok(S.musicPlaying(), "tab visible resumes the music scheduler");

// ---- T71: calmer tempos, distinct per-topic styles, an Arena theme ----
const overCap = S.STYLES.filter(s => s.bpm > 95);
ok(overCap.length === 0, "no style bpm exceeds 95 (max " + Math.max.apply(null, S.STYLES.map(s=>s.bpm)) + ")");
const busy = S.STYLES.filter(s => s.density > 0.4);
ok(busy.length === 0, "busy styles softened — every density ≤ 0.4 (max " + Math.max.apply(null, S.STYLES.map(s=>s.density)).toFixed(2) + ")");

// each of the 15 topics maps to a distinct topic style (no collisions)
const music = MODES.map(m => m.music);
ok(MODES.length === 15 && music.every(i => typeof i === "number" && i >= 0 && i < S.MENU_STYLE),
   "all 15 topics carry a topic-style index (0.." + (S.MENU_STYLE-1) + ")");
ok(new Set(music).size === 15, "all 15 topic styles are DISTINCT (no two share — " + new Set(music).size + " unique)");

// a dedicated Arena theme exists and is reachable via "arena"
ok(S.ARENA_STYLE !== S.MENU_STYLE && S.STYLES[S.ARENA_STYLE] && /arena/i.test(S.STYLES[S.ARENA_STYLE].name),
   "a dedicated Arena theme exists (" + (S.STYLES[S.ARENA_STYLE] && S.STYLES[S.ARENA_STYLE].name) + ")");
ok(S.styleIndexFor("arena") === S.ARENA_STYLE, "styleIndexFor('arena') → the Arena theme");
ok(S.styleIndexFor("menu") === S.MENU_STYLE, "styleIndexFor('menu') → the menu theme");
// a dedicated event theme exists (T81), reachable via "event", distinct + calm
ok(S.EVENT_STYLE !== S.MENU_STYLE && S.EVENT_STYLE !== S.ARENA_STYLE && S.STYLES[S.EVENT_STYLE],
   "a dedicated event theme exists, distinct from menu/arena (" + (S.STYLES[S.EVENT_STYLE] && S.STYLES[S.EVENT_STYLE].name) + ")");
ok(S.styleIndexFor("event") === S.EVENT_STYLE, "styleIndexFor('event') → the event theme");
ok(S.STYLES[S.EVENT_STYLE].bpm <= 95 && S.STYLES[S.EVENT_STYLE].density <= 0.4, "the event theme is calm (bpm ≤ 95, density ≤ 0.4)");

// main.js routes the Arena screen to the arena theme (not menu); voice cap intact
const mainSrc = read("main.js"), soundSrc = read("sound.js");
ok(/name === "arena"[\s\S]{0,60}setMusic\("arena"\)/.test(mainSrc), "main.js routes #arena to the Arena theme");
ok(/eventCtx \? "event"/.test(mainSrc), "main.js routes the event gauntlet to the event theme");
ok(/MAX_STEPS_PER_TICK\s*=\s*4/.test(soundSrc), "the T33 per-tick voice cap is unchanged");

console.log("\n" + (fails === 0 ? "ALL " + checks + " SOUND CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
