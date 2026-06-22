// Goblin Gold economy simulation — calibrate the T178 boss multiplier (g) + GOLD_FULL.
// Uses the REAL formulas from main.js. Assumptions are explicit constants (tune freely).
"use strict";
// ---- real formulas (main.js) ----
const questionGold = (tgt, dt, combo, mult) => (2 + Math.max(0, Math.round(tgt - dt))) * (1 + combo*0.1) * mult;
const roundBonusGold = (score, rankIdx, mult) => (score + rankIdx*2) * mult;
const tierGold = (n, mult) => Math.round(10*(1 + n/10)) * mult;
const baseMult = (items, mastered, heroes, tiers) => 1 + items*0.05 + mastered*0.5 + heroes*0.5 + tiers*1;
const SUF=["","K","M","B","T","Qa","Qi","Sx","Sp","Oc","No","Dc"];
function fmt(n){ if(n<1000) return Math.floor(n)+""; let t=Math.floor(Math.log10(n)/3); t=Math.min(t,SUF.length-1); const s=n/Math.pow(1000,t); return (s>=100?s.toFixed(0):s>=10?s.toFixed(1):s.toFixed(2))+SUF[t]; }

// ---- content sizes ----
const TOPICS=27, HEROES=12, TIERS=120, ITEMS=150;

// ---- player profiles: rounds/day, arena fights/day ----
const PROFILES={
  casual:    { rounds: 8,  fights: 1  },
  regular:   { rounds: 15, fights: 3  },
  dedicated: { rounds: 30, fights: 8  },
};
// ---- per-round play assumptions ----
const QPR=12, ACC=0.85, AVG_SPEED_BONUS=2, AVG_COMBO=5, AVG_SCORE=10;

// progression: fraction complete at day d (saturating ramps; full ~day 55-65)
const ramp = (d, full) => Math.min(1, d/full);
function progress(d){
  const m = Math.round(TOPICS  * ramp(d, 55));   // masteries
  const h = Math.round(HEROES  * ramp(d, 48));
  const it= Math.round(ITEMS   * ramp(d, 50));
  // arena tier advances with play, but the LAST region (tier>108) needs ~full collection
  const collFrac = ramp(d, 60);
  let tier = Math.min(TIERS, Math.round(TIERS * Math.min(collFrac*1.1, 1)));
  if(collFrac < 0.95) tier = Math.min(tier, 108);   // can't enter the Void Throne region until near-full
  return { m, h, it, tier, bosses: Math.floor(tier/12) };
}

function simulate(profileName, g, days){
  const P=PROFILES[profileName]; let gold=0; const snap={};
  for(let d=1; d<=days; d++){
    const pr=progress(d);
    const mult = baseMult(pr.it, pr.m, pr.h, pr.tier) * Math.pow(g, pr.bosses);
    // drill rounds
    for(let r=0;r<P.rounds;r++){
      let rg=0;
      for(let q=0;q<QPR;q++){ if(Math.random()<ACC) rg += questionGold(8, 8-AVG_SPEED_BONUS, Math.min(q,AVG_COMBO*2), mult); }
      rg += roundBonusGold(AVG_SCORE, 3, mult);
      gold += rg;
    }
    // arena fights (each clears ~its current tier)
    for(let f=0; f<P.fights; f++) gold += tierGold(pr.tier, mult);
    if([7,30,60,90,120].includes(d)) snap[d]=gold;
  }
  return snap;
}

for(const g of [1.8, 2.0, 2.2, 2.5]){
  console.log("\n===== boss multiplier g = "+g+"  (g^10 = ×"+Math.round(Math.pow(g,10))+" at full clear) =====");
  for(const pn of Object.keys(PROFILES)){
    const s=simulate(pn, g, 120);
    console.log(pn.padEnd(10)+" | d7 "+fmt(s[7]).padStart(7)+" | d30 "+fmt(s[30]).padStart(7)+" | d60 "+fmt(s[60]).padStart(7)+" | d90 "+fmt(s[90]).padStart(7)+" | d120 "+fmt(s[120]).padStart(7));
  }
}
