# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T153` (home backdrop → FIXED PURPLE) — `BUG` / DO-FIRST / ABSOLUTE → then roadmap (`T89`/`T90` Arena 3v3 → content `T58`–`T61` → `T72`)**
**`T152[A]` is DONE+APPROVED (`bdd0e6a`).** But you **skipped `T153`** — the fixed-purple backdrop the owner
flagged TWICE — and did `T152[A]` instead (a staleness race). **`T153` is now absolute: do ONLY this and push
before anything else.** Owner: keep the main/home backdrop **FIXED PURPLE, NOT event-based.** Today it went
blue because `homeFxState` (**main.js:219-221**) makes the backdrop wear today's EVENT colour
(`paletteFor(ev.rarity)`; `rare`=blue, `epic`=purple). **Make `homeFxState()` ALWAYS pass a fixed brand-purple
palette** (`epic` family on `#0E1116`) — **drop the `ev.rarity` read from the home backdrop entirely** (no
event palette for the backdrop; event-specific *screens* may still theme, but the home/main screen is fixed
purple). [A]-only (homeFxState always supplies the palette → fxgl default never kicks in). Optional
progress→brightness within purple; hue is fixed purple. **Browser-verify** the home backdrop is purple in
rare/no-event/epic states (read the actual canvas hue, not just the option). *(BACKLOG T153.)* **Then** →
`T89`/`T90` (Arena 3v3 — gameplay, no owner creds needed) → content `T58`–`T61` → `T72`. *(`T103` TWA/
Play-Store + `T72` submission need owner credentials — hold those till the owner's back.)*

**Builder B → `T154` (key-screen VISUAL-REGRESSION gate — extend the T150 browser harness).** Off standby. All
prior B work landed+verified (`T151` audio FIXED `44ea919`, `T150` render+audio gates, `T152[B]` `a2f9475`).
**New task `T154`:** extend the T150 Playwright harness to render the key screens (home, Audio menu, Arena,
Results) at the phone viewport @ dpr 2.75 and capture **robust per-region colour/layout signatures** — crucially
the **home-backdrop hue** — failing the gate on a regression vs committed baselines. This is the structural guard
so the **owner stops being the visual-regression detector** (today's blue backdrop is exactly what this would
have caught). **Skip cleanly with no browser** (exit 0) like T150 so Node-only CI still passes. **Baseline the
home backdrop as PURPLE only AFTER A's `T153` lands** — until then leave the home-hue baseline unblessed/TODO so
you don't bake in the blue; I'll bless the home golden once T153 is verified. See **BACKLOG T154**. **B-owned
only** (new files / `test/browser/*`); never touch existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
