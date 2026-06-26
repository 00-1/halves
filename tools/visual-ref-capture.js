/* VISUAL-PARITY reference capture — a headless map of web GG1's screens (the visual TARGETS the
 * brickmap port is iterated against; the visual analogue of goldens/parity-vectors).
 *
 * Dev tool, built to be ROBUST (headless is flaky in CI/sandboxes): every screen is captured in its
 * own page with a retry, failures are isolated (one bad screen never loses the batch), each PNG is
 * written as it succeeds, and a manifest.json records what was captured + each screen's state. So a
 * partial run still banks progress; re-run to fill gaps.
 *
 * Output → content/gg1/visual-ref/<name>-web.png  +  manifest.json
 * Run:  node tools/visual-ref-capture.js [name ...]   (no args = all; names = only those)
 *   needs puppeteer: `npm i puppeteer`, or set PUPPETEER_PATH to a puppeteer install.
 *
 * Add a screen: append to SCREENS. `state` ∈ {full,empty,partial,sample}; `hash` is the route; `prep`
 * is an optional async (page)=>{} that drives interaction (clicks/keys) before the shot. */
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const puppeteer = require(process.env.PUPPETEER_PATH || "puppeteer");

const DEV = path.join(__dirname, "..", "gg1", "dev");
const OUT = path.join(__dirname, "..", "content", "gg1", "visual-ref");
const VIEWPORT = { width: 430, height: 880, deviceScaleFactor: 2 };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- collection states (seeded into localStorage before the app boots) ----
const fullCol = JSON.parse(fs.readFileSync("/tmp/ppt/fullcol.json", "utf8"));   // everything unlocked + boosted
const drillIds = JSON.parse(fs.readFileSync("/tmp/ppt/drillids.json", "utf8")); // catalogue (non-loot) ids, ordered
const own = ids => { const o = {}; ids.forEach(id => o[id] = { ts: 1 }); return o; };
const STATES = {
  full:    () => fullCol,                                                        // 100% — every screen fully populated
  empty:   () => ({}),                                                           // fresh player — most things locked
  sample:  () => own(drillIds.slice(0, 40)),                                     // early progress — some heroes locked
  partial: () => { const o = { ...fullCol }; for(let n = 30; n <= 120; n++) delete o["tier:" + n]; return o; }, // arena mid-climb
};

