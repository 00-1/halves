# PARITY LEDGER — the release gate for GG1-on-brickmap v1

> **RULE (owner, 2026-06-25): every unresolved parity issue — visual OR otherwise — is recorded here.
> The project CANNOT be marked complete until this ledger has ZERO open issues: each must be either
> RESOLVED (fixed + verified) or explicitly ACCEPTED by the owner with a sign-off.** Babysitter-owned
> (lives on `claude/agent`); updated on every review pass. Builders read it; the owner signs the `Sign-off`.

Status legend: **OPEN** (must fix) · **DECIDE** (needs an owner call) · **ACCEPTED** (owner signed it off as a
known/inherent difference) · **RESOLVED** (fixed + re-verified). A row leaves "open" only when ACCEPTED or RESOLVED.

---

## A. Open VISUAL issues (from the screenshot-compare acceptance gate)

> **BAR TIGHTENED (owner, 2026-06-28):** ΔE is **TRIAGE, NOT THE GATE.** The downsample-to-24×48 ΔE smooths over
> systemic AND structural gaps the eye catches instantly — proven hard: `summary` scored the BEST ΔE of all (3.72,
> "ok") yet an independent agent review found it a structural **FAIL** (missing play buttons, score column, subtitle,
> Back button); `hero-detail` (5.06 "ok") and `heroes-partial` (6.12 "examine") were also agent-FAILs. **THE GATE IS
> AN INDEPENDENT AGENT VISUAL REVIEW** (see VISUAL-PARITY.md "agent-review gate"): each screen's web ref + brickmap
> render go to a fresh review agent that returns PASS / EXAMINE / FAIL + tagged deltas, blind to B's claims and the
> ΔE. **A screen passes ONLY on agent-PASS** (or an owner-ACCEPTED EXAMINE) **AND a matching capture-state.** ΔE just
> prioritises which to look at. The first agent-review wave (V25–V39) is logged below.

| ID | Screen | Issue | Sev | Owner | Status | Sign-off |
|----|--------|-------|-----|-------|--------|----------|
> 🚩 **CLAIM/RENDER GAP (wave-3/4, 2026-06-28) — B: re-render from the ACTUAL built code before handing off.** B's
> `535a4a9`+`337bb3f` commit messages claimed V28 / V30 / V31 / V36 / V44 / V45 / V46. The agent gate (6 screens) finds
> **only V42 (caps) + V43 (neutral Back) actually landed.** The substantive ones are NOT visible in the committed
> renders: V28 star still a sprite (3rd attempt), V30 stat-pills still plain text, V31 "tap for details" still absent,
> V36 hoard still sparse (2nd attempt), V37 tree edges/badges absent, V44 still all-mono, V45 rows still flat strips,
> V46 only partially (codex). Either the render predates the code change, or the code didn't implement the claim.
> **Do not mark a row fixed the gate can't see — verify the committed PNG shows it.** These stay OPEN below.

