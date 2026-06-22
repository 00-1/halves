/*
 * Halves — procedural 8-bit SFX. All synthesised with the Web Audio API (no
 * audio files), same ethos as the procedural pixel icons. Exposes window.Sound.
 *
 * Design (docs/agent/DESIGN-audio.md): one AudioContext resumed on the first user
 * gesture (the entry screen calls Sound.unlock()), a master gain + brickwall
 * limiter + mute, and short fire-and-forget blips wired to game events. Nothing
 * here ever blocks or touches the game clock/input. The spec builders are pure
 * (Node-testable); the scheduler is the only impure part and degrades to a no-op
 * without a context.
 *
 * T122 — the MUSIC moved to the principled generative engine `synth.js`
 * (window.Synth), which mounts on THIS module's AudioContext + master/limiter so
 * music + SFX share one chain (the T113 volume slider + the limiter govern both).
 * sound.js is now SFX-only; it exposes `ctx()` / `master()` for the [A] wire.
 */
(function(){
  "use strict";

  // Master volume — RUNTIME-settable over a WIDE range (the Settings slider), with
  // the brickwall limiter as the clip-safe net (T113/T114). Past passes failed
  // because the engine ran at ~half scale; the slider reaches genuinely loud (up to
  // VOL_MAX) and the limiter clamps the peaks. The app sets the owner-calibrated
  // default on boot; mute zeroes the shared master.
  // T143 — SFX and MUSIC now have SEPARATE volumes. sound.js owns the SFX bus
  // (its own gain); the music (Synth) routes through its OWN gain (inserted by the
  // [A] wire) into this shared master. The master is now MUTE-only (0 or 1); the
  // SFX gain + the music gain set their levels independently, and the brickwall
  // limiter still protects the sum.
  let sfxVol = 0.16;               // SFX bus gain (default — louder than music so blips aren't lost)
  const SFX_MAX = 1.0;             // limiter-safe ceiling for the SFX gain
  const VOL_MAX = SFX_MAX;         // back-compat alias (old single-volume callers)
  const LIMIT_DB = -1.5;           // brickwall ceiling (the louder range cannot clip)

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
  let ctx = null, master = null, sfxBus = null, limiter = null, muted = false, ready = false;

  function unlock(){
    if(!ready){
      try{
        const AC = window.AudioContext || window.webkitAudioContext;
        if(!AC) return;                       // no Web Audio (very old browsers) — silent
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 1;    // MUTE-only shared bus (SFX + music both route here)
        sfxBus = ctx.createGain();
        sfxBus.gain.value = sfxVol;           // the SFX level (independent of music)
        sfxBus.connect(master);
        // Brickwall safety limiter: master → limiter → destination (clip-safe). Both
        // the SFX bus and the music (Synth → its own gain) feed `master`, so the
        // limiter governs the SUM; mute zeroes the master → silences both.
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
      }catch(e){ ctx = null; master = null; sfxBus = null; limiter = null; return; }
    }
    if(ctx && ctx.state === "suspended"){ try{ ctx.resume(); }catch(e){} }
  }

  function setMuted(m){
    muted = !!m;
    if(master){ try{ master.gain.value = muted ? 0 : 1; }catch(e){} }   // mute silences BOTH SFX + music
  }
  function isMuted(){ return muted; }
  // T143 — the SFX bus level (its own slider, independent of music).
  function setSfxVolume(v){
    v = +v; if(!isFinite(v)) return sfxVol;
    sfxVol = Math.max(0, Math.min(SFX_MAX, v));
    if(sfxBus){ try{ sfxBus.gain.value = sfxVol; }catch(e){} }   // applies LIVE (SFX only)
    return sfxVol;
  }
  function getSfxVolume(){ return sfxVol; }
  function setVolume(v){ return setSfxVolume(v); }   // back-compat alias (the old single volume now drives SFX)
  function getVolume(){ return sfxVol; }

  function play(spec){
    if(muted || !ctx || !sfxBus || !spec || !spec.v || !spec.v.length) return;
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
        o.connect(g); g.connect(sfxBus);
        o.start(t0); o.stop(t1 + 0.03);
      }catch(e){ /* fire-and-forget */ }
    }
  }

  // Pause the context when the tab is hidden; resume when visible (unless muted).
  // (Synth shares this ctx; the [A] wire stops Synth's scheduler on hide too.)
  if(typeof document !== "undefined" && document.addEventListener){
    document.addEventListener("visibilitychange", function(){
      if(!ctx) return;
      try{
        if(document.hidden){ ctx.suspend(); }         // save CPU/battery when hidden
        else if(!muted){ ctx.resume(); }
      }catch(e){}
    });
  }

  window.Sound = {
    unlock, setMuted, isMuted, play, sfxSpec,
    setSfxVolume, getSfxVolume, SFX_MAX,                    // T143 — independent SFX volume
    setVolume, getVolume, VOL_MAX,                          // back-compat alias (drives SFX)
    ctx: () => ctx, master: () => master, sfx: () => sfxBus, limiter: () => limiter,   // T122/T143 — the Synth wire routes its music gain into master
    correct: combo => play(sfxSpec("correct", { combo: combo })),
    skip: () => play(sfxSpec("skip")),
    item: rarity => play(sfxSpec("item", { rarity: rarity })),
    gold: big => play(sfxSpec("gold", { big: big })),
    topicUnlock: () => play(sfxSpec("topicUnlock")),
    mastery: () => play(sfxSpec("mastery")),
    topic100: () => play(sfxSpec("topic100")),
    roundStart: () => play(sfxSpec("roundStart")),
    roundComplete: () => play(sfxSpec("roundComplete"))
  };
})();
