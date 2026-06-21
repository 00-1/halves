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

// =====================================================================
// 8) Celebration burst (T94) — brief, capped, seeded, deterministic, auto-stops
// =====================================================================
// pure seed: deterministic, capped, reduced = calmer
const bA = FXGL.seedBurst({ count: 50, seed: 42, x: 0.5, y: 0.5 }, false, FXGL.BURST_CAP);
const bB = FXGL.seedBurst({ count: 50, seed: 42 }, false, FXGL.BURST_CAP);
const bC = FXGL.seedBurst({ count: 50, seed: 43 }, false, FXGL.BURST_CAP);
ok(JSON.stringify(bA) === JSON.stringify(bB), "seedBurst is deterministic for a seed");
ok(JSON.stringify(bA) !== JSON.stringify(bC), "a different seed → a different burst");
ok(FXGL.seedBurst({ count: 99999, seed: 1 }, false, FXGL.BURST_CAP).length === FXGL.BURST_CAP,
   "seedBurst caps at BURST_CAP (" + FXGL.BURST_CAP + ")");
const full = FXGL.seedBurst({ count: 100, seed: 5 }, false, FXGL.BURST_CAP).length;
const calm = FXGL.seedBurst({ count: 100, seed: 5 }, true, FXGL.BURST_CAP).length;
ok(calm < full, "reduced motion → a calmer, fewer-particle flourish (" + calm + " < " + full + ")");

// closed-form lifecycle: invisible before birth / after life, visible mid-life
const one = FXGL.seedBurst({ count: 1, seed: 3, x: 0.5, y: 0.5 }, false, FXGL.BURST_CAP)[0]; one.birth = 0;
const G = FXGL.BURST_GRAVITY, K = FXGL.BURST_DRAG;
const pre = FXGL.burstPos(one, -0.1, G, K), mid = FXGL.burstPos(one, one.life * 0.5, G, K), post = FXGL.burstPos(one, one.life + 0.5, G, K);
ok(pre.alpha === 0 && !pre.alive, "burstPos: alpha 0 before birth");
ok(mid.alive && mid.alpha > 0, "burstPos: alive + visible mid-life");
ok(post.alpha === 0 && !post.alive, "burstPos: alpha 0 after life (particles self-expire)");
ok(FXGL.burstMaxDeath(bA) > 0 && FXGL.burstMaxDeath([{ birth: 1, life: 0.5 }]) === 1.5, "burstMaxDeath = latest birth+life");

// controller burst as a STANDALONE overlay (no ambient scene set)
const brec = { texImage2D: 0, drawArraysInstanced: 0, drawArrays: 0, bufferData: 0 };
const bgl = makeGL(brec);
let bq = [], bcaf = 0;
const bc = new FXGL.Controller(stubCanvas(), { gl: bgl, raf: cb => { bq.push(cb); return bq.length; }, caf: () => { bcaf++; }, width: 120, height: 200, dpr: 1, quality: 2, reducedMotion: false });
bc.burst({ x: 0.5, y: 0.5, count: 120, seed: 9, palette: ["#ffd98a", "#ffffff"] });
ok(bc.isBursting() && bc.burstCount() === 120, "burst() fires a 120-particle overlay (no scene needed)");
ok(bq.length === 1, "burst() pumps exactly ONE rAF (single loop)");
let bts = 0, bf = 0;
while(bq.length && bf < 200){ const cb = bq.shift(); bts += 80; cb(bts); bf++; }
ok(brec.drawArraysInstanced === bf, "exactly one instanced burst draw per frame (" + bf + ")");
ok(brec.drawArrays === 0, "a burst-only overlay draws no scene pass");
ok(!bc.isBursting() && bq.length === 0 && bc.rafId === 0, "the burst auto-stops and idles the RAF — no leak (" + bf + " frames)");
ok(bc.burstCount() === 0, "the burst buffer is released on auto-stop");

// burst is capped at the controller too
const cap2 = new FXGL.Controller(stubCanvas(), { gl: makeGL({}), raf: () => {}, caf: () => {}, width: 100, height: 100, dpr: 1, reducedMotion: false });
cap2.burst({ count: 99999, seed: 2 });
ok(cap2.burstCount() === FXGL.BURST_CAP, "a controller burst is capped at BURST_CAP (" + cap2.burstCount() + ")");

