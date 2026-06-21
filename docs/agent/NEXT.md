# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T117`  · replace ALL chrome emoji with house pixel icons**
`T114` DONE (audio defaults baked). Now the emoji→icons pass: build house-style
generative pixel icons for every chrome emoji (padlock, speaker on/off, cog, coin,
calendar, swords, flag, map, star, sparkles, fullscreen, backspace, close, check,
play — sweep for more). KEEP the `→` answer-arrows + hint `↑/↓` (content). Icons
`aria-hidden`; controls keep `aria-label`; node-state badges keep state semantics.
New gate: no targeted emoji remain. Full DoD: `BACKLOG.md` T117. Then → `T101`
(Start delay) → `T102`/`T103` (Android) → `T89`/`T90` → content → `T72`.

**Builder B → `T120`  · build `synth.js`, phase 1 (engine core + patches)**
New standalone `window.Synth` per the approved `T119` research (§8 phased path).
Phase 1: AudioContext/bus → existing limiter, the `adsr` + filter/LFO voice
renderer, the patch table, headless test. B-owned files only; never touch
`sound.js`. Full DoD: `BACKLOG.md` T120.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
