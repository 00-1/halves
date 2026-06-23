#!/usr/bin/env node
/*
 * T229 — GG1 content-as-data export (NON-DESTRUCTIVE).
 *
 * Loads the LIVE gg1/dev content modules read-only and emits the engine-agnostic
 * content seam the brickmap port (or any re-implementation / JS reuse) consumes:
 *   content/gg1/modes.json         — per-mode metadata + raw curated pool + transform ref
 *   content/gg1/parity-vectors.json — per-mode FULL deterministic {p,a} set (sorted)
 *   content/gg1/transforms.md       — the pure datum→{p,a} transform fns (source) + helpers
 *   content/gg1/README.md           — the contract + how to regenerate
 *
 * This NEVER modifies the runtime. It reads gg1/dev/modes.js, runs its IIFE in a
 * window-stub to get window.MODES (+ build()), and — to get each mode's RAW pool
 * (`*_SRC`) and named transform fns WITHOUT fragile source-parsing — re-runs the same
 * source with one injected line that captures those module-local bindings from their
 * NATIVE scope just before `window.MODES = MODES;`.
 *
 * Run:  node tools/content-export.js   (regenerates content/gg1/*; see README)
 */
"use strict";
const fs = require("fs"), path = require("path");

const ROOT = path.join(__dirname, "..");
const MODES_JS = path.join(ROOT, "gg1/dev/modes.js");
const OUT_DIR = path.join(ROOT, "content/gg1");
const src = fs.readFileSync(MODES_JS, "utf8");

// ---- 1) plain load → the live MODES (metadata + build()) --------------------
function loadModes(extraInject){
  const sandbox = { window: {} };
  let code = src;
  if(extraInject) code = code.replace("window.MODES = MODES;", extraInject + "\n  window.MODES = MODES;");
  // modes.js is a bare IIFE that assigns window.MODES / window.MODE_GROUPS.
  new Function("window", code)(sandbox.window);
  return sandbox.window;
}
const live = loadModes(null);
const MODES = live.MODES;
if(!Array.isArray(MODES) || !MODES.length) throw new Error("could not load window.MODES from gg1/dev/modes.js");

// ---- 2) parse each build() → its `*_SRC` pool name + map transform ----------
// Every mode's build() is the uniform shape: shuffle(<NAME>_SRC).map(<mapper>),
// where <mapper> is either a bare identifier (a named datum→{p,a} fn) or an inline
// arrow. We extract the pool name and the mapper text by balanced-paren scan.
function parseBuild(mode){
  const s = mode.build.toString();
  const srcM = s.match(/shuffle\(\s*([A-Za-z0-9_]+)\s*\)/);
  if(!srcM) throw new Error("unexpected build() shape for mode `" + mode.id + "`: " + s);
  const poolName = srcM[1];
  const mapAt = s.indexOf(".map(");
  if(mapAt < 0) throw new Error("no .map() in build() for `" + mode.id + "`");
  let depth = 1, i = mapAt + ".map(".length, end = -1;
  for(; i < s.length; i++){ const c = s[i]; if(c === "(") depth++; else if(c === ")"){ if(--depth === 0){ end = i; break; } } }
  const mapper = s.slice(mapAt + ".map(".length, end).trim();
  const named = /^[A-Za-z_$][\w$]*$/.test(mapper) ? mapper : null;   // identifier ⇒ named fn
  return { poolName, mapper, named };
}
const builds = {};
MODES.forEach(m => { builds[m.id] = parseBuild(m); });

// ---- 3) capture the raw pools + named transform fns from their native scope --
const poolNames = [...new Set(Object.values(builds).map(b => b.poolName))];
const fnNames   = [...new Set(Object.values(builds).map(b => b.named).filter(Boolean))];
const capture =
  "  window.__POOLS__ = {" + poolNames.map(n => JSON.stringify(n) + ":(typeof " + n + "!=='undefined'?" + n + ":null)").join(",") + "};" +
  "  window.__FNS__ = {"   + fnNames.map(n => JSON.stringify(n) + ":(typeof " + n + "!=='undefined'?" + n + ".toString():null)").join(",") + "};";
