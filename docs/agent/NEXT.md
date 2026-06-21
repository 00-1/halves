# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T142` (RESTORE the backdrop T123 killed — quick) → `T137` (celebration tester) → `T140` (12-style switcher)**
**⚠ T142 FIRST — owner (screenshot, build `63876e4`): "this build killed the nice background :-("** T123's
`.app` scrim `rgba(14,17,22,.88)` is ~full phone width → the full-bleed backdrop is a dark slab. **Remove
the global `.app` scrim** (backdrop returns) and protect only the genuinely floating-on-backdrop text
LOCALLY (stat row "Goblin Gold/Momentum", `build` stamp, audit others — almost everything is already
carded); keep `contrast.test` honest but per-element (must still FAIL if a floating row is unprotected).
Full DoD `BACKLOG.md` T142. LIVE-verify: backdrop visible again + text readable.

Then **T137 — celebration TESTER in Settings + diagnose the invisibility.** Owner after T136: **"I still
don't see celebrations. Add a celebration tester to the setup menu to trigger different celebrations."**
Feature AND diagnostic. Add a tester row in Settings (pixel
buttons, a11y, like the music switcher) that fires each celebration on demand — **Item unlock**
(`fxCelebrate`), **Rank up** (`fxCelebrateRank`), **Arena win** (`fxCelebrateWin`), **Big burst**
(`fxBigBurst`) — ensuring `setupFx()` ran first. **Then DIAGNOSE live** (gates/golden pass yet it's
invisible — the golden only COUNTS rects). Babysitter already ruled out the easy causes statically: CSS
layer is correct (`#fxBurst` z-58, in front of `.app`), `ready` is sync-true for `{backend:"2d"}`,
`renderFrame` draws correctly. Check on-device in order: (1) `fxBurst` non-null + `isReady()` + **`dimensions()`
non-zero** (else resize timing [A]); (2) **occlusion — there's a 2nd overlay `#fxCanvas` (z-59, `window.FX`)
ABOVE `#fxBurst` (z-58)**; reconcile/layer them; (3) if ready+sized+unoccluded but still nothing, particles
may draw transparent/sub-pixel/off-canvas → **[B] engine fix `T138`** (flag with live evidence + a
visibility golden, not a count). Full DoD: `BACKLOG.md` T137 (LIVE-verified — owner must SEE it). Then →
**`T140`** (extend the music switcher to ALL 12 styles B builds in T139 + per-screen routing + the dubstep
victory fires on a win — see BACKLOG; depends on T139) → `T124` (fraction glyphs) → `T101` → `T102`/`T103`
(Android) → `T89`/`T90` → content → `T72`. *(T123 a11y DONE `63876e4`.)*

**Builder B → `T141` (RESEARCH musical styles → a 12-style palette) → then `T139` (build them)**
*(T134 clean-swap DONE `ea1ed5c` — owner confirms switching works + likes menu/arena.)* Owner: likes
**menu**+**arena**, finds the others samey, the **dubstep victory** is missing — **"keep the two I like,
ditch the others, cut 10 NEW distinct styles incl. the dubstep victory, put them all in the launcher"**, and
**"do a research pass on musical styles to really get those 10 unique/interesting."** **T141 FIRST —
research** (like T119→T120): a B-owned doc (`docs/research-music-styles.md`) on the genre DNA of a spread of
styles (tempo/mode/rhythm/instrumentation/production tricks) mapped to THIS engine's levers, ending in a
**concrete proposed 12-style table** (menu+arena kept; 10 new incl. **dubstep victory** + ≥1 CALM for solves
+ ≥1 festive), each with its engine-param recipe; flag any small patch additions a style needs (e.g. a
pulse/square for chiptune, a half-time wobble for dubstep). **The Babysitter shows the owner the proposed
palette for a thumbs-up before T139 builds it.** Then **T139** — implement the 12 in `CONTEXTS` (replace
solve/event), make the dubstep victory a real audible drop reusable by the win sting (un-ducked sfx bus),
and extend the `golden-synth` distinctness gate to all 12. Full DoD: `BACKLOG.md` T141/T139. **B-owned only**
(`synth.js` + new research doc + tests/goldens + `BUILDER-LOG-FX.md`); never touch existing Halves files;
never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
