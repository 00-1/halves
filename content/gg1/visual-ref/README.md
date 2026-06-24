# Visual-parity reference screenshots — web GG1 (the TARGETS)

Canonical headless captures of **web GG1**'s screens, at a fixed mobile viewport (430×880 @2×), with a
**full collection seeded** (everything unlocked + boosted, so heroes show effective stats, the catalogue
is full, etc.). These are the **visual targets** the brickmap port's screens are iterated against — the
visual analogue of golden PNGs / parity vectors.

## The loop (per screen)
1. The builder renders its OWN screen headlessly (the existing golden path).
2. Compare that render against `<screen>-web.png` here — same elements? layout? type colours, portraits,
   ratings, chips, drill-downs? (A **perceptual/structural** compare — two different renderers, so NOT a
   pixel diff. Look at both images and list what's missing/wrong.)
3. Fix → re-render → repeat until it reads like the reference. Then golden it; owner signs off the match.

## Files
- `heroes-web.png` — the worked example (type section headers · pixel portraits · ★rating · effective
  stat chips · "Boosted by N · tap for details ›").
- `inventory-web.png` — the collectible catalogue (per-item `drawIcon` grid, rarity colour).
- `arena-web.png` — the 3v3 Arena pre-fight (tier/enemy team with type+advantage · party pick · portraits).
- `home-web.png` — the start screen / topic select + backdrop.

## Regenerate
`node tools/visual-ref-capture.js` (needs puppeteer: `npm i puppeteer`, or set `PUPPETEER_PATH`). Seeds the
full collection from the live modules, drives the hash router to each screen, screenshots. Add screens in
the `SCREENS` list (some — results, event-play, hero-detail — need a deeper played-through state to route to).
