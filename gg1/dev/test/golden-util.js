/* T130 — golden-snapshot harness (brickmap-style render-regression), Node-only.
 *
 * Brickmap pins deterministic renders against a committed reference and compares
 * (with tolerance), regenerating on demand ("new things show up"). Its GPU/PNG
 * capture is native-only; we port the *idea* to our deterministic, HEADLESS
 * engine outputs (FXGL CPU-still pixels + Synth context scores) so a source-grep-
 * green build can't hide an output regression (the T118/T125/T128 class of bug).
 *
 * Goldens are compact, committed, diff-reviewable JSON under test/golden/.
 *   default run         → COMPARE; fail (and show the first differing line) on change
 *   UPDATE_GOLDEN=1 run → REGENERATE the goldens (review the diff, commit it)
 *
 * B-owned helper (no deps). Used by test/golden-fx.test.js + test/golden-synth.test.js.
 */
const fs = require("fs"), path = require("path");
const DIR = path.join(__dirname, "golden");

// Pure value comparison (also unit-tested) — exact on the *serialised* value, so
// any tolerance must be baked into the value (e.g. quantised pixels) before here.
function compareValues(prev, value){
  const cur = JSON.stringify(value, null, 1);
  if(prev.trim() === cur.trim()) return { match: true };
  const a = prev.trim().split("\n"), b = cur.split("\n");
  for(let i = 0; i < Math.max(a.length, b.length); i++){
    if(a[i] !== b[i]) return { match: false, hint: "first change at line " + (i + 1) + ":\n    golden: " + (a[i] === undefined ? "∅" : a[i].trim()) + "\n    actual: " + (b[i] === undefined ? "∅" : b[i].trim()) };
  }
  return { match: false, hint: "differ (length " + a.length + " → " + b.length + ")" };
}

// Compare `value` against the committed golden `name` (or regenerate it under
// UPDATE_GOLDEN). Returns { match, hint? }.
function check(name, value){
  const cur = JSON.stringify(value, null, 1);
  if(!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, name + ".json");
  if(process.env.UPDATE_GOLDEN){ fs.writeFileSync(file, cur + "\n"); return { match: true, updated: true }; }
  if(!fs.existsSync(file)) return { match: false, hint: "no golden '" + name + "' — run UPDATE_GOLDEN=1 to create it" };
  return compareValues(fs.readFileSync(file, "utf8"), value);
}

module.exports = { check: check, compareValues: compareValues, DIR: DIR };
