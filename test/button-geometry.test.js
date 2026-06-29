/* "Nice button" geometry — a MATHEMATICAL standard for text buttons, as a unit test.
 *
 * Owner-requested (2026-06-28): the home Start/Practice/Guide buttons "don't feel nice — padding
 * feels off-centre." This codifies what a nice button IS, mathematically, so it can be enforced
 * instead of eyeballed. The rules are grounded in platform guidance (Material 3, Apple HIG, MIT
 * Touch Lab) — see docs/agent/BUTTON-DESIGN.md for the sources.
 *
 * This is the REFERENCE spec (pure layout math). brickmap mirrors `checkButton` as a Rust unit
 * test over its real button layout values (rect + measured text box + font cap-height), so a button
 * that fails here fails there. Run: node test/button-geometry.test.js
 *
 * A button is described by:
 *   rect   {x,y,w,h}   the button's filled bounds (device px)
 *   text   {x,y,w,h}   the rendered label's tight bounding box, in the same coords
 *   cap    number      the font cap-height (px) — the visual height of the caps in the label
 */
"use strict";

// The standard — one tunable constant block (mirror these exact numbers in brickmap).
const NICE = {
  CENTER_TOL: 1.0,     // |text centre − button centre| ≤ 1px on each axis (text is CENTRED, not off-set)
  PAD_SYM_TOL: 1.0,    // |left−right| and |top−bottom| padding ≤ 1px (symmetric ⇒ centred)
  HV_RATIO_MIN: 1.5,   // horizontal padding ≥ 1.5× vertical (buttons breathe wider than tall; Material ~2–3×)
  HV_RATIO_MAX: 3.5,   // …but not absurdly wide-padded
  MIN_TOUCH: 44,       // min touch target height (Apple HIG 44pt / Material 48dp) — device px
  MIN_VPAD_OVER_CAP: 0.5, // vertical padding ≥ 0.5× cap-height ⇒ text never crowds the top/bottom edge
};

// Returns an array of human-readable violations ([] ⇒ the button is "nice").
function checkButton(b, NICEc = NICE) {
  const v = [];
  const { rect: r, text: t, cap } = b;
  const left = t.x - r.x, right = (r.x + r.w) - (t.x + t.w);
  const top = t.y - r.y, bottom = (r.y + r.h) - (t.y + t.h);
  // 1. text must fit inside the button (no clipping / overflow)
  if (left < 0 || right < 0 || top < 0 || bottom < 0)
    v.push(`text overflows the button (l${left} r${right} t${top} b${bottom})`);
  // 2. CENTRED — text centre coincides with button centre on both axes
  const dx = (t.x + t.w / 2) - (r.x + r.w / 2), dy = (t.y + t.h / 2) - (r.y + r.h / 2);
  if (Math.abs(dx) > NICEc.CENTER_TOL) v.push(`text not horizontally centred (Δ${dx.toFixed(1)}px)`);
  if (Math.abs(dy) > NICEc.CENTER_TOL) v.push(`text not vertically centred (Δ${dy.toFixed(1)}px)`);
  // 3. symmetric padding (the "off-centre" complaint, stated directly)
  if (Math.abs(left - right) > NICEc.PAD_SYM_TOL) v.push(`L/R padding asymmetric (${left} vs ${right})`);
  if (Math.abs(top - bottom) > NICEc.PAD_SYM_TOL) v.push(`T/B padding asymmetric (${top} vs ${bottom})`);
  // 4. horizontal:vertical padding ratio in a pleasant band
  const hpad = (left + right) / 2, vpad = (top + bottom) / 2;
  if (vpad > 0) {
    const ratio = hpad / vpad;
    if (ratio < NICEc.HV_RATIO_MIN) v.push(`too cramped horizontally (h/v pad ratio ${ratio.toFixed(2)} < ${NICEc.HV_RATIO_MIN})`);
    if (ratio > NICEc.HV_RATIO_MAX) v.push(`over-wide padding (h/v pad ratio ${ratio.toFixed(2)} > ${NICEc.HV_RATIO_MAX})`);
  }
  // 5. accessibility: min touch target height
  if (r.h < NICEc.MIN_TOUCH) v.push(`button too short for touch (${r.h}px < ${NICEc.MIN_TOUCH}px)`);
  // 6. vertical padding vs cap-height ⇒ text never crowds the edge
  if (vpad < NICEc.MIN_VPAD_OVER_CAP * cap)
    v.push(`vertical padding ${vpad.toFixed(1)}px < ${NICEc.MIN_VPAD_OVER_CAP}×cap(${cap}) = ${(NICEc.MIN_VPAD_OVER_CAP * cap).toFixed(1)}px`);
  return v;
}

