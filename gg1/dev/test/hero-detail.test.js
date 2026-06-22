/* T67 — hero detail view: tapping an unlocked hero card opens a detail with the
 * big portrait, full stats, the COMPLETE owned boost list (untruncated), and an
 * X/Y collected summary; the list card itself is compact (no "+N more" cut-off).
 * Run: node test/hero-detail.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

let els = {}, store = {}, winH = {}, draws = [];
function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, className:"", disabled:false,
  width:64, height:64, scrollTop:0, parentElement:{ clientWidth:300, dataset:{} },
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, toggle(c,f){ const h=this._s.has(c); if(f===undefined){h?this._s.delete(c):this._s.add(c);return !h;} f?this._s.add(c):this._s.delete(c); return !!f; }, contains(c){return this._s.has(c);} },
  addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
  appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
  querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; }, querySelectorAll(){ return []; }, closest(){ return null; },
  getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";} }; },
  get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }
global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 390;
global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = global.requestAnimationFrame;
global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = () => {};
global.performance = { now: () => Date.now() };
global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
global.window.localStorage = global.localStorage;
global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
  addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
  documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js"].forEach(f => new Function(read(f))());
const C = global.window.Collectibles, H = global.window.Heroes;
// pick a hero with many boosts; own a known subset so X/Y is checkable
const hero = H.HEROES[0];
const all = C.CATALOG.filter(it => it.boost && it.boost.hero === hero.id);
ok(all.length >= 40, hero.id + " has a long boost list (" + all.length + " total)");
const ownIds = all.slice(0, 17).map(it => it.id);
const owned = {}; ownIds.forEach(id => owned[id] = { ts:1 });
// also own an init so the hero is unlocked (bram unlocks on first init)
owned["init:halves"] = { ts:1 };
store["halves.collected"] = JSON.stringify(owned);
// patch drawIcon to record the portrait draw
const realDraw = C.drawIcon; C.drawIcon = (cv, id, pal, cat) => { draws.push({ id, cat }); };
new Function(read("main.js"))();

const route = h => { global.window.location.hash = h; (winH.hashchange||[]).forEach(f=>f()); };

// open the Heroes list, then tap the hero card → detail route
route("#/heroes");
ok(els.heroes.classList.contains("active"), "Heroes list shown");
ok(els.heroList._html.indexOf("tap for details") >= 0, "list card is compact ('tap for details', no +N chips overflow)");
ok(els.heroList._html.indexOf("more</span>") < 0, "list card no longer shows a '+N more' cut-off");
// simulate tapping the unlocked hero card
(els.heroList._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".hero-card.unlocked" ? { dataset:{ hero:hero.id } } : null) } }));
ok(/#\/hero\//.test(global.window.location.hash), "tapping a hero card routes to #/hero/<id> (" + global.window.location.hash + ")");
(winH.hashchange||[]).forEach(f=>f());   // browser would fire hashchange → applyRoute

// the detail screen
ok(els.heroDetail.classList.contains("active"), "hero detail screen is shown");
const list = els.hdList._html;
const rows = (list.match(/hd-boost/g) || []).length;
ok(rows === ownIds.length, "the FULL owned boost list renders, untruncated (" + rows + " = " + ownIds.length + ")");
ok(list.indexOf("more") < 0, "no '+N more' truncation in the detail list");
ok(els.hdProg._text === ownIds.length + " / " + all.length + " boosts collected", "X/Y summary matches real counts (" + els.hdProg._text + ")");
ok(els.hdStats._html.indexOf("PWR") >= 0 && els.hdStats._html.indexOf("FOC") >= 0, "full stats (PWR…FOC) shown");
ok(draws.some(d => d.id === "hero:" + hero.id), "portrait drawn via the T51 hero path (hero:" + hero.id + ")");

// Back returns to the Heroes list
(els.hdBack._h.click||[]).forEach(f=>f({}));
route(global.window.location.hash);
ok(els.heroes.classList.contains("active"), "Back returns to the Heroes list");

// a locked/unknown hero id falls back to the list (no crash)
route("#/hero/zzz_nope");
ok(global.window.location.hash === "#/heroes", "unknown hero id falls back to the Heroes list");

console.log("\n" + (fails === 0 ? "ALL " + checks + " HERO-DETAIL CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
