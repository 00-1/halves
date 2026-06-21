/* T56 — the topic glyphs + app mark are a procedural PIXEL FONT (glyphs.js /
 * window.Glyphs), driven by structured `glyphTokens` on every mode. Verifies:
 *   (a) the renderer is pure + deterministic and only emits ink codes 0/1/2;
 *   (b) every mode declares glyphTokens whose every symbol the font supports
 *       (no "missing" glyph) — so the exact operators × ÷ + − ± / % ½ ¾ ² are
 *       all really encoded, never silently dropped;
 *   (c) the amber-accent role is honoured: a "*"-token paints accent ink (2),
 *       a plain token paints body ink (1);
 *   (d) the 15 topic glyphs are pairwise DISTINCT bitmaps;
 *   (e) the module is static (no RAF / animation) and wired into the page +
 *       used everywhere (mark, guide, practice, toast) + mints the favicon.
 * Run: node test/glyphs.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
new Function(read("glyphs.js"))();
new Function(read("modes.js"))();
const Gl = global.window.Glyphs, MODES = global.window.MODES;

// (a) buildGrid is pure/deterministic and only emits 0/1/2 ink codes.
const sample = ["x","*/","2"];
const g1 = Gl.buildGrid(sample), g2 = Gl.buildGrid(sample);
function ser(g){ return g.cells.map(r => r.join("")).join("|"); }
ok(ser(g1) === ser(g2), "buildGrid is deterministic across calls");
ok(g1.h === Gl.H && g1.w > 0 && g1.cells.length === g1.h, "grid has the declared height and a positive width");
let codesOk = true, hasInk = false;
g1.cells.forEach(row => row.forEach(v => { if(v !== 0 && v !== 1 && v !== 2) codesOk = false; if(v) hasInk = true; }));
ok(codesOk, "every cell is an ink code 0/1/2");
ok(hasInk, "the grid actually paints ink");

// (b) every mode has glyphTokens and the font supports every symbol used.
const allModesHaveTokens = MODES.every(m => Array.isArray(m.glyphTokens) && m.glyphTokens.length);
ok(allModesHaveTokens, "every mode declares a non-empty glyphTokens array");
let missingTotal = 0;
MODES.forEach(m => { const gg = Gl.buildGrid(m.glyphTokens); if(gg.missing.length){ missingTotal += gg.missing.length; console.log("    " + m.id + " missing: " + gg.missing.join(",")); } });
ok(missingTotal === 0, "the pixel font supports every symbol in every topic glyph (" + missingTotal + " missing)");

// the DoD spot-check operators must each resolve to a real bitmap (not dropped).
["×","÷","+","−","±","/","%"].forEach(op => ok(Gl.buildGrid(["*"+op]).missing.length === 0, "operator " + op + " has a real glyph"));
// composite forms: stacked fractions ½ ¾ and superscript ²
ok(Gl.buildGrid(["*f12"]).missing.length === 0 && Gl.buildGrid(["*f34"]).missing.length === 0, "stacked fractions ½ and ¾ encode without missing digits");
ok(Gl.buildGrid(["*s2"]).missing.length === 0, "superscript ² encodes without a missing digit");

// (c) accent vs body ink role.
function inks(tokens){ const s = new Set(); Gl.buildGrid(tokens).cells.forEach(r => r.forEach(v => { if(v) s.add(v); })); return s; }
ok(inks(["*×"]).has(2) && !inks(["*×"]).has(1), "an accent token paints only accent ink (2)");
ok(inks(["a"]).has(1) && !inks(["a"]).has(2), "a plain token paints only body ink (1)");
// a mixed glyph (a×b) carries both
ok(inks(["a","*×","b"]).has(1) && inks(["a","*×","b"]).has(2), "a mixed glyph carries both body and accent ink");
// and the accented token matches the old amber ".slash" span for each mode
const ACCENT_OK = MODES.every(m => Gl.buildGrid(m.glyphTokens.filter(t => /^\*/.test(t))).cells.some(r => r.some(v => v === 2)) || !m.glyphTokens.some(t => /^\*/.test(t)));
ok(ACCENT_OK, "each mode's '*' tokens paint accent ink");

// (d) the 15 topic glyphs are pairwise distinct bitmaps.
const grids = MODES.map(m => ser(Gl.buildGrid(m.glyphTokens)));
ok(new Set(grids).size === grids.length, "all " + grids.length + " topic glyphs are pairwise distinct (" + new Set(grids).size + " unique)");

// (e) static module + full wiring.
const glyphSrc = read("glyphs.js");
ok(!/requestAnimationFrame|setInterval|setTimeout/.test(glyphSrc), "glyphs.js is static (no RAF / timers)");
const html = read("index.html");
ok(/<script src="glyphs\.js">/.test(html), "index.html loads glyphs.js");
const main = read("main.js");
ok(/function paintGlyph/.test(main), "main.js defines the paintGlyph helper");
// used in all four surfaces: mark, guide title, practice title, toast
ok(/paintGlyph\(el\.querySelector\("\.ti-glyph"\)/.test(main), "the selected-topic mark (info row) uses the pixel glyph");
ok(/g-glyph/.test(main) && (main.match(/paintGlyph\(/g) || []).length >= 5, "guide/practice/toast/brand all paint pixel glyphs");
// favicon minted from the same renderer
ok(/installFavicon/.test(main) && /rel="icon"/.test(main) && /apple-touch-icon/.test(main) && /theme-color/.test(main),
   "a favicon + apple-touch-icon + theme-color are minted at runtime");
ok(/Glyphs\.draw\(cv/.test(main), "the favicon is drawn with the Glyphs renderer");

console.log("\n" + (fails === 0 ? "ALL " + checks + " GLYPH CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
