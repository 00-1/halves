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

  // ranks
  RANKS.forEach((rk,i) => add({
    id:"rank:"+rk.key, name:rk.name, rarity:rk.rarity, cat:"Rank", modeId:null,
    desc:"Reach the rank of "+rk.name+" in any mode.",
    test: ctx => ctx.rankIndex === i
  }));

  // per-mode: initiation, flawless, speed brackets, mastery
  MODES.forEach(m => {
    add({ id:"init:"+m.id, name:m.name+" Initiate", rarity:"uncommon", cat:"Initiation", modeId:m.id,
      desc:"Finish your first "+m.name+" round.", test: () => true });
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
      if(it.need) continue;                          // topic milestones: see evaluateTopics
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
  // ---- 10 pixel-icon styles (G = 12 grid). Each fills `g` (1 = filled) and
  // `a` (1 = accent cell); a shared painter draws outline + body/accent. -----
  const G = 12;
  function box(t, x0, y0, x1, y1){
    for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) if(y>=0&&y<G&&x>=0&&x<G) t[y][x] = 1;
  }
  function s_sprite(g, a, rnd){                      // 0 — mirrored creature blob
    const half = Math.floor(G/2);
    for(let y=1;y<G-1;y++) for(let x=1;x<=half-1;x++){
      const on = rnd() < (0.62 - Math.abs(y-(G-1)/2)/G*0.4) ? 1 : 0;
      g[y][x] = on; g[y][G-1-x] = on;
      if(on && rnd() < 0.3){ a[y][x] = 1; a[y][G-1-x] = 1; }
    }
  }
  function s_potion(g, a){                            // 1 — flask + liquid + bubble
    box(g,5,1,6,1); box(g,5,2,6,3); box(g,4,4,7,4); box(g,3,5,8,5); box(g,2,6,9,9); box(g,3,10,8,10);
    box(a,3,7,8,9); box(a,4,10,7,10); a[6][6]=1; box(a,5,1,6,1);
  }
  function s_scroll(g, a){                            // 2 — parchment + ribbon + glyph lines
    box(g,2,1,9,2); box(g,2,9,9,10); box(g,3,3,8,8);
    box(a,2,1,9,1); box(a,2,10,9,10); box(a,4,4,7,4); box(a,4,6,7,6);
  }
  function s_blade(g, a){                             // 3 — dagger w/ glowing edge
    box(g,5,1,6,7); box(g,3,8,8,8); box(g,5,9,6,10); box(g,4,11,7,11);
    box(a,5,1,5,7); a[8][3]=1; a[8][8]=1; box(a,4,11,7,11);
  }
  function s_gem(g, a){                               // 4 — faceted crystal
    box(g,4,2,7,2); box(g,3,3,8,3); box(g,2,4,9,5); box(g,3,6,8,6); box(g,4,7,7,7); box(g,5,8,6,8);
    for(let y=2;y<=8;y++) for(let x=2;x<=5;x++) if(g[y][x] && (x+y)%2===0) a[y][x]=1;
  }
  function s_ring(g, a){                              // 5 — band + set stone
    box(g,3,3,8,10);
    for(let y=5;y<=8;y++) for(let x=4;x<=7;x++) g[y][x]=0;     // hollow
    box(g,5,1,6,2); box(a,5,1,6,2); a[3][3]=1; a[3][8]=1; a[10][3]=1; a[10][8]=1;
  }
  function s_shield(g, a){                            // 6 — heater shield + boss + trim
    box(g,2,2,9,2); box(g,2,3,9,5); box(g,3,6,8,7); box(g,4,8,7,8); box(g,5,9,6,10);
    box(a,5,5,6,6); box(a,2,2,9,2);
  }
  function s_food(g, a, rnd){                         // 7 — drumstick (meat + bone)
    box(g,3,1,8,1); box(g,2,2,9,5); box(g,3,6,8,6); box(g,5,7,6,9); box(g,4,10,7,11);
    for(let y=1;y<=6;y++) for(let x=2;x<=9;x++) if(g[y][x] && rnd() < 0.3) a[y][x]=1;
    box(a,5,7,6,8); box(a,4,10,7,10);
  }
  function s_rune(g, a){                              // 8 — symmetric sigil on a tablet
    box(g,2,1,9,10); box(a,5,2,6,9); box(a,3,5,8,6); a[3][3]=1; a[3][8]=1; a[8][3]=1; a[8][8]=1;
  }
  function s_orb(g, a){                               // 9 — glowing sphere + highlight
    box(g,4,1,7,1); box(g,3,2,8,2); box(g,2,3,9,8); box(g,3,9,8,9); box(g,4,10,7,10);
    box(a,3,3,4,4); a[1][5]=1; a[1][6]=1; a[10][5]=1; a[10][6]=1;
  }
  const ICON_STYLES = [s_sprite, s_potion, s_scroll, s_blade, s_gem, s_ring, s_shield, s_food, s_rune, s_orb];

  function paintGrid(cx, g, a, pal, scale, off){
    const fl = (x,y) => x>=0 && y>=0 && x<G && y<G && g[y][x];
    cx.fillStyle = pal.outline;
    for(let y=0;y<G;y++) for(let x=0;x<G;x++)
      if(!g[y][x] && (fl(x-1,y)||fl(x+1,y)||fl(x,y-1)||fl(x,y+1))) cx.fillRect(off+x*scale, off+y*scale, scale, scale);
    for(let y=0;y<G;y++) for(let x=0;x<G;x++)
      if(g[y][x]){ cx.fillStyle = a[y][x] ? pal.accent : pal.body; cx.fillRect(off+x*scale, off+y*scale, scale, scale); }
  }
  // Draws the pixel icon for `seed` (style = hash(seed) % 10, or `styleOverride`
  // when given — heroes force the creature-sprite style) using palette `pal`.
  function drawIcon(canvas, seed, pal, styleOverride){
    const cx = canvas.getContext("2d");
    const scale = Math.max(1, Math.floor(canvas.width / G));
    cx.clearRect(0,0,canvas.width,canvas.height);
    const off = Math.floor((canvas.width - scale*G) / 2);
    const grid = [], acc = [];
    for(let y=0;y<G;y++){ grid[y] = new Array(G).fill(0); acc[y] = new Array(G).fill(0); }
    const style = (styleOverride != null) ? (styleOverride % ICON_STYLES.length) : (hashStr(seed) % ICON_STYLES.length);
    ICON_STYLES[style](grid, acc, mulberry32(hashStr(seed)));
    paintGrid(cx, grid, acc, pal, scale, off);
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
    pip:"Fenn", vex:"Vesh", sela:"Selwen", roon:"Rendel" };
  const STAT_KEYS = ["power","guard","speed","focus"];
  const STAT_NAMES = { power:"Power", guard:"Guard", speed:"Speed", focus:"Focus" };
  const BOOST_AMOUNT = { common:1, uncommon:2, rare:3, epic:5, legendary:8 };
  const ADJ = ["Effervescent","Cryptic","Glowing","Humming","Ancient","Cursed","Gilded","Frosted",
    "Smouldering","Twinkling","Battered","Pristine","Whispering","Volatile"];
  // Noun pools indexed by style (must match ICON_STYLES order 0..9).
  const NOUNS = [
    ["Familiar","Imp","Sprite","Critter"],                 // 0 sprite
    ["Potion","Elixir","Tonic","Brew"],                    // 1 potion
    ["Scroll","Tome","Codex","Rune-page"],                 // 2 scroll
    ["Dagger","Dirk","Kris","Shortsword"],                 // 3 blade
    ["Gem","Shard","Jewel","Geode"],                       // 4 gem
    ["Ring","Band","Signet"],                              // 5 ring
    ["Shield","Aegis","Buckler"],                          // 6 shield
    ["Goblin Leg","Hearth-loaf","Cave Mushroom","Jerky"],  // 7 food
    ["Rune","Sigil","Glyph"],                              // 8 rune
    ["Orb","Globe","Bauble"]                               // 9 orb
  ];
  function itemStyle(id){ return hashStr(id) % 10; }
  function itemBoost(id, rarity){
    return { hero: HERO_IDS[hashStr(id) % 12], stat: STAT_KEYS[hashStr(id + "§") % 4],
             amount: BOOST_AMOUNT[rarity] || 1 };
  }
  function itemFlavour(id){
    const style = itemStyle(id), pool = NOUNS[style];
    return ADJ[hashStr(id + "~adj") % ADJ.length] + " " + pool[hashStr(id + "~noun") % pool.length];
  }
  function boostLabel(b){ return b ? "+" + b.amount + " " + STAT_NAMES[b.stat] + " · " + (HERO_NAMES[b.hero] || b.hero) : ""; }
  // Stamp every catalogue item with its deterministic style / flavour / boost.
  CATALOG.forEach(it => {
    it.style = itemStyle(it.id);
    it.flavour = itemFlavour(it.id);
    it.boost = itemBoost(it.id, it.rarity);
  });

  // Register a catalogue item added AFTER the initial build (e.g. enemy-tier
  // loot in enemies.js / T23). Stamps the same deterministic style/flavour/boost
  // layer, appends it to the catalogue + lookup, and is idempotent — calling it
  // twice with the same id returns the already-registered item unchanged.
  function registerItem(it){
    const existing = byIdMap[it.id];
    if(existing) return existing;
    it.style = itemStyle(it.id);
    it.flavour = itemFlavour(it.id);
    it.boost = itemBoost(it.id, it.rarity);
    add(it);
    return it;
  }

  window.Collectibles = {
    RANKS, RARITY, paletteFor, rankIndex,
    CATALOG, byId: id => byIdMap[id], modeItems,
    categories: () => CATS.slice(),
    evaluate, evaluateCollector, evaluateTopics, evaluateQuestion, drawIcon,
    // item layer (T20)
    HERO_IDS, HERO_NAMES, STAT_NAMES, boostLabel, ICON_STYLES,
    // post-build registration (T23 loot)
    registerItem,
    SPARK, SPEED
  };
})();
