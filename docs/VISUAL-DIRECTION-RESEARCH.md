# Visual Direction — Deep Research (T82, Phase 6.7)

**Status:** research / design doc only. **Zero code or behaviour change** ships with
this task — no `.js`, CSS, HTML, or gate touched. Its job is to decide *how* (and
*whether*) to give Halves a brickmap‑grade visual character **without a voxel engine**,
with **Android as the primary target** and the web as a dev/preview surface.

> **Sourcing note (honesty first).** The brickmap **source repo (`00-1/brickmap`) is
> out of this session's GitHub scope** (only `00-1/halves` is allowed), so I did **not**
> read its code. The aesthetic teardown below is built from the **owner‑shared
> screenshots** described in the Phase‑6.7 brief (frost‑blue / rust‑magenta /
> magma‑amber monochrome biomes, heavy ordered dithering, thousands of cheap particle
> "splats", atmospheric depth gradients, chunky geometric forms, an exposed‑tech
> monospace HUD, ~95–111 fps / ~10 ms, a dithered particle field under a gradient sky as
> a phone **menu backdrop**) and from standard, well‑documented real‑time‑graphics
> techniques. Where the brief attributes brickmap to a Rust + wgpu/Bevy voxel
> ray‑marcher, I treat that as the brief's claim, not something I verified. **None of
> brickmap's internals are invented here.** If `00-1/brickmap` is added to scope, the
> teardown in §1 should be re‑checked against the real source.

---

## 0. TL;DR — the recommendation up front

- **Adopt the *look*, not the *engine*.** Brickmap's appeal — dithering, tight
  per‑biome palettes, particle density, atmospheric gradients, a mono HUD — is a set of
  **2D post‑process techniques** that are voxel‑agnostic and cheap on a GPU.
- **Pick: Option (a) — a hybrid "DOM + WebGL2 FX layer."** Keep the entire game (text,
  numpad, menus, results, HUD) on **DOM** exactly as today; add **one decorative,
  `aria-hidden` WebGL2 canvas behind it** that renders a dithered, palette‑quantised,
  particle‑rich **atmospheric backdrop**, seeded by — and compositing — our **existing
  generative art**. This is the only option that preserves **all three crown jewels**
  (DOM accessibility · no‑build deploy · Node‑gated logic).
