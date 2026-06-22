# Gold Hoard — design plan (owner vision → buildable spec)

> Owner's idea (2026-06-22, three messages): on the **main/home screen**, the player's **Goblin Gold visually
> piles up in the background and grows organically** as they amass more (Smaug's hoard / Scrooge McDuck). The
> pile shows **individual coins** — "circles at different angles, with the bevel" — not just an abstract gold
> mass. And **when you earn coins, they explode from the earn-point on screen and fly in to add to the mass.**
> Grounded against the real engine: `fxgl.js` already renders **instanced billboard particle splats with a disc
> mask** over the home scene, and `homeFxState` (main.js) already feeds `progress`/`streak`; `loadGold()` exists.
> So this **extends** existing systems (the home particle field + the T152 point-burst), not a rebuild.

## What it is — three pieces
1. **The HOARD (persistent, grows).** A settled gold particle field pooled at the **bottom** of the home
   backdrop; its **mound height / footprint / density** is driven by the gold total. Idle shimmer/glint. Sits
   **behind the UI**, gold-on-purple (looks great + stays T153 fixed-purple compliant).
2. **Individual COINS (the look).** Each hoard particle is a **coin**, not a blob: the disc-mask splat gets a
   **bevel** (rim highlight + inner radial gradient + a small specular glint; 3 gold tones highlight/mid/shadow)
   and **per-particle rotation + a vertical squash (ellipse)** so coins lie at **varied angles** and catch light
   differently. Individual coins are discernible within the mass.
3. **EARN → coins fly into the hoard.** On banking gold, a burst fires **from the earn-point**, the coins **arc
   toward the hoard region and settle**, and the mound ticks up. (Extends T152 point-emission with a NEW
   directed/attractor motion: emit → converge on a target → land, vs today's disperse-and-fade.)

## Engine work [B] (`fxgl.js`) — the new capabilities
- **(a) Beveled-coin splat:** enhance the disc-mask fragment → a coin (rim highlight + inner gradient + specular
  glint), driven by a gold palette. A `look:"coin"` (or a flag) on the scene/particles so it's opt-in (the
  existing soft-dot look stays the default for other scenes).
- **(b) Per-particle rotation + aspect (squash)** as instance attributes → varied coin angles. (Per-particle
  phase already exists; add rotation + aspect.)
- **(c) Hoard scene mode:** a settled-at-the-bottom mound layout (not the wind-swayed field) whose **coverage +
  density + height** are a function of a `hoard` amount (0..1, the saturated gold level). Re-seed the static
  buffer only when the level **tier** changes (cheap; not per-frame).
- **(d) Attractor/converge burst:** a burst variant that emits from `{x,y}` and **moves toward a target region**
  (the hoard) then settles, instead of dispersing. (Pairs with the persistent hoard re-seeding slightly larger.)
- **Constraints:** respect `PARTICLE_CAP` (512) + the degrade ladder (low/med/high) — the mound grows by
  coverage/height/density under the cap, via a **saturating gold→level curve** (e.g. `level = 1 - 1/(1+gold/K)`
  or a log map) so it keeps feeling richer and plateaus gracefully. **prefers-reduced-motion → a STATIC pile**
  (no flying coins, no shimmer). DPR-aware sizing (the existing `pxScale`) keeps coins crisp. Headless-test the
  pure math (coin instance attrs, the saturating curve, the converge path) like the other fxgl tests.

## Wiring [A] (`main.js`) — after the engine exists
- Add the **gold/hoard level** to `homeFxState` (saturating curve over `loadGold()`); pass it into the home
  scene so the backdrop renders the mound. Re-render the home state on gold change.
- On `addGold(...)` (the existing earn path) **fire the attractor burst from the earn-point** (the gold pill /
  the answer point / the reward toast — pick what reads best) into the hoard; the persistent mound then reflects
  the new total.
- **Legibility:** keep the hoard low + behind the topic tree/buttons; verify text contrast over it (the home a11y
  bar). Reduced-motion → static.

## Open visual choices (for owner's eye on the LIVE build — feel can't be judged headlessly)
- Mound shape/position (full-width shallow drift vs a centered heap), how "tall" it's allowed to get, glint
  rate, coin size range, the earn-point source, and the saturating curve's "feel" (how fast early gold shows vs
  the plateau). I'll browser-verify it renders + is bounded; the owner tunes the feel.

## Core principle (owner, confirmed): IMPRESSION, not simulation
**The hoard is NOT thousands of physics particles** — it must just give the **overall impression of amassed
coins.** The established art-direction trick (leaf piles, gem hoards, money bins, snow drifts): **imply the bulk
with a shaped, lit silhouette + dither/shading, and only render the individual items you'd actually SEE — the
SURFACE coins — scattered with per-item variation.** Never render/simulate the buried interior. Individual
beveled coins read on the surface; the mass behind them is a shaded mound. This keeps it far under the particle
cap AND looks better. → A **research/art pass (T174) runs FIRST** to choose the technique, surfaced to the owner
before the engine build.

## Tasks (research-first, the owner's established workflow)
- **T174 [B] — RESEARCH/ART pass (do this FIRST):** survey how a stylized **accumulating mass of small items**
  is represented WITHOUT per-item physics — silhouette/heightfield + surface-scatter (poisson/blue-noise) +
  dither/palette shading + lit bevels; reference real examples (leaf piles, Spyro gems, DuckTales bin, Clash gold
  storages, snow/gravel drifts); borrow applicable **brickmap** dither/scatter recipes. Output: a short doc + a
  **recommended technique** for the coin hoard (how the mound silhouette grows on a saturating curve, how many
  surface coins to scatter under the 512 cap, the bevel/angle treatment, reduced-motion still). **Babysitter
  surfaces it to the owner for a thumbs-up before building.**
- **T172 [B]** — build the chosen technique in `fxgl.js`: the beveled-coin splat (rim highlight + inner gradient
  + glint), per-particle rotation + squash (angles), the **hoard scene mode** (silhouette + surface scatter
  driven by a saturating `hoard` level), and the **attractor/converge burst** (emit→fly to the hoard→settle).
  Headless-test the pure math; capped + reduced-motion-safe.
- **T173 [A]** — wiring (after T172): hoard level in `homeFxState` (saturating over `loadGold()`), fire the
  attractor burst on `addGold` from the earn-point, legibility behind the UI, reduced-motion. Owner tunes the
  feel on the live build.

*Babysitter design. B (idle) starts the RESEARCH (T174) → owner blesses the technique → B builds T172 → A wires
T173. Owner signs off the look on the live build.*
