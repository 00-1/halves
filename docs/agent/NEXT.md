# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> Single source of truth for "what do I build right now." **Re-fetch
> `origin/claude/agent` and re-read this IMMEDIATELY before each task and before you
> push.** Rationale/details live in `REVIEW.md` / `BACKLOG.md`.

---

**Builder A → `T213` Phase 2 (content quality — HIGH PRIORITY).** `T217` (void caps + intermittent glitch)
**APPROVED** (live `cc1f202`); the splash title work is DONE. Now the big one: fix the question/guide issues in
`docs/agent/QUESTION-QUALITY-AUDIT.md`, in BATCHES so the Babysitter can re-assess each:
- **2a — the 11 missing guides + `explain()` cases** (scaling/percentoff/partwhole/balance/lcmhcf/mean/timegap/
  ratioshare/cubes/money/digitsum). Reasoning topics first. **Push this batch on its own.**
- **2b — calibration/clarity:** split `sequences` nth-term to a locked Part-2; clarify terse notations
  (`scaling`/`balance`/`ratioshare`/`metric` litres→L); re-tier outliers (`fractions` 1/16, `mean` 6-term,
  `bonds2`, `rounding` 560-tie); verify the `money` decimal matcher; add `cubes`+roots.
- **2c — de-dup pool slots + re-run the harness + add a regression gate.**
After each batch: Babysitter re-runs the enumeration harness + sub-agent assessment, surfaces more recs → loop until
clean. [A] (`modes.js`, `guides.js`, tests). Then **`T168`** (held on Play ID-verify).
**Re-read this line fresh before each task + push.**

**Builder B → STAND BY.** `T103` (perf pass) + `T211`/`T207` **APPROVED** (live `951e532`); queue clear. Hold until
the Babysitter points you at a task. *(Open thread: the perf **on-device measurement plan** in `PERF-RESEARCH-2.md`
is for the OWNER to run on a low-end phone; if it surfaces jank, the follow-up fixes come back to B.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm (live `951e532`):** perf on-device plan **DEFERRED by owner** (not now) — parked as a pre-launch check / covered by the 12-tester window; resurface only if a tester reports jank. Title position + void font → feeding T216. Earlier ✅: lofi, icon/
splash, coin shine, hoard home-only, install identity, app-switch backdrop, 1k pile, Collector (15), "i" fix.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
