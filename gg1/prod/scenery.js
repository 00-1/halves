/*
 * Halves — procedural Arena region scenery (T53).
 *
 * A standalone, pure, deterministic backdrop generator (separate from the enemy
 * and item-icon systems). One distinct, themed scene per Arena region (0–9),
 * seeded by the region index so it's stable. Layered sky gradient + a themed
 * silhouette + a few accents (stars / embers / snow), then a dark scrim so the
 * tier text and enemy sprite keep their WCAG-AA contrast on top. Static — drawn
 * once per render (no RAF).
 *
 * window.Scenery = {
 *   buildGrid(region) -> COLS×ROWS grid of hex colours (pre-scrim, for tests),
 *   draw(canvas, region)   // scaled scene + scrim
 * }
 */
(function(){
  "use strict";
  const COLS = 28, ROWS = 11;
  function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hx(c){ return [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)]; }
  function toHex(r){ return "#" + r.map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join(""); }
  function lerp(a, b, t){ const A = hx(a), B = hx(b); return toHex([A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t, A[2]+(B[2]-A[2])*t]); }

  // 10 themed regions (sky top→horizon, silhouette colour, silhouette shape, accent).
  // Palettes are deliberately DARK — it's a dimmed backdrop, and with the scrim the
  // overlaid --text/--muted stay at WCAG-AA over the brightest cell of any scene.
  const THEMES = [
    { sky:["#1c2614","#32401e"], sil:"#101808", shape:"bumps",  accent:null },      // Goblin Warren
    { sky:["#1e1e28","#32323c"], sil:"#0c0c12", shape:"posts",  accent:null },      // Gallowmarch
    { sky:["#14202a","#243038"], sil:"#0a1216", shape:"trees",  accent:null },      // Gloamwood
    { sky:["#142219","#243528"], sil:"#0a120c", shape:"reeds",  accent:null },      // Haunted Marsh
    { sky:["#1e2e3c","#3a4e60"], sil:"#14202c", shape:"peaks",  accent:"snow" },    // Frostpeak Caverns
    { sky:["#0e1a26","#1a2e42"], sil:"#08101a", shape:"spires", accent:null },      // Drownholm
    { sky:["#261006","#46220e"], sil:"#180a04", shape:"bumps",  accent:"embers" },  // Cinderwaste
    { sky:["#1a1824","#302c40"], sil:"#0c0a14", shape:"posts",  accent:null },      // Stormspire
    { sky:["#220e10","#441e18"], sil:"#120606", shape:"crags",  accent:"embers" },  // Dragon's Roost
    { sky:["#08060f","#150b22"], sil:"#050308", shape:"spires", accent:"stars" }    // The Void Throne
  ];

  // Top silhouette row for column c (smaller = taller), by shape. Deterministic.
  function topRow(shape, c, rnd, horizon){
    const span = ROWS - horizon;
    switch(shape){
      case "bumps":  return horizon - Math.round(Math.abs(Math.sin(c*0.5 + 1)) * (span*0.45));
      case "crags":
      case "peaks":  { const p = (c % 6); return horizon - Math.round((3 - Math.abs(p - 3)) / 3 * (span*0.9)); }
      case "posts":  return (c % 7 === 2) ? horizon - Math.round(span*1.1) : horizon;
      case "trees":  { const m = c % 5; return (m < 3) ? horizon - Math.round(span*0.8) - (m===1?1:0) : horizon; }
      case "reeds":  return (c % 3 === 0) ? horizon - Math.round(span*0.7) : horizon - 0;
      case "spires": { const m = c % 5; return (m === 2) ? horizon - Math.round(span*1.2) : (m===1||m===3 ? horizon - Math.round(span*0.4) : horizon); }
      default:       return horizon;
    }
  }

  function buildGrid(region){
    const th = THEMES[((region % 10) + 10) % 10];
    const rnd = mulberry32((region + 1) * 2654435761 >>> 0);
    const horizon = Math.round(ROWS * 0.58);
    const g = [];
    for(let r=0;r<ROWS;r++){ g[r] = new Array(COLS); }
    // sky gradient
    for(let r=0;r<ROWS;r++){ const col = lerp(th.sky[0], th.sky[1], r/(ROWS-1)); for(let c=0;c<COLS;c++) g[r][c] = col; }
    // silhouette
    for(let c=0;c<COLS;c++){ const t = Math.max(0, topRow(th.shape, c, rnd, horizon)); for(let r=t;r<ROWS;r++) g[r][c] = th.sil; }
    // accents above the horizon
    if(th.accent){
      const col = th.accent === "embers" ? "#5a2e16" : th.accent === "snow" ? "#424a56" : "#42445a";
      const count = 6 + Math.floor(rnd()*5);
      for(let i=0;i<count;i++){ const c = Math.floor(rnd()*COLS), r = Math.floor(rnd()*horizon); g[r][c] = col; }
    }
    return g;
  }

  function draw(canvas, region){
    if(!canvas || !canvas.getContext) return;
    const g = buildGrid(region), cx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height, cw = W / COLS, ch = H / ROWS;
    cx.clearRect(0,0,W,H);
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){ cx.fillStyle = g[r][c]; cx.fillRect(Math.floor(c*cw), Math.floor(r*ch), Math.ceil(cw)+1, Math.ceil(ch)+1); }
    // legibility scrim — keeps --text / --muted at AA over the brightest scene cell
    cx.fillStyle = "rgba(8,10,14,0.64)"; cx.fillRect(0,0,W,H);
  }

  window.Scenery = { buildGrid: buildGrid, draw: draw, COLS: COLS, ROWS: ROWS };
})();
