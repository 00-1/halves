/* DOM validation of the nice-button standard against WEB (the good reference).
 * CSS alone can't answer "is the button nice" — flex widths + text centring + fit are LAYOUT
 * properties. So we render gg-web headlessly and measure each button's REAL geometry with
 * getBoundingClientRect (button box) + a Range over its label (text box), then run the standard.
 * If web — the reference the port chases — fails the standard, the standard is wrong.
 * Run: node test/button-geometry-web.test.js   (needs PUPPETEER_PATH / puppeteer + Chromium) */
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const puppeteer = require(process.env.PUPPETEER_PATH || "puppeteer");
const { checkButton, checkButtonRow } = require("./button-geometry.test.js");

const DEV = path.join(__dirname, "..", "gg1", "dev");
const VIEWPORT = { width: 430, height: 880, deviceScaleFactor: 2 };  // getBoundingClientRect is CSS px (430-wide) regardless
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fullCol = JSON.parse(fs.readFileSync("/tmp/ppt/fullcol.json", "utf8"));

const MIME = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const serve = root => http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

// in-page: measure a button element + its label's tight box → {rect, text, cap, label}
const MEASURE = (sel) => Array.from(document.querySelectorAll(sel)).map(el => {
  const r = el.getBoundingClientRect();
  const range = document.createRange(); range.selectNodeContents(el);
  const t = range.getBoundingClientRect();
  const cap = parseFloat(getComputedStyle(el).fontSize) * 0.7;  // cap-height ≈ 0.7em
  return { label: el.textContent.trim(),
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    text: { x: t.x, y: t.y, w: t.width, h: t.height }, cap };
});

(async () => {
  const server = serve(DEV); await new Promise(r => server.listen(0, r));
  const base = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--mute-audio"] });
  let fails = 0; const bad = (m) => { console.error("FAIL:", m); fails++; };
  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    await page.evaluateOnNewDocument((c) => {
      localStorage.setItem("halves.collected", c);
      localStorage.setItem("halves.gold", "987654321");
      localStorage.setItem("halves.dev", "1");
    }, JSON.stringify(fullCol));
    await page.goto(base, { waitUntil: "load", timeout: 15000 });
    await page.evaluate(() => { location.hash = "#/"; });
    await sleep(800);

    // the home action row — the buttons the owner flagged (Start / Practice / Guide)
    const row = await page.evaluate(MEASURE, ".start-actions .btn");
    console.log("\nWEB home buttons:", row.map(b => `${b.label} ${Math.round(b.rect.w)}×${Math.round(b.rect.h)}`).join("  |  "));
    if (!row.length) bad("no .start-actions .btn found — selector/route drift");
    row.forEach(b => {
      const left = b.text.x - b.rect.x, right = (b.rect.x + b.rect.w) - (b.text.x + b.text.w);
      console.log(`  ${b.label.padEnd(9)} h${Math.round(b.rect.h)} cap${b.cap.toFixed(0)} pad L/R ${left.toFixed(1)}/${right.toFixed(1)} Δcx ${((b.text.x+b.text.w/2)-(b.rect.x+b.rect.w/2)).toFixed(2)}`);
    });
    const rowV = checkButtonRow(row);
    if (rowV.length) bad("WEB home button ROW violates the standard → standard is wrong:\n   " + rowV.join("\n   "));
    else console.log("  ✓ WEB home button row PASSES checkButtonRow (equal-width, centred, padded, touch-ok)");

    // also validate a standalone primary .btn if one is on screen (full-width CTA pattern, padding 18×56)
    const cta = await page.evaluate(MEASURE, ".btn:not(.start-actions .btn)");
    const visible = cta.filter(b => b.rect.w > 0 && b.rect.h > 0 && b.label);
    if (visible.length) {
      const b = visible[0];
      console.log(`\nWEB standalone .btn "${b.label}" ${Math.round(b.rect.w)}×${Math.round(b.rect.h)} cap${b.cap.toFixed(0)}`);
      const cv = checkButton(b);
      if (cv.length) bad(`WEB standalone .btn violates the standard:\n   ${cv.join("\n   ")}`);
      else console.log("  ✓ WEB standalone .btn PASSES checkButton");
    }

    await page.close();
  } finally { await browser.close(); server.close(); }
  console.log(fails ? `\n${fails} FAIL — web does not meet the standard (fix the standard, not web)` : "\n✓ WEB MEETS THE NICE-BUTTON STANDARD — it's validated as the reference");
  process.exit(fails ? 1 : 0);
})();
