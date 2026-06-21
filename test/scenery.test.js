/* T53 — Arena region scenery: 10 distinct, deterministic, themed backdrops that
 * keep text legible (AA) under the scrim, drawn statically (no RAF).
 * Run: node test/scenery.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
new Function(read("scenery.js"))();
const S = global.window.Scenery;
const ser = g => g.map(r => r.join("")).join("|");

// ---- 10 distinct, deterministic scenes ----
const sigs = []; for(let r=0;r<10;r++) sigs.push(ser(S.buildGrid(r)));
ok(new Set(sigs).size === 10, "all 10 region scenes are distinct (" + new Set(sigs).size + "/10)");
ok(ser(S.buildGrid(3)) === ser(S.buildGrid(3)), "a region's scene is deterministic");
ok(ser(S.buildGrid(5)) !== ser(S.buildGrid(6)), "adjacent regions differ");

// ---- WCAG-AA: --text and --muted stay legible over the scrim'd backdrop ----
const SCRIM = 0.64, DARK = [8,10,14];                 // must match scenery.js draw()
const TEXT = "#E6E9EF", MUTED = "#939CAB";            // from styles.css :root
function hx(c){ return [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)]; }
function lin(v){ v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }
function lum(rgb){ return 0.2126*lin(rgb[0]) + 0.7152*lin(rgb[1]) + 0.0722*lin(rgb[2]); }
function ratio(fg, bg){ const a = lum(hx(fg)), b = lum(bg.map ? bg : hx(bg)); return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05); }
function scrimOver(rgb){ return rgb.map((v,i) => (1-SCRIM)*v + SCRIM*DARK[i]); }
// the worst case for text is the BRIGHTEST cell in a scene (after scrim)
let worstText = 99, worstMuted = 99, worstRegion = -1;
for(let r=0;r<10;r++){
  const g = S.buildGrid(r); let bright = [0,0,0], bl = -1;
  for(const row of g) for(const cell of row){ const L = lum(hx(cell)); if(L > bl){ bl = L; bright = hx(cell); } }
  const bg = scrimOver(bright);
  const rt = ratio(TEXT, bg), rm = ratio(MUTED, bg);
  if(rt < worstText) worstText = rt;
  if(rm < worstMuted){ worstMuted = rm; worstRegion = r; }
}
ok(worstText >= 4.5, "--text ≥ 4.5:1 over the brightest scrim'd scene (worst " + worstText.toFixed(2) + ")");
ok(worstMuted >= 4.5, "--muted ≥ 4.5:1 over the brightest scrim'd scene (worst " + worstMuted.toFixed(2) + " @region " + worstRegion + ")");

// ---- static (no RAF) + standalone ----
const code = read("scenery.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
ok(!/requestAnimationFrame|setInterval/.test(code), "no animation loop — static draw");
ok(!/Collectibles|Monsters|drawIcon/.test(code), "scenery is standalone (no icon/monster reuse)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " SCENERY CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
