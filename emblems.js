/*
 * Halves — generative BRAND EMBLEMS (T181): app-icon candidates + Codex "Emblems".
 *
 * A standalone, B-owned module that mints the brand-emblem proposals in the game's
 * generative PIXEL / dither style — gold-on-violet, centred + maskable-safe (each works
 * as a launcher icon AND a Codex tile). The owner reviews them (Codex T179 + the ?dev
 * reveal T180) and picks the launcher icon; the rest become unlockable collectibles.
 *
 * Pure + deterministic, mirroring glyphs.js: `cells(id)` returns a {size, cells} grid of
 * ink codes (no DOM/RAF) so it is unit-testable; `draw(canvas, id, opts)` is the only
 * side-effecting bit (drawn once, never animated). Emblems are GENERATED (discs via a
 * distance field, shaded by a fixed upper-left light) rather than hand-painted, so the
 * metal bevel + glint match the engine's quantise look and stay crisp at any icon size.
 *
 * window.Emblems = { IDS, cells(id)->{size,cells}, draw(canvas,id,opts), PALETTE, BG }
 */
(function(){
  "use strict";

  const SIZE = 24;                 // SIZE×SIZE cell grid (chunky; reads 48→512 px)
  // ink codes → RGB. A 3-stop gold metal ramp + outline + glint + a cosmic-purple accent.
  const PALETTE = {
    1: [14, 9, 22],                // outline (near-black violet)
    2: [122, 84, 24],              // gold shadow
    3: [212, 158, 46],             // gold mid
    4: [255, 214, 110],            // gold highlight
    5: [255, 255, 255],            // specular glint
    6: [156, 94, 246]              // cosmic purple (voidthrone)
  };
  const BG = [26, 16, 46];         // deep-violet field (full-bleed → maskable-safe)
  // T205 — the owner picked Magnar (`hero:mo`, T194) as the launcher icon and kept ONLY the 3
  // character-forward CREATURES (the abstract coin/crown/hoard/goblin/throne/sigil marks were
  // scrapped); these 3 become Collector awards (T206).
  const IDS = ["beast", "goblinking", "voidbeast"];

  // ---- grid + drawing primitives (pure) -------------------------------------
  function newGrid(){ const g = new Array(SIZE); for(let y = 0; y < SIZE; y++) g[y] = new Array(SIZE).fill(0); return g; }
  function set(g, x, y, ink){ if(x >= 0 && x < SIZE && y >= 0 && y < SIZE) g[y | 0][x | 0] = ink; }

  // T188 — a CHARACTER-FORWARD creature in the bestiary (monsters.js) generative style,
  // re-implemented self-contained: a lumpy, vertically-symmetric gold blob (lit upper-left
  // → shadow lower-right), horns/antennae or a smooth/crowned head, glinting eyes, shadow
  // teeth + spots, a dark outline ring, feet stubs. Deterministic from `seed`. Fills `g`.
  function mulberry(seed){ let s = seed >>> 0; return function(){ s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function setSym(g, x, y, ink){ set(g, x, y, ink); set(g, SIZE - 1 - x, y, ink); }
  function creature(g, seed, o){
    o = o || {}; const rnd = mulberry(seed), cx = (SIZE - 1) / 2;
    const rx = o.rx || 7, ry = o.ry || 7.6, cy = o.cy || 13;
    let topY = SIZE, botY = 0;
    for(let y = 0; y < SIZE; y++){
      const dy = (y - cy) / ry; if(Math.abs(dy) > 1) continue;
      const lump = 0.84 + 0.34 * (((y * 73 + seed) % 7) / 7);
      const hw = rx * Math.sqrt(1 - dy * dy) * lump;
      for(let x = 0; x <= Math.floor(cx); x++){
        if(cx - x <= hw){
          const dxn = (x - cx) / rx, lit = -(dxn + dy) / 1.6;     // upper-left light
          setSym(g, x, y, lit > 0.3 ? 4 : lit > -0.1 ? 3 : 2);
          if(y < topY) topY = y; if(y > botY) botY = y;
        }
      }
    }
    if(o.smooth){ /* void head: no horns */ }
    else { const hx = o.hornX || 4; for(let k = 1; k <= 3; k++) setSym(g, hx, topY - k, 4); }   // horns
    if(o.crown){ for(let x = 4; x <= Math.floor(cx); x++) setSym(g, x, topY - 1, 4); setSym(g, 6, topY - 2, 4); setSym(g, 9, topY - 3, 4); }
    const eyeY = Math.round(cy - ry * 0.35), ec = o.eye || 5;
    for(const ex of (o.eyes || [7, 9])) setSym(g, ex, eyeY, ec);
    const mY = eyeY + (o.mouthDy || 4);                            // teeth (shadow)
    for(let x = 7; x <= Math.floor(cx); x++) if(g[mY] && g[mY][x] && x % 2 === 0) setSym(g, x, mY, 2);
    for(let y = topY; y <= botY; y++) for(let x = 0; x <= Math.floor(cx); x++) if(g[y][x] === 3 && rnd() < 0.10) setSym(g, x, y, 2);   // spots
    if(botY + 1 < SIZE) for(const fx of (o.feet || [8, 10])) setSym(g, fx, botY + 1, 2);   // feet
    const body = (x, y) => x >= 0 && x < SIZE && y >= 0 && y < SIZE && g[y][x];   // outline ring
    const ring = [];
    for(let y = 0; y < SIZE; y++) for(let x = 0; x < SIZE; x++) if(!g[y][x] && (body(x-1,y)||body(x+1,y)||body(x,y-1)||body(x,y+1))) ring.push([x, y]);
    for(const [x, y] of ring) g[y][x] = 1;
  }

  // ---- the emblems (each fills a fresh grid, deterministically) --------------
  // T188/T205 — character-forward creatures in the bestiary style (the owner kept ONLY these;
  // the abstract marks were scrapped). Bold, centred gold portraits with glinting eyes; draw()
  // auto-fits each to fill the cell at the standard collectible-icon size (T205).
  const GEN = {
    beast:      function(g){ creature(g, 0xb3a57, { horns: true, hornX: 4, eyes: [6, 9], rx: 7.2 }); },        // horned multi-eye brute
    goblinking: function(g){ creature(g, 0x90b14, { horns: true, hornX: 5, crown: true, eyes: [7, 9], ry: 7.2 }); }, // a crowned goblin-king bust
    voidbeast:  function(g){ creature(g, 0x501d3, { smooth: true, eyes: [6, 8, 10], eye: 6, cy: 12.5, ry: 8 }); }  // smooth cosmic head, 3 purple eyes
  };

  // ---- public: cells(id) (pure) + draw(canvas,id,opts) (renders) ------------
  function cells(id){
    const gen = GEN[id]; if(!gen) return null;
    const g = newGrid(); gen(g);
    return { size: SIZE, cells: g };
  }
  // Render emblem `id` to `canvas`, scaled to fit + CENTRED with a safe margin (maskable:
  // the subject never relies on the corners). Full-bleed violet field behind it; cells are
  // drawn as chunky squares so it stays crisp pixel-art from 48 px to 512 px.
  function draw(canvas, id, opts){
    if(!canvas || !canvas.getContext) return false;
    const grid = cells(id); if(!grid) return false;
    opts = opts || {};
    const W = canvas.width || 0, H = canvas.height || 0;
    if(!W || !H) return false;
    const ctx = canvas.getContext("2d"); if(!ctx) return false;
    if(ctx.imageSmoothingEnabled != null) ctx.imageSmoothingEnabled = false;
    // field
    ctx.fillStyle = toHex(opts.bg ? parseColor(opts.bg) : BG);
    ctx.fillRect(0, 0, W, H);
    const g = grid.cells;
    // T205 — fit the SUBJECT'S content bounding box (not the full 24² grid) so the creature
    // FILLS the cell cleanly: scale the lit-cell bbox to the available square, centred, with a
    // small safe margin — nothing clipped, no dead margin, and every emblem reads the same size
    // (the old full-grid map left the creatures small + off-centre → "looked like they needed
    // cropping"). Integer cell size keeps the pixel-art crisp.
    let minX = SIZE, minY = SIZE, maxX = -1, maxY = -1;
    for(let y = 0; y < SIZE; y++) for(let x = 0; x < SIZE; x++) if(g[y][x]){ if(x < minX) minX = x; if(x > maxX) maxX = x; if(y < minY) minY = y; if(y > maxY) maxY = y; }
    if(maxX < 0){ minX = minY = 0; maxX = maxY = SIZE - 1; }   // empty grid → fall back to the full grid
    const bw = maxX - minX + 1, bh = maxY - minY + 1, span = Math.max(bw, bh);
    const margin = opts.margin == null ? 0.10 : opts.margin;   // small safe margin (corners stay field → maskable)
    const avail = Math.min(W, H) * (1 - margin * 2);
    const cell = Math.max(1, Math.round(avail / span));        // round (not floor) so the subject fills `avail`, not a coarse fraction of it
    // centre the bbox: cell x maps to ox + x*cell, with the bbox (minX..maxX) centred in W×H.
    const ox = Math.round((W - cell * bw) / 2) - minX * cell;
    const oy = Math.round((H - cell * bh) / 2) - minY * cell;
    for(let y = minY; y <= maxY; y++) for(let x = minX; x <= maxX; x++){
      const ink = g[y][x]; if(!ink) continue;
      ctx.fillStyle = toHex(PALETTE[ink]);
      ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
    }
    return true;
  }

  // tiny colour helpers (self-contained; mirror fxgl/glyphs)
  function parseColor(c){ if(Array.isArray(c)) return c; let h = String(c).replace("#", ""); if(h.length === 3) h = h.replace(/(.)/g, "$1$1"); const n = parseInt(h, 16); return isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [0, 0, 0]; }
  function toHex(c){ return "#" + [c[0], c[1], c[2]].map(v => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, "0")).join(""); }

  const api = { IDS: IDS, SIZE: SIZE, PALETTE: PALETTE, BG: BG, cells: cells, draw: draw };
  if(typeof window !== "undefined") window.Emblems = api;
  if(typeof module !== "undefined" && module.exports) module.exports = api;
})();
