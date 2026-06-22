/* T173 — GOLD HOARD wiring ([A], over B's T172 fxgl engine). The wiring must:
 *   (a) drive a VISUAL hoard level into homeFxState via a saturating curve over
 *       lifetime gold (GOLD_FULL ≈ the owner's one dial); early gold shows a small
 *       pile, big totals plateau (the NUMBER keeps exploding past it — T178);
 *   (b) on banking gold, fire B's earnBurst (spinning coins) from the earn-point,
 *       count SCALED by the gain via a log/capped curve — past the cap, juice not
 *       count (a tier + wider spread + a brighter palette);
 *   (c) a Graphics-menu hoard tester (preview the mound fill + the coin burst);
 *   (d) a `?gold=<n>` dev setter (preview the pile at any wealth on the live build).
 * Pure curves are exposed on window.Gold; the wiring is proven by booting main.js
 * with a stub FXGL recording setHomeState + earnBurst (engine internals = fxgl.test).
 * Run: node test/hoard-wiring.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

const main = read("main.js"), html = read("index.html"), wf = read("../../.github/workflows/pages.yml");

// ---- (1) static wiring -------------------------------------------------------
ok(/const GOLD_EMPTY = 500, GOLD_FULL = 1e15/.test(main), "(1) T198: GOLD_EMPTY (floor) + GOLD_FULL (the owner's dial) constants");
ok(/function hoardLevel\(gold\)\{[\s\S]{0,180}\(Math\.log10\(1 \+ gold\) - HOARD_LO\) \/ HOARD_SPAN/.test(main), "(1) T198: hoardLevel() is a floor-offset log curve (gentle, visible starter)");
// homeFxState carries the hoard level (alongside the fixed-purple T153 contract)
ok(/hoard:\s*hoardLevel\(loadGold\(\)\)/.test(main.slice(main.indexOf("function homeFxState"), main.indexOf("function arenaFxState"))), "(1) homeFxState feeds hoard: hoardLevel(loadGold()) into the backdrop");
// the earn burst fires from the gold readout, scaled by the gain
ok(/function fxEarnBurst\(srcEl, amount\)/.test(main), "(1) a fxEarnBurst(srcEl, amount) helper exists");
ok(/typeof fxBurst\.burst !== "function"/.test(main), "(1) fxEarnBurst guards on B's burst hook (no-op if absent)");
ok(/function showGold\([\s\S]{0,260}fxEarnBurst\(el, earned\)/.test(main), "(1) showGold fires the coin earn-burst from the gold readout when earned > 0");
// T173 follow-up #1: a STANDALONE outward burst (no converge to the pile) — the
// earn-burst fires fxBurst.burst() and carries NO tx/ty target.
(function(){ const body = main.slice(main.indexOf("function fxEarnBurst"), main.indexOf("function fxEarnBurst") + 600);
  ok(/fxBurst\.burst\(\{/.test(body), "(1) the earn burst uses the ballistic burst() (flies OUT + fades)");
  ok(!/tx:/.test(body) && !/ty:/.test(body), "(1) the earn burst no longer converges to the hoard (no tx/ty target)"); })();
// T173 follow-up #2: the dev gold-setter is GATED behind ?dev
ok(/gold=\(\[0-9\.eE\+\]\+\)/.test(main) && /parseFloat\(m\[1\]\)/.test(main), "(1) a ?gold=<n> dev setter seeds the gold total (parseFloat → 1e9 etc.)");
ok(/let devMode =[\s\S]{0,160}urlHasDev\(\)[\s\S]{0,80}halves\.dev/.test(main), "(1) T184: devMode = ?dev OR the persisted halves.dev flag");
(function(){ const body = main.slice(main.indexOf("function devGoldParam"), main.indexOf("function devGoldParam") + 300);
  ok(/if\(!devMode\) return;/.test(body), "(1) the URL gold-setter is GATED behind dev mode (inert without it)"); })();
// T182 — the Graphics-menu gold-setter really SETS the counter + is dev-gated
ok(/function setDevGold\(v\)\{[\s\S]{0,120}if\(!devMode\) return;[\s\S]{0,260}saveGold\(amount\)/.test(main), "(1) T182: setDevGold() is dev-gated and calls the real saveGold()");
ok(/dg\.classList\.toggle\("hidden", !devMode\)/.test(main), "(1) T182: the gold-setter row is hidden unless dev mode");
// the Graphics-menu hoard tester
ok(/id="hoardTest"/.test(html) && /aria-labelledby="hoardTestLabel"/.test(html), "(1) a labelled hoard-tester group lives in the Graphics menu");
["0.2","0.5","1","earn"].forEach(v => ok(new RegExp('data-hoard="' + v.replace(".", "\\.") + '"').test(html), "(1) the hoard tester offers the '" + v + "' preview"));
ok(/function fireHoardTest\(v\)/.test(main), "(1) fireHoardTest(v) wires the tester buttons");
ok(/test\/hoard-wiring\.test\.js/.test(wf), "(1) this gate is registered in CI");
// the tester lives in #graphics, not #audio (a VISUAL test — matches the T147 rule)
(function(){ const ai = html.indexOf('id="audio"'), gi = html.indexOf('id="graphics"');
  ok(gi > ai && !/id="hoardTest"/.test(html.slice(ai, gi)) && /id="hoardTest"/.test(html.slice(gi)), "(1) the hoard tester is in the #graphics menu (not #audio)"); })();

// ---- (2) the pure curves (exposed on window.Gold) ----------------------------
global.window = {};
global.document = { createElement(){ return { getContext(){ return {}; } }; } };
["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js"].forEach(f => new Function(read(f))());
// a minimal DOM/env so main.js boots and exposes window.Gold
let store = {};
global.window.addEventListener = () => {}; global.window.removeEventListener = () => {};
global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
global.window.location = { hash:"", search:"" }; global.location = global.window.location; global.window.innerWidth = 390; global.window.innerHeight = 844;
global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = () => 1; global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = () => {};
global.performance = { now: () => 1000 }; global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no"));
global.setInterval = () => 0; global.clearInterval = () => {}; global.setTimeout = () => 0; global.clearTimeout = () => {};
global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
global.window.localStorage = global.localStorage;
function mkEl(){ const e = { _h:{}, dataset:{}, style:{}, classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} f?this._s.add(c):this._s.delete(c); return !!f; }, contains(c){return this._s.has(c);} },
  addEventListener(ev,fn){ (this._h[ev]=this._h[ev]||[]).push(fn); }, removeEventListener(){}, appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
  querySelector(){ return null; }, querySelectorAll(){ return []; }, closest(){ return null; }, getBoundingClientRect(){ return { left:40, top:100, width:80, height:60, right:120, bottom:160 }; },
  getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";}, set imageSmoothingEnabled(v){}, get imageSmoothingEnabled(){return false;} }; },
  get innerHTML(){return this._html||"";}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text||"";}, set textContent(v){this._text=String(v);}, width:48, height:48, parentElement:{ clientWidth:300, dataset:{} } }; return e; }
let els = {};
global.document.getElementById = id => els[id] || (els[id] = mkEl());
global.document.createElement = () => mkEl();
global.document.addEventListener = () => {}; global.document.removeEventListener = () => {};
global.document.querySelector = () => null; global.document.querySelectorAll = () => [];
global.document.documentElement = mkEl(); global.document.body = mkEl(); global.document.fullscreenElement = null;
global.navigator = { standalone:false }; global.window.navigator = global.navigator;
// a stub FXGL that records setHomeState + earnBurst
const rec = { homeStates: [], earns: [] };
function Ctl(){ const c = { ready:true, _w:412, _h:915,
  setHomeState(s){ rec.homeStates.push(s); return c; }, setArenaState(){ return c; }, setScene(){ return c; },
  start(){ return c; }, stop(){ return c; }, resize(){ return c; },
  burst(o){ rec.earns.push(o); return c; }, celebrate(o){ rec.earns.push(o); return c; }, earnBurst(o){ rec.earns.push(o); return c; },
  isAnimating(){ return false; }, isBursting(){ return false; }, dispose(){ return c; }, dimensions(){ return { w:412, h:915 }; }, isReady(){ return true; } };
  return c; }
global.window.FXGL = { Controller: function(){ return Ctl(); }, capabilities(){ return { webgl2:true, webgpu:false, reducedMotion:false }; } };

// seed a large lifetime-gold total BEFORE boot (memGold caches on first load)
store["halves.gold"] = String(5e9);
new Function(read("main.js"))();
const G = global.window.Gold;
ok(!!G && typeof G.hoardLevel === "function", "(2) window.Gold exposes hoardLevel + earnBurstSpec");
ok(G.GOLD_FULL === 1e15 && G.GOLD_EMPTY === 500, "(2) T198: GOLD_FULL is the dial (1e15) with a GOLD_EMPTY floor (500)");
ok(G.hoardLevel(0) === 0 && G.hoardLevel(G.GOLD_FULL) === 1 && G.hoardLevel(1e20) === 1, "(2) hoardLevel: 0 at no gold, 1 at GOLD_FULL, clamped past it");
// T182 — the pile is VISIBLE from the very start: a real first-day ~1.2K player shows a mound
ok(G.hoardLevel(1e3) > 0.01 && G.hoardLevel(1e3) < 0.05, "(2) T198: at ~1K gold the pile is a SMALL but visible starter (" + (G.hoardLevel(1e3)*100).toFixed(1) + "%, owner wanted ~2.5% — was ~25% before)");
// monotone non-decreasing across the wealth range
(function(){ const xs = [0, 1e3, 1e6, 1e8, 1e9, 1e10, 1e12], ys = xs.map(G.hoardLevel); let mono = true; for(let i=1;i<ys.length;i++) if(ys[i] < ys[i-1]) mono = false;
  ok(mono, "(2) hoardLevel is monotone non-decreasing over gold");
  // T198 floor-offset (EMPTY=500, FULL=1e15): 60K≈17%, 1M≈27%, 1Bn≈51%, 1T≈76%
  ok(Math.abs(G.hoardLevel(6e4) - 0.17) < 0.03 && Math.abs(G.hoardLevel(1e6) - 0.27) < 0.03 && Math.abs(G.hoardLevel(1e9) - 0.51) < 0.03 && Math.abs(G.hoardLevel(1e12) - 0.76) < 0.03,
     "(2) T198: the pile climbs gently — 60K≈17% (" + G.hoardLevel(6e4).toFixed(2) + "), 1M≈27% (" + G.hoardLevel(1e6).toFixed(2) + "), 1Bn≈51% (" + G.hoardLevel(1e9).toFixed(2) + "), 1T≈76% (" + G.hoardLevel(1e12).toFixed(2) + ")"); })();
// earnBurstSpec: log-scaled, capped, tiered
(function(){ const s5 = G.earnBurstSpec(5), s1e6 = G.earnBurstSpec(1e6), s1e12 = G.earnBurstSpec(1e12);
  ok(s5.count >= 6 && s5.count <= 88 && s1e6.count > s5.count, "(2) earn-burst count rises with the gain (" + s5.count + " → " + s1e6.count + ")");
  ok(s1e12.count <= 88 && s1e6.count <= 88, "(2) the coin count is CAPPED (≤88) — no million-coin spawn");
  ok(s1e12.tier >= s1e6.tier && s1e6.tier >= s5.tier && s1e12.tier <= 3, "(2) past the cap it's JUICE not count — a discrete tier (0..3) escalates (" + s5.tier + "→" + s1e6.tier + "→" + s1e12.tier + ")");
  ok(Array.isArray(s1e12.palette) && s1e12.palette.length >= s5.palette.length, "(2) bigger hauls get a brighter/wider gold palette (juice)");
  ok(G.earnBurstSpec(0).count >= 6 && G.earnBurstSpec(-5).count >= 6, "(2) the spec floors safely at 0/negative gain"); })();

// ---- (3) boot behaviour: the hoard rides homeFxState, scaled by gold ----------
ok(G.load() === 5e9, "(3) the seeded gold total loads");
ok(G.hoardLevel(G.load()) > 0.2 && G.hoardLevel(G.load()) < 1, "(3) at 5B gold the mound is a substantial partial pile (" + G.hoardLevel(G.load()).toFixed(3) + ") — not yet maxed");
// fire the hoard tester (Graphics menu) → previews + an earn burst recorded
(function(){
  const grp = els.hoardTest; ok(grp && grp._h.click, "(3) the hoard tester group is wired");
  const fire = v => (grp._h.click || []).forEach(f => f({ target:{ closest:s => (s === ".mus-btn" ? { dataset:{ hoard: v } } : null) } }));
  const before = rec.earns.length;
  fire("1");
  const homeForFull = rec.homeStates[rec.homeStates.length - 1];
  ok(homeForFull && homeForFull.hoard === 1, "(3) the 'Full' tester previews a level-1 mound on the backdrop");
  fire("earn");
  ok(rec.earns.length > before, "(3) the tester fires the coin earn-burst (recorded burst calls)");
  const e = rec.earns[rec.earns.length - 1];
  ok(e && typeof e.x === "number" && typeof e.y === "number" && e.count > 0, "(3) the earn burst carries {x,y,count} from the earn-point");
  ok(e && e.tx == null && e.ty == null, "(3) the earn burst is STANDALONE outward — no converge target (tx/ty dropped)");
})();

// ---- (4) the ?dev gate on the gold-setter (behavioural) ----------------------
(function(){
  function bootWithSearch(search){
    store = {};                                   // fresh — no seeded gold
    global.window.location.search = search; global.window.location.hash = "";
    els = {};
    new Function(read("main.js"))();
    return global.window.Gold.load();
  }
  ok(bootWithSearch("?dev&gold=4242") === 4242, "(4) ?dev&gold=<n> seeds the gold total when ?dev is present");
  ok(bootWithSearch("?gold=9999") === 0, "(4) ?gold WITHOUT ?dev is inert (gated) — gold stays 0");
  ok(bootWithSearch("") === 0, "(4) no query string → the dev setter is a no-op");
})();

// ---- (5) T182: the Graphics-menu gold-setter REALLY sets the counter ----------
function fireGold(v){ (els.devGold._h.click || []).forEach(f => f({ target:{ closest:s => (s === ".mus-btn" ? { dataset:{ gold: v } } : null) } })); }
(function(){
  store = {}; global.window.location.search = "?dev"; global.window.location.hash = ""; els = {};
  new Function(read("main.js"))();
  ok(els.devGold && els.devGold._h.click, "(5) the dev gold-setter group is wired");
  fireGold("1000000");
  ok(global.window.Gold.load() === 1e6, "(5) ?dev: tapping 1M REALLY sets the Goblin Gold counter to 1,000,000 (" + global.window.Gold.load() + ")");
  fireGold("1000000000000");
  ok(global.window.Gold.load() === 1e12, "(5) ?dev: tapping 1T sets the counter to a trillion (the absurd-wealth preview)");
  fireGold("0");
  ok(global.window.Gold.load() === 0, "(5) ?dev: tapping 0 resets the counter");
})();
(function(){
  store = {}; global.window.location.search = ""; global.window.location.hash = ""; els = {};
  new Function(read("main.js"))();
  const before = global.window.Gold.load();
  fireGold("1000000");
  ok(global.window.Gold.load() === before, "(5) WITHOUT ?dev the gold-setter is inert — the save is never touched (publish-safe)");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " HOARD-WIRING CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
