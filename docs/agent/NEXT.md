# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → 2 small `T173` fixes → `T179` (Codex/bestiary) → `T180` (`?dev` reveal-all)**
**Gold hoard + economy + content all DONE+APPROVED:** `T172` engine (`7283fad`), `T173` wiring (`1d1f193`),
`T178` g=2.5 (`7c3a14d`), `T60`/`T61` content (`4f3113c`). **2 small T173 follow-ups first:**
1. **Earn-burst: make it STANDALONE outward, not converging to the hoard.** It currently flies coins DOWN to
   `tx:0.5,ty:0.93` (the pile) — but the owner **dropped converge/settle** ("coins flying *out* already evoke it;
   we're off the home screen when we earn"). It fires on results (off-home). **Drop the `tx/ty` converge → a
   spinning-coin burst that flies OUT from the earn-point + fades.**
2. **Gate the dev gold-setter behind `?dev`.** It's an always-active `?gold=<n>` param — gate it (`?dev` required)
   so it's inert in production (the owner: remove/gate before publish; it's on the T168 checklist). Put it with
   T180's reveal-all in one `?dev` panel.
- **Then `T179` (Codex):** the bestiary tab on Inventory — Beasts (region×type ~30) / Bosses (10) / Realms (10,
  full-lit) / Events (14), encounter-unlocked (locked=silhouette), **reusing the existing generators**
  (`Monsters`/`Scenery`/`eventart`). *(BACKLOG T179.)*
- **Then `T180`** (`?dev` reveal-all collections — heroes/inventory/Codex, view-only override for art review).
- *(`T168` Play-Store held for ID-verify.)*
**Re-read this line fresh before each task + push.**

**Builder B → `T181` (`emblems.js` — generative BRAND EMBLEMS / app-icon candidates).** Off standby — owner
greenlit icon generation, and the emblems also become a **Codex "Emblems"** section (chosen one = launcher icon;
the rest unlockable). Build a NEW standalone module `emblems.js` (`window.Emblems = { draw(canvas,id), IDS }`)
rendering the candidates in the generative pixel/dither style, **gold-on-purple**, maskable-safe (icon-able 48→512
AND Codex-tile-able): `coin` (beveled goblin-stamped coin + glint — reuses the hoard coin look), `goblin` (cheeky
goblin clutching a coin), `hoard` (glinting coin-mound), `voidthrone` (cosmic throne + gold), `crowncoin` (crowned
coin). Deterministic + headless-testable (`test/emblems.test.js` golden on the cell grids). **B-owned only**
(`emblems.js` + test); never touch existing Halves files; never push `claude/agent`. The owner reviews them via
the Codex (T179) + `?dev` reveal-all (T180) and picks the launcher icon. *(BACKLOG T181.)*

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
