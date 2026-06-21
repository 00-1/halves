# Builder B — FX engine + brickmap · handoff log

Builder B owns the **NEW standalone FX modules** in Halves and the **brickmap** repo.
Never edits an existing Halves file (wiring is Builder A's job). This log is mine
(`BUILDER-LOG-FX.md`); Builder A keeps `BUILDER-LOG.md`.

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
