# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T124` (fraction glyphs) → `T152[A]` (celebration: emit from source point + small size — after B's engine part) → roadmap (`T101` → Android → Arena 3v3 → content → `T72`)**
Audio/FX/menu block cleared + **browser-verified** (T149 celebration, T140 picker, T146 declutter, T147
graphics, T148 SFX, T142 backdrop, T143 nav-trap — all APPROVED). **`T124`** — fraction tree-glyphs bigger/
clearer using node width. **`T152[A]`** (owner-planned celebration polish; do after B adds the small-size
engine option): replace the fixed `x:0.5,y:0.55` at each `fxCelebrate*` call site with the **source element's
normalized centre** (`getBoundingClientRect()`) — inventory→toast, run→rank badge, mastery→topic node,
arena-win→enemy portrait — passing the existing rarity/rank/topic palette + the small-size option (see
BACKLOG T152 table). Then → `T101` → `T102`/`T103` (Android) → `T89`/`T90` → content → `T72`.

**Builder B → `T151` (synth output DIVERGES — the real "audio sounds bad") → `T150` (browser-render harness) → `T152[B]` (small-particle engine option)**
**⚠ `T151` FIRST — Babysitter BROWSER-MEASURED it** (AnalyserNode on `Synth.output()`): the master output
grows **exponentially in EVERY context, no switch needed** — `menu` peaks `0.36→1.93→7.42→33.6→159` over 3 s
(~×4.5 / 0.33 s; switching diverges *less* → the switch is NOT the cause). The limiter then clamps a 30–160×
signal → escalating distortion = the owner's "sounds bad." **Fix the feedback instability in `synth.js`**
(suspects: FDN reverb spectral radius ≥ 1 via damping/summing; a reverb send→return LOOP into a bus; or
voice/gain accumulation — one context over ~5 s must SETTLE to a bounded tail). **Add a peak-BOUND gate**
(offline render / `AnalyserNode`: peak ≤ ~2 over ≥5 s; must FAIL on today's build). **ALSO make a switch FULLY
CLEAR** — owner: "the switcher doesn't fully switch, elements of the previous music continue" = the same
runaway reverb tail; after a `{now}` swap the old context must decay to ~0 within ~1–2 s. **Then `T150`** — the
Playwright browser-render harness (loads app @ dpr 2.75, fires the real celebration, asserts
`#fxBurst.clientWidth>0` + lit coverage — would've caught T149; guarded so Node-only CI still passes; in-env:
global `playwright` at `/opt/node22/lib/node_modules/playwright` + Chromium at `/opt/pw-browsers`). **Then
`T152[B]`** — a **small/fine** particle size option (DPR-aware via T138 so crisp not sub-pixel) + spread +
confirmed off-centre `{x,y}` emission, for the owner-planned point-emission celebrations (A wires positions in
`T152[A]`). Full DoD: `BACKLOG.md` T151/T150/T152. **B-owned only** (new `test/browser/…` + `synth.js`/
`fxgl.js` tests); never touch existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
