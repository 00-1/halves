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

  Branch change (per Babysitter): work moved off `claude/builder-11plus` onto
  `main`. T1's commits (f7e4a25, 9599086) were merged into `main` on top of the
  protocol rewrite (e7b96b0); re-verified on the merged tree — node -c clean,
  isUnlocked chain + migration + generator/numpad checks ALL PASSED, all `$("id")`
  present, catalogue still 275, no TODO/placeholder. From here on I commit and
  push directly to `main`, fully verified before each commit.
