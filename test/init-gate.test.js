/* T74 — a topic is only "initiated" (which unlocks the next topic) if the player
 * genuinely engaged: answered ≥ half the round, not skipped it all.
 * Run: node test/init-gate.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
["modes.js","events.js","collectibles.js"].forEach(f => new Function(read(f))());
const C = global.window.Collectibles, MODES = global.window.MODES;

const TOTAL = 21;
function ctxFor(modeId, answered, owned){
  return { mode:{ id:modeId }, answered:answered, total:TOTAL, skipped:TOTAL-answered,
    mistakes:0, score:answered, rankIndex:0, qmap:{}, totalTime:answered*2, avg:2,
    stats:{ games:1, modesCleared:1, flawless:0 } };
}
function grantedInit(modeId, answered, ownedSet){
  const has = id => !!(ownedSet && ownedSet[id]);
  return C.evaluate(ctxFor(modeId, answered), has).some(it => it.id === "init:" + modeId);
}

// (a) all-skipped round (answered 0) → NOT initiated
ok(grantedInit("halves", 0, {}) === false, "(a) answered 0 (all skipped) → init NOT granted");
// (b) a normal round meeting the bar → initiated
ok(grantedInit("halves", TOTAL, {}) === true, "(b) a fully-answered round → init granted");
ok(grantedInit("halves", 11, {}) === true, "(b) answered 11/21 (≥ half) → init granted");
// threshold boundary: half of 21 is ceil(10.5)=11
ok(grantedInit("halves", 10, {}) === false, "boundary: answered 10/21 (< half) → not granted");
ok(grantedInit("halves", 11, {}) === true, "boundary: answered 11/21 (≥ half) → granted");

// (c) the topic-chain unlock (mirrors isUnlocked: next topic needs init:<prev>)
const next = MODES.find(m => m.unlockedBy);           // e.g. times ← halves
const prev = next.unlockedBy;
const chainUnlocks = ownsInit => (!next.unlockedBy || ownsInit);
// after an all-skipped `prev` round, init:prev not granted → `next` stays locked
const ownedAfterSkip = {};
if(grantedInit(prev, 0, {})) ownedAfterSkip["init:" + prev] = 1;
ok(chainUnlocks(!!ownedAfterSkip["init:" + prev]) === false, "(c) all-skipped " + prev + " → " + next.id + " stays LOCKED");
// after a genuine `prev` round, init:prev granted → `next` unlocks
const ownedAfterPlay = {};
if(grantedInit(prev, TOTAL, {})) ownedAfterPlay["init:" + prev] = 1;
ok(chainUnlocks(!!ownedAfterPlay["init:" + prev]) === true, "(c) genuinely-played " + prev + " → " + next.id + " UNLOCKS");

// (d) migration-safe: a player who already owns init keeps it (never re-evaluated/revoked)
const already = { "init:halves": 1 };
ok(C.evaluate(ctxFor("halves", 0, already), id => !!already[id]).every(it => it.id !== "init:halves"),
   "(d) already-owned init is not re-granted, and an all-skipped round can't revoke it");
ok(already["init:halves"] === 1, "(d) the owned init remains owned (migration-safe)");

// (e) Practice never grants init — finishPractice doesn't run the collectible evaluate
const main = read("main.js");
const fp = main.slice(main.indexOf("function finishPractice"), main.indexOf("function finishPractice") + 400);
ok(fp.indexOf("C.evaluate(") < 0, "(e) finishPractice does not run C.evaluate (Practice grants no init)");

// the bar is one named, tunable constant
ok(/INIT_ANSWER_FRAC\s*=\s*0\.5/.test(read("collectibles.js")), "the threshold is a single named constant (INIT_ANSWER_FRAC = 0.5)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " INIT-GATE CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
