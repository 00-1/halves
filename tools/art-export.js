/* F1 + F2 — export GG1's procedural PORTRAIT/ICON generators as data + parity vectors.
 * The web draws every hero portrait, item icon and Arena foe from ONE of two deterministic
 * pixel-grid generators (no art assets): collectibles.js drawIcon (= iconRoleGrid + the
 * resolved iconPalette; hero ids route to the mirrored creature-blob) and monsters.js
 * buildGrid (the Arena foe). The port has neither general generator yet, so its Arena/Heroes/
 * inventory screens are portrait-less. This exports the GENERATOR OUTPUT (the exact 16×16 grids)
 * as parity vectors over a representative battery — B ports the generators (read straight from
 * collectibles.js / monsters.js) and proves byte-identical. Same "share DATA, prove with vectors"
 * method as combat/events. ARENA-CRITICAL: the hero (F1) + foe (F2) batteries unblock the Arena
 * screen B is deadlocked on; item icons (F1) are the inventory follow-up.
 * Run:  node tools/art-export.js   (writes content/gg1/art*.json)
 * Test: require('./art-export').generate() → {art, vectors}  (drift gate). */
"use strict";
const fs = require("fs"), path = require("path");
const DEV = path.join(__dirname, "..", "gg1", "dev");

// HERO_PAL lives in main.js (the hero portrait base palette per type); mirrored here and
// source-fidelity-pinned (art-parity asserts main.js still carries the same literal).
const HERO_PAL = {
  Brawn:   { body:"#d05a4a", accent:"#ff8a6e", outline:"#3a1410" },
  Arcane:  { body:"#8a5cf6", accent:"#cda9ff", outline:"#1f1340" },
  Cunning: { body:"#3fce8c", accent:"#8ef0bf", outline:"#0f3324" }
};

function build(){
  const window = {};
  window.performance = { now: () => 0 };
  const load = n => new Function("window", fs.readFileSync(path.join(DEV, n + ".js"), "utf8"))(window);
  load("emblems");   // the REAL emblem generator (F5) — must load before collectibles (which refs window.Emblems)
  load("modes"); load("heroes"); load("events"); load("collectibles"); load("enemies"); load("monsters");
  return { C: window.Collectibles, H: window.Heroes, E: window.Enemies, M: window.Monsters, Em: window.Emblems };
}

// a 16×16 int grid → 16 row strings of single digits (compact + diff-friendly)
const rows = g => g.map(r => r.join(""));
// FNV-1a 32-bit over a string → 8 hex. Portable (B writes the same in Rust). Any byte change
// in the input flips the hash, so a rolled digest over EVERY element's canonical string proves
// the whole space byte-identical in one value (closes the sampling hole on items + foes).
function fnv1a(s){ let h = 0x811c9dc5; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); }
const iconCanon = (id, roleGrid, pal) => id + "|" + roleGrid.join("") + "|" + pal.body + pal.accent + pal.outline;
const foeCanon = (n, roleGrid, pal) => n + "|" + roleGrid.join("") + "|" + pal.body + pal.accent + pal.outline + pal.eye;

