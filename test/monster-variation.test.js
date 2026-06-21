/* T52 — Arena enemy sprites: deterministic, high-variation, region/type-themed,
 * bosses bigger/special. Pure-grid assertions over the real tier ladder.
 * Run: node test/monster-variation.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
["modes.js","collectibles.js","heroes.js","enemies.js","monsters.js"].forEach(f => new Function(read(f))());
const E = global.window.Enemies, M = global.window.Monsters, G = M.G;
const grid = n => M.buildGrid(E.byTier(n)).role;
const ser = r => r.map(row => row.join("")).join("");
// union-normalised distance: fraction of occupied cells whose role differs
function dist(A, B){ let d = 0, u = 0; for(let y=0;y<G;y++) for(let x=0;x<G;x++){ const a=A[y][x], b=B[y][x]; if(a||b) u++; if(a!==b) d++; } return u ? d/u : 0; }

// ---- determinism ----
ok(ser(grid(7)) === ser(grid(7)), "a tier's sprite is deterministic across builds");

// ---- high variation: a sampled set is almost entirely pairwise-distinct ----
const sample = []; for(let n = 1; n <= E.TIER_COUNT; n += 3) sample.push(grid(n));   // 40 tiers
const uniq = new Set(sample.map(ser)).size;
ok(uniq / sample.length >= 0.9, "≥90% of sampled sprites are pairwise distinct (" + uniq + "/" + sample.length + ")");
// and they're genuinely different, not 1-pixel apart
let pairs = 0, far = 0;
for(let i=0;i<sample.length;i++) for(let j=i+1;j<sample.length;j++){ pairs++; if(dist(sample[i], sample[j]) >= 0.15) far++; }
ok(far / pairs >= 0.9, "≥90% of sprite pairs differ substantially (≥0.15 grid distance) — " + far + "/" + pairs);

// ---- bosses (every 12th tier) read bigger/special vs a grunt of the same region ----
let bossDiff = 0, bossBigger = 0;
function filled(r){ let c=0; for(let y=0;y<G;y++) for(let x=0;x<G;x++) if(r[y][x]>=2) c++; return c; }
for(let region=0; region<10; region++){
  const boss = grid((region+1)*12), grunt = grid(region*12 + 1);
  if(dist(boss, grunt) >= 0.2) bossDiff++;
  if(filled(boss) > filled(grunt)) bossBigger++;
}
ok(bossDiff === 10, "every region's boss differs from its grunt (≥0.2) — " + bossDiff + "/10");
ok(bossBigger >= 8, "bosses render bigger than grunts in most regions (" + bossBigger + "/10)");

// ---- regions differ from one another (sample the same in-region position) ----
const perRegion = []; for(let r=0;r<10;r++) perRegion.push(grid(r*12 + 4));
let rPairs = 0, rFar = 0;
for(let i=0;i<perRegion.length;i++) for(let j=i+1;j<perRegion.length;j++){ rPairs++; if(dist(perRegion[i], perRegion[j]) >= 0.12) rFar++; }
ok(rFar / rPairs >= 0.85, "regions look distinct from one another (" + rFar + "/" + rPairs + " region pairs differ)");

// ---- type tint reaches the sprite (palette differs by RPS type) ----
const tt = t => { const r = M.buildGrid({ n:1, name:"X", type:t }); return r.pal.body; };
ok(tt("Brawn") !== tt("Cunning") && tt("Cunning") !== tt("Arcane"), "palette is tinted by the tier's RPS type");

// ---- it's its own generator — does not touch the collectibles icon system ----
const code = read("monsters.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");   // strip comments
ok(!/Collectibles|drawIcon|ARCH|CATEGORIES/.test(code), "monsters.js is standalone (no collectibles icon reuse in code)");
ok(!/requestAnimationFrame/.test(code), "no RAF — sprites are static");

console.log("\n" + (fails === 0 ? "ALL " + checks + " MONSTER CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
