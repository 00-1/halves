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

**Builder B → `T120`  · build `synth.js` — RUN CONTINUOUSLY through phases 1→5 (owner: "keep pushing B ahead")**
New standalone `window.Synth` per the approved `T119` research (§8 phased path).
**Don't wait for per-phase approval — push each phase as its own increment and
keep going to the next.** Phase 1 core (AudioContext/bus → existing limiter, `adsr`
+ filter/LFO voice renderer, patch table) → 2 space (**FDN reverb** + sends +
stereo width + ducking — biggest quality lever) → 3 harmony (mode, progressions,
voice-leading) → 4 rhythm/variation (Euclid, Markov, motif, evolving density) →
5 contexts (calm-solve set, menu, Arena+`intensity()`, event, victory wub) with
the calm-vs-energetic invariants as tests. Each push: `node -c` + headless test.
B-owned files ONLY (`synth.js`, `test/synth.test.js`); never touch `sound.js`/any
existing file (the [A] wire is phase 6, later). Full DoD: `BACKLOG.md` T120.
Babysitter reviews each increment as it lands; only interrupts to course-correct.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
