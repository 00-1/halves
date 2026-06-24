/* T233b — export GG1 GOLD-EARNING rules as data + parity vectors (NON-DESTRUCTIVE).
 * Companion to earning-export.js (T233). The gold formulas live INSIDE main.js's
 * DOM-coupled IIFE (not a pure module), so rather than hand-copy them we EXTRACT the
 * exact function source from gg1/dev/main.js and run it headlessly over the real
 * loaded modules — the vectors are generated FROM the source text, so they can't
 * silently drift from main.js. Same "share DATA not code, prove with vectors" win.
 * Run:  node tools/gold-export.js     (writes content/gg1/gold*.json)
 * Test: require('./gold-export').generate() → {gold, vectors}  (drift + source gate). */
"use strict";
const fs = require("fs"), path = require("path");
const DEV = path.join(__dirname, "..", "gg1", "dev");
const readDev = n => fs.readFileSync(path.join(DEV, n + ".js"), "utf8");

// --- pull a top-level `function NAME(...){...}` or `const NAME = ...;` out of src,
//     brace-matched so multi-line bodies come through intact (no string/template
//     braces exist in the gold region, so a plain counter is safe). -------------
function sliceDecl(src, decl){
  const i = src.indexOf(decl);
  if(i < 0) throw new Error("gold-export: declaration not found in main.js: " + decl);
  if(decl.startsWith("const")){                 // single-line const — to the `;`
    const end = src.indexOf(";", i);
    return src.slice(i, end + 1);
  }
  let depth = 0, j = src.indexOf("{", i);
  for(let k = j; k < src.length; k++){
    if(src[k] === "{") depth++;
    else if(src[k] === "}"){ depth--; if(depth === 0) return src.slice(i, k + 1); }
  }
  throw new Error("gold-export: unbalanced braces for " + decl);
}

// the EXACT declarations to lift from main.js (order = dependency order; consts first)
const DECLS = [
  "const HOARD_G = ",
  "const GOLD_EMPTY = ",
  "const HOARD_LO = ",
  "function questionGold(",
  "function roundBonusGold(",
  "function tierGold(",
  "function bossesDefeated(",
  "function hoardMult(",
  "function goldMult(",
  "function hoardLevel(",
];

function build(){
  // load the pure modules the gold formulas read (Enemies needs Collectibles+Heroes)
  const window = {};
  window.Emblems = { draw(){}, has: () => false, list: () => [] };
  window.performance = { now: () => 0 };
  const load = n => new Function("window", readDev(n))(window);
  load("modes"); load("heroes"); load("events"); load("collectibles"); load("enemies");

  // lift the gold formulas verbatim from main.js and instantiate them over `window`/`C`
  const main = readDev("main");
  const lifted = DECLS.map(d => sliceDecl(main, d)).join("\n");
  const G = new Function("window", "C", "MODES",
    lifted + "\nreturn { questionGold, roundBonusGold, tierGold, bossesDefeated," +
    " hoardMult, goldMult, hoardLevel, HOARD_G, GOLD_EMPTY, GOLD_FULL };"
  )(window, window.Collectibles, window.MODES);
  return { G, C: window.Collectibles, MODES: window.MODES, H: window.Heroes,
    E: window.Enemies, CATALOG: window.Collectibles.CATALOG };
}

