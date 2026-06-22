/* T219 batch 5 (NEW Geometry group) — `area` (rectangle area/perimeter + triangle
 * area), `volume` (cuboid l×w×h), `angles` (missing angle: line 180 / point 360 /
 * triangle 180). Per-mode logic gate: fixed pool, non-empty prompts, finite
 * non-negative numpad-clean answers, each re-derived INDEPENDENTLY from the prompt,
 * distinct prompts, single-child branch, guide + answer-free hint. Plus the new
 * Geometry MODE_GROUP.
 * Run: node gg1/dev/test/t219-geometry.test.js
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

ok(MODE_GROUPS.indexOf("Geometry") >= 0, "the NEW Geometry MODE_GROUP exists");

// ---- (1) all three modes exist + are single-child Geometry branches ---------
["area", "volume", "angles"].forEach(id => {
  const m = byId(id);
  ok(!!m, "(1) mode `" + id + "` exists");
  if(!m) return;
  ok(m.name && m.tag && typeof m.build === "function", "(1) `" + id + "` has name + tag + build()");
  ok(typeof m.masterSecs === "number" && m.masterSecs > 0 && m.masterSecs < 30, "(1) `" + id + "` masterSecs sensible (" + m.masterSecs + ")");
  ok(m.group === "Geometry", "(1) `" + id + "` is in the Geometry group");
  ok(Array.isArray(m.glyphTokens) && m.glyphTokens.length, "(1) `" + id + "` has glyphTokens");
  ok(typeof m.requires === "string" && /^mastery:/.test(m.requires) && !!byId(m.requires.replace("mastery:", "")), "(1) `" + id + "` branches off a real parent (" + m.requires + ")");
  const parent = m.requires.replace("mastery:", "");
  ok(MODES.filter(x => x.requires === "mastery:" + parent).length === 1, "(1) `" + id + "` is the ONLY child of `" + parent + "`");
});

// ---- (2) well-formed, distinct, numpad-clean integer items ------------------
["area", "volume", "angles"].forEach(id => {
  const m = byId(id); if(!m) return;
  const qs = m.build();
  ok(qs.length >= 20, "(2) `" + id + "` builds a full curated set (" + qs.length + ")");
  ok(qs.every(q => typeof q.p === "string" && q.p.length > 0 && isCleanInt(q.a)), "(2) `" + id + "` every item is a non-empty prompt + clean non-negative integer answer");
  ok(new Set(qs.map(q => q.p)).size === qs.length, "(2) `" + id + "` all prompts distinct");
});

// ---- (3) area: rect area = l·w, perim = 2(l+w), triangle = ½·b·h ------------
(function(){
  const m = byId("area"); if(!m) return; const qs = m.build();
  let good = 0, kinds = {};
  qs.forEach(q => {
    let mm = /^area (\d+)×(\d+)$/.exec(q.p);  if(mm){ kinds.a = 1; if(q.a === (+mm[1]) * (+mm[2])) good++; return; }
    mm = /^perim (\d+)×(\d+)$/.exec(q.p);     if(mm){ kinds.p = 1; if(q.a === 2 * ((+mm[1]) + (+mm[2]))) good++; return; }
    mm = /^△ (\d+)×(\d+)$/.exec(q.p);          if(mm){ kinds.t = 1; if(q.a === (+mm[1]) * (+mm[2]) / 2) good++; return; }
  });
  ok(good === qs.length, "(3) area: every answer matches its formula (area/perim/triangle) (" + good + "/" + qs.length + ")");
  ok(kinds.a && kinds.p && kinds.t, "(3) area: covers rectangle area + perimeter + triangle area");
})();

// ---- (4) volume = l·w·h ----------------------------------------------------
(function(){
  const m = byId("volume"); if(!m) return; const qs = m.build();
  let good = 0;
  qs.forEach(q => { const mm = /^vol (\d+)×(\d+)×(\d+)$/.exec(q.p); if(mm && q.a === (+mm[1]) * (+mm[2]) * (+mm[3])) good++; });
  ok(good === qs.length, "(4) volume: every answer = l·w·h (" + good + "/" + qs.length + ")");
})();

// ---- (5) angles: 180−a (line) / 360−a (point) / 180−a−b (triangle) ----------
(function(){
  const m = byId("angles"); if(!m) return; const qs = m.build();
  let good = 0, kinds = {};
  qs.forEach(q => {
    let mm = /^line (\d+) \+ \?$/.exec(q.p);       if(mm){ kinds.l = 1; if(q.a === 180 - (+mm[1])) good++; return; }
    mm = /^point (\d+) \+ \?$/.exec(q.p);          if(mm){ kinds.p = 1; if(q.a === 360 - (+mm[1])) good++; return; }
    mm = /^△ (\d+), (\d+) → \?$/.exec(q.p);         if(mm){ kinds.t = 1; if(q.a === 180 - (+mm[1]) - (+mm[2])) good++; return; }
  });
  ok(good === qs.length, "(5) angles: every answer matches its rule (line 180 / point 360 / triangle 180) (" + good + "/" + qs.length + ")");
  ok(kinds.l && kinds.p && kinds.t, "(5) angles: covers line + point + triangle");
})();

// ---- (6) each has a Guide + an answer-free, non-empty method hint -----------
["area", "volume", "angles"].forEach(id => {
  const m = byId(id); if(!m) return;
  ok(G.has(id), "(6) `" + id + "` has a Guide");
  const qs = m.build();
  let leak = 0, empty = 0;
  qs.forEach(q => {
    const h = G.explain(id, q);
    if(!h || h === "Picture the method and work it through one step at a time.") empty++;
    if(h && (h.match(/\d+(?:\.\d+)?/g) || []).map(Number).some(t => t === q.a)) leak++;
  });
  ok(empty === 0, "(6) `" + id + "` explain() is tailored (non-empty, non-fallback) for every item");
  ok(leak === 0, "(6) `" + id + "` explain() never reveals the answer");
});

console.log("\n" + (fails === 0 ? "ALL " + checks + " T219-BATCH-5 CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
