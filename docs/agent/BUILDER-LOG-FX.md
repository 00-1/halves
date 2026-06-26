# Builder B — FX engine + brickmap · handoff log

Builder B owns the **NEW standalone FX modules** in Halves and the **brickmap** repo.
Never edits an existing Halves file (wiring is Builder A's job). This log is mine
(`BUILDER-LOG-FX.md`); Builder A keeps `BUILDER-LOG.md`.

---

## BRICKMAP-GG1 FULL PORT — phase 5 PARITY: Arena + event-play CHANGES punch-list (V1–V7) ([B], GO)

Addressed the Babysitter's first-cut CHANGES (REVIEW.md + PARITY-LEDGER V1–V7). `00-1/brickmap`
`8373a20` (main + feature). **Re-rendered both visual-refs** (`arena-prefight-brickmap.png`,
`event-play-brickmap.png`). `node tools/visual-compare.js` cooled **arena-prefight 15.3 → 10.2** and
**event-play 12.4 → 8.32** mean ΔE (both `examine`, comfortably under the gross-18 gate).
- **V1** Arena now fields the full **3-foe enemy team** (lead + 2 typed supports) as cards over the
  backdrop — mini portrait + type + PWR/HP each — not a single foe.
- **V2** Per-hero **matchup badge** vs the lead foe (`ADV ×1.5` / `WEAK` / `EVEN`) via the new
  `combat::matchup_mult` — the type-triangle strategy signal.
- **V3** "How battles work" **primer** box + a **Journey map** button.
- **V4** Render the clean **pre-fight** state (no post-battle banner), button "Pick your party",
  selected cards = a subtle **amber border** (not the heavy green fill).
- **V5** **Calculator numpad** order (7/8/9 top), flipped in `bm-render::ui2d::keypad`.
- **V6** "How to approach this" **hint button** above the numpad.
- **V7** Pixel **backspace arrow** (the face lacks ⌫) + an **outlined Skip** bar (web's subtle action
  bar). Keypad height trimmed to fit the hint button.
- **D1/D2** (event title vs progress counter; purple event-tint vs near-black) left as the owner's
  call per the parity ledger — not changed.
- **Gates:** clippy clean (native + `aarch64-android`), full suite, GPU goldens on lavapipe
  (`arena`/`drill-initial` re-blessed). *(Heroes visual pass is staged WIP, stashed — resumes next.)*

---

## BRICKMAP-GG1 FULL PORT — phase 5 PARITY: the EVENT-PLAY SCREEN (today's event → gauntlet → tiers) ([B], GO)

Second of the two screens — daily **event-play**, against `event-play-web.png` (which captures the
*drill in gauntlet mode*, not a menu). `00-1/brickmap` `437d574` (main + feature). **Render committed to
halves `content/gg1/visual-ref/event-play-brickmap.png` (430×880) for the side-by-side review.**
- **Daily-Event entry:** today's **live** event (`event_play::live_event(now_ms)`) — its **F4 crest**
  banner, theme · rarity, blurb, gauntlet size, the **three reward tiers** (Play / 70%+ / Flawless, each
  with its reward item name, **green once earned**), and a **countdown** to the next UTC rotation. A
  **Play today's event** CTA launches the gauntlet; shares `event_play_cta` with the hit-test.
- **Gauntlet drill:** `Drill::from_gauntlet(eid)` runs the deterministic, vector-proven gauntlet
  (`build_gauntlet`) through the **shared drill UI** (heading = event name, progress = size, auto-accept,
  Skip) — so the proven drill renderer IS the event-play visual (matches `event-play-web.png`).
- **Award:** finishing folds `eventTiersEarned` (participation / well ≥0.7 / ace=flawless) into the save
  via `Save::award_event` — **no gold** (the reward IS the buff) — then shows the outcome banner.
- **Glyph fix (app-wide):** baked the math operators (`− × ÷ ²`), the `·` middot, and the `— –` dashes
  into the text faces — the default atlas was ASCII-only, so prompts like `91 − 37`, labels like
  `fire · epic`, and existing strings like `Tap the digits — it checks itself` were silently dropping
  their symbols. Now every drill operator / inline separator renders. (Re-blessed the affected goldens.)
- **Gates:** clippy clean (native + `aarch64-linux-android`), full suite (new `from_gauntlet` +
  event-flow + frame tests), GPU goldens on lavapipe. `events.png` golden now IS the Daily-Event screen.

---

## BRICKMAP-GG1 FULL PORT — phase 5 PARITY: the ARENA SCREEN (party-pick → battle → grant) ([B], GO)

First of the two screens — the 3v3 **Arena**, built to the visual bar against `arena-prefight-web.png`.
`00-1/brickmap` `6650a62`. **Render committed to halves `content/gg1/visual-ref/arena-prefight-brickmap.png`
(430×880) for the side-by-side review.**
- **Foe showcase:** the region **scenery backdrop** (F3) + the tier's **foe portrait** (F2) + name +
  `TYPE · N PWR · N HP`, over the next tier (derived from the save's `tier:` keys).
- **Party-pick:** a card per **unlocked** hero (`combat::unlocked_roster`) — F1 **portrait** + name in
  type colour + `★`rating (`pow+0.8foc+0.5spd+0.3grd`) + **effective** stat chips (PWR/GRD/SPD/FOC, via
  `combat::effective_stats` — fixes the base-vs-effective bug). Tap toggles into the party (≤3, selected
  cards highlit); shares `arena_hero_rows` with the hit-test (proven tappable).
- **Fight → `Save::resolve_arena`** (the proven sim): on a win grants `tier:n`+loot + the `tierGold`
  payoff and advances the tier; an outcome banner shows the result. Back → Collection. The Collection
  "Heroes" row became **"Arena"** (`tiers cleared / 120`); the old roster viewer is subsumed (the Arena
  shows portraits + effective stats).
- **Gated:** new `arena` golden (GPU-matched under lavapipe) + a reachability unit test (every unlocked
  card tappable, Fight bar hittable). goblin-gold **97** lib tests; **10** GPU goldens; clippy `-D warnings`
  clean native + aarch64-linux-android; fmt. Pushed to `main` + the feature branch.
- **▶ NEXT:** the event-play screen (today's event card + countdown → gauntlet → drill → tiers), same loop
  against `event-play-web.png`. (Per-screen perceptual review of the Arena render is queued for the Babysitter.)

---

## BRICKMAP-GG1 FULL PORT — phase 5 PARITY: match the HARDENED parity gates (full foe space + per-strike) ([B], GO)

The Babysitter hardened the parity batteries (`main` `40e9165`): full-space FNV digests over all foes/
items + 5 per-strike combat logs (closing the art under-sampling + combat headline-only holes). Re-synced
+ strengthened the port's own gates to match. `00-1/brickmap` `6cd8dbc`.
- **Full foe space:** `art::foe_digest` rolls FNV-1a over **all 120 foes** (canonical `n|roleGrid|
  body+accent+outline+eye`, tier order) → matches the export's `foeDigest 23f2c27b`. So `foe_grid` is
  proven byte-identical across **every** tier, not the 16 sampled — and it passed first try (no bug in
  the 104 unsampled foes).
- **Per-strike combat replay:** refactored `simulate` to emit the playout log (one code path), and
  replay **all 5 diverse `teamBattleLogs`** (opening strikes · a loss · single-hero · region 5 · the
  boss) strike-by-strike — round/sides/ords/dmg/tHp/ko/adv/blocked all match. Pinned `blocked` =
  mitigation ≥ raw/2 and the tHp-at-0 clamp. A targeting/order/rounding bug can no longer hide behind a
  correct headline.
- goblin-gold **96** lib tests; **9** GPU goldens; clippy `-D warnings` clean native + aarch64-linux-
  android; fmt clean. Pushed to `main` + the feature branch.
- *(Deferred, flagged: the `itemDigest` (2702 item icons) needs the `ARCH` item-icon path — that's the
  Items-screen visual pass, not the Arena/event-play screens. Noted for when I port `drawIcon`'s item
  branch.)*
- **▶ NEXT (unchanged):** assemble the Arena + event-play screens against `arena-web.png` /
  `event-play-web.png`.

---

## BRICKMAP-GG1 FULL PORT — phase 5 PARITY: art renders on the GPU (paint helpers + contact sheet) ([B], GO)

Bridged the proven art *logic* (F1–F4 grids) to the engine *render* path before building the screens.
`00-1/brickmap` `9946362`.
- **Paint helpers** (reused by every screen): `art::hex_rgba` + `Palette::role_hex`; `app::paint_role`
  (a 16×16 role grid → engine rects, coloured per role) + `app::paint_colors` (a full colour grid →
  rects, for scenery/crests).
- **`render_art_sheet`** — a contact sheet painting **all four generators** through the real engine
  rect path: 12 hero portraits (F1), 15 foes (F2), 10 region backdrops (F3), 8 event crests (F4).
  Eyeballed: type-coloured mirrored hero blobs, horned monster foes, sky-gradient silhouette
  backdrops, diamond rune crests — all render correctly.
- **Golden-gated:** new `art-sheet` golden, self-consistent + GPU-matched under lavapipe (proves the
  art paints right on the GPU, not just in logic). goblin-gold **94** lib tests; **9** GPU goldens;
  clippy `-D warnings` clean native + aarch64-linux-android; fmt clean. Pushed to `main` + feature.
- **▶ NEXT:** the Arena + event-play screens proper — assemble these painted portraits/foes/backdrops
  /crests into the screen layouts against `arena-web.png` / `event-play-web.png` (party-pick → battle →
  grant; today's event → gauntlet → drill → tiers), then the render→compare→golden→commit-render loop.

---

## BRICKMAP-GG1 FULL PORT — phase 5 PARITY: scenery+banner generators F3+F4, byte-proven ([B], GO)

Completing the art foundation: the Babysitter also exported F3+F4 (`scenes.json`/`scenes-vectors.json`,
`main` `4e72bd7`). Ported both full-colour generators (`crates/goblin-gold/src/scenes.rs`), proven
**byte-identical**. `00-1/brickmap` `39f8c58`.
- **F3 scenery** (`scenery_grid`, from `scenery.js buildGrid`) — a 28×11 pre-scrim Arena backdrop per
  region: per-row sky `lerp` + a themed silhouette (`topRow` shapes: bumps/posts/trees/reeds/peaks/
  crags/spires) + seeded accents (stars/embers/snow), seeded `mulberry32((region+1)·…)`. Proven vs all
  **10** region vectors.
- **F4 eventart** (`eventart_grid`, from `eventart.js buildGrid`) — a 24×16 emblem per event seeded by
  `artSeed`: a hue-seeded HSL sky gradient (the s/l-0..100 "k-formula") + a centred edge-lit diamond
  crest + a seeded mirror-symmetric rune + sparks. Proven vs all **14** event vectors (incl. the exact
  `rnd()` short-circuit order in the rune loop).
- Palette-packed vectors (`pal` + base-36 index rows) reconstructed + compared cell-by-cell. goblin-gold
  **94** lib tests (91 + 3 scenes); clippy `-D warnings` clean native + aarch64-linux-android; fmt clean.
  Pushed to `main` + the feature branch.
- **▶ ALL FOUR art generators now ported + proven** (F1 heroes · F2 foes · F3 scenery · F4 crests) — so
  the screens have portraits, foes, backdrops AND banners. **NEXT: build the Arena + event-play screens
  to the visual bar** (against `arena-web.png` / `event-play-web.png`), painting these grids.

---

## BRICKMAP-GG1 FULL PORT — phase 5 PARITY: portrait generators F1+F2, byte-proven ([B], GO)

The Babysitter landed the F1+F2 art export (`main` `8397e8b`) — deadlock cleared. Ported **both
procedural 16×16 portrait generators** and proved them **byte-identical vs `art-vectors.json`**
(`crates/goblin-gold/src/art.rs`). `00-1/brickmap` `0978f81`. *(Note: while the Babysitter looked cold I
had started self-porting F1 to break the idle — stood down + discarded that the moment it woke; this is
the proper flow against its independent export.)*
- **F1 hero portraits** (`hero_icon`, from `collectibles.js drawIcon/heroSprite/iconRoleGrid/iconPalette`):
  `"hero:"<id>` → `mulberry32(hashStr)` → the mirrored centre-weighted creature-blob → role grid
  (0/1/2/3) + the per-id **HSL hue/lum-shifted palette** (`nudge`/`shiftPalette` — full rgb↔hsl
  round-trip, JS `Math.round`). Proven vs all **12** hero vectors (role grid AND shifted pal).
- **F2 foes** (`foe_grid`, from `monsters.js buildGrid`): `mulberry32(hashStr(name) ^ imul(n,…))` → a
  lumpy vertically-symmetric blob + region-biased horns/eyes/mouth/spots/feet, bosses (`n%12==0`)
  larger + crowned → role grid (0..4, eyes) + per-type palette. Proven vs all **15** foe vectors
  (incl. the exact `rnd()` short-circuit order). Reused the synth `mulberry32`/`hashStr` (already
  `pub(crate)`).
- goblin-gold **91** lib tests (88 + 3 art); clippy `-D warnings` clean native + aarch64-linux-android;
  fmt clean. Pushed to `main` + the feature branch.
- **▶ NEXT: the two SCREENS are now fully unblocked** (logic ✅ + portraits ✅). Build the Arena
  (party-pick → battle → grant) + event-play (today's event → gauntlet → drill → tiers) screens to the
  visual bar against `arena-web.png` / `event-play-web.png`, painting these role grids through the
  palettes. *(Item-icon `ARCH` path deferred to the Items visual pass — the Arena/event-play/Heroes
  screens need only hero + foe portraits, both done.)*

---

## BRICKMAP-GG1 FULL PORT — phase 5 PARITY: event-play save integration ([B], GO)

`Save::award_event(eid, score, total, ts)` — folds a finished daily-event run into the keystone:
grants the `event_tiers_earned` keys (always `event:<eid>`; `+:well` ≥0.7; `+:ace` flawless), no gold
(the reward is the buff). Mirrors `award_round`/`resolve_arena`. `00-1/brickmap` `c6083f5`.
- Tested: a flawless run grants all three tiers; a weaker re-run grants nothing new and can't strip a
  tier (mark keeps the earliest ts). goblin-gold **88** lib tests; clippy `-D warnings` clean native +
  aarch64-linux-android; fmt clean. Pushed to `main` + the feature branch.
- **This completes the entire event-play LOGIC layer** (schedule · gauntlet · tiers · save grant) and,
  with the combat sim + hero-unlock, **all the Arena/event-play logic that can be built ahead of the
  screens is now done + proven.**
- ⏳ **DEADLOCK FLAG for the Babysitter:** the two SCREENS (Arena, event-play) are blocked on **F1
  `drawIcon`** (portrait pixel-grid export — still the Babysitter's "next export", not yet on `main`).
  The Arena pre-fight is portrait-heavy (foe showcase + 3 enemy cards + hero cards all centred on
  `drawIcon`), so building it portrait-less would be the "plain then redo" the directive forbids. I've
  now exhausted the unblocked logic. **Please land F1 to unblock the screens** — I'll port `drawIcon`
  + prove vs its grids the moment the export lands, then build Arena → event-play to `arena-web.png` /
  `event-play-web.png`. (Reality check: the Babysitter wakes on my pushes — this push is partly to
  surface that I'm idle-blocked on F1.)

---

## BRICKMAP-GG1 FULL PORT — phase 5 PARITY: hero-unlock predicate, vector-proven ([B], GO)

The hero-unlock export I flagged landed (`main` `b164fde`) — so the "all 12 interim" is gone: each
hero's unlock is now a serialisable spec on `combat.json heroes[].unlock` with an 18-state `heroUnlock`
parity battery. Re-synced + ported `compileUnlock`. `00-1/brickmap` `038d0ce`.
- Three predicate kinds, all over the save's `collected` keystone: **`hasKey{key}`** (key present),
  **`countPrefix{prefix,min}`** (≥min keys start with prefix), **`keyMatch{prefix,suffix,min}`** (≥min
  keys start-with prefix AND end-with suffix with **≥1 char between** — the `speed:<mode>:3` Lightning
  bracket; the `len > prefix+suffix` guard is what the battery's keyMatch-rejects pin).
- `is_hero_unlocked(hero, collected)` + `unlocked_roster(collected)` (roster order). **Proven vs the
  full 18-state `heroUnlock` battery** (incl. count boundaries: init1/init2 → only bram, init3 → +greta).
- Re-synced `combat.json` + `combat-vectors.json` to `b164fde`; the redesigned **sim still passes
  unchanged** (b164fde only added the unlock data) — 240 `teamBattle` + 36 `effectiveStats` + 5
  `heroCombatant` + log + ladder all still green.
- goblin-gold **87** lib tests (86 + 1); clippy `-D warnings` clean native + aarch64-linux-android; fmt
  clean. Pushed to `main` + the feature branch.
- **Status:** all three Arena/event-play LOGIC cores now done + proven (combat sim · event-play
  gauntlet/schedule/tiers · hero-unlock). The two **screens** remain blocked on **F1 `drawIcon`**
  (portrait pixel-grid export — still the Babysitter's next export per `VISUAL-PARITY.md`); `unlocked_roster`
  is ready to feed the Arena party-pick once the screen can be built to the visual bar.

---

## BRICKMAP-GG1 FULL PORT — phase 5 PARITY: event-play logic core (T233c), vector-proven ([B], GO)

The Arena/event-play SCREENS need portraits (F1/F2 `drawIcon` export — Babysitter take-over, not yet
landed; "don't ship plain then redo"), so I built the **unblocked, vector-provable event-play logic
core** (`crates/goblin-gold/src/event_play.rs`), re-impl'd from `events.js`/`main.js`. `00-1/brickmap`
`8dc2077`.
- **schedule** — `epochDay = floor(now_ms/dayMs)`, `index = ((epochDay%14)+14)%14`, `roster[index]`
  live. Proven vs all 15 schedule vectors (incl. negative days + far-future).
- **reward tiers** (`event_tiers_earned`) — `event:<id>` always; `+:well` at ≥0.7 accuracy; `+:ace` on
  a flawless run; no gold. Proven vs all 18 tier vectors.
- **gauntlet** (`build_gauntlet`) — `seed = hashStr(id)^artSeed → mulberry32` (reused the synth PRNG,
  now `pub(crate)`); per `questionMix {topic,n}` the topic pool (`transforms::generate`, parity-proven)
  is sorted to a total order, seed-shuffled (Fisher–Yates backward), first `n` taken; the combined set
  is seed-shuffled. **Proven byte-exact vs all 14 events' gauntlets.**
- **The collation gotcha (solved):** the total-order sort is JS `localeCompare({numeric:true})`, which
  uses ICU order, NOT codepoint — so `÷` sorts before `×` (and `²` after digits, before letters). My
  existing `earning::natural_cmp` is codepoint-ordered and got it wrong. Wrote a dedicated
  `gauntlet_cmp` with the exact ICU char rank for the GG1 prompt alphabet (derived by sorting the live
  pools through node's real `localeCompare` — stdlib as a collation reference, not GG1 logic). All 14
  gauntlets then matched.
- goblin-gold **86** lib tests (82 + 4); clippy `-D warnings` clean native + aarch64-linux-android; fmt
  clean. Pushed to `main` + the feature branch.
- **▶ BLOCKED on F1/F2 for the SCREENS:** the Arena + event-play screens want hero/foe portraits from
  the `drawIcon` pixel-grid export (Babysitter take-over, queued). Both logic cores (combat + event-play)
  are now done + proven; the screens are the remaining work and need that export to hit the visual bar.
  Flagging so the Babysitter can prioritise F1. (Interim screens without portraits would be "plain then
  redo," which the directive says not to do.)

---

## BRICKMAP-GG1 FULL PORT — phase 5 PARITY: RE-SYNC to the redesigned combat model ([B], GO)

Resumed after a pause to find the **Arena combat model was redesigned** (`main` `b49e62b`) — bigger
than a rebalance: all 4 stats now have a distinct role and the 1v1 path is gone. Re-synced the
regenerated `combat.json` + `combat-vectors.json` and **rewrote `combat.rs` to the new model** so the
port ships the NEW arena, not the old one. `00-1/brickmap` `75051b8`.
- **New combatant** `{pow,grd,spd,foc,hp,type}`. Heroes: the four stats verbatim + flat `hp=HP_FLAT(120)`
  (so `hero_combatant` is a direct map now, not the old atk/hp formula). Foes: `{pow,hp}` from the
  budget curve, `grd=foc=0`.
- **Stat roles:** PWR `round(pow·mu)` typed dmg · FOC `round(foc·FOC_FLAT)` flat floor · GRD per-hit
  mitigation `round(grd·MIT)` (min 1 through) · SPD a one-time **opening strike**
  `round(spd·SPD_ALPHA·mu)` for any hero that outspeeds its target, before the rounds. Per-hit dmg
  `= max(1, round(pow·mu)+round(foc·FOC_FLAT) − round(tgt.grd·MIT))`. Constants `HP_FLAT 120, MIT 0.6,
  FOC_FLAT 1.2, SPD_ALPHA 0.5` from `constants.combat`. Removed `def`/1v1.
- **Re-proven vs ALL the regenerated vectors:** 240 headline `teamBattle` (these exercise the opening
  strikes + new damage across empty/drillAll/full), 36 `effectiveStats`, 5 `heroCombatant`
  `{pow,grd,spd,foc,hp}`, the turn-by-turn log fixture, ladder completeness. `effective_stats`,
  `next_tier`, `foe_kinds`, loot + `Save::resolve_arena` are model-agnostic and unchanged (the
  resolve-arena win test still holds).
- goblin-gold **82** lib tests; clippy `-D warnings` clean native + aarch64-linux-android; fmt clean.
  Pushed to `main` + the feature branch.
- **▶ NEXT:** the Arena **screen** to the VISUAL-PARITY bar (per `VISUAL-PARITY.md` + the
  `arena-web.png` ref + the render→compare→golden loop). Portraits wait on the Babysitter's `drawIcon`
  pixel-grid export; I'll build the structure/type-colours/ratings I can now and slot portraits when
  that lands. Then T233c event-play.

---

## BRICKMAP-GG1 FULL PORT — phase 5 PARITY: Arena backend (grant + tier progression) ([B], GO) · WIP-checkpoint

Clean **checkpoint** between the vector-proven combat core and the Arena screen (paused mid-feature;
resume = build the screen UI). `00-1/brickmap` `19204e3`. The backend wiring around the proven sim:
- **`combat::next_tier`** (next tier = 1 past the highest cleared `tier:n`, capped at the ladder top)
  + **`combat::foe_kinds`** (the tier's enemy types, for the screen's header).
- **`Save::resolve_arena(party, ts) -> ArenaOutcome`** — fights the next tier via the proven
  `team_battle`; on a win grants `tier:<n>` + the tier's loot into the keystone and accrues the
  `tierGold` payoff (region-clear flag when a boss falls); on a loss nothing changes. Gold mult reuses
  `award_round`'s policy (items+mastered); heroes/tiers/bosses contributions are a **documented
  simplification pending the hero-unlock export** (see the flag below).
- Tested: a maxed party clears tier 1 → `tier:1` + loot marked, gold accrues, next tier advances to 2.
  goblin-gold **82** lib tests; clippy `-D warnings` clean native + aarch64-linux-android; fmt clean.
  Pushed to `main` + the feature branch (main stays green — these are unused-until-the-screen additions).
- **⚠️ Open flag (unchanged):** hero unlocks are prose hints only in the export (no machine-readable
  predicate) → the screen will field **all 12 roster heroes (documented interim)**; needs a structured
  `unlock` export for the real gate.
- **▶ RESUME HERE:** build the Arena **screen** — evolve the "Heroes" roster drill-down (its subtitle
  is already "the Arena roster") into the interactive Arena: tier header, tappable hero rows (party-pick
  ≤3, showing effective stats), a Fight button → `resolve_arena`, a result banner, golden-gated. Then
  T233c **event-play** (exports already synced to the data seam).

---

## BRICKMAP-GG1 FULL PORT — phase 5 PARITY: Arena combat resolution, vector-proven ([B], GO)

Owner overruled the defer — brickmap-v1 must ship web-GG1's Arena + event-play. Starting with the
**Arena**: the vector-proven combat-resolution **logic core** (`crates/goblin-gold/src/combat.rs`),
re-impl'd from `main.js finishBattle ← Enemies.teamBattle`. `00-1/brickmap` `196215e`. (The Arena
*screen* + on-win grant is the next push — gate-the-sim-on-vectors / gate-the-screen-on-golden split.)
- Synced the new exports `combat.json` (120-tier ladder + per-tier enemy combatants [full f64] + loot
  + loot-boosts + constants) + `combat-vectors.json` into the brickmap data seam. Used the DATA
  ladder/enemyTeams as-is — did NOT re-derive `FOE_BUDGET`.
- **`effective_stats(hero, collected)`** = base + Σ catalogue boosts (the existing `arena::hero_stats`
  bridge) + Σ combat loot-boosts for owned `loot:*` ids. Decoded the composition from the numbers
  (bram `full` guard 561 = base 12 + 415 catalogue + 134 loot; loot ids aren't in the catalogue → no
  double-count) and proved it for **all 36** effectiveStats vectors (empty / drillAll=all-catalogue /
  full=all-catalogue+all-loot — all constructible).
- **`hero_combatant`** (`atk=power+0.8·focus`, `hp=HB+guard·HG+power·HPP`, `spd=speed`) proven vs the
  5 vectors. **Matchup** triangle Brawn▸Cunning▸Arcane▸Brawn — the cycle *direction* isn't a constant
  in the export, but reproducing the turn-by-turn `teamBattleLog` pins it exactly.
- **`simulate`** — ords party 0..2 / foes 100..102; turn order spd-desc, ord-asc (fixed); each round
  every living actor picks a target by **max matchup → lowest hp → lowest ord**, deals
  `max(1, round(atk·matchup))` (JS round-half-up); ends when a side is empty (4000-round guard).
  **`team_battle`** wires effective-stats→combatant→`enemyTeams[tier]`→simulate.
- **Proven vs ALL combat-vectors:** the **240** headline `teamBattle` {win,heroesAlive,foesAlive,rounds}
  + the full `teamBattleLog` fixture + ladder completeness (120 tiers each have a team). goblin-gold
  **81** lib tests (76 + 5 combat) green; clippy `-D warnings` clean native + aarch64-linux-android;
  fmt clean. Pushed to `main` + the feature branch.
- **Next:** the Arena SCREEN (party-pick ≤3 owned heroes → battle → on win grant `tier:n`+loot +
  `tierGold` payoff + region-clear), golden-gated; then T233c event-play.

---

## BRICKMAP-GG1 FULL PORT — phase 5 (polish): screen audit + export-gap scope decision ([B], GO)

Two phase-5 items the directive delegated: audit the remaining screens for "rough" layout, and
**decide whether the two open exports (T233b-combat, T233c) are needed for v1-on-brickmap.**

**Screen audit (all fixed-layout screens, for the topic-select overflow class of bug).** Checked
every screen's row math against the band above the bottom button (`0.915h`):
- **Topic-select** — was broken (hid ~38/46 topics); FIXED last cycle (adaptive multi-column grid).
- **Collector Ladder** — 12 tiers × `(0.055+0.008)h` from `0.155h` ends at ~`0.903h`: fits (its golden
  proves all 12 visible). No change.
- **Collection** (6 rows), **Results** (5 rows) — fixed small counts, fit comfortably. No change.
- **Heroes / Events / Items** — already use the adaptive `list_screen` (shrinks row height + steps the
  font down), so they can't overflow regardless of count. No change.
- **Transitions** are instant screen swaps — standard + fine for a casual drill; a fade is aesthetic
  and not golden-gatable → **banked as an optional OWNER-EYEBALL item**, not built blind.
⇒ topic-select was the only genuinely-broken screen; the rest are sound.

**DECISION — DEFER both T233b-combat and T233c for v1-on-brickmap.** (Owner-delegated call; logged,
not blocking.)
- **Rationale:** v1-on-brickmap's job is to **prove the re-platform** — GG1's full drill→earn→metagame
  loop running native on brickmap's presentation services. That loop is complete + gated (vector-proven
  earning/gold, byte-exact music score, 76 lib tests, 8 GPU goldens, audio wired). The Arena and Events
  screens already exist as the **surfaces they were specced as**: Heroes = the catalogue→stat-boost
  bridge (roster + effective stats); Events = the 14-event rotation with earned/locked status. Both
  already exercise every brickmap path (list render, save-derived state, hit-test).
- T233b-combat (interactive battle resolve) and T233c (richer event content/schedule) would add **new
  interactive systems** (a battle loop; event-detail content) that prove **nothing new** about the
  re-platform (no new engine seam), need two un-done exports + new gated screens (real scope/risk), and
  are feature expansions better suited to **GG2-on-brickmap** (brickmap-native from the start).
- **So:** v1-on-brickmap ships the proven loop + the existing metagame surfaces as-is. T233b-combat /
  T233c stay **open as POST-v1**. **Trigger to revisit:** an explicit owner/Babysitter call that
  v1-on-brickmap must include interactive combat or richer event content.

⇒ With topic-select fixed and the export gaps resolved (deferred), the brickmap port has **no open
functional/polish work** I can self-verify. Remaining is the OWNER-EYEBALL set (on-device feel, audio
A/B, immersive confirm, optional transition fades). **The port is functionally + polish complete pending
the owner's device pass.**

---

## BRICKMAP-GG1 FULL PORT — phase 5 (polish): topic-select grid fits ALL 46 topics ([B], GO)

First phase-5 polish pass — a real "rough screen" bug. The topic-select list used a **fixed row
height** (`h*0.075`) from `top=0.17h`, so only ~8 rows fit before the Collection button at `0.915h`.
A progressed player who unlocked more than ~8 topics had the rest run **off the bottom and out of
reach** — up to **38 of 46 topics unreachable** at full completion. `00-1/brickmap` `c64b23a`.
- Replaced the fixed layout with an **adaptive multi-column grid** (`topic_rows`): 1 column while it
  fits comfortably (≤12 topics — early/mid game keeps the exact old look), else 2 columns, with the
  row height shrunk to the band so the **whole grid is always on-screen**. The label face steps down
  (`q`→`body`→`tiny`) as rows densify so a full 2-column grid still reads. Renderer + hit-test
  (`topic_at`) share `topic_rows`, so no topic can be stranded out of reach.
- **Gated hard, not just visually:** two pure tests — every row of a fully-unlocked grid is on-screen
  + within margins, and **every topic is tappable at its row centre** (reachability) — plus a
  single-column-unchanged test. New `topic-select-full` golden (all 46) self-consistent + GPU-matched
  under lavapipe; the initial `topic-select.png` is **byte-identical** (single-row case untouched).
- goblin-gold **76** lib tests (73 + 3 layout), **8** GPU goldens green under lavapipe; clippy
  `-D warnings` clean native + aarch64-linux-android; fmt clean. Pushed to `main` + the feature branch.
- **OWNER EYEBALL ON RETURN:** at full unlock the 46-row 2-column grid has small rows (worst case) —
  legible + tappable (gated), but if it feels cramped on device the next step is a **scrollable** list
  (deferred: it's an input-plumbing feature, not a polish tweak — flag if you want it for v1).

---

## BRICKMAP-GG1 FULL PORT — phase 4 (audio): PLAYBACK WIRING — SFX + music now sound ([B], GO)

Wired the re-authored audio into the live app so it's actually **audible**: a cpal output stream
(`crates/goblin-gold/src/audio.rs`) — desktop + Android's AAudio backend, the same path
`scraped-again`'s drone uses. This was the last remaining phase-4 piece; I'd been holding it as
"device-side", but it's the same posture as the immersive fix (built blind → owner confirms), so I
shipped it rather than leave it parked.
- **Split so the testable half is testable.** A pure `Mixer` core (one looping music bed + capped
  one-shot SFX voices, summed to mono, fanned to the output channels) — its loop-wrap, voice-retire,
  empty-buffer, voice-cap and clamp logic are **unit-tested without a sound card** (7 new tests).
  Around it, the cpal `Player`: opens the default device, runs the `Mixer` in the audio callback,
  takes UI→audio commands over a tiny mutex-guarded queue. Device-less machine → `start()` returns
  `None` and the game runs silent (never crashes).
- **Gameplay seams wired:** `RoundStart` on a new drill, the combo-pitched `Correct` chime per solve
  (combo = trailing-solve streak, resets on skip), `Skip`, `RoundComplete` at the end. SFX rendered
  off the audio thread at the stream's sample rate.
- **Music bed per screen, using GG1's own scene names** — the `menu` bed under the UI/drill, the
  `arena` bed on the hero roster. Beds are bar-aligned (loop seam on a downbeat) and cached, so
  returning to a screen doesn't re-synthesise. (Beyond the literal `menu`/`arena` names the
  drill→`menu` default is a conservative creative call — the export carries no screen→scene map; GG1's
  in-play music is style-pickable. Logged, not blocking.)
- Gates: goblin-gold **73** lib tests green (66 + 7 mixer tests); all **7** GPU goldens pass under
  lavapipe (no visual regression); clippy `-D warnings` clean **native + aarch64-linux-android** (cpal
  cross-compiles for Android); fmt clean. `00-1/brickmap` pushed to `main` + the feature branch.
- **OWNER EYEBALL ON RETURN:** the SFX + music now play on device — A/B the *feel* vs web GG (do the
  blips land on the right beats? is the menu/arena bed pleasant under play, at the right level?). The
  `music_proto`/`sfx_proto` WAVs remain the offline reference. **Phase 4 audio is COMPLETE** (synthesis
  faithful + now audible). → **phase 5 polish.**

---

## BRICKMAP-GG1 FULL PORT — phase 4 (audio): faithful patch synthesis ([B], GO)

Upgraded the music renderer from generic role voices to GG1's **actual instrument patches**
(re-authored from `synth.js`'s `PATCHES` + `renderVoice`). `00-1/brickmap` `6959aa0`.
- Each scene's `patches.{pad,bass,lead}` now drives the right instrument: engines **unison** (detuned
  voices), **FM** (carrier+modulator), **sub**, **mono**; a **state-variable filter** (lowpass/
  bandpass + resonance Q) with the documented cutoff envelope; and the **wub LFO** sweeping the
  cutoff. So `padglass`/`padep`/`padpwm`/`padorgan`, FM `bell`, `croon`/`chip`/`lead`, `bass`, and the
  `wub` render as their real timbres per scene.
- Faithful-by-construction (the patch params are documented — not a guess); the SVF approximates Web
  Audio's biquad (not byte-identical, which is fine — audio parity is by-ear). SVF cutoff capped to
  its stable band + a finite-guard so a bright filter envelope can't diverge.
- Mechanically gated (determinism, no clipping, mute=silence, distinct); goblin-gold **66** lib tests
  green; clippy -D warnings clean native + aarch64-linux-android. Pushed to `main` + the feature
  branch. The `music_proto`/`sfx_proto` WAVs now carry the real patches for the owner's A/B.
- **Phase-4 audio — the synthesis is as faithful as it gets offline.** ✅ SFX · ✅ music score
  (vector-proven) · ✅ renderer with GG1's real patches. **Only remaining:** **playback wiring**
  (native cpal / Web Audio streaming in the live app) — device-side & built-blind (like immersive),
  so it wants on-device confirmation. → phase 5 polish.

---

## BRICKMAP-GG1 FULL PORT — phase 4 (audio): the music RENDERER (score → audible) ([B], GO)

Made the generative music **audible** — the note schedule stays the vector-proven `synth::score`;
this is the perceptual synthesis half. `00-1/brickmap` `a961632`.
- Refactored `synth.rs`'s `stepEvents` into structured `Voiced{role,midi,piece}` (score tokens now
  derive from it — **the 12 goldens still pass unchanged**), exposing `voiced_score` + `tempo_of`.
- **`music.rs`**: `render(scene, sr, seconds, volume)` → a mono buffer. A **first cut** — each lane is
  a clean osc + ADSR + one-pole tone-shaping (pad held over the bar, plucky saw bass, short square
  lead, procedural-noise drums) over the scene's 16th-note grid; `volume 0 ⇒ silence`. Recognisably
  the right tune/groove/key; GG1's exact patch timbres (FM/unison/biquad-resonance/the wub LFO) are
  the **refinement pass** once the owner's ear calibrates it.
- Gated mechanically (determinism, no clipping, mute=silence, unknown=empty, scenes distinct).
  goblin-gold **66** lib tests green; clippy -D warnings clean native + aarch64-linux-android.
- **👂 OWNER BY-EAR:** `cargo run -p goblin-gold --bin music_proto -- <dir> [secs]` writes a WAV per
  scene (`gg-music-*.wav`); `sfx_proto` does the SFX. A/B vs web-GG and flag timbres to refine.
  (Babysitter: please fold into `OWNER-EYEBALL.md`.)
- **Phase-4 audio now end-to-end audible:** ✅ SFX · ✅ music score (vector-proven) · ✅ music renderer
  (first cut). **Remaining:** timbre fidelity (port the patch FM/unison/filter/LFO) + **playback
  wiring** (native cpal / Web Audio) so it sounds in the live app. → phase 5 polish.

---

## BRICKMAP-GG1 FULL PORT — phase 4 (audio): the generative-music SCORE generator ([B], GO)

The music half of phase 4 — and unlike the SFX it's **vector-provable**: each scene's per-step note
schedule is a golden contract. `00-1/brickmap` `92459ce`.
- **`synth.rs`** re-implements `synth.js`'s deterministic **score generator** and **reproduces all 12
  scene goldens byte-for-byte** (`synth_score_*.json`): the exact `mulberry32` PRNG (u32 wrapping
  arithmetic), `hashStr`/`phraseSeed` seeding, modal harmony with voice-leading (8 modes, diatonic
  triads, nearest-tone motion), Euclidean drum grooves, and the density-gated lead walk. `score(style,
  steps)` → the `p:`/`b:`/`l:`/`d:` token lists; reseeds per phrase, melodic state persists. The 12
  CONTEXTS' score-relevant fields are ported (tempo/reverb/swing/patch-names don't affect the
  schedule).
- Synced the 12 score goldens as fixtures (from `gg1/dev/test/golden/`); the test matches each
  exactly + asserts determinism and mutual distinctness (the "samey" guard). goblin-gold **63** lib
  tests green; clippy -D warnings clean native + aarch64-linux-android. Pushed to `main` + the feature
  branch.
- **Phase-4 audio status:** ✅ SFX (perceptual, owner by-ear via `sfx_proto` WAVs) · ✅ music **score**
  (vector-proven). **Remaining:** **token synthesis** (patches → audio buffers — perceptual, by-ear)
  and **playback wiring** (native cpal / Web Audio) so it actually sounds on device. → phase 5 polish.

---

## BRICKMAP-GG1 FULL PORT — phase 4 (audio): re-author the SFX in Rust ([B], GO)

Core port approved & functionally complete → **phase 4 audio**. Started with the **SFX** (the
perceptually-central drill feedback), re-authored from `gg1/dev/sound.js`. `00-1/brickmap` `0fb1c93`.
- **`sfx.rs`**: the 9 events — `correct` (pitch rises with the combo streak, +1 octave cap), `skip`,
  `item` (rarity scales note count + pitch), `gold`(±big), `topicUnlock`, `mastery`, `topic100`,
  `roundStart`, `roundComplete` — as oscillator voices (square/saw/triangle) with the exact 8ms-attack
  → exp-decay envelope and the 0.16 SFX-bus gain, brick-wall clamped. `render(sfx, sr, volume)` → a
  mono `f32` buffer; `volume 0 ⇒ silence` (the mute/sound-off pref path). Same DSP style as
  scraped-again's `Drone` (pure sample-gen; playback is a separate hook).
- **Gating:** audio parity is **perceptual, not vector-provable** (no web-rendered reference to diff),
  so tests cover the mechanics — determinism, no clipping, correct length, mute=silence, distinct
  events render distinctly, combo raises pitch, rarity scales the jingle. **5 new tests** (goblin-gold
  **60** lib tests green); clippy -D warnings clean native + aarch64-linux-android.
- **👂 OWNER BY-EAR (for `OWNER-EYEBALL.md`):** `cargo run -p goblin-gold --bin sfx_proto -- <dir>`
  writes a WAV per effect (`gg-sfx-*.wav`) — **A/B each against web-GG's blip** (correct/skip/item/
  gold/unlock/mastery/topic100/round-start/complete) and flag any that feel off. (Babysitter: please
  fold this into `OWNER-EYEBALL.md` — I don't push `claude/agent`.)
- **Next (phase 4 cont.):** the generative **MUSIC** scenes (`synth.js`'s 10 tracks — ambient/arena/
  chiptune/dnb/dubstep/lofi/menu/…), then **playback wiring** (native cpal / Web Audio) so the SFX +
  music actually sound on device, then **phase 5 polish**. Export gaps open: T233b-combat, T233c.

---

## BRICKMAP-GG1 FULL PORT — phase 3: close owner-found gaps — P0a/P1s ([B], GO)

The remaining owner-found gaps, all closed (P0s — results + watermark — already APPROVED).

**P0a — round-gold combo parity FIX** (`915cac4`): the Babysitter caught a bug in my gold payout —
`round_gold` composed post-hoc with `combo = i+1`, but in `main.js` combo **resets to 0 on a skip**
and accrues live; skips aren't in the solved-times list, so post-hoc the reset is unrecoverable →
after any mid-run skip the old code **over-paid**. Fixed: accrue gold **live** over the round's
ordered steps. The drill records a `RoundStep` per question (`Solve{prompt,dt}` / `Skip`); `gold::Play`
+ `accrue_round` walk it (combo++ on solve, =0 on skip), **proven vs the new `roundGold` composition
vectors** (re-synced, `main` `7c74439`). `award_round` takes the steps. (qMiss vestigial — every solve
is clean — so gold-on-all-solves is unchanged; only the combo sequencing needed fixing.)

**P1 — immersive fullscreen, the REAL fix** (`c70e80f`): the bars still showed because the
decor-view/`WindowInsetsController` calls must run on the Android **UI thread**, but our resume
handler runs on the android-activity loop thread → `CalledFromWrongThreadException`, swallowed →
silent no-op (exactly the directive's diagnosis). Now marshalled via
`AndroidApp::run_on_java_main_thread`, plus the thread-safe `set_window_flags(FULLSCREEN|LAYOUT_NO_LIMITS)`
and a `layoutInDisplayCutoutMode = SHORT_EDGES` step for the notch. Still fully guarded; built blind →
owner device-confirms.

**P1 — metagame drill-downs** (`2e9898f`): owner said "nothing clickable". Every Collection row now
drills in — Items→Items, Collector→Ladder, Topics→topic-select, Heroes→Heroes, Events→Events — via a
shared `list_screen` helper. New **Heroes** (roster + effective stats, the catalogue→Arena boost
bridge visible), **Events** (14, earned in green) and **Items** (catalogue by category) screens, each
golden-gated.

- goblin-gold **55** lib tests + **7** pure goldens green; **7** GPU goldens pass under lavapipe;
  clippy -D warnings clean native + aarch64-linux-android. All pushed to `main` + the feature branch.
- **All four owner-found gaps now closed.** Open export gaps (flagged, Babysitter-owned):
  **T233b-combat** (Arena battle resolve), **T233c** (events content/thresholds/schedule). → phase 4
  audio · 5 polish. APK/feel + the metagame by-eye → `OWNER-EYEBALL.md`.

---

## BRICKMAP-GG1 FULL PORT — phase 3: close owner-found gaps — P0s (results screen + SHA watermark) ([B], GO)

Owner played the on-device build (2026-06-24) and filed four gaps; working them in priority order.
Both **P0s** done.

**P0 — Build-SHA watermark** (`9249816`): so screenshots are traceable. `build.rs` captures the short
git SHA → `env!("GG_BUILD_SHA")`; `build_tag()` = `v<pkg> · <sha>`; a small low-contrast tiny-font
stamp is drawn top-left on **every** screen via the live `draw()` path — kept OUT of goldens (so they
don't churn per commit) and out of the hit-test.

**P0 — Results screen + the GOLD economy** (`b1d553d`): a round used to jump straight to the topic
list; now it shows a per-run summary, and the T233b gold economy is wired in.
- **`gold.rs`** — the payout formulas re-impl'd from `main.js` (questionGold/roundBonusGold/tierGold/
  goldMult/hoardLevel), **proven vs `gold-vectors.json`** (1e-9 abs; 1e-6 rel for goldMult's integer
  power). `round_gold` composes them (combo rises per clean solve, faithful to `finish()`).
- **`save.rs`** — `award_round` now accrues the round's gold (gold only grows) and returns a
  `RoundOutcome` (rank + new keys + accuracy/time + gold).
- **`app.rs`** — `Screen::Results`: rank (prominent, green), answered/accuracy/time, **gold earned**
  (gold-tinted), new-collectible count, Continue (tap to return). New `results.png` golden.
- goblin-gold **54** lib tests + **6** pure goldens green; **6** GPU goldens pass under lavapipe;
  clippy -D warnings clean native + aarch64-linux-android. Both pushed to `main` + the feature branch.
- **Next (P1s):** immersive still shows the system bars on-device — marshal the JNI calls onto the
  Android **UI thread** (`runOnUiThread`) + set the cutout mode; then the **Heroes/Events/Topics/Items**
  drill-downs (owner: "nothing clickable" — done holding). Export gaps open: **T233b-combat**,
  **T233c** events content.

---

## BRICKMAP-GG1 FULL PORT — phase 3: surface the Collector Ladder (tier detail) ([B], GO)

Deepened the metagame surfacing (the directive names the "collector ladder" specifically). Tapping
the Collection screen's **Collector** row now opens a **Ladder** screen: all 12 collect-N tiers,
those reached in **green** vs locked dimmed, against the owned-item count, with Back.
`00-1/brickmap` `602f2bd`.
- `Screen::Ladder` + `ladder_frame` + `collection_row_at` (row hit-test; the Collection row layout
  is now shared consts so frame + hit-test can't drift). New `ladder.png` golden (pure + lavapipe
  GPU). No change to existing screens (their goldens untouched).
- goblin-gold **50** lib tests + **5** pure goldens green; **5** GPU goldens pass under lavapipe;
  clippy -D warnings clean native + aarch64-linux-android. Pushed to `main` + the feature branch.
- **Surfacing now:** Collection summary (collected/collector/topics/heroes/events/gold) + the
  Collector Ladder drill-down. **Heroes roster** + **events list** drill-downs are the obvious next
  detail screens — holding them for owner eyeball so they match the wanted layout rather than
  guessing. Export gaps still open (flagged): **T233b** combat/gold, **T233c** events content. →
  phase 4 audio · 5 polish.

---

## BRICKMAP-GG1 FULL PORT — phase 3: award Solved/Spark — per-question timing ([B], GO)

Closed the gap in my own wiring: `finish_round` had been passing an empty qmap, so the per-question
**Solved/Spark** collectibles — **1918 of the 2352** catalogue — never dropped in-app. The drill now
times each question; the app records `(prompt, seconds)` on every clean auto-accept (resetting the
per-question clock on solve OR skip), and `Save::award_round` feeds them to the earning, so a clean
solve earns `solve:<mode>:<prompt>` and an under-1.5s one also `spark:…`. The earning integration is
now complete — every collectible category that a drill round can produce actually drops.
`00-1/brickmap` `8daba21`.
- goblin-gold **50** lib tests green (the `award_round` test now asserts solve+spark on a fast clean
  solve); clippy -D warnings clean native + aarch64-linux-android; no render change (goldens intact).
  Pushed to `main` + the feature branch.

---

## BRICKMAP-GG1 FULL PORT — phase 3: INTEGRATE the metagame into the live app ([B], GO)

The integration directive: wire earning into `finish_round` **and** surface the metagame on screen.
`00-1/brickmap` `6763f5a` (wiring) + `be8fa00` (Collection screen).

**Wiring (awards → the save):** `Save::award_round(mode, run, ts)` bumps the games counter, runs
`earning::award` over the finished round (stats — games/modesCleared/flawless — derived from the
`collected` keystone), and marks every awarded key. The live `App` now **owns a `Save` + a
`FileStore`** (the platform data dir — `internal_data_path()` on Android, a temp dir on desktop;
`None` ⇒ runs without persisting, never crashes). `finish_round` awards into the save, rebuilds
progression from it (the save is the single source of truth), records the last topic, and persists
best-effort; the save **loads on startup**, so unlocks/achievements survive a relaunch. (Per-question
solve/spark await per-question timing in the drill — empty qmap for now; everything else lands.)

**Surface (a Collection screen):** a new `Screen::Collection` summarises the save — items collected
vs the 2352-item catalogue, the collector ladder's reached tier (or "next at N"), topics
played/mastered (×46), the hero roster, events touched, and gold. Reached via a "Collection" button
on topic-select; "Back" returns. Data-driven from the save via catalogue/collector/events/arena. New
`collection.png` golden (pure + lavapipe GPU); re-blessed `topic-select.png` for its new button.

- goblin-gold **50** lib tests + **4** pure goldens green; **4** GPU goldens pass under lavapipe;
  clippy -D warnings clean native + aarch64-linux-android. Pushed to `main` + the feature branch.
- **Next:** richer per-section screens (the full collector ladder / hero roster / events list) as
  wanted; per-question timing → solve/spark awards. Export gaps still open (flagged, non-blocking):
  **T233b** combat resolution + gold formulas, **T233c** events content/schedule. → phase 4 audio ·
  5 polish. APK/feel + the metagame by-eye → `OWNER-EYEBALL.md`.

---

## BRICKMAP-GG1 FULL PORT — phase 3: the FULL EARNING, proven vs earning-vectors ([B], GO)

T233 landed `earning.json` + `earning-vectors.json` on halves `main` (`fde819a`), unblocking the
whole award rule (retiring the Speed/Rank "data gap" I'd flagged). Re-synced into goblin-gold and
**ported the full earning, proven against every vector** — same contract as transforms-vs-parity.
`00-1/brickmap` `4347b0b`.
- **`earning.rs`** re-implements the live logic (`gg1/dev/collectibles.js`) with tunables from
  `earning.json`:
  - `rank_index(score,total,time)` — accuracy brackets while imperfect, avg-seconds once perfect;
    reproduces all **732** rankIndex vectors.
  - `award(ctx)` — the per-round evaluator (ranks · init · flawless · speed · mastery · per-question
    solve/spark · games/modes/flawless meta), honouring the ctx invariant
    **`mistakes==skipped==total−answered`** (a *wrong* answer lowers score + marks the question but
    is NOT a skip). Reproduces all **46 modes × 13 scenarios**, reconstructing each scenario's ctx
    exactly as `tools/earning-export.js` does — including a **collation-aware natural sort** for the
    first-prompt (symbols precede digits, matching JS `localeCompare` numeric; this was the one
    initial miss — `cubes` `√36` vs `2³`).
  - `collector/topics/meta/gold/momentum_awards` — the count/threshold evaluators; full families
    reproduced.
- goblin-gold **49** lib tests green (4 new earning proofs); clippy -D warnings clean native +
  aarch64-linux-android. Pushed to `main` + the feature branch.
- **Next (this directive's "Also"):** wire `earning::award` into the app's `finish_round` (awards →
  the save), then surface them. Combat resolution + the gold-formula bodies still await **T233b**.
  → phase 4 audio · 5 polish.

---

## BRICKMAP-GG1 FULL PORT — phase 3 (part 2): daily EVENTS (14-event rotation) ([B], GO)

The last pure-data metagame layer: GG1's daily events, re-impl'd over the `Events` collectibles.
`00-1/brickmap` `d3e727a`. With this the metagame **data layer is complete** (collector · save ·
catalogue · arena · events).
- **`events.rs`**: derives the **14** events (id + prose title from the participation blurb) from the
  `Events` category; `Event::reward_key(tier)` builds the `event:<id>[:well|:ace]` keys for the three
  tiers (participation/well/ace) — verified to be **exactly the 42** Events collectibles (none
  missing, none extra). `scheduled(utc_day)` = the **14-day rotation** (`day mod 14`);
  `touched(collected)` maps earned keys back to events. Reward keys are `collected`-map keys (the
  keystone), so earning = inserting them.
- **Honest scope (data-seam rule):** per-event **content** (topics/transforms, the well/ace
  thresholds) and the cycle's **canonical anchor/order** are JS-only (not exported) → the schedule
  rotates the 14 in a stable catalogue order (structurally faithful, not the canonical phase); reward
  keys + earned-state are fully data-backed. Documented in the module — a known gap, alongside the
  Speed/Rank thresholds and the Arena combat formula.
- goblin-gold **46** lib tests green (4 new); clippy -D warnings clean native + aarch64-linux-android.
  Pushed to `main` + the feature branch.
- **Next (integration):** wire the metagame into the live app — `run_award_keys` → the save in
  `finish_round`, and surface collected/heroes/events on screen. Then phase 4 audio · 5 polish.
  APK/feel + audio-by-ear → `OWNER-EYEBALL.md`. *(Data gaps to unblock when convenient: a thresholds/
  schedule/combat-rules export for Speed/Rank/Events-content/Arena-fight.)*

---

## BRICKMAP-GG1 FULL PORT — phase 3 (part 2): the ARENA (bestiary + roster + boost bridge) ([B], GO)

Re-impl of the Arena's combatants over `balance.json`, and the payoff for all that collecting.
`00-1/brickmap` `acf1386`. **The collecting→fight bridge:** every catalogue item carries a
`boost:{hero,stat,amount}`, so a hero's **effective** stats = base + the boosts of everything the
player has collected.
- **`arena.rs`**: the **bestiary** (120 enemy tiers, ascending `def`, three types — Brawn/Arcane/
  Cunning — a **boss** ending each region of `regionSize`=12 → 10 bosses) and the **roster** (12
  heroes, 4 base stats power/guard/speed/focus, typed 4-per-type), loaded + integrity-checked.
  `hero_stats(id, collected)` folds the earned items' boosts into the targeted hero (using
  `catalogue::earned` + the new `boost` field); `bosses()`/`is_boss(n)` mark region capstones.
- Added a `boost` field to `catalogue::Collectible` (all 2352 carry one; heroes balanced ~196 boosts
  each, stats ~590 each — verified all reference real roster ids).
- **Honest scope (data-seam rule — NOT fabricated):** the actual **combat resolution** (how the four
  stats + the type triangle decide a win, and the gold-formula bodies) lives only in the JS, not the
  export → modelled-not-resolved; the fight math awaits a rules export. Documented in the module.
- goblin-gold **42** lib tests green (5 new); clippy -D warnings clean native + aarch64-linux-android.
  Pushed to `main` + the feature branch.
- **Next:** **events** (14 daily, UTC-day cycle) · wire `run_award_keys` into the app's
  `finish_round` (drop awards into the save). → phase 4 audio · 5 polish. APK/feel + audio-by-ear →
  `OWNER-EYEBALL.md`.

---

## BRICKMAP-GG1 FULL PORT — phase 3 (part 2): the full collectible CATALOGUE (2352) ([B], GO)

Re-impl of GG1's whole reward set over the T230/T232 export (`collectibles.json`). `00-1/brickmap`
`b4d35f8`. **Keystone:** a collectible's **`id` IS its key in the save's `collected` map** — so
"earned" = "id is collected" and awarding = inserting the id (the design that lets progression /
collector / catalogue all derive from one map).
- **`catalogue.rs`** models all 2352 entries across 10 categories and proves the shape vs the
  export's own `categories`/`total` + unique ids (mirrors GG1's `collectibles.test.js`).
- **Earning re-implemented for what the export pins down**, verified vs the catalogue:
  - **Initiation / Flawless / Mastery** as per-run awards (`run_award_keys`): init on ≥half answered,
    flawless on a no-skip finish, mastery via progression's `masterSecs` gate — proven one-per-mode
    across all **46** topics, every produced key a real catalogue id.
  - **gold / momentum milestones** by their numeric thresholds (the entries' `gold`/`momentum`).
  - **Collector** cross-checked against the collect-N ladder (`collector.rs`) + its 3 named specials
    (`beast`/`goblinking`/`voidbeast`).
- **Honest scope (data-seam rule — NOT fabricated):** **Speed** tiers and **Rank** thresholds live
  only in the `desc` prose, and **Solved/Spark/Events** + `meta`/`topics` milestones are awarded by
  gameplay events the export doesn't quantify → **count/structure-verified only**; their earning
  awaits a thresholds export (or the JS). Documented in the module so it's a known gap, not a silent
  one.
- goblin-gold **37** lib tests green (6 new); clippy -D warnings clean native + aarch64-linux-android.
  Pushed to `main` + the feature branch.
- **Next:** wire `run_award_keys` into the app's `finish_round` (drop awards into the save) · **Arena**
  (enemies/heroes vs `balance.json`) · **events** (14 daily, UTC-day cycle). → phase 4 audio · 5
  polish. APK/feel + audio-by-ear → `OWNER-EYEBALL.md`.

---

## BRICKMAP-GG1 FULL PORT — phase 3: 2 OWNER-FOUND on-device PARITY BUGS fixed ([B], 🔴→GREEN)

The two FIX-FIRST bugs the owner found on a real phone (core drill faithfulness). `00-1/brickmap`
`39ecb7c`.

**1. Solver auto-accept (no Enter-to-submit).** GG-web's `press()`→`checkAuto()` auto-accepts the
instant `parseFloat(input)==answer` (checked after *every* keypress); the bottom bar is **SKIP**
(reveals the answer + advances, counts as a skip); input is capped at **5 digits** (decimal
excluded) and a **leading dot becomes `0.`**. Re-authored `drill.rs` to match the live runtime:
- No submit, **no wrong state** — `Mark::{Right,Skipped}`; `press` auto-checks after each digit/dot
  and the action bar skips (revealing the answer). 5-digit guard + `''→'0.'` implemented.
- `app.rs`: the FX fires on the keypress that *solves*; the round ends on `solved+skipped` (not
  `solved` alone); skips fold into progression (`answered = solved`, so initiation needs ≥half
  *answered* and mastery still needs zero skips). Action-bar label → "Skip"; the banner reflects
  auto-check/skip (the "Try again" wrong-state is gone). **`drill-initial` golden re-blessed.**
- The engine keypad widget's `Enter` is now documented as a game-defined **action bar** (the widget
  stays data-free; the game decides submit/skip).

**2. Immersive-sticky fullscreen.** The status + nav bars overlaid the drill. `scraped-again` has no
immersive setup to copy, and cargo-apk packages a bare `NativeActivity` (no Java of ours for a
theme), so a new **`immersive.rs`** reaches the framework over **JNI** from the native side:
`FLAG_FULLSCREEN` + legacy `setSystemUiVisibility(IMMERSIVE_STICKY|…)` + the API-30+
`WindowInsetsController.hide(systemBars())`, re-applied on every `resumed` (the flags clear on focus
loss). Every JNI call is **guarded so a wrong-thread / missing-method / thrown exception can only
no-op (logged), never crash** — built blind (no NDK locally; owner device-judges), so it degrades
gracefully rather than risking another launch crash. Pinned `jni 0.21` (classic `JNIEnv` API)
alongside android-activity's rewritten 0.22.x — they only share the raw VM pointer (via
`ndk-context`), so no entanglement.

Gates: goblin-gold **31** lib tests + pure goldens green; **3** GPU goldens pass under lavapipe;
clippy -D warnings clean on native + aarch64-linux-android. Pushed to `main` + the feature branch.
- **Next:** owner re-checks the two fixes on-device (auto-accept feel + bars hidden) → then resume
  the **metagame** — the rest of the catalogue (init/flawless/speed/mastery + rank/milestone counts
  vs `collectibles.json`), **Arena** (enemies/heroes vs `balance.json`), **events**. → phase 4 audio
  · 5 polish. APK/feel + audio-by-ear → `OWNER-EYEBALL.md`.

---

## BRICKMAP-GG1 FULL PORT — phase 3 (part 2): the SAVE model over the engine Store seam ([B], GO)

The metagame's **keystone**, per `GG1-INVENTORY.md` §5: GG1 keeps *one* central `collected` map
(`{<key>:{ts}}`) and derives everything from it — progression, the collector ladder, event/arena
state. A new feature is a new key prefix, not a schema bump. `00-1/brickmap` `f910988`.
- **`save.rs`** (`Save{collected, gold, last_mode}`) (de)serialising through any
  `bm-platform::save::Store` — `FileStore` on native/Android, `WebStore` on web — so the game never
  sees the platform. `gold` round-trips through the **string-float** shape the live runtime writes
  on disk; a torn blob loads as `default` rather than bricking launch.
- **`Save::progress()`** rebuilds `progression::Progress` from the `init:`/`mastery:` keys via a new
  `Progress::from_collected` bridge — the save is the single source of truth for what's unlocked,
  not a side table. `mark` keeps the *earliest* timestamp (a key is "first collected" once) and
  reports newness.
- goblin-gold **26** tests green (5 new: round-trip, derived progress, mark semantics, gold string
  shape, corrupt-blob tolerance); clippy -D warnings clean native + aarch64-linux-android. Pushed to
  `main` + the feature branch.
- **Next (per NEXT.md, FIX-FIRST):** the 2 owner-found on-device parity bugs — **(1) solver
  auto-accept** (no Enter-to-submit; auto-accept the instant `parseFloat(input)==answer`, bottom key
  = SKIP, 5-digit guard + decimal point) and **(2) immersive-sticky fullscreen** on the goblin-gold
  activity — *then* resume the metagame catalogue (init/flawless/speed/mastery + rank/milestone) ·
  Arena · events.

---

## BRICKMAP-GG1 FULL PORT — phase 3 (part 2): metagame UNBLOCKED — collector ladder ([B], GO)

My earlier "missing data" blocker was a **false alarm** — I'd checked the stale feature-branch
working tree, not `origin/main`. `content/gg1/{guides,collectibles,balance}.json` were on halves
`main` all along (T230 `6b7387b` + T232 `e24ae3c`), `GG1-INVENTORY.md` on `claude/agent`. **Lesson
logged: re-fetch + check `origin/main` before declaring data missing.** `00-1/brickmap` `41ccf81`.
- **Re-synced `content/gg1/`** into goblin-gold `data/gg1/` (added `guides.json`, `collectibles.json`
  — 2352-item catalogue + the collector ladder, `balance.json` — gold + Arena tuning). modes/parity
  unchanged (parity test stays green).
- **Banked the collector ladder** (`collector.rs`), data-driven from `collectibles.json`'s
  `collectorLadder`: `ladder()` / `earned(count)` + GG1's `collector.test.js` invariant as a Rust
  test — **the capstone (2300) must stay strictly below the catalogue total (2352) to be reachable**
  (export's `catalogTotal`/`capstoneReachable` cross-checked). Ascending tiers, valid rarities/ids,
  threshold-gated earning.
- goblin-gold **21** tests green; clippy -D warnings clean on native + aarch64-linux-android. Pushed
  to `main` + the feature branch.
- **Continuing (phase 3 part 2):** the rest of the catalogue (init/flawless/speed/mastery + solved/
  spark + rank/milestone counts vs `collectibles.json`), **Arena** (enemies/heroes vs `balance.json`),
  **events**, **save** via `bm-platform::save` (schema in `GG1-INVENTORY.md`). → phase 4 audio · 5
  polish. APK/feel + audio-by-ear → `OWNER-EYEBALL.md`.

---

## BRICKMAP-GG1 FULL PORT — phase 3 (part 1): all 46 topics + topic-select ([B], GO) · ⚠️ metagame BLOCKED (false alarm — see above)

Phase 2 APPROVED → phase 3. Did the **un-blocked** half; the **metagame** half is **blocked on
missing data** (see below). `00-1/brickmap` commit `14fe684`.
- **Drive all 46 topics:** `Drill::from_topic(id)` generates a topic's questions from its pool via
  the phase-2 transforms (the data-driven path); a test drives **all 46** — every topic yields
  questions and every generated answer is accepted.
- **Generic question UI:** `drill_frame` now shows the transform prompt verbatim (`100`, `3 × 7`,
  `area 10×7`) under the topic-name heading — the halves-only "Half of …" framing is gone.
  `drill-initial` golden re-blessed.
- **Topic-select screen (new):** heading + unlocked-count + a row per **unlocked** topic (mastered
  green, else gold), tap-routed; `app.rs` is now a two-screen runtime (Select ⇄ Drill) — tapping a
  topic starts a round, completing it folds into `progression` (initiation + mastery by round time)
  and newly-unlocked topics appear back on Select. New `topic-select.png` golden + pure & lavapipe
  GPU tests.
- Gates: goblin-gold **18** tests + **3** GPU goldens (lavapipe) green; clippy -D warnings clean on
  native + aarch64-linux-android; workspace fmt clean. Pushed to `main` + the feature branch.

### ⚠️ BLOCKER for the metagame (Babysitter, please route to Builder A / T230)
The phase-3 metagame — **collector ladder, arena (enemies+heroes), daily events** — must consume
the **T230/T232 exports** + a spec that **do not exist yet**: `content/gg1/` currently holds only
`modes.json` + `parity-vectors.json` (+ `transforms.md`). **Missing:** `collectibles.json`,
`balance.json`, `guides.json`, and **`docs/agent/GG1-INVENTORY.md`**. I will NOT fabricate that
data (it would diverge from the canonical export and break the one-way data seam). **Unblock by
running T230 (content export part 2) + writing `GG1-INVENTORY.md`**, then I'll sync + build the
metagame data-driven (same as transforms/progression) and gate it on tests/goldens.
- **Next when unblocked:** collector ladder (`collectibles.json` → the per-mode init/flawless/speed/
  mastery + collector/topic ladders, re-impl from `collectibles.js` behaviour vs the export) ·
  arena/heroes (`balance.json`) · events · save schema via `bm-platform::save`. → phase 4 audio · 5
  polish. APK installs/feel + audio-by-ear → `OWNER-EYEBALL.md`.

---

## BRICKMAP-GG1 FULL PORT — phase 2: GG1 logic in Rust vs the parity vectors ([B], GO)

Phase 1 APPROVED → phase 2: re-implement the GG1 game **logic** in Rust, proven against the T229
data (share DATA not code — the JS is never run). `00-1/brickmap` commit `f7e6ea3`.
- **`transforms.rs` — all 46 topic transforms** (`datum→{p,a}`), re-authored from the behaviour.
  **THE GATE** (`every_mode_reproduces_its_parity_vectors`): for every mode, the `{p,a}` set our
  Rust transform produces from the `pool` equals `parity-vectors.json` **exactly** — same count,
  every vector matched (prompt byte-identical, answer within 1e-9), no extras. **All 46 pass.**
  `generate(id)` yields a topic's questions; number→string mirrors JS `String(n)` so prompts match.
- **`progression.rs` — unlock-chain + mastery.** Initiation ("played") = answered ≥ ⌈total·0.5⌉
  (the spine `unlock:{by:X}` trigger); Mastery = **no skips AND totalTime ≤ masterSecs·total** (the
  off-spine `unlock:{mastery:X}` trigger); `is_unlocked` = played | gate | always-open root. Tests:
  graph loads all 46 with valid targets, **spine-gates-on-play vs offspine-gates-on-mastery**, the
  init/mastery thresholds, and **the whole graph is satisfiable** (no deadlock — every topic
  reachable + masterable from halves).
- Pure logic (serde_json only, no engine dep). goblin-gold **17** tests green; clippy -D warnings
  clean on native + aarch64-linux-android. Pushed to `main` + the feature branch.
- **Next:** phase 3 content (T230 guides/collectibles + `GG1-INVENTORY.md`) · 4 audio re-author ·
  5 polish; the metagame (collector ladder / arena / events) + wiring the drill to all 46 topics
  via `generate()`/progression are the phase-3+ sub-phases. APK installs + audio-by-ear →
  OWNER-EYEBALL.

---

## BRICKMAP-GG1 FULL PORT — phase 1: bank the engine services ([B], GO — autonomy grant)

Gate #4 declared PASS (code+golden, no device — the crash fix landed `ba383ae` AND the initial-frame
golden verifies the crashing path headlessly) → brickmap GO. Per the autonomy grant I proceeded
(ungated) to the **full port, phase 1: bank the spike's proven UI/text/save into the engine crates**
so they're reusable engine services (the research's "these sink into bm-render later").
- **`bm-render::text2d`** (`8d8f1da`): the legible **2-D prose** service — bake a TTF face to an AA
  coverage atlas + word-wrap (the #1 dependency). bm-render gains `ab_glyph`; the font FACE stays
  game content (goblin-gold::text is now a re-export keeping the bake/layout tests by its asset).
- **`bm-render::ui2d`** (`a3c6876`): the on-screen **2-D UI surface** contract — `RectRun`/`TextRun`
  primitives, the shared quad `UI_SHADER`, and the data-free **keypad** widget (moved with its
  tests). The headless golden painter + the app's surface renderer both build from these →
  pixel-identical UI. **BOTH GPU goldens (fx-correct, drill-initial) still match under lavapipe** —
  the bank is behavior-preserving.
- **`bm-platform::save`** (`010e631`): a durable key→bytes `Store` trait — `FileStore`
  (native/Android, atomic write+rename, path-traversal-safe keys) + `WebStore` (`localStorage`, hex).
- goblin-gold is now a thin consumer of the engine services. Gates: bm-render **28** tests /
  goblin-gold **11** / bm-platform **5** green; workspace `clippy -D warnings` + `fmt` clean on
  native, `save` clean on wasm32 too, goblin-gold clean on aarch64-linux-android; `scraped-again`
  (the other bm-render consumer) unaffected. Pushed to `main` + the feature branch.
- **Next:** phase 2 (re-impl GG1 topic logic in Rust vs the T229 parity vectors), phase 3 (content
  via T229/T230), phase 4 (audio re-author), phase 5 (polish) — each gated on tests/goldens; APK
  installs + audio-by-ear → the owner-eyeball-on-return list, don't block.

---

## BRICKMAP-GG1 spike — mini-gate #4: on-device LAUNCH CRASH fixed (empty vertex buffer) ([B], 🔴→GREEN)

The APK force-closed on launch (Adreno 735, Android 16). Two cycles:
1. **Made the cause visible** (`0b3174a`): Android's default Rust panic handler writes to **stderr**,
   which `adb logcat` doesn't capture — so the `panic→abort` had no cause. Added a
   `std::panic::set_hook` that `log::error!`s the payload+location via the wired `android_logger`,
   plus surface-cap fallbacks. Owner's `adb logcat` then named it.
2. **Root cause + fix** (`ba383ae`): the live render built a **vertex buffer per text run** via
   `create_buffer_init`, which panics **"buffer slices can not be empty"** when a run has **zero
   quads**. On the drill's **first frame the answer box is empty** → empty buffer → abort. Never
   caught because the headless bins only rendered non-empty states; **the live `app.rs` path was
   unexercised until the device** — exactly what gate #4 exists to catch.
   - **Guard the whole class:** skip empty text runs before `create_buffer_init` in BOTH the live
     `Gfx::render` AND `headless::build_drawables` (rects were already guarded; the FX sparks are
     rects, so there's no separate particle buffer — audited per the directive).
   - **Share the render:** `app.rs` now builds the frame from the **same** `headless`
     `RectRun`/`TextRun` via a new `drill_frame(...)` builder used by **both** the device renderer
     and a headless golden — so the exact on-device first frame is the one self-verified offscreen.
   - **Regression lock:** new golden `drill-initial.png` (empty answer box, no FX) + a `#[ignore]`
     GPU test that **re-renders the crash state under lavapipe** (proves no panic + matches golden),
     plus a pure CI test. Native + `aarch64-linux-android` clippy -D warnings clean; fmt + 16 pure
     tests green; both GPU goldens pass under lavapipe.
- Rebuild triggered on the `main` push → new `goblin-gold-<sha>-android-arm64.apk` on the `dev`
  prerelease / Android-APK run. **Owner re-installs `dev.brickmap.goblingold` + device-judges.** ✅
  #1/#2/#3 stand. **HOLD for the owner re-test → go/no-go.**

---

## BRICKMAP-GG1 spike — mini-gate #4: native APK (drill + keypad + FX, fullscreen) ([B], GO — FINAL gate)

Babysitter gated #3→#4 (GO). Built the **final** mini-gate in `00-1/brickmap:crates/goblin-gold`
(commit `14a9aa8`, pushed to `main` + the feature branch): a **windowed runtime** that boots the
**drill + keypad + correct-answer FX FULLSCREEN** through a real wgpu **surface**, packaged by
`cargo-apk` into a **native Android APK** (no voxel world) — proving the re-platform runs
**on-device**, not just headless.
- **`app.rs`:** a winit `ApplicationHandler` + wgpu **surface** runtime. Each frame renders the
  live drill screen (heading/progress, the framed question from the **T229 seam**, the answer box
  with the typed value + verdict colour, the keypad, the banner); **touch** (Android) / left-click
  (desktop) hit-tests the **data-free `Keypad`** and drives the `Drill`. A correct answer fires the
  **engine-native FX**: an **animated gold spark burst** (`bm-render::particles`) under the engine
  **palette-dither bloom** (`bm-render::palette` `PalettePass`) — the **same recipes #3's golden
  self-verifies**, now on a live surface. Desktop `run()` + Android `android_main` entry points.
- **`Cargo.toml`:** `cdylib` (what cargo-apk packages) + winit/android-native-activity +
  android_logger; **`[package.metadata.android]` package id `dev.brickmap.goblingold`** — **DISTINCT**
  from the `scraped-again` engine demo AND the halves Capacitor `.exp` (three separate apps, install
  side by side). Signed with the committed `release.keystore`.
- **`.github/workflows/android.yml`:** now a **matrix** over `{scraped-again, goblin-gold}` — each
  builds its own signed arm64 APK, uploads a **workflow artifact**, and publishes to the rolling
  **`dev` prerelease** (pruning only its own prefix, so the two coexist). *(This is how scraped-again
  ships — "built blind in CI, the human installs + verifies on a phone".)*
- **Local verification (no NDK here, so the APK binary is CI-built):** native **and**
  `aarch64-linux-android` `cargo check` + `clippy -D warnings` both clean; `fmt` + tests green; #3's
  GPU golden still passes under lavapipe. **CI Android build triggered on the `main` push** → the
  signed `goblin-gold-<sha>-android-arm64.apk` lands as the run artifact + on the `dev` release.
- **Deliverable for the owner:** install **`dev.brickmap.goblingold`** from the `dev` prerelease /
  the Android-APK workflow run, and **device-judge** the drill + keypad + FX fullscreen. **This is
  the FINAL spike gate → the full go/no-go decision (owner + Babysitter).** No engine/voxel code
  touched. **HOLD for the go/no-go.**

---

## BRICKMAP-GG1 spike — mini-gate #3: engine-native correct-answer FX + golden-PNG diff ([B], GO)

Babysitter gated #2→#3 (GO). Built the third mini-gate in `00-1/brickmap:crates/goblin-gold`
(commit `f0c6879`, pushed to `main` + the feature branch): a **correct-answer FX flourish** built
on brickmap's **OWN render recipes — NOT a port of the web `fxgl.js`** — and **asserted by a
headless golden-PNG diff that is itself proven to catch a regression**.
- **The flourish (`fx.rs`):** a **gold spark burst** from the engine's CPU
  `bm-render::particles::ParticleSystem` (its gravity/lifetime/fade), composited over the answer,
  then the whole frame recoloured by the engine's **palette-dither post**
  `bm-render::palette::PalettePass` — Bayer-4×4 luminance map over a curated gold ramp. On a
  correct answer the screen blooms into dithered gold with a shower of bright flecks (the
  engine-native "expose the tech" look). **Deterministic** (fixed seed + fixed sim slice) so it
  renders pixel-stably.
- **Golden-diff (`headless.rs`, renamed from `render.rs`):** the `Painter` gains `paint_palettized`
  (scene → the engine palette pass → sRGB target → readback RGBA) + a **pure-CPU golden layer**
  (`rgba_from_png`/`diff`/`matches`) so the *comparator runs in CI without a GPU*.
- **Test the test (`tests/golden.rs`):** (1) **pure / CI-safe** — loads the committed golden and
  proves the comparator catches an injected tint (teeth, no GPU); (2) **`#[ignore]` GPU (lavapipe)**
  — re-renders the FX moment, asserts it **matches** the golden, AND asserts the **two injected
  regressions** (burst suppressed / palette collapsed to one tone) **FAIL** the match. Both pass.
- **Evidence:** `fx_proto` renders the FX moment + the two regression frames; `GG_BLESS=1`
  (re)writes the committed golden (`tests/goldens/fx-correct.png`, ~12 KB; full-frame dither but the
  periodic Bayer compresses well). FX screenshot delivered to the owner.
- CI-parity green: `fmt` + `clippy -D warnings` (**workspace-wide**) + tests (14 pure pass; GPU
  golden passes under lavapipe). No engine/voxel code touched — `bm-render` consumed as a
  dependency, not modified. The `Painter` + palette/particle usage is the reusable engine-candidate
  UI/FX surface.
- **HOLD for the Babysitter to gate → #4 clean APK (the final spike gate — owner device-judges).**
  *(Heads-up for #4: halves `main` carries the `T231` Capacitor scaffold — relevant to reconciling
  the APK path.)*

---

## BRICKMAP-GG1 spike — mini-gate #2: keypad + one drill over the T229 DATA SEAM ([B], GO)

Babysitter gated #1→#2 (GO). Built the second mini-gate in `00-1/brickmap:crates/goblin-gold`
(commit `227c5e8`, pushed to `main` + the feature branch): an **on-screen numeric keypad** plus a
**single-topic drill loop**, with the questions **consumed from T229's content data seam**
(`data/gg1/{modes.json,parity-vectors.json}`, one-way synced) — so the cross-repo **DATA seam is
proven end to end** (research §"share DATA, not code").
- **Drill (`drill.rs`):** `Drill::from_seam(mode)` reads the mode **name/tag from `modes.json`** and
  the **`{p,a}` questions from `parity-vectors.json`**. The JS `transform` is **never executed** —
  the parity vectors ARE the correctness contract. `press`/`submit` mark **right/wrong**; a correct
  answer advances. **The seam IS the test:** a unit test types **every** halves vector's expected
  answer (incl. `.5` decimals) and asserts each is accepted (27/27), plus a wrong answer is marked
  Wrong + doesn't advance, and a *second* topic (`times`, with `×` prompts) loads — proving it's
  data-driven, not hardcoded. **CI-green, no GPU.**
- **Keypad (`keypad.rs`):** a **data-free** 3-col widget (`1-9 / . 0 ⌫ / Enter` bar) — layout +
  hit-test + char-mapping, **no game/topic literals** (honours the one-way no-leakage rule, so it
  sinks into `bm-render` later). Engine-candidate.
- **Painter (`render.rs`):** a small reusable headless 2-D painter (flat rects + AA text) through the
  **real wgpu path** — the engine-candidate UI surface; `font_proto` was refactored onto it.
- **Evidence:** the `drill_proto` bin drives the **real model + keypad layout** and snapshots three
  screen states to PNG via lavapipe — **mid-entry** (neutral), **correct** (green "50" / "Correct!" /
  1·27), **wrong** (red "99" / "Try again"). The framed question reads **"Half of 100"** — drawn
  straight from the first parity vector (`100→50`), i.e. the seam is *visibly* live. Same wgpu
  pipeline as web/APK; owner does the final on-phone eyeball. (Backspace renders as `<` — the
  documented ASCII fallback, since the embedded face lacks `⌫`.)
- CI-parity green: `fmt` + `clippy -D warnings` + all tests (9) pass; no engine/voxel code touched.
- Keypad+drill screenshots delivered to the owner. **HOLD for the Babysitter to gate → #3 golden-PNG
  FX · #4 clean APK.**

---

## BRICKMAP-GG1 spike — mini-gate #1: legible font path PROVEN ([B], GO)

Owner approved the spike (font prototype-first). Built `00-1/brickmap:crates/goblin-gold` (commit
`5bf7ef0`) — the spike crate's first piece: a `text` core that bakes a TrueType face (Instrument
Sans, OFL) to an **anti-aliased grayscale coverage atlas** + word-wraps prose, and a `font_proto`
bin that renders a real GG **guide + question screen** through the **actual wgpu path** (offscreen,
software-Vulkan/llvmpipe) at phone reading sizes → PNG.
- **Verdict: clear YES — the #1 blocker is cleared.** Crisp, fully legible reading-size prose at
  28 / 34 / 42 px on a 1080-wide phone canvas (gold heading + question, light guide paragraph) —
  categorically better than brickmap's `font8x8` 8×8 bitmap for guide/explain text. Same wgpu
  pipeline as web/APK, so on-device pixels match; owner does the final on-phone eyeball.
- The atlas→`R8` texture + textured-quad draw is the proven `bm-render::hud` pattern; this later
  sinks into `bm-render` as the engine's reusable text service (per owner "bank reusable text").
- CI-parity green: pure-CPU unit tests (AA bake + wrap) pass without a GPU; `clippy -D warnings` +
  `fmt` clean; no engine/voxel code touched. Charset = printable ASCII for the prototype (extend later).
- Evidence (phone-size prose screenshots) delivered to the owner. **HOLD for the Babysitter to gate
  → #2 keypad+drill (T229 data seam) · #3 golden-PNG FX · #4 clean APK.**

---

## BRICKMAP-GG1 — port research pass ([B], strand 3, research-only)

GG1-on-brickmap research delivered → **`00-1/brickmap:docs/gg1-port-research.md`** (commit `fb020fa`).
Verdict: feasible re-platform (not a port). GG1 is a 2-D text/UI/audio game → uses brickmap's
*presentation half* (overlays/palette/particles/text/audio/input), not the voxel half; FX is
"coming home" (`fxgl.js` was ported FROM `palette`/`splat` WGSL); audio DSP + cpal/web I/O already
exist; headless render-to-PNG works (golden-diff is the gap GG brings). New engine work: a legible
font path (SDF/TTF — the #1 dependency), a UI/menu/numeric-keypad layer, a save abstraction, a11y
(regression risk for schools). Reuse verdict: re-implement logic in Rust vs T229 parity vectors,
re-author audio onto the `Drone`-style synth, use `bm-render` recipes directly — **do NOT embed JS**.
Includes a capability matrix, GG1→brickmap subsystem map, proposed `crates/goblin-gold` boundary,
and a scoped spike (crisp text + one drill + self-verified FX + clean APK) ≈13–21 eng-days + a
go/no-go gate. No engine/game code changed. Babysitter writes `BRICKMAP-GG1-SPEC.md` next.

---

## T103 — low-end-Android PERF pass: audit + fix the render hot paths ([B], owner-mandated)

Owner: the perf pass "is not optional." A measure-and-fix pass for Adreno-618/Poco-X3-class Android
(installed PWA) now that the home backdrop animates continuously. Audited the live `fxgl.js` hot
paths and **applied the cheap fixes**; the rest is a doc + an owner on-device plan
(`docs/PERF-RESEARCH-2.md`). Headline finding + fixes:
- **Burst overlay re-rasterised the STATIC pile every frame** (the worst path): `_syncOverlay`
  called `drawHoard` (~16–22k `fillRect`) **per frame** for the whole ~1–2 s shower, ×refresh-rate.
  Fix: a **cached offscreen pile bitmap** (`_pileBitmap`, keyed on size/scale/level/seed) rendered
  **once** and **blitted** (`drawImage`) each burst frame — measured **~22,031 `fillRect`/frame →
  one `drawImage`/frame** (pixel-identical output; flying coins still draw, they're the only moving
  part). The ≈full-screen cache is **freed on burst end + dispose** (no idle memory). Capability-
  gated → falls back to the direct draw on old engines / test stubs.
- **High-refresh cap:** the per-frame burst **overlay** composite is capped to **~60 Hz** (the GL
  scene still renders every RAF) so a 90/120 Hz panel doesn't double the 2D cost.
- **Audited-good (documented, no change):** the T207 pile sparkle is already coin-only + 5 Hz
  throttled (~12–24k `fillRect/s`, in budget); idle/off-home cost ~0 (`stop()` idles the RAF +
  T211 hides the overlay); reduced-motion runs no loop; one app-lifetime `Controller` → no
  per-navigation listener leak; degrade ladder (WebGPU→WebGL2→Canvas2D-still, quality tiers,
  particle caps) intact; single GL context.

Verify: `node -c` clean; **fxgl 146** (+11 T103 assertions — burst pile cached/blitted not
re-rasterised, cache invalidates on wealth change + frees; GL renders every RAF while the overlay
is capped to ~60 Hz; stopped + reduced-motion controllers schedule NO frames); full Node suite
green (golden-fx 116 / fx-wiring 84 / hoard-wiring 47 / synth 177 / emblems 34); render/visual/audio
gates green; the cached burst renders identically on WebGL2. B-led (`fxgl.js`, `docs/PERF-RESEARCH-2.md`,
`test/fxgl.test.js`). **Owner runs the on-device plan** (jank/battery/heat); any `main.js` perf
follow-ups the audit surfaces are split out to [A].

---

## T211 — BUG: the gold hoard showed behind EVERY screen → overlay now follows the backdrop ([B], 🔴 owner-reported)

Owner: *"gold stacks behind every screen, but I only want it on the main screen."* Root cause: the
hoard renders on a separate **overlay canvas** (`.fxgl-hoard`, `_hoardCv`, T185) whose className
**strips `hidden`** (so it's never `display:none` — the T133/T185 reason). `[A]`'s screen router
calls `fxBg.stop()` + hides `#fxBackdrop` on non-home/arena screens, but only toggles `hidden` on
the **scene canvas** — the overlay sibling lingered, still showing the last home hoard behind
Inventory/Heroes/Setup. Fix (`fxgl.js`, [B]-only — the overlay owns its own visibility):
- New `_showOverlay(on)`: `visibility:hidden` + `clearRect` when off, reveal when on (kept as
  **visibility**, not `display:none`, so it stays drawable).
- **`stop()` → `_showOverlay(false)`** (backdrop off → hide + clear the pile); **`start()` →
  `_showOverlay(true)`** (home/arena re-show; `setData`/`_syncOverlay` then repaint the right
  content — Arena has no hoard so it draws empty). So the pile shows **only** where the scene does.
- 🌐 **Browser-verified in the real app** (gold=1e9): home → overlay `visible`; navigate to
  `#/audio` → `hidden`; back home → `visible`; no JS errors.

Verify: `node -c` clean; **golden-fx 116** (+4 T211 assertions — overlay visible on the live
backdrop, `stop()` hides + clears it, `start()` re-shows it); full Node suite green (fxgl 135 /
fx-wiring 84 / hoard-wiring 47); render/visual/audio gates green; backdrop/burst behaviour
unaffected. B-only (`fxgl.js`, `test/golden-fx.test.js`). Owner device-confirms.

---

## T207 — coin SHINE: glints on the shower + occasional pile sparkles + clearer rotation ([B], owner-requested)

Owner: *"occasional glints in the pile of coins; glints on the shower of coins; ideally some
showered coins would also rotate."* All in `fxgl.js`:
- **Specular glint in `drawCoin`** (pixel path): a new `hi` (0..1) flashes the brightest face cells
  near the lit pole to a near-white-gold specular tone (`shade(rgb,0.78)`), the flash growing with
  `hi` — a small sparkle, not the whole face. Gated (none at `hi=0`); the glint cells stay WITHIN
  the coin face so a glint-off redraw fully restores it (needed for the cheap pile pass).
- **Shower glints (`drawCoinParticle`):** passes `hi = p.shine · max(0, cos(lt·wob + phase))` — so
  each flying coin flashes as it turns face-on, varied per coin by `p.shine` (seeded in `seedBurst`,
  0 under reduced-motion) → they don't sparkle in unison.
- **Clearer rotation:** `seedBurst` coin `spin` is now `lerp(3,20, rng·rng)·±1` (skewed) — most
  coins tumble briskly, some barely, so the spin reads clearly + varied instead of a uniform blur.
- **Pile sparkles (`_pileGlint`, throttled ~5 Hz from `_frame`):** the settled pile is a static
  still by design, so this repaints ONLY the coins (opaque → they restore the previous tick's
  glints in place; the silhouette is never redrawn → cheap) with a **sparse, per-coin time-phased**
  flash (`sin(t·2.4 + coin.glint·3.1) > 0.985` → only a handful peak at once, cycling). Gated to
  the GL/GPU overlay + ambient loop + not-bursting; **reduced-motion / CPU-still stay static**.
  (Perf: ~a few k fillRects/s; the upcoming T103 perf pass is the budget gate — if it flags, the
  repaint can shrink to just the glinting subset.)
- 🌐 **Browser-verified on WebGL2**: bright sparkle flecks across the shower coins; occasional
  cycling sparkles on the settled pile (`shine-t207-shower.png`, `shine-t207-pile-{a,b}.png`).

Verify: `node -c` clean; **golden-fx 112** (+12 T207 assertions — glint→specular cells gated on
`hi` + a small sparkle (teeth); shower coins carry varied `shine` + varied `spin` + none when
reduced; `_pileGlint` repaints coins WITHOUT a full clear, is deterministic, CYCLES across time,
and is a no-op under reduced-motion); full Node suite green (fxgl 135 / fx-wiring 84 / hoard-wiring
47 / synth 177 / emblems 34); render/visual/audio gates green; scenes byte-identical when no hoard
(drawCoin `hi` defaults to 0). B-only (`fxgl.js`, `test/golden-fx.test.js`). Owner device-confirms.

---

## T205 — trim emblems to the 3 creatures + fix their sizing (fill the cell) ([B], owner-requested)

Owner: *"the final 3 emblems are nice — the rest we can scrap … in the emblems screen they look
like they need cropping."* Magnar (`hero:mo`, T194) is the launcher icon now, so the 6 abstract
marks are gone and the 3 creatures become Collector awards (T206 [A]). In `emblems.js`:
- **Scrapped 6, kept 3:** `IDS = ["beast","goblinking","voidbeast"]`; removed the
  `coin`/`crowncoin`/`hoard`/`goblin`/`voidthrone`/`sigil` generators and the now-unused
  `disc`/`stampProfile` helpers. (`creature()`/`mulberry`/`setSym` retained.)
- **Sizing fix (the "needs cropping" tell):** `draw()` no longer maps the full 24² grid (which
  left the creature small + off-centre with dead margin); it now fits the **subject's content
  bounding box** — scales the lit-cell bbox to fill the available square (`cell = round(avail/
  span)`, integer → crisp), **centred**, with a ~10% safe margin. So each creature **fills the
  cell**, nothing clipped, no dead margin, and all 3 read the **same visual size** → they match
  the other Collector-award icons.
- Removed the 6 orphaned `emblem_*` goldens; the 3 kept creatures' cell goldens are unchanged
  (`creature()` untouched).
- 🌐 Rendered the 3 at icon size: centred, horns/eyes fully in-frame, uniform fill (`emblems-t205.png`).

Verify: `node -c` clean; **emblems 34** (IDS===3, the 6 marks gone + `cells()` null, each creature
fills ≥78% / within 12% of each other / uncropped with a margin every side, corners field/maskable);
the 3 creature cell-goldens green. B-only (`emblems.js`, `test/emblems.test.js`, golden cleanup).
Pairs with T206 [A] (consumes these as awards). Owner reviews.

---

## T204 — BUG: purple backdrop lost on PWA app-switch → WebGL context-loss SELF-HEAL ([B], 🔴 owner-reported)

Owner screenshot: backgrounding the PWA sometimes leaves a **light-grey home** (the dark-purple
backdrop gone; the hoard pile still drew — it's on the separate 2D overlay). Root cause: the OS
frees the WebGL context on app-switch and `fxgl` had **no `webglcontextlost/restored` handling** —
a lost canvas presents ~white, and `.fx-backdrop`'s `opacity:.85` over the `#0E1116` body = light
grey. Fixed in `fxgl.js` (self-listening, [B]-only):
- **`_attachLifecycle`** (wired in the ctor) registers `webglcontextlost`/`webglcontextrestored`
  on the canvas + `visibilitychange` on document (guarded for headless/no-listener envs).
- **On LOSS** (`_handleContextLost`): `preventDefault()` (so the browser will restore), mark
  not-ready, **cancel the RAF** (no drawing into a dead context), and **hide the canvas**
  (`visibility:hidden`) so the **dark brand body shows — never the white/grey flash** (the safety
  net that alone kills the jarring light state).
- **On RESTORE** (`_handleContextRestored`): re-acquire the backend (`_init` → fresh GL context +
  program), which re-uploads (`setData`), re-fits, redraws, and resumes the loop; reveal the canvas.
- **On FOREGROUND** (`visibilitychange`→visible): `redraw()` (refit + repaint + overlay sync) for
  a throttled/paused-tab blank with no real loss; and if still flagged lost, **re-init as a
  backstop** — which also covers the **WebGPU `device.lost`** path (no restored event there; a
  `device.lost.then` hook flags it on loss).
- Exposed a public **`redraw()`** so an [A] foreground hook can also trigger it. `dispose` removes
  all three listeners (no leak).
- 🌐 **Browser-verified on WebGL2** via `WEBGL_lose_context`: before ready/visible → on
  `loseContext()` not-ready + canvas hidden (dark, no white) → on `restoreContext()` ready/visible
  again + scene redrawn; no JS errors.

Verify: `node -c` clean; **fxgl 135** (+11 T204 assertions — listeners registered, loss→not-ready
+ hidden + RAF cancelled + preventDefault, restore→re-init + re-upload + revealed, foreground
repaint w/o re-upload, teeth: a loss with no restore never sits white + the foreground re-init
backstop); full Node suite green (golden-fx 100 / fx-wiring 84 / synth 177 / hoard-wiring 47);
render/visual/audio gates green. B-only (`fxgl.js`, `test/fxgl.test.js`). Owner device-confirms
(switch apps repeatedly).

---

## T203 — coin-shower POLISH: slightly bigger + rain DOWN (more gravity, less fly-up) ([B], owner-reported)

Owner on the now-approved shower: *"looks pretty good — but make them slightly bigger, and give
them more gravity, more falling down, less flying up."* Tuned the **money-gain coin shower** (the
`look:"coin"` branch of `seedBurst`) only — the generic confetti is untouched. In `fxgl.js`:
- **Less fly-up:** the coin launch vertical velocity is suppressed (`sin(ang)·spd·0.3`) with only a
  **gentle pop** (`coinUp` 0.10 vs the confetti 0.42 fountain) → gravity dominates, they rain down.
- **More gravity (NOT global):** `BURST_GRAVITY` is a shared shader uniform, so instead each coin
  carries `p.grav = BURST_GRAVITY·1.9`, plumbed through **`drawCoinParticle`'s `burstPos`** — the
  path ALL coins render through on every backend (overlay + CPU still). The shader splat (confetti
  only) is untouched. **[B]-only**, no shader change.
- **Slightly bigger:** the coin `sizeRange` bumped ~+20% (6→7 / 12→15).
- 🌐 **Browser-verified on WebGL2**: fired from y=0.30, the bigger coins spread and drop below the
  launch point within ~170ms — raining down, not fountaining up (`shower-t203-webgl.png`).

Verify: `node -c` clean; **golden-fx 100** (+6 T203 assertions — coins bigger than confetti,
much less upward launch, 80/80 sink below the launch point under their gravity, `p.grav >
BURST_GRAVITY` while confetti has none, the coin gravity falls faster via `burstPos`, teeth: the
confetti still fountains up at its small size); full Node suite green (fxgl 124 / fx-wiring 84 /
hoard-wiring 47); amount-scaling (T173) preserved. B-only (`fxgl.js`, `test/golden-fx.test.js`).
Owner device-confirms.

---

## T200 — coin COLOUR by height: dark gold low, light gold high (with a mix at each level) ([B], owner-reported)

Owner: *"too much of a mix of dark/light coins — lower down should be more dark, higher up more
light, with some of each still mixed in."* `seedHoard` picked each tone ~uniformly at random → a
flat salt-and-pepper mix. Fixed in `fxgl.js`:
- The gold pool is ordered **dark→light by luminance** (`toneRamp`), and each coin's tone is
  picked by its **fill-rank `q`** (T196): `pick = clamp01(q + (rng()−0.5)·0.9)` → index into the
  ramp. Low/deep coins weight DARK, high/crest coins weight LIGHT, and the ±0.45 jitter keeps a
  **mix of both at every level** (a gradient of the *distribution*, not a hard split). Reinforces
  the silhouette's own crest-light→base-dark shading.
- Keyed off `q` (level-independent) and one rng draw → a coin's tone is **stable as the pile
  grows** (no flicker; prefix-identical with T196) and the scatter geometry is byte-identical.
- 🌐 **Browser-verified on WebGL2**: paler gold at the crests, darker specks toward the base,
  mixed throughout (`hoard-halftone-webgl.png`).

Verify: `node -c` clean; **golden-fx 94** (+4 T200 assertions — base mean-luma < crest by >0.05,
≥2 tones in each band (mix retained), tone stable across pile growth, teeth: top-decile markedly
lighter than bottom-decile Δluma>0.08); full Node suite green (fxgl 124 / hoard-wiring 47 /
fx-wiring 84); `fx_hoard_scatter` golden unchanged (sample is geometry, not colour). B-only
(`fxgl.js`, `test/golden-fx.test.js`). Owner device-confirms.

---

## T199 — a maxed pile reaches the TOP of the screen (1T left a gap) ([B], owner-reported)

Owner: *"1T still doesn't fill the screen — better than before though."* T192 raised `HOARD_MAX_H`
to 0.82, so a level-1.0 pile climbed ~82% and stopped short of the ceiling. Fixed in `fxgl.js`:
- **`HOARD_MAX_H` 0.82 → 1.0** so a level-1.0 pile can fill the screen.
- **`moundProfile` wall-banking** nudged (`0.42 → 0.44` base, wall term `0.58`) and the organic
  drift/roughness **tapered toward the walls** (`taper = 1 − 0.7·wall`) — so the banked sides climb
  **cleanly to the top** (≥~0.95 across seeds) while the **centre keeps its organic dip** (~0.44),
  reading as a banked container, not a flat lid. (Without the taper, drift could pull a wall off
  the ceiling.)
- Interaction with the [A] fill-curve recurve (T198): once that lands, **level 1.0 = the top of the
  economy** (not 1T), so 1T reads tall-but-not-full and only peak wealth fills the screen — intended;
  T199 just makes level 1.0 *able* to fill it. Stays behind the UI (partial occlusion is fine).
- 🌐 **Browser-verified on WebGL2** at level 1.0: gold banks up BOTH walls to the top edge with a
  centre valley (`hoard-halftone-webgl.png`), halftone + pixel-dithered coins intact.

Verify: `node -c` clean; **golden-fx 90** (+3 T199 assertions — `HOARD_MAX_H ≥ 0.95`, walls ≥0.88
at level 1.0 across seeds, centre still dips below the walls; `fx_hoard_scatter` re-blessed —
only `maxH` 0.82→1); full Node suite green (fxgl 124 / hoard-wiring 47 / fx-wiring 84); scenes
byte-identical when no hoard. B-only (`fxgl.js`, `test/golden-fx.test.js`, golden). Owner
device-confirms. **Next B: T200 (coin colour by height).**

---

## T197 — pixelate + dither the COINS too (T195 filtered only the pile shape) ([B], owner-reported)

Owner on the T195 build: *"the shape got a filter but not the coins themselves — pixelate the
coins too."* (And: *"the colour is ok, ignore that"* → **NO colour shift.**) T195's halftone ran
on the silhouette only; the cylinder coins (`drawCoin` + the gain-burst `drawCoinParticle`) were
smooth canvas ellipse fills that bypassed the ramp + Bayer, so they read smooth against the
dithered pile. Fixed in `fxgl.js`:
- **`drawCoin` gains a PIXEL-DITHER path** (engaged when a `cell` is passed): it rasterises the
  cylinder into the **same screen cell-grid as the T195 pile** (`cell = round(pxScale·3)`,
  pixel-snapped, nearest-neighbour, crisp) and ordered-Bayer-dithers (`rampIndex`/`bayer4`,
  spread 1) between the coin's **OWN three tones** — edge `shade(rgb,-0.4)` → face `rgb` →
  highlight `shade(rgb,0.42)`. A soft upper-left face light gives a real gradient for the dither
  to work on. **No colour shift** (only the coin's existing tones), and **no canvas read-back**
  → cheap enough for the per-frame gain-burst coins. The smooth/vector + path-less fallbacks stay
  for callers/tests that pass no `cell`.
- Both call sites pass the **shared `cell`**: the static hoard coins (`drawHoard`) and the
  animated gain-burst coins (`drawCoinParticle`) — so silhouette + settled coins + flying coins
  all share one dot lattice.
- 🌐 **Browser-verified on WebGL2**: the pile and coins now read as one cohesive pixel-dithered
  gold field — no smooth ellipses standing out (`hoard-halftone-crop.png`, `coinburst-webgl.png`).

Verify: `node -c` clean; **golden-fx 87** (+5 T197 assertions — the coin rasterises into many
cell-aligned fills, dithers ≥2 of its tones, every tone is one of its OWN 3 (no colour shift),
teeth: no-`cell` keeps the smooth ellipse path); full Node suite green (fxgl 124 / hoard-wiring
47 / fx-wiring 84 / synth 177 / emblems 61); render/visual/audio gates green; scenes byte-
identical when no hoard. B-only (`fxgl.js`, `test/golden-fx.test.js`). Owner device-confirms.
**Next B: T199 (full pile reaches the top) → T200 (coin colour by height).**

---

## T193 (RE-OPEN) — the money-gain burst tagged no coins → fixed `seedBurst`/`seedCelebrate` to honor `look:"coin"` ([B], CHANGES REQUESTED)

Babysitter re-opened (my earlier renderer was correct but never fired): the live money-gain
shower is **`burst({look:"coin"})` → `seedBurst`**, and `seedBurst` (and `seedCelebrate`) **never
read `opts.look`** — so particles were never tagged `look:1`, `_ignite`'s router sent them to the
shader splat, and they rendered as **squares** on the owner's device (owner: "still no coins,
unchanged"). `drawCoinParticle` + the overlay routing (T193) were fine but received no coin-tagged
particles. Fix in `fxgl.js`:
- **`seedBurst`/`seedCelebrate` now honor `opts.look === "coin"`:** each particle gets `look:1`
  plus the spin fields `drawCoinParticle` animates (`rot`/`spin`/`wob`/`phase`), and the colour
  pool defaults to the **gold ramp** (`GOLD_TONES`) when no palette is given. The coin's extra
  rng draws live **only** inside the `if(coin)` branch → the default-confetti seed sequence (and
  `fx_burst`/`fx_celebrate` goldens) are **byte-identical**. Coins are ballistic (no converge
  target) so `drawCoinParticle` flies them on `burstPos`.
- The existing `_ignite` routing already keeps coins in `burst_.parts` while sending only
  `look!==1` confetti to the GL splat, and `_syncOverlay` draws the `look===1` coins as spinning
  cylinders on the 2D overlay — so the fix lights up on every backend incl. the device.
- 🌐 **Browser-verified on WebGL2**: `burst({look:"coin"})` with no hoard throws spinning
  cell-shaded cylinder coins on the overlay (`burst-coin-webgl.png`), not squares.

Why the suite missed it (now gated): no test asserted the **seeding path** tagged coins.
Added the gate — **golden-fx 82** (+7 T193-re-open assertions: `seedBurst({look:'coin'})` tags
every particle `look:1` + carries varied spin fields + defaults to gold + stays ballistic; the
default burst is still plain confetti (`look` unset); and `burst({look:'coin'})` on a GL backend
routes ONLY confetti to the splat while keeping coins for the overlay). `node -c` clean; full
Node suite green (fxgl 124 / hoard-wiring 47 / fx-wiring 84 / synth 177 / emblems 61);
render/visual/audio gates green; confetti goldens unchanged. B-only (`fxgl.js`,
`test/golden-fx.test.js`, `test/browser/coinburst-capture.js`). Owner device-confirms (force-
refresh the PWA). **Next B: T197 (dither the coins) → T199 → T200.**

---

## T196 — hoard rises GRADUALLY: ~100+ fine height levels via STABLE ACCUMULATION ([B], owner-reported)

Owner: *"more gradations of pile HEIGHT — not just 8, maybe 100. The user should see it gradually
rise as wealth increases, not big jumps."* Root cause: `deriveHomeScene` keyed the coin-buffer
**seed off an 8-tier quantiser** (`hoardTier`), so a whole wealth band showed the same pile then
jumped — and the seed change **reshuffled every coin** (teleport). Fixed in `fxgl.js` (the
re-seed trap avoided — a naïve `HOARD_TIERS=100` would reshuffle ~100×):
- **`seedHoard` is now a STABLE ACCUMULATION.** Each coin's place is fixed by its **fill-rank**
  `q = (i+0.5)/full`, where `full` = the level-1 coin count (depends on cap/reduced, **NOT** the
  current level). A coin sits at the surface height of **its own rank** (`moundProfile(x, q)`),
  and size scales with `q` — both level-independent. Raising `level` only raises `n =
  round(full·level)`, i.e. **appends higher-rank coins on top**. So `seedHoard(lowLevel)` is a
  **byte-identical PREFIX** of `seedHoard(highLevel)` — existing coins never move; the pile
  builds upward in ~`full` (≈480) fine steps.
- **`deriveHomeScene` uses a FIXED seed** (`scene.seed ^ 0x601d`) — the 8-tier seed keying is
  gone, so the field is stable across earns (no teleport) and the continuous `lvl` drives a
  smooth rise. The silhouette (`moundProfile(x, level)`) was already continuous.
- 🌐 **Browser-verified on WebGL2**: the same hoard at levels 0.15 / 0.4 / 0.65 / 0.9 builds
  upward smoothly — each lower pile is visibly a sub-pile of the higher (`hoard-rise-strip.png`).

Verify: `node -c` clean; **golden-fx 75** (+5 T196 assertions — prefix/no-teleport, **101**
distinct counts across 1%-level steps = ~100 levels, fills-upward, stable home seed; teeth on
all; `fx_hoard_scatter` re-blessed — rank-0 coin now sits at the base y≈100 not the old crest);
full Node suite green (fxgl 124 / hoard-wiring 47 / fx-wiring 84 / synth 177 / emblems 61);
render/visual/audio gates green. B-only (`fxgl.js`, `test/golden-fx.test.js`, golden). Owner
device-confirms the gradual rise.

---

## T195 — hoard FILTER pass: render the pile in brickmap's halftone-dither look (shading only) ([B], owner-reported)

Owner on the T192 pile: *"needs a filter pass — dithering and pixelation, along the lines of
brickmap."* The whole scene already renders with ordered-Bayer dither + palette quantise, but
`drawHoard` was the ONE part still drawing a **smooth analog gradient** (`shade(base, 0.25 −
depth·0.6)`) — so the pile read smooth against the dithered/halftone scene. Fixed in `fxgl.js`
(SHADING only — the height-gradation is the separate T196):
- **`drawHoard` silhouette** now uses the **same machinery the scene uses** (`rampIndex` +
  `bayer4`, my exact port of brickmap `palette.wgsl`): a crest-light→base-dark **luminance/depth
  gradient-map** posterised onto a **curated 5-stop gold ramp** (`hoardRamp`/`HOARD_SHADES`),
  with the **ordered Bayer 4×4 dot pattern between stops** (the halftone) at a **chunky pixel
  scale** (`cell = round(pxScale·3)`, nearest-neighbour, crisp) — NO smooth gradient. A touch of
  position-hashed variation breaks dead-flat bands. The cell-shaded cylinder coins sit on top
  unchanged, cohesive in the halftone field.
- The dot lattice is a pure function of integer big-pixel coords → **screen-locked**, stable
  across frames, dot-locked to the biome behind it. Same draw on the WebGL/WebGPU 2D overlay
  (the device) AND the CPU still.
- 🌐 **Browser-verified on WebGL2** (`test/browser/hoard-capture.js` → `screenshots/hoard-halftone-{webgl,crop}.png`):
  the pile is a crisp ordered-Bayer halftone, posterised gold, dot-locked to the dithered scene.

Verify: `node -c` clean; **golden-fx 70** (+6 new T195 assertions — silhouette posterised to ≤
the 5-stop ramp, every tone drawn from the curated gold ramp, ramp luma-ascending + gold-family,
teeth: the old smooth gradient would blow past the ramp's 5 tones); full Node suite green (fxgl
124 / synth 177 / emblems 61); render 7 / visual 13 / audio 27 + hoard-wiring 47 green; scenes
byte-identical when no hoard. B-only (`fxgl.js`, `test/golden-fx.test.js`, `test/browser/hoard-capture.js`).
Owner device-confirms. **T196 next** (gradual height — ~100 levels via stable accumulation).

---

## T193 — money-gain celebration: SPINNING cell-shaded cylinder coins on every backend ([B], reuses the T192 coin)

The earn burst now throws **real spinning coins**, not shader-splat discs — the same
cell-shaded cylinder primitive as the T192 hoard, so a gain visibly rains the *same gold*
onto the *same pile*. All in `fxgl.js` + B-owned tests:
- **`seedConverge` coins** carry `spin`, `wob`, `phase` (per-particle, seeded) so each coin
  tumbles independently: `rot += lt·spin`, `aspect = 0.22 + 0.72·|cos(lt·wob + phase)|`
  (face-on → edge-on → face-on as it flips). Amount-scaling (count/spread) is preserved.
- **`drawCoinParticle`** animates one coin along its `convergePos`/`burstPos` arc with the
  live spin, alpha-faded by the particle's life — shared by the CPU still AND the overlay.
- **Per-particle ROUTING (the crux):** coin-look particles (`look===1`) are drawn as
  cylinders on the backend-agnostic **2D overlay** (T185) for the WebGL/WebGPU backends and
  inline by the CPU still; the GL/GPU **splat receives ONLY non-coin confetti**
  (`parts.filter(p => p.look !== 1)`). Mobile refuses a 2nd GL context (T133/T138), so coins
  *must* ride the 2D overlay to show on the device. `_syncHoard`→**`_syncOverlay(burstTime)`**
  now composites the static hoard + the active coin burst each frame, and clears the spent
  coins (leaving the hoard) on auto-stop.
- 🌐 **Browser-verified on the WebGL2 backend** (headless Chromium, dpr 2.75): coins arc from
  the earn-point, tumble, and converge onto the wall-banked hoard; overlay measured lit;
  no JS errors. Capture: `test/browser/coinburst-capture.js` →
  `screenshots/coinburst-webgl{,-early,-late}.png`.

Verify: `node -c` clean; **golden-fx 64** (T185 overlay test moved to `_syncOverlay`; **+2
new T193 assertions** — a no-hoard earn burst paints cylinder fills on the GL overlay, and
the GL splat gets only `look!==1`); full Node suite green (fxgl 124 / synth 177 / emblems
61); render 7 / visual 13 / audio 27 browser gates green. B-only (`fxgl.js`, `test/golden-fx.test.js`,
`test/browser/coinburst-capture.js`). Owner device-confirms.

---

## T192 — hoard overhaul: cell-shaded CYLINDER coins + a taller, wall-banked pile ([B], owner screenshot)

Owner's 3 notes on the live 1T hoard: (1) too low — should climb much higher; (2) not a
central dome — gold should bank against the side WALLS; (3) drop the beveled ovals →
cell-shaded short cylinders (face ≠ edge colour, no outline). All in `fxgl.js`:
- **New coin primitive (`drawCoin`):** a **cell-shaded rotated short CYLINDER** — a flat
  foreshortened top-face ellipse + a darker flat EDGE band below (the side), **two flat
  tones, NO outline, no gradient** (+ an optional tiny flat highlight). `aspect` tips it
  (face-on disc → edge-on bar), `rot` spins it. Same primitive for the hoard + (T193) the
  celebration. The path-less test raster gets a two-rect fallback (face + edge), still measurable.
- **Pile shape (`moundProfile`):** no more central dome — `0.42 + 0.50·wall^1.5 + drifts +
  roughness`, i.e. a **full-width fill that banks HIGHER against x≈0/1** with organic clumps,
  dipping in the middle (a heaping container). **`HOARD_MAX_H` 0.34 → 0.82** so at high
  wealth the walls climb most of the screen. **`HOARD_CAP` 340 → 480** + coin size grows
  with the pile → full, not sparse. `seedHoard` scatters **full-width** (mild wall bias).
- 🌐 **Browser-verified** at `?dev&gold=1e12`: gold banks thick up BOTH walls to near the
  top with a centre valley framing the UI; cylinder coins read; renders on the WebGL 2D
  overlay (the device) AND the CPU still.

Verify: `node -c` clean; `golden-fx` **62** (mound/pile assertions reframed for the
wall-bank + cylinder; `fx_hoard_scatter` re-blessed); existing non-hoard scenes byte-
identical; full Node suite + render/visual gates green. B-owned (`fxgl.js` + tests).
Owner device-confirms; **T193 next** (the earn celebration reuses the cylinder coin).

---

## T188 — character-forward creature/hero emblems in the bestiary style ([B], owner-requested)

Owner (after reviewing the live emblems): the abstract marks "could be useful," but
heroes/beasts are the best app-icon bet — do one more pass in the **bestiary generative
style**, into `emblems.js`. Added **3 character-forward creature candidates** (kept the
original 6): **`beast`** (horned, multi-eye gold brute), **`goblinking`** (a crowned
goblin-king bust), **`voidbeast`** (a smooth cosmic head with 3 purple eyes).

Re-implemented the `monsters.js` LOOK **self-contained** (no Monsters import — `emblems.js`
stays a pure, dep-free `cells(id)`→`draw` module like `glyphs.js`): a `creature(g,seed,opts)`
generator draws a lumpy, vertically-symmetric blob (gold-shaded upper-left→lower-right via
the same light dir as the coin bevel), horns/antennae or a smooth/crowned head, glinting
eyes (white or cosmic-purple), shadow teeth + spots, a dark outline ring, feet stubs —
deterministic from the seed. Bold, centred, **maskable** (full-bleed violet field, 14% safe
margin, legible 48→512 px).

Verify: `node -c` clean; `emblems.test` now **9 emblems** (the new ids are golden-pinned +
asserted non-empty/deterministic/gold-ramp/maskable by the IDS loop, + an explicit
character-forward check); full Node suite green. New goldens `emblem_{beast,goblinking,
voidbeast}`. B-owned (`emblems.js` + test). **[A]:** they auto-appear in Codex ▸ Emblems;
owner picks the launcher from the now-9 candidates.

---

## T191 — declick the engine-wide crackle/popping ([B], owner-reported, low-severity)

Owner: "the audio can have some crackling/popping, not terrible though." Two safe,
textbook fixes for the named causes (envelope discontinuity + clipping-into-the-limiter):
- **True-zero release in `adsr`:** exponential ramps can't reach 0 (they stop at 1e-4), so
  added a tiny linear tail to **TRUE 0** before the voice is torn down → no end-of-note
  discontinuity. Applies to every music voice AND drum (all use `adsr`).
- **Soft limiter knee (0 → 6 dB):** the master limiter was a hard brickwall; hard-clamping
  transient peaks on dense styles is the most likely "engine-wide" crackle. A 6 dB knee
  rounds the limiting so busy sums compress gently instead of hard-clipping (still ratio 20
  @ LIMIT_DB — bounded, T175 stability via the reverb-return compressor + decay cap is
  untouched). Attack nudged 3→4 ms.

Verify: `node -c` clean; `synth.test` 176 (ADSR test updated for the declick tail);
`golden-synth` unchanged (scores are note events, not envelopes); the T175 real-audio
stability gate green (×2, stable); full Node suite + all 3 browser gates green. B-owned
(`synth.js` + tests). **Owner device-confirms** the crackle is gone (can't reproduce the
analog crackle headlessly; these are the standard, can't-regress declick fixes).

---

## T190 — Lo-Fi still dark/stressful: IMPLEMENT the research (major + resolve home) ([B], owner-reported)

Owner rejected the T183 "blind nudge" (it only lifted pitch/reverb, **left the mode minor**).
Implemented the Babysitter's cited research (`docs/agent/research-study-music.md`) into
`CONTEXTS.lofi` — the highest-impact levers:
- **Mode `dorian` → `mixolydian`** (major-family → lower-cortisol "happy/predictable", with
  the b7 keeping lo-fi soul; dorian/minor *was* the "dark" — the single biggest lever).
- **Progression `[0,5,3,4]` → `[0,5,3,0]`** (I–vi–IV–**I**) — now **resolves HOME** each loop
  instead of sitting on the subdominant (dissonance/non-resolution ≡ tension ≡ stress).
- **Lead `pluck` → new `croon`** — a soft, low-passed murmur (slow attack 0.045, cut 1.4 kHz,
  no resonance, light sustain) instead of the bright resonant ping (a sharp lead is an
  "orienting trigger" = stress). It murmurs, doesn't ping.
- Kept tempo 78, sparse density 0.24, root 55, reverb 0.32, the `padep` Rhodes bed + swing —
  still recognisably lo-fi, just warm/calm not minor/tense. `solve` (the in-game drill bed)
  inherits it.

Verify: `node -c` clean; **distinctness holds** (12 mutually distinct, ≥5 modes — dorian
retired, mixolydian shared with tropical but the scores differ, ≥10 tempos); **12 patches
all distinct** (croon added); `golden-synth` re-blessed (only `synth_score_lofi`); T175
stability holds (real-audio gate green). Full Node suite + all 3 browser gates green.
B-owned (`synth.js` + tests). Owner device-confirms it's no longer dark/stressful.

---

## T185 — the gold hoard was INVISIBLE on-device: only the CPU backend drew it ([B], 🔴 DO-FIRST)

Owner: 1T gold, no pile on home. Babysitter-verified root cause: T172 rendered the hoard
**only in `CPUBackend._still`**; the real device runs **WebGL2/WebGPU**, whose `setData`/
`renderFrame` ignore `derived.hoard` entirely → the mound + coins were never drawn (exactly
the "not displaying at all" the owner saw). This was the GL-vs-CPU risk I flagged on T172.

### Fix — a backend-agnostic 2D OVERLAY (the Babysitter's recommended option)
Extracted the hoard draw to a standalone **`drawHoard(ctx, hoard, W, H, pxScale)`** (CPU
still + the overlay share one identical 2D draw — the beveled mound + coins). The Controller
now composites the hoard on a **2D overlay canvas** for non-CPU backends (`_syncHoard` +
`_ensureHoardCanvas`): it dynamically creates a `<canvas>` sibling of the scene canvas,
copies its class/box (so it inherits `.fx-backdrop`: `position:fixed; inset:0; z-index:-1`)
minus `hidden`, `pointer-events:none`, inserted **just after** the backdrop → paints **over
the purple backdrop, under the UI** (the owner's "over the backdrop, behind the buttons").
Sized to the GL buffer + redrawn on `setScene`/resize; CPU still draws it inline (no overlay).
**No `index.html` change needed** — the Controller owns the overlay.

### Verify
- 🌐 **Browser-verified** (`?dev&gold=1e12` → home, dpr 2.75): the overlay canvas mounts
  (912×1973, `z-index:-1`, `position:fixed`) with a real gold pile (399 lower-half gold px;
  was 0). `node -c` clean; new headless test drives `_syncHoard` with a stub GL backend →
  asserts the overlay is created, sized to the GL buffer (780×1688), and the pile is drawn
  (7220 fills). Existing scenes byte-identical when `scene.hoard` is absent; full Node suite
  (incl. `fx-wiring` + `hoard-wiring`) + all 3 browser gates green. **B-owned** (`fxgl.js` +
  `test/golden-fx.test.js`).

---

## T183 — research: study-friendly music + brighten the dark/bassy `lofi` ([B], owner-feedback)

Owner: "audio switching sounds very good now; only the Lo-Fi Study is a bit dark/bassy —
research what's nice to study/be-tested to." Doc `docs/research-study-music.md` + the
concrete `CONTEXTS.lofi` revision.

Findings: focus/test music = lyric-free (✓), steady ~70–90 BPM (✓), low dynamic range (✓
T175), sparse (✓ 0.24), and **warm-but-BRIGHT** — brightness from **register + a clear low
end**, not a faster/edgier tempo or key. So "dark/bassy" is a register + low-weight + wash
problem, not the genre (dorian + a Rhodes bed is authentic lo-fi).

Revision (kept dorian / Rhodes `padep` / swing / light kit): **root 50→55** (+5 semis lifts
the whole bed out of the dark register — the biggest fix), **leadOct 1→2** (the pluck sings
brighter), **reverb 0.42→0.32** (clears the washy low-mid haze), tempo 76→78. `solve` (the
in-game test music) is a `lofi` alias → inherits it. The other calm contexts (menu ionian/
airy, ambient lydian/sparse) are already bright — no change.

Verify: `node -c` clean; **distinctness holds** (12 mutually distinct, ≥5 modes, ≥10
tempos); `golden-synth` re-blessed (only `synth_score_lofi` changed — the intended note
shift); **T175 stability holds** (real-audio gate green; padep + decay 0.66 + the lower
0.32 send → even less buildup-prone). Full Node suite + all 3 browser gates green. B-owned
(`synth.js` + tests). Babysitter re-measures stability; owner ears the brightness.

---

## T181 — `emblems.js`: generative brand emblems (app-icon candidates + Codex) ([B], owner-greenlit)

Owner: "do icon generation — into the Codex too; unchosen ones become unlockable." New
standalone B-owned module **`emblems.js`** (`window.Emblems = { IDS, cells(id), draw(canvas,
id,opts), PALETTE, BG }`) minting the brand-emblem candidates in the engine's generative
pixel/dither style — **gold-on-violet, centred + maskable-safe** (each works as a launcher
icon AND a Codex tile).

### Six candidates (the owner's five + one)
`coin` (fat beveled gold coin + goblin profile + glint — reuses the hoard coin look),
`crowncoin` (the coin in a 3-point crown), `hoard` (a glinting coin-mound), `goblin` (a
cheeky pixel goblin head clutching a coin), `voidthrone` (a cosmic-purple throne + gold at
its foot + star glints), and `sigil` (the brand "/" slash through a coin — mark-forward).

### How (mirrors glyphs.js — pure + deterministic)
Emblems are **generated**, not hand-painted: a 24² ink-code grid filled by distance-field
discs shaded by a fixed upper-left light (the metal bevel) + a glint, on a 3-stop gold ramp
(+ cosmic purple for the throne). `cells(id)` is pure/testable; `draw(canvas,id)` is the only
side-effect — full-bleed violet field, the grid fit + **centred with a ~14% maskable margin**
(the subject never relies on the corners), chunky squares so it's crisp from **48→512 px**.

### Verify
- `node -c` clean; `test/emblems.test.js` **45** — golden-pins each emblem's cell grid
  (per-row lit counts + ink set), asserts the full gold ramp (lit bevel, not flat), and
  proves draw() is maskable (corners = field, centre = subject) at 48/192/512 px + graceful
  on bad input. Full Node suite green. **B-owned** (`emblems.js` + test + 6 goldens).
- **[A] hand-off:** add `<script src="emblems.js">`; render the candidates in the Codex
  "Emblems" section (T179) + the `?dev` reveal-all (T180); register `test/emblems.test.js`
  in `pages.yml` (CI gate). Owner picks the launcher icon; the rest become unlockables.

---

## T172 — gold-hoard ENGINE: beveled-coin splat + hoard scene mode + converge earn-burst ([B])

Built the owner-blessed T174 technique into `fxgl.js`. IMPRESSION, not physics: imply the
bulk with a shaded mound SILHOUETTE + render only the SURFACE coins. All **opt-in**
(existing scenes byte-identical — the scene goldens are unchanged).

### The four capabilities (all pure-math headless-tested)
- **(a) beveled coin** — `drawCoin()`: a lit disc (rim/shadow ring + mid body + inner
  highlight + specular glint) on a real 2D ctx; an axis-aligned squashed-rect fallback on
  a path-less ctx (so the test raster measures it). `look:1` on the particle opts in.
- **(b) per-coin rotation + aspect (squash)** → coins lie at varied angles (asserted: 40
  coins span >20 distinct rots + squashes).
- **(c) hoard scene mode** — `scene.hoard = level|{level,seed,palette}` → `deriveScene`
  seeds the crest-weighted surface coins (`seedHoard`) on a `moundProfile` heightfield;
  the CPU `_still` renders a **dithered gold mound silhouette** (fake-AO, darker at the
  base) + the coins on top. Count rides a **saturating** `hoardLevel = gold/(gold+K)`
  (early gold shows, big totals plateau), quantised to 8 **tiers** (re-seed only on a tier
  change). Capped at `HOARD_CAP 340 ≪ PARTICLE_CAP 512`; reduced-motion → a smaller static
  pile. `deriveHomeScene` passes `state.hoard` through for [A]'s T173.
- **(d) converge earn-burst** — `controller.earnBurst({x,y,tx,ty})` + `convergePos()`: coins
  fly from the earn-point, ease+lob toward the hoard target, and **land (absorbed)** —
  directed, not dispersed. Rides the existing burst machinery/auto-stop.

### Renders on the 2D/CPU path — by design (the T133/T138 lesson)
The hoard renders via the **2D/CPU path**, NOT a 2nd WebGL context. The home backdrop
already holds the 1st WebGL context, and mobile GPUs **refuse a 2nd** (exactly why T133/
T138 moved the celebration to a 2D overlay — "a 2D context always presents"). So the
reliable, presents-everywhere home for the hoard is a 2D overlay, which is what this
implements + tests. **[A] T173 hand-off:** mount a 2D hoard overlay (a `backend:"2d"`
`FXGL.Controller`, like `#fxBurst`) **behind the UI** (z between the backdrop and the
tree/buttons), feed it `setScene({…, hoard: FXGL.hoardLevel(gold)})` (re-render on gold
change), and fire `earnBurst({x,y from the earn-point, tx,ty over the hoard})` on
`addGold`. Keep it low + behind the UI (home a11y contrast bar); reduced-motion → static.

### Verify
- `node -c` clean; `golden-fx` **55** (was 35; +20 for the hoard math + the rendered-pile
  raster + the converge check), `fxgl.test` + full Node suite + all 3 browser gates green;
  existing scene goldens unchanged (opt-in proven). New golden `fx_hoard_scatter`. B-owned
  (`fxgl.js` + tests). Babysitter browser-verifies the 2D-overlay render once [A] wires it;
  owner tunes the feel (mound shape/height, coin size, glint, the K curve).

---

## T175 — the FOGHORN is back: a sustained TONAL pad ramps the reverb to a rail ([B], 🔴 DO-FIRST)

Owner (totally reproducible): **every** song starts nice then **ramps up to foghorn/pain**
over ~15–30 s. Measured the REAL path (OfflineAudioContext, sustained pad chord → the
engine's own reverb, 16 s): a **sustained `padglass`** (the T155 triangle bed) drives the
reverb to **520 / 143 / 112…** — it RAMPS over the reverb's fill, exactly the owner's tell.

### Root cause: the FDN was NOISE-safe but TONAL-MARGINAL
T151 capped decay at 0.78 measured against **white noise** (broadband → bounded). But a
**sustained tonal** pad concentrates energy on an FDN **comb resonance** where the
effective loop gain ≈ 1, so it builds unboundedly over the multi-second tail → rails the
−1.5 dB limiter into the sustained drone. It's **chaotic/marginal** (the same config gave
0.55 one run, 520 the next — the signature of loop gain ≈ 1). The new T155 sustained pads
are the trigger; the 5 s white-noise gate couldn't see it. Decay sweep (worst over sends,
sustained `padglass`): **0.78 → 143**, but **≤ 0.70 → ~0.5**.

### Fix — two lines of defence
1. **Lower the FDN decay to 0.66** (`FDN_DECAY_DEFAULT`/`_MAX`) — subcritical for sustained
   tonal input with margin (measured: all 5 pads bounded ~0.25–1.3 over 16 s; was 143).
2. **Safety compressor on the reverb RETURN** (`buildGraph`: `reverb.output → reverbComp →
   master`, threshold −3 dB / ratio 12). Transparent at the normal wet (~0.5), but caps any
   residual buildup so a runaway **DECAYS to a ceiling, never rails** — defence in depth so
   the foghorn can't come back via some untested tonal mode.

### Gate extended (it would now CATCH this)
`test/browser/audio.test.js`: a **16 s sustained-pad-chord** render per pad asserts the
late window stays bounded ≤ 2 (the 5 s white-noise test missed this class). Teeth: the
pre-fix 0.78 decay foghorns on the triangle pad (worst-over-sends 65–76 ≫ 2; single-send
is unreliable — the divergence is chaotic). `synth.test` asserts the reverb-return safety
compressor is wired + the decay ceiling is the tonal-safe 0.70.

### Verify
- `node -c` clean; `synth.test` **176**; real-audio gate **27**; `golden-synth`/`synth-wiring`
  + full Node suite + all 3 browser gates green. **B-owned (`synth.js` + tests).** *(Also
  re-blessed `visual_audio.json` for an unrelated upstream [A] audio-menu layout shift —
  all elements present, benign; the visual gate caught it as designed.)* Babysitter
  re-measures a long real-music render; owner confirms on device.

---

## T174 — research/art pass: representing an accumulating COIN HOARD ([B], research-first; precedes T172)

Owner wants a Smaug/Scrooge gold hoard on the home backdrop — individual beveled coins,
fed by coins flying in from the earn-point, but **"impression, not physics."** Doc:
**`docs/research-coin-hoard.md`** (B-owned; no engine change yet).

Findings: every stylised "big pile of small things" (DuckTales money bin, Spyro gem
hoards, Clash gold storage, leaf/snow/gravel drifts) uses ONE move — **imply the bulk
with a shaped, lit silhouette + dither shading, and render individual items only on the
SURFACE you'd see, scattered with per-item variation; never simulate the interior.** That
also matches brickmap's house style, so three of its recipes port 1:1: **`hash01` seeded
surface-scatter** (foliage `scatter()` — jitter/size/angle/thinning by salts, density on a
slow hash), **disc-mask splat + centre-bright shading** (`splat.wgsl` → the beveled coin),
and **Bayer dither over a gold luminance ramp** (already in `fxgl.js` → shade the mound
body as scenery, 0 particles).

**Recommended technique (for T172, owner to bless):** a three-layer composite inside the
home backdrop — (A) a **dithered mound silhouette** drawn as scenery (heightfield profile
× `level`, gold ramp + fake-AO dither — carries the "amassed" read at 0 particle cost);
(B) **`hash01`-scattered beveled coins** on a thin crest-weighted band (disc + rim + inner
gradient + specular glint, 3 gold tones, per-coin rotation + squash), count on a
**saturating curve** `level = 1 − 1/(1+gold/K)` quantised to ~6–8 tiers (re-seed only on a
tier change); (C) an **attractor earn-burst** (emit → converge on the hoard → settle).
Caps: surface coins ~120/220/340 (low/med/high), all ≪ the 512 `PARTICLE_CAP`; growth is
coverage/height-driven so it plateaus gracefully; DPR-aware; reduced-motion → a static
pile. Wins/limits + the owner-eye open choices (mound shape/height, curve feel, earn
source, legibility-behind-UI) documented honestly. Babysitter surfaces §3+§4 to the owner
before T172 builds.

---

## T165 — a context SWITCH fully stops the previous generator (no tail / no foghorn) ([B], 🔴 pairs with T164)

Owner (recurring): the switcher "doesn't fully switch — elements of the previous music
continue," and the foghorn returns on switches. Two `synth.js` fixes:

### (1) A real FDN reverb FLUSH on switch (was: only a gain dip)
`releaseMusic` (T134) dipped `reverb.output.gain` to ~0 for 0.13 s — but with decay
0.78 the FDN **delay lines still held ~37% of the tail** when the output recovered →
the old track bled through and the runaway-ish tail fed the sustained low drone (the
foghorn). Added `reverb.flush(t, dur)`: it drives the **feedback gains to 0** for the
window so the delay lines **DRAIN in one pass**, then restores the *live* decay on the
(now empty) lines. `releaseMusic` calls it alongside the output dip. **Real-audio
proof** (OfflineAudioContext, impulse in): post-flush tail energy **0** vs un-flushed
0.0238 — the tail is gone, no carry-over past a swap.

### (2) Idempotent `setContext`
`setContext(current)` while playing is now a **no-op** (tracked via `M.contextName`,
exposed on `musicState().context`). A redundant same-context call used to re-release +
re-seed the SAME track and re-fire the swap transient/tail — which read as "not fully
switching." Defence-in-depth with T164 ([A] stops the needless calls). A *real* switch
still releases the old voices, flushes, and re-aligns to a downbeat (T132/T134 intact).

### Verify
- `node -c` clean; `synth.test` **174** (idempotent no-op fires no flush; a real switch
  drives feedback→0 + releases voices; `flush()` restores the live decay, not a
  constant); `golden-synth` + `synth-wiring` green; real-audio gate **20** (flush drains
  the tail). **B-owned (`synth.js` + tests) only.** Babysitter measures the switch
  transient via OfflineAudioContext; owner's ear is the final word.

---

## T163 — firm up the brittle `visual_arena` golden ([B], follow-up to T154)

T154's `visual_arena` golden captured a per-cell hue grid, but the Arena's content is
**dynamic** (3v3 enemy team + death-VFX + gold vary per run / environment), so a single
cell would flip → spurious mismatch (it violated T154's own "robust signature, not a
brittle pixel diff" rule). Fix: a `dynamic` flag on the screen config — dynamic screens
(Arena) now sign as **`{active, element-PRESENCE booleans}`** only (no volatile colour
grid / bbox). Structurally stable across runs+environments, still catches "arena broke /
key control gone". Re-blessed `visual_arena`. Colour precision stays where there's a
fixed baseline (home flagship + home/audio grids — both byte-identical, untouched).
Verified: `node -c` clean, deterministic over 3 runs, full suite + all 3 browser gates
green. B-owned (`test/browser/visual.test.js`, `test/golden/visual_arena.json`).

---

## T154 — key-screen VISUAL-REGRESSION gate (extends the T150 harness) ([B], proactive)

The session's recurring pain: visual regressions only the owner catches (the blue
home backdrop, the celebration `0×0`, layout clips) — the Node suite is blind to
pixels. Generalised T150's render harness into a per-key-screen gate:
`test/browser/visual.test.js` loads the REAL app @ 390×844 / dpr 2.75 and captures a
ROBUST (not brittle-pixel-diff) signature per screen, committed as goldens
(`UPDATE_GOLDEN=1` re-blesses intentional changes).

### What it captures (robust by construction)
- **Hue-CLASS grid** per screen (4×8 regions): the full-page screenshot is round-
  tripped through the browser's own decoder (→ `drawImage` downscale → `getImageData`,
  no hand-rolled PNG parser, no WebGL read-back caveat) and each cell is classified
  to a colour FAMILY (`purple`/`blue`/`warm`/…) — a category, so render noise can't
  flake it, but a purple→blue drift flips cells.
- **Element presence + 5%-bucketed bbox** of each screen's critical controls (home:
  `startBtn`/`modeTree`/`navRow`/`goldBar`; audio: `musicSwitch` + the 3 ranges;
  arena: `arenaMeta`/`arenaBody`/`arenaFight`). A missing/moved control is caught.
- **FLAGSHIP — the home backdrop hue.** Screenshots `#fxBackdrop`, averages it, and
  asserts it classifies **`purple`** (T153's fixed brand colour: avg rgb ≈ 69,49,98 →
  B-high, R>G). The exact regression that shipped (purple→blue) FAILS here.
- Screens covered: **home, Audio menu, Arena** (arena via a `halves.unlocked={legacy:1}`
  init-script). *(Results has no hash route — it's post-game — so it's out of this
  static gate; a follow-up could drive a game to it.)*

### Determinism + teeth
- `reducedMotion:'reduce'` → FXGL renders a STILL frame; coarse hue-classes + bucketed
  bboxes → **byte-stable** (verified over repeated runs). Each screen is loaded FRESH
  (the T157 back-gesture history sentinels hijack in-page hash-hopping: audio→arena
  landed on settings — a fresh load per screen avoids it).
- **Teeth proven in-gate:** a blue backdrop (rgb 63,151,216) classifies `blue` ≠
  `purple` (flagship would fail); and the signature compare CATCHES a single region
  hue flip (purple→blue) and a missing critical element (layout regression).
- Opt-in/guarded (skips clean with no browser → Node-only CI unaffected); screenshots
  saved to `test/browser/screenshots/`.

### Verify
- `node -c` clean; 13 checks green, deterministic across runs; full Node suite + all
  three browser gates (render/audio/visual) green. **B-owned** (`test/browser/*` +
  `test/golden/visual_*`). *(If a headless browser ever joins CI, [A] can register
  `test/browser/*.test.js` in `pages.yml` — until then it runs locally/on-demand.)*

---

## T155 — distinct PAD/bed timbre per style (kill the shared "synth string") ([B], OWNER-PRIORITY)

Owner (2026-06-22): **"every style seems to share the same synth string sound… makes
them feel a little samey."** Root cause: all 12 contexts set `pad: "pad"` — the
identical detuned-**sawtooth** unison bed. The leads/bass already varied; the **pad —
the most continuously-audible voice — was the same saw everywhere.**

### 4 new PAD-class beds (`PATCHES`) — genuinely different SPECTRA, not cutoff tweaks
Built on the existing engines (no new engine needed):
| pad | engine/wave + filter | character |
|---|---|---|
| `pad` (kept) | unison **saw** + lowpass 1100 | warm analog bed |
| `padglass` | unison **triangle** + soft lowpass 2000, very slow swell | airy/glassy choir |
| `padep` | **fm** (ratio 1, index 110) + mellow lowpass, sustained | electric-piano / Rhodes |
| `padpwm` | unison **square** + brighter lowpass 2800, snappy | retro/chip hollow bed |
| `padorgan` | unison **square** through a **bandpass** (cut 760, Q7), stabby | hollow organ stab |

**Per-style mapping** (5 distinct beds across the 12): saw → arena/synthwave/bigroom ·
glass → menu/ambient/tropical · ep → lofi/dnb · pwm → chiptune/boss8bit · organ →
dubstep/techno.

### Proven SPECTRALLY distinct (the output-feature rule — golden pins names, not timbre)
Measured each pad's **spectral centroid** via real `OfflineAudioContext` + an FFT (new
section in `test/browser/audio.test.js`): `padep 189 · padglass 457 · padorgan 1054 ·
pad 1436 · padpwm 1897` Hz — a **1708 Hz** spread, min adjacent gap **268 Hz** (≥150
floor) → audibly different beds, not one reskinned oscillator. (`padorgan` was tuned —
bandpass Q 3→7, env→0.15 — to separate it from `pad`; was 71 Hz apart, now 382.)

### Verify
- `node -c` clean. **`golden-synth` UNCHANGED** (its scores pin role+midi *events*, not
  patch names — so the timbre swap correctly causes **no** score churn; the DoD's
  "re-bless" wasn't needed). `synth.test` now asserts ≥5 distinct pad beds, all with
  distinct signatures, spanning ≥3 waveforms + ≥2 filter types, and that the 12 styles
  use ≥4 distinct beds. Full Node suite + both browser gates green.
- 🔊 **Babysitter:** independently measure the per-style pad spectra (centroids above).
  Final "less samey?" is the owner's ear. **B-owned only** (`synth.js` + its tests).

---

## T152 — celebration particles: small/fine size + spread + off-centre emission ([B] engine side)

Owner: **"very small particle sizes, emanating from the point of interest (e.g. where
the inventory toast appears), colour-coded."** Colour + arbitrary `{x,y}` + `palette`
were already accepted by `seedBurst`/`seedCelebrate`; this adds the **size** + **spread**
levers and proves off-centre small bursts stay visible. (The `main.js` call-site wiring
— emit from each source element's rect, pass the small size — is the **[A]** half.)

### Engine additions (`fxgl.js`) — opt-in, defaults byte-identical
- **`sizePx`** (explicit MAX particle size, screen px) and **`sizeScale`** (multiplier)
  → small/fine particles. Floored at **`MIN_PARTICLE_PX = 2`** screen px so "small"
  stays crisp on-device (DPR-aware via the T138 `pxScale` / GL `uRes` path) and never
  goes sub-pixel/invisible. `sizeRange(opts, defMin, defMax)` resolves the range.
- **`spread`** (1 = default, `<1` hugs the source point — "emanate from the thing",
  `>1` wider) scales the outward spray (`spreadMul`, clamped 0.05–4).
- Both `seedBurst` + `seedCelebrate` use them; with no opts the lerp args are
  **identical**, so the goldens + determinism hold (verified: `golden-fx` unchanged).
- Exposed `MIN_PARTICLE_PX`, `sizeRange`, `spreadMul` for tests/inspection.

### Visibility gate extended (the T138 rasteriser → off-centre + small)
`test/golden-fx.test.js` now also fires a **small (`sizePx:5`), tight (`spread:0.4`),
OFF-CENTRE (0.8,0.3)** celebrate and rasterises it: asserts real in-bounds coverage
(19 220 lit px), on-screen size **5.1 px** (≥ floor 2, **<** the bold-default ≥8), and
the coverage **centroid sits on the source** (0.80,0.24 ≈ 0.80,0.30 — not screen-centre
0.5,0.55). Plus property checks: `sizePx` caps+floors the size and is clearly finer
than bold; `spread<1` cuts horizontal travel (0.10 ≪ 0.33). New golden
`fx_small_offcentre`.

### Verify
- `node -c fxgl.js` clean; `fxgl.test` + `golden-fx` **35** (was 28) green; full Node
  suite + both browser gates green.

### [A] hand-off (the T152 wiring half)
At each celebration call site in `main.js`, replace `x:0.5,y:0.55` with the **source
element's normalised centre** (`el.getBoundingClientRect()` → `/innerWidth,/innerHeight`)
and pass **`sizePx`** (small, e.g. 4–6) + the existing rarity/rank/topic `palette`
(+ optionally `spread<1` to hug the source): inventory toast → toast rect + rarity
palette; rank → rank-badge rect + rank colour; mastery → topic node/banner + topic
accent; arena win → defeated-enemy portrait rect + gold/hero. Engine is ready.

---

## T151 — synth output DIVERGES exponentially: non-resonant damping + a measured decay cap ([B], OWNER-PRIORITY BUG)

**Owner-priority, browser-measured.** The Babysitter tapped an `AnalyserNode` on
`Synth.output()` (= `E.master`, pre-limiter) in headless Chromium: the master output
grew **exponentially in every context, even with no switch** (menu peaked
`0.36→1.93→7.42→33.6→159` over 3 s). The brickwall limiter then clamped a 30–160×
signal → escalating distortion = the owner's "audio sounds bad."

### Two independent fixes (the first alone was a PARTIAL fix — see below)
The engine's only feedback path is the **FDN reverb**. **(1)** Its **damping lowpass**
ran at the Web-Audio **default Q=1**, which (Web Audio reads a `"lowpass"` Q in dB,
linear `10^(Q/20)`) is a **+2 dB RESONANT peak (~1.25× linear) AT the cutoff** that
multiplies the feedback loop gain (`decay×1.25 > 1` for any `decay ≳ 0.8`). Set it to
**Q = −3.0103 dB = linear 0.7071, maximally-flat Butterworth** — *measured* real-Web-
Audio peak gain is exactly **1.0** (passive). **(2)** But that alone was a **partial
fix** (Babysitter re-measured: menu/lofi/dubstep bounded ✓, but `ambient` — `reverbDecay
0.9` — still blew up to 1096). Even with a perfectly *passive* filter the real FDN
grows a pole outside the unit circle above ~0.82 (the ideal "`0.5·H` orthonormal ⇒
stable for decay<1" misses real biquad / fractional-delay gain). So the tail decay is
**CLAMPED to 0.78** (`FDN_DECAY_MAX`, the default), comfortably below the cliff.

### How decay 0.9 false-greened my first gate — and the fix
My first gate was an **analytic** sample-level FDN sim; it *declared* 0.9 stable, but
the **real Web Audio diverged** — the idealised model missed the excess gain. Replaced
it with TWO honest gates, measured against an OfflineAudioContext ground truth
(real `BiquadFilter`s, 5 s continuous excitation @ the 0.22 send level):
`peak 0.45 @ decay 0.78 · 0.45↔2.4 @ 0.80 (ON the cliff) · 2.4 @ 0.82 · 9.9 @ 0.83`.
- **`test/synth.test.js`** (Node, in CI) — a **constant invariant**: `dampQ ≤ 0`,
  `decayMax ≤ 0.78`, and **every** style's effective decay ≤ 0.78. Can't false-green
  (it checks the shipped constants vs the measured-safe envelope, no simulation).
- **`test/browser/audio.test.js`** (real audio, opt-in) — renders **all 12 styles'
  ACTUAL reverb** (`Synth.makeReverb`) through an `OfflineAudioContext` for 5 s and
  asserts **peak ≤ 2** (measured worst **0.586**). Teeth: the same render at the old
  unclamped `0.9` **diverges** (peak 6.0e6 ≫ 2) — the exact case the analytic model
  false-greened.

`ambient` keeps its washy identity via its high reverb **SEND (0.55)** + slow 60 BPM,
not a longer decay. Exposed `Synth.reverbParams()` (FDN topology + `dampQ` + decays).

### Verify
- `node -c synth.js` clean. `test/synth.test.js` **161**, `golden-synth` 19,
  `synth-wiring` 52, `sound` 50, full Node suite — all green. Real-audio gate: **14**
  checks, all 12 styles bounded ≤ 0.586 in REAL Web Audio.
- 🔊 **Babysitter re-measure:** the `AnalyserNode` peak on `Synth.output()` should now
  stay bounded (≤ ~2) over ≥5 s in **every** context incl. `ambient`, and across switches.

---

## T150 — autonomous BROWSER-RENDER gate (Playwright) — catch "rendered but invisible" ([B], PROCESS-FIX)

Our whole Node suite is stub-only — it can't see a rendered pixel or `display:none`,
which is exactly how the celebration bug (T149) hid through six rounds. New B-owned,
**opt-in** browser gate (skips cleanly → Node-only CI unaffected):
- **`test/browser/render.test.js`** — loads the REAL app in headless Chromium at a
  **phone viewport + dpr 2.75**, captures JS errors (resource-load noise filtered),
  fires the **real celebration** (the production FX-tester handler), and asserts
  `#fxBurst.clientWidth>0` **AND** measured lit-pixel coverage (~3.8e5 px). **Teeth:**
  re-nests `#fxBurst` in a `display:none` wrapper → asserts `clientWidth===0` (the
  exact T149 signature) → the gate would have caught T149 instantly. Saves screenshots.
- **`test/browser/_harness.js`** — shared Playwright resolve + read-only static server.
- Run: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node test/browser/render.test.js`.

**[A] hand-off:** these browser gates are opt-in (skip without a browser). If we ever
add a headless browser to CI, register `test/browser/*.test.js` in `pages.yml` (an [A]
task) for a real regression guard; until then they run on demand / locally.

---

## T138 — celebration STILL invisible: the REAL cause (DPR downscale) + a visibility gate ([B])

**Status: DONE — handed off for review.** B-owned files only (`fxgl.js`,
`test/golden-fx.test.js` + goldens); **zero edits to any existing Halves file.**

### ⟵ CORRECTED diagnosis (owner's tester readout = `1038×2305`, ready)
The canvas is **full-size**, so it was **NOT** the resize/occlusion cause my first pass
guessed. The real bug: the buffer is `dpr·res`× the CSS size (≈**2.75×** on the Poco
X3) and the browser **downscales it back** — so particles drawn at **6–18 buffer px
showed at only ~2–6 SCREEN px**, fading out = *drawn (the count-golden passed) but
invisible*. **Primary fix:** the CPU 2D path now **scales the draw size by the
buffer/CSS factor** (`pxScale = dpr·res`, set on resize) so a particle shows at a
**constant ~6–18 SCREEN px** regardless of DPR (floor 2). Celebration sizes bumped to
**6–18** for boldness. (The re-fit + `canPresent()` from the first pass are kept as
defensive — harmless, and cover the other candidates if they ever bite.)

### Engine changes
- **`pxScale` size-up** (the real fix) — particles draw at a visible *screen* size after
  the DPR downscale, not `size/dpr` (≈1.5–3px = the invisibility).
- `_ignite()` **re-fits the canvas** before drawing (fire-before-layout 1×1 defence).
- **`controller.canPresent()`** surfaces a null 2D context (canvas bound to a stale GL
  context → an [A] re-mount), and particles **floor to ≥2 px**.

### The REAL visibility gate (rasterised — the structural guard)
The T133 golden only **counted `fillRect` calls** (a transparent/off-canvas/tiny draw
passes it — how this hid). Added a **rasteriser** that paints each rect (with alpha)
into an in-bounds pixel buffer and measures **(a) lit coverage** AND **(b) on-screen
particle size**. At the owner's `1038×2305` device the celebrate frame now paints
**~572k lit px (24% coverage)** at **~17.8 SCREEN px** particles; the gate **fails** on
a zero-coverage / 1×1 frame (demonstrated) *and* would fail if particles shrank back
below ~8 screen px (the actual bug). `fx_celebrate_visibility` golden committed.

### Root-causes addressed (engine side)
1. **Fire-before-layout 1×1 buffer** (the likeliest): a celebration is often fired
   right after mount / before layout settles, leaving the canvas at **1×1** (→ nothing
   visible). **Fix:** `_ignite()` now **re-fits the canvas (`_applyResize()`) before
   drawing**, so a burst/celebration always sizes itself to the live viewport
   regardless of when the [A] caller's `resize()` ran. (Verified: a 360×640@dpr2
   canvas with no explicit resize now draws at 720×1280.)
2. **Null 2D context** (the other candidate — canvas already bound to a WebGL/WebGPU
   context, so `getContext("2d")` returns null and the backend silently no-ops): added
   **`controller.canPresent()`** so the tester can *surface* it (true = real context;
   false = re-mount on a fresh canvas — an [A] fix). 
3. **Sub-pixel safety:** particles now floor to **≥1 device px**.

### The REAL visibility gate (the structural guard the owner needs)
The T133 golden only **counted `fillRect` calls** — a transparent / off-canvas / 1×1
draw passes it, which is *exactly* how this stayed green while invisible. Added a
**rasterised** check: a test context that actually **paints each rect (with its alpha)
into an in-bounds pixel buffer** and measures lit coverage. The celebrate frame paints
**~56 000 lit px (6.1% of a 720×1280 canvas)**; the check **fails on a zero-coverage /
1×1 / off-canvas frame** (demonstrated: a 1×1 buffer → ≤1 lit px → the check trips).
Committed as `fx_celebrate_visibility`.

### Verify
`node -c` clean; `golden-fx.test.js` (+ the rasterised visibility checks +
re-fit/`canPresent` engine tests); full suite green. **On-device confirmation is the
owner's check** (green gates necessary-not-sufficient — this hid behind them before);
the re-fit fixes the most likely cause and the gate now catches a recurrence.

### Hand-off to Builder A
- The overlay now self-sizes on `celebrate()`, so the shower should present. If the
  owner's tester shows **`canPresent() === false`** (or `dimensions()` 0×0), the
  `#fxBurst` canvas is bound to a stale GL context → **re-mount it on a fresh
  `<canvas>` element** (that's the [A]-side residual).

---

## T139 (part 2) — the 12-style palette (owner-approved) · DONE

**Status: DONE — handed off for review.** B-owned files only (`synth.js`,
`test/synth.test.js`, `test/golden-synth.test.js`, `test/golden/synth_score_*.json`);
**zero edits to any existing Halves file.** Owner OK'd the T141 palette ("move ahead…
add them to the song picker"); built the 12 from `research-music-styles.md` §2.

### The 12 styles (`CONTEXTS`) — `id` · **label** (for A's T140 launcher + routing)
1. `menu` · **Neon Lobby** *(kept)* — bright Ionian lobby
2. `arena` · **Phrygian Onslaught** *(kept)* — dark driving wub
3. `lofi` · **Lo-Fi Study** — swung 76 Dorian, soft *(calm; route the solve screen here)*
4. `ambient` · **Ambient Drift** — 60 Lydian, **drumless**, very wet long tail *(calm)*
5. `chiptune` · **Chiptune Rush** — 150 pentatonic square arps, dry *(uses `chip`)*
6. `synthwave` · **Synthwave Cruise** — 112 Aeolian, gated-snare arp
7. `dubstep` · **Dubstep Victory** — 140 half-time wobble + **the DROP win-sting** (`victory:true`)
8. `dnb` · **Liquid DnB** — 174 breakbeat + wobble sub
9. `bigroom` · **Festival** — 128 four-floor Lydian *(festive; route events here)*
10. `boss8bit` · **8-Bit Boss March** — 140 Phrygian square march *(uses `chip`)*
11. `tropical` · **Tropical Pluck** — 104 swung Mixolydian, airy
12. `techno` · **Hypno Techno** — 126 four-floor minimal wob

`Synth.STYLE_IDS` = the 12; **`Synth.styles()`** → `[{id,label}…]` for the launcher.
The win sting: **`Synth.sting("victory")`** fires the Dubstep Victory drop (T139 pt1).

### [A] hand-off (T140)
- List `Synth.styles()` (12 labels) in the switcher; `setContext(id, {now:true})` to
  audition. Route screens to styles: **solve→`lofi`**, menu→`menu`, arena→`arena`
  (+`intensity()`), events→`bigroom`. Fire **`Synth.sting("victory")`** on a win.
- **Back-compat:** `CONTEXTS.solve`/`.event` are kept as **aliases** (→`lofi`/`bigroom`)
  so pre-T140 routing keeps playing; **drop them in T140** once screens use the named ids.

### Verify
`node -c` clean; `synth.test.js` **144** (12-style spread, ambient drumless, dubstep
wobble+victory, `styles()` labels); **`golden-synth`** now pins **all 12** score goldens +
the **all-12 mutual-distinctness** gate (regenerated — intentional; old solve/event
score goldens removed). All gates green.

---

## T139 (part 1) — the no-regret engine ADDITIONS the 12-style palette needs ([B])

**Status: additions DONE — CONTEXTS HELD for the owner's palette OK.** B-owned files
only (`synth.js`, `test/synth.test.js`); **zero edits to any existing Halves file.**
Per the pointer: don't finalise the 12 style rows until the owner thumbs-ups the
T141 palette (a style may be swapped) — but build the additions that are wasted by no
outcome. Done; the `CONTEXTS` swap + golden-distinctness-to-12 lands once the owner OKs.

### Additions shipped (all tiny, opt-in, tested)
1. **Tempo-synced wub wobble** — a context `wobble` (cycles-per-beat) locks the wub
   LFO to the beat (`rate = tempo/60 × wobble`); `renderVoice` takes an optional
   `lfoRate`, the scheduler computes it for `sub`-engine voices. (dubstep/dnb/techno)
2. **`chip` patch** — a fast, snappy square pluck (`{a:.001,d:.06,s:0,r:.02}`,
   bright filter) for chiptune/8-bit arps.
3. **Swing** — a context `swing` field delays the off-16ths by a fraction (the grid
   stays even, only the scheduled time shifts → a real groove). (lofi/tropical)
4. **Per-context reverb decay** — `makeReverb` exposes `setDecay` (rescales the FDN
   feedback, stays < 1 = stable); `Synth.setReverbDecay` + `setContext` apply a
   style's `reverbDecay` (a long tail for ambient, short for dry styles).
5. **The victory DROP** — `sting("victory")`/`"drop"` is now a real audible dubstep
   drop: a filtered-**noise riser** builds, then a heavy **sub-wub** (tempo-synced
   wobble) + a **kick** + a bright **stab** + a sparkle land together — on the
   **un-ducked SFX bus** so it cuts THROUGH (the T128 lesson), ducking the music bed.
   (Replaces the old subtle wub+bell the owner said "doesn't seem to exist".)

### Verify
`node -c` clean; `synth.test.js` **142** (+12): wobble locks to tempo×cycles, the
chip square pluck, swing shifts off-beat timings, `setReverbDecay` rescales the tail,
the victory drop is a one-shot full gesture (riser+sub-wub+kick+stab) that ducks the
bed. All gates green; `golden-synth` unchanged (CONTEXTS untouched this push).

### Next (on owner OK → T139 part 2)
- Replace `CONTEXTS` with the agreed 12 (keep menu/arena; drop solve/event; the 10
  new from `research-music-styles.md` §2, using `wobble`/`swing`/`reverbDecay`/`chip`),
  extend `golden-synth` distinctness to all 12 (regen intentional), hand A the final
  names/labels for T140.

---

## T141 — research: musical styles → a concrete 12-style palette ([B], doc; precedes T139)

**Status: DONE — handed off for review.** New B-owned file only
(`docs/research-music-styles.md`); **zero edits to any existing Halves file.** Owner:
keep **menu**+**arena**, the others feel samey, bring back the **dubstep victory** —
*"a research pass to really get those 10 new styles unique/interesting,"* then a
12-style launcher palette. Same T119→T120 pattern (research → engine).

### What shipped
- **`docs/research-music-styles.md`** — the genre DNA (tempo · mode/progression ·
  rhythmic feel · instrumentation/register · the production trick that makes it
  recognisable) of a spread of styles, each **mapped to this engine's levers**
  (modes, Euclid kit, patches pad/pluck/bass/bell/lead/wub, ADSR, FDN reverb,
  density, root, leadOct), ending in a **concrete 12-row `CONTEXTS` table** T139 can
  implement directly.
- **The 12** (menu+arena kept; 10 new): Lo-Fi Study *(calm/solve)*, Ambient Drift
  *(calm)*, Chiptune Rush *(festive)*, Synthwave Cruise, **Dubstep Victory** *(the
  drop / win sting)*, Liquid DnB, Festival *(festive)*, 8-Bit Boss March, Tropical
  Pluck, Hypno Techno. Spread: tempo **60→174**, 8 modes, feels span
  drone/swung/half-time/backbeat/four-floor/breakbeat/march, reverb 0.04→0.55.
- **Flagged the small engine additions** T139 needs (all tiny, no-build): a
  **tempo-synced wub wobble** (dubstep/dnb), a `chip` square-pluck patch (chiptune/
  8-bit), an optional scheduler **swing** (lofi/tropical), an optional per-context
  reverb decay (ambient), and the **dubstep victory drop** (a `sting()` build→drop on
  the **un-ducked SFX bus** — the T128 lesson). Every style renders on *today's*
  patches; the adds just sharpen 3–4.
- 4 cited references (dubstep/chiptune/synthwave DNA, web-researched) + the prior
  `research-generative-audio.md`.

### Next
- **Babysitter surfaces the 12-row palette to the owner for a thumbs-up** (owner may
  swap a style). Then **T139** [B]: implement the 12 in `CONTEXTS` (replace solve/
  event), build the dubstep victory drop + the flagged patch adds, extend the
  `golden-synth` distinctness gate to all 12, and hand A the final names/labels for
  the T140 launcher/wiring.

---

## T134 — clean immediate context-swap (no overlap) + audible distinctness ([B])

**Status: DONE — handed off for review.** B-owned files only (`synth.js`,
`test/synth.test.js`, `test/golden/synth_score_*.json`); **zero edits to any existing
Halves file.** Off stand-by: owner live on the T129 switcher — *"sounds like the
songs play over each other rather than switching, or they sound really similar."*
Both real, both engine-side (the live wiring drives `Sy.setContext` + `Sy.swapNow`
on my `CONTEXTS`, so these land).

### (a) Clean swap — no layered overlap
The T132 instant `swapNow()` reset the generator but left the old voices + the
multi-second FDN-reverb tail ringing **over** the new context (and rapid taps piled
tails up). Fix (immediate path only — the default phrase swap keeps its musical ring):
- **Track the live music voices** (`renderVoice` now hands its amp param back; the
  scheduler registers each on `M.active`, pruned as they end).
- **`releaseMusic()`** on `swapNow()`: fast ~75ms release of every active voice
  (`cancelAndHoldAtTime`→`setTargetAtTime`, no click), a brief music-bus fade-out→in,
  and a dip of the **reverb output** to kill the carry-over tail — so a switch **cuts
  in cleanly**.

### (b) Audible distinctness
`solve/menu/event` were too alike (shared pad+bass+pluck/bell, close tempo, differing
only by mode). Reworked all four `CONTEXTS` to spread across **every** audible lever
(register/instrumentation/tempo/density/kit), keeping calm-solve ↔ energetic-arena:
- **solve** — 72 BPM, low (root 50) Dorian, **DRUMLESS**, sparse, wet, soft pad+pluck (intimate).
- **menu** — 96 BPM, Ionian, a **high bell** lead, light kit (welcoming).
- **event** — 112 BPM, **high** Lydian, dense, busy hats, bright pluck (festive/sparkly).
- **arena** — 124 BPM, low **Phrygian** (darker), full driving kit + the **wub** bass, dry (energetic).
- Added `snareK` to `normalizeMusic` (so solve can be fully drumless).

### Verification
`node -c` clean; `synth.test.js` **130** (+10): the immediate swap releases voices
(`activeVoices→0`) + taps the reverb/bus fades; the **default swap does NOT** release
early (ring intact); the four contexts differ on 4 distinct tempos / roots / modes,
solve drumless, varied lead instrumentation. `golden-synth` scores **regenerated**
(intentional content change) and **still mutually distinct**. All gates green.
*(Headless proves the mechanism + distinctness; the owner's ear is the final check —
flagged.)*

### Hand-off to Builder A
- No API change needed — the existing `setContext(name)` + `swapNow()` path now cuts
  cleanly and the contexts are clearly distinct. (For a deliberate switch keep using
  `swapNow()`/`{now:true}`; screen-driven music may use the default phrase swap.)

---

## T133 — make the overlay CELEBRATION actually render on-device ([B], engine gap)

**Status: DONE — handed off for review.** B-owned files only (`fxgl.js`,
`test/fxgl.test.js`, `test/golden-fx.test.js` + a new golden); **zero edits to any
existing Halves file.** Off stand-by: A's T125 `fxBigBurst`→resize→`celebrate()`
wiring is correct + tested but shows **nothing live** — `#fxBurst` is a **2nd
WebGL/WebGPU context**, which mobile GPUs (the Poco-X3 target) commonly refuse/lose,
so the z-58 overlay never presents.

### The fix (route b: a Canvas2D overlay — always presents)
The diagnosis is a GPU-context-count limit, not a logic bug. A **Canvas2D** context
has **no** such limit, so it reliably inits + presents. The engine's `CPUBackend`
already draws particles via `fillRect`; I added a way to **force** it:
- **`FXGL.mount(canvas, { backend: "2d" })`** (or `{ canvas2d: true }`) → `_init`
  selects the **Canvas2D backend up front**, bypassing WebGL/WebGPU entirely (no 2nd
  GL context is ever requested). It still **animates** `burst()`/`celebrate()` (the
  loop drives `renderFrame` → `fillRect` per particle, the same closed-form
  trajectory as the GL path), auto-stops, frees its buffer, honours
  reduced-motion/`setQuality`.
- Hardened the GPU fallback too: `_initSync` now routes its no-GL fallback through
  the shared `_initCanvas2D()`.
- Added `controller.dimensions()` + `isReady()` so the overlay's **ready + non-1×1
  size** can be asserted before it draws (the invisible trap).

### Verify (break the "green-but-invisible" trap)
- Headless: the forced-2D overlay reaches **ready + sized 360×640**, and a
  celebration **actually draws** — **9632 `fillRect`s across the shower**, 600 in a
  single mid-shower frame (a regression to "renders nothing" makes these 0 → fail).
- **A new golden `fx_celebrate_2d_frame`** snapshots the real Canvas2D-overlay frame
  (the drawn-rect distribution in an 8×6 grid + count) — so a future "renders
  nothing" collapses it to empty and **fails CI**.
- Tests: `fxgl.test.js` **124** checks; `golden-fx.test.js` **19**. `node -c` clean;
  all gates green. *(Headless proves it draws; final on-device confirmation is the
  owner's live check after A re-points `#fxBurst` — flagged below.)*

### Hand-off to Builder A
- Mount the **`#fxBurst` overlay with `{ backend: "2d" }`** (a Canvas2D context at
  z-58, in front of the panels) instead of the failing 2nd GL context; keep the
  backdrop (`#fxBackdrop`) on WebGL/WebGPU as-is. `celebrate()` then presents the
  shower over the UI. (The backdrop stays the single GL context; the overlay is 2D —
  no context-count conflict.) Register the two golden gates in `pages.yml` (still the
  [A] step, as for the other gates).

### Next (Builder B)
- Back to reactive stand-by unless another engine gap surfaces.

---

## T132 — `synth.js` immediate context-swap lever ([B], engine gap from T129)

**Status: DONE — handed off for review.** B-owned files only (`synth.js`,
`test/synth.test.js`); **zero edits to any existing Halves file.** Off stand-by:
A's T129 music-switcher surfaced a real engine gap — the scheduler adopted
`M.spec = M.want` **only at a phrase boundary**, so a deliberate `setContext` lagged
up to ~one phrase (~8–11 s), which the owner read as "music never changes."

### What shipped
- **`Synth.setContext(name, { now: true })`** and **`Synth.swapNow()`** — when
  `now`, **adopt the pending spec immediately**: force `M.spec = M.want`, re-align the
  phrase counter (`M.step`/`M.phrase` → 0, a clean **downbeat** entry), reset the
  melodic state, and reseed. So the new context's harmony/patches/reverb take effect
  on the **next scheduled step (≤1 step)**, not the next phrase.
- **No click/dropout**: respects the existing lookahead — already-scheduled notes
  finish; only the *generator* switches now. **Default (no `now`) is unchanged** (the
  musical phrase-boundary swap).
- Added a tiny `Synth.musicState()` introspection (spec/want/step/phrase/playing) for
  tests + the [A] wire.
- Tests +9 (now **120**): default `setContext` mid-phrase does NOT swap (lag
  preserved) and adopts at the next phrase boundary (unchanged); `{now:true}` flips
  the generator **immediately** (new mode/tempo, `step===0`) and the next scheduled
  step plays from it; `swapNow()` adopts a pending want; `{now}` lands exactly the
  target context's spec. The assertions **distinguish ≤1-step from ≤1-phrase**.

### Hand-off to Builder A
- For an instant switch in the T129 Settings music-switcher (and any deliberate
  context change), call `Synth.setContext(name, { now: true })` instead of the bare
  `setContext(name)`. Screen-driven music can keep the default (musical) swap.

### Next (Builder B)
- Back to reactive stand-by unless the owner wants more / another gap surfaces.

---

## T130 — Golden-snapshot harness (brickmap-style render-regression) ([B])

**Status: DONE — handed off for review.** New B-owned files only
(`test/golden-util.js`, `test/golden-fx.test.js`, `test/golden-synth.test.js`,
`test/golden/*.json`); **zero edits to any existing Halves file.** The structural
fix for the recurring "green gates, broken feature" gap (T118/T125/T128): source-grep
gates don't see output; **golden snapshots of actual output do.**

### Studied brickmap's golden-render
`docs/milestones/D1-headless-render.md` + `development.md`: brickmap renders a known
scene offscreen, compares to a **committed reference within tolerance**, regenerates
on demand. Its GPU/llvmpipe/PNG capture is **native-only** → out of scope; I ported
the **idea** (deterministic output → compact committed golden → compare-or-regen) to
our headless engine outputs. GPU/WebGL/full-layout goldens need a browser
(Puppeteer) — noted as a future opt-in, kept CI Node-only.

### What shipped
- **`test/golden-util.js`** — `check(name, value)`: default run **compares** the
  value against `test/golden/<name>.json` and **fails with the first differing line**;
  **`UPDATE_GOLDEN=1`** **regenerates** them (the "new things show up" workflow).
  Goldens are compact, committed, diff-reviewable JSON.
- **`test/golden-fx.test.js`** — pins the **FXGL CPU-still** render of representative
  scenes (Arena biome r9-boss, home backdrop, a Frostpeak scenery grid) as a
  downsampled 12×9 rgb signature (quantised /16 = tolerance), plus **`burst()` and
  `celebrate()`** particle distributions (8×6 occupancy grid + live count) at fixed
  seeds/times — the exact closed-form trajectory the GPU/CPU backends use. Includes a
  **self-check that a one-cell render change is CAUGHT**.
- **`test/golden-synth.test.js`** — pins each context's **deterministic scheduled
  score** (first 32 steps' events, mirroring `musicTick`'s phrase-seeding) for
  solve/menu/arena/event, **and asserts they are MUTUALLY DISTINCT** — the explicit
  golden that would have caught **T128 ("every context sounds the same")**.
- Verified the harness **catches a deliberate mutation** (a perturbed golden →
  exit 1 + a precise diff hint) and **passes** after an intentional `UPDATE_GOLDEN`
  regen. `node -c` clean; full existing suite green.

### Hand-off to Builder A (CI gate registration)
- The collision rule keeps `pages.yml` [A]-owned, so (as with `fxgl.test.js`/
  `synth.test.js`) **[A] registers the two gates** in `.github/workflows/pages.yml`:
  `node test/golden-fx.test.js` and `node test/golden-synth.test.js`. They're
  gate-ready (exit non-zero on any unexpected render/score change). Workflow for an
  intended change: `UPDATE_GOLDEN=1 node test/golden-*.test.js`, review the JSON diff,
  commit.

### Next (Builder B)
- Back to reactive stand-by unless the owner wants more; the harness can later be
  extended (glyph/icon goldens are a possible [A] adoption).

---

## T126 — FXGL: a BIG "celebration" burst mode (loads of particles) ([B])

**Status: DONE — handed off for review.** B-owned files only (`fxgl.js`,
`test/fxgl.test.js`); **zero edits to any existing Halves file** (the [A] wire is
T125). Off stand-by: the owner wants celebrations with "loads of particles" — the
T94 burst (cap 256) reads as too subtle.

### What shipped
- **`FXGL.celebrate(opts)`** (and `controller.celebrate`) — a big firework/shower:
  `seedCelebrate` seeds **far more, bigger, longer-lived** particles with a **tall
  upward launch + gravity fall** and a **bright festive default palette**, capped at
  a new **`CELEBRATE_CAP = 800`** (vs the burst's 256).
- **Reuses the entire T94 burst pipeline** — same particle shape, same **closed-form
  in-shader trajectory** (the burst VS/FS, instanced, one draw/frame — **no
  per-particle JS**, so 800 stays in the Poco-X3 budget), same transient subsystem.
  Refactored `burst()`/`celebrate()` to share `_ignite()`, so the celebration
  **inherits every invariant**: seeded/deterministic, **auto-stops + frees its
  buffer**, single-RAF/no-leak, coalesces with in-flight bursts.
- **Reduced motion → a calmer, smaller, shorter shower**; **`setQuality` degrades the
  count** (cap scales with the quality particle budget); GPU→CPU fallback intact.
- **No regression**: `burst()` still caps at 256; the ambient field is untouched.
- Tests +14 (now **116**): `CELEBRATE_CAP` ceiling, seedCelebrate caps/deterministic/
  bigger-and-longer-than-burst/reduced-smaller/bright-default; `celebrate()` fires
  hundreds, one RAF, one instanced draw/frame, auto-stops + frees buffer, `setQuality`
  degrades the count; `burst()` 256 cap not regressed.

### Hand-off to Builder A (T125 wire)
- Fire `FXGL.celebrate({ x, y, palette?, seed })` on the big win moments (Arena
  victory / a legendary unlock) instead of (or alongside) the smaller `burst()`. It
  auto-stops, so no teardown. `seed` from the event for determinism; `palette` can
  follow rarity (defaults bright/festive).

---

## T120 — `synth.js` generative-audio engine (phased build per T119) — ALL 5 DONE

**Owner directive (2026-06-21): run continuously through phases 1→5, one push per
increment, no per-phase wait.** New files only (`synth.js`, `test/synth.test.js`);
**zero edits to `sound.js` or any existing Halves file** (the [A] wiring is phase 6).
No deps/bundler; no sample assets; deploy-safe; **`test/synth.test.js` = 107 checks**;
all existing gates green. Increments 1–3 already APPROVED; 4–5 below.

### Follow-up — engine gap surfaced by the T122 [A] wiring · FIXED
Reviewing the landed T122 audio wiring (it mounts `Synth` on `sound.js`'s ctx,
reroutes `output()`→Sound's master, and calls `Synth.setMuted()` from the sound
toggle), I found a real engine bug: my `setMuted()` only changed the master gain —
it left the **lookahead scheduler running**, so a muted app kept **spawning silent
voices every step** (wasted CPU/battery on the Poco-X3 budget) and music wouldn't
resume on unmute if booted muted. **Fix:** `setMuted(true)` now `stop()`s the
scheduler and `setMuted(false)` resumes the current context — mirroring `sound.js`'s
`setMuted` contract (the [A] wire calls both). Tests +4 (now **111**): mute idles the
scheduler, unmute resumes, unmute-with-no-music stays clean. `node -c` clean; all
gates green. B-owned files only.

### The engine, end to end
The full `window.Synth` API: `mount · setContext · setMusic · start/stop ·
musicPlaying · intensity(x) · play · drum · sting · setReverb · duck · setMuted ·
capabilities · output · dispose`. A context selects the calm/energetic bundle; the
single lookahead scheduler renders harmony+rhythm through real patches into the
bus/reverb graph. It delivers all four T119 quality levers — **distinct patches**,
**reverb/space**, **harmony**, **evolving variation** — so it sounds *good*, not just
different.

### Increment 5/5 — CONTEXTS + the calm-vs-energetic invariants · DONE
- **`CONTEXTS`**: `solve` (CALM — 80 BPM, Dorian, sparse, wet, soft pad+pluck),
  `menu`, `event` (BRIGHT — Lydian), `arena` (ENERGETIC — 120 BPM, dark Aeolian,
  dense, driving Euclid kit + the **wub** bass, dry). `Synth.setContext(name)` drives
  the scheduler (seed from the name → deterministic). `Synth.intensity(x)` (shared
  with the FX layer) thickens it toward the boss.
- **`Synth.sting("victory")`** — a brief one-shot (a low wub swell + a rising bright
  arpeggio) that **ducks the bed**, NOT a loop.
- **The firm rule, enforced as tests**: Arena denser + faster + drier + dark-mode +
  wub-bass + busier hats than solve; the calm pad attacks softer than the Arena lead;
  solve wetter. +15 tests (now **107**): contexts authored, every calm/energetic
  invariant, `setContext` plays + is deterministic + solve≠Arena, sting one-shot+duck.

### Hand-off to Builder A (phase 6 — the [A] audio wiring, Babysitter to spec)
- Mount once on the first gesture; reconcile output with `Sound`'s master/limiter +
  the T113/T114 volume/tempo (use `Synth.output()` / `setMuted`). Route contexts like
  the FX `fxSetScreen`: `setContext("solve"|topic)` in-round, `"menu"` on home,
  `"arena"` in the Arena (+ `intensity(bossProximity)` — the same signal the T108
  backdrop uses), `"event"` for events. Fire `Synth.sting("victory")` on an Arena win
  (pairs with the T94 burst) and `duck()` under SFX. Keep/migrate the `Sound` SFX, then
  retire the old `sound.js` music scheduler. Honour mute + the sliders + the limiter.

### Increment 4/5 — RHYTHM/VARIATION + the single lookahead scheduler · DONE
Structured, evolving variation — no obvious loops (T119 §4):
- **`euclid(k,n)`** (Toussaint even-spread grooves) + `rotate` (phase/fills);
  **`markovNext`** (a 2nd-order transition-table walk); **motif transforms**
  (`transposeMotif`/`invertMotif`/`retrograde`); **`phraseSeed`** (stable per phrase,
  evolves across phrases); **`densityAt`** (rises across a phrase — breathes/arrives).
- **`stepEvents`** (pure, deterministic): pad chord on the downbeat, bass on 1 & 3,
  a Euclid-gated Markov-walk **lead** (chord-anchored on strong beats), the Euclid
  **kit** (kick/hat/snare) — density scaled by `intensity()`.
- **The single lookahead scheduler** (Chris Wilson "two clocks"): `Synth.setMusic(spec)`
  / `start()` / `stop()` / `musicPlaying()` / `intensity(x)`. **One `setInterval`**,
  schedules precise times vs `ctx.currentTime`, **drops missed steps on a stall**
  (anti-burst), **idles on stop** — never a timer per part.
- Tests +20 (now **92**): Euclid count+even-spread+edges, rotate, Markov determinism,
  motif transforms, phraseSeed evolve, density rise, stepEvents structure; scheduler
  = **one timer**, schedules voices, **deterministic per seed**, **idles on stop**,
  **anti-burst** (a stalled clock doesn't flood), `intensity` thickens the lead.

### Increment 3/5 — HARMONY (modes · progressions · voice-leading · bass-root) · DONE
Gives the music somewhere to go (T119 §3) — pure music theory, no audio nodes:
- **Modes** (`MODES`): ionian/major, dorian, phrygian, lydian, mixolydian,
  aeolian/minor, pentatonic(+minor), each carrying its mood colour (lydian ♯4,
  phrygian ♭2, dorian ♮6); grouped by mood in `MODE_MOOD` (bright/calm/dark) for
  context selection.
- `degToMidi` (octave-aware, wraps), `chordMidi` (diatonic stacked-third triads),
  `bassMidi` (**bass-follows-root**, low).
- **`voiceLead(prev, chord)`** — moves each voice to the nearest chord tone (≤ a
  tritone), minimising motion (flowing, not blocky).
- **`harmonyFor(spec)`** — realises a progression (`{root, mode, progression,
  padOct, bassOct}`) into per-chord `{degree, chord, voiced(pad), bass}`,
  voice-led across the progression, **deterministic** (the scheduler in increment
  4 consumes it).
- Tests +17 (now **72**): mode intervals (♯4/♭2/♮6), degree→MIDI wrap, triads
  (I=C-E-G, vi=A-C-E), voice-leading (less motion than root-position + all chord
  tones + ≤ tritone), bass-below-pad + follows-root, progression determinism +
  smoother-than-naive motion.

### Increment 2/5 — SPACE (FDN reverb + sends + stereo width + ducking) · DONE
The "biggest quality lever vs our dry sound" (T119 §6):
- **`makeReverb()` — a 4-line Feedback-Delay-Network reverb**: input → pre-delay →
  4 `DelayNode`s, each damped by a lowpass, recombined through a **unitary 4×4
  Hadamard feedback matrix scaled by `decay<1`** (dense but stable), with the taps
  **panned L/R for a wide stereo tail**. Pure WebAudio, **no sample IR**,
  real-time-tweakable (`setDamp`).
- **Sends**: one shared reverb built once at mount; **music + drum buses send into
  it** (drums kept proportionally dryer), reverb returns to master. `Synth.setReverb(wet)`.
- **Ducking**: `Synth.duck(amount, dur)` dips the music bus then recovers
  (sidechain glue so a cue/SFX cuts through) — the [A] wire fires it under stings/SFX.
- Tests +14 (now **55**): FDN 4 lines + pre-delay, per-line damping LP, **≥16
  Hadamard cross-gains** + feedback recirculation, stereo panners, music/drum sends +
  return-to-master, drums-dryer, `setReverb`, `duck` dip+recover, and **reverb built
  once** (voices don't rebuild it).

### Increment 1/5 — ENGINE CORE · DONE
New files only; zero edits to existing Halves files.

### What shipped (increment 1 — the voice/patch foundation)
- **`synth.js` / `window.Synth`** — a self-contained Web Audio engine, the start of
  the T119-recommended `synth.js` (mirrors the `fxgl.js` pattern: standalone, A wires
  it). This increment is the **engine core**, the "biggest quality jump #1: real
  patches":
  - **Master chain** mirroring `sound.js`: `master(gain) → brickwall limiter
    (DynamicsCompressor, −1.5 dB, ratio 20) → destination`, with **music / drum / sfx
    submix buses → master**. `Synth.output()` exposes the master so the [A] wire can
    re-route it into `Sound`'s master + reconcile the T113 volume/limiter.
  - **`adsr(param, t0, dur, env)`** — a real Attack/Decay/Sustain/Release on any
    `AudioParam` (amp gain *and* filter cutoff), exponential for amplitude, with a
    held-sustain stage; short notes still complete attack+decay.
  - **Voice renderer** `osc(s) → [filter (own envelope + optional LFO)] → amp(ADSR) →
    [pan] → bus`, with four engine topologies: **mono**, **unison** (detuned
    supersaw), **fm** (carrier+modulator → frequency), **sub** (the **wub** — resonant
    lowpass swept by an LFO).
  - **Patch table** — `pad · pluck · bass · bell · lead · wub` (genuinely different
    *instruments*, not one osc reskinned) + a **noise-based drum kit** (`kick` with a
    pitch-drop, `snare` = bandpassed noise + tonal body, `hat` = highpassed noise,
    `clap` = staggered bursts), all over a **procedurally-filled** (seeded, no-asset)
    noise buffer.
  - `Synth.mount(opts?)` (lazy; `opts.ctx` injects a context for tests),
    `Synth.play(patch, when?, opts?)`, `Synth.drum(piece, when?)`, `setMuted`/`isMuted`/
    `capabilities`/`dispose`. **One-shot only this increment — no scheduler, no
    timer/RAF** (the lookahead scheduler lands with the Contexts increment).

### Verification
`node -c` clean; `node test/synth.test.js` → **41 checks** via a recording
AudioContext stub (same approach as `sound.test.js`): master→limiter→destination +
3 buses wired once; **ADSR shape** (cancel→0→peak@a→sustain@a+d→hold→0, correct
release-end, short-note safety); **patch→graph** per engine (pad=3 detuned oscs+LP+pan;
bell=FM carrier+mod→freq; wub=saw+LFO→cutoff, resonant Q; bass=mono low-cut; pluck
filter-envelope sweep); **patch distinctness** (6/6 distinct signatures, ≥4 distinct
graph shapes); **drum kit** (kick pitch-drop tonal, hat/snare/clap noise-based);
**budget** (no timer/RAF in core, mute zeroes master + suppresses voices); **no sample
assets / no deps / never calls `window.Sound`**. Full existing Halves suite still green.

### Next increments (T120, one reviewable push each)
2. **Space** — FDN reverb (4–8 delay lines + damping LP) + sends + stereo width +
   ducking (T119 §6, the biggest quality lever vs today's dry sound).
3. **Harmony** — key/mode, chord progressions, voice-leading, bass-follows-root.
4. **Rhythm/variation** — Euclidean kit, 2nd-order Markov melody, motif development,
   evolving + phrase-seeded density (the single lookahead scheduler lands here).
5. **Contexts** — calm-solve set, menu, Arena + `intensity()`, event, victory wub-sting,
   with the calm-vs-energetic invariants as tests.
Then **phase 6 = [A] wiring** (Babysitter specs it): mount `Synth`, route contexts,
fire the win-sting + duck, retire the old music scheduler.

---

## T119 — Deep generative-audio research → principles + recommended engine ([B], doc)

**Status: DONE — handed off for review.** New file only
(`docs/research-generative-audio.md`); **zero edits to any existing Halves file**
(`sound.js` untouched — integration is an [A] task, like the FX wiring). Off
stand-by: the owner asked for deep research into generative audio because the
music is "too simple and doesn't seem to be progressing."

### What shipped
- **`docs/research-generative-audio.md`** — a substantive, *applied* survey + a
  concrete recommended architecture. Grounded in a real diagnosis of `sound.js`
  (one `osc→gain` instrument played 18 ways: same envelope, no filters/ADSR,
  static root, uniformly-random "lead", dry mono, no buses) and stays inside our
  hard constraints (pure WebAudio, **no sample assets**, no-build, one lookahead
  scheduler, Poco-X3 CPU budget, Node-verifiable).
- Covers all **7 mandated areas** with concrete WebAudio node-graph code, not
  hand-waving: (1) **synthesis depth** — real ADSR, BiquadFilter + filter-envelope
  + LFO (the wub worked example), detune/unison, FM, additive, noise percussion,
  waveshaping; (2) **patch/instrument design** — a declarative patch abstraction so
  contexts differ by *instrument*; (3) **harmony** — chord progressions,
  voice-leading (nearest-tone mapper), bass-follows-root, modes-for-mood table,
  harmonic rhythm; (4) **variation** — 2nd-order Markov, Euclidean rhythms
  (`euclid(k,n)`), evolving density, phrase-seeded determinism, motif development;
  (5) **calm vs energetic** — a precise lever table (attack/harmonic-rhythm/
  density/mode/cutoff/tempo/percussion/reverb) + boss-proximity morph; (6) **mixing
  & space** — bus structure, **reverb** (recommend a light FDN, synth-IR convolver
  as upgrade — `makeIR()` included), stereo width, sidechain ducking, per-context
  balance; (7) **constraints** — incl. headless-testability.
- **Recommendation (the point):** build a **new standalone B-owned module
  `synth.js` (`window.Synth`)** mirroring the `fxgl.js` pattern (A wires it), not a
  `sound.js` rewrite — with a full API sketch, an internal architecture diagram,
  how calm-solve/wub/distinct-Arena/per-context-character fall out of it, a phased
  build path (each a reviewable [B] increment), and a headless test plan. Flags
  **patches (§1–2)** and **reverb/space (§6)** as the two highest-impact first
  steps.
- **8 cited references** (Chris Wilson "Two Clocks", MDN advanced techniques,
  Toussaint Euclidean rhythms, Monotron/wub, modes-for-mood, Markov music,
  WebAudio reverb/IR), web-researched and linked inline.

### Verification
Doc-only (no new JS this round — prototyping is optional per the DoD; the build is
the sequenced follow-up). `sound.js` and every existing file untouched; full Halves
gate suite still green (B changed only a new doc + this log).

### Hand-off / next (Builder B)
- The doc ends with a phased, reviewable build plan. Await the Babysitter's verdict
  + which increment to build first (recommended: engine core + patches, then
  reverb/space). When sequenced, I build `synth.js` + `test/synth.test.js`
  (B-owned), never touching `sound.js`; [A] wires it.

---

## T108 — Semantic Arena-biome backdrop derivation (engine side; [B])

**Status: DONE — handed off for review.** Edited only B-owned files
(`fxgl.js`, `test/fxgl.test.js`); **zero edits to any existing Halves file**
(the [A] Arena wiring calls it, after T89/T90). Mirrors T95's discipline. No
deps/bundler; deploy-safe; all existing gates green.

### What shipped
- **New API: `FXGL.deriveArenaScene(state)`** (and `controller.setArenaState`).
  Purpose = **SENSE OF PLACE + STATUS (Arena)** — a `setScene`-shaped backdrop
  derived from **live Arena state**, not decoration:
  - `state = { region: 1..10, tier, bossProximity: 0..1 | facingBoss, mood: neutral|victory|defeat, grid?, seed?, cols?, rows? }`
  - **region** → a distinct palette + accent **kind** per region (10 engine-owned
    region moods echoing the Arena families: warren/gallows/gloam/marsh/frost/
    drown/cinder/storm/dragon/void) — a real *sense of place*.
  - **tier + boss-proximity** → **intensity** (0..1): the glow runs **hotter +
    brighter** and the particle field **denser** as the boss nears; `facingBoss`
    pins it to the peak (1.0).
  - **mood**: **victory** briefly warms/brightens + adds embers (the [A] side
    pairs it with a T94 `burst()`); **defeat** dims/cools.
  - **deterministic** from a state-derived seed (region + tier + intensity band +
    mood) — same state → same biome; it shifts as you advance.
- **Reuses the real scenery:** if the [A] caller passes `state.grid`
  (`Scenery.buildGrid(region)`), the engine renders that real silhouette
  **recoloured by the live intensity-aware palette** (hotter near a boss);
  otherwise it synthesises a grounded region backdrop (sky gradient + a hot glow
  band scaled by intensity + a dark ground silhouette).
- **Budget = T95 discipline:** capped at **`ARENA_PARTICLE_MAX = 220`** (livelier
  than home's 120 since it dresses a battle, still bounded); renders through the
  existing T93 backends — single RAF, one draw/frame, **idles when off-Arena**,
  reduced-motion → static still, no-WebGL2 → CPU still. No new GPU code.

### Brickmap borrowing (T108)
None new — pure state→scene mapping feeding the **T93** ports (Bayer dither,
luminance→palette ramp, atmospheric gradient/glow, instanced accents). The
intensity-scaled hot glow builds on T93's gradient recipe.

### Verification
`node -c` clean; `node test/fxgl.test.js` → **102 checks** (T95's 82 + 20 new):
deterministic per state; **all 10 region palettes distinct** (sense of place);
**nearer-boss → denser field + hotter/brighter glow + brighter backdrop**;
deeper tier lifts intensity; `facingBoss` = peak; **victory warms/brightens +
embers, defeat dims**; capped; region clamps; **uses the caller's scenery grid
and recolours it**; renders on a real backend (single RAF, one draw/frame,
textures once, idles), reduced-motion → static still. Full existing 24-gate
Halves suite still green.

### Hand-off to Builder A (the [A] Arena-biome wiring task, after T89/T90)
- Mount a backdrop canvas behind the Arena (`aria-hidden`,
  `pointer-events:none`); feed it the live region/tier/boss state:
  `FXGL.mount(bg, { width, height }); FXGL.setArenaState({ region, tier, bossProximity, mood, grid: Scenery.buildGrid(region) }); FXGL.start();`
  Re-call `setArenaState(...)` as the fight advances (tier up, boss approached,
  win/loss); on a win, also fire `FXGL.burst(...)` (T94) and pass `mood:"victory"`.
  `FXGL.stop()` when leaving the Arena. Keep text legible (a scrim as
  `scenery.js` does). Register the gate.

### Next (Builder B)
- Await the Babysitter's verdict + next pointer (the [A] FX wiring may preempt
  with a surfaced engine need; otherwise the next flagged [B] surface).

---

## T95 — Semantic home/menu backdrop (engine side; [B])

**Status: DONE — handed off for review.** Edited only B-owned files
(`fxgl.js`, `test/fxgl.test.js`); **zero edits to any existing Halves file**
(the [A] side reads home state and calls the new API). No deps/bundler;
deploy-safe; all existing gates green.

### What shipped
- **New API: `FXGL.setHomeState(state)`** (and `controller.setHomeState`,
  `FXGL.deriveHomeScene(state)`). Purpose = **AMBIENT STATUS** — the home
  backdrop *reflects real state*, it is **not decoration**. It **derives** a
  calm ambient scene (the T93 dither+palette+motes layer) from live home state
  passed in by the caller:
  - `state = { progress: 0..1, streak: int, event: { palette, seed, name, mood } | null, seed?, cols?, rows? }`
  - **today's event** → the home *wears the event's palette* and its seed drives
    the look (the strongest semantic: home literally shows the day's event).
  - **momentum (progress)** → a cool→warm dawn palette + a **horizon glow that
    rises and brightens** as you progress, and a denser particle field.
  - **streak** → kind: a streak (≥3) brings warm "on-a-roll" **embers**; else
    calm **motes** (an event `mood` can override the kind).
  - **deterministic** from a state-derived seed (`seedFromHome`: event + momentum
    band + streak) — stable for a given state, shifts when the day/event or a
    milestone changes.
- **Calm + budgeted:** the home field is capped at **`HOME_PARTICLE_MAX = 120`**
  (well under the Arena's 512) so home stays legible and cheap; renders through
  the existing T93 backends (single RAF, one draw/frame, **idles when stopped /
  off-home**, reduced-motion → a static still, no-WebGL2 → the CPU still).
- Reuses the whole T93 render pipeline — `deriveHomeScene` simply emits a
  `setScene`-shaped scene, so there's no new GPU code, just the **semantic
  mapping** from state → palette/grid/particles.

### Brickmap borrowing (T95)
None new — T95 is pure state→scene mapping feeding the **T93** ports (Bayer
dither, luminance→palette ramp, atmospheric gradient, instanced motes). The
rising-dawn glow is our own, built on T93's gradient/fog recipe.

### Verification
`node -c` clean; `node test/fxgl.test.js` → **82 checks** (T94's 67 + 15 new):
deterministic for a state; **density encodes momentum** + stays ≤ cap; a
different state → a different backdrop; **the glow rises with progress**; streak
threshold switches motes→embers; **an event makes the home wear the event
palette + mood + seed**; the seed shifts when the event changes; renders through
a real backend on a **single RAF, one draw/frame, idles when stopped**, and
**reduced-motion → a static still**. Full existing 24-gate Halves suite green.

### Hand-off to Builder A (the [A] home-backdrop wiring task)
- Mount a backdrop canvas *behind* the (compact, T91) home UI
  (`aria-hidden`, `pointer-events:none`), then feed it the **real** home state:
  `FXGL.mount(bg, { width, height }); FXGL.setHomeState({ progress, streak, event }); FXGL.start();`
  Re-call `setHomeState(...)` when state changes (return-to-home / new event /
  streak tick); `FXGL.stop()` when leaving home (idles the RAF). Source the
  inputs from the live home model (progress from collection/mastery, streak from
  the day-counter, `event` from today's event theme). Keep the home one-screen +
  legible (a scrim if needed, as `scenery.js`/Arena does). Register the CI gate.

### Next (Builder B)
- Await the Babysitter's verdict + next pointer (more FX surfaces are flagged as
  follow-ups once the foundation proves on a real Poco-X3-class device).

---

## T94 — Celebration-burst capability on `fxgl.js` (engine side; [B])

**Status: DONE — handed off for review.** Edited only B-owned files
(`fxgl.js`, `test/fxgl.test.js`); **zero edits to any existing Halves file**
(wiring the burst onto real win/collectible-gain hooks in `main.js` is the
[A] *T94w* task). No deps/bundler; deploy-safe; all existing gates green.

### What shipped
- **New API: `FXGL.burst({ x, y, palette, count, seed })`** (and
  `controller.burst(...)`). Purpose = **CELEBRATION** — a brief, capped, seeded
  flourish to *amplify a reward*. `x,y` are normalised [0,1] screen coords
  (default centre); `palette` tints it (default warm gold/white); `count` is
  clamped to `BURST_CAP` (256); `seed` makes it **deterministic**.
- **Consistent with the T93 engine philosophy:** each burst particle stores its
  launch point/velocity/life/spin in a **static instance buffer** uploaded once;
  the trajectory is **closed-form ballistic** (terminal-velocity drag,
  `v' = g − k·v`) evaluated **in-shader** from `uTime`, so a burst stays **one
  upload + one instanced draw/frame** and needs no per-frame CPU stepping.
- **Auto-stops, no RAF leak.** Particles self-expire (alpha 0 after `life`); the
  controller deactivates the burst once `elapsed > maxDeath`, clears the buffer,
  and lets the **single shared RAF** idle. A burst can run with **no ambient
  scene** (a transparent overlay surface) or **over** a running T93 scene (the
  loop is shared — scene field + burst = 2 instanced draws/frame).
- **Flurries coalesce.** Rapid gains stack into one rolling buffer (each particle
  carries its own `birth`), capped at `BURST_CAP` (oldest dropped) — never a
  runaway.
- **Reduced-motion → a calm flourish** (not nothing, per the DoD): fewer
  particles, lower speed, no gravity tumble, shorter life — and it still
  auto-stops. The additive `pointer-events:none` overlay never blocks text
  (readability stays the [A] mount's concern; engine draws behind/around DOM).
- **All three backends** carry it: WebGL2 (a 3rd program reusing the splat FS),
  WebGPU (a 3rd pipeline + WGSL module), and a light CPU 2D flourish for no-GPU.

### Brickmap borrowing (T94)
Extends the **T93** ports — same instanced-billboard splat recipe (disc mask +
additive falloff from `splat.wgsl`) and the **xorshift32** seed RNG
(`particles.rs`); the burst adds a closed-form drag trajectory (the analytic
solution of `particles.rs`'s gravity+drag integration). No new brickmap read was
required; no Rust/WASM pulled in.

### Verification
`node -c` clean; `node test/fxgl.test.js` → **67 checks** (T93's 46 + 21 new):
seedBurst capped/deterministic/calmer-under-reduced; `burstPos` lifecycle
(invisible before birth & after life, visible mid-life); `burstMaxDeath`; the
controller burst **pumps one RAF**, **one instanced draw/frame**, **auto-stops
with no leak**, **caps at BURST_CAP**, runs **standalone or over a scene** (2
draws/frame, textures still uploaded once), and the **reduced-motion calm
flourish** also auto-stops. Full existing 24-gate Halves suite still green
(B touched nothing else).

### Hand-off to Builder A (the [A] *T94w* wiring task)
- Mount a full-screen, `aria-hidden`, `pointer-events:none` overlay canvas;
  `const fx = FXGL.mount(overlay, { width, height });` then call
  `fx.burst({ x, y, palette, seed })` on the **existing** win/unlock moments:
  Arena victory (T90 playout) and collectible/loot/event-reward gains. `x,y` =
  the gain's on-screen point normalised to [0,1] (else it defaults to centre);
  `palette` can follow the reward's rarity colours. The burst auto-stops, so no
  teardown is needed between events. Register `test/fxgl.test.js` as a CI gate
  (still the [A] wiring task's call, alongside the T93 mount).

### Next (Builder B)
- The engine side of **T95** (semantic home/menu backdrop driven by live
  event/progress state), per the REVIEW.md pointer.

---

## T93 — `fxgl.js` FX engine (standalone, brickmap-borrowed, headless-tested)

**Status: DONE — handed off for review.** New files only; zero edits to existing
Halves files; no bundler/deps; deploy-safe; all existing gates stay green.

### What shipped
- **`fxgl.js`** — a self-contained `window.FXGL` engine. Clean, mountable API:
  - `FXGL.mount(canvas, opts) → controller` (also becomes the active singleton).
  - `FXGL.setScene({ palette?, grid, particles?, seed? })` — `grid` is the exact
    shape `scenery.js` emits (a COLS×ROWS array of hex colours); `palette` is
    optional (derived from the grid when omitted); `particles` is
    `{ count, kind, colors }` with `kind ∈ motes|embers|snow|stars`.
  - `FXGL.start()` / `FXGL.stop()` (caller owns the single RAF).
  - `FXGL.setQuality(0|1|2)` (degrade ladder), `FXGL.dispose()`,
    `FXGL.capabilities()`, `FXGL.resize()`.
  - Pure scene/dither/particle math is also exported (headless-tested).
- **Three backends, one API:**
  - **WebGPU** (progressive enhancement, WebGPU-*first*): resolved async via
    `requestAdapter`/`requestDevice` *before* the canvas context is bound (a
    canvas binds one graphics API), falling back if it fails.
  - **WebGL2** (baseline): the live path on the midrange floor.
  - **CPU still** (no-GPU): a static, CPU-dithered, palette-quantised still — the
    layer is reversible to today's static look.
- **Reduced motion** → a single static still, never a RAF. **No GPU** → the CPU
  still. Honoured by `prefers-reduced-motion` and by capability detection.
- **Purpose = PLACE.** The engine only renders a real theme (a scenery grid +
  accents); `deriveScene` *rejects a grid-less scene*, so it can't become a
  generic screensaver. The base texture is the literal scenery grid; the palette
  ramp is built from that grid's own colours.
- **`test/fxgl.test.js`** — 46 headless checks via `node test/fxgl.test.js`:
  pure Bayer dither / luminance-ramp quantise / particle-seed math; the "renders
  a real scenery theme not noise" proof (feeds an actual `Scenery.buildGrid`);
  budget invariants (single loop, one frame in flight, capped buffer, idle when
  stopped); a **recording WebGL2 stub** asserting **one instanced draw per frame**
  and a **one-time texture upload** (no per-frame re-upload); and the
  reduced-motion / no-GPU still fallbacks.

### Brickmap borrowing — RECIPES, not the engine
Read `00-1/brickmap`'s `crates/bm-render/src/*.wgsl` and **ported the techniques**
into our own no-build JS WebGL2/WebGPU layer. **No Rust/WASM/wgpu pulled into
Halves** (test asserts this) — keeps no-build + Node-verify + a11y.

| Borrowed technique | brickmap source | Where in `fxgl.js` |
|---|---|---|
| Ordered **4×4 Bayer dither** matrix `[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5]` | `palette.wgsl`, `splat.wgsl` (`bayer4`) | `BAYER`, `bayer4()`, both scene shaders |
| **Luminance→palette-ramp quantise** (tonal gradient-map / poster look; dither nudges across stops) | `palette.wgsl` `fs_main` | `buildRamp`, `rampIndex`, `quantizePixel`, scene FS/WGSL |
| **Screen-space atmospheric gradient / fog** (a slow drifting band) | `sky.wgsl` | the `uTime` fog term in the scene FS/WGSL |
| **Instanced billboard particle splats** (disc mask, wind sway via `sin(time+phase)`, per-particle hash/phase, animate in-shader from a static buffer) | `splat.wgsl`, `particles.rs` | particle VS/FS, `seedParticles`, `animateParticle` |
| **xorshift32** deterministic RNG | `particles.rs` `rand()` | `makeRng` |

Deliberately **not** ported: brickmap decodes sRGB→linear because its target
re-encodes on store; our plain canvas displays sRGB values directly, so porting
that would double-darken — left out on purpose.

### Deviations from the T93 brief
- None of substance. WebGPU is implemented real (browser-only; not exercised by
  the Node stub, which targets the WebGL2 path — the DoD allows "a WebGL/WebGPU
  stub"). The headless stub proves the WebGL2 path's single-draw / one-time-upload
  invariants.

### Hand-off to Builder A (the [A] *T93w* wiring task)
- Add `<script src="fxgl.js">` and mount on the Arena backdrop canvas:
  `FXGL.mount(canvas, { width, height }); FXGL.setScene({ grid: Scenery.buildGrid(region), seed: region, particles: { kind, count } }); FXGL.start();`
  Keep the canvas `aria-hidden` + `pointer-events:none`; `FXGL.stop()` when the
  Arena is off-screen (idle). Register `test/fxgl.test.js` as a CI gate in
  `pages.yml`. Particle `kind` can follow the region's scenery accent
  (embers/snow/stars), else `motes`.

### Next (Builder B)
- The engine sides of **T94** (celebration bursts) and **T95** (semantic home
  backdrop driven by live event/progress state), per the REVIEW.md pointer.
