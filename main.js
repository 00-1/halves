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
  const screens = { start:$("start"), game:$("game"), results:$("results"), summary:$("summary"), inventory:$("inventory") };
  const elPrompt=$("prompt"), elGhost=$("ghost"), elAnswer=$("answer"),
        elCounter=$("counter"), elClock=$("clock"), elProgress=$("progress"),
        elStage=$("stage"), elPad=$("pad"), elEyebrow=$("eyebrow"),
        elMark=$("mark"), elTag=$("tag"), elModeTabs=$("modeTabs");

  function show(name){
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[name].classList.add("active");
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

  // ---- start screen: mode picker + brand ---------------------------------
  function renderTabs(){
    elModeTabs.innerHTML = MODES.map(m => {
      const locked = !isUnlocked(m);
      return '<button class="mode-tab'+(m.id===mode.id?' active':'')+(locked?' locked':'')+
        '" data-mode="'+m.id+'">'+(locked?'<span class="lk">🔒</span>':'')+esc(m.name)+'</button>';
    }).join("");
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
    const t = e.target.closest(".mode-tab"); if(!t) return;
    selectMode(t.dataset.mode);
  });

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

  // ---- summary: best time in every mode (read from localStorage) ----------
  function renderSummary(){
    $("sumList").innerHTML = MODES.map(m => {
      const best = loadBoard(m.id).slice().sort(rank)[0];
      if(!best){
        return '<div class="sum-row blank"><span class="md">'+esc(m.name)+'</span>'+
          '<span class="sc">—</span><span class="tm">—</span></div>';
      }
      const rk = C.RANKS[C.rankIndex(best.score, best.total, best.time)];
      const sub = '<span class="holder" style="color:'+rk.color+'">'+esc(rk.name)+
        (best.name ? ' · '+esc(best.name) : '')+'</span>';
      return '<div class="sum-row"><span class="md">'+esc(m.name)+sub+'</span>'+
        '<span class="sc">'+best.score+'/'+(best.total||"?")+'</span>'+
        '<span class="tm">'+fmt(best.time)+'s</span></div>';
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
      cell.innerHTML = '<canvas class="pix" width="'+csz+'" height="'+csz+'"></canvas>'+
        '<div class="u-name">'+esc(it.name)+'</div>'+
        '<div class="u-rare">'+esc(it.rarity)+'</div>'+
        '<div class="u-desc">'+esc(it.desc)+'</div>';
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

  // Lightweight, non-blocking toast shown mid-round when an item is unlocked.
  function showToast(it){
    const t = document.createElement("div");
    t.className = "toast r-" + it.rarity;
    t.innerHTML = '<canvas class="pix" width="36" height="36"></canvas>'+
      '<div class="t-txt"><span class="t-tag">Unlocked</span>'+
      '<span class="t-name">'+esc(it.name)+'</span></div>';
    $("toasts").appendChild(t);
    C.drawIcon(t.querySelector("canvas"), it.id, C.paletteFor(it.rarity));
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2000);
  }

  // Celebratory toast when a whole topic becomes newly playable — fired both for
  // chain unlocks (finishing the previous topic) and Part-2 mastery unlocks.
  function showTopicToast(m){
    const part2 = !!m.requires;
    const t = document.createElement("div");
    t.className = "toast r-epic topic";
    t.innerHTML = '<span class="t-glyph">'+m.glyph+'</span>'+
      '<div class="t-txt"><span class="t-tag">'+(part2 ? "Part 2 unlocked" : "Topic unlocked")+'</span>'+
      '<span class="t-name">'+esc(m.name)+'</span></div>';
    $("toasts").appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2600);
  }

  function renderInventory(){
    const collected = loadCollected();
    const cat = C.categories();
    const total = C.CATALOG.length;
    const have = C.CATALOG.filter(it => collected[it.id]).length;
    $("invMeta").textContent = have + " / " + total;
    $("invList").innerHTML = cat.map(name => {
      const items = C.CATALOG.filter(it => it.cat === name);
      if(!items.length) return "";
      const got = items.filter(it => collected[it.id]).length;
      const cells = items.map(it => {
        const owned = !!collected[it.id];
        return '<div class="inv-cell '+(owned ? "owned r-"+it.rarity : "locked")+'" data-id="'+esc(it.id)+'">'+
          (owned ? '<canvas class="pix" width="48" height="48"></canvas>' : '<span class="q">?</span>')+
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

  // ---- game state ---------------------------------------------------------
  let order=[], idx=0, input="", mistakes=0, qMiss=0,
      startTime=0, qStart=0, times=[], raf=0, locked=false;

  function start(){
    if(!isUnlocked(mode)) return;   // locked topics aren't playable
    order = mode.build(); idx=0; mistakes=0; times=[];
    elEyebrow.innerHTML = mode.eyebrow;
    startTime = performance.now();
    show("game");
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
    mistakes++;
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

  // ---- results + hall of fame --------------------------------------------
  let pendingEntry = null;

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
    const more = C.evaluateCollector(Object.keys(collected).length, has);
    more.forEach(it => collected[it.id] = { ts: Date.now() });
    saveCollected(collected);
    const unlocked = newly.concat(more);

    // celebratory toast for any topic this round newly opened (chain or Part-2)
    MODES.forEach(m => { if(!wasUnlocked[m.id] && isUnlocked(m)) showTopicToast(m); });

    // ----- hall of fame -----
    const board = loadBoard(mode.id);
    const entry = { name:"", score:score, time:total, total:order.length, ts:Date.now() };
    const cutoff = board.concat([entry]).sort(rank).slice(0, MAX);
    const qualifies = cutoff.indexOf(entry) !== -1;

    const nameEntry = $("nameEntry"), missNote = $("missNote");
    if(qualifies){
      pendingEntry = entry;
      saveBoard(mode.id, cutoff);
      nameEntry.classList.remove("hidden");
      missNote.classList.add("hidden");
      const inp = $("nameInput");
      inp.value = "";
      renderHOF();
      setTimeout(()=>inp.focus(),350);
    }else{
      pendingEntry = null;
      nameEntry.classList.add("hidden");
      missNote.classList.remove("hidden");
      missNote.textContent = "Scored "+score+"/"+order.length+" in "+fmt(total)+"s — short of the board.";
      renderHOF();
    }

    show("results");
    renderBest();
    if(unlocked.length) setTimeout(() => showUnlocks(unlocked), 650);
  }

  function renderHOF(){
    const board = loadBoard(mode.id).slice().sort(rank);
    $("hofMeta").textContent = "score · time";
    if(board.length === 0){
      $("hofList").innerHTML = '<div class="hof-empty">Empty. Be the first.</div>';
      return;
    }
    const medals = ["①","②","③"];
    $("hofList").innerHTML = board.map((e,i)=>{
      const you = pendingEntry && e.ts === pendingEntry.ts;
      const rk = i<3 ? '<span class="rank medal">'+medals[i]+'</span>'
                     : '<span class="rank">'+(i+1)+'</span>';
      const nm = e.name ? esc(e.name) : (you ? '…' : '—');
      return '<div class="hof-row'+(you?' you':'')+'">'+rk+
        '<span class="nm">'+nm+'</span>'+
        '<span class="sc">'+e.score+'/'+(e.total||"?")+'</span>'+
        '<span class="tm">'+fmt(e.time)+'s</span></div>';
    }).join("");
  }

  function commitName(v){
    if(!pendingEntry) return;
    pendingEntry.name = v.slice(0,12);
    const board = loadBoard(mode.id);
    const found = board.find(e => e.ts === pendingEntry.ts);
    if(found) found.name = pendingEntry.name;
    saveBoard(mode.id, board);
    renderHOF();
    renderBest();
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
    if(h === "inventory"){ renderInventory(); show("inventory"); }
    else if(h === "best-times"){ renderSummary(); show("summary"); }
    else { renderTabs(); renderBest(); renderStartState(); show("start"); }
  }
  function navStart(){ if(location.hash === "#/" || location.hash === "") applyRoute(); else location.hash = "#/"; }
  window.addEventListener("hashchange", applyRoute);

  $("startBtn").addEventListener("click", start);
  $("againBtn").addEventListener("click", start);
  $("menuBtn").addEventListener("click", navStart);

  $("statsBtn").addEventListener("click", () => { location.hash = "#/best-times"; });
  $("sumBack").addEventListener("click", navStart);
  $("sumClear").addEventListener("click", () => {
    if(!confirm("Clear all best times saved on this device?")) return;
    MODES.forEach(m => saveBoard(m.id, []));
    renderSummary(); renderBest();
  });

  $("invBtn").addEventListener("click", () => { location.hash = "#/inventory"; });
  $("invBack").addEventListener("click", navStart);
  // Tap a collectible to inspect it (owned shows detail; locked teases).
  $("invList").addEventListener("click", e => {
    const cell = e.target.closest(".inv-cell"); if(!cell) return;
    const it = C.byId(cell.dataset.id); if(!it) return;
    if(cell.classList.contains("owned")) openModal(it.cat, [it], false);
    else openModal("Locked", [{ id:"locked-mystery", name:"???", rarity:"common", desc:"Keep playing to discover this collectible." }], false);
  });
  $("unlockClose").addEventListener("click", closeModal);
  $("unlockModal").addEventListener("click", e => { if(e.target === $("unlockModal")) closeModal(); });

  const nameInput = $("nameInput");
  nameInput.addEventListener("input", e => commitName(e.target.value));
  nameInput.addEventListener("keydown", e => { if(e.key==="Enter"){ e.preventDefault(); nameInput.blur(); } });

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
  renderTabs();
  renderMark();
  renderBest();
  renderStartState();
  renderBuild();
  applyRoute();   // honour a deep link (e.g. #/inventory) on load
})();
