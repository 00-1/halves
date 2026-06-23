# BRICKMAP-GG1 — direction + Builder B research brief

> Strand 3 of the 2026-06-23 architecture plan. **GG1-on-brickmap.** This doc captures the
> owner's direction and the **research-only** task for Builder B that must land **before** we
> finalise the spike/port spec. NOT yet a build task — B answers the open questions first.

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
