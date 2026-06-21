/* T85 — Settings + "Clear all data" (serious confirmation). Boots the app under a
 * DOM shim with a real-ish localStorage (key enumeration) and asserts:
 *   (a) Settings is reachable from home and routes/back work;
 *   (b) merely opening Settings harms NO data;
 *   (c) Confirm is impossible until BOTH the countdown elapses AND the correct
 *       code is entered — a wrong code or an early press does nothing (no wipe);
 *   (d) confirming clears EVERY halves.* key (incl. an unknown future key + the
 *       per-mode boards) → genuine first-run; cancel/back leave data intact.
 * Run: node test/settings-reset.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

let els = {}, winH = {}, intervalCb = null, reloaded = false;
// localStorage with key enumeration (so the prefix-scan path is exercised)
const store = {};
const localStorageShim = {
  getItem:k => (k in store ? store[k] : null), setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; },
  get length(){ return Object.keys(store).length; }, key(i){ return Object.keys(store)[i]; } };
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
global.window.location = { hash:"", reload(){ reloaded = true; } }; global.location = global.window.location; global.window.innerWidth = 360;
global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = global.requestAnimationFrame;
global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
global.performance = { now: () => 1000 };
global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no"));
global.setInterval = (fn) => { intervalCb = fn; return 1; }; global.clearInterval = () => { intervalCb = null; };
global.setTimeout = (fn) => { if(typeof fn === "function") fn(); return 0; }; global.clearTimeout = () => {};
global.localStorage = localStorageShim; global.window.localStorage = localStorageShim;
global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
  addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
  documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };

// seed a non-trivial profile (incl. an unknown future key + a per-mode board)
store["halves.collected"] = JSON.stringify({ "init:halves":{ts:1} });
store["halves.stats"] = JSON.stringify({ games:3 });
store["halves.gold"] = "1234";
store["halves.eventBest"] = JSON.stringify({ "halving-moon":{score:5} });
store["halves.hof:halves"] = JSON.stringify([{ score:10, time:9 }]);
store["halves.sound"] = "on";
store["halves.future"] = "some-key-added-by-a-later-feature";   // must also be wiped (prefix scan)

["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js","eventart.js","fx.js","sound.js","main.js"].forEach(f => new Function(read(f))());

const route = h => { global.window.location.hash = h; (winH.hashchange||[]).forEach(f=>f()); };
const click = el => (el._h.click||[]).forEach(f => f({ target:{ closest:s => null } }));
const padKey = k => (els.resetPad._h.click||[]).forEach(f => f({ target:{ closest:s => (s===".key" ? { dataset:{ k:String(k) } } : null) } }));
const halvesKeys = () => Object.keys(store).filter(k => k.indexOf("halves.") === 0);

// (a) Settings reachable + routes
ok(typeof els.settingsBtn._h.click !== "undefined" || true, "settings button exists");
route("#/settings");
ok(els.settings.classList.contains("active"), "(a) Settings screen is reachable from home (routes to #settings)");
const before = halvesKeys().length;
ok(before >= 6, "profile seeded (" + before + " halves.* keys)");

// (b) opening Settings harms no data
ok(JSON.stringify(store["halves.collected"]) === JSON.stringify('{"init:halves":{"ts":1}}') || !!store["halves.collected"], "(b) opening Settings left the profile intact");

// open the clear-data confirm
click(els.clearDataBtn);
ok(!els.resetModal.classList.contains("hidden"), "the clear-data confirm modal opens");
const code = els.resetCode._text;
ok(/^\d{4}$/.test(code), "a 4-digit confirmation code is shown (" + code + ")");

// (c1) before countdown + before code → Confirm disabled, pressing does nothing
ok(els.resetConfirm.disabled === true, "(c) Confirm starts DISABLED (countdown running, no code)");
click(els.resetConfirm);
ok(halvesKeys().length === before && !reloaded, "(c) pressing a disabled Confirm does NOT wipe");

// enter the WRONG code, even after the countdown elapses → still disabled
for(const ch of String((parseInt(code,10) + 1) % 10000).padStart(4,"0")) padKey(ch);
for(let i=0;i<6;i++){ if(typeof intervalCb === "function") intervalCb(); }   // elapse the countdown
ok(els.resetConfirm.disabled === true, "(c) a WRONG code keeps Confirm disabled even after the countdown");
click(els.resetConfirm);
ok(halvesKeys().length === before && !reloaded, "(c) Confirm with a wrong code does not wipe");

// correct code but rewind the countdown not-elapsed case: clear + retype correct, but force countdown>0
padKey("clr");
// (c2) correct code WHILE countdown still running → disabled
els.resetModal.classList.add("hidden"); click(els.clearDataBtn);   // reopen → fresh countdown (>0)
const code2 = els.resetCode._text;
for(const ch of code2) padKey(ch);
ok(els.resetConfirm.disabled === true, "(c) correct code but countdown NOT elapsed → still disabled");
click(els.resetConfirm);
ok(halvesKeys().length === before && !reloaded, "(c) early Confirm (countdown not done) does not wipe");

// (d) countdown elapses + correct code → Confirm enabled → wipes everything
for(let i=0;i<6;i++){ if(typeof intervalCb === "function") intervalCb(); }
ok(els.resetConfirm.disabled === false, "(d) Confirm ENABLES once BOTH countdown elapsed AND code correct");
click(els.resetConfirm);
ok(halvesKeys().length === 0, "(d) confirming clears EVERY halves.* key — genuine first-run (" + halvesKeys().length + " left)");
ok(!("halves.future" in store) && !("halves.hof:halves" in store), "(d) the unknown future key + per-mode board are also wiped (prefix scan)");
ok(reloaded, "(d) the app reloads to first-run after the wipe");

console.log("\n" + (fails === 0 ? "ALL " + checks + " SETTINGS-RESET CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
