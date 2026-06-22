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
  // T171 — the PRODUCT is renamed to "Goblin Gold" (the maths TOPIC "Halves" stays).
  ok(mani.name === "Goblin Gold" && mani.short_name === "Goblin Gold", "(a) T171: the product name + short_name are 'Goblin Gold'");
}
// ---- (a2) T171: product rename reaches the title + the in-app entry wordmark --
{
  const idx = read("index.html");
  ok(/<title>[^<]*Goblin Gold[^<]*<\/title>/.test(idx) && !/<title>[^<]*Halves[^<]*<\/title>/.test(idx), "(a2) T171: <title> reads 'Goblin Gold', not 'Halves'");
  ok(/<div class="brand">Goblin Gold<\/div>/.test(idx), "(a2) T171: the entry splash shows the 'Goblin Gold' product wordmark");
  ok(/content="[^"]*Goblin Gold/.test(idx), "(a2) T171: the meta description leads with 'Goblin Gold'");
  // the maths TOPIC "Halves" (the x/2 drill) is UNCHANGED — only the product renamed.
  const sandbox = {}; global.window = sandbox; new Function(read("modes.js"))(); delete global.window;
  const halves = sandbox.MODES.find(m => m.id === "halves");
  ok(halves && halves.name === "Halves", "(a2) T171: the 'Halves' maths TOPIC is preserved (mode id=halves name='Halves')");
  ok(/<div class="mark">x<span class="slash">\/<\/span>2<\/div>/.test(idx), "(a2) T171: the x/2 topic mark stays on the splash (the drill identity is kept)");
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
ok(/isNav \|\| isBuild/.test(sw) && /await fetch\(req,\s*\{\s*cache:\s*"no-store"\s*\}\)/.test(sw), "(c) navigations + build.json are NETWORK-FIRST with cache:'no-store' (a new deploy + the T54 version check always reach the user, defeating the HTTP-cache shadow)");
ok(/!isBuild/.test(sw) && sw.indexOf("!isBuild") < sw.lastIndexOf("c.put"), "(c) sw.js NEVER caches build.json (the version check reads fresh)");
ok(/caches\.keys\(\)[\s\S]{0,160}caches\.delete/.test(sw), "(c) activate cleans superseded caches (no stale-forever assets)");
ok(/self\.skipWaiting\(\)/.test(sw) && /clients\.claim\(\)/.test(sw), "(c) the SW takes over promptly (skipWaiting + clients.claim)");
// T201 — the UNVERSIONED install-identity files (manifest + icons) must be NETWORK-
// FIRST, else cache-first freezes the first install's name/icon forever ("Halves"/x2).
ok(/FRESH_RE\s*=\s*\/.*manifest\\\.webmanifest[\s\S]*icon-\\d\+\\\.png/.test(sw), "(c) T201: sw.js matches manifest.webmanifest + icon files as freshness-critical");
ok(/const isFresh = FRESH_RE\.test/.test(sw) && /if\(isNav \|\| isBuild \|\| isFresh\)/.test(sw), "(c) T201: the manifest + icons are routed NETWORK-FIRST (isFresh joins the nav/build branch)");
ok(/halves-static-v4/.test(sw), "(c) T201: CACHE bumped to v4 so existing installs purge the frozen manifest/icons on next visit");

// ---- (d) no-build: the SW/manifest/icon aren't versioned, and other gates hold
const { bust } = require("../scripts/cachebust.js");
const built = bust(html, "abc1234");
ok(!/manifest\.webmanifest\?v=/.test(built) && !/sw\.js\?v=/.test(built) && !/icon\.svg\?v=/.test(built), "(d) cache-bust leaves the manifest/sw/icon refs BARE (the browser manages those itself)");

