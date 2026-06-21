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

// (a2) T142 — HONEST contrast over the FX backdrop, PER ELEMENT. The full-bleed
// backdrop (T112) can render bright (fxgl's home palette pool includes pure white;
// Arena `glow` stops reach ~240), so light-grey --muted floating on it fails AA.
// T123 used a global `.app` scrim — but `.app` is ~full phone width, so it turned the
// backdrop into a dark slab (owner regression). T142 removes that and instead gives
// the FEW genuinely floating-on-backdrop rows a LOCAL dark backing (the rest is
// carded). This gate asserts: (1) NO global `.app` scrim, and (2) each floating row
// has a backing strong enough that --muted clears AA over the worst-case (white)
// backdrop pixel — and FAILS if a floating row is left unprotected.
function toHex(a){ return "#" + a.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join(""); }
ok(!/\.app\{[^}]*background:\s*rgba/.test(css), "T142: NO global .app scrim (the full-bleed backdrop reads again — owner's 'nice background' back)");
// the rows that float directly on the backdrop (backdrop shows only on #start/#arena);
// everything else is carded (e.g. .topic-info has background:var(--surface)).
const FLOATERS = ["\\.readouts", "\\.build", "#arena \\.res-label"];
FLOATERS.forEach(sel => {
  const m = css.match(new RegExp(sel + "\\{[^}]*background:\\s*rgba\\((\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*([\\d.]+)\\)"));
  ok(!!m, "T142: floating row '" + sel.replace(/\\/g, "") + "' has a LOCAL contrast backing (unprotected ⇒ FAIL)");
  if(m){
    const back = [+m[1], +m[2], +m[3]], a = parseFloat(m[4]);
    const eff = toHex([0,1,2].map(i => a * back[i] + (1 - a) * 255));   // local backing composited over the worst-case white backdrop
    ok(ratio(muted, eff) >= 4.5, "T142: '" + sel.replace(/\\/g, "") + "' backing → --muted " + ratio(muted, eff).toFixed(2) + ":1 over the brightest backdrop (AA)");
  }
});
// over-backdrop muted text must not be opacity-dimmed below the floor (the `.build`
// stamp used opacity:.7, which lightened it under its backing → sub-AA).
ok(!/\.build\{[^}]*opacity:\s*0?\.[0-9]/.test(css), "T142: the build stamp isn't opacity-dimmed (would drop --muted under AA over its backing)");

// (b) hierarchy: muted must read dimmer than text on the page background
ok(lum(muted) < lum(text), "--muted stays dimmer than --text (hierarchy preserved)");

// (c) no font-size under 10px survives
const sizes = [...css.matchAll(/font-size:\s*([0-9]+(?:\.[0-9]+)?)px/g)].map(m => parseFloat(m[1]));
const tiny = sizes.filter(s => s < 10);
ok(tiny.length === 0, "no font-size rule under 10px (" + sizes.length + " rules, smallest " + Math.min.apply(null, sizes) + "px)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " CONTRAST CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