// ---- interaction preps for the in-play screens ----
const clickStart    = async p => { await p.click("#startBtn"); await sleep(700); };
const clickPractice = async p => { await p.click("#practiceBtn"); await sleep(700); };
const playEvent     = async p => { await p.click(".eb-play[data-event]"); await sleep(800); };  // event banner → gauntlet
const clickSel = sel => async p => { await p.evaluate(s => { const b = document.querySelector(s); if(b) b.dispatchEvent(new MouseEvent("click", { bubbles: true })); }, sel); await sleep(600); };
const invTab = id => clickSel('.inv-tab[data-tab="' + id + '"]');               // switch the Items sub-tab
const openGuide = clickSel("#guideBtn");                                         // "how to approach" modal
const openArenaMap = clickSel("#arenaMapBtn");                                   // the journey map
const silence = async p => p.evaluate(() => { if(window.Sound) for(const k in window.Sound){ if(typeof window.Sound[k] === "function") try { window.Sound[k] = () => {}; } catch(e){} } });
const skipToResults = async p => {                                              // skip every Q (skip locks ~750ms) → results
  await silence(p);                                                             // before the round (sfx throws on advance headless)
  await p.click("#startBtn"); await sleep(500);
  await silence(p);                                                             // again — in case the round re-grabbed Sound
  let reached = false;
  // screens toggle via the `.active` class (they're stacked; display is NOT none when hidden),
  // so test the active screen — NOT computed display, which is a false positive.
  const onResults = () => p.evaluate(() => !!document.querySelector("#results.screen.active, #results.active"));
  for(let i = 0; i < 45; i++){
    reached = await onResults();
    if(reached) break;
    await p.evaluate(() => { const g = document.getElementById("game"); const b = g && g.querySelector(".key.skip"); if(b) b.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await sleep(820);
  }
  // be HONEST: don't screenshot the drill as "results" — fail so the manifest records ok:false
  // (the round-advance is flaky headless; a re-run may land it, or capture on device).
  if(!reached) throw new Error("did not reach results screen (flaky headless round-advance)");
  await sleep(400);
};

// ---- THE SCREEN MAP (exhaustive: every screen + its distinct states/tabs/modals) ----
const SCREENS = [
  // splash / entry
  { name: "splash",             state: "full",    hash: null,           note: "splash / entry — the Magnar mark + tap-in" },
  // home / topic select — 3 progression states
  { name: "home",               state: "full",    hash: "#/",           note: "topic select — fully unlocked + gold + event banner" },
  { name: "home-fresh",         state: "empty",   hash: "#/",           note: "new player — only the first topic unlocked" },
  { name: "home-midprogress",   state: "sample",  hash: "#/",           note: "mid game — some topics unlocked, some locked" },
  { name: "guide",              state: "full",    hash: "#/", prep: openGuide, note: "the 'how to approach this' guide modal" },
  // heroes
  { name: "heroes",             state: "full",    hash: "#/heroes",     note: "Arena roster (all 12, boosted)" },
  { name: "heroes-partial",     state: "sample",  hash: "#/heroes",     note: "early game — some heroes still locked" },
  { name: "hero-detail-brawn",  state: "full",    hash: "#/hero/bram",  note: "hero detail + full boost list (Brawn)" },
  { name: "hero-detail-arcane", state: "full",    hash: "#/hero/wisp",  note: "hero detail (Arcane)" },
  { name: "hero-detail-cunning",state: "full",    hash: "#/hero/pip",   note: "hero detail (Cunning)" },
  // inventory — all 5 tabs
  { name: "inventory-topics",   state: "full",    hash: "#/inventory",  note: "Items › Topics tab (per-topic collectibles)" },
  { name: "inventory-awards",   state: "full",    hash: "#/inventory", prep: invTab("awards"), note: "Items › Awards tab" },
  { name: "inventory-loot",     state: "full",    hash: "#/inventory", prep: invTab("loot"),   note: "Items › Loot tab (Arena loot)" },
  { name: "inventory-events",   state: "full",    hash: "#/inventory", prep: invTab("events"), note: "Items › Events tab" },
  { name: "inventory-codex",    state: "full",    hash: "#/inventory", prep: invTab("codex"),  note: "Items › Codex tab (bestiary)" },
  { name: "summary",            state: "full",    hash: "#/best-times", note: "best times per topic" },
  // arena
  { name: "arena-prefight",     state: "partial", hash: "#/arena",      note: "3v3 pre-fight — tier/enemy team/party pick" },
  { name: "arena-map",          state: "partial", hash: "#/arena", prep: openArenaMap, note: "the journey map (10 regions)" },
  { name: "arena-cleared",      state: "full",    hash: "#/arena",      note: "arena fully cleared" },
  // settings
  { name: "settings",           state: "full",    hash: "#/settings",   note: "settings" },
  { name: "audio",              state: "full",    hash: "#/audio",      note: "audio settings" },
  { name: "graphics",           state: "full",    hash: "#/graphics",   note: "graphics settings" },
  // in-play
  { name: "drill",              state: "full",    hash: "#/", prep: clickStart,    note: "a live drill question (prompt/keypad/skip)" },
  { name: "results",            state: "full",    hash: "#/", prep: skipToResults, note: "end-of-round results (rank/time/gold)" },
  { name: "practice",           state: "full",    hash: "#/", prep: clickPractice, note: "practice mode (pick any question)" },
  { name: "event-play",         state: "full",    hash: "#/", prep: playEvent,     note: "daily-event gauntlet (in play)" },
];

const MIME = { ".js":"text/javascript", ".css":"text/css", ".html":"text/html", ".json":"application/json", ".png":"image/png", ".svg":"image/svg+xml" };
function serve(root){
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]); if(p === "/") p = "/index.html";
    const f = path.join(root, p);
    if(!f.startsWith(root) || !fs.existsSync(f)){ res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
}
async function launch(){                                                        // retry — headless can flake
  let last;
  for(let i = 0; i < 3; i++){
    try { return await puppeteer.launch({ args: ["--no-sandbox","--disable-setuid-sandbox","--disable-gpu","--disable-dev-shm-usage","--mute-audio","--autoplay-policy=no-user-gesture-required"] }); }
    catch(e){ last = e; await sleep(1000 * (i + 1)); }
  }
  throw last;
}

async function capture(browser, base, s){                                        // one screen, isolated + 1 retry
  for(let attempt = 0; attempt < 2; attempt++){
    const page = await browser.newPage();
    try {
      await page.setViewport(VIEWPORT);
      const col = JSON.stringify((STATES[s.state] || STATES.full)());
      await page.evaluateOnNewDocument((c) => {
        localStorage.setItem("halves.collected", c);
        localStorage.setItem("halves.gold", "987654321");
        localStorage.setItem("halves.dev", "1");
      }, col);
      await page.goto(base, { waitUntil: "load", timeout: 15000 });
      if(s.hash) await page.evaluate(h => { location.hash = h; }, s.hash);
      await sleep(700);
      // headless has no user-gesture-unlocked AudioContext, so sfx() throws on question-advance
      // (skip/correct) and aborts the round — silence Sound (now initialised) so in-play screens drive.
      await page.evaluate(() => { if(window.Sound) for(const k in window.Sound){ if(typeof window.Sound[k] === "function") try { window.Sound[k] = () => {}; } catch(e){} } });
      if(s.prep) await s.prep(page);
      await sleep(400);
      const file = path.join(OUT, s.name + "-web.png");
      await page.screenshot({ path: file });
      const bytes = fs.statSync(file).size;
      await page.close();
      return { name: s.name, ok: true, bytes, state: s.state, note: s.note };
    } catch(e){
      await page.close().catch(() => {});
      if(attempt === 1) return { name: s.name, ok: false, error: e.message.split("\n")[0], state: s.state, note: s.note };
      await sleep(800);
    }
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const list = only.length ? SCREENS.filter(s => only.includes(s.name)) : SCREENS;
  const server = serve(DEV); await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await launch();
  const results = [];
  try {
    for(const s of list){
      const r = await capture(browser, base, s);
      results.push(r);
      console.log(r.ok ? `  ok ${r.name} (${r.bytes}b)` : `  XX ${r.name} — ${r.error}`);
    }
  } finally { await browser.close().catch(() => {}); server.close(); }

  // merge into the manifest (a targeted re-run updates only its entries)
  const mf = path.join(OUT, "manifest.json");
  let screens = {}; try { screens = JSON.parse(fs.readFileSync(mf, "utf8")).screens || {}; } catch(e){}
  for(const r of results) screens[r.name] = { ok: r.ok, bytes: r.bytes || 0, state: r.state, note: r.note, error: r.error };
  const ok = results.filter(r => r.ok).length;
  fs.writeFileSync(mf, JSON.stringify({ _note: "web-GG1 visual-parity reference map (see README.md)", viewport: VIEWPORT,
    captured: ok, total: results.length, screens }, null, 1) + "\n");
  // emit the EXACT collected states the refs were captured with, so B renders byte-identical data
  // (a data-dependent compare then reflects visual diffs only, not different collections — ledger N5).
  fs.writeFileSync(path.join(OUT, "capture-states.json"), JSON.stringify(Object.assign(
    { _note: "Exact `halves.collected` states these refs were captured with; B seeds the SAME state per screen (manifest gives each screen's state name). `gold` = the fixed `halves.gold` ALL captures used — seed it too for data-dependent screens (home header + hoard pile, results gold).",
      gold: "987654321" },
    Object.fromEntries(Object.keys(STATES).map(k => [k, STATES[k]()])))) + "\n");
  console.log(`\n${ok}/${results.length} captured -> ${OUT}  (+ capture-states.json)`);
})();
