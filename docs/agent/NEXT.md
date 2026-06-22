# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> Single source of truth for "what do I build right now." **Re-fetch
> `origin/claude/agent` and re-read this IMMEDIATELY before each task and before you
> push.** Rationale/details live in `REVIEW.md` / `BACKLOG.md`.

---

**Builder A → `T201` 🔴 (stale manifest/icon cache) → then `T198` (fill curve).** `T194` + earlier A work APPROVED
(live `751cbe7`).
- **🔴 `T201` — install shows the OLD name "Halves" + `x/2` icon, NOT "Goblin Gold"/Magnar** (owner screenshots).
  Root cause: `index.html` links `manifest.webmanifest` as a **bare URL** (no `?v=`) and the icon `src`s are bare,
  but `sw.js` is **cache-first for everything except nav + `build.json`** (safe only for the `?v=`-versioned JS/CSS).
  So the manifest + icons are served from the **first-ever cache forever** → frozen install identity. **Fix:** serve
  `manifest.webmanifest` + the icon files **NETWORK-FIRST** (add them to the nav/`build.json` branch in `sw.js`), and
  **bump `CACHE` v3→v4** so existing users get purged on next visit. DoD: after a normal revisit the Install dialog
  shows **Goblin Gold + Magnar**, and future deploys propagate. [A]-only (`sw.js`, `index.html`). **Launch blocker.**
  *(BACKLOG T201.)*
- **`T202` — entry/splash mark = Magnar too** (owner). `renderBrand()` paints the **x/2 glyph** onto the `#entry`
  `.mark` canvas via `paintGlyph(el, byId("halves"))`; swap it to paint **Magnar** (`ICON_HERO="hero:mo"`) reusing
  T194's icon renderer (`C.iconColorGrid`), pixelated at the mark size, portrait on the dark bg (no tile square).
  Keep the Goblin Gold wordmark. Quick visual win. [A]-only (`main.js`). *(BACKLOG T202.)*
- **`T198` — hoard fills too fast.** `hoardLevel = log10(1+gold)/log10(1e12)` → 25% at 1k, 40% at 60k. Recurve with a
  **floor-offset log**: `clamp((log10(1+gold)−log10(GOLD_EMPTY))/(log10(GOLD_FULL)−log10(GOLD_EMPTY)),0,1)`,
  `GOLD_EMPTY`≈100–1k, `GOLD_FULL`≈1e15 → **1k≈5%, 60k≈15–20%, 1M≈30%, 1Bn≈55%, 1T≈75%, 1e15 full** (tune vs
  `economy-sim.js`; small visible starter pile). **Visual only.** [A]-only (`main.js`, `GOLD-HOARD-DESIGN.md`).
  *(BACKLOG T198.)* Then **`T168`** stays HELD on the owner's Play ID verification.
**Re-read this line fresh before each task + push.**

**Builder B → `T203` (coin shower polish).** `T193`(fix)/`T197`/`T199`/`T200` all **APPROVED** (live `b498216`) —
owner: pile + shower "look pretty good now." New tweak: the **money-gain coin shower** (`seedBurst` coin branch,
fxgl.js:248/266) should have **slightly BIGGER coins (+15–25%)** and **more GRAVITY — rain DOWN, less fly up** (cut
the upward `up` bias for coins so gravity dominates; give coins more effective fall WITHOUT bumping the global
`BURST_GRAVITY`, which celebrations share). Leave the generic celebration confetti's arc alone. [B]-only (`fxgl.js`,
tests). *(BACKLOG T203.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm:** the Magnar app icon (reinstall the PWA to see the launcher icon). **Force-refresh the PWA**
before re-testing any hoard change (the service worker caches). Lofi (T190) already confirmed ✓.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
