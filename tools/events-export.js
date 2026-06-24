/* T233c — export GG1's daily EVENTS (content + schedule + deterministic gauntlet) as data + vectors.
 * The event-play half of the metagame: a 14-event roster on a UTC-day rotation, each a deterministic
 * cross-topic gauntlet with participation/well/ace reward tiers. Vectors are generated from the LIVE
 * Events module (buildGauntlet/indexFor) → byte-identical question sets + schedule, same method as the
 * transforms (T229). The well/ace thresholds live in main.js, so they're transcribed + source-gated.
 * Run:  node tools/events-export.js   (writes content/gg1/events*.json)
 * Test: require('./events-export').generate() → {events, vectors}  (drift + source gate). */
"use strict";
const fs = require("fs"), path = require("path");
const DEV = path.join(__dirname, "..", "gg1", "dev");
const readDev = n => fs.readFileSync(path.join(DEV, n + ".js"), "utf8");

function build(){
  const window = {};
  window.Emblems = { draw(){}, has: () => false, list: () => [] };
  window.performance = { now: () => 0 };
  const load = n => new Function("window", readDev(n))(window);
  load("modes"); load("heroes"); load("events"); load("collectibles");
  return { Ev: window.Events, MODES: window.MODES };
}

// transcribed from main.js eventTiersEarned (the well/ace thresholds live there, not in events.js);
// the test source-gates these exact constants/lines so a drift in main.js forces a regen.
const EVENT_WELL_FRAC = 0.7;
function eventTiersEarned(eid, score, total){
  const frac = total ? score / total : 0, ids = ["event:" + eid];
  if(frac >= EVENT_WELL_FRAC) ids.push("event:" + eid + ":well");
  if(total > 0 && score === total) ids.push("event:" + eid + ":ace");
  return ids;
}

function generate(){
  const { Ev, MODES } = build();
  const ROSTER = Ev.ROSTER, L = ROSTER.length;

  // ---- (1) DATA — the events content + schedule + reward rules ---------------
  const events = {
    _note: "GG1 daily Events (events.js + main.js reward tiers). Schedule + gauntlet proven by events-vectors.json.",
    _schedule: "Deterministic from the UTC day: epochDay = floor(now_ms / DAY_MS); index = ((epochDay % " + L +
      ") + " + L + ") % " + L + " → ROSTER[index] is live. Anchor: epochDay 0 (1970-01-01 UTC) = ROSTER[0]; the " +
      L + "-event set recurs every " + L + " days. No backend/clock baked in (now is injected).",
    _rewards: "On finishing an event (eventTiersEarned, main.js): always grant event:<id> (participation = " +
      "completion); grant event:<id>:well if score/total >= " + EVENT_WELL_FRAC + "; grant event:<id>:ace if a " +
      "flawless run (total>0 && score===total). score = #solved (skips never enter it; qMiss vestigial → solved == " +
      "clean). Events pay NO gold — the reward IS the buff item. Live-window only: startEvent requires isLive(id).",
    _gauntlet: "buildGauntlet(eventId, modes): seed = (hashStr(eventId) ^ (artSeed>>>0))>>>0 → mulberry32. For each " +
      "questionMix {topic,n}: pool = modes[topic].build() sorted to a TOTAL order (localeCompare numeric, tiebreak " +
      "raw string), seededShuffle the indices, take n → {p,a,topic}. Then seededShuffle the combined set (themed " +
      "interleave). Fully deterministic (same set every play + every recurrence). Answers come from the curated " +
      "topic sets (the same {p,a} the transforms export pins).",
    dayMs: Ev.DAY_MS, rotation: L, wellFrac: EVENT_WELL_FRAC,
    roster: ROSTER.map(e => ({ id: e.id, name: e.name, theme: e.theme, blurb: e.blurb,
      questionMix: e.questionMix, reward: e.reward, rewardWell: e.rewardWell, rewardAce: e.rewardAce,
      rarity: e.rarity, artSeed: e.artSeed, musicSeed: e.musicSeed })),
  };

  // ---- (2) parity VECTORS ----------------------------------------------------
  const vectors = { gauntlet: {}, schedule: [], tiers: [] };

  // gauntlet: the exact deterministic question set per event (the byte-identical proof)
  for(const e of ROSTER) vectors.gauntlet[e.id] = Ev.buildGauntlet(e.id, MODES);

  // schedule: indexFor sweep — boundaries, negatives, a recurrence, a real ~2026 day
  const DAY = Ev.DAY_MS;
  for(const day of [0, 1, 7, 13, 14, 15, 27, 28, 41, -1, -13, -14, -15, 20453, 99999])
    vectors.schedule.push({ epochDay: day, ms: day * DAY, index: Ev.indexFor(day * DAY), liveId: Ev.today(day * DAY).id });

  // tiers: eventTiersEarned over the 0.7 well boundary + the perfect-ace edge
  for(const total of [10, 13, 14])
    for(const score of [0, 1, Math.ceil(total * 0.7) - 1, Math.ceil(total * 0.7), total - 1, total])
      vectors.tiers.push({ eid: "halving-moon", score, total, ids: eventTiersEarned("halving-moon", score, total) });

  return { events, vectors };
}

if(require.main === module){
  const { events, vectors } = generate();
  fs.writeFileSync(path.join(__dirname, "..", "content", "gg1", "events.json"), JSON.stringify(events, null, 1) + "\n");
  fs.writeFileSync(path.join(__dirname, "..", "content", "gg1", "events-vectors.json"), JSON.stringify(vectors) + "\n");
  const nq = Object.values(vectors.gauntlet).reduce((s, a) => s + a.length, 0);
  console.log("wrote content/gg1/events.json + events-vectors.json — events", events.roster.length,
    "gauntlet-questions", nq, "schedule", vectors.schedule.length, "tiers", vectors.tiers.length);
}
module.exports = { generate };
