/* T54 + T161 — the build marker is an ABSOLUTE marker of the RUNNING code.
 * The pill + the update check read the EXECUTING bundle's own version from
 * main.js's `?v=<sha>` (injected by the T107 cachebust), NOT from build.json
 * (which is only the LATEST-deployed sha + the "ago" time). So:
 *   - the pill shows the RUNNING sha (two clients on different cached bundles show
 *     DIFFERENT numbers — the bug that made live review untrustworthy);
 *   - the Update bar fires when RUNNING_V != build.json's sha (running stale), and
 *     does NOT fire when they match;
 *   - no `?v=` (local/dev) → "local build" + the poll is a no-op.
 * Run: node test/version.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }
const flush = async () => { for(let i=0;i<6;i++) await Promise.resolve(); };

function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false, scrollTop:0,
  parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48,
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, toggle(c,f){ const h=this._s.has(c); if(f===undefined){h?this._s.delete(c):this._s.add(c);return !h;} f?this._s.add(c):this._s.delete(c); return !!f; }, contains(c){return this._s.has(c);} },
  addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
  appendChild(){}, insertBefore(){}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
  querySelector(){ return null; }, querySelectorAll(){ return []; }, closest(){ return null; },
  getContext(){ return { clearRect(){}, fillRect(){} }; },
  get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }

// boot main.js with a controllable build.json fetch + an optional running ?v=<sha>.
function boot(runningV){
  const ctx = { els:{}, store:{}, winH:{}, reloaded:false, fetchCount:0, failFetch:false,
    nextBuild:{ sha:"deploy1", shortSha:"deploy1", time:new Date().toISOString() } };
  global.window = {}; global.window.addEventListener = (e,f) => { (ctx.winH[e]=ctx.winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
  global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  global.window.location = { hash:"", reload(){ ctx.reloaded = true; } }; global.location = global.window.location; global.window.innerWidth = 390;
  global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = () => 1; global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = () => {};
  global.performance = { now: () => Date.now() };
  global.CSS = { escape:s=>s };
  global.fetch = () => { ctx.fetchCount++; return ctx.failFetch ? Promise.reject(new Error("offline")) : Promise.resolve({ ok:true, json: () => Promise.resolve(JSON.parse(JSON.stringify(ctx.nextBuild))) }); };
  global.setInterval = () => 0; global.clearInterval = () => {};   // intervals not fired (we call check() directly)
  global.localStorage = { getItem:k => k in ctx.store ? ctx.store[k] : null, setItem:(k,v)=>{ ctx.store[k]=String(v); }, removeItem:k=>{ delete ctx.store[k]; } };
  global.window.localStorage = global.localStorage;
  global.document = { getElementById(id){ return ctx.els[id] || (ctx.els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    // T161: main.js reads its own running version from document.currentScript's ?v=
    currentScript: runningV ? { src: "https://app.example/main.js?v=" + runningV } : { src: "https://app.example/main.js" },
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","main.js"].forEach(f => new Function(read(f))());
  return ctx;
}

(async function(){
  // ---- (1) the pill = the RUNNING version, not build.json's latest ------------
  let c = boot("run111");
  c.nextBuild = { sha:"run111", shortSha:"run111", time:new Date().toISOString() };
  await flush();
  const U = global.window.Updater;
  const bar = global.document.getElementById("updateBar"); bar.classList.add("hidden");   // mirror the initial HTML state
  ok(U && typeof U.check === "function", "window.Updater is exposed");
  ok(U.running() === "run111", "the RUNNING version comes from main.js's ?v= (" + U.running() + "), not build.json");
  ok(/run111/.test(c.els.buildInfo._html), "the build pill shows the RUNNING sha");

  // running == latest deployed → no update surfaced
  c.nextBuild = { sha:"run111", shortSha:"run111", time:new Date().toISOString() };
  U.check(); await flush();
  ok(U.shown() === false && bar.classList.contains("hidden"), "running == latest → no Update bar");

  // ---- (2) a NEWER deploy than the running bundle fires the Update bar --------
  c.nextBuild = { sha:"deploy222", shortSha:"deploy2", time:new Date().toISOString() };
  U.check(); await flush();
  ok(U.shown() === true && bar.classList.contains("hidden") === false, "running != latest deployed → the Update bar appears (the safety net that was broken)");
  // …and the pill STILL shows the running sha, NOT the fetched newer one (T161 core)
  ok(/run111/.test(c.els.buildInfo._html) && !/deploy2/.test(c.els.buildInfo._html), "the pill keeps the RUNNING sha even after fetching a newer build.json (marker = running code)");

  // refresh is user-initiated only
  ok(c.reloaded === false, "no auto-reload happened");
  (c.els.updateRefresh._h.click||[]).forEach(f=>f({}));
  ok(c.reloaded === true, "clicking Refresh reloads (onto fresh ?v= assets)");
  (c.els.updateDismiss._h.click||[]).forEach(f=>f({}));
  ok(bar.classList.contains("hidden"), "Dismiss hides the bar");

  // offline poll is swallowed (no throw)
  c.failFetch = true; const before = c.fetchCount; let threw = false;
  try{ U.check(); await flush(); }catch(e){ threw = true; }
  ok(!threw && c.fetchCount > before, "a failed poll is swallowed (no throw)");

  // ---- (3) local/dev build (no ?v=) → 'local build' + the poll is a no-op -----
  c = boot(null); await flush();
  const U2 = global.window.Updater;
  ok(U2.running() === null, "no ?v= → there is no running marker (local build)");
  ok(c.els.buildInfo._text === "local build" || /local build/.test(c.els.buildInfo._html || ""), "the pill reads 'local build' with no ?v=");
  const f0 = c.fetchCount; U2.check(); await flush();
  ok(c.fetchCount === f0, "local build → the version check is a no-op (no fetch)");

  console.log("\n" + (fails === 0 ? "ALL " + checks + " VERSION CHECKS PASSED" : fails + "/" + checks + " FAILED"));
  process.exit(fails ? 1 : 0);
})();
