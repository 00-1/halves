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
  const ADV_MULT = 1.5;                            // advantage matchup multiplier

  // Difficulty ramp. `def` is min(geometric ramp, beatability cap). The ramp keeps
  // the early game gentle (beatable by the starter hero); for deep tiers the cap —
  // tied to the strongest hero you could field with pre-tier items — takes over so
  // the climb genuinely tracks your collection. (Balance pass lives in T25.)
  const DEF_BASE = 11;       // tier-1 ramp value
  const DEF_GROWTH = 1.051;  // per-tier geometric growth (retuned to spread over 120 tiers)
  const CAP_FRAC = 0.92;     // headroom under the theoretical max so wins don't need literal perfection

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
  // Pure stat check (Arena, T47): win iff effective power ≥ tier.def, where
  //   power = round( rating(hero, collected) × matchup(hero.type, tier.type) ).
  // No perf, no questions — the Arena is a payoff for what you've collected and
  // climbed, not another maths drill. This is exactly the old battlePower at
  // perf=1, so the T23/T43 def-calibration + buff-gating invariants are unchanged.
  function statBattle(hero, tier, collected){
    const heroObj = (typeof hero === "string") ? H.byId(hero) : hero;
    const rating = H.rating(heroObj, collected || {});
    const mu = H.matchup(heroObj.type, tier.type);
    const power = Math.round(rating * mu);
    return {
      win: power >= tier.def,
      power: power,
      rating: rating,
      matchup: mu,
      def: tier.def,
      hero: heroObj.id,
      tier: tier.n
    };
  }

  // ---- 3v3 team battle: deterministic auto-resolve sim (T88) ---------------
  // Generalises the single-hero stat check to a turn-based 1–3 vs 3 attrition
  // fight with ZERO RNG (same inputs → same result), so the difficulty curve is
  // re-derived and every invariant is re-proven by simulation (arena3.test.js).
  // statBattle (above) is preserved as the 1v1 stat check (migration-safe; the
  // live Arena still uses it until the team UI lands in T89).
  //
  // Combatant {atk, hp, spd, type}. Turn order by spd (fixed index tie-break). On
  // a turn the actor targets by a FIXED rule (best type-matchup; tie → lowest hp;
  // tie → index) and deals max(1, round(atk × matchup)); removed at hp ≤ 0; loop
  // until one side is wiped. Win = ≥1 hero alive. Monotone in atk/hp/team-size.
  const HB = 22, HG = 1.4, HPP = 0.5;   // hero combatant: hp = HB + guard·HG + power·HPP; atk = power + 0.8·focus
  const HPR = 2.2, K = 10, ESPD = 4;    // enemy hp/atk ratio · add level offset (tier−K) · enemy fixed speed
  const LG = 1.065, CAPF = 0.07;        // foe-budget ramp growth · cap fraction (enemy team ≪ beatable team product)

  function heroCombatant(hero, collected){
    const s = H.effectiveStats(hero, collected || {});
    return { atk: s.power + 0.8 * s.focus, hp: HB + s.guard * HG + s.power * HPP, spd: s.speed, type: hero.type };
  }
  function enemyCombatant(budget, type){
    return { atk: Math.sqrt(budget / HPR), hp: Math.sqrt(budget * HPR), spd: ESPD, type: type };
  }
  // Best N-hero team vs a foe type: the N heroes maximising rating × matchup (so
  // the team can field the type counter — the team analog of bestAdvRating).
  function bestTeamVs(collected, n, foeType){
    return H.HEROES
      .map(h => ({ h: h, s: H.rating(h, collected) * H.matchup(h.type, foeType) }))
      .sort((a, b) => b.s - a.s).slice(0, n)
      .map(x => heroCombatant(x.h, collected));
  }
  function teamProduct(team){ let a = 0, h = 0; for(const c of team){ a += c.atk; h += c.hp; } return a * h; }

  // Pure deterministic sim. heroes/foes = combatant arrays. Returns the outcome.
  // `recordLog` (T90): when true, also returns `units` (the starting roster with
  // max HP) and a turn-by-turn `log` of every strike — purely additive, the
  // outcome is byte-identical (same code path), so the watchable playout can
  // replay the EXACT sim with no extra RNG. Off by default (calibration/teamBattle
  // run thousands of sims at load — no log overhead unless asked).
  function simulateTeams(heroes, foes, recordLog){
    const all = heroes.map((c, i) => ({ atk:c.atk, hp:c.hp, spd:c.spd, type:c.type, side:0, ord:i }))
      .concat(foes.map((c, i) => ({ atk:c.atk, hp:c.hp, spd:c.spd, type:c.type, side:1, ord:100 + i })));
    const order = all.slice().sort((a, b) => b.spd - a.spd || a.ord - b.ord);
    const units = recordLog ? all.map(c => ({ side:c.side, ord:c.ord, type:c.type, maxHp:c.hp })) : null;
    const log = recordLog ? [] : null;
    let guard = 0;
    const aliveOn = side => all.some(c => c.side === side && c.hp > 0);
    while(aliveOn(0) && aliveOn(1) && guard < 4000){
      guard++;
      for(const actor of order){
        if(actor.hp <= 0) continue;
        const foesAlive = all.filter(c => c.side !== actor.side && c.hp > 0);
        if(!foesAlive.length) break;
        const tgt = foesAlive.sort((x, y) =>
          H.matchup(actor.type, y.type) - H.matchup(actor.type, x.type) || x.hp - y.hp || x.ord - y.ord)[0];
        const dmg = Math.max(1, Math.round(actor.atk * H.matchup(actor.type, tgt.type)));
        tgt.hp -= dmg;
        if(log) log.push({ round:guard, aSide:actor.side, aOrd:actor.ord, tSide:tgt.side, tOrd:tgt.ord,
          dmg:dmg, tHp:Math.max(0, tgt.hp), ko:tgt.hp <= 0 });
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
    const advProd = [];
    {
      const owned = {}; DRILL_IDS.forEach(id => owned[id] = true);
      for(let n = 1; n <= TIER_COUNT; n++){
        advProd.push(teamProduct(bestTeamVs(owned, 3, TIERS[n - 1].type)));
        lootByTier[n].forEach(id => owned[id] = true);
      }
    }
    const capEnv = advProd.slice();
    for(let i = capEnv.length - 2; i >= 0; i--) capEnv[i] = Math.min(capEnv[i], capEnv[i + 1]);
    const build = lb0 => { const fb = []; for(let n = 1; n <= TIER_COUNT; n++) fb.push(Math.min(lb0 * Math.pow(LG, n - 1), capEnv[n - 1] * CAPF)); return fb; };
    // owned-sets used for the early floor + final-tier calibration
    const bram = [heroCombatant(H.HEROES[0], {})];
    const nearFull = {}; DRILL_IDS.forEach(id => nearFull[id] = true);
    for(let k = 1; k < TIER_COUNT; k++) lootByTier[k].forEach(id => nearFull[id] = true);  // drill + loot 1..119
    const tEarly = (fb, n) => simulateTeams(bram, enemyTeamFromBudget(fb, n)).win;
    // pin lb0: max ramp scale at which one starter hero still clears tiers 1..5
    let lo = 1, hi = 400;
    for(let it = 0; it < 46; it++){ const mid = (lo + hi) / 2, fb = build(mid); let ok = true; for(let n = 1; n <= 5; n++) if(!tEarly(fb, n)) ok = false; if(ok) lo = mid; else hi = mid; }
    const fb = build(lo * 0.9);
    // final tier 120: place between the near-full edge and the 85%-loadout edge
    const fType = TIERS[TIER_COUNT - 1].type;
    const subset = frac => { const ids = Object.keys(nearFull); const o = {}; ids.slice(0, Math.floor(ids.length * frac)).forEach(id => o[id] = true); return o; };
    const edge = team => { let elo = fb[TIER_COUNT - 1] * 0.05, ehi = fb[TIER_COUNT - 1] * 30;
      for(let it = 0; it < 60; it++){ const m = (elo + ehi) / 2, t = fb.slice(); t[TIER_COUNT - 1] = m;
        if(simulateTeams(bestTeamVs(team, 3, fType), enemyTeamFromBudget(t, TIER_COUNT)).win) elo = m; else ehi = m; } return elo; };
    const eFull = edge(nearFull), e85 = edge(subset(0.85));
    fb[TIER_COUNT - 1] = (eFull + Math.min(e85, eFull)) / 2;   // near-full wins, ≤85% loses
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
    statBattle,
    teamBattle, teamBattleLog, enemyTeam, enemyTeamMeta, simulateTeams, heroCombatant,   // T88 — 3v3 sim; T89 — enemyTeamMeta; T90 — teamBattleLog (watchable playout)
    matchup: H.matchup, beats: H.beats
  };
})();
