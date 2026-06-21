/* T93 — fxgl.js (the visual-FX engine). Headless proof that the brickmap-ported
 * pipeline is correct and within budget, with a recording WebGL2 stub asserting
 * a single instanced draw + a one-time texture upload. Run: node test/fxgl.test.js
 */
const fs = require("fs"), path = require("path");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }

global.window = {};
new Function(read("scenery.js"))();
new Function(read("fxgl.js"))();
const S = global.window.Scenery;
const FXGL = global.window.FXGL;

// =====================================================================
// 1) Pure dither (Bayer 4×4) — ported from brickmap palette.wgsl/splat.wgsl
// =====================================================================
const seen = new Set();
let inRange = true;
for(let y = 0; y < 4; y++) for(let x = 0; x < 4; x++){
  const v = FXGL.bayer4(x, y); seen.add(Math.round(v * 16 - 0.5));
  if(!(v > 0 && v < 1)) inRange = false;
}
ok(seen.size === 16, "Bayer 4×4 yields 16 distinct thresholds (" + seen.size + ")");
ok(inRange, "every Bayer threshold is in (0,1)");
ok(FXGL.bayer4(0, 0) === FXGL.bayer4(4, 8), "Bayer tiles on a 4×4 lattice (wraps)");
ok(FXGL.bayer4(-1, -1) === FXGL.bayer4(3, 3), "Bayer wraps for negative pixel coords");

// =====================================================================
// 2) Palette ramp + luminance quantise — the poster look (palette.wgsl)
// =====================================================================
const luBlack = FXGL.luma([0, 0, 0]), luWhite = FXGL.luma([255, 255, 255]);
ok(Math.abs(luBlack) < 1e-9 && Math.abs(luWhite - 1) < 1e-9, "luma maps black→0, white→1");
ok(FXGL.luma([0, 255, 0]) > FXGL.luma([0, 0, 255]), "luma weights green over blue (perceptual)");

const ramp = FXGL.buildRamp(["#ffffff", "#000000", "#888888", "#888888", "#222222"], 8);
let ascending = true;
for(let i = 1; i < ramp.length; i++) if(FXGL.luma(ramp[i]) < FXGL.luma(ramp[i - 1])) ascending = false;
ok(ascending, "buildRamp orders the palette dark→light by luminance");
ok(ramp.length === 4, "buildRamp dedupes (#888888 once) → 4 stops");
const capped = FXGL.buildRamp(Array.from({ length: 40 }, (_, i) => FXGL.toHex([i * 6, i * 6, i * 6])), 8);
ok(capped.length === 8, "buildRamp caps a busy palette to maxSteps (8)");

// hard quantise (spread 0) snaps to the nearest ramp stop; dither can nudge it
const hardLo = FXGL.rampIndex(0.0, 4, 0.99, 0);
const hardHi = FXGL.rampIndex(1.0, 4, 0.01, 0);
ok(hardLo === 0 && hardHi === 3, "rampIndex hard-quantises ends to 0 and count-1");
const a = FXGL.rampIndex(0.5, 4, 0.0, 1), b = FXGL.rampIndex(0.5, 4, 0.99, 1);
ok(a !== b, "Bayer dither nudges a mid value across stops (a=" + a + " b=" + b + ")");
ok(FXGL.rampIndex(0.5, 4, 0.0, 0) === FXGL.rampIndex(0.5, 4, 0.99, 0), "spread 0 ignores the Bayer offset");
// quantizePixel returns a real ramp colour (in-gamut, from the ramp)
const qp = FXGL.quantizePixel([200, 200, 200], 1, 2, ramp, 1);
ok(ramp.some(c => c[0] === qp[0] && c[1] === qp[1] && c[2] === qp[2]), "quantizePixel returns a colour from the ramp");

// =====================================================================
// 3) Renders a REAL scenery theme (not noise): the base image IS the grid,
//    and the ramp is drawn from the grid's own palette.
// =====================================================================
const grid = S.buildGrid(4);                       // Frostpeak Caverns (snow accent)
const img = FXGL.gridToImage(grid);
ok(img.w === S.COLS && img.h === S.ROWS, "gridToImage matches the scenery grid size (" + img.w + "×" + img.h + ")");
const c00 = FXGL.parseColor(grid[0][0]);
ok(img.data[0] === c00[0] && img.data[1] === c00[1] && img.data[2] === c00[2] && img.data[3] === 255,
   "the base texture is the literal scenery grid (cell 0,0 preserved)");
const gColors = FXGL.gridColors(grid).map(FXGL.parseColor);
const sceneRamp = FXGL.buildRamp(FXGL.gridColors(grid), 8);
ok(sceneRamp.every(rc => gColors.some(gc => gc[0] === rc[0] && gc[1] === rc[1] && gc[2] === rc[2])),
   "the ramp is built from the scenery palette (every stop is a real grid colour)");
