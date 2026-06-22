# GG2 MILESTONES — "Goblin Gold" #2 · Verbal Reasoning · plant/nature (living roadmap)

> Build roadmap for **GG2 (Verbal Reasoning)** — plant/nature aesthetic, the **Plants & Beasts**
> cultivate/pacify metagame, gold carried over. Created 2026-06-22. **All POST-GG1-LAUNCH** — nothing
> here diverts the current GG1 launch. Companion to `FRANCHISE-DESIGN.md` (the locked decisions).
> Milestones are roughly dependency-ordered; many can overlap. Not yet builder-assigned.

---

## Prereq P0 — Engine foundation (shared, enables ALL sequels)
**Goal:** the core/pack split + pluggable input — GG2 is built on this, not a fork of GG1.
- **P0.1 Core/pack refactor:** extract GG1 into CORE (shell, `fxgl`, `synth`, round loop, progression/
  mastery/streak, collection, **gold/economy**, dev mode, guide framework, settings/onboarding, update
  flow; **the nav notification-BADGE system — "new-since-seen" — built in GG1 T218**) vs CONTENT-PACK (questions, input, answer-checker, assets, metagame). *(FRANCHISE-DESIGN §3)*
- **P0.2 Pluggable INPUT system:** input as a module — **multiple-choice (build first)**, letter-tiles/
  on-screen keys, tap-a-target, numpad. A question declares its mode; the shell renders widget +
  checker. *(FRANCHISE-DESIGN §4 — the make-or-break investment.)*
- **Deliverable:** GG1 still runs unchanged on the refactored core; a thin "GG-template" a new game packs into.

## M1 — VR content research (deep)
**Goal:** know exactly which VR *atoms* to drill before writing a single generator.
- Deep research into 11-plus VR question types (GL/CEM): synonyms/antonyms, alphabet arithmetic (letter
  ±position), letter/number sequences, simple codes/ciphers, analogies, odd-one-out, hidden/embedded
  words, word-pairs, compound words, anagrams, logic/deduction. Decompose each into **atomic sub-skills**.
- Calibrate difficulty/age-appropriateness (10–11), the input mode each atom needs, and which are
  Part-1 vs locked Part-2.
- **Deliverable:** `research-vr.md` (the VR analogue of `research-11plus.md`) — atom list, calibrated
  ranges, per-atom input mode, examples, what's drillable vs what isn't.

## M2 — VR question generators + assessment
**Goal:** a polished, calibrated VR question set at GG1 scale (~30 topics).
- Build the generators for the VR atoms (per M1), each declaring its **input mode** (mostly MCQ + letter-
  tiles). Answers single + unambiguous; numpad replaced.
- **Reuse the T213 method:** enumeration harness + AI-agent assessment + iterate until clean (the
  iterative assess↔fix loop) — VR has more ambiguity risk than maths, so this matters even more.
- **Deliverable:** ~30 VR generators, an assessment-clean question set, a `QUESTION-QUALITY-AUDIT`-style
  doc, regression gates.

## M3 — VR guides + explain()
**Goal:** every topic has a polished, helpful method guide + per-question hint. *(GG1 lesson: don't ship
topics with no guide.)*
- Write a guide + tailored `explain()` for **every** VR topic from day one.
- **Deliverable:** complete `guides` pack; no topic without a guide.

## M4 — Plant/nature VISUAL research + rendering (deep)
**Goal:** a distinct, cohesive natural/plant aesthetic — the counterpoint to GG1's void/gold.
- Deep visual-direction research (the analogue of GG1's `VISUAL-DIRECTION-RESEARCH.md`) for a plant/
  nature pixel aesthetic that still uses the brickmap dither/halftone engine.
- Retarget `fxgl`: plant/nature **biomes/backdrops** (12 realms), the palette, the generative-art style
  for crops/seeds/beasts.
- **Deliverable:** `research-vr-visual.md` + the retargeted backdrops + generative-art generators.

## M5 — New INVENTORY: seeds & crops (GG1-scale)
**Goal:** the collectible set, reflavoured to growables, **typed + spec'd**.
- A collectible roster at GG1 scale (~the same count): **seeds, tubers, nuts, legumes, fruits, fungi,
  other flora** — each **typed** (the matchup type) + spec'd (rarity → grow time 2–10h + pacification
  power). Their generative pixel art.
- The **crop/harvest** data model: seed → (grow) → crop.
- **Deliverable:** the seed/crop catalogue + art + the type/rarity/spec system.

## M6 — Beasts + 12 REALMS
**Goal:** the "enemy" roster as **nature beasts**, in **12 realms** (GG1 had 10).
- 12 realms (themed nature biomes) × a beast roster, each beast **typed**; generative beast art (the
  reflavoured `monsters` analogue). Boss-beast per realm.
