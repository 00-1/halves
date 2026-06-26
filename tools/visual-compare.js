/* VISUAL-PARITY comparator — web GG1 reference screenshots vs Builder B's brickmap renders.
 * NOT a pixel diff (two different render engines never match pixel-for-pixel). Instead: decode both
 * PNGs (zlib, no deps), AREA-AVERAGE downsample each to a coarse cell grid (this washes out font
 * anti-aliasing / sub-pixel / resolution differences while preserving LAYOUT + COLOUR BLOCKS), then
 * report per-cell colour deviation (ΔE) — a heat-map of WHERE the two screens differ, plus a global
 * score and a per-row layout profile. Deviations are for EXAMINATION ("can we improve parity here?"),
 * gated only against GROSS divergence (a missing element / wildly wrong colour or layout).
 *
 * Pairs by filename in content/gg1/visual-ref/: <screen>-web.png  ↔  <screen>-brickmap.png.
 * Run:  node tools/visual-compare.js [screen ...]   (no args = all pairs; writes compare-report.json)
 * Lib:  require('./visual-compare')  → { decodePng, downsample, compareImages, run } */
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const DIR = path.join(__dirname, "..", "content", "gg1", "visual-ref");
const GX = 24, GY = 48;                      // comparison grid (≈18px cells over a 430×880 screen)
const EXAMINE_DE = 6;                          // mean ΔE (0..100) above this = worth a look (parity could improve)
const GROSS_DE = 18;                           // above this = GROSS divergence (the gate fails — missing/wrong-layout)
const verdictOf = de => de < EXAMINE_DE ? "ok" : de <= GROSS_DE ? "examine" : "DIVERGENT";

// ---- minimal PNG decoder: 8-bit, colour type 2 (RGB) or 6 (RGBA), non-interlaced ----
function decodePng(buf){
  if(buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20), bitDepth = buf[24], colorType = buf[25], interlace = buf[28];
  if(bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0)
    throw new Error("unsupported PNG (need 8-bit RGB/RGBA non-interlaced; got depth " + bitDepth + " type " + colorType + " interlace " + interlace + ")");
  const bpp = colorType === 6 ? 4 : 3;
  // gather IDAT
  const idat = []; let p = 8;
  while(p < buf.length){
    const len = buf.readUInt32BE(p), type = buf.toString("ascii", p + 4, p + 8);
    if(type === "IDAT") idat.push(buf.slice(p + 8, p + 8 + len));
    if(type === "IEND") break;
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = W * bpp, out = Buffer.alloc(W * H * 3);
  const prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  const paeth = (a, b, c) => { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); };
  let rp = 0;
  for(let y = 0; y < H; y++){
    const f = raw[rp++];
    for(let i = 0; i < stride; i++){
      const x = raw[rp++], a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v;
      if(f === 0) v = x; else if(f === 1) v = x + a; else if(f === 2) v = x + b;
      else if(f === 3) v = x + ((a + b) >> 1); else if(f === 4) v = x + paeth(a, b, c); else throw new Error("bad filter " + f);
      cur[i] = v & 0xff;
    }
    for(let xx = 0; xx < W; xx++){ const si = xx * bpp, di = (y * W + xx) * 3; out[di] = cur[si]; out[di + 1] = cur[si + 1]; out[di + 2] = cur[si + 2]; }
    cur.copy(prev);
  }
  return { width: W, height: H, rgb: out };
}

// ---- area-average downsample to a GX×GY grid of mean RGB (resolution-independent) ----
function downsample(img, gx = GX, gy = GY){
  const { width: W, height: H, rgb } = img, cells = new Float64Array(gx * gy * 3), cnt = new Float64Array(gx * gy);
  for(let y = 0; y < H; y++){ const cy = Math.min(gy - 1, (y * gy / H) | 0);
    for(let x = 0; x < W; x++){ const cx = Math.min(gx - 1, (x * gx / W) | 0), ci = cy * gx + cx, si = (y * W + x) * 3;
      cells[ci * 3] += rgb[si]; cells[ci * 3 + 1] += rgb[si + 1]; cells[ci * 3 + 2] += rgb[si + 2]; cnt[ci]++; }
  }
  const grid = [];
  for(let i = 0; i < gx * gy; i++){ const n = cnt[i] || 1; grid.push([cells[i * 3] / n, cells[i * 3 + 1] / n, cells[i * 3 + 2] / n]); }
  return { gx, gy, grid };
}

