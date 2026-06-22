# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T187` (Codex items CLICKABLE → detail popup, owner-requested).** Your `T184`/`T182`/`T186` +
the Codex Emblems wiring are all **APPROVED** (live `8cbfa68`). Next:
- **`T187` — Codex cells open a DETAIL POPUP** like the inventory items. Today tapping a Codex cell does nothing:
  the `#invList` handler matches `.inv-cell` (incl. `.codex-cell`) then `C.byId(cell.dataset.id)` — but Codex
  cells have **no `data-id`** (they carry `data-codex`/`data-n`/`data-type`/`data-region`/`data-seed`/`data-emblem`),
  so it `return`s. Add a Codex branch → reuse the `openModal`/`#unlockModal` chrome to show the **enlarged art** (re-
  draw via Monsters/Scenery/EventArt/Emblems off the cell's `data-*`) + the **name** + a **category / where-found**
  line (Beast·Realm·Type / Boss·Realm / Realm / Event / Emblem). Owned → full detail; locked → the `"???"` tease.
  [A]-only (`main.js`, maybe `index.html`/`styles.css`, tests). *(BACKLOG T187.)*
- **Then HOLD for the icon direction.** The owner is reviewing whether the app icon should come from the abstract
  **Emblems** or be derived from the **bestiary/boss/hero** art they prefer — Babysitter will file the chosen
  direction. Don't pre-build. *(`T168` Play-Store held for ID-verify.)*
**Re-read this line fresh before each task + push.**

**Builder B → `T185` 🔴 BUG (the gold hoard pile DOESN'T DRAW on the device).** ✅ **ROOT CAUSE FOUND
(Babysitter-verified in `fxgl.js`):** the hoard renders **only on `CPUBackend`** (`_still` → `_hoard`, :1241/:1247).
**`GLBackend` (WebGL2) and `GPUBackend` (WebGPU) never draw it** — `renderFrame` is only scene+ambient+burst, and
`setData` **ignores `derived.hoard`**. The owner's Android-Chrome PWA runs WebGL2/WebGPU → the mound is never
drawn (matches the owner: *"not displaying at all… if anything it's behind the purple backdrop"* — NOT occlusion).
**Fix (recommend the 2D overlay):** make the hoard render on **all** backends — preferably a backend-agnostic
**Canvas2D hoard-overlay** layered over the GL/GPU scene canvas (transparent, `pointer-events:none`, z above the
backdrop / below the buttons), reusing the existing `_hoard` + `drawCoin` 2D code; the Controller owns/sizes/
redraws it on `setData`. DoD: pile visible **on the WebGL2/WebGPU backends** (not just CPU); scenes byte-identical
when `scene.hoard` absent; `fxgl`/`fx-wiring`/`hoard-wiring` green. B-owned (`fxgl.js`, `index.html`, tests).
*(BACKLOG T185.)*

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*

