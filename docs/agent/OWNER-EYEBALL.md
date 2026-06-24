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
- [ ] **Audio by-ear — SFX + MUSIC (phase 4, ready now; perceptual half).** Note schedules are vector-proven; the
      *timbres* need your ear. Export WAVs and A/B vs web-GG:
      - SFX: `cargo run -p goblin-gold --bin sfx_proto -- <dir>` → `gg-sfx-*.wav` (correct/skip/item/gold/topicUnlock/
        mastery/topic100/roundStart/roundComplete).
      - Music: `cargo run -p goblin-gold --bin music_proto -- <dir> [secs]` → `gg-music-*.wav` (12 scenes).
      The music renderer is a deliberate **first cut** (right tune/groove/key; exact patch FM/unison/filter/wub-LFO
      timbres come in a refinement pass) — so flag *which scenes/voices* feel off to steer that pass. (On-device
      playback wiring lands separately — until then this is the WAV-export A/B.)

- [ ] **Audio ON-DEVICE feel (playback wiring shipped `f838fa9`, built-blind via cpal/AAudio).** Now it actually
      sounds in the live APK: do the **SFX blips land on the right beats** (combo chime rises with the solve streak,
      resets after a skip)? Is the **menu/arena music bed pleasant under play and at the right level** vs the SFX?
      Crash-safe (no device → silent), so worst case it's quiet, not broken. Flag levels/timbres to refine.
- [x] **Keypad/drill/FX feel** — owner confirmed "looks good" (2026-06-23) from B's mini-gate #2/#3 shots.
- [x] **Font legibility** — owner confirmed "all very readable, 3rd sample best" (mini-gate #1).

- [ ] **Brickmap APK re-check after the 2 parity fixes (`39ecb7c`)** — install the fresh `dev.brickmap.goblingold`
      and confirm: (a) **solver auto-accepts** the instant you type the right answer (no Enter; bottom bar = Skip),
      and (b) **status + nav bars are hidden** (immersive — built blind over JNI, so this one genuinely needs your
      eyes; it's crash-safe so worst case the bars just stay, no crash).

- [x] **Metagame on-device (Collection screen, 2026-06-24)** — owner played it. Skip parity ✅. Collection summary +
      Collector Ladder drill-down present. Found 4 gaps (routed to B / taken over): no results screen, drill-downs too
      shallow ("nothing clickable"), system bars still overlaid, "Gold 0". Re-check after B's next APK.

- [ ] **NEXT brickmap APK — confirm the 2026-06-24 gap fixes (all in code + test-gated; APK build → device check):**
      (a) **results screen** at end of a run (rank + awards + time + gold), (b) **build-SHA watermark** in a corner on
      every screen (use it to tell me which build a screenshot is from), (c) ⭐ **system bars finally hidden** — this is
      the one that genuinely needs your eyes: B's immersive fix is built blind over JNI on the UI thread; crash-safe so
      worst case the bars just stay, (d) **Heroes/Events/Topics/Items** drill-downs now clickable (like the Ladder),
      (e) **gold accrues** (not stuck at 0), is correct after a mid-run skip (combo resets), and persists across relaunch.

*Babysitter appends here whenever a step's correctness bottoms out at "needs a human/phone/ears."*

- [ ] **Topic grid at full/high unlock (phase 5, `80a696c`).** Once many topics are unlocked the select screen goes to
      a 2-column grid with smaller rows (every topic is on-screen + tappable — gated). Eyeball whether the dense
      46-topic case feels **cramped**; if so, say the word and B adds a **scrollable** list (deferred as input-plumbing,
      not a polish tweak).
