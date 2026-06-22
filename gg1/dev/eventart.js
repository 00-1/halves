/*
 * Halves — procedural per-event emblem art (T81, Phase 6.5).
 *
 * A standalone, pure, deterministic generator for the daily Events — its OWN
 * visual language (a seeded heraldic crest/emblem on a themed sky), distinct from
 * the topic glyphs, monster sprites and Arena scenery (anti-dilution: not a reskin
 * of any existing art). One distinct emblem per event, seeded by the event's
 * `artSeed`, so it is stable and varies widely across all 14. Static — drawn once
 * (no RAF).
 *
 * window.EventArt = {
 *   buildGrid(seed) -> COLS×ROWS grid of hex colours (for tests + draw),
 *   draw(canvas, seed)   // scaled, pixelated
 * }
 */
(function(){
  "use strict";
  const COLS = 24, ROWS = 16;
  function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hx(c){ return [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)]; }
  function toHex(r){ return "#" + r.map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join(""); }
  function lerp(a, b, t){ const A = hx(a), B = hx(b); return toHex([A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t, A[2]+(B[2]-A[2])*t]); }
  // HSL (h 0..360, s/l 0..100) → hex.
  function hsl(h, s, l){
    s/=100; l/=100; const k = n => (n + h/30) % 12;
    const a = s * Math.min(l, 1-l);
    const f = n => l - a * Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n), 1)));
    return toHex([255*f(0), 255*f(8), 255*f(4)]);
  }

  // Build a distinct emblem grid for a seed: a themed sky gradient + a centred
  // heraldic crest (diamond, edge-lit) bearing a seeded, mirror-symmetric rune,
  // with a few accent sparks above. Every colour + the rune pattern + the crest
  // size derive from one seeded RNG, so different seeds → different emblems.
  function buildGrid(seed){
    const rnd = mulberry32((seed >>> 0) || 1);
    const hue = Math.floor(rnd() * 360);
    const skyTop = hsl(hue, 32, 9);
    const skyBot = hsl((hue + 18 + Math.floor(rnd()*44)) % 360, 40, 16);
    const crest  = hsl(hue, 46, 24);
    const edge   = hsl(hue, 58, 42);
    const accent = hsl((hue + 38 + Math.floor(rnd()*90)) % 360, 76, 58);
    const spark  = hsl((hue + 170 + Math.floor(rnd()*40)) % 360, 70, 62);

    const g = [];
    for(let r=0;r<ROWS;r++){ g[r] = new Array(COLS); for(let c=0;c<COLS;c++) g[r][c] = lerp(skyTop, skyBot, r/(ROWS-1)); }

    const cx = (COLS-1)/2, cy = (ROWS-1)/2;
    const R = 6 + Math.floor(rnd()*2);          // crest radius
    // crest body + edge (a tall diamond)
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const man = Math.abs(c - cx) + Math.abs(r - cy) * 1.35;
      if(man <= R) g[r][c] = (man > R - 1.25) ? edge : crest;
    }
    // seeded rune on the crest, mirrored left→right for a symmetric emblem
    const fill = 0.30 + rnd() * 0.22;
    for(let r=0;r<ROWS;r++) for(let c=0;c<=Math.floor(cx);c++){
      const man = Math.abs(c - cx) + Math.abs(r - cy) * 1.35;
      if(man <= R - 1.6 && rnd() < fill){ g[r][c] = accent; g[r][COLS-1-c] = accent; }
    }
    // accent sparks scattered above the horizon, off the crest
    const n = 5 + Math.floor(rnd()*5);
    for(let i=0;i<n;i++){
      const c = Math.floor(rnd()*COLS), r = Math.floor(rnd() * (ROWS*0.5));
      if(Math.abs(c - cx) + Math.abs(r - cy) * 1.35 > R) g[r][c] = spark;
    }
    return g;
  }

  function draw(canvas, seed){
    if(!canvas || !canvas.getContext) return;
    const g = buildGrid(seed), cx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height, cw = W / COLS, ch = H / ROWS;
    if(cx.imageSmoothingEnabled !== undefined) cx.imageSmoothingEnabled = false;
    cx.clearRect(0,0,W,H);
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){ cx.fillStyle = g[r][c]; cx.fillRect(Math.floor(c*cw), Math.floor(r*ch), Math.ceil(cw)+1, Math.ceil(ch)+1); }
  }

  window.EventArt = { buildGrid: buildGrid, draw: draw, COLS: COLS, ROWS: ROWS };
})();
