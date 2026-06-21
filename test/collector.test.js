/* T55 — Collector award ladder extends to 10,000; threshold grants stay correct
 * and the existing collector:25/75/150 ids are preserved (migration-safe).
 * Run: node test/collector.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
["modes.js","events.js","collectibles.js"].forEach(f => new Function(read(f))());
const C = global.window.Collectibles;

const tiers = C.CATALOG.filter(it => it.cat === "Collector").map(it => it.n).sort((a,b)=>a-b);
ok(tiers[0] === 25, "the ladder still starts at 25");
ok(tiers[tiers.length-1] === 10000, "the ladder tops out at 10,000");
ok(tiers.length >= 10, "the ladder is a long ramp (" + tiers.length + " tiers)");
ok(tiers.every((n,i)=> i===0 || n > tiers[i-1]), "tiers strictly ascending, no dups");
// migration-safe ids
ok(["collector:25","collector:75","collector:150"].every(id => C.byId(id)), "existing ids collector:25/75/150 preserved");
ok(C.byId("collector:150").name !== "Completionist", "the 150 tier is renamed off 'Completionist' (" + C.byId("collector:150").name + ")");

// evaluateCollector: grants exactly the tiers with n <= count, none above, none owned
const grantedN = (count, owned) => C.evaluateCollector(count, id => !!(owned && owned[id])).map(it => it.n).sort((a,b)=>a-b);
function expectAtMost(count){ return tiers.filter(n => n <= count); }
[0, 24, 25, 200, 1000, 3000, 9999, 10000, 99999].forEach(count => {
  const got = grantedN(count, {}), exp = expectAtMost(count);
  ok(JSON.stringify(got) === JSON.stringify(exp), "count " + count + " grants exactly tiers ≤ count (" + (got.length) + ")");
});
// large count grants nothing above 10000 (no tier exists) and includes all
ok(grantedN(99999, {}).length === tiers.length, "a huge count grants every tier and no phantom tier");
// owned tiers are not re-awarded
const owned = { "collector:25":1, "collector:75":1, "collector:1000":1 };
const re = grantedN(3000, owned);
ok(!re.includes(25) && !re.includes(75) && !re.includes(1000), "already-owned tiers are not re-granted");
ok(re.includes(150) && re.includes(2500), "still grants the newly-passed unowned tiers");

// descriptions format thousands with commas
ok(/Collect 2,500 items\./.test(C.byId("collector:2500").desc) && /Collect 10,000 items\./.test(C.byId("collector:10000").desc),
   "descriptions format thousands (e.g. 'Collect 2,500 items.')");
// names are varied (no two identical, and not a single repeated construction)
const names = tiers.map(n => C.byId("collector:"+n).name);
ok(new Set(names).size === names.length, "all collector names are distinct");

console.log("\n" + (fails === 0 ? "ALL " + checks + " COLLECTOR CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
