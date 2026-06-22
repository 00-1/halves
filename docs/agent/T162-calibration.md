# T162 — Mock-driven drill modes: research & calibration pass (for owner sign-off)

> Babysitter-owned design doc. Source: Luke's SEP 11+ Mock 7 (BWS), 11/27 — see **IDEAS I9** for the
> per-question decomposition. Owner frame: *"not reproducing 11+ questions — drilling the building blocks to
> answer them quickly."* **Every mode is a FIXED ~21-item set of `{ p: prompt, a: numeric answer }`** (shuffled
> per round), exactly like the existing modes — no random generators; all answers numeric & numpad-enterable;
> stays inside `research-11plus.md`'s calibrated bands. Once the owner blesses the list, **A** builds the
> `modes.js` sets + a Node logic gate each, and folds the ranges into `research-11plus.md`.

**How to read this:** each block = the building-block atom, the mock evidence, the calibrated range, a
representative **sample** (full set built to ~21), the suggested `masterSecs` (time target), group, and unlock
slot. Sample answers shown in `()`.

---

## Tier P1 — highest value (build first)

### 1. `scaling` — Proportion / unit-rate  ·  group "Reasoning" (new) · unlock after `percentages2`
**Atom:** given "N → X", scale to "M → ?" (find the unit, multiply up). **Mock:** Q7 (2.4km/12min→35min),
Q13 (speed), Q21 (250g/8 cakes→28) — *wholly un-drilled, 3 questions.* **Calibration:** clean integer unit
rate; M·unit ≤ 999 so the answer stays short; mix ÷-then-× with a few one-step ×1.5/×2.5 (still integer
results). Notation A's choice — proposed `N→X, M→□`.
- `4→200, 6→□` (300) · `5→75, 8→□` (120) · `3→18, 7→□` (42) · `6→90, 10→□` (150)
- `8→200, 5→□` (125) · `2→9, 6→□` (27) · `5→60, 7→□` (84) · `3→21, 8→□` (56)
- `4→6, 10→□` (15, ×1.5) · `250→8, □→28` reverse-friendly variants kept rare/stretch
**masterSecs ≈ 10** (multi-step). `expr:true`.

### 2. `percentoff` — Percentage decrease / "the rest as %"  ·  group "Fractions & %" · unlock after `percentages2`
**Atom:** N − (X% of N), i.e. the *remaining* %. **Mock:** Q4 (£48 −15%), Q19 (girls = 100−45% of 360) — the
single most recurrent miss theme. **Calibration:** % from {10,25,50,20,15,5,30}; bases ≤100 (a few ≤500
stretch); integer or 1-dp answers.
- `20% off 50` (40) · `10% off 80` (72) · `25% off 60` (45) · `15% off 40` (34)
- `30% off 90` (63) · `5% off 80` (76) · `50% off 38` (19) · `10% off 350` (315, stretch)
- `45% off 360` (198 — the Q19 atom, stretch base)
**masterSecs ≈ 9.** `expr:true`. *(Pairs naturally with the existing `percentages` chain.)*

### 3. `partwhole` — Reverse: find the whole from a part  ·  group "Fractions & %" · unlock after `fractionsof2`
**Atom:** "1/4 of ? is 7" → ×4 = 28; "20% of ? is 9" → 45. **Mock:** Q17 (28 green = 7/20 → 80) decomposes to
this. **Calibration:** unit fractions ½ ¼ ⅓ ⅕ ⅛ and %s {10,20,25,50}; whole ≤ 200, integer.
- `¼ of □ is 7` (28) · `⅕ of □ is 6` (30) · `½ of □ is 19` (38) · `⅓ of □ is 8` (24)
- `10% of □ is 9` (90) · `20% of □ is 9` (45) · `25% of □ is 7` (28) · `⅛ of □ is 5` (40)
**masterSecs ≈ 8.** `expr:true`.

---

## Tier P2 — quick wins & clean procedures

### 4. `ratioshare` — Share an amount in a ratio  ·  group "Reasoning" · unlock after `scaling`
**Atom:** sum the parts, total ÷ parts, × the share asked. **Mock:** Q3, Q18 (2:3:7 of 180 → largest 105).
**Calibration (per research doc):** 2-part, amount ≤100, parts ≤10; a few 3-part as stretch. Prompt names which
share to give (keeps it single-answer).
- `20 in 2:3 → bigger` (12) · `45 in 4:5 → bigger` (25) · `30 in 1:5 → bigger` (25)
- `28 in 3:4 → smaller` (12) · `50 in 1:4 → bigger` (40) · `36 in 5:4 → bigger` (20)
- `180 in 2:3:7 → biggest` (105, stretch) · `24 in 1:2:3 → biggest` (12, stretch)
**masterSecs ≈ 10.** `expr:true`.

### 5. `timegap` — Time interval (minutes)  ·  group "Reasoning" · unlock after `placevalue2`
**Atom:** minutes between two clock times, crossing the hour. **Mock:** Q12 (14:38→16:07 — a 70%-easy lost).
**Answer in minutes** (numpad-clean; no "1h29m"). **Calibration:** spans 15 min – 2 h 59 m; 24-h clock.
- `14:38 → 16:07` (89) · `09:50 → 11:15` (85) · `13:25 → 14:10` (45) · `08:40 → 09:05` (25)
- `10:15 → 12:00` (105) · `07:55 → 08:30` (35) · `15:20 → 17:05` (105) · `11:48 → 12:36` (48)
**masterSecs ≈ 7.** `expr:false`, eyebrow "minutes between".