// burst OVER a running ambient scene: a frame draws the field AND the burst
const srec = { texImage2D: 0, drawArraysInstanced: 0, drawArrays: 0, bufferData: 0 };
let sq = [];
const sc = new FXGL.Controller(stubCanvas(), { gl: makeGL(srec), raf: cb => { sq.push(cb); return sq.length; }, caf: () => {}, width: 120, height: 200, dpr: 1, quality: 2, reducedMotion: false });
sc.setScene({ grid: grid, seed: 4, particles: { kind: "snow", count: 40 } });
sc.start();
sc.burst({ count: 60, seed: 2 });
ok(sq.length === 1, "scene + burst share the single RAF (still one frame in flight)");
const cbA = sq.shift(); cbA(50); const after1 = srec.drawArraysInstanced;
const cbB = sq.shift(); cbB(130); const after2 = srec.drawArraysInstanced;
ok(after1 === 2 && after2 === 4, "a running scene + a burst draw 2 instanced calls/frame (field + burst)");
ok(srec.texImage2D === 2, "the burst never re-uploads the scene textures (still one-time)");

// reduced-motion burst still fires a calm flourish AND auto-stops (no leak)
let rq = [];
const rc = new FXGL.Controller(stubCanvas(), { gl: makeGL({}), raf: cb => { rq.push(cb); return rq.length; }, caf: () => {}, width: 100, height: 100, dpr: 1, reducedMotion: true });
rc.burst({ count: 100, seed: 5 });
ok(rc.isBursting() && rc.burstCount() === calm, "a reduced-motion burst fires the calm flourish");
let rts = 0, rf = 0;
while(rq.length && rf < 200){ const cb = rq.shift(); rts += 80; cb(rts); rf++; }
ok(!rc.isBursting() && rq.length === 0, "the reduced-motion burst also auto-stops cleanly");

// both GPU paths carry the burst pipeline
ok(/exp\(-k\*lt\)/.test(FXGL.shaders.GLSL_BURST_VS) && /exp\(-k\*lt\)/.test(FXGL.shaders.WGSL_BURST),
   "both burst shaders use the closed-form drag trajectory");

// =====================================================================
// 9) Semantic home backdrop (T95) — derived from LIVE home state, not noise
// =====================================================================
const meanLumaRow = (g, r) => { let s = 0; for(const cell of g[r]) s += FXGL.luma(FXGL.parseColor(cell)); return s / g[r].length; };
const brightestRow = (g) => { let bi = 0, bl = -1; for(let r = 0; r < g.length; r++){ const l = meanLumaRow(g, r); if(l > bl){ bl = l; bi = r; } } return bi; };

// deterministic: same state → identical backdrop
const stLo = { progress: 0.1, streak: 0 };
const hsA = FXGL.deriveHomeScene(stLo), hsB = FXGL.deriveHomeScene({ progress: 0.1, streak: 0 });
ok(JSON.stringify(hsA) === JSON.stringify(hsB), "deriveHomeScene is deterministic for a given state");

// momentum drives density: more progress/streak → a livelier (but capped) field
const hsHi = FXGL.deriveHomeScene({ progress: 0.9, streak: 6 });
ok(hsHi.particles.count > hsA.particles.count, "particle density encodes momentum (progress/streak)");
ok(hsHi.particles.count <= FXGL.HOME_PARTICLE_MAX, "home field stays capped + calm (≤ HOME_PARTICLE_MAX)");
ok(JSON.stringify(hsHi) !== JSON.stringify(hsA), "a different home state → a different backdrop");

// momentum raises the dawn: the glow band sits higher (smaller row) with progress
ok(brightestRow(hsHi.grid) < brightestRow(hsA.grid), "the horizon glow RISES with progress (status: momentum)");

// streak is read as status: crossing a streak threshold switches to warm embers
ok(FXGL.deriveHomeScene({ progress: 0.3, streak: 0 }).particles.kind === "motes", "no streak → calm motes");
ok(FXGL.deriveHomeScene({ progress: 0.3, streak: 4 }).particles.kind === "embers", "a streak (≥3) → warm embers (on a roll)");

