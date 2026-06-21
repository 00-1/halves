/* T69 — audio volume: master raised, music a balanced background, mute +
 * visibility behaviour intact. Drives window.Sound under a stub AudioContext.
 * Run: node test/sound.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

const gains = []; let oscCount = 0;
function gnode(){ const g = { value: 0, setValueAtTime(v){ this.value = v; }, exponentialRampToValueAtTime(){}, cancelScheduledValues(){}, linearRampToValueAtTime(){} };
  const node = { gain: g, connect(){} }; return node; }
class StubCtx {
  constructor(){ this.currentTime = 0; this.state = "running"; this.destination = {}; }
  createGain(){ const n = gnode(); gains.push(n); return n; }
  createOscillator(){ oscCount++; return { connect(){}, start(){}, stop(){}, type:"", frequency:{ value:0, setValueAtTime(){} } }; }
  resume(){ this.state = "running"; } suspend(){ this.state = "suspended"; }
}
let visHandler = null, hidden = false;
global.window = { AudioContext: StubCtx };
global.document = { hidden: false, addEventListener(e, fn){ if(e === "visibilitychange") visHandler = fn; } };
Object.defineProperty(global.document, "hidden", { get: () => hidden });
let timers = 0;
global.setInterval = () => (++timers, timers); global.clearInterval = () => { timers = Math.max(0, timers - 1); };

new Function(read("sound.js"))();
const S = global.window.Sound;
const VOL = 0.30;

S.unlock();
const master = gains[0];
ok(master && Math.abs(master.gain.value - VOL) < 1e-9, "master gain = VOL (" + (master && master.gain.value) + " = " + VOL + ")");
ok(VOL >= 0.28 && VOL <= 0.32, "VOL is in the clearly-louder band 0.28–0.32");

// music: a balanced background gain, well under a single SFX voice but audible
S.setMusic(0);
ok(S.musicPlaying(), "music scheduler runs after setMusic");
const musicGain = gains.find((g, i) => i > 0 && g.gain.value > 0 && g.gain.value < 1);
ok(musicGain && Math.abs(musicGain.gain.value - 0.09) < 1e-9, "musicGain = 0.09 (balanced background)");
// worst-case headroom: master input (SFX ≲0.5 + music step ~1.5×0.09) × VOL is well under 1
const worst = (0.5 + 1.5 * musicGain.gain.value) * VOL;
ok(worst <= 0.9, "worst-case output peak ≈ " + worst.toFixed(3) + " ≤ 0.9 (no clipping)");

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

console.log("\n" + (fails === 0 ? "ALL " + checks + " SOUND CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
