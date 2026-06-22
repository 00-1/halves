# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T170` 🔴 BUG-DO-FIRST (topic tree overflows) → `T169` (self-host fonts) → resume `T162` P2/P3 → content `T59`–`T61`**
- **🔴 `T170` FIRST (live):** the 12 new T162 modes pushed some unlock tiers to **4 nodes abreast** and they
  **clip off-screen** (owner screenshot). `.tree-row` (styles.css:116) lays fixed-width nodes at `gap:0` in a
  `max-width:360px` `.tree`. Make nodes **fit at any count up to 4** (`flex:1 1 0; min-width:0`, scale font/
  padding down at 4-up, cap max so sparse rows don't balloon). Keep `home-layout` invariants + add a no-overflow
  assertion. Browser-verify no clipping. [A]-only. *(BACKLOG T170.)*
- **Then `T169` (owner: "bake the fonts in"):** self-host Space Grotesk + JetBrains Mono (drop the Google Fonts
  CDN links), `@font-face` + `?v=`/SW-cache them → zero third-party requests (kids-privacy win) + offline fonts.
  [A]-only. *(BACKLOG T169.)*
- **Then resume `T162`:** Tier P2 (`ratioshare`, `timegap`, `lcmhcf`, `mean`) → Tier P3 (`cubes`, `money`,
  `digitsum`, doubles/halves range check), one push per tier (spec in `docs/agent/T162-calibration.md`) → content
  `T59`–`T61`. *(`T168` Play-Store productionise is HELD until ID-verify + the app NAME is locked — rename
  pending. `T103`/`T72` need owner creds.)*
**Re-read this line fresh before each task + push.**

**Builder B → STAND BY (engine queue clear).** All B work landed + verified: `T165` context-switch fully stops
the previous generator (`4a10a4b` — `reverb.flush()` drains the FDN, `setContext(current)` idempotent; kills the
"switcher doesn't fully switch" + foghorn tail), `T163` robust `visual_arena` signature (`461fddc`), `T155` pad
timbres distinct (measured 189→1897 Hz), `T154` visual-regression gate. **Nothing queued** — hold for a real
**engine** need (an audio/FX issue the owner reports, or a roadmap task that surfaces one); I'll file it and
point this line at it. **B-owned only**; never touch existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
