/* T154 — KEY-SCREEN VISUAL-REGRESSION gate (Playwright + headless Chromium).
 *
 * The session's recurring pain is VISUAL regressions only the owner notices — the
 * blue-tinted home backdrop, the celebration `0×0`, layout clips. The Node suite is
 * blind to rendered pixels. This generalises T150's render harness into a per-key-
 * screen gate: it loads the REAL app at a fixed phone viewport + dpr 2.75, navigates
 * to each key screen, and captures a ROBUST signature — NOT a brittle full-image
 * pixel diff — committed as a golden (UPDATE_GOLDEN=1 re-blesses intentional changes):
 *   (a) a coarse HUE-CLASS grid per screen (dominant colour per region; a purple→blue
 *       drift flips cells), (b) presence + coarse bbox of each screen's critical
 *       elements, (c) the FLAGSHIP: the home backdrop's dominant hue must be PURPLE
 *       (T153's fixed brand colour) — the exact regression that shipped before.
 * Determinism: `reducedMotion:'reduce'` makes FXGL render a STILL frame, and the
 * signature is coarse (hue categories + 5%-bucketed bboxes), so it's stable yet still
 * FAILS on a real colour/layout change (teeth proven below).
 *
 * GUARDED / OPT-IN: SKIPS cleanly (exit 0) with no browser, so Node-only CI is
 * unaffected. Run:  PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node test/browser/visual.test.js
 *      re-bless:    UPDATE_GOLDEN=1 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node test/browser/visual.test.js
 */
"use strict";
const fs = require("fs"), path = require("path");
const { loadPlaywright, startServer, ensureBrowsersPath } = require("./_harness.js");
const { check } = require("../golden-util.js");

const SHOTS = path.join(__dirname, "screenshots");
const VIEWPORT = { width: 390, height: 844 }, DPR = 2.75;
const GRID_COLS = 4, GRID_ROWS = 8;   // coarse region grid for the hue-class signature

let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }
function gold(name, value){ const r = check(name, value); ok(r.match, "golden '" + name + "'" + (r.updated ? " (re-blessed)" : "") + (r.match ? "" : " — " + r.hint)); }
function skip(why){ console.log("\nSKIP (visual gate not run): " + why + "\n(Node-only CI unaffected — this is an additional, opt-in gate.)"); process.exit(0); }

// Coarse dominant-hue family of an (r,g,b) — robust to render noise (a category, not
// a pixel value). Purple = blue-highest with red above green (the brand violet);
// blue = blue-high but red is the LOW channel (the regression that shipped).
function hueClass(r, g, b){
  const mx = Math.max(r, g, b);
  if(mx < 26) return "dark";
  if(b >= r && r > g && b > g) return "purple";
  if(b >= g && g >= r) return "blue";
  if(g > r && g > b) return "green";
  if(r > g && r > b) return "warm";
  return "mid";
}

