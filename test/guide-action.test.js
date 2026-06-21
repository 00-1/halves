/* T83 — the topic guide is a first-class action (Play · Practice · Guide).
 * Boots the app under a DOM shim and asserts:
 *   (a) a #guideBtn sits at the same level as Start/Practice (in .start-actions);
 *   (b) selecting a topic WITH a guide enables it; clicking opens the guide modal;
 *   (c) a topic WITHOUT a guide disables it (mirrors Start/Practice gating);
 *   (d) a LOCKED topic is selectable (preview) and its guide still opens via the
 *       button — Start/Practice stay disabled (locked), Guide stays enabled;
 *   (e) the old per-row "?" (.mr-guide) is gone — no orphan markup/handlers/CSS.
 * Run: node test/guide-action.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

let els = {}, store = {}, winH = {};
function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
  parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, scrollHeight:400, scrollTop:0,
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
    toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
  addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
  appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
  querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; }, querySelectorAll(){ return []; }, closest(){ return null; },
  getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";} }; },
  get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }

global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 360;
global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = global.requestAnimationFrame;
global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
global.performance = { now: () => 1000 };
global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
global.setTimeout = (fn) => { if(typeof fn === "function") fn(); return 0; }; global.clearTimeout = () => {};
global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
global.window.localStorage = global.localStorage;
global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
  addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
  documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js","eventart.js","fx.js","sound.js","main.js"].forEach(f => new Function(read(f))());

const MODES = global.window.MODES, G = global.window.Guides;
const clickRow = id => (els.modeTabs._h.click||[]).forEach(f => f({ target:{ closest:s => (s===".mode-row" ? { dataset:{ mode:id }, classList:{ contains:()=>false } } : null) } }));

// (a) #guideBtn is a peer of Start/Practice in .start-actions
const html = read("index.html");
ok(/<div class="start-actions">[\s\S]*id="startBtn"[\s\S]*id="practiceBtn"[\s\S]*id="guideBtn"[\s\S]*<\/div>/.test(html),
   "Guide is a peer button alongside Start + Practice in .start-actions");

// an unlocked topic with a guide (halves is always unlocked + has a guide)
const halves = MODES[0];
ok(G.has(halves.id), "the first topic has a guide (precondition)");
clickRow(halves.id);
ok(els.guideBtn.disabled === false, "(b) selecting a topic with a guide ENABLES the Guide button");
ok(els.startBtn.disabled === false && els.practiceBtn.disabled === false, "Start + Practice enabled for the unlocked topic");
// clicking opens the guide modal
els.guideModal.classList.add("hidden");
(els.guideBtn._h.click||[]).forEach(f => f({}));
ok(!els.guideModal.classList.contains("hidden"), "(b) clicking Guide opens the guide modal for the selected topic");
// modal still closes
(els.guideClose._h.click||[]).forEach(f => f({}));
ok(els.guideModal.classList.contains("hidden"), "the guide modal still closes (guideClose intact)");

// (d) a LOCKED topic is selectable for preview; its guide still opens; Start/Practice gated.
// On a fresh profile anything with unlockedBy/requires is locked (only halves is open).
const lockedTopic = MODES.find(m => m.unlockedBy || m.requires);
clickRow(lockedTopic.id);
ok(els.startBtn.disabled === true && els.practiceBtn.disabled === true, "(d) a locked topic keeps Start + Practice DISABLED");
ok(els.guideBtn.disabled === false, "(d) a locked topic is selectable and its Guide stays ENABLED (preview)");
els.guideModal.classList.add("hidden");
(els.guideBtn._h.click||[]).forEach(f => f({}));
ok(!els.guideModal.classList.contains("hidden"), "(d) the locked topic's guide still opens via the button (no preview lost)");
(els.guideClose._h.click||[]).forEach(f => f({}));

// (c) a topic WITHOUT a guide disables the button (override Guides.has, re-select)
const realHas = G.has;
G.has = id => false;
clickRow(halves.id);
ok(els.guideBtn.disabled === true, "(c) a topic with no guide DISABLES the Guide button (mirrors Start/Practice gating)");
G.has = realHas;

// (e) the old per-row "?" is gone — no orphan markup/handlers/CSS
const main = read("main.js"), css = read("styles.css");
ok(!/mr-guide|data-guide|dataset\.guide/.test(main) && !/mr-guide/.test(html) && !/\.mr-guide/.test(css),
   "(e) the per-row '?' (.mr-guide) is fully removed — no orphan refs");

console.log("\n" + (fails === 0 ? "ALL " + checks + " GUIDE-ACTION CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
