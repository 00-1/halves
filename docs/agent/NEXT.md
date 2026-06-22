# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> Single source of truth for "what do I build right now." **Re-fetch
> `origin/claude/agent` and re-read this IMMEDIATELY before each task and before you
> push.** Rationale/details live in `REVIEW.md` / `BACKLOG.md`.

---

**Builder A → `T220` FIRST (quick splash tweak), THEN back to `T213` Phase 2.** `T217` (void caps + intermittent
glitch) **APPROVED** (live `cc1f202`). Owner sent ONE more void-line iteration → **`T220`: stretch "THE VOID THRONE"
VERTICALLY (taller-than-wide cells, void line only — gold unchanged) + make the glitch flicker FASTER + MORE RANDOMLY,
cutting fully on/off (add brief whole-line dropouts on top of the cell re-roll), reduced-motion → fully static.** Quick
`main.js` change — push on its own for owner device-confirm. *(BACKLOG T220.)* THEN the big one: fix the question/guide issues in
`docs/agent/QUESTION-QUALITY-AUDIT.md`, in BATCHES so the Babysitter can re-assess each:
- **2a — the 11 missing guides + `explain()` cases** (scaling/percentoff/partwhole/balance/lcmhcf/mean/timegap/
  ratioshare/cubes/money/digitsum). Reasoning topics first. **Push this batch on its own.**
- **2b — calibration/clarity:** split `sequences` nth-term to a locked Part-2; clarify terse notations
  (`scaling`/`balance`/`ratioshare`/`metric` litres→L); re-tier outliers (`fractions` 1/16, `mean` 6-term,
  `bonds2`, `rounding` 560-tie); verify the `money` decimal matcher; add `cubes`+roots.
- **2c — de-dup pool slots + re-run the harness + add a regression gate.**
**ROUND 2 (Babysitter re-assessed 2a+2b-1 — calibration clean, 9/11 guides solid):** TWO guide fixes back to you:
  - **🔴 `digitsum` guide + `explain()` — HIGH correctness bug:** the "remainder ÷9 by digital root" tip returns 9
    for multiples of 9, but the true remainder is 0 (live Qs: `remainder 567/7263/999 ÷ 9 = 0`). Add "if you reach
    9, the remainder is 0."
  - **`partwhole` guide (LOW):** generalise the reverse-% tip beyond the 10% case (cover 20/25/50%).
  Then continue **2b-part-2/2c**: `fractions` 1/16 → Part-2, `rounding` 560 tie, `sequences` nth-term split,
  `cubes`+roots, de-dup + harness gate. (Detail: `QUESTION-QUALITY-AUDIT.md` round 2.)
After each batch: Babysitter re-assesses → loop until clean. [A] (`modes.js`, `guides.js`, tests).
- **Then `T219`** — build the PLANNED-BUT-UNBUILT topics (BODMAS, ×-tricks, Primes, Roman→number, Negatives P1 only,
  Algebra/function-machines, + Roots): each a full P1/P2 generator + guide + explain + the assessment loop; Negatives
  P2 deferred (needs minus input). Sizeable content add. *(BACKLOG T219.)*
- **Then `T218`** — notification BADGES on nav items (new loot → Items, new hero → Heroes; clears on view; persists). A
  core/shell feature GG2 inherits (crops-ready). [A] (`main.js`/`index.html`/`styles.css`, tests). Then **`T168`** (held on Play ID-verify).
**Re-read this line fresh before each task + push.**

**Builder B → STAND BY.** `T103` (perf pass) + `T211`/`T207` **APPROVED** (live `951e532`); queue clear. Hold until
the Babysitter points you at a task. *(Open thread: the perf **on-device measurement plan** in `PERF-RESEARCH-2.md`
is for the OWNER to run on a low-end phone; if it surfaces jank, the follow-up fixes come back to B.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm (live `951e532`):** perf on-device plan **DEFERRED by owner** (not now) — parked as a pre-launch check / covered by the 12-tester window; resurface only if a tester reports jank. Title position + void font → feeding T216. Earlier ✅: lofi, icon/
splash, coin shine, hoard home-only, install identity, app-switch backdrop, 1k pile, Collector (15), "i" fix.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
