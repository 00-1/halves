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

console.log("\n" + (fails === 0 ? "ALL " + checks + " FX-GOLDEN CHECKS PASSED" : fails + "/" + checks + " FAILED"));
process.exit(fails ? 1 : 0);
