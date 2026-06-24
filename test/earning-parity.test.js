/* T233 — earning export parity/drift gate + faithfulness invariants. */
"use strict";
const assert = require("assert");
const fs = require("fs"), path = require("path");
const { generate } = require("../tools/earning-export.js");
const dir = path.join(__dirname, "..", "content", "gg1");
let pass = 0; const ok = (c,m) => { assert.ok(c,m); console.log("  ok:", m); pass++; };

const fresh = generate();
const onDisk = {
  earning: JSON.parse(fs.readFileSync(path.join(dir,"earning.json"),"utf8")),
  vectors: JSON.parse(fs.readFileSync(path.join(dir,"earning-vectors.json"),"utf8")),
};
// (1) DRIFT GATE — committed files == a fresh regenerate from the live source
ok(JSON.stringify(fresh.earning) === JSON.stringify(onDisk.earning), "(1) earning.json matches a fresh regenerate (no drift)");
ok(JSON.stringify(fresh.vectors) === JSON.stringify(onDisk.vectors), "(1) earning-vectors.json matches a fresh regenerate (no drift)");

const E = onDisk.earning, V = onDisk.vectors;
// (2) threshold data shape
ok(E.ranks.length === 23, "(2) 23 ranks");
ok(E.speed.length === 4 && E.speed[3].name === "Lightning", "(2) 4 speed brackets, top = Lightning");
ok(JSON.stringify(E.collectorTiers) === JSON.stringify([25,75,150,300,500,750,1000,1500,1600,1700,1800,2300]), "(2) 12 collector tiers, capstone 2300");
ok(JSON.stringify(E.metaGames) === JSON.stringify([5,25,100]), "(2) meta games [5,25,100]");

// (3) FAITHFULNESS of the vectors (the mistakes==skips invariant matters here)
const halves = Object.fromEntries(V.perMode.halves.map(s => [s.scen, s.awarded]));
ok(halves.allSkip.includes("rank:goblin") && !halves.allSkip.some(k=>k.startsWith("init:")) && !halves.allSkip.some(k=>k.startsWith("flawless:")),
   "(3) allSkip → rank only, NO init/flawless (skipped all)");
ok(halves.halfAnswered.includes("init:halves") && !halves.halfAnswered.includes("flawless:halves"),
   "(3) halfAnswered → init YES, flawless NO (a skip breaks flawless)");
ok(halves.fullCleanFast.includes("flawless:halves") && halves.fullCleanFast.includes("mastery:halves") &&
   [0,1,2,3].every(i=>halves.fullCleanFast.includes("speed:halves:"+i)),
   "(3) fullCleanFast → flawless + mastery + all 4 speed");
ok(halves.oneWrongNoSkip.includes("flawless:halves") && !halves.oneWrongNoSkip.some(k=>k.startsWith("solve:halves:")),
   "(3) oneWrongNoSkip → flawless KEPT (no skip) but the missed Q's Solved NOT granted");
ok(halves.fullCleanSlow.includes("flawless:halves") && !halves.fullCleanSlow.includes("mastery:halves"),
   "(3) fullCleanSlow → flawless yes, mastery NO (over the time gate)");

// (4) rankIndex derived correctly (perfect-fast high, imperfect low)
const perfFast = V.rankIndex.find(r => r.score===21 && r.total===21 && r.time < 21*0.9);
const imperfect = V.rankIndex.find(r => r.score===10 && r.total===21);
ok(perfFast && perfFast.idx >= 20, "(4) rankIndex: perfect + fast → top ranks");
ok(imperfect && imperfect.idx <= 2, "(4) rankIndex: ~48% accuracy → low rank");

// (5) collector ladder earns exactly tiers <= count
const at150 = V.collector.find(c => c.count===150).awarded.filter(k=>/^collector:\d+$/.test(k));
ok(JSON.stringify(at150.map(k=>+k.split(":")[1]).sort((a,b)=>a-b)) === JSON.stringify([25,75,150]),
   "(5) collector @150 earns exactly tiers 25/75/150");

console.log("\nALL " + pass + " EARNING-PARITY CHECKS PASSED");
