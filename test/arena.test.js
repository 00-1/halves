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
["modes.js","events.js","collectibles.js","heroes.js","enemies.js"].forEach(f => new Function(read(f))());
const C = global.window.Collectibles, H = global.window.Heroes, E = global.window.Enemies;

// ---- (f) API shape: stat-only, perf machinery gone -------------------------
ok(typeof E.statBattle === "function", "Enemies.statBattle exists");
ok(E.resolveBattle === undefined && E.computePerf === undefined, "perf-scaled resolveBattle/computePerf removed");
const mainSrc = read("main.js");
ok(mainSrc.indexOf("BATTLE_MODE") < 0, "main.js: BATTLE_MODE synthetic mode gone");
// T89: the Fight now resolves the 1–3 hero PARTY through the deterministic team
// sim (Enemies.teamBattle), not the 1v1 statBattle — still no maths round.
ok(/function startBattle[\s\S]*?finishBattle\(party/.test(mainSrc), "Fight (startBattle) resolves via teamBattle→finishBattle(party), no round");
const sbStart = mainSrc.indexOf("function startBattle");
const sbBody = mainSrc.slice(sbStart, mainSrc.indexOf("\n  function ", sbStart + 1));
ok(sbBody.indexOf("beginRound") < 0 && sbBody.indexOf("teamBattle") >= 0, "Fight path never calls beginRound (no question round) — resolves via the team sim");

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
  const tF = E.byTier(E.TIER_COUNT);   // the final tier (120)
  // unbeatable with nothing
  let anyWinEmpty = false;
  H.HEROES.forEach(h => { if(E.statBattle(h, tF, {}).win) anyWinEmpty = true; });
  ok(!anyWinEmpty, "final tier unbeatable with 0 items (any hero)");
  // beatable at full-minus-its-own-loot (near-full)
  const finalLoot = new Set(E.tierLoot(E.TIER_COUNT));
  const nearFull = ALL.filter(id => !finalLoot.has(id));
  const champ = bestPower(tF, setOf(nearFull));
  ok(champ.power >= tF.def, "final tier beatable at full-minus-final-loot (" + champ.hero.id + " " + champ.power + " ≥ " + tF.def + ")");
  // one missing champion boost flips the win to a loss
  const boost = nearFull.find(id => { const it = C.byId(id); return it && it.boost && it.boost.hero === champ.hero.id; });
  ok(!!boost, "champion has a boost item to remove");
  const minusOne = setOf(nearFull.filter(id => id !== boost));
  ok(E.statBattle(champ.hero, tF, minusOne).win === false, "removing ONE champion boost flips the final tier to a loss");
})();

// ---- (e) canAttempt still gates on the previous tier ------------------------
ok(E.canAttempt(1, {}) === true, "tier 1 always attemptable");
ok(E.canAttempt(2, {}) === false, "tier 2 locked until tier 1 cleared");
ok(E.canAttempt(2, { "tier:1": 1 }) === true, "tier 2 attemptable once tier 1 cleared");

