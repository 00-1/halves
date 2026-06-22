/* T100 — "gamey" pixel-bevel restyle (buttons-first + squared panels), the
 * T97-recommended blend. Proves the restyle ships, is token-driven, keeps body
 * text clean, and is FULLY REVERSIBLE (every rule gated on <html data-ui="pixel">
 * so the classic CSS is the untouched fallback). Headless can't judge pixels, so
 * this asserts the structural contract a reviewer/owner can rely on.
 * Run: node test/ui-restyle.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

const css = read("styles.css"), html = read("index.html");

// ---- (1) it SHIPS on: the document selects the pixel look -------------------
ok(/<html[^>]*\bdata-ui="pixel"/.test(html), "(1) index.html ships the gamey look (<html data-ui=\"pixel\">)");

// ---- (2) token-driven: a :root[data-ui=\"pixel\"] token block exists ---------
const tokBlock = (css.match(/:root\[data-ui="pixel"\]\{[^}]*\}/) || [])[0] || "";
ok(!!tokBlock, "(2) a :root[data-ui=\"pixel\"] token block exists");
ok(/--ui-radius:\s*2px/.test(tokBlock), "(2) --ui-radius is squared (2px)");
ok(/--ui-bevel-hi:/.test(tokBlock) && /--ui-bevel-lo:/.test(tokBlock), "(2) pixel-bevel highlight/shade tokens are defined");
ok(/--focus:\s*2px solid var\(--amber\)/.test(tokBlock), "(2) a visible focus-ring token is defined (a11y)");

// ---- (3) REVERSIBLE: every restyle rule is gated on [data-ui=\"pixel\"] ------
// slice the appended T100 block (from its banner comment to EOF) and check that
// every selector in it is scoped under [data-ui="pixel"] — nothing leaks to the
// classic look.
const blockStart = css.indexOf("T100 — \"gamey\" pixel-bevel restyle");
ok(blockStart > 0, "(3) the T100 restyle block is present");
const block = css.slice(blockStart);
const selectors = block.match(/^[^@\n][^{]*\{/gm) || [];
const ungated = selectors.filter(s => !/data-ui="pixel"/.test(s));
ok(ungated.length === 0, "(3) every restyle rule is gated on [data-ui=\"pixel\"] (classic look untouched) — " + ungated.length + " leaks");
// the classic base styles are still intact above the block (the fallback look)
ok(/\.btn\{[^}]*border-radius:14px/.test(css), "(3) the classic .btn (radius 14px) is untouched — flipping data-ui reverts");
ok(/\.event-banner\{[^}]*box-shadow:0 4px 16px/.test(css), "(3) the classic soft banner shadow is untouched — reverts on flip");

// ---- (4) BUTTONS: squared + pixel-bevel + invert-on-press + focus ring -------
const btnRule = (block.match(/\[data-ui="pixel"\] \.btn,[\s\S]*?\}/) || [])[0] || "";
ok(/\.key/.test(btnRule) && /\.navbtn/.test(btnRule) && /\.eb-play/.test(btnRule), "(4) the button restyle covers .btn/.key/.navbtn/.eb-play (the owner's gripe)");
ok(/border-radius:var\(--ui-radius\)/.test(btnRule), "(4) buttons take the squared --ui-radius");
ok(/box-shadow:inset 2px 2px 0 var\(--ui-bevel-hi\), inset -2px -2px 0 var\(--ui-bevel-lo\)/.test(btnRule), "(4) buttons get the pixel-bevel inset highlight/shade");
ok(/:active\{[^}]*inset -2px -2px 0 var\(--ui-bevel-hi\), inset 2px 2px 0 var\(--ui-bevel-lo\)/.test(block), "(4) the press state INVERTS the bevel (tactile push-in)");
ok(/:focus-visible\{[^}]*outline:var\(--focus\)/.test(block), "(4) buttons show the focus ring on :focus-visible (a11y)");

// ---- (5) PANELS: squared + hard-framed (no soft blur shadow) -----------------
const panelRule = (block.match(/\[data-ui="pixel"\] \.event-banner,[\s\S]*?\}/) || [])[0] || "";
ok(/\.modal-card/.test(panelRule) && /\.tnode/.test(panelRule) && /\.sum-row/.test(panelRule) && /\.inv-cat/.test(panelRule),
   "(5) the panel restyle covers the cards/panels (banner/modal/tnode/sum-row/inv-cat/…)");
ok(/border-radius:var\(--ui-radius\)/.test(panelRule), "(5) panels take the squared --ui-radius");
ok(/box-shadow:none/.test(panelRule), "(5) panels drop the soft blur shadow (hard-framed, machined look)");

// ---- (6) CLEAN TEXT: the restyle never swaps body text to a pixel font -------
ok(!/font-family/.test(block), "(6) the restyle sets NO font-family — body text/numerals stay clean (kid legibility)");

// ---- (7) T111 — the restyle COMPLETES every screen (no rounded chrome left) ---
// the named gaps + the swept screens are all now gated under [data-ui="pixel"].
["\\.hd-head","\\.hd-port","\\.hero-stat","\\.hd-boost",   // hero-detail
 "\\.slow-item","\\.rankline canvas",                       // results
 "\\.inv-cell","\\.inv-tab",                                // inventory
 "\\.arena-map-btn","\\.map-row","\\.ah-port","\\.ar-port", // arena
 "\\.pq-tile","\\.practice-hint-toggle",                    // practice
 "\\.set-danger","\\.g-eg","\\.event-live"].forEach(sel => {
  ok(new RegExp('\\[data-ui="pixel"\\] ' + sel + '[,{]').test(block), "(7) " + sel.replace(/\\\\/g,"") + " is now covered by the pixel restyle");
});
// and it's the strongest possible reversibility proof: a grep of the WHOLE block
// still finds zero ungated selectors (already asserted in (3)) AND every newly
// covered rule squares the radius or beveled — never a soft 8–18px radius left.
ok(!/border-radius:\s*\d/.test(block), "(7) no hard-coded px radius survives in the pixel block — all squared via --ui-radius");

// ---- (8) NAV: shortened label + no orphaned single button -------------------
ok(/id="settingsBtn"[^>]*>\s*<span class="px-ic [^"]*"><\/span><span class="nav-lbl">Setup<\/span>/.test(html),
   "(8) the Settings label is shortened to \"Setup\" (fits the row)");
ok(!/nav-lbl">Settings</.test(html), "(8) the long \"Settings\" label is gone");
// the no-orphan mechanism: 7 uniform wider buttons wrap+centre under the 360 cap
ok(/\.navrow\{[^}]*flex-wrap:wrap/.test(css) && /\.navrow\{[^}]*justify-content:center/.test(css) && /\.navrow\{[^}]*max-width:360px/.test(css),
   "(8) the nav row wraps + centres under a 360px cap (a wrapped row is balanced, not left-orphaned)");
const mw = (css.match(/\.navbtn\{[^}]*min-width:(\d+)px/) || [])[1];
ok(mw && Number(mw) >= 58, "(8) nav buttons are uniform & wide enough (min-width " + mw + "px) → 7 wrap to 4+3 / 5+2, never 6+1");

console.log("\n" + (fails === 0 ? "ALL " + checks + " UI-RESTYLE CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
