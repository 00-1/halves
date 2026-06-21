/* T110 — FX wiring pass 1: mount Builder-B's FXGL engine and make it VISIBLE.
 * The [A] wiring (this gate's subject) must: mount two controllers (a home
 * BACKDROP behind #start + a celebration BURST overlay on top), drive the
 * backdrop from REAL live state (collection progress + Momentum streak + today's
 * event) and animate it ONLY on the home screen (idle off-home, no RAF), and fire
 * a burst on the real reward-gain moments. Engine internals are Builder-B's
 * (test/fxgl.test.js); this proves the wiring, with a stub FXGL recording calls.
 * Run: node test/fx-wiring.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

const html = read("index.html"), css = read("styles.css"), main = read("main.js"), wf = read(".github/workflows/pages.yml");

// ---- (1) the engine is mounted: script + two canvases -----------------------
ok(/<script src="fxgl\.js"><\/script>/.test(html), "(1) index.html loads fxgl.js");
ok(html.indexOf("fxgl.js") < html.indexOf("main.js"), "(1) fxgl.js loads before main.js (the wiring can read window.FXGL)");
ok(/<canvas id="fxBackdrop"[^>]*class="fx-backdrop"[^>]*aria-hidden="true"/.test(html), "(1) a home BACKDROP canvas exists (aria-hidden)");
ok(/<canvas id="fxBurst"[^>]*class="fx-burst"[^>]*aria-hidden="true"/.test(html), "(1) a celebration BURST overlay canvas exists (aria-hidden)");
// backdrop is inside #start (home-scoped); burst is app-level (any screen)
const startBlock = html.slice(html.indexOf('id="start"'), html.indexOf('id="summary"'));
ok(/id="fxBackdrop"/.test(startBlock), "(1) the backdrop canvas sits inside #start (home-scoped)");
ok(!/id="fxBurst"/.test(startBlock), "(1) the burst overlay is app-level (not confined to #start)");

// ---- (2) CSS: backdrop BEHIND content, burst overlay on top, taps pass through
ok(/\.fx-backdrop\{[^}]*z-index:-1/.test(css), "(2) the backdrop sits behind the home DOM (z-index:-1)");
ok(/#start\{[^}]*isolation:isolate/.test(css), "(2) #start isolates a stacking context (so z-index:-1 stays behind its content, above the page)");
ok(/\.fx-backdrop\{[^}]*pointer-events:none/.test(css) && /\.fx-burst\{[^}]*pointer-events:none/.test(css), "(2) neither FX canvas intercepts taps");
ok(/\.fx-burst\{[^}]*position:fixed/.test(css) && /\.fx-burst\{[^}]*z-index:58/.test(css), "(2) the burst overlay is fixed, on top of the screens (under toasts/update-bar)");

// ---- (3) the wiring reads REAL sources (not constants) ----------------------
ok(/function homeFxState\(/.test(main), "(3) a homeFxState() builds the live backdrop state");
ok(/loadCollected\(\)/.test(main.slice(main.indexOf("function homeFxState"))) , "(3) homeFxState reads the real collection (progress)");
ok(/loadMomentum\(\)\.count/.test(main), "(3) homeFxState reads the real Momentum streak");
ok(/Ev\.today\(\)/.test(main.slice(main.indexOf("function homeFxState"))), "(3) homeFxState reads today's real event");
ok(/fxSetHome\(name === "start"\)/.test(main), "(3) show() animates the backdrop ONLY on the home screen");
ok(/fxCelebrate\(items\)/.test(main.slice(main.indexOf("function showUnlocks"), main.indexOf("function showUnlocks") + 260)), "(3) the burst fires from showUnlocks (every reward-gain path routes here)");

// ---- (4) the gates are registered in CI -------------------------------------
ok(/test\/fxgl\.test\.js/.test(wf), "(4) Builder-B's engine gate test/fxgl.test.js is registered in CI");
ok(/test\/fx-wiring\.test\.js/.test(wf), "(4) this wiring gate test/fx-wiring.test.js is registered in CI");

// ============ live boot: drive the wiring with a stub FXGL ===================
(function boot(){
  const fx = { homeStates: [], bursts: [], starts: 0, stops: 0, mounts: 0 };
  function Ctl(){ const c = {
    setHomeState(s){ fx.homeStates.push(s); return c; }, setScene(){ return c; },
    start(){ fx.starts++; return c; }, stop(){ fx.stops++; return c; },
    burst(o){ fx.bursts.push(o); return c; },
    isAnimating(){ return false; }, isBursting(){ return false; }, dispose(){ return c; } };
    return c; }

  let els = {}, store = {}, winH = {};
  function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
    parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, scrollHeight:400, scrollTop:0,
    classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
      toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
    addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
    appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
    querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; }, querySelectorAll(){ return []; }, closest(){ return null; },
    getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";}, set imageSmoothingEnabled(v){}, get imageSmoothingEnabled(){return false;} }; },
    get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }
  global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
  global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 390;
  global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = global.requestAnimationFrame;
  global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
  global.performance = { now: () => 1000 };
  global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
  global.setTimeout = (fn) => { if(typeof fn === "function") fn(); return 0; }; global.clearTimeout = () => {};
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  // the STUB engine — records what the wiring calls (engine internals are fxgl.test.js)
  global.window.FXGL = { Controller: function(){ fx.mounts++; return Ctl(); }, capabilities(){ return { webgl2:true, webgpu:false, reducedMotion:false }; } };
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  // load the data modules first, seed a FULL collection (so the Arena win grants
  // loot → showUnlocks → burst, and progress reads high), then boot main.js.
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js","eventart.js","fx.js","sound.js"].forEach(f => new Function(read(f))());
  const C = global.window.Collectibles;
  const full = {}; C.CATALOG.forEach(it => { if(it.cat !== "Loot") full[it.id] = { ts:1 }; });
  store["halves.collected"] = JSON.stringify(full);
  new Function(read("main.js"))();

  ok(fx.mounts === 2, "boot: the wiring mounts TWO controllers (backdrop + burst) — " + fx.mounts);

  const route = h => { global.window.location.hash = h; (winH.hashchange||[]).forEach(f=>f()); };
  // home → the backdrop is derived from live state and started
  route("#/");
  ok(fx.homeStates.length >= 1 && fx.starts >= 1, "boot: entering home derives the backdrop from live state + starts it");
  const st = fx.homeStates[fx.homeStates.length - 1];
  ok(st && typeof st.progress === "number" && st.progress >= 0 && st.progress <= 1, "boot: the state carries a real progress in [0,1] (" + (st && st.progress) + ")");
  ok(st && typeof st.streak === "number", "boot: the state carries a real numeric streak");
  ok(st && st.event && typeof st.event.seed === "number" && st.event.name, "boot: the state carries today's real event {seed,name}");
  ok(st.progress > 0, "boot: progress reflects the seeded full collection (not a constant 0)");

  // leave home → the backdrop idles (stop called, no ambient RAF off-home)
  const stopsBefore = fx.stops;
  route("#/arena");
  ok(fx.stops > stopsBefore, "boot: leaving home STOPS the backdrop (idle off-home, no RAF)");

  // win an Arena fight → showUnlocks → a celebration burst fires with real opts
  const heroId = (els.arenaBody._html.match(/data-hero="([^"]+)"/) || [])[1];
  ok(!!heroId, "boot: the Arena offers an unlocked hero");
  (els.arenaBody._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".arena-hero" ? { dataset:{ hero:heroId } } : null) } }));
  const burstsBefore = fx.bursts.length;
  (els.arenaFight._h.click||[]).forEach(f=>f({}));
  ok(fx.bursts.length > burstsBefore, "boot: a real reward gain (Arena win loot) fires a celebration burst");
  const b = fx.bursts[fx.bursts.length - 1];
  ok(b && typeof b.x === "number" && typeof b.y === "number" && b.count > 0 && b.seed, "boot: the burst carries {x,y,count,seed} (deterministic, positioned)");
  ok(b && (b.palette == null || Array.isArray(b.palette)), "boot: the burst palette is seeded from the gained items (array or default)");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " FX-WIRING CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
