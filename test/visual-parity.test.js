/* VISUAL-PARITY gate — web reference screenshots vs Builder B's brickmap renders.
 * Perceptual (area-average ΔE), NOT pixel-exact (two render engines never match per-pixel). It:
 *   (1) self-checks the decoder (a real web ref decodes to its IHDR dims);
 *   (2) test-the-test: identical image → ΔE 0; a perturbation (tint / blanked region) → detected,
 *       and a blanked BAND is localised to the right rows (so the heat-map can be trusted);
 *   (3) for every <screen> that has BOTH -web.png AND -brickmap.png: assert mean ΔE ≤ GROSS (the
 *       gate only fails on GROSS divergence — missing element / wrong layout / wildly wrong colour);
 *       screens in the EXAMINE band are surfaced, not failed. Pairs without a brickmap render yet are
 *       reported as "awaiting" and do NOT fail (B is still building screens).
 * Run: node test/visual-parity.test.js */
"use strict";
const fs = require("fs"), path = require("path");
const V = require("../tools/visual-compare");

let fails = 0;
const ok = (c, m) => { if(!c){ console.error("FAIL:", m); fails++; } else console.log("ok:", m); };
const DIR = path.join(__dirname, "..", "content", "gg1", "visual-ref");

// (1) decoder self-check against a known reference
const refFile = fs.readdirSync(DIR).find(f => /-web\.png$/.test(f));
ok(!!refFile, "a web reference screenshot exists to check the decoder");
const buf = fs.readFileSync(path.join(DIR, refFile));
const img = V.decodePng(buf);
ok(img.width === buf.readUInt32BE(16) && img.height === buf.readUInt32BE(20) && img.rgb.length === img.width * img.height * 3,
   "decoder: " + refFile + " → " + img.width + "x" + img.height + " (matches IHDR, RGB buffer sized)");

// (2) test-the-test — the metric actually measures what we think
ok(V.compareImages(img, img).meanDE === 0, "identical image → mean ΔE 0");
const tint = Buffer.from(img.rgb); for(let i = 0; i < tint.length; i++) tint[i] = Math.min(255, tint[i] + 40);
ok(V.compareImages(img, { width: img.width, height: img.height, rgb: tint }).meanDE > 5, "a global +40 tint is detected (mean ΔE > 5)");
const blank = Buffer.from(img.rgb); for(let i = Math.floor(img.rgb.length * 2 / 3); i < blank.length; i++) blank[i] = 0;
const cb = V.compareImages(img, { width: img.width, height: img.height, rgb: blank });
const topAvg = cb.rowDev.slice(0, cb.gy / 3).reduce((s, v) => s + v, 0), botAvg = cb.rowDev.slice(-cb.gy / 3).reduce((s, v) => s + v, 0);
ok(botAvg > topAvg * 5 + 1, "a blanked BOTTOM band is localised to the bottom rows (heat-map is trustworthy)");
ok(V.verdictOf(2) === "ok" && V.verdictOf(10) === "examine" && V.verdictOf(30) === "DIVERGENT", "verdict tiers: ok < " + V.EXAMINE_DE + " ≤ examine ≤ " + V.GROSS_DE + " < DIVERGENT");

// (3) compare every available web↔brickmap pair (gate on GROSS only; surface EXAMINE)
const res = V.run();
console.log("\nvisual pairs — compared " + res.compared.length + ", awaiting brickmap render: " + res.awaiting.length);
for(const r of res.compared){
  const tag = r.verdict === "ok" ? "ok" : r.verdict === "examine" ? "EXAMINE" : "DIVERGENT";
  console.log("  " + tag.padEnd(9) + r.screen.padEnd(22) + "mean ΔE " + r.meanDE + " · p95 " + r.p95DE + " · max " + r.maxDE +
    (r.aspectMismatch ? "  ⚠ aspect " + r.webDim.join("x") + " vs " + r.bmDim.join("x") : ""));
  ok(!r.aspectMismatch, "aspect ratio matches for " + r.screen);
  ok(r.verdict !== "DIVERGENT", "no GROSS divergence for " + r.screen + " (mean ΔE " + r.meanDE + " ≤ " + V.GROSS_DE + ")");
}
const examine = res.compared.filter(r => r.verdict === "examine");
if(examine.length) console.log("\nEXAMINE (parity could improve — not a failure): " + examine.map(r => r.screen + " ΔE" + r.meanDE).join(", "));
if(res.awaiting.length) console.log("awaiting B renders: " + res.awaiting.join(", "));
if(!res.compared.length) console.log("(no brickmap renders committed yet — gate is dormant until B commits <screen>-brickmap.png)");

console.log(fails ? `\n${fails} FAIL` : "\nALL VISUAL-PARITY CHECKS PASS");
process.exit(fails ? 1 : 0);
