# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> This file is the single source of truth for "what do I build right now."
> **Re-fetch `origin/claude/agent` and re-read this file IMMEDIATELY before
> starting each task, and again right before you push.** The task named here for
> you **overrides anything you had in mind** — including lower-numbered or
> earlier-queued work. A **`BUILD ONLY`** or **`BUG`** line is absolute: do that
> one task and nothing else until it's pushed. Rationale/details live in
> `REVIEW.md`; this file is just the pointer.

---

**Builder A → `T161` 🔴 ABSOLUTE-DO-FIRST (build marker = running code) → `T158` (SW no-store nav) → `T159` (foghorn on resume) → `T160` (Arena death VFX + slower playout) → `T156` → `T157` → content → `T72`**
**RE-READ FRESH — order corrected (my earlier T158 diagnosis was WRONG and is rescoped).** Arena 3v3
(`T89`/`T90`) is **DONE+APPROVED** (`9197265`/`dffa345`, owner "looks good") — but you keep building **out of
NEXT order**; re-read this line before every task.
**🔴 `T161` is ABSOLUTE — do ONLY this, push, first.** Owner root-cause: *"they show the same build number… the
build number should be an absolute marker of what you're looking at, but it isn't — that's caused a lot of
problems."* Confirmed: `main.js:2445-2448` sets the pill + `bootSha` from a **fresh `fetch(build.json)`** —
decoupled from the running code — so stale clients show the latest sha and the **update-check compares
fresh-vs-fresh and never fires.** **Fix:** read the RUNNING version from **`main.js`'s OWN `?v=<sha>`** (the
T107/cachebust query on `document.currentScript.src`); show THAT in the pill; compare it to the fresh
`build.json` sha → differ ⇒ `showUpdate()`. No `?v=` ⇒ "local build". Extend `version.test`. [A]-only
(`main.js`, `test/version.test.js`). *(NOTE: T107 `scripts/cachebust.js` already appends `?v=` to every deployed
script — deployed assets ARE versioned; the bug is purely the marker reading build.json not the bundle.)*
**Then `T158`** (rescoped): the deployed assets are already versioned+immutable, so cache-first on them is
CORRECT — the real staleness risk is the **nav document**: the SW's network-first `fetch(req)` (sw.js:36) hits
the **HTTP cache** → a stale `index.html` (old `?v=` refs) can shadow a deploy. Fix: fetch nav + `build.json`
with **`cache:"no-store"`** (offline fallback intact); bump `CACHE` v1→v2; `pwa.test` asserts no-store nav +
bump. [A]-only. *(BACKLOG T158.)*
**Then `T159`** 🔴 (now reproducible — owner: "foghorn came back on PWA when switching between apps"): the
AudioContext resumes badly after app-switch/`visibilitychange` → stuck drone. Audit the resume path
(`audioUnlock`/`warmAudio`/`musicForScreen`, sound.js suspend/resume); on resume **panic/all-notes-off + clean
re-sync** (no surviving voice/reverb tail); idempotent start; guard on `ctx.state==="running"`. [A] wiring; an
engine `panic()` in `synth.js` is a [B] follow-up I'll split out if needed. *(BACKLOG T159.)*
**Then `T160`** (Arena, owner): on a FOE KO in the T90 playout (`applyEvent`, main.js:1468, `ev.tSide===1`)
fire `fxBigBurst` at `elCentre(cellEl[k])` — small/tight (`sizePx:FX_SMALL`, `spread≈0.7`), foe-**type** palette
+ impact white, count ~140-220; slow the pace line (main.js:1474) budget 2600→~3800-4200, floor 90→~130, ceil
360→~480; keep Skip + reduced-motion; add an `arena3`/`fx-wiring` gate (foe-KO ⇒ localised burst at the cell).
[A]-only. *(BACKLOG T160.)*
**Then** `T156` (hide `#entryFs`/`#fsToggle` when installed; manifest `display:"fullscreen"`; keep T112
safe-area) → `T157` (Android back → screen-stack nav) → **`T162`** (✅ owner-blessed: build the **11 mock-driven
drill modes** in 3 tiered pushes P1→P2→P3 — `scaling`/`percentoff`/`partwhole` first; spec in
`docs/agent/T162-calibration.md`; each mode = fixed `{p,a}` set + a Node logic gate) → content `T58`–`T61`.
*(`T103`/`T72` Play-Store need owner creds — hold.)*

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
