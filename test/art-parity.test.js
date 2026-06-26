/* F1+F2 art parity gate. Like the other export tests:
 *   (1) DRIFT: regenerate from gg1/dev → equals the committed JSON byte-for-byte.
 *   (2) SOURCE FIDELITY: the two generators' load-bearing lines still live in
 *       collectibles.js / monsters.js, and the hero base palette still lives in main.js.
 *   (3) INVARIANTS: every grid is 16×16 in its role legend; hero + foe portraits are
 *       vertically symmetric (the mirrored builders); boss flag == n%12; all 12 heroes
 *       present; every icon carries a resolved {body,accent,outline} LUT.
 * Run: node test/art-parity.test.js */
"use strict";
const fs = require("fs"), path = require("path");
const { generate } = require("../tools/art-export");

let fails = 0;
const ok = (c, m) => { if(!c){ console.error("FAIL:", m); fails++; } else console.log("ok:", m); };
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const { art, vectors } = generate();

// independent live load (the digest is re-derived here a SECOND way — what B's Rust does — so a bug
// in the exporter's own digest accumulation can't pass; mirrors scene-parity's round-trip proof).
function live(){
  const window = { Emblems: { draw(){}, has: () => false, list: () => [] }, performance: { now: () => 0 } };
  const load = n => new Function("window", read("gg1/dev/" + n + ".js"))(window);
  ["modes","heroes","events","collectibles","enemies","monsters"].forEach(load);
  return window;
}
const W = live();
function fnv1a(s){ let h = 0x811c9dc5; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); }
const gridRows = g => g.map(r => r.join(""));
// F5 emblems live (loaded standalone — emblems.js needs no other module)
const EmW = {}; new Function("window", read("gg1/dev/emblems.js"))(EmW); const Em = EmW.Emblems;

// (1) drift
ok(read("content/gg1/art.json") === JSON.stringify(art, null, 1) + "\n", "art.json matches regenerate");
ok(read("content/gg1/art-vectors.json") === JSON.stringify(vectors) + "\n", "art-vectors.json matches regenerate");

// (2) source fidelity — the grids are generated from these exact lines
const co = read("gg1/dev/collectibles.js"), mo = read("gg1/dev/monsters.js"), mn = read("gg1/dev/main.js");
[
  ["collectibles.js G", co, "const G = 16;"],
  ["collectibles.js hero branch", co, 'if(typeof id === "string" && id.indexOf("hero:") === 0){'],
  ["collectibles.js heroSprite mirror", co, "g[y][x] = on; g[y][G-1-x] = on;"],
  ["collectibles.js iconPalette", co, "function iconPalette(id, basePal, catId){ const { shift } = buildIcon(id, catId);"],
  ["collectibles.js applyLevers rTex seed", co, "rPick = mulberry32(seed), rTex = mulberry32((seed ^ 0x9e3779b9) >>> 0);"],
  ["monsters.js buildGrid seed", mo, "const rnd = mulberry32((hashStr(name) ^ Math.imul(n, 2654435761)) >>> 0);"],
  ["monsters.js setSym", mo, "function setSym(g,x,y){ set(g,x,y); set(g,G-1-x,y); }"],
  ["monsters.js boss flag", mo, "const boss = (n % REGION_SIZE === 0);"],
  ["monsters.js region horns", mo, "const horns = region >= 9 ? 0 : (region >= 4 ? 2 : (rnd() < 0.45 ? 1 : 2));"],
  ["monsters.js region eyes", mo, "let ec = 1 + Math.floor(rnd() * (region >= 8 ? 3 : 2));"],
  ["main.js HERO_PAL Brawn", mn, 'Brawn:   { body:"#d05a4a", accent:"#ff8a6e", outline:"#3a1410" }'],
].forEach(([label, src, s]) => ok(src.includes(s), "source fidelity: " + label));
// the mirrored HERO_PAL constant equals main.js's
ok(art.constants.heroPal.Arcane.body === "#8a5cf6" && art.constants.heroPal.Cunning.body === "#3fce8c" &&
   mn.includes('Arcane:  { body:"#8a5cf6"') && mn.includes('Cunning: { body:"#3fce8c"'),
   "art.heroPal matches main.js HERO_PAL (Arcane/Cunning)");

// (3) grid invariants
const G = art.constants.gridSize;
ok(G === 16, "grid is 16×16");
const sym = g => g.every(r => { for(let x = 0; x < 8; x++) if(r[x] !== r[G - 1 - x]) return false; return true; });
const shaped = (g, re) => g.length === G && g.every(r => re.test(r));
const ICON_RE = /^[0-3]{16}$/, FOE_RE = /^[0-4]{16}$/;

// heroes — all 12, vertically symmetric, role-shaped, with a resolved palette
const HERO_IDS = ["bram","greta","tovar","mo","wisp","mira","nim","zeph","pip","vex","sela","roon"];
ok(vectors.heroIcons.length === 12 && HERO_IDS.every(id => vectors.heroIcons.some(h => h.hero === id)),
   "F1: all 12 hero portraits present");
ok(vectors.heroIcons.every(h => h.id === "hero:" + h.hero && shaped(h.roleGrid, ICON_RE) && sym(h.roleGrid)),
   "F1: hero portraits are 16×16, in {0..3}, vertically symmetric (the mirrored creature-blob)");
