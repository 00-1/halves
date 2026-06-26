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
| V8 | arena-prefight | Bottom action buttons render solid-yellow (bright) vs web's subtler Back + "Pick your party" treatment — the residual hot band after V1–V7 (compare ΔE 10.2) | polish | B | OPEN | |
| V9 | event-play | Prompt + answer drawn in bordered boxes; web shows them as borderless large text (the residual hot band, ΔE 8.3) | polish | B | OPEN | |
| V10 | event-play | Missing the per-question TIMER (web shows "1.3s") + the top progress bar; B shows event title + counter only. Verify the event drill still surfaces the speed timer (it drives Spark scoring). | med | B | OPEN | |
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
| D2 | event-play | Render tints the bg purple (event theme); web is near-black neutral. Theme it, or match web? | DECIDE | |

## C. Open NON-VISUAL parity issues

| ID | Area | Issue | Sev | Owner | Status | Sign-off |
|----|------|-------|-----|-------|--------|----------|
| N1 | art / Items screen | `itemDigest` (all 2702 item icons, the `drawIcon` ARCH branch) NOT yet ported/proven — needed for the Items/inventory screen, not Arena/event-play. Export ready (`bfe89b1e`); B ports with the Items pass. | must | B | OPEN | |
| N2 | collectibles / determinism | `Collectibles.CATALOG` order is non-deterministic run-to-run (a few solve/spark ids reorder). Harmless today (gates sort; committed file is fixed; art vectors made order-independent), but a future export regen could reorder `collectibles.json`. Fix = stable `CATALOG.sort(by id)` + regenerate all + B re-sync, as one coordinated step. | low | Babysitter (owner-steer) | OPEN | |
| N3 | audio | Music score is golden-proven (12 goldens); SFX synthesis is only partially verified (not byte-golden vs web). Confirm SFX parity or accept as by-ear. | med | B / Owner-ear | OPEN | |
| N4 | animation / FX | Battle-playout pace + callouts, particle bursts, screen transitions are not cross-repo frame-verified (inherent: two render engines). Likely an ACCEPT once eyeballed on-device. | low | Owner-ear | OPEN | |

## D. Screens PENDING acceptance comparison (must all be compared + ok/accepted before complete)

The screenshot-compare gate has only run on 2 of 26 screens. Every screen below must, once B declares it complete,
commit a `<screen>-brickmap.png` and pass the compare (verdict `ok`/`examine`-accepted, never `DIVERGENT`):
`arena-prefight`† , `event-play`† (†compare-PASSED `examine` after V1–V7; residual V8–V10 + D1/D2 still open before full accept), `arena-map`, `arena-cleared`, `heroes`, `heroes-partial`,
`hero-detail-{brawn,arcane,cunning}`, `inventory-{loot,topics,events,awards,codex}`, `home`, `home-fresh`,
`home-midprogress`, `practice`, `drill`, `results`, `summary`, `settings`, `audio`, `graphics`, `guide`, `splash`.
(No blanket back-fill — each flows through as its visual pass completes, per VISUAL-PARITY.md.)

---

## RESOLVED / ACCEPTED (archive)
*(none yet — move rows here with the date + the owner's sign-off as they close)*

---
*Completion check: GG1-on-brickmap v1 is COMPLETE only when §A, §B, §C are empty (all RESOLVED/ACCEPTED) AND every
screen in §D has passed the compare gate. The Babysitter holds the tag until then.*
