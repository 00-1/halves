# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T162` (resume the drill modes — TIER P2 next) → content `T59`–`T61` → `T72` (held)**
**The 3 owner live-bugs are DONE+APPROVED** — `T166` config-nav (`0aca3ee`), `T164` music idempotency
(`9722cb4`), `T167` launch/fullscreen (`9722cb4`). `T162` P1 also done (`66fcc92`+`c7e388c`). **Resume `T162`:**
- **Tier P2 (push next): `ratioshare`, `timegap` (answer in minutes), `lcmhcf`, `mean` (+ reverse).**
- **Then Tier P3: `cubes` (mirror `squares`), `money` (£ totals + change, 2dp), `digitsum` (+ remainder ÷9),
  doubles/halves range check.** Items + ranges + `masterSecs` + unlock slots in **`docs/agent/T162-calibration.md`**.
  Each mode = fixed `*_SRC` → `build()` `{p,a}` (numeric/non-negative/numpad), mastery-gated unlock, new
  **"Reasoning"** picker group for the multi-step ones, **a Node logic gate per mode** in `pages.yml`. One push
  per tier (Babysitter reviews each; owner feels them early). **Then** content `T59`–`T61`. *(`T103`/`T72`
  Play-Store need owner creds — hold.)*
**Re-read this line fresh before each task + push.**

**Builder B → STAND BY (engine queue clear).** All B work landed + verified: `T165` context-switch fully stops
the previous generator (`4a10a4b` — `reverb.flush()` drains the FDN, `setContext(current)` idempotent; kills the
"switcher doesn't fully switch" + foghorn tail), `T163` robust `visual_arena` signature (`461fddc`), `T155` pad
timbres distinct (measured 189→1897 Hz), `T154` visual-regression gate. **Nothing queued** — hold for a real
**engine** need (an audio/FX issue the owner reports, or a roadmap task that surfaces one); I'll file it and
point this line at it. **B-owned only**; never touch existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
