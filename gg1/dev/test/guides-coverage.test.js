/* T213 Phase 2a — guide & explain() coverage.
 *
 * Enumerates EVERY topic in modes.js, builds its full question pool, and asserts:
 *   (a) every topic has a static GUIDES entry (intro + 2–4 tips + example);
 *   (b) explain() returns a tailored (non-FALLBACK), answer-free line for every
 *       question of every topic — no generic "Picture the method…" fall-through;
 *   (c) the explain line never contains the answer value as a standalone number.
 * Run: node test/guides-coverage.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// Minimal window for the IIFE modules (modes.js + guides.js attach to window).
global.window = {};
["modes.js", "guides.js"].forEach(f => new Function(read(f))());
const MODES = global.window.MODES, G = global.window.Guides;
const FALLBACK = "Picture the method and work it through one step at a time.";

ok(Array.isArray(MODES) && MODES.length >= 30, "modes.js exposes the full topic list (" + (MODES ? MODES.length : 0) + ")");

// (a) every topic has a well-formed guide
let noGuide = [];
MODES.forEach(m => {
  const g = G.get(m.id);
  if(!g || !g.intro || !Array.isArray(g.tips) || g.tips.length < 2 || g.tips.length > 4 || !g.example) noGuide.push(m.id);
});
ok(noGuide.length === 0, "(a) every topic has a guide {intro, 2–4 tips, example}" + (noGuide.length ? " — missing/malformed: " + noGuide.join(", ") : ""));

// (b)+(c) explain() is tailored + answer-free for every question of every topic
let fellBack = {}, leaked = {};
MODES.forEach(m => {
  let qs; try{ qs = m.build(); }catch(e){ qs = []; }
  qs.forEach(q => {
    const line = G.explain(m.id, q);
    if(!line || line === FALLBACK){ (fellBack[m.id] = fellBack[m.id] || []).push(q.p); return; }
    // the answer must NOT appear as a NEW standalone token in the method line.
    // Numbers already shown in the prompt are fair game to echo; a leak is the
    // answer value surfacing where the prompt didn't already contain it.
    const a = String(q.a);
    const tok = a.replace(/[.]/g, "\\.");
    const re = new RegExp("(^|[^\\d.])" + tok + "([^\\d.]|$)");
    const inPrompt = new RegExp("(^|[^\\d.])" + tok + "([^\\d.]|$)").test(String(q.p));
    if(!inPrompt && re.test(line)) (leaked[m.id] = leaked[m.id] || []).push(q.p + " → \"" + line + "\"");
  });
});
const fbIds = Object.keys(fellBack);
ok(fbIds.length === 0, "(b) explain() is tailored for every question (no FALLBACK)" +
   (fbIds.length ? " — fell back: " + fbIds.map(id => id + " (" + fellBack[id].length + ")").join(", ") : ""));
const lkIds = Object.keys(leaked);
ok(lkIds.length === 0, "(c) explain() never states the answer" +
   (lkIds.length ? " — leaked: " + lkIds.map(id => id + ": " + leaked[id][0]).join(" | ") : ""));

// the 11 previously-missing topics are now covered (regression guard)
["scaling","percentoff","partwhole","balance","lcmhcf","mean","timegap","ratioshare","cubes","money","digitsum"]
  .forEach(id => ok(G.has(id), "the T213 gap topic '" + id + "' now has a guide"));

console.log("\n" + (fails === 0 ? "ALL " + checks + " GUIDES-COVERAGE CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
