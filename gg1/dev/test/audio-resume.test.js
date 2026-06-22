/* T159 — the foghorn on AudioContext resume (app-switch / cold start). Backgrounding
 * the PWA suspends the shared AudioContext; returning must NOT schedule music into a
 * still-suspended/garbage context (that surviving voice/reverb tail is the drone).
 * Boots main.js with a controllable suspended→running ctx + stub Synth and proves:
 *   (a) on hide → the scheduler is STOPPED;
 *   (b) on return → it STOPS first (clean slate), RESUMES the ctx, and re-syncs the
 *       music ONLY after the ctx is actually running — nothing is scheduled while
 *       suspended;
 *   (c) the resume is IDEMPOTENT — a re-entrant return while a resume is in flight
 *       does NOT stack a second resume / duplicate start;
 *   (d) musicForScreen has a running-context guard (no schedule into a suspended ctx).
 * Run: node test/audio-resume.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }
const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };

const sy = { mounts:0, stops:0, contexts:[], muted:null };
let resumeCalls = 0, resolver = null;
function gnode(){ return { gain:{ value:0 }, connect(){}, disconnect(){} }; }
const fakeCtx = { state:"running", sampleRate:48000, currentTime:0, createGain:gnode,
  resume(){ resumeCalls++; return new Promise(res => { resolver = () => { fakeCtx.state = "running"; res(); }; }); },
  suspend(){ fakeCtx.state = "suspended"; } };

global.window = {}; const winH = {}, docH = {}; let els = {}, store = {};
global.window.Synth = {
  mount(){ sy.mounts++; return this; }, output(){ return { connect(){}, disconnect(){} }; },
  start(){ return this; }, stop(){ sy.stops++; return this; }, intensity(){ return this; },
  play(){ return this; }, duck(){ return this; }, setMuted(m){ sy.muted = m; return this; },
  sting(){ return this; }, swapNow(){ return this; }, setReverb(){ return this; },
  setContext(name){ sy.contexts.push(name); return this; },   // a setContext == a music (re)start
  musicPlaying(){ return false; },
  CONTEXTS: { menu:{}, lofi:{}, arena:{}, bigroom:{} }, hashStr(){ return 1; }
};
global.window.Sound = {
  unlock(){}, ctx(){ return fakeCtx; }, master(){ return gnode(); }, setMuted(){}, setVolume(){},
  setSfxVolume(){}, getVolume(){ return 0.8; }, VOL_MAX:4, SFX_MAX:1, isMuted(){ return false; },
  correct(){}, skip(){}, item(){}, gold(){}, topicUnlock(){}, mastery(){}, topic100(){}, roundStart(){}, roundComplete(){}, play(){}, sfxSpec(){ return { v:[] }; }
};
function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
  parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, clientHeight:300, scrollHeight:400, scrollTop:0,
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
  addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
  appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
  querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; }, querySelectorAll(){ return []; }, closest(){ return null; },
  getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";} }; },
  get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }
global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 390;
global.requestAnimationFrame = (fn) => { if(typeof fn === "function") fn(); return 1; }; global.window.requestAnimationFrame = global.requestAnimationFrame;
global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
global.performance = { now: () => 1000 };
global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
global.setTimeout = (fn) => { if(typeof fn === "function") fn(); return 0; }; global.clearTimeout = () => {};
store["halves.unlocked"] = JSON.stringify({ legacy:1 });
global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
global.window.localStorage = global.localStorage;
global.document = { hidden:false, getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
  addEventListener(e,f){ (docH[e]=docH[e]||[]).push(f); }, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
  documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };

const fireVis = () => (docH.visibilitychange||[]).forEach(f=>f({}));

(async function(){
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","main.js"].forEach(f => new Function(read(f))());
  // the entry gesture (tap) runs the deferred warmAudio → first music start
  (els.entryPlay._h.click||[]).forEach(f=>f({})); await flush();
  ok(sy.contexts.length >= 1, "boot: the entry gesture starts music once (ctx running) — " + sy.contexts.length);

  // ---- (a) hide → the scheduler is stopped --------------------------------
  const stopsBefore = sy.stops;
  global.document.hidden = true; fireVis();
  ok(sy.stops > stopsBefore, "(a) backgrounding (hidden) STOPS the music scheduler");

  // ---- (b) return from a SUSPENDED ctx → stop, resume, re-sync only when running
  fakeCtx.state = "suspended"; resumeCalls = 0; resolver = null;
  const ctxBefore = sy.contexts.length, stopsB = sy.stops;
  global.document.hidden = false; fireVis(); await flush();
  ok(sy.stops > stopsB, "(b) on return the scheduler is STOPPED first (drop any surviving tail before re-sync)");
  ok(resumeCalls === 1, "(b) on return the ctx is RESUMED");
  ok(sy.contexts.length === ctxBefore, "(b) music is NOT started while the ctx is still suspended (no schedule into a bad context = no foghorn)");
  // ---- (c) idempotent: a re-entrant return while resuming does not stack -----
  const rc = resumeCalls; fireVis(); await flush();
  ok(resumeCalls === rc, "(c) a re-entrant return while a resume is in flight is a NO-OP (no duplicate resume/start)");
  // now the resume resolves → the ctx is running → music re-syncs exactly once
  resolver(); await flush();
  ok(sy.contexts.length === ctxBefore + 1, "(b/c) music re-syncs ONCE, only AFTER the ctx is running (" + (sy.contexts.length - ctxBefore) + ")");

  // ---- (d) the running-context guard lives in musicForScreen ----------------
  const main = read("main.js");
  ok(/function musicForScreen\([\s\S]{0,400}state === "suspended"[\s\S]{0,40}return/.test(main), "(d) musicForScreen bails on a suspended / sampleRate-0 context (never schedules the foghorn)");
  ok(/function audioCtx\(/.test(main) && /state === "running" && c\.sampleRate !== 0/.test(main), "(d) a running-context guard (audioCtx/ctxRunning) gates the music start");
  ok(/visibilitychange[\s\S]{0,500}resyncMusic\(\)/.test(main), "(d) the visibility-resume path uses resyncMusic (clean stop + guarded restart)");

  console.log("\n" + (fails === 0 ? "ALL " + checks + " AUDIO-RESUME CHECKS PASSED" : fails + "/" + checks + " FAILED"));
  process.exit(fails ? 1 : 0);
})();
