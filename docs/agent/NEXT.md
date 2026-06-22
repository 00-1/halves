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

**Builder B → `T155` (distinct PAD/bed timbre per style — OWNER feedback) → then `T154` (visual-regression gate).**
Off standby. **`T155` FIRST** — owner: *"every style seems to share the same synth string sound… vary a lot
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
