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
["modes.js","events.js","collectibles.js","eventart.js"].forEach(f => new Function(read(f))());
const Ev = global.window.Events, C = global.window.Collectibles, MODES = global.window.MODES, EA = global.window.EventArt;
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
ok(evItems.length === 42, "exactly 42 event reward items — 3 tiers × 14 events (" + evItems.length + ")");
const HERO_IDS = new Set(C.HERO_IDS);
const RORD = { common:0, uncommon:1, rare:2, epic:3, legendary:4 };
let allReal = true, allBuff = true, idOk = true, tiersOk = true, ascOk = true;
Ev.ROSTER.forEach(e => {
  const p = C.byId("event:" + e.id), w = C.byId("event:" + e.id + ":well"), a = C.byId("event:" + e.id + ":ace");
  if(!p || p.cat !== "Events") allReal = false;
  // participation keeps its original id + name + rarity (migration-safe)
  if(p){ if(p.name !== e.reward || p.rarity !== e.rarity || p.tier !== "participation") allReal = false; }
  // the two new tiers exist, are named, in the Events cat, with their tier tags
  if(!w || !a || w.cat !== "Events" || a.cat !== "Events" || w.tier !== "well" || a.tier !== "ace" ||
     w.name !== e.rewardWell || a.name !== e.rewardAce) tiersOk = false;
  // ascending (non-decreasing) rarity participation ≤ well ≤ ace; ace is legendary
  if(p && w && a){ if(!(RORD[p.rarity] <= RORD[w.rarity] && RORD[w.rarity] <= RORD[a.rarity]) || a.rarity !== "legendary") ascOk = false; }
  // every tier is a real buff (feeds Arena power)
  [p, w, a].forEach(it => { if(!it || !it.boost || !HERO_IDS.has(it.boost.hero) || !(it.boost.amount > 0)) allBuff = false; });
  if(Ev.rewardId(e.id) !== "event:" + e.id) idOk = false;
});
ok(allReal, "participation tier keeps event:<id> + its name + rarity (migration-safe)");
ok(tiersOk, "each event also has :well and :ace tiers (named, tagged)");
ok(ascOk, "tier rarity is ascending (participation ≤ well ≤ ace = legendary)");
ok(allBuff, "every event reward tier carries a real hero buff (feeds Arena power)");
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
  const key = k => (els.pad._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".key" ? { dataset:{ k:String(k) } } : null) } }));
  function playThrough(){
    ok(EP.start(liveId) === true, "the live event starts");
    ok(els.game.classList.contains("active"), "event play activates the game screen");
    for(let i=0;i<set.length;i++) for(const ch of String(set[i].a)) key(ch);   // flawless
  }
  playThrough();
  ok(els.results.classList.contains("active"), "after the last answer the event shows results");
  const owned1 = JSON.parse(store["halves.collected"] || "{}");
  ok(!!owned1["event:" + liveId] && !!owned1["event:" + liveId + ":well"] && !!owned1["event:" + liveId + ":ace"],
     "a FLAWLESS live run grants all three tiers (participation + well + ace)");

  // replay (still live) → grants are idempotent per tier (own-once, none removed)
  playThrough();
  const owned2 = JSON.parse(store["halves.collected"] || "{}");
  ok(!!owned2["event:" + liveId] && !!owned2["event:" + liveId + ":well"] && !!owned2["event:" + liveId + ":ace"],
     "replaying keeps all three tiers (idempotent per tier)");

  // not live today → cannot start (returns false, no round)
  Date.now = () => offDayMs;
  els.game.classList.remove("active");
  ok(EP.start(liveId) === false, "an event that is not live today cannot be started");
  ok(!els.game.classList.contains("active"), "a non-live event never opens a round");
  Date.now = realDateNow;
})();

// ============ T92 — reward tiers are skip-proof + recurrence-upgradeable ====
(function eventTierDrive(){
  const DAYMS = 86400000, FIXED = Date.UTC(2026, 5, 21, 12, 0, 0);
  const liveId = Ev.today(FIXED).id;
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
  global.setTimeout = (fn) => { if(typeof fn === "function") fn(); return 0; }; global.clearTimeout = () => {};
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  const realNow = Date.now; let clock = FIXED; Date.now = () => clock;
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","main.js"].forEach(f => new Function(read(f))());
  const EP = global.window.EventPlay, MODES2 = global.window.MODES, set = global.window.Events.buildGauntlet(liveId, MODES2);
  const key = k => (els.pad._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".key" ? { dataset:{ k:String(k) } } : null) } }));
  function play(mode){ EP.start(liveId); for(let i=0;i<set.length;i++){ if(mode === "skip") key("skip"); else if(mode === "skipMost" && i > 0) key("skip"); else for(const ch of String(set[i].a)) key(ch); } }
  const own = id => !!JSON.parse(store["halves.collected"] || "{}")[id];

  // SKIP-THROUGH: skipping (almost) every question → ONLY participation, never well/ace
  play("skipMost");   // answer just Q1, skip the rest → clean fraction ≈ 1/N (< 0.7)
  ok(own("event:" + liveId), "a skip-through still earns the participation tier (completing it)");
  ok(!own("event:" + liveId + ":well") && !own("event:" + liveId + ":ace"), "a skip-through earns ONLY participation — well/ace are skip-proof");

  // RECURRENCE UPGRADE: 14 days later, a flawless run adds the higher tiers (kept ones stay)
  clock = FIXED + 14 * DAYMS;
  ok(global.window.Events.isLive(liveId), "the same event is live again 14 days on");
  play("flawless");
  ok(own("event:" + liveId) && own("event:" + liveId + ":well") && own("event:" + liveId + ":ace"),
     "improving on the recurrence earns well + ace without removing participation");
  Date.now = realNow;
})();

