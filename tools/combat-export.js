/* T233b-combat — export GG1's 3v3 ARENA battle system as data + parity vectors.
 * The live Arena is the deterministic T88 team sim (main.js finishBattle ← Enemies.teamBattle),
 * confirmed by the owner ("we use 3v3"). Vectors are generated from the LIVE sim (strongest
 * fidelity). DATA half = the fixed ladder/enemy-rosters/loot (B consumes, doesn't re-derive the
 * FOE_BUDGET calibration); LOGIC half (proven by vectors) = effectiveStats(base+boosts) →
 * heroCombatant → simulateTeams. Same "share DATA, prove with vectors" method as T229/T233.
 * Run:  node tools/combat-export.js   (writes content/gg1/combat*.json)
 * Test: require('./combat-export').generate() → {combat, vectors}  (drift gate). */
"use strict";
const fs = require("fs"), path = require("path");
const DEV = path.join(__dirname, "..", "gg1", "dev");

function build(){
  const window = {};
  window.Emblems = { draw(){}, has: () => false, list: () => [] };
  window.performance = { now: () => 0 };
  const load = n => new Function("window", fs.readFileSync(path.join(DEV, n + ".js"), "utf8"))(window);
  load("modes"); load("heroes"); load("events"); load("collectibles"); load("enemies");
  return { E: window.Enemies, H: window.Heroes, C: window.Collectibles };
}

