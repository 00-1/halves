/*
 * Halves — procedural Arena enemy sprites (T52).
 *
 * A standalone monster-sprite generator, separate from the collectibles icon
 * system (it does NOT touch C.drawIcon / the item archetypes / the hero blob).
 * Pure + deterministic: a tier always yields the same creature. Sprites are
 * static (drawn once per render — no RAF). Themed by the 10 regions and tinted by
 * the tier's RPS type; bosses (every 12th tier) read bigger/crowned.
 *
 * window.Monsters = {
 *   buildGrid(tier) -> { role:16x16 (0 empty·1 outline·2 body·3 accent·4 eye), boss },
 *   draw(canvas, tier)
 * }
 * `tier` = { n, name, type } (n drives the seed; type tints; n→region themes).
 */
(function(){
  "use strict";
  const G = 16;
  function hashStr(s){ let h = 2166136261 >>> 0; s = String(s); for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function grid0(){ const t = []; for(let y=0;y<G;y++) t[y] = new Array(G).fill(0); return t; }
  const inB = (x,y) => x>=0 && x<G && y>=0 && y<G;
  function set(g,x,y){ if(inB(x,y)) g[y][x] = 1; }
  function setSym(g,x,y){ set(g,x,y); set(g,G-1-x,y); }   // mirror about the vertical axis

  const REGION_SIZE = 12;   // matches Enemies; bosses sit on the 12th of each region

  // Per-type palette (body/accent/outline/eye). Region adds structural variety, not colour.
  const PAL = {
    Brawn:   { body:"#c0563f", accent:"#e8895f", outline:"#3a1410", eye:"#ffe6a8" },
    Cunning: { body:"#369d68", accent:"#7fe0a8", outline:"#0f3324", eye:"#eafff0" },
    Arcane:  { body:"#7d54d6", accent:"#b89bf0", outline:"#1f1340", eye:"#fbe6ff" }
  };

  // ---- pure grid builder --------------------------------------------------
  function buildGrid(tier){
    const n = (tier && tier.n) | 0 || 1;
    const name = (tier && tier.name) || ("Tier " + n);
    const type = (tier && tier.type) || "Brawn";
    const region = Math.floor((n - 1) / REGION_SIZE);
    const boss = (n % REGION_SIZE === 0);
    const rnd = mulberry32((hashStr(name) ^ Math.imul(n, 2654435761)) >>> 0);

    const g = grid0(), a = grid0(), e = grid0();
    // body: a lumpy, vertically-symmetric blob; bosses are larger.
    const rx = (boss ? 6.4 : 4.4 + rnd() * 1.3);
    const ry = (boss ? 6.8 : 5.0 + rnd() * 1.3);
    const cy = (boss ? 8.2 : 8.6);
    const lump = 0.8 + rnd() * 0.35;
    let topY = G, botY = 0;
    for(let y=0;y<G;y++){
      const dy = (y - cy) / ry;
      if(Math.abs(dy) > 1) continue;
      let hw = rx * Math.sqrt(1 - dy*dy) * (0.82 + 0.36 * (((y * 73 + n) % 7) / 7) * lump);
      for(let x=0;x<8;x++){ if(7.5 - x <= hw){ setSym(g, x, y); if(y<topY) topY=y; if(y>botY) botY=y; } }
    }
    // horns / antennae on top — region-biased (void region 9 gets none, a smooth head)
    const horns = region >= 9 ? 0 : (region >= 4 ? 2 : (rnd() < 0.45 ? 1 : 2));
    if(horns === 1){ for(let k=1;k<=2+region%2;k++) setSym(g, 7, topY - k); }   // central spike
    else if(horns === 2){ const hx = 5 - (region % 2); for(let k=1;k<=2;k++){ setSym(g, hx, topY - k); } setSym(g, hx, topY); }
    // eyes — 1..3, more in the deeper/void regions; bosses never single-eyed
    let ec = 1 + Math.floor(rnd() * (region >= 8 ? 3 : 2));
    if(boss) ec = Math.max(2, ec);
    const eyeY = Math.max(topY + 1, Math.round(cy - ry * 0.32));
    if(ec === 1){ e[eyeY][7] = 1; e[eyeY][8] = 1; }
    else if(ec === 2){ for(const x of [5,6]) setEye(e, x, eyeY); }
    else { for(const x of [4,5]) setEye(e, x, eyeY); e[eyeY-1] && (e[eyeY-1][7]=1, e[eyeY-1][8]=1); }
    // mouth — a row of teeth (accent), region-jittered
    const mY = Math.min(botY - 1, eyeY + 2 + (region % 2));
    for(let x=4;x<=7;x++){ if(g[mY] && g[mY][x] && (x + region) % 2 === 0){ a[mY][x]=1; a[mY][G-1-x]=1; } }
    // body texture: symmetric spots
    for(let y=topY;y<=botY;y++) for(let x=0;x<8;x++){ if(g[y][x] && e[y][x] !== 1 && rnd() < 0.11 + region * 0.006){ a[y][x]=1; a[y][G-1-x]=1; } }
    // feet / tentacle stubs at the base
    if(botY + 1 < G){ const fx = region >= 9 ? [4,6] : [5]; for(const x of fx) setSym(g, x, botY + 1); }
    // boss crown: a notched gold-ish band above the head (accent), + a taller frame
    if(boss){
      const cyTop = Math.max(0, topY - 1);
      for(const x of [4,6,7]){ setSym(g, x, cyTop); a[cyTop][x]=1; a[cyTop][G-1-x]=1; }
      for(const x of [4,7]) setSym(g, x, Math.max(0, cyTop - 1));
    }

    // role grid (0 empty·1 outline·2 body·3 accent·4 eye) — eyes/accent imply body
    const role = grid0();
    const fl = (x,y) => inB(x,y) && (g[y][x] || e[y][x]);
    for(let y=0;y<G;y++) for(let x=0;x<G;x++){
      if(e[y][x]) role[y][x] = 4;
      else if(g[y][x]) role[y][x] = a[y][x] ? 3 : 2;
      else if(fl(x-1,y)||fl(x+1,y)||fl(x,y-1)||fl(x,y+1)) role[y][x] = 1;
    }
    return { role, boss, type, region, pal: PAL[type] || PAL.Brawn };
  }
  function setEye(e, x, y){ e[y][x] = 1; e[y][G-1-x] = 1; }

  // ---- paint --------------------------------------------------------------
  function draw(canvas, tier){
    if(!canvas || !canvas.getContext) return;
    const { role, pal } = buildGrid(tier);
    const cx = canvas.getContext("2d");
    const scale = Math.max(1, Math.floor(canvas.width / G));
    const off = Math.floor((canvas.width - scale * G) / 2);
    cx.clearRect(0, 0, canvas.width, canvas.height);
    const col = { 1: pal.outline, 2: pal.body, 3: pal.accent, 4: pal.eye };
    for(let y=0;y<G;y++) for(let x=0;x<G;x++){
      const r = role[y][x]; if(!r) continue;
      cx.fillStyle = col[r];
      cx.fillRect(off + x * scale, off + y * scale, scale, scale);
    }
  }

  window.Monsters = { buildGrid: buildGrid, draw: draw, G: G };
})();
