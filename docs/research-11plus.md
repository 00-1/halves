# Halves — 11+ Drill Topics: Research & Design (v2)

> Canonical design doc after two research passes. Expands the game into many
> timed mental-maths "sub-operation" drills for UK 11+ grammar-school prep.
> **Status: researched & specced — not yet built. Awaiting scope sign-off.**

## Goal

Make pupils **fast at the small recurring sub-operations inside questions**, not
reproduce whole 11+ questions. Each drill = one atomic operation, short timed
rounds, **numeric answers only** (fits the existing numpad — negatives framed as
positive distances, times as elapsed minutes, so no minus/colon keys).

## Exam context

- The relevant UK 11+ maths paper uses **GL Assessment** (switched from CEM in
  2023). Maths paper ≈ **50 questions / 50 min**, multiple-choice, **no
  calculator** (~1 min/question, multi-step).
- **≈70% of the paper is number/arithmetic**; the rest geometry (~10–14%), data
  (~6–8%), algebra/sequences (~4–6%), measures embedded throughout.
- Mix of **direct computation** (~30–40%) and **worded** problems (~60–70%) that
  still require real arithmetic. Halving/doubling, fractions, %, and ×/÷ by
  powers of 10 are explicitly "hidden inside word problems".

## GL frequency ranking (drives build order)

- **High:** four operations; fractions (of amounts, equivalence); decimals
  (place value, ordering); percentages of amounts; halving/doubling; ×/÷ by
  10/100/1000; rounding/estimation; ratio; money; time; metric conversions;
  2-digit mental ± and 2-digit × 2-digit.
- **Medium:** sequences (term-to-term > nth-term); mean/median/mode; geometry
  (angles, area/perimeter); coordinates; volume; data interpretation.
- **Low:** negative numbers; BODMAS; primes/factors/HCF/LCM; Roman numerals;
  probability.

## Calibrated value ranges (pass 2)

- **Fraction↔dec↔% recall set** (Year 6): ½ ¼ ¾ ⅕ ⅖ ⅘ 1/10 (+ ⅓ as recurring).
  **⅛, 3/8, 1/20 are 11+ stretch** → Part-2 material. (Keep answers terminating;
  thirds excluded from exact-answer modes.)
- **Ratio:** 2-part, amounts ≤100, parts ≤10 (≤200 / parts ≤20 stretch; 3-part is
  KS3 → Part-2 stretch).
- **Sequences:** term-to-term foundational; **linear nth-term (an+b)** in scope →
  Part 2. Quadratic/geometric not expected (geometric ok as a fun Part-2).
- **Negatives:** ±20 foundational, ±50 stretch; add/subtract across zero,
  difference between a negative & positive (no ×/÷ of negatives — KS3).
- **Rounding:** to 10/100/1000 and 1–2 dp. **No significant figures at KS2.**
- **Percentages:** 50/10/25 first, then 1/5/20/75; bases ≤100 (≤500 stretch).
- **Roman numerals:** I–M (to 1000) + years — *is* curriculum but GL-rare → keep
  as a low-priority fun mode.
- **Mult. tricks:** ×11 (2-digit) is the real payoff; ×25/×9/×5 are enrichment.
  Times-table fluency matters more than exotic tricks.
- **T162 P1 — mock-driven building blocks** *(added 2026-06-22; per Luke's BWS
  Mock 7 diagnostic in IDEAS I9; calibration spec in `docs/agent/T162-calibration.md`)*:
  - **Proportion / unit-rate (`scaling`):** clean integer unit rate; `M · X / N`
    answer ≤ 999 (short numpad). Mix `÷-then-×` with a few `×1.5 / ×2.5` (still
    integer results). Notation `N→X, M→?`. *masterSecs ≈ 10.*
  - **% decrease / "the rest" (`percentoff`):** %s from {5, 10, 15, 20, 25, 30, 45,
    50}; bases ≤ 100 (a few ≤ 500 stretch); integer or 1-dp answers. *masterSecs ≈ 9.*
  - **Reverse part → whole (`partwhole`):** unit fractions ½ ¼ ⅓ ⅕ ⅛ and %s
    {10, 20, 25, 50}; whole ≤ 200, integer. Prompt `a/b of ? = g` or `p% of ? = g`.
    *masterSecs ≈ 8.*
  - **Complete-the-sum (`balance`):** evaluate one side then *inverse* the other
    to find the missing balance — `a ⊕ b = c ⊖ ?`. LHS within tables (×) or
    ≤ 100 (+/−); **Part-1 answers POSITIVE-ONLY** (the numpad has no minus key:
    keys are 0–9, `.`, backspace, skip — see `index.html:111-122`). The
    negative-stretch (e.g. `37×4 = 100−?` → −48) is a follow-up if the numpad
    grows a `−` key. *masterSecs ≈ 9.*
