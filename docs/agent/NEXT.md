# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> Single source of truth for "what do I build right now." **Re-fetch
> `origin/claude/agent` and re-read this IMMEDIATELY before each task and before you
> push.** Rationale/details live in `REVIEW.md` / `BACKLOG.md`.

---

**Builder A → `T208` (entry fixes) → `T209` (gold title) → `T206` (collector rejig).** `T201`/`T202`/`T198`
**APPROVED** (live `b4eead7`). *(If you're mid-`T206`, finish + push it, then do `T208`.)* **Note:** `T206` is last
because it **depends on B's `T205`** (the resized creature art for the award icons) — do the independent entry work
(`T208`/`T209`) first while B finishes `T205`.
- **`T208` — kill the `x/2` flash + restore the subtitle (quick, owner-bothered).** `index.html` hard-codes
  `<div class="mark">x/2</div>` (paints instantly) and `renderBrand()` only swaps in Magnar after JS → a flash.
  **Empty the static `.mark`** (reserve its height to avoid a jump); keep `paintGlyph(halves)` as the no-flash
  fallback only. **ADD the "The Void Throne" subtitle:** the maths tag is fine + stays — the missing piece is **"The
  Void Throne"** (full title = *Goblin Gold: The Void Throne*). Add it as a subtitle line between "Goblin Gold" and
  the maths tag (smaller gold/amber series line; NOT pixel-gold — that's T209). Stack: Magnar → Goblin Gold → The
  Void Throne → Fast mental-maths drills. [A]-only (`index.html`, `main.js`, `styles.css`). *(BACKLOG T208.)*
- **`T209` — stylise the title BLOCK** (owner). **"Goblin Gold" → pixel-GOLD** (built from the hoard `GOLD_TONES`/
  T195 gold-ramp+Bayer dither); **"The Void Throne" → dithered PURPLE/BLACK** (void palette `#9a5cf6`/`#1a102e`→black,
  same Bayer dither) — a matched pair (currency gold vs endgame void). **Occasional throttled glints on both**
  (gold on the gold line, violet on the void line; reduced-motion off). Maths tag + everything else stay clean.
  [A]-only (`main.js`/`index.html`/`styles.css`). *(BACKLOG T209 — after T208.)*
- **`T206` — recalibrate Collector awards + absorb the 3 creatures → 15 total.** The collect-N ladder is today
  **12 tiers 25→10,000**, but the catalogue is ~1,900 so **2,500/5,000/7,500/10,000 are unreachable.** Drop those,
  **compute the live `CATALOG.length`** and set the final tier ≈ that (~1,900 per the owner). **Absorb B's 3 creature
  emblems (`beast`/`goblinking`/`voidbeast`, T205) as Collector awards → 15 total**, rendered at the **same
  award-cell size** as the other icons (the "needs cropping" fix). **Remove the Codex EMBLEMS section**
  (`invCodexHtml`). Keep saved `collector:*` unlocks migration-safe. [A]-only (`collectibles.js`, `main.js`, tests).
  *(BACKLOG T206 — depends on B's T205 trimmed/resized art.)*
- Then **`T168`** stays HELD on the owner's Play ID verification.
**Re-read this line fresh before each task + push.**

**Builder B → `T205` (trim emblems to the 3 creatures + fix cropping).** `T204` (backdrop self-heal) **APPROVED**
(live `b4eead7`).
- **`T205` — scrap 6 emblems, keep + re-fit the 3 creatures.** Remove `coin`/`crowncoin`/`hoard`/`goblin`/
  `voidthrone`/`sigil` from `emblems.js`; keep `beast`/`goblinking`/`voidbeast` (they move to Collector awards via
  A's T206). **Re-fit the 3 creature draws to fill the cell, uncropped, same visual size as the other collectible
  icons** (owner: "in the emblems screen they look like they need cropping"). Update `IDS` + `emblems.test`. [B]-only
  (`emblems.js`, tests). *(BACKLOG T205 — pairs with A's T206.)*
- **Then `T207` — coin SHINE.** Owner: occasional **glints on the pile**, **glints on the shower coins**, clearer
  **rotation** on flying coins. (1) `drawCoinParticle` passes `glint=0` → add an animated specular glint tied to the
  spin/`wob` phase, varied per coin. (2) **Pile glints** — occasional sparkle on settled coins, but the pile is a
  **static still by design**, so keep it **cheap + throttled** (~4–8 Hz, repaint only glinting coins, off under
  reduced-motion, NO per-frame full pile redraw). (3) Rotation already exists (`p.spin`/`p.wob`) — make it read
  clearly + varied. [B]-only (`fxgl.js`, tests). *(BACKLOG T207.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm (live `b4eead7`):** the **install identity** (revisit the page → the Install dialog should
now show **Goblin Gold + Magnar**; an already-installed PWA needs an uninstall/reinstall once); the **Magnar splash**
mark; the **gentler 1k pile** (~2.5%); the **app-switch backdrop** (switch apps → backdrop survives). Lofi (T190)
already confirmed ✓.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
