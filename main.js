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

  // ---- elements -----------------------------------------------------------
  const $ = id => document.getElementById(id);
  const screens = { entry:$("entry"), start:$("start"), game:$("game"), results:$("results"), summary:$("summary"), inventory:$("inventory"), heroes:$("heroes") };
  const elPrompt=$("prompt"), elGhost=$("ghost"), elAnswer=$("answer"),
        elCounter=$("counter"), elClock=$("clock"), elProgress=$("progress"),
        elStage=$("stage"), elPad=$("pad"), elEyebrow=$("eyebrow"),
        elMark=$("mark"), elTag=$("tag"), elModeTabs=$("modeTabs");

  function show(name){
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
    return '<div class="'+cls+'" data-mode="'+esc(m.id)+'"'+(locked?' aria-disabled="true"':'')+'>'+
      '<span class="mr-main"><span class="mr-name">'+esc(m.name)+'</span>'+
        '<span class="mr-sub">'+sub+'</span></span>'+
      '<span class="mr-side"><span class="mr-prog">'+have+'/'+total+'</span>'+
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
    const t = e.target.closest(".mode-row"); if(!t) return;
    if(t.classList.contains("locked")) return;   // locked rows aren't selectable
    selectMode(t.dataset.mode);
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

  function renderInventory(){
    const collected = loadCollected();
    const cat = C.categories();
    const total = C.CATALOG.length;
    const have = C.CATALOG.filter(it => collected[it.id]).length;
    $("invMeta").textContent = have + " / " + total;

    // per-topic completion overview (mirrors the picker's have/total) with a
    // colour-graded progress bar (cool/low → warm/high, distinct 100%).
    let topicsDone = 0;
    const topicRows = MODES.map(m => {
      const items = C.modeItems(m.id);
      const total = items.length;
      const got = items.filter(it => collected[it.id]).length;
      const done = total > 0 && got === total;
      if(done) topicsDone++;
      const pct = total ? got / total : 0;
      return '<div class="tp-row'+(done ? " done" : "")+'">'+
        '<div class="tp-head"><span class="tp-name">'+esc(m.name)+'</span>'+
          '<span class="tp-prog">'+got+'/'+total+'</span>'+
          '<span class="tp-state">'+(done ? "✓" : "")+'</span></div>'+
        '<div class="tp-bar"><div class="tp-fill" style="width:'+(pct*100).toFixed(1)+
          '%;background:'+topicBarColor(pct, done)+'"></div></div></div>';
    }).join("");
    const topicsHtml = '<div class="inv-cat"><h4>Topics <span>'+topicsDone+'/'+MODES.length+' at 100%</span></h4>'+
      '<div class="topic-prog">'+topicRows+'</div></div>';

    $("invList").innerHTML = topicsHtml + cat.map(name => {
      const items = C.CATALOG.filter(it => it.cat === name);
      if(!items.length) return "";
      const got = items.filter(it => collected[it.id]).length;
      const cells = items.map(it => {
        const owned = !!collected[it.id];
        return '<div class="inv-cell '+(owned ? "owned r-"+it.rarity : "locked")+'" data-id="'+esc(it.id)+'">'+
          (owned ? '<canvas class="pix" width="48" height="48"></canvas><span class="inv-name">'+esc(it.flavour)+'</span>'
                 : '<span class="q">?</span>')+
          '</div>';
      }).join("");
      return '<div class="inv-cat"><h4>'+esc(name)+' <span>'+got+'/'+items.length+'</span></h4>'+
        '<div class="inv-grid">'+cells+'</div></div>';
    }).join("");
    $("invList").querySelectorAll(".inv-cell.owned canvas").forEach(cv => {
      const it = C.byId(cv.parentElement.dataset.id);
      if(it) C.drawIcon(cv, it.id, C.paletteFor(it.rarity));
    });
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
        '<div class="hero-info"><div class="hero-name">'+esc(h.name)+'</div>'+
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
        '<div class="hero-name">'+esc(h.name)+'<span class="hero-rating">★ '+rating+'</span></div>'+
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
      if(h) C.drawIcon(cv, "hero:"+h.id, HERO_PAL[h.type], 0);   // style 0 = sprite portrait
    });
  }

  // ---- game state ---------------------------------------------------------
  let order=[], idx=0, input="", mistakes=0, qMiss=0, combo=0,
      startTime=0, qStart=0, times=[], raf=0, locked=false;

  function start(){
    if(!isUnlocked(mode)) return;   // locked topics aren't playable
    order = mode.build(); idx=0; mistakes=0; times=[]; combo=0;
    elEyebrow.innerHTML = mode.eyebrow;
    startTime = performance.now();
    show("game");
    sfx("roundStart");
    loop();
    nextQuestion();
  }

  function loop(){
    elClock.textContent = fmt((performance.now()-startTime)/1000)+"s";
    raf = requestAnimationFrame(loop);
  }

  function nextQuestion(){
    if(idx >= order.length){ finish(); return; }
    locked=false; input=""; qMiss=0;
    const it = order[idx];
    elStage.classList.remove("wrong");
    elPrompt.style.color=""; elPrompt.classList.remove("split");
    elGhost.classList.remove("go");
    elPrompt.classList.toggle("expr", !!mode.expr);
    elGhost.classList.toggle("expr", !!mode.expr);
    elPrompt.textContent = it.p;
    elGhost.textContent  = numStr(it.a);
    elCounter.textContent = (idx+1)+" / "+order.length;
    elProgress.style.width = (idx/order.length*100)+"%";
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
    saveCollected(collected);
    const unlocked = newly.concat(topics).concat(more);

    // round-end stinger — play the most triumphant thing earned this round
    if(unlocked.some(it => /^topics:(one|all)100$/.test(it.id))) sfx("topic100");
    else if(unlocked.some(it => it.cat === "Mastery")) sfx("mastery");
    else sfx("roundComplete");

    // celebratory toast for any topic this round newly opened (chain or Part-2)
    MODES.forEach(m => { if(!wasUnlocked[m.id] && isUnlocked(m)) showTopicToast(m); });

    // ----- best time: keep the per-mode top-10 board (no names, single-player)
    const entry = { name:"", score:score, time:total, total:order.length, ts:Date.now() };
    saveBoard(mode.id, loadBoard(mode.id).concat([entry]).sort(rank).slice(0, MAX));

    show("results");
    renderBest();
    if(unlocked.length) setTimeout(() => showUnlocks(unlocked), 650);
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
    else { renderTabs(); renderBest(); renderStartState(); show("start"); }
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
  applySoundPref();   // honour the saved mute pref on load (no-op until T16)
  show("entry");      // splash first; entry buttons reveal the menu via applyRoute()
})();
