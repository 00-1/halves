# Visual-parity reference map — web GG1 (the TARGETS)

A near-exhaustive headless capture of **web GG1**'s screens + states, at a fixed mobile viewport
(430×880 @2×), with a **full collection seeded** (everything unlocked + boosted, so heroes show
effective stats, the catalogue is full, the Arena ladder is climbed, etc.). These are the **visual
targets** the brickmap port's screens are iterated against — the visual analogue of golden PNGs /
parity vectors. `manifest.json` lists every screen, its seeded state, and whether it captured.

## The loop (per screen)
1. The builder renders its OWN screen headlessly (the golden path it already has).
2. Compare that render against `<screen>-web.png` here — same elements? layout, type colours,
   portraits, ratings, chips, drill-downs? (A **perceptual/structural** compare — two different
   renderers, so NOT a pixel diff. Look at both and list what's missing/wrong.)
3. Fix → re-render → repeat until it reads like the reference. Golden it; then B commits its render
   to halves as `<screen>-brickmap.png` for the Babysitter's side-by-side review; owner signs off.

## The map (seeded state in parens)
- **splash** · **home** (full) / **home-fresh** (new player) / **home-midprogress** · **guide** (the
  "how to approach" modal)
- **heroes** (full) / **heroes-partial** · **hero-detail-brawn / -arcane / -cunning**
- **inventory-topics / -awards / -loot / -events / -codex** (the 5 Items tabs) · **summary** (best times)
- **arena-prefight** (party pick) / **arena-map** (journey) / **arena-cleared**
- **settings** · **audio** · **graphics**
- **drill** (live question) · **practice** · **event-play** (gauntlet)

## Regenerate / extend
`node tools/visual-ref-capture.js [name ...]` (needs puppeteer: `npm i puppeteer`, or set
`PUPPETEER_PATH`). No args = all; names = only those (re-run to fill a flaky gap). Seeds the full
collection from the live modules, drives the hash router (+ interaction preps) to each screen,
screenshots, and merges `manifest.json`. Add a screen by appending to `SCREENS`.

## Known gaps (headless can't reliably drive these — capture on device, or future work)
- **results** — needs playing a whole round to completion; the round-advance is flaky headless (an
  audio/gesture-context path), so it's left to a re-run or a device screenshot. The **drill** capture
  covers the in-play look.
- **arena battle playout / result**, **earn/unlock celebration overlay** — animated, multi-step states;
  not yet driven. Add interaction preps if/when needed.
