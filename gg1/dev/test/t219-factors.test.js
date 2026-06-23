/* T219 batch 7 (the LAST T219 topic) — `factors` (Factors & Multiples /
 * prime factorisation): count of divisors, next multiple of k, largest prime
 * factor. Per-mode logic gate: fixed pool, non-empty prompts, finite
 * non-negative numpad-clean answers, each re-derived INDEPENDENTLY from the
 * prompt, distinct prompts, single-child branch, guide + answer-free hint.
 * Run: node gg1/dev/test/t219-factors.test.js
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

// Independent re-derivations (no shared code with the renderer).
function factorCount(n){ let c = 0; for(let d = 1; d <= n; d++) if(n % d === 0) c++; return c; }
function nextMultiple(k, n){ return (Math.floor(n / k) + 1) * k; }
function largestPrime(n){ let best = 1; for(let d = 2; d <= n; d++){ while(n % d === 0){ best = d; n /= d; } } return best; }

// ---- (1) mode exists + is a single-child Number branch ----------------------
(function(){
  const m = byId("factors");
  ok(!!m, "(1) mode `factors` exists");
  if(!m) return;
  ok(m.name && m.tag && typeof m.build === "function", "(1) `factors` has name + tag + build()");
  ok(typeof m.masterSecs === "number" && m.masterSecs > 0 && m.masterSecs < 30, "(1) `factors` masterSecs sensible (" + m.masterSecs + ")");
  ok(m.group === "Number" && MODE_GROUPS.indexOf(m.group) >= 0, "(1) `factors` is in the Number group");
  ok(Array.isArray(m.glyphTokens) && m.glyphTokens.length, "(1) `factors` has glyphTokens");
  ok(typeof m.requires === "string" && /^mastery:/.test(m.requires) && !!byId(m.requires.replace("mastery:", "")), "(1) `factors` branches off a real parent (" + m.requires + ")");
  const parent = m.requires.replace("mastery:", "");
  ok(MODES.filter(x => x.requires === "mastery:" + parent).length === 1, "(1) `factors` is the ONLY child of `" + parent + "`");
})();

// ---- (2) well-formed, distinct, numpad-clean integer items ------------------
(function(){
  const m = byId("factors"); if(!m) return;
  const qs = m.build();
  ok(qs.length >= 20, "(2) `factors` builds a full curated set (" + qs.length + ")");
  ok(qs.every(q => typeof q.p === "string" && q.p.length > 0 && isCleanInt(q.a)), "(2) `factors` every item is a non-empty prompt + clean non-negative integer answer");
  ok(new Set(qs.map(q => q.p)).size === qs.length, "(2) `factors` all prompts distinct");
})();

// ---- (3) every answer matches its rule (count / next multiple / largest prime)
(function(){
  const m = byId("factors"); if(!m) return; const qs = m.build();
  let good = 0, kinds = {};
  qs.forEach(q => {
    let mm = /^# factors of (\d+)$/.exec(q.p);      if(mm){ kinds.f = 1; if(q.a === factorCount(+mm[1])) good++; return; }
    mm = /^next ×(\d+) > (\d+)$/.exec(q.p);         if(mm){ kinds.m = 1; if(q.a === nextMultiple(+mm[1], +mm[2])) good++; return; }
    mm = /^biggest prime of (\d+)$/.exec(q.p);      if(mm){ kinds.p = 1; if(q.a === largestPrime(+mm[1])) good++; return; }
  });
  ok(good === qs.length, "(3) factors: every answer matches divisor-count / next-multiple / largest-prime-factor (" + good + "/" + qs.length + ")");
  ok(kinds.f && kinds.m && kinds.p, "(3) factors: covers factor count, next multiple AND largest prime factor");
})();

// ---- (4) the next-multiple answer is the LEAST multiple strictly above N ----
(function(){
  const m = byId("factors"); if(!m) return; const qs = m.build();
  let good = 0, n = 0;
  qs.forEach(q => {
    const mm = /^next ×(\d+) > (\d+)$/.exec(q.p); if(!mm) return; n++;
    const k = +mm[1], N = +mm[2];
    if(q.a % k === 0 && q.a > N && q.a - k <= N) good++;
  });
  ok(n > 0 && good === n, "(4) factors: each next-multiple answer is a multiple of k, above N, with no smaller one in between (" + good + "/" + n + ")");
})();

// ---- (5) Guide + an answer-free, non-empty method hint ----------------------
(function(){
  const m = byId("factors"); if(!m) return;
  ok(G.has("factors"), "(5) `factors` has a Guide");
  const qs = m.build();
  let leak = 0, empty = 0;
  qs.forEach(q => {
    const h = G.explain("factors", q);
    if(!h || h === "Picture the method and work it through one step at a time.") empty++;
    if(h && (h.match(/\d+(?:\.\d+)?/g) || []).map(Number).some(t => t === q.a)) leak++;
  });
  ok(empty === 0, "(5) `factors` explain() is tailored (non-empty, non-fallback) for every item");
  ok(leak === 0, "(5) `factors` explain() never reveals the answer");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " T219-BATCH-7 CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
