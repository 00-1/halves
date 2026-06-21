/* T45 — headless performance assertions (no real browser):
 *   (a) the confetti RAF (fx.js) idles when nothing is alive;
 *   (b) listeners are added once — navigation/tab-switching add none;
 *   (c) lazy-render releases the previous tab's DOM;
 *   (d) the game-clock RAF is cancelled when leaving the game screen.
 * Run: node test/perf.test.js   (also gated in the Pages workflow)
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// ---- (a) fx.js confetti RAF idles when the burst drains ----
(function fxIdle(){
  global.window = {}; global.matchMedia = () => ({ matches:false });
  global.innerWidth = 360; global.innerHeight = 640; global.devicePixelRatio = 1;
  global.setTimeout = () => 0;
  const queue = []; let nextId = 1; const active = new Set();
  global.requestAnimationFrame = cb => { const id = nextId++; active.add(id); queue.push(cb); return id; };
  global.cancelAnimationFrame = id => active.delete(id);
  new Function(read("fx.js"))();
  const FX = global.window.FX;
  const noop = () => {};
  const ctx = { clearRect:noop, fillRect:noop, save:noop, restore:noop, translate:noop, rotate:noop,
    beginPath:noop, moveTo:noop, lineTo:noop, closePath:noop, fill:noop, arc:noop, stroke:noop,
    createRadialGradient:() => ({ addColorStop:noop }), set fillStyle(v){}, set strokeStyle(v){},
    set globalAlpha(v){}, set lineWidth(v){} };
  FX.init({ width:360, height:640, getContext:() => ctx }, { ctx });
  ok(FX.running() === false, "fx idle before any burst (no RAF)");
  FX.celebrate(180, 320, "common", ["#fff"]);
  ok(FX.running() === true && FX.liveCount() > 0, "fx starts the RAF on a burst");
  let ts = 0, frames = 0;
  while(queue.length && frames < 400){ const cb = queue.shift(); ts += 20; cb(ts); frames++; }
  ok(FX.running() === false && FX.liveCount() === 0, "fx RAF idles once particles die (" + frames + " frames)");
})();

// ---- (b)(c)(d) main.js navigation: listener balance, lazy-render, loop cancel ----
(async function mainPerf(){
  let winH = {}, docH = {}, els = {}, store = {}, addCount = 0, rafActive = new Set(), rafNext = 1;
  function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
    parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, scrollHeight:400, scrollTop:0,
    classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
      toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c); } else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
    addEventListener(e,fn){ addCount++; (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
    appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
    click(){ (this._h.click||[]).forEach(f=>f({ target:this, closest:s=>this, preventDefault(){}, stopPropagation(){} })); },
    querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; }, querySelectorAll(){ return []; }, closest(){ return null; },
    getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";} }; },
    get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }
  global.window = {}; global.window.addEventListener = (e,f) => { addCount++; (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
  global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 390;
  global.requestAnimationFrame = cb => { const id = rafNext++; rafActive.add(id); return id; }; global.window.requestAnimationFrame = global.requestAnimationFrame;
  global.cancelAnimationFrame = id => rafActive.delete(id); global.window.cancelAnimationFrame = global.cancelAnimationFrame;
  global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(e,f){ addCount++; (docH[e]=docH[e]||[]).push(f); }, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","main.js"].forEach(f => new Function(read(f))());
  const route = h => { global.window.location.hash = h; (winH.hashchange||[]).forEach(f=>f()); };
  const tabEv = t => ({ target:{ closest:s => (s===".inv-tab" ? { dataset:{ tab:t } } : null) } });

  const afterBoot = addCount;
  for(let i=0;i<4;i++){ route("#/inventory"); route("#/heroes"); route("#/arena"); route("#/best-times"); route("#/"); }
  route("#/inventory");
  for(let i=0;i<6;i++) ["loot","awards","topics"].forEach(t => (els.invTabs._h.click||[]).forEach(f=>f(tabEv(t))));
  ok(addCount === afterBoot, "navigation + tab switching add ZERO listeners (" + afterBoot + " stays " + addCount + ")");

  (els.invTabs._h.click||[]).forEach(f=>f(tabEv("loot")));
  ok(els.invList._html.indexOf("loot:") >= 0, "Loot tab renders its tiles when active");
  (els.invTabs._h.click||[]).forEach(f=>f(tabEv("topics")));
  ok(els.invList._html.indexOf("loot:") < 0, "switching away releases the Loot tiles (lazy-render)");

  route("#/"); els.startBtn.click();
  const inGame = rafActive.size;
  ok(els.game.classList.contains("active") && inGame > 0, "game screen active with a clock RAF");
  route("#/inventory");
  ok(rafActive.size < inGame || rafActive.size === 0, "leaving the game cancels the clock RAF (" + inGame + "→" + rafActive.size + ")");

  console.log("\n" + (fails === 0 ? "ALL " + checks + " PERF CHECKS PASSED" : fails + "/" + checks + " FAILED"));
  process.exit(fails ? 1 : 0);
})();
