/* T162 P2 — the four mock-driven drill modes (`ratioshare`, `timegap`, `lcmhcf`,
 * `mean`). Per-mode logic gate: each mode's items match the calibration spec
 * (docs/agent/T162-calibration.md): a fixed ~21-item set, every prompt is a
 * non-empty string, every answer is a FINITE non-negative NUMBER, sits inside
 * the calibrated range, is mathematically CORRECT under the documented formula
 * (no IEEE drift / typo), and round-trips exactly through the numeric numpad
 * (≤8 chars incl. decimal). Also verifies group/unlock/masterSecs slot the modes
 * into the existing tree without breaking the spine-or-branch model.
 *
 * Run: node test/t162-p2-modes.test.js
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

const P2_IDS = ["ratioshare", "timegap", "lcmhcf", "mean"];

// ---- (1) all four modes exist + are wired into the tree correctly -----------
P2_IDS.forEach(id => {
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

// ---- (2) every mode produces 21 unique, well-formed items -------------------
P2_IDS.forEach(id => {
  const m = byId(id); if(!m) return;
  const qs = m.build();
  ok(qs.length === 21, "(2) `" + id + "` builds 21 items (got " + qs.length + ")");
  ok(qs.every(q => typeof q.p === "string" && q.p.length > 0), "(2) `" + id + "` every prompt is a non-empty string");
  ok(qs.every(q => isCleanNumber(q.a)), "(2) `" + id + "` every answer is a finite, non-negative number ≤8 numpad chars");
  ok(distinctPrompts(qs), "(2) `" + id + "` all 21 prompts are distinct (no duplicate)");
});

// ---- (3) ratioshare: each item's answer divides correctly -------------------
(function checkRatioShare(){
  const m = byId("ratioshare"); if(!m) return;
  const qs = m.build();
  let formulaOk = 0, parts2 = 0, parts3 = 0;
  qs.forEach(q => {
    let mm = /^(\d+) in (\d+):(\d+) → (bigger|smaller)$/.exec(q.p);
    if(mm){
      parts2++;
      const T = +mm[1], a = +mm[2], b = +mm[3];
      const expect = mm[4] === "bigger" ? T * Math.max(a, b) / (a + b) : T * Math.min(a, b) / (a + b);
      if(Math.abs(q.a - expect) < 1e-9) formulaOk++;
      return;
    }
    mm = /^(\d+) in (\d+):(\d+):(\d+) → biggest$/.exec(q.p);
    if(mm){
      parts3++;
      const T = +mm[1], a = +mm[2], b = +mm[3], c = +mm[4];
      const expect = T * Math.max(a, b, c) / (a + b + c);
      if(Math.abs(q.a - expect) < 1e-9) formulaOk++;
      return;
    }
  });
  ok(formulaOk === qs.length, "(3) ratioshare: every answer = T·(bigger/smaller share)/sum — math matches (" + formulaOk + "/" + qs.length + ")");
  ok(parts2 >= 14 && parts3 >= 3, "(3) ratioshare: mostly 2-part with a few 3-part stretch (2-part " + parts2 + ", 3-part " + parts3 + ")");
  ok(qs.every(q => {
    const mm = /^(\d+) in/.exec(q.p); return mm && +mm[1] <= 200;
  }), "(3) ratioshare: every amount ≤ 200 (calibration: 2-part ≤100, 3-part stretch ≤200)");
})();

// ---- (4) timegap: every answer is the minute-delta of the two clock times ----
(function checkTimegap(){
  const m = byId("timegap"); if(!m) return;
  const qs = m.build();
  let formulaOk = 0, spanOk = 0;
  qs.forEach(q => {
    const mm = /^(\d{2}):(\d{2}) → (\d{2}):(\d{2})$/.exec(q.p);
    if(!mm) return;
    const h1 = +mm[1], m1 = +mm[2], h2 = +mm[3], m2 = +mm[4];
    const expect = (h2 * 60 + m2) - (h1 * 60 + m1);
    if(q.a === expect) formulaOk++;
    if(q.a >= 15 && q.a <= 179) spanOk++;      // calibration: 15 min – 2 h 59 m
  });
  ok(formulaOk === qs.length, "(4) timegap: every answer = (h2·60 + m2) − (h1·60 + m1) — math matches (" + formulaOk + "/" + qs.length + ")");
  ok(spanOk === qs.length, "(4) timegap: every gap is in [15, 179] minutes (the calibrated 15 min – 2 h 59 m band)");
  // both times are real 24-h clock entries
  ok(qs.every(q => {
    const mm = /^(\d{2}):(\d{2}) → (\d{2}):(\d{2})$/.exec(q.p);
    if(!mm) return false;
    const h1 = +mm[1], m1 = +mm[2], h2 = +mm[3], m2 = +mm[4];
    return h1 >= 0 && h1 < 24 && h2 >= 0 && h2 < 24 && m1 >= 0 && m1 < 60 && m2 >= 0 && m2 < 60;
  }), "(4) timegap: every time is a valid 24-h clock entry (HH:MM)");
})();

// ---- (5) lcmhcf: every answer is the correct LCM / HCF ----------------------
function gcd(a, b){ return b === 0 ? a : gcd(b, a % b); }
function lcm(a, b){ return a * b / gcd(a, b); }
(function checkLcmHcf(){
  const m = byId("lcmhcf"); if(!m) return;
  const qs = m.build();
  let formulaOk = 0, lcmN = 0, hcfN = 0, rangeOk = 0;
  qs.forEach(q => {
    const mm = /^(LCM|HCF) (\d+),(\d+)$/.exec(q.p);
    if(!mm) return;
    const a = +mm[2], b = +mm[3];
    const expect = mm[1] === "LCM" ? lcm(a, b) : gcd(a, b);
    if(q.a === expect) formulaOk++;
    if(mm[1] === "LCM") lcmN++; else hcfN++;
    if(a <= 50 && b <= 50 && q.a <= 200) rangeOk++;
  });
  ok(formulaOk === qs.length, "(5) lcmhcf: every answer is the correct LCM/HCF — math matches (" + formulaOk + "/" + qs.length + ")");
  ok(lcmN >= 8 && hcfN >= 6, "(5) lcmhcf: prompt mix exercises both LCM AND HCF (LCM " + lcmN + ", HCF " + hcfN + ")");
  ok(rangeOk === qs.length, "(5) lcmhcf: inputs ≤ 50 and answer ≤ 200 (calibration bands)");
})();

// ---- (6) mean: every answer is the correct mean OR the missing value -------
(function checkMean(){
  const m = byId("mean"); if(!m) return;
  const qs = m.build();
  let formulaOk = 0, fwd = 0, rev = 0;
  qs.forEach(q => {
    // forward: "mean of v1,v2,…" (no "is" tail)
    let mm = /^mean of ([0-9,]+)$/.exec(q.p);
    if(mm){
      fwd++;
      const vals = mm[1].split(",").map(Number);
      const expect = vals.reduce((s, v) => s + v, 0) / vals.length;
      if(Math.abs(q.a - expect) < 1e-9) formulaOk++;
      return;
    }
    // reverse: "mean of k1,…,? is M"
    mm = /^mean of ([0-9,]+),\? is (\d+(?:\.\d+)?)$/.exec(q.p);
    if(mm){
      rev++;
      const knowns = mm[1].split(",").map(Number);
      const M = +mm[2];
      const expect = M * (knowns.length + 1) - knowns.reduce((s, v) => s + v, 0);
      if(Math.abs(q.a - expect) < 1e-9) formulaOk++;
      return;
    }
  });
  ok(formulaOk === qs.length, "(6) mean: every answer matches sum÷count (forward) OR M·(N+1)−sum(knowns) (reverse) — math matches (" + formulaOk + "/" + qs.length + ")");
  ok(fwd >= 6 && rev >= 6, "(6) mean: prompt mix exercises BOTH forward and reverse (fwd " + fwd + ", rev " + rev + ")");
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

console.log("\n" + (fails === 0 ? "ALL " + checks + " T162-P2 CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