// ============ T80 — best-attempt board + live-window lockout ================
(function eventBoardDrive(){
  const DAYMS = 86400000;
  const FIXED = Date.UTC(2026, 5, 21, 12, 0, 0);
  const liveId = Ev.today(FIXED).id;
  const otherId = Ev.roster().find(e => e.id !== liveId).id;   // not live on FIXED

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
  global.setTimeout = (fn) => { if(typeof fn === "function") fn(); return 0; }; global.clearTimeout = () => {};
  global.window.setTimeout = global.setTimeout; global.window.clearTimeout = global.clearTimeout;
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  const realDateNow = Date.now; let clock = FIXED; Date.now = () => clock;
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","main.js"].forEach(f => new Function(read(f))());
  const EP = global.window.EventPlay, Events2 = global.window.Events, MODES2 = global.window.MODES;
  function key(k){ (els.pad._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".key" ? { dataset:{ k } } : null) } })); }
  function play(skipFirst){
    EP.start(liveId);
    const set = Events2.buildGauntlet(liveId, MODES2);
    for(let i=0;i<set.length;i++){
      if(skipFirst && i === 0){ key("skip"); continue; }
      for(const ch of String(set[i].a)) key(ch);
    }
  }
  const renderBoard = () => { global.window.location.hash = "#/best-times"; (winH.hashchange||[]).forEach(f=>f()); return els.sumList._html; };

  // (a) isRetryable iff live today
  ok(EP.isRetryable(liveId) === true, "isRetryable(today's event) is true");
  ok(EP.isRetryable(otherId) === false, "isRetryable(a non-live event) is false");

  // (b) play once with a deliberate skip → a beatable best is stored
  play(true);
  const total = Events2.buildGauntlet(liveId, MODES2).length;
  const b1 = EP.bestOf(liveId);
  ok(b1 && b1.score === total - 1, "best attempt recorded with the skipped-question score (" + (b1 && b1.score) + "/" + total + ")");

  // (c) the board lists event entries: one LIVE (routable) + locked ones (not)
  let h = renderBoard();
  ok(/Daily Events/.test(h), "the board has a Daily Events section");
  ok(new RegExp('sum-row event played[^>]*data-event="' + liveId + '"').test(h), "today's event renders LIVE + routable (data-event)");
  ok((h.match(/sum-row event locked/g) || []).length === 13, "the other 13 events render LOCKED");
  ok(!/sum-row event locked[^>]*data-event/.test(h), "locked event rows carry NO data-event (not routable)");
  ok(new RegExp(liveId).test(h) && new RegExp('' + (total - 1) + '/' + total).test(h), "the live row shows the persisted best attempt");
  // tapping the live row routes into play
  els.game.classList.remove("active");
  (els.sumList._h.click||[]).forEach(f=>f({ target:{ closest:s => (s === ".sum-row.event[data-event]" ? { dataset:{ event:liveId } } : null) } }));
  ok(els.game.classList.contains("active"), "tapping the live event row starts the gauntlet");
  // abandon that round cleanly
  global.window.location.hash = "#/"; (winH.hashchange||[]).forEach(f=>f());

  // (d) best persists across the 14-day recurrence and is beatable
  clock = FIXED + 14 * DAYMS;                       // same event live again
  ok(Events2.isLive(liveId), "14 days later the same event is live again");
  ok(EP.bestOf(liveId) && EP.bestOf(liveId).score === total - 1, "the prior best persisted across the 14-day gap");
  h = renderBoard();
  ok(new RegExp('sum-row event played[^>]*data-event="' + liveId + '"').test(h), "on recurrence the event is routable again");
  play(false);                                      // full clean run beats the prior best
  const b2 = EP.bestOf(liveId);
  ok(b2 && b2.score === total, "beating it on recurrence updates the stored best (" + (b2 && b2.score) + "/" + total + ")");
  ok(!!JSON.parse(store["halves.collected"] || "{}")["event:" + liveId], "reward still owned after the recurrence replay (idempotent)");

  // (e) lockout: when NOT live, the event is locked on the board and unplayable
  clock = FIXED + DAYMS;                             // next UTC day → liveId not live
  ok(EP.isRetryable(liveId) === false, "off its day the event is not retryable");
  h = renderBoard();
  ok(!new RegExp('data-event="' + liveId + '"').test(h), "off its day the event row carries no data-event (locked, not routable)");
  ok((h.match(/sum-row event locked/g) || []).length === 13 && !new RegExp('data-event="' + liveId + '"').test(h),
     "off its day our event is locked (a different one is the day's live event)");
  Date.now = realDateNow;
})();

