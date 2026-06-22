/* T195 — visual CAPTURE of the gold hoard's halftone-dither FILTER on the WebGL2 backend.
 * Mounts a real FXGL backdrop (preferWebGL2) with a high-wealth hoard and screenshots the
 * settled pile, so the brickmap palette post-process look (posterised gold ramp + ordered
 * Bayer dot pattern, pixel-scaled/crisp — no smooth gradient) can be eyeballed against the
 * dithered scene behind it. Verification artifact, not a CI gate — SKIPS with no browser.
 * Run: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node test/browser/hoard-capture.js
 */
"use strict";
const fs = require("fs"), path = require("path");
const { loadPlaywright, startServer, ensureBrowsersPath } = require("./_harness.js");

const SHOTS = path.join(__dirname, "screenshots");
const VIEWPORT = { width: 390, height: 844 }, DPR = 2.75;

(async () => {
  const pw = loadPlaywright();
  if(!pw || !pw.chromium){ console.log("SKIP: Playwright not found."); process.exit(0); }
  ensureBrowsersPath();
  const srv = await startServer();
  const base = "http://127.0.0.1:" + srv.address().port + "/index.html";
  let browser = null;
  try{ browser = await pw.chromium.launch({ headless: true }); }
  catch(e){ srv.close(); console.log("SKIP: Chromium launch failed: " + e.message); process.exit(0); }

  try{
    fs.mkdirSync(SHOTS, { recursive: true });
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push("pageerror: " + e.message));

    await page.goto(base, { waitUntil: "load" });
    await page.waitForFunction(() => !!window.FXGL, { timeout: 8000 });

    const info = await page.evaluate(() => {
      document.body.innerHTML = "";
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;inset:0;background:#160b26";
      const cv = document.createElement("canvas");
      cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%";
      host.appendChild(cv); document.body.appendChild(host);
      const fx = new window.FXGL.Controller(cv, { preferWebGL2: true, quality: 2, dpr: window.devicePixelRatio });
      // a dithered purple biome behind + a deep gold hoard
      fx.setScene({ grid: [[[40,22,64],[34,18,56]],[[28,15,48],[36,20,58]]], seed: 5, hoard: { level: 1.0, seed: 9 } });   // T199: a maxed pile reaches the top
      fx.start();
      return { backend: fx.backend && fx.backend.name, dims: fx.dimensions() };
    });

    await page.waitForTimeout(220);
    await page.screenshot({ path: path.join(SHOTS, "hoard-halftone-webgl.png") });
    // a 2.5× zoomed crop of the lower-left wall bank so the halftone dots are legible
    await page.screenshot({ path: path.join(SHOTS, "hoard-halftone-crop.png"),
      clip: { x: 0, y: VIEWPORT.height * 0.62, width: VIEWPORT.width * 0.55, height: VIEWPORT.height * 0.34 } });

    console.log("backend = " + info.backend + "  buffer = " + JSON.stringify(info.dims));
    console.log("errors  = " + (errors.length ? errors.join(" · ") : "none"));
    console.log("Screenshots → " + SHOTS + "/hoard-halftone-webgl.png + -crop.png");
    await ctx.close();
  } catch(e){
    console.log("CAPTURE ERROR: " + (e && e.stack || e));
  } finally {
    if(browser) await browser.close();
    srv.close();
  }
  process.exit(0);
})().catch(e => { console.error("CAPTURE ERROR: " + (e && e.stack || e)); process.exit(1); });
