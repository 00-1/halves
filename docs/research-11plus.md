# Halves — 11+ Drill Topics: Research & Design

> Working design doc. Captures the research synthesis and the proposed expansion
> of the game into many timed mental-maths "sub-operation" drills aimed at UK
> 11+ prep (Bishop Wordsworth's School & South Wilts Grammar, Salisbury).
> Status: **researched, not yet built** — pending a second clarifying research
> pass and scope sign-off.

## Goal

Not to reproduce 11+ questions, but to make pupils **fast at the small recurring
sub-operations** that appear inside questions. Each drill = one atomic operation,
short timed rounds, numeric answers only (fits the existing numpad).

## Exam context (research pass 1)

- **Bishop Wordsworth's** and **South Wilts Grammar** both use **GL Assessment**
  (switched from CEM in 2023).
- Format: four papers (Verbal Reasoning, English, Maths, Non-Verbal Reasoning),
  **multiple-choice**. Maths paper ≈ **50 questions / 50 minutes**, **no
  calculator**.
- Content: full **Key Stage 2** curriculum, pushed slightly beyond Year 6.
  Majority "number" questions. Strong emphasis on quick mental arithmetic.

## Facts pupils must know cold (Years 5–6)

- **Number bonds**: to 10, 20, 100, 1000, and decimal bonds to 1.
- **Times tables** 1–12 (+ division inverses).
- **Squares** 1²–12²; **cubes** 1³–10³ (min 1³–5³).
- **Primes** to 19 (recall) / to 100 (identify); **divisibility** rules 2,3,4,5,6,10.
- **Fraction ↔ decimal ↔ percentage** equivalences: ½, ¼, ¾, ⅕, ⅖, ⅘, 1/10, 3/10,
  1/100; Year 6 adds ⅓, ⅔, ⅛, ⅜, ⅝.
- **Doubling/halving** into 3 digits and 1-dp decimals.
- **Rounding** to 10/100/1000 and decimal places; **BODMAS** (Year 6 only).
- **Roman numerals** to 1000 (Year 5).
- **Metric** conversions (km/m/cm/mm, kg/g, l/ml); **time** (s/min/h, day/week).

## Speed sub-skills worth drilling (research pass 1)

Percentages of amounts (10/25/50 → 1/5/20/75%); ratio sharing; complements to
10/100/1000; near-multiple compensation (+9/+99); ×/÷ by 10/100/1000 incl.
decimals; ×5/×25/×9/×11 tricks; negative numbers crossing zero; sequences
(term-to-term); mean of small sets; 12h↔24h & elapsed time; money change &
totals; fractions of amounts.

## Proposed mode catalogue (16 topics → ~32 modes)

Each topic has a foundational **Part 1** and a harder **Part 2** that is locked
until an achievement is earned in Part 1. `type`: *generated* (infinite random
questions) vs *fixed* (a curated set, so it can also award per-question
Beat/Spark collectibles).

| # | Topic | Part 1 | Part 2 (locked) | Type |
|---|---|---|---|---|
| 1 | Number bonds | to 100 | to 1000 + decimal bonds to 1 | generated |
| 2 | Percentages of | 10/25/50% | 1/5/20/75% | generated |
| 3 | Fractions of | ½ ¼ ⅓ ⅕ of | ⅔ ¾ ⅗ ⅝ of | generated |
| 4 | Place value ×/÷ | ×÷ 10·100 (whole) | decimals & ÷1000 | generated |
| 5 | Multiply tricks | ×5, ×11 | ×9, ×25, ×99 | generated |
| 6 | Cubes & roots | cubes 1³–10³ | √ and ∛ | fixed |
| 7 | Rounding | nearest 10/100 | nearest 1000 + 1 dp | generated |
| 8 | Order of ops (BODMAS) | 2 operations | brackets & ÷ | generated |
| 9 | Roman numerals | to 100 | to 1000 + years | fixed |
| 10 | Metric convert | whole units | decimals | generated |
| 11 | Sequences | arithmetic next term | geometric / decreasing | generated |
| 12 | Mean (average) | of 3 numbers | of 4–5 numbers | generated |
| 13 | Factors & primes | smallest prime factor / next prime | HCF of two | generated |
| 14 | Time | unit convert | elapsed minutes | generated |
| 15 | Money | change from £5/£10 | totalling + change from £20 | generated |
| 16 | F↔% equivalences | fraction → % | % → fraction / decimal | fixed |

All answers numeric: negatives are framed as positive distances; times as
elapsed minutes (no colon/minus keys needed).

## Mechanics to add

1. **Mode locking** — each Part 2 declares `requires: <collectibleId>`. Default
   gate: finish Part 1 with no skips ("Flawless"). Locked modes show 🔒 + the
   requirement; unlocking fires a special toast.
2. **Mode picker redesign** — ~37 modes won't fit as wrapping pills. Move to a
   scrollable list grouped by category (Core · Number · Fractions & % · Measures
   · Reasoning), each row showing best/rank; locked rows greyed with hint.
3. **Collectibles auto-extend** — the generator already builds init/flawless/
   speed/rank items per mode. Fixed-fact modes also get per-question Beat/Spark.
   Add new milestones: "unlock N Part-2 topics", "clear every topic",
   "all-flawless".

## Open questions (for research pass 2)

- Which of these topics actually appear (and how often) in **GL** 11+ maths vs
  being generic KS2? Calibrate priority.
- Correct **value ranges / difficulty** per topic so drills are pitched right.
- Resolve flagged uncertainties: ratio scope at 11+; sequences term-to-term vs
  nth-term; negative-number ranges; significant figures; importance of eighths/
  thirds equivalences.
- Good **Part 1 → Part 2 progression** design (and patterns from existing apps
  like TT Rock Stars / Komodo / Doodle for unlock/progression).

## Sources (pass 1)

GOV.UK National Curriculum (Maths PoS); Third Space Learning (number bonds,
percentages, primes, squares, BODMAS, decimals, ratio, fractions, mean); Atom
Learning & Exam Papers Plus & Pass Eleven Plus (GL format, Wiltshire schools);
Oak National Academy; NCETM; PlanBee; Bond 11+; STA KS2 arithmetic paper.
