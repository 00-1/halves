# GG1 content-as-data (`content/gg1/`)

The engine-agnostic content seam for Goblin Gold v1 (`gg1-v1` @ `525ba87`). Generated
by `tools/content-export.js` from the LIVE `gg1/dev/modes.js` — **do not hand-edit**;
regenerate instead. This export is NON-DESTRUCTIVE: it never touches the runtime.

## Files
- **`modes.json`** — one record per playable mode: `{ id, name, tag, group, expr,
  masterSecs, unlock, transform, pool }`. `unlock` is `{ mastery: <modeId> }` (must master
  that mode first), `{ by: <modeId> }` (sequential unlock), or `null` (always available).
  `transform` names the pure fn (see `transforms.md`) or gives the inline arrow. `pool` is
  the RAW curated source data the transform maps over.
- **`parity-vectors.json`** — per mode, the FULL deterministic `{ p, a }` set (sorted). A
  re-implementation is correct iff `sort(map(transform, pool))` equals this exactly.
- **`transforms.md`** — the source of every transform fn + the (order-only) shuffle helper.
- **`guides.json`** — `{ topics, explain }`. `topics[id]` is the per-topic guide
  (`{ intro, tips, example }`); `explain[modeId][prompt]` is the exact method hint the
  runtime shows for EVERY real question (captured by running `explain()` over the parity
  vectors) — answer-free, so it's a safe lookup table a port can use verbatim.
- **`collectibles.json`** — `{ total, categories, collectorLadder, catalog }`. `catalog`
  is every award as data (minus its `test` unlock predicate, which is behaviour);
  `collectorLadder` carries the 12 count-tiers + 3 boss emblems + the capstone and its
  `capstoneReachable` (capstone < catalogTotal) invariant.
  *(Tuning constants — gold, enemy tiers, hero stats — are the follow-on `balance.json`.)*

## Regenerate
```sh
node tools/content-export.js
```
`test/content-parity.test.js` re-runs the export in CI and fails if the committed files
drift from the live runtime — so this data and `gg1/dev` can never silently diverge.

## Counts
- modes: 46
- parity vectors: 959 total `{p,a}` pairs
- guide topics: 46 (+ 959 explain entries)
- collectibles: 2352 across 10 categories
