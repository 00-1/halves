# Design — Hero / Enemy metagame (Phase 3)

A progression layer on top of the math drills: collect items → upgrade heroes →
beat escalating enemy tiers. Gives the drill loop a purpose. All answers/battles
still run through the existing math engine. **Builder: implement per the tasks in
BACKLOG.md Phase 3, using the concrete data/formulas here. Ask in BUILDER-LOG.md
if anything is ambiguous — do not guess.**

## Core idea

- Every **collectible** (already ~280, grows with topics) gains three things:
  a flavour **name**, a pixel **style** (1 of 10), and a **boost** = `{hero,
  stat, amount}`. Owning the item permanently adds that boost to that hero's stat.
- **12 heroes**, each with stats and a **type** (rock-paper-scissors). The 1st
  unlocks on your first round; the rest unlock from deeper achievements.
- A new **Arena** mode: pick a hero, fight the next **enemy tier**. Win is
  decided by hero effective stats × type matchup × your drill performance.
- Many enemy tiers; the **final tier is only beatable at ~100% collection**
  (its defence is computed from the max possible hero power).

## Types (rock-paper-scissors)

Three types: **Brawn**, **Arcane**, **Cunning**.
- Brawn beats Cunning · Cunning beats Arcane · Arcane beats Brawn.
- Matchup multiplier: advantage **×1.5**, neutral **×1.0**, disadvantage **×0.6**.

## Stats

`power, guard, speed, focus` (integers). Hero **effective** stat =
`base[stat] + Σ amount` over owned items whose `boost.hero==hero && boost.stat==stat`.
Hero **rating** (for battle) = `power*1.0 + focus*0.8 + speed*0.5 + guard*0.3`
of effective stats.

## Heroes (12) — id · name · type · base {power,guard,speed,focus} · unlock

| id | name | type | power | guard | speed | focus | unlock when you own… |
|----|------|------|-------|-------|-------|-------|----------------------|
| bram  | Bram the Bold     | Brawn   | 14 | 12 | 6  | 6  | `init:<first topic>` (your first round) |
| greta | Greta Stonefist   | Brawn   | 16 | 10 | 5  | 7  | finished ≥3 topics (≥3 `init:*`) |
| tovar | Ser Tovar         | Brawn   | 12 | 16 | 5  | 5  | any `mastery:*` |
| mo    | Mauler Mo         | Brawn   | 18 | 8  | 7  | 5  | `rank:darkwizard` |
| wisp  | Wisp              | Arcane  | 7  | 6  | 10 | 15 | `collector:25` |
| mira  | Mirabel the Mage  | Arcane  | 6  | 8  | 9  | 17 | flawless in ≥3 modes (≥3 `flawless:*`) |
| nim   | Old Nim           | Arcane  | 8  | 10 | 7  | 14 | `topics:one100` (100% a topic) |
| zeph  | Zephyrine         | Arcane  | 9  | 6  | 13 | 13 | `rank:archmage` |
| pip   | Pip Quickfingers  | Cunning | 8  | 6  | 16 | 9  | any Lightning bracket (`speed:*:3`) |
| vex   | Vex               | Cunning | 10 | 7  | 15 | 8  | `meta:allmodes` |
| sela  | Shadow Sela       | Cunning | 9  | 9  | 14 | 9  | `collector:75` |
| roon  | Roon the Sly      | Cunning | 11 | 8  | 17 | 7  | defeat enemy tier 10 (`tier:10`) |

Unlock = own the listed collectible id, or meet the count/▒computed condition.
Implement `isHeroUnlocked(hero, collected, stats)` analogous to `isUnlocked`.

## Item boost mapping (deterministic, every item boosts something)

For each catalogue item id: `h = hash(id) % 12` → heroes[h]; `s = hash(id+"§")
% 4` → [power,guard,speed,focus][s]; `amount = {common:1, uncommon:2, rare:3,
epic:5, legendary:8}[rarity]`. Store as `item.boost = {hero, stat, amount}`.
(Reuse the existing `hashStr`/`mulberry32`.) This spreads growth across all 12
heroes so every hero is worth collecting for.

## Item styles (10 pixel-art generators) + names

`drawIcon` dispatches on `item.style` (assigned `hash(id) % 10`), each a distinct
**pixel** routine (keep `image-rendering:pixelated`), palette still by rarity:

1. **sprite** — current mirrored creature blob (keep as-is)
2. **potion** — flask outline + liquid + bubble (effervescent)
3. **scroll** — rolled parchment + ribbon + glyph lines (cryptic)
4. **blade** — dagger/short-sword (glowing edge highlight)
5. **gem** — faceted crystal (light/dark facets)
6. **ring** — band + set stone
7. **shield** — heater shield + boss + trim
8. **food** — drumstick / goblin leg (meat + bone)
9. **rune** — symmetric sigil on a tablet
10. **orb** — glowing sphere + highlight + glow ring

