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
      scenery:  { cols: S.COLS, rows: S.ROWS, regionCount: REGIONS, source: "gg1/dev/scenery.js (buildGrid)" },
      eventart: { cols: A.COLS, rows: A.ROWS, source: "gg1/dev/eventart.js (buildGrid)" }
    }
  };

  const vectors = { scenery: [], eventArt: [] };

  // F3 — every region's backdrop (each themed; all 10 matter for parity)
  for(let region = 0; region < REGIONS; region++)
    vectors.scenery.push(Object.assign({ region: region, label: E.regionLabel ? E.regionLabel(region) : null }, packGrid(S.buildGrid(region))));

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
