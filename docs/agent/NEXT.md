# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T178` (economy: ramp mid/late gold → absurd wealth) → content `T60`/`T61` → `T173` (hoard wiring, after B's `T172`)**
**Big batch DONE+APPROVED — nice work:** `T177` fullscreen-restore (`90422c5`), `T176` notch (`ff20cae`), `T171`
Goblin Gold rename (`1a4bcf5`), `T59` content (`1ba6f62`). The live PWA bugs are cleared.
- **NEXT REAL WORK → `T178` (unblocked, [A]-only, fully specced):** add an **exponential mid/late wealth ramp** so
  gold reaches **millions→billions/trillions** (the goblin-hoard comedy). Mechanism: a **"Hoard Multiplier" =
  `g^(Arena bosses defeated)`** multiplied onto the existing additive `goldMult` — early game unchanged (no bosses
  → ×1), late game explodes. **OWNER-CHOSEN `g` = 2.5** (sim: `docs/agent/economy-sim.js`; ×9537 at full clear → billions ~2 months, ~150B ~4 months,
  trillions ~6 — max comedy). Pair with `GOLD_FULL`≈1e10 (tunable). Gold is decoupled from Arena
  difficulty (`tierGold` payoff vs foe `def`) → no balance impact. `fmtGold` already formats to 10⁴⁵ + milestones
  to 1e15 (add a B/T/Qa formatting test). Keep early-game earning identical; update the `Gold` unit tests.
  [A]-only (`main.js`, gold tests). *(BACKLOG T178.)*
- **Then** content `T60`/`T61` (continue the Wave-2 batches after `T59`).
- **`T173`** (hoard WIRING — feeds off `T178`'s gold + B's `T172` engine; includes the amount-scaled spinning-coin
  earn-burst, the Graphics-menu tier testers, and the `?dev` gold-setter) **stays blocked on B's `T172`**, which is
  itself behind the **foghorn fix (`T175`)**. So: `T178` → content → (hoard when B's engine lands).
**Re-read this line fresh before each task + push.**

**Builder B → `T175` 🔴 BUG-DO-FIRST (the FOGHORN is back — music BUILDS UP to a drone over time).**
**🔑 SHARPENED — owner: "totally reproducible — EVERY song (via switcher) starts nice then ramps to foghorn/pain."** NOT context-specific → the **common reverb path accumulates too much from the new T155 PADS** over the reverb fill time (true divergence OR a too-hot steady state railing the limiter). Trivial repro: start any song, wait ~15-30 s. Suspect T155 pad gains/sends + T165 `flush`/`setDecay` leaving the FDN feedback hot. Owner earlier: *"music started nice then BUILT UP to foghorn"* = a **gradual ramp**
(output grows unboundedly until the −1.5 dB limiter rails it into a sustained drone). **Why the gate missed it:**
`audio.test` renders the **reverb alone, noise, only 5 s** — a buildup that diverges by 20–30 s, or only via the
real **sustained T155 pads** feeding the FDN, is invisible. **Fix:** measure a **LONG (~25–30 s) render of the
REAL music path** (`setContext`+`setMusic`+`start` in a real `AudioContext` via `AnalyserNode`, per context) →
find the diverging context + root (sustained pad → FDN accumulation? T165 `flush` restoring `curDecay` wrong? a
`reverbDecay` near the cliff? voice accumulation?), **bound it**, and **EXTEND the gate to a long real-music
render** so this slow-buildup class is caught. `golden-synth` stays green. I'll re-measure the long peaks before
DONE. **B-owned (`synth.js` + tests) only.** *(BACKLOG T175.)*
**The gold-hoard `T172` is PAUSED behind this**, but the owner has now **GREENLIT the hoard** (with refinements: earn-burst is a standalone **spinning-coin** burst — no settle; coins must really read as coins; `GOLD_FULL`≈500K tunable fill rate — see `GOLD-HOARD-DESIGN.md`). So after `T175`: build `T172` per the updated design.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