// ---- (f cont.) 120-tier structure + monotonic, calibrated def ---------------
(function(){
  ok(E.TIER_COUNT === 120, "TIER_COUNT is 120 (10 regions × 12)");
  let mono = true, max = 0; for(let n = 1; n <= E.TIER_COUNT; n++){ const d = E.byTier(n).def; if(n > 1 && d < E.byTier(n-1).def) mono = false; if(d > max) max = d; }
  ok(mono, "def monotonic non-decreasing across all " + E.TIER_COUNT + " tiers");
  const N = E.TIER_COUNT;
  ok(E.byTier(1).def <= 15 && E.byTier(N).def === max && E.byTier(N).def > E.byTier(N-1).def,
     "calibration intact: tier 1 small (" + E.byTier(1).def + "), final boss hardest (" + E.byTier(N).def + ", > t" + (N-1) + " " + E.byTier(N-1).def + ")");
  // every tier name is non-blank; the 12th of each region is the named boss
  const BOSSES = ["Goblin King","The Highwayman","Old Mother Bramble","Gurgle, King of the Bog","The Frost Jarl","Bonecaller","Cindermaw","Voltan, Lord of Storms","the Elder Wyrm","The Void Sovereign"];
  let blank = 0, bossOk = 0; for(let n = 1; n <= N; n++){ const nm = E.byTier(n).name; if(!nm || /undefined|^\s*$/.test(nm)) blank++; }
  for(let r = 0; r < 10; r++){ if(E.byTier(r*12 + 12).name === BOSSES[r]) bossOk++; }
  ok(blank === 0, "all 120 tier names are non-blank (no undefined/empty)");
  ok(bossOk === 10, "a named boss sits at every 12th tier (12/24/…/120) — " + bossOk + "/10");
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
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","main.js"].forEach(f => new Function(read(f))());
  const route = h => { global.window.location.hash = h; (winH.hashchange||[]).forEach(f=>f()); };
  route("#/arena");
  ok(els.arena.classList.contains("active"), "Arena screen active");
  // ---- T89: the enemy TEAM of 3 is shown (the tier foe + 2 weaker adds) -------
  ok((els.arenaBody._html.match(/af-foe/g) || []).length === 3, "T89: the 3-foe enemy team is displayed (foe + 2 adds)");
  ok(/Enemy team/.test(els.arenaBody._html), "T89: the enemy-team panel is labelled");
  // every offered pick card is an OWNED hero — locked/unowned never appear here
  const heroIds = (els.arenaBody._html.match(/class="arena-hero[^"]*" data-hero="([^"]+)"/g) || [])
    .map(s => (s.match(/data-hero="([^"]+)"/) || [])[1]);
  ok(heroIds.length >= 4, "T89: several OWNED heroes are offered for the party (" + heroIds.length + ")");
  const ownedSet = new Set(H.HEROES.filter(h => H.isHeroUnlocked(h, full)).map(h => h.id));
  ok(heroIds.every(id => ownedSet.has(id)), "T89: only owned (unlocked) heroes can be fielded — locked excluded");
  const pick = id => (els.arenaBody._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".arena-hero" ? { dataset:{ hero:id } } : null) } }));
  const badges = () => (els.arenaBody._html.match(/class="ah-badge"/g) || []).length;
  // ---- T89: party selection rules — 1–3, capped, deselect, no jump -----------
  els.arenaBody.scrollTop = 240;
  pick(heroIds[0]);
  ok(els.arenaBody.scrollTop === 240, "selecting a hero keeps the current scroll (no jump)");
  pick(heroIds[1]); pick(heroIds[2]);
  ok(badges() === 3 && /ap-count">3\/3</.test(els.arenaBody._html), "T89: the party fills to 3/3 (three heroes selected)");
  pick(heroIds[3]);   // a 4th pick must be rejected — the party is capped at 3
  ok(badges() === 3 && /ap-count">3\/3</.test(els.arenaBody._html), "T89: a 4th hero can't be added (party capped at 3)");
  pick(heroIds[0]);   // tapping a selected hero removes it
  ok(badges() === 2, "T89: tapping a selected hero removes it from the party (1–3 allowed)");
  pick(heroIds[0]);   // back to a full party of 3 for the fight
  ok(badges() === 3, "T89: re-adding refills the party to 3");
  // ---- the team fight resolves instantly via the sim (no maths round) --------
  const gameActiveBefore = els.game.classList.contains("active");
  (els.arenaFight._h.click||[]).forEach(f=>f({}));
  ok(els.game.classList.contains("active") === false && gameActiveBefore === false, "Fight never activates the game screen (no question round)");
  ok(els.arena.classList.contains("active"), "after Fight, still on the Arena screen");
  ok(els.arenaBody.scrollTop === 0, "after a fight the Arena scrolls back to the top (T65)");
  ok(/Victory!/.test(els.arenaBody._html), "instant Victory shown");
  ok((els.arenaBody._html.match(/class="pix ar-port"/g) || []).length === 3, "T89: the result shows all 3 party heroes");
  ok(/standing/.test(els.arenaBody._html) && /rounds/.test(els.arenaBody._html), "T89: the result summarises the team-sim outcome (heroes standing · rounds)");
  ok(JSON.parse(store["halves.collected"])["tier:1"], "win granted tier:1 marker");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " ARENA CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
