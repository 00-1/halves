/* T219 batch 4 (Number group) — `xtricks` (mental ×-shortcuts) + `negatives`
 * (add/subtract across zero, non-negative answers). Per-mode logic gate: fixed
 * curated pool, non-empty prompts, finite non-negative numpad-clean answers, each
 * re-derived INDEPENDENTLY from the prompt, distinct prompts, single-child branch on
 * a real parent, guide + answer-free hint.
 * Run: node gg1/dev/test/t219-xtricks-negatives.test.js
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
function evalExpr(p){ return Function('"use strict";return (' + p.replace(/−/g, "-").replace(/×/g, "*") + ')')(); }

// ---- (1) both modes exist + are single-child Number branches ----------------
["xtricks", "negatives"].forEach(id => {
  const m = byId(id);
  ok(!!m, "(1) mode `" + id + "` exists");
  if(!m) return;
  ok(m.name && m.tag && typeof m.build === "function", "(1) `" + id + "` has name + tag + build()");
  ok(typeof m.masterSecs === "number" && m.masterSecs > 0 && m.masterSecs < 30, "(1) `" + id + "` masterSecs sensible (" + m.masterSecs + ")");
  ok(m.group === "Number" && MODE_GROUPS.indexOf(m.group) >= 0, "(1) `" + id + "` is in the Number group");
  ok(Array.isArray(m.glyphTokens) && m.glyphTokens.length, "(1) `" + id + "` has glyphTokens");
  ok(typeof m.requires === "string" && /^mastery:/.test(m.requires) && !!byId(m.requires.replace("mastery:", "")), "(1) `" + id + "` branches off a real parent (" + m.requires + ")");
  const parent = m.requires.replace("mastery:", "");
  ok(MODES.filter(x => x.requires === "mastery:" + parent).length === 1, "(1) `" + id + "` is the ONLY child of `" + parent + "`");
});

// ---- (2) well-formed, distinct, numpad-clean integer items ------------------
["xtricks", "negatives"].forEach(id => {
  const m = byId(id); if(!m) return;
  const qs = m.build();
  ok(qs.length >= 20, "(2) `" + id + "` builds a full curated set (" + qs.length + ")");
  ok(qs.every(q => typeof q.p === "string" && q.p.length > 0 && isCleanInt(q.a)), "(2) `" + id + "` every item is a non-empty prompt + clean non-negative integer answer");
  ok(new Set(qs.map(q => q.p)).size === qs.length, "(2) `" + id + "` all prompts distinct");
});

// ---- (3) xtricks: every answer = a·b (independently) ------------------------
(function(){
  const m = byId("xtricks"); if(!m) return;
  const qs = m.build();
  let good = 0;
  qs.forEach(q => { const mm = /^(\d+) × (\d+)$/.exec(q.p); if(mm && q.a === (+mm[1]) * (+mm[2])) good++; });
  ok(good === qs.length, "(3) xtricks: every answer = a·b (" + good + "/" + qs.length + ")");
})();

// ---- (4) negatives: every answer = the left-to-right eval, and is ≥ 0 -------
(function(){
  const m = byId("negatives"); if(!m) return;
  const qs = m.build();
  let good = 0, neg = 0;
  qs.forEach(q => { let v; try{ v = evalExpr(q.p); }catch(e){ v = NaN; } if(v === q.a) good++; if(q.a < 0) neg++; });
  ok(good === qs.length, "(4) negatives: every answer = an independent eval of the expression (" + good + "/" + qs.length + ")");
  ok(neg === 0, "(4) negatives: every answer is NON-negative (numpad has no minus key)");
})();

// ---- (5) each has a Guide + an answer-free, non-empty method hint -----------
["xtricks", "negatives"].forEach(id => {
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

console.log("\n" + (fails === 0 ? "ALL " + checks + " T219-BATCH-4 CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
