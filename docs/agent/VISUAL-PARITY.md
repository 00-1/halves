# VISUAL PARITY — brickmap port screens vs web GG1 (owner-requested workstream, 2026-06-24)

> Owner: *"this parity work is good, but we will also need to queue up some visual parity work. take a
> look at the hero pages for example."* The functional/data parity (drill·earn·gold·combat·events) is
> solid, but the port's SCREENS are visually bare next to web GG1 (plain text rows; no portraits, type
> colour, ratings, or drill-downs). This doc tracks the per-screen visual gaps + the shared foundations.
> **Stance (per the owner): this is parity, not polish — build to match web GG1, don't defer the richness.**
> Companion to `OWNER-EYEBALL.md` (the by-eye confirms) — here we spec from the web SOURCE so B builds to
> a target, not a guess.

---

## THE LOOP — render → compare → iterate (owner's idea, 2026-06-24)
Visual parity is now a self-driven loop, not guess-then-owner-round-trip: **the builder renders its own
screen headlessly (the golden path it already has), compares against a canonical web-GG1 REFERENCE, and
iterates until it reads like the reference.** The references are committed:
**`content/gg1/visual-ref/{heroes,inventory,arena,home}-web.png`** (+ README) — captured headless from web
GG1 with a full collection seeded (everything unlocked/boosted), regeneratable via
`tools/visual-ref-capture.js`. B's content sync pulls them.
- **The compare is PERCEPTUAL/STRUCTURAL, not a pixel diff** (two different renderers — DOM/CSS vs brickmap
  GPU — never match byte-for-byte). "Same elements, layout, type colours, portraits, ratings, chips,
  drill-downs, in roughly the right places." B looks at its render + the reference and lists the gaps.
- **B COMMITS ITS RENDER TO HALVES FOR REVIEW (owner, 2026-06-24).** When B thinks a screen has parity, it
  renders that screen headlessly and **commits the PNG into halves** (B has write access — same as its logs)
  as **`content/gg1/visual-ref/<screen>-brickmap.png`**, beside the `<screen>-web.png` target (overwrite the
  same filename — don't accumulate versions). Then the **Babysitter fetches BOTH, views them side-by-side, and
  reviews** — lists the remaining gaps or approves. This closes the loop with a real reviewer who can SEE the
  port's render (the Babysitter can't pull brickmap's own goldens cross-repo, but it can read a PNG B commits
  to halves). Render at the reference's aspect (430×880) so the side-by-side is fair; the compare stays
  perceptual.
- **Gate:** B goldens its result in brickmap (locks it once it matches) AND posts the render here for review;
  the web-match is judged by eye (B's self-compare, the Babysitter's side-by-side review, the owner's final
  sign-off in `OWNER-EYEBALL.md`). The Babysitter specs each screen from the web SOURCE so the target is precise.
- More reference screens (results, event-play, hero-detail) need a deeper played-through state to route to —
  add them to `SCREENS` in the capture tool as those screens come up.

---

## FOUNDATION (do FIRST — it unblocks portraits on EVERY screen)

**F1 — port the procedural icon/portrait generator `drawIcon` (`collectibles.js:729`).** Web draws every
hero portrait, collectible icon, and menu tile from ONE deterministic generator:
`drawIcon(canvas, id, pal, catId)` — seed `id` + palette + archetype (`catId`; heroes pass `"familiar"`
= a critter portrait) → a fixed pixel grid. The port has the 3 `emblems` but NOT this general generator,
which is exactly why Heroes/Items/Collection read as text.
- **It's DETERMINISTIC ⇒ VECTOR-PROVABLE** (like the synth scores / transforms). **Babysitter take-over:**
  export `drawIcon(id,pal,cat)` over a representative battery (the 12 heroes' `"familiar"` portraits + a
  sample of item archetypes + the palettes `HERO_PAL`/`paletteFor`) → the exact pixel grids; B reproduces
  the generator and proves byte-identical. Then portraits become available everywhere. *(Status: queued —
  Babysitter to export, same method as transforms/combat/events.)*
