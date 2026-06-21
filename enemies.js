/*
 * Halves — enemy tiers, battle resolution, and tier loot (Phase 3, T23).
 *
 * A 100-tier ladder (extendable: bump TIER_COUNT) the player climbs in the Arena
 * (T24). Each tier has a rock-paper-scissors `type` and a defence `def`; beating
 * it grants `tier:n` plus a batch of brand-new catalogue items (`loot:<n>:<k>`),
 * each carrying the usual style / flavour / hero-boost — so winning makes your
 * heroes stronger and opens the next tier (the core loop).
 *
 * Everything here is pure data + functions on window.Enemies — no DOM, fully
 * Node-testable. Two invariants are enforced by construction and proven in the
 * T23 Node test:
 *   • No tier is gated behind its own loot — `def_n` is beatable using only items
 *     obtainable BEFORE tier n (all drill collectibles + loot from tiers 1..n-1).
 *   • The final tier (100) only falls at ~full collection: its `def` equals the
 *     best hero's rating with every boost EXCEPT tier-100's own loot, at
 *     advantage matchup and perfect performance.
 */
(function(){
  "use strict";

  const C = window.Collectibles;
  const H = window.Heroes;
  if(!C || !H){ return; }   // dependencies must load first (collectibles.js, heroes.js)

  const TIER_COUNT = 100;
  const TYPES = ["Brawn", "Arcane", "Cunning"];   // cycle order
  const ADV_MULT = 1.5;                            // advantage matchup multiplier

  // Difficulty ramp. `def` is min(geometric ramp, beatability cap). The ramp keeps
  // the early game gentle (beatable by the starter hero); for deep tiers the cap —
  // tied to the strongest hero you could field with pre-tier items — takes over so
  // the climb genuinely tracks your collection. (Balance pass lives in T25.)
  const DEF_BASE = 11;       // tier-1 ramp value
  const DEF_GROWTH = 1.062;  // per-tier geometric growth of the ramp
  const CAP_FRAC = 0.92;     // headroom under the theoretical max so wins don't need literal perfection

  function clamp(v, lo, hi){ return v < lo ? lo : (v > hi ? hi : v); }

  // ---- themed names (T44) -------------------------------------------------
  // Regions (weakest→strongest), the rank-title ladder within a region, and a
  // named boss overriding each region's 10th tier (tiers 10/20/…/100).
  const BANDS = [
    "Goblin Warren", "Gallowmarch", "Gloamwood", "Haunted Marsh", "Frostpeak Caverns",
    "Drownholm", "Cinderwaste", "Stormspire", "Dragon's Roost", "The Void Throne"
  ];
  const RANK_TITLES = ["Runt", "Sentry", "Brute", "Raider", "Warden",
                       "Champion", "Reaver", "Dread", "Warlord", "Overlord"];
  const BOSSES = [
    "Goblin King", "The Highwayman", "Old Mother Bramble", "Gurgle, King of the Bog",
    "The Frost Jarl", "Bonecaller", "Cindermaw", "Voltan, Lord of Storms",
    "the Elder Wyrm", "The Void Sovereign"
  ];
  function tierName(n){
    const region = Math.floor((n - 1) / 10), pos = (n - 1) % 10;
    return pos === 9 ? BOSSES[region] : (BANDS[region] + " " + RANK_TITLES[pos]);
  }

  // ---- loot generation ----------------------------------------------------
  // Batch size grows with depth — 1 (tiers 1–25) → 4 (tiers 76–100), total 250 —
  // so deeper tiers drop more; within a batch the later items are rarer, and deeper
  // tiers drop epic/legendary loot. (T43 trimmed this from 3+floor((n-1)/12)=668.)
  function lootCount(n){ return 1 + Math.floor((n - 1) / 25); }

  function lootRarity(n, k, count){
    const last = k >= count - 1, lateHalf = k >= Math.floor(count / 2);
    if(n >= 90) return last ? "legendary" : (lateHalf ? "epic" : "rare");
    if(n >= 70) return last ? "legendary" : (lateHalf ? "epic" : "rare");
    if(n >= 50) return last ? "epic" : (lateHalf ? "rare" : "uncommon");
    if(n >= 30) return last ? "epic" : (lateHalf ? "rare" : "uncommon");
    if(n >= 15) return last ? "rare" : (lateHalf ? "uncommon" : "common");
    return k === 0 ? "common" : (lateHalf ? "uncommon" : "common");
  }

  // Build + register a tier's loot batch as real catalogue items. Returns the
  // list of item ids. Idempotent via C.registerItem.
  function buildTierLoot(n){
    const count = lootCount(n), name = tierName(n), ids = [];
    for(let k = 0; k < count; k++){
      const id = "loot:" + n + ":" + k;
      C.registerItem({
        id: id,
        name: "Tier " + n + " Spoils",
        rarity: lootRarity(n, k, count),
        cat: "Loot",
        modeId: null,
        tier: n,
        desc: "Spoils from defeating " + name + " (tier " + n + ").",
        test: () => false     // loot is granted by winning a battle, never by drills
      });
      ids.push(id);
    }
    return ids;
  }

  // ---- rating helpers over an explicit owned-set --------------------------
  // Snapshot the drill catalogue ids BEFORE any loot is registered, so we can
  // model "all drill items owned" independent of loot.
  const DRILL_IDS = C.CATALOG.map(it => it.id);

  // Highest rating reachable against a tier of `type`, given an owned-set — using
  // only heroes that hold the type ADVANTAGE (so the ×1.5 is actually attainable).
  function bestAdvRating(type, owned){
    let best = 0;
    for(const hero of H.HEROES){
      if(!H.beats(hero.type, type)) continue;
      const r = H.rating(hero, owned);
      if(r > best) best = r;
    }
    return best;
  }
  // Highest rating reachable by ANY hero given an owned-set, with the hero.
  function bestRating(owned){
    let best = 0, bestHero = H.HEROES[0];
    for(const hero of H.HEROES){
      const r = H.rating(hero, owned);
      if(r > best){ best = r; bestHero = hero; }
    }
    return { rating: best, hero: bestHero };
  }

  // ---- build the ladder ---------------------------------------------------
  // Register every tier's loot first (so all boosts exist in the catalogue), then
  // compute each `def` against the owned-set obtainable strictly before that tier.
  const TIERS = [];
  const lootByTier = {};
  for(let n = 1; n <= TIER_COUNT; n++) lootByTier[n] = buildTierLoot(n);

  // Forward pass: per-tier type, ramp value, and the honest beatability cap
  // (the strongest battlePower a player could field with pre-tier items: best
  // ADVANTAGE hero × ×1.5 × perfect perf). The owned-set accrues each tier's loot.
  const types = [], ramps = [], caps = [];
  {
    const owned = {};
    DRILL_IDS.forEach(id => owned[id] = true);
    for(let n = 1; n <= TIER_COUNT; n++){
      const type = TYPES[(n - 1) % TYPES.length];
      types.push(type);
      ramps.push(DEF_BASE * Math.pow(DEF_GROWTH, n - 1));
      caps.push(bestAdvRating(type, owned) * ADV_MULT);
      lootByTier[n].forEach(id => owned[id] = true);
    }
  }
  // The raw cap wobbles tier-to-tier (the advantage-hero set changes as types
  // cycle and loot spreads unevenly), which can make a deeper tier momentarily
  // EASIER. Smooth it with a suffix-min envelope: capEnv[n] = min(cap[n..N]).
  // This stays ≤ each tier's own cap (so no tier is gated behind its own loot)
  // while being non-decreasing — so def, = min(rising ramp, non-decreasing
  // capEnv×frac), climbs monotonically. (Finer balance is T25's pass.)
  const capEnv = caps.slice();
  for(let i = capEnv.length - 2; i >= 0; i--) capEnv[i] = Math.min(capEnv[i], capEnv[i + 1]);

  for(let n = 1; n <= TIER_COUNT; n++){
    const def = Math.max(1, Math.round(Math.min(ramps[n - 1], capEnv[n - 1] * CAP_FRAC)));
    TIERS.push({ n: n, name: tierName(n), type: types[n - 1], def: def });
  }

  // Final boss (tier 100): re-calibrate so it only falls at ~full collection.
  // `owned` now holds every drill item + loot from tiers 1..99 (NOT tier-100 loot).
  // Pick the strongest hero at that collection and set the boss's type so that hero
  // holds the advantage; def = round(best rating × advantage).
  (function calibrateFinal(){
    // Owned-set = every drill item + loot from tiers 1..99 (NOT tier-100's loot).
    const exclFinal = {};
    DRILL_IDS.forEach(id => exclFinal[id] = true);
    for(let k = 1; k < TIER_COUNT; k++) lootByTier[k].forEach(id => exclFinal[id] = true);
    const best = bestRating(exclFinal);
    // the type our champion BEATS (so the champion has advantage against the boss)
    const beaten = TYPES.filter(t => H.beats(best.hero.type, t))[0];
    const boss = TIERS[TIER_COUNT - 1];
    boss.type = beaten || boss.type;
    boss.def = Math.round(best.rating * ADV_MULT);
  })();

  // ---- battle resolution (pure) -------------------------------------------
  // Win if battlePower ≥ tier.def, where
  //   battlePower = round( rating(hero, collected) × matchup × (0.4 + 0.6·perf) ).
  function resolveBattle(hero, tier, perf, collected){
    const heroObj = (typeof hero === "string") ? H.byId(hero) : hero;
    const rating = H.rating(heroObj, collected || {});
    const mu = H.matchup(heroObj.type, tier.type);
    const p = clamp(perf, 0, 1);
    const factor = 0.4 + 0.6 * p;
    const battlePower = Math.round(rating * mu * factor);
    return {
      win: battlePower >= tier.def,
      battlePower: battlePower,
      rating: rating,
      matchup: mu,
      perf: p,
      def: tier.def,
      hero: heroObj.id,
      tier: tier.n
    };
  }

  // Map a finished drill round to perf ∈ [0,1]. `target` is a calm per-answer
  // baseline (seconds); answering faster than it lifts perf, slower lowers it.
  // Arena (T24) may pass a hero-tuned target; default is a gentle 3.0s.
  const PERF_TARGET = 3.0;
  function computePerf(score, total, avgAnswerTime, target){
    target = (typeof target === "number" && target > 0) ? target : PERF_TARGET;
    const clean = total > 0 ? score / total : 0;
    const t = avgAnswerTime > 0 ? avgAnswerTime : target;
    const pace = clamp(target / t, 0.5, 1.3);
    return clamp(clean * pace, 0, 1);
  }

  // ---- public api ---------------------------------------------------------
  function byTier(n){ return TIERS[n - 1] || null; }
  function tierLoot(n){ return (lootByTier[n] || []).slice(); }
  // The 10 themed tier-regions (10 tiers each); label = the enemy band name.
  function tierRegion(n){ return Math.floor((n - 1) / 10); }
  function regionLabel(r){ return BANDS[r] || ("Region " + (r + 1)); }
  // Can the player attempt tier n? Only after owning the previous tier marker.
  function canAttempt(n, collected){ return n === 1 || !!(collected && collected["tier:" + (n - 1)]); }
  // The next unbeaten tier given owned `tier:*` markers (1-based).
  function currentTier(collected){
    let n = 1;
    while(n < TIER_COUNT && collected && collected["tier:" + n]) n++;
    return byTier(n);
  }

  window.Enemies = {
    TIERS, TIER_COUNT,
    byTier, tierLoot, tierRegion, regionLabel, canAttempt, currentTier,
    resolveBattle, computePerf,
    matchup: H.matchup, beats: H.beats
  };
})();
