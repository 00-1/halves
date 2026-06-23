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
- 🟠 **a11y — OWNER DECISION.** brickmap renders to an opaque GPU canvas → no screen reader (a
  regression vs GG-web's accessible DOM). Owner already said "no screen reader" for GG1.
  **Proposal: DEFER a11y, accept the regression; revisit only if formal *school distribution* becomes
  a goal** (B flags it may gate that). ← confirm.
- 🟠 **Font path — spike sub-decision.** SDF-atlas (**recommended:** crisp at any size, scales) vs
  baked-TTF atlas (simpler, fixed sizes). B prototypes in the spike; recommend SDF.

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

## Effort (research estimate, engineering-days, SPIKE ONLY)
Font/SDF path **4–7d** (the long pole — pick SDF vs baked-TTF first) · minimal UI + keypad **3–5d** ·
`goblin-gold` skeleton + drill loop **~2–3d** · golden-PNG harness **~2–3d**. **≈ 2–3 weeks.** A real
but bounded investment that de-risks the whole programme.

## Deliverable
B builds the spike in `00-1/brickmap` (`crates/goblin-gold` + the engine font/UI/golden additions),
green CI (incl. the new golden test), and an **APK artifact the owner installs and judges**. Report
the gate evidence: phone screenshots of the prose text, the golden-diff test catching a regression,
and the APK launch.