// today's EVENT is worn: its palette + seed drive the backdrop (real source)
const evState = { progress: 0.5, streak: 1, event: { palette: ["#101826", "#3a1f5c", "#b048a0", "#ffd0f0"], seed: 777, name: "Spring Rush", mood: "stars" } };
const hsEv = FXGL.deriveHomeScene(evState);
ok(JSON.stringify(hsEv.palette) === JSON.stringify(evState.event.palette), "with an event, the home wears the event palette");
ok(hsEv.particles.kind === "stars", "the event mood sets the particle kind");
ok(FXGL.seedFromHome(evState) === hsEv.seed && hsEv.seed === FXGL.deriveHomeScene(evState).seed, "the seed is derived from event state (stable)");
ok(FXGL.seedFromHome({ progress: 0.5 }) !== FXGL.seedFromHome({ progress: 0.5, event: { seed: 777, name: "Spring Rush" } }), "the seed shifts when today's event changes");

// it renders through the T93 pipeline on a real backend (single RAF, idles)
const hrec = { texImage2D: 0, drawArraysInstanced: 0, drawArrays: 0, bufferData: 0 };
let hq = [], hcaf = 0;
const hc = new FXGL.Controller(stubCanvas(), { gl: makeGL(hrec), raf: cb => { hq.push(cb); return hq.length; }, caf: () => { hcaf++; }, width: 360, height: 640, dpr: 1, quality: 2, reducedMotion: false });
hc.setHomeState({ progress: 0.7, streak: 5 });
ok(hrec.texImage2D === 2 && hc.particleCount() > 0, "setHomeState uploads the derived scene (textures once)");
hc.start();
let ht = 0; for(let i = 0; i < 4; i++){ const cb = hq.shift(); ht += 16; cb(ht); }
ok(hq.length === 1 && hrec.drawArraysInstanced === 4, "home backdrop animates on a single RAF (one draw/frame)");
hc.stop();
ok(hcaf >= 1 && !hc.isAnimating(), "the home backdrop idles when stopped (off-home: no RAF)");

// reduced motion → a static still, no loop (legible, motion-safe)
let hrm = 0;
const hcRm = new FXGL.Controller(stubCanvas(), { gl: makeGL({}), raf: () => { hrm++; }, caf: () => {}, width: 360, height: 640, dpr: 1, reducedMotion: true });
hcRm.setHomeState({ progress: 0.4, streak: 2 });
hcRm.start();
ok(hrm === 0 && !hcRm.isAnimating(), "reduced-motion home backdrop is a static still (no RAF)");

// =====================================================================
// 10) Semantic Arena biome (T108) — derived from LIVE Arena state
// =====================================================================
const meanLuma = (g) => { let s = 0, n = 0; for(const row of g) for(const cell of row){ s += FXGL.luma(FXGL.parseColor(cell)); n++; } return s / n; };
const paletteLuma = (p) => FXGL.luma(FXGL.parseColor(p[p.length - 1]));   // brightness of the glow end

// deterministic per state
const asA = FXGL.deriveArenaScene({ region: 3, tier: 2, bossProximity: 0.2, mood: "neutral" });
const asB = FXGL.deriveArenaScene({ region: 3, tier: 2, bossProximity: 0.2, mood: "neutral" });
ok(JSON.stringify(asA) === JSON.stringify(asB), "deriveArenaScene is deterministic for a given state");

// region drives a distinct sense of place (different palette/mood per region)
const r1 = FXGL.deriveArenaScene({ region: 1, tier: 1 }), r7 = FXGL.deriveArenaScene({ region: 7, tier: 1 }), r10 = FXGL.deriveArenaScene({ region: 10, tier: 1 });
ok(JSON.stringify(r1.palette) !== JSON.stringify(r7.palette) && JSON.stringify(r7.palette) !== JSON.stringify(r10.palette),
   "different regions → different palettes (sense of place)");
ok(r7.particles.kind === "embers" && r5kind(), "region accent kinds differ (Cinderwaste embers, Frostpeak snow)");
function r5kind(){ return FXGL.deriveArenaScene({ region: 5, tier: 1 }).particles.kind === "snow"; }
const allRegions = []; for(let rg = 1; rg <= 10; rg++) allRegions.push(JSON.stringify(FXGL.deriveArenaScene({ region: rg, tier: 1 }).palette));
ok(new Set(allRegions).size === 10, "all 10 region palettes are distinct (" + new Set(allRegions).size + "/10)");