function generate(){
  const { E, H, C } = build();
  const TC = E.TIER_COUNT, RS = E.REGION_SIZE;
  // NB: emit combatant stats at FULL f64 precision (no rounding) — the sim does
  // round(atk·matchup), so a truncated atk could round differently than the live value
  // and bake a divergent outcome. B parses the same f64 → identical sim.

  // ---- collected cols the battery reproduces by KEYWORD (B owns the same set) ----
  const allIds = C.CATALOG.map(it => it.id);
  const drillIds = allIds.filter(id => !/^loot:/.test(id)); // the 2352 collectibles (loot excluded)
  const colFor = kw => {
    const o = {};
    const ids = kw === "empty" ? [] : kw === "drillAll" ? drillIds : allIds; // "full" = every catalogue id
    ids.forEach(id => o[id] = { ts: 1 });
    return o;
  };
  const KWS = ["empty", "drillAll", "full"];

  // ---- (1) DATA — the fixed combat content B loads (not re-derived) ----------
  const combat = {
    _note: "GG1 3v3 Arena (main.js finishBattle ← Enemies.teamBattle, the T88 sim). DATA = ladder/enemyTeams/loot " +
      "(fixed, consume as-is — don't reproduce the FOE_BUDGET calibration). LOGIC proven by combat-vectors.json.",
    _resolution: "teamBattle(party[1..3], tier, collected): each party hero → heroCombatant(effectiveStats(hero," +
      "collected)); foes = combat.enemyTeams[tier]. simulateTeams: turn order = spd desc, ord asc (party ord 0..2, " +
      "foes ord 100..102); each round, every still-alive actor in that order picks a target among the OTHER side's " +
      "living units by max matchup(actor.type,tgt.type) → lowest hp → lowest ord, deals max(1, round(atk·matchup)); " +
      "repeat rounds until one side is empty or guard 4000. Result {win = any party alive, heroesAlive, foesAlive, " +
      "rounds = #rounds}. NO questions/RNG — pure payoff for what you've collected+climbed.",
    _onWin: "main.js finishBattle: grant tier:<n> + combat.loot[n] (the loot ids) into collected, evaluate collector/" +
      "meta milestones, earn = tierGold(n, goldMult(col)) (see gold.json), earnGold crosses wealth. region cleared " +
      "when a boss (n % regionSize === 0) falls.",
    constants: { tierCount: TC, regionSize: RS, types: ["Brawn", "Arcane", "Cunning"],
      matchup: { same: 1.0, advantage: 1.5, disadvantage: 0.6 },                 // beats: Brawn>Cunning>Arcane>Brawn
      hero: { HB: 22, HG: 1.4, HPP: 0.5, atk: "power + 0.8*focus", hp: "HB + guard*HG + power*HPP", spd: "speed" },
      rating: "power*1.0 + focus*0.8 + speed*0.5 + guard*0.3   (display/odds only; the sim uses combatant atk/hp)" },
    heroes: H.HEROES.map(h => ({ id: h.id, type: h.type, base: h.base, unlockHint: h.unlockHint })),
    // effectiveStats(hero,col) = hero.base + Σ boost.amount over OWNED items whose boost.hero === hero.id, per stat.
    // The 2352 DRILL boosts already live in collectibles.json (`catalog[].boost`); combat.json adds ONLY the LOOT
    // boosts (loot is granted by Arena wins, so it's absent from the collectibles catalogue). Merge both maps.
    lootBoosts: C.CATALOG.filter(it => /^loot:/.test(it.id) && it.boost)
      .map(it => ({ id: it.id, hero: it.boost.hero, stat: it.boost.stat, amount: it.boost.amount })),
    // the fixed 120-tier ladder + each tier's 3 enemy combatants (atk/hp/spd/type, FULL precision) + loot ids
    tiers: [], enemyTeams: {}, loot: {},
  };
  for(let n = 1; n <= TC; n++){
    const t = E.byTier(n);
    combat.tiers.push({ n, name: t.name, type: t.type, def: t.def, boss: n % RS === 0 });
    combat.enemyTeams[n] = E.enemyTeam(n).map(c => ({ atk: c.atk, hp: c.hp, spd: c.spd, type: c.type }));
    combat.loot[n] = E.tierLoot(n);
  }

  // ---- (2) parity VECTORS (from the live sim) --------------------------------
  const vectors = { heroCombatant: [], effectiveStats: [], teamBattle: [], teamBattleLog: null };

  // heroCombatant — pure formula proof: explicit stats → {atk,hp,spd} (no col)
  for(const s of [{power:14,guard:12,speed:6,focus:6},{power:18,guard:8,speed:7,focus:5},
                  {power:7,guard:6,speed:10,focus:15},{power:11,guard:8,speed:17,focus:7},{power:0,guard:0,speed:0,focus:0}])
    vectors.heroCombatant.push({ stats: s, atk: s.power + 0.8 * s.focus, hp: 22 + s.guard * 1.4 + s.power * 0.5, spd: s.speed });

  // effectiveStats — base + owned boosts, per hero per keyword col (proves the boost summation)
  for(const kw of KWS){ const col = colFor(kw);
    for(const h of H.HEROES) vectors.effectiveStats.push({ hero: h.id, own: kw, stats: H.effectiveStats(h, col) }); }

  // teamBattle headline — {win,heroesAlive,foesAlive,rounds} over parties × tiers × cols
  const PARTIES = [["bram"], ["bram","greta","mo"], ["wisp","mira","zeph"], ["pip","vex","roon"], ["bram","wisp","pip"]];
  const TIER_SAMPLE = [1,2,5,10,12,20,24,30,48,60,72,84,96,108,119,120];
  for(const kw of KWS){ const col = colFor(kw);
    for(const party of PARTIES) for(const n of TIER_SAMPLE){
      const r = E.teamBattle(party, n, col);
      vectors.teamBattle.push({ party, tier: n, own: kw, win: r.win, heroesAlive: r.heroesAlive, foesAlive: r.foesAlive, rounds: r.rounds });
    }
  }
  // one full turn-by-turn log so B can prove simulateTeams step-by-step
  vectors.teamBattleLog = (function(){
    const r = E.teamBattleLog(["bram","greta","mo"], 30, colFor("drillAll"));
    return { party: ["bram","greta","mo"], tier: 30, own: "drillAll",
      units: r.units, log: r.log, win: r.win, heroesAlive: r.heroesAlive, foesAlive: r.foesAlive, rounds: r.rounds };
  })();

  return { combat, vectors };
}

if(require.main === module){
  const { combat, vectors } = generate();
  fs.writeFileSync(path.join(__dirname, "..", "content", "gg1", "combat.json"), JSON.stringify(combat, null, 1) + "\n");
  fs.writeFileSync(path.join(__dirname, "..", "content", "gg1", "combat-vectors.json"), JSON.stringify(vectors) + "\n");
  const n = vectors.heroCombatant.length + vectors.effectiveStats.length + vectors.teamBattle.length + 1;
  console.log("wrote content/gg1/combat.json + combat-vectors.json — tiers", combat.tiers.length,
    "lootBoosts", combat.lootBoosts.length, "vectors", n);
}
module.exports = { generate };
