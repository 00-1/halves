/* T78 — Events foundation: the UTC-daily scheduler + data model + reward items.
 * Proves (pure, offline, clock injected):
 *   (a) same UTC date → same event; the roster index is always 0..13;
 *   (b) the roster cycles every 14 days and each event recurs every 14 days;
 *   (c) the 00:00 UTC boundary flips the event (23:59:59Z vs 00:00:01Z);
 *   (d) helpers are pure functions of a passed-in timestamp (no Date.now/network);
 *   (e) all 14 events are fully specified with distinct, leak-free copy and a
 *       valid cross-topic questionMix referencing real modes;
 *   (f) the 14 rewards are REAL collection members (in CATALOG, in the "Events"
 *       category/tab, carrying a hero buff → feed Arena power) and migration-safe;
 *   (g) event rewards are NEVER granted by the normal drill evaluate() path.
 * Run: node test/events.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
["modes.js","events.js","collectibles.js"].forEach(f => new Function(read(f))());
const Ev = global.window.Events, C = global.window.Collectibles, MODES = global.window.MODES;
const DAY = 86400000, L = Ev.ROSTER.length;

// roster shape
ok(L === 14, "the roster has exactly 14 events (" + L + ")");
ok(new Set(Ev.ROSTER.map(e => e.id)).size === 14, "all 14 event ids are unique");

// (a) deterministic per UTC date + index always 0..13
const d = Date.UTC(2026, 5, 21);   // a fixed UTC midnight
ok(Ev.today(d + 1*3600000).id === Ev.today(d + 22*3600000).id, "same UTC date → same event (01:00 vs 22:00)");
let idxOk = true;
for(let k = -40; k <= 40; k++){ const i = Ev.indexFor(d + k*DAY); if(i < 0 || i > 13 || i % 1 !== 0) idxOk = false; }
ok(idxOk, "the roster index is always an integer 0..13 (incl. negative epoch days)");
ok(Ev.epochDaysUTC(d) === Math.floor(d / DAY), "epochDaysUTC is the UTC day number");

// (b) cycle of 14: index advances by 1 each UTC day and wraps; events recur every 14 days
let cycleOk = true;
for(let k = 0; k < 28; k++){ if(Ev.indexFor(d + k*DAY) !== (Ev.indexFor(d) + k) % L) cycleOk = false; }
ok(cycleOk, "index advances one-per-day and wraps mod 14");
let recurOk = true;
Ev.ROSTER.forEach((e, i) => {
  const liveDay = d + ((i - Ev.indexFor(d) + L) % L) * DAY;   // a day this event is live
  if(!Ev.isLive(e.id, liveDay)) recurOk = false;
  if(!Ev.isLive(e.id, liveDay + 14*DAY)) recurOk = false;        // recurs in 14 days
  for(let k = 1; k < 14; k++) if(Ev.isLive(e.id, liveDay + k*DAY)) recurOk = false;   // not on the in-between days
});
ok(recurOk, "every event is live on its day, recurs every 14 days, and is not live on the 13 between");
// daysUntilLive: 0 iff live today, else 1..13
let dulOk = true;
Ev.ROSTER.forEach(e => {
  const v = Ev.daysUntilLive(e.id, d);
  if(v < 0 || v > 13) dulOk = false;
  if((v === 0) !== Ev.isLive(e.id, d)) dulOk = false;
});
ok(dulOk, "daysUntilLive is 0..13 and 0 exactly when the event is live today");
ok(Ev.daysUntilLive("not-an-event", d) === -1, "daysUntilLive(-1) for an unknown id");

// (c) 00:00 UTC boundary flips the event
const t1 = Date.UTC(2026, 5, 21, 23, 59, 59), t2 = Date.UTC(2026, 5, 22, 0, 0, 1);
ok(Ev.today(t1).id !== Ev.today(t2).id, "23:59:59Z and 00:00:01Z (next UTC day) are different events");
ok(Ev.epochDaysUTC(t2) - Ev.epochDaysUTC(t1) === 1, "the boundary is exactly one UTC day apart");

// (d) pure/offline — clock injected, no Date.now baked in, no network
const src = read("events.js");
ok(!/fetch\s*\(|XMLHttpRequest|navigator|localStorage/.test(src), "events.js does not touch network/storage (offline)");
ok(!/requestAnimationFrame|setInterval|setTimeout/.test(src), "events.js is static (no timers/RAF)");
// today(ts) must work from an explicit timestamp without consulting the real clock
const realNow = Date.now; let touchedClock = false; Date.now = () => { touchedClock = true; return 0; };
const got = Ev.today(d).id; Date.now = realNow;
ok(!touchedClock && typeof got === "string", "today(ts) is a pure function of its timestamp (never calls Date.now)");

// (e) every event fully specified, copy is leak-free, questionMix valid
const modeIds = new Set(MODES.map(m => m.id));
let specOk = true, leak = 0, mixOk = true;
Ev.ROSTER.forEach(e => {
  if(!e.id || !e.name || !e.blurb || !e.reward || !e.rarity || e.artSeed == null || e.musicSeed == null) specOk = false;
  if(/\d/.test(e.name + " " + e.blurb + " " + e.reward)) leak++;        // no digits → no answer/secret leak
  if(!Array.isArray(e.questionMix) || !e.questionMix.length) mixOk = false;
  else e.questionMix.forEach(q => { if(!modeIds.has(q.topic) || !(q.n > 0)) mixOk = false; });
});
ok(specOk, "every event has id/name/blurb/reward/rarity/artSeed/musicSeed");
ok(leak === 0, "no event name/blurb/reward leaks a digit (no answer/secret leaks)");
ok(mixOk, "every questionMix references real modes with positive counts");
ok(new Set(Ev.ROSTER.map(e => e.name)).size === 14 && new Set(Ev.ROSTER.map(e => e.reward)).size === 14,
   "event names and reward names are all distinct");

// (f) the 14 rewards are real collection members in a new "Events" category
ok(C.categories().includes("Events"), "a new 'Events' collectible category exists");
const evItems = C.CATALOG.filter(it => it.cat === "Events");
ok(evItems.length === 14, "exactly 14 event reward items in the catalogue (" + evItems.length + ")");
const HERO_IDS = new Set(C.HERO_IDS);
let allReal = true, allBuff = true, idOk = true;
Ev.ROSTER.forEach(e => {
  const it = C.byId("event:" + e.id);
  if(!it || it.cat !== "Events") allReal = false;
  if(it){ if(it.name !== e.reward || it.rarity !== e.rarity) allReal = false;
    if(!it.boost || !HERO_IDS.has(it.boost.hero) || !(it.boost.amount > 0)) allBuff = false; }
  if(Ev.rewardId(e.id) !== "event:" + e.id) idOk = false;
});
ok(allReal, "each event reward is registered as event:<id> with its name + rarity");
ok(allBuff, "every event reward carries a real hero buff (feeds Arena power)");
ok(idOk, "Events.rewardId(id) === 'event:'+id (stable, migration-safe ids)");
// they count toward the global total
ok(C.CATALOG.filter(it => it.cat === "Events").every(it => C.byId(it.id) === it), "event items are addressable in the global catalogue");

// (g) event rewards are NEVER granted by the normal drill evaluate() path
const granted = C.evaluate({ mode:{ id:"halves" }, answered:21, total:21, skipped:0, mistakes:0, avg:1, flawless:true }, () => false);
ok(granted.every(it => it.cat !== "Events"), "evaluate() never returns an Events reward (granted only by the live event, T79)");

// (f cont.) inventory wiring present (Events tab) — source-level
const main = read("main.js");
ok(/id:"events"/.test(main) && /invEventsHtml/.test(main), "main.js adds an 'Events' inventory tab + renderer");
ok(/n !== "Loot" && n !== "Events"/.test(main), "the Awards tab excludes the Events category (own tab)");
const html = read("index.html");
ok(/<script src="events\.js">[\s\S]*<script src="collectibles\.js">/.test(html), "index.html loads events.js before collectibles.js");

// ===================== T79 — the cross-topic gauntlet =======================
// (h) buildGauntlet: deterministic per event, valid + numpad-safe, themed mix.
const modeById = {}; MODES.forEach(m => modeById[m.id] = m);
let genOk = true, byteStable = true, sizeOk = true, mixThemed = true;
Ev.ROSTER.forEach(e => {
  const a = Ev.buildGauntlet(e.id, MODES), b = Ev.buildGauntlet(e.id, MODES);
  if(JSON.stringify(a) !== JSON.stringify(b)) byteStable = false;          // same set on replay
  const want = e.questionMix.reduce((s, q) => s + q.n, 0);
  if(a.length !== want) sizeOk = false;
  // every question is numeric, non-negative, finite and ≤5 numpad digits
  a.forEach(q => {
    if(typeof q.a !== "number" || q.a < 0 || !isFinite(q.a)) genOk = false;
    if(String(q.a).replace("-", "").replace(".", "").length > 5) genOk = false;
    if(typeof q.p !== "string" || !q.p) genOk = false;
  });
  // each question's prompt actually belongs to its tagged topic's set (themed mix)
  e.questionMix.forEach(q => {
    const pool = new Set(modeById[q.topic].build().map(x => x.p));
    const got = a.filter(x => x.topic === q.topic);
    if(got.length !== Math.min(q.n, pool.size)) mixThemed = false;
    if(!got.every(x => pool.has(x.p))) mixThemed = false;
  });
});
ok(byteStable, "buildGauntlet is byte-stable per event (same set every play/recurrence)");
ok(sizeOk, "each gauntlet has exactly the questionMix's total question count");
ok(genOk, "every gauntlet question is numeric, non-negative, finite and numpad-safe (≤5 digits)");
ok(mixThemed, "every gauntlet draws the right count from each topic's curated set (themed)");
// determinism survives a fresh module boot (no hidden state)
(function(){
  const g0 = global.window; global.window = {};
  ["modes.js","events.js"].forEach(f => new Function(read(f))());
  const Ev2 = global.window.Events, M2 = global.window.MODES;
  let same = true;
  Ev.ROSTER.forEach(e => { if(JSON.stringify(Ev2.buildGauntlet(e.id, M2)) !== JSON.stringify(Ev.buildGauntlet(e.id, MODES))) same = false; });
  global.window = g0;
  ok(same, "the gauntlet is identical across a fresh module boot (deterministic, no hidden state)");
})();
ok(Ev.buildGauntlet("not-an-event", MODES).length === 0, "buildGauntlet of an unknown id is empty");

// (i) DOM drive: play the live event end-to-end → reward granted, idempotent,
//     and NOT playable when the event is not live today.
(function eventPlayDrive(){
  // a fixed timestamp; whatever event is live on that UTC day is the target
  const FIXED = Date.UTC(2026, 5, 21, 12, 0, 0);
  const liveId = Ev.today(FIXED).id;
  const offDayMs = FIXED + 86400000;                  // next UTC day → liveId not live

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
  global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 360;
  global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = global.requestAnimationFrame;
  global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
  global.performance = { now: () => 1000 };
  global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
  // run round-advance timers synchronously so the gauntlet can be driven in a loop
  global.setTimeout = (fn) => { if(typeof fn === "function") fn(); return 0; }; global.clearTimeout = () => {};
  global.window.setTimeout = global.setTimeout; global.window.clearTimeout = global.clearTimeout;
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  const realDateNow = Date.now; Date.now = () => FIXED;     // freeze "today" to the live UTC day
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","main.js"].forEach(f => new Function(read(f))());
  const EP = global.window.EventPlay, Cm = global.window.Collectibles;
  ok(EP && typeof EP.start === "function", "window.EventPlay.start is exposed");

  // answer the whole gauntlet via synthetic numpad keypresses on #pad
  const set = global.window.Events.buildGauntlet(liveId, global.window.MODES);
  function playThrough(){
    ok(EP.start(liveId) === true, "the live event starts");
    ok(els.game.classList.contains("active"), "event play activates the game screen");
    for(let i=0;i<set.length;i++){
      const ans = String(set[i].a);
      for(const ch of ans){ (els.pad._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".key" ? { dataset:{ k:ch } } : null) } })); }
    }
  }
  playThrough();
  ok(els.results.classList.contains("active"), "after the last answer the event shows results");
  const owned1 = JSON.parse(store["halves.collected"] || "{}");
  ok(!!owned1["event:" + liveId], "completing the live event granted its event:<id> reward");
  const before = Object.keys(owned1).filter(k => k === "event:" + liveId).length;

  // replay (still live) → reward grant is idempotent (own-once), still owned
  playThrough();
  const owned2 = JSON.parse(store["halves.collected"] || "{}");
  ok(!!owned2["event:" + liveId], "replaying the live event keeps the reward (idempotent)");
  ok(Object.keys(owned2).filter(k => k === "event:" + liveId).length === before, "the reward is not duplicated on replay");

  // not live today → cannot start (returns false, no round)
  Date.now = () => offDayMs;
  els.game.classList.remove("active");
  ok(EP.start(liveId) === false, "an event that is not live today cannot be started");
  ok(!els.game.classList.contains("active"), "a non-live event never opens a round");
  Date.now = realDateNow;
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " EVENT CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
