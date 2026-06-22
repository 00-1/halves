# Research — music for focus / test conditions, and the `lofi` revision · T183

Owner (2026-06-22): *"audio switching sounds very good now. My only comment: the Lo-Fi
Study sounds a bit dark/bassy. Can we do a research pass on what's nice to listen to
while studying — or being tested?"* — for a ~10-year-old under timed pressure. This is a
short pass (like `research-music-styles.md`) + the concrete `synth.js` `CONTEXTS.lofi`
revision it recommends.

## What the evidence + the genre say (focus / test-condition music)
Consistent findings across study-music research and the lo-fi-study genre itself:
- **Lyric-free / non-verbal.** Words compete with reading + inner speech under test load.
  (We're already instrumental — good.)
- **Moderate, steady tempo (~70–90 BPM).** Near a calm heart rate; fast = anxious, very
  slow (≤60) = sleepy/dragging. ~75–85 is the lo-fi sweet spot. (We were 76.)
- **Low dynamic range, soft transients.** No sudden loud hits — predictable + bounded
  loudness keeps it non-distracting (the T175 stability work already guarantees this).
- **Warm but BRIGHT, not dark/bassy.** The lo-fi-study sound is mellow **Rhodes/EP** + soft
  keys voiced **mid/upper register**, gentle hats, light kick — *warm*, not heavy. A dark,
  bass-forward mix reads as brooding/tense, the opposite of study-calm. **Brightness comes
  from REGISTER + a clear low end, not from a brighter (anxious) tempo or key.**
- **Consonant, gently repetitive harmony.** Predictable loops = safe + non-distracting.
  Dorian (minor-jazzy) is the authentic lo-fi colour and is fine — the fix is *register +
  low-end weight*, not abandoning the mode.
- **Sparse texture.** Few simultaneous voices; space between notes. (We're density 0.24 —
  good.)

Net: the owner's "dark/bassy" is a **register + low-end-weight + wash** problem, not a
genre problem. Lift the whole bed up, lighten the lows, and clear the reverb wash —
keeping the calm tempo, sparse texture, dorian colour, and Rhodes bed.

## The `lofi` revision (shipped in this task)
| lever | before | after | why |
|---|---|---|---|
| `root` | 50 (D3) | **55 (G3)** | +5 semitones lifts the WHOLE bed (pad/bass/lead) out of the dark/bassy register — the single biggest fix |
| `leadOct` | 1 | **2** | the pluck melody sings in a brighter, clearer octave (warmth without anxiety) |
| `reverb` (wet send) | 0.42 | **0.32** | 0.42 was a washy low-mid haze reading as "dark"; 0.32 keeps the mellow space but clears it |
| `tempo` | 76 | **78** | still a calm study tempo, a touch less sluggish |
| kept | dorian · density 0.24 · swing 0.2 · `padep` (Rhodes) bed · `pluck` lead · light kit | — | the authentic lo-fi-study identity — the fix is register/weight, not the genre |

`padep` (the FM Rhodes bed) is exactly the study-friendly timbre; at the higher root it
reads brighter automatically. The bass stays the round `bass` patch but rises 5 semitones
with the root, so the low end is lighter without losing the groove.

## The other "calm" contexts (already study-friendly — no change)
- **`menu`** (Neon Lobby): ionian, root 60, `padglass` (airy) — already bright/warm.
- **`ambient`** (Ambient Drift): lydian (the brightest mode), root 55, `padglass`, very
  sparse — already light + spacious.
- `solve` is an alias of `lofi`, so the in-game solve screen inherits this brighter bed
  directly (the test-condition music the owner asked about).

## Invariants held
- **Distinctness:** `lofi` stays mutually distinct from the other 11 (the distinctness +
  ≥5-modes + ≥10-tempos gates pass; `golden-synth` re-blessed for the intended note-score
  change).
- **Stability (T175):** `lofi` uses `padep` with the FDN decay capped at 0.66 + the
  reverb-return safety compressor; the *lower* 0.32 send makes it even less prone to
  buildup. No foghorn. (Babysitter re-measures; owner ears the brightness.)
