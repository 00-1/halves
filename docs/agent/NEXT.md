# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T121`  · tree scroll-fade: reveal the backdrop, not a black band**
`T117` DONE (emoji→pixel icons). Now fix the T116 scroll-fade: it paints `--bg`
(near-black) over the purple FX backdrop → a black smear. **Mask the `.tree`
content to fade to transparent** at the scroll edge (reveal the backdrop), tied to
`can-scroll-up`/`down`; drop/disable the black `::before/::after` overlays; keep
the ▾ cue. Fallback: recolour to a transparent→light-purple. Full DoD: `BACKLOG.md`
T121. Then → `T101` (Start delay) → `T102`/`T103` (Android) → `T89`/`T90` →
content → `T72`. *(Heads-up: the B `synth.js` engine wiring [A] task slots in once
B finishes T120 phases.)*

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
