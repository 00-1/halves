# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T129`  · Settings MUSIC SWITCHER (sample styles + test switching) — the T128 instrument**
`T127` DONE. **T129 FIRST** (owner-requested; it's the diagnostic for T128's "music never swaps"): add a
music switcher to Settings beside the Volume/Tempo sliders — buttons/`<select>` for **Menu · Solve ·
Arena · Event** that call the engine's **distinct** `Synth.setContext(name)` (NOT `musicSpec()`) and
**audibly swap the music immediately**. If it doesn't switch promptly, that IS T128(1) — fix the swap
(setContext + prompt swap, not just at a far phrase boundary). LIVE-verify each style is different.
Reverts to per-screen music on exit. Full DoD: `BACKLOG.md` T129. Then → `T128` (the rest: confirm
per-screen routing now swaps + the wub wobbles + celebration renders) → `T123` (a11y) → `T124`
(fractions) → `T101` → `T102`/`T103` → `T89`/`T90` → content → `T72`.

**Builder A — (after T129) → `T128`  · LIVE BUGS: music swap (per-screen) · no wub · no celebration**
`T127` DONE. **T128 — VERIFY IN A REAL BROWSER (gates pass while these are broken).** Owner: in
topics/arena the music is the SAME as menu; no wub on victory; no celebration particles at all.
**(1) Music:** the wiring's `musicSpec()` passes no `progression` → engine defaults the SAME chords for
every context. Drive the engine's **distinct built-in contexts** — `Synth.setContext("solve"/"menu"/
"arena"/"event")` (they have per-context progressions/reverb/patches incl. Arena's wub bass) + apply the
T113 tempo on top. Confirm live the music differs + swaps on screen change. **(2) Wub:** `wubSting()`→
`Sy.play("wub",…)` — verify it fires AND wobbles (the LFO may only run in the scheduler, so a one-shot
gives a flat bass — if so flag a [B] engine fix). **(3) Celebration:** still nothing after T125's resize
— repro live; likely a 2nd-WebGL-context (`#fxBurst`) failing vs the working backdrop — consider sharing
ONE canvas/context (composite burst over backdrop); flag [B] if engine-level. Full DoD: `BACKLOG.md`
T128 (live-verified). Then → `T123` (a11y contrast floor) → `T124` (fraction glyphs) → `T101` (Start
delay) → `T102`/`T103` (Android) → `T89`/`T90` → content → `T72`.

**Builder B → STAND BY  · `T126` celebration burst DONE; both engines complete**
`FXGL.celebrate()` (800-cap firework/shower) shipped & approved; synth engine done.
The remaining value is the [A] wiring (`T125`). Keep watching `origin/claude/agent`:
if `T125` surfaces a real engine gap (missing hook/bug), that's your next task.
Otherwise idle (optional light brickmap hardening). B-owned files only; never touch
existing Halves files.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
