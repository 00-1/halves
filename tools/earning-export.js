/* T233 — export GG1 EARNING rules as data + parity vectors (NON-DESTRUCTIVE).
 * Loads the PURE gg1/dev source modules headlessly and drives the live award
 * evaluators over a boundary-targeted synthetic battery → {input -> awarded keys}.
 * Same "share DATA not code, prove with vectors" technique as the transforms (T229).
 * Run:  node tools/earning-export.js   (writes content/gg1/earning*.json)
 * Test: require('./earning-export').generate() → {earning, vectors}  (drift gate). */
"use strict";
const fs = require("fs"), path = require("path");
const DEV = path.join(__dirname, "..", "gg1", "dev");

function build(){
  const window = {};
  window.Emblems = { draw(){}, has: () => false, list: () => [] };
  window.performance = { now: () => 0 };
  const load = n => { const code = fs.readFileSync(path.join(DEV, n + ".js"), "utf8");
    new Function("window", code)(window); };
  // dependency order (loot from enemies.js is EXCLUDED — collectibles-only = the 2352 B uses)
  load("modes"); load("heroes"); load("events"); load("collectibles");
  return { C: window.Collectibles, MODES: window.MODES };
}

function generate(){
  const { C, MODES } = build();
  const NONE = () => false, keys = a => a.map(it => it.id);
  const earning = {
    _note: "GG1 earning thresholds (from collectibles.js). Per-ctx award LOGIC is proven by earning-vectors.json.",
    initAnswerFrac: 0.5, spark: C.SPARK, speed: C.SPEED,
    ranks: C.RANKS.map(r => ({ key: r.key, name: r.name, rarity: r.rarity })),
    metaGames: C.CATALOG.filter(it => /^meta:games\d+$/.test(it.id)).map(it => +it.id.replace("meta:games","")).sort((a,b)=>a-b),
    topicsUnlock: C.CATALOG.filter(it => it.need && it.need.unlock).map(it => it.need.unlock).sort((a,b)=>a-b),
    collectorTiers: C.CATALOG.filter(it => /^collector:\d+$/.test(it.id)).map(it => +it.id.split(":")[1]).sort((a,b)=>a-b),
    goldThresholds: C.CATALOG.filter(it => it.gold != null).map(it => it.gold).sort((a,b)=>a-b),
    momentumThresholds: C.CATALOG.filter(it => it.momentum != null).map(it => it.momentum).sort((a,b)=>a-b),
  };
  const vectors = { rankIndex: [], perMode: {}, collector: [], topics: [], meta: [], gold: [], momentum: [] };
  for(const total of [10,21,27]) for(let score=0; score<=total; score++)
    for(const avg of [0.8,1.0,1.2,1.4,1.6,1.9,2.3,2.9,3.5,4.5,5.6,7.0])
      vectors.rankIndex.push({ score, total, time: avg*total, idx: C.rankIndex(score,total,avg*total) });
  // GG1 ctx invariants: skipped = total-answered; mistakes = skipped; rankIndex derived; avg = totalTime/total.
  const ctxFor = (mode,total,o) => {
    const answered = o.answered != null ? o.answered : total;
    const score = o.score != null ? o.score : answered, totalTime = o.avg*total, skipped = total-answered;
    return { mode, total, answered, score, skipped, mistakes: skipped, totalTime, avg: o.avg,
      rankIndex: C.rankIndex(score,total,totalTime), qmap: o.qmap||{},
      stats: o.stats || { games:1, modesCleared:1, flawless:0 } };
  };
  for(const m of MODES){
    const N = m.build().length, ms = m.masterSecs, H = Math.ceil(N/2);
    const q = m.build().slice().sort((a,b)=>String(a.p).localeCompare(String(b.p),undefined,{numeric:true}))[0];
    const scen = [
      ["allSkip",{answered:0,score:0,avg:99}], ["halfAnswered",{answered:H,score:H,avg:2.0}],
      ["fullCleanFast",{answered:N,score:N,avg:1.0}], ["fullCleanMid",{answered:N,score:N,avg:ms*0.99}],
      ["fullCleanSlow",{answered:N,score:N,avg:ms+1}],
      ["oneWrongNoSkip",{answered:N,score:N-1,avg:2.0,qmap:{[q.p]:{miss:1,t:2.0}}}],
      ["speedQuick",{answered:N,score:N,avg:2.1}], ["speedSwift",{answered:N,score:N,avg:1.7}],
      ["speedBlazing",{answered:N,score:N,avg:1.3}], ["speedLightning",{answered:N,score:N,avg:1.0}],
      ["solveClean",{answered:N,score:N,avg:2.0,qmap:{[q.p]:{miss:0,t:2.0}}}],
      ["solveSpark",{answered:N,score:N,avg:2.0,qmap:{[q.p]:{miss:0,t:1.0}}}],
      ["metaGames100",{answered:N,score:N,avg:2.0,stats:{games:100,modesCleared:MODES.length,flawless:MODES.length}}],
    ];
    vectors.perMode[m.id] = scen.map(([s,o]) => ({ scen:s, awarded: keys(C.evaluate(ctxFor(m,N,o), NONE)) }));
  }
  for(const count of [0,1,24,25,26,74,75,149,150,299,300,499,500,749,750,999,1000,1499,1500,1599,1600,1699,1700,1799,1800,2299,2300,2352])
    vectors.collector.push({ count, awarded: keys(C.evaluateCollector(count, NONE)) });
  for(const u of [0,2,3,7,8,15,16,46]) for(const c of [0,1])
    vectors.topics.push({ unlock:u, complete:c, total:46, awarded: keys(C.evaluateTopics({unlocked:u,complete:c,total:46}, NONE)) });
  for(const hu of [0,11,12]) vectors.meta.push({ heroesUnlocked:hu, heroesTotal:12, awarded: keys(C.evaluateMeta(hu,12, NONE)) });
  for(const g of earning.goldThresholds.concat([0,1e9])) vectors.gold.push({ total:g, awarded: keys(C.evaluateGold(g, NONE)) });
  for(const b of earning.momentumThresholds.concat([0,1e6])) vectors.momentum.push({ best:b, awarded: keys(C.evaluateMomentum(b, NONE)) });
  return { earning, vectors };
}

if(require.main === module){
  const { earning, vectors } = generate();
  fs.writeFileSync(path.join(__dirname,"..","content","gg1","earning.json"), JSON.stringify(earning,null,1)+"\n");
  fs.writeFileSync(path.join(__dirname,"..","content","gg1","earning-vectors.json"), JSON.stringify(vectors)+"\n");
  const n = vectors.rankIndex.length + Object.values(vectors.perMode).reduce((s,a)=>s+a.length,0)
    + vectors.collector.length + vectors.topics.length + vectors.meta.length + vectors.gold.length + vectors.momentum.length;
  console.log("wrote content/gg1/earning.json + earning-vectors.json — ranks", earning.ranks.length, "vectors", n);
}
module.exports = { generate };