function generate(){
  const { G, C, MODES, H, E, CATALOG } = build();

  // ---- (1) the cleanly-data constants (B implements the count-based formula from these)
  const gold = {
    _note: "GG1 goblin-gold earning rules (from main.js). Pure numeric formulas proven by gold-vectors.json.",
    _round: "Round-end gold (faithful to main.js finish()): for each CLEANLY-solved question (qMiss===0) " +
      "earn questionGold(mode.masterSecs, dt, combo, goldMult(col)); combo = running count of clean solves " +
      "this round (0 at round start, ++ before each award); recompute goldMult(col) per question (col mutates " +
      "as awards drop). Then earn += roundBonusGold(score, rankIndex(score,total,totalTime), goldMult(col)). " +
      "Finally earnGold(round(earn)): total += round(earn); cross wealth milestones via evaluateGold (already " +
      "in earning-vectors.json). NO spending — gold only accrues.",
    _catalog: "goldMult's `items` counts EVERY owned C.CATALOG entry INCLUDING Arena loot — at runtime " +
      "enemies.js registers tier loot into CATALOG (2352 collectibles + loot = " + CATALOG.length + "). Until " +
      "the Arena is ported B has no loot, so only the 2352 collectibles contribute (items maxes at 2352, not " +
      CATALOG.length + "); the `full` vector below records the full-catalogue count for when the Arena lands.",
    _tolerance: "Match within 1e-9 absolute for questionGold/roundBonusGold/tierGold/hoardLevel; goldMult uses " +
      "HOARD_G^bosses (integer power) so allow 1e-6 relative there (powi vs Math.pow last-ULP).",
    HOARD_G: G.HOARD_G,                                  // exponential boss multiplier base (2.5)
    GOLD_EMPTY: G.GOLD_EMPTY, GOLD_FULL: G.GOLD_FULL,    // visual hoard curve bounds (500 .. 1e15)
    // goldMult(col) = (1 + items*itemW + mastered*masteryW + heroes*heroW + tiers*tierW) * HOARD_G^bosses
    multWeights: { item: 0.05, mastery: 0.5, hero: 0.5, tier: 1 },
    regionSize: E.REGION_SIZE, tierCount: E.TIER_COUNT, // bosses = #(tier:n owned, n % regionSize === 0)
    questionGold: "(2 + max(0, round(target - dt))) * (1 + combo*0.1) * mult   [target = mode.masterSecs]",
    roundBonusGold: "(score + rankIdx*2) * mult",
    tierGold: "round(10 * (1 + n/10)) * mult        [Arena per-tier payoff]",
    hoardLevel: "clamp((log10(1+gold) - log10(GOLD_EMPTY)) / (log10(GOLD_FULL) - log10(GOLD_EMPTY)), 0, 1)",
  };

  // ---- (2) parity VECTORS (generated from the lifted source) ----------------
  const vectors = { questionGold: [], roundBonusGold: [], tierGold: [], hoardLevel: [], goldMult: [] };

  // questionGold(target, dt, combo, mult): target = masterSecs band; dt across/under target
  for(const target of [3.5, 4])
    for(const dt of [0.2, 0.5, 1.0, 1.5, 2.0, 3.0, 3.5, 4.0, 5.0, 8.0])
      for(const combo of [0, 1, 2, 5, 10, 25, 50])
        for(const mult of [1, 2.5, 10])
          vectors.questionGold.push({ target, dt, combo, mult, gold: G.questionGold(target, dt, combo, mult) });

  // roundBonusGold(score, rankIdx, mult)
  for(const score of [0, 5, 10, 21, 27])
    for(const rankIdx of [0, 1, 5, 11, 22])
      for(const mult of [1, 2.5, 10])
        vectors.roundBonusGold.push({ score, rankIdx, mult, gold: G.roundBonusGold(score, rankIdx, mult) });

  // tierGold(n, mult)
  for(const n of [1, 12, 24, 25, 60, 100, 119, 120])
    for(const mult of [1, 2.5, 10])
      vectors.tierGold.push({ n, mult, gold: G.tierGold(n, mult) });

  // hoardLevel(gold) — visual curve, full magnitude sweep
  for(const g of [0, 1, 100, 499, 500, 1000, 60000, 1e6, 1e9, 1e12, 1e15, 1e18])
    vectors.hoardLevel.push({ gold: g, level: G.hoardLevel(g) });

  // goldMult(col): engineer cols spanning the count axes, record the DERIVED counts the
  // live function reads + the output, so B verifies its count-based formula self-contained.
  const ids = CATALOG.map(it => it.id);
  const masteryKeys = MODES.map(m => "mastery:" + m.id);
  const bossTiers = []; for(let t = E.REGION_SIZE; t <= E.TIER_COUNT; t += E.REGION_SIZE) bossTiers.push("tier:" + t);
  const allTiers = []; for(let t = 1; t <= E.TIER_COUNT; t++) allTiers.push("tier:" + t);
  const own = arr => { const o = {}; arr.forEach(k => o[k] = { ts: 1 }); return o; };
  const merge = (...cs) => Object.assign({}, ...cs);
  const heroesUnlocked = col => H.HEROES.filter(h => H.isHeroUnlocked(h, col)).length;
  const cols = {
    empty:        {},
    items50:      own(ids.slice(0, 50)),
    items500:     own(ids.slice(0, 500)),
    mastery3:     own(masteryKeys.slice(0, 3)),
    tiers1to24:   own(allTiers.slice(0, 24)),                 // 2 boss tiers (12,24)
    allBosses:    own(bossTiers),                             // 10 region bosses
    mix:          merge(own(ids.slice(0, 200)), own(masteryKeys.slice(0, 5)), own(allTiers.slice(0, 36))),
    full:         merge(own(ids), own(masteryKeys), own(allTiers)),
  };
  for(const label in cols){
    const col = cols[label];
    const items = CATALOG.filter(it => col[it.id]).length;
    let mastered = 0, tiers = 0;
    for(const k in col){ if(k.indexOf("mastery:") === 0) mastered++; else if(/^tier:\d+$/.test(k)) tiers++; }
    vectors.goldMult.push({
      label,
      counts: { items, mastered, heroes: heroesUnlocked(col), tiers, bosses: G.bossesDefeated(col) },
      goldMult: G.goldMult(col),
    });
  }

  return { gold, vectors };
}

if(require.main === module){
  const { gold, vectors } = generate();
  fs.writeFileSync(path.join(__dirname, "..", "content", "gg1", "gold.json"), JSON.stringify(gold, null, 1) + "\n");
  fs.writeFileSync(path.join(__dirname, "..", "content", "gg1", "gold-vectors.json"), JSON.stringify(vectors) + "\n");
  const n = vectors.questionGold.length + vectors.roundBonusGold.length + vectors.tierGold.length
    + vectors.hoardLevel.length + vectors.goldMult.length;
  console.log("wrote content/gg1/gold.json + gold-vectors.json — HOARD_G", gold.HOARD_G, "vectors", n);
}
module.exports = { generate };