- **T162 P2 — clean procedures the mock surfaced** *(2026-06-22)*:
  - **Ratio share (`ratioshare`):** 2-part, amount ≤ 100, parts ≤ 10; a few
    3-part stretch (180 in 2:3:7 → 105). Prompt names which share to give
    (`bigger`/`smaller`/`biggest`) so the answer stays single-valued. *masterSecs ≈ 10.*
  - **Time gap (`timegap`):** minutes between two **24-h-clock** times, span
    15 min – 2 h 59 m, crosses the hour. **Answer in minutes** only (no `:` key
    on the numpad). *masterSecs ≈ 7.* Eyebrow "minutes between".
  - **LCM / HCF (`lcmhcf`):** inputs ≤ 30, LCM ≤ 200; prompt clearly labels
    LCM vs HCF up front. Also underpins fraction common-denominators.
    *masterSecs ≈ 8.*
  - **Mean (`mean`):** 3–5 values ≤ 60, integer mean (forward half); the
    back half is the **reverse** (missing value given the mean — the inverse
    move `balance` drilled in P1, hence the unlock gate). *masterSecs ≈ 9.*
- **T162 P3 — extensions to existing modes** *(2026-06-22)*:
  - **Cubes (`cubes`):** n³ for n ∈ 2..10 (answers ≤ 1000); mirrors `squares`.
    A deliberately small fixed set. *masterSecs ≈ 4.*
  - **Money (`money`):** n items at £x.xx (×, 2dp) and change from £10/£20.
    Answers in £ to 2dp (the numpad accepts decimals, cf. `fractions`). Change
    is never negative. *masterSecs ≈ 9.*
  - **Digit sum (`digitsum`):** sum the digits of a 3–4-digit N (the ÷3/÷9
    mechanic), plus the connected **remainder N ÷ 9** (= digit-sum mod 9). All
    answers small integers (numpad-clean — the owner-blessed way to drill
    divisibility without a new engine answer type). *masterSecs ≈ 6.*
  - **Doubles/Halves range check:** the sets now reach the 2-digit ×2±1 atom
    (double 39 = 78, half 78 = 39) — the mock Q5 (4,9,19,39 is ×2+1) support.

## Design principles (pass 2 — apps & pedagogy)

- **Accuracy before speed; keep the timed bar gentle.** Timed pressure is a known
  driver of maths anxiety in 9–11s. The game is a speed drill by nature, but the
  **Part-2 unlock bar stays relaxed** and the unlock is celebratory, not punishing.
- **Progressive disclosure for collectibles** (Pokédex pattern): we already show
  locked items as "?" tiles and group by category — keep that; don't require 100%.
- **No public leaderboards** (they demotivate slower kids). Ours is **local-only**
  Hall of Fame — fine. Keep it device-local.
- **Mastery gate** to open the next level (cf. Komodo/Khan/TTRS), framed with
  mastery praise ("you mastered Part 1 — Part 2 unlocked").

## Final mode catalogue

**Every topic is a FIXED, pre-generated question set** — a curated array
(~21 representative entries) that `build()` shuffles each round, exactly like
Halves/Times/Squares/Fractions. No infinite random generators: fixed sets keep
best-times comparable and give every topic its per-question Beat/Spark
collectibles. All answers are numeric & numpad-enterable.

### Wave 1 — highest GL value (recommended first build)

| Topic | Part 1 | Part 2 (locked) |
|---|---|---|
| Number bonds | to 100 (63→37) | to 1000 (740→260) + decimal bonds to 1 (0.3→0.7) |
| Add / Subtract | 2-digit within 100 (47+35, 82−18) | 3-digit ± 2-digit (240+85, 312−47) |
| Percentages of | 10/25/50% of ≤400 (25% of 160=40) | 1/5/20/75% of ≤200 (75% of 60=45) |
| Fractions of | ½ ¼ ⅓ ⅕ of (¼ of 20=5) | ⅔ ¾ ⅗ ⅝ of (¾ of 20=15) |
| Place value ×/÷ | whole ×÷ 10·100 (35×100=3500) | decimals ×÷ 10·100·1000 (3.5×100=350) |
| Rounding | nearest 10/100/1000 (6832→6800) | decimals to 1–2 dp (4.67→4.7) |
| F↔% equivalences | recall set → % or decimal (¾→75) | eighths/1-20 (⅜→37.5, 1/20→5) |
| Metric convert | whole units (3 km→3000 m) | decimals (250 cm→2.5 m) |
| Time | unit convert (3 h→180 min) | elapsed minutes (10:45→11:20=35) |
| Money | change from £5/£10 (£5−£3.40=1.60) | totals + change from £20 |
| Ratio | share 2-part ≤100 (share 20 in 1:3) | bigger / 3-part biggest share |

### Wave 2 — medium / low frequency (iterate after)

| Topic | Part 1 | Part 2 (locked) |
|---|---|---|
| Multiply (big) | 2-digit × 1-digit (14×7) | 2-digit × 2-digit (24×15) |
| Multiply tricks | ×11 of 2-digit (23×11=253) | ×25, ×9, ×99 |
| Sequences | term-to-term next (2,5,8,11→14) | linear nth-term (3n+2: 10th=32) |
| Mean | of 3 numbers (4,8,6→6) | of 4–5 numbers |
| Cubes & roots | cubes 1³–10³ (4³=64) | √ ≤225 and ∛ ≤1000 |
| Factors & primes | smallest prime factor / next prime | HCF of two (≤60) |
| Negatives | difference across zero (−6→2 = 8) | range ±50 |
| BODMAS | two ops (2+3×4=14) | brackets & ÷ (2×(3+4)=14) |
| Roman numerals | →number ≤100 (XLVII=47) | →number ≤1000 / years (MCMXCIV=1994) |

