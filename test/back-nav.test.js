/* T157 — the Android system back / back-gesture navigates our SCREEN STACK instead
 * of exiting the app. main.js traps back with a history sentinel + a popstate
 * handler that walks each screen to its PARENT, confirming-then-exiting only at
 * home. Proven by booting main.js with a History API + simulating popstate:
 *   (a) back from a deep screen (Arena) → home; a sub-menu (Audio) → its parent
 *       (Settings) — NOT an app exit;
 *   (b) at home, the first back is TRAPPED (confirm hint, stays in-app + re-arms a
 *       sentinel); a second back RELEASES the trap (no re-arm → the app may exit);
 *   (c) the parent map also covers the transient in-round screens (game/results/
 *       practice → home) so back never exits mid-round;
 *   (d) it is inert without a History API (browser-tab/headless unaffected).
 * Run: node test/back-nav.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

function boot(withHistory){
  let els = {}, store = {}, winH = {}, pushes = 0;
  function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
    parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, scrollHeight:400, scrollTop:0,
    classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
      toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
    addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
    appendChild(c){ if(c && typeof c._html === "string") this._html += c._html; return c; }, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
    querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; }, querySelectorAll(){ return []; }, closest(){ return null; },
    getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";} }; },
    get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }
  global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
  global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  // a location whose hash SETTER fires hashchange (like a real browser) so nav resolves
  const loc = { _h:"", get hash(){ return this._h; }, set hash(v){ this._h = v; (winH.hashchange||[]).forEach(f=>f()); } };
  global.window.location = loc; global.location = loc; global.window.innerWidth = 390;
  global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = global.requestAnimationFrame;
  global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
  global.performance = { now: () => Date.now() };
  global.setTimeout = () => 0; global.clearTimeout = () => {};   // never auto-disarm during the test
  global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  store["halves.unlocked"] = JSON.stringify({ legacy:1 });   // ungate Arena/Heroes/etc.
  if(withHistory){
    const h = { pushState(){ pushes++; }, replaceState(){}, back(){}, go(){}, length:1 };
    global.history = h; global.window.history = h;
  } else { delete global.history; delete global.window.history; }
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  global.navigator = { standalone:true }; global.window.navigator = global.navigator;
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js","main.js"].forEach(f => new Function(read(f))());
  const route = h => { loc.hash = h; };
  const back = () => (winH.popstate||[]).forEach(f=>f({}));
  const cur = () => { for(const k of Object.keys(els)) if(els[k] && els[k].classList && els[k].classList.contains("active")) return k; return null; };
  return { els, route, back, cur, pushesAt: () => pushes, toasts: () => els.toasts ? els.toasts._html : "" };
}

// ---- (a) back from a deep screen / sub-menu navigates to the PARENT ----------
(function deepBack(){
  const b = boot(true);
  b.route("#/arena");
  ok(b.cur() === "arena", "(a) routed into the Arena");
  b.back();
  ok(b.cur() === "start", "(a) system back from the Arena → home (NOT an app exit)");
  b.route("#/settings"); b.route("#/audio");
  ok(b.cur() === "audio", "(a) routed into the Audio sub-menu");
  b.back();
  ok(b.cur() === "settings", "(a) back from a sub-menu (Audio) → its parent (Settings)");
})();

// ---- (b) at home: first back is trapped (confirm), second back releases -------
(function homeBack(){
  const b = boot(true);
  b.route("#/");
  ok(b.cur() === "start", "(b) at home");
  const before = b.pushesAt();
  b.back();
  ok(b.cur() === "start", "(b) first back at home stays in-app (does not exit)");
  ok(/Press back again to exit/.test(b.toasts()), "(b) first back at home shows the confirm hint");
  ok(b.pushesAt() === before + 1, "(b) first back RE-ARMS a sentinel (stays trapped)");
  const armed = b.pushesAt();
  b.back();
  ok(b.pushesAt() === armed, "(b) second back at home does NOT re-arm → the trap releases (app may exit)");
})();

// ---- (c) the parent map covers the transient in-round screens -----------------
(function staticMap(){
  const main = read("main.js");
  ok(/game:\s*"start"/.test(main) && /results:\s*"start"/.test(main) && /practice:\s*"start"/.test(main),
     "(c) the back parent-map covers game/results/practice → home (no mid-round exit)");
  ok(/heroDetail:\s*"heroes"/.test(main) && /audio:\s*"settings"/.test(main) && /graphics:\s*"settings"/.test(main),
     "(c) sub-screens map to their real parents (heroDetail→heroes, audio/graphics→settings)");
  ok(/addEventListener\("popstate"/.test(main), "(c) a popstate handler drives the back navigation");
})();

// ---- (d) inert without a History API (browser-tab / headless unaffected) ------
(function noHistory(){
  const b = boot(false);     // boots clean with no global.history
  b.route("#/arena");
  ok(b.cur() === "arena", "(d) boots + navigates fine with NO History API (feature inert, no throw)");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " BACK-NAV CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