- **F2 — enemy portraits (`window.Monsters`)** — the Arena's foe art; same generator family. Needed for the
  Arena screen to look right. Export alongside F1 or as a follow-up.

## THE BASE→EFFECTIVE STATS BUG (correctness, fix in the Heroes pass)
The port's Heroes list shows **base** stats (`P14 G12 S6 F6`); web shows **EFFECTIVE** stats
(`14 PWR 561 GRD 6 SPD 6 FOC` = base + owned boosts, via `effectiveStats(h,col)`). Not just cosmetic — the
displayed numbers are wrong. B now has `effectiveStats` (combat export); use it for the display too.

---

## PER-SCREEN QUEUE

### Heroes — the worked example (spec'd from `main.js renderHeroes`/`heroCard`/`renderHeroDetail`)
Port today: a flat list "Brannon (Brawn) P14 G12 S6 F6". Web target (`heroCard`):
1. **Type SECTION HEADERS** — grouped `BRAWN` / `ARCANE` / `CUNNING` (`<h4>` per group). Port has none.
2. **Pixel PORTRAIT** per hero — 48×48 `drawIcon(cv,"hero:"+id,HERO_PAL[type],"familiar")` (needs F1).
3. **Type colour** — a `typedot` (■ before the name) + type-themed card (`t-brawn/arcane/cunning`).
4. **EFFECTIVE stat chips** — `PWR/GRD/SPD/FOC` from `effectiveStats` (fixes the base bug above), as pills.
5. **Rating** — `★ <round(rating)>` (`rating = power·1 + focus·0.8 + speed·0.5 + guard·0.3`). Port has none.
6. **Boost line** — `Boosted by <N>` (count of owned items whose `boost.hero===id`) + `tap for details ›`,
   or `No items yet — collect to boost.` Port has none.
7. **Hero DETAIL screen** (`renderHeroDetail`, the `tap for details` target — port lacks it): big portrait,
   name+type+rating, effective stat chips, `<owned>/<all> boosts collected`, and the COMPLETE owned-boost
   list (`<flavour> +<amt> <STAT>`, rarity-coloured), scrollable.
8. **Locked heroes** — `?` portrait + name + `unlockHint` (the port likely only lists unlocked).
9. **Scroll** — 12 heroes; web scrolls (the `list_screen` adaptive shrink may suffice, but with portraits
   the rows are taller → likely needs real scroll, the deferred input-plumbing item).

### Other screens — TO AUDIT against their web `render*` (seed; Babysitter details each as B reaches it)
- **Collection** (`renderSummary`/home) — port is a 6-row text summary; web has art/emblems/hoard backdrop.
- **Items / catalogue** (`renderInventory`) — web draws each item's `drawIcon` in a grid by category + rarity
  colour + emblem awards; port is text (needs F1).
- **Collector Ladder** — web rung styling / rarity; compare.
- **Results** (`finishEvent`/round results) — web rank art, gold tally, unlock toasts; compare.
- **Events** (`renderEvents`) — web: emblem art, name/blurb/countdown, Play CTA; port is status text.
- **Drill / topic-select** — backdrop scene, progress, keypad feel (mostly done; re-check vs web).
- **Arena (NEW)** + **event-play (NEW)** — build these to the visual bar FROM THE START (hero/foe portraits
  via F1/F2, type colours, the battle playout). Don't ship them plain then redo.

---

## SEQUENCING
1. **F1 (icon generator) — Babysitter export next** (vector-provable; unblocks all portraits).
2. New screens (Arena, event-play) built to the visual bar as B builds them (they need F1/F2).
3. Visual pass on existing screens, **Heroes first** (the worked example above) → Items → Collection →
   Events → Results → Ladder. Each: Babysitter specs from the web source, B builds + goldens, owner eyeballs
   the match (`OWNER-EYEBALL.md`).

*Maintained by the Babysitter. Gate render on goldens; the web-match is the owner's eye (queue confirms in OWNER-EYEBALL).*
