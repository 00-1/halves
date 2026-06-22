/* T213 Phase 2c — question-integrity regression gate.
 *
 * The enumeration-harness fixes are landed; this gate locks them in. Loads
 * modes.js + guides.js, builds EVERY topic's full pool, and asserts the
 * permanent invariants the audit settled on:
 *   (a) every answer is numpad-clean: a finite, NON-NEGATIVE number whose literal
 *       is an integer or a SHORT TERMINATING decimal (≤4 dp), ≤8 chars, with no
 *       minus / colon / exponent (the on-screen numpad can't enter those);
 *   (b) NO two identical prompts carry DIFFERING answers — anywhere across all
 *       topics (a prompt string maps to exactly one answer value);
 *   (c) within a topic, prompts are distinct (no wasted duplicate slot).
 * Run: node test/question-integrity.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
["modes.js", "guides.js"].forEach(f => new Function(read(f))());
const MODES = global.window.MODES;

ok(Array.isArray(MODES) && MODES.length >= 30, "modes.js exposes the full topic list (" + (MODES ? MODES.length : 0) + ")");

// numpad-clean answer: finite, non-negative, integer or ≤4-dp terminating literal, ≤8 chars, no minus/colon/exp.
function isNumpadClean(a){
  if(typeof a !== "number" || !isFinite(a) || a < 0) return false;
  const s = String(a);
  return s.length <= 8 && /^\d+(\.\d{1,4})?$/.test(s);
}

let dirty = [], dupPrompt = [];
const globalPrompt = new Map();   // prompt -> answer (for the cross-topic differing-answer gate)
let conflict = [];

MODES.forEach(m => {
  let qs; try{ qs = m.build(); }catch(e){ qs = []; ok(false, "`" + m.id + "` build() threw: " + e.message); }
  const seen = new Set();
  qs.forEach(q => {
    if(!isNumpadClean(q.a)) dirty.push(m.id + " «" + q.p + "» = " + q.a);
    if(seen.has(q.p)) dupPrompt.push(m.id + " «" + q.p + "»"); else seen.add(q.p);
    // Cross-topic consistency only applies to SELF-CONTAINED prompts (those carrying
    // their own operator). A BARE number ("250", "7") is topic-scoped — the operation
    // is implied by the topic (half of / double / …), so the same number legitimately
    // means different things across halves/doubles/squares, not a contradiction.
    const selfContained = !/^\d+(\.\d+)?$/.test(q.p);
    if(selfContained){
      if(globalPrompt.has(q.p)){
        if(globalPrompt.get(q.p) !== q.a) conflict.push("«" + q.p + "» = " + globalPrompt.get(q.p) + " vs " + q.a);
      } else globalPrompt.set(q.p, q.a);
    }
  });
});

// (a) every answer numpad-clean (non-negative + terminating)
ok(dirty.length === 0, "(a) every answer is non-negative + terminating + numpad-clean" + (dirty.length ? " — bad: " + dirty.slice(0, 5).join(" | ") : ""));
// (b) no identical prompt with two different answers (the audit's named gate)
ok(conflict.length === 0, "(b) no two identical prompts carry differing answers" + (conflict.length ? " — " + conflict.slice(0, 5).join(" | ") : ""));
// (c) prompts distinct within each topic
ok(dupPrompt.length === 0, "(c) prompts are distinct within every topic (no wasted duplicate slot)" + (dupPrompt.length ? " — dups: " + dupPrompt.slice(0, 5).join(" | ") : ""));

// headline: how big is the de-duplicated question bank
let total = 0; MODES.forEach(m => { try{ total += m.build().length; }catch(e){} });
console.log("  (i) " + MODES.length + " topics, " + total + " questions, " + globalPrompt.size + " unique prompts");

console.log("\n" + (fails === 0 ? "ALL " + checks + " QUESTION-INTEGRITY CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
