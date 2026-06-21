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
// T136: the burst overlay is mounted on the Canvas2D backend; the backdrop is not.
ok(/\$\("fxBurst"\)[\s\S]{0,80}new FXGL\.Controller\(bu, \{ backend: "2d" \}\)/.test(main), "(1) T136: #fxBurst mounts with {backend:'2d'} (Canvas2D overlay)");
ok(/\$\("fxBackdrop"\)[\s\S]{0,60}new FXGL\.Controller\(bg, \{\}\)/.test(main), "(1) T136: #fxBackdrop stays on the default WebGL backend");
ok(html.indexOf("fxgl.js") < html.indexOf("main.js"), "(1) fxgl.js loads before main.js (the wiring can read window.FXGL)");
ok(/<canvas id="fxBackdrop"[^>]*class="fx-backdrop[^"]*"[^>]*aria-hidden="true"/.test(html), "(1) a full-bleed BACKDROP canvas exists (aria-hidden)");
ok(/<canvas id="fxBurst"[^>]*class="fx-burst"[^>]*aria-hidden="true"/.test(html), "(1) a celebration BURST overlay canvas exists (aria-hidden)");
// T112: the backdrop is now a full-bleed layer OUTSIDE #start (not clipped to the app box)
const startBlock = html.slice(html.indexOf('id="start"'), html.indexOf('id="summary"'));
ok(!/id="fxBackdrop"/.test(startBlock), "(1) the backdrop is full-bleed — NOT confined to #start (no dead FX margins)");
ok(html.indexOf('id="fxBackdrop"') < html.indexOf('class="app"'), "(1) the backdrop sits behind .app (a body-level full-viewport layer)");
ok(!/id="fxBurst"/.test(startBlock), "(1) the burst overlay is app-level (not confined to #start)");

// ---- (2) CSS: full-viewport backdrop behind .app, burst overlay on top -------
ok(/\.fx-backdrop\{[^}]*position:fixed/.test(css) && /\.fx-backdrop\{[^}]*z-index:-1/.test(css), "(2) the backdrop is a FIXED full-viewport layer behind .app (z-index:-1)");
ok(/\.fx-backdrop\{[^}]*100vw/.test(css) && /\.fx-backdrop\{[^}]*100dvh/.test(css), "(2) the backdrop fills the whole viewport (100vw × 100dvh — no dead margins)");
ok(/\.fx-backdrop\{[^}]*pointer-events:none/.test(css) && /\.fx-burst\{[^}]*pointer-events:none/.test(css), "(2) neither FX canvas intercepts taps");
ok(/\.fx-burst\{[^}]*position:fixed/.test(css) && /\.fx-burst\{[^}]*z-index:58/.test(css), "(2) the burst overlay is fixed, on top of the screens (under toasts/update-bar)");

