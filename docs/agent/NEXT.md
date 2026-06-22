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

**Builder B → STAND BY.** `T211` (hoard home-only) + `T207` (coin shine, ✅ owner-confirmed) **APPROVED** (live
`b8ad4c9`); queue clear. Hold until the Babysitter points you at a task. *(Candidate when free: the low-end-Android
**perf pass** — the pile sparkles/title glints/coin shower added new continuous animation; validate on a cheap
device before launch. Ask the owner before starting.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm (live `b8ad4c9`):** the **hoard is home-only** now (T211 — check it's gone from Inventory/
Heroes/Setup). Already ✅: lofi, Magnar icon/splash, coin shine, install identity, app-switch backdrop, 1k pile,
Collector tab (15). Title feedback captured → T212.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
