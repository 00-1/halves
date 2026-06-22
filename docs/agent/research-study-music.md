# Research — music for low-stress timed drills (the Lo-Fi Study context)

> Babysitter research pass (2026-06-22), commissioned because the owner found the `lofi`
> context "dark and a little stressful" and asked for **evidence, not blind nudges**
> (T183 only tweaked pitch/reverb and left the mode minor). This doc is the brief
> Builder B implements against in **T190**. Goal: a track that genuinely *lowers* arousal/
> stress and supports timed mental-maths drilling, not just "less bass."

## What the evidence says (and why)

**1. Tempo: slow + steady, ~70–85 BPM (near resting heart rate).**
Relaxing excerpts cluster around 60–80 BPM; lo-fi hip-hop sits at **70–90 BPM** (close to a
resting heart rate), and a slow, steady rhythm measurably **lowers heart rate / blood
pressure** by entraining body rhythms. Too fast → arousal/anxiety; too slow → drowsy.
→ **Keep `lofi` tempo ~78** (current). It's already right; don't speed it up.

**2. Mode/tonality: MAJOR, not minor. ← the actual fix.**
Major-mode music produces **lower salivary cortisol** than minor-mode music; minor reads as
"sad, complex, dissonant," major as "happy, predictable." The current `lofi` is **`dorian`
(a minor mode)** — that *is* the "dark." This is the single highest-impact lever.
→ **Move off `dorian` to a major-family mode** — **Ionian (major)** = warm + safe;
**Mixolydian** = warm-major with a little soul (lowered 7th, still bright); Lydian = dreamy
but can feel "floaty." Recommend **Ionian or Mixolydian** for lo-fi warmth without darkness.

**3. Consonance + resolve home. Dissonance ≡ tension ≡ stress.**
"Dissonance and consonance are often considered equivalent to tension and relaxation."
The current progression `[0, 5, 3, 4]` **ends on degree 4 (subdominant)** — it never
resolves to the tonic, so the loop sits on perpetual mild tension (the "stressful" feeling).
→ **Use a consonant progression that resolves to the tonic (0).** Classic calm/lo-fi loops:
`I–vi–IV–V` then back to I, `I–IV–V–I`, or a gentle `ii–V–I`. Lo-fi warmth comes from
**maj7 / min7 extensions**, not from minor tonality — keep chords lush but consonant.

**4. Predictability / low information. Repetitive = the brain tunes it out.**
Lo-fi works by being **extremely predictable** — a looping, repetitive structure minimises
"orienting responses" so the brain can ignore it while still getting the mood lift. A
**busy, varied lead is an orienting trigger** → it pulls attention and adds stress.
→ **Make the lead sparse, simple, repetitive** (lower note density / `leadK`); no busy runs.
Predictable > interesting for a study loop.

**5. Timbre: warm + muffled, soft transients. Roll off the harsh highs.**
Lo-fi's signature warmth = a **low-pass filter rolling off highs (~3 kHz)**, **soft attacks
/ no harsh transients**, gentle tape/vinyl saturation. Harsh highs + hard transients are
exactly what reads as "crispy/edgy/stressful."
→ **Low-pass the lead/pad, soften every voice's attack + release** (also kills clicks — see
T191), keep pads round and warm. This is what makes it *cozy* rather than *bright-sharp*.

**6. Instrumental, no lyrics.** (Already satisfied — the synth has no vocals. Keep it that way.)

## Net recipe for `lofi` (synth.js) — B's call, but grounded in the above
- **Mode:** `ionian` (major) or `mixolydian` — **not** `dorian`. *(biggest lever)*
- **Progression:** consonant + **resolves to 0**, e.g. `[0, 5, 3, 4]` → something like
  `[0, 5, 3, 4]` reframed in major *and ending home*, or `I–vi–IV–V`/`I–IV–V–I`; use
  maj7/min7 colour for warmth.
- **Tempo:** keep ~78 (slow, steady). **Density:** keep sparse (~0.20–0.26).
- **Lead:** simpler + sparser (lower `leadK` / softer octave), **soft attack**, **low-passed**;
  it should *murmur*, not *ping*.
- **Pads:** warm, round, rolled-off highs. **Swing/grit:** keep a touch so it still reads lo-fi.
- **Keep it distinct** from `ambient` (slower/dreamier) and `tropical` (mixolydian pluck) — the
  distinctness gate must still pass.

## Success test
The owner device-confirms the Lo-Fi Study track now feels **warm, calm, cozy, unstressful**
(major, resolves home, soft/muffled) — and it's still recognisably lo-fi, not generic ambient.

## Sources
- [Background music varying in tempo and emotional valence — *J. Cultural Cognitive Science* (2024)](https://link.springer.com/article/10.1007/s41809-024-00144-8)
- [Background Music and Cognitive Task Performance: a systematic review — *Music & Science* (2022)](https://journals.sagepub.com/doi/10.1177/20592043221134392)
- [Mood/arousal in background music during sustained attention — PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11045806/)
- [Why Lo-fi Music Helps You Study: the neuroscience — Softly](https://softly.cc/blog/why-lofi-music-helps-you-study/)
- [Lo-Fi Music for Focus — *Psychology Today* (2025)](https://www.psychologytoday.com/us/blog/empowered-with-adhd/202502/lo-fi-music-for-focus-just-a-trend-or-a-game-changer)
- [The Science of Using Music to Relieve Stress — Ask The Scientists](https://askthescientists.com/music-stress-mood/)
- [Listening to music as a stress-management tool — PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9480195/)
- [Consonance and dissonance — Wikipedia (tension≡dissonance, relaxation≡consonance)](https://en.wikipedia.org/wiki/Consonance_and_dissonance)
- [Making lo-fi hip hop beats — Native Instruments (low-pass ~3kHz, soft transients, tape warmth)](https://blog.native-instruments.com/lo-fi-hip-hop-beats/)
