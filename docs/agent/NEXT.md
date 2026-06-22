# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> Single source of truth for "what do I build right now." **Re-fetch
> `origin/claude/agent` and re-read this IMMEDIATELY before each task and before you
> push.** Rationale/details live in `REVIEW.md` / `BACKLOG.md`.

---

**Builder A → `T212` (title polish #2).** `T210` (3× + lighter void) **APPROVED** (live `b8ad4c9`). Owner on the
screenshot: looks good, four tweaks. The title is **Space Grotesk 800 rasterised at `cellsH=18px` → upscaled
`PX=3`** (`paintPixelTitle`, main.js), so at 18px the **"i" dot merges → reads "l"** ("Goblln"/"Vold").
- **Fix the "i":** raise the base raster res (`cellsH` 18 → ~24–28) so the dot/stem separate, drop `PX` to keep the
  size. "Goblin"/"Void" must read right.
- **Void Throne distinct/corrupted:** a different font OR a corruption pass on the void line (dropped/displaced
  cells, glitch jitter) — still legible, just glitchier; gold line stays clean.
- **Tighter letter-spacing** (negative canvas `letterSpacing` / condensed) — less gap between letters.
- **~0.9× both** — a touch smaller.
- [A]-only (`main.js`, `styles.css`). *(BACKLOG T212.)* Then **`T168`** stays HELD on Play ID verify.
**Re-read this line fresh before each task + push.**

**Builder B → `T103` (low-end-Android PERF pass — REQUIRED, owner: "not optional").** `T211`/`T207` **APPROVED**
(live `b8ad4c9`); off standby. A **measure-and-fix** pass (not doc-only) for the now-animated home screen. Audit the
render hot paths — **`fxgl.js` first**: the **T207 `_pileGlint`** (full ~480-coin pile redraw at 5 Hz — is that
within a weak-GPU budget, or repaint only the glinting coins?), the 2D overlay/dither cost, RAF/listener leaks
(incl. T204/T211), the degrade ladder (WebGPU→WebGL2→CPU-still + quality tiers/caps) actually engaging, reduced-
motion killing the loops, high-refresh bounding, memory/context count, the Canvas2D fallback. **Apply the cheap
fixes** (throttle/shrink over-budget work; idle screens ~0 cost). Deliver `docs/PERF-RESEARCH-2.md` (findings + fixes
+ an **owner on-device measurement plan** — the owner is the low-end oracle). [B]-led (`fxgl.js`, doc, tests); any
`main.js` fixes → [A] follow-ups. *(BACKLOG T103.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm (live `b8ad4c9`):** the **hoard is home-only** now (T211 — check it's gone from Inventory/
Heroes/Setup). Already ✅: lofi, Magnar icon/splash, coin shine, install identity, app-switch backdrop, 1k pile,
Collector tab (15). Title feedback captured → T212.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
