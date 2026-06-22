/*
 * Halves — celebration FX: a full-screen confetti/spark engine on one canvas.
 *
 * Design goals (see BACKLOG T19):
 *  - Single <canvas> overlay, pointer-events:none, above content.
 *  - RAF engine that IDLES (stops the RAF) whenever nothing is alive — never a
 *    constant loop.
 *  - Rarity-scaled bursts with mixed shapes, physics (outward velocity + gravity
 *    + drag), rotation and twinkle; a shockwave ring; epic/legendary flair.
 *  - Global cap on live particles; fully non-blocking (never intercepts taps, no
 *    game-timer/input impact); honours prefers-reduced-motion; self-cleaning.
 *
 * The emitter math (counts, cap, particle/step) is pure and exported so it can
 * be Node-tested with stubbed canvas/RAF.
 */
(function(){
  "use strict";

  const CAP = 250;                                   // global live-particle cap
  const RARITY_COUNT = { common:30, uncommon:45, rare:65, epic:90, legendary:130 };
  const SHAPES = ["square", "streamer", "star"];
  const GOLD = "#ffd98a", WHITE = "#ffffff";
  const GRAV = 760;        // px/s² downward
  const DRAG = 1.5;        // velocity damping rate (per second)

  // ---- pure emitter math --------------------------------------------------
  function burstCount(rarity){ return RARITY_COUNT[rarity] || RARITY_COUNT.common; }
  function allowed(live, want){ return Math.max(0, Math.min(want | 0, CAP - live)); }
  function rnd(a, b){ return a + Math.random() * (b - a); }
  function pick(a){ return a[(Math.random() * a.length) | 0]; }
  function isBig(r){ return r === "epic" || r === "legendary"; }

  function makeParticle(x, y, rarity, colors){
    const ang = rnd(0, Math.PI * 2);
    const speed = rnd(90, isBig(rarity) ? 430 : 300);
    const up = rnd(40, 170);                          // upward kick (confetti arc)
    const sparkle = Math.random() < 0.22;
    const gold = isBig(rarity) && Math.random() < 0.28;
    const life = rnd(1.0, 1.6);
    return {
      x, y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed - up,
      size: sparkle ? rnd(2, 5) : rnd(3, 9),
      color: gold ? GOLD : (sparkle ? WHITE : (colors[(Math.random() * colors.length) | 0] || WHITE)),
      shape: sparkle ? "star" : pick(SHAPES),
      rot: rnd(0, Math.PI * 2),
      vrot: rnd(-8, 8),
      life, maxLife: life,
      tw: rnd(0, Math.PI * 2),                         // twinkle phase
      tws: rnd(6, 14)                                  // twinkle speed
    };
  }

  // A capped array of confetti for one unlock. Length scales with rarity and is
  // clamped so live + new never exceeds CAP.
  function makeBurst(x, y, rarity, live, colors){
    colors = (colors && colors.length) ? colors : [WHITE];
    const n = allowed(live, burstCount(rarity));
    const out = new Array(n);
    for(let i = 0; i < n; i++) out[i] = makeParticle(x, y, rarity, colors);
    return out;
  }

  // Advance one particle by dt seconds (gravity + drag + spin + twinkle + age).
  function stepParticle(p, dt){
    p.vy += GRAV * dt;
    const damp = 1 - Math.min(1, DRAG * dt);
    p.vx *= damp; p.vy *= damp;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.rot += p.vrot * dt;
    p.tw += p.tws * dt;
    p.life -= dt;
    return p;
  }
  function isDead(p){ return p.life <= 0; }

  function hexA(hex, a){
    let h = String(hex).replace("#", "");
    if(h.length === 3) h = h.replace(/(.)/g, "$1$1");
    const n = parseInt(h, 16) || 0;
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a.toFixed(3) + ")";
  }

  // ---- engine (impure: canvas + RAF) --------------------------------------
  const E = { canvas:null, ctx:null, live:[], rings:[], glow:null,
              running:false, raf:null, caf:null, rafId:0, last:0, dpr:1, w:360, h:640 };

  function reducedMotion(){
    try{ return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch(e){ return false; }
  }

  function resize(){
    if(!E.canvas) return;
    E.dpr = (typeof devicePixelRatio === "number" && devicePixelRatio) || 1;
    E.w = (typeof innerWidth === "number" && innerWidth) || 360;
    E.h = (typeof innerHeight === "number" && innerHeight) || 640;
    E.canvas.width = Math.round(E.w * E.dpr);
    E.canvas.height = Math.round(E.h * E.dpr);
    if(E.ctx && E.ctx.setTransform) E.ctx.setTransform(E.dpr, 0, 0, E.dpr, 0, 0);
  }

  function init(canvas, opts){
    opts = opts || {};
    E.canvas = canvas || null;
    E.ctx = opts.ctx || (canvas && canvas.getContext ? canvas.getContext("2d") : null);
    E.raf = opts.raf || (typeof requestAnimationFrame === "function" ? requestAnimationFrame : null);
    E.caf = opts.caf || (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : function(){});
    resize();
    if(typeof window !== "undefined" && window.addEventListener) window.addEventListener("resize", resize);
    return E;
  }

  function start(){
    if(E.running || !E.raf) return;
    E.running = true; E.last = 0;
    E.rafId = E.raf(frame);
  }

  function frame(ts){
    const dt = E.last ? Math.min(0.05, (ts - E.last) / 1000) : 0.016;
    E.last = ts;
    for(let i = 0; i < E.live.length; i++) stepParticle(E.live[i], dt);
    if(E.live.length) E.live = E.live.filter(p => p.life > 0 && p.y < E.h + 60);
    for(let i = 0; i < E.rings.length; i++){ const r = E.rings[i]; r.r += r.vr * dt; r.life -= dt; }
    if(E.rings.length) E.rings = E.rings.filter(r => r.life > 0);
    if(E.glow){ E.glow.life -= dt; if(E.glow.life <= 0) E.glow = null; }
    render();
    if(E.live.length || E.rings.length || E.glow){ E.rafId = E.raf(frame); }
    else { E.running = false; E.last = 0; E.rafId = 0; clearCanvas(); }   // idle — stop the RAF
  }

  function clearCanvas(){ if(E.ctx) E.ctx.clearRect(0, 0, E.w, E.h); }

  function drawStar(ctx, s){
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s * 0.28, -s * 0.28); ctx.lineTo(s, 0); ctx.lineTo(s * 0.28, s * 0.28);
    ctx.lineTo(0, s); ctx.lineTo(-s * 0.28, s * 0.28); ctx.lineTo(-s, 0); ctx.lineTo(-s * 0.28, -s * 0.28);
    ctx.closePath(); ctx.fill();
  }

  function render(){
    const ctx = E.ctx; if(!ctx) return;
    ctx.clearRect(0, 0, E.w, E.h);
    // vignette glow (epic/legendary)
    if(E.glow && ctx.createRadialGradient){
      const a = (E.glow.life / E.glow.maxLife) * 0.5;
      const g = ctx.createRadialGradient(E.w / 2, E.h / 2, Math.min(E.w, E.h) * 0.2,
                                         E.w / 2, E.h / 2, Math.max(E.w, E.h) * 0.78);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, hexA(E.glow.color, a));
      ctx.fillStyle = g; ctx.fillRect(0, 0, E.w, E.h);
    }
    // shockwave rings
    for(const r of E.rings){
      const a = Math.max(0, r.life / r.maxLife);
      ctx.globalAlpha = a * 0.6; ctx.strokeStyle = r.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // particles
    for(const p of E.live){
      const fade = Math.min(1, p.life / 0.3);
      const tw = 0.65 + 0.35 * Math.sin(p.tw);
      ctx.globalAlpha = Math.max(0, Math.min(1, fade * tw));
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
      if(p.shape === "streamer") ctx.fillRect(-p.size * 0.4, -p.size * 1.3, p.size * 0.8, p.size * 2.6);
      else if(p.shape === "star") drawStar(ctx, p.size);
      else ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // Emit a celebration at (x,y) for `rarity`, tinted by `colors`. Non-blocking;
  // starts the RAF only if idle. `opts.secondary` prevents the flair recursing.
  function celebrate(x, y, rarity, colors, opts){
    if(reducedMotion()) return;
    opts = opts || {};
    colors = (colors && colors.length) ? colors : [WHITE];
    const parts = makeBurst(x, y, rarity, E.live.length, colors);
    for(let i = 0; i < parts.length; i++) E.live.push(parts[i]);
    // shockwave ring + flash at the burst centre
    E.rings.push({ x, y, r: 6, vr: rarity === "legendary" ? 520 : 380,
                   life: 0.5, maxLife: 0.5, color: colors[0] || WHITE });
    // rarity flair: vignette glow, top-edge confetti, a delayed second pop
    if(!opts.secondary && isBig(rarity)){
      E.glow = { life: 0.6, maxLife: 0.6, color: rarity === "legendary" ? GOLD : (colors[0] || WHITE) };
      const edge = allowed(E.live.length, rarity === "legendary" ? 16 : 10);
      for(let i = 0; i < edge; i++){
        const p = makeParticle(rnd(0, E.w), -10, rarity, colors);
        p.vy = Math.abs(p.vy) * 0.4 + 60; p.vx = rnd(-60, 60);
        E.live.push(p);
      }
      if(typeof setTimeout !== "undefined")
        setTimeout(function(){ celebrate(x, y, rarity, colors, { secondary: true }); }, 130);
    }
    start();
  }

  window.FX = {
    init, celebrate, resize,
    RARITY_COUNT, CAP, burstCount, allowed, makeParticle, makeBurst, stepParticle, isDead,
    reducedMotion, liveCount: () => E.live.length, running: () => E.running
  };
})();
