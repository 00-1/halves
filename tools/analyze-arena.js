/* Arena balance analysis / retuning tool.
 * Models the LIVE 3v3 arena (Enemies.teamBattle) with the loot snowball — best UNLOCKED party per
 * tier, win → gain that tier's loot → recompute, climb until a loss — and reports how deep each
 * collection level reaches. Use it to (a) audit the live curve and (b) retune FOE_BUDGET in
 * enemies.js (the FLOOR/WALL/STEEP knobs): tweak rampFB() here, find a shape, port the constants.
 * Run: node tools/analyze-arena.js */
"use strict";
const fs = require("fs"), path = require("path"), DEV = "gg1/dev";
const window = {}; window.Emblems = { draw(){}, has: () => false, list: () => [] }; window.performance = { now: () => 0 };
const load = n => new Function("window", fs.readFileSync(path.join(DEV, n + ".js"), "utf8"))(window);
["modes","heroes","events","collectibles","enemies"].forEach(load);
const C = window.Collectibles, H = window.Heroes, E = window.Enemies, MODES = window.MODES;
const TC = E.TIER_COUNT, HPR = 2.2, ESPD = 4, K = 10, TYPES = ["Brawn","Arcane","Cunning"];

const unlocked = col => H.HEROES.filter(h => H.isHeroUnlocked(h, col));
const bestParty = (col, type) => unlocked(col).map(h => ({ h, s: H.rating(h, col) * H.matchup(h.type, type) }))
  .sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.h.id);
const teamProd = col => { const t = unlocked(col).map(h => ({ h, r: H.rating(h, col) })).sort((a,b)=>b.r-a.r).slice(0,3);
  let a = 0, hp = 0; for(const {h} of t){ const s = H.effectiveStats(h, col); a += s.power + 0.8*s.focus; hp += 22 + s.guard*1.4 + s.power*0.5; } return Math.round(a*hp); };

// climb with an arbitrary foe-budget array (default = the LIVE curve), gaining loot on each win
const enemyComb = (b, type) => ({ atk: Math.sqrt(b/HPR), hp: Math.sqrt(b*HPR), spd: ESPD, type });
const enemyTeam = (fb, n) => { const aL = Math.max(1, n-K);
  return [ enemyComb(fb[n-1], E.byTier(n).type), enemyComb(fb[aL-1], TYPES[n%3]), enemyComb(fb[aL-1], TYPES[(n+1)%3]) ]; };
const liveFB = (() => { const fb = []; for(let n=1;n<=TC;n++){ const a = E.enemyTeam(n)[0].atk; fb.push(a*a*HPR); } return fb; })();
function climb(start, fb = liveFB){
  const col = {}; for(const k in start) col[k] = start[k];
  for(let n = 1; n <= TC; n++){
    const party = bestParty(col, E.byTier(n).type); if(!party.length) return n - 1;
    const combs = party.map(id => E.heroCombatant(H.byId(id), col));
    if(!E.simulateTeams(combs, enemyTeam(fb, n)).win) return n - 1;
    col["tier:" + n] = { ts: 1 }; E.tierLoot(n).forEach(id => col[id] = { ts: 1 });
  }
  return TC;
}
// a candidate budget shape for retuning (mirrors enemies.js): steep-early ramp FLOOR→WALL, boss pinned
const rampFB = (FLOOR, WALL, STEEP) => { const fb = []; for(let n=1;n<=TC;n++){
  if(n === TC){ fb.push(liveFB[TC-1]); continue; }
  fb.push(FLOOR * Math.pow(WALL/FLOOR, Math.pow((n-1)/(TC-2), STEEP))); } return fb; };

// ---- collection states ----
const cat = C.CATALOG, ids = cat.map(i => i.id), topicIds = MODES.map(m => m.id);
const own = arr => { const o = {}; arr.forEach(id => o[id] = { ts: 1 }); return o; };
const kRuns = k => own(cat.filter(i => i.modeId && topicIds.slice(0, k).includes(i.modeId)).map(i => i.id));
const fracCol = f => own(ids.filter(id => !/^loot:/.test(id)).slice(0, Math.floor(2352 * f)));
const STATES = [["fresh",{}],["1 topic",kRuns(1)],["2 topics",kRuns(2)],["3 topics",kRuns(3)],["5 topics",kRuns(5)],
  ["10 topics",kRuns(10)],["25% cat",fracCol(.25)],["50% cat",fracCol(.5)],["75% cat",fracCol(.75)],["100% cat",fracCol(1)]];

function report(label, fb){
  console.log("\n" + label);
  console.log("state      | items | heroes | teamProduct | deepest tier");
  for(const [name, col] of STATES){
    const items = Object.keys(col).filter(k => C.byId(k)).length;
    console.log(name.padEnd(10), "|", String(items).padStart(5), "|", String(unlocked(col).length).padStart(6),
      "|", String(teamProd(col)).padStart(11), "|", String(climb(col, fb)).padStart(4) + " / " + TC);
  }
}
report("=== LIVE curve (enemies.js FOE_BUDGET) ===", liveFB);
console.log("\nlive foe budget @ tier:", [1,10,20,40,60,80,100,119,120].map(n => n+":"+Math.round(liveFB[n-1])).join("  "));

// retuning playground — edit/uncomment to explore alternative shapes before porting to enemies.js:
// report("=== candidate (FLOOR=107, WALL=220000, STEEP=0.25) ===", rampFB(107, 220000, 0.25));
