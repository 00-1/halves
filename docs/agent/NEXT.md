# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T143` (Audio gets its own SCROLLABLE menu + separate Music/SFX volumes — fixes the nav trap) → `T144` (gold/momentum pill to TOP) → `T140` (12-style picker, after B's T139) → `T124` (fractions)**
*(`T142` backdrop DONE `42aac3b`; `T137` tester DONE; `T123` a11y DONE.)* **⚠ `T143` FIRST — the owner is
TRAPPED in Settings: "config menu goes off the bottom, can't scroll, can't go back."** (1) **Make Settings +
the new Audio menu `overflow-y:auto`** within the safe-area height so **Back is always reachable** (priority).
(2) **The home Sound button OPENS a dedicated Audio menu** (instead of toggling) — move the **mute toggle
INSIDE** it, plus the music picker, tempo, the celebration tester, and (3) **separate Music + SFX volume
sliders** ("sounds are getting lost" under the music — Music gain on the `Synth.output()` path you wire; SFX
gain in `sound.js`; replace the single T135 master; SFX default louder relative to music; migrate old
`halves.vol`; mute silences both). (4) **Fix the celebration tester restarting music** — `fireCelebrationTest`
must unlock audio WITHOUT `musicForScreen` (which re-routes/restarts it). Full DoD `BACKLOG.md` T143. Then →
**`T144`** (move the `.readouts` gold/momentum pill to the TOP of `#start`, keep its T142 pill backing) →
**`T140`** (extend the music picker to ALL 12 styles B builds + per-screen routing solve→calm/arena→arena/
menu→menu/event→festive + the dubstep victory fires on a win; depends on T139) → **`T124`** (fraction glyphs)
→ `T101` → `T102`/`T103` (Android) → content → `T72`.

**Builder B → `T139` (FINISH the 12 styles — PALETTE APPROVED) → `T138` (celebration STILL invisible — engine fix)**
*(`T139 pt1` engine additions DONE `051b25d`.)* **`T139` — PALETTE APPROVED** (owner: "move ahead with those
music styles, add them to the song picker"): finish building the 12 from `docs/research-music-styles.md` §2
(keep `menu`/`arena`, DROP old `solve`/`event`; the 10 new incl. **Dubstep Victory** — its real audible DROP
on the un-ducked SFX bus is the win sting); extend `golden-synth` distinctness to all 12 (regen intentional);
**hand A the final names/labels** in the log for T140. **Then `T138` — celebration STILL invisible.** Owner
live: "the celebration picker… none of them work. they do restart the music though" — the restart proves the
handlers FIRE yet nothing renders → T137's occlusion fix wasn't the (whole) cause; it's the `{backend:"2d"}`
engine render path. Investigate: 2D canvas **0/1-sized** (→ `dimensions()` `0×0`, may bounce to [A] resize);
**RAF never pumps** for a 2D controller; particles draw **invisibly** (transparent alpha / sub-pixel `size` at
this DPR / off-canvas); or wrong context presented. **Add a REAL visibility check** (golden asserting in-bounds
alpha>0 ≥1px coverage — NOT a fillRect count). **Wait for the owner's `dimensions()` readout** (visible once
A's T143 makes Settings scrollable) before assuming engine-side. Full DoD `BACKLOG.md` T139/T138. **B-owned
only**; never touch existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
