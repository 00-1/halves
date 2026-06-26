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
  ["monsters.js buildGrid seed", mo, "const rnd = mulberry32((hashStr(name) ^ Math.imul(n, 2654435761)) >>> 0);"],
  ["monsters.js setSym", mo, "function setSym(g,x,y){ set(g,x,y); set(g,G-1-x,y); }"],
  ["monsters.js boss flag", mo, "const boss = (n % REGION_SIZE === 0);"],
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

console.log(fails ? `\n${fails} FAIL` : "\nALL ART PARITY CHECKS PASS");
process.exit(fails ? 1 : 0);
