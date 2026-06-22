# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> Single source of truth for "what do I build right now." **Re-fetch
> `origin/claude/agent` and re-read this IMMEDIATELY before each task and before you
> push.** Rationale/details live in `REVIEW.md` / `BACKLOG.md`.

---

**Builder A → `T214` (title polish #3).** `T212` (i-fix + void corruption + tighter + 0.9×) **APPROVED** (live
`ce69b69`). Owner: (1) **less space between the title and subtitle** — trim the `.brand`↔`.subtitle` vertical gap
(CSS); (2) **further corrupt the Void Throne** — more dropped/displaced cells (still legible); (3) **transparency
dithering** — render some void cells at **dithered/reduced alpha** (ordered-Bayer on opacity) so the lettering
**dissolves in patches** (corrupted/half-there); gold line stays solid. (4) **Move the action block DOWN** — the
tag + "Tap to begin" + "Sound on" go **near the bottom of the screen** (flex spacer / `margin-top:auto`) so the
title group gets more visual space up top. [A]-only (`main.js`, `index.html`, `styles.css`). *(BACKLOG T214.)* Then
**`T168`** held on Play ID-verify; **`T213`** quality-pass fixes queued.
**Re-read this line fresh before each task + push.**

**Builder B → `T103` (low-end-Android PERF pass — REQUIRED, owner: "not optional").** `T211`/`T207` **APPROVED**
(live `b8ad4c9`); off standby. A **measure-and-fix** pass (not doc-only) for the now-animated home screen. Audit the
render hot paths — **`fxgl.js` first**: the **T207 `_pileGlint`** (full ~480-coin pile redraw at 5 Hz — is that
within a weak-GPU budget, or repaint only the glinting coins?), the 2D overlay/dither cost, RAF/listener leaks
(incl. T204/T211), the degrade ladder (WebGPU→WebGL2→CPU-still + quality tiers/caps) actually engaging, reduced-
motion killing the loops, high-refresh bounding, memory/context count, the Canvas2D fallback. **Apply the cheap
fixes** (throttle/shrink over-budget work; idle screens ~0 cost). Deliver `docs/PERF-RESEARCH-2.md` (findings + fixes
+ an **owner on-device measurement plan** — the owner is the low-end oracle). [B]-led (`fxgl.js`, doc, tests); any
`main.js` fixes → [A] follow-ups. *(BACKLOG T103.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm (live `b8ad4c9`):** the **hoard is home-only** now (T211 — check it's gone from Inventory/
Heroes/Setup). Already ✅: lofi, Magnar icon/splash, coin shine, install identity, app-switch backdrop, 1k pile,
Collector tab (15). Title feedback captured → T212.

**Queued (not yet assigned):** `T213` — **deep quality pass over every question + all guide/static text** (owner).
Phase 1 = AI-agent ASSESSMENT (Babysitter sub-agents, fan-out per topic; read-only; can run in parallel NOW) →
`docs/agent/QUESTION-QUALITY-AUDIT.md`; Phase 2 = FIXES [A] (`modes.js`/`guides.js`). Also: **T168** (Play Store,
held on owner ID-verify), **T101** (Start-delay trim).

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
