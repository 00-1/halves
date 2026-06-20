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
  const screens = { start:$("start"), game:$("game"), results:$("results"), summary:$("summary") };
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

  let mode = byId(loadLastMode()) || MODES[0];

  // ---- start screen: mode picker + brand ---------------------------------
  function renderTabs(){
    elModeTabs.innerHTML = MODES.map(m =>
      '<button class="mode-tab'+(m.id===mode.id?' active':'')+'" data-mode="'+m.id+'">'+esc(m.name)+'</button>'
    ).join("");
  }
  function renderMark(){ elMark.innerHTML = mode.glyph; elTag.textContent = mode.tag; }

  function selectMode(id){
    const m = byId(id); if(!m) return;
    mode = m; saveLastMode(id);
    renderTabs(); renderMark(); renderBest();
  }
  elModeTabs.addEventListener("click", e => {
    const t = e.target.closest(".mode-tab"); if(!t) return;
    selectMode(t.dataset.mode);
  });

  function renderBest(){
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
    if(k === "enter"){ submitWrongOrIgnore(); return; }
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

  // Enter commits a non-empty wrong guess as a mistake and moves on.
  function submitWrongOrIgnore(){
    if(input === "") return;
    if(parseFloat(input) === currentAnswer()){ correct(); return; }
    registerMiss();
    input=""; renderInput();
  }

  function registerMiss(){
    mistakes++; qMiss++;
    elStage.classList.add("wrong");
    setTimeout(()=>elStage.classList.remove("wrong"),320);
  }

  function correct(){
    locked = true;
    const dt = (performance.now()-qStart)/1000;
    const it = order[idx];
    times.push({ p:it.p, h:numStr(it.a), t:dt, miss:qMiss });
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
    const attempts = order.length + mistakes;
    const acc = Math.round(order.length/attempts*100);
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
    const newly = C.evaluate(ctx, has);
    newly.forEach(it => collected[it.id] = { ts: Date.now() });
    const more = C.evaluateCollector(Object.keys(collected).length, has);
    more.forEach(it => collected[it.id] = { ts: Date.now() });
    saveCollected(collected);
    const unlocked = newly.concat(more);

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
    else if(e.key==="Enter") k="enter";
    if(k!==null){ e.preventDefault(); flash(k); press(k); }
  });

  // Keep a wide prompt fitted if the viewport changes mid-round.
  window.addEventListener("resize", () => {
    if(screens.game.classList.contains("active")){ fitText(elPrompt); fitText(elGhost); }
  });

  $("startBtn").addEventListener("click", start);
  $("againBtn").addEventListener("click", start);
  $("menuBtn").addEventListener("click", () => { show("start"); renderTabs(); renderBest(); });

  $("statsBtn").addEventListener("click", () => { renderSummary(); show("summary"); });
  $("sumBack").addEventListener("click", () => { show("start"); renderBest(); });
  $("sumClear").addEventListener("click", () => {
    if(!confirm("Clear all best times saved on this device?")) return;
    MODES.forEach(m => saveBoard(m.id, []));
    renderSummary(); renderBest();
  });

  $("invBtn").addEventListener("click", () => { renderInventory(); show("inventory"); });
  $("invBack").addEventListener("click", () => show("start"));
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
  renderBuild();
})();
