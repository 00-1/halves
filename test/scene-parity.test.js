/* F3+F4 scene parity gate. Like the other export tests:
 *   (1) DRIFT: regenerate from gg1/dev → equals the committed JSON byte-for-byte.
 *   (2) SOURCE FIDELITY: the two generators' load-bearing lines still live in scenery.js / eventart.js.
 *   (3) INVARIANTS: every grid has the right dims; the palette-pack is lossless (every index valid,
 *       every palette entry a #hex); all 10 regions + all 14 event banners present (artSeed matches
 *       the live roster); the pack round-trips back to the live buildGrid output (determinism re-proof).
 * Run: node test/scene-parity.test.js */
"use strict";
const fs = require("fs"), path = require("path");
const { generate } = require("../tools/scene-export");

let fails = 0;
const ok = (c, m) => { if(!c){ console.error("FAIL:", m); fails++; } else console.log("ok:", m); };
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const { scenes, vectors } = generate();

// reload the LIVE generators to re-prove the packed grids round-trip to source output
function live(){
  const window = { Emblems: { draw(){}, has: () => false, list: () => [] }, performance: { now: () => 0 } };
  const load = n => new Function("window", read("gg1/dev/" + n + ".js"))(window);
  ["modes","heroes","events","collectibles","enemies","scenery","eventart"].forEach(load);
  return window;
}
const W = live();
const unpack = v => v.rows.map(r => r.split("").map(ch => v.pal[parseInt(ch, 36)]));

// (1) drift
ok(read("content/gg1/scenes.json") === JSON.stringify(scenes, null, 1) + "\n", "scenes.json matches regenerate");
ok(read("content/gg1/scenes-vectors.json") === JSON.stringify(vectors) + "\n", "scenes-vectors.json matches regenerate");

// (2) source fidelity
const sc = read("gg1/dev/scenery.js"), ea = read("gg1/dev/eventart.js");
[
  ["scenery.js dims", sc, "const COLS = 28, ROWS = 11;"],
  ["scenery.js seed", sc, "const rnd = mulberry32((region + 1) * 2654435761 >>> 0);"],
  ["scenery.js theme pick", sc, "const th = THEMES[((region % 10) + 10) % 10];"],
  ["eventart.js dims", ea, "const COLS = 24, ROWS = 16;"],
  ["eventart.js seed", ea, "const rnd = mulberry32((seed >>> 0) || 1);"],
  ["eventart.js crest", ea, "const man = Math.abs(c - cx) + Math.abs(r - cy) * 1.35;"],
].forEach(([label, src, s]) => ok(src.includes(s), "source fidelity: " + label));
// the exported backdrop palettes match main.js's HOME_PALETTE/ENTRY_PALETTE + fxgl hoard constants
const mn = read("gg1/dev/main.js"), fx = read("gg1/dev/fxgl.js");
ok(mn.includes('const HOME_PALETTE = ["#0E1116", "#9a5cf6", "#cda9ff"]') &&
   scenes.constants.backdrops.homePalette.join(",") === "#0E1116,#9a5cf6,#cda9ff", "backdrops: homePalette matches main.js HOME_PALETTE");
ok(mn.includes('const ENTRY_PALETTE = ["#08080d", "#3a2a5c", "#5a4488"]') &&
   scenes.constants.backdrops.entryPalette.join(",") === "#08080d,#3a2a5c,#5a4488", "backdrops: entryPalette matches main.js ENTRY_PALETTE");
ok(fx.includes("const HOARD_CAP = 480;") && fx.includes("const HOARD_K = 600;") && fx.includes("const GOLD_TONES = [[255, 214, 110], [212, 158, 46], [120, 84, 22]];"),
   "backdrops: fxgl hoard constants (CAP 480, K 600, GOLD_TONES) pinned for B's seedHoard port");

// (3a) scenery — 10 regions, 28×11, lossless pack round-trips to live buildGrid
const SC = scenes.constants.scenery, EA = scenes.constants.eventart;
ok(vectors.scenery.length === SC.regionCount && SC.regionCount === 10, "F3: all 10 scenery regions present");
ok(vectors.scenery.every((v, i) => v.region === i), "F3: scenery regions are 0..9 in order");
const palOK = v => v.pal.every(h => /^#[0-9a-f]{6}$/.test(h)) && v.rows.every(r => r.split("").every(ch => parseInt(ch, 36) < v.pal.length));
ok(vectors.scenery.every(v => v.rows.length === SC.rows && v.rows.every(r => r.length === SC.cols)), "F3: every scenery grid is 28×11");
ok(vectors.scenery.every(palOK), "F3: scenery palette-pack is lossless (indices in range, pal is #hex)");
ok(vectors.scenery.every(v => {
  const g = W.Scenery.buildGrid(v.region), u = unpack(v);
  return g.length === u.length && g.every((row, r) => row.every((hex, c) => hex === u[r][c]));
}), "F3: scenery pack round-trips byte-identical to live buildGrid (determinism)");
// the POST-scrim (displayed) grid = source-over blend of the scrim onto the pre-scrim grid
const unpackLit = v => v.litRows.map(r => r.split("").map(ch => v.litPal[parseInt(ch, 36)]));
const SCRIM = { r: 8, g: 10, b: 14, a: 0.64 };
const blend = hex => { const s = [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)], k = 1 - SCRIM.a;
  const ch = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + ch(s[0]*k + SCRIM.r*SCRIM.a) + ch(s[1]*k + SCRIM.g*SCRIM.a) + ch(s[2]*k + SCRIM.b*SCRIM.a); };
ok(vectors.scenery.every(v => v.litRows && v.litRows.length === SC.rows && v.litRows.every(r => r.length === SC.cols)), "F3: every region carries a POST-scrim litGrid (28×11)");
ok(vectors.scenery.every(v => {
  const lit = unpackLit(v), pre = W.Scenery.buildGrid(v.region);
  return pre.every((row, r) => row.every((hex, c) => lit[r][c] === blend(hex)));
}), "F3: litGrid == scrim(0.64) composited over buildGrid — the displayed backdrop pixels are verified, not just pre-scrim");

// (3b) eventart — one per event, 24×16, keyed by the live roster's artSeed, lossless round-trip
const ROSTER = W.Events.ROSTER;
ok(vectors.eventArt.length === ROSTER.length && ROSTER.length === 14, "F4: all 14 event banners present");
ok(vectors.eventArt.every(v => { const ev = ROSTER.find(e => e.id === v.event); return ev && ev.artSeed === v.artSeed; }),
   "F4: each banner's artSeed matches the live event roster");
ok(vectors.eventArt.every(v => v.rows.length === EA.rows && v.rows.every(r => r.length === EA.cols)), "F4: every event banner is 24×16");
ok(vectors.eventArt.every(palOK), "F4: eventart palette-pack is lossless");
ok(vectors.eventArt.every(v => {
  const g = W.EventArt.buildGrid(v.artSeed), u = unpack(v);
  return g.every((row, r) => row.every((hex, c) => hex === u[r][c]));
}), "F4: eventart pack round-trips byte-identical to live buildGrid (determinism)");

console.log(fails ? `\n${fails} FAIL` : "\nALL SCENE PARITY CHECKS PASS");
process.exit(fails ? 1 : 0);
