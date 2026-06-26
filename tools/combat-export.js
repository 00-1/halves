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
    _resolution: "teamBattle(party[1..3], tier, collected): each hero → combatant {pow:power, grd:guard, spd:speed, " +
      "foc:focus, hp:HP_FLAT}; foes = combat.enemyTeams[tier] (grd=0, foc=0, hp/pow from budget). simulateTeams: order " +
      "by spd desc, ord asc (party 0..2, foes 100..102). (1) OPENING STRIKE: each HERO (side 0) that OUTSPEEDS its " +
      "target deals ONE hit of raw=round(speed·SPD_ALPHA·matchup). (2) Then rounds: every alive actor (that order) " +
      "targets the other side by max matchup(type)→lowest hp→lowest ord, dealing dmg = max(1, [round(pow·matchup) + " +
      "round(foc·FOC_FLAT)] − round(tgt.grd·MIT)). The opening uses its raw in place of the [pow/foc] bracket. Repeat " +
      "until one side empty or guard 4000. Result {win=any hero alive, heroesAlive, foesAlive, rounds}. Each log entry " +
      "adds {open, adv:matchup>1, blocked:mitigation≥half} for the playout. NO RNG.",
    _onWin: "main.js finishBattle: grant tier:<n> + combat.loot[n] (the loot ids) into collected, evaluate collector/" +
      "meta milestones, earn = tierGold(n, goldMult(col)) (see gold.json), earnGold crosses wealth. region cleared " +
      "when a boss (n % regionSize === 0) falls.",
    constants: { tierCount: TC, regionSize: RS, types: ["Brawn", "Arcane", "Cunning"],
      matchup: { same: 1.0, advantage: 1.5, disadvantage: 0.6 },                 // beats: Brawn>Cunning>Arcane>Brawn
      // COMBAT (each stat one role): PWR=damage·matchup · FOC=flat damage (matchup-independent) · GRD=mitigation · SPD=opening strike
      combat: { HP_FLAT: 120, MIT: 0.6, FOC_FLAT: 1.2, SPD_ALPHA: 0.5,
        hero: "{pow:power, grd:guard, spd:speed, foc:focus, hp:HP_FLAT}",
        damage: "max(1, round(pow*matchup) + round(foc*FOC_FLAT) - round(target.grd*MIT))",
        opening: "a hero that outspeeds its target → one hit of round(speed*SPD_ALPHA*matchup), then mitigated" },
      rating: "power*1.0 + focus*0.8 + speed*0.5 + guard*0.3   (the auto party-picker's heuristic only; NOT the sim)" },
    // unlock = a tiny serialisable spec (hasKey | countPrefix | keyMatch) over collected keys.
    // B compiles it the same way (heroes.js compileUnlock) so the Arena fields only UNLOCKED heroes.
    heroes: H.HEROES.map(h => ({ id: h.id, type: h.type, base: h.base, unlockHint: h.unlockHint, unlock: h.unlock })),
    unlockKinds: "hasKey:{key} present · countPrefix:{prefix,min} ≥min keys start with prefix · " +
      "keyMatch:{prefix,suffix,min} ≥min keys start-with prefix AND end-with suffix with ≥1 char between",
    // effectiveStats(hero,col) = hero.base + Σ boost.amount over OWNED items whose boost.hero === hero.id, per stat.
    // The 2352 DRILL boosts already live in collectibles.json (`catalog[].boost`); combat.json adds ONLY the LOOT
    // boosts (loot is granted by Arena wins, so it's absent from the collectibles catalogue). Merge both maps.
    lootBoosts: C.CATALOG.filter(it => /^loot:/.test(it.id) && it.boost)
      .map(it => ({ id: it.id, hero: it.boost.hero, stat: it.boost.stat, amount: it.boost.amount })),
    // the fixed 120-tier ladder + each tier's 3 enemy combatants (pow/grd/spd/foc/hp/type, FULL precision) + loot ids
    tiers: [], enemyTeams: {}, loot: {},
  };
  for(let n = 1; n <= TC; n++){
    const t = E.byTier(n);
    combat.tiers.push({ n, name: t.name, type: t.type, boss: n % RS === 0 });
    combat.enemyTeams[n] = E.enemyTeam(n).map(c => ({ pow: c.pow, grd: c.grd, spd: c.spd, foc: c.foc, hp: c.hp, type: c.type }));
    combat.loot[n] = E.tierLoot(n);
  }

  // ---- (2) parity VECTORS (from the live sim) --------------------------------
  const vectors = { heroCombatant: [], effectiveStats: [], heroUnlock: [], teamBattle: [], teamBattleLog: null };

  // heroUnlock — isHeroUnlocked over a battery of collected states that toggle EACH
  // hero's spec on/off (incl. count boundaries + the keyMatch empty-middle reject), so
  // B's Rust spec-interpreter proves byte-identical gating. `collected` keys → presence.
  const UNLOCK_BATTERY = [
    ["empty", {}],
    ["init1", {"init:a":1}],                                          // bram
    ["init2", {"init:a":1,"init:b":1}],                              // still no greta (needs 3)
    ["init3", {"init:a":1,"init:b":1,"init:c":1}],                   // bram + greta
    ["mastery", {"mastery:fractions":1}],                            // tovar
    ["darkwizard", {"rank:darkwizard":1}],                          // mo
    ["collector25", {"collector:25":1}],                            // wisp
    ["flawless2", {"flawless:a":1,"flawless:b":1}],                 // still no mira (needs 3)
    ["flawless3", {"flawless:a":1,"flawless:b":1,"flawless:c":1}],  // mira
    ["one100", {"topics:one100":1}],                               // nim
    ["archmage", {"rank:archmage":1}],                             // zeph
    ["speedWrongBracket", {"speed:add:2":1}],                      // NOT pip (suffix :2)
    ["speedEmptyMiddle", {"speed::3":1}],                          // NOT pip (no char between)
    ["speedLightning", {"speed:add:3":1}],                         // pip
    ["allmodes", {"meta:allmodes":1}],                            // vex
    ["collector75", {"collector:75":1}],                          // sela
    ["tier10", {"tier:10":1}],                                    // roon
    ["mixed", {"init:a":1,"init:b":1,"init:c":1,"rank:archmage":1,"tier:10":1,"speed:mul:3":1}],
  ];
  for(const [label, col] of UNLOCK_BATTERY)
    vectors.heroUnlock.push({ label, collected: col, unlocked: H.HEROES.filter(h => H.isHeroUnlocked(h, col)).map(h => h.id) });

  // heroCombatant — the combatant a hero's effective stats produce (pow/grd/spd/foc carry through; hp is flat)
  for(const s of [{power:14,guard:12,speed:6,focus:6},{power:18,guard:8,speed:7,focus:5},
                  {power:7,guard:6,speed:10,focus:15},{power:11,guard:8,speed:17,focus:7},{power:0,guard:0,speed:0,focus:0}])
    vectors.heroCombatant.push({ stats: s, combatant: { pow: s.power, grd: s.guard, spd: s.speed, foc: s.focus, hp: 120 } });

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
  // full turn-by-turn logs so B can prove simulateTeams STEP-BY-STEP (not just the headline) across
  // diverse shapes — opening strikes, a boss, a loss, region 5, single-hero, all-types — so a per-strike
  // bug (targeting / order / mitigation rounding) that leaves the headline unchanged can't slip through.
  const logCase = (party, tier, kw) => { const r = E.teamBattleLog(party, tier, colFor(kw));
    return { party, tier, own: kw, units: r.units, log: r.log, win: r.win, heroesAlive: r.heroesAlive, foesAlive: r.foesAlive, rounds: r.rounds }; };
  vectors.teamBattleLogs = [
    logCase(["bram","greta","mo"], 30, "drillAll"),     // baseline mixed mid-tier
    logCase(["pip","vex","roon"], 12, "full"),          // fast Cunning party → opening strikes fire
    logCase(["bram","wisp","pip"], 66, "drillAll"),      // region 5, all three types
    logCase(["bram"], 60, "empty"),                      // single weak hero deep → a LOSS log
    logCase(["wisp","mira","zeph"], 120, "full"),        // full party vs the final boss
  ];
  vectors.teamBattleLog = vectors.teamBattleLogs[0];     // back-compat: the original single fixture

  return { combat, vectors };
}

if(require.main === module){
  const { combat, vectors } = generate();
  fs.writeFileSync(path.join(__dirname, "..", "content", "gg1", "combat.json"), JSON.stringify(combat, null, 1) + "\n");
  fs.writeFileSync(path.join(__dirname, "..", "content", "gg1", "combat-vectors.json"), JSON.stringify(vectors) + "\n");
  const n = vectors.heroCombatant.length + vectors.effectiveStats.length + vectors.heroUnlock.length + vectors.teamBattle.length + vectors.teamBattleLogs.length;
  console.log("wrote content/gg1/combat.json + combat-vectors.json — tiers", combat.tiers.length,
    "lootBoosts", combat.lootBoosts.length, "heroUnlock", vectors.heroUnlock.length, "vectors", n);
}
module.exports = { generate };
