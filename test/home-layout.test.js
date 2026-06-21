/* T99 — home/layout polish: reclaim the wasted top band on ALL screens, pin the
 * event banner to the top, and tidy the nav (Sound/Settings/Fullscreen are now
 * LABELLED like the four primary buttons, in one uniform row) so the tree expands.
 * Asserts the structural facts (headless can't judge pixels) + a live boot proving
 * the labelled sound/fullscreen buttons update their emoji/label, NOT wipe it.
 * Run: node test/home-layout.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

const css = read("styles.css"), html = read("index.html"), main = read("main.js");

// ---- (1) reclaim the wasted top band on ALL screens -------------------------
// the app is capped (so it never stretches to fill a huge viewport) AND the body
// pins it to the TOP — so on a tall phone the leftover band falls to the bottom.
ok(/\.app\{[^}]*max-height:780px/.test(css), "(1) .app is capped at max-height:780px (no over-stretch)");
ok(/body\{[^}]*align-items:flex-start/.test(css), "(1) body top-aligns the app (align-items:flex-start) — the top band is reclaimed");
ok(!/body\{[^}]*align-items:center/.test(css), "(1) body no longer vertically centres the app (which created the top band)");

// ---- (2) the event banner is pinned to the top of #start --------------------
const startBlock = html.slice(html.indexOf('id="start"'), html.indexOf('id="summary"'));
const bannerIdx = startBlock.indexOf('id="eventBanner"');
const treeIdx = startBlock.indexOf('id="modeTree"');
ok(bannerIdx >= 0 && treeIdx >= 0 && bannerIdx < treeIdx, "(2) the event banner is the first element of #start (above the tree)");
ok(/\.event-banner\{[^}]*margin-top:0/.test(css), "(2) the banner has no top margin — it sits flush at the top");
ok(/#start\{[^}]*padding:12px/.test(css), "(2) #start top padding trimmed (12px) so the banner is pinned high");

// ---- (3) tidy nav: Sound/Settings/Fullscreen are LABELLED, no icon-only util -
ok(!/navbtn util/.test(html), "(3) the icon-only `.util` nav buttons are gone (no bare-emoji buttons)");
[["soundBtnMenu","Sound"],["settingsBtn","Settings"],["fsBtn","Screen"]].forEach(([id, lbl]) => {
  const re = new RegExp('id="' + id + '"[^>]*>\\s*<span class="nav-emoji">[^<]+</span><span class="nav-lbl">' + lbl + '</span>');
  ok(re.test(html), "(3) #" + id + " is a labelled nav button (emoji + \"" + lbl + "\")");
});
ok(!/\.navbtn\.util\{/.test(css), "(3) the .navbtn.util icon-only style is removed");
ok(/\.navbtn \.nav-emoji\{/.test(css) && /\.navbtn \.nav-lbl\{/.test(css), "(3) the emoji + label spans are styled to match the primary buttons");
// the four primary buttons are untouched (still icon-canvas + label)
["statsBtn","invBtn","heroesBtn","arenaBtn"].forEach(id =>
  ok(new RegExp('id="' + id + '"[^>]*>\\s*<canvas').test(html), "(3) primary #" + id + " still leads with its pixel-icon canvas"));

// the sync code targets the inner spans (so a toggle never wipes the label)
ok(/soundBtnMenu"\);[\s\S]{0,80}querySelector\("\.nav-emoji"\)/.test(main), "(3) syncSoundButtons updates the .nav-emoji span (keeps the label)");
ok(/querySelector\("\.nav-lbl"\)[\s\S]{0,200}'Exit'[\s\S]{0,20}'Screen'/.test(main), "(3) the fullscreen toggle updates the .nav-lbl span (keeps the icon)");

// ---- live boot: the labelled buttons exist, and a sound toggle preserves the
// label while flipping only the emoji ----------------------------------------
(function boot(){
  let els = {}, store = {}, winH = {};
  // a shim whose querySelector understands .nav-emoji / .nav-lbl by handing back a
  // cached child stub per element, so we can watch which one a sync touches.
  function mkEl(id){ const kids = {}; const el = { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
    parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, scrollHeight:400, scrollTop:0,
    classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
      toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
    addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
    appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
    querySelector(s){ if(/canvas/.test(s||"")) return mkEl("_c");
      if(s === ".nav-emoji" || s === ".nav-lbl"){ return kids[s] || (kids[s] = { _t:"", get textContent(){return this._t;}, set textContent(v){this._t=String(v);} }); }
      return null; },
    querySelectorAll(){ return []; }, closest(){ return null; },
    getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";}, set imageSmoothingEnabled(v){}, get imageSmoothingEnabled(){return false;} }; },
    get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} };
    el._kids = kids; return el; }

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
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js","eventart.js","fx.js","sound.js","main.js"].forEach(f => new Function(read(f))());

  const sm = els.soundBtnMenu;
  ok(!!sm, "boot: the labelled sound button mounts");
  // syncSoundButtons ran during init → the emoji span carries 🔊/🔇 (label untouched)
  const emoji = sm._kids[".nav-emoji"];
  ok(emoji && (emoji.textContent === "🔊" || emoji.textContent === "🔇"), "boot: the sound emoji span is set (" + (emoji && emoji.textContent) + "), not the whole button");
  // flip it via the click handler and confirm the emoji span flipped, label stub never written
  const before = emoji.textContent;
  (sm._h.click||[]).forEach(f => f({}));
  ok(emoji.textContent !== before, "boot: toggling sound flips the emoji span (" + before + " → " + emoji.textContent + ")");
  ok(!(".nav-lbl" in sm._kids) || sm._kids[".nav-lbl"]._t === "", "boot: the sound button's text label is never overwritten by the toggle");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " HOME-LAYOUT CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
