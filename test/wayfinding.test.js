/* T68 — Arena wayfinding: region/position header, boss-marked pips, boss-next
 * flag, a journey map of all regions, and a region-clear moment. All computed
 * from the Enemies region helpers (structure-agnostic; verified at 120 = 10×12).
 * Run: node test/wayfinding.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

let els, store, winH;
function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false, scrollTop:0,
  parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48,
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, toggle(c,f){ const h=this._s.has(c); if(f===undefined){h?this._s.delete(c):this._s.add(c);return !h;} f?this._s.add(c):this._s.delete(c); return !!f; }, contains(c){return this._s.has(c);} },
  addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
  appendChild(){}, insertBefore(){}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
  querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; }, querySelectorAll(){ return []; }, closest(){ return null; },
  getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";} }; },
  get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }
function boot(seed){
  els = {}; winH = {}; store = {};
  if(seed) store["halves.collected"] = JSON.stringify(seed);
  global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
  global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 390;
  global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = () => 1;
  global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = () => {};
  global.performance = { now: () => Date.now() };
  global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  ["modes.js","guides.js","collectibles.js","heroes.js","enemies.js","main.js"].forEach(f => new Function(read(f))());
  global.window.location.hash = "#/arena"; (winH.hashchange||[]).forEach(f=>f());
  return global.window;
}
const clearedThrough = n => { const o = {}; for(let i=1;i<=n;i++) o["tier:"+i] = 1; return o; };

// --- penultimate tier of region 0 (tier 11/12): boss is NEXT ---
boot(clearedThrough(10));   // currentTier = 11
let h = els.arenaBody._html;
ok(/Goblin Warren · region 1\/10 · tier 11\/12/.test(h), "region header: name + region N/10 + tier pos/size");
ok(/at-pip/.test(h) && (h.match(/at-pip done/g)||[]).length === 10, "10 cleared pips + a current pip in the region");
ok(/at-pip boss/.test(h), "the boss tier is a distinctly-marked pip");
ok(/Boss next:\s*Goblin King/.test(h), "boss-next is flagged with the boss's name");

// --- the boss tier itself (tier 12/12): facing the boss now ---
boot(clearedThrough(11));   // currentTier = 12
h = els.arenaBody._html;
ok(/region 1\/10 · tier 12\/12/.test(h), "at the boss tier, position reads 12/12");
ok(/Region boss — defeat Goblin King/.test(h), "facing-the-boss banner names the boss + region");

// --- region boundary (tier 13 → region 2, pos 1/12) ---
boot(clearedThrough(12));   // currentTier = 13
h = els.arenaBody._html;
ok(/Gallowmarch · region 2\/10 · tier 1\/12/.test(h), "crossing a region boundary updates region + resets position");

// --- journey map overview: all 10 regions with status + boss landmarks ---
(els.arenaBody._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".arena-map-btn" ? {} : null) } }));
h = els.arenaBody._html;
ok((h.match(/map-row/g)||[]).length === 10, "journey map lists all 10 regions");
ok(/map-row done[\s\S]*?Goblin Warren[\s\S]*?conquered/.test(h), "a beaten region shows as conquered (Goblin Warren)");
ok(/map-row cur[\s\S]*?Gallowmarch[\s\S]*?you are here/.test(h), "the current region shows 'you are here' (Gallowmarch)");
ok(/Void Sovereign/.test(h), "locked-ahead regions are teased by their boss landmark (The Void Sovereign)");

// --- region-clear moment: beating a region boss names the next region ---
const C0 = boot(clearedThrough(11)).Collectibles;   // currentTier = 12 (boss), full drill set owned
const full = clearedThrough(11); C0.CATALOG.forEach(it => { if(it.cat !== "Loot") full[it.id] = 1; });
boot(full);   // re-boot with full drill collection + tiers 1..11 → currentTier = 12 (winnable boss)
const heroId = (els.arenaBody._html.match(/data-hero="([^"]+)"/) || [])[1];
ok(!!heroId, "a hero is available to fight the boss");
(els.arenaBody._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".arena-hero" ? { dataset:{ hero:heroId } } : null) } }));
(els.arenaFight._h.click||[]).forEach(f=>f({}));
ok(/Region conquered! Next:\s*Gallowmarch/.test(els.arenaBody._html), "beating the region boss shows a region-clear moment naming the next region");

console.log("\n" + (fails === 0 ? "ALL " + checks + " WAYFINDING CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
