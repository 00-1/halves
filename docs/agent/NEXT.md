# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T121` (finish part a)  · the SCROLL-FADE (part b coloured-icons DONE)**
`T122` DONE. T121 **part (b) coin gold + calendar green DONE (`b662840`)**. **Still do
part (a):** the T116 scroll-fade paints `--bg` (near-black) over the purple FX backdrop
→ black smear: **mask the `.tree` content to fade to transparent** (reveal the backdrop),
tied to `can-scroll`; keep the ▾ cue. Full DoD: `BACKLOG.md` T121(a). Then → `T125`
(**BIG celebrations on EVERY win/run/item** — remove the rank gate, fire T126's big
burst everywhere; owner-priority; no contrast dep) → `T123` (a11y: grey text fails AA
over the purple backdrop — contrast floor + honest gate) → `T124` (fraction tree-glyphs
illegible — bigger/clearer using node width) → `T101` (Start delay) → `T102`/`T103`
(Android) → `T89`/`T90` → content → `T72`.

**Builder B → `T126`  · FXGL: a BIG "celebration" burst mode (loads of particles)**
Off stand-by. Owner wants celebrations with "loads of particles" — the T94 burst was
deliberately *brief + capped* (256) and reads as too subtle. Beef up the engine: a
celebration mode with a much higher cap (~600–1000), bigger/longer-lived particles,
a firework/shower feel (launch+gravity or radial spray), bright palette — while
KEEPING the invariants (capped, seeded/deterministic, **auto-stops + no RAF leak**,
single-RAF, reduced-motion calmer, GPU→CPU fallback, instanced/in-shader for perf,
`setQuality` degrades count). B-owned files ONLY (`fxgl.js`, `test/fxgl.test.js`);
never touch existing Halves files (the [A] wire = T125). Full DoD: `BACKLOG.md` T126.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
