/* T179 — the CODEX (bestiary) tab on Inventory. A 5th tab gathering every Beast
 * (region × type), region Boss, Realm and daily Event, reusing B's Monsters/
 * Scenery/EventArt generators. Encounter-unlocked: an entry the player hasn't
 * reached yet shows as a dark SILHOUETTE named "???". Boots main.js under a DOM
 * shim with the real generators stubbed to record draws.
 * Run: node test/codex.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

const mainSrc = read("main.js"), css = read("styles.css"), wf = read("../../.github/workflows/pages.yml");

// ---- (1) static wiring -------------------------------------------------------
ok(/\{ id:"codex",\s*label:"Codex" \}/.test(mainSrc), "(1) a Codex tab is registered in INV_TABS");
ok(/function invCodexHtml\(col\)/.test(mainSrc), "(1) invCodexHtml(col) builds the tab");
ok(/invTab === "codex"\s*\? invCodexHtml\(col\)/.test(mainSrc), "(1) renderInvTab routes the codex tab");
ok(/if\(invTab === "codex"\) drawCodexCanvases\(\)/.test(mainSrc), "(1) the codex tab draws its own canvases (Monsters/Scenery/EventArt)");
(function(){ const b = mainSrc.slice(mainSrc.indexOf("function drawCodexInto"), mainSrc.indexOf("function drawCodexInto") + 700);
  ok(/M\.draw\(cv/.test(b) && /S\.buildGrid/.test(b) && /EA\.draw\(cv/.test(b), "(1) drawCodexInto dispatches to Monsters + Scenery + EventArt"); })();
// T206 — the Emblems Codex section was removed (emblems are Collector awards now)
ok(!/codexGroup\("Emblems"/.test(mainSrc) && !/codex:"emblem"/.test(mainSrc), "(1) T206: no Codex Emblems section / emblem cells remain");
ok(/\.codex-cell\.locked canvas\{filter:brightness/.test(css), "(1) locked codex entries are CSS-silhouetted (dark filter on the real sprite)");
ok(/test\/codex\.test\.js/.test(wf), "(1) this gate is registered in CI");

// ---- boot under a DOM shim ---------------------------------------------------
let els, store = {}, winH;
const draws = { beast:0, boss:0, realm:0, event:0 };
// parse the codex cells out of an HTML string → canvas stubs carrying the cell's dataset
function codexCanvases(htmlStr){
  const out = [];
  const re = /<div class="inv-cell codex-cell (owned|locked)"([^>]*)>/g; let m;
  while((m = re.exec(htmlStr))){
    const ds = { _locked: m[1] === "locked" };
    let a; const ar = /data-([a-z]+)="([^"]*)"/g;
    while((a = ar.exec(m[2]))) ds[a[1]] = a[2];
    out.push({ parentElement: { dataset: ds }, width: 48, height: 48,
      getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, set fillStyle(v){}, get fillStyle(){return"";}, set imageSmoothingEnabled(v){}, get imageSmoothingEnabled(){return false;} }; } });
  }
  return out;
}
function mkEl(id){ const e = { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
  parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, scrollHeight:400, scrollTop:0,
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
    toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
  addEventListener(ev,fn){ (this._h[ev]=this._h[ev]||[]).push(fn); }, removeEventListener(){},
  appendChild(c){ if(c && c._html != null) this._html += c._html; return c; }, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
  querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; },
  querySelectorAll(s){ return (id === "invList" && /codex-cell canvas/.test(s||"")) ? codexCanvases(this._html) : []; }, closest(){ return null; },
  getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";} }; },
  get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; return e; }
function boot(){
  els = {}; winH = {};
  global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
  global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  global.window.location = { hash:"", search:"" }; global.location = global.window.location; global.window.innerWidth = 390;
  global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = global.requestAnimationFrame;
  global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
  global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js","eventart.js","emblems.js","main.js"].forEach(f => new Function(read(f))());
  return global.window;
}

// seed: beaten tiers 1..11 → currentTier = 12 (region 0 fully met; the tier-12 boss
// reached; region 1+ still unmet). Also own one event reward.
const probe = boot();
const Ev = probe.Events, firstEvent = (Ev && Ev.roster) ? Ev.roster()[0] : null;
const col = {}; for(let n = 1; n <= 11; n++) col["tier:" + n] = { ts:1 };
if(firstEvent) col["event:" + firstEvent.id] = { ts:1 };
store["halves.collected"] = JSON.stringify(col);
const W = boot();
const E = W.Enemies, RS = E.REGION_SIZE, regions = E.TIER_COUNT / RS;

// record generator draws (drawCodexCanvases reads window.* fresh)
W.Monsters = { draw(cv){ cv.parentElement.dataset.codex === "boss" ? draws.boss++ : draws.beast++; } };
W.Scenery  = { buildGrid(){ draws.realm++; return [["#000"]]; } };
W.EventArt = { draw(){ draws.event++; } };

const tabEv = t => ({ target:{ closest:s => (s===".inv-tab" ? { dataset:{ tab:t } } : null) } });
global.window.location.hash = "#/inventory"; (winH.hashchange||[]).forEach(f=>f());
(els.invTabs._h.click||[]).forEach(f=>f(tabEv("codex")));
const html = els.invList._html;

// ---- (2) the four sections render with the right cardinality ------------------
ok(/Beasts <span>/.test(html) && /Bosses <span>/.test(html) && /Realms <span>/.test(html) && /Events <span>/.test(html), "(2) the Codex renders all four sections (Beasts/Bosses/Realms/Events)");
ok(!/Emblems <span>/.test(html), "(2) T206: the Emblems Codex section is gone");
const count = re => (html.match(re) || []).length;
const beasts = count(/data-codex="beast"/g), bossesN = count(/data-codex="boss"/g), realmsN = count(/data-codex="realm"/g), eventsN = count(/data-codex="event"/g);
ok(beasts === regions * 3, "(2) Beasts = region × type = " + (regions*3) + " (" + beasts + ")");
ok(bossesN === regions, "(2) Bosses = one per region = " + regions + " (" + bossesN + ")");
ok(realmsN === regions, "(2) Realms = one per region = " + regions + " (" + realmsN + ")");
ok(eventsN === (Ev && Ev.roster ? Ev.roster().length : 14), "(2) Events = the full roster (" + eventsN + ")");

// ---- (3) encounter gating: reached tier 12 → region 0 met, region 1+ silhouettes
(function(){
  // realm cells in document order are regions 0..9; region 0 reached, region 1 not
  const realmCells = [...html.matchAll(/codex-cell (owned|locked)"[^>]*data-codex="realm"[^>]*data-region="(\d+)"/g)];
  const r0 = realmCells.find(m => m[2] === "0"), r1 = realmCells.find(m => m[2] === "1");
  ok(r0 && r0[1] === "owned", "(3) Realm of region 0 is DISCOVERED (the player has been there)");
  ok(r1 && r1[1] === "locked", "(3) Realm of region 1 is a locked silhouette (not yet reached)");
  // the tier-12 boss is reached (currentTier===12) → discovered; region-1 boss locked
  const bossCells = [...html.matchAll(/codex-cell (owned|locked)"[^>]*data-codex="boss"[^>]*data-n="(\d+)"/g)];
  const b12 = bossCells.find(m => m[2] === "12"), b24 = bossCells.find(m => m[2] === "24");
  ok(b12 && b12[1] === "owned", "(3) the region-0 boss (tier 12) is discovered once reached");
  ok(b24 && b24[1] === "locked", "(3) the region-1 boss (tier 24) is still a silhouette");
  // locked entries are named "???"
  ok(/<canvas[^>]*><\/canvas><span class="inv-name">\?\?\?<\/span>/.test(html), "(3) a locked entry is named ??? (the tease)");
})();

// ---- (4) the event we own is discovered; an un-owned one is a silhouette -------
(function(){
  const evCells = [...html.matchAll(/codex-cell (owned|locked)"[^>]*data-codex="event"[^>]*data-seed="(\d+)"/g)];
  const owned = evCells.filter(m => m[1] === "owned").length;
  ok(owned === 1, "(4) exactly the one owned event reward is discovered (" + owned + ")");
})();

// ---- (5) drawing dispatches to every generator --------------------------------
ok(draws.beast === beasts && draws.boss === bossesN && draws.realm === realmsN && draws.event === eventsN,
   "(5) drawCodexCanvases drew every cell via the right generator (beast " + draws.beast + " / boss " + draws.boss + " / realm " + draws.realm + " / event " + draws.event + ")");

// ---- (6) T187: tapping a Codex cell opens the DETAIL popup ---------------------
(function(){
  // cells carry the name + where-found as data-cname / data-sub (for the popup)
  ok(/data-cname="[^"]+" data-sub="[^"]*"/.test(html), "(6) Codex cells carry data-cname + data-sub for the detail popup");
  // fire the #invList click handler with a synthetic OWNED boss cell
  const fire = cell => (els.invList._h.click||[]).forEach(f => f({ target:{ closest:s => (s === ".inv-cell" || s === ".codex-cell") ? cell : null } }));
  const grid = () => global.document.getElementById("unlockGrid"), title = () => global.document.getElementById("unlockTitle");
  const ownedBoss = { classList:{ contains:c => c === "codex-cell" || c === "owned" },
    dataset:{ codex:"boss", n:"12", type:"Brawn", cname:"Goblin King", sub:"Boss · Goblin Warren · Brawn" } };
  grid().innerHTML = ""; title().textContent = "";
  fire(ownedBoss);
  ok(title().textContent === "Boss", "(6) tapping a boss cell opens the popup titled 'Boss' (" + title().textContent + ")");
  ok(/Goblin King/.test(grid()._html), "(6) the popup shows the entry name");
  ok(/Boss · Goblin Warren · Brawn/.test(grid()._html), "(6) the popup shows the category / where-found line");
  // a LOCKED cell → the ??? tease, no name/where-found revealed
  const lockedRealm = { classList:{ contains:c => c === "codex-cell" },
    dataset:{ codex:"realm", region:"5", cname:"Drownholm", sub:"Realm · region 6 of 10" } };
  grid().innerHTML = ""; title().textContent = "";
  fire(lockedRealm);
  ok(title().textContent === "Realm", "(6) a locked cell still opens its category popup");
  ok(/\?\?\?/.test(grid()._html) && !/Drownholm/.test(grid()._html), "(6) a locked entry shows ??? (the tease), not its real name");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " CODEX CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
