# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T149` (THE celebration fix — move `#fxBurst` out of the display:none modal) → `T146` (declutter home) → `T148` (SFX volume range) → `T147` (FX tester → Graphics) → `T124` (fractions)**
**⚠ `T149` FIRST — ROOT CAUSE FOUND via a real headless-browser render (Playwright), after 6 engine rounds
missed it.** `<canvas id="fxBurst">` (index.html:321) is the last child of `#resetModal` (`<div class="modal
hidden">`) and `.modal.hidden{display:none}` → the celebration canvas is `display:none` (clientSize 0×0)
except while the "Clear all data?" modal is open. The engine renders perfectly (~20% coverage) into a canvas
the browser never shows. **Fix:** move that one `<canvas>` line OUT of `#resetModal` to **top level** (after
`#fxBackdrop` / body-level, like the working backdrop). **Browser-proven:** 0×0 in the modal → 393×852 at
body, 19.6% celebration coverage at dpr 2.75. (The engine T133/T138 work was all correct.) Then → `T146`
(drop Sound icon + Exit→Setup), `T148` (SFX 0→1.0× range), `T147` (FX tester→Graphics), `T124` (fractions).
*(`T140` 12-style picker landed `9e706f3` — Babysitter reviewing.)*
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

**Builder B → `T150` (autonomous BROWSER-RENDER harness — Playwright) — the process fix the owner asked for.**
*(`T139` 12-style palette DONE `efef4b4`; `T138` engine work was correct — the real celebration bug was
[A]-side markup, T149, found via a real browser.)* **T150:** build a B-owned headless-browser render gate
(new file; loads the app read-only) that, at a phone viewport @ **dpr 2.75**, loads the app, fails on any
console/page error, fires the **real celebration**, and asserts **`#fxBurst.clientWidth>0` + visible lit
coverage** (would have caught T149 instantly), checks the backdrop renders, and saves screenshots. **Confirmed
runnable in-env:** global `playwright` at `/opt/node22/lib/node_modules/playwright` + Chromium at
`/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`); serve via a local `http.server`. Make it an
**additional, browser-guarded gate** (skips cleanly with no browser so Node-only CI still passes); prove it by
re-nesting `#fxBurst` in the modal → the gate FAILS. Full DoD `BACKLOG.md` T150. **B-owned only** (new
`test/browser/…` files); never touch existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
