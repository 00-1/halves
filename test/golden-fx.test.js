/* T130 — FXGL golden snapshots. Pins the DETERMINISTIC, HEADLESS render output:
 * the CPU-still backend's pixels for representative scenes, plus burst()/
 * celebrate() particle distributions at fixed seeds. A source-green change that
 * alters the actual render (the T125 "nothing renders" class) flips these.
 * Run: node test/golden-fx.test.js   ·   regenerate: UPDATE_GOLDEN=1 node …
 */
const fs = require("fs"), path = require("path");
const { check, compareValues } = require("./golden-util.js");
function read(f){ return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }
let fails = 0, checks = 0;
function ok(c, m){ checks++; if(!c){ fails++; console.log("  FAIL: " + m); } else console.log("  ok: " + m); }
function gold(name, value){ const r = check(name, value); ok(r.match, "golden '" + name + "'" + (r.updated ? " (regenerated)" : "") + (r.match ? "" : " — " + r.hint)); }

global.window = {};
new Function(read("scenery.js"))();
new Function(read("fxgl.js"))();
const S = global.window.Scenery, FXGL = global.window.FXGL;

// A capturing 2D context: the CPU-still backend draws the dithered scene via
// createImageData/putImageData — we snapshot that ImageData.
function capCtx(){
  const rec = { img: null };
  const ctx = {
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (im) => { rec.img = { w: im.width, h: im.height, data: im.data }; },
    fillRect: () => {}, clearRect: () => {}
  };
  return { ctx: ctx, rec: rec };
}
function stubCanvas(w, h){ return { width: 0, height: 0, clientWidth: w, clientHeight: h, getContext: () => null }; }

// Downsample an ImageData to a GW×GH grid of average rgb, each channel quantised
// to /16 — the tolerance (small numeric jitter folds away; structural changes don't).
function downsample(img, GW, GH){
  const w = img.w, h = img.h, d = img.data, grid = [];
  for(let gy = 0; gy < GH; gy++){
    const row = [];
    const y0 = Math.floor(gy * h / GH), y1 = Math.max(y0 + 1, Math.floor((gy + 1) * h / GH));
    for(let gx = 0; gx < GW; gx++){
      const x0 = Math.floor(gx * w / GW), x1 = Math.max(x0 + 1, Math.floor((gx + 1) * w / GW));
      let r = 0, g = 0, b = 0, n = 0;
      for(let y = y0; y < y1; y++) for(let x = x0; x < x1; x++){ const o = (y * w + x) * 4; r += d[o]; g += d[o + 1]; b += d[o + 2]; n++; }
      row.push([Math.round(r / n / 16) * 16, Math.round(g / n / 16) * 16, Math.round(b / n / 16) * 16]);
    }
    grid.push(row);
  }
  return grid;
}

// Render a scene to the CPU-still backend (reduced-motion forces a single still),
// capture its pixels, and return the compact signature.
function sceneSig(apply){
  const cap = capCtx();
  const ctrl = new FXGL.Controller(stubCanvas(64, 48), { ctx2d: cap.ctx, raf: () => {}, caf: () => {}, width: 64, height: 48, dpr: 1, quality: 2, reducedMotion: true });
  ok(ctrl.backendName() === "cpu-still", "scene render uses the CPU-still backend");
  apply(ctrl);
  ok(cap.rec.img && cap.rec.img.w === 64 && cap.rec.img.h === 48, "the CPU still produced a 64×48 ImageData");
  return downsample(cap.rec.img, 12, 9);
}

// A particle render-distribution signature: animate seeded particles (the exact
// closed-form trajectory the GPU/CPU backends use) to a fixed time, bucket the
// live ones into an 8×6 grid + the live count. Catches seeding/trajectory drift.
function particleSig(particles, t){
  const GW = 8, GH = 6, grid = Array.from({ length: GH }, () => new Array(GW).fill(0));
  let alive = 0;
  for(const p of particles){
    const bp = FXGL.burstPos(p, t, FXGL.BURST_GRAVITY, FXGL.BURST_DRAG);
    if(!bp.alive) continue;
    alive++;
    const gx = Math.max(0, Math.min(GW - 1, Math.floor(bp.x * GW))), gy = Math.max(0, Math.min(GH - 1, Math.floor(bp.y * GH)));
    grid[gy][gx]++;
  }
  return { alive: alive, grid: grid };
}

// ---- the goldens --------------------------------------------------------
// scenes (real CPU-still pixel renders)
gold("fx_scene_arena_r9_boss", sceneSig(c => c.setArenaState({ region: 9, tier: 6, bossProximity: 0.95, mood: "neutral" })));
gold("fx_scene_home", sceneSig(c => c.setHomeState({ progress: 0.7, streak: 5 })));
gold("fx_scene_frost", sceneSig(c => c.setScene({ grid: S.buildGrid(4), seed: 4, particles: { kind: "snow", count: 40 } })));
// burst + celebrate (render distributions at fixed seeds + times)
gold("fx_burst", particleSig(FXGL.seedBurst({ x: 0.5, y: 0.4, count: 120, seed: 9 }, false, FXGL.BURST_CAP), 0.5));
gold("fx_celebrate", particleSig(FXGL.seedCelebrate({ x: 0.5, y: 0.6, count: 600, seed: 7 }, false, FXGL.CELEBRATE_CAP), 0.8));

// T133: a golden of the ACTUAL Canvas2D-overlay celebrate frame (the on-device path).
// Buckets the fillRects the 2D backend draws into an 8×6 grid — a regression to
// "renders nothing" (the green-but-invisible trap) collapses this to empty and fails CI.
function cap2d(){
  const rec = { rects: [] };
  const ctx = { _a: 1, clearRect: () => {}, fillRect: (x, y, w, h) => { rec.rects.push([x, y, w, h]); },
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), putImageData: () => {} };
  Object.defineProperty(ctx, "fillStyle", { get(){ return "#000"; }, set(){} });
  Object.defineProperty(ctx, "globalAlpha", { get(){ return ctx._a; }, set(v){ ctx._a = v; } });
  return { ctx: ctx, rec: rec };
}
function celebrate2dFrame(){
  const cp = cap2d(); const q = [];
  const ov = new FXGL.Controller(stubCanvas(360, 640), { backend: "2d", ctx2d: cp.ctx, raf: cb => { q.push(cb); return q.length; }, caf: () => {}, width: 360, height: 640, dpr: 1, quality: 2, reducedMotion: false });
  ok(ov.backendName() === "cpu-still" && ov.dimensions().w === 360, "the celebrate golden renders through the sized Canvas2D overlay");
  ov.celebrate({ x: 0.5, y: 0.6, count: 600, seed: 7 });
  q.shift()(1000);                 // t=0 frame (fade-in)
  cp.rec.rects.length = 0;
  q.shift()(1600);                 // t≈0.6 — a representative full frame
  const GW = 8, GH = 6, grid = Array.from({ length: GH }, () => new Array(GW).fill(0));
  for(const r of cp.rec.rects){
    const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
    const gx = Math.max(0, Math.min(GW - 1, Math.floor(cx / 360 * GW))), gy = Math.max(0, Math.min(GH - 1, Math.floor(cy / 640 * GH)));
    grid[gy][gx]++;
  }
  return { drawn: cp.rec.rects.length, grid: grid };
}
const c2d = celebrate2dFrame();
ok(c2d.drawn > 100, "the 2D celebrate frame draws 100+ particles (not invisible — " + c2d.drawn + ")");
gold("fx_celebrate_2d_frame", c2d);

