/* T229 — content-as-data parity gate. Re-runs the export from the LIVE
 * gg1/dev/modes.js and asserts the COMMITTED content/gg1/* files still match it
 * exactly — so the engine-agnostic content seam (which the brickmap port consumes)
 * can never silently drift from the runtime. Also re-derives the parity vectors
 * straight from the live `build()` to prove they reproduce GG1's full question set.
 * Run: node test/content-parity.test.js
 */
const fs = require("fs"), path = require("path");
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

const exporter = require("../tools/content-export.js");
const { OUT_DIR, OUT_FILES } = exporter;
const fresh = exporter.buildExport();

// ---- (1) committed files match a fresh regeneration (the drift gate) ---------
Object.keys(OUT_FILES).forEach(f => {
  const p = path.join(OUT_DIR, f);
  let disk = null; try{ disk = fs.readFileSync(p, "utf8"); }catch(e){}
  ok(disk !== null, "(1) committed content/gg1/" + f + " exists");
  ok(disk === OUT_FILES[f], "(1) content/gg1/" + f + " matches a fresh export (no runtime↔data drift — run `node tools/content-export.js`)");
});

// ---- (2) structural sanity --------------------------------------------------
const modes = fresh.modes, vectors = fresh.vectors;
ok(modes.length === 46, "(2) modes.json covers all 46 modes (" + modes.length + ")");
ok(modes.every(m => m.id && m.name && typeof m.expr === "boolean" && Array.isArray(m.pool) && m.transform),
   "(2) every mode record has id + name + expr + pool[] + transform");
ok(modes.every(m => m.unlock === null || ("mastery" in m.unlock) || ("by" in m.unlock)),
   "(2) every unlock is null | {mastery} | {by}");
ok(Object.keys(vectors).length === modes.length, "(2) parity-vectors covers exactly the same modes");
const total = Object.values(vectors).reduce((n, v) => n + v.length, 0);
ok(total === 959, "(2) the full deterministic question set is 959 {p,a} pairs (" + total + ")");
ok(Object.values(vectors).every(v => v.every(q => typeof q.p === "string" && q.p.length > 0 && typeof q.a === "number" && isFinite(q.a))),
   "(2) every parity pair is a non-empty prompt + a finite numeric answer");

// ---- (2b) T230 — guides.json: topics + answer-free explain-as-data -----------
const guides = fresh.guides;
ok(guides && Object.keys(guides.topics).length === 46, "(2b) guides.json has all 46 topic guides (" + (guides ? Object.keys(guides.topics).length : 0) + ")");
ok(Object.values(guides.topics).every(g => g && g.intro && Array.isArray(g.tips) && g.tips.length && g.example),
   "(2b) every guide has intro + tips[] + example");
ok(Object.keys(guides.explain).length === 46, "(2b) explain-as-data covers all 46 modes");
const explainTotal = Object.values(guides.explain).reduce((n, e) => n + Object.keys(e).length, 0);
ok(explainTotal >= 900, "(2b) explain captured for ~every question (" + explainTotal + " entries)");
ok(Object.values(guides.explain).every(e => Object.values(e).every(s => typeof s === "string" && s.length > 0)),
   "(2b) every explain entry is a non-empty string");
// answer-free invariant: the exported hint for a question never contains its answer as a token
let leak = 0;
modes.forEach(m => (vectors[m.id] || []).forEach(q => {
  const h = guides.explain[m.id] && guides.explain[m.id][q.p];
  if(h && (h.match(/\d+(?:\.\d+)?/g) || []).map(Number).some(t => t === q.a)) leak++;
}));
ok(leak === 0, "(2b) every exported explain hint is answer-free (no leak in " + explainTotal + " entries)");

// ---- (2c) T230 — collectibles.json: catalogue + Collector-ladder invariant ----
const coll = fresh.collectibles;
ok(coll && coll.total === 2352, "(2c) collectibles.json catalogues the full " + (coll ? coll.total : "?") + "-item set");
ok(coll.catalog.length === coll.total && coll.catalog.every(it => !("test" in it)),
   "(2c) every catalogue item is serialised WITHOUT its `test` predicate (behaviour stays in code)");
