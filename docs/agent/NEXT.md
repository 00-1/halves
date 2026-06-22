# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> Single source of truth for "what do I build right now." **Re-fetch
> `origin/claude/agent` and re-read this IMMEDIATELY before each task and before you
> push.** Rationale/details live in `REVIEW.md` / `BACKLOG.md`.

---

**Builder A → `T210` (title refinements).** `T206`/`T208`/`T209` all **APPROVED** (live `632804d`). Owner on the
stylised title: *"looks good, but 3× the size of both; the Void Throne needs lightening; the Void Throne doesn't
need the same sparkle."* Refine `paintPixelTitle`/`renderTitles` (main.js):
- **3× bigger** — both "Goblin Gold" and "The Void Throne" (~3× current; crisp nearest-neighbour; reflow the splash
  so Magnar + bigger titles + tag + buttons still fit, no overflow).
- **Lighten the Void Throne** — the `TITLE_VOID` ramp (purple→black) is too dark; weight it toward the brand purple
  (`#9a5cf6`/`#cda9ff`) so the subtitle is luminous/legible (still dithered/void, just brighter).
- **No sparkle on the Void Throne** — drop its glint (`TITLE_VOID_GLINT`); **keep the gold glint on "Goblin Gold."**
- [A]-only (`main.js`, `styles.css`/`index.html`). *(BACKLOG T210.)* Then **`T168`** stays HELD on Play ID verify.
**Re-read this line fresh before each task + push.**

**Builder B → `T211` 🔴 (BUG: gold hoard shows behind EVERY screen — should be home-only).** Off standby. Root
cause: the hoard renders on a **separate overlay canvas** (`.fxgl-hoard`, T185) that **strips the `hidden` class**
(never `display:none`), but `main.js`'s `fxShowBackdrop(false)` (on every non-home/arena screen) only hides
**`#fxBackdrop`**, not the overlay → the overlay keeps the last home hoard and shows on Inventory/Heroes/Setup/etc.
**Fix (`fxgl.js`):** the overlay must **follow the backdrop** — on `stop()` (or when the host canvas is hidden),
**`visibility:hidden` + clear** the overlay; re-show on the home `start()`/`setData` with `scene.hoard`. Keep
`visibility` (not `display:none`, so it stays drawable). DoD: hoard shows **only on home**, not other screens;
returns correctly. [B]-only (`fxgl.js`, tests; tiny CSS only if B picks the `.fx-backdrop.hidden ~ .fxgl-hoard`
route). *(BACKLOG T211.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm (live `632804d`):** the **coin shine** (occasional pile sparkles + glints on the shower
coins + clearer rotation), the **Collector tab** (now 15 awards, final at 1,900, the 3 creatures included), and the
**stylised title** (feedback already captured → T210). Earlier confirmed ✓: lofi, Magnar icon/splash, gentler 1k
pile, app-switch backdrop, install identity.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