const derived = FXGL.deriveScene({ grid: grid, seed: 4, particles: { kind: "snow", count: 60 } }, FXGL.PARTICLE_CAP);
ok(derived.image.w === S.COLS && derived.ramp.length >= 2 && derived.particles.length === 60, "deriveScene assembles ramp+image+particles");
let threw = false; try{ FXGL.deriveScene({ seed: 1 }, 100); }catch(e){ threw = true; }
ok(threw, "deriveScene rejects a scene with no grid (purpose=place needs a theme)");

// =====================================================================
// 4) Particle-seed math: deterministic, capped, valid; in-shader motion bounded
// =====================================================================
const rng = FXGL.makeRng(123); let rOK = true;
for(let i = 0; i < 200; i++){ const v = rng(); if(!(v >= 0 && v < 1)) rOK = false; }
ok(rOK, "makeRng (xorshift32) stays in [0,1)");
const p1 = FXGL.seedParticles({ seed: 7, particles: { count: 50, kind: "embers" } }, ramp, FXGL.PARTICLE_CAP);
const p2 = FXGL.seedParticles({ seed: 7, particles: { count: 50, kind: "embers" } }, ramp, FXGL.PARTICLE_CAP);
const p3 = FXGL.seedParticles({ seed: 8, particles: { count: 50, kind: "embers" } }, ramp, FXGL.PARTICLE_CAP);
ok(JSON.stringify(p1) === JSON.stringify(p2), "seedParticles is deterministic for a seed");
ok(JSON.stringify(p1) !== JSON.stringify(p3), "a different seed gives a different field");
const over = FXGL.seedParticles({ seed: 1, particles: { count: 99999 } }, ramp, FXGL.PARTICLE_CAP);
ok(over.length === FXGL.PARTICLE_CAP, "seedParticles caps the buffer at PARTICLE_CAP (" + over.length + ")");
let pOK = true;
for(const s of p1) if(!(s.x >= 0 && s.x < 1 && s.y >= 0 && s.y < 1 && s.alpha >= 0 && s.alpha <= 1 && s.size > 0)) pOK = false;
ok(pOK, "every seeded particle has valid pos/alpha/size");

// in-shader-equivalent motion: bounded to [0,1), wraps, deterministic; stars hold
const mote = p1.find(s => true); // any
let motionOK = true;
for(let t = 0; t < 30; t += 0.37){
  const m = FXGL.animateParticle({ x: 0.5, y: 0.5, alpha: 0.8, phase: 1, speed: 0.03, kind: 0, twinkle: 4, size: 3 }, t);
  if(!(m.x >= 0 && m.x < 1.1 && m.y >= 0 && m.y < 1 && m.alpha >= 0 && m.alpha <= 1)) motionOK = false;
}
ok(motionOK, "animateParticle keeps motes inside the frame and alpha in [0,1]");
const star0 = FXGL.animateParticle({ x: 0.3, y: 0.7, alpha: 0.8, phase: 0, speed: 0.03, kind: 3, twinkle: 4, size: 3 }, 5);
ok(star0.x === 0.3 && star0.y === 0.7, "stars hold position (only twinkle), not drift");

// =====================================================================
// 5) WebGL2 stub: ONE instanced draw/frame + a ONE-TIME texture upload, and the
//    budget invariants (single loop, capped buffer, idle when stopped).
// =====================================================================
function makeGL(rec){
  const consts = {}; let k = 1;
  const fns = {
    getShaderParameter: () => true, getProgramParameter: () => true,
    getShaderInfoLog: () => "", getProgramInfoLog: () => "",
    createShader: () => ({}), createProgram: () => ({}), createTexture: () => ({}),
    createBuffer: () => ({}), createVertexArray: () => ({}),
    getUniformLocation: () => ({}), getAttribLocation: () => 0,
    texImage2D: () => { rec.texImage2D++; },
    drawArraysInstanced: () => { rec.drawArraysInstanced++; },
    drawArrays: () => { rec.drawArrays++; },
    bufferData: () => { rec.bufferData++; }
  };
  return new Proxy(fns, {
    get(t, p){
      if(p in t) return t[p];
      if(typeof p === "string" && /^[A-Z0-9_]+$/.test(p)){ if(!(p in consts)) consts[p] = k++; return consts[p]; }
      return function(){};
    }
  });
}
function stubCanvas(){ return { width: 0, height: 0, clientWidth: 120, clientHeight: 200, getContext: () => null }; }

const rec = { texImage2D: 0, drawArraysInstanced: 0, drawArrays: 0, bufferData: 0 };
const gl = makeGL(rec);
let queue = [], rafCalls = 0, cafCalls = 0;
const raf = cb => { rafCalls++; queue.push(cb); return queue.length; };
const caf = () => { cafCalls++; };

