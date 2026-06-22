/* T59 — Wave-2 Batch A: the two NEW spine topics `rounding` + `largermd` (Larger
 * ×/÷). Genuinely new content — no overlap with the T162 mock modes. Per-mode
 * logic gate (spec: docs/research-11plus.md): a fixed curated set, every prompt a
 * non-empty string, every answer a FINITE non-negative NUMBER, mathematically
 * CORRECT under the documented rule, numpad-clean (≤8 chars), and each EXTENDS THE
 * SPINE (unlockedBy) — so it's a 1-wide tree row (T170 ≤4 invariant unaffected).
 *
 * Run: node test/t59-modes.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
new Function(read("modes.js"))();
const MODES = global.window.MODES;
const MODE_GROUPS = global.window.MODE_GROUPS;
const byId = id => MODES.find(m => m.id === id);
function isClean(a){ return typeof a === "number" && isFinite(a) && a >= 0 && String(a).length <= 8; }

// ---- (1) both topics exist + EXTEND THE SPINE (unlockedBy, not requires) -----
["rounding", "largermd"].forEach(id => {
  const m = byId(id);
  ok(!!m, "(1) mode `" + id + "` exists");
  if(!m) return;
  ok(m.name && m.tag && typeof m.build === "function", "(1) `" + id + "` has name + tag + build()");
  ok(typeof m.masterSecs === "number" && m.masterSecs > 0, "(1) `" + id + "` has a sensible masterSecs (" + m.masterSecs + ")");
  ok(MODE_GROUPS.indexOf(m.group) >= 0, "(1) `" + id + "` group `" + m.group + "` is known");
  ok(Array.isArray(m.glyphTokens) && m.glyphTokens.length, "(1) `" + id + "` has glyphTokens");
  // T59 topics extend the SPINE — unlockedBy a real mode, NOT a `requires` branch.
  ok(typeof m.unlockedBy === "string" && !!byId(m.unlockedBy) && !m.requires, "(1) `" + id + "` extends the spine via unlockedBy=`" + m.unlockedBy + "` (no `requires`)");
  const qs = m.build();
  ok(qs.length >= 20, "(1) `" + id + "` builds a full curated set (" + qs.length + ")");
  ok(qs.every(q => typeof q.p === "string" && q.p.length > 0 && isClean(q.a)), "(1) `" + id + "` every item is a non-empty prompt + a clean numeric answer");
  ok(new Set(qs.map(q => q.p)).size === qs.length, "(1) `" + id + "` all prompts distinct");
});

// ---- (2) rounding: every answer is N rounded to the stated unit --------------
(function checkRounding(){
  const m = byId("rounding"); if(!m) return;
  const qs = m.build();
  let formulaOk = 0, unitOk = 0;
  qs.forEach(q => {
    const mm = /^(\d+) to nearest (\d+)$/.exec(q.p);
    if(!mm) return;
    const n = +mm[1], u = +mm[2];
    if(q.a === Math.round(n / u) * u) formulaOk++;
    if(u === 10 || u === 100 || u === 1000) unitOk++;
  });
  ok(formulaOk === qs.length, "(2) rounding: every answer = round(N/unit)·unit — math matches (" + formulaOk + "/" + qs.length + ")");
  ok(unitOk === qs.length, "(2) rounding: every unit is 10/100/1000 (the calibrated set)");
  // a curated set avoids the .5 tie so the answer is unambiguous
  ok(qs.every(q => { const mm = /^(\d+) to nearest (\d+)$/.exec(q.p); const n = +mm[1], u = +mm[2]; return (n % u) !== u / 2; }), "(2) rounding: no item sits exactly on the half-way tie (unambiguous)");
})();

// ---- (3) largermd: 2-digit × 1-digit and clean 2-digit ÷ 1-digit -------------
(function checkLargerMd(){
  const m = byId("largermd"); if(!m) return;
  const qs = m.build();
  let formulaOk = 0, mul = 0, div = 0;
  qs.forEach(q => {
    const mm = /^(\d+) ([×÷]) (\d+)$/.exec(q.p);
    if(!mm) return;
    const a = +mm[1], op = mm[2], b = +mm[3];
    if(op === "×"){ mul++; if(q.a === a * b) formulaOk++; }
    else { div++; if(q.a === a / b && Number.isInteger(a / b)) formulaOk++; }
  });
  ok(formulaOk === qs.length, "(3) largermd: every answer = a×b or a÷b (clean) — math matches (" + formulaOk + "/" + qs.length + ")");
  ok(mul >= 8 && div >= 6, "(3) largermd: prompt mix exercises BOTH × and ÷ (× " + mul + ", ÷ " + div + ")");
  // 2-digit operand (the "larger" point) for the × items
  ok(qs.every(q => { const mm = /^(\d+) ([×÷]) (\d+)$/.exec(q.p); return mm && +mm[1] >= 10; }), "(3) largermd: the first operand is ≥ 2 digits (the 'larger' multiplication/division)");
})();

// ---- (4) the spine grew by exactly these two; the topic count is consistent --
(function(){
  const spine = MODES.filter(m => !m.requires);
  ok(spine.some(m => m.id === "rounding") && spine.some(m => m.id === "largermd"), "(4) both new topics are on the spine");
  // largermd unlocks after rounding which unlocks after squares (the prior spine tail)
  ok(byId("rounding").unlockedBy === "squares" && byId("largermd").unlockedBy === "rounding", "(4) the spine extends squares → rounding → largermd");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " T59 CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
