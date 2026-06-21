/* T36 — icon-variation test (no real canvas). Quantizes each render to a role grid
 * (0 empty/1 outline/2 body/3 accent — shape only, palette-independent) plus a
 * colour grid, then checks cross-category distinctness, within-category diversity,
 * identity preservation, and determinism. Run: node test/icon-variation.test.js */
const fs = require("fs"), path = require("path");
global.window = {};
function load(f){ new Function(fs.readFileSync(path.join(__dirname, "..", f), "utf8"))(); }
["modes.js", "events.js", "collectibles.js"].forEach(load);
const C = window.Collectibles;
const CATS = C.CATEGORIES.map(c => c.id);
const G = 16, CELLS = G * G;
const base = C.paletteFor("rare");

function role(id, cat){ return C.iconRoleGrid(id, cat); }
function color(id, cat){ return C.iconColorGrid(id, base, cat); }
// fraction of the icon's OWN pixels that differ — normalised by the union of
// occupied cells (the meaningful "how samey" measure, fair across icon sizes).
function gridDist(A, B){ let d = 0, u = 0; for(let y=0;y<G;y++) for(let x=0;x<G;x++){ const a=A[y][x], b=B[y][x]; if(a||b) u++; if(a !== b) d++; } return u ? d / u : 0; }

let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } }

// (a) cross-category distinct — one canonical probe per category, role grids ≥0.18
const probes = CATS.map(c => ({ c, r: role("probe:" + c, c) }));
let worst = { d: 1, a: "", b: "" };
for(let i=0;i<probes.length;i++) for(let j=i+1;j<probes.length;j++){
  const d = gridDist(probes[i].r, probes[j].r);
  if(d < worst.d) worst = { d, a: probes[i].c, b: probes[j].c };
}
ok(worst.d >= 0.18, "(a) cross-category role dist ≥0.18 (closest "+worst.a+"/"+worst.b+" = "+worst.d.toFixed(3)+")");

// (b) within-category diversity — 40 items/category, combined ≥0.22, no dups
const N = 40;
const rows = [];
let dupFail = 0, identFail = 0, combinedWorst = { v: 1, c: "" };
for(const cat of CATS){
  const ids = Array.from({length:N}, (_,i) => "v:" + cat + ":" + i);
  const roles = ids.map(id => role(id, cat));
  const colors = ids.map(id => color(id, cat));
  // average pairwise distances
  let rSum=0, cSum=0, pairs=0, dups=0;
  for(let i=0;i<N;i++) for(let j=i+1;j<N;j++){
    const rd = gridDist(roles[i], roles[j]), cd = gridDist(colors[i], colors[j]);
    rSum += rd; cSum += cd; pairs++;
    if(cd === 0 && rd === 0) dups++;
  }
  const avgR = rSum/pairs, avgC = cSum/pairs, combined = 0.7*avgR + 0.3*avgC;
  if(dups > 0) dupFail++;
  if(combined < combinedWorst.v) combinedWorst = { v: combined, c: cat };
  // identity: each item shares ≥95% of the preset's locked cells
  const locks = C.lockedCells(cat);
  if(locks.length){
    for(let i=0;i<N;i++){ const r = roles[i]; let kept = 0;
      locks.forEach(([x,y]) => { if(r[y][x] === 1 || r[y][x] === 2 || r[y][x] === 3) kept++; });   // locked cell is part of the figure
      if(kept / locks.length < 0.95) identFail++;
    }
  }
  rows.push({ cat, combined, avgR, avgC });
}
ok(combinedWorst.v >= 0.22, "(b) within-category combined ≥0.22 (worst "+combinedWorst.c+" = "+combinedWorst.v.toFixed(3)+")");
ok(dupFail === 0, "(b) no identical items within any category ("+dupFail+" cats with dups)");
ok(identFail === 0, "identity: locked cells preserved ≥95% ("+identFail+" items failed)");

// determinism — same id twice ⇒ identical
let detFail = 0;
for(const cat of CATS){ if(gridDist(color("det:"+cat, cat), color("det:"+cat, cat)) !== 0) detFail++; }
ok(detFail === 0, "determinism: same id ⇒ identical render ("+detFail+" fails)");

// report table sorted by within-avg (worst first)
rows.sort((a,b)=>a.combined-b.combined);
console.log("\n  within-category combined (worst first):");
rows.slice(0,8).forEach(r => console.log("    "+r.cat.padEnd(11)+" combined="+r.combined.toFixed(3)+" (role "+r.avgR.toFixed(3)+", color "+r.avgC.toFixed(3)+")"));
console.log("\n" + (fails === 0 ? "ALL " + checks + " ICON-VARIATION CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
