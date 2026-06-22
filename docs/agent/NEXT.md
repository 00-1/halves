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
- **`T198` — hoard fills too fast.** `hoardLevel = log10(1+gold)/log10(1e12)` → 25% at 1k, 40% at 60k. **Owner
  update: "1k pile too high — should be about a TENTH of that" → 1k ≈ ~2.5%.** Recurve with a **floor-offset log**:
  `clamp((log10(1+gold)−log10(GOLD_EMPTY))/(log10(GOLD_FULL)−log10(GOLD_EMPTY)),0,1)`, e.g. `GOLD_EMPTY=500`,
  `GOLD_FULL=1e15` → **1k≈2–3%, 60k≈17%, 1M≈27%, 1Bn≈51%, 1T≈76%, 1e15 full** (small but VISIBLE starter; tune vs
  `economy-sim.js`). **Visual only.** [A]-only (`main.js`, `GOLD-HOARD-DESIGN.md`). *(BACKLOG T198.)* Then **`T168`** stays HELD on the owner's Play ID verification.
**Re-read this line fresh before each task + push.**

**Builder B → `T204` 🔴 (BUG: purple backdrop lost on PWA app-switch).** `T203` (coin shower) **APPROVED** (live
`90db0f6`). Owner screenshot: backgrounding the PWA loses the dark backdrop → **light-grey** home (the hoard pile
still draws — it's on the 2D overlay). Root cause: **WebGL/WebGPU context LOSS** on app-switch + **no
`webglcontextlost`/`webglcontextrestored` handling** in `fxgl`, and `main.js`'s `visibilitychange` only manages
audio (never redraws the backdrop). Light-grey tell = a lost canvas presents ~white × `.fx-backdrop opacity:.85`
over `#0E1116`. **Fix (self-heal, [B]-only):** handle `webglcontextlost` (`preventDefault`, **clear/hide → dark not
white**) + `webglcontextrestored` (re-init backend, re-`setData`, re-render); also **re-render the still on
`visibilitychange`→visible**; degrade to the dark body bg, never white. WebGPU device-loss too. [B]-only (`fxgl.js`,
tests; tiny `main.js` foreground hook only if the Controller can't self-listen). *(BACKLOG T204.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm:** the Magnar app icon (reinstall the PWA to see the launcher icon). **Force-refresh the PWA**
before re-testing any hoard change (the service worker caches). Lofi (T190) already confirmed ✓.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
