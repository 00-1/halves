# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → bump `T178` g→2.5 (one line) → content `T60`/`T61` → `T173` (hoard wiring, after B's `T172`)**
- **`T178` CHANGES (quick):** the economy ramp landed (`e55cf47`) but `HOARD_G = 2.1` — **owner chose 2.5**. Bump
  the constant to **2.5** + re-run `gold.test`. (Mechanism is correct; just the value.) *(BACKLOG T178.)*
- **Then content `T60`** (Measures: Money/Time/Metric) → **`T61`** (Reasoning: Ratio/Mean/Sequences) — Wave-2
  batches, each a fixed `{p,a}` set + a Node logic gate, per the existing pattern.
- **`T173`** (hoard WIRING) unblocks **once B's `T172` engine lands** (now in progress — the foghorn cleared). It
  includes: gold→`homeFxState` via `GOLD_FULL`≈1e10, the **amount-scaled spinning-coin earn-burst** (no settle),
  the **Graphics-menu tier testers**, and the **`?dev` gold-setter**. [A]-only.
**Re-read this line fresh before each task + push.**

**Builder B → `T172` (gold-hoard ENGINE) — the foghorn is FIXED + the hoard is owner-greenlit.**
`T175` foghorn DONE+APPROVED (`2072b22` — decay cap 0.66 + reverb-return safety compressor + an extended tonal
long-render gate; measured bounded). **Now build `T172`** per `docs/agent/GOLD-HOARD-DESIGN.md` §engine + the
T174 research: (a) **beveled-coin splat** (`look:"coin"` — must read as a coin, opt-in), (b) per-coin rotation+
squash (angles) **+ animated SPIN for the earn-burst coins**, (c) **hoard scene mode** (silhouette + surface-
scatter on a saturating curve, ≤340 coins, cap-safe), (d) a **standalone spinning-coin burst** (NO attractor/
settle — owner dropped it), **scaled by gain amount** (log/saturating + capped; juice-not-count past the cap).
Reduced-motion → static; headless-test the pure math; defaults byte-identical (opt-in). Then `T173` is the [A]
wiring. **B-owned (`fxgl.js` + tests; brickmap) only.** *(BACKLOG T172.)*

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
