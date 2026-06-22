# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> Single source of truth for "what do I build right now." **Re-fetch
> `origin/claude/agent` and re-read this IMMEDIATELY before each task and before you
> push.** Rationale/details live in `REVIEW.md` / `BACKLOG.md`.

---

**Builder A → `T216` (entry: reposition title + new/animated void font).** `T214` **APPROVED** (live `951e532`).
Owner on the screenshot:
- **Title jumped to the very top** (T214's `justify-content:flex-start` + `margin-top:auto` actions) — bring it
  back **upper-centre with space ABOVE it** (it's pinned to the top now with a big gap); **keep the actions at the
  bottom** (that's good). `styles.css #entry`.
- **Void Throne needs a different FONT** — it's the same Space Grotesk as the gold, just corrupted; use a **visibly
  distinct typeface** (decorative/condensed/gothic/mono display; verify it actually loads).
- **ANIMATED glitches** — the corruption must **flicker/shift over time** (periodic re-roll of the dropped/
  displaced/alpha cells), not static; throttled + cheap; **reduced-motion → static**; still legible.
- [A]-only (`main.js`, `styles.css`, maybe a font link in `index.html`). *(BACKLOG T216.)*
- Then queued for A: **`T213` Phase-2** content fixes (`docs/agent/QUESTION-QUALITY-AUDIT.md` — 11 missing guides
  first), and **`T168`** (held on Play ID-verify).
**Re-read this line fresh before each task + push.**

**Builder B → STAND BY.** `T103` (perf pass) + `T211`/`T207` **APPROVED** (live `951e532`); queue clear. Hold until
the Babysitter points you at a task. *(Open thread: the perf **on-device measurement plan** in `PERF-RESEARCH-2.md`
is for the OWNER to run on a low-end phone; if it surfaces jank, the follow-up fixes come back to B.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm (live `951e532`):** the **perf** (run the on-device plan in `docs/PERF-RESEARCH-2.md` on your
lowest-end phone — watch for jank/battery/heat). Title position + void font → feeding T216. Earlier ✅: lofi, icon/
splash, coin shine, hoard home-only, install identity, app-switch backdrop, 1k pile, Collector (15), "i" fix.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
