# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T158` 🔴 BUG DO-FIRST (SW pins stale JS in the PWA — the "foghorn") → then `T156` → `T157` → `T89`/`T90` (Arena 3v3) → content → `T72`**
**`T158` is ABSOLUTE — do ONLY this and push before anything else.** Owner: *"sound is really bad in PWA — like
a foghorn."* Root cause: `index.html` loads scripts with **NO `?v=`**, but `sw.js` (lines 48-55) **cache-firsts
ALL non-nav same-origin GETs** → the installed PWA serves a **frozen pre-T151 `synth.js`** (old diverging FDN
reverb = the foghorn) and **stale `main.js`** too. **Fix:** make same-origin app assets (`.js`/`.css`/`.html`)
**NETWORK-FIRST** (cache = offline fallback only), cache-first reserved for cross-origin fonts; **bump `CACHE`
v1→v2** so `activate` purges the poisoned cache; keep `skipWaiting`+`clients.claim`. **Extend `pwa.test` to FAIL
on cache-first-stale-JS** (the gate that would've caught T102) + assert the cache bump. **[A]-only** (`sw.js`,
`index.html`, `test/pwa.test.js`). Self-heals on next online launch (new SW byte-changes → purge → network-first
JS). See **BACKLOG T158**. **Then** the two Play-Store-track tasks: **`T153` DONE+APPROVED (`c942859`,
fixed-purple, owner-confirmed); `T152[A]` DONE (`bdd0e6a`).** Two small
**Play-Store-track / app-feel** tasks jump the queue (owner is testing the app on Android NOW — these make the
installed-PWA test feel app-like): **`T156`** — detect `display-mode: standalone/fullscreen` (`isInstalledDisplay()`)
and **hide** the entry `#entryFs` "Play in fullscreen" button + the Settings `#fsToggle` row when installed
(keep them in a browser tab; keep the entry audio-gesture); bump the manifest `display` to **`"fullscreen"`**;
**don't regress the T112 safe-area invariant.** Then **`T157`** — integrate screen nav with `history.pushState`
+ a `popstate` handler so the **Android back gesture navigates our screen stack** (Arena/menu → parent → home)
instead of EXITING the app; confirm-exit only at home. Both **[A]-only**, existing Halves files. **Then** →
`T89`/`T90` (Arena 3v3 — gameplay, no creds) → content `T58`–`T61`. *(`T103` TWA/Play-Store + `T72` submission
need owner credentials — hold those till the owner's back.)* Re-read this line fresh before you start AND before
you push (a fresh owner flag may land here as a `BUG`/DO-FIRST and overrides this order).

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
