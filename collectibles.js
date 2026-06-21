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
  // Noun pools indexed by style (0..9, matching ICON_STYLES); remap to icon-family in T36.
  const NOUNS = [
    [ // 0 sprite/familiar
      "Familiar","Imp","Sprite","Critter","Pixie","Wisp","Gremlin","Bogle",
      "Pipsqueak","Hobgoblin","Brownie","Puck","Goblet-imp","Mite","Tiddler","Whelp",
      "Fledgling","Sproutling","Gobbler","Nibbler","Skitterling","Flit","Pocket-beast","Lap-dragon",
      "Mischief","Scamp","Tagalong","Companion","Shoulder-friend","Snufflekin","Bumblefly","Squeaker"
    ],
    [ // 1 potion
      "Potion","Elixir","Tonic","Brew","Draught","Cordial","Philtre","Tincture",
      "Concoction","Bottle","Vial","Flask","Phial","Fizz","Bubbly-brew","Decoction",
      "Remedy","Restorative","Pick-me-up","Quaff","Syrup","Infusion","Essence","Distillate",
      "Mixture","Swig","Slurp","Glug","Gulp","Sip"
    ],
    [ // 2 scroll
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
    [ // 4 gem
      "Gem","Shard","Jewel","Geode","Crystal","Stone","Pebble","Bead",
      "Cabochon","Facet","Sparkler","Glimmerstone","Heartstone","Dewdrop","Teardrop","Nugget",
      "Chip","Sliver","Prism","Druzy","Twinkle","Glint","Gleamstone","Lodestone",
      "Marble","Knucklebone-gem","Wishing-stone","Sky-shard","Frostbead","Cinderstone"
    ],
    [ // 5 ring
      "Ring","Band","Signet","Loop","Hoop","Circlet","Bangle","Torc",
      "Cuff","Coil","Knuckle-ring","Thumb-ring","Pinky-ring","Friendship-band","Seal-ring","Twist",
      "Gimmel","Promise-band","Halo-ring","Whorl","Ringlet","Bracelet-bit","Charm-band","Spinner",
      "Knot","Curlicue","Loopy-thing","Round-about"
    ],
    [ // 6 shield
      "Shield","Aegis","Buckler","Targe","Pavise","Rondache","Gardbrace","Bulwark",
      "Wardplate","Guard","Cover","Bastion","Defender","Boss","Roundel","Kite-shield",
      "Heater","Door-of-a-shield","Lid","Pot-lid","Dustbin-lid","Tray","Plank-board","Barricade",
      "Rampart","Screen","Fender","Shieldling"
    ],
    [ // 7 food
      "Hearth-loaf","Cave Mushroom","Jerky","Pasty","Stew","Pie","Dumpling","Biscuit",
      "Crumpet","Scone","Bun","Roll","Tart","Pudding","Porridge","Broth",
      "Cheese","Sausage","Pickle","Jam","Honey-cake","Gingerbread","Toffee","Trail-mix",
      "Ration","Hardtack","Wafer","Oatcake","Flapjack","Marmalade","Soup","Snack",
      "Nibble","Morsel"
    ],
    [ // 8 rune
      "Rune","Sigil","Glyph","Mark","Ward","Symbol","Hex-mark","Stave",
      "Brand","Inscription","Cipher","Etching","Carving","Scribble","Squiggle","Token",
      "Charm-mark","Bind-rune","Seal","Emblem","Crest","Insignia","Tracery","Knotwork",
      "Talisman-mark","Doodle-rune","Spellmark","Wardstone"
    ],
    [ // 9 orb
      "Orb","Globe","Bauble","Sphere","Marble","Bubble","Crystal-ball","Snowglobe",
      "Eyeball-of-glass","Gazing-ball","Dewglobe","Pearl","Moonball","Glimmer-orb","Lantern-globe","Trinket-ball",
      "Spherelet","Roundel-orb","Wishing-orb","Fortune-ball","Plasma-bauble","Glow-globe","Bobble","Sphere-thing",
      "Whirligig","Gobstopper","Bowling-bauble","Planetoid"
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
  function itemStyle(id){ return hashStr(id) % 10; }
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
  // theme = itemStyle(id) for now; switch to icon-family when T36 lands.
  // `salt` re-rolls the template + words while keeping the icon-family theme
  // (so a re-roll for de-duplication stays themed to the icon, food stays food).
  function flavourFor(id, salt){
    const theme = itemStyle(id);
    const table = (theme === 7 /* food */) ? FOOD_TEMPLATES : TEMPLATES;
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
  // Stamp every catalogue item with its deterministic style / flavour / boost.
  // (uniqueFlavour guarantees globally-unique names; see its note.)
  CATALOG.forEach(it => {
    it.style = itemStyle(it.id);
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
    it.style = itemStyle(it.id);
    it.flavour = uniqueFlavour(it.id);
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
