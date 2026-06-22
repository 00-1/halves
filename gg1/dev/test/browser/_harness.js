/* T150/T151 — shared helpers for the B-owned browser gates: resolve Playwright
 * without a repo dependency, and serve the repo read-only over a local port. Both
 * test/browser/render.test.js and test/browser/audio.test.js use these. The gates
 * SKIP cleanly (exit 0) when no browser is present, so Node-only CI is unaffected.
 */
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");

const ROOT = path.join(__dirname, "..", "..");   // repo root

function loadPlaywright(){
  const tries = ["playwright", process.env.PLAYWRIGHT_PATH, "/opt/node22/lib/node_modules/playwright"];
  for(const p of tries){ if(!p) continue; try{ return require(p); }catch(e){ /* next */ } }
  return null;
}

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

function ensureBrowsersPath(){
  if(!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync("/opt/pw-browsers"))
    process.env.PLAYWRIGHT_BROWSERS_PATH = "/opt/pw-browsers";
}

module.exports = { ROOT, loadPlaywright, startServer, ensureBrowsersPath };
