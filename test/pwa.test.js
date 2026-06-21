/* T102 — PWA installability + offline. Proves the no-build PWA core ships and is
 * VALID, and crucially that the service worker can't break the T54 update flow:
 *   (a) a valid manifest.webmanifest (installable fields + a maskable icon);
 *   (b) the head links the manifest + theme-color, and the icon exists;
 *   (c) sw.js registers (guarded) + has a fetch handler that is NETWORK-FIRST for
 *       build.json + navigations (so updates/the version check still work) and
 *       CACHE-FIRST for the immutable ?v= assets, and NEVER caches build.json.
 * Run: node test/pwa.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// ---- (a) the manifest is valid + installable -------------------------------
let mani = null;
try{ mani = JSON.parse(read("manifest.webmanifest")); }catch(e){ /* mani stays null */ }
ok(!!mani, "(a) manifest.webmanifest is valid JSON");
if(mani){
  ok(typeof mani.name === "string" && mani.name && typeof mani.short_name === "string" && mani.short_name, "(a) manifest has name + short_name");
  ok(mani.start_url && mani.scope, "(a) manifest has start_url + scope");
  ok(mani.display === "standalone" || mani.display === "fullscreen", "(a) manifest display is standalone/fullscreen (installable)");
  ok(/^#[0-9a-fA-F]{6}$/.test(mani.theme_color || "") && /^#[0-9a-fA-F]{6}$/.test(mani.background_color || ""), "(a) manifest has hex theme_color + background_color");
  const icons = mani.icons || [];
  ok(icons.length >= 1 && icons.every(i => i.src && i.type), "(a) manifest declares icon(s) with src + type");
  ok(icons.some(i => /\bmaskable\b/.test(i.purpose || "")), "(a) at least one MASKABLE icon (survives Android adaptive-icon crops)");
  ok(icons.every(i => fs.existsSync(path.join(__dirname, "..", i.src))), "(a) every manifest icon file actually exists");
}

// ---- (b) the head wires the manifest + the icon ----------------------------
const html = read("index.html");
ok(/<link rel="manifest" href="manifest\.webmanifest">/.test(html), "(b) index.html links the manifest");
ok(/<meta name="theme-color" content="#[0-9a-fA-F]{6}">/.test(html), "(b) index.html sets a theme-color meta");
ok(/<link rel="apple-touch-icon"/.test(html), "(b) index.html provides an apple-touch-icon (iOS home-screen)");
ok(/<svg[\s\S]*<\/svg>/.test(read("icon.svg")), "(b) icon.svg is a real SVG");

// ---- (c) the service worker is registered + UPDATE-SAFE --------------------
const main = read("main.js");
ok(/navigator\.serviceWorker(\.| &&)/.test(main) && /register\("sw\.js"\)/.test(main), "(c) main.js registers the service worker (sw.js), guarded");
ok(/addEventListener\("load"/.test(main.slice(main.indexOf('register("sw.js"') - 200, main.indexOf('register("sw.js"') + 50)) || /window\.addEventListener\("load", reg\)/.test(main), "(c) the SW registers lazily (on load, never blocking boot)");
const sw = read("sw.js");
ok(/addEventListener\("fetch"/.test(sw) && /addEventListener\("install"/.test(sw) && /addEventListener\("activate"/.test(sw), "(c) sw.js has install/activate/fetch handlers");
// the update-flow safety: build.json + navigations are network-first; build.json never cached
ok(/isBuild/.test(sw) && /req\.mode === "navigate"/.test(sw), "(c) sw.js distinguishes navigations + build.json (the update-critical requests)");
ok(/isNav \|\| isBuild/.test(sw) && /await fetch\(req\)/.test(sw), "(c) navigations + build.json are NETWORK-FIRST (a new deploy + the T54 version check always reach the user)");
ok(/!isBuild/.test(sw) && sw.indexOf("!isBuild") < sw.lastIndexOf("c.put"), "(c) sw.js NEVER caches build.json (the version check reads fresh)");
ok(/caches\.keys\(\)[\s\S]{0,160}caches\.delete/.test(sw), "(c) activate cleans superseded caches (no stale-forever assets)");
ok(/self\.skipWaiting\(\)/.test(sw) && /clients\.claim\(\)/.test(sw), "(c) the SW takes over promptly (skipWaiting + clients.claim)");

// ---- (d) no-build: the SW/manifest/icon aren't versioned, and other gates hold
const { bust } = require("../scripts/cachebust.js");
const built = bust(html, "abc1234");
ok(!/manifest\.webmanifest\?v=/.test(built) && !/sw\.js\?v=/.test(built) && !/icon\.svg\?v=/.test(built), "(d) cache-bust leaves the manifest/sw/icon refs BARE (the browser manages those itself)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " PWA CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
