/* T46 — WCAG AA contrast + minimum-size gate (no browser).
 * Parses styles.css and asserts:
 *   (a) --muted is >= 4.5:1 (AA normal text) on every background it sits on
 *       (--bg, --surface, --surface-2, --line);
 *   (b) --muted stays visibly dimmer than --text (hierarchy preserved);
 *   (c) no `font-size: Npx` rule under 10px remains.
 * Run: node test/contrast.test.js   (also gated in the Pages workflow)
 */
const fs = require("fs"), path = require("path");
const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

// ---- pull the :root colour variables ----
function v(name){
  const m = css.match(new RegExp("--" + name + "\\s*:\\s*(#[0-9a-fA-F]{6})"));
  if(!m) throw new Error("missing --" + name);
  return m[1];
}
function rgb(hex){ return [1,3,5].map(i => parseInt(hex.slice(i, i+2), 16)); }

// ---- WCAG relative luminance + contrast ratio ----
function lum(hex){
  const [r,g,b] = rgb(hex).map(c => {
    c /= 255;
    return c <= 0.03928 ? c/12.92 : Math.pow((c + 0.055)/1.055, 2.4);
  });
  return 0.2126*r + 0.7152*g + 0.0722*b;
}
function ratio(a, b){
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const muted = v("muted"), text = v("text");
const BGS = ["bg", "surface", "surface-2", "line"];

// (a) muted >= 4.5:1 (AA normal) on every background
BGS.forEach(name => {
  const r = ratio(muted, v(name));
  ok(r >= 4.5, "--muted (" + muted + ") on --" + name + " = " + r.toFixed(2) + ":1 (AA ≥ 4.5)");
});

// (b) hierarchy: muted must read dimmer than text on the page background
ok(lum(muted) < lum(text), "--muted stays dimmer than --text (hierarchy preserved)");

// (c) no font-size under 10px survives
const sizes = [...css.matchAll(/font-size:\s*([0-9]+(?:\.[0-9]+)?)px/g)].map(m => parseFloat(m[1]));
const tiny = sizes.filter(s => s < 10);
ok(tiny.length === 0, "no font-size rule under 10px (" + sizes.length + " rules, smallest " + Math.min.apply(null, sizes) + "px)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " CONTRAST CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
