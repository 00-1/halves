/* T178 — the gold economy: an EXPONENTIAL mid/late "Hoard Multiplier" so a
 * committed player amasses absurd goblin-gold (millions → billions → trillions),
 * while early-game earning is UNCHANGED. Also pins the pure earn formulas + the
 * fmtGold suffix ladder (K→M→B→T→Qa). Boots main.js's window.Gold API.
 *   (a) fmtGold renders the big tiers (K/M/B/T/Qa) correctly;
 *   (b) the per-event formulas (questionGold / roundBonus / tierGold) are stable;
 *   (c) goldMult = additive base × g^(bosses defeated): early (no bosses) = base
 *       (hoard ×1, unchanged); each region boss multiplies by g; 10 bosses = ×g^10;
 *   (d) the ramp makes deep play pay MILLIONS per win (the absurd-wealth comedy),
 *       and Arena difficulty is untouched (goldMult isn't used by the sim).
 * Run: node test/gold.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }
function near(a, b, tol){ return Math.abs(a - b) <= (tol || 1e-6) * Math.max(1, Math.abs(b)); }

// ---- boot main.js with a DOM shim to expose window.Gold ---------------------
let els = {}, store = {}, winH = {};
function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false, scrollTop:0,
  parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48,
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, toggle(c,f){ const h=this._s.has(c); if(f===undefined){h?this._s.delete(c):this._s.add(c);return !h;} f?this._s.add(c):this._s.delete(c); return !!f; }, contains(c){return this._s.has(c);} },
  addEventListener(){}, removeEventListener(){}, appendChild(){}, insertBefore(){}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
  querySelector(){ return null; }, querySelectorAll(){ return []; }, closest(){ return null; },
  getContext(){ return { clearRect(){}, fillRect(){} }; },
  get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }
global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 390;
global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = () => 1; global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = () => {};
global.performance = { now: () => Date.now() }; global.CSS = { escape:s=>s };
global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {}; global.setTimeout = () => 0;
global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
global.window.localStorage = global.localStorage;
global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
  addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
  documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js","main.js"].forEach(f => new Function(read(f))());
const G = global.window.Gold, E = global.window.Enemies;
ok(!!G, "window.Gold is exposed");

// ---- (a) fmtGold suffix ladder ----------------------------------------------
ok(G.fmtGold(500) === "500", "(a) fmtGold: < 1000 is plain");
ok(/^2\.50K$|^2\.5K$/.test(G.fmtGold(2500)), "(a) fmtGold: 2500 → ~2.5K (" + G.fmtGold(2500) + ")");
ok(/M$/.test(G.fmtGold(3.4e6)), "(a) fmtGold: millions → M (" + G.fmtGold(3.4e6) + ")");
ok(/B$/.test(G.fmtGold(7.2e9)), "(a) fmtGold: billions → B (" + G.fmtGold(7.2e9) + ")");
ok(/T$/.test(G.fmtGold(5e12)), "(a) fmtGold: trillions → T (" + G.fmtGold(5e12) + ")");
ok(/Qa$/.test(G.fmtGold(9e15)), "(a) fmtGold: 9e15 → Qa (" + G.fmtGold(9e15) + ")");
ok(G.fmtGold(-5) === "0" && G.fmtGold(NaN) === "0", "(a) fmtGold: negatives/NaN clamp to 0");

// ---- (b) the per-event formulas ---------------------------------------------
ok(G.tierGold(1, 1) === Math.round(10 * 1.1) && G.tierGold(120, 1) === Math.round(10 * (1 + 12)), "(b) tierGold scales with the tier (deeper = more)");
ok(G.questionGold(3, 3, 0, 1) === 2 && G.questionGold(3, 0, 0, 1) === 5, "(b) questionGold: base 2 + speed bonus vs target");
ok(G.roundBonus(10, 2, 1) === 14, "(b) roundBonus = (score + rankIdx·2)·mult");
ok(G.tierGold(10, 2) === 2 * G.tierGold(10, 1), "(b) the mult scales every earn linearly");

// ---- (c) the Hoard Multiplier: g^(bosses defeated) --------------------------
const g = G.HOARD_G;
ok(g >= 2.0 && g <= 2.6, "(c) the boss multiplier g is in the owner-set 2.0–2.6 band (sim floor 2.0, owner dialled 2.5) (" + g + ")");
const RS = E.REGION_SIZE, bossTiers = []; for(let t = RS; t <= E.TIER_COUNT; t += RS) bossTiers.push(t);
ok(bossTiers.length === 10, "(c) there are 10 region bosses (every " + RS + "th tier)");
function withBosses(k){ const col = {}; for(let i = 0; i < k; i++) col["tier:" + bossTiers[i]] = { ts:1 }; return col; }
ok(G.bossesDefeated({}) === 0 && G.bossesDefeated(withBosses(3)) === 3 && G.bossesDefeated(withBosses(10)) === 10, "(c) bossesDefeated counts the region-boss tier markers");
ok(G.hoardMult({}) === 1, "(c) EARLY game (no bosses) → hoard ×1 — earning UNCHANGED");
ok(near(G.hoardMult(withBosses(1)), g) && near(G.hoardMult(withBosses(10)), Math.pow(g, 10)), "(c) hoardMult = g^(bosses) — ×g per boss, ×g^10 at full clear (" + Math.round(Math.pow(g,10)) + "×)");
// goldMult = additive base × hoard. Early (no bosses): mult == base (hoard ×1).
const C = global.window.Collectibles, H = global.window.Heroes;
function additiveBase(col){
  const items = C.CATALOG.filter(it => col[it.id]).length;
  let mastered = 0, tiers = 0; for(const k in col){ if(k.indexOf("mastery:") === 0) mastered++; else if(/^tier:\d+$/.test(k)) tiers++; }
  const heroes = H.HEROES.filter(h => H.isHeroUnlocked(h, col)).length;
  return 1 + items * 0.05 + mastered * 0.5 + heroes * 0.5 + tiers * 1;
}
const early = G.mult({});
ok(early === 1, "(c) early goldMult == 1 (no items, no boss ramp) — earning unchanged");
// goldMult is EXACTLY the additive base × the hoard factor, at every depth.
const c3 = withBosses(3), c10 = withBosses(10);
ok(near(G.mult(c3), additiveBase(c3) * G.hoardMult(c3)) && near(G.mult(c10), additiveBase(c10) * G.hoardMult(c10)),
   "(c) goldMult == additive base × g^(bosses) exactly (the composition holds at every depth)");

// ---- (d) deep play pays MILLIONS per win → the absurd hoard ------------------
// a true completionist: every collectible + every tier win (so all 10 bosses + max base).
const full = {}; C.CATALOG.forEach(it => { full[it.id] = { ts:1 }; }); for(let t = 1; t <= E.TIER_COUNT; t++) full["tier:" + t] = { ts:1 };
ok(G.bossesDefeated(full) === 10, "(d) the completionist collection has all 10 bosses (hoard ×g^10)");
const lateMult = G.mult(full);
const perBossWin = G.tierGold(120, lateMult);                            // a tier-120 win at full clear
ok(perBossWin >= 1e6, "(d) a late-game tier-120 win pays ≥ millions (" + G.fmtGold(perBossWin) + ") — the absurd-wealth ramp works");
// Arena difficulty is decoupled: goldMult is NOT referenced by the enemy sim.
ok(!/goldMult|hoardMult|window\.Gold/.test(read("enemies.js")), "(d) enemies.js never reads the gold multiplier — ramping wealth can't unbalance the Arena");

console.log("\n" + (fails === 0 ? "ALL " + checks + " GOLD CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
