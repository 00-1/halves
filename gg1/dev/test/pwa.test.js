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
  // T208 — the static mark is EMPTY (renderBrand paints Magnar; no hard-coded x/2 flash)
  ok(/<div class="mark"><\/div>/.test(idx) && !/<div class="mark">x<span/.test(idx), "(a2) T208: the splash mark is empty (painted by renderBrand; the old x/2 flash is gone)");
  // T208 — the full title is "Goblin Gold: The Void Throne" — the void line is the subtitle
  ok(/<div class="subtitle">The Void Throne<\/div>/.test(idx), "(a2) T208: 'The Void Throne' subtitle sits below the Goblin Gold wordmark");
  // T209 — the title pair is rendered as pixel-art (gold wordmark / void subtitle) with Bayer dither + glints
  const mn = read("main.js");
  ok(/function paintPixelTitle\(/.test(mn) && /BAYER4/.test(mn), "(a2) T209: paintPixelTitle renders dithered pixel text (Bayer-4)");
  ok(/TITLE_GOLD\s*=\s*\[\[255/.test(mn) && /TITLE_VOID\s*=/.test(mn), "(a2) T209: a GOLD ramp (Goblin Gold) + a VOID ramp (The Void Throne)");
  ok(/paintPixelTitle\(e\.querySelector\("\.brand"\), TITLE_GOLD/.test(mn) && /paintPixelTitle\(e\.querySelector\("\.subtitle"\), TITLE_VOID/.test(mn), "(a2) T209: the wordmark is gold, the subtitle is void");
  ok(/glint && !prefersReducedMotion\(\)/.test(mn), "(a2) T209: the glint sweep is throttled + skipped under reduced-motion");
  const cssT = read("styles.css");
  ok(/\.pixtitle\{[^}]*image-rendering:pixelated/.test(cssT), "(a2) T209: the pixel-title canvas renders crisp (image-rendering:pixelated)");
  // T210 — refinements: ~3× bigger, lightened void ramp, no void glint
  ok(/\.brand\{[^}]*font-size:clamp\(54px/.test(cssT) && /\.subtitle\{[^}]*font-size:clamp\(30px/.test(cssT), "(a2) T210/T217: the titles are big (3×), subtitle shrunk for wider mono ALL-CAPS");
  ok(/TITLE_VOID = \[\[205,169,255\]/.test(mn), "(a2) T210: the Void Throne ramp is lightened toward the brand purple (luminous)");
  // T212 — fix the "i" (higher raster res), corrupt the void line, tighter letters
  ok(/const cellsH = 26/.test(mn) && /span = Math\.max\(1, yMax - yMin\), PXX = 2/.test(mn), "(a2) T212/T220: raster res cellsH 18→26 (the 'i' dot/stem separate), base cell PXX=2");
  ok(/const ls = corrupt \? "2px" : "-1\.5px"/.test(mn) && /letterSpacing = ls/.test(mn), "(a2) T212/T221: gold raster stays tight (-1.5px); the void line gets WIDE positive spacing (2px)");
  ok(/if\(corrupt\)\{[\s\S]{0,260}continue;[\s\S]{0,160}ox \+=/.test(mn), "(a2) T212: a corruption pass (dropped + displaced cells) glitches the void line");
  ok(/paintPixelTitle\(e\.querySelector\("\.subtitle"\), TITLE_VOID, null, true/.test(mn), "(a2) T212: the void line is corrupted (4th arg true); gold stays clean + glinting");
  // T214 — more corruption + transparency dither + tighter gap + action block at the bottom
  ok(/r < 12\) continue;/.test(mn) && /r < 28\) ox \+=/.test(mn), "(a2) T214: the void line is corrupted FURTHER (~12% dropped / ~16% displaced)");
  ok(/alpha = 0\.4/.test(mn) && /rgba\(/.test(mn), "(a2) T214: TRANSPARENCY dither dissolves void cells (alpha < 1 → rgba)");
  ok(/\.subtitle\{[^}]*margin-top:-6px/.test(cssT), "(a2) T214: the brand↔subtitle gap is tightened");
  ok(/\.tag\{[^}]*margin-top:auto/.test(cssT), "(a2) T214: the tag + action block is pushed to the BOTTOM");
  // T216 — distinct void font, animated glitch, title back to upper-centre
  ok(/paintPixelTitle\(e\.querySelector\("\.subtitle"\), TITLE_VOID, null, true, "'JetBrains Mono'/.test(mn), "(a2) T216: the Void Throne uses a DISTINCT self-hosted face (JetBrains Mono)");
  ok(/Math\.imul\(cseed \| 0, 2654435761\)/.test(mn), "(a2) T216: the corruption pattern re-rolls per frame (cseed in the hash) — animated glitch");
  ok(/if\(corrupt && !prefersReducedMotion\(\)/.test(mn), "(a2) T216/T217: the corruption animation is skipped under reduced-motion → fully static");
  ok(/#entry\{[^}]*padding:clamp\(40px,11vh,120px\)/.test(cssT), "(a2) T216: the title is back upper-centre (space above via padding-top); actions stay at the bottom");
  // T217 — void line ALL CAPS + intermittent (bursting) interference, not continual
  ok(/function paintPixelTitle\(el, ramp, glint, corrupt, fontOverride, upper\)/.test(mn) && /const text = upper \? src\.toUpperCase\(\) : src/.test(mn), "(a2) T217: paintPixelTitle takes an `upper` flag → renders the void line ALL CAPS");
  ok(/paintPixelTitle\(e\.querySelector\("\.subtitle"\), TITLE_VOID, null, true, "'JetBrains Mono',ui-monospace,monospace", true\)/.test(mn), "(a2) T217: the void subtitle is rendered uppercase ('THE VOID THRONE')");
  ok(/const burst = \(\) =>/.test(mn) && /function flick\(\)/.test(mn), "(a2) T217: a burst/flick scheduler replaces the continual tick (intermittent interference)");
  // T220 — the void line is stretched VERTICALLY + the flicker is faster/more random, cutting fully on/off
  ok(/PXX = 2, PXY = corrupt \? 3 : 2/.test(mn) && /d\.fillRect\(ox \* PXX, oy \* PXY, PXX, PXY\)/.test(mn), "(a2) T220: the void line uses taller-than-wide cells (PXY>PXX); gold stays square");
  ok(/const blankLine = \(\) => d\.clearRect\(0, 0, disp\.width, disp\.height\)/.test(mn) && /Math\.random\(\) < 0\.2\) blankLine\(\)/.test(mn), "(a2) T220: brief WHOLE-LINE dropouts cut the line fully on/off during a burst");
  ok(/setTimeout\(flick, 35 \+ Math\.random\(\) \* 70\)/.test(mn), "(a2) T220: the flicker is faster + jittery (random ~35–105ms ticks, not a fixed 90ms)");
  ok(/setTimeout\(burst, 1600 \+ Math\.random\(\) \* 2600\)/.test(mn), "(a2) T220: shorter, more frequent idle between bursts; settles to the clean frame (draw(null))");
  // T221 — void line gets wide letter-spacing + a Star-Wars perspective skew (bottom wider than top)
  ok(/const rs = 0\.6 \+ 0\.4 \* \(\(y - yMin\) \/ span\)/.test(mn) && /\(cx \+ \(ox - cx\) \* rs\) \* PXX/.test(mn), "(a2) T221: per-row horizontal scale ramps with depth about the centre (bottom wider than top)");
  ok(/cx = w \/ 2/.test(mn), "(a2) T221: the skew is taken about the horizontal centre (cx = w/2)");
  ok(/\.pixtitle\{[^}]*max-width:100%/.test(cssT), "(a2) T221: .pixtitle max-width:100% guarantees no clip at 360px");
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
ok(/const CACHE = SCOPE \+ "-static-v4"/.test(sw) && /return "halves";/.test(sw), "(c) T201/T222: CACHE is scope-namespaced (<scope>-static-v4), defaulting to halves-static-v4 at root");

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
  ok(/const CACHE = SCOPE \+ "-static-v4"/.test(sw) && /k\.indexOf\(SCOPE \+ "-"\) === 0 && k !== CACHE/.test(sw), "(e) T201/T222: CACHE is scope-namespaced + activate purges only THIS scope's superseded caches (no cross-app eviction)");
  let waited; listeners.activate({ waitUntil(p){ waited = p; } }); await waited;
  ok(deleted.indexOf("halves-static-v2") >= 0 && deleted.indexOf("halves-static-v3") >= 0, "(e) activate purges the superseded caches (incl. the v3 with frozen manifest/icons)");

  console.log("\n" + (fails === 0 ? "ALL " + checks + " PWA CHECKS PASSED" : fails + "/" + checks + " FAILED"));
  process.exit(fails ? 1 : 0);
})();