// ---- (e) T158: nav/build.json no-store; immutable ?v= assets stay cache-first --
// The deployed assets are ?v=-versioned (immutable), so cache-first on them is
// CORRECT — the staleness risk is the nav DOCUMENT shadowed by the HTTP cache. Run
// the REAL fetch handler in a fake SW sandbox and prove: navigations + build.json
// are fetched cache:"no-store" (defeat the shadow), versioned assets are served
// cache-first, fonts are cache-first, build.json is never cached, CACHE is bumped.
(async function swBehaviour(){
  const origin = "https://halves.example";
  const listeners = {};
  const cacheStore = new Map();
  const theCache = {
    async match(req){ return cacheStore.get(req.url || req); },
    async put(req, res){ cacheStore.set(req.url || req, res); }
  };
  let deleted = [];
  const cachesObj = {
    async open(){ return theCache; },
    async keys(){ return ["halves-static-v2", "halves-static-v3"]; },
    async delete(k){ deleted.push(k); return true; },
    async match(req){ return theCache.match(req); }
  };
  const mkRes = tag => ({ ok:true, type:"basic", _tag:tag, clone(){ return this; } });
  let netHits = [];
  const fetchImpl = async (req, init) => { netHits.push({ url: req.url || req, cache: init && init.cache }); return mkRes("NET"); };
  const ResponseObj = { error: () => mkRes("ERR") };
  const selfObj = { addEventListener(t, fn){ listeners[t] = fn; }, skipWaiting(){}, clients:{ claim(){} }, location:{ origin } };
  // run sw.js with the SW globals injected as locals
  new Function("self", "caches", "fetch", "Response", "URL",
    sw)(selfObj, cachesObj, fetchImpl, ResponseObj, URL);

  const dispatch = (reqUrl, mode) => {
    let captured; const req = { url: reqUrl, method:"GET", mode: mode || "no-cors" };
    listeners.fetch({ request:req, respondWith(p){ captured = p; } });
    return captured;
  };
  const lastHit = () => netHits[netHits.length - 1];
  // a navigation is network-first + cache:"no-store" (no stale index.html shadow)
  const rNav = await dispatch(origin + "/", "navigate");
  ok(rNav && rNav._tag === "NET" && lastHit() && lastHit().cache === "no-store", "(e) T158: navigations are fetched NETWORK-FIRST with cache:'no-store' (a stale index.html can't shadow a deploy)");
  // build.json: no-store, network-first, and NEVER cached
  const rBuild = await dispatch(origin + "/build.json");
  ok(rBuild && rBuild._tag === "NET" && lastHit().cache === "no-store" && !cacheStore.has(origin + "/build.json"), "(e) build.json is no-store + network-first + NEVER cached (the T54/T161 version check reads fresh)");
  // an immutable ?v= asset already in cache is served CACHE-FIRST (no network)
  cacheStore.set(origin + "/synth.js?v=abc123", mkRes("CACHED"));
  const beforeJs = netHits.length;
  const rJs = await dispatch(origin + "/synth.js?v=abc123");
  ok(rJs && rJs._tag === "CACHED" && netHits.length === beforeJs, "(e) immutable ?v= assets are CACHE-FIRST (a new deploy = new ?v= URL = cache miss = fresh; no stale pin)");
  // cross-origin fonts stay cache-first too
  const fontUrl = "https://fonts.example/f.woff2";
  cacheStore.set(fontUrl, mkRes("FONTCACHE"));
  const beforeFont = netHits.length;
  const rFont = await dispatch(fontUrl);
  ok(rFont && rFont._tag === "FONTCACHE" && netHits.length === beforeFont, "(e) cross-origin fonts stay CACHE-FIRST (offline-fast)");
  // the CACHE name is bumped + activate purges the prior cache
  ok(/const CACHE = "halves-static-v4"/.test(sw), "(e) T201: CACHE bumped to v4 (so activate drops the manifest/icons frozen under the prior cache-first policy)");
  let waited; listeners.activate({ waitUntil(p){ waited = p; } }); await waited;
  ok(deleted.indexOf("halves-static-v2") >= 0 && deleted.indexOf("halves-static-v3") >= 0, "(e) activate purges the superseded caches (incl. the v3 with frozen manifest/icons)");

  console.log("\n" + (fails === 0 ? "ALL " + checks + " PWA CHECKS PASSED" : fails + "/" + checks + " FAILED"));
  process.exit(fails ? 1 : 0);
})();
