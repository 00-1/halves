# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T171` (Goblin Gold rename) → content `T59`–`T61` → `T173` (hoard wiring, once B's `T172` lands)**
**Big batch DONE+APPROVED:** `T162` COMPLETE (all 12 drill modes, `8528658`), `T170` tree-overflow fixed
(`f73443c`), `T169` fonts self-hosted (`d6fbae3`). **Next:**
- **`T171` (small):** brand the PRODUCT **"Goblin Gold"** — manifest `name`/`short_name`="Goblin Gold" (on-device
  label stays short), `<title>`, in-app branding. **KEEP the "Halves" topic.** *(The Play STORE title carries the
  subtitle "Goblin Gold: The Void Throne" — that's a listing field in T168, not the manifest short_name.)* [A]-only.
- **Then** content `T59`–`T61`. **And `T173`** (hoard WIRING — feed gold→`homeFxState`, earn-burst from the
  earn-point) **once B's `T172` engine lands** (B is awaiting the owner's thumbs-up on the hoard technique first).
  *(`T168` Play-Store productionise: name now LOCKED ("Goblin Gold: The Void Throne") — still held until ID-verify.
  `T103`/`T72` need owner creds.)*
**Re-read this line fresh before each task + push.**

**Builder B → `T175` 🔴 BUG-DO-FIRST (the FOGHORN is back — music BUILDS UP to a drone over time).**
Owner on the latest build (`7df7699`): *"music started nice then BUILT UP to foghorn."* = a **gradual divergence**
(output grows unboundedly until the −1.5 dB limiter rails it into a sustained drone). **Why the gate missed it:**
`audio.test` renders the **reverb alone, noise, only 5 s** — a buildup that diverges by 20–30 s, or only via the
real **sustained T155 pads** feeding the FDN, is invisible. **Fix:** measure a **LONG (~25–30 s) render of the
REAL music path** (`setContext`+`setMusic`+`start` in a real `AudioContext` via `AnalyserNode`, per context) →
find the diverging context + root (sustained pad → FDN accumulation? T165 `flush` restoring `curDecay` wrong? a
`reverbDecay` near the cliff? voice accumulation?), **bound it**, and **EXTEND the gate to a long real-music
render** so this slow-buildup class is caught. `golden-synth` stays green. I'll re-measure the long peaks before
DONE. **B-owned (`synth.js` + tests) only.** *(BACKLOG T175.)*
**The gold-hoard `T172` is PAUSED behind this** (and still awaiting the owner's thumbs-up on the technique anyway).

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
