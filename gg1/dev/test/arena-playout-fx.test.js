/* T160 — the Arena 3v3 playout (T90) gets a death VFX + a calmer pace. When a FOE
 * is KO'd mid-playout, a small/tight impact burst fires AT that foe's cell (foe-type
 * colour + impact white), and the per-step pacing is slower. Boots main.js with an
 * FXGL recorder + a query-capable battle DOM + a DRIVABLE rAF, runs a real fight,
 * steps the playout, and asserts a localised foe-KO burst fired at the cell.
 * Run: node test/arena-playout-fx.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// ---- (1) static: the pace was slowed + the foe-KO burst is wired -------------
const main = read("main.js");
ok(/Math\.max\(130, Math\.min\(480, Math\.round\(4000 \/ log\.length\)\)\)/.test(main), "(1) T160: the playout pace is slowed (budget 4000, floor 130ms, ceil 480ms)");
ok(/ev\.tSide === 1[\s\S]{0,300}fxBigBurst\(\{[\s\S]{0,260}spread: 0\.7/.test(main), "(1) T160: a foe KO (ev.tSide===1) fires a tight (spread 0.7) localised burst");

// ---- (2) behavioural: drive a real fight + assert the foe-KO burst -----------
(function boot(){
  const fx = { celebrates: [] };
  function Ctl(){ const c = { ready:true, _w:390, _h:844, resizes:0,
    setHomeState(){ return c; }, setArenaState(){ return c; }, setScene(){ return c; },
    start(){ return c; }, stop(){ return c; }, resize(){ c.resizes++; return c; },
    burst(o){ fx.celebrates.push(o); return c; }, celebrate(o){ fx.celebrates.push(o); return c; },
    isAnimating(){ return false; }, isBursting(){ return false; }, dispose(){ return c; } }; return c; }

  // synthetic battle-playout cells: 3 heroes (side 0) + 3 foes (side 1), each with a
  // distinct, NON-centre rect so a burst at a foe cell is clearly localised there.
  function unit(side, ord){
    const bar = { style:{ width:"100%" } };
    return { dataset:{ side:String(side), ord:String(ord) },
      classList:{ _s:new Set(), add(x){this._s.add(x);}, remove(x){this._s.delete(x);}, contains(x){return this._s.has(x);} },
      querySelector(s){ return /bp-hp/.test(s||"") ? bar : null; },
      getBoundingClientRect(){ return side === 1
        ? { left:200, top:400, width:40, height:40, right:240, bottom:440 }    // foe cell → centre (220,420)
        : { left:20, top:40, width:40, height:40, right:60, bottom:80 }; } };
  }
  const units = [unit(0,0), unit(0,1), unit(0,2), unit(1,100), unit(1,101), unit(1,102)];
  const statusEl = { _text:"", get textContent(){return this._text;}, set textContent(v){this._text=String(v);} };

  let els = {}, store = {}, winH = {}, docH = {};
  function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
    parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, scrollHeight:400, scrollTop:0,
    classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
    addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
    appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
    querySelector(s){ if(id === "arenaBody" && /bp-status/.test(s||"")) return statusEl; return (/canvas|enemy/.test(s||"")) ? mkEl("_c") : null; },
    querySelectorAll(s){ if(id === "arenaBody" && /\.bp-unit$/.test((s||"").trim())) return units; return []; },
    closest(){ return null; },
    getBoundingClientRect(){ return { left:40, top:100, width:80, height:60, right:120, bottom:160 }; },
    getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";}, set imageSmoothingEnabled(v){}, get imageSmoothingEnabled(){return false;} }; },
    get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }
  global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
  global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  global.window.location = { hash:"" }; global.location = global.window.location;
  global.window.innerWidth = 390; global.innerWidth = 390; global.window.innerHeight = 844; global.innerHeight = 844;
  // DRIVABLE rAF: queue callbacks; drive() flushes them with advancing timestamps
  let rafQ = [], rid = 0, clock = 0;
  global.requestAnimationFrame = (cb) => { rafQ.push(cb); return ++rid; }; global.window.requestAnimationFrame = global.requestAnimationFrame;
  global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
  const drive = (max) => { let n = 0; while(rafQ.length && n < (max||500)){ const cb = rafQ.shift(); clock += 1000; cb(clock); n++; } };
  global.performance = { now: () => clock };
  global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
  global.setTimeout = () => 0; global.clearTimeout = () => {};   // don't auto-fire showUnlocks during the test
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  global.window.FXGL = { Controller: function(){ return Ctl(); }, capabilities(){ return { webgl2:true, webgpu:false, reducedMotion:false }; } };
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(e,fn){ (docH[e]=docH[e]||[]).push(fn); }, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js","eventart.js","fx.js","sound.js"].forEach(f => new Function(read(f))());
  const C = global.window.Collectibles;
  const full = {}; C.CATALOG.forEach(it => { if(it.cat !== "Loot") full[it.id] = { ts:1 }; });   // full kit → a fight that wins (foes get KO'd)
  store["halves.collected"] = JSON.stringify(full);
  new Function(read("main.js"))();

  const route = h => { global.window.location.hash = h; (winH.hashchange||[]).forEach(f=>f()); };
  route("#/arena");
  const ab = els.arenaBody;
  const heroIds = (ab._html.match(/class="arena-hero[^"]*" data-hero="([^"]+)"/g) || []).map(s => (s.match(/data-hero="([^"]+)"/) || [])[1]);
  const pick = id => (ab._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".arena-hero" ? { dataset:{ hero:id } } : null) } }));
  pick(heroIds[0]); pick(heroIds[1]); pick(heroIds[2]);
  (els.arenaFight._h.click||[]).forEach(f=>f({}));
  ok(/battle-play/.test(ab._html), "(2) the Fight opened the watchable playout");
  const before = fx.celebrates.length;
  drive();                                   // step the whole playout to completion
  // the foe-KO burst signature: tight (spread 0.7), small (FX_SMALL=5), count 180
  const kbursts = fx.celebrates.filter(o => o && o.spread === 0.7 && o.count === 180 && o.sizePx === 5);
  ok(kbursts.length >= 1, "(2) T160: a FOE KO fires a localised impact burst (spread 0.7, small, count 180) — " + kbursts.length);
  const b = kbursts[0];
  ok(b && typeof b.x === "number" && typeof b.y === "number" && !(b.x === 0.5 && b.y === 0.55), "(2) the foe-KO burst emits AT the foe cell (not the screen-centre fallback) — x=" + (b && b.x.toFixed(3)) + " y=" + (b && b.y.toFixed(3)));
  ok(Array.isArray(b.palette) && b.palette[b.palette.length - 1] === "#ffffff", "(2) the burst palette is the foe type + impact white");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " ARENA-PLAYOUT-FX CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
