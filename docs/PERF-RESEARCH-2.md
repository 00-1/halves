# PERF-RESEARCH-2 — low-end-Android render hot-path audit + fixes (T103)

**Owner mandate (2026-06-22):** the perf pass "is not optional." Target device class:
**Adreno-618 / Snapdragon-732 (Poco-X3) and weaker**, as an installed **PWA/TWA** (WebView /
Chrome) — so this is **web perf with an Android-reality lens**, not native. The home screen now
carries continuous animation (the FX backdrop), so the budget question is real.

This is a **measure-and-fix** pass: the audit names the hot paths in the *live* code, the cheap
fixes are **applied in this pass** (see "Fixes applied"), and the parts only the owner can measure
get a concrete **on-device plan** below. Builder B cannot measure real hardware — the owner is the
low-end oracle (jank / battery / heat).

Cross-ref: **T101** (Start→fullscreen delay) and **T150/T154** (the browser render/visual gates).

---

## The render hot paths (named, from live `fxgl.js`)

| # | Path | When | Cost (pre-fix) | Verdict |
|---|------|------|----------------|---------|
| 1 | **Coin-shower overlay** (`_syncOverlay` → `drawHoard` + flying coins) | every RAF *during a burst* (~1–2 s) | re-rasterised the **static pile** (~16–22k `fillRect`/frame) **plus** flying coins, **per frame**, **×refresh-rate** | **WAS over budget** → fixed |
| 2 | **Pile sparkle** (`_pileGlint`) | ~5 Hz on the live home backdrop | repaint of the **coins only** (~240–480 coins × ~10 cells ≈ 12–24k `fillRect/s`); the silhouette is **not** redrawn | within budget (already coin-only + throttled) — kept |
| 3 | **GL scene** (`backend.renderFrame`) | every RAF on home/arena | one full-screen quad + instanced particles (GPU) | cheap (GPU-bound) — kept |
| 4 | **Idle / off-home screens** | Inventory/Heroes/Setup | — | ~0: `stop()` idles the RAF + (T211) hides+clears the overlay |
| 5 | **Reduced-motion** | accessibility / low-power | — | no continuous loop (a single still); pile sparkle gated off |
| 6 | **Context / listener count** | app lifetime | 1 GL context + 1 2D overlay context; 3 lifecycle listeners | bounded — see below |

---

## Fixes applied (this pass, `fxgl.js`)

1. **Burst pile CACHE (the headline fix, hot path #1).** During a shower the pile (silhouette +
   settled coins) is **static** (the sparkle pass is gated off mid-burst), yet `_syncOverlay`
   re-rasterised it every frame. Now `_pileBitmap(W,H,scale,hoard)` renders the pile **once** to an
   **offscreen canvas** (keyed on size/scale/level/seed → auto-invalidates on resize or a wealth
   change) and each burst frame **blits it** (`ctx.drawImage`) instead of re-drawing it.
   - Measured in the gate: the per-frame burst overlay drops from **~22,031 `fillRect`** to **one
     `drawImage`** — a ~22,000× cut in the per-frame 2D cost during the celebration. Flying coins
     still draw per frame (the only moving part). Output is pixel-identical (same `drawHoard`).
   - The cache (~one full-screen canvas, ≈10 MB at dpr 2) is **freed on burst end** (`_freePileCache`)
     and on `dispose` → no idle memory cost.
   - Capability-gated: with no `document.createElement` / `drawImage` (old engines, test stubs) it
     falls back to the direct per-frame `drawHoard` — behaviour-preserving.

2. **High-refresh CAP (hot path #1, 90/120 Hz).** The per-frame burst **overlay** composite is now
   capped to **~60 Hz** (`ts - _ovT ≥ 15 ms`); the **GL scene still renders every RAF** (smooth fog).
   So a 120 Hz panel no longer doubles the 2D cost — the flying coins update at ≤60 Hz, the scene at
   the panel rate. (Gate: 5 high-refresh ticks → 5 `renderFrame`, 3 overlay composites.)

## Verified-good (audited, no change needed)

- **Pile sparkle (#2)** is already **coin-only** (it does NOT redraw the silhouette) and **throttled
  to ~5 Hz** off the ambient clock → ~12–24k `fillRect/s`, within a weak-GPU Canvas2D budget. If the
  owner reports jank specifically while idling on a *full* (1T) home pile, the cheap next step is to
  repaint only the *changing* coins (the on/off sparkle subset) — deferred to avoid the coin-overlap
  z-order artifact unless measured necessary.
- **Idle / off-home (#4):** `stop()` cancels the RAF when no burst is alive and (T211) hides+clears
  the overlay; `_needsFrame()` is false → the loop doesn't reschedule. Off-home screens cost ~0.
  (Gate: a stopped controller needs no frames and pumping schedules no RAF.)
- **Reduced-motion (#5):** `_ambientLoops()` is false → no continuous loop (a single still frame);
  `_pileGlint` and the shower `shine` are gated off. (Gate: reduced controller `!_needsFrame()`.)
- **Degrade ladder:** `autoQuality()` + `QUALITY` tiers scale the particle cap + render scale;
  backend selection is **WebGPU → WebGL2 → Canvas2D still** with a working **2D fallback** (WebView
  may not expose WebGPU; a lost context self-heals — T204). Single GL context (the 2nd surface is
  Canvas2D by design, T133) → no per-document GL-context-limit risk.
- **Listeners:** the app uses **one** backdrop `Controller` for its lifetime (re-used across screens
  via `stop`/`start`, not re-created), so the T204 context-loss + `visibilitychange` listeners are a
  **fixed, app-lifetime set** (removed on `dispose`) — no per-navigation leak.

---

## Owner on-device measurement plan (real Android phone)

Builder B can't measure real hardware. Please run these on the **lowest-end device you have**
(installed PWA, not desktop), and report **jank / battery / heat**:

1. **Idle home (5 min):** sit on the home screen with a big hoard (dev gold-setter → 1T). Watch for
   frame hitches in the drifting fog and the pile sparkle. Note battery % drop over 5 min and whether
   the phone warms. *Target: steady, no perceptible jank, negligible battery/heat.*
2. **Celebration storm:** trigger many gold gains rapidly (the shower). *Target: the coin shower
   stays smooth (no stutter) — this is where the cache fix should bite.*
3. **Navigate fast:** bounce home ↔ Inventory ↔ Heroes ↔ Arena ↔ Setup repeatedly. *Target: no
   build-up of lag (no leaked loops), instant screen swaps, and NO gold pile behind non-home screens
   (T211).*
4. **Backgrounding:** switch apps and return several times. *Target: the dark backdrop always comes
   back (no light-grey flash — T204), no crash.*
5. **High-refresh:** if the phone is 90/120 Hz, confirm the celebration doesn't run hotter than at
   60 Hz (the overlay cap should hold the 2D cost).
6. **Reduced-motion:** enable the OS "reduce motion" setting → the home backdrop should be a **static**
   frame (no animation, no sparkle), costing ~0.

If any step janks or drains battery, tell B *which* step — that points straight at the hot path
(shower → cache/cap; idle → sparkle rate; navigation → a leak; reduced-motion → a gate miss).

## Targets (acceptance)

- Stable frame-rate on the home backdrop + during the celebration on Adreno-618-class hardware.
- Idle/off-home/reduced-motion cost ≈ 0 (no continuous work, no RAF leak).
- No battery drain / heat from sitting on the home screen.
- The 2D overlay never re-rasterises a static pile per frame; never holds the burst cache while idle.