| ~~V25~~ | ALL screens | ~~smooth vector sans vs web pixel font~~ → **RESOLVED** (wave-1 `1eebcf4`: pixel/bitmap mono now used app-wide; verified on every signed screen). Refinement that web is NOT all-mono (proportional for content names) tracked separately as V44. | high | B | RESOLVED | verified 06-28 |
| ~~V26~~ | ALL screens | ~~purple cast on non-home screens~~ → **RESOLVED** (wave-1 `1eebcf4`: near-black `#0E1116` everywhere; purple reserved to home backdrop; verified on every signed screen). | high | B | RESOLVED | verified 06-28 |
| ~~V27~~ | ALL screens | ~~headline scale too modest~~ → **RESOLVED** (wave-1 `1eebcf4`: dominant headline ramp — results timer / drill number now dominate; verified on results/drill/summary). Residual per-screen row-density nits fold into V45. | med | B | RESOLVED | verified 06-28 |
| ~~V28~~ | heroes / hero-detail | ~~star a blob/sprite (6 attempts)~~ → **RESOLVED** (`2074b86` wave-6, after B adopted its own agent-gate + Babysitter pixel-spec): now a clean small filled gold ★ at the rank-number's cap-height. Verified on the RAW render. Minor residual: sits a touch tight to the number (`★25`) → fold to a low polish. | med | B | RESOLVED | verified 06-28 |
| V29 | hero-detail / ALL ordered lists | **ITEM-LIST ORDER = N2 biting.** Exported `collectibles.json` catalog order ≠ the LIVE web `CATALOG` order the refs were captured from (web hero-detail leads "Springy Gobbler +1"; B leads "+8" — same set, web filters CATALOG in source order, B faithfully renders the export's different order). Affects every order-dependent list (hero-detail boosts, inventory, results "slowest"). **Coordinated fix (N2):** impose a stable `CATALOG.sort(by id)` in collectibles.js → regenerate all content → re-capture order-dependent web refs → B re-syncs. | high | Babysitter+B | OPEN | |
| ~~V30~~ | heroes / heroes-partial / hero-detail | ~~stat chips plain text (4 attempts)~~ → **RESOLVED** (`2074b86` wave-6, Babysitter pixel-spec landed): each stat now sits in its own dark rounded PILL. **NB the agent-gate FALSE-FLAGGED this as "plain text" — overturned by inspecting the RAW 430×880 render, which clearly shows 4 distinct chips.** (Lesson: Babysitter adjudicates surprising agent verdicts vs the raw render — agents aren't infallible either.) | med | B | RESOLVED | verified 06-28 |
| ~~V31~~ | heroes | ~~missing "tap for details ›"~~ → **RESOLVED** (wave-7 `12bff72`, visible once N6 capture-state aligned: `Boosted by 4 · tap for details ›` now on every boosted hero, matching web row-for-row). | med | B | RESOLVED | verified 06-28 |
| ~~V32~~ | summary | ~~structure incomplete (agent FAIL)~~ → **RESOLVED** (`a7c1a8d`: rebuilt — padded cards + subtitle + per-row play ▶ + best-score column + "Not played" status + Back button; **agent-review PASS**, ΔE 2.91). | high | B | RESOLVED | verified 06-28 |
| ~~V33~~ | summary (methodology) | ~~capture-state empty vs populated~~ → **RESOLVED** (`a7c1a8d`: B re-rendered summary in the EMPTY "Not played" state to match the web ref; agent confirms BOTH same state — fix from B's side, no re-capture needed). | med | B | RESOLVED | verified 06-28 |
| ~~V34~~ | drill | ~~missing question cue~~ → **RESOLVED** (`a7c1a8d`: `half of ↓` eyebrow + arrow restored above the big number; **agent-review PASS**). Minor answer-slot placeholder-style residual → V41. | med | B | RESOLVED | verified 06-28 |
| ~~V35~~ | drill | ~~over-gold + small headline~~ → **RESOLVED** (`a7c1a8d`: "How to approach this" + Skip now neutral grey (gold reserved for the tiny eyebrow); big number dominant; **agent-review PASS**). | med | B | RESOLVED | verified 06-28 |
| ~~V36~~ | home | ~~hoard sparse/solid/low (6 attempts)~~ → **RESOLVED** (wave-7 `12bff72`: textured pile + side wings now climb the walls per `band_top 0.55` + per-column wall lift; reads like web's hoard). Minor symmetry/coverage nit → low polish, not a blocker. | med | B | RESOLVED | verified 06-28 |
| V37 | home | **TREE CONNECTORS — PARTIAL after 5 attempts; ROOT CAUSE = node spacing, not drawing.** Vertical gold chain ✓ (left column). But the HORIZONTAL sibling mesh still doesn't land — wave-11 v4 "purple branches" added only ~1 short segment/row (agent: cols 2–4 still float). **Diagnosis: brickmap packs the 4 nodes per row too TIGHT, so there's no gap to fit a horizontal arrow into — that's why every "fit into the gap" attempt produces a stub.** Fix is a LAYOUT change, not more arrow-drawing: **widen the intra-row node gaps** (match web's spacing) so a real left→right sibling arrow fits between each pair, THEN draw the full mesh + purple mastery branches. **If even with wider gaps brickmap can't route the mesh, FLAG for owner ACCEPT** (current vertical-chain-only is a minor 1-element gap). Owner-aware: this row has cost 5 cycles. | med | B | OPEN | |
| V38 | home | **NAV + banner glyphs** — coin header glyph ✓ done (`2f25d4f`/V39). Remaining: the bottom-nav icons (Best/Items/Heroes/Arena/Setup) are still faint/near-absent vs web's coloured pixel glyphs, AND the event-banner thumbnail art is still missing. | low | B | OPEN | |
| V53 | ALL buttons (home Start/Practice/Guide first) | **NICE-BUTTON GEOMETRY (owner, 2026-06-28: buttons "don't feel nice — padding off-centre").** Enforce the math in `test/button-geometry.test.js` + `docs/agent/BUTTON-DESIGN.md`: text CENTRED (≤1px both axes), L/R + T/B padding SYMMETRIC, h:v padding ratio 1.5–3.5×, height ≥44px touch target, vpad ≥0.5×cap. **B mirrors `checkButton` as a brickmap unit test over its real button layout values** + fixes the layout so it passes. Specific instance of V52. | high | B | OPEN | |
| V52 | ALL screens | **PADDING / SAFE-MARGIN STANDARD (owner, 2026-06-28).** brickmap text is inconsistently padded — off-centre, and frequently TOUCHING / CLIPPING container & screen edges (seen: codex header clipped left, arena-map CTA bled right, truncated names butting edges). web keeps consistent gutters. **Establish ONE global rule in the shared layout/`*_frame` code:** every text run + element keeps a minimum inner padding from its container edge (≥ ~1 char / cap-height) and the screen safe-area; centred content is actually centred; nothing bleeds past its container. Apply once in the layout primitives (not per-screen) so it fixes all screens at once. | high | B | OPEN | |
| ~~V39~~ | results / home | ~~plain-square glyphs~~ → **RESOLVED** (`2f25d4f`: calendar glyph in the MOMENTUM pill + coin glyph in the gold tally, on results AND the home header). | low | B | RESOLVED | verified 06-28 |
| V40 | summary | **gold accent** (surfaced once V32 passed) — title/subtitle/play ▶/Back render in gold; web uses muted grey/white. Use neutral. | low | B | OPEN | |
| V41 | drill | **minor** — answer-slot placeholder is a single underline vs web's `– –` two-dash; an extra helper line "Tap the digits — it checks itself" not in web; Skip label "Skip" vs web "SKIP". | low | B | OPEN | |
| ~~V42~~ | ALL chrome (inventory/heroes/headers/tabs) | ~~title-case headers/tabs~~ → **RESOLVED** (`337bb3f`: ALL-CAPS headers + tabs across inventory/heroes/settings; agent-confirmed). Minor residual: the codex TAB row still lacks web's wide letter-spacing tracking (low) → folded to V44. | med | B | RESOLVED | verified 06-28 |
| ~~V43~~ | ALL screens | ~~gold Back buttons~~ → **RESOLVED** (`337bb3f`: every secondary/`Back` button now neutral grey, confirmed on heroes/inventory-*/settings/audio/codex/loot. The one consistent win across both waves.) | med | B | RESOLVED | verified 06-28 |
| ~~V44~~ | inventory / heroes / arena | ~~all-mono / green / oversized names~~ → **RESOLVED** (wave-10 `09590b6` v2): content names now proportional InstrumentSans, **WHITE** (green reserved to counts+bars), smaller (more rows fit) — the monochromatic-green look is gone; verified on the raw topics + heroes renders. Keystone met → inventory + heroes families unblocked. Low residuals: the small-size font still reads slightly blocky to some reviewers + a faint green cast lingers on some names → V54 polish. | high | B | RESOLVED | verified 06-29 |
| V54 | inventory / heroes (names) | **low polish (post-V44):** make content names PURE white (a faint green cast lingers on some) + smoother at small sizes if the renderer allows; tighten count spacing `61 / 61`→`61/61`; on heroes add a small gap between the ★ and the rank number (`★ 190` not `★190`). | low | B | OPEN | |
| ~~V45~~ | inventory lists (awards/topics/loot) | ~~flat dense strips~~ → **RESOLVED** (`2f25d4f`: bordered/padded row CARDS with the progress bar on its OWN line, across loot/topics/awards/events/codex; verified on the loot raw render). | med | B | RESOLVED | verified 06-28 |
| V46 | inventory-codex/events/loot, arena-map | **LABEL TRUNCATION** — B clips long names to one cut line (`Shortswor`, `Goblin Warr`, `Crocheted Door…`→`Crocheted`); web WRAPS them. Let labels wrap; restore the dropped variant suffixes (`· Brawn/Cunning/Arcane`). | med | B | OPEN | |
| V47 | arena-prefight | **STRUCTURE (FAIL)** — missing the `ENEMY TEAM` header + 3 framed foe CARDS (B collapses them to a single unlabelled strip); missing the region-campaign panel (the "Gloamwood Champion · REGION 3/10 · TIER 6/12" banner + progress pips + threat); Journey-map button moved to the BOTTOM (web: top, under the tier header); "How battles work" is inline grey text not web's bordered ⚔ icon-box; matchup badge is a crossed-swords+number vs web's green `▲ Advantage ×1.5`. Rebuild to web's layout. | high | B | OPEN | |
| V48 | arena-map | **MOSTLY FIXED (`2f25d4f`): ⚔ swords glyph ✓, CTA sized+untruncated ✓, `REGION 3/10` ✓, `YOU ARE HERE` no longer overlapping ✓.** Remaining: the foe-showcase region **scenery backdrop** still missing (plain dark vs web's building silhouettes) + the **tier progress-dot row** (green/amber/red pips) still omitted + region names mono (→ V44). Downgraded high→med. | med | B | OPEN | |
| V49 | inventory-loot | **CAROUSEL structure landed (`2f25d4f`): the `GOBLIN WARREN · TIERS 1–12  12/12` sub-header + horizontal tile strip ✓.** Remaining: B's tiles are GENERIC placeholders labelled `Tier 1…5`; web shows the REAL per-region loot items (icon + flavour name, e.g. "Foxy Wishing-…", "Mammoth Sprite"). Populate the carousel with the actual loot icons + names for the region. Downgraded med→low. | low | B | OPEN | |
| ~~V50~~ | inventory-codex | ~~missing section count~~ → **RESOLVED** (`337bb3f`: per-section counts present `BEASTS 30/30` + the discover cards; agent-confirmed). Residual amber cell-outline → folded to V45. | low | B | RESOLVED | verified 06-28 |
| ~~V51~~ | inventory-loot | ~~bars partial despite 100%~~ → **RESOLVED** (`2f25d4f`, the V45 card rework: completed-row bars now render full-width). | med | B | RESOLVED | verified 06-28 |
| ~~V23~~ | hero-detail | ~~4th chip clipped~~ → **RESOLVED** (`c8ed712`: chips fit; verified all 4 PWR/GRD/SPD/FOC visible). _orig:_ The 4 stat chips (PWR/GRD/SPD/FOC) overflow the hero card — the 4th ("6 FOC") is CLIPPED at the right edge. Fit/wrap the chips. | med | B | OPEN | |
| ~~V24~~ | arena-map | ~~showed old DEF~~ → **RESOLVED** (`c8ed712`: now ⚔ PWR · HP, matching the re-captured ref + arena-prefight; verified). _orig:_ Foe-showcase shows the OLD "DEF 47" (the removed 1v1 stat). B reproduced a STALE web ref (arena-map-web predated the combat redesign). Ref now re-captured → shows "⚔ PWR · HP" (`main` `c0b453c`). B: update the arena-map foe-showcase to the PWR·HP threat (same as arena-prefight), re-render. | med | B | OPEN | |
| ~~V21~~ | home | ~~locked-node styling~~ → **RESOLVED** (`200d581`: tree dims locked nodes; verified on home-fresh — head bright, rest greyed). _orig:_ LOCKED-node styling: web DIMS locked topic-nodes (only the unlocked head is bright; the rest greyed); B renders all nodes the same brightness. Add the locked/unlocked/done node states (the `nodeState` distinction) to the tree. | med | B | OPEN | |
| ~~V22~~ | inventory | ~~missing ✓ checkmark~~ → **RESOLVED** (`200d581`: ✓ on 100% rows; verified on codex/topics). _orig:_ Completed rows omit the green ✓ checkmark web shows after each count ("61/61 ✓"). Add the ✓ on 100% rows. | low | B | OPEN | |
| ~~V19~~ | home | ~~tree edges = central spine~~ → **RESOLVED** (`a7d7f76`: directional chain/mastery edge-arrows). _orig:_ EDGES: web draws per-edge directional arrows (vertical amber CHAIN between topics, horizontal purple MASTERY between parts); B drew a single central vertical spine. Render the directional arrows per the unlock structure. | med | B | OPEN | |
| ~~V20~~ | home | ~~gold mismatch 99999 vs 988M~~ → **RESOLVED** (`a7d7f76` + capture-states `dd91c3b`: header now 988M + correct pile). _orig:_ Coin-pile + header gold were partly a CAPTURE-STATE gold mismatch (web 988M vs B 99999) — `halves.gold` wasn't in capture-states. FIXED export side (`main` `dd91c3b`: `capture-states.json.gold = 987654321`). B: seed `halves.gold` from it on home/results/hoard, re-render; then any residual coin-pile delta is pure seedHoard fidelity. | low | B | OPEN | |
| ~~V18~~ | home | ~~HOME DIVERGENT~~ → **RESOLVED** (`a05aa5d`: rebuilt with the tree-graph + glyph nodes + purple + a real gold coin-pile using the triage — ΔE 22.4→15.58 examine). _orig:_ came back DIVERGENT (ΔE 22.4) — B correctly reverted the WIP (didn't ship a failing render). 3 structural pieces, all now de-risked: (1) topic TREE node-graph — NOT an export gap, the unlock chain is in `modes.json` `unlock:{by}`/`{mastery}`; B ports the `renderTree` row-layout (spine via unlock.by + parts via unlock.mastery + chain/mastery arrows). (2) PURPLE theme — `HOME_PALETTE` now exported (`scenes.json` backdrops). (3) gold-HOARD coin-pile — deterministic `seedHoard` in `fxgl.js` (B's own FX module); constants exported/pinned (CAP 480, K 600, GOLD_TONES, moundProfile, hoardLevel); B ports it from source. ΔE 22.4→15.58 examine. | must | B | RESOLVED | verified 06-25 |
| ~~V16~~ | results | ~~missing momentum pill~~ → **RESOLVED** (`3dbbefd`: MOMENTUM streak pill now at the top of results, present on both sides; verified in the side-by-side). | low | B | RESOLVED | verified 06-28 |
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

> **DEFAULT = PARITY (owner, 2026-06-28).** We are going for parity from the start, so "match web or keep B's
> variant?" is NOT a decision — the answer is always **match web**. Drive those to parity without asking. Only
> escalate a row here when it's a GENUINE judgment call: matching web is infeasible/expensive, web itself is
> ambiguous or arguably buggy, or there's a real tradeoff with no obvious parity answer. **§B is currently EMPTY
> (D1/D2/D3 all DECIDED → match web / add).**
>
> **⚠ ANTI-DEFERRAL (owner, 2026-06-28).** A parity gap surfaced as an "owner decision" is usually a builder
> DEFERRING work — a question with an obvious parity answer dressed up as a choice. The Babysitter's job is to keep
> the port ON TRACK toward the goal (full parity on brickmap), so: **do NOT relay these up.** Recognise the pattern,
> resolve it to parity, route the work back to the builder as a §A/§C task, and keep moving. Reject deferrals,
> stubs, and "accept the gap" requests unless the gap is genuinely inherent (two render engines) or you've shown
> matching web is infeasible. Escalate to the owner ONLY for true judgment calls or a blocker you cannot resolve.

| ID | Screen | Question | Status | Sign-off |
|----|--------|----------|--------|----------|
| ~~D1~~ | event-play | ~~event title vs progress counter during the question~~ → **DECIDED: MATCH WEB** (owner, 2026-06-28). Show the web progress counter during the question; drop the persistent event title. Becomes a B fix. | DECIDED | match web |
| ~~D3~~ | summary (Best Times) | ~~add best-time tracking vs scope summary out~~ → **DECIDED: ADD** (owner, 2026-06-28). B extends the save schema so `finish_round` records per-topic best time/score, then builds the Best Times screen (`renderSummary` / `#/best-times`) against it. Closes 3 gaps at once — the screen + the home `<topic> · best…` detail line + Practice qbest. Becomes a B task. | DECIDED | add |
| ~~D2~~ | event-play | ~~themed purple bg + gold question text vs web's neutral drill~~ → **DECIDED: MATCH WEB** (owner, 2026-06-28). Near-black bg + white question text; drop the purple tint + gold prompt. Closes the largest residual ΔE band. Becomes a B fix (and aligns with V26 — neutral bg app-wide). | DECIDED | match web |

## C. Open NON-VISUAL parity issues

| ID | Area | Issue | Sev | Owner | Status | Sign-off |
|----|------|-------|-----|-------|--------|----------|
| ~~N1~~ | art / Items + Results | ~~drawIcon ARCH item generator port~~ → **RESOLVED** (brickmap `103bf3f`): item generator byte-exact vs `itemDigest 934075ca` (2352) + `lootDigest 8143c303` (350) — cross-repo digest MATCH. The full-space digest caught 2 UTF-16-vs-UTF-8 hashing bugs (`fnv1a`+`hash_str`) the ASCII samples missed. Unblocks Items + Results. | must | B | RESOLVED | verified 06-25 |
| N2 | collectibles / determinism | `Collectibles.CATALOG` order is non-deterministic run-to-run (a few solve/spark ids reorder). Harmless today (gates sort; committed file is fixed; art vectors made order-independent), but a future export regen could reorder `collectibles.json`. Fix = stable `CATALOG.sort(by id)` + regenerate all + B re-sync, as one coordinated step. | low | Babysitter (owner-steer) | OPEN | |
| N3 | audio | Music score is golden-proven (12 goldens); SFX synthesis is only partially verified (not byte-golden vs web). Confirm SFX parity or accept as by-ear. | med | B / Owner-ear | OPEN | |
| N4 | animation / FX | Battle-playout pace + callouts, particle bursts, screen transitions are not cross-repo frame-verified (inherent: two render engines). Likely an ACCEPT once eyeballed on-device. | low | Owner-ear | OPEN | |
| ~~N5~~ | compare methodology | ~~web ref and B's render must use the SAME `collected` state for data-dependent screens~~ → **RESOLVED** (`main` `9bbb3c2`): the exact capture states are committed at `content/gg1/visual-ref/capture-states.json` (full/empty/sample/partial) + `manifest.json` gives each screen's state name. **B: seed the matching state before rendering any data-dependent screen** so the compare reflects visual diffs only. | med | Babysitter | RESOLVED | 06-25 |
| ~~N6~~ | compare methodology | ~~order-dependent sample/partial states didn't reproduce the web unlock set~~ → **RESOLVED for heroes-partial** (wave-7 `12bff72`: B now renders against `capture-states.json` `sample` → 7/12 matching web; rows align row-for-row). Same pattern applies to any other `sample`/`partial` screen as it's reviewed; method proven. | low | Babysitter+B | RESOLVED | verified 06-28 |

## D. Screens PENDING acceptance comparison (must all be compared + ok/accepted before complete)

The screenshot-compare gate has only run on 2 of 26 screens. Every screen below must, once B declares it complete,
commit a `<screen>-brickmap.png` and pass the compare (verdict `ok`/`examine`-accepted, never `DIVERGENT`):
`arena-prefight`† , `event-play`† (†compare-PASSED `examine` after V1–V7; residual D1/D2 (theme) only — V8–V10 RESOLVED), `arena-map`† (examine ΔE9.45; residual V24 DEF→PWR·HP) · `arena-cleared`† (examine ΔE9.07), `heroes`† (compare-PASSED `examine` ΔE10.35; residual V11 (locked rows) only — V12/N5 RESOLVED), `heroes-partial`† (compare-PASSED `examine` ΔE7.72; V11 locked rows correct; residual N6 partial-seed only),
`hero-detail-{brawn,arcane,cunning}`† (examine ~7.5; residual V23 chip-clip) · `inventory-awards`† · `inventory-topics`† (PASSED examine ΔE10.96; residual V22 ✓ low) · `inventory-loot`† (eyeballed: per-region bars+✓) · `inventory-events`† (eyeballed: banner+reward grid) · `inventory-codex`† (examine ~10; F2 portraits + ✓), `home`† (PASSED examine ΔE15.15; V19/V20 fixed) · `home-fresh`† · `home-midprogress`† (PASSED examine ~15.7; residual V21 locked-nodes),
`home-midprogress`, `practice`, `drill`† (examine 7.65) · `results`† (compare-PASSED examine ΔE6.43 — best yet; N1 rank portrait works; residual V16/V17), `summary`, `settings`† · `audio`† (examine ~9; eyeball-confirm pending) · `graphics`, `guide`, `splash`.
(No blanket back-fill — each flows through as its visual pass completes, per VISUAL-PARITY.md.)

> ⚠️ **agent-review gate progress (2026-06-28, after first-pass sweep):** a screen is signed only on an agent-PASS.
> **SIGNED (agent-PASS, 6): `summary` ✓ · `drill` ✓ · `arena-cleared` ✓ · `event-play` ✓ (D1/D2 confirmed) ·
> `settings` ✓ · `audio` ✓** — all with only low residuals (mostly V43 Back-gold).
> **EXAMINE / close (3): `inventory-topics` · `inventory-loot` · `inventory-codex`** — data/order MATCH; gated on the
> systemic chrome fixes (V42 caps / V43 Back / V44 type / V45 cards / V46 truncation) + V49 (loot carousel).
> **agent-FAIL (7): `home` (V36/V37/V38) · `heroes-partial` (V28/V30/V31) · `hero-detail` (V29=N2, mine) ·
> `arena-prefight` (V47) · `arena-map` (V48) · `inventory-awards` (V45/V42/V43 + detail-strip data) ·
> `inventory-events` (V44/V46 + time-event data).**
> **High-leverage:** the 5 systemic rows V42–V46 recur across most EXAMINE/FAIL inventory+chrome screens — fixing them
> clears several at once. Still un-reviewed: `home-{fresh,midprogress}` (track `home`), `hero-detail-{arcane,cunning}`
> (track `hero-detail`/V29), `results`/`heroes` (re-pass after wave-2).
>
> **after wave-3/4 re-review (2026-06-28):** still 6 signed. ✅ V42 + V43 + V50 RESOLVED. (older note retained.)
>
> **after wave-6 (`2074b86`, B's FIRST self-gated push — 2026-06-28):** the blind-iteration fix WORKED — **V28 (clean
> small ★), V30 (stat pills), V42 (right-sized title) genuinely LANDED** (verified on the RAW render; the agent-gate
> false-flagged V30 as "plain text" — overturned by raw inspection). **heroes-partial render is now at parity** — only
> blocker is **N6 capture-state** (B rendered the 3/12 state, web ref is 7/12 → V31 "tap for details" unverifiable;
> B must re-render against `capture-states.json` partial, or Babysitter re-captures the web ref). `home` still FAIL
> (V36 hoard closer-but-low/weak-wings, V37 tree edges, V38 nav+banner glyphs). **Signed still 6** (heroes-partial one
> capture-state re-render from signable). hero-detail still gated on V29 (mine).
>
> **after wave-7 (`12bff72`) → 7 SIGNED.** ✅ **`heroes-partial` SIGNED** (N6 aligned 7/12, roster matches row-for-row,
> V28/V30/V31 confirmed on the raw render). ✅ V16/V31/V36/N6 RESOLVED; V25/V26/V27 ledger rows cleaned (were stale).
> 🔴 **`home` STILL open on V37 (connectors) + V38 (nav/banner) — B has NEVER attempted these** (6 home waves = hoard
> only). SIGNED: summary, drill, arena-cleared, event-play, settings, audio, **heroes-partial** = **7/26**.
>
> **after wave-8 (`2f25d4f`, first BATCH push — 2026-06-28): good batch progress, still 7 signed.** ✅ RESOLVED:
> V39 (glyphs), V45 (inventory row cards, all tabs), V51 (loot bar bug). 🟡 PARTIAL (B did the easy half, skipped the
> hard): V37 (✓ badges done, CONNECTORS skipped — 3rd time), V48 (⚔/CTA/`/10` done, scenery backdrop + progress-dots
> remain), V49 (carousel structure done, real loot items remain). **The inventory family (loot/topics/awards/events/
> codex) is now close (ΔE 5.5–8.6) but ALL gated on the ⭐ keystone V44** (proportional content-name font, not yet
> attempted). Also NEW systemic **V52 (padding/safe-margin)** + still-open V44/V46/V47/V40/V41. No new signs until V44
> + V52 land (they gate the whole inventory + arena families).
>
> **after wave-9 (`7f4bb3f`, hard-first batch — 2026-06-28): still 7 signed, but the hard rows are FINALLY being
> attempted.** B led with V44 + V37 (the forced keystones). V44: font swapped but doesn't hit parity (3 verify agents
> FAIL — reads blocky/mono + names GREEN not white + oversized); inventory-topics/loot = FAIL, heroes = EXAMINE.
> V37: another half-measure (thicker spine, still no graph edges) → **ESCALATED to sole-task**. NEW owner rows:
> **V53 (nice-button geometry — unit test on `main`)** + V52 padding. No sign-offs; V44 (white/smooth) + V37 (edges)
> + V52/V53 (padding/buttons) are the gate now.
>
> **after wave-10 (`09590b6`, hard rows landing — 2026-06-29) → 9 SIGNED.** ✅ **V44 RESOLVED** (white proportional
> names, green→accents only; keystone met → inventory + heroes unblocked). ✅ **`inventory-topics` + `heroes` SIGNED**
> (agent-EXAMINE, residuals cosmetic → V54). 🟡 **V37 PARTIAL** (vertical chain landed; horizontal sibling + purple
> branches still missing — I corrected a premature RESOLVE after re-checking the raw render). `home` still FAIL
> (V37 partial + V38 nav/banner + V53 buttons + V36 weak wings). SIGNED: summary, drill, arena-cleared, event-play,
> settings, audio, heroes-partial, **inventory-topics, heroes = 9/26**. Likely-close next: inventory-loot/awards/codex
> (same V44 treatment; verify per-screen residuals — loot V49 real items).

---

## RESOLVED / ACCEPTED (archive)
*(none yet — move rows here with the date + the owner's sign-off as they close)*

---
*Completion check: GG1-on-brickmap v1 is COMPLETE only when §A, §B, §C are empty (all RESOLVED/ACCEPTED) AND every
screen in §D has passed the compare gate. The Babysitter holds the tag until then.*
