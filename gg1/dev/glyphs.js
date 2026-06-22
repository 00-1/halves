/*
 * Halves — procedural pixel bitmap-font for the topic glyphs / app mark (T56).
 *
 * The brand mark and every topic's glyph used to be typographic HTML (a mono
 * font with a coloured "slash" span). This replaces them with a tiny, chunky
 * PIXEL FONT drawn to a <canvas> (image-rendering:pixelated) so the operators
 * read as crisp game art at any size — big on the entry/start mark, small on a
 * guide/practice title or a toast — and so the same renderer can mint the
 * favicon / home-screen icon at runtime.
 *
 * Pure + deterministic: buildGrid(tokens) returns a {w,h,cells} grid of ink
 * codes (0 empty · 1 operand body · 2 operator accent) with no DOM/RAF, so it
 * is unit-testable. draw(canvas, tokens, opts) is the only side-effecting bit
 * and is static (drawn once, never animated).
 *
 * Tokens are a compact string DSL (see modes.js `glyphTokens`):
 *   "x"      a glyph in operand ink           (digits, x a b n k, × ÷ + − ± / %)
 *   "*×"     leading "*" = operator ACCENT ink (the amber-highlighted symbol)
 *   "f12"    a slashed vulgar fraction 1⁄2     (num · diagonal slash · den)
 *   "s2"     a raised superscript 2            (for x²)
 *
 * window.Glyphs = { buildGrid(tokens)->{w,h,cells,missing}, draw(canvas,tokens,opts), H }
 */
