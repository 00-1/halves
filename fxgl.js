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
  const CELEBRATE_CAP = 800;        // higher ceiling for the big celebration shower (T126)
  const BURST_GRAVITY = 1.2;        // screen-fractions / s²  (down = +y)
  const BURST_DRAG = 1.6;           // velocity damping rate (1/s)

  // Home backdrop (T95): a calm, legible ambient field — its own modest cap,
  // well under the Arena's, so the home screen stays readable and cheap to idle.
  const HOME_PARTICLE_MAX = 120;
  // Arena biome (T108): livelier than home (it dresses a battle) but still capped.
  const ARENA_PARTICLE_MAX = 220;

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

  // T152 — particle SIZE + SPREAD options (the owner's "very small particles, emanating
  // from the point of interest"). Sizes are SCREEN px (the CPU path multiplies by
  // pxScale=dpr·res and the GL/WebGPU path divides uRes, so a value is crisp on-device
  // — T138); a small-but-real floor keeps "small" from going sub-pixel/invisible.
  const MIN_PARTICLE_PX = 2;   // smallest on-screen particle (matches the CPU draw floor)
  // Resolve [min,max] particle size (screen px) from opts. No opts → the caller's
  // defaults (byte-identical, so the goldens/determinism hold). `sizePx` sets an
  // explicit MAX (small/fine), `sizeScale` multiplies; both floor at MIN_PARTICLE_PX.
  function sizeRange(opts, defMin, defMax){
    let hi = defMax, lo = defMin;
    if(opts.sizePx != null && opts.sizePx > 0){ hi = opts.sizePx; lo = opts.sizePx * (defMin / defMax); }
    const sc = (opts.sizeScale != null && opts.sizeScale > 0) ? opts.sizeScale : 1;
    hi *= sc; lo *= sc;
    lo = Math.max(MIN_PARTICLE_PX, lo); hi = Math.max(lo, hi);
    return [lo, hi];
  }
  // Spread multiplier on the outward spray: 1 = default, <1 hugs the source point
  // (emanate-from-the-thing), >1 wider. Clamped sane. No opt → 1 (identical default).
  function spreadMul(opts){
    const s = (opts.spread != null && opts.spread > 0) ? opts.spread : 1;
    return Math.max(0.05, Math.min(4, s));
  }

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
    // T193 (re-open) — a COIN shower: when the caller asks for `look:"coin"` (the money-gain
    // burst), tag each particle look:1 + spin fields so the controller routes it to the 2D coin
    // layer (drawCoinParticle → a spinning cell-shaded CYLINDER) on EVERY backend, instead of
    // the shader splat (which renders a square). Default to the gold ramp when no palette given.
    const coin = opts.look === "coin";
    let pool = (opts.palette && opts.palette.length) ? opts.palette.map(parseColor)
             : coin ? GOLD_TONES.slice() : [[255, 217, 138], [255, 255, 255]];
    if(!pool.length) pool = [[255, 255, 255]];
    const sprd = spreadMul(opts);                            // T152: tighten/widen the spray
    const sMax = (reduced ? 0.22 : 0.85) * sprd;             // peak outward speed (screen-frac/s)
    const up = reduced ? 0.10 : 0.42;       // upward kick (confetti arc)
    const lMax = reduced ? 0.7 : 1.4;       // longest life (s)
    const spin = reduced ? 1.5 : 9;         // rotation rate spread
    const sz = coin ? sizeRange(opts, reduced ? 5 : 6, reduced ? 8 : 12)   // coins read a touch bigger
                    : sizeRange(opts, 2, reduced ? 4 : 7);                  // T152: small/fine confetti
    const out = new Array(n);
    for(let i = 0; i < n; i++){
      const ang = rng() * TAU, spd = lerp(0.14 * sprd, sMax, rng());
      const col = pool[(rng() * pool.length) | 0];
      const p = {
        x0: x0, y0: y0,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - lerp(up * 0.4, up, rng()),  // bias upward
        size: lerp(sz[0], sz[1], rng()),
        r: col[0], g: col[1], b: col[2],
        life: lerp(0.6, lMax, rng()),
        vrot: lerp(-spin, spin, rng()),
        birth: 0
      };
      // coin extras (extra rng draws live ONLY in this branch, so the confetti seed sequence —
      // and its goldens — are byte-identical when look!=="coin").
      if(coin){
        p.look = 1;
        p.rot = rng() * TAU;
        p.spin = (reduced ? 0.6 : 1) * lerp(6, 15, rng()) * (rng() < 0.5 ? -1 : 1);   // tumble as it flies
        p.wob = lerp(7, 16, rng()); p.phase = rng() * TAU;                            // face↔edge tip rate + phase
      }
      out[i] = p;
    }
    return out;
  }

  // Seed a BIG celebration burst (T126) — the owner's "loads of particles": many
  // more, bigger, longer-lived, a tall firework/shower (strong upward launch +
  // gravity fall), bright multi-colour by default. Same particle shape + closed-
  // form trajectory as seedBurst, so it rides the SAME instanced/in-shader path
  // (the higher count stays in budget) and the SAME auto-stop/no-leak machinery.
  // Deterministic from `seed`; reduced motion → a calmer, shorter shower.
  function seedCelebrate(opts, reduced, cap){
    opts = opts || {};
    const x0 = clamp01(opts.x != null ? opts.x : 0.5);
    const y0 = clamp01(opts.y != null ? opts.y : 0.6);    // a touch low → launches up into view
    const want = (opts.count != null) ? (opts.count | 0) : 500;
    const scale = reduced ? 0.3 : 1;
    const n = Math.max(0, Math.min(cap | 0, Math.round(want * scale)));
    const rng = makeRng((opts.seed | 0) || 0x9e3a17c5);
    // T193 (re-open) — a coin shower variant here too (look:"coin" → gold cylinders on the 2D
    // coin layer); the default festive confetti is unchanged.
    const coin = opts.look === "coin";
    let pool = (opts.palette && opts.palette.length) ? opts.palette.map(parseColor)
             : coin ? GOLD_TONES.slice()
             : [[255, 217, 138], [255, 255, 255], [120, 220, 255], [255, 140, 200], [180, 255, 160]];   // bright, festive
    if(!pool.length) pool = [[255, 255, 255]];
    const sprd = spreadMul(opts);                            // T152: tighten/widen the spray
    const sMax = (reduced ? 0.5 : 1.4) * sprd;              // wider, faster spray
    const up = reduced ? 0.3 : 0.9;         // tall fountain launch
    const lMax = reduced ? 1.0 : 2.4;       // longer-lived (a real shower)
    const spin = reduced ? 2 : 11;
    const sz = coin ? sizeRange(opts, reduced ? 6 : 8, reduced ? 9 : 16)
                    : sizeRange(opts, 6, reduced ? 8 : 18);  // T152: small/fine via sizePx/sizeScale (default bold flakes)
    const out = new Array(n);
    for(let i = 0; i < n; i++){
      const ang = rng() * TAU, spd = lerp(0.2 * sprd, sMax, rng());
      const col = pool[(rng() * pool.length) | 0];
      const p = {
        x0: x0, y0: y0,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - lerp(up * 0.5, up, rng()),  // strong upward launch → arc + fall
        size: lerp(sz[0], sz[1], rng()),
        r: col[0], g: col[1], b: col[2],
        life: lerp(1.0, lMax, rng()),
        vrot: lerp(-spin, spin, rng()),
        birth: 0
      };
      if(coin){   // extra rng draws live ONLY here → confetti goldens unchanged
        p.look = 1;
        p.rot = rng() * TAU;
        p.spin = (reduced ? 0.6 : 1) * lerp(6, 15, rng()) * (rng() < 0.5 ? -1 : 1);
        p.wob = lerp(7, 16, rng()); p.phase = rng() * TAU;
      }
      out[i] = p;
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

  // ===========================================================================
  // GOLD HOARD (T172) — the owner's Smaug/Scrooge pile. Per the T174 research pass
  // (docs/research-coin-hoard.md): IMPRESSION, not physics — imply the bulk with a
  // shaped, lit mound SILHOUETTE + dither shading, and render only the SURFACE coins
  // (scattered, per-coin varied: angle/squash/tone/glint) you'd actually see; never
  // the buried interior. All opt-in (`scene.hoard` / `look:"coin"`); existing scenes
  // stay byte-identical. Fits PARTICLE_CAP (512) + the degrade ladder; reduced-motion
  // → a static pile. Pure math here is headless-tested like the other fxgl maths.
  // ===========================================================================
  const HOARD_CAP = 480;            // surface-coin ceiling at full level (≪ PARTICLE_CAP 512) — fuller pile (T192)
  const HOARD_K = 600;              // saturating-curve constant: gold==K → level 0.5
  const HOARD_MAX_H = 1.0;          // T199: a level-1.0 pile's wall-banked sides reach the TOP (centre dips lower)
  const HOARD_TIERS = 8;            // re-seed the static coin buffer only when the tier changes
  // gold highlight / mid / shadow — a lit metal ramp (the bevel reads from these).
  const GOLD_TONES = [[255, 214, 110], [212, 158, 46], [120, 84, 22]];
  // T195 — a curated dark→light gold ramp for the hoard's halftone FILTER: a FEW posterised
  // stops (base-dark → crest-light) shaded off the pile's base tone. The ordered Bayer dither
  // BETWEEN these stops (the brickmap palette post-process) is what yields the many apparent
  // gradations — exactly the scene's machinery, so the pile is dot-locked to the biome.
  const HOARD_SHADES = [-0.62, -0.40, -0.18, 0.08, 0.36];   // shade factors, dark → light
  function hoardRamp(base){ return HOARD_SHADES.map(k => shade(base, k)); }   // luma-ascending

  // gold total → hoard LEVEL (0..1): saturating, so early gold visibly shows and big
  // totals plateau gracefully (no cap blow-out). level = gold/(gold+K).
  function hoardLevel(gold, k){ gold = Math.max(0, gold || 0); k = (k == null ? HOARD_K : k) || 1; return gold / (gold + k); }
  // quantise the level to a tier (the static buffer only re-seeds on a tier change).
  function hoardTier(level, tiers){ return Math.round(clamp01(level) * ((tiers || HOARD_TIERS) | 0)); }
  // a small positional hash (organic micro-roughness without a sequential RNG).
  function hash01i(i, salt){ let h = ((i | 0) * 374761393 + (salt | 0) * 668265263) >>> 0; h = (h ^ (h >>> 13)) >>> 0; h = (h * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  // The pile HEIGHT (0..HOARD_MAX_H, fraction of screen) at normalised column x∈[0,1].
  // T192 — NOT a central dome: coins poured into the phone bank up against the side WALLS.
  // Full-width fill that rises with `level`, HIGHER toward x≈0 and x≈1 (the walls), dipping
  // in the middle, with organic clumps (summed drifts + hashed roughness) so it's not a
  // smooth parabola. Reads like a heaping container, climbing the walls at high wealth.
  function moundProfile(x, level, seed){
    level = clamp01(level);
    if(level <= 0) return 0;
    const s = (seed | 0) || 1;
    const wall = Math.pow(Math.abs(x - 0.5) * 2, 1.5);            // 0 centre → 1 at the walls
    // a couple of organic drifts/clumps (seeded) + hashed micro-roughness on top, TAPERED toward
    // the walls (T199) — so the banked sides climb CLEANLY to the top while the centre keeps the
    // organic dip/undulation. Without the taper, drift could pull a wall down off the ceiling.
    const taper = 1 - 0.7 * wall;
    const drift = (0.10 * Math.sin(x * 9.1 + (s % 17)) + 0.07 * Math.sin(x * 17.3 + (s % 23))) * taper;
    const rough = (hash01i(Math.floor(x * 40), s ^ 0x9e37) - 0.5) * 0.10 * taper;
    let f = 0.44 + 0.58 * wall + drift + rough;                  // T199: walls reach ~1.0 (touch the top); centre ~0.44 (dips)
    f = Math.max(0.12, f);                                       // always some floor of coins across the width
    return clamp01(level * HOARD_MAX_H * f);
  }
  // Seed the SURFACE coins of the hoard (T172): a crest-weighted scatter ON the mound
  // surface, each coin carrying position + size + rotation + aspect(squash) + a gold
  // tone + a glint phase. Count rides `level` (capped); deterministic from `seed`;
  // reduced-motion → fewer, no glint. Only the surface is ever emitted (impression).
  //
  // T196 — STABLE ACCUMULATION so the pile rises GRADUALLY (~`full`≈480 fine steps, not 8
  // jumps) with NO teleporting coins: each coin's place is fixed by its **fill-rank** `q`
  // (its index over the FULL-pile count, which depends on cap/reduced — NOT on the current
  // level), so raising `level` only APPENDS higher-rank coins on top. seedHoard at a lower
  // level is therefore a byte-identical PREFIX of seedHoard at a higher one (existing coins
  // never move); a coin sits at the surface height of ITS OWN rank, so the pile fills upward.
  function seedHoard(opts, reduced, cap){
    opts = opts || {};
    const level = clamp01(opts.level != null ? opts.level : 1);
    const seed = (opts.seed | 0) || 0x601d;
    const ceil = Math.max(0, Math.min((cap == null ? HOARD_CAP : cap) | 0, HOARD_CAP));
    const full = Math.max(1, Math.min(ceil, Math.round(HOARD_CAP * (reduced ? 0.6 : 1))));   // coins at level 1 (level-independent)
    const n = Math.max(0, Math.min(full, Math.round(full * level)));
    const rng = makeRng(seed);
    let pool = (opts.palette && opts.palette.length) ? opts.palette.map(parseColor) : GOLD_TONES;
    if(!pool.length) pool = [[255, 255, 255]];
    // T200 — tone by HEIGHT: order the pool dark→light so a coin's fill-rank `q` can pick its
    // gold tone (low/deep → dark, high/crest → light) with a jittered spread that keeps a MIX at
    // every level. Keyed off `q` (level-independent) → a coin's colour never flickers as the pile
    // grows (stable with T196), and one rng draw keeps the scatter geometry byte-identical.
    const toneRamp = pool.slice().sort((a, b) => luma(a) - luma(b)), tlast = toneRamp.length - 1;
    const out = new Array(n);
    for(let i = 0; i < n; i++){
      const q = (i + 0.5) / full;                              // this coin's fill rank (0..1), level-independent
      // T192 — scatter across the FULL WIDTH (the pile fills wall-to-wall), with a mild
      // wall bias so the banked sides read as denser.
      let x = rng(); if(rng() < 0.4) x = (x < 0.5 ? x * x : 1 - (1 - x) * (1 - x));   // gentle pull toward the walls
      // T196 — height of THIS coin's rank (NOT the current level) → lower-rank coins settle
      // toward the base, higher-rank coins stack toward the crest; existing coins stay put.
      const h = moundProfile(x, q, seed);
      const surfaceY = 1 - h;                                  // y=1 is the bottom of the backdrop
      // coins layer down the visible face of the pile (a deeper band for a deeper rank)
      const band = 0.03 + 0.16 * h;
      const y = clamp01(surfaceY + rng() * band);
      // dark→light by rank, jittered so dark/light mix at every level (no hard band).
      const pick = clamp01(q + (rng() - 0.5) * 0.9);
      const col = toneRamp[Math.max(0, Math.min(tlast, Math.round(pick * tlast)))];
      out[i] = {
        x: x, y: y,
        size: lerp(reduced ? 5 : 6, reduced ? 8 : 13, rng()) * (0.85 + 0.3 * q),   // grow with the rank (stable)
        rot: rng() * TAU,                                      // spin orientation
        aspect: lerp(0.35, 0.95, rng()),                       // tip (face-on … edge-on cylinder)
        r: col[0], g: col[1], b: col[2],
        glint: reduced ? 0 : rng() * TAU,
        look: 1
      };
    }
    return out;
  }

  // Closed-form CONVERGE path (T172(d)) — the earn burst: a coin emitted at (x0,y0)
  // eases toward the hoard target (tx,ty) over its life with a small lob, then lands
  // (absorbed → alpha 0). The GLSL/WGSL VS computes the identical path; this documents
  // + bounds it. Returns normalised pos, alpha, liveness.
  function convergePos(p, t){
    const lt = t - (p.birth || 0);
    if(lt < 0) return { x: p.x0, y: p.y0, alpha: 0, alive: false };
    if(lt >= p.life) return { x: p.tx, y: p.ty, alpha: 0, alive: false };   // landed → absorbed into the mound
    const u = lt / p.life, e = u * u * (3 - 2 * u);            // smoothstep ease-in-out
    const x = p.x0 + (p.tx - p.x0) * e;
    const y = p.y0 + (p.ty - p.y0) * e - (p.arc || 0) * Math.sin(Math.PI * u);   // a gentle lob
    const fadeIn = Math.min(1, lt / 0.06);
    const fadeOut = u > 0.75 ? Math.max(0, 1 - (u - 0.75) / 0.25) : 1;   // fade as it lands
    return { x: x, y: y, alpha: clamp01(fadeIn * fadeOut), alive: true };
  }
  // Seed the earn burst: `count` coins fly from {x,y} toward the hoard {tx,ty} (each
  // jittered + lobbed), settle, and are absorbed. Deterministic; reduced-motion → a
  // small, calm puff (the caller may skip it entirely for a static pile).
  function seedConverge(opts, reduced, cap){
    opts = opts || {};
    const x0 = clamp01(opts.x != null ? opts.x : 0.5), y0 = clamp01(opts.y != null ? opts.y : 0.3);
    const tx = clamp01(opts.tx != null ? opts.tx : 0.5), ty = clamp01(opts.ty != null ? opts.ty : 0.9);
    const want = (opts.count != null ? opts.count : 24) | 0;
    const n = Math.max(0, Math.min((cap == null ? BURST_CAP : cap) | 0, Math.round(want * (reduced ? 0.4 : 1))));
    const rng = makeRng((opts.seed | 0) || 0xc01d);
    let pool = (opts.palette && opts.palette.length) ? opts.palette.map(parseColor) : GOLD_TONES;
    if(!pool.length) pool = [[255, 255, 255]];
    const lMax = reduced ? 0.7 : 1.1;
    const out = new Array(n);
    for(let i = 0; i < n; i++){
      const col = pool[(rng() * pool.length) | 0];
      out[i] = {
        x0: clamp01(x0 + (rng() - 0.5) * 0.06), y0: clamp01(y0 + (rng() - 0.5) * 0.06),
        tx: clamp01(tx + (rng() - 0.5) * (0.10 + 0.30 * (opts.spread || 1))),   // spread across the hoard top
        ty: clamp01(ty + (rng() - 0.5) * 0.04),
        arc: lerp(0.06, reduced ? 0.12 : 0.22, rng()),         // lob height
        size: lerp(reduced ? 5 : 6, reduced ? 8 : 12, rng()),
        rot: rng() * TAU, aspect: lerp(0.4, 0.9, rng()),
        spin: (reduced ? 0 : 1) * lerp(6, 15, rng()) * (rng() < 0.5 ? -1 : 1),   // T193: tumble as it flies
        wob: lerp(7, 16, rng()), phase: rng() * TAU,                              // face↔edge tip rate + phase
        r: col[0], g: col[1], b: col[2],
        life: lerp(0.6, lMax, rng()), glint: 0, look: 1,
        birth: 0
      };
    }
    return out;
  }

  // Precompute the per-scene render data shared by every backend (pure).
  function deriveScene(scene, cap){
    if(!scene || !scene.grid || !scene.grid.length) throw new Error("FXGL.setScene needs a grid");
    const ramp = buildRamp(scene.palette && scene.palette.length ? scene.palette : gridColors(scene.grid), scene.steps || 8);
    const d = {
      ramp: ramp,
      image: gridToImage(scene.grid),
      particles: seedParticles(scene, ramp, cap),
      dither: (scene.dither == null) ? 1 : scene.dither
    };
    // T172 — opt-in GOLD HOARD: `scene.hoard` = a level 0..1 (or {level,seed,palette}).
    // Derives the settled surface-coin scatter + the mound params (the renderers draw a
    // dithered mound silhouette + the beveled coins on top). Absent → byte-identical.
    const hv = (scene.hoard != null && typeof scene.hoard === "object") ? scene.hoard
             : (typeof scene.hoard === "number") ? { level: scene.hoard } : null;
    if(hv){
      const level = clamp01(hv.level || 0), seed = (hv.seed != null ? hv.seed : (scene.seed | 0)) | 0;
      d.hoard = { level: level, seed: seed, palette: hv.palette || null,
                  coins: seedHoard({ level: level, seed: seed, palette: hv.palette }, false, hv.cap) };
    }
    return d;
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
    const scene = {
      grid: homeGrid(state, palette, cols, rows),
      palette: palette,
      particles: homeParticles(state, palette),
      seed: seedFromHome(state),
      dither: 1
    };
    // T172 — the gold hoard rides the home backdrop. [A]'s T173 feeds `state.hoard`
    // (a saturating gold→level 0..1, or {level,seed,palette}); absent → no pile (the
    // home stays exactly as before).
    // T196 — use a FIXED seed (NOT the old 8-tier-quantised seed): the coin field is now a
    // STABLE ACCUMULATION (seedHoard places each coin by its level-independent fill-rank), so
    // the pile rises gradually with the continuous `lvl` and coins never reshuffle/teleport.
    if(state.hoard != null){
      const lvl = (typeof state.hoard === "object") ? clamp01(state.hoard.level || 0) : clamp01(state.hoard);
      scene.hoard = { level: lvl, seed: (scene.seed ^ 0x601d) | 0,
                      palette: (typeof state.hoard === "object" && state.hoard.palette) || null };
    }
    return scene;
  }

  // =========================================================================
  // SEMANTIC ARENA BIOME (T108) — the Arena sibling of T95. Purpose: SENSE OF
  // PLACE + STATUS. Pure mapping from *live Arena state* (region 1–10, tier,
  // boss-proximity, mood) to a setScene-shaped backdrop: the region sets the
  // palette/mood (a distinct place per region), tier + boss-proximity raise the
  // intensity (denser particles + a hotter glow as the boss nears), and a
  // victory mood briefly warms/brightens (the [A] side pairs it with a burst).
  // Deterministic from a state-derived seed. Engine-owned region moods (not a
  // copy of scenery.js) — the [A] wiring may also pass the real `scenery.js`
  // region grid in `state.grid`, which we then recolour by the live palette.
  // =========================================================================
  // 10 region moods — top-sky / horizon / glow anchors + a default accent kind,
  // echoing the Arena's region families (warren · gallows · gloam · marsh ·
  // frost · drown · cinder · storm · dragon · void).
  const ARENA_REGIONS = [
    { top: [16, 24, 12], horizon: [40, 56, 26], glow: [120, 150, 70],  kind: "motes"  },
    { top: [20, 20, 28], horizon: [44, 44, 56], glow: [150, 150, 180], kind: "motes"  },
    { top: [12, 26, 32], horizon: [28, 52, 60], glow: [90, 170, 180],  kind: "motes"  },
    { top: [14, 28, 18], horizon: [30, 60, 38], glow: [110, 180, 110], kind: "motes"  },
    { top: [20, 34, 48], horizon: [58, 86, 110], glow: [170, 210, 240], kind: "snow"   },
    { top: [10, 18, 34], horizon: [24, 48, 86], glow: [80, 130, 210],  kind: "motes"  },
    { top: [34, 16, 8],  horizon: [80, 34, 16], glow: [240, 120, 50],  kind: "embers" },
    { top: [24, 16, 34], horizon: [52, 38, 76], glow: [170, 120, 230], kind: "stars"  },
    { top: [32, 12, 14], horizon: [78, 28, 26], glow: [240, 90, 70],   kind: "embers" },
    { top: [10, 6, 18],  horizon: [28, 16, 44], glow: [150, 90, 230],  kind: "stars"  }
  ];
  const MOOD_CODE = { neutral: 0, victory: 1, defeat: 2 };

  function regionIndex(region){ return Math.max(0, Math.min(ARENA_REGIONS.length - 1, ((region | 0) || 1) - 1)); }

  // Intensity in [0,1]: boss-proximity dominates, tier within the region lifts the
  // baseline — so deeper tiers feel tenser and the boss is the peak.
  function arenaIntensity(state){
    if(state.facingBoss) return 1;                          // the boss fight is the peak
    const bossProx = clamp01(state.bossProximity != null ? state.bossProximity : 0);
    const tierNorm = state.tierFrac != null ? clamp01(state.tierFrac) : clamp01((state.tier || 0) / 12);
    return clamp01(bossProx * 0.7 + tierNorm * 0.3);
  }
  function seedFromArena(state){
    if(state.seed != null) return (state.seed | 0) || 1;
    let h = 2166136261 >>> 0;
    const mix = function(n){ h ^= (n >>> 0); h = Math.imul(h, 16777619) >>> 0; };
    mix(regionIndex(state.region));
    mix(state.tier | 0);
    mix(Math.round(arenaIntensity(state) * 20));
    mix(MOOD_CODE[state.mood] || 0);
    return h || 1;
  }
  function scaleRgb(c, m){ return [Math.min(255, c[0] * m), Math.min(255, c[1] * m), Math.min(255, c[2] * m)]; }

  // Region + intensity + mood → a dark→light ramp. Intensity heats & brightens
  // the glow (the boss bears down); victory warms/brightens, defeat dims/cools.
  function arenaPalette(state){
    const R = ARENA_REGIONS[regionIndex(state.region)], mood = state.mood || "neutral", heat = arenaIntensity(state);
    let top = R.top.slice(), horizon = R.horizon.slice(), glow = R.glow.slice();
    glow = mixRgb(glow, [255, 180, 90], heat * 0.5);   // hotter toward the boss
    glow = scaleRgb(glow, 1 + heat * 0.3);
    if(mood === "victory"){ glow = scaleRgb(glow, 1.15).map(v => Math.min(255, v + 18)); horizon = scaleRgb(horizon, 1.1); }
    else if(mood === "defeat"){ glow = scaleRgb(glow, 0.6); horizon = scaleRgb(horizon, 0.7); top = scaleRgb(top, 0.8); }
    return [ toHex(top), toHex(mixRgb(top, horizon, 0.5)), toHex(horizon), toHex(mixRgb(horizon, glow, 0.6)), toHex(glow) ];
  }

  // The grid: prefer the real `scenery.js` region grid if the caller passes it
  // (recoloured by the live palette via the luminance ramp); otherwise synthesise
  // a grounded region backdrop — sky gradient, a hot glow band whose strength is
  // the intensity, and a dark ground silhouette below the horizon.
  function arenaGrid(state, palette, cols, rows){
    if(state.grid && state.grid.length && state.grid[0] && state.grid[0].length) return state.grid;
    const rgb = palette.map(parseColor), dark = rgb[0], mid = rgb[(rgb.length / 2) | 0], glow = rgb[rgb.length - 1], ground = scaleRgb(dark, 0.6);
    const intensity = arenaIntensity(state), rng = makeRng(seedFromArena(state));
    const horizon = rows * 0.62;
    const shimmer = new Array(cols);
    for(let c = 0; c < cols; c++) shimmer[c] = rng() - 0.5;
    const g = [];
    for(let r = 0; r < rows; r++){
      g[r] = new Array(cols);
      const vy = rows > 1 ? r / (rows - 1) : 0;
      const below = r >= horizon;
      const d = Math.abs(r - horizon) / rows;
      const band = Math.max(0, 1 - d * 5) * (0.3 + 0.7 * intensity);
      for(let c = 0; c < cols; c++){
        let col = below ? ground.slice() : mixRgb(dark, mid, vy);
        col = mixRgb(col, glow, band * 0.85);
        const s = 1 + shimmer[c] * 0.05;
        g[r][c] = toHex([col[0] * s, col[1] * s, col[2] * s]);
      }
    }
    return g;
  }

  // Particles: the region's accent kind (victory → warm embers), density rises
  // with intensity (denser as the boss nears), capped so the Arena stays legible.
  function arenaParticles(state, palette){
    const R = ARENA_REGIONS[regionIndex(state.region)], intensity = arenaIntensity(state);
    let kind = R.kind;
    if(state.mood === "victory") kind = "embers";
    const count = Math.min(ARENA_PARTICLE_MAX, Math.round(30 + intensity * 150));
    const colors = palette.slice(Math.max(0, palette.length - 2));
    return { kind: kind, count: count, colors: colors };
  }

  // The public derivation: live Arena state → a setScene-shaped backdrop.
  function deriveArenaScene(state){
    state = state || {};
    const cols = state.cols || (state.grid && state.grid[0] ? state.grid[0].length : 28);
    const rows = state.rows || (state.grid && state.grid.length ? state.grid.length : 14);
    const palette = arenaPalette(state);
    return {
      grid: arenaGrid(state, palette, cols, rows),
      palette: palette,
      particles: arenaParticles(state, palette),
      seed: seedFromArena(state),
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
  // T172 — draw one beveled COIN (the hoard look) at buffer-px centre (cx,cy), radius
  // `r` (buffer px), rotated `rot`, vertically squashed by `aspect` (→ a coin at an
  // angle). Real 2D canvas → a lit disc (rim/shadow ring + mid body + inner highlight +
  // optional specular glint). A context WITHOUT the path API (the headless test raster)
  // → an axis-aligned squashed rect (mid body + highlight) so coverage + a bevel still
  // read and the draw stays measurable.
  function shade(c, f){ return f >= 0 ? [c[0] + (255 - c[0]) * f | 0, c[1] + (255 - c[1]) * f | 0, c[2] + (255 - c[2]) * f | 0] : [c[0] * (1 + f) | 0, c[1] * (1 + f) | 0, c[2] * (1 + f) | 0]; }
  // T192 — a CELL-SHADED rotated short CYLINDER (the owner rejected the beveled ovals): a
  // flat foreshortened TOP-FACE ellipse + a darker flat EDGE band below it (the cylinder
  // side) — two flat tones, NO outline, no gradient (an optional tiny flat highlight). The
  // `rot` spins it; `aspect` tips it (face-on → a disc, edge-on → the edge band dominates).
  function drawCoin(ctx, cx, cy, r, rot, aspect, rgb, hi, cell){
    r = Math.max(1, r); aspect = Math.max(0.12, Math.min(1, aspect || 1));
    const ry = r * aspect, edgeH = r * (0.18 + 0.5 * (1 - aspect));   // tip more → taller edge
    const edge = shade(rgb, -0.4);                                    // darker flat edge tone
    // T197 — PIXEL-DITHER path (when a `cell` is given): rasterise the cylinder into the SAME
    // screen cell-grid as the T195 pile, ordered-Bayer-dithering between the coin's OWN tones
    // (edge → face → highlight) — so the coins are pixelated + dithered cohesively with the
    // pile (one shared dot lattice), with NO colour shift (the owner dropped that). No canvas
    // read-back → cheap enough for the per-frame gain-burst coins.
    if(cell && cell >= 2 && ctx.fillRect){
      const ramp = [edge, rgb, shade(rgb, 0.42)];                    // dark→light, the coin's own 3 tones
      const cos = Math.cos(rot || 0), sin = Math.sin(rot || 0);
      const reach = Math.ceil(r + edgeH) + cell;                     // screen-px bounding radius
      const gx0 = Math.floor((cx - reach) / cell), gx1 = Math.ceil((cx + reach) / cell);
      const gy0 = Math.floor((cy - reach) / cell), gy1 = Math.ceil((cy + reach) / cell);
      const r2 = r * r, ry2 = ry * ry;
      for(let gx = gx0; gx <= gx1; gx++) for(let gy = gy0; gy <= gy1; gy++){
        const sx = gx * cell + cell / 2, sy = gy * cell + cell / 2;  // cell centre (screen space)
        const dx = sx - cx, dy = sy - cy;
        const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos;   // inverse-rotate into the coin frame
        let v;
        if((lx * lx) / r2 + (ly * ly) / ry2 <= 1){                   // on the TOP FACE → lit, hi toward upper-left
          v = clamp01(0.55 + 0.5 * (-lx / r) + 0.35 * (-ly / ry));
        } else if((Math.abs(lx) <= r && ly >= 0 && ly <= edgeH) ||   // the side band …
                  ((lx * lx) / r2 + ((ly - edgeH) * (ly - edgeH)) / ry2 <= 1 && ly >= 0)){   // … + its rounded bottom
          v = 0.12;                                                  // the dark cylinder SIDE
        } else continue;                                             // outside the coin → transparent
        let idx = rampIndex(v, ramp.length, bayer4(gx, gy), 1);
        idx = idx < 0 ? 0 : idx > 2 ? 2 : idx;
        ctx.fillStyle = toHex(ramp[idx]);
        ctx.fillRect(gx * cell, gy * cell, cell + 1, cell + 1);
      }
      return;
    }
    if(ctx.beginPath && ctx.ellipse && ctx.fill && ctx.save){
      ctx.save(); ctx.translate(cx, cy); if(rot) ctx.rotate(rot);
      ctx.fillStyle = toHex(edge);                                    // the cylinder SIDE (flat, no outline)
      ctx.fillRect(-r, 0, 2 * r, edgeH);
      ctx.beginPath(); ctx.ellipse(0, edgeH, r, ry, 0, 0, TAU); ctx.fill();   // rounded bottom of the side
      ctx.beginPath(); ctx.ellipse(0, 0, r, ry, 0, 0, TAU); ctx.fillStyle = toHex(rgb); ctx.fill();   // the flat TOP FACE
      if(hi > 0){ ctx.beginPath(); ctx.ellipse(-r * 0.3, -ry * 0.3, r * 0.34, ry * 0.34, 0, 0, TAU); ctx.fillStyle = toHex(shade(rgb, 0.42)); ctx.fill(); }
      ctx.restore();
    } else {
      // fallback (path-less test raster): two flat rects — face + the darker edge band below.
      const w = Math.max(2, Math.round(2 * r)), fh = Math.max(2, Math.round(2 * ry)), eh = Math.max(1, Math.round(edgeH));
      ctx.fillStyle = toHex(edge); ctx.fillRect((cx - w / 2) | 0, (cy - fh / 2) | 0, w, fh + eh);
      ctx.fillStyle = toHex(rgb);  ctx.fillRect((cx - w / 2) | 0, (cy - fh / 2) | 0, w, fh);
    }
  }
  // T172/T185 — render the settled hoard into ANY 2D ctx (buffer W×H, pxScale): a dithered
  // gold mound SILHOUETTE (the implied bulk, a shaded shape — not particles) + the beveled
  // SURFACE coins on top. Backend-agnostic so the CPU still AND the WebGL/WebGPU 2D OVERLAY
  // (T185) share one identical draw (the live bug: the GL/GPU backends never drew the hoard).
  function drawHoard(ctx, h, W, H, pxScale){
    if(!ctx || !ctx.fillRect || !h || h.level <= 0) return;
    const base = h.palette && h.palette.length ? parseColor(h.palette[1] || h.palette[0]) : GOLD_TONES[1];
    if(ctx.globalAlpha != null) ctx.globalAlpha = 1;
    // T195 — the FILTER pass: render the silhouette in brickmap's halftone-dither look (NOT
    // a smooth analog gradient). A crest-light→base-dark luminance gradient-map is posterised
    // onto the curated gold ramp with the engine's ordered Bayer 4×4 dot pattern between
    // stops, at a chunky pixel scale (nearest-neighbour, crisp) — so the pile reads as the
    // same dithered/pixel halftone as the scene behind it, dot-locked to the same lattice.
    const ramp = hoardRamp(base), rlast = ramp.length - 1, salt = (h.seed | 0) ^ 0x5a5a;
    const cell = Math.max(2, Math.round((pxScale || 1) * 3));   // big-pixel size (the pixelation)
    const cols = Math.ceil(W / cell);
    for(let cx = 0; cx < cols; cx++){
      const px = cx * cell;
      const x = (px + cell / 2) / W, mh = moundProfile(x, h.level, h.seed);
      if(mh <= 0) continue;
      const top = Math.round((1 - mh) * H);
      const denom = Math.max(1, H - top);
      for(let cy = Math.floor(top / cell); cy * cell < H; cy++){
        const py = cy * cell, depth = (py - top) / denom;      // 0 crest → 1 base
        if(depth < 0) continue;
        // gradient-map input: bright crest → dark base (fake AO), + a touch of position-hashed
        // variation so flat depths still break into dots rather than dead bands.
        const lum = clamp01(0.94 - 0.80 * depth + (hash01i(cx, salt) - 0.5) * 0.07);
        let idx = rampIndex(lum, ramp.length, bayer4(cx, cy), 1);   // ordered halftone between stops
        idx = idx < 0 ? 0 : idx > rlast ? rlast : idx;
        ctx.fillStyle = toHex(ramp[idx]);
        ctx.fillRect(px, py, cell + 1, cell + 1);
      }
    }
    const scale = pxScale || 1;
    for(const c of h.coins){
      const r = Math.max(2, Math.round(c.size * scale)) / 2;
      drawCoin(ctx, c.x * W, c.y * H, r, c.rot || 0, c.aspect || 1, [c.r, c.g, c.b], 0, cell);   // T197: pixel-dither, shared lattice
    }
  }
  // T193 — draw one coin-look BURST particle (the money-gain coins) at burst-time `t`: its
  // closed-form trajectory (converge or ballistic) + a SPIN — `rot` tumbles and `aspect`
  // tips face↔edge over its life, so it reads as a real spinning cylinder coin (not a disc).
  // Shared by the CPU still AND the GL/GPU 2D overlay so coins spin on every backend.
  function drawCoinParticle(ctx, p, t, W, H, scale){
    const bp = (p.tx != null) ? convergePos(p, t) : burstPos(p, t, BURST_GRAVITY, BURST_DRAG);
    if(!bp.alive || bp.alpha <= 0.01) return;
    const lt = t - (p.birth || 0);
    const px = Math.max(2, Math.round(p.size * (scale || 1)));
    const rot = (p.rot || 0) + (p.spin ? lt * p.spin : 0);
    const aspect = p.spin ? (0.22 + 0.72 * Math.abs(Math.cos(lt * (p.wob || 10) + (p.phase || 0)))) : (p.aspect || 1);
    if(ctx.globalAlpha != null) ctx.globalAlpha = bp.alpha;
    const cell = Math.max(2, Math.round((scale || 1) * 3));   // T197: same pixel lattice as the pile
    drawCoin(ctx, bp.x * W, bp.y * H, px / 2, rot, aspect, [p.r, p.g, p.b], 0, cell);
  }
  function CPUBackend(ctx2d){ this.name = "cpu-still"; this.ctx = ctx2d; this.w = 1; this.h = 1; this.burst = null; this.pxScale = 1; }
  CPUBackend.prototype.setData = function(derived){ this.derived = derived; };
  CPUBackend.prototype.setBurst = function(parts){ this.burst = parts; this.burstCount = parts.length; };
  CPUBackend.prototype.resize = function(w, h){ this.w = Math.max(1, w | 0); this.h = Math.max(1, h | 0); };
  // Frame: the dithered scene still (if any) + an animated 2D particle pass for
  // burst()/celebrate() via fillRect. This is BOTH the no-GPU fallback AND the
  // deliberate Canvas2D overlay (T133): a 2D context always presents, so the z-58
  // celebration renders on devices that refuse a 2nd WebGL/WebGPU context.
  CPUBackend.prototype.renderFrame = function(o){
    const ctx = this.ctx; if(!ctx) return;
    if(o.sceneOn && this.derived) this._still();
    else if(!o.sceneOn && ctx.clearRect) ctx.clearRect(0, 0, this.w, this.h);
    if(o.burstOn && this.burst && this.burst.length && ctx.fillRect){
      const W = this.w, H = this.h, t = o.burstTime || 0, scale = this.pxScale || 1;
      for(let i = 0; i < this.burst.length; i++){
        const p = this.burst[i];
        if(p.look === 1){ drawCoinParticle(ctx, p, t, W, H, scale); continue; }   // T193 — a spinning cylinder coin
        // ballistic confetti (square). converge coins are handled above.
        const bp = burstPos(p, t, BURST_GRAVITY, BURST_DRAG);
        if(!bp.alive || bp.alpha <= 0.01) continue;
        // size up by the buffer/CSS factor so it shows at `size` SCREEN px after the
        // browser's downscale (T138); floor at 2 screen px.
        const px = Math.max(2, Math.round(p.size * scale));
        if(ctx.globalAlpha != null) ctx.globalAlpha = bp.alpha;
        ctx.fillStyle = toHex([p.r, p.g, p.b]);
        ctx.fillRect((bp.x * W - px / 2) | 0, (bp.y * H - px / 2) | 0, px, px);
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
    if(d.hoard && d.hoard.level > 0) this._hoard(d.hoard);   // T172: the gold pile, over the scene
  };
  // T172 — render the settled hoard over the scene still: (1) a dithered gold mound
  // SILHOUETTE (the implied bulk, drawn as a shaded shape — not particles), then
  // (2) the beveled SURFACE coins on top. The eye infers "amassed" from the lit
  // silhouette; only the surface is ever drawn.
  CPUBackend.prototype._hoard = function(h){ drawHoard(this.ctx, h, this.w, this.h, this.pxScale); };
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
    // T138: the buffer is `dpr·res`× the CSS size and the browser downscales it back,
    // so a particle drawn at N buffer-px shows at only N/(dpr·res) SCREEN px (≈1.5–3px
    // on a Poco-X3 → drawn but invisible). Hand the CPU 2D path this factor so it draws
    // particles at a constant, visible *screen* size regardless of device DPR.
    this.backend.pxScale = Math.max(1, dpr * q.res);
    this._syncOverlay();   // T185: re-fit + redraw the hoard overlay at the new buffer size
  };
  Controller.prototype._init = function(){
    const o = this.opts;
    // Forced Canvas2D backend (T133) — the overlay CELEBRATION path. A 2D context
    // has no per-document GL-context-count limit, so it ALWAYS initialises +
    // presents; mobile GPUs (the Poco-X3 target) commonly refuse/lose a SECOND
    // WebGL/WebGPU context, which is why the z-58 #fxBurst overlay rendered nothing
    // live. This bypasses GL entirely and still animates bursts via fillRect.
    if(o.backend === "2d" || o.canvas2d){ this._initCanvas2D(); return; }
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
    this._initCanvas2D();
  };
  Controller.prototype._initCanvas2D = function(){
    const o = this.opts, cv = this.canvas;
    let ctx2d = o.ctx2d || null;
    try{ if(!ctx2d) ctx2d = cv && cv.getContext && cv.getContext("2d"); }catch(e){}
    this._use(new CPUBackend(ctx2d));
  };
  // The drawing-buffer size of the active backend — the [A] wire / tests assert the
  // overlay reaches a real (non-1×1) size before celebrating (the invisible trap).
  Controller.prototype.dimensions = function(){ return this.backend ? { w: this.backend.w | 0, h: this.backend.h | 0 } : { w: 0, h: 0 }; };
  Controller.prototype.isReady = function(){ return !!this.ready; };
  // Whether the active backend actually has a drawable context (T138 tester readout):
  // a Canvas2D backend whose `getContext("2d")` returned null (canvas already bound to
  // another context) can't present — surface that instead of silently drawing nothing.
  Controller.prototype.canPresent = function(){
    const b = this.backend; if(!b) return false;
    if(b.name === "cpu-still") return !!b.ctx;     // a real 2D context was obtained
    return true;                                    // GL/GPU constructed → has a context
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
    // T193 — on GL/GPU, composite the spinning coin burst onto the 2D overlay each frame.
    if(this.backend.name !== "cpu-still") this._syncOverlay(this.burst_.elapsed);
    // auto-stop the burst once its last particle has expired (no RAF leak)
    if(this.burst_.active && this.burst_.elapsed > this.burst_.maxDeath){
      this.burst_.active = false; this.burst_.startTs = 0; this.burst_.elapsed = 0; this.burst_.maxDeath = 0; this.burst_.parts = [];
      if(this.backend.setBurst) this.backend.setBurst([]);
      if(this.backend.name !== "cpu-still") this._syncOverlay(0);   // clear the spent coins (leaving the hoard)
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
      this._syncOverlay();                          // T185: draw the pile on the 2D overlay (GL/GPU backends)
    }
    return this;
  };
  // T185 — the gold hoard was INVISIBLE on the live build: only CPUBackend drew it, but
  // the real device runs WebGL2/WebGPU (which ignore `derived.hoard`). Fix: composite the
  // hoard via a backend-agnostic 2D OVERLAY canvas stacked directly over the scene canvas
  // (same box + z, inserted just after it → over the purple backdrop, under the UI), reusing
  // the exact `drawHoard` 2D code. CPU still draws it inline (no overlay needed there).
  Controller.prototype._ensureHoardCanvas = function(){
    if(this._hoardCv !== undefined) return this._hoardCv;   // created once (or null if impossible)
    const cv = this.canvas;
    if(!cv || typeof document === "undefined" || !document.createElement || !cv.parentNode){ this._hoardCv = null; return null; }
    const ov = document.createElement("canvas");
    ov.setAttribute("aria-hidden", "true");
    ov.className = ((cv.className || "") + " fxgl-hoard").replace(/\bhidden\b/g, "").trim();   // same box/z as the backdrop, never display:none
    ov.style.pointerEvents = "none";
    if(!cv.className){ const s = ov.style; s.position = "absolute"; s.left = "0"; s.top = "0"; s.width = "100%"; s.height = "100%"; }
    cv.parentNode.insertBefore(ov, cv.nextSibling);   // just ABOVE the backdrop (same z, later in DOM), below the UI
    try{ this._hoardCtx = ov.getContext("2d"); }catch(e){ this._hoardCtx = null; }
    this._hoardCv = this._hoardCtx ? ov : null;
    return this._hoardCv;
  };
  // T185/T193 — the 2D coin LAYER for the GL/GPU backends (the CPU still draws inline):
  // composites the static hoard (T185) AND the active money-gain COIN burst (T193, animated
  // spinning cylinders) on a transparent canvas over the scene — so coins are real coins on
  // every backend, not the shader-splat discs. Redrawn on scene/resize (hoard) + per RAF
  // frame (the flying coins). `burstTime` = the burst clock for the coin animation.
  Controller.prototype._syncOverlay = function(burstTime){
    const be = this.backend, d = this.derived;
    if(!be || be.name === "cpu-still") return;             // the CPU still draws both inline
    const hoard = (d && d.hoard && d.hoard.level > 0) ? d.hoard : null;
    const coins = (this.burst_.active && this.burst_.parts.length) ? this.burst_.parts.filter(p => p.look === 1) : null;
    if(!hoard && (!coins || !coins.length)){ if(this._hoardCtx && this._hoardCv) this._hoardCtx.clearRect(0, 0, this._hoardCv.width, this._hoardCv.height); return; }
    const ov = this._ensureHoardCanvas(); if(!ov || !this._hoardCtx) return;
    const W = be.w | 0, H = be.h | 0, scale = be.pxScale || 1;
    if(ov.width !== W) ov.width = W;
    if(ov.height !== H) ov.height = H;
    const ctx = this._hoardCtx;
    ctx.clearRect(0, 0, W, H);
    if(hoard) drawHoard(ctx, hoard, W, H, scale);
    if(coins && coins.length){
      const t = (burstTime == null) ? this.burst_.elapsed : burstTime;
      for(const p of coins) drawCoinParticle(ctx, p, t, W, H, scale);
      if(ctx.globalAlpha != null) ctx.globalAlpha = 1;
    }
  };
  // Semantic home backdrop (T95): derive a calm ambient scene from live home
  // state and apply it. Re-callable as state changes (progress / event / streak).
  Controller.prototype.setHomeState = function(state){ return this.setScene(deriveHomeScene(state)); };
  // Semantic Arena biome (T108): derive a region/tier/boss-driven backdrop and
  // apply it. Re-callable as the fight advances (tier up / boss near / win/loss).
  Controller.prototype.setArenaState = function(state){ return this.setScene(deriveArenaScene(state)); };
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
  // Ignite a set of seeded particles into the transient burst subsystem: stamp
  // their birth at the current burst clock, coalesce with any in-flight burst
  // (rapid gains stack), trim to the celebration ceiling (oldest dropped), upload
  // once, and pump the single RAF. Shared by burst() and celebrate(); both inherit
  // the auto-stop / no-leak / single-RAF machinery.
  Controller.prototype._ignite = function(seeded){
    if(!this.ready || !this.backend || !seeded || !seeded.length) return this;
    // T138: re-fit the canvas to the live viewport BEFORE drawing. A celebration is
    // often fired right after mount / before layout settled, leaving the buffer at
    // 1×1 (→ nothing visible). Re-sizing on ignite makes it present regardless of
    // when the [A] caller's resize ran.
    this._applyResize();
    if(!this.burst_.active){ this.burst_.parts = []; this.burst_.elapsed = 0; this.burst_.maxDeath = 0; this.burst_.startTs = 0; this.burst_.active = true; }
    const birth = this.burst_.elapsed;
    for(let i = 0; i < seeded.length; i++) seeded[i].birth = birth;
    let parts = this.burst_.parts.concat(seeded);
    if(parts.length > CELEBRATE_CAP) parts = parts.slice(parts.length - CELEBRATE_CAP);   // drop oldest
    this.burst_.parts = parts;
    this.burst_.maxDeath = Math.max(this.burst_.maxDeath, burstMaxDeath(seeded));
    // T193 — coin-look particles render as spinning cylinders on the 2D overlay (every
    // backend), NOT the shader splat (flat discs); the GL/GPU backend gets only the
    // non-coin confetti. The CPU still draws everything inline (by look).
    this.backend.setBurst(this.backend.name === "cpu-still" ? parts : parts.filter(p => p.look !== 1));
    this._syncOverlay(this.burst_.elapsed);   // composite the coins onto the overlay now
    this._pump();
    return this;
  };
  // Fire a brief celebration burst (T94). Purpose = CELEBRATION. Capped (256),
  // seeded (deterministic), reduced-motion → a calm flourish, auto-stops with no
  // RAF leak. Coalesces with an in-flight burst (rapid gains stack up to the cap).
  Controller.prototype.burst = function(opts){
    if(!this.ready || !this.backend) return this;
    return this._ignite(seedBurst(opts, this.reduced, BURST_CAP));
  };
  // Fire a BIG celebration shower (T126): hundreds of bigger, longer-lived, bright
  // particles (firework/fountain) — same instanced/in-shader path, same auto-stop/
  // no-leak invariants, just a much higher ceiling. `setQuality` degrades the count
  // (the cap scales with the quality particle budget) so it stays in the Poco-X3 budget.
  Controller.prototype.celebrate = function(opts){
    if(!this.ready || !this.backend) return this;
    const q = QUALITY[Math.max(0, Math.min(2, this.quality))];
    const cap = Math.max(0, Math.min(CELEBRATE_CAP, Math.round(CELEBRATE_CAP * q.particles)));
    return this._ignite(seedCelebrate(opts, this.reduced, cap));
  };
  // T172 — the EARN burst: coins fly from the earn-point {x,y} and CONVERGE on the
  // hoard {tx,ty}, then settle (absorbed). Rides the same burst machinery + auto-stop
  // as celebrate(), but the particles carry a target so the renderers use convergePos
  // (directed) instead of the dispersing burstPos. reduced-motion → a small calm puff.
  Controller.prototype.earnBurst = function(opts){
    if(!this.ready || !this.backend) return this;
    return this._ignite(seedConverge(opts, this.reduced, BURST_CAP));
  };
  Controller.prototype.resize = function(){ this._applyResize(); if(this.backend && this._isStill() && this.derived) this._renderOnce(); return this; };
  Controller.prototype.dispose = function(){ this.stop(); this.burst_.active = false; if(this.rafId){ this.caf(this.rafId); this.rafId = 0; } if(this.backend) this.backend.dispose(); this.backend = null; this.ready = false; if(this._hoardCv && this._hoardCv.parentNode) this._hoardCv.parentNode.removeChild(this._hoardCv); this._hoardCv = undefined; this._hoardCtx = null; return this; };
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
  function celebrate(opts){ if(active) active.celebrate(opts); return active; }
  function setHomeState(state){ if(active) active.setHomeState(state); return active; }
  function setArenaState(state){ if(active) active.setArenaState(state); return active; }

  window.FXGL = {
    // runtime API
    mount: mount, setScene: setScene, setHomeState: setHomeState, setArenaState: setArenaState, start: start, stop: stop, burst: burst, celebrate: celebrate,
    setQuality: setQuality, dispose: dispose, resize: function(){ if(active) active.resize(); },
    capabilities: capabilities, active: function(){ return active; },
    Controller: Controller,
    // budget constants
    PARTICLE_CAP: PARTICLE_CAP, BURST_CAP: BURST_CAP, CELEBRATE_CAP: CELEBRATE_CAP, BURST_GRAVITY: BURST_GRAVITY, BURST_DRAG: BURST_DRAG,
    HOME_PARTICLE_MAX: HOME_PARTICLE_MAX, QUALITY: QUALITY, KIND: KIND, BAYER: BAYER, MIN_PARTICLE_PX: MIN_PARTICLE_PX,
    sizeRange: sizeRange, spreadMul: spreadMul,
    // pure math (headless-tested)
    bayer4: bayer4, parseColor: parseColor, toHex: toHex, luma: luma,
    buildRamp: buildRamp, rampIndex: rampIndex, quantizePixel: quantizePixel,
    gridToImage: gridToImage, gridColors: gridColors,
    makeRng: makeRng, seedParticles: seedParticles, animateParticle: animateParticle,
    seedBurst: seedBurst, seedCelebrate: seedCelebrate, burstPos: burstPos, burstMaxDeath: burstMaxDeath,
    // gold hoard (T172)
    HOARD_CAP: HOARD_CAP, HOARD_K: HOARD_K, HOARD_MAX_H: HOARD_MAX_H, HOARD_TIERS: HOARD_TIERS, GOLD_TONES: GOLD_TONES,
    hoardLevel: hoardLevel, hoardTier: hoardTier, moundProfile: moundProfile, hash01i: hash01i,
    hoardRamp: hoardRamp, drawHoard: drawHoard, drawCoin: drawCoin, shade: shade, HOARD_SHADES: HOARD_SHADES,
    seedHoard: seedHoard, convergePos: convergePos, seedConverge: seedConverge,
    deriveScene: deriveScene, deriveHomeScene: deriveHomeScene, seedFromHome: seedFromHome,
    deriveArenaScene: deriveArenaScene, seedFromArena: seedFromArena, arenaIntensity: arenaIntensity, ARENA_PARTICLE_MAX: ARENA_PARTICLE_MAX, ARENA_REGIONS: ARENA_REGIONS,
    // shader sources (so a wiring task / tests can inspect them)
    shaders: { GLSL_SCENE_VS: GLSL_SCENE_VS, GLSL_SCENE_FS: GLSL_SCENE_FS, GLSL_PART_VS: GLSL_PART_VS, GLSL_PART_FS: GLSL_PART_FS, GLSL_BURST_VS: GLSL_BURST_VS, WGSL_SCENE: WGSL_SCENE, WGSL_PART: WGSL_PART, WGSL_BURST: WGSL_BURST }
  };
})();
