# Builder B — FX engine + brickmap · handoff log

Builder B owns the **NEW standalone FX modules** in Halves and the **brickmap** repo.
Never edits an existing Halves file (wiring is Builder A's job). This log is mine
(`BUILDER-LOG-FX.md`); Builder A keeps `BUILDER-LOG.md`.

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
