# Question & Text Quality Audit (T213 · Phase 1) — Babysitter, 2026-06-22

**Method:** enumerated the COMPLETE question set — every one of the 30 `modes.js` topic generators
called 400× and de-duplicated (they're fixed curated pools, so this is exhaustive, not a sample) →
**622 unique questions**. Then 5 AI-agent assessors (4 over the topics, 1 over guides + static text)
verified every question against: correctness, range/numpad-sanity, difficulty calibration (vs
`research-11plus.md`), age-appropriateness (10–11), clarity/notation, pedagogical value/variety,
consistency. Every arithmetic/unit/fraction/% result was independently recomputed.

## Headline
- **✅ CORRECTNESS: clean.** No wrong answers found across all 622 questions. Every answer is a single
  unambiguous value, non-negative, and numpad-enterable (integers or clean terminating decimals).
  Decimal-answer topics store literals (no float drift) — verified. The generators are solid.
- The real issues are **clarity (terse notation), calibration (a few mis-tiered items), coverage
  (missing guides + thin pools), and redundancy** — quality polish, not bugs.
- **Biggest single gap: 11 of 30 topics have NO static guide** (and several also lack a tailored
  `explain()` hint → fall through to the generic fallback).

---

## HIGH priority

1. **Missing guides — 11 of 30 topics have no how-to text.** No `GUIDES` entry for: `scaling`,
   `percentoff`, `partwhole`, `balance`, `lcmhcf`, `mean`, `timegap`, `ratioshare`, `cubes`, `money`,
   `digitsum`. Several also have **no `explain()` case** → the generic FALLBACK ("Picture the method…").
   These are all live, reachable topics; the multi-step reasoning ones (`balance`, `scaling`,
   `partwhole`, `mean`, `ratioshare`) are exactly where a learner most needs a method. **Write guides +
   tailored `explain()` cases for all 11.** *(guides.js)*
2. **`sequences` — two skills mixed in one unlabelled pool.** Term-to-term "next" (`next: 1,4,7,10`) and
   nth-term formula (`3n + 2, term 10`) share one pool and one "find ↓" eyebrow with no notation cue.
   `research-11plus.md` classifies linear nth-term (an+b) as **Part-2/locked** material. **Split the
   nth-term into a locked Part-2** (or at minimum signpost each prompt shape: "continue the pattern" vs
   "evaluate the rule, e.g. 3n+2 → 10th term"). *(modes.js + guides.js)*

## MED priority (clarity / calibration)

- **`scaling` (all 21):** the bare `N→X, M→?` notation admits an **additive misreading** (`4→6` could
  read "+2" → 12 instead of ×1.5 → 15). Strengthen the eyebrow to force proportion ("same rule — keep it
  in proportion") or render as a mini ratio table.
- **`balance` (all 21):** prompts read as false equations on the surface (`4 × 11 = 50 − ?`). The
  inverse-finding task rides entirely on the bare `?`. Add a clearer cue ("make both sides equal").
- **`ratioshare`:** `36 in 5:4 → bigger` (=20) is the **lone big-part-first** entry among 20
  smaller-part-first ones → a learnable-shortcut trap (a child who learned "bigger = 2nd number" answers
  16). Normalise ordering, or add enough big-first variety that order isn't a shortcut.
- **`mean`:** `mean of 31,44,28,52,39,? is 37` (=28) — a **6-term reverse** with large values exceeds the
  doc's "3–5 values ≤60" calibration + the time budget. Swap for a 4-term reverse, values ≤40.
- **`money`:** answers shown as **stripped decimals** (`£4.00`→`4`, `£1.90`→`1.9`). Confirm the matcher
  accepts `1.90`≡`1.9` and `4`≡`4.00`, and surface the **£ unit** so the expected form is explicit
  (money context invites trailing-zero keystrokes). *(verify main.js matcher; modes.js eyebrow)*
- **`bonds2`:** the to-1000 half is all multiples of 50/100 → barely harder than Part-1 (it's just
  "bonds to 10 with two zeros"). Add a few non-round targets (e.g. `680 + ? = 1000`) so the step-up is real.
- **`cubes`:** pool of only **9** (thinnest topic); the design pairs it with **roots** ("Cubes & roots",
  research line 164) which is **entirely missing**. Add `∛`/`√` items (∛64=4, ∛1000=10, √225=15) → ~14–18.
- **`fractions`:** the eighths/sixteenths — esp. **`1/16 = 0.0625` (a 4-dp answer)** — exceed the base
  recall calibration (doc marks ⅛/3/8/1-20 as Part-2 stretch). Demote them to a locked Part-2; keep base
  to the Year-6 recall set.
- **`rounding`:** `560 to nearest 100` (=600) **violates the generator's own "no half-way tie" comment**
  (560 is the exact tie). Answer is unambiguous under round-half-up, but either swap for a non-tie N or fix
  the misleading comment.
- **`metric`:** litres rendered as bare lowercase **`l`** → misreads as digit "1" (e.g. "5 l in ml").
  Use "L" or spell "litres".
- **`largermd` guide:** ~75% about multiplication, but the question set is **~50% division** — add a worked
  division example. **`addsub2` guide:** its "example" states the answer (`240 + 85 = 325`) without showing
  the method. **`sequences` guide:** replace the abstract `M×k + A` line with a concrete instance
  (`3n+2 → 10th term = 32`).

## LOW priority (redundancy / variety / polish)

- **Redundancy (the pools are only ~21 each — every slot counts):** inverse pairs in `bonds`
  (`92+?` vs `8+?`); `halves`/`doubles` overlap (25/50/125/250); `partwhole` `¼ of ?`≡`25% of ?` and
  `½`≡`50%` near-duplicates; `placevalue` ↔ `placevalue2` exact duplicate **`3.5 × 100 = 350`** (drop from
  P1); `placevalue` 35/350-family clustering.
- **Answer clustering:** `timegap` — **five** questions all = **105 min** (pattern-guessable); `digitsum`
  three remainder answers = 0 + repeated 1.
- **Degenerate/edge:** `mean of 7,7,7,7,7` = 7 (all-identical, thin); `halves` could add awkward even
  2-digit values (38/54/86) to drill arbitrary halving.
- **Variety:** `squares` pool 17 (fine — bounded recall); guides notation drift (`fractionsof` uses ½/¼
  glyphs vs prompt "1/2"/"1/4"); a few tag style drifts (`times` "Know your tables." vs the punchy
  two-fragment siblings; `metric` 8-unit tag is long).
- **No typos** found in any tag/eyebrow; notation (×, ÷, −, %, →, ↓, ², ³) consistent throughout.

---

## Phase 2 — prioritised FIX list (→ [A], `modes.js` + `guides.js`; matcher check in `main.js`)

1. **Write the 11 missing guides + their `explain()` cases** (HIGH). Reasoning topics first.
2. **`sequences`:** split nth-term to a locked Part-2 (or signpost both prompt shapes) (HIGH).
3. **Clarify terse notations** (MED): `scaling` (proportion cue), `balance` ("make both sides equal"),
   `ratioshare` (normalise ratio order), `metric` ("L" for litres). Mostly eyebrow/format tweaks.
4. **Re-tier / fix calibration outliers** (MED): demote `fractions` eighths/16ths (esp. drop `1/16`);
   `mean` swap the 6-term reverse; `bonds2` add non-round to-1000 targets; `rounding` fix the 560 tie/comment.
5. **`money`:** confirm `1.90`≡`1.9`/`4`≡`4.00` in the answer matcher + show the £ unit (MED).
6. **`cubes`:** add the missing roots (∛/√) to deliver "Cubes & roots" and thicken the pool (MED).
7. **Guide content** (MED): `largermd` add a division example; `addsub2` show the method; `sequences` use
   a concrete nth-term instance.
8. **De-duplicate to free pool slots** (LOW): `placevalue` 3.5×100 dup, `bonds` inverse pairs, `partwhole`
   ¼≡25% pairs, `timegap` re-spread the five 105s, `halves`/`doubles` overlap.
9. **Re-run the enumeration harness after fixes** to confirm clean; add a gate that asserts no two prompts
   share differing answers + every answer is non-negative & terminating (catch regressions).

*Assessment by Babysitter via 5 sub-agents (read-only). Fixes = [A]. Full per-topic detail above; the
enumeration harness is reproducible (load `modes.js` with a `window` global, call each `build()` ~400×).*