- **Do NOT** rebuild on a cross‑platform engine (Rust/Bevy, Godot, Unity, Flutter) now:
  it would torch the no‑build pipeline, move text/input off DOM (an a11y regression in a
  kids' app), and break the Node‑verification model the two‑agent loop runs on — for a
  visual upgrade we can largely get from a post‑process layer.
- **Ship to Android via a TWA** (Trusted Web Activity, Bubblewrap) wrapping the existing
  PWA — this is the T72 path and it keeps web == Android from one static build.
- **First spike (small, reversible):** a dithered + palette‑driven + particle backdrop
  behind the **existing menu**, reusing `Scenery`/`EventArt` seeds, proven on a **real
  mid‑range Android tablet**, with explicit **success/kill criteria** (§7).

---

## 1. Aesthetic teardown → transferable, voxel‑free techniques

Each item below is a real technique, what it costs, and where it maps onto Halves'
2D surfaces (home/menu backdrop · Arena scenes · battle FX · transitions · toasts ·
loading). "Cost" assumes a single full‑screen 1080×1920‑ish portrait canvas.

| # | Technique | What it is (real) | Halves mapping | Rough cost |
|---|-----------|-------------------|----------------|-----------|
| 1 | **Ordered / Bayer dithering** | Threshold each pixel against a tiled 4×4 or 8×8 **Bayer matrix** before quantising → the signature cross‑hatch banding. A `bayer[(x&7)+(y&7)*8]/64.0` lookup in a fragment shader, or a precomputed threshold texture. | Post‑process over the menu/Arena backdrop and transitions; optional light dither on toasts. | ~1 full‑screen pass; **negligible** on any GPU. Pure 2D canvas fallback possible but per‑pixel JS is too slow at full res — this wants a shader. |
| 2 | **Palette quantisation + per‑theme monochrome ramps** | Snap colours to a small **per‑biome ramp** (8–16 entries) via a 1‑D LUT texture; gives the frost‑blue / rust‑magenta / magma‑amber identity. | We already have **per‑region scenery palettes** (`scenery.js` 10 themes) and **per‑event hues** (`eventart.js`). Feed those as the ramp; one ramp per Arena region / event. | LUT sample per pixel; **negligible**. Authoring the ramps is the real work, and we already author palettes. |
| 3 | **Instanced particle "splats"** | Thousands of cheap additive quads/points drawn in **one instanced draw call** (`drawArraysInstanced`), positions/seeds in a buffer, animated in the vertex shader. The "snow/embers/dust" density that makes scenes feel alive. | Ambient motes on the menu backdrop; embers in Cinderwaste, snow in Frostpeak (we already *name* these accents in `scenery.js`); a denser burst layer for victory/level‑up over the existing `fx.js` confetti. | One instanced call for ~2–10k particles is **cheap on a GPU**; the same count on 2D canvas (our current `fx.js` model, capped at 250) would not hold framerate. This is the main reason to add a GPU layer. |
| 4 | **Atmospheric gradient / depth fog** | A vertical sky gradient plus a distance/height **fog blend**; banding from the gradient is then *embraced* by the dither (banding‑as‑a‑feature). | The menu/home backdrop sky; Arena scene depth behind the tier card; a soft fog under the prompt during play. | A gradient + lerp in the shader; **negligible**. We already build dark sky gradients in `scenery.js` (`lerp(sky[0],sky[1],r/ROWS)`). |
| 5 | **Banding‑as‑a‑feature** | Don't dither *away* gradients — quantise to few steps so the banding reads as intentional retro texture. | Whole backdrop language; complements our existing pixel/chunky look. | Free (it's the absence of smoothing). |
| 6 | **Exposed‑tech monospace HUD** | Telemetry‑style mono readouts, thin rules, tabular numerals. | **We already lean here**: JetBrains Mono throughout, the `#counter`/`clock`, build‑info line, tabular `--mono`. Lean further: tighter mono labels, hairline dividers, a "frame/seed" debug ribbon in dev. | Free; it's CSS we already own. **Keep this on DOM** (accessibility). |
| 7 | **Chunky geometric forms** | Big, low‑detail silhouettes that read at a glance. | Our **glyphs** (`glyphs.js`), **icons** (`collectibles.js`, G=16), **monsters** (`monsters.js`, G=16), **scenery silhouettes** are already chunky/pixel. The FX layer should *frame* them, not replace them. | Free; already our style. |

**Takeaway:** items 1, 2, 4 are the highest‑identity / lowest‑cost wins and are pure
post‑process. Item 3 (dense particles) is the one thing our current 2D `fx.js` cannot
scale to — it is the concrete reason to introduce a small GPU layer. Items 5–7 we
already do; the work is *amplifying* them, not inventing them.

---

## 2. Build **on** our existing generative art — do not discard it

Our procedural art is a genuine strength and an explicit owner guardrail. Inventory of
what already produces visual character (all **pure, deterministic, seeded, static —
no RAF**, and already Node‑testable via grid snapshots):

| Module | Global | What it generates | Shape of output |
|--------|--------|-------------------|-----------------|
| `collectibles.js` | `Collectibles.drawIcon` | ~1150 item **icons**, 50 categories, per‑item variation (G=16, `mulberry32(hashStr(id))`, role + colour grids) | 16×16 role/colour grids → canvas |
| `collectibles.js` | `iconRoleGrid("hero:…")` | 12 **hero portraits** (mirrored creature‑blob) | 16×16 grid |
| `monsters.js` | `Monsters.buildGrid/draw` | 120 **enemy sprites**, region/type‑themed, bosses bigger+crowned (G=16) | 16×16 grid |
| `scenery.js` | `Scenery.buildGrid/draw` | 10 **Arena region backdrops** (28×11, themed sky+silhouette+accents+scrim) | 28×11 hex grid |
| `glyphs.js` | `Glyphs.buildGrid/draw` | **pixel‑font** topic marks + favicon (5×7/3×4) | ink‑code grid |
| `eventart.js` | `EventArt.buildGrid/draw` | 14 **event emblems** (seeded heraldic crest, 24×16) | 24×16 hex grid |
| `fx.js` | `FX.celebrate` | capped **confetti/particle** burst (≤250, RAF idles) | 2D canvas |

**The composition plan (build‑on, not replace).** Every generator above emits a small
**grid of cells / colours**. That is *exactly* the right input for a GPU FX layer:

