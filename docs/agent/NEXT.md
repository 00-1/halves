# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T137` (celebration TESTER in Settings + diagnose the invisibility) → then `T123`**
Owner live after T136: **"I still don't see celebrations. Add a celebration tester to the setup menu to
trigger different celebrations."** Feature AND diagnostic. **T137:** add a tester row in Settings (pixel
buttons, a11y, like the music switcher) that fires each celebration on demand — **Item unlock**
(`fxCelebrate`), **Rank up** (`fxCelebrateRank`), **Arena win** (`fxCelebrateWin`), **Big burst**
(`fxBigBurst`) — ensuring `setupFx()` ran first. **Then DIAGNOSE live** (gates/golden pass yet it's
invisible — the golden only COUNTS rects). Babysitter already ruled out the easy causes statically: CSS
layer is correct (`#fxBurst` z-58, in front of `.app`), `ready` is sync-true for `{backend:"2d"}`,
`renderFrame` draws correctly. Check on-device in order: (1) `fxBurst` non-null + `isReady()` + **`dimensions()`
non-zero** (else resize timing [A]); (2) **occlusion — there's a 2nd overlay `#fxCanvas` (z-59, `window.FX`)
ABOVE `#fxBurst` (z-58)**; reconcile/layer them; (3) if ready+sized+unoccluded but still nothing, particles
may draw transparent/sub-pixel/off-canvas → **[B] engine fix `T138`** (flag with live evidence + a
visibility golden, not a count). Full DoD: `BACKLOG.md` T137 (LIVE-verified — owner must SEE it). Then →
`T123` (a11y contrast floor) → `T124` (fraction glyphs) → `T101` → `T102`/`T103` (Android) → `T89`/`T90` →
content → `T72`.

**Builder B → `T134` (clean swap + distinctness — OWNER on it now)** · *(T133 celebration DONE `3e7da28`)*
**T134 — owner live on the switcher:
"songs play over each other rather than switching, or they sound really similar."** Both real, both
engine-side: **(a) overlap** — the T132/T128 immediate `swapNow()` doesn't release the old voices/reverb
tail, so the previous pad + multi-second FDN tail ring **over** the new context (rapid taps pile up); now
affects **every** per-screen transition. Fix: on the **immediate** swap path, quickly release/fade active
music voices + tame the reverb carryover (~60–120ms music-bus fade across the swap, and/or release voices +
briefly cut the reverb send) → a clean cut-in; leave the default phrase-boundary swap's natural ring. **(b)
too similar** — solve/menu/event share instrumentation + close tempo/density (arena's the outlier);
strengthen the **audible** contrast (register/instrumentation/tempo/density) keeping calm-solve-vs-arena +
the golden-distinctness gate. **Verify on a real browser** (rapid switcher sampling → clean cut-in + clearly
different styles); add the strongest headless check feasible. Full DoD: `BACKLOG.md` T134. **B-owned only**
(`synth.js` + tests + `BUILDER-LOG-FX.md`); never touch existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
