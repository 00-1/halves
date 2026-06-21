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
**`T144`+`T145`** (small home-screen pill tweaks: move the `.readouts` gold/momentum pill to the TOP of
`#start` keeping its backing; AND **drop the `.build` dev-stamp's pill** — owner accepts it low-contrast —
exempting only `.build` from the contrast gate, keeping `.readouts`/`res-label` protected) →
**`T140`** (extend the music picker to ALL 12 styles B builds + per-screen routing solve→calm/arena→arena/
menu→menu/event→festive + the dubstep victory fires on a win; depends on T139) → **`T124`** (fraction glyphs)
→ `T101` → `T102`/`T103` (Android) → content → `T72`.

**Builder B → `T138` (celebration invisible — DIAGNOSED: particles too small) → `T139` (FINISH the 12 styles — PALETTE APPROVED)**
**⚠ `T138` FIRST — now a precise, quick fix.** Owner gave the tester readout: **`1038×2305`** (ready,
full-size — Poco X3 viewport × dpr≈2.75). So NOT resize/occlusion. The fns fire (buttons restart the music)
and `renderFrame` draws, but **particles are too small for that backing buffer**: `seedCelebrate`
(`fxgl.js:276`) sizes `lerp(4,szMax)` = 4–8 **device px**, drawn as `fillRect` into the 1038×2305 buffer
which the browser **downscales ~2.75× → ~1.5–3 screen px** = drawn (count-golden passes) but invisible. **Fix
(fxgl.js CPU/2D backend):** scale the draw `size` up for the CPU path (× effective DPR, or as a fraction of
`min(w,h)`) so motes are **boldly visible** (owner wants "loads of particles"); keep cap/seed/reduced-motion/
`setQuality`; sanity-check bright palette + alpha. **Add a REAL visibility golden** (asserts in-bounds drawn
particles with on-screen size ≥ a real threshold, e.g. ≥0.4% of canvas height, + alpha>0 — NOT a fillRect
count, the gap that hid this thrice). **Then `T139` — PALETTE APPROVED** (`T139 pt1` engine additions DONE
`051b25d`): finish the 12 from `research-music-styles.md` §2 (keep `menu`/`arena`, DROP old `solve`/`event`;
10 new incl. **Dubstep Victory** — its real DROP on the un-ducked SFX bus is the win sting); extend
`golden-synth` distinctness to all 12; **hand A the names/labels** in the log for T140. Full DoD `BACKLOG.md`
T138/T139. **B-owned only**; never touch existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
