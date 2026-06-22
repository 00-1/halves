# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T177` + `T176` 🔴 BUG-DO-FIRST (PWA fullscreen-lost + notch) → `T171` (rename) → content `T59`–`T61` → `T173` (hoard wiring, after B's `T172`)**
- **🔴 `T177` (live):** PWA **loses fullscreen on minimise** + **no button to get it back** (T156 removed it; T167's `requestFullscreen` drops on background & needs a gesture). Fix: **re-enter FS on the first tap after resume** (arm a one-shot on `visibilitychange`→visible) + **restore a manual FS toggle in the installed PWA's Setup** (walk back T156). TWA native-immersive is the real fix (packaging). [A]-only. *(BACKLOG T177.)*
- **🔴 `T176` FIRST (live):** PWA shows a **black bar in the notch** (purple backdrop doesn't reach the top);
  Firefox is fine. Root: viewport meta (`index.html:7`) **lacks `viewport-fit=cover`** → standalone PWA won't
  paint into the cutout → dark `theme-color` shows. **Fix:** add `viewport-fit=cover`; the full-bleed `.fx-backdrop`
  (inset:0) + body bg then fill the notch purple; UI stays inset-aware (safe-area insets become non-zero — verify
  `home-layout` holds, nothing clips). [A]-only. *(BACKLOG T176.)*
- **Then `T171`** (rename product → "Goblin Gold", keep "Halves" topic) → content `T59`–`T61`.
- **`T178`** (economy, owner): ramp **mid/late** gold **exponentially** (Arena-boss multiplier) so wealth reaches
  **millions→billions/trillions** — the goblin-hoard comedy (infra already supports it: `fmtGold`→10⁴⁵, milestones→1e15;
  only the linear `goldMult` is the bottleneck). Early game unchanged. Feeds the hoard `GOLD_FULL`. [A]-only. *(BACKLOG T178.)*
- **`T173`** (hoard WIRING) waits on B's `T172`. Spec: feed gold→`homeFxState` via a **tunable `GOLD_FULL`≈1e6**
  (the "Gold Hoard" milestone) sub-linear curve — **NUMBER decoupled from PILE** (number→B/T via T178, pile caps);
  the **earn-burst is a standalone spinning-coin burst from the earn-point — NO settling** (owner). *(`T168` Play-Store held for verify;
  `T103`/`T72` need creds.)*
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
