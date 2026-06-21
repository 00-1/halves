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
