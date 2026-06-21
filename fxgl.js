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
    this.u = {
      sScene: gl.getUniformLocation(this.sceneP, "uScene"),
      sRamp: gl.getUniformLocation(this.sceneP, "uRamp"),
      sCount: gl.getUniformLocation(this.sceneP, "uRampCount"),
      sDither: gl.getUniformLocation(this.sceneP, "uDither"),
      sTime: gl.getUniformLocation(this.sceneP, "uTime"),
      pTime: gl.getUniformLocation(this.partP, "uTime"),
      pRes: gl.getUniformLocation(this.partP, "uRes")
    };
    this.sceneTex = gl.createTexture();
    this.rampTex = gl.createTexture();
    this.instBuf = gl.createBuffer();
    this.vao = gl.createVertexArray ? gl.createVertexArray() : null;
    this.count = 0; this.rampCount = 2; this.dither = 1; this.w = 1; this.h = 1;
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
  GLBackend.prototype.resize = function(w, h){ this.w = Math.max(1, w | 0); this.h = Math.max(1, h | 0); this.gl.viewport(0, 0, this.w, this.h); };
  GLBackend.prototype.render = function(time){
    const gl = this.gl, u = this.u;
    gl.viewport(0, 0, this.w, this.h);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    // pass 1 — the dithered, palette-quantised scene
    gl.disable(gl.BLEND);
    gl.useProgram(this.sceneP);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.sceneTex); gl.uniform1i(u.sScene, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.rampTex); gl.uniform1i(u.sRamp, 1);
    gl.uniform1f(u.sCount, this.rampCount); gl.uniform1f(u.sDither, this.dither); gl.uniform1f(u.sTime, time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // pass 2 — the additive instanced particle field (one draw call)
    if(this.count > 0){
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(this.partP);
      gl.uniform1f(u.pTime, time); gl.uniform2f(u.pRes, this.w, this.h);
      if(this.vao) gl.bindVertexArray(this.vao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.count);
      if(this.vao) gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
    }
  };
  GLBackend.prototype.dispose = function(){
    const gl = this.gl;
    gl.deleteTexture && gl.deleteTexture(this.sceneTex);
    gl.deleteTexture && gl.deleteTexture(this.rampTex);
    gl.deleteBuffer && gl.deleteBuffer(this.instBuf);
    gl.deleteProgram && gl.deleteProgram(this.sceneP);
    gl.deleteProgram && gl.deleteProgram(this.partP);
    if(this.vao && gl.deleteVertexArray) gl.deleteVertexArray(this.vao);
  };

  // =========================================================================
  // WebGPU backend — progressive enhancement (real, browser-only)
  // =========================================================================
  function GPUBackend(device, ctx, format){
    this.name = "webgpu"; this.device = device; this.ctx = ctx; this.format = format;
    this.w = 1; this.h = 1; this.count = 0;
    const sm = device.createShaderModule({ code: WGSL_SCENE });
    const pm = device.createShaderModule({ code: WGSL_PART });
    this.sceneU = device.createBuffer({ size: 16, usage: 0x40 | 0x8 /* UNIFORM|COPY_DST */ });
    this.partU = device.createBuffer({ size: 16, usage: 0x40 | 0x8 });
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
  GPUBackend.prototype.resize = function(w, h){ this.w = Math.max(1, w | 0); this.h = Math.max(1, h | 0); };
  GPUBackend.prototype.render = function(time){
    const d = this.device;
    d.queue.writeBuffer(this.sceneU, 0, new Float32Array([this.rampCount, this.dither, time, 0]));
    d.queue.writeBuffer(this.partU, 0, new Float32Array([time, this.w, this.h, 0]));
    const enc = d.createCommandEncoder();
    const view = this.ctx.getCurrentTexture().createView();
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: view, clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" }] });
    pass.setPipeline(this.scenePipe); pass.setBindGroup(0, this.sceneBind); pass.draw(3, 1, 0, 0);
    if(this.count > 0){ pass.setPipeline(this.partPipe); pass.setBindGroup(0, this.partBind); pass.setVertexBuffer(0, this.instBuf); pass.draw(6, this.count, 0, 0); }
    pass.end(); d.queue.submit([enc.finish()]);
  };
  GPUBackend.prototype.dispose = function(){
    this.sceneTex && this.sceneTex.destroy && this.sceneTex.destroy();
    this.rampTex && this.rampTex.destroy && this.rampTex.destroy();
    this.instBuf && this.instBuf.destroy && this.instBuf.destroy();
  };

  // =========================================================================
  // CPU still backend — the no-GPU / reduced-motion fallback (a static still)
  // =========================================================================
  function CPUBackend(ctx2d){ this.name = "cpu-still"; this.ctx = ctx2d; this.w = 1; this.h = 1; }
  CPUBackend.prototype.setData = function(derived){ this.derived = derived; };
  CPUBackend.prototype.resize = function(w, h){ this.w = Math.max(1, w | 0); this.h = Math.max(1, h | 0); };
  // Render the scene once, dithered + palette-quantised on the CPU. No motion,
  // no RAF — a faithful still of the same pipeline (purpose: place, statically).
  CPUBackend.prototype.render = function(){
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
    this.running = false;
    this.rafId = 0;
    this.startTs = 0;
    this.ready = false;
    this.wantStart = false;
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
  Controller.prototype._use = function(backend){
    this.backend = backend;
    this.ready = true;
    this._applyResize();
    if(this.derived) backend.setData(this.derived);
    // CPU still + reduced-motion never animate: draw one frame.
    if(this.derived && (this.reduced || backend.name === "cpu-still")){ backend.render(0); this.running = false; }
    else if(this.wantStart){ this.wantStart = false; this.start(); }
  };
  Controller.prototype.setScene = function(scene){
    this.scene = scene;
    this.derived = deriveScene(scene, this.particleCap());
    if(this.backend){
      this.backend.setData(this.derived);
      if(this.reduced || this.backend.name === "cpu-still"){ this._applyResize(); this.backend.render(0); }
    }
    return this;
  };
  Controller.prototype.setQuality = function(q){
    this.quality = Math.max(0, Math.min(2, q | 0));
    // Re-seed at the new particle cap and re-fit the buffer.
    if(this.scene){ this.derived = deriveScene(this.scene, this.particleCap()); if(this.backend) this.backend.setData(this.derived); }
    this._applyResize();
    if(this.backend && (this.reduced || this.backend.name === "cpu-still") && this.derived) this.backend.render(0);
    return this;
  };
  Controller.prototype.start = function(){
    if(this.running) return this;
    if(!this.ready){ this.wantStart = true; return this; }
    if(!this.derived) return this;
    // Reduced motion or a still-only backend → one static frame, no loop.
    if(this.reduced || this.backend.name === "cpu-still"){ this.backend.render(0); this.running = false; return this; }
    if(!this.raf) return this;
    this.running = true; this.startTs = 0;
    const self = this;
    this.rafId = this.raf(function f(ts){
      if(!self.running) return;
      if(!self.startTs) self.startTs = ts;
      self.backend.render((ts - self.startTs) / 1000);
      self.rafId = self.raf(f);
    });
    return this;
  };
  Controller.prototype.stop = function(){
    this.running = false;
    if(this.rafId){ this.caf(this.rafId); this.rafId = 0; }
    return this;
  };
  Controller.prototype.resize = function(){ this._applyResize(); if(!this.running && this.derived && this.backend) this.backend.render(0); return this; };
  Controller.prototype.dispose = function(){ this.stop(); if(this.backend) this.backend.dispose(); this.backend = null; this.ready = false; return this; };
  Controller.prototype.isAnimating = function(){ return this.running; };
  Controller.prototype.particleCount = function(){ return this.derived ? this.derived.particles.length : 0; };
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

  window.FXGL = {
    // runtime API
    mount: mount, setScene: setScene, start: start, stop: stop,
    setQuality: setQuality, dispose: dispose, resize: function(){ if(active) active.resize(); },
    capabilities: capabilities, active: function(){ return active; },
    Controller: Controller,
    // budget constants
    PARTICLE_CAP: PARTICLE_CAP, QUALITY: QUALITY, KIND: KIND, BAYER: BAYER,
    // pure math (headless-tested)
    bayer4: bayer4, parseColor: parseColor, toHex: toHex, luma: luma,
    buildRamp: buildRamp, rampIndex: rampIndex, quantizePixel: quantizePixel,
    gridToImage: gridToImage, gridColors: gridColors,
    makeRng: makeRng, seedParticles: seedParticles, animateParticle: animateParticle,
    deriveScene: deriveScene,
    // shader sources (so a wiring task / tests can inspect them)
    shaders: { GLSL_SCENE_VS: GLSL_SCENE_VS, GLSL_SCENE_FS: GLSL_SCENE_FS, GLSL_PART_VS: GLSL_PART_VS, GLSL_PART_FS: GLSL_PART_FS, WGSL_SCENE: WGSL_SCENE, WGSL_PART: WGSL_PART }
  };
})();
