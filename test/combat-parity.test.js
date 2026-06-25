/* T233b-combat parity gate. Like the other export tests:
 *   (1) DRIFT: regenerate from gg1/dev → equals the committed JSON byte-for-byte.
 *   (2) SOURCE FIDELITY: the sim's load-bearing formulas still live in enemies.js / heroes.js.
 *   (3) INVARIANTS: ladder monotonicity, combatant formula, matchup table, and the headline
 *       teamBattle outcomes are self-consistent + the turn-by-turn log replays to its result.
 * Run: node test/combat-parity.test.js */
"use strict";
const fs = require("fs"), path = require("path");
const { generate } = require("../tools/combat-export");

let fails = 0;
const ok = (c, m) => { if(!c){ console.error("FAIL:", m); fails++; } else console.log("ok:", m); };
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const { combat, vectors } = generate();

// (1) drift
ok(read("content/gg1/combat.json") === JSON.stringify(combat, null, 1) + "\n", "combat.json matches regenerate");
ok(read("content/gg1/combat-vectors.json") === JSON.stringify(vectors) + "\n", "combat-vectors.json matches regenerate");

// (2) source fidelity — the sim is generated from these exact lines
const en = read("gg1/dev/enemies.js"), he = read("gg1/dev/heroes.js");
[
  ["enemies.js heroCombatant", en, "return { pow: s.power, grd: s.guard, spd: s.speed, foc: s.focus, hp: HP_FLAT, type: hero.type };"],
  ["enemies.js dmg", en, "const dmg = Math.max(1, pre - mit);"],
  ["enemies.js offense", en, "Math.round(actor.pow * mu) + Math.round(actor.foc * FOC_FLAT)"],
  ["enemies.js mitigation", en, "const mit = Math.round(tgt.grd * MIT), pre = Math.round(raw);"],
  ["enemies.js opening", en, "resolve(actor, tgt, actor.spd * SPD_ALPHA * mu, mu, 0, true);"],
  ["enemies.js order", en, "all.slice().sort((a, b) => b.spd - a.spd || a.ord - b.ord)"],
  ["enemies.js combat consts", en, "const HP_FLAT = 120;"],
  ["heroes.js matchup", he, "function matchup(a, b){ return a === b ? 1.0 : (beats(a, b) ? 1.5 : 0.6); }"],
  ["heroes.js beats", he, 'function beats(a, b){ return (a==="Brawn"&&b==="Cunning") || (a==="Cunning"&&b==="Arcane") || (a==="Arcane"&&b==="Brawn"); }'],
  ["heroes.js ratingOf", he, "function ratingOf(s){ return s.power * 1.0 + s.focus * 0.8 + s.speed * 0.5 + s.guard * 0.3; }"],
  ["heroes.js isHeroUnlocked", he, "return !!h && h._unlock(collected || {});"],
  ["heroes.js compileUnlock keyMatch", he, 'if(spec.kind === "keyMatch"){'],
].forEach(([label, src, s]) => ok(src.includes(s), "source fidelity: " + label));

// (3a) ladder — 120 tiers, foe budget NON-DECREASING (no easier-deeper tier), boss every 12th
const T = combat.tiers;
const budget = n => { const c = combat.enemyTeams[n][0]; return c.pow * c.pow + c.hp * c.hp; }; // monotone proxy on the lead foe
ok(T.length === 120, "120 tiers");
ok(T.every((t, i) => i === 0 || budget(t.n) >= budget(T[i - 1].n) - 1e-6), "foe budget is non-decreasing across the ladder (no easier-deeper tier)");
ok(T.every(t => (t.n % combat.constants.regionSize === 0) === t.boss), "boss flag === (n % regionSize === 0)");
ok(T.every(t => combat.constants.types.includes(t.type)), "every tier type is a valid type");
ok(T.every(t => !("def" in t)), "no vestigial 1v1 `def` field on tiers (fully 3v3)");

// (3b) heroCombatant — the combatant carries pow/grd/spd/foc through; hp is flat (HP_FLAT)
ok(vectors.heroCombatant.every(v => {
  const c = v.combatant;
  return c.pow === v.stats.power && c.grd === v.stats.guard && c.spd === v.stats.speed && c.foc === v.stats.focus && c.hp === 120;
}), "heroCombatant: {pow,grd,spd,foc} = stats, hp = HP_FLAT(120)");

