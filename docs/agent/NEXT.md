# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T184` + `T182` 🔴 BOTH DO-FIRST (dev mode in the menu + visible pile) → wire Codex Emblems**
The owner is **blocked from testing** — can't enable dev tools without editing URLs, and can't see the pile.
- **🔴 `T184` — DEV MODE from the MENU (no URLs):** enable via **tapping the build pill ~7×** → persisted
  `halves.dev` flag → a **"Developer" section in Setup** with ALL dev tools: the **gold-setter buttons** (set real
  gold: 0/1K/1M/1Bn/1T…, refresh pill+pile+milestones), the **reveal-all-collections** toggle (heroes/inventory/
  Codex), and the **FX/hoard testers**. (Keep `?dev` as a fallback.) Off by default; remove for publish (T168).
  Absorbs T180. [A]-only. *(BACKLOG T184.)*
- **🔴 `T182` — make the pile VISIBLE:** `hoardLevel(gold) = clamp(log10(1+gold)/log10(GOLD_FULL_MAG),0,1)`,
  `GOLD_FULL_MAG`≈1e12–1e15 (1K≈25%, 1M≈50%, 1Bn≈75%, 1T≈full). The log curve makes the pile show at any wealth
  (currently power-curve → 0.17% at real gold = invisible). [A]-only. *(BACKLOG T182.)*
- **Then wire the Codex EMBLEMS section** (B's `emblems.js` candidates; rest unlockable via milestones) — the
  owner's icon-review surface. *(`T168` Play-Store held for ID-verify.)*
**Re-read this line fresh before each task + push.**

**Builder B → STAND BY (queue clear).** `T181` emblems DONE+APPROVED (`8f077cb` — all candidates + a bonus
`sigil`, 45-check test), `T183` lofi brightened + study-music research DONE (`5633895`). Hoard engine + foghorn
all landed earlier. **Nothing engine-side queued.** Hold for a real engine need (an owner audio/FX report, a
Codex art tweak that needs the engine, or a new feature surfacing one) — I'll file it and point this line at it.
**B-owned only; never touch existing Halves files; never push `claude/agent`.**

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*

