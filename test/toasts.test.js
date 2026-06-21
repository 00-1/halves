/* T64 — mid-round toast queue: caps how many show at once (so the stack can
 * never grow down over the question) and drains the rest in order, losing none.
 * Drives the REAL window.Toasts queue under a DOM shim + a fake clock.
 * Run: node test/toasts.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// ---- fake clock: setTimeout/rAF feed a time-ordered event queue ----
let now = 0, seq = 0; const events = [];
function setT(cb, ms){ const id = ++seq; events.push({ due: now + (ms || 0), seq: id, cb, id }); return id; }
function clearT(id){ const i = events.findIndex(e => e.id === id); if(i >= 0) events.splice(i, 1); }
function step(){ if(!events.length) return false; events.sort((a,b)=> a.due - b.due || a.seq - b.seq); const e = events.shift(); now = e.due; e.cb(); return true; }

// ---- minimal DOM shim with real appendChild/remove + classList ----
const els = {}; const store = {};
function mkEl(id){ const el = { id, _kids:[], parentNode:null, _html:"", dataset:{}, style:{}, disabled:false, width:48, height:48,
  classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, toggle(c,f){ const has=this._s.has(c); if(f===undefined){has?this._s.delete(c):this._s.add(c);return !has;} f?this._s.add(c):this._s.delete(c); return !!f; }, contains(c){return this._s.has(c);} },
  className:"",
  appendChild(c){ if(c.parentNode){ const k=c.parentNode._kids; const i=k.indexOf(c); if(i>=0)k.splice(i,1); } c.parentNode=el; el._kids.push(c); return c; },
  remove(){ if(el.parentNode){ const k=el.parentNode._kids, i=k.indexOf(el); if(i>=0)k.splice(i,1); el.parentNode=null; } },
  addEventListener(){}, removeEventListener(){}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, focus(){}, blur(){},
  querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; }, querySelectorAll(){ return []; }, closest(){ return null; },
  getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";} }; },
  getBoundingClientRect(){ return { left:0, top:0, width:10, height:10 }; },
  get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text||"";}, set textContent(v){this._text=String(v);} };
  return el; }
global.window = {}; global.window.addEventListener = () => {}; global.window.removeEventListener = () => {};
global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 390;
global.requestAnimationFrame = cb => setT(cb, 0); global.window.requestAnimationFrame = global.requestAnimationFrame;
global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = () => {};
global.performance = { now: () => now };
global.setTimeout = setT; global.clearTimeout = clearT; global.setInterval = () => 0; global.clearInterval = () => {};
global.CSS = { escape:s=>s }; global.fetch = () => Promise.reject(new Error("no"));
global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
global.window.localStorage = global.localStorage;
global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
  addEventListener(){}, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
  documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
["modes.js","guides.js","collectibles.js","heroes.js","enemies.js","main.js"].forEach(f => new Function(read(f))());
const T = global.window.Toasts;
ok(T && typeof T.enqueue === "function", "window.Toasts queue is exposed");
ok(T.CAP === 2, "toast cap is 2");

// enqueue N=6 toasts, each builds a real shim element appended to #toasts
const box = global.document.getElementById("toasts");
let built = 0;
function buildOne(n){ return () => { built++; const el = global.document.createElement("div"); el.className = "toast"; el._n = n; box.appendChild(el); requestAnimationFrame(() => el.classList.add("show")); return el; }; }
const N = 6;
for(let i = 0; i < N; i++) T.enqueue(buildOne(i), 2000, 1100);

// run the clock, tracking the max number of slots occupied at any instant
let maxShown = 0, maxInBand = 0;
do {
  maxShown = Math.max(maxShown, T.shown());
  const live = box._kids.filter(k => /\btoast\b/.test(k.className) && !/toast-more/.test(k.className) && !k.classList.contains("hide")).length;
  maxInBand = Math.max(maxInBand, live);
} while(step());

ok(maxShown <= T.CAP, "never more than " + T.CAP + " toast slots occupied at once (peak " + maxShown + ")");
ok(maxInBand <= T.CAP, "never more than " + T.CAP + " non-dismissing toasts in the band (peak " + maxInBand + ")");
ok(built === N, "all " + N + " toasts were eventually built — none dropped (" + built + ")");
ok(T.shown() === 0 && T.queued() === 0, "queue fully drained (0 shown, 0 queued)");
const leftover = box._kids.filter(k => /\btoast\b/.test(k.className) && !/toast-more/.test(k.className)).length;
ok(leftover === 0, "no toast nodes leak after draining (" + leftover + " left)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " TOAST CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
