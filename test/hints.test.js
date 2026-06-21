/* T49 — practice hints (Guides.explain) must be METHOD-ONLY and number-specific.
 * Over EVERY question in EVERY topic's curated set, assert the hint:
 *   (a) is non-empty;
 *   (b) never contains the answer as a numeric token (incl. its decimal form);
 *   (c) never names structure the number doesn't have — in particular no
 *       "ten/tens" in any single-operand-<10 halves/doubles hint;
 *   (d) the "half of 5" case reads as an odd/half note with no "2.5".
 * Run: node test/hints.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else if(process.env.V) console.log("  ok: " + m); }

global.window = {};
["modes.js","guides.js"].forEach(f => new Function(read(f))());
const M = global.window.MODES, G = global.window.Guides;

// numeric tokens in a string (integers + decimals), as Numbers
function tokens(s){ return (s.match(/\d+(?:\.\d+)?/g) || []).map(Number); }
// word-number + denominator-word value scanning (catches answers leaked in WORDS)
const WORDNUM = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12 };
const DENOM = { half:2, halves:2, third:3, thirds:3, quarter:4, quarters:4, fifth:5, fifths:5, sixth:6, sixths:6,
  seventh:7, sevenths:7, eighth:8, eighths:8, tenth:10, tenths:10, hundredth:100, hundredths:100 };
const PLURAL_UNITS = ["tenths","hundredths","quarters","eighths","fifths","thirds","sixths","sevenths","halves","twentieths","sixteenths"];
// any "<word-number> <denominator-word>" phrase in the hint, as numeric values
function wordPhraseValues(s){
  const out = [], words = s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/);
  for(let i = 0; i < words.length - 1; i++){
    if(WORDNUM[words[i]] != null && DENOM[words[i+1]] != null) out.push(WORDNUM[words[i]] / DENOM[words[i+1]]);
  }
  return out;
}

let leaks = 0, empties = 0, phantom = 0, wordLeaks = 0, plural = 0;
let sampleLeak = "", samplePhantom = "", sampleWord = "", samplePlural = "";
const approx = (x, y) => Math.abs(x - y) < 1e-9;
M.forEach(m => {
  let qs = []; try{ qs = m.build(); }catch(e){}
  qs.forEach(q => {
    const hint = G.explain(m.id, q);
    if(!hint || !hint.trim()){ empties++; return; }
    const a = Number(q.a);
    // (b) no answer as a numeric token
    if(tokens(hint).some(t => t === a)){ leaks++; if(!sampleLeak) sampleLeak = m.id + " «" + q.p + "»→ " + hint; }
    // (b2) no answer leaked in WORDS (e.g. "five tenths" == 0.5)
    if(wordPhraseValues(hint).some(v => approx(v, a))){ wordLeaks++; if(!sampleWord) sampleWord = m.id + " «" + q.p + "»→ " + hint; }
    // (c) phantom structure: single-operand halves/doubles with operand < 10 must not say "ten"
    if(m.id === "halves" || m.id === "doubles"){
      const n = parseFloat(String(q.p));
      if(!isNaN(n) && n < 10 && /\bten/i.test(hint)){ phantom++; if(!samplePhantom) samplePhantom = m.id + " «" + q.p + "»→ " + hint; }
    }
    // (e) singular/plural: never "1 <plural-unit>" (e.g. "1 tenths")
    if(PLURAL_UNITS.some(u => new RegExp("\\b1 " + u + "\\b").test(hint))){ plural++; if(!samplePlural) samplePlural = m.id + " «" + q.p + "»→ " + hint; }
  });
});
ok(empties === 0, "every question yields a non-empty hint (" + empties + " empty)");
ok(leaks === 0, "no hint contains its answer as a number token" + (sampleLeak ? " — e.g. " + sampleLeak : ""));
ok(wordLeaks === 0, "no hint reveals its answer in WORDS (e.g. 'five tenths')" + (sampleWord ? " — e.g. " + sampleWord : ""));
ok(phantom === 0, "no 'ten' in any single-digit (<10) halves/doubles hint" + (samplePhantom ? " — e.g. " + samplePhantom : ""));
ok(plural === 0, "no '1 <plural>' singular/plural slip (e.g. '1 tenths')" + (samplePlural ? " — e.g. " + samplePlural : ""));

// (d) the owner's exact regression: "half of 5"
const halves = M.find(m => m.id === "halves");
const five = halves.build().find(q => String(q.p) === "5");
const h5 = G.explain("halves", five);
ok(/odd/i.test(h5) && /half/i.test(h5), "'half of 5' reads as an odd/half note (" + JSON.stringify(h5) + ")");
ok(h5.indexOf("2.5") < 0 && tokens(h5).every(t => t !== 2.5), "'half of 5' hint never shows 2.5");

// fallback itself must be answer-free / non-empty
ok(!!G.explain("nope", { p:"x", a:3 }), "unknown topic still returns a non-empty hint");

// a couple of phantom-structure spot checks beyond the asserted minimum
ok(!/tens and ones/i.test(G.explain("halves", { p:"5", a:2.5 })), "halves of 5 doesn't mention 'tens and ones'");
ok(/tens and ones/i.test(G.explain("halves", { p:"90", a:45 })), "halves of 90 DOES use tens-and-ones (multi-digit)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " HINT CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
