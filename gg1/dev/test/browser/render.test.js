/* T150 — Autonomous BROWSER-RENDER gate (Playwright + headless Chromium).
 *
 * WHY: our whole Node suite is headless-stub-only — it can't see a rendered pixel,
 * a layout, or `display:none`. That is EXACTLY how the celebration bug (T149) hid
 * through six rounds: every "drawn? / sized?" gate passed while `#fxBurst` was a
 * `0×0`, `display:none` child of a hidden modal. This gate loads the REAL app in a
 * REAL browser at a phone viewport + dpr 2.75, fires the REAL celebration, and
 * asserts the burst canvas is on-screen (`clientWidth>0`) AND actually lit
 * (measured pixel coverage). A `clientWidth===0` / zero-coverage canvas FAILS it.
 *
 * GUARDED / OPT-IN: if Playwright or a browser is unavailable it SKIPS cleanly
 * (exit 0) so the Node-only CI path is unaffected — this is an ADDITIONAL gate.
 *
 * Run locally:
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node test/browser/render.test.js
 * (or set PLAYWRIGHT_PATH to a playwright install if it's not on the default path.)
 */
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");

const ROOT = path.join(__dirname, "..", "..");          // repo root (served read-only)
const SHOTS = path.join(__dirname, "screenshots");
const VIEWPORT = { width: 390, height: 844 };           // a phone (CSS px)
const DPR = 2.75;                                         // the Poco-X3-class device ratio (T138)
const COVERAGE_MIN = 2000;                                // lit burst pixels (spike measured ~4e5)

let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }
function skip(why){ console.log("\nSKIP (browser gate not run): " + why + "\n(Node-only CI is unaffected — this is an additional, opt-in gate.)"); process.exit(0); }

// ---- resolve Playwright without adding a repo dependency --------------------
function loadPlaywright(){
  const tries = ["playwright", process.env.PLAYWRIGHT_PATH, "/opt/node22/lib/node_modules/playwright"];
  for(const p of tries){ if(!p) continue; try{ return require(p); }catch(e){ /* next */ } }
  return null;
}

// ---- a tiny dependency-free static file server -----------------------------
const MIME = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".json":"application/json",
               ".png":"image/png", ".svg":"image/svg+xml", ".ico":"image/x-icon", ".webmanifest":"application/manifest+json" };
function startServer(){
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || "/").split("?")[0]);
      if(url === "/") url = "/index.html";
      const fp = path.join(ROOT, path.normalize(url));
      if(fp.indexOf(ROOT) !== 0){ res.statusCode = 403; res.end("forbidden"); return; }
      fs.readFile(fp, (err, data) => {
        if(err){ res.statusCode = 404; res.end("not found"); return; }
        res.setHeader("Content-Type", MIME[path.extname(fp)] || "application/octet-stream");
        res.end(data);
      });
    });
    srv.listen(0, () => resolve(srv));
  });
}

// A console/page error is only an APP failure if it's a real JS error — NOT a
// resource-load failure (the headless env intercepts the Google-Fonts CDN with a
// bad cert and 404s /favicon.ico; both are environment noise, not app bugs).
function isResourceNoise(text){
  return /Failed to load resource|net::ERR_|ERR_CERT|favicon|fonts\.(googleapis|gstatic)/i.test(text || "");
}

// Fire the REAL celebration through the production handler (clicks the FX-tester
// "Big burst" button → fireCelebrationTest → setupFx → fxBigBurst on #fxBurst).
async function fireBurst(page){
  await page.evaluate(() => {
    const b = document.querySelector('#fxTest button[data-fx="big"]');
    if(b) b.click();
  });
}
// Measure the burst overlay: on-screen width + lit-pixel coverage (the 2D backend
// draws fillRects with alpha, so non-transparent pixels = lit particles).
async function measureBurst(page){
  return page.evaluate(() => {
    const c = document.getElementById("fxBurst");
    if(!c) return { present: false, clientWidth: 0, lit: 0, w: 0, h: 0 };
    const out = { present: true, clientWidth: c.clientWidth, w: c.width, h: c.height, lit: 0 };
    try{
      const g = c.getContext("2d");
      if(g && c.width && c.height){
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let lit = 0; for(let k = 3; k < d.length; k += 4){ if(d[k] > 10) lit++; }
        out.lit = lit;
      }
    }catch(e){ out.readErr = e.message; }
    return out;
  });
}
// Sample the burst across its animated lifetime; return the PEAK coverage seen.
async function peakBurst(page, samples, gapMs){
  let peak = { present: false, clientWidth: 0, lit: 0, w: 0, h: 0 };
  for(let i = 0; i < samples; i++){
    const m = await measureBurst(page);
    if(m.lit >= peak.lit) peak = m;
    await page.waitForTimeout(gapMs);
  }
  return peak;
}