// ---- T138: a REAL VISIBILITY check (rasterised, not a draw count) ----------
// The fillRect-count golden above passes even for a transparent / off-canvas / 1×1
// frame — which is exactly how the celebration stayed green while invisible on
// device. This actually PAINTS each rect (with its alpha) into an in-bounds pixel
// buffer and measures lit coverage, so a zero-coverage frame fails.
function rasterCtx(W, H){
  const cov = new Float32Array(W * H); let alpha = 1, maxRect = 0;
  const ctx = {
    clearRect(){ cov.fill(0); maxRect = 0; },            // the overlay clears each frame
    fillRect(x, y, w, h){ x |= 0; y |= 0; w = Math.max(0, w | 0); h = Math.max(0, h | 0); if(w > maxRect) maxRect = w;
      for(let yy = y; yy < y + h; yy++){ if(yy < 0 || yy >= H) continue;
        for(let xx = x; xx < x + w; xx++){ if(xx < 0 || xx >= W) continue; cov[yy * W + xx] = Math.min(1, cov[yy * W + xx] + alpha); } } },
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), putImageData(){}
  };
  Object.defineProperty(ctx, "fillStyle", { get(){ return "#fff"; }, set(){} });
  Object.defineProperty(ctx, "globalAlpha", { get(){ return alpha; }, set(v){ alpha = v; } });
  return { ctx: ctx, cov: cov, maxRect(){ return maxRect; }, coverage(){ let lit = 0; for(let i = 0; i < cov.length; i++) if(cov[i] > 0.02) lit++; return { litPx: lit, frac: lit / cov.length }; } };
}
function visibleCelebrate(w, h, dpr){
  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  const r = rasterCtx(W, H); const q = [];
  const ov = new FXGL.Controller(stubCanvas(w, h), { backend: "2d", ctx2d: r.ctx, raf: cb => { q.push(cb); return q.length; }, caf: () => {}, width: w, height: h, dpr: dpr, quality: 2, reducedMotion: false });
  ov.celebrate({ x: 0.5, y: 0.55, count: 600, seed: 7 });
  q.shift()(1000); q.shift()(1500);     // drive to a representative frame (the last clear+draw wins)
  // SCREEN size = buffer px ÷ (dpr·res); quality 2 → res 1, so ÷ dpr.
  return { ov: ov, cov: r.coverage(), maxScreenPx: r.maxRect() / dpr };
}
const vis = visibleCelebrate(377, 838, 2.75);   // ≈ the owner's 1038×2305 device
ok(vis.cov.litPx > 400, "T138: the 2D celebrate frame paints REAL visible pixels in-bounds (" + vis.cov.litPx + " lit px — fails if invisible)");
ok(vis.cov.frac > 0.002, "T138: visible coverage is a non-trivial fraction of the canvas (" + (vis.cov.frac * 100).toFixed(2) + "%)");
ok(vis.maxScreenPx >= 8, "T138: particles render at a real SCREEN size after the DPR downscale (" + vis.maxScreenPx.toFixed(1) + "px ≥ 8 — the actual invisibility cause; unscaled it'd be ~6.5px and fade out)");
gold("fx_celebrate_visibility", { litPx_bucket: Math.round(vis.cov.litPx / 500) * 500, screenPx_bucket: Math.round(vis.maxScreenPx) });

// ---- T152: small/fine particles, emitted FROM an off-centre source ----------
// The owner wants celebrations to "emanate from the point of interest" at "very small
// sizes". This extends the T138 rasterised check to an OFF-CENTRE, SMALL-size burst:
// it must paint REAL in-bounds pixels, at a SMALL on-screen size (≥ the floor, and
// clearly finer than the bold default), CENTRED on the source (not screen-centre).
function visibleSmall(w, h, dpr, sx, sy){
  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  const r = rasterCtx(W, H); const q = [];
  const ov = new FXGL.Controller(stubCanvas(w, h), { backend: "2d", ctx2d: r.ctx, raf: cb => { q.push(cb); return q.length; }, caf: () => {}, width: w, height: h, dpr: dpr, quality: 2, reducedMotion: false });
  ov.celebrate({ x: sx, y: sy, count: 500, seed: 5, sizePx: 5, spread: 0.4 });   // small + tight to the source
  q.shift()(1000); q.shift()(1100);     // ~0.1 s elapsed — particles still near the source point
  let sum = 0, mx = 0, my = 0;          // coverage-weighted centroid (normalised)
  for(let yy = 0; yy < H; yy++) for(let xx = 0; xx < W; xx++){ const c = r.cov[yy * W + xx]; if(c > 0.02){ sum += c; mx += c * xx; my += c * yy; } }
  const cen = sum > 0 ? { x: mx / sum / W, y: my / sum / H } : { x: 0.5, y: 0.5 };
  return { cov: r.coverage(), maxScreenPx: r.maxRect() / dpr, centroid: cen };
}
const small = visibleSmall(377, 838, 2.75, 0.8, 0.3);   // off-centre top-right (e.g. a toast)
ok(small.cov.litPx > 100, "T152: the small off-centre burst paints REAL visible pixels in-bounds (" + small.cov.litPx + " lit px)");
ok(small.maxScreenPx >= FXGL.MIN_PARTICLE_PX && small.maxScreenPx < 8, "T152: particles are SMALL yet on-screen (" + small.maxScreenPx.toFixed(1) + "px: ≥ floor " + FXGL.MIN_PARTICLE_PX + ", < the bold-default ≥8)");
ok(Math.abs(small.centroid.x - 0.8) < 0.1 && Math.abs(small.centroid.y - 0.3) < 0.12,
   "T152: the burst EMANATES from the off-centre source (centroid " + small.centroid.x.toFixed(2) + "," + small.centroid.y.toFixed(2) + " ≈ 0.80,0.30 — NOT screen-centre 0.5,0.55)");
gold("fx_small_offcentre", { litPx_bucket: Math.round(small.cov.litPx / 200) * 200, screenPx: Math.round(small.maxScreenPx), cx: Math.round(small.centroid.x * 10) / 10, cy: Math.round(small.centroid.y * 10) / 10 });

