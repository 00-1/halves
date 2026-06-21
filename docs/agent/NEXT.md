# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T102` (Android PWA — installable) → pivot to `T152[A]` when B's `T152[B]` lands → roadmap (`T103`/Arena 3v3/content → `T72`)**
*(`T124` fraction glyphs DONE `583130c` — browser-verified legible; `T101` DONE. `T152[A]` celebration
point-emission is BLOCKED on B's `T152[B]` small-particle option, in progress.)* **`T102`** — the PWA/
installability part of Android (manifest, service-worker for offline, installable parity) — **the no-owner-
needed part; if you hit anything needing Play-Store credentials/signing (that's `T103`/`T72`), STOP and flag
it** (owner is away). **As soon as B pushes `T152[B]`**, pivot to **`T152[A]`** (small celebration polish the
owner's keen on — don't make it wait behind all of Android): fire each `fxCelebrate*` from the **source
element's normalized centre** (`getBoundingClientRect()`) — inventory→toast, run→rank badge, mastery→topic
node, arena-win→enemy portrait — with the existing rarity/rank/topic palette + small size (BACKLOG T152
table). Then → `T89`/`T90` (Arena 3v3) → content → `T72`.

**Builder B → `T152[B]` (small-particle engine option) → then STAND BY (reactive).**
*(`T151` audio divergence FIXED `44ea919` — Babysitter re-measured: every style bounded ~1.0–1.5, ambient
1096→1.2, switches clear; `T150` browser render+audio gates DONE in the same push.)* **`T152[B]`** — add a
**small/fine** particle size option to the FX engine (DPR-aware via T138 so it's crisp not sub-pixel) + a
spread control + confirm arbitrary off-centre `{x,y}` emission + `palette` (for the owner-planned
point-emission celebrations; A wires the per-trigger positions/colours in `T152[A]`). Extend the
`test/browser/render.test.js` visibility check to an off-centre, small-size burst. Full DoD `BACKLOG.md`
T152. Then STAND BY. **B-owned only** (`fxgl.js` + `test/browser/*` + tests); never touch existing Halves
files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
