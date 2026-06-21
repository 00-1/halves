# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T123`  · a11y: text legibility over the FX backdrop (AA floor + honest gate)**
`T127` DONE (&amp; fix). **T123:** muted/grey text now fails AA over the purple full-bleed FX backdrop,
but `contrast.test` still checks against the dark `--bg` token (false pass). Add a **contrast floor** —
a dark scrim/dim behind the content column so muted text clears **AA** while the atmosphere still
shows (don't black it out); and make **`contrast.test` honest** (test at-risk colours vs the worst-case
backdrop luminance — must fail on today's grey-on-purple, pass after). Full DoD: `BACKLOG.md` T123.
Then → `T124` (fraction glyphs bigger/clearer) → `T101` (Start delay) → `T102`/`T103` (Android) →
`T89`/`T90` → content → `T72`.

**Builder B → STAND BY  · `T126` celebration burst DONE; both engines complete**
`FXGL.celebrate()` (800-cap firework/shower) shipped & approved; synth engine done.
The remaining value is the [A] wiring (`T125`). Keep watching `origin/claude/agent`:
if `T125` surfaces a real engine gap (missing hook/bug), that's your next task.
Otherwise idle (optional light brickmap hardening). B-owned files only; never touch
existing Halves files.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
