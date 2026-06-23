/* T226 part (1) — generic path-derived per-folder storage SCOPE. One origin
 * (00-1.github.io) hosts many GitHub-Pages apps that would otherwise SHARE one
 * localStorage/Cache bucket, so main.js derives a per-folder scope from the path:
 * `/gg<N>/<variant>/` → `gg<N>` + the alphanumeric-only variant. This proves:
 *   (A) the derivation reproduces the four EXISTING scopes byte-for-byte
 *       (gg1dev/gg1prod/gg2dev/halves) — migration-critical — AND gives the NEW
 *       frozen `/gg1/v1.0.0/` archive its OWN isolated bucket instead of silently
 *       sharing the root `halves` save; the dot-stripped prefix can't collide with
 *       the `gg1v1` scope under the clear-data sweep's dot-delimited matching;
 *   (B) main.js actually implements that generic derivation (path regex + sanitiser,
 *       no resurrected hard-coded folder list) and keeps the gg1prod save migration.
 * Run: node gg1/dev/test/app-scope.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// ---- (A) the derivation, re-stated faithfully from main.js --------------------
function scopeFor(pathname){
  try{ const m = pathname.match(/\/(gg\d+)\/([^\/]+)\//);
    if(m) return m[1] + m[2].replace(/[^a-z0-9]/gi, "");
  }catch(e){}
  return "halves";
}

// existing scopes — MUST be byte-for-byte what the old hard-coded list returned
const EXISTING = {
  "/halves/gg1/dev/":  "gg1dev",
  "/halves/gg1/prod/": "gg1prod",
  "/halves/gg2/dev/":  "gg2dev",
  "/halves/gg1/v1/":   "gg1v1"
};
Object.keys(EXISTING).forEach(p =>
  ok(scopeFor(p) === EXISTING[p], "(A) existing scope preserved: " + p + " → " + EXISTING[p] + " (got " + scopeFor(p) + ")"));

// the root landing / any non-app path stays the legacy `halves` bucket (no migration)
["/halves/", "/halves/index.html", "/", ""].forEach(p =>
  ok(scopeFor(p) === "halves", "(A) non-app path stays legacy `halves`: " + JSON.stringify(p)));

// a deeper file under an app folder still resolves to that app's scope
ok(scopeFor("/halves/gg1/dev/index.html") === "gg1dev", "(A) a file under /gg1/dev/ still scopes to gg1dev");

// the NEW frozen archive gets its OWN isolated, dot-free bucket
ok(scopeFor("/halves/gg1/v1.0.0/") === "gg1v100", "(A) the /gg1/v1.0.0/ archive is isolated → gg1v100 (NOT the root `halves`)");
ok(scopeFor("/halves/gg1/v1.0.0/") !== "halves", "(A) …so the frozen archive no longer shares the root save");
// dot-free → its key prefix can't be swept up by the gg1v1 scope (dot-delimited match)
const arch = scopeFor("/halves/gg1/v1.0.0/") + ".", v1 = "gg1v1" + ".";
ok(arch.indexOf(v1) !== 0, "(A) the archive prefix (" + arch + ") does NOT start with the gg1v1 prefix (" + v1 + ") — no clear-data collision");

// future sequels auto-isolate without a code change
ok(scopeFor("/halves/gg2/prod/") === "gg2prod" && scopeFor("/halves/gg2/v2.0.0/") === "gg2v200",
   "(A) future folders (gg2/prod, gg2/v2.0.0) auto-derive isolated scopes — no hard-coding");

// ---- (B) main.js implements exactly that generic derivation -------------------
(function wiring(){
  const m = read("main.js");
  ok(/const SCOPE = \(function\(\)\{[\s\S]{0,200}location\.pathname\.match\(\/\\\/\(gg\\d\+\)\\\/\(\[\^\\\/\]\+\)\\\/\//.test(m),
     "(B) SCOPE is derived from a generic /gg<N>/<variant>/ path match");
  ok(/m\[1\] \+ m\[2\]\.replace\(\/\[\^a-z0-9\]\/gi, ""\)/.test(m),
     "(B) the variant is sanitised to alphanumerics (dot-free prefix → no scope collision)");
  ok(!/p\.indexOf\("\/gg1\/dev\/"\)/.test(m) && !/return "gg1dev"/.test(m),
     "(B) the old hard-coded folder list is gone (genuinely generic, not a parallel branch)");
  ok(/return "halves";/.test(m), "(B) the root / unknown fallback is still the legacy `halves` bucket");
  ok(/SCOPE === "gg1prod" && REAL_LS/.test(m) && /halves\.gold/.test(m),
     "(B) the one-time halves.*→gg1prod.* prod save migration is intact (migration-critical)");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " APP-SCOPE CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