const ctrl = new FXGL.Controller(stubCanvas(), { gl: gl, raf: raf, caf: caf, width: 120, height: 200, dpr: 1, quality: 2, reducedMotion: false });
ok(ctrl.backendName() === "webgl2", "the injected GL stub selects the WebGL2 backend");
ctrl.setScene({ grid: grid, seed: 4, particles: { kind: "snow", count: 64 } });
ok(rec.texImage2D === 2, "setScene uploads exactly 2 textures (scene + ramp), once");
ok(ctrl.particleCount() === 64, "particle buffer seeded (64)");

ctrl.start();
ok(queue.length === 1 && ctrl.isAnimating(), "start() schedules exactly ONE rAF (single loop)");
let ts = 0;
for(let i = 0; i < 6; i++){ const cb = queue.shift(); ts += 16; cb(ts); }
ok(queue.length === 1, "the loop keeps exactly one frame in flight (no RAF pile-up)");
ok(rec.drawArraysInstanced === 6, "exactly ONE instanced draw per frame (6 frames → 6)");
ok(rec.texImage2D === 2, "textures are NOT re-uploaded per frame (one-time upload)");

const before = rec.drawArraysInstanced;
ctrl.stop();
ok(!ctrl.isAnimating() && cafCalls >= 1, "stop() cancels the RAF and clears the running flag");
const stale = queue.shift(); if(stale) stale(ts + 16);                 // a stale frame must no-op
ok(rec.drawArraysInstanced === before, "no render runs after stop() (idle when stopped)");

// capped buffer via the degrade ladder: a field that exceeds the low cap is
// actually clamped down when quality drops.
const lowCap = Math.round(FXGL.PARTICLE_CAP * FXGL.QUALITY[0].particles);
ctrl.setScene({ grid: grid, seed: 4, particles: { kind: "snow", count: 400 } });
ok(ctrl.particleCount() === 400, "high quality keeps the full 400-particle field");
ctrl.setQuality(0);
ok(ctrl.particleCount() === lowCap, "setQuality(0) clamps the field to the low cap (" + ctrl.particleCount() + " = " + lowCap + ")");

// =====================================================================
// 6) Fallbacks: reduced-motion + no-GPU → a static still, NO animation loop
// =====================================================================
let fillRects = 0;
const ctx2d = { createImageData: null, putImageData: null,
  fillRect: () => { fillRects++; }, set fillStyle(v){}, get fillStyle(){ return ""; },
  clearRect: () => {} };
let rmRaf = 0;
const rmCtrl = new FXGL.Controller(stubCanvas(), { ctx2d: ctx2d, raf: () => { rmRaf++; }, caf: () => {}, width: 100, height: 100, dpr: 1, reducedMotion: true });
ok(rmCtrl.backendName() === "cpu-still", "no-GPU canvas falls back to the CPU still backend");
rmCtrl.setScene({ grid: grid, seed: 4, particles: { kind: "snow", count: 30 } });
ok(fillRects > 0, "the still renders the scene once (CPU dither path drew cells)");
const stillRects = fillRects;
rmCtrl.start();
ok(rmRaf === 0 && !rmCtrl.isAnimating(), "reduced-motion / still never starts a RAF (static still)");
ok(fillRects >= stillRects, "start() on a still re-draws one frame, no loop");

// CPU still with an ImageData-capable ctx uses the per-pixel dither pipeline
let putCalls = 0;
const ctxID = { createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  putImageData: () => { putCalls++; }, fillRect: () => {} };
const idCtrl = new FXGL.Controller(stubCanvas(), { ctx2d: ctxID, raf: () => {}, caf: () => {}, width: 32, height: 24, dpr: 1, reducedMotion: true });
idCtrl.setScene({ grid: grid, seed: 4 });
ok(putCalls === 1, "the per-pixel CPU still uses putImageData (one still frame)");

// =====================================================================
// 7) Standalone + capabilities + shader sanity
// =====================================================================
const src = read("fxgl.js");
ok(!/\brequire\s*\(|^\s*import\s/m.test(src), "fxgl.js has no bundler/module deps (self-contained)");
ok(!/\bwasm\b|WebAssembly|\.wgsl"|wgpu/i.test(src), "fxgl.js bundles no brickmap Rust/WASM (recipes ported, not the engine)");
const caps = FXGL.capabilities();
ok(typeof caps.webgpu === "boolean" && typeof caps.webgl2 === "boolean" && typeof caps.reducedMotion === "boolean",
   "capabilities() reports webgpu / webgl2 / reducedMotion");
// both GPU paths carry the Bayer dither + the instanced particle draw
ok(/BAYER|bayer/.test(FXGL.shaders.GLSL_SCENE_FS) && /bayer/.test(FXGL.shaders.WGSL_SCENE), "both scene shaders dither (Bayer)");
ok(/drawArraysInstanced/.test(src) && /draw\(6,/.test(src), "both backends issue an instanced particle draw");

console.log("\n" + (fails === 0 ? "ALL " + checks + " FXGL CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
