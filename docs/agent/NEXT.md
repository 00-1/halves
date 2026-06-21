# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T124` (fraction glyphs) → `T152[A]` (celebration point-emission, after B's engine part) → roadmap (Android → Arena 3v3 → content → `T72`)**
*(`T101` jank-defer + music-start fix DONE `9d6175b` — APPROVED; music-after-Start playback is owner-ear-
pending since headless can't confirm audio playback, possible async-resume race to watch.)* **`T124`** —
fraction tree-glyphs bigger/clearer using node width (owner-flagged illegible). **Then `T152[A]`** (after B's
small-size engine option): fire each `fxCelebrate*` from the **source element's normalized centre**
(`getBoundingClientRect()`) — inventory→toast, run→rank badge, mastery→topic node, arena-win→enemy portrait —
with the existing rarity/rank/topic palette + small size (BACKLOG T152 table). Then → `T102`/`T103` (Android)
→ `T89`/`T90` → content → `T72`.

**Builder B → `T151` FINISH (PARTIAL fix — `ambient` still diverges to 1096) → `T150` (browser harness) → `T152[B]` (small-particle option)**
**⚠ `T151` re-pushed `2f8d1a9` is PARTIAL.** The Butterworth-Q damping fix is correct + fixed `menu`/`lofi`/
`dubstep` (Babysitter re-measured: peak ~1.0; the `{now}` switch now CLEARS cleanly ✓). **BUT `ambient`
(`reverbDecay: 0.9`) STILL DIVERGES** — AnalyserNode peaks `0.36 · 1.73 · 9.4 · 90 · 284 · 1096` over ~4 s.
**Your gate FALSE-GREENED it:** the analytic `simulateFDN` model declares 0.9 stable, but real Web Audio
diverges → **don't trust the model.** **Fix:** (1) bound EVERY style incl. `ambient`/decay 0.9 — find the
remaining >1 loop-gain empirically, or lower `FDN_DECAY_MAX`/`ambient.reverbDecay` to a measured-safe value;
(2) **replace the analytic gate with a REAL `OfflineAudioContext` render** (actual `BiquadFilter`s) per style,
assert peak ≤ ~2 over ≥5 s — the analytic model can't be trusted. **ALSO confirm a `{now}` switch FULLY
CLEARS** — owner: "doesn't fully switch, elements of the previous music continue" (same runaway tail; my
measure shows lofi→dubstep already clears once bounded). I'll re-measure ALL 12 with the AnalyserNode. **Then
`T150`** — the
Playwright browser-render harness (loads app @ dpr 2.75, fires the real celebration, asserts
`#fxBurst.clientWidth>0` + lit coverage — would've caught T149; guarded so Node-only CI still passes; in-env:
global `playwright` at `/opt/node22/lib/node_modules/playwright` + Chromium at `/opt/pw-browsers`). **Then
`T152[B]`** — a **small/fine** particle size option (DPR-aware via T138 so crisp not sub-pixel) + spread +
confirmed off-centre `{x,y}` emission, for the owner-planned point-emission celebrations (A wires positions in
`T152[A]`). Full DoD: `BACKLOG.md` T151/T150/T152. **B-owned only** (new `test/browser/…` + `synth.js`/
`fxgl.js` tests); never touch existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
