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

⚠️ **SCHEDULING REALITY (corrected 2026-06-23):** there is **NO cron / ScheduleWakeup** in this environment — the
Babysitter CANNOT self-wake on a timer, so **truly-unattended overnight operation is not achievable**. The only wake
primitive is **`Monitor`** (an in-session poll of `origin/main`, best-effort while the session stays warm — it does
NOT survive container reclamation during long idle). **Realistic model:** when the session is active/woken, drive
HARD — review every pending push AND take over any stalled task immediately (don't leave work parked). Between active
periods, progress pauses until the owner (or a Monitor event) wakes the session. *(Do not promise unattended
multi-hour runs the environment can't deliver.)*

---

## Builder A — work the TOP ⏳ item ONLY. Do not skip or reorder. Push it alone → wait for review → next.

**▶ CURRENT TASK = `T225` (FINAL quality gate — Babysitter-run). Builder A's build queue is CLEAR.**

- ✅ **DONE/approved:** T213, T220, T222, T221, **T224 (audio)**, **T219 COMPLETE** (all ~15 topics + Collector
  capstone = 2300, reachable, total 2352), **T218 (nav badges)**. App in `gg1/dev/`. **GG1 v1 is feature-complete.**
- ⏳ **`T225` ← IN PROGRESS (Babysitter).** Final pass over **all 959 questions (46 topics) + every text string**:
  fan-out AI assessors → Babysitter double-checks each finding → any fixes to [A] (or Babysitter takes over) → loop
  to clean. **Only when clean → v1 SIGN-OFF + `gg1-v1` tag + Release → GG2 P0.** *(BACKLOG T225.)*

**Builder A: STAND BY** — build queue clear; await any T225 fix items the Babysitter routes.
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