1. **Generators stay the content authority.** `buildGrid(seed)` is unchanged and still
   gates in Node by deterministic snapshot. They are the "what"; the FX layer is the
   "lens".
2. **Render a generator's grid to an offscreen canvas once** (we already do), then
   **upload it as a WebGL texture** (`texImage2D` from a canvas — one call, static).
3. **Composite through the shader**: sample the generator texture, **quantise to the
   biome ramp** (§1.2), **dither** (§1.1), lay an **atmospheric gradient** behind it
   (§1.4), and **scatter particles seeded from the same `hashStr`** so the motes match
   the scene. The Frostpeak palette drives blue snow; Cinderwaste drives amber embers —
   palettes we already author.
4. **Nothing is thrown away**: icons/heroes/monsters keep rendering as today (DOM
   `<canvas>` tiles); the new layer is an **additive backdrop/atmosphere** that makes
   the *same* seeded art feel like a place.

Concretely: `Scenery.buildGrid(region)` → texture → dithered, fogged, ember‑particled
**Arena backdrop**; `EventArt.buildGrid(artSeed)` → the **home banner / menu** backdrop
behind today's event. Same seeds, richer presentation. Losing the generators is a
non‑goal and this plan never requires it.

---

## 3. Rendering‑stack options for "Android‑primary, web‑for‑dev"

