> ⚠️ **PARTIALLY SUPERSEDED (2026-06-23) — see `BRICKMAP-GG1.md`.** The *mechanism* here
> ("extract a game-agnostic CORE from the GG1 **web** JS, incrementally, suite-green") is **dead**:
> GG2 (and the GG1 re-base) move onto the **brickmap** engine, so we do not extract an engine from
> the web app. **What SURVIVES intact and is carried into `BRICKMAP-GG1.md`:** (1) the **PACK
> CONTRACT** below — the durable seam; (2) the **CORE/SPLIT/PACK boundary taxonomy**, re-cast as
> *engine half → brickmap · framework half → future `gg-kit` · PACK → game data*; (3) the
> **guardrails** (one-way deps, the no-leakage grep gate, save-namespacing). Read this for the
> boundary analysis; read `BRICKMAP-GG1.md` for the current (brickmap) plan.

# GG2 · P0 — CORE / PACK extraction plan (file-level) — Babysitter, 2026-06-22

> Prep spec for milestone **P0.1** (the core/pack refactor) so the GG2 run starts on a concrete, buildable
> first milestone, not a blank page. **Principle (locked, FRANCHISE-DESIGN §3): EXTRACT, don't rebuild.** GG1
> already works — P0 splits it into a game-agnostic **CORE** (engine + shell) and a **CONTENT-PACK**
> (everything GG1-specific), so GG1 becomes `CORE + gg1-pack` and GG2 is `CORE + gg2-pack`. Grounded in the
> real file inventory (line counts below). Companion: `GG2-P0-INPUT.md` (the pluggable input contract).

## North star
- **GG1 must keep running BYTE-FOR-BYTE the same** on `CORE + gg1-pack` — the refactor is mechanical, not a
  redesign. Every GG1 test stays green throughout; the enumeration harness + the live app are the proof.
- **A new game = write a pack, not fork the engine.** "GG-template" = CORE + an empty pack skeleton.
- Do it **incrementally** (one module out at a time, suite green after each) — never a big-bang rewrite.

## Per-file disposition (the real GG1 tree)
| File | lines | → | Notes |
|---|--:|---|---|
| `fxgl.js` | 1925 | **CORE** (engine) | WebGPU→WebGL2→Canvas2D render engine + dither/halftone. The **hoard** is a CORE "wealth-display" primitive; the **scene compositions** (biomes/backdrops) are pack-fed data. |
| `fx.js` | 207 | **CORE** | particle FX primitives. |
| `icons.js` | 226 | **CORE** | the house pixel-icon mask system (UI chrome). Brand/topic glyphs → pack. |
| `sound.js` | 176 | **SPLIT** | SFX **engine/bus/limiter** = CORE; the specific GG1 SFX specs = pack (with CORE defaults). |
| `synth.js` | 807 | **SPLIT** | the **synth engine** + context framework = CORE; the **12 GG1 STYLES/CONTEXTS** = pack data. |
| `collectibles.js` | 1099 | **SPLIT** | the **collection FRAMEWORK** (categories, rank-ladder logic, `evaluate*` fns) = CORE; the GG1 **catalogue entries** (ranks, awards, loot, emblems, the Collector ladder) = pack. |
| `events.js` | 156 | **SPLIT** | the limited-time-event **framework** = CORE; GG1 event **content** = pack. |
| `eventart.js` | 80 | **PACK** | GG1 event art. |
| `modes.js` | 994 | **PACK** | the 32 topic generators → GG2 = VR generators. |
| `guides.js` | 600 | **PACK** | guides + `explain()` → GG2 content. |
| `glyphs.js` | 134 | **PACK** | per-topic glyphs. |
| `heroes.js` | 63 | **PACK** | GG1 metagame roster → GG2 crops. |
| `enemies.js` | 391 | **PACK** | GG1 arena enemies → GG2 beasts. |
| `monsters.js` | 111 | **PACK** | monster art → GG2 beast art. |
| `scenery.js` | 85 | **PACK** | backdrops → GG2 biomes. |
| `emblems.js` | 138 | **PACK** | GG1 emblems. |
| `main.js` | 3190 | **SPLIT (the big job)** | see below. |
| `sw.js`/`manifest`/`index.html`/`styles.css` | — | **CORE shell** (templated per app) | per-app cache prefix + save namespace (T222/`FRANCHISE-HOSTING.md`). |

