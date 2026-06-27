# PARITY LEDGER — the release gate for GG1-on-brickmap v1

> **RULE (owner, 2026-06-25): every unresolved parity issue — visual OR otherwise — is recorded here.
> The project CANNOT be marked complete until this ledger has ZERO open issues: each must be either
> RESOLVED (fixed + verified) or explicitly ACCEPTED by the owner with a sign-off.** Babysitter-owned
> (lives on `claude/agent`); updated on every review pass. Builders read it; the owner signs the `Sign-off`.

Status legend: **OPEN** (must fix) · **DECIDE** (needs an owner call) · **ACCEPTED** (owner signed it off as a
known/inherent difference) · **RESOLVED** (fixed + re-verified). A row leaves "open" only when ACCEPTED or RESOLVED.

---

## A. Open VISUAL issues (from the screenshot-compare acceptance gate)

| ID | Screen | Issue | Sev | Owner | Status | Sign-off |
|----|--------|-------|-----|-------|--------|----------|
| ~~V23~~ | hero-detail | ~~4th chip clipped~~ → **RESOLVED** (`c8ed712`: chips fit; verified all 4 PWR/GRD/SPD/FOC visible). _orig:_ The 4 stat chips (PWR/GRD/SPD/FOC) overflow the hero card — the 4th ("6 FOC") is CLIPPED at the right edge. Fit/wrap the chips. | med | B | OPEN | |
| ~~V24~~ | arena-map | ~~showed old DEF~~ → **RESOLVED** (`c8ed712`: now ⚔ PWR · HP, matching the re-captured ref + arena-prefight; verified). _orig:_ Foe-showcase shows the OLD "DEF 47" (the removed 1v1 stat). B reproduced a STALE web ref (arena-map-web predated the combat redesign). Ref now re-captured → shows "⚔ PWR · HP" (`main` `c0b453c`). B: update the arena-map foe-showcase to the PWR·HP threat (same as arena-prefight), re-render. | med | B | OPEN | |
| ~~V21~~ | home | ~~locked-node styling~~ → **RESOLVED** (`200d581`: tree dims locked nodes; verified on home-fresh — head bright, rest greyed). _orig:_ LOCKED-node styling: web DIMS locked topic-nodes (only the unlocked head is bright; the rest greyed); B renders all nodes the same brightness. Add the locked/unlocked/done node states (the `nodeState` distinction) to the tree. | med | B | OPEN | |
| ~~V22~~ | inventory | ~~missing ✓ checkmark~~ → **RESOLVED** (`200d581`: ✓ on 100% rows; verified on codex/topics). _orig:_ Completed rows omit the green ✓ checkmark web shows after each count ("61/61 ✓"). Add the ✓ on 100% rows. | low | B | OPEN | |
| ~~V19~~ | home | ~~tree edges = central spine~~ → **RESOLVED** (`a7d7f76`: directional chain/mastery edge-arrows). _orig:_ EDGES: web draws per-edge directional arrows (vertical amber CHAIN between topics, horizontal purple MASTERY between parts); B drew a single central vertical spine. Render the directional arrows per the unlock structure. | med | B | OPEN | |
| ~~V20~~ | home | ~~gold mismatch 99999 vs 988M~~ → **RESOLVED** (`a7d7f76` + capture-states `dd91c3b`: header now 988M + correct pile). _orig:_ Coin-pile + header gold were partly a CAPTURE-STATE gold mismatch (web 988M vs B 99999) — `halves.gold` wasn't in capture-states. FIXED export side (`main` `dd91c3b`: `capture-states.json.gold = 987654321`). B: seed `halves.gold` from it on home/results/hoard, re-render; then any residual coin-pile delta is pure seedHoard fidelity. | low | B | OPEN | |
| ~~V18~~ | home | ~~HOME DIVERGENT~~ → **RESOLVED** (`a05aa5d`: rebuilt with the tree-graph + glyph nodes + purple + a real gold coin-pile using the triage — ΔE 22.4→15.58 examine). _orig:_ came back DIVERGENT (ΔE 22.4) — B correctly reverted the WIP (didn't ship a failing render). 3 structural pieces, all now de-risked: (1) topic TREE node-graph — NOT an export gap, the unlock chain is in `modes.json` `unlock:{by}`/`{mastery}`; B ports the `renderTree` row-layout (spine via unlock.by + parts via unlock.mastery + chain/mastery arrows). (2) PURPLE theme — `HOME_PALETTE` now exported (`scenes.json` backdrops). (3) gold-HOARD coin-pile — deterministic `seedHoard` in `fxgl.js` (B's own FX module); constants exported/pinned (CAP 480, K 600, GOLD_TONES, moundProfile, hoardLevel); B ports it from source. ΔE 22.4→15.58 examine. | must | B | RESOLVED | verified 06-25 |
| V16 | results | Web shows a MOMENTUM pill ("MOMENTUM · 1 day") at the top; B's render lacks it. Verify B surfaces the momentum-streak pill when a streak exists (may be a capture-state difference, not a missing feature). | low | B | OPEN | |
| ~~V17~~ | buttons (Results/Arena) | ~~all buttons outlined~~ → **RESOLVED** (`951943e`: new `push_cta` = solid-gold primary CTAs (Results Continue, Arena fight bar); Back stays outlined `push_button`). Verified solid-gold on Results; Arena visual confirm pending its next render (same code path). _orig:_ HIERARCHY: web uses SOLID-GOLD primary CTAs (Results dismiss, Arena "Pick your party") vs OUTLINED secondary (Heroes "Back"). The V8 "outline everywhere" fix overcorrected — primary CTAs should be solid gold. Distinguish primary vs secondary. | med | B | OPEN | |
| V15 | inventory-awards | RANK detail-strip shows different item NAMES + ORDER than web — B: rank titles "Adept/Apprentice/Archmage…" alphabetical; web: item flavour names "Cinder-flecked Cabochon…" in catalogue order. Match web's name field + order. | low | B | OPEN | |
| ~~V13~~ | inventory-awards | ~~AWARDS tab flat grid~~ → **RESOLVED** (`12d2d9c`: rebuilt to web's structure — 9 category progress-bar rows + per-category item-detail strip; ΔE 11.72→8.73). _orig:_ STRUCTURE wrong: web = per-category PROGRESS BARS (Rank/Initiation/Flawless/Speed/Mastery/Solved/Spark/Milestone/Collector — green bar + count + ✓) + per-category item-detail strips; B built a flat 4-col ICON GRID, no progress bars / no category overview. Rebuild to web's layout. (ΔE 11.72 under-flagged it — a same-palette reorg; caught by eyeball.) | must | B | OPEN | |
| ~~V14~~ | inventory-awards | ~~count 2352 vs 2702~~ → **RESOLVED** (`12d2d9c`: header now 2702/2702, loot included). _orig:_ TOTAL count: B "2352/2352" vs web "2702/2702" — B excludes the 350 loot from the inventory total (loot IS in the inventory, on the Loot tab). Count all 2702. | med | B | OPEN | |
| ~~V11~~ | heroes | ~~Missing locked-hero rows~~ → **RESOLVED** (brickmap `4c60023`: `heroes_frame` branches on `is_hero_unlocked` — locked = "?" portrait + dim name + `unlock_hint`; header counts unlocked/total). Verified vs web's pattern. | med | B | RESOLVED | verified 06-25 |
| ~~V8~~ | all | ~~Solid-yellow Back/action bar~~ → **RESOLVED** (`73c8d26`: `push_button` = gold border + dark fill + gold label, one fix everywhere; arena 10.2→8.79) | polish | B | RESOLVED | verified 06-25 |
| ~~V9~~ | event-play | ~~Boxed prompt/answer~~ → **RESOLVED** (`fd13619`: borderless large text + a verdict-tinted underline input slot) | polish | B | RESOLVED | verified 06-25 |
| ~~V10~~ | event-play | ~~Missing timer + progress bar~~ → **RESOLVED** (`fd13619`: top progress bar + per-question "1.3s" timer from `q_start` — the SAME value that already drove Spark scoring, now shown; not a functional gap) | med | B | RESOLVED | verified 06-25 |
| ~~V12~~ | heroes | ~~Solid Back bar~~ → **RESOLVED** (same `push_button` fix as V8; heroes 10.35→8.62) | polish | B | RESOLVED | verified 06-25 |
| ~~V1~~ | arena-prefight | ~~Only one foe — needs the 3-foe enemy team~~ → **RESOLVED** (brickmap `8373a20`: lead + 2 typed supports as cards) | must | B | RESOLVED | verified 06-25 |
| ~~V2~~ | arena-prefight | ~~No per-hero matchup badge~~ → **RESOLVED** (`combat::matchup_mult`: ADV ×1.5 / WEAK / EVEN per hero) | must | B | RESOLVED | verified 06-25 |
| ~~V3~~ | arena-prefight | ~~Missing primer + Journey map~~ → **RESOLVED** ("How battles work" box + Journey map button) | must | B | RESOLVED | verified 06-25 |
| ~~V4~~ | arena-prefight | ~~Post-battle bleed / heavy green fill~~ → **RESOLVED** (clean pre-fight, amber selected-card border) | polish | B | RESOLVED | verified 06-25 |
| ~~V5~~ | event-play | ~~Numpad inverted~~ → **RESOLVED** (calculator 7/8/9-top in `bm-render::ui2d::keypad`) | must | B | RESOLVED | verified 06-25 |
| ~~V6~~ | event-play | ~~Missing hint button~~ → **RESOLVED** ("How to approach this" above the numpad) | must | B | RESOLVED | verified 06-25 |
| ~~V7~~ | event-play | ~~Backspace "<" / solid Skip~~ → **RESOLVED** (pixel backspace arrow + outlined Skip bar) | polish | B | RESOLVED | verified 06-25 |

## B. Owner DECISIONS pending (parity deviations that may be intentional)

| ID | Screen | Question | Status | Sign-off |
|----|--------|----------|--------|----------|
| D1 | event-play | Render shows the event title during the question; web shows the progress counter. Keep B's, or match web? | DECIDE | |
| D3 | summary (Best Times) | Web ships a Best Times screen (`renderSummary`, nav-wired `#/best-times`) backed by PER-MODE best-time boards in localStorage — brickmap's `Save` tracks no per-topic best time. **Decision: ADD best-time tracking** (save-schema + `finish_round` records per-topic best time/score; B's domain) **— or SCOPE `summary` OUT of v1** (an accepted parity gap). NB the same datum feeds the home '<topic> · best…' detail line + Practice qbest, so scoping out leaves those gaps too. Babysitter recommends ADD (it's woven in). | DECIDE | |
| D2 | event-play | Render applies an event THEME — purple bg tint + gold question text (web is near-black bg + white question text; the gold prompt is the largest residual ΔE band). Keep B's themed look, or match web's neutral drill? (One decision covers both bg + prompt colour.) | DECIDE | |

## C. Open NON-VISUAL parity issues

| ID | Area | Issue | Sev | Owner | Status | Sign-off |
|----|------|-------|-----|-------|--------|----------|
| ~~N1~~ | art / Items + Results | ~~drawIcon ARCH item generator port~~ → **RESOLVED** (brickmap `103bf3f`): item generator byte-exact vs `itemDigest 934075ca` (2352) + `lootDigest 8143c303` (350) — cross-repo digest MATCH. The full-space digest caught 2 UTF-16-vs-UTF-8 hashing bugs (`fnv1a`+`hash_str`) the ASCII samples missed. Unblocks Items + Results. | must | B | RESOLVED | verified 06-25 |
| N2 | collectibles / determinism | `Collectibles.CATALOG` order is non-deterministic run-to-run (a few solve/spark ids reorder). Harmless today (gates sort; committed file is fixed; art vectors made order-independent), but a future export regen could reorder `collectibles.json`. Fix = stable `CATALOG.sort(by id)` + regenerate all + B re-sync, as one coordinated step. | low | Babysitter (owner-steer) | OPEN | |
| N3 | audio | Music score is golden-proven (12 goldens); SFX synthesis is only partially verified (not byte-golden vs web). Confirm SFX parity or accept as by-ear. | med | B / Owner-ear | OPEN | |
| N4 | animation / FX | Battle-playout pace + callouts, particle bursts, screen transitions are not cross-repo frame-verified (inherent: two render engines). Likely an ACCEPT once eyeballed on-device. | low | Owner-ear | OPEN | |
| ~~N5~~ | compare methodology | ~~web ref and B's render must use the SAME `collected` state for data-dependent screens~~ → **RESOLVED** (`main` `9bbb3c2`): the exact capture states are committed at `content/gg1/visual-ref/capture-states.json` (full/empty/sample/partial) + `manifest.json` gives each screen's state name. **B: seed the matching state before rendering any data-dependent screen** so the compare reflects visual diffs only. | med | Babysitter | RESOLVED | 06-25 |
| N6 | compare methodology | The ORDER-DEPENDENT states (`sample`/`partial`) may not reproduce the web ref's exact unlock set, because those refs were captured before `capture-states.json` existed AND the CATALOG order they sliced is non-deterministic (N2) — seen on heroes-partial (B's render 3/12 vs web 7/12 unlocked; V11 feature is correct, only the data-seed differs). Fix: B renders `sample`/`partial` screens against `capture-states.json`, and if the web ref still differs, the Babysitter RE-CAPTURES those refs against the committed states. (`full`/`empty` already align.) | low | Babysitter+B | OPEN | |

