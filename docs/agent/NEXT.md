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
`T129` DONE (switcher landed — it proved the engine swap is distinct but lags to a phrase boundary; the
fix for the lag is **[B] T132**, in flight — wire `{now:true}` from the switcher + per-screen routing the
moment T132 lands; **don't block on it**, do T128's other parts now). **T128 — VERIFY IN A REAL BROWSER
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

**Builder B → `T132`  · OFF STAND-BY — `synth.js` immediate-context-swap lever (`setContext(name,{now:true})`)**
`T130` golden harness DONE (`ba919db`, CI green). **T132 — the engine gap A's T129 surfaced; it's the
true root of the owner's "music never changes".** The scheduler adopts `M.spec = M.want` **only at a
phrase boundary** (`synth.js:395`; the immediate path fires only on first-ever music, `!M.spec`), so a
deliberate `setContext` lags up to ~one phrase (~8–11s). Add **`Synth.setContext(name,{now:true})`** (and/
or `Synth.swapNow()`): when `now`, set `M.want` then **force `M.spec = M.want` now** + re-align the phrase
counter (reset `M.step` to a bar/phrase start) so the new context takes effect on the **next scheduled
step** (≤1 step, not ≤1 phrase) — **no click/dropout** (respect lookahead; let scheduled notes finish,
switch the generator now). Default (no `now`) behaviour unchanged. **Add a golden/unit assertion** (extend
`test/golden-synth.test.js` or `synth.test.js`) that the next step after a `{now:true}` switch already
matches the target context + differs from the prior. Full DoD: `BACKLOG.md` T132. **B-owned files only**
(`synth.js` + tests + `BUILDER-LOG-FX.md`); never touch existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
