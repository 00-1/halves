# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T189` (FIXED Back-button location across menu screens, owner-reported).** Your `T187` (Codex
detail popup) is **APPROVED** (live `39459e7`). Next:
- **`T189` — the Back button MOVES around; pin it to one fixed location.** Every subscreen's `.res-actions` bottom
  flex row (`styles.css:480`) holds its Back button, but it shifts **horizontally** (2-button rows like Arena put
  Back on the right; single-button screens on the left) and **vertically** (the row follows variable content on
  the screens that aren't bottom-pinned). Fix: **(vertical)** make every subscreen a `flex` column with a
  scrollable `.scroll-body` over a `flex:0 0 auto` action row pinned to the bottom safe-area (extend the
  `#settings`/`#audio` pattern to Inventory/Heroes/Arena/Practice/Hoard/etc.); **(horizontal)** Back **always in
  the same corner** — recommend **bottom-LEFT** (primary action e.g. Fight/Save on the right; reorder Arena so Back
  is first). Placement only, keep the styling. (A fixed top-left chevron is an acceptable alt **if** consistent on
  EVERY subscreen — flag for the owner.) `back-nav` green. [A]-only (`index.html`, `styles.css`, maybe `main.js`).
  *(BACKLOG T189.)*
- **Then HOLD for the icon pick.** Once B's `T188` candidates land, the owner picks the launcher icon → Babysitter
  files the wire-up. Don't pre-build. *(`T168` Play-Store held for ID-verify.)*
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
- **Then `T190` — Lo-Fi Study STILL feels dark + stressful** (owner re-raised). T183 only nudged pitch/reverb and
  **left the mode MINOR** (`dorian`) — that's the actual "dark." Make it genuinely calm + bright: move to a
  **major-family mode** (Ionian/Lydian/Mixolydian), a **home-resolving progression** (don't end on 4/5), and
  **soften the busy lead**; keep it slow/sparse + still distinct from ambient/tropical. Update the golden-synth +
  distinctness goldens. [B]-only (`synth.js`, goldens). *(BACKLOG T190.)*
- **Then `T188` — MORE icon candidates, in the BEASTS/HEROES style.** The owner reviewed the live emblems: they're
  fine but **heroes/beasts/bosses are the preferred icon direction.** Add ≈3–5 **character-forward** candidates to
  `emblems.js` (so they show in Codex ▸ Emblems) in the `monsters.js` generative LOOK — a 16×16 role-grid pixel
  creature/hero (body/accent/outline/eye, bold type-colour, glinting eye), composed as a **maskable** app icon
  (full-bleed, centred, legible small + 512px). Keep `emblems.js` self-contained (re-implement the style; no
  imports). Keep the existing 6. `emblems.test` extended + green. [B]-only. *(BACKLOG T188.)*

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*