## Carving `main.js` (3190 lines — the bulk of P0)
It mixes the **shell** (CORE) with **GG1 wiring** (pack). Split into CORE modules + one GG1 game module:
- **CORE → `core/`:** `router.js` (hash routing/screens), `round.js` (the question round loop + the **input
  dispatch**, see `GG2-P0-INPUT.md`), `progression.js` (unlock-chain/mastery/streak/momentum), `collection.js`
  (collection engine + the **T218 nav-badge "new-since-seen"** system), `settings.js` (audio/settings/onboarding/
  update-flow/dev-mode), `shell.js` (boot, screen scaffold, the title/splash renderer, gold/hoard display).
- **PACK → `gg1/game.js`:** which topics load + their order, the **Arena metagame** (hero party, enemy tiers,
  the battle playout), the GG1 catalogue wiring, the GG1 splash branding. *(GG2's pack supplies the **Plants &
  Beasts** metagame in this slot instead.)*
- Method: extract the cleanest seam first (router or settings), re-point `main.js`, run the suite, repeat. The
  **metagame** (Arena) is the hairiest seam — do it last, behind a clear `pack.metagame` interface.

## The PACK CONTRACT (what CORE consumes — the seam)
CORE boots, finds the pack (a single global `window.PACK`, or a tiny per-app `pack.js` manifest), and drives it:
```
window.PACK = {
  id, name, version,
  topics,                 // generators (modes.js shape: build()→[{p,a,inputMode?}]) + groups + unlock chain
  guides,                 // {id: guide} + explain(id, q)
  input,                  // which input modes this pack uses (GG2-P0-INPUT.md); MCQ default
  collection,             // catalogue entries + the evaluate hooks (CORE runs the ladder math)
  metagame,               // { render(host), onRoundEnd(result), state }  ← Arena (GG1) / Plants&Beasts (GG2)
  visuals,                // { scenes/biomes, glyphs, palette, brand, splashTitle }
  audio,                  // { styles (synth contexts), sfx overrides }
}
```
CORE owns: the round loop, input dispatch, progression/mastery, the collection ladder math, settings, the badge
system, render engine, audio engine, the shell/splash framework, save/namespace, update flow, dev mode. The PACK
owns: questions, guides, the metagame, the roster/art, the palette/brand, the music styles. **Anything that would
differ between a maths game and a verbal-reasoning game lives in the pack.**

## Guardrails
- **Save namespace per app** (`gg1prod.*` / `gg2.*`), isolated, **gold per-game from 0** — no cross-game state
  (T222 / `FRANCHISE-HOSTING.md`). CORE reads/writes through one namespaced `store` shim so a pack can't collide.
- **CORE is versioned/pinned** (P0.6): GG1 pins a CORE version; it only re-pins deliberately with its full suite
  green — so building GG2 on CORE can never regress GG1.
- **No GG1-specific string/asset left in CORE** — a grep gate (no `halves`/`goblin`/topic ids/hero names in `core/`)
  is the regression test that the split is clean.

## P0 exit criteria (DoD)
GG1 runs unchanged on `CORE + gg1-pack` (full suite green, app identical); a `gg2-pack` **skeleton** boots on CORE
showing the shell with placeholder content; the PACK contract is documented + grep-gated (no GG1 leakage in CORE);
save namespacing + CORE versioning in place. *Then M1+ (VR content) and M4 (visuals) build into the gg2-pack.*

*Living prep doc — refine as the first extractions land. Babysitter-owned. Cross-ref: GG2-MILESTONES P0, FRANCHISE-DESIGN §3–4.*
