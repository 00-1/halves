/* T157 + T166 — Android system-back navigates our screen stack, NOT the app
 * out. T166 reworked the design: the HASH is the single source of truth; the
 * browser's natural history IS our screen stack; one trailing sentinel is the
 * sole home-exit trap. This test simulates a realistic browser history stack
 * (entries are {url,state}, pushState appends + truncates forward, back() pops,
 * fires popstate + hashchange when URLs differ) and proves:
 *   (a) settings → audio → BACK lands on settings (not home) — the T166 bug;
 *   (b) full chain: audio → back → settings → back → home;
 *   (c) from a deep screen (Arena), system back lands on home (single pop);
 *   (d) at home, first back stays in-app + shows the confirm hint + re-arms a
 *       sentinel; second back releases the trap (no re-arm → exit allowed);
 *   (e) forward navs push EXACTLY one history entry (no double-stacking);
 *   (f) inert without a History API (browser-tab / headless unaffected);
 *   (g) the in-app `←` buttons (audioBack/graphicsBack/arenaBack) still work;
 *   (h) static design — no per-show sentinel survives.
 * Run: node test/back-nav.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// ---- T189: the Back button is pinned to ONE fixed location (bottom-LEFT) on every
// subscreen — never shifting horizontally (2-button rows) or vertically (content). ----
(function backLocation(){
  const html = read("index.html"), css = read("styles.css");
  ["sumBack","menuBtn","invBack","practiceBack","arenaBack","heroesBack","hdBack","settingsBack","audioBack","graphicsBack"]
    .forEach(id => ok(new RegExp('class="btn[^"]*back-btn[^"]*" id="' + id + '"').test(html), "(T189) #" + id + " carries the shared .back-btn class"));
  ok(/\.screen \.res-actions\{[^}]*margin-top:auto/.test(css) && /\.screen \.res-actions\{[^}]*flex:0 0 auto/.test(css),
     "(T189) .screen .res-actions is bottom-pinned (margin-top:auto, flex:0 0 auto)");
  ok(/\.screen \.res-actions \.back-btn\{[^}]*order:-1[^}]*margin-right:auto/.test(css),
     "(T189) .back-btn is forced bottom-LEFT (order:-1 + margin-right:auto)");
  ok(!/(^|\})\.res-actions\{[^}]*margin-top:auto/.test(css), "(T189) the unscoped .res-actions (modals) keeps its own spacing — the pin is .screen-scoped");
})();

function boot(withHistory){
  let els = {}, store = {}, winH = {}, docH = {};
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

  // Realistic history-stack simulator. Entries are {url, state}. pushState pushes
  // a new entry and truncates anything past the cursor. back() pops the cursor;
  // popstate ALWAYS fires; hashchange ONLY fires when the URL hash actually changed.
  let stack = [{ url: "", state: null }], cursor = 0;
  const baseUrl = "https://halves.example/index.html";
  function curHash(){ const m = /#.*$/.exec(stack[cursor].url || ""); return m ? m[0] : ""; }
  function setHashFromString(h){
    const newUrl = baseUrl + h;
    stack = stack.slice(0, cursor + 1);
    stack.push({ url: newUrl, state: null });
    cursor++;
    (winH.hashchange || []).forEach(f => f({}));   // hash-only changes don't fire popstate
  }
  const loc = {
    get hash(){ return curHash(); },
    set hash(v){ if(v !== curHash()){ setHashFromString(v); } },
    reload(){}
  };
  global.window.location = loc; global.location = loc;
  global.window.innerWidth = 390;
  global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = () => 1;
  global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = () => {};
  global.performance = { now: () => Date.now() };
  global.setTimeout = () => 0; global.clearTimeout = () => {};
  global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  store["halves.unlocked"] = JSON.stringify({ legacy:1 });
  let pushes = 0;
  if(withHistory){
    const h = {
      pushState(state){
        pushes++;
        const oldUrl = stack[cursor].url;
        stack = stack.slice(0, cursor + 1);
        stack.push({ url: oldUrl, state: state });   // pushState with no url keeps the current URL
        cursor++;
      },
      replaceState(state){ stack[cursor] = { url: stack[cursor].url, state: state }; },
      back(){
        if(cursor <= 0) return false;
        const oldHash = curHash();
        cursor--;
        const newHash = curHash();
        (winH.popstate || []).forEach(f => f({}));
        if(newHash !== oldHash) (winH.hashchange || []).forEach(f => f({}));
        return true;
      },
      get length(){ return stack.length; }
    };
    global.history = h; global.window.history = h;
  } else { delete global.history; delete global.window.history; }
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(e,f){ (docH[e]=docH[e]||[]).push(f); }, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  global.navigator = { standalone:true }; global.window.navigator = global.navigator;
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js","main.js"].forEach(f => new Function(read(f))());

  const route = h => { loc.hash = h; };
  const back = () => global.history && global.history.back();
  const cur = () => { for(const k of Object.keys(els)) if(els[k] && els[k].classList && els[k].classList.contains("active")) return k; return null; };
  return { els, route, back, cur, pushesAt: () => pushes, stackLen: () => stack.length, toasts: () => els.toasts ? els.toasts._html : "", click: (elId) => (els[elId]._h.click || []).forEach(f => f({ target: els[elId] })) };
}

// ---- (a) THE T166 bug: settings → audio → back → settings, NOT home --------
(function configMenusFix(){
  const b = boot(true);
  b.route("#/settings");
  ok(b.cur() === "settings", "(a) routed into Settings");
  b.route("#/audio");
  ok(b.cur() === "audio", "(a) clicked Sound → routed into Audio (the config sub-menu)");
  b.back();
  ok(b.cur() === "settings", "(a) T166: system back from Audio lands on SETTINGS (not home!) — the regression is fixed");
})();

// ---- (b) full back chain: audio → settings → home ---------------------------
(function fullChainBack(){
  const b = boot(true);
  b.route("#/settings"); b.route("#/audio");
  b.back();
  ok(b.cur() === "settings", "(b) audio back → settings");
  b.back();
  ok(b.cur() === "start", "(b) settings back → home");
})();

// ---- (c) deep screen → home is a single pop ---------------------------------
(function deepBack(){
  const b = boot(true);
  b.route("#/arena");
  ok(b.cur() === "arena", "(c) routed into the Arena");
  b.back();
  ok(b.cur() === "start", "(c) system back from Arena → home (single pop, no overshoot)");
})();

// ---- (d) home → audio → back to start → back triggers confirm-exit (real UX) -
// In the actual user flow, the app boots straight to start via initial routing
// (no extra `#/` hash navigation). We model that: nav into audio + back lands on
// start; the NEXT back is the exit-attempt that shows the confirm hint + re-arms
// the sentinel; a further back releases the trap (the app may exit).
(function homeBack(){
  const b = boot(true);
  b.route("#/audio");                        // navigate away
  ok(b.cur() === "audio", "(d) navigated into audio");
  b.back();
  ok(b.cur() === "start", "(d) back from audio → start");
  const before = b.pushesAt();
  b.back();
  ok(b.cur() === "start", "(d) back at start stays in-app (does not exit)");
  ok(/Press back again to exit/.test(b.toasts()), "(d) back at start shows the confirm hint");
  ok(b.pushesAt() === before + 1, "(d) back at start RE-ARMS the sentinel (stays trapped)");
  const armed = b.pushesAt();
  b.back();
  ok(b.pushesAt() === armed, "(d) a second back at start does NOT re-arm → trap releases (app may exit)");
})();

// ---- (e) forward navs push EXACTLY ONE history entry (no double-stacking) ----
(function forwardEntries(){
  const b = boot(true);
  const start = b.stackLen();
  b.route("#/settings");
  ok(b.stackLen() === start + 1, "(e) T166: a forward nav adds EXACTLY one history entry (was 2 — the regression)");
  b.route("#/audio");
  ok(b.stackLen() === start + 2, "(e) a second forward nav adds exactly one more (still no double-stack)");
})();

// ---- (f) inert without a History API ----------------------------------------
(function noHistory(){
  const b = boot(false);
  b.route("#/arena");
  ok(b.cur() === "arena", "(f) boots + navigates fine with NO History API (feature inert, no throw)");
})();

// ---- (g) the in-app `←` buttons still navigate cleanly ----------------------
(function inAppBack(){
  const b = boot(true);
  b.route("#/settings"); b.route("#/audio");
  b.click("audioBack");
  ok(b.cur() === "settings", "(g) the in-app ← from Audio → Settings (via the same hash route)");
  b.route("#/graphics");
  b.click("graphicsBack");
  ok(b.cur() === "settings", "(g) the in-app ← from Graphics → Settings");
  b.route("#/arena");
  b.click("arenaBack");
  ok(b.cur() === "start", "(g) the in-app ← from Arena → home");
})();

// ---- (h) the back-nav design: no per-show sentinel survives -----------------
(function staticDesign(){
  const main = read("main.js");
  ok(!/pushBackSentinel/.test(main), "(h) T166: NO per-show sentinel function survives (was the double-stacking root)");
  ok(/addEventListener\("popstate"/.test(main), "(h) a popstate handler is wired");
  ok(/lastSeenHash/.test(main), "(h) popstate uses the lastSeenHash flag to distinguish a routed pop from an exit pop");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " BACK-NAV CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
