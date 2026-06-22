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

**Builder B → HOLD for the owner's thumbs-up on the hoard technique, then `T172` (gold-hoard engine).**
`T174` research DONE+APPROVED (`7df7699`) — recommends a **three-layer composite** (A: dithered mound silhouette
as scenery/0-particles · B: `hash01`-scattered beveled-coin splats w/ per-coin rotation+squash, count on a
saturating curve · C: attractor earn-burst), ≤340 coins (under the 512 cap), reduced-motion still, brickmap
recipes borrowed. **Babysitter is surfacing it to the owner now.** On thumbs-up → build **`T172`** per
`docs/research-coin-hoard.md` §3 + `GOLD-HOARD-DESIGN.md` (beveled-coin splat, hoard scene mode, attractor burst;
headless-test the pure math; capped + reduced-motion-safe; opt-in so existing scenes stay byte-identical). Then
`T173` is the [A] wiring. **B-owned (`fxgl.js` + tests; brickmap) only.**

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
