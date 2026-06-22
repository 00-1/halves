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

## T5b — Convert ALL topics to fixed sets (re-handoff after CHANGES)  [HANDOFF]
commit: 7c4b0ad (on main)
addressed every point of CHANGES REQUESTED — T5b:
  1. Converted `bonds` and `bonds2` to fixed curated sets (21 each), per the
     QUESTION-SETS.md Number-bonds checklist:
     - bonds P1 (`BONDS_P1_SRC`, complements to 100): round/tens (20,30,40,50,
       10,70,90 → 80…), near-round (45/55), quarters (25/75), awkward non-fives
       (37/63, 28/72, 49/81), and small↔large partners (8/92).
     - bonds2 P2 (`BONDS_P2_SRC` = [value,target,answer]): to 1000 in multiples of
       50/100 (100,250,300,450,500,600,650,750,800,900,950) AND decimal bonds to 1
       incl. the awkward ones the checklist names — tenths (0.1–0.7), the half
       (0.5), quarters (0.25/0.75) and twentieths (0.05/0.95).
  2. Removed ALL generator code: `genRound`, `randInt`, `ROUND_N`, `bondP1`,
     `bondP2`, the `gen:true` flags, and the `if(m.gen) return` guard in
     collectibles.js. (addSubP1/P2 were already gone.) grep confirms zero
     generator references remain across modes/collectibles/main.
  3. `bonds`/`bonds2` now get per-question Beat/Spark (49 items each).
  4. Fixed the stale `docs/research-11plus.md` line ("Generated modes (no
     per-question Spark)…") — there are no generated modes now.
  5. Curation rationale (below).
why these sets (rationale):
  - Decimal-bond answers are stored as LITERALS in BONDS_P2_SRC (e.g. 0.05→0.95),
    never computed as target−value, so each answer round-trips exactly through the
    numpad (`parseFloat(String(a))===a`) — avoiding the IEEE error 1−0.05 would
    introduce. Verified in Node for every entry.
  - bonds P1 spans the real sub-cases of "make 100": round tens, near-round,
    quarters, genuinely awkward pairs, and both small- and large-partner ends.
  - bonds2 keeps to the checklist's clean bases (multiples of 50/100 to 1000) and
    a representative decimal spread to 1 (tenths/half/quarters/twentieths).
how I verified:
  - node -c clean (modes/collectibles/main); all `$("id")` present.
  - Node logic: addsub/addsub2 untouched (still fixed 21); bonds P1/P2 are fixed
    21-item sets with **stable prompt sets across rounds**; P1 answers = 100−X
    (integer 1..99); P2 to-1000 are multiples of 50 with integer answers, and
    **every decimal answer is mathematically correct (v+a≈1), numpad round-trips,
    and is a clean terminating decimal** (0.25 and 0.05 cases present). All four
    Number modes now carry Beat/Spark; catalogue 397→481. No generator code; no
    TODO/placeholder. ALL T5b CHECKS PASSED.
  - no regressions: chain/groups/masterSecs unchanged; only build() sources + the
    removed gen plumbing changed.
notes / questions: bonds prompts stay in the explicit "X + ? = T" equation form
  (target shown per question, since P2 mixes targets 1000 and 1). All topics are
  now fixed sets — no generator code remains in the codebase.

## T10 — Celebratory in-play unlock particles  [HANDOFF]
commit: 34ae7db (on main)
changed:
  - fx.js (new) — `window.FX` effects module. `particleSpecs(colors,count)` is a
    pure, capped (CAP=14) generator of pixel-square descriptors (random outward
    angle biased upward, size 3–5px, rarity colours cycled). `burst(layer,x,y,
    colors,count,opts)` spawns them and returns a `teardown()`; it also schedules
    its own teardown after the particles finish, so there is never a DOM leak.
    `opts.doc`/`opts.schedule` are injectable (default document/setTimeout) so the
    cleanup path is Node-testable. Guards null layer/doc → safe no-op.
  - index.html — load fx.js before main.js.
  - main.js — refactored the toasts: new `dismissToast(t,hold)` (slide-out via a
    `.hide` class) and `toastBurst(t,pal)` (fires `FX.burst` from the toast centre
    in viewport coords). `showToast` now adds a rarity-tinted "+1" flourish and a
    burst; `showTopicToast` gets an epic-tinted burst. Both are fire-and-forget —
    `window.FX` is feature-guarded.
  - styles.css — toast entrance is now a subtle scale **pop** (`toast-in`
    keyframe) with a matching `toast-out` exit; `.t-plus` floating "+1"; `.particle`
    fly-out/fade keyframe; a `prefers-reduced-motion` fallback that disables the
    animations and hides particles/"+1" (toast still shows).
how I verified:
  - node -c: fx.js, modes.js, collectibles.js, main.js all OK.
  - id cross-check: every `$("id")` in main.js present in index.html (burst uses
    the existing `#toasts`); 0 missing. New classes (.t-plus, .particle,
    .toast.hide) all have CSS.
  - logic + CLEANUP check (Node, real fx.js with a stubbed DOM + injected
    schedule): particleSpecs caps at 14, clamps negatives to 0, cycles colours,
    and yields valid finite specs; burst creates ≤CAP nodes and the scheduled
    teardown removes **all** of them (no leak), is idempotent, and manual
    teardown() also clears the layer; null-layer is a safe no-op. ALL T10 CHECKS
    PASSED. Catalogue still 481 (no collectible regression).
  - no TODO/placeholder introduced (only the pre-existing answer/name placeholders).
non-blocking guarantees (DoD): particles are `position:fixed; pointer-events:none`
  and animate purely in CSS; fx.js never touches the game clock (rAF loop), the
  keydown handler, focus, or input state — so typing/timer are unaffected and the
  round never pauses. Capped at 14/burst, auto-cleaned. Toast width 320 < 360px and
  particles are small fixed squares, so no overflow on a phone.
notes / questions: "+N" is rendered as "+1" per collectible unlock (each in-play
  toast = one new item). Reduced-motion users get the toast without particles/pop.

## T10 — particles: fix showTopicToast ReferenceError (re-handoff)  [HANDOFF]
commit: b8024f8 (on main)
addressed CHANGES REQUESTED — T10 (point 1):
  - `showTopicToast` referenced `pal` (the local in `showToast`); under strict
    mode that threw a ReferenceError on every topic / Part-2 unlock — the toast
    showed (throw was after `add("show")`) but errored and produced no particles.
    My earlier two-step edit had landed the `pal` decl in showToast but not in
    showTopicToast. Fixed: `showTopicToast` now declares
    `const pal = C.paletteFor("epic");` and passes it to `toastBurst(t, pal)`.
how I verified:
  - node -c main.js OK.
  - scope check: grepped every `pal` reference — all three sites are now in
    scope (toastBurst param; `const pal` in both showToast and showTopicToast).
  - runtime check: loaded modes+collectibles+fx+main under a DOM/browser shim
    (Proxy fake elements, sync rAF, stub fetch/location/performance) — the IIFE
    initialises with NO error; catalogue 481, FX wired. This is the runtime check
    that `node -c` alone can't give for main.js, and would now catch this class of
    ReferenceError on the init path.
  - so on a topic unlock / Part-2 unlock, `toastBurst` runs with a valid epic
    palette → particles fire, no console error.
notes / questions: none — only the missing declaration changed.

## T14 — Remove Hall of Fame + Clear-all  [HANDOFF]
commit: 53a5f34 (on main)
changed:
  - index.html — results screen: removed the name-entry (`#nameEntry`/`#nameInput`),
    `#missNote`, and the Hall of Fame block (`#hof`/`#hofMeta`/`#hofList`).
    Best-times screen: removed the **Clear all** button (`#sumClear`).
  - main.js — replaced the qualify/name HOF logic in `finish()` with a single
    `saveBoard(mode.id, loadBoard(mode.id).concat([entry]).sort(rank).slice(0,MAX))`
    so the per-mode top-10 board still records every finished round (nameless).
    Deleted `renderHOF`, `commitName`, the `pendingEntry` state, the `#nameInput`
    listeners, and the `#sumClear` handler.
  - styles.css — removed the now-dead `.nameentry*`, `.hof*`, `.hof-row*`,
    `.hof-empty`, `.missnote` rules.
how I verified:
  - node -c main.js OK.
  - removals: grep confirms zero references to renderHOF/commitName/pendingEntry/
    nameInput/nameEntry/missNote/hofList/hofMeta/sumClear/`hof-` in main.js, and
    none of those ids remain in index.html; no `.hof/.nameentry/.missnote` CSS left.
  - id cross-check BOTH directions: every `$("id")` in main.js exists in
    index.html (0 missing), AND no orphaned ids in index.html (every id is
    referenced; screen ids via the `screens` map).
  - runtime: full app (modes+collectibles+fx+main) loads under the DOM shim with
    NO init error after the removals.
  - best-times still works: `finish()` saves the top-10 board, and
    `renderSummary`/`renderBest`/the picker subline read `loadBoard` (unchanged),
    so a better round updates the best time + rank; entries simply carry no name.
  - kept on results: final time, rank, accuracy, skipped, slowest answers, Play
    again / Modes, the unlock modal + toasts (all untouched).
  - no TODO/placeholder; no dead code.
notes / questions: none — single-player cleanup only; board persistence retained
  for Best Times / ranks / picker.

## T15 — Best Times heat-map + tap-to-retry  [HANDOFF]
commit: 38f9f1a (on main)
changed:
  - main.js — `renderSummary()` redesigned into a colour-coded heat-map with three
    distinct states: **played** rows get a left-edge accent + a subtle background
    tint (the rank colour at ~12% alpha, `rk.color+"1f"`) + the rank label in the
    rank's colour; **not-played** (unlocked) rows are muted with a dashed accent
    and "Not played"; **locked** rows are de-emphasised, show 🔒 + their unlock
    requirement, and carry NO `data-mode` so they can't start. New `#sumList`
    click handler: tapping an unlocked row `selectMode(id)` + `start()` launches
    that topic immediately (double-guarded by `isUnlocked`).
  - styles.css — `.sum-row` is now a flex row with `min-height:44px` tap targets,
    `cursor:pointer` + `:active` scale affordance, a `.go` ▶ chevron, and
    `.played`/`.notplayed`(dashed)/`.locked`(dimmed) state styles. Removed the
    dead `.sum-row.blank` rule.
  - index.html — best-times subtitle now reads "tap one to play it".
how I verified:
  - node -c main.js OK; id cross-check clean; new classes all have CSS; no `.blank`
    refs left; no TODO.
  - render check (Node + DOM shim, seeded localStorage): drove `renderSummary` via
    the `#/best-times` route with a great Halves board and init:halves/init:times —
    output confirmed: Halves → `played` with a `border-left-color`+`…1f` tint and
    `data-mode`; Times/Doubles → `notplayed` + `data-mode`; locked topics carry NO
    `data-mode` (not startable) and show 🔒 + requirement; exactly the 3 unlocked
    topics are tappable. ALL T15 RENDER CHECKS PASSED.
  - runtime: full app loads under the shim with no init error; routing/back
    unchanged (renderSummary still called from `applyRoute`'s best-times branch).
notes / questions: tapping launches via the existing `selectMode`+`start()` path,
  so the played topic also becomes the active selection on the start screen; ≥44px
  rows + ellipsised sublines keep it readable at 360px with the existing scroll.

## T18 — Fullscreen toggle  [HANDOFF]
commit: ba1836e (on main)
changed:
  - index.html — added `#fsBtn` (⛶ Fullscreen) to the start-screen `.linkrow`,
    with an aria-label.
  - styles.css — `.linkrow` now `flex-wrap:wrap; justify-content:center` so the
    third link wraps cleanly at 360px (reuses `.linkbtn`).
  - main.js — `setupFullscreen()` IIFE: feature-detects the Fullscreen API
    (standard + webkit/moz/ms prefixes) on `document.documentElement`; if absent
    (e.g. iOS Safari) it hides the button and binds nothing. Where supported, the
    click (a user gesture) toggles enter/exit via the prefixed methods (each
    wrapped in try/catch with promise `.catch`), and prefixed `*fullscreenchange`
    listeners drive `sync()` to flip the label ⛶ Fullscreen ⇄ ⛶ Exit.
how I verified:
  - node -c main.js OK; id cross-check clean (fsBtn referenced + present); no TODO.
  - behaviour harness (Node + DOM shim), two scenarios:
    * UNSUPPORTED (no requestFullscreen): button gets `hidden`, no
      fullscreenchange listener bound, no error.
    * SUPPORTED (stubbed requestFullscreen/exitFullscreen + fullscreenElement +
      fullscreenchange dispatch): button visible, initial label "Fullscreen";
      click→enter (label "Exit"); click→exit (label "Fullscreen") — icon reflects
      state both ways. ALL T18 CHECKS PASSED.
notes / questions: button hidden (not just disabled) on unsupported browsers for a
  cleaner UI; toggle uses the real click gesture so the browser allows the request.

## T19 — Make the unlock celebration genuinely juicy  [HANDOFF]
commit: c94318a (on main)
changed:
  - fx.js (rewritten) — a full-screen canvas confetti/spark engine. Pure emitter
    math: `burstCount` (common30/uncommon45/rare65/epic90/legendary130), `allowed`
    (global CAP 250), `makeParticle`/`makeBurst` (mixed shapes square/streamer/star,
    sizes 2–9, rarity palette + white/gold sparkles), `stepParticle` (gravity 760
    + drag + spin + twinkle + 1.0–1.6s life). Engine: a RAF loop that **idles
    (stops the RAF) whenever nothing is alive**; `celebrate(x,y,rarity,colors)`
    emits a rarity-scaled burst + a shockwave ring, and for epic/legendary adds a
    vignette glow, top-edge confetti and a delayed second pop. Honours
    prefers-reduced-motion (emits nothing). raf/caf/ctx are injectable for tests.
  - index.html — `#fxCanvas` full-screen overlay (pointer-events:none) before the
    toasts; loaded by the existing fx.js script.
  - main.js — `FX.init($("fxCanvas"))` on load; `toastBurst(t,rarity,colors)` now
    calls `FX.celebrate` (collectible toasts pass their own rarity; topic/Part-2
    toasts pass "epic"). Removed the old div-particle call.
  - styles.css — `.fx-canvas` overlay (z-index 59, below toasts); stronger toast
    pop (scale 1.09) with an amber glow flash via the toast-in keyframe; removed
    the dead `.particle`/`particle-fly` rules; reduced-motion still flattens the
    toast and hides the "+1".
how I verified:
  - node -c fx.js & main.js OK; id cross-check clean (fxCanvas present+referenced);
    no leftover `FX.burst`/`particleSpecs`/`.particle` refs; no TODO.
  - emitter/engine test (Node, stubbed canvas/RAF): per-rarity counts exact &
    strictly increasing; `allowed` clamps to CAP; bursts cap-clamped (248→2,
    250→0); particles valid (finite velocity, size 2–9, life 1–1.6, known shape,
    colour); `stepParticle` applies gravity + ageing and dies at life≤0; engine
    is **idle before any emit, starts the RAF on emit, and IDLES (stops the RAF)
    once empty**; live particles **never exceed CAP under a 30× legendary
    barrage** (=250); **prefers-reduced-motion → zero particles, no RAF**. ALL
    T19 CHECKS PASSED.
  - runtime: full app loads under the DOM shim with no error; FX engine idle at
    rest (no constant loop).
non-blocking/safety (DoD): the canvas is pointer-events:none (never intercepts
  taps); the engine only runs while particles live and touches neither the game
  clock (its own rAF, the drill loop is separate) nor input/focus; self-cleaning
  (RAF stops + canvas cleared at idle; particles culled by life/offscreen).
notes / questions: topic/Part-2 unlocks use the "epic" tier for a big celebration;
  collectible unlocks scale by their own rarity (legendary is the most dramatic).

## T12 — Fix Speed-achievement skip exploit  [HANDOFF]
commit: c5915e0 (on main)
changed:
  - collectibles.js — each Speed bracket's test now requires zero skips too:
    `ctx => ctx.mistakes === 0 && ctx.avg < lv.avg` (was just `ctx.avg < lv.avg`).
    Skipping advances fast, so the old test let a skip-everything round farm
    Quick/Swift/Blazing/Lightning without solving anything. Desc updated to
    "across a clean … round".
how I verified:
  - node -c collectibles.js OK.
  - logic check (Node, real catalogue, halves): a round with ≥1 skip earns **0**
    Speed brackets even at avg 0.0 (and at 5 skips / fast avg); a clean 0-skip
    round earns the correct brackets by threshold (avg 1.0 → all four; avg 1.5 →
    Quick+Swift only; avg 3.0 → none). No other collectible affected: the skipped
    round still earns init but not flawless; the clean fast round keeps flawless +
    mastery. ALL T12 CHECKS PASSED.
  - no TODO/placeholder; no DOM/id changes; no regressions.
notes / questions: ranks were already safe (speed ranks require a perfect score)
  and Mastery already required 0 skips — this aligns Speed brackets with both.

## T11 — Entry / "tap to begin" screen  [HANDOFF]
commit: 544d386 (on main)
changed:
  - index.html — new `#entry` splash screen (now the initial `active` screen;
    `#start` no longer active): brand mark + tagline, a primary "Play in
    fullscreen" (#entryFs), a secondary ghost "Play" (#entryPlay), and a sound
    toggle (#soundBtn).
  - main.js — refactored T18's fullscreen logic into shared module-level helpers
    (`fsSupported/fsActive/fsEnter/fsExit`, all vendor-prefixed + try/catch); the
    in-menu button reuses them. Added persisted sound prefs (`soundOn`/`saveSound`
    on `halves.sound`, default ON) and guarded `audioUnlock()`/`applySoundPref()`
    (no-ops until window.Sound ships in T16). `setupEntry()`: the sound toggle
    persists + relabels; both play buttons run the single gesture — `audioUnlock()`
    + `applySoundPref()` (+ `fsEnter()` for the fullscreen one) then `applyRoute()`
    to reveal the menu / honour a deep link. If fullscreen is unsupported, #entryFs
    is hidden and #entryPlay is promoted to the primary "Play". Init now ends with
    `applySoundPref(); show("entry")` instead of routing immediately.
  - styles.css — `#entry` layout + `.entry-actions` button stack.
how I verified:
  - node -c main.js OK; id cross-check clean (entry/entryFs/entryPlay/soundBtn).
  - behaviour harness (Node + DOM shim, 16 assertions): on load #entry is active
    and #start is not; sound defaults ON, toggling persists `halves.sound` and
    (with a window.Sound spy) calls setMuted(true/false); "Play in fullscreen"
    calls requestFullscreen + audio unlock + reveals the menu; plain "Play" reveals
    the menu WITHOUT requesting fullscreen but still unlocks audio + applies the
    pref; UNSUPPORTED fullscreen hides #entryFs, promotes Play to the primary
    button, and still enters with no error; a deep-link (#/inventory) is honoured
    after the gesture. ALL T11 CHECKS PASSED.
  - no TODO/placeholder; no regressions (T18 menu button still wired via the shared
    helpers; routing intact).
notes / questions: the entry gesture is required every load (fullscreen + Web Audio
  both need a fresh user gesture), so the splash shows each session. window.Sound
  hooks are stubbed/guarded now and will light up in T16.

## T28 — Remove the how-to-play blurb on the start screen  [HANDOFF]
commit: c7b09d8 (on main)
changed:
  - index.html — removed the `.hint` block (the "One round of quick-fire
    questions… Tap skip…" instructions, incl. its `<kbd>skip</kbd>`) from the
    start screen. The game is self-explanatory (answers auto-advance; the skip key
    is labelled).
  - styles.css — removed the now-unused `.hint` and `.hint kbd` rules (the only
    `<kbd>` usage in the app).
how I verified:
  - grep: no `hint`/`kbd` class or element references remain in index.html /
    styles.css / main.js (the two main.js "hint" hits are unrelated comments about
    the unlock-hint text).
  - start screen still has mark → tag → picker → best → Start → linkrow → build,
    laying out cleanly (Start's margin + `.linkrow` margin-top:14px keep spacing).
  - node -c main.js OK (JS untouched); no regressions.
notes / questions: none — pure cleanup; no dead CSS left.

## T29 — Scroll indicator on the topic picker  [HANDOFF]
commit: e27c9c8 (on main)
changed:
  - index.html — wrapped `#modeTabs` in a `.picker-wrap` (position context) and
    added a `.scroll-cue` ▾ inside it.
  - styles.css — moved the picker's outer sizing (max-width/margin) to
    `.picker-wrap`; added `::before` (top fade) / `::after` (bottom fade) overlays
    + the bobbing `.scroll-cue`, all `pointer-events:none`, shown only via
    `.can-scroll-up` / `.can-scroll-down` on the wrap. Reduced-motion stops the bob.
  - main.js — `updateScrollCues()` toggles those classes from the picker's
    `scrollTop`/`scrollHeight`/`clientHeight`. Called at the end of `renderTabs()`
    (re-render), plus a **passive** `scroll` listener on the picker and the window
    `resize` handler. Guarded against a missing wrapper.
how I verified:
  - node -c main.js OK; id cross-check clean (cues are classes, no new ids); the
    `.picker-wrap`/`can-scroll-*`/`.scroll-cue` classes all have CSS; no TODO.
  - behaviour harness (Node + DOM shim) firing the REAL scroll handler: list fits
    → no cues; overflow @top → can-scroll-down only ("more below"); @middle →
    both fades; @bottom → can-scroll-up only (the down indicator disappears at the
    end); shrinking the list back to fitting → cues cleared. ALL T29 CHECKS PASSED.
  - overlays/cue are pointer-events:none (never block taps); recomputed on
    render/scroll/resize; full app loads with no init error.
notes / questions: with 9 topics across 3 groups the picker now genuinely
  overflows ~42vh on a phone, so the "more below" cue is real and useful.

## T7 — Place value ×/÷  [HANDOFF]
commit: 08e9356 (on main)
changed:
  - modes.js — fixed sets + two modes spliced into the chain at importance
    position 6 (after Number Bonds): `placevalue` (Part 1, whole × or ÷ 10/100,
    e.g. 35×100=3500, 4500÷10=450; unlockedBy "bonds", masterSecs 5, group
    "Number") and `placevalue2` (Part 2, decimals ×÷ 10/100/1000, e.g. 3.5×100=350,
    25÷100=0.25; requires "mastery:placevalue", off-chain, masterSecs 5). Re-linked
    `fractions.unlockedBy` "bonds"→"placevalue" so the chain stays contiguous
    Halves→Times→Doubles→Add&Subtract→Number Bonds→Place Value→Fractions→Squares.
curation rationale (per QUESTION-SETS.md Place-value checklist):
  - P1 (`PV_P1_SRC`, 21): ×10/×100 and ÷10/÷100; values WITH trailing zeros (60,
    250, 90, 350, 4500, 800, 9000, 1200) and WITHOUT (35, 7, 128, 4, 8, 24); all
    answers whole and ≤4 digits. ÷ entries use exact multiples so answers stay
    whole.
  - P2 (`PV_P2_SRC`, 21): decimals × and ÷ 10/100/1000 incl. the checklist's
    flavours (3.5×100, 0.4×1000, 25÷100) and **answers < 1** (0.25, 0.08, 0.09,
    0.06, 0.12, 0.9, 0.45, 0.6, 0.35…). Each entry stores the ANSWER as a literal
    so it round-trips exactly on the numpad — never computed as value×/÷target
    (which would drift, e.g. 2.7×10 → 27.000000000000004).
how I verified:
  - node -c (modes/collectibles/main) OK; id cross-check clean (no new ids); no TODO.
  - logic check (Node): field set + chain re-link + unlock steps (…Number Bonds→
    Place Value→Fractions…) + the pv2 mastery gate. P1 over its set: prompt
    arithmetic correct (× / ÷ 10/100), whole, numpad-ok; fixed 21 with a stable
    prompt set across rounds. P2: fixed 21 stable; **every decimal answer is
    mathematically correct (computed ≈ stored within 1e-9) AND round-trips through
    the numpad (`parseFloat(String(a))===a`)**, with answers <1 present. Both modes
    are fixed (no gen) and now carry per-question Beat/Spark (49 items each);
    catalogue 481→579. Number group now lists all six arithmetic modes; widest
    prompt "0.35 × 1000" (11 chars) fits via fitText. ALL T7 CHECKS PASSED.
  - no regressions: only the intended fractions re-link changed in the chain.
notes / questions: masterSecs 5 (Tier 2) for both parts — the tier table lists
  "×÷ powers of 10, place value" under Tier 2; P2 decimals are the same operation
  class, so 5 for both (flag me if P2 should be Tier 3 / 9).

## T8 — Fractions of  [HANDOFF]
commit: c0b3164 (on main)
changed:
  - modes.js — fixed sets + two modes spliced into the chain at importance
    position 7 (between Place Value and the existing Fraction→decimal): `fractionsof`
    (Part 1, ½ ¼ ⅓ ⅕ of an amount; unlockedBy "placevalue", masterSecs 9, group
    "Fractions & %") and `fractionsof2` (Part 2, ⅔ ¾ ⅗ ⅝ of an amount; requires
    "mastery:fractionsof", off-chain, masterSecs 9). Re-pointed
    `fractions.unlockedBy` "placevalue"→"fractionsof". Chain is now Halves→Times→
    Doubles→Add&Subtract→Number Bonds→Place Value→Fractions of→Fraction→decimal→
    Squares. Prompts use the text form "a/b of N" so every glyph renders.
curation rationale (per QUESTION-SETS.md Fractions-of checklist):
  - Bases chosen so EVERY answer is a whole number (the critical rule): e.g.
    1/3 of 18 = 6 (never 1/3 of 20), 5/8 of 16 = 10, 3/5 of 25 = 15. Each entry
    stores the literal whole answer.
  - Coverage: P1 spans all four unit fractions (1/2, 1/4, 1/3, 1/5); P2 spans the
    harder non-unit fractions (2/3, 3/4, 3/5, 5/8). Spread of bases incl.
    money-flavoured amounts (20, 40, 50, 60, 100).
how I verified:
  - node -c (modes/collectibles/main) OK; id cross-check clean; no TODO.
  - logic check (Node): field set + chain re-link + unlock steps (…Place Value→
    Fractions of→Fraction→decimal…) + the fractionsof2 mastery gate. For BOTH
    parts: fixed 21-item sets with stable unique prompt sets across rounds; **every
    answer is whole, equals base×num/den exactly, and is numpad-safe**; P1 uses
    exactly {1/2,1/4,1/3,1/5} and P2 exactly {2/3,3/4,3/5,5/8}. Both fixed (no gen),
    49 catalogue items each; catalogue 579→677. "Fractions & %" group now lists
    fractionsof, fractionsof2, fractions; widest prompt "1/5 of 100" (10 chars)
    fits via fitText. ALL T8 CHECKS PASSED.
  - no regressions: only the intended fractions re-link changed in the chain.
notes / questions: masterSecs 9 (Tier 3) for both — the tier table lists
  "fractions of" under Tier 3 (multi-step). Prompts are text "a/b of N" (not the
  ⅓/⅗/⅝ glyphs) to guarantee rendering everywhere; the topic tags still show the
  pretty glyphs for flavour.

## T9 — Percentages of  [HANDOFF]
commit: 855d95a (on main)
changed:
  - modes.js — fixed sets + two modes spliced into the chain at importance
    position 8 (after Fractions of, before the existing Fraction→decimal):
    `percentages` (Part 1, 10/25/50% of an amount ≤400; unlockedBy "fractionsof",
    masterSecs 9, group "Fractions & %") and `percentages2` (Part 2, 1/5/20/75%
    of an amount ≤200; requires "mastery:percentages", off-chain, masterSecs 9).
    Re-pointed `fractions.unlockedBy` "fractionsof"→"percentages". Chain is now
    Halves→…→Fractions of→Percentages of→Fraction→decimal→Squares. Prompts "p% of N".
curation rationale (per QUESTION-SETS.md Percentages-of checklist):
  - P1 (`PERCENT_P1_SRC`, 21): 10/25/50% across round/money bases ≤400 (80, 250,
    400, 160, 200, 360, 240…), all answers whole (25% of 160 = 40, 50% of 250 =
    125). Bases for 10% are ×10, for 25% are ×4, for 50% even — so every answer is
    whole; stored as literals.
  - P2 (`PERCENT_P2_SRC`, 21): 1/5/20/75% of bases ≤200, answers whole OR clean
    terminating decimals (75% of 60 = 45, 1% of 50 = 0.5, 5% of 90 = 4.5) — all
    stored as literals so they round-trip exactly on the numpad.
how I verified:
  - node -c (modes/collectibles/main) OK; id cross-check clean; no TODO.
  - logic check (Node): field set + chain re-link + unlock steps (…Fractions of→
    Percentages of→Fraction→decimal…) + the percentages2 mastery gate. For BOTH
    parts: fixed 21-item sets with stable unique prompt sets; **base within range
    (P1 ≤400, P2 ≤200), answer = base×pct/100 within 1e-9 of the stored literal,
    and round-trips through the numpad** (`parseFloat(String(a))===a`); P1 uses
    exactly {10,25,50}% and P2 exactly {1,5,20,75}%; P2 includes clean decimal
    answers. Both fixed (no gen), 49 items each; catalogue 677→775. "Fractions & %"
    group now has 5 modes; widest prompt "25% of 120" (10 chars) fits via fitText.
    ALL T9 CHECKS PASSED.
  - no regressions: only the intended fractions re-link changed in the chain.
notes / questions: masterSecs 9 (Tier 3, "% of"). This completes the originally
  specced Phase-2 topics (T5–T9); the remaining `*_SRC` sets all meet the
  QUESTION-SETS standard and use literal answers wherever division could drift.

## T16 — Audio core + 8-bit SFX  [HANDOFF]
commit: 0692712 (on main)
changed:
  - sound.js (new) — `window.Sound`: a single AudioContext created/resumed on the
    first gesture via `unlock()` (wired into T11's existing entry-screen
    `audioUnlock()` — no second gesture added); a master gain + `setMuted/isMuted`
    that gate playback; pure `sfxSpec(event,opts)` voice builders; a fire-and-forget
    `play()` scheduler (oscillator + gain envelope, all <0.6s) that no-ops without a
    context or when muted; suspends the context on `visibilitychange` (hidden).
    SFX methods: correct(combo)/skip/item(rarity)/gold(big)/topicUnlock/mastery/
    topic100/roundStart/roundComplete.
  - index.html — load sound.js before main.js; added a 🔊/🔇 `#soundBtnMenu` to the
    start-screen link row (the design wants the toggle on the start screen, in
    addition to the entry one).
  - main.js — shared sound-toggle (`syncSoundButtons`/`toggleSound`) keeps BOTH the
    entry and start buttons in sync and persists `halves.sound`; `applySoundPref()`
    already drives `Sound.setMuted`. New guarded `sfx(name,arg)` trigger. Wired
    events: `start()`→roundStart; `correct()`→correct(combo) (new `combo` streak,
    reset on skip/start, pitch rises with it); `skip()`→skip; `showToast`→item(rarity);
    `showTopicToast`→topicUnlock; `finish()`→ the most triumphant earned (topic100 →
    mastery → roundComplete).
how I verified:
  - node -c sound.js & main.js OK; id cross-check clean (incl soundBtnMenu); no TODO.
  - SFX engine test (Node, stubbed AudioContext): every event yields a valid,
    bounded (<0.6s) voice list (finite f>0, d>0, known waveform, gain>0); **correct
    pitch rises with combo**; **item scales by rarity** (legendary 7 notes vs common
    3); before unlock nothing plays; first gesture unlocks; **muted silences ALL
    events** (0 oscillators); unmuted item(legendary) schedules 7 oscillators.
  - init harness (full app incl sound.js): loads with no error; both 🔊 buttons
    show "Sound on" by default; toggling the menu button persists
    `halves.sound="off"` and updates BOTH labels (mute persistence).
non-blocking/safety (DoD): SFX are fire-and-forget on the Web Audio timeline and
  never touch the game clock (its own performance.now loop), input, or focus;
  context suspends when hidden; mute (or absent Web Audio) makes every call a
  no-op. T17 (music) is the next audio task.
notes / questions: gold SFX method exists but isn't triggered yet (Gold economy is
  T26); all other listed events are wired. Combo resets on skip and round start.

## T17 — Generative chiptune music (12 styles + menu)  [HANDOFF]
commit: 7dd1625 (on main)
changed:
  - sound.js — extended `window.Sound` (shares the T16 AudioContext) with a
    generative chiptune engine: a **look-ahead scheduler** (25ms timer scheduling
    ~100ms ahead) driving bass/arp/lead/percussion off a per-style seeded PRNG.
    `STYLES` = **12 topic styles + 1 menu** (13), each `{name,bpm,root,scale,arp,
    bass,drums,density,waves}`. Pure helpers: `styleIndexFor(key)` (explicit
    number · "menu"→12 · hash(id)%12 fallback), `degMidi` (scale-degree→MIDI),
    `stepVoices(style,step,rnd)` (the deterministic per-step note generator).
    `setMusic(key)`/`stopMusic()`/`musicPlaying()` manage the scheduler; music
    swaps style cleanly on a loop boundary, has its own quieter gain, stops on
    mute and when the tab is hidden, and resumes on unmute/visible/unlock.
  - modes.js — gave every mode an explicit thematic `music` field (index into
    STYLES) via a TOPIC_MUSIC map; topics without one fall back to hash%12.
  - main.js — `show()` now follows the screen: in-game uses the topic's style
    (`mode.music` or its id), every other screen uses the menu style.
how I verified:
  - node -c (sound/modes/main) OK; id cross-check clean; catalogue unchanged (775);
    no TODO.
  - music test (Node): STYLES is exactly **13** (12 + menu) with all required
    params and distinct names; `styleIndexFor` honours explicit index, "menu",
    and a deterministic hash%12 fallback (always a topic style); `degMidi` notes
    are **in-scale** for every style across degrees/octaves; `stepVoices` yields
    voices over a loop, is **deterministic given a seed and varies with different
    seeds** (in-style). Scheduler/mute (stub AudioContext + timers): setMusic
    before unlock doesn’t start; unlock starts the requested music; driving the
    look-ahead **schedules oscillators** (loops produce sound); switching to a
    topic keeps it playing on a different style; **mute stops the scheduler and
    unmute resumes it**. 15/15 modes carry an explicit music style. ALL T17 CHECKS
    PASSED.
  - init harness: full app loads with the music engine; `Sound.setMusic` wired to
    screen changes.
non-blocking/CPU (DoD): the scheduler is the only timer, runs only while playing,
  stops on mute/hidden; music has its own low gain off the shared master; nothing
  touches the game clock/input. Arena will pick a style in its own task.
notes / questions: explicit thematic styles per topic (e.g. Halves→Pixel Forest,
  Times→Clockwork, Victory-flavoured for Number Bonds II); the menu/results/best-
  times/inventory screens use the Title Theme.

## T20 — Item layer: styles, names, boosts  [HANDOFF]
commit: 45902a4 (on main)
changed:
  - collectibles.js — every catalogue item now gets a deterministic `style`
    (hash(id)%10), a flavour `name` (`<adj> <noun>` from the style's pools), and a
    `boost` {hero, stat, amount} (hero=hash(id)%12 into the 12 hero ids,
    stat=hash(id+"§")%4, amount={common1/uncommon2/rare3/epic5/legendary8}). Added
    the 12 hero ids+names, stat names, adjective/noun pools, and a `boostLabel()`
    ("+3 Focus · Mirabel the Mage"). Rewrote `drawIcon` to dispatch on style across
    **10 pixel routines** (sprite/potion/scroll/blade/gem/ring/shield/food/rune/orb)
    via a shared grid painter (outline + body/accent, still pixelated, rarity
    palette). Exported HERO_IDS/HERO_NAMES/STAT_NAMES/boostLabel/ICON_STYLES.
  - main.js — toasts show the flavour name; the unlock/detail modal shows the
    flavour name (big) + rarity + the boost line + the earning achievement; owned
    inventory tiles show a (truncated) flavour-name caption (tap → the detail modal
    with the full name + achievement + boost).
  - styles.css — `.u-boost` (modal boost line, amber); `.inv-name` tile caption +
    inv-cell becomes a column (icon + name) with slightly wider grid columns.
how I verified:
  - node -c (collectibles/main) OK; id cross-check clean; `.u-boost`/`.inv-name`
    have CSS; no TODO; catalogue unchanged (775).
  - item-layer test (Node): **every item** has style∈[0,10), a non-empty flavour,
    and a valid boost (real hero+stat, amount matching rarity); boosts **spread
    across all 12 heroes** (each targeted by 57–77 items); deterministic across
    reloads; **all 10 icon styles run and fill cells**; `drawIcon` renders real
    catalogue ids (stub canvas) without error; `boostLabel` formats correctly.
  - UI render harness (DOM shim, seeded owned items): the inventory renders
    flavour-name captions and real names ("Volatile Scroll"), owned tiles present,
    the topics overview still renders (no regression).
notes / questions: hero ids/names live in collectibles.js for the item boosts +
  labels now; the full heroes.js (stats/types/unlocks, effectiveStats, rating) is
  T21 and can build on these ids. No regression to collectible earning — style/
  flavour/boost are additive fields stamped on each item.

## T21 — Heroes module + stats  [HANDOFF]
commit: fec6644 (on main)
changed:
  - heroes.js (new) — `window.Heroes`: the **12 heroes** (id · type · base
    {power,guard,speed,focus} · unlock predicate) per the design table, with names
    pulled from collectibles.js `HERO_NAMES` so they stay in sync. Pure functions:
    `effectiveStats(hero, collected)` = base + Σ owned-item boosts targeting that
    hero/stat; `rating`/`ratingOf` (power×1 + focus×0.8 + speed×0.5 + guard×0.3);
    `isHeroUnlocked(hero, collected)`; plus the RPS `matchup`/`beats` helpers
    (Brawn>Cunning>Arcane>Brawn, ×1.5/×1.0/×0.6) for the battle tasks. No DOM.
  - index.html — load heroes.js after collectibles.js.
how I verified:
  - node -c heroes.js OK; no TODO; full app loads with heroes.js (window.Heroes
    wired, 12 heroes).
  - heroes test (Node, real catalogue): 12 heroes with names synced + valid
    type/base; **bram unlocks on the first `init:` and not before**; effective
    stats equal base with nothing owned and **grow** as boosting items are owned;
    **rating is monotonic non-decreasing** as items are added (and higher with the
    full collection); `ratingOf` uses the right weights; **each hero's unlock
    predicate fires exactly on its listed condition and not before** (init counts,
    mastery, ranks, collector tiers, flawless count, one100, Lightning bracket,
    meta:allmodes, tier:10); RPS matchup multipliers correct. ALL T21 CHECKS PASSED.
notes / questions: unlock predicates read `collected` (counts of init:/flawless:/
  speed:*:3 and specific ids), so they evaluate from the same store the rest of the
  game uses. `tier:10` (Roon) and `rank:*` predicates will light up once Arena
  (T23/24) and deep ranks are reachable. The Heroes screen is T22.

## T22 — Heroes screen (#/heroes)  [HANDOFF]
commit: b317006 (on main)
changed:
  - index.html — new `#heroes` screen (`#heroList` + back) and a "Heroes" link in
    the start-screen link row.
  - main.js — `renderHeroes()` groups the 12 `window.Heroes` by type
    (Brawn/Arcane/Cunning); each card shows the hero's procedural pixel portrait
    (forced sprite style, type-tinted palette), name + ★ rating, **effective
    stats** (via `Heroes.effectiveStats`), and the owned items boosting them
    (flavour chips, capped at 12 + "+N more"). Locked heroes show a "?" portrait +
    🔒 unlock hint and are de-emphasised. Wired `#/heroes` into `applyRoute`, the
    Heroes button, and back→menu. (Heroes screen uses the menu music style via the
    existing `show()` rule.)
  - collectibles.js — `drawIcon` gains an optional `styleOverride` so hero
    portraits force the creature-sprite style.
  - styles.css — heroes screen styles (scrollable, type-tinted cards, stat chips,
    boost chips), 360px-friendly (flex cards + wrapping chips + screen scroll).
how I verified:
  - node -c (collectibles/main) OK; id cross-check clean (heroes/heroList/heroMeta/
    heroesBtn/heroesBack); new classes have CSS; no TODO.
  - render harness (DOM shim, seeded: bram unlocked + 3 bram-boosting items, route
    #/heroes): **all 12 hero names render, grouped by type**; bram's unlocked card
    present with **effective stats** and its **boosting items** listed; locked
    heroes show 🔒 + hint; the meta count reads "/ 12". ALL T22 CHECKS PASSED.
  - routing/back: `applyRoute` handles `#/heroes`; back returns to the menu;
    hashchange re-renders. Cards are flex with wrapping chips and the screen
    scrolls → no overflow at 360px.
notes / questions: the boosting-items list is capped at 12 chips (+"N more") so a
  fully-collected hero's card stays manageable; the full set is reflected in the
  "Boosted by N" count and the effective stats.

## T33 — Music: cap tempo + stop fast bursts (live hotfix)  [HANDOFF]
commit: c33367b (on main)
changed:
  - sound.js — TWO fixes for the "music sometimes races / stressful" report:
    1. ANTI-BURST in `musicTick()`: if the 25ms timer stalls (heavy render e.g.
       the heroes screen, GC, tab refocus, confetti) the audio clock races ahead of
       `mNext`, so the old `while` loop flooded a backlog of notes at once. Now: if
       `mNext < ctx.currentTime` we **resync** (`mNext = now + 0.02`) and **drop**
       the missed steps, plus a **`MAX_STEPS_PER_TICK = 4`** backstop cap.
    2. TEMPO CEILING: rescaled every over-116 style down (max bpm now **115**),
       preserving their relative order/character; already-gentle styles unchanged.
       New bpms: Sky Castle 132→113, Neon Arcade 140→114, Lava Run 150→115,
       Bubble Pop 124→110, Goblin Market 118→108, Clockwork 128→112, Victory Hall
       120→109. (115 keeps the 16th-note interval ≥0.13s.)
how I verified:
  - node -c sound.js OK.
  - Node test (stub AudioContext + captured timer + controllable clock):
    (a) ANTI-BURST — normal ticking schedules a few voices; after a **5s clock
        jump**, ONE `musicTick()` schedules just **3 voices (no flood)** and `mNext`
        resyncs near `currentTime` so subsequent ticks stay bounded.
    (b) TEMPO CAP — `max(bpm)` over all 13 styles = **115 (≤116)**; every style's
        `(60/bpm)/4 ≥ 0.13s`; the rescaled styles keep ascending order.
    (c) music still loops, **switches** styles, and **respects mute** (stop/resume).
    ALL T33 CHECKS PASSED.
notes / questions: done ahead of T23 per the hotfix queue; pushed after T22. The
  anti-burst keeps tempo steady across render hitches/refocus/SFX; the ceiling
  makes even the fastest styles calm (ties to the anxiety-mitigation stance).

## T34 — Place Value: bring decimals into Part 1 (hotfix)  [HANDOFF]
commit: 439ab44 (on main)
changed:
  - modes.js — rebalanced the Place-value sets (content swap only; chain/links/
    masterSecs unchanged). Unified both sets to the literal-answer format
    `[value, op, target, answer]` and a single `pvItem` builder (dropped the
    computing `pvP1Item`, renamed `pvP2Item`→`pvItem`) so decimals never drift.
    - **P1 (`PV_P1_SRC`, 21)** now blends whole AND simple decimal ×/÷ 10·100:
      11 whole (35×10, 4500÷10, 9000÷100…) + 10 decimal (3.5×10=35, 4.2×10=42,
      0.4×100=40, 7÷10=0.7, 60÷100=0.6…). So a player sees decimal place value in
      the base topic, not just the mastery-gated P2.
    - **P2 (`PV_P2_SRC`, 21)** keeps the genuine stretch — only ×100/×1000 and
      ÷100/÷1000, answers < 1 and 3-decimal-place results (6÷1000=0.006,
      12÷1000=0.012, 0.125×1000=125, 0.04×100=4…); the simple bare ×10/÷10 cases
      moved out to P1.
how I verified:
  - node -c (modes/collectibles/main) OK; no dead pvP1Item/pvP2Item refs; no TODO;
    catalogue still 775.
  - logic check (Node): chain/masterSecs unchanged. P1 fixed 21 with a stable
    prompt set; **every answer correct (recompute=stored within 1e-9), literal/
    round-trips on the numpad, non-negative**; balance = **10 decimal + 11 whole
    prompts** (each ≥6). P2 fixed 21, **all-decimal**, harder range (only 100/1000
    targets — NO bare ×/÷10), answers<1 present incl 3-dp; new decimal P1 prompt
    "3.5 × 10" is catalogued (Beat); Beat/Spark regenerated (49 items each). ALL
    T34 CHECKS PASSED.
notes / questions: done ahead of T23 per the hotfix queue. Content swap only — no
  structural change; the unified `pvItem` keeps decimal answers float-exact.

## T23 — Enemy tiers + battle logic + tier loot  [HANDOFF]
commit: 9eceb07 (on main)
changed:
  - enemies.js (NEW) — window.Enemies. A **100-tier** ladder (bump TIER_COUNT to
    extend) generated programmatically: RPS `type` cycles Brawn→Arcane→Cunning;
    themed name bands of 10 (Goblin Warren → … → Dragon's Roost → The Void Throne),
    each tier an archetype, tier 100 = "The Void Sovereign".
    - **Loot:** every tier drops a batch `loot:<n>:<k>` — size `3 + floor((n-1)/12)`
      (3 early → 11 deep), rarer with depth (epic/legendary at the bottom). They're
      **full catalogue items** registered via `C.registerItem`, so each gets the
      T20 style/flavour/hero-boost — beating a tier directly upgrades heroes.
    - **Battle (pure):** `resolveBattle(hero, tier, perf, collected)` →
      `battlePower = round(rating(H,collected) × matchup × (0.4 + 0.6·perf))`, win
      if `≥ tier.def`. `computePerf(score,total,avgTime,target?)` = clamp(clean ×
      pace) with pace∈[0.5,1.3] vs a calm 3.0s baseline. Plus `byTier`, `tierLoot`,
      `canAttempt` (needs `tier:n-1`), `currentTier`.
    - **def calibration (no circular dep):** for each tier I compute the honest
      beatability cap = (best ADVANTAGE-type hero's rating with all drill items +
      loot from tiers 1..n-1) × 1.5. `def_n = round(min(gentle geometric ramp
      DEF_BASE=11·1.062^(n-1), capEnv×0.92))`. The raw cap wobbles as types cycle
      (different advantage-hero set each tier), so I take a **suffix-min envelope**
      `capEnv[n]=min(cap[n..N])` — still ≤ each tier's own cap (so never gated
      behind its own loot) but non-decreasing, giving a **monotonic** curve
      (0 dips; was 24).
    - **Final boss:** owned-set = every drill item + loot 1..99 (NOT tier-100 loot);
      pick the strongest hero there, set the boss's `type` so that hero holds the
      advantage, `def100 = round(bestRating × 1.5)`. Falls only at ~full collection.
  - collectibles.js — add **"Loot"** to CATS; add **`registerItem(it)`** (idempotent:
    re-registering an id is a no-op; stamps style/flavour/boost + appends to
    CATALOG/byIdMap) and export it. Loot items carry `test:()=>false` so they're
    **never** earned via drills — only by winning a battle (T24).
  - index.html — load `enemies.js` after `heroes.js`.
how I verified:
  - node -c on modes/collectibles/heroes/enemies/fx/sound/main — all OK. No
    TODO/FIXME/placeholder. main.js untouched (DOM-id cross-check trivially clean;
    only added a `<script>` tag). enemies.js is DOM-free and guards on missing deps.
  - **DoD Node test (128 checks, ALL PASSED):**
    (a) tiers 1–5 winnable by the **base starter hero (bram), zero items**, at good
        perf 0.85 — including bram's worst (Arcane) matchups.
    (b) **every** tier 1–100: its `def` is beatable with **pre-tier items only**
        (best advantage hero, perfect perf, drill catalogue + loot 1..n-1) — proves
        no tier is gated behind its own loot.
    (c) tier 100: **winnable** by the champion at full-minus-final-loot collection
        (advantage + perfect perf), **not** winnable by any hero with no items, and
        **not** winnable if even one champion-boost is missing; boss `def` ≥ tier-99
        `def`; boss type gives the champion the advantage.
    Plus: loot stamped (style∈[0,10)/flavour/valid boost), registerItem idempotent,
    "Loot" in categories, computePerf/matchup sanity, catalogue intact + grown.
  - Regression check (separate Node pass, PASSED): `evaluate()` never returns loot
    (and still earns normal drill items); `modeItems` excludes loot; hero rating
    grows only with OWNED loot; `canAttempt`/`currentTier` gating correct.
  - Curve (sample defs): 1:11  10:19  20:34  40:115  60:249  80:314  99:389  100:551.
    Catalogue grew 775 → **1443** (668 loot items) — intended ("generate liberally;
    no cap"); inventory already shows hundreds of locked "?" tiles for Solved/Spark,
    so the new Loot category follows the established progressive-disclosure pattern.
notes / questions: T23 is pure logic per its DoD — Arena UI, loot granting on win,
  and any inventory polish are **T24**. Champion at full collection is **Roon the
  Sly** (Cunning, rating 367.5) → boss type **Arcane**, def **551**. The suffix-min
  smoothing is a light touch; the full balance pass is **T25** as planned.

## T37 — Best-Times rank dot + Inventory topic progress bars  [HANDOFF]
commit: 6fd2ae3 (on main)
changed:
  - styles.css / main.js — **(1) Best Times `.sum-row`:** removed the rounded
    coloured `border-left:4px` strip (the "AI CSS" look the owner flagged). Rank
    colour is now a **crisp pixel-square accent dot** (`<i class="rankdot">`, 9px,
    no border-radius — on-brand with the app's pixel aesthetic) before the rank
    label; the rank name keeps its colour and the row keeps the subtle
    rank-tinted background (`#RRGGBB1f`) the owner likes. Not-played rows: a
    **hollow** muted square (`.rankdot.empty`, inset box-shadow) replacing the old
    dashed left-border. Locked rows: **no dot** (🔒 already conveys it). Kept the
    rank/heatmap colour map exactly — only the *form* changed.
  - main.js — **(2) Inventory topic rows:** each row restructured into a `.tp-head`
    (name + fraction + ✓) plus a **colour-graded progress bar** `.tp-bar/.tp-fill`
    = owned/total fill. Grading via `topicBarColor(pct,done)`: cool blue
    `hsl(210…)` (low) → green → warm amber `hsl(45…)` (high), with a **distinct
    `var(--mint)` at a full 100%**. Fraction text retained.
how I verified:
  - node -c main.js OK; no TODO/stub; no new `$("id")` refs (only classes added —
    DOM-id cross-check unaffected); `grep` confirms **no `border-left` on
    `.sum-row`** and **no inline `border-left-color`** left anywhere.
  - **DOM-shim render harness (12 checks, ALL PASSED):** booted the real
    main.js over a fake DOM with a seeded profile (Halves 100%-collected + a
    board entry; Times ~half; Doubles locked), then drove `#/inventory` and
    `#/best-times` via the captured hashchange route. Asserts: inventory rows
    render `.tp-bar/.tp-fill`, the 100% topic gets `width:100.0%;background:
    var(--mint)`, a partial topic gets a graded `hsl(n,65%,55%)` fill, `.tp-head`
    present, fraction text kept, and the new **Loot** category renders its locked
    tiles (0/668); best-times has **no `border-left-color`**, the played row shows
    a coloured `<i class="rankdot">` square, the not-played row a `rankdot empty`,
    the locked row **no** rankdot, and the played row keeps its `…1f` tint.
  - 360px-safe: bar is full-width inside the card (`height:6px`), dot is a 9px
    square; `.tp-head` is flex with `min-width:0` name — no overflow. No
    regressions to routing/back, the picker, or other screens (`.hero-card`
    type border-left untouched — out of T37 scope).
notes / questions: visual-only; kept the colour map, changed the form per the
  spec. Next per REVIEW order: T38 (start screen fits viewport).

## T38 — Start screen fits the viewport (picker is the flexible scroll region)  [HANDOFF]
commit: 62cd2ad (on main)
changed:
  - styles.css — start screen is now a viewport-bounded flex column with the
    **picker as the only flexible/scrolling region**:
    - `#start`: `justify-content:center` → **`flex-start`**. It was a centred,
      whole-screen-scrolling column, so on a short viewport the centred stack
      clipped at *both* ends (the owner saw build-info cut off). Flex-start makes
      any residual overflow fall to the bottom, never clipping the header;
      `overflow-y:auto` stays only as a last-resort safety net.
    - `.picker-wrap`: now `flex:1 1 auto; min-height:0; display:flex;
      flex-direction:column` — it absorbs the leftover vertical space.
    - `.picker`: dropped the fixed `max-height:42vh` for `flex:1 1 auto;
      min-height:0; overflow-y:auto`. So mark/tag/best/**Start**/links/build are
      all `flex:0`-ish and stay on-screen; the **topic list** shrinks + scrolls
      inside the column instead of the whole page scrolling.
    Scoped to start-screen-only selectors (`#start`/`.picker-wrap`/`.picker`) — no
    other screen uses them.
how I verified:
  - CSS brace-balance check OK (255/255); the three edits confirmed; `max-height:
    42vh` gone from `.picker`. node -c main.js OK (JS untouched).
  - The scroll-cue JS (`updateScrollCues`) is **unchanged** and still targets the
    picker (`#modeTabs`) + its `.picker-wrap` parent. DOM-shim harness (5 checks,
    ALL PASSED): with the picker overflowing, scrolled to top → `can-scroll-down`
    on / `can-scroll-up` off; scrolled to bottom → the inverse; list fits → neither
    cue. So the ▾ cue + edge fades still toggle correctly against the picker's own
    scroll.
  - Layout reasoning: `.app` (100dvh, max 780px) → `.screen` (absolute inset:0) →
    `#start` has a definite height; the picker (`flex:1; min-height:0`) is the sole
    grow/shrink child, so short viewports shrink+scroll the picker while the footer
    (Start/links/build) stays visible, and tall viewports let the picker show more
    rows. 360px-safe (widths unchanged: `.picker-wrap` still `max-width:360px`).
notes / questions: CSS-only, start-screen-scoped; no regressions to other screens.
  Next per REVIEW order: T39 (floating/always-visible Back on long-scroll screens).

## T39 — Always-visible Back on Inventory / Best Times / Heroes  [HANDOFF]
commit: a7045d8 (on main)
changed:
  - styles.css — gave all three long-scroll screens the **fixed-header /
    scrolling-list / pinned-bottom-Back** layout (the T38 pattern), so the
    existing bottom Back becomes always-visible and the three screens are
    consistent:
    - `#inventory` / `#summary` / `#heroes`: removed the whole-screen
      `overflow-y:auto` — the screen no longer scrolls as a unit.
    - `.invlist` / `.sumlist` / `.herolist`: now the **sole scroll region**
      (`flex:1 1 auto; min-height:0; overflow-y:auto`).
    - The bottom Back (`.res-actions`) is pinned to the bottom of the app frame
      (the list grows above it), so it stays put while the list scrolls. Bottom =
      thumb-reachable; it sits below the scrolling list so it never overlaps the
      header/`…/1443` count or the first tiles. Kept the existing button + handler
      (no new DOM) per "the existing bottom Back can stay".
    - `#heroes` also gains `align-items:center` so its header/list/Back line up
      with Inventory + Best Times (was stretch/left). `#results` untouched.
how I verified:
  - CSS brace-balance OK (255/255); confirmed `overflow-y:auto` gone from the three
    screen selectors and `flex:1 1 auto;min-height:0;overflow-y:auto` on each list.
    node -c main.js OK (JS untouched — Back handlers unchanged).
  - DOM-shim harness (12 checks, ALL PASSED): seeded profile, routed to
    `#/inventory`, `#/best-times`, `#/heroes` — each screen activates, its list
    renders content, its Back button (`invBack`/`sumBack`/`heroesBack`) has a wired
    click handler and lives in `.res-actions` (outside the scrolling list), and
    tapping it returns to the **start** menu. So Back is reachable without
    scrolling and still navigates correctly.
  - Layout reasoning: `.screen` (absolute inset:0 in the bounded `.app`) gives each
    screen a definite height; the list (`flex:1; min-height:0`) is the only
    grow/shrink child, so it scrolls internally while the `flex:0` header stays at
    top and `.res-actions` pins to the bottom. 360px-safe — list widths unchanged
    (`max-width` 340/360/380 as before).
notes / questions: CSS-only, scoped to the three screens; no regressions to
  results, start, or routing. Next per REVIEW order: T40 (Heroes cards — kill the
  AI-smell coloured left border, use the T37 pixel-square type dot).

## T40 — Heroes cards: kill the AI-smell coloured left border  [HANDOFF]
commit: ce383f0 (on main)
changed:
  - styles.css — removed `border-left:4px solid var(--line)` from `.hero-card`
    (now a uniform `1px` border like `.sum-row`) and deleted the three
    `.hero-card.t-*{border-left-color:…}` rules. Added the **type pixel-square
    dot** (mirrors the T37 `.rankdot`): `.hero-name .typedot{9px square}` coloured
    by the card's existing `t-<type>` class — `t-brawn #d05a4a`, `t-arcane
    #8a5cf6`, `t-cunning #3fce8c`. Added `.hero-name .hn{…ellipsis…}` so a long
    name truncates without shoving the ★rating.
  - main.js (`heroCard`) — wrapped the name in `<span class="hn"><i class="typedot">
    </i>NAME</span>` on **both** the locked and unlocked card markup; the `t-<type>`
    class already on `.hero-card` drives the dot colour. Item-chip pills untouched
    (owner only wanted the curved left border gone).
how I verified:
  - node -c main.js OK; CSS brace-balance OK (257/257); `grep` confirms **no
    `border-left` on `.hero-card`** (CSS) and **no inline `border-left` in the JS
    markup**. No TODO/stub.
  - DOM-shim heroes render harness (7 checks, ALL PASSED): routed `#/heroes` with a
    seeded profile — markup has **no `border-left`**, exactly **12 type dots** (one
    per card), the name is wrapped in `.hn`, all three `t-brawn/t-arcane/t-cunning`
    classes are present, the unlocked Brawn card shows its ★rating, and **every
    locked card still carries its type dot**.
  - 360px-safe: dot is a 9px inline square; `.hn` truncates long names; card border
    is uniform 1px. No regressions to the heroes layout, stats, or item chips.
notes / questions: identical treatment to T37/T40 rank/type dots — the metagame
  screens now read consistently. Next per REVIEW order: T35 (diverse item names +
  inventory name truncation).

## T41 — Rename heroes to authentic display names (display-only)  [HANDOFF]
commit: 2915dd5 (on main)
changed:
  - collectibles.js — changed **only** the 12 `HERO_NAMES` display strings to the
    final owner-approved mapping: `bram→Brannon · greta→Valeska · tovar→Ser Aldric
    · mo→Magnar · wisp→Wisp · mira→Maerwen · nim→Emrys · zeph→Aerin · pip→Fenn ·
    vex→Vesh · sela→Selwen · roon→Rendel`. Hero **ids untouched**; heroes.js reads
    these names from `C.HERO_NAMES` so it updates automatically; `DESIGN-heroes.md`
    not touched (babysitter-owned).
how I verified:
  - node -c collectibles.js OK; `HERO_IDS` and heroes.js ids both confirmed
    unchanged (`bram…roon`). Node check (31 assertions, ALL PASSED): `HERO_NAMES`
    has exactly the 12 mapped names against the unchanged ids; heroes.js
    `h.name` follows the single source; **every catalogue boost's
    `HERO_NAMES[boost.hero]` is non-empty and matches the mapping** (0 bad);
    `boostLabel` renders a new name; unlock predicates still keyed by id (bram on
    first `init:`, roon on `tier:10`). No logic change/regression; deploy-safe.
notes / questions: pure display rename. Next per REVIEW order: T35 (diverse item
  names from DESIGN-names.md + inventory name truncation).

## T41 — pip rename Fenn → Pocket (CHANGES REQUESTED follow-up)  [HANDOFF]
commit: 64d345a (on main)
changed:
  - collectibles.js — addressed the single CHANGES point: `HERO_NAMES.pip`
    "Fenn" → **"Pocket"** (owner's pick). The other 11 names stay as approved; id
    `pip` unchanged.
how I verified:
  - node -c collectibles.js OK. Node re-check (30 assertions, ALL PASSED): ids
    unchanged (HERO_IDS + heroes.js); full mapping now `…pip→Pocket…`; heroes.js
    names in sync; **every catalogue boost resolves to its mapped name (0 bad)**; a
    **pip-boosted item's `boostLabel` shows "Pocket"**; pip unlock predicate still
    fires on `speed:*:3`. No logic change.
notes / questions: one-word fix per the verdict; re-handoff. Next: T35.

## T35 — Diverse item names + inventory truncation fix  [HANDOFF]
commit: 6e22130 (on main)
changed:
  - collectibles.js — replaced the `ADJ`/`NOUNS` constants and `itemFlavour(id)`
    with the full DESIGN-names.md system (kept `hashStr`/`itemStyle` and the
    `CATALOG.forEach` stamp): word banks (612 ADJECTIVES, 10 NOUNS pools, 124
    EPITHETS, 64 CREATURES, 62 PLACES, 26 COOKADJ, 28 FOOD_CREATURE_PARTS, 124
    FIXED), 13 weighted TEMPLATES + 8 FOOD_TEMPLATES, and `pick/fillTemplate/
    chooseTemplate/itemFlavour` — all deterministic per id. theme = `itemStyle(id)`
    for now (food templates on style 7); per the design's coupling note this
    remaps to icon-family in T36.
    - **Uniqueness layer (deviation, justified):** the design's integration note
      said "replace only ADJ/NOUNS/itemFlavour", but the raw generator produces
      **26 colliding names over the 1443-item catalogue** (dominated by the
      124-entry FIXED pool — pigeonhole/birthday — plus a few `{adj} {noun}`), and
      the DoD mandates *globally unique* names. So I added a thin `uniqueFlavour()`
      that claims the first free **salted re-roll** (`flavourFor(id,"#k")`,
      theme/icon-family preserved so food stays food) and pointed the stamp +
      `registerItem` at it. `itemFlavour` itself still matches the design exactly.
      The claim order is fixed (catalogue stamped, then loot registered in tier
      order) ⇒ deterministic across reloads. Names are cosmetic + regenerated each
      load (collected set is keyed by id), so order-derived names never break saves.
  - styles.css — `.inv-cell .inv-name`: dropped `white-space:nowrap;overflow:hidden;
    text-overflow:ellipsis` for `white-space:normal;overflow-wrap:anywhere;
    word-break:break-word;hyphens:auto` (line-height 1.25). The owned tile caption
    now **wraps to as many lines as needed** (the flex cell grows; the grid row
    sizes to it) so the full name shows — no clipping. Modal/detail/toasts already
    showed the full name (unchanged).
how I verified:
  - node -c (collectibles/main/enemies/heroes) all OK; CSS brace-balance OK
    (257/257); no TODO/stub; old `ADJ` constant + single-template generator fully
    removed; `hashStr`/`itemStyle`/stamp kept.
  - **DoD Node test over the FULL 1443-item catalogue (incl. T23 loot), ALL
    PASSED:** every name non-empty; **all 1443 names globally unique** (0 dups, was
    26); no unfilled `{placeholders}`; **deterministic across reloads** (rebuilt in
    a fresh realm, 0 drift); template usage spread across **6 structure buckets**
    (adjNoun 553, "of the…" 321, "of…" 186, creature's 168, "The…" 141, list/aside
    74) — not one mould; loot named by the new system. Adjective bank 612 < 1443
    catalogue → adjective reuse is expected/documented; uniqueness carried by the
    epithet/creature/place tails + the uniqueness layer. Samples: "Cinder-flecked
    Hex-mark of the Cellar", "Frog's Gremlin", food "Roasted Glow-worm Roll of
    Twilight"; FIXED reachable ("The Heroic Spork").
  - DOM-shim render harness (3 checks, PASSED): inventory renders owned tiles with
    the **full multi-word name** in `.inv-name` (no inlined ellipsis); 360px grid
    unchanged (4 cols) but the caption now wraps.
notes / questions: the only deviation from the design note is the deterministic
  uniqueness layer, needed to satisfy the DoD's "globally unique" (the raw
  generator alone collides 26×). Flagged here for your audit. Next per REVIEW
  order: T24 (Arena).

## T43 — Trim tier loot to 250 (recalibrate; keep all battle invariants)  [HANDOFF]
commit: 3ce24cb (on main)
changed:
  - enemies.js — loot batch formula `3 + floor((n-1)/12)` (=668) → **`1 +
    floor((n-1)/25)` (=250)**: batch grows **1** (tiers 1–25) → **2** (26–50) →
    **3** (51–75) → **4** (76–100). The rarer-with-depth `lootRarity` logic is
    unchanged. `def_n` / `def100` recompute automatically from the smaller catalogue
    (loot drives hero ratings); the no-circular-dependency cap (suffix-min envelope)
    and the final-boss calibration are by construction, so the invariants are
    preserved by design and re-proven below.
how I verified:
  - node -c enemies.js OK. **Full T23 battle-invariant suite re-run on the trimmed
    loot (20 checks, ALL PASSED):**
    - **loot total = 250** (tierLoot sum matches; batch 1 at tier 1, 4 at tier 100);
      catalogue **775 + 250 = 1025**; all item names **still globally unique**.
    - loot **T20-stamped** (style∈[0,10)/flavour/valid boost), **`test()===false`**
      (drill-unearnable), boosts **cover all 12 heroes**.
    - **(a)** tiers 1–5 winnable by base **bram, 0 items, perf 0.85**.
    - **(b)** every tier 1–100 def beatable with **pre-tier items only** (0 fails).
    - **def monotonic non-decreasing** (0 dips).
    - **(c)** tier 100: winnable at full-minus-final-loot (champion **Rendel**,
      Cunning 261.5 → boss def **392**, advantage), **not** winnable with 0 items,
      **not** with one champion-boost missing, and **hardest** tier (392 ≥ t99 291).
    - Sample defs: 1:11 · 10:19 · 25:47 · 50:194 · 75:225 · 99:291 · 100:392.
notes / questions: pure content/balance trim — main.js inventory totals are
  computed from `CATALOG.length`, so they adapt with no code change. Run before T24
  so Arena grants the final 250-item loot set. Next per REVIEW order: T42 (inventory
  tabs) then T24 (Arena).

## T42 — Inventory tabs + per-category bars + jump-to-top  [HANDOFF]
commit: c5e38c3 (on main)
changed:
  - main.js — rewrote `renderInventory` into a tabbed, lazy-rendered view:
    - **Tabs** `INV_TABS` = Topics · Awards · **Loot (its own tab)**, rendered into
      a new `#invTabs` bar; clicking a tab swaps content. **Lazy-render**: only the
      active tab's tiles enter the DOM (`renderInvTab` sets `#invList` to just that
      tab) — the 250 Loot tiles aren't built until the Loot tab is opened. Opening
      the inventory defaults to **Topics**.
    - **Per-category bars**: shared `invSection(title, items, col)` renders a
      header (owned/total) + a graded `.tp-bar/.tp-fill` (reusing `topicBarColor`)
      + the tile grid — used for every **Awards** category and every **Loot**
      region. Topics tab keeps its per-topic bars.
    - **Loot sub-grouped by the 10 tier-regions** (`region = floor((tier-1)/10)`,
      label via `Enemies.regionLabel` so it auto-follows T44's rename) — each
      region a section with its own bar and "· tiers N–M" range.
    - **Jump-to-top** `#invTop`: `updateInvTop()` toggles `.show` when
      `invList.scrollTop > 200`; clicking snaps scrollTop to 0 and hides it.
  - enemies.js — exported `tierRegion(n)` and `regionLabel(r)` (band name) for the
    Loot grouping (DRY; T44-proof).
  - index.html — added `#invTabs` under the header and the floating `#invTop`
    button inside `#inventory`.
  - styles.css — `.inv-tabs` (fixed pill tab bar under the header), `.inv-tab`
    (+`.active` amber), `.jump-top` (absolute FAB, hidden→`.show`). `.invlist`
    margin trimmed for the tab bar.
how I verified:
  - node -c (main/enemies/collectibles) OK; CSS brace-balance OK (263/263); no
    TODO/stub. Back (T39) + names (T35) untouched.
  - **DOM-shim harness (19 checks, ALL PASSED):** 3 tabs render with Topics active
    by default; Topics shows per-topic rows and **no item/loot tiles** in the DOM;
    Awards shows the drill categories **each with a progress bar** and **still no
    loot tiles** (lazy); switching to **Loot** lazily renders loot tiles
    sub-grouped into **exactly 10 regions** ("Goblin Warren · tiers 1–10" …) each
    with a bar; jump-to-top is hidden at the top, **shows when scrolled >200**, and
    click returns to top + hides; header count = owned/total over the whole
    catalogue; reopening defaults back to Topics. The inv-cell tap-to-inspect
    handler is unchanged (works across tabs).
  - 360px-safe: tab bar is 3 equal flex pills within `max-width:360px`; the FAB is
    a small absolute pill at bottom-right (clears the centered Back); list stays the
    scroll region (T39).
notes / questions: Loot region labels come from `Enemies.regionLabel`, so T44's
  tier/region rename will flow through automatically. Next per REVIEW order: T44
  (tier rename) then T24 (Arena).

## T44 — Rename enemy tiers (regions + rank-titles + named bosses)  [HANDOFF]
commit: 813eec3 (on main)
changed:
  - enemies.js — replaced `BANDS`/`ARCHETYPES`/`tierName` with the FINAL mapping
    (display-only): **BANDS** = the 10 regions (Goblin Warren … The Void Throne);
    **RANK_TITLES** = Runt · Sentry · Brute · Raider · Warden · Champion · Reaver ·
    Dread · Warlord · Overlord; **BOSSES** = the 10 named region bosses.
    `tierName(n)`: `region=floor((n-1)/10)`, `pos=(n-1)%10`; `pos===9` → the named
    boss, else `"<Region> <RankTitle>"`. Tier numbering / `def` / `loot:<n>:<k>`
    ids / battle logic all untouched. (`regionLabel` reads `BANDS`, so the T42
    inventory Loot-region labels update automatically.)
how I verified:
  - node -c enemies.js OK. Node test (13 checks, ALL PASSED): **all 100 tier names
    follow the FINAL rule exactly**; the ten tiers ≡0 mod 10 use the **named boss**
    (Goblin King…The Void Sovereign); samples "Goblin Warren Runt" (t1), "Haunted
    Marsh Raider" (t34), "Bonecaller" (t60), "The Void Throne Warlord" (t99), "The
    Void Sovereign" (t100); `Enemies.regionLabel` now returns the new region names
    (Gallowmarch, Cinderwaste …). **Unchanged:** 100 tiers, numbering intact, loot
    still 250 with ids `loot:5:0`…, `def` still monotonic, boss still hardest,
    tier 1 still winnable by base bram — so the T23/T43 invariants are unaffected.
notes / questions: pure display rename; the Arena tier UI (T24) will show these.
  Next per REVIEW order: **T24 (Arena)**.

## T24 — Arena mode (#/arena)  [HANDOFF]
commit: f1006df (on main)
changed:
  - main.js — the Arena: `BATTLE_MODE` (synthetic mode whose `build()` shuffles a
    mix of questions from every unlocked topic, each tagged `_mode` for correct
    eyebrow/expr); `renderArena` (tier card, unlocked-hero picker with rating +
    `matchupLabel`, result panel with the battle maths); `startBattle` (sets the
    battle context + runs `start()`); `finishBattle` (resolves + grants). `finish()`
    branches to `finishBattle` when a battle is active; `nextQuestion` now reads the
    per-question source mode (`it._mode || mode`) for eyebrow/expr (identical for
    normal drills). Added `arena` to `screens`, the `#/arena` route, and the
    arenaBtn/Back/Fight/hero-pick wiring.
  - index.html — `#arena` screen (header + `#arenaBody` scroll region + pinned
    Fight/Back) and the start-screen **Arena** link.
  - styles.css — Arena styles; generalised the type pixel-dot (`.typedot` +
    `.t-brawn/.t-arcane/.t-cunning .typedot`) so heroes (T40) and arena share it.
  - **Win path (owner requirement):** `finishBattle` resolves via
    `Enemies.resolveBattle(hero, tier, perf, loadCollected())` on the **real owned
    set**; `perf = computePerf(score, n, total/n)` only scales the 0.4..1.0 band —
    no perf-only shortcut. Win → grant `tier:n` + `tierLoot(n)` + collector
    milestones (saved), surface new hero unlocks; loss → no progress.
how I verified:
  - node -c (main/enemies/collectibles/heroes) OK; CSS balance OK (296/296); no
    TODO/stub; all six new DOM ids present in index.html (id cross-check clean).
  - **Decision-invariant Node test (6 checks, ALL PASSED)** on the exact live
    computation (`computePerf`→`resolveBattle` on the real col): (a) tier 1
    winnable by base bram at a perfect round; (b) a **perfect, fast round with 0
    items canNOT beat tier 100** (no perf shortcut) and base bram can't beat tier 50;
    every tier winnable with pre-tier items (0 gated); (c) the champion at
    full-minus-final-loot beats tier 100, and **removing one champion boost flips it
    to a loss**.
  - **Async DOM battle-drive harness (16 checks, ALL PASSED)** — booted the real
    main.js over a DOM shim and *played actual battle rounds via synthetic
    keydowns*: renders the tier-1 card/region/hero-picker/matchup; picking a hero
    enables Fight; Fight starts the round; driving it to completion returns to the
    Arena with a **Victory!** panel and **persists `tier:1` + `loot:1:0`** (and the
    loot boosts its hero); a second drive — roon vs **The Void Sovereign** with only
    tier markers owned — plays a **perfect** round and still shows **Defeated** with
    **no `tier:100` granted**, proving the Arena is unbeatable without a near-full
    collection.
  - Normal drills unaffected: `finish()` battle-branch is guarded by `battleCtx`;
    `nextQuestion`'s `it._mode||mode` is identical when there's no `_mode`.
notes / questions: hero-unlock/defeat milestones + currency are T25/T26; T24
  surfaces new hero unlocks inline in the result panel. Next: T36 (icons).

## T36 — Pixel icons: ~50 categories + per-item variation  [HANDOFF]
commit: f1d8e92 (on main)
changed:
  - collectibles.js — full icon-engine rewrite per DESIGN-icons.md. **G 12→16**;
    kept the 3-colour `RARITY` contract + `paintGrid`; added primitives
    (`box/hline/vline/dot/disc/carve/mirror`) and **`shiftPalette`** (HSL hue/lum
    nudge on a cloned palette, outline kept dark). **12 archetype renderers**
    (critter/bottle/sheet/blade/tool/gem/ring/shield/garment/sigil/orb/provision)
    drive a **50-entry `CATEGORIES`** table. New item field **`category`** via
    `categoryOf(id)` (replaces the old `style` index); `familyOf(id)` = the 12
    archetype families. `drawIcon(canvas,id,pal,catId?)` = resolve preset →
    per-item structural jitter → archetype → variation levers → `paintGrid`
    (shifted palette). Heroes pass `catId:"familiar"`.
    - **Variation:** soft structural jitter (sizes/lengths within
      category-preserving bands) + an **interior highlight/carve texture** seeded
      per item; the **silhouette and `locked` identity cells are never touched**, so
      categories stay recognizable while every item looks distinct (the owner's
      "varied a lot"). Exposed pure `iconRoleGrid`/`iconColorGrid`/`lockedCells` for
      the test.
    - **Naming coupling (T35):** `NOUNS` reindexed to the **12 archetype families**
      (added **Tool** + **Garment** pools); `flavourFor` themes by `familyOf(id)`;
      **food templates fire for the provision family**. Names still globally unique.
  - main.js — hero portrait `drawIcon(..., "familiar")` (was style index 0).
  - test/icon-variation.test.js (NEW) — quantizes each render to a role grid (shape,
    palette-independent) + colour grid; `gridDist` normalised by the **union of
    occupied cells** (the meaningful "samey" measure, fair across icon sizes).
  - .github/workflows/pages.yml — added an **"Icon variation test (gate)"** step
    (`node test/icon-variation.test.js`) before Configure Pages, so "samey within a
    category" can't regress into a deploy.
how I verified:
  - node -c (all 7 files) OK; no leftover `ICON_STYLES`/`itemStyle`/`styleOverride`/
    `.style=` refs; no TODO/stub. **50 categories registered.**
  - **`test/icon-variation.test.js` — ALL 5 CHECKS PASS:** (a) cross-category role
    dist ≥0.18 (closest pair **staff/wand = 0.237**, deterministic structural
    difference — not noise); (b) within-category combined ≥0.22 over 40 items/cat
    (worst **key = 0.282**) with **no identical pairs**; **identity** — locked cells
    preserved 100% (≥95%); **determinism** — same id ⇒ identical render.
  - Render smoke (stub canvas): `drawIcon` paints cells for solve/spark/loot/rank/
    init/meta ids, the hero portrait, and **all 50 categories** (0 throws); names
    still **globally unique**; every item has a valid `category`; `familyOf ∈ [0,12)`.
  - DOM render harness (no throws): `#/inventory` (incl. the **Loot tab** drawing
    loot icons), `#/heroes`, `#/arena` all render with the new icons.
notes / questions: one deliberate, documented interpretation — `gridDist` is
  normalised by the union of occupied cells (not all 256). Dividing by 256 makes
  thin-but-legitimate icons mathematically unable to reach 0.22 and is not a
  meaningful "samey" measure; union-normalisation *is* (it asks "what fraction of
  the icon's own pixels differ"). The interior texture is the silhouette-preserving
  "chunky highlight" the owner wanted back; jitter never touches silhouette/locked
  cells, so recognizability holds (proved by the cross-category + identity checks).
  Next per REVIEW order: T25 (balance + milestone wiring).

## T25 — Balance + milestone wiring  [HANDOFF]
commit: 87aa1b5 (on main)
changed:
  - collectibles.js — five new **Milestone** collectibles: `meta:tier10/25/50`
    (Tier Climber/Breaker/Crusher — "defeat tier N"), `meta:tier100` (**Realm
    Champion** — "defeat the final tier"), `meta:allheroes` (**Legendary Roster** —
    "unlock all 12 heroes"). New **`evaluateMeta(heroesUnlocked, heroesTotal,
    has)`**: tier milestones read the `tier:<n>` markers via `has`; `allHeroes`
    fires at full hero unlock. `evaluate()` now skips `meta` items (so they're only
    granted via the meta path, never by a drill ctx). Exported `evaluateMeta`.
  - main.js — `grantMeta(col)` computes the live hero-unlock count from
    `window.Heroes` and grants any newly-satisfied meta milestones into `col`;
    wired into **both** `finish()` (a drill round can unlock the last hero →
    Legendary Roster) and `finishBattle()` (tier defeats + the final-hero unlock),
    included in the unlock modal alongside loot.
  - docs/research-11plus.md — appended a "Phase 3 is the engagement layer" note.
  - **Balance:** unchanged. The curve was proven fair in T24/T43 (monotonic def,
    early tiers winnable by the starter, final ⇔ full-collection); kept as-is.
how I verified:
  - node -c (collectibles/main) OK; icon-variation test still green; no TODO/stub;
    catalogue 1025→**1030**, all **1030 names still globally unique**.
  - **T25 Node test (20 checks, ALL PASSED):** all five milestones registered;
    `evaluateMeta` fires `meta:tier10/50/100` exactly on the matching `tier:<n>`
    marker and not otherwise; owned milestones aren't re-earned; `allheroes` fires
    at **12/12** and not at 11/12; a **constructed collection unlocks all 12 heroes**
    (verified via `Heroes.isHeroUnlocked`) → `evaluateMeta` grants Legendary Roster.
    Progression curve **still monotonic**, final tier still hardest, tier 1 still
    winnable by the starter; **final-tier ⇔ full-collection invariant still holds**
    (tier 100 winnable at ~full collection, unbeatable with 0 items).
notes / questions: milestones render in the inventory **Awards** tab like the other
  Milestone collectibles; they're granted at the moment their condition is met
  (drill finish or Arena win). Next per REVIEW order: T26 (Goblin Gold currency).

## T26 — Currency (Goblin Gold): earn/display/persist  [HANDOFF]
commit: c83889e (on main)
changed:
  - main.js — the Goblin Gold system. `GOLD_LABEL="Goblin Gold"` (the ONE
    user-facing label); `loadGold`/`saveGold` (`halves.gold`, in-memory fallback);
    `fmtGold` (grouped <1000 then K/M/B/T/Qa/Qi/Sx/Sp/Oc/No/Dc… 3 sig figs, never
    NaN/∞); pure earn formulas `questionGold`/`roundBonusGold`/`tierGold` +
    `goldMult` (1 + items·0.05 + mastered·0.5 + heroes·0.5 + tiers·1); `earnGold`
    (persists + grants wealth milestones). Accrues per clean question in
    `correct()` (× combo streak × mult; a skip accrues nothing); commits the round
    bonus + first-Mastery(+50)/first-100%(+100) in `finish()` and the tier bonus
    in `finishBattle()`. **Display:** `renderGold` (start-screen bar) + `showGold`
    (results — a RAF **ticking counter** + a `+N` flourish) + the Arena result
    line. Exposes **`window.Gold`** (label/fmtGold/mult/questionGold/roundBonus/
    tierGold/load/evaluate) as the module API + test seam.
  - collectibles.js — **11 wealth-milestone collectibles** `gold:<n>` (Coin Purse →
    Money Bags → Nest Egg → Gold Hoard → Tycoon → Magnate → Croesus → Dragon Hoard
    → Goblin Vault → Midas Touch → Cosmic Fortune) at 1K…1Qa; **`evaluateGold(total,
    has)`** (exported); `evaluate()` skips `gold` items.
  - index.html / styles.css — start-screen `#goldBar`, results `#resGold`, Arena
    `.ar-gold`; gold styling + a `gold-pop` flourish keyframe.
  - **No spend mechanic** — Gold only accumulates (per the owner decision).
how I verified:
  - node -c (collectibles/main) OK; CSS balanced; icon-variation test still green;
    no TODO/stub; catalogue 1030→**1041**, all names still globally unique.
  - **T26 Node test (32 checks, ALL PASSED):** `fmtGold` across the whole ladder
    (0/1/999/1.00K/1.23K/12.3K/123K/1.23M/1.00B/1.00T/1.00Qa/1.00Qi/1.00Sx/1.00Dc),
    never NaN/∞, negatives→0; per-question **faster→more, higher combo→more, higher
    multiplier→more**, clean>0; **multiplier grows** with items/mastery/tiers;
    round + tier formulas (deeper tier → more); **wealth milestones fire at 1K/1M/
    1Qa** and owned ones aren't re-earned; label = "Goblin Gold".
  - **Live DOM harness (5 checks, ALL PASSED):** driving a real **clean** drill
    round earns and **persists** `halves.gold` > 0; an **all-skipped** round earns
    **0** — gold tracks doing maths well.
notes / questions: Gold is earn/display/persist only (no sink), per the owner
  decision. Phase 3 is now complete. Next per REVIEW order: Phase 4 — T31 (daily
  momentum counter).

## T31 — Daily-practice momentum counter  [HANDOFF]
commit: 0aa1900 (on main)
changed:
  - main.js — the Momentum system. `MOMENTUM_LABEL="Momentum"`, `MOMENTUM_MAX=75`.
    **Pure reducer** `reduceMomentum(state, today)`: first ever play → 1; same day
    (or clock-back) → no change; gap N≥1 → `min(75, max(0, count−(N−1))+1)`;
    `best = min(75, max(best, count))`; `lastDay = max(lastDay, today)`. Storage
    `halves.streak {count,lastDay,best}` (`lastDay` = local day index via
    `localDay`); **migration-safe** (absent → 0, no crash). `bumpMomentum(col)`
    registers a play (called in **both** `finish()` and `finishBattle()` — same-day
    idempotent) and grants momentum milestones off `best`. **Display:**
    `renderMomentum` (calm 🗓 start-screen indicator, "· maxed" at 75) + a
    non-blocking `momentumToast` when it goes up. Exposes **`window.Momentum`**
    (reduce/localDay/load/evaluate/MAX/label).
  - collectibles.js — **6 momentum milestone collectibles** `momentum:<n>` at
    **3/7/14/30/50/75** (Warming Up → Peak Momentum; rarity climbs, 75 = cap),
    `evaluateMomentum(best, has)` (exported); `evaluate()` skips `momentum` items.
  - index.html / styles.css — `#momentumBar` start-screen indicator + calm styling.
  - **No timers/countdowns/notifications.** The number updates only on play (lazy),
    so there's no real-time pressure.
how I verified:
  - node -c (collectibles/main) OK; CSS balanced; icon test green; no TODO/stub;
    grep confirms **no momentum timers**; catalogue 1041→**1047**, names still unique.
  - **T31 reducer Node test (17 checks, ALL PASSED):** first play =1; same-day
    no-change; gap 1 → +1; gap 3 → 7→6 (−2+1); **long absence** (gap 100) →
    `max(0,4−99)+1 = 1` with `best` preserved; the `max(0,…)` floor holds for all
    gaps 2..120 (never <0 or >75); **cap at 75** — 74+1→75, 75+1→75, and **200
    consecutive play-days stay capped at 75/75**; `best` monotonic ≤75 through a
    dip; milestones fire off `best` exactly at 3/7/…/75, once each, **survive a
    count dip**, and owned ones aren't re-awarded; cap=75, label="Momentum".
  - **Live DOM harness (3 checks, PASSED):** driving a real round **persists**
    `halves.streak = {count:1,best:1}` on first play; the start-screen indicator
    renders.
notes / questions: forgiving by design — the count only recomputes on play (lazy),
  so missed days are subtracted when you return (no countdown/guilt). Next per
  REVIEW order: T32 (per-question Practice/Review view).

## T27 — Per-topic "how to beat it" guides  [HANDOFF]
commit: 8ce7c9d (on main)
changed:
  - guides.js (NEW) — `window.Guides` with `{ intro, tips:[2–4], example }` for
    **all 15 modes** (halves, times, doubles, addsub, addsub2, bonds, bonds2,
    placevalue, placevalue2, fractionsof, fractionsof2, percentages, percentages2,
    fractions, squares). Seed style; British English (maths/take away/per cent,
    `·` decimals); Part-2 guides add what's new. Every example/tip verified against
    the live question sets.
  - index.html — load `guides.js` (after modes.js); add `#guideModal`.
  - main.js — a "?" `mr-guide` control on **every** picker row (incl. **locked**
    topics — a preview of what's coming); `openGuide(m)` renders intro + tips +
    "Try this" example into the modal; close via button or backdrop. The "?" click
    is intercepted **before** row-select, so it never selects/starts a round.
  - styles.css — `.mr-guide` (round "?" chip) + the guide modal/typography.
how I verified:
  - node -c (guides/main/collectibles) OK; CSS balanced; icon test green; no
    TODO/stub; catalogue/names unchanged.
  - Content checks: **all 15 modes have a guide** with intro + **2–4 tips** +
    example; British-English check (no US "math"); I re-derived **every worked
    example/tip against the live SRC sets** — all correct (e.g. 64+27→91, 143−57→86,
    72→28 bond, ⅔ of 18=12, 75% of 60=45, 2/5=0·4, 8²=64, 450÷1000=0·45).
  - **DOM harness (10 checks, ALL PASSED):** every row renders a "?" control;
    clicking it opens the modal with the correct intro + 2+ tips + the worked
    example; it opens for an **unlocked** topic (halves) AND a **locked** one
    (squares, as a preview); close works; **all 15 guides render via the UI**.
notes / questions: guides are data in `guides.js` for easy audit/edit. (Babysitter
  audits each guide's wording + correctness.) Next per REVIEW order: T32 (Practice/
  Review view), which builds on these per-question approach notes.

## T32 — Per-question Practice / Review view  [HANDOFF]
commit: 1ca1b50 (on main)
changed:
  - guides.js — **`explain(modeId, q)`**: the topic's guide method applied to the
    specific numbers (generated by parsing the prompt, NOT hand-written), British &
    correct, always non-empty. e.g. "25% is a quarter (halve, then halve again):
    25% of 40 = 10", "Find one third, then take 2: 18 ÷ 3 = 6, × 2 = 12".
  - main.js — **`halves.qbest`** store (`modeId → prompt → best seconds`);
    **`recordQbest`** (pure, keeps the **min**, ignores fumbled `miss>0` solves,
    migration-safe), saved at the end of every **normal** round AND each practice
    attempt. **Practice screen** `renderPractice` — a grid of all the topic's fixed
    questions, **heat-mapped by best solve time** (`qTileColor`: gold/mint/blue/
    amber), never-solved tiles **dashed grey/red** so weak spots pop. **`startPractice`**
    attempts one question (self-paced, still timed) → `correct()`'s existing path
    grants that question's **Beat/Spark** + the attempt updates qbest; **`finish()`
    branches to `finishPractice`** so **no** round-level award (Flawless/Speed/
    Mastery/rank/best-time/**Gold**/**momentum**) is ever given in practice (gold
    accrual + momentum bump are guarded out). The game screen shows the **approach
    note** during practice. Refactored `start`/`startBattle`/`startPractice` onto a
    shared `beginRound()` (and each clears the other contexts) so battle/practice
    state can't leak. Exposes **`window.Practice`** (recordQbest/qTileColor).
  - index.html / styles.css — `#practice` screen (fixed header / scrolling grid /
    pinned Back), a start-screen **Practice** link, the `#practiceNote` on the game
    screen, and the grid/tile/note styling (82px tiles, 360px-safe).
how I verified:
  - node -c (main/guides) OK; CSS balanced; no TODO/stub.
  - **`explain` coverage:** non-empty for **all 317 questions** across every topic
    (0 empty, 0 fallbacks); samples re-checked for correctness.
  - **T32 Node test (15 checks, ALL PASSED):** `recordQbest` keeps the **min**,
    ignores a worse time, **ignores fumbled (miss>0)** solves, migration-safe on
    undefined inputs; `qTileColor` maps time→colour (null→none); a driven **practice
    attempt** grants **only** `solve:halves:90` (+ Spark) — **not** Flawless/Mastery/
    init/Speed — updates qbest, and writes **no Gold / no best-time board / no
    momentum**.
  - **Regression (6 checks, PASSED):** the `start`/`startBattle` refactor is clean —
    a normal round still reaches results, **records qbest**, earns Gold, bumps
    momentum, and writes the best-time board; the battle path + icon-variation test
    + unique names all still green (tier 1 winnable by bram; final-tier invariant
    intact, def 412 as the catalogue grew).
notes / questions: Practice is a training ground — it can only ever earn the
  attempted question's Beat/Spark, so "100% still requires real mastery" via actual
  rounds. (Babysitter spot-checks `explain` correctness.) Next per REVIEW order:
  T13 (question-set audit) → T30 (deep content review) → T45 (perf audit).

## T13 — Question-set audit pass  [HANDOFF]
commit: 7e7828a (on main)
changed:
  - modes.js — three targeted improvements (the rest already meet the standard):
    1. **fractions** 18 → **21**: added **9/20, 11/20, 17/20** — a coherent
       twentieths family (terminating decimals; ×5 gives a percentage, linking to
       the % topics).
    2. **fractionsof** P1: **⅓** was light (4) — added **⅓ of 60 = 20** (a common
       time/money base) and dropped the less-common **⅕ of 45**; now ⅓×5, ⅕×6.
    3. **percentages** P1: replaced the arbitrary **10% of 130** with **10% of 150**
       (a common base). Beat/Spark regenerate from the sets automatically.
per-topic audit (covered cases · key common values):
  - **Halves** (benchmark, 26): small odds 3/5/7/9 (·5 answers), teens, money
    50/100/200/250/500/1000, time 24/30/60/90/180/360. Gold standard — unchanged.
  - **Times** (21): the hard middle facts 6×7/7×8/8×9 + 3–9 tables + ×11/×12. Good.
  - **Doubles** (21): singles/teens, ×5s (25/35/45), hundreds (120/125/250). Good.
  - **Add/Subtract** (21): bridging (47+35), non-bridging (41+58), compensation
    (+18/−19/−29), complement to 100 (84+16), both + and −. Good.
  - **Add/Subtract II** (21): 3-digit ± 2-digit, bridging hundreds, crossing 1000
    (965+78). Good.
  - **Number bonds** (21): round tens (9), near-round (25/45/55/75), awkward
    (37/63/49/72/81/92), small↔large partners (8↔92). Good balance.
  - **Number bonds II** (21): decimal bonds to 1 (tenths + 0.05/0.25/0.75/0.95),
    1000-bonds in multiples of 50/100. Good.
  - **Place value** (21): ×÷10/100, whole + decimals, 7÷10=0·7, 60÷100=0·6. Good.
  - **Place value II** (21): ×÷100/1000, answers <1, 3-dp (6÷1000). Good.
  - **Fractions of** (21): ½¼⅓⅕ of nice bases → whole answers; money 100/50/60. ✓ fixed.
  - **Fractions of II** (21): ⅔¾⅗⅝ of bases giving whole answers. Good.
  - **Percentages of** (21): 10/25/50% of round/money bases ≤400. ✓ fixed.
  - **Percentages of II** (21): 1/5/20/75%; clean terminating answers (1% of 50=0·5). Good.
  - **Fractions→decimal** (21): halves/quarters/fifths/eighths/tenths/twentieths
    + 1/16. ✓ expanded.
  - **Squares** (21): 2²–20² + handy 25²=625, 30²=900. Good.
how I verified:
  - node -c modes.js OK; **every answer exact, non-negative, round-trips on the
    numpad, ≤5 digits; no duplicate prompts in any topic**. Catalogue rebuilt
    1047→**1053** (+3 Beat +3 Spark for the new fractions), **names still unique**;
    new prompts catalogued and `explain()` correct for each; removed prompts gone;
    `explain` non-empty for all questions; icon-variation test green.
notes / questions: most sets were already well-curated (per QUESTION-SETS.md), so I
  changed only the genuinely weak/arbitrary entries to avoid regressions. (Babysitter
  audits content.) Next per REVIEW order: T30 (deep content review — incl.
  normalising the decimal glyph "·" vs "." app-wide) → T45 (perf audit, last).

## T30 — Deep content review  [HANDOFF]
commit: 65dd2b6 (on main)
changed:
  - modes.js — **Squares trimmed** to the 11+ band: removed **16²–19²** (256/289/
    324/361 — beyond GL recall, which is ≤12² with a common extension to 15²). Kept
    2²–15² + the pattern-based handy ones **20²/25²/30²** (17 items).
  - guides.js — **decimal glyph normalised to "."** app-wide (the numpad types
    "."): every "·" in the guide text and in `explain()` is now "." (prompts/
    answers/explain already used "."). Reworded the halves note's odd-case from
    "ends .5" to "ends in a half".
### Written review
1. **Completeness.** The built core (15 modes) covers the high-frequency GL 11+
   arithmetic: tables, doubles/halves, ±, bonds, place value, fractions-of,
   percentages-of, fraction→decimal, squares. **Candidate gaps** (high-value, NOT
   built — flagged per the BACKLOG's planned Wave-2, no speculative building):
   rounding (to 10/100/dp), ratio & proportion, mean/average, money change, time
   durations, metric/unit conversion, sequences (term-to-term / nth), and short
   multiplication/division of larger numbers. These are the natural next block.
2. **Selection (per-topic keep / trim / add).**
   - Halves — KEEP (benchmark). Times/Doubles — KEEP. Add/Sub & II — KEEP
     (bridging/non-bridging/compensation/complement all covered). Bonds & II — KEEP.
     Place value & II — KEEP. Fractions-of & II — KEEP (rebalanced in T13).
     Percentages-of & II — KEEP (T13 fix). Fraction→decimal — KEEP (T13 expanded).
   - **Squares — TRIM** (applied): 16²–19² out.
3. **Difficulty calibration.** After the squares trim, **no question sits
   meaningfully beyond the Year 5/6 11+ band.** Upper-band-but-legitimate items
   kept: `placevalue2` 3-dp ÷1000 (6÷1000 = 0.006) and `fractions` 1/16 = 0.0625 —
   both are genuine upper-11+ place-value/fraction content. Part-1/Part-2 splits
   land correctly (P2 = harder-but-still-11+). The smallest items (e.g. 2², ½ of 18)
   are deliberate warm-ups, not filler.
how I verified:
  - node -c (modes/guides) OK; no TODO/stub. **Zero decimal "·" remain** in any
    guide text or `explain()` output (all topics scanned). Squares now 17 items
    (16²–19² gone); **every answer still exact/numeric/non-negative/numpad-safe with
    no duplicate prompts**; catalogue 1053→**1045** (−8: squares Beat/Spark for
    16²–19²); **names still globally unique**; `explain()` non-empty + correct for
    all questions; icon-variation test green; no regressions.
notes / questions: review is a written verdict + the two justified fixes (squares
  cap, glyph normalise). Candidate gaps are flagged, not built (per the BACKLOG).
  Next: **T45** — the final performance / CPU / memory audit (LAST task).

## T45 — Performance / CPU / memory audit (FINAL task)  [HANDOFF]
commit: (this commit, on main)
changed:
  - main.js — `show()` now cancels the game-clock RAF whenever you leave the game
    screen: `if(name !== "game" && raf){ cancelAnimationFrame(raf); raf = 0; }`.
    (THE ONE FIX — see audit below.)
  - test/perf.test.js — NEW permanent headless perf test (8 pure assertions).
  - .github/workflows/pages.yml — added a second gate step "Performance test
    (gate)" running `node test/perf.test.js` before deploy.
### Audit (full play session, before/after)
Profiled every long-lived resource. Four were already bounded; one leaked.
1. **Confetti RAF (fx.js) — IDLES (already correct).** `celebrate()` starts the
   loop only if not running; each frame drains dead particles and the loop
   `return`s (no re-schedule) once `liveCount === 0`. Proven: burst → 79 frames →
   `running()===false`, `liveCount()===0`. Before/after: unchanged (no fix needed).
2. **Music scheduler (sound.js) — IDLES (already correct).** `setInterval` tick is
   the only timer; `stopMusic()` clears it. It stops on **mute** (`setMuted →
   stopMusic`) and on **tab-hidden** (`visibilitychange → stopMusic + ctx.suspend`).
   Voice budget bounded by `MAX_STEPS_PER_TICK = 4`; every oscillator is
   `start()`+`stop()` paired (lines 99/170), so no node growth. No fix needed.
3. **Listeners — REGISTERED ONCE (already correct).** All 36 `addEventListener`
   calls run at init; none per render/navigation. Proven headlessly: 35 listeners
   after boot, **still 35** after 4× full nav cycles (inventory/heroes/arena/
   best-times/home) + 18 inventory tab-switches. Zero growth. No fix needed.
4. **Inventory / Loot / Arena render — LAZY-RENDER HOLDS (already correct).** Tabs
   render on activation and the previous tab's tiles are released. Proven: Loot tab
   emits `loot:` tiles when active; switching to Topics drops them from the DOM
   string. ~1045 items never all live at once. No fix needed.
5. **localStorage — BOUNDED (already correct).** Fixed key set (collected / qbest /
   gold / momentum / settings); writes overwrite, never append unboundedly; the
   in-memory fallback is preserved. No fix needed.
6. **Game-clock RAF (main.js) — LEAKED → FIXED.** BEFORE: `loop()` re-scheduled
   itself every frame and was only stopped by `finish()`/answering. Leaving the
   game screen mid-round (browser back, nav link, inventory) left the RAF looping
   forever on a hidden screen — steady CPU/battery drain with no visible work.
   AFTER: `show()` cancels it on any non-game navigation. Proven: enter game →
   1 active RAF; route away → **0** active RAF. A normal round still completes to
   the results screen (no regression — the in-game answer path re-arms its own RAF).
how I verified:
  - `node test/perf.test.js` → **ALL 8 PERF CHECKS PASSED** (fx idle before/at/after
    burst; zero listeners added over navigation+tab-switching; Loot lazy-render
    renders-then-releases; game RAF present in-game then cancelled on leave).
  - `node -c main.js` OK; main.js diff is the 3-line `show()` guard only (no other
    edits). No TODO/stub. Icon-variation gate still green. No console errors in a
    full simulated session. Catalogue unchanged at 1045. No regressions.
notes / questions: **provable idling** (fx + scheduler), **no growth over
  navigation** (listeners flat, lazy-render releases), **bounded** (voices,
  localStorage), and the single real leak (game-clock RAF) fixed with before/after
  evidence. Both Node gates wired into the Pages workflow. On approval the BACKLOG
  is fully DONE.

## T46 — Fix low-contrast secondary text (WCAG AA)  [HANDOFF]
commit: (this commit, on main)
changed:
  - styles.css — **`--muted: #6B7480 → #939CAB`** (the AA-compliant value the
    Babysitter pre-verified). Used for nearly all secondary/label text, so this one
    token fixes every failing case at once. Plus the 4 sub-10px text rules bumped to
    10px: `.inv-cell .inv-name` **8→10px**, `.g-eg-tag` 9→10px, `.hero-chip` 9→10px,
    `.toast .t-tag` 9→10px. Colour/size only — no markup change.
  - test/contrast.test.js — NEW Node WCAG gate (computes relative luminance +
    contrast ratio straight from styles.css; asserts --muted ≥4.5:1 on bg/surface/
    surface-2/line, --muted dimmer than --text, and no font-size <10px remains).
  - .github/workflows/pages.yml — added a third gate step "Contrast test (gate)".
### What was wrong / what's fixed
The old `--muted #6B7480` failed AA for normal text on every background it sat on
(3.99:1 bg · 3.65:1 surface · 3.26:1 surface-2 · **2.73:1 line** — AA needs 4.5:1).
`#939CAB` lifts all four above the bar while staying clearly secondary.
how I verified:
  - `node test/contrast.test.js` → **ALL 6 CONTRAST CHECKS PASSED**: --muted on
    --bg **6.83:1**, --surface **6.24:1**, --surface-2 **5.57:1**, --line **4.66:1**
    (all ≥4.5, matching the Babysitter's computed figures exactly); --muted still
    dimmer than --text (hierarchy preserved); **no font-size rule under 10px**
    (87 rules scanned, smallest now 10px).
  - styles.css diff is **exactly 5 lines** (1 colour var + 4 font sizes) — no
    structural/markup change. All three gates green together (icon + perf + contrast).
    360px-safe (inv-name still wraps via overflow-wrap:anywhere; the tile grid is
    unchanged minmax(64px,1fr)). No regressions.
notes / questions: I used **10px** for the four bumped rules (the DoD's hard floor)
  rather than the soft "11px preferred" — these are dense tile captions / uppercase
  tag labels in the tight 64px inventory grid and on toasts, where 10px keeps the
  layout clean while clearing the legibility bar. Easy to lift to 11px if the owner
  prefers larger. Suggested value taken as-is since the Babysitter had pre-verified
  it. Next per REVIEW: **T48** (inventory tab regression), then **T47** (Arena
  pure stat check).

## T48 — Inventory regression: item tiles + bars-at-top on every tab  [HANDOFF]
commit: (this commit, on main)
changed:
  - main.js — unified the three inventory tabs onto **one layout** (`invTabHtml`):
    a single progress-bar block at the very top (one `tp-row` per section, reusing
    `tp-head`/`tp-bar`/`tp-fill`/`topicBarColor`), then the `invCell` tiles grouped
    by the **same sections** below, each under a plain `<h4>` header with **no
    per-section bar**. Replaced `invSection` (which interleaved a bar above each
    section's tiles) with `invBarRow` + `invTileGroup`. **Topics tab regression
    fixed:** it now renders each topic's `C.modeItems(m.id)` tiles below the bars
    (it previously rendered bars only). Awards + Loot now collect all their bars
    into the top block instead of one-bar-per-section.
  - test/inventory.test.js — NEW DOM-shim test (24 assertions across all 3 tabs).
  - .github/workflows/pages.yml — added it as a fourth gate (guards this exact
    regression — Topics losing its tiles — from recurring).
how I verified:
  - `node -c main.js` OK; no stub; `invSection` fully removed (0 refs).
  - `node test/inventory.test.js` → **ALL 24 PASS**: every tab has exactly **one**
    `.topic-prog` bar block, it sits **above** the tiles, **every `tp-bar` precedes
    every `inv-grid`** (no bar beside tiles), and tiles render (`inv-cell`). Topics
    shows real owned tiles **with a `<canvas>`** (regression fixed) and its Halves
    bar reads **3/59** matching the seeded owned count. Lazy-render preserved: Loot
    region tiles ("· tiers …") are absent on Topics/Awards and appear **only** when
    the Loot tab is opened. Section order is identical between the bar block and the
    tiles (both built from one `sections` array).
  - All four gates green together (icon + perf + contrast + inventory). Preserved:
    `invCell` owned/locked markup + `r-<rarity>` classes, `drawInvCanvases` over
    `.inv-cell.owned canvas`, jump-to-top (`updateInvTop`), `invList.scrollTop = 0`
    on switch, `invMeta` total. No collectibles/earning change. 360px-safe (grid
    unchanged minmax(64px,1fr)). No regressions.
notes / questions: I wired the new test as a CI gate (this bug slipped past the
  existing gates, so a permanent guard is justified) — easy to drop if unwanted.
  Next per REVIEW: **T47** (Arena → instant pure-stat check, drop the maths round).

## T47 — Arena: pure stat check, NOT a maths drill  [HANDOFF]
commit: (this commit, on main)
changed:
  - enemies.js — replaced the perf-scaled `resolveBattle` with a pure
    **`statBattle(hero, tier, collected)`**: win iff `round(rating × matchup) ≥
    tier.def`. Removed `computePerf` (and the now-unused `clamp`). This is exactly
    the old `battlePower` at `perf = 1`, so the T23/T43 def-calibration and
    buff-gating invariants are unchanged by construction.
  - main.js — **deleted the `BATTLE_MODE` synthetic mode + `BATTLE_LEN`** and the
    whole `battleCtx` round path. `startBattle()` (the Fight button) now resolves
    **instantly** via `E.statBattle` → `finishBattle(heroId, tier, res)` — no
    `beginRound`, no `show("game")`, no questions. `finishBattle` takes the result
    directly, grants `tier:n` + its loot + collector/meta milestones + the Arena
    gold payoff (`tierGold`) on a win, and surfaces Victory/Defeat. Dropped the
    `if(battleCtx)` branch in `finish()` and the `battleCtx` clears in
    `start()`/`startPractice()`. Arena UI now shows each hero's **effective power
    (⚔ rating×matchup) vs the tier's DEF** and the matchup, and on a loss a clear
    "collect more buffs (drill the topics) or pick the advantage-type hero" hint.
  - styles.css — `.ah-power` (per-hero power vs def, win/loss tint), `.ar-hint`
    (defeat guidance); `.ah-mu` now a flex row to hold matchup + power.
  - test/arena.test.js — NEW Node proof (24 checks); wired as a fifth Pages gate.
### Why the invariants still hold
Old `battlePower = round(rating × matchup × (0.4 + 0.6·perf))`; at `perf = 1`
that's `round(rating × matchup)` = `statBattle`. The buff-gating was proven at
max perf, so stat-only == that proven case: no tier becomes unbeatable and the
final-tier ⇔ full-collection rule is preserved.
how I verified:
  - `node -c enemies.js main.js` OK; **0 stale refs** to resolveBattle/computePerf/
    BATTLE_MODE/battleCtx anywhere.
  - `node test/arena.test.js` → **ALL 24 PASS**: (a) win == `round(rating×matchup)
    ≥ def` for every hero with **no perf field**; (b) tiers 1–5 winnable by the
    starter (bram) base stats, 0 items; (c) **no tier gated behind its own loot**
    (all 100 beatable on drill-items + earlier loot); (d) tier 100 **unbeatable
    with 0 items**, beatable at full-minus-final-loot (**roon 410 ≥ 410**), and
    **removing ONE champion boost flips it to a loss**; (e) `canAttempt` still
    requires `tier:n-1`; (f) `statBattle` present / perf machinery gone /
    `BATTLE_MODE` gone / Fight path has no `beginRound`; def monotonic + boss
    hardest (calibration intact). **Live DOM drive:** route to `#/arena`, pick a
    hero, click Fight → the **game screen never activates** (no question round),
    stays on Arena, shows **instant Victory**, and grants `tier:1`.
  - All five gates green (icon + perf + contrast + inventory + arena). Normal topic
    drills unaffected (start/finish/Practice paths untouched bar the battleCtx
    removal). 360px-safe. No regressions.
notes / questions: **Deliberate behaviour change:** an instant Arena fight no
  longer bumps **Momentum** (the daily-practice counter) — momentum now reflects
  actual drilling, matching "the Arena adds no drilling". Easy to restore if the
  owner wants Arena visits to count as daily activity. The def endpoint is **410**
  now (not the 392 in the old T43 log) — that drift happened in later tasks as the
  catalogue grew (T25 etc.) and recalibrated def; **unchanged by T47** (I didn't
  touch calibration). Next per REVIEW: **T49** (Practice — promote button, fix
  hints, surface guide).

## T49 — Practice: promote the button, fix the hints, surface the guide  [HANDOFF]
commit: (this commit, on main)
changed (four parts):
  - **(1) index.html / styles.css / main.js** — `#practiceBtn` moved out of the
    `.linkrow` into a primary **`.start-actions` two-button row beside Start**
    (`.btn.alt`, same size/weight). `renderStartState` now disables BOTH Start and
    Practice when the selected topic is locked (`openPractice` keeps its own guard).
  - **(2) index.html / main.js / styles.css** — the practice method note is now
    **hidden behind a tap-to-reveal "How to approach this" toggle**
    (`#practiceHintToggle`). `nextQuestion` shows the toggle + keeps the note
    collapsed on every new practice question; the toggle flips it open/closed and
    its label. **Normal rounds show neither** the toggle nor the note.
  - **(3) guides.js — `explain()` fully rewritten (the core work).** Every topic's
    hint is now **method-only and number-specific** and **never contains the
    answer**: it states the method for the actual numbers and stops before the
    result. Branches on real structure — halves/doubles single-digit vs multi-digit
    (no "tens and ones" under 10) and odd/even; times surfaces the right trick for
    *these* operands (square / ×1 / ×10 / ×11 / ×9 / ×5 / ×4 / ×2, else tables) on
    the correct factor; percentages keyed to 50/25/10/20/5/1/75; fractions-of unit
    vs non-unit with the real denominator/numerator; place value the real direction
    + places for 10/100/1000; bonds whole-ten vs with-ones; subtraction anchored on
    the minuend. The answer-revealing `"…the answer is " + a` fallback is gone (new
    fallback is answer-free). Symmetric cases (`70−35`, `5/8 of 8`, `50+?=100`,
    `0.5+?=1`) are handled by emitting only safe operands / number-words so the
    answer can never appear as a token.
  - **(4) index.html / main.js / styles.css** — `renderPractice` renders the
    topic's **overall guide (intro + tips + example) beneath the question grid**
    (reusing the `.g-intro`/`.g-tips`/`.g-eg` markup); the grid + guide share a
    `.practice-scroll` region so the guide scrolls under the list. The 15 GUIDES
    were audited (already line-by-line approved at T27) — correct + concise
    (intro ≤1 line, 2–4 tips, one example); no changes needed.
how I verified:
  - `node -c main.js guides.js` OK; **74 `$("id")` refs all present** in index.html.
  - `node test/hints.test.js` → **ALL PASS over EVERY question in EVERY topic**:
    every hint non-empty, **none contains its answer as a numeric token** (incl.
    decimal forms), **no "ten" in any single-digit (<10) halves/doubles hint**, and
    the owner's "half of 5" reads as an odd/half note with **no 2.5**.
  - `node test/practice.test.js` → **ALL 12 PASS**: Practice button enabled/disabled
    in lockstep with Start; opens the Practice screen; grid lists questions; **guide
    renders beneath the list**; a question attempt shows the toggle with the note
    **hidden by default**; tapping reveals it (label flips); **a normal round shows
    no hint UI**.
  - Both wired as the 6th/7th Pages gates. All seven gates green (icon, perf,
    contrast, inventory, arena, hints, practice). 360px-safe (two-button row uses
    flex:1; guide in the scroll region). No regressions — normal rounds unaffected.
notes / questions: Practice is rendered as `.btn.alt` (solid, equal size to Start)
  rather than a ghost outline, to read as a true primary action; easy to restyle.
  Next per REVIEW: **T51** (restore the varied hero portraits — un-regress the
  "weird faces").

## T49 — CHANGES REQUESTED fix (fractions hint quality + gate)  [HANDOFF]
commit: (this commit, on main)
Babysitter found four text-quality defects, all in the `fractions` branch of
`explain()` (word-level leaks/grammar the token gate couldn't see). Fixed exactly
those, scoped to fractions only (other topics untouched):
  1. **Answer-in-words** — `1/2` said *"five tenths"* (= 0.5). Reworded to
     method-only: *"It sits exactly halfway between 0 and 1 — write that midpoint
     as a decimal."* (no value stated).
  2/3/4. **Singular/plural** — the `nu === 1` cases now use the singular unit noun
     via a `const s = nu === 1 ? "" : "s"` suffix: `1/10 → "1 tenth"`, `1/4 →
     "count 1 quarter"`, `1/8 → "count 1 eighth"` (and `1/100 → "1 hundredth"`).
  Also caught + fixed a fifth case the same class would leak: `1/5` previously
  said *"two tenths"* (= 0.2 = its answer); reworded the fifths method to *"A fifth
  is a pair of tenths — convert N/5 to tenths, then read the decimal."* (no
  word-number+denominator phrase).
Gate extended (as requested) so this class can't regress:
  - `test/hints.test.js` now also asserts, over every question in every topic:
    **(b2)** no hint reveals its answer **in words** — scans every
    "<word-number> <denominator-word>" phrase (one…twelve × half/third/quarter/
    fifth/…/tenth/hundredth) and fails if its value equals `q.a`; and **(e)** no
    "1 <plural-unit>" singular/plural slip.
how I verified:
  - `node test/hints.test.js` → **ALL 10 PASS** (was 8; +word-leak +plural checks),
    over all 316 questions. **Full fractions dump re-read end to end — every line
    reads cleanly**, method-only, grammatically correct, no value stated.
  - All seven gates green (icon, perf, contrast, inventory, arena, hints, practice).
    Change is `guides.js` (fractions branch) + the test only — non-fraction
    branches and parts 1/2/4 untouched (approved as-is). No regressions.
notes / questions: kept the change minimal per "do not churn the other topics".
  Next per REVIEW: **T51** (restore the varied hero portraits).

## T51 — Restore the varied hero portraits (un-regress the "weird faces")  [HANDOFF]
commit: (this commit, on main)
changed:
  - collectibles.js — restored a dedicated **`heroSprite`** drawer = the original
    mirrored creature-blob, generalised from the old G=12 drawer to the current
    **G=16** (left half filled with a centre-weighted probability, mirrored to the
    right, ~30% accent). `buildIcon` now detects the **`"hero:"` id prefix** and
    builds the blob (seeded per hero id, class palette via the existing
    shiftPalette), bypassing the `"familiar"` critter preset. **Item path is
    untouched** — only ids starting `"hero:"` (which no catalogue item carries)
    take the new branch.
  - main.js — comment-only: the hero `drawIcon` caller note now reflects the
    creature-blob route (the call itself is unchanged, so T50's identical Arena
    call will draw the same restored faces).
  - test/hero-icons.test.js — NEW; wired as the 8th Pages gate.
how I verified:
  - `node test/hero-icons.test.js` → **ALL 8 PASS**: the **12 hero portraits are
    pairwise distinct (66/66)**, symmetric (mirrored), deterministic per hero, and
    paint with the class palette; a hero portrait **differs from the `"familiar"`
    item critter**; and — loading the **committed HEAD collectibles.js** alongside
    the working tree — **item role + colour grids are byte-identical** across a
    spread of catalogue ids *and* forced `"familiar"`-category ids (**0 diffs**),
    catalogue size unchanged (795).
  - ASCII-rendered bram/greta/mo/roon — four clearly different "weird faces"
    (was one repeated turtle). `node -c collectibles.js` OK; **icon-variation gate
    still green** (item categories intact). All eight gates pass. No regressions.
notes / questions: the collectibles diff is purely additive (one drawer + a
  prefix branch); no `"familiar"` category or any of the ~50 item archetypes were
  touched. Heroes screen + (post-T50) Arena both draw via this one path. Next per
  REVIEW: **T50** (generated icons on nav buttons + hero portrait in the Arena
  picker).

## T51 — CHANGES REQUESTED fix (non-vacuous item-invariance gate)  [HANDOFF]
commit: (this commit, on main)
The hero-portrait restoration was approved as correct (12 faces 66/66 distinct,
items byte-identical) — the only issue was the **gate**: `test/hero-icons.test.js`
proved "items unchanged" by diffing the working tree against
`git show HEAD:collectibles.js`. Valid at authoring time (HEAD was the parent),
but **vacuous as a permanent CI gate** (HEAD == this commit → it diffs the file
against itself). **collectibles.js / main.js untouched** (only the test changed).
changed:
  - test/hero-icons.test.js — replaced the HEAD-diff with **permanent invariants**:
    1. **Routing guard (key):** `C.CATALOG.every(it => !/^hero:/.test(it.id))` — no
       catalogue id is `"hero:"`-prefixed, so an item id can NEVER reach the hero
       blob branch in `buildIcon`. This can't go vacuous.
    2. **Snapshot guard:** two fixed **embedded baseline** item role grids
       (`det:Loot`, `det:Mastery`) captured from the approved engine — fails if any
       item icon's shape ever changes. Dropped the `child_process`/HEAD dependency.
    The valid hero checks (pairwise-distinct, symmetry, determinism, class palette,
    hero ≠ familiar critter) are kept as-is.
how I verified:
  - `node test/hero-icons.test.js` → **ALL 8 PASS**: heroes 66/66 distinct +
    symmetric + deterministic + class-coloured + ≠ familiar critter; **no
    `hero:`-prefixed catalogue id**; **item role grids match the embedded baseline**
    (0 changed); catalogue 795. The gate now genuinely fails if an item id were
    ever `hero:`-prefixed or an item icon's shape changed — no `git show HEAD`.
  - `git status` shows **only `test/hero-icons.test.js`** changed. All eight gates
    green. No regressions.
notes / questions: per the verdict I did not touch collectibles.js/main.js. Next
  per REVIEW: **T50** (generated icons on nav buttons + hero portrait in the Arena
  picker).

## T50 — Generated icons on nav buttons + hero portrait in the Arena picker  [HANDOFF]
commit: (this commit, on main)
changed (presentation only — no icon/hero/battle/catalogue data touched):
  - **(1) menu-button icons.** index.html gives `#statsBtn`/`#invBtn`/`#heroesBtn`/
    `#arenaBtn` a `<canvas class="pix mr-ico">` before the label. main.js
    `drawMenuIcons()` (called at boot) draws each with a **fitting existing category
    preset + a fixed `"menu:<id>"` seed** (stable across loads) via `C.drawIcon`:
    scroll·epic (Best times), chest·legendary (Inventory), helm·rare (Heroes),
    sword·uncommon (Arena). `.linkbtn` is now `inline-flex` (icon+label, `nowrap`).
  - **(2) Arena hero portraits.** `renderArena` pick cards (`.arena-hero`) now carry
    an `.ah-port` canvas (card is flex: portrait + `.ah-body`); a post-render
    `querySelectorAll(".arena-hero canvas")` loop draws each with the **same call
    the Heroes screen uses** — `C.drawIcon(cv, "hero:"+h.id, HERO_PAL[h.type],
    "familiar")` → the restored T51 creature-blob. The Victory/Defeat result header
    shows the chosen hero's portrait (`.ar-port`); `lastBattle` now carries
    `heroId`/`heroType` for it.
how I verified:
  - `node test/nav-icons.test.js` (NEW, 9th gate) → **ALL 16 PASS**: each of the
    four buttons has a `<canvas>` before its label and (via a drawIcon recorder
    patched in before main.js captures it) **drew a stable icon with the real
    `scroll`/`chest`/`helm`/`sword` category** and a `"menu:<id>"` seed; the Arena
    pick cards emit `.ah-port` portrait canvases, and after a fight the result
    header emits the chosen hero's `.ar-port` (`data-hero` matches); the Arena draw
    call is **byte-identical to the Heroes-screen call** (`"hero:"+id`,
    `HERO_PAL[type]`).
  - `node -c main.js` OK; **74 `$("id")` refs all present**; all nine gates green
    (icon, perf, contrast, inventory, arena, hints, practice, hero-icons,
    nav-icons). 360px-safe (`.linkbtn` nowrap, 16px icons; pick card flex).
    No regressions to the menu, Heroes screen, or the post-T47 Arena.
notes / questions: menu icons drawn once at boot (static/deterministic — fixed
  seeds). Category→button mapping picked for legibility (sword=Arena, chest=
  Inventory, helm=Heroes, scroll=Best times); trivial to retune. Next per REVIEW:
  **T52** (procedural enemy sprites — a new generator).

## T57 — Scrub specific school/town/county references from the docs  [HANDOFF]
commit: (this commit, on main)
changed (doc-only — no code/UX change):
  - docs/research-11plus.md — removed the two named grammar schools + the
    town/county identifier in **both** places they appeared (the intro
    parenthetical at the top, and the first "Exam context" bullet). Replaced with
    neutral phrasing: the intro now reads "UK 11+ grammar-school prep", and the
    exam-context bullet now reads "The relevant UK 11+ maths paper uses **GL
    Assessment** (switched from CEM in 2023)…". The generic **"11+"** and exam-board
    (**GL Assessment**, ≈50 q/50 min, no calculator) context is kept intact.
how I verified:
  - Repo-wide sweep over **every tracked file** (`git ls-files | xargs grep -i`)
    for the removed identifiers → **ZERO matches** anywhere in the working tree
    (incl. `docs/agent/*`). "11+" (6×) and "GL Assessment" (2×) still present in
    the doc; both edited passages read coherently (no dangling "both"/broken
    sentences). **Only `docs/research-11plus.md` changed.** No code touched.
notes / questions: kept the names out of this log / the commit message per the
  task's oblique-reference rule (history rewrite of older commit messages is a
  separate decision noted in REVIEW, out of scope here — this only cleans the
  working tree). Next per REVIEW order: **T62** (methodical question-by-question
  hint audit across all topics).

## T62 — Methodical, question-by-question hint audit across ALL topics  [HANDOFF]
commit: (this commit, on main)
I dumped **every** topic's **full** `mode.build()` set and read each question's
`explain()` output against the real operation. Per-topic record (issues → fixes):
  - **halves — REBUILT place-value-aware (the worst exemplar).** Before, every
    n≥10 said "Split N into tens and ones" — wrong for round hundreds/thousands
    (`100/200/500/1000`: no tens/ones) and round tens (`90`: no ones). Now: single
    digit (even→halve / odd→ends-in-a-half); **round numbers** work in their one
    real unit ("500 is five hundreds — halve the five… an odd count, so a
    half-hundred"; "90 is nine tens…"); **mixed numbers** split into the **actual
    nonzero place parts** ("360 → 300 and 60"; "45 → 40 and 5"; "144 → 100, 40 and
    4"), halve each, add, flagging the ·5 ending only when the **ones digit is
    odd**. Never names a place the number lacks.
  - **doubles — same place-value rebuild.** Round numbers → "five tens — double the
    five, keep the place value"; mixed → split into real place parts and double
    each. (Was a generic "by place value"; now specific and place-honest.)
  - **add/subtract — magnitude-aware.** `addsub2` (3-digit) no longer says "the
    tens then the ones" (ignored the hundreds); addition now "bridge through the
    next ten **and hundred**", subtraction "subtract column by column (ones, tens,
    hundreds)". `addsub` (2-digit) unchanged (apt).
  - **times — added the ×12 trick** ("multiply the other by ten, then add two more
    lots") so `7×12`/`8×12` get the right method instead of a bare tables cue;
    square/×1/×10/×11/×9/×5/×4/×2 each fire on the correct factor (verified each).
  - **bonds2 — decimal branch refined.** One-dp decimals → "the tenths pair up to
    make ten"; two-dp (`0.05/0.25/0.75/0.95`) → "pair the digits after the point
    like a bond to 100" (the old single "add up to ten" was wrong for two places).
  - **bonds, place value (×/÷ 10/100/1000), fractions-of, fractions-of-2,
    percentages, percentages2, fractions, squares — read every question; each
    hint already fits its specific operands** (whole-ten vs with-ones; real
    direction + #places; unit vs non-unit with the real numerator/denominator; the
    %-specific method; the audited fractions branch). No changes needed.
Gate strengthened (`hints.test.js`):
  - Replaced the `<10`-only "ten" check with a **general place-value-honesty check
    for ALL magnitudes**: a halves/doubles hint may use a plural place word
    (ones/tens/hundreds/thousands) **only if the number has a nonzero digit there**
    (`floor(n/place)%10 !== 0`). Added explicit must-pass cases for **`half of
    500`** (reads in hundreds, odd-count, no tens/ones, no `250`) and **`half of
    1000`**. Kept no-answer-leak (token + words) and singular/plural checks.
how I verified:
  - Dumped + read the **full** hint set for **all 15 topics** (every question);
    halves place cases 500/1000/100/90/180/360 all correct; no phantom places.
  - `node test/hints.test.js` → **ALL 13 PASS**; **negative-tested** the new gate:
    it flags `tens`/`ones` on a hypothetical "Split 500 into tens and ones" and
    passes the new hundreds/tens hints. All nine gates green. `node -c` clean. No
    regressions (method-only, British, concise, no answer leaks).
notes / questions: scope was guides.js (halves/doubles/addsub2/times/bonds2
  branches) + the gate. Next per REVIEW order: **T63** (surface the hint in normal
  rounds too).

## T63 — Surface the "how to approach this" hint in normal rounds too  [HANDOFF]
commit: (this commit, on main)
changed:
  - main.js — `nextQuestion` no longer gates the hint toggle/note on `practiceCtx`.
    It now computes `Guides.explain(qm.id, it)` for the current question (`qm =
    it._mode || mode`) and shows the **same tap-to-reveal toggle + collapsed note
    in BOTH normal drills and Practice** — hidden by default, reset to hidden on
    every new question, label flips on reveal (identical UX). The toggle handler
    and elements are the existing shared ones (#game screen), so Practice is
    unchanged.
  - test/practice.test.js — updated the final assertions: a normal round now shows
    the toggle (hidden note by default) holding the question's method.
### No scoring/clock change
The reveal only toggles a CSS class; the round clock (`loop()`/`raf`/`startTime`)
is never touched, so revealing a hint **costs real time** and Mastery / Speed
brackets / Flawless stay earned by performance. No achievement logic was altered.
how I verified:
  - `node test/practice.test.js` → **ALL 14 PASS**, incl. the new normal-round
    checks (toggle shown, note hidden-by-default, note holds the method) — and
    Practice mode's existing behaviour still passes unchanged.
  - `node -c main.js` OK; **perf gate green** (the normal round it drives still
    completes; navigation/listener balance unaffected — the toggle is wired once).
    All nine gates pass; 360px-safe (same elements/CSS as Practice). No regressions.
notes / questions: scope was the one `nextQuestion` block + the test. Next per
  REVIEW order: **T64** (mid-round item toasts must not obscure the question).

## T64 — Mid-round item toasts must not obscure the question  [HANDOFF]
commit: (this commit, on main)
changed:
  - main.js — added a **mid-round toast queue**. `TOAST_CAP = 2` toasts show at
    once; the rest **queue and drain** (a brisker hold while a backlog exists:
    item 2000→1100ms, topic 2600→1500ms, momentum 1800→1100ms). `pumpToasts`
    shows up to the cap and frees a slot via the (now callback-aware) `dismissToast`
    `onGone`, which pumps the next; a **"+N more"** chip (`.toast-more`) shows the
    backlog. All three toast creators (`showToast`, `showTopicToast`,
    `momentumToast`) now go through `enqueueToast(build, hold, brisk)` — each
    `build()` creates/appends/animates and returns the element. **No item dropped**
    (queued if needed); the **end-of-round `showUnlocks` modal is unchanged** (still
    lists the full set). Exposed `window.Toasts` (CAP/enqueue/shown/queued) for the
    Node test.
  - styles.css — `.toasts` gets **`max-height:30vh; overflow:hidden`** so the band
    is height-bounded in the top safe area and can **never reach `#stage`** even if
    something slipped (hard stop on top of the JS cap); added the `.toast-more` chip
    style. (`.toasts` already had `pointer-events:none`.)
how I verified:
  - `node test/toasts.test.js` (NEW, 10th gate) → **ALL 7 PASS** (drives the real
    `window.Toasts` queue under a DOM shim + a fake clock): with **N=6 simultaneous**
    enqueues, **never more than 2 slots occupied** and **never more than 2
    non-dismissing toasts in the band**; **all 6 eventually built — none dropped**;
    queue **fully drains** (0 shown/0 queued); **no toast nodes leak** after drain
    (reuses `dismissToast`, canvases released on `remove()`).
  - `node -c main.js` OK; **perf gate green** (no timer/node/RAF leak across the
    burst — the queue uses the same `dismissToast` removal). All ten gates pass.
    360px-safe; the `#prompt`/`#answer`/eyebrow stay fully visible (band capped +
    height-bounded above the stage). Awards unchanged — only pacing/placement.
notes / questions: kept toasts full-size/legible (no shrinking); added the
  optional "+N more" backlog chip. Next per REVIEW order: **T65** (scroll the Arena
  back to top after a fight resolves).

## T70 — Hint clarity pass: make every explanation genuinely helpful  [HANDOFF]
commit: (this commit, on main)
Raised the bar from *correct* (T62) to *clear & useful to a 10-year-old*. Re-read
every hint; fixes (all in `guides.js`, method-only + leak-free preserved):
  - **twentieths (the flagged case) → scale-to-hundredths.** Was "find 11/10, then
    halve" (awkward improper fraction for `11/20`/`17/20`). Now **"Scale 11/20 up to
    hundredths (×5 top and bottom), then read off two decimal places."** — concrete,
    general for all n/20, no improper fractions.
  - **fifths → scale-to-tenths** for consistency: "Scale 3/5 up to tenths (×2 top
    and bottom), then read off the decimal." (was "a pair of tenths — convert…").
  - **quarters/eighths/sixteenths → explicit halving chain** (no longer assume you
    know the unit's value): "Halve a whole twice/three times/four times to reach a
    quarter/eighth/sixteenth, then add up N …".
  - **times tables fallback** "build it from a fact next door" (vague) → **"…or add
    one more lot to a nearby fact you know."** (concrete action).
  - **percentages 75%** "take both of N" (terse) → **"add half of N and a quarter of
    N."** (names the two concrete steps).
  - Re-read all other topics (halves/doubles place-aware, add/sub, bonds, bonds2,
    place value, fractions-of/-2, percentages 50/25/10/20/5/1, squares) — each
    already names a concrete action; no change.
how I verified:
  - Dumped + read the **full** fractions set: every n/20 and n/5 uses the clean
    scaling method; quarters/eighths/sixteenths use the halving chain; no improper
    fractions anywhere. Re-read the full set for all 15 topics for clarity.
  - `node test/hints.test.js` → **ALL 13 PASS** (no new token/word answer-leak, no
    phantom place, no plural slip — the new "×5 top and bottom"/"×2…" and
    "add up N …" phrasings are all leak-free). All ten gates green. `node -c` clean.
notes / questions: scope was guides.js only (fractions branch + two one-line
  tweaks). Concise (one sentence each), British, 10-yo-appropriate. Next per REVIEW
  order: **T65** (scroll the Arena back to top after a fight resolves).

## T65 — Scroll the Arena back to top after a fight resolves  [HANDOFF]
commit: (this commit, on main)
changed:
  - main.js — `finishBattle` now sets `$("arenaBody").scrollTop = 0` **after**
    `renderArena()` (one line), so once a fight resolves the **Victory/Defeat result
    + the current tier** are in view instead of leaving you parked on the hero list.
    Applies to **both** win and loss. The reset is in `finishBattle` **only** — the
    hero-pick re-render (`#arenaBody` click → `renderArena()`) is untouched, so
    selecting a hero never jump-scrolls.
how I verified:
  - `node test/arena.test.js` → **ALL 26 PASS** (added two): after scrolling down to
    `scrollTop = 240` and **selecting a hero, scroll stays 240** (no jump); after
    **Fight, `arenaBody.scrollTop === 0`** (scrolled to the result + tier). Entering
    the Arena via the route still starts fresh at the top.
  - `node -c main.js` OK; all ten gates green; no regressions (presentation-only
    one-liner). 360px-safe.
notes / questions: minimal change, scoped to `finishBattle`. Next per REVIEW
  order: **T69** (master audio volume bump 0.16 → ~0.30, keep balance, no clipping).

## T69 — Raise the audio volume (SFX + music)  [HANDOFF]
commit: (this commit, on main)
changed:
  - sound.js — master **`VOL 0.16 → 0.30`** (clearly louder, mid of the suggested
    0.28–0.32) and **`musicGain 0.07 → 0.09`** (music stays a balanced background
    under the SFX, audible without drowning the answer blips). Added a worst-case
    headroom comment.
### Worst-case / no clipping (reasoned)
SFX voices peak at g 0.16 and route straight to `master`; a few staggered notes
overlap → ≲0.5 summed. Music sums one step (~1.5) through `musicGain 0.09`
(≈0.14 at the master input). Together ≲0.7 at the master input × VOL 0.30 ≈ **0.2
at the output** — far under 1.0, so **no clipping and no limiter needed** (the T33
per-tick voice caps bound the music load).
how I verified:
  - `node test/sound.test.js` (NEW, 11th gate; stub AudioContext) → **ALL 11 PASS**:
    master gain == VOL (0.30) after unlock; VOL in 0.28–0.32; **musicGain == 0.09**;
    **computed worst-case output ≈ 0.191 ≤ 0.9**; **mute** zeroes the master + stops
    music; **unmute** restores VOL + resumes; **tab-hidden** stops music, **visible**
    resumes — the mute/visibility/gesture behaviour is unchanged.
  - `node -c sound.js` OK; all eleven gates green; no regressions (two constants +
    a comment).
notes / questions: kept music proportional-plus (0.09) so it's more present than
  before without dominating. Next per REVIEW order: **T71** (calmer music + more
  per-topic variation + an Arena theme).

## T71 — Calmer music + per-topic variation + an Arena theme  [HANDOFF]
commit: (this commit, on main)
changed (three parts):
  - **(1) Calming pass (sound.js STYLES).** Every style's **bpm is now ≤ 95** (was
    up to 115 — Sky Castle 113→92, Neon Arcade 114→94, Lava Run 115→95, Bubble Pop
    110→90, Mecha March 112→92, Clockwork 112→90, Victory Hall 109→94, etc.; the
    gentle 76–88 ones kept). Busy styles **softened**: lead `density` capped at 0.36
    (Neon/Victory 0.45→0.34, Lava 0.50→0.36) and the **drum patterns eased** (e.g.
    Lava `[1,2,3,2,1,2,3,2]`→`[1,0,2,0,1,0,3,0]`, Neon `[1,3,2,3]`→`[1,0,2,0]`,
    Clockwork `[2,2,2,2]`→`[2,0,2,0]`).
  - **(2) Per-topic variation.** Expanded to **15 topic styles** (added Tide Pool,
    Lantern Way, Meadow) so **each of the 15 topics maps to a DISTINCT style** —
    fixed the colliding `TOPIC_MUSIC` map (halves/fractionsof2, doubles/percentages,
    bonds/percentages2 had shared indices) to a complete, collision-free 0–14
    assignment. Indices are explicit `mode.music` (via `TOPIC_MUSIC` in modes.js);
    new topics fall back to `hash(id)%15`.
  - **(3) Arena theme.** Added **"Hero's Arena"** (MIN, bpm 95, driving bass,
    moderate density — heroic but calm) at `ARENA_STYLE = 16`; `styleIndexFor`
    resolves `"arena"`; `main.js show()` routes the Arena screen to `"arena"` (not
    `"menu"`). `MENU_STYLE` is now 15.
  - Preserved: the look-ahead scheduler, T33 voice caps, mute + tab-hidden + T45
    idle behaviour (all unchanged; verified).
how I verified:
  - `node test/sound.test.js` (extended) → **ALL 20 PASS**: **no style bpm > 95**
    (max 95), **every density ≤ 0.4** (max 0.36), **all 15 topics carry a distinct
    topic-style index** (15 unique, 0–14), a dedicated **"Hero's Arena"** theme
    exists, `styleIndexFor('arena')`/`('menu')` resolve correctly, **main.js routes
    `#arena` to the Arena theme**, and the **MAX_STEPS_PER_TICK voice cap is
    unchanged**. The T69 volume + mute/visibility checks still pass.
  - `node -c` (sound/modes/main) OK; all eleven gates green; no regressions.
notes / questions: "calmer enough" is the owner's ear — the objective bars (bpm
  cap, softened density/drums, distinct per-topic styles, routed Arena theme) are
  met. Region-varied Arena music was the optional/nice-to-have; left bounded to one
  calm Arena theme. Next per REVIEW order: **T67** (hero detail — UX cluster).

## T67 — Hero detail view (full boost list + collected summary)  [HANDOFF]
commit: (this commit, on main)
changed:
  - index.html — new **`#heroDetail`** screen: big portrait canvas (`#hdPort`),
    name/type/rating (`#hdName`), full stats (`#hdStats`), an **X/Y collected**
    summary (`#hdProg`), and a **scrollable boost list** (`#hdList`) + Back.
  - main.js — registered the screen; **`renderHeroDetail(id)`** (lazy, on open)
    draws the **T51 portrait** (`C.drawIcon(cv,"hero:"+id,HERO_PAL[type],"familiar")`),
    full PWR/GRD/SPD/FOC, **the COMPLETE owned boost list untruncated** (one row per
    item with its `+amount STAT`), and an **`owned / total` summary computed from the
    catalogue** (per-hero total ~74–103; e.g. bram **/93**). Routing: **`#/hero/<id>`**
    (unlocked only; unknown/locked → falls back to `#/heroes`). The Heroes **list
    card is now compact** — "Boosted by N · tap for details ›" instead of the cramped
    12-chip "+N more" cut-off; the whole unlocked card is tappable
    (`#heroList` click → `#/hero/<id>`); `#hdBack` → `#/heroes`.
  - styles.css — hero-detail layout (`.hd-head`/`.hd-port`/`.hd-meta`/`.hd-name`/
    `.hd-prog`/`.hd-list` scroll region/`.hd-boost` rows with rarity left-border),
    `.hero-card.unlocked{cursor:pointer}` + `.hero-tap`.
### Unowned display (owner-confirmed)
Per the spec: show **owned boosts in full** + the **X / Y count** of how many exist
for this hero; **no long list of locked tiles** (each hero is boosted by ~80+
items). The default surface is owned-in-full + the count.
how I verified:
  - `node test/hero-detail.test.js` (NEW, 12th gate) → **ALL 13 PASS**: list card is
    compact ("tap for details", **no "+N more"**); tapping routes to `#/hero/<id>`;
    the detail shows the **full owned list untruncated** (17 owned → 17 rows, no
    "more"); **X/Y summary = "17 / 93 boosts collected"** matches the real catalogue
    counts; full stats shown; **portrait drawn via `hero:<id>`** (T51 path); Back
    returns to the list; an unknown id **falls back** to `#/heroes` (no crash).
  - `node -c main.js` OK; **82 `$("id")` refs all present**; all twelve gates green
    (incl. perf — the one new `#heroList` listener is wired once at init, no growth).
    360px-safe (detail list is the sole scroll region, Back pinned). No regressions.
notes / questions: left the optional collapsible "still to find" out (the spec's
  default surface is owned-in-full + the count). Next per REVIEW order: **T66**
  (set the Arena to 120 tiers — 10 regions × 12).

## T66 — Set the Arena to 120 tiers (10 regions × 12)  [HANDOFF]
commit: (this commit, on main)
changed:
  - enemies.js — **`TIER_COUNT 100 → 120`**; added `REGION_SIZE = 12`. `tierName`
    now uses 12-tier regions (`region = floor((n-1)/12)`, `pos = (n-1)%12`, **boss
    at `pos === 11`**); `tierRegion` uses `REGION_SIZE` too (exported). **`RANK_TITLES`
    extended to 11 entries** (positions 0–10; added **"Tyrant"** as the apex rank
    below the boss) — the 10 `BANDS` + 10 `BOSSES` are unchanged. **`DEF_GROWTH`
    1.062 → 1.051** so the geometric ramp spreads smoothly across 120 (dynamic cap +
    final-boss recalibration unchanged). `lootCount` rule kept → loot now **350**
    over 120 tiers (was 250 over 100), registered procedurally (no hand-naming).
  - main.js — inventory Loot grouping now uses **`E.tierRegion`** + the real per-
    region tier span (was a hard-coded `/10`/`×10`), so the 10 loot regions and
    their "tiers a–b" labels track the 12-tier structure automatically.
how I verified:
  - `node test/arena.test.js` (updated to 120) → **ALL 29 PASS**: `TIER_COUNT===120`;
    **def monotonic across all 120** (11 → 491); tier 1 small/winnable by the starter
    at 0 items; tiers 1–5 winnable at 0 items; **no tier gated behind its own loot**
    (all 120); the **final tier 120 unbeatable at 0 items / beatable at near-full
    (roon 491 ≥ 491) / one champion boost flips it**; `canAttempt` still needs
    `tier:n-1`; **all 120 names non-blank**; a **named boss at every 12th tier**
    (12/24/…/120 = the 10 BOSSES, 10/10). Dumped the def array + names: smooth ramp,
    bosses correct, "Tyrant" fills rank pos 10, regions correct.
  - `node -c` (enemies/main) OK; **all twelve gates green** (catalogue grew
    1045→**1145** with the extra loot; the hero-icons drill-only baseline of 795 is
    unaffected; inventory loot regions render at /12). No regressions.
notes / questions: loot total rose to 350 by the existing per-depth rule (spec:
  "keep the rule; confirm totals make sense") — sane, procedurally registered.
  Next per REVIEW order: **T68** (Arena wayfinding — regions, boss anticipation, a
  journey map — built on this 12-per-region structure).

## T68 — Arena wayfinding: regions, boss anticipation, journey map  [HANDOFF]
commit: (this commit, on main)
changed (main.js renderArena/finishBattle + styles.css; all from the Enemies region
API, structure-agnostic so it's correct at 120 = 10×12 and would be at 100):
  - **(1) Region wayfinding on the tier card.** The bare "Tier n" line is now
    **"<Region> · region R/10 · tier P/12"** (region index + in-region position),
    with a **row of per-region pips** — cleared (mint), current (amber, ringed), and
    the **boss pip distinctly marked** (coral, round). Region size read from
    `E.REGION_SIZE` (regions = `ceil(TIER_COUNT/REGION_SIZE)`), never hard-coded.
  - **(2) Boss anticipation.** When the current tier is the region's **penultimate**,
    a banner flags **"⚔ Boss next: <Boss>"**; when it IS the boss tier, **"⚔ Region
    boss — defeat <Boss> to conquer <Region>"**. Boss names via
    `E.byTier(regionLastTier).name` (no need to export BOSSES).
  - **(3) Journey map.** A **"🗺 Journey map"** toggle (`#arenaMapBtn`, delegated on
    `#arenaBody`) opens an overview of **all 10 regions**: **conquered ✓** (boss
    beaten), **current "you are here"**, and **locked-ahead** — each teased by its
    **boss landmark** (so you see "Dragon's Roost", "The Void Throne" ahead). Resets
    closed on entering the Arena.
  - **(4) Region-clear moment.** Beating a region boss (`tier.n % REGION_SIZE === 0`)
    sets `lastBattle.regionCleared` → the result header shows **"🏁 Region conquered!
    Next: <Region>"** (reuses the result card + the existing win sfx).
  - styles.css — pips, boss banners, the map button + `.map-row` (done/cur/locked)
    using the **T46 AA palette** (mint/amber/coral on surfaces).
how I verified:
  - `node test/wayfinding.test.js` (NEW, 13th gate; drives `renderArena` at seeded
    tiers) → **ALL 13 PASS**: header maths correct (penultimate tier 11 → "region
    1/10 · tier 11/12"); **10 cleared pips + a current pip + a boss pip**; **boss-next
    names Goblin King**; at tier 12 the **facing-the-boss banner** shows; crossing to
    tier 13 updates to **"Gallowmarch · region 2/10 · tier 1/12"**; the **map lists
    all 10 regions** (Goblin Warren conquered, Gallowmarch "you are here", The Void
    Sovereign teased ahead); and **beating the region boss shows "Region conquered!
    Next: Gallowmarch"**.
  - `node -c main.js` OK; **82 `$("id")` refs present**; **contrast gate green**
    (AA palette); all thirteen gates pass; **static (no RAF)**, scroll-to-top (T65)
    intact, 360px-safe. No change to battle/def/loot. No regressions.
notes / questions: computed everything from `tierRegion`/`regionLabel`/`REGION_SIZE`
  so it auto-tracks the structure. Next per REVIEW order: **T52** (procedural enemy
  sprites in the Arena — a new generator).

## T52 — Procedural enemy sprites in the Arena (new generator)  [HANDOFF]
commit: (this commit, on main)
changed:
  - **monsters.js — NEW standalone generator** (`window.Monsters`), separate from
    the collectibles icon system (no `Collectibles`/`drawIcon`/`ARCH`/`CATEGORIES`
    reuse). Pure + deterministic per tier: `buildGrid(tier) → { role 16×16 (0/1
    outline/2 body/3 accent/4 eye), boss, pal }` and `draw(canvas, tier)`. Seeded
    from `hashStr(tier.name) ^ tier.n`. A **vertically-symmetric, lumpy creature**:
    body ellipse with per-row lumpiness, **1–3 eyes** (more in deep/void regions),
    **horns/antennae** (region-biased), a **teeth mouth**, symmetric **spots**, and
    **feet/tentacle stubs**. **Region-themed** (silhouette/horn/eye/feature bias by
    the 10 regions) and **type-tinted** (Brawn red / Cunning green / Arcane purple
    palette). **Bosses** (every 12th tier) are **larger + crowned + never single-
    eyed**. Clearly distinct from the hero "creature blob".
  - index.html — loads `monsters.js` (after enemies.js).
  - main.js — `renderArena` draws the **current tier's enemy** on its card
    (`.at-enemy`, 64px) and the **foe you just fought** in the result header
    (`.ar-enemy` beside the hero portrait, "hero vs enemy"); a post-render
    `querySelectorAll(".at-enemy, .ar-enemy")` loop calls `Monsters.draw`
    (static — no RAF). `lastBattle` carries `tierN`/`tierType` for the result foe.
  - styles.css — `.at-enemy`/`.ar-enemy`/`.ar-port-row`/`.ar-vs` (pixelated).
how I verified:
  - `node test/monster-variation.test.js` (NEW, 14th gate) → **ALL 9 PASS**:
    deterministic; **40/40 sampled sprites pairwise distinct**; **≥90% of pairs
    differ ≥0.15** (779/780); **every region's boss differs from its grunt** (≥0.2,
    10/10) and **renders bigger** (10/10); **regions look distinct** (45/45 pairs);
    **palette tinted by RPS type**; standalone (no icon-system reuse in code); **no
    RAF**. ASCII-rendered t1/t12/t60/t120 — varied creatures, bosses crowned/larger.
  - `node -c main.js` OK; **item icons + hero portraits untouched** (icon-variation
    + hero-icons gates green); all fourteen gates pass; 360px-safe; pixelated. No
    regressions (arena/wayfinding/nav-icons still green with the new canvases).
notes / questions: a brand-new generator, fully independent of the icon engine.
  Next per REVIEW order: **T53** (procedural region scenery — per-location
  backdrop behind the tier card).

## T53 — Procedural region scenery in the Arena (per-location backdrop)  [HANDOFF]
commit: (this commit, on main)
changed:
  - **scenery.js — NEW standalone generator** (`window.Scenery`, no icon/monster
    reuse). Pure + deterministic per region (0–9): `buildGrid(region)` →
    COLS×ROWS hex grid; `draw(canvas, region)` scales it + a legibility scrim. Each
    of the **10 regions** has a distinct **palette + silhouette shape** evoking its
    `BANDS` name — sky gradient, a themed silhouette (bumps / posts / trees / reeds
    / peaks / spires / crags), and sparse accents (snow / embers / stars). Palettes
    are **deliberately dark** (a dimmed backdrop).
  - index.html — loads `scenery.js`.
  - main.js — `renderArena` draws the **current region's scene** behind the tier
    card (`.at-scene` canvas, first child of `.arena-tier.scenic`), in the same
    static post-render loop as the enemy sprite (**no RAF**). Redrawn on render
    (cheap); the card content sits above via z-index.
  - styles.css — `.arena-tier.scenic{position:relative;overflow:hidden}`,
    `.at-scene{position:absolute;inset:0;z-index:0}`, content `z-index:1`.
### Readability (ties to T46)
The scene is drawn **behind** the sprite + text with a baked-in **dark scrim
(0.64)**; palettes are capped dark so **--text and --muted keep WCAG-AA** over the
**brightest cell of any scene** (verified in the gate).
how I verified:
  - `node test/scenery.test.js` (NEW, 15th gate) → **ALL 7 PASS**: **10/10 region
    scenes distinct**; deterministic; adjacent regions differ; **--text ≥4.5:1
    (worst 13.28)** and **--muted ≥4.5:1 (worst 5.83 @region 4 Frostpeak)** over the
    brightest scrim'd cell; **no RAF/setInterval** (static); standalone (no icon/
    monster reuse). ASCII-rendered a scene — sky bands + silhouette + accents.
  - `node -c scenery.js main.js` OK; all fifteen gates green; 360px-safe (scene
    fills the card, content above). Arena flow + scroll-to-top + wayfinding intact.
    No regressions.
notes / questions: scenes are intentionally dim so AA holds over them; regions
  still read distinct by hue + silhouette. Next per REVIEW order: **T54** (version
  check + "Update" button polling build.json).

## T54 — Version check + "Update" button (poll build.json)  [HANDOFF]
commit: (this commit, on main)
changed:
  - main.js — **records the booted sha** from the existing `build.json` fetch
    (`bootSha`), then **polls** `build.json` (`cache:"no-store"`) on a **3-minute
    interval** (a second `setInterval`, not a tight loop). If the fetched `sha`
    differs from `bootSha`, `showUpdate()` reveals the notice. **No-op** on a local
    build (no `sha` → `checkForUpdate` returns before fetching) and on offline/404
    (`.catch(()=>{})` — never throws/spams). Never auto-reloads. Exposed
    `window.Updater` (check/bootSha/shown/setBoot) for the Node test.
  - index.html — a dismissible **`#updateBar`** notice ("A new version is available"
    + **Refresh** + ✕), hidden by default.
  - main.js wiring — **Refresh → `location.reload()`** (user-initiated only);
    **Dismiss** hides it + sets `updateDismissed` so it won't nag again this session.
  - styles.css — `.update-bar` (fixed bottom-centre, amber-bordered, `z-index:70`),
    AA-legible (12–13px text, `--text`/`--bg`-on-amber/`--muted`), 360px-safe.
how I verified:
  - `node test/version.test.js` (NEW, 16th gate; DOM shim + controllable `fetch`) →
    **ALL 9 PASS**: booted sha recorded from build.json; **identical sha shows
    nothing**; a **newer sha surfaces the Update bar**; **no auto-reload**; **clicking
    Refresh calls `location.reload()`**; Dismiss hides it; a **failed/offline poll is
    swallowed** (no throw); **no `bootSha` (local build) → no fetch / no-op**.
  - `node -c main.js` OK; **85 `$("id")` refs present**; **contrast gate green** (all
    new text ≥12px, AA colours); all sixteen gates pass. Build-info line unchanged;
    poll is interval-only (no tight loop); no focus theft (non-modal bottom banner).
    No regressions.
notes / questions: reused `build.json` (no parallel version file), as specced.
  Next per REVIEW order: **T55** (extend the Collector award ladder to 10,000 items).

## UX fix (owner direct) — results-screen "Modes" button → "Back"  [HANDOFF]
commit: (this commit, on main)
Owner (direct) flagged the results-screen button labelled **"Modes"** (returns to
the home/topic-picker screen) as the wrong word. Renamed to **"Back"** (owner's
pick — consistent with the Back buttons on Inventory/Heroes/Best Times).
changed:
  - index.html — `#menuBtn` label "Modes" → "Back" (text-only; id/handler
    `navStart` unchanged).
how I verified: no "Modes" label remains; `$("id")` cross-check OK; HTML-only,
  no JS/test impact. Not a BACKLOG task — a direct owner instruction; logged here
  for visibility. (T54 verdict still pending; resumes after.)

## Bug fix (owner direct) — rank rewards cascade to all lower ranks  [HANDOFF]
commit: (this commit, on main)
Owner (direct) flagged a real bug: each **Rank** collectible used
`test: ctx => ctx.rankIndex === i` (EXACT match), so you only ever unlocked the
precise rank you scored — collecting the low ranks (e.g. Goblin Whelp = <35%
accuracy) would require deliberately playing **worse**. Fixed per the owner's
suggestion: reaching a rank now grants it **and every lower rank**.
changed:
  - collectibles.js — rank item test `ctx.rankIndex === i` → **`>= i`**; desc now
    "Reach the rank of X (or above)…". So a single good round awards all ranks up to
    the one you hit (and the hero unlocks keyed on `rank:darkwizard`/`rank:archmage`
    now fire correctly when you reach that bracket *or higher*).
how I verified:
  - Node: `evaluate` at `rankIndex 10` grants **11** rank items (indices 0–10); at
    `rankIndex 2` grants **3**; with 0–2 already owned, a rank-2 round grants **0**
    new (no double-count). `node -c` OK; **all sixteen gates green** (rank *items*
    unchanged — only the unlock predicate; icon-variation still passes). Burst of
    new-rank toasts is handled by the T64 queue.
notes / questions: direct owner bug fix (not a BACKLOG task); logged for visibility.
  T54 verdict still pending; resumes after.

## UX change (owner direct) — results screen: keep only "Back" (drop "Play again")  [HANDOFF]
commit: (this commit, on main)
Owner (direct, mid-process — flagged that they were addressing me rather than the
Babysitter and asked me to note the deviation): on the results screen the two
buttons were "Play again" (`#againBtn` → replay same topic) and "Back" (`#menuBtn`
→ home). Owner: "I think we only need Back — they can manually replay if they want;
generally people will want to do something else at that point."
changed:
  - index.html — removed the **"Play again"** button; the single remaining action is
    **"Back"** (`#menuBtn`, now a solid primary `.btn`, → `navStart`/home).
  - main.js — removed the now-dangling `$("againBtn")` click wiring.
how I verified: `node -c` OK; **0 `againBtn` refs** remain; `$("id")` cross-check
  clean (84); all sixteen gates green; no regressions (Best Times still lets you
  re-play a topic by tapping it).
### Process note for the Babysitter
This + the prior two entries ("Modes"→"Back" rename, and the rank-reward cascade
fix) were **direct owner instructions** given to the Builder in chat, outside the
BACKLOG/REVIEW verdict loop. The owner acknowledged the deviation and asked me to
proceed and log it. All three are small, gate-covered, and on `main`. (T54's verdict
is still pending; the normal loop resumes after.)

## T74 — Topic unlock must require genuine engagement (not all-skipped)  [HANDOFF]
commit: (this commit, on main)
Owner: skipping every question still unlocked the next topic. Cause: the
`init:<mode>` collectible (whose ownership gates the next topic via `isUnlocked`)
had `test: () => true`. Now gated on having **answered** (not skipped) at least a
threshold of the round.
changed:
  - main.js — finish `ctx` now carries **`answered: times.length`** and
    **`skipped: order.length - times.length`** (skips never push to `times`, so
    `answered` = questions got right, *including* ones got right after a mistake).
  - collectibles.js — added the named constant **`INIT_ANSWER_FRAC = 0.5`** + a
    helper `initReached(ctx) = ctx.answered >= ceil(ctx.total * FRAC)`; the init
    test is now `ctx => initReached(ctx)` (was `() => true`). Desc updated ("Answer
    at least half a … round"). **OWNER DECISION** flagged in spec — implemented the
    recommended **"at least half"** default; trivially tunable via the one constant.
how I verified:
  - `node test/init-gate.test.js` (NEW, 17th gate) → **ALL 11 PASS**: **(a)** answered
    0 (all-skipped) → init NOT granted; **(b)** fully-answered & 11/21 (≥half) →
    granted; boundary 10/21 not / 11/21 yes; **(c)** the chain (mirrors `isUnlocked`)
    — all-skipped `halves` keeps `times` LOCKED, genuinely-played `halves` UNLOCKS
    `times`; **(d)** already-owned init is not re-granted and an all-skipped round
    can't revoke it (migration-safe); **(e)** `finishPractice` runs no `C.evaluate`
    (Practice grants no init); and the bar is one named constant.
  - `node -c` clean; **all seventeen gates pass**. flawless/speed/mastery untouched;
    no scoring/rank change. No regressions.
notes / questions: bar = answer ≥ half (some skipping is fine, 100%-skip isn't).
  Easy to soften ("a third"/"at least one") or tighten — change `INIT_ANSWER_FRAC`.
  Also pushed earlier (post-T54-verdict): `74ac75e` results screen keeps only
  "Back" (dropped "Play again") — direct owner request, awaiting Babysitter notice.

## T73 — Replace the coloured left-border accents with a coloured square  [HANDOFF]
commit: (this commit, on main)
Owner: the "AI-smell" coloured **left-border-on-a-rounded-row** pattern crept back
into two T67/T68 lists. Replaced with a small **sharp coloured square** swatch.
changed:
  - styles.css — removed `border-left-width:3px` + the `border-left-color` accents
    from **`.hd-boost`** (hero-detail boost rows) and **`.map-row`** (journey-map
    rows); both keep the uniform `1px solid var(--line)` border. Added **`.row-sq`**
    — a 10×10 **sharp** (no border-radius) solid square — coloured by rarity
    (`.hd-boost.r-* .row-sq`: uncommon/rare/epic/legendary) and by status
    (`.map-row.done/.cur/.locked .row-sq`: mint/amber/muted). `.map-row.cur` keeps
    its `--surface-2` background tint; `.locked` keeps `opacity:.7`.
  - main.js — prepended `<i class="row-sq"></i>` to each `.hd-boost` and `.map-row`.
how I verified:
  - grep: **no `border-left` colour accent remains** on `.hd-boost`/`.map-row`; the
    `row-sq` swatch is emitted in both lists (2 markup sites). `node -c` OK; **all
    seventeen gates pass** (hero-detail + wayfinding + contrast green — the swatch is
    a decorative square, no text-contrast impact; 360px-safe). No other restyle.
notes / questions: same square pattern applied to both lists for consistency, per
  spec. (Anti-recurrence noted for the T58 playbook: avoid colour-coded rounded
  left-borders.) Next per REVIEW order: **T55** (extend the Collector ladder to
  10,000), then **T56** (pixel mark/glyphs + favicon).

## T55 — Extend the Collector award ladder to 10,000 items  [HANDOFF]
commit: (this commit, on main)
Owner: the Collector ladder dead-ended at 150 ("Completionist" was a misnomer at
~14% of the catalogue). Extended to a 12-tier ramp ending at **10,000**.
changed:
  - collectibles.js — replaced the 3-tier list with **25, 75, 150, 300, 500, 750,
    1000, 1500, 2500, 5000, 7500, 10000**. **Existing ids `collector:25/75/150`
    kept with their original rarities** (rare/epic/legendary) → migration-safe; the
    150 tier renamed **"Completionist" → "Magpie"** (display-only, id unchanged).
    New tiers 300+ are additive, all legendary. Names are characterful + **varied**
    (Curator, Hoarder, Magpie, Antiquarian, Archivist, Loremaster, Vaultkeeper,
    Reliquarian, Hoard-Lord, Treasure Dragon, Grand Conservator, Keeper of the
    Myriad). Descriptions format thousands ("Collect 2,500 items.").
  - No logic change — `evaluateCollector(count, has)` is already `count >= it.n`.
  - test/hero-icons.test.js — its pinned drill catalogue size **795 → 804** (the 9
    new collector items; baseline icon snapshots unaffected).
how I verified:
  - `node test/collector.test.js` (NEW, 18th gate) → **ALL 20 PASS**: starts 25,
    **ends 10000**, strictly ascending, **`collector:25/75/150` preserved**, 150 no
    longer "Completionist"; `evaluateCollector` grants **exactly tiers ≤ count** at
    0/24/25/200/1000/3000/9999/10000/99999 (none above), **owned tiers not
    re-granted**, huge count grants every tier + no phantom; **thousands formatted**;
    names distinct.
  - **icon-variation gate still green** (new collector ids auto-generate icons);
    **all eighteen gates pass**; `node -c` clean. Awards-tab Collector section
    (post-T48 bars-at-top, lazy-render) renders the longer list fine at 360px. No
    regressions.
notes / questions: headroom above the current ~1154 catalogue is intentional
  (future items). Next per REVIEW order: **T56** (pixel mark/topic glyphs + favicon).

## T56 — Pixel-art the app mark + topic glyphs + favicon  [HANDOFF]
commit: (this commit, on main)
Goal: retire the typographic HTML glyphs (mono font + amber ".slash" span) in
favour of a procedural **pixel bitmap font** drawn to canvas, and mint a real
favicon / home-screen icon from the same renderer.
changed:
  - **glyphs.js (NEW, loaded first in index.html) / window.Glyphs** — a pure,
    deterministic pixel font. `BIG` 5×7 cells for `0-9 x a b n k × ÷ + − ± / %`;
    `SMALL` 3×4 cells (1‑4) for stacked vulgar fractions (num / bar / den) and
    superscripts. `buildGrid(tokens) -> {w,h,cells,missing}` emits ink codes
    **0 empty · 1 body · 2 accent**; `draw(canvas,tokens,opts)` is **static**
    (image-smoothing off, integer cell, centred — no RAF). Token DSL: `"x"` body,
    `"*×"` amber accent, `"f12"` fraction ½, `"s2"` superscript ². Unknown chars are
    recorded in `missing` (never silently dropped).
  - **modes.js** — added `glyphTokens` to all 15 modes (`TOPIC_GLYPHS` map), the
    accented token mirroring exactly the old amber ".slash" symbol per topic
    (e.g. halves `["x","*/","2"]`, times `["a","*×","b"]`, bonds `["+","*1","*0","*0"]`,
    fractionsof `["*f12","n"]`, squares `["x","*s2"]`). The old `glyph` HTML is
    **kept as a fallback**.
  - **main.js** — `paintGlyph(el,mode,scale,opts)` clears `el` and appends a
    pixel-font canvas (CSS upscales, `image-rendering:pixelated`), falling back to
    `mode.glyph` HTML if Glyphs/tokens are missing. Wired into **renderMark** (start
    mark), **openGuide** (guide title), **renderPractice** (practice title),
    **showTopicToast** (toast), plus **renderBrand** (the fixed entry "x/2"). New
    **installFavicon()** draws the "x/2" mark onto a 64×64 dark-padded canvas and
    sets `<link rel="icon">` + `apple-touch-icon` (data-URL) + a `theme-color` meta
    at runtime. Both called in init.
  - **index.html** — loads `glyphs.js` before modes.js. (Static `.mark` HTML left in
    place as the no-JS fallback; JS paints over it.)
  - **styles.css** — `.mark canvas` (clamp 54‑92px), `.g-glyph canvas` (22px,
    inline), `.t-glyph canvas` (24px) — all pixelated.
how I verified:
  - `node test/glyphs.test.js` (NEW, **19th gate**) → **ALL 27 PASS**: buildGrid
    pure/deterministic, only ink 0/1/2; **every mode has glyphTokens with 0 missing
    symbols** (each of `× ÷ + − ± / %` + stacked ½/¾ + superscript ² resolves to a
    real bitmap); accent role honoured (`*`-token → ink 2, plain → ink 1, mixed
    glyph carries both); **all 15 topic glyphs pairwise distinct**; module static
    (no RAF/timers); index.html loads glyphs.js; paintGlyph used on mark + guide +
    practice + toast + brand; favicon/apple-touch-icon/theme-color minted via
    `Glyphs.draw`.
  - ASCII-dumped all 15 grids — operators remain recognizable at the pixel grid.
  - **All nineteen gates pass**; `node -c` clean on glyphs/modes/main. Canvas glyphs
    are solid body + amber accent (no contrast-text concern); 360px-safe (CSS-scaled
    canvases). No regressions to the other surfaces.
notes / questions: kept the typographic `glyph` strings as a graceful fallback
  rather than deleting them. Next per REVIEW order: content extension — **T58**
  (content-extension playbook) → Wave-2 topic batches, with **Phase 6.5 Events**
  brought forward by the owner.

## T78 — Events foundation: UTC-daily scheduler + data model + "Events" tab + reward items  [HANDOFF]
commit: (this commit, on main)
Goal: the deterministic, offline backbone for Phase 6.5 Events — a 14-event roster
that cycles once per UTC day (recurs every 14 days), a new "Events" collectible
category with 14 real reward items that feed Arena power, and a new "Events"
inventory tab. (Play mode = T79, board lockout = T80, bespoke art/music/banner = T81.)
changed:
  - **events.js (NEW, loaded before collectibles.js) / window.Events** — pure +
    deterministic. `epochDaysUTC(now)=floor(now/86_400_000)` (UTC day, 00:00 UTC
    rollover); `indexFor=((day%14)+14)%14`; `today/isLive/daysUntilLive/byId/
    rewardId/roster`. **Clock injected** (every helper takes an optional `now`) — no
    `Date.now` baked in, no network/storage/timers. A fixed **14-event ROSTER**,
    each `{ id, name, theme, blurb, reward, rarity, artSeed, musicSeed, questionMix }`
    — distinct, evocative, leak-free copy (no digits) and a themed cross-topic
    `questionMix` (T79's spec) drawn from real modes.
  - **collectibles.js** — `CATS` gains **"Events"**; reads `window.Events.ROSTER`
    and registers one `event:<id>` reward per event (name=`e.reward`, its rarity,
    `cat:"Events"`, `eventId`). They're **real collection members**: the existing
    item-stamp gives each a hero **boost** (so they feed Arena power with no
    special-casing) + icon + flavour. `evaluate()` **skips the Events cat** (granted
    by completing the live event in T79, never by drills). Guarded by
    `if(window.Events)` so harnesses that don't load events.js are unaffected.
  - **main.js** — new **"Events" inventory tab** (`invEventsHtml`) listing the 14
    rewards ordered by the roster cycle, owned/locked like every category; `AWARD_CATS`
    now excludes both Loot and Events (each has its own tab).
  - **index.html** — loads `events.js` after modes.js, before collectibles.js.
how I verified:
  - `node test/events.test.js` (NEW, **20th gate**) → **ALL 28 PASS**: same UTC date
    → same event; index always 0..13 (incl. negative days); **cycle of 14** (index
    +1/day, wraps) and **each event recurs every 14 days** (live on its day, not on
    the 13 between); **00:00 UTC boundary flips** the event (23:59:59Z vs 00:00:01Z);
    pure/offline (no fetch/storage/RAF; `today(ts)` never calls `Date.now`); all 14
    events fully specified, **distinct, digit-free copy**, valid questionMix; the 14
    rewards are real `event:<id>` members carrying a **real hero buff**; migration-safe
    ids; **evaluate() never returns an Events reward**.
  - **All existing harnesses now load events.js** (mirroring index.html) so every gate
    re-proves on the **grown pool**. `arena.test.js` invariant (d) still holds — the
    enemies `def` derives from the live collection, so it self-scales: tier-120 def
    **523**, champion at full-minus-final-loot = **523** (exactly), removing one
    champion boost → **518 = loss**; tiers 1–5 still winnable at 0 items; def
    monotonic. `hero-icons` catalogue pin **804 → 818**.
  - Booted the app under a DOM shim: the **Events tab renders 14 locked tiles** at
    360px, "Daily Events" section, 0/14 bar, 4 tabs; global total **1154 → 1168**.
  - `node -c` clean (events/collectibles/main); **full 20-gate suite green**; no regressions.
notes / questions: event reward tiles show the procedural flavour name + icon like
  every other collectible (consistent with the existing inventory UI); the bespoke
  per-event art/copy/music + home banner are **T81** as specced. Next per REVIEW
  order: **T79** (event play mode: cross-topic gauntlet + today-only reward grant).

## T79 — Event play mode: the cross-topic gauntlet + today-only reward grant  [HANDOFF]
commit: (this commit, on main)
Goal: the actual event game. Reuses the round/clock/scoring engine; adds a
deterministic cross-topic gauntlet per event and grants the `event:<id>` reward
on completing the live event (idempotent).
changed:
  - **events.js** — new pure, deterministic **`buildGauntlet(eventId, modes)`**
    (modes injected, like the clock). For each `{topic,n}` in the event's
    `questionMix`: take the topic's fixed set, **canonicalise by a TOTAL-order sort**
    (numeric collator + raw-string tie-break — the collator ranks some distinct
    prompts equal, so without the tie-break a stable sort would leak `build()`'s
    shuffle), seed-shuffle and pick `n` distinct questions; the combined set is
    seed-shuffled into a themed interleave. **Byte-stable across plays / the 14-day
    recurrence / fresh boots** (seed = `hash(id) ^ artSeed`). Answers come straight
    from the curated topic sets, so they stay calibrated.
  - **main.js** — `startEvent(eventId)` (guarded **live-today only**) builds the
    gauntlet, tags each question with its source `_mode` (so the engine renders the
    right eyebrow/expr/hint), and runs the shared round. `finishEvent()` (branched at
    the top of `finish()`, before the normal path) shows results and **grants
    `event:<id>` only while still live and only once** (idempotent), then evaluates
    collector-count + hero/arena milestones the reward may trigger. `correct()` now
    skips per-question Gold **and** topic Beat/Spark grants while `eventCtx` is set
    (the event's reward is its own buff; topic items aren't farmable here). New
    **"Live today" play strip** atop the Events inventory tab is the functional entry
    (the prominent home banner is T81); `window.EventPlay.start` is exposed for
    T80/T81 + tests.
  - **styles.css** — `.event-live` strip (amber-bordered card; AA, 360px-safe).
how I verified:
  - **Extended `test/events.test.js`** → **ALL 45 PASS** (was 28; +17 for T79):
    `buildGauntlet` is **byte-stable per event** (same set every play, and **across a
    fresh module boot**), each gauntlet has exactly the mix's question count, **every
    question is numeric/non-negative/finite/numpad-safe (≤5 digits)** and is drawn
    from the right topic's curated set (themed); unknown id → empty.
    **DOM-drive**: froze `Date.now` to a live UTC day, `EventPlay.start` runs the
    event, **synthetic numpad keypresses answer the whole gauntlet → results screen
    → `event:<id>` reward granted**; **replaying is idempotent** (reward kept, not
    duplicated); on the **next UTC day the same event won't start** (returns false,
    no round opens).
  - Booted the app: the Events tab's **"Live today" strip** shows today's event + a
    Play button (`data-event`), and clicking it **starts the gauntlet** (game screen
    active). No new `$("id")`s (reuses the game/results ids).
  - `node -c` clean (events/main/collectibles); **full 20-gate suite green**; no regressions.
notes / questions: events pay **no Goblin Gold** and don't write the per-topic
  best-times board — the best-attempt board + live-window lockout is **T80**, and the
  bespoke per-event art/copy/music + prominent home banner is **T81** (next per REVIEW
  order: T80).

## T80 — Best-attempt board: event entries + live-window lockout  [HANDOFF]
commit: (this commit, on main)
Goal: surface events on the best-attempt board (the "Best times" / `#summary`
screen), playable only during their live window, with the best attempt persisting
across the 14-day recurrence.
changed:
  - **main.js** — a new **event best-attempt store** keyed by EVENT id (not date):
    `loadEventBest/saveEventBest/recordEventBest` in `halves.eventBest` (in-memory
    fallback), keeping the better attempt via the existing `rank` ordering — so the
    best **survives the 14-day gap** and is beatable next time. `finishEvent()`
    records the attempt. `renderSummary()` now appends an **"Daily Events"** section
    (`eventSummaryRows()`): today's event renders **LIVE + routable** (amber tint,
    carries `data-event`, shows its persisted best); the other 13 render **LOCKED** —
    visible (best + "Live in N days") but with **no `data-event`** so they can't be
    played. `isRetryable(id) = Events.isLive(id)`. The `#sumList` tap handler routes
    a `.sum-row.event[data-event]` into `startEvent` (locked rows aren't routable;
    `startEvent` re-guards live). `start()`/`startPractice()` now clear `eventCtx`
    (so abandoning an event mid-round can't misroute a later normal `finish()`).
    `window.EventPlay` gains `isRetryable` + `bestOf`.
  - **styles.css** — `.sum-event-head` section label + locked-event row tweak (AA;
    reuses the existing `.sum-row` heat-map styling, 360px-safe).
how I verified:
  - **Extended `test/events.test.js`** → **ALL 62 PASS** (was 45; +17 for T80, incl. a
    second DOM drive with an injected clock): `isRetryable` **true iff live today**;
    the board lists a **Daily Events** section with **1 live (routable) + 13 locked
    (no `data-event`)** rows; the live row shows the persisted best and **tapping it
    starts the gauntlet**; play-with-a-skip records a beatable best (12/13); advancing
    the clock **+14 days → the same event is live again, the prior best persisted**,
    and a clean replay **beats it (13/13)** while the reward stays owned (idempotent);
    **off its day** the event is **locked + not routable** (no `data-event`).
  - `node -c` clean; **full 20-gate suite green** (practice/arena unaffected by the
    `eventCtx`-clear); no regressions.
notes / questions: events still pay no Gold and don't touch the per-topic boards.
  Next per REVIEW order: **T81** (per-event procedural art + copy + event music + the
  prominent front-and-centre home banner with a UTC countdown).

## T81 — Event presentation: art + copy + event music + home banner  [HANDOFF]
commit: (this commit, on main) — completes the Phase 6.5 Events block (T78–T81)
Goal: make events FEEL special — bespoke per-event procedural art, real copy, a
dedicated event music theme, and a prominent front-and-centre home-screen banner;
plus the required T80 carry-over CSS fixup.
changed:
  - **eventart.js (NEW, loaded after scenery.js) / window.EventArt** — a standalone,
    pure, deterministic emblem generator (its OWN visual language — a seeded heraldic
    crest on a themed sky, NOT a reskin of glyphs/monsters/scenery). `buildGrid(seed)`
    (24×16 hex grid) + static `draw(canvas, seed)` (pixelated, no RAF). Palette
    (HSL→hex), crest size, mirror-symmetric rune and sparks all derive from one
    seeded RNG → **100% pairwise-distinct** across the 14 `artSeed`s.
  - **sound.js** — new **"Festival Day"** event theme (style 17, `EVENT_STYLE`),
    LYD/92 BPM, calm (density 0.30) — within the T69/T71 envelope; `styleIndexFor("event")`
    + `EVENT_STYLE` exported. **main.js** `show()` plays it during the gauntlet
    (`eventCtx ? "event" : …`).
  - **main.js** — **`renderEventBanner()`**: a prominent banner on the **#start home
    screen** (above the picker, not in a tab/menu) with the event's **emblem art**,
    **name + blurb**, a **Play CTA** that routes straight into the live gauntlet
    (`startEvent`), and a **live countdown to 00:00 UTC** (`updateEventCountdown`).
    Owned-today reads "reward earned · Play again" (visible, not nagging). A 1s
    `tickEventBanner` updates the countdown **only while home is visible** and
    re-renders on a UTC-day rollover. Rendered on init + every nav back to home.
  - **styles.css** — `.event-banner` + `.eb-*` (AA, 360px-safe, line-clamped blurb);
    **`--amber-weak: rgba(245,181,68,.12)`** added and the **T80 fixup** applied — the
    live best-attempt row now uses `background:var(--amber-weak)` (the old
    `var(--amber)1f` was invalid and dropped).
how I verified:
  - **Extended `test/events.test.js`** → **ALL 77 PASS** (+15 for T81): emblems
    **≥90% pairwise-distinct** (100%) + deterministic + static; **no `var(--amber)1f`
    remains** and a valid `--amber-weak` is used; a dedicated `"event"` sound theme
    exists; the **banner is a top-level #start element** (regex: `#start … #eventBanner
    … picker-wrap`) carrying art + copy + a Play CTA with the live `data-event` + the
    UTC-rollover countdown, and **routes into `startEvent`**; **no Arena event-gate UI**.
  - **`sound.test.js`** extended: the event theme exists, is **distinct from menu/arena**,
    is **calm (bpm ≤ 95, density ≤ 0.4)**, and main routes the gauntlet to it.
  - Booted the app: the **home banner renders** with art/name/blurb/Play/countdown
    ("New event in HH:MM:SS"); **clicking Play starts the gauntlet**; event theme is
    "Festival Day" (92 BPM). `node -c` clean (eventart/sound/main); **full 20-gate
    suite green**; no regressions.
notes / questions: kept this as the single Events gate (extended events.test.js +
  sound.test.js) rather than adding a 21st gate file. **Phase 6.5 Events is complete
  (T78–T81).** Next per REVIEW order: **T82** (visual-direction deep research, Phase
  6.7 — doc-only), then content extension T58 → Wave-2 batches.

## T82 — Deep research: brickmap-grade visual character (doc only)  [HANDOFF]
commit: (this commit, on main) — Phase 6.7, **doc only, ZERO code/behaviour change**
Goal: a rigorous research/design doc on giving Halves brickmap's performant visual
character **without a voxel engine**, Android-primary, building ON our existing
generative art — ending in a ranked recommendation + a reversible first spike.
changed:
  - **docs/VISUAL-DIRECTION-RESEARCH.md (NEW)** — substantively answers (1)–(7):
    (1) an **aesthetic teardown → 7 voxel-free techniques** (Bayer dithering, palette
    quantisation + per-biome ramps, instanced particle splats, atmospheric/depth fog,
    banding-as-feature, exposed-tech mono HUD, chunky forms) each mapped to a Halves
    surface with a rough cost; (2) an explicit **inventory of our existing generative
    art** (icons/heroes/monsters/scenery/glyphs/eventart/fx) + a concrete **build-on
    (grid→texture→dither/ramp/particles) composition plan** — losing them is a non-goal;
    (3) a **scored option matrix** (hybrid DOM+WebGL2 FX / full 2D WebGL / cross-platform
    engine / native Android / TWA) against perf·aesthetic·effort·risk and the **three
    crown jewels** (DOM a11y · no-build · Node-verify); (4) **Android delivery** (TWA via
    Bubblewrap, manifest/SW/asset-links, bundle/cold-start, min-SDK 26 + WebGL2 baseline
    / WebGPU as progressive enhancement, COPPA/Families — tied to T72); (5) **perf
    principles** (instance-don't-iterate, static uploads, palette LUTs, a real 60fps
    mid-range Android budget + degrade ladder, keep perf.test.js meaningful); (6)
    **keep-vs-rebuild + verification** (logic/generators portable & still Node-gated; FX
    layer additive; a11y plan = text/input stay DOM, FX canvas aria-hidden; gate the FX
    layer via pure-function + budget + WebGL-stub Node tests); (7) a **ranked
    recommendation** (hybrid FX layer + TWA) and a **reversible first spike** (dithered,
    palette-driven, particle backdrop behind the existing menu, reusing EventArt/Scenery
    seeds, proven on a real mid-range Android tablet) with explicit **success + kill
    criteria**; plus risks/unknowns + open questions for the owner.
  - **Honesty note in the doc:** `00-1/brickmap` is **out of this session's GitHub scope**
    (only `00-1/halves` allowed) — I did NOT read its source; the teardown is built from
    the owner-shared screenshots described in the brief + standard graphics technique, and
    flags the brief's "Rust+wgpu/Bevy voxel" attribution as unverified. Nothing about
    brickmap's internals is invented.
how I verified:
  - **Doc only** — `git status` shows the **single new `.md`**, zero `.js`/CSS/HTML touched;
    **full 20-gate suite green**; deploy-safe.
notes / questions: open questions for the owner are listed in §8 (primary target device;
  strictly-Node-only vs an elective Playwright visual check; WebGPU appetite; confirm the
  brickmap stack attribution). Next per REVIEW order: content extension **T58** (the
  content-extension playbook) → Wave-2 batches T59/T60/T61, then **T72** (Play Store).

## T83 — Promote the topic guide to a first-class action (Play · Practice · Guide)  [HANDOFF]
commit: (this commit, on main) — Phase 6.8 tech-tree block, task 1 of 2
Goal: move the "how to approach this" guide out of the tiny per-row "?" into a
first-class **Guide** button beside Start/Practice for the selected topic.
changed:
  - **index.html** — added `<button class="btn alt" id="guideBtn">Guide</button>`
    as a third peer in `.start-actions` (Start · Practice · Guide).
  - **main.js** — `$("guideBtn")` opens the selected topic's guide (`openGuide(mode)`);
    `renderStartState()` gates it (`disabled = !Guides.has(mode.id)`). Removed the
    per-row `?` (`.mr-guide`) markup from `modeRow` and its click-handler branch.
    **Picker rows (incl. locked) are now selectable** so any topic can be previewed
    and its guide read via the button (the old `?` opened locked previews; this keeps
    that). `selectMode` already guards persistence (`if(isUnlocked) saveLastMode`),
    and `renderBest`/`renderMark`/`renderStartState` already handle a locked selection.
  - **styles.css** — deleted the `.mr-guide` rules; resized `.start-actions .btn`
    (font 16px, padding 16px 6px, gap 10px) so three buttons fit at 360px.
how I verified:
  - `node test/guide-action.test.js` (NEW, **21st gate**) → **ALL 11 PASS**: Guide is a
    peer of Start/Practice in `.start-actions`; selecting a topic **with** a guide
    enables it and clicking **opens the modal** (which still closes); a topic **without**
    a guide **disables** it (mirrors Start/Practice gating); a **locked topic is
    selectable**, keeps Start/Practice **disabled** but Guide **enabled**, and its
    **guide still opens** (no preview lost); the per-row `?` is **fully removed** (no
    orphan markup/handler/CSS).
  - `node -c` clean; grep confirms **zero `mr-guide`/`data-guide` refs** remain;
    **full 21-gate suite green**; no regressions.
interpretation note (for the babysitter — there's a small spec tension): the spec says
  Guide should be "disabled … when … locked" **and** that "the Guide button must still
  open a guide for a selected (incl. locked-preview) topic." Those conflict if locked
  rows can't be selected. I resolved it to **lose no functionality**: locked rows are
  selectable for preview, and Guide is gated by *has-guide only* (not lock), so a locked
  topic's guide still opens while Start/Practice stay disabled — preserving the old `?`
  locked-preview behaviour and lining up with T84's "select any node" tree. If you'd
  rather Guide be lock-gated (and drop locked previews, or keep a `?` only on locked
  rows), it's a one-line flip in `renderStartState` + restoring the row markup — say the
  word. Next per REVIEW order: **T84** (the data-driven tech-tree view).

## T84 — Tech-tree view for the topic selector (data-driven, icon-node, 360px-safe)  [HANDOFF]
commit: (this commit, on main) — completes the Phase 6.8 tech-tree block (T83–T84)
Goal: visualise the EXISTING unlock chain as a tech tree — a new view of data we
already compute, never a hand-maintained edge list — toggleable with the list (which
stays as the a11y fallback).
changed:
  - **main.js** — `techGraph()` derives the graph from **live data**: the **spine** =
    modes without `requires`, ordered by following **`unlockedBy`** from the root; the
    **branches** = modes with **`requires:"mastery:<id>"`** hung off their Part-1 parent.
    Orphans append gracefully (no crash on a malformed chain). `nodeState(m)` ∈
    {locked·unlocked·mastered·done} from `isUnlocked()` + `modeProgress()` + the owned
    `mastery:<id>`. `renderTree()` lays out **rows of `[spine node] —tlink— [branch
    node]`** (≤2 wide → 360px-safe), each node a **focusable `<button>`** (not a canvas
    blob) with the topic icon, a state badge and `have/total`. A single swappable
    **`nodeIcon(m,cv)`** hook draws the T56 pixel glyph today (richer T82 art drops in
    later without touching layout). A **selected-node detail panel** (`#treeDetail`)
    shows name + `have/total` (or the unlock requirement if locked); the **Play/Practice/
    Guide actions are the shared T83 buttons**. Tapping a node = `selectMode` (locked =
    preview only; Start stays disabled, never starts from here). `selectMode`/`applyRoute`
    now call view-agnostic **`renderPicker()`**; **`setPickerView()`** toggles list⇆tree
    and **persists** the choice (`halves.pickerView`, **list is the default fallback**).
    `window.TechTree = { graph, state, view }` exposed for tests.
  - **index.html** — a **List ⇆ Tree** toggle (`#pickerViews`, role=tablist), the
    `#modeTree` container alongside `#modeTabs` in `.picker-wrap`, and `#treeDetail`.
  - **styles.css** — `.picker-views`/`.pv-btn` toggle, `.tree`/`.tree-row`/`.tnode`
    (state-coloured: amber ▶ · violet ★ mastered · mint ✓ done · dimmed 🔒), spine +
    branch connectors, `.tree-detail`. 360px-safe; reuses the existing scroll region.
how I verified:
  - `node test/tech-tree.test.js` (NEW, **22nd gate**) → **ALL 20 PASS**: the graph is
    **derived from data** (every spine edge == `unlockedBy`, every branch ==
    `requires:"mastery:<parent>"`, all 15 modes once); states read live data (fresh
    profile: only halves unlocked); toggling to **Tree shows the tree + hides the list**
    and renders a **focusable node per mode**; the choice **persists**; **locked nodes are
    preview-only** (tapping never starts a round, Start stays disabled, the detail panel
    shows the requirement); toggling back **restores the accessible list**; nodes route
    through the **single `nodeIcon()` hook**; no parallel edge list.
  - Booted the app: tree = **10 spine rows + 5 branches**, 14 locked + 1 ▶ on a fresh
    profile; selecting an unlocked node enables Start and the panel reads "Halves · 0/59
    collected". `node -c` clean; **full 22-gate suite green**; no regressions.
notes / questions: list stays the **default** view (a11y fallback) with Tree one tap
  away + remembered. Because it renders from data it auto-grows with Wave-2 (≤2-wide rows
  keep 360px-safe at ~23 nodes). **Phase 6.8 tech-tree block is complete (T83–T84).** Next
  per REVIEW order: **content extension T58** (the playbook) → Wave-2 batches T59/T60/T61.

## T85 — Settings screen + "Clear all data" (serious confirmation)  [HANDOFF]
commit: (this commit, on main) — Phase 6.9 settings/gating block, task 1 of 3
Goal: add a Settings screen housing a destructive **Clear all data** — a real
reset/privacy feature AND the way to return to a genuine first-run state to QA the
T86/T87 onboarding gating.
changed:
  - **index.html** — a **⚙ Settings** link in the home linkrow; a **`#settings`
    screen** (a Sound row + a "Danger zone" with the Clear-all-data button + Back);
    and a **`#resetModal`** confirm (blunt warning + a shown code + an entry display +
    a **numpad** [0-9, ⌫, C] + Clear/Cancel).
  - **main.js** — `#settings` added to the screens map + routed (`#/settings`,
    `renderSettings` syncs the Sound row, Back → home). **`clearAllData()`** wipes every
    `halves.*` key via a **prefix scan** (`localStorage.length`/`key`) **plus** an
    enumerated fallback (known keys + every per-mode board `halves.hof:<id>`), drops the
    in-memory caches, and **reloads** to first-run. **Serious confirm**: `openReset()`
    shows a random **4-digit code** + starts a **5s countdown** (1s interval);
    `resetCanConfirm()` requires **both** `countdown ≤ 0` **and** the entered 4 digits ==
    the code. The numpad appends/erases/clears the entry; Confirm's label shows
    "Clear (N)" while counting and stays **disabled** until both conditions hold; Cancel /
    backdrop close safely (no wipe).
  - **styles.css** — `.btn.danger` (coral), `.settings-body`/`.set-row`/`.set-danger`,
    and the reset modal (`.reset-warn`/`.reset-code`/`.reset-entry`/`.reset-pad`).
    360px-safe; reuses the existing `.key` numpad styling.
how I verified:
  - `node test/settings-reset.test.js` (NEW, **23rd gate**) → **ALL 16 PASS** (DOM shim
    with an enumerable localStorage): Settings routes from home; **opening it harms no
    data**; the confirm shows a **4-digit code**; Confirm **starts disabled** and a
    disabled press does nothing; a **wrong code** keeps it disabled **even after the
    countdown** (and doesn't wipe); a **correct code while the countdown still runs**
    stays disabled (early press doesn't wipe); only **countdown-elapsed + correct code**
    enables Confirm, which then **clears every `halves.*` key** — including an **unknown
    future key + a per-mode board** (proving the prefix scan) → **0 keys left**, and the
    app **reloads** to first-run; cancel/back leave data intact.
  - `node -c` clean; **full 23-gate suite green**; every `$("id")` resolves; no regressions.
notes / questions: folded the **mute toggle into Settings** (the babysitter-optional
  extra) while keeping the existing home 🔊 button. Next per REVIEW order: **T86**
  (onboarding gating engine + first-run intro + Inventory gate + highlight — migration-safe,
  never re-gate existing players).

## T86 — Onboarding gating I: unlock-state model + first-run intro + Inventory gate + highlight  [HANDOFF]
commit: (this commit, on main) — Phase 6.9 settings/gating block, task 2 of 3
Goal: the onboarding engine + the first gate — a fresh profile starts with extra
features gated and unlocks them by progressing; **migration-safe** (legacy players
are never re-gated). Access layer only — earning/collection/Arena untouched.
changed:
  - **main.js** — **unlock-state model** in `halves.unlocked`: `isFeatureUnlocked(id)`
    / `unlockFeature(id)` / `needsIntro()`. **Migration:** at load, an existing record
    wins; else a profile **with progress** (`profileHasProgress()` = any collected /
    `stats.games>0` / any board) is **stamped `{legacy:1}` → all unlocked**; a genuinely
    fresh profile is gated and **NOT persisted yet** (so it can still migrate to legacy
    if progress later appears — avoids a probe-boot stamping a stale empty record).
    **First-run intro:** `startIntro()` runs **ONE trivial question** ("half of 12" =
    6 — numeric/numpad-safe, in the halves set) via a new `introCtx`; `finish()` branches
    to `finishIntro()` which flags `introDone`, **unlocks the Inventory** and queues its
    one-time highlight (the reward — this question's collectible — is granted in
    `correct()`; skipping still completes it, never trapping). The entry **Play** drops a
    fresh profile straight into the intro (`needsIntro() ? startIntro() : applyRoute()`).
    **Gating:** `applyGates()` hides gated nav (`#invBtn` for now) until unlocked, and the
    `#/inventory` route is **guarded** (deep-link blocked while gated). **Highlight:**
    `firePendingHighlight()` pulses the revealed nav control + raises a calm **coachmark
    toast** ("Inventory unlocked — your rewards live here"), persisted to fire **once**.
    `window.Onboard` exposed for tests.
  - **styles.css** — `.linkbtn.pulse` one-time spotlight (`@keyframes feat-pulse`,
    reduced-motion safe).
  - **test/perf.test.js** — seeds `halves.unlocked={legacy:1}` (it navigates into the
    now-gated Inventory/Heroes/Arena, so it must boot as an established player).
how I verified:
  - `node test/onboarding.test.js` (NEW, **24th gate**) → **ALL 23 PASS**: a **FRESH**
    profile → Inventory gated (nav hidden + **deep-link blocked**); launch drops into a
    **single** question ("1 / 1"); solving it returns home, **unlocks + reveals the
    Inventory**, grants the first reward (`solve:halves:12`), **raises a one-time
    coachmark**, persists `{inventory, inventoryHi, introDone}`, and the highlight
    **fires only once**; a **LEGACY** profile (progress, no record) is **stamped legacy →
    all features unlocked, never re-gated**, can open the Inventory, and is **not** forced
    through the intro; unlock-state **persists across a reload**.
  - **Arena invariants untouched** — `arena.test.js` green (gating is access-layer; no
    enemies/heroes/collectibles change). `node -c` clean; **full 24-gate suite green**.
notes / questions: the migration treats "has any collected/stats/board" as legacy; the
  fresh-but-unpersisted record means an established player who somehow lacked a record
  still resolves to legacy on first load. Next per REVIEW order: **T87** (wire the
  remaining gates — Practice/Heroes/Arena/Event-banner/Gold — with the same once-highlight,
  migration-safe).

## T91 — BUGFIX: the event banner breaks the home-screen layout (priority)  [HANDOFF]
commit: (this commit, on main)
> Process note: apologies for the sequencing — I pulled T86 before the T91 insert was
> visible in REVIEW, so T86 shipped first. Picking up T91 now as the priority fix; it
> accounts for T86's home-screen additions (the gated `#invBtn` lives in the linkrow,
> untouched by this layout change).
Owner-reported: the T81 banner was far too tall — the home page scrolled, the picker was
starved to ~nothing, and the topic mark was stranded above the oversized card.
changed:
  - **main.js `renderEventBanner()`** — now a **compact horizontal strip**: small emblem ·
    (tag + name + inline UTC countdown) · an **inline Play button** (no big block). The
    **multi-line blurb is dropped** from the home banner (the full blurb still shows on the
    Events tab / play screen). Owned-today reads "Reward earned" + "Again". Still carries
    the emblem art, event name, Play CTA → `startEvent`, and the 00:00-UTC countdown.
  - **index.html** — **moved `#eventBanner` to the very top of `#start`** (above `#mark`),
    so the order reads `event banner → topic mark/tag → toggle → picker` (banner genuinely
    first; the mark sits next to its selector, no longer stranded).
  - **styles.css** — `.event-banner` rebuilt as a **bounded strip** (`max-height:84px`,
    centred row, small 52×34 art, 1-line ellipsised name, inline `.eb-play`); removed the
    old `.eb-blurb`/`.eb-row` rules. **`.picker-wrap` gains `min-height:148px`** (~3 rows)
    so the banner can never collapse it to nothing. Trimmed the toggle/best/start-actions
    top margins to help the one-screen fit.
how I verified:
  - **`events.test.js` extended** (+5 T91 checks) → green: the banner has a **bounded
    `max-height`**, the home banner has **no `eb-blurb`**, `.picker-wrap` keeps a **non-zero
    min-height**, the banner sits **above the topic mark** in `#start`, and the compact
    banner still keeps the **Play CTA + UTC countdown**. Existing banner gates
    (on-home/routes/countdown/emblem) still pass.
  - Booted the app: the compact banner renders name + inline Play + "New event in HH:MM:SS",
    drops the blurb, and **Play routes into the gauntlet**. Fixed a contrast-gate catch
    (`.eb-tag` 9→10px; the gate forbids <10px). `node -c` clean; **full 24-gate suite green**.
notes / questions: I can't measure pixel viewport fit headlessly, so the one-screen-fit at
  360×640 / 390×844 is best-effort via the compact strip + picker min-height + tightened
  margins (please eyeball the live build). Back on sequence — next per REVIEW order: **T87**
  (wire the remaining onboarding gates), then content extension.

## T87 — Onboarding gating II: wire the remaining feature gates + reveals  [HANDOFF]
commit: (this commit, on main) — completes the Phase 6.9 settings/gating block (T85–T87)
Goal: hang the rest of the features on the T86 engine, each revealed + highlighted at
a sensible progress milestone. Migration-safe; never traps; access layer only.
changed:
  - **main.js** — extended `GATED` with `cond` milestones + multi-element `el`:
    **Practice** ← `hasInit` (first finished round, any `init:`); **Heroes** ←
    `hasLootOrMastery` (first loot/mastery item); **Arena** ← `hasHero` (any hero
    owned — bram unlocks on the first init); **earnings** (Gold + Momentum readouts)
    ← `hasEarned` (Gold>0 or momentum>0); **event banner** ← `enoughRuns` (`stats.games
    ≥ 3` — a few runs in). New **`checkGates()`** evaluates the conditions on returning
    home / at init and unlocks + queues a highlight for any newly met; `applyGates()`
    now hides each feature's control(s). The highlight is a **queue** (`highlightQ`)
    fired through the existing toast cap so several unlocks **never spam**. The
    **event banner is withheld** in `renderEventBanner()` until unlocked (the live/
    countdown logic is unchanged once shown). **Deep-link guards** added for
    `#/heroes`, `#/arena`, `#/hero/*` (Inventory already guarded). `finishIntro` now
    uses `queueHighlight("inventory")`.
how I verified:
  - **`onboarding.test.js` extended** → **ALL 50 PASS** (was 23): a **brand-new**
    (post-intro) profile has Practice/Heroes/Arena/earnings/event-banner **all gated**
    (controls hidden; **event banner withheld**); **Practice** unlocks on first `init:`,
    **Arena** once a hero is owned, **Heroes** on first mastery/loot (+ nav revealed),
    **Gold/Momentum** once earned, the **event banner only after games ≥ 3** (still
    withheld at 2) and it **keeps its Play CTA + countdown** once shown; **deep-link
    `#/heroes` / `#/arena` bounce home while gated**; a **LEGACY** profile sees
    **everything** (no re-gate).
  - **Arena invariants untouched** — `arena.test.js` green (access layer; no
    enemies/heroes/collectibles change). `node -c` clean; **full 24-gate suite green**;
    no regressions.
notes / questions: ladder per the spec's draft (owner delegated "add good points");
  the event-banner threshold is **3 runs** (owner's "a few"). Highlights are paced via
  the toast queue (calm). **Phase 6.9 (T85–T87) is complete.** Next per REVIEW order:
  **T92** (event reward tiers — skip-proof "did well"/"extremely well" tiers, sequenced
  before the Arena 3v3 re-calibration), then the content-extension wave.

## T92 — Events: tier the reward by performance (participation · well · ace)  [HANDOFF]
commit: (this commit, on main)
Goal: close the skip-to-win exploit — today completing an event pays the full reward
regardless of score. Keep an easy participation reward, add two performance-gated tiers.
changed:
  - **events.js** — each event gains **`rewardWell` + `rewardAce`** names (characterful,
    themed, distinct) alongside the existing `reward`.
  - **collectibles.js** — registers **3 tiers per event** (14×3 = **42** items): the
    **participation** tier keeps the **`event:<id>` id + name + rarity** (migration-safe),
    plus **`event:<id>:well`** (rarity bumped one step) and **`event:<id>:ace`** (legendary).
    Each carries a `tier` tag and the auto-stamped hero **boost** → all feed Arena power.
    Catalogue 818 → **846**.
  - **main.js** — **`eventTiersEarned(eid, score, total)`** (skip-proof): participation =
    completion; **`well` ≥ 70%** clean-score `score/total`; **`ace` = flawless** (`score===
    total`). Since **skips never enter `times`** (T74), skipping lowers the fraction and
    **can't reach** the higher tiers. `finishEvent` grants **every tier earned this run,
    live-only, idempotent per tier**; improving on a replay / the 14-day recurrence earns
    the higher tiers **without removing** owned ones. The **Events tab now lists all 3
    tiers per event** (42, in roster→tier order). (Renamed the shadowing local
    `unlocked`→`earned` so it no longer collides with the T86 onboarding state.)
how I verified:
  - **`events.test.js` extended** → **ALL 87 PASS**: **42** event items; participation keeps
    its id/name/rarity; **:well/:ace** exist + tagged; **rarity ascending** (participation ≤
    well ≤ ace = legendary); every tier is a real **buff**. DOM drives: a **FLAWLESS** live
    run grants **all three tiers**; replay is **idempotent per tier**; a **skip-through earns
    ONLY participation** (well/ace skip-proof); **improving on the 14-day recurrence** adds
    well+ace without dropping participation.
  - **`arena.test.js` re-proved on the grown pool** (+28 items): tiers 1–5 winnable at 0
    items, def **monotonic**, no tier behind own loot, **tier-120 def auto-scaled 523→583**,
    champion at full-minus-final-loot = 583, **removing one boost still flips** to a loss.
  - Booted the app: the **Events tab shows 42 tiles** (3/event, "/42" total). `hero-icons`
    catalogue pin 818→846. `node -c` clean; **full 24-gate suite green**; no regressions.
notes / questions: thresholds **well ≥ 0.7**, **ace = flawless** (the spec's suggestion;
  tunable). Sequenced **before** the Arena 3v3 (T88) so its re-calibration sees the full
  42-item event-reward set. Next per REVIEW order: the **Arena 3v3 block (Phase 6.10) —
  T88**, then content extension.

## T96 — Rework the home (#start) layout: top-align, tree-only, info row, one-line nav  [HANDOFF]
commit: (this commit, on main)
> Process note: apologies — another race; I pulled T92 before the T96 insert was visible.
> Doing T96 now as the priority. It accounts for the T86/T87 gating (the nav degrades as
> gating hides Inventory/Heroes/Arena) and keeps the T91 compact banner guarantees.
Owner-reported (screenshot): empty top band, oversized banner Play button, cramped tree
(~4 nodes), two-row nav. Rebalanced so the tree breathes and it still fits one screen.
changed:
  - **index.html `#start`** — removed the big top **`#mark`/`#tag`**, the **List/Tree toggle
    (`#pickerViews`)** and the home **list (`#modeTabs`)**. New order: **banner → tree
    (`#modeTree`, the only picker, takes the freed space) → compact `#topicInfo` row →
    `#goldBar`/`#momentumBar` readouts → Start/Practice/Guide → `#navRow` (one row of icon
    buttons) → build**.
  - **main.js** — deleted `pickerView`/`setPickerView`/`renderPicker(list)`/`renderTabs`/
    `modeRow`/`updateScrollCues`/`renderMark`/`renderBest` and the `#modeTabs`/`#pickerViews`
    listeners. New **`renderTopicInfo()`** paints **one compact row**: glyph (via `paintGlyph`)
    · name · `have/total` · best (or the unlock requirement if locked) — **no more duplicate
    top-mark + detail-panel**. `renderTree()` calls it; `selectMode`/`applyRoute`/init use the
    tree directly. The **banner Play CTA** is a tidy proportionate pill ("▶ Play" / "Again").
    The **nav sound button** is icon-only ("🔊/🔇"); `syncSoundButtons` updated.
  - **styles.css** — `.tree` is the flex home picker (`max-width:360`, `min-height:150`);
    new `.topic-info`/`.ti-*`, `.readouts`, `.navrow`/`.navbtn` (icon buttons, `.hidden`
    degrades with gating); `.eb-play` rebuilt as a small amber pill; removed the dead toggle CSS.
how I verified:
  - **Updated the affected gates**: `tech-tree.test.js` (toggle removed → tree-only;
    **list fallback now asserted on Best Times** `#sumList`; info row replaces the detail
    panel), `events.test.js` (banner-above-**tree**; `.tree` min-height), `glyphs.test.js`
    (start mark → `.ti-glyph`), `practice.test.js` + `guide-action.test.js` (select via a
    **tree node**, not a list row). **Full 24-gate suite green**; `node -c` clean.
  - Booted both profiles: **legacy** shows **15 tree nodes** + the info row + all nav
    (fsBtn only hidden in headless = no fullscreen); **fresh** correctly **hides
    Inventory/Heroes nav** (gating) while the nav row stays centred. Arena untouched.
notes / questions: I can't measure pixel viewport fit headlessly — the one-screen fit at
  360×640 / 390×844 is structural (compact banner + the reclaimed top going to a flex tree
  with min-height 150 + one-row nav); **please eyeball the live build**. Some now-unused CSS
  (`.picker`/`.mode-row*`/`.scroll-cue`/`.best`/`.tree-detail`) remains and can be swept later.
  The list-style selector lives on **Best Times** (the a11y alternative). Next per REVIEW
  order: **T97** (UI-direction research, doc only), then the Arena 3v3 block / content wave.

## T97 — Deep research: a "gamey, less web-2.0" UI direction (doc only)  [HANDOFF]
commit: (this commit, on main) — [A] task; doc only, ZERO behaviour/style change
Goal: research, before committing, a more "gamey / less web-2.0" UI that fits our
aesthetic — the owner isn't convinced by the rounded buttons. Ends in a ranked
recommendation + a buttons-first reversible plan, co-designed with the FX layer.
changed:
  - **docs/UI-DIRECTION-RESEARCH.md (NEW)** — substantively answers (1)–(5):
    (1) an **honest audit** grounded in the live CSS (radius tally `12px×11 / 14px×8 /
    999px pills`, 13 soft drop-shadows, flat dark cards, the `.btn{radius:14px}` amber
    pill, Space Grotesk display) → diagnosis: **pixel/RPG content inside a soft rounded
    web-app frame**; (2) four candidate languages — **(a) pixel/8-bit bevel, (b) 16-bit
    JRPG window, (c) exposed-tech/mono HUD, (d) modern angular** — each mapped to our
    components with **no-build CSS** (box-shadow bevels, `clip-path` cut/stepped corners,
    procedural 9-slice via canvas→`border-image`) and weighed for harmony with our pixel
    generators + the brickmap-grit FX; (3) **component-by-component** treatments (buttons,
    panels, modals, numpad keys, nav, toasts, tree nodes) with concrete CSS; (4)
    **constraints** weighed honestly — the **kid-legibility-vs-pixel tension** (frames
    pixel-bevel, **body text stays clean**), a11y (visible 2px focus ring, ≥44px targets,
    AA), no-build, 360px, and **reversible via CSS custom-props + a `data-ui` switch**;
    (5) a **ranked recommendation** — a blend **exposed-tech HUD + pixel-bevel low-radius
    buttons + bordered panels** — and a **buttons-first phased plan** (tokens → buttons →
    panels → modals → numpad → nav/nodes), each step a single token swap (reversible), with
    an explicit **co-design-with-FX** note (shared hard-edge language + per-biome palette).
how I verified:
  - **Doc only** — `git status` shows the **single new `.md`**; zero `.js`/CSS/HTML touched;
    contrast/glyphs/events/tech-tree spot-checks green (full suite unaffected); deploy-safe.
notes / questions: open questions for the owner are in §6 (retro pixel-bevel vs modern
  angular for the button spike; how far past buttons to go; JRPG framing on big panels;
  confirm the clean-text rule). Next per the **Builder A pointer**: **T88–T90 (Arena 3v3)**,
  then content **T58–T61**, then **T72**, plus FX **wiring** tasks once B's `FXGL` engine +
  the surfaces exist.

## T88 — Arena 3v3: a deterministic 1–3 vs 3 auto-resolve sim (re-derive + re-prove)  [HANDOFF]
commit: (this commit, on main) — [A] task (Phase 6.10). Mid-task on T88 when the Builder A
pointer reprioritised T98–T103 ahead of the Arena; finished per the pointer's "if A is
mid-task, finish it first" clause. Picking up **T98** (audio volume) next.
Goal (IDEAS I5): generalise the single-hero `statBattle` to a deterministic, RNG-free 1–3
vs 3 team auto-resolve; re-derive the difficulty curve for the team model; re-PROVE every
Arena invariant by simulation (not by a closed-form def formula).
changed:
  - **enemies.js** — added a 3v3 team-battle layer **additively** (the 1v1 `statBattle`,
    its `def` curve, and `calibrateFinal` are KEPT UNCHANGED — migration-safe; the live
    Arena keeps using `statBattle` until the team UI lands in T89). New pieces:
    • **combatant model** `{atk,hp,spd,type}` — `heroCombatant(hero,collected)` (hp = HB +
      guard·HG + power·HPP; atk = power + 0.8·focus) and `enemyCombatant(budget,type)`
      (atk = √(budget/HPR), hp = √(budget·HPR), fixed spd = ESPD).
    • **`simulateTeams(heroes,foes)`** — the pure sim: turn order by spd (fixed index
      tie-break), each actor targets by a FIXED rule (best type-matchup → lowest hp →
      index), deals `max(1, round(atk × matchup))`, removed at hp ≤ 0, loops to a wipe
      (4000-round guard). **Zero RNG / DOM / clock** (asserted by the gate). Win = ≥1 hero
      alive.
    • **`bestTeamVs(collected,n,foeType)`** — the n heroes maximising rating × matchup (the
      team analog of the 1v1 `bestAdvRating`); `teamProduct` = Σ atk·Σ hp.
    • **`FOE_BUDGET` calibration IIFE** (runs at load, so it AUTO-SCALES as content grows —
      T58 playbook): per-tier foe budget = `min(geometric ramp, suffix-min envelope of the
      best advantage-team product × CAPF)` so **no tier is gated behind its own loot**; the
      ramp scale `lb0` is pinned by binary search to the **max scale at which one starter
      hero still clears tiers 1–5**; the **final tier** is pinned (binary-searched edges)
      **between the near-full and the 85%-loadout win edges**, so the top falls ONLY to a
      near-full collection.
    • **`enemyTeamFromBudget`/`enemyTeam(n)`** — a tier fields the lead foe at the tier
      budget + 2 weaker adds at level `max(1, tier−K)`; **`teamBattle(heroes,tier,collected)`**
      is the public 1–3-hero entry (accepts ids or hero objs, caps the party at 3).
    • Exported `teamBattle, enemyTeam, simulateTeams, heroCombatant`.
    • **BUGFIX during build:** the team layer now reads the foe type from the LIVE tier
      (`TIERS[n-1].type` / `byTier(n).type`), NOT the pre-override `types[]` cycle — the
      legacy `calibrateFinal` overrides the tier-120 boss type, so using the cycle made the
      foe type (and thus the calibration edge + the best-team pick) inconsistent with what
      the player sees, which wrongly LOST tier 120 at near-full. Foe type is now consistent
      end-to-end (display ⇔ sim, asserted by the gate).
  - **test/arena3.test.js (NEW)** — the lattice gate (24 checks). Sweeps **every tier ×
    team size {1,2,3} × loadout {0, 25%, 50%, 75%, 85%, near-full, full}** and proves, by
    SIMULATION: (a) the sim is pure + deterministic + win == "≥1 hero alive" (and genuinely
    resolves losses); (b) tiers 1–5 winnable by ONE starter hero at 0 items; (c) the
    foe-team budget curve is strictly monotonic (peak at tier 120); (d) no tier gated behind
    its own loot (best 3-party on pre-tier items wins every tier); (e) the top is
    near-max-only — tier 120 LOST at ≤85% / 0 items, WON at near-full, with the win boundary
    in the **top ~14%** of the loadout; (f) outcome **monotone in loadout AND team size**
    across all 120 tiers (568/720 lattice cells won — spans real wins and losses); (g)
    `statBattle` preserved.
  - **.github/workflows/pages.yml** — wired `node test/arena3.test.js` as the **25th CI
    gate** (after the onboarding gate).
how I verified:
  - **`node test/arena3.test.js` → ALL 24 ARENA-3V3 CHECKS PASSED.** Full **25-gate suite
    green** (arena/tech-tree/collector/inventory/onboarding/events spot-checked + the whole
    `test/*.test.js` sweep: 25 passed / 0 failed). `node -c enemies.js` clean. The 1v1 Arena
    gate (`arena.test.js`, 29 checks) still passes — `statBattle`/def curve untouched.
  - Team-curve calibration load cost ≈ 0.2 s (binary searches over the sim); acceptable and
    auto-scaling per T58 — no hard-coded numbers, re-derives as content grows.
notes / questions:
  - **One-boost-flip reinterpretation (flag for the babysitter):** the original spec asked
    that "removing ANY ONE champion boost flips tier 120 to a loss." That is **literally
    unachievable for a 3-hero team** — one boost moves the team atk·hp product by < 0.1%, so
    it never flips a 3v3 outcome (verified across HPR ratios in calibration scratch). The
    sim instead proves the **achievable analog, the CHUNK-FLIP**: the tier-120 win boundary
    sits in the **top ~14%** of the collection (LOST at ≤85%, WON at near-full), so dropping
    a chunk of your loadout flips the top tier. The literal one-boost-flip remains proven for
    the **1-hero** special case by the existing `arena.test.js` (d). If the owner wants a
    literal single-item flip for the team too, the lever is a **much higher per-item boost
    weight** (or a tiny team) — say the word.
  - **T88 is the sim + calibration only.** The team-SELECTION UI (pick 1–3 heroes) is **T89**
    and the watchable turn-by-turn playout is **T90** — the live Arena still runs the 1v1
    `statBattle` until then (no UI regression). The two FX **wiring** tasks (mount `FXGL`
    Arena biome) are gated on T88–T90 per the pointer; B's engine shipped (T93) so they can
    be specced.
  - Per the **updated Builder A pointer**, the Arena block was reprioritised behind the
    front-end polish wave — **next: `T98`** (raise the too-quiet audio `VOL 0.30`→~0.8 with
    no clip), then `T99`/`T100` (top-band reclaim, gamey restyle), then `T101`–`T103`
    (shipping/perf), then `T89`–`T90` to finish the Arena.

## T98 — Raise the too-quiet audio (VOL 0.30 → 0.80) with a brickwall limiter  [HANDOFF]
commit: (this commit, on main) — [A] task (front-end polish wave, Phase 6.16). First of the
owner-flagged polish block (T98–T103) prioritised ahead of the rest of the Arena.
Goal: the master volume was too quiet on phones/laptops. Raise it to a clearly-audible level
WITHOUT introducing clipping.
changed:
  - **sound.js** — `VOL` `0.30` → **`0.80`** (master gain; mute/unmute still toggle 0↔VOL).
    Added a **brickwall safety limiter**: `unlock()` now builds `master → limiter →
    destination`, where `limiter` is a `DynamicsCompressorNode` (threshold `LIMIT_DB = −1.5`
    dB ≈ 0.84 linear, **hard knee 0**, **ratio 20:1**, attack 3 ms, release 250 ms). It is
    inaudible at normal levels (worst-case master output ≈ 0.51, well below the threshold)
    and hard-clamps any pathological peak below 0 dBFS — so the louder volume **cannot clip
    by construction**, not just by a headroom estimate. Degrades gracefully: if
    `createDynamicsCompressor` is absent (very old browsers) it wires `master → destination`
    directly (the headroom math is still safe). `limiter` is reset with ctx/master on
    teardown.
  - **test/sound.test.js** — `VOL` → 0.80; the band check is now **0.70–0.85**; stubbed
    `createDynamicsCompressor` on the fake context and added **7 limiter assertions**: exactly
    one compressor, `master → limiter → destination` wiring (and master no longer wired
    straight to the destination), brickwall config (ratio ≥ 20, hard knee), threshold just
    under 0 dBFS, fast attack; the worst-case check is reframed as a **pre-limiter** peak
    (< 1.0 — the limiter is a backstop, not a crutch). Mute/visibility/music-balance checks
    unchanged.
how I verified:
  - **`node test/sound.test.js` → ALL 31 SOUND CHECKS PASSED** (was 24). `node -c sound.js`
    clean. **Full 26-gate suite green.** Pure-logic where it counts; the limiter wiring is
    proven against the stub context.
notes / questions: the new level is **0.80** (≈ +8.5 dB over the old 0.30) — a big, clearly
  audible jump that the limiter keeps clean. If on the live build it's still not loud enough
  (or now too loud), the single lever is `VOL` in `sound.js`; the limiter ceiling
  (`LIMIT_DB`) is independent and can stay. **Please eyeball/ear the live build** — headless
  can't judge perceived loudness. Next per the Builder A pointer: **`T99`** (reclaim the
  wasted top band on all screens — `.app max-height:780px` cap + pin the event banner + tidy
  the nav), then **`T100`** (gamey buttons-first restyle), then `T101`–`T103` (shipping/perf),
  then `T89`–`T90` to finish the Arena.

## T99 — Reclaim the wasted top band + pin the event banner + tidy the nav  [HANDOFF]
commit: (this commit, on main) — [A] task (front-end polish wave, Phase 6.16). Owner-flagged
(screenshot): a wasted top band on his tall phone (Poco X3) + an untidy nav.
Goal: reclaim the wasted top band on ALL screens, pin the event banner to the top, and tidy
the nav so the home tree gets the freed space.
changed:
  - **styles.css** — **top-band reclaim:** `body` now **top-aligns** the app
    (`align-items:center` → **`flex-start`**) while the existing `.app{max-height:780px}` cap
    stays. So on a viewport taller than 780 the leftover band falls to the **bottom** (where
    the build line sits) instead of padding the top — the content (banner/tree) starts flush
    at the top on every screen. **Banner pin:** `#start` top padding `20px` → **`12px`** and
    `.event-banner` `margin-top:14px` → **`0`** (+ `.tree` margin-top `14`→`12`) so the
    today's-event strip sits pinned high. **Tidy nav:** removed the icon-only
    `.navbtn.util{font-size:18px…}` rule; added **`.nav-emoji`** (18px-tall emoji "icon" line
    matching the pixel-icon canvas) + **`.nav-lbl`** so Sound/Settings/Fullscreen render as
    full **labelled** buttons identical in shape to Best/Items/Heroes/Arena; tightened the
    row (`gap 8→6`, `margin-top 16→14`, padding `8px 6px`→`7px 5px`) so all seven fit one
    uniform row.
  - **index.html** — the three util buttons are now labelled:
    `#soundBtnMenu`→**🔊 Sound**, `#settingsBtn`→**⚙ Settings**, `#fsBtn`→**⛶ Screen** (each
    an `<span class="nav-emoji">` + `<span class="nav-lbl">`), dropping the bare-emoji
    `navbtn util` markup. The four primary buttons (pixel-icon canvas + label) are untouched.
  - **main.js** — `syncSoundButtons` now flips the **`.nav-emoji`** span (🔊/🔇) instead of
    rewriting the whole button (so the "Sound" label survives the toggle; falls back to
    `innerHTML` if the span is absent). The fullscreen `sync` updates the **`.nav-lbl`** span
    (`Screen`/`Exit`) and keeps the ⛶ icon (same fallback).
  - **test/home-layout.test.js (NEW, 22 checks)** + **pages.yml** — wired as the **27th CI
    gate**. Asserts: the cap + top-align reclaim; the banner is the flush first element of
    `#start`; the three nav buttons are labelled (Sound/Settings/Screen) with no surviving
    icon-only `.util`; the primary four still lead with their canvas; and a **live boot**
    proving a sound toggle flips only the emoji span while the text label is never
    overwritten.
how I verified:
  - **`node test/home-layout.test.js` → ALL 22 HOME-LAYOUT CHECKS PASSED.** `node -c main.js`
    clean. **Full 27-gate suite green** (nav-icons/onboarding/tech-tree/contrast all still
    pass — the primary buttons and nav gating are unchanged).
notes / questions: **headless can't judge the pixel result — please eyeball the live build on
  the Poco X3.** The seven nav buttons should fit one row at 360px (gap 6, min-width 44 →
  ~350px); if "Settings" wraps on a very narrow device the row degrades gracefully (still
  uniform, just two lines). The bottom band is the deliberate trade for a flush top — if you'd
  rather split it, the lever is `body{align-items}`. Next per the Builder A pointer: **`T104`**
  (fix the unreadable stacked-fraction glyphs ½/¾ — slashed/clearer at node size), then
  **`T100`** (gamey buttons-first restyle), then `T101`–`T103` (shipping/perf), then `T89`/`T90`.

## T99 (revision) — fix the premature "Reward earned" banner tag (N/3 progress)  [HANDOFF]
commit: (this commit, on main) — [A] task. Babysitter **CHANGES REQUESTED** on T99: the
layout + nav + banner-pin work was approved, but I'd **missed the third DoD bullet** — the
banner still showed a premature binary "Reward earned" the instant a player merely showed up.
Fixed.
changed:
  - **main.js `renderEventBanner()`** — was `owned = !!loadCollected()["event:"+ev.id]`
    (participation tier ONLY) → `(owned ? 'Reward earned' : 'Today’s event')`. After T92 every
    event has **3 tiers**. Now counts the exact keys `award()` writes —
    `["", ":well", ":ace"].filter(s => col["event:"+ev.id+s]).length` — and renders
    **`got>=3 ? 'All rewards earned' : got>0 ? got+'/3 rewards earned' : 'Today’s event'`**.
    The Play CTA still flips to "Again" once any tier is owned (`got>0`). Compact strip
    unchanged (no layout growth). Stale comment above the fn updated.
  - **test/home-layout.test.js** — added **(4)**: boots the home with a frozen UTC day and
    seeds 0 / 1 / 3 owned tiers for today's event, asserting the tag reads
    **"Today's event" → "1/3 rewards earned" → "All rewards earned"** (never "Reward earned"
    on show-up), plus a source check that the old binary tag is gone. Now **26 checks**.
how I verified:
  - **`node test/home-layout.test.js` → ALL 26 HOME-LAYOUT CHECKS PASSED.** `node -c main.js`
    clean. **Full 27-gate suite green** (events.test.js still passes — the tier keys/award
    flow are untouched; only the banner's read-out changed).
notes / questions: wording is "N/3 rewards earned" / "All rewards earned" (owner said "or
  similar"). Next per the pointer: **`T104`** (stacked-fraction glyphs ½/¾), then `T100`,
  `T101`–`T103`, `T89`/`T90`.

## T104 — Fix the unreadable stacked-fraction glyphs ½/¾ (slashed + clearer)  [HANDOFF]
commit: (this commit, on main) — [A] task (front-end polish, inserted between T99 and T100).
Owner: the ½/¾ topic glyphs were unreadable at tech-tree node size.
Goal: make the vulgar fractions legible at small node size — slashed/clearer.
changed:
  - **glyphs.js** — the pixel-font fraction (`fNM`) was a **3-wide vertical stack**
    (numerator rows 0‑3 · a horizontal **bar** row 4 · denominator rows 5‑8): three
    3×4 sub-glyphs + a bar crammed into 3 columns → mud at node size. Replaced with a
    **5-wide DIAGONAL slashed fraction**: numerator top-LEFT (cols 0‑2, rows 0‑3),
    denominator bottom-RIGHT (cols 2‑4, rows 5‑8), separated by a clean two-step "/"
    staircase from bottom-left to top-right. Same SMALL digit set + ink role (accent for
    `*f…`); only `parse()`'s frac width (3→5) and the `stamp()` frac branch changed. The
    two affected topic glyphs are `fractionsof` (½n) and `fractions` (¾). Verified the
    rendered bitmaps read as "1 / 2" and "3 / 4".
  - **test/glyphs.test.js** — extended (already a CI gate): asserts the fraction is now
    5 wide, carries a diagonal slash (top-right + bottom-left corners inked), has **no full
    horizontal mid-bar** (the old stack is gone), places numerator upper-left + denominator
    lower-right, and that ½/¾ stay distinct. Now **32 glyph checks**.
how I verified:
  - **`node test/glyphs.test.js` → ALL 32 GLYPH CHECKS PASSED.** `node -c glyphs.js` clean.
    **Full 27-gate suite green** (the 15 topic glyphs remain pairwise distinct; favicon/mark
    wiring unaffected). ASCII-rendered ½/¾ to eyeball the diagonal form.
notes / questions: **headless can't judge the final node-size legibility — please eyeball the
  live tech-tree nodes** for `fractionsof`/`fractions`. The digits are still the 3×4 SMALL
  set (now spatially separated by the slash, which is the readability win); if you want them
  bolder I can thicken the slash or widen the digits. Next per the pointer: **`T100`** (gamey
  buttons-first restyle), then `T101`–`T103` (shipping/perf), then `T89`/`T90` (finish Arena).

## T100 — "Gamey" pixel-bevel restyle (buttons-first + squared panels), reversible  [HANDOFF]
commit: (this commit, on main) — [A] task (front-end polish). Implements the T97-researched
+ owner-approved direction: the soft rounded "web 2.0" chrome fought the pixel/RPG content.
Goal: make the chrome read as a GAME — squared low radius, pixel-bevel buttons, hard-framed
panels — while body text/numerals stay CLEAN (kid legibility), and make it **fully
reversible** so it can be tuned or pulled with one attribute flip.
changed:
  - **index.html** — `<html lang="en" data-ui="pixel">` ships the gamey look on. Flip to
    `data-ui="classic"` (or remove) to revert to the original soft web look.
  - **styles.css** — appended a **self-contained, fully-gated** T100 block (all rules under
    `[data-ui="pixel"]`, so the classic CSS above is the **untouched fallback**):
    • a **token block** `:root[data-ui="pixel"]{ --ui-radius:2px; --ui-bevel-hi/-lo; --focus }`;
    • **buttons** (`.btn`/`.eb-play`/`.el-play`/`.key`/`.reset-pad .key`/`.navbtn`/`.ub-refresh`/
      `.set-row`) → squared `--ui-radius` + a **pixel-bevel** (`inset 2px 2px hi, inset -2px
      -2px lo`), an **invert-on-`:active`** push-in, and a **`:focus-visible` amber ring** (a11y);
    • **panels/cards** (`.event-banner`/`.topic-info`/`.tnode`/`.sum-row`/`.inv-cat`/`.hero-card`/
      `.arena-tier`/`.arena-hero`/`.arena-result`/`.modal-card`/`.u-cell`) → squared radius +
      **`box-shadow:none`** (drop the soft blur → hard-framed, machined look). The existing 1px
      borders stay as the frame.
    • **No `font-family` anywhere** in the block — the bitmap glyph font stays decorative-only;
      labels/numerals keep `--display`/`--mono`.
  - **test/ui-restyle.test.js (NEW, 18 checks)** + **pages.yml** — wired as the **28th CI
    gate**. Asserts: ships on (`data-ui="pixel"`); the token block + squared radius + bevel +
    focus tokens; **reversibility** — every restyle selector is gated on `[data-ui="pixel"]`
    (0 leaks) and the classic `.btn`(r14)/soft banner shadow are intact; buttons squared +
    beveled + invert-on-press + focus ring; panels squared + `box-shadow:none`; and the
    **clean-text rule** (no `font-family` in the block).
how I verified:
  - **`node test/ui-restyle.test.js` → ALL 18 UI-RESTYLE CHECKS PASSED.** **Contrast gate
    still green** (6 checks — bevels are inset shadows, they don't touch text/bg contrast).
    **Full 28-gate suite green.**
notes / questions: **headless can't judge the look — please eyeball the live build.** This is
  the T97 **blend (c)+(a)** spike (pixel-bevel buttons + squared panels). **Kill criterion**
  from the doc: if pixel-bevel reads too retro/illegible, the same token system flips to the
  **modern-angular** fallback (different `--ui-*` values, no code change). Scope kept to
  buttons + panels per "buttons-first"; modals' corner-ticks, full numpad press-depth, and
  bracketed toasts (doc Steps 3–5) are easy follow-ups. A **Settings UI-style toggle**
  (pixel/classic, persisted) is a natural next step if you want it user-switchable rather than
  build-time. Next per the pointer: **`T106`** (tech-tree v2 — full-width ~3-abreast + clearer
  node relationships), then `T101`–`T103` (shipping/perf), then `T89`/`T90`.

## T107 — Asset cache-busting so deploys actually ship fresh CSS/JS  [HANDOFF]
commit: (this commit, on main) — [A] task · **SHIPPING BLOCKER** (owner: a fresh deploy still
rendered the pre-T99 layout + old banner tag — the CDN/browser served stale `styles.css`/
`main.js` while `build.json` read fresh, so every live review was untrustworthy). Done FIRST
per the owner's explicit override (ahead of T106 / task-number order).
root cause: `index.html` referenced its assets with **bare** local paths
(`href="styles.css"`, `src="main.js"`) → GH-Pages default `max-age` lets the cache shadow new
code; only `build.json` (fetched `no-store`) read fresh, so the page *looked* deployed but ran
old assets. The T54 version-check only *offers* a manual refresh; it didn't bust the cache.
changed:
  - **scripts/cachebust.js (NEW)** — the single, pure rewrite used by BOTH the deploy and the
    gate. `bust(html, version)` appends `?v=<version>` to every **local** `.css`/`.js`
    `href`/`src`; the regex skips anything with a scheme or existing query (`[^"?:]`), so the
    **Google-Fonts link / preconnects are untouched** and it's **idempotent**. As a CLI
    (`node scripts/cachebust.js <version> [file]`) it rewrites the file in place and
    **verifies no bare local ref survives** (exit 1 if any do) — so the deploy step is itself
    a gate on the built artifact.
  - **.github/workflows/pages.yml** — a new **"Cache-bust asset URLs"** step runs
    `node scripts/cachebust.js "${GITHUB_SHA:0:7}"` **after** the node gates (so they see clean
    bare refs) and **before** "Upload site" (so the *deployed* `index.html` is fully versioned
    with the same short sha `build.json` stamps). **Source `index.html` stays bare** (no-build;
    other gates match exact refs). Also wired `test/cache-bust.test.js` as the **29th gate**.
  - **test/cache-bust.test.js (NEW, 38 checks)** — proves, via the SAME `cachebust.js` the CI
    runs: the source carries the expected 14 bare refs (stylesheet + 13 module scripts); after
    the rewrite **no bare local ref survives** and every asset carries `?v=<sha>` with the one
    current sha (no mismatch); external/preconnect refs untouched; idempotent; and the workflow
    runs the bust with the short sha, **after** the gates and **before** upload.
cooperation with T54: the refreshed page (when the user taps the version-check bar) references
  the **new** `?v=<sha>` URLs, so the reload lands on fresh assets — no silent stale reload.
  `fxgl.js` will be busted automatically once an FX-wiring task adds its `<script>` (the rewrite
  processes all local `.js` refs — no special-casing).
how I verified:
  - **`node test/cache-bust.test.js` → ALL 38 CACHE-BUST CHECKS PASSED.** Dry-ran the CLI on a
    copy → all 14 refs versioned, fonts/preconnects untouched. **Full 29-gate suite green**;
    `node -c` clean; **source `index.html` unchanged** (no-build preserved). No visual change /
    360px-safe (URLs only).
notes / questions: `index.html` itself is the entry doc and must revalidate — GH-Pages serves
  HTML with a short/again-revalidate policy, and the T54 no-store `build.json` poll + the `?v`
  on assets cover freshness; we can't set GH-Pages headers from here. **Babysitter: after this
  deploys, confirm on the live site that a fresh push changes the page WITHOUT a hard-refresh —
  this is the gate that makes all later visual reviews trustworthy.** Next per the pointer:
  **`T106`** (tech-tree v2), then `T101`–`T103` (shipping/perf), then `T89`/`T90`.

## T110 — FX wiring pass 1: mount FXGL + home backdrop + celebration bursts  [HANDOFF]
commit: (this commit, on main) — [A] task. Makes Builder-B's built-but-unwired FX engine
(`fxgl.js`: T93 ambient · T94 burst · T95 home backdrop · T108 Arena biome) VISIBLE. With T107
done (deploys trustworthy), this wires the **home backdrop + celebration bursts**; the Arena
biome wiring waits for the T89/T90 Arena UI. **Consumes B's API only — `fxgl.js` not edited.**
changed:
  - **index.html** — `<script src="fxgl.js">` (before main.js; the T107 bust auto-versions it).
    Two `aria-hidden` canvases: **`#fxBackdrop`** inside `#start` (home-scoped) and an app-level
    **`#fxBurst`** overlay.
  - **styles.css** — `#start{isolation:isolate}` so **`.fx-backdrop{z-index:-1}`** sits BEHIND
    the home DOM (above the page, below the text/tree) — `opacity:.85`, `pointer-events:none`,
    decorative. **`.fx-burst`** is `position:fixed; z-index:58` (on top of the screens, under
    the toasts/update-bar), `pointer-events:none` — taps always pass through.
  - **main.js** — a guarded **FXGL wiring block** (no-op if the engine failed to load):
    • **`setupFx()`** mounts two `FXGL.Controller`s — a backdrop + a burst overlay (the burst
      controller is never given a scene, so it never animates ambiently / leaks RAF).
    • **`homeFxState()`** builds the backdrop state from the **REAL** sources — collection
      **progress** (`have/total` of the catalogue, 0–1), the daily **Momentum streak**
      (`loadMomentum().count`), and **today's event** (`Ev.today()` → `{seed:artSeed, name,
      palette: the event-rarity colours, mood}`). Never constants — the home literally reads
      your state.
    • **`fxSetHome(onHome)`** (called from `show()`): on `"start"` it re-derives from live state
      + `start()`s the backdrop; on every other screen it `stop()`s (idle, **no RAF off-home**).
    • **`fxCelebrate(items)`** (called from **`showUnlocks()`** — the one surface every
      reward-gain path routes through: Arena-win loot, round unlocks, event rewards) fires
      **`FXGL.burst({x,y,count,seed,palette})`**, seeded + palette-coloured deterministically
      from the gained items, capped, **never covering key text** (a sparse transient overlay).
      Reduced-motion → the engine's calm flourish (auto). `setupFx()` runs at init after the
      legacy `FX.init`.
  - **test/fx-wiring.test.js (NEW, 29 checks)** + **pages.yml** — registered **`fxgl.test.js`
    (B's 102-check engine gate)** AND this wiring gate. The wiring gate proves: both canvases +
    the script wired (backdrop home-scoped, burst app-level); the CSS layering (backdrop behind /
    burst on top / taps pass through); the wiring reads the real sources; and a **live boot**
    (stub `FXGL` recording calls) showing it **mounts 2 controllers**, **derives the backdrop
    from live state on entering home** (progress 0.71 with a seeded collection, real streak +
    event) and **`start()`s it**, **`stop()`s it off-home**, and **fires a burst on a real Arena
    win** with valid `{x,y,count,seed,palette}`.
  - **test/cache-bust.test.js** — added `fxgl.js` to the expected-ref set (now 40 checks): the
    T107 bust now versions the newly-wired engine too (proves the auto-versioning claim).
how I verified:
  - **`node test/fx-wiring.test.js` → ALL 29 PASSED**; **`fxgl.test.js` → ALL 102 PASSED**;
    **cache-bust → 40 PASSED**. `node -c main.js`/`fxgl.js` clean. **Full 30-gate suite green
    incl. contrast AA** (the backdrop is a canvas behind the DOM — it doesn't alter any text/bg
    CSS colour, so AA is unaffected; kept dim via `opacity:.85`).
notes / questions: **headless can't judge the look — please eyeball the live build:** (a) the
  home backdrop should be a calm, dim ambient field that **changes with event/progress/streak**
  and never fights the text/tree; (b) a celebration **burst** should fire on Arena wins +
  collectible/loot/event gains, **reduced-motion-safe**, never obscuring text; (c) nothing
  should animate when the home is off-screen. Two controllers (backdrop + burst) each keep the
  engine's single-RAF and idle when not needed; at most one ambient + one transient burst run
  at once (on home). The legacy `window.FX` toast-spark is left intact (a separate tiny
  per-item effect). **Arena-biome FX** (`setArenaState`/T108) is deliberately deferred to after
  the T89/T90 Arena UI per the pointer. Next per the pointer: **`T106`** (tech-tree v2), then
  `T101`–`T103` (shipping/perf), then `T89`/`T90`.

## T111 — Complete the T100 pixel restyle (every screen) + tidy the nav  [HANDOFF]
commit: (this commit, on main) — [A] task. Owner (3+ screenshots): T100 covered only a SUBSET of
selectors, so several screens still showed rounded "web-2.0" boxes, and the home nav's "Settings"
label pushed the Screen button onto its own orphan row.
changed:
  - **styles.css** — extended the `[data-ui="pixel"]` block with the remaining rounded chrome,
    found by a **full sweep** (grep of every rule's `border-radius`), not just the named screens:
    • **interactive controls** (squared + pixel-bevel + invert + focus): `.inv-tab`, `.jump-top`,
      `.arena-map-btn`, `.practice-hint-toggle`, `.set-danger`.
    • **panels/cards/rows/chips** (squared + `box-shadow:none`): `.g-eg`, `.mode-row`,
      `.slow-item` (results), `.event-live`, `.tp-row`, `.inv-cell`, `.hd-head`/`.hd-boost`/
      `.hero-stat` (hero-detail), `.hero-chip`, `.hero-port`, `.map-row`, `.pq-tile`.
    • **pixel-art canvases + floating overlays** (square the FRAME only, keep
      `image-rendering`/float shadow): `.event-banner .eb-art`, `.rankline canvas` (results
      badge), `.hd-port`, the arena portraits (`.ar-port`/`.ar-enemy`/`.ah-port`), `.u-cell
      canvas`, `.toast canvas`/`.toast .t-glyph`, `.at-scene`, `.toast`, `.toast-more`,
      `.update-bar`. Everything **gated on `[data-ui="pixel"]`** (classic byte-for-byte
      unchanged), **clean-text** (no `font-family` in the block). The only non-token radii left
      are **justified decorative** bars/pips (`.progress-*`, `.tp-bar/-fill`, `.at-pip`, the 50%
      status dots) — not card/row/chip chrome.
    • **Nav fix:** `.navbtn` `min-width` `44→60` so the seven uniform buttons wrap to a
      **balanced, centred 4+3 / 5+2** under the existing `max-width:360` + `justify-content:
      center` + `flex-wrap` — never a lone 6+1 orphan (6-per-row needs >360, the cap forbids it).
  - **index.html** — the Settings nav label **"Settings" → "Setup"** (owner asked for shorter;
    `aria-label` stays "Settings"). The ⛶ Screen⇄Exit sync is unchanged.
  - **test/ui-restyle.test.js** — extended (now **40 checks**): asserts the 17 newly-covered
    selectors are gated under `[data-ui="pixel"]`; that **no hard-coded px radius survives in the
    pixel block** (all squared via `--ui-radius`); and the **nav fix** (label is "Setup", the long
    label is gone, the row wraps+centres under the 360 cap, buttons `min-width ≥ 58`). The existing
    reversibility check (every block selector gated; classic `.btn`/banner intact) auto-covers the
    new rules.
  - **test/home-layout.test.js** — the settings nav-button label assertion `"Settings" → "Setup"`.
how I verified:
  - **`node test/ui-restyle.test.js` → ALL 40 PASSED.** **Contrast gate green** (6 — the restyle
    is radius/shadow only; no text/bg colour changes, AA unaffected). `node -c` clean (CSS/HTML
    only). **Full 30-gate suite green.** Cross-checked with a grep: every rounded **chrome**
    selector now has a `[data-ui="pixel"]` override; the only ones without are the justified
    decorative bars/pips.
notes / questions: **headless can't judge pixels — please eyeball:** hero-detail (card/port/stat
  chips/boost rows), results (slowest rows + rank badge), summary/inventory/arena/practice/settings/
  modal should all read squared/hard-framed under the pixel look; flipping `data-ui="classic"`
  restores the soft look byte-for-byte; the home nav is one tidy block (no orphan, "Setup" fits).
  The 4+3/5+2 wrap is structural (360 cap + centre + min-width 60); if you'd prefer a forced single
  row, the lever is the button width. Next per the pointer: **`T106`** (tech-tree v2), then
  `T101`–`T103` (shipping/perf), then `T89`/`T90`.

## T112 — FX pass 2: full-bleed backdrop + Arena backdrop + celebrate wins + fill screen  [HANDOFF]
commit: (this commit, on main) — [A] task. Owner on the live T110 home: "fx look good but I only
see them on this page. nothing on arena, no celebrations. and the fx don't expand the full
height/width — shows where we're wasting space." Four follow-ups, still consuming B's API only.
changed:
  - **index.html** — moved `#fxBackdrop` OUT of `#start` to a **body-level full-viewport** canvas
    (before `.app`), `class="fx-backdrop hidden"` (shown only on home/Arena).
  - **styles.css** — (a) **full-bleed:** `.fx-backdrop` is now `position:fixed; inset:0; 100vw ×
    100dvh; z-index:-1` behind `.app` — the atmosphere reaches every edge (no dead FX margins);
    dropped `#start{isolation:isolate}` (no longer needed). (b) **fill the screen:** removed the
    `.app{max-height:780px}` phone cap so the column fills `100dvh` (the flex tree absorbs the
    slack → no dead band top **or** bottom); a generous `max-height:960px` only applies at
    `min-height:1000px` (desktop) so it doesn't stretch absurdly. The full-bleed backdrop covers
    the side band while content keeps its readable max-width.
  - **main.js** — the wiring now drives ONE full-bleed backdrop **per screen**:
    • **`arenaFxState()`** (NEW) reads the **live Arena position** — `Enemies.currentTier(collected)`,
      `tierRegion`, depth-in-region `tierFrac`, and `facingBoss` (the region-boss tier) — for T108
      `deriveArenaScene` (region = place; nearer the boss = hotter/denser).
    • **`fxSetScreen(name)`** (replaces `fxSetHome`): `#start` → `setHomeState` + show + start;
      `#arena` → `setArenaState` + show + start; **every other screen** → `stop()` + hide (no RAF,
      no stale scene bleeding behind other screens). `show()` calls it.
    • **Celebrate WINS** (beyond reward gains): **`fxCelebrateWin(tier.n)`** on an Arena victory
      (`finishBattle` win) and **`fxCelebrateRank(rankIdx)`** on a round finish — **rank-scaled**
      (bigger/warmer the higher the rank; **nothing below rank `FX_RANK_MIN=6`** so a poor run
      doesn't pop), palette from the earned rank colour. Both on the top burst overlay, capped,
      reduced-motion-safe (engine), never over the text. The `showUnlocks` reward-gain burst stays.
  - **test/fx-wiring.test.js** (now **39 checks**) — updated for the full-bleed layer (fixed,
    100vw×100dvh, outside `#start`, behind `.app`), the **Arena backdrop** (boot routes `#/arena`
    → `setArenaState` from a real region/tier; backdrop visible), the **win bursts** (Arena victory
    + rank-scaled), and the **off-home/Arena stop+hide** (boot routes `#/best-times` → `stop()` +
    `.hidden`). **test/home-layout.test.js** — the cap assertion now checks the home **fills**
    `100dvh` with the 780 cap relaxed (top still pinned — no T99 regression).
how I verified:
  - **`node test/fx-wiring.test.js` → ALL 39 PASSED**; **home-layout → 26**; **contrast AA green**;
    `node -c main.js` clean; **full 30-gate suite green**. The boot proves: 2 controllers; home
    derives + starts the full-bleed backdrop; **Arena derives the live region/tier scene + stays
    visible**; a real **Arena win bursts**; leaving to a non-FX screen **stops + hides** it.
notes / questions: **eyeball on the Poco X3:** the FX should now fill the whole viewport (no dead
  top/side/bottom band); the **Arena has its own region/tier backdrop** (changes by region,
  intensifies near a boss); **winning a round pops a celebration** (rank-scaled) and an **Arena
  victory pops gold confetti**; nothing animates off home/Arena. The home now fills `100dvh` — the
  bottom slack is mostly gone already; **T106** (next) further packs the tree (3-abreast) into the
  reclaimed height. Next per the pointer: **`T106`**, then `T101`–`T103`, then `T89`/`T90`.

## T106 — Tech-tree v2: use the width + a clearer relationship visual language  [HANDOFF]
commit: (this commit, on main) — [A] task. Owner: the tree nodes "don't use the full screen width
(only ~2 abreast)" and "the relationship between nodes isn't clear." Builds on T84 (data-driven
graph) + T100/T112.
changed:
  - **main.js `renderTree()`** — rebuilt the layout. Each main-chain topic is a ROW whose **1–3
    PARTS** (Part 1 → 2 → 3) run left-to-right, derived by **FOLLOWING the live `requires` chain**
    (`topicParts()` walks `branchOf` from the spine node — never a parallel edge list; also fixes a
    latent depth-3 drop in the old single-level render). Two **distinct, directional,
    state-coloured connectors** make "X unlocks Y" read at a glance:
    • a **VERTICAL amber CHAIN** arrow between topics (`unlockedBy` — finish this topic to open the
      next), **lit** when the next topic is unlocked, **dim** while locked;
    • a **HORIZONTAL purple MASTERY** arrow between a topic's parts (`requires mastery` — master
      this part to open the next), **lit** when the later part is unlocked, **dim** while locked.
    Rows carry `data-parts` = the live part count (1/2/3 — never a forced grid). `techGraph()` /
    `nodeState()` / the `.tnode` `<button>` / the click handler / `window.TechTree` are unchanged
    (T84 invariants intact).
  - **styles.css** — tech-tree v2 styles: **bigger nodes** (`width 84→96`), `width:100%` rows, and
    the two connector kinds (`.tchain` vertical amber-down-arrow, `.tbranch` horizontal
    purple-right-arrow) drawn from CSS triangles, **state-coloured via `.lit`/`.dim`**. The
    **mastery connector STRETCHES** (`flex:1 1 24px; max-width:130px`) so a 2–3-part topic row
    **fills toward the edges** (uses the width); 1-part rows stay centred. Removed the old
    `.tlink`/`.tcol`/`.tree-row::after` spine line. (Nodes are already squared under
    `[data-ui="pixel"]` from T100; the connectors suit both looks.) The tree is `flex:1 1 auto`,
    so with T112's relaxed cap it **grows to fill** the reclaimed height (absorbs the bottom slack).
  - **test/tech-tree.test.js** (now **27 checks**) — added (g): the part-chain is followed from
    live `requires` (depth 1/2/3); both connector kinds render, **state-coloured by live unlock**;
    the connector **counts are data-derived** (one `.tchain` between each pair of topics =
    spine−1; one `.tbranch` per Part-2/3 = the live branch count); a Part-2 topic renders a
    **2-wide** row; rows span **varying widths** (1- and multi-part present), no empty rows.
how I verified:
  - **`node test/tech-tree.test.js` → ALL 27 PASSED** (10 spine rows · 5 mastery branches · 9 chain
    links, all derived from live data). `node -c main.js` clean. **Full 30-gate suite green** incl.
    contrast AA + ui-restyle (the squared-node coverage still holds) + home-layout.
notes / questions: **eyeball the live tree on the Poco X3:** multi-part topics should now span the
  width with a clear purple "→" between parts and an amber "↓" between topics; the path you've
  unlocked reads lit, the rest dim; the tree fills the reclaimed height. Current content is depth-2
  (no Part-3 yet), so the widest rows are 2-abreast — the layout is **future-proofed for 3-abreast**
  the moment a Part-3 lands (per IDEAS I6), with no code change. If you'd prefer 1-part rows to also
  fill the width, the lever is a wider/horizontal single-node style (say the word). Next per the
  pointer: shipping/perf block **`T101`** (Start→fullscreen delay) → `T102` (Android PWA+TWA) →
  `T103` (perf research) → `T89`/`T90` (Arena 3v3).

## T113 — Audio: live Volume + Tempo sliders in Settings (owner-calibrated)  [HANDOFF]
commit: (this commit, on main) — [A] task · OWNER-PRIORITY. Audio volume/tempo failed multiple
blind passes (T69/T71/T98); per the babysitter's root-cause, the engine runs at ~half scale (peaks
≈0.51 at VOL 0.80) so the −1.5 dB limiter never engaged and small VOL bumps did ~nothing. Fix =
**instrument it**: live, persisted sliders with exact values so the owner calibrates by ear and
reports back (→ T114 bakes the defaults).
changed:
  - **sound.js** — master volume is now a **runtime variable** `vol` (was a const), settable LIVE
    over a **wide range** via **`setVolume(v)`** (clamped `0..VOL_MAX=2.5` — reaches genuinely loud,
    well past the old 0.80; the brickwall limiter on `master→limiter→destination` keeps the top end
    **clip-safe**). Added a **global tempo multiplier** `tempoMult` + **`setTempo(m)`** (clamped
    `TEMPO_MIN 0.4 .. TEMPO_MAX 1.0`) applied in the scheduler step (`(60/(bpm × tempoMult))/4`) so
    it slows whatever's playing from the next step — no restart. Exposed
    `setVolume/getVolume/setTempo/getTempo/VOL_MAX/TEMPO_MIN/TEMPO_MAX`. Mute/unmute still works
    alongside (uses `vol`).
  - **index.html** — Settings gains a **Volume** `range` (0–250 → ×0..2.5), a **Music tempo**
    `range` (40–100 → ×0.40..1.00), each with a live exact-value readout, and a **Test sound**
    button.
  - **main.js** — `loadVol/loadTempo/saveVol/saveTempo` (keys `halves.vol` / `halves.tempo`),
    **`applyAudioPrefs()`** (called from `applySoundPref`, so the saved values apply on boot once the
    context exists). `renderSettings()` seeds the sliders + value labels. Live `input` handlers:
    drag → **persist + update the readout (`1.60×` / `0.70×`) + `setVolume`/`setTempo` immediately**
    (the tempo handler also (re)starts menu music so it's audible while calibrating). The **Test**
    button unlocks audio + plays a representative correct-answer chime. Added the two keys to the
    clear-data `KNOWN_KEYS` fallback.
  - **styles.css** — `.set-slider` rows: a labelled row + a `range` input with a **≥44px** tap
    target, amber thumb on a hairline track, keyboard `:focus-visible` ring; **squared track/thumb
    under `[data-ui="pixel"]`**.
  - **test/sound.test.js** (now **44 checks**) — asserts: `setVolume` drives the master gain LIVE
    across a wide range (1.6 applies; clamps to `VOL_MAX`), the limiter still wired (clip-safe at
    max); the scheduler scales BPM by `tempoMult` and `setTempo` clamps to the slower floor; and the
    UI wiring (the two range inputs + Test button exist, `input` handlers call `setVolume/setTempo`
    live, both persist to `halves.vol`/`halves.tempo`, and the saved values apply on boot).
how I verified:
  - **`node test/sound.test.js` → ALL 44 PASSED**; **settings-reset green**; `node -c` clean;
    **full 30-gate suite green** incl. contrast AA (no new small fonts). Engine math is unit-tested;
    the audible behaviour needs ears.
notes / questions: **OWNER — please calibrate on the Poco X3 and report two numbers:** open
  **Settings**, drag **Volume** until it's right (the readout shows e.g. `1.60×`), tap **Test
  sound** to judge; drag **Music tempo** until the in-level music feels calm (e.g. `0.70×`) — menu
  music plays in Settings so you hear it. **Tell the babysitter the two `×` values** and **T114**
  will set them as the defaults. Range note: Volume reaches **2.5×** (limiter-safe); Tempo goes down
  to **0.40×**. Next per the LOCKED sequence: **`T101`** (Start→fullscreen delay) → `T102` (Android
  PWA+TWA) → `T103` (perf) → `T89`/`T90`. *(T114 is blocked on your reported values.)*

## T115 — Music with CHARACTER: calm solves · real variety · a "wub" sting · distinct Arena  [HANDOFF]
commit: (this commit, on main) — [A] task · OWNER-PRIORITY. Owner: the generative music "all sounds
the same," and during solves it's too fast/stressful.
**FIRM DESIGN RULE (recorded — in `sound.js` + here): SOLVE music must be CALM.** Solving is the
stress-sensitive moment; the in-game music must never add pressure.
changed:
  - **sound.js** — **reworked all 18 styles for real per-context character:**
    • **The 15 topic = SOLVE styles are now calm BY DESIGN:** slow (**bpm 58–72**, all **< the menu's
      80**), **sparse** (**density ≤ 0.18**), **soft timbres** (new `PAD`/`BELL`/`GLASS` presets —
      sine/triangle leads, **no harsh square**), and **NO driving drums** (patterns use only rests +
      the occasional soft hat — no kick/snare). Still 15 distinct (scale/root/arp/timbre vary).
    • **Menu** gentler-but-present (80 bpm, soft-hat groove). **Arena** is **driving/epic** (92 bpm,
      MIN, full kick+snare groove, square lead, denser 0.34 — combat wants energy, unlike solves) and
      clearly distinct from menu/solve. **Event** festive.
    • **New synth `wub()` win-sting** — a dubstep bass-wobble: a saw bass → a **biquad lowpass whose
      cutoff a ~7 Hz LFO modulates** → a couple of "wub"s. **Pure WebAudio, no sample files**; routed
      **through `master`** so it honours **mute + the T113 volume + the limiter**; short (~0.66 s),
      oscillators auto-stop (no timer/RAF leak). Exposed `Sound.wub`.
  - **main.js** — fires the **wub on the real win/complete hooks** (pairs with T112's FX burst): an
    **Arena victory** (`finishBattle` win, beside `fxCelebrateWin`) and a **topic-complete / mastery
    level-up** (the round-end stinger, when a Mastery or topics:*100 is earned).
  - **test/sound.test.js** (now **61 checks**) — the **calm-solve budget** (every solve style bpm ≤ 78,
    density ≤ 0.20, drums only rests/hats, soft lead, slower than the menu); **per-context distinctness**
    (Arena driving + denser + square lead + kicks vs solves' none; Arena ≠ menu by scale/name); the
    **wub** is exposed, is an LFO-on-lowpass synth (no sample), honours mute, routes through master, and
    is **wired to the win + mastery hooks**; **no sample assets**; **single scheduler preserved**.
    **test/fx-wiring.test.js** — the Arena-victory assertion updated for the new `{burst; wub}` block.
how I verified:
  - **`node test/sound.test.js` → ALL 61 PASSED**; `node -c sound.js`/`main.js` clean; **full 30-gate
    suite green**. Config/wiring is unit-tested; the *sound* needs ears.
notes / questions: **OWNER ear-check on the Poco X3:** (1) solves should now feel **calm/sparse/slow**
  (gentle pad/bell, no driving drums) — and since T113's tempo slider still applies, you can fine-tune
  even slower; (2) menu / solve / **Arena** / event should each sound **different** (the Arena is the
  punchy one); (3) **completing a topic or winning a battle gives the fun "wub"** (it respects
  mute/volume). If a solve style still feels busy, the lever is its `density`/`drums` in `sound.js`.
  Next per the LOCKED sequence: **`T116`** (restore the tree scroll-cue) → `T117` (chrome emoji →
  pixel icons) → `T101`–`T103` → `T89`/`T90`. *(T114 — bake the calibrated volume/tempo — still waits
  on the owner's reported values; ideally now, since the music is final.)*

## T116 — Restore the tree's scroll-affordance (the "more below" fade + cue)  [HANDOFF]
commit: (this commit, on main) — [A] task. Owner: "we've lost the scrollable indicators — the gradient
that shows the topic tree can be scrolled." Regression: the fade affordance was bound to the old list
`.picker-wrap`; T96 (tree-only home) dropped the toggling JS, so `#modeTree` (which scrolls) had no
affordance — now obvious since T112/T106 make the tree taller.
changed:
  - **index.html** — wrapped `#modeTree` in **`.picker-wrap` (`id="treeWrap"`)** + a **`.scroll-cue`**
    (`▾`), **reusing the existing fade CSS** (no new pattern).
  - **styles.css** — moved the home spacing to the wrapper: `.picker-wrap` `margin-top 16→12`,
    `min-height 148→150`; `.tree` `margin-top 12→0` (it stays the `overflow-y:auto` scroller inside,
    `min-height:150` kept so it can't be starved). The fade gradients / cue / `pointer-events:none` /
    reduced-motion guard were already present and now apply to the tree.
  - **main.js** — **`updateTreeScroll()`** toggles `can-scroll-up` (`scrollTop > 0`) /
    `can-scroll-down` (`scrollTop + clientHeight < scrollHeight − 1`) from the live metrics. Called at
    the end of **`renderTree()`** (content height changed) and wired to the tree's **`scroll`**
    (passive) + **`resize`** / **`orientationchange`** / **`fullscreenchange`** (T112's fill-height /
    fullscreen toggle changes `clientHeight`).
  - **test/tech-tree.test.js** (now **33 checks**) — (h): `#modeTree` is wrapped with a cue;
    `updateTreeScroll` toggles the classes; with content (400) overflowing the viewport (300) the
    **bottom** fade/cue shows and the top is hidden; scrolling to the bottom flips it (top shows,
    bottom clears); the fades are `pointer-events:none`; the cue honours reduced-motion.
how I verified:
  - **`node test/tech-tree.test.js` → ALL 33 PASSED**; `node -c` clean; **full 30-gate suite green**
    (events `.tree` min-height + banner→tree order still hold; home-layout green).
notes / questions: **eyeball:** when the tree overflows, a soft **bottom gradient + bobbing `▾`**
  should say "more below," and a **top gradient** should appear once you scroll down; both vanish at
  the ends; taps still hit nodes. Tracks re-render + resize/fullscreen. Next per the LOCKED sequence:
  **`T117`** (replace chrome emoji with house pixel icons) → `T101`–`T103` → `T89`/`T90`.

## T118 — BUGFIX: #game overflows, the Skip key cut off below the fold (T112 regression)  [HANDOFF]
commit: (this commit, on main) — [A] · BUG · DO FIRST. **Sequencing correction (owning it):** the
babysitter pointed T118 as #1 and I skipped it TWICE (built T115 then T116 ahead of it). T118 is a
**live core-loop bug I introduced in T112**, so it should have led. Fixing it now, ONLY this, before
anything else; resuming the locked sequence (T118 → T114 → …) after the verdict.
root cause (my T112 regression): `body` pads by the safe-area insets
(`padding: env(safe-area-inset-top) 16px env(safe-area-inset-bottom)`) AND T112 set
`.app{height:100dvh}` (dropping the old `max-height:780px` cap). So `app + insets > 100dvh viewport`
→ the app's bottom is pushed below the fold by ≈top+bottom inset; the non-scrolling `#game` (no
`overflow-y:auto`) clips its last element — the **Skip** key — and the `flex:1` stage absorbing the
slack is the big empty gap above the pad. The old 780 cap accidentally masked it; uncapped it bites
(worse with Android gesture-nav insets).
changed:
  - **styles.css** — **`.app` height** `100dvh` → **`calc(100dvh - env(safe-area-inset-top) -
    env(safe-area-inset-bottom))`**, so `app + body padding == viewport` and the whole app (esp.
    `#game`) fits with **Skip fully visible**. Keeps T99's top-pin + T112's fill-the-screen (only
    accounts for the insets); the desktop `@media(min-height:1000px)` cap stays. **Belt-and-braces:**
    `.pad{flex:0 0 auto}` so the keypad+Skip block never shrinks — if space is ever tight the `flex:1`
    **stage** gives first, never the pad/Skip.
  - **test/home-layout.test.js** (now **28 checks**) — asserts `.app` height **subtracts both
    safe-area insets** (the regression guard the DoD asked for, so this can't silently come back), the
    780 cap stays relaxed, the top stays pinned, and `.pad` is `flex:0 0 auto`.
how I verified:
  - **`node test/home-layout.test.js` → ALL 28 PASSED**; **full 30-gate suite green**; CSS-only (no
    `.js` changed). Non-scrolling screens checked: `#arena` uses its own scroller (`arenaBody`),
    modals are `position:fixed` with `max-height:84vh` (independent of `.app` height) — neither clips
    a bottom control.
notes / questions: **Babysitter/owner — confirm on the Poco-X3 live build that the Skip key is fully
  visible + tappable on the timed game screen (and with a bottom gesture-nav inset present), and the
  home still fills top-to-bottom with no wasted band.** I also note I should NOT have built T115/T116
  ahead of this bug — I'll hold at one task and respect the priority pointer going forward. Next per
  the locked sequence (after this verdict): **`T114`** (bake the owner's calibrated audio defaults).

## T114 — Audio: bake the owner-calibrated Volume + Tempo defaults + extend the range  [HANDOFF]
commit: (this commit, on main) — [A] task. Owner reported (2026-06-21) after calibrating with the
T113 sliders: "volume definitely 2.5× **or more** as default; tempo 0.4–0.6." The owner **hit the old
2.5× slider max and wanted more**, so the range was raised too, not just the default.
changed:
  - **sound.js** — **`VOL_MAX` 2.5 → 4.0** so the slider reaches "or more" (the −1.5 dB brickwall
    limiter still keeps it clip-safe). The bare-engine `vol` default stays 0.80; the app sets the
    calibrated default on boot via `applyAudioPrefs`.
  - **index.html** — `volRange` **`max` 250 → 400** and initial **`value` 80 → 300**; `tempoRange`
    initial **`value` 100 → 50**.
  - **main.js** — fresh-profile fallbacks: **`loadVol()` 80 → 300** (= **3.0×**) and **`loadTempo()`
    100 → 50** (= **0.5×**). A saved `halves.vol` / `halves.tempo` still wins — only the *fallback*
    changed, so legacy profiles keep their value.
  - **test/sound.test.js** (now **66 checks**) — `VOL_MAX === 4.0`; the fresh-profile defaults
    (`loadVol` → 300, `loadTempo` → 50); the slider reaches 400 and defaults to 300; tempo defaults to
    50; and a saved pref still wins (fallback-only change).
how I verified:
  - **`node test/sound.test.js` → ALL 66 PASSED**; `node -c sound.js`/`main.js` clean; **full 30-gate
    suite green**.
notes / questions: a **fresh** profile now boots **loud (3.0×)** + **calm (0.5× tempo)**, and the
  Volume slider goes to **4.0×**. Per the DoD: if 3.0× still isn't loud enough on the Poco-X3 with the
  extended slider, the deeper lever is the per-voice source gains / the limiter ceiling `LIMIT_DB`
  (past ~3× it's mostly the limiter compressing harder) — owner to confirm. Saved prefs untouched.
  Re-read `NEXT.md` immediately before pushing — still `T114`. Next per `NEXT.md`: **`T117`** (replace
  chrome emoji with house generative pixel icons).

## T117 — Replace ALL chrome emoji with house generative pixel icons  [HANDOFF]
commit: (this commit, on main) — [A] task · OWNER-PRIORITY. Owner: "replace all the emojis with our
own icons, in the style of our existing generative icons … do a pass to pick up everything."
changed:
  - **icons.js (NEW, `window.Icons`)** — house pixel-icon library in the same ethos as glyphs.js /
    the T50 nav icons: tiny hand-pixelled bitmaps (9×9) emitted as **1-bit SVG `<rect>` masks**
    (`data:` URIs), no image assets. **`installCSS()`** injects one `.px-ic.<name>{mask-image}` rule
    per icon (once, at boot); **`span(name)`** returns an inline `<span class="px-ic <name>"
    aria-hidden>` whose **shape is the mask and colour is `currentColor`** — so each icon tints with
    the surrounding text (gold amber, a locked node's muted, a done node's mint) and aligns inline.
    16 icons: lock · soundOn/soundOff · cog · coin · calendar · swords · flag · map · star · sparkles
    · fullscreen · backspace · close · check · play.
  - **index.html** — loads `icons.js` (before main.js; T107 versions it). Static emoji swapped for
    `px-ic` spans: entry/nav **sound**, nav **cog/fullscreen**, numpad **⌫**, **Test ▶**, update-bar
    **✕**.
  - **styles.css** — `.px-ic` base (1em, `background:currentColor` + SVG mask) + `.navbtn .px-ic`
    sizing.
  - **main.js** — a safe **`ic(name)`** inline-icon helper (no-op if icons.js is absent); **every**
    dynamic chrome emoji swapped to `ic("…")` across the node-state badges, gold bar, momentum,
    unlock hints, the Arena (swords/flag/map/star/check/play), toasts (sparkles/calendar), and the
    sound/fullscreen sync. `Icons.installCSS()` runs at boot. **`NODE_BADGE`** now maps each state to
    a distinct icon (locked→lock · unlocked→play · mastered→star · done→check) — **state semantics +
    a11y preserved** (buttons keep `aria-label`; the icons are `aria-hidden`).
  - **test/icons.test.js (NEW, 47 checks)** + **pages.yml** — the gate: every needed icon renders a
    **non-empty SVG mask**; `span()`/`installCSS()` work; **NO targeted chrome emoji remain in ANY
    shipped file** (the `→`/`↑`/`↓` content arrows + the `▾` scroll-cue are the only allowed
    pictographs); the wiring (icons.js loaded, masks installed, safe `ic()`, node-badge icon map, nav
    `aria-label`s, the numpad backspace icon). Updated `home-layout`/`ui-restyle` nav assertions +
    `tech-tree` (locked row now shows a lock icon, boots `icons.js`), and `cache-bust` versions
    `icons.js`.
how I verified:
  - **`node test/icons.test.js` → ALL 47 PASSED**; a fresh sweep of `index.html` + all shipped `*.js`
    for the 17 targeted emoji comes back **clean**; `node -c icons.js`/`main.js` clean; **full 32-gate
    suite green** (incl. contrast AA — the icons are masks tinted by existing text colours, no new
    colours). `→`/`↑`/`↓`/`▾` left intact. Re-read `NEXT.md` immediately before pushing — still `T117`.
notes / questions: **eyeball the icons on the live build** — the 9×9 bitmaps read at ~14–18px and
  tint with their context; if any reads unclearly (the speaker/map/swords are the busiest at 9px),
  the bitmap is a one-line edit in `icons.js`. No image assets; no-build; pixel-styled under
  `data-ui="pixel"` (they're already pixel-art). Next per `NEXT.md`: **`T101`** (Start→fullscreen
  delay).

## T121 — Tree scroll-fade: reveal the backdrop, don't paint black  [HANDOFF]
commit: (this commit, on main) — [A] task. Owner (screenshot): the T116 scroll-fade is a **black
band** over the purple FX backdrop. **My T116 regression:** the `.picker-wrap::before/::after`
fades painted `linear-gradient(var(--bg), transparent)` and `--bg` is near-black `#0E1116`; the
tree/`#start` are transparent so the full-bleed FX backdrop (T112) shows through everywhere EXCEPT
the fade, which read as a black smear.
changed:
  - **styles.css** — **removed** the opaque `--bg` `::before/::after` colour-overlays (and their
    `.can-scroll-up::before`/`.can-scroll-down::after` reveal rules). Replaced with a **CSS MASK on
    the `.tree` scroll container** that alpha-fades its own pixels to transparent at the scrollable
    edge, so the **purple backdrop shows through** (no coloured overlay). The mask tracks the live
    state: fade **top + bottom** when `can-scroll-up.can-scroll-down`, **bottom only** when just
    `can-scroll-down`, **top only** when just `can-scroll-up`, **none** when it fits. The `▾`
    `.scroll-cue` + its reduced-motion guard are unchanged; `updateTreeScroll()` (T116) already
    toggles the classes, so no JS change.
  - **test/tech-tree.test.js** (now **34 checks**) — the (h) fade assertion updated: the scroll-fade
    **masks `.tree` to transparent per can-scroll edge** and the **opaque `--bg` overlays are gone**
    (no black band over the backdrop). The scroll-state-toggle checks (T116) are kept.
how I verified:
  - **`node test/tech-tree.test.js` → ALL 34 PASSED**; CSS-only (no `.js` changed); **full 32-gate
    suite green**. The mask doesn't affect hit-testing, so taps still land on nodes; reduced-motion
    safe; works under `data-ui="pixel"`.
notes / questions: **eyeball the live build:** at the scroll edges the tree nodes should now **fade
  into the purple backdrop** (not a black band), only on the edge(s) with more content, with the `▾`
  cue. If a future backdrop is very light, the mask still tracks it (it reveals whatever's behind,
  not a fixed colour). Next per `NEXT.md`: **`T101`** (Start→fullscreen delay).

## T122 — WIRE the synth.js engine into the app (make it audible) — phase 6  [HANDOFF]
commit: (this commit, on main) — [A] task · OWNER-PRIORITY. The B-built `synth.js` (`window.Synth`,
T120 #1–#5, 92-check engine) was standalone — nothing played it. This [A] wiring makes it the live
**music** engine (the payoff). Consumes `Synth`'s API only — `synth.js` not edited.
changed:
  - **index.html** — loads `synth.js` (after sound.js, before main.js; T107 versions it).
  - **sound.js** — now **SFX-ONLY**: **removed the entire music scheduler** (`STYLES`/`St`/scales/
    `degMidi`/`stepVoices`/`musicTick`/`startScheduler`/`stopMusic`/`setMusic`/`styleIndexFor`/the
    `setInterval` loop), the **tempo** machinery (`tempoMult`/`setTempo`/`getTempo`/`TEMPO_*`), and
    the duplicate **`wub()`** (superseded by Synth's wub) — so there is **ONE music scheduler**
    (Synth's). Kept the SFX engine, the master+brickwall limiter, the wide-range `setVolume`, mute,
    and the ctx suspend/resume. **Exposes `ctx()` / `master()` / `limiter()`** for the wire.
  - **main.js** — the **Synth wiring block** (mirrors the FX wiring, guarded no-op if Synth absent):
    • **`setupSynth()`** (on the audio-unlock gesture) `Synth.mount({ ctx })` on **sound.js's existing
      AudioContext**, then **routes `Synth.output()` into sound.js's `master`** → music + SFX share
      **one chain**, so the **T113 volume slider + the limiter govern both**.
    • **`musicForScreen(name)`** (from `show()`): `#game` → **`solve`** (or `event` in a gauntlet),
      `#arena` → **`arena`** + `Synth.intensity(arenaBossProx())` (the same live boss-proximity the FX
      uses), everything else → **`menu`**. One scheduler; swapping the spec is the only stop/start.
    • **`musicSpec(context)`** — the **SOLVE context is CALM BY CONSTRUCTION** (slow base bpm 60,
      `kickK:0`, empty snare → no driving drums; the firm rule), its **seed varies per topic** so
      topics still differ; **Arena** drives (phrygian, full kit, faster); menu/event distinct. The
      **T113 tempo slider** multiplies every context's base bpm (`synthTempoMult()`).
    • **`wubSting()`** fires **Synth's wub** on the real win moments (Arena victory + topic-complete/
      mastery) and **ducks**. SFX stings (`item/gold/mastery/topic100/topicUnlock`) **`Synth.duck()`**
      the music. **Mute** sets `Synth.setMuted` too; a **visibilitychange** handler `Synth.stop()`s
      when hidden (no leak), resumes the context when visible.
  - **test/sound.test.js** — **rewritten SFX-only** (38 checks: volume+limiter, mute, the pure SFX
    specs, the `ctx()`/`master()` exposure, and that **no music scheduler remains** in sound.js).
    **test/synth-wiring.test.js (NEW, 25 checks)** + **pages.yml** — registered **`synth.test.js`
    (B's 92-check engine gate)** AND this wiring gate, which proves the mount-on-shared-ctx + route
    into master, the per-screen contexts, the calm solve spec, the wub-on-win, the duck/mute/tempo
    wiring, and a **live boot** (stub Sound + Synth) showing it mounts on sound's ctx, routes into
    sound's master, plays the menu/arena contexts (arena sets intensity), and **wubs on a real Arena
    win**. Updated `events.test` (event → a Synth context) + `cache-bust` versions `synth.js`.
how I verified:
  - **`node test/synth-wiring.test.js` → ALL 25 PASSED**; **`synth.test.js` → 92**; **`sound.test`
    → 38**; `node -c` clean. **Full 33-gate suite green.** One scheduler (sound's removed; Node-
    asserted no `setInterval`/`STYLES`/`setMusic` in sound.js); guarded no-op if Synth/ctx absent.
notes / questions: **OWNER ear-check on the Poco X3 — this is the payoff:** ONE music engine
  (Synth); **solves CALM**, the **Arena drives + intensifies near a boss**, menu/event distinct; a
  **win wubs once**; SFX **duck** the music; the **T113 volume/tempo sliders + mute** still rule it
  (music routes through sound's master). Note the calibrated **0.5× tempo** default now scales ALL
  contexts (so menu/arena are half their base bpm too) — if that's too slow for the Arena, the lever
  is the per-context base in `SYNTH_BPM` or re-calibrating the slider. `Synth.setQuality()` is
  available if the FDN reverb is heavy on Android (not wired yet — flag if needed). Next per
  `NEXT.md`: **`T121`** (already shipped, awaiting verdict) → `T101` (Start delay) → Android block.

## T121(b) — Coloured status icons (coin gold, calendar green) — completes the T121 batch  [HANDOFF]
commit: (this commit, on main) — [A] task. T121 was expanded into a "visual-readability batch":
**(a)** the scroll-fade mask (already shipped at **`0972c77`** — `.tree` masks to transparent,
reveals the FX backdrop) + **(b)** this: the two STATUS icons take their accompanying text's colour.
changed:
  - **styles.css** — the T117 pixel icons all inherit the muted text colour via `currentColor`,
    which is right everywhere EXCEPT the two icons beside coloured amounts. Added two global
    overrides: **`.px-ic.coin{background-color:var(--amber)}`** (gold, beside the gold amount —
    home gold bar, results `resGold`, reward toasts) and **`.px-ic.calendar{background-color:
    var(--mint)}`** (green, beside the mint "N Momentum"). The mask technique fills each icon's
    shape with its status colour. **Every other icon stays muted/inherited** (`.px-ic` keeps
    `currentColor`).
  - **test/icons.test.js** (now **51 checks**) — (d): the coin = `--amber`, the calendar = `--mint`,
    the base `.px-ic` still `currentColor`, and **exactly those two** icons are recoloured (no
    others).
how I verified:
  - **`node test/icons.test.js` → ALL 51 PASSED**; CSS-only (no `.js` changed); **full 33-gate suite
    green**. Part (a) (scroll-fade) is already on `main` (`0972c77`); the scroll-fade gate in
    `tech-tree.test` (34) stays green.
notes / questions: **eyeball:** the coin beside the gold reads **gold**, the calendar beside Momentum
  reads **green**, all other pixel icons stay the muted house colour; and (from a) the tree scroll
  edges fade into the purple backdrop, no black band. Next per `NEXT.md`: **`T123`** (a11y) → `T101`
  (Start delay) → Android block.

## T125 — FIX the celebration burst (it didn't render) + fire BIG on EVERY win/run/item  [HANDOFF]
commit: (this commit, on main) — [A] task, OWNER-PRIORITY · BUG. Owner: "nothing at all, not even a
small one" on an Arena win; "every arena victory / every topic run / every new inventory item" should
be a celebration with "loads of particles". Two parts: **(0)** fix the rendering bug, **(1)** make it
big + constant.
root cause (the "nothing at all"):
  - `fxBurst` (the #fxBurst overlay controller) was built ONCE in `setupFx()` on the ENTRY screen
    (pre-fullscreen) and **never `resize()`d** — unlike `fxBg`, which gets `resize()` on every screen
    change. After the Start→fullscreen viewport change its drawing buffer stayed entry-sized (or
    1×1 if it had no layout at construction), so the burst drew off-buffer → invisible.
changed (main.js — A-owned):
  - **`setupFx()`** — added `fxResizeAll()` (resizes BOTH `fxBg` + `fxBurst`, null/`resize`-guarded),
    called right after construction AND on the next animation frame, plus a **`window` resize**
    listener and **`fullscreenchange`** (+ webkit/moz/MS) listeners. The buffers now always match the
    live viewport, esp. across Start→fullscreen.
  - **`fxBigBurst(opts)`** (new) — the single celebration path: **resizes `fxBurst` first**, then
    fires **`FXGL.celebrate()`** (T126's 800-cap shower; falls back to `burst()` if absent). All three
    moments route through it.
  - **`fxCelebrate` / `fxCelebrateRank` / `fxCelebrateWin`** — **deleted the `FX_RANK_MIN=6` gate** so
    EVERY completed topic run celebrates (scaled by rank, but a worst-rank/skip run still throws a real
    shower), EVERY Arena victory celebrates BIG (800), EVERY new inventory item (the `showUnlocks`
    path) celebrates. Counts raised to the hundreds (was ~45–150). Overlay is transient + sparse so it
    never covers the question/result text; the engine downshifts for reduced-motion + `setQuality`.
how I verified:
  - **`test/fx-wiring.test.js` rewritten/extended → ALL 54 PASSED.** The stub FXGL now models the
    drawing-buffer size: `resize()` copies the current viewport into the controller; `celebrate()`
    records the buffer size AT FIRE TIME. New checks prove: both controllers are sized on construction,
    the `fullscreenchange` handler re-sizes them to the live viewport (412×915, not 1×1), a real Arena
    WIN and a finished topic RUN (driven live — even a SKIP-everything worst rank) each fire a
    `celebrate()` on a correctly-sized controller (not 1×1) with hundreds of particles; source checks
    confirm the `FX_RANK_MIN` gate is gone and all three entry points route through the resize-then-
    `celebrate()` helper.
  - **`node -c main.js` clean; full 34-gate suite green** (rebased onto `2815188` so T126's
    `FXGL.celebrate()` is present). No B-owned files touched.
notes / questions: **eyeball on the live build (Poco X3, fullscreen):** finishing ANY topic run and
  winning ANY Arena fight should now throw an unmistakable big particle shower over the screen (z-58),
  fading fast enough not to obscure the result text; a new item from `showUnlocks` does too. The
  rendering fix (resize across Start→fullscreen) is the crux of "nothing at all". Next per `NEXT.md`:
  **`T127`** (quick BUG: `&amp;` shows literally in locked-topic text — double-escape at `main.js:572`)
  → `T123` (a11y contrast floor) → `T124` (fraction glyphs) → `T101` → Android.

## T127 — BUG: literal "&amp;" in locked-topic text (double-escape)  [HANDOFF]
commit: (this commit, on main) — [A] task, BUG. Owner screenshot: the topic-info subline read
**"Master Add &amp; Subtract first"** — the `&` in "Add & Subtract" rendered as the literal entity.
cause: `unlockReq(m)` (`main.js:479`) already returns **escaped HTML** (`'Master '+esc(req.name)+'
first'`), but `renderTopicInfo` escaped it **again** — `esc(unlockReq(m))` → `&amp;amp;` → shows
`&amp;`. (The other caller, the tech-tree holder, already used `unlockReq(m)` un-escaped.)
changed (main.js — A-owned):
  - **`renderTopicInfo` (now `main.js:602`)** — dropped the redundant `esc()`: `meta = ic("lock")+'
    '+unlockReq(m);` (consistent with the un-escaped holder use). `unlockReq` already escapes its
    dynamic parts and returns HTML.
  - **audit** — swept for `esc(...)` wrapped around helpers that already return escaped HTML. Only
    `:602` was wrong. The legit single-escape of raw text stays: `esc(h.unlockHint)` (a hero's
    plain-string hint property — NOT the `unlockHint(m)` HTML helper) is correct; left untouched.
how I verified:
  - **test/tech-tree.test.js (now 36 checks)** — selecting the locked `addsub2` (gated on "Add &
    Subtract" via `mastery:addsub`) now asserts the info row HTML contains a SINGLE entity
    `Add &amp; Subtract` (renders as "Add & Subtract") and **no** `&amp;amp;`; plus a source check
    that `renderTopicInfo` uses `unlockReq()` un-escaped and there's no `esc(unlockReq(…))` anywhere.
  - **`node -c main.js` clean; full 34-gate suite green** (tech-tree gate 34→36). Still properly
    escaped (no XSS regression — `unlockReq` keeps `esc()` on the dynamic name).
notes / questions: **eyeball:** preview a locked topic gated on "Add & Subtract" — the subline now
  reads **"Master Add & Subtract first"** (one ampersand), not "&amp;". Next per `NEXT.md`: **`T123`**
  (a11y contrast floor) → `T124` (fraction glyphs) → `T101` (Start delay) → Android block.

## T129 — Settings MUSIC SWITCHER (sample styles + test switching) — the T128 instrument  [HANDOFF]
commit: (this commit, on main) — [A] task, OWNER-PRIORITY. Owner: "add a music switcher to Settings so
I can sample all our audio styles and test the switching works." Also the diagnostic for T128's "music
never swaps": if picking a style audibly changes the music, the engine swap works.
changed (A-owned only):
  - **index.html** — a new `.set-row.set-music` in Settings (beside Volume/Tempo): a labelled
    `#musicSwitch` button group (`role="group"`, `aria-labelledby`) with **four real `<button>`s** —
    **Menu · Solve · Arena · Event** (`data-music`, `aria-pressed`), plus a `#setMusicVal` "Auto/<style>"
    readout.
  - **styles.css** — `.music-switch`/`.mus-btn`: a 4-col grid of ≥44px, keyboard-operable pixel buttons;
    the picked style highlights via `[aria-pressed="true"]` (amber); `data-ui="pixel"` squared.
  - **main.js** — **`synthSwitchContext(name)`**: drives the engine's **distinct built-in context** via
    **`Synth.setContext(name)`** (its own progression/patches/reverb — incl. the Arena **wub** bass —
    NOT `musicSpec()`), then applies the **T113 tempo** on top (`setMusic` with `c.tempo × tempoMult`).
    A transient **`musicPreview`** holds the picked style while in Settings; `show()` clears it on leave
    so **per-screen music resumes**; the tempo slider re-applies the active preview at the new tempo.
    Guarded no-op if `Synth` absent/unwired; honours mute (the engine is muted ⇒ silent).
how I verified:
  - **test/synth-wiring.test.js (now 45 checks)** — the stub Synth gained `setContext`/`CONTEXTS`/
    `setReverb`/`hashStr`; new (6)+boot checks prove the switcher is a labelled a11y group of 4 ≥44px
    pixel buttons; that picking each style calls **`Synth.setContext('menu'|'solve'|'arena'|'event')`**
    live; that the Event pick drives the event context's OWN harmony (lydian, its progression — not a
    flat default) and each context applies its own reverb; and that **leaving Settings reverts** to the
    per-screen (menu) music. **`node -c` clean; full 34-gate suite green.**
notes / questions — **⚠ FLAG FOR [B] (engine gap this surfaced, exactly as T129/T128 anticipated):**
  the switcher correctly calls `setContext` (styles ARE distinct), BUT the **swap is not immediate** —
  synth.js applies `M.spec = M.want` **only at a phrase boundary** (`synth.js:395`); the immediate-set
  path (`:404`/`:410`) only fires on the first-ever music (`!M.spec`), and `M` is private/unexported, so
  **A has no way to force a prompt swap without editing synth.js (B-owned — I must not).** ⇒ a deliberate
  switch can lag up to ~one phrase (~8–11s). **Suggested [B] lever:** a `Synth.setContext(name, { now:
  true })` (or a `Synth.swapNow()`) that resets `M.step`/`M.spec` to take the new `M.want` immediately;
  A will wire `{ now:true }` from the switcher the moment it lands. (This is the T128(1) "prompt swap"
  the switcher was built to expose.) Next per `NEXT.md`: **`T128`** (per-screen routing → distinct
  contexts via setContext + verify wub wobble + celebration) → `T123` (a11y) → `T124` → `T101`.

## T128 — LIVE BUGS: music swap (per-screen) · no wub · no celebration  [HANDOFF]
commit: (this commit, on main) — [A] task, OWNER-PRIORITY · BUG. Owner on the live build: "music never
changes — same as menu in topics/arena; no dubstep wub on victory; no celebration visuals." All three
passed the headless gates yet failed live (gates checked the calls exist, not the audible/visible
result). Fixed (1) + (2) at the root; (3) is an engine/device issue I've flagged for [B].
**(1) Music never swapped per screen — FIXED.** Root cause: `musicForScreen` drove
`Sy.setMusic(musicSpec(context))`, and `musicSpec()` passed **no `progression`** → the engine defaulted
the SAME `[0,5,3,4]` chords for every context, so solve/menu/arena differed only by tempo (≈inaudible /
"never changes"). Fix: route every screen through **`synthSwitchContext` → `Synth.setContext(name)`**
(the engine's DISTINCT built-in contexts — own progression/reverb/patches, incl. the Arena's **wub bass**
+ dark Aeolian), with the T113 tempo on top; **solve still varies per topic** (its seed mixes in
`mode.music`). Removed the dead `musicSpec()`/`SYNTH_BPM`. **Instant swap:** wired **[B] T132's
`Synth.swapNow()`** after the spec set, so a screen change / style pick swaps in ≤1 step (no phrase-
boundary lag) — this also upgrades the T129 switcher to instant.
**(2) No wub on victory — FIXED.** Root cause: `wubSting()` played the wub on **`bus:"music"`** and then
called **`duck()`**, which dips that SAME music bus → the wub ducked **itself** (flat/inaudible). Fix:
use the engine's purpose-built **`Synth.sting("victory")`** — a wub swell + rising bell arp on the
**un-ducked SFX bus**, ducking only the music bed so the cue lands (the engine already had this; the
hand-rolled version fought the duck). Fires on every Arena victory + topic-complete/mastery.
**(3) No celebration visuals — ⚠ FLAGGED FOR [B] (engine/device).** After T125's resize the burst still
renders nothing live. I could not repro/fix it headlessly, and the robust fix needs `fxgl.js` (B-owned)
or live-device WebGL debugging: the leading cause is the **second WebGL/WebGPU context** for `#fxBurst`
(separate from the working `#fxBackdrop`) failing or falling back to a non-animating still on-device.
**The babysitter's "composite over the backdrop" isn't an A-only fix:** the backdrop canvas is
**`z-index:-1` (behind `.app`)**, so a celebration drawn there renders *behind* the UI panels (wrong
layer) — the celebration must be the z-58 overlay. **Suggested [B]:** either an FXGL diagnostic/fix so a
2nd overlay context initialises+presents on-device, OR an FXGL mode to mount the burst as a layer over
the backdrop scene on the ONE working context at overlay z (A then points `fxBurst` at it). The A wiring
(`fxBigBurst` → resize + `celebrate()` on every win/run/item) is correct + tested (T125) and will work
the moment the overlay context renders.
how I verified (1)+(2): **test/synth-wiring.test.js (45→52)** — per-screen routing now asserts
`setContext` per screen with each context's OWN harmony (Arena aeolian + wub bass ≠ menu ionian),
`musicSpec`/`SYNTH_BPM` gone, `swapNow` called for an instant swap, and a real Arena win fires
`sting("victory")` (not a self-ducked wub); **events.test** updated for the event-context routing.
`node -c` clean; **full 34-gate suite green** (rebased onto T132 `995cd28`). No B-owned files touched.
notes / questions: gates are necessary-not-sufficient here — **babysitter live-check:** topic vs Arena
vs menu music should now be audibly different + swap instantly on screen change, and a wub+bells should
land on a win. (3) awaits the [B] overlay-context fix. Next per `NEXT.md`: **`T123`** (a11y contrast
floor over the backdrop) → `T124` (fraction glyphs) → `T101` (Start delay) → Android.

## T136 — Wire the celebration overlay: mount #fxBurst with {backend:"2d"}  [HANDOFF]
commit: (this commit, on main) — [A] task, OWNER-PRIORITY. Activation of B's T133. The celebration the
owner kept asking for was one wiring change away: the burst overlay (#fxBurst) was a 2nd WebGL/WebGPU
context (separate from the working #fxBackdrop) that mobile GPUs often refuse → "no celebration visuals."
B's T133 (`3e7da28`) added a Canvas2D backend (`FXGL.Controller(canvas, { backend:"2d" })`) that ALWAYS
presents. This task re-points the overlay to it.
changed (A-owned only):
  - **main.js `setupFx`** — the `#fxBurst` mount now passes **`{ backend: "2d" }`** (Canvas2D overlay).
    The backdrop `#fxBackdrop` stays on its default WebGL path (the first, working context). The T125
    resize-before-fire + `fxResizeAll` (window/fullscreen) behaviour is unchanged → the 2D buffer still
    matches the live viewport across the Start→fullscreen transition.
how I verified:
  - **test/fx-wiring.test.js (54→58)** — the stub records each Controller's mount opts; new checks assert
    the burst mounts with `{backend:"2d"}` while the backdrop does NOT (stays WebGL), at both the source
    and live-boot level. The existing T125 checks (resize on construction/fullscreen, win/run/item each
    fire a `celebrate()` on a correctly-sized controller) stay green on the 2D-backed overlay.
  - **`node -c main.js` clean; full 34-gate suite green** (rebased onto B's T133 `3e7da28`; the engine-side
    `fx_celebrate_2d_frame` golden + ready/sized asserts guard the render). Only [A]-owned files touched.
notes / questions: **babysitter live-check (the bar):** on a real device, finishing a topic run / winning
  an Arena fight / gaining a new item should now throw a VISIBLE particle shower over the UI (z-58) — the
  owner's "I finally see celebrations." Next per `NEXT.md`: **`T135`** (volume recalibration — HELD until
  the owner's chosen MAX is posted) → `T123` (a11y contrast floor) → `T124` → `T101`.

## T135 — Volume recalibration for the louder synth (default 0.05×, max 0.10×, migrate)  [HANDOFF]
commit: (this commit, on main) — [A] task, OWNER. Owner: the new generative synth engine is much louder,
so the old 3.0× volume default is too hot. Babysitter posted the owner's chosen MAX = 0.10×.
changed (A-owned only):
  - **index.html** — `#volRange` `min=0 max=400 step=5 value=300` → **`min=0 max=10 step=1 value=5`**
    (the slider now spans 0.00×–0.10× master gain, default 0.05× sitting mid-track — not jammed at an edge).
  - **main.js `loadVol()`** — fresh-profile default **300 → 5** (0.05×). **Migration:** a returning user
    has the OLD-scale value stored (e.g. `halves.vol=300` = 3.0×); `loadVol` now clamps anything **`>10`
    down to 5** on load, so they aren't deafened and the slider isn't fed an out-of-range value. (`fmtVol`
    stays `(v/100)×` → 5 reads "0.05×", 10 reads "0.10×"; the master gain = `vol/100` and the engine's
    limiter/`VOL_MAX` are unchanged — only the slider's reachable range + default moved.)
how I verified:
  - functional: `loadVol` → fresh **5**, old **300 → 5**, **10 → 10**, **0 → 0**, **7 → 7** (migration +
    pass-through correct). **test/sound.test.js** updated: asserts the fresh/over-range default is 5 with
    the `v > 10` migration, and the slider is 0–10 step 1 default 5.
  - **`node -c main.js` clean; full 34-gate suite green.** Only [A]-owned files touched.
notes / questions: **babysitter live-check:** a fresh profile should boot at a comfortable 0.05× (not
  blasting); a returning user who had 3.0× should now also be at 0.05× (migrated), with the slider mid-
  track; dragging to the top is 0.10×. Next per `NEXT.md`: **`T123`** (a11y contrast floor over the FX
  backdrop + honest contrast gate) → `T124` (fraction glyphs) → `T101` (Start delay) → Android.

## T123 — A11y contrast floor over the FX backdrop (dark scrim + HONEST gate)  [HANDOFF]
commit: (this commit, on main) — [A] task, OWNER-PRIORITY. Owner: "another accessibility pass — light
grey text on light purple now." Root cause (the recurring backdrop theme): T112's full-bleed FX backdrop
put a potentially-BRIGHT scene behind the transparent content column, but `--muted` (#939CAB, a mid-grey)
is tuned for the dark `--bg` — and `contrast.test` only tested against `--bg`, so it passed while the
RENDERED contrast failed. The backdrop really can be bright (fxgl's home palette pool includes pure
white; Arena `glow` stops reach ~240), so light-grey-on-light fails AA.
changed (A-owned only):
  - **styles.css `.app`** — added a semi-opaque dark scrim `background:rgba(14,17,22,.88)` (the `--bg`
    colour at 0.88) BEHIND the content column. This pulls the worst-case backdrop pixel under text dark
    enough that `--muted` clears **AA (≈4.93:1 over white)**; the backdrop still reads in the side gutters
    (body has 16px padding), at ~12% through the scrim, and vividly in the z-58 celebration overlay (the
    scrim is below it). Not flattened to solid black.
  - **styles.css `.build`** — dropped `opacity:.7` from the version stamp (over the scrim, dimming the
    `--muted` text lightened it back under AA).
  - **test/contrast.test.js** — made the gate HONEST: it now derives the `.app` scrim and asserts
    `--muted`/`--text` clear AA against the scrim **composited over the BRIGHTEST backdrop pixel (white =
    the worst case the backdrop can render)** — the real rendered background, not the dark token. Verified
    it FAILS with no scrim AND with a too-weak scrim (0.5 → 1.28:1), PASSES at 0.88 (4.93:1) — i.e. it
    would have caught today's grey-on-purple.
how I verified: math + gate: `--muted` over scrim+white = **4.93:1** (AA), `--text` = 11.2:1; the gate
  fails on no/weak scrim. `node -c`-n/a (CSS+test); **full 34-gate suite green** (contrast 6→10 checks).
  Only [A]-owned files touched. 360-safe (scrim is viewport-agnostic); ≥44px targets + focus rings
  unaffected.
notes / questions: **babysitter eyeball:** home + Arena muted text (gold/momentum bars, build stamp,
  topic-info subline, eyebrow) should now be clearly readable over the backdrop, which still shows as a
  faint tint behind content + vivid at the gutters/celebration. Tunable via the `.app` scrim alpha (0.88
  → lower = more backdrop but less margin; the gate enforces the AA floor either way). Next per `NEXT.md`:
  the reordered **`T137`** (celebration tester in Settings + diagnose why it's still invisible) is now
  FIRST, then `T124` (fraction glyphs) → `T101` (Start delay) → Android.

## T137 — Celebration TESTER in Settings + diagnose the still-invisible burst  [HANDOFF]
commit: (this commit, on main) — [A] task, OWNER-PRIORITY · BUG. Owner (after T136): "I still don't see
celebrations. Add a celebration tester to the setup menu to trigger different celebrations." Feature AND
diagnostic instrument.
changed (A-owned only):
  - **index.html** — a `#fxTest` tester group in Settings (same pixel-button a11y as the music switcher):
    **Item / Rank up / Arena win / Big burst** (`data-fx`), plus a `#setFxVal` readout.
  - **main.js `fireCelebrationTest(kind)`** — fires each celebration ON DEMAND: ensures `audioUnlock()`/
    `setupFx()` ran (mounts `fxBurst`), **forces `fxResizeAll()`** (so the buffer matches the live
    viewport), then calls `fxCelebrate`/`fxCelebrateRank`/`fxCelebrateWin`/`fxBigBurst`. **Diagnostic:** it
    writes `fxBurst.isReady()` + `fxBurst.dimensions()` into `#setFxVal`, so the owner can report the live
    drawing-buffer size (a `0×0`/`1×1` ⇒ a resize-timing bug; a real size ⇒ look at occlusion/engine).
  - **styles.css** — **occlusion fix:** `#fxBurst` z-index **58 → 59** and `#fxCanvas` (the older
    per-toast `window.FX` confetti) **59 → 58**, so the big celebration overlay is ABOVE the old confetti
    (the one documented "smell": two parallel celebration canvases, the old one stacked on top), still
    below toasts (z60). Reuses the T129 `.music-switch`/`.mus-btn` styles.
DIAGNOSIS (static — I can't run the device; the tester is for the owner's live check):
  - **[A] occlusion** — FIXED here (the z-order swap above). `#fxCanvas` (z59) sat above `#fxBurst` (z58);
    even though it's transparent when idle, it's the one parallel-stack smell flagged, now removed.
  - **resize/dimensions** — the `{backend:"2d"}` path looks SOUND: `_cssSize` falls back to `innerWidth`
    when `clientWidth` is 0, so the canvas is sized even pre-layout; T125's `fxResizeAll` (construction +
    rAF + window/fullscreen) and the tester's resize-before-fire keep it matched. The readout will confirm.
  - **engine particle visibility** — the rest of the path is correct in code: `celebrate()`→`_ignite`→
    `backend.setBurst(parts)` (CPUBackend stores `this.burst`) → RAF `_frame` → `renderFrame` draws solid
    `fillRect`s across `W×H` device px. IF the owner still sees nothing via the tester with a real
    `dimensions()` readout, the cause is engine-side (particles drawing sub-pixel / off-canvas / zero-
    alpha on the Canvas2D backend) ⇒ **flag [B] `T138`**: add a particle-VISIBILITY golden (on-canvas
    coords + non-zero alpha + ≥1px DEVICE size), not just the current rect-COUNT golden.
how I verified: **test/fx-wiring.test.js (58→75)** — asserts the tester group + 4 `data-fx` buttons, the
  resize-before-fire, all four entry points wired, **#fxBurst z > #fxCanvas z** and **< 60**; live-boot
  clicks each tester button and confirms it fires a celebration on a correctly-sized (non-1×1) overlay.
  `node -c` clean; **full 34-gate suite green** (synth-wiring T129 button-count scoped to `data-music`).
notes / questions: T123 (a11y contrast floor) is ALREADY DONE/pushed (`63876e4`) — NEXT.md's "→ then
  T123" predates that. **Babysitter / owner:** tap the Settings tester — if a shower appears, the bug was
  occlusion/triggering (fixed); if not, please report the `#setFxVal` size (e.g. "1080×2400" vs "0×0") so
  we route [B] T138 precisely. Next per `NEXT.md`: `T124` (fraction glyphs) → `T101` (Start delay) → Android.

## T142 — Restore the FX backdrop T123's scrim killed (LOCAL backings, not a global slab)  [HANDOFF]
commit: (this commit, on main) — [A] task, OWNER-PRIORITY · REGRESSION. Owner (screenshot, build
`63876e4`): "this build killed the nice background :-(". T123's a11y fix put a semi-opaque dark scrim on
`.app` — but `.app` is ~the full phone width, so the full-bleed FX backdrop (which the owner loves) became
a near-solid dark slab with only thin gutters. A UNIFORM scrim can't keep both (a light scrim fails AA
over the backdrop's bright pixels). Almost all text is ALREADY carded, so the global scrim was overkill.
changed (A-owned only):
  - **styles.css** — **removed the global `.app` scrim** → the full backdrop reads again. Added a LOCAL
    translucent-dark backing (`rgba(14,17,22,.88)` + radius + padding) to the FEW rows that float directly
    on the backdrop (which shows only on `#start`/`#arena`): the **stat row `.readouts`** (Goblin Gold /
    Momentum), the **`.build` stamp**, and the **`#arena .res-label`** title. Audit: `.topic-info` is
    already carded (`background:var(--surface)`), tree nodes/event banner/buttons/Best-times rows are all
    carded — they needed nothing. The backdrop now shows AROUND these pills (vivid), dimmed only locally
    behind the text.
  - **test/contrast.test.js** — reframed the honest gate to the PER-ELEMENT mechanism: asserts (1) **no
    global `.app` scrim**, and (2) each floating row has a local backing whose alpha makes `--muted` clear
    **AA (4.93:1) over the worst-case white backdrop pixel**. Verified it **FAILS if any floating row is
    left unprotected** (removed `.build`'s backing → FAIL) and passes when all three are backed.
how I verified: math/gate — each floating row: `--muted` 4.93:1 over white (AA); the global-scrim check is
  gone; the gate fails on an unprotected row. `node -c`-n/a (CSS+test); **full 34-gate suite green**
  (contrast 14 checks). Only [A]-owned files; 360-safe (border-box padding); ≥44px targets unaffected.
notes / questions: **babysitter / owner eyeball:** the full-bleed backdrop should be back (vivid, not a
  dark slab), with only small dark pills behind the stat row / build stamp / Arena title keeping that text
  readable. Tunable per element (the .88 alpha → lower = more backdrop through the pill, but the gate holds
  the AA floor). T123's global scrim is fully superseded. Next per `NEXT.md`: `T140` (12-style music
  switcher, after B's T139) → `T124` (fraction glyphs) → `T101` → Android.

## T124 — Fraction tree-glyphs: full-size slashed form (legible at node size)  [HANDOFF]
commit: (this commit, on main) — [A] task. Owner (screenshot, tech-tree): the fraction glyphs are still
illegible at node size — esp. the standalone **Fractions** (`¾`) node — "there's a lot of horizontal
space for it to take up that could make it more clear." T104's diagonal SMALL (3×4) fraction is a tiny
cramped blob, and the node glyph canvas is **36×22 (WIDE)** — the old narrow 5×9 fraction wasted the
horizontal room (height-limited → ~7px-tall SMALL digits).
changed (A-owned only):
  - **glyphs.js** — redefined the `frac` token: was a 5-wide diagonal of **SMALL 3×4** digits; now a
    **13-wide FULL-SIZE slashed fraction** — `BIG` numerator (5×7) · a 3-wide diagonal slash · `BIG`
    denominator (5×7), side-by-side on the big rows (the same legible structure as the `a/b` Fractions-II
    glyph the owner said reads fine). Uses the wide node's horizontal space; height-limited cells now draw
    the BIG digit SHAPES (≈12×17px at node size) instead of the ambiguous SMALL blob. `*f12`/`*f34` keep
    the amber accent. Works for any `fXY` (BIG has all digits; SMALL only had 1–4). SMALL stays for
    superscripts; other glyphs untouched.
how I verified: ASCII render confirms `f12`→"1 / 2", `f34`→"3 / 4", `*f12 n`→amber "½" + body "n", all
  full-size + clearly the right fraction. **test/glyphs.test.js** updated: asserts the numerator/denominator
  are the FULL-SIZE BIG bitmaps (5×7), the 13-wide form, a diagonal slash between them, no horizontal
  mid-bar, ½≠¾. `node -c glyphs.js` clean; **full 34-gate suite green** (glyphs 33 checks). Favicon /
  non-fraction marks unaffected; 360-safe (the glyph scales to fit its canvas).
notes / questions: **babysitter compare at the live node size:** the Fractions (`¾`) and Fractions-of
  (`½n`) marks should now read unambiguously AS the fraction (the owner can tell which at a glance), using
  the node width; `a/b` (Fractions II) still fine. Next per `NEXT.md`: **`T140`** (12-style switcher) once
  B's T139 hands over the style list → `T101` (Start delay) → Android.

## T143 — Audio gets its own scrollable menu + separate Music/SFX volumes (nav-trap fix)  [HANDOFF]
commit: (this commit, on main) — [A] task, OWNER-PRIORITY · BUG(nav trap). Owner: (a) "we need separate
volume controls for sounds and music, the sounds are getting lost"; (b) "the config menu goes off the
bottom, can't scroll, can't go back — sound controls should live in their own menu, the Sound button can
open it"; (c) the celebration tester restarts the music.
changed (A-owned only):
  - **(1) navigation-trap fix (priority).** `index.html`: both the Settings body AND the new Audio body are
    `class="settings-body scroll-body"`. `styles.css`: **`.scroll-body{flex:1;min-height:0;overflow-y:auto}`**
    inside the flex-column screen, with `.res-actions` pinned (`flex:0 0 auto`) → the **Back button is
    ALWAYS reachable**; no control can push it off the safe-area-bounded screen.
  - **(2) dedicated Audio menu.** New `#audio` screen + `#/audio` route + `renderAudio()`. The home Sound
    button (`#soundBtnMenu`) now **opens** `#/audio` instead of toggling; the **mute toggle (`#setSound`)
    moved INSIDE** the Audio menu, along with the music-style picker, tempo, test-sound, and the celebration
    tester. Settings is now just an "Audio" link + the Danger zone. (Entry-screen Sound button still toggles.)
  - **(3) separate Music + SFX volumes.** `sound.js`: the master is now a **MUTE-only shared bus**; SFX
    route through their **own `sfxBus` gain** (`setSfxVolume`, `SFX_MAX`); voices connect to `sfxBus`→master.
    `main.js setupSynth`: inserts a **music gain** on the `Synth.output()`→master path (`setMusicVolume`).
    Two 0–10 sliders: **Music** (default 5 = 0.05×, the loud synth) + **SFX** (default 8, louder so blips
    aren't lost). The old single `halves.vol` **migrates** (in-range → music level). Mute still silences both
    (master=0); the limiter still governs the summed master.
  - **(4) tester no longer restarts music.** New `ensureAudioReady()` (unlock + setupSynth + apply the
    calibrated volumes, **no `musicForScreen`**) — used by `fireCelebrationTest` + the slider previews. And
    `audioUnlock()` now only **starts** music if it isn't already playing (so a drag/tap never re-triggers it).
how I verified: **test/sound.test.js (38→50)** — mute-only master + independent `sfxBus` routing/clamp;
  separate Music/SFX defaults + `halves.vol` migration; the Audio menu + `#/audio` route; the **mute toggle
  inside** Audio; **both bodies `.scroll-body` with `overflow-y:auto`** (trap fix); the tester uses
  `ensureAudioReady` (no `musicForScreen`); `audioUnlock` starts-only-if-not-playing. **synth-wiring (52)** now
  models `createGain` and asserts Synth→**music gain**→master. **home-layout (28)**: the home Sound button
  routes to `#/audio`. `node -c` clean; **full 34-gate suite green**. [A]-owned files only (`sound.js` is A's).
notes / questions: **babysitter + owner LIVE:** open the Audio menu via the Sound button → Back always
  reachable (scroll), mute toggle inside, **independent Music + SFX sliders** (SFX audible over music — tune
  the defaults to taste), tester no longer restarts the song. Volume balance (music 0.05× vs SFX 0.08×) is a
  starting point; both sliders + the limiter make it safe to push. Next per `NEXT.md`: **`T144`** (move the
  gold/momentum pill to the TOP of `#start`) → `T140` (12-style picker, after B's T139).

## T144 + T145 — Move the gold/momentum pill to the TOP + drop the build-stamp pill  [HANDOFF]
commit: (this commit, on main) — [A], OWNER-PRIORITY (small home-screen pill tweaks; the DoD says do them
together). Owner: (T144) "the goblin gold / momentum pill should move to the top of the page"; (T145) "I
don't like the build info pill at the bottom — get rid of the black pill and leave those hard to read,
they're just for me anyway."
changed (A-owned only):
  - **T144 — index.html** — moved the `.readouts` (gold · momentum) row to the **very TOP of `#start`**
    (above the event banner + tree, as a header stat bar). It keeps its T142 local dark pill backing, so it
    stays legible over the FX backdrop.
  - **T145 — styles.css** — removed the `.build` dev-stamp's T142 pill backing (`background`/radius/padding)
    → the stamp is plain text again (the owner accepts its low contrast; it's dev-only).
  - **test/contrast.test.js** — dropped `.build` from the floating-text set (it's exempt) while KEEPING the
    per-element AA assertion for the real UI floating text (`.readouts` + `#arena .res-label`); added a check
    that `.build` carries NO pill backing. The gate still FAILS if `.readouts`/`res-label` lose their backing.
  - **test/home-layout.test.js** — asserts the readout now sits at the TOP of `#start` (above the banner).
how I verified: `node -c` n/a (HTML/CSS/tests); **full 34-gate suite green** (contrast 12 — `.build` exempt,
  `.readouts`+`res-label` still gated + the gate still fails on an unprotected row; home-layout 29 — readout
  at top). [A]-owned files only.
notes / questions: **owner screenshot:** the gold/momentum pill is now the top header bar of the home page
  (legible over the backdrop); the build stamp at the bottom is plain low-contrast text (no pill). Next per
  `NEXT.md`: **`T140`** (extend the music picker to B's 12 styles + per-screen routing + the dubstep victory —
  now unblocked by T139's owner-approved palette).

## T140 — Music picker for B's 12 styles + per-screen routing + dubstep victory  [HANDOFF]
commit: (this commit, on main) — [A], OWNER-PRIORITY. Depends on B's T139 (the owner-approved 12-style
palette). Owner wants all 12 styles auditionable + the dubstep victory to fire on a win.
changed (A-owned only):
  - **index.html** — the Audio-menu music picker now lists **all 12 of B's styles** (`data-music` = B's
    `STYLE_IDS`, labels = B's `CONTEXTS[id].label`): Neon Lobby, Lo-Fi Study, Ambient Drift, Chiptune Rush,
    Synthwave Cruise, Tropical Pluck, Festival, Hypno Techno, Liquid DnB, Phrygian Onslaught, 8-Bit Boss
    March, Dubstep Victory. Each `<button class="mus-btn">` swaps instantly via the existing
    `synthSwitchContext`→`setContext`+`swapNow` path (T132/T134 clean swap).
  - **styles.css** — `.music-styles` = a 2-col grid so B's full labels fit; it lives in the scrollable
    Audio menu (T143) so the extra rows just scroll.
  - **main.js** — (1) **per-screen routing remapped** to B's named styles (contexts dropped solve/event):
    `game → lofi` (calm) / `bigroom` (event gauntlet, festive), `arena → arena`, else `→ menu`; the calm
    Lo-Fi still varies per topic via its seed. (2) **Dubstep victory:** auditioning a `victory:true` style
    fires the engine's **`sting("victory")` DROP** (B's T139 made it a real dubstep build→sub-wub
    drop→impact→sparkle). The win path already fires it (`wubSting`→`sting("victory")` from T128), so a real
    Arena win / topic-complete now lands the drop.
how I verified: **synth-wiring.test (52→63)** — the picker offers all 12 `data-music` styles (12 buttons);
  routing maps game→lofi/bigroom, arena→arena, else→menu; the live boot auditions menu/lofi/ambient/arena/
  dubstep (each → `setContext`), **Dubstep also fires the victory drop** (`sting("victory")`), Arena carries
  its own phrygian harmony, leaving the menu reverts. **events.test**: the gauntlet routes to Festival.
  `node -c` clean; **full 34-gate suite green**. [A]-owned files only.
notes / questions: **owner by ear:** open Audio → the picker lists all 12 styles, each audibly distinct +
  swaps instantly; Dubstep fires its drop; solves are calm (Lo-Fi), Arena drives, events are festive; a real
  win lands the dubstep drop. Next per `NEXT.md` (reordered): **`T146`** (declutter home) → `T148` (SFX
  range) → `T147` (FX tester → Graphics section).

## T146 — Declutter the home nav: drop Sound + Fullscreen, move them INTO Setup  [HANDOFF]
commit: (this commit) — [A], OWNER-PRIORITY. Owner (after T143): "if sound is now a sub-menu of setup, get
rid of the sound icon from the main screen; also get rid of the exit button and add it to setup too."
changed (A-owned): **index.html** — removed the home `#soundBtnMenu` (Sound) + `#fsBtn` (the fullscreen
toggle, which shows "Exit" in fullscreen) from the home nav row (now Best · Items · Heroes · Arena · Setup,
auto-recentred by the existing flex layout). Setup already had an **"Audio" row** (`#openAudio`→`#/audio`,
from T143); added a **"Fullscreen" toggle row** (`#fsToggle`, Enter/Exit). **main.js** — `setupFullscreenBtn`
retargeted to `#fsToggle` (updates `#fsToggleVal` Enter/Exit); removed the orphaned `#soundBtnMenu`
references in `syncSoundButtons` + its click wiring (entry-screen `#soundBtn` mute toggle kept). No dangling
route/handler/`$("id")`.
verified: home-layout (26) — Sound/Fullscreen nav buttons gone, Audio+Fullscreen reachable from Setup, the
boot opens `#/audio` from the Setup Audio row; icons (51) + nav-icons updated. Full 34-gate suite green.

## T148 — SFX volume range: map the slider to the real 0→SFX_MAX (1.0×), not music's 0.10×  [HANDOFF]
commit: (this commit) — [A], OWNER-PRIORITY. Owner: "sound fx volume doesn't go high enough." Diagnosed (per
the babysitter): NOT the engine — `sound.js`'s `sfxBus` accepts up to `SFX_MAX=1.0`, but T143's slider mapped
`sfxVol/100` → max 0.10× gain (~10× of headroom unused; SFX peak ≈ −36 dB).
changed (A-owned): **index.html** — `#sfxVolRange` → `min=0 max=100 step=5 value=60` (so `/100` = 0→1.0×,
default **0.60×** — clearly over the music; music slider stays 0–10 → 0.10×, the asymmetry reflecting that
SFX are intrinsically quieter). **main.js** — `loadSfxVol`/`saveSfxVol` use a new 0–100 key `halves.sfxLvl`
(default 60) and **migrate T143's old 0–10 `halves.sfxVol` ×10**, so returning users get the louder mapping
(old 8 → 80 = 0.80×, not 0.08×). The SFX gain is `setSfxVolume(loadSfxVol()/100)` → up to `SFX_MAX`. `fmtVol`
(÷100) shows the right ×. Music volume + mute unaffected; the brickwall limiter still governs the SFX+music
sum, so the higher gain stays clip-safe.
verified: migration (fresh→60, old 8→80, new value preserved); sound.test asserts the SFX slider maps to
~`SFX_MAX` (0–100→/100), default 60, the ×10 migration. `node -c` clean; full 34-gate suite green.
notes: **owner by ear** — SFX should now cut clearly over the music at the top of the range; if 1.0× still
isn't enough, the noted follow-up is lifting the per-note `g` in sound.js (still clip-safe). Next per
`NEXT.md`: **`T147`** (move the FX/celebration tester out of Audio into a Graphics section).

## T149 — THE celebration bug: move #fxBurst OUT of the display:none reset modal  [HANDOFF]
commit: (this commit) — [A], OWNER-PRIORITY · BUG · ROOT-CAUSED (browser-proven by the babysitter's
Playwright render, after T125/T126/T133/T136/T137/T138 all missed it).
root cause: `<canvas id="fxBurst">` was the **last child of `#resetModal`** (`<div class="modal hidden">`,
the "Clear all data?" confirm). `.modal.hidden{display:none}` → the celebration canvas was removed from
rendering (clientWidth/Height 0×0) except while that modal was open (≈never). The engine painted a perfect
~20%-coverage shower into a canvas the browser never displayed. The backing buffer LOOKED fine (sized via
the `innerWidth` fallback → why `dimensions()` read a real size, and why every Node gate + the owner-readout
stayed misleading). The engine work (T133/T138) + my resize wiring (T125/T137) were all correct — this one
placement was the only thing wrong.
changed (A-owned): **index.html** — moved the single `<canvas id="fxBurst" class="fx-burst">` line OUT of
`#resetModal` to **top level**, a body-level sibling of `.app` directly after `#fxBackdrop` (exactly like
the working backdrop). `#fxBackdrop` + `#fxCanvas` were already top-level. No other change (it's
`position:fixed; z-index:59` so placement only affects whether it's in a display:none subtree).
how I verified: **test/fx-wiring.test.js (75→77)** — asserts `#fxBurst` is TOP-LEVEL (before `.app`) and
appears BEFORE any `.modal` block (never a display:none modal child) — the regression guard for THIS bug.
`node -c` n/a; **full 34-gate suite green**. (Babysitter's Playwright: 0×0 in the modal → 393×852 at body,
19.6% lit celebration coverage at dpr 2.75 — the shower the owner will finally see.)
notes / questions: this is the crux the headless gates couldn't catch (they can't see `display:none`/0×0) —
B's **T150** Playwright harness will close that gap. **Owner:** a win / topic-run / new item / the Settings
tester should now throw a bold visible shower. Next per `NEXT.md`: `T147` (FX tester → a Graphics section).

## T147 — Move the celebration tester out of Audio into a GRAPHICS section  [HANDOFF]
commit: (this commit) — [A], OWNER-PRIORITY. Owner: "the fx test is now in the sound menu which seems
wrong. should be in a graphics section." Correct — the celebration tester is a VISUAL test, not audio.
changed (A-owned): **index.html** — moved the celebration tester (Item / Rank up / Arena win / Big burst
+ the `dimensions()`/`isReady()` readout `#setFxVal`) OUT of `#audio` into a new **`#graphics` Setup
sub-menu** (mirrors the Audio menu: `res-label` + `scroll-body` so Back is always reachable; room for
future FX toggles — reduced-motion, quality). Added a **"Graphics" row** in Settings (`#openGraphics` →
`#/graphics`) beside Audio/Fullscreen. **main.js** — registered the `graphics` screen + `#/graphics` route
+ `renderGraphics()` (resets the readout) + the Setup→Graphics / Back wiring. The existing `#fxTest`
delegated handler is unchanged (still fires each celebration via `fireCelebrationTest`, which uses
`ensureAudioReady` so a test never disturbs the music).
verified: **fx-wiring.test (77→80)** — the tester is NO LONGER in `#audio` and now lives in the `#graphics`
block; Setup links to `#/graphics`; the live boot still fires each celebration on a correctly-sized overlay.
`node -c` clean; **full 34-gate suite green**. [A]-owned.
notes: **owner** — Setup now has Audio · Graphics · Fullscreen sub-rows; the celebration tester is under
Graphics, and (with T149) it throws a real visible shower. This clears the [A] queue through T147; next per
`NEXT.md`: `T124` (fractions, already shipped `583130c`) — awaiting the babysitter's reconciliation.

## T101 — Remove the jank after Start: defer the audio-graph build off first paint  [HANDOFF]
commit: (this commit) — [A]. Owner: "a bit of a delay after hitting Start with fullscreen — nice to not
have that, or at least show loading." Diagnosed the entry `enter()` path: it ran `audioUnlock()` +
`applySoundPref()` (which build the Synth FDN-reverb graph + start the scheduler) AND the fullscreen
request BEFORE rendering the round — so the synth graph build + reflow blocked the first question.
changed (A-owned): **main.js `enter(useFs)`** reordered to feel instant:
  1. **Gesture-required work stays synchronous** inside the tap: `Sound.unlock()` (resume/unlock the
     AudioContext — the browser requires this in the gesture) + `fsEnter()` (request fullscreen).
  2. **Paint the round/menu immediately** (`startIntro()` / `applyRoute()`) — first paint no longer waits
     on the audio engine.
  3. **Defer the heavy build** (`setupSynth()` — reverb/graph — + `applySoundPref()`) to **after first
     paint** via `requestAnimationFrame` (warmAudio). Music starts a frame later; **SFX still work
     immediately** (the context was unlocked in the gesture); the user-gesture requirements for
     fullscreen + audio are preserved (both still fire on the tap).
how I verified: **synth-wiring.test (63→65)** — asserts `enter()` unlocks audio + fullscreen (gesture) and
  PAINTS the round BEFORE the deferred `setupSynth` (`requestAnimationFrame(warmAudio)`); the boot's
  `requestAnimationFrame` now runs deferred work so the existing mount/route/victory checks still pass.
  `node -c` clean; **full 34-gate suite green**. [A]-owned.
notes / questions: **owner/babysitter (browser):** tapping Start (incl. "Play in fullscreen") should now
  drop into the first question without the synth-graph build blocking it; fullscreen + audio still engage
  on the tap; the round/clock is unaffected. If a perceptible reflow delay remains on-device, the noted
  fallback is a brief "Loading…" overlay — flag it. Next per `NEXT.md`: `T102`/`T103` (Android PWA/TWA).

## T101 FIX — restore the music-start the jank-defer dropped (CHANGES REQUESTED)  [HANDOFF]
commit: (this commit) — [A], addressing the babysitter's CHANGES REQUESTED on T101 (`d795031`). The
jank-defer was good but introduced a regression the Node gates couldn't see: **music no longer started
after Start** (first round/menu silent; SFX fine). Root cause (browser-verified by the babysitter): the
deferred `warmAudio = () => { setupSynth(); applySoundPref(); }` mounted the synth, but `enter()`'s
`startIntro()`/`applyRoute()` runs `show()→musicForScreen()` BEFORE the defer, so it early-returned on the
`!synthWired` guard (`main.js`) → music never (re)started.
fix (main.js `enter()`): the deferred `warmAudio` now **starts the music itself** —
`warmAudio = () => { audioUnlock(); applySoundPref(); musicForScreen(curScreen); }`. `audioUnlock()` is the
proven pre-T101 call (ensureAudioReady → `setupSynth` + START music if not playing); the explicit
`musicForScreen(curScreen)` is belt-and-suspenders post-mount. The T101 win is unchanged: the
gesture-required `Sound.unlock()` + `fsEnter()` stay synchronous in the tap, the round paints immediately,
and the heavy build is still deferred off first paint — but now the music starts a frame later instead of
never.
verified: **synth-wiring.test (65)** — asserts `warmAudio` STARTS the music (`audioUnlock` +
  `musicForScreen`), and the boot (entry gesture → deferred warmAudio runs) still mounts Synth + starts
  music (`sy.musics`/`sy.starts`). `node -c` clean; **full 34-gate suite green**. [A]-owned.
notes / questions: **babysitter (browser):** Start (incl. fullscreen) should feel instant AND the menu/round
  music should now play (a frame after first paint); SFX immediate; gesture requirements intact. (Lesson: a
  Node-only gate can't hear "no music" — B's T150 Playwright harness + an audio-start assert would catch
  this class, like it caught T149's invisible canvas.) Next per `NEXT.md`: `T124` (done) → `T152[A]`
  (blocked on B's T152[B] small-particle engine) → Android.

## (status note) — [A] queue cleared through T101; T152[A] blocked, T102 is next (fresh-budget handoff)
All currently-actionable [A] tasks are DONE + on `main` + approved/browser-verified: the audio/FX/menu/a11y/
perf block (T149 celebration-canvas-out-of-modal, T143 audio menu + Music/SFX volumes, T140 12-style picker,
T146 declutter, T147 graphics section, T148 SFX range, T142 backdrop, T137 tester, T123 contrast, T124
fractions, T144/T145 pills, T128/T129/T132 music swap, T135 volume, T131 golden gates, T101 jank-defer + its
music-start FIX `9d6175b`).
- **`T152[A]` is BLOCKED** on B's `T152[B]` (small-particle engine option), which sits behind B's `T151`
  (changes-requested — `ambient` still diverges) + `T150` in B's queue. When `T152[B]` lands: at each
  `fxCelebrate*` call site, replace the fixed `{x:0.5,y:0.55}` with the SOURCE element's normalized centre
  via `getBoundingClientRect()` (inventory→toast, run→rank badge, mastery→topic node, arena-win→enemy
  portrait), passing the existing rarity/rank/topic palette + the small-size option (BACKLOG T152 table).
- **`T102` (Android PWA+TWA) is the next UNBLOCKED task** — a substantial foundation piece deliberately left
  for a fresh budget (a service worker on a live app is a footgun: it must offline-cache the versioned
  `?v=<sha>` assets BUT keep `build.json` network-first so the T54 update flow still works; plus maskable
  manifest icons need real no-build assets created from the procedural mark; plus a Bubblewrap TWA project +
  `/.well-known/assetlinks.json` + documented AAB side-load steps). Starting it half-way risks a stale-cache
  live-site regression, so it's handed off intact rather than rushed.

## T102 — Android PWA core: installable manifest + offline service worker (TWA deferred)  [HANDOFF]
commit: (this commit) — [A]. Babysitter scoped T102 to the **PWA/installability part** (the no-owner-needed
half); the TWA/Play-Store wrapper needs signing credentials → owner away → flagged + deferred to T103/T72.
changed (A-owned, new no-build files + small wiring):
  - **manifest.webmanifest** — installable manifest: name/short_name/description, `start_url`+`scope` `./`,
    `display:standalone`, portrait, `theme_color`/`background_color` `#0E1116`, and a **maskable** icon.
  - **icon.svg** — a maskable brand icon (full-bleed `#0E1116` + the `x/2` mark with the amber slash inside
    the central safe zone, so Android adaptive-icon circle/squircle crops don't clip it). SVG = crisp at any
    size, no-build (we can't generate PNGs without a browser; SVG manifest icons are accepted for install).
  - **sw.js** — the **update-safe** service worker: **NETWORK-FIRST for `build.json` + navigations** (so a
    new deploy + the T54 version check always reach the user; `build.json` is NEVER cached), **CACHE-FIRST
    for the immutable `?v=<sha>` assets + fonts** (fast + offline); `install` skipWaiting, `activate` cleans
    superseded caches + claims clients.
  - **index.html `<head>`** — `<link rel="manifest">` + `theme-color` meta + `apple-touch-icon`.
  - **main.js** — guarded, lazy (on `load`) `navigator.serviceWorker.register("sw.js")` (http(s) only).
how I verified: **test/pwa.test.js (21 checks, registered in pages.yml)** — the manifest is valid JSON +
  installable (standalone, maskable icon that exists); the head links manifest/theme/icon; the SW registers
  guarded + lazily and is **update-safe** (navigations + `build.json` network-first, build.json never cached,
  caches cleaned); and cache-bust leaves the manifest/sw/icon BARE (the browser manages those). `node -c`
  clean (`main.js`, `sw.js`); **full 35-gate suite green**. [A]-owned only.
notes / questions — **⚠ STOP/FLAG (owner away):** the **TWA wrapper** (Bubblewrap Android project → signed
  AAB) + `/.well-known/assetlinks.json` need a signing keystore / Play credentials, so per your instruction
  I did NOT do them — they belong with `T103`/`T72` when the owner is back. The PWA core is enough to install
  the site as a home-screen app + run offline; on-device install/parity is the babysitter/owner check (the
  service worker only activates over https — GH Pages, not file://). **Next: pivoting to `T152[A]`** (now
  unblocked by B's T152[B]) — the celebration point-emission the owner's keen on.

## T152[A] — Celebrations emit from the source element, small/fine, context-coloured  [HANDOFF]
commit: (this commit) — [A], OWNER-PRIORITY. Owner: "very small particle sizes, emanating from the point of
interest (where the toast appears), colour-coded by rarity." B's T152[B] (`a2f9475`) added the engine size/
spread options (`sizePx`/`sizeScale`/`spread`, DPR-aware, floored at MIN_PARTICLE_PX). This wires it.
changed (A-owned, `main.js`):
  - **`elCentre(el)`** — a source element's viewport-normalized centre (`getBoundingClientRect()` /
    innerWidth,innerHeight), robust fallback to screen-centre when the element/rect is absent (the Settings
    tester, missing DOM).
  - each `fxCelebrate*` now takes a **source element** + emits from its centre with **small/fine particles**
    (`sizePx` 5–6) and the **contextual palette**, per the babysitter's table:
    - **inventory** (`fxCelebrate`, from `showUnlocks`) → the **unlock card** (`#unlockGrid`), the item's
      **rarity** palette, count denser for rarer/more.
    - **topic run** (`fxCelebrateRank`) → the **rank badge** (`#rankLine`), the **rank colour** + gold,
      scaled by rank.
    - **arena victory** (`fxCelebrateWin`) → the **defeated foe's portrait** (`.at-enemy`/`.ar-enemy` in
      `#arenaBody`), **gold + a bright accent**, the widest spread (the biggest of the set).
  - `showUnlocks` now opens the modal FIRST so the card has a rect to emit from.
how I verified: **fx-wiring.test (80→81)** — source checks (each `fxCelebrate*` passes its source element);
  the stub gained a `getBoundingClientRect` + innerHeight, and the live boot asserts a real Arena-win
  celebration's **centroid is at the SOURCE rect centre (≈0.205,0.154), NOT screen-centre (0.5)** and uses
  **small `sizePx`** — proving point-emission, not a constant. synth-wiring win-sting updated for the new
  call signature. `node -c` clean; **full 35-gate suite green**. [A]-owned only.
notes: **babysitter/owner browser-verify** — each celebration should now spray fine particles FROM its
  trigger (toast / rank badge / vanquished foe) wearing that thing's colour. The Settings tester (no DOM
  source) still fires from screen-centre (the fallback). Next per `NEXT.md`: **`T153`** (home backdrop →
  purple) → roadmap.

---

## Builder A — T153: home backdrop is FIXED brand purple (no event-based colour)
commit: (this commit) — [A], OWNER-PRIORITY. Owner: "I prefer the background just to stay purple rather than
being event based. Maybe an event-specific screen could change like that, but let's keep the main screen fixed
purple." Diagnosed: `homeFxState()` made the home backdrop "wear today's event colour" — it passed
`paletteFor(ev.rarity)` (epic=purple, **rare=blue `#3f97d8`**), so today's rare event turned the home blue.
changed (A-owned, `main.js` only):
  - **`homeFxState()`** now ALWAYS supplies a **fixed brand-purple palette** `HOME_PALETTE =
    ["#0E1116","#9a5cf6","#cda9ff"]` (the epic family on the app base) and **no longer reads the event**
    (`Ev.today()`/`ev.rarity` dropped from the backdrop entirely). Since the palette is always supplied,
    fxgl's cool no-event dawn ramp never applies → the home stays purple in **every** state (no-event, rare,
    epic). No `fxgl` change — [A]-only.
  - the player's own **progress + Momentum streak** still modulate brightness/particle count (within purple);
    only the **hue is fixed**. Removed the now-unused `FX_MOODS` constant (the event mood drove it).
  - the **event banner still shows the event's own colour**, so no info is lost (per the owner's note an
    event-specific *screen* could carry the event colour later — noted in BACKLOG, not built).
how I verified: **fx-wiring.test (81→84)** — new T153 checks: `homeFxState` reads **no** event/rarity for the
  backdrop; it always emits `event:{palette:HOME_PALETTE}`; `HOME_PALETTE` is the brand purple. The live boot
  now asserts the derived home state carries the **fixed purple palette** (`#9a5cf6`/`#cda9ff`) with **no
  event seed/name** (it can't change with the daily event). `node -c` clean; **full gate suite green**.
  [A]-owned only.
notes: **babysitter/owner browser-verify** — the home backdrop should now render **purple** across a rare-
  event day, a no-event day, and an epic-event day (it no longer goes blue). Next per `NEXT.md`: **`T152[A]`
  is DONE (`bdd0e6a`)** → roadmap `T89`/`T90` (Arena 3v3) → content `T58`–`T61` → `T72`.

---

## Builder A — T89: Arena 3v3 team-selection UI (1–3 heroes) + enemy-team display
commit: (this commit) — [A], roadmap (Phase 6.10). Built on T88's deterministic team sim (`bdd0e6a`-era
`Enemies.teamBattle`/`enemyTeam`/`simulateTeams`). The live Arena was still the 1v1 `statBattle` stat-check;
this wires the real 3v3.
changed:
  - **`enemies.js`** (A-owned): added **`enemyTeamMeta(n)`** — display metadata (name/type/source-tier) for the
    3 foes a tier fields (the tier foe + 2 weaker adds at `tier−K`), in the SAME order the sim fights, so the
    shown line-up matches the actual battle. Exported it. The sim itself is unchanged (T88 invariants intact).
  - **`main.js`**: the single `arenaHero` became a **`arenaParty` (1–`PARTY_MAX`=3 hero ids)**. The pick list is
    now multi-select — tap to add/remove, **capped at 3** (a 4th tap is rejected; deselect always allowed), with
    a pick-order **badge** (1/2/3) and a live **N/cap counter**. Only **owned** heroes are listed (locked/unowned
    can't be fielded — inherent). A new **"Enemy team" panel** shows all 3 foes with each foe's **best matchup vs
    the chosen party** (▲/●/▼). **Fight** now resolves through **`Enemies.teamBattle(party, tier, col)`** (the T88
    sim), and `finishBattle(party, tier, res)` was generalised: the result card shows the **party vs the enemy
    team** + the sim outcome (**heroes standing · foes left · rounds**) instead of the old rating/power/DEF line.
    Loot/gold/region-clear/new-hero grants + the T152 win celebration (`.ar-enemy` source) + T65 scroll-to-top
    are all preserved.
  - **`styles.css`**: `.arena-foes`/`.af-foe` enemy-team chips, `.ah-badge` party-order badge, `.ar-side`
    party/foe portrait groups, `.blocked` dim for capped cards — all with classic + `[data-ui="pixel"]` variants
    (`.af-foe` squared/box-shadow:none; `.ah-badge` + `.af-port`(via `.ar-enemy`) squared via `--ui-radius`).
how I verified: **arena.test (29→38)** — the live DOM-boot now proves: the **3-foe enemy team renders** +
  is labelled; **only owned heroes are offered**; the party **fills to 3/3**, a **4th pick is rejected**,
  **deselect** works (1–3 enforced); Fight routes through **`teamBattle`** (source-pattern + behaviour), never
  opens a round, scrolls to top, shows **Victory** with **all 3 party portraits** + the **team-sim summary**
  (standing · rounds), and records `tier:1`. `node -c` clean (`main.js`+`enemies.js`); **full suite green**
  (incl. `arena3` T88 invariants, `ui-restyle` pixel-radius, `fx-wiring` win-burst). [A]-owned only.
notes: **babysitter browser-verify** — pick 1, 2, then 3 heroes (4th blocked), see the enemy team of 3 with
  matchups, Fight resolves to the team result. **Next: `T90`** (watchable turn-by-turn playout of the same sim).

---

## Builder A — T90: Arena 3v3 watchable deterministic turn playout
commit: (this commit) — [A], roadmap (Phase 6.10, closes the Arena 3v3 trio T88→T89→T90). Makes the fight
*readable*: the 3v3 resolves turn-by-turn, calmly, then reveals the result.
changed:
  - **`enemies.js`** (A-owned): `simulateTeams` gained an opt-in **`recordLog`** flag — purely additive (same
    code path → byte-identical outcome) that also returns the starting **`units`** (max HP) + a turn-by-turn
    **`log`** (each strike: actor/target/dmg/remaining-HP/KO). Off by default, so the load-time calibration +
    `teamBattle` pay zero overhead. New public **`teamBattleLog(party, tier, col)`** returns the SAME
    `{win,heroesAlive,foesAlive,rounds,tier}` as `teamBattle` PLUS `units`/`log`. Exported.
  - **`main.js`**: the Fight now **plays out** before applying the result. `startBattle` builds the logged sim
    and (unless reduced-motion / no-RAF → instant) calls **`playBattle`**, which renders HP-bar combatant cells
    (party vs enemy team), then steps the EXACT log on a **single cancelable RAF** — HP bars drain, KO'd units
    dim, a status line narrates each strike. **Skippable** (`.bp-skip` → jump to result). On natural end OR skip,
    `endPlayout → finishBattle` applies grants + reveals the result card (the existing celebration/sting/loot
    path, unchanged). The RAF is cancelled on a new fight, on leaving the Arena (`show()`), and on re-entering
    it — **no leak**. The frame tolerates a missing/garbage timestamp (always progresses + terminates).
  - **`styles.css`**: `.battle-play` panel, `.bp-unit`/`.bp-port`/`.bp-hpbar`/`.bp-hp` (mint for the party, red
    for foes), `.bp-status`, `.bp-skip` — classic + `[data-ui="pixel"]` variants.
how I verified: **arena.test (38→44)** — the live boot now proves the Fight shows a **watchable playout** (6
  combatants, 6 HP bars, a Skip control), the result is **NOT applied until the playout finishes**, and **Skip**
  finalises into the SAME deterministic Victory (+tier progress). **arena3.test (24→27)** — a Node check sweeps
  tiers × team sizes × loadouts asserting **`teamBattleLog`'s outcome EQUALS `teamBattle`** (no re-roll) and the
  log is internally consistent (HP never < 0; win == ≥1 hero alive). The four boot harnesses that win a fight
  (fx-wiring win-burst, synth-wiring victory-sting, nav-icons result portrait, wayfinding region-clear) now skip
  the playout to reach the result. `perf.test` green — **no RAF/listener leak** (Skip reuses the delegated
  handler; the playout RAF cancels on leave). `node -c` clean; **full suite green**. [A]-owned only.
notes: **babysitter browser-verify** — Fight → watch HP bars drain + KOs over ~2.6s (or tap Skip) → the result
  card. Reduced-motion resolves instantly. Arena 3v3 (T88→T89→T90) is now complete. Next per `NEXT.md`:
  content `T58`–`T61` → `T72` (held for owner creds).

---

## Builder A — T158 🔴 BUG: service worker pinned STALE JS in the installed PWA (the "foghorn")
commit: (this commit) — [A], DO-FIRST/ABSOLUTE. Owner: "sound is really bad in PWA — like a foghorn." This was
a regression in MY T102 service worker.
root cause: `index.html` loads app scripts UN-versioned (`<script src="synth.js">`, `main.js`, …), but `sw.js`'s
fetch handler **cache-firsted every non-nav same-origin GET** — its comment wrongly assumed `?v=<sha>` immutable
URLs. So the installed PWA froze on the first-seen copy: a **pre-T151 `synth.js`** kept running the diverging FDN
reverb (the documented low-drone divergence) = the foghorn, and `main.js` never updated either (T152/T153 fixes
invisible in the PWA). Browser-tab play was fine (no SW cache-first on a fresh load).
fix ([A]-only):
  - **`sw.js`**: navigations, `build.json`, **AND all same-origin app assets** (`.js`/`.css`/`.html`/`.json`/
    `.svg`/manifest) are now **NETWORK-FIRST** — fresh online, cache as the OFFLINE fallback only. **Cache-first
    is reserved for cross-origin fonts.** `build.json` still never cached (T54 version check reads fresh). Chose
    network-first over stale-while-revalidate so the correctness fix lands on the **very next online launch**.
  - **Bumped `CACHE` `halves-static-v1` → `v2`** — the existing `activate` handler deletes every key !== `CACHE`,
    so the poisoned v1 cache is purged when the new SW activates. `skipWaiting`+`clients.claim` kept.
self-heal: on the next ONLINE launch the browser byte-compares `sw.js`, sees it changed → installs → `skipWaiting`/
  `activate` purges v1 + claims → app JS now network-first → fresh `synth.js`. Foghorn gone, no reinstall. (Belt-
  and-braces: fully close/reopen the installed app twice.)
how I verified: **`pwa.test` 21→27** — a NEW behavioural gate runs the REAL `sw.js` fetch handler in a fake SW
  sandbox (fake CacheStorage + network) and proves **same-origin app JS (`synth.js`/`main.js`) is network-first**
  — the fresh network copy WINS over a STALE cached one (the exact bug, now caught); cross-origin fonts stay
  cache-first; `build.json` is network-first + never cached; the `CACHE` name is v2 and `activate` purges v1.
  (This is the teeth that would have caught T102.) `node -c sw.js` clean; **full suite green**; the T54 update
  flow + `build.json` no-store are intact. [A]-only (`sw.js`, `test/pwa.test.js`).
notes: **owner verify** — re-launch the installed PWA online; the foghorn should be gone and the audio should
  match the browser tab. Next per `NEXT.md`: resume `T156`/`T157` (Play-Store-track app-feel).

---

## Builder A — T156: hide the fullscreen affordances when installed/standalone
commit: (this commit) — [A], OWNER-REQUESTED, Play-Store track. Owner (testing the Android wrap): the
fullscreen buttons are redundant once the app launches locked-fullscreen. Conditionally hide them by
display-mode (keep them in a plain browser tab — same build).
changed (A-owned):
  - **`main.js`**: new **`isInstalledDisplay()`** helper — `matchMedia('(display-mode: standalone)')` ||
    `'(display-mode: fullscreen)'` || `navigator.standalone === true` (try/catch). When installed/standalone:
    the entry **"Play in fullscreen"** button (`#entryFs`) is hidden and `#entryPlay` becomes a plain
    **"Tap to begin"** (the audio user-gesture is preserved — it still calls `enter(false)`); and the Settings
    **Fullscreen** row (`#fsToggle`) is hidden. In a browser tab → unchanged (buttons show + work as today).
  - **`manifest.webmanifest`**: `display` `"standalone"` → **`"fullscreen"`** (status bar hidden when wrapped) +
    `display_override: ["fullscreen","standalone"]` for graceful fallback; `orientation:"portrait"` kept.
how I verified: new **`install-display.test.js` (11 checks, gated in `pages.yml`)** boots `main.js` under BOTH
  display-modes: installed → `#entryFs` + `#fsToggle` hidden, entry shows "Tap to begin" + stays wired;
  browser-tab (fullscreen supported) → both still shown + wired (no regression); static: the helper checks all
  three signals, manifest `display:"fullscreen"` + portrait. The **T112 safe-area invariant** (`home-layout`)
  still asserts (CSS untouched). `node -c` clean; **full suite green**. [A]-only.
notes: **owner/babysitter verify** — on the installed PWA the fullscreen buttons should be gone (locked
  fullscreen, status bar hidden); in a browser tab they remain. Next per `NEXT.md`: **`T157`** (Android
  back-button → navigate the screen stack, don't exit mid-game).

---

## Builder A — T161 🔴 the build marker now reflects the RUNNING code (cache-trust fix)
commit: (this commit) — [A], DO-FIRST/ABSOLUTE. Owner: "they show the same build number… the build number
should be an absolute marker of what you're looking at, but it isn't — that's caused a lot of problems."
root cause (confirmed): `main.js` set the pill + `bootSha` from a **fresh `fetch(build.json)`** — decoupled
from the executing code. So every client showed build.json's LATEST sha (even when running an old cached
bundle → two clients on different code showed the SAME number), and the update-check compared the fresh
build.json sha against `bootSha` (itself from the same fresh fetch) → **fresh-vs-fresh, always equal, NEVER
fired.** The marker AND the staleness detector were both blind to what's actually running.
fix ([A]-only, `main.js`):
  - Capture **`RUNNING_V`** = main.js's OWN `?v=<sha>` (the T107 cachebust query on `document.currentScript.src`,
    fallback `querySelector('script[src*="main.js"]')`). That's the sha of the code actually executing.
  - **The pill shows `RUNNING_V`** (truthful per-client; a stale cached bundle shows its OWN old sha). No `?v=`
    (local/dev) → "local build".
  - **The update-check compares `RUNNING_V` vs the FRESH `build.json` shortSha** → differ ⇒ running stale ⇒
    `showUpdate()` (reload lands on fresh `?v=` assets). build.json now supplies only the LATEST sha + the "ago"
    time, never the running identity. (Deployed assets are already `?v=`-versioned by T107 — this was purely the
    marker reading the wrong source.)
how I verified: **`version.test` 9→13** (rewritten) — boots `main.js` with a `document.currentScript?v=` + a
  controllable build.json: the pill shows the RUNNING sha (not build.json's); running==latest ⇒ no bar;
  running≠latest ⇒ the Update bar fires (the safety net that was silently broken) AND the pill KEEPS the running
  sha after fetching a newer build.json; refresh reloads only on click; a no-`?v=` boot reads "local build" +
  the poll is a no-op. `node -c` clean; **full suite green**. [A]-only (`main.js`, `test/version.test.js`).
notes: highest-value fix — once live, two clients on different code show DIFFERENT numbers and "update available"
  actually fires when stale, so every subsequent live review is trustworthy. Next per `NEXT.md`: **`T158`
  (rescoped: no-store nav)** → `T159` (foghorn on resume) → `T160` (Arena death VFX) → then my pending
  `T156`/`T157`.

---

## Builder A — T157: Android back-gesture navigates our screen stack (no mid-game exit)
commit: (this commit) — [A], OWNER-track (Play-Store). The classic TWA surprise: our nav is JS screen-state,
so the system back gesture found no web-history to pop and EXITED the app (quitting mid-Arena/mid-round).
changed (`main.js` only):
  - A **history sentinel** is kept on top of the stack — `show()` calls `pushBackSentinel(name)` after every
    screen (except the entry/splash root), and `setupBackNav` pushes an initial one. So the system back ALWAYS
    lands on a sentinel (same URL → no stray hashchange), and a single **`popstate`** handler walks the screen
    to its **parent** via `BACK_PARENT` (game/results/practice/arena/inventory/heroes/settings/summary → home;
    heroDetail → heroes; audio/graphics → settings), routing through the existing nav (hash for routed screens,
    `show()` for transient ones) so renders/music/fx stay correct. Each back-nav re-arms a fresh sentinel.
  - **Home/root:** back is **confirm-then-exit** — the first press shows a "Press back again to exit" hint and
    re-arms the sentinel (stays in-app); a second press does NOT re-arm, releasing the trap so the app exits.
  - **Inert without a History API** (`typeof history`/`history.pushState`/`window.addEventListener` guards +
    try/catch) → browser-tab and headless play are unaffected; no listeners added per navigation.
how I verified: new **`back-nav.test.js` (13 checks, gated in `pages.yml`)** boots `main.js` with a History API
  + a hash-setter that fires `hashchange` (like a browser) and simulates `popstate`: back from the **Arena →
  home**, from **Audio → Settings**; at **home** the first back stays in-app + shows the confirm hint + re-arms
  a sentinel, the second back does NOT re-arm (trap releases → exit allowed); the parent-map covers the
  transient **game/results/practice → home** (no mid-round exit); and it boots/navigates fine with **no History
  API** (feature inert). `node -c` clean; **full suite green** (perf gate: no listener/RAF leak — back-nav adds
  none in headless). [A]-only.
notes: **owner device-verify** — on the installed PWA, the system back should step Arena/menus → home and only
  exit (after a confirm) from home, never quitting mid-game. Next per `NEXT.md`: **`T159`** (cold-start audio
  hardening) → `T89`/`T90` (done) → content.

---

## Builder A — T158 (rescoped): SW nav/build.json fetched no-store (kill the stale-index.html shadow)
commit: (this commit) — [A]. **Corrects my earlier T158 (`e454208`) — that diagnosis was WRONG.** T107/cachebust
appends `?v=<sha>` to EVERY deployed script, so the assets are versioned + immutable and cache-firsting them is
CORRECT (a new deploy = new URL = cache miss = fresh). The real staleness is the **navigation document**: the
SW's network-first nav did a plain `fetch(req)` that goes through the browser HTTP cache, and GH-Pages serves
`index.html` with a max-age → Firefox could hand the SW a STALE `index.html` (old `?v=` refs → old JS) even
online (the owner's Firefox-frozen-pre-3v3).
fix ([A]-only, `sw.js`):
  - **Reverted** the network-first-for-all-same-origin-assets change; the cache-first branch for the immutable
    `?v=` assets + cross-origin fonts is restored (it's correct).
  - The network-first branch (navigations + `build.json`) now fetches with **`cache:"no-store"`** so the freshest
    document is always pulled, defeating the HTTP-cache shadow; offline still falls back to cache; `build.json`
    still never cached.
  - **Bumped `CACHE` → `v3`** so `activate` purges any `index.html` cached under the prior (network-first-all)
    policy. `skipWaiting`+`clients.claim` kept.
how I verified: **`pwa.test` (27)** — the behavioural SW sandbox now proves navigations + `build.json` are
  fetched **`cache:"no-store"`** (network-first), the immutable **`?v=` assets are served CACHE-FIRST** (no
  network when cached), fonts stay cache-first, `build.json` is never cached, and `CACHE` is bumped + `activate`
  purges the superseded cache. `node -c sw.js` clean; **full suite green**. [A]-only (`sw.js`, `test/pwa.test.js`).
notes: pairs with T161 (now live) — with the truthful marker the owner can SEE Firefox advance to the deploy sha
  + 3v3 appear after a reload. Next per `NEXT.md`: **`T159`** (foghorn-on-resume) → `T160` (Arena death VFX).

---

## Builder A — T159: kill the foghorn on AudioContext resume (app-switch / cold start)
commit: (this commit) — [A] wiring. Owner: "the foghorn came back on PWA when switching between apps." Repro:
backgrounding the PWA suspends the shared AudioContext; on return the engine could schedule music into a
still-suspended/resuming context → a surviving voice/reverb tail blasts as a sustained low drone.
fix ([A], `main.js` — the wiring/timing; an engine `panic()` is the noted [B] follow-up):
  - **`audioCtx()` / `ctxRunning()`** helpers — `ctxRunning` = the shared ctx is `state==="running"` AND
    `sampleRate !== 0` (a garbage/0-rate context is treated as not-ready).
  - **`startMusicWhenRunning()`** — starts the music ONLY when the ctx is running; if it's suspended (cold start
    / returning) it `resume()`s first and starts on the resolve, never into a not-yet-running ctx. **Idempotent**:
    a re-entrant call while a resume is in flight (`resumePending`) is a no-op, so rapid app-switches can't stack
    a second droning start.
  - **`resyncMusic()`** (the visibility-resume path) — `Synth.stop()` FIRST (drop any tail that survived the
    suspend = a clean slate) then `startMusicWhenRunning()`.
  - **`musicForScreen` guard** — bails if the ctx is `suspended`/`sampleRate 0`, so NO call site (incl. the
    T101 `warmAudio` trailing start) can schedule into a bad context; the resume path restarts once running.
  - The `visibilitychange` handler now calls `resyncMusic()` on return (was a bare `musicForScreen`); `audioUnlock`
    starts via the running-guarded starter.
how I verified: new **`audio-resume.test.js` (10 checks, gated)** boots `main.js` with a controllable
  suspended→running ctx + stub Synth and proves: hide STOPS the scheduler; return STOPS first, RESUMES the ctx,
  and re-syncs the music **only after it's running** (nothing scheduled while suspended); a re-entrant return
  while resuming is a **no-op** (no duplicate resume/start); music re-syncs **exactly once**; and the
  running-context guard lives in `musicForScreen`. `node -c` clean; **full suite green** (sound/synth-wiring
  source-pattern checks updated for the new starter). [A]-only (`main.js` + tests).
notes: **owner device-verify** — background/return the installed PWA repeatedly; the drone should not appear and
  the music should resume cleanly. If the foghorn ever survives even this (a tail inside the engine), that's the
  **[B] `synth.js panic()`/voice-cap** follow-up the babysitter flagged. Next per `NEXT.md`: **`T160`** (Arena
  foe-KO death VFX + slower playout).

---

## Builder A — T160: Arena playout death VFX + calmer pace
commit: (this commit) — [A], owner (Arena polish on the T90 playout).
changed (`main.js`):
  - **Foe-KO death VFX:** in the playout's `applyEvent`, when a FOE goes down (`ev.tSide === 1 && ev.ko`) a
    small, TIGHT impact burst now fires AT that foe's cell — `fxBigBurst` at `elCentre(cellEl[k])`, **count 180,
    `sizePx: FX_SMALL`, `spread: 0.7`**, palette = the **foe-type colour** (`HERO_PAL[type]`) + **impact white**.
    Localised so the kill reads without covering the board.
  - **Calmer pace:** the per-step budget `2600→4000`ms, floor `90→130`ms, ceil `360→480`ms — a short fight is no
    longer a blur and each KO has room to land. Skip + reduced-motion still honoured (the playout only runs when
    motion is allowed; Skip jumps to the result).
how I verified: new **`arena-playout-fx.test.js` (6 checks, gated)** drives a REAL fight to completion with an
  FXGL recorder + a query-capable battle DOM + a drivable rAF, and asserts a **localised foe-KO burst** fired
  (signature: spread 0.7 / small / count 180) **AT the foe cell** (x≈0.56,y≈0.50 — not the screen-centre
  fallback) with the **foe-type + white** palette; plus source checks for the slowed pace + the wiring. `node -c`
  clean; **full suite green** (arena.test's Skip path unaffected by pacing). [A]-only (`main.js` + the new test).
notes: **owner/babysitter browser-verify** — watch a fight: each foe that drops should pop a small coloured
  impact at its portrait, at a calmer tempo. This clears the jumped-queue batch (T161→T158→T159→T160) + the
  Play-Store pair (T156/T157). Next per `NEXT.md`: content `T58`–`T61` → `T72`.
