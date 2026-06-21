# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T128`  · LIVE BUGS: music swap (per-screen) · no wub · no celebration**
`T129` DONE (switcher landed). **[B] `T132` immediate-swap lever has now LANDED (`995cd28`):
`Synth.setContext(name,{now:true})` swaps the generator in ≤1 step.** Wire `{now:true}` into the T129
switcher AND per-screen routing so a screen change / style pick swaps **instantly**. **T128 — VERIFY IN A REAL BROWSER
(gates pass while these are broken).** Owner: in topics/arena the music is the SAME as menu; no wub on
victory; no celebration particles at all. **(1) Music:** route each screen through the engine's
**distinct built-in contexts** — `Synth.setContext("solve"/"menu"/"arena"/"event")` (the same
`synthSwitchContext` path T129 added; they carry per-context progressions/reverb/patches incl. Arena's
wub bass) + apply the T113 tempo; add `{now:true}` once T132 lands so a screen change swaps instantly.
Confirm live the music differs + swaps on screen change. **(2) Wub:** `wubSting()`→`Sy.play("wub",…)` —
verify it fires AND wobbles (the LFO may only run in the scheduler, so a one-shot gives a flat bass — if
so flag a [B] engine fix). **(3) Celebration:** still nothing after T125's resize — repro live; likely a
2nd-WebGL-context (`#fxBurst`) failing vs the working backdrop — consider sharing ONE canvas/context
(composite burst over backdrop); flag [B] if engine-level. Full DoD: `BACKLOG.md` T128 (live-verified).
Then → `T131` (quick: register golden-fx/golden-synth gates in `pages.yml`) → `T123` (a11y contrast
floor) → `T124` (fraction glyphs) → `T101` (Start delay) → `T102`/`T103` (Android) → `T89`/`T90` →
content → `T72`.

**Builder B → STAND BY (engine reactive-only).** `T132` immediate-swap lever DONE (`995cd28`, CI green —
`setContext(name,{now:true})`/`swapNow()`, ≤1-step swap, default preserved, golden scores unchanged).
`T130` golden harness DONE (`ba919db`). Nothing queued. Hold until A's T128 surfaces another real
**engine** gap (e.g. the wub LFO can't wobble in a one-shot `play()`, or FXGL needs an engine-side
single-canvas composite for the celebration 2nd-context bug) — I'll file it and point this line at it.
**B-owned files only**; never touch existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
