# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T124` (fraction glyphs) → then the roadmap (`T101` → Android → Arena 3v3 → content → `T72`)**
The whole audio/FX/menu block is cleared and **browser-verified**: celebration renders (T149 — `#fxBurst` was
trapped in a `display:none` modal; moved to top-level, proven 0×0→393×852, 19.6% coverage), 12-style picker
(T140), home declutter (T146), FX tester→Graphics (T147), SFX range (T148), backdrop (T142), nav-trap (T143).
**`T124`** — fraction tree-glyphs bigger/clearer using node width (owner-flagged illegible). Then → `T101`
(Start delay) → `T102`/`T103` (Android) → `T89`/`T90` → content → `T72`. *(All recent A pushes APPROVED.)*
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

**Builder B → `T151` (synth output DIVERGES — the real "audio sounds bad") → `T150` (browser-render harness)**
**⚠ `T151` FIRST — Babysitter BROWSER-MEASURED it** (AnalyserNode on `Synth.output()`): the master output
grows **exponentially in EVERY context, no switch needed** — `menu` peaks `0.36→1.93→7.42→33.6→159` over 3 s
(~×4.5 / 0.33 s; switching diverges *less* → the switch is NOT the cause). The limiter then clamps a 30–160×
signal → escalating distortion = the owner's "sounds bad." **Fix the feedback instability in `synth.js`**
(suspects: FDN reverb spectral radius ≥ 1 via damping/summing; a reverb send→return LOOP into a bus; or
voice/gain accumulation — one context over ~5 s must SETTLE to a bounded tail). **Add a peak-BOUND gate**
(offline render / `AnalyserNode`: peak ≤ ~2 over ≥5 s; must FAIL on today's build). **Then `T150`** — the
Playwright browser-render harness (loads app @ dpr 2.75, fires the real celebration, asserts
`#fxBurst.clientWidth>0` + lit coverage — would've caught T149; guarded so Node-only CI still passes; in-env:
global `playwright` at `/opt/node22/lib/node_modules/playwright` + Chromium at `/opt/pw-browsers`). Full DoD:
`BACKLOG.md` T151/T150. **B-owned only** (new `test/browser/…` + `synth.js`/`fxgl.js` tests); never touch
existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
