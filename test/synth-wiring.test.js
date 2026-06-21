/* T122 — WIRE Builder-B's synth.js (window.Synth) into the app as the live MUSIC
 * engine. The [A] wiring (this gate's subject) must: mount Synth on sound.js's
 * EXISTING AudioContext and route its output into sound.js's master (one chain →
 * the T113 volume + the limiter govern both); make Synth the only music scheduler
 * (sound.js's removed); route each screen to a context (#game→solve CALM, home→
 * menu, #arena→arena+intensity, event→event); fire the wub on real wins; duck the
 * music under SFX; mute/volume/tempo control it. Engine internals are B's
 * (synth.test.js); this proves the wiring, with stub Sound + Synth recording calls.
 * Run: node test/synth-wiring.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

const html = read("index.html"), main = read("main.js"), ssrc = read("sound.js"), wf = read(".github/workflows/pages.yml");

// ---- (1) mount + one shared chain ------------------------------------------
ok(/<script src="synth\.js"><\/script>/.test(html), "(1) index.html loads synth.js");
ok(html.indexOf("synth.js") < html.indexOf("main.js") && html.indexOf("sound.js") < html.indexOf("synth.js"), "(1) load order: sound.js → synth.js → main.js");
ok(/Sy\.mount\(\{ ctx: ctx \}\)/.test(main), "(1) Synth mounts on sound.js's EXISTING AudioContext (Sy.mount({ctx}))");
ok(/out\.connect\(sMaster\)/.test(main) && /S\.master\(\)/.test(main), "(1) Synth's output is routed INTO sound.js's master (one chain → T113 volume + limiter)");

// ---- (2) Synth is the only music scheduler; sound.js is SFX-only ------------
ok(!/setMusic|startScheduler|setInterval|STYLES/.test(ssrc), "(2) sound.js's music scheduler is removed (no second scheduler)");
ok(/musicForScreen\(name\)/.test(main) && !/Sound\.setMusic/.test(main), "(2) show() drives music via Synth (musicForScreen), not the old Sound.setMusic");

// ---- (3) per-screen contexts; SOLVE is calm by construction ----------------
ok(/name === "game" \? \(eventCtx \? "event" : "solve"\) : name === "arena" \? "arena" : "menu"/.test(main), "(3) screens route to contexts: game→solve/event, arena→arena, else→menu");
const solve = (main.match(/context === "solve"\)\{([\s\S]*?)\}\n/) || [])[1] || (main.match(/if\(context === "solve"\)\{([\s\S]*?)return/) || [])[1] || "";
ok(/kickK: 0/.test(solve) && /snare: new Array\(16\)\.fill\(0\)/.test(solve), "(3) the SOLVE spec is CALM by construction — no driving kick/snare (firm rule)");
ok(/SYNTH_BPM = \{ solve: 60/.test(main) && /menu: 80/.test(main), "(3) the solve tempo (60) is slower than the menu (80) — calm");
ok(/Sy\.intensity\(arenaBossProx\(\)\)/.test(main) && /facingBoss \? 1/.test(main), "(3) the Arena context drives Synth.intensity() from live boss-proximity");

// ---- (4) wins + ducking + tempo/mute ---------------------------------------
ok(/function wubSting\(\)[\s\S]{0,160}Sy\.play\("wub"/.test(main), "(4) the win-sting fires Synth's wub patch (Sy.play('wub'))");
ok(/if\(res\.win\)\{ fxCelebrateWin\(tier\.n\); wubSting\(\);/.test(main) && /cat === "Mastery"[\s\S]{0,80}wubSting\(\)/.test(main), "(4) the wub fires on a real win (Arena victory + topic-complete/mastery)");
ok(/DUCK_SFX/.test(main) && /window\.Synth\.duck\(\)/.test(main), "(4) the louder SFX stings DUCK the music (Synth.duck)");
ok(/window\.Synth\.setMuted\(!on\)/.test(main), "(4) mute silences Synth too (applySoundPref)");
ok(/synthTempoMult\(\)/.test(main) && /loadTempo\(\) \/ 100/.test(main), "(4) the T113 tempo slider drives the Synth context tempo");

// ---- (5) the gates are registered in CI ------------------------------------
ok(/test\/synth\.test\.js/.test(wf), "(5) Builder-B's engine gate test/synth.test.js is registered in CI");
ok(/test\/synth-wiring\.test\.js/.test(wf), "(5) this wiring gate test/synth-wiring.test.js is registered in CI");

// ============ live boot: drive the wiring with stub Sound + Synth ============
(function boot(){
  const sy = { mounts: [], musics: [], starts: 0, stops: 0, intensities: [], plays: [], ducks: 0, muted: null, routedTo: null };
  global.window = {};
  const masterNode = { _isMaster: true };
  const stubCtx = { _isCtx: true, currentTime: 0, state: "running", resume(){}, suspend(){} };
  global.window.Synth = {
    mount(o){ sy.mounts.push(o); return this; },
    output(){ return { disconnect(){}, connect(t){ sy.routedTo = t; } }; },
    setMusic(s){ sy.musics.push(s); return this; }, start(){ sy.starts++; return this; }, stop(){ sy.stops++; return this; },
    intensity(x){ sy.intensities.push(x); return this; }, play(p, w, o){ sy.plays.push({ p: p, o: o }); return this; },
    duck(){ sy.ducks++; return this; }, setMuted(m){ sy.muted = m; return this; }
  };
  let store = {};
  global.window.Sound = {
    unlock(){}, ctx(){ return stubCtx; }, master(){ return masterNode; }, setMuted(){}, setVolume(){}, getVolume(){ return 0.8; }, VOL_MAX: 4, isMuted(){ return false; },
    correct(){}, skip(){}, item(){}, gold(){}, topicUnlock(){}, mastery(){}, topic100(){}, roundStart(){}, roundComplete(){}, play(){}, sfxSpec(){ return { v: [] }; }
  };
  let els = {}, winH = {};
  function mkEl(id){ return { id, _html:"", _text:"", _h:{}, dataset:{}, style:{}, disabled:false,
    parentElement:{ clientWidth:300, dataset:{} }, width:48, height:48, scrollWidth:120, clientWidth:300, clientHeight:300, scrollHeight:400, scrollTop:0,
    classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
      toggle(c,f){ if(f===undefined){ this._s.has(c)?this._s.delete(c):this._s.add(c); return this._s.has(c);} else { f?this._s.add(c):this._s.delete(c); return !!f; } }, contains(c){return this._s.has(c);} },
    addEventListener(e,fn){ (this._h[e]=this._h[e]||[]).push(fn); }, removeEventListener(){},
    appendChild(c){return c;}, insertBefore(c){return c;}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, remove(){}, focus(){}, blur(){},
    querySelector(s){ return /canvas/.test(s||"") ? mkEl("_c") : null; }, querySelectorAll(){ return []; }, closest(){ return null; },
    getContext(){ return { clearRect(){}, fillRect(){}, save(){}, restore(){}, beginPath(){}, fill(){}, set fillStyle(v){}, get fillStyle(){return"";}, set imageSmoothingEnabled(v){}, get imageSmoothingEnabled(){return false;} }; },
    get innerHTML(){return this._html;}, set innerHTML(v){this._html=String(v);}, get textContent(){return this._text;}, set textContent(v){this._text=String(v);} }; }
  global.window.addEventListener = (e,f) => { (winH[e]=winH[e]||[]).push(f); }; global.window.removeEventListener = () => {};
  global.window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  global.window.location = { hash:"" }; global.location = global.window.location; global.window.innerWidth = 390;
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
  ["modes.js","events.js","guides.js","collectibles.js","heroes.js","enemies.js","monsters.js","scenery.js","eventart.js","fx.js","icons.js"].forEach(f => new Function(read(f))());
  const C = global.window.Collectibles;
  const full = {}; C.CATALOG.forEach(it => { if(it.cat !== "Loot") full[it.id] = { ts:1 }; });
  store["halves.collected"] = JSON.stringify(full);
  store["halves.tempo"] = "100";   // 1.0× so the base context tempos show through (the wiring, not the calibrated default)
  new Function(read("main.js"))();

  const route = h => { global.window.location.hash = h; (winH.hashchange||[]).forEach(f=>f()); };
  // the entry "Play" gesture unlocks audio → setupSynth mounts + routes
  (els.entryPlay._h.click||[]).forEach(f=>f({}));
  ok(sy.mounts.length === 1 && sy.mounts[0].ctx === stubCtx, "boot: the entry gesture mounts Synth on sound.js's ctx");
  ok(sy.routedTo === masterNode, "boot: Synth's output is routed into sound.js's master (one chain)");
  ok(sy.musics.length >= 1 && sy.starts >= 1, "boot: music starts on entering the app");

  // Arena → an arena context + a boss-proximity intensity
  const beforeI = sy.intensities.length;
  route("#/arena");
  const am = sy.musics[sy.musics.length - 1];
  ok(am && am.tempo >= 80 && am.mode === "phrygian", "boot: the Arena plays a driving context (phrygian, faster) — " + (am && am.tempo));
  ok(sy.intensities.length > beforeI && typeof sy.intensities[sy.intensities.length-1] === "number", "boot: the Arena sets Synth.intensity() from live boss-proximity");

  // home → the menu context
  route("#/");
  const mm = sy.musics[sy.musics.length - 1];
  ok(mm && mm.mode === "ionian" && mm.tempo === 80, "boot: home plays the menu context (ionian, 80)");

  // a real Arena WIN fires the wub (and ducks)
  route("#/arena");
  const heroId = (els.arenaBody._html.match(/data-hero="([^"]+)"/) || [])[1];
  ok(!!heroId, "boot: the Arena offers a hero");
  (els.arenaBody._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".arena-hero" ? { dataset:{ hero:heroId } } : null) } }));
  (els.arenaFight._h.click||[]).forEach(f=>f({}));
  ok(sy.plays.some(p => p.p === "wub"), "boot: a real Arena win fires the Synth wub win-sting");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " SYNTH-WIRING CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
