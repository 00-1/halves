# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T158` 🔴 BUG ABSOLUTE-DO-FIRST (SW stale-cache — CONFIRMED) → `T160` (Arena death VFX + slower playout) → `T156` (hide fullscreen buttons) → `T157` (Android back) → `T159` (cold-start audio) → content `T58`–`T61` → `T72`**
**RE-READ FRESH — order changed.** Arena 3v3 (`T89`/`T90`) is **DONE+APPROVED** (`9197265`/`dffa345`, owner
"looks good") — but you built it **out of NEXT order** (T158/T156/T157 were queued ahead). **Re-read this line
before every task.**
**🔴 `T158` is ABSOLUTE — do ONLY this, push, before `T160` or anything.** CONFIRMED active: owner sees **"3v3
in PWA but not Firefox"** → the un-versioned cache-first SW pins each client to its first-cached `main.js`
(Firefox frozen pre-3v3). **It masks every fix we ship**, so until it lands, even `T160`'s VFX won't reach the
owner's PWA. **Fix:** same-origin app assets (`.js`/`.css`/`.html`) **NETWORK-FIRST** (cache = offline fallback
only), cache-first reserved for cross-origin fonts; **bump `CACHE` v1→v2** so `activate` purges; keep
`skipWaiting`+`clients.claim`; **extend `pwa.test` to FAIL on cache-first-stale-JS** + assert the bump. [A]-only
(`sw.js`, `index.html`, `test/pwa.test.js`). Self-heals on next online launch. *(BACKLOG T158.)*
**Then `T160`** (owner, on live Arena): per-**enemy**-death **localised** VFX + slow the playout a touch — both
in the **T90 playout** (`applyEvent`, main.js:1468): on a FOE KO (`ev.tSide===1`) fire `fxBigBurst` at
`elCentre(cellEl[k])` — small/tight (`sizePx:FX_SMALL`, `spread≈0.7`), foe-**type** palette + impact white,
count ~140-220; and bump the pace line (main.js:1474) budget 2600→~3800-4200, floor 90→~130, ceil 360→~480.
Keep Skip + reduced-motion intact; add an `arena3`/`fx-wiring` gate that a foe-KO triggers a localised burst at
the foe cell. [A]-only. *(BACKLOG T160.)*
**Then** `T156` (display-mode → hide `#entryFs`/`#fsToggle` when installed; manifest `display:"fullscreen"`;
keep the T112 safe-area invariant) → `T157` (Android back via `history.pushState`+`popstate` → screen-stack nav,
confirm-exit at home) → `T159` (cold-start audio hardening — idempotent start + running-context guard; any
`synth.js` guard is a [B] follow-up I'll split out) → content `T58`–`T61`. *(`T103`/`T72` Play-Store submission
need owner creds — hold.)*

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
