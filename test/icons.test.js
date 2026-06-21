/* T117 — every chrome emoji is replaced by a house generative PIXEL ICON (icons.js
 * / window.Icons), in the style of the existing procedural icons. This gate proves:
 *   (a) window.Icons renders each needed icon as a non-empty 1-bit SVG mask + the
 *       inline span() / installCSS() helpers work;
 *   (b) NONE of the targeted chrome emoji remain in ANY shipped file (the content
 *       arrows → / ↑ / ↓ and the scroll-cue ▾ are the only allowed pictographs);
 *   (c) the wiring is in place (icons.js loaded, masks installed at boot, a safe
 *       inline ic() helper, node-state badges map each state to a distinct icon).
 * Run: node test/icons.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// ---- (a) the icon module renders -------------------------------------------
global.window = {};
new Function(read("icons.js"))();
const I = global.window.Icons;
ok(I && typeof I.svgURI === "function" && typeof I.span === "function" && typeof I.installCSS === "function", "(a) window.Icons exposes svgURI / span / installCSS");
const NEEDED = ["lock","soundOn","soundOff","cog","coin","calendar","swords","flag","map","star","sparkles","fullscreen","backspace","close","check","play"];
NEEDED.forEach(n => {
  ok(I.names.indexOf(n) >= 0, "(a) icon '" + n + "' exists");
  const u = I.svgURI(n);
  ok(u && /^data:image\/svg\+xml,/.test(u) && /%3Crect/.test(u), "(a) icon '" + n + "' renders a NON-EMPTY 1-bit SVG mask");
});
ok(I.svgURI("nope") === "", "(a) an unknown icon name renders nothing (no crash)");
ok(/^<span class="px-ic lock" aria-hidden="true"><\/span>$/.test(I.span("lock")), "(a) span() emits a decorative (aria-hidden) px-ic span");
// installCSS injects one mask rule per icon
let styleText = "";
const doc = { getElementById: () => null, createElement: () => ({ id: "", set textContent(v){ styleText = v; }, get textContent(){ return styleText; } }), head: { appendChild(){} } };
I.installCSS(doc);
ok(/\.px-ic\.lock\{[^}]*mask-image:url/.test(styleText) && /\.px-ic\.play\{/.test(styleText), "(a) installCSS injects a .px-ic.<name>{mask-image} rule per icon");

// ---- (b) NO targeted chrome emoji remain in ANY shipped file ----------------
const SHIPPED = ["index.html","icons.js","glyphs.js","modes.js","events.js","guides.js","collectibles.js",
  "heroes.js","enemies.js","monsters.js","scenery.js","eventart.js","fx.js","fxgl.js","sound.js","main.js"];
const BANNED = ["🔒","🔊","🔇","⚙","🪙","🗓","⚔","🏁","🗺","⭐","★","✨","⛶","⌫","✕","✓","▶"];
let leftover = [];
SHIPPED.forEach(f => { const s = read(f); BANNED.forEach(ch => { if(s.indexOf(ch) >= 0) leftover.push(f + " has " + ch); }); });
ok(leftover.length === 0, "(b) NO targeted chrome emoji remain in the shipped files (" + (leftover.join("; ") || "clean") + ")");

// ---- (b cont.) the KEPT content pictographs are untouched -------------------
const main = read("main.js"), guides = read("guides.js"), html = read("index.html");
ok((main + guides + read("modes.js")).indexOf("→") >= 0, "(b) the → answer/flow arrow (maths content) is untouched");
ok(html.indexOf("↑") >= 0 || main.indexOf("↑") >= 0, "(b) the ↑ (content/jump) is untouched");
ok(html.indexOf("▾") >= 0, "(b) the ▾ scroll-cue (T116) is untouched");

// ---- (c) wiring -------------------------------------------------------------
ok(/<script src="icons\.js">/.test(html), "(c) index.html loads icons.js");
ok(html.indexOf("icons.js") < html.indexOf("main.js"), "(c) icons.js loads before main.js");
ok(/Icons\.installCSS\(\)/.test(main), "(c) main.js installs the icon masks at boot");
ok(/function ic\(name\)\{ return \(window\.Icons/.test(main), "(c) main.js has a SAFE ic() inline-icon helper (no-op if icons.js is absent)");
// node-state badges map each state to a distinct pixel icon (state semantics kept)
ok(/locked:"lock"[\s\S]{0,60}unlocked:"play"[\s\S]{0,40}mastered:"star"[\s\S]{0,40}done:"check"/.test(main), "(c) node-state badges map each state (locked/unlocked/mastered/done) to a distinct icon");
// a11y: the nav icon buttons keep their aria-label (icon is decorative)
ok(/id="soundBtnMenu" aria-label="Toggle sound"/.test(html) && /id="settingsBtn" aria-label="Settings"/.test(html) && /id="fsBtn" aria-label="Toggle fullscreen"/.test(html),
   "(c) nav icon buttons keep their aria-label (the pixel icon is decorative)");
// the numpad backspace still carries its key behaviour (data-k="back") with an icon
ok(/data-k="back"><span class="px-ic backspace">/.test(html), "(c) the numpad ⌫ key is now a backspace pixel icon (key behaviour intact)");

// ---- (d) T121(b) — the two STATUS icons take their accompanying text's colour --
const css = read("styles.css");
ok(/\.px-ic\.coin\{[^}]*background-color:var\(--amber\)/.test(css), "(d) T121: the coin icon reads GOLD (.px-ic.coin = --amber)");
ok(/\.px-ic\.calendar\{[^}]*background-color:var\(--mint\)/.test(css), "(d) T121: the momentum calendar reads GREEN (.px-ic.calendar = --mint)");
ok(/\.px-ic\{[^}]*background-color:currentColor/.test(css), "(d) every OTHER icon stays muted/inherited (.px-ic = currentColor)");
// only those two get a colour override (the rest are not individually recoloured)
const overrides = (css.match(/\.px-ic\.\w+\{[^}]*background-color/g) || []).map(s => s.match(/\.px-ic\.(\w+)/)[1]).sort();
ok(overrides.length === 2 && overrides[0] === "calendar" && overrides[1] === "coin", "(d) exactly the coin + calendar icons are recoloured (" + overrides.join(",") + ")");

console.log("\n" + (fails === 0 ? "ALL " + checks + " ICON CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
