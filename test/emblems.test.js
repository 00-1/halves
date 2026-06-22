/* T181 — emblems.js (generative brand emblems / app-icon candidates) headless tests.
 * Pins each emblem's deterministic cell grid as a golden (like glyphs/fxgl), and proves
 * draw() renders centred + MASKABLE-safe (corners = field, subject centred) at icon sizes.
 * Run: node test/emblems.test.js   ·   regenerate: UPDATE_GOLDEN=1 node test/emblems.test.js
 */
const { check } = require("./golden-util.js");
const Emblems = require("../emblems.js");

let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }
function gold(name, value){ const r = check(name, value); ok(r.match, "golden '" + name + "'" + (r.updated ? " (regenerated)" : "") + (r.match ? "" : " — " + r.hint)); }

// the candidate set (the owner picks the launcher icon; the rest become unlockable)
ok(Array.isArray(Emblems.IDS) && Emblems.IDS.length >= 5, "≥5 emblem candidates (" + Emblems.IDS.length + ": " + Emblems.IDS.join(", ") + ")");
ok(Emblems.IDS.indexOf("coin") >= 0 && Emblems.IDS.indexOf("goblin") >= 0 && Emblems.IDS.indexOf("hoard") >= 0 && Emblems.IDS.indexOf("voidthrone") >= 0 && Emblems.IDS.indexOf("crowncoin") >= 0, "the owner's five proposals are present (coin/goblin/hoard/voidthrone/crowncoin)");

// (1) each emblem builds a deterministic, non-trivial cell grid — golden-pinned.
const BG = "#" + Emblems.BG.map(v => v.toString(16).padStart(2, "0")).join("");
for(const id of Emblems.IDS){
  const a = Emblems.cells(id), b = Emblems.cells(id);
  ok(a && a.size === Emblems.SIZE && a.cells.length === Emblems.SIZE, "cells('" + id + "') is a " + Emblems.SIZE + "² grid");
  ok(JSON.stringify(a) === JSON.stringify(b), "cells('" + id + "') is deterministic");
  let lit = 0, inks = {};
  for(const row of a.cells) for(const v of row){ if(v){ lit++; inks[v] = 1; } }
  ok(lit > 60, "'" + id + "' has a substantial subject (" + lit + " lit cells)");
  ok(inks[2] && inks[3] && inks[4], "'" + id + "' uses the full gold ramp (shadow/mid/highlight) — a lit bevel, not flat");
  // compact, reviewable golden: per-row lit-cell counts + the ink set
  gold("emblem_" + id, { size: a.size, rows: a.cells.map(r => r.reduce((s, v) => s + (v ? 1 : 0), 0)), inks: Object.keys(inks).map(Number).sort() });
}
ok(Emblems.cells("nope") === null, "an unknown id returns null (no throw)");

// (2) draw() renders centred + MASKABLE (the subject never relies on the corners) at
//     icon sizes, on a recording 2D context.
function mkCanvas(W, H){
  const buf = new Array(W * H).fill(null); let fs = "#000";
  const ctx = { get fillStyle(){ return fs; }, set fillStyle(v){ fs = v; }, imageSmoothingEnabled: true,
    fillRect(x, y, w, h){ x |= 0; y |= 0; w |= 0; h |= 0; for(let yy = y; yy < y + h; yy++) for(let xx = x; xx < x + w; xx++) if(xx >= 0 && xx < W && yy >= 0 && yy < H) buf[yy * W + xx] = fs; } };
  return { width: W, height: H, getContext: () => ctx, _px: (x, y) => buf[(y | 0) * W + (x | 0)] };
}
for(const sz of [48, 192, 512]){
  const c = mkCanvas(sz, sz);
  ok(Emblems.draw(c, "coin", null) === true, "draw(coin) succeeds @ " + sz + "px");
  ok(c._px(0, 0) === BG && c._px(sz - 1, 0) === BG && c._px(0, sz - 1) === BG && c._px(sz - 1, sz - 1) === BG, "@ " + sz + "px: all four CORNERS are the field (maskable-safe)");
  ok(c._px(sz >> 1, sz >> 1) !== BG && c._px(sz >> 1, sz >> 1) != null, "@ " + sz + "px: the CENTRE carries the subject (gold), not the field");
}
// every candidate renders without error + fills the field full-bleed
let allDraw = true, fieldFilled = true;
for(const id of Emblems.IDS){ const c = mkCanvas(64, 64); if(!Emblems.draw(c, id)) allDraw = false; if(c._px(2, 2) !== BG) fieldFilled = false; }
ok(allDraw, "every emblem draws to a canvas");
ok(fieldFilled, "every emblem fills the violet field full-bleed (no transparent gaps → maskable)");
ok(Emblems.draw(null, "coin") === false && Emblems.draw(mkCanvas(0, 0), "coin") === false && Emblems.draw(mkCanvas(64, 64), "nope") === false, "draw() is graceful on bad input (no canvas / 0-size / unknown id)");

console.log("\n" + (fails === 0 ? "ALL " + checks + " EMBLEM CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
