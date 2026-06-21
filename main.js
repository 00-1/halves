/*
 * Halves — game engine.
 *
 * Mode-agnostic: it reads the active mode from window.MODES (see modes.js),
 * runs one shuffled round, times each answer, and keeps a per-mode
 * Hall of Fame in localStorage (with an in-memory fallback when storage
 * is blocked, e.g. in a sandboxed iframe).
 */
(function(){
  "use strict";

  const MODES = window.MODES;
  const GROUPS = window.MODE_GROUPS || ["Core"];
  const byId  = id => MODES.find(m => m.id === id);

  // ---- safe storage (per-mode board + last-played mode) -------------------
  const mem = {};                       // in-memory fallback, keyed by mode id
  const MAX = 10;
  const boardKey = id => "halves.hof:" + id;
  const LAST_KEY = "halves.mode";

  function loadBoard(modeId){
    try{
      const v = localStorage.getItem(boardKey(modeId));
      if(v == null) return (mem[modeId] || []).slice();
      const arr = JSON.parse(v);
      return Array.isArray(arr) ? arr : (mem[modeId] || []).slice();
    }catch(e){ return (mem[modeId] || []).slice(); }
  }
  function saveBoard(modeId, arr){
    mem[modeId] = arr.slice();
    try{ localStorage.setItem(boardKey(modeId), JSON.stringify(arr)); }catch(e){/* in-memory only */}
  }
  function loadLastMode(){ try{ return localStorage.getItem(LAST_KEY) || ""; }catch(e){ return ""; } }
  function saveLastMode(id){ try{ localStorage.setItem(LAST_KEY, id); }catch(e){} }

  // ranking: higher score first, then shorter time, then earlier entry
  function rank(a,b){ return b.score - a.score || a.time - b.time || a.ts - b.ts; }

  // Event best-attempt store (T80) — keyed by EVENT id (not date), so the best
  // attempt persists across the 14-day recurrence and can be beaten next time.
  let memEventBest = null;
  function loadEventBest(){
    if(memEventBest) return memEventBest;
    let o; try{ o = JSON.parse(localStorage.getItem("halves.eventBest")); }catch(e){ o = null; }
    memEventBest = (o && typeof o === "object") ? o : {};
    return memEventBest;
  }
  function saveEventBest(o){ memEventBest = o; try{ localStorage.setItem("halves.eventBest", JSON.stringify(o)); }catch(e){} }
  // Keep the better attempt (same rank ordering as the topic boards).
  function recordEventBest(id, entry){
    const o = Object.assign({}, loadEventBest()), prev = o[id];
    if(!prev || rank(entry, prev) < 0) o[id] = entry;
    saveEventBest(o);
    return o[id];
  }

  // collectibles + cumulative stats (also degrade to in-memory)
  let memCollected = null, memStats = null;
  function loadCollected(){
    if(memCollected) return memCollected;
    try{ const v = localStorage.getItem("halves.collected"); memCollected = v ? JSON.parse(v) : {}; }
    catch(e){ memCollected = {}; }
    if(!memCollected || typeof memCollected !== "object") memCollected = {};
    return memCollected;
  }
  function saveCollected(o){ memCollected = o; try{ localStorage.setItem("halves.collected", JSON.stringify(o)); }catch(e){} }
  function loadStats(){
    if(memStats) return memStats;
    let s; try{ s = JSON.parse(localStorage.getItem("halves.stats")); }catch(e){ s = null; }
    if(!s || typeof s !== "object") s = {};
    s.games = s.games || 0; s.byMode = s.byMode || {}; s.flawless = s.flawless || {};
    memStats = s; return s;
  }
  function saveStats(s){ memStats = s; try{ localStorage.setItem("halves.stats", JSON.stringify(s)); }catch(e){} }

  // ---- Goblin Gold (T26) — earn/display/persist; NO spending -------------
  const GOLD_LABEL = "Goblin Gold";   // the ONE user-facing label
  let memGold = null;
  function loadGold(){
    if(memGold != null) return memGold;
    let v; try{ v = parseFloat(localStorage.getItem("halves.gold")); }catch(e){ v = 0; }
    memGold = (isFinite(v) && v > 0) ? v : 0; return memGold;
  }
  function saveGold(n){ memGold = n; try{ localStorage.setItem("halves.gold", String(n)); }catch(e){} }
  // Big-number formatter: grouped digits < 1000, then 3-sig-fig suffix ladder.
  const GOLD_SUFFIX = ["","K","M","B","T","Qa","Qi","Sx","Sp","Oc","No","Dc","Ud","Dd","Td","Qad"];
  function fmtGold(n){
    if(!isFinite(n) || isNaN(n) || n < 0) n = 0;
    n = Math.floor(n);
    if(n < 1000) return String(n);
    let tier = Math.floor(Math.log10(n) / 3);
    if(tier >= GOLD_SUFFIX.length) tier = GOLD_SUFFIX.length - 1;
    const s = n / Math.pow(1000, tier);
    const str = s >= 100 ? s.toFixed(0) : s >= 10 ? s.toFixed(1) : s.toFixed(2);
    return str + GOLD_SUFFIX[tier];
  }
  // Pure per-event earn formulas (Node-testable via window.Gold).
  // A cleanly-solved question: (2 + speed bonus vs target) × combo streak × mult.
  function questionGold(target, dt, combo, mult){ return (2 + Math.max(0, Math.round(target - dt))) * (1 + combo * 0.1) * mult; }
  function roundBonusGold(score, rankIdx, mult){ return (score + rankIdx * 2) * mult; }
  function tierGold(n, mult){ return Math.round(10 * (1 + n / 10)) * mult; }
  // Escalating global multiplier — grows with everything you've collected.
  function goldMult(col){
    const items = C.CATALOG.filter(it => col[it.id]).length;
    let mastered = 0, tiers = 0;
    for(const k in col){ if(k.indexOf("mastery:") === 0) mastered++; else if(/^tier:\d+$/.test(k)) tiers++; }
    const heroes = window.Heroes ? window.Heroes.HEROES.filter(h => window.Heroes.isHeroUnlocked(h, col)).length : 0;
    return 1 + items * 0.05 + mastered * 0.5 + heroes * 0.5 + tiers * 1;
  }
  // Add gold, persist, and grant any newly-crossed wealth milestones (into col).
  function earnGold(amount, col){
    amount = Math.max(0, Math.round(amount));
    if(!amount) return [];
    const total = loadGold() + amount;
    saveGold(total);
    const wealth = C.evaluateGold(total, id => !!col[id]);
    wealth.forEach(it => col[it.id] = { ts: Date.now() });
    return wealth;
  }

  // ---- Momentum (T31) — a forgiving daily-practice signal, NOT a fragile -----
  // streak: +1 per day played, −1 per day missed, floored at 0, capped at 75.
  const MOMENTUM_LABEL = "Momentum";
  const MOMENTUM_MAX = 75;
  let memStreak = null;
  function loadMomentum(){
    if(memStreak) return memStreak;
    let s; try{ s = JSON.parse(localStorage.getItem("halves.streak")); }catch(e){ s = null; }
    if(!s || typeof s !== "object") s = {};
    memStreak = { count: s.count || 0, lastDay: (s.lastDay == null ? null : s.lastDay), best: s.best || 0 };
    return memStreak;
  }
  function saveMomentum(s){ memStreak = s; try{ localStorage.setItem("halves.streak", JSON.stringify(s)); }catch(e){} }
  // Local calendar day index (integer) for a timestamp.
  function localDay(ms){ const d = new Date(ms); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); }
  // Pure reducer: given the stored state and today's day index, the next state.
  function reduceMomentum(state, today){
    let count = (state && state.count) || 0;
    const lastDay = (state && state.lastDay != null) ? state.lastDay : null;
    let best = (state && state.best) || 0;
    if(lastDay == null) count = 1;                                  // first ever play
    else if(today > lastDay){ const N = today - lastDay;           // gap of N days (N−1 missed)
      count = Math.min(MOMENTUM_MAX, Math.max(0, count - (N - 1)) + 1); }
    // today <= lastDay: same day (or clock went back) → no change
    best = Math.min(MOMENTUM_MAX, Math.max(best, count));
    const newLast = (lastDay == null) ? today : Math.max(lastDay, today);
    return { count: count, lastDay: newLast, best: best };
  }
  // Register today's play: advance momentum, grant any new momentum milestones.
  function bumpMomentum(col){
    const prev = loadMomentum();
    const next = reduceMomentum(prev, localDay(Date.now()));
    const wentUp = next.count > prev.count || prev.lastDay == null;
    saveMomentum(next);
    const ms = C.evaluateMomentum(next.best, id => !!col[id]);
    ms.forEach(it => col[it.id] = { ts: Date.now() });
    return { state: next, wentUp: wentUp, milestones: ms };
  }

  // ---- elements -----------------------------------------------------------
  const $ = id => document.getElementById(id);
  const screens = { entry:$("entry"), start:$("start"), game:$("game"), results:$("results"), summary:$("summary"), inventory:$("inventory"), heroes:$("heroes"), heroDetail:$("heroDetail"), arena:$("arena"), practice:$("practice"), settings:$("settings") };
  const elPrompt=$("prompt"), elGhost=$("ghost"), elAnswer=$("answer"),
        elCounter=$("counter"), elClock=$("clock"), elProgress=$("progress"),
        elStage=$("stage"), elPad=$("pad"), elEyebrow=$("eyebrow"),
        elModeTree=$("modeTree");

  // ---- FXGL wiring (T110/T112) — make B's engine visible ------------------
  // A FULL-BLEED backdrop controller (one fixed full-viewport canvas behind the
  // app) carrying a semantic scene per screen — the HOME state (T95) on #start and
  // the live Arena region/tier (T108) on #arena — animated only on those screens
  // and idle+hidden everywhere else. Plus a CELEBRATION BURST overlay (T94) on top,
  // fired on real reward gains AND real wins. The engine owns reduced-motion + the
  // no-WebGL2 still fallback; everything here is a guarded no-op if FXGL is absent.
  // The burst controller is never given a scene, so it never loops / leaks RAF.
  const FX_MOODS = ["motes", "embers", "snow", "stars"];   // engine particle kinds
  let fxBg = null, fxBurst = null;
  function setupFx(){
    const FXGL = window.FXGL; if(!FXGL || !FXGL.Controller) return;
    try{
      const bg = $("fxBackdrop"); if(bg) fxBg = new FXGL.Controller(bg, {});
      const bu = $("fxBurst");    if(bu) fxBurst = new FXGL.Controller(bu, {});
    }catch(e){ fxBg = null; fxBurst = null; }
  }
  // LIVE home state for the backdrop — read from the real sources, never constants:
  // collection progress (0–1), the daily Momentum streak, and today's event.
  function homeFxState(){
    const col = loadCollected();
    const total = (C.CATALOG && C.CATALOG.length) || 1;
    let have = 0; for(const it of C.CATALOG) if(col[it.id]) have++;
    const progress = Math.max(0, Math.min(1, have / total));
    const streak = loadMomentum().count | 0;
    const Ev = window.Events, ev = (Ev && Ev.today) ? Ev.today() : null;
    let event = null;
    if(ev){
      const pal = C.paletteFor ? C.paletteFor(ev.rarity) : null;
      event = { seed: ev.artSeed | 0, name: ev.name,
        palette: pal ? ["#0E1116", pal.body, pal.accent] : null,    // wear today's event colours
        mood: FX_MOODS[((ev.artSeed | 0) % FX_MOODS.length + FX_MOODS.length) % FX_MOODS.length] };
    }
    return { event: event, progress: progress, streak: streak };
  }
  // LIVE Arena state for the backdrop (T108) — the region/tier the player is ON
  // (sense of place), intensifying toward the region boss. All from the real
  // Enemies position, not constants.
  function arenaFxState(){
    const E = window.Enemies; if(!E || !E.currentTier) return { region: 0, tier: 1 };
    const tier = E.currentTier(loadCollected()), RS = E.REGION_SIZE || 12;
    const posInReg = ((tier.n - 1) % RS) + 1;                 // 1..RS (depth toward the boss)
    return { region: E.tierRegion(tier.n), tier: tier.n,
      facingBoss: (tier.n % RS) === 0,                        // the region boss tier is the peak
      tierFrac: posInReg / RS, mood: "neutral" };
  }
  function fxShowBackdrop(on){ const cv = $("fxBackdrop"); if(cv) cv.classList.toggle("hidden", !on); }
  // Drive the backdrop per screen: HOME scene on #start, ARENA scene on #arena
  // (both re-derived from live state on entry), idle (no RAF) + hidden elsewhere.
  function fxSetScreen(name){
    if(!fxBg) return;
    try{
      if(name === "start"){ fxShowBackdrop(true); fxBg.setHomeState(homeFxState()); fxBg.start(); if(fxBg.resize) fxBg.resize(); }
      else if(name === "arena"){ fxShowBackdrop(true); fxBg.setArenaState(arenaFxState()); fxBg.start(); if(fxBg.resize) fxBg.resize(); }
      else { fxBg.stop(); fxShowBackdrop(false); }
    }catch(e){}
  }
  // Celebration burst on a real reward moment — seeded + palette-coloured from the
  // gained items (deterministic), capped, never covers key text (it's a sparse,
  // transient overlay), reduced-motion handled by the engine.
  const FX_RANK = { common:0, uncommon:1, rare:2, epic:3, legendary:4 };
  function fxCelebrate(items){
    if(!fxBurst || !items || !items.length) return;
    let seed = items.length >>> 0, pal = null, best = -1;
    for(const it of items){
      const s = String(it.id);
      for(let i = 0; i < s.length; i++) seed = (Math.imul(seed, 31) + s.charCodeAt(i)) >>> 0;
      const rk = FX_RANK[it.rarity] != null ? FX_RANK[it.rarity] : 0;
      if(rk > best){ best = rk; pal = C.paletteFor ? C.paletteFor(it.rarity) : null; }
    }
    const palette = pal ? [pal.accent, pal.body, "#ffffff"] : null;
    const count = Math.min(150, 50 + items.length * 12 + best * 14);
    try{ fxBurst.burst({ x: 0.5, y: 0.4, count: count, seed: seed || 1, palette: palette }); }catch(e){}
  }
  // Celebrate a WIN (T112) — beyond reward gains. A rank-scaled results burst (only
  // a decent run pops; bigger/warmer the higher the rank) and an Arena-victory
  // burst. Both capped + reduced-motion-safe; fired behind/around the result, never
  // over the text.
  const FX_RANK_MIN = 6;   // below this (a poor run) there's no celebration
  function fxCelebrateRank(rankIdx){
    if(!fxBurst) return;
    const ranks = C.RANKS || [];
    if(!ranks.length || rankIdx < FX_RANK_MIN) return;
    const rk = ranks[Math.min(rankIdx, ranks.length - 1)];
    const t = Math.min(1, (rankIdx - FX_RANK_MIN) / Math.max(1, ranks.length - 1 - FX_RANK_MIN));
    const count = Math.round(45 + t * 105);
    try{ fxBurst.burst({ x: 0.5, y: 0.34, count: count, seed: (rankIdx + 1) * 0x9e3779b1 >>> 0, palette: [rk.color, "#ffffff"] }); }catch(e){}
  }
  function fxCelebrateWin(tierN){
    if(!fxBurst) return;
    try{ fxBurst.burst({ x: 0.5, y: 0.32, count: 120, seed: ((tierN | 0) + 1) * 0x85ebca6b >>> 0, palette: ["#f5b544", "#ffd98a", "#ffffff"] }); }catch(e){}
  }

  function show(name){
    // stop the game clock RAF whenever we leave the game screen (e.g. browser
    // back mid-round), so it never loops on a hidden screen.
    if(name !== "game" && raf){ cancelAnimationFrame(raf); raf = 0; }
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[name].classList.add("active");
    fxSetScreen(name);   // T110/T112: full-bleed backdrop — home scene on #start, Arena scene on #arena, idle elsewhere
    // music follows the screen: the topic's style in-game, the menu style elsewhere
    if(window.Sound && window.Sound.setMusic){
      if(name === "game") window.Sound.setMusic(eventCtx ? "event" : (typeof mode.music === "number" ? mode.music : mode.id));
      else if(name === "arena") window.Sound.setMusic("arena");   // T71: dedicated Arena theme
      else window.Sound.setMusic("menu");
    }
  }
  function fmt(t){ return t.toFixed(1); }
  function numStr(n){ return String(n); }
  function esc(s){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  // ---- topic-chain unlock -------------------------------------------------
  // A topic is playable if it is first in the chain (no `unlockedBy`), or the
  // previous topic has been finished once (its `init:` achievement is owned),
  // or this topic itself has already been played (migration: anything a
  // returning player has an `init` for stays unlocked).
  //
  // A harder Part-2 mode adds `requires:"mastery:<part1Id>"`: it stays locked
  // until that Mastery is earned. Both gates must pass; owning this mode's own
  // `init:` (already played) overrides them (migration).
  function isUnlocked(m){
    const col = loadCollected();
    if(col["init:"+m.id]) return true;                              // already played
    if(m.requires && !col[m.requires]) return false;               // Part-2 mastery gate
    if(m.unlockedBy && !col["init:"+m.unlockedBy]) return false;   // topic-chain gate
    return true;                                                    // first topic / all gates passed
  }

  // What does a locked topic need? Used for the unlock hint on the start screen.
  function unlockHint(m){
    if(m.requires){
      const req = byId(m.requires.replace(/^mastery:/, ""));
      return 'Master <b>'+esc(req ? req.name : "its Part 1")+'</b> to unlock '+esc(m.name)+'.';
    }
    const prev = byId(m.unlockedBy);
    return 'Finish <b>'+esc(prev ? prev.name : "the previous topic")+'</b> to unlock '+esc(m.name)+'.';
  }

  let mode = byId(loadLastMode()) || MODES[0];
  if(!isUnlocked(mode)) mode = MODES.find(isUnlocked) || MODES[0];

  // ---- onboarding gating (T86) -------------------------------------------
  // On a genuinely FRESH profile, the extra features start gated and unlock one
  // at a time as you progress (a gentle tutorial). MIGRATION-SAFE: a legacy
  // profile (any existing collected / stats / board) is treated as fully unlocked
  // and is NEVER re-gated. Pure + local (`halves.unlocked`). This is an ACCESS
  // layer only — earning, the collection, and the Arena invariants are untouched.
  function loadUnlocked(){
    let u; try{ u = JSON.parse(localStorage.getItem("halves.unlocked")); }catch(e){ u = null; }
    return (u && typeof u === "object") ? u : null;
  }
  function saveUnlocked(u){ try{ localStorage.setItem("halves.unlocked", JSON.stringify(u)); }catch(e){} }
  function profileHasProgress(){
    if(Object.keys(loadCollected()).length) return true;
    const s = loadStats(); if(s && s.games > 0) return true;
    return MODES.some(m => loadBoard(m.id).length > 0);
  }
  let unlocked = (function(){
    const u = loadUnlocked();
    if(u) return u;                                          // an existing record wins
    if(profileHasProgress()){ const l = { legacy:1 }; saveUnlocked(l); return l; }  // legacy → stamp + all open
    return {};   // genuinely fresh → gated, NOT persisted yet (so it can still migrate to legacy if progress appears)
  })();
  function isFeatureUnlocked(id){ return !!(unlocked.legacy || unlocked[id]); }
  function unlockFeature(id){ if(isFeatureUnlocked(id)) return false; unlocked[id] = 1; saveUnlocked(unlocked); return true; }
  function needsIntro(){ return !unlocked.legacy && !unlocked.introDone; }   // fresh profile still owes the intro

  // Gated features + the milestone that ungates each (T86 = Inventory via the intro;
  // T87 = the rest). `el` = the nav/readout control(s) hidden until unlocked; `cond`
  // = the progress milestone (checked on returning home). Inventory has no cond —
  // it's unlocked explicitly by finishing the intro. Legacy profiles are all-unlocked
  // so no cond ever fires for them. Each ungate raises a one-time coachmark.
  function hasInit(){ const c = loadCollected(); return Object.keys(c).some(k => k.indexOf("init:") === 0); }
  function hasLootOrMastery(){ const c = loadCollected(); return Object.keys(c).some(k => { const it = C.byId(k); return it && (it.cat === "Loot" || it.cat === "Mastery"); }); }
  function hasHero(){ const Hs = window.Heroes, c = loadCollected(); return !!(Hs && Hs.HEROES.some(h => Hs.isHeroUnlocked(h, c))); }
  function hasEarned(){ return loadGold() > 0 || (loadMomentum().count || 0) > 0; }
  function enoughRuns(){ const s = loadStats(); return (s.games || 0) >= 3; }
  const GATED = [
    { feature:"inventory",   el:["invBtn"],                msg:"Inventory unlocked — your rewards live here" },
    { feature:"practice",    el:["practiceBtn"],           msg:"Practice unlocked — drill any question, at your pace", cond:hasInit },
    { feature:"heroes",      el:["heroesBtn"],             msg:"Heroes unlocked — assemble your roster",        cond:hasLootOrMastery },
    { feature:"arena",       el:["arenaBtn"],              msg:"Arena unlocked — send a hero into battle",      cond:hasHero },
    { feature:"earnings",    el:["goldBar","momentumBar"], msg:"Goblin Gold & Momentum are now tracking",       cond:hasEarned },
    { feature:"eventbanner", el:[],                         msg:"Daily Events unlocked — a new challenge each day", cond:enoughRuns }
  ];
  function applyGates(){
    GATED.forEach(g => { const on = isFeatureUnlocked(g.feature); g.el.forEach(id => { const b = $(id); if(b) b.classList.toggle("hidden", !on); }); });
  }
  // Evaluate the milestone conditions; unlock + queue a highlight for any newly met.
  function checkGates(){
    GATED.forEach(g => { if(g.cond && !isFeatureUnlocked(g.feature) && g.cond()){ unlockFeature(g.feature); queueHighlight(g.feature); } });
  }
  // One-time spotlight + coachmark toast when a feature ungates (persisted → fires
  // once; the toast queue paces them so several unlocks never spam).
  let highlightQ = [];
  function queueHighlight(id){ if(!unlocked[id + "Hi"] && highlightQ.indexOf(id) < 0) highlightQ.push(id); }
  function firePendingHighlight(){
    while(highlightQ.length){
      const id = highlightQ.shift();
      if(unlocked[id + "Hi"]) continue;
      const cfg = GATED.find(g => g.feature === id); if(!cfg) continue;
      unlocked[id + "Hi"] = 1; saveUnlocked(unlocked);
      const b = cfg.el[0] ? $(cfg.el[0]) : null;
      if(b){ b.classList.add("pulse"); setTimeout(() => { if(b.classList) b.classList.remove("pulse"); }, 2600); }
      enqueueToast(() => {
        const t = document.createElement("div");
        t.className = "toast coach";
        t.innerHTML = '<span class="t-glyph">✨</span><div class="t-txt"><span class="t-tag">Unlocked</span>'+
          '<span class="t-name">'+esc(cfg.msg)+'</span></div>';
        $("toasts").appendChild(t);
        requestAnimationFrame(() => t.classList.add("show"));
        return t;
      }, 2800, 1600);
    }
  }

  // A locked topic's compact requirement, for a picker row subline.
  function unlockReq(m){
    if(m.requires){
      const req = byId(m.requires.replace(/^mastery:/, ""));
      return 'Master '+esc(req ? req.name : "Part 1")+' first';
    }
    const prev = byId(m.unlockedBy);
    return 'Finish '+esc(prev ? prev.name : "the previous topic")+' first';
  }

  // How much of a mode's collectible set the player owns.
  function modeProgress(m){
    const col = loadCollected();
    const items = C.modeItems(m.id);
    return { have: items.filter(it => col[it.id]).length, total: items.length };
  }
  // A topic is "complete" only at 100% of its set (which includes the hard
  // items: Lightning, Mastery, Flawless and every Beat/Spark).
  function isModeComplete(m){
    const p = modeProgress(m);
    return p.total > 0 && p.have === p.total;
  }

  // ---- start screen: mode picker + brand ---------------------------------
  // One picker row: name, a subline (best rank / "no best" / unlock hint),
  // collectible progress `have/total`, and a state glyph (▶ play · 🔒 · ✓ 100%).
  // ---- tech-tree view (T84): a data-driven visualisation of the SAME unlock
  // chain the list shows — never a hand-maintained parallel edge list. Nodes =
  // modes; edges derive from `unlockedBy` (the importance spine) and
  // `requires:"mastery:<id>"` (the Part-1 → Part-2 branch). State + progress come
  // from the live `isUnlocked()` / `modeProgress()`. The list stays as the a11y
  // fallback; this is a toggleable alternate view.
  function techGraph(){
    const spineModes = MODES.filter(m => !m.requires);     // the main chain (no mastery gate)
    const order = [], seen = new Set();
    let cur = spineModes.find(m => !m.unlockedBy) || spineModes[0];
    while(cur && !seen.has(cur.id)){
      order.push(cur); seen.add(cur.id);
      cur = spineModes.find(m => m.unlockedBy === order[order.length-1].id);
    }
    spineModes.forEach(m => { if(!seen.has(m.id)){ order.push(m); seen.add(m.id); } });  // graceful: append orphans
    const branchOf = {};
    MODES.filter(m => m.requires).forEach(m => {
      const mm = /^mastery:(.+)$/.exec(m.requires);
      if(mm && byId(mm[1])) branchOf[mm[1]] = m;
    });
    return { spine: order, branchOf: branchOf };
  }
  function nodeState(m){
    if(!isUnlocked(m)) return "locked";
    const p = modeProgress(m);
    if(p.total > 0 && p.have === p.total) return "done";
    if(loadCollected()["mastery:" + m.id]) return "mastered";
    return "unlocked";
  }
  const NODE_BADGE = { locked:"🔒", unlocked:"▶", mastered:"★", done:"✓" };
  // Swappable icon hook — today the topic's T56 pixel glyph; a richer per-topic
  // emblem (T82 direction) can drop in here later without touching the layout.
  function nodeIcon(m, cv){
    if(cv && window.Glyphs && m.glyphTokens) Glyphs.draw(cv, m.glyphTokens, { body:"#E6E9EF", accent:"#F5B544" });
  }
  function treeNodeHtml(m){
    const st = nodeState(m), p = modeProgress(m);
    return '<button class="tnode st-'+st+(m.id===mode.id ? " active" : "")+'" data-mode="'+esc(m.id)+'" '+
      'role="tab" aria-label="'+esc(m.name)+' — '+st+'">'+
      '<canvas class="pix tn-ico" width="36" height="22"></canvas>'+
      '<span class="tn-badge" aria-hidden="true">'+NODE_BADGE[st]+'</span>'+
      '<span class="tn-prog">'+p.have+'/'+p.total+'</span></button>';
  }
  // T106 — tech-tree v2. Each main-chain topic is a ROW whose 1–3 PARTS (Part 1 →
  // 2 → 3) run left-to-right, derived by FOLLOWING the live `requires` chain (never
  // a parallel edge list); rows are 1-, 2- or 3-wide as the data dictates. Two
  // distinct, directional, state-coloured connectors read the relationships at a
  // glance: a VERTICAL amber "chain" arrow between topics (unlockedBy — finish this
  // topic to open the next) and a HORIZONTAL purple "mastery" arrow between parts
  // (requires mastery — master this part to open the next). Lit once you've crossed
  // it (target unlocked), dim while still locked.
  function topicParts(g, m){               // the full part-chain for a topic (live requires)
    const parts = [m]; let cur = m;
    while(g.branchOf[cur.id]){ cur = g.branchOf[cur.id]; parts.push(cur); }
    return parts;
  }
  function renderTree(){
    const g = techGraph();
    let html = "";
    g.spine.forEach((m, i) => {
      const parts = topicParts(g, m);
      let row = "";
      parts.forEach((p, j) => {
        if(j > 0){                         // horizontal mastery-gate connector before this part
          row += '<div class="tbranch ' + (isUnlocked(p) ? "lit" : "dim") + '" aria-hidden="true"></div>';
        }
        row += '<div class="tpart">' + treeNodeHtml(p) + '</div>';
      });
      html += '<div class="tree-row" data-parts="' + parts.length + '">' + row + '</div>';
      const next = g.spine[i + 1];         // vertical chain connector to the next topic
      if(next) html += '<div class="tchain ' + (isUnlocked(next) ? "lit" : "dim") + '" aria-hidden="true"></div>';
    });
    elModeTree.innerHTML = html;
    elModeTree.querySelectorAll(".tnode").forEach(btn => {
      const m = byId(btn.dataset.mode), cv = btn.querySelector("canvas");
      if(m && cv) nodeIcon(m, cv);
    });
    renderTopicInfo();
    updateTreeScroll();   // T116: content height changed → refresh the scroll-fade affordance
  }
  // T116 — show the "more below"/"more above" fade + cue only when the tree actually
  // overflows, tracked from the live scroll metrics (re-wired to #modeTree after T96
  // made the home tree-only; the old affordance was bound to the dropped list wrap).
  function updateTreeScroll(){
    const wrap = $("treeWrap"), tree = elModeTree; if(!wrap || !tree) return;
    const up = tree.scrollTop > 0;
    const down = tree.scrollTop + tree.clientHeight < tree.scrollHeight - 1;
    wrap.classList.toggle("can-scroll-up", up);
    wrap.classList.toggle("can-scroll-down", down);
  }
  // The single compact selected-topic row (T96): glyph · name · have/total · best
  // (or the unlock requirement if locked). Replaces the old big top mark/tag + the
  // separate best line + the tree detail panel (one display, no duplication). The
  // Play/Practice/Guide actions are the shared #start buttons (T83).
  function renderTopicInfo(){
    const el = $("topicInfo"); if(!el) return;
    const m = mode, locked = !isUnlocked(m), p = modeProgress(m);
    let meta;
    if(locked){ meta = '🔒 ' + esc(unlockReq(m)); }
    else {
      const best = loadBoard(m.id).slice().sort(rank)[0];
      const bestTxt = best
        ? '<span style="color:'+C.RANKS[C.rankIndex(best.score, best.total, best.time)].color+'">'+esc(C.RANKS[C.rankIndex(best.score, best.total, best.time)].name)+'</span> · '+fmt(best.time)+'s'
        : 'No best yet';
      meta = '<b>'+p.have+'/'+p.total+'</b> · ' + bestTxt;
    }
    el.innerHTML = '<span class="ti-glyph"></span>'+
      '<span class="ti-text"><span class="ti-name">'+esc(m.name)+'</span>'+
        '<span class="ti-meta">'+meta+'</span></span>';
    paintGlyph(el.querySelector(".ti-glyph"), m, 5);
  }
  // The tree is the only home picker now (T96) — no list/tree toggle.
  function renderPicker(){ renderTree(); }
  // Paint a topic's glyph with the procedural pixel font (T56) into `el`, sized
  // by an internal cell scale (CSS height upscales it, kept crisp by
  // image-rendering:pixelated). Falls back to the old `glyph` HTML if Glyphs or
  // the structured tokens are unavailable.
  function paintGlyph(el, m, scale, opts){
    if(!el) return;
    const tokens = m && m.glyphTokens;
    if(window.Glyphs && tokens){
      const g = Glyphs.buildGrid(tokens);
      const cv = document.createElement("canvas");
      cv.width = g.w * scale; cv.height = g.h * scale;
      el.innerHTML = "";
      el.appendChild(cv);
      Glyphs.draw(cv, tokens, opts);
    } else {
      el.innerHTML = (m && m.glyph) || "";
    }
  }

  // The entry/splash brand mark is the fixed Halves "x/2"; paint it once.
  function renderBrand(){
    const el = screens.entry && screens.entry.querySelector(".mark");
    paintGlyph(el, byId("halves"), 10);
  }

  // Mint the favicon / home-screen icon from the same pixel renderer: draw the
  // "x/2" mark, dark-bg-padded, onto an offscreen canvas and wire it up as a
  // data-URL <link rel="icon"> (+ apple-touch-icon + theme-color) at runtime.
  function installFavicon(){
    if(!window.Glyphs || !document.createElement) return;
    const halves = byId("halves");
    if(!halves || !halves.glyphTokens) return;
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    if(!cv.getContext) return;
    Glyphs.draw(cv, halves.glyphTokens, { bg:"#0E1116", body:"#E6E9EF", accent:"#F5B544", pad:8 });
    let url; try { url = cv.toDataURL("image/png"); } catch(e){ return; }
    const head = document.head || document.getElementsByTagName("head")[0];
    if(!head) return;
    [["icon", url], ["apple-touch-icon", url]].forEach(([rel, href]) => {
      let link = document.querySelector('link[rel="'+rel+'"]');
      if(!link){ link = document.createElement("link"); link.rel = rel; head.appendChild(link); }
      link.href = href;
    });
    let meta = document.querySelector('meta[name="theme-color"]');
    if(!meta){ meta = document.createElement("meta"); meta.name = "theme-color"; head.appendChild(meta); }
    meta.content = "#0E1116";
  }

  function selectMode(id){
    const m = byId(id); if(!m) return;
    mode = m;
    if(isUnlocked(m)) saveLastMode(id);   // don't make a locked topic the default
    renderTree(); renderStartState();     // renderTree paints the topic-info row too
  }

  // Enable Start/Practice only for an unlocked topic. The Guide button is a peer
  // action (T83): enabled whenever the selected topic HAS a guide — including
  // locked topics, so their guide can still be previewed (the old per-row "?"
  // behaviour, now first-class).
  function renderStartState(){
    const locked = !isUnlocked(mode);
    $("startBtn").disabled = locked;
    $("practiceBtn").disabled = locked;
    const gb = $("guideBtn");
    if(gb) gb.disabled = !(window.Guides && window.Guides.has(mode.id));
  }

  // Procedural pixel icon on each menu button (T50) — a fitting category preset +
  // a fixed seed id, so each is stable across loads. Reuses C.drawIcon; no new art.
  const MENU_ICONS = [
    { id:"statsBtn",  cat:"scroll", pal:"epic" },
    { id:"invBtn",    cat:"chest",  pal:"legendary" },
    { id:"heroesBtn", cat:"helm",   pal:"rare" },
    { id:"arenaBtn",  cat:"sword",  pal:"uncommon" }
  ];
  function drawMenuIcons(){
    if(!C || !C.drawIcon) return;
    MENU_ICONS.forEach(m => {
      const btn = $(m.id), cv = btn && btn.querySelector("canvas");
      if(cv) C.drawIcon(cv, "menu:" + m.id, C.paletteFor(m.pal), m.cat);
    });
  }
  // Tech-tree (T84/T96): tapping a node SELECTS it — locked nodes are preview-only
  // (Start stays disabled); they never start a round from here.
  elModeTree.addEventListener("click", e => {
    const t = e.target.closest(".tnode"); if(!t) return;
    selectMode(t.dataset.mode);
  });
  // T116 — keep the tree's scroll-fade affordance in sync with real scroll state +
  // any height change (T112's fill-height / fullscreen toggle changes clientHeight).
  elModeTree.addEventListener("scroll", updateTreeScroll, { passive: true });
  window.addEventListener("resize", updateTreeScroll);
  window.addEventListener("orientationchange", updateTreeScroll);
  ["fullscreenchange","webkitfullscreenchange"].forEach(ev => document.addEventListener(ev, updateTreeScroll));

  // ---- topic guides (T27): a short "how to beat it" panel per topic ----------
  function openGuide(m){
    const g = m && window.Guides && window.Guides.get(m.id);
    if(!g){ return; }
    $("guideTitle").innerHTML = '<span class="g-glyph"></span> '+esc(m.name);
    paintGlyph($("guideTitle").querySelector(".g-glyph"), m, 4);
    $("guideBody").innerHTML =
      '<p class="g-intro">'+esc(g.intro)+'</p>'+
      '<ul class="g-tips">'+g.tips.map(t => '<li>'+esc(t)+'</li>').join("")+'</ul>'+
      '<div class="g-eg"><span class="g-eg-tag">Try this</span>'+esc(g.example)+'</div>';
    const md = $("guideModal");
    md.classList.remove("hidden");
    requestAnimationFrame(() => md.classList.add("show"));
  }
  function closeGuide(){
    const md = $("guideModal");
    md.classList.remove("show");
    setTimeout(() => md.classList.add("hidden"), 220);
  }
  $("guideClose").addEventListener("click", closeGuide);
  $("guideModal").addEventListener("click", e => { if(e.target === $("guideModal")) closeGuide(); });
  // First-class "Guide" action for the selected topic (T83) — peer to Start/Practice.
  $("guideBtn").addEventListener("click", () => openGuide(mode));

  // Practice / Review view wiring (T32).
  $("practiceBtn").addEventListener("click", openPractice);
  $("practiceBack").addEventListener("click", () => show("start"));
  $("practiceHintToggle").addEventListener("click", () => {
    const note = $("practiceNote"), t = $("practiceHintToggle");
    const open = note.classList.toggle("hidden") === false;   // toggle returns new state of "hidden"
    t.textContent = open ? "Hide the method" : "How to approach this";
  });
  $("practiceGrid").addEventListener("click", e => {
    const tile = e.target.closest(".pq-tile"); if(!tile) return;
    const m = byId(tile.dataset.mode); if(!m) return;
    const q = m.build().find(x => String(x.p) === tile.dataset.prompt);
    if(q) startPractice(m.id, q);
  });
  // ---- summary: best time per topic, colour-coded by rank; tap to play -----
  function renderSummary(){
    $("sumList").innerHTML = MODES.map(m => {
      // Locked: de-emphasised, shows the unlock requirement, not startable.
      if(!isUnlocked(m)){
        return '<div class="sum-row locked"><span class="md">'+esc(m.name)+
          '<span class="holder">🔒 '+unlockReq(m)+'</span></span>'+
          '<span class="go">🔒</span></div>';
      }
      const best = loadBoard(m.id).slice().sort(rank)[0];
      // Unlocked but never played: muted, hollow dot, still tappable to play.
      if(!best){
        return '<div class="sum-row notplayed" data-mode="'+esc(m.id)+'">'+
          '<span class="md">'+esc(m.name)+
            '<span class="holder"><i class="rankdot empty"></i>Not played</span></span>'+
          '<span class="sc">—</span><span class="tm">—</span><span class="go">▶</span></div>';
      }
      // Played: subtle heat-map tint + a crisp square rank dot + rank label in the
      // rank's colour (no rounded coloured card border — see T37).
      const rk = C.RANKS[C.rankIndex(best.score, best.total, best.time)];
      return '<div class="sum-row played" data-mode="'+esc(m.id)+'" '+
        'style="background:'+rk.color+'1f">'+
        '<span class="md">'+esc(m.name)+
          '<span class="holder"><i class="rankdot" style="background:'+rk.color+'"></i>'+
            '<span style="color:'+rk.color+'">'+esc(rk.name)+'</span></span></span>'+
        '<span class="sc">'+best.score+'/'+(best.total||"?")+'</span>'+
        '<span class="tm">'+fmt(best.time)+'s</span><span class="go">▶</span></div>';
    }).join("") + eventSummaryRows();
  }

  // Is this event playable/retryable right now? True iff it is live today.
  function isRetryable(id){ return !!(window.Events && window.Events.isLive(id)); }

  // Daily-event entries on the best-attempt board (T80). A LIVE event is routable
  // into play (carries data-event) and shows its persisted best; a non-live event
  // renders LOCKED — visible (best + when it returns) but NOT routable.
  function eventSummaryRows(){
    const Ev = window.Events; if(!Ev || !Ev.roster) return "";
    const best = loadEventBest();
    const rows = Ev.roster().map(e => {
      const b = best[e.id];
      const cells = b ? '<span class="sc">'+b.score+'/'+(b.total||"?")+'</span><span class="tm">'+fmt(b.time)+'s</span>'
                      : '<span class="sc">—</span><span class="tm">—</span>';
      if(isRetryable(e.id)){
        return '<div class="sum-row event played" data-event="'+esc(e.id)+'" style="background:var(--amber-weak)">'+
          '<span class="md">'+esc(e.name)+
            '<span class="holder"><i class="rankdot" style="background:var(--amber)"></i>'+
            '<span style="color:var(--amber)">Live today</span></span></span>'+
          cells+'<span class="go">▶</span></div>';
      }
      const days = Ev.daysUntilLive(e.id);
      const when = days === 1 ? "Live tomorrow" : ("Live in " + days + " days");
      return '<div class="sum-row event locked">'+
        '<span class="md">'+esc(e.name)+'<span class="holder">🔒 '+esc(when)+'</span></span>'+
        cells+'<span class="go">🔒</span></div>';
    }).join("");
    return '<div class="sum-event-head">Daily Events</div>' + rows;
  }

  // ---- ranks, collectible modal & inventory -------------------------------
  const C = window.Collectibles;

  function renderResultRank(idx){
    const rk = C.RANKS[idx];
    const el = $("rankLine");
    el.innerHTML = '<canvas class="pix" width="48" height="48"></canvas>'+
      '<div class="rank-txt"><span class="rank-k">Rank earned</span>'+
      '<span class="rank-n" style="color:'+rk.color+'">'+esc(rk.name)+'</span></div>';
    C.drawIcon(el.querySelector("canvas"), "rank:"+rk.key, C.paletteFor(rk.rarity));
  }

  // Modal — shows a set of collectible items (unlock celebration or detail).
  function openModal(title, items, compact){
    $("unlockTitle").textContent = title;
    const grid = $("unlockGrid");
    grid.className = "unlock-grid" + (compact ? " compact" : "");
    grid.innerHTML = "";
    const csz = compact ? 40 : 56;
    items.forEach(it => {
      const cell = document.createElement("div");
      cell.className = "u-cell r-" + it.rarity;
      // flavour name (big), rarity, the boost it grants, then the earning achievement
      cell.innerHTML = '<canvas class="pix" width="'+csz+'" height="'+csz+'"></canvas>'+
        '<div class="u-name">'+esc(it.flavour || it.name)+'</div>'+
        '<div class="u-rare">'+esc(it.rarity)+'</div>'+
        (it.boost ? '<div class="u-boost">'+esc(C.boostLabel(it.boost))+'</div>' : '')+
        '<div class="u-desc">'+esc(it.desc || it.name || "")+'</div>';
      grid.appendChild(cell);
      C.drawIcon(cell.querySelector("canvas"), it.id, C.paletteFor(it.rarity));
    });
    const m = $("unlockModal");
    m.classList.remove("hidden");
    requestAnimationFrame(() => m.classList.add("show"));
  }
  function closeModal(){
    const m = $("unlockModal");
    m.classList.remove("show");
    setTimeout(() => m.classList.add("hidden"), 220);
  }
  function showUnlocks(items){
    const n = items.length;
    const title = n === 1 ? "New collectible!" : n + " new collectibles!";
    fxCelebrate(items);   // T110: FXGL celebration burst over the unlock modal (every reward-gain path routes here)
    openModal(title, items, n > 4);
  }

  // Slide a toast out and remove it after `hold` ms on screen (non-blocking).
  // `onGone` fires once it's fully removed (the queue uses it to free a slot).
  function dismissToast(t, hold, onGone){
    setTimeout(() => {
      t.classList.remove("show");
      t.classList.add("hide");
      setTimeout(() => { t.remove(); if(onGone) onGone(); }, 300);
    }, hold);
  }

  // ---- mid-round toast queue (T64) ----------------------------------------
  // Cap how many toasts show at once so the stack can never grow down over the
  // question; the rest queue and drain (briskly while a backlog exists). The
  // band is also height-bounded in CSS, and a "+N more" chip shows the backlog.
  const TOAST_CAP = 2;
  let toastQ = [], toastShown = 0, toastMoreEl = null;
  function updateToastMore(){
    const box = $("toasts"); if(!box) return;
    if(!toastMoreEl){ toastMoreEl = document.createElement("div"); toastMoreEl.className = "toast-more"; }
    if(toastQ.length > 0){ toastMoreEl.textContent = "+" + toastQ.length + " more"; box.appendChild(toastMoreEl); }
    else if(toastMoreEl.parentNode){ toastMoreEl.remove(); }
  }
  function pumpToasts(){
    while(toastShown < TOAST_CAP && toastQ.length){
      const job = toastQ.shift();
      toastShown++;
      const el = job.build();
      const hold = toastQ.length > 0 ? job.brisk : job.hold;   // backlog → drain faster
      dismissToast(el, hold, () => { toastShown--; pumpToasts(); });
    }
    updateToastMore();
  }
  // Queue a toast: `build()` creates/appends/animates the element and returns it.
  function enqueueToast(build, hold, brisk){ toastQ.push({ build: build, hold: hold, brisk: brisk || hold }); pumpToasts(); }
  // Fire the canvas confetti/spark celebration from a toast's centre, scaled by
  // rarity. Pure celebration: the overlay never intercepts taps and the engine
  // never touches the game clock/input.
  function toastBurst(t, rarity, colors){
    if(!window.FX || !window.FX.celebrate) return;
    const r = t.getBoundingClientRect();
    window.FX.celebrate(r.left + r.width / 2, r.top + r.height / 2, rarity, colors);
  }

  // Lightweight, non-blocking toast shown mid-round when an item is unlocked.
  function showToast(it){
    enqueueToast(() => {
      const pal = C.paletteFor(it.rarity);
      const t = document.createElement("div");
      t.className = "toast r-" + it.rarity;
      t.innerHTML = '<canvas class="pix" width="36" height="36"></canvas>'+
        '<div class="t-txt"><span class="t-tag">Unlocked</span>'+
        '<span class="t-name">'+esc(it.flavour || it.name)+'</span></div>'+
        '<span class="t-plus" style="color:'+pal.accent+'">+1</span>';
      $("toasts").appendChild(t);
      C.drawIcon(t.querySelector("canvas"), it.id, pal);
      sfx("item", it.rarity);   // sparkle arpeggio, scaled by rarity
      requestAnimationFrame(() => { t.classList.add("show"); toastBurst(t, it.rarity, [pal.accent, pal.body]); });
      return t;
    }, 2000, 1100);
  }

  // Celebratory toast when a whole topic becomes newly playable — fired both for
  // chain unlocks (finishing the previous topic) and Part-2 mastery unlocks.
  function showTopicToast(m){
    enqueueToast(() => {
      const part2 = !!m.requires;
      const pal = C.paletteFor("epic");   // topic toasts are epic-tinted
      const t = document.createElement("div");
      t.className = "toast r-epic topic";
      t.innerHTML = '<span class="t-glyph"></span>'+
        '<div class="t-txt"><span class="t-tag">'+(part2 ? "Part 2 unlocked" : "Topic unlocked")+'</span>'+
        '<span class="t-name">'+esc(m.name)+'</span></div>';
      paintGlyph(t.querySelector(".t-glyph"), m, 4);
      $("toasts").appendChild(t);
      sfx("topicUnlock");   // short fanfare
      requestAnimationFrame(() => { t.classList.add("show"); toastBurst(t, "epic", [pal.accent, pal.body]); });
      return t;
    }, 2600, 1500);
  }

  // Topic progress-bar colour, graded by completeness: cool blue (low) → green →
  // warm amber (high), with a distinct mint at a full 100%.
  function topicBarColor(pct, done){
    if(done) return "var(--mint)";
    const p = Math.max(0, Math.min(1, pct));
    return "hsl(" + Math.round(210 - 165 * p) + ",65%,55%)";
  }

  // ---- tabbed inventory (T42) --------------------------------------------
  const INV_TABS = [
    { id:"topics", label:"Topics" },
    { id:"awards", label:"Awards" },
    { id:"events", label:"Events" },
    { id:"loot",   label:"Loot" }
  ];
  let invTab = "topics";
  // drill-earned cats — Events (daily-event rewards) + Loot (Arena) have their own tabs
  const AWARD_CATS = C.categories().filter(n => n !== "Loot" && n !== "Events");

  // One collectible tile: owned shows its icon + flavour name; locked a "?".
  function invCell(it, col){
    const owned = !!col[it.id];
    return '<div class="inv-cell '+(owned ? "owned r-"+it.rarity : "locked")+'" data-id="'+esc(it.id)+'">'+
      (owned ? '<canvas class="pix" width="48" height="48"></canvas><span class="inv-name">'+esc(it.flavour)+'</span>'
             : '<span class="q">?</span>')+'</div>';
  }
  // One progress-bar row for a section (reuses the Topics-tab tp-row styling).
  function invBarRow(label, got, total){
    const isDone = total > 0 && got === total, pct = total ? got / total : 0;
    return '<div class="tp-row'+(isDone ? " done" : "")+'">'+
      '<div class="tp-head"><span class="tp-name">'+esc(label)+'</span>'+
        '<span class="tp-prog">'+got+'/'+total+'</span>'+
        '<span class="tp-state">'+(isDone ? "✓" : "")+'</span></div>'+
      '<div class="tp-bar"><div class="tp-fill" style="width:'+(pct*100).toFixed(1)+
        '%;background:'+topicBarColor(pct, isDone)+'"></div></div></div>';
  }
  // One titled tile group: header (title + owned/total) then the tiles — NO bar
  // (all bars live in the top block now, T48).
  function invTileGroup(title, items, col){
    if(!items.length) return "";
    const got = items.filter(it => col[it.id]).length;
    return '<div class="inv-cat"><h4>'+esc(title)+' <span>'+got+'/'+items.length+'</span></h4>'+
      '<div class="inv-grid">'+items.map(it => invCell(it, col)).join("")+'</div></div>';
  }
  // One consistent tab layout (T48): a single progress-bar block at the very top
  // (one row per section), then the item tiles grouped by the SAME sections below.
  // `sections` = [{ label, items }] in the order both blocks share.
  function invTabHtml(blockTitle, summary, sections, col){
    const bars = sections.map(s =>
      invBarRow(s.label, s.items.filter(it => col[it.id]).length, s.items.length)).join("");
    const block = '<div class="inv-cat"><h4>'+esc(blockTitle)+' <span>'+esc(summary)+'</span></h4>'+
      '<div class="topic-prog">'+bars+'</div></div>';
    const tiles = sections.map(s => invTileGroup(s.label, s.items, col)).join("");
    return block + tiles;
  }
  // Topics tab — bars-at-top per topic, then each topic's tiles below.
  function invTopicsHtml(col){
    const sections = MODES.map(m => ({ label:m.name, items:C.modeItems(m.id) })).filter(s => s.items.length);
    const done = sections.filter(s => s.items.every(it => col[it.id])).length;
    return invTabHtml("Topics", done + "/" + sections.length + " at 100%", sections, col);
  }
  // Awards tab — bars-at-top per drill-earned category, then the tiles below.
  function invAwardsHtml(col){
    const sections = AWARD_CATS.map(n => ({ label:n, items:C.CATALOG.filter(it => it.cat === n) }))
      .filter(s => s.items.length);
    let got = 0, total = 0;
    sections.forEach(s => { got += s.items.filter(it => col[it.id]).length; total += s.items.length; });
    return invTabHtml("Awards", got + "/" + total, sections, col);
  }
  // Loot tab — bars-at-top per themed tier-region, then the tiles below.
  function invLootHtml(col){
    const E = window.Enemies, loot = C.CATALOG.filter(it => it.cat === "Loot");
    const rg = t => (E && E.tierRegion) ? E.tierRegion(t) : Math.floor((t - 1) / 12);
    const byRegion = {};
    loot.forEach(it => { const r = rg(it.tier || 1); (byRegion[r] = byRegion[r] || []).push(it); });
    const sections = Object.keys(byRegion).map(Number).sort((a, b) => a - b).map(r => {
      const label = (E && E.regionLabel) ? E.regionLabel(r) : ("Region " + (r + 1));
      const tiers = byRegion[r].map(it => it.tier), lo = Math.min.apply(null, tiers), hi = Math.max.apply(null, tiers);
      return { label: label + " · tiers " + lo + "–" + hi, items: byRegion[r] };
    });
    const got = sections.reduce((a, s) => a + s.items.filter(it => col[it.id]).length, 0);
    return invTabHtml("Loot", got + "/" + loot.length, sections, col);
  }

  // Events tab — the 14 daily-event rewards, ordered by the roster cycle so the
  // tab reads as the calendar; owned/locked just like every other category.
  function invEventsHtml(col){
    const Ev = window.Events, evItems = C.CATALOG.filter(it => it.cat === "Events");
    // 3 tiers per event (participation · well · ace), in roster then tier order (T92)
    let ordered = evItems;
    if(Ev && Ev.roster){
      ordered = [];
      Ev.roster().forEach(e => ["", ":well", ":ace"].forEach(suf => { const it = C.byId("event:" + e.id + suf); if(it) ordered.push(it); }));
    }
    const got = ordered.filter(it => col[it.id]).length;
    // "Live today" play strip — the functional entry into today's event gauntlet
    // (the prominent home banner is T81). Playable only while live, by definition.
    let strip = "";
    const live = (Ev && Ev.today) ? Ev.today() : null;
    if(live){
      const owned = !!col["event:" + live.id];
      strip = '<div class="event-live"><div class="el-info">'+
        '<span class="el-tag">Live today'+(owned ? ' · reward earned' : '')+'</span>'+
        '<span class="el-name">'+esc(live.name)+'</span>'+
        '<span class="el-blurb">'+esc(live.blurb)+'</span></div>'+
        '<button class="btn el-play" data-event="'+esc(live.id)+'">'+(owned ? 'Play again' : 'Play')+'</button></div>';
    }
    return strip + invTabHtml("Events", got + "/" + ordered.length, [{ label:"Daily Events", items:ordered }], col);
  }

  function drawInvCanvases(){
    $("invList").querySelectorAll(".inv-cell.owned canvas").forEach(cv => {
      const it = C.byId(cv.parentElement.dataset.id);
      if(it) C.drawIcon(cv, it.id, C.paletteFor(it.rarity));
    });
  }
  function renderInvTabs(){
    $("invTabs").innerHTML = INV_TABS.map(t =>
      '<button class="inv-tab'+(t.id === invTab ? " active" : "")+'" data-tab="'+esc(t.id)+'">'+esc(t.label)+'</button>').join("");
  }
  // Lazy render: only the ACTIVE tab's tiles go into the DOM (the 250 Loot tiles
  // cost nothing until the Loot tab is opened).
  function renderInvTab(){
    const col = loadCollected();
    $("invList").innerHTML = invTab === "loot"   ? invLootHtml(col)
                           : invTab === "awards" ? invAwardsHtml(col)
                           : invTab === "events" ? invEventsHtml(col)
                           :                       invTopicsHtml(col);
    drawInvCanvases();
    $("invList").scrollTop = 0;
    updateInvTop();
  }
  // jump-to-top: reveal the floating control once the list is scrolled down.
  function updateInvTop(){
    const btn = $("invTop"); if(!btn) return;
    btn.classList.toggle("show", $("invList").scrollTop > 200);
  }
  function renderInventory(){
    const col = loadCollected();
    $("invMeta").textContent = C.CATALOG.filter(it => col[it.id]).length + " / " + C.CATALOG.length;
    invTab = "topics";          // default to the first tab on each open
    renderInvTabs();
    renderInvTab();
  }

  // ---- heroes screen ------------------------------------------------------
  const HERO_PAL = {
    Brawn:   { body:"#d05a4a", accent:"#ff8a6e", outline:"#3a1410" },
    Arcane:  { body:"#8a5cf6", accent:"#cda9ff", outline:"#1f1340" },
    Cunning: { body:"#3fce8c", accent:"#8ef0bf", outline:"#0f3324" }
  };
  function statChip(k, v){ return '<span class="hero-stat"><b>'+v+'</b>'+k+'</span>'; }
  function heroCard(h, col){
    const Hs = window.Heroes;
    if(!Hs.isHeroUnlocked(h, col)){
      return '<div class="hero-card locked t-'+h.type.toLowerCase()+'">'+
        '<div class="hero-port"><span class="q">?</span></div>'+
        '<div class="hero-info"><div class="hero-name"><span class="hn"><i class="typedot"></i>'+esc(h.name)+'</span></div>'+
        '<div class="hero-hint">🔒 '+esc(h.unlockHint)+'</div></div></div>';
    }
    const st = Hs.effectiveStats(h, col), rating = Math.round(Hs.rating(h, col));
    const owned = C.CATALOG.filter(it => col[it.id] && it.boost && it.boost.hero === h.id).length;
    // Compact list card — full boost list lives in the tappable detail view (T67).
    return '<div class="hero-card unlocked t-'+h.type.toLowerCase()+'" data-hero="'+esc(h.id)+'">'+
      '<div class="hero-port"><canvas class="pix" width="48" height="48"></canvas></div>'+
      '<div class="hero-info">'+
        '<div class="hero-name"><span class="hn"><i class="typedot"></i>'+esc(h.name)+'</span><span class="hero-rating">★ '+rating+'</span></div>'+
        '<div class="hero-stats">'+statChip("PWR",st.power)+statChip("GRD",st.guard)+statChip("SPD",st.speed)+statChip("FOC",st.focus)+'</div>'+
        '<div class="hero-items">'+(owned ? '<span class="hero-il">Boosted by '+owned+'</span> <span class="hero-tap">tap for details ›</span>'
                                          : '<span class="hero-none">No items yet — collect to boost.</span>')+'</div>'+
      '</div></div>';
  }
  // Hero detail (T67): big portrait + full stats + the COMPLETE owned boost list
  // (scrollable, untruncated) + an X/Y collected summary. Lazy: built on open.
  const STAT_ABBR = { power:"PWR", guard:"GRD", speed:"SPD", focus:"FOC" };
  function renderHeroDetail(id){
    const Hs = window.Heroes; if(!Hs) return false;
    const h = Hs.byId(id), col = loadCollected();
    if(!h || !Hs.isHeroUnlocked(h, col)) return false;   // only unlocked heroes have a detail
    const st = Hs.effectiveStats(h, col), rating = Math.round(Hs.rating(h, col));
    const all = C.CATALOG.filter(it => it.boost && it.boost.hero === h.id);
    const owned = all.filter(it => col[it.id]);
    $("hdHead").className = "hd-head t-" + h.type.toLowerCase();
    $("hdName").innerHTML = '<span class="hn"><i class="typedot"></i>'+esc(h.name)+'</span>'+
      '<span class="hd-type">'+esc(h.type)+'</span><span class="hero-rating">★ '+rating+'</span>';
    $("hdStats").innerHTML = statChip("PWR",st.power)+statChip("GRD",st.guard)+statChip("SPD",st.speed)+statChip("FOC",st.focus);
    $("hdProg").textContent = owned.length + " / " + all.length + " boosts collected";
    $("hdList").innerHTML = owned.length
      ? owned.map(it => '<div class="hd-boost r-'+it.rarity+'"><i class="row-sq"></i><span class="hb-name">'+esc(it.flavour || it.name)+'</span>'+
          '<span class="hb-amt">+'+it.boost.amount+' '+(STAT_ABBR[it.boost.stat] || it.boost.stat)+'</span></div>').join("")
      : '<div class="hero-none">No boosts yet — collect items that boost '+esc(h.name)+'.</div>';
    $("hdList").scrollTop = 0;
    C.drawIcon($("hdPort"), "hero:"+h.id, HERO_PAL[h.type], "familiar");
    return true;
  }
  function renderHeroes(){
    const Hs = window.Heroes; if(!Hs){ $("heroList").innerHTML = ""; return; }
    const col = loadCollected();
    const unlocked = Hs.HEROES.filter(h => Hs.isHeroUnlocked(h, col)).length;
    $("heroMeta").textContent = unlocked + " / " + Hs.HEROES.length;
    $("heroList").innerHTML = ["Brawn","Arcane","Cunning"].map(tp => {
      const hs = Hs.HEROES.filter(h => h.type === tp);
      return '<div class="hero-group"><h4>'+esc(tp)+'</h4>'+hs.map(h => heroCard(h, col)).join("")+'</div>';
    }).join("");
    $("heroList").querySelectorAll(".hero-card.unlocked canvas").forEach(cv => {
      const card = cv.closest(".hero-card"); const h = card && Hs.byId(card.dataset.hero);
      if(h) C.drawIcon(cv, "hero:"+h.id, HERO_PAL[h.type], "familiar");   // "hero:" id → restored creature-blob portrait (T51)
    });
  }

  // ---- arena (T24, reworked T47) -----------------------------------------
  // The Arena is a PURE STAT CHECK — no maths round. You win iff your hero's
  // effective rating × type-matchup clears the tier's defence
  // (Enemies.statBattle over the REAL collected set). Drilling the topics is
  // where buffs are earned; the Arena is the payoff. Clearing it still demands a
  // near-complete collection (the win == the old max-perf win, T23/T43).
  let arenaHero = null, lastBattle = null, practiceCtx = null, arenaMapOpen = false, eventCtx = null, introCtx = false;

  // ---- per-question best-time store (halves.qbest) for the Practice view -----
  let memQbest = null;
  function loadQbest(){
    if(memQbest) return memQbest;
    let o; try{ o = JSON.parse(localStorage.getItem("halves.qbest")); }catch(e){ o = null; }
    memQbest = (o && typeof o === "object") ? o : {};
    return memQbest;
  }
  function saveQbest(o){ memQbest = o; try{ localStorage.setItem("halves.qbest", JSON.stringify(o)); }catch(e){} }
  // Pure: fold a round's solved per-question times into qbest, keeping the min.
  function recordQbest(qbest, modeId, roundTimes){
    const out = Object.assign({}, qbest);
    const mb = Object.assign({}, out[modeId] || {});
    (roundTimes || []).forEach(t => {
      if(t.miss === 0){ const cur = mb[t.p]; if(cur == null || t.t < cur) mb[t.p] = t.t; }
    });
    out[modeId] = mb;
    return out;
  }
  // Heat-map colour for a question's best solve time (null = never solved → grey).
  function qTileColor(t){
    if(t == null) return null;
    if(t < 1.5) return "#f0ad3c";   // Spark-fast → gold
    if(t < 2.2) return "#4ade9a";   // mint
    if(t < 3.5) return "#3f97d8";   // blue
    return "#f5b544";               // solved but work on speed → amber
  }
  function renderPractice(modeId){
    const m = byId(modeId); if(!m) return;
    const qs = m.build().slice().sort((a, b) =>
      String(a.p).localeCompare(String(b.p), undefined, { numeric: true }));
    const qb = loadQbest()[modeId] || {};
    const solved = qs.filter(q => qb[q.p] != null).length;
    $("practiceTitle").innerHTML = '<span class="g-glyph"></span> ' + esc(m.name);
    paintGlyph($("practiceTitle").querySelector(".g-glyph"), m, 4);
    $("practiceMeta").textContent = solved + " / " + qs.length + " solved";
    $("practiceGrid").innerHTML = qs.map(q => {
      const t = qb[q.p], col = qTileColor(t);
      return '<button class="pq-tile' + (t == null ? " unsolved" : "") + '"' +
        (col ? ' style="border-color:' + col + ';background:' + col + '22"' : '') +
        ' data-mode="' + esc(modeId) + '" data-prompt="' + esc(q.p) + '">' +
        '<span class="pq-p">' + esc(q.p) + '</span>' +
        '<span class="pq-t">' + (t != null ? fmt(t) + 's' : '—') + '</span></button>';
    }).join("");
    // Surface the topic's overall guide beneath the list (documentation; T49).
    const gw = $("practiceGuide"), g = window.Guides && window.Guides.get(modeId);
    if(gw){
      gw.innerHTML = g
        ? '<p class="g-intro">' + esc(g.intro) + '</p>' +
          '<ul class="g-tips">' + g.tips.map(t => '<li>' + esc(t) + '</li>').join("") + '</ul>' +
          '<div class="g-eg"><span class="g-eg-tag">Try this</span>' + esc(g.example) + '</div>'
        : "";
    }
  }
  function openPractice(){ if(!isUnlocked(mode)) return; renderPractice(mode.id); show("practice"); }

  function matchupLabel(mu){
    return mu > 1 ? '<span class="mu adv">▲ Advantage ×1.5</span>'
         : mu < 1 ? '<span class="mu weak">▼ Weak ×0.6</span>'
         :          '<span class="mu neu">● Neutral ×1.0</span>';
  }
  function renderArena(){
    const E = window.Enemies, Hs = window.Heroes;
    if(!E || !Hs){ $("arenaBody").innerHTML = ""; return; }
    const col = loadCollected();
    const tier = E.currentTier(col);
    const cleared = !!col["tier:" + E.TIER_COUNT];
    $("arenaMeta").textContent = cleared ? "Cleared!" : ("Tier " + tier.n + " / " + E.TIER_COUNT);

    const heroes = Hs.HEROES.filter(h => Hs.isHeroUnlocked(h, col));
    if(arenaHero && !heroes.some(h => h.id === arenaHero)) arenaHero = null;

    let html = "";
    if(lastBattle){
      const r = lastBattle;
      html += '<div class="arena-result '+(r.won ? "win" : "loss")+'">'+
        '<div class="ar-port-row">'+
          (r.heroId ? '<canvas class="pix ar-port" width="48" height="48" data-hero="'+esc(r.heroId)+'" data-type="'+esc(r.heroType||"Brawn")+'"></canvas>' : "")+
          '<span class="ar-vs">vs</span>'+
          '<canvas class="pix ar-enemy" width="48" height="48" data-tier="'+(r.tierN||1)+'" data-tname="'+esc(r.tierName)+'" data-ttype="'+esc(r.tierType||"Brawn")+'"></canvas>'+
        '</div>'+
        '<div class="ar-title">'+(r.won ? "Victory!" : "Defeated")+'</div>'+
        '<div class="ar-sub">'+esc(r.heroName)+' vs '+esc(r.tierName)+'</div>'+
        '<div class="ar-maths">'+Math.round(r.res.rating)+' ★ × '+r.res.matchup+
          ' = power <b>'+r.res.power+'</b> vs DEF <b>'+r.res.def+'</b></div>'+
        (r.won ? "" : '<div class="ar-hint">Not strong enough — collect more buffs (drill the topics) or pick the advantage-type hero.</div>')+
        (r.regionCleared ? '<div class="ar-region-clear">🏁 Region conquered! Next: '+esc(r.regionCleared)+'</div>' : '')+
        (r.goldEarn > 0 ? '<div class="ar-gold">🪙 +'+esc(fmtGold(r.goldEarn))+' '+esc(GOLD_LABEL)+'</div>' : '')+
        (r.newHeroes.length ? '<div class="ar-new">★ New hero: '+r.newHeroes.map(esc).join(", ")+'!</div>' : '')+
        '</div>';
    }
    // ---- wayfinding helpers (T68) — all from the Enemies region API ----
    const RS = E.REGION_SIZE || 12, REGIONS = Math.ceil(E.TIER_COUNT / RS);
    const bossTierOf = r => Math.min((r + 1) * RS, E.TIER_COUNT);
    const bossNameOf = r => E.byTier(bossTierOf(r)).name;
    const conquered = r => !!col["tier:" + bossTierOf(r)];
    // a journey-map toggle is available whenever you're still climbing
    html += '<button class="arena-map-btn" id="arenaMapBtn">'+(arenaMapOpen ? "▾ Hide journey map" : "🗺 Journey map")+'</button>';
    if(arenaMapOpen){
      html += '<div class="arena-map">'+Array.from({length:REGIONS}, (_, r) => {
        const isCur = !cleared && r === E.tierRegion(tier.n), conq = conquered(r);
        const st = conq ? "done" : isCur ? "cur" : "locked";
        const tag = conq ? "✓ conquered" : isCur ? "you are here" : "locked";
        return '<div class="map-row '+st+'"><i class="row-sq"></i><span class="map-name">'+esc(E.regionLabel(r))+'</span>'+
          '<span class="map-boss">⚔ '+esc(bossNameOf(r))+'</span><span class="map-tag">'+tag+'</span></div>';
      }).join("")+'</div>';
    }
    if(cleared){
      html += '<div class="arena-tier done"><div class="at-name">⭐ Arena cleared — you defeated The Void Sovereign!</div>'+
        '<div class="at-region">Every tier has fallen. Champion of the realm.</div></div>';
    } else {
      const reg = E.tierRegion(tier.n), posInReg = ((tier.n - 1) % RS) + 1;
      const isBossNow = posInReg === RS, bossNext = posInReg === RS - 1;
      const pips = Array.from({length:RS}, (_, i) => {
        const at = reg * RS + i + 1, isB = (i + 1) === RS;
        const cl = col["tier:" + at] ? "done" : (at === tier.n ? "cur" : "");
        return '<span class="at-pip '+(isB ? "boss " : "")+cl+'" title="Tier '+at+'"></span>';
      }).join("");
      html += '<div class="arena-tier scenic t-'+tier.type.toLowerCase()+'">'+
        '<canvas class="pix at-scene" width="140" height="56" data-region="'+reg+'"></canvas>'+
        '<canvas class="pix at-enemy" width="64" height="64" data-tier="'+tier.n+'" data-tname="'+esc(tier.name)+'" data-ttype="'+esc(tier.type)+'"></canvas>'+
        '<div class="at-region">'+esc(E.regionLabel(reg))+' · region '+(reg+1)+'/'+REGIONS+' · tier '+posInReg+'/'+RS+'</div>'+
        '<div class="at-pips">'+pips+'</div>'+
        (isBossNow ? '<div class="at-boss now">⚔ Region boss — defeat '+esc(tier.name)+' to conquer '+esc(E.regionLabel(reg))+'</div>'
         : bossNext ? '<div class="at-boss next">⚔ Boss next: '+esc(bossNameOf(reg))+'</div>' : '')+
        '<div class="at-name"><i class="typedot"></i>'+esc(tier.name)+'</div>'+
        '<div class="at-stats"><span class="at-type">'+esc(tier.type)+'</span><span class="at-def">DEF '+tier.def+'</span></div></div>';
      if(!heroes.length){
        html += '<div class="arena-empty">Finish a drill round to unlock your first hero, then return to fight.</div>';
      } else {
        html += '<div class="arena-pick">Choose your champion</div><div class="arena-heroes">';
        heroes.forEach(h => {
          const rating = Math.round(Hs.rating(h, col)), mu = E.matchup(h.type, tier.type);
          const power = Math.round(Hs.rating(h, col) * mu), wins = power >= tier.def;
          html += '<div class="arena-hero t-'+h.type.toLowerCase()+(arenaHero === h.id ? " sel" : "")+'" data-hero="'+esc(h.id)+'">'+
            '<canvas class="pix ah-port" width="40" height="40"></canvas>'+
            '<div class="ah-body"><div class="ah-top"><span class="ah-name"><i class="typedot"></i>'+esc(h.name)+'</span>'+
              '<span class="ah-rating">★ '+rating+'</span></div>'+
            '<div class="ah-mu">'+matchupLabel(mu)+
              '<span class="ah-power '+(wins ? "win" : "loss")+'">⚔ '+power+' vs '+tier.def+'</span></div></div></div>';
        });
        html += '</div>';
      }
    }
    $("arenaBody").innerHTML = html;
    // hero portraits on the pick cards + the result header (same draw path as the
    // Heroes screen — "hero:" id → the restored creature-blob, T51).
    $("arenaBody").querySelectorAll(".arena-hero canvas").forEach(cv => {
      const card = cv.closest(".arena-hero"), h = card && Hs.byId(card.dataset.hero);
      if(h) C.drawIcon(cv, "hero:"+h.id, HERO_PAL[h.type], "familiar");
    });
    const rp = $("arenaBody").querySelector(".ar-port");
    if(rp && rp.dataset.hero) C.drawIcon(rp, "hero:"+rp.dataset.hero, HERO_PAL[rp.dataset.type] || HERO_PAL.Brawn, "familiar");
    // enemy sprites (T52) — current-tier card + the result header's foe (static)
    if(window.Monsters) $("arenaBody").querySelectorAll(".at-enemy, .ar-enemy").forEach(cv => {
      window.Monsters.draw(cv, { n: +cv.dataset.tier, name: cv.dataset.tname, type: cv.dataset.ttype });
    });
    // region scenery (T53) — drawn once behind the tier card (static, no RAF)
    if(window.Scenery){ const sc = $("arenaBody").querySelector(".at-scene"); if(sc) window.Scenery.draw(sc, +sc.dataset.region); }
    $("arenaFight").disabled = cleared || !arenaHero || !heroes.length;
    $("arenaFight").textContent = cleared ? "Cleared" : (arenaHero ? "Fight!" : "Pick a hero");
  }

  // Fight resolves INSTANTLY from hero stats (T47) — no maths round.
  function startBattle(){
    const E = window.Enemies, Hs = window.Heroes, col = loadCollected();
    if(!E || col["tier:" + E.TIER_COUNT]) return;                 // cleared
    if(!arenaHero || !Hs.isHeroUnlocked(arenaHero, col)) return;
    const tier = E.currentTier(col);
    const res = E.statBattle(arenaHero, tier, col);
    finishBattle(arenaHero, tier, res);
  }

  // Grant any hero/arena milestones now satisfied (unlock-all-heroes + tier
  // defeats), writing them into `col`; returns the newly-earned items.
  function grantMeta(col){
    const Hs = window.Heroes;
    const heroesU = Hs ? Hs.HEROES.filter(h => Hs.isHeroUnlocked(h, col)).length : 0;
    const total = Hs ? Hs.HEROES.length : 12;
    const meta = C.evaluateMeta(heroesU, total, id => !!col[id]);
    meta.forEach(it => col[it.id] = { ts: Date.now() });
    return meta;
  }

  // Apply a resolved stat-check: grant the tier + its loot on a win, award gold,
  // and surface the result. `res` comes from Enemies.statBattle (T47 — no perf).
  function finishBattle(heroId, tier, res){
    const E = window.Enemies, Hs = window.Heroes;
    const col = loadCollected();
    const heroName = (C.HERO_NAMES && C.HERO_NAMES[heroId]) || heroId;
    const goldBefore = loadGold();
    const RS = E.REGION_SIZE || 12;
    let earn = 0, loot = [], newHeroes = [], regionCleared = null;
    if(res.win){
      // a region is conquered when its boss (the region's last tier) falls (T68)
      if(tier.n % RS === 0 && tier.n < E.TIER_COUNT) regionCleared = E.regionLabel(E.tierRegion(tier.n + 1));
      const before = Hs.HEROES.filter(h => Hs.isHeroUnlocked(h, col)).map(h => h.id);
      col["tier:" + tier.n] = { ts: Date.now() };
      E.tierLoot(tier.n).forEach(id => { if(!col[id]) col[id] = { ts: Date.now() }; });
      const more = C.evaluateCollector(Object.keys(col).length, id => !!col[id]);
      more.forEach(it => col[it.id] = { ts: Date.now() });
      const meta = grantMeta(col);   // tier-defeat + unlock-all-heroes milestones
      earn = tierGold(tier.n, goldMult(col));   // the Arena payoff — deeper = more
      loot = E.tierLoot(tier.n).map(id => C.byId(id)).filter(Boolean).concat(more).concat(meta);
      newHeroes = Hs.HEROES.filter(h => Hs.isHeroUnlocked(h, col) && before.indexOf(h.id) < 0).map(h => h.name);
      sfx("topic100");
    } else {
      sfx("roundComplete");
    }
    const wealth = earnGold(earn, col);               // grants any wealth milestones into col
    saveCollected(col);
    loot = loot.concat(wealth);
    lastBattle = { won: res.win, res: res, heroName: heroName, heroId: heroId, heroType: (Hs.byId(heroId)||{}).type, tierName: tier.name, tierN: tier.n, tierType: tier.type, loot: loot, newHeroes: newHeroes, regionCleared: regionCleared, goldBefore: goldBefore, goldAfter: loadGold(), goldEarn: earn };
    arenaHero = null;
    renderArena();
    const ab = $("arenaBody"); if(ab) ab.scrollTop = 0;   // T65: show the result + tier, not the hero list
    show("arena");
    if(res.win){ fxCelebrateWin(tier.n); sfx("wub"); }   // T112 victory burst + T115 synth "wub" win-sting
    if(loot.length) setTimeout(() => showUnlocks(loot), 650);
  }

  // ---- game state ---------------------------------------------------------
  let order=[], idx=0, input="", mistakes=0, qMiss=0, combo=0,
      startTime=0, qStart=0, times=[], raf=0, locked=false, roundGold=0;

  // Shared per-round setup (order is set by the caller).
  function beginRound(){
    idx=0; mistakes=0; times=[]; combo=0; roundGold=0;
    startTime = performance.now();
    show("game");
    loop();
    nextQuestion();
  }
  function start(){
    if(!isUnlocked(mode)) return;   // locked topics aren't playable
    practiceCtx = null; eventCtx = null; introCtx = false;   // a normal round is none of these
    order = mode.build();
    elEyebrow.innerHTML = mode.eyebrow;
    sfx("roundStart");
    beginRound();
  }
  // ---- first-run onboarding intro (T86): ONE trivially-easy question. Solving it
  // grants the first reward and unlocks the Inventory (the first ungated feature).
  function startIntro(){
    const m = byId("halves") || MODES[0];
    mode = m; introCtx = true; practiceCtx = null; eventCtx = null;
    order = [{ p:"12", a:6, _mode:m }];   // "half of 12" — numeric, non-negative, numpad-safe; in the halves set
    elEyebrow.innerHTML = m.eyebrow;
    sfx("roundStart");
    beginRound();
  }
  function finishIntro(){
    cancelAnimationFrame(raf);
    introCtx = false;
    // complete onboarding step 1: the reward (this question's Beat/Spark) was
    // granted in correct(); now flag the intro done + ungate the Inventory and
    // queue its one-time highlight. Skipping still completes it (never trap).
    unlocked.introDone = 1; saveUnlocked(unlocked);
    if(unlockFeature("inventory")) queueHighlight("inventory");
    location.hash = "#/"; applyRoute();
  }
  // ---- Practice / Review (T32): attempt one question at a time, self-paced but
  // still timed; grants ONLY that question's Beat/Spark + updates qbest.
  function startPractice(modeId, q){
    const m = byId(modeId); if(!m || !isUnlocked(m) || !q) return;
    mode = m; practiceCtx = { modeId: modeId, prompt: q.p }; eventCtx = null;
    order = [{ p:q.p, a:q.a }];
    sfx("roundStart");
    beginRound();
  }
  // ---- Events (T79): the cross-topic gauntlet. Reuses the round engine; only
  // playable while the event is LIVE today; completing it grants the event's
  // `event:<id>` reward (idempotent / own-once). The deterministic question set
  // (same every play + recurrence) comes from Events.buildGauntlet.
  function startEvent(eventId){
    const Ev = window.Events;
    if(!Ev || !Ev.isLive(eventId)) return false;   // live-window only
    const ev = Ev.byId(eventId); if(!ev) return false;
    const set = Ev.buildGauntlet(eventId, MODES);
    if(!set.length) return false;
    practiceCtx = null;
    eventCtx = { id: eventId, event: ev };
    order = set.map(q => ({ p:q.p, a:q.a, _mode: byId(q.topic) || mode }));
    elEyebrow.innerHTML = 'solve <b>↓</b>';
    sfx("roundStart");
    beginRound();
    return true;
  }
  // The reward-tier ids earned by a run (T92), skip-proof. Participation = completion;
  // `well` ≥ 70% clean first-try; `ace` = flawless (every question clean). `score` =
  // clean answers, `total` = questions; skips never enter `score` (they're not in `times`).
  const EVENT_WELL_FRAC = 0.7;
  function eventTiersEarned(eid, score, total){
    const frac = total ? score / total : 0, ids = ["event:" + eid];   // participation
    if(frac >= EVENT_WELL_FRAC) ids.push("event:" + eid + ":well");
    if(total > 0 && score === total) ids.push("event:" + eid + ":ace");
    return ids;
  }
  function finishEvent(){
    cancelAnimationFrame(raf);
    const ev = eventCtx.event, eid = eventCtx.id; eventCtx = null;
    const total = (performance.now()-startTime)/1000;
    const score = times.filter(t => t.miss === 0).length;
    $("resMode").textContent = ev.name;
    $("resTime").innerHTML = fmt(total)+'<small>s</small>';
    const acc = order.length ? Math.round(score/order.length*100) : 100;
    const accEl = $("resAcc"); accEl.textContent = acc+"%"; accEl.classList.toggle("clean", mistakes === 0);
    $("resMiss").textContent = mistakes;
    const slow = times.slice().sort((a,b)=>b.t-a.t).slice(0,5);
    $("slowList").innerHTML = slow.map(s =>
      '<div class="slow-item"><span class="q">'+esc(s.p)+'<span class="h"> → </span>'+esc(s.h)+
      (s.miss ? '<span class="miss">'+s.miss+'×</span>' : '')+'</span><span class="t">'+fmt(s.t)+'s</span></div>').join("");
    renderResultRank(C.rankIndex(score, order.length, total));

    // Best-attempt board (T80): keep the better attempt, keyed by event id so it
    // persists across the 14-day recurrence (beatable next time it comes around).
    recordEventBest(eid, { score:score, time:total, total:order.length, ts:Date.now() });

    // Grant every reward TIER earned this run (T92) — only while still live, and
    // idempotent per tier (own-once). Participation = completion; the higher tiers
    // are gated on the SKIP-PROOF clean-score fraction (skips never enter `times`,
    // so skipping lowers it and can't reach them). Improving on a replay / the
    // 14-day recurrence earns the higher tiers without removing earned ones.
    const collected = loadCollected();
    const earned = [];
    if(window.Events.isLive(eid)){
      eventTiersEarned(eid, score, order.length).forEach(id => {
        if(collected[id]) return;
        const it = C.byId(id);
        if(it){ collected[id] = { ts: Date.now() }; earned.push(it); }
      });
    }
    // collection-count + hero/arena milestones the new reward may trigger
    const has = id => !!collected[id];
    const more = C.evaluateCollector(Object.keys(collected).length, has);
    more.forEach(it => collected[it.id] = { ts: Date.now() });
    const meta = grantMeta(collected);
    saveCollected(collected);
    const all = earned.concat(more).concat(meta);

    sfx(all.length ? "topicUnlock" : "roundComplete");
    show("results");
    renderTopicInfo();
    $("resGold").innerHTML = "";   // events pay no Gold — the reward is the buff
    if(all.length) setTimeout(() => showUnlocks(all), 650);
  }

  function finishPractice(){
    const pc = practiceCtx; practiceCtx = null;
    // record the per-question best time (Beat/Spark already granted in correct()).
    saveQbest(recordQbest(loadQbest(), pc.modeId, times));
    renderPractice(pc.modeId);
    show("practice");
  }

  function loop(){
    elClock.textContent = fmt((performance.now()-startTime)/1000)+"s";
    raf = requestAnimationFrame(loop);
  }

  function nextQuestion(){
    if(idx >= order.length){ finish(); return; }
    locked=false; input=""; qMiss=0;
    const it = order[idx];
    const qm = it._mode || mode;   // battle rounds tag each question's source mode
    elStage.classList.remove("wrong");
    elPrompt.style.color=""; elPrompt.classList.remove("split");
    elGhost.classList.remove("go");
    elEyebrow.innerHTML = qm.eyebrow;
    elPrompt.classList.toggle("expr", !!qm.expr);
    elGhost.classList.toggle("expr", !!qm.expr);
    elPrompt.textContent = it.p;
    elGhost.textContent  = numStr(it.a);
    elCounter.textContent = (idx+1)+" / "+order.length;
    elProgress.style.width = (idx/order.length*100)+"%";
    // "How to approach this" method note, hidden behind a tap-to-reveal toggle
    // (reset to hidden on every new question). Shown in BOTH normal drills and
    // Practice (T63); the clock keeps running while it's open, so revealing it
    // costs time and never changes scoring.
    const note = $("practiceNote"), toggle = $("practiceHintToggle");
    const hint = (window.Guides && window.Guides.explain) ? window.Guides.explain(qm.id, it) : "";
    if(hint){
      if(note){ note.textContent = hint; note.classList.add("hidden"); }   // collapsed by default
      if(toggle){ toggle.classList.remove("hidden"); toggle.textContent = "How to approach this"; }
    } else {
      if(note) note.classList.add("hidden");
      if(toggle) toggle.classList.add("hidden");
    }
    fitText(elPrompt); fitText(elGhost);
    renderInput();
    qStart = performance.now();
  }

  // Shrink the prompt/answer font until it fits the stage width, so wide
  // expressions like "12 × 12" never overflow on narrow screens.
  function fitText(el){
    const cap = Math.min(el.classList.contains("expr") ? 84 : 112, window.innerWidth*0.26);
    el.style.fontSize = cap + "px";
    const avail = el.parentElement.clientWidth - 12;
    let size = cap, guard = 0;
    while(el.scrollWidth > avail && size > 22 && guard < 40){ size -= 4; el.style.fontSize = size+"px"; guard++; }
  }

  function renderInput(){
    if(input === ""){
      elAnswer.classList.add("empty");
      elAnswer.innerHTML = '<span class="placeholder">— —</span>';
    }else{
      elAnswer.classList.remove("empty");
      elAnswer.innerHTML = esc(input)+'<span class="caret"></span>';
    }
  }

  function press(k){
    if(locked) return;
    if(k === "back"){ input = input.slice(0,-1); renderInput(); return; }
    if(k === "skip"){ skip(); return; }
    if(k === "."){
      if(input.includes(".")) return;
      input = (input === "") ? "0." : input + ".";
      renderInput();
      return;
    }
    if(input.replace(".","").length >= 5) return;   // length guard
    input += k; renderInput();
    checkAuto();
  }

  function currentAnswer(){ return order[idx].a; }

  function checkAuto(){
    const v = parseFloat(input);
    if(!isNaN(v) && v === currentAnswer()) correct();
  }

  // Skip reveals the answer, counts against your score, and moves on.
  function skip(){
    if(locked) return;
    locked = true;
    mistakes++; combo = 0;
    sfx("skip");
    elStage.classList.add("wrong");
    elAnswer.classList.remove("empty");
    elAnswer.innerHTML = '<span class="skipans">= '+esc(numStr(currentAnswer()))+'</span>';
    elProgress.style.width = ((idx+1)/order.length*100)+"%";
    setTimeout(() => { idx++; nextQuestion(); }, 750);
  }

  function correct(){
    locked = true;
    const dt = (performance.now()-qStart)/1000;
    const it = order[idx];
    times.push({ p:it.p, h:numStr(it.a), t:dt, miss:qMiss });
    combo++; sfx("correct", combo);   // bright blip; pitch rises with the streak

    // live, non-blocking unlocks for nailing this question (first time / fast)
    const col = loadCollected();
    // Goblin Gold: per clean question = (2 + speed bonus) × combo streak × global
    // multiplier (a skip earns 0; Practice attempts earn no Gold — training only).
    if(!practiceCtx && !eventCtx){
      const qm = it._mode || mode;
      const target = (typeof qm.masterSecs === "number") ? qm.masterSecs : 4;
      roundGold += questionGold(target, dt, combo, goldMult(col));
    }
    // Per-question Beat/Spark grants apply to normal drills + Practice, but NOT
    // events (the event's reward is its own buff; topic items aren't earned here).
    if(!eventCtx){
      const fresh = C.evaluateQuestion(mode.id, it.p, dt, id => !!col[id]);
      if(fresh.length){
        fresh.forEach(c => col[c.id] = { ts: Date.now() });
        saveCollected(col);
        fresh.forEach(showToast);
      }
    }

    elPrompt.classList.add("split");
    elGhost.classList.add("go");
    elProgress.style.width = ((idx+1)/order.length*100)+"%";
    setTimeout(()=>{ idx++; nextQuestion(); },300);
  }

  // ---- results -----------------------------------------------------------
  function finish(){
    cancelAnimationFrame(raf);
    if(introCtx){ finishIntro(); return; }          // first-run intro → unlock the Inventory
    if(practiceCtx){ finishPractice(); return; }   // Practice attempt → grade just that question
    if(eventCtx){ finishEvent(); return; }          // Event gauntlet → grant the event reward
    const total = (performance.now()-startTime)/1000;
    const score = times.filter(t => t.miss === 0).length;   // clean first-try answers

    $("resMode").textContent = mode.name;
    $("resTime").innerHTML = fmt(total)+'<small>s</small>';
    const acc = order.length ? Math.round(score/order.length*100) : 100;
    const accEl = $("resAcc");
    accEl.textContent = acc+"%";
    accEl.classList.toggle("clean", mistakes === 0);
    $("resMiss").textContent = mistakes;

    const slow = times.slice().sort((a,b)=>b.t-a.t).slice(0,5);
    $("slowList").innerHTML = slow.map(s =>
      '<div class="slow-item"><span class="q">'+esc(s.p)+
      '<span class="h"> → </span>'+esc(s.h)+
      (s.miss ? '<span class="miss">'+s.miss+'×</span>' : '')+
      '</span><span class="t">'+fmt(s.t)+'s</span></div>'
    ).join("");

    // ----- rank + collectibles -----
    const rankIdx = C.rankIndex(score, order.length, total);
    renderResultRank(rankIdx);

    const stats = loadStats();
    stats.games += 1;
    stats.byMode[mode.id] = (stats.byMode[mode.id] || 0) + 1;
    if(mistakes === 0) stats.flawless[mode.id] = true;
    saveStats(stats);

    const qmap = {};
    times.forEach(t => { qmap[t.p] = { t:t.t, miss:t.miss }; });
    const ctx = {
      mode: mode, mistakes: mistakes, score: score, total: order.length,
      answered: times.length, skipped: order.length - times.length,   // T74: skips never push to `times`
      totalTime: total, avg: total/order.length, rankIndex: rankIdx, qmap: qmap,
      stats: {
        games: stats.games,
        modesCleared: Object.keys(stats.byMode).length,
        flawless: Object.keys(stats.flawless).length
      }
    };
    const collected = loadCollected();
    const has = id => !!collected[id];
    // snapshot which topics were playable BEFORE this round's awards
    const wasUnlocked = {};
    MODES.forEach(m => wasUnlocked[m.id] = isUnlocked(m));
    const newly = C.evaluate(ctx, has);
    newly.forEach(it => collected[it.id] = { ts: Date.now() });

    // per-topic completion milestones, against the post-award collected state so
    // a topic finished to 100% this round counts immediately.
    const topicsUnlocked = MODES.filter(isUnlocked).length;
    const topicsComplete = MODES.filter(isModeComplete).length;
    const topics = C.evaluateTopics(
      { unlocked: topicsUnlocked, complete: topicsComplete, total: MODES.length }, has);
    topics.forEach(it => collected[it.id] = { ts: Date.now() });

    const more = C.evaluateCollector(Object.keys(collected).length, has);
    more.forEach(it => collected[it.id] = { ts: Date.now() });
    // hero/arena milestones (e.g. a drill round that unlocks the last hero)
    const meta = grantMeta(collected);

    // ----- Goblin Gold: per-question gold (accrued in correct) + round bonus +
    // first-time Mastery / topic-100% bonuses, all × the global multiplier -----
    const mult = goldMult(collected);
    let earn = roundGold + roundBonusGold(score, rankIdx, mult);
    if(newly.some(it => it.cat === "Mastery")) earn += 50 * mult;
    if(topics.some(it => /^topics:(one|all)100$/.test(it.id))) earn += 100 * mult;
    const goldBefore = loadGold();
    const wealth = earnGold(earn, collected);
    // momentum: register today's play (forgiving daily signal)
    const mo = bumpMomentum(collected);
    saveCollected(collected);
    const unlocked = newly.concat(topics).concat(more).concat(meta).concat(wealth).concat(mo.milestones);

    // round-end stinger — play the most triumphant thing earned this round
    if(unlocked.some(it => /^topics:(one|all)100$/.test(it.id))) sfx("topic100");
    else if(unlocked.some(it => it.cat === "Mastery")) sfx("mastery");
    else sfx("roundComplete");
    // T115 — the synth "wub" win-sting on a real topic-complete / mastery (level-up) moment
    if(unlocked.some(it => it.cat === "Mastery" || /^topics:(one|all)100$/.test(it.id))) sfx("wub");

    // celebratory toast for any topic this round newly opened (chain or Part-2)
    MODES.forEach(m => { if(!wasUnlocked[m.id] && isUnlocked(m)) showTopicToast(m); });

    // ----- best time: keep the per-mode top-10 board (no names, single-player)
    const entry = { name:"", score:score, time:total, total:order.length, ts:Date.now() };
    saveBoard(mode.id, loadBoard(mode.id).concat([entry]).sort(rank).slice(0, MAX));
    // per-question best times for the Practice heat-map (normal rounds only)
    saveQbest(recordQbest(loadQbest(), mode.id, times));

    show("results");
    renderTopicInfo();
    showGold($("resGold"), goldBefore, loadGold(), earn);
    fxCelebrateRank(rankIdx);   // T112: a rank-scaled celebration burst on a good round (none for a poor run)
    if(mo.wentUp) momentumToast(mo.state);
    if(unlocked.length) setTimeout(() => showUnlocks(unlocked), 650);
  }

  // ---- Goblin Gold display: a ticking counter + a non-blocking "+N" flourish.
  function renderGold(){
    const el = $("goldBar"); if(!el) return;
    el.innerHTML = '🪙 <b>' + esc(fmtGold(loadGold())) + '</b> ' + esc(GOLD_LABEL);
  }
  // ---- Momentum display: a calm start-screen indicator + a gentle ack toast.
  function renderMomentum(){
    const el = $("momentumBar"); if(!el) return;
    const m = loadMomentum();
    el.innerHTML = m.count > 0
      ? '🗓 <b>' + m.count + '</b> ' + esc(MOMENTUM_LABEL) + (m.count >= MOMENTUM_MAX ? ' · maxed' : '')
      : '';
  }
  // ---- T81: prominent home-screen event banner -----------------------------
  // Front-and-centre on the start screen: today's live event with its procedural
  // emblem art, name/blurb, a Play CTA that routes straight into the gauntlet, and
  // a live countdown to the 00:00 UTC rollover. Stays visible as rewards accrue
  // (reads "N/3 rewards earned · play again"), never nagging.
  let bannerDay = null;
  function renderEventBanner(){
    const el = $("eventBanner"); if(!el) return;
    const Ev = window.Events, ev = (Ev && Ev.today) ? Ev.today() : null;
    bannerDay = (Ev && Ev.epochDaysUTC) ? Ev.epochDaysUTC(Date.now()) : null;
    if(!ev){ el.classList.add("hidden"); el.innerHTML = ""; return; }
    // T87: withhold the daily event from brand-new players until a few runs in.
    if(!isFeatureUnlocked("eventbanner")){ el.classList.add("hidden"); el.innerHTML = ""; return; }
    // T99 fix: show PROGRESS across the three T92 reward tiers (participation ·
    // "well" · "ace"), not a binary "earned" the moment the player merely shows up.
    // Count the exact keys award() writes: "event:<id>" + ":well" + ":ace".
    const col = loadCollected();
    const got = ["", ":well", ":ace"].filter(s => col["event:" + ev.id + s]).length;
    const tag = got >= 3 ? 'All rewards earned' : got > 0 ? got + '/3 rewards earned' : 'Today’s event';
    el.classList.remove("hidden");
    // Compact strip (T91): small emblem · tag+name+countdown · an inline Play CTA.
    // The full blurb lives on the Events tab / play screen, not here — keeps the home
    // banner short so it never dominates the one-screen #start layout.
    el.innerHTML =
      '<canvas class="pix eb-art" width="84" height="54"></canvas>'+
      '<div class="eb-body">'+
        '<span class="eb-tag">'+tag+'</span>'+
        '<span class="eb-name">'+esc(ev.name)+'</span>'+
        '<span class="eb-count" id="ebCount"></span>'+
      '</div>'+
      '<button class="eb-play" data-event="'+esc(ev.id)+'">'+(got > 0 ? 'Again' : '▶ Play')+'</button>';
    const cv = el.querySelector(".eb-art");
    if(cv && window.EventArt) window.EventArt.draw(cv, ev.artSeed);
    updateEventCountdown();
  }
  function updateEventCountdown(){
    const el = $("ebCount"), Ev = window.Events; if(!el || !Ev || !Ev.epochDaysUTC) return;
    const now = Date.now(), next = (Ev.epochDaysUTC(now) + 1) * Ev.DAY_MS;
    let s = Math.max(0, Math.floor((next - now) / 1000));
    const hh = Math.floor(s/3600); s %= 3600;
    const pad = n => String(n).padStart(2, "0");
    el.textContent = "New event in " + pad(hh) + ":" + pad(Math.floor(s/60)) + ":" + pad(s%60);
  }
  // 1s tick — only while the home screen is visible. Refreshes the countdown and,
  // if the UTC day has rolled over while watching, re-renders for the new event.
  function tickEventBanner(){
    if(!screens.start.classList.contains("active")) return;
    const Ev = window.Events; if(!Ev || !Ev.epochDaysUTC) return;
    if(Ev.epochDaysUTC(Date.now()) !== bannerDay) renderEventBanner();
    else updateEventCountdown();
  }

  function momentumToast(state){
    enqueueToast(() => {
      const t = document.createElement("div");
      t.className = "toast momentum";
      t.innerHTML = '<span class="t-glyph">🗓</span><div class="t-txt">' +
        '<span class="t-tag">' + esc(MOMENTUM_LABEL) + (state.count >= MOMENTUM_MAX ? " · maxed" : "") + '</span>' +
        '<span class="t-name">' + state.count + ' day' + (state.count === 1 ? '' : 's') + '</span></div>';
      $("toasts").appendChild(t);
      requestAnimationFrame(() => t.classList.add("show"));
      return t;
    }, 1800, 1100);
  }
  function showGold(el, before, after, earned){
    if(!el) return;
    el.innerHTML = '<span class="gold-n">🪙 ' + esc(fmtGold(before)) + '</span>' +
      (earned > 0 ? ' <span class="gold-plus">+' + esc(fmtGold(earned)) + '</span>' : '') +
      ' <span class="gold-lbl">' + esc(GOLD_LABEL) + '</span>';
    const numEl = el.querySelector(".gold-n");
    if(after <= before || !numEl){ if(numEl) numEl.innerHTML = '🪙 ' + esc(fmtGold(after)); return; }
    const t0 = performance.now(), dur = 800;
    (function tick(now){
      const k = Math.min(1, (now - t0) / dur);
      const val = before + (after - before) * (k * (2 - k));   // ease-out
      numEl.innerHTML = '🪙 ' + esc(fmtGold(val));
      if(k < 1) requestAnimationFrame(tick); else numEl.innerHTML = '🪙 ' + esc(fmtGold(after));
    })(t0);
  }

  // ---- input wiring -------------------------------------------------------
  elPad.addEventListener("click", e => {
    const key = e.target.closest(".key"); if(!key) return;
    flash(key.dataset.k); press(key.dataset.k);
  });

  function flash(k){
    const el = elPad.querySelector('.key[data-k="'+ (CSS && CSS.escape ? CSS.escape(k):k) +'"]');
    if(!el) return;
    el.classList.add("hit"); setTimeout(()=>el.classList.remove("hit"),90);
  }

  document.addEventListener("keydown", e => {
    if(!screens.game.classList.contains("active")) return;
    let k = null;
    if(e.key>="0" && e.key<="9") k=e.key;
    else if(e.key===".") k=".";
    else if(e.key==="Backspace") k="back";
    else if(e.key==="Enter") k="skip";
    if(k!==null){ e.preventDefault(); flash(k); press(k); }
  });

  // Keep a wide prompt fitted if the viewport changes mid-round.
  window.addEventListener("resize", () => {
    if(screens.game.classList.contains("active")){ fitText(elPrompt); fitText(elGhost); }
  });

  // ---- hash routing for the static screens --------------------------------
  function applyRoute(){
    const h = (location.hash || "").replace(/^#\/?/, "");
    // gated features can't be deep-linked into until unlocked (access layer)
    if(h === "inventory" && !isFeatureUnlocked("inventory")){ location.hash = "#/"; return; }
    if(h === "heroes" && !isFeatureUnlocked("heroes")){ location.hash = "#/"; return; }
    if(h === "arena" && !isFeatureUnlocked("arena")){ location.hash = "#/"; return; }
    if(h.indexOf("hero/") === 0 && !isFeatureUnlocked("heroes")){ location.hash = "#/"; return; }
    if(h === "inventory"){ renderInventory(); show("inventory"); }
    else if(h === "best-times"){ renderSummary(); show("summary"); }
    else if(h === "heroes"){ renderHeroes(); show("heroes"); }
    else if(h.indexOf("hero/") === 0){
      if(renderHeroDetail(h.slice(5))) show("heroDetail");
      else { location.hash = "#/heroes"; return; }   // unknown/locked → back to the list
    }
    else if(h === "arena"){ lastBattle = null; arenaHero = null; arenaMapOpen = false; renderArena(); show("arena"); }
    else if(h === "settings"){ renderSettings(); show("settings"); }
    else { checkGates(); renderTree(); renderStartState(); renderGold(); renderMomentum(); renderEventBanner(); applyGates(); show("start"); firePendingHighlight(); }
  }
  function navStart(){ if(location.hash === "#/" || location.hash === "") applyRoute(); else location.hash = "#/"; }
  window.addEventListener("hashchange", applyRoute);

  $("startBtn").addEventListener("click", start);
  $("menuBtn").addEventListener("click", navStart);

  $("statsBtn").addEventListener("click", () => { location.hash = "#/best-times"; });
  $("sumBack").addEventListener("click", navStart);
  // Tap an unlocked topic on Best Times to play it right away (locked rows
  // carry no data-mode, so they aren't startable).
  $("sumList").addEventListener("click", e => {
    // Live events carry data-event and route into the gauntlet; locked event rows
    // (not live today) carry none, so they render but can't be played.
    const evRow = e.target.closest(".sum-row.event[data-event]");
    if(evRow){ startEvent(evRow.dataset.event); return; }
    const row = e.target.closest(".sum-row[data-mode]"); if(!row) return;
    const m = byId(row.dataset.mode); if(!m || !isUnlocked(m)) return;
    selectMode(m.id);
    start();
  });

  // Home-screen event banner: the Play CTA routes straight into today's gauntlet.
  $("eventBanner").addEventListener("click", e => {
    const b = e.target.closest(".eb-play"); if(b) startEvent(b.dataset.event);
  });

  $("invBtn").addEventListener("click", () => { location.hash = "#/inventory"; });
  $("invBack").addEventListener("click", navStart);
  $("heroesBtn").addEventListener("click", () => { location.hash = "#/heroes"; });
  $("heroesBack").addEventListener("click", navStart);
  $("hdBack").addEventListener("click", () => { location.hash = "#/heroes"; });
  $("updateRefresh").addEventListener("click", () => location.reload());
  $("updateDismiss").addEventListener("click", () => { updateDismissed = true; $("updateBar").classList.add("hidden"); });
  $("heroList").addEventListener("click", e => {
    const card = e.target.closest(".hero-card.unlocked"); if(!card) return;
    location.hash = "#/hero/" + card.dataset.hero;
  });
  $("arenaBtn").addEventListener("click", () => { location.hash = "#/arena"; });
  $("arenaBack").addEventListener("click", navStart);
  $("arenaFight").addEventListener("click", startBattle);
  $("arenaBody").addEventListener("click", e => {
    if(e.target.closest(".arena-map-btn")){ arenaMapOpen = !arenaMapOpen; renderArena(); return; }
    const card = e.target.closest(".arena-hero"); if(!card) return;
    arenaHero = (arenaHero === card.dataset.hero) ? null : card.dataset.hero;
    renderArena();
  });
  // Switch inventory tabs (lazy-renders the chosen tab's tiles).
  $("invTabs").addEventListener("click", e => {
    const b = e.target.closest(".inv-tab"); if(!b || b.dataset.tab === invTab) return;
    invTab = b.dataset.tab; renderInvTabs(); renderInvTab();
  });
  $("invList").addEventListener("scroll", updateInvTop, { passive:true });
  $("invTop").addEventListener("click", () => { $("invList").scrollTop = 0; updateInvTop(); });
  // Tap a collectible to inspect it (owned shows detail; locked teases).
  $("invList").addEventListener("click", e => {
    const play = e.target.closest(".el-play");
    if(play){ startEvent(play.dataset.event); return; }   // launch today's live event
    const cell = e.target.closest(".inv-cell"); if(!cell) return;
    const it = C.byId(cell.dataset.id); if(!it) return;
    if(cell.classList.contains("owned")) openModal(it.cat, [it], false);
    else openModal("Locked", [{ id:"locked-mystery", name:"???", rarity:"common", desc:"Keep playing to discover this collectible." }], false);
  });
  $("unlockClose").addEventListener("click", closeModal);
  $("unlockModal").addEventListener("click", e => { if(e.target === $("unlockModal")) closeModal(); });

  // ---- fullscreen helpers (feature-detected, vendor-prefixed, try/catch) ----
  function fsSupported(){
    const el = document.documentElement;
    return !!(el && (el.requestFullscreen || el.webkitRequestFullscreen ||
      el.mozRequestFullScreen || el.msRequestFullscreen));
  }
  function fsActive(){
    return !!(document.fullscreenElement || document.webkitFullscreenElement ||
      document.mozFullScreenElement || document.msFullscreenElement);
  }
  function fsEnter(){
    const el = document.documentElement;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen ||
      el.mozRequestFullScreen || el.msRequestFullscreen;
    if(fn){ try{ const p = fn.call(el); if(p && p.catch) p.catch(()=>{}); }catch(e){} }
  }
  function fsExit(){
    const fn = document.exitFullscreen || document.webkitExitFullscreen ||
      document.mozCancelFullScreen || document.msExitFullscreen;
    if(fn){ try{ const p = fn.call(document); if(p && p.catch) p.catch(()=>{}); }catch(e){} }
  }

  // In-menu fullscreen toggle (T18) — hidden where unsupported.
  (function setupFullscreenBtn(){
    const btn = $("fsBtn"); if(!btn) return;
    if(!fsSupported()){ btn.classList.add("hidden"); return; }
    const sync = () => { const lbl = btn.querySelector(".nav-lbl");                          // T99 labelled nav button
      if(lbl) lbl.textContent = fsActive() ? 'Exit' : 'Screen'; else btn.innerHTML = fsActive() ? '⛶ Exit' : '⛶ Screen'; };
    btn.addEventListener("click", () => { fsActive() ? fsExit() : fsEnter(); });
    ["fullscreenchange","webkitfullscreenchange","mozfullscreenchange","MSFullscreenChange"]
      .forEach(ev => document.addEventListener(ev, sync));
    sync();
  })();

  // ---- sound preference (persisted) + SFX engine (window.Sound) -----------
  function soundOn(){ try{ return localStorage.getItem("halves.sound") !== "off"; }catch(e){ return true; } }
  function saveSound(on){ try{ localStorage.setItem("halves.sound", on ? "on" : "off"); }catch(e){} }
  function audioUnlock(){ if(window.Sound && window.Sound.unlock) window.Sound.unlock(); }
  function applySoundPref(){ if(window.Sound && window.Sound.setMuted) window.Sound.setMuted(!soundOn()); applyAudioPrefs(); }
  // T113 — owner-calibrated Volume + Tempo (persisted slider positions). Volume is
  // stored 0–250 (→ ×0..2.5 master gain; the limiter keeps the top end clip-safe);
  // tempo is stored 40–100 (→ ×0.40..1.00 BPM multiplier).
  // T114 — owner-calibrated fresh-profile defaults: volume 3.0× (slider 300, of a
  // 0–400 range), tempo 0.5× (slider 50). A saved halves.vol/halves.tempo wins.
  function loadVol(){ const v = parseInt(localStorage.getItem("halves.vol"), 10); return isFinite(v) ? v : 300; }
  function loadTempo(){ const v = parseInt(localStorage.getItem("halves.tempo"), 10); return isFinite(v) ? v : 50; }
  function saveVol(v){ try{ localStorage.setItem("halves.vol", String(v)); }catch(e){} }
  function saveTempo(v){ try{ localStorage.setItem("halves.tempo", String(v)); }catch(e){} }
  function applyAudioPrefs(){
    const S = window.Sound; if(!S) return;
    if(S.setVolume) S.setVolume(loadVol() / 100);
    if(S.setTempo) S.setTempo(loadTempo() / 100);
  }
  // Guarded SFX trigger — a no-op if the engine is absent or muted.
  function sfx(name, arg){ const S = window.Sound; if(S && S[name]) S[name](arg); }
  // Keep every 🔊/🔇 button (entry + start menu) in sync, and toggle the pref.
  const SOUND_BTNS = ["soundBtn", "soundBtnMenu"];
  function syncSoundButtons(){
    const on = soundOn();
    const sb = $("soundBtn"); if(sb) sb.innerHTML = on ? '🔊 Sound on' : '🔇 Sound off';   // entry screen
    const sm = $("soundBtnMenu"); if(sm){ const e = sm.querySelector(".nav-emoji");          // T99 labelled nav button
      if(e) e.textContent = on ? '🔊' : '🔇'; else sm.innerHTML = on ? '🔊' : '🔇'; }
    const sv = $("setSoundVal"); if(sv) sv.textContent = on ? "On" : "Off";                 // T85 Settings row
  }
  function toggleSound(){ saveSound(!soundOn()); syncSoundButtons(); applySoundPref(); }
  SOUND_BTNS.forEach(id => { const b = $(id); if(b) b.addEventListener("click", toggleSound); });

  // ---- Settings screen + "Clear all data" (T85) --------------------------
  // T113 — show the exact, reportable slider values (×multiplier).
  function fmtVol(slider){ return (slider / 100).toFixed(2) + "×"; }
  function fmtTempo(slider){ return (slider / 100).toFixed(2) + "×"; }
  function renderSettings(){
    syncSoundButtons();
    const vr = $("volRange"), tr = $("tempoRange");
    if(vr){ vr.value = loadVol(); const vv = $("setVolVal"); if(vv) vv.textContent = fmtVol(loadVol()); }
    if(tr){ tr.value = loadTempo(); const tv = $("setTempoVal"); if(tv) tv.textContent = fmtTempo(loadTempo()); }
  }
  $("settingsBtn").addEventListener("click", () => { location.hash = "#/settings"; });
  $("settingsBack").addEventListener("click", navStart);
  $("setSound").addEventListener("click", toggleSound);
  // T113 — live audio sliders: drag → hear it change immediately, exact value shown,
  // persisted. The Test-sound button plays a representative chime to judge volume.
  (function wireAudioSliders(){
    const vr = $("volRange"), tr = $("tempoRange"), test = $("setTest");
    if(vr) vr.addEventListener("input", () => {
      const v = parseInt(vr.value, 10) || 0; saveVol(v);
      const vv = $("setVolVal"); if(vv) vv.textContent = fmtVol(v);
      audioUnlock(); if(window.Sound && window.Sound.setVolume) window.Sound.setVolume(v / 100);
    });
    if(tr) tr.addEventListener("input", () => {
      const v = parseInt(tr.value, 10) || 100; saveTempo(v);
      const tv = $("setTempoVal"); if(tv) tv.textContent = fmtTempo(v);
      audioUnlock(); if(window.Sound && window.Sound.setTempo) window.Sound.setTempo(v / 100);
      if(window.Sound && window.Sound.setMusic) window.Sound.setMusic("menu");   // ensure menu music is audible while calibrating
    });
    if(test) test.addEventListener("click", () => { audioUnlock(); sfx("correct", 6); });
  })();

  // Wipe every halves.* key → a genuine first-run. Prefix-scan (catches every key,
  // incl. per-mode boards and any future key) with an enumerated fallback, then
  // drop the in-memory caches and reload so nothing survives.
  const KNOWN_KEYS = ["halves.collected","halves.stats","halves.gold","halves.streak",
    "halves.eventBest","halves.qbest","halves.mode","halves.pickerView","halves.sound",
    "halves.vol","halves.tempo"];
  function clearAllData(){
    try{
      const keys = [];
      if(typeof localStorage.length === "number" && typeof localStorage.key === "function"){
        for(let i=0;i<localStorage.length;i++){ const k = localStorage.key(i); if(k && k.indexOf("halves.") === 0) keys.push(k); }
      }
      KNOWN_KEYS.forEach(k => { if(keys.indexOf(k) < 0) keys.push(k); });
      MODES.forEach(m => keys.push(boardKey(m.id)));   // per-mode best-time boards
      keys.forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
    }catch(e){}
    // drop in-memory caches too, so even without a reload the state reads first-run
    Object.keys(mem).forEach(k => delete mem[k]);
    memCollected = memStats = memGold = memStreak = memEventBest = memQbest = null;
    try{ if(location && typeof location.reload === "function") location.reload(); }catch(e){}
  }

  // Serious confirm: a code shown for the user to re-enter on the numpad, AND a
  // ~5s countdown — Confirm is impossible until BOTH are satisfied. Cancel is safe.
  let resetCode = "", resetEntry = "", resetLeft = 0, resetTimer = 0;
  function resetCanConfirm(){ return resetLeft <= 0 && resetEntry === resetCode && resetEntry.length === 4; }
  function renderResetState(){
    const ent = $("resetEntry"), btn = $("resetConfirm");
    if(ent){ ent.classList.toggle("empty", resetEntry === "");
      ent.innerHTML = resetEntry === "" ? '<span class="placeholder">— — — —</span>'
        : esc(resetEntry.split("").join(" ")); }
    if(btn){ btn.disabled = !resetCanConfirm(); btn.textContent = resetLeft > 0 ? ("Clear (" + resetLeft + ")") : "Clear all data"; }
  }
  function openReset(){
    resetCode = String(Math.floor(1000 + Math.random() * 9000));   // a 4-digit code
    resetEntry = ""; resetLeft = 5;
    $("resetCode").textContent = resetCode;
    renderResetState();
    if(resetTimer) clearInterval(resetTimer);
    resetTimer = setInterval(() => { resetLeft = Math.max(0, resetLeft - 1); renderResetState(); if(resetLeft <= 0){ clearInterval(resetTimer); resetTimer = 0; } }, 1000);
    const md = $("resetModal"); md.classList.remove("hidden"); requestAnimationFrame(() => md.classList.add("show"));
  }
  function closeReset(){
    if(resetTimer){ clearInterval(resetTimer); resetTimer = 0; }
    const md = $("resetModal"); md.classList.remove("show"); setTimeout(() => md.classList.add("hidden"), 200);
  }
  $("clearDataBtn").addEventListener("click", openReset);
  $("resetCancel").addEventListener("click", closeReset);
  $("resetModal").addEventListener("click", e => { if(e.target === $("resetModal")) closeReset(); });
  $("resetPad").addEventListener("click", e => {
    const k = e.target.closest(".key"); if(!k) return;
    const v = k.dataset.k;
    if(v === "back") resetEntry = resetEntry.slice(0, -1);
    else if(v === "clr") resetEntry = "";
    else if(resetEntry.length < 4) resetEntry += v;
    renderResetState();
  });
  $("resetConfirm").addEventListener("click", () => { if(resetCanConfirm()) clearAllData(); });

  // ---- entry / "tap to begin" screen (the fullscreen + audio gesture) -----
  (function setupEntry(){
    const fsBtn = $("entryFs"), playBtn = $("entryPlay");
    if(!playBtn) return;
    syncSoundButtons();
    // The single user gesture that unlocks audio (and optionally fullscreen),
    // then reveals the menu / honours any deep-link hash route.
    function enter(useFs){
      audioUnlock();
      applySoundPref();
      if(useFs) fsEnter();
      // A fresh profile is dropped straight into the one-question intro (T86);
      // everyone else (incl. legacy) goes to the menu / honours the deep link.
      if(needsIntro()) startIntro();
      else applyRoute();
    }
    if(!fsSupported()){           // iOS Safari etc. — single "Play", no fullscreen
      fsBtn.classList.add("hidden");
      playBtn.className = "btn";
      playBtn.textContent = "Play";
    }
    fsBtn.addEventListener("click", () => enter(true));
    playBtn.addEventListener("click", () => enter(false));
  })();

  // ---- build info (sha + "ago"), written at deploy time -------------------
  function relAgo(ts){
    if(!ts || isNaN(ts)) return "";
    let s = Math.max(0, (Date.now()-ts)/1000);
    if(s < 60)   return Math.floor(s)+"s ago";
    if(s < 3600) return Math.floor(s/60)+"m ago";
    if(s < 86400)return Math.floor(s/3600)+"h ago";
    return Math.floor(s/86400)+"d ago";
  }
  let buildInfo = null;
  function renderBuild(){
    const el = $("buildInfo");
    if(!buildInfo){ el.textContent = "local build"; return; }
    const sha = buildInfo.shortSha || (buildInfo.sha || "").slice(0,7) || "—";
    const ago = relAgo(Date.parse(buildInfo.time));
    el.innerHTML = 'build <b>'+esc(sha)+'</b>' + (ago ? ' · '+ago : '');
  }
  // Version check (T54): remember the sha booted with; poll build.json for a newer
  // deploy and offer a manual refresh. No-op on a local build / offline; never
  // auto-reloads, never steals focus, polls on an interval (not a tight loop).
  let bootSha = null, updateShown = false, updateDismissed = false;
  function showUpdate(){
    if(updateShown || updateDismissed) return;
    updateShown = true;
    const bar = $("updateBar"); if(bar) bar.classList.remove("hidden");
  }
  function checkForUpdate(){
    if(!bootSha) return;                          // local build / not booted → no-op
    fetch("build.json", { cache:"no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if(j && j.sha && j.sha !== bootSha) showUpdate(); })
      .catch(() => {});                           // offline/404 → silently ignore
  }
  fetch("build.json", { cache:"no-store" })
    .then(r => r.ok ? r.json() : null)
    .then(j => { buildInfo = j; if(j && j.sha) bootSha = j.sha; renderBuild(); })
    .catch(() => renderBuild());
  setInterval(renderBuild, 30000);      // keep the "ago" fresh
  setInterval(checkForUpdate, 180000);  // poll for a newer deploy (every 3 min)
  // expose the version-check internals for the Node test
  window.Updater = { check: checkForUpdate, bootSha: () => bootSha, shown: () => updateShown, setBoot: s => { bootSha = s; } };

  // ---- init ---------------------------------------------------------------
  if(window.FX && window.FX.init) window.FX.init($("fxCanvas"));
  setupFx();           // T110: mount the FXGL home backdrop + burst overlay (no-op if FXGL absent)
  renderTree();        // the tree is the home picker; it paints the topic-info row
  renderBrand();
  installFavicon();
  renderStartState();
  drawMenuIcons();    // static procedural icons on the menu buttons (T50)
  renderBuild();
  renderGold();
  renderMomentum();
  checkGates();                         // T87: reveal any already-earned feature gates
  renderEventBanner();                  // T81: today's event front-and-centre
  applyGates();                         // T86/T87: hide still-gated features on a fresh profile
  setInterval(tickEventBanner, 1000);   // live UTC countdown (only ticks on home)
  applySoundPref();   // honour the saved mute pref on load (no-op until T16)
  // Goblin Gold module API (also used by the Node tests).
  window.Gold = { label: GOLD_LABEL, fmtGold: fmtGold, mult: goldMult,
    questionGold: questionGold, roundBonus: roundBonusGold, tierGold: tierGold,
    load: loadGold, evaluate: (total, has) => C.evaluateGold(total, has) };
  // Momentum module API (pure reducer + helpers, also used by the Node tests).
  window.Momentum = { label: MOMENTUM_LABEL, MAX: MOMENTUM_MAX, reduce: reduceMomentum,
    localDay: localDay, load: loadMomentum, evaluate: (best, has) => C.evaluateMomentum(best, has) };
  // Practice module API (pure qbest reducer, used by the Node tests).
  window.Practice = { recordQbest: recordQbest, qTileColor: qTileColor };
  // Toast queue API (T64) — cap/queue exposed for the Node tests.
  window.Toasts = { CAP: TOAST_CAP, enqueue: enqueueToast, shown: () => toastShown, queued: () => toastQ.length };
  // Tech-tree API (T84) — the data-derived graph + node state, for the Node tests.
  window.TechTree = { graph: techGraph, state: nodeState, view: () => "tree" };
  // Onboarding API (T86) — gating state + the first-run hook, for the Node tests.
  window.Onboard = { isFeatureUnlocked: isFeatureUnlocked, needsIntro: needsIntro,
    startIntro: startIntro, state: () => unlocked };
  // Event play API (T79) — start today's live event gauntlet (used by the Events
  // tab now, the best-attempt board in T80 / the home banner in T81, and tests).
  window.EventPlay = { start: startEvent, active: () => !!eventCtx,
    isRetryable: isRetryable, bestOf: id => loadEventBest()[id] || null };
  show("entry");      // splash first; entry buttons reveal the menu via applyRoute()
})();