- **Deliverable:** the beast roster + 12-realm ladder + beast art + the type triangle (crop-type vs
  beast-type pacification matchup).

## M7 — The PLANTS & BEASTS metagame (replaces Arena)
**Goal:** the cultivate→pacify loop, wired up.
- **Plots:** limited planting slots (resource choice). **Plant → wall-clock grow (2–10h by rarity) →
  harvest.** **Feed crops to beasts → pacify one at a time** up the realm ladder; **type matchup** sets
  pacification level. The "feeding" interaction replaces GG1's battle playout.
- **Gold:** carries over but **buys nothing** — it just **goes UP** (the absurd-wealth meta-joke + hoard, same as
  GG1). Seeds come from **drilling drops**; plots unlock from **progression** — NOT bought with gold.
- **Balance pass:** a sim (like GG1's `economy-sim.js`) for grow-times, plot count, seed drop rates,
  pacification math (NO gold sinks — gold isn't spent) — so progression feels right and a kid is never *stuck* waiting (can
  always drill for more).
- **Deliverable:** the working metagame + a balance doc.

## M8 — Audio (new, same scale)
**Goal:** nature-themed soundtrack, same number of styles as GG1, via `synth`.
- New music styles (nature/organic flavour — apply the GG1 study-music findings to keep it calm/
  unstressful), SFX for plant/harvest/pacify.
- **Deliverable:** the GG2 `synth` context set.

## M9 — Branding & assets
**Goal:** GG2's identity.
- **Subtitle** (the GG2 "Void Throne" equivalent — nature-themed), **icon** (maskable, nature/plant), the
  **brand creature**, palette, the splash title styling (reuse the pixel-title engine, new ramps).
- Naming/package per the BACKLOG naming notes (umbrella "Goblin Gold"; GG2 package id).
- **Deliverable:** the asset pack + store-ready icon.

## M10 — Onboarding, dev mode, Codex
**Goal:** the shell experiences, reflavoured.
- **Nav badges (from core, GG1 T218): crops-ready alert** on the Plants/farm nav item when a crop has ripened (+
  new seed/beast/realm). The headline GG2 use of the badge system.
- First-run onboarding that teaches **planting/pacifying** (new mechanic — needs teaching). Dev mode
  (gold-setter, reveal-all, testers — from core). A **Codex/collection** of crops/beasts/realms art.
- **Deliverable:** onboarding + dev + Codex packs.

## M11 — QA, perf, launch
**Goal:** ship-ready.
- The content quality pass (M2's loop) re-run end-to-end; accessibility (reduced-motion etc.); the
  low-end-Android perf pass on the new rendering; the Play Store productionisation (GG2 = new app/
  package; ID already verified from GG1; Designed-for-Families/Teacher-Approved; closed-testing).
- **Deliverable:** GG2 live.

---

## Sequencing (rough)
**P0** (engine) → then in parallel: **M1→M2→M3** (VR content spine) ‖ **M4** (visual) ‖ **M8** (audio).
**M5 + M6** (inventory + beasts) feed **M7** (metagame). **M9/M10** (branding/shell) alongside. **M11**
(QA/launch) last. *(P0 + M1 + M4 are the long poles — research-heavy.)*

## Still to decide (open)
- GG2 **subtitle** + brand creature.
- **How many types** in the matchup triangle (GG1 uses 3).
- Grow-time curve + plot count (M7 balance).
- Whether the hoard visual stays as the wealth display or is reflavoured.
- Final topic count for VR (target ~GG1's 30).

*Living doc — refine as P0 lands and decisions are made. Babysitter-owned. Cross-ref: FRANCHISE-DESIGN.md.*

---

## COMPLETENESS PASS — does this truly bring the project to completion? (Babysitter, 2026-06-22)
Owner asked, while prepping the GG2 unattended long run: *"does the milestones doc truly bring the project
to completion?"* Verdict: **the P0–M11 spine builds GG2-the-game well, but it had GAPS for (a) the
multi-game FRANCHISE glue and (b) the discipline an UNATTENDED run needs to self-verify and not stall.**
Below: the gaps found + the milestones added/amended to close them. (Hosting detail: `FRANCHISE-HOSTING.md`.)

### Gaps found → fixes
1. **🔴 Repo/hosting structure was missing entirely.** GG2 can't be "built on the same GHP" until the
   folder split + per-app SW-cache namespacing + localStorage namespacing exist. → **folded into P0 as
   P0.3/P0.4/P0.5** (below). This is prerequisite, not late.
2. **🔴 The "gold carries across every game" mechanic had no plumbing.** FRANCHISE-DESIGN locks it but no
   milestone built it. Because localStorage is origin-shared, it needs a deliberate **shared franchise
   wallet** namespace. → **P0.4**.
3. **🔴 GG1 save migration through the core refactor / URL move** was unspecified — players must not lose
   gold/collection when GG1 moves under `gg1/prod/` and `halves.*`→`gg1.*`. → **P0.5**.
4. **🟠 Inter-game linking / cross-promotion + the parental gate** (owner discussed earlier: linking to
   sibling GG games is allowed but needs a non-maths press-and-hold gate) had no milestone. → **new M12**.
5. **🟠 No explicit per-milestone EXIT CRITERIA / DoD.** For an unattended run the agents must be able to
   self-check "is this milestone actually done?" → **every milestone gets a one-line DoD** as P0 is picked
   up (tracked as a standing convention below); **M11 carries the full launch checklist** (mirror GG1's).
6. **🟠 Core-evolution discipline** — once GG1 + GG2 both depend on extracted CORE, a core change must not
   silently break GG1. → **P0.6** (core is versioned; GG1's pinned copy only moves via a deliberate
   re-pin + its test suite green).
7. **🟢 Deliberate omissions (record so they're not mistaken for gaps):** NO analytics/telemetry (kids
   privacy — same as GG1); NO accounts/login; NO server (static PWA only); monetisation stays FREE/no-IAP
   (FRANCHISE-DESIGN). These are intentional.

### Added to P0 (engine foundation now also = franchise foundation)
- **P0.3 — Multi-app GHP restructure.** The `gg1/{v1,dev,prod}` + `gg2/dev` folder layout; root
  `index.html` → franchise landing/redirect; the dev→prod promote step. *(FRANCHISE-HOSTING.md.)*
- **P0.4 — Per-app namespacing + gold carry-over by IMPORT** (owner chose ISOLATED saves). SW cache names
  prefix-scoped (no cross-eviction); per-game localStorage prefix (`gg1prod.*`, `gg2.*`, …), nothing
  shared-mutable. "Gold carries across every game" = a **one-time import at GG2 first-run** (read GG1 prod's
  `gg1prod.gold`, seed GG2's hoard, then it grows on its own) — NOT a live shared wallet, so dev can't
  pollute prod. *(FRANCHISE-HOSTING.md — switch to a shared wallet only if the owner wants one live number.)*
- **P0.5 — GG1 save migration.** One-time `halves.*` → `gg1.*` (+ gold → the franchise wallet) so no live
  player loses progress on the move; GG1 keeps running unchanged.
- **P0.6 — Core versioning.** CORE is a pinned, separately-versioned unit; GG1 re-pins only deliberately
  with its full suite green — so building GG2 on CORE can't regress GG1.

### Added milestone
- **M12 — Franchise hub & cross-promotion.** The root landing/hub that lists the GG games; in-app
  "more GG games" links behind a **parental press-and-hold gate** (non-maths, per the earlier store
  discussion); shared branding for the umbrella "Goblin Gold". *(Sequence: alongside M9/M10; needs the
  hosting split from P0.3.)*

### For the UNATTENDED run — operating rules (so it completes without stalling)
- **Each milestone is DONE only when:** its deliverable exists + builds + `node -c` clean + its tests green
  + (content milestones) the enumeration-harness + assessment loop is clean. Write the milestone's DoD line
  before starting it.
- **Decision-points that need the OWNER (don't guess — ask, then proceed):** the GG2 subtitle + brand
  creature (M9); #types in the matchup triangle (M6); grow-time curve + plot count (M7 balance); whether
  the hoard visual is reflavoured (M4); final VR topic count (M2); the `FRANCHISE-HOSTING.md` Decisions
  1–3. Batch these early so the run isn't blocked mid-way.
- **Babysitter cadence carries over:** Builders push in batches; the Babysitter independently verifies +
  re-assesses each (same 3-agent protocol). The post-build deep quality pass (T213-style) runs per content
  milestone.

**Revised completeness verdict:** with P0.3–P0.6 + M12 + the per-milestone DoD convention + the flagged
owner-decision batch, the roadmap now covers **GG2 the game AND the franchise glue AND an unattended run's
self-verification** → it reaches a genuine "GG2 live + the franchise can keep growing on one GHP" end state.
Remaining true unknowns are the *creative* decisions (above), which are owner calls, not roadmap gaps.

*Updated 2026-06-22 after the franchise-hosting design. Re-fold P0.3–P0.6 into the P0 section proper when
the run kicks off.*