// A BUTTON ROW (equal-width siblings, e.g. home Start/Practice/Guide = CSS `flex:1 1 0`): the
// per-button h:v ratio rule does NOT apply (a short label in a wide equal-width cell is fine).
// The invariants instead: all the same width, each label CENTRED + symmetric, a MIN horizontal
// padding floor, and the shared height/touch/vpad rules. (Validated against web's real layout below.)
function checkButtonRow(buttons, minHpad = 6, NICEc = NICE) {
  const v = [];
  const w0 = buttons[0].rect.w;
  // equal-width within real flex sub-pixel rounding (validated vs web: 112/114/114 → ~2px spread).
  const wTol = Math.max(2, w0 * 0.02);
  buttons.forEach((b, i) => {
    if (Math.abs(b.rect.w - w0) > wTol) v.push(`button ${i} width ${b.rect.w} ≠ row width ${w0} (not equal-width, >${wTol.toFixed(1)}px)`);
    // reuse checkButton but drop the upper ratio bound (rows are intentionally wide)
    checkButton(b, { ...NICEc, HV_RATIO_MAX: Infinity, HV_RATIO_MIN: 0 }).forEach(s => v.push(`button ${i}: ${s}`));
    const left = b.text.x - b.rect.x, right = (b.rect.x + b.rect.w) - (b.text.x + b.text.w);
    if (Math.min(left, right) < minHpad) v.push(`button ${i}: horizontal padding ${Math.min(left, right).toFixed(1)} < min ${minHpad}px`);
  });
  return v;
}

module.exports = { checkButton, checkButtonRow, NICE };

// ── tests (only when run directly; `require` gets the functions without exiting) ──────────────────
if (require.main !== module) return;
let fails = 0;
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); fails++; } else console.log("ok:", m); };

// a well-formed button: 200×56, label 96×20 cap16, centred → L/R 52, T/B 18 (ratio 2.9), passes
const good = { rect: { x: 0, y: 0, w: 200, h: 56 }, text: { x: 52, y: 18, w: 96, h: 20 }, cap: 16 };
ok(checkButton(good).length === 0, "a centred, well-padded button passes (" + JSON.stringify(checkButton(good)) + ")");

// off-centre horizontally (the owner's complaint): text shoved left → L 30, R 74
const offCentre = { rect: { x: 0, y: 0, w: 200, h: 56 }, text: { x: 30, y: 18, w: 96, h: 20 }, cap: 16 };
ok(checkButton(offCentre).some(s => /not horizontally centred|asymmetric/.test(s)), "off-centre text is flagged");

// cramped horizontally: tiny L/R padding vs vertical → ratio < 1.5
const cramped = { rect: { x: 0, y: 0, w: 110, h: 56 }, text: { x: 6, y: 18, w: 98, h: 20 }, cap: 16 };
ok(checkButton(cramped).some(s => /cramped/.test(s)), "horizontally-cramped button is flagged");

// too short for touch
const tiny = { rect: { x: 0, y: 0, w: 200, h: 30 }, text: { x: 52, y: 7, w: 96, h: 16 }, cap: 14 };
ok(checkButton(tiny).some(s => /touch/.test(s)), "sub-44px button is flagged for touch target");

// text crowding the top/bottom edge (vpad < 0.5×cap)
const crowded = { rect: { x: 0, y: 0, w: 200, h: 48 }, text: { x: 52, y: 4, w: 96, h: 40 }, cap: 30 };
ok(checkButton(crowded).some(s => /vertical padding/.test(s) || /centred/.test(s)), "vertically-crowded text is flagged");

// text overflowing the button bounds (clipping — the codex/arena-map edge-bleed class of bug)
const overflow = { rect: { x: 0, y: 0, w: 100, h: 56 }, text: { x: 10, y: 18, w: 110, h: 20 }, cap: 16 };
ok(checkButton(overflow).some(s => /overflows/.test(s)), "text overflowing the button is flagged");

console.log(fails ? `\n${fails} FAIL` : "\nALL BUTTON-GEOMETRY CHECKS PASS");
process.exit(fails ? 1 : 0);
