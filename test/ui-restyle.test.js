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

console.log("\n" + (fails === 0 ? "ALL " + checks + " UI-RESTYLE CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
