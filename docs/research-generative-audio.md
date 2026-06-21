# Generative audio for Halves — research, principles & a recommended engine

**Task:** T119 [B]. **Owner brief:** "the music is too simple and doesn't seem to be
progressing — do deep research into generative audio and apply some principles."
**Author:** Builder B (the FX-engine builder). **Status:** research + recommendation;
the build is a follow-up task the Babysitter sequences.

This is an *applied* survey: every technique below maps to concrete Web Audio API
nodes and ends in a concrete recommendation Halves can build to. It is grounded in
what we ship today (`sound.js`) and stays inside our hard constraints (pure WebAudio,
**no sample assets**, no-build, one scheduler, midrange-Android CPU budget,
Node-verifiable). References are listed at the end and cited inline as `[n]`.

---

## 0. Where we are, and why it sounds "simple"

`sound.js` today is, in synthesis terms, **one instrument played 18 ways**. Concretely:

- **Every voice is `Oscillator → Gain → master`** with the *same* envelope: a 6–8 ms
  exponential attack to peak, then an exponential decay to `0.0001`. No sustain, no
  filter, no per-instrument character. (`play()` / `musicVoice()`.)
- **Timbre varies only by waveform** (`square`/`triangle`/`sawtooth`/`sine`) and the
  note. A "Sky Castle" pad and a "Lava Run" lead are the *same oscillator*, just a
  different scale and BPM — so distinct configs still sound like the same chip.
- **No filter anywhere.** No lowpass, no resonance, no envelope/LFO modulation. Raw
  oscillators are buzzy and static; a filter is what turns "a sawtooth" into "a
  patch". (The T115 "wub" is the first filter use — and it's an SFX one-shot, not part
  of the instrument layer.)
- **Harmony is static.** A style fixes one `root` and one `scale`; the bass walks a
  hardcoded degree list and the "lead" picks a **uniformly random** scale degree
  (`stepVoices`: `Math.floor(rnd() * (scale.length+2))`). There is **no chord
  progression**, so nothing ever resolves or moves — the ear hears a loop with random
  sprinkles, which reads as "not progressing".
- **Variation is white noise, not structure.** Random degree per step has no melodic
  contour, no motif, no memory. Random ≠ interesting; it averages out to mush.
- **The mix is bone dry and mono.** No reverb, no stereo image, no bus structure, no
  ducking. Dry mono chip on a phone speaker is the single biggest "cheap" tell.

