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
  const IDS = ["coin", "crowncoin", "hoard", "goblin", "voidthrone", "sigil"];

  // ---- grid + drawing primitives (pure) -------------------------------------
  function newGrid(){ const g = new Array(SIZE); for(let y = 0; y < SIZE; y++) g[y] = new Array(SIZE).fill(0); return g; }
  function set(g, x, y, ink){ if(x >= 0 && x < SIZE && y >= 0 && y < SIZE) g[y | 0][x | 0] = ink; }
  // A beveled gold DISC at (cx,cy) radius r: outline ring, radial gold ramp lit from the
  // upper-left (highlight UL → shadow LR), with an optional glint. The coin look, in cells.
  function disc(g, cx, cy, r, glint){
    for(let y = 0; y < SIZE; y++) for(let x = 0; x < SIZE; x++){
      const dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
      if(d > r + 0.5) continue;
      if(d > r - 1.05){ g[y][x] = 1; continue; }                 // outline ring
      const lit = -(dx + dy) / (r * 1.45);                       // upper-left bright
      const v = lit - (d / r) * 0.45;                            // darker toward the rim
      g[y][x] = v > 0.34 ? 4 : v > -0.12 ? 3 : 2;                // hi / mid / shadow
    }
    if(glint){ set(g, cx - r * 0.42, cy - r * 0.42, 5); set(g, cx - r * 0.42 + 1, cy - r * 0.42, 5); set(g, cx - r * 0.42, cy - r * 0.42 + 1, 4); }
  }
  // Stamp a hooked-goblin profile (outline cells) onto the centre of a coin.
  function stampProfile(g, cx, cy, r){
    const p = [[-1,-3],[-1,-2],[-2,-1],[-2,0],[-3,1],[-2,1],[-1,2],[-1,3],[1,-3],[1,-2],[1,3],[2,3]];
    for(const [ox, oy] of p) set(g, cx + ox, cy + oy, 1);
    set(g, cx + 1, cy - 1, 5);   // a tiny eye glint
  }

  // ---- the emblems (each fills a fresh grid, deterministically) --------------
  const GEN = {
    // a fat beveled gold coin with a goblin profile stamped + a glint
    coin: function(g){ disc(g, 12, 12.5, 10.5, true); stampProfile(g, 12, 12, 9); },
    // the coin, wearing a tiny three-point crown
    crowncoin: function(g){
      disc(g, 12, 14, 9.5, true); stampProfile(g, 12, 13.5, 8);
      const crown = [[7,4],[8,3],[9,4],[10,2],[11,3],[12,2],[13,3],[14,2],[15,4],[16,3],[17,4]];
      for(const [x, y] of crown) set(g, x, y, 4);
      for(let x = 7; x <= 17; x++) set(g, x, 5, 3);     // crown band
      set(g, 12, 2, 5);
    },
    // a small glinting coin-mound (a hoard): overlapping discs settled at the bottom
    hoard: function(g){
      disc(g, 12, 19, 4.5, false); disc(g, 7, 18, 3.5, false); disc(g, 17, 18, 3.5, false);
      disc(g, 9, 15, 3.5, true); disc(g, 15, 14, 4, true); disc(g, 12, 12, 4.5, true);
      set(g, 12, 9, 5); set(g, 16, 11, 5); set(g, 8, 13, 5);   // crest glints
    },
    // a cheeky pixel goblin head (pointy ears, hooked nose, grin) clutching a coin
    goblin: function(g){
      // head silhouette (gold), rows ~5..17, cols ~7..16
      for(let y = 6; y <= 16; y++) for(let x = 7; x <= 16; x++){
        const dx = (x - 11.5) / 5.2, dy = (y - 11) / 5.6, d = dx * dx + dy * dy;
        if(d <= 1) g[y][x] = (-(dx + dy) > 0.2) ? 4 : (d > 0.62 ? 2 : 3);
      }
      // pointy ears
      [[6,9],[5,8],[6,10],[17,9],[18,8],[17,10]].forEach(([x,y]) => set(g, x, y, 3));
      // eyes + hooked nose + grin (outline)
      set(g, 9, 10, 1); set(g, 14, 10, 1); set(g, 9, 10, 1);
      set(g, 11, 11, 1); set(g, 12, 12, 1); set(g, 11, 13, 1);
      for(let x = 9; x <= 14; x++) set(g, x, 14, 1);
      set(g, 9, 10, 5); set(g, 14, 10, 5);   // eye glints
      disc(g, 12, 20, 3, true);              // the clutched coin
    },
    // an ominous cosmic-purple throne with gold at its foot + star glints
    voidthrone: function(g){
      for(let y = 4; y <= 17; y++) for(let x = 9; x <= 14; x++) set(g, x, y, 6);   // tall seat back
      for(let x = 7; x <= 16; x++){ set(g, x, 16, 6); set(g, x, 17, 6); }          // seat
      [[8,5],[15,5],[7,7],[16,7],[8,9],[15,9]].forEach(([x,y]) => set(g, x, y, 6)); // arms/spires
      for(let x = 7; x <= 16; x++){ set(g, x, 18, 2); set(g, x, 19, 3); set(g, x, 20, 2); } // gold at the foot
      disc(g, 12, 20, 2.5, true);
      [[5,4],[18,6],[4,11],[19,12],[12,3]].forEach(([x,y]) => set(g, x, y, 5));    // cosmic stars
      set(g, 12, 10, 4); set(g, 12, 11, 4);   // a gold gem on the throne
    },
    // an abstract goblin-gold SIGIL: the brand "/" slash through a coin (mark-forward)
    sigil: function(g){
      disc(g, 12, 12, 10.5, false);
      for(let i = -7; i <= 7; i++){ set(g, 12 + i, 12 - i, 1); set(g, 12 + i + 1, 12 - i, 4); }  // the slash + a lit edge
      set(g, 6, 18, 5); set(g, 18, 6, 5);    // end glints
      stampProfile(g, 12, 12, 9);
      // re-lay the slash highlight over the profile so the mark stays dominant
      for(let i = -6; i <= 6; i++) set(g, 12 + i + 1, 12 - i, 4);
    }
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
    // fit the SIZE×SIZE grid into the smaller dimension with a maskable margin (~14%)
    const margin = opts.margin == null ? 0.14 : opts.margin;
    const avail = Math.min(W, H) * (1 - margin * 2);
    const cell = Math.max(1, Math.floor(avail / SIZE));
    const ox = Math.round((W - cell * SIZE) / 2), oy = Math.round((H - cell * SIZE) / 2);
    const g = grid.cells;
    for(let y = 0; y < SIZE; y++) for(let x = 0; x < SIZE; x++){
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