const cap = loadModes(capture);
const POOLS = cap.__POOLS__, FNS = cap.__FNS__;

// ---- 3b) shared scalar constants the transforms reference (e.g. MINUS = "−") --
// Scan the transform sources (named fns + inline arrows) for ALL-CAPS identifiers
// that aren't pools, and capture any that resolve to a scalar — those are part of
// the content contract ("global use") a port must reproduce.
const capsTokens = new Set();
const scan = txt => { (txt.match(/\b[A-Z][A-Z0-9_]{2,}\b/g) || []).forEach(t => capsTokens.add(t)); };
Object.values(FNS).forEach(s => s && scan(s));
Object.values(builds).forEach(b => !b.named && scan(b.mapper));
poolNames.forEach(n => capsTokens.delete(n));
const constNames = [...capsTokens];
const constCapture = "  window.__CONSTS__ = {" +
  constNames.map(n => JSON.stringify(n) + ":(typeof " + n + "!=='undefined'?" + n + ":undefined)").join(",") + "};";
const CONSTS_RAW = constNames.length ? loadModes(constCapture).__CONSTS__ : {};
const SHARED_CONSTS = {};   // only scalars (strings/numbers) — skip MODES/objects/arrays
Object.keys(CONSTS_RAW).forEach(n => { const v = CONSTS_RAW[n]; if(typeof v === "string" || typeof v === "number") SHARED_CONSTS[n] = v; });

// ---- 4) unlock + parity helpers ---------------------------------------------
function unlockOf(m){
  if(typeof m.requires === "string" && m.requires.indexOf("mastery:") === 0) return { mastery: m.requires.slice(8) };
  if(m.unlockedBy) return { by: m.unlockedBy };
  return null;   // a root / always-available mode
}
const keyOf = q => JSON.stringify([q.p, q.a]);
// build() shuffles ORDER only; the SET of {p,a} is fixed + the transforms are pure.
// Sort to a canonical order, and prove determinism by re-running.
function parityVectors(m){
  const run = () => m.build().map(q => ({ p: q.p, a: q.a })).sort((x, y) => (keyOf(x) < keyOf(y) ? -1 : keyOf(x) > keyOf(y) ? 1 : 0));
  const a = run(), b = run();
  if(JSON.stringify(a) !== JSON.stringify(b)) throw new Error("mode `" + m.id + "` build() is NON-deterministic (set differs across runs) — cannot export a parity vector");
  return a;
}

// ---- 5) assemble the export --------------------------------------------------
const modesOut = MODES.map(m => {
  const b = builds[m.id];
  return {
    id: m.id, name: m.name, tag: m.tag, group: m.group || null,
    expr: !!m.expr, masterSecs: typeof m.masterSecs === "number" ? m.masterSecs : null,
    unlock: unlockOf(m),
    transform: b.named || b.mapper,        // a named fn (see transforms.md) or an inline arrow
    pool: POOLS[b.poolName] != null ? POOLS[b.poolName] : null
  };
});
const vectorsOut = {};
MODES.forEach(m => { vectorsOut[m.id] = parityVectors(m); });

// ---- 5b) T230 — guides + collectibles ---------------------------------------
// Load the wider module set (collectibles needs modes+events; guides is standalone)
// into one window stub and read their exposed data.
function loadFull(){
  const w = {};
  ["modes.js", "events.js", "collectibles.js", "guides.js"].forEach(f =>
    new Function("window", fs.readFileSync(path.join(ROOT, "gg1/dev", f), "utf8"))(w));
  return w;
}
const full = loadFull();
const Guides = full.Guides, Collectibles = full.Collectibles;
if(!Guides || !Collectibles) throw new Error("could not load window.Guides / window.Collectibles");

// guides.json — per-topic guide prose, plus explain() captured AS DATA: for EVERY
// real question (the parity vectors) the exact method hint the runtime renders.
const guidesOut = (function(){
  const topics = {};
  Guides.ids().forEach(id => { topics[id] = Guides.get(id); });
  const explain = {};
  MODES.forEach(m => {
    const byPrompt = {};
    vectorsOut[m.id].forEach(q => { byPrompt[q.p] = Guides.explain(m.id, { p: q.p, a: q.a }); });
    explain[m.id] = byPrompt;
  });
  return { topics, explain };
})();

