# OWNER — eyeball on return (device / aesthetic / by-ear checks the Babysitter can't do)

> Per the 2026-06-23 autonomy grant: the Babysitter drives ungated, gating on tests/goldens/code-review.
> These are the checks that genuinely need a phone, eyes, or ears — **queued, NOT blocking.** Tick when done.

- [x] **Brickmap spike APK — on-phone confirm (2026-06-24): boots + runs the drill, "looks good".** Found 2 parity
      bugs (now routed to B): solver needs auto-accept (no Enter-to-submit), and the app isn't immersive (system bars
      overlaid). Re-confirm after B's parity fixes + once the metagame is in.
- [ ] **Capacitor `.exp` wrapper test** (the TWA-fragility stopgap). Set the 4 repo secrets (throwaway
      keystore, see `capacitor/README.md`) → **Actions → "Capacitor Android (experiment)" → Run workflow**
      → install `goblin-gold-cap-android` → confirm **no "Open with"/address bar, notch filled** vs the TWA.
- [ ] **TWA notch (`T228`)** — when you want it: rebuild the `.aab` in PWABuilder with **Display mode =
      "Fullscreen sticky"** (+ cutout), verify edge-to-edge on-device; then the Babysitter does the web
      `isTWA()` JS-fullscreen suppression (kills the "went full screen" toast without losing the notch fill).
- [ ] **Audio by-ear** — once the brickmap port re-authors GG's music/SFX onto the Rust `Drone` synth
      (port phase 4), it's *perceptual* parity (not vector-provable) → A/B it against web GG by ear.
- [x] **Keypad/drill/FX feel** — owner confirmed "looks good" (2026-06-23) from B's mini-gate #2/#3 shots.
- [x] **Font legibility** — owner confirmed "all very readable, 3rd sample best" (mini-gate #1).

- [ ] **Brickmap APK re-check after the 2 parity fixes (`39ecb7c`)** — install the fresh `dev.brickmap.goblingold`
      and confirm: (a) **solver auto-accepts** the instant you type the right answer (no Enter; bottom bar = Skip),
      and (b) **status + nav bars are hidden** (immersive — built blind over JNI, so this one genuinely needs your
      eyes; it's crash-safe so worst case the bars just stay, no crash).

- [x] **Metagame on-device (Collection screen, 2026-06-24)** — owner played it. Skip parity ✅. Collection summary +
      Collector Ladder drill-down present. Found 4 gaps (routed to B / taken over): no results screen, drill-downs too
      shallow ("nothing clickable"), system bars still overlaid, "Gold 0". Re-check after B's next APK.

- [ ] **NEXT brickmap APK — confirm the 2026-06-24 gap fixes:** (a) a **results screen** appears at end of a run
      (rank + awards earned + time + gold), (b) the **build-SHA watermark** shows in a corner on every screen,
      (c) **system bars are finally hidden** (B's UI-thread immersive fix — still device-only, crash-safe),
      (d) **Heroes/Events/Topics/Items** drill-downs are now clickable like the Collector Ladder, (e) **gold accrues**
      (no longer stuck at 0) and persists across relaunch.

*Babysitter appends here whenever a step's correctness bottoms out at "needs a human/phone/ears."*
