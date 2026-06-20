/*
 * Halves — procedural 8-bit SFX. All synthesised with the Web Audio API (no
 * audio files), same ethos as the procedural pixel icons. Exposes window.Sound.
 *
 * Design (docs/agent/DESIGN-audio.md): one AudioContext resumed on the first user
 * gesture (the entry screen calls Sound.unlock()), a master gain + mute, and
 * short fire-and-forget blips wired to game events. Nothing here ever blocks or
 * touches the game clock/input. The spec builders are pure (Node-testable); the
 * scheduler is the only impure part and degrades to a no-op without a context.
 */
(function(){
  "use strict";

  const VOL = 0.16;                 // master volume (gentle)

  // MIDI note number → frequency (A4=69=440Hz, equal temperament).
  function hz(midi){ return 440 * Math.pow(2, (midi - 69) / 12); }
  // One voice in a spec: frequency, start offset (s), duration (s), waveform, peak gain.
  function n(midi, t, d, type, g){ return { f: hz(midi), t: t, d: d, type: type || "square", g: g == null ? 0.15 : g }; }
  function arp(roots, t0, step, d, type, g){ return roots.map((m, i) => n(m, t0 + i * step, d, type, g)); }

  // Pure: build the voice list for an event. `opts` carries combo/rarity/big.
  function sfxSpec(event, opts){
    opts = opts || {};
    switch(event){
      case "correct": {
        const base = 72 + Math.min(Math.max(opts.combo | 0, 0), 12);   // pitch rises with the combo streak (capped at +1 octave)
        return { v: [ n(base, 0, 0.05, "square", 0.16), n(base + 7, 0.045, 0.07, "square", 0.13) ] };
      }
      case "skip":
        return { v: [ n(57, 0, 0.07, "sawtooth", 0.12), n(52, 0.06, 0.12, "sawtooth", 0.10) ] };   // soft descending buzz
      case "item": {
        const counts = { common:3, uncommon:4, rare:5, epic:6, legendary:7 };
        const cnt = counts[opts.rarity] || 3;
        const root = 76 + (cnt - 3) * 2;                                // rarer → higher & more notes
        const scale = [0, 4, 7, 12, 16, 19, 24];
        return { v: scale.slice(0, cnt).map((s, i) => n(root + s, i * 0.05, 0.09, "square", 0.14)) };
      }
      case "gold": {
        const v = [ n(84, 0, 0.05, "square", 0.14), n(91, 0.05, 0.08, "square", 0.13) ];
        if(opts.big) v.push(n(96, 0.12, 0.12, "square", 0.13));        // fuller chime for big amounts
        return { v };
      }
      case "topicUnlock":
        return { v: arp([72, 76, 79], 0, 0.08, 0.09, "square", 0.15).concat([ n(84, 0.24, 0.18, "square", 0.15) ]) };
      case "mastery":
        return { v: arp([72, 76, 79, 84, 88], 0, 0.07, 0.10, "square", 0.15).concat([ n(91, 0.36, 0.16, "square", 0.13) ]) };
      case "topic100":
        return { v: arp([72, 79, 76, 83, 88], 0, 0.06, 0.10, "square", 0.15)
                    .concat([ n(84, 0.32, 0.22, "square", 0.14), n(91, 0.32, 0.22, "triangle", 0.10) ]) };
      case "roundStart":
        return { v: [ n(67, 0, 0.05, "square", 0.12), n(72, 0.05, 0.08, "square", 0.13) ] };
      case "roundComplete":
        return { v: [ n(72, 0, 0.06, "square", 0.13), n(76, 0.06, 0.10, "square", 0.13) ] };
      default:
        return { v: [] };
    }
  }

  // ---- engine (impure) ----------------------------------------------------
  let ctx = null, master = null, muted = false, ready = false;

  function unlock(){
    if(!ready){
      try{
        const AC = window.AudioContext || window.webkitAudioContext;
        if(!AC) return;                       // no Web Audio (very old browsers) — silent
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : VOL;
        master.connect(ctx.destination);
        ready = true;
      }catch(e){ ctx = null; master = null; return; }
    }
    if(ctx && ctx.state === "suspended"){ try{ ctx.resume(); }catch(e){} }
    if(mWant >= 0 && !muted) startScheduler();   // resume requested music once a context exists
  }

  function setMuted(m){
    muted = !!m;
    if(master){ try{ master.gain.value = muted ? 0 : VOL; }catch(e){} }
    if(muted) stopMusic(); else startScheduler();   // music stops on mute, resumes on unmute
  }
  function isMuted(){ return muted; }

  function play(spec){
    if(muted || !ctx || !master || !spec || !spec.v || !spec.v.length) return;
    if(ctx.state === "suspended"){ try{ ctx.resume(); }catch(e){} }
    const now = ctx.currentTime;
    for(const v of spec.v){
      try{
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = v.type; o.frequency.value = v.f;
        const t0 = now + (v.t || 0), t1 = t0 + (v.d || 0.08);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0001, v.g), t0 + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t1);
        o.connect(g); g.connect(master);
        o.start(t0); o.stop(t1 + 0.03);
      }catch(e){ /* fire-and-forget */ }
    }
  }

  // ---- generative chiptune music (T17) ------------------------------------
  function hashStr(s){ let h = 2166136261 >>> 0; for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  const MAJ=[0,2,4,5,7,9,11], MIN=[0,2,3,5,7,8,10], PENT=[0,2,4,7,9], PENTMIN=[0,3,5,7,10], DORIAN=[0,2,3,5,7,9,10], LYD=[0,2,4,6,7,9,11];
  const SQ={lead:"square",bass:"triangle",arp:"square"}, TRI={lead:"triangle",bass:"triangle",arp:"square"};
  // style = { name, bpm, root, scale, arp[], bass[], drums[] (0 rest·1 kick·2 hat·3 snare), density, waves }
  function St(name,bpm,root,scale,arp,bass,drums,density,waves){ return { name:name,bpm:bpm,root:root,scale:scale,arp:arp,bass:bass,drums:drums,density:density,waves:waves||SQ }; }
  // 12 topic styles (indices 0..11) + the menu style (index 12) = 13 total.
  const STYLES = [
    St("Dungeon Crawl", 88,45,MIN,    [0,2,4,2],          [0,null,0,5,null,0,null,5], [1,0,2,0],            0.35),
    St("Sky Castle",   132,60,MAJ,    [0,2,4,7,4,2],      [0,null,4,null],            [1,0,2,0,1,0,2,0],    0.40),
    St("Pixel Forest", 108,57,PENT,   [0,1,2,4],          [0,null,2,null],            [1,0,2,0],            0.35),
    St("Neon Arcade",  140,60,MAJ,    [0,2,4,5,7],        [0,0,5,5],                  [1,3,2,3],            0.45),
    St("Frost Cavern",  80,50,DORIAN, [0,3,5],            [0,null,null,5],            [0,0,2,0],            0.25, TRI),
    St("Lava Run",     150,43,PENTMIN,[0,2,3,4],          [0,0,0,3],                  [1,2,3,2,1,2,3,2],    0.50),
    St("Bubble Pop",   124,64,MAJ,    [0,4,2,5],          [0,null,4,null],            [1,0,3,2],            0.40),
    St("Mecha March",  112,48,MIN,    [0,2,4],            [0,0,5,5],                  [1,2,3,2],            0.30),
    St("Starlight",     76,60,LYD,    [0,4,7],            [0,null,null,null],         [0,0,0,2],            0.20, TRI),
    St("Goblin Market",118,52,DORIAN, [0,2,5,3],          [0,null,3,5,null,0],        [1,0,2,0,1,3],        0.40),
    St("Clockwork",    128,55,MAJ,    [0,2,4,7,4,2,0,2],  [0,null,0,null],            [2,2,2,2],            0.35),
    St("Victory Hall", 120,60,MAJ,    [0,4,7,12,7,4],     [0,0,4,4,5,5],              [1,3,2,3],            0.45),
    St("Title Theme",   96,57,MAJ,    [0,2,4,2],          [0,null,4,null],            [0,0,2,0],            0.30)   // menu
  ];
  const MENU_STYLE = 12;
  const LOOP_STEPS = 16;
  // Scale degree → MIDI note (octave-aware; wraps degrees beyond the scale).
  function degMidi(style, degree, octaveShift){
    const sc = style.scale, len = sc.length;
    const oct = Math.floor(degree / len), idx = ((degree % len) + len) % len;
    return style.root + (oct + (octaveShift || 0)) * 12 + sc[idx];
  }
  const DRUM = { 1:[80,0.09,"sine",0.45], 2:[5000,0.02,"square",0.07], 3:[1600,0.05,"square",0.13] };
  // Pure: the voices to schedule on one 16th-note step (deterministic given rnd).
  function stepVoices(style, step, rnd){
    const out = [];
    const bd = style.bass[step % style.bass.length];
    if(bd != null) out.push({ f: hz(degMidi(style, bd, -1)), d: 0.18, type: style.waves.bass, g: 0.5 });
    const ad = style.arp[step % style.arp.length];
    if(ad != null) out.push({ f: hz(degMidi(style, ad, 1)), d: 0.07, type: style.waves.arp, g: 0.22 });
    if(rnd() < style.density){
      const deg = Math.floor(rnd() * (style.scale.length + 2));
      out.push({ f: hz(degMidi(style, deg, 0)), d: 0.12, type: style.waves.lead, g: 0.34 });
    }
    const dr = style.drums[step % style.drums.length], D = DRUM[dr];
    if(D) out.push({ f: D[0], d: D[1], type: D[2], g: D[3] });
    return out;
  }
  // Resolve a topic to a style index: explicit number wins, else hash(id) % 12.
  function styleIndexFor(key){
    if(typeof key === "number") return ((key % STYLES.length) + STYLES.length) % STYLES.length;
    if(key === "menu") return MENU_STYLE;
    return hashStr(String(key)) % 12;     // deterministic fallback into the 12 topic styles
  }

  let mTimer = null, mWant = -1, mCur = -1, mNext = 0, mStep = 0, mRnd = null, musicGain = null;
  const LOOKAHEAD = 0.1, TICK_MS = 25;
  function reseed(){ mRnd = mulberry32((hashStr(STYLES[mCur].name) ^ ((Date.now() & 0xffffff) >>> 0)) >>> 0); }
  function musicVoice(v, t){
    try{
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = v.type; o.frequency.value = v.f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, v.g), t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + v.d);
      o.connect(g); g.connect(musicGain);
      o.start(t); o.stop(t + v.d + 0.03);
    }catch(e){}
  }
  function musicTick(){
    if(!ctx) return;
    while(mNext < ctx.currentTime + LOOKAHEAD){
      if(mStep % LOOP_STEPS === 0 && mCur !== mWant){ mCur = mWant; reseed(); }   // clean swap on loop boundary
      const style = STYLES[mCur];
      const voices = stepVoices(style, mStep, mRnd);
      for(const v of voices) musicVoice(v, mNext);
      mNext += (60 / style.bpm) / 4;
      mStep++;
    }
  }
  function startScheduler(){
    if(mTimer || !ctx || muted || mWant < 0) return;
    if(!musicGain){ musicGain = ctx.createGain(); musicGain.gain.value = 0.07; musicGain.connect(master); }
    if(mCur < 0){ mCur = mWant; mStep = 0; reseed(); }
    mNext = ctx.currentTime + 0.06;
    mTimer = setInterval(musicTick, TICK_MS);
  }
  function stopMusic(){ if(mTimer){ clearInterval(mTimer); mTimer = null; } }
  function setMusic(key){
    const idx = styleIndexFor(key);
    if(idx === mWant) return;
    mWant = idx;
    if(mCur < 0){ mCur = idx; mStep = 0; reseed(); }   // first start: take it immediately
    startScheduler();
  }
  function musicPlaying(){ return !!mTimer; }

  // Pause the context when the tab is hidden; resume when visible (unless muted).
  if(typeof document !== "undefined" && document.addEventListener){
    document.addEventListener("visibilitychange", function(){
      if(!ctx) return;
      try{
        if(document.hidden){ stopMusic(); ctx.suspend(); }      // save CPU/battery when hidden
        else if(!muted){ ctx.resume(); startScheduler(); }
      }catch(e){}
    });
  }

  window.Sound = {
    unlock, setMuted, isMuted, play, sfxSpec,
    correct: combo => play(sfxSpec("correct", { combo: combo })),
    skip: () => play(sfxSpec("skip")),
    item: rarity => play(sfxSpec("item", { rarity: rarity })),
    gold: big => play(sfxSpec("gold", { big: big })),
    topicUnlock: () => play(sfxSpec("topicUnlock")),
    mastery: () => play(sfxSpec("mastery")),
    topic100: () => play(sfxSpec("topic100")),
    roundStart: () => play(sfxSpec("roundStart")),
    roundComplete: () => play(sfxSpec("roundComplete")),
    // music (T17)
    setMusic, stopMusic, musicPlaying,
    STYLES, MENU_STYLE, styleIndexFor, degMidi, stepVoices
  };
})();
