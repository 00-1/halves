/* T84 — tech-tree view for the topic selector. Boots the app under a DOM shim
 * and asserts:
 *   (a) the graph is DERIVED FROM DATA — spine edges == `unlockedBy`, branch
 *       edges == `requires:"mastery:<id>"`; every mode appears exactly once;
 *   (b) toggling to Tree shows the tree (and hides the list) and renders a
 *       focusable node per mode with its state badge;
 *   (c) the List fallback survives the toggle (a11y path intact);
 *   (d) node states read live data (fresh profile: only halves unlocked);
 *   (e) LOCKED nodes are preview-only — selecting one never starts a round and
 *       Start stays disabled;
 *   (f) icon-forward nodes go through the single swappable nodeIcon() hook.
 * Run: node test/tech-tree.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

let els = {}, store = {}, winH = {};
function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
  parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, scrollHeight:400, scrollTop:0,
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
    toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
  addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
  appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
  querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; },
  querySelectorAll(s){ // return one stub per data-mode button so node-icon paint runs
    if(/tnode/.test(s||"")){ const ids = (this._html.match(/data-mode="([^"]+)"/g)||[]).map(x=>x.replace(/.*"([^"]+)"/, "$1"));
      return ids.map(id => ({ dataset:{ mode:id }, querySelector(){ return mkEl("_c"); } })); }
    return []; }, closest(){ return null; },
  getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";}, set imageSmoothingEnabled(v){}, get imageSmoothingEnabled(){return false;} }; },
  get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }

global.window = {}; global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 360;
global.requestAnimationFrame = () => 1; global.window.requestAnimationFrame = global.requestAnimationFrame;
global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
global.performance = { now: () => 1000 };
global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
global.setTimeout = (fn) => { if(typeof fn === "function") fn(); return 0; }; global.clearTimeout = () => {};
global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
global.window.localStorage = global.localStorage;
global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
  addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
  documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js","eventart.js","fx.js","sound.js","main.js"].forEach(f => new Function(read(f))());

const MODES = global.window.MODES, TT = global.window.TechTree, byId = id => MODES.find(m=>m.id===id);

// (a) graph derived from data
const g = TT.graph();
let spineOk = true;
for(let i=1;i<g.spine.length;i++){ if(g.spine[i].unlockedBy !== g.spine[i-1].id) spineOk = false; }
ok(g.spine.every(m => !m.requires), "spine nodes are the non-Part-2 chain (no `requires`)");
ok(spineOk, "each spine edge equals the node's `unlockedBy` (derived from data, not hardcoded)");
let branchOk = true, branchCount = 0;
Object.keys(g.branchOf).forEach(parent => { branchCount++; const m = g.branchOf[parent]; if(m.requires !== "mastery:" + parent) branchOk = false; });
ok(branchOk, "each branch edge equals the child's `requires:\"mastery:<parent>\"`");
const nodeIds = new Set(g.spine.map(m=>m.id).concat(Object.values(g.branchOf).map(m=>m.id)));
ok(nodeIds.size === MODES.length && MODES.every(m => nodeIds.has(m.id)), "every mode appears exactly once in the graph (" + nodeIds.size + "/" + MODES.length + ")");
// data-driven proof: the graph matches a fresh re-derivation from the live mode fields
ok(g.spine.length === MODES.filter(m=>!m.requires).length && branchCount === MODES.filter(m=>m.requires).length,
   "spine+branch counts match the live mode data (" + g.spine.length + "+" + branchCount + ")");

// (d) node state reads live data — fresh profile: only halves unlocked
ok(TT.state(byId("halves")) === "unlocked", "fresh profile: halves is unlocked (▶)");
ok(TT.state(byId("times")) === "locked" && TT.state(byId("addsub2")) === "locked", "fresh profile: gated topics are locked");

// (b) T96 — the tree is the ONLY home picker (no toggle), rendered at init
ok(!/id="pickerViews"/.test(read("index.html")) && !/setPickerView/.test(read("main.js")), "(b) the List/Tree toggle is removed (tree-only home)");
const nodeCount = (els.modeTree._html.match(/class="tnode/g) || []).length;
ok(nodeCount === MODES.length, "(b) a node is rendered for every mode (" + nodeCount + "/" + MODES.length + ")");
ok(/role="tab"/.test(els.modeTree._html) && /<button class="tnode/.test(els.modeTree._html), "(b) nodes are focusable <button> elements (a11y, not a canvas blob)");

// (e) locked node is preview-only — never starts a round; the compact info row updates
const clickNode = id => (els.modeTree._h.click||[]).forEach(f => f({ target:{ closest:s => (s===".tnode" ? { dataset:{ mode:id } } : null) } }));
els.game.classList.remove("active");
clickNode("squares");   // locked on a fresh profile
ok(!els.game.classList.contains("active"), "(e) tapping a locked node never starts a round");
ok(els.startBtn.disabled === true, "(e) Start stays disabled for the previewed locked node");
ok(/ti-name/.test(els.topicInfo._html) && /Squares/.test(els.topicInfo._html), "(e) the selected-topic info row shows the locked topic");
ok(/🔒/.test(els.topicInfo._html), "(e) the info row shows the unlock requirement for a locked topic");

// (c) the accessible LIST fallback now lives on Best Times (#sumList), tap-to-play
global.window.location.hash = "#/best-times"; (winH.hashchange||[]).forEach(f=>f());
ok(/sum-row/.test(els.sumList._html), "(c) the Best Times list fallback still renders its rows (accessible alternative)");
ok(/data-mode=/.test(els.sumList._html), "(c) the Best Times list is tap-to-play (the a11y fallback to the tree)");

// (f) the swappable nodeIcon() hook is the single icon indirection
const main = read("main.js");
ok(/function nodeIcon\(/.test(main) && /nodeIcon\(m, cv\)/.test(main), "(f) nodes render via a single swappable nodeIcon() hook");
ok(/Glyphs\.draw\(cv/.test(main), "(f) nodeIcon currently uses the T56 pixel glyph (replaceable later)");
// no hand-maintained parallel edge list (graph reads the live fields)
ok(/m\.unlockedBy/.test(main) && /mastery:\(\.\+\)/.test(main), "the graph reads live unlockedBy/requires fields (no parallel edge list)");

// (g) T106 — tech-tree v2: rows fill the width with 1–3 PARTS abreast, two
// distinct directional state-coloured connectors, the part-chain derived LIVE.
ok(/while\(g\.branchOf\[cur\.id\]\)/.test(main), "(g) the part-chain is FOLLOWED from live `requires` (handles depth 1/2/3, no parallel list)");
const tree = els.modeTree._html;
ok(/class="tchain (lit|dim)"/.test(tree), "(g) a VERTICAL chain connector (state-coloured) links consecutive topics");
ok(/class="tbranch (lit|dim)"/.test(tree), "(g) a HORIZONTAL mastery connector (state-coloured) links a topic's parts (distinct from the chain)");
ok(/isUnlocked\(next\) \? "lit" : "dim"/.test(main) && /isUnlocked\(p\) \? "lit" : "dim"/.test(main), "(g) both connectors are lit/dim by LIVE unlock state (the path you've opened reads lit)");
// the connector COUNTS are derived from the live graph (data-driven, varying depth)
const spineLen = MODES.filter(m => !m.requires).length, partCount = MODES.filter(m => m.requires).length;
const tchainN = (tree.match(/class="tchain /g) || []).length, tbranchN = (tree.match(/class="tbranch /g) || []).length;
ok(tchainN === spineLen - 1, "(g) exactly one chain arrow between each pair of topics (" + tchainN + " == " + (spineLen - 1) + ")");
ok(tbranchN === partCount, "(g) exactly one mastery arrow per Part-2/3 (" + tbranchN + " == " + partCount + ") — rows are as wide as the live depth");
// a multi-part topic renders a wider row (uses the width); depth is NOT forced uniform
ok(/data-parts="2"/.test(tree) && !/data-parts="0"/.test(tree), "(g) a topic with a Part-2 renders a 2-wide row; no empty rows (varying depth, not a forced grid)");
const widths = (tree.match(/data-parts="(\d+)"/g) || []).map(s => Number(s.replace(/\D/g, "")));
ok(widths.length === spineLen && widths.some(w => w === 1) && widths.some(w => w >= 2), "(g) rows span varying widths (1- AND multi-part rows present, " + spineLen + " rows)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " TECH-TREE CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