function generate(){
  const { C, H, E, M, Em } = build();
  const G = 16, TC = E.TIER_COUNT;

  const art = {
    _note: "GG1 procedural portraits/icons (NO art assets). Two deterministic generators over a 16×16 grid: " +
      "collectibles.js drawIcon (hero portraits + item icons) and monsters.js buildGrid (Arena foes). The port " +
      "reproduces the GENERATORS (read them from gg1/dev) and proves byte-identical vs art-vectors.json.",
    _f1: "ICONS (collectibles.js): buildIcon(id,catId) seeds mulberry32(hashStr(id)); a 'hero:'<id> routes to " +
      "heroSprite (mirrored centre-weighted creature-blob, ~30% accent), else ARCH[cat.arch] + applyLevers. " +
      "iconRoleGrid → 0 empty·1 outline·2 body·3 accent (shape, palette-independent); iconPalette(id,basePal,catId) → " +
      "the per-id hue/lum-shifted {body,accent,outline} LUT. Paint a cell by its role through that LUT. catId 'familiar' " +
      "is the hero archetype (ignored for 'hero:' ids — the hero branch wins).",
    _f2: "FOES (monsters.js): buildGrid({n,name,type}) seeds mulberry32(hashStr(name)^imul(n,2654435761)); a lumpy " +
      "vertically-symmetric blob + region-biased horns/eyes/mouth/feet, bosses (n%12===0) larger + crowned. role grid → " +
      "0 empty·1 outline·2 body·3 accent·4 eye; pal {body,accent,outline,eye} is per TYPE (no per-id shift).",
    _f5: "EMBLEMS (emblems.js): the 3 collector-award emblems (Collection/Codex). Em.cells(id) → a 24×24 grid whose " +
      "cells are indices into Em.PALETTE (RGB triples; 0 = empty/transparent). A SEPARATE generator from drawIcon — " +
      "deterministic, no per-id RNG. NB rank/emblem icons elsewhere: the Results 'rank:<id>' portrait is NOT this — it's " +
      "the drawIcon ARCH ITEM path (rank ids are catalogue items, covered by itemDigest/N1).",
    constants: {
      gridSize: G,
      heroPal: HERO_PAL,                                   // F1 hero base palette per type (pre-shift)
      roleLegendIcon: { 0:"empty", 1:"outline", 2:"body", 3:"accent" },
      roleLegendFoe:  { 0:"empty", 1:"outline", 2:"body", 3:"accent", 4:"eye" },
      emblemSize: 24, emblemPalette: Em.PALETTE,           // F5 — cells index this RGB palette (0 = empty)
      regionSize: M.G ? 12 : 12,                           // bosses on every 12th tier (matches Enemies)
      source: { icons: "gg1/dev/collectibles.js (drawIcon/buildIcon/heroSprite/iconRoleGrid/iconPalette)",
                foes:  "gg1/dev/monsters.js (buildGrid)", emblems: "gg1/dev/emblems.js (cells/PALETTE)" }
    }
  };

  const vectors = { heroIcons: [], itemIcons: [], foes: [], emblems: [], lootItems: [], itemDigest: null, lootDigest: null, foeDigest: null };

  // ---- F5 EMBLEMS (Collection/Codex collector awards) — emblems.js, 24×24 role grid (0..6) + RGB palette ----
  // A separate deterministic generator from drawIcon: Em.cells(id) → {size, cells}; values index Em.PALETTE.
  for(const id of Em.IDS){
    const c = Em.cells(id);
    vectors.emblems.push({ id, size: c.size, rows: c.cells.map(r => r.join("")), palette: Em.PALETTE });
  }

  // ---- F1a HERO PORTRAITS (Arena-critical) — all 12, the mirrored creature-blob ----
  for(const h of H.HEROES){
    const id = "hero:" + h.id, base = HERO_PAL[h.type] || HERO_PAL.Brawn;
    vectors.heroIcons.push({ hero: h.id, id, type: h.type, catId: "familiar",
      basePal: base, roleGrid: rows(C.iconRoleGrid(id, "familiar")), pal: C.iconPalette(id, base, "familiar") });
  }

  // ---- F1b ITEM ICONS (inventory follow-up) — one real item per distinct category ----
  // (every category → exercises every archetype + its presets/levers; role grid + resolved palette)
  // NB: Collectibles.CATALOG order is NOT guaranteed stable run-to-run (a few solve/spark ids tie in
  // the build sort), so pick the lexicographically-smallest id per category — order-independent + stable.
  // NB: the digest/sample cover the NON-LOOT catalogue = exactly content/gg1/collectibles.json (2352 items).
  // LOOT (350, granted by the Arena → it lives in combat.json's lootBoosts, NOT collectibles.json) is exported
  // separately below (it needs its own rarity, which lootBoosts omits) so each digest maps to ONE source file.
  const isLoot = it => /^loot:/.test(it.id);
  const catItems = C.CATALOG.filter(it => !isLoot(it));   // 2352 — the collectibles.json catalogue
  const lootItems = C.CATALOG.filter(isLoot);             // 350  — Arena loot (combat.json lootBoosts)
  const byCat = {};
  for(const it of catItems){ const cat = C.categoryOf(it.id); if(!byCat[cat] || it.id < byCat[cat].id) byCat[cat] = { id: it.id, rarity: it.rarity || "common" }; }
  for(const cat of Object.keys(byCat).sort()){
    const it = byCat[cat], base = C.paletteFor(it.rarity);
    vectors.itemIcons.push({ id: it.id, category: cat, rarity: it.rarity, catId: cat,
      basePal: base, roleGrid: rows(C.iconRoleGrid(it.id, cat)), pal: C.iconPalette(it.id, base, cat) });
  }

  // ---- F2 FOE PORTRAITS (Arena-critical) — types × ALL 10 regions × normal/boss + the final boss ----
  const FOE_TIERS = [1, 2, 3, 11, 12, 24, 30, 36, 48, 60, 66, 84, 96, 108, 119, 120];   // 66 = region 5 (was a gap)
  for(const n of FOE_TIERS){
    const t = E.byTier(n), gr = M.buildGrid(t);
    vectors.foes.push({ tier: { n, name: t.name, type: t.type }, boss: gr.boss, region: gr.region,
      roleGrid: rows(gr.role), pal: gr.pal });
  }

  // ---- FULL-SPACE DIGESTS — close the sampling hole: every item icon is unique (per-id seed +
  // applyLevers), and every one of the 120 foes is unique, so a few samples can't prove the rest.
  // A rolled FNV-1a over EVERY element's canonical {id/n + roleGrid + palette}, in catalogue/tier
  // order, lets B prove its ported generator reproduces ALL of them (recompute the same hash → match).
  const digestOf = items => { const lines = items.map(it => { const cat = C.categoryOf(it.id);
      return iconCanon(it.id, rows(C.iconRoleGrid(it.id, cat)), C.iconPalette(it.id, C.paletteFor(it.rarity || "common"), cat)); });
    lines.sort(); return fnv1a(lines.join("\n") + "\n"); };
  vectors.itemDigest = { count: catItems.length, scope: "content/gg1/collectibles.json catalogue (NON-loot); loot is lootDigest below",
    order: "sorted by item canonical string (order-independent)",
    canon: "per item: `${id}|${roleGrid}|${pal.body}${pal.accent}${pal.outline}` where roleGrid = the 16 iconRoleGrid(id, categoryOf(id)) " +
      "rows EACH joined ('') then ALL concatenated (256 chars of 0..3), and pal = iconPalette(id, paletteFor(rarity), categoryOf(id)). " +
      "Build a line per catalogue id, SORT the lines ascending, join with '\\n', append a trailing '\\n', then FNV-1a-32 " +
      "(offset 0x811c9dc5, prime 0x01000193) → 8 lowercase hex. Order-independent (the sort).",
    fnv: digestOf(catItems) };
  // F1c LOOT icons (inventory-loot screen) — 350 Arena-loot items. Same drawIcon item generator, but their
  // RARITY isn't in combat.json's lootBoosts, so export {id,rarity} here + a matching digest. B paints these
  // from id + rarity (rarity → paletteFor → basePal; catId = categoryOf(id)), same as catalogue items.
  vectors.lootItems = lootItems.map(it => ({ id: it.id, rarity: it.rarity || "common" }));
  vectors.lootDigest = { count: lootItems.length, scope: "the 350 loot ids (combat.json lootBoosts) + rarity from lootItems above",
    order: "sorted by item canonical string", canon: "same recipe as itemDigest.canon, over the loot ids", fnv: digestOf(lootItems) };
  let foeAcc = "";
  for(let n = 1; n <= TC; n++){ const gr = M.buildGrid(E.byTier(n)); foeAcc += foeCanon(n, rows(gr.role), gr.pal) + "\n"; }
  vectors.foeDigest = { count: TC, order: "tier 1..TIER_COUNT",
    canon: "per tier n: `${n}|${roleGrid}|${pal.body}${pal.accent}${pal.outline}${pal.eye}` (roleGrid = 16 Monsters.buildGrid(byTier(n)).role " +
      "rows joined+concatenated, 256 chars of 0..4). Lines in tier order 1..120, join '\\n', trailing '\\n', FNV-1a-32 → 8 hex.",
    fnv: fnv1a(foeAcc) };

  return { art, vectors };
}

if(require.main === module){
  const { art, vectors } = generate();
  fs.writeFileSync(path.join(__dirname, "..", "content", "gg1", "art.json"), JSON.stringify(art, null, 1) + "\n");
  fs.writeFileSync(path.join(__dirname, "..", "content", "gg1", "art-vectors.json"), JSON.stringify(vectors) + "\n");
  console.log("wrote content/gg1/art.json + art-vectors.json — heroIcons", vectors.heroIcons.length,
    "itemIcons", vectors.itemIcons.length, "(+digest all", vectors.itemDigest.count + ")",
    "foes", vectors.foes.length, "(+digest all", vectors.foeDigest.count + ")", "emblems", vectors.emblems.length,
    "loot", vectors.lootItems.length, "(itemDigest scope", vectors.itemDigest.count + " = collectibles.json)");
}
module.exports = { generate };
