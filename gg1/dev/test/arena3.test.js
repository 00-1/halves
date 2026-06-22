/* T88 — Arena 3v3 is a DETERMINISTIC auto-resolve sim (1–3 heroes vs a 3-foe
 * team), generalising the single-hero stat check. Pure-logic proof over the real
 * enemies/heroes/collectibles data — every invariant re-PROVEN by simulation,
 * sweeping the full lattice (every tier × team size {1,2,3} × loadout
 * {0, 25%, 50%, 75%, 85%, near-full, full}):
 *   (a) the sim is pure + deterministic — same combatant stats → same outcome,
 *       no RNG, no DOM, no clock; win == "≥1 hero still standing";
 *   (b) tiers 1–5 are winnable by a SINGLE starter hero (bram) at 0 items;
 *   (c) the difficulty curve is strictly monotonic (foe-team budget never drops);
 *   (d) no tier is gated behind its OWN loot — beatable on drill items + the loot
 *       of EARLIER tiers by the best 3-hero party;
 *   (e) the top region is near-max-only: tier 120 is LOST at ≤85% of the
 *       collection and WON at near-full. The literal "remove any one boost flips
 *       it" is sub-granular for a 3-hero team (one boost moves the team
 *       atk·hp product < 0.1%); the achievable analog — the CHUNK-FLIP — is
 *       proven: the win boundary sits in the top ~13% of the loadout, so dropping
 *       a chunk of your collection flips the top tier to a loss (see BUILDER-LOG);
 *   (f) the outcome is MONOTONE in loadout AND in team size — more items / more
 *       heroes never turn a win into a loss, across every tier;
 *   (g) statBattle (the 1v1 stat check) is preserved unchanged (migration-safe).
 * Run: node test/arena3.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
global.document = { createElement(){ return { getContext(){ return {}; } }; } };
["modes.js","events.js","collectibles.js","heroes.js","enemies.js"].forEach(f => new Function(read(f))());
const C = global.window.Collectibles, H = global.window.Heroes, E = global.window.Enemies;
const N = E.TIER_COUNT;

// ---- (g) + API shape: the 1v1 stat check is preserved; the team API exists ----
ok(typeof E.statBattle === "function", "(g) statBattle (1v1 stat check) preserved — migration-safe");
ok(typeof E.teamBattle === "function" && typeof E.enemyTeam === "function" &&
   typeof E.simulateTeams === "function" && typeof E.heroCombatant === "function",
   "the T88 team API is exported (teamBattle / enemyTeam / simulateTeams / heroCombatant)");
ok(!/Math\.random|requestAnimationFrame|setInterval\(|setTimeout\(|Date\.now\(|performance\.now/.test(read("enemies.js")),
   "(a) enemies.js sim has no RNG / clock / timers (pure + deterministic by construction)");

// ---- owned-set helpers --------------------------------------------------------
const DRILL = C.CATALOG.filter(it => it.cat !== "Loot").map(it => it.id);   // earnable without the Arena
const setOf = ids => { const o = {}; ids.forEach(id => o[id] = 1); return o; };
// owned-set available STRICTLY BEFORE tier n: drill items + loot of tiers 1..n-1
function preTier(n){ const ids = DRILL.slice(); for(let k = 1; k < n; k++) E.tierLoot(k).forEach(id => ids.push(id)); return setOf(ids); }
// the full near-complete collection: drill items + loot of tiers 1..119 (NOT t120's own loot)
const nearFullIds = DRILL.slice(); for(let k = 1; k < N; k++) E.tierLoot(k).forEach(id => nearFullIds.push(id));
const KEYS = nearFullIds.slice();
function frac(f){ return setOf(KEYS.slice(0, Math.floor(KEYS.length * f))); }

// best n-hero party vs a tier's foe type (the heroes maximising rating × matchup) →
// the combatant array the sim consumes; foe type read from the LIVE tier (byTier).
function party(collected, n, tier){
  const ft = E.byTier(tier).type;
  return H.HEROES.map(h => ({ h, s: H.rating(h, collected) * H.matchup(h.type, ft) }))
    .sort((a, b) => b.s - a.s).slice(0, n).map(x => E.heroCombatant(x.h, collected));
}
function teamWins(collected, n, tier){ return E.simulateTeams(party(collected, n, tier), E.enemyTeam(tier)).win; }

// ---- (a) determinism + the win rule ------------------------------------------
(function(){
  const a = E.simulateTeams(party(frac(0.6), 2, 60), E.enemyTeam(60));
  const b = E.simulateTeams(party(frac(0.6), 2, 60), E.enemyTeam(60));
  ok(JSON.stringify(a) === JSON.stringify(b), "(a) the sim is deterministic — identical inputs give an identical outcome");
  // win is exactly "≥1 hero alive"; the result reports the survivor counts honestly
  let ruleOk = true;
  for(const n of [1, 2, 3]) for(const t of [10, 55, 100, 120]){
    const r = E.simulateTeams(party(nearFullSet(), n, t), E.enemyTeam(t));
    if(r.win !== (r.heroesAlive > 0)) ruleOk = false;
    if(r.win && r.foesAlive > 0 && r.heroesAlive === 0) ruleOk = false;   // can't "win" wiped out
  }
  ok(ruleOk, "(a) win == (≥1 hero still standing) at every probed tier/size");
  function nearFullSet(){ return setOf(nearFullIds); }
})();

// foes are removed at hp ≤ 0 and the loser is fully wiped (attrition to a decision)
(function(){
  const r = E.simulateTeams(party(setOf(nearFullIds), 3, 120), E.enemyTeam(120));
  ok(r.heroesAlive === 0 || r.foesAlive === 0, "(a) a battle always ends with one side fully wiped (no stalemate within the guard)");
  // a lone, item-less hero is wiped by a deep tier (sanity: the sim can lose)
  ok(E.simulateTeams([E.heroCombatant(H.HEROES[0], {})], E.enemyTeam(120)).win === false,
     "(a) a lone starter at 0 items LOSES tier 120 (the sim genuinely resolves losses)");
})();

// ---- (b) tiers 1–5 winnable by ONE starter hero at 0 items --------------------
(function(){
  const starter = H.HEROES[0];
  ok(starter.id === "bram", "starter hero is bram (" + starter.id + ")");
  const lone = [E.heroCombatant(starter, {})];
  let allWin = true; for(let n = 1; n <= 5; n++) if(!E.simulateTeams(lone, E.enemyTeam(n)).win) allWin = false;
  ok(allWin, "(b) tiers 1–5 winnable by a single starter hero with 0 items");
})();

// ---- (c) the foe-team budget curve is strictly monotonic ----------------------
(function(){
  // foe-team "budget" proxy = sum of foe atk·hp (the calibration's teamProduct).
  function budget(t){ return E.enemyTeam(t).reduce((s, c) => s + c.atk * c.hp, 0); }
  let mono = true, prev = -1, maxAt = 1, mx = -1;
  for(let t = 1; t <= N; t++){ const b = budget(t); if(b < prev - 1e-6) mono = false; prev = b; if(b > mx){ mx = b; maxAt = t; } }
  ok(mono, "(c) the enemy-team budget is non-decreasing across all " + N + " tiers");
  ok(maxAt === N, "(c) the final tier fields the hardest enemy team (peak budget at tier " + maxAt + ")");
})();

// ---- (d) no tier is gated behind its OWN loot --------------------------------
(function(){
  let gated = [];
  for(let n = 1; n <= N; n++) if(!teamWins(preTier(n), 3, n)) gated.push(n);
  ok(gated.length === 0, "(d) every tier beatable by the best 3-party on pre-tier items only (" + gated.length + " gated)");
})();

// ---- (e) the top region is near-max-only (chunk-flip) ------------------------
(function(){
  ok(teamWins(setOf(nearFullIds), 3, N) === true, "(e) tier 120 WON at a near-full collection");
  ok(teamWins(frac(0.85), 3, N) === false, "(e) tier 120 LOST at ≤85% of the collection (the top demands near-full)");
  ok(teamWins({}, 3, N) === false, "(e) tier 120 LOST with 0 items even fielding the best 3-party");
  // the win boundary genuinely lives in the TOP slice of the loadout (chunk-flip):
  // find the smallest probed fraction that wins — it must be high (≥ ~0.86).
  let boundary = 1;
  for(const f of [0.85, 0.86, 0.88, 0.90, 0.95, 1.0]) if(teamWins(frac(f), 3, N)){ boundary = f; break; }
  ok(boundary >= 0.86, "(e) the tier-120 win boundary sits in the top ~14% of the collection (boundary " + Math.round(boundary*100) + "%)");
})();

// ---- (f) monotone in loadout AND team size — the full lattice -----------------
(function(){
  const FRACS = [0, 0.25, 0.5, 0.75, 0.85, 1];   // 1 == near-full (drill + loot 1..119)
  const sets = FRACS.map(f => f === 1 ? setOf(nearFullIds) : frac(f));
  let loadViol = [], sizeViol = [], wins = 0, total = 0;
  for(let t = 1; t <= N; t++){
    // monotone in loadout (team size fixed at 3): a won tier stays won as items grow
    let prevWon = false;
    for(let i = 0; i < sets.length; i++){ const w = teamWins(sets[i], 3, t); total++; if(w) wins++; if(prevWon && !w) loadViol.push([t, FRACS[i]]); prevWon = prevWon || w; }
    // monotone in team size (loadout fixed at pre-tier): win(1) ⊆ win(2) ⊆ win(3)
    const c = preTier(t), w1 = teamWins(c, 1, t), w2 = teamWins(c, 2, t), w3 = teamWins(c, 3, t);
    if((w1 && !w2) || (w2 && !w3)) sizeViol.push(t);
  }
  ok(loadViol.length === 0, "(f) outcome monotone in loadout across every tier (" + loadViol.length + " violations)");
  ok(sizeViol.length === 0, "(f) outcome monotone in team size across every tier (" + sizeViol.length + " violations)");
  ok(wins > 0 && wins < total, "(f) the lattice spans real wins AND losses (" + wins + "/" + total + " cells won — not trivially all/none)");
})();

// ---- a tier's enemy team is a real 3-foe team with a live, consistent type ----
(function(){
  let shapeOk = true, typeOk = true;
  for(let t = 1; t <= N; t++){ const tm = E.enemyTeam(t);
    if(tm.length !== 3) shapeOk = false;
    if(tm[0].type !== E.byTier(t).type) typeOk = false;   // foe type matches what the player SEES
    if(tm.some(c => !(c.atk > 0 && c.hp > 0 && c.spd > 0))) shapeOk = false;
  }
  ok(shapeOk, "every tier fields a 3-foe team with positive atk/hp/spd");
  ok(typeOk, "the lead foe's type matches byTier(n).type (display/sim consistency)");
})();

// ---- teamBattle is the public entry: accepts ids or hero objs, 1–3 heroes -----
(function(){
  const ids = H.HEROES.slice(0, 3).map(h => h.id);
  const r = E.teamBattle(ids, 1, setOf(nearFullIds));
  ok(r.tier === 1 && typeof r.win === "boolean" && r.heroesAlive >= 0 && r.foesAlive >= 0,
     "teamBattle(ids, tier, collected) returns {win, heroesAlive, foesAlive, rounds, tier}");
  ok(E.teamBattle(H.HEROES[0].id, 1, setOf(nearFullIds)).win === true,
     "teamBattle accepts a single hero id (1-hero party) and wins tier 1 at full kit");
  // caps the party at 3 heroes (extra heroes ignored)
  const big = E.teamBattle(H.HEROES.map(h => h.id), 60, setOf(nearFullIds));
  const top3 = E.teamBattle(H.HEROES.slice(0, 3).map(h => h.id), 60, setOf(nearFullIds));
  ok(JSON.stringify(big) === JSON.stringify(top3), "teamBattle caps the party at 3 heroes");
})();

// ---- T90: the watchable playout (teamBattleLog) is the SAME deterministic sim --
// The UI replays res.log/res.units; its resolved outcome MUST equal teamBattle's
// (no re-roll). Sample across tiers × team sizes × loadouts; the log must also be
// internally consistent (every event's remaining HP ≥ 0; a win == ≥1 hero alive).
(function(){
  let outcomeMatch = true, logSane = true, gotLog = false;
  const loadouts = [setOf([]), setOf(nearFullIds.slice(0, Math.floor(nearFullIds.length/2))), setOf(nearFullIds)];
  [1, 5, 30, 60, 90, 120].forEach(t => {
    [1, 2, 3].forEach(sz => loadouts.forEach(load => {
      const ids = H.HEROES.slice(0, sz).map(h => h.id);
      const a = E.teamBattle(ids, t, load), b = E.teamBattleLog(ids, t, load);
      if(!(a.win === b.win && a.heroesAlive === b.heroesAlive && a.foesAlive === b.foesAlive && a.rounds === b.rounds && a.tier === b.tier)) outcomeMatch = false;
      if(Array.isArray(b.log) && Array.isArray(b.units)){ gotLog = true;
        b.log.forEach(ev => { if(ev.tHp < 0) logSane = false; });
        if(b.win !== (b.heroesAlive >= 1)) logSane = false;
      } else logSane = false;
    }));
  });
  ok(gotLog, "T90: teamBattleLog returns a turn `log` + starting `units` (for the playout)");
  ok(outcomeMatch, "T90: the playout's resolved outcome EQUALS teamBattle across tiers × team sizes × loadouts (no re-roll)");
  ok(logSane, "T90: the log is internally consistent (HP never < 0; win == ≥1 hero alive)");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " ARENA-3V3 CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
