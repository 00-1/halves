/*
 * Halves — ranks, collectibles, and procedural 16-bit icons.
 *
 * Everything here is data + pure functions; main.js owns persistence and the
 * DOM. The collectible catalogue is generated programmatically (one entry per
 * question, per mode, plus ranks, speed brackets and milestones) so it is
 * large by construction. Icons are drawn as deterministic pixel sprites from
 * each item's id — no image assets required.
 */
(function(){
  "use strict";

  const MODES = window.MODES;

  // ---- rarity palettes (body / accent / outline) --------------------------
  const RARITY = {
    common:    { body:"#7e8a97", accent:"#aeb9c4", outline:"#222a35" },
    uncommon:  { body:"#3fce8c", accent:"#8ef0bf", outline:"#103324" },
    rare:      { body:"#3f97d8", accent:"#9ad4f4", outline:"#0f2a44" },
    epic:      { body:"#9a5cf6", accent:"#cda9ff", outline:"#271544" },
    legendary: { body:"#f0ad3c", accent:"#ffd98a", outline:"#46300f" }
  };
  const RORDER = { legendary:0, epic:1, rare:2, uncommon:3, common:4 };
  function paletteFor(r){ return RARITY[r] || RARITY.common; }

  // ---- fantasy rank ladder (per finished round) ---------------------------
  const RANKS = [
    { key:"goblin",     name:"Goblin Whelp", color:"#8a9bb0", rarity:"common" },
    { key:"apprentice", name:"Apprentice",   color:"#aeb9c4", rarity:"common" },
    { key:"squire",     name:"Squire",       color:"#3fce8c", rarity:"uncommon" },
    { key:"knight",     name:"Knight",       color:"#5bb4e8", rarity:"uncommon" },
    { key:"mage",       name:"Battle Mage",  color:"#5bb4e8", rarity:"rare" },
    { key:"sorcerer",   name:"Sorcerer",     color:"#b98bff", rarity:"epic" },
    { key:"darkwizard", name:"Dark Wizard",  color:"#cda9ff", rarity:"epic" },
    { key:"archmage",   name:"Archmage",     color:"#f5b544", rarity:"legendary" }
  ];
  // Rank from clean-score fraction, with the top two tiers needing a perfect
  // round (and Archmage also needing real speed).
  function rankIndex(score, total, time){
    const f = total ? score/total : 0;
    const avg = total ? time/total : 99;
    if(f >= 1 && avg < 1.3) return 7;
    if(f >= 1)    return 6;
    if(f >= 0.9)  return 5;
    if(f >= 0.8)  return 4;
    if(f >= 0.68) return 3;
    if(f >= 0.55) return 2;
    if(f >= 0.4)  return 1;
    return 0;
  }

  // ---- catalogue ----------------------------------------------------------
  const SPARK = 1.5;   // seconds: a "fast, clean" solve
  const SPEED = [      // per-answer average brackets for a whole round
    { name:"Quick",     avg:2.2, rarity:"common" },
    { name:"Swift",     avg:1.8, rarity:"uncommon" },
    { name:"Blazing",   avg:1.4, rarity:"rare" },
    { name:"Lightning", avg:1.1, rarity:"epic" }
  ];
  const CATS = ["Rank","Initiation","Flawless","Speed","Solved","Spark","Milestone","Collector"];

  const CATALOG = [];
  const byIdMap = {};
  function add(it){ CATALOG.push(it); byIdMap[it.id] = it; }

  // ranks
  RANKS.forEach((rk,i) => add({
    id:"rank:"+rk.key, name:rk.name, rarity:rk.rarity, cat:"Rank", modeId:null,
    desc:"Reach the rank of "+rk.name+" in any mode.",
    test: ctx => ctx.rankIndex === i
  }));

  // per-mode: initiation, flawless, speed brackets
  MODES.forEach(m => {
    add({ id:"init:"+m.id, name:m.name+" Initiate", rarity:"uncommon", cat:"Initiation", modeId:m.id,
      desc:"Finish your first "+m.name+" round.", test: () => true });
    add({ id:"flawless:"+m.id, name:"Flawless "+m.name, rarity:"rare", cat:"Flawless", modeId:m.id,
      desc:"Finish "+m.name+" with zero mistakes.", test: ctx => ctx.mistakes === 0 });
    SPEED.forEach((lv,i) => add({
      id:"speed:"+m.id+":"+i, name:lv.name+" "+m.name, rarity:lv.rarity, cat:"Speed", modeId:m.id,
      desc:"Average under "+lv.avg+"s per answer across a "+m.name+" round.",
      test: ctx => ctx.avg < lv.avg
    }));
  });

  // per-question: "Beat" (first clean solve) and "Spark" (first fast clean solve)
  MODES.forEach(m => {
    const qs = m.build().slice().sort((a,b) =>
      String(a.p).localeCompare(String(b.p), undefined, { numeric:true }));
    qs.forEach(q => {
      const key = q.p;
      add({ id:"solve:"+m.id+":"+key, name:"Beat "+key, rarity:"common", cat:"Solved", modeId:m.id,
        desc:"Cleanly solve “"+key+" = "+q.a+"” in "+m.name+".",
        test: ctx => { const r = ctx.qmap[key]; return !!r && r.miss === 0; } });
      add({ id:"spark:"+m.id+":"+key, name:"Spark · "+key, rarity:"uncommon", cat:"Spark", modeId:m.id,
        desc:"Solve “"+key+"” cleanly in under "+SPARK+"s.",
        test: ctx => { const r = ctx.qmap[key]; return !!r && r.miss === 0 && r.t < SPARK; } });
    });
  });

  // milestones
  add({ id:"meta:allmodes", name:"Pentamind", rarity:"epic", cat:"Milestone", modeId:null,
    desc:"Finish a round in all five modes.", test: ctx => ctx.stats.modesCleared >= MODES.length });
  add({ id:"meta:allflawless", name:"Untouchable", rarity:"legendary", cat:"Milestone", modeId:null,
    desc:"Earn a flawless round in every mode.", test: ctx => ctx.stats.flawless >= MODES.length });
  [[5,"uncommon","Regular"],[25,"rare","Devoted"],[100,"epic","Relentless"]].forEach(([n,r,nm]) =>
    add({ id:"meta:games"+n, name:nm, rarity:r, cat:"Milestone", modeId:null,
      desc:"Play "+n+" rounds in total.", test: ctx => ctx.stats.games >= n }));

  // collector (evaluated against how much you've collected; handled separately)
  [[25,"rare","Curator"],[75,"epic","Hoarder"],[150,"legendary","Completionist"]].forEach(([n,r,nm]) =>
    add({ id:"collector:"+n, name:nm, rarity:r, cat:"Collector", modeId:null, n:n,
      desc:"Collect "+n+" items." }));

  function sortItems(arr){
    return arr.slice().sort((a,b) => (RORDER[a.rarity]-RORDER[b.rarity]) || a.name.localeCompare(b.name));
  }

  // Returns the catalogue items (excluding Collector) newly satisfied by ctx.
  function evaluate(ctx, has){
    const out = [];
    for(const it of CATALOG){
      if(it.cat === "Collector") continue;
      if(has(it.id)) continue;
      if(it.modeId && it.modeId !== ctx.mode.id) continue;
      let ok = false;
      try{ ok = it.test(ctx); }catch(e){ ok = false; }
      if(ok) out.push(it);
    }
    return sortItems(out);
  }
  // Collector items, given the current owned count.
  function evaluateCollector(count, has){
    const out = [];
    for(const it of CATALOG){
      if(it.cat !== "Collector" || has(it.id)) continue;
      if(count >= it.n) out.push(it);
    }
    return sortItems(out);
  }

  // ---- procedural 16-bit icons -------------------------------------------
  function hashStr(str){
    let h = 2166136261 >>> 0;
    for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(a){
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // Draws a mirrored pixel sprite, seeded by `seed`, using palette `pal`.
  function drawIcon(canvas, seed, pal){
    const G = 12;                                   // logical grid
    const cx = canvas.getContext("2d");
    const scale = Math.max(1, Math.floor(canvas.width / G));
    cx.clearRect(0,0,canvas.width,canvas.height);
    const off = Math.floor((canvas.width - scale*G) / 2);
    const rnd = mulberry32(hashStr(seed));

    const grid = [];
    for(let y=0;y<G;y++){ grid[y] = new Array(G).fill(0); }
    const half = Math.floor(G/2);
    for(let y=1;y<G-1;y++){
      for(let x=1;x<=half-1;x++){
        // denser toward the vertical centre for a creature-ish silhouette
        const bias = 0.62 - Math.abs(y-(G-1)/2)/G*0.4;
        const on = rnd() < bias ? 1 : 0;
        grid[y][x] = on; grid[y][G-1-x] = on;       // mirror left→right
      }
    }
    const filled = (x,y) => x>=0 && y>=0 && x<G && y<G && grid[y][x];

    // outline: empty cells touching a filled cell
    cx.fillStyle = pal.outline;
    for(let y=0;y<G;y++) for(let x=0;x<G;x++){
      if(!grid[y][x] && (filled(x-1,y)||filled(x+1,y)||filled(x,y-1)||filled(x,y+1)))
        cx.fillRect(off+x*scale, off+y*scale, scale, scale);
    }
    // body / accent
    for(let y=0;y<G;y++) for(let x=0;x<G;x++){
      if(grid[y][x]){
        cx.fillStyle = rnd() < 0.28 ? pal.accent : pal.body;
        cx.fillRect(off+x*scale, off+y*scale, scale, scale);
      }
    }
  }

  window.Collectibles = {
    RANKS, RARITY, paletteFor, rankIndex,
    CATALOG, byId: id => byIdMap[id],
    categories: () => CATS.slice(),
    evaluate, evaluateCollector, drawIcon,
    SPARK, SPEED
  };
})();