None of these are fixed by *more config* (T115 tuned scale/density/timbre per context
and it's still samey, exactly as the owner reports). They need **new synthesis,
harmony, variation, and space machinery**. That machinery is what follows.

---

## 1. Synthesis depth — from "an oscillator" to "a patch"

The Web Audio graph already gives us everything; we just aren't using the modulation
nodes. MDN's "Advanced techniques" is the canonical reference for envelopes, filters,
LFOs and FM in WebAudio `[2]`.

### 1.1 Real ADSR (gain automation)
An envelope maps a value over time onto an `AudioParam` — `GainNode.gain`,
`Oscillator.frequency`, or `BiquadFilter.frequency`/`.Q` `[2][6]`. The four stages:
Attack (→ peak), Decay (→ sustain), Sustain (held level while the note is on), Release
(→ 0). Today we have only a degenerate A→R. A real ADSR helper:

```js
// times in seconds, levels 0..1; call at note-on. `dur` = how long the key is "held".
function adsr(param, t0, dur, { a=0.01, d=0.08, s=0.6, r=0.2, peak=1 }) {
  const tHold = t0 + Math.max(a + d, dur);            // sustain until release
  param.cancelScheduledValues(t0);
  param.setValueAtTime(0.0001, t0);
  param.exponentialRampToValueAtTime(peak,        t0 + a);   // attack
  param.exponentialRampToValueAtTime(Math.max(peak*s, 1e-4), t0 + a + d);  // decay→sustain
  param.setValueAtTime(Math.max(peak*s, 1e-4), tHold);       // hold
  param.exponentialRampToValueAtTime(0.0001, tHold + r);     // release
  return tHold + r;                                  // when the voice is free
}
```

Exponential ramps for amplitude (the ear is logarithmic); `setTargetAtTime` is an even
cheaper one-pole alternative for organic curves. **Soft attacks (long `a`) = calm;
sharp attacks (1–3 ms) = percussive/energetic** — the same lever the owner wants for
calm-solve vs Arena (see §5).

### 1.2 Filters with envelope + LFO modulation (the core of "patchy" sound)
`BiquadFilterNode` gives `lowpass`/`highpass`/`bandpass`/`notch`/`peaking` with a
`frequency` and a resonance `Q` `[2][6]`. Two modulations turn a static filter into an
instrument:

- **Filter envelope** — a second ADSR on `filter.frequency` so the timbre *opens and
  closes* per note (the classic "pluck": bright transient, then darkening). This alone
  is the difference between "a saw" and "a synth pluck".
- **LFO** — a sub-audio `Oscillator` (0.1–8 Hz) through a `Gain` (the modulation depth)
  into `filter.frequency` (or `.Q`, or a `gain` for tremolo, or `oscillator.detune` for
  vibrato) `[2]`. A ~7 Hz LFO on a lowpass cutoff with high `Q` **is** the wub `[4]`:

```js
// A wobble-bass "wub": saw → resonant LP whose cutoff is swept by an LFO.
function wubVoice(ctx, dst, freq, t0, dur, { rate=7, lo=200, hi=1600, q=12 }) {
  const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq;
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.Q.value = q;
  f.frequency.value = lo;
  const lfo = ctx.createOscillator(); lfo.frequency.value = rate;     // wobble speed
  const lfoGain = ctx.createGain(); lfoGain.gain.value = (hi - lo)/2; // sweep depth (Hz)
  f.frequency.value = (hi + lo)/2;
  lfo.connect(lfoGain).connect(f.frequency);                          // LFO → cutoff
  const amp = ctx.createGain();
  o.connect(f).connect(amp).connect(dst);
  adsr(amp.gain, t0, dur, { a:0.005, d:0.05, s:0.8, r:0.1, peak:0.5 });
  o.start(t0); lfo.start(t0); o.stop(t0+dur+0.2); lfo.stop(t0+dur+0.2);
}
```

The Monotron-synth recipe (VCO saw → LFO → VCF lowpass) is the canonical worked example
`[2]`.

### 1.3 Detune / unison ("supersaw")
Stack 2–3 oscillators a few cents apart (`oscillator.detune` ±5–18 cents) and sum them.
The slow beating between them is what makes a pad sound *wide and analog* instead of
sterile. Cheap (2–3 extra oscillators per held note, and pads are sparse).

### 1.4 FM / AM (cheap metallic & bell timbres)
Frequency modulation = one oscillator's output (through a gain = "modulation index")
drives another's `frequency` `[2]`. Small integer carrier:modulator ratios give bells,
e-pianos, mallets — timbres **impossible** with our 4 raw waveforms, and only two
oscillators:

```js
function fmVoice(ctx, dst, carHz, t0, dur, { ratio=2, index=200 }) {
  const car = ctx.createOscillator(); car.frequency.value = carHz;
  const mod = ctx.createOscillator(); mod.frequency.value = carHz*ratio;
  const mg  = ctx.createGain(); mg.gain.value = index;       // modulation depth (Hz)
  mod.connect(mg).connect(car.frequency);
  const amp = ctx.createGain(); car.connect(amp).connect(dst);
  adsr(amp.gain, t0, dur, { a:0.002, d:0.3, s:0, r:0.1, peak:0.4 });  // bell: fast attack, long decay, no sustain
  car.start(t0); mod.start(t0); car.stop(t0+dur+0.3); mod.stop(t0+dur+0.3);
}
```

### 1.5 Additive
Sum harmonically related sines (or build a `PeriodicWave` via
`ctx.createPeriodicWave()` and feed it to one oscillator — the cheapest way to get a
rich, custom timbre with **one** oscillator). Good for organ/glass pads.

### 1.6 Noise-based percussion (a real drum kit, not 3 beeps)
Our drums are a 80 Hz sine (kick), a 5 kHz square (hat), a 1.6 kHz square (snare). Real
chip/electronic kits use **filtered noise**:

- **Noise source:** fill an `AudioBuffer` with `Math.random()*2-1`, play via
  `AudioBufferSourceNode` (one small buffer, reused).
- **Hat** = noise → highpass (~7 kHz) → very short AD (5–30 ms).
- **Snare** = noise → bandpass (~1.5–2 kHz) **+** a short tonal body, medium decay.
- **Kick** = sine with a **pitch envelope** (`frequency` ramped 120 Hz → 45 Hz over
  40 ms) → fast AD. (Pitch-drop is what makes a kick "thump" instead of "beep".)
- **Clap** = 3–4 noise bursts a few ms apart through a bandpass.

### 1.7 Waveshaping (saturation / warmth)
`WaveShaperNode` with a soft-clip curve adds harmonics — a touch of drive on the bass
bus makes it audible on a phone speaker without raising level. Use sparingly (and after
the limiter discussion in §6). Build the curve once (a `Float32Array` `tanh` table).

> **Takeaway:** the jump from "chip" to "instrument" is **filter + two envelopes
> (amp & filter) + one modulator**. That is the highest-value change in this whole doc
> after reverb (§6).

---

## 2. Patch / instrument design — contexts differ by *instrument*, not just notes

Today a context = (scale, bpm, density, waveform). That's why they're samey. Instead,
define a **patch**: a small declarative spec that the engine renders into a voice
sub-graph. Contexts then differ because they use **different instruments**.

```js
// A patch is data; the engine has a renderer per `engine` type (sub/fm/pluck/pad/...).
const PATCHES = {
  pad:   { engine:"unison", wave:"sawtooth", voices:3, detune:12,
           amp:{a:0.6,d:0.4,s:0.8,r:1.2}, filter:{type:"lowpass",cut:1200,env:0.3,q:2} },
  pluck: { engine:"mono",   wave:"triangle",
           amp:{a:0.002,d:0.18,s:0,r:0.12}, filter:{type:"lowpass",cut:3000,env:0.9,q:6} },
  bass:  { engine:"mono",   wave:"sawtooth",
           amp:{a:0.004,d:0.2,s:0.7,r:0.1},  filter:{type:"lowpass",cut:600,env:0.4,q:1} },
  bell:  { engine:"fm",     ratio:2, index:220, amp:{a:0.002,d:0.5,s:0,r:0.3} },
  lead:  { engine:"mono",   wave:"square",
           amp:{a:0.01,d:0.1,s:0.6,r:0.12}, filter:{type:"lowpass",cut:2200,env:0.5,q:3} },
  wub:   { engine:"sub",    wave:"sawtooth", lfo:{rate:7,depth:1}, filter:{q:12} },
  kit:   { engine:"noise",  pieces:["kick","snare","hat","clap"] },
};
```

A **context** (solve-topic / menu / Arena / event / victory) is then an *orchestration*:
which patches play which roles, in which register, at which density. "Sky Castle" =
`{ pad, pluck, soft-kit }`; "Hero's Arena" = `{ wub-bass, lead, driving-kit }`. Same
note-generation engine, **completely different sound** — which is exactly the variety
the owner is missing.

This is the same abstraction `fxgl.js` uses (a declarative scene → a renderer per
backend); it ports cleanly to audio (a declarative patch → a voice renderer per engine
type), and it's **pure + headless-testable** (assert the graph each patch builds).

---

## 3. Harmony & musicality — give it somewhere to go

Random notes over a static drone never "progress". Add three cheap layers of musical
structure:

### 3.1 Chord progressions (harmonic motion)
Pick a key + mode, then cycle a **progression** of scale-degree chords with a defined
**harmonic rhythm** (e.g. one chord per bar). Diatonic triads are just `[deg, deg+2,
deg+4]` in scale steps. Example calm progression in degrees: `I – vi – IV – V`
(`[0,5,3,4]`). The bass plays the chord **root** ("bass-follows-root"), the pad voices
the triad, the lead/arp draws from the **current chord tones** (not the whole scale) —
so consonance is automatic and the music *moves*.

### 3.2 Voice-leading (smoothness)
When the chord changes, move each pad voice to the **nearest** tone of the new chord
(minimize semitone motion) instead of jumping to root position every time. This is the
difference between "blocky" and "flowing" and is the specific thing random chord choice
destroys `[7]`. A minimal nearest-tone mapper:

```js
// map each previous voice to the closest pitch class in the new chord (octave-free)
function voiceLead(prevMidi, chordPCs, root) {
  return prevMidi.map(m => {
    let best = m, bestD = 99;
    for (const pc of chordPCs) {
      const cand = m + ((pc - (m%12) + 18) % 12) - 6;   // nearest within ±6 semitones
      if (Math.abs(cand - m) < bestD) { bestD = Math.abs(cand-m); best = cand; }
    }
    return best;
  });
}
```

### 3.3 Modes for mood (our calm/energetic rule, in pitch)
Modes share notes but shift the tonic to recolour the mood — a palette of moods within
one key `[5]`:

| Mode | Character | Use in Halves |
|---|---|---|
| **Lydian** (♯4) | bright, floating, wonder/magic `[5]` | event/wonder, "Starlight" |
| **Ionian (major)** | happy, stable | menu, easy topics |
| **Mixolydian** (♭7) | warm, folky, less "resolved" | playful topics |
| **Dorian** (minor, ♮6) | minor but hopeful `[5]` | calm-but-serious solve |
| **Aeolian (minor)** | sad/serious | hard topics |
| **Phrygian** (♭2) | dark, tense, "doom" `[5]` | Arena boss-proximity |
| **Pentatonic** | "can't sound wrong", sparse | calm solve safety net |

This is the audio twin of the T108 region palettes: **mood is data**, selected by
context, and it makes solve-music calm and Arena-music dark/driving *by construction*.

### 3.4 Harmonic rhythm
**How often the chord changes** is itself a calm/energetic lever: slow (1 chord / 2 bars)
= calm and spacious; fast (2 chords / bar) = busy and urgent (see §5).

---

## 4. Variation algorithms — structured, evolving, not random

The goal (owner's word): music that **progresses** and doesn't sound like an obvious
loop. Replace `Math.random()` note choice with structure-with-controlled-surprise.

### 4.1 Markov chains (melody & chord choice with memory)
A Markov chain is a weighted transition graph over states (here: scale degrees or
chords); the next note is drawn from the distribution conditioned on the current
note `[7]`. First-order alone "wanders" — use **2nd-order** (condition on the last two
notes) for melodic shape `[7]`. Seed the transition table per context (a "contour"
personality) and you get melodies that have *direction* but never repeat exactly.

```js
// 2nd-order step: weights keyed by `${a},${b}` → {nextDegree: weight}
function nextDegree(table, a, b, rnd) {
  const row = table[`${a},${b}`] || table.default;
  let r = rnd() * row.total, acc = 0;
  for (const [deg, w] of row.items) { acc += w; if (r < acc) return +deg; }
  return a;
}
```

### 4.2 Euclidean rhythms (organic, world-music grooves)
Toussaint's result: spreading `k` onsets as evenly as possible over `n` steps generates
most traditional world rhythms — E(3,8) = the Cuban *tresillo*, E(5,16) = bossa nova,
E(7,12) = a West-African bell pattern `[3]`. One tiny function replaces our hand-typed
drum arrays and gives **musically real** grooves, parameterised by a single density
knob (`k`):

```js
function euclid(k, n) {                 // → array of n 0/1 onsets, evenly spread
  const out = []; let bucket = 0;
  for (let i = 0; i < n; i++) { bucket += k; if (bucket >= n) { bucket -= n; out.push(1); } else out.push(0); }
  return out;
}
```

Rotating the pattern (a phase offset) gives variants of the same groove — instant fills
without new data. **Density = `k/n`** is the master "calm↔busy" control (§5).

### 4.3 Probability / density envelopes
Make density *evolve over the loop* — e.g. sparse at the top of an 8-bar phrase,
filling toward the end — so the music breathes and has a sense of arrival instead of a
flat 16-step loop. Drive it from a slow envelope or the phrase position.

### 4.4 Seeded determinism that evolves
Keep our seeded-RNG discipline (deterministic = testable) but **advance the seed per
phrase**, not per loop. Today we reseed every 16 steps with a time mix; instead, derive
each phrase's material from `hash(contextSeed, phraseIndex)` so a run is reproducible
*and* the 1st, 2nd, 3rd phrases differ (motif → variation → development) rather than
re-rolling the same loop.

### 4.5 Motif development
Generate a short 2–4 note **motif**, then across phrases apply musical transforms —
transpose (to the new chord), invert, retrograde, augment/diminish rhythm, ornament.
This is what makes generative music sound *composed* rather than *sprinkled*, with
almost no extra cost (it's array math on the motif).

---

## 5. Calm vs energetic — the firm rule, made precise

The owner's non-negotiable: **solve = calm, Arena = driving**. Concretely, "calm" and
"energetic" are a *bundle* of the levers above, not one knob:

| Lever | Calm (solve / menu) | Energetic (Arena / boss) |
|---|---|---|
| **Attack** (§1.1) | soft (50–600 ms) | sharp (1–5 ms) |
| **Harmonic rhythm** (§3.4) | slow (½–1 chord/bar) | fast (1–2 chords/bar) |
| **Density** `k/n` (§4.2/4.3) | sparse (≤0.3) | dense (≥0.5) |
| **Mode** (§3.3) | Lydian/Ionian/Dorian/pentatonic | Aeolian/Phrygian |
| **Filter cutoff** (§1.2) | low/closed, mellow | open/bright + resonance |
| **Tempo** | 70–90 BPM | 100–140 BPM (half-time feel keeps it from rushing) |
| **Percussion** | soft/absent, brushed | full kit, driving Euclid + wub bass |
| **Reverb** (§6) | longer, wetter (space) | shorter, tighter (punch) |
| **Register/voicing** | wide, open, few voices | tight, mid-forward, busy |

Boss-proximity (we already compute it for the T108 Arena backdrop) can **morph** these
continuously — exactly like the FX intensity — opening the filter, raising density, and
darkening the mode as the boss nears. Audio and visuals would intensify *together*.

---

## 6. Mixing & space — the single biggest quality lever

Dry mono is the loudest "cheap" signal we send. A proper bus structure + reverb + stereo
is, per the research and my own assessment, the highest-impact change after filters.

### 6.1 Bus structure
Stop connecting every voice straight to `master`. Build **submixes**:

```
voice ─┬─ (dry) ──────────────► busGain ─► master ─► limiter ─► destination
       └─ (send) ─► reverbBus ─► reverb ─► master
buses: musicBus (pads/bass/lead/arp), drumBus, sfxBus  →  each its own gain
```

Per-bus gain gives real **per-context balance** (lower the lead bus on hard topics, push
the drum bus in Arena) and a place to duck (below). Keep the existing brickwall
`DynamicsCompressor` limiter on the master output — it stays the clip guard.

### 6.2 Reverb — the space (do this)
Two pure-WebAudio options, **no sample assets** either way `[1][8]`:

- **Convolution with a *synthesized* impulse response.** Generate an IR procedurally:
  an `AudioBuffer` of exponentially-decaying noise (optionally lowpassed over time for a
  darker tail), fed to a `ConvolverNode` `[1][8]`. This is what `reverbGen` does and it
  "sounds fairly decent" `[8]`. High quality, but the IR is **fixed** at build time —
  changing room size means regenerating the buffer `[8]`, and long IRs cost CPU.

```js
function makeIR(ctx, seconds=2.2, decay=3.0, dark=0.6) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/n, decay);
  }
  return ir;   // → convolver.buffer = ir
}
```

- **Algorithmic reverb (FDN / Schroeder–Freeverb)** — a small network of
  `DelayNode`s with feedback `Gain`s + damping lowpass filters `[1]`. FDNs feed delayed
  copies through a feedback matrix to mimic dense reflections `[1]`. **Cheaper CPU,
  real-time-tweakable** decay/size (we can open the room as the boss nears), and no big
  buffer. Slightly more code than a convolver.

  **Recommendation:** ship a **small FDN** (4–8 delay lines, a damping LP in each
  feedback path) as the default — it's light, parameterisable, and lets reverb size
  track context/boss-proximity in real time `[1]`. Keep the synth-IR convolver path as
  an optional "nicer tail" upgrade for capable devices.

A pre-delay (a short `DelayNode` before the reverb) and a high/low cut on the reverb
return keep it from muddying the mix.

### 6.3 Stereo width
Mono is flat. Cheap width, no samples:

- Pan voices with `StereoPannerNode` (e.g. arp slightly left, a counter-voice right,
  bass/kick centred for mono-compatibility).
- **Haas/detune spread** for pads: two detuned unison voices panned L/R.
- A subtle stereo **chorus** (two short modulated `DelayNode`s, ±, panned) on the pad
  bus widens everything for almost nothing.

### 6.4 Sidechain / duck music under SFX
When an SFX or a win-sting fires, briefly dip the `musicBus.gain` (a fast
`setTargetAtTime` down, then back) so the cue cuts through — the "pumping" glue of
modern game audio — then restore. Trivial with the bus structure in §6.1, and it makes
SFX feel *placed in* the music rather than on top of it.

### 6.5 Per-context balance
With buses, each context spec carries a small mix (bus gains, reverb send, width). Calm
solve = wetter, lead quieter, drums softer; Arena = drier/tighter, drums and bass
forward. This is config — but now it's config over a **rich** engine, so it actually
changes the sound.

---

## 7. Constraints (carried into the build)

- **Pure WebAudio, no sample assets.** Everything above is oscillators, gains,
  biquads, delays, and *procedurally-filled* buffers (noise/IR) — zero downloads. ✔
- **No-build, Node-verifiable.** Inline JS module exposing a global (like `fxgl.js`);
  the **spec/graph/scheduler logic is pure** and tested under a stubbed `AudioContext`
  (the existing `sound.test.js` already stubs `AudioContext` — same pattern).
- **One scheduler — Chris Wilson's "two clocks".** Keep the single
  `setInterval`-lookahead scheduler (we already use 25 ms tick / lookahead) — it's the
  recommended, resilient pattern: a large lookahead with a short interval, scheduling
  precise `AudioParam` times against `ctx.currentTime` `[1]`. One scheduler drives
  **all** buses/voices; never one timer per part.
- **CPU budget (Poco X3 / Android Chrome).** Voices are cheap but not free. Cap
  **polyphony** (a voice pool / max concurrent voices, like our `MAX_STEPS_PER_TICK`
  backstop), prefer **one shared** reverb + one shared noise buffer, reuse curves/
  `PeriodicWave`s, and stop/disconnect voices on release so the graph doesn't grow.
  Degrade ladder (mirror FXGL's): drop reverb→shorter, unison→single, disable chorus on
  weak devices.
- **Headless-testability.** Pure functions for: Euclid patterns, Markov transitions,
  chord/voice-leading, the per-step scheduler output, patch→graph construction (assert
  node types/connections via an AudioContext stub), determinism (same seed+phrase →
  same notes), and the calm/energetic invariants (Arena density > solve density; solve
  attack > Arena attack; etc.).

---

## 8. Recommendation — a new standalone B-owned audio engine

**Build a new module, don't grow `sound.js`.** Rationale:

1. **Collision rules.** `sound.js` is an existing Halves file Builder B must never edit;
   integration is an [A] task. This is exactly the `fxgl.js` precedent — a self-contained
   engine that A wires — and it worked cleanly four times.
2. **Clean slate for the voice/patch/bus abstraction.** The improvements are
   architectural (patches, buses, harmony engine, reverb), not tweaks; bolting them onto
   the flat `osc→gain` model fights the existing shape.
3. **Reversible + co-existing.** The new engine can run the **music** while the old
   `Sound` SFX keep firing, and A can switch contexts over to it incrementally, then
   retire the old music scheduler. No big-bang.

### Proposed module: `synth.js` → `window.Synth`
A no-build, headless-testable generative-audio engine, API mirroring `FXGL`'s shape:

```js
Synth.mount(opts?)                 // lazily creates/【reuses】 AudioContext on first gesture; builds buses
Synth.setContext(spec | name)      // switch musical context (solve-topic / menu / arena / event / victory)
                                   //   spec = { mode, tempo, progression, harmonicRhythm,
                                   //            instruments:{role:patch}, density, mix, seed }
Synth.intensity(x)                 // 0..1 morph (boss-proximity / momentum) — opens filter, raises density, darkens mode
Synth.start() / Synth.stop()       // one lookahead scheduler; idles when stopped (no RAF/'interval leak)
Synth.play(patch, when?, opts?)    // one-shot voice (SFX / stings / the wub win-cue), ducks the music bus
Synth.setQuality(0|1|2)            // degrade ladder (reverb/unison/chorus)
Synth.capabilities()              // {webaudio, ...}
```

Internal architecture (one diagram):

```
                ┌─ harmony engine ─┐   ┌─ rhythm engine ─┐
context spec ─► │ key/mode, progr. │   │ Euclid + density│
   + seed       │ voice-leading    │   │ envelopes       │
                └────────┬─────────┘   └────────┬────────┘
                         ▼ per-step notes per role▼
                  ┌──────────────── scheduler (one "two-clock" loop) ──────────────┐
                  │  for each role: render patch → voice sub-graph at precise time  │
                  └───────────────────────────────┬────────────────────────────────┘
        voices ─► musicBus ─┐   drums ─► drumBus ─┐│  one-shots ─► sfxBus ─┐
                            ├─ reverb send ─► FDN ─┤├──────────────────────┤
                            ▼                      ▼▼                       ▼
                          master ───────────► limiter (existing) ───────► destination
                                   ▲ ducking: sfx/sting → musicBus.gain dip
```

**How the owner's asks fall out of this design:**
- *"Calm solves"* → solve contexts use soft-attack pad+pluck patches, slow harmonic
  rhythm, low density, Dorian/pentatonic, wetter reverb (§5).
- *"The wub"* → a `wub` patch (§1.2) used as an Arena bass role and/or the win-sting via
  `Synth.play`.
- *"Distinct Arena"* → Aeolian/Phrygian, fast harmonic rhythm, driving Euclid kit + wub
  bass, drier/tighter mix, and it **intensifies with boss-proximity** via
  `Synth.intensity()` (shared with the FX layer).
- *"Genuine per-context character"* → contexts differ by **instruments + harmony +
  space**, not just scale/BPM — the root cause of today's sameness, fixed.
- *"Not progressing"* → chord progressions + voice-leading + motif development +
  evolving density give real motion and arrival.

### Build path (phased — each a reviewable [B] increment, then an [A] wire)
1. **Engine core**: AudioContext/bus/limiter setup, the `adsr` + filter/LFO voice
   renderer, the patch table, and a Node test (patch→graph, ADSR shape). *(Biggest
   single quality jump: real patches.)*
2. **Space**: the FDN reverb + sends + stereo width + ducking. *(Biggest single
   quality jump #2.)*
3. **Harmony**: key/mode, chord progressions, voice-leading, bass-follows-root.
4. **Rhythm/variation**: Euclidean kit, Markov/2nd-order melody, motif development,
   evolving density, phrase-seeded determinism.
5. **Contexts**: author the per-context specs (solve set, menu, Arena+intensity, event,
   victory sting) and the calm/energetic invariants as tests.
6. **[A] wiring**: mount `Synth`, route screens/contexts (mirror the FX
   `fxSetScreen`), fire the win-sting + duck, retire the old music scheduler. Keep
   `Sound` SFX or migrate them to `Synth.play` patches.

### Headless test plan (mirrors `fxgl.test.js`)
Euclid patterns (k/n correctness, even spread); Markov determinism + in-scale output;
chord/voice-leading (minimal motion, chord-tone membership); scheduler (one loop, capped
polyphony, idles when stopped, no backlog burst — our existing anti-burst rule); patch
graphs (node types + connections via an AudioContext stub, reverb/buses wired once); the
**calm vs energetic invariants** (Arena density > solve; solve attack > Arena; Arena mode
darker); reduced-/low-quality degrade. All pure, all `node`-runnable.

---

## 9. Bottom line

Today's audio is *one instrument, randomly sprinkled, dry and mono*. The fix is not more
config — it's **(a) real patches** (filter + amp/filter envelopes + a modulator),
**(b) space** (an FDN reverb + buses + stereo + ducking), **(c) harmony** (modes +
progressions + voice-leading), and **(d) structured, evolving variation** (Euclid +
Markov + motifs + phrase-seeded determinism), all selected per context so solve is calm
and Arena drives. Deliver it as a **new, standalone, no-build, headless-tested
`synth.js` (`window.Synth`)** that Builder A wires — the proven `fxgl.js` pattern. The
two highest-impact first steps are **patches (§1–2)** and **reverb/space (§6)**; they
alone will move the sound from "chip demo" to "characterful".

---

## References
1. Chris Wilson, *A Tale of Two Clocks — Scheduling Web Audio with Precision*, web.dev —
   https://web.dev/articles/audio-scheduling
2. MDN, *Advanced techniques: Creating and sequencing audio* (envelopes, BiquadFilter,
   LFO, FM) — https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques
3. Godfried Toussaint, *The Euclidean Algorithm Generates Traditional Musical Rhythms* —
   https://cgm.cs.mcgill.ca/~godfried/publications/banff-extended.pdf ·
   overview: https://en.wikipedia.org/wiki/Euclidean_rhythm
4. *How to Build a Monotron Synth with the Web Audio API* (VCO→LFO→VCF lowpass; the wub
   recipe) — https://noisehack.com/how-to-build-monotron-synth-web-audio-api/
5. Berklee Online, *Music Modes: Major and Minor Modal Scales*; Musical-U, *The Many
   Moods of Musical Modes* — https://online.berklee.edu/takenote/music-modes-major-and-minor/ ·
   https://www.musical-u.com/learn/the-many-moods-of-musical-modes/
6. dobrian (CMP), *Building a Synthesizer with Web Audio API — Envelopes & Filters* —
   https://dobrian.github.io/cmp/topics/building-a-synthesizer-with-web-audio-api/0.building-a-synthesizer.html
7. *Markov Chains for Music Generation* (2nd-order melody, chord/voice-leading) —
   https://medium.com/data-science/markov-chain-for-music-generation-932ea8a88305 ·
   https://scholarship.claremont.edu/cgi/viewcontent.cgi?article=1848&context=jhm
8. *Making Reverb with the Web Audio API* (synthesized IR / ConvolverNode) — gskinner —
   https://blog.gskinner.com/archives/2019/02/reverb-web-audio-api.html · `reverbGen`:
   https://github.com/adelespinasse/reverbGen · FDN background:
   https://www.masteringbox.com/learn/convolution-and-algorithmic-reverb
