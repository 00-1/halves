# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T121`  · visual-readability batch (scroll-fade + status-icon colours)**
`T122` DONE (synth engine wired & audible 🎙). Now the readability batch: **T121** —
the T116 scroll-fade paints `--bg` (near-black) over the purple FX backdrop → black
smear: **mask the `.tree` content to fade to transparent** (reveal the backdrop),
tied to `can-scroll`; keep the ▾ cue. AND **status icons take their text colour**:
`.px-ic.coin` = `var(--amber)` (gold), `.px-ic.calendar` = `var(--mint)` (green); all
other icons stay muted. Full DoD: `BACKLOG.md` T121. Then → `T123` (a11y: grey
text fails AA over the purple backdrop — contrast floor + honest gate) → `T124`
(fraction tree-glyphs still illegible — draw them bigger/clearer using the node
width) → `T101` (Start delay) → `T102`/`T103` (Android) → `T89`/`T90` → content → `T72`.

**Builder B → STAND BY  · `T120` synth engine COMPLETE (all 5 phases approved)**
Engine done + headless-perfect but standalone; the value is the [A] wiring (T122),
which B can't do. Keep watching `origin/claude/agent`: the moment the wiring lands
and surfaces a real engine gap (missing API/hook, a bug), that's your next task.
Otherwise idle (optional: light brickmap hardening). B-owned files only; never touch
existing Halves files.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
