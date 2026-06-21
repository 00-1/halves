# Builder B — FX engine + brickmap · handoff log

Builder B owns the **NEW standalone FX modules** in Halves and the **brickmap** repo.
Never edits an existing Halves file (wiring is Builder A's job). This log is mine
(`BUILDER-LOG-FX.md`); Builder A keeps `BUILDER-LOG.md`.

---

## T120 — `synth.js` generative-audio engine (phased build per T119)

**Owner directive (2026-06-21): run continuously through phases 1→5, one push per
increment, no per-phase wait.** New files only (`synth.js`, `test/synth.test.js`);
**zero edits to `sound.js` or any existing Halves file** (the [A] wiring is phase 6).
No deps/bundler; no sample assets; deploy-safe; all existing gates green.

### Increment 3/5 — HARMONY (modes · progressions · voice-leading · bass-root) · DONE
Gives the music somewhere to go (T119 §3) — pure music theory, no audio nodes:
- **Modes** (`MODES`): ionian/major, dorian, phrygian, lydian, mixolydian,
  aeolian/minor, pentatonic(+minor), each carrying its mood colour (lydian ♯4,
  phrygian ♭2, dorian ♮6); grouped by mood in `MODE_MOOD` (bright/calm/dark) for
  context selection.
- `degToMidi` (octave-aware, wraps), `chordMidi` (diatonic stacked-third triads),
  `bassMidi` (**bass-follows-root**, low).
- **`voiceLead(prev, chord)`** — moves each voice to the nearest chord tone (≤ a
  tritone), minimising motion (flowing, not blocky).
- **`harmonyFor(spec)`** — realises a progression (`{root, mode, progression,
  padOct, bassOct}`) into per-chord `{degree, chord, voiced(pad), bass}`,
  voice-led across the progression, **deterministic** (the scheduler in increment
  4 consumes it).
- Tests +17 (now **72**): mode intervals (♯4/♭2/♮6), degree→MIDI wrap, triads
  (I=C-E-G, vi=A-C-E), voice-leading (less motion than root-position + all chord
  tones + ≤ tritone), bass-below-pad + follows-root, progression determinism +
  smoother-than-naive motion.

### Increment 2/5 — SPACE (FDN reverb + sends + stereo width + ducking) · DONE
The "biggest quality lever vs our dry sound" (T119 §6):
- **`makeReverb()` — a 4-line Feedback-Delay-Network reverb**: input → pre-delay →
  4 `DelayNode`s, each damped by a lowpass, recombined through a **unitary 4×4
  Hadamard feedback matrix scaled by `decay<1`** (dense but stable), with the taps
  **panned L/R for a wide stereo tail**. Pure WebAudio, **no sample IR**,
  real-time-tweakable (`setDamp`).
- **Sends**: one shared reverb built once at mount; **music + drum buses send into
  it** (drums kept proportionally dryer), reverb returns to master. `Synth.setReverb(wet)`.
- **Ducking**: `Synth.duck(amount, dur)` dips the music bus then recovers
  (sidechain glue so a cue/SFX cuts through) — the [A] wire fires it under stings/SFX.
- Tests +14 (now **55**): FDN 4 lines + pre-delay, per-line damping LP, **≥16
  Hadamard cross-gains** + feedback recirculation, stereo panners, music/drum sends +
  return-to-master, drums-dryer, `setReverb`, `duck` dip+recover, and **reverb built
  once** (voices don't rebuild it).

### Increment 1/5 — ENGINE CORE · DONE
New files only; zero edits to existing Halves files.

### What shipped (increment 1 — the voice/patch foundation)
- **`synth.js` / `window.Synth`** — a self-contained Web Audio engine, the start of
  the T119-recommended `synth.js` (mirrors the `fxgl.js` pattern: standalone, A wires
  it). This increment is the **engine core**, the "biggest quality jump #1: real
  patches":
  - **Master chain** mirroring `sound.js`: `master(gain) → brickwall limiter
    (DynamicsCompressor, −1.5 dB, ratio 20) → destination`, with **music / drum / sfx
    submix buses → master**. `Synth.output()` exposes the master so the [A] wire can
    re-route it into `Sound`'s master + reconcile the T113 volume/limiter.
  - **`adsr(param, t0, dur, env)`** — a real Attack/Decay/Sustain/Release on any
    `AudioParam` (amp gain *and* filter cutoff), exponential for amplitude, with a
    held-sustain stage; short notes still complete attack+decay.
  - **Voice renderer** `osc(s) → [filter (own envelope + optional LFO)] → amp(ADSR) →
    [pan] → bus`, with four engine topologies: **mono**, **unison** (detuned
    supersaw), **fm** (carrier+modulator → frequency), **sub** (the **wub** — resonant
    lowpass swept by an LFO).
  - **Patch table** — `pad · pluck · bass · bell · lead · wub` (genuinely different
    *instruments*, not one osc reskinned) + a **noise-based drum kit** (`kick` with a
    pitch-drop, `snare` = bandpassed noise + tonal body, `hat` = highpassed noise,
    `clap` = staggered bursts), all over a **procedurally-filled** (seeded, no-asset)
    noise buffer.
  - `Synth.mount(opts?)` (lazy; `opts.ctx` injects a context for tests),
    `Synth.play(patch, when?, opts?)`, `Synth.drum(piece, when?)`, `setMuted`/`isMuted`/
    `capabilities`/`dispose`. **One-shot only this increment — no scheduler, no
    timer/RAF** (the lookahead scheduler lands with the Contexts increment).

### Verification
`node -c` clean; `node test/synth.test.js` → **41 checks** via a recording
AudioContext stub (same approach as `sound.test.js`): master→limiter→destination +
3 buses wired once; **ADSR shape** (cancel→0→peak@a→sustain@a+d→hold→0, correct
release-end, short-note safety); **patch→graph** per engine (pad=3 detuned oscs+LP+pan;
bell=FM carrier+mod→freq; wub=saw+LFO→cutoff, resonant Q; bass=mono low-cut; pluck
filter-envelope sweep); **patch distinctness** (6/6 distinct signatures, ≥4 distinct
graph shapes); **drum kit** (kick pitch-drop tonal, hat/snare/clap noise-based);
**budget** (no timer/RAF in core, mute zeroes master + suppresses voices); **no sample
assets / no deps / never calls `window.Sound`**. Full existing Halves suite still green.

### Next increments (T120, one reviewable push each)
2. **Space** — FDN reverb (4–8 delay lines + damping LP) + sends + stereo width +
   ducking (T119 §6, the biggest quality lever vs today's dry sound).
3. **Harmony** — key/mode, chord progressions, voice-leading, bass-follows-root.
4. **Rhythm/variation** — Euclidean kit, 2nd-order Markov melody, motif development,
   evolving + phrase-seeded density (the single lookahead scheduler lands here).
5. **Contexts** — calm-solve set, menu, Arena + `intensity()`, event, victory wub-sting,
   with the calm-vs-energetic invariants as tests.
Then **phase 6 = [A] wiring** (Babysitter specs it): mount `Synth`, route contexts,
fire the win-sting + duck, retire the old music scheduler.

---

## T119 — Deep generative-audio research → principles + recommended engine ([B], doc)

**Status: DONE — handed off for review.** New file only
(`docs/research-generative-audio.md`); **zero edits to any existing Halves file**
(`sound.js` untouched — integration is an [A] task, like the FX wiring). Off
stand-by: the owner asked for deep research into generative audio because the
music is "too simple and doesn't seem to be progressing."

### What shipped
- **`docs/research-generative-audio.md`** — a substantive, *applied* survey + a
  concrete recommended architecture. Grounded in a real diagnosis of `sound.js`
  (one `osc→gain` instrument played 18 ways: same envelope, no filters/ADSR,
  static root, uniformly-random "lead", dry mono, no buses) and stays inside our
  hard constraints (pure WebAudio, **no sample assets**, no-build, one lookahead
  scheduler, Poco-X3 CPU budget, Node-verifiable).
- Covers all **7 mandated areas** with concrete WebAudio node-graph code, not
  hand-waving: (1) **synthesis depth** — real ADSR, BiquadFilter + filter-envelope
  + LFO (the wub worked example), detune/unison, FM, additive, noise percussion,
  waveshaping; (2) **patch/instrument design** — a declarative patch abstraction so
  contexts differ by *instrument*; (3) **harmony** — chord progressions,
  voice-leading (nearest-tone mapper), bass-follows-root, modes-for-mood table,
  harmonic rhythm; (4) **variation** — 2nd-order Markov, Euclidean rhythms
  (`euclid(k,n)`), evolving density, phrase-seeded determinism, motif development;
  (5) **calm vs energetic** — a precise lever table (attack/harmonic-rhythm/
  density/mode/cutoff/tempo/percussion/reverb) + boss-proximity morph; (6) **mixing
  & space** — bus structure, **reverb** (recommend a light FDN, synth-IR convolver
  as upgrade — `makeIR()` included), stereo width, sidechain ducking, per-context
  balance; (7) **constraints** — incl. headless-testability.
- **Recommendation (the point):** build a **new standalone B-owned module
  `synth.js` (`window.Synth`)** mirroring the `fxgl.js` pattern (A wires it), not a
  `sound.js` rewrite — with a full API sketch, an internal architecture diagram,
  how calm-solve/wub/distinct-Arena/per-context-character fall out of it, a phased
  build path (each a reviewable [B] increment), and a headless test plan. Flags
  **patches (§1–2)** and **reverb/space (§6)** as the two highest-impact first
  steps.
- **8 cited references** (Chris Wilson "Two Clocks", MDN advanced techniques,
  Toussaint Euclidean rhythms, Monotron/wub, modes-for-mood, Markov music,
  WebAudio reverb/IR), web-researched and linked inline.

### Verification
Doc-only (no new JS this round — prototyping is optional per the DoD; the build is
the sequenced follow-up). `sound.js` and every existing file untouched; full Halves
gate suite still green (B changed only a new doc + this log).

### Hand-off / next (Builder B)
- The doc ends with a phased, reviewable build plan. Await the Babysitter's verdict
  + which increment to build first (recommended: engine core + patches, then
  reverb/space). When sequenced, I build `synth.js` + `test/synth.test.js`
  (B-owned), never touching `sound.js`; [A] wires it.

---

## T108 — Semantic Arena-biome backdrop derivation (engine side; [B])

**Status: DONE — handed off for review.** Edited only B-owned files
(`fxgl.js`, `test/fxgl.test.js`); **zero edits to any existing Halves file**
(the [A] Arena wiring calls it, after T89/T90). Mirrors T95's discipline. No
deps/bundler; deploy-safe; all existing gates green.

### What shipped
- **New API: `FXGL.deriveArenaScene(state)`** (and `controller.setArenaState`).
  Purpose = **SENSE OF PLACE + STATUS (Arena)** — a `setScene`-shaped backdrop
  derived from **live Arena state**, not decoration:
  - `state = { region: 1..10, tier, bossProximity: 0..1 | facingBoss, mood: neutral|victory|defeat, grid?, seed?, cols?, rows? }`
  - **region** → a distinct palette + accent **kind** per region (10 engine-owned
    region moods echoing the Arena families: warren/gallows/gloam/marsh/frost/
    drown/cinder/storm/dragon/void) — a real *sense of place*.
  - **tier + boss-proximity** → **intensity** (0..1): the glow runs **hotter +
    brighter** and the particle field **denser** as the boss nears; `facingBoss`
    pins it to the peak (1.0).
  - **mood**: **victory** briefly warms/brightens + adds embers (the [A] side
    pairs it with a T94 `burst()`); **defeat** dims/cools.
  - **deterministic** from a state-derived seed (region + tier + intensity band +
    mood) — same state → same biome; it shifts as you advance.
- **Reuses the real scenery:** if the [A] caller passes `state.grid`
  (`Scenery.buildGrid(region)`), the engine renders that real silhouette
  **recoloured by the live intensity-aware palette** (hotter near a boss);
  otherwise it synthesises a grounded region backdrop (sky gradient + a hot glow
  band scaled by intensity + a dark ground silhouette).
- **Budget = T95 discipline:** capped at **`ARENA_PARTICLE_MAX = 220`** (livelier
  than home's 120 since it dresses a battle, still bounded); renders through the
  existing T93 backends — single RAF, one draw/frame, **idles when off-Arena**,
  reduced-motion → static still, no-WebGL2 → CPU still. No new GPU code.

### Brickmap borrowing (T108)
None new — pure state→scene mapping feeding the **T93** ports (Bayer dither,
luminance→palette ramp, atmospheric gradient/glow, instanced accents). The
intensity-scaled hot glow builds on T93's gradient recipe.

### Verification
`node -c` clean; `node test/fxgl.test.js` → **102 checks** (T95's 82 + 20 new):
deterministic per state; **all 10 region palettes distinct** (sense of place);
**nearer-boss → denser field + hotter/brighter glow + brighter backdrop**;
deeper tier lifts intensity; `facingBoss` = peak; **victory warms/brightens +
embers, defeat dims**; capped; region clamps; **uses the caller's scenery grid
and recolours it**; renders on a real backend (single RAF, one draw/frame,
textures once, idles), reduced-motion → static still. Full existing 24-gate
Halves suite still green.

### Hand-off to Builder A (the [A] Arena-biome wiring task, after T89/T90)
- Mount a backdrop canvas behind the Arena (`aria-hidden`,
  `pointer-events:none`); feed it the live region/tier/boss state:
  `FXGL.mount(bg, { width, height }); FXGL.setArenaState({ region, tier, bossProximity, mood, grid: Scenery.buildGrid(region) }); FXGL.start();`
  Re-call `setArenaState(...)` as the fight advances (tier up, boss approached,
  win/loss); on a win, also fire `FXGL.burst(...)` (T94) and pass `mood:"victory"`.
  `FXGL.stop()` when leaving the Arena. Keep text legible (a scrim as
  `scenery.js` does). Register the gate.

### Next (Builder B)
- Await the Babysitter's verdict + next pointer (the [A] FX wiring may preempt
  with a surfaced engine need; otherwise the next flagged [B] surface).

---

## T95 — Semantic home/menu backdrop (engine side; [B])

**Status: DONE — handed off for review.** Edited only B-owned files
(`fxgl.js`, `test/fxgl.test.js`); **zero edits to any existing Halves file**
(the [A] side reads home state and calls the new API). No deps/bundler;
deploy-safe; all existing gates green.

### What shipped
- **New API: `FXGL.setHomeState(state)`** (and `controller.setHomeState`,
  `FXGL.deriveHomeScene(state)`). Purpose = **AMBIENT STATUS** — the home
  backdrop *reflects real state*, it is **not decoration**. It **derives** a
  calm ambient scene (the T93 dither+palette+motes layer) from live home state
  passed in by the caller:
  - `state = { progress: 0..1, streak: int, event: { palette, seed, name, mood } | null, seed?, cols?, rows? }`
  - **today's event** → the home *wears the event's palette* and its seed drives
    the look (the strongest semantic: home literally shows the day's event).
  - **momentum (progress)** → a cool→warm dawn palette + a **horizon glow that
    rises and brightens** as you progress, and a denser particle field.
  - **streak** → kind: a streak (≥3) brings warm "on-a-roll" **embers**; else
    calm **motes** (an event `mood` can override the kind).
  - **deterministic** from a state-derived seed (`seedFromHome`: event + momentum
    band + streak) — stable for a given state, shifts when the day/event or a
    milestone changes.
- **Calm + budgeted:** the home field is capped at **`HOME_PARTICLE_MAX = 120`**
  (well under the Arena's 512) so home stays legible and cheap; renders through
  the existing T93 backends (single RAF, one draw/frame, **idles when stopped /
  off-home**, reduced-motion → a static still, no-WebGL2 → the CPU still).
- Reuses the whole T93 render pipeline — `deriveHomeScene` simply emits a
  `setScene`-shaped scene, so there's no new GPU code, just the **semantic
  mapping** from state → palette/grid/particles.

### Brickmap borrowing (T95)
None new — T95 is pure state→scene mapping feeding the **T93** ports (Bayer
dither, luminance→palette ramp, atmospheric gradient, instanced motes). The
rising-dawn glow is our own, built on T93's gradient/fog recipe.

### Verification
`node -c` clean; `node test/fxgl.test.js` → **82 checks** (T94's 67 + 15 new):
deterministic for a state; **density encodes momentum** + stays ≤ cap; a
different state → a different backdrop; **the glow rises with progress**; streak
threshold switches motes→embers; **an event makes the home wear the event
palette + mood + seed**; the seed shifts when the event changes; renders through
a real backend on a **single RAF, one draw/frame, idles when stopped**, and
**reduced-motion → a static still**. Full existing 24-gate Halves suite green.

### Hand-off to Builder A (the [A] home-backdrop wiring task)
- Mount a backdrop canvas *behind* the (compact, T91) home UI
  (`aria-hidden`, `pointer-events:none`), then feed it the **real** home state:
  `FXGL.mount(bg, { width, height }); FXGL.setHomeState({ progress, streak, event }); FXGL.start();`
  Re-call `setHomeState(...)` when state changes (return-to-home / new event /
  streak tick); `FXGL.stop()` when leaving home (idles the RAF). Source the
  inputs from the live home model (progress from collection/mastery, streak from
  the day-counter, `event` from today's event theme). Keep the home one-screen +
  legible (a scrim if needed, as `scenery.js`/Arena does). Register the CI gate.

### Next (Builder B)
- Await the Babysitter's verdict + next pointer (more FX surfaces are flagged as
  follow-ups once the foundation proves on a real Poco-X3-class device).

---

## T94 — Celebration-burst capability on `fxgl.js` (engine side; [B])

**Status: DONE — handed off for review.** Edited only B-owned files
(`fxgl.js`, `test/fxgl.test.js`); **zero edits to any existing Halves file**
(wiring the burst onto real win/collectible-gain hooks in `main.js` is the
[A] *T94w* task). No deps/bundler; deploy-safe; all existing gates green.

### What shipped
- **New API: `FXGL.burst({ x, y, palette, count, seed })`** (and
  `controller.burst(...)`). Purpose = **CELEBRATION** — a brief, capped, seeded
  flourish to *amplify a reward*. `x,y` are normalised [0,1] screen coords
  (default centre); `palette` tints it (default warm gold/white); `count` is
  clamped to `BURST_CAP` (256); `seed` makes it **deterministic**.
- **Consistent with the T93 engine philosophy:** each burst particle stores its
  launch point/velocity/life/spin in a **static instance buffer** uploaded once;
  the trajectory is **closed-form ballistic** (terminal-velocity drag,
  `v' = g − k·v`) evaluated **in-shader** from `uTime`, so a burst stays **one
  upload + one instanced draw/frame** and needs no per-frame CPU stepping.
- **Auto-stops, no RAF leak.** Particles self-expire (alpha 0 after `life`); the
  controller deactivates the burst once `elapsed > maxDeath`, clears the buffer,
  and lets the **single shared RAF** idle. A burst can run with **no ambient
  scene** (a transparent overlay surface) or **over** a running T93 scene (the
  loop is shared — scene field + burst = 2 instanced draws/frame).
- **Flurries coalesce.** Rapid gains stack into one rolling buffer (each particle
  carries its own `birth`), capped at `BURST_CAP` (oldest dropped) — never a
  runaway.
- **Reduced-motion → a calm flourish** (not nothing, per the DoD): fewer
  particles, lower speed, no gravity tumble, shorter life — and it still
  auto-stops. The additive `pointer-events:none` overlay never blocks text
  (readability stays the [A] mount's concern; engine draws behind/around DOM).
- **All three backends** carry it: WebGL2 (a 3rd program reusing the splat FS),
  WebGPU (a 3rd pipeline + WGSL module), and a light CPU 2D flourish for no-GPU.

### Brickmap borrowing (T94)
Extends the **T93** ports — same instanced-billboard splat recipe (disc mask +
additive falloff from `splat.wgsl`) and the **xorshift32** seed RNG
(`particles.rs`); the burst adds a closed-form drag trajectory (the analytic
solution of `particles.rs`'s gravity+drag integration). No new brickmap read was
required; no Rust/WASM pulled in.

### Verification
`node -c` clean; `node test/fxgl.test.js` → **67 checks** (T93's 46 + 21 new):
seedBurst capped/deterministic/calmer-under-reduced; `burstPos` lifecycle
(invisible before birth & after life, visible mid-life); `burstMaxDeath`; the
controller burst **pumps one RAF**, **one instanced draw/frame**, **auto-stops
with no leak**, **caps at BURST_CAP**, runs **standalone or over a scene** (2
draws/frame, textures still uploaded once), and the **reduced-motion calm
flourish** also auto-stops. Full existing 24-gate Halves suite still green
(B touched nothing else).

### Hand-off to Builder A (the [A] *T94w* wiring task)
- Mount a full-screen, `aria-hidden`, `pointer-events:none` overlay canvas;
  `const fx = FXGL.mount(overlay, { width, height });` then call
  `fx.burst({ x, y, palette, seed })` on the **existing** win/unlock moments:
  Arena victory (T90 playout) and collectible/loot/event-reward gains. `x,y` =
  the gain's on-screen point normalised to [0,1] (else it defaults to centre);
  `palette` can follow the reward's rarity colours. The burst auto-stops, so no
  teardown is needed between events. Register `test/fxgl.test.js` as a CI gate
  (still the [A] wiring task's call, alongside the T93 mount).

### Next (Builder B)
- The engine side of **T95** (semantic home/menu backdrop driven by live
  event/progress state), per the REVIEW.md pointer.

---

## T93 — `fxgl.js` FX engine (standalone, brickmap-borrowed, headless-tested)

**Status: DONE — handed off for review.** New files only; zero edits to existing
Halves files; no bundler/deps; deploy-safe; all existing gates stay green.

### What shipped
- **`fxgl.js`** — a self-contained `window.FXGL` engine. Clean, mountable API:
  - `FXGL.mount(canvas, opts) → controller` (also becomes the active singleton).
  - `FXGL.setScene({ palette?, grid, particles?, seed? })` — `grid` is the exact
    shape `scenery.js` emits (a COLS×ROWS array of hex colours); `palette` is
    optional (derived from the grid when omitted); `particles` is
    `{ count, kind, colors }` with `kind ∈ motes|embers|snow|stars`.
  - `FXGL.start()` / `FXGL.stop()` (caller owns the single RAF).
  - `FXGL.setQuality(0|1|2)` (degrade ladder), `FXGL.dispose()`,
    `FXGL.capabilities()`, `FXGL.resize()`.
  - Pure scene/dither/particle math is also exported (headless-tested).
- **Three backends, one API:**
  - **WebGPU** (progressive enhancement, WebGPU-*first*): resolved async via
    `requestAdapter`/`requestDevice` *before* the canvas context is bound (a
    canvas binds one graphics API), falling back if it fails.
  - **WebGL2** (baseline): the live path on the midrange floor.
  - **CPU still** (no-GPU): a static, CPU-dithered, palette-quantised still — the
    layer is reversible to today's static look.
- **Reduced motion** → a single static still, never a RAF. **No GPU** → the CPU
  still. Honoured by `prefers-reduced-motion` and by capability detection.
- **Purpose = PLACE.** The engine only renders a real theme (a scenery grid +
  accents); `deriveScene` *rejects a grid-less scene*, so it can't become a
  generic screensaver. The base texture is the literal scenery grid; the palette
  ramp is built from that grid's own colours.
- **`test/fxgl.test.js`** — 46 headless checks via `node test/fxgl.test.js`:
  pure Bayer dither / luminance-ramp quantise / particle-seed math; the "renders
  a real scenery theme not noise" proof (feeds an actual `Scenery.buildGrid`);
  budget invariants (single loop, one frame in flight, capped buffer, idle when
  stopped); a **recording WebGL2 stub** asserting **one instanced draw per frame**
  and a **one-time texture upload** (no per-frame re-upload); and the
  reduced-motion / no-GPU still fallbacks.

### Brickmap borrowing — RECIPES, not the engine
Read `00-1/brickmap`'s `crates/bm-render/src/*.wgsl` and **ported the techniques**
into our own no-build JS WebGL2/WebGPU layer. **No Rust/WASM/wgpu pulled into
Halves** (test asserts this) — keeps no-build + Node-verify + a11y.

| Borrowed technique | brickmap source | Where in `fxgl.js` |
|---|---|---|
| Ordered **4×4 Bayer dither** matrix `[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5]` | `palette.wgsl`, `splat.wgsl` (`bayer4`) | `BAYER`, `bayer4()`, both scene shaders |
| **Luminance→palette-ramp quantise** (tonal gradient-map / poster look; dither nudges across stops) | `palette.wgsl` `fs_main` | `buildRamp`, `rampIndex`, `quantizePixel`, scene FS/WGSL |
| **Screen-space atmospheric gradient / fog** (a slow drifting band) | `sky.wgsl` | the `uTime` fog term in the scene FS/WGSL |
| **Instanced billboard particle splats** (disc mask, wind sway via `sin(time+phase)`, per-particle hash/phase, animate in-shader from a static buffer) | `splat.wgsl`, `particles.rs` | particle VS/FS, `seedParticles`, `animateParticle` |
| **xorshift32** deterministic RNG | `particles.rs` `rand()` | `makeRng` |

Deliberately **not** ported: brickmap decodes sRGB→linear because its target
re-encodes on store; our plain canvas displays sRGB values directly, so porting
that would double-darken — left out on purpose.

### Deviations from the T93 brief
- None of substance. WebGPU is implemented real (browser-only; not exercised by
  the Node stub, which targets the WebGL2 path — the DoD allows "a WebGL/WebGPU
  stub"). The headless stub proves the WebGL2 path's single-draw / one-time-upload
  invariants.

### Hand-off to Builder A (the [A] *T93w* wiring task)
- Add `<script src="fxgl.js">` and mount on the Arena backdrop canvas:
  `FXGL.mount(canvas, { width, height }); FXGL.setScene({ grid: Scenery.buildGrid(region), seed: region, particles: { kind, count } }); FXGL.start();`
  Keep the canvas `aria-hidden` + `pointer-events:none`; `FXGL.stop()` when the
  Arena is off-screen (idle). Register `test/fxgl.test.js` as a CI gate in
  `pages.yml`. Particle `kind` can follow the region's scenery accent
  (embers/snow/stars), else `motes`.

### Next (Builder B)
- The engine sides of **T94** (celebration bursts) and **T95** (semantic home
  backdrop driven by live event/progress state), per the REVIEW.md pointer.