### 6. `lcmhcf` — Lowest common multiple / highest common factor  ·  group "Core" · unlock after `times`
**Atom:** LCM / HCF of two numbers. **Mock:** Q27 (buses 12/18/30 → LCM 180 → 11:00; only 6% got it).
**Calibration:** inputs ≤30, LCM ≤200; clearly label LCM vs HCF in the prompt.
- `LCM 4,6` (12) · `LCM 6,8` (24) · `LCM 12,18` (36) · `LCM 12,30` (60)
- `HCF 24,36` (12) · `HCF 18,24` (6) · `HCF 30,45` (15) · `LCM 5,7` (35)
**masterSecs ≈ 8.** `expr:false`. *(Also underpins fraction common-denominators.)*

### 7. `mean` — Average (mean)  ·  group "Reasoning" · unlock after `addsub2`
**Atom:** sum ÷ count; then the **reverse** (missing value given the mean). **Mock:** Q2 ✓ (reverse — keep
sharp), Q20 ✗ (chart mean). **Calibration:** 3–5 values ≤60, integer mean; reverse variants as the back half.
- `mean 4,8,6` (6) · `mean 10,14,12` (12) · `mean 3,7,5,9` (6) · `mean 12,15,9` (12)
- reverse: `mean of 5,7,□ is 6` (6) · `mean of 8,□,10 is 9` (9) · `31,44,28,52,39,□ mean 37` (28, stretch)
**masterSecs ≈ 9.** `expr:true`.

---

## Tier P3 — extensions to existing modes (cheap, high-leverage)

### 8. `cubes` — Cube it  ·  group "Core" · unlock after `squares` (mirror the squares mode)
**Atom:** n³ for small n. **Mock:** Q22 (4²+3³−5 ✓ — keep cubes fluent). **Calibration:** n ∈ 2..6 plus 10
(answers ≤216, or 1000). `build(){ return shuffle(CUBES_SRC).map(n => ({ p:n+"³", a:n*n*n })); }`
- `2³`(8) `3³`(27) `4³`(64) `5³`(125) `6³`(216) `10³`(1000)  *(small fixed set; pad with mixed review)*
**masterSecs ≈ 4.**

### 9. `money` — Money: totals & change  ·  group "Core" · unlock after `addsub2`
**Atom:** n items at £x.xx (× small int) and **change from £10/£20**. **Mock:** Q4, Q15 (6×£1.35, change from
£10). **Answers in £ to 2dp** (numpad allows decimals, cf. `fractions`). Keep prices x.xx with clean-ish
products.
- `4 × £1.25` (5.00) · `6 × £1.35` (8.10) · `3 × £2.40` (7.20) · `change from £10 of £8.10` (1.90)
- `change from £10 of £6.55` (3.45) · `5 × £0.80` (4.00) · `change from £20 of £13.40` (6.60)
**masterSecs ≈ 9.** `expr:true`. *(Decimal-money fluency — several near-misses were here.)*

### 10. `doubles`/`halves` range check — **no new mode; verify reach**
Confirm the existing sets reach **2-digit** (e.g. double 39 = 78, half 78 = 39) so the Q5 atom (4,9,19,39 is
×2+1) is supported by fluent doubling. If the current set tops out lower, extend the SRC array — A's call.

---

## Sequencing / unlock placement (proposed)

- New group **"Reasoning"** for the multi-step modes (`scaling`, `ratioshare`, `timegap`, `mean`) so they read
  as a distinct skill family; `percentoff`/`partwhole`/`money`/`cubes`/`lcmhcf` slot into existing groups.
- Unlock chain keeps the mastery-gate spirit: each new mode `unlockedBy`/`requires` a sensible predecessor
  (noted per mode) so the picker isn't flooded at once.
- **Build order if the owner wants a subset first:** P1 (`scaling`, `percentoff`, `partwhole`) → P2
  (`timegap`, `lcmhcf`, `ratioshare`, `mean`) → P3 (`cubes`, `money`, range check).

### 11. `digitsum` — Digit sum (the ÷3 / ÷9 rule mechanic)  ·  group "Core" · unlock after `lcmhcf`
**OWNER-BLESSED (2026-06-22)** as the numpad-clean way to drill the divisibility gap. **Atom:** sum the digits
of N — the actual mechanic behind the ÷3 and ÷9 tests. **Mock:** Q11 (which is ÷ by 9 — 70%-easy lost).
**Calibration:** N is 3–4 digits; answer is the digit sum (a small integer, numpad-clean). A back-half variant
asks **"remainder of N ÷ 9"** (= digit-sum mod 9) to connect the sum to divisibility.
- `digit sum of 7263` (18) · `digit sum of 7267` (22) · `digit sum of 4581` (18) · `digit sum of 936` (18)
- `digit sum of 5012` (8) · `remainder 7263 ÷ 9` (0) · `remainder 7267 ÷ 9` (4) · `remainder 845 ÷ 9` (8)
**masterSecs ≈ 6.** `expr:false`, eyebrow "digit sum" / "remainder ÷ 9".

---

## ✅ OWNER SIGN-OFF (2026-06-22)
- **Scope: BUILD ALL** — P1 (`scaling`, `percentoff`, `partwhole`) + P2 (`ratioshare`, `timegap`, `lcmhcf`,
  `mean`) + P3 (`cubes`, `money`, doubles/halves range check) + **`digitsum`** (the blessed divisibility answer).
  **11 modes total.**
- **Divisibility → `digitsum`** (option a) — no new engine answer type.
- **Suggested delivery: in TIERS** (P1 → P2 → P3), one push per tier, so the Babysitter reviews incrementally
  and the owner can feel P1 early — not one giant push. Each mode ships with its Node logic gate.

---
*Maintained by the Babysitter. On owner sign-off, this promotes into `BACKLOG T162` build steps + the
`research-11plus.md` calibration table; A builds the sets with per-mode logic gates.*