// per-cell ΔE (RGB euclidean, normalised 0..100), global stats, per-row layout deviation
function compareImages(webImg, bmImg){
  const a = downsample(webImg), b = downsample(bmImg), n = a.gx * a.gy, de = new Array(n);
  const K = 100 / Math.sqrt(3 * 255 * 255);                  // normalise max distance → 100
  for(let i = 0; i < n; i++){ const p = a.grid[i], q = b.grid[i];
    de[i] = Math.sqrt((p[0]-q[0])**2 + (p[1]-q[1])**2 + (p[2]-q[2])**2) * K; }
  const sorted = de.slice().sort((x, y) => x - y);
  const mean = de.reduce((s, v) => s + v, 0) / n, max = sorted[n - 1], p95 = sorted[Math.floor(n * 0.95)];
  // per-row mean ΔE → a vertical layout-deviation profile (which BANDS differ)
  const rowDev = [];
  for(let r = 0; r < a.gy; r++){ let s = 0; for(let c = 0; c < a.gx; c++) s += de[r * a.gx + c]; rowDev.push(s / a.gx); }
  // hottest cells (for "examine here")
  const hot = de.map((v, i) => ({ x: i % a.gx, y: (i / a.gx) | 0, de: +v.toFixed(1) })).sort((x, y) => y.de - x.de).slice(0, 12);
  return { gx: a.gx, gy: a.gy, meanDE: +mean.toFixed(2), p95DE: +p95.toFixed(2), maxDE: +max.toFixed(2), de, rowDev, hot };
}

const RAMP = " .:-=+*#%@";
function heatmap(cmp){
  let s = "";
  for(let r = 0; r < cmp.gy; r++){ let line = "";
    for(let c = 0; c < cmp.gx; c++){ const v = cmp.de[r * cmp.gx + c]; line += RAMP[Math.min(RAMP.length - 1, Math.floor(v / 100 * RAMP.length))]; }
    s += line + "  " + (cmp.rowDev[r] >= GROSS_DE ? "◄ " + cmp.rowDev[r].toFixed(0) : "") + "\n";
  }
  return s;
}

function listScreens(){
  const files = fs.existsSync(DIR) ? fs.readdirSync(DIR) : [];
  const webs = files.filter(f => /-web\.png$/.test(f)).map(f => f.replace(/-web\.png$/, ""));
  return webs.map(s => ({ screen: s, web: path.join(DIR, s + "-web.png"), bm: path.join(DIR, s + "-brickmap.png"),
    hasBm: files.includes(s + "-brickmap.png") }));
}

function run(filter){
  let screens = listScreens();
  if(filter && filter.length) screens = screens.filter(s => filter.includes(s.screen));
  const compared = [], awaiting = [];
  for(const s of screens){
    if(!s.hasBm){ awaiting.push(s.screen); continue; }
    const web = decodePng(fs.readFileSync(s.web)), bm = decodePng(fs.readFileSync(s.bm));
    const cmp = compareImages(web, bm);
    const aspectWeb = (web.width / web.height), aspectBm = (bm.width / bm.height);
    compared.push({ screen: s.screen, webDim: [web.width, web.height], bmDim: [bm.width, bm.height],
      aspectMismatch: Math.abs(aspectWeb - aspectBm) > 0.02,
      meanDE: cmp.meanDE, p95DE: cmp.p95DE, maxDE: cmp.maxDE,
      verdict: verdictOf(cmp.meanDE), hot: cmp.hot, rowDev: cmp.rowDev.map(v => +v.toFixed(1)), _cmp: cmp });
  }
  return { compared, awaiting, examineThreshold: EXAMINE_DE, grossThreshold: GROSS_DE };
}

if(require.main === module){
  const args = process.argv.slice(2);
  const res = run(args);
  for(const r of res.compared){
    console.log("\n=== " + r.screen + " ===  mean ΔE " + r.meanDE + " · p95 " + r.p95DE + " · max " + r.maxDE +
      " · " + r.verdict + (r.aspectMismatch ? "  ⚠ ASPECT MISMATCH " + r.webDim.join("x") + " vs " + r.bmDim.join("x") : ""));
    console.log(heatmap(r._cmp));
    console.log("hottest cells (examine): " + r.hot.slice(0, 6).map(h => "(" + h.x + "," + h.y + ")=" + h.de).join("  "));
  }
  if(res.awaiting.length) console.log("\nawaiting brickmap renders: " + res.awaiting.join(", "));
  const report = { generatedFrom: "tools/visual-compare.js", grid: [GX, GY], grossThreshold: GROSS_DE,
    compared: res.compared.map(({ _cmp, ...r }) => r), awaiting: res.awaiting };
  fs.writeFileSync(path.join(DIR, "compare-report.json"), JSON.stringify(report, null, 1) + "\n");
  console.log("\nwrote content/gg1/visual-ref/compare-report.json — compared " + res.compared.length +
    ", awaiting " + res.awaiting.length);
  const divergent = res.compared.filter(r => r.verdict !== "ok");
  if(divergent.length) console.log("DIVERGENT: " + divergent.map(r => r.screen + "(" + r.meanDE + ")").join(", "));
}
module.exports = { decodePng, downsample, compareImages, heatmap, run, verdictOf, EXAMINE_DE, GROSS_DE, GX, GY };
