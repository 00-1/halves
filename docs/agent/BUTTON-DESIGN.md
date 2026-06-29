# Nice-button geometry — the math (owner-requested 2026-06-28)

The owner found the home `Start`/`Practice`/`Guide` buttons "don't feel nice — padding feels off-centre." Rather
than eyeball it, this defines what a nice text button IS, mathematically, and enforces it as a unit test:
`test/button-geometry.test.js` (on `main`). **brickmap mirrors `checkButton` as a Rust unit test over its real
button layout values** (button rect + measured text bounding box + font cap-height), so an off-centre button fails
in brickmap's own test before it ever renders.

## The standard (one tunable constant block — mirror these exact numbers)
For a text button with `rect{x,y,w,h}`, label tight-box `text{x,y,w,h}`, font `cap`-height (all device px):

1. **Text fits** — no overflow/clipping: `left,right,top,bottom ≥ 0`.
2. **Centred** — text centre = button centre on BOTH axes (≤ 1px). This is the "off-centre" fix, stated directly.
3. **Symmetric padding** — `|left−right| ≤ 1px`, `|top−bottom| ≤ 1px` (symmetry ⇒ centred; catches a label nudged
   to one side even if the box is technically "inside").
4. **Padding ratio** — horizontal padding is **1.5–3.5×** the vertical (buttons breathe wider than tall; Material
   uses ~2–3×, e.g. 24dp h / 8dp v). Not cramped, not over-wide.
5. **Touch target** — button height **≥ 44px** (Apple HIG 44pt / Material 48dp; MIT Touch Lab ~9mm fingertip).
6. **Vertical padding vs type** — `vpad ≥ 0.5 × cap-height`, so the label never crowds the top/bottom edge.

Constants live ONCE in `NICE = {CENTER_TOL, PAD_SYM_TOL, HV_RATIO_MIN/MAX, MIN_TOUCH, MIN_VPAD_OVER_CAP}` — tune in
one place. This is the button-specific instance of the global padding/safe-margin rule (V52); apply both in the
shared layout primitives so every button + text run inherits them, not per-screen.

## Sources
- [Material Design 3 — accessibility & layout](https://m3.material.io/foundations/designing/structure)
- [Apple/Material touch-target sizes — Smashing Magazine](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/)
- [Mobile tap-target cheatsheet — Smart Interface Design Patterns](https://smart-interface-design-patterns.com/articles/accessible-tap-target-sizes/)
- [Mobile typography accessibility — FontFyi](https://fontfyi.com/blog/mobile-typography-accessibility/)
- UI button anatomy (h-pad ≈ 2× v-pad) — [Uxcel](https://app.uxcel.com/courses/ui-components-n-patterns/anatomy-iii-298)
