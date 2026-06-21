# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T131`  · register the golden gates in `pages.yml` (quick)**
`T128`(1)+(2) DONE (`61654ed`) — per-screen distinct contexts + instant `swapNow()`, victory wub on the
un-ducked sfx bus. **(3) celebration is now [B] `T133`** (overlay-context render — engine; your wiring is
already correct + waiting). **T131:** add `node test/golden-fx.test.js` + `node test/golden-synth.test.js`
to the CI gate list in `.github/workflows/pages.yml` (same pattern as the fxgl/synth gate lines), run in
**COMPARE** mode — **never set `UPDATE_GOLDEN` in CI**. Only `pages.yml` changes. Then → `T123` (a11y
contrast floor over the backdrop) → `T124` (fraction glyphs) → `T101` (Start delay) → `T102`/`T103`
(Android) → `T89`/`T90` → content → `T72`.

**Builder B → `T133`  · OFF STAND-BY — FXGL: make the overlay CELEBRATION render on-device (z-58 burst)**
`T132`/`T130` DONE. **T133 — the engine gap A's T128 surfaced; the owner badly wants celebration.** A's
`fxBigBurst`→`celebrate()` wiring (T125) is correct + tested but shows **nothing live**: `#fxBurst` is a
**2nd WebGL/WebGPU context** (separate from the working backdrop) that likely fails to init/present
on-device (mobile GPUs often refuse a 2nd context). It can't draw on the backdrop canvas — that's
`z-index:-1` (behind the UI); the celebration must present at the **z-58 overlay**, in front of the
panels. **Your call:** (a) fix/diagnose the 2nd overlay context (+ a refusal/loss fallback), and/or (b) a
**Canvas2D overlay** particle path (no GL-context-count limit — always renders) mounted at overlay z,
and/or (c) a single-context scheme that still lands the burst in front of the UI. It must **actually
present particles on a real mobile browser** (break the green-but-invisible trap): verify on-device AND add
the strongest headless check feasible (overlay controller `ready`+sized on the chosen backend; a CPU-still
celebrate-frame golden in `test/golden-fx.test.js`). Keep reduced-motion / `setQuality` budget rules. Full
DoD: `BACKLOG.md` T133. **B-owned files only** (`fxgl.js` + tests/goldens + `BUILDER-LOG-FX.md`); never
touch existing Halves files (A re-points `#fxBurst` once it lands); never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
