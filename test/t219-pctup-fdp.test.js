/* T219 batch 2 (Fractions & % group) — `pctup` (increase a number by a %) +
 * `fdp` (three-way Fraction↔Decimal↔Percent conversion). Per-mode logic gate:
 * fixed curated pool, non-empty prompts, finite non-negative numpad-clean answers,
 * each re-derived INDEPENDENTLY from the prompt (not the stored literal), distinct
 * prompts, single-child branch on a real free parent, guide + answer-free hint.
 * Run: node test/t219-pctup-fdp.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
["modes.js", "guides.js"].forEach(f => new Function(read(f))());
const MODES = global.window.MODES, MODE_GROUPS = global.window.MODE_GROUPS, G = global.window.Guides;
const byId = id => MODES.find(m => m.id === id);
function isClean(a){ return typeof a === "number" && isFinite(a) && a >= 0 && String(a).length <= 8 && /^\d+(\.\d{1,4})?$/.test(String(a)); }
const approx = (a, b) => Math.abs(a - b) < 1e-9;

// ---- (1) both modes exist + are single-child branches on real parents --------
["pctup", "fdp"].forEach(id => {
  const m = byId(id);
  ok(!!m, "(1) mode `" + id + "` exists");
  if(!m) return;
  ok(m.name && m.tag && typeof m.build === "function", "(1) `" + id + "` has name + tag + build()");
  ok(typeof m.masterSecs === "number" && m.masterSecs > 0 && m.masterSecs < 30, "(1) `" + id + "` masterSecs sensible (" + m.masterSecs + ")");
  ok(m.group === "Fractions & %" && MODE_GROUPS.indexOf(m.group) >= 0, "(1) `" + id + "` is in the Fractions & % group");
  ok(Array.isArray(m.glyphTokens) && m.glyphTokens.length, "(1) `" + id + "` has glyphTokens");
  ok(typeof m.requires === "string" && /^mastery:/.test(m.requires) && !!byId(m.requires.replace("mastery:", "")), "(1) `" + id + "` branches off a real parent (" + m.requires + ")");
  const parent = m.requires.replace("mastery:", "");
  ok(MODES.filter(x => x.requires === "mastery:" + parent).length === 1, "(1) `" + id + "` is the ONLY child of `" + parent + "`");
});

// ---- (2) well-formed, distinct, numpad-clean items ---------------------------
["pctup", "fdp"].forEach(id => {
  const m = byId(id); if(!m) return;
  const qs = m.build();
  ok(qs.length >= 20, "(2) `" + id + "` builds a full curated set (" + qs.length + ")");
  ok(qs.every(q => typeof q.p === "string" && q.p.length > 0 && isClean(q.a)), "(2) `" + id + "` every item is a non-empty prompt + clean numeric answer");
  ok(new Set(qs.map(q => q.p)).size === qs.length, "(2) `" + id + "` all prompts distinct");
});

// ---- (3) pctup: answer = base + pct% of base (independently recomputed) -------
(function(){
  const m = byId("pctup"); if(!m) return;
  const qs = m.build();
  let good = 0;
  qs.forEach(q => { const mm = /^(\d+) \+ (\d+)%$/.exec(q.p); if(mm){ const base = +mm[1], pct = +mm[2]; if(approx(q.a, base + pct * base / 100)) good++; } });
  ok(good === qs.length, "(3) pctup: every answer = base + pct% of base (" + good + "/" + qs.length + ")");
})();

// ---- (4) fdp: each of the three conversion shapes computes correctly ----------
(function(){
  const m = byId("fdp"); if(!m) return;
  const qs = m.build();
  let good = 0, dN = 0, pN = 0, fN = 0;
  qs.forEach(q => {
    let mm = /^(\d+)% as a decimal$/.exec(q.p);
    if(mm){ dN++; if(approx(q.a, +mm[1] / 100)) good++; return; }
    mm = /^([\d.]+) as a %$/.exec(q.p);
    if(mm){ pN++; if(approx(q.a, +mm[1] * 100)) good++; return; }
    mm = /^(\d+)\/(\d+) as a %$/.exec(q.p);
    if(mm){ fN++; if(approx(q.a, +mm[1] / +mm[2] * 100)) good++; return; }
  });
  ok(good === qs.length, "(4) fdp: every conversion is mathematically correct (" + good + "/" + qs.length + ")");
  ok(dN >= 3 && pN >= 3 && fN >= 3, "(4) fdp: the set exercises ALL three shapes (%→dec " + dN + ", dec→% " + pN + ", frac→% " + fN + ")");
})();

// ---- (5) each has a Guide + an answer-free, non-empty method hint -------------
["pctup", "fdp"].forEach(id => {
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

console.log("\n" + (fails === 0 ? "ALL " + checks + " T219-BATCH-2 CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
