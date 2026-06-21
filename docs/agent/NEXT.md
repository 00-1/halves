# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T146` (declutter home: drop Sound icon + move Exit into Setup) → `T148` (SFX volume range — quick, high-value) → `T147` (FX tester → a Graphics section) → `T140` (12-style picker — UNBLOCKED) → `T124` (fractions)**
**`T148` — owner: "sound fx volume doesn't go high enough."** Diagnosed: NOT the SFX engine — the slider
maps `slider/100` → max **0.10 gain**, but `sound.js`'s `sfxBus` accepts up to **`SFX_MAX=1.0`** (10× more
headroom; current peak ≈ −36 dB). **Fix:** map the SFX slider to 0→1.0× (not /100), louder default
(~0.5–0.8×), migrate stored `halves.sfxVol`, update the readout; music vol + mute unaffected; limiter keeps
it clip-safe. Full DoD `BACKLOG.md` T148. *(No need to move SFX into the synth engine — just open the range.)*
*(`T143` scrollable Audio menu + separate Music/SFX vols DONE `59e2c28`; `T144` gold pill to top + `T145`
drop build pill DONE `daa64f5`.)* Owner (live, after using the new Audio menu): **(T146)** "sound is now a
sub-menu — get rid of the Sound icon from the main screen; also get rid of the Exit button and add it to
Setup" → remove home `#soundBtnMenu` + the home Exit, make the Audio menu reachable FROM Setup, put an Exit
action in Setup, re-balance the home nav row. **(T147)** "the fx test is in the sound menu which seems wrong
— should be in a graphics section" → move the celebration tester out of `#audio` into a **Graphics** section/
sub-menu. **Then `T140`** (now unblocked — B's 12 styles are built `efef4b4`): list all 12 in the music picker
+ per-screen routing + dubstep victory fires on a win. Then → `T124` (fraction glyphs) → `T101` →
`T102`/`T103` (Android) → content → `T72`. **(Celebration render fix `8145505` is in HEAD — owner re-test.)**
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

**Builder B → STAND BY (engine reactive-only) — pending the owner's celebration RE-TEST.**
`T138` celebration fix DONE `8145505` (the **real cause = DPR downscale**: CPU 2D path now scales draw size by
`dpr×res` → constant ~6–18 SCREEN px; sizes bumped to 6–18; visibility gate guards on-screen size — ~24%
coverage, ~18px); `T139` 12-style palette DONE `efef4b4` (all 66 pairs distinct). Nothing queued. **If the
owner re-tests and it's STILL blank** (would be surprising now — 24% coverage), chase the render loop /
`canPresent` (RAF pump+present for the full burst? null 2D context?). Otherwise hold. **B-owned only**; never
touch existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
