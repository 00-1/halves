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
