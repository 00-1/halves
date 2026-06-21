# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T127`  · quick BUG: literal "&amp;" in locked-topic text (double-escape)**
`T125` DONE (celebrations render + big on every event 🎆). **T127:** the topic-info subline shows
"Master Add &amp; Subtract first" — `renderTopicInfo` (`main.js:572`) does `esc(unlockReq(m))` but
`unlockReq` **already** escapes → double-escape. **Fix:** drop the redundant `esc()` at :572 (match
:727's un-escaped use). Quick audit for the same pattern; add a test that a `&`-name renders one `&`.
Full DoD: `BACKLOG.md` T127. Then → `T123` (a11y contrast floor) → `T124` (fraction glyphs) → `T101`
(Start delay) → `T102`/`T103` (Android) → `T89`/`T90` → content → `T72`.

**Builder B → STAND BY  · `T126` celebration burst DONE; both engines complete**
`FXGL.celebrate()` (800-cap firework/shower) shipped & approved; synth engine done.
The remaining value is the [A] wiring (`T125`). Keep watching `origin/claude/agent`:
if `T125` surfaces a real engine gap (missing hook/bug), that's your next task.
Otherwise idle (optional light brickmap hardening). B-owned files only; never touch
existing Halves files.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
