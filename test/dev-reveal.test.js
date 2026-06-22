/* T184 — DEVELOPER MODE from the menu (absorbs T180 reveal-all). Dev mode is enabled
 * WITHOUT editing URLs: tap the build pill ~7× → persisted `halves.dev`. It surfaces a
 * "Developer" link in Setup and the dev tools, including a VIEW-ONLY "reveal all
 * collections" toggle (`halves.devReveal`) that shows every collection (heroes /
 * inventory / Codex) unlocked for art review — never persisted. `?dev` stays a
 * fallback. Boots main.js under a DOM shim in several states and compares renders.
 * Run: node test/dev-reveal.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

const mainSrc = read("main.js"), html = read("index.html"), wf = read(".github/workflows/pages.yml");

// ---- (1) static wiring -------------------------------------------------------
ok(/let devMode =[\s\S]{0,180}halves\.dev/.test(mainSrc), "(1) devMode reads ?dev OR the persisted halves.dev flag");
ok(/let devReveal =[\s\S]{0,120}halves\.devReveal/.test(mainSrc), "(1) a persisted reveal-all toggle (halves.devReveal)");
ok(/function devFullCol\(\)/.test(mainSrc) && /function viewCol\(\)\{ return \(devMode && devReveal\)/.test(mainSrc), "(1) viewCol() reveals all ONLY when dev mode AND reveal-all are on");
ok(/function setDevMode\(on\)/.test(mainSrc) && /localStorage\.setItem\("halves\.dev"/.test(mainSrc), "(1) setDevMode persists the flag");
ok(/\$\("buildInfo"\)[\s\S]{0,400}\+\+taps >= 7/.test(mainSrc), "(1) the build pill is the menu enabler (~7 taps toggle dev mode)");
ok(/function isFeatureUnlocked\(id\)\{ return !!\(devMode/.test(mainSrc), "(1) dev mode opens the gated screens (view-only)");
["function renderInventory\\(\\)\\{\\s*const col = viewCol", "function renderInvTab\\(\\)\\{\\s*const col = viewCol",
 "function renderHeroes[\\s\\S]{0,120}const col = viewCol", "function renderHeroDetail[\\s\\S]{0,120}col = viewCol"]
  .forEach((re, i) => ok(new RegExp(re).test(mainSrc), "(1) render path #" + (i+1) + " reads viewCol()"));
ok(/class="set-row hidden" id="openGraphics"/.test(html), "(1) the Setup Developer link starts hidden (revealed only in dev mode)");
ok(/id="devRevealRow"/.test(html) && /id="devRevealBtn"/.test(html), "(1) a reveal-all toggle row exists in the Developer section");
ok(/test\/dev-reveal\.test\.js/.test(wf), "(1) this gate is registered in CI");

// ---- boot harness ------------------------------------------------------------
let els, store, winH;
function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
  parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, scrollHeight:400, scrollTop:0,
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
    toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
  addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
  appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
  querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; }, querySelectorAll(){ return []; }, closest(){ return null; },
  getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";}, set imageSmoothingEnabled(v){}, get imageSmoothingEnabled(){return false;} }; },
  get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }
function boot(search, seed){
  els = {}; winH = {}; store = {};
  if(seed) Object.keys(seed).forEach(k => store[k] = seed[k]);
  global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
  global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  global.window.location = { hash:"", search:search || "" }; global.location = global.window.location; global.window.innerWidth = 390;
  global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = global.requestAnimationFrame;
  global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
  let t = 1000; global.performance = { now: () => (t += 100) };   // +100ms per call → taps land inside the 1500ms window
  global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
  global.setTimeout = () => 0; global.clearTimeout = () => {};
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js","eventart.js","main.js"].forEach(f => new Function(read(f))());
  return global.window;
}
function route(h){ global.window.location.hash = h; (winH.hashchange||[]).forEach(f=>f()); }
function switchTab(t){ (els.invTabs._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".inv-tab" ? { dataset:{ tab:t } } : null) } })); }
function tapBuild(n){ for(let i = 0; i < n; i++) (els.buildInfo._h.click||[]).forEach(f=>f({})); }

// probe to pick a few real item ids for the control's small collection
let W = boot("");
const C = W.Collectibles, Hs = W.Heroes;
const someOwned = {}; C.modeItems("halves").slice(0, 3).forEach(it => someOwned[it.id] = 1);
const SMALL = { "halves.unlocked": JSON.stringify({ legacy: 1 }), "halves.collected": JSON.stringify(someOwned) };

// ---- (2) control: dev OFF → the real (small) collection, mostly locked --------
W = boot("", SMALL);
route("#/inventory");
ok(/^3 \//.test(els.invMeta.textContent), "(2) dev OFF → inventory shows only the real (3) collected (" + els.invMeta.textContent + ")");
ok(/inv-cell locked/.test(els.invList._html), "(2) dev OFF → Topics has locked tiles");
route("#/heroes");
ok(+(els.heroMeta.textContent.split("/")[0]) < Hs.HEROES.length, "(2) dev OFF → not all heroes unlocked (" + els.heroMeta.textContent + ")");

// ---- (3) dev ON via the persisted flag + reveal ON → everything revealed -------
W = boot("", { "halves.dev": "1", "halves.devReveal": "1" });
route("#/inventory");
ok(els.invMeta.textContent === C.CATALOG.length + " / " + C.CATALOG.length, "(3) menu dev + reveal → inventory shows ALL (" + els.invMeta.textContent + ") — no URL needed");
ok(!/inv-cell locked/.test(els.invList._html), "(3) reveal → no locked tiles");
switchTab("codex");
ok(!/\?\?\?/.test(els.invList._html), "(3) reveal → the Codex is fully discovered (no ??? silhouettes)");
route("#/heroes");
ok(els.heroMeta.textContent === Hs.HEROES.length + " / " + Hs.HEROES.length, "(3) reveal → ALL heroes unlocked (" + els.heroMeta.textContent + ")");
ok(store["halves.collected"] == null, "(3) reveal-all is VIEW-ONLY — the real collection is never written");

// ---- (4) dev ON but reveal OFF → real collection, yet screens reachable --------
W = boot("", { "halves.dev": "1" });          // devReveal defaults OFF
route("#/inventory");
ok(/^0 \//.test(els.invMeta.textContent), "(4) dev on, reveal OFF → the REAL (empty) collection shows, not revealed (" + els.invMeta.textContent + ")");
ok(!els.openGraphics.classList.contains("hidden"), "(4) dev mode reveals the Setup ▸ Developer link");
(els.devRevealBtn._h.click||[]).forEach(f=>f({}));
ok(store["halves.devReveal"] === "1", "(4) the reveal toggle persists halves.devReveal");
route("#/inventory");
ok(els.invMeta.textContent === C.CATALOG.length + " / " + C.CATALOG.length, "(4) after toggling reveal ON → inventory now shows ALL (" + els.invMeta.textContent + ")");

// ---- (5) enable dev mode from the MENU: 7 taps on the build pill ---------------
W = boot("", null);                            // genuinely fresh: no dev, no ?dev
ok(els.openGraphics.classList.contains("hidden"), "(5) fresh profile → the Developer link is hidden");
ok(store["halves.dev"] == null, "(5) fresh → no persisted dev flag");
tapBuild(7);
ok(store["halves.dev"] === "1", "(5) tapping the build pill 7× ENABLES dev mode (persists halves.dev) — no URL");
ok(!els.openGraphics.classList.contains("hidden"), "(5) …and reveals the Setup ▸ Developer link immediately");
tapBuild(7);
ok(store["halves.dev"] === "0", "(5) another 7 taps toggles dev mode back OFF");

// ---- (6) ?dev still works as a fallback ---------------------------------------
W = boot("?dev", null);
ok(!els.openGraphics.classList.contains("hidden"), "(6) the ?dev URL fallback still enables dev mode");

console.log("\n" + (fails === 0 ? "ALL " + checks + " DEV-MODE CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
