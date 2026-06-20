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
