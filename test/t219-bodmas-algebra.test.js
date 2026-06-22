/* T219 batch 3 (Reasoning group) — `bodmas` (order of operations) + `algebra`
 * (function machines). Per-mode logic gate: fixed curated pool, non-empty prompts,
 * finite non-negative numpad-clean answers, each re-derived INDEPENDENTLY from the
 * prompt — BODMAS via a precedence-respecting eval, the machine via a LEFT-TO-RIGHT
 * sequential apply — distinct prompts, single-child branch on a real parent, guide
 * + answer-free hint.
 * Run: node test/t219-bodmas-algebra.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
["modes.js", "guides.js"].forEach(f => new Function(read(f))());
const MODES = global.window.MODES, MODE_GROUPS = global.window.MODE_GROUPS, G = global.window.Guides;
const byId = id => MODES.find(m => m.id === id);
function isCleanInt(a){ return typeof a === "number" && Number.isInteger(a) && a >= 0 && String(a).length <= 8; }

// independent BODMAS eval — JS operator precedence + brackets IS BODMAS
function evalBodmas(p){ return Function('"use strict";return (' + p.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-") + ')')(); }
// independent function-machine eval — apply each op LEFT TO RIGHT, sequentially
function evalMachine(p){
  const parts = p.split("→").map(s => s.trim());
  let v = +parts[0];
  for(let i = 1; i < parts.length; i++){
    const op = parts[i][0], n = +parts[i].slice(1);
    v = op === "×" ? v * n : op === "÷" ? v / n : op === "+" ? v + n : v - n;
  }
  return v;
}

// ---- (1) both modes exist + are single-child Reasoning branches --------------
["bodmas", "algebra"].forEach(id => {
  const m = byId(id);
  ok(!!m, "(1) mode `" + id + "` exists");
  if(!m) return;
  ok(m.name && m.tag && typeof m.build === "function", "(1) `" + id + "` has name + tag + build()");
  ok(typeof m.masterSecs === "number" && m.masterSecs > 0 && m.masterSecs < 30, "(1) `" + id + "` masterSecs sensible (" + m.masterSecs + ")");
  ok(m.group === "Reasoning" && MODE_GROUPS.indexOf(m.group) >= 0, "(1) `" + id + "` is in the Reasoning group");
  ok(Array.isArray(m.glyphTokens) && m.glyphTokens.length, "(1) `" + id + "` has glyphTokens");
  ok(typeof m.requires === "string" && /^mastery:/.test(m.requires) && !!byId(m.requires.replace("mastery:", "")), "(1) `" + id + "` branches off a real parent (" + m.requires + ")");
  const parent = m.requires.replace("mastery:", "");
  ok(MODES.filter(x => x.requires === "mastery:" + parent).length === 1, "(1) `" + id + "` is the ONLY child of `" + parent + "`");
});

// ---- (2) well-formed, distinct, numpad-clean integer items -------------------
["bodmas", "algebra"].forEach(id => {
  const m = byId(id); if(!m) return;
  const qs = m.build();
  ok(qs.length >= 20, "(2) `" + id + "` builds a full curated set (" + qs.length + ")");
  ok(qs.every(q => typeof q.p === "string" && q.p.length > 0 && isCleanInt(q.a)), "(2) `" + id + "` every item is a non-empty prompt + clean non-negative integer answer");
  ok(new Set(qs.map(q => q.p)).size === qs.length, "(2) `" + id + "` all prompts distinct");
});

// ---- (3) bodmas: every answer = an independent precedence-correct eval --------
(function(){
  const m = byId("bodmas"); if(!m) return;
  const qs = m.build();
  let good = 0;
  qs.forEach(q => { try{ if(evalBodmas(q.p) === q.a) good++; }catch(e){} });
  ok(good === qs.length, "(3) bodmas: every answer matches an independent BODMAS eval (" + good + "/" + qs.length + ")");
})();

// ---- (4) algebra: every answer = the LEFT-TO-RIGHT sequential machine ---------
(function(){
  const m = byId("algebra"); if(!m) return;
  const qs = m.build();
  let good = 0, neg = 0;
  qs.forEach(q => {
    // every intermediate step must also stay non-negative (numpad-enterable mid-way)
    const parts = q.p.split("→").map(s => s.trim()); let v = +parts[0], okStep = true;
    for(let i = 1; i < parts.length; i++){ const op = parts[i][0], n = +parts[i].slice(1); v = op === "×" ? v*n : op === "÷" ? v/n : op === "+" ? v+n : v-n; if(v < 0) okStep = false; }
    if(!okStep) neg++;
    if(evalMachine(q.p) === q.a) good++;
  });
  ok(good === qs.length, "(4) algebra: every answer = the left-to-right machine output (" + good + "/" + qs.length + ")");
  ok(neg === 0, "(4) algebra: no intermediate step goes negative (numpad-safe throughout)");
})();

// ---- (5) each has a Guide + an answer-free, non-empty method hint -------------
["bodmas", "algebra"].forEach(id => {
  const m = byId(id); if(!m) return;
  ok(G.has(id), "(5) `" + id + "` has a Guide");
  const qs = m.build();
  let leak = 0, empty = 0;
  qs.forEach(q => {
    const h = G.explain(id, q);
    if(!h || h === "Picture the method and work it through one step at a time.") empty++;
    if(h && (h.match(/\d+(?:\.\d+)?/g) || []).map(Number).some(t => t === q.a)) leak++;
  });
  ok(empty === 0, "(5) `" + id + "` explain() is tailored (non-empty, non-fallback) for every item");
  ok(leak === 0, "(5) `" + id + "` explain() never reveals the answer");
});

console.log("\n" + (fails === 0 ? "ALL " + checks + " T219-BATCH-3 CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