## D. Screens PENDING acceptance comparison (must all be compared + ok/accepted before complete)

The screenshot-compare gate has only run on 2 of 26 screens. Every screen below must, once B declares it complete,
commit a `<screen>-brickmap.png` and pass the compare (verdict `ok`/`examine`-accepted, never `DIVERGENT`):
`arena-prefight`† , `event-play`† (†compare-PASSED `examine` after V1–V7; residual D1/D2 (theme) only — V8–V10 RESOLVED), `arena-map`† (examine ΔE9.45; residual V24 DEF→PWR·HP) · `arena-cleared`† (examine ΔE9.07), `heroes`† (compare-PASSED `examine` ΔE10.35; residual V11 (locked rows) only — V12/N5 RESOLVED), `heroes-partial`† (compare-PASSED `examine` ΔE7.72; V11 locked rows correct; residual N6 partial-seed only),
`hero-detail-{brawn,arcane,cunning}`† (examine ~7.5; residual V23 chip-clip) · `inventory-awards`† · `inventory-topics`† (PASSED examine ΔE10.96; residual V22 ✓ low) · `inventory-loot`† (eyeballed: per-region bars+✓) · `inventory-events`† (eyeballed: banner+reward grid) · `inventory-codex`† (examine ~10; F2 portraits + ✓), `home`† (PASSED examine ΔE15.15; V19/V20 fixed) · `home-fresh`† · `home-midprogress`† (PASSED examine ~15.7; residual V21 locked-nodes),
`home-midprogress`, `practice`, `drill`† (examine 7.65) · `results`† (compare-PASSED examine ΔE6.43 — best yet; N1 rank portrait works; residual V16/V17), `summary`, `settings`† · `audio`† (examine ~9; eyeball-confirm pending) · `graphics`, `guide`, `splash`.
(No blanket back-fill — each flows through as its visual pass completes, per VISUAL-PARITY.md.)

---

## RESOLVED / ACCEPTED (archive)
*(none yet — move rows here with the date + the owner's sign-off as they close)*

---
*Completion check: GG1-on-brickmap v1 is COMPLETE only when §A, §B, §C are empty (all RESOLVED/ACCEPTED) AND every
screen in §D has passed the compare gate. The Babysitter holds the tag until then.*
