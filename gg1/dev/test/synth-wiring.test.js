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

const html = read("index.html"), main = read("main.js"), ssrc = read("sound.js"), wf = read("../../.github/workflows/pages.yml"), css = read("styles.css");

// ---- (1) mount + one shared chain ------------------------------------------
ok(/<script src="synth\.js"><\/script>/.test(html), "(1) index.html loads synth.js");
ok(html.indexOf("synth.js") < html.indexOf("main.js") && html.indexOf("sound.js") < html.indexOf("synth.js"), "(1) load order: sound.js → synth.js → main.js");
ok(/Sy\.mount\(\{ ctx: ctx \}\)/.test(main), "(1) Synth mounts on sound.js's EXISTING AudioContext (Sy.mount({ctx}))");
ok(/out\.connect\(sMaster\)/.test(main) && /S\.master\(\)/.test(main), "(1) Synth's output is routed INTO sound.js's master (one chain → T113 volume + limiter)");

// ---- (2) Synth is the only music scheduler; sound.js is SFX-only ------------
ok(!/setMusic|startScheduler|setInterval|STYLES/.test(ssrc), "(2) sound.js's music scheduler is removed (no second scheduler)");
ok(/musicForScreen\(name\)/.test(main) && !/Sound\.setMusic/.test(main), "(2) show() drives music via Synth (musicForScreen), not the old Sound.setMusic");