// ---- (3) the wiring reads REAL sources (not constants) ----------------------
ok(/function homeFxState\(/.test(main), "(3) a homeFxState() builds the live backdrop state");
ok(/loadCollected\(\)/.test(main.slice(main.indexOf("function homeFxState"))) , "(3) homeFxState reads the real collection (progress)");
ok(/loadMomentum\(\)\.count/.test(main), "(3) homeFxState reads the real Momentum streak");
ok(/Ev\.today\(\)/.test(main.slice(main.indexOf("function homeFxState"))), "(3) homeFxState reads today's real event");
// T112: a live ARENA state from the real region/tier position
ok(/function arenaFxState\(/.test(main) && /currentTier\(loadCollected\(\)\)/.test(main) && /tierRegion\(/.test(main), "(3) arenaFxState() reads the live Arena region/tier (T108)");
ok(/setArenaState\(arenaFxState\(\)\)/.test(main), "(3) the Arena screen drives the backdrop with the live Arena scene");
ok(/fxSetScreen\(name\)/.test(main), "(3) show() drives the backdrop per screen (home / Arena / idle)");
ok(/fxCelebrate\(items\)/.test(main.slice(main.indexOf("function showUnlocks"), main.indexOf("function showUnlocks") + 260)), "(3) the reward burst fires from showUnlocks (every reward-gain path routes here)");
// T112: celebrate real WINS too (Arena victory + a rank-scaled round finish)
ok(/if\(res\.win\)\{[^}]*fxCelebrateWin\(tier\.n\)/.test(main), "(3) an Arena VICTORY fires a celebration burst");
ok(/fxCelebrateRank\(rankIdx\)/.test(main), "(3) EVERY completed topic run fires a rank-scaled celebration");
// ---- T125: the burst RENDERS (resize wiring) + fires BIG on EVERY moment -----
ok(!/FX_RANK_MIN/.test(main), "(T125) the FX_RANK_MIN 'decent run only' gate is GONE → every run celebrates");
ok(/function fxBigBurst\(opts\)\{[\s\S]{0,160}\.resize\(\)[\s\S]{0,140}\.celebrate\(opts\)/.test(main),
   "(T125) each celebration RESIZES the controller first, then fires FXGL.celebrate() (T126's big shower)");
ok(/window\.addEventListener\("resize", fxResizeAll\)/.test(main), "(T125) a window resize re-sizes the FX controllers");
ok(/fullscreenchange[\s\S]{0,90}fxResizeAll/.test(main), "(T125) the Start→fullscreen transition re-sizes the FX controllers (the rendering fix)");
ok(/function setupFx\([\s\S]{0,1000}fxResizeAll\(\)/.test(main), "(T125) the controllers are sized right after construction (not left 1×1)");
// the three celebration entry points all route through the resize-then-celebrate helper
["fxCelebrate","fxCelebrateRank","fxCelebrateWin"].forEach(fn =>
  ok(new RegExp("function " + fn + "\\([\\s\\S]{0,800}fxBigBurst\\(").test(main), "(T125) " + fn + "() routes through fxBigBurst (resize + big celebrate)"));

// ---- (4) the gates are registered in CI -------------------------------------
ok(/test\/fxgl\.test\.js/.test(wf), "(4) Builder-B's engine gate test/fxgl.test.js is registered in CI");
ok(/test\/fx-wiring\.test\.js/.test(wf), "(4) this wiring gate test/fx-wiring.test.js is registered in CI");

// ============ live boot: drive the wiring with a stub FXGL ===================
(function boot(){
  const fx = { homeStates: [], arenaStates: [], bursts: [], celebrates: [], starts: 0, stops: 0, mounts: 0, ctls: [], mountOpts: [] };
  // The stub models the DRAWING-BUFFER size (T125): resize() copies the CURRENT
  // viewport into the controller's buffer; burst()/celebrate() record the buffer
  // size AT FIRE TIME. So a celebration that fires without a fresh resize would be
  // caught drawing into a stale/1×1 buffer (the "nothing at all" bug).
  let viewport = { w: 1, h: 1 };   // entry/pre-fullscreen: no layout yet → 1×1
  function Ctl(){ const c = {
    ready: true, _w: 0, _h: 0, resizes: 0,
    setHomeState(s){ fx.homeStates.push(s); return c; }, setArenaState(s){ fx.arenaStates.push(s); return c; }, setScene(){ return c; },
    start(){ fx.starts++; return c; }, stop(){ fx.stops++; return c; },
    resize(){ c._w = viewport.w; c._h = viewport.h; c.resizes++; return c; },
    burst(o){ fx.bursts.push({ o: o, w: c._w, h: c._h, ctl: c }); return c; },
    celebrate(o){ fx.celebrates.push({ o: o, w: c._w, h: c._h, ctl: c }); return c; },
    isAnimating(){ return false; }, isBursting(){ return false; }, dispose(){ return c; } };
    fx.ctls.push(c); return c; }

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
  global.window.FXGL = { Controller: function(canvas, opts){ fx.mounts++; fx.mountOpts.push(opts || {}); return Ctl(); }, capabilities(){ return { webgl2:true, webgpu:false, reducedMotion:false }; } };
  let docH = {};
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(e,fn){ (docH[e]=docH[e]||[]).push(fn); }, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  // load the data modules first, seed a FULL collection (so the Arena win grants
  // loot → showUnlocks → burst, and progress reads high), then boot main.js.
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js","eventart.js","fx.js","sound.js"].forEach(f => new Function(read(f))());
  const C = global.window.Collectibles;
  const full = {}; C.CATALOG.forEach(it => { if(it.cat !== "Loot") full[it.id] = { ts:1 }; });
  store["halves.collected"] = JSON.stringify(full);
  new Function(read("main.js"))();

  ok(fx.mounts === 2, "boot: the wiring mounts TWO controllers (backdrop + burst) — " + fx.mounts);
  // T136 — the celebration overlay mounts with the Canvas2D backend (a 2D context
  // always presents on-device); the backdrop stays on its default WebGL path.
  ok((fx.mountOpts[0] || {}).backend !== "2d", "boot: T136 — the backdrop (#fxBackdrop) keeps its WebGL backend (the working first context)");
  ok((fx.mountOpts[1] || {}).backend === "2d", "boot: T136 — the burst overlay (#fxBurst) mounts with {backend:'2d'} (Canvas2D — always presents, no 2nd GL context)");

  // T125 — the RENDERING fix: both controllers are sized on construction, and the
  // Start→fullscreen viewport change re-sizes their buffers (no stale 1×1).
  ok(fx.ctls.length === 2 && fx.ctls.every(c => c.resizes >= 1), "boot: T125 — BOTH FX controllers are resize()d on construction (no stale 1×1 buffer)");
  viewport = { w: 412, h: 915 };                       // the Start→fullscreen viewport
  (docH.fullscreenchange||[]).forEach(f=>f());
  ok(fx.ctls.every(c => c._w === 412 && c._h === 915), "boot: T125 — the fullscreenchange handler re-sizes the buffers to the LIVE viewport (412×915, not 1×1)");

  const route = h => { global.window.location.hash = h; (winH.hashchange||[]).forEach(f=>f()); };
  // home → the backdrop is derived from live state and started
  route("#/");
  ok(fx.homeStates.length >= 1 && fx.starts >= 1, "boot: entering home derives the backdrop from live state + starts it");
  const st = fx.homeStates[fx.homeStates.length - 1];
  ok(st && typeof st.progress === "number" && st.progress >= 0 && st.progress <= 1, "boot: the state carries a real progress in [0,1] (" + (st && st.progress) + ")");
  ok(st && typeof st.streak === "number", "boot: the state carries a real numeric streak");
  ok(st && st.event && typeof st.event.seed === "number" && st.event.name, "boot: the state carries today's real event {seed,name}");
  ok(st.progress > 0, "boot: progress reflects the seeded full collection (not a constant 0)");

  // Arena → the backdrop switches to the live ARENA scene (T108), still running
  route("#/arena");
  ok(fx.arenaStates.length >= 1, "boot: entering the Arena derives the backdrop from the live Arena scene");
  const as = fx.arenaStates[fx.arenaStates.length - 1];
  ok(as && typeof as.region === "number" && typeof as.tier === "number", "boot: the Arena state carries a real region + tier (" + (as && as.region) + "/" + (as && as.tier) + ")");
  ok(as && "tierFrac" in as && "facingBoss" in as, "boot: the Arena state carries boss-proximity (tierFrac/facingBoss) for intensity");
  ok(!els.fxBackdrop.classList.contains("hidden"), "boot: the backdrop is VISIBLE on the Arena (full-bleed, not hidden)");

  // win an Arena fight → an Arena-victory celebration AND the reward-gain celebration
  const heroId = (els.arenaBody._html.match(/data-hero="([^"]+)"/) || [])[1];
  ok(!!heroId, "boot: the Arena offers an unlocked hero");
  (els.arenaBody._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".arena-hero" ? { dataset:{ hero:heroId } } : null) } }));
  const celebsBeforeWin = fx.celebrates.length;
  (els.arenaFight._h.click||[]).forEach(f=>f({}));
  ok(fx.celebrates.length > celebsBeforeWin, "boot: T125 — a real Arena WIN fires a BIG celebration (victory + loot), not a faint burst");
  const cw = fx.celebrates[fx.celebrates.length - 1];
  ok(cw && typeof cw.o.x === "number" && typeof cw.o.y === "number" && cw.o.count > 0 && cw.o.seed, "boot: the WIN celebration carries {x,y,count,seed} (deterministic, positioned)");
  ok(cw && cw.w > 1 && cw.h > 1, "boot: T125 — the WIN celebration fires on a correctly-sized controller (not 1×1) — " + (cw && cw.w) + "×" + (cw && cw.h));
  ok(cw && cw.o.count >= 400, "boot: T125 — it's a BIG shower (hundreds of particles; count " + (cw && cw.o.count) + ")");
  ok(cw && (cw.o.palette == null || Array.isArray(cw.o.palette)), "boot: the WIN celebration palette is seeded (array or default)");

  // finish a TOPIC RUN — even SKIP-everything (worst rank) STILL celebrates now (the
  // FX_RANK_MIN gate is gone), on a correctly-sized controller.
  route("#/");
  function padPress(k){ (els.pad._h.click||[]).forEach(f => f({ target:{ closest:s => (s === ".key" ? { dataset:{ k:String(k) } } : null) } })); }
  const celebsBeforeRun = fx.celebrates.length;
  (els.startBtn._h.click||[]).forEach(f=>f({}));        // start a normal round on the default topic
  let guard = 0;
  while(fx.celebrates.length === celebsBeforeRun && guard++ < 80) padPress("skip");
  ok(fx.celebrates.length > celebsBeforeRun, "boot: T125 — finishing a topic run (even a SKIP-everything worst rank) STILL fires a celebration (gate removed)");
  const cr = fx.celebrates[fx.celebrates.length - 1];
  ok(cr && cr.w > 1 && cr.h > 1, "boot: T125 — the RUN celebration fires on a correctly-sized controller (not 1×1) — " + (cr && cr.w) + "×" + (cr && cr.h));
  ok(cr && cr.o.count > 0, "boot: the RUN celebration is a real shower (count " + (cr && cr.o.count) + ")");

  // leave to a NON-fx screen → the backdrop idles + hides (no RAF off home/Arena)
  const stopsBefore = fx.stops;
  route("#/best-times");
  ok(fx.stops > stopsBefore, "boot: leaving home/Arena STOPS the backdrop (idle, no RAF)");
  ok(els.fxBackdrop.classList.contains("hidden"), "boot: the backdrop is HIDDEN off home/Arena (no stale scene bleeding behind other screens)");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " FX-WIRING CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
