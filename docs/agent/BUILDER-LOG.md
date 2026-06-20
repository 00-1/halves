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
commit: (recorded on push to main below)
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