Flavour **name** = `<adjective> <noun>` from the style's pools, picked
deterministically by id. Pools (extend freely, keep family-friendly):
- adjectives: Effervescent, Cryptic, Glowing, Humming, Ancient, Cursed, Gilded,
  Frosted, Smouldering, Twinkling, Battered, Pristine, Whispering, Volatile…
- nouns by style: potion→{Potion, Elixir, Tonic, Brew}; scroll→{Scroll, Tome,
  Codex, Rune-page}; blade→{Dagger, Dirk, Kris, Shortsword}; gem→{Gem, Shard,
  Jewel, Geode}; ring→{Ring, Band, Signet}; shield→{Shield, Aegis, Buckler};
  food→{Goblin Leg, Hearth-loaf, Cave Mushroom, Jerky}; rune→{Rune, Sigil,
  Glyph}; orb→{Orb, Globe, Bauble}; sprite→{Familiar, Imp, Sprite, Critter}.
- Detail view shows: flavour name (big), the **achievement that earned it**
  (e.g. "Beat 30 in Halves"), and its **boost** ("+3 Focus · Mirabel").

## Enemy tiers

An ordered list of **100 tiers** (`{n, name, type, def}`), generated
programmatically so the count is trivially extendable beyond 100. `type` cycles
Brawn→Arcane→Cunning→… and names escalate (give flavour, e.g. themed bands of
~10: Goblin Warren → … → the final boss). You may only attempt tier `n` after
`tier:n-1`.

**Defeating a tier unlocks loot — a batch of new inventory items, not just one.**
Each tier `n` grants:
- `tier:n` (own-able marker),
- a **themed loot batch** of new collectibles (e.g. ~3–6 early, scaling to more
  and rarer deeper; deeper tiers drop epic/legendary loot). These are full
  catalogue items: each has a style, a flavour name, and a hero/stat **boost**,
  so loot directly upgrades your heroes — closing the loop (beat tier → loot →
  stronger heroes → next tier). Generate them programmatically as their own
  catalogue category (e.g. `loot:<n>:<k>`).
- possibly a hero unlock (see table).

**The catalogue can be very large — that is fine and desired. Generate items
liberally; there is no cap or concern about too many.** The inventory's
progressive disclosure (locked "?" tiles, category grouping) already scales.

**Difficulty / no circular dependency.** `def` escalates smoothly (e.g. geometric
from a low, starter-beatable value). A tier's `def` must be beatable using only
items obtainable **before** defeating it — never gate a tier behind its own loot.
The **final tier (100)** is calibrated to require essentially **everything else**:
`def100 = round( maxRatingExclFinalLoot × 1.5 )` where `maxRatingExclFinalLoot` =
the best hero's rating with **all boosts owned except tier-100's own loot**, at
advantage matchup and perfect perf. So the last boss falls only at ~100%
collection, and not before.

## Battle resolution (pure, Node-testable)

1. Player picks an unlocked hero `H`; faces current `tier` (its `type`).
2. Plays a **battle round** (a normal drill round from the player's unlocked
   topics — a mixed set is fine). Compute `perf ∈ [0,1]`:
   `clean = score/total`; `pace = clamp((H-relevant target)/avgAnswerTime, 0.5,
   1.3)`; `perf = clamp(clean * pace, 0, 1)`.
3. `matchup` = 1.5 / 1.0 / 0.6 from RPS(H.type, tier.type).
4. `battlePower = round( rating(H) × matchup × (0.4 + 0.6*perf) )`.
5. **Win if `battlePower ≥ tier.def`.** Win → grant `tier:n` + its **loot batch**
   (shown in the unlock modal) + advance (+ any hero unlock); loss → no progress
   (keep items; replay). Show the maths of the result.

Provide a Node test proving: (a) early tiers winnable with the starter hero at
good perf; (b) **no tier is gated behind its own loot** (each `def_n` is beatable
with items obtainable before tier `n`); (c) tier 100 is **not** winnable until
every non-final-tier-loot boost is owned, and **is** winnable once it is (with
advantage + perfect perf).

## Screens / routing

- New **Arena** screen (`#/arena`): current tier (name/type/def), hero picker
  (unlocked heroes with effective stats + matchup hint vs this tier), Fight →
  runs the battle round → result overlay.
- New **Heroes** screen (`#/heroes`): roster, locked/unlocked + unlock hints,
  per-hero effective stats and which items boost them.
- Start-screen links to Arena & Heroes alongside Best times / Inventory.

## Non-negotiables

- Keep it **numeric-answer / numpad** (battles reuse the drill engine).
- Keep **device-local** storage; no servers.
- Procedural icons stay **pixelated**; no image assets.
- 100%-collection ⇒ final boss beatable (and not before) — verified in Node.