// ---- (3) per-screen contexts via the DISTINCT engine contexts (T128) --------
// T140 — routing decoupled from style names: game→calm Lo-Fi (event→Festival), arena→arena, else→menu.
ok(/name === "game" \? \(eventCtx \? "bigroom" : "lofi"\) : name === "arena" \? "arena" : "menu"/.test(main), "(3) T140: screens route to B's named styles (game→lofi/bigroom, arena→arena, else→menu)");
// T128(1): musicForScreen drives the engine's distinct context (setContext via
// synthSwitchContext) — NOT the old flat musicSpec() that shared one default chord set
ok(/function musicForScreen\([\s\S]{0,2400}synthSwitchContext\(context/.test(main), "(3) T128: per-screen music drives the DISTINCT context (synthSwitchContext), not a flat spec");
ok(!/function musicSpec\(/.test(main) && !/SYNTH_BPM/.test(main), "(3) T128: the old musicSpec()/SYNTH_BPM partial specs (no progression → same chords) are GONE");
ok(/context === "lofi"[\s\S]{0,140}mode\.music/.test(main), "(3) T140: the calm solve (Lo-Fi) varies per topic (its seed mixes in mode.music)");
ok(/function synthSwitchContext\([\s\S]{0,900}Sy\.swapNow\(\)/.test(main), "(3) T132: a switch swaps the generator NOW (Synth.swapNow) — instant, not a far phrase boundary");
ok(/Sy\.intensity\(arenaBossProx\(\)\)/.test(main) && /facingBoss \? 1/.test(main), "(3) the Arena context drives Synth.intensity() from live boss-proximity");

// ---- (4) wins + ducking + tempo/mute ---------------------------------------
// T128(2): the win cue uses the engine's purpose-built victory STING (wub + bells on
// the SFX bus) — the old hand-rolled play("wub",{bus:"music"})+duck ducked its OWN wub.
ok(/function wubSting\(\)[\s\S]{0,200}Sy\.sting\("victory"\)/.test(main), "(4) T128: the win-sting uses Synth.sting('victory') (wub on the un-ducked SFX bus)");
ok(!/Sy\.play\("wub"[^)]*bus: "music"/.test(main), "(4) T128: the wub is no longer played on the (ducked) MUSIC bus → it isn't self-suppressed");
ok(/if\(res\.win\)\{[\s\S]{0,120}fxCelebrateWin\(tier\.n, foe\); wubSting\(\);/.test(main) && /cat === "Mastery"[\s\S]{0,80}wubSting\(\)/.test(main), "(4) the win-sting fires on a real win (Arena victory + topic-complete/mastery)");
ok(/DUCK_SFX/.test(main) && /window\.Synth\.duck\(\)/.test(main), "(4) the louder SFX stings DUCK the music (Synth.duck)");
ok(/window\.Synth\.setMuted\(!on\)/.test(main), "(4) mute silences Synth too (applySoundPref)");
ok(/function synthTempoMult\(\)\{ return 1; \}/.test(main), "(4) T224: tempo is LOCKED to the engine's native BPM (synthTempoMult → 1; the slider is gone)");
// T101 — Start feels instant: the gesture-required unlock/fullscreen stay sync, the
// round paints, and the heavier setupSynth build is DEFERRED off the first-paint path.
ok(/function enter\(useFs\)\{[\s\S]{0,700}Sound\.unlock\(\)[\s\S]{0,200}fsEnter\(\)[\s\S]{0,300}startIntro\(\)[\s\S]{0,80}applyRoute\(\)[\s\S]{0,700}requestAnimationFrame\(warmAudio\)/.test(main), "(4) T101: enter() unlocks audio + fullscreen (gesture) and PAINTS the round before the deferred warmAudio (no janky Start delay)");
ok(/const warmAudio = \(\) => \{ audioUnlock\(\); applySoundPref\(\); musicForScreen\(curScreen\); \}/.test(main), "(4) T101-FIX: the deferred warmAudio STARTS the music (audioUnlock + musicForScreen) — the previous defer left the first round/menu silent");

// ---- (6) T140 — the music picker offers ALL 12 of B's styles (audition each) -----
ok(/id="musicSwitch"/.test(html) && /role="group"/.test(html) && /aria-labelledby="musicLabel"/.test(html), "(6) the Audio menu has a labelled music-style picker group");
const STYLES_12 = ["menu","arena","lofi","ambient","chiptune","synthwave","dubstep","dnb","bigroom","boss8bit","tropical","techno"];
STYLES_12.forEach(n => ok(new RegExp('data-music="' + n + '"').test(html), "(6) T140: the picker offers the '" + n + "' style"));
ok((html.match(/<button type="button" class="mus-btn"[^>]*data-music=/g) || []).length === 12 && /aria-pressed="false"/.test(html), "(6) T140: all 12 styles are real, keyboard-operable <button>s with aria-pressed");
// the Dubstep style fires its signature victory DROP when auditioned
ok(/c && c\.victory && Sy\.sting\) Sy\.sting\("victory"\)/.test(main), "(6) T140: auditioning a 'victory' style (Dubstep) fires the engine's victory drop");
ok(/\.music-switch \.mus-btn\{[^}]*min-height:44px/.test(css), "(6) T129: each style button is a ≥44px tap target");
ok(/\.mus-btn\[aria-pressed="true"\]/.test(css), "(6) T129: the picked style is visibly highlighted (aria-pressed styling)");
ok(/\[data-ui="pixel"\] \.music-switch \.mus-btn/.test(css), "(6) T129: the switcher is data-ui=\"pixel\" styled (matches the chrome)");
// the wiring drives the engine's DISTINCT contexts via setContext (NOT musicSpec)
ok(/function synthSwitchContext\(name[\s\S]{0,180}!Sy \|\| !Sy\.setContext \|\| !synthWired\) return false/.test(main), "(6) T129: synthSwitchContext is a guarded no-op when Synth is absent/unwired");
ok(/function synthSwitchContext\([\s\S]{0,300}Sy\.setContext\(name\)/.test(main), "(6) T129: it drives the engine's distinct context via Synth.setContext(name) (not musicSpec)");
ok(/function synthSwitchContext\([\s\S]{0,520}synthTempoMult\(\)[\s\S]{0,260}c\.tempo \*/.test(main), "(6) T129: the T113 tempo multiplier is applied on top of the context tempo");

// ---- (5) the gates are registered in CI ------------------------------------
ok(/test\/synth\.test\.js/.test(wf), "(5) Builder-B's engine gate test/synth.test.js is registered in CI");
ok(/test\/synth-wiring\.test\.js/.test(wf), "(5) this wiring gate test/synth-wiring.test.js is registered in CI");

// ============ live boot: drive the wiring with stub Sound + Synth ============
(function boot(){
  const sy = { mounts: [], musics: [], starts: 0, stops: 0, intensities: [], plays: [], ducks: 0, muted: null, routedTo: null, contexts: [], reverbs: [], stings: [], swaps: 0 };
  global.window = {};
  const masterNode = { _isMaster: true };
  // T143 — model createGain so the [A] wire's MUSIC gain (Synth → musicGain → master)
  // is exercised (not the no-createGain fallback).
  const gainNodes = [];
  function gnode(){ const n = { _gain: true, gain: { value: 0 }, _to: [], connect(t){ this._to.push(t); }, disconnect(){} }; gainNodes.push(n); return n; }
  const stubCtx = { _isCtx: true, currentTime: 0, state: "running", resume(){}, suspend(){}, createGain: gnode };
  // the engine's DISTINCT built-in contexts (mirrors synth.js CONTEXTS shape — each
  // a different mode/progression/reverb, incl. Arena's wub bass patch).
  const CTX = {
    menu:    { tempo: 96,  mode: "ionian",     progression: [0,3,4,0], reverb: 0.26, patches: { bass: "bass" } },
    arena:   { tempo: 124, mode: "phrygian",   progression: [0,5,6,4], reverb: 0.16, patches: { bass: "wub"  } },
    lofi:    { tempo: 76,  mode: "dorian",     progression: [0,5,3,4], reverb: 0.42, patches: { bass: "bass" } },
    ambient: { tempo: 60,  mode: "lydian",     progression: [0,3,0,4], reverb: 0.55, patches: { bass: "bass" } },
    bigroom: { tempo: 128, mode: "lydian",     progression: [0,3,4,5], reverb: 0.26, patches: { bass: "bass" } },
    dubstep: { tempo: 140, mode: "pentminor",  progression: [0,0,5,3], reverb: 0.14, victory: true, patches: { bass: "wub" } }
  };
  CTX.solve = CTX.lofi; CTX.event = CTX.bigroom;   // B's back-compat aliases
  global.window.Synth = {
    mount(o){ sy.mounts.push(o); return this; },
    output(){ return { disconnect(){}, connect(t){ sy.routedTo = t; } }; },
    setMusic(s){ sy.musics.push(s); return this; }, start(){ sy.starts++; return this; }, stop(){ sy.stops++; return this; },
    intensity(x){ sy.intensities.push(x); return this; }, play(p, w, o){ sy.plays.push({ p: p, o: o }); return this; },
    duck(){ sy.ducks++; return this; }, setMuted(m){ sy.muted = m; return this; },
    sting(name){ sy.stings.push(name); return this; }, swapNow(){ sy.swaps++; return this; },
    setContext(name){ sy.contexts.push(name); const c = CTX[name]; if(c) sy.reverbs.push(c.reverb); return this; },   // real setContext applies the context's reverb
    setReverb(w){ sy.reverbs.push(w); return this; },
    CONTEXTS: CTX, hashStr(s){ let h = 2166136261 >>> 0; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  };
  let store = {};
  global.window.Sound = {
    unlock(){}, ctx(){ return stubCtx; }, master(){ return masterNode; }, setMuted(){}, setVolume(){}, setSfxVolume(v){ sy.sfxVol = v; }, getVolume(){ return 0.8; }, VOL_MAX: 4, SFX_MAX: 1, isMuted(){ return false; },
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
  global.requestAnimationFrame = (fn) => { if(typeof fn === "function") fn(); return 1; };   // run deferred work (T101 warmAudio) synchronously
  global.window.requestAnimationFrame = global.requestAnimationFrame;
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
  // T143 — Synth → a MUSIC gain → sound.js master (so music has its OWN volume,
  // independent of the SFX bus); the limiter still governs the summed master.
  ok(sy.routedTo && sy.routedTo._gain && sy.routedTo._to.includes(masterNode), "boot: T143 — Synth's output routes through a music GAIN into sound.js's master (independent music volume)");
  ok(sy.musics.length >= 1 && sy.starts >= 1, "boot: music starts on entering the app");

  // Arena → the DISTINCT arena context (setContext) + a boss-proximity intensity
  const beforeI = sy.intensities.length;
  route("#/arena");
  ok(sy.contexts[sy.contexts.length - 1] === "arena", "boot: T128 — the Arena drives Synth.setContext('arena') (its own distinct context)");
  const am = sy.musics[sy.musics.length - 1];
  ok(am && am.mode === "phrygian" && am.progression && am.progression.join() === "0,5,6,4", "boot: T128/T140 — the Arena context carries its OWN dark harmony (phrygian) — not a flat default");
  ok(am && am.patches && am.patches.bass === "wub", "boot: T128 — the Arena context uses the WUB bass (energetic), proving contexts differ");
  ok(sy.intensities.length > beforeI && typeof sy.intensities[sy.intensities.length-1] === "number", "boot: the Arena sets Synth.intensity() from live boss-proximity");

  // home → the menu context (audibly DIFFERENT harmony from the Arena)
  route("#/");
  ok(sy.contexts[sy.contexts.length - 1] === "menu", "boot: T128 — home drives Synth.setContext('menu')");
  const mm = sy.musics[sy.musics.length - 1];
  ok(mm && mm.mode === "ionian" && mm.progression.join() !== am.progression.join(), "boot: T128 — menu harmony (ionian) is DISTINCT from the Arena's (the owner's 'music never changes' is fixed)");
  ok(sy.swaps >= 2, "boot: T132 — each screen change swaps the generator NOW (swapNow), so the music changes instantly — " + sy.swaps);

  // a real Arena WIN fires the victory STING (wub on the un-ducked sfx bus)
  route("#/arena");
  const heroId = (els.arenaBody._html.match(/data-hero="([^"]+)"/) || [])[1];
  ok(!!heroId, "boot: the Arena offers a hero");
  (els.arenaBody._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".arena-hero" ? { dataset:{ hero:heroId } } : null) } }));
  const stingsBefore = sy.stings.length;
  (els.arenaFight._h.click||[]).forEach(f=>f({}));
  // T90: skip the turn-by-turn playout → the win sting fires on the result
  (els.arenaBody._h.click||[]).forEach(f=>f({ target:{ closest:s => (s===".bp-skip" ? {} : null) } }));
  ok(sy.stings.indexOf("victory") >= 0 && sy.stings.length > stingsBefore, "boot: T128 — a real Arena win fires Synth.sting('victory') (the wub + bell cue, not a self-ducked wub)");

  // T140 — the Audio-menu picker auditions B's 12 styles; each swaps the live music
  route("#/audio");
  const ctxBefore = sy.contexts.length, stingsB = sy.stings.length;
  const clickMus = name => (els.musicSwitch._h.click||[]).forEach(f => f({ target:{ closest:s => (s === ".mus-btn" ? { dataset:{ music: name } } : null) } }));
  ["menu","lofi","ambient","arena","dubstep"].forEach(clickMus);
  ["menu","lofi","ambient","arena","dubstep"].forEach(n => ok(sy.contexts.indexOf(n) >= 0, "boot: T140 — picking '" + n + "' calls Synth.setContext('" + n + "')"));
  ok(sy.contexts.length - ctxBefore >= 5, "boot: T140 — each pick switches the live music via setContext");
  ok(sy.stings.length > stingsB && sy.stings[sy.stings.length - 1] === "victory", "boot: T140 — picking Dubstep also fires the victory DROP (sting)");
  const arenaPick = sy.musics.filter(m => m && m.mode === "phrygian").pop();
  ok(arenaPick && arenaPick.progression.join() === "0,5,6,4", "boot: T140 — the Arena pick drove its OWN harmony (phrygian), not a flat default");
  ok(sy.reverbs.length >= 5, "boot: T140 — each context applies its own reverb (distinct space)");
  // leaving the Audio menu drops the preview → per-screen music resumes
  route("#/");
  const reverted = sy.musics[sy.musics.length - 1];
  ok(reverted && reverted.mode === "ionian", "boot: T140 — leaving the Audio menu reverts to the per-screen (menu) music");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " SYNTH-WIRING CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
