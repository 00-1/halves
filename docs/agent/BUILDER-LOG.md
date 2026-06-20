# Builder log (Builder-owned) — Babysitter reads

Append a handoff entry after each push. Keep newest at the bottom. Template:

```
## T<n> — <title>  [HANDOFF | BLOCKED]
commit: <sha>
changed: <files / summary>
how I verified:
  - node -c: <result>
  - id cross-check: <result>
  - logic check: <what you ran + result>
  - no TODO/placeholder introduced: <result>
notes / questions: <anything the Babysitter should know>
```

Use `BLOCKED:` (not a handoff) if the task is underspecified or wrong — then wait.

---

## T1 — Topic-chain unlock  [HANDOFF]
commit: f7e4a25
changed:
  - modes.js — reordered MODES to importance order (Halves → Times → Doubles →
    Fractions → Squares) and added `unlockedBy` to each non-first mode
    (times←halves, doubles←times, fractions←doubles, squares←fractions).
  - main.js — added `isUnlocked(m)` (first-in-chain OR prev topic's `init:`
    owned OR own `init:` owned for migration); default mode falls back to the
    first unlocked topic if a saved last-mode is locked; renderTabs marks locked
    topics (🔒 + `.locked`); selectMode previews a locked topic's requirement
    without persisting it as default; renderBest shows the unlock requirement
    for a locked topic; new renderStartState() disables Start when locked;
    start() guards against locked play; route + init wire renderStartState.
  - styles.css — `.mode-tab.locked`, `.mode-tab .lk`, and `.btn:disabled` styles.
how I verified:
  - node -c: modes.js OK, main.js OK, collectibles.js OK.
  - id cross-check: every `$("id")` in main.js exists in index.html (incl.
    startBtn used by renderStartState); 0 missing.
  - logic check: Node harness loading the real modes.js asserts — fresh profile
    → only Halves playable; finishing each topic unlocks exactly the next
    (Halves→Times→Doubles→Fractions→Squares); migration (owning `init:squares`
    keeps Squares unlocked while Fractions stays locked). Also re-verified every
    generator’s answers are numeric, non-negative and numpad-enterable (≤5
    digits, digits + "."). ALL CHECKS PASSED.
  - no TODO/placeholder introduced: grep of changed files clean (only pre-existing
    `.placeholder` CSS class / DOM hook, not introduced here).
  - regressions: only `MODES[0]` fallbacks remain (no hardcoded order assumptions);
    collectible catalogue unchanged at 275 items with all `init:` ids present;
    routing/summary/inventory/build-info untouched.
notes / questions: Existing modes only (Halves, Times, Doubles, Fractions,
  Squares) — new topics will splice into the chain at their importance position
  in their own tasks (T5+). "Selecting a locked topic shows the requirement" is
  implemented via the start-screen best line + disabled Start; the richer picker
  is T3.

## T2 — Mastery achievement + Part-2 gate plumbing  [HANDOFF]
commit: 1f5dedb (on main)
changed:
  - modes.js — added `masterSecs` to all 5 modes per the BACKLOG tier table
    (halves 4, times 3.5, doubles 4, fractions 3.5, squares 3.5). Documented
    `masterSecs` + the `requires:"mastery:<id>"` Part-2 convention in the header.
  - collectibles.js — new "Mastery" category (added to CATS, slotted after
    Speed) and a `mastery:<id>` item per mode (rarity epic). Its test = round
    finished with 0 skips AND `totalTime ≤ mode.masterSecs × total` (i.e. avg ≤
    masterSecs). Awarded automatically through the existing `evaluate()` path in
    finish() (per-mode `modeId` filter keeps it scoped to the played mode).
  - main.js — `isUnlocked()` now honours `requires:"mastery:<id>"` (Part-2 gate)
    AND `unlockedBy` (chain), with own-`init:` migration overriding both; new
    `unlockHint()` produces the right hint for chain vs Part-2 locks (used by the
    locked best-line). New `showTopicToast(m)` fires a celebratory toast when a
    topic becomes newly playable; finish() snapshots unlock state before awarding
    collectibles and toasts any topic opened this round ("Topic unlocked" for
    chain, "Part 2 unlocked" for mastery gates).
  - styles.css — `.toast .t-glyph` badge styling for the topic-unlock toast.
