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
  // A long ladder (low index = lowest). Ranks 0–6 are for imperfect rounds and
  // sort by accuracy; ranks 7+ require a perfect round and sort by speed
  // (average seconds per answer), so there's always somewhere higher to climb.
  const RANKS = [
    { key:"goblin",       name:"Goblin Whelp",  color:"#8a9bb0", rarity:"common" },
    { key:"kobold",       name:"Kobold",        color:"#97a4b1", rarity:"common" },
    { key:"urchin",       name:"Street Urchin", color:"#aeb9c4", rarity:"common" },
    { key:"apprentice",   name:"Apprentice",    color:"#c2ccd6", rarity:"common" },
    { key:"squire",       name:"Squire",        color:"#3fce8c", rarity:"uncommon" },
    { key:"journeyman",   name:"Journeyman",    color:"#5bd6a0", rarity:"uncommon" },
    { key:"adept",        name:"Adept",         color:"#7ee0b6", rarity:"uncommon" },
    { key:"knight",       name:"Knight",        color:"#8ef0bf", rarity:"uncommon" },
    { key:"battlemage",   name:"Battle Mage",   color:"#5bb4e8", rarity:"rare" },
    { key:"warlock",      name:"Warlock",       color:"#6fc0ee", rarity:"rare" },
    { key:"enchanter",    name:"Enchanter",     color:"#8ecbf0", rarity:"rare" },
    { key:"sorcerer",     name:"Sorcerer",      color:"#a36bff", rarity:"epic" },
    { key:"darkwizard",   name:"Dark Wizard",   color:"#cda9ff", rarity:"epic" },
    { key:"shadowmancer", name:"Shadowmancer",  color:"#b98bff", rarity:"epic" },
    { key:"necromancer",  name:"Necromancer",   color:"#d0b3ff", rarity:"epic" },
    { key:"archmage",     name:"Archmage",      color:"#f5b544", rarity:"legendary" },
    { key:"runelord",     name:"Runelord",      color:"#f6c062", rarity:"legendary" },
    { key:"sage",         name:"Sage",          color:"#ffd98a", rarity:"legendary" },
    { key:"grandmaster",  name:"Grandmaster",   color:"#ffe07a", rarity:"legendary" },
    { key:"celestial",    name:"Celestial",     color:"#bfe6ff", rarity:"legendary" },
    { key:"ascendant",    name:"Ascendant",     color:"#d8c4ff", rarity:"legendary" },
    { key:"transcendent", name:"Transcendent",  color:"#7ef0ff", rarity:"legendary" },
    { key:"godhand",      name:"God-Hand",      color:"#ffe9a8", rarity:"legendary" }
  ];
  function rankIndex(score, total, time){
    const f = total ? score/total : 0;
    const avg = total ? time/total : 99;
    if(f < 1){                         // imperfect: rank by accuracy
      if(f < 0.35) return 0;
      if(f < 0.5)  return 1;
      if(f < 0.62) return 2;
      if(f < 0.74) return 3;
      if(f < 0.85) return 4;
      if(f < 0.95) return 5;
      return 6;
    }
    // perfect: rank by average seconds per answer (faster → higher)
    if(avg > 6.5)  return 7;
    if(avg > 5.5)  return 8;
    if(avg > 4.8)  return 9;
    if(avg > 4.2)  return 10;
    if(avg > 3.7)  return 11;
    if(avg > 3.2)  return 12;   // Dark Wizard
    if(avg > 2.8)  return 13;
    if(avg > 2.4)  return 14;
    if(avg > 2.1)  return 15;
    if(avg > 1.8)  return 16;
    if(avg > 1.55) return 17;
    if(avg > 1.35) return 18;
    if(avg > 1.18) return 19;
    if(avg > 1.02) return 20;
    if(avg > 0.88) return 21;
    return 22;
  }

  // ---- catalogue ----------------------------------------------------------
  const SPARK = 1.5;   // seconds: a "fast, clean" solve
  const SPEED = [      // per-answer average brackets for a whole round
    { name:"Quick",     avg:2.2, rarity:"common" },
    { name:"Swift",     avg:1.8, rarity:"uncommon" },
    { name:"Blazing",   avg:1.4, rarity:"rare" },
    { name:"Lightning", avg:1.1, rarity:"epic" }
  ];
  const CATS = ["Rank","Initiation","Flawless","Speed","Mastery","Solved","Spark","Milestone","Collector","Loot"];

  const CATALOG = [];
  const byIdMap = {};
  function add(it){ CATALOG.push(it); byIdMap[it.id] = it; }

  // ranks — reaching a rank also grants every lower rank (you can't be expected to
  // play *worse* to backfill them), so a single good round awards all ranks up to
  // the one you hit.
  RANKS.forEach((rk,i) => add({
    id:"rank:"+rk.key, name:rk.name, rarity:rk.rarity, cat:"Rank", modeId:null,
    desc:"Reach the rank of "+rk.name+" (or above) in any mode.",
    test: ctx => ctx.rankIndex >= i
  }));

  // A topic is only "initiated" (which unlocks the next topic) if the player
  // genuinely engaged — answered at least this fraction of the round, not skipped
  // it all (T74). Single tunable constant; "at least half answered" by default.
  const INIT_ANSWER_FRAC = 0.5;
  function initReached(ctx){ return (ctx.answered || 0) >= Math.ceil((ctx.total || 0) * INIT_ANSWER_FRAC); }

  // per-mode: initiation, flawless, speed brackets, mastery
  MODES.forEach(m => {
    add({ id:"init:"+m.id, name:m.name+" Initiate", rarity:"uncommon", cat:"Initiation", modeId:m.id,
      desc:"Answer at least half a "+m.name+" round (don't skip it all).", test: ctx => initReached(ctx) });
    add({ id:"flawless:"+m.id, name:"Flawless "+m.name, rarity:"rare", cat:"Flawless", modeId:m.id,
      desc:"Finish "+m.name+" without skipping a question.", test: ctx => ctx.mistakes === 0 });
    SPEED.forEach((lv,i) => add({
      id:"speed:"+m.id+":"+i, name:lv.name+" "+m.name, rarity:lv.rarity, cat:"Speed", modeId:m.id,
      desc:"Average under "+lv.avg+"s per answer across a clean "+m.name+" round.",
      // zero skips required too, else skipping every question (which advances
      // fast) would farm Speed brackets without solving anything.
      test: ctx => ctx.mistakes === 0 && ctx.avg < lv.avg
    }));
    // Mastery — finish with no skips AND total time within the mode's gentle
    // target (masterSecs × questions). This is the gate that opens a Part-2 mode.
    add({ id:"mastery:"+m.id, name:"Mastery · "+m.name, rarity:"epic", cat:"Mastery", modeId:m.id,
      desc:"Finish "+m.name+" with no skips, averaging "+(m.masterSecs)+"s per answer or faster.",
      test: ctx => ctx.mistakes === 0 &&
                   typeof ctx.mode.masterSecs === "number" &&
                   ctx.totalTime <= ctx.mode.masterSecs * ctx.total });
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

  // topic-completion milestones — evaluated after a round's items are saved
  // (via evaluateTopics), against per-topic unlock/100% counts rather than ctx.
  // "unlock N topics" tiers scale toward the full roadmap; the two completion
  // tiers reuse the per-mode collectible set, so 100% genuinely demands the hard
  // items (Lightning + Mastery + Flawless + every Beat/Spark).
  [[3,"uncommon","Explorer"],[8,"rare","Pathfinder"],[16,"epic","Trailblazer"]].forEach(([n,r,nm]) =>
    add({ id:"topics:unlock"+n, name:nm, rarity:r, cat:"Milestone", modeId:null, need:{ unlock:n },
      desc:"Unlock "+n+" topics." }));
  add({ id:"topics:one100", name:"Topic Master", rarity:"epic", cat:"Milestone", modeId:null, need:{ complete:1 },
    desc:"Reach 100% on a topic — every collectible, mastery included." });
  add({ id:"topics:all100", name:"Topic Conqueror", rarity:"legendary", cat:"Milestone", modeId:null, need:{ completeAll:true },
    desc:"Reach 100% on every topic." });

  // collector (evaluated against how much you've collected; handled separately)
  // Collector ladder, 25 → 10,000 (T55). Existing ids collector:25/75/150 keep
  // their rarity (migration-safe); the 150 tier is renamed off "Completionist"
  // (it's no longer completion). New tiers (300+) are purely additive, all
  // legendary, with headroom above the current catalogue for future items.
  const comma = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  [
    [25,   "rare",      "Curator"],
    [75,   "epic",      "Hoarder"],
    [150,  "legendary", "Magpie"],
    [300,  "legendary", "Antiquarian"],
    [500,  "legendary", "Archivist"],
    [750,  "legendary", "Loremaster"],
    [1000, "legendary", "Vaultkeeper"],
    [1500, "legendary", "Reliquarian"],
    [2500, "legendary", "Hoard-Lord"],
    [5000, "legendary", "Treasure Dragon"],
    [7500, "legendary", "Grand Conservator"],
    [10000,"legendary", "Keeper of the Myriad"]
  ].forEach(([n,r,nm]) =>
    add({ id:"collector:"+n, name:nm, rarity:r, cat:"Collector", modeId:null, n:n,
      desc:"Collect "+comma(n)+" items." }));

  // hero + arena milestones (Phase 3) — evaluated against collected state +
  // the live hero-unlock count via evaluateMeta (see main.js wiring).
  [[10,"rare","Tier Climber"],[25,"epic","Tier Breaker"],[50,"epic","Tier Crusher"]].forEach(([n,r,nm]) =>
    add({ id:"meta:tier"+n, name:nm, rarity:r, cat:"Milestone", modeId:null, meta:{ tier:n },
      desc:"Defeat enemy tier "+n+" in the Arena." }));
  add({ id:"meta:tier100", name:"Realm Champion", rarity:"legendary", cat:"Milestone", modeId:null, meta:{ tier:100 },
    desc:"Defeat the final tier — The Void Sovereign." });
  add({ id:"meta:allheroes", name:"Legendary Roster", rarity:"legendary", cat:"Milestone", modeId:null, meta:{ allHeroes:true },
    desc:"Unlock all 12 heroes." });

  // wealth milestones (Goblin Gold, T26) — auto-evaluated against the Gold total.
  [[1e3,"uncommon","Coin Purse"],[1e4,"uncommon","Money Bags"],[1e5,"rare","Nest Egg"],
   [1e6,"rare","Gold Hoard"],[1e7,"epic","Tycoon"],[1e8,"epic","Magnate"],
   [1e9,"epic","Croesus"],[1e10,"legendary","Dragon Hoard"],[1e11,"legendary","Goblin Vault"],
   [1e12,"legendary","Midas Touch"],[1e15,"legendary","Cosmic Fortune"]].forEach(([g,r,nm]) =>
    add({ id:"gold:"+g, name:nm, rarity:r, cat:"Milestone", modeId:null, gold:g,
      desc:"Amass "+(g<1e6?(g/1e3)+"K":g<1e9?(g/1e6)+"M":g<1e12?(g/1e9)+"B":g<1e15?(g/1e12)+"T":(g/1e15)+"Qa")+" Goblin Gold." }));

  // momentum milestones (T31) — fired off the high-water momentum mark (`best`),
  // so dipping and re-climbing never re-awards or revokes them. 75 = the cap.
  [[3,"uncommon","Warming Up"],[7,"rare","In the Groove"],[14,"rare","Steady Rhythm"],
   [30,"epic","Daily Devotee"],[50,"epic","Rhythm Master"],[75,"legendary","Peak Momentum"]].forEach(([n,r,nm]) =>
    add({ id:"momentum:"+n, name:nm, rarity:r, cat:"Milestone", modeId:null, momentum:n,
      desc:"Reach a momentum of "+n+(n===75?" — the ceiling.":"."), }));

  function sortItems(arr){
    return arr.slice().sort((a,b) => (RORDER[a.rarity]-RORDER[b.rarity]) || a.name.localeCompare(b.name));
  }

  // Returns the catalogue items (excluding Collector) newly satisfied by ctx.
  function evaluate(ctx, has){
    const out = [];
    for(const it of CATALOG){
      if(it.cat === "Collector") continue;
      if(it.need) continue;                          // topic milestones: see evaluateTopics
      if(it.meta) continue;                          // hero/arena milestones: see evaluateMeta
      if(it.gold != null) continue;                  // wealth milestones: see evaluateGold
      if(it.momentum != null) continue;              // momentum milestones: see evaluateMomentum
      if(has(it.id)) continue;
      if(it.modeId && it.modeId !== ctx.mode.id) continue;
      let ok = false;
      try{ ok = it.test(ctx); }catch(e){ ok = false; }
      if(ok) out.push(it);
    }
    return sortItems(out);
  }
  // The per-question items (Beat / Spark) earned by solving one prompt,
  // for live in-game toasts. `t` is the solve time in seconds.
  function evaluateQuestion(modeId, prompt, t, has){
    const out = [];
    const solve = byIdMap["solve:"+modeId+":"+prompt];
    if(solve && !has(solve.id)) out.push(solve);
    const spark = byIdMap["spark:"+modeId+":"+prompt];
    if(spark && !has(spark.id) && t < SPARK) out.push(spark);
    return out;
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

  // Topic-completion milestones, given per-topic counts computed by main.js
  // *after* a round's items are saved: { unlocked, complete, total }.
  function evaluateTopics(counts, has){
    const out = [];
    for(const it of CATALOG){
      if(!it.need || has(it.id)) continue;
      const nd = it.need;
      let ok = true;
      if(nd.unlock != null   && counts.unlocked < nd.unlock) ok = false;
      if(nd.complete != null && counts.complete < nd.complete) ok = false;
      if(nd.completeAll      && !(counts.total > 0 && counts.complete >= counts.total)) ok = false;
      if(ok) out.push(it);
    }
    return sortItems(out);
  }

  // Hero/arena milestones (Phase 3). `heroesUnlocked`/`heroesTotal` come from
  // window.Heroes (main.js); tier milestones read the `tier:<n>` markers via `has`.
  function evaluateMeta(heroesUnlocked, heroesTotal, has){
    const out = [];
    for(const it of CATALOG){
      if(!it.meta || has(it.id)) continue;
      const m = it.meta;
      let ok = true;
      if(m.tier != null && !has("tier:" + m.tier)) ok = false;
      if(m.allHeroes && !(heroesTotal > 0 && heroesUnlocked >= heroesTotal)) ok = false;
      if(ok) out.push(it);
    }
    return sortItems(out);
  }

  // Wealth milestones, given the current Goblin Gold total (T26).
  function evaluateGold(total, has){
    const out = [];
    for(const it of CATALOG){ if(it.gold == null || has(it.id)) continue; if(total >= it.gold) out.push(it); }
    return sortItems(out);
  }

  // Momentum milestones, given the high-water momentum mark `best` (T31).
  function evaluateMomentum(best, has){
    const out = [];
    for(const it of CATALOG){ if(it.momentum == null || has(it.id)) continue; if(best >= it.momentum) out.push(it); }
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
  // ---- procedural 16-bit icons (T36) -------------------------------------
  // 12 parameterised archetype renderers → ~50 category presets, with per-item
  // variation (structural jitter + 6 generic levers) capped so identity cells are
  // never disturbed. Strict 3-colour contract: each render fills `g` (body) and
  // `a` (accent); paintGrid derives the outline. Entropy = mulberry32(hashStr(id)).
  const G = 16;
  const MIR = x => G - 1 - x;
  function grid0(){ const t = []; for(let y=0;y<G;y++) t[y] = new Array(G).fill(0); return t; }
  function inB(x,y){ return x>=0 && x<G && y>=0 && y<G; }
  function box(t,x0,y0,x1,y1,v){ v=(v===undefined)?1:v; for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) if(inB(x,y)) t[y][x]=v; }
  function hline(t,y,x0,x1,v){ box(t,x0,y,x1,y,v); }
  function vline(t,x,y0,y1,v){ box(t,x,y0,x,y1,v); }
  function dot(t,x,y,v){ if(inB(x,y)) t[y][x]=(v===undefined)?1:v; }
  function disc(t,cx,cy,r,v){ v=(v===undefined)?1:v; for(let y=-r;y<=r;y++) for(let x=-r;x<=r;x++) if(x*x+y*y<=r*r+r) dot(t,cx+x,cy+y,v); }
  function carve(g,x,y){ if(inB(x,y)) g[y][x]=0; }
  // mirror the left half (x<8) onto the right, for symmetric archetypes
  function mirror(g,a){ for(let y=0;y<G;y++) for(let x=0;x<8;x++){ g[y][MIR(x)]=g[y][x]; a[y][MIR(x)]=a[y][x]; } }

  // palette hue/lum nudge on a *cloned* palette (outline stays dark)
  function hexToRgb(h){ h=h.replace('#',''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
  function rgbToHex(r,g,b){ const c=v=>('0'+Math.max(0,Math.min(255,Math.round(v))).toString(16)).slice(-2); return '#'+c(r)+c(g)+c(b); }
  function rgbToHsl(r,g,b){ r/=255;g/=255;b/=255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b); let h,s,l=(mx+mn)/2;
    if(mx===mn){ h=s=0; } else { const d=mx-mn; s=l>0.5?d/(2-mx-mn):d/(mx+mn);
      h = mx===r ? (g-b)/d+(g<b?6:0) : mx===g ? (b-r)/d+2 : (r-g)/d+4; h/=6; } return [h*360,s,l]; }
  function hslToRgb(h,s,l){ h=((h%360)+360)%360/360; let r,g,b;
    if(s===0){ r=g=b=l; } else { const h2=(p,q,t)=>{ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; };
      const q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q; r=h2(p,q,h+1/3); g=h2(p,q,h); b=h2(p,q,h-1/3); } return [r*255,g*255,b*255]; }
  function nudge(hex,dh,dl){ const [r,g,b]=hexToRgb(hex); let [h,s,l]=rgbToHsl(r,g,b); l=Math.max(0.04,Math.min(0.96,l+dl)); const [R,G2,B]=hslToRgb(h+dh,s,l); return rgbToHex(R,G2,B); }
  function shiftPalette(pal,d){ if(!d||(!d.hue&&!d.lum)) return pal; return { body:nudge(pal.body,d.hue,d.lum), accent:nudge(pal.accent,d.hue,d.lum), outline:pal.outline }; }

  // ---- 12 archetype renderers: fn(g, a, P, rnd, lock) --------------------
  // `lock(x,y)` marks an identity cell (never touched by jitter). Each draws the
  // left half + invariant core, then symmetric archetypes call mirror().
  const cl = (v,lo,hi) => v<lo?lo:(v>hi?hi:v);
  const ARCH = {
    // mirrored blob; distinct silhouettes via body size + appendages.
    critter(g,a,P,rnd,lock){
      const cy=8, W=P.bodyW, H=P.bodyH;
      for(let y=cy-H;y<=cy+H;y++){ const dy=(y-cy)/(H+0.6); let w=Math.round(W*Math.sqrt(Math.max(0,1-dy*dy))); if(P.dome && y>=cy) w=W; if(w>0) box(g,8-w,y,7,y); }
      if(P.horns){ box(g,8-W+1,cy-H-2,8-W+2,cy-H-1); box(g,6,cy-H-2,7,cy-H-1); }
      if(P.feet){ box(g,8-W,cy+H+1,8-W+1,cy+H+2); if(P.feet>=4) box(g,5,cy+H+1,6,cy+H+2); }
      if(P.tail){ box(g,8-W-2,cy,8-W-1,cy+2); if(P.tail>=2) box(g,8-W-3,cy-1,8-W-2,cy); }
      if(P.wings){ box(g,8-W-4,cy-2,8-W-1,cy+1); if(P.wings>=2) box(g,8-W-5,cy-3,8-W-4,cy+2); }
      for(let y=cy-2;y<=cy+3;y++) lock(7,y);
      mirror(g,a);
      dot(g,6,cy-1,0); dot(g,9,cy-1,0); lock(6,cy-1); lock(9,cy-1);   // eyes
      box(a,6,cy+2,9,cy+3);                                           // belly
    },
    // mirrored bottle: body + shoulder + neck + cork (cork = identity).
    bottle(g,a,P,rnd,lock){
      const by=15-P.bodyH, bw=P.bodyW;
      box(g,8-bw,by,7,15); box(g,6,by-2,7,by-1); box(g,6,by-4,7,by-3); box(g,6,by-5,7,by-5);
      for(let y=by-5;y<=15;y++) lock(7,y);
      mirror(g,a);
      const liq=Math.round((15-by)*P.liquid); box(a,8-bw,15-liq,7,15); mirror(g,a);
      if(P.label){ hline(g,11,8-bw,7); hline(a,11,8-bw,7); mirror(g,a); }
    },
    // big parchment rect; rolls/spine/glyph lines/seal distinguish the presets.
    sheet(g,a,P,rnd,lock){
      const x0=8-P.w, x1=12, y0=2+(P.topRoll?1:0), y1=13-(P.botRoll?1:0);
      box(g,x0,y0,x1,y1);
      if(P.topRoll){ box(g,x0-1,1,x1+1,2); box(a,x0-1,1,x1+1,1); }
      if(P.botRoll){ box(g,x0-1,13,x1+1,14); box(a,x0-1,14,x1+1,14); }
      for(let y=y0;y<=y1;y++) lock(8,y); lock(x0,y0+1); lock(x1,y1-1);
      for(let i=0;i<P.glyphLines;i++){ const gy=y0+2+i*2; if(gy<y1-1) hline(a,gy,x0+1,x1-1); }
      if(P.spine){ box(g,7,y0,8,y1); box(a,7,y0,8,y1); }
      if(P.seal){ box(a,x1-2,y1-2,x1-1,y1-1); }
    },
    // bold blade + crossguard + grip + pommel; len/width/shape per item.
    blade(g,a,P,rnd,lock){
      const tipY=cl(12-P.bladeLen,1,10), bw=P.bladeWidth;
      for(let y=12;y>=tipY;y--){ const t=(12-y)/(12-tipY+0.01); let w=Math.max(1,Math.round(bw*(1-t*0.45))); let cx0=8-w; if(P.shape===2) cx0+=((12-y)%2?1:-1); box(g,cx0,y,7,y); if(P.edge) a[y][cx0]=1; }
      box(g,8-bw-1,13,7,13); lock(7,12); lock(7,13);                        // ricasso core
      if(P.guard){ box(g,8-P.guardW,14,7,14); box(a,8-P.guardW,14,7,14); lock(7,14); }
      box(g,7,15,7,15); if(P.pommel){ box(g,6,15,7,15); box(a,6,15,7,15); }  // grip/pommel
      mirror(g,a);
      if(P.shape===3) for(let y=tipY;y<=11;y++) carve(g,MIR(8-bw),y);         // sickle back-thin
    },
    // shaft + a distinct head (hammer/mace/axe/orb) or key bits.
    tool(g,a,P,rnd,lock){
      box(g,7,16-P.shaftLen,8,15); for(let y=11;y<=15;y++) lock(7,y);
      if(P.head===1){ box(g,4,2,8,5); box(a,4,3,8,4); lock(7,3); }
      else if(P.head===2){ disc(g,7,4,3,1); disc(a,7,4,1,1); lock(7,4); }
      else if(P.head===3){ box(g,2,2,7,7); for(let y=2;y<=7;y++) for(let x=2;x<2+(6-(y<5?y:9-y));x++) carve(g,x,y); box(a,6,3,7,6); lock(7,4); }
      else if(P.head===4){ disc(g,7,4,2,1); box(a,6,3,8,5); lock(7,4); }
      if(P.teeth){ box(g,7,5,8,12); for(let i=0;i<P.teeth;i++){ box(g,9,10+i,10,10+i); } disc(g,7,4,2,1); disc(g,7,4,1,0); lock(7,11); }
      mirror(g,a);
      if(P.teeth) for(let i=0;i<P.teeth;i++) box(g,9,10+i,10,10+i);            // keep key bits asymmetric
    },
    // mirrored faceted gem; facet width/height + twist per item.
    gem(g,a,P,rnd,lock){
      const ty=cl(8-P.facetH,1,7), by=cl(8+P.facetH,9,15), fw=P.facetW;
      for(let y=ty;y<=8;y++){ const rw=Math.max(1,Math.round(fw*(y-ty+1)/(8-ty+1))); box(g,8-rw,y,8,y); }
      for(let y=9;y<=by;y++){ const rw=Math.max(1,Math.round(fw*(by-y+1)/(by-8))); box(g,8-rw,y,8,y); }
      for(let y=ty+1;y<=by-1;y++) lock(8,y);
      for(let y=ty;y<=by;y++) for(let x=8-fw;x<=8;x++) if(g[y][x] && (x+y+P.facetTwist)%2===0) a[y][x]=1;
      mirror(g,a);
    },
    // band with a hollow centre; crown points / amulet pendant / signet face.
    ring(g,a,P,rnd,lock){
      const r=P.outerR, ir=Math.max(2,r-2), cy=9;
      disc(g,8,cy,r,1); disc(g,8,cy,ir,0); for(let x=8-r;x<=8-ir-1;x++) lock(x,cy); lock(8,cy-r);
      if(P.bandStyle===1){ for(let p=0;p<=P.points;p++){ const px=3+p*2; box(g,px,3,px,5,1); } box(g,3,5,8,7,1); box(a,3,5,8,6,1); lock(8,4); }
      else if(P.stone){ box(g,7,cy-r-1,8,cy-r,1); box(a,7,cy-r-1,8,cy-r,1); lock(7,cy-r-1); }
      mirror(g,a);
      if(P.bandStyle===2){ for(let y=cy+1;y<=cy+r;y++) carve(g,8,y); }            // torc opening
    },
    // heater / round / kite outline + boss + division.
    shield(g,a,P,rnd,lock){
      const w=P.w;
      if(P.outline===2){ disc(g,8,8,w,1); }
      else if(P.outline===3){ for(let y=2;y<=15;y++){ const rw=y<7?Math.max(1,Math.round(w*(y-1)/6)):Math.max(1,Math.round(w*(15-y)/8)); box(g,8-rw,y,8,y); } }
      else { box(g,8-w,2,8,9); for(let y=10;y<=14;y++){ const rw=Math.max(1,Math.round(w*(14-y)/4)); box(g,8-rw,y,8,y); } }
      for(let y=4;y<=10;y++) lock(8,y);
      if(P.boss===1){ box(a,6,7,8,9,1); } else if(P.boss===2){ disc(a,8,8,2,1); }
      if(P.divide===1){ hline(a,8,8-w,8,1); } else if(P.divide===2){ vline(a,8,3,13,1); }
      mirror(g,a);
    },
    // hat / cap / boot / glove by kind.
    garment(g,a,P,rnd,lock){
      if(P.kind===1){ for(let y=2;y<=9;y++){ const rw=Math.max(1,Math.round((y-1)*0.85)); box(g,8-rw,y,7,y); } box(g,2,10,7,11); box(a,2,10,7,11); box(a,5,5,6,6); for(let y=3;y<=9;y++) lock(7,y); }
      else if(P.kind===2){ box(g,3,5,8,8); box(g,2,8,8,9); box(a,2,8,8,8); for(let y=5;y<=8;y++) lock(7,y); }
      else if(P.kind===3){ box(g,5,2,8,11); box(g,5,12,12,14); box(a,5,12,12,13); for(let y=4;y<=11;y++) lock(7,y); lock(11,13); }
      else { box(g,4,3,8,6); box(g,4,7,8,14); box(a,4,12,8,14); for(let y=4;y<=12;y++) lock(7,y); }
      mirror(g,a);
    },
    // central stave (locked) + jittered strokes; optional plate behind.
    sigil(g,a,P,rnd,lock){
      if(P.plate===1){ box(g,2,2,13,13); box(a,3,3,12,12); } else if(P.plate===2){ disc(g,8,8,7,1); disc(a,8,8,6,1); }
      const S=P.strokeSet;
      box(a,7,3,8,12,1); for(let y=3;y<=12;y++){ lock(7,y); }                  // central stave
      if(S&2) box(a,4,5,11,5,1); if(S&4) box(a,4,11,11,11,1);
      if(S&8) for(let i=0;i<6;i++) dot(a,4+i,3+i,1); if(S&16) for(let i=0;i<6;i++) dot(a,4+i,12-i,1);
      if(S&32) box(a,5,8,11,8,1); if(S&64){ box(a,5,6,10,9,1); box(a,7,7,8,8,0); }
      for(let y=0;y<G;y++) for(let x=0;x<G;x++) if(a[y][x] && !g[y][x]) g[y][x]=1;
      mirror(g,a);
    },
    // mirrored disc + highlight; globe = cross banding, coin = flat rim.
    orb(g,a,P,rnd,lock){
      const r=P.r; disc(g,8,8,r,1);
      if(P.coin){ for(let y=8-1;y<=8+1;y++){} box(g,8-r,7,8,9); for(let x=8-r;x<=8;x++){ carve(g,x,8-r); carve(g,x,8+r); } }
      for(let y=8-2;y<=8+2;y++) lock(8,y);
      box(a,8-Math.floor(r/2)-1,8-Math.floor(r/2)-1,8-Math.floor(r/2),8-Math.floor(r/2),1);   // highlight
      if(P.ring===1){ box(a,8-r,8,8,8,1); for(let y=8-r;y<=8+r;y++) a[y]&&(a[y][8]=1); }       // globe cross
      else if(P.ring===2){ for(let x=8-r;x<=8;x++) dot(a,x,8-r,1); }
      mirror(g,a);
    },
    // organic cap+stem, or a container box+lid+clasp.
    provision(g,a,P,rnd,lock){
      if(P.form===1){ const ch=4;
        for(let y=2;y<=2+ch;y++){ const rw=Math.round(P.capW*Math.sin((y-1)/(ch+1)*Math.PI*0.92)); if(rw>0) box(g,8-rw,y,7,y); }
        box(g,5,3+ch,7,12); box(a,5,3+ch,7,12); for(let y=3;y<=12;y++) lock(7,y);
        for(let i=0;i<P.spots;i++){ const sx=5+(i%3), sy=3+(i%2); if(g[sy]&&g[sy][sx]) a[sy][sx]=1; }
        mirror(g,a);
      } else {
        box(g,2,6,8,14); box(g,1,5,8,6); for(let y=6;y<=14;y++) lock(8,y);
        box(a,1,5,8,6); if(P.clasp){ box(g,7,8,8,11,1); box(a,7,9,8,10,1); lock(8,10); }
        for(let i=0;i<P.bands;i++){ vline(a,3+i*2,7,13,1); }
        mirror(g,a);
      }
    }
  };

  // ---- ~50 category presets over the 12 archetypes -----------------------
  // family = archetype index (0..11) for the naming coupling (T35); each preset
  // sets distinguishing fixed params; resolvePreset jitters the ranged ones.
  const FAMILY = ["critter","bottle","sheet","blade","tool","gem","ring","shield","garment","sigil","orb","provision"];
  const FAM_IDX = {}; FAMILY.forEach((f,i)=>FAM_IDX[f]=i);
  const CATEGORIES = [
    { id:"familiar", arch:"critter", p:{bodyW:5,bodyH:5,feet:2,tail:1} },
    { id:"imp",      arch:"critter", p:{bodyW:5,bodyH:5,horns:1,tail:2,feet:2} },
    { id:"slime",    arch:"critter", p:{bodyW:7,bodyH:4,dome:1} },
    { id:"batling",  arch:"critter", p:{bodyW:4,bodyH:4,wings:2} },
    { id:"dragonet", arch:"critter", p:{bodyW:5,bodyH:6,horns:1,wings:1,feet:4,tail:1} },
    { id:"potion",   arch:"bottle",  p:{bodyW:5,bodyH:8,liquid:0.6,label:1} },
    { id:"elixir",   arch:"bottle",  p:{bodyW:6,bodyH:9,liquid:0.85,label:0} },
    { id:"tonic",    arch:"bottle",  p:{bodyW:3,bodyH:7,liquid:0.5,label:1} },
    { id:"vial",     arch:"bottle",  p:{bodyW:3,bodyH:5,liquid:0.7,label:0} },
    { id:"scroll",   arch:"sheet",   p:{w:5,topRoll:1,botRoll:1,glyphLines:3} },
    { id:"tome",     arch:"sheet",   p:{w:5,spine:1,glyphLines:2} },
    { id:"map",      arch:"sheet",   p:{w:6,topRoll:1,seal:1,glyphLines:2} },
    { id:"letter",   arch:"sheet",   p:{w:4,seal:1,glyphLines:2} },
    { id:"dagger",   arch:"blade",   p:{bladeLen:5,bladeWidth:3,guard:1,guardW:3,pommel:1,edge:1} },
    { id:"sword",    arch:"blade",   p:{bladeLen:9,bladeWidth:3,guard:1,guardW:4,pommel:1,edge:1} },
    { id:"kris",     arch:"blade",   p:{bladeLen:8,bladeWidth:3,shape:2,guard:1,guardW:3,edge:1} },
    { id:"sickle",   arch:"blade",   p:{bladeLen:7,bladeWidth:4,shape:3,pommel:1,edge:1} },
    { id:"cleaver",  arch:"blade",   p:{bladeLen:6,bladeWidth:5} },
    { id:"rapier",   arch:"blade",   p:{bladeLen:10,bladeWidth:2,guard:1,guardW:4,pommel:1,edge:1} },
    { id:"hammer",   arch:"tool",    p:{shaftLen:11,head:1} },
    { id:"mace",     arch:"tool",    p:{shaftLen:11,head:2} },
    { id:"axe",      arch:"tool",    p:{shaftLen:11,head:3} },
    { id:"staff",    arch:"tool",    p:{shaftLen:13,head:4} },
    { id:"wand",     arch:"tool",    p:{shaftLen:9,head:4} },
    { id:"key",      arch:"tool",    p:{shaftLen:10,head:0,teeth:3} },
    { id:"gem",      arch:"gem",     p:{facetW:4,facetH:4} },
    { id:"shard",    arch:"gem",     p:{facetW:2,facetH:6} },
    { id:"jewel",    arch:"gem",     p:{facetW:5,facetH:3} },
    { id:"geode",    arch:"gem",     p:{facetW:6,facetH:5} },
    { id:"ring",     arch:"ring",    p:{bandStyle:0,outerR:5,stone:1} },
    { id:"signet",   arch:"ring",    p:{bandStyle:0,outerR:5,stone:0} },
    { id:"amulet",   arch:"ring",    p:{bandStyle:2,outerR:5,stone:1} },
    { id:"crown",    arch:"ring",    p:{bandStyle:1,outerR:5,points:4} },
    { id:"shield",   arch:"shield",  p:{outline:1,w:6,boss:2} },
    { id:"buckler",  arch:"shield",  p:{outline:2,w:5,boss:1} },
    { id:"kiteshield",arch:"shield", p:{outline:3,w:6,divide:2} },
    { id:"helm",     arch:"shield",  p:{outline:2,w:6,divide:1} },
    { id:"wizardhat",arch:"garment", p:{kind:1} },
    { id:"cap",      arch:"garment", p:{kind:2} },
    { id:"boots",    arch:"garment", p:{kind:3} },
    { id:"gloves",   arch:"garment", p:{kind:4} },
    { id:"rune",     arch:"sigil",   p:{plate:1} },
    { id:"glyph",    arch:"sigil",   p:{plate:0} },
    { id:"talisman", arch:"sigil",   p:{plate:2} },
    { id:"orb",      arch:"orb",     p:{r:6,ring:0,coin:0} },
    { id:"globe",    arch:"orb",     p:{r:6,ring:1,coin:0} },
    { id:"coin",     arch:"orb",     p:{r:5,ring:0,coin:1} },
    { id:"mushroom", arch:"provision",p:{form:1,capW:5,spots:2} },
    { id:"bread",    arch:"provision",p:{form:1,capW:6,spots:0} },
    { id:"chest",    arch:"provision",p:{form:2,clasp:1,bands:2} }
  ];
  const CAT_BY_ID = {}; CATEGORIES.forEach(c => { c.family = FAM_IDX[c.arch]; CAT_BY_ID[c.id] = c; });
  function categoryOf(id){ return CATEGORIES[hashStr(id + "~cat") % CATEGORIES.length].id; }
  function familyOf(id){ return CAT_BY_ID[categoryOf(id)].family; }

  // per-archetype base params; presets override the distinguishing ones.
  const BASE = {
    critter:  { bodyW:5, bodyH:5, dome:0, horns:0, feet:0, tail:0, wings:0 },
    bottle:   { bodyW:5, bodyH:8, liquid:0.6, label:0 },
    sheet:    { w:5, topRoll:0, botRoll:0, glyphLines:3, spine:0, seal:0 },
    blade:    { bladeLen:6, bladeWidth:3, shape:0, guard:0, guardW:3, pommel:0, edge:0 },
    tool:     { shaftLen:11, head:1, teeth:0 },
    gem:      { facetW:4, facetH:4, facetTwist:0 },
    ring:     { bandStyle:0, outerR:5, stone:0, points:4 },
    shield:   { outline:1, w:6, boss:0, divide:0 },
    garment:  { kind:1 },
    sigil:    { plate:1, strokeSet:19 },
    orb:      { r:6, ring:0, coin:0 },
    provision:{ form:1, capW:5, spots:2, clasp:0, bands:2 }
  };
  // resolve a preset's params for one item: identity params + per-item structural
  // jitter on the *soft* ranges (never enough to reach a sibling category, and the
  // locked core stays filled regardless).
  function resolvePreset(cat, rnd){
    const P = Object.assign({}, BASE[cat.arch], cat.p);
    const j = (v,d) => v + (Math.floor(rnd()*(2*d+1)) - d);
    switch(cat.arch){
      case "critter":   P.bodyW=cl(j(P.bodyW,1),3,7); P.bodyH=cl(j(P.bodyH,1),3,6); break;
      case "bottle":    P.bodyW=cl(j(P.bodyW,1),3,6); P.bodyH=cl(j(P.bodyH,1),5,9); P.liquid=0.35+rnd()*0.5; break;
      case "sheet":     P.glyphLines=cl(j(P.glyphLines,1),1,5); P.w=cl(j(P.w,1),4,6); break;
      case "blade":     P.bladeLen=cl(j(P.bladeLen,1),4,11); P.bladeWidth=cl(j(P.bladeWidth,1),1,5); break;
      case "tool":      P.shaftLen=cl(j(P.shaftLen,1),8,13); break;
      case "gem":       P.facetW=cl(j(P.facetW,1),2,6); P.facetH=cl(j(P.facetH,1),2,6); P.facetTwist=Math.floor(rnd()*2); break;
      case "ring":      P.outerR=cl(j(P.outerR,0),4,6); break;
      case "shield":    P.w=cl(j(P.w,0),5,7); break;
      case "sigil":     P.strokeSet=Math.floor(rnd()*128); break;   // strokes vary; the stave is always drawn
      case "orb":       P.r=cl(j(P.r,0),5,6); break;
      case "provision": P.capW=cl(j(P.capW,1),4,6); P.spots=Math.floor(rnd()*4); break;
    }
    return P;
  }

  // Variation levers. Palette hue/lum (applied at paint) + interior texture: on
  // INTERIOR body cells (never the silhouette edge or the locked identity cells)
  // assign a highlight (accent) or a carve (interior outline), seeded per item.
  // Silhouette + locked cells are untouched, so the category stays recognizable
  // while each item gets the chunky, varied look (the owner-requested "varied a lot").
  function applyLevers(g, a, locked, P, rPick, rTex){
    let filled = 0; const body = [];
    const isInner = (x,y) => x>0 && x<G-1 && y>0 && y<G-1 && g[y-1][x] && g[y+1][x] && g[y][x-1] && g[y][x+1];
    for(let y=0;y<G;y++) for(let x=0;x<G;x++) if(g[y][x]){ filled++; if(!locked[y][x]) body.push([x,y]); }
    for(let i=body.length-1;i>0;i--){ const k=Math.floor(rTex()*(i+1)); const t=body[i]; body[i]=body[k]; body[k]=t; }
    const budget = Math.min(body.length, Math.max(5, Math.round(filled * 0.45)));
    for(let i=0;i<budget;i++){ const x=body[i][0], y=body[i][1];
      // highlight any body cell; carve only fully-interior cells (silhouette intact)
      if(rTex() < 0.7 || !isInner(x,y)) a[y][x] = 1; else g[y][x] = 0;
    }
    // one symmetry-breaking accent off-centre
    for(let k=0;k<6;k++){ const x=2+Math.floor(rPick()*5), y=2+Math.floor(rPick()*12); if(inB(x,y) && g[y][x] && !locked[y][x]){ a[y][x] = 1; break; } }
  }

  function paintGrid(cx, g, a, pal, scale, off){
    const fl = (x,y) => inB(x,y) && g[y][x];
    cx.fillStyle = pal.outline;
    for(let y=0;y<G;y++) for(let x=0;x<G;x++)
      if(!g[y][x] && (fl(x-1,y)||fl(x+1,y)||fl(x,y-1)||fl(x,y+1))) cx.fillRect(off+x*scale, off+y*scale, scale, scale);
    for(let y=0;y<G;y++) for(let x=0;x<G;x++)
      if(g[y][x]){ cx.fillStyle = a[y][x] ? pal.accent : pal.body; cx.fillRect(off+x*scale, off+y*scale, scale, scale); }
  }

  // Restored hero portrait (T51): the original mirrored creature-blob — a
  // symmetric, seed-varied "weird face", generalised from the old G=12 drawer to
  // the current grid. The left half is filled with a centre-weighted probability
  // and mirrored to the right; ~30% of filled cells take the accent colour. Seeded
  // per hero id, so each of the 12 heroes is a visibly distinct creature.
  function heroSprite(g, a, rnd){
    const half = Math.floor(G/2), mid = (G-1)/2;
    for(let y=1;y<G-1;y++) for(let x=1;x<=half-1;x++){
      const on = rnd() < (0.62 - Math.abs(y-mid)/G*0.4) ? 1 : 0;
      g[y][x] = on; g[y][G-1-x] = on;
      if(on && rnd() < 0.3){ a[y][x] = 1; a[y][G-1-x] = 1; }
    }
  }

  // Build the body/accent/locked grids + palette shift for one id (pure; shared
  // by drawIcon and the icon-variation test).
  function buildIcon(id, catId){
    const seed = hashStr(id);
    const rPick = mulberry32(seed), rTex = mulberry32((seed ^ 0x9e3779b9) >>> 0);
    // Hero portraits route to the restored creature-blob, NOT an item category —
    // item icons (which never carry a "hero:" id) are untouched.
    if(typeof id === "string" && id.indexOf("hero:") === 0){
      const g = grid0(), a = grid0(), locked = grid0();
      heroSprite(g, a, rPick);
      const shift = { hue: (rTex()*2-1)*20, lum: (rTex()*2-1)*0.08 };
      return { g, a, locked, shift, cat: null };
    }
    const cat = CAT_BY_ID[catId] || CAT_BY_ID[categoryOf(id)];
    const g = grid0(), a = grid0(), locked = grid0();
    const lock = (x,y) => { if(inB(x,y)) locked[y][x] = 1; };
    const P = resolvePreset(cat, rPick);
    ARCH[cat.arch](g, a, P, rPick, lock);
    applyLevers(g, a, locked, P, rPick, rTex);
    const shift = { hue: (rTex()*2-1)*20, lum: (rTex()*2-1)*0.08 };
    return { g, a, locked, shift, cat };
  }
  // Role grid (0 empty/1 outline/2 body/3 accent) — shape only, palette-independent.
  function iconRoleGrid(id, catId){
    const { g, a } = buildIcon(id, catId);
    const fl = (x,y) => inB(x,y) && g[y][x];
    const r = grid0();
    for(let y=0;y<G;y++) for(let x=0;x<G;x++){
      if(g[y][x]) r[y][x] = a[y][x] ? 3 : 2;
      else if(fl(x-1,y)||fl(x+1,y)||fl(x,y-1)||fl(x,y+1)) r[y][x] = 1;
    }
    return r;
  }
  // Colour grid (hex per cell, with the per-item palette shift applied).
  function iconColorGrid(id, basePal, catId){
    const { g, a, shift } = buildIcon(id, catId);
    const pal = shiftPalette(basePal || RARITY.common, shift);
    const fl = (x,y) => inB(x,y) && g[y][x];
    const r = grid0();
    for(let y=0;y<G;y++) for(let x=0;x<G;x++){
      if(g[y][x]) r[y][x] = a[y][x] ? pal.accent : pal.body;
      else if(fl(x-1,y)||fl(x+1,y)||fl(x,y-1)||fl(x,y+1)) r[y][x] = pal.outline;
      else r[y][x] = 0;
    }
    return r;
  }
  function lockedCells(catId){
    const cat = CAT_BY_ID[catId]; if(!cat) return [];
    const g = grid0(), a = grid0(), locked = grid0();
    const lock = (x,y) => { if(inB(x,y)) locked[y][x] = 1; };
    ARCH[cat.arch](g, a, resolvePreset(cat, mulberry32(12345)), mulberry32(12345), lock);
    const out = []; for(let y=0;y<G;y++) for(let x=0;x<G;x++) if(locked[y][x]) out.push([x,y]);
    return out;
  }

  // Draws the icon for `id` using palette `pal`; `catId` forces a category
  // (heroes pass "familiar" for a critter portrait).
  function drawIcon(canvas, id, pal, catId){
    const cx = canvas.getContext("2d");
    const scale = Math.max(1, Math.floor(canvas.width / G));
    cx.clearRect(0,0,canvas.width,canvas.height);
    const off = Math.floor((canvas.width - scale*G) / 2);
    const { g, a, shift } = buildIcon(id, catId);
    paintGrid(cx, g, a, shiftPalette(pal, shift), scale, off);
  }

  // Every catalogue item belonging to one mode (init / flawless / speed /
  // mastery / per-question Beat & Spark) — the basis for that mode's
  // collectible-completion count on the picker and inventory.
  function modeItems(modeId){ return CATALOG.filter(it => it.modeId === modeId); }

  // ---- item layer (T20): every item gains a flavour name + boost ----------
  // The 12 heroes (ids in roster order) — full stats/types/unlocks live in
  // heroes.js (T21); here we only need ids + names for boosts and their labels.
  const HERO_IDS = ["bram","greta","tovar","mo","wisp","mira","nim","zeph","pip","vex","sela","roon"];
  const HERO_NAMES = { bram:"Brannon", greta:"Valeska", tovar:"Ser Aldric", mo:"Magnar",
    wisp:"Wisp", mira:"Maerwen", nim:"Emrys", zeph:"Aerin",
    pip:"Pocket", vex:"Vesh", sela:"Selwen", roon:"Rendel" };
  const STAT_KEYS = ["power","guard","speed","focus"];
  const STAT_NAMES = { power:"Power", guard:"Guard", speed:"Speed", focus:"Focus" };
  const BOOST_AMOUNT = { common:1, uncommon:2, rare:3, epic:5, legendary:8 };
  // ---- procedural item names: templates + word banks (T35) ----------------
  // Varied grammar (not the rigid "<Adj> <Noun>" mould) drawn deterministically
  // from the id, so names are stable per item and effectively never collide.
  const ADJECTIVES = [
    "Gleaming","Velvet","Plucky","Bumbling","Sproingy","Ghostly","Ancient","Gilded",
    "Frosted","Smouldering","Twinkling","Battered","Pristine","Whispering","Volatile","Cryptic",
    "Glowing","Humming","Cursed","Effervescent","Bashful","Cosy","Crackling","Drowsy",
    "Eerie","Fizzy","Gloopy","Grumpy","Jolly","Lopsided","Mossy","Nimble",
    "Perky","Quirky","Rickety","Scruffy","Sleepy","Snug","Soggy","Spiffy",
    "Squishy","Sturdy","Tangled","Tatty","Wobbly","Wonky","Zany","Zippy",
    "Brave","Bold","Daring","Dauntless","Fearless","Gallant","Heroic","Intrepid",
    "Mighty","Noble","Proud","Resolute","Stalwart","Steadfast","Valiant","Worthy",
    "Radiant","Shimmering","Sparkling","Lustrous","Glittery","Dazzling","Shining","Brilliant",
    "Polished","Glossy","Burnished","Iridescent","Opalescent","Prismatic","Glinting","Beaming",
    "Aged","Antique","Elder","Eternal","Forgotten","Hallowed","Legendary","Mythic",
    "Primordial","Storied","Timeless","Venerable","Weathered","Worn","Olden","Faded",
    "Hushed","Muffled","Murmuring","Quiet","Silent","Soft-spoken","Whisper-thin","Wispy",
    "Wandering","Drifting","Roaming","Rambling","Roving","Strolling","Meandering","Footloose",
    "Bewitched","Charmed","Enchanted","Hexed","Jinxed","Spellbound","Warded","Glamoured",
    "Arcane","Eldritch","Esoteric","Fabled","Mystic","Occult","Rune-marked","Sigil-bound",
    "Bubbly","Frothy","Bubbling","Foaming","Sizzling","Steaming","Simmering","Spluttering",
    "Crispy","Crunchy","Crumbly","Flaky","Doughy","Chewy","Squidgy","Spongy",
    "Sticky","Gummy","Slimy","Slippery","Greasy","Oily","Drippy","Dribbly",
    "Lumpy","Bumpy","Knobbly","Craggy","Jagged","Pointy","Prickly","Spiky",
    "Fuzzy","Fluffy","Furry","Feathery","Downy","Woolly","Velveteen","Plush",
    "Cuddly","Huggable","Snuggly","Comfy","Toasty","Warm","Homely","Heartfelt",
    "Cheeky","Cheery","Chirpy","Bouncy","Giddy","Gleeful","Merry","Mirthful",
    "Playful","Sprightly","Spry","Frisky","Lively","Peppy","Vivacious","Bright",
    "Glum","Gloomy","Mopey","Sulky","Sullen","Brooding","Pensive","Wistful",
    "Spooky","Creepy","Haunting","Shadowy","Murky","Misty","Foggy","Dim",
    "Phantom","Spectral","Wraithlike","Banshee","Boggart","Goblin-touched","Gremlin-chewed","Witchy",
    "Curious","Peculiar","Odd","Strange","Weird","Bizarre","Baffling","Puzzling",
    "Mysterious","Enigmatic","Inscrutable","Unfathomable","Unknowable","Riddling","Veiled","Hidden",
    "Tiny","Teeny","Wee","Pocket-sized","Diminutive","Miniature","Petite","Pint-sized",
    "Mini","Bitty","Titchy","Dinky","Snippy","Little","Slight","Compact",
    "Enormous","Gigantic","Colossal","Massive","Hulking","Towering","Mountainous","Vast",
    "Whopping","Humongous","Mammoth","Titanic","Jumbo","Bulky","Lumbering","Ponderous",
    "Swift","Speedy","Quick","Rapid","Brisk","Fleet","Hasty","Nippy",
    "Darting","Dashing","Whizzing","Zooming","Bolting","Scampering","Scurrying","Skittering",
    "Sluggish","Lazy","Languid","Dawdling","Loitering","Lingering","Plodding","Trundling",
    "Heavy","Weighty","Leaden","Solid","Dense","Hefty","Stout","Robust",
    "Feather-light","Airy","Floaty","Buoyant","Weightless","Gossamer","Cloudlike","Helium-filled",
    "Glacial","Frosty","Icy","Frozen","Wintry","Chilly","Snowy","Sleety",
    "Blazing","Fiery","Flaming","Searing","Scorching","Roaring","Ember-lit","Cinder-flecked",
    "Sunny","Golden","Amber","Honeyed","Buttery","Lemony","Marigold","Saffron",
    "Silvery","Pearly","Moonlit","Starlit","Twilight","Dawn-touched","Dusky","Nightfall",
    "Emerald","Jade","Verdant","Leafy","Ferny","Grassy","Clover-strewn","Pine-scented",
    "Ruby","Crimson","Scarlet","Rosy","Blushing","Coral","Cherry","Berry-stained",
    "Sapphire","Azure","Cobalt","Teal","Turquoise","Cerulean","Sky-blue","Ocean-deep",
    "Violet","Lavender","Lilac","Plum","Mauve","Amethyst","Orchid","Heather",
    "Inky","Ebony","Onyx","Coal-black","Sooty","Charcoal","Pitch-dark","Raven",
    "Snowy-white","Chalky","Milky","Ivory","Alabaster","Bone-pale","Cream","Frost-white",
    "Rusty","Rust-flecked","Corroded","Tarnished","Mouldy","Mildewed","Lichen-clad","Cobwebbed",
    "Dusty","Grimy","Smudged","Muddy","Sandy","Gritty","Dusted","Powdery",
    "Sparkly","Glittering","Bedazzled","Bejewelled","Begemmed","Spangled","Tinselled","Sequined",
    "Singing","Chiming","Tinkling","Jingling","Clanging","Gonging","Ringing","Trilling",
    "Buzzing","Droning","Thrumming","Vibrating","Quivering","Trembling","Shuddering","Juddering",
    "Floppy","Droopy","Saggy","Limp","Slack","Baggy","Loose","Dangling",
    "Taut","Tight","Snappy","Springy","Bouncy-back","Elastic","Stretchy","Rubbery",
    "Lucky","Fortunate","Charmed-up","Blessed","Favoured","Auspicious","Golden-touched","Wishbone",
    "Unlucky","Hapless","Ill-starred","Doomed-ish","Star-crossed","Snakebit","Calamitous","Hexy",
    "Helpful","Kindly","Gentle","Tender","Caring","Generous","Obliging","Thoughtful",
    "Sneaky","Crafty","Cunning","Wily","Sly","Devious","Scheming","Foxy",
    "Honest","Trusty","Reliable","Dependable","Faithful","Loyal","True","Stout-hearted",
    "Clumsy","Klutzy","Fumbling","Tripping","Stumbling","Butterfingered","Cack-handed","Awkward",
    "Graceful","Elegant","Dainty","Delicate","Refined","Poised","Lithe","Supple",
    "Pompous","Haughty","Snooty","Snobby","Lofty","Grandiose","Highfalutin","Self-important",
    "Humble","Modest","Meek","Unassuming","Shy","Timid","Reserved","Coy",
    "Loud","Boisterous","Rowdy","Raucous","Rambunctious","Clamorous","Thunderous","Booming",
    "Sproutling","Toadstool","Mushroom-capped","Acorn-sized","Pebble-smooth","Driftwood","Bark-bound","Twig-thin",
    "Glow-worm","Firefly","Moth-eaten","Beetle-backed","Snail-paced","Ladybird","Caterpillar","Tadpole",
    "Marmalade","Custard","Treacle","Toffee","Gingerbread","Liquorice","Marshmallow","Nougat",
    "Pickled","Bottled","Jarred","Tinned","Preserved","Candied","Crystallised","Sugared",
    "Knitted","Stitched","Patched","Darned","Embroidered","Woven","Crocheted","Quilted",
    "Bewildered","Befuddled","Flummoxed","Dazed","Dizzy","Woozy","Giddy-headed","Muddled",
    "Determined","Dogged","Tenacious","Persistent","Unshakeable","Unflinching","Indomitable","Plucked-up",
    "Suspicious","Shifty","Dodgy","Questionable","Untrustworthy","Fishy","Iffy","Sketchy",
    "Innocent","Wholesome","Pure","Spotless","Squeaky-clean","Blameless","Angelic","Cherubic",
    "Magnificent","Splendid","Glorious","Grand","Resplendent","Sublime","Majestic","Stately",
    "Ramshackle","Decrepit","Crumbling","Dilapidated","Tumbledown","Creaky","Worn-out","Threadbare",
    "Bewhiskered","Tufty","Bristly","Shaggy","Unkempt","Tousled","Bedraggled","Dishevelled",
    "Polite","Courteous","Genteel","Well-mannered","Chivalrous","Gracious","Civil","Decorous",
    "Boggle-eyed","Wide-eyed","Bug-eyed","Squinty","Bleary","Owlish","Beady-eyed","Goggling"
  ];
  // Noun pools indexed by the 12 archetype FAMILIES (T36 coupling):
  // 0 critter · 1 bottle · 2 sheet · 3 blade · 4 tool · 5 gem · 6 ring · 7 shield
  // · 8 garment · 9 sigil · 10 orb · 11 provision.
  const NOUNS = [
    [ // 0 critter
      "Familiar","Imp","Sprite","Critter","Pixie","Wisp","Gremlin","Bogle",
      "Pipsqueak","Hobgoblin","Brownie","Puck","Goblet-imp","Mite","Tiddler","Whelp",
      "Fledgling","Sproutling","Gobbler","Nibbler","Skitterling","Flit","Pocket-beast","Lap-dragon",
      "Mischief","Scamp","Tagalong","Companion","Shoulder-friend","Snufflekin","Bumblefly","Squeaker"
    ],
    [ // 1 bottle
      "Potion","Elixir","Tonic","Brew","Draught","Cordial","Philtre","Tincture",
      "Concoction","Bottle","Vial","Flask","Phial","Fizz","Bubbly-brew","Decoction",
      "Remedy","Restorative","Pick-me-up","Quaff","Syrup","Infusion","Essence","Distillate",
      "Mixture","Swig","Slurp","Glug","Gulp","Sip"
    ],
    [ // 2 sheet
      "Scroll","Tome","Codex","Rune-page","Manuscript","Parchment","Ledger","Grimoire",
      "Almanac","Folio","Treatise","Compendium","Diary","Journal","Note","Letter",
      "Map","Chart","Blueprint","Sketch","Doodle","Pamphlet","Leaflet","Bestiary",
      "Spellbook","Recipe","Riddle-page","Footnote","Marginalia","Bookmark"
    ],
    [ // 3 blade
      "Dagger","Dirk","Kris","Shortsword","Stiletto","Cutlass","Sabre","Rapier",
      "Letter-opener","Bodkin","Poniard","Skean","Penknife","Whittler","Carver","Slicer",
      "Cleaver","Hatchet","Sickle","Shiv","Pin","Needle","Quill-knife","Thorn-blade",
      "Pocketblade","Snickersnee","Bread-knife","Butter-knife","Toothpick","Splinter"
    ],
    [ // 4 tool
      "Hammer","Mace","Cudgel","Mallet","Maul","Warhammer","Club","Bludgeon",
      "Axe","Hatchet","Tomahawk","War-pick","Staff","Stave","Rod","Sceptre",
      "Wand","Twig-wand","Pointer","Baton","Key","Skeleton-key","Latchkey","Cog",
      "Gear","Spanner","Lever","Crank","Pickaxe","Trowel","Tongs","Whisk"
    ],
    [ // 5 gem
      "Gem","Shard","Jewel","Geode","Crystal","Stone","Pebble","Bead",
      "Cabochon","Facet","Sparkler","Glimmerstone","Heartstone","Dewdrop","Teardrop","Nugget",
      "Chip","Sliver","Prism","Druzy","Twinkle","Glint","Gleamstone","Lodestone",
      "Marble","Knucklebone-gem","Wishing-stone","Sky-shard","Frostbead","Cinderstone"
    ],
    [ // 6 ring
      "Ring","Band","Signet","Loop","Hoop","Circlet","Bangle","Torc",
      "Cuff","Coil","Knuckle-ring","Thumb-ring","Pinky-ring","Friendship-band","Seal-ring","Twist",
      "Gimmel","Promise-band","Halo-ring","Whorl","Ringlet","Bracelet-bit","Charm-band","Spinner",
      "Knot","Curlicue","Loopy-thing","Round-about"
    ],
    [ // 7 shield
      "Shield","Aegis","Buckler","Targe","Pavise","Rondache","Gardbrace","Bulwark",
      "Wardplate","Guard","Cover","Bastion","Defender","Boss","Roundel","Kite-shield",
      "Heater","Door-of-a-shield","Lid","Pot-lid","Dustbin-lid","Tray","Plank-board","Barricade",
      "Rampart","Screen","Fender","Shieldling"
    ],
    [ // 8 garment
      "Wizard-hat","Cap","Bonnet","Hood","Cowl","Cloak","Cape","Mantle",
      "Boot","Bootie","Slipper","Clog","Glove","Mitten","Gauntlet","Cuff-glove",
      "Belt","Sash","Girdle","Scarf","Shawl","Muffler","Sock","Stocking",
      "Tunic","Smock","Apron","Robe","Tabard","Nightcap","Earmuff","Kerchief"
    ],
    [ // 9 sigil
      "Rune","Sigil","Glyph","Mark","Ward","Symbol","Hex-mark","Stave",
      "Brand","Inscription","Cipher","Etching","Carving","Scribble","Squiggle","Token",
      "Charm-mark","Bind-rune","Seal","Emblem","Crest","Insignia","Tracery","Knotwork",
      "Talisman-mark","Doodle-rune","Spellmark","Wardstone"
    ],
    [ // 10 orb
      "Orb","Globe","Bauble","Sphere","Marble","Bubble","Crystal-ball","Snowglobe",
      "Eyeball-of-glass","Gazing-ball","Dewglobe","Pearl","Moonball","Glimmer-orb","Lantern-globe","Trinket-ball",
      "Spherelet","Roundel-orb","Wishing-orb","Fortune-ball","Plasma-bauble","Glow-globe","Bobble","Sphere-thing",
      "Whirligig","Gobstopper","Bowling-bauble","Planetoid"
    ],
    [ // 11 provision
      "Hearth-loaf","Cave Mushroom","Jerky","Pasty","Stew","Pie","Dumpling","Biscuit",
      "Crumpet","Scone","Bun","Roll","Tart","Pudding","Porridge","Broth",
      "Cheese","Sausage","Pickle","Jam","Honey-cake","Gingerbread","Toffee","Trail-mix",
      "Ration","Hardtack","Wafer","Oatcake","Flapjack","Marmalade","Soup","Snack",
      "Nibble","Morsel"
    ]
  ];
  const EPITHETS = [
    "Embers","Whispers","Echoes","Secrets","Riddles","Dreams","Shadows","Moonlight",
    "Starlight","Sunbeams","Frost","Cinders","Sparks","Storms","Thunder","Gales",
    "Tides","Mists","Fog","Dew","Rain","Snowdrifts","Hailstones","Drizzle",
    "the Fox","the Owl","the Hare","the Badger","the Stoat","the Mole","the Newt","the Toad",
    "the Raven","the Magpie","the Sparrow","the Wren","the Robin","the Hedgehog","the Otter","the Vole",
    "the North Wind","the Deep","the Hollow","the Marsh","the Glade","the Thicket","the Brook","the Fen",
    "the Hearth","the Attic","the Cellar","the Pantry","the Bramble","the Burrow","the Nook","the Cranny",
    "Tuesdays","Last Tuesday","Forgotten Things","Spare Buttons","Lost Socks","Odd Socks","Mild Peril","Minor Inconvenience",
    "Slight Confusion","Gentle Fizzing","Modest Sparkle","Faint Humming","Quiet Glowing","Idle Wandering","Polite Mischief","Mostly Good Intentions",
    "Wonder","Marvels","Curiosities","Oddments","Trinkets","Knick-Knacks","Bits and Bobs","Spare Parts",
    "the Lost Glade","the Sleepy Vale","the Quiet Cavern","the Crumbling Tower","the Twisting Path","the Mossy Bridge","the Old Well","the Hidden Door",
    "Glimmering","Twilight","First Snow","High Summer","the Harvest","Midwinter","the Equinox","the Long Night",
    "the Wise","the Bold","the Sly","the Kind","the Lost","the Found","the Brave","the Bashful",
    "Gentle Thunder","Soft Lightning","Cosy Doom","Tidy Chaos","Sensible Magic","Reasonable Mischief","Approximate Glory","Borrowed Time",
    "Crumbs","Leftovers","Second Helpings","the Spilled Tea","the Misplaced Hat","the Unpaid Library Fine","Three Wishes","One Wish, Used Poorly"
  ];
  const CREATURES = [
    "Goblin","Imp","Bat","Newt","Gremlin","Pixie","Sprite","Troll",
    "Ogre","Kobold","Bogle","Brownie","Puck","Hobgoblin","Wisp","Wraith",
    "Spectre","Phantom","Ghoul","Bogeyman","Banshee","Witch","Wizard","Sorcerer",
    "Toad","Frog","Salamander","Lizard","Gecko","Slug","Snail","Worm",
    "Beetle","Spider","Moth","Firefly","Glow-worm","Centipede","Earwig","Woodlouse",
    "Fox","Badger","Stoat","Weasel","Ferret","Mole","Vole","Shrew",
    "Hedgehog","Otter","Squirrel","Dormouse","Raven","Magpie","Crow","Owl",
    "Bittern","Heron","Dragonet","Wyrmling","Basilisk-pup","Mimic","Slime","Mushroom-folk"
  ];
  const PLACES = [
    "Marsh","Hollow","Vale","Cavern","Thicket","Glade","Fen","Bog",
    "Moor","Heath","Dell","Combe","Coppice","Spinney","Grove","Wood",
    "Forest","Wildwood","Brake","Bramblewood","Mire","Swamp","Quagmire","Slough",
    "Crag","Tor","Ridge","Bluff","Scarp","Gorge","Ravine","Chasm",
    "Grotto","Cave","Den","Burrow","Warren","Nook","Cranny","Alcove",
    "Brook","Beck","Rill","Tarn","Mere","Pool","Pond","Ford",
    "Tower","Keep","Crypt","Vault","Cellar","Attic","Belfry","Cloister",
    "Marketplace","Crossroads","Wayside","Toll-bridge","Lost Library","Forgotten Pantry"
  ];
  const COOKADJ = [
    "Cooked","Roasted","Toasted","Pickled","Stewed","Charred","Honey-glazed","Smoked",
    "Grilled","Baked","Fried","Braised","Candied","Caramelised","Buttered","Sugared",
    "Spiced","Salted","Peppered","Crispy-fried","Slow-cooked","Sun-dried","Battered","Marinated",
    "Poached","Crumb-coated"
  ];
  const FOOD_CREATURE_PARTS = [
    "Leg","Wing","Tail","Knuckle","Snout","Toe","Ear","Rib",
    "Drumstick","Haunch","Shank","Trotter","Flank","Belly","Cheek","Hock",
    "Nugget","Strip","Skewer","Morsel","Bite","Chunk","Nibble","Crackling",
    "Jerky-strip","Crisp","Roll","Bap"
  ];
  const FIXED = [
    "Cooked Goblin Leg","Slightly Haunted Mug","Last Tuesday's Stew","Definitely Not Cursed Ring",
    "Mostly Harmless Orb","Suspiciously Shiny Coin","Probably Magic Pebble","Faintly Glowing Sock",
    "Mildly Enchanted Spoon","Reasonably Brave Shield","Surprisingly Heavy Feather","Allegedly Lucky Acorn",
    "Almost Certainly a Frog","Once-Bitten Apple","Twice-Toasted Crumpet","Thrice-Folded Map",
    "The Slightly Wrong Key","An Argumentative Teapot","A Very Polite Goblin","The Sleepy Lantern",
    "Grandad's Lucky Button","Auntie Mabel's Marmalade","The Last Biscuit","Someone Else's Umbrella",
    "A Jar of Spare Thunder","Bottled Tuesday Afternoon","Three-Quarters of a Wish","A Mostly Empty Promise",
    "The Inconvenient Compass","A Map to Somewhere Boring","The Forgetful Amulet","A Sock of Unusual Courage",
    "The Overconfident Pebble","A Gently Smug Crystal","The Apologetic Dagger","A Shield of Modest Size",
    "The World's Okayest Wand","A Perfectly Average Rock","The Second-Best Crown","A Slightly Used Halo",
    "Knees-Up Knuckle Stew","Roasted Bat Wing","Pickled Newt Toe","Honey-glazed Imp Snout",
    "The Grumbling Cauldron","A Whisk of Mild Doom","The Indecisive Coin","A Wobbling Tower of Cheese",
    "The Slightly Damp Spellbook","A Surprisingly Patient Slime","The Bashful Gargoyle","A Pocketful of Fog",
    "The Snoring Gemstone","A Marble That Hums","The Ticklish Rune","A Ring That Forgets Things",
    "The Optimistic Mushroom","A Faintly Embarrassed Orb","The Punctual Pixie","A Slightly Lost Map",
    "The Cosy Cursed Mug","A Loaf of Questionable Age","The Unbothered Wraith","A Lantern Full of Yesterday",
    "The Reluctant Hero's Boot","A Spoon That Means Well","The Borrowed Crown of Greg","A Vial of Spare Giggles",
    "The Slightly Overcooked Sigil","A Pebble With Opinions","The Mildly Spooky Curtain","A Hat of Reasonable Wisdom",
    "The Self-Satisfied Scroll","A Charm Against Mondays","The Tactically Soggy Map","A Gem the Size of a Worry",
    "The Definitely-Final Biscuit","A Jar Labelled 'Misc'","The Suspicious Pasty","A Wand Held Together With Hope",
    "The Gently Disappointing Orb","A Sword for Cutting Cake","The Unremarkable Relic","A Crown of Slight Importance",
    "The Last Clean Spoon","A Map of the Sofa","The Faintly Magical Brick","A Tin of Assorted Sparks",
    "The Diplomatic Goblin","A Shield Mostly for Show","The Tired Old Lantern","A Rune That Means 'Maybe'",
    "The Confused Compass of Greg","A Slightly Better Pebble","The Heroic Spork","A Bag of Borrowed Luck",
    "The Mysterious Left Sock","A Scroll Nobody Reads","The Cheerful Boggart","A Gem That Glows on Wednesdays",
    "The Slightly Brave Teaspoon","A Bottle of Calm Weather","The Patient Gargoyle of Bath","A Crumb of Real Power",
    "The Loitering Lantern","A Mug That's Seen Things","The Reasonably Ancient Ring","A Toadstool of Some Repute",
    "The Helpful but Wrong Map","A Marble Full of Stars","The Indignant Kettle","A Sock Knitted by a Wizard",
    "The Overdramatic Orb","A Gem on Its Best Behaviour","The Wandering Doormat","A Wand With Good Intentions",
    "The Slightly Smug Shield","A Pie of Uncertain Filling","The Ceremonial Tea Towel","A Glove of Mild Heroism"
  ];
  // Weighted name templates — most names are short/punchy; fancy & quirky forms
  // are rarer. `fixed:true` → whole name pulled from FIXED.
  const TEMPLATES = [
    { w: 30, t: "{adj} {noun}" },
    { w: 14, t: "{noun} of {epithet}" },
    { w:  9, t: "The {adj} {noun}" },
    { w:  8, t: "{creature}'s {noun}" },
    { w:  7, t: "{adj} {noun} of {epithet}" },
    { w:  6, t: "{noun} of the {adj} {place}" },
    { w:  5, t: "{adj}, {adj2} {noun}" },
    { w:  4, t: "{adj} {noun} of the {place}" },
    { w:  4, t: "{noun} of the {creature}" },
    { w:  3, t: "{creature}'s {adj} {noun}" },
    { w:  3, t: "{adj} {creature} {noun}" },
    { w:  3, t: "FIXED", fixed: true },
    { w:  1, t: "{noun}, {epithet} of It" }
  ];
  // Food family gets its own set so "Cooked Goblin Leg" etc. are reachable.
  const FOOD_TEMPLATES = [
    { w: 22, t: "{cookadj} {creature} {foodpart}" },
    { w: 12, t: "{adj} {noun}" },
    { w:  8, t: "{cookadj} {noun}" },
    { w:  6, t: "{noun} of {epithet}" },
    { w:  6, t: "The {adj} {noun}" },
    { w:  5, t: "{creature}'s {foodpart}" },
    { w:  5, t: "FIXED", fixed: true },
    { w:  3, t: "{cookadj} {creature} {foodpart} of {epithet}" }
  ];
  function itemBoost(id, rarity){
    return { hero: HERO_IDS[hashStr(id) % 12], stat: STAT_KEYS[hashStr(id + "§") % 4],
             amount: BOOST_AMOUNT[rarity] || 1 };
  }
  // Each placeholder draws an independent salted hash of the id, so the whole
  // name is deterministic and stable per item.
  function pick(id, salt, pool){ return pool[hashStr(id + salt) % pool.length]; }
  function fillTemplate(id, tpl, theme){
    if(tpl.fixed) return pick(id, "~fixed", FIXED);
    return tpl.t
      .replace("{adj}",      pick(id, "~adj",   ADJECTIVES))
      .replace("{adj2}",     pick(id, "~adj2",  ADJECTIVES))
      .replace("{noun}",     pick(id, "~noun",  NOUNS[theme]))
      .replace("{epithet}",  pick(id, "~epi",   EPITHETS))
      .replace("{creature}", pick(id, "~crea",  CREATURES))
      .replace("{place}",    pick(id, "~plc",   PLACES))
      .replace("{cookadj}",  pick(id, "~cook",  COOKADJ))
      .replace("{foodpart}", pick(id, "~fpart", FOOD_CREATURE_PARTS));
  }
  function chooseTemplate(id, table){
    let total = 0; for(const t of table) total += t.w;
    let r = hashStr(id + "~tpl") % total;
    for(const t of table){ if((r -= t.w) < 0) return t; }
    return table[0];
  }
  // theme = the item's archetype family (0..11, T36); the noun pool + food-template
  // choice follow the icon. `salt` re-rolls the template + words for de-dup while
  // keeping the family theme (so a re-roll stays themed; provision stays food).
  function flavourFor(id, salt){
    const theme = familyOf(id);
    const table = (theme === FAM_IDX.provision) ? FOOD_TEMPLATES : TEMPLATES;
    return fillTemplate(id + salt, chooseTemplate(id + salt, table), theme);
  }
  function itemFlavour(id){ return flavourFor(id, ""); }
  // Global uniqueness: the templates collide for a minority of items (the 124-entry
  // FIXED pool guarantees birthday/pigeonhole clashes, plus the odd "{adj} {noun}"),
  // so claim the first free salted variant. Deterministic across reloads because the
  // catalogue is stamped — and loot registered — in a fixed order.
  const usedNames = new Set();
  function uniqueFlavour(id){
    for(let k = 0; k < 64; k++){
      const n = flavourFor(id, k ? ("#" + k) : "");
      if(!usedNames.has(n)){ usedNames.add(n); return n; }
    }
    const n = itemFlavour(id) + " ·" + id;   // exhaustion fallback (not expected to hit)
    usedNames.add(n); return n;
  }
  function boostLabel(b){ return b ? "+" + b.amount + " " + STAT_NAMES[b.stat] + " · " + (HERO_NAMES[b.hero] || b.hero) : ""; }
  // Stamp every catalogue item with its deterministic icon category / flavour /
  // boost. (uniqueFlavour guarantees globally-unique names; see its note.)
  CATALOG.forEach(it => {
    it.category = categoryOf(it.id);
    it.flavour = uniqueFlavour(it.id);
    it.boost = itemBoost(it.id, it.rarity);
  });

  // Register a catalogue item added AFTER the initial build (e.g. enemy-tier
  // loot in enemies.js / T23). Stamps the same deterministic style/flavour/boost
  // layer, appends it to the catalogue + lookup, and is idempotent — calling it
  // twice with the same id returns the already-registered item unchanged.
  function registerItem(it){
    const existing = byIdMap[it.id];
    if(existing) return existing;
    it.category = categoryOf(it.id);
    it.flavour = uniqueFlavour(it.id);
    it.boost = itemBoost(it.id, it.rarity);
    add(it);
    return it;
  }

  window.Collectibles = {
    RANKS, RARITY, paletteFor, rankIndex,
    CATALOG, byId: id => byIdMap[id], modeItems,
    categories: () => CATS.slice(),
    evaluate, evaluateCollector, evaluateTopics, evaluateMeta, evaluateGold, evaluateMomentum, evaluateQuestion, drawIcon,
    // item layer (T20)
    HERO_IDS, HERO_NAMES, STAT_NAMES, boostLabel,
    // icon system (T36): ~50 categories over 12 archetypes + variation
    CATEGORIES, categoryOf, familyOf, iconRoleGrid, iconColorGrid, lockedCells, shiftPalette,
    // post-build registration (T23 loot)
    registerItem,
    SPARK, SPEED
  };
})();
