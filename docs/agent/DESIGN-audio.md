# Design — Generative 8-bit audio (music + SFX)

All audio is **synthesised at runtime with the Web Audio API — no audio files**
(same ethos as the procedural pixel icons). A new `sound.js` exposes
`window.Sound`. Keep it small and CPU-light.

## Core (shared)

- **One `AudioContext`**, created/resumed on the **first user gesture** (browsers
  block audio until then — resume it in the Start button / first tap handler).
- **Master gain** + a **mute toggle** persisted in `localStorage` (`halves.sound`,
  default ON). A small speaker 🔊/🔇 button on the start screen (and reachable in
  game) toggles it; honour it everywhere.
- Stop the music scheduler when muted or the tab is hidden
  (`visibilitychange`) to save CPU/battery.
- Everything is **fire-and-forget and non-blocking** — audio never affects the
  game clock, input, or timing.

## SFX (task T16)

Short procedural blips (oscillator + gain envelope, <300 ms; layered/arpeggiated
for richer ones). Wire to these events (extend as needed):

| Event | Feel |
|---|---|
| correct answer (auto-advance) | bright rising blip; **pitch rises with the combo streak** |
| skip | soft descending buzz |
| item unlocked (Beat/Spark/etc.) | sparkle arpeggio, **scaled by rarity** (rarer → more/higher notes) |
| gold received | coin "ping" (two quick notes); fuller chime for big amounts |
| topic unlocked / Part-2 unlocked | short fanfare |
| mastery earned | bigger fanfare |
| topic 100% | triumphant flourish |
| enemy tier WIN | victory jingle · enemy tier LOSS | sad descending |
| round start / round complete | small stinger |
| (optional) key tap | very subtle tick |

Trigger from the existing hooks (`correct()`, `skip()`, `showToast`,
`showTopicToast`, gold earn, finish, future Arena resolve). Respect mute.

## Generative music (task T17)

A small **chiptune sequencer**: a look-ahead scheduler (≈25 ms timer scheduling
notes ≈100 ms ahead — the standard Web Audio pattern for tight timing) driving a
few channels: **lead** (square/pulse), **bass** (triangle/square), **arp**
(pulse), and **percussion** (short noise/!square bursts). Loops indefinitely.

**Generative, not fixed:** notes are chosen by a seeded PRNG **within the style's
scale/patterns**, so each session varies but stays in-style.

### 12 styles + a menu style

A `style` = `{ name, waveform(s), bpm, scaleIntervals, root, arpPattern,
bassPattern, drumPattern, density }`. Provide **12 topic styles** and a separate
**menu style** (13 total). Suggested flavours (builder sets the params):

1. Dungeon Crawl (minor, slow) 2. Sky Castle (bright major, fast arps)
3. Pixel Forest (pentatonic, mid) 4. Neon Arcade (upbeat pulse)
5. Frost Cavern (eerie, slow triangle) 6. Lava Run (driving, fast)
7. Bubble Pop (playful staccato) 8. Mecha March (martial, steady drums)
9. Starlight (ambient, sparse) 10. Goblin Market (quirky, syncopated)
11. Clockwork (precise arpeggios) 12. Victory Hall (triumphant major)
— **Menu:** Title Theme (calm, inviting).

**Assignment:** each topic maps to one of the 12 styles — prefer an explicit
`music` field on the mode (thematic), with a deterministic fallback (style =
hash(mode.id) % 12) so new topics always have one. The **menu/start, best-times,
inventory, heroes** screens use the menu style. Music switches when the active
screen/topic changes; cross-cut cleanly (quick fade or immediate swap on loop
boundary). The Arena may reuse the active topic style or a tense variant — fine
to decide in the Arena task.

## Non-negotiables

- No audio files; all synthesised. Mute persists and is respected globally.
- Must not autoplay before a user gesture; resume the context on first tap.
- Non-blocking; no impact on game timing/input. Low CPU (stop when muted/hidden).
- Node-test the **pure** bits (style table completeness = 12 + menu; the
  note/scale helpers; SFX spec builders) without a real AudioContext (inject/stub
  the context as `fx.js` does for the DOM).
