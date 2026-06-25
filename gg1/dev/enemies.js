/*
 * Halves — enemy tiers, battle resolution, and tier loot (Phase 3, T23).
 *
 * A 120-tier ladder (extendable: bump TIER_COUNT) the player climbs in the Arena
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

  const TIER_COUNT = 120;                          // 10 regions × 12 tiers (T66)
  const REGION_SIZE = 12;                          // tiers per region; boss at the 12th
  const TYPES = ["Brawn", "Arcane", "Cunning"];   // cycle order
  // (The Arena is FULLY 3v3 now — the old 1v1 stat-check `def` ladder + statBattle are removed.
  //  Difficulty lives entirely in the 3v3 FOE_BUDGET curve below.)

  // ---- themed names (T44) -------------------------------------------------
  // Regions (weakest→strongest), the rank-title ladder within a region, and a
  // named boss overriding each region's 12th tier (tiers 12/24/…/120).
  const BANDS = [
    "Goblin Warren", "Gallowmarch", "Gloamwood", "Haunted Marsh", "Frostpeak Caverns",
    "Drownholm", "Cinderwaste", "Stormspire", "Dragon's Roost", "The Void Throne"
  ];
  // 11 rank-titles (positions 0–10 within a region); position 11 is the named boss.
  const RANK_TITLES = ["Runt", "Sentry", "Brute", "Raider", "Warden", "Champion",
                       "Reaver", "Dread", "Warlord", "Overlord", "Tyrant"];
  const BOSSES = [
    "Goblin King", "The Highwayman", "Old Mother Bramble", "Gurgle, King of the Bog",
    "The Frost Jarl", "Bonecaller", "Cindermaw", "Voltan, Lord of Storms",
    "the Elder Wyrm", "The Void Sovereign"
  ];
  function tierName(n){
    const region = Math.floor((n - 1) / REGION_SIZE), pos = (n - 1) % REGION_SIZE;
    return pos === REGION_SIZE - 1 ? BOSSES[region] : (BANDS[region] + " " + RANK_TITLES[pos]);
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

  // Highest-rating hero given an owned-set (+ the hero) — used to pick the final boss's adaptive type.
  function bestRating(owned){
    let best = 0, bestHero = H.HEROES[0];
    for(const hero of H.HEROES){
      const r = H.rating(hero, owned);
      if(r > best){ best = r; bestHero = hero; }
    }
    return { rating: best, hero: bestHero };
  }

  // ---- build the ladder: per-tier NAME + TYPE (the 3v3 reads `type` for matchup) ----
  const TIERS = [];
  const lootByTier = {};
  for(let n = 1; n <= TIER_COUNT; n++) lootByTier[n] = buildTierLoot(n);
  for(let n = 1; n <= TIER_COUNT; n++){
    // region BOSSES (every REGION_SIZEth tier) vary their type by region so each reads as a
    // distinct colour/matchup; the final boss is re-typed adaptively by calibrateFinal below.
    const isBoss = n % REGION_SIZE === 0;
    const type = isBoss ? TYPES[Math.floor((n - 1) / REGION_SIZE) % TYPES.length]
                        : TYPES[(n - 1) % TYPES.length];
    TIERS.push({ n: n, name: tierName(n), type: type });
  }
  // Final boss: re-type so the player's strongest hero (at a near-full collection) holds the advantage.
  (function calibrateFinal(){
    const exclFinal = {};
    DRILL_IDS.forEach(id => exclFinal[id] = true);
    for(let k = 1; k < TIER_COUNT; k++) lootByTier[k].forEach(id => exclFinal[id] = true);
    const beaten = TYPES.filter(t => H.beats(bestRating(exclFinal).hero.type, t))[0];
    if(beaten) TIERS[TIER_COUNT - 1].type = beaten;
  })();

  // ---- 3v3 team battle: deterministic auto-resolve sim (T88) ---------------
  // A turn-based 1–3 heroes vs 3 foes attrition fight with ZERO RNG (same inputs → same result);
  // every invariant is re-proven by simulation (arena3.test.js). (The old 1v1 statBattle/`def`
  // ladder is gone — the live Arena is fully 3v3.)
  // COMBAT REDESIGN (2026-06 — make all 4 stats matter; tools/proto-combat.js validates balance + leverage):
  //   PWR = damage (× type matchup) · FOC = flat damage that IGNORES matchup (your bad-matchup floor) ·
  //   GRD = mitigation (each incoming hit reduced by round(guard·MIT)) over a flat HP base ·
  //   SPD = a one-time OPENING STRIKE (round(speed·SPD_ALPHA·matchup)) when you outspeed your target.
  const HP_FLAT = 120;                  // every combatant's base HP (survivability comes from Guard mitigation)
  const MIT = 0.6;                      // Guard: each incoming hit reduced by round(guard · MIT)
  const FOC_FLAT = 1.2;                 // Focus: flat per-hit damage, matchup-independent
  const SPD_ALPHA = 0.5;                // Speed: opening-strike scale
  const HPR = 2.2, K = 10, ESPD = 4;    // enemy hp/atk ratio · add-level offset (tier−K) · enemy fixed speed

  function heroCombatant(hero, collected){
    const s = H.effectiveStats(hero, collected || {});
    return { pow: s.power, grd: s.guard, spd: s.speed, foc: s.focus, hp: HP_FLAT, type: hero.type };
  }
  function enemyCombatant(budget, type){
    // foes derive ATK (pow) + HP from their budget; no Guard/Focus, fixed low speed
    return { pow: Math.sqrt(budget / HPR), grd: 0, spd: ESPD, foc: 0, hp: Math.sqrt(budget * HPR), type: type };
  }
  // Best N-hero team vs a foe type: the N heroes maximising rating × matchup (the team type-counter).
  function bestTeamVs(collected, n, foeType){
    return H.HEROES
      .map(h => ({ h: h, s: H.rating(h, collected) * H.matchup(h.type, foeType) }))
      .sort((a, b) => b.s - a.s).slice(0, n)
      .map(x => heroCombatant(x.h, collected));
  }

  // Pure deterministic sim. heroes/foes = combatant arrays. Returns the outcome.
  // `recordLog` (T90): when true, also returns `units` (the starting roster with
  // max HP) and a turn-by-turn `log` of every strike — purely additive, the
  // outcome is byte-identical (same code path), so the watchable playout can
  // replay the EXACT sim with no extra RNG. Off by default (calibration/teamBattle
  // run thousands of sims at load — no log overhead unless asked).
  function simulateTeams(heroes, foes, recordLog){
    const all = heroes.map((c, i) => ({ pow:c.pow, grd:c.grd, spd:c.spd, foc:c.foc, hp:c.hp, type:c.type, side:0, ord:i }))
      .concat(foes.map((c, i) => ({ pow:c.pow, grd:c.grd, spd:c.spd, foc:c.foc, hp:c.hp, type:c.type, side:1, ord:100 + i })));
    const order = all.slice().sort((a, b) => b.spd - a.spd || a.ord - b.ord);
    const units = recordLog ? all.map(c => ({ side:c.side, ord:c.ord, type:c.type, maxHp:c.hp })) : null;
    const log = recordLog ? [] : null;
    const pickTgt = actor => { const fa = all.filter(c => c.side !== actor.side && c.hp > 0); if(!fa.length) return null;
      return fa.sort((x, y) => H.matchup(actor.type, y.type) - H.matchup(actor.type, x.type) || x.hp - y.hp || x.ord - y.ord)[0]; };
    // resolve one hit: raw offense − target Guard mitigation, min 1 through. Records the playout flags.
    const resolve = (actor, tgt, raw, mu, roundN, open) => {
      const mit = Math.round(tgt.grd * MIT), pre = Math.round(raw);
      const dmg = Math.max(1, pre - mit);
      tgt.hp -= dmg;
      if(log) log.push({ round:roundN, open:!!open, aSide:actor.side, aOrd:actor.ord, tSide:tgt.side, tOrd:tgt.ord,
        dmg:dmg, tHp:Math.max(0, tgt.hp), ko:tgt.hp <= 0, adv: mu > 1, blocked: mit > 0 && mit >= pre * 0.5 });
    };
    // SPEED — one-time opening strike for any hero (side 0) that outspeeds its target
    for(const actor of order){
      if(actor.side !== 0 || actor.hp <= 0) continue;
      const tgt = pickTgt(actor); if(!tgt || actor.spd <= tgt.spd) continue;
      const mu = H.matchup(actor.type, tgt.type);
      resolve(actor, tgt, actor.spd * SPD_ALPHA * mu, mu, 0, true);
    }
    let guard = 0;
    const aliveOn = side => all.some(c => c.side === side && c.hp > 0);
    while(aliveOn(0) && aliveOn(1) && guard < 4000){
      guard++;
      for(const actor of order){
        if(actor.hp <= 0) continue;
        const tgt = pickTgt(actor);
        if(!tgt) break;
        const mu = H.matchup(actor.type, tgt.type);
        resolve(actor, tgt, Math.round(actor.pow * mu) + Math.round(actor.foc * FOC_FLAT), mu, guard, false);
      }
    }
    const res = {
      win: all.some(c => c.side === 0 && c.hp > 0),
      heroesAlive: all.filter(c => c.side === 0 && c.hp > 0).length,
      foesAlive: all.filter(c => c.side === 1 && c.hp > 0).length,
      rounds: guard
    };
    if(recordLog){ res.units = units; res.log = log; }
    return res;
  }

  // ---- re-calibrated enemy-team curve (computed at load, so it auto-scales as
  // content grows — T58 playbook). Per-tier FOE budget = min(geometric ramp,
  // suffix-min envelope of the best advantage-team product × CAPF) so no tier is
  // gated behind its own loot; the ramp scale is pinned so a SINGLE starter hero
  // clears tiers 1–5; the final tier is pinned between the near-full and the
  // 85%-loadout edges so the top falls ONLY to a near-full collection.
  const FOE_BUDGET = (function calibrateTeamCurve(){
    // REBALANCED (arena balance pass — tools/analyze-arena.js). The old
    // min(lb0·LG^n, capEnv·CAPF, fracGuard·CAPF) FLATLINED the foe budget across tiers ~80–119 (a
    // plateau) and was so compressed (CAPF=0.07) that ONE topic cleared ~57 of 120 tiers. New shape: a
    // STEEP-EARLY ramp from a tier-1 FLOOR to a near-full-reachable WALL across tiers 1..119 (no
    // plateau); the boss (120) is pinned below. Tuned so depth tracks collection (1 topic ≈ 10 tiers,
    // full ≈ 120). Monotonic by construction (FLOOR ≤ WALL, STEEP > 0). `analyze-arena.js` validates it.
    const FLOOR = 300;       // tier-1 foe budget (tiers 1..5 trivial for your first heroes)
    const WALL = 240000;     // tier-119 foe budget — near-full + accrued loot just clears it
    const STEEP = 0.18;      // early-game steepness on normalized tier position (lower = steeper early)
    const nearFull = {}; DRILL_IDS.forEach(id => nearFull[id] = true);
    for(let k = 1; k < TIER_COUNT; k++) lootByTier[k].forEach(id => nearFull[id] = true);  // drill + loot 1..119
    const fb = []; for(let n = 1; n <= TIER_COUNT; n++){
      if(n === TIER_COUNT){ fb.push(0); continue; }                         // boss slot — pinned below
      const x = (n - 1) / (TIER_COUNT - 2);                                 // 0..1 over tiers 1..119
      fb.push(FLOOR * Math.pow(WALL / FLOOR, Math.pow(x, STEEP)));
    }
    // final tier 120: place between the near-full edge and the 85%-loadout edge
    const fType = TIERS[TIER_COUNT - 1].type;
    const subset = frac => { const ids = Object.keys(nearFull); const o = {}; ids.slice(0, Math.floor(ids.length * frac)).forEach(id => o[id] = true); return o; };
    // edge = the highest main-foe budget at which a FIXED trio still wins. The trio
    // is precomputed ONCE per loadout (bestTeamVs walks rating() over the whole
    // collectible pool — the costly part), so only the cheap 3v3 sim runs inside the
    // search. Auto-EXPAND the upper bound until the trio actually loses, so the
    // binary search genuinely BRACKETS the edge (a fixed ceiling clamped strong
    // loadouts to a tie, collapsing eFull≈eSub and letting ≤85% over-win).
    const edgeOf = comb => { const winsAt = m => { const t = fb.slice(); t[TIER_COUNT - 1] = m;
        return simulateTeams(comb, enemyTeamFromBudget(t, TIER_COUNT)).win; };
      let elo = 1, ehi = Math.max(2, fb[TIER_COUNT - 1]);
      while(winsAt(ehi) && ehi < 1e15) ehi *= 2;
      for(let it = 0; it < 50; it++){ const m = (elo + ehi) / 2; if(winsAt(m)) elo = m; else ehi = m; } return elo; };
    const eFull = edgeOf(bestTeamVs(nearFull, 3, fType));
    // The greedy best-team heuristic is NON-MONOTONE near the boss (as the loadout
    // grows, the top-rated trio can swap in a differently-typed hero that fares
    // worse, so edge(fraction) zig-zags). A few fixed samples can therefore miss the
    // strongest sub-near-full loadout and leave it over-winning the top tier. Sweep a
    // per-percent grid of sub-near-full fractions and pin ABOVE the STRONGEST of
    // them, so EVERY partial loadout loses (the top demands near-full) while the
    // genuine near-full collection — whose top trio is strongest — still wins.
    let eSub = 0; for(let p = 50; p <= 96; p++) eSub = Math.max(eSub, edgeOf(bestTeamVs(subset(p / 100), 3, fType)));
    fb[TIER_COUNT - 1] = (eFull + Math.min(eSub, eFull)) / 2;   // near-full wins; every ≤96% partial loses
    return fb;
  })();
  // The enemy team for a tier from a foe-budget array: the tier foe + 2 weaker
  // adds at level max(1, tier−K) (near-trivial at low tiers; scale with the tier).
  function enemyTeamFromBudget(fb, n){
    const aL = Math.max(1, n - K);
    return [ enemyCombatant(fb[n - 1], TIERS[n - 1].type),
             enemyCombatant(fb[aL - 1], TYPES[n % 3]),
             enemyCombatant(fb[aL - 1], TYPES[(n + 1) % 3]) ];
  }
  // Public: the enemy team a tier fields (for display in T89).
  function enemyTeam(n){ return enemyTeamFromBudget(FOE_BUDGET, n); }
  // Public: display metadata for the 3 foes a tier fields (names/types/source
  // tier) so the T89 UI can show + sprite the whole enemy team. Mirrors
  // enemyTeamFromBudget's roster (the tier foe + 2 weaker adds at tier−K), in the
  // SAME order, so the displayed line-up matches what the sim actually fights.
  function enemyTeamMeta(n){
    const aL = Math.max(1, n - K), foe = TIERS[n - 1], add = TIERS[aL - 1];
    return [
      { role: "foe", name: foe.name,       type: TIERS[n - 1].type,   tierN: n  },
      { role: "add", name: add.name,       type: TYPES[n % 3],        tierN: aL },
      { role: "add", name: add.name,       type: TYPES[(n + 1) % 3],  tierN: aL }
    ];
  }
  // Public: resolve a 1–3 hero party vs a tier's enemy team (deterministic).
  function teamBattle(heroes, tier, collected){
    const list = (Array.isArray(heroes) ? heroes : [heroes]).slice(0, 3)
      .map(h => heroCombatant((typeof h === "string") ? H.byId(h) : h, collected || {}));
    const tierObj = (typeof tier === "number") ? byTier(tier) : tier;
    const res = simulateTeams(list, enemyTeamFromBudget(FOE_BUDGET, tierObj.n));
    return { win: res.win, heroesAlive: res.heroesAlive, foesAlive: res.foesAlive, rounds: res.rounds, tier: tierObj.n };
  }
  // Public (T90): the SAME deterministic resolution as teamBattle, but with the
  // turn-by-turn `log` + the starting `units` (max HP) so the UI can replay the
  // fight. The {win,heroesAlive,foesAlive,rounds} fields MATCH teamBattle exactly
  // (identical sim) — the playout is a pure visualisation, never a re-roll.
  function teamBattleLog(heroes, tier, collected){
    const list = (Array.isArray(heroes) ? heroes : [heroes]).slice(0, 3)
      .map(h => heroCombatant((typeof h === "string") ? H.byId(h) : h, collected || {}));
    const tierObj = (typeof tier === "number") ? byTier(tier) : tier;
    const res = simulateTeams(list, enemyTeamFromBudget(FOE_BUDGET, tierObj.n), true);
    res.tier = tierObj.n;
    return res;
  }

  // ---- public api ---------------------------------------------------------
  function byTier(n){ return TIERS[n - 1] || null; }
  function tierLoot(n){ return (lootByTier[n] || []).slice(); }
  // The 10 themed tier-regions (12 tiers each); label = the enemy band name.
  function tierRegion(n){ return Math.floor((n - 1) / REGION_SIZE); }
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
    TIERS, TIER_COUNT, REGION_SIZE,
    byTier, tierLoot, tierRegion, regionLabel, canAttempt, currentTier,
    teamBattle, teamBattleLog, enemyTeam, enemyTeamMeta, simulateTeams, heroCombatant,   // T88 — 3v3 sim; T89 — enemyTeamMeta; T90 — teamBattleLog (watchable playout)
    matchup: H.matchup, beats: H.beats
  };
})();
