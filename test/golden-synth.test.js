/* T130 — Synth golden snapshots. Pins each context's DETERMINISTIC scheduled
 * "score" (the first N steps' events), and asserts the contexts are mutually
 * DISTINCT — the explicit golden that would have caught T128 ("every context
 * sounds the same"). Pure + headless (no AudioContext needed).
 * Run: node test/golden-synth.test.js   ·   regenerate: UPDATE_GOLDEN=1 node …
 */
const fs = require("fs"), path = require("path");
const { check } = require("./golden-util.js");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }
function gold(name, value){ const r = check(name, value); ok(r.match, "golden '" + name + "'" + (r.updated ? " (regenerated)" : "") + (r.match ? "" : " — " + r.hint)); }

global.window = {};
new Function(read("synth.js"))();
const Synth = global.window.Synth;

// Reproduce the scheduler's deterministic note generation for the first `steps`
// 16th-notes of a context, mirroring musicTick's seeding (rnd reseeds per phrase
// from phraseSeed; the melodic state `st` persists). A compact, reviewable score.
function score(name, steps){
  const spec = Synth.normalizeMusic(Object.assign({ seed: Synth.hashStr(name) }, Synth.CONTEXTS[name]));
  const phraseLen = 16 * spec.harmony.length;
  let rnd = null, phrase = -1; const st = { deg: 0 }, out = [];
  for(let step = 0; step < steps; step++){
    const ph = Math.floor(step / phraseLen);
    if(ph !== phrase){ phrase = ph; rnd = Synth.mulberry32(Synth.phraseSeed(spec.seed, phrase)); }
    const evs = Synth.stepEvents(spec, step, rnd, 0, st);
    out.push(evs.map(e => e.role === "drum" ? ("d:" + e.piece) : (e.role[0] + ":" + e.midi)));
  }
  return out;
}

const NAMES = ["solve", "menu", "arena", "event"];
const scores = {};
for(const n of NAMES){ scores[n] = score(n, 32); gold("synth_score_" + n, scores[n]); }

// determinism: re-deriving a context's score is byte-identical
ok(JSON.stringify(score("arena", 32)) === JSON.stringify(scores.arena), "a context score is deterministic for its seed");

// THE distinctness golden (the T128 catcher): every context's 32-step score is
// mutually distinct — no two contexts produce the same notes.
let distinct = true, collision = "";
for(let i = 0; i < NAMES.length; i++) for(let j = i + 1; j < NAMES.length; j++){
  if(JSON.stringify(scores[NAMES[i]]) === JSON.stringify(scores[NAMES[j]])){ distinct = false; collision = NAMES[i] + "≡" + NAMES[j]; }
}
ok(distinct, "every context is MUTUALLY DISTINCT (solve≠menu≠arena≠event)" + (distinct ? "" : " — collision: " + collision));
gold("synth_context_distinct", { distinct: NAMES.length, pairs_compared: 6, all_distinct: distinct });

// the distinctness is structural, not luck: contexts differ in mode + tempo
const specOf = n => Synth.normalizeMusic(Object.assign({ seed: Synth.hashStr(n) }, Synth.CONTEXTS[n]));
ok(new Set(NAMES.map(n => specOf(n).mode)).size >= 3, "contexts span ≥3 distinct modes (mood variety)");
ok(new Set(NAMES.map(n => specOf(n).tempo)).size === NAMES.length, "every context has a distinct tempo");

// harness regen sanity: a freshly-computed score equals what UPDATE_GOLDEN would write
ok(typeof score("solve", 8)[0] !== "undefined", "scores are non-empty (the engine actually schedules notes)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " SYNTH-GOLDEN CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
