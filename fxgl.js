/*
 * Halves — fxgl.js · the visual-FX engine (T93, Builder B / Phase 6.12).
 *
 * A SELF-CONTAINED, no-build WebGPU-first / WebGL2-fallback FX layer that the
 * game can mount on a backdrop canvas to give a screen a *sense of place*. It
 * takes a `scenery.js`-shaped theme — a COLS×ROWS grid of hex colours plus a
 * few accent particles — and renders it as a dithered, palette-quantised biome
 * scene with a gentle instanced particle field over it.
 *
 * SEMANTIC, never a screensaver: the only input is real game data (an Arena
 * region's scenery, an event palette, …). The wiring that feeds it live state
 * is an [A] task; this file is the standalone engine + a headless proof.
 *
 * Techniques PORTED from brickmap's `bm-render` WGSL (recipes, not the engine):
 *   - Ordered 4×4 Bayer dithering              (palette.wgsl / splat.wgsl)
 *   - Luminance→palette-ramp quantisation       (palette.wgsl, the poster look)
 *   - Screen-space atmospheric gradient / fog    (sky.wgsl)
 *   - Instanced billboard particle splats        (splat.wgsl: disc mask, wind
 *     sway, per-particle phase; animated in-shader from a static buffer)
 * See docs/agent/BUILDER-LOG-FX.md for the borrowing notes.
 *
 * Guardrails (Phase 6.12): additive layer, the caller keeps it aria-hidden /
 * pointer-events:none; single RAF the caller starts/stops; capped particle
 * buffer; a resolution+particle degrade ladder; honours prefers-reduced-motion
 * (a static still) and falls back to a CPU dithered still with no GPU.
 *
 * Public API (window.FXGL):
 *   FXGL.mount(canvas, opts)   -> a controller (also becomes the active one)
 *   FXGL.setScene({ palette, grid, particles, seed })
 *   FXGL.start() / FXGL.stop()
 *   FXGL.setQuality(0|1|2) · FXGL.dispose() · FXGL.capabilities()
 * The pure scene/dither/particle math is also exported for headless tests.
 */
