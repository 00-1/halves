# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T182` 🔴 (HOARD FIX — make the pile visible) → `T179` (Codex) → `T180` (`?dev` reveal-all)**
**🔴 `T182` FIRST — the owner can't see the hoard at all.** Root cause: `GOLD_FULL=1e10` + power curve → at real
gold (~1.23K) the pile is **~0.17% = invisible**; and the pile renders on HOME, not in the graphics menu. Fix:
1. **Recalibrate to a LOG-OF-MAGNITUDE curve** — `level = clamp(log10(1+gold)/log10(GOLD_FULL_MAG),0,1)`,
   `GOLD_FULL_MAG`≈1e12–1e15 → 1K≈25%, 1M≈50%, 1B≈75%, 1T≈full. Pile visible from the start, grows across K→M→B→T.
2. **A `?dev` Graphics-menu gold-setter + LIVE pile PREVIEW canvas** — dial gold (slider/values) and watch the
   pile grow without leaving the menu (the owner's ask). `?dev`-gate the existing `?gold=` too.
3. **Earn-burst flies OUTWARD** (drop the `tx/ty` converge — the prior follow-up, folded in).
4. Minor (owner OK): burst coins are squares not beveled — pass/apply `look:"coin"`.
[A]-only. *(BACKLOG T182.)*
- **Then `T179` (Codex)** (Beasts/Bosses/Realms/Events **+ Emblems** from B's `T181`) → **`T180`** (`?dev`
  reveal-all). *(`T168` Play-Store held for ID-verify.)*
**Re-read this line fresh before each task + push.**

**Builder B → `T181` (`emblems.js` brand emblems) → `T183` (RESEARCH: study/focus-friendly music — `lofi` too dark/bassy).**
`T181` first (the app-icon/Codex emblems — see below). **Then `T183`:** owner — *"audio switching sounds very good
now; the Lo-Fi Study sounds a bit dark/bassy. Research what's nice to listen to while studying / being tested."* A
short research pass on focus/test-condition music for ~10-yr-olds → a concrete **`lofi` revision** (warmer/brighter,
less bass/dark) + any calm-context tweaks; keep per-style distinctness + the T175 stability (no foghorn). B-owned
(`synth.js` + tests). *(BACKLOG T183.)*
**`T181`:** build NEW standalone `emblems.js` (`window.Emblems = { draw(canvas,id), IDS }`) — the brand-emblem
candidates in the generative pixel/dither style, gold-on-purple, maskable-safe (icon 48→512 + Codex tile): `coin`
(beveled goblin-stamped coin + glint), `goblin`, `hoard`, `voidthrone`, `crowncoin`. Deterministic + headless-test
(`test/emblems.test.js`). **B-owned only**; never touch existing Halves files; never push `claude/agent`.---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*

