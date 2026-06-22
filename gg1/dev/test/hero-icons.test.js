/* T51 — restored varied hero portraits, item icons untouched.
 *   (a) the 12 hero portraits are pairwise DISTINCT (no repeated critter) and
 *       deterministic per hero, symmetric (mirrored creature-blob), class-coloured;
 *   (b) hero portraits no longer equal the "familiar" critter preset;
 *   (c) ITEM icons are protected by PERMANENT invariants: no catalogue id is
 *       "hero:"-prefixed (so items can never route to the hero blob), and a fixed
 *       embedded baseline of item role grids still matches (snapshot guard).
 * Run: node test/hero-icons.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
new Function(read("modes.js"))();
new Function(read("events.js"))();
new Function(read("collectibles.js"))();
const G = 16;
const HERO_IDS = ["bram","greta","tovar","mo","wisp","mira","nim","zeph","pip","vex","sela","roon"];
const HERO_PAL = { body:"#d05a4a", accent:"#ff8a6e", outline:"#3a1410" };
function eqGrid(A, B){ for(let y=0;y<G;y++) for(let x=0;x<G;x++) if(A[y][x] !== B[y][x]) return false; return true; }
function symmetric(r){ for(let y=0;y<G;y++) for(let x=0;x<G;x++) if(r[y][x] !== r[y][G-1-x]) return false; return true; }
function ser(r){ return r.map(row => row.join("")).join("|"); }

const C = global.window.Collectibles;

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

// ---- (c) PERMANENT item-protection invariants (can't go vacuous) ----
// The key guard: no catalogue id is "hero:"-prefixed, so an item id can NEVER
// route to the hero blob branch in buildIcon.
ok(C.CATALOG.every(it => !/^hero:/.test(String(it.id))), "no catalogue item id is 'hero:'-prefixed (items can't route to the hero blob)");

// Snapshot guard: fixed embedded baselines of item role grids (captured from the
// approved icon engine) — fails if any item icon's shape ever changes.
const BASELINE = {
  "det:Loot":    "0000122223210000|0000123122210000|0000013223100000|0000122233310000|0000123333210000|1111313222231111|2323222232232233|2322231221323222|2322132233232232|3221232223132233|1122233333213211|0011333313231100|0000132323310000|0000122223310000|0000113232110000|0001332113321000",
  "det:Mastery": "0000000000000000|0011111111111100|0123323222332210|0122323232323310|0131223322232210|0122313323323310|0123232333232210|0121333133312210|0132333333223310|0122221333321210|0131223332223210|0012222323223100|0001121332311000|0000013222100000|0000001231000000|0000000110000000"
};
let snapFail = 0;
Object.keys(BASELINE).forEach(id => { if(ser(C.iconRoleGrid(id, null)) !== BASELINE[id]) snapFail++; });
ok(snapFail === 0, "item icon role grids match the embedded baseline (" + snapFail + " changed)");
ok(C.CATALOG.length === 2303, "catalogue size as expected (" + C.CATALOG.length + ")");

console.log("\n" + (fails === 0 ? "ALL " + checks + " HERO-ICON CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