// (3b2) heroUnlock — a LOCAL spec compiler (the Rust port mirror) reproduces the live
//       isHeroUnlocked over the whole battery, purely from the exported `unlock` specs.
const SPEC = {};
combat.heroes.forEach(h => { SPEC[h.id] = h.unlock; });
function unlockFromSpec(spec, col){
  if(spec.kind === "hasKey") return !!col[spec.key];
  if(spec.kind === "countPrefix"){ let n = 0; for(const k in col) if(k.indexOf(spec.prefix) === 0) n++; return n >= spec.min; }
  if(spec.kind === "keyMatch"){ const minLen = spec.prefix.length + spec.suffix.length + 1; let n = 0;
    for(const k in col){ if(k.length >= minLen && k.indexOf(spec.prefix) === 0 && k.slice(-spec.suffix.length) === spec.suffix){ if(++n >= spec.min) return true; } } return false; }
  throw new Error("unknown unlock kind: " + spec.kind);
}
ok(combat.heroes.every(h => h.unlock && ["hasKey","countPrefix","keyMatch"].includes(h.unlock.kind)),
   "every hero carries a serialisable unlock spec (hasKey|countPrefix|keyMatch)");
ok(vectors.heroUnlock.length >= 12, "heroUnlock battery present (" + vectors.heroUnlock.length + " states)");
ok(vectors.heroUnlock.every(v => {
  const got = combat.heroes.filter(h => unlockFromSpec(SPEC[h.id], v.collected)).map(h => h.id);
  return got.length === v.unlocked.length && got.every((id, i) => id === v.unlocked[i]);
}), "heroUnlock: the spec compiler reproduces live isHeroUnlocked for every battery state");
// the battery actually exercises each kind's edges (count boundary + keyMatch rejects)
const byLabel = l => vectors.heroUnlock.find(v => v.label === l);
ok(!byLabel("init2").unlocked.includes("greta") && byLabel("init3").unlocked.includes("greta"), "heroUnlock: greta gated at init: ≥3 (2 no, 3 yes)");
ok(!byLabel("speedWrongBracket").unlocked.includes("pip") && !byLabel("speedEmptyMiddle").unlocked.includes("pip") && byLabel("speedLightning").unlocked.includes("pip"),
   "heroUnlock: pip keyMatch needs prefix+suffix with a non-empty middle (speed:<x>:3)");

// (3c) effectiveStats monotone in ownership (more owned ⇒ each stat ≥) for every hero
for(const h of combat.heroes.map(x => x.id)){
  const e = k => vectors.effectiveStats.find(x => x.hero === h && x.own === k).stats;
  const [emp, dr, fu] = [e("empty"), e("drillAll"), e("full")];
  ok(["power","guard","speed","focus"].every(s => dr[s] >= emp[s] && fu[s] >= dr[s]) &&
     ["power","guard","speed","focus"].every(s => emp[s] === combat.heroes.find(x => x.id === h).base[s]),
     `effectiveStats(${h}): empty===base, non-decreasing empty≤drillAll≤full`);
}

// (3d) teamBattle outcomes self-consistent + a progression sanity
const TB = vectors.teamBattle;
ok(TB.every(r => r.win === (r.heroesAlive > 0)), "teamBattle: win iff a party hero survives");
ok(TB.every(r => r.win ? r.foesAlive === 0 : true) , "teamBattle: a win clears the foes");
ok(TB.every(r => r.rounds >= 1 && r.heroesAlive <= r.party.length), "teamBattle: rounds≥1, heroesAlive≤party size");
const t1full3 = TB.find(r => r.tier === 1 && r.own === "full" && r.party.length === 3);
ok(t1full3 && t1full3.win, "progression sanity: a full-collection 3-hero party beats tier 1");

// (3e) the turn-by-turn log replays to its reported result (each strike's tHp matches the
//      running hp, and the final alive counts reproduce {win,heroesAlive,foesAlive})
const L = vectors.teamBattleLog;
(function replay(){
  const hp = {}; L.units.forEach(u => hp[u.side + ":" + u.ord] = u.maxHp);
  let bookkept = true;
  for(const s of L.log){
    const k = s.tSide + ":" + s.tOrd; hp[k] -= s.dmg;
    if(s.tHp !== Math.max(0, hp[k])) bookkept = false;
  }
  ok(bookkept, "log: every strike's tHp == running hp (clamped)");
  const heroesAlive = L.units.filter(u => u.side === 0 && hp[u.side + ":" + u.ord] > 0).length;
  const foesAlive   = L.units.filter(u => u.side === 1 && hp[u.side + ":" + u.ord] > 0).length;
  ok(heroesAlive === L.heroesAlive && foesAlive === L.foesAlive && (heroesAlive > 0) === L.win,
     "log replay reproduces {win,heroesAlive,foesAlive}");
})();

console.log(fails ? `\n${fails} FAIL` : "\nALL COMBAT PARITY CHECKS PASS");
process.exit(fails ? 1 : 0);