(function(){
  "use strict";

  // Big 5×7 cells. Covers exactly the symbols the glyphs use: 0–9, x a b n k,
  // and the operators × ÷ + − ± / %.
  const BIG = {
    "0":[".###.","#...#","#..##","#.#.#","##..#","#...#",".###."],
    "1":["..#..",".##..","..#..","..#..","..#..","..#..",".###."],
    "2":[".###.","#...#","....#","..##.",".#...","#....","#####"],
    "3":["#####","...#.","..##.","....#","....#","#...#",".###."],
    "4":["...#.","..##.",".#.#.","#..#.","#####","...#.","...#."],
    "5":["#####","#....","####.","....#","....#","#...#",".###."],
    "6":["..##.",".#...","#....","####.","#...#","#...#",".###."],
    "7":["#####","....#","...#.","..#..",".#...",".#...",".#..."],
    "8":[".###.","#...#","#...#",".###.","#...#","#...#",".###."],
    "9":[".###.","#...#","#...#",".####","....#","...#.",".##.."],
    "x":[".....",".....","#...#",".#.#.","..#..",".#.#.","#...#"],
    "a":[".....",".....",".###.","....#",".####","#...#",".####"],
    "b":["#....","#....","####.","#...#","#...#","#...#","####."],
    "n":[".....",".....","####.","#...#","#...#","#...#","#...#"],
    "k":["#....","#....","#..#.","#.#..","##...","#.#..","#..#."],
    "×":[".....",".....","#...#",".#.#.","..#..",".#.#.","#...#"], // ×
    "÷":[".....","..#..",".....","#####",".....","..#..","....."], // ÷
    "+":[".....","..#..","..#..","#####","..#..","..#..","....."],
    "−":[".....",".....",".....","#####",".....",".....","....."], // −
    "±":["..#..","..#..","#####","..#..","..#..",".....","#####"], // ±
    "/":["....#","...#.","..#..","..#..",".#...",".#...","#...."],
    "%":["##..#","##.#.","...#.","..#..",".#...",".#.##","#..##"]
  };

  // Small 3×4 cells for fraction numerator/denominator + superscripts (1–4).
  const SMALL = {
    "1":[".#.",".#.",".#.",".#."],
    "2":["##.","..#",".#.","###"],
    "3":["##.","..#","..#","##."],
    "4":["#.#","#.#","###","..#"]
  };

  const H = 9;        // grid height: big chars sit on rows 1‑7; fractions use 0‑8
  const GAP = 1;      // blank column between adjacent tokens

  // Parse one token-string into a descriptor. Leading "*" flags accent (ink 2).
  function parse(s){
    let ink = 1;
    if(s.charAt(0) === "*"){ ink = 2; s = s.slice(1); }
    if(s.charAt(0) === "f") return { type:"frac", num:s.charAt(1), den:s.charAt(2), ink:ink, w:13 };
    if(s.charAt(0) === "s") return { type:"sup",  ch:s.charAt(1), ink:ink, w:3 };
    return { type:"char", ch:s, ink:ink, w:5 };
  }

  function buildGrid(tokens){
    const toks = tokens.map(parse);
    let w = 0;
    toks.forEach((t,i) => { w += (i ? GAP : 0) + t.w; });
    const cells = [];
    for(let y=0;y<H;y++){ cells[y] = new Array(w).fill(0); }
    const missing = [];
    let x = 0;
    toks.forEach((t,i) => {
      if(i) x += GAP;
      stamp(cells, t, x, missing);
      x += t.w;
    });
    return { w:w, h:H, cells:cells, missing:missing };
  }

  // Paint a descriptor into the grid at column x0 (recording unknown chars).
  function stamp(cells, t, x0, missing){
    if(t.type === "char"){
      const g = BIG[t.ch];
      if(!g){ missing.push(t.ch); return; }
      for(let r=0;r<7;r++) for(let c=0;c<5;c++) if(g[r].charAt(c) === "#") cells[1+r][x0+c] = t.ink;
    } else if(t.type === "sup"){
      const g = SMALL[t.ch];
      if(!g){ missing.push(t.ch); return; }
      for(let r=0;r<4;r++) for(let c=0;c<3;c++) if(g[r].charAt(c) === "#") cells[r][x0+c] = t.ink;
    } else { // frac (T124): a FULL‑SIZE slashed fraction — BIG numerator / diagonal
      // slash / BIG denominator, side‑by‑side on the big rows (like the legible
      // "a/b"). Far clearer at node size than T104's cramped SMALL 3×4 blob, and it
      // uses the WIDE node's horizontal space (13×9 vs the old narrow 5×9).
      const gn = BIG[t.num], gd = BIG[t.den];
      if(!gn) missing.push(t.num); else for(let r=0;r<7;r++) for(let c=0;c<5;c++) if(gn[r].charAt(c) === "#") cells[1+r][x0+c] = t.ink;       // numerator (big), cols 0‑4 rows 1‑7
      // a 3‑wide diagonal slash spanning the full height, between num and den
      const slash = [[8,0],[7,0],[6,1],[5,1],[4,1],[3,1],[2,1],[1,2],[0,2]];
      slash.forEach(p => { cells[p[0]][x0+5+p[1]] = t.ink; });                                                                               // slash, cols 5‑7 rows 0‑8
      if(!gd) missing.push(t.den); else for(let r=0;r<7;r++) for(let c=0;c<5;c++) if(gd[r].charAt(c) === "#") cells[1+r][x0+8+c] = t.ink;     // denominator (big), cols 8‑12 rows 1‑7
    }
  }

  // Static, pixelated paint. opts: { body, accent, bg, pad }.
  function draw(canvas, tokens, opts){
    if(!canvas || !canvas.getContext) return;
    opts = opts || {};
    const body = opts.body || "#E6E9EF", accent = opts.accent || "#F5B544", pad = opts.pad || 0;
    const g = buildGrid(tokens), cx = canvas.getContext("2d");
    const W = canvas.width, Hh = canvas.height;
    cx.clearRect(0,0,W,Hh);
    if(opts.bg){ cx.fillStyle = opts.bg; cx.fillRect(0,0,W,Hh); }
    if(cx.imageSmoothingEnabled !== undefined) cx.imageSmoothingEnabled = false;
    const cell = Math.max(1, Math.floor(Math.min((W - 2*pad)/g.w, (Hh - 2*pad)/g.h)));
    const ox = Math.floor((W - cell*g.w)/2), oy = Math.floor((Hh - cell*g.h)/2);
    for(let y=0;y<g.h;y++) for(let x=0;x<g.w;x++){
      const v = g.cells[y][x];
      if(!v) continue;
      cx.fillStyle = v === 2 ? accent : body;
      cx.fillRect(ox + x*cell, oy + y*cell, cell, cell);
    }
  }

  window.Glyphs = { buildGrid: buildGrid, draw: draw, H: H, BIG: BIG, SMALL: SMALL };
})();
