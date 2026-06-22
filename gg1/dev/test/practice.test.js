/* T49 — Practice flow (DOM shim): the button is gated like Start, the hint is
 * hidden behind a tap-to-reveal toggle (normal rounds show neither), and the
 * topic guide renders beneath the question list.
 * Run: node test/practice.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

let els = {}, store = {}, winH = {};
function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
  parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, scrollHeight:400, scrollTop:0,
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
    toggle(c,f){ let r; if(f===undefined){ if(this._s.has(c)){this._s.delete(c);r=false;}else{this._s.add(c);r=true;} } else { f?this._s.add(c):this._s.delete(c); r=!!f; } return r; }, contains(c){return this._s.has(c);} },
  addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
  appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
  querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; }, querySelectorAll(){ return []; }, closest(){ return null; },
  getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";} }; },
  get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }
global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 390;
global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = global.requestAnimationFrame;
global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
global.performance = { now: () => Date.now() };
global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
global.window.localStorage = global.localStorage;
global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
  addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
  documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","main.js"].forEach(f => new Function(read(f))());
const M = global.window.MODES;
const fire = (el, ev, arg) => (el._h[ev]||[]).forEach(f=>f(arg||{}));

// helper: select a topic by clicking its tree node (T96 — tree-only home picker)
function selectMode(id){ fire(els.modeTree, "click", { target:{ closest:s => (s===".tnode" ? { dataset:{ mode:id } } : null) } }); }

// ---- (1) Practice button gated like Start ----------------------------------
selectMode("halves");
ok(els.startBtn.disabled === false && els.practiceBtn.disabled === false, "unlocked topic: Start + Practice both enabled");
const locked = M.find(m => !global.window.Collectibles && false) || M.find((m,i) => i > 0);
selectMode(locked.id);
// a freshly-profiled player has only the first topic unlocked → later topics lock both
ok(els.startBtn.disabled === els.practiceBtn.disabled, "Practice button shares Start's locked/enabled state (" + locked.id + ")");

// ---- (2) openPractice renders the grid + guide, gated by unlock -------------
selectMode("halves");
fire(els.practiceBtn, "click");
ok(els.practice.classList.contains("active"), "Practice button opens the Practice screen");
ok(els.practiceGrid._html.indexOf("pq-tile") >= 0, "practice grid lists the questions");
ok(els.practiceGuide._html.indexOf("g-intro") >= 0 && els.practiceGuide._html.indexOf("g-tips") >= 0,
   "topic guide (intro + tips) renders beneath the list");

// ---- (3) hint hidden by default, toggle reveals; normal round shows neither -
const q = M.find(m=>m.id==="halves").build().find(x=>String(x.p)==="5");
fire(els.practiceGrid, "click", { target:{ closest:s => (s===".pq-tile" ? { dataset:{ mode:"halves", prompt:"5" } } : null) } });
ok(els.game.classList.contains("active"), "tapping a question starts a practice attempt (game screen)");
ok(els.practiceHintToggle.classList.contains("hidden") === false, "the 'How to approach this' toggle is shown in practice");
ok(els.practiceNote.classList.contains("hidden") === true, "the method note is HIDDEN by default");
ok(els.practiceNote._text.length > 0 && els.practiceNote._text.indexOf("2.5") < 0, "note holds the method (answer-free) once a question is up");
fire(els.practiceHintToggle, "click");
ok(els.practiceNote.classList.contains("hidden") === false, "tapping the toggle reveals the method note");
ok(/Hide/.test(els.practiceHintToggle._text), "toggle label flips to a hide affordance");

// a NORMAL round now ALSO offers the hint (T63): toggle shown, note hidden by default
fire(els.startBtn, "click");
ok(els.practiceHintToggle.classList.contains("hidden") === false, "normal round: the hint toggle is shown (T63)");
ok(els.practiceNote.classList.contains("hidden") === true, "normal round: the note is hidden by default");
ok(els.practiceNote._text.length > 0, "normal round: the note holds the question's method");

console.log("\n" + (fails === 0 ? "ALL " + checks + " PRACTICE CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