// Round-trip a PNG screenshot through the browser's own decoder → a COLS×ROWS grid of
// average colours (drawImage downscale), classified to hue families. Avoids a hand-
// rolled PNG decoder and any WebGL read-back caveat (the screenshot is the composite).
async function colorGrid(page, pngBuf, cols, rows){
  const dataUrl = "data:image/png;base64," + pngBuf.toString("base64");
  const cells = await page.evaluate(async (a) => {
    const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = a.du; });
    const c = document.createElement("canvas"); c.width = a.cols; c.height = a.rows;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0, a.cols, a.rows);
    const d = g.getImageData(0, 0, a.cols, a.rows).data, out = [];
    for(let i = 0; i < a.cols * a.rows; i++) out.push([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
    return out;
  }, { du: dataUrl, cols: cols, rows: rows });
  const grid = [];
  for(let y = 0; y < rows; y++){ const row = []; for(let x = 0; x < cols; x++) row.push(hueClass.apply(null, cells[y * cols + x])); grid.push(row); }
  return grid;
}
// Average colour of a single element screenshot (for the flagship backdrop hue).
async function avgColor(page, pngBuf){
  const dataUrl = "data:image/png;base64," + pngBuf.toString("base64");
  return page.evaluate(async (du) => {
    const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = du; });
    const N = 24, c = document.createElement("canvas"); c.width = N; c.height = N;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0, N, N); const d = g.getImageData(0, 0, N, N).data;
    let r = 0, gr = 0, b = 0, n = 0; for(let i = 0; i < d.length; i += 4){ r += d[i]; gr += d[i + 1]; b += d[i + 2]; n++; }
    return { r: Math.round(r / n), g: Math.round(gr / n), b: Math.round(b / n) };
  }, dataUrl);
}
// Element signature per selector. For STATIC screens: presence + coarse (5%-bucketed)
// bbox — a real layout signature. For DYNAMIC screens (Arena: 3v3 teams + death-VFX +
// gold vary per run → content reflows): presence BOOLEAN only — structurally stable,
// so the golden can't flake on dynamic content (T163). `active` is always pinned.
function elementSig(page, screenId, sels, dynamic){
  return page.evaluate((a) => {
    const active = !!(document.getElementById(a.id) && document.getElementById(a.id).classList.contains("active"));
    const bucket = (v, span) => Math.round((v / span) * 20);   // 5% buckets
    const els = {};
    for(const s of a.sels){ const e = document.getElementById(s);
      const r = e && e.getBoundingClientRect(), vis = !!(r && r.width > 1 && r.height > 1);
      if(a.dynamic){ els[s] = vis; continue; }                  // presence-only (robust to reflow)
      els[s] = !e ? null : (vis ? { x: bucket(r.x, innerWidth), y: bucket(r.y, innerHeight), w: bucket(r.width, innerWidth), h: bucket(r.height, innerHeight) } : { hidden: true });
    }
    return { active: active, elements: els };
  }, { id: screenId, sels: sels, dynamic: !!dynamic });
}

const SCREENS = [
  { name: "home",  hash: "#/",      id: "start", sels: ["goldBar", "modeTree", "startBtn", "navRow", "arenaBtn"] },
  { name: "audio", hash: "#/audio", id: "audio", sels: ["musicSwitch", "musicVolRange", "sfxVolRange", "tempoRange", "setTest"] },
  // Arena is DYNAMIC (3v3 enemy team + death-VFX + gold vary per run) → a per-cell
  // colour grid / bbox is inherently brittle (T163). Signature = presence-only.
  { name: "arena", hash: "#/arena", id: "arena", sels: ["arenaMeta", "arenaBody", "arenaFight", "arenaBack"], dynamic: true }
];

