# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T122`  · WIRE `synth.js` into the app (make the new audio audible — the payoff)**
`T117` DONE. The B-built `synth.js` engine is COMPLETE; now wire it. Mount `Synth`
on `sound.js`'s **existing** AudioContext/master/limiter (`Synth.mount({ctx,dest})`;
register `synth.test.js` as a CI gate). Make **Synth the MUSIC** and **retire the
old `sound.js` music scheduler** (ONE scheduler; keep `sfx()`). Route screens to
contexts (`#game`→solve **calm**, home→menu, `#arena`→arena +`intensity()` from
boss-proximity, event→event); start-on-enter/stop-on-leave. Fire the **wub** once on
a real win; **duck** music under SFX; the T113 **volume/tempo sliders + mute** drive
the combined output. Full DoD: `BACKLOG.md` T122. Then the visual-readability batch →
`T121` (scroll-fade reveal **+ coin gold + calendar green**) → `T123` (a11y: grey
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
