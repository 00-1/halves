/* How do the 4 hero stats (power/guard/speed/focus) + type actually feed the 3v3 battle?
 * Battle uses: atk=power+0.8*focus, hp=22+guard*1.4+power*0.5, spd=speed (turn order only),
 * matchup(type) x1.5/1.0/0.6 on damage. This measures the MARGINAL impact of each on real outcomes. */
"use strict";
const fs=require("fs"),path=require("path"),DEV="gg1/dev";
const window={};window.Emblems={draw(){},has:()=>false,list:()=>[]};window.performance={now:()=>0};
const load=n=>new Function("window",fs.readFileSync(path.join(DEV,n+".js"),"utf8"))(window);
["modes","heroes","events","collectibles","enemies"].forEach(load);
const C=window.Collectibles,H=window.Heroes,E=window.Enemies,MODES=window.MODES;
const TC=E.TIER_COUNT,HPR=2.2,ESPD=4,K=10,TYPES=["Brawn","Arcane","Cunning"];
const enemyComb=(b,t)=>({atk:Math.sqrt(b/HPR),hp:Math.sqrt(b*HPR),spd:ESPD,type:t});
const enemyTeam=(fb,n)=>{const aL=Math.max(1,n-K);return[enemyComb(fb[n-1],E.byTier(n).type),enemyComb(fb[aL-1],TYPES[n%3]),enemyComb(fb[aL-1],TYPES[(n+1)%3])];};
const liveFB=(()=>{const fb=[];for(let n=1;n<=TC;n++){const a=E.enemyTeam(n)[0].atk;fb.push(a*a*HPR);}return fb;})();
const unlocked=col=>H.HEROES.filter(h=>H.isHeroUnlocked(h,col));
const bestParty=(col,t)=>unlocked(col).map(h=>({h,s:H.rating(h,col)*H.matchup(h.type,t)})).sort((a,b)=>b.s-a.s).slice(0,3).map(x=>x.h.id);
// build combatant from effective stats, with an optional per-stat delta
const comb=(hero,col,d={})=>{const s=H.effectiveStats(hero,col);const p=s.power+(d.power||0),g=s.guard+(d.guard||0),sp=s.speed+(d.speed||0),f=s.focus+(d.focus||0);
  return {atk:p+0.8*f, hp:22+g*1.4+p*0.5, spd:sp, type:hero.type};};
function climb(start,d={},ignoreType=false){const col={};for(const k in start)col[k]=start[k];
  for(let n=1;n<=TC;n++){const t=E.byTier(n).type;
    let party=ignoreType? unlocked(col).map(h=>({h,r:H.rating(h,col)})).sort((a,b)=>b.r-a.r).slice(0,3).map(x=>x.h.id) : bestParty(col,t);
    if(!party.length)return n-1;
    if(!E.simulateTeams(party.map(id=>comb(H.byId(id),col,d)),enemyTeam(liveFB,n)).win)return n-1;
    col["tier:"+n]={ts:1};E.tierLoot(n).forEach(id=>col[id]={ts:1});}
  return TC;}
const own=arr=>{const o={};arr.forEach(id=>o[id]={ts:1});return o;};
const ids=C.CATALOG.map(i=>i.id);const fracCol=f=>own(ids.filter(id=>!/^loot:/.test(id)).slice(0,Math.floor(2352*f)));

console.log("(1) THEORY — per +1 of each stat, the battle-relevant deltas:");
console.log("  power: +1.0 atk  +0.5 hp   (BOTH — damage and survival)");
console.log("  focus: +0.8 atk            (damage only)");
console.log("  guard:           +1.4 hp   (survival only)");
console.log("  speed: turn order only     (no atk/hp)");
console.log("  type advantage: x1.5 damage (vs x1.0 neutral, x0.6 disadvantage)\n");
console.log("(2) rating() proxy used for party-pick = power*1.0 + focus*0.8 + speed*0.5 + guard*0.3");
console.log("    -> overweights SPEED (0.5, but speed barely matters in-battle), underweights GUARD (0.3, but guard=1.4hp)\n");

console.log("(3) EMPIRICAL — extra tiers cleared from +10 to ONE stat across the party (vs baseline):");
console.log("collection | base | +10pwr | +10grd | +10spd | +10foc | no-type-adv");
for(const [lbl,f] of [["25%",.25],["50%",.5],["75%",.75]]){
  const col=fracCol(f), b=climb(col);
  const d=s=>{const dd={};dd[s]=10;return climb(col,dd)-b;};
  console.log(lbl.padEnd(10),"|",String(b).padStart(4),"|",String(d("power")).padStart(6),"|",String(d("guard")).padStart(6),"|",String(d("speed")).padStart(6),"|",String(d("focus")).padStart(6),"|",String(climb(col,{},true)-b).padStart(11));
}

// (4) CONTROLLED boundary leverage — identical 3-hero party vs a fixed foe; for each stat, how much
//     does +50 raise the foe budget you can still beat? (more headroom lift = more battle leverage)
function battle(P,G,S,F,type,FB,FT){const party=[0,1,2].map(()=>({atk:P+0.8*F,hp:22+G*1.4+P*0.5,spd:S,type}));
  const foes=[enemyComb(FB,FT),enemyComb(FB*0.6,TYPES[1]),enemyComb(FB*0.6,TYPES[2])];return E.simulateTeams(party,foes);}
function edge(P,G,S,F,FT){let lo=1000,hi=300000;for(let i=0;i<40;i++){const m=(lo+hi)/2;if(battle(P,G,S,F,"Brawn",m,FT).win)lo=m;else hi=m;}return Math.round(lo);}
console.log("\n(4) CONTROLLED — +50 to one stat (from 60): how much it lifts the beatable foe budget:");
for(const [FT,lbl] of [["Cunning","ADVANTAGE"],["Brawn","neutral"],["Arcane","DISADVANTAGE"]]){
  const B=edge(60,60,60,60,FT);
  const lift=st=>{const a={P:60,G:60,S:60,F:60};a[st]+=50;return ((edge(a.P,a.G,a.S,a.F,FT)/B-1)*100).toFixed(0)+"%";};
  console.log("  vs "+lbl.padEnd(12)+"(edge FB "+String(B).padStart(6)+"):  +50G "+lift("G").padStart(4)+"   +50P "+lift("P").padStart(4)+"   +50F "+lift("F").padStart(4)+"   +50S "+lift("S").padStart(4));
}
console.log("  => GUARD > POWER > FOCUS >> SPEED(=0). TYPE matchup swings the beatable budget ~1.7x (adv vs disadv).");
console.log("\n  INCONSISTENCY: rating()=pwr*1+foc*0.8+spd*0.5+grd*0.3 (the auto party-picker) REWARDS speed (0 impact)");
console.log("  and UNDER-rates guard (highest impact) — so the suggested best party misranks what actually wins.");