// collectibles.json — the full catalogue as data (minus the `test` unlock predicate,
// which is behaviour, like a transform), category counts, and the Collector ladder
// with its capstone-below-total reachability invariant.
const collectiblesOut = (function(){
  const CATALOG = Collectibles.CATALOG;
  const strip = it => { const o = {}; Object.keys(it).forEach(k => { if(typeof it[k] !== "function") o[k] = it[k]; }); return o; };
  // CATALOG order is runtime-non-deterministic for the Beat/Spark tiers (their prompts
  // are sorted by numeric-collation, which TIES values like "0.5"/"0.05", and build()
  // shuffles, so tied items land in random order). The id SET is stable + unique, so
  // sort by id for a deterministic export (the drift gate needs byte-stability).
  const catalog = CATALOG.map(strip).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const categories = {};
  CATALOG.forEach(it => { categories[it.cat] = (categories[it.cat] || 0) + 1; });
  const coll = CATALOG.filter(it => it.cat === "Collector");
  const tiers = coll.filter(it => it.n != null).map(it => ({ id: it.id, n: it.n, name: it.name, rarity: it.rarity })).sort((a, b) => a.n - b.n);
  const emblems = coll.filter(it => it.emblem).map(it => ({ id: it.id, name: it.name, emblem: it.emblem, meta: it.meta || null }));
  const capstone = tiers.length ? tiers[tiers.length - 1].n : null;
  return {
    total: CATALOG.length,
    categories,
    collectorLadder: {
      tiers, emblems, capstone,
      catalogTotal: CATALOG.length,
      capstoneReachable: capstone != null && capstone < CATALOG.length   // the T219-LAST invariant
    },
    catalog
  };
})();


// transforms.md — every distinct transform (named fn source, or inline arrow) + the
// one shared helper (shuffle, order-only) the port must NOT reproduce literally.
function transformsDoc(){
  const lines = [];
  lines.push("# GG1 transforms — pure `datum → { p, a }` functions\n");
  lines.push("Each mode builds its round as `shuffle(<POOL>).map(<transform>)`. `shuffle` randomises ORDER");
  lines.push("only (Fisher–Yates) — it is NOT part of the content contract; the parity vectors are the sorted,");
  lines.push("order-independent set. Every transform below is a **pure** function of one pool datum `e`,");
  lines.push("returning `{ p: <prompt string>, a: <numpad answer> }`. A port reproduces GG1 by applying these");
  lines.push("to `pool` and checking the result against `parity-vectors.json`.\n");
  // named fns, in first-use order
  const seen = new Set();
  MODES.forEach(m => {
    const b = builds[m.id];
    if(b.named && !seen.has(b.named)){
      seen.add(b.named);
      const users = MODES.filter(x => builds[x.id].named === b.named).map(x => x.id);
      lines.push("## `" + b.named + "`  — used by: " + users.join(", "));
      lines.push("```js\n" + (FNS[b.named] || "// (source unavailable)") + "\n```\n");
    }
  });
  const inl = MODES.filter(m => !builds[m.id].named);
  if(inl.length){
    lines.push("## Inline transforms (no named fn)\n");
    inl.forEach(m => lines.push("- `" + m.id + "`: `" + builds[m.id].mapper + "`"));
    lines.push("");
  }
  const cn = Object.keys(SHARED_CONSTS);
  if(cn.length){
    lines.push("## Shared constants (part of the content contract — reproduce these)\n");
    cn.forEach(n => lines.push("- `" + n + "` = `" + JSON.stringify(SHARED_CONSTS[n]) + "`"));
    lines.push("");
  }
  const sh = src.match(/function shuffle\(a\)\{[\s\S]*?\n {2}\}/);
  lines.push("## Shared helper (order only — do NOT port as content)\n");
  lines.push("```js\n" + (sh ? sh[0] : "function shuffle(a){ /* Fisher–Yates */ }") + "\n```");
  return lines.join("\n") + "\n";
}

