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
  const screens = { entry:$("entry"), start:$("start"), game:$("game"), results:$("results"), summary:$("summary"), inventory:$("inventory"), heroes:$("heroes"), arena:$("arena"), practice:$("practice") };
  const elPrompt=$("prompt"), elGhost=$("ghost"), elAnswer=$("answer"),
        elCounter=$("counter"), elClock=$("clock"), elProgress=$("progress"),
        elStage=$("stage"), elPad=$("pad"), elEyebrow=$("eyebrow"),
        elMark=$("mark"), elTag=$("tag"), elModeTabs=$("modeTabs");

  function show(name){
    // stop the game clock RAF whenever we leave the game screen (e.g. browser
    // back mid-round), so it never loops on a hidden screen.
    if(name !== "game" && raf){ cancelAnimationFrame(raf); raf = 0; }
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[name].classList.add("active");
    // music follows the screen: the topic's style in-game, the menu style elsewhere
    if(window.Sound && window.Sound.setMusic){
      if(name === "game") window.Sound.setMusic(typeof mode.music === "number" ? mode.music : mode.id);
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
  function modeRow(m){
    const locked = !isUnlocked(m);
    const { have, total } = modeProgress(m);
    const done = !locked && total > 0 && have === total;
    let sub, state;
    if(locked){
      sub = unlockReq(m);
      state = '🔒';
    }else{
      const best = loadBoard(m.id).slice().sort(rank)[0];
      if(best){
        const rk = C.RANKS[C.rankIndex(best.score, best.total, best.time)];
        sub = '<span style="color:'+rk.color+'">'+esc(rk.name)+'</span> · '+best.score+'/'+(best.total||"?");
      }else{
        sub = 'No best yet';
      }
      state = done ? '✓' : '▶';
    }
    const cls = "mode-row" + (m.id===mode.id ? " active" : "") +
                (locked ? " locked" : "") + (done ? " done" : "");
    const guide = (window.Guides && window.Guides.has(m.id))
      ? '<button class="mr-guide" data-guide="'+esc(m.id)+'" aria-label="How to beat '+esc(m.name)+'">?</button>' : '';
    return '<div class="'+cls+'" data-mode="'+esc(m.id)+'"'+(locked?' aria-disabled="true"':'')+'>'+
      '<span class="mr-main"><span class="mr-name">'+esc(m.name)+'</span>'+
        '<span class="mr-sub">'+sub+'</span></span>'+
      '<span class="mr-side">'+guide+'<span class="mr-prog">'+have+'/'+total+'</span>'+
        '<span class="mr-state">'+state+'</span></span></div>';
  }
  function renderTabs(){
    elModeTabs.innerHTML = GROUPS.map(g => {
      const rows = MODES.filter(m => (m.group || "Core") === g);
      if(!rows.length) return "";
      return '<div class="mode-group"><h5>'+esc(g)+'</h5>'+rows.map(modeRow).join("")+'</div>';
    }).join("");
    updateScrollCues();
  }

  // Toggle the picker's scroll-affordance fades by comparing scroll geometry.
  // Nothing shows when the list fits; recomputed on render/scroll/resize.
  function updateScrollCues(){
    const el = elModeTabs, wrap = el && el.parentElement;
    if(!wrap || !wrap.classList) return;
    wrap.classList.toggle("can-scroll-up", el.scrollTop > 1);
    wrap.classList.toggle("can-scroll-down", el.scrollHeight - el.clientHeight - el.scrollTop > 1);
  }
  function renderMark(){ elMark.innerHTML = mode.glyph; elTag.textContent = mode.tag; }

  function selectMode(id){
    const m = byId(id); if(!m) return;
    mode = m;
    if(isUnlocked(m)) saveLastMode(id);   // don't make a locked topic the default
    renderTabs(); renderMark(); renderBest(); renderStartState();
  }

  // Enable Start only for an unlocked topic.
  function renderStartState(){ $("startBtn").disabled = !isUnlocked(mode); }
  elModeTabs.addEventListener("click", e => {
    // the "?" guide control opens a guide for any topic (incl. locked previews)
    const gb = e.target.closest(".mr-guide");
    if(gb){ openGuide(byId(gb.dataset.guide)); return; }
    const t = e.target.closest(".mode-row"); if(!t) return;
    if(t.classList.contains("locked")) return;   // locked rows aren't selectable
    selectMode(t.dataset.mode);
  });

  // ---- topic guides (T27): a short "how to beat it" panel per topic ----------
  function openGuide(m){
    const g = m && window.Guides && window.Guides.get(m.id);
    if(!g){ return; }
    $("guideTitle").innerHTML = '<span class="g-glyph">'+(m.glyph||"")+'</span> '+esc(m.name);
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

  // Practice / Review view wiring (T32).
  $("practiceBtn").addEventListener("click", openPractice);
  $("practiceBack").addEventListener("click", () => show("start"));
  $("practiceGrid").addEventListener("click", e => {
    const tile = e.target.closest(".pq-tile"); if(!tile) return;
    const m = byId(tile.dataset.mode); if(!m) return;
    const q = m.build().find(x => String(x.p) === tile.dataset.prompt);
    if(q) startPractice(m.id, q);
  });
  elModeTabs.addEventListener("scroll", updateScrollCues, { passive:true });

  function renderBest(){
    if(!isUnlocked(mode)){
      $("bestLine").innerHTML = '🔒 '+unlockHint(mode);
      return;
    }
    const b = loadBoard(mode.id).slice().sort(rank);
    if(b.length === 0){ $("bestLine").innerHTML = "No best time yet"; return; }
    const t = b[0];
    $("bestLine").innerHTML = 'Top <b>'+t.score+'/'+(t.total||"?")+'</b> · <b>'+fmt(t.time)+'s</b>'+
      (t.name ? ' · '+esc(t.name) : '');
  }

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
    }).join("");
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
    openModal(title, items, n > 4);
  }

  // Slide a toast out and remove it after `hold` ms on screen (non-blocking).
  function dismissToast(t, hold){
    setTimeout(() => {
      t.classList.remove("show");
      t.classList.add("hide");
      setTimeout(() => t.remove(), 300);
    }, hold);
  }
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
    dismissToast(t, 2000);
  }

  // Celebratory toast when a whole topic becomes newly playable — fired both for
  // chain unlocks (finishing the previous topic) and Part-2 mastery unlocks.
  function showTopicToast(m){
    const part2 = !!m.requires;
    const pal = C.paletteFor("epic");   // topic toasts are epic-tinted
    const t = document.createElement("div");
    t.className = "toast r-epic topic";
    t.innerHTML = '<span class="t-glyph">'+m.glyph+'</span>'+
      '<div class="t-txt"><span class="t-tag">'+(part2 ? "Part 2 unlocked" : "Topic unlocked")+'</span>'+
      '<span class="t-name">'+esc(m.name)+'</span></div>';
    $("toasts").appendChild(t);
    sfx("topicUnlock");   // short fanfare
    requestAnimationFrame(() => { t.classList.add("show"); toastBurst(t, "epic", [pal.accent, pal.body]); });
    dismissToast(t, 2600);
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
    { id:"loot",   label:"Loot" }
  ];
  let invTab = "topics";
  const AWARD_CATS = C.categories().filter(n => n !== "Loot");   // drill-earned cats

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
    const byRegion = {};
    loot.forEach(it => { const r = Math.floor(((it.tier || 1) - 1) / 10); (byRegion[r] = byRegion[r] || []).push(it); });
    const sections = Object.keys(byRegion).map(Number).sort((a, b) => a - b).map(r => {
      const label = (E && E.regionLabel) ? E.regionLabel(r) : ("Region " + (r + 1));
      return { label: label + " · tiers " + (r*10+1) + "–" + (r*10+10), items: byRegion[r] };
    });
    const got = sections.reduce((a, s) => a + s.items.filter(it => col[it.id]).length, 0);
    return invTabHtml("Loot", got + "/" + loot.length, sections, col);
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
    const items = C.CATALOG.filter(it => col[it.id] && it.boost && it.boost.hero === h.id);
    const shown = items.slice(0, 12);
    const chips = shown.map(it => '<span class="hero-chip r-'+it.rarity+'">'+esc(it.flavour)+'</span>').join("") +
      (items.length > shown.length ? '<span class="hero-chip more">+'+(items.length - shown.length)+' more</span>' : '');
    return '<div class="hero-card unlocked t-'+h.type.toLowerCase()+'" data-hero="'+esc(h.id)+'">'+
      '<div class="hero-port"><canvas class="pix" width="48" height="48"></canvas></div>'+
      '<div class="hero-info">'+
        '<div class="hero-name"><span class="hn"><i class="typedot"></i>'+esc(h.name)+'</span><span class="hero-rating">★ '+rating+'</span></div>'+
        '<div class="hero-stats">'+statChip("PWR",st.power)+statChip("GRD",st.guard)+statChip("SPD",st.speed)+statChip("FOC",st.focus)+'</div>'+
        '<div class="hero-items">'+(items.length ? '<span class="hero-il">Boosted by '+items.length+':</span> '+chips
                                                  : '<span class="hero-none">No items yet — collect to boost.</span>')+'</div>'+
      '</div></div>';
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
      if(h) C.drawIcon(cv, "hero:"+h.id, HERO_PAL[h.type], "familiar");   // critter portrait
    });
  }

  // ---- arena (T24) --------------------------------------------------------
  // The Arena reuses the drill engine for a "battle round": a shuffled mix of
  // questions from every unlocked topic. The win is decided purely by
  // Enemies.resolveBattle(hero, tier, perf, REAL collected set) — perf scales
  // within a band (0.4…1.0) but can never substitute for missing hero rating, so
  // clearing the Arena genuinely demands a near-complete collection (T23/T43).
  const BATTLE_LEN = 12;
  let arenaHero = null, lastBattle = null, battleCtx = null, practiceCtx = null;

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
    $("practiceTitle").innerHTML = '<span class="g-glyph">' + (m.glyph || "") + '</span> ' + esc(m.name);
    $("practiceMeta").textContent = solved + " / " + qs.length + " solved";
    $("practiceGrid").innerHTML = qs.map(q => {
      const t = qb[q.p], col = qTileColor(t);
      return '<button class="pq-tile' + (t == null ? " unsolved" : "") + '"' +
        (col ? ' style="border-color:' + col + ';background:' + col + '22"' : '') +
        ' data-mode="' + esc(modeId) + '" data-prompt="' + esc(q.p) + '">' +
        '<span class="pq-p">' + esc(q.p) + '</span>' +
        '<span class="pq-t">' + (t != null ? fmt(t) + 's' : '—') + '</span></button>';
    }).join("");
  }
  function openPractice(){ if(!isUnlocked(mode)) return; renderPractice(mode.id); show("practice"); }
  const BATTLE_MODE = {
    id: "battle", name: "Arena", eyebrow: "Battle — solve fast!", expr: false,
    build: function(){
      const pool = [];
      MODES.filter(isUnlocked).forEach(m => {
        m.build().forEach(q => pool.push({ p:q.p, a:q.a, _mode:m }));   // tag the source mode
      });
      for(let i = pool.length - 1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
      return pool.slice(0, Math.min(BATTLE_LEN, pool.length));
    }
  };

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
      const r = lastBattle, f = (0.4 + 0.6 * r.res.perf);
      html += '<div class="arena-result '+(r.won ? "win" : "loss")+'">'+
        '<div class="ar-title">'+(r.won ? "Victory!" : "Defeated")+'</div>'+
        '<div class="ar-sub">'+esc(r.heroName)+' vs '+esc(r.tierName)+'</div>'+
        '<div class="ar-maths">'+Math.round(r.res.rating)+' ★ × '+r.res.matchup+' × '+f.toFixed(2)+
          ' perf = <b>'+r.res.battlePower+'</b> vs DEF <b>'+r.res.def+'</b></div>'+
        (r.goldEarn > 0 ? '<div class="ar-gold">🪙 +'+esc(fmtGold(r.goldEarn))+' '+esc(GOLD_LABEL)+'</div>' : '')+
        (r.newHeroes.length ? '<div class="ar-new">★ New hero: '+r.newHeroes.map(esc).join(", ")+'!</div>' : '')+
        '</div>';
    }
    if(cleared){
      html += '<div class="arena-tier done"><div class="at-name">⭐ Arena cleared — you defeated The Void Sovereign!</div>'+
        '<div class="at-region">Every tier has fallen. Champion of the realm.</div></div>';
    } else {
      html += '<div class="arena-tier t-'+tier.type.toLowerCase()+'">'+
        '<div class="at-region">'+esc(E.regionLabel(E.tierRegion(tier.n)))+' · Tier '+tier.n+'</div>'+
        '<div class="at-name"><i class="typedot"></i>'+esc(tier.name)+'</div>'+
        '<div class="at-stats"><span class="at-type">'+esc(tier.type)+'</span><span class="at-def">DEF '+tier.def+'</span></div></div>';
      if(!heroes.length){
        html += '<div class="arena-empty">Finish a drill round to unlock your first hero, then return to fight.</div>';
      } else {
        html += '<div class="arena-pick">Choose your champion</div><div class="arena-heroes">';
        heroes.forEach(h => {
          const rating = Math.round(Hs.rating(h, col)), mu = E.matchup(h.type, tier.type);
          html += '<div class="arena-hero t-'+h.type.toLowerCase()+(arenaHero === h.id ? " sel" : "")+'" data-hero="'+esc(h.id)+'">'+
            '<div class="ah-top"><span class="ah-name"><i class="typedot"></i>'+esc(h.name)+'</span>'+
              '<span class="ah-rating">★ '+rating+'</span></div>'+
            '<div class="ah-mu">'+matchupLabel(mu)+'</div></div>';
        });
        html += '</div>';
      }
    }
    $("arenaBody").innerHTML = html;
    $("arenaFight").disabled = cleared || !arenaHero || !heroes.length;
    $("arenaFight").textContent = cleared ? "Cleared" : (arenaHero ? "Fight!" : "Pick a hero");
  }

  function startBattle(){
    const E = window.Enemies, col = loadCollected();
    if(!E || col["tier:" + E.TIER_COUNT]) return;                 // cleared
    if(!arenaHero || !window.Heroes.isHeroUnlocked(arenaHero, col)) return;
    battleCtx = { heroId: arenaHero, tier: E.currentTier(col), prevMode: mode };
    practiceCtx = null;
    lastBattle = null;
    mode = BATTLE_MODE;
    order = mode.build();
    elEyebrow.innerHTML = mode.eyebrow;
    sfx("roundStart");
    beginRound();
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

  // Resolve a finished battle round purely from the REAL collected set, grant the
  // tier + its loot on a win, and surface the result. (Called from finish().)
  function finishBattle(){
    const bc = battleCtx; battleCtx = null;
    const E = window.Enemies, Hs = window.Heroes;
    const total = (performance.now() - startTime) / 1000;
    const n = order.length, score = times.filter(t => t.miss === 0).length;
    const perf = E.computePerf(score, n, n ? total / n : total);
    const col = loadCollected();
    const res = E.resolveBattle(bc.heroId, bc.tier, perf, col);
    const heroName = (C.HERO_NAMES && C.HERO_NAMES[bc.heroId]) || bc.heroId;
    const goldBefore = loadGold();
    let earn = roundGold;                              // per-question gold even on a loss
    let loot = [], newHeroes = [];
    if(res.win){
      const before = Hs.HEROES.filter(h => Hs.isHeroUnlocked(h, col)).map(h => h.id);
      col["tier:" + bc.tier.n] = { ts: Date.now() };
      E.tierLoot(bc.tier.n).forEach(id => { if(!col[id]) col[id] = { ts: Date.now() }; });
      const more = C.evaluateCollector(Object.keys(col).length, id => !!col[id]);
      more.forEach(it => col[it.id] = { ts: Date.now() });
      const meta = grantMeta(col);   // tier-defeat + unlock-all-heroes milestones
      earn += tierGold(bc.tier.n, goldMult(col));   // deeper = more
      loot = E.tierLoot(bc.tier.n).map(id => C.byId(id)).filter(Boolean).concat(more).concat(meta);
      newHeroes = Hs.HEROES.filter(h => Hs.isHeroUnlocked(h, col) && before.indexOf(h.id) < 0).map(h => h.name);
      sfx("topic100");
    } else {
      sfx("roundComplete");
    }
    const wealth = earnGold(earn, col);               // grants any wealth milestones into col
    const mo = bumpMomentum(col);                      // a battle is playing too
    saveCollected(col);
    loot = loot.concat(wealth).concat(mo.milestones);
    if(mo.wentUp) momentumToast(mo.state);
    lastBattle = { won: res.win, res: res, heroName: heroName, tierName: bc.tier.name, loot: loot, newHeroes: newHeroes, goldBefore: goldBefore, goldAfter: loadGold(), goldEarn: earn };
    arenaHero = null;
    mode = (bc.prevMode && bc.prevMode.id !== "battle") ? bc.prevMode : (byId(loadLastMode()) || MODES[0]);
    renderArena();
    show("arena");
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
    battleCtx = null; practiceCtx = null;
    order = mode.build();
    elEyebrow.innerHTML = mode.eyebrow;
    sfx("roundStart");
    beginRound();
  }
  // ---- Practice / Review (T32): attempt one question at a time, self-paced but
  // still timed; grants ONLY that question's Beat/Spark + updates qbest.
  function startPractice(modeId, q){
    const m = byId(modeId); if(!m || !isUnlocked(m) || !q) return;
    mode = m; battleCtx = null; practiceCtx = { modeId: modeId, prompt: q.p };
    order = [{ p:q.p, a:q.a }];
    sfx("roundStart");
    beginRound();
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
    // Practice view surfaces a short "how to approach this" note for the question.
    const note = $("practiceNote");
    if(note){
      if(practiceCtx && window.Guides && window.Guides.explain){
        note.textContent = window.Guides.explain(mode.id, it);
        note.classList.remove("hidden");
      } else note.classList.add("hidden");
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
    if(!practiceCtx){
      const qm = it._mode || mode;
      const target = (typeof qm.masterSecs === "number") ? qm.masterSecs : 4;
      roundGold += questionGold(target, dt, combo, goldMult(col));
    }
    const fresh = C.evaluateQuestion(mode.id, it.p, dt, id => !!col[id]);
    if(fresh.length){
      fresh.forEach(c => col[c.id] = { ts: Date.now() });
      saveCollected(col);
      fresh.forEach(showToast);
    }

    elPrompt.classList.add("split");
    elGhost.classList.add("go");
    elProgress.style.width = ((idx+1)/order.length*100)+"%";
    setTimeout(()=>{ idx++; nextQuestion(); },300);
  }

  // ---- results -----------------------------------------------------------
  function finish(){
    cancelAnimationFrame(raf);
    if(battleCtx){ finishBattle(); return; }       // Arena battle round → resolve, not results
    if(practiceCtx){ finishPractice(); return; }   // Practice attempt → grade just that question
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

    // celebratory toast for any topic this round newly opened (chain or Part-2)
    MODES.forEach(m => { if(!wasUnlocked[m.id] && isUnlocked(m)) showTopicToast(m); });

    // ----- best time: keep the per-mode top-10 board (no names, single-player)
    const entry = { name:"", score:score, time:total, total:order.length, ts:Date.now() };
    saveBoard(mode.id, loadBoard(mode.id).concat([entry]).sort(rank).slice(0, MAX));
    // per-question best times for the Practice heat-map (normal rounds only)
    saveQbest(recordQbest(loadQbest(), mode.id, times));

    show("results");
    renderBest();
    showGold($("resGold"), goldBefore, loadGold(), earn);
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
  function momentumToast(state){
    const t = document.createElement("div");
    t.className = "toast momentum";
    t.innerHTML = '<span class="t-glyph">🗓</span><div class="t-txt">' +
      '<span class="t-tag">' + esc(MOMENTUM_LABEL) + (state.count >= MOMENTUM_MAX ? " · maxed" : "") + '</span>' +
      '<span class="t-name">' + state.count + ' day' + (state.count === 1 ? '' : 's') + '</span></div>';
    $("toasts").appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    dismissToast(t, 1800);
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
    updateScrollCues();
  });

  // ---- hash routing for the static screens --------------------------------
  function applyRoute(){
    const h = (location.hash || "").replace(/^#\/?/, "");
    if(h === "inventory"){ renderInventory(); show("inventory"); }
    else if(h === "best-times"){ renderSummary(); show("summary"); }
    else if(h === "heroes"){ renderHeroes(); show("heroes"); }
    else if(h === "arena"){ lastBattle = null; arenaHero = null; renderArena(); show("arena"); }
    else { renderTabs(); renderBest(); renderStartState(); renderGold(); renderMomentum(); show("start"); }
  }
  function navStart(){ if(location.hash === "#/" || location.hash === "") applyRoute(); else location.hash = "#/"; }
  window.addEventListener("hashchange", applyRoute);

  $("startBtn").addEventListener("click", start);
  $("againBtn").addEventListener("click", start);
  $("menuBtn").addEventListener("click", navStart);

  $("statsBtn").addEventListener("click", () => { location.hash = "#/best-times"; });
  $("sumBack").addEventListener("click", navStart);
  // Tap an unlocked topic on Best Times to play it right away (locked rows
  // carry no data-mode, so they aren't startable).
  $("sumList").addEventListener("click", e => {
    const row = e.target.closest(".sum-row[data-mode]"); if(!row) return;
    const m = byId(row.dataset.mode); if(!m || !isUnlocked(m)) return;
    selectMode(m.id);
    start();
  });

  $("invBtn").addEventListener("click", () => { location.hash = "#/inventory"; });
  $("invBack").addEventListener("click", navStart);
  $("heroesBtn").addEventListener("click", () => { location.hash = "#/heroes"; });
  $("heroesBack").addEventListener("click", navStart);
  $("arenaBtn").addEventListener("click", () => { location.hash = "#/arena"; });
  $("arenaBack").addEventListener("click", navStart);
  $("arenaFight").addEventListener("click", startBattle);
  $("arenaBody").addEventListener("click", e => {
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
    const sync = () => { btn.innerHTML = fsActive() ? '⛶ Exit' : '⛶ Fullscreen'; };
    btn.addEventListener("click", () => { fsActive() ? fsExit() : fsEnter(); });
    ["fullscreenchange","webkitfullscreenchange","mozfullscreenchange","MSFullscreenChange"]
      .forEach(ev => document.addEventListener(ev, sync));
    sync();
  })();

  // ---- sound preference (persisted) + SFX engine (window.Sound) -----------
  function soundOn(){ try{ return localStorage.getItem("halves.sound") !== "off"; }catch(e){ return true; } }
  function saveSound(on){ try{ localStorage.setItem("halves.sound", on ? "on" : "off"); }catch(e){} }
  function audioUnlock(){ if(window.Sound && window.Sound.unlock) window.Sound.unlock(); }
  function applySoundPref(){ if(window.Sound && window.Sound.setMuted) window.Sound.setMuted(!soundOn()); }
  // Guarded SFX trigger — a no-op if the engine is absent or muted.
  function sfx(name, arg){ const S = window.Sound; if(S && S[name]) S[name](arg); }
  // Keep every 🔊/🔇 button (entry + start menu) in sync, and toggle the pref.
  const SOUND_BTNS = ["soundBtn", "soundBtnMenu"];
  function syncSoundButtons(){
    const on = soundOn();
    SOUND_BTNS.forEach(id => { const b = $(id); if(b) b.innerHTML = on ? '🔊 Sound on' : '🔇 Sound off'; });
  }
  function toggleSound(){ saveSound(!soundOn()); syncSoundButtons(); applySoundPref(); }
  SOUND_BTNS.forEach(id => { const b = $(id); if(b) b.addEventListener("click", toggleSound); });

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
      applyRoute();
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
  fetch("build.json", { cache:"no-store" })
    .then(r => r.ok ? r.json() : null)
    .then(j => { buildInfo = j; renderBuild(); })
    .catch(() => renderBuild());
  setInterval(renderBuild, 30000);   // keep the "ago" fresh

  // ---- init ---------------------------------------------------------------
  if(window.FX && window.FX.init) window.FX.init($("fxCanvas"));
  renderTabs();
  renderMark();
  renderBest();
  renderStartState();
  renderBuild();
  renderGold();
  renderMomentum();
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
  show("entry");      // splash first; entry buttons reveal the menu via applyRoute()
})();
