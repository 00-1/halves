# Halves — 11+ Drill Topics: Research & Design (v2)

> Canonical design doc after two research passes. Expands the game into many
> timed mental-maths "sub-operation" drills for UK 11+ prep (Bishop Wordsworth's
> School & South Wilts Grammar, Salisbury). **Status: researched & specced — not
> yet built. Awaiting scope sign-off.**

## Goal

Make pupils **fast at the small recurring sub-operations inside questions**, not
reproduce whole 11+ questions. Each drill = one atomic operation, short timed
rounds, **numeric answers only** (fits the existing numpad — negatives framed as
positive distances, times as elapsed minutes, so no minus/colon keys).

## Exam context

- **Bishop Wordsworth's** & **South Wilts Grammar** both use **GL Assessment**
  (switched from CEM in 2023). Maths paper ≈ **50 questions / 50 min**,
  multiple-choice, **no calculator** (~1 min/question, multi-step).
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

`type`: *gen* = generated (infinite random questions, mode-level collectibles
only) · *fix* = curated set (also awards per-question Beat/Spark). All answers
numeric & numpad-enterable.

### Wave 1 — highest GL value (recommended first build)

| Topic | Part 1 | Part 2 (locked) | type |
|---|---|---|---|
| Number bonds | to 100 (63→37) | to 1000 (740→260) + decimal bonds to 1 (0.3→0.7) | gen |
| Add / Subtract | 2-digit within 100 (47+35, 82−18) | 3-digit ± 2-digit (240+85, 312−47) | gen |
| Percentages of | 10/25/50% of ≤400 (25% of 160=40) | 1/5/20/75% of ≤200 (75% of 60=45) | gen |
| Fractions of | ½ ¼ ⅓ ⅕ of (¼ of 20=5) | ⅔ ¾ ⅗ ⅝ of (¾ of 20=15) | gen |
| Place value ×/÷ | whole ×÷ 10·100 (35×100=3500) | decimals ×÷ 10·100·1000 (3.5×100=350) | gen |
| Rounding | nearest 10/100/1000 (6832→6800) | decimals to 1–2 dp (4.67→4.7) | gen |
| F↔% equivalences | recall set → % or decimal (¾→75) | eighths/1-20 (⅜→37.5, 1/20→5) | fix |
| Metric convert | whole units (3 km→3000 m) | decimals (250 cm→2.5 m) | gen |
| Time | unit convert (3 h→180 min) | elapsed minutes (10:45→11:20=35) | gen |
| Money | change from £5/£10 (£5−£3.40=1.60) | totals + change from £20 | gen |
| Ratio | share 2-part ≤100 (share 20 in 1:3) | bigger / 3-part biggest share | gen |

### Wave 2 — medium / low frequency (iterate after)

| Topic | Part 1 | Part 2 (locked) | type |
|---|---|---|---|
| Multiply (big) | 2-digit × 1-digit (14×7) | 2-digit × 2-digit (24×15) | gen |
| Multiply tricks | ×11 of 2-digit (23×11=253) | ×25, ×9, ×99 | gen |
| Sequences | term-to-term next (2,5,8,11→14) | linear nth-term (3n+2: 10th=32) | gen |
| Mean | of 3 numbers (4,8,6→6) | of 4–5 numbers | gen |
| Cubes & roots | cubes 1³–10³ (4³=64) | √ ≤225 and ∛ ≤1000 | fix |
| Factors & primes | smallest prime factor / next prime | HCF of two (≤60) | gen |
| Negatives | difference across zero (−6→2 = 8) | range ±50 | gen |
| BODMAS | two ops (2+3×4=14) | brackets & ÷ (2×(3+4)=14) | gen |
| Roman numerals | →number ≤100 (XLVII=47) | →number ≤1000 / years (MCMXCIV=1994) | fix |

(Existing modes: Halves, Doubles, Times, Squares, Fraction→decimal.)

## Mechanics to build

1. **Mastery gate + locking.** New per-mode **Mastery** achievement = finish
   Part 1 **with no skips AND under a gentle target time** (tunable per mode).
   Each Part-2 mode declares `requires: "mastery:<part1Id>"`; it's playable only
   once that collectible is owned. Locked modes show 🔒 + the requirement;
   unlocking fires a special celebratory toast.
2. **Mode-picker redesign.** ~40 modes won't fit as wrapping pills → scrollable
   list grouped by category (Core · Number · Fractions & % · Measures ·
   Reasoning), each row showing best/rank; locked rows greyed with the unlock hint.
3. **Collectibles auto-extend.** Generator already builds init/flawless/speed/
   rank per mode. Add: a **Mastery** item per Part-1 mode (the gate); per-question
   **Beat/Spark** for *fix* modes; new **milestones** ("unlock N Part-2 topics",
   "clear every topic", "all-flawless").

## Decisions locked

- **Part-2 unlock gate:** Mastery = **no skips + under a gentle time bar** (per
  mode, tunable, deliberately not punishing).
- Keep the Hall of Fame **device-local** (no public leaderboard).
- Collectibles keep **progressive disclosure**; 100% completion never required.

## Open scope question

Build **Wave 1 (11 topics) + the engine (mastery/locking/picker)** first and
iterate to Wave 2? Or a tighter first batch, or everything at once?

## Sources

Pass 1 & 2: GOV.UK National Curriculum (Maths PoS); GL Assessment familiarisation;
Atom Learning, Exam Papers Plus, Pass Eleven Plus, PiAcademy, CGP, Bond 11+
(GL format & topic frequency); Third Space Learning, Oak National Academy, NCETM,
BBC Bitesize, Oxford Owl (curriculum & value ranges); TTRS, Komodo, DoodleMaths,
Prodigy, Sumdog, Mathletics, Khan Academy (progression/reward design); SDT (Deci/
Koestner/Ryan), Ed Week & leaderboard/anxiety studies (motivation cautions).