(Existing modes: Halves, Doubles, Times, Squares, Fraction→decimal.)

## Progression model (v3 — agreed)

Two layers of gating so a beginner isn't overwhelmed but depth remains:

1. **Topic chain (easy).** Players start with **one** topic unlocked. Completing
   a topic **once** (its "Initiate" achievement — just finish a round) unlocks
   the **next** topic in the ordered path. So content reveals gradually.
2. **Part 2 (hard, optional).** Each topic's harder Part 2 is a side-branch
   gated by **Mastery** of Part 1 (no skips + gentle time). Not required to
   advance the main chain.

**Completion visibility.** Every topic row shows its collectible progress
(e.g. `Halves 7/24`) with a clear "incomplete" marker, so it's obvious which
already-played topics still have items worth returning for.

**100% requires real mastery.** Every topic is a fixed set, so its full set
deliberately includes its hardest items — Spark on *every* question, **all four
speed brackets up to Lightning (avg < 1.1s)**, Flawless, and Mastery — so a topic
can't be fully collected without genuinely mastering it.

### Unlock chain — ordered by importance (GL value)

Topics unlock in **importance order** (most foundational / highest-frequency
first). Start unlocked: **Halves**.

1. Halves *(exists)* — 2. Times *(exists)* — 3. Doubles *(exists)* —
4. Add/Subtract — 5. Number bonds — 6. Place value ×/÷ — 7. Fractions of —
8. Percentages of — 9. F↔% equivalences — 10. Fraction→decimal *(exists)* —
11. Rounding — 12. Money — 13. Time — 14. Metric — 15. Ratio —
16. Multiply (big) — 17. Mean — 18. Sequences — 19. Squares *(exists)* —
20. Cubes & roots — 21. Factors & primes — 22. ×-tricks — 23. Negatives —
24. BODMAS — 25. Roman numerals.

(Top trio Halves/Times/Doubles are all "very high" importance; Halves opens as
the gentlest on-ramp and app namesake. Order is data — trivially reshuffled.)

## Mechanics to build

1. **Topic-chain unlock.** Each mode declares `unlockedBy: "<prevTopicInitiate>"`
   (or none for the first). A topic is playable once that achievement is owned.
   Auto-unlock anything the player has already played (migration).
2. **Mastery gate for Part 2.** New per-mode **Mastery** achievement = finish
   Part 1 **with no skips AND under a gentle target time** (tunable). Part-2
   modes `requires: "mastery:<part1Id>"`. Unlocks fire a celebratory toast.
3. **Mode-picker redesign.** Scrollable list grouped by category, each row
   showing best/rank **and collectible progress**; locked rows greyed with the
   unlock hint; incomplete (played) topics flagged.
4. **Collectibles auto-extend.** Generator already builds init/flawless/speed/
   rank per mode. Add a **Mastery** item per Part-1 mode; per-question
   **Beat/Spark** for *fact* modes; new **milestones** ("unlock N topics",
   "clear every topic", "all-flawless", "100% a topic").

## Decisions locked

- **Topic chain:** start with one topic; **one playthrough unlocks the next**.
- **Part-2 gate:** Mastery = **no skips + under a gentle time bar** (per mode).
- **Completion is visible** per topic; **100% requires mastery** (Lightning etc.).
- Hall of Fame stays **device-local** (no public leaderboard).

## Build approach

Because topics unlock gradually, they can ship incrementally without a new
player noticing gaps. Plan: build the **engine** (chain unlock, Part-2 mastery
gate, picker redesign, completion display) + the **first ~8 topics** of the
path, then add the rest in follow-up commits.

## Sources

Pass 1 & 2: GOV.UK National Curriculum (Maths PoS); GL Assessment familiarisation;
Atom Learning, Exam Papers Plus, Pass Eleven Plus, PiAcademy, CGP, Bond 11+
(GL format & topic frequency); Third Space Learning, Oak National Academy, NCETM,
BBC Bitesize, Oxford Owl (curriculum & value ranges); TTRS, Komodo, DoodleMaths,
Prodigy, Sumdog, Mathletics, Khan Academy (progression/reward design); SDT (Deci/
Koestner/Ryan), Ed Week & leaderboard/anxiety studies (motivation cautions).

## Phase 3 — Hero / Enemy metagame (the engagement layer)

Phase 3 (heroes, items, the 100-tier Arena, currency) is the **engagement layer**
that sits on top of the educational drills — it gives the practice a purpose
(collect → upgrade → climb) without changing the maths. All battles still run
through the existing numeric-answer drill engine over the player's unlocked
topics. The collection gates progress: the final tier (The Void Sovereign) is
calibrated to fall only at ~full collection, so the climb rewards broad, sustained
practice rather than a single lucky round. See `docs/agent/DESIGN-heroes.md`.
