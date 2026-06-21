/* T54 — version check + Update button: poll build.json, surface a manual refresh
 * when the deployed sha changes; same sha / offline = no-op; reload only on click.
 * Run: node test/version.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }
const flush = async () => { for(let i=0;i<6;i++) await Promise.resolve(); };

let els = {}, store = {}, winH = {}, reloaded = false;
let nextBuild = { sha:"AAA", shortSha:"AAA", time:new Date().toISOString() }, failFetch = false, fetchCount = 0;
function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false, scrollTop:0,
  parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48,
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, toggle(c,f){ const h=this._s.has(c); if(f===undefined){h?this._s.delete(c):this._s.add(c);return !h;} f?this._s.add(c):this._s.delete(c); return !!f; }, contains(c){return this._s.has(c);} },
  addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
  appendChild(){}, insertBefore(){}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
  querySelector(){ return null; }, querySelectorAll(){ return []; }, closest(){ return null; },
  getContext(){ return { clearRect(){}, fillRect(){} }; },
  get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }
global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
global.window.location = { hash:"", reload(){ reloaded = true; } }; global.location = global.window.location; global.window.innerWidth = 390;
global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = () => 1; global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = () => {};
global.performance = { now: () => Date.now() };
global.CSS = { escape:s=>s };
global.fetch = () => { fetchCount++; return failFetch ? Promise.reject(new Error("offline")) : Promise.resolve({ ok:true, json: () => Promise.resolve(JSON.parse(JSON.stringify(nextBuild))) }); };
global.setInterval = () => 0; global.clearInterval = () => {};   // intervals not fired in this test (we call check() directly)
global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
global.window.localStorage = global.localStorage;
global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
  addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
  documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };

(async function(){
  ["modes.js","guides.js","collectibles.js","heroes.js","enemies.js","main.js"].forEach(f => new Function(read(f))());
  const U = global.window.Updater;
  const bar = global.document.getElementById("updateBar");
  bar.classList.add("hidden");   // mirror the initial HTML state
  await flush();   // let the boot build.json fetch settle (bootSha := "AAA")

  ok(U && typeof U.check === "function", "window.Updater is exposed");
  ok(U.bootSha() === "AAA", "the booted sha is recorded from build.json (" + U.bootSha() + ")");

  // same sha → no update surfaced
  nextBuild.sha = "AAA";
  U.check(); await flush();
  ok(U.shown() === false && els.updateBar.classList.contains("hidden"), "identical sha shows nothing");

  // newer sha → the Update bar appears
  nextBuild.sha = "BBB";
  U.check(); await flush();
  ok(U.shown() === true && els.updateBar.classList.contains("hidden") === false, "a newer sha surfaces the Update bar");

  // refresh is user-initiated only — clicking it reloads
  ok(reloaded === false, "no auto-reload happened");
  (els.updateRefresh._h.click||[]).forEach(f=>f({}));
  ok(reloaded === true, "clicking Refresh triggers location.reload()");

  // dismiss hides it and it won't nag again
  (els.updateDismiss._h.click||[]).forEach(f=>f({}));
  ok(els.updateBar.classList.contains("hidden"), "Dismiss hides the bar");

  // offline / 404 fetch is swallowed (no throw, no surface) — fresh boot for clarity
  failFetch = true; const before = fetchCount;
  let threw = false; try{ U.check(); await flush(); }catch(e){ threw = true; }
  ok(!threw && fetchCount > before, "a failed poll is swallowed (no throw)");

  // local build (no sha) → the poll is a no-op (doesn't even fetch)
  U.setBoot(null); failFetch = false; const f2 = fetchCount;
  U.check(); await flush();
  ok(fetchCount === f2, "no bootSha (local build) → version check is a no-op");

  console.log("\n" + (fails === 0 ? "ALL " + checks + " VERSION CHECKS PASSED" : fails + "/" + checks + " FAILED"));
  process.exit(fails ? 1 : 0);
})();
