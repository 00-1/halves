/* F3 + F4 — export GG1's procedural BACKDROP/BANNER generators as data + parity vectors.
 * Two more deterministic pixel generators (the F1/F2 method, but full-colour grids not role grids):
 *   F3 scenery.js  buildGrid(region) → 28×11 hex grid — the Arena `at-scene` backdrop per region,
 *                  the codex realm thumbnails, the home/menu backdrop. 10 themed regions.
 *   F4 eventart.js buildGrid(artSeed) → 24×16 hex grid — the daily-event banner crest (per event artSeed).
 * The port's Arena + event-play + codex screens render these; without the export they can't.
 * Grids are colour-packed (a per-grid palette LUT + base36 index rows) — compact, lossless, diff-friendly.
 * B ports the two generators (read from gg1/dev) and proves byte-identical vs scenes-vectors.json.
 * Run:  node tools/scene-export.js   (writes content/gg1/scenes*.json)
 * Test: require('./scene-export').generate() → {scenes, vectors}  (drift gate). */
"use strict";
const fs = require("fs"), path = require("path");
const DEV = path.join(__dirname, "..", "gg1", "dev");

const B36 = "0123456789abcdefghijklmnopqrstuvwxyz";
// the Arena backdrop is composited UNDER a legibility scrim at draw time (scenery.js draw):
// rgba(8,10,14,0.64) over the whole grid. buildGrid is PRE-scrim, so we also emit the POST-scrim
// pixels the screen actually shows — else a port could skip/mis-blend the scrim and still pass.
const SCRIM = { r: 8, g: 10, b: 14, a: 0.64 };
const hx2 = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const ch2 = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
// source-over alpha blend of SCRIM onto a hex cell → the displayed hex
function applyScrim(hex){ const s = hx2(hex), a = SCRIM.a, k = 1 - a;
  return "#" + ch2(s[0] * k + SCRIM.r * a) + ch2(s[1] * k + SCRIM.g * a) + ch2(s[2] * k + SCRIM.b * a); }
// colour grid → { pal:[hex…first-appearance order], rows:[base36 index strings] }. Lossless.
function packGrid(g){
  const pal = [], idx = {};
  const rows = g.map(row => row.map(hex => {
    if(idx[hex] === undefined) idx[hex] = pal.push(hex) - 1;
    return B36[idx[hex]];
  }).join(""));
  if(pal.length > 36) throw new Error("packGrid: >36 colours, widen the encoding");
  return { pal, rows };
}

function build(){
  const window = {};
  window.Emblems = { draw(){}, has: () => false, list: () => [] };
  window.performance = { now: () => 0 };
  const load = n => new Function("window", fs.readFileSync(path.join(DEV, n + ".js"), "utf8"))(window);
  load("modes"); load("heroes"); load("events"); load("collectibles"); load("enemies"); load("scenery"); load("eventart");
  return { S: window.Scenery, A: window.EventArt, Ev: window.Events, E: window.Enemies };
}

function generate(){
  const { S, A, Ev, E } = build();
  const REGIONS = Math.ceil(E.TIER_COUNT / (E.REGION_SIZE || 12));   // 10 themed scenery regions

  const scenes = {
    _note: "GG1 procedural backdrops/banners (NO art assets). Two deterministic full-colour 2D generators the port " +
      "reproduces from gg1/dev and proves vs scenes-vectors.json. Grids are palette-packed: each vector carries " +
      "`pal` (hex, first-appearance order) + `rows` (base36 palette-index strings); cell colour = pal[parseInt(ch,36)].",
    _f3: "SCENERY (scenery.js buildGrid(region)): 28×11. THEMES[region%10] gives {sky:[top,bot], sil, shape, accent}. " +
      "Fill: per-row sky = lerp(sky0,sky1,r/(ROWS-1)); silhouette from topRow(shape,c) down to the base in `sil`; if " +
      "accent, 6+floor(rnd*5) accent cells above the horizon. rnd = mulberry32((region+1)*2654435761>>>0). NB the live " +
      "`draw` adds a 0.64 scrim on top — buildGrid is the PRE-SCRIM grid (what these vectors hold).",
    _f4: "EVENTART (eventart.js buildGrid(seed)): 24×16. rnd = mulberry32((seed>>>0)||1); a hue-seeded HSL sky " +
      "gradient + a centred edge-lit diamond crest (Manhattan |c-cx|+|r-cy|*1.35 ≤ R, R=6+floor(rnd*2)) + a seeded " +
      "mirror-symmetric rune (accent) + 5+floor(rnd*5) sparks above. Seed = each event's `artSeed`.",
    constants: {
      // F3-adjacent: the FIXED backdrop palettes the FXGL home/entry scenes use (main.js homeFxState/entryFxState).
      // The home backdrop = the engine's purple gradient (homePalette) + the gold-hoard coin mound (fxgl.js seedHoard,
      // sized by gold.json hoardLevel). source-fidelity-pinned in scene-parity.
      backdrops: { homePalette: ["#0E1116", "#9a5cf6", "#cda9ff"], entryPalette: ["#08080d", "#3a2a5c", "#5a4488"],
        hoard: "fxgl.js seedHoard (DETERMINISTIC, seeded) — CAP 480, K 600 (hoardLevel=gold/(gold+600)), GOLD_TONES " +
          "[[255,214,110],[212,158,46],[120,84,22]], moundProfile(x,q,seed); a coin's fill-rank q is level-independent " +
          "so the pile is a byte-identical prefix as gold grows. B ports it from fxgl.js (its own FX module)." },
      scenery:  { cols: S.COLS, rows: S.ROWS, regionCount: REGIONS, source: "gg1/dev/scenery.js (buildGrid + draw)",
        scrim: "rgba(8,10,14,0.64)", scrimNote: "Arena backdrop is buildGrid composited UNDER this scrim (source-over). " +
          "Each vector carries `rows` (PRE-scrim, what buildGrid returns) AND `litRows` (POST-scrim, what the screen shows)." },
      eventart: { cols: A.COLS, rows: A.ROWS, source: "gg1/dev/eventart.js (buildGrid; drawn 1:1, no scrim)" }
    }
  };

  const vectors = { scenery: [], eventArt: [] };

  // F3 — every region's backdrop: PRE-scrim grid (`rows`, what buildGrid returns) + POST-scrim
  // grid (`litRows`, what the Arena actually displays after the legibility scrim).
  for(let region = 0; region < REGIONS; region++){
    const g = S.buildGrid(region);
    const pre = packGrid(g), lit = packGrid(g.map(row => row.map(applyScrim)));
    vectors.scenery.push({ region: region, label: E.regionLabel ? E.regionLabel(region) : null,
      pal: pre.pal, rows: pre.rows, litPal: lit.pal, litRows: lit.rows });
  }

  // F4 — every daily event's banner crest (keyed by its artSeed)
  for(const ev of Ev.ROSTER)
    vectors.eventArt.push(Object.assign({ event: ev.id, artSeed: ev.artSeed }, packGrid(A.buildGrid(ev.artSeed))));

  return { scenes, vectors };
}

if(require.main === module){
  const { scenes, vectors } = generate();
  fs.writeFileSync(path.join(__dirname, "..", "content", "gg1", "scenes.json"), JSON.stringify(scenes, null, 1) + "\n");
  fs.writeFileSync(path.join(__dirname, "..", "content", "gg1", "scenes-vectors.json"), JSON.stringify(vectors) + "\n");
  console.log("wrote content/gg1/scenes.json + scenes-vectors.json — scenery", vectors.scenery.length,
    "regions, eventArt", vectors.eventArt.length, "events");
}
module.exports = { generate, packGrid };
