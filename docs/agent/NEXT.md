# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T166` 🔴 BUG-DO-FIRST (config menus exit) → `T164` (music: only switch on real change) → `T167` (PWA fullscreen on tap) → resume `T162` P2/P3 → content `T59`–`T61`**
**3 fresh owner bugs jump ahead of `T162`** (re-read this line!). `T162` P1 (`scaling`/`percentoff`/`partwhole`/
`balance`) is **DONE+APPROVED** (`66fcc92`+`c7e388c`) — don't rebuild; P2/P3 still to come AFTER the bugs.
- **🔴 `T166` FIRST (live regression):** config submenus **exit the config instead of navigating** — a **T157**
  back-nav regression (sentinel-on-every-`show()` + hash double-stacking → back over-shoots its parent). Repro in
  a browser: Settings→Sound→back must land on **settings**, not home. Rework so forward+back are consistent (one
  trailing sentinel, OR hash-as-source-of-truth); add a Node history/popstate test. [A]-only. *(BACKLOG T166.)*
- **Then `T164` (owner + foghorn root):** `musicForScreen` (main.js:380) maps home/settings/audio/graphics/
  inventory/heroes ALL to `"menu"` but **restarts the track on every screen change**. Make it **idempotent** —
  track `curMusicKey = context+":"+seed`; if unchanged + already playing, **return** (no setContext/swapNow/
  start). Keep `musicPreview` + per-topic `lofi` seed switching. Node test asserts skip-when-same / fire-when-
  changed. [A]-only. Pairs with B's `T165`. *(BACKLOG T164.)*
- **Then `T167` (launch/fullscreen — owner REVISED: entry screen kept in ALL modes, "don't miss the music"):**
  **(1) browser tab:** keep the 2-way choice (`#entryFs` fullscreen + `#entryPlay` windowed, the original);
  **(2) installed/standalone (PWA or TWA):** single "Tap to begin" → audio unlock **+ best-effort
  `requestFullscreen()`**. Entry screen is **shown in every mode** (it's the audio gesture). The **TWA launches
  already-fullscreen via its NATIVE immersive config** (a packaging concern on T72/T103, not web code) — so it's
  fullscreen without a button press, with the entry screen on top. `launchMode()` = browser vs installed (the
  `android-app://` referrer split is optional). [A]-only. *(BACKLOG T167.)*
- **Then resume `T162`:** Tier P2 (`ratioshare`, `timegap`, `lcmhcf`, `mean`) → Tier P3 (`cubes`, `money`,
  `digitsum`, doubles/halves range check), one push per tier (spec in `docs/agent/T162-calibration.md`) → content
  `T59`–`T61`. *(`T103`/`T72` Play-Store need owner creds — hold.)*
**Re-read this line fresh before each task + push.**

**Builder B → `T165` 🔴 (audio engine: a context SWITCH must fully stop the previous generator — no tail/foghorn) → `T163` (re-bless brittle `visual_arena` golden) → STAND BY.**
**`T165` FIRST** — owner: the "switcher doesn't fully switch, elements of the previous music continue," and the
**foghorn keeps returning on switches.** A *real* context switch (menu→lofi→arena / picker change) must release
the previous generator's voices + **flush the FDN reverb tail** so nothing bleeds through and no runaway tail
builds the drone. Make `setContext(current)` a **no-op** (defence with A's `T164`). Prove the post-switch output
is **bounded** + the old context's signature doesn't persist (OfflineAudioContext); `golden-synth` stays green.
**B-owned (`synth.js` + tests) only.** Then `T163` (visual golden re-bless), then STAND BY. *(BACKLOG T165/T163.)*
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