how I verified:
  - node -c: modes.js, collectibles.js, main.js all OK.
  - id cross-check: every `$("id")` in main.js present in index.html; 0 missing.
  - logic check (Node, loading the real modes/collectibles): masterSecs correct
    on all 5 modes; mastery item present per mode in category "Mastery";
    boundary cases via the real catalogue test — AT target → mastered, just
    under → mastered, just over → NOT, 1 skip (even if fast) → NOT; `evaluate()`
    awards mastery only for the played mode and only when earned; the
    `requires` gate locks a synthetic Part-2 mode until `mastery:<part1>` is
    owned (mere Part-1 `init` is not enough), with migration via own `init`;
    combined requires+unlockedBy needs both; T1 chain regression intact;
    catalogue grew exactly 275→280. ALL CHECKS PASSED.
  - no TODO/placeholder introduced: grep clean (only the pre-existing
    `.placeholder` answer hint, untouched).
  - no regressions: `m.glyph` in the toast is the same trusted mode HTML
    `renderMark()` already injects; inventory skips empty categories so the new
    Mastery section only shows with items; routing/build-info/HOF untouched.
notes / questions: No Part-2 modes ship in this task by design — T2 is plumbing,
  proven by the Node gate test. The unlock toast fires for BOTH chain and Part-2
  unlocks (matches research §Mechanics "Unlocks fire a celebratory toast"); it is
  additive to the existing end-of-round collectible modal, not a replacement.

