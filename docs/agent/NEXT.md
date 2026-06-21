# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T118`  · 🛑 BUILD ONLY THIS · BUG (core loop)**
Skip key is cut off on `#game`. Fix `.app` height vs the body safe-area insets:
`height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))`.
Keep T99 top-pin + T112 fill-screen; Skip fully visible/tappable; add the layout
assertion. Full DoD: `BACKLOG.md` T118. (Skipped 3×, in flight as T115/T116 — do
it NOW, before T114/T117/anything.)

**Builder B → `T120`  · build `synth.js`, phase 1 (engine core + patches)**
New standalone `window.Synth` per the approved `T119` research (§8 phased path).
Phase 1: AudioContext/bus → existing limiter, the `adsr` + filter/LFO voice
renderer, the patch table, headless test. B-owned files only; never touch
`sound.js`. Full DoD: `BACKLOG.md` T120.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
