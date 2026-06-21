/* T51 — restored varied hero portraits, item icons untouched.
 *   (a) the 12 hero portraits are pairwise DISTINCT (no repeated critter) and
 *       deterministic per hero, symmetric (mirrored creature-blob), class-coloured;
 *   (b) hero portraits no longer equal the "familiar" critter preset;
 *   (c) ITEM icons are byte-for-byte unchanged vs the committed version — role AND
 *       colour grids identical for a sample of catalogue ids incl. the "familiar"
 *       item category.
 * Run: node test/hero-icons.test.js
 */
const fs = require("fs"), path = require("path"), cp = require("child_process");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// load a fresh (modes + collectibles) pair on a clean global window; return its Collectibles
function load(collectiblesSrc){
  global.window = {};
  new Function(read("modes.js"))();
  new Function(collectiblesSrc)();
  return global.window.Collectibles;
}

const G = 16;
const HERO_IDS = ["bram","greta","tovar","mo","wisp","mira","nim","zeph","pip","vex","sela","roon"];
const HERO_PAL = { body:"#d05a4a", accent:"#ff8a6e", outline:"#3a1410" };
function eqGrid(A, B){ for(let y=0;y<G;y++) for(let x=0;x<G;x++) if(A[y][x] !== B[y][x]) return false; return true; }
function symmetric(r){ for(let y=0;y<G;y++) for(let x=0;x<G;x++) if(r[y][x] !== r[y][G-1-x]) return false; return true; }

// ---- NEW (working tree) ----
const C = load(read("collectibles.js"));

// (a) 12 heroes pairwise distinct + symmetric + deterministic
const roles = HERO_IDS.map(id => C.iconRoleGrid("hero:" + id, "familiar"));
let distinctPairs = 0, total = 0, allSym = true;
for(let i=0;i<roles.length;i++){ if(!symmetric(roles[i])) allSym = false;
  for(let j=i+1;j<roles.length;j++){ total++; if(!eqGrid(roles[i], roles[j])) distinctPairs++; } }
ok(distinctPairs === total, "all 12 hero portraits are pairwise distinct (" + distinctPairs + "/" + total + ")");
ok(allSym, "hero portraits are symmetric (mirrored creature-blob)");
ok(eqGrid(C.iconRoleGrid("hero:bram","familiar"), C.iconRoleGrid("hero:bram","familiar")), "hero portrait is deterministic across calls");
// class colour reaches the cells
const cgrid = C.iconColorGrid("hero:bram", HERO_PAL, "familiar");
let painted = false; for(let y=0;y<G;y++) for(let x=0;x<G;x++) if(cgrid[y][x] && cgrid[y][x] !== 0) painted = true;
ok(painted, "hero portrait paints with the class palette");

// (b) heroes != the "familiar" critter preset
ok(!eqGrid(C.iconRoleGrid("hero:bram","familiar"), C.iconRoleGrid("anItemX","familiar")),
   "hero portrait differs from the 'familiar' item critter");

// ---- OLD (committed HEAD) — prove ITEM icons unchanged ----
const oldSrc = cp.execSync("git show HEAD:collectibles.js", { cwd: path.join(__dirname, ".."), encoding: "utf8" });
const Cold = load(oldSrc);

// a spread of catalogue ids, plus forced ids in the "familiar" item category
const sample = C.CATALOG.filter((_, i) => i % 53 === 0).slice(0, 24).map(it => it.id);
const famIds = ["familiarItem1","familiarItem2","det:Loot","x9","zephyr-7"];
const base = { body:"#cccccc", accent:"#ffffff", outline:"#222222" };
let roleDiff = 0, colorDiff = 0, firstDiff = "";
sample.concat(famIds).forEach(id => {
  if(!eqGrid(C.iconRoleGrid(id, null), Cold.iconRoleGrid(id, null))){ roleDiff++; if(!firstDiff) firstDiff = id; }
  if(!eqGrid(C.iconRoleGrid(id, "familiar"), Cold.iconRoleGrid(id, "familiar"))){ roleDiff++; if(!firstDiff) firstDiff = id + " (familiar)"; }
  if(!eqGrid(C.iconColorGrid(id, base, null), Cold.iconColorGrid(id, base, null))){ colorDiff++; }
});
ok(roleDiff === 0, "item role grids byte-identical to HEAD (" + roleDiff + " diffs" + (firstDiff ? ", first: " + firstDiff : "") + ")");
ok(colorDiff === 0, "item colour grids byte-identical to HEAD (" + colorDiff + " diffs)");
ok(C.CATALOG.length === Cold.CATALOG.length, "catalogue size unchanged (" + C.CATALOG.length + ")");

console.log("\n" + (fails === 0 ? "ALL " + checks + " HERO-ICON CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