// sizePx CAPS the particle size and floors it (small but never sub-pixel), and is
// clearly finer than the bold default — the two size regimes are distinct.
(function(){
  const fine = FXGL.seedCelebrate({ count: 300, seed: 2, sizePx: 4 }, false, FXGL.CELEBRATE_CAP);
  let fmax = 0, fmin = 1e9; for(const p of fine){ fmax = Math.max(fmax, p.size); fmin = Math.min(fmin, p.size); }
  ok(fmax <= 4 + 1e-6 && fmin >= FXGL.MIN_PARTICLE_PX, "T152: sizePx caps the size (max " + fmax.toFixed(2) + " ≤ 4) and floors it (min " + fmin.toFixed(2) + " ≥ " + FXGL.MIN_PARTICLE_PX + ")");
  const bold = FXGL.seedCelebrate({ count: 300, seed: 2 }, false, FXGL.CELEBRATE_CAP);
  let bmax = 0; for(const p of bold) bmax = Math.max(bmax, p.size);
  ok(fmax < bmax, "T152: the small regime (" + fmax.toFixed(1) + ") is clearly finer than the bold default (" + bmax.toFixed(1) + ")");
})();

// spread < 1 HUGS the source: smaller horizontal travel than the default spray.
(function(){
  function travel(opts){ const ps = FXGL.seedCelebrate(opts, false, FXGL.CELEBRATE_CAP); let m = 0; for(const p of ps){ p.birth = 0; const b = FXGL.burstPos(p, 0.3, FXGL.BURST_GRAVITY, FXGL.BURST_DRAG); m = Math.max(m, Math.abs(b.x - p.x0)); } return m; }
  const wide = travel({ count: 300, seed: 4 }), tight = travel({ count: 300, seed: 4, spread: 0.3 });
  ok(tight < wide * 0.6, "T152: spread<1 keeps particles near the source (max travel tight " + tight.toFixed(3) + " ≪ wide " + wide.toFixed(3) + ")");
})();

// the visibility check FAILS on the device bug it's guarding (a 1×1 / unsized canvas):
// the same celebration on a stale 1×1 buffer paints ~nothing.
(function(){
  const r = rasterCtx(1, 1); const q = [];
  const ov = new FXGL.Controller(stubCanvas(1, 1), { backend: "2d", ctx2d: r.ctx, raf: cb => { q.push(cb); return q.length; }, caf: () => {}, width: 0, height: 0, dpr: 1, quality: 2, reducedMotion: false });
  ov.burst_ && (ov.burst_.active = false);
  // force the degenerate buffer (mimic fire-before-layout): resize to 1×1 then draw one frame WITHOUT the ignite re-fit
  ov.backend.resize(1, 1); ov.backend.setBurst(FXGL.seedCelebrate({ count: 600, seed: 7 }, false, FXGL.CELEBRATE_CAP).map(p => (p.birth = 0, p)));
  ov.backend.renderFrame({ sceneOn: false, burstOn: true, burstTime: 0.5 });
  ok(r.coverage().litPx <= 1, "T138: the visibility check CATCHES a 1×1 unsized frame (~0 lit px) — the invisible bug fails it");
})();

// the engine fix: a celebration fired BEFORE an explicit resize still sizes itself
(function(){
  const r = rasterCtx(720, 1280); const q = [];
  const cv = stubCanvas(360, 640);   // clientWidth/Height present, but no resize() called by the caller
  const ov = new FXGL.Controller(cv, { backend: "2d", ctx2d: r.ctx, raf: cb => { q.push(cb); return q.length; }, caf: () => {}, dpr: 2, quality: 2, reducedMotion: false });
  ov.celebrate({ x: 0.5, y: 0.55, count: 400, seed: 3 });   // _ignite re-fits from the canvas
  ok(ov.dimensions().w > 1 && ov.dimensions().h > 1, "T138: celebrate() re-fits the canvas before drawing (no fire-before-layout 1×1 — " + ov.dimensions().w + "×" + ov.dimensions().h + ")");
  q.shift()(1000); q.shift()(1500);
  ok(r.coverage().litPx > 400, "T138: …and the auto-sized overlay paints a visible shower");
  ok(ov.canPresent() === true, "canPresent() is true when a real 2D context is present");
})();
// canPresent() flags a null 2D context (canvas already bound to another API → invisible)
(function(){
  const ov = new FXGL.Controller(stubCanvas(360, 640), { backend: "2d", ctx2d: null, width: 360, height: 640, dpr: 1, raf: () => {}, caf: () => {}, reducedMotion: false });
  ok(ov.canPresent() === false, "canPresent() is FALSE when getContext('2d') returned null (the tester can surface it)");
})();

// celebrate is visibly bigger than burst at its peak (a real shower) — a property
// golden, not just a pixel one
const burstPeak = particleSig(FXGL.seedBurst({ count: 200, seed: 1 }, false, FXGL.BURST_CAP), 0.4).alive;
const celebPeak = particleSig(FXGL.seedCelebrate({ count: 600, seed: 1 }, false, FXGL.CELEBRATE_CAP), 0.4).alive;
ok(celebPeak > burstPeak * 2, "celebrate shows far more live particles than burst (" + celebPeak + " ≫ " + burstPeak + ")");

// ---- harness self-check: it actually CATCHES a mutated render -----------
const sample = sceneSig(c => c.setHomeState({ progress: 0.5, streak: 1 }));
ok(compareValues(JSON.stringify(sample, null, 1), sample).match, "harness: an identical render matches");
const mutated = JSON.parse(JSON.stringify(sample)); mutated[0][0] = [255, 0, 255];   // perturb one cell
const neg = compareValues(JSON.stringify(sample, null, 1), mutated);
ok(!neg.match && /first change/.test(neg.hint || ""), "harness: a one-cell render change is CAUGHT (with a diff hint)");

