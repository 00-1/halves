/* T47 — Arena is a PURE STAT CHECK (no maths drill). Pure-logic proof over the
 * real enemies/heroes/collectibles data:
 *   (a) win == round(rating × matchup) ≥ def, with NO perf/question input;
 *   (b) tiers 1–5 winnable by the starter hero's stats;
 *   (c) no tier is gated behind its own loot;
 *   (d) tier 100 unbeatable without a near-complete collection, beatable at
 *       near-full, and one missing champion boost flips it to a loss;
 *   (e) canAttempt still requires tier:n-1;
 *   (f) the Arena never runs a question round (BATTLE_MODE gone; no beginRound
 *       from the Fight path); resolveBattle/computePerf removed; def unchanged.
 * Run: node test/arena.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
global.document = { createElement(){ return { getContext(){ return {}; } }; } };
["modes.js","collectibles.js","heroes.js","enemies.js"].forEach(f => new Function(read(f))());
const C = global.window.Collectibles, H = global.window.Heroes, E = global.window.Enemies;

// ---- (f) API shape: stat-only, perf machinery gone -------------------------
ok(typeof E.statBattle === "function", "Enemies.statBattle exists");
ok(E.resolveBattle === undefined && E.computePerf === undefined, "perf-scaled resolveBattle/computePerf removed");
const mainSrc = read("main.js");
ok(mainSrc.indexOf("BATTLE_MODE") < 0, "main.js: BATTLE_MODE synthetic mode gone");
ok(/function startBattle[\s\S]*?finishBattle\(arenaHero/.test(mainSrc), "Fight (startBattle) resolves via statBattle→finishBattle, no round");
const sbStart = mainSrc.indexOf("function startBattle");
const sbBody = mainSrc.slice(sbStart, mainSrc.indexOf("\n  function ", sbStart + 1));
ok(sbBody.indexOf("beginRound") < 0 && sbBody.indexOf("statBattle") >= 0, "Fight path never calls beginRound (no question round)");

// owned-set helpers
const ALL = C.CATALOG.map(it => it.id);
const setOf = ids => { const o = {}; ids.forEach(id => o[id] = 1); return o; };
const drillOnly = C.CATALOG.filter(it => it.cat !== "Loot").map(it => it.id);   // everything earnable without the Arena
function bestPower(tier, owned){   // strongest stat-only power any hero can field
  let best = -1, who = null;
  H.HEROES.forEach(h => { const p = E.statBattle(h, tier, owned); if(p.power > best){ best = p.power; who = h; } });
  return { power: best, hero: who };
}

// ---- (a) win is exactly round(rating×matchup) ≥ def, no perf ----------------
(function(){
  const tier = E.byTier(40), owned = setOf(drillOnly);
  let allMatch = true;
  H.HEROES.forEach(h => {
    const res = E.statBattle(h, tier, owned);
    const expectPower = Math.round(H.rating(h, owned) * H.matchup(h.type, tier.type));
    if(res.power !== expectPower || res.win !== (expectPower >= tier.def) || "perf" in res) allMatch = false;
  });
  ok(allMatch, "win == round(rating×matchup) ≥ def for every hero (no perf field)");
})();

// ---- (b) tiers 1–5 winnable by the starter hero -----------------------------
(function(){
  const starter = H.HEROES[0];   // bram — the first/starter hero (base stats, 0 items)
  ok(starter && starter.id === "bram", "starter hero is bram (" + (starter && starter.id) + ")");
  let allWin = true;
  for(let n = 1; n <= 5; n++) if(!E.statBattle(starter, E.byTier(n), {}).win) allWin = false;
  ok(allWin, "tiers 1–5 winnable by the starter's stats with 0 items");
})();

// ---- (c) no tier gated behind its own loot ----------------------------------
(function(){
  let gated = 0;
  for(let n = 1; n <= E.TIER_COUNT; n++){
    const pre = drillOnly.slice();
    for(let k = 1; k < n; k++) E.tierLoot(k).forEach(id => pre.push(id));   // loot of EARLIER tiers only
    if(bestPower(E.byTier(n), setOf(pre)).power < E.byTier(n).def) gated++;
  }
  ok(gated === 0, "no tier needs its own loot (all " + E.TIER_COUNT + " beatable on drill-items + earlier loot)");
})();

// ---- (d) final tier ⇔ near-complete collection ------------------------------
(function(){
  const t100 = E.byTier(E.TIER_COUNT);
  // unbeatable with nothing
  let anyWinEmpty = false;
  H.HEROES.forEach(h => { if(E.statBattle(h, t100, {}).win) anyWinEmpty = true; });
  ok(!anyWinEmpty, "tier 100 unbeatable with 0 items (any hero)");
  // beatable at full-minus-its-own-loot (near-full)
  const finalLoot = new Set(E.tierLoot(E.TIER_COUNT));
  const nearFull = ALL.filter(id => !finalLoot.has(id));
  const champ = bestPower(t100, setOf(nearFull));
  ok(champ.power >= t100.def, "tier 100 beatable at full-minus-final-loot (" + champ.hero.id + " " + champ.power + " ≥ " + t100.def + ")");
  // one missing champion boost flips the win to a loss
  const boost = nearFull.find(id => { const it = C.byId(id); return it && it.boost && it.boost.hero === champ.hero.id; });
  ok(!!boost, "champion has a boost item to remove");
  const minusOne = setOf(nearFull.filter(id => id !== boost));
  ok(E.statBattle(champ.hero, t100, minusOne).win === false, "removing ONE champion boost flips tier 100 to a loss");
})();

// ---- (e) canAttempt still gates on the previous tier ------------------------
ok(E.canAttempt(1, {}) === true, "tier 1 always attemptable");
ok(E.canAttempt(2, {}) === false, "tier 2 locked until tier 1 cleared");
ok(E.canAttempt(2, { "tier:1": 1 }) === true, "tier 2 attemptable once tier 1 cleared");

// ---- (f cont.) def values unchanged (T43 calibration untouched) -------------
(function(){
  let mono = true, max = 0; for(let n = 1; n <= E.TIER_COUNT; n++){ const d = E.byTier(n).def; if(n > 1 && d < E.byTier(n-1).def) mono = false; if(d > max) max = d; }
  ok(mono, "def monotonic non-decreasing across all 100 tiers");
  ok(E.byTier(1).def <= 15 && E.byTier(100).def === max && E.byTier(100).def > E.byTier(99).def,
     "calibration intact: tier 1 small (" + E.byTier(1).def + "), final boss hardest (" + E.byTier(100).def + ", > t99 " + E.byTier(99).def + ")");
})();

// ---- (f cont.) live DOM drive: Fight resolves instantly, never opens a round -
(function domDrive(){
  let els = {}, store = {}, winH = {};
  function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
    parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, scrollHeight:400, scrollTop:0,
    classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
      toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
    addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
    appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
    querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; }, querySelectorAll(){ return []; }, closest(){ return null; },
    getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";} }; },
    get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }
  global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
  global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 390;
  global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = global.requestAnimationFrame;
  global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
  global.performance = { now: () => Date.now() };
  global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
  // seed a full collection so the chosen hero beats tier 1 outright
  const full = {}; C.CATALOG.forEach(it => { if(it.cat !== "Loot") full[it.id] = { ts:1 }; });
  store["halves.collected"] = JSON.stringify(full);
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  ["modes.js","guides.js","collectibles.js","heroes.js","enemies.js","main.js"].forEach(f => new Function(read(f))());
  const route = h => { global.window.location.hash = h; (winH.hashchange||[]).forEach(f=>f()); };
  route("#/arena");
  ok(els.arena.classList.contains("active"), "Arena screen active");
  // pick the first hero card, then Fight
  const heroId = (els.arenaBody._html.match(/data-hero="([^"]+)"/) || [])[1];
  ok(!!heroId, "an unlocked hero card is offered");
  // (T65) scroll down, then pick a hero — the pick re-render must NOT jump scroll
  els.arenaBody.scrollTop = 240;
  (els.arenaBody._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".arena-hero" ? { dataset:{ hero:heroId } } : null) } }));
  ok(els.arenaBody.scrollTop === 240, "selecting a hero keeps the current scroll (no jump)");
  const gameActiveBefore = els.game.classList.contains("active");
  (els.arenaFight._h.click||[]).forEach(f=>f({}));
  ok(els.game.classList.contains("active") === false && gameActiveBefore === false, "Fight never activates the game screen (no question round)");
  ok(els.arena.classList.contains("active"), "after Fight, still on the Arena screen");
  ok(els.arenaBody.scrollTop === 0, "after a fight the Arena scrolls back to the top (T65)");
  ok(/Victory!/.test(els.arenaBody._html), "instant Victory shown");
  ok(JSON.parse(store["halves.collected"])["tier:1"], "win granted tier:1 marker");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " ARENA CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
