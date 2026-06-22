# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → STAND BY.** All assigned work is **APPROVED** and live (`ee118d3`): `T187` (Codex detail popup),
`T189` (fixed Back-button location). The remaining A task — **`T168` Play-Store productionisation** — is **HELD**
on the owner's Google Play **ID verification** (external) and the **owner's launcher-icon pick** (from B's `T188`
candidates). Do **not** start T168 speculatively. When the owner is ready, the Babysitter will file the wire-up
(chosen emblem → manifest/PWA icons) + the Designed-for-Families/Teacher-Approved + closed-testing checklist.
**Hold until the Babysitter points you at a task.**

**Builder B → STAND BY.** All assigned work is **APPROVED** and live (`ee118d3`): `T185` (hoard renders on
WebGL/WebGPU via the 2D overlay), `T190` (calm/major lofi), `T191` (declick crackle/pop), `T188` (creature icon
candidates). Queue is clear. **Hold until the Babysitter points you at a task** (likely owner device-feedback on
the audio/hoard, or a follow-up on the chosen icon).

---

**State:** the four owner-reported items (invisible pile, dark/stressful lofi, crackle/pop, back-button drift) are
all fixed + deployed, plus the beasts/heroes icon candidates are in. Awaiting **owner device-confirmation** of the
audio + the now-visible hoard, and the **owner's launcher-icon pick** (Codex ▸ Emblems, dev reveal-all). The
critical path to launch is now mostly **external** (ID verification) + the icon pick.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
