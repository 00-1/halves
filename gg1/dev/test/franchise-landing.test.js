/* T222 — the franchise GitHub-Pages restructure. Validates the multi-app layout +
 * the landing contract + the per-app scoping that lets sibling apps share one origin
 * without clobbering each other. Reads up to the REPO ROOT (this test lives under
 * gg1/dev/test/, the app's own folder).
 * Run: node gg1/dev/test/franchise-landing.test.js
 */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "..", "..");   // gg1/dev/test → repo root
function rd(p){ return fs.readFileSync(path.join(ROOT, p), "utf8"); }
function exists(p){ try{ fs.accessSync(path.join(ROOT, p)); return true; }catch(e){ return false; } }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// ---- (1) the folder layout exists -------------------------------------------
["index.html", "apps.json", "gg1/dev/index.html", "gg1/prod/index.html", "gg2/dev/index.html",
 "gg1/dev/sw.js", "gg1/prod/sw.js", "gg1/dev/manifest.webmanifest", "gg1/prod/manifest.webmanifest",
 "gg1/dev/main.js", "gg1/prod/main.js"].forEach(p => ok(exists(p), "(1) " + p + " exists"));
// the dev folder keeps its build tooling + tests; prod is the lean runtime (no test/)
ok(exists("gg1/dev/test") && exists("gg1/dev/scripts"), "(1) gg1/dev/ keeps test/ + scripts/");
ok(!exists("gg1/prod/test"), "(1) gg1/prod/ is the lean runtime (no test/)");

// ---- (2) apps.json is a valid registry the landing can read -----------------
let apps = null;
try{ apps = JSON.parse(rd("apps.json")); }catch(e){}
ok(Array.isArray(apps) && apps.length >= 2, "(2) apps.json is a JSON array of apps");
if(apps){
  ok(apps.every(a => a && typeof a.path === "string" && /\/$/.test(a.path) && a.name && a.tag), "(2) every entry has a trailing-slash path + name + tag");
  ok(apps.some(a => a.path === "gg1/prod/") && apps.some(a => a.path === "gg1/dev/"), "(2) the registry lists gg1/prod/ and gg1/dev/");
  ok(apps.every(a => exists(a.path + "manifest.webmanifest")), "(2) every listed app has a manifest the landing can read");
}

// ---- (3) the landing reads apps.json THEN each app's manifest (Decision 1) ---
const land = rd("index.html");
ok(/fetch\(\s*["']apps\.json["']/.test(land), "(3) the landing fetches apps.json");
ok(/manifest\.webmanifest/.test(land), "(3) the landing reads each app's manifest.webmanifest for its identity");
ok(/\.unregister\(\)/.test(land), "(3) the landing unregisters the legacy root-scoped service worker");

// ---- (4) per-app SCOPE: storage + cache namespacing (the origin-share fixes) -
const main = rd("gg1/dev/main.js"), sw = rd("gg1/dev/sw.js");
ok(/SCOPE\s*=\s*\(function\(\)\{/.test(main) && /"gg1dev"/.test(main) && /"gg1prod"/.test(main), "(4) main.js derives a per-folder storage SCOPE");
ok(/SCOPE === "gg1prod"/.test(main) && /halves\.gold/.test(main), "(4) main.js does the one-time halves.*→gg1prod.* save migration");
ok(/const CACHE = SCOPE \+ "-static-v4"/.test(sw) && /k\.indexOf\(SCOPE \+ "-"\) === 0 && k !== CACHE/.test(sw), "(4) sw.js namespaces the cache per scope + evicts only its own");

console.log("\n" + (fails === 0 ? "ALL " + checks + " FRANCHISE-LANDING CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
