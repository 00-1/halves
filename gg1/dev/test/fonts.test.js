/* T169 — the web fonts are SELF-HOSTED (no Google Fonts CDN). Proves the app
 * makes ZERO third-party font requests (kids-privacy / Data-Safety "no data
 * shared" + fully offline), the two families still resolve to local woff2, and
 * the self-hosted fonts cache-bust like every other asset:
 *   (a) NO fonts.googleapis / fonts.gstatic / preconnect refs survive anywhere;
 *   (b) styles.css @font-face self-hosts BOTH families from local fonts/*.woff2
 *       covering every weight in use (Space Grotesk 400/500/700, JetBrains Mono
 *       400/700/800), and the --display/--mono vars still name them;
 *   (c) the two woff2 files exist + are real (wOF2 magic);
 *   (d) cachebust versions the font url()s (?v=) and leaves NO bare font ref.
 * Run: node test/fonts.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

const html = read("index.html"), css = read("styles.css");

// ---- (a) zero third-party font requests -------------------------------------
ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html), "(a) index.html has NO Google Fonts CDN refs (googleapis/gstatic)");
ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(css), "(a) styles.css has NO Google Fonts CDN refs");
ok(!/<link[^>]+preconnect[^>]+fonts\.g/.test(html), "(a) the fonts.g* preconnect hints are gone");

// ---- (b) @font-face self-hosts both families, all weights -------------------
const faces = css.match(/@font-face\{[\s\S]*?\}/g) || [];
ok(faces.length >= 2, "(b) styles.css declares ≥2 @font-face rules (" + faces.length + ")");
function faceFor(family){ return faces.find(f => new RegExp("font-family:\\s*['\"]" + family + "['\"]").test(f)); }
const sg = faceFor("Space Grotesk"), jbm = faceFor("JetBrains Mono");
ok(!!sg && /url\(fonts\/[^)]+\.woff2\)/.test(sg), "(b) Space Grotesk @font-face self-hosts a local fonts/*.woff2");
ok(!!jbm && /url\(fonts\/[^)]+\.woff2\)/.test(jbm), "(b) JetBrains Mono @font-face self-hosts a local fonts/*.woff2");
ok(/format\(['"]woff2['"]\)/.test(sg || "") && /format\(['"]woff2['"]\)/.test(jbm || ""), "(b) both declare format('woff2')");
ok(/font-display:\s*swap/.test(sg || "") && /font-display:\s*swap/.test(jbm || ""), "(b) both use font-display:swap (text visible while the local font loads)");
// the variable-font weight RANGE must cover the weights the CSS actually uses.
function weightRange(face){ const m = (face || "").match(/font-weight:\s*(\d+)\s+(\d+)/); return m ? [+m[1], +m[2]] : null; }
const sgR = weightRange(sg), jbmR = weightRange(jbm);
ok(sgR && sgR[0] <= 400 && sgR[1] >= 700, "(b) Space Grotesk covers 400–700 (the weights in use): " + JSON.stringify(sgR));
ok(jbmR && jbmR[0] <= 400 && jbmR[1] >= 800, "(b) JetBrains Mono covers 400–800 (incl. the 800 mark): " + JSON.stringify(jbmR));
ok(/--display:\s*['"]Space Grotesk['"]/.test(css) && /--mono:\s*['"]JetBrains Mono['"]/.test(css), "(b) the --display/--mono vars still name the self-hosted families");

// ---- (c) the woff2 files exist + are real -----------------------------------
[["Space Grotesk", sg], ["JetBrains Mono", jbm]].forEach(([name, face]) => {
  const rel = ((face || "").match(/url\((fonts\/[^)?]+\.woff2)/) || [])[1];
  ok(!!rel, "(c) " + name + " names a font file path");
  if(!rel) return;
  const p = path.join(__dirname, "..", rel);
  ok(fs.existsSync(p), "(c) " + name + " file exists: " + rel);
  if(fs.existsSync(p)){
    const buf = fs.readFileSync(p);
    ok(buf.slice(0, 4).toString("ascii") === "wOF2", "(c) " + rel + " has the wOF2 magic (a real woff2)");
    ok(buf.length > 5000, "(c) " + rel + " is a substantial font (" + buf.length + "B, not an error page)");
  }
});

// ---- (d) the self-hosted fonts cache-bust (?v=) + leave no bare ref ----------
const { bust, bareRefs } = require("../scripts/cachebust.js");
ok(bareRefs(css).some(r => /\.woff2$/.test(r)), "(d) the SOURCE styles.css has bare font refs (the deploy cachebust versions them)");
const built = bust(css, "abc1234");
ok(/url\(fonts\/[^)]+\.woff2\?v=abc1234\)/.test(built), "(d) cachebust appends ?v=<sha> to the font url()s");
ok(!bareRefs(built).some(r => /\.woff2$/.test(r)), "(d) after cachebust NO bare font ref survives (cache-bust verifier clean)");
ok(bust(built, "abc1234") === built, "(d) cachebust is idempotent on fonts (re-running adds nothing)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " FONT CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