## T3 — Mode-picker redesign  [HANDOFF]
commit: 2d39d91 (on main)
changed:
  - modes.js — added a `group` field to every mode (halves/times/doubles/squares
    → "Core"; fractions → "Fractions & %") and exported `MODE_GROUPS`
    ("Core · Number · Fractions & % · Measures · Reasoning") as the section order.
  - collectibles.js — exposed `modeItems(modeId)` (all catalogue items for one
    mode: init/flawless/4×speed/mastery/per-question Beat+Spark) — the basis for
    a mode's collectible `have/total`.
  - index.html — start-screen container `#modeTabs` re-classed `modes`→`picker`.
  - main.js — replaced the wrapping pills with a scrollable, grouped list:
    `renderTabs()` now iterates `MODE_GROUPS`, skips empty sections, and renders
    a `modeRow` per mode showing name, a subline (best rank + score · "No best
    yet" · locked requirement), collectible progress `have/total`, and a state
    glyph (▶ play · 🔒 locked · ✓ when 100%). Locked rows carry `.locked` and the
    click handler ignores them (not selectable). New helpers `modeProgress(m)`
    and `unlockReq(m)`; select-then-Start flow unchanged.
  - styles.css — removed the dead `.modes`/`.mode-tab*` pill rules; added the
    `.picker` (max-height 42vh, `overflow-y:auto`) + `.mode-group`/`.mode-row`
    styles. Row is `justify-content:space-between` with `.mr-main{min-width:0}`
    and `.mr-sub{overflow:hidden;text-overflow:ellipsis}` so long sublines
    truncate rather than overflow at 360px.
how I verified:
  - node -c: modes.js, collectibles.js, main.js all OK.
  - id cross-check: every `$("id")` in main.js present in index.html; 0 missing.
  - no dangling refs: grep finds no remaining `mode-tab`/`class="modes"`/`.lk`;
    every picker class used in JS has a CSS rule (dropped the unused `mr-locked`
    wrapper).
  - logic check (Node, real modes/collectibles): all modes have a valid group;
    non-empty sections render in order (Core | Fractions & %), Core holds the 4
    fact modes in importance order; `modeItems` totals correct per mode
    (halves 59, times/doubles/squares 49, fractions 43); row-state logic — fresh
    profile → first mode ▶, rest 🔒; owning a mode's full set → ✓ and unlocks the
    next (▶). ALL PICKER CHECKS PASSED.
  - no TODO/placeholder introduced (only the pre-existing `nameInput` HTML
    placeholder attribute, untouched).
  - no regressions: inventory/summary/results/routing/build-info untouched; the
    start screen and picker both scroll, so no overflow at 360px.
notes / questions: Group assignment for the existing 5 — the four fact-recall
  modes (Halves/Times/Doubles/Squares) in "Core", Fraction→decimal in
  "Fractions & %". "Number", "Measures", "Reasoning" stay hidden until T5+ topics
  fill them. Kept select-then-Start (per the DoD's default); happy to switch to
  tap-to-start if you prefer in review.

## T4 — Per-topic completion + new milestones  [HANDOFF]
commit: 2e73138 (on main)
changed:
  - collectibles.js — three new topic milestone families (cat "Milestone"):
    "unlock N topics" tiers (Explorer 3 / Pathfinder 8 / Trailblazer 16),
    "Topic Master" (one topic at 100%) and "Topic Conqueror" (every topic at
    100%). These carry a `need:{...}` descriptor and are evaluated by a new
    `evaluateTopics(counts, has)` (counts = {unlocked, complete, total}); the
    normal `evaluate()` now skips `need` items so they're only awarded post-round
    with the updated collected state. +5 catalogue items (280→285).
  - main.js — `finish()` now computes `topicsUnlocked` (MODES.filter(isUnlocked))
    and `topicsComplete` (MODES.filter(isModeComplete)) AFTER the round's per-mode
    items are applied, then runs `evaluateTopics` before the collector pass so a
    topic finished to 100% this round counts immediately. New `isModeComplete(m)`
    helper (100% of the per-mode set). Inventory gains a "Topics" overview at the
    top: one row per topic with name, `have/total`, and a ✓ at 100%, plus an
    "N/total at 100%" header.
  - styles.css — `.topic-prog` / `.tp-row` (+ `.done`) styles for that overview.
how I verified:
  - node -c: modes.js, collectibles.js, main.js all OK.
  - id cross-check: every `$("id")` in main.js present in index.html; 0 missing.
    New inventory classes (topic-prog, tp-row/name/prog/state) all have CSS.
  - logic check (Node, real modes/collectibles): catalogue grew exactly +5;
    `evaluate()` never awards topic milestones; unlock tiers fire exactly at 3/8/
    16; one100 at ≥1 complete; all100 only when every topic complete (guarded at
    total 0); a topic completed THIS round counts toward one100; and crucially
    every mode's 100% set provably contains Lightning (speed:*:3) + Mastery +
    Flawless + all Beat/Spark, so "100% a topic" can't fire without the hard
    items. ALL T4 CHECKS PASSED. Regression check (groups/masterSecs/unlockedBy,
    Mastery category, new exports) OK.
  - no TODO/placeholder introduced: grep clean.
  - no regressions: topic rows aren't `.inv-cell`, so the inventory canvas-draw
    and click handler are unaffected; picker/results/routing/build-info untouched.
notes / questions: Interpretation flag for "clear every topic" — I read the three
  milestones as a coherent family using the per-topic 100% metric the task asks me
  to surface: "100% a topic" = one topic complete, "clear every topic" (Topic
  Conqueror) = every topic at 100%. This keeps all three new and non-redundant
  with the existing Pentamind (finish a round in every mode, which stays). If you
  intended "clear every topic" = merely play/finish each topic once, say so and
  I'll repoint it at the initiated-all condition.

## T5 — Add / Subtract  [HANDOFF]
commit: addf0b9 (on main)
changed:
  - modes.js — generated-mode helpers (`randInt`, `genRound` → 20 unique prompts,
    `MINUS` = U+2212) and two generators. New modes spliced into the chain at
    importance position 4: `addsub` (Part 1, 2-digit ± within 100, e.g. 47+35=82 /
    82−18=64; unlockedBy "doubles", masterSecs 5, group "Number", gen) and
    `addsub2` (Part 2, 3-digit ± 2-digit, e.g. 240+85 / 312−47; requires
    "mastery:addsub", off the chain, masterSecs 5, group "Number", gen). Re-linked
    `fractions.unlockedBy` "doubles"→"addsub" so the chain stays contiguous:
    Halves→Times→Doubles→Add&Subtract→Fractions→Squares.
  - collectibles.js — the per-question Beat/Spark loop now skips `gen` modes, so
    generated modes carry mode-level collectibles only (init/flawless/4×speed/
    mastery = 7 items; 100% still caps on Lightning+Mastery+Flawless).
how I verified:
  - node -c: modes.js, collectibles.js, main.js all OK.
  - id cross-check: every `$("id")` in main.js present in index.html (no new ids).
  - logic check (Node, real modes/collectibles): P1/P2 field set correct; chain
    re-links and unlocks step exactly Halves→…→Add&Subtract→Fractions→Squares;
    the P2 mastery gate locks addsub2 until `mastery:addsub` is owned (P1 init is
    not enough). Generators over 2000 full rounds each: **P1 answers integer,
    0..100, numpad-ok; P2 strictly 3-digit ± 2-digit, non-negative, numpad-ok**
    (max 999+99=1098, ≤5-digit guard). Rounds are 20 unique prompts. Gen modes
    expose NO Beat/Spark and exactly the 7 mode-level items incl Lightning+Mastery;
    fixed modes keep Beat/Spark; catalogue 285→299 (+14). The "Number" picker
    group now renders (addsub, addsub2); `evaluateQuestion` returns [] for gen
    modes (no live-toast errors). ALL T5 CHECKS PASSED.
  - no TODO/placeholder introduced: grep clean.
  - no regressions: existing 5 modes/groups/chain untouched except the intended
    fractions re-link; migration (own `init:`) still keeps any played topic open.
notes / questions: `gen:true` marks the generated modes; Part-2 `addsub2` lives in
  the same "Number" group as P1 and shows locked (🔒 "Master Add & Subtract first")
  until P1 mastery. masterSecs 5 for both = Tier 2 ("simple multi-digit") per the
  BACKLOG table; P2 (3-digit±2-digit) is a single op (not multi-step), so it sits
  at the top of Tier 2 rather than Tier 3 — flag me if you'd prefer 9.

## T6 — Number bonds  [HANDOFF]
commit: 8304411 (on main)
changed:
  - modes.js — two generators and two modes spliced into the chain at importance
    position 5 (after Add&Subtract): `bonds` (Part 1, complement to 100, shown as
    "63 + ? = 100" → 37; unlockedBy "addsub", masterSecs 3.5, group "Number",
    gen) and `bonds2` (Part 2, complement to 1000 in tens — "740 + ? = 1000" →
    260 — OR to 1 in tenths — "0.3 + ? = 1" → 0.7; requires "mastery:bonds",
    off-chain, masterSecs 3.5, group "Number", gen). Re-linked
    `fractions.unlockedBy` "addsub"→"bonds": chain stays contiguous
    Halves→Times→Doubles→Add&Subtract→Number Bonds→Fractions→Squares.
  - Bonds are shown as equations so the target (100 / 1000 / 1) is explicit per
    question; the answer is the missing part.
how I verified:
  - node -c: modes.js, collectibles.js, main.js all OK.
  - id cross-check: every `$("id")` in main.js present in index.html (no new ids).
  - logic check (Node, real modes/collectibles): field set + chain re-link +
    unlock steps (…Add&Subtract→Number Bonds→Fractions…) + the bonds2 mastery
    gate all correct. Generators stress-tested — P1 over 3000 rounds: prompt
    well-formed, answer = 100−X, integer 1..99, numpad-ok. P2 over 4000 rounds:
    1000-bonds are multiples of 10 with integer answers; **decimal bonds verified
    EXACT — prompt+answer === 1 (within 1e-12), answer round-trips through the
    numpad (`parseFloat(String(a))===a`), and is always a clean single tenth**
    (built as k/10, never 1−d). Both P2 branches produced. Gen modes carry only
    the 7 mode-level items (no Beat/Spark); catalogue 299→313 (+14). Number group
    now has 4 modes; widest prompt "300 + ? = 1000" (14 chars) fits via fitText.
    ALL T6 CHECKS PASSED.
  - no TODO/placeholder introduced: grep clean.
  - no regressions: only the intended fractions re-link changed in the chain;
    everything else untouched.
notes / questions: masterSecs 3.5 (Tier 1) for both parts — the BACKLOG tier
  table explicitly lists "bonds" under Tier 1 (single-fact recall), and decimal
  bonds to 1 are recall too; flag me if P2 should be Tier 2 (5). Decimal bonds are
  tenths only (matches the "0.3→0.7" spec and stays float-exact).

## T5b — Convert Add/Subtract to fixed sets  [HANDOFF]
commit: e9e8d49 (on main)
changed:
  - modes.js — added fixed curated arrays `ADDSUB_P1_SRC` and `ADDSUB_P2_SRC`
    (21 entries each, format [a,b,sub]: sub=0 "a + b", sub=1 "a − b"). P1 is a
    representative spread of 2-digit ± within 100 (bridging + non-bridging, varied
    magnitudes); P2 spans 3-digit ± 2-digit incl. a carry past 1000 (965+78=1043).
    `addsub`/`addsub2` `build()` now `shuffle(SRC).map(addSubItem)`; removed
    `gen:true` from both. Deleted the dead generators `addSubP1`/`addSubP2`.
    Kept `genRound`/`randInt`/`ROUND_N` (still used by the Number Bonds modes,
    converted in T6) and the `if(m.gen) return` guard (bonds/bonds2 still gen).
  - docs/research-11plus.md — dropped the gen/fix distinction (per the T5b DoD):
    the catalogue note now states every topic is a fixed pre-generated set, and
    both Wave tables lost their `type` column.
how I verified:
  - node -c: modes.js, collectibles.js, main.js all OK.
  - id cross-check: every `$("id")` in main.js present in index.html (no new ids).
  - logic check (Node, real modes/collectibles): addsub/addsub2 are no longer
    gen; each build() returns 21 questions, and the prompt SET is stable across
    rounds (only the order shuffles); every answer matches its prompt arithmetic,
    is integer/non-negative/numpad-safe, with operands at the right widths (P1
    both 2-digit, sum ≤100; P2 3-digit ± 2-digit). Catalogue now contains
    `solve:addsub*`/`spark:addsub*` (each addsub mode = 49 items: 7 + 21 Beat +
    21 Spark); bonds/bonds2 still carry no Beat/Spark; catalogue 313→397. Subtraction
    Beat/Spark keys use the same "−" as play (verified "82 − 18" is catalogued).
    ALL T5b CHECKS PASSED.
  - no TODO/placeholder introduced; no `addSubP1`/`addSubP2`/`gen:true` left on
    Add/Subtract. (genRound/randInt deliberately retained for Number Bonds → T6.)
  - no regressions: chain/groups/masterSecs unchanged; only the build() source
    and the gen flag changed for these two modes.
notes / questions: I edited docs/research-11plus.md because the T5b DoD explicitly
  requires it; flag me if you'd rather own that file. The remaining generator
  helpers exist solely for Number Bonds and are removed in T6 (the `if(m.gen)
  return` guard goes then too, once no gen modes remain).