// boss-proximity raises intensity → denser particles + a hotter/brighter glow
const farBoss = FXGL.deriveArenaScene({ region: 9, tier: 3, bossProximity: 0.1 });
const nearBoss = FXGL.deriveArenaScene({ region: 9, tier: 3, bossProximity: 0.95 });
ok(nearBoss.particles.count > farBoss.particles.count, "nearer the boss → denser particle field (status: intensity)");
ok(paletteLuma(nearBoss.palette) > paletteLuma(farBoss.palette), "nearer the boss → a hotter/brighter glow");
ok(meanLuma(nearBoss.grid) > meanLuma(farBoss.grid), "nearer the boss → a brighter backdrop (the glow band swells)");

// tier within a region also lifts intensity (deeper = tenser)
const lowTier = FXGL.deriveArenaScene({ region: 2, tier: 0, bossProximity: 0 });
const highTier = FXGL.deriveArenaScene({ region: 2, tier: 11, bossProximity: 0 });
ok(highTier.particles.count > lowTier.particles.count, "deeper tier → higher baseline intensity");
ok(FXGL.arenaIntensity({ facingBoss: true }) === 1, "facingBoss pins intensity to the peak (1.0)");

// mood: victory warms/brightens vs neutral; defeat dims
const neutral = FXGL.deriveArenaScene({ region: 6, tier: 4, bossProximity: 0.5, mood: "neutral" });
const victory = FXGL.deriveArenaScene({ region: 6, tier: 4, bossProximity: 0.5, mood: "victory" });
const defeat = FXGL.deriveArenaScene({ region: 6, tier: 4, bossProximity: 0.5, mood: "defeat" });
ok(paletteLuma(victory.palette) > paletteLuma(neutral.palette), "victory mood warms/brightens the palette");
ok(paletteLuma(defeat.palette) < paletteLuma(neutral.palette), "defeat mood dims the palette");
ok(victory.particles.kind === "embers", "victory adds warm embers");

// capped + region clamped
ok(nearBoss.particles.count <= FXGL.ARENA_PARTICLE_MAX, "the Arena field is capped (≤ ARENA_PARTICLE_MAX)");
ok(JSON.stringify(FXGL.deriveArenaScene({ region: 99 }).palette) === JSON.stringify(FXGL.deriveArenaScene({ region: 10 }).palette), "out-of-range region clamps to the last region");

// accepts the real scenery.js region grid when the [A] side passes it
const realGrid = S.buildGrid(4);
const withGrid = FXGL.deriveArenaScene({ region: 5, tier: 2, grid: realGrid });
ok(withGrid.grid === realGrid, "deriveArenaScene uses the caller's scenery grid when provided");
ok(JSON.stringify(withGrid.palette) !== JSON.stringify(FXGL.gridColors(realGrid)), "…but recolours it via the live region palette (not the raw grid colours)");

// renders through the T93 pipeline on a real backend (single RAF, idles, textures once)
const arec = { texImage2D: 0, drawArraysInstanced: 0, drawArrays: 0, bufferData: 0 };
let aq = [], acaf = 0;
const ac = new FXGL.Controller(stubCanvas(), { gl: makeGL(arec), raf: cb => { aq.push(cb); return aq.length; }, caf: () => { acaf++; }, width: 360, height: 640, dpr: 1, quality: 2, reducedMotion: false });
ac.setArenaState({ region: 9, tier: 5, bossProximity: 0.9, mood: "neutral" });
ok(arec.texImage2D === 2 && ac.particleCount() > 0, "setArenaState uploads the derived scene (textures once)");
ac.start();
let at = 0; for(let i = 0; i < 4; i++){ const cb = aq.shift(); at += 16; cb(at); }
ok(aq.length === 1 && arec.drawArraysInstanced === 4, "Arena biome animates on a single RAF (one draw/frame)");
ac.stop();
ok(acaf >= 1 && !ac.isAnimating(), "the Arena biome idles when stopped (off-Arena: no RAF)");

