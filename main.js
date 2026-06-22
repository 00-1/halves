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
  // T178 — the "Hoard Multiplier": an EXPONENTIAL mid/late wealth ramp so a
  // committed player amasses an absurd goblin-gold pile (millions → billions →
  // trillions — the Cookie-Clicker comedy). g^(region bosses defeated): early game
  // has no bosses → ×1 (earning unchanged), and each of the 10 region bosses felled
  // multiplies wealth, so late-game Arena wins pay millions. Sim-recommended g≈2.0–2.2
  // (docs/agent/economy-sim.js); owner dialled it to 2.5 for a steeper hoard ramp.
  // Decoupled from Arena difficulty (gold ≠ foe def).
  const HOARD_G = 2.5;
  function bossesDefeated(col){
    const E = window.Enemies, RS = (E && E.REGION_SIZE) || 12, TC = (E && E.TIER_COUNT) || 120;
    let n = 0; for(let t = RS; t <= TC; t += RS) if(col && col["tier:" + t]) n++; return n;
  }
  function hoardMult(col){ return Math.pow(HOARD_G, bossesDefeated(col)); }
  // Escalating global multiplier — the linear/additive base (early game) × the
  // exponential Hoard Multiplier (mid/late). The base grows with everything you've
  // collected; the hoard factor makes deep Arena progress the real wealth engine.
  function goldMult(col){
    const items = C.CATALOG.filter(it => col[it.id]).length;
    let mastered = 0, tiers = 0;
    for(const k in col){ if(k.indexOf("mastery:") === 0) mastered++; else if(/^tier:\d+$/.test(k)) tiers++; }
    const heroes = window.Heroes ? window.Heroes.HEROES.filter(h => window.Heroes.isHeroUnlocked(h, col)).length : 0;
    const base = 1 + items * 0.05 + mastered * 0.5 + heroes * 0.5 + tiers * 1;
    return base * hoardMult(col);
  }
  // T173/T182/T198 — the VISUAL hoard level (0..1) driving the home-backdrop coin
  // mound (B's T172 engine). A FLOOR-OFFSET log over lifetime gold: a small but VISIBLE
  // starter mound, growing across the orders of magnitude K→M→B→T as the displayed
  // NUMBER explodes (the T178 absurd-wealth comedy). `GOLD_EMPTY` is where the pile
  // starts to show; `GOLD_FULL` (the owner's dial) is where it tops out.
  //   level = clamp((log10(1+gold) − log10(GOLD_EMPTY)) / (log10(GOLD_FULL) − log10(GOLD_EMPTY)), 0, 1)
  //   At EMPTY=500, FULL=1e15: 1K≈2.5%, 60K≈17%, 1M≈27%, 1Bn≈51%, 1T≈76%, 1e15 full.
  //   (T198: the owner found 1K too high on the old /log10(1e12) curve — ~25% — and
  //    wanted ~a tenth of that; the floor-offset + 1e15 ceiling gives the gentle ramp.)
  const GOLD_EMPTY = 500, GOLD_FULL = 1e15;
  const HOARD_LO = Math.log10(GOLD_EMPTY), HOARD_SPAN = Math.log10(GOLD_FULL) - HOARD_LO;
  function hoardLevel(gold){ gold = Math.max(0, gold || 0); return Math.max(0, Math.min(1, (Math.log10(1 + gold) - HOARD_LO) / HOARD_SPAN)); }
  // T184 — DEVELOPER MODE (gated, off by default, inert in production). Enabled from
  // the MENU (tap the build pill ~7×, below) → persisted `halves.dev`; `?dev` in the
  // URL is kept as a fallback. It surfaces a "Developer" section in Setup with all the
  // dev tools (the gold-setter, the reveal-all toggle, the FX/hoard testers). The
  // reveal-all toggle (`halves.devReveal`) is a VIEW-ONLY override that shows every
  // collection (heroes / inventory / Codex) as unlocked for art review — it NEVER
  // persists (the real save is untouched). Remove for publish (T168).
  function urlHasDev(){ try{ return /[?&]dev(?:[=&]|$)/.test((window.location && window.location.search) || ""); }catch(e){ return false; } }
  let devMode = (function(){ try{ return urlHasDev() || localStorage.getItem("halves.dev") === "1"; }catch(e){ return false; } })();
  let devReveal = (function(){ try{ return localStorage.getItem("halves.devReveal") === "1"; }catch(e){ return false; } })();
  let memDevCol = null;
  function devFullCol(){
    if(memDevCol) return memDevCol;
    const o = {};
    C.CATALOG.forEach(it => o[it.id] = { ts: 1 });
    const TC = (window.Enemies && window.Enemies.TIER_COUNT) || 120;
    for(let n = 1; n <= TC; n++) o["tier:" + n] = { ts: 1 };
    MODES.forEach(m => o["mastery:" + m.id] = { ts: 1 });
    const Ev = window.Events;
    if(Ev && Ev.roster) Ev.roster().forEach(e => ["", ":well", ":ace"].forEach(suf => o["event:" + e.id + suf] = { ts: 1 }));
    memDevCol = o; return o;
  }
  // The collection a RENDER should show: the real one, or — when dev reveal-all is on
  // — everything (view-only; never written back).
  function viewCol(){ return (devMode && devReveal) ? devFullCol() : loadCollected(); }
  // `?dev&gold=<n>` also seeds the gold total from the URL (a quick wealth preview).
  (function devGoldParam(){
    try{
      if(!devMode) return;
      const m = /[?&]gold=([0-9.eE+]+)/.exec((window.location && window.location.search) || "");
      if(m){ const n = parseFloat(m[1]); if(isFinite(n) && n >= 0) saveGold(n); }
    }catch(e){}
  })();
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
  const screens = { entry:$("entry"), start:$("start"), game:$("game"), results:$("results"), summary:$("summary"), inventory:$("inventory"), heroes:$("heroes"), heroDetail:$("heroDetail"), arena:$("arena"), practice:$("practice"), settings:$("settings"), audio:$("audio"), graphics:$("graphics") };
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
  let fxBg = null, fxBurst = null;
  // T125 — keep BOTH controllers' drawing buffers matched to the LIVE viewport.
  // The burst overlay is built on the ENTRY screen (pre-fullscreen); without this
  // it keeps the entry-sized (or 0/1×1) buffer after the Start→fullscreen viewport
  // change, so the celebration draws off-buffer → "nothing at all". Re-size both on
  // construction, on window resize/orientation, on the fullscreen transition, and
  // right before each burst.
  function fxResizeAll(){
    try{ if(fxBg && fxBg.resize) fxBg.resize(); }catch(e){}
    try{ if(fxBurst && fxBurst.resize) fxBurst.resize(); }catch(e){}
  }
  function setupFx(){
    const FXGL = window.FXGL; if(!FXGL || !FXGL.Controller) return;
    try{
      const bg = $("fxBackdrop"); if(bg) fxBg = new FXGL.Controller(bg, {});
      // T136 — the celebration overlay uses the Canvas2D backend (T133): a 2D context
      // ALWAYS presents, so the z-58 burst renders on-device — unlike a 2nd WebGL
      // context, which mobile GPUs often refuse (the "no celebration visuals" bug).
      // The backdrop stays on its WebGL path (the first, working context).
      const bu = $("fxBurst");    if(bu) fxBurst = new FXGL.Controller(bu, { backend: "2d" });
    }catch(e){ fxBg = null; fxBurst = null; }
    // Size both now (laid out) and on the next frame (in case layout settled late),
    // then keep them matched on every viewport change.
    fxResizeAll();
    if(typeof requestAnimationFrame === "function") requestAnimationFrame(fxResizeAll);
    if(typeof window !== "undefined" && window.addEventListener) window.addEventListener("resize", fxResizeAll);
    if(typeof document !== "undefined" && document.addEventListener)
      ["fullscreenchange","webkitfullscreenchange","mozfullscreenchange","MSFullscreenChange"]
        .forEach(ev => document.addEventListener(ev, fxResizeAll));
  }
  // The home backdrop is FIXED brand purple (T153) — the owner wants the main
  // screen to stay purple, NOT wear today's event colour (a rare event used to
  // turn it blue). The epic-rarity family on the app base: #0E1116 → body → accent.
  const HOME_PALETTE = ["#0E1116", "#9a5cf6", "#cda9ff"];
  // LIVE home state for the backdrop — the HUE is fixed purple; only the player's
  // own collection progress (0–1) and daily Momentum streak modulate it (brightness/
  // particle count). The event is deliberately NOT read here, so the home backdrop
  // never changes with the daily event (the event banner shows its own colour).
  function homeFxState(){
    const col = loadCollected();
    const total = (C.CATALOG && C.CATALOG.length) || 1;
    let have = 0; for(const it of C.CATALOG) if(col[it.id]) have++;
    const progress = Math.max(0, Math.min(1, have / total));
    const streak = loadMomentum().count | 0;
    // Always supply the fixed purple palette so fxgl's cool no-event dawn ramp
    // never kicks in — the home stays purple in every state (no event, rare, epic).
    // T173 — the gold HOARD rides the same backdrop: a settled coin mound at the
    // bottom whose size tracks lifetime gold via the saturating hoardLevel() curve
    // (gold-on-purple). The engine re-seeds the mound only on a tier change, so this
    // is cheap; the pile reflects the new total whenever the home screen is shown.
    return { event: { palette: HOME_PALETTE }, progress: progress, streak: streak,
             hoard: hoardLevel(loadGold()) };
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
  // T125 — fire T126's BIG celebration shower (FXGL.celebrate, up to 800 particles)
  // on the burst overlay (#fxBurst, z-58). ALWAYS resize the controller first so it
  // draws into a buffer matching the CURRENT viewport (the rendering fix — esp.
  // across the Start→fullscreen transition; that stale/0-sized buffer was the root
  // of "nothing at all"). The overlay is transient + sparse so it never covers the
  // question/result text; the engine downshifts for reduced-motion + setQuality.
  function fxBigBurst(opts){
    if(!fxBurst) return;
    try{ if(fxBurst.resize) fxBurst.resize(); }catch(e){}
    try{ if(fxBurst.celebrate) fxBurst.celebrate(opts); else fxBurst.burst(opts); }catch(e){}
  }
  // T152 — emit a celebration FROM a source element's centre (so the colour-coded
  // shower reads as coming "from the thing"). Normalized to the viewport; falls back
  // to screen-centre when the element/rect is unavailable (e.g. the Settings tester).
  function elCentre(el){
    try{
      if(el && el.getBoundingClientRect && typeof innerWidth === "number" && innerWidth && innerHeight){
        const r = el.getBoundingClientRect();
        if(r && r.width > 0 && r.height > 0) return { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight };
      }
    }catch(e){}
    return { x: 0.5, y: 0.55 };
  }
  const FX_SMALL = 5;   // T152 — small/fine particle ceiling (px); the engine floors at MIN_PARTICLE_PX
  // EVERY new inventory item (the showUnlocks path covers loot/reward/event gains):
  // small/fine particles emanating from the unlock card, in the item's RARITY colour.
  function fxCelebrate(items, srcEl){
    if(!fxBurst || !items || !items.length) return;
    let seed = items.length >>> 0, pal = null, best = -1;
    for(const it of items){
      const s = String(it.id);
      for(let i = 0; i < s.length; i++) seed = (Math.imul(seed, 31) + s.charCodeAt(i)) >>> 0;
      const rk = FX_RANK[it.rarity] != null ? FX_RANK[it.rarity] : 0;
      if(rk > best){ best = rk; pal = C.paletteFor ? C.paletteFor(it.rarity) : null; }
    }
    const palette = pal ? [pal.accent, pal.body, "#ffffff"] : null;
    const count = Math.min(700, 200 + items.length * 50 + best * 90);   // denser for rarer/more
    const c = elCentre(srcEl);
    fxBigBurst({ x: c.x, y: c.y, count: count, seed: seed || 1, palette: palette, sizePx: FX_SMALL, spread: 0.85 });
  }
  // EVERY completed topic RUN celebrates — small/fine, from the RANK BADGE, in the
  // rank's colour; scaled by rank (a great run is denser) but always fires.
  function fxCelebrateRank(rankIdx, srcEl){
    if(!fxBurst) return;
    const ranks = C.RANKS || [];
    const rk = ranks.length ? ranks[Math.min(Math.max(rankIdx, 0), ranks.length - 1)] : null;
    const t = ranks.length > 1 ? Math.min(1, Math.max(0, rankIdx) / (ranks.length - 1)) : 1;
    const count = Math.round(220 + t * 380);
    const c = elCentre(srcEl);
    fxBigBurst({ x: c.x, y: c.y, count: count, seed: (rankIdx + 1) * 0x9e3779b1 >>> 0,
      palette: rk ? [rk.color, "#ffd98a", "#ffffff"] : null, sizePx: FX_SMALL, spread: 0.9 });
  }
  // EVERY Arena VICTORY: the biggest/widest of the set — small/fine particles bursting
  // outward FROM THE DEFEATED FOE'S portrait, gold + a bright accent.
  function fxCelebrateWin(tierN, srcEl){
    if(!fxBurst) return;
    const c = elCentre(srcEl);
    fxBigBurst({ x: c.x, y: c.y, count: 700, seed: ((tierN | 0) + 1) * 0x85ebca6b >>> 0,
      palette: ["#f5b544", "#ffd98a", "#ffffff", "#78dcff"], sizePx: FX_SMALL + 1, spread: 1.4 });
  }
  // T173 — the amount-scaled spinning-COIN earn burst (B's T172 earnBurst): a flurry
  // of beveled coins flies from the earn-point toward the hoard at the bottom. With
  // the T178 economy a gain spans ~10 → billions, so map gain → coin count via a LOG
  // curve, clamped (you can't spawn a billion coins); PAST the count cap we add JUICE
  // not count — wider spread + a brighter gold palette + a discrete tier — so a huge
  // boss payout FEELS enormous. reduced-motion is handled inside the engine.
  const COIN_MIN = 6, COIN_CAP = 88;
  // Brighter gold pools for the upper haul tiers (small→huge): more highlight tones.
  const COIN_PALS = [
    ["#d49e2e", "#ffd66e"],
    ["#e7b13e", "#ffd66e", "#fff0c0"],
    ["#f5b544", "#ffd98a", "#fff0c0"],
    ["#ffd98a", "#fff0c0", "#ffffff"]
  ];
  // Pure: gain → { count (log, capped), tier (0..3), spread, sizePx } — Node-testable.
  function earnBurstSpec(amount){
    amount = Math.max(0, +amount || 0);
    const mag = Math.log10(1 + amount);                                  // 10→1.04, 1e3→3, 1e6→6, 1e9→9
    const count = Math.max(COIN_MIN, Math.min(COIN_CAP, Math.round(COIN_MIN + 9 * mag)));
    const tier = Math.max(0, Math.min(3, Math.floor(mag / 2.5)));        // 4 readable juice tiers
    // Past the count cap it's JUICE not count: a bigger haul flings coins WIDER, a
    // touch BIGGER, in a brighter gold palette.
    return { count: count, tier: tier, spread: 0.9 + tier * 0.4, sizePx: 5 + tier * 1.5, palette: COIN_PALS[tier] };
  }
  // T173 (follow-up): a STANDALONE outward coin burst — coins explode FROM the
  // earn-point and fade, NOT converging onto the home pile. The owner dropped the
  // converge/settle ("the coins flying out already evoke landing in the hoard, and
  // we're off the home screen when we earn"); this fires on the results screen, so a
  // directed-to-the-bottom-pile motion read wrong. Uses the ballistic burst() (flies
  // out + fades), gold-toned, amount-scaled. reduced-motion handled in the engine.
  function fxEarnBurst(srcEl, amount){
    if(!fxBurst || !(amount > 0)) return;
    if(typeof fxBurst.burst !== "function") return;                      // engine without the burst hook → no-op
    try{ if(fxBurst.resize) fxBurst.resize(); }catch(e){}
    const c = elCentre(srcEl), spec = earnBurstSpec(amount);
    const seed = ((Math.round(Math.min(amount, 1e15)) >>> 0) * 0x9e3779b1 >>> 0) || 1;
    // T182(4) — forward `look:"coin"` so the burst renders BEVELED coins the moment
    // B's seedBurst honours it (today it's ignored → gold squares, which the owner OK'd).
    try{ fxBurst.burst({ x: c.x, y: c.y, count: spec.count, seed: seed,
      spread: spec.spread, sizePx: spec.sizePx, palette: spec.palette, look: "coin" }); }catch(e){}
  }

  // ---- Synth wiring (T122) — the generative MUSIC engine ------------------
  // Mount B's window.Synth on sound.js's EXISTING AudioContext, and re-route its
  // output into sound.js's master so music + SFX share ONE chain (the T113 volume
  // slider + the limiter govern both). Synth is the only music scheduler now;
  // sound.js keeps the SFX. Each screen plays a context (solve=calm · menu · arena
  // ·event); a win fires the wub; SFX duck the music. Guarded no-op if Synth absent.
  let synthWired = false, curScreen = "entry", musicPreview = null, musicGain = null;   // musicPreview: T129 switcher's picked style; musicGain: T143 music-only volume
  // T164 — track the currently-playing music key (context + ":" + seed). When the
  // next musicForScreen target matches this AND the engine is still playing, we
  // SKIP the setContext/setMusic/swapNow/start round-trip — moving between same-
  // music screens (home↔settings↔audio↔inventory↔heroes all map to "menu") no
  // longer rebuilds the same track (the source of the needless restart + the
  // likely foghorn root on screen change). Cleared on stop / context loss so a
  // re-arrival re-syncs cleanly.
  let curMusicKey = null;
  function setupSynth(){
    if(synthWired) return;
    const Sy = window.Synth, S = window.Sound;
    if(!Sy || !Sy.mount || !S || !S.ctx) return;
    const ctx = S.ctx(); if(!ctx) return;
    try{
      Sy.mount({ ctx: ctx });
      const out = Sy.output && Sy.output(), sMaster = S.master && S.master();
      // T143 — insert a MUSIC gain on the Synth → master path so music has its OWN
      // volume (independent of the SFX bus). Synth → musicGain → sound.js master
      // (mute-only) → limiter. SFX route through sound.js's separate sfx bus.
      if(out && sMaster){
        try{ out.disconnect(); }catch(e){}
        try{ musicGain = ctx.createGain(); musicGain.gain.value = loadMusicVol() / 100; out.connect(musicGain); musicGain.connect(sMaster); }
        catch(e){ musicGain = null; out.connect(sMaster); }
      }
      Sy.setMuted(!soundOn());
      synthWired = true;
    }catch(e){ synthWired = false; }
  }
  function setMusicVolume(slider){ const g = Math.max(0, Math.min(10, slider)) / 100; if(musicGain){ try{ musicGain.gain.value = g; }catch(e){} } return g; }
  function synthTempoMult(){ const v = loadTempo() / 100; return isFinite(v) ? v : 1; }
  // T128(1) — drive the engine's DISTINCT built-in context (its own progression /
  // patches / reverb — incl. the Arena's wub bass + dark Aeolian) via
  // Synth.setContext, with the T113 tempo multiplier on top. This REPLACES the old
  // musicSpec() partial specs that passed NO progression → the engine defaulted the
  // SAME chords for every context, so solve/menu/arena only differed by tempo (the
  // owner's "music never changes"). setContext carries a real per-context harmony,
  // so the styles are genuinely distinct. (Also the path the T129 switcher uses.)
  function synthSwitchContext(name, seed){
    const Sy = window.Synth; if(!Sy || !Sy.setContext || !synthWired) return false;
    const c = Sy.CONTEXTS && Sy.CONTEXTS[name]; if(!c) return false;
    try{
      Sy.setContext(name);                                         // the distinct context (sets its progression/patches/reverb)
      const t = synthTempoMult();
      const s = (seed != null) ? (seed >>> 0) : (Sy.hashStr ? Sy.hashStr(name) : 1);   // per-context seed (solve varies per topic)
      if(Sy.setMusic) Sy.setMusic(Object.assign({ seed: s }, c,
        { tempo: Math.max(20, Math.round(c.tempo * (isFinite(t) && t > 0 ? t : 1))) }));   // T113 tempo on top
      if(Sy.swapNow) Sy.swapNow();   // T132: swap the generator NOW (≤1 step) — a screen change / style pick is instant, not at a far phrase boundary
      if(Sy.start) Sy.start();
      curMusicKey = name + ":" + s;   // T164: remember what's playing so idempotent screen changes can skip the rebuild
      return true;
    }catch(e){ return false; }
  }
  function arenaBossProx(){ const st = arenaFxState(); return st && st.facingBoss ? 1 : ((st && st.tierFrac) || 0); }
  // Drive the music per screen (mirrors fxSetScreen): solve in-game, arena on the
  // Arena (intensifying near a boss), menu everywhere else — each its OWN distinct
  // engine context (T128). One scheduler; setContext swaps the spec (no leak).
  function musicForScreen(name){
    curScreen = name;
    const Sy = window.Synth; if(!Sy || !synthWired) return;
    // T159 — never schedule into a suspended / garbage (sampleRate 0) context (the
    // foghorn). The resume path (audioUnlock / resyncMusic) restarts once running.
    const c = audioCtx(); if(c && (c.state === "suspended" || c.sampleRate === 0)) return;
    try{
      if(musicPreview){ synthSwitchContext(musicPreview); return; }   // the Audio-menu picker is driving — don't fight it
      // T140 — route screens to B's 12 named styles (more styles than screens): a
      // CALM Lo-Fi during solves, the Festival for the event gauntlet, the driving
      // Arena context on #arena, Neon Lobby (menu) everywhere else.
      const context = name === "game" ? (eventCtx ? "bigroom" : "lofi") : name === "arena" ? "arena" : "menu";
      // the calm solve style varies per topic (the seed keeps topics musically distinct).
      const seed = (context === "lofi" && typeof mode !== "undefined" && mode && typeof mode.music === "number")
        ? ((mode.music + 1) * 2654435761 >>> 0) : undefined;
      // T164 — only switch the music when the TARGET (context + seed) actually
      // differs from what's playing. Moving between same-music screens (home↔
      // settings↔audio↔inventory↔heroes all map to "menu" with the same seed) is
      // now a no-op — no needless setContext/setMusic/swapNow/start rebuild, no
      // audible re-trigger, no foghorn opportunity. A real change (menu→lofi on
      // game start, →arena, a different solve topic) still fires the switch.
      const targetSeed = (seed != null) ? (seed >>> 0) : (Sy.hashStr ? Sy.hashStr(context) : 1);
      const targetKey = context + ":" + targetSeed;
      if(curMusicKey === targetKey && Sy.musicPlaying && Sy.musicPlaying()){
        if(context === "arena" && Sy.intensity) Sy.intensity(arenaBossProx());   // intensity is cheap + per-frame; keep it tracking
        return;
      }
      synthSwitchContext(context, seed);
      if(context === "arena" && Sy.intensity) Sy.intensity(arenaBossProx());
    }catch(e){}
  }
  // The win-sting on a real win (Arena victory / topic-complete). Uses the engine's
  // purpose-built victory STING — a wub swell + rising bell arp on the SFX bus,
  // ducking only the music bed so the cue lands. (The old hand-rolled version played
  // the wub on the MUSIC bus and then ducked that same bus → it suppressed its own
  // wub: the owner's "no wub on victory". The sting plays on the un-ducked sfx bus.)
  function wubSting(){
    const Sy = window.Synth; if(!Sy || !synthWired) return;
    try{
      if(Sy.sting) Sy.sting("victory");
      else if(Sy.play){ Sy.play("wub", null, { midi: 36, dur: 0.6, bus: "sfx" }); if(Sy.duck) Sy.duck(); }   // fallback: still on the sfx bus
    }catch(e){}
  }
  // Idle the single music scheduler when the tab is hidden; resume the current
  // context when visible (sound.js already suspends/resumes the shared ctx).
  if(typeof document !== "undefined" && document.addEventListener){
    document.addEventListener("visibilitychange", function(){
      const Sy = window.Synth; if(!Sy) return;
      // T159 — on hide: stop the scheduler. On return (app-switch): re-sync CLEANLY
      // (drop the surviving tail + restart only once the resumed ctx is running),
      // never schedule straight into a still-suspended context (the resume foghorn).
      try{ if(document.hidden){ if(Sy.stop) Sy.stop(); } else if(soundOn()){ resyncMusic(); } }catch(e){}
    });
  }

  function show(name){
    // stop the game clock RAF whenever we leave the game screen (e.g. browser
    // back mid-round), so it never loops on a hidden screen.
    if(name !== "game" && raf){ cancelAnimationFrame(raf); raf = 0; }
    if(name !== "arena") cancelPlayout();        // T90: never leave the battle-playout RAF looping on a hidden screen
    if(name !== "audio") musicPreview = null;   // T129/T143: leaving the Audio menu drops the transient style preview → per-screen music resumes
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[name].classList.add("active");
    fxSetScreen(name);     // T110/T112: full-bleed backdrop — home scene on #start, Arena scene on #arena, idle elsewhere
    musicForScreen(name);  // T122: Synth music — solve (calm) in-game, arena on the Arena, menu elsewhere
    // T166 — DO NOT push a sentinel on every show(). Forward navs already push a
    // hash history entry (via `location.hash = …`); pushing a sentinel here too
    // double-stacked the history and made back over-shoot its parent + exit the
    // config (T157 regression). The hash IS our screen stack; the lone setup-time
    // sentinel below is solely the home-exit trap.
  }
  function fmt(t){ return t.toFixed(1); }
  function numStr(n){ return String(n); }
  function esc(s){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  // T117 — inline house pixel icon (decorative span, tinted by the surrounding
  // text colour). Safe no-op if icons.js failed to load.
  function ic(name){ return (window.Icons && window.Icons.span) ? window.Icons.span(name) : ""; }

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
  // Dev mode (T184) opens every gated screen too, so the owner can reach Inventory /
  // Heroes / Arena on a fresh profile for art review — view-only, never persisted.
  function isFeatureUnlocked(id){ return !!(devMode || unlocked.legacy || unlocked[id]); }
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
        t.innerHTML = '<span class="t-glyph">'+ic("sparkles")+'</span><div class="t-txt"><span class="t-tag">Unlocked</span>'+
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
  // collectible progress `have/total`, and a state glyph (play / locked / done 100%).
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
  const NODE_BADGE = { locked:"lock", unlocked:"play", mastered:"star", done:"check" };
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
      '<span class="tn-badge" aria-hidden="true">'+ic(NODE_BADGE[st])+'</span>'+
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
    if(locked){ meta = ic("lock")+' ' + unlockReq(m); }   // unlockReq already returns escaped HTML (don't double-escape)
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

  // T202 — the entry/splash mark is MAGNAR (the app's face / launcher icon), painted
  // from the SAME generator as the icon (T194): his pixel portrait on the dark entry
  // bg (transparent canvas → no tile square), crisp-upscaled by `.mark canvas` CSS.
  // The "Goblin Gold" wordmark (.brand) is separate and stays. Falls back to the
  // Halves glyph if the generator is unavailable.
  function renderBrand(){
    renderTitles();   // T209 — stylise the Goblin Gold / Void Throne title pair (independent of the mark)
    const el = screens.entry && screens.entry.querySelector(".mark");
    if(!el) return;
    if(C.iconColorGrid && document.createElement){
      const grid = C.iconColorGrid(ICON_HERO, HERO_PAL.Brawn, "familiar"), G = grid.length, scale = 10;
      const cv = document.createElement("canvas"); cv.width = cv.height = G * scale;
      const cx = cv.getContext && cv.getContext("2d");
      if(cx){
        for(let gy = 0; gy < G; gy++) for(let gx = 0; gx < G; gx++){
          const hex = grid[gy][gx]; if(!hex) continue;
          cx.fillStyle = hex; cx.fillRect(gx * scale, gy * scale, scale, scale);
        }
        el.innerHTML = ""; el.appendChild(cv); return;
      }
    }
    paintGlyph(el, byId("halves"), 10);
  }

  // T209 — stylise the title BLOCK as PIXEL-art text: each title line is rendered to a
  // canvas, shaded by a vertical 3-tone ramp with Bayer-4 dither (currency-GOLD for
  // "Goblin Gold", endgame-VOID purple→black for "The Void Throne"), then upscaled
  // nearest-neighbour. An occasional THROTTLED glint sweeps each line (gold on gold,
  // violet on void); reduced-motion → static, no sweep. Falls back to the plain CSS
  // text on any failure (the element keeps its text until a canvas is built).
  const BAYER4 = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
  const TITLE_GOLD = [[255,224,140],[226,168,52],[120,84,22]];   // highlight → mid → shadow (hoard gold)
  // T210 — lightened toward the brand purple (#cda9ff/#9a5cf6) so the void line is
  // luminous/legible (was purple→near-black, too dark): light-violet → brand-violet →
  // mid-purple (no near-black shadow).
  const TITLE_VOID = [[205,169,255],[154,92,246],[74,47,122]];
  const TITLE_GOLD_GLINT = [255,248,214];                        // T210 — gold glints; the void line gets NO sparkle
  function paintPixelTitle(el, ramp, glint, corrupt){
    if(!el || !document.createElement) return;
    const text = (el.dataset && el.dataset.title) || el.textContent; if(!text) return;
    try{
      if(el.dataset) el.dataset.title = text;                    // remember it (textContent gets replaced by the canvas)
      // T212 — raster at a HIGHER base res (cellsH 18→26) so the "i"/"l" dot+stem
      // separate (was merging → "Goblln"/"Vold"); PX 3→2 keeps the display size.
      const cellsH = 26, weight = 800, fontFam = "'Space Grotesk',system-ui,sans-serif";
      const off = document.createElement("canvas"); const m = off.getContext && off.getContext("2d");
      if(!m || !m.measureText || !m.getImageData) return;        // headless/no-2d → keep the CSS text
      const font = weight + " " + cellsH + "px " + fontFam;
      m.font = font; try{ m.letterSpacing = "-1.5px"; }catch(e){}   // T212 — tighter letters
      const w = Math.max(1, Math.ceil(m.measureText(text).width) + 2), h = Math.ceil(cellsH * 1.4);
      off.width = w; off.height = h;
      const c = off.getContext("2d"); c.font = font; try{ c.letterSpacing = "-1.5px"; }catch(e){}
      c.textBaseline = "middle"; c.fillStyle = "#fff";
      c.fillText(text, 1, h / 2);
      const data = c.getImageData(0, 0, w, h).data;
      let yMin = h, yMax = 0;
      for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) if(data[(y*w+x)*4+3] > 96){ if(y<yMin)yMin=y; if(y>yMax)yMax=y; }
      const span = Math.max(1, yMax - yMin), PX = 2;
      const disp = document.createElement("canvas"); disp.width = w * PX; disp.height = h * PX; disp.className = "pixtitle";
      const d = disp.getContext("2d"); if(!d) return;
      const draw = glintX => {
        d.clearRect(0, 0, disp.width, disp.height);
        for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
          if(data[(y*w+x)*4+3] <= 96) continue;
          let v = (y - yMin) / span + (BAYER4[y&3][x&3] / 16 - 0.5) * 0.5;
          v = v < 0 ? 0 : v > 1 ? 1 : v;
          let col = ramp[Math.min(ramp.length - 1, (v * ramp.length) | 0)];
          if(glintX != null && Math.abs(x - glintX) < 1.6) col = glint;
          // T212/T214 — a static CORRUPTION pass on the void line: deterministic
          // dropped + displaced cells AND ordered-Bayer transparency dither, so the
          // lettering dissolves in patches (half-there/glitchy) — still legible. Gold
          // line: corrupt=false → solid.
          let ox = x, oy = y, alpha = 1;
          if(corrupt){
            const hsh = ((x * 73856093) ^ (y * 19349663)) >>> 0, r = hsh % 100;
            if(r < 12) continue;                                 // ~12% dropped cells (glitch holes)
            else if(r < 28) ox += ((hsh >> 5) & 1) ? 1 : -1;     // ~16% displaced ±1 cell
            if(BAYER4[y & 3][x & 3] >= 11) alpha = 0.4;          // ordered transparency dither (~31% half-there)
          }
          d.fillStyle = alpha < 1 ? "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + alpha + ")"
                                  : "rgb(" + col[0] + "," + col[1] + "," + col[2] + ")";
          d.fillRect(ox * PX, oy * PX, PX, PX);
        }
      };
      draw(null);
      el.innerHTML = ""; el.appendChild(disp);
      // throttled glint: a ~0.6s sweep every ~5s, animated only DURING the sweep (idle
      // via setTimeout between), and only while the entry splash is showing.
      if(glint && !prefersReducedMotion() && typeof requestAnimationFrame === "function"){
        const onEntry = () => { try{ return screens.entry && screens.entry.classList.contains("active"); }catch(e){ return false; } };
        const sweep = () => {
          if(!onEntry()){ setTimeout(sweep, 3000); return; }
          const dur = 600, t0 = (performance && performance.now) ? performance.now() : Date.now();
          (function step(){
            const now = (performance && performance.now) ? performance.now() : Date.now(), e = now - t0;
            if(e >= dur){ draw(null); setTimeout(sweep, 4200 + Math.random() * 2000); return; }
            draw((e / dur) * w); requestAnimationFrame(step);
          })();
        };
        setTimeout(sweep, 1800 + Math.random() * 1500);
      }
    }catch(e){ /* keep the plain CSS text on any failure */ }
  }
  // Stylise the entry title pair (gold wordmark + void subtitle); re-runs once fonts
  // load so the pixel shapes use the real display face, not a fallback.
  function renderTitles(){
    const e = screens.entry; if(!e) return;
    paintPixelTitle(e.querySelector(".brand"), TITLE_GOLD, TITLE_GOLD_GLINT, false);   // gold: clean + glint
    paintPixelTitle(e.querySelector(".subtitle"), TITLE_VOID, null, true);             // void: corrupted/glitchy, no glint (T212)
  }

  // Mint the favicon / home-screen icon from the same pixel renderer: draw the
  // "x/2" mark, dark-bg-padded, onto an offscreen canvas and wire it up as a
  // data-URL <link rel="icon"> (+ apple-touch-icon + theme-color) at runtime.
  // T194 — the browser favicon = the app icon = MAGNAR (hero `mo`, Brawn), so the
  // tab/bookmark matches the installed launcher icon (scripts/geticon.js commits the
  // static PNGs the manifest points at; this draws the same composition at runtime).
  // Magnar's pixel portrait, nearest-neighbour, in the central ~80% safe zone on the
  // full-bleed brand-violet field (= the committed icon-512/192.png + the Emblems bg).
  const ICON_HERO = "hero:mo", ICON_BRAND_BG = "#1a102e", ICON_SAFE = 0.80;
  function paintAppIcon(cv){
    const cx = cv.getContext && cv.getContext("2d"); if(!cx || !C.iconColorGrid) return false;
    const size = cv.width, grid = C.iconColorGrid(ICON_HERO, HERO_PAL.Brawn, "familiar"), G = grid.length;
    cx.fillStyle = ICON_BRAND_BG; cx.fillRect(0, 0, size, size);
    const scale = Math.max(1, Math.floor((size * ICON_SAFE) / G)), off = Math.floor((size - scale * G) / 2);
    for(let gy = 0; gy < G; gy++) for(let gx = 0; gx < G; gx++){
      const hex = grid[gy][gx]; if(!hex) continue;
      cx.fillStyle = hex; cx.fillRect(off + gx * scale, off + gy * scale, scale, scale);
    }
    return true;
  }
  function installFavicon(){
    if(!document.createElement) return;
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    if(!paintAppIcon(cv)) return;
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
          '<span class="holder">'+ic("lock")+' '+unlockReq(m)+'</span></span>'+
          '<span class="go">'+ic("lock")+'</span></div>';
      }
      const best = loadBoard(m.id).slice().sort(rank)[0];
      // Unlocked but never played: muted, hollow dot, still tappable to play.
      if(!best){
        return '<div class="sum-row notplayed" data-mode="'+esc(m.id)+'">'+
          '<span class="md">'+esc(m.name)+
            '<span class="holder"><i class="rankdot empty"></i>Not played</span></span>'+
          '<span class="sc">—</span><span class="tm">—</span><span class="go">'+ic("play")+'</span></div>';
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
        '<span class="tm">'+fmt(best.time)+'s</span><span class="go">'+ic("play")+'</span></div>';
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
          cells+'<span class="go">'+ic("play")+'</span></div>';
      }
      const days = Ev.daysUntilLive(e.id);
      const when = days === 1 ? "Live tomorrow" : ("Live in " + days + " days");
      return '<div class="sum-row event locked">'+
        '<span class="md">'+esc(e.name)+'<span class="holder">'+ic("lock")+' '+esc(when)+'</span></span>'+
        cells+'<span class="go">'+ic("lock")+'</span></div>';
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
      if(it.emblem && window.Emblems) window.Emblems.draw(cell.querySelector("canvas"), it.emblem);   // T206 — emblem awards
      else C.drawIcon(cell.querySelector("canvas"), it.id, C.paletteFor(it.rarity));
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
    openModal(title, items, n > 4);
    fxCelebrate(items, $("unlockGrid"));   // T152: emit FROM the unlock card, in the rarity colour
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
    { id:"loot",   label:"Loot" },
    { id:"codex",  label:"Codex" }
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
        '<span class="tp-state">'+(isDone ? ic("check") : "")+'</span></div>'+
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

  // ---- Codex (T179) — a bestiary tab: every Beast (region×type), region Boss,
  // Realm and daily Event the player has ENCOUNTERED, reusing B's Monsters/Scenery/
  // EventArt generators. Undiscovered entries show as a dark SILHOUETTE (CSS-filtered
  // off the real sprite) named "???" — the classic "keep playing to reveal it" tease.
  const CODEX_TYPES = ["Brawn", "Cunning", "Arcane"];
  // One Codex cell: always carries the canvas (drawn for owned AND locked; CSS
  // silhouettes the locked). `data` describes what to draw; `enc` = encountered.
  // `name`/`sub` ride along as data-cname/data-sub so the detail popup (T187) can
  // render the name + a category/where-found line straight off the tapped cell.
  function codexCell(name, sub, enc, w, h, data){
    const full = Object.assign({ cname: name, sub: sub }, data);
    const attrs = Object.keys(full).map(k => ' data-' + k + '="' + esc(String(full[k])) + '"').join("");
    return '<div class="inv-cell codex-cell ' + (enc ? "owned" : "locked") + '"' + attrs + '>' +
      '<canvas class="pix" width="' + w + '" height="' + h + '"></canvas>' +
      '<span class="inv-name">' + esc(enc ? name : "???") + '</span></div>';
  }
  function codexGroup(title, cells, got, total){
    if(!cells.length) return "";
    return '<div class="inv-cat"><h4>' + esc(title) + ' <span>' + got + '/' + total + '</span></h4>' +
      '<div class="inv-grid codex-grid">' + cells.join("") + '</div></div>';
  }
  // Build the four Codex sections from the LIVE Arena ladder + event roster. An entry
  // is "encountered" once the player has REACHED it (the next-unbeaten tier has
  // advanced to/past it), or — for events — once any of its rewards is owned.
  function invCodexHtml(col){
    const E = window.Enemies, Ev = window.Events;
    const RS = (E && E.REGION_SIZE) || 12, TC = (E && E.TIER_COUNT) || 120, regions = Math.floor(TC / RS);
    const reached = (E && E.currentTier) ? E.currentTier(col).n : 1;   // highest tier faced
    const rLabel = r => (E && E.regionLabel) ? E.regionLabel(r) : ("Region " + (r + 1));
    // Beasts — region × type, drawn from the first non-boss tier of that type in the
    // region (so the sprite matches what the player actually meets there).
    const beasts = []; let bGot = 0;
    for(let r = 0; r < regions; r++) for(const t of CODEX_TYPES){
      let rep = -1; for(let n = r * RS + 1; n <= r * RS + RS - 1; n++){ const ti = E && E.byTier(n); if(ti && ti.type === t){ rep = n; break; } }
      if(rep < 0) continue;
      const enc = reached >= rep; if(enc) bGot++;
      beasts.push(codexCell(rLabel(r) + " · " + t, "Beast · " + t + " · " + rLabel(r), enc, 48, 48, { codex:"beast", n:rep, type:t }));
    }
    // Bosses — the region boss at every RSth tier (Monsters draws the crown).
    const bosses = []; let boGot = 0;
    for(let r = 0; r < regions; r++){ const n = (r + 1) * RS, ti = E && E.byTier(n);
      const enc = reached >= n; if(enc) boGot++;
      bosses.push(codexCell((ti && ti.name) || ("Boss " + (r + 1)), "Boss · " + rLabel(r) + " · " + ((ti && ti.type) || "Brawn"), enc, 48, 48, { codex:"boss", n:n, type:(ti && ti.type) || "Brawn" }));
    }
    // Realms — the 10 region backdrops, full-lit (no battle scrim) in the gallery.
    const realms = []; let rGot = 0;
    for(let r = 0; r < regions; r++){ const enc = reached >= r * RS + 1; if(enc) rGot++;
      realms.push(codexCell(rLabel(r), "Realm · region " + (r + 1) + " of " + regions, enc, 72, 28, { codex:"realm", region:r })); }
    // Events — the daily-event roster; encountered once any reward tier is owned.
    const events = []; let eGot = 0;
    const roster = (Ev && Ev.roster) ? Ev.roster() : [];
    roster.forEach(ev => {
      const enc = Object.keys(col).some(k => k.indexOf("event:" + ev.id) === 0); if(enc) eGot++;
      events.push(codexCell(ev.name, "Daily event" + (ev.rarity ? " · " + ev.rarity : ""), enc, 48, 32, { codex:"event", seed:ev.artSeed }));
    });
    // (T206 — the Emblems Codex section was removed: B's 3 creature emblems are now
    //  Collector awards in the Inventory ▸ Awards tab, not a Codex gallery.)
    const totGot = bGot + boGot + rGot + eGot, totAll = beasts.length + bosses.length + realms.length + events.length;
    const bars = [["Beasts", bGot, beasts.length], ["Bosses", boGot, bosses.length],
                  ["Realms", rGot, realms.length], ["Events", eGot, events.length]]
      .map(s => invBarRow(s[0], s[1], s[2])).join("");
    const block = '<div class="inv-cat"><h4>Codex <span>' + totGot + '/' + totAll + ' discovered</span></h4>' +
      '<div class="topic-prog">' + bars + '</div></div>';
    return block +
      codexGroup("Beasts", beasts, bGot, beasts.length) +
      codexGroup("Bosses", bosses, boGot, bosses.length) +
      codexGroup("Realms", realms, rGot, realms.length) +
      codexGroup("Events", events, eGot, events.length);
  }
  // Paint a COLS×ROWS hex-colour grid into a canvas, full-bleed (no scrim) — the
  // Codex realm thumbnails (Scenery.buildGrid) shown "full-lit".
  function paintCodexGrid(cv, grid){
    const cx = cv.getContext ? cv.getContext("2d") : null; if(!cx || !grid || !grid.length) return;
    const rows = grid.length, cols = grid[0].length, sx = cv.width / cols, sy = cv.height / rows;
    if(cx.imageSmoothingEnabled != null) cx.imageSmoothingEnabled = false;
    for(let y = 0; y < rows; y++) for(let x = 0; x < cols; x++){
      cx.fillStyle = grid[y][x];
      cx.fillRect(Math.floor(x * sx), Math.floor(y * sy), Math.ceil(sx), Math.ceil(sy));
    }
  }
  // Draw one Codex sprite into a canvas from its `data-*` (the right generator).
  function drawCodexInto(cv, d){
    const M = window.Monsters, S = window.Scenery, EA = window.EventArt;
    try{
      if((d.codex === "beast" || d.codex === "boss") && M) M.draw(cv, { n:+d.n, name:"", type:d.type });
      else if(d.codex === "realm" && S && S.buildGrid) paintCodexGrid(cv, S.buildGrid(+d.region));
      else if(d.codex === "event" && EA) EA.draw(cv, +d.seed);
    }catch(e){}
  }
  function drawCodexCanvases(){
    $("invList").querySelectorAll(".codex-cell canvas").forEach(cv => drawCodexInto(cv, cv.parentElement.dataset));
  }
  // T187 — tapping a Codex cell opens a DETAIL popup (reusing the #unlockModal chrome):
  // the enlarged art (re-drawn off the cell's data-*), the name, and a category /
  // where-found line. Owned → full detail; locked → the "???" tease (silhouetted art).
  const CODEX_TITLE = { beast:"Beast", boss:"Boss", realm:"Realm", event:"Event", emblem:"Emblem" };
  function openCodexDetail(cell){
    const d = cell.dataset, owned = cell.classList.contains("owned");
    $("unlockTitle").textContent = CODEX_TITLE[d.codex] || "Codex";
    const grid = $("unlockGrid"); grid.className = "unlock-grid"; grid.innerHTML = "";
    const wide = d.codex === "realm";
    const w = wide ? 196 : 128, h = wide ? 76 : (d.codex === "event" ? 86 : 128);
    const wrap = document.createElement("div");
    wrap.className = "u-cell codex-detail" + (owned ? "" : " locked");
    wrap.innerHTML = '<canvas class="pix" width="' + w + '" height="' + h + '"></canvas>' +
      '<div class="u-name">' + esc(owned ? (d.cname || "") : "???") + '</div>' +
      '<div class="u-desc">' + esc(owned ? (d.sub || "") : "Keep playing to discover this.") + '</div>';
    grid.appendChild(wrap);
    drawCodexInto(wrap.querySelector("canvas"), d);   // locked → the .codex-detail.locked CSS silhouettes it
    const m = $("unlockModal"); m.classList.remove("hidden");
    if(typeof requestAnimationFrame === "function") requestAnimationFrame(() => m.classList.add("show")); else m.classList.add("show");
  }
  function drawInvCanvases(){
    $("invList").querySelectorAll(".inv-cell.owned canvas").forEach(cv => {
      const it = C.byId(cv.parentElement.dataset.id);
      if(!it) return;
      // T206 — emblem Collector awards render from window.Emblems (fit-to-cell, T205)
      if(it.emblem && window.Emblems) window.Emblems.draw(cv, it.emblem);
      else C.drawIcon(cv, it.id, C.paletteFor(it.rarity));
    });
  }
  function renderInvTabs(){
    $("invTabs").innerHTML = INV_TABS.map(t =>
      '<button class="inv-tab'+(t.id === invTab ? " active" : "")+'" data-tab="'+esc(t.id)+'">'+esc(t.label)+'</button>').join("");
  }
  // Lazy render: only the ACTIVE tab's tiles go into the DOM (the 250 Loot tiles
  // cost nothing until the Loot tab is opened).
  function renderInvTab(){
    const col = viewCol();
    $("invList").innerHTML = invTab === "loot"   ? invLootHtml(col)
                           : invTab === "awards" ? invAwardsHtml(col)
                           : invTab === "events" ? invEventsHtml(col)
                           : invTab === "codex"  ? invCodexHtml(col)
                           :                       invTopicsHtml(col);
    if(invTab === "codex") drawCodexCanvases(); else drawInvCanvases();
    $("invList").scrollTop = 0;
    updateInvTop();
  }
  // jump-to-top: reveal the floating control once the list is scrolled down.
  function updateInvTop(){
    const btn = $("invTop"); if(!btn) return;
    btn.classList.toggle("show", $("invList").scrollTop > 200);
  }
  function renderInventory(){
    const col = viewCol();
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
        '<div class="hero-hint">'+ic("lock")+' '+esc(h.unlockHint)+'</div></div></div>';
    }
    const st = Hs.effectiveStats(h, col), rating = Math.round(Hs.rating(h, col));
    const owned = C.CATALOG.filter(it => col[it.id] && it.boost && it.boost.hero === h.id).length;
    // Compact list card — full boost list lives in the tappable detail view (T67).
    return '<div class="hero-card unlocked t-'+h.type.toLowerCase()+'" data-hero="'+esc(h.id)+'">'+
      '<div class="hero-port"><canvas class="pix" width="48" height="48"></canvas></div>'+
      '<div class="hero-info">'+
        '<div class="hero-name"><span class="hn"><i class="typedot"></i>'+esc(h.name)+'</span><span class="hero-rating">'+ic("star")+' '+rating+'</span></div>'+
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
    const h = Hs.byId(id), col = viewCol();
    if(!h || !Hs.isHeroUnlocked(h, col)) return false;   // only unlocked heroes have a detail
    const st = Hs.effectiveStats(h, col), rating = Math.round(Hs.rating(h, col));
    const all = C.CATALOG.filter(it => it.boost && it.boost.hero === h.id);
    const owned = all.filter(it => col[it.id]);
    $("hdHead").className = "hd-head t-" + h.type.toLowerCase();
    $("hdName").innerHTML = '<span class="hn"><i class="typedot"></i>'+esc(h.name)+'</span>'+
      '<span class="hd-type">'+esc(h.type)+'</span><span class="hero-rating">'+ic("star")+' '+rating+'</span>';
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
    const col = viewCol();
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
  // T89 — Arena 3v3: the player fields a PARTY of 1–3 owned heroes (ordered by
  // pick) vs the tier's 3-foe enemy team; the fight resolves through the T88
  // deterministic team sim (Enemies.teamBattle). `arenaParty` holds hero ids.
  const PARTY_MAX = 3;
  let arenaParty = [], lastBattle = null, practiceCtx = null, arenaMapOpen = false, eventCtx = null, introCtx = false;

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
  // compact matchup glyph (T89 enemy-team chips) — the party's edge vs that foe
  function muTag(mu){ return mu > 1 ? '<span class="mu adv">▲</span>' : mu < 1 ? '<span class="mu weak">▼</span>' : '<span class="mu neu">●</span>'; }
  function renderArena(){
    const E = window.Enemies, Hs = window.Heroes;
    if(!E || !Hs){ $("arenaBody").innerHTML = ""; return; }
    const col = loadCollected();
    const tier = E.currentTier(col);
    const cleared = !!col["tier:" + E.TIER_COUNT];
    $("arenaMeta").textContent = cleared ? "Cleared!" : ("Tier " + tier.n + " / " + E.TIER_COUNT);

    const heroes = Hs.HEROES.filter(h => Hs.isHeroUnlocked(h, col));
    // keep the party valid: only OWNED heroes, never more than the cap (T89)
    arenaParty = arenaParty.filter(id => heroes.some(h => h.id === id)).slice(0, PARTY_MAX);

    let html = "";
    if(lastBattle){
      const r = lastBattle;
      // T89: the party + the full enemy team, then the team-sim outcome summary.
      const partyPorts = r.party.map(p => '<canvas class="pix ar-port" width="44" height="44" data-hero="'+esc(p.id)+'" data-type="'+esc(p.type||"Brawn")+'"></canvas>').join("");
      const foePorts = r.foes.map(f => '<canvas class="pix ar-enemy" width="44" height="44" data-tier="'+(f.tierN||1)+'" data-tname="'+esc(f.name)+'" data-ttype="'+esc(f.type||"Brawn")+'"></canvas>').join("");
      const survived = r.res.heroesAlive, sent = r.party.length;
      html += '<div class="arena-result '+(r.won ? "win" : "loss")+'">'+
        '<div class="ar-port-row"><span class="ar-side">'+partyPorts+'</span>'+
          '<span class="ar-vs">vs</span>'+
          '<span class="ar-side foe">'+foePorts+'</span></div>'+
        '<div class="ar-title">'+(r.won ? "Victory!" : "Defeated")+'</div>'+
        '<div class="ar-sub">'+esc(r.party.map(p => p.name).join(" + "))+' vs '+esc(r.tierName)+(r.foes.length > 1 ? ' +'+(r.foes.length-1) : '')+'</div>'+
        '<div class="ar-maths">'+ic("swords")+' '+survived+'/'+sent+' '+(survived === 1 ? "hero" : "heroes")+' standing · '+r.res.foesAlive+'/'+r.foes.length+' foes left · '+r.res.rounds+' rounds</div>'+
        (r.won ? "" : '<div class="ar-hint">Your party fell — collect more buffs (drill the topics), bring more heroes, or field advantage types.</div>')+
        (r.regionCleared ? '<div class="ar-region-clear">'+ic("flag")+' Region conquered! Next: '+esc(r.regionCleared)+'</div>' : '')+
        (r.goldEarn > 0 ? '<div class="ar-gold">'+ic("coin")+' +'+esc(fmtGold(r.goldEarn))+' '+esc(GOLD_LABEL)+'</div>' : '')+
        (r.newHeroes.length ? '<div class="ar-new">'+ic("star")+' New hero: '+r.newHeroes.map(esc).join(", ")+'!</div>' : '')+
        '</div>';
    }
    // ---- wayfinding helpers (T68) — all from the Enemies region API ----
    const RS = E.REGION_SIZE || 12, REGIONS = Math.ceil(E.TIER_COUNT / RS);
    const bossTierOf = r => Math.min((r + 1) * RS, E.TIER_COUNT);
    const bossNameOf = r => E.byTier(bossTierOf(r)).name;
    const conquered = r => !!col["tier:" + bossTierOf(r)];
    // a journey-map toggle is available whenever you're still climbing
    html += '<button class="arena-map-btn" id="arenaMapBtn">'+(arenaMapOpen ? "▾ Hide journey map" : ic("map")+" Journey map")+'</button>';
    if(arenaMapOpen){
      html += '<div class="arena-map">'+Array.from({length:REGIONS}, (_, r) => {
        const isCur = !cleared && r === E.tierRegion(tier.n), conq = conquered(r);
        const st = conq ? "done" : isCur ? "cur" : "locked";
        const tag = conq ? ic("check")+" conquered" : isCur ? "you are here" : "locked";
        return '<div class="map-row '+st+'"><i class="row-sq"></i><span class="map-name">'+esc(E.regionLabel(r))+'</span>'+
          '<span class="map-boss">'+ic("swords")+' '+esc(bossNameOf(r))+'</span><span class="map-tag">'+tag+'</span></div>';
      }).join("")+'</div>';
    }
    if(cleared){
      html += '<div class="arena-tier done"><div class="at-name">'+ic("star")+' Arena cleared — you defeated The Void Sovereign!</div>'+
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
        (isBossNow ? '<div class="at-boss now">'+ic("swords")+' Region boss — defeat '+esc(tier.name)+' to conquer '+esc(E.regionLabel(reg))+'</div>'
         : bossNext ? '<div class="at-boss next">'+ic("swords")+' Boss next: '+esc(bossNameOf(reg))+'</div>' : '')+
        '<div class="at-name"><i class="typedot"></i>'+esc(tier.name)+'</div>'+
        '<div class="at-stats"><span class="at-type">'+esc(tier.type)+'</span><span class="at-def">DEF '+tier.def+'</span></div></div>';
      // ---- T89: the full 3-foe enemy team (tier foe + 2 weaker adds) with each
      // foe's BEST matchup vs the chosen party, so you can field advantage types.
      const foes = E.enemyTeamMeta(tier.n);
      const partyHeroes = arenaParty.map(id => Hs.byId(id)).filter(Boolean);
      html += '<div class="arena-foes"><div class="af-head">'+ic("swords")+' Enemy team</div><div class="af-row">';
      foes.forEach(f => {
        const mu = partyHeroes.length ? Math.max.apply(null, partyHeroes.map(h => E.matchup(h.type, f.type))) : 1;
        html += '<div class="af-foe t-'+f.type.toLowerCase()+'">'+
          '<canvas class="pix af-port ar-enemy" width="40" height="40" data-tier="'+f.tierN+'" data-tname="'+esc(f.name)+'" data-ttype="'+esc(f.type)+'"></canvas>'+
          '<div class="af-name">'+esc(f.role === "foe" ? f.name : "Support")+'</div>'+
          '<div class="af-type"><i class="typedot"></i>'+esc(f.type)+(partyHeroes.length ? ' '+muTag(mu) : '')+'</div>'+
          '</div>';
      });
      html += '</div></div>';
      if(!heroes.length){
        html += '<div class="arena-empty">Finish a drill round to unlock your first hero, then return to fight.</div>';
      } else {
        // ---- T89: pick a PARTY of 1–3 owned heroes (tap to add/remove; capped) --
        const cap = Math.min(PARTY_MAX, heroes.length);
        html += '<div class="arena-pick">Choose your party (1–'+cap+') <span class="ap-count">'+arenaParty.length+'/'+cap+'</span></div><div class="arena-heroes">';
        heroes.forEach(h => {
          const rating = Math.round(Hs.rating(h, col)), mu = E.matchup(h.type, tier.type);
          const idx = arenaParty.indexOf(h.id), sel = idx >= 0, blocked = !sel && arenaParty.length >= cap;
          html += '<div class="arena-hero t-'+h.type.toLowerCase()+(sel ? " sel" : "")+(blocked ? " blocked" : "")+'" data-hero="'+esc(h.id)+'">'+
            '<canvas class="pix ah-port" width="40" height="40"></canvas>'+
            (sel ? '<span class="ah-badge">'+(idx + 1)+'</span>' : '')+
            '<div class="ah-body"><div class="ah-top"><span class="ah-name"><i class="typedot"></i>'+esc(h.name)+'</span>'+
              '<span class="ah-rating">'+ic("star")+' '+rating+'</span></div>'+
            '<div class="ah-mu">'+matchupLabel(mu)+'</div></div></div>';
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
    $("arenaBody").querySelectorAll(".ar-port").forEach(rp => {
      if(rp.dataset.hero) C.drawIcon(rp, "hero:"+rp.dataset.hero, HERO_PAL[rp.dataset.type] || HERO_PAL.Brawn, "familiar");
    });
    // enemy sprites (T52) — current-tier card + the result header's foe (static)
    if(window.Monsters) $("arenaBody").querySelectorAll(".at-enemy, .ar-enemy").forEach(cv => {
      window.Monsters.draw(cv, { n: +cv.dataset.tier, name: cv.dataset.tname, type: cv.dataset.ttype });
    });
    // region scenery (T53) — drawn once behind the tier card (static, no RAF)
    if(window.Scenery){ const sc = $("arenaBody").querySelector(".at-scene"); if(sc) window.Scenery.draw(sc, +sc.dataset.region); }
    $("arenaFight").disabled = cleared || !arenaParty.length || !heroes.length;
    $("arenaFight").textContent = cleared ? "Cleared" : (arenaParty.length ? "Fight! ("+arenaParty.length+")" : "Pick your party");
  }

  // Fight resolves through the T88 deterministic team sim (no maths round) — the
  // 1–3 hero party vs the tier's 3-foe enemy team (T89). T90: the resolution is
  // first PLAYED OUT turn-by-turn (a calm, skippable visualisation of the SAME
  // sim), then the result is applied. Reduced-motion / no-RAF → resolve instantly.
  function startBattle(){
    const E = window.Enemies, Hs = window.Heroes, col = loadCollected();
    if(!E || col["tier:" + E.TIER_COUNT]) return;                 // cleared
    const party = arenaParty.filter(id => Hs.isHeroUnlocked(id, col)).slice(0, PARTY_MAX);
    if(!party.length) return;
    const tier = E.currentTier(col);
    const res = E.teamBattleLog(party, tier, col);                // {win,…, units, log}
    if(prefersReducedMotion() || typeof requestAnimationFrame !== "function" || !res.log || !res.log.length)
      finishBattle(party, tier, res);                             // instant (a11y / headless)
    else
      playBattle(party, tier, res);                               // watchable turn-by-turn
  }
  function prefersReducedMotion(){
    try{ return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }catch(e){ return false; }
  }

  // ---- T90: watchable deterministic turn playout --------------------------
  // Visualises the EXACT sim log (Enemies.teamBattleLog) turn by turn — HP bars
  // drain, KOs dim — then reveals the result via finishBattle. Pure visualisation
  // (no new RNG); deterministic; skippable; single cancelable RAF (no leak).
  let playRAF = 0, playToken = 0, pendingPlay = null;
  function cancelPlayout(){
    playToken++;                                   // invalidate any in-flight frame
    if(playRAF && typeof cancelAnimationFrame === "function") cancelAnimationFrame(playRAF);
    playRAF = 0; pendingPlay = null;
  }
  function playBattle(party, tier, res){
    cancelPlayout();
    const Hs = window.Heroes, E = window.Enemies;
    pendingPlay = { party: party, tier: tier, res: res };
    const myToken = playToken;
    const foesMeta = E.enemyTeamMeta(tier.n);
    const maxOf = {};                              // "side:ord" → max HP (for bar %)
    (res.units || []).forEach(u => { maxOf[u.side + ":" + u.ord] = u.maxHp; });
    const unitCell = (u) => {
      const isHero = u.side === 0;
      const disp = isHero ? (Hs.byId(party[u.ord]) || {}) : (foesMeta[u.ord - 100] || {});
      const name = isHero ? (disp.name || party[u.ord]) : (foesMeta[u.ord - 100] && foesMeta[u.ord - 100].role === "foe" ? disp.name : "Support");
      const cv = isHero
        ? '<canvas class="pix bp-port" width="36" height="36" data-hero="'+esc(party[u.ord])+'" data-type="'+esc(disp.type||"Brawn")+'"></canvas>'
        : '<canvas class="pix bp-port ar-enemy" width="36" height="36" data-tier="'+(disp.tierN||1)+'" data-tname="'+esc(disp.name||"")+'" data-ttype="'+esc(disp.type||"Brawn")+'"></canvas>';
      return '<div class="bp-unit t-'+String((disp.type||"Brawn")).toLowerCase()+'" data-side="'+u.side+'" data-ord="'+u.ord+'">'+
        cv+'<div class="bp-hpbar"><i class="bp-hp" style="width:100%"></i></div>'+
        '<div class="bp-uname">'+esc(name)+'</div></div>';
    };
    const heroUnits = (res.units || []).filter(u => u.side === 0).map(unitCell).join("");
    const foeUnits = (res.units || []).filter(u => u.side === 1).map(unitCell).join("");
    $("arenaBody").innerHTML =
      '<div class="battle-play">'+
        '<div class="bp-head">'+ic("swords")+' Battle — '+esc(tier.name)+'</div>'+
        '<div class="bp-teams"><div class="bp-side">'+heroUnits+'</div>'+
          '<div class="bp-vs">vs</div>'+
          '<div class="bp-side foe">'+foeUnits+'</div></div>'+
        '<div class="bp-status">Round 1</div>'+
        '<button class="bp-skip">Skip '+'▸</button>'+
      '</div>';
    // portraits (same draw paths as the rest of the Arena)
    $("arenaBody").querySelectorAll(".bp-unit canvas[data-hero]").forEach(cv => {
      if(cv.dataset.hero) C.drawIcon(cv, "hero:"+cv.dataset.hero, HERO_PAL[cv.dataset.type] || HERO_PAL.Brawn, "familiar");
    });
    if(window.Monsters) $("arenaBody").querySelectorAll(".bp-unit canvas.ar-enemy").forEach(cv => {
      window.Monsters.draw(cv, { n: +cv.dataset.tier, name: cv.dataset.tname, type: cv.dataset.ttype });
    });
    const log = res.log, hpEl = {}, cellEl = {};
    $("arenaBody").querySelectorAll(".bp-unit").forEach(el => {
      const k = el.dataset.side + ":" + el.dataset.ord;
      cellEl[k] = el; hpEl[k] = el.querySelector(".bp-hp");
    });
    const dispName = (side, ord) => side === 0 ? ((window.Heroes.byId(party[ord]) || {}).name || party[ord])
      : (foesMeta[ord - 100] && foesMeta[ord - 100].role === "foe" ? foesMeta[ord - 100].name : "Support");
    function applyEvent(ev){
      const k = ev.tSide + ":" + ev.tOrd, mx = maxOf[k] || 1;
      const bar = hpEl[k]; if(bar) bar.style.width = Math.max(0, Math.min(100, (ev.tHp / mx) * 100)) + "%";
      if(ev.ko && cellEl[k]){
        cellEl[k].classList.add("ko");
        // T160 — a FOE going down gets a small, TIGHT impact burst right at its cell
        // (foe-type colour + impact white), so the kill reads. Localised (spread 0.7),
        // small/fine (FX_SMALL); reduced-motion already skips the whole playout.
        if(ev.tSide === 1){
          const fp = HERO_PAL[(foesMeta[ev.tOrd - 100] || {}).type] || HERO_PAL.Brawn;
          const cc = elCentre(cellEl[k]);
          fxBigBurst({ x: cc.x, y: cc.y, count: 180, seed: (((ev.round | 0) + 1) * 0x9e3779b1 + ev.tOrd) >>> 0,
            palette: [fp.body, fp.accent, "#ffffff"], sizePx: FX_SMALL, spread: 0.7 });
        }
      }
      const st = $("arenaBody").querySelector(".bp-status");
      if(st) st.textContent = dispName(ev.aSide, ev.aOrd) + " hits " + dispName(ev.tSide, ev.tOrd) +
        " for " + ev.dmg + (ev.ko ? " — down!" : "");
    }
    // pace: T160 — slower/calmer than the first cut. ~4s total, floor 130ms/step,
    // ceil 480ms so a short fight isn't a blur and each KO has room to read.
    const STEP_MS = Math.max(130, Math.min(480, Math.round(4000 / log.length)));
    let i = 0, last = -1, acc = 0;
    function frame(ts){
      if(myToken !== playToken) return;            // superseded/cancelled
      // tolerate a missing/garbage timestamp (clamp to one synthetic step) so the
      // loop always makes forward progress and terminates — never spins.
      const t = (typeof ts === "number" && isFinite(ts)) ? ts : (last < 0 ? 0 : last + STEP_MS);
      if(last < 0){ last = t; applyEvent(log[i++]); }              // show the first strike at once
      else { acc += Math.max(0, t - last); last = t; while(acc >= STEP_MS && i < log.length){ applyEvent(log[i++]); acc -= STEP_MS; } }
      if(i >= log.length){ endPlayout(); return; }
      playRAF = requestAnimationFrame(frame);
    }
    playRAF = requestAnimationFrame(frame);
  }
  // Finalise the in-flight playout (natural end OR Skip) → apply + reveal result.
  function endPlayout(){
    const p = pendingPlay; cancelPlayout();
    if(p) finishBattle(p.party, p.tier, p.res);
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

  // Apply a resolved battle: grant the tier + its loot on a win, award gold, and
  // surface the result. `party` is the 1–3 hero-id array; `res` comes from the
  // T88 team sim (Enemies.teamBattle — {win, heroesAlive, foesAlive, rounds}).
  function finishBattle(party, tier, res){
    const E = window.Enemies, Hs = window.Heroes;
    const col = loadCollected();
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
    const partyMeta = party.map(id => { const h = Hs.byId(id) || {}; return { id: id, name: (C.HERO_NAMES && C.HERO_NAMES[id]) || h.name || id, type: h.type || "Brawn" }; });
    lastBattle = { won: res.win, res: res, party: partyMeta, foes: E.enemyTeamMeta(tier.n), tierName: tier.name, tierN: tier.n, tierType: tier.type, loot: loot, newHeroes: newHeroes, regionCleared: regionCleared, goldBefore: goldBefore, goldAfter: loadGold(), goldEarn: earn };
    arenaParty = [];
    renderArena();
    const ab = $("arenaBody"); if(ab) ab.scrollTop = 0;   // T65: show the result + tier, not the hero list
    show("arena");
    if(res.win){ const foe = $("arenaBody") && $("arenaBody").querySelector(".at-enemy, .ar-enemy"); fxCelebrateWin(tier.n, foe); wubSting(); }   // T152: burst from the defeated foe's portrait
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
    if(unlocked.some(it => it.cat === "Mastery" || /^topics:(one|all)100$/.test(it.id))) wubSting();

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
    fxCelebrateRank(rankIdx, $("rankLine"));   // T152: small spray from the rank badge, in the rank colour
    if(mo.wentUp) momentumToast(mo.state);
    if(unlocked.length) setTimeout(() => showUnlocks(unlocked), 650);
  }

  // ---- Goblin Gold display: a ticking counter + a non-blocking "+N" flourish.
  function renderGold(){
    const el = $("goldBar"); if(!el) return;
    el.innerHTML = ic("coin")+' <b>' + esc(fmtGold(loadGold())) + '</b> ' + esc(GOLD_LABEL);
  }
  // ---- Momentum display: a calm start-screen indicator + a gentle ack toast.
  function renderMomentum(){
    const el = $("momentumBar"); if(!el) return;
    const m = loadMomentum();
    el.innerHTML = m.count > 0
      ? ic("calendar")+' <b>' + m.count + '</b> ' + esc(MOMENTUM_LABEL) + (m.count >= MOMENTUM_MAX ? ' · maxed' : '')
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
      '<button class="eb-play" data-event="'+esc(ev.id)+'">'+(got > 0 ? 'Again' : ic("play")+' Play')+'</button>';
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
      t.innerHTML = '<span class="t-glyph">'+ic("calendar")+'</span><div class="t-txt">' +
        '<span class="t-tag">' + esc(MOMENTUM_LABEL) + (state.count >= MOMENTUM_MAX ? " · maxed" : "") + '</span>' +
        '<span class="t-name">' + state.count + ' day' + (state.count === 1 ? '' : 's') + '</span></div>';
      $("toasts").appendChild(t);
      requestAnimationFrame(() => t.classList.add("show"));
      return t;
    }, 1800, 1100);
  }
  function showGold(el, before, after, earned){
    if(!el) return;
    // T173 — coins burst from the gold readout toward the hoard, scaled by the gain.
    if(earned > 0) fxEarnBurst(el, earned);
    el.innerHTML = '<span class="gold-n">'+ic("coin")+' ' + esc(fmtGold(before)) + '</span>' +
      (earned > 0 ? ' <span class="gold-plus">+' + esc(fmtGold(earned)) + '</span>' : '') +
      ' <span class="gold-lbl">' + esc(GOLD_LABEL) + '</span>';
    const numEl = el.querySelector(".gold-n");
    if(after <= before || !numEl){ if(numEl) numEl.innerHTML = ic("coin")+' ' + esc(fmtGold(after)); return; }
    const t0 = performance.now(), dur = 800;
    (function tick(now){
      const k = Math.min(1, (now - t0) / dur);
      const val = before + (after - before) * (k * (2 - k));   // ease-out
      numEl.innerHTML = ic("coin")+' ' + esc(fmtGold(val));
      if(k < 1) requestAnimationFrame(tick); else numEl.innerHTML = ic("coin")+' ' + esc(fmtGold(after));
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
    else if(h === "arena"){ cancelPlayout(); lastBattle = null; arenaParty = []; arenaMapOpen = false; renderArena(); show("arena"); }
    else if(h === "settings"){ renderSettings(); show("settings"); }
    else if(h === "audio"){ renderAudio(); show("audio"); }
    else if(h === "graphics"){ renderGraphics(); show("graphics"); }
    else { checkGates(); renderTree(); renderStartState(); renderGold(); renderMomentum(); renderEventBanner(); applyGates(); show("start"); firePendingHighlight(); }
  }
  function navStart(){ if(location.hash === "#/" || location.hash === "") applyRoute(); else location.hash = "#/"; }
  window.addEventListener("hashchange", applyRoute);

  // ---- T157 + T166: Android system-back navigates our screen stack ----------
  // A standalone PWA / TWA otherwise EXITS the app on the back gesture (our nav
  // is screen-state, not deep web history). T166 rework: the HASH is the single
  // source of truth — forward navs use `location.hash = "#/<screen>"`, so the
  // browser's natural history IS our screen stack and the system back pops it,
  // firing `hashchange` → `applyRoute` routes for us. We do NOT push a sentinel
  // on every screen; the lone setup-time sentinel is purely the EXIT TRAP at
  // home (so the first back at home shows a confirm hint instead of dropping
  // straight out). A popstate WITHOUT a hash change == the user popped past
  // the trail (back from a hashed screen onto the sentinel, or back from the
  // sentinel itself onto the original page-load entry) — that's the exit
  // attempt, which we trap once. Inert where there's no History API.
  // The `lastSeenHash` flag lets popstate distinguish a routed pop (URL
  // changed → applyRoute will handle it) from an exit pop (URL unchanged).
  let backInstalled = false, backExitArmed = false, lastSeenHash = "";
  function backExitHint(){
    try{
      const host = $("toasts"); if(!host) return;
      const t = document.createElement("div");
      t.className = "toast"; t.innerHTML = '<div class="t-txt"><span class="t-name">Press back again to exit</span></div>';
      host.appendChild(t);
      setTimeout(() => { try{ t.remove(); }catch(e){} }, 2000);
    }catch(e){}
  }
  (function setupBackNav(){
    if(typeof history === "undefined" || !history.pushState || !window.addEventListener) return;
    try{
      backInstalled = true;
      lastSeenHash = location.hash || "";
      // ONE trailing sentinel — solely the home-exit trap. Forward navs do NOT
      // push more; back-from-screens just lets the browser pop the hash chain.
      history.pushState({ hb: 1 }, "");
      // Whenever the user navigates (forward OR backward via hash), refresh the
      // seen-hash so popstate can compare against the new state. hashchange
      // already drives applyRoute (set above), so this is purely bookkeeping.
      window.addEventListener("hashchange", () => { lastSeenHash = location.hash || ""; });
      window.addEventListener("popstate", () => {
        const cur = location.hash || "";
        if(cur !== lastSeenHash){
          // URL changed → a hashchange will route us via applyRoute. Just track.
          lastSeenHash = cur;
          return;
        }
        // URL unchanged → the user popped past the routed entries (the sentinel
        // or pre-app entry) → treat as an exit attempt. Trap the first one with
        // a confirm hint + re-push the sentinel; the second within 2s exits.
        if(!backExitArmed){
          backExitArmed = true;
          backExitHint();
          try{ history.pushState({ hb: 1 }, ""); }catch(e){}
          setTimeout(() => { backExitArmed = false; }, 2000);
        }
        // else: leave history alone — the next back will exit the app naturally.
      });
    }catch(e){ backInstalled = false; }
  })();

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
    if(e.target.closest(".bp-skip")){ endPlayout(); return; }   // T90: skip the playout → result
    if(e.target.closest(".arena-map-btn")){ arenaMapOpen = !arenaMapOpen; renderArena(); return; }
    const card = e.target.closest(".arena-hero"); if(!card) return;
    // T89: tap toggles a hero in/out of the party; adding is capped at PARTY_MAX,
    // removing is always allowed (so you can swap once the party is full).
    const id = card.dataset.hero, at = arenaParty.indexOf(id);
    if(at >= 0) arenaParty.splice(at, 1);
    else if(arenaParty.length < PARTY_MAX) arenaParty.push(id);
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
    if(cell.classList.contains("codex-cell")){ openCodexDetail(cell); return; }   // T187 — Codex detail popup
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
  // T156 — are we running as an INSTALLED / standalone app (TWA / installed PWA)?
  // Such a launch is already locked fullscreen with no browser chrome, so the
  // in-app fullscreen affordances are redundant (they stay in a plain browser tab).
  function isInstalledDisplay(){
    try{
      return !!((window.matchMedia &&
        (window.matchMedia("(display-mode: standalone)").matches ||
         window.matchMedia("(display-mode: fullscreen)").matches)) ||
        (typeof navigator !== "undefined" && navigator.standalone === true));
    }catch(e){ return false; }
  }

  // In-menu fullscreen toggle (T18) — hidden where unsupported.
  // T146 — the fullscreen toggle now lives INSIDE Settings (the home nav button was
  // removed). Same behaviour: enter/exit fullscreen, label reflects the state.
  (function setupFullscreenBtn(){
    const btn = $("fsToggle"); if(!btn) return;
    // T177 — KEEP the manual Setup toggle in the installed PWA too. (T156 hid it
    // when installed, assuming "installed == always fullscreen" — but a PWA DROPS
    // fullscreen on minimise, so the owner got stuck windowed with no way back.
    // The toggle is the explicit fallback; the entry #entryFs button stays hidden.)
    if(!fsSupported()){ btn.classList.add("hidden"); return; }
    const sync = () => { const lbl = $("fsToggleVal");
      if(lbl) lbl.textContent = fsActive() ? 'Exit' : 'Enter'; };
    btn.addEventListener("click", () => { fsActive() ? fsExit() : fsEnter(); sync(); });
    ["fullscreenchange","webkitfullscreenchange","mozfullscreenchange","MSFullscreenChange"]
      .forEach(ev => document.addEventListener(ev, sync));
    sync();
  })();
  // T177 — a standalone PWA DROPS JS fullscreen when minimised and can't re-enter
  // without a user gesture. On returning to an installed app that WAS fullscreen,
  // arm a ONE-SHOT: the next tap (the user always taps to resume play) silently
  // re-enters fullscreen — no visible button needed. (The Setup toggle above is the
  // explicit fallback; the robust fix is the TWA's immersive-sticky mode — T168.)
  (function setupFsResume(){
    if(typeof document === "undefined" || !document.addEventListener) return;
    let wasFs = false;
    document.addEventListener("visibilitychange", function(){
      try{
        if(document.hidden){ wasFs = fsActive(); return; }            // remember if we were fullscreen
        if(!isInstalledDisplay() || !wasFs || fsActive()) return;     // only re-arm when installed + we LOST it
        if(!window.addEventListener) return;
        const reenter = () => { window.removeEventListener("pointerdown", reenter, true); try{ fsEnter(); }catch(e){} };
        window.addEventListener("pointerdown", reenter, true);        // one-shot, capture phase
      }catch(e){}
    });
  })();

  // ---- sound preference (persisted) + SFX engine (window.Sound) -----------
  function soundOn(){ try{ return localStorage.getItem("halves.sound") !== "off"; }catch(e){ return true; } }
  function saveSound(on){ try{ localStorage.setItem("halves.sound", on ? "on" : "off"); }catch(e){} }
  // Unlock the audio engines WITHOUT (re)starting/routing the music — used by the
  // celebration tester + slider previews so they don't restart the song (T143(4)).
  // Applies the calibrated Music + SFX volumes so they're right from the first gesture.
  function ensureAudioReady(){
    if(window.Sound && window.Sound.unlock) window.Sound.unlock();
    setupSynth();
    if(window.Sound && window.Sound.setSfxVolume) window.Sound.setSfxVolume(loadSfxVol() / 100);
    setMusicVolume(loadMusicVol());
  }
  // T159 — the shared AudioContext (sound.js owns it; Synth mounts on it).
  function audioCtx(){ try{ return (window.Sound && window.Sound.ctx && window.Sound.ctx()) || null; }catch(e){ return null; } }
  // running == safe to schedule a note. A suspended/garbage (sampleRate 0) context
  // is NOT — scheduling into it is what produced the foghorn drone on resume.
  function ctxRunning(){ const c = audioCtx(); return !!(c && c.state === "running" && c.sampleRate !== 0); }
  let resumePending = false;
  // Start the music ONLY once the context is actually running. If it's suspended
  // (cold start / returning from an app-switch), resume it first and start on the
  // resolve — never into a not-yet-running context. Idempotent: a re-entrant call
  // while a resume is in flight is a no-op (no stacked second start / drone).
  function startMusicWhenRunning(){
    if(!soundOn()) return;
    const c = audioCtx();
    if(!c){ musicForScreen(curScreen); return; }              // no Sound ctx (headless/Synth-only) → best effort
    if(c.state === "running"){ musicForScreen(curScreen); return; }
    if(c.state === "suspended" && c.resume && !resumePending){
      resumePending = true;
      try{
        const p = c.resume();
        const begin = () => { resumePending = false; if(soundOn() && ctxRunning()) musicForScreen(curScreen); };
        if(p && p.then) p.then(begin, () => { resumePending = false; }); else begin();
      }catch(e){ resumePending = false; }
    }
  }
  // On an app-switch / visibility resume: drop any voice/reverb tail that survived
  // the suspend (a clean slate) BEFORE re-syncing, so nothing blasts on resume.
  function resyncMusic(){
    const Sy = window.Synth; if(!Sy || !synthWired) return;
    try{ if(Sy.stop) Sy.stop(); }catch(e){}
    curMusicKey = null;   // T164: stop ⇒ no track is playing; the next start must re-key
    startMusicWhenRunning();
  }
  // The user-gesture unlock: ready the engines and START music if it isn't already
  // playing (so it never RESTARTS mid-interaction — a drag/tap won't re-trigger it).
  function audioUnlock(){
    ensureAudioReady();
    const playing = window.Synth && window.Synth.musicPlaying && window.Synth.musicPlaying();
    if(!playing) startMusicWhenRunning();
  }
  function applySoundPref(){ const on = soundOn(); if(window.Sound && window.Sound.setMuted) window.Sound.setMuted(!on); if(window.Synth && window.Synth.setMuted) window.Synth.setMuted(!on); applyAudioPrefs(); }
  // T143 — SEPARATE Music + SFX volumes (the owner's "sounds are getting lost under
  // the music"). Both stored 0–10 (→ gain/100, limiter-safe). MUSIC default 5
  // (0.05×, the loud synth); SFX default higher (8 → 0.08×) so blips sit over the
  // music. Migrate the old single `halves.vol`: a stale OLD-scale value (>10, e.g.
  // 300=3.0×) → the new defaults; a valid in-range one → the music level. Tempo
  // stored 40–100 (→ ×0.40..1.00), default 50. A saved pref otherwise wins.
  function migVol(){ const v = parseInt(localStorage.getItem("halves.vol"), 10); return (isFinite(v) && v >= 0 && v <= 10) ? v : null; }
  function loadMusicVol(){ const v = parseInt(localStorage.getItem("halves.musicVol"), 10); if(isFinite(v) && v >= 0 && v <= 10) return v; const m = migVol(); return m == null ? 5 : m; }
  // T148 — the SFX slider now maps to the REAL SFX range (0→SFX_MAX=1.0× via /100,
  // not the music's 0.10× scale): the sfxBus had ~10× unused headroom, so SFX were
  // way too quiet. Stored under a new 0–100 key (`halves.sfxLvl`); migrate T143's old
  // 0–10 `halves.sfxVol` ×10 so returning users get the louder mapping (not 8/100).
  // Louder default 60 (0.60×) — SFX clearly cut over the music; limiter keeps it safe.
  function loadSfxVol(){
    const v = parseInt(localStorage.getItem("halves.sfxLvl"), 10);
    if(isFinite(v) && v >= 0 && v <= 100) return v;
    const old = parseInt(localStorage.getItem("halves.sfxVol"), 10);   // T143's 0–10 → ×10 to the new 0–100 scale
    if(isFinite(old) && old >= 0 && old <= 10) return Math.min(100, old * 10);
    return 60;
  }
  function loadTempo(){ const v = parseInt(localStorage.getItem("halves.tempo"), 10); return isFinite(v) ? v : 50; }
  function saveMusicVol(v){ try{ localStorage.setItem("halves.musicVol", String(v)); }catch(e){} }
  function saveSfxVol(v){ try{ localStorage.setItem("halves.sfxLvl", String(v)); }catch(e){} }
  function saveTempo(v){ try{ localStorage.setItem("halves.tempo", String(v)); }catch(e){} }
  function applyAudioPrefs(){
    const S = window.Sound; if(S && S.setSfxVolume) S.setSfxVolume(loadSfxVol() / 100);   // SFX bus
    setMusicVolume(loadMusicVol());                                                       // music gain
    musicForScreen(curScreen);   // re-derive the current context at the new tempo
  }
  // Guarded SFX trigger — a no-op if the engine is absent or muted.
  const DUCK_SFX = { item:1, gold:1, mastery:1, topic100:1, topicUnlock:1 };
  function sfx(name, arg){ const S = window.Sound; if(S && S[name]) S[name](arg); if(DUCK_SFX[name] && window.Synth && window.Synth.duck) window.Synth.duck(); }
  // The sound state (T143/T146): the ENTRY button toggles mute; the home Sound nav
  // button is gone — audio is a sub-menu of Setup now (the mute toggle lives inside).
  function syncSoundButtons(){
    const on = soundOn();
    const sb = $("soundBtn"); if(sb) sb.innerHTML = ic(on ? "soundOn" : "soundOff")+' Sound '+(on ? 'on' : 'off');   // entry screen
    const sv = $("setSoundVal"); if(sv) sv.textContent = on ? "On" : "Off";                 // the Audio-menu mute row
  }
  function toggleSound(){ saveSound(!soundOn()); syncSoundButtons(); applySoundPref(); }
  { const sb = $("soundBtn"); if(sb) sb.addEventListener("click", toggleSound); }                         // entry → toggle mute

  // ---- Settings + Audio menus (T85/T143) + "Clear all data" --------------------
  function fmtVol(slider){ return (slider / 100).toFixed(2) + "×"; }
  function fmtTempo(slider){ return (slider / 100).toFixed(2) + "×"; }
  function renderSettings(){ syncSoundButtons(); }
  function renderAudio(){
    syncSoundButtons();
    const mr = $("musicVolRange"), sr = $("sfxVolRange"), tr = $("tempoRange");
    if(mr){ mr.value = loadMusicVol(); const v = $("setMusicVolVal"); if(v) v.textContent = fmtVol(loadMusicVol()); }
    if(sr){ sr.value = loadSfxVol(); const v = $("setSfxVolVal"); if(v) v.textContent = fmtVol(loadSfxVol()); }
    if(tr){ tr.value = loadTempo(); const v = $("setTempoVal"); if(v) v.textContent = fmtTempo(loadTempo()); }
    musicPreview = null; syncMusicSwitch();   // T129: fresh entry → "Auto" (per-screen music), nothing pre-selected
  }
  // T129 — the music switcher: reflect the picked style (or "Auto").
  const MUSIC_LABELS = { menu: "Menu", solve: "Solve", arena: "Arena", event: "Event" };
  function syncMusicSwitch(){
    const grp = $("musicSwitch"); if(grp && grp.querySelectorAll){
      const btns = grp.querySelectorAll(".mus-btn");
      (btns.forEach ? btns : Array.prototype.slice.call(btns)).forEach(b =>
        b.setAttribute("aria-pressed", b.dataset.music === musicPreview ? "true" : "false"));
    }
    const val = $("setMusicVal"); if(val) val.textContent = musicPreview ? MUSIC_LABELS[musicPreview] : "Auto";
  }
  $("settingsBtn").addEventListener("click", () => { location.hash = "#/settings"; });
  $("settingsBack").addEventListener("click", navStart);
  { const oa = $("openAudio"); if(oa) oa.addEventListener("click", () => { location.hash = "#/audio"; }); }
  { const ab = $("audioBack"); if(ab) ab.addEventListener("click", () => { location.hash = "#/settings"; }); }
  // T147 — the celebration tester is a VISUAL test, so it lives in its own Graphics menu.
  // The "Developer" screen (T184) — the FX/hoard testers (always) + the dev-only
  // gold-setter + reveal-all toggle (shown only in dev mode; the Setup link to here
  // is itself dev-gated, so non-dev users never see these).
  function renderGraphics(){ const v = $("setFxVal"); if(v) v.textContent = "Tap to fire";
    const dg = $("devGoldRow"); if(dg) dg.classList.toggle("hidden", !devMode);
    const rr = $("devRevealRow"); if(rr) rr.classList.toggle("hidden", !devMode);
    syncDevRevealBtn(); }
  function syncDevRevealBtn(){ const b = $("devRevealBtn"); if(b) b.textContent = devReveal ? "On" : "Off"; const v = $("setDevRevealVal"); if(v) v.textContent = devReveal ? "revealing all" : "off"; }
  // A minimal self-contained toast (the dev affordances don't go through the unlock queue).
  function devToast(msg){
    try{
      const host = $("toasts"); if(!host) return;
      const t = document.createElement("div"); t.className = "toast coach";
      t.innerHTML = '<span class="t-glyph">'+ic("sparkles")+'</span><div class="t-txt"><span class="t-tag">Developer</span><span class="t-name">'+esc(msg)+'</span></div>';
      host.appendChild(t); if(typeof requestAnimationFrame === "function") requestAnimationFrame(() => t.classList.add("show")); else t.classList.add("show");
      setTimeout(() => { try{ t.classList.remove("show"); setTimeout(() => t.remove(), 400); }catch(e){} }, 2200);
    }catch(e){}
  }
  // The reveal-all toggle (view-only; persisted so it survives a reload, but the real
  // collection is never written).
  function toggleDevReveal(){
    if(!devMode) return;
    devReveal = !devReveal;
    try{ localStorage.setItem("halves.devReveal", devReveal ? "1" : "0"); }catch(e){}
    syncDevRevealBtn();
    try{ applyGates(); }catch(e){}   // reveal/hide the gated nav as the view changes
    try{ applyRoute(); }catch(e){}   // re-render the current screen with the new view
    devToast(devReveal ? "Revealing all collections" : "Reveal-all off");
  }
  // Enable/disable developer mode (persisted). Surfaces/hides the Setup "Developer"
  // link + opens the gated screens for review; leaving it also clears reveal-all.
  function setDevMode(on){
    devMode = !!on;
    try{ localStorage.setItem("halves.dev", devMode ? "1" : "0"); }catch(e){}
    if(!devMode && devReveal){ devReveal = false; try{ localStorage.setItem("halves.devReveal", "0"); }catch(e){} }
    syncDevUi();
    devToast(devMode ? "Developer mode ON — see Setup ▸ Developer" : "Developer mode OFF");
  }
  function syncDevUi(){
    const link = $("openGraphics"); if(link) link.classList.toggle("hidden", !devMode);
    syncDevRevealBtn();
    try{ applyGates(); }catch(e){}
    try{ applyRoute(); }catch(e){}
  }
  { const og = $("openGraphics"); if(og) og.addEventListener("click", () => { location.hash = "#/graphics"; }); }
  { const gb = $("graphicsBack"); if(gb) gb.addEventListener("click", () => { location.hash = "#/settings"; }); }
  { const ss = $("setSound"); if(ss) ss.addEventListener("click", toggleSound); }
  // T143 — live audio controls: separate Music + SFX volume sliders (drag → hear it),
  // tempo, the style picker, and the celebration tester. None RESTART the music (they
  // use audioUnlock, which only starts music if it isn't already playing).
  (function wireAudioControls(){
    const mr = $("musicVolRange"), sr = $("sfxVolRange"), tr = $("tempoRange"), test = $("setTest");
    if(mr) mr.addEventListener("input", () => {
      const v = parseInt(mr.value, 10) || 0; saveMusicVol(v);
      const el = $("setMusicVolVal"); if(el) el.textContent = fmtVol(v);
      audioUnlock(); setMusicVolume(v);   // music gain only (independent of SFX)
    });
    if(sr) sr.addEventListener("input", () => {
      const v = parseInt(sr.value, 10) || 0; saveSfxVol(v);
      const el = $("setSfxVolVal"); if(el) el.textContent = fmtVol(v);
      audioUnlock(); if(window.Sound && window.Sound.setSfxVolume) window.Sound.setSfxVolume(v / 100);
      sfx("correct", 6);   // preview the SFX at the new level (so the balance is audible)
    });
    if(tr) tr.addEventListener("input", () => {
      const v = parseInt(tr.value, 10) || 100; saveTempo(v);
      const el = $("setTempoVal"); if(el) el.textContent = fmtTempo(v);
      audioUnlock();
      if(musicPreview) synthSwitchContext(musicPreview); else musicForScreen(curScreen);   // re-derive at the new tempo
    });
    if(test) test.addEventListener("click", () => { audioUnlock(); sfx("correct", 6); });
    const musGrp = $("musicSwitch");
    if(musGrp) musGrp.addEventListener("click", e => {
      const btn = e.target.closest && e.target.closest(".mus-btn"); if(!btn) return;
      const name = btn.dataset.music; if(!name) return;
      audioUnlock();
      musicPreview = name;
      synthSwitchContext(name);   // one of B's 12 distinct contexts (Synth.setContext) + the T113 tempo
      // T140 — auditioning the Dubstep style also fires its signature victory DROP (sting)
      const Sy = window.Synth, c = Sy && Sy.CONTEXTS && Sy.CONTEXTS[name];
      if(c && c.victory && Sy.sting) Sy.sting("victory");
      syncMusicSwitch();
    });
    const fxGrp = $("fxTest");
    if(fxGrp) fxGrp.addEventListener("click", e => {
      const btn = e.target.closest && e.target.closest(".mus-btn"); if(!btn) return;
      const kind = btn.dataset.fx; if(!kind) return;
      fireCelebrationTest(kind);
    });
    const hoardGrp = $("hoardTest");
    if(hoardGrp) hoardGrp.addEventListener("click", e => {
      const btn = e.target.closest && e.target.closest(".mus-btn"); if(!btn) return;
      const v = btn.dataset.hoard; if(v == null) return;
      fireHoardTest(v);
    });
    const devGoldGrp = $("devGold");
    if(devGoldGrp) devGoldGrp.addEventListener("click", e => {
      const btn = e.target.closest && e.target.closest(".mus-btn"); if(!btn || btn.dataset.gold == null) return;
      setDevGold(btn.dataset.gold);
    });
    const revealBtn = $("devRevealBtn");
    if(revealBtn) revealBtn.addEventListener("click", toggleDevReveal);
  })();
  // T182 — the `?dev` Graphics-menu gold-setter: REALLY set the Goblin Gold counter
  // (not a sandboxed preview), so the owner picks a value, goes home, and sees the
  // pile + the pill + any newly-crossed wealth milestones at that wealth. ?dev-gated
  // (the row is hidden otherwise) + on the publish checklist (it edits the save).
  function setDevGold(v){
    if(!devMode) return;                                    // dev-gated (defence in depth, not just the hidden row)
    const amount = Math.max(0, +v || 0);
    saveGold(amount);                                       // SET (not add) the real counter
    const col = loadCollected();                            // grant any newly-crossed wealth milestones
    const wealth = C.evaluateGold(amount, id => !!col[id]);
    if(wealth && wealth.length){ wealth.forEach(it => col[it.id] = { ts: Date.now() }); saveCollected(col); }
    renderGold();                                           // refresh the home gold pill
    // the home PILE re-derives from loadGold() on the next home entry (fxSetScreen
    // → homeFxState), so "set a value → go home → see the pile" just works.
    const val = $("setDevGoldVal"); if(val) val.textContent = fmtGold(amount) + " set";
  }
  // T173 — the Graphics-menu hoard tester: preview the coin mound at a fill level
  // (reveals the backdrop with a forced hoard level so the owner can eyeball the
  // pile growth) and the amount-scaled coin earn-burst. The next screen change
  // re-derives the real backdrop, so this leaves no stale state.
  function fireHoardTest(v){
    ensureAudioReady();
    if(!fxBg) setupFx();
    fxResizeAll();
    const val = $("setHoardVal");
    if(v === "earn"){
      fxEarnBurst($("hoardTestLabel"), 250000);                 // a big-ish haul → a lavish coin shower
      if(val) val.textContent = "coins fired";
      return;
    }
    const level = Math.max(0, Math.min(1, parseFloat(v) || 0));
    fxShowBackdrop(true);
    try{
      if(fxBg){ fxBg.setHomeState({ event: { palette: HOME_PALETTE }, progress: 0.5, streak: 0, hoard: level });
        fxBg.start(); if(fxBg.resize) fxBg.resize(); }
    }catch(e){}
    // also fly a few coins in, so the preview reads as "filling"
    fxEarnBurst($("hoardTestLabel"), Math.round(100 * Math.pow(10, level * 4)));
    if(val) val.textContent = Math.round(level * 100) + "% pile";
  }
  function fireCelebrationTest(kind){
    ensureAudioReady();                  // T143(4) — unlock audio WITHOUT restarting the music
    if(!fxBurst) setupFx();
    fxResizeAll();                       // match the live viewport before firing
    if(kind === "item") fxCelebrate([{ id: "test:legendary", rarity: "legendary" }, { id: "test:epic", rarity: "epic" }]);
    else if(kind === "rank") fxCelebrateRank((window.Collectibles && window.Collectibles.RANKS ? window.Collectibles.RANKS.length : 8) - 1);
    else if(kind === "win") fxCelebrateWin(8);
    else fxBigBurst({ x: 0.5, y: 0.55, count: 800, seed: (Date.now() & 0xffff) + 1, palette: null });
    // diagnostic readout (the owner can report it without DevTools)
    const val = $("setFxVal");
    if(val){
      if(!fxBurst){ val.textContent = "no overlay"; }
      else { const d = fxBurst.dimensions ? fxBurst.dimensions() : null;
        val.textContent = (fxBurst.isReady && fxBurst.isReady() ? "" : "not ready · ") + (d ? d.w + "×" + d.h : "fired"); }
    }
  }

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
      // T101 — make Start feel instant. Do ONLY the gesture-required work synchronously
      // (the fullscreen request + the AudioContext unlock must be inside the user tap),
      // then PAINT the round/menu immediately, and DEFER the heavy music-engine build
      // (setupSynth's reverb/graph) + prefs to just after first paint — so the
      // fullscreen reflow + synth graph never block the first question. SFX still work
      // (the context is unlocked here); music starts a frame later.
      if(window.Sound && window.Sound.unlock) window.Sound.unlock();   // gesture: unlock/resume the audio context
      if(useFs) fsEnter();                                             // gesture: request fullscreen
      // A fresh profile is dropped straight into the one-question intro (T86);
      // everyone else (incl. legacy) goes to the menu / honours the deep link.
      if(needsIntro()) startIntro();
      else applyRoute();
      // Deferred (off first paint): the OLD pre-T101 sequence (audioUnlock → setupSynth
      // + START the music; applySoundPref) — it ran BEFORE render so `musicForScreen`
      // saw `synthWired`; here it runs AFTER, so it must START the music itself.
      // T101-FIX: `audioUnlock()` (not bare setupSynth) re-starts the music post-mount —
      // the previous defer wired the synth but the screen's `musicForScreen` had already
      // early-returned on `!synthWired`, so the first round/menu was silent.
      const warmAudio = () => { audioUnlock(); applySoundPref(); musicForScreen(curScreen); };
      if(typeof requestAnimationFrame === "function") requestAnimationFrame(warmAudio); else setTimeout(warmAudio, 0);
    }
    if(isInstalledDisplay()){     // T156 — installed/standalone: already locked fullscreen,
      // so drop the "Play in fullscreen" wording; the entry just serves the audio gesture.
      fsBtn.classList.add("hidden");
      playBtn.className = "btn";
      playBtn.textContent = "Tap to begin";
    } else if(!fsSupported()){    // iOS Safari etc. — single "Play", no fullscreen
      fsBtn.classList.add("hidden");
      playBtn.className = "btn";
      playBtn.textContent = "Play";
    }
    fsBtn.addEventListener("click", () => enter(true));
    // T167 — in the installed/standalone PWA the entryFs button is hidden (T156)
    // AND the manifest's display:fullscreen is unreliable across Android (the
    // owner still sees the bars). Make the "Tap to begin" gesture ALSO request
    // fullscreen so the installed app goes truly fullscreen on first tap (the
    // browser only honours requestFullscreen from a user gesture, so this entry
    // tap is our one chance). Browser-tab behaviour preserved — entryPlay there
    // is still the audio-only "Play" alternative; the entryFs button does FS.
    playBtn.addEventListener("click", () => enter(isInstalledDisplay()));
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
  // T161 — the build pill is an ABSOLUTE marker of the RUNNING code: read the
  // executing bundle's OWN version from main.js's `?v=<sha>` (injected by the T107
  // cachebust), NOT from build.json (which is the LATEST-deployed sha, decoupled
  // from what's actually running). So a stale cached client shows its OWN old sha,
  // and the update-check can compare running-vs-latest and actually fire.
  const RUNNING_V = (function(){
    try{
      let src = (document.currentScript && document.currentScript.src) || "";
      if(!src && document.querySelector){ const s = document.querySelector('script[src*="main.js"]'); src = (s && s.src) || ""; }
      const m = /[?&]v=([^&]+)/.exec(src || "");
      return m ? decodeURIComponent(m[1]) : null;
    }catch(e){ return null; }
  })();
  let buildInfo = null;
  function renderBuild(){
    const el = $("buildInfo"); if(!el) return;
    if(!RUNNING_V){ el.textContent = "local build"; return; }      // no ?v= → dev/local
    const ago = buildInfo && buildInfo.time ? relAgo(Date.parse(buildInfo.time)) : "";
    el.innerHTML = 'build <b>'+esc(RUNNING_V)+'</b>' + (ago ? ' · '+ago : '');   // the RUNNING sha (truthful per client)
  }
  // T184 — enable Developer mode from the MENU (no URL editing): tap the build pill
  // ~7× quickly. Toggles the persisted `halves.dev` flag → the Setup ▸ Developer
  // section + the dev tools. (`?dev` stays a fallback.)
  (function devTapEnabler(){
    const el = $("buildInfo"); if(!el || !el.addEventListener) return;
    let taps = 0, last = 0;
    el.addEventListener("click", () => {
      const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
      if(now - last > 1500) taps = 0;
      last = now;
      if(++taps >= 7){ taps = 0; setDevMode(!devMode); }
    });
  })();
  syncDevUi();   // reflect the persisted dev flag at boot (reveal the Setup link if on)
  // T102 — register the PWA service worker (offline + installable). Guarded + lazy
  // (after load, never blocking boot); the SW is network-first for build.json/nav so
  // it never breaks the T54 update flow below. No-op where unsupported / on file://.
  if(typeof navigator !== "undefined" && navigator.serviceWorker && location && /^https?:$/.test(location.protocol)){
    const reg = () => { try{ navigator.serviceWorker.register("sw.js"); }catch(e){} };
    if(typeof window !== "undefined" && window.addEventListener) window.addEventListener("load", reg); else reg();
  }

  // Version check (T54 + T161): the RUNNING version is RUNNING_V (above). Poll
  // build.json for the LATEST-deployed sha; if it differs from RUNNING_V we are on
  // STALE code → offer a manual refresh (the reload lands on fresh ?v= assets).
  // build.json supplies the LATEST sha + the "ago" time only — never the running
  // identity. No-op on a local build / offline; never auto-reloads or steals focus.
  let updateShown = false, updateDismissed = false;
  function showUpdate(){
    if(updateShown || updateDismissed) return;
    updateShown = true;
    const bar = $("updateBar"); if(bar) bar.classList.remove("hidden");
  }
  function checkForUpdate(){
    if(!RUNNING_V) return;                        // local build / no marker → no-op
    fetch("build.json", { cache:"no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if(!j) return;
        buildInfo = j; renderBuild();             // refresh the "ago"
        const latest = j.shortSha || (j.sha || "").slice(0, 7);
        if(latest && latest !== RUNNING_V) showUpdate();   // running ≠ latest ⇒ stale ⇒ surface refresh
      })
      .catch(() => {});                           // offline/404 → silently ignore
  }
  renderBuild();                        // show the RUNNING version at once (before any fetch)
  checkForUpdate();                     // initial: pull build.json for the "ago" + the staleness check
  setInterval(renderBuild, 30000);      // keep the "ago" fresh
  setInterval(checkForUpdate, 180000);  // poll for a newer deploy (every 3 min)
  // expose the version-check internals for the Node test
  window.Updater = { check: checkForUpdate, running: () => RUNNING_V, bootSha: () => RUNNING_V, shown: () => updateShown };

  // ---- init ---------------------------------------------------------------
  if(window.Icons && window.Icons.installCSS) window.Icons.installCSS();   // T117: register the house pixel-icon masks
  if(window.FX && window.FX.init) window.FX.init($("fxCanvas"));
  setupFx();           // T110: mount the FXGL home backdrop + burst overlay (no-op if FXGL absent)
  renderTree();        // the tree is the home picker; it paints the topic-info row
  renderBrand();
  // T209 — re-stylise the titles once the self-hosted display font loads, so the pixel
  // shapes use Space Grotesk rather than a fallback face (guarded; no-op without fonts).
  try{ if(document.fonts && document.fonts.ready && document.fonts.ready.then) document.fonts.ready.then(renderTitles); }catch(e){}
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
    hoardMult: hoardMult, bossesDefeated: bossesDefeated, HOARD_G: HOARD_G,   // T178 — the exponential mid/late ramp
    GOLD_EMPTY: GOLD_EMPTY, GOLD_FULL: GOLD_FULL, hoardLevel: hoardLevel, earnBurstSpec: earnBurstSpec, // T173/T182/T198 — the visual hoard curve + earn-burst scaling
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
