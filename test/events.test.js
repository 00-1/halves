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

console.log("\n" + (fails === 0 ? "ALL " + checks + " EVENT CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