// reduced motion → a static still
let arm = 0;
const acRm = new FXGL.Controller(stubCanvas(), { gl: makeGL({}), raf: () => { arm++; }, caf: () => {}, width: 360, height: 640, dpr: 1, reducedMotion: true });
acRm.setArenaState({ region: 7, tier: 6, bossProximity: 0.8 });
acRm.start();
ok(arm === 0 && !acRm.isAnimating(), "reduced-motion Arena biome is a static still (no RAF)");

// =====================================================================
// 11) BIG celebration shower (T126) — loads of particles, same invariants
// =====================================================================
// seedCelebrate: many more, bigger, longer-lived; capped at the higher ceiling
const cel = FXGL.seedCelebrate({ count: 500, seed: 3 }, false, FXGL.CELEBRATE_CAP);
const brst = FXGL.seedBurst({ count: 500, seed: 3 }, false, FXGL.BURST_CAP);
ok(FXGL.CELEBRATE_CAP > FXGL.BURST_CAP && FXGL.CELEBRATE_CAP >= 600, "CELEBRATE_CAP is a much higher ceiling (" + FXGL.CELEBRATE_CAP + ")");
ok(FXGL.seedCelebrate({ count: 99999, seed: 1 }, false, FXGL.CELEBRATE_CAP).length === FXGL.CELEBRATE_CAP, "seedCelebrate caps at CELEBRATE_CAP");
ok(cel.length > brst.length, "a celebration seeds far more particles than a plain burst (" + cel.length + " > " + brst.length + ")");
const avg = (a, f) => a.reduce((s, p) => s + f(p), 0) / a.length;
ok(avg(cel, p => p.size) > avg(brst, p => p.size), "celebration particles are bigger");
ok(avg(cel, p => p.life) > avg(brst, p => p.life), "celebration particles live longer (a real shower)");
ok(JSON.stringify(FXGL.seedCelebrate({ count: 200, seed: 9 }, false, FXGL.CELEBRATE_CAP)) === JSON.stringify(FXGL.seedCelebrate({ count: 200, seed: 9 }, false, FXGL.CELEBRATE_CAP)), "seedCelebrate is deterministic for a seed");
ok(FXGL.seedCelebrate({ count: 500, seed: 3 }, true, FXGL.CELEBRATE_CAP).length < cel.length, "reduced motion → a calmer, smaller shower");
// bright default palette (festive) when none is supplied
ok(cel.some(p => p.b > 200) && cel.some(p => p.r > 200), "celebration defaults to a bright, festive palette");

// controller.celebrate: a big overlay, single RAF, one draw/frame, auto-stops, frees the buffer
const crec = { texImage2D: 0, drawArraysInstanced: 0, drawArrays: 0, bufferData: 0 };
let cq = [], ccaf = 0;
const cc = new FXGL.Controller(stubCanvas(), { gl: makeGL(crec), raf: cb => { cq.push(cb); return cq.length; }, caf: () => { ccaf++; }, width: 360, height: 640, dpr: 1, quality: 2, reducedMotion: false });
cc.celebrate({ x: 0.5, y: 0.6, count: 600, seed: 7 });
ok(cc.isBursting() && cc.burstCount() > 256, "celebrate() fires hundreds of particles (" + cc.burstCount() + " > the burst cap)");
ok(cq.length === 1, "celebrate() pumps exactly ONE rAF (single loop)");
let cts = 0, cf = 0;
while(cq.length && cf < 400){ const cb = cq.shift(); cts += 80; cb(cts); cf++; }
ok(crec.drawArraysInstanced === cf, "one instanced draw per frame (no per-particle JS — " + cf + " frames)");
ok(!cc.isBursting() && cq.length === 0 && cc.burstCount() === 0, "the celebration auto-stops, idles the RAF, frees its buffer (no leak)");

// setQuality degrades the celebration count (Poco-X3 budget)
const lo = new FXGL.Controller(stubCanvas(), { gl: makeGL({}), raf: () => {}, caf: () => {}, width: 360, height: 640, dpr: 1, quality: 0, reducedMotion: false });
lo.celebrate({ count: 800, seed: 1 });
const hiCtrl = new FXGL.Controller(stubCanvas(), { gl: makeGL({}), raf: () => {}, caf: () => {}, width: 360, height: 640, dpr: 1, quality: 2, reducedMotion: false });
hiCtrl.celebrate({ count: 800, seed: 1 });
ok(lo.burstCount() < hiCtrl.burstCount() && lo.burstCount() <= Math.round(FXGL.CELEBRATE_CAP * FXGL.QUALITY[0].particles), "setQuality(0) degrades the celebration count (" + lo.burstCount() + " < " + hiCtrl.burstCount() + ")");

