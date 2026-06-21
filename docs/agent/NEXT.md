# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T136` (wire the celebration overlay — owner's most-wanted, engine ready) → `T135` (volume, HOLD for max) → `T123`**
`T131` DONE. **T136 FIRST — the celebration the owner keeps asking for is one wiring change away.** B's
T133 shipped the engine fix; mount `#fxBurst` with **`{backend:"2d"}`** (Canvas2D — no 2nd-GL-context,
always presents) instead of the default WebGL path that fails silently on-device. Change ONLY the
burst-overlay mount (leave the backdrop `#fxBg` on WebGL); keep the T125 resize-before-fire;
**live-verify a visible shower on a real win / topic-run / new item**. Then **T135 — owner: the new (louder)
synth engine makes the 3.0× volume default too hot. Set default `0.05×` and rescale the slider to the new
max** (`volRange` `min=0 max=400 step=5 value=300`; `halves.vol` default 300; master gain `vol/100`;
`fmtVol` `(v/100)×`). **⚠ HOLD T135 until the Babysitter posts the owner's chosen MAX** (asked) — don't
guess the range. Then → `T123` (a11y contrast floor) → `T124` (fraction glyphs) → `T101` (Start delay) →
`T102`/`T103` (Android) → `T89`/`T90` → content → `T72`.

**Builder B → `T134` (clean swap + distinctness — OWNER on it now)** · *(T133 celebration DONE `3e7da28`)*
**T134 — owner live on the switcher:
"songs play over each other rather than switching, or they sound really similar."** Both real, both
engine-side: **(a) overlap** — the T132/T128 immediate `swapNow()` doesn't release the old voices/reverb
tail, so the previous pad + multi-second FDN tail ring **over** the new context (rapid taps pile up); now
affects **every** per-screen transition. Fix: on the **immediate** swap path, quickly release/fade active
music voices + tame the reverb carryover (~60–120ms music-bus fade across the swap, and/or release voices +
briefly cut the reverb send) → a clean cut-in; leave the default phrase-boundary swap's natural ring. **(b)
too similar** — solve/menu/event share instrumentation + close tempo/density (arena's the outlier);
strengthen the **audible** contrast (register/instrumentation/tempo/density) keeping calm-solve-vs-arena +
the golden-distinctness gate. **Verify on a real browser** (rapid switcher sampling → clean cut-in + clearly
different styles); add the strongest headless check feasible. Full DoD: `BACKLOG.md` T134. **B-owned only**
(`synth.js` + tests + `BUILDER-LOG-FX.md`); never touch existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
