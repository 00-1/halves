# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T162` (build the 11 mock-driven drill modes — TIER P1 FIRST) → content `T59`–`T61` → `T72` (held)**
**You're well ahead — nice work.** PUSHED & gate-green, **pending Babysitter review** (don't redo): `T161`
(`555464f`), `T156` (`eaf40bd`), `T157` (`1a3e3fb`), `T158` rescoped no-store (`41bd1d8`; the earlier
`e454208` network-first is superseded), `T159` (`aa583b8`), `T160` (`1c949e0`), `T58` (`c89eebc`). **Don't
rebuild any of those.**
**NEXT REAL WORK → `T162` (owner-blessed, build ALL 11 drill modes, in 3 tiered pushes — do TIER P1 first and
push before P2):**
- **Tier P1 (push 1): `scaling`, `percentoff`, `partwhole`.** Full item sets + calibrated ranges + `masterSecs`
  + unlock slots are in **`docs/agent/T162-calibration.md`** — read it. Each mode = a fixed `*_SRC` array →
  `build()` mapping to `{p,a}` (match the existing mode shape), numpad-enterable/numeric/non-negative answers,
  a sensible `unlockedBy`/`requires` mastery gate, new **"Reasoning"** picker group for the multi-step ones,
  and **a Node logic gate per mode** registered in `pages.yml`.
- **Then Tier P2** (`ratioshare`, `timegap`, `lcmhcf`, `mean`) → **Tier P3** (`cubes`, `money`, `digitsum`,
  doubles/halves range check). One push per tier so the Babysitter reviews incrementally + the owner feels P1
  early. *(BACKLOG T162 + `docs/agent/T162-calibration.md`.)*
- **Then** content `T59`–`T61`. *(`T103`/`T72` Play-Store need owner creds — hold.)*
**Re-read this line fresh before each task + before each push** (you've repeatedly built out of order — a fresh
owner `BUG`/DO-FIRST can land here and overrides T162).

**Builder B → `T155` (distinct PAD/bed timbre per style — OWNER feedback) → then `T154` (visual-regression gate).**
**⚠ YOU APPEAR IDLE — your last push is still `T151` (`44ea919`); `T155` has been queued for a while and not
picked up. START `T155` NOW** (real, owner-requested engine work is waiting). **`T155` FIRST** — owner: *"every
style seems to share the same synth string sound… vary a lot
more… makes them feel a little samey."* **Root cause: all 12 contexts use `pad: "pad"`** (synth.js:464-476) —
the **identical** detuned-**sawtooth** unison bed. Leads/bass already vary; the **pad bed is the same saw in
every style** = the shared "synth string." **Add ≥4–5 distinct PAD-class patches** (glassy sine/tri, FM electric-
piano, PWM square, hollow organ — all doable with existing `unison`/`fm`/`mono` engines; `PeriodicWave` additive
is optional) and **assign a context-appropriate pad per style** so the harmonic bed is distinct (mapping in
BACKLOG T155). Vary attack/release too (stabby organ vs slow choir swell vs plucky EP). **Re-bless `golden-synth`**
(`UPDATE_GOLDEN=1` — patch names change intentionally; the **distinctness** assertion must still hold). **Output-
feature rule: the golden pins patch NAMES, not timbre — so verify the beds actually SOUND different** (render each
pad via `OfflineAudioContext`, show spectral centroid/harmonics genuinely differ). I'll independently measure the
per-style pad spectra before DONE. **B-owned (`synth.js` + its tests) only.** **Then `T154`** — the key-screen
VISUAL-REGRESSION gate (extend the T150 harness: render home/Audio-menu/Arena/Results @ dpr 2.75, robust per-
region colour/layout signatures incl. the **home-backdrop hue**, fail on regression; skip clean with no browser;
**baseline the home backdrop as PURPLE only AFTER A's `T153` lands** — leave the home-hue baseline TODO till then
so you don't bake in the blue; I'll bless it post-T153). See **BACKLOG T154/T155**. **B-owned only** (`synth.js`,
`test/*`, `test/browser/*`); never touch existing Halves files; never push `claude/agent`.

---
*Maintained by the Babysitter on `claude/agent`, updated on every review.*
