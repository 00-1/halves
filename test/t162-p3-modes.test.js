/* T162 P3 — the extension drill modes (`cubes`, `money`, `digitsum`) + the
 * doubles/halves range-check. Per-mode logic gate: items match the calibration
 * spec (docs/agent/T162-calibration.md): a fixed set, every prompt a non-empty
 * string, every answer a FINITE non-negative NUMBER in range, mathematically
 * CORRECT under the documented formula, numpad-clean (≤8 chars incl. decimal),
 * wired into the tree without breaking the single-child branch model. Also
 * confirms the doubles/halves sets reach the 2-digit ×2±1 atom (mock Q5).
 *
 * Run: node test/t162-p3-modes.test.js
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

function numpadLen(a){ return String(a).length; }
function isCleanNumber(a){ return typeof a === "number" && isFinite(a) && a >= 0 && numpadLen(a) <= 8; }
function distinctPrompts(qs){ return new Set(qs.map(q => q.p)).size === qs.length; }

const P3_IDS = ["cubes", "money", "digitsum"];

// ---- (1) all three modes exist + are wired into the tree correctly ----------
P3_IDS.forEach(id => {
  const m = byId(id);
  ok(!!m, "(1) mode `" + id + "` exists");
  if(!m) return;
  ok(typeof m.name === "string" && m.name && typeof m.tag === "string" && m.tag, "(1) `" + id + "` has name + tag");
  ok(typeof m.build === "function", "(1) `" + id + "` exports build()");
  ok(typeof m.masterSecs === "number" && m.masterSecs > 0 && m.masterSecs < 30, "(1) `" + id + "` masterSecs is sensible (" + m.masterSecs + ")");
  ok(MODE_GROUPS.indexOf(m.group) >= 0, "(1) `" + id + "` group `" + m.group + "` is a known MODE_GROUPS section");
  ok(Array.isArray(m.glyphTokens) && m.glyphTokens.length, "(1) `" + id + "` has structured glyphTokens (T56)");
  ok(typeof m.requires === "string" && /^mastery:/.test(m.requires), "(1) `" + id + "` is a branch (off-spine) — requires:`" + m.requires + "`");
  const gateId = m.requires.replace(/^mastery:/, "");
  ok(!!byId(gateId), "(1) `" + id + "`'s mastery gate `" + gateId + "` is a real mode");
});

// ---- (2) every mode produces unique, well-formed items ----------------------
// (cubes is intentionally a SMALL set per the calibration — "small fixed set + mixed review".)
P3_IDS.forEach(id => {
  const m = byId(id); if(!m) return;
  const qs = m.build();
  const minN = id === "cubes" ? 6 : 21;
  ok(qs.length >= minN, "(2) `" + id + "` builds enough items (" + qs.length + " ≥ " + minN + ")");
  ok(qs.every(q => typeof q.p === "string" && q.p.length > 0), "(2) `" + id + "` every prompt is a non-empty string");
  ok(qs.every(q => isCleanNumber(q.a)), "(2) `" + id + "` every answer is a finite, non-negative number ≤8 numpad chars");
  ok(distinctPrompts(qs), "(2) `" + id + "` all prompts are distinct (no duplicate)");
});

// ---- (3) cubes: every answer is n³ ------------------------------------------
(function checkCubes(){
  const m = byId("cubes"); if(!m) return;
  const qs = m.build();
  let formulaOk = 0, rangeOk = 0;
  qs.forEach(q => {
    const mm = /^(\d+)³$/.exec(q.p);
    if(!mm) return;
    const n = +mm[1];
    if(q.a === n * n * n) formulaOk++;
    if(n >= 2 && n <= 10) rangeOk++;
  });
  ok(formulaOk === qs.length, "(3) cubes: every answer = n³ — math matches the prompt (" + formulaOk + "/" + qs.length + ")");
  ok(rangeOk === qs.length, "(3) cubes: every n ∈ [2,10] (the calibrated band; answers ≤ 1000)");
})();

// ---- (4) money: totals (n×£p) and change (£F − £O), both 2dp ----------------
(function checkMoney(){
  const m = byId("money"); if(!m) return;
  const qs = m.build();
  let formulaOk = 0, mul = 0, chg = 0;
  qs.forEach(q => {
    let mm = /^(\d+) × £(\d+\.\d{2})$/.exec(q.p);
    if(mm){
      mul++;
      const n = +mm[1], p = +mm[2];
      if(Math.abs(q.a - Math.round(n * p * 100) / 100) < 1e-9) formulaOk++;
      return;
    }
    mm = /^change from £(\d+) of £(\d+\.\d{2})$/.exec(q.p);
    if(mm){
      chg++;
      const F = +mm[1], O = +mm[2];
      if(Math.abs(q.a - Math.round((F - O) * 100) / 100) < 1e-9) formulaOk++;
      return;
    }
  });
  ok(formulaOk === qs.length, "(4) money: every answer = n·price (total) OR £F − £O (change) — math matches (" + formulaOk + "/" + qs.length + ")");
  ok(mul >= 6 && chg >= 6, "(4) money: prompt mix exercises BOTH totals and change (× " + mul + ", change " + chg + ")");
  ok(qs.every(q => { const s = String(q.a); const d = s.indexOf("."); return d < 0 || (s.length - d - 1) <= 2; }), "(4) money: every answer is ≤ 2 decimal places (clean £.pp)");
  // a change item never goes negative (price ≤ the note)
  ok(qs.every(q => q.a >= 0), "(4) money: change is never negative (price ≤ the note)");
  // T213 2b — the live matcher is `parseFloat(input) === answer`, so trailing-zero
  // money keystrokes (£4.00, £1.90) must round-trip to the stored literal. Verify
  // every money answer is accepted in BOTH its plain form and its 2-dp £ form.
  ok(qs.every(q => parseFloat(q.a.toFixed(2)) === q.a && parseFloat(String(q.a)) === q.a),
     "(4) money: matcher accepts trailing-zero forms — £4.00 ≡ 4 and £1.90 ≡ 1.9 (parseFloat round-trip)");
})();

// ---- (5) digitsum: digit sum + remainder ÷ 9 (the divisibility mechanic) ----
function digitSum(n){ return String(n).split("").reduce((s, c) => s + (+c), 0); }
(function checkDigitSum(){
  const m = byId("digitsum"); if(!m) return;
  const qs = m.build();
  let formulaOk = 0, sumN = 0, remN = 0;
  qs.forEach(q => {
    let mm = /^digit sum of (\d+)$/.exec(q.p);
    if(mm){
      sumN++;
      if(q.a === digitSum(+mm[1])) formulaOk++;
      return;
    }
    mm = /^remainder (\d+) ÷ 9$/.exec(q.p);
    if(mm){
      remN++;
      const N = +mm[1];
      // the whole point: N mod 9 == digitSum(N) mod 9
      if(q.a === N % 9 && q.a === digitSum(N) % 9) formulaOk++;
      return;
    }
  });
  ok(formulaOk === qs.length, "(5) digitsum: every answer = sum-of-digits OR N mod 9 (== digitSum mod 9) — math matches (" + formulaOk + "/" + qs.length + ")");
  ok(sumN >= 6 && remN >= 6, "(5) digitsum: prompt mix exercises BOTH the digit-sum AND the ÷9-remainder (sum " + sumN + ", rem " + remN + ")");
  ok(qs.every(q => { const mm = /(\d+)/.exec(q.p); return mm && +mm[1] >= 100; }), "(5) digitsum: every N is ≥ 3 digits (the calibrated band)");
})();

// ---- (6) the doubles/halves range check reaches the 2-digit ×2±1 atom -------
(function checkRangeCheck(){
  const d = byId("doubles"), h = byId("halves");
  const dq = d.build(), hq = h.build();
  // mock Q5 atom: 4,9,19,39 is ×2+1 → needs fluent double 39 = 78 and half 78 = 39.
  ok(dq.some(q => q.p === "39" && q.a === 78), "(6) doubles reaches the 2-digit atom: double 39 = 78 (mock Q5 support)");
  ok(hq.some(q => q.p === "78" && q.a === 39), "(6) halves reaches the 2-digit atom: half 78 = 39 (mock Q5 support)");
  // and every halve/double answer stays numpad-clean
  ok(dq.every(q => isCleanNumber(q.a)) && hq.every(q => isCleanNumber(q.a)), "(6) the extended doubles/halves answers stay numpad-clean");
})();

// ---- (7) no two modes share the same `requires` parent (linear tree) -------
(function checkTreeShape(){
  const branchCount = {};
  MODES.forEach(m => { if(m.requires){ const p = m.requires.replace(/^mastery:/, ""); branchCount[p] = (branchCount[p] || 0) + 1; } });
  const collisions = Object.keys(branchCount).filter(p => branchCount[p] > 1);
  ok(collisions.length === 0, "(7) no two modes share the same `requires` parent — the linear branchOf model holds (collisions: " + collisions.join(",") + ")");
  const spine = MODES.filter(m => !m.requires).length;
  const branches = MODES.filter(m => m.requires).length;
  ok(spine + branches === MODES.length, "(7) every mode is either a spine node or a branch (" + spine + "+" + branches + "=" + MODES.length + ")");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " T162-P3 CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
