# Review (Babysitter-owned) — Builder reads, does not edit

**Current verdict:** `APPROVED — T127` [A] (BUG: literal "&amp;" in locked-topic text — double-escape) ·
live build **`ed16b68`**. **CI green.** The one-line fix exactly as diagnosed: `renderTopicInfo`
(`main.js:572`) was `esc(unlockReq(m))` but `unlockReq()` **already** returns escaped HTML → `&amp;amp;`
→ rendered "&amp;"; now `unlockReq(m)` un-escaped (matching the correct `:727` caller). Verified: `node
-c` clean; **full 33-gate suite green**; `tech-tree.test` (36) adds a check that a gating name with `&`
("Add & Subtract") renders a **single** entity (not `&amp;amp;`) **and** a source guard that no
`esc(unlockReq(` remains. No XSS regression (dynamic parts still escaped inside `unlockReq`). All
**[A]-owned files**. T127 → DONE. *(Owner: the locked-topic subline now reads "Add & Subtract".)*

> **Previously approved (done):** `T125` [A] (celebrations FIXED — they render now + fire BIG on every
win/run/item) · live build **`c2296cf`**. **CI green.** Fixes the bug I diagnosed **and** delivers the
owner's "loads of particles, constant." **Render fix (the crux of "nothing at all"):** all three
celebration fns route through a new `fxBigBurst(opts)` that **`.resize()`s the controller THEN fires**,
plus `fxResizeAll()` (resizes `fxBg`+`fxBurst`) on **construction**, a post-layout **RAF**, **window
resize/orientation**, and **all `fullscreenchange` variants** — so the burst canvas is never left at the
stale/1×1 buffer that made it invisible after the Start→fullscreen transition. **Big + constant:** the
**`FX_RANK_MIN` gate is DELETED** (test asserts it's gone) → **EVERY completed topic run** (rank-scaled
but always), **EVERY Arena victory**, and **EVERY new inventory item** fire **`FXGL.celebrate()`**
(T126's 800-particle shower; `burst()` fallback). Verified **independently**: `node -c` clean; **full
33-gate suite green**; **`fx-wiring.test` (54)** pins the resize-before-fire, sized-after-construction
(not 1×1), fullscreen-resize, the gate removal, and each fn routing through `fxBigBurst`. All
**[A]-owned files**. T125 → DONE. **→ 🎆 OWNER: finishing ANY run + winning ANY Arena fight should now
throw a big visible particle shower — confirm it actually shows (the bug was invisibility).**

> **Previously approved (done):** `T126` [B] (FXGL big "celebration" burst — loads of particles) · live
build **`2815188`**. **CI green; collision-clean** (only `fxgl.js`, `test/fxgl.test.js`, log). Adds
`Controller.celebrate(opts)` + `CELEBRATE_CAP = 800` (>3× the brief `BURST_CAP` 256): a real firework/
shower — strong **upward launch + gravity fall**, **bigger/longer-lived** particles (life ~2.4s vs the
brief burst), bright multi-colour. **Invariants kept** (shares burst's `_ignite` path): capped at 800,
**seeded/deterministic**, **single-RAF + auto-stops + no leak**, reduced-motion → a calmer/shorter
shower, **`setQuality` degrades the count** (Poco-X3 budget). Verified **independently**: `node -c`
clean; **full 33-gate suite green**; `fxgl.test` (116) pins `CELEBRATE_CAP ≥600 > BURST_CAP`, the 800
cap, determinism, reduced-motion-smaller, **celebrate() fires >256 particles on a single RAF**, and the
quality degrade. The engine side of "loads of particles" is ready. T126 → DONE. **→ [A] `T125` wires
`celebrate()` on EVERY win/run/item — AND fixes the rendering bug (the burst controller is never
resized → likely why the owner sees "nothing at all"; that's the crux, before size).** B → stand by.

> **Also confirmed done:** `T121` [A] FULLY DONE — scroll-fade **`0972c77`** (masks the `.tree` content
to transparent at the scroll edges via `mask-image`, 3 can-scroll rules → reveals the purple backdrop,
no black `--bg` smear; 34-check tech-tree gate) + coloured icons **`b662840`** (coin gold / calendar
green). *(Record correction: I'd mis-tracked the scroll-fade as "pending" after reviewing the icons —
it had actually landed first in `0972c77`. Verified now: correct, gates green, ancestor of green CI.
That stale pointer is why A had nothing to pick up; fixed — A → T125.)*

> **Previously approved (done):** `T122` [A] (🎙 the new synth engine is WIRED & AUDIBLE) · live build
**`a4e81b8`**. **CI green.** The payoff: B's `synth.js` is now the **live music engine**. **One audio
chain:** `Synth.mount({ctx})` reuses `sound.js`'s **existing AudioContext** and its output routes **into
sound.js's master** → so the **T113 volume slider + the brickwall limiter apply to everything** (music +
SFX), and **mute silences both** (`applySoundPref` sets `Sound.setMuted` AND `Synth.setMuted`). **One
scheduler:** sound.js's old music scheduler (`STYLES`/`startScheduler`/`musicTick`/the old `wub`) is
**deleted** (−219 lines → sound.js is SFX-only) — verified no second scheduler/`setInterval` remains.
**Context routing** (`musicForScreen` mirrors `fxSetScreen`): `#game`→**solve** (CALM **by
construction** — `kickK:0`, no snare, tempo 60 < menu 80), event→**event**, `#arena`→**arena**
(phrygian/driving) with **`Synth.intensity()` driven by live boss-proximity**, else **menu**;
start-on-enter, **`Synth.stop()` when the tab is hidden** (no off-screen drain). **Wins:** `wubSting()`
fires **Synth's wub** on a real Arena victory + topic-complete/mastery (replacing the removed sound.js
wub), **ducking** the music; louder SFX stings also **`Synth.duck()`** (`DUCK_SFX`). **Tempo slider** now
re-derives the per-context spec (`synthTempoMult` × context BPM). Verified **independently**: `node -c`
clean; **full 33-gate suite green** incl. the new **`synth-wiring.test` (25)** (mount-on-shared-ctx,
routed-into-master, no-second-scheduler, context routing, calm-solve, arena-intensity, wub-on-win, duck,
mute-both, tempo→Synth) + `synth.test` (107) + `sound.test` (38, SFX-only); both synth gates registered
in `pages.yml`; `cache-bust` versions `synth.js`. All **[A]-owned files** (consumes Synth's API only).
T122 → DONE. **→ 🔊 OWNER EAR-CHECK on the Poco X3:** calm solves · driving Arena that swells near a
boss · a wub on wins · real reverb/space — all under your volume/tempo sliders + mute. **Tell me how it
sounds + any tuning** (per-context levels/tempo/reverb are easy dials now).
> **Plus `APPROVED — synth mute-idle fix`** [B] · live build **`8e1317e`** — a real gap the T122 wiring
> surfaced (B self-continued off stand-by to fix it, correctly): `Synth.setMuted` now **idles the
> scheduler** (`clearInterval`) when muted — not just zeroing the gain — so a **muted app spawns no
> silent voices** (Poco-X3 CPU/battery), and **unmute resumes** the current context. `synth.test` 111;
> CI green; collision-clean. **B back on STAND BY** (engine reactive-only now).

> **Previously approved (done):** `T120 COMPLETE` [B] (`synth.js` generative-audio engine — all 5 phases)
· live build **`976e575`** (#5 contexts). **CI green; collision-clean throughout** (only `synth.js`,
`test/synth.test.js`, `BUILDER-LOG-FX.md` across all 5 pushes — never an existing file). The principled
rebuild the owner asked for is **built**: **#1** ADSR + a 6-patch table (materially distinct graphs) +
filter-envelopes + supersaw; **#2** a real **FDN reverb** (4 damped delay lines, stable feedback, stereo
tail, music/drum sends, ducking) — the dry-sound fix; **#3** modes-by-mood + chord **progressions** +
**voice-leading** + bass-root; **#4** a single leak-free **lookahead scheduler** + Euclid + Markov +
evolving density; **#5 contexts** — `solve`/`menu`/`event`/`arena` bundling tempo·mode·density·reverb·
patches·kit so the **firm calm-vs-energetic rule holds BY CONSTRUCTION** and is **tested** (Arena denser/
faster/drier/dark-mode/wub-bass vs solve wetter/calm/soft-attack). Verified **independently** each phase;
`node -c` clean; **full 32-gate suite green**; **`synth.test` = 107 checks**. Genuinely raises the
ceiling — patches + space + harmony + groove + mood. T120 → DONE. **🎙 Engine COMPLETE but standalone —
the payoff is the [A] wiring: filed `T122` (mount `Synth` on the existing context, route contexts, fire
the wub, duck, retire the old music scheduler) as A's next; that's the moment the owner HEARS it.**

> **Previously approved (done):** `T117` [A] (all chrome emoji → house generative pixel icons) · live
build **`3e72581`**. **CI green.** New A-owned **`icons.js`** (`window.Icons`): 9×9 hand-pixelled
bitmaps rendered as **1-bit SVG `mask-image`s** so each icon **inherits its context colour** via
`currentColor` (gold coin, muted lock, mint check…) — on-brand, no image assets, no-build. `span(name)`
emits a **decorative `aria-hidden`** `.px-ic` span; `installCSS()` injects a mask rule per icon at boot;
a safe `ic()` helper no-ops if `icons.js` is absent. Covers the full swept set (lock/soundOn/soundOff/
cog/coin/calendar/swords/flag/map/star/…/backspace/close/check/play). **a11y/behaviour preserved:**
node-state badges still map **distinct icons per state** (locked=lock · unlocked=play · mastered=star ·
done=check), the Sound/Settings/Fullscreen buttons keep their `aria-label`, the numpad **⌫→backspace
icon** keeps `data-k="back"`. Verified **independently**: my own emoji sweep of every shipped file →
**0 targeted chrome emoji remain** (only `▾` left = the allow-listed T116 scroll-cue); the **`→`
answer/flow arrows + hint `↑`/`↓` are untouched** (content, not chrome); `node -c` clean; **full 32-gate
suite green** incl. the new **`icons.test` (47)** (API + each icon renders a non-empty SVG mask + the
no-emoji-remains sweep + the content-arrow allow-list) and `cache-bust` updated (icons.js versioned).
All **[A]-owned files** (icons.js is UI chrome — A's domain; no collision with B's engines). T117 → DONE.
*(Owner: the padlock/speaker/cog/coin/calendar etc. are now house pixel icons; eyeball they read clearly
on the Poco X3.)*

> **Previously approved (done):** `T120 #1+#2+#3+#4` [B] (`synth.js` engine — core+space+harmony+rhythm)
· + **`53e86e6`** (#4 rhythm/variation). **#4:** the **single lookahead scheduler** ("two clocks" — one
guarded `setInterval`, `TICK_MS 25` / `LOOKAHEAD 0.1`; `start()` won't double-fire, `stop()`
`clearInterval`s → **no leak**; one-shots use no timer); **Euclidean** kit (`euclid(k,n)` places exactly
k onsets, evenly), a deterministic **2nd-order Markov** melody walk, **motif** transforms, and **density
that evolves across a phrase**; voice-leading stays smooth (no jump > a tritone). `synth.test` **92**;
CI green; collision-clean. *(B continues → #5 contexts = the calm-solve set, menu, Arena+intensity,
event, the wub — the last phase; then the engine's complete and I spec the [A] wiring.)*
**Earlier #1+#2+#3 — #3 harmony:** `MODES` are
musically correct (`lydian` ♯4, `phrygian` ♭2, `dorian` ♮6 vs `minor` ♭6), **grouped by mood**
(bright/calm/dark for context selection); octave-aware `degToMidi`, diatonic `chordMidi` triads, chord
**progressions** with **voice-leading** (nearest-tone) + **bass-follows-root**. `synth.test` now **72**;
CI green; collision-clean. *(B continues → #4 rhythm/variation → #5 contexts.)* **Earlier (#1+#2)** below.
**CI green; collision-clean** (only `synth.js`,
`test/synth.test.js`, `BUILDER-LOG-FX.md` — no existing file touched). This is the **real principled
engine** from the T119 research, running ahead per owner ("keep pushing B"). **#1 core:** a proper
**`adsr()`** (cancel → ramp → release-end), a data-driven **patch table** (6 patches with
*materially different node graphs* — not one wave at different pitches), `renderVoice` with
**BiquadFilter + filter-envelope**, **supersaw detune/unison**, stereo pan, feeding the existing
limiter; **no scheduler/timer yet** (no leak — that's a later phase). **#2 space (the biggest quality
lever the research named):** a genuine **FDN reverb** — 4 `createDelay` lines + pre-delay, **each damped
by a lowpass** (dark tail), a unitary/Hadamard feedback matrix scaled by `decay<1` (dense but stable),
**stereo-spread** tail via panners, **music + drum reverb sends** (drums kept dryer), return to master,
and **`duck()`** dipping the music bus under a cue. Verified **independently**: `node -c` clean; **full
31-gate suite green**; **`synth.test` (55)** pins the ADSR shape, **6 distinct patch signatures /
≥4 distinct graph shapes**, the 4-line damped FDN + recirculation + sends + ducking, and no-timer-leak.
Genuinely raises the audio ceiling (patches + space — exactly the dry-sound fix). **B continues
T120 phases 3 (harmony) → 4 (rhythm/variation) → 5 (contexts) continuously; I review each as it lands.**
*(Still engine-only; the [A] wiring — mount `Synth`, route contexts, fire the wub, duck, retire the old
scheduler — is phase 6, a later [A] task I'll spec once the engine's complete.)*

> **Previously approved (done):** `T114` [A] (audio defaults baked: loud + calm out of the box) · live
build **`fdaeb25`**. **CI green.** The owner's calibration is now the default for fresh installs:
**`VOL_MAX` 2.5→4.0** (owner maxed 2.5 and wanted more → range now reaches 4×, limiter-safe); default
**volume 3.0×** (`loadVol` fallback 80→**300**, `volRange` `value` 80→300, `max` 250→**400**); default
**tempo 0.5×** (`loadTempo` fallback 100→**50**, `tempoRange` `value`→50). Saved `halves.vol`/
`halves.tempo` prefs are **untouched** (only the fresh-install fallback changed). Verified: `node -c`
clean; **full suite green**; `sound.test` (66) updated for the new default band + `VOL_MAX=4.0`. All
**[A]-owned files**. T114 → DONE. *(Owner: a cleared profile now boots ~3× loud + 0.5× tempo; nudge the
Volume slider toward 4× if 3× still isn't enough and tell me.)*

> **Previously approved (done):** `T118` [A] (BUGFIX: Skip key no longer cut off on `#game`) · live build
**`7a271a8`**. **CI green.** The core-loop bug is fixed exactly as diagnosed: `.app` height is now
`calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))`, so **app + body safe-area
padding == the viewport** and the non-scrolling `#game` can no longer push the Skip key below the fold;
the desktop `@media(min-height:1000px)` cap stays; T99 top-pin + T112 fill-screen preserved. Verified
**independently**: **full 30-gate suite green**; `home-layout.test` (28) gained a **regression-guard
assertion** that `.app` height subtracts both insets — so this can't silently come back. All
**[A]-owned files**. T118 → DONE. *(Owner: Skip should be reachable on the game screen now.)* **A
picked it up right after the `NEXT.md` canonical pointer + the direct nudge — the staleness fix is
working.**

> **Previously approved (done):** `T119` [B] (deep generative-audio research + recommended engine) · live
build **`2e0a708`** (doc). The owner's "too simple / not progressing → deep research" ask, delivered
**well**. `docs/research-generative-audio.md` (556 lines) is **substantive + applied**, not filler:
real WebAudio mappings for **ADSR** (gain automation), **filters with env+LFO** (the wub is one case),
**FM/AM**, **noise percussion**, **waveshaping**; **patch design** (contexts differ by *instrument*);
**harmony** (progressions, voice-leading, modes-for-mood, harmonic rhythm); **variation** (Markov,
Euclidean, density envelopes, seeded-evolving, motif); **calm-vs-energetic made precise**; and **mixing
& space** — correctly naming **reverb/stereo width as the single biggest quality lever** (our sound is
bone-dry) with a concrete **FDN reverb** recommendation + ducking. Ends in a clean recommendation: a
**new standalone B-owned `synth.js` → `window.Synth`** engine (harmony+rhythm → one two-clock scheduler
→ music/drum/sfx buses → reverb → the **existing limiter** → out), justified by the same collision/
reversibility logic that made `fxgl.js` work 4×, with a **6-phase build path** (front-loading patches
then space) and a headless test plan. Every owner ask (calm solves · wub · distinct intensifying Arena ·
genuine per-context character · "not progressing" → progressions/motif/evolving density) maps to the
design. **B-owned doc only; no existing file touched.** Genuinely raises the ceiling. T119 → DONE. **→
B proceeds to BUILD it: `T120` (the `synth.js` engine, phased) — pointer below.**

> **Previously approved (done):** `T116` [A] (restore the tree scroll-affordance) · live build
**`b184896`**. **CI green.** `#modeTree` is wrapped in `.picker-wrap` (reusing the existing
can-scroll-up/down fades + `.scroll-cue` ▾) and a new `updateTreeScroll()` toggles them from real scroll
metrics (`scrollTop`/`clientHeight`/`scrollHeight`), wired to tree `scroll` (passive) + `resize` +
`orientationchange` + `fullscreenchange` + **after `renderTree()`** (content-height change). Reuses the
T29 pattern (no new affordance). `node -c` clean; **full 30-gate suite green**; `tech-tree.test` (33)
covers the toggling from metrics. The "more below" fade/cue is back. T116 → DONE.

> **Previously approved (done):** `T115` [A] (music with character — calm solves, wub, distinct Arena) ·
live build **`8d3f2b0`**. **CI green.** A real increment (not trivial): a genuine **`wub()`** — saw bass
→ lowpass with a ~7 Hz **LFO on the cutoff** (Q 9, 600 Hz sweep) = a dubstep wobble — wired to **both**
win moments (`sfx("wub")` on Arena victory `:1262` and on a topic-complete/mastery unlock `:1611`). The
15 topic = **solve** styles are reworked **calm by design** (the firm rule): bpm 58–68 (slower than the
menu), density ≤0.18, **no driving kick/snare** (rests + soft hats only), **soft sine/triangle pad/bell
leads** (never a harsh square), modal scales; the **Arena** theme is the opposite — driving kick/snare,
denser, punchy square lead. Verified **independently**: `node -c` clean; **full 30-gate suite green**;
`sound.test` (now 61) asserts every solve style calm-slow + sparse + no-driving-drums + soft-timbre +
slower-than-menu, the Arena driving/distinct, and all 15 styles distinct. All **[A]-owned files**. T115
→ DONE.

> **BUT — the owner wants MORE (and is right): "too simple, doesn't seem to be progressing → do deep
> research into generative audio + apply principles."** T115 improves the *config* (scale/density/
> timbre per context) but the **synthesis is still basic** — bare oscillators + linear-ramp envelopes,
> **no ADSR depth, no filter/space/reverb, no harmony/chord-progression, no evolving variation**. So
> distinct *configs* still risk sounding samey. The real next tier needs a **principled rebuild** →
> filed **`T119` [B] (deep generative-audio research)** and routed to **Builder B** (idle; built the FX
> engine; engine/research is its wheelhouse). See B's pointer.

> **⚠ Builder A SKIPPED `T118` AGAIN** (built T115 while T118 was pointer #1 — 2nd skip of T118; the
> core-loop **Skip-key-cut-off bug is STILL LIVE on `main`**). T115 is correct so approved, **but T118
> is now urgent** — hard re-pointed below. *(Owner: if A keeps slipping past it, a one-line "build ONLY
> T118 next" nudge to A would force it, like T107.)*

---

**Previously approved (done):** `T113` [A] (live Volume + Tempo sliders — the audio finally instrumented)
· live build **`8d6e42f`**. **CI green.** The **different approach** the owner asked for: stop guessing,
let the owner calibrate. Acts on the root cause I found — `VOL_MAX = 2.5` so the **volume slider reaches
genuinely LOUD** (well past full scale; the −1.5 dB limiter keeps it clip-safe), fixing the "tiny bump
did nothing" problem. `setVolume(v)` clamps 0–2.5 and applies to `master.gain` **live**; `setTempo(m)`
clamps **0.40–1.0×** and the scheduler scales `bpm × tempoMult` **live**. Settings has a **Volume**
slider (0–250 → 0–2.50×) and a **Music-tempo** slider (40–100 → 0.40–1.00×), each with a **live numeric
readout**, plus a **Test-sound** button (`sfx("correct")` + menu music) so it's calibratable right
there. **Persisted** (`halves.vol`/`halves.tempo`, applied on boot) and cleared by Settings-reset.
Verified **independently**: `node -c` clean; **full 30-gate suite green**; `sound.test` (now 44) asserts
`VOL_MAX ≥ 2×`, `setVolume(1.6)` sets gain live, clamps to `VOL_MAX`, `bpm × tempoMult` scaling,
`setTempo(0.5)` slows + clamps to `TEMPO_MIN`, the slider rows + test button exist, and dragging applies
live. All **[A]-owned files**. T113 → DONE. **→ OWNER ACTION: open Settings, drag Volume + Tempo to
what sounds right on the Poco X3, and tell me the two values — I'll set them as defaults via `T114`**
(ideally after `T115` so the music is final when you calibrate).

---

**Previously approved (done):** `T106` [A] (tech-tree v2 — uses the width + clear relationships) · live
build **`10e3000`**. **CI green.** Each main-chain topic is now a **row** whose 1–3 **parts** run
left-to-right, derived by following the **live `requires`/`branchOf` chain** (`topicParts()` — no
parallel edge list; also fixes a latent depth-3 drop), so rows are 1/2/3-wide **as the data dictates**
(never a forced grid). Two distinct **directional, state-coloured** connectors make relationships read
at a glance: a **vertical amber CHAIN** arrow between topics (`unlockedBy`, lit when the next is
unlocked) and a **horizontal purple MASTERY** arrow between parts (`requires:mastery`, lit when the
later part is unlocked; **stretches** so multi-part rows fill toward the edges). Bigger nodes (84→96),
old `.tlink/.tcol/spine` removed, and the `flex:1` tree **grows to fill T112's reclaimed height**
(absorbs the bottom slack). `techGraph()/nodeState()/.tnode/click handler/window.TechTree` **unchanged**
— T84 invariants intact. Verified **independently**: `node -c` clean; **full 30-gate suite green**; the
**tech-tree gate (27 checks)** pins **data-driven** (spine = `unlockedBy`, branch = `requires:mastery`,
**no parallel edge list** — `:95`), **both connectors state-coloured by live unlock**, **varying-width
rows / no empty rows**, and **locked-never-start** (tap does nothing, Start stays disabled — `:80/81`).
All **[A]-owned files**. T106 → DONE. *(Owner: the tree should now fill the width with clear amber-down/
purple-across arrows and breathe into the full height.)*

> **A built T106 while T113 (owner-priority audio) was newly pointer #1 — but A was already mid-T106
> when the audio task was inserted, so this isn't a skip.** T106 is correct → approved. **`T113` (the
> live Volume+Tempo sliders) is A's next, unchanged.** Re-pointed below.

---

**Previously approved (done):** `T112` [A] (FX pass 2 — fills the screen · Arena backdrop · celebrate
wins) · live build **`54820bd`**. **CI green.** Addresses all of the owner's live-T110 feedback,
consuming B's API only. (1) **Full-bleed backdrop:** `#fxBackdrop` moved to a body-level
`position:fixed; inset:0; 100vw×100dvh; z-index:-1` layer behind the (transparent) `.app`/screens, so
the atmosphere reaches **every edge** (no dead FX margins); toggled `.hidden` per screen. (2) **Fill
the screen:** the `.app max-height:780px` phone cap is **dropped** (only a `960px` cap at
`min-height:1000px` desktop) so the column fills `100dvh` and the flex tree absorbs the slack — **no
dead band top OR bottom**; `home-layout.test` updated to assert fill-100dvh **with the top still
pinned** (`body align-items:flex-start`, not `center` — no T99 regression). (3) **Arena backdrop now**
(no wait for the 3v3 UI): `arenaFxState()` reads the **live** Enemies position
(`currentTier`/`tierRegion`/`REGION_SIZE` → region, `tierFrac`, `facingBoss` at the 12th tier) and
feeds T108 `deriveArenaScene`; `fxSetScreen(name)` paints the **home** scene on `#start`, the **Arena**
scene on `#arena`, and **stops + hides** (no RAF, no stale bleed) on every other screen. (4)
**Celebrate WINS:** `fxCelebrateWin(tier.n)` on an Arena victory (`res.win`) and
`fxCelebrateRank(rankIdx)` on a round finish, **rank-scaled with a floor (`FX_RANK_MIN=6`)** so a poor
run doesn't pop — the reward-gain burst (`showUnlocks`) stays. Verified **independently** (API names
checked against the codebase — `Enemies.currentTier/REGION_SIZE/tierRegion`, `res.win`, `tier.n`,
`rankIdx` all real + in scope): `node -c` clean; **full 30-gate suite green** incl. **`fx-wiring.test`
now 39 checks** (full-bleed layer, Arena-backdrop start, win bursts, off-screen stop+hide),
**`home-layout` 26** (fills 100dvh, top pinned), **`contrast` AA** still green. All **[A]-owned files**.
T112 → DONE. *(Owner: the FX should now fill the screen on home AND Arena, and winning a round / Arena
fight should pop a burst. Tune `.fx-backdrop opacity:.85` if it's too strong.)*

> **Builder B stays on STAND BY** — T112 wired the Arena backdrop via the existing `setArenaState`/
> `deriveArenaScene`, so it surfaced **no** new engine need. (If the owner later wants scene
> *transitions/crossfades* or a tuning hook, that'd be the next [B] task.)

---

**Previously approved (done):** `T111` [A] (complete the pixel restyle on EVERY screen + nav tidy) ·
live build **`4843824`**. **CI green.** Finishes the T100 restyle properly — a **full sweep**, not just
the 3 flagged screens: the `[data-ui="pixel"]` block now also covers hero-detail (`.hd-head`/`.hd-port`/
`.hero-stat`/`.hd-boost`/`.hero-chip`), results (`.slow-item` + `.rankline canvas`), and a wide swath
of the rest (`.inv-tab`/`.inv-cell`/`.mode-row`/`.tp-row`/`.map-row`/`.arena-map-btn`/`.ar-port`/
`.ar-enemy`/`.ah-port`/`.u-cell canvas`/`.toast`/`.pq-tile`/`.set-danger`/`.practice-hint-toggle`/
`.jump-top` …) — squared + hard-framed, **all gated on `[data-ui="pixel"]`** (classic byte-for-byte
unchanged), clean-text kept. **Nav tidy:** label **Settings → `Setup`** (long label gone — asserted),
and `.navbtn min-width 44→60px` so the 7 buttons wrap **balanced (5+2 / 4+3), never the orphaned
6+1** (test pins min-width ≥58 → "never 6+1", so the lone Exit is fixed). Verified **independently**:
**full 30-gate suite green** incl. **`contrast.test.js` AA still green** (the sweep didn't drag any
text contrast) and **`ui-restyle.test.js` now 40 checks** (the new selectors are gated + the nav
label/layout). All **[A]-owned files**. T111 → DONE. *(Owner: the hero-detail, results, inventory,
arena, toasts should all read squared now, and the nav is one tidy block with no lone Exit.)*

> **Next: `T112` — FX pass 2 (owner's live-T110 feedback):** full-bleed the backdrop (fill the
> screen), wire the **Arena** backdrop (T108, no need to wait for the 3v3 UI), **celebrate WINS** (not
> just collectible gains), and reduce the wasted margins. Re-pointed below.

---

**Previously approved (done):** `T110` [A] (FX wiring pass 1 — the engine is now VISIBLE) · live build
**`349fcf7`**. **CI green.** 🎉 **First integration of Builder-B's FX engine into the live app** — and
it consumes B's API only (`fxgl.js` **not** edited). Mounts two guarded controllers (no-op if FXGL
absent): a home **backdrop** (`#fxBackdrop`, inside `#start`, `z-index:-1` under an `isolation:isolate`
context so it sits behind the DOM, `opacity:.85`, `pointer-events:none`, `aria-hidden`) driven by
**`setHomeState(homeFxState())`** and a fixed app-level **burst** overlay (`#fxBurst`, `z-index:58`
under toasts, tap-transparent). **`homeFxState()` reads REAL sources** (verified the API names against
the codebase): collection progress `have/total` ∈[0,1], `loadMomentum().count` streak, and
`Events.today()` → `{seed:artSeed, name, palette:paletteFor(rarity), mood}` — **never constants**.
`show()` starts the backdrop **only** on `#start` and **stops it (idle, no RAF) on every other
screen**. `fxCelebrate()` hangs off **`showUnlocks()`** — the single surface **every** reward gain
routes through (`finishBattle` Arena-win loot `:1206`, normal collectible gains `:1332`, event rewards
`:1568`) — firing `FXGL.burst()` **seeded + palette-coloured from the gained items**, capped, over the
unlock modal; reduced-motion handled by the engine. Verified **independently**: `node -c` clean; **full
30-gate suite green** incl. B's `fxgl.test.js` (102) + the new **`fx-wiring.test.js` (29)** which boots
real `main.js` with a stub FXGL and proves 2 controllers, **home derives from live state + starts**
(progress **>0** from a seeded collection — not a constant), **leaving home stops the RAF**, and a
**real Arena-win loot gain fires a burst** with valid `{x,y,count,seed}`; `cache-bust.test.js` correctly
bumped 14→15 refs (the bust versions `fxgl.js` too). All **[A]-owned files**; collision rule intact.
T110 → DONE. *(Owner: eyeball the live home — a subtle state-driven backdrop should sit behind the
tree without hurting readability, and earning a collectible/loot/event reward should pop a brief burst.
Flag if the backdrop is too strong; the `.fx-backdrop opacity:.85` is the dial.)*

> **Note — A skipped `T111` again** (built T110 while T111 was pointer #1; pulled the queue before the
> re-point). T110 is correct + high-value so approved on merits. **T111 (the full pixel-restyle sweep +
> nav tidy) is still A's next** — re-pointed below.

---

**Previously approved (done):** `T107` [A] (asset cache-busting — SHIPPING BLOCKER cleared) · live
build **`f1d4d6d`**. **CI green** (the bust runs inside the deploy job → the uploaded `index.html` is
versioned). **A finally did T107 after the owner's direct nudge.** Clean, no-build-preserving design:
`scripts/cachebust.js` exposes a **pure** `bust(html, ver)` that appends `?v=<ver>` to every **local**
`.css`/`.js` `href`/`src` (regex skips schemes + existing queries → Google-Fonts/preconnect untouched,
idempotent); as a CLI it rewrites in place **and verifies no bare local ref survives** (exit 1). The
`pages.yml` step runs it with **`${GITHUB_SHA:0:7}` — the same short sha `build.json` stamps** — **after
the node gates** (they see clean bare refs) and **before upload** (the deployed copy is fully
versioned). **Source `index.html` stays bare** (no-build intact). Verified **independently**: ran the
rewriter on the real `index.html` → **all 14 local refs versioned** (`styles.css` + 13 module scripts),
**zero bare refs left**, **externals untouched**; `node -c` clean; **full 29-gate suite green** incl.
the new **`cache-bust.test.js` (38 checks)** which pins source-stays-bare, no-bare-after, same-sha-as-
build.json, and the **CI ordering** (bust after the last `test/` gate, before `upload-pages-artifact`).
Because the `?v=` matches `build.json`'s shortSha, the **T54 refresh bar now lands users on fresh
assets**. (Residual GH-Pages edge — `index.html` itself can soft-cache up to its max-age — is the known
platform limit the DoD explicitly allowed the `?v=`+version-check fallback for; a network-first SW is
T102 territory.) **No more stale deploys / hard-refreshes — every future visual review is now
trustworthy.** T107 → DONE.

> **Now wiring the FX (owner's "put it everywhere" vision).** With T107 done, deploys are trustworthy,
> so it's the moment to make B's four built-but-unwired capabilities **visible**. Queued **`T110`** as
> A's next (ahead of T106): **FX wiring pass 1** — mount `FXGL`, the **home backdrop** (`setHomeState`
> from live event/progress/streak), and **celebration bursts** (`FXGL.burst()`) on wins + collectible/
> loot/event gains (subsumes `T94w`). Arena biome wiring stays later (needs the T89/T90 Arena UI).
> *(Owner: this is me driving the visual mandate; say the word if you'd rather I hold FX behind the
> shipping/perf block.)*

---

**Previously approved (done):** `T108` [B] (semantic Arena-biome derivation) · live build
**`86a7094`**. **CI green.** Fourth Builder-B handoff (self-continued, no nudge). **Collision rule
honoured** (only `fxgl.js`, `test/fxgl.test.js`, `BUILDER-LOG-FX.md`). Adds `deriveArenaScene(state)`
+ `Controller.setArenaState` — a `setScene`-shaped backdrop from **live Arena state** (place + status,
not noise): **10 distinct region palettes** + accent kinds (Cinderwaste embers / Frostpeak snow…) for
sense of place; **boss-proximity dominates intensity** (denser particles + hotter/brighter glow as the
boss nears; `facingBoss` pins it to 1.0), **tier lifts the baseline** (deeper = tenser); **victory**
warms/brightens + adds embers, **defeat** dims. Accepts the **real `scenery.js` region grid** and
**recolours it** by the live palette. Verified **independently**: `node -c` clean; **full fxgl gate
green (102 checks, +20 for T108)** — deterministic per state, all-10-palettes-distinct, capped
(`ARENA_PARTICLE_MAX`), out-of-range region clamps, single-RAF, idles when stopped, textures-once;
**full 28-gate suite green**. Standalone — the **[A] side** feeds it region/tier/boss/mood. T108 →
DONE. *(Engine-side only; nothing visible until [A] wiring.)*

> **B's FX-engine queue is now EXHAUSTED — and intentionally NOT extended.** B has shipped four
> collision-free engine capabilities (T93 ambient · T94 burst · T95 home backdrop · T108 Arena biome),
> **all headless-perfect but ALL UNWIRED** — none is visible in the app yet. Manufacturing a 5th
> engine task would be padding (anti-dilution rule). **The real lever now is the FX [A] WIRING**, which
> B cannot do. So B's pointer is set to **STAND BY / optional brickmap hardening** (below), and I'm
> recommending to the owner that a **first FX-wiring [A] task jump the queue right after `T107`** so
> all of B's work becomes visible and B's future work is grounded in real integration needs.

---

**Previously approved (done):** `T100` [A] (gamey pixel-bevel restyle, reversible) · live build
**`6fc8f99`**. **CI green.** Implements the T97-researched, owner-approved direction. `<html
data-ui="pixel">` ships the look **on**; **every** new rule is gated on `[data-ui="pixel"]` (the
classic CSS above is the untouched fallback) so **one attribute flip → `"classic"` fully reverts** —
verified: no ungated selector was added (grep), classic `.btn`/`.event-banner` rules intact, and the
only `index.html` change is the attribute. Token block `:root[data-ui="pixel"]{--ui-radius:2px;
--ui-bevel-hi/-lo; --focus}`. Buttons (`.btn/.eb-play/.el-play/.key/.navbtn/.ub-refresh/.set-row`):
squared radius + **pixel-bevel** inset shadows + **invert-on-`:active`** (a real press) + a **2px amber
`:focus-visible` ring** (a11y). Panels (`.event-banner/.topic-info/.tnode/.sum-row/.inv-cat/
.hero-card/.arena-*/.modal-card/.u-cell`): squared + `box-shadow:none` hard frame. **Clean-text rule
honoured** — no `font-family` in the block, so labels/numerals stay `--display`/`--mono` (kid
legibility); the bitmap font stays decorative-only. Verified **independently**: **full 28-gate suite
green** incl. **`contrast.test.js` AA still green** (bevels are inset shadows — text/bg contrast
unchanged) and the new **`ui-restyle.test.js` (18 checks)** asserting ships-on, the token block,
reversibility (every selector gated; classic intact), bevel+invert-press+focus-ring, squared
hard-framed panels, and the clean-text rule. All **[A]-owned files**. T100 → DONE. *(Owner: eyeball
that it reads "game, not web-app"; `data-ui="classic"` restores today if you dislike it.)*

> **⚠⚠ SEQUENCING — A has now skipped `T107` TWICE** (built `T104`, then `T100`, each time the
> pointer's #1 item was `T107`). Likely A picks the lowest-numbered / most-visible OPEN task and
> `T107` (infra, higher id) keeps losing. Both builds were correct so approved on merits — **but the
> cache-busting SHIPPING BLOCKER is still undone.** Re-pointed below as the SOLE next item; owner also
> offered a direct one-line prompt to enforce it. (See owner note.)

---

**Previously approved (done):** `T95` [B] (semantic home backdrop on `fxgl.js`) · live build
**`beedfd8`**. **CI green.** Third Builder-B handoff, and **picked up with NO human nudge** (the
self-continue is working). **Collision rule honoured** (only `fxgl.js`, `test/fxgl.test.js`,
`BUILDER-LOG-FX.md`). Adds `deriveHomeScene(state)` → a `setScene`-shaped ambient backdrop **driven by
LIVE home state, not noise** (the effect names its purpose: **status**): today's-event palette/seed
**dominate**; **progress raises the horizon glow** (momentum); a **streak ≥3 flips calm motes → warm
embers** ("on a roll"); seed is state-derived so **same state → same backdrop, and it shifts because
the state changed**. `Controller.setHomeState(state)` wires it through `setScene`. Verified
**independently**: `node -c` clean; **full fxgl gate green (82 checks, +15 for T95)** — deterministic
per state, textures uploaded **once**, **single RAF** (one draw/frame), **idles when stopped**
(off-home → no RAF), **reduced-motion → static still** (no loop); **full 27-gate suite green**.
Standalone — the **[A] side** reads real home state (event/progress/streak) and calls `setHomeState`.
T95 → DONE. **Builder B's specced engine trio (T93·T94·T95) is COMPLETE.** Pointer advances to **T108**
(semantic Arena-biome derivation — the Arena sibling of T95) to keep B on collision-free work while
the FX **[A] wiring** is sequenced. *(Note: nothing FX is visible until [A] mounts `FXGL`; the wiring
is the real payoff — see the owner note below.)*

---

**Previously approved (done):** `T104` [A] (legible fraction glyphs ½/¾) · live build **`c6a96da`**.
**CI green.** Replaces the T56 **stacked** vulgar-fraction (a 3-wide vertical num·bar·den that turned
to mud at the ~22px tree-node size) with a **5-wide diagonal slashed** form — numerator top-left
(cols 0–2, rows 0–3), denominator bottom-right (cols 2–4, rows 5–8), a clean staircase slash from
bottom-left to top-right. Only `parse()` frac `w:3→5` and the `stamp()` frac branch change; the token
DSL is **unchanged** (`f12`/`f34`), so `modes.js` `TOPIC_GLYPHS` correctly needs no edit. Verified
**independently** (rendered the actual grids, not just the test): `f12`→`1/2`, `f34`→`3/4` both
`missing:[]`, **visibly distinct**, slash legible, numerator/denominator separated (no crammed
stack); confirmed `f12`/`f34` are the **only** fraction tokens in `modes.js` (no glyph references a
digit outside `SMALL`). `node -c` clean; **full 27-gate suite green** (the width 3→5 change didn't
regress the tech-tree node layout); `glyphs.test.js` (32 checks) asserts the new diagonal form
(5-wide, diagonal corners inked, **no full horizontal mid-bar**, num upper-left / den lower-right,
½≠¾). T104 → DONE. *(Owner: eyeball the Fractions `¾` + Fractions-of `½n` marks at node size — should
now read as the fraction, not a blob.)*

> **Sequencing note:** A built **T104** while I'd re-pointed it to **T107** (the cache-busting
> shipping blocker) — it pulled the queue in the window before the T107 insert was visible. T104 is
> correct, so approved on merits — **but T107 is still undone and is the priority.** Re-pointed below.

---

**Previously approved (done):** `T94` [B] (celebration-burst capability for `fxgl.js`) · live build
**`4a58b3f`**. **CI green.** Second Builder-B handoff — **collision rule honoured** (only the 3
B-owned files: `fxgl.js`, `test/fxgl.test.js`, `BUILDER-LOG-FX.md`; **zero edits to any existing
Halves file**). Adds a brief, transient **celebration burst** to the engine: new public
`FXGL.burst({ x, y, count, seed, palette })` (plus internal `seedBurst`/`burstPos`/`burstMaxDeath`)
animated **in-shader from a static buffer** via a **closed-form drag trajectory** (`exp(-k·lt)` — same
recipe in both the GLSL and WGSL paths), so a burst is a one-time upload + one instanced draw/frame.
Verified **independently** (not just trusting the log): `node -c` clean; **full fxgl gate green (67
checks, +21 for the burst)**. The three spec-critical invariants are each pinned by a test, and I
re-ran them:
- **Capped** — `seedBurst` and a live controller `burst()` both clamp to **`BURST_CAP = 256`** even at
  `count: 99999` (separate budget from the `PARTICLE_CAP = 512` ambient field).
- **Seeded + deterministic** — same seed → byte-identical buffer; different seed → different burst
  (closed-form trajectory, no per-frame RNG).
- **Auto-stops, no leak** — particles self-expire (`alpha 0` before birth / after `birth+life`); the
  controller idles the RAF and **releases the burst buffer** on completion (`burstCount() → 0`,
  `rafId → 0`); a burst **over a running ambient scene** still keeps **one** RAF in flight and **never
  re-uploads** the scene textures; reduced-motion fires a calmer (scaled-down) flourish that also
  auto-stops cleanly.
Standalone (no edits to Halves needed); **[A] wiring is a later task** (fire on reward/loot/event
gains). T94 → DONE. Builder B pointer advances to the **T95 engine side** (semantic home backdrop).

---

**Previously approved (done):** `T99` [A] (home top-band + nav + banner N/3) · live build
**`a3608c0`**. Landed in two passes: the layout/nav came in `d1ac5e0` (good), I changes-requested the
missing third deliverable (premature "Reward earned" tag), and the fix landed in `a3608c0`. **CI
green on `a3608c0`.** All three deliverables now correct:
- **Top-band reclaim** — `body` flips `align-items:center → flex-start` while `.app` keeps its
  `max-height:780px` cap, so on a tall (fullscreen) viewport the leftover falls to the **bottom** and
  every `inset:0` screen starts flush at the top (correct read of the owner's fullscreen-correlation
  note). **Banner pinned** (`#start` pad `20→12`, `.event-banner` margin-top `14→0`, `.tree` `14→12`).
- **Tidy nav** — icon-only `.navbtn.util` dropped; Sound/Settings/Screen become labelled
  `.nav-emoji`+`.nav-lbl` buttons matching the four primary ones (gap `8→6`, one uniform row);
  `syncSoundButtons` flips only the `.nav-emoji` span, fullscreen sync only the `.nav-lbl` span (both
  keep the text label, `innerHTML` fallback).
- **Banner N/3 (the fix)** — `renderEventBanner()` now counts owned tiers across the **exact** keys
  `award()` writes (`["", ":well", ":ace"]` → `got`) and renders
  `got>=3 ? 'All rewards earned' : got>0 ? got+'/3 rewards earned' : 'Today’s event'`; Play CTA flips
  to "Again" only once `got>0`. **No more "Reward earned" on mere show-up** (grep confirms the binary
  string is gone). Verified **independently**: `node -c` clean; **full 27-gate suite green**; the new
  `home-layout.test.js` (now 26 checks) boots the home with a frozen UTC day and seeds **0 / 1 / 3**
  owned tiers, asserting the tag reads `Today’s event → 1/3 rewards earned → All rewards earned`
  (never "Reward earned" at 0), plus a source check the old binary tag is removed. All **[A]-owned
  files only** (no collision). T99 → DONE.

> **⚠ Owner screenshot at `a3608c0` showed the band STILL present + the OLD "Reward earned" tag —
> diagnosed as a STALE-ASSET CACHE artifact, not a T99 regression.** Tell-tale: the content is
> *centered* (≈equal dead bands top AND bottom) = the pre-T99 `align-items:center`; the new
> `flex-start` would push all slack to the **bottom only**. And the banner shows the **old** binary
> tag — which `a3608c0`'s code can no longer produce. Both old behaviours appearing **together** at a
> fresh build stamp ⇒ the browser is serving cached `styles.css` + `main.js`, while `build.json`
> (`cache:"no-store"`) reports the new SHA. Root cause: **assets have NO cache-busting** (bare
> `href="styles.css"` / `src="main.js"`; GH-Pages default `max-age`), and the T54 version-check only
> *offers a manual refresh* — it does not bust the asset cache. **A hard-refresh (or private tab)
> will show the real T99 result.** Filed **`T107` (asset cache-busting)** at the FRONT of Builder A's
> queue: every future owner review is untrustworthy until a deploy reliably ships fresh assets. T99
> itself stands approved.

---

**Previously approved (done):** `T98` [A] (audio too quiet — raised + limiter) · live build
**`5c26f9b`**. `VOL` **0.30 → 0.80** (≈2.7× louder; mute/unmute still toggles 0↔VOL) **plus a
brickwall LIMITER** (DynamicsCompressor, −1.5 dB, knee 0, ratio 20, 3 ms attack) on
`master→limiter→destination` — so clipping is impossible **by construction**, not by estimate;
graceful direct-wire fallback if `createDynamicsCompressor` is unavailable. Verified: `node -c`
clean; **full 26-gate suite green**; `sound.test.js` (+ limiter assertions) confirms `VOL=0.80` in
the 0.70–0.85 band, exactly one compressor wired master→limiter→out (no direct master→destination),
brickwall config (ratio≥20, hard knee, −1.5 dB, fast attack), and **worst-case pre-limiter peak
≈0.508 < 1.0** (limiter is a backstop, not a crutch). T98 → DONE. *(Owner to confirm it's
comfortably loud on the Poco X3.)*

**Previously approved (done):** `T88` [A] (Arena 3v3 battle model + calibration — the crux) · live
build **`f5b44fa`**. (A finished this in-flight before switching to the front-end polish, as noted.)
Faithfully implements the **IDEAS I5** calibration: a deterministic `simulateTeams` (spd order,
fixed targeting best-matchup→lowest-hp→ord, `max(1,round(atk×matchup))`, wipe-to-decision, **zero
RNG**, guard-capped); enemy budget model (`atk×hp=budget`); `FOE_BUDGET` computed at load =
`min(geometric ramp, suffix-min envelope × CAPF)` — **ramp pinned so one starter clears tiers 1–5**,
**tier-120 pinned between near-full & 85% edges**; enemy team = tier foe + 2 `tier−K` adds.
**Additive — `statBattle` (1v1) UNCHANGED, live Arena untouched until T89.** Verified
**independently** (my own lattice via the public API, not just their test): **deterministic**;
**tiers 1–5 winnable by a SINGLE starter at 0 items**; foe budget **monotonic non-decreasing**
(plateaus OK — invariant is non-decreasing); **0 violations of monotonicity in loadout AND team
size**; **tier-120 near-max-only** (full wins · 50% loses · 0 loses); `statBattle` preserved.
`node -c` clean; **full 26-gate suite green** (new `arena3.test.js` 24-check lattice + the 1v1
`arena.test.js`). The literal "one-item flips tier 120" is reframed as the **chunk-flip** (one item
<0.1% of a 3-hero team) with the 1-item flip kept proven for the 1-hero case — sound. T88 → DONE.
**Perf note (→ T103):** `FOE_BUDGET` runs ~hundreds of sims at module **load** — candidate to
memoize. **`T89`/`T90`** (team UI + playout, which wire `teamBattle` into the live Arena) remain,
**after the shipping block** per owner priority.

**Previously approved (done):** `T93` [B] (FX engine `fxgl.js`) · live build **`f3eb20e`**. **🎉
First Builder-B handoff — collision rule honoured perfectly** (only the 3 new B-owned files:
`fxgl.js`, `test/fxgl.test.js`, `BUILDER-LOG-FX.md`; **zero edits to any existing Halves file**).
A standalone WebGPU→WebGL2→CPU-still FX engine: clean `window.FXGL` API (`mount/setScene/start/
stop/setQuality/dispose/capabilities`); Bayer dither + luminance-ramp palette quantise + capped
**deterministic** particle field; `setScene({grid,palette,particles,seed})` where **`grid` is the
exact COLS×ROWS shape `scenery.js` emits** (drop-in for the [A] wiring). Verified **independently**:
`node -c` clean; **zero deps/bundler**; `fxgl.test.js` (**46 checks**) passes — single RAF / one
instanced draw per frame / textures uploaded once / idle when stopped / quality-clamp degrade /
**no-GPU→CPU still** / **reduced-motion→static** / **bundles NO brickmap Rust/WASM** (recipes
ported). brickmap borrowing recorded in `BUILDER-LOG-FX.md`. Correctly **does NOT touch
`pages.yml`** (gate registration is the [A] wiring task). Existing 24 gates still green (B touched
nothing). T93 → DONE. *(The `fxgl.test.js` gate gets CI-registered by the first [A] FX-wiring task.)*

**Previously approved (done):** `T97` [A] (UI-direction research · **doc only**) · build
**`793d7fa`**. `docs/UI-DIRECTION-RESEARCH.md` (241 lines); **doc + BUILDER-LOG only** — no code/
gates touched (verified). Substantively answers (1)–(5), grounded in the **live CSS**: §1 audit
(real `border-radius` tallies, the `.btn radius:14px` pill, 13 soft shadows, Space-Grotesk →
diagnosis "pixel/RPG content in a soft rounded web-app frame"); §2 four UI languages (pixel/8-bit ·
JRPG window · exposed-tech mono HUD · modern angular) each w/ **no-build CSS** (bevel box-shadows,
`clip-path`, procedural 9-slice `border-image`) + harmony + legibility risk; §3 per-component
treatments (buttons-first, real bevel CSS); §4 honest constraints (**pixel-bevel frames NOT body
text** for kid legibility · focus ring · ≥44px · AA · no-build · **`data-ui` token reversibility**);
§5 ranked **pick** (exposed-tech HUD + pixel-bevel low-radius buttons + JRPG framing on big screens;
clean text) + a **buttons-first reversible phased plan** + **FX co-design** + success/kill criteria.
Concrete + reversible, not a punt. T97 → DONE. **4 open questions raised for the owner** (relayed in
chat) — the restyle itself is a later task pending the owner's direction pick.

**Previously approved (done):** `T96` [A] (home-screen overhaul) · live build **`0d19c72`**.
Addresses both owner screenshots. `#start` is now **`justify-content:flex-start`** (top-aligned —
kills the empty top band); the **big top `#mark`/`#tag` are gone**, consolidated into **one compact
`#topicInfo` row** (glyph · name · have/total · best — no more duplicate top-mark + detail panel);
the **List/Tree toggle + home list (`#modeTabs`) are removed → tree-only home picker** (`.tree` is
the `flex:1 1 auto; min-height:150` element, takes the freed space); the banner Play CTA is a small
**pill**; the nav is **one `#navRow`** of icon buttons (Best/Items/Heroes/Arena + util sound/
settings/fullscreen) with `.navbtn.hidden` so it **degrades under gating**. A big, clean deletion
(`-148` main.js: `renderTabs`/`modeRow`/`renderMark`/`renderBest`/`setPickerView`/`updateScrollCues`/
the toggle). Verified **independently**: `node -c` clean; **ZERO orphan references** to the removed
ids/functions (grep clean — no dangling `$("mark")`/`renderBest`/etc.); **full 24-gate suite green**
(tech-tree updated to **tree-only + Best-Times list fallback**, events banner-above-tree, glyphs
`.ti-glyph`, practice/guide-action select-via-tree). T96 → DONE. *(Headless can't judge the final
look/one-screen fit — **owner to eyeball** that the tree now breathes and it fits.)*

**Previously approved (done):** `T92` (event reward tiers) · live build **`dff92ea`**. **⚠️ Built
OUT OF ORDER** — `T96` (home overhaul, owner-active) was queued ahead but the Builder pulled `T92`
(race: started it before the T96 insert was visible). T92's work is sound, so approving; **`T96`
is firmly next.** Closes the skip-to-win exploit: each event now has **3 tiers** —
**participation** (kept `event:<id>` id/name/rarity, migration-safe; = completion), **`:well`**
(rarity +1; ≥0.7 clean-score) and **`:ace`** (legendary; flawless `score===total`). `eventTiersEarned`
is **skip-proof** (skips never enter `times`/`score`, so they can't reach the higher tiers);
`finishEvent` grants every earned tier **live-only + idempotent per tier**, **upgrading on replay/
recurrence** without removing owned. 42 event collectibles (14/14/14), all carrying buffs (feed
Arena). Verified **independently**: 42 items, ascending rarity per event (ace=legendary), **0**
missing buffs, **0** digit leaks; tier logic 0/12→participation, 9/12→+well, 12/12→+ace; **Arena
re-proved on the grown pool** (`arena.test.js` green, def auto-scaled 523→583); catalogue 818→846;
`node -c` clean; **full 24-gate suite green** (`events.test.js`→87). T92 → DONE.

**⚠️ Sequencing note:** Builder skipped the higher-priority `T96` (second slip from a queue-pull
race). No harm — T92 is correct — but `T96` (home-screen overhaul the owner is actively iterating)
is now firmly the next task.

**Previously approved (done):** `T87` (onboarding gating II) · live build **`ad0e6cc`**. **🎉
Completes the gating block (T86+T87).** Wires the full ladder on the T86 engine: Practice←first
`init:`, Heroes←first loot/mastery, Arena←a hero owned, Gold/Momentum readouts←first earned, the
**event banner←≥3 games** (owner's "a few runs"), each revealed with a **one-time coachmark**
(highlights now a **queue paced by the toast cap** — no spam). `checkGates()` evaluates on
return-home/init; `applyGates()` hides each gated control (multi-element, e.g. Gold+Momentum);
`renderEventBanner()` withholds the banner until unlocked (live/countdown unchanged once shown);
deep-link guards added for `#/heroes`, `#/arena`, `#/hero/*`. **Migration-safe** (legacy = all
unlocked, never re-gated). **Access layer only** — `arena.test.js` green. Verified independently:
`isHeroUnlocked` exported by `heroes.js`; `node -c` clean; **full 24-gate suite green** incl.
`onboarding.test.js` extended to 50 checks (each milestone's unlock, the ≥3-games banner withhold,
deep-link blocks, full legacy bypass). T87 → DONE.

**Previously approved (done):** `T91` (BUGFIX: compact event banner) · live build **`303c072`**.
Fixes the owner-reported home-layout break: `renderEventBanner()` is now a **compact strip** —
84×54 emblem · tag+name+inline countdown · an **inline Play** button — with the **multi-line blurb
dropped** from the home banner (still on the play screen). `.event-banner` is bounded
(**`max-height:84px`**, ~280px→84px), `.picker-wrap` gains **`min-height:148px` (~3 rows)** so the
banner can't starve it, margins tightened throughout, and `#eventBanner` **moved above `#mark`**
(order: banner → mark/tag → toggle → picker) so the selected-topic mark isn't stranded. Keeps art
+ name + **Play→`startEvent`** + the **00:00-UTC countdown** (owned → "Reward earned"/"Again"); bumped
`.eb-tag` to 10px (contrast gate). **T86's `applyGates`/gated `invBtn` still intact.** Verified:
`node -c` clean; **full 24-gate suite green** incl. `events.test.js` +5 T91 checks (bounded height,
no home blurb, picker min-height, banner-above-mark, Play+countdown preserved). T91 → DONE.
*(Headless can't measure true pixel-fit; the CSS budget reclaims ~240px so `#start` should now fit
one screen — **owner to confirm on-device** it no longer scrolls on their phone.)*

**Previously approved (done):** `T86` (onboarding gating I) · live build **`0fe0608`**. **⚠️
Built OUT OF ORDER** — `T91` (the priority banner-layout bugfix) was queued ahead of it but the
Builder pulled `T86` (it pulled the queue before the T91 insert was visible). T86's *work* is
sound, so approving it; **`T91` is still OPEN and is now firmly the next task.** The onboarding
engine: `halves.unlocked` model with `isFeatureUnlocked`/`unlockFeature`/`needsIntro`.
**Migration-safe (verified):** `profileHasProgress()` (any collected / `stats.games>0` / any board)
stamps `{legacy:1}` → **all features unlocked, never re-gated**; only a genuinely empty profile is
gated. First-run: `startIntro()` runs **ONE** trivial question ("half of 12"→6, numpad-safe, not a
topic round); solving grants its reward (`solve:halves:12`) + `unlockFeature("inventory")` + a
**one-time** pulse/coachmark; skipping still completes (never traps). `applyGates()` hides the
Inventory nav until unlocked; the `#/inventory` deep-link is guarded. **Access layer only** — earn/
collection/Arena untouched (`arena.test.js` green). Verified independently: `node -c` clean; **full
24-gate suite green** incl. new `onboarding.test.js` (23 checks: fresh-vs-**legacy migration**,
single-question intro, Inventory unlock+reveal+reward, once-only highlight, deep-link block,
reload persistence). T86 → DONE.

**⚠️ Sequencing note:** Builder skipped the higher-priority `T91`. No harm (T86 is correct), but
`T91` must come next — and T91 now also needs to account for T86's home-screen additions
(`applyGates`, the gated `invBtn`). Recorded so the ledger stays accurate.

**Previously approved (done):** `T85` (Settings + "Clear all data") · live build **`ebc4182`**.
A new **Settings screen** (reachable via a `⚙ Settings` link on home; mute toggle folded in) with a
**Danger-zone "Clear all data"** behind real friction: a `#resetModal` needing **BOTH** a 5s
**countdown** AND re-entering a shown random **4-digit code** on the numpad — `resetCanConfirm()`
gates the button, with a **double-guard** on the Confirm click; cancel/backdrop safe.
`clearAllData()` wipes via a **`halves.` prefix scan** (catches every key) + enumerated + per-mode
`halves.hof:*` board fallbacks, drops in-memory caches, and **reloads to first-run**. Verified
**independently**: **every** localStorage key the app writes is `halves.*` (incl. `LAST_KEY=
"halves.mode"`, `boardKey="halves.hof:"+id`) so the scan is total; `node -c` clean; all new ids
resolve; **full 23-gate suite green** incl. new `settings-reset.test.js` (16 checks: wrong-code →
no wipe, early-press → no wipe, **both-conditions enable**, confirming clears **every** key incl.
an **unknown future key + per-mode board** → first-run + reload). T85 → DONE. *(Note: the Settings
screen's own access will be folded into the T86/T87 onboarding gating; not a T85 issue.)*

**Previously approved (done):** `T84` (tech-tree view) · live build **`82cf48a`**. **🎉 Completes
the Phase 6.8 tech-tree block (T83+T84).** A toggleable, **data-driven** tech tree on the picker:
`techGraph()` derives the spine from `unlockedBy` and Part-2 branches from `requires:"mastery:<id>"`
(live mode fields, graceful on orphans — **no parallel edge list**); `nodeState()` =
locked/unlocked/mastered/done from `isUnlocked()`+progress. Nodes are **focusable `<button
role=tab>`** with the topic icon via a **single swappable `nodeIcon()` hook** (T56 glyph today,
richer T82 art later), a badge, and `have/total`; a selected-node detail panel reuses the shared
T83 Play/Practice/Guide actions. **Locked nodes select-for-preview but never start.**
`setPickerView()` toggles **List⇆Tree and persists** (`halves.pickerView`); the grouped **list
stays the default a11y fallback**. Verified **independently**: data carries the edges (15 modes,
single `halves` root, 9 `unlockedBy`, 5 `requires:mastery`, none dangling); `node -c` clean; **full
22-gate suite green** incl. new `tech-tree.test.js` (20 checks: spine/branch edges = live data,
every mode once, fresh-profile states, toggle+persist, **locked-not-startable**, list-fallback
restored, `nodeIcon` hook). 360px-safe (≤2-wide rows, 84px nodes). T84 → DONE.

**Previously approved (done):** `T83` (guide → first-class Play·Practice·Guide action) · live
build **`fdd9313`**. A third **"Guide"** button joins Start + Practice in `.start-actions`;
`renderStartState` gates it on `Guides.has(mode.id)` (enabled even for **locked** topics so
their guide can still be previewed — Start/Practice stay lock-gated). The per-row **`?`**
(`.mr-guide`) markup + handler are **removed**; picker rows (incl. locked) are now **selectable**
for preview, and `start()` still hard-guards `isUnlocked`. CSS resized the action row
(`flex:1 1 0; min-width:0`, gap 12→10, padding trimmed) so **three buttons fit at 360px**.
Verified **independently**: `node -c` clean; **zero `mr-guide`/`data-guide` orphans** in
js/css/html; **full 21-gate suite green** incl. the new `guide-action.test.js` (11 checks:
peer placement, enable-with-guide, disable-without-guide, **locked-topic preview still opens**,
modal open/close, orphan-removal). T83 → DONE.

**Previously approved (done):** `T82` (visual-direction deep research · doc only) · build
**`7278b94`**. New `docs/VISUAL-DIRECTION-RESEARCH.md` (339 lines); **only the doc + BUILDER-LOG
changed** — zero `.js`/CSS/HTML/gate touched (verified), so all gates stand. Substantively
answers (1)–(7): §1 aesthetic teardown → 7 voxel-free techniques w/ real impl + cost (Bayer
dither, palette-ramp LUTs, instanced particle splats, atmospheric fog, banding, mono HUD, chunky
forms); §2 a build-ON inventory of every generator + a grid→texture→shader composition plan
(guardrail honoured); §3 all 5 stacks scored vs the **3 crown jewels** w/ a scorecard; §4 real
Android delivery (TWA/Bubblewrap → AAB, manifest+SW+assetlinks, API 26, **WebGL2 baseline /
WebGPU progressive**, cheap-tablet fill-rate, clean COPPA) tied to T72; §5 perf principles +
degrade ladder + keeping `perf.test` meaningful; §6 a **Node-verification-preserving** gating
plan (pure-fn + budget-invariant + WebGL-stub tests) w/ honest limits; §7 ranked pick + phased
A/B/C plan w/ explicit **spike success AND kill criteria** ("revert = one commit"). **Recommends
(a) hybrid DOM + WebGL2 FX layer + (e) TWA delivery**, composing — never replacing — our seeded
generators. **Honesty noted + correct:** discloses `00-1/brickmap` is out of the Builder's GitHub
scope (halves-only), so it didn't read the source — teardown is from the owner screenshots +
standard techniques, inventing no internals, flagging re-verification if the repo is scoped in.
Doc-only, deploy-safe, all gates green. T82 → DONE. **Open questions raised for the owner** (relayed
in chat): primary cert device; strictly-Node vs one elective Playwright visual check; WebGPU
appetite; confirm the brickmap=Rust/wgpu attribution.

**Previously approved (done):** `T81` (event presentation — emblem art · music · home banner) ·
live build **`4990953`**. **🎉 Completes the Phase 6.5 Events block (T78→T81).** New standalone
`eventart.js` (`window.EventArt`): a seeded **heraldic-crest emblem** generator — its own visual
language (anti-dilution, not a reskin), static draw. `sound.js` adds a dedicated calm event
theme **"Festival Day" (EVENT_STYLE 17, 92 BPM)**, routed in during the gauntlet (`eventCtx ?
"event"`). `main.js` `renderEventBanner()` puts a **prominent banner on the home screen (`#start`,
above the picker)** with the emblem art, name/blurb, a **Play CTA that routes into the live
event**, and a **live countdown to 00:00 UTC** (ticks only while home is visible; re-renders on
rollover; owned-today reads "reward earned"). The **T80 tint fixup** is done properly: new
`--amber-weak: rgba(245,181,68,.12)` token replaces the invalid `var(--amber)1f`. Verified
**independently**: EventArt is **14/14 unique (100% pairwise distinct)**, deterministic, valid
hex, static (no RAF/timers); event theme **92 BPM ≤95 + density 0.30 ≤0.4** (calm/volume hold,
max BPM across all styles still 95); the banner is gated to live inside `#start` before the picker
(home-screen prominence locked in), countdown targets `(epochDaysUTC+1)*DAY_MS`, CTA → `startEvent`;
old invalid CSS **gone**; no Arena event-gate UI. `node -c` clean; **full 20-gate suite green**
(`events.test.js` now 77, `sound.test.js` extended). T81 → DONE.

**Previously approved (done):** `T80` (best-attempt board: event entries + live-window lockout) ·
live build **`135b9a6`**. Events now appear on the Best Times board: a new **event best-attempt
store keyed by EVENT id** (`halves.eventBest`, same `rank` order as topic boards) so the best
**persists across the 14-day recurrence**; `finishEvent` records it. A "Daily Events" section
renders **today's** event **LIVE + routable** (`data-event`, amber, shows its best) and the other
13 **LOCKED** (visible, "Live in N days", **no `data-event`** → not routable). `isRetryable(id) =
Events.isLive(id)`; the `sumList` tap routes only live `data-event` rows into `startEvent`. Good
defensive fix: `start()`/`startPractice()` now clear `eventCtx` so an abandoned event can't
misroute a later `finish()`. `EventPlay` gains `isRetryable` + `bestOf`. Verified
**independently**: full **20-gate suite green** (`events.test.js` now 62), incl. a DOM drive that
proves lockout/routing AND **best-persistence across a simulated 14-day recurrence** (prior best
survives the gap, routable again, beating it updates the stored best, reward stays owned). `node
-c` clean; migration-safe (new key, additive). **Non-blocking nit (tracked → fixed in T81):** the
live row's inline `background:var(--amber)1f` is invalid (resolves to `#F5B544 1f`, dropped), so
the subtle amber tint silently doesn't apply — purely cosmetic (the row is still marked by its
amber rankdot + "Live today"); added as a **required carry-over fixup in T81's DoD**. T80 → DONE.

**Previously approved (done):** `T79` (Event play mode — cross-topic gauntlet) · live build
**`67f9fe2`**. `events.js` gains a pure, dependency-injected **`buildGauntlet(eventId, modes)`** —
a **deterministic** per-event set (seed = `hashStr(id) ^ artSeed`): each topic's fixed pool is
**canonicalised to a TOTAL order** (numeric collator + raw-string tie-break) so `build()`'s
per-round shuffle can't leak, then a seeded pick takes `n`, then a seeded interleave. `main.js`
adds `startEvent()` (live-only, tags each question with its source `_mode`, reuses the round
engine) and `finishEvent()` (branched in `finish()`): grants `event:<id>` **only while still
live at finish** and **once** (idempotent), pays **no Gold**, and `correct()` **suppresses Gold +
topic Beat/Spark** during events (no item leakage). A "Live today" play strip on the Events tab
is the entry; `window.EventPlay` exposed for T80/T81. Verified **independently** across all 14:
**byte-stable** across calls *and* a fresh module boot; set length = Σ min(n,pool); **14/14
distinct**; **zero** NaN/negative/non-number answers — the 29 non-integers are legit decimals
(bonds-to-1, decimal place value, fractions-as-decimal, odd halving), each **native to its
topic's `build()`** so numpad-safe by construction. The hint/eyebrow use the per-question
`_mode` (`qm = it._mode || mode`), so cross-topic events show the **right** method. `node -c`
clean; **full 20-gate suite green** (`events.test.js` now 45 checks, incl. a DOM end-to-end:
reward-on-complete, idempotent replay, off-day cannot start). T79 → DONE.

**Previously approved (done):** `T78` (Events foundation) · live build **`fe004d7`**. New
standalone `events.js` (`window.Events`): a **pure, offline, deterministic UTC-daily scheduler**
— `indexFor(now)=((floor(now/86.4e6) % 14)+14)%14`, `today/isLive/daysUntilLive`, clock
**injected** (no `Date.now` baked in, no network/storage/timers). A **14-event roster** with
real, distinct, evocative copy (no answer leaks), each carrying a themed **cross-topic
`questionMix`** (T79 reads it) + reward + art/music seeds. `collectibles.js` adds an **"Events"
category** registering one `event:<id>` reward per event as a **real collection member** (guarded
on `window.Events`); `evaluate()` skips the Events cat (granted by completing the live event in
T79). `main.js` adds the **"Events" inventory tab** (ordered by the roster); Awards excludes
Loot + Events. Verified **independently**: all 14 `questionMix` topics are valid mode ids;
each reward carries a real hero **`boost:{hero,stat,amount}`** (e.g. Solstice Keystone →
roon/power/8) so they feed Arena power; the **UTC boundary flips exactly at 00:00 UTC**
(23:59:59Z vs 00:00:01Z), holds across the day, and **recurs every 14 days**; `indexFor` stays
0..13 incl. negative epochs; **no `=`/answer leaks** in names/blurbs; catalogue 804→818 (+14).
**Arena re-proved on the grown pool** — `arena.test.js` now loads `events.js`, and still proves
tiers 1–5 winnable at 0 items, no tier behind its own loot across all 120, and the final-tier
near-full flip. `node -c` clean; **full 20-gate suite green** (new `events.test.js`, 28 checks).
Migration-safe (additive, guarded). T78 → DONE.

**Previously approved (done):** `T56` (pixel-art app mark + topic glyphs + favicon) · live
build **`a700348`**. New standalone `glyphs.js` (`window.Glyphs`) — a pure, deterministic
5×7 (+3×4) pixel bitmap font covering exactly the symbols the glyphs use (`0-9 x a b n k`,
`× ÷ + − ± / %`, stacked fractions `½ ¾`, superscript `²`); ink codes 0/1/2 (empty/body/accent),
static draw (no RAF). Driven by structured `glyphTokens` added to all 15 modes (the old
`glyph` HTML kept as a fallback). `paintGlyph()` wires it into the start mark, entry brand,
guide/practice titles and the topic toast; `installFavicon()` mints a runtime favicon +
apple-touch-icon + theme-color from the same renderer (data-URL, try/catch-guarded). Verified
**independently**: built all 15 grids — **pairwise distinct**, **zero missing chars**, **every
glyph carries the amber accent**; each `glyphTokens` mirrors the original operator (incl. the
place-value pair, both `×÷` differing only by which symbol is accented — the DoD's "÷×"
shorthand). amber/text inks on `--bg` keep the existing AA. `node -c` clean (glyphs/modes/main);
the **full 19-gate suite is green** (new `glyphs.test.js`, 27 checks, wired into CI); no
regressions. T56 → DONE.

**Previously approved (done):** `T55` (Collector ladder → 10,000) · live build **`d35b2aa`**.
The 3-tier list became a **12-tier ramp** (25, 75, 150, 300, 500, 750, 1000, 1500, 2500,
5000, 7500, 10000). Existing ids `collector:25/75/150` preserved with their rarities
(migration-safe); the 150 tier renamed `Completionist`→`Magpie` (display only). New 300+ tiers
additive + legendary, varied British names (Antiquarian/Archivist/Loremaster/Vaultkeeper/
Reliquarian/Hoard-Lord/Treasure Dragon/Grand Conservator/Keeper of the Myriad), comma-formatted
descs ("Collect 2,500 items."). `evaluateCollector` unchanged. Verified **independently** (not
the Builder's test): recomputed the granted set at 0/24/25/150/1045/3000/10000/250000 →
0/0/1/3/7/9/12/12, **exactly tiers ≤ count**, never re-awards owned, all icons auto-generate
(0 errors). Gates green: new `collector.test.js` (20) wired into the workflow, `hero-icons`
catalogue 795→804 with **item icons byte-identical** (baseline 0 changed), `icon-variation`
(5), `inventory` (24, no 360px overflow). `node -c` clean. T55 → DONE.

**Previously approved (done):** `T73` (AI-smell left-borders → coloured square) · build
`0f7796f` — removed `border-left-color` accents from `.hd-boost` + `.map-row` (zero
`border-left` rules remain), replaced with a sharp 10×10 `.row-sq`; hero-detail (13) +
wayfinding (13) green.

**Previously approved (done):** `T74` (topic unlock requires genuine engagement) · build
`e7905c0` — skipping every question no longer grants `init`/unlocks; gate `answered ≥
ceil(total/2)` (`INIT_ANSWER_FRAC = 0.5`, tunable); all-skipped stays LOCKED, migration-safe,
Practice unaffected; `init-gate.test.js` (11) + full 17-gate suite green.

**Previously approved (done):** `T54` (version check + Update button) · build `8af41a5` —
`build.json` poll + dismissible Update bar, user-tap reload only, offline/local no-op; 9 checks.
Plus two **off-script** owner-prompted changes reviewed & blessed: `6c84af8` results "Modes"→
"Back" (text-only); `8af41a5` rank rewards `rankIndex===i`→`>=i` (genuine fix — backfills lower
ranks, un-skips darkwizard/archmage hero unlocks; verified additive + migration-safe + no
Arena-calib impact); and `74ac75e` dropped results "Play again" (clean, no dangling refs).

**Previously approved (done):** `T53` (procedural region scenery) · build `a6e6583` —
standalone `scenery.js`, 10 themed backdrops behind the tier card; the `rgba(8,10,14,0.64)`
scrim keeps text AA over the brightest scene cell (`--text` 13.3:1, `--muted` 5.83:1); 7 checks.

**(Note re off-script work:** prompting the Builder directly bypasses this review queue; the
four direct changes so far were all sound + gate-green, recorded as T75/T76/T77 DONE in
BACKLOG. Flagging only so the ledger stays accurate.)

**Previously approved (done):** `T52` (procedural enemy sprites) · build `f3cc9ae` — standalone
`monsters.js`, high variation (≥90% distinct), region/type-themed, bosses bigger+crowned;
9 checks.

**Previously approved (done):** `T68` (Arena wayfinding) · build `6efff87` — region header
(region N/10 · tier P/12) + pips, "⚔ Boss next" + facing-boss banners, a toggleable journey
map (10 regions: conquered/here/locked + boss landmarks), and a region-clear moment naming
the next region. All from the Enemies region API; `wayfinding.test.js` (13) green. (Minor
non-blocking: locked map rows `opacity:.7` dims `--muted` slightly under AA — owner may bump
to `.85`.)

**Earlier approvals — all DONE on `main` (build SHA · summary):**
- `T66` · `2eb669a` — Arena → 120 tiers (10 regions × 12); every buff-gating invariant
  re-proved at 120 (no tier behind own loot, tier 120 ⇔ near-full, one boost flips); 29 checks.
- `T67` · `d7eb533` — hero detail view: full owned boost list untruncated + "X/Y collected"
  (real per-hero total); 13 checks.
- `T71` — calmer music (all styles ≤95 BPM, busy ones softened) + 15 distinct per-topic
  styles + a dedicated "Hero's Arena" theme; 20 sound checks.
- `T69` — audio volume raised (master 0.30, music 0.09), no clipping (worst-case ~0.19); 11 checks.
- `T65` — Arena scrolls to top after a fight (in `finishBattle` only); 26 arena checks.
- `T70` — hint clarity pass (twentieths → scale-to-hundredths; vague phrasings made concrete).
- `T64` — mid-round toasts capped (2) + queued + band height-bounded; 7 checks.
- `T63` — tap-to-reveal hint surfaced in normal rounds (clock/scoring untouched); 14 checks.
- `T62` — methodical place-value-aware hint audit across all 15 topics (every hint read); 13 checks.
- `T57` — scrubbed the school/town/county names (repo-wide grep zero); doc-only.
- `T50` — procedural icons on the 4 menu buttons + Arena hero portraits; 16 checks.

**Next-task order:** **`T55` → `T56` → Events block `T78`→`T79`→`T80`→`T81`**, then content
extension (`T58` playbook → Wave-2 batches `T59`/`T60`/`T61`), then **`T72`** (Play Store
readiness). *(Events brought forward by the owner 2026-06-21 — slotted after the two small
polish tasks, ahead of the content wave; reorderable on owner's word.)*
### Two-Builder queue (see `ORCHESTRATION.md`)
- **Builder A — next: `T128`** [A] · **OWNER-PRIORITY · LIVE BUGS** (**`T127`/`T125`/`T121`/`T122` DONE**).
  *(Read `NEXT.md` fresh — canonical.)* **`T128` — three owner-tested live bugs the green gates miss
  (MUST verify in a real browser):** (1) **music never swaps** per screen — `musicSpec()` passes no
  `progression` so every context shares the engine's default chords → use `Synth.setContext(name)`'s
  distinct contexts + apply the T113 tempo; (2) **no wub on win** — verify `play("wub")` fires AND
  wobbles (LFO may only run in the scheduler → flag [B] if a one-shot can't wobble); (3) **no
  celebration visuals** (still, post-T125) — repro live; likely the 2nd WebGL context (`#fxBurst`)
  failing vs the working backdrop → consider sharing one canvas/context (flag [B] if engine-level).
  Full DoD `T128` (live-verified — gates are necessary-not-sufficient here). → **`T123`** (a11y contrast
  floor + honest `contrast.test`) → **`T124`** (fraction tree-glyphs bigger/clearer using node width) →
  **`T101`** (Start delay) → **`T102`/`T103`** (Android PWA+TWA + perf) → **`T89`/`T90`** (Arena 3v3) →
  content **`T58`–`T61`** → **`T72`**.
  **SEQUENCE LOCKED (Babysitter owns it — owner delegated 2026-06-21 "you choose order, you own
  that"). Theme: finish-what's-visible → install & perform on Android → deepen gameplay & content →
  submit.** Authoritative order — **BUGFIX FIRST, then AUDIO/POLISH BLOCK** (owner is focused on it):
  **`T118`** (BUG: Skip cut off on `#game` — T112 safe-area regression) → **`T114`** (owner-calibrated
  audio defaults: volume 3.0×/max 4.0×, tempo 0.5×) → **`T115`**
  (music with CHARACTER) → **`T116`** (restore the tree's scroll-affordance fade/cue — a small T96
  regression the owner spotted) → **`T117`** (replace ALL chrome emoji with house generative pixel
  icons — owner pass; padlock/speaker/cog/coin/calendar + the full swept set) → **`T101`**
  (Start→fullscreen delay — quick, owner-flagged, leads the perf work) →
  **`T102`** (Android PWA+TWA — installable parity build, now that the web UI is
  stable) → **`T103`** (Android-inclusive perf research — needs T102 to profile) → **`T89`/`T90`**
  (Arena 3v3 team UI + playout) → content **`T58`** blueprint (Babysitter drafts it **in the background
  now** → owner approves → build) → **`T59`/`T60`/`T61`** → **`T72`** (Play-Store submission). The
  Arena-biome FX (T108) is already wired (T112); celebration/home FX done. **`T114`** (set the
  owner-calibrated volume/tempo as defaults) slots in once the owner reports values — ideally **after
  T115** so the music is final when they calibrate. Owns ALL existing Halves
  files; log = `BUILDER-LOG.md`. *(Do them in this order; don't pull a later task forward.)*
- **Builder B — next: STAND BY (`T126` DONE — `FXGL.celebrate()` big shower shipped & approved; `T120`
  synth engine + mute-fix DONE).** Both engines complete; the remaining value is the **[A] wiring**
  (`T125` — wire `celebrate()` everywhere + fix the burst-never-resized rendering bug), which B can't do.
  **Keep watching `origin/claude/agent`:** the moment `T125` (or any wiring) surfaces a real engine gap
  (a missing hook, a bug), that's your next task. Otherwise idle (optional light brickmap hardening).
  **B-owned files only; never touch existing Halves files; never push `claude/agent`.**

**Gating block (T86+T87) COMPLETE; `T92` event tiers DONE.** **Builder A: do `T96` next** (was
skipped once — do it NOW; owner is actively iterating the home screen). Home-screen overhaul —
owner-reported via screenshot: top-align `#start` (kill the empty top band + consolidate the selected-topic mark into
the info row), **remove the List/Tree toggle → tree-only home picker** (list stays on Best Times)
so the tree gets real space, **fix the oversized banner Play/"Again" button**, and collapse the nav
into **one row of bigger icon-buttons** (degrading as gating hides items); still fits one screen
(T91). Then **`T97`** (UI-direction **research**, doc only — a "gamey, less web-2.0" UI that fits
our aesthetic; **buttons-first** restyle plan; the actual restyle is a later task on owner go).
Then **`T92`** (event reward tiers: keep an easy participation reward but add **skip-proof**
"did well" + "extremely well" tiers — **sequenced before the Arena** so its re-calibration sees the
full reward set). Then the **Arena 3v3 block** (Phase 6.10): **`T88`** (deterministic 1–3 vs 3
battle model + enemy teams + re-calibration + invariant sim-proofs — the crux; design in IDEAS I5)
→ **`T89`** (team-selection UI, 1–3 heroes) → **`T90`** (watchable turn playout). Then the **FX
layer** (Phase 6.12 — owner mandate: bold, brickmap-borrowed, **always semantic**): **`T93`**
(`fxgl.js` WebGL2 foundation + **Arena biome ambience** — sense of place) → **`T94`** (celebration
FX on wins + collectible/loot/event gains) → **`T95`** (semantic home backdrop). *(Brickmap access:
`00-1/brickmap` likely needs adding to the Builder's scope so T93 can borrow its shaders — owner
action; flagged.)* Then content extension `T58`→`T59`/`T60`/`T61`, then **`T72`** (Play Store; folds
in the T82 TWA/manifest/SW plan). Specs in BACKLOG; this line is authoritative.

**Batching — LOCKED (owner delegated the call).** The 8 Wave-2 topics ship in **3 thematic
batches**: **T59** Rounding + Larger ×/÷ · **T60** Money/Time/Metric (measures) · **T61**
Ratio/Mean/Sequences (reasoning). Rationale (reconsidered): the *measures* group is
strongly coherent (shared coin/clock/ruler art + name theme), A and C are clean splits of
the rest, and the batch order doubles as a sensible unlock-chain / difficulty progression
(core number → measures → reasoning). Each batch is one reviewable unit that re-proves the
Arena buff-gating once on the grown pool. Not per-topic (too much overhead) nor one mega
task (unreviewable).

**Final state:** 15 educational topics (Part-1/Part-2, fixed curated sets, mastery
gates), procedural SFX + chiptune, 12 heroes, a 120-tier Arena with battle/loot
(beatable only at near-full collection), 50 procedural icon categories with
per-item variation, ~1045 collectibles with unique characterful names, Goblin Gold,
a forgiving day-counter, a per-question practice/review view, per-topic guides, and
two CI gates (icon-variation + perf). Quality bar held throughout: every task
independently re-verified; the last 16 approved first-pass.

When you (Builder) hand off a task, I will replace this with one of:

- `APPROVED — T<n>` + a note, then I flip T<n> to `DONE` in BACKLOG and open the
  next task. Continue to the next `OPEN` task.
- `CHANGES REQUESTED — T<n>` + a numbered list. Address **every** point fully
  (no deferrals), re-verify, re-handoff.

I review against the task's Definition of Done and the Quality bar in
`PROTOCOL.md`. Pull this file (`git pull --rebase`) after each push and before
starting new work.

---

## Log of verdicts

### T45 — Performance / CPU / memory audit → APPROVED — 🎉 BACKLOG COMPLETE
Final task. Honest, thorough audit: 4 long-lived resources proven already bounded, 1 real leak found and fixed. Verified (Node): node -c main.js OK; no stub; **main.js diff is exactly the 3-line `show()` guard** (`if(name !== "game" && raf){ cancelAnimationFrame(raf); raf = 0; }`) — no scope creep. **`node test/perf.test.js` → ALL 8 PASS**: fx RAF idle before/at/after a burst (80 frames → liveCount 0); **0 listeners added** over 4× full nav cycles + 18 tab switches (35→35); Loot lazy-render renders-then-releases; game-clock RAF present in-game then **cancelled on leave (1→0)**. The fix is correct (game loop re-arms via `start()`→`loop()`; only non-game navigation cancels) — normal rounds unaffected. fx + music scheduler idle (scheduler stops on mute/hidden, voices capped at MAX_STEPS_PER_TICK=4, oscillators start/stop paired); localStorage bounded (fixed key set, overwrite not append). **Both Node gates (icon-variation + perf) wired into the Pages workflow.** Catalogue 1045. No regressions.

### T30 — Deep content review → APPROVED
Written review + 2 justified fixes. Verified (Node): node -c (modes/guides) OK; no stub. **Squares trimmed to 17** (16²–19² removed — beyond GL recall band; 2²–15² + 20²/25²/30² kept) → within the 11+ difficulty cap. **Decimal glyph normalised to "."**: **0 "·" remain** in any guide text or `explain()` output (all topics scanned). No duplicate prompts; all answers exact/numpad-safe; explain() non-empty + correct for all 316 questions; catalogue 1053→**1045** (−8 = squares Beat/Spark for 16²–19²); names still globally unique; icon test green. **Completeness gaps flagged (not built, per scope):** rounding, ratio/proportion, mean, money/change, time durations, metric conversion, sequences, larger ×/÷ — the natural Wave-2 block for the owner to decide on. Difficulty otherwise within band (upper-but-legit kept: placevalue2 6÷1000, fractions 1/16). No regressions.

### T13 — Question-set audit pass → APPROVED
Conservative, well-judged content pass. Verified (Node over the live sets): node -c OK; no stub; **0 topics with duplicate prompts**; **every answer exact/non-negative/numpad-safe/≤5 digits** (0 bad); counts all ≥21 (halves 26 benchmark). The 3 targeted changes confirmed: fractions +9/20/11/20/17/20 (0.45/0.55/0.85 — terminating twentieths, link to %; count 21); fractionsof +"1/3 of 60"=20, −"1/5 of 45" (balances ⅓); percentages +"10% of 150"=15, −"10% of 130" (common base). Catalogue 1047→1053 (+3 Beat/+3 Spark), names still unique; `explain()` correct for the new prompts; icon test green. Builder correctly left the already-strong sets unchanged. No regressions.

### T32 — Per-question Practice / Review view → APPROVED — Phase 4 complete
New `#practice` screen + `explain()` + `halves.qbest` store. Verified (Node + DOM shim): node -c OK; no stub. **`explain(modeId,q)` non-empty for all 317 questions (0 empty/fallback)** and samples mathematically correct (per-topic method applied to the numbers — "75% is a half plus a quarter: 75% of 40 = 30", "Find one quarter, then take 3: 20÷4=5, ×3=15", place-value digit-shifts). **`recordQbest`** (array signature): records, keeps the **min**, ignores worse times, **ignores fumbled `miss>0`**, migration-safe; `qTileColor` null→none, time→colour. **Critical owner requirement met:** `finishPractice` only `saveQbest`+re-render — **no round-level award, no Gold, no momentum, no best-time board**; only the attempt's Beat/Spark (granted in `correct()`). Builder's regression harness: normal rounds still earn everything + record qbest; battle/icon/uniqueness/final-tier invariant all intact. **Non-blocking nit (→T30):** guides use "·" decimals, explain()/prompts use "." — normalise. No regressions.

### T27 — Per-topic "how to beat it" guides → APPROVED
New `guides.js` (`window.Guides`), guideModal added, "?" control on every picker row (incl. locked = preview). Verified: node -c OK; no stub; **all 15 modes have a guide, 0 missing, 0 orphan**; each well-formed (intro + 2–4 tips + example); British English (no US "math"). **Babysitter maths audit (every guide, line-by-line): ALL correct** — e.g. halves bridging (48→24), addsub bridging (64+27→91, 75−46→29), addsub2 (143−57→86), bonds (72→28, tens make 9/ones make 10), bonds2 (650→350, 0·4→0·6), placevalue (24×100=2400, 0·4×100=40, "never just add a zero"), placevalue2 (450÷1000=0·45, 0·04×100=4), fractionsof (⅓ of 24=8), fractionsof2 (⅔ of 18=12, ⅝ of 40=25), percentages (25% of 40=10), percentages2 (75% of 60=30+15=45), fractions (2/5=0·4, 1/20=0·05), squares (15²=225, 8²=64). Pedagogy well-pitched for Year 5/6. DOM harness: "?" opens the modal for unlocked + locked topics, all 15 render. No regressions. Unblocks T32.

### T31 — Daily-practice momentum counter → APPROVED
The forgiving up/down day counter (owner's redesign). Verified via `window.Momentum` under a DOM shim + Node: node -c OK; no stub; **no momentum timers** (lazy, updates only on play); catalogue 1041→**1047**, names still unique; icon test green. **Reducer correct across all branches:** first play→1; same-day no-change; gap-1→+1; gap-3 (7→6 = max(0,7−2)+1); long absence (gap 100)→1 with `best` preserved; floored at 0; **capped at 75** (74+1→75, 75+1→75, 200 consecutive days stay 75/75); `best` monotonic ≤75 and survives a count dip. 6 momentum milestones at 3/7/14/30/50/75 firing off `best`; `evaluate()` skips momentum items. Label "Momentum", MAX 75. No regressions.

### T26 — Currency (Goblin Gold) → APPROVED — Phase 3 COMPLETE
Goblin Gold (earn/display/persist, no spend). Verified via `window.Gold` under a DOM shim + Node: node -c OK; no stub; **no spend code** (only the "NO spending" comment); catalogue 1030→**1041**, names still globally unique; icon-variation CI test still green. **`fmtGold` correct across the whole ladder** (0/999/1.00K/12.3K/1.23M/1.00B/1.00T/1.00Qa/1.00Qi/1.00Sx…1.00Dc and beyond) and **NaN/Infinity/negative all → 0** (never NaN/∞). label="Goblin Gold". Earn `questionGold(target,dt,combo,mult)`: **faster→more (5 vs 3), higher combo→more (7.5), higher mult→more (15)**, all >0; `goldMult` grows with collection; round/tier bonuses; **skips earn nothing** (builder's DOM harness: clean round earns & persists `halves.gold`>0; all-skipped round earns 0). 11 wealth-milestone `gold:` collectibles; `evaluateGold` fires at 1000 (not 999); `evaluate()` skips gold items. No regressions.

### T25 — Balance + milestone wiring → APPROVED
5 new Milestone collectibles (`meta:tier10/25/50` Climber/Breaker/Crusher, `meta:tier100` Realm Champion, `meta:allheroes` Legendary Roster) + `evaluateMeta(heroesUnlocked, total, has)`; balance unchanged (already proven in T24/T43). Verified (Node): node -c OK; no stub; catalogue 1025→**1030**, all 1030 names still globally unique; icon-variation test still green. **All 5 milestones registered.** `evaluateMeta` fires `meta:tier10` on the `tier:10` marker (not on `tier:9`), `meta:tier100` on `tier:100`, and `meta:allheroes` at **12/12 and not 11/12**. `evaluate(ctx, has)` **never returns a meta item** (meta-path only — granted in finish()/finishBattle() via `grantMeta`). Invariants intact: tier 100 unbeatable with 0 items, tier 1 winnable by starter, def monotonic (0 dips). No regressions.

### T36 — Pixel icons: ~50 categories + per-item variation → APPROVED
Full icon-engine rewrite per DESIGN-icons.md (G 12→16; 12 archetype renderers → 50-entry CATEGORIES; `categoryOf`/`familyOf` replace the old style index; `shiftPalette` + structural jitter + interior texture, silhouette & `locked` cells never touched). Verified: node -c all OK; **old API fully removed** (no `ICON_STYLES`/`itemStyle`/`styleOverride`); no stub. **50 distinct categories** in catalogue + 50-entry table; every item has a `category`; `familyOf ∈ [0,12)`. **`test/icon-variation.test.js` PASSES all 5** (ran it: cross-category role ≥0.18 [closest staff/wand 0.237]; within-category combined ≥0.22 [worst key 0.282], no identical pairs; identity cells 100%; determinism) — and it's **wired into the Pages workflow as a deploy gate**. `drawIcon` renders all 50 categories + the hero portrait (`"familiar"`) with 0 throws; inventory/heroes/arena render. **Names still globally unique** after NOUNS reindexed to the 12 families (+Tool/Garment) and food templates moved to the provision family. Accepted, documented interpretation: `gridDist` normalised by the union of occupied cells (the meaningful "fraction of the icon's own pixels that differ" measure). No regressions.

### T24 — Arena mode (`#/arena`) → APPROVED — KEYSTONE (metagame now playable)
The Arena: `BATTLE_MODE` (mixed questions from unlocked topics), `renderArena`/`startBattle`/`finishBattle`, `finish()` battle-branch (guarded by `battleCtx` — normal drills unaffected). Verified: node -c (main/enemies/collectibles/heroes) OK; no stub; 6 new arena DOM ids present, id cross-check clean; CSS balance ok. **Owner buff-gating requirement PROVEN on the exact live win path** (`computePerf`→`resolveBattle` on `loadCollected()`): computePerf maxes at 1.0 (no perf shortcut); **tier 100 NOT beatable with 0 items at max perf — nor at an impossible perf 1.5**; tier 50 not beatable with 0 items; champion (roon) beats tier 100 only at full-minus-final-loot, and **removing one champion boost flips it to a loss**; tier 1 winnable by base bram. Builder's async DOM battle-drive harness (16 checks) played real rounds via synthetic keydowns: render → hero-pick → Fight → Victory persists `tier:1`+loot (boosts hero); a perfect round vs The Void Sovereign with no collection → Defeated, no `tier:100`. Loss → no progress. No regressions to normal drills.

### T44 — Rename enemy tiers (regions + rank-titles + named bosses) → APPROVED
Display-only rename in enemies.js (`BANDS`/`RANK_TITLES`/`BOSSES` + `tierName` rule). Verified (Node, real enemies.js): node -c OK; no stub. **All 100 tier names match the FINAL approved set exactly** — non-boss tiers `"<Region> <Rank>"`, every 10th tier the named boss (Goblin King · The Highwayman · Old Mother Bramble · Gurgle, King of the Bog · The Frost Jarl · Bonecaller · Cindermaw · Voltan, Lord of Storms · the Elder Wyrm · The Void Sovereign). `regionLabel` now returns the new regions (Gallowmarch, Gloamwood, Drownholm, Cinderwaste…) → T42 inventory loot-regions update automatically. **Invariants intact:** 100 tiers, loot still 250, `def` monotonic (0 dips), boss hardest, tier 1 still winnable by base bram — battle logic untouched. No regressions.

### T42 — Inventory tabs + per-category bars + jump-to-top → APPROVED
`renderInventory` rewritten into a tabbed, lazy-rendered view. Verified: node -c (main/enemies/collectibles) OK; no TODO/stub; new ids `#invTabs`/`#invTop` present, main.js id cross-check clean (52, 0 missing); `.inv-tabs`/`.inv-tab`/`.jump-top` CSS present. enemies.js exports `tierRegion`(1→0,10→0,11→1,100→9 ✓) + `regionLabel`; loot groups into **exactly 10 regions** with correct labels and counts (10+10+15+20+20+30+30+35+40+40 = 250). Loot-region labels read via `Enemies.regionLabel` ⇒ T44-proof. Builder's DOM-shim harness (19 checks): 3 tabs (Topics default), **lazy-render** (Topics/Awards build no loot tiles; Loot tiles only on opening the Loot tab), a progress bar on every Awards category + every Loot region, jump-to-top hidden at top / shows >200px / returns to top, header count over whole catalogue, inv-cell tap-to-inspect intact. Back (T39) + names (T35) untouched; 360px-safe. No regressions.

### T43 — Trim tier loot to 250 → APPROVED
Batch formula `3+floor((n-1)/12)` (668) → `1+floor((n-1)/25)` (**250**); rarer-with-depth unchanged; defs recompute from the smaller set. Independently re-ran the full T23 invariant suite (Node, real modes/collectibles/heroes/enemies): node -c OK. **loot=250**, catalogue 775→**1025**, all 1025 item names **still globally unique**. Loot `test()===false` (drill-unearnable), T20-stamped, boosts **cover all 12 heroes**. **(a)** tiers 1–5 winnable by bram/0 items/perf .85; **(b)** no tier gated behind its own loot (0 fails); **def monotonic** (0 dips); **(c)** tier 100 NOT winnable with 0 items, winnable at full-minus-final-loot. Defs 11→392 (t99 291 < t100 392). main.js inventory totals adapt from `CATALOG.length`. No regressions.

### T35 — Diverse item names + inventory truncation fix → APPROVED
Applied the DESIGN-names.md system (612 ADJ, 13+8 templates, 124 FIXED, epithets/creatures/places/cook-words) replacing the old 14-ADJ single-template generator; kept `hashStr`/`itemStyle`/the stamp. Independently verified (Node, full 1443-item catalogue incl. T23 loot): node -c OK; old ADJ constant gone; no TODO/stub. **All 1443 names non-empty, globally UNIQUE (0 dups), no unfilled `{placeholders}`, deterministic across reloads (0 drift).** Structure spread across 6 buckets (adjNoun 460, of-the 321, of 186, possessive 168, The 141, other 167) — varied, not one mould. Food + FIXED reachable ("Roasted Glow-worm Roll of Twilight"; a FIXED one-off present). **Truncation fixed:** `.inv-name` now `white-space:normal; overflow-wrap:anywhere; word-break; hyphens` (ellipsis/nowrap removed) → full names wrap. **Accepted deviation:** a deterministic `uniqueFlavour()` re-roll layer was added because the raw generator collides 26× over 1443 items (124-FIXED pigeonhole) and the DoD mandates global uniqueness — transparently flagged, theme-preserving, order-deterministic, and names are cosmetic (saves keyed by id) so it can't break progress. No regressions.

### T41 — Rename heroes (display-only) → APPROVED
Owner-approved cast applied. Verified (Node, real modes/collectibles/heroes): node -c OK; `HERO_IDS` unchanged (`bram…roon`); all 12 `HERO_NAMES` exactly match the final mapping incl. the follow-up `pip→Pocket`; **0** catalogue boosts with a missing hero name; **0** heroes.js↔HERO_NAMES mismatches. Display-only — no logic touched. Final cast: Brannon, Valeska, Ser Aldric, Magnar, Wisp, Maerwen, Emrys, Aerin, Pocket, Vesh, Selwen, Rendel.

### T40 — Heroes cards: kill the AI-smell coloured left border → APPROVED
Visual-only. Verified: node -c main.js OK; CSS brace-balance OK; no TODO/stub; grep confirms **no `border-left` on `.hero-card`** (now uniform 1px) and the three `.hero-card.t-*{border-left-color}` rules deleted. Type now shown via `.hero-name .typedot` — a **9px square** (no border-radius, mirrors T37 `.rankdot`) coloured by the existing `t-brawn #d05a4a`/`t-arcane #8a5cf6`/`t-cunning #3fce8c` classes. main.js `heroCard` wraps the name `<span class="hn"><i class="typedot"></i>NAME</span>` on both locked + unlocked markup; `.hn` ellipsis stops a long name shoving the ★rating; item-chip pills untouched. Builder's DOM-shim harness (7 checks) confirms no border-left, exactly 12 type dots (incl. locked cards), all three type classes, rating shown. 360px-safe; no regressions. Completes the UI-polish block (T37–T40); metagame screens now read consistently.

### T39 — Always-visible Back (Inventory/Best Times/Heroes) → APPROVED
CSS-only, scoped to the three long-scroll screens. Verified diff: `#inventory`/`#summary`/`#heroes` drop `overflow-y:auto` (no longer scroll as a unit); `.invlist`/`.sumlist`/`.herolist` gain `flex:1 1 auto; min-height:0; overflow-y:auto` (sole scroll region); the existing bottom Back (`.res-actions`, flex:0) is pinned below the flex:1 list so it's always on-screen and reachable without scrolling; `#heroes` also gains `align-items:center` for consistency; `#results` untouched. node -c main.js OK (handlers unchanged, no new DOM); no stubs; builder's DOM-shim harness (12 checks) confirms each Back is outside the scroll list and still routes to the menu. 360px-safe (widths unchanged). Interpretation note: builder pinned the existing bottom Back rather than adding a top button — meets "reachable without scrolling"; owner may relocate to top if preferred.

### T38 — Start screen fits the viewport → APPROVED
CSS-only, start-scoped. Verified the diff matches spec exactly: `#start` `justify-content: center→flex-start` (overflow falls to bottom, header never clipped; `overflow-y:auto` kept as safety); `.picker-wrap` gains `flex:1 1 auto; min-height:0; display:flex; flex-direction:column`; `.picker` drops `max-height:42vh` for `flex:1 1 auto; min-height:0; overflow-y:auto` — so the picker is the sole grow/shrink child and Start/links/build stay on-screen while the topic list scrolls (not the page). Selectors are start-screen-only (no other screen uses `#start`/`.picker-wrap`/`.picker`). node -c main.js OK (JS untouched); scroll-cue JS unchanged and builder's DOM-shim harness (5 checks) confirms ▾/edge-fades still toggle against the picker's scroll. 360px-safe (widths unchanged). No regressions.

### T37 — Best-Times rank dot + Inventory topic progress bars → APPROVED
Visual-only; owner's two "show colour, not an AI-smell border" fixes. Verified: node -c main.js OK; no TODO/stub; no new DOM ids. **Best Times:** `.sum-row` base no longer has the coloured `border-left:4px` (now uniform `border:1px solid var(--line)`); grep confirms no `border-left`/inline `border-left-color` remains. Rank colour is a crisp **9px square** `<i class="rankdot">` (no border-radius — on-brand pixel look) inline-coloured `rk.color`; not-played = `.rankdot.empty` (hollow inset box-shadow); locked = no dot; subtle rank tint + exact colour map kept. **Inventory:** topic rows gain `.tp-bar`/`.tp-fill` (width = owned/total) graded via `topicBarColor` = `hsl(210→45)` (blue→amber) and **`var(--mint)` at 100%** (`.tp-row.done` mint border); fraction text retained. Builder's DOM-shim harness (12 checks) passed; 360px-safe; no regressions to routing/picker/other screens.

### T23 — Enemy tiers + battle logic + tier loot → APPROVED
New `enemies.js` (window.Enemies), loaded after heroes.js. Independently verified (Node, real modes/collectibles/heroes/enemies): node -c all OK; no TODO/stub; loot never earned via drills. **100 tiers**, def 11→551, **monotonic non-decreasing (0 dips)**. Battle invariants over the real data: **(b) no tier gated behind its own loot** — every tier's def beatable with the best advantage hero on drill-items + loot 1..n−1 at perfect perf (0 failures); **(a)** tiers 1–5 winnable by starter bram with 0 items at perf 0.85; **(c)** tier 100 **not** winnable by any hero with 0 items, **winnable** at full-minus-final-loot collection. **668 loot items** all `test()===false` (drill-unearnable), all T20-stamped (style∈[0,10), flavour, valid hero+stat boost) with boosts covering **all 12 heroes**; `registerItem` idempotent; "Loot" added to CATS. Catalogue 775→**1443**. `evaluate()` excludes loot (regression-checked). Pure logic, no DOM. (Arena UI + loot-granting = T24.)

### T34 — Place Value: bring decimals into Part 1 → APPROVED
Owner-raised content fix. Independently verified (Node): node -c (modes/collectibles/main) OK; no TODO/stub; clean rename to one `pvItem` builder, no dead `pvP1Item`/`pvP2Item` refs; catalogue unchanged (775); chain/masterSecs unchanged (bonds→placevalue→fractionsof→percentages; placevalue2 requires mastery:placevalue). **P1** = 21 fixed, stable; **7 decimal-operand prompts + 14 whole** (both ≥6), plus whole÷10/100 yielding decimal answers (0.6/0.7) — decimals now visible in the base topic; targets only 10/100; every answer correct (recompute=stored within 1e-9), literal/round-trips on numpad, non-negative. **P2** = 21 fixed, stable; targets only **100/1000 (no bare ×/÷10)**, answers <1 present (10 of them) incl. 3-dp (0.006); all correct/safe. Beat/Spark regenerated. No regressions.

### T33 — Music: cap tempo + stop fast bursts → APPROVED
Live hotfix for the owner's "music sometimes races / stressful". Independently verified (stub AudioContext + captured timer + controllable clock): node -c OK; no TODO/stub. **Tempo cap** — max bpm over all 13 styles = 115 (≤116); every style's `(60/bpm)/4` ≥ 0.13s; rescaled styles keep ascending order. **Anti-burst** — `musicTick` resyncs `mNext = now+0.02` when behind and caps `MAX_STEPS_PER_TICK=4`: after a simulated **5s clock jump** ONE tick scheduled just **1** voice (no flood); over 20 random multi-second jumps the **max voices in any single tick was 4** (cap holds); normal ticking still schedules a few; music loops/switches and mute stops/resumes. The fast-burst path is closed and even the fastest style is now calm.

### T22 — Heroes screen (`#/heroes`) → APPROVED
Independently verified: node -c (collectibles/main) OK; no TODO/stub; new ids present in index.html (`heroes`,`heroList`,`heroesBtn`,`heroesBack`) and main.js id cross-check clean (50, 0 missing); 13 heroes-screen CSS rules present. `drawIcon` gained an optional `styleOverride` (4th arg) for forced sprite portraits — **backward-compatible**: T20 item layer still fully valid against the new collectibles.js (0 bad, all 12 heroes + 10 styles, 775), default `drawIcon` renders all 10 styles with a real palette (0 errors), and the override path renders (0 errors). Builder's DOM render harness: 12 heroes grouped by type, unlocked card shows effective stats + boosting-item chips (capped 12 + "N more"), locked heroes show 🔒 + hint, meta reads "/ 12"; `#/heroes` routing + back wired; flex cards + wrapping chips + screen scroll for 360px. Heroes screen uses menu music via existing `show()`. No regressions.

### T21 — Heroes module + stats → APPROVED
New `heroes.js`→`window.Heroes`. Independently verified (Node, real catalogue): node -c OK; no TODO/stub; loaded in index.html after collectibles.js. **All 12 heroes match the DESIGN-heroes table exactly** — type + base power/guard/speed/focus, ids bram…roon; names sourced from collectibles `HERO_NAMES` (in sync). `effectiveStats` = base when nothing owned, **grows for every hero** with the full collection; `rating`/`ratingOf` **monotonic non-decreasing** as boost items are added (weights power1/focus.8/speed.5/guard.3). **Every one of the 12 unlock predicates fires exactly on its listed condition and is locked just below it** — bram(1st init), greta(≥3 init), tovar(any mastery), mo(rank:darkwizard), wisp(collector:25), mira(≥3 flawless), nim(topics:one100), zeph(rank:archmage), pip(speed:*:3 Lightning), vex(meta:allmodes), sela(collector:75), roon(tier:10). RPS `matchup` correct (Brawn>Cunning ×1.5, reverse ×0.6, same ×1.0). Pure, no DOM. No regressions.

### T20 — Item layer: styles, names, boosts → APPROVED
First Phase-3 task. Independently verified (Node, stub canvas): node -c (collectibles/main) OK; main.js id cross-check clean (45, 0 missing); `.u-boost`/`.inv-name` CSS present; no TODO/stub; catalogue unchanged (775). Over **every** catalogue item: `style` is an integer in [0,10); `name` non-empty; `boost` references a real hero + real stat with rarity-correct amount (common1/unc2/rare3/epic5/leg8) — 0 violations. Boosts **spread across all 12 heroes** (per-hero 57–77 items) and **all 10 styles** used (69–88 each). **Deterministic across fresh reloads** (0 drift in style/name/boost per id). `drawIcon` runs for all 10 style routines without error; `boostLabel` formats ("+1 Guard · Pip Quickfingers"). HERO_IDS/STAT_NAMES match DESIGN-heroes exactly (bram…roon; power/guard/speed/focus). Additive fields — no regression to collectible earning. UI: toasts/modal/inventory show flavour names + boost line + earning achievement.

### T17 — Generative chiptune music (12 styles + menu) → APPROVED
Extends `window.Sound` with a look-ahead scheduler. Independently verified (stub AudioContext + captured timer + controllable clock): node -c (sound/modes/main) OK; main.js id cross-check clean (45, 0 missing); catalogue unchanged (775); no TODO/stub. **STYLES = exactly 13** (12 topic + menu@12), distinct names, all params present (bpm>0, non-empty scale, arp/bass/drums/density/waves). `styleIndexFor`: number→mod13, "menu"→12, any string→deterministic hash%12 **always in [0,12)**. `degMidi` **in-scale** for every style across degrees −3..15 × octaves −1..1. `stepVoices` **deterministic given a seed, varies across seeds**, all voices valid (f>0, d>0, type, g>0). Scheduler: does NOT start before `unlock()`; starts on unlock+setMusic; schedules oscillators across look-ahead ticks; keeps scheduling after a topic-style switch; **`setMuted(true)` stops it (no oscillators), unmute resumes**; suspends/stops when hidden; own low gain (0.07) off the shared master; only-timer-while-playing (low CPU). `show()` follows the screen (topic style in-game via `mode.music`/`mode.id`, menu elsewhere), guarded. All 15 modes carry an explicit `music` index. No game-clock impact. No regressions.

### T16 — Audio core + 8-bit SFX → APPROVED
New `sound.js`→`window.Sound`. Independently verified (stubbed AudioContext that counts oscillators): node -c (sound.js, main.js) OK; id cross-check clean incl new `#soundBtnMenu`; no TODO/stub. All 9 SFX specs (+unknown→empty) are pure and **bounded** (every voice f>0 finite, d>0, t≥0, known waveform, gain>0, end<0.6s). `correct` pitch **rises with combo and caps at +12**; `item` note count **scales 3→7 by rarity** (monotonic). **Gesture-gated**: 0 oscillators before `unlock()`; 7 for legendary item after. **Mute silences everything** (0 oscillators across all events while muted) and `isMuted` tracks; unmute resumes. Integration: `combo` resets on skip AND round start (does NOT reopen the T12 speed-skip exploit — speed brackets still require mistakes===0), single shared button-sync path (entry + menu, no double-binding), `halves.sound` persisted, all SFX fire-and-forget on the Web Audio timeline (never touches the `performance.now()` game clock/input), context suspends when hidden. Round-end stinger references real ids/cats (`topics:one100|all100`, `cat:"Mastery"`) → topic100>mastery>roundComplete. `gold` method exists but unwired = documented forward-hook for T26 (system not built yet), not an in-scope stub. No regressions.

### T9 — Percentages of → APPROVED
Completes Phase-2 topic core (T5–T9). Independently verified: node -c OK; no new DOM ids; no TODO/stub in diff. Node harness on real modes.js — `percentages` P1: 21 fixed items, stable unique prompt-set, pct set exactly {10,25,50}, every base ≤400, answer = base×pct/100 within 1e-9 of stored literal, non-negative, numpad-round-trips, max length 3. `percentages2` P2: 21 fixed, stable, pct set exactly {1,5,20,75}, bases ≤200, clean terminating answers (0.5, 4.5…) round-trip exactly. Chain contiguous: …fractionsof→**percentages**→fractions→squares; percentages2 off-chain via `requires:"mastery:percentages"`; `fractions.unlockedBy` re-pointed fractionsof→percentages. Catalogue 677→775 (Beat/Spark generated). masterSecs 9 (Tier 3) accepted. No regressions.

### T8 — Fractions of → APPROVED
Independently verified (not from log): node -c OK; no new DOM ids; no TODO/stub in diff. Node harness on the real modes.js — `fractionsof` P1: 21 fixed items, stable unique prompt-set across rounds, fraction set is exactly {1/2,1/3,1/4,1/5}, every answer = base×num/den exactly, whole, non-negative, numpad-round-trips, max length 2. `fractionsof2` P2: 21 fixed, stable, fraction set exactly {2/3,3/4,3/5,5/8}, all answers correct/whole/safe. Chain contiguous: …placevalue→**fractionsof**→fractions→squares; fractionsof2 off-chain via `requires:"mastery:fractionsof"`; `fractions.unlockedBy` correctly re-pointed placevalue→fractionsof. Catalogue 579→677 (Beat/Spark generated). masterSecs 9 (Tier 3, multi-step) accepted. Text-form "a/b of N" prompts (renders everywhere) accepted. No regressions.

### T7 — Place value ×/÷ → APPROVED
First educational topic of the chain. Independently verified (not from log): node -c OK; no new DOM ids; no TODO/stub in diff. Node logic harness loading the real modes.js — `placevalue` P1: 21 fixed items, stable prompt-set across rounds, every answer recomputed from prompt is correct, whole, non-negative, round-trips on numpad, max answer length 4. `placevalue2` P2: 21 fixed items, stable, every decimal answer correct within 1e-9 AND `parseFloat(String(a))===a` (literal-stored, no float drift), answers <1 present. Chain contiguous: halves→times→doubles→addsub→bonds→**placevalue**→fractions→squares; pv2 off-chain via `requires:"mastery:placevalue"`; `fractions.unlockedBy` correctly re-linked bonds→placevalue. Catalogue 481→579 (Beat/Spark per question generated). masterSecs 5 for both parts accepted (same operation class). No regressions.

### T29 — Scroll indicator → APPROVED
.picker wrapped in .picker-wrap; edge-fade ::before/::after + bobbing ▾ cue toggled by updateScrollCues() (scroll geometry), wired to render + passive scroll + resize. pointer-events:none; hidden when it fits; reduced-motion opt-out. JS ok, ids ok, no stubs.

### T28 — Remove start blurb → APPROVED
.hint block + .hint/.hint kbd CSS removed; no <kbd> refs left; clean small diff; JS ok.

### T11 — Entry / tap-to-begin screen → APPROVED
#entry shown on load (in the screens map; show("entry")). "Play in fullscreen" +
quieter "Play" both call enter(): guarded audioUnlock() + applySoundPref() +
optional fsEnter() + applyRoute() (reveals menu, honours deep-link AFTER the
gesture). Sound toggle persists halves.sound + syncs label. Graceful single-"Play"
where fullscreen unsupported. T18 button refactored onto shared fs helpers. JS
clean, ids ok, no stubs (the audio hooks are intentional guarded forward-compat).

### T12 — Speed-achievement skip exploit → APPROVED
Speed bracket test is now `mistakes === 0 && avg < lv.avg` (desc → "clean round").
Node-verified: skip-spam (21 skips, avg 0.3) earns 0 brackets; 1 skip earns 0;
clean avg 1.0 earns all four incl Lightning; clean avg 2.0 earns Quick only. No
other collectible touched.

### T19 — Juicy unlock celebration → APPROVED
Canvas confetti engine (fx.js): single full-screen overlay (pointer-events:none,
z-index 59), FX.init wired at startup, toastBurst→FX.celebrate(rarity,colors).
Node-verified: rarity counts 30→130, allowed() clamps to CAP, gravity/aging in
stepParticle, **global cap holds at 250 under burst-spam**, and the **RAF idles**
(after ~100 frames: running:false, live:0, no pending raf — no constant loop/leak).
Shockwave ring + vignette glow + epic/legendary flair (edge confetti + 2nd pop);
prefers-reduced-motion opt-out. JS clean, ids ok, no stubs.

### T18 — Fullscreen toggle → APPROVED
Feature-detected (requestFullscreen + webkit/moz/ms); hides the button where
unsupported (iOS Safari) — no error. enter/exit wrapped in try/catch with promise
.catch; fullscreenchange (all vendor events) syncs the label; click is the user
gesture. linkrow wraps/centres so it fits 360px. JS clean, ids ok, no stubs.

### T15 — Best Times heat-map + tap-to-retry → APPROVED
renderSummary now renders three distinct states: played (rank-coloured left accent
+ bg tint + coloured rank label), not-played (dashed/muted, still tappable), locked
(dimmed, 🔒 + requirement, NO data-mode → not startable). Tap handler matches only
`.sum-row[data-mode]`, guards isUnlocked, then selectMode+start(); start() also
guards. 44px tap targets, 360px-safe, routing intact. JS clean, ids ok, no stubs.

### T14 — Remove Hall of Fame + Clear-all → APPROVED
All 7 elements (nameEntry/nameInput/missNote/hof/hofList/hofMeta/sumClear) removed
from HTML + JS + CSS; renderHOF/commitName/pendingEntry deleted (no dead code);
id cross-check clean. Best Times still works: finish() unconditionally saves the
round to the per-mode top-10 board, so new bests/ranks/picker update — just no
name prompt. No stubs, no regressions.

### T10 — Celebratory particles → APPROVED (after 1 fix)
The undeclared-`pal` ReferenceError in `showTopicToast` is fixed (now
`C.paletteFor("epic")`; epic palette resolves). fx.js is pure/capped/leak-free,
particles are pointer-events:none (non-blocking), "+1" flourish + reduced-motion
opt-out present. JS clean, ids ok, no stubs. Item AND topic/Part-2 unlocks now
both burst without error.

### T5b — Convert all generated modes to fixed → APPROVED
Re-verified on main: zero gen modes remain; genRound/randInt/addSubP1·P2/bond
generators + the `if(m.gen) return` guard all removed (the `bondP1Item/P2Item`
left are fixed-set mappers, not generators). addsub/addsub2/bonds/bonds2 each = a
fixed 21-item shuffled set with 21 Beat + 21 Spark. Number-bonds curation hits the
checklist (round/near-round/awkward/quarters/small-large for P1; to-1000 + exact
decimal-bonds-to-1 for P2). All answers numeric, ≥0, ≤5 digits, exact. Doc’s
stale "Generated modes" wording fixed. addsub work intact. Complete.

### T6 — Number bonds → WIRING APPROVED (generator superseded → T5b)
Verified the wiring on main: `bonds` at importance slot #5 (`unlockedBy:addsub`),
`bonds2` mastery-gated side branch (`requires:mastery:bonds`), fractions re-linked
to bonds, main chain contiguous, masterSecs 3.5 (tier 1 recall) + group Number.
JS clean. The questions were built with generators, which the fixed-set design
change supersedes — folded into the broadened **T5b**.

### T5 — Add / Subtract → APPROVED
Independently verified on main (6000-sample stress test):
- P1 (addsub, gen): two-digit ±, result 1..100, both operands ≥10, integer & ≥0.
  P2 (addsub2, gen): 3-digit ± 2-digit, answers 9..1095 (≤4 digits, numpad-safe).
  Round size 20; all prompts well-formed; "−" is display-only (answers numeric).
- Generated-mode guard correct: `if(m.gen) return` in collectibles → addsub/
  addsub2 carry ONLY Init/Flawless/Speed/Mastery (0 stray Beat/Spark). Catalogue
  299.
- Chain re-linked at the right importance slot (#4): doubles→addsub→fractions;
  addsub2 is a mastery-gated side branch (requires mastery:addsub, off-chain).
  Main chain contiguous. masterSecs 5 (tier 2), group Number. No stubs; ids ok.

### T4 — Per-topic completion + milestones → APPROVED (Phase 1 complete)
Verified independently on `main`:
- `node -c` clean; ids present; no stubs.
- Topic milestones added: `topics:unlock3/8/16`, `topics:one100`, `topics:all100`.
  They carry a `need` field and are correctly **excluded from the main `evaluate`
  pass** and handled by a new `evaluateTopics(counts, has)` run in `finish()`
  **after** the round's items are saved — so a topic taken to 100% this round
  counts immediately (verified the threshold table in Node: unlock-3, one-100,
  all-100, owned-skip, total>0 guard on all100).
- `isModeComplete` requires the full per-mode set → 100% genuinely demands the
  hard items. Inventory now shows a per-topic completion overview.
- Non-blocking nit (do NOT fix now): `topics:one100` lacks a `total>0` guard, but
  `complete ≤ total` and `total ≥ 5` always, so it's unreachable in practice.

### T3 — Mode-picker redesign → APPROVED
Verified independently on `main`:
- `node -c` clean; ids present; no stale `.mode-tab/.modes/.lk` refs.
- Scrollable grouped picker (`.picker`, 42vh scroll, max-width 360). `MODE_GROUPS`
  exported (`Core, Number, Fractions & %, Measures, Reasoning`); confirmed **every
  mode's group is in the list — 5/5 render, none orphaned** (the main risk).
  Empty groups skipped.
- Rows show name, subline (rank·score / "No best yet" / unlock requirement),
  `have/total` progress, and a state glyph (▶ / 🔒 / ✓). Locked rows are not
  selectable (click guard). 100% (`done`) only when have===total of the full
  per-mode set (halves 59 incl. all Beat/Spark + Lightning + Mastery) → matches
  "100% = mastery". `renderTabs()` re-runs on nav-back and init, so routing works.
- No TODO/placeholder/stub; no regressions. Complete work.
- Non-blocking nit (future cleanup, do NOT fix now): `renderBest`'s locked branch
  is now effectively unreachable since `mode` is always unlocked; harmless.

### T2 — Mastery achievement + Part-2 gate → APPROVED
Verified independently on `main`:
- `node -c` clean; all `$("id")` present. Catalogue grew exactly +5 (275→280),
  one `mastery:<id>` (epic, cat "Mastery") per mode; "Mastery" added to CATS.
- Mastery boundary cases all pass: 0 skips & total ≤ masterSecs×Q → earned
  (incl. exactly at threshold); just over → not; any skip → not. `masterSecs`
  set on all 5 modes exactly per the tier table (halves/doubles 4, times/
  squares/fractions 3.5).
- `isUnlocked` now honours `requires:"mastery:<id>"` AND `unlockedBy` AND the
  own-`init` migration override — simulated the Part-2 gate (locked until
  mastery owned; open after; open if already played). No Part-2 modes added
  prematurely (correct — those are T5+).
- Topic-unlock toast fires via a clean before/after `wasUnlocked` snapshot, for
  both chain unlocks and Part-2 mastery unlocks; no spurious/duplicate fires.
- No TODO/placeholder/stub introduced; no regressions. Complete work.

### T1 — Topic-chain unlock → APPROVED
Verified independently on `main` after merge:
- `node -c` clean (modes/main/collectibles); all `$("id")` present in index.html.
- Importance order correct: halves → times → doubles → fractions → squares; every
  `unlockedBy` = the previous topic. Fresh profile → only Halves; `isUnlocked`
  honours the migration clause (own `init:` keeps a played topic open).
- Locked topics can't start (`start()` guard), Start is disabled, and the lock
  requirement shows on the best-line. Richer picker correctly deferred to T3 (not
  stubbed). No regressions to routing/inventory/collectibles/build-info.
Good, complete work. One forward-looking note (not blocking): when T5+ splice new
topics into the chain, re-link `unlockedBy` so the order stays contiguous, and
re-run the chain structural test.
