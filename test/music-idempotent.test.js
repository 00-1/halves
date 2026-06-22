/* T164 — music switching is IDEMPOTENT. Moving between same-music screens
 * (home↔settings↔audio↔inventory↔heroes all map to the "menu" context) must NOT
 * trigger setContext/setMusic/swapNow/start — the owner heard the same track
 * restart on every screen change, and that needless re-trigger is also the
 * likely foghorn root on screen change. A REAL change (menu → lofi on game
 * start, → arena, a different solve topic, the picker preview) DOES switch.
 *
 * The test boots main.js with a stub Synth that records every setContext call
 * and a controllable musicPlaying flag, drives screens directly via show(), and
 * asserts the recorded setContext count after each transition.
 * Run: node test/music-idempotent.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// ---- (1) static: musicForScreen guards on a curMusicKey + skips on a match --
(function staticDesign(){
  const main = read("main.js");
  ok(/let curMusicKey = null/.test(main), "(1) main.js declares the curMusicKey tracker");
  ok(/curMusicKey === targetKey && Sy\.musicPlaying[\s\S]{0,200}return;/.test(main),
     "(1) musicForScreen returns early when target equals curMusicKey AND music is still playing");
  ok(/curMusicKey = name \+ ":" \+ s/.test(main), "(1) synthSwitchContext updates curMusicKey on a successful switch");
  ok(/curMusicKey = null/.test(main), "(1) curMusicKey is cleared when music stops (e.g. resyncMusic)");
})();

// ---- (2) live boot: stub the Synth + drive screens via show() ---------------
(function boot(){
  const sy = { contexts:[], musics:[], swaps:0, starts:0, stops:0, _playing:false };
  global.window = {};
  const stubCtx = { _isCtx:true, currentTime:0, state:"running", sampleRate:48000, resume(){}, suspend(){}, createGain(){ return { gain:{value:0}, connect(){}, disconnect(){} }; } };
  const CTX = {
    menu:    { tempo:96,  mode:"ionian",    progression:[0,3,4,0], reverb:0.26, patches:{ bass:"bass" } },
    lofi:    { tempo:76,  mode:"dorian",    progression:[0,5,3,4], reverb:0.42, patches:{ bass:"bass" } },
    arena:   { tempo:124, mode:"phrygian",  progression:[0,5,6,4], reverb:0.16, patches:{ bass:"wub"  } },
    bigroom: { tempo:128, mode:"lydian",    progression:[0,3,4,5], reverb:0.26, patches:{ bass:"bass" } }
  };
  global.window.Synth = {
    mount(){ return this; }, output(){ return { connect(){}, disconnect(){} }; },
    setMusic(s){ sy.musics.push(s); return this; },
    setContext(name){ sy.contexts.push(name); return this; },
    setReverb(){ return this; }, intensity(){ return this; }, play(){ return this; }, duck(){ return this; },
    setMuted(){ return this; }, sting(){ return this; }, swapNow(){ sy.swaps++; return this; },
    start(){ sy.starts++; sy._playing = true; return this; },
    stop(){ sy.stops++; sy._playing = false; return this; },
    musicPlaying(){ return sy._playing; },
    CONTEXTS: CTX, hashStr(s){ let h = 2166136261 >>> 0; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  };
  global.window.Sound = {
    unlock(){}, ctx(){ return stubCtx; }, master(){ return { connect(){}, disconnect(){}, gain:{value:0} }; },
    setMuted(){}, setVolume(){}, setSfxVolume(){}, getVolume(){ return 0.8; }, VOL_MAX:4, SFX_MAX:1, isMuted(){ return false; },
    correct(){}, skip(){}, item(){}, gold(){}, topicUnlock(){}, mastery(){}, topic100(){}, roundStart(){}, roundComplete(){}, play(){}, sfxSpec(){ return { v:[] }; }
  };
  let els = {}, store = {}, winH = {}, docH = {};
  function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
    parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, scrollHeight:400, scrollTop:0,
    classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
      toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
    addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
    appendChild(c){ if(c && typeof c._html === "string") this._html += c._html; return c; }, insertBefore(){}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
    querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; }, querySelectorAll(){ return []; }, closest(){ return null; },
    getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";} }; },
    get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }
  global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
  global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 390;
  global.requestAnimationFrame = fn => { if(typeof fn === "function") fn(0); return 1; }; global.window.requestAnimationFrame = global.requestAnimationFrame;
  global.cancelAnimationFrame = () => {}; global.window.cancelAnimationFrame = global.cancelAnimationFrame;
  global.performance = { now: () => 1000 }; global.CSS = { escape:s=>s };
  global.fetch = () => Promise.reject(new Error("no")); global.setInterval = () => 0; global.clearInterval = () => {};
  global.setTimeout = fn => { if(typeof fn === "function") fn(); return 0; }; global.clearTimeout = () => {};
  store["halves.unlocked"] = JSON.stringify({ legacy:1 });
  global.localStorage = { getItem:k => k in store ? store[k] : null, setItem:(k,v)=>{ store[k]=String(v); }, removeItem:k=>{ delete store[k]; } };
  global.window.localStorage = global.localStorage;
  global.document = { getElementById(id){ return els[id] || (els[id]=mkEl(id)); }, createElement(t){ return mkEl("_"+t); },
    addEventListener(e,fn){ (docH[e]=docH[e]||[]).push(fn); }, removeEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];},
    documentElement:mkEl("html"), body:mkEl("body"), fullscreenElement:null };
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js","eventart.js","fx.js","icons.js"].forEach(f => new Function(read(f))());
  new Function(read("main.js"))();

  // The entry-gesture path (T101) wires Synth + starts the music; click to boot.
  (els.entryPlay._h.click||[]).forEach(f=>f({}));
  const ctxAfterBoot = sy.contexts.length, swapsAfterBoot = sy.swaps;
  ok(ctxAfterBoot >= 1, "(2) boot: the entry gesture started music once (curMusicKey set) — contexts=" + ctxAfterBoot);

  // ---- (3) home → settings → audio → inventory → heroes are ALL "menu" -------
  // The hash-route is the live path; each route triggers applyRoute → show().
  const route = h => { global.window.location.hash = h; (winH.hashchange||[]).forEach(f=>f()); };
  const ctxBefore = sy.contexts.length, swapsBefore = sy.swaps, startsBefore = sy.starts;
  route("#/settings");
  route("#/audio");
  route("#/");        // back to home
  route("#/inventory");
  route("#/heroes");
  ok(sy.contexts.length === ctxBefore, "(3) T164: 5 same-music screen changes (settings/audio/home/inventory/heroes) trigger ZERO new setContext calls (was 5+ — the bug) — " + (sy.contexts.length - ctxBefore));
  ok(sy.swaps === swapsBefore, "(3) T164: …and ZERO swapNow calls (no audible re-trigger)");
  ok(sy.starts === startsBefore, "(3) T164: …and ZERO start calls (no needless engine restart)");

  // ---- (4) home → arena is a REAL change (menu → arena) → DOES switch --------
  const ctxBeforeArena = sy.contexts.length;
  route("#/arena");
  ok(sy.contexts.length > ctxBeforeArena, "(4) T164: a real context change (menu→arena) DOES trigger setContext (" + (sy.contexts.length - ctxBeforeArena) + ")");
  const lastCtx = sy.contexts[sy.contexts.length - 1];
  ok(lastCtx === "arena", "(4) the switched-to context is 'arena' (the destination)");

  // ---- (5) arena → settings (different) → arena (back) → real switches -------
  const ctxBefore5 = sy.contexts.length;
  route("#/settings");
  ok(sy.contexts.length > ctxBefore5, "(5) arena → settings is a real change (arena → menu) → fires setContext");
  const ctxBefore5b = sy.contexts.length;
  route("#/arena");
  ok(sy.contexts.length > ctxBefore5b, "(5) settings → arena (back) is a real change (menu → arena) → fires setContext");

  // ---- (6) menu → menu re-visit is a no-op (idempotency holds after a hop) ---
  const ctxBefore6 = sy.contexts.length;
  route("#/settings");
  route("#/audio");
  ok(sy.contexts.length === ctxBefore6 + 1, "(6) the FIRST return to menu fires setContext exactly once (arena→menu transition); the second menu screen is silent");

  // ---- (7) after the engine STOPS (visibility hide), the next entry re-keys -
  // resyncMusic clears curMusicKey via Synth.stop; the next musicForScreen MUST re-start.
  global.document.hidden = true; (docH.visibilitychange||[]).forEach(f=>f({}));
  ok(sy.stops >= 1, "(7) hide stops the engine");
  const ctxBeforeReturn = sy.contexts.length;
  global.document.hidden = false; (docH.visibilitychange||[]).forEach(f=>f({}));
  ok(sy.contexts.length > ctxBeforeReturn, "(7) on return the music re-syncs (curMusicKey was cleared, so the same-music guard doesn't block the restart)");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " MUSIC-IDEMPOTENT CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