ok(vectors.heroIcons.every(h => h.pal && h.pal.body && h.pal.accent && h.pal.outline && h.basePal),
   "F1: each hero carries base + resolved {body,accent,outline} palette");

// item icons — one per distinct category, role-shaped, palette present
ok(vectors.itemIcons.length >= 40, "F1: item-icon battery covers the catalogue categories (" + vectors.itemIcons.length + ")");
ok(new Set(vectors.itemIcons.map(i => i.category)).size === vectors.itemIcons.length, "F1: one item per DISTINCT category (no dup archetype)");
ok(vectors.itemIcons.every(i => shaped(i.roleGrid, ICON_RE) && i.pal.body && i.pal.accent && i.pal.outline),
   "F1: item icons are 16×16 in {0..3} with a resolved palette");

// foes — symmetric, role-shaped (incl. eyes=4), boss flag correct, typed palette
ok(vectors.foes.length >= 12 && vectors.foes.every(f => shaped(f.roleGrid, FOE_RE) && sym(f.roleGrid)),
   "F2: foe portraits are 16×16, in {0..4} (eyes), vertically symmetric");
ok(vectors.foes.every(f => f.boss === (f.tier.n % art.constants.regionSize === 0)), "F2: boss flag === (n % 12 === 0)");
ok(vectors.foes.some(f => f.boss) && vectors.foes.some(f => !f.boss), "F2: battery spans normal + boss foes");
ok(vectors.foes.every(f => f.pal.body && f.pal.accent && f.pal.outline && f.pal.eye), "F2: each foe carries a typed {body,accent,outline,eye} palette");
ok(["Brawn","Arcane","Cunning"].every(t => vectors.foes.some(f => f.tier.type === t)), "F2: battery spans all three foe types");
ok(vectors.foes.some(f => f.region === 5), "F2: region 5 is sampled (was a gap)");

// (4) FULL-SPACE DIGESTS — re-derive over EVERY item + EVERY foe from the live generators and
// assert the committed rolled hash matches (proves the port must reproduce ALL of them, not the sample).
const C = W.Collectibles, E = W.Enemies, M = W.Monsters;
ok(/^[0-9a-f]{8}$/.test(vectors.itemDigest.fnv) && /^[0-9a-f]{8}$/.test(vectors.foeDigest.fnv), "digests are 8-hex FNV-1a");
ok(vectors.itemDigest.count === C.CATALOG.length && vectors.itemDigest.count > 2000, "itemDigest covers the FULL catalogue (" + vectors.itemDigest.count + " items)");
ok(vectors.foeDigest.count === E.TIER_COUNT && vectors.foeDigest.count === 120, "foeDigest covers ALL 120 foe tiers");
(function(){
  const itemLines = C.CATALOG.map(it => { const cat = C.categoryOf(it.id);
    return it.id + "|" + gridRows(C.iconRoleGrid(it.id, cat)).join("") + "|" +
      (p => p.body + p.accent + p.outline)(C.iconPalette(it.id, C.paletteFor(it.rarity || "common"), cat)); });
  itemLines.sort();   // order-independent (CATALOG order is not guaranteed stable)
  const itemAcc = itemLines.join("\n") + "\n";
  ok(fnv1a(itemAcc) === vectors.itemDigest.fnv, "itemDigest re-derives from live over every item (sorted, order-independent)");
  let foeAcc = "";
  for(let n = 1; n <= E.TIER_COUNT; n++){ const gr = M.buildGrid(E.byTier(n));
    foeAcc += n + "|" + gridRows(gr.role).join("") + "|" + gr.pal.body + gr.pal.accent + gr.pal.outline + gr.pal.eye + "\n"; }
  ok(fnv1a(foeAcc) === vectors.foeDigest.fnv, "foeDigest re-derives from live over all 120 foes (tier order, deterministic)");
  // sensitivity: a one-cell perturbation flips the digest (the hash actually guards the grids)
  ok(fnv1a(itemAcc + " ") !== vectors.itemDigest.fnv && fnv1a(foeAcc.replace(/0/, "1")) !== vectors.foeDigest.fnv,
     "digest is change-sensitive (any grid divergence flips it)");
})();

// (5) F5 EMBLEMS — all 3 present, 24×24, re-derive byte-identical from live Em.cells, palette carried
ok(vectors.emblems.length === Em.IDS.length && Em.IDS.every(id => vectors.emblems.some(e => e.id === id)),
   "F5: all " + Em.IDS.length + " emblems present (" + Em.IDS.join(", ") + ")");
ok(vectors.emblems.every(e => e.size === 24 && e.rows.length === 24 && e.rows.every(r => r.length === 24 && /^[0-6]+$/.test(r))),
   "F5: emblems are 24×24 grids of palette indices (0..6)");
ok(vectors.emblems.every(e => {
  const c = Em.cells(e.id);
  return c.cells.every((row, y) => row.join("") === e.rows[y]);
}), "F5: emblem grids re-derive byte-identical from live Em.cells (determinism)");
ok(vectors.emblems.every(e => e.palette && art.constants.emblemPalette), "F5: emblems carry the RGB palette (the cells index it)");

console.log(fails ? `\n${fails} FAIL` : "\nALL ART PARITY CHECKS PASS");
process.exit(fails ? 1 : 0);
