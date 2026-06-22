/* T60 / T61 — Wave-2 Batch B: the two remaining genuinely-NEW spine topics
 * `metric` (Measures: mm/cm/m/km, g/kg, ml/l conversions) and `sequences`
 * (Reasoning: next-term + nth-term value). The rest of the original T60/T61 brief
 * (Money / Time / Ratio / Mean) already shipped in T162, so building those again
 * would duplicate live modes — this batch is the non-overlapping remainder only.
 *
 * Per-mode logic gate (spec: docs/research-11plus.md): a fixed curated set, every
 * prompt a non-empty string, every answer a FINITE non-negative NUMBER, numpad-
 * clean (≤8 chars, no minus/colon, terminating), mathematically CORRECT under the
 * documented rule, and each EXTENDS THE SPINE (unlockedBy) — a 1-wide tree row
 * (T170 ≤4-abreast invariant unaffected).
 *
 * Run: node test/t60-t61-modes.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
new Function(read("modes.js"))();
new Function(read("guides.js"))();
const MODES = global.window.MODES;
const MODE_GROUPS = global.window.MODE_GROUPS;
const Guides = global.window.Guides;
const byId = id => MODES.find(m => m.id === id);
// numpad-clean: a finite non-negative number whose literal has no minus/colon/exponent and ≤ 8 chars.
function isClean(a){ return typeof a === "number" && isFinite(a) && a >= 0 && String(a).length <= 8 && !/[:e-]/i.test(String(a)); }

// ---- (1) both topics exist + EXTEND THE SPINE (unlockedBy, not requires) ------
["metric", "sequences"].forEach(id => {
  const m = byId(id);
  ok(!!m, "(1) mode `" + id + "` exists");
  if(!m) return;
  ok(m.name && m.tag && typeof m.build === "function", "(1) `" + id + "` has name + tag + build()");
  ok(typeof m.masterSecs === "number" && m.masterSecs > 0, "(1) `" + id + "` has a sensible masterSecs (" + m.masterSecs + ")");
  ok(MODE_GROUPS.indexOf(m.group) >= 0, "(1) `" + id + "` group `" + m.group + "` is known");
  ok(Array.isArray(m.glyphTokens) && m.glyphTokens.length, "(1) `" + id + "` has glyphTokens");
  ok(typeof m.unlockedBy === "string" && !!byId(m.unlockedBy) && !m.requires, "(1) `" + id + "` extends the spine via unlockedBy=`" + m.unlockedBy + "` (no `requires`)");
  const qs = m.build();
  ok(qs.length >= 20, "(1) `" + id + "` builds a full curated set (" + qs.length + ")");
  ok(qs.every(q => typeof q.p === "string" && q.p.length > 0 && isClean(q.a)), "(1) `" + id + "` every item is a non-empty prompt + a clean numeric answer");
  ok(new Set(qs.map(q => q.p)).size === qs.length, "(1) `" + id + "` all prompts distinct");
  // numpad has no minus or colon key — prompts may show units/words but answers must be enterable
  ok(qs.every(q => !/[:]/.test(String(q.a))), "(1) `" + id + "` no answer needs a colon (numpad-safe)");
});

// ---- (2) metric: every answer = n × the metric step factor -------------------
(function checkMetric(){
  const m = byId("metric"); if(!m) return;
  const qs = m.build();
  // smaller-unit conversions multiply; bigger-unit conversions divide (×/÷ 10/100/1000).
  const FACTOR = { "km-m":1000, "m-cm":100, "cm-mm":10, "kg-g":1000, "l-ml":1000,
                   "m-km":0.001, "cm-m":0.01, "mm-cm":0.1, "g-kg":0.001, "ml-l":0.001 };
  let formulaOk = 0, knownUnits = 0, mul = 0, div = 0;
  qs.forEach(q => {
    const mm = /^([\d.]+) (\w+) in (\w+)$/.exec(q.p);
    if(!mm) return;
    const n = +mm[1], f = FACTOR[mm[2] + "-" + mm[3]];
    if(f !== undefined){ knownUnits++; if(f >= 1) mul++; else div++; }
    if(f !== undefined && Math.abs(n * f - q.a) <= 1e-9) formulaOk++;
  });
  ok(formulaOk === qs.length, "(2) metric: every answer = n × step factor (×/÷ 10/100/1000) — math matches (" + formulaOk + "/" + qs.length + ")");
  ok(knownUnits === qs.length, "(2) metric: every prompt uses a known metric unit pair");
  ok(mul >= 6 && div >= 6, "(2) metric: the set drills BOTH directions (smaller→multiply " + mul + ", bigger→divide " + div + ")");
  // decimal answers must be TERMINATING literals (no IEEE drift / no recurring)
  ok(qs.every(q => Number.isInteger(q.a) || /^\d+\.\d{1,3}$/.test(String(q.a))), "(2) metric: decimal answers are short terminating literals (numpad-clean)");
})();

// ---- (3) sequences: next-term (linear) + nth-term value ----------------------
(function checkSequences(){
  const m = byId("sequences"); if(!m) return;
  const qs = m.build();
  let nextOk = 0, nthOk = 0, nextN = 0, nthN = 0;
  qs.forEach(q => {
    const nx = /^next: ([\d,\s]+)$/.exec(q.p);
    if(nx){ nextN++;
      const nums = nx[1].split(",").map(s => +s.trim());
      const d = nums[1] - nums[0];
      let linear = true; for(let i = 2; i < nums.length; i++) if(nums[i] - nums[i-1] !== d) linear = false;
      if(linear && q.a === nums[nums.length-1] + d) nextOk++;
      return;
    }
    const nth = /^(\d+)n(?: ([+−]) (\d+))?, term (\d+)$/.exec(q.p);
    if(nth){ nthN++;
      const M = +nth[1], sign = nth[2] === "−" ? -1 : 1, add = nth[3] ? +nth[3] : 0, k = +nth[4];
      if(q.a === M * k + sign * add) nthOk++;
    }
  });
  ok(nextN >= 8 && nthN >= 8, "(3) sequences: the set mixes next-term and nth-term items (next " + nextN + ", nth " + nthN + ")");
  ok(nextOk === nextN, "(3) sequences: every next-term item is genuinely linear and answer = last + step (" + nextOk + "/" + nextN + ")");
  ok(nthOk === nthN, "(3) sequences: every nth-term answer = M·k ± A (" + nthOk + "/" + nthN + ")");
  ok(nextN + nthN === qs.length, "(3) sequences: every prompt parses as one of the two forms");
})();

// ---- (4) the spine grew by exactly these two; correct groups -----------------
(function(){
  const spine = MODES.filter(m => !m.requires);
  ok(spine.some(m => m.id === "metric") && spine.some(m => m.id === "sequences"), "(4) both new topics are on the spine");
  ok(byId("metric").unlockedBy === "largermd" && byId("sequences").unlockedBy === "metric", "(4) the spine extends largermd → metric → sequences");
  ok(byId("metric").group === "Measures", "(4) metric is a Measures topic");
  ok(byId("sequences").group === "Reasoning", "(4) sequences is a Reasoning topic");
})();

// ---- (5) each has a Guide + an answer-free, non-empty method hint -------------
["metric", "sequences"].forEach(id => {
  const m = byId(id); if(!m) return;
  ok(Guides.has(id), "(5) `" + id + "` has a Guide entry");
  const qs = m.build();
  let leak = 0, empty = 0;
  qs.forEach(q => {
    const h = Guides.explain(id, q);
    if(!h) empty++;
    // the hint must never contain the answer as a standalone numeric token
    if(h && h.split(/[^\d.]+/).filter(Boolean).some(t => t === String(q.a))) leak++;
  });
  ok(empty === 0, "(5) `" + id + "` explain() is non-empty for every item");
  ok(leak === 0, "(5) `" + id + "` explain() never reveals the answer (method-only)");
});

console.log("\n" + (fails === 0 ? "ALL " + checks + " T60/T61 CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
