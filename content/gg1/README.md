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

## Regenerate
```sh
node tools/content-export.js
```
`test/content-parity.test.js` re-runs the export in CI and fails if the committed files
drift from the live runtime — so this data and `gg1/dev` can never silently diverge.

## Counts
- modes: 46
- parity vectors: 959 total `{p,a}` pairs
