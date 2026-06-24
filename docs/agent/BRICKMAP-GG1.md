# BRICKMAP-GG1 — direction + Builder B research brief

> Strand 3 of the 2026-06-23 architecture plan. **GG1-on-brickmap.** This doc captures the
> owner's direction and the **research-only** task for Builder B that must land **before** we
> finalise the spike/port spec. NOT yet a build task — B answers the open questions first.
>
> 📒 **LIVING FINDINGS / REUSABLE METHOD → `PORT-PLAYBOOK.md`** (kept current as the port runs; the
> reusable playbook + gotchas log for the NEXT port, GG2+). This file = the original plan; the
> playbook = what we actually learned.

## Owner direction (2026-06-23)
- **brickmap is an engine** with **one unfinished game ("Scraped Again")**. **GG1 would be the
  SECOND game** on the engine.
- We work **directly on the engine AND on the new GG game** — both tracks, together.
- **Engine work should bank anything reusable across games** — in particular **text rendering**
  and **menus** (every game needs them; build them into the engine, not the game).
- **Port the good parts of GG-web** into either the engine or GG-brickmap:
  - the **generative/procedural images** work (engine module or game asset layer);
  - the **audio engine** we built here (port it — it's good);
  - the **GG functionality is "done" → port it FAITHFULLY** (behaviour parity, not a redesign).
- **No strict requirement to use Rust exclusively.** Reusing GG-web code is on the table **if**
  it's actually a good idea — open question, see below.

## Architecture decisions (2026-06-23, owner-aligned)

### Where the port lives — same-repo, as a workspace
- GG-brickmap lives **in the `00-1/brickmap` repo** (same call as "Scraped Again"): co-locate
  engine + games, keep **Rust out of `halves`** (preserves the web app's no-build/Node-verify),
  no new repo (avoids the publish-a-crate ceremony we deliberately skipped).
- A **second** game is the trigger to make brickmap a **cargo workspace** — an `engine` crate +
  a `scraped-again` crate + a `goblin-gold` crate (path deps, **no crates.io**). Same one repo,
  but a clean engine↔game split, and it leaves a slot for a future `gg-kit` crate (below).
  *(B to report the current structure: single crate vs workspace.)*

### Three layers — NOT an engine-on-an-engine built up front
The old GG2 plan "turn GG into an engine for GG2+" is **superseded** by re-platforming. The clean
layering, built **bottom-up** (abstract from real cases, never speculatively):
- **brickmap = the platform engine** — rendering, input, audio, text, menus, particles, save.
  It absorbs anything *generic* (incl. the old-CORE "engine half"). Validated by **two** games
  immediately (Scraped Again + GG1) — which is exactly why GG1 hardens the engine.
- **GG1 = a plain game on brickmap** — **no framework built up front**. The only forward-reusable
  thing carried now is the **content-as-data model** (data, not engine; cheap).
- **gg-kit = the GG-genre framework, EXTRACTED LATER** (when GG2 supplies a *second* data point),
  from GG1-brickmap + GG2 — not guessed. It will be **thin**, because brickmap ate the generic half.

### The seam = the PACK CONTRACT (preserved from `GG2-P0-EXTRACTION.md`)
The durable artifact of the old extraction plan survives intact — only its *mechanism*
("extract CORE from the web JS") dies; the *boundary* is re-platform-invariant:
```
PACK = { id, name, version, topics, guides, input, collection, metagame, visuals, audio }
```
Re-cast of the old CORE/SPLIT/PACK tags for the brickmap world:
- old CORE **engine half** (fxgl/fx/icons-render/sound+synth *engines*/shell-render) → **brickmap**
- old CORE **framework half** (round loop, input dispatch [`GG2-P0-INPUT.md`], progression/mastery/
  unlock-chain, collection-ladder math, the T218 nav-badge system, settings/update, **and the PACK
  contract itself**) → **future `gg-kit`**
- old **PACK** (modes/guides/catalogue/metagame/visuals/audio-styles) → **`gg1-pack` (game data)**
- the SPLIT modules split *across that line*: engines→brickmap, frameworks→gg-kit, GG1 specifics→pack.

### Design-for-extraction discipline (work this way NOW so the seam breaks cleanly later)
Do **not** build `gg-kit` as a crate yet — build GG1-brickmap so the seam is **already real**, so
extracting it later is a *move*, not a *refactor*. Five rules, all free:
1. **Honor the PACK CONTRACT from day one** — framework-candidate code consumes `pack.*`; it never
   reaches around the contract to touch GG1 directly.
2. **One-way dependencies** — framework modules never import the pack; the *game* wires the pack
   into the framework. (A crate can't have circular deps → the later split is mechanical.)
3. **No-leakage grep gate** (port the old guardrail) — no `goblin`/topic-ids/hero-names/palette
   literals inside framework modules; the gate is the regression test that the seam stays clean.
4. **Data-drive content + theme** — the content-as-data model *is* the pack; the framework is
   parameterised by data, never hardcoded to Goblin Gold.
5. **Sink generic things DOWN into brickmap**, not sideways into gg-kit — keeps gg-kit thin and
   genuinely GG-genre.
Net: GG1-brickmap **ships as ONE crate** organised as `gg-kit-modules + gg1-pack-data`; when GG2
validates the seam, extracting `gg-kit` into its own workspace crate = a file-move + a `Cargo.toml`.

### Shared code/data between web-GG1 and brickmap-GG1
- **Share DATA, not rendering.** The two versions share almost no executable UI/audio/FX code.
  The overlap = content: lift `modes.json`/`guides.json`/`balance.json`/`collectibles.json` + a set
  of **parity test vectors** (`input → expected {p,a}`, generated from the current JS) so the port
  can *prove* it reproduces GG1 exactly.
- **Canonical content stays in `halves` for now** (already built + tested, 959 questions); the
  brickmap port consumes a **generated export** (one-way sync, no submodule ceremony). Flip the
  canonical source into brickmap only if/when it becomes the *primary* GG1.
- **Sharing the transform CODE (embed JS in brickmap) is DEFERRED to B's JS-feasibility finding.**
  If yes → reuse the JS transform module; if no → re-implement transforms in the engine language
  against the shared test vectors. (This is question #4 below.)

## Open questions for Builder B (RESEARCH ONLY — no engine/game code changes this pass)
Builder B has **`00-1/brickmap` access**; the Babysitter does **not**. B investigates the repo
and reports back so we can finalise the plan.


### A. Engine architecture & current capability inventory (have / partial / missing)
1. Overall architecture: core crates/modules, the render pipeline (the WGSL `bm-render` core),
   and **platform targets** — how it builds/runs on **web** (WebGPU/WebGL2?) and on **native
   Android APK** (wgpu/winit/NDK? how is the APK produced today?).
2. Capability matrix — for each, state **exists / partial / missing** and quality:
   - **Text/font rendering** (glyph atlas? SDF? legibility at small 11+ reading sizes? the
     original concern — settle it with evidence on web *and* native).
   - **UI / menus** (any system today? immediate vs retained mode?).
   - **Input** (touch, on-screen **numpad**, keyboard, pointer).
   - **Audio** (any subsystem? backend on web vs native?).
   - **Persistence / save** (local-storage equivalent on web + native).
   - **Game loop / scene / entity** structure.
   - **Particles / FX** (what the dither/palette/particle WGSL recipes already provide).
   - **Asset / texture pipeline** (procedural/generative texture support — relevant to porting
     our generative images).
3. **"Scraped Again"**: how is it structured against the engine? **Where is the engine↔game
   boundary?** This is the template for how GG1 would be built — describe it concretely.
3b. **Repo structure:** is brickmap today a **single crate** or a **cargo workspace**? Feasibility
   of an `engine` crate + per-game crates (path deps, no crates.io), and how much restructuring a
   *second* game implies. *(Feeds the workspace decision above + the future `gg-kit` slot.)*
3c. **Which old-CORE "engine half" items does brickmap ALREADY provide?** Map against the list:
   text/font, menus/UI, input dispatch, particles/FX, audio bus+synth, save/persistence, the
   shell/render framework. This **sizes how thin `gg-kit` gets** (anything brickmap already covers
   sinks down and never enters gg-kit). Cross-ref the re-cast table in "Architecture decisions".

### B. Reuse feasibility — the owner's explicit questions
4. **Can the web target run JavaScript?** Is there any JS interop (wasm-bindgen, an embedded JS
   runtime, a webview layer)? On **native APK**, could a JS engine be embedded, or Node run —
   and **is that a bad idea?** Give a straight engineering verdict.
5. For each GG-web asset, recommend the **best port path** with reasoning:
   - **Game logic** (modes / events / collector / drill loop / arena) — reuse JS, or re-implement
     (Rust or other) against the engine? (Note: GG content/balance will be extracted to an
     **engine-agnostic data spec** — see Strand-2 seam — so logic ≠ content.)
   - **Audio engine** (currently Web-Audio based) — port to native audio, a web-audio-compatible
     layer, or re-author? What does brickmap's audio support make easiest?
   - **Generative images** — port into the engine (procedural-texture/render module) or into
     GG-brickmap? Feasibility + where it belongs.

### C. Tooling, verification, a11y
6. **Build toolchain** for web + native APK (cargo, trunk/wasm-pack, gradle/NDK…) and whether a
   **CI build** (GitHub Actions) is realistic for both targets.
7. **Self-verifying rendering**: confirm (with how-to) that a builder can **render headless to a
   buffer and assert on pixels** — the workflow win we're betting on (vs our DOM whack-a-mole).
8. **a11y** options: web (DOM mirror for screen readers?) and native (TalkBack) — what's possible
   for an 11+ school audience.

### D. Synthesis B should deliver
- A **capability matrix** (have/partial/missing) and a **reuse-feasibility verdict** (JS / Node /
  Rust / other, per subsystem).
- A **map of GG1 subsystems → brickmap** (what exists, what's new *engine* work, what's *game*
  work), honouring "engine work banks reusable text+menus".
- A proposed **engine↔game boundary** for GG1-brickmap and **where it lives** in the repo.
- A proposed **spike scope** (the smallest slice proving: crisp text · drill loop · one
  self-verified FX moment · clean native-APK launch) **+ a rough effort estimate**, and any
  blockers.

## Deliverable / mechanics
- **Research only — no engine or game code changes.** Output = a research report B pushes to the
  **brickmap repo** (e.g. `docs/gg1-port-research.md`), with a one-line pointer logged in
  `BUILDER-LOG-FX.md`. The Babysitter reviews it, then writes `BRICKMAP-GG1-SPEC.md` (scoped
  spike + go/no-go gate) for owner approval before any build work starts.
