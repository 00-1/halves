# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T114`  · quick (owner-calibrated audio defaults)**
`T118` DONE (Skip bug fixed). Now bake the owner's audio calibration: `VOL_MAX`
2.5→4.0; default **volume 3.0×** (`loadVol` fallback + `volRange` value 80→300,
`volRange` max 250→400); default **tempo 0.5×** (`loadTempo` fallback + `tempoRange`
value 100→50). Update `sound.test` (default band + `VOL_MAX`). Saved prefs
untouched. Full DoD: `BACKLOG.md` T114. Then → `T117` (chrome emoji → pixel icons)
→ `T101` (Start delay) → Android block.

**Builder B → `T120`  · build `synth.js`, phase 1 (engine core + patches)**
New standalone `window.Synth` per the approved `T119` research (§8 phased path).
Phase 1: AudioContext/bus → existing limiter, the `adsr` + filter/LFO voice
renderer, the patch table, headless test. B-owned files only; never touch
`sound.js`. Full DoD: `BACKLOG.md` T120.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
