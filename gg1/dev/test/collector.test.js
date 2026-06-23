/* T206 + T219-LAST — Collector awards rejig. The collect-N ladder is recalibrated to
 * the REAL catalogue: the old unreachable top tiers (2,500/5,000/7,500/10,000) are
 * dropped and the top tier tracks the live catalogue total (re-pointed from 1,900 to
 * ≈2,350 once the new T219 topics grew the catalogue); the reachable ids (25…1500) are
 * preserved (migration-safe). B's 3
 * creature EMBLEMS (beast/goblinking/voidbeast, T205) are absorbed as Collector
 * awards — Collector now totals 12 + 3 = 15 — earned by felling region bosses (the
 * meta:{tier} evaluator), NOT the collect-count ladder, and rendered from
 * window.Emblems at the award-cell size.
 * Run: node test/collector.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
["modes.js","events.js","collectibles.js"].forEach(f => new Function(read(f))());
const C = global.window.Collectibles;
const main = read("main.js");

const collector = C.CATALOG.filter(it => it.cat === "Collector");
const ladder = collector.filter(it => it.n != null).map(it => it.n).sort((a,b)=>a-b);
const emblems = collector.filter(it => it.emblem);

// ---- (1) the ladder is recalibrated to the real catalogue --------------------
ok(collector.length === 15, "(1) Collector totals 15 (12 ladder + 3 emblems) — got " + collector.length);
ok(ladder.length === 12, "(1) the collect-N ladder is 12 tiers (" + ladder.length + ")");
ok(ladder[0] === 25, "(1) the ladder still starts at 25");
ok(![2500,5000,7500,10000].some(n => ladder.includes(n)), "(1) the UNREACHABLE tiers (2,500/5,000/7,500/10,000) are dropped");
const top = ladder[ladder.length-1], total = C.CATALOG.length;
ok(top <= total && top >= total - 60, "(1) the top tier (" + top + ") tracks the full catalogue (" + total + ") — reachable at ≈100% collection");
ok(ladder.every((n,i)=> i===0 || n > ladder[i-1]), "(1) tiers strictly ascending, no dups");
ok(["collector:25","collector:75","collector:150","collector:300","collector:500","collector:750","collector:1000","collector:1500"].every(id => C.byId(id)),
   "(1) all reachable existing ids (25…1500) are preserved (migration-safe)");

// ---- (2) the collect-count ladder grants exactly tiers ≤ count, never emblems --
const grantedN = (count) => C.evaluateCollector(count, () => false).map(it => it.n).sort((a,b)=>a-b);
[0, 24, 25, 1000, 1499, 1900, top - 1, top, 99999].forEach(count => {
  const got = grantedN(count), exp = ladder.filter(n => n <= count);
  ok(JSON.stringify(got) === JSON.stringify(exp), "(2) count " + count + " grants exactly the ladder tiers ≤ count (" + got.length + ")");
});
ok(C.evaluateCollector(99999, () => false).every(it => it.emblem == null), "(2) the collect-count ladder NEVER grants the emblem awards (they have no n)");

// ---- (3) the 3 creature emblems are boss(meta)-gated Collector awards ----------
ok(emblems.length === 3, "(3) exactly 3 creature-emblem Collector awards");
ok(["beast","goblinking","voidbeast"].every(e => emblems.some(it => it.emblem === e)), "(3) they are B's 3 creatures (beast/goblinking/voidbeast)");
ok(emblems.every(it => it.cat === "Collector" && it.n == null && it.meta && it.meta.tier), "(3) each is cat:Collector, has NO n, and a meta.tier boss trigger");
const bossTiers = emblems.map(it => it.meta.tier);
const has = id => bossTiers.map(t => "tier:"+t).includes(id);
const metaGot = C.evaluateMeta(0, 12, has).filter(it => it.emblem).map(it => it.emblem).sort();
ok(JSON.stringify(metaGot) === JSON.stringify(["beast","goblinking","voidbeast"].sort()), "(3) felling their region bosses grants all 3 via evaluateMeta (" + metaGot.join(",") + ")");
ok(C.evaluateMeta(0, 12, () => false).filter(it => it.emblem).length === 0, "(3) with no bosses felled, none are granted");

// ---- (4) rendering: emblem awards draw from window.Emblems at the cell size -----
ok(/it\.emblem && window\.Emblems[\s\S]{0,40}Emblems\.draw\(cv, it\.emblem\)/.test(main), "(4) drawInvCanvases routes emblem awards to window.Emblems.draw");
ok(/it\.emblem && window\.Emblems[\s\S]{0,90}Emblems\.draw\(cell\.querySelector\("canvas"\), it\.emblem\)/.test(main), "(4) the detail modal also renders emblem awards via window.Emblems.draw");

// ---- (5) the Codex EMBLEMS section is removed ----------------------------------
ok(!/codexGroup\("Emblems"/.test(main), "(5) the Codex Emblems section is gone (emblems are Collector awards now)");
ok(!/codex:"emblem"/.test(main), "(5) no codex emblem cells remain");

console.log("\n" + (fails === 0 ? "ALL " + checks + " COLLECTOR CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
