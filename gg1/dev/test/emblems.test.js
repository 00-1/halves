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

// T205 — the set is now EXACTLY the 3 creatures (Magnar `hero:mo` is the launcher icon; the 6
// abstract marks were scrapped → these 3 become Collector awards).
ok(Array.isArray(Emblems.IDS) && Emblems.IDS.length === 3, "exactly 3 emblems remain (" + Emblems.IDS.join(", ") + ")");
ok(["beast", "goblinking", "voidbeast"].every(id => Emblems.IDS.indexOf(id) >= 0), "T205: the 3 kept CREATURES are present (beast/goblinking/voidbeast)");
ok(["coin", "crowncoin", "hoard", "goblin", "voidthrone", "sigil"].every(id => Emblems.IDS.indexOf(id) < 0 && Emblems.cells(id) === null), "T205: the 6 abstract marks are SCRAPPED (gone from IDS + cells() returns null)");

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
  ok(Emblems.draw(c, "beast", null) === true, "draw(beast) succeeds @ " + sz + "px");
  ok(c._px(0, 0) === BG && c._px(sz - 1, 0) === BG && c._px(0, sz - 1) === BG && c._px(sz - 1, sz - 1) === BG, "@ " + sz + "px: all four CORNERS are the field (maskable-safe)");
  ok(c._px(sz >> 1, sz >> 1) !== BG && c._px(sz >> 1, sz >> 1) != null, "@ " + sz + "px: the CENTRE carries the subject (gold), not the field");
}
// every candidate renders without error + fills the field full-bleed
let allDraw = true, fieldFilled = true;
for(const id of Emblems.IDS){ const c = mkCanvas(64, 64); if(!Emblems.draw(c, id)) allDraw = false; if(c._px(2, 2) !== BG) fieldFilled = false; }
ok(allDraw, "every emblem draws to a canvas");
ok(fieldFilled, "every emblem fills the violet field full-bleed (no transparent gaps → maskable)");
ok(Emblems.draw(null, "beast") === false && Emblems.draw(mkCanvas(0, 0), "beast") === false && Emblems.draw(mkCanvas(64, 64), "nope") === false, "draw() is graceful on bad input (no canvas / 0-size / unknown id)");

// T205 — the creatures FILL the cell cleanly (no dead margin, nothing clipped) + all 3 read the
// SAME visual size, so they match the other Collector-award icons (the owner: "they look like
// they need cropping" — the old full-grid map left them small/off-centre).
function subjectExtent(id, S){
  const c = mkCanvas(S, S); Emblems.draw(c, id);
  let minX = S, minY = S, maxX = -1, maxY = -1;
  for(let y = 0; y < S; y++) for(let x = 0; x < S; x++){ const p = c._px(x, y); if(p && p !== BG){ if(x < minX) minX = x; if(x > maxX) maxX = x; if(y < minY) minY = y; if(y > maxY) maxY = y; } }
  return { w: (maxX - minX + 1) / S, h: (maxY - minY + 1) / S, minX: minX, minY: minY, maxX: maxX, maxY: maxY, S: S };
}
const ext = Emblems.IDS.map(id => ({ id: id, e: subjectExtent(id, 96) }));
const spanOf = e => Math.max(e.w, e.h);
ok(ext.every(({ e }) => spanOf(e) >= 0.78 && spanOf(e) <= 1.0), "T205: each creature FILLS the cell (subject spans ≥78% — no dead margin: " + ext.map(({ id, e }) => id + " " + Math.round(spanOf(e) * 100) + "%").join(", ") + ")");
ok(ext.every(({ e }) => e.minX >= 1 && e.minY >= 1 && e.maxX <= e.S - 2 && e.maxY <= e.S - 2), "T205: nothing is CLIPPED — a field margin remains on every side (centred, maskable)");
const spans = ext.map(({ e }) => spanOf(e));
ok(Math.max.apply(null, spans) - Math.min.apply(null, spans) <= 0.12, "T205: the 3 creatures read the SAME visual size (fill spans within 12%: " + spans.map(s => Math.round(s * 100) + "%").join("/") + ")");

console.log("\n" + (fails === 0 ? "ALL " + checks + " EMBLEM CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
