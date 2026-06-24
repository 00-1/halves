/* VISUAL-PARITY reference capture — headless web-GG1 screenshots per screen, the TARGETS the
 * brickmap port's renders are iterated against (the visual analogue of goldens/parity-vectors).
 * Seeds a FULL collection (everything unlocked + boosted, like dev reveal-all) so heroes show
 * effective stats etc., then drives the hash router to each screen and screenshots at a fixed
 * mobile viewport. Output → content/gg1/visual-ref/<screen>-web.png (B's content sync pulls them).
 * Run: node tools/visual-ref-capture.js            (needs puppeteer; see _README) */
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const puppeteer = require(process.env.PUPPETEER_PATH || "puppeteer"); // npm i puppeteer, or set PUPPETEER_PATH

const DEV = path.join(__dirname, "..", "gg1", "dev");
const OUT = path.join(__dirname, "..", "content", "gg1", "visual-ref");
const VIEWPORT = { width: 430, height: 880, deviceScaleFactor: 2 };
// screen → hash route (the SPA uses location.hash = "#/<screen>") + optional collection transform.
// Most screens want the FULL collection (everything shown/boosted); the Arena wants a PARTIAL one
// (owning every tier = "cleared", which hides the party-pick/fight UI), so drop the deep tiers.
const dropDeepTiers = col => { const o = JSON.parse(col); for(let n = 30; n <= 120; n++) delete o["tier:" + n]; return JSON.stringify(o); };
const SCREENS = [
  ["heroes", "#/heroes"], ["inventory", "#/inventory"], ["home", "#/"],
  ["arena", "#/arena", dropDeepTiers],
];

const MIME = { ".js":"text/javascript", ".css":"text/css", ".html":"text/html", ".json":"application/json", ".png":"image/png", ".svg":"image/svg+xml" };
function serve(root){
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]); if(p === "/") p = "/index.html";
    const f = path.join(root, p);
    if(!f.startsWith(root) || !fs.existsSync(f)){ res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const fullCol = fs.readFileSync("/tmp/ppt/fullcol.json", "utf8");
  const server = serve(DEV); await new Promise(r => server.listen(0, r));
  const port = server.address().port, base = `http://127.0.0.1:${port}/`;
  const browser = await puppeteer.launch({ args: ["--no-sandbox","--disable-setuid-sandbox","--disable-gpu","--disable-dev-shm-usage"] });
  try {
    for(const [name, hash, transform] of SCREENS){
      const page = await browser.newPage();
      await page.setViewport(VIEWPORT);
      const col = transform ? transform(fullCol) : fullCol;
      // seed the (full or per-screen) boosted save BEFORE any app script runs
      await page.evaluateOnNewDocument((col) => {
        localStorage.setItem("halves.collected", col);
        localStorage.setItem("halves.gold", "987654321");
        localStorage.setItem("halves.dev", "1");
      }, col);
      await page.goto(base, { waitUntil: "load", timeout: 15000 });
      await page.evaluate(h => { location.hash = h; }, hash);
      await new Promise(r => setTimeout(r, 900));   // let the route + canvases paint
      const out = path.join(OUT, name + "-web.png");
      await page.screenshot({ path: out });
      console.log("captured", name, "→", out, fs.statSync(out).size, "bytes");
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
})();
