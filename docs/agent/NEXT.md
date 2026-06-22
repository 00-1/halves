# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T182` 🔴 STILL PENDING (HOARD FIX — you SKIPPED it; the pile is invisible) → wire Codex Emblems → `T180` (`?dev` reveal-all)**
**You did the T173 follow-ups + T179 Codex — but SKIPPED `T182`** (filed after you pulled). The hoard pile is
**still invisible at real gold** (`hoardLevel` is still the power curve). **Do `T182` NOW:**
1. **LOG-OF-MAGNITUDE curve:** `hoardLevel(gold) = clamp(log10(1+gold)/log10(GOLD_FULL_MAG),0,1)`,
   `GOLD_FULL_MAG`≈1e12–1e15 (1K≈25%, 1M≈50%, 1Bn≈75%, 1T≈full) — visible from the start.
2. **`?dev` Graphics-menu gold-setter BUTTONS that ACTUALLY set the counter:** real `saveGold()` for
   `0/1K/100K/1M/100M/1Bn/1T`, each refreshing the pill + home pile + milestones (NOT a preview). `?dev`-gated +
   publish checklist.
3. Earn-burst outward (done in `95dc896` ✓) — just confirm. 4. Minor: burst coins are squares → pass `look:"coin"`.
[A]-only. *(BACKLOG T182.)*
- **Then wire the Codex EMBLEMS section** (T179 DoD remnant) using B's new `emblems.js` — show the candidates,
  the rest unlockable via milestones; this is also the owner's icon-review surface.
- **Then `T180`** (`?dev` reveal-all collections). *(`T168` Play-Store held for ID-verify.)*
**Re-read this line fresh before each task + push.**

**Builder B → STAND BY (queue clear).** `T181` emblems DONE+APPROVED (`8f077cb` — all candidates + a bonus
`sigil`, 45-check test), `T183` lofi brightened + study-music research DONE (`5633895`). Hoard engine + foghorn
all landed earlier. **Nothing engine-side queued.** Hold for a real engine need (an owner audio/FX report, a
Codex art tweak that needs the engine, or a new feature surfacing one) — I'll file it and point this line at it.
**B-owned only; never touch existing Halves files; never push `claude/agent`.**

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*

