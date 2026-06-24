/* T233b — gold-earning parity gate. Mirrors earning-parity.test.js:
 *   (1) DRIFT: regenerate from gg1/dev source → must equal the committed JSON byte-for-byte.
 *   (2) SOURCE FIDELITY: the exact formula one-liners still live in main.js (so an [A] edit to
 *       the economy forces a regen, and the lifted source can't silently rot).
 *   (3) INVARIANTS: the formulas behave as the port relies on (monotonicity, boss ramp, bounds).
 * Run: node test/gold-parity.test.js */
"use strict";
const fs = require("fs"), path = require("path");
const { generate } = require("../tools/gold-export");

let fails = 0;
const ok = (cond, msg) => { if(!cond){ console.error("FAIL:", msg); fails++; } else console.log("ok:", msg); };
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

const { gold, vectors } = generate();

// (1) drift gate — committed files must match a fresh regenerate
ok(read("content/gg1/gold.json") === JSON.stringify(gold, null, 1) + "\n",
   "gold.json matches regenerate (no drift)");
ok(read("content/gg1/gold-vectors.json") === JSON.stringify(vectors) + "\n",
   "gold-vectors.json matches regenerate (no drift)");

// (2) source fidelity — the formulas the vectors encode are literally these strings in main.js
const main = read("gg1/dev/main.js");
[
  "function questionGold(target, dt, combo, mult){ return (2 + Math.max(0, Math.round(target - dt))) * (1 + combo * 0.1) * mult; }",
  "function roundBonusGold(score, rankIdx, mult){ return (score + rankIdx * 2) * mult; }",
  "function tierGold(n, mult){ return Math.round(10 * (1 + n / 10)) * mult; }",
  "const HOARD_G = 2.5;",
  "function hoardMult(col){ return Math.pow(HOARD_G, bossesDefeated(col)); }",
  "const GOLD_EMPTY = 500, GOLD_FULL = 1e15;",
  "return base * hoardMult(col);",
].forEach(s => ok(main.includes(s), "main.js still contains: " + s.slice(0, 48) + "…"));

// (3) behavioural invariants the port leans on
const qg = vectors.questionGold, gm = vectors.goldMult;
ok(qg.every(v => v.gold > 0), "questionGold always positive (min 2×mult floor)");
ok(qg.filter(v => v.target === 4 && v.combo === 0 && v.mult === 1)
     .every(v => v.gold === 2 + Math.max(0, Math.round(4 - v.dt))),
   "questionGold base (combo0,mult1) = 2 + max(0,round(target-dt))");
// faster (smaller dt) never pays less than slower at equal combo/mult
for(const target of [3.5, 4]) for(const combo of [0, 10]) for(const mult of [1, 2.5]){
  const row = qg.filter(v => v.target === target && v.combo === combo && v.mult === mult)
                .sort((a, b) => a.dt - b.dt);
  ok(row.every((v, i) => i === 0 || v.gold <= row[i - 1].gold), `questionGold non-increasing in dt (t${target} c${combo} m${mult})`);
}
// goldMult: empty = 1; strictly grows with the boss count via the 2.5^bosses ramp
ok(gm.find(v => v.label === "empty").goldMult === 1, "goldMult(empty) === 1");
const byBoss = gm.slice().sort((a, b) => a.counts.bosses - b.counts.bosses);
ok(gm.find(v => v.label === "allBosses").counts.bosses === gold.tierCount / gold.regionSize,
   "allBosses = every region boss (10)");
// reconstruct goldMult from the published count-formula → must equal the lifted output (1e-6 rel)
const W = gold.multWeights;
ok(gm.every(v => {
  const base = 1 + v.counts.items * W.item + v.counts.mastered * W.mastery
             + v.counts.heroes * W.hero + v.counts.tiers * W.tier;
  const expect = base * Math.pow(gold.HOARD_G, v.counts.bosses);
  return Math.abs(expect - v.goldMult) <= 1e-6 * Math.max(1, Math.abs(v.goldMult));
}), "goldMult == count-formula(items,mastered,heroes,tiers,bosses) for every col");
// hoardLevel bounded [0,1], 0 below GOLD_EMPTY, 1 at GOLD_FULL
const hl = vectors.hoardLevel;
ok(hl.every(v => v.level >= 0 && v.level <= 1), "hoardLevel in [0,1]");
ok(hl.find(v => v.gold === 499).level === 0 && hl.find(v => v.gold === gold.GOLD_FULL).level === 1,
   "hoardLevel: 0 below GOLD_EMPTY, 1 at GOLD_FULL");

// roundGold composition: the live combo (combo++ on solve, =0 on skip) — the piece a post-hoc
// solved-index combo gets WRONG. Prove the skip-reset directly.
const rg = vectors.roundGold;
const qg1 = (target, dt, combo, mult) => (2 + Math.max(0, Math.round(target - dt))) * (1 + combo * 0.1) * mult;
ok(rg.length > 0, "roundGold composition vectors present");
// [1.0,"skip",1.0] must equal TWO combo-1 solves (skip resets) — NOT combo 1 then 2.
for(const t of [3.5, 4]) for(const m of [1, 2.5]){
  const v = rg.find(r => r.target === t && r.mult === m && r.seq.length === 3 && r.seq[1] === "skip");
  ok(Math.abs(v.total - 2 * qg1(t, 1.0, 1, m)) < 1e-9,
     `roundGold skip-reset: [solve,skip,solve] = 2×combo1 (t${t} m${m})`);
}
// a no-skip sequence must equal the running-combo (i+1) sum — the case both impls agree on.
for(const t of [3.5, 4]) for(const m of [1, 2.5]){
  const v = rg.find(r => r.target === t && r.mult === m && r.seq.length === 5 && !r.seq.includes("skip"));
  const want = v.seq.reduce((s, dt, i) => s + qg1(t, dt, i + 1, m), 0);
  ok(Math.abs(v.total - want) < 1e-9, `roundGold no-skip = Σ combo(i+1) (t${t} m${m})`);
}

console.log(fails ? `\n${fails} FAIL` : "\nALL GOLD PARITY CHECKS PASS");
process.exit(fails ? 1 : 0);