// the plain burst() path is NOT regressed (still capped at 256)
const reg = new FXGL.Controller(stubCanvas(), { gl: makeGL({}), raf: () => {}, caf: () => {}, width: 360, height: 640, dpr: 1, reducedMotion: false });
reg.burst({ count: 99999, seed: 2 });
ok(reg.burstCount() === FXGL.BURST_CAP, "burst() still caps at BURST_CAP (256) — no regression");

// =====================================================================
// 12) Canvas2D overlay (T133): the celebration ALWAYS renders (no 2nd GL context)
// =====================================================================
function cap2d(){
  const rec = { rects: [], cleared: 0 };
  const ctx = { _fill: "#000", _a: 1,
    clearRect: () => { rec.cleared++; },
    fillRect: (x, y, w, h) => { rec.rects.push([x | 0, y | 0, w | 0, h | 0]); },
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: () => {} };
  Object.defineProperty(ctx, "fillStyle", { get(){ return ctx._fill; }, set(v){ ctx._fill = v; } });
  Object.defineProperty(ctx, "globalAlpha", { get(){ return ctx._a; }, set(v){ ctx._a = v; } });
  return { ctx: ctx, rec: rec };
}
const cp = cap2d();
let ovq = [];
const ov = new FXGL.Controller(stubCanvas(360, 640), { backend: "2d", ctx2d: cp.ctx, raf: cb => { ovq.push(cb); return ovq.length; }, caf: () => {}, width: 360, height: 640, dpr: 1, quality: 2, reducedMotion: false });
// forced Canvas2D even though we did NOT pass a gl — and it's NOT a GL backend
ok(ov.backendName() === "cpu-still", "backend:'2d' forces the Canvas2D backend (no WebGL/WebGPU 2nd context)");
ok(ov.isReady() === true, "the overlay controller reaches ready");
ok(ov.dimensions().w > 1 && ov.dimensions().h > 1, "the overlay canvas is sized (not 1×1) before drawing (" + ov.dimensions().w + "×" + ov.dimensions().h + ")");
// celebrate → the loop animates → particles are ACTUALLY drawn (breaks green-but-invisible)
ov.celebrate({ x: 0.5, y: 0.6, count: 600, seed: 7 });
ok(ov.isBursting() && ovq.length === 1, "celebrate() on the 2D overlay starts the single RAF");
let ovt = 0, ovframes = 0;
while(ovq.length && ovframes < 400){ const cb = ovq.shift(); ovt += 100; cb(ovt); ovframes++; }
ok(cp.rec.rects.length > 300, "the 2D overlay DREW hundreds of celebration particles across the shower (" + cp.rec.rects.length + " rects — not invisible)");
ok(cp.rec.cleared > 0, "the overlay clears to transparent each frame (z-58 over the UI)");
ok(!ov.isBursting() && ovq.length === 0 && ov.burstCount() === 0, "the 2D celebration auto-stops and frees its buffer (no leak)");

// a single mid-shower frame draws a non-trivial number of live particles
const cp2 = cap2d(); let oq2 = [];
const ov2 = new FXGL.Controller(stubCanvas(360, 640), { backend: "2d", ctx2d: cp2.ctx, raf: cb => { oq2.push(cb); return oq2.length; }, caf: () => {}, width: 360, height: 640, dpr: 1, quality: 2, reducedMotion: false });
ov2.celebrate({ x: 0.5, y: 0.6, count: 600, seed: 7 });
const f1 = oq2.shift(); f1(1000);            // t=0 (fade-in)
cp2.rec.rects.length = 0;
const f2 = oq2.shift(); f2(1500);            // t≈0.5 — a full frame
ok(cp2.rec.rects.length > 100, "a single mid-shower 2D frame draws 100+ live particles (" + cp2.rec.rects.length + ")");

console.log("\n" + (fails === 0 ? "ALL " + checks + " FXGL CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
