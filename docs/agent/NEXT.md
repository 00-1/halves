# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> Single source of truth for "what do I build right now." **Re-fetch
> `origin/claude/agent` and re-read this IMMEDIATELY before each task and before you
> push.** Rationale/details live in `REVIEW.md` / `BACKLOG.md`.

---

**Builder A → CONTINUE `T219` in batches.** ✅ `T213` content loop **CONVERGED — DONE** (`efb1abf`), ✅ `T220` void
stretch+flicker **DONE** (pending owner device-confirm), ✅ `T219` **batch 1 (Roman + Primes) APPROVED**. **`Roots` is
already done** (folded into `cubes`→"Cubes & Roots"). **Next: keep building `T219` group-by-group, pushing each batch
on its own for re-assessment.** Remaining topics: Part-1 **BODMAS, ×-tricks, Negatives-P1, Algebra/function-machines**;
Part-2 **Area&Perimeter, Volume, Angles (new Geometry group), Speed-Distance-Time, Median/Mode/Range, F↔D↔P,
Percentage-increase, Prime-factorisation/factors&multiples**; then the **Collector-ladder rebalance LAST**. Each topic:
full curated pool (~21, calibrated), guide + `explain()`, chain-gating, the enumeration-harness + assessment loop.
*(BACKLOG T219.)*

**→ 1. FIX `T221` FIRST — the Void Throne is UNREADABLE (owner is live on it).** `e879629`'s wide-spacing + skew
collapsed "THE VOID THRONE" into illegible streaks. **Owner: "~2× height to be readable (stretch)"** — roughly
DOUBLE the void-line height (`PXY 3→6` and/or a taller source raster). If still not legible, EASE the skew's
top-compression (`rs = 0.78 + 0.22·d`, not `0.6 + 0.4·d`). Keep wide spacing + caps/flicker, centred, no clip at
360px. Headline DoD = **it READS.** Push on its own for owner device-confirm. *(BACKLOG T221 reopened.)*

**→ 2. THEN `T224` — AUDIO settings overhaul.** REMOVE the Music-tempo slider (lock tempo to 1.0×); normalise BOTH
volume sliders to ONE shared **0–11** integer scale (drop the `×`; today music maxes 0.10× / SFX 1.00× — mismatched);
new fresh-install **defaults at the MIDPOINT** = the screenshot levels (music ≈0.10× gain, SFX ≈0.50× gain), 11≈2×
louder, 0=silent; migrate existing prefs to a valid level; keep live-preview + persistence + the style picker. Push on
its own for owner device-confirm. *(BACKLOG T224.)*

**→ 3. THEN `T222` — the GHP multi-app RESTRUCTURE (owner: "move all now" — was SKIPPED last round, still TODO).**
*(Sequenced AFTER the quick splash/audio tweaks ON PURPOSE: the restructure MOVES the dev URL, so it shouldn't land
while the owner is actively device-testing visual/audio tweaks on the current URL. Do it once the live-iteration
settles — but it IS still owed; don't drop it.)*
READ `FRANCHISE-HOSTING.md` first. Move the live app into **`gg1/dev/`**, create **`gg1/prod/`** (promoted copy, TWA
target) + **`gg2/dev/`**; root `index.html` = a **franchise landing** that scans **`apps.json`** + reads each app's
`manifest.webmanifest` to list links. **ISOLATED saves** per scope (`gg1dev.*`/`gg1prod.*`/`gg2dev.*`); **NO
cross-game gold** (per-game, starts at 0 — no wallet); **`sw.js` cache cleanup → prefix-scoped** (no cross-eviction);
**one-time `halves.*`→`gg1prod.*` migration** so the live save survives. `gg1/v1/` waits for the tag (T223). **On
handoff, tell the owner the NEW dev URL `…/halves/gg1/dev/`.** *(BACKLOG T222.)*

**→ 4. THEN continue `T219`** (batched by group — push each on its own for re-assessment).
  ✅ DONE: Roman, Primes, Percent-Increase, F·D·P, BODMAS, Function-Machines (+ Roots via cubes).
  **REMAINING:** Part-1 **×-tricks, Negatives-P1**; Part-2 **Area&Perimeter, Volume, Angles (new Geometry group),
  Speed-Distance-Time, Median/Mode/Range, Prime-factorisation/factors&multiples**; then the **Collector-ladder
  rebalance LAST**. *(BACKLOG T219.)*
- **After `T219` → `T218`** — notification BADGES on nav items (new loot → Items, new hero → Heroes; clears on view;
  persists). A core/shell feature GG2 inherits (crops-ready). [A] (`main.js`/`index.html`/`styles.css`, tests). Then
  **`T168`** (held on Play ID-verify).
- **Post-T219-landing:** re-run the **T213 deep quality loop** over the full expanded topic set (owner-requested).
**Re-read this line fresh before each task + push.**

**Builder B → STAND BY.** `T103` (perf pass) + `T211`/`T207` **APPROVED** (live `951e532`); queue clear. Hold until
the Babysitter points you at a task. *(Open thread: the perf **on-device measurement plan** in `PERF-RESEARCH-2.md`
is for the OWNER to run on a low-end phone; if it surfaces jank, the follow-up fixes come back to B.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm (live `951e532`):** perf on-device plan **DEFERRED by owner** (not now) — parked as a pre-launch check / covered by the 12-tester window; resurface only if a tester reports jank. Title position + void font → feeding T216. Earlier ✅: lofi, icon/
splash, coin shine, hoard home-only, install identity, app-switch backdrop, 1k pile, Collector (15), "i" fix.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