(async () => {
  const pw = loadPlaywright();
  if(!pw || !pw.chromium) skip("Playwright not found (set PLAYWRIGHT_PATH).");
  if(!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync("/opt/pw-browsers"))
    process.env.PLAYWRIGHT_BROWSERS_PATH = "/opt/pw-browsers";

  const srv = await startServer();
  const base = "http://127.0.0.1:" + srv.address().port + "/index.html";
  let browser = null;
  try{ browser = await pw.chromium.launch({ headless: true }); }
  catch(e){ srv.close(); skip("Chromium launch failed: " + e.message); }

  try{
    fs.mkdirSync(SHOTS, { recursive: true });
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR });
    const page = await ctx.newPage();

    // (1) capture real JS errors (resource-load noise is filtered out).
    const appErrors = [];
    page.on("pageerror", e => appErrors.push("pageerror: " + e.message));
    page.on("console", m => { if(m.type() === "error" && !isResourceNoise(m.text())) appErrors.push("console: " + m.text()); });

    await page.goto(base, { waitUntil: "load" });
    await page.waitForFunction(() => !!window.FXGL && !!document.getElementById("fxBurst"), { timeout: 8000 });
    await page.waitForTimeout(300);   // let the app settle

    ok(appErrors.length === 0, "the app loads with NO JS errors" + (appErrors.length ? " — " + appErrors.slice(0, 3).join(" · ") : ""));

    // (2) THE celebration gate (the T149-catcher): fire it, then assert the burst
    //     canvas is on-screen AND actually lit.
    await fireBurst(page);
    const burst = await peakBurst(page, 20, 75);   // ~1.5 s across the burst's life
    await page.screenshot({ path: path.join(SHOTS, "celebration.png") });
    try{ const el = await page.$("#fxBurst"); if(el) await el.screenshot({ path: path.join(SHOTS, "fxBurst.png") }); }catch(e){}

    ok(burst.present, "#fxBurst exists in the DOM");
    ok(burst.clientWidth > 0, "#fxBurst is ON-SCREEN (clientWidth=" + burst.clientWidth + " > 0) — NOT display:none/0×0 [the T149 bug]");
    ok(burst.w > 0 && burst.h > 0, "#fxBurst has a non-zero drawing buffer (" + burst.w + "×" + burst.h + ")");
    ok(burst.lit >= COVERAGE_MIN, "the celebration is VISIBLY LIT (" + burst.lit + " lit px ≥ " + COVERAGE_MIN + ") — not a blank canvas");

    // (3) FX backdrop — best-effort capability check. Headless Chromium has WebGL2,
    //     but the backdrop's VISIBILITY is owned by [A]'s per-screen routing (it sits
    //     hidden on the entry screen), so we softly report rather than hard-fail.
    const bg = await page.evaluate(() => {
      const c = document.getElementById("fxBackdrop");
      let webgl2 = false; try{ webgl2 = !!document.createElement("canvas").getContext("webgl2"); }catch(e){}
      return { present: !!c, w: c ? c.width : 0, h: c ? c.height : 0, hidden: c ? c.classList.contains("hidden") : null, webgl2 };
    });
    ok(bg.present && bg.webgl2 && bg.w > 0 && bg.h > 0,
       "FX backdrop is mountable (canvas " + bg.w + "×" + bg.h + ", WebGL2=" + bg.webgl2 + (bg.hidden ? "; hidden by [A] screen routing — soft" : "") + ")");

    // (TEETH) prove the gate would CATCH the T149 bug: re-nest #fxBurst inside a
    //     `display:none` wrapper — EXACTLY the T149 condition (canvas was a hidden
    //     modal child) — and assert the on-screen check now reads `clientWidth===0`.
    //     That is the precise discriminator the gate keys on; if it didn't trip here,
    //     the `clientWidth>0` assertion above would be a no-op. (Coverage is a
    //     separate guard for blank/0-buffer canvases; a display:none canvas keeps its
    //     last-drawn buffer, so `clientWidth` — not `lit` — is the T149 signal.)
    const teeth = await (async () => {
      await page.evaluate(() => {
        const hide = document.createElement("div");
        hide.style.display = "none"; hide.id = "t150_hidden_modal";
        const c = document.getElementById("fxBurst");
        if(c && c.parentNode){ c.parentNode.insertBefore(hide, c); hide.appendChild(c); }
      });
      await page.waitForTimeout(50);
      return measureBurst(page);
    })();
    ok(teeth.clientWidth === 0,
       "the gate HAS TEETH: a display:none #fxBurst reads OFF-SCREEN (clientWidth=" + teeth.clientWidth + ") → the T149 bug would FAIL the `clientWidth>0` gate above");

    await ctx.close();
  } catch(e){
    fails++; console.log("  FAIL: harness error — " + (e && e.stack || e));
  } finally {
    if(browser) await browser.close();
    srv.close();
  }

  console.log("\nScreenshots → " + SHOTS);
  console.log(fails === 0 ? "ALL " + checks + " BROWSER-RENDER CHECKS PASSED" : fails + "/" + checks + " FAILED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("BROWSER GATE ERROR: " + (e && e.stack || e)); process.exit(1); });
