# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> Single source of truth for "what do I build right now." **Re-fetch
> `origin/claude/agent` and re-read this IMMEDIATELY before each task and before you
> push.** Rationale/details live in `REVIEW.md` / `BACKLOG.md`.

---

## ⚡ STANDING ORDER — AUTONOMOUS MODE (owner grant, 2026-06-22) — read EVERY cycle
**The owner has handed off: "nothing now needs human review. Push through until GG2 completion. If Builder A stops
responding you may have to take over the work yourself."** So the Babysitter now runs the WHOLE programme unattended:
1. **Drive the queue to completion** — GG1 v1 (T221 → T224 → T219 remaining + Collector rebalance → T218 → **T225
   final gate**) → **sign off v1 + cut/push `gg1-v1` + Release (T223)** → **GG2 P0…M12** per `GG2-MILESTONES.md`.
2. **Review every Builder A push** with full independent verification (worktree@SHA, `node -c`, full suite,
   re-enumerate/recompute content). Approve or send precise CHANGES. Keep this file to ONE clean current task.
3. **TAKE OVER if Builder A stalls (owner-authorised — the Babysitter MAY now write to `main`).** If A has not
   pushed progress on the top task across **~2+ auto-review cycles (~30–45 min)** with the task still OPEN/CHANGES,
   **become the builder:** implement the task on `main` (the relevant `[A]` files), run the FULL suite + `node -c`,
   **self-review against the DoD** (strict — same bar), commit with a clear message, update `BUILDER-LOG.md`, then
   resume reviewing/driving. Maintain quality exactly as if reviewing someone else. *(This supersedes the old
   "Babysitter never writes to main" rule — ONLY because the owner explicitly authorised take-over.)*
4. **Run T225 (final gate) yourself**, sign off v1 yourself, cut the tag/Release yourself — all owner-delegated.
5. **Escalate to the owner ONLY for:** a genuine blocker you cannot resolve, something that would *redesign* GG1
   (vs execute), or the two milestone FYIs ("v1 signed off + tagged", "GG2 P0 underway"). **GG2 creative calls:
   proceed with the defaults in `GG2-MILESTONES.md`, log in `GG2-CREATIVE-LOG.md`, do NOT block.**
6. **Quality bar is absolute:** do NOT sign off v1 until T225 is genuinely clean (zero correctness errors, zero
   typos, no regressions). If not ready, HOLD the tag and record why — never ship to hit a deadline.

*(The 15-min babysitter auto-review loop is the heartbeat that wakes the Babysitter to act on this standing order.)*

---

## Builder A — work the TOP ⏳ item ONLY. Do not skip or reorder. Push it alone → wait for review → next.

**▶ CURRENT TASK = `T219` Collector-ladder REBALANCE (closes T219).** Everything below is the full ordered queue.

- ✅ **DONE/approved:** T213, T220, T222, T221, **T224 (audio)**, **all T219 TOPICS** (Roman, Primes, %-Inc, F·D·P,
  BODMAS, Function-Machines, ×-tricks, Negatives-P1, Area&Perimeter, Volume, Angles, Median/Mode/Range,
  Speed·Distance·Time, Factors/prime-factorisation; Roots via Cubes). App lives in `gg1/dev/`.
- ⏳ **`T219` Collector capstone FIX ← DO THIS NOW.** A rebalanced the capstone to **2350** (`c5151e5`) but that's
  **UNREACHABLE** — the real catalogue is **2310** items, so the top award can never be earned. **Set the capstone to
  a reachable value ≤ ~2300** (must be `< 2310`); keep the other rungs (migration-safe); **add a `collector` test that
  asserts capstone ≤ total catalogue count** (regression guard). `collectibles.js` + test. *(Closes T219.)*
- ⏳ **`T218`** — nav notification BADGES (new loot → Items, new hero → Heroes; clears on view; persists). *(BACKLOG T218.)*
- ⏳ **`T225`** — the FINAL quality pass (TERMINAL v1 gate): **Babysitter-run** (agent assesses every question + text,
  Babysitter double-checks); **A only fixes** what comes back. *(BACKLOG T225.)*

**After the queue clears → v1 sign-off is Babysitter-owned (owner delegated):** Babysitter records "v1 SIGNED OFF",
cuts + pushes **`gg1-v1`** + a GitHub Release (`T223`), A populates `gg1/v1/`, then **GG2 P0 kicks off**
(`GG2-MILESTONES.md` → `GG2-P0-EXTRACTION.md` + `GG2-P0-INPUT.md`). *(T168 Play-Store is NOT a v1 blocker.)*

**Builder B → STAND BY.** `T103` (perf pass) + `T211`/`T207` **APPROVED** (live `951e532`); queue clear. Hold until
the Babysitter points you at a task. *(Open thread: the perf **on-device measurement plan** in `PERF-RESEARCH-2.md`
is for the OWNER to run on a low-end phone; if it surfaces jank, the follow-up fixes come back to B.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm (live `951e532`):** perf on-device plan **DEFERRED by owner** (not now) — parked as a pre-launch check / covered by the 12-tester window; resurface only if a tester reports jank. Title position + void font → feeding T216. Earlier ✅: lofi, icon/
splash, coin shine, hoard home-only, install identity, app-switch backdrop, 1k pile, Collector (15), "i" fix.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
