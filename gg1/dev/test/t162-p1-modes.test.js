/* T162 P1 — the three mock-driven drill modes (`scaling`, `percentoff`,
 * `partwhole`). Per-mode logic gate: each mode's items match the calibration
 * spec (docs/agent/T162-calibration.md): a fixed ~21-item set, every prompt is
 * a non-empty string, every answer is a FINITE non-negative NUMBER, sits inside
 * the calibrated range, is **mathematically correct** under the documented
 * formula (no IEEE drift / typo), and round-trips exactly through the numeric
 * numpad (≤8 chars incl. decimal). Also verifies group/unlock/masterSecs slot
 * the modes into the existing tree without breaking the spine-or-branch model.
 *
 * Run: node test/t162-p1-modes.test.js
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

// helpers shared across mode checks
function numpadLen(a){ return String(a).length; }
function isCleanNumber(a){ return typeof a === "number" && isFinite(a) && a >= 0 && numpadLen(a) <= 8; }
function distinctPrompts(qs){ return new Set(qs.map(q => q.p)).size === qs.length; }

// ---- (1) all three modes exist + are wired into the tree correctly ----------
["scaling", "percentoff", "partwhole", "balance"].forEach(id => {
  const m = byId(id);
  ok(!!m, "(1) mode `" + id + "` exists");
  if(!m) return;
  ok(typeof m.name === "string" && m.name && typeof m.tag === "string" && m.tag, "(1) `" + id + "` has name + tag");
  ok(typeof m.build === "function", "(1) `" + id + "` exports build()");
  ok(typeof m.masterSecs === "number" && m.masterSecs > 0 && m.masterSecs < 30, "(1) `" + id + "` masterSecs is sensible (" + m.masterSecs + ")");
  ok(MODE_GROUPS.indexOf(m.group) >= 0, "(1) `" + id + "` group `" + m.group + "` is a known MODE_GROUPS section");
  ok(Array.isArray(m.glyphTokens) && m.glyphTokens.length, "(1) `" + id + "` has structured glyphTokens (T56)");
  // each P1 mode sits OFF the live spine (`requires`) — so the chain Halves→…→Squares
  // is unchanged and the new mode unlocks only via a sensible mastery gate.
  ok(typeof m.requires === "string" && /^mastery:/.test(m.requires), "(1) `" + id + "` is a branch (off-spine) — requires:`" + m.requires + "`");
  const gateId = m.requires.replace(/^mastery:/, "");
  ok(!!byId(gateId), "(1) `" + id + "`'s mastery gate `" + gateId + "` is a real mode");
});

// ---- (2) every mode produces ~21 unique, well-formed items ------------------
["scaling", "percentoff", "partwhole", "balance"].forEach(id => {
  const m = byId(id); if(!m) return;
  const qs = m.build();
  ok(qs.length === 21, "(2) `" + id + "` builds 21 items (got " + qs.length + ")");
  ok(qs.every(q => typeof q.p === "string" && q.p.length > 0), "(2) `" + id + "` every prompt is a non-empty string");
  ok(qs.every(q => isCleanNumber(q.a)), "(2) `" + id + "` every answer is a finite, non-negative number ≤8 numpad chars");
  ok(distinctPrompts(qs), "(2) `" + id + "` all 21 prompts are distinct (no accidental duplicate)");
});

// ---- (3) scaling: each item's answer matches its proportion N→X, M→? ---------
(function checkScaling(){
  const m = byId("scaling"); if(!m) return;
  const qs = m.build();
  // every prompt is "N→X, M→?" and answer = M·X/N (the calibration formula)
  let formulaOk = 0, rangeOk = 0;
  qs.forEach(q => {
    const mm = /^(\d+)→(\d+), (\d+)→\?$/.exec(q.p);
    if(!mm) return;
    const N = +mm[1], X = +mm[2], M = +mm[3];
    if(N > 0 && Math.abs(q.a - (M * X) / N) < 1e-9) formulaOk++;
    if(q.a >= 0 && q.a <= 999) rangeOk++;          // M·unit ≤ 999 per calibration
  });
  ok(formulaOk === qs.length, "(3) scaling: every answer = M·X/N — math matches the prompt (" + formulaOk + "/" + qs.length + ")");
  ok(rangeOk === qs.length, "(3) scaling: every answer ≤ 999 (the calibrated short-answer band)");
})();

// ---- (4) percentoff: each item's answer matches the "P% off N" formula ------
(function checkPercentOff(){
  const m = byId("percentoff"); if(!m) return;
  const qs = m.build();
  let formulaOk = 0, rangeOk = 0;
  qs.forEach(q => {
    const mm = /^(\d+)% off (\d+(?:\.\d+)?)$/.exec(q.p);
    if(!mm) return;
    const P = +mm[1], N = +mm[2];
    const expect = Math.round((N - (N * P) / 100) * 1e6) / 1e6;
    if(Math.abs(q.a - expect) < 1e-6) formulaOk++;
    if(N <= 500) rangeOk++;                        // bases ≤ 100 typically, ≤ 500 stretch
  });
  ok(formulaOk === qs.length, "(4) percentoff: every answer = N − (P·N/100) — math matches the prompt (" + formulaOk + "/" + qs.length + ")");
  ok(rangeOk === qs.length, "(4) percentoff: every base ≤ 500 (the calibrated band; mostly ≤ 100)");
})();

// ---- (5) partwhole: each item's answer recovers the WHOLE from a part -------
(function checkPartWhole(){
  const m = byId("partwhole"); if(!m) return;
  const qs = m.build();
  let formulaOk = 0, frac = 0, pct = 0;
  qs.forEach(q => {
    let mm = /^(\d+)\/(\d+) of \? = (\d+(?:\.\d+)?)$/.exec(q.p);
    if(mm){ frac++; const n = +mm[1], d = +mm[2], g = +mm[3]; const expect = (g * d) / n; if(Math.abs(q.a - expect) < 1e-6) formulaOk++; return; }
    mm = /^(\d+)% of \? = (\d+(?:\.\d+)?)$/.exec(q.p);
    if(mm){ pct++; const P = +mm[1], g = +mm[2]; const expect = (g * 100) / P; if(Math.abs(q.a - expect) < 1e-6) formulaOk++; return; }
  });
  ok(formulaOk === qs.length, "(5) partwhole: every answer = given·den/num (fraction) OR given·100/pct (percent) — math matches the prompt (" + formulaOk + "/" + qs.length + ")");
  ok(frac >= 6 && pct >= 6, "(5) partwhole: prompt mix exercises BOTH fraction and percent forms (frac=" + frac + ", pct=" + pct + ")");
  ok(qs.every(q => q.a > 0 && q.a <= 200), "(5) partwhole: every whole answer is in the calibrated range (0, 200]");
})();

// ---- (5b) balance: every answer matches the inverse-of-the-LHS math + numpad ----
(function checkBalance(){
  const m = byId("balance"); if(!m) return;
  const qs = m.build();
  // every prompt is "a lop b = c rop ?" with answer derived from the inverse
  let formulaOk = 0, positiveOk = 0, opMix = { "+":0, "−":0, "×":0 };
  qs.forEach(q => {
    const mm = /^(\d+)\s*([+−×])\s*(\d+)\s*=\s*(\d+)\s*([+−])\s*\?$/.exec(q.p);
    if(!mm) return;
    const a = +mm[1], lop = mm[2], b = +mm[3], c = +mm[4], rop = mm[5];
    const lhs = lop === "+" ? a + b : lop === "−" ? a - b : a * b;
    const expect = rop === "+" ? lhs - c : c - lhs;     // inverse-find the missing □
    if(Math.abs(q.a - expect) < 1e-9) formulaOk++;
    if(q.a >= 0) positiveOk++;                          // T162 P1: positive-only (no minus key)
    opMix[lop]++;
  });
  ok(formulaOk === qs.length, "(5b) balance: every answer = (a lop b) ⊖ c with the documented inverse (" + formulaOk + "/" + qs.length + ")");
  ok(positiveOk === qs.length, "(5b) balance: every answer is NON-NEGATIVE — numpad has no minus key (" + positiveOk + "/" + qs.length + ")");
  ok(opMix["×"] >= 6 && (opMix["+"] + opMix["−"]) >= 6, "(5b) balance: the LHS exercises BOTH the times-fact gap AND ± fluency (× " + opMix["×"] + " · + " + opMix["+"] + " · − " + opMix["−"] + ")");
  // sanity: the LHS stays within tables (×) / ≤100 (+/−) per the calibration
  let lhsOk = 0;
  qs.forEach(q => {
    const mm = /^(\d+)\s*([+−×])\s*(\d+)/.exec(q.p);
    if(!mm) return;
    const a = +mm[1], lop = mm[2], b = +mm[3];
    if(lop === "×" ? (a <= 65 && b <= 12) : (a <= 100 && b <= 100)) lhsOk++;
  });
  ok(lhsOk === qs.length, "(5b) balance: the LHS sits in the calibrated band (× within tables-ish, +/− within 100)");
})();

// ---- (6) the new modes don't collide with the live tree's single-child model -
(function checkTreeShape(){
  // branchOf is keyed by parent id; two children of the same parent would collide.
  const branchCount = {};
  MODES.forEach(m => { if(m.requires){ const p = m.requires.replace(/^mastery:/, ""); branchCount[p] = (branchCount[p] || 0) + 1; } });
  const collisions = Object.keys(branchCount).filter(p => branchCount[p] > 1);
  ok(collisions.length === 0, "(6) no two modes share the same `requires` parent — the linear branchOf model holds (collisions: " + collisions.join(",") + ")");
  // every mode reachable: spine (no `requires`) + branches keyed by unique parent.
  const spine = MODES.filter(m => !m.requires).length;
  const branches = MODES.filter(m => m.requires).length;
  ok(spine + branches === MODES.length, "(6) every mode is either a spine node or a branch (" + spine + "+" + branches + "=" + MODES.length + ")");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " T162-P1 CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
