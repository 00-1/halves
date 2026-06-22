/* T107 — asset cache-busting so deploys actually ship fresh CSS/JS. The source
 * index.html keeps BARE asset refs (no-build); CI rewrites the deployed copy to
 * append ?v=<shortSha> to the stylesheet + every local module script, so a new
 * build is a new URL the cache can't shadow. This gate proves the rewrite (the
 * SAME scripts/cachebust.js the CI runs) versions every local asset and leaves no
 * bare ref — i.e. the BUILT index.html ships fully versioned — while external
 * refs stay untouched and the source stays clean.
 * Run: node test/cache-bust.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

const { bust, bareRefs } = require("../scripts/cachebust.js");
const html = read("index.html");

// ---- the source keeps clean, bare refs (no-build; other gates match exact refs)
const srcRefs = bareRefs(html);
const EXPECTED = ["styles.css","icons.js","glyphs.js","modes.js","events.js","guides.js","collectibles.js",
  "heroes.js","enemies.js","monsters.js","scenery.js","eventart.js","fx.js","fxgl.js","sound.js","synth.js","main.js"];
EXPECTED.forEach(f => ok(srcRefs.includes(f), "source index.html references " + f + " (bare, in the bust set)"));
ok(/href="styles\.css"/.test(html) && /src="main\.js"/.test(html), "source refs are still BARE (no-build: source untouched, other gates rely on this)");

// ---- the CI rewrite versions EVERY local asset ref --------------------------
const SHA = "a1b2c3d";
const built = bust(html, SHA);
ok(bareRefs(built).length === 0, "after the rewrite NO bare local asset ref survives (the built index.html ships fully versioned)");
EXPECTED.forEach(f => ok(new RegExp('(?:href|src)="' + f.replace(".","\\.") + '\\?v=' + SHA + '"').test(built),
  "built index.html versions " + f + " → ?v=" + SHA));
// every css/js ref that carries ?v= carries the CURRENT sha (no stale/mismatched v)
const versioned = built.match(/(?:href|src)="[^"]+\.(?:css|js)\?v=([^"]+)"/g) || [];
ok(versioned.length === EXPECTED.length && versioned.every(s => s.indexOf("?v=" + SHA) >= 0),
   "all " + versioned.length + " versioned refs carry the one current sha (no mismatch)");

// ---- external + non-asset refs are left alone (bust is pure → test synthetically)
const sample = '<link rel="stylesheet" href="https://cdn.example/x.css"> <script src="data:text/javascript,1"></script> <a href="page.html">';
const sb = bust(sample, SHA);
ok(/href="https:\/\/cdn\.example\/x\.css">/.test(sb), "an external (scheme'd) .css ref is left untouched");
ok(/src="data:text\/javascript,1"/.test(sb), "a data: URI is left untouched");
ok(/href="page\.html">/.test(sb), "a non-asset (.html) ref is left untouched");
// ---- T169: the SELF-HOSTED font url()s in styles.css ARE versioned ----------
const cssBuilt = bust(read("styles.css"), SHA);
ok(/url\(fonts\/[^)]+\.woff2\?v=/.test(cssBuilt), "T169: cachebust versions the self-hosted font url()s in styles.css");
ok(!bareRefs(cssBuilt).some(r => /\.woff2$/.test(r)), "T169: no bare font ref survives in the built styles.css");

// ---- idempotent: re-running never double-appends ----------------------------
ok(bust(built, SHA) === built, "re-running the bust is idempotent (already-versioned refs skipped)");

// ---- it cooperates with the T54 version-check (build stamp is the source of v)
const wf = read(".github/workflows/pages.yml");
ok(/cachebust\.js/.test(wf), "the deploy workflow runs scripts/cachebust.js");
ok(/GITHUB_SHA:0:7/.test(wf), "CI busts with the short commit sha (the same identity build.json stamps)");
// the rewrite runs AFTER the node gates (so they see clean refs) and BEFORE upload
const bustAt = wf.indexOf("cachebust.js"), uploadAt = wf.indexOf("upload-pages-artifact"), lastGate = wf.lastIndexOf("test/");
ok(lastGate >= 0 && bustAt > lastGate, "the cache-bust step runs AFTER the node test gates (they see bare refs)");
ok(uploadAt >= 0 && bustAt < uploadAt, "the cache-bust step runs BEFORE the site upload (the deployed copy is versioned)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " CACHE-BUST CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
