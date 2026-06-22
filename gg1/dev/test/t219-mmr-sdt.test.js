/* T219 batch 6 — `mmr` (median/mode/range) + `sdt` (speed-distance-time). Per-mode
 * logic gate: fixed pool, non-empty prompts, finite non-negative numpad-clean
 * answers, each re-derived INDEPENDENTLY from the prompt, distinct prompts,
 * single-child branch, guide + answer-free hint.
 * Run: node gg1/dev/test/t219-mmr-sdt.test.js
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
function median(a){ const s = a.slice().sort((x, y) => x - y); return s[(s.length - 1) / 2]; }
function mode(a){ const c = {}; let best = null, bn = -1; a.forEach(v => { c[v] = (c[v] || 0) + 1; if(c[v] > bn){ bn = c[v]; best = v; } }); return best; }
function range(a){ return Math.max.apply(null, a) - Math.min.apply(null, a); }

// ---- (1) both modes exist + are single-child branches in the right group ----
[["mmr", "Reasoning"], ["sdt", "Measures"]].forEach(([id, grp]) => {
  const m = byId(id);
  ok(!!m, "(1) mode `" + id + "` exists");
  if(!m) return;
  ok(m.name && m.tag && typeof m.build === "function", "(1) `" + id + "` has name + tag + build()");
  ok(typeof m.masterSecs === "number" && m.masterSecs > 0 && m.masterSecs < 30, "(1) `" + id + "` masterSecs sensible (" + m.masterSecs + ")");
  ok(m.group === grp && MODE_GROUPS.indexOf(m.group) >= 0, "(1) `" + id + "` is in the " + grp + " group");
  ok(Array.isArray(m.glyphTokens) && m.glyphTokens.length, "(1) `" + id + "` has glyphTokens");
  ok(typeof m.requires === "string" && /^mastery:/.test(m.requires) && !!byId(m.requires.replace("mastery:", "")), "(1) `" + id + "` branches off a real parent (" + m.requires + ")");
  const parent = m.requires.replace("mastery:", "");
  ok(MODES.filter(x => x.requires === "mastery:" + parent).length === 1, "(1) `" + id + "` is the ONLY child of `" + parent + "`");
});

// ---- (2) well-formed, distinct, numpad-clean integer items ------------------
["mmr", "sdt"].forEach(id => {
  const m = byId(id); if(!m) return;
  const qs = m.build();
  ok(qs.length >= 20, "(2) `" + id + "` builds a full curated set (" + qs.length + ")");
  ok(qs.every(q => typeof q.p === "string" && q.p.length > 0 && isCleanInt(q.a)), "(2) `" + id + "` every item is a non-empty prompt + clean non-negative integer answer");
  ok(new Set(qs.map(q => q.p)).size === qs.length, "(2) `" + id + "` all prompts distinct");
});

// ---- (3) mmr: median = ordered middle, mode = most frequent, range = max−min -
(function(){
  const m = byId("mmr"); if(!m) return; const qs = m.build();
  let good = 0, kinds = {};
  qs.forEach(q => {
    const mm = /^(median|mode|range) of ([\d,]+)$/.exec(q.p); if(!mm) return;
    const vals = mm[2].split(",").map(Number); kinds[mm[1]] = 1;
    const exp = mm[1] === "median" ? median(vals) : mm[1] === "mode" ? mode(vals) : range(vals);
    if(q.a === exp) good++;
  });
  ok(good === qs.length, "(3) mmr: every answer matches median/mode/range of its list (" + good + "/" + qs.length + ")");
  ok(kinds.median && kinds.mode && kinds.range, "(3) mmr: covers all three statistics");
})();

// ---- (4) sdt: D=S·T, S=D/T, T=D/S ------------------------------------------
(function(){
  const m = byId("sdt"); if(!m) return; const qs = m.build();
  let good = 0, kinds = {};
  qs.forEach(q => {
    let mm = /^dist: (\d+)km\/h × (\d+)h$/.exec(q.p);   if(mm){ kinds.d = 1; if(q.a === (+mm[1]) * (+mm[2])) good++; return; }
    mm = /^speed: (\d+)km in (\d+)h$/.exec(q.p);        if(mm){ kinds.s = 1; if(q.a === (+mm[1]) / (+mm[2])) good++; return; }
    mm = /^time: (\d+)km at (\d+)km\/h$/.exec(q.p);     if(mm){ kinds.t = 1; if(q.a === (+mm[1]) / (+mm[2])) good++; return; }
  });
  ok(good === qs.length, "(4) sdt: every answer matches D=S·T / S=D÷T / T=D÷S (" + good + "/" + qs.length + ")");
  ok(kinds.d && kinds.s && kinds.t, "(4) sdt: covers distance, speed AND time");
})();

// ---- (5) each has a Guide + an answer-free, non-empty method hint -----------
["mmr", "sdt"].forEach(id => {
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

console.log("\n" + (fails === 0 ? "ALL " + checks + " T219-BATCH-6 CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
