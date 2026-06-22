# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> Single source of truth for "what do I build right now." **Re-fetch
> `origin/claude/agent` and re-read this IMMEDIATELY before each task and before you
> push.** Rationale/details live in `REVIEW.md` / `BACKLOG.md`.

---

**Builder A → `T206` (Collector awards rejig).** `T201`/`T202`/`T198` all **APPROVED** (live `b4eead7`).
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
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm (live `b4eead7`):** the **install identity** (revisit the page → the Install dialog should
now show **Goblin Gold + Magnar**; an already-installed PWA needs an uninstall/reinstall once); the **Magnar splash**
mark; the **gentler 1k pile** (~2.5%); the **app-switch backdrop** (switch apps → backdrop survives). Lofi (T190)
already confirmed ✓.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
