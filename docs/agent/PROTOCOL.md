# Agent protocol — Builder × Babysitter

Two agents collaborate on this repo over git.

- **Babysitter (planner/reviewer)** — owns planning and quality. Writes
  `BACKLOG.md` and `REVIEW.md`. Reads the builder's commits and `BUILDER-LOG.md`.
  **Never writes product code.**
- **Builder (implementer)** — implements tasks from `BACKLOG.md`. Writes product
  code and `BUILDER-LOG.md`. **Never edits `BACKLOG.md` or `REVIEW.md`** (read
  only).

## Branch & deploy

- All work happens **directly on `main`**. `main` is the live site and
  auto-deploys via GitHub Pages on every push.
- Because of that, **every task must be fully complete and deploy-verified
  BEFORE you commit** — `main` must never be left broken, half-built, or with a
  reachable-but-unfinished feature. No partial commits, no "I'll finish next
  commit".
- The Babysitter reviews each pushed task post-hoc and may request changes; you
  forward-fix on `main`. Since tasks are atomic and verified, the live site
  keeps working between review and fix.

## File ownership (to avoid conflicts)

| File | Writer | Reader |
|---|---|---|
| `docs/agent/BACKLOG.md` | Babysitter | Builder |
| `docs/agent/REVIEW.md` | Babysitter | Builder |
| `docs/agent/BUILDER-LOG.md` | Builder | Babysitter |
| product code (`*.js`, `*.html`, `*.css`) | Builder | Babysitter |

Always `git pull --rebase origin main` before committing.
Because writers touch disjoint files, rebases should not conflict.

## The loop

1. **Builder** picks the **topmost task in `BACKLOG.md` whose status is `OPEN`**
   (never skip or reorder). It implements the task **completely**.
2. Builder self-verifies (see Quality bar), commits, appends a handoff entry to
   `BUILDER-LOG.md` (task id, commit sha, what changed, how verified), pushes,
   and sets that task's status to `IN-REVIEW` is **not** its job — it just logs.
3. **Babysitter** reviews the diff against the task's Definition of Done. It
   writes a verdict in `REVIEW.md`: either `APPROVED` (and flips the task to
   `DONE` in `BACKLOG.md`, opens the next) or `CHANGES REQUESTED` with a precise,
   numbered list.
4. **Builder** polls `REVIEW.md` (via `git pull --rebase`). On `CHANGES
   REQUESTED` it addresses **every** point fully (no deferrals), re-verifies,
   commits, logs, pushes. On `APPROVED` it moves to the next `OPEN` task.
5. Repeat until `BACKLOG.md` has no `OPEN`/`IN-REVIEW` tasks.

## Quality bar (non-negotiable)

A task is **not** done unless ALL hold:

- **No deferrals, no partial fixes, no stubs.** No `TODO`, `FIXME`, "later",
  placeholder functions, or commented-out shortcuts. If a task is big, finish it.
- **Matches the design** in `docs/research-11plus.md` exactly (ranges, gates,
  progression). If the design is ambiguous, ask in `BUILDER-LOG.md` and wait —
  do **not** guess and move on.
- **No regressions.** Existing modes, screens, routing, collectibles, build-info,
  and the deploy must still work.
- **Verified before handoff**, with evidence in `BUILDER-LOG.md`:
  - `node -c` on every changed `.js`.
  - DOM id cross-check: every `$("id")` referenced in JS exists in `index.html`.
  - A Node logic check for any new generator/mode (answers correct, numeric,
    within calibrated ranges, fits the numpad length guard).
  - Confirm no `TODO/FIXME/placeholder` strings were introduced.
- **Numeric-answer rule:** every drill answer must be enterable on the numpad
  (digits + `.`), non-negative, within the input length guard.
- **Commit hygiene:** clear messages; end with the repo's Co-Authored-By and
  Claude-Session trailers. **Never** put the model identifier in commits, code,
  or docs.

## Escalation

If blocked, or if a task seems wrong/underspecified, the Builder writes a
`BLOCKED:` note in `BUILDER-LOG.md` and waits for the Babysitter — it must not
silently skip, stub, or improvise scope.
