#!/usr/bin/env node
/* T194 — render the committed app icons (icon-512.png / icon-192.png) OFFLINE.
 * The installed-PWA / Android launcher icon is fetched from the manifest, so a
 * runtime data-URL isn't enough — we must ship real PNG files. The icon is the
 * owner's pick: MAGNAR (hero id `mo`, a Brawn hero), composed MASKABLE — his pixel
 * portrait nearest-neighbour-scaled into the central ~80% safe zone on a full-bleed
 * brand-violet background (matches the Emblems' gold-on-violet brand field).
 *
 * Pure: reuses the SAME generator the app uses (`Collectibles.iconColorGrid`) so the
 * committed icon is byte-identical to what `installFavicon()` draws in-app. Encodes
 * RGBA → PNG with Node's zlib (no native canvas dependency).
 *
 * Usage: node scripts/geticon.js   (writes icon-512.png + icon-192.png at the repo root)
 */
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const ROOT = path.join(__dirname, "..");
function read(f){ return fs.readFileSync(path.join(ROOT, f), "utf8"); }

// ---- the icon SOURCE: Magnar's portrait grid, via the app's own generator --------
global.window = {};
["modes.js", "collectibles.js"].forEach(f => new Function(read(f))());
const C = global.window.Collectibles;
const HERO_ID = "hero:mo";                                   // Magnar
const BRAWN = { body: "#d05a4a", accent: "#ff8a6e", outline: "#3a1410" };   // = main.js HERO_PAL.Brawn
const BRAND_BG = [26, 16, 46];                               // deep brand violet (= emblems.js BG)
const SAFE = 0.80;                                           // maskable safe zone (central 80%)

const grid = C.iconColorGrid(HERO_ID, BRAWN, "familiar");    // G×G hex (0 = transparent)
const G = grid.length;
function hexRGB(h){ return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }

// ---- compose an RGBA buffer: full-bleed bg + the portrait centred in the safe zone
function compose(size){
  const buf = Buffer.alloc(size * size * 4);
  for(let i = 0; i < size * size; i++){ buf[i*4] = BRAND_BG[0]; buf[i*4+1] = BRAND_BG[1]; buf[i*4+2] = BRAND_BG[2]; buf[i*4+3] = 255; }
  const scale = Math.max(1, Math.floor((size * SAFE) / G));  // nearest-neighbour, crisp
  const span = scale * G, off = Math.floor((size - span) / 2);
  for(let gy = 0; gy < G; gy++) for(let gx = 0; gx < G; gx++){
    const hex = grid[gy][gx]; if(!hex) continue;             // transparent → keep bg
    const [r, g, b] = hexRGB(hex);
    for(let py = 0; py < scale; py++) for(let px = 0; px < scale; px++){
      const x = off + gx * scale + px, y = off + gy * scale + py;
      if(x < 0 || y < 0 || x >= size || y >= size) continue;
      const o = (y * size + x) * 4; buf[o] = r; buf[o+1] = g; buf[o+2] = b; buf[o+3] = 255;
    }
  }
  return buf;
}

// ---- minimal PNG encoder (RGBA, 8-bit, no native deps) ---------------------------
function crc32(buf){
  let c = ~0;
  for(let i = 0; i < buf.length; i++){
    c ^= buf[i];
    for(let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(rgba, size){
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;   // 8-bit, RGBA
  // scanlines, each prefixed with filter byte 0 (none)
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for(let y = 0; y < size; y++){
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

[512, 192].forEach(size => {
  const png = encodePNG(compose(size), size);
  const out = path.join(ROOT, "icon-" + size + ".png");
  fs.writeFileSync(out, png);
  console.log("wrote " + out + " (" + png.length + " bytes)");
});