function readmeDoc(){
  return [
"# GG1 content-as-data (`content/gg1/`)",
"",
"The engine-agnostic content seam for Goblin Gold v1 (`gg1-v1` @ `525ba87`). Generated",
"by `tools/content-export.js` from the LIVE `gg1/dev/modes.js` — **do not hand-edit**;",
"regenerate instead. This export is NON-DESTRUCTIVE: it never touches the runtime.",
"",
"## Files",
"- **`modes.json`** — one record per playable mode: `{ id, name, tag, group, expr,",
"  masterSecs, unlock, transform, pool }`. `unlock` is `{ mastery: <modeId> }` (must master",
"  that mode first), `{ by: <modeId> }` (sequential unlock), or `null` (always available).",
"  `transform` names the pure fn (see `transforms.md`) or gives the inline arrow. `pool` is",
"  the RAW curated source data the transform maps over.",
"- **`parity-vectors.json`** — per mode, the FULL deterministic `{ p, a }` set (sorted). A",
"  re-implementation is correct iff `sort(map(transform, pool))` equals this exactly.",
"- **`transforms.md`** — the source of every transform fn + the (order-only) shuffle helper.",
"- **`guides.json`** — `{ topics, explain }`. `topics[id]` is the per-topic guide",
"  (`{ intro, tips, example }`); `explain[modeId][prompt]` is the exact method hint the",
"  runtime shows for EVERY real question (captured by running `explain()` over the parity",
"  vectors) — answer-free, so it's a safe lookup table a port can use verbatim.",
"- **`collectibles.json`** — `{ total, categories, collectorLadder, catalog }`. `catalog`",
"  is every award as data (minus its `test` unlock predicate, which is behaviour);",
"  `collectorLadder` carries the 12 count-tiers + 3 boss emblems + the capstone and its",
"  `capstoneReachable` (capstone < catalogTotal) invariant.",
"  *(Tuning constants — gold, enemy tiers, hero stats — are the follow-on `balance.json`.)*",
"",
"## Regenerate",
"```sh",
"node tools/content-export.js",
"```",
"`test/content-parity.test.js` re-runs the export in CI and fails if the committed files",
"drift from the live runtime — so this data and `gg1/dev` can never silently diverge.",
"",
"## Counts",
"- modes: " + modesOut.length,
"- parity vectors: " + Object.values(vectorsOut).reduce((n, v) => n + v.length, 0) + " total `{p,a}` pairs",
"- guide topics: " + Object.keys(guidesOut.topics).length + " (+ " + Object.values(guidesOut.explain).reduce((n, e) => n + Object.keys(e).length, 0) + " explain entries)",
"- collectibles: " + collectiblesOut.total + " across " + Object.keys(collectiblesOut.categories).length + " categories",
""
  ].join("\n");
}

// ---- 6) expose (no writes on require) + write only when run directly ---------
// The parity test require()s this to compare the freshly-computed export against the
// committed files, so building must be side-effect-free; writing is main-only.
const OUT_FILES = {
  "modes.json": JSON.stringify(modesOut, null, 2) + "\n",
  "parity-vectors.json": JSON.stringify(vectorsOut, null, 2) + "\n",
  "guides.json": JSON.stringify(guidesOut, null, 2) + "\n",
  "collectibles.json": JSON.stringify(collectiblesOut, null, 2) + "\n",
  "transforms.md": transformsDoc(),
  "README.md": readmeDoc()
};
module.exports = {
  OUT_DIR, OUT_FILES,
  buildExport: () => ({ modes: modesOut, vectors: vectorsOut, guides: guidesOut, collectibles: collectiblesOut })
};

if(require.main === module){
  fs.mkdirSync(OUT_DIR, { recursive: true });
  Object.keys(OUT_FILES).forEach(f => fs.writeFileSync(path.join(OUT_DIR, f), OUT_FILES[f]));
  console.log("exported " + modesOut.length + " modes, " +
    Object.values(vectorsOut).reduce((n, v) => n + v.length, 0) + " parity pairs → content/gg1/");
}
