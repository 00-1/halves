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

  // Master volume (T98 — raised from 0.30 to 0.80; the old level was too quiet on
  // phones/laptops). At 0.80 the worst-case master INPUT (SFX voices ≲0.5 summed +
  // one music step ~1.5 through musicGain 0.09 ≈0.14, together ≲0.64) maps to ≈0.51
  // at the output — already under 1.0. But "louder" narrows the headroom, so we no
  // longer rely on the argument: a brickwall LIMITER (DynamicsCompressor, threshold
  // LIMIT_DB, ratio 20) sits on master→destination, transparent at normal levels
  // and clamping any pathological peak below 0 dBFS — so clipping is impossible by
  // construction, not just by estimate.
  // T113 — master volume is now RUNTIME-settable over a WIDE range (the Settings
  // slider), with the brickwall limiter as the clip-safe net. Past passes (T69/98)
  // failed because the engine runs at ~half scale (peaks ≈0.51 at 0.80) so small
  // bumps did nothing; the slider reaches genuinely loud (up to VOL_MAX) and the
  // limiter clamps the peaks. A global TEMPO multiplier scales every style's BPM.
  let vol = 0.80;                   // master volume (bare-engine default; the app sets the owner-calibrated default on boot)
  const VOL_MAX = 4.0;              // T114 — owner hit the 2.5 max and wanted more; range now reaches 4× (limiter-safe)
  let tempoMult = 1.0;              // global music-tempo multiplier (bpm × tempoMult)
  const TEMPO_MIN = 0.4, TEMPO_MAX = 1.0;
  const LIMIT_DB = -1.5;            // brickwall ceiling (the louder range cannot clip)

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
  let ctx = null, master = null, limiter = null, muted = false, ready = false;

  function unlock(){
    if(!ready){
      try{
        const AC = window.AudioContext || window.webkitAudioContext;
        if(!AC) return;                       // no Web Audio (very old browsers) — silent
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : vol;
        // Brickwall safety limiter: master → limiter → destination. Threshold near
        // 0 dBFS with a high ratio + fast attack so it's inaudible until a peak
        // would clip, then hard-clamps it. Guards the louder VOL against clipping.
        if(ctx.createDynamicsCompressor){
          limiter = ctx.createDynamicsCompressor();
          try{
            limiter.threshold.value = LIMIT_DB;   // start clamping just under 0 dBFS
            limiter.knee.value = 0;                // hard knee → brickwall, not soft
            limiter.ratio.value = 20;              // ≥20:1 == a limiter
            limiter.attack.value = 0.003;          // catch transients fast
            limiter.release.value = 0.25;          // smooth recovery, no pumping
          }catch(e){}
          master.connect(limiter); limiter.connect(ctx.destination);
        }else{
          master.connect(ctx.destination);         // no compressor support — direct (headroom still safe)
        }
        ready = true;
      }catch(e){ ctx = null; master = null; limiter = null; return; }
    }
    if(ctx && ctx.state === "suspended"){ try{ ctx.resume(); }catch(e){} }
    if(mWant >= 0 && !muted) startScheduler();   // resume requested music once a context exists
  }

  function setMuted(m){
    muted = !!m;
    if(master){ try{ master.gain.value = muted ? 0 : vol; }catch(e){} }
    if(muted) stopMusic(); else startScheduler();   // music stops on mute, resumes on unmute
  }
  function isMuted(){ return muted; }
  // T113 — live master volume (wide range; the limiter keeps the top end clip-safe).
  function setVolume(v){
    v = +v; if(!isFinite(v)) return vol;
    vol = Math.max(0, Math.min(VOL_MAX, v));
    if(master && !muted){ try{ master.gain.value = vol; }catch(e){} }   // applies LIVE
    return vol;
  }
  function getVolume(){ return vol; }
  // T113 — live global music-tempo multiplier (scales every style's BPM). Applies
  // to whatever is playing from the next scheduled step (no restart needed).
  function setTempo(m){
    m = +m; if(!isFinite(m)) return tempoMult;
    tempoMult = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, m));
    return tempoMult;
  }
  function getTempo(){ return tempoMult; }

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

  // T115 — a short synth "wub" celebration sting (dubstep bass-wobble): a saw bass
  // through a low-pass whose cutoff a ~7 Hz LFO wobbles → a couple of "wub"s. Pure
  // WebAudio (NO sample files), routed through master so it honours mute + the T113
  // master volume + the limiter. Short/bounded; oscillators auto-stop (no leak).
  function wub(){
    if(muted || !ctx || !master) return;
    if(ctx.state === "suspended"){ try{ ctx.resume(); }catch(e){} }
    try{
      const now = ctx.currentTime, dur = 0.66;
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = hz(36);            // ~C2 bass note
      lp.type = "lowpass"; lp.frequency.value = 300; try{ lp.Q.value = 9; }catch(e){}
      lfo.type = "sine"; lfo.frequency.value = 7;                 // the wobble rate (~7 Hz)
      lfoGain.gain.value = 600;                                   // cutoff sweep depth
      lfo.connect(lfoGain); lfoGain.connect(lp.frequency);        // LFO modulates the cutoff → "wub"
      o.connect(lp); lp.connect(g); g.connect(master);           // through master (vol + limiter apply)
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.32, now + 0.02);
      g.gain.setValueAtTime(0.32, now + dur - 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.start(now); lfo.start(now);
      o.stop(now + dur + 0.05); lfo.stop(now + dur + 0.05);
    }catch(e){ /* fire-and-forget */ }
  }

  // ---- generative chiptune music (T17) ------------------------------------
  function hashStr(s){ let h = 2166136261 >>> 0; for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  const MAJ=[0,2,4,5,7,9,11], MIN=[0,2,3,5,7,8,10], PENT=[0,2,4,7,9], PENTMIN=[0,3,5,7,10], DORIAN=[0,2,3,5,7,9,10], LYD=[0,2,4,6,7,9,11];
  const SQ={lead:"square",bass:"triangle",arp:"square"}, TRI={lead:"triangle",bass:"triangle",arp:"square"};
  // T115 — soft timbres for the CALM solve styles (no harsh square leads): a sine
  // "pad", a triangle "bell", an airy sine-arp "glass". Real per-context variety.
  const PAD={lead:"sine",bass:"triangle",arp:"triangle"}, BELL={lead:"triangle",bass:"sine",arp:"triangle"}, GLASS={lead:"triangle",bass:"triangle",arp:"sine"};
  // style = { name, bpm, root, scale, arp[], bass[], drums[] (0 rest·1 kick·2 hat·3 snare), density, waves }
  function St(name,bpm,root,scale,arp,bass,drums,density,waves){ return { name:name,bpm:bpm,root:root,scale:scale,arp:arp,bass:bass,drums:drums,density:density,waves:waves||SQ }; }
  // 15 topic styles (indices 0..14, one per topic) + the menu style (15) + the
  // Arena theme (16). All tempos are calm (bpm ≤ 95); the busy styles use a lower
  // lead `density` and gentler drum patterns so nothing feels rushed (T71).
  // T115 — the 15 topic styles are the SOLVE music: CALM BY DESIGN (firm rule —
  // solving is stress-sensitive). All are slow (bpm ≤ 72, < the menu), SPARSE
  // (density ≤ 0.18), soft-timbre (sine/triangle pads & bells), and carry NO
  // driving drums (only rests + the occasional soft hat). They stay DISTINCT via
  // scale/root/arp/timbre. The menu is gentler-but-present; the Arena is driving/
  // epic (combat — energy wanted); the event is festive — real per-context character.
  const STYLES = [
    St("Dungeon Crawl", 62,45,MIN,    [0,2,3,2],          [0,null,null,0],            [0,0,2,0],            0.14, PAD),
    St("Sky Castle",    70,60,MAJ,    [0,4,7,4],          [0,null,null,null],         [0,0,0,0],            0.16, BELL),
    St("Pixel Forest",  64,57,PENT,   [0,2,4,2],          [0,null,null,4],            [0,0,2,0],            0.15, GLASS),
    St("Neon Arcade",   72,60,LYD,    [0,4,2,7],          [0,null,4,null],            [0,0,2,0],            0.17, BELL),
    St("Frost Cavern",  58,50,DORIAN, [0,3,5,3],          [0,null,null,null],         [0,0,0,0],            0.12, PAD),
    St("Lava Run",      68,43,PENTMIN,[0,3,2,0],          [0,null,null,3],            [0,0,2,0],            0.16, PAD),
    St("Bubble Pop",    72,64,MAJ,    [0,4,2,5],          [0,null,4,null],            [0,0,2,0],            0.17, GLASS),
    St("Mecha March",   66,48,MIN,    [0,2,4,2],          [0,null,null,5],            [0,0,2,0],            0.15, TRI),
    St("Starlight",     60,60,LYD,    [0,4,7],            [0,null,null,null],         [0,0,0,0],            0.11, PAD),
    St("Goblin Market", 68,52,DORIAN, [0,2,5,3],          [0,null,3,null],            [0,0,2,0],            0.16, BELL),
    St("Clockwork",     70,55,MAJ,    [0,2,4,2],          [0,null,0,null],            [0,0,2,0],            0.16, GLASS),
    St("Victory Hall",  72,60,MAJ,    [0,4,7,4],          [0,null,4,null],            [0,0,2,0],            0.18, BELL),
    St("Tide Pool",     62,64,PENT,   [0,2,4,2],          [0,null,null,4],            [0,0,0,0],            0.13, GLASS),
    St("Lantern Way",   66,50,DORIAN, [0,3,5,3],          [0,null,5,null],            [0,0,2,0],            0.15, PAD),
    St("Meadow",        70,57,MAJ,    [0,2,4,5],          [0,null,2,null],            [0,0,2,0],            0.16, BELL),
    St("Title Theme",   80,57,MAJ,    [0,2,4,2],          [0,null,4,null],            [2,0,2,0],            0.22, TRI),   // menu — gentle but present
    St("Hero's Arena",  92,48,MIN,    [0,4,7,4],          [0,0,5,5],                  [1,0,2,0,1,0,3,0],    0.34, SQ),    // arena — driving / epic
    St("Festival Day",  86,62,LYD,    [0,4,7,11,7,4],     [0,null,4,null,5,null,4,null],[1,0,2,0,0,0,2,0],   0.26, TRI)    // event — festive
  ];
  const MENU_STYLE = 15, ARENA_STYLE = 16, EVENT_STYLE = 17;
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
    if(key === "arena") return ARENA_STYLE;
    if(key === "event") return EVENT_STYLE;
    return hashStr(String(key)) % 15;     // deterministic fallback into the 15 topic styles
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
  const MAX_STEPS_PER_TICK = 4;   // backstop: never flood notes in one tick
  function musicTick(){
    if(!ctx) return;
    const now = ctx.currentTime;
    // Anti-burst: if the 25ms timer stalled (heavy render, GC, tab refocus) the
    // audio clock races ahead of mNext; resync and DROP the missed steps instead
    // of cramming a backlog of notes (which sounded like a fast burst).
    if(mNext < now) mNext = now + 0.02;
    let scheduled = 0;
    while(mNext < now + LOOKAHEAD && scheduled < MAX_STEPS_PER_TICK){
      if(mStep % LOOP_STEPS === 0 && mCur !== mWant){ mCur = mWant; reseed(); }   // clean swap on loop boundary
      const style = STYLES[mCur];
      const voices = stepVoices(style, mStep, mRnd);
      for(const v of voices) musicVoice(v, mNext);
      mNext += (60 / (style.bpm * tempoMult)) / 4;
      mStep++;
      scheduled++;
    }
  }
  function startScheduler(){
    if(mTimer || !ctx || muted || mWant < 0) return;
    if(!musicGain){ musicGain = ctx.createGain(); musicGain.gain.value = 0.09; musicGain.connect(master); }   // T69: balanced background under SFX
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
    setVolume, getVolume, setTempo, getTempo, VOL_MAX, TEMPO_MIN, TEMPO_MAX,   // T113 live audio sliders
    correct: combo => play(sfxSpec("correct", { combo: combo })),
    skip: () => play(sfxSpec("skip")),
    item: rarity => play(sfxSpec("item", { rarity: rarity })),
    gold: big => play(sfxSpec("gold", { big: big })),
    topicUnlock: () => play(sfxSpec("topicUnlock")),
    mastery: () => play(sfxSpec("mastery")),
    topic100: () => play(sfxSpec("topic100")),
    roundStart: () => play(sfxSpec("roundStart")),
    roundComplete: () => play(sfxSpec("roundComplete")),
    wub: wub,   // T115 — synth dubstep win-sting (topic-complete / battle-win)
    // music (T17)
    setMusic, stopMusic, musicPlaying,
    STYLES, MENU_STYLE, ARENA_STYLE, EVENT_STYLE, styleIndexFor, degMidi, stepVoices
  };
})();
