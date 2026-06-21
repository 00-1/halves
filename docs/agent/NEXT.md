# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T140` (12-style switcher + routing — WAITS for B's T139) → meanwhile `T124` (fraction glyphs)**
*(`T142` backdrop restore DONE `42aac3b`; `T137` tester DONE `41016d4`; `T123` a11y DONE.)* **`T140` is
blocked on B's `T139`** (needs the final 12 style names/labels) — and T139 is itself gated on the owner's
palette thumbs-up. So **A: do `T124` now** (fraction tree-glyphs bigger/clearer using node width — the owner
flagged the fraction glyphs as illegible) while T139 is pending; then **`T140`** when B hands over the style
list: extend the music switcher to ALL 12 styles + per-screen routing (solve→a calm style, arena→arena,
menu→menu, event→festive) + the **dubstep victory fires on a win**. Then → `T101` (Start delay) →
`T102`/`T103` (Android) → `T89`/`T90` → content → `T72`.

**Builder B → `T139` (build the 12 styles) — ⚠ HOLD the CONTEXTS until the owner approves the palette; meanwhile build the no-regret ENGINE ADDITIONS**
*(`T141` research DONE `02d2d6f` — the 12-style palette is OUT FOR OWNER THUMBS-UP; don't finalise the style
rows until the Babysitter posts the owner's OK, since a style may be swapped.)* **You CAN start now on the
engine ADDITIONS the palette needs regardless of which exact styles land** (from the research §0/§3): (1) a
**tempo-synced wub wobble** (`wub` LFO rate locked to the beat — ⅛/¼-note — via an optional
`wobbleRate`/`lfoSync` off the patch/context) for dubstep/dnb/techno; (2) a **`chip`** square-pluck patch
(fast `{a:.001,d:.06,s:0,r:.02}`, dry) for chiptune/8-bit; *(optional)* a scheduler **swing** field
(delay odd 16ths ~12–22%) for lofi/tropical; *(optional)* per-context **reverb decay** for ambient; and the
**victory DROP** gesture (noise-sweep build → sub-wub drop + bright stab) for the dubstep win sting on the
**un-ducked SFX bus** (the T128 lesson). These are tiny, testable, and wasted by no palette outcome. **Then,
once the owner approves the list:** **T139** — replace `CONTEXTS` with the agreed 12 (keep `menu`/`arena`,
DROP the old `solve`/`event`), make the dubstep victory a real audible drop reusable by the win sting (un-ducked sfx bus),
and extend the `golden-synth` distinctness gate to all 12. Full DoD: `BACKLOG.md` T141/T139. **B-owned only**
(`synth.js` + new research doc + tests/goldens + `BUILDER-LOG-FX.md`); never touch existing Halves files;
never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
