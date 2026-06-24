/* T233c events parity gate:
 *   (1) DRIFT: regenerate from gg1/dev → equals the committed JSON byte-for-byte.
 *   (2) SOURCE FIDELITY: the schedule + gauntlet seed (events.js) and the well/ace thresholds
 *       (main.js) still match the exact source lines the export encodes.
 *   (3) INVARIANTS: gauntlet honours the questionMix, the schedule rotation is correct, and the
 *       reward tiers fire at the 0.7/perfect boundaries.
 * Run: node test/events-parity.test.js */
"use strict";
const fs = require("fs"), path = require("path");
const { generate } = require("../tools/events-export");

let fails = 0;
const ok = (c, m) => { if(!c){ console.error("FAIL:", m); fails++; } else console.log("ok:", m); };
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const { events, vectors } = generate();

// (1) drift
ok(read("content/gg1/events.json") === JSON.stringify(events, null, 1) + "\n", "events.json matches regenerate");
ok(read("content/gg1/events-vectors.json") === JSON.stringify(vectors) + "\n", "events-vectors.json matches regenerate");

// (2) source fidelity
const mj = read("gg1/dev/main.js"), ej = read("gg1/dev/events.js");
[
  ["main.js EVENT_WELL_FRAC", mj, "const EVENT_WELL_FRAC = 0.7;"],
  ["main.js well tier", mj, 'if(frac >= EVENT_WELL_FRAC) ids.push("event:" + eid + ":well");'],
  ["main.js ace tier", mj, 'if(total > 0 && score === total) ids.push("event:" + eid + ":ace");'],
  ["events.js indexFor", ej, "return ((epochDaysUTC(now) % L) + L) % L;"],
  ["events.js gauntlet seed", ej, "const rnd = mulberry32((hashStr(eventId) ^ ((ev.artSeed || 0) >>> 0)) >>> 0);"],
].forEach(([label, src, s]) => ok(src.includes(s), "source fidelity: " + label));

// (3a) gauntlet honours the questionMix (count per topic + total), every q well-formed
ok(events.roster.length === 14 && Object.keys(vectors.gauntlet).length === 14, "14 events, 14 gauntlets");
for(const e of events.roster){
  const g = vectors.gauntlet[e.id];
  const want = e.questionMix.reduce((s, q) => s + q.n, 0);
  ok(g.length === want, `gauntlet ${e.id}: ${g.length} questions == Σ questionMix.n (${want})`);
  const mixTopics = new Set(e.questionMix.map(q => q.topic));
  ok(g.every(q => q.p != null && q.a != null && mixTopics.has(q.topic)), `gauntlet ${e.id}: every q has p/a and a mix topic`);
  e.questionMix.forEach(q => ok(g.filter(x => x.topic === q.topic).length === q.n, `gauntlet ${e.id}: ${q.n}× ${q.topic}`));
}

// (3b) schedule rotation: index = ((day % rotation)+rotation)%rotation, liveId = roster[index]
const R = events.rotation;
ok(vectors.schedule.every(s => s.index === ((s.epochDay % R) + R) % R), "schedule: index = ((day%R)+R)%R");
ok(vectors.schedule.every(s => s.liveId === events.roster[s.index].id), "schedule: liveId === roster[index]");
ok(vectors.schedule.find(s => s.epochDay === 0).index === 0, "schedule anchor: epochDay 0 → roster[0]");
ok(vectors.schedule.find(s => s.epochDay === 14).index === vectors.schedule.find(s => s.epochDay === 0).index,
   "schedule: day 14 recurs to day 0 (14-day cycle)");
ok(vectors.schedule.find(s => s.epochDay === -1).index === R - 1, "schedule: negative day wraps (−1 → roster[13])");

// (3c) reward tiers fire at the 0.7 / perfect boundaries
ok(vectors.tiers.every(t => t.ids[0] === "event:" + t.eid), "tiers: participation always granted");
ok(vectors.tiers.every(t => (t.ids.includes("event:" + t.eid + ":well")) === (t.total > 0 && t.score / t.total >= 0.7)),
   "tiers: well iff score/total >= 0.7");
ok(vectors.tiers.every(t => (t.ids.includes("event:" + t.eid + ":ace")) === (t.total > 0 && t.score === t.total)),
   "tiers: ace iff a flawless run");

console.log(fails ? `\n${fails} FAIL` : "\nALL EVENTS PARITY CHECKS PASS");
process.exit(fails ? 1 : 0);
