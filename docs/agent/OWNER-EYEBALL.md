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

*Babysitter appends here whenever a step's correctness bottoms out at "needs a human/phone/ears."*
