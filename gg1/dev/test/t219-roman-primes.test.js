/* T219 batch 1 (Number group) — `roman` (read a Roman numeral) + `primes` (next
 * prime above N). Per-mode logic gate: each builds a fixed curated set, every
 * prompt a non-empty string, every answer a finite non-negative numpad-clean
 * NUMBER, mathematically CORRECT under an INDEPENDENT re-derivation (a Roman
 * parser / a primality test — not the stored literal), prompts distinct, and each
 * is a single-child branch wired to a real, free mastery parent. Plus a guide +
 * an answer-free method hint.
 * Run: node test/t219-roman-primes.test.js
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

// independent Roman→int parser (subtractive rule)
const RV = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
function roman2int(s){
  let total = 0;
  for(let i = 0; i < s.length; i++){
    const cur = RV[s[i]], nxt = RV[s[i+1]];
    if(nxt && cur < nxt) total -= cur; else total += cur;
  }
  return total;
}
function isPrime(n){ if(n < 2) return false; for(let d = 2; d * d <= n; d++) if(n % d === 0) return false; return true; }
function nextPrime(n){ let k = n + 1; while(!isPrime(k)) k++; return k; }

// ---- (1) both modes exist + are single-child branches on real free parents ----
["roman", "primes"].forEach(id => {
  const m = byId(id);
  ok(!!m, "(1) mode `" + id + "` exists");
  if(!m) return;
  ok(m.name && m.tag && typeof m.build === "function", "(1) `" + id + "` has name + tag + build()");
  ok(typeof m.masterSecs === "number" && m.masterSecs > 0 && m.masterSecs < 30, "(1) `" + id + "` masterSecs sensible (" + m.masterSecs + ")");
  ok(MODE_GROUPS.indexOf(m.group) >= 0, "(1) `" + id + "` group `" + m.group + "` is known");
  ok(Array.isArray(m.glyphTokens) && m.glyphTokens.length, "(1) `" + id + "` has glyphTokens");
  ok(typeof m.requires === "string" && /^mastery:/.test(m.requires) && !!byId(m.requires.replace("mastery:", "")), "(1) `" + id + "` branches off a real mastery parent (" + m.requires + ")");
  // the branchOf model is single-child: no OTHER mode shares this parent
  const parent = m.requires.replace("mastery:", "");
  ok(MODES.filter(x => x.requires === "mastery:" + parent).length === 1, "(1) `" + id + "` is the ONLY child of `" + parent + "` (single-child branch holds)");
});

// ---- (2) well-formed, distinct, numpad-clean items ---------------------------
["roman", "primes"].forEach(id => {
  const m = byId(id); if(!m) return;
  const qs = m.build();
  ok(qs.length >= 20, "(2) `" + id + "` builds a full curated set (" + qs.length + ")");
  ok(qs.every(q => typeof q.p === "string" && q.p.length > 0 && isClean(q.a)), "(2) `" + id + "` every item is a non-empty prompt + clean numeric answer");
  ok(new Set(qs.map(q => q.p)).size === qs.length, "(2) `" + id + "` all prompts distinct");
});

// ---- (3) roman: every stored answer = the INDEPENDENT parse of the numeral ----
(function(){
  const m = byId("roman"); if(!m) return;
  const qs = m.build();
  let good = 0;
  qs.forEach(q => { if(/^[IVXLCDM]+$/.test(q.p) && roman2int(q.p) === q.a) good++; });
  ok(good === qs.length, "(3) roman: every answer = an independent parse of the numeral (" + good + "/" + qs.length + ")");
})();

// ---- (4) primes: every answer is the least prime strictly above N -------------
(function(){
  const m = byId("primes"); if(!m) return;
  const qs = m.build();
  let good = 0;
  qs.forEach(q => { const mm = /^next prime > (\d+)$/.exec(q.p); if(mm && q.a === nextPrime(+mm[1]) && isPrime(q.a)) good++; });
  ok(good === qs.length, "(4) primes: every answer is the next prime above N (independently checked) (" + good + "/" + qs.length + ")");
})();

// ---- (5) each has a Guide + an answer-free, non-empty method hint -------------
["roman", "primes"].forEach(id => {
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

console.log("\n" + (fails === 0 ? "ALL " + checks + " T219-BATCH-1 CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
