/* T48 — inventory layout regression (no browser).
 * Boots the app under a DOM shim, opens the inventory, and on EVERY tab asserts:
 *   - one progress-bar block at the very top (tp-row bars inside .topic-prog);
 *   - item tiles (.inv-cell in .inv-grid) below — Topics included (the regression);
 *   - NO section bar beside its tiles (every tp-bar precedes every inv-grid);
 *   - owned tiles carry a <canvas>; bar counts match owned/total per section;
 *   - lazy-render: Loot tiles only appear once the Loot tab is opened.
 * Run: node test/inventory.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

let els, store = {}, winH;
function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
  parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, scrollHeight:400, scrollTop:0,
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
    toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
  addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
  appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
  querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; },
  querySelectorAll(s){ return []; }, closest(){ return null; },
  getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";} }; },
  get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }

// Fresh DOM environment + a clean boot of all scripts (memCollected resets with
// each fresh main.js closure, so a store seeded *before* boot is honoured).
function boot(){
  els = {}; winH = {};
  global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
  global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 390;
  global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = global.requestAnimationFrame;
  global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
  global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","main.js"].forEach(f => new Function(read(f))());
  return global.window.Collectibles;
}

// probe boot to pick item ids, seed owned, then a fresh boot reads the seed
let C = boot();
const owned = {};
C.modeItems("halves").slice(0, 3).forEach(it => owned[it.id] = 1);
const firstAward = C.CATALOG.filter(it => C.categories().includes(it.cat) && it.cat !== "Loot")[0];
const firstLoot = C.CATALOG.filter(it => it.cat === "Loot")[0];
if(firstAward) owned[firstAward.id] = 1;
if(firstLoot) owned[firstLoot.id] = 1;
store["halves.collected"] = JSON.stringify(owned);
C = boot();

const tabEv = t => ({ target:{ closest:s => (s===".inv-tab" ? { dataset:{ tab:t } } : null) } });
function openInventory(){ global.window.location.hash = "#/inventory"; (winH.hashchange||[]).forEach(f=>f()); }
function switchTab(t){ (els.invTabs._h.click||[]).forEach(f=>f(tabEv(t))); }
function html(){ return els.invList._html; }

// shared structural assertions for the current tab html
function assertTab(name, h){
  const firstProg = h.indexOf('class="topic-prog"');
  const firstGrid = h.indexOf('class="inv-grid"');
  const progCount = (h.match(/class="topic-prog"/g) || []).length;
  const lastBar = h.lastIndexOf('class="tp-bar"');
  ok(firstProg >= 0, name + ": has a top progress block");
  ok(progCount === 1, name + ": exactly ONE progress block (" + progCount + ")");
  ok(firstGrid >= 0, name + ": has item tiles (inv-grid present)");
  ok(h.indexOf('class="inv-cell') >= 0, name + ": renders inv-cell tiles");
  ok(firstProg < firstGrid, name + ": bar block sits ABOVE the tiles");
  ok(lastBar >= 0 && lastBar < firstGrid, name + ": NO bar beside tiles (every tp-bar precedes the tiles)");
}

openInventory();
let h = html();
assertTab("Topics", h);
ok((h.match(/class="inv-cell owned/g)||[]).length >= 3, "Topics: owned tiles present (regression fixed)");
ok(h.indexOf("<canvas") >= 0, "Topics: owned tiles carry a canvas to draw");
ok(h.indexOf("· tiers ") < 0, "Topics: lazy — no Loot region tiles built");

switchTab("awards"); h = html();
assertTab("Awards", h);
ok(h.indexOf("· tiers ") < 0, "Awards: lazy — no Loot region tiles built");

switchTab("loot"); h = html();
assertTab("Loot", h);
ok(h.indexOf("· tiers ") >= 0, "Loot: region sections present (only when opened)");

// bar count == owned/total per section, checked on the Topics tab (halves seeded 3 owned)
switchTab("topics"); h = html();
const halvesTotal = C.modeItems("halves").length;
ok(h.indexOf(">3/" + halvesTotal + "<") >= 0, "Topics: Halves bar shows 3/" + halvesTotal + " (matches seeded owned)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " INVENTORY CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
