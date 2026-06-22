/* T193 — visual CAPTURE of the money-gain coin burst on the WebGL2 backend.
 * Mounts a real FXGL backdrop (preferWebGL2) over a hoard scene, fires earnBurst,
 * and screenshots the spinning cell-shaded cylinder coins mid-flight (the coins are
 * composited on the 2D overlay; the GL splat carries only non-coin confetti). This is
 * a verification artifact, not a CI gate — it SKIPS cleanly with no browser.
 * Run: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node test/browser/coinburst-capture.js
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

    // Build a clean full-viewport WebGL2 backdrop of our own (independent of [A]'s
    // screen routing, which hides #fxBackdrop on entry) + a settled gold hoard, then
    // fire the money-gain earn burst.
    const info = await page.evaluate(() => {
      document.body.innerHTML = "";
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;inset:0;background:#140a22";
      const cv = document.createElement("canvas");
      cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%";
      host.appendChild(cv); document.body.appendChild(host);
      const fx = new window.FXGL.Controller(cv, { preferWebGL2: true, quality: 2, dpr: window.devicePixelRatio });
      window.__fx = fx;
      fx.setScene({ grid: [[[26,16,44]]], seed: 5, hoard: { level: 0.72, seed: 9 } });
      fx.start();
      fx.earnBurst({ x: 0.5, y: 0.18, tx: 0.5, ty: 0.78, count: 48, amount: 250, seed: 11 });
      return { backend: fx.backend && fx.backend.name, dims: fx.dimensions() };
    });

    // early: the coins are still arcing + spinning through the dark upper field
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(SHOTS, "coinburst-webgl-early.png") });
    // mid-flight: streaming down toward the hoard
    await page.waitForTimeout(140);
    await page.screenshot({ path: path.join(SHOTS, "coinburst-webgl.png") });
    // late: settling onto the pile
    await page.waitForTimeout(260);
    await page.screenshot({ path: path.join(SHOTS, "coinburst-webgl-late.png") });

    const lit = await page.evaluate(() => {
      const ov = document.querySelector("canvas.fxgl-hoard");
      if(!ov) return { overlay: false, lit: 0 };
      const g = ov.getContext("2d"); const d = g.getImageData(0, 0, ov.width, ov.height).data;
      let n = 0; for(let k = 3; k < d.length; k += 4) if(d[k] > 10) n++;
      return { overlay: true, w: ov.width, h: ov.height, lit: n };
    });

    console.log("backend = " + info.backend + "  buffer = " + JSON.stringify(info.dims));
    console.log("overlay = " + JSON.stringify(lit));
    console.log("errors  = " + (errors.length ? errors.join(" · ") : "none"));
    console.log("Screenshots → " + SHOTS + "/coinburst-webgl{,-late}.png");
    await ctx.close();
  } catch(e){
    console.log("CAPTURE ERROR: " + (e && e.stack || e));
  } finally {
    if(browser) await browser.close();
    srv.close();
  }
  process.exit(0);
})().catch(e => { console.error("CAPTURE ERROR: " + (e && e.stack || e)); process.exit(1); });