ok(Object.values(coll.categories).reduce((n, c) => n + c, 0) === coll.total, "(2c) category counts sum to the total");
const tiers = coll.collectorLadder.tiers;
ok(tiers.length === 12 && tiers.every((t, i) => i === 0 || t.n > tiers[i - 1].n), "(2c) the Collector ladder is 12 strictly-ascending tiers");
ok(coll.collectorLadder.emblems.length === 3, "(2c) the 3 boss emblems are recorded");
ok(coll.collectorLadder.capstone < coll.collectorLadder.catalogTotal && coll.collectorLadder.capstoneReachable === true,
   "(2c) the capstone (" + coll.collectorLadder.capstone + ") is below the catalogue total (" + coll.collectorLadder.catalogTotal + ") — reachable invariant holds");

// ---- (2d) T232 — balance.json: gold tuning + enemy tiers + hero stats ---------
const bal = fresh.balance;
ok(bal && bal.gold && bal.enemies && bal.heroes, "(2d) balance.json has gold + enemies + heroes sections");
ok(bal.gold.spending === "none", "(2d) gold is earn/hoard/display only (no spending, T26)");
ok(bal.gold.scalars.HOARD_G === 2.5 && bal.gold.scalars.GOLD_EMPTY === 500 && bal.gold.scalars.GOLD_FULL === 1e15,
   "(2d) gold scalars extracted from main.js (HOARD_G=2.5, EMPTY=500, FULL=1e15)");
ok(["questionGold", "roundBonusGold", "tierGold", "goldMult", "hoardMult", "hoardLevel"].every(k => typeof bal.gold.formulas[k] === "string" && /^function /.test(bal.gold.formulas[k])),
   "(2d) all 6 gold reward formulas captured as fn source");
ok(bal.gold.firstTimeBonuses.mastery === 50 && bal.gold.firstTimeBonuses.topic100 === 100,
   "(2d) first-time bonuses (mastery 50, topic100 100) extracted");
ok(bal.enemies.tiers.length === 120 && bal.enemies.tierCount === 120 && bal.enemies.regionSize === 12,
   "(2d) the 120-tier enemy ladder is captured (" + bal.enemies.tiers.length + ")");
ok(bal.enemies.tiers.every((t, i) => t.n === i + 1 && t.name && t.type),
   "(2d) every enemy tier has n (ascending) + name + type");
ok(bal.heroes.roster.length === 12 && bal.heroes.roster.every(h => h.base && ["power", "guard", "speed", "focus"].every(s => typeof h.base[s] === "number")),
   "(2d) all 12 heroes carry base power/guard/speed/focus stats");

// ---- (3) the committed vectors are reproducible from the LIVE build() --------
// Independent of the export object: load modes.js afresh, run build(), sort, compare.
global.window = {};
new Function("window", fs.readFileSync(path.join(__dirname, "..", "gg1/dev/modes.js"), "utf8"))(global.window);
const MODES = global.window.MODES;
const keyOf = q => JSON.stringify([q.p, q.a]);
const sortV = a => a.map(q => ({ p: q.p, a: q.a })).sort((x, y) => (keyOf(x) < keyOf(y) ? -1 : keyOf(x) > keyOf(y) ? 1 : 0));
let mism = 0;
MODES.forEach(m => {
  const got = sortV(m.build());
  if(JSON.stringify(got) !== JSON.stringify(vectors[m.id])) mism++;
});
ok(mism === 0, "(3) every committed parity vector equals a fresh sorted build() of the live mode (" + (MODES.length - mism) + "/" + MODES.length + ")");

// ---- (4) the export reads (never writes) the runtime --------------------------
ok(/gg1\/dev\/modes\.js/.test(fs.readFileSync(path.join(__dirname, "..", "tools/content-export.js"), "utf8")) &&
   !/writeFileSync[\s\S]{0,120}gg1\/dev/.test(fs.readFileSync(path.join(__dirname, "..", "tools/content-export.js"), "utf8")),
   "(4) the exporter reads gg1/dev and never writes into the runtime (non-destructive)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " CONTENT-PARITY CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