(function(){
  "use strict";

  // ---- budget constants ---------------------------------------------------
  const PARTICLE_CAP = 512;                 // hard ceiling on live particles
  const QUALITY = [                          // degrade ladder: low / med / high
    { res: 0.6, particles: 0.35, name: "low"  },
    { res: 0.85, particles: 0.7,  name: "med"  },
    { res: 1.0, particles: 1.0,  name: "high" }
  ];
  const KIND = { motes: 0, embers: 1, snow: 2, stars: 3 };
  const TAU = Math.PI * 2;

  // Celebration-burst budget (T94): a brief, transient flourish — its own cap,
  // separate from the ambient field. Motion is closed-form ballistic (terminal-
  // velocity drag), animated in-shader from a static buffer, so a burst stays a
  // one-time upload + one draw call and auto-stops when its particles expire.
  const BURST_CAP = 256;            // hard ceiling on live burst particles
  const BURST_GRAVITY = 1.2;        // screen-fractions / s²  (down = +y)
  const BURST_DRAG = 1.6;           // velocity damping rate (1/s)

  // Home backdrop (T95): a calm, legible ambient field — its own modest cap,
  // well under the Arena's, so the home screen stays readable and cheap to idle.
  const HOME_PARTICLE_MAX = 120;

  // The 4×4 ordered (Bayer) matrix, row-major — the same lattice brickmap uses
  // for its palette dither and its foliage stipple.
  const BAYER = [ 0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5 ];

  // =========================================================================
  // PURE MATH (exported; covered by test/fxgl.test.js)
  // =========================================================================

  // Bayer threshold in [0,1) at an integer pixel — centre with `-0.5` for a
  // signed dither offset, exactly as the ported shaders do.
  function bayer4(x, y){
    const bx = ((x % 4) + 4) % 4, by = ((y % 4) + 4) % 4;
    return (BAYER[by * 4 + bx] + 0.5) / 16;
  }

  function parseColor(hex){
    let h = String(hex).trim().replace("#", "");
    if(h.length === 3) h = h.replace(/(.)/g, "$1$1");
    const n = parseInt(h, 16);
    if(!isFinite(n)) return [0, 0, 0];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function toHex(rgb){
    return "#" + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  }
  // Perceptual luminance in [0,1] — matches the shader's dot(c, .299/.587/.114).
  function luma(rgb){ return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255; }

  // Build an ordered dark→light colour ramp from a set of hex colours. The
  // palette becomes the quantisation target; luminance picks the ramp stop, so
  // the scene recolours into the restrained palette while keeping its lighting
  // (brickmap's tonal gradient-map). Deduped, sorted, then evenly sampled to
  // `maxSteps` so a busy grid still yields a clean ramp.
  function buildRamp(hexColors, maxSteps){
    maxSteps = Math.max(2, Math.min(16, maxSteps | 0 || 8));
    const seen = new Set(), uniq = [];
    for(const c of (hexColors || [])){
      const rgb = parseColor(c), key = rgb.join(",");
      if(!seen.has(key)){ seen.add(key); uniq.push(rgb); }
    }
    if(uniq.length === 0) uniq.push([0, 0, 0], [255, 255, 255]);
    if(uniq.length === 1) uniq.push(uniq[0].map(v => Math.min(255, v + 40)));
    uniq.sort((a, b) => luma(a) - luma(b));
    if(uniq.length <= maxSteps) return uniq;
    const out = [];
    for(let i = 0; i < maxSteps; i++){
      out.push(uniq[Math.round(i / (maxSteps - 1) * (uniq.length - 1))]);
    }
    return out;
  }

  // The quantisation index for a luminance, with a Bayer offset nudging it up to
  // half a ramp step toward a neighbour (the dither). `spread` 0 = hard quantise.
  function rampIndex(luminance, rampCount, threshold01, spread){
    const last = rampCount - 1;
    const t = (threshold01 - 0.5) * (spread == null ? 1 : spread);
    const pos = Math.max(0, Math.min(last, luminance * last + t));
    return Math.round(pos);
  }

  // CPU pipeline for one pixel — used by the no-GPU static still. Returns the
  // quantised ramp colour (rgb 0..255). Mirrors the GLSL/WGSL exactly at t=0.
  function quantizePixel(rgb, x, y, ramp, spread){
    const idx = rampIndex(luma(rgb), ramp.length, bayer4(x, y), spread);
    return ramp[Math.max(0, Math.min(ramp.length - 1, idx))];
  }

  // A scenery grid (rows of hex) → a tight RGBA8 base image (one texel/cell).
  function gridToImage(grid){
    const h = grid.length, w = grid[0] ? grid[0].length : 0;
    const data = new Uint8Array(w * h * 4);
    for(let r = 0; r < h; r++){
      for(let c = 0; c < w; c++){
        const [R, G, B] = parseColor(grid[r][c]);
        const o = (r * w + c) * 4;
        data[o] = R; data[o + 1] = G; data[o + 2] = B; data[o + 3] = 255;
      }
    }
    return { data, w, h };
  }
  // Collect the distinct colours in a grid (feeds buildRamp when no explicit
  // palette is supplied).
  function gridColors(grid){
    const seen = new Set();
    for(const row of grid) for(const c of row) seen.add(c);
    return Array.from(seen);
  }

  // Deterministic xorshift32 → [0,1), like brickmap's particle RNG.
  function makeRng(seed){
    let s = (seed | 0) || 0x9e3779b9;
    return function(){
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s |= 0;
      return ((s >>> 8) & 0xffffff) / 0x1000000;
    };
  }
  function lerp(a, b, t){ return a + (b - a) * t; }

  // Seed a capped particle field from a scene. Pure + deterministic from `seed`.
  // Each seed carries its spawn point, look, and per-particle phase/speed; the
  // motion is computed in-shader (see animateParticle) from this static buffer.
  function seedParticles(scene, ramp, cap){
    const p = (scene && scene.particles) || {};
    const kind = (typeof p.kind === "string") ? (KIND[p.kind] != null ? KIND[p.kind] : 0) : (p.kind | 0);
    const want = (p.count != null) ? (p.count | 0) : 90;
    const n = Math.max(0, Math.min(cap | 0, want));
    const rng = makeRng((scene && scene.seed) | 0);
    // colour pool: explicit, else the bright end of the ramp (accents glow).
    let pool = (p.colors && p.colors.length) ? p.colors.map(parseColor)
             : ramp.slice(Math.max(0, ramp.length - 3));
    if(!pool.length) pool = [[255, 255, 255]];
    const speedK = kind === KIND.embers ? 0.05 : kind === KIND.snow ? 0.04 : 0.025;
    const out = new Array(n);
    for(let i = 0; i < n; i++){
      const col = pool[(rng() * pool.length) | 0];
      out[i] = {
        x: rng(), y: rng(),
        size: lerp(1.5, kind === KIND.stars ? 3 : 5, rng()),
        r: col[0], g: col[1], b: col[2],
        phase: rng() * TAU,
        speed: lerp(0.4, 1, rng()) * speedK,
        kind: kind,
        twinkle: lerp(2, 6, rng()),
        alpha: lerp(0.4, 0.9, rng())
      };
    }
    return out;
  }

  function frac(x){ return x - Math.floor(x); }
  // The in-shader particle motion, in JS — the GLSL/WGSL vertex shaders compute
  // the identical drift so this both documents and (in tests) bounds the motion.
  // Gentle: motes/embers rise & wrap, snow falls & wraps, stars hold & twinkle.
  function animateParticle(s, t){
    const sway = Math.sin(t * 0.6 + s.phase) * 0.012;
    let x = s.x, y = s.y, a = s.alpha;
    if(s.kind === KIND.motes){ y = frac(s.y - t * s.speed); x = s.x + sway; a = s.alpha * (0.6 + 0.4 * Math.sin(t * 0.8 + s.phase)); }
    else if(s.kind === KIND.embers){ y = frac(s.y - t * s.speed * 1.6); x = s.x + sway * 1.5; a = s.alpha * (0.5 + 0.5 * Math.sin(t * 3 + s.phase)); }
    else if(s.kind === KIND.snow){ y = frac(s.y + t * s.speed); x = s.x + Math.sin(t * 0.9 + s.phase) * 0.02; }
    else { a = s.alpha * (0.45 + 0.55 * Math.sin(t * s.twinkle + s.phase)); }
    return { x: x, y: y, alpha: Math.max(0, Math.min(1, a)), size: s.size };
  }

  function clamp01(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }

  // Seed a celebration burst (T94) — purpose: CELEBRATION, amplify a reward.
  // Deterministic from `seed`, capped, and (under reduced motion) a calm, slow,
  // small flourish rather than a full pop. Each particle carries its launch
  // point/velocity/life/spin; its trajectory is closed-form (see burstPos), so
  // the buffer is static and the motion runs in-shader. `birth` is stamped by
  // the controller when the burst actually fires (supports rapid flurries).
  function seedBurst(opts, reduced, cap){
    opts = opts || {};
    const x0 = clamp01(opts.x != null ? opts.x : 0.5);
    const y0 = clamp01(opts.y != null ? opts.y : 0.5);
    const want = (opts.count != null) ? (opts.count | 0) : 80;
    const scale = reduced ? 0.35 : 1;
    const n = Math.max(0, Math.min(cap | 0, Math.round(want * scale)));
    const rng = makeRng((opts.seed | 0) || 0x51ed270b);
    let pool = (opts.palette && opts.palette.length) ? opts.palette.map(parseColor) : [[255, 217, 138], [255, 255, 255]];
    if(!pool.length) pool = [[255, 255, 255]];
    const sMax = reduced ? 0.22 : 0.85;     // peak outward speed (screen-frac/s)
    const up = reduced ? 0.10 : 0.42;       // upward kick (confetti arc)
    const lMax = reduced ? 0.7 : 1.4;       // longest life (s)
    const spin = reduced ? 1.5 : 9;         // rotation rate spread
    const szMax = reduced ? 4 : 7;
    const out = new Array(n);
    for(let i = 0; i < n; i++){
      const ang = rng() * TAU, spd = lerp(0.14, sMax, rng());
      const col = pool[(rng() * pool.length) | 0];
      out[i] = {
        x0: x0, y0: y0,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - lerp(up * 0.4, up, rng()),  // bias upward
        size: lerp(2, szMax, rng()),
        r: col[0], g: col[1], b: col[2],
        life: lerp(0.6, lMax, rng()),
        vrot: lerp(-spin, spin, rng()),
        birth: 0
      };
    }
    return out;
  }

  // Closed-form ballistic position + fade for a burst particle at burst-elapsed
  // time `t` (the GLSL/WGSL vertex shaders compute the identical trajectory, so
  // this both documents the motion and bounds it in tests). Terminal-velocity
  // drag: v' = g - k·v. Returns normalised position, alpha (0 before birth /
  // after life), and a liveness flag.
  function burstPos(p, t, g, k){
    g = (g == null) ? BURST_GRAVITY : g;
    k = Math.max((k == null) ? BURST_DRAG : k, 1e-4);
    const lt = t - p.birth;
    if(lt < 0 || lt > p.life) return { x: p.x0, y: p.y0, alpha: 0, alive: false };
    const e = Math.exp(-k * lt);
    const x = p.x0 + p.vx * (1 - e) / k;
    const y = p.y0 + (g / k) * lt + (p.vy - g / k) * (1 - e) / k;
    const fadeIn = Math.min(1, lt / 0.08);
    const fadeOut = Math.max(0, 1 - lt / p.life);
    return { x: x, y: y, alpha: clamp01(fadeIn * fadeOut), alive: true };
  }
  // The latest death time across a burst (controller uses it to auto-stop).
  function burstMaxDeath(particles){
    let m = 0;
    for(const p of particles){ const d = p.birth + p.life; if(d > m) m = d; }
    return m;
  }

  // Precompute the per-scene render data shared by every backend (pure).
  function deriveScene(scene, cap){
    if(!scene || !scene.grid || !scene.grid.length) throw new Error("FXGL.setScene needs a grid");
    const ramp = buildRamp(scene.palette && scene.palette.length ? scene.palette : gridColors(scene.grid), scene.steps || 8);
    return {
      ramp: ramp,
      image: gridToImage(scene.grid),
      particles: seedParticles(scene, ramp, cap),
      dither: (scene.dither == null) ? 1 : scene.dither
    };
  }

  // =========================================================================
  // SEMANTIC HOME BACKDROP (T95) — purpose: AMBIENT STATUS, never decoration.
  // Pure mapping from *live home state* (passed in by the [A] caller) to a calm
  // ambient scene: today's-event mood and momentum/streak drive the palette,
  // the rising-dawn glow, the particle kind, and the density — all deterministic
  // from a state-derived seed. Same state → same backdrop; the look *changes
  // because the state changed*, so the home literally reads your progress.
  // =========================================================================
  function mixRgb(a, b, t){ return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  // A stable per-state seed: today's event (its seed/name) dominates, then the
  // momentum band + streak. Stable for a given state, shifts when the day/event
  // or a milestone changes.
  function seedFromHome(state){
    if(state.seed != null) return (state.seed | 0) || 1;
    let h = 2166136261 >>> 0;
    const mix = function(n){ h ^= (n >>> 0); h = Math.imul(h, 16777619) >>> 0; };
    if(state.event){
      if(state.event.seed != null) mix(state.event.seed | 0);
      if(state.event.name) for(let i = 0; i < state.event.name.length; i++) mix(state.event.name.charCodeAt(i));
    }
    mix(Math.round(clamp01(state.progress || 0) * 20));   // bucketed momentum
    mix(Math.max(0, state.streak | 0));
    return h || 1;
  }

  // Palette: wear today's event colours if there's an event; otherwise derive a
  // cool→warm dawn ramp whose warmth/brightness encodes momentum (progress).
  function homePalette(state){
    if(state.event && state.event.palette && state.event.palette.length >= 2) return state.event.palette.slice();
    const p = clamp01(state.progress != null ? state.progress : 0);
    const base = [10, 12, 22];                              // always-dark top
    const horizon = mixRgb([30, 34, 54], [120, 80, 60], p); // cool → warm horizon
    const glow = mixRgb([70, 84, 130], [245, 205, 150], p); // cool glow → warm dawn
    return [ toHex(base), toHex(mixRgb(base, horizon, 0.5)), toHex(horizon), toHex(mixRgb(horizon, glow, 0.6)), toHex(glow) ];
  }

  // A calm gradient backdrop: vertical dark→mid wash + a soft horizon glow band
  // that RISES and brightens with momentum (more progress = a higher dawn). A
  // tiny seeded per-column shimmer keeps it from dead-flat banding.
  function homeGrid(state, palette, cols, rows){
    const rgb = palette.map(parseColor);
    const dark = rgb[0], mid = rgb[(rgb.length / 2) | 0], glow = rgb[rgb.length - 1];
    const p = clamp01(state.progress != null ? state.progress : 0);
    const rng = makeRng(seedFromHome(state));
    const horizon = rows * (0.78 - 0.42 * p);               // rises with momentum
    const shimmer = new Array(cols);
    for(let c = 0; c < cols; c++) shimmer[c] = rng() - 0.5;
    const g = [];
    for(let r = 0; r < rows; r++){
      g[r] = new Array(cols);
      const vy = rows > 1 ? r / (rows - 1) : 0;
      const d = Math.abs(r - horizon) / rows;
      const band = Math.max(0, 1 - d * 4) * (0.35 + 0.65 * p);
      for(let c = 0; c < cols; c++){
        let col = mixRgb(dark, mid, vy);
        col = mixRgb(col, glow, band * 0.8);
        const s = 1 + shimmer[c] * 0.06;
        g[r][c] = toHex([col[0] * s, col[1] * s, col[2] * s]);
      }
    }
    return g;
  }

  // Particles: kind names the status (an event sets the mood; a streak brings
  // warm "on-a-roll" embers; else calm motes), density encodes momentum, capped
  // so home stays calm + legible.
  function homeParticles(state, palette){
    const p = clamp01(state.progress != null ? state.progress : 0);
    const streak = Math.max(0, state.streak | 0);
    let kind = "motes";
    if(state.event && state.event.mood && KIND[state.event.mood] != null) kind = state.event.mood;
    else if(streak >= 3) kind = "embers";
    const count = Math.min(HOME_PARTICLE_MAX, Math.round(18 + p * 60 + Math.min(streak, 10) * 4));
    const colors = palette.slice(Math.max(0, palette.length - 2));
    return { kind: kind, count: count, colors: colors };
  }

  // The public derivation: live home state → a setScene-shaped ambient scene.
  function deriveHomeScene(state){
    state = state || {};
    const cols = state.cols || 28, rows = state.rows || 16;
    const palette = homePalette(state);
    return {
      grid: homeGrid(state, palette, cols, rows),
      palette: palette,
      particles: homeParticles(state, palette),
      seed: seedFromHome(state),
      dither: 1
    };
  }

  // =========================================================================
  // SHADER SOURCES (inline; no bundler) — GLSL ES 3.00 for the WebGL2 path
  // =========================================================================
  const GLSL_SCENE_VS =
"#version 300 es\n" +
"out vec2 vUV;\n" +
"void main(){\n" +
"  vec2 v[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));\n" +
"  vec2 p = v[gl_VertexID];\n" +
"  gl_Position = vec4(p, 0.0, 1.0);\n" +
"  vUV = vec2(p.x*0.5+0.5, 1.0-(p.y*0.5+0.5));\n" +
"}\n";

  const GLSL_SCENE_FS =
"#version 300 es\n" +
"precision highp float;\n" +
"in vec2 vUV;\n" +
"uniform sampler2D uScene;\n" +
"uniform sampler2D uRamp;\n" +
"uniform float uRampCount;\n" +
"uniform float uDither;\n" +
"uniform float uTime;\n" +
"out vec4 frag;\n" +
"const int BAYER[16] = int[16](0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5);\n" +
"void main(){\n" +
"  vec3 c = texture(uScene, vUV).rgb;\n" +
"  float l = dot(c, vec3(0.299,0.587,0.114));\n" +
"  // atmospheric breath: a slow fog band drifting up the scene (sky.wgsl idea)\n" +
"  l = clamp(l + 0.02*sin(uTime*0.25 + vUV.y*6.2831), 0.0, 1.0);\n" +
"  int bx = int(mod(gl_FragCoord.x,4.0)); int by = int(mod(gl_FragCoord.y,4.0));\n" +
"  float t = (float(BAYER[by*4+bx])+0.5)/16.0 - 0.5;\n" +
"  float last = uRampCount - 1.0;\n" +
"  float pos = clamp(l*last + t*uDither, 0.0, last);\n" +
"  float idx = floor(pos + 0.5);\n" +
"  vec3 outc = texture(uRamp, vec2((idx+0.5)/uRampCount, 0.5)).rgb;\n" +
"  frag = vec4(outc, 1.0);\n" +
"}\n";

  const GLSL_PART_VS =
"#version 300 es\n" +
"layout(location=0) in vec2 aPos;\n" +
"layout(location=1) in float aSize;\n" +
"layout(location=2) in vec3 aColor;\n" +
"layout(location=3) in float aPhase;\n" +
"layout(location=4) in float aSpeed;\n" +
"layout(location=5) in float aKind;\n" +
"layout(location=6) in float aTwinkle;\n" +
"layout(location=7) in float aAlpha;\n" +
"uniform float uTime; uniform vec2 uRes;\n" +
"out vec3 vColor; out vec2 vQuad; out float vAlpha;\n" +
"float fr(float x){ return x - floor(x); }\n" +
"void main(){\n" +
"  vec2 corners[6] = vec2[6](vec2(-0.5,-0.5),vec2(0.5,-0.5),vec2(0.5,0.5),vec2(-0.5,-0.5),vec2(0.5,0.5),vec2(-0.5,0.5));\n" +
"  vec2 q = corners[gl_VertexID]; float t = uTime;\n" +
"  vec2 p = aPos; float a = aAlpha;\n" +
"  float sway = sin(t*0.6 + aPhase)*0.012; int k = int(aKind+0.5);\n" +
"  if(k==0){ p.y = fr(aPos.y - t*aSpeed); p.x = aPos.x + sway; a = aAlpha*(0.6+0.4*sin(t*0.8+aPhase)); }\n" +
"  else if(k==1){ p.y = fr(aPos.y - t*aSpeed*1.6); p.x = aPos.x + sway*1.5; a = aAlpha*(0.5+0.5*sin(t*3.0+aPhase)); }\n" +
"  else if(k==2){ p.y = fr(aPos.y + t*aSpeed); p.x = aPos.x + sin(t*0.9+aPhase)*0.02; }\n" +
"  else { a = aAlpha*(0.45+0.55*sin(t*aTwinkle+aPhase)); }\n" +
"  vec2 center = vec2(p.x*2.0-1.0, 1.0 - p.y*2.0);\n" +
"  vec2 off = q * (aSize/uRes) * 2.0; off.y = -off.y;\n" +
"  gl_Position = vec4(center + off, 0.0, 1.0);\n" +
"  vColor = aColor; vQuad = q; vAlpha = clamp(a,0.0,1.0);\n" +
"}\n";

  const GLSL_PART_FS =
"#version 300 es\n" +
"precision highp float;\n" +
"in vec3 vColor; in vec2 vQuad; in float vAlpha;\n" +
"out vec4 frag;\n" +
"void main(){\n" +
"  float d2 = dot(vQuad, vQuad);\n" +
"  if(d2 > 0.25) discard;\n" +              // round disc mask (splat.wgsl)
"  float a = vAlpha * (1.0 - d2*4.0);\n" +   // soft centre-bright falloff
"  frag = vec4(vColor/255.0 * a, a);\n" +
"}\n";

  // Celebration burst (T94) — instanced billboards on a closed-form ballistic
  // path, animated in-shader from a static buffer. Reuses the particle FS
  // (disc mask + additive falloff). Dead/unborn instances collapse to alpha 0.
  const GLSL_BURST_VS =
"#version 300 es\n" +
"layout(location=0) in vec2 aP0;\n" +
"layout(location=1) in vec2 aVel;\n" +
"layout(location=2) in float aSize;\n" +
"layout(location=3) in vec3 aColor;\n" +
"layout(location=4) in float aLife;\n" +
"layout(location=5) in float aBirth;\n" +
"layout(location=6) in float aVRot;\n" +
"uniform float uTime; uniform vec2 uRes; uniform float uGrav; uniform float uDrag;\n" +
"out vec3 vColor; out vec2 vQuad; out float vAlpha;\n" +
"void main(){\n" +
"  vec2 corners[6] = vec2[6](vec2(-0.5,-0.5),vec2(0.5,-0.5),vec2(0.5,0.5),vec2(-0.5,-0.5),vec2(0.5,0.5),vec2(-0.5,0.5));\n" +
"  vec2 q = corners[gl_VertexID];\n" +
"  float lt = uTime - aBirth; float k = max(uDrag, 0.0001); float e = exp(-k*lt);\n" +
"  vec2 pos = aP0;\n" +
"  pos.x += aVel.x*(1.0-e)/k;\n" +
"  pos.y += (uGrav/k)*lt + (aVel.y - uGrav/k)*(1.0-e)/k;\n" +
"  float alive = (lt >= 0.0 && lt <= aLife) ? 1.0 : 0.0;\n" +
"  float a = clamp(lt/0.08,0.0,1.0) * clamp(1.0 - lt/aLife,0.0,1.0) * alive;\n" +
"  float rot = aVRot*lt; float cs = cos(rot), sn = sin(rot);\n" +
"  vec2 cr = vec2(q.x*cs - q.y*sn, q.x*sn + q.y*cs);\n" +
"  vec2 center = vec2(pos.x*2.0-1.0, 1.0 - pos.y*2.0);\n" +
"  vec2 off = cr * (aSize/uRes) * 2.0; off.y = -off.y;\n" +
"  gl_Position = vec4(center + off, 0.0, 1.0);\n" +
"  vColor = aColor; vQuad = q; vAlpha = a;\n" +
"}\n";

  // WGSL for the WebGPU path — the same two passes (scene quantise + splats).
  const WGSL_SCENE =
"struct VsOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> };\n" +
"@vertex fn vs(@builtin(vertex_index) i: u32) -> VsOut {\n" +
"  var v = array<vec2<f32>,3>(vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));\n" +
"  var o: VsOut; let p = v[i]; o.pos = vec4(p,0.0,1.0);\n" +
"  o.uv = vec2(p.x*0.5+0.5, 1.0-(p.y*0.5+0.5)); return o;\n" +
"}\n" +
"struct U { rampCount: f32, dither: f32, time: f32, _p: f32 };\n" +
"@group(0) @binding(0) var sceneT: texture_2d<f32>;\n" +
"@group(0) @binding(1) var sampNN: sampler;\n" +
"@group(0) @binding(2) var rampT: texture_2d<f32>;\n" +
"@group(0) @binding(3) var<uniform> u: U;\n" +
"@fragment fn fs(in: VsOut) -> @location(0) vec4<f32> {\n" +
"  let c = textureSample(sceneT, sampNN, in.uv).rgb;\n" +
"  var l = dot(c, vec3<f32>(0.299,0.587,0.114));\n" +
"  l = clamp(l + 0.02*sin(u.time*0.25 + in.uv.y*6.2831), 0.0, 1.0);\n" +
"  var bayer = array<f32,16>(0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);\n" +
"  let bx = u32(in.pos.x) % 4u; let by = u32(in.pos.y) % 4u;\n" +
"  let t = (bayer[by*4u+bx]+0.5)/16.0 - 0.5;\n" +
"  let last = u.rampCount - 1.0;\n" +
"  let pos = clamp(l*last + t*u.dither, 0.0, last);\n" +
"  let idx = i32(floor(pos + 0.5));\n" +
"  let rc = textureLoad(rampT, vec2<i32>(idx, 0), 0).rgb;\n" +
"  return vec4<f32>(rc, 1.0);\n" +
"}\n";

  const WGSL_PART =
"struct U { time: f32, resx: f32, resy: f32, _p: f32 };\n" +
"@group(0) @binding(0) var<uniform> u: U;\n" +
"struct Inst { @location(0) pos: vec2<f32>, @location(1) size: f32, @location(2) color: vec3<f32>, @location(3) phase: f32, @location(4) speed: f32, @location(5) kind: f32, @location(6) twinkle: f32, @location(7) alpha: f32 };\n" +
"struct VsOut { @builtin(position) pos: vec4<f32>, @location(0) color: vec3<f32>, @location(1) quad: vec2<f32>, @location(2) alpha: f32 };\n" +
"@vertex fn vs(@builtin(vertex_index) vi: u32, inst: Inst) -> VsOut {\n" +
"  var corners = array<vec2<f32>,6>(vec2(-0.5,-0.5),vec2(0.5,-0.5),vec2(0.5,0.5),vec2(-0.5,-0.5),vec2(0.5,0.5),vec2(-0.5,0.5));\n" +
"  let q = corners[vi]; let t = u.time; var p = inst.pos; var a = inst.alpha;\n" +
"  let sway = sin(t*0.6 + inst.phase)*0.012; let k = i32(inst.kind + 0.5);\n" +
"  if(k==0){ p.y = fract(inst.pos.y - t*inst.speed); p.x = inst.pos.x + sway; a = inst.alpha*(0.6+0.4*sin(t*0.8+inst.phase)); }\n" +
"  else if(k==1){ p.y = fract(inst.pos.y - t*inst.speed*1.6); p.x = inst.pos.x + sway*1.5; a = inst.alpha*(0.5+0.5*sin(t*3.0+inst.phase)); }\n" +
"  else if(k==2){ p.y = fract(inst.pos.y + t*inst.speed); p.x = inst.pos.x + sin(t*0.9+inst.phase)*0.02; }\n" +
"  else { a = inst.alpha*(0.45+0.55*sin(t*inst.twinkle+inst.phase)); }\n" +
"  let center = vec2<f32>(p.x*2.0-1.0, 1.0 - p.y*2.0);\n" +
"  var off = q * (inst.size/vec2<f32>(u.resx,u.resy)) * 2.0; off.y = -off.y;\n" +
"  var o: VsOut; o.pos = vec4<f32>(center+off, 0.0, 1.0);\n" +
"  o.color = inst.color/255.0; o.quad = q; o.alpha = clamp(a,0.0,1.0); return o;\n" +
"}\n" +
"@fragment fn fs(in: VsOut) -> @location(0) vec4<f32> {\n" +
"  let d2 = dot(in.quad, in.quad);\n" +
"  if(d2 > 0.25){ discard; }\n" +
"  let a = in.alpha * (1.0 - d2*4.0);\n" +
"  return vec4<f32>(in.color * a, a);\n" +
"}\n";

  const WGSL_BURST =
"struct U { time: f32, resx: f32, resy: f32, grav: f32, drag: f32, _p0: f32, _p1: f32, _p2: f32 };\n" +
"@group(0) @binding(0) var<uniform> u: U;\n" +
"struct Inst { @location(0) p0: vec2<f32>, @location(1) vel: vec2<f32>, @location(2) size: f32, @location(3) color: vec3<f32>, @location(4) life: f32, @location(5) birth: f32, @location(6) vrot: f32 };\n" +
"struct VsOut { @builtin(position) pos: vec4<f32>, @location(0) color: vec3<f32>, @location(1) quad: vec2<f32>, @location(2) alpha: f32 };\n" +
"@vertex fn vs(@builtin(vertex_index) vi: u32, inst: Inst) -> VsOut {\n" +
"  var corners = array<vec2<f32>,6>(vec2(-0.5,-0.5),vec2(0.5,-0.5),vec2(0.5,0.5),vec2(-0.5,-0.5),vec2(0.5,0.5),vec2(-0.5,0.5));\n" +
"  let q = corners[vi];\n" +
"  let lt = u.time - inst.birth; let k = max(u.drag, 0.0001); let e = exp(-k*lt);\n" +
"  var pos = inst.p0;\n" +
"  pos.x = pos.x + inst.vel.x*(1.0-e)/k;\n" +
"  pos.y = pos.y + (u.grav/k)*lt + (inst.vel.y - u.grav/k)*(1.0-e)/k;\n" +
"  var alive = 0.0; if(lt >= 0.0 && lt <= inst.life){ alive = 1.0; }\n" +
"  let a = clamp(lt/0.08,0.0,1.0) * clamp(1.0 - lt/inst.life,0.0,1.0) * alive;\n" +
"  let rot = inst.vrot*lt; let cs = cos(rot); let sn = sin(rot);\n" +
"  let cr = vec2<f32>(q.x*cs - q.y*sn, q.x*sn + q.y*cs);\n" +
"  let center = vec2<f32>(pos.x*2.0-1.0, 1.0 - pos.y*2.0);\n" +
"  var off = cr * (inst.size/vec2<f32>(u.resx,u.resy)) * 2.0; off.y = -off.y;\n" +
"  var o: VsOut; o.pos = vec4<f32>(center+off, 0.0, 1.0);\n" +
"  o.color = inst.color/255.0; o.quad = q; o.alpha = a; return o;\n" +
"}\n" +
"@fragment fn fs(in: VsOut) -> @location(0) vec4<f32> {\n" +
"  let d2 = dot(in.quad, in.quad);\n" +
"  if(d2 > 0.25){ discard; }\n" +
"  let a = in.alpha * (1.0 - d2*4.0);\n" +
"  return vec4<f32>(in.color * a, a);\n" +
"}\n";

  // =========================================================================
  // WebGL2 backend
  // =========================================================================
  function compile(gl, type, src){
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS)){
      const log = gl.getShaderInfoLog(sh); gl.deleteShader(sh);
      throw new Error("FXGL shader compile failed: " + log);
    }
    return sh;
  }
  function program(gl, vs, fs){
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if(!gl.getProgramParameter(p, gl.LINK_STATUS)){
      const log = gl.getProgramInfoLog(p); gl.deleteProgram(p);
      throw new Error("FXGL program link failed: " + log);
    }
    return p;
  }

  function GLBackend(gl){
    this.gl = gl; this.name = "webgl2";
    this.sceneP = program(gl, GLSL_SCENE_VS, GLSL_SCENE_FS);
    this.partP = program(gl, GLSL_PART_VS, GLSL_PART_FS);
    this.burstP = program(gl, GLSL_BURST_VS, GLSL_PART_FS);  // burst reuses the splat FS
    this.u = {
      sScene: gl.getUniformLocation(this.sceneP, "uScene"),
      sRamp: gl.getUniformLocation(this.sceneP, "uRamp"),
      sCount: gl.getUniformLocation(this.sceneP, "uRampCount"),
      sDither: gl.getUniformLocation(this.sceneP, "uDither"),
      sTime: gl.getUniformLocation(this.sceneP, "uTime"),
      pTime: gl.getUniformLocation(this.partP, "uTime"),
      pRes: gl.getUniformLocation(this.partP, "uRes"),
      bTime: gl.getUniformLocation(this.burstP, "uTime"),
      bRes: gl.getUniformLocation(this.burstP, "uRes"),
      bGrav: gl.getUniformLocation(this.burstP, "uGrav"),
      bDrag: gl.getUniformLocation(this.burstP, "uDrag")
    };
    this.sceneTex = gl.createTexture();
    this.rampTex = gl.createTexture();
    this.instBuf = gl.createBuffer();
    this.burstBuf = gl.createBuffer();
    this.vao = gl.createVertexArray ? gl.createVertexArray() : null;
    this.burstVao = gl.createVertexArray ? gl.createVertexArray() : null;
    this.count = 0; this.burstCount = 0; this.rampCount = 2; this.dither = 1; this.w = 1; this.h = 1;
  }
  GLBackend.prototype.tex = function(tex, w, h, data){
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };
  // One-time upload: base scene texture, the ramp texture, and the static
  // particle instance buffer. Nothing here runs per-frame.
  GLBackend.prototype.setData = function(derived){
    const gl = this.gl;
    this.tex(this.sceneTex, derived.image.w, derived.image.h, derived.image.data);
    const ramp = derived.ramp, rd = new Uint8Array(ramp.length * 4);
    for(let i = 0; i < ramp.length; i++){ rd[i * 4] = ramp[i][0]; rd[i * 4 + 1] = ramp[i][1]; rd[i * 4 + 2] = ramp[i][2]; rd[i * 4 + 3] = 255; }
    this.tex(this.rampTex, ramp.length, 1, rd);
    this.rampCount = ramp.length; this.dither = derived.dither;

    const ps = derived.particles, FL = 11, arr = new Float32Array(ps.length * FL);
    for(let i = 0; i < ps.length; i++){
      const s = ps[i], o = i * FL;
      arr[o] = s.x; arr[o + 1] = s.y; arr[o + 2] = s.size;
      arr[o + 3] = s.r; arr[o + 4] = s.g; arr[o + 5] = s.b;
      arr[o + 6] = s.phase; arr[o + 7] = s.speed; arr[o + 8] = s.kind;
      arr[o + 9] = s.twinkle; arr[o + 10] = s.alpha;
    }
    this.count = ps.length;
    if(this.vao) gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    const stride = FL * 4;
    const setA = (loc, size, off) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off); gl.vertexAttribDivisor(loc, 1); };
    setA(0, 2, 0); setA(1, 1, 8); setA(2, 3, 12); setA(3, 1, 24); setA(4, 1, 28); setA(5, 1, 32); setA(6, 1, 36); setA(7, 1, 40);
    if(this.vao) gl.bindVertexArray(null);
  };
  // One-time upload of a celebration burst's static instance buffer (T94).
  GLBackend.prototype.setBurst = function(parts){
    const gl = this.gl, FL = 11, arr = new Float32Array(parts.length * FL);
    for(let i = 0; i < parts.length; i++){
      const s = parts[i], o = i * FL;
      arr[o] = s.x0; arr[o + 1] = s.y0; arr[o + 2] = s.vx; arr[o + 3] = s.vy;
      arr[o + 4] = s.size; arr[o + 5] = s.r; arr[o + 6] = s.g; arr[o + 7] = s.b;
      arr[o + 8] = s.life; arr[o + 9] = s.birth; arr[o + 10] = s.vrot;
    }
    this.burstCount = parts.length;
    if(this.burstVao) gl.bindVertexArray(this.burstVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.burstBuf);
    gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    const stride = FL * 4;
    const setA = (loc, size, off) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off); gl.vertexAttribDivisor(loc, 1); };
    setA(0, 2, 0); setA(1, 2, 8); setA(2, 1, 16); setA(3, 3, 20); setA(4, 1, 32); setA(5, 1, 36); setA(6, 1, 40);
    if(this.burstVao) gl.bindVertexArray(null);
  };
  GLBackend.prototype.resize = function(w, h){ this.w = Math.max(1, w | 0); this.h = Math.max(1, h | 0); this.gl.viewport(0, 0, this.w, this.h); };
  // Unified frame: clear (opaque under a scene backdrop, transparent for a
  // burst-only overlay), draw the scene + ambient field, then the burst on top.
  GLBackend.prototype.renderFrame = function(o){
    const gl = this.gl, u = this.u, sceneOn = !!o.sceneOn, burstOn = !!o.burstOn;
    gl.viewport(0, 0, this.w, this.h);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, sceneOn ? 1 : 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if(sceneOn){
      // pass 1 — the dithered, palette-quantised scene
      gl.disable(gl.BLEND);
      gl.useProgram(this.sceneP);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.sceneTex); gl.uniform1i(u.sScene, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.rampTex); gl.uniform1i(u.sRamp, 1);
      gl.uniform1f(u.sCount, this.rampCount); gl.uniform1f(u.sDither, this.dither); gl.uniform1f(u.sTime, o.sceneTime || 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // pass 2 — the additive instanced ambient particle field (one draw call)
      if(this.count > 0){
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
        gl.useProgram(this.partP);
        gl.uniform1f(u.pTime, o.sceneTime || 0); gl.uniform2f(u.pRes, this.w, this.h);
        if(this.vao) gl.bindVertexArray(this.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.count);
        if(this.vao) gl.bindVertexArray(null);
        gl.disable(gl.BLEND);
      }
    }
    // pass 3 — the celebration burst, additive over whatever is beneath it
    if(burstOn && this.burstCount > 0){
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(this.burstP);
      gl.uniform1f(u.bTime, o.burstTime || 0); gl.uniform2f(u.bRes, this.w, this.h);
      gl.uniform1f(u.bGrav, BURST_GRAVITY); gl.uniform1f(u.bDrag, BURST_DRAG);
      if(this.burstVao) gl.bindVertexArray(this.burstVao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.burstCount);
      if(this.burstVao) gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
    }
  };
  GLBackend.prototype.dispose = function(){
    const gl = this.gl;
    gl.deleteTexture && gl.deleteTexture(this.sceneTex);
    gl.deleteTexture && gl.deleteTexture(this.rampTex);
    gl.deleteBuffer && gl.deleteBuffer(this.instBuf);
    gl.deleteBuffer && gl.deleteBuffer(this.burstBuf);
    gl.deleteProgram && gl.deleteProgram(this.sceneP);
    gl.deleteProgram && gl.deleteProgram(this.partP);
    gl.deleteProgram && gl.deleteProgram(this.burstP);
    if(this.vao && gl.deleteVertexArray) gl.deleteVertexArray(this.vao);
    if(this.burstVao && gl.deleteVertexArray) gl.deleteVertexArray(this.burstVao);
  };

  // =========================================================================
  // WebGPU backend — progressive enhancement (real, browser-only)
  // =========================================================================
  function GPUBackend(device, ctx, format){
    this.name = "webgpu"; this.device = device; this.ctx = ctx; this.format = format;
    this.w = 1; this.h = 1; this.count = 0; this.burstCount = 0;
    const sm = device.createShaderModule({ code: WGSL_SCENE });
    const pm = device.createShaderModule({ code: WGSL_PART });
    const bm = device.createShaderModule({ code: WGSL_BURST });
    this.sceneU = device.createBuffer({ size: 16, usage: 0x40 | 0x8 /* UNIFORM|COPY_DST */ });
    this.partU = device.createBuffer({ size: 16, usage: 0x40 | 0x8 });
    this.burstU = device.createBuffer({ size: 32, usage: 0x40 | 0x8 });
    this.sampler = device.createSampler({ magFilter: "nearest", minFilter: "nearest" });
    this.scenePipe = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: sm, entryPoint: "vs" },
      fragment: { module: sm, entryPoint: "fs", targets: [{ format: format }] },
      primitive: { topology: "triangle-list" }
    });
    const fl = (off, fmt, loc) => ({ shaderLocation: loc, offset: off, format: fmt });
    this.partPipe = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: pm, entryPoint: "vs",
        buffers: [{
          arrayStride: 44, stepMode: "instance",
          attributes: [ fl(0, "float32x2", 0), fl(8, "float32", 1), fl(12, "float32x3", 2), fl(24, "float32", 3), fl(28, "float32", 4), fl(32, "float32", 5), fl(36, "float32", 6), fl(40, "float32", 7) ]
        }]
      },
      fragment: {
        module: pm, entryPoint: "fs",
        targets: [{ format: format, blend: {
          color: { srcFactor: "one", dstFactor: "one", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one", operation: "add" }
        } }]
      },
      primitive: { topology: "triangle-list" }
    });
    this.burstPipe = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: bm, entryPoint: "vs",
        buffers: [{
          arrayStride: 44, stepMode: "instance",
          attributes: [ fl(0, "float32x2", 0), fl(8, "float32x2", 1), fl(16, "float32", 2), fl(20, "float32x3", 3), fl(32, "float32", 4), fl(36, "float32", 5), fl(40, "float32", 6) ]
        }]
      },
      fragment: {
        module: bm, entryPoint: "fs",
        targets: [{ format: format, blend: {
          color: { srcFactor: "one", dstFactor: "one", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one", operation: "add" }
        } }]
      },
      primitive: { topology: "triangle-list" }
    });
  }
  GPUBackend.prototype.setData = function(derived){
    const d = this.device, img = derived.image;
    this.sceneTex = d.createTexture({ size: [img.w, img.h, 1], format: "rgba8unorm", usage: 0x4 | 0x2 /* TEXTURE_BINDING|COPY_DST */ });
    d.queue.writeTexture({ texture: this.sceneTex }, img.data, { bytesPerRow: img.w * 4, rowsPerImage: img.h }, [img.w, img.h, 1]);
    const ramp = derived.ramp, rd = new Uint8Array(ramp.length * 4);
    for(let i = 0; i < ramp.length; i++){ rd[i * 4] = ramp[i][0]; rd[i * 4 + 1] = ramp[i][1]; rd[i * 4 + 2] = ramp[i][2]; rd[i * 4 + 3] = 255; }
    this.rampTex = d.createTexture({ size: [ramp.length, 1, 1], format: "rgba8unorm", usage: 0x4 | 0x2 });
    d.queue.writeTexture({ texture: this.rampTex }, rd, { bytesPerRow: ramp.length * 4, rowsPerImage: 1 }, [ramp.length, 1, 1]);
    this.rampCount = ramp.length; this.dither = derived.dither;
    this.sceneBind = d.createBindGroup({ layout: this.scenePipe.getBindGroupLayout(0), entries: [
      { binding: 0, resource: this.sceneTex.createView() },
      { binding: 1, resource: this.sampler },
      { binding: 2, resource: this.rampTex.createView() },
      { binding: 3, resource: { buffer: this.sceneU } }
    ] });
    this.partBind = d.createBindGroup({ layout: this.partPipe.getBindGroupLayout(0), entries: [ { binding: 0, resource: { buffer: this.partU } } ] });
    const ps = derived.particles, arr = new Float32Array(ps.length * 11);
    for(let i = 0; i < ps.length; i++){ const s = ps[i], o = i * 11;
      arr[o] = s.x; arr[o + 1] = s.y; arr[o + 2] = s.size; arr[o + 3] = s.r; arr[o + 4] = s.g; arr[o + 5] = s.b;
      arr[o + 6] = s.phase; arr[o + 7] = s.speed; arr[o + 8] = s.kind; arr[o + 9] = s.twinkle; arr[o + 10] = s.alpha; }
    this.count = ps.length;
    if(ps.length){ this.instBuf = d.createBuffer({ size: arr.byteLength, usage: 0x20 | 0x8 /* VERTEX|COPY_DST */ }); d.queue.writeBuffer(this.instBuf, 0, arr); }
  };
  GPUBackend.prototype.setBurst = function(parts){
    const d = this.device;
    if(!this.burstBind) this.burstBind = d.createBindGroup({ layout: this.burstPipe.getBindGroupLayout(0), entries: [ { binding: 0, resource: { buffer: this.burstU } } ] });
    const arr = new Float32Array(parts.length * 11);
    for(let i = 0; i < parts.length; i++){ const s = parts[i], o = i * 11;
      arr[o] = s.x0; arr[o + 1] = s.y0; arr[o + 2] = s.vx; arr[o + 3] = s.vy; arr[o + 4] = s.size;
      arr[o + 5] = s.r; arr[o + 6] = s.g; arr[o + 7] = s.b; arr[o + 8] = s.life; arr[o + 9] = s.birth; arr[o + 10] = s.vrot; }
    this.burstCount = parts.length;
    if(this.burstBuf && this.burstBuf.destroy) this.burstBuf.destroy();
    if(parts.length){ this.burstBuf = d.createBuffer({ size: arr.byteLength, usage: 0x20 | 0x8 }); d.queue.writeBuffer(this.burstBuf, 0, arr); }
  };
  GPUBackend.prototype.resize = function(w, h){ this.w = Math.max(1, w | 0); this.h = Math.max(1, h | 0); };
  GPUBackend.prototype.renderFrame = function(o){
    const d = this.device, sceneOn = !!o.sceneOn, burstOn = !!o.burstOn;
    const st = o.sceneTime || 0, bt = o.burstTime || 0;
    if(sceneOn){ d.queue.writeBuffer(this.sceneU, 0, new Float32Array([this.rampCount, this.dither, st, 0])); d.queue.writeBuffer(this.partU, 0, new Float32Array([st, this.w, this.h, 0])); }
    if(burstOn) d.queue.writeBuffer(this.burstU, 0, new Float32Array([bt, this.w, this.h, BURST_GRAVITY, BURST_DRAG, 0, 0, 0]));
    const enc = d.createCommandEncoder();
    const view = this.ctx.getCurrentTexture().createView();
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: view, clearValue: { r: 0, g: 0, b: 0, a: sceneOn ? 1 : 0 }, loadOp: "clear", storeOp: "store" }] });
    if(sceneOn){
      pass.setPipeline(this.scenePipe); pass.setBindGroup(0, this.sceneBind); pass.draw(3, 1, 0, 0);
      if(this.count > 0){ pass.setPipeline(this.partPipe); pass.setBindGroup(0, this.partBind); pass.setVertexBuffer(0, this.instBuf); pass.draw(6, this.count, 0, 0); }
    }
    if(burstOn && this.burstCount > 0){ pass.setPipeline(this.burstPipe); pass.setBindGroup(0, this.burstBind); pass.setVertexBuffer(0, this.burstBuf); pass.draw(6, this.burstCount, 0, 0); }
    pass.end(); d.queue.submit([enc.finish()]);
  };
  GPUBackend.prototype.dispose = function(){
    this.sceneTex && this.sceneTex.destroy && this.sceneTex.destroy();
    this.rampTex && this.rampTex.destroy && this.rampTex.destroy();
    this.instBuf && this.instBuf.destroy && this.instBuf.destroy();
    this.burstBuf && this.burstBuf.destroy && this.burstBuf.destroy();
  };

  // =========================================================================
  // CPU still backend — the no-GPU / reduced-motion fallback (a static still)
  // =========================================================================
  function CPUBackend(ctx2d){ this.name = "cpu-still"; this.ctx = ctx2d; this.w = 1; this.h = 1; this.burst = null; }
  CPUBackend.prototype.setData = function(derived){ this.derived = derived; };
  CPUBackend.prototype.setBurst = function(parts){ this.burst = parts; this.burstCount = parts.length; };
  CPUBackend.prototype.resize = function(w, h){ this.w = Math.max(1, w | 0); this.h = Math.max(1, h | 0); };
  // Frame: the dithered scene still (if any) + a modest, capped 2D celebration
  // flourish (the no-GPU path stays light — filled motes, no GPU particles).
  CPUBackend.prototype.renderFrame = function(o){
    const ctx = this.ctx; if(!ctx) return;
    if(o.sceneOn && this.derived) this._still();
    else if(!o.sceneOn && ctx.clearRect) ctx.clearRect(0, 0, this.w, this.h);
    if(o.burstOn && this.burst && this.burst.length && ctx.fillRect){
      const W = this.w, H = this.h, t = o.burstTime || 0;
      for(let i = 0; i < this.burst.length; i++){
        const bp = burstPos(this.burst[i], t, BURST_GRAVITY, BURST_DRAG);
        if(!bp.alive || bp.alpha <= 0.01) continue;
        const s = this.burst[i].size;
        if(ctx.globalAlpha != null) ctx.globalAlpha = bp.alpha;
        ctx.fillStyle = toHex([this.burst[i].r, this.burst[i].g, this.burst[i].b]);
        ctx.fillRect((bp.x * W - s / 2) | 0, (bp.y * H - s / 2) | 0, Math.ceil(s), Math.ceil(s));
      }
      if(ctx.globalAlpha != null) ctx.globalAlpha = 1;
    }
  };
  CPUBackend.prototype._still = function(){
    const ctx = this.ctx, d = this.derived; if(!ctx || !d) return;
    const img = d.image, W = this.w, H = this.h;
    if(ctx.createImageData && ctx.putImageData){
      const out = ctx.createImageData(W, H), data = out.data;
      for(let y = 0; y < H; y++){
        const gy = Math.min(img.h - 1, (y * img.h / H) | 0);
        for(let x = 0; x < W; x++){
          const gx = Math.min(img.w - 1, (x * img.w / W) | 0);
          const so = (gy * img.w + gx) * 4;
          const px = quantizePixel([img.data[so], img.data[so + 1], img.data[so + 2]], x, y, d.ramp, d.dither);
          const o = (y * W + x) * 4;
          data[o] = px[0]; data[o + 1] = px[1]; data[o + 2] = px[2]; data[o + 3] = 255;
        }
      }
      ctx.putImageData(out, 0, 0);
    } else {
      // last-ditch: blocky cell fill (still legible) for a context without
      // ImageData (keeps the layer reversible to today's static look).
      const cw = W / img.w, ch = H / img.h;
      for(let r = 0; r < img.h; r++) for(let c = 0; c < img.w; c++){
        const so = (r * img.w + c) * 4;
        const px = quantizePixel([img.data[so], img.data[so + 1], img.data[so + 2]], c * 4, r * 4, d.ramp, d.dither);
        ctx.fillStyle = toHex(px); ctx.fillRect((c * cw) | 0, (r * ch) | 0, Math.ceil(cw) + 1, Math.ceil(ch) + 1);
      }
    }
  };
  CPUBackend.prototype.dispose = function(){};

  // =========================================================================
  // Capability detection
  // =========================================================================
  function reducedMotion(){
    try{ return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch(e){ return false; }
  }
  function autoQuality(){
    let q = 2;
    try{
      const dpr = (typeof devicePixelRatio === "number" && devicePixelRatio) || 1;
      const cores = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4;
      if(cores <= 4 || dpr >= 3) q = 1;
      if(cores <= 2) q = 0;
    }catch(e){}
    return q;
  }
  function capabilities(){
    const caps = { webgpu: false, webgl2: false, reducedMotion: reducedMotion() };
    try{ caps.webgpu = typeof navigator !== "undefined" && !!navigator.gpu; }catch(e){}
    try{
      if(typeof document !== "undefined" && document.createElement){
        const c = document.createElement("canvas");
        caps.webgl2 = !!(c.getContext && c.getContext("webgl2"));
      }
    }catch(e){}
    return caps;
  }

  // =========================================================================
  // Controller — owns the canvas, the single RAF, the degrade ladder
  // =========================================================================
  function Controller(canvas, opts){
    opts = opts || {};
    this.canvas = canvas || null;
    this.opts = opts;
    this.raf = opts.raf || (typeof requestAnimationFrame === "function" ? requestAnimationFrame.bind(null) : null);
    this.caf = opts.caf || (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame.bind(null) : function(){});
    this.reduced = (opts.reducedMotion != null) ? !!opts.reducedMotion : reducedMotion();
    this.quality = (opts.quality != null) ? (opts.quality | 0) : autoQuality();
    this.backend = null;
    this.scene = null;
    this.derived = null;
    this.running = false;          // ambient scene loop intent
    this.rafId = 0;
    this.sceneTs = 0;
    this.ready = false;
    this.wantStart = false;
    // transient celebration-burst subsystem (T94): a rolling, capped buffer with
    // its own clock; particles carry per-particle birth so flurries coalesce.
    this.burst_ = { parts: [], active: false, startTs: 0, elapsed: 0, maxDeath: 0 };
    this._frameCb = this._frame.bind(this);
    this._init();
  }
  Controller.prototype.particleCap = function(){
    const q = QUALITY[Math.max(0, Math.min(2, this.quality))];
    return Math.max(0, Math.min(PARTICLE_CAP, Math.round(PARTICLE_CAP * q.particles)));
  };
  Controller.prototype._cssSize = function(){
    const o = this.opts, cv = this.canvas;
    const w = o.width || (cv && cv.clientWidth) || (typeof innerWidth === "number" && innerWidth) || 360;
    const h = o.height || (cv && cv.clientHeight) || (typeof innerHeight === "number" && innerHeight) || 640;
    return { w: w, h: h };
  };
  Controller.prototype._applyResize = function(){
    if(!this.backend) return;
    const q = QUALITY[Math.max(0, Math.min(2, this.quality))];
    const dpr = (this.opts.dpr != null) ? this.opts.dpr : ((typeof devicePixelRatio === "number" && devicePixelRatio) || 1);
    const css = this._cssSize();
    const w = Math.max(1, Math.round(css.w * dpr * q.res));
    const h = Math.max(1, Math.round(css.h * dpr * q.res));
    if(this.canvas){ this.canvas.width = w; this.canvas.height = h; }
    this.backend.resize(w, h);
  };
  Controller.prototype._init = function(){
    const o = this.opts;
    // Forced/injected backend (tests + explicit caller choice).
    if(o.gl){ this._use(new GLBackend(o.gl)); return; }
    if(o.device && o.gpuContext){ this._use(new GPUBackend(o.device, o.gpuContext, o.format || "bgra8unorm")); return; }
    // WebGPU-first: only when eligible. It needs an async adapter/device, so we
    // resolve it before acquiring a canvas context (a canvas binds one API).
    const wantGPU = !o.preferWebGL2 && !this.reduced && typeof navigator !== "undefined" && navigator.gpu && this.canvas && this.canvas.getContext;
    if(wantGPU){ const self = this; this._initWebGPU().catch(function(){ self._initSync(); }); return; }
    this._initSync();
  };
  Controller.prototype._initWebGPU = function(){
    const self = this, canvas = this.canvas;
    return navigator.gpu.requestAdapter().then(function(adapter){
      if(!adapter) throw new Error("no adapter");
      return adapter.requestDevice();
    }).then(function(device){
      const ctx = canvas.getContext("webgpu");
      if(!ctx) throw new Error("no webgpu context");
      const format = (navigator.gpu.getPreferredCanvasFormat && navigator.gpu.getPreferredCanvasFormat()) || "bgra8unorm";
      ctx.configure({ device: device, format: format, alphaMode: "premultiplied" });
      self._use(new GPUBackend(device, ctx, format));
    });
  };
  Controller.prototype._initSync = function(){
    const o = this.opts, cv = this.canvas;
    // Try WebGL2, then a 2D still.
    let gl = null;
    try{ gl = cv && cv.getContext && cv.getContext("webgl2"); }catch(e){}
    if(gl){ try{ this._use(new GLBackend(gl)); return; }catch(e){} }
    let ctx2d = o.ctx2d || null;
    try{ if(!ctx2d) ctx2d = cv && cv.getContext && cv.getContext("2d"); }catch(e){}
    this._use(new CPUBackend(ctx2d));
  };
  // The ambient scene animates only when started AND not reduced-motion; the
  // loop also runs while a burst is alive. Single source of truth for the RAF.
  Controller.prototype._ambientLoops = function(){ return this.running && !this.reduced && !!this.derived; };
  Controller.prototype._needsFrame = function(){ return this._ambientLoops() || this.burst_.active; };
  // A "still" surface never animates the ambient layer (reduced motion or the
  // no-GPU CPU backend) — it shows a single static frame instead.
  Controller.prototype._isStill = function(){ return this.reduced || (this.backend && this.backend.name === "cpu-still"); };
  // Draw exactly one frame (the still / current state) without scheduling more.
  Controller.prototype._renderOnce = function(){
    if(!this.backend) return;
    this.backend.renderFrame({ sceneOn: !!this.derived, sceneTime: 0, burstOn: this.burst_.active, burstTime: this.burst_.elapsed });
  };
  // Pump the single shared RAF iff a frame is actually needed and none is queued.
  Controller.prototype._pump = function(){
    if(this.rafId || !this.raf || !this.ready) return;
    if(this._needsFrame()) this.rafId = this.raf(this._frameCb);
  };
  Controller.prototype._frame = function(ts){
    this.rafId = 0;
    if(!this._needsFrame()) return;                          // stopped between frames → idle
    const sceneOn = !!this.derived;
    let sceneTime = 0;
    if(this._ambientLoops()){ if(!this.sceneTs) this.sceneTs = ts; sceneTime = (ts - this.sceneTs) / 1000; }
    if(this.burst_.active){
      if(!this.burst_.startTs) this.burst_.startTs = ts;
      this.burst_.elapsed = (ts - this.burst_.startTs) / 1000;
    }
    this.backend.renderFrame({ sceneOn: sceneOn, sceneTime: sceneTime, burstOn: this.burst_.active, burstTime: this.burst_.elapsed });
    // auto-stop the burst once its last particle has expired (no RAF leak)
    if(this.burst_.active && this.burst_.elapsed > this.burst_.maxDeath){
      this.burst_.active = false; this.burst_.startTs = 0; this.burst_.elapsed = 0; this.burst_.maxDeath = 0; this.burst_.parts = [];
      if(this.backend.setBurst) this.backend.setBurst([]);
    }
    if(this._needsFrame()) this.rafId = this.raf(this._frameCb);   // keep the single loop alive
  };
  Controller.prototype._use = function(backend){
    this.backend = backend;
    this.ready = true;
    this._applyResize();
    if(this.derived) backend.setData(this.derived);
    if(this.derived && this._isStill()) this._renderOnce();   // static still
    if(this.wantStart){ this.wantStart = false; this.start(); }
    this._pump();
  };
  Controller.prototype.setScene = function(scene){
    this.scene = scene;
    this.derived = deriveScene(scene, this.particleCap());
    if(this.backend){
      this.backend.setData(this.derived);
      if(this._isStill()) this._renderOnce();   // reduced/no-GPU → refresh the still
    }
    return this;
  };
  // Semantic home backdrop (T95): derive a calm ambient scene from live home
  // state and apply it. Re-callable as state changes (progress / event / streak).
  Controller.prototype.setHomeState = function(state){ return this.setScene(deriveHomeScene(state)); };
  Controller.prototype.setQuality = function(q){
    this.quality = Math.max(0, Math.min(2, q | 0));
    // Re-seed at the new particle cap and re-fit the buffer.
    if(this.scene){ this.derived = deriveScene(this.scene, this.particleCap()); if(this.backend) this.backend.setData(this.derived); }
    this._applyResize();
    if(this.backend && this._isStill() && this.derived) this._renderOnce();
    return this;
  };
  Controller.prototype.start = function(){
    if(!this.ready){ this.wantStart = true; return this; }
    if(this.running) return this;
    this.running = true; this.sceneTs = 0;
    if(this._ambientLoops()) this._pump();                       // animate
    else if(this._isStill() && this.derived) this._renderOnce();  // reduced/static → one still
    return this;
  };
  Controller.prototype.stop = function(){
    this.running = false; this.sceneTs = 0;
    // keep the loop only if a burst is still alive; otherwise idle the RAF
    if(this.rafId && !this.burst_.active){ this.caf(this.rafId); this.rafId = 0; }
    return this;
  };
  // Fire a brief celebration burst (T94). Purpose = CELEBRATION. Capped, seeded
  // (deterministic), reduced-motion → a calm flourish, auto-stops with no RAF
  // leak. Coalesces with an in-flight burst (rapid gains stack up to the cap).
  Controller.prototype.burst = function(opts){
    if(!this.ready || !this.backend) return this;
    const seeded = seedBurst(opts, this.reduced, BURST_CAP);
    if(!seeded.length) return this;
    if(!this.burst_.active){ this.burst_.parts = []; this.burst_.elapsed = 0; this.burst_.maxDeath = 0; this.burst_.startTs = 0; this.burst_.active = true; }
    const birth = this.burst_.elapsed;
    for(let i = 0; i < seeded.length; i++) seeded[i].birth = birth;
    let parts = this.burst_.parts.concat(seeded);
    if(parts.length > BURST_CAP) parts = parts.slice(parts.length - BURST_CAP);   // drop oldest
    this.burst_.parts = parts;
    this.burst_.maxDeath = Math.max(this.burst_.maxDeath, burstMaxDeath(seeded));
    this.backend.setBurst(parts);
    this._pump();
    return this;
  };
  Controller.prototype.resize = function(){ this._applyResize(); if(this.backend && this._isStill() && this.derived) this._renderOnce(); return this; };
  Controller.prototype.dispose = function(){ this.stop(); this.burst_.active = false; if(this.rafId){ this.caf(this.rafId); this.rafId = 0; } if(this.backend) this.backend.dispose(); this.backend = null; this.ready = false; return this; };
  Controller.prototype.isAnimating = function(){ return this._ambientLoops(); };
  Controller.prototype.isBursting = function(){ return this.burst_.active; };
  Controller.prototype.particleCount = function(){ return this.derived ? this.derived.particles.length : 0; };
  Controller.prototype.burstCount = function(){ return this.burst_.parts.length; };
  Controller.prototype.backendName = function(){ return this.backend ? this.backend.name : null; };

  // =========================================================================
  // Public facade — a singleton "active" controller + multi-mount support
  // =========================================================================
  let active = null;
  function mount(canvas, opts){ active = new Controller(canvas, opts); return active; }
  function setScene(scene){ if(active) active.setScene(scene); return active; }
  function start(){ if(active) active.start(); return active; }
  function stop(){ if(active) active.stop(); return active; }
  function setQuality(q){ if(active) active.setQuality(q); return active; }
  function dispose(){ if(active){ active.dispose(); active = null; } }
  function burst(opts){ if(active) active.burst(opts); return active; }
  function setHomeState(state){ if(active) active.setHomeState(state); return active; }

  window.FXGL = {
    // runtime API
    mount: mount, setScene: setScene, setHomeState: setHomeState, start: start, stop: stop, burst: burst,
    setQuality: setQuality, dispose: dispose, resize: function(){ if(active) active.resize(); },
    capabilities: capabilities, active: function(){ return active; },
    Controller: Controller,
    // budget constants
    PARTICLE_CAP: PARTICLE_CAP, BURST_CAP: BURST_CAP, BURST_GRAVITY: BURST_GRAVITY, BURST_DRAG: BURST_DRAG,
    HOME_PARTICLE_MAX: HOME_PARTICLE_MAX, QUALITY: QUALITY, KIND: KIND, BAYER: BAYER,
    // pure math (headless-tested)
    bayer4: bayer4, parseColor: parseColor, toHex: toHex, luma: luma,
    buildRamp: buildRamp, rampIndex: rampIndex, quantizePixel: quantizePixel,
    gridToImage: gridToImage, gridColors: gridColors,
    makeRng: makeRng, seedParticles: seedParticles, animateParticle: animateParticle,
    seedBurst: seedBurst, burstPos: burstPos, burstMaxDeath: burstMaxDeath,
    deriveScene: deriveScene, deriveHomeScene: deriveHomeScene, seedFromHome: seedFromHome,
    // shader sources (so a wiring task / tests can inspect them)
    shaders: { GLSL_SCENE_VS: GLSL_SCENE_VS, GLSL_SCENE_FS: GLSL_SCENE_FS, GLSL_PART_VS: GLSL_PART_VS, GLSL_PART_FS: GLSL_PART_FS, GLSL_BURST_VS: GLSL_BURST_VS, WGSL_SCENE: WGSL_SCENE, WGSL_PART: WGSL_PART, WGSL_BURST: WGSL_BURST }
  };
})();
