/* T218 — nav "new-since-seen" notification badges. A reusable tracker badges a
 * nav button (Items / Heroes) when its surface has something NEW the user hasn't
 * viewed, and clears when they open it. The tally per surface is MONOTONIC
 * (collectibles + hero-unlocks only grow), so "new" = growth since last view; the
 * marker is SEEDED to the current tally on first sight (so pre-existing collections
 * never false-badge), persisted, and re-set on open. This proves:
 *   (A) the new-since-seen ALGORITHM over a faithful mock store: seed→0 (no false
 *       positive), growth→delta, mark→0, persists across reload, per-surface
 *       independence, never negative, display cap;
 *   (B) main.js WIRES that algorithm (seed branch, markNavSeen on both routes,
 *       renderNavBadges from applyGates, feature-gating, the localStorage key,
 *       cap + aria-label, the items/heroes tally sources);
 *   (C) the badge has a real corner-anchored style + the nav buttons exist.
 * Run: node gg1/dev/test/nav-badges.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// ---- (A) the new-since-seen algorithm, over a mock store mirroring main.js ----
(function algorithm(){
  // Faithful re-statement of main.js's loadNavSeen/saveNavSeen/navNewCount/markNavSeen
  // semantics against an injected store + tally, so we exercise the exact contract.
  let store = {};                                  // stands in for (scoped) localStorage
  const loadSeen = () => { try{ const v = JSON.parse(store["halves.navSeen"]); return (v && typeof v === "object") ? v : {}; }catch(e){ return {}; } };
  const saveSeen = o => { store["halves.navSeen"] = JSON.stringify(o); };
  let tally = {};                                  // current monotonic tally per surface
  const newCount = s => { const seen = loadSeen(); const cur = tally[s] || 0; if(seen[s] == null){ seen[s] = cur; saveSeen(seen); return 0; } return Math.max(0, cur - seen[s]); };
  const mark = s => { const seen = loadSeen(); seen[s] = (tally[s] || 0); saveSeen(seen); };

  // (1) first sight of an EXISTING collection seeds → no false positive
  tally.items = 500;
  ok(newCount("items") === 0, "(A1) first sight of a pre-existing tally (500) badges 0 — no false positive");
  ok(loadSeen().items === 500, "(A1) …and the seed was persisted at the current tally");

  // (2) growth since seed → the delta
  tally.items = 507;
  ok(newCount("items") === 7, "(A2) +7 collected since last view → badge 7");

  // (3) opening the surface clears it; clear survives a 'reload' (re-read store)
  mark("items");
  ok(newCount("items") === 0, "(A3) opening the surface clears the badge");
  const reloaded = loadSeen();                     // simulate reload: state read back from store
  ok(reloaded.items === 507, "(A3) the acknowledged marker persisted across reload");

  // (4) surfaces are independent
  tally.heroes = 3;
  ok(newCount("heroes") === 0, "(A4) heroes seeds independently (no cross-talk from items)");
  tally.heroes = 4;
  ok(newCount("heroes") === 1 && newCount("items") === 0, "(A4) a new hero badges Heroes only, not Items");

  // (5) never negative (defensive — a tally can never drop below seen, but if it did)
  tally.items = 400;
  ok(newCount("items") === 0, "(A5) a tally below the seen marker never yields a negative badge");

  // (6) a brand-new player: seeds 0, then grows correctly
  store = {}; tally = { items: 0 };
  ok(newCount("items") === 0, "(A6) brand-new player seeds at 0 → no badge");
  tally.items = 1;
  ok(newCount("items") === 1, "(A6) first ever item badges 1");

  // (7) display cap: any count over 9 renders "9+"
  const label = n => (n > 9 ? "9+" : String(n));
  ok(label(1) === "1" && label(9) === "9" && label(10) === "9+" && label(250) === "9+", "(A7) badge text shows the count, capped at \"9+\"");
})();

// ---- (B) main.js wires exactly that algorithm -------------------------------
(function wiring(){
  const m = read("main.js");
  ok(/localStorage\.getItem\("halves\.navSeen"\)/.test(m) && /localStorage\.setItem\("halves\.navSeen"/.test(m),
     "(B) persists the seen markers under the scoped \"halves.navSeen\" key");
  ok(/seen\[surface\] == null\)\{ seen\[surface\] = cur; saveNavSeen\(seen\); return 0;/.test(m),
     "(B) navNewCount SEEDS the marker to the current tally on first sight (no false positives)");
  ok(/return Math\.max\(0, cur - seen\[surface\]\);/.test(m),
     "(B) the badge count is the monotonic growth since last view (clamped ≥ 0)");
  ok(/function markNavSeen\(surface\)\{ const seen = loadNavSeen\(\); seen\[surface\] = navTally\(surface\);/.test(m),
     "(B) markNavSeen re-sets the marker to the current tally (acknowledge)");
  // the items tally counts owned CATALOGUE items; heroes via isHeroUnlocked
  ok(/surface === "items"\)\s+return Object\.keys\(c\)\.filter\(k => C\.byId\(k\)\)\.length/.test(m),
     "(B) the Items tally = owned catalogue collectibles");
  ok(/surface === "heroes"\)\{ const Hs = window\.Heroes; return Hs \? Hs\.HEROES\.filter\(h => Hs\.isHeroUnlocked\(h, c\)\)\.length/.test(m),
     "(B) the Heroes tally = unlocked heroes");
  // markNavSeen fires when each surface is OPENED (both route branches)
  ok(/h === "inventory"\)\{ renderInventory\(\); show\("inventory"\); markNavSeen\("items"\);/.test(m),
     "(B) opening Inventory acknowledges the Items badge");
  ok(/h === "heroes"\)\{ renderHeroes\(\); show\("heroes"\); markNavSeen\("heroes"\);/.test(m),
     "(B) opening Heroes acknowledges the Heroes badge");
  // badges are rendered on the home render, feature-gated, capped + accessible
  ok(/function applyGates\(\)\{[\s\S]{0,260}renderNavBadges\(\);/.test(m),
     "(B) renderNavBadges runs from applyGates (the home render)");
  ok(/isFeatureUnlocked\(cfg\.feature\) \? navNewCount\(cfg\.surface\) : 0/.test(m),
     "(B) a still-locked surface never badges (feature-gated)");
  ok(/badge\.textContent = n > 9 \? "9\+" : String\(n\);/.test(m),
     "(B) the badge shows the count, capped \"9+\"");
  ok(/badge\.setAttribute\("aria-label", n \+ " new"\);/.test(m),
     "(B) the badge is accessible (aria-label \"N new\")");
  ok(/\{ surface:"items",\s*btn:"invBtn",\s*feature:"inventory" \}/.test(m) && /\{ surface:"heroes", btn:"heroesBtn", feature:"heroes" \}/.test(m),
     "(B) NAV_BADGES maps Items→#invBtn and Heroes→#heroesBtn");
})();

// ---- (C) the badge has a real corner style + the nav buttons exist ----------
(function presentation(){
  const css = read("styles.css"), html = read("index.html");
  ok(/\.navbtn\{position:relative;/.test(css), "(C) .navbtn is a positioning context for the badge");
  ok(/\.navbtn \.nav-badge\{position:absolute;[^}]*top:-?\d/.test(css), "(C) .nav-badge is corner-anchored (absolute, top offset)");
  ok(/\.navbtn \.nav-badge\{[^}]*background:var\(--coral\)/.test(css), "(C) the badge uses the coral alert colour");
  ok(/id="invBtn"/.test(html) && /id="heroesBtn"/.test(html), "(C) the Items + Heroes nav buttons exist to host the badge");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " NAV-BADGE CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
