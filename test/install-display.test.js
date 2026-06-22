/* T156 — hide the in-app fullscreen affordances when launched INSTALLED/standalone
 * (TWA / installed PWA), where the app is already locked fullscreen, while keeping
 * them in a plain browser tab. Proven behaviourally by booting main.js under two
 * display-modes and checking the entry "Play in fullscreen" button (#entryFs) + the
 * Settings Fullscreen row (#fsToggle):
 *   (a) installed/standalone → BOTH hidden; the entry keeps the audio gesture
 *       (#entryPlay becomes a plain "Tap to begin", still wired);
 *   (b) browser tab (fullscreen supported) → BOTH shown + working (no regression);
 *   (c) the manifest declares display:"fullscreen" (true game fullscreen when wrapped).
 * Run: node test/install-display.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// boot main.js with a DOM shim; `standalone` toggles the display-mode match.
function boot(standalone){
  let els = {}, store = {}, winH = {};
  function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
    parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, scrollHeight:400, scrollTop:0,
    classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
      toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
    addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
    appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
    querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; }, querySelectorAll(){ return []; }, closest(){ return null; },
    getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";} }; },
    get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }
  global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
  // matchMedia reports standalone/fullscreen ONLY when `standalone` is set (the installed launch)
  global.window.matchMedia = q => ({ matches: standalone && /display-mode:\s*(standalone|fullscreen)/.test(q),
    addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 390;
  global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = global.requestAnimationFrame;
  global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
  global.performance = { now: () => Date.now() };
  global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  // a browser-tab DOM that SUPPORTS fullscreen (so the affordances would show but for T156)
  let fsCalls = 0;
  const docEl = mkEl("html"); docEl.requestFullscreen = () => { fsCalls++; return Promise.resolve(); };
  global.navigator = { standalone:false };
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:docEl, body:mkEl("body"), fullscreenElement:null };
  global.window.navigator = global.navigator;
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","main.js"].forEach(f => new Function(read(f))());
  return { els, fsCalls: () => fsCalls };
}

// ---- (a) installed / standalone → both fullscreen affordances are HIDDEN ------
(function installed(){
  const b = boot(true); const els = b.els;
  ok(els.entryFs.classList.contains("hidden"), "(a) installed: the entry 'Play in fullscreen' button is hidden");
  ok(els.fsToggle.classList.contains("hidden"), "(a) installed: the Settings Fullscreen toggle row is hidden");
  ok(els.entryPlay.textContent === "Tap to begin", "(a) installed: the entry still serves the audio gesture (plain 'Tap to begin')");
  ok((els.entryPlay._h.click||[]).length >= 1, "(a) installed: 'Tap to begin' is still wired (the entry gesture survives)");
  // T167 — the installed "Tap to begin" tap must ALSO request fullscreen (the
  // manifest display:fullscreen is unreliable on Android; the user-gesture-only
  // requestFullscreen API needs this tap). One requestFullscreen call expected.
  const before = b.fsCalls();
  (els.entryPlay._h.click||[]).forEach(f=>f({}));
  ok(b.fsCalls() === before + 1, "(a) T167: 'Tap to begin' in the installed PWA calls requestFullscreen() (was " + before + " → " + b.fsCalls() + ")");
})();

// ---- (b) browser tab (fullscreen supported) → both SHOWN (no regression) ------
(function browserTab(){
  const b = boot(false); const els = b.els;
  ok(!els.entryFs.classList.contains("hidden"), "(b) browser tab: the 'Play in fullscreen' button still shows");
  ok(!els.fsToggle.classList.contains("hidden"), "(b) browser tab: the Settings Fullscreen toggle still shows");
  ok((els.entryFs._h.click||[]).length >= 1 && (els.fsToggle._h.click||[]).length >= 1, "(b) browser tab: both fullscreen controls are still wired");
  // T167 — in a browser tab, the lower-profile entryPlay tap is the audio-only
  // alternative (no fullscreen) — the two-button choice is preserved. fsEnter
  // only fires when the user explicitly picks entryFs.
  const beforePlay = b.fsCalls();
  (els.entryPlay._h.click||[]).forEach(f=>f({}));
  ok(b.fsCalls() === beforePlay, "(b) T167: browser-tab entryPlay does NOT request fullscreen (the entryFs button is the explicit FS choice)");
  const beforeFs = b.fsCalls();
  (els.entryFs._h.click||[]).forEach(f=>f({}));
  ok(b.fsCalls() === beforeFs + 1, "(b) browser-tab entryFs DOES request fullscreen (explicit user choice)");
})();

// ---- (c) static: the helper + the manifest ------------------------------------
(function statics(){
  const main = read("main.js");
  ok(/function isInstalledDisplay\(/.test(main), "(c) main.js defines an isInstalledDisplay() helper");
  ok(/display-mode:\s*standalone/.test(main) && /display-mode:\s*fullscreen/.test(main) && /navigator\.standalone/.test(main),
     "(c) isInstalledDisplay checks display-mode standalone/fullscreen + navigator.standalone");
  const mani = JSON.parse(read("manifest.webmanifest"));
  ok(mani.display === "fullscreen", "(c) manifest display is 'fullscreen' (status bar hidden when wrapped)");
  ok(mani.orientation === "portrait", "(c) manifest keeps orientation:portrait");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " INSTALL-DISPLAY CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