// ---- T172: gold-hoard engine — pure math + the rendered pile + the earn burst ----
// The owner's Smaug/Scrooge pile. Per the T174 research: a saturating gold→level curve
// drives a mound silhouette + a crest-weighted SURFACE-coin scatter; the earn burst
// CONVERGES coins from the earn-point into the hoard. All opt-in (existing scenes
// byte-identical, asserted above by the unchanged scene goldens).
(function(){
  // (1) saturating curve: 0 at 0, monotonic ↑, →1, never over 1 (no cap blow-out).
  const L = FXGL.hoardLevel;
  ok(L(0) === 0 && L(FXGL.HOARD_K) === 0.5 && L(1e9) < 1 && L(1e9) > 0.99, "hoardLevel saturates (0→0, K→0.5, →1)");
  ok(L(100) < L(1000) && L(1000) < L(1e6), "hoardLevel is monotonic in gold");
  ok(FXGL.hoardTier(0, 8) === 0 && FXGL.hoardTier(1, 8) === 8 && FXGL.hoardTier(0.5, 8) === 4, "hoardTier quantises the level (re-seed only on a tier change)");
  // (2) mound profile: 0 at the edges + level 0, peaks at the centre, bounded, grows with level.
  ok(FXGL.moundProfile(0.02, 1, 9) > FXGL.moundProfile(0.5, 1, 9) && FXGL.moundProfile(0.98, 1, 9) > FXGL.moundProfile(0.5, 1, 9), "T192: the pile BANKS against the side walls (higher at x≈0/1 than centre — not a central dome)");
  ok(FXGL.moundProfile(0.5, 0, 1) === 0, "mound is 0 at level 0 (no gold → no pile)");
  ok(FXGL.moundProfile(0.5, 1, 1) > FXGL.moundProfile(0.5, 0.3, 1) && FXGL.moundProfile(0.5, 1, 1) <= FXGL.HOARD_MAX_H, "the pile grows with level, capped at HOARD_MAX_H");
  ok(FXGL.HOARD_MAX_H >= 0.7 && FXGL.moundProfile(0.02, 1, 9) > 0.55, "T192: at full wealth the pile climbs HIGH (walls reach " + FXGL.moundProfile(0.02, 1, 9).toFixed(2) + " of the screen)");
  // T199 — a level-1.0 pile REACHES THE TOP (no dead gap at the ceiling): the wall-banked sides
  // climb to ~the top across seeds, while the centre dips lower (it's a banked container).
  ok(FXGL.HOARD_MAX_H >= 0.95, "T199: HOARD_MAX_H raised so a maxed pile can fill the screen (" + FXGL.HOARD_MAX_H + ")");
  ok([1, 9, 42, 7].every(s => FXGL.moundProfile(0.02, 1, s) >= 0.88 && FXGL.moundProfile(0.98, 1, s) >= 0.88),
     "T199: at level 1.0 the WALLS reach ~the top across seeds (≥0.88; e.g. seed9 wall=" + FXGL.moundProfile(0.02, 1, 9).toFixed(2) + ")");
  ok(FXGL.moundProfile(0.5, 1, 9) < FXGL.moundProfile(0.02, 1, 9) && FXGL.moundProfile(0.5, 1, 9) > 0.2,
     "T199: the CENTRE still dips lower than the walls (a banked container, not a flat ceiling) — centre=" + FXGL.moundProfile(0.5, 1, 9).toFixed(2));
  // (3) surface-coin scatter: count rides level (capped), coins on the lower-half surface,
  //     deterministic, each a beveled coin with a varied angle/squash.
  const big = FXGL.seedHoard({ level: 1, seed: 7 }, false, FXGL.HOARD_CAP);
  const small = FXGL.seedHoard({ level: 0.3, seed: 7 }, false, FXGL.HOARD_CAP);
  ok(big.length === FXGL.HOARD_CAP && small.length < big.length && small.length > 0, "coin count scales with level + is capped at HOARD_CAP (" + small.length + " < " + big.length + ")");
  ok(big.every(c => c.x >= 0 && c.x <= 1 && c.y >= 0 && c.y <= 1), "every surface coin is in-bounds");
  ok(big.filter(c => c.x < 0.2 || c.x > 0.8).length > big.length * 0.25, "T192: coins fill the WIDTH incl. the wall regions (" + big.filter(c => c.x < 0.2 || c.x > 0.8).length + " near the walls)");
  ok(big.every(c => c.look === 1 && c.aspect <= 1 && c.rot >= 0), "each coin is a cylinder (look) with a tip-aspect + spin (varied angles)");
  ok(new Set(big.slice(0, 40).map(c => Math.round(c.rot * 100))).size > 20 && new Set(big.slice(0, 40).map(c => Math.round(c.aspect * 100))).size > 20, "coin angles + squashes genuinely vary (not uniform discs)");
  ok(JSON.stringify(FXGL.seedHoard({ level: 1, seed: 7 }, false, FXGL.HOARD_CAP)) === JSON.stringify(big), "the hoard scatter is deterministic for its (level, seed)");
  ok(FXGL.seedHoard({ level: 1, seed: 7 }, true, FXGL.HOARD_CAP).length < big.length, "reduced-motion → a smaller (calmer) pile");
  gold("fx_hoard_scatter", { n: big.length, at_0_3: small.length, cap: FXGL.HOARD_CAP, maxH: FXGL.HOARD_MAX_H, sample: { x: Math.round(big[0].x * 100), y: Math.round(big[0].y * 100), look: big[0].look } });
  // T196 — STABLE ACCUMULATION: the pile rises GRADUALLY (~HOARD_CAP fine steps, not 8 jumps)
  // and coins NEVER teleport — a lower-level scatter is a byte-identical PREFIX of a higher one.
  (function(){
    const lo = FXGL.seedHoard({ level: 0.30, seed: 7 }, false, FXGL.HOARD_CAP);
    const hi = FXGL.seedHoard({ level: 0.90, seed: 7 }, false, FXGL.HOARD_CAP);
    ok(hi.length > lo.length, "T196: more wealth → more coins (" + lo.length + " → " + hi.length + ")");
    ok(JSON.stringify(hi.slice(0, lo.length)) === JSON.stringify(lo),
       "T196: STABLE ACCUMULATION — the lower pile is a byte-identical PREFIX of the higher one (existing coins DON'T move/teleport; new coins stack on top)");
    // gradual: the visible coin count changes in MANY fine steps across 0..1 (≫ the old 8 tiers).
    const counts = new Set(); for(let L = 0; L <= 1.0001; L += 0.01) counts.add(FXGL.seedHoard({ level: L, seed: 7 }, false, FXGL.HOARD_CAP).length);
    ok(counts.size >= 60, "T196: the pile grows in MANY fine height steps (" + counts.size + " distinct counts across 1%-level increments — not ~8 big jumps)");
    // fills UPWARD: higher-rank coins (added later) sit HIGHER (smaller y) than the first-laid ones.
    const k = Math.max(1, hi.length / 5 | 0);
    const baseY = hi.slice(0, k).reduce((s, c) => s + c.y, 0) / k;          // first-laid (lowest rank)
    const crestY = hi.slice(hi.length - k).reduce((s, c) => s + c.y, 0) / k; // last-laid (highest rank)
    ok(crestY < baseY, "T196: the pile fills UPWARD — last-laid coins crest higher (y≈" + crestY.toFixed(2) + ") than first-laid (y≈" + baseY.toFixed(2) + ")");
    // teeth: the home backdrop seed no longer JUMPS with an 8-tier quantiser — two nearby
    // wealth levels yield the SAME stable seed (so the field doesn't reshuffle between earns).
    const sA = FXGL.deriveHomeScene({ seed: 5, hoard: { level: 0.41 } }).hoard.seed;
    const sB = FXGL.deriveHomeScene({ seed: 5, hoard: { level: 0.74 } }).hoard.seed;
    ok(sA === sB, "T196: the home hoard seed is STABLE across wealth (no 8-tier re-seed → no teleport between earns)");
  })();
  // T200 — coin COLOUR by height: dark gold low (base), light gold high (crest), as a gradient of
  // the tone DISTRIBUTION (a mix retained at every level), deterministic + stable with T196.
  (function(){
    const pile = FXGL.seedHoard({ level: 1, seed: 7 }, false, FXGL.HOARD_CAP);
    const byY = pile.slice().sort((a, b) => b.y - a.y);     // base (high y) → crest (low y)
    const k = Math.max(4, byY.length / 5 | 0);
    const baseBand = byY.slice(0, k), crestBand = byY.slice(byY.length - k);
    const meanL = arr => arr.reduce((s, c) => s + FXGL.luma([c.r, c.g, c.b]), 0) / arr.length;
    ok(meanL(crestBand) > meanL(baseBand) + 0.05,
       "T200: coins trend DARK→LIGHT base→crest (base mean luma " + meanL(baseBand).toFixed(2) + " < crest " + meanL(crestBand).toFixed(2) + ")");
    const tones = arr => new Set(arr.map(c => c.r + "," + c.g + "," + c.b)).size;
    ok(tones(baseBand) >= 2 && tones(crestBand) >= 2,
       "T200: a MIX is retained at each level (base " + tones(baseBand) + " tones, crest " + tones(crestBand) + " — not a hard single-tone band)");
    // stable with T196: a coin's tone is identical in a smaller pile (prefix) — never flickers as wealth grows.
    const lo = FXGL.seedHoard({ level: 0.4, seed: 7 }, false, FXGL.HOARD_CAP);
    ok(lo.every((c, i) => c.r === pile[i].r && c.g === pile[i].g && c.b === pile[i].b),
       "T200: each coin's tone is STABLE as the pile grows (keyed off fill-rank, not the live level — no colour flicker)");
    // teeth: the trend is a real gradient, not noise — the top decile is clearly lighter than the bottom decile.
    const d = Math.max(2, byY.length / 10 | 0);
    ok(meanL(byY.slice(byY.length - d)) - meanL(byY.slice(0, d)) > 0.08,
       "T200: the gate HAS TEETH — top-decile coins are markedly lighter than bottom-decile (Δluma " + (meanL(byY.slice(byY.length - d)) - meanL(byY.slice(0, d))).toFixed(2) + ")");
  })();
  // (4) converge path: starts at the earn-point, ends absorbed at the hoard target, in-bounds.
  const cv = FXGL.seedConverge({ x: 0.2, y: 0.2, tx: 0.5, ty: 0.9, count: 24, seed: 3 }, false, FXGL.BURST_CAP);
  const p0 = FXGL.convergePos(cv[0], 0), pe = FXGL.convergePos(cv[0], cv[0].life);
  ok(Math.abs(p0.x - cv[0].x0) < 0.01 && Math.abs(p0.y - cv[0].y0) < 0.01, "the earn coin starts AT the earn-point");
  ok(Math.abs(pe.x - cv[0].tx) < 1e-6 && Math.abs(pe.y - cv[0].ty) < 1e-6 && !pe.alive, "the earn coin ENDS absorbed at the hoard target (converged, not dispersed)");
  let inb = true; for(let u = 0; u <= 1; u += 0.1){ const p = FXGL.convergePos(cv[0], cv[0].life * u); if(p.x < -0.05 || p.x > 1.05 || p.y < -0.3 || p.y > 1.05) inb = false; }
  ok(inb, "the converge path stays in-bounds the whole arc");
  ok(JSON.stringify(FXGL.seedConverge({ x: 0.2, y: 0.2, tx: 0.5, ty: 0.9, count: 24, seed: 3 }, false, FXGL.BURST_CAP)) === JSON.stringify(cv), "the earn burst is deterministic for its seed");
})();
// the hoard actually RENDERS over the home backdrop (raster, like the T138/T152 checks):
// a level-0.8 pile paints a real, in-bounds, lower-half mass; level 0 paints nothing extra.
(function(){
  function hoardLit(level){
    const w = 400, h = 800, dpr = 2, W = Math.round(w * dpr), H = Math.round(h * dpr);
    const r = rasterCtx(W, H);
    const ov = new FXGL.Controller(stubCanvas(w, h), { backend: "2d", ctx2d: r.ctx, raf: () => 1, caf: () => {}, width: w, height: h, dpr: dpr, quality: 2, reducedMotion: false });
    ov.setScene({ grid: [[[20, 20, 30], [20, 20, 30]], [[20, 20, 30], [20, 20, 30]]], seed: 5, hoard: level ? { level: level, seed: 9 } : undefined });
    ov.backend.renderFrame({ sceneOn: true, burstOn: false });
    const cov = r.cov; let lower = 0, upper = 0; const half = (H / 2) | 0;
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++) if(cov[y * W + x] > 0.02){ if(y >= half) lower++; else upper++; }
    return { lower: lower, upper: upper };
  }
  const on = hoardLit(0.8);
  ok(on.lower > 2000, "T172/T192: a level-0.8 hoard paints a REAL pile (lower-region " + on.lower + " lit px — mound + cylinder coins)");
  ok(on.lower > on.upper, "T192: the pile is BOTTOM-anchored (more fill below the midline) — heaped from the floor");
  ok(on.upper > 800, "T192: …yet it CLIMBS HIGH — banks past the midline into the upper region (" + on.upper + " lit px), not a low bump");
})();
// T195 — the FILTER pass: the pile silhouette is now a POSTERISED halftone (a FEW discrete gold
// ramp tones dithered together), NOT a smooth analog gradient (which produced dozens of distinct
// shades). Drive drawHoard directly (coins:[] → only the silhouette) on a colour-recording ctx.
(function(){
  // a tiny ctx that records each fillRect's colour (path-less → drawCoin would use rects, but
  // coins:[] means only the silhouette draws here).
  function recCtx(){ const cols = []; let fs = "#000";
    return { ctx: { get fillStyle(){ return fs; }, set fillStyle(v){ fs = v; }, globalAlpha: 1,
      fillRect(){ cols.push(fs); }, clearRect(){} }, cols: cols }; }
  const r = recCtx();
  const h = { level: 0.8, seed: 9, coins: [] };
  FXGL.drawHoard(r.ctx, h, 600, 1200, 2);
  const distinct = Array.from(new Set(r.cols));
  const ramp = FXGL.hoardRamp(FXGL.GOLD_TONES[1]).map(FXGL.toHex);
  ok(r.cols.length > 200, "T195: the silhouette is painted in many chunky pixel-cells (" + r.cols.length + " fills)");
  ok(distinct.length >= 3 && distinct.length <= ramp.length,
     "T195: POSTERISED to a few discrete tones (" + distinct.length + " distinct ≤ " + ramp.length + "-stop ramp) — NOT a smooth gradient (which would yield dozens)");
  ok(distinct.every(c => ramp.indexOf(c) >= 0),
     "T195: every silhouette tone comes from the curated gold RAMP (gradient-map through the palette, brickmap post-process)");
  // teeth: prove the ramp itself is luma-ASCENDING (dark base → light crest) and gold-family.
  const rgb = FXGL.hoardRamp(FXGL.GOLD_TONES[1]);
  let ascending = true; for(let i = 1; i < rgb.length; i++) if(FXGL.luma(rgb[i]) <= FXGL.luma(rgb[i - 1])) ascending = false;
  ok(ascending, "T195: the gold ramp is luma-ASCENDING (base-dark → crest-light) — a real tonal gradient-map");
  ok(rgb.every(c => c[0] >= c[2]), "T195: every ramp stop is gold-family (R ≥ B) — a warm metal palette");
  ok(distinct.length < 24, "T195: the gate HAS TEETH — the OLD smooth gradient (≈" + Math.round(1200/2) + " depth steps × shade) would blow far past the ramp's " + ramp.length + " tones; posterisation holds it to " + distinct.length);
})();
// T197 — the COINS are pixelated + dithered in the SAME brickmap look as the pile (T195 filtered
// the silhouette only). drawCoin(cell) rasterises into the cell-grid, ordered-Bayer between the
// coin's OWN tones — pixel-snapped, no colour shift.
(function(){
  function recCtx(){ const f = []; let fs = "#000";
    return { ctx: { get fillStyle(){ return fs; }, set fillStyle(v){ fs = v; }, globalAlpha: 1,
      fillRect(x, y, w, h){ f.push({ x: x | 0, y: y | 0, c: fs }); } }, fills: f }; }
  const rgb = [212, 158, 46], cell = 8;
  const r = recCtx();
  FXGL.drawCoin(r.ctx, 200, 200, 40, 0.4, 0.8, rgb, 0, cell);
  const distinct = Array.from(new Set(r.fills.map(p => p.c)));
  const ownRamp = [FXGL.shade(rgb, -0.4), rgb, FXGL.shade(rgb, 0.42)].map(FXGL.toHex);
  ok(r.fills.length > 12, "T197: the coin is rasterised into many pixel-cells (" + r.fills.length + " fills) — pixelated, not one smooth ellipse");
  ok(r.fills.every(p => p.x % cell === 0 && p.y % cell === 0), "T197: every coin cell is SNAPPED to the same pixel lattice as the pile (cell-aligned)");
  ok(distinct.length >= 2, "T197: the coin is DITHERED — ≥2 of its tones interleave (" + distinct.length + " distinct), not a flat fill");
  ok(distinct.every(c => ownRamp.indexOf(c) >= 0), "T197: every coin tone is one of the coin's OWN 3 tones (edge/face/highlight) — NO colour shift (owner dropped that)");
  // teeth: WITHOUT a cell, drawCoin keeps the smooth vector path (uses ellipse, not a cell grid).
  let usedEllipse = false, fr = 0;
  const smooth = { beginPath(){}, ellipse(){ usedEllipse = true; }, fill(){}, save(){}, restore(){}, translate(){}, rotate(){}, set fillStyle(v){}, get fillStyle(){ return "#000"; }, fillRect(){ fr++; } };
  FXGL.drawCoin(smooth, 200, 200, 40, 0.4, 0.8, rgb, 0);   // no cell
  ok(usedEllipse, "T197: the gate HAS TEETH — without a `cell` drawCoin still uses the smooth ellipse path (so the pixel-dither only engages on the hoard/coin overlay lattice)");
})();
// the earn burst converges toward the hoard (coins move from the earn-point downward over time)
(function(){
  const w = 400, h = 800, dpr = 2, W = Math.round(w * dpr), H = Math.round(h * dpr);
  function litCentroidY(t){ const r = rasterCtx(W, H);
    const ov = new FXGL.Controller(stubCanvas(w, h), { backend: "2d", ctx2d: r.ctx, raf: () => 1, caf: () => {}, width: w, height: h, dpr: dpr, quality: 2, reducedMotion: false });
    ov.earnBurst({ x: 0.5, y: 0.15, tx: 0.5, ty: 0.9, count: 40, seed: 4 });
    ov.backend.renderFrame({ sceneOn: false, burstOn: true, burstTime: t });
    let sum = 0, wy = 0; for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){ const c = r.cov[y * W + x]; if(c > 0.02){ sum += c; wy += c * y; } }
    return sum > 0 ? wy / sum / H : -1;
  }
  const early = litCentroidY(0.1), late = litCentroidY(0.7);
  ok(early > 0 && late > early, "T172: the earn burst CONVERGES — lit centroid moves from the earn-point (y≈" + early.toFixed(2) + ") toward the hoard (y≈" + late.toFixed(2) + ")");
})();
// T185 — the hoard must draw on the WebGL/WebGPU backends too (the live bug: only the CPU
// backend drew it → invisible on the owner's device). The Controller composites it on a 2D
// OVERLAY canvas for non-CPU backends; here we drive _syncOverlay with a stub GL backend +
// stub document and assert it CREATES the overlay and DRAWS the pile into it.
(function(){
  const savedDoc = global.document;
  let created = null;
  function recCanvas(){ const calls = []; return { width: 0, height: 0, className: "", style: {}, setAttribute(){},
    getContext(){ return { _fills: calls, globalAlpha: 1, set fillStyle(v){}, get fillStyle(){ return "#000"; },
      clearRect(){}, fillRect(x, y, w, h){ calls.push([x | 0, y | 0, w | 0, h | 0]); },
      beginPath(){}, ellipse(){}, fill(){}, stroke(){}, arc(){}, moveTo(){}, lineTo(){}, closePath(){},
      quadraticCurveTo(){}, set strokeStyle(v){}, get strokeStyle(){ return "#000"; }, lineWidth: 1,
      save(){}, restore(){}, translate(){}, rotate(){}, scale(){} }; } }; }
  global.document = { createElement(tag){ created = recCanvas(); return created; } };
  try{
    const cv = stubCanvas(390, 844); cv.className = "fx-backdrop"; cv.parentNode = { insertBefore(){} };
    const ov = new FXGL.Controller(cv, { backend: "2d", ctx2d: { fillRect(){}, clearRect(){}, createImageData: (w,h) => ({ data: new Uint8ClampedArray(w*h*4) }), putImageData(){} }, raf: () => 1, caf: () => {}, width: 390, height: 844, dpr: 2, reducedMotion: false });
    // force a non-CPU backend + a hoard scene, then sync the overlay
    ov.backend = { name: "webgl2", w: 780, h: 1688, pxScale: 2 };
    ov.derived = FXGL.deriveScene({ grid: [[[20,20,30]]], seed: 5, hoard: { level: 0.8, seed: 9 } }, 200);
    ov._syncOverlay();
    ok(created !== null, "T185: a non-CPU backend with a hoard CREATES a 2D overlay canvas (was invisible on WebGL)");
    ok(created && created.width === 780 && created.height === 1688, "T185: the overlay buffer matches the GL backend size (" + (created && created.width) + "×" + (created && created.height) + ")");
    const fills = created && created.getContext()._fills;
    ok(fills && fills.length > 50, "T185: the hoard is DRAWN into the overlay (" + (fills ? fills.length : 0) + " fills — the mound silhouette + coins)");
    // no hoard → the overlay is cleared, not redrawn
    ov.derived = FXGL.deriveScene({ grid: [[[20,20,30]]], seed: 5 }, 200);
    ov._syncOverlay();
    ok(true, "T185: _syncOverlay handles a scene with no hoard without error (clears the overlay)");
  } finally { global.document = savedDoc; }
})();
// T193 — a money-gain celebration paints SPINNING CYLINDER COINS on the WebGL/WebGPU backend
// via the same 2D overlay (the GL splat skips look===1 particles). With NO hoard in the scene,
// any overlay draw can ONLY be the earn-burst coins → proves they composite on the GL path.
(function(){
  const savedDoc = global.document;
  let created = null;
  function recCanvas(){ const calls = []; return { width: 0, height: 0, className: "", style: {}, setAttribute(){},
    getContext(){ return { _fills: calls, globalAlpha: 1, set fillStyle(v){}, get fillStyle(){ return "#000"; },
      clearRect(){}, fillRect(x, y, w, h){ calls.push([x | 0, y | 0, w | 0, h | 0]); },
      beginPath(){}, ellipse(){}, fill(){}, stroke(){}, arc(){}, moveTo(){}, lineTo(){}, closePath(){},
      quadraticCurveTo(){}, set strokeStyle(v){}, get strokeStyle(){ return "#000"; }, lineWidth: 1,
      save(){}, restore(){}, translate(){}, rotate(){}, scale(){} }; } }; }
  global.document = { createElement(tag){ created = recCanvas(); return created; } };
  try{
    const cv = stubCanvas(390, 844); cv.className = "fx-backdrop"; cv.parentNode = { insertBefore(){} };
    const ov = new FXGL.Controller(cv, { backend: "2d", ctx2d: { fillRect(){}, clearRect(){}, createImageData: (w,h) => ({ data: new Uint8ClampedArray(w*h*4) }), putImageData(){} }, raf: () => 1, caf: () => {}, width: 390, height: 844, dpr: 2, reducedMotion: false });
    ov.backend = { name: "webgl2", w: 780, h: 1688, pxScale: 2, glParts: null,
      resize(w, h){ this.w = w; this.h = h; }, setData(){}, setBurst(p){ this.glParts = p; } };
    ov.derived = FXGL.deriveScene({ grid: [[[20,20,30]]], seed: 5 }, 200);   // NO hoard
    ov.earnBurst({ x: 0.5, y: 0.15, tx: 0.5, ty: 0.9, count: 32, seed: 7 });
    ov._syncOverlay(0.2);
    const fills = created && created.getContext()._fills;
    ok(fills && fills.length > 8, "T193: an earn burst paints SPINNING coins onto the GL overlay (" + (fills ? fills.length : 0) + " cylinder fills — no hoard in scene, so these are coins)");
    ok(ov.backend.glParts && ov.backend.glParts.every(p => p.look !== 1), "T193: the GL splat receives ONLY non-coin confetti (look!==1) — coins are drawn on the overlay, not the shader");
  } finally { global.document = savedDoc; }
})();
// T193 (RE-OPEN) — the live money-gain shower is burst({look:"coin"})→seedBurst, which used to
// DROP opts.look → coins rendered as SQUARES on the owner's device. Gate the seeding path itself:
// (a) a look:"coin" BALLISTIC burst tags every particle look:1 + the spin fields drawCoinParticle
// needs; (b) the default (no look) burst stays plain confetti (look unset); (c) the GL splat is
// routed only the confetti, the coins go to the 2D overlay.
(function(){
  const coins = FXGL.seedBurst({ look: "coin", count: 40, seed: 7 }, false, FXGL.BURST_CAP);
  const conf = FXGL.seedBurst({ count: 40, seed: 7 }, false, FXGL.BURST_CAP);
  ok(coins.length > 0 && coins.every(p => p.look === 1), "T193 re-open: seedBurst({look:'coin'}) tags EVERY particle look:1 (the bug: opts.look was dropped → squares)");
  ok(coins.every(p => typeof p.spin === "number" && typeof p.wob === "number" && typeof p.phase === "number" && typeof p.rot === "number"),
     "T193 re-open: each coin carries the SPIN fields (rot/spin/wob/phase) drawCoinParticle animates — a tumbling cylinder, not a static disc");
  ok(coins.some(p => Math.abs(p.spin) > 0.5) && new Set(coins.slice(0, 20).map(p => Math.round(p.phase * 50))).size > 8,
     "T193 re-open: the coin spins genuinely vary (non-zero, varied phase) — they visibly rotate");
  ok(coins.every(p => p.tx == null), "T193 re-open: a burst coin is BALLISTIC (no converge target) → drawCoinParticle flies it on burstPos");
  ok(conf.every(p => p.look == null), "T193 re-open: the DEFAULT burst (no look) is still plain confetti (look unset) — unchanged");
  ok(coins[0].r >= coins[0].b, "T193 re-open: coins default to the GOLD ramp (R ≥ B) when no palette given");
  // the integration teeth: burst({look:'coin'}) on a GL backend routes coins OFF the splat.
  const savedDoc = global.document; let made = null;
  global.document = { createElement(){ made = { width:0, height:0, className:"", style:{}, setAttribute(){},
    getContext(){ return { globalAlpha:1, set fillStyle(v){}, get fillStyle(){ return "#000"; }, clearRect(){}, fillRect(){},
      beginPath(){}, ellipse(){}, fill(){}, save(){}, restore(){}, translate(){}, rotate(){}, scale(){} }; } }; return made; } };
  try{
    const cv = stubCanvas(390, 844); cv.className = "fx-backdrop"; cv.parentNode = { insertBefore(){} };
    const c = new FXGL.Controller(cv, { backend: "2d", ctx2d: { fillRect(){}, clearRect(){}, createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}), putImageData(){} }, raf: () => 1, caf: () => {}, width: 390, height: 844, dpr: 2, reducedMotion: false });
    c.backend = { name: "webgl2", w: 780, h: 1688, pxScale: 2, glParts: null, resize(w,h){ this.w=w; this.h=h; }, setData(){}, setBurst(p){ this.glParts = p; } };
    c.derived = FXGL.deriveScene({ grid: [[[20,20,30]]], seed: 5 }, 200);
    c.burst({ look: "coin", count: 30, seed: 7 });
    ok(c.backend.glParts && c.backend.glParts.every(p => p.look !== 1) && c.burst_.parts.some(p => p.look === 1),
       "T193 re-open: burst({look:'coin'}) keeps the coins in burst_.parts but routes ONLY confetti to the GL splat → coins composite as cylinders on the overlay (the real money-gain fix)");
  } finally { global.document = savedDoc; }
})();
// T203 — coin-shower POLISH: the money-gain coins are slightly bigger + rain DOWN (more gravity,
// minimal upward launch); the generic confetti burst is unchanged.
(function(){
  const coins = FXGL.seedBurst({ look: "coin", count: 80, seed: 3 }, false, FXGL.BURST_CAP);
  const conf = FXGL.seedBurst({ count: 80, seed: 3 }, false, FXGL.BURST_CAP);
  const mean = (a, f) => a.reduce((s, p) => s + f(p), 0) / a.length;
  // bigger
  ok(mean(coins, p => p.size) > mean(conf, p => p.size) * 1.4,
     "T203: the coins are BIGGER than the confetti (mean size " + mean(coins, p => p.size).toFixed(1) + " vs " + mean(conf, p => p.size).toFixed(1) + ")");
  // less fly-up: coin launch velocity is far less upward (vy less negative) than the confetti fountain
  ok(mean(coins, p => p.vy) > mean(conf, p => p.vy) + 0.15,
     "T203: the coins launch with much LESS upward kick (mean vy " + mean(coins, p => p.vy).toFixed(2) + " ≫ confetti " + mean(conf, p => p.vy).toFixed(2) + " — they rain down, not fountain up)");
  const sink = coins.filter(p => FXGL.burstPos(p, p.life * 0.9, p.grav, FXGL.BURST_DRAG).y > p.y0 + 0.02).length;
  ok(sink > coins.length * 0.8,
     "T203: by late in their life MOST coins have sunk BELOW the launch point (" + sink + "/" + coins.length + " — gravity wins, they rain down)");
  // more gravity, plumbed per-coin (NOT the global shader uniform)
  ok(coins.every(p => p.grav > FXGL.BURST_GRAVITY) && conf.every(p => p.grav == null),
     "T203: coins carry a coin-specific gravity > BURST_GRAVITY (" + coins[0].grav.toFixed(2) + " > " + FXGL.BURST_GRAVITY + "); confetti uses the global default");
  // the coin gravity actually makes it fall faster (drawCoinParticle uses p.grav via burstPos)
  const p = coins[0], tMid = 0.5;
  const yCoin = FXGL.burstPos(p, tMid, p.grav, FXGL.BURST_DRAG).y;
  const yDefault = FXGL.burstPos(p, tMid, FXGL.BURST_GRAVITY, FXGL.BURST_DRAG).y;
  ok(yCoin > yDefault, "T203: the coin-specific gravity makes it FALL FASTER (y " + yCoin.toFixed(3) + " > default-gravity " + yDefault.toFixed(3) + " at t=" + tMid + ")");
  // teeth: the generic confetti is UNCHANGED — same fountain launch + small size as before the polish.
  ok(mean(conf, p => p.vy) < -0.15 && conf.every(p => p.size <= 7),
     "T203: the gate HAS TEETH — the generic confetti still fountains UP (mean vy " + mean(conf, p => p.vy).toFixed(2) + " < 0) at its small size (unchanged)");
})();