// ============ T81 — presentation: art + copy + music + home banner ==========
// (j) per-event procedural emblem art — distinct across all 14, deterministic, static.
function serArt(g){ return g.map(r => r.join("")).join("|"); }
const artGrids = Ev.ROSTER.map(e => serArt(EA.buildGrid(e.artSeed)));
let artDistinct = 0, artPairs = 0;
for(let i=0;i<artGrids.length;i++) for(let j=i+1;j<artGrids.length;j++){ artPairs++; if(artGrids[i] !== artGrids[j]) artDistinct++; }
ok(artDistinct / artPairs >= 0.9, "event emblems are ≥90% pairwise distinct (" + artDistinct + "/" + artPairs + ")");
ok(Ev.ROSTER.every(e => serArt(EA.buildGrid(e.artSeed)) === serArt(EA.buildGrid(e.artSeed))), "event emblem art is deterministic per artSeed");
const dim = EA.buildGrid(1);
ok(dim.length === EA.ROWS && dim[0].length === EA.COLS, "emblem grid has the declared dimensions");
ok(/^#[0-9a-f]{6}$/i.test(dim[0][0]), "emblem cells are hex colours");
const artSrc = read("eventart.js");
ok(!/requestAnimationFrame|setInterval|setTimeout/.test(artSrc), "eventart.js is static (no RAF/timers)");

// (k) the carry-over T80 fixup — no invalid var(--amber)1f remains; a valid weak amber exists.
const css = read("styles.css"), main2 = read("main.js");
ok(!/var\(--amber\)1f/.test(main2) && !/var\(--amber\)1f/.test(css), "the invalid 'var(--amber)1f' tint is gone (T80 fixup)");
ok(/--amber-weak\s*:\s*rgba\(/.test(css) && /var\(--amber-weak\)/.test(main2), "the live row uses a valid low-alpha --amber-weak");

// (l) event music theme — calm + in the volume envelope, distinct key.
const sound = read("sound.js");
ok(/EVENT_STYLE/.test(sound) && /"event"/.test(sound), "sound.js defines a dedicated event theme + 'event' key");

// (m) the prominent home banner is a TOP-LEVEL #start element (not inside a tab/menu),
//     carries art + copy + a Play CTA that routes into the live event + a UTC countdown.
const html2 = read("index.html");
ok(/<section id="start"[\s\S]*?id="eventBanner"[\s\S]*?id="modeTree"/.test(html2),
   "the event banner is on the home (#start) screen, above the topic tree — not in a tab/menu");
ok(/<script src="eventart\.js">/.test(html2), "index.html loads eventart.js");
ok(/function renderEventBanner/.test(main2) && /eb-play/.test(main2) && /data-event="/.test(main2),
   "renderEventBanner builds the banner with a Play CTA carrying the live event id");
ok(/EventArt\.draw\(cv/.test(main2), "the banner draws the event's procedural emblem");
ok(/function updateEventCountdown/.test(main2) && /epochDaysUTC\(now\) \+ 1\) \* Ev\.DAY_MS/.test(main2),
   "the banner shows a countdown to the 00:00 UTC rollover");
ok(/\.eb-play/.test(main2) && /startEvent\(b\.dataset\.event\)/.test(main2), "tapping the banner Play CTA routes into startEvent");
// no Arena event-gate explanatory UI crept in (owner: explicitly unwanted)
ok(!/next event in|needs? an event|event-gate/i.test(main2), "no Arena event-gate explanation UI was added");

// (T91) the home banner is a COMPACT strip that can't dominate the one-screen #start:
ok(/\.event-banner\{[^}]*max-height\s*:\s*\d/.test(css), "(T91) the event banner has a bounded max-height (compact strip)");
ok(!/eb-blurb/.test(main2) && !/eb-blurb/.test(css), "(T91) the home banner drops the multi-line blurb (no eb-blurb)");
ok(/\.tree\{[^}]*min-height\s*:\s*(?!0)\d/.test(css), "(T91/T96) the home tree keeps a non-zero min-height (≥ a few rows; can't be starved to nothing)");
// the banner sits at the very top of #start, above the tree (T96)
ok(/<section id="start"[\s\S]*?id="eventBanner"[\s\S]*?id="modeTree"/.test(html2),
   "(T91/T96) the banner sits at the very top of #start, above the topic tree");
// the compact banner still carries the Play CTA + the inline countdown span
ok(/eb-play[\s\S]{0,80}data-event=/.test(main2) && /id="ebCount"/.test(main2),
   "(T91) the compact banner keeps the Play CTA + the UTC countdown");

console.log("\n" + (fails === 0 ? "ALL " + checks + " EVENT CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