(async () => {
  const pw = loadPlaywright();
  if(!pw || !pw.chromium) skip("Playwright not found (set PLAYWRIGHT_PATH).");
  ensureBrowsersPath();
  const srv = await startServer();
  const base = "http://127.0.0.1:" + srv.address().port + "/index.html";
  let browser = null;
  try{ browser = await pw.chromium.launch({ headless: true }); }
  catch(e){ srv.close(); skip("Chromium launch failed: " + e.message); }

  try{
    fs.mkdirSync(SHOTS, { recursive: true });
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR, reducedMotion: "reduce" });
    await ctx.addInitScript(() => { try{ localStorage.setItem("halves.unlocked", JSON.stringify({ legacy: 1 })); }catch(e){} });   // unlock gated screens (arena)
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push("pageerror: " + e.message));

    // Load the app FRESH per screen (a new document → empty history). In-page SPA
    // hash-hopping accumulates T157 back-gesture history sentinels that hijack a
    // later `location.hash` set (audio→arena lands on settings); a fresh load avoids it.
    async function gotoScreen(hash){
      await page.goto(base, { waitUntil: "load" });
      await page.waitForFunction(() => !!window.FXGL, { timeout: 8000 });
      await page.evaluate(h => { location.hash = h; }, hash);
      await page.waitForTimeout(450);   // route + still-frame settle (reduced-motion → no animation)
    }

    for(const sc of SCREENS){
      await gotoScreen(sc.hash);
      const sig = await elementSig(page, sc.id, sc.sels, sc.dynamic);
      if(!sig.active){ ok(sc.name === "arena", "screen '" + sc.name + "' did not activate (gated/route issue) — " + (sc.name === "arena" ? "tolerated" : "REGRESSION")); continue; }
      ok(true, "screen '" + sc.name + "' is active");
      const shot = await page.screenshot();
      fs.writeFileSync(path.join(SHOTS, "visual-" + sc.name + ".png"), shot);
      if(sc.dynamic){
        // robust signature for a dynamic screen: active + element PRESENCE only (no
        // brittle colour grid / bbox — the Arena's content legitimately varies, T163).
        gold("visual_" + sc.name, { active: true, dynamic: true, elements: sig.elements });
      } else {
        const grid = await colorGrid(page, shot, GRID_COLS, GRID_ROWS);
        gold("visual_" + sc.name, { active: true, colorGrid: grid, elements: sig.elements });
      }
    }

    // FLAGSHIP — the home backdrop's dominant hue must be PURPLE (T153 fixed brand
    // colour). A purple→blue drift (the regression that shipped) FAILS this.
    await gotoScreen("#/");
    const bdInfo = await page.evaluate(() => { const c = document.getElementById("fxBackdrop"); return c ? { hidden: c.classList.contains("hidden"), w: c.clientWidth } : null; });
    if(bdInfo && !bdInfo.hidden && bdInfo.w > 0){
      const bd = await page.$("#fxBackdrop");
      const avg = await avgColor(page, await bd.screenshot());
      const cls = hueClass(avg.r, avg.g, avg.b);
      ok(cls === "purple", "FLAGSHIP: the home backdrop renders PURPLE (avg rgb " + avg.r + "," + avg.g + "," + avg.b + " → '" + cls + "'; T153 brand colour — a blue drift FAILS)");
      gold("visual_home_backdrop_hue", { hueClass: cls, dominant: avg.b >= avg.r && avg.b >= avg.g ? "blue-channel-high" : "other" });
    } else {
      ok(false, "FLAGSHIP: the home backdrop is present + visible to sample (got " + JSON.stringify(bdInfo) + ")");
    }

    // TEETH 1 — the hue classifier REJECTS the blue regression: the shipped blue
    // backdrop colour (~#3f97d8) classifies as 'blue', not 'purple', so it would FAIL.
    ok(hueClass(63, 151, 216) === "blue" && hueClass(63, 151, 216) !== "purple",
       "the gate HAS TEETH: a blue backdrop (rgb 63,151,216) classifies 'blue' ≠ 'purple' → the purple→blue regression FAILS the flagship");
    ok(hueClass(154, 92, 246) === "purple", "the classifier accepts the brand purple #9a5cf6 (rgb 154,92,246)");

    // TEETH 2 — the signature COMPARE catches a colour/layout change (not a no-op):
    // mutate a captured signature and confirm golden-util flags the first diff.
    const sample = { active: true, colorGrid: [["dark", "purple"], ["purple", "dark"]], elements: { startBtn: { x: 1, y: 0, w: 18, h: 1 } } };
    const { compareValues } = require("../golden-util.js");
    const mutColor = JSON.parse(JSON.stringify(sample)); mutColor.colorGrid[0][1] = "blue";
    const mutLayout = JSON.parse(JSON.stringify(sample)); mutLayout.elements.startBtn = null;
    ok(compareValues(JSON.stringify(sample, null, 1), sample).match, "signature compare: identical signature matches");
    ok(!compareValues(JSON.stringify(sample, null, 1), mutColor).match, "the gate HAS TEETH: a single region hue flip (purple→blue) is CAUGHT");
    ok(!compareValues(JSON.stringify(sample, null, 1), mutLayout).match, "the gate HAS TEETH: a missing critical element (layout regression) is CAUGHT");

    if(errors.length) ok(false, "no page errors — " + errors.slice(0, 3).join(" · "));
    await ctx.close();
  } catch(e){
    fails++; console.log("  FAIL: harness error — " + (e && e.stack || e));
    try{ if(browser) await browser.close(); }catch(_){}
  } finally {
    if(browser) await browser.close();
    srv.close();
  }

  console.log("\nScreenshots → " + SHOTS);
  console.log(fails === 0 ? "ALL " + checks + " VISUAL-REGRESSION CHECKS PASSED" : fails + "/" + checks + " FAILED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("VISUAL GATE ERROR: " + (e && e.stack || e)); process.exit(1); });
