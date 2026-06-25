/* Arena balance + stat-leverage auditor (LIVE — reads enemies.js as-is).
 * (A) BALANCE: climb the live 3v3 (Enemies.teamBattle) with the loot snowball — best UNLOCKED party
 *     per tier, win → gain loot → continue — and report depth per collection level.
 * (B) STAT LEVERAGE: controlled even-fights — how much +50 to one stat lifts the beatable foe budget,
 *     confirming all four of PWR/GRD/SPD/FOC (and type matchup) have real, distinct weight.
 * Retune the FOE_BUDGET (FLOOR/WALL/STEEP) or combat constants in enemies.js, re-run, re-check.
 * Run: node tools/analyze-arena.js */
"use strict";
const fs=require("fs"),path=require("path"),DEV="gg1/dev";
const window={};window.Emblems={draw(){},has:()=>false,list:()=>[]};window.performance={now:()=>0};
const load=n=>new Function("window",fs.readFileSync(path.join(DEV,n+".js"),"utf8"))(window);
["modes","heroes","events","collectibles","enemies"].forEach(load);
const C=window.Collectibles,H=window.Heroes,E=window.Enemies,MODES=window.MODES;
const TC=E.TIER_COUNT,HPR=2.2,K=10,TYPES=["Brawn","Arcane","Cunning"],mu=(a,b)=>H.matchup(a,b);

// ---- (A) live balance: deepest tier per collection (loot snowball) ----
const unlocked=col=>H.HEROES.filter(h=>H.isHeroUnlocked(h,col));
const bestParty=(col,t)=>unlocked(col).map(h=>({h,s:H.rating(h,col)*mu(h.type,t)})).sort((a,b)=>b.s-a.s).slice(0,3).map(x=>x.h.id);
function climb(start){const col={};for(const k in start)col[k]=start[k];
  for(let n=1;n<=TC;n++){const p=bestParty(col,E.byTier(n).type);if(!p.length)return n-1;
    if(!E.teamBattle(p,n,col).win)return n-1;col["tier:"+n]={ts:1};E.tierLoot(n).forEach(id=>col[id]={ts:1});}return TC;}
const own=a=>{const o={};a.forEach(id=>o[id]={ts:1});return o;};const ids=C.CATALOG.map(i=>i.id),tIds=MODES.map(m=>m.id);
const kRuns=k=>own(C.CATALOG.filter(i=>i.modeId&&tIds.slice(0,k).includes(i.modeId)).map(i=>i.id));
const frac=f=>own(ids.filter(id=>!/^loot:/.test(id)).slice(0,Math.floor(2352*f)));
console.log("(A) BALANCE — deepest tier per collection (target: ~1 topic→10, full→120, no plateau):");
for(const[l,c]of[["fresh",{}],["1 topic",kRuns(1)],["3 topics",kRuns(3)],["10 topics",kRuns(10)],
  ["25% cat",frac(.25)],["50% cat",frac(.5)],["75% cat",frac(.75)],["100% cat",frac(1)]])
  console.log("  "+l.padEnd(9)+String(climb(c)).padStart(4)+" / "+TC);
const fb=n=>{const c=E.enemyTeam(n)[0];return Math.round(c.pow*c.pow*HPR);};
console.log("  foe budget @ tier:",[1,10,20,40,60,80,100,119,120].map(n=>n+":"+fb(n)).join("  "));

// ---- (B) controlled stat leverage (even fight): +50 to one stat → % lift in beatable budget ----
const K2=JSON.parse(fs.readFileSync(path.join("content","gg1","combat.json"),"utf8")).constants.combat;
const eC=(b,type)=>({pow:Math.sqrt(b/HPR),grd:0,spd:4,foc:0,hp:Math.sqrt(b*HPR),type});
const hc=(p,g,s,f)=>({pow:p,grd:g,spd:s,foc:f,hp:K2.HP_FLAT,type:"Brawn"});
function edge(p,g,s,f,FT){let lo=1000,hi=400000;for(let i=0;i<38;i++){const m=(lo+hi)/2;
  const party=[0,1,2].map(()=>hc(p,g,s,f));const foes=[eC(m,FT),eC(m*0.6,TYPES[1]),eC(m*0.6,TYPES[2])];
  if(E.simulateTeams(party,foes).win)lo=m;else hi=m;}return Math.round(lo);}
console.log("\n(B) STAT LEVERAGE — +50 to one stat (from 60), % lift in beatable foe budget:");
for(const[FT,lbl]of[["Cunning","ADVANTAGE"],["Brawn","neutral"],["Arcane","DISADVANTAGE"]]){
  const B=edge(60,60,60,60,FT),lf=(p,g,s,f)=>((edge(p,g,s,f,FT)/B-1)*100).toFixed(0)+"%";
  console.log("  vs "+lbl.padEnd(12)+"(edge "+String(B).padStart(6)+"):  PWR "+lf(110,60,60,60).padStart(4)+"  GRD "+lf(60,110,60,60).padStart(4)+"  SPD "+lf(60,60,110,60).padStart(4)+"  FOC "+lf(60,60,60,110).padStart(4));
}
console.log("  (PWR=damage·matchup · FOC=flat damage, shines into disadvantage · GRD=mitigation · SPD=opening strike)");
