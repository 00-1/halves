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
- **Then `T171` (small, owner brand):** rename the PRODUCT to **"Goblin Gold"** (manifest `name`/`short_name`,
  `<title>`, in-app branding) — KEEP the "Halves" topic. [A]-only. *(BACKLOG T171.)*
- **Then resume `T162`:** Tier P2 (`ratioshare`, `timegap`, `lcmhcf`, `mean`) → Tier P3 (`cubes`, `money`,
  `digitsum`, doubles/halves range check), one push per tier (spec in `docs/agent/T162-calibration.md`) → content
  `T59`–`T61`. *(`T168` Play-Store productionise is HELD until ID-verify + the app NAME is locked — rename
  pending. `T103`/`T72` need owner creds.)*
**Re-read this line fresh before each task + push.**

**Builder B → `T174` (RESEARCH/ART pass: how to render an accumulating COIN HOARD as an *impression*, not physics) → then STAND BY for `T172` (owner-blessed).**
**Off standby — owner-driven new feature.** The owner wants a **Smaug/Scrooge gold hoard** on the home screen
that piles up organically with **individual beveled coins at varied angles**, fed by **coins flying in from the
earn-point** — but **"the overall impression of amassed coins, not thousands of physics particles."** **`T174`
= the research pass FIRST** (the owner asked for it): survey stylized **accumulating-mass** art (silhouette +
**surface-scatter**, render only the coins you'd see, imply the bulk; dither/lit bevels) with real refs (leaf
piles, Spyro gems, DuckTales bin, snow/gravel) + **borrow `brickmap` dither/scatter recipes**; output a short doc
+ a **recommended technique** (mound silhouette on a saturating curve under the 512 cap, surface-coin count,
bevel/angle, reduced-motion still). **Doc only — no engine change yet.** I surface it to the owner for a
thumbs-up, then you build **`T172`** (the engine: beveled-coin splat + hoard scene mode + attractor burst) →
**`T173`** is the [A] wiring. Full spec: **`docs/agent/GOLD-HOARD-DESIGN.md`**. **B-owned only** (the doc, then
`fxgl.js` + tests; brickmap is yours); never touch existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
