# Agent protocol — Builder × Babysitter

Two agents collaborate on this repo over git.

- **Babysitter (planner/reviewer)** — owns planning and quality. Writes
  `BACKLOG.md` and `REVIEW.md`. Reads the builder's commits and `BUILDER-LOG.md`.
  **Never writes product code.**
- **Builder (implementer)** — implements tasks from `BACKLOG.md`. Writes product
  code and `BUILDER-LOG.md`. **Never edits `BACKLOG.md` or `REVIEW.md`** (read
  only).

## Branches & deploy (single writer per branch)

- **`main`** — product code + `docs/agent/BUILDER-LOG.md` + `docs/agent/PROTOCOL.md`
  + `docs/research-11plus.md`. The live site; auto-deploys on every push.
  **Only the Builder pushes to `main`**, and only fully-complete, deploy-verified
  tasks. Every `main` push must be a real, deploy-worthy change (no doc-only
  churn). `main` must never be left broken or half-built.
- **`claude/agent`** — coordination only: `docs/agent/BACKLOG.md` +
  `docs/agent/REVIEW.md`. **Only the Babysitter pushes to `claude/agent`.** It
  does not deploy. Ignore any code on it — never check it out for code.

Single writer per branch ⇒ no push collisions, and review notes don't trigger
Pages builds.

## How each side reads the other

- **Builder reads tasks/verdicts** (do this at the start of every task and after
  every push):
  `git fetch origin claude/agent` then
  `git show origin/claude/agent:docs/agent/BACKLOG.md` and `…:REVIEW.md`.
- **Builder writes** only product code + `docs/agent/BUILDER-LOG.md`, committed to
  `main` (`git pull --rebase origin main` first, though the Builder is the sole
  `main` writer so this rarely matters).
- **Babysitter reads the build**: `git fetch origin main` then inspect the diff
  and `docs/agent/BUILDER-LOG.md`.
- **Babysitter writes** only `BACKLOG.md` + `REVIEW.md`, committed to
  `claude/agent`.

The Builder reviews after the fact and fixes forward on `main`; since tasks are
atomic and verified, the live site keeps working between review and fix.

## File ownership

| File | Branch | Writer | Reader |
|---|---|---|---|
| `docs/agent/BACKLOG.md` | `claude/agent` | Babysitter | Builder |
| `docs/agent/REVIEW.md` | `claude/agent` | Babysitter | Builder |
| `docs/agent/BUILDER-LOG.md` | `main` | Builder | Babysitter |
| product code (`*.js`, `*.html`, `*.css`) | `main` | Builder | Babysitter |

## The loop

1. **Builder** reads `BACKLOG.md` from `claude/agent` and picks the **topmost
   task whose status is `OPEN`** (never skip or reorder). It implements the task
   **completely** on `main`.
2. Builder self-verifies (see Quality bar), commits to `main`, appends a handoff
   entry to `BUILDER-LOG.md` (task id, commit sha, what changed, how verified),
   and pushes `main`.
3. **Babysitter** fetches `main`, reviews the diff against the task's Definition
   of Done, and writes a verdict in `REVIEW.md` on `claude/agent`: either
   `APPROVED` (and flips the task to `DONE` in `BACKLOG.md`, opens the next) or
   `CHANGES REQUESTED` with a precise, numbered list.
4. **Builder** polls `REVIEW.md` from `claude/agent` (`git fetch origin
   claude/agent && git show origin/claude/agent:docs/agent/REVIEW.md`). On
   `CHANGES REQUESTED` it addresses **every** point fully (no deferrals),
   re-verifies, commits, logs, pushes `main`. On `APPROVED` it moves to the next
   `OPEN` task.
5. Repeat until `BACKLOG.md` has no `OPEN` tasks.

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
