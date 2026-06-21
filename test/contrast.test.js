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

// (a2) T123 — HONEST contrast over the FX backdrop. The full-bleed backdrop (T112)
// renders behind the transparent content column, and it CAN be bright (fxgl's home
// palette pool includes pure white `[255,255,255]`; Arena `glow` stops reach ~240),
// so light-grey --muted on a light backdrop fails AA. The fix is a semi-opaque dark
// scrim on `.app`. This gate derives that scrim and asserts --muted clears AA against
// the scrim composited over the BRIGHTEST backdrop pixel (white = the worst case the
// backdrop can render) — i.e. the REAL rendered background behind text, not the dark
// token. Without the scrim (or too weak a one) this FAILS (today's grey-on-purple).
function toHex(a){ return "#" + a.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join(""); }
const appBg = css.match(/\.app\{[^}]*background:\s*rgba\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\)/);
ok(!!appBg, "T123: a dark scrim exists on .app (the contrast floor behind the backdrop)");
if(appBg){
  const scrim = [+appBg[1], +appBg[2], +appBg[3]], a = parseFloat(appBg[4]);
  const WHITE = [255, 255, 255];                          // the brightest pixel the backdrop can render (home palette includes it)
  const eff = toHex([0,1,2].map(i => a * scrim[i] + (1 - a) * WHITE[i]));   // scrim composited over the worst-case backdrop
  const r = ratio(muted, eff);
  ok(r >= 4.5, "T123: --muted over the scrim+brightest-backdrop (" + eff + ") = " + r.toFixed(2) + ":1 (AA ≥ 4.5 — honest, not vs the dark token)");
  ok(ratio(text, eff) >= 4.5, "T123: --text over the scrim+brightest-backdrop = " + ratio(text, eff).toFixed(2) + ":1 (AA)");
}
// (a3) over-backdrop muted text must not be opacity-dimmed below the floor (the
// `.build` stamp used opacity:.7, which lightened it under the scrim → sub-AA).
ok(!/\.build\{[^}]*opacity:\s*0?\.[0-9]/.test(css), "T123: the build stamp isn't opacity-dimmed (would drop --muted under AA over the scrim)");

// (b) hierarchy: muted must read dimmer than text on the page background
ok(lum(muted) < lum(text), "--muted stays dimmer than --text (hierarchy preserved)");

// (c) no font-size under 10px survives
const sizes = [...css.matchAll(/font-size:\s*([0-9]+(?:\.[0-9]+)?)px/g)].map(m => parseFloat(m[1]));
const tiny = sizes.filter(s => s < 10);
ok(tiny.length === 0, "no font-size rule under 10px (" + sizes.length + " rules, smallest " + Math.min.apply(null, sizes) + "px)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " CONTRAST CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
