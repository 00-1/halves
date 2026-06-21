/* T86 — onboarding gating I: unlock-state model + first-run intro + Inventory
 * gate + one-time highlight. Migration-safe.
 *   (a) FRESH profile: Inventory gated (nav hidden, route blocked); launch drops
 *       into ONE easy question (not a topic round); solving it grants the first
 *       reward AND unlocks + highlights the Inventory; the highlight fires once.
 *   (b) LEGACY profile (any prior progress, no unlock record): ALL features
 *       unlocked, never re-gated; no intro.
 *   (c) unlock-state persists; Arena/earn logic untouched (access layer only).
 * Run: node test/onboarding.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
  parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, scrollHeight:400, scrollTop:0,
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
    toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
  addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
  appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
  querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; }, querySelectorAll(){ return []; }, closest(){ return null; },
  getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";} }; },
  get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }

// Boot the app with a given seeded store; returns the live handles.
function boot(seed){
  const els = {}, store = Object.assign({}, seed||{}), winH = {}, created = [];
  global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
  global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 360;
  global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = global.requestAnimationFrame;
  global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
  global.performance = { now: () => 1000 };
  global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
  global.setTimeout = (fn) => { if(typeof fn === "function") fn(); return 0; }; global.clearTimeout = () => {};
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ const e = mkEl("_"+t); created.push(e); return e; },
    addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js","eventart.js","fx.js","sound.js","main.js"].forEach(f => new Function(read(f))());
  return { els, store, winH, win: global.window, created };
}
const press = (els, k) => (els.pad._h.click||[]).forEach(f => f({ target:{ closest:s => (s===".key" ? { dataset:{ k:String(k) } } : null) } }));

// ===================== (a) FRESH profile =====================
(function fresh(){
  const a = boot({});   // genuinely empty profile
  const O = a.win.Onboard;
  ok(O.needsIntro() === true, "fresh profile needs the first-run intro");
  ok(O.isFeatureUnlocked("inventory") === false, "fresh profile: Inventory is GATED");
  ok(a.els.invBtn.classList.contains("hidden"), "fresh profile: the Inventory nav control is hidden");
  // route guard: a deep link into the gated Inventory bounces home
  a.win.location.hash = "#/inventory"; (a.winH.hashchange||[]).forEach(f=>f());
  ok(!a.els.inventory.classList.contains("active"), "fresh profile: deep-linking #/inventory is blocked");

  // launch → the one-question intro (entry Play). Drive the entry gesture:
  (a.els.entryPlay._h.click||[]).forEach(f => f({}));
  ok(a.els.game.classList.contains("active"), "launch drops a fresh profile into a single-question round");
  ok(a.els.counter._text === "1 / 1", "the intro is exactly ONE question (not a full topic round)");
  // solve it (half of 12 = 6) — numeric/numpad
  press(a.els, "6");
  ok(a.els.start.classList.contains("active"), "solving the intro returns to the home screen");
  ok(O.isFeatureUnlocked("inventory") === true, "solving the intro UNLOCKS the Inventory");
  ok(!a.els.invBtn.classList.contains("hidden"), "the Inventory nav control is now revealed");
  // first reward granted (this question's collectible) + persisted
  const col = JSON.parse(a.store["halves.collected"] || "{}");
  ok(!!col["solve:halves:12"], "solving the intro granted the first reward (a collectible)");
  // highlight fired: a coachmark toast was built (its className), and the once-flag persisted
  ok(a.created.some(e => /coach/.test(e.className || "")), "the Inventory ungate raises a coachmark highlight");
  const u1 = JSON.parse(a.store["halves.unlocked"]);
  ok(u1.inventory && u1.inventoryHi && u1.introDone, "unlock-state persists (inventory + highlight-shown + introDone)");
  // re-render home — the highlight does NOT fire again (once only)
  const coachBefore = a.created.filter(e => /coach/.test(e.className || "")).length;
  a.win.location.hash = "#/"; (a.winH.hashchange||[]).forEach(f=>f());
  ok(a.created.filter(e => /coach/.test(e.className || "")).length === coachBefore, "the highlight fires only once");
  ok(O.needsIntro() === false, "the intro is not offered again after completion");
})();

// ===================== (b) LEGACY profile =====================
(function legacy(){
  // a pre-existing profile with progress but NO unlock record (the migration case)
  const b = boot({ "halves.collected": JSON.stringify({ "init:halves":{ts:1}, "solve:halves:30":{ts:1} }),
                   "halves.stats": JSON.stringify({ games:7, byMode:{}, flawless:{} }) });
  const O = b.win.Onboard;
  ok(O.needsIntro() === false, "legacy profile does NOT enter onboarding");
  ok(O.state().legacy === 1, "legacy profile is stamped legacy");
  ok(O.isFeatureUnlocked("inventory") === true && O.isFeatureUnlocked("anything") === true, "legacy profile: ALL features unlocked (never re-gated)");
  ok(!b.els.invBtn.classList.contains("hidden"), "legacy profile: the Inventory nav is visible");
  // legacy can open the inventory directly
  b.win.location.hash = "#/inventory"; (b.winH.hashchange||[]).forEach(f=>f());
  ok(b.els.inventory.classList.contains("active"), "legacy profile can open the Inventory");
  // launch goes straight to the menu, no intro
  b.win.location.hash = "#/"; (b.winH.hashchange||[]).forEach(f=>f());
  (b.els.entryPlay._h.click||[]).forEach(f => f({}));
  ok(!b.els.game.classList.contains("active") || b.els.start.classList.contains("active"), "legacy profile is not forced through the intro");
})();

// ===================== (c) persistence across a reload =====================
(function persist(){
  const seed = {};
  const a = boot(seed);   // fresh
  (a.els.entryPlay._h.click||[]).forEach(f => f({}));
  press(a.els, "6");          // complete the intro
  // reboot from the SAME persisted store → onboarding state survives
  const b = boot(a.store);
  ok(b.win.Onboard.isFeatureUnlocked("inventory") === true, "unlock-state persists across a reload");
  ok(b.win.Onboard.needsIntro() === false, "the intro is not repeated after a reload");
  ok(!b.els.invBtn.classList.contains("hidden"), "Inventory stays revealed after a reload");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " ONBOARDING CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
