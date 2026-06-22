# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T162` (build the 12 mock-driven drill modes — TIER P1 FIRST) → content `T59`–`T61` → `T72` (held)**
**You're well ahead — nice work.** PUSHED & gate-green, **pending Babysitter review** (don't redo): `T161`
(`555464f`), `T156` (`eaf40bd`), `T157` (`1a3e3fb`), `T158` rescoped no-store (`41bd1d8`; the earlier
`e454208` network-first is superseded), `T159` (`aa583b8`), `T160` (`1c949e0`), `T58` (`c89eebc`). **Don't
rebuild any of those.**
**NEXT REAL WORK → `T162` (owner-blessed, build ALL 12 drill modes, in 3 tiered pushes — do TIER P1 first and
push before P2):**
- **Tier P1 (push 1): `scaling`, `percentoff`, `partwhole`, `balance`** (the last = "Complete the Sum", from the Verbal report's maths section)**.** Full item sets + calibrated ranges + `masterSecs`
  + unlock slots are in **`docs/agent/T162-calibration.md`** — read it. Each mode = a fixed `*_SRC` array →
  `build()` mapping to `{p,a}` (match the existing mode shape), numpad-enterable/numeric/non-negative answers,
  a sensible `unlockedBy`/`requires` mastery gate, new **"Reasoning"** picker group for the multi-step ones,
  and **a Node logic gate per mode** registered in `pages.yml`.
- **Then Tier P2** (`ratioshare`, `timegap`, `lcmhcf`, `mean`) → **Tier P3** (`cubes`, `money`, `digitsum`,
  doubles/halves range check). One push per tier so the Babysitter reviews incrementally + the owner feels P1
  early. *(BACKLOG T162 + `docs/agent/T162-calibration.md`.)*
- **Then** content `T59`–`T61`. *(`T103`/`T72` Play-Store need owner creds — hold.)*
**Re-read this line fresh before each task + before each push** (you've repeatedly built out of order — a fresh
owner `BUG`/DO-FIRST can land here and overrides T162).

**Builder B → `T163` (firm up + re-bless the brittle `visual_arena` golden) → then STAND BY for an engine need.**
**`T155` DONE+APPROVED (`493d875`)** — independently MEASURED: pad-bed spectral centroids spread **189→1897 Hz**,
every bed distinct (min gap 268 Hz). The owner's "every style shares the same synth string" is objectively fixed.
**`T154` DONE+APPROVED (`2b8f1e0`)** — the visual-regression gate works: the **flagship home-backdrop-PURPLE**
check passes (rgb 75,52,108) and it has teeth (a purple→blue flip FAILS).
**`T163` (small, B-owned):** the harness recovered and `visual.test` now reports **1/13 FAIL — the `visual_arena`
golden mismatches** (the Arena evolved: 3v3 + death-VFX after the baseline). It is **NOT a CI gate** (not in
`pages.yml`), so it is **not deploy-blocking** — but the arena signature is **too brittle** vs T154's own "robust
signature, not a brittle pixel diff" intent. Make the arena region signature **robust to the Arena's dynamic
content** (enemy team / gold / VFX vary frame-to-frame), then **re-bless** the golden. B-owned (`test/browser/*`,
`test/golden/*`). Then **STAND BY** — hold for a real engine need (I'll file it). Never touch existing Halves
files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
