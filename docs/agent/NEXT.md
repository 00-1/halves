# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T153` (home backdrop → PURPLE — owner just flagged) → `T152[A]` (celebration point-emission) → roadmap (`T89`/`T90` Arena 3v3 → content → `T72`)**
**⚠ You've been IDLE ~8h** (last push `ba5fd26` T102 was 8h ago; you finished the PWA work and never picked
up `T152[A]`). Resume here. **`T153` FIRST — owner: keep the main/home backdrop FIXED PURPLE, NOT event-
based.** Today it went blue because `homeFxState` (main.js:221) makes the backdrop wear today's EVENT colour
(`paletteFor(ev.rarity)`; `rare`=blue, `epic`=purple). **Make `homeFxState()` ALWAYS pass a fixed brand-purple
palette** (epic family on `#0E1116`) — **drop the event-rarity palette from the home backdrop entirely** (no
`ev.rarity` read for the backdrop). [A]-only (homeFxState always supplies the palette → fxgl default never
kicks in). Optional progress→brightness within purple; hue is fixed purple. Browser-verify purple in
rare/no-event/epic states. *(BACKLOG T153.)* **Then `T152[A]`** — fire each
`fxCelebrate*` from the **source element's normalized centre** (`el.getBoundingClientRect()` → `/innerWidth,
/innerHeight`) with the engine's new **`sizePx`** (small/fine) + **`spread`** + the existing palette: inventory
item→the reward **toast** (rarity palette), run complete→the **rank badge** (rank colour), mastery→the
**topic node** (topic colour), arena win→the **enemy portrait** (gold+hero). See BACKLOG T152 table.
Browser-verify each fires from its source (centroid near the element, not screen-centre) + is small. **Then**
→ `T89`/`T90` (Arena 3v3 — gameplay, no owner creds needed) → content `T58`–`T61` → `T72`. *(`T103` TWA/
Play-Store + `T72` submission need owner credentials — hold those till the owner's back.)*

**Builder B → STAND BY (engine reactive-only).** All B work landed + verified: `T151` audio divergence FIXED
(`44ea919`, re-measured bounded), `T150` browser render+audio gates DONE, `T152[B]` small/off-centre particle
option DONE (`a2f9475`, browser-verified). Nothing queued. Hold until A's `T152[A]` wiring or a roadmap task
surfaces a real **engine** need — I'll file it and point this line at it. **B-owned only**; never touch
existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