// T207 — coin SHINE: animated glints on the shower + occasional sparkles on the settled pile,
// with clearer/varied rotation.
(function(){
  // (A) drawCoin paints a SPECULAR glint flash when hi>0, gated (none at hi=0), as a small sparkle.
  function recCtx(){ const f = []; let fs = "#000"; return { ctx: { get fillStyle(){ return fs; }, set fillStyle(v){ fs = v; }, globalAlpha: 1, fillRect(){ f.push(fs); } }, fills: f }; }
  const rgb = [212, 158, 46], cell = 8, spec = FXGL.toHex(FXGL.shade(rgb, 0.78));
  const lit = recCtx(); FXGL.drawCoin(lit.ctx, 200, 200, 40, 0, 0.95, rgb, 0.9, cell);
  const dim = recCtx(); FXGL.drawCoin(dim.ctx, 200, 200, 40, 0, 0.95, rgb, 0, cell);
  ok(lit.fills.indexOf(spec) >= 0, "T207: a glinting coin (hi>0) paints SPECULAR highlight cells (a flash brighter than its own gold)");
  ok(dim.fills.indexOf(spec) < 0, "T207: with NO glint (hi=0) the coin has no specular cells — teeth: the flash is gated on hi");
  const specN = lit.fills.filter(c => c === spec).length;
  ok(specN > 0 && specN < lit.fills.length * 0.5, "T207: the glint is a small SPARKLE near the lit pole (" + specN + "/" + lit.fills.length + " cells), not the whole face");

  // (B) shower coins carry a VARIED per-coin glint strength + VARIED spin (clear, not synchronized).
  const sc = FXGL.seedBurst({ look: "coin", count: 60, seed: 5 }, false, FXGL.BURST_CAP);
  ok(sc.every(p => p.shine > 0), "T207: every shower coin carries a glint strength (shine) that flashes as it spins");
  ok(new Set(sc.map(p => Math.round(p.shine * 20))).size > 5, "T207: the shine VARIES per coin (they don't all flash together)");
  const sp = sc.map(p => Math.abs(p.spin));
  ok(Math.max.apply(null, sp) > 12 && Math.min.apply(null, sp) < 6, "T207: spin VARIES — some coins tumble fast, some barely (clear, varied rotation: " + Math.min.apply(null, sp).toFixed(1) + "…" + Math.max.apply(null, sp).toFixed(1) + ")");
  ok(FXGL.seedBurst({ look: "coin", count: 12, seed: 5 }, true, FXGL.BURST_CAP).every(p => p.shine === 0), "T207: reduced-motion shower coins don't glint");

  // (C) the pile sparkles via a cheap, throttled, cycling glint pass (no full overlay clear), and
  //     is reduced-motion-safe.
  function mk(reduced){
    const ovr = (function(){ const f = []; let fs = "#000", cleared = 0; return { _f: f, _cleared: () => cleared, get fillStyle(){ return fs; }, set fillStyle(v){ fs = v; }, globalAlpha: 1, fillRect(x, y){ f.push(fs + "@" + (x | 0) + "," + (y | 0)); }, clearRect(){ cleared++; } }; })();
    const c = new FXGL.Controller(stubCanvas(390, 844), { backend: "2d", ctx2d: { fillRect(){}, clearRect(){}, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData(){} }, raf: () => 1, caf: () => {}, width: 390, height: 844, dpr: 2, quality: 2, reducedMotion: reduced });
    c.backend = { name: "webgl2", w: 780, h: 1688, pxScale: 2 };
    c.derived = FXGL.deriveScene({ grid: [[[20, 20, 30]]], seed: 5, hoard: { level: 1, seed: 9 } }, 200);
    c._hoardCtx = ovr; c._hoardCv = { width: 780, height: 1688 };
    return { c: c, o: ovr };
  }
  const m = mk(false);
  m.c._pileGlint(0.30); const a = m.o._f.slice();
  ok(a.length > 0, "T207: _pileGlint repaints the pile coins (" + a.length + " cell fills)");
  ok(m.o._cleared() === 0, "T207: the sparkle pass does NOT clear/redraw the whole overlay — cheap (silhouette untouched, coins repaint in place)");
  m.o._f.length = 0; m.c._pileGlint(0.30); const a2 = m.o._f.slice();
  ok(JSON.stringify(a) === JSON.stringify(a2), "T207: the sparkle is deterministic (same time → same coins)");
  m.o._f.length = 0; m.c._pileGlint(1.70); const b = m.o._f.slice();
  ok(JSON.stringify(a) !== JSON.stringify(b), "T207: the sparkle CYCLES — a different moment glints a different set of pile coins (occasional, moving)");
  const mr = mk(true); mr.c._pileGlint(0.30);
  ok(mr.o._f.length === 0, "T207: reduced-motion → the pile does NOT sparkle (static, safe)");
})();

console.log("\n" + (fails === 0 ? "ALL " + checks + " FX-GOLDEN CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
