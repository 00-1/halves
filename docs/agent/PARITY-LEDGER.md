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
| V1 | arena-prefight | Only ONE foe shown — web shows the full 3-foe enemy team (tier foe + 2 typed supports) | must | B | OPEN | |
| V2 | arena-prefight | No per-hero MATCHUP BADGE (▲ Advantage ×1.5 / ▲–▼) on party cards | must | B | OPEN | |
| V3 | arena-prefight | Missing the "How battles work" primer + the "Journey map" button | must | B | OPEN | |
| V4 | arena-prefight | Render shows a post-battle "Victory! Cleared tier 3" bleed; show the clean pre-fight; button label "Pick your party"; soften the heavy green selected-card fill to web's amber border | polish | B | OPEN | |
| V5 | event-play | Numpad order INVERTED — web 7/8/9 top (calculator), render 1/2/3 top (phone) | must | B | OPEN | |
| V6 | event-play | Missing the "How to approach this" hint button above the numpad | must | B | OPEN | |
| V7 | event-play | Backspace is "<" vs web's pixel ⌫ icon; Skip is a solid-yellow bar vs web's subtle outline | polish | B | OPEN | |

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
`arena-prefight`*, `event-play`* (*first cut — see §A), `arena-map`, `arena-cleared`, `heroes`, `heroes-partial`,
`hero-detail-{brawn,arcane,cunning}`, `inventory-{loot,topics,events,awards,codex}`, `home`, `home-fresh`,
`home-midprogress`, `practice`, `drill`, `results`, `summary`, `settings`, `audio`, `graphics`, `guide`, `splash`.
(No blanket back-fill — each flows through as its visual pass completes, per VISUAL-PARITY.md.)

---

## RESOLVED / ACCEPTED (archive)
*(none yet — move rows here with the date + the owner's sign-off as they close)*

---
*Completion check: GG1-on-brickmap v1 is COMPLETE only when §A, §B, §C are empty (all RESOLVED/ACCEPTED) AND every
screen in §D has passed the compare gate. The Babysitter holds the tag until then.*
