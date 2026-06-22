/* T194 — the app ICON is MAGNAR (hero `mo`, the owner's pick). The installed-PWA /
 * Android launcher icon is fetched from the manifest, so we ship committed static
 * PNGs (icon-512/192.png) — a runtime data-URL isn't enough. This gate proves:
 *   (a) the manifest points at the committed maskable PNGs;
 *   (b) the PNGs exist, are valid 512²/192² 8-bit RGBA, and are byte-identical to the
 *       reproducible generator output (scripts/geticon.js — no stale/hand-edited art);
 *   (c) the committed PNG actually CONTAINS the composed icon: brand-violet field at
 *       the corners (maskable), Magnar's portrait (= Collectibles.iconColorGrid) in
 *       the centre;
 *   (d) installFavicon() draws the SAME Magnar composition so the tab matches.
 * Run: node test/icon-app.test.js
 */
const fs = require("fs"), path = require("path"), zlib = require("zlib"), cp = require("child_process");
const ROOT = path.join(__dirname, "..");
function read(f){ return fs.readFileSync(path.join(ROOT, f), "utf8"); }
function readBin(f){ return fs.readFileSync(path.join(ROOT, f)); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

const main = read("main.js"), wf = read(".github/workflows/pages.yml");

// ---- (a) manifest points at the committed maskable PNGs ----------------------
const mani = JSON.parse(read("manifest.webmanifest"));
const bySrc = {}; mani.icons.forEach(i => bySrc[i.src] = i);
ok(bySrc["icon-512.png"] && bySrc["icon-512.png"].sizes === "512x512" && /maskable/.test(bySrc["icon-512.png"].purpose), "(a) manifest lists icon-512.png as a 512² maskable icon");
ok(bySrc["icon-192.png"] && bySrc["icon-192.png"].sizes === "192x192" && /maskable/.test(bySrc["icon-192.png"].purpose), "(a) manifest lists icon-192.png as a 192² maskable icon");
ok(mani.icons.every(i => i.type !== "image/png" || /\.png$/.test(i.src)), "(a) the PNG icon entries reference real .png files");

// ---- a minimal PNG reader (color type 6, filter 0 — what the generator writes) --
function decodePNG(buf){
  if(Buffer.compare(buf.slice(0,8), Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error("bad signature");
  let p = 8, w = 0, h = 0, ct = -1, bd = -1, idat = [];
  while(p < buf.length){
    const len = buf.readUInt32BE(p), type = buf.toString("ascii", p+4, p+8), data = buf.slice(p+8, p+8+len);
    if(type === "IHDR"){ w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; }
    else if(type === "IDAT") idat.push(data);
    else if(type === "IEND") break;
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * 4, px = Buffer.alloc(w * h * 4);
  for(let y = 0; y < h; y++){
    const f = raw[y * (stride + 1)];
    if(f !== 0) throw new Error("unexpected filter " + f);   // the generator uses filter 0
    raw.copy(px, y * stride, y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
  }
  return { w, h, bd, ct, at:(x,y)=>{ const o=(y*w+x)*4; return [px[o],px[o+1],px[o+2],px[o+3]]; } };
}

// the SOURCE grid the icon is composed from (the app's own generator)
global.window = {};
["modes.js","collectibles.js"].forEach(f => new Function(read(f))());
const C = global.window.Collectibles;
const BRAWN = { body:"#d05a4a", accent:"#ff8a6e", outline:"#3a1410" }, BG = [26,16,46], SAFE = 0.80;
const grid = C.iconColorGrid("hero:mo", BRAWN, "familiar"), G = grid.length;
function hexRGB(h){ return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }

// ---- (b) the PNGs are valid + byte-identical to the reproducible generator ------
[["icon-512.png",512],["icon-192.png",192]].forEach(([f,sz]) => {
  const buf = readBin(f), d = decodePNG(buf);
  ok(d.w === sz && d.h === sz && d.bd === 8 && d.ct === 6, "(b) " + f + " is a valid " + sz + "² 8-bit RGBA PNG");
});
// reproducibility: regen via the committed generator → bytes must match what's committed
(function(){
  const before512 = readBin("icon-512.png"), before192 = readBin("icon-192.png");
  cp.execFileSync("node", [path.join(ROOT,"scripts","geticon.js")], { stdio:"ignore" });
  ok(Buffer.compare(before512, readBin("icon-512.png")) === 0 && Buffer.compare(before192, readBin("icon-192.png")) === 0,
     "(b) the committed PNGs are byte-identical to scripts/geticon.js output (reproducible, not hand-edited)");
})();

// ---- (c) the PNG actually contains the composed Magnar icon ---------------------
(function(){
  const d = decodePNG(readBin("icon-192.png")), sz = 192;
  const corner = d.at(2,2);
  ok(corner[0]===BG[0] && corner[1]===BG[1] && corner[2]===BG[2] && corner[3]===255, "(c) the corner is the brand-violet field (maskable bg fills the edges)");
  const scale = Math.max(1, Math.floor((sz*SAFE)/G)), off = Math.floor((sz - scale*G)/2);
  // sample every filled grid cell's centre pixel → must equal the grid colour
  let matched = 0, sampled = 0;
  for(let gy=0; gy<G; gy++) for(let gx=0; gx<G; gx++){
    const hex = grid[gy][gx]; if(!hex) continue; sampled++;
    const x = off + gx*scale + (scale>>1), y = off + gy*scale + (scale>>1), [r,g,b] = hexRGB(hex), p = d.at(x,y);
    if(p[0]===r && p[1]===g && p[2]===b) matched++;
  }
  ok(sampled > 50 && matched === sampled, "(c) every portrait cell renders Magnar's colour at the right spot (" + matched + "/" + sampled + ")");
})();

// ---- (d) the runtime favicon draws the SAME Magnar composition ------------------
ok(/const ICON_HERO = "hero:mo"/.test(main), "(d) installFavicon's icon hero is Magnar (hero:mo)");
ok(/function paintAppIcon\(cv\)[\s\S]{0,400}C\.iconColorGrid\(ICON_HERO, HERO_PAL\.Brawn, "familiar"\)/.test(main), "(d) paintAppIcon composes the hero:mo grid (Brawn palette) — same as the committed PNG");
ok(/function installFavicon\(\)[\s\S]{0,200}paintAppIcon\(cv\)/.test(main), "(d) installFavicon uses paintAppIcon (favicon == app icon)");
ok(!/Glyphs\.draw\(cv, halves\.glyphTokens/.test(main), "(d) the old x/2 glyph favicon is gone");
ok(/test\/icon-app\.test\.js/.test(wf), "(d) this gate is registered in CI");

console.log("\n" + (fails === 0 ? "ALL " + checks + " APP-ICON CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