Scored 1–5 (5 = best) on **Perf**, **Aesthetic ceiling**, **Effort** (5 = least
effort), **Risk** (5 = least risk), and the **three crown jewels** — **A11y** (DOM‑grade
text/input for a kids' app), **No‑build** (static files → GitHub Pages, no toolchain),
**Node‑verify** (JS logic gated in Node; the two‑agent loop). Crown jewels are weighted
heaviest because they're what makes this project shippable *and* maintainable.

### (a) DOM + WebGL2/canvas FX layer (hybrid) — **recommended**
Keep DOM for everything interactive; add one `aria-hidden` WebGL2 canvas *behind* it for
the atmosphere/particles. The FX layer reads our generator grids as textures.
- **Perf 4 · Aesthetic 4 · Effort 4 · Risk 4 · A11y 5 · No‑build 5 · Node‑verify 5.**
- WebGL2 is **near‑universal on Android Chrome**; shaders are inline strings (no
  bundler); logic untouched so all 20 Node gates stand. Aesthetic ceiling is high enough
  to capture §1's whole list. Only real limit: it's a *backdrop/FX* layer, not a full
  scene graph — which is exactly what we want.

### (b) Full 2D WebGL renderer (PixiJS or hand‑rolled)
Render the *whole* UI through WebGL.
- **Perf 5 · Aesthetic 5 · Effort 2 · Risk 2 · A11y 2 · No‑build 3 · Node‑verify 3.**
- Highest visual ceiling, but **text/input leave the DOM** → we'd re‑implement focus,
  screen‑reader semantics, OS font scaling, IME/numpad, large tap targets by hand — a
  real regression risk for a children's app. PixiJS adds a dependency + a bundling step
  (dents no‑build). Logic could still gate in Node, but the *UI* no longer does.

### (c) Cross‑platform engine, native Android + web (Rust/wgpu+Bevy · Godot · Flutter+Flame · Unity)
A full rewrite in an engine that exports native Android **and** web.
- **Perf 5 · Aesthetic 5 · Effort 1 · Risk 1 · A11y 2 · No‑build 1 · Node‑verify 1.**
- Highest ceiling and "true native," but: a **ground‑up rewrite**; **kills the no‑build
  pipeline** (engine toolchain, export step, large WASM/native bundles); **breaks
  Node‑verification** (logic is now Rust/GDScript/Dart/C#, not Node‑gateable JS) — the
  two‑agent loop's whole testing model would need replacing; engine **a11y on web/Android
  is weak** vs DOM. Godot/Unity web exports are heavy (multi‑MB WASM, slow cold start on
  cheap tablets). Reserve for a hypothetical "Halves 2," not this visual pass.

### (d) Native Android (Kotlin + GL/Vulkan) + separate web dev build
- **Perf 5 · Aesthetic 5 · Effort 1 · Risk 1 · A11y 3 · No‑build 1 · Node‑verify 1.**
- Best raw device integration and Android a11y (TalkBack), but now **two codebases**
  (web preview vs native) that drift; no shared logic; no‑build and Node‑verify both gone.
  Disproportionate for an atmosphere upgrade.

### (e) PWA/TWA wrap of the current app (+ the §a FX layer)
Not really an alternative *renderer* — it's the **delivery** mechanism, and it composes
with (a). Wrap today's static site as a Trusted Web Activity.
- **Perf 4 · Aesthetic — (inherits a) · Effort 5 · Risk 4 · A11y 5 · No‑build 5 · Node‑verify 5.**
- This is the **Android shipping path** (see §4) and the natural partner to (a).

### Scorecard

| Option | Perf | Aesthetic | Effort | Risk | A11y | No‑build | Node‑verify | Verdict |
|--------|:----:|:---------:|:------:|:----:|:----:|:--------:|:-----------:|---------|
| **(a) Hybrid DOM + WebGL2 FX** | 4 | 4 | 4 | 4 | **5** | **5** | **5** | **Pick** |
| (b) Full 2D WebGL UI | 5 | 5 | 2 | 2 | 2 | 3 | 3 | Later, maybe |
| (c) Cross‑platform engine | 5 | 5 | 1 | 1 | 2 | 1 | 1 | No (rewrite) |
| (d) Native Android | 5 | 5 | 1 | 1 | 3 | 1 | 1 | No |
| (e) TWA wrap (delivery) | 4 | — | 5 | 4 | 5 | 5 | 5 | **Yes — with (a)** |

**Winner: (a) + (e).** A hybrid FX layer for the look, a TWA for Android delivery.

---

## 4. Android delivery specifics (ties back to T72)

- **Mechanism — TWA via Bubblewrap.** A **Trusted Web Activity** runs the PWA full‑screen
  in Android's Chrome engine with no browser chrome. `@bubblewrap/cli` generates the
  Android project + signed **AAB** for Play. Requirements: a **Web App Manifest**
  (`manifest.webmanifest` — name, icons, `display:standalone`, theme/background colour —
  our `installFavicon()` + `theme-color` already seed this), a **service worker** (offline
  cache), and **Digital Asset Links** (`/.well-known/assetlinks.json`) proving the site
  ↔ app association. This is the **T72** work; the FX layer rides inside it for free.
- **Engine‑export alternative** (only if we ever pick §3c): Godot/Unity export a native
  APK/AAB directly — heavier bundles, no TWA needed. Not recommended now.
- **Bundle size.** TWA app shell is **tiny** (a few hundred KB of APK stub); the "real"
  payload is our static site (~sub‑MB today). Versus a Unity/Godot WASM web build (often
  **5–20 MB+**) or a native engine APK — a decisive cold‑start win on cheap tablets.
- **Cold start.** TWA reuses the device's Chrome → **fast warm start**; our static, no‑JS‑framework
  site parses quickly. Engine builds pay a WASM/native init cost.
- **min‑SDK / device reach.** TWA needs Android **8.0+ (API 26)** and Chrome **72+** — covers
  the overwhelming majority of in‑use Android tablets. **WebGL2** is available on essentially
  all Chrome‑on‑Android in that range (ANGLE over GLES3). **WebGPU** is far newer (Android
  Chrome ~121+, and *not* on the whole long tail / many budget GPUs) → **treat WebGPU as
  progressive enhancement, WebGL2 as the baseline, 2D‑canvas as the floor.**
- **Cheap‑tablet reality.** Budget GPUs (Mali‑G52/old Adreno) are fill‑rate limited. The FX
  layer must be **resolution‑scalable** (render the backdrop at e.g. 0.5–0.75× and upscale —
  the dither hides it) and **particle‑count‑scalable** (auto‑tune by measured frame time).
- **"Designed for Families" / COPPA.** Halves collects **no data**, is **offline**, has **no
  ads / no third‑party SDKs / no network calls** beyond the static host → the cleanest possible
  Families/COPPA posture. The FX layer must **not** add any network or telemetry. (Detail this
  in T72.)

---

## 5. Performance principles to adopt regardless of stack

Brickmap's ethos is **"move less data."** Concrete rules for our FX layer:

- **Instance, don't iterate.** All particles in **one** instanced draw call; never a JS
  loop per particle per frame (our current `fx.js` does per‑particle 2D fills — fine at
  ≤250, wrong for thousands).
- **Static uploads.** Generator grids → texture **once** (they're deterministic and never
  animate); animate cheaply in the **vertex/fragment shader** (time uniform), not on the CPU.
- **Palette compression.** Biome ramps are tiny **1‑D LUTs**; quantise in‑shader instead of
  storing big textures.
- **A real frame budget on mid‑range Android.** Target **16.6 ms (60 fps)**, with a graceful
  **degrade ladder** (lower backdrop resolution → fewer particles → drop dither last) when a
  rolling frame‑time average exceeds budget. Brickmap's ~10 ms is the *aspiration*; **stable
  60 fps on a £80–120 tablet is the requirement**.
- **Respect `prefers-reduced-motion`** (we already do in `fx.js`) — the FX layer must honour
  it and fall back to a static dithered still.
- **Keep `perf.test.js` meaningful** (see §6): it currently proves RAF idles, listeners don't
  leak, the particle pool is capped, and the game‑clock RAF cancels on leave. A GPU layer
  keeps those invariants (single RAF, cap the particle buffer, release GL context / stop the
  loop when the backdrop isn't visible) — all **assertable in Node** with the existing shims.

---

## 6. Keep vs rebuild, and how verification adapts

**Portable (unchanged):**
- **All content/logic/calibration** — modes, the 14‑event roster + gauntlet, Arena stat‑check
  + 120‑tier `def`, collectibles ladder, Gold/Momentum. Pure JS, Node‑gated.
- **The seeded generators** — icons/heroes/monsters/scenery/glyphs/eventart. They keep
  emitting grids; the FX layer is a new *consumer* of those grids.

**Rebuilt / added (additive only):**
- A single **`fxgl.js`** (or similar) WebGL2 backdrop module + inline GLSL strings, plus a
  small **palette/ramp** authoring table per biome. No change to existing modules' APIs.

**Accessibility plan (text/input must stay first‑class):**
- **Text, numpad, menus, results, HUD remain DOM** — unchanged. The FX canvas is **decorative,
  `aria-hidden="true"`, `pointer-events:none`**, exactly like the current `#fxCanvas`. So
  TalkBack/VoiceOver, focus order, OS font scaling, and 44px tap targets are **untouched**.
  This is the single biggest reason to prefer the hybrid over a WebGL/engine UI.

**How the two‑agent gates adapt:**
- **Logic still gates in Node** — no change; that model is preserved precisely *because* we
  don't move logic into an engine.
- **Generators still gate in Node** by deterministic grid snapshot (already do:
  monster‑variation, scenery, glyph, eventart distinctness).
- **The FX layer gates in three Node‑friendly ways** without a real GPU:
  1. **Pure‑function tests** of the non‑GL math — the Bayer threshold table, palette‑ramp
     quantisation, particle **seeding** (deterministic positions from `hashStr`), the
     degrade‑ladder selector. Factor these as pure JS so they run headless.
  2. **Budget/cap invariants** — particle buffer length ≤ cap, single RAF, context released
     when hidden, `prefers-reduced-motion` → static path. All shim‑testable, like `perf.test.js`.
  3. **A WebGL stub** (mock `getContext("webgl2")` counting `drawArraysInstanced`/`texImage2D`
     calls) to assert "one instanced draw, textures uploaded once," mirroring how `sound.test.js`
     stubs `AudioContext`.
- **What Node can't do: true pixel correctness / real frame time.** Options, in preference
  order: (i) keep visual correctness **out of CI** and verify on‑device during the spike
  (cheap, honest); (ii) optional **golden‑image diffing via Playwright headless GL** as a
  *separate, opt‑in* check — but it needs a browser/WASM GL and a bundler‑ish step, which
  **dents the no‑build/Node‑only purity**, so treat it as elective, not a core gate; (iii) an
  on‑device **frame‑time HUD** (we already have a mono HUD) for manual perf sign‑off.

---

## 7. Recommendation + phased, reversible plan

**Recommendation:** build the **hybrid DOM + WebGL2 FX layer (§3a)**, ship via **TWA (§3e/§4)**,
**compose with — never replace — the existing seeded generators (§2)**. This captures
brickmap's *character* (§1: dither, ramps, particles, fog, mono HUD) while keeping all three
crown jewels intact. Defer any engine/native rewrite indefinitely.

### Phase plan
- **Phase A — First spike (this is the reversible bet).** One new `aria-hidden` WebGL2
  canvas **behind the existing menu**, rendering: an atmospheric gradient sky + the
  **`EventArt`/`Scenery` grid as a dithered, palette‑quantised texture** + a few thousand
  **instanced particle motes** seeded from the same hash. **No DOM/logic change**; the layer
  is purely additive and can be deleted in one commit.
- **Phase B (only if A passes).** Extend the backdrop to **Arena scenes** (reuse
  `Scenery.buildGrid` per region; embers/snow from the named accents) and **screen
  transitions**.
- **Phase C.** Denser **battle/level‑up FX** over `fx.js`; per‑biome ramps for every region;
  optional WebGPU enhancement path behind a feature‑detect.
- **Cross‑cutting:** T72 (TWA/manifest/service worker) proceeds in parallel — it's needed to
  *prove* the look on a real device anyway.

### Spike success criteria (all must hold)
1. **Sustained 60 fps** for the menu backdrop on a **real mid‑range Android tablet** (~£80–120,
   e.g. a recent budget Lenovo/Samsung A‑series), with the degrade ladder allowed.
2. **Zero accessibility regression** — TalkBack reads the menu exactly as before; focus order,
   font scaling, tap targets unchanged (FX canvas is decorative/aria‑hidden/pointer‑none).
3. **No‑build preserved** — one extra static `.js` + inline GLSL strings + a manifest/SW for
   the TWA; **no bundler, no transpile**, still `git push` → GitHub Pages.
4. **Gates preserved** — all existing Node gates stay green; the FX layer adds **pure‑function +
   budget + GL‑stub** Node tests (§6); `perf.test.js` invariants (single RAF, capped pool,
   idle‑when‑hidden, reduced‑motion) hold.
5. **The existing generators are visibly *elevated*, not hidden** — the spike must render *our*
   `EventArt`/`Scenery` seeds through the new lens, not a generic noise field.

### Kill criteria (any one → stop / revert the spike)
- Can't hold **≥30 fps** on the min‑spec target even at the lowest degrade rung.
- **WebGL2 unavailable** on a meaningful slice of target devices and the 2D fallback can't
  approximate the look acceptably.
- The decorative canvas **introduces input latency or a11y regressions** in the DOM HUD
  (compositing jank, TalkBack confusion).
- Keeping the FX layer **forces a build step or breaks Node‑gateability** of game logic.

Because the spike is one additive, `aria-hidden`, deletable module, **reverting is a single
commit** — the bet is cheap and the downside is bounded.

---

## 8. Risks, unknowns, and open questions for the owner

- **Device tail.** Real fill‑rate on the cheapest in‑use tablets is the biggest unknown — only
  an on‑device spike answers it. (Drives criteria 1 & the kill rule.)
- **WebGPU timing.** WebGPU would raise the ceiling but isn't broadly available on the Android
  long tail yet → baseline **WebGL2**, enhance later.
- **Golden‑image testing tension.** True visual‑regression testing wants a headless browser/GL
  (Playwright) — which conflicts with the no‑build/Node‑only gate model. Recommend **on‑device
  sign‑off + pure‑function/budget Node tests**, and only adopt golden images if the owner
  accepts an opt‑in, non‑core check.
- **Open questions for the owner:**
  1. Confirm the **primary target device(s)** (which cheap Android tablet/phone to certify on).
  2. Is a **single elective Playwright visual check** acceptable, or must verification stay
     **strictly Node‑only**? (Affects how we gate pixels.)
  3. Appetite for **WebGPU** as a later enhancement, or WebGL2‑only for simplicity?
  4. Does the brief's brickmap = **Rust + wgpu/Bevy voxel ray‑marcher** attribution match
     reality? (If `00-1/brickmap` is added to scope, I'll re‑verify §1 against its source.)

---

### Appendix — mapping brickmap techniques to Halves files (quick reference)

- Dither/quantise/fog post‑process → **new `fxgl.js`** (additive), reads textures from below.
- Per‑biome ramps → author alongside **`scenery.js` THEMES** + **`eventart.js`** hues.
- Particle splats → GPU sibling of **`fx.js`** (keep `fx.js` for capped DOM‑canvas confetti).
- Mono HUD → **already DOM/CSS** (`--mono`, `#counter`, `#clock`, build line) — amplify, keep on DOM.
- Content/logic/calibration → **unchanged**, still Node‑gated.
