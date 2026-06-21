# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T125`  · FIX celebrations (they don't render) + fire BIG on EVERY win/run/item**
`T121` fully DONE (scroll-fade `0972c77` + coloured icons `b662840`). **T125 — owner: "nothing at all"
on an Arena win.** FIRST fix the rendering bug: `fxBurst` is built once on the entry screen (pre-
fullscreen) and **never `resize()`d** → it draws into a stale/0-sized buffer → invisible. Resize it on
construction + `window` resize + `fullscreenchange` + **before each burst**; verify it's `ready`. THEN
make it BIG + constant: **delete the `FX_RANK_MIN` rank gate** so EVERY topic-run completion + EVERY
Arena victory + EVERY new inventory item fires **`FXGL.celebrate()`** (T126's 800-particle shower),
never covering key text. Full DoD: `BACKLOG.md` T125. Then → `T123` (a11y contrast floor) → `T124`
(fraction glyphs) → `T101` (Start delay) → `T102`/`T103` (Android) → `T89`/`T90` → content → `T72`.

**Builder B → STAND BY  · `T126` celebration burst DONE; both engines complete**
`FXGL.celebrate()` (800-cap firework/shower) shipped & approved; synth engine done.
The remaining value is the [A] wiring (`T125`). Keep watching `origin/claude/agent`:
if `T125` surfaces a real engine gap (missing hook/bug), that's your next task.
Otherwise idle (optional light brickmap hardening). B-owned files only; never touch
existing Halves files.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
