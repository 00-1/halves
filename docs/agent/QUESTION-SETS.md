# Question-set curation standard

Every topic is a **fixed, hand-curated set** (~21 entries, shuffled per round).
The sets must be *thought through*, not arbitrary — the original **Halves** set is
the benchmark (`HALVES_SRC`): every value is a number a child actually meets, and
the set spans the concept.

## Principles (apply to every topic's Part 1 and Part 2)

1. **Common, real-world values first.** Prefer numbers pupils genuinely encounter:
   - time: 30, 60, 90, 24, 12, 120 · money: 50, 100, 200, 250, 500, 1000 ·
     angles: 90, 180, 360 · percentages/round tens · measures.
   - Halves exemplar: *half of 30* matters because it's half of half-an-hour.
2. **Representative concept coverage.** The set should span the distinct sub-cases
   of the skill, not cluster on one. Each topic lists its cases below — cover them.
3. **Spread of magnitude & difficulty.** A few easy warmups, a core of typical
   cases, a few stretch items. Vary the size of the operands.
4. **Exact, numpad-safe answers.** Non-negative, terminating (no recurring
   decimals), within the input length guard. Avoid ambiguity.
5. **No filler / near-duplicates.** Don't pad with trivially similar items; every
   entry should add coverage or a worthwhile common value.
6. **~21 items**, both Parts; Part 2 is the genuinely harder band of the same skill.
7. **Document the rationale** in BUILDER-LOG: which common values you included and
   which concept cases the set covers.

## Per-topic coverage checklists (cases to hit)

- **Add / Subtract** — non-bridging (43+25) *and* bridging across a ten (47+38,
  62−28); near-tens / compensation (+9, +19, +99, −19); complements to 100
  (63+37); both + and −; a mix of small and 2-/3-digit (Part 2) operands.
- **Number bonds** — to 100: round (20+80), near-round (45+55), awkward (37+63),
  small & large partners; Part 2 to 1000 (multiples of 50/100) + decimal bonds to
  1 (0.3, 0.25, 0.05…).
- **Place value ×/÷** — ×10 and ×100 (and ÷) of values with and without trailing
  zeros; Part 2 decimals (3.5×100, 0.4×1000, 25÷100) incl. answers <1.
- **Fractions of** — each fraction applied to "nice" multiples so answers are
  whole (¼ of 20, ⅓ of 18, ⅗ of 25); spread of bases incl. money-flavoured.
- **Percentages of** — 10/25/50% across round bases (and money); Part 2 adds
  1/5/20/75% with bases chosen for whole answers.
- **(Future topics)** — add a checklist here when the topic is specced.

## The audit pass

A standing review (task T13) checks each topic's set against the above and refines
real-world relevance + coverage, with Halves as the gold standard. The Babysitter
may run a frequency/curation research pass to inform it. The audit is not optional
polish — weak or arbitrary sets are treated as a Definition-of-Done failure.
