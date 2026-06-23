# BRICKMAP-GG1-SPEC — the de-risking spike (+ go/no-go gate)

> Strand 3. Built on Builder B's research (`00-1/brickmap:docs/gg1-port-research.md`, **APPROVED**
> in `REVIEW.md` 2026-06-23). **⏸ AWAITING OWNER APPROVAL before B starts building.** This specs the
> smallest slice that de-risks the GG1-on-brickmap re-platform, and the gate that decides full commit.

## Framing (from the research)
GG1-on-brickmap is a **re-platform, not a port.** GG1 is a flat 2-D text+UI+audio game; it uses
brickmap's **presentation half** (render overlays, palette/dither post, particles, text, audio,
input, platform) and almost **none** of the voxel half (worldgen/mesh/cull). **Tailwinds:** the FX
recipes are brickmap's *originals* (`fxgl.js` was ported FROM the engine's WGSL); the audio DSP
(`Drone`: oscillators/SVF/FDN-reverb) already exists in Rust on cpal+web; headless render-to-PNG
works today (llvmpipe). **Headwinds = NEW engine work — exactly the owner's "bank reusable text +
menus":** legible text (**the #1 blocker**), UI/menus/keypad, save, golden-diff, a11y.

## Decisions — locked vs. needed-from-owner
- ✅ **JS reuse REJECTED** (research §B4: bloats APK, kills the parity-test win, forks behaviour).
  Re-implement GG logic in Rust against **T229's parity vectors**; **share DATA not code.**
- ✅ **Lives in `00-1/brickmap`** as `crates/goblin-gold` (`cdylib`+`rlib`, `brickmap` path dep),
  beside `scraped-again`. Workspace + engine↔game boundary already done (M9). **`gg-kit` deferred** —
  honour the PACK contract + one-way deps + the no-leakage grep gate from day one (already how
  `scraped-again` is built) so `gg-kit` extracts cleanly when GG2 is the 2nd data point.
- ✅ **JS reuse REJECTED** (research §B4) — "reuse JS" = *embed a JS runtime in the native binary*,
  which re-imports the web stack + its fragility and **kills the self-verify win** (you'd test
  JS-in-Rust, not native pixels) + forks behaviour web-vs-native. Re-implement GG logic in Rust
  against **T229's parity vectors**; **share DATA not code.** *(Owner's parity concern answered: the
  parity VECTORS are the behavioural contract — regenerate from the JS, CI goes red on any drift — so
  parity is **enforced** without a shared runtime; and GG1 is **done** (no ongoing logic change) +
  GG2 is brickmap-native (no web twin), so cross-platform drift never arises.)*
- ✅ **a11y — DEFERRED (owner, 2026-06-23).** The **web version remains** and covers the accessibility
  need for now; brickmap GG1 ships without a screen reader. Revisit only if formal *school
  distribution* becomes a goal.
- ✅ **Font path — PROTOTYPE FIRST (owner GO, 2026-06-23).** B's immediate task: prototype a legible
  font path (try **SDF-atlas** [recommended] and/or baked-TTF) and prove crisp prose on a **real
  phone**. This is the #1 blocker and the first mini-gate — clear it before the rest of the spike.

## The spike — "one legible drill, self-verified, on a phone"
A `crates/goblin-gold` skeleton that, on **native + web + APK**, does ONLY:
1. **Crisp text** — one question + a short **guide paragraph** via a NEW legible font path (SDF or
   baked-TTF) at 11+ reading size. *(De-risks the #1 blocker — settle prose legibility on a real phone.)*
2. **Drill loop** — one topic (e.g. `halves`), its questions **consumed from T229's `modes.json` +
   `parity-vectors.json`** (proves the **content data seam works cross-repo**); numeric answer via an
   **on-screen keypad** (touch) + digit keys; right/wrong marking. *(Proves UI/keypad + input + seam.)*
3. **One self-verified FX moment** — a correct-answer palette/particle flourish, **asserted by a
   headless golden-PNG diff test** (extend `headless.rs` with the golden-diff layer GG-web already
   runs in JS). *(Proves the self-verify win + native FX reuse — the founding reason for the pivot.)*
4. **Clean native-APK launch** — boots fullscreen on a real phone, no voxel world.

**Out of scope for the spike** (these are full-port phases, sized AFTER the gate): the full
46-topic/logic port, save/persistence, menus beyond the keypad, audio, a11y, multi-topic.

## Go/no-go gate (owner + Babysitter decide AFTER the spike)
Commit to the full re-platform **only if ALL** are clear:
1. **Text legibility = a clear YES** on a real phone for guide prose (the founding concern).
2. **Drill feel** — the keypad/answer loop feels good, not clunky.
3. **Self-verify works** — the golden-PNG diff actually **catches an injected regression** (test the test).
4. **APK** — clean fullscreen launch, no jank.
5. **Effort projection** — the full-port estimate (extrapolated from the spike) is acceptable.
If text or feel disappoints → reassess (more engine investment first, or brickmap isn't right —
better to learn it in a 2–3-week spike than a 3-month port). **On GO**, phase the full port: engine
services (text/UI/save/golden-harness) → logic re-impl vs parity vectors → content via T229/T230
data → audio re-author → polish.

## Sequencing (NOT time-boxed — owner: disregard the day estimates; these agents work in *hours*, not weeks)
The research gave engineering-day estimates (font 4–7d, UI/keypad 3–5d, crate+drill 3–4d, golden
harness 2–3d, APK/CI 1–2d). **Treat these as RELATIVE effort/ordering only — wall-clock is far
shorter here.** Run the spike as **ordered mini-gates**, font first:
1. **Font prototype (DOING NOW)** — legible prose on a real phone (SDF and/or baked-TTF). The #1
   blocker; if it can't be made crisp, stop and reassess before building anything else.
2. then keypad + one drill (consuming T229 data) → 3. the golden-PNG-verified FX moment → 4. clean APK.
The *full* port after a GO is still "more than the spike", but measured in this environment's hours —
not the human weeks-to-months the research framed it as.

## Risks to call before committing to the full port (research §D4)
1. **Font legibility is a hard dependency** — if SDF/TTF in this stack is fussier than expected, a
   text-heavy game wobbles. **The spike must clear this first** (gate #1).
2. **a11y regression for schools** — opaque canvas vs accessible DOM; owner decision, and may require
   the DOM-mirror/AccessKit work *to even ship to the audience*. (Proposal: defer unless school
   distribution becomes a goal.)
3. **Audio parity is perceptual, not vector-provable** — re-author to a music/SFX spec and A/B by ear;
   accept **"faithful, not bit-identical."** (Unlike the logic, which IS provable via parity vectors.)
4. **Scope honesty** — this is a **re-platform**, not a port. Payoff is real (engine hardened by 2
   games, self-verifiable rendering, native APK, GG2-native foundation) but it's weeks-to-months. The
   spike + go/no-go gate exist precisely to learn this in 3–4 weeks rather than 3 months.

## Deliverable
B builds the spike in `00-1/brickmap` (`crates/goblin-gold` + the engine font/UI/golden additions),
green CI (incl. the new golden test), and an **APK artifact the owner installs and judges**. Report
the gate evidence: phone screenshots of the prose text, the golden-diff test catching a regression,
and the APK launch.
