/* T50 — procedural icons on menu buttons + hero portraits in the Arena.
 *   (1) each of the 4 menu buttons (#statsBtn/#invBtn/#heroesBtn/#arenaBtn) draws a
 *       stable procedural icon — a real category preset + a fixed "menu:" seed id;
 *   (2) the Arena pick cards each emit a hero-portrait canvas, and the result
 *       header emits the chosen hero's portrait, drawn with the SAME call the
 *       Heroes screen uses ("hero:"+id, HERO_PAL[type]).
 * Run: node test/nav-icons.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// (1a) markup: index.html gives each of the four buttons a canvas
const html = read("index.html");
["statsBtn","invBtn","heroesBtn","arenaBtn"].forEach(id => {
  ok(new RegExp('id="' + id + '"[^>]*>\\s*<canvas').test(html), id + " has a <canvas> before its label");
});

let els = {}, store = {}, winH = {}, draws = [];
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

// load engine, then PATCH drawIcon to record calls BEFORE main.js captures it
["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js"].forEach(f => new Function(read(f))());
const C = global.window.Collectibles;
const realDraw = C.drawIcon.bind(C);
C.drawIcon = (cv, id, pal, cat) => { draws.push({ id, cat, pal }); /* skip real paint (shim canvas) */ };
// seed a full collection so the Arena has an unlocked hero to portray
const full = {}; C.CATALOG.forEach(it => { if(it.cat !== "Loot") full[it.id] = { ts:1 }; });
store["halves.collected"] = JSON.stringify(full);
new Function(read("main.js"))();

// (1b) the four menu icons were drawn with a real category + a fixed "menu:" id
const VALID_CATS = new Set(C.CATEGORIES.map(c => c.id));
[["statsBtn","scroll"],["invBtn","chest"],["heroesBtn","helm"],["arenaBtn","sword"]].forEach(([id,cat]) => {
  const d = draws.find(x => x.id === "menu:" + id);
  ok(!!d, id + " drew a procedural icon (id menu:" + id + ")");
  ok(d && d.cat === cat && VALID_CATS.has(cat), id + " uses the real '" + cat + "' category preset");
});

// (2) Arena pick cards + result header emit hero portraits
const route = h => { global.window.location.hash = h; (winH.hashchange||[]).forEach(f=>f()); };
route("#/arena");
const body = els.arenaBody._html;
const heroId = (body.match(/data-hero="([^"]+)"/) || [])[1];
ok(body.indexOf("ah-port") >= 0, "Arena pick cards include a portrait canvas");
ok(!!heroId, "a hero card is offered");
// pick the hero + fight → result header should carry the chosen hero's portrait
(els.arenaBody._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".arena-hero" ? { dataset:{ hero:heroId } } : null) } }));
(els.arenaFight._h.click||[]).forEach(f=>f({}));
// T90: the Fight now plays out turn-by-turn — skip to the result card
(els.arenaBody._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".bp-skip" ? {} : null) } }));
const res = els.arenaBody._html;
ok(/ar-port/.test(res) && new RegExp('ar-port[^>]*data-hero="' + heroId + '"').test(res),
   "result header shows the chosen hero's portrait (" + heroId + ")");

// (2b) the Arena draw path matches the Heroes screen: "hero:"+id with HERO_PAL
const src = read("main.js");
ok(/arena-hero canvas[\s\S]*?C\.drawIcon\(cv, "hero:"\+h\.id, HERO_PAL\[h\.type\]/.test(src),
   "Arena pick portraits use the same call as the Heroes screen");

console.log("\n" + (fails === 0 ? "ALL " + checks + " NAV-ICON CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
