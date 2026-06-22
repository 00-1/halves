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
3. **EARN → coins burst from the earn-point (NO settling required — owner, 2026-06-22).** On banking gold, a
   burst of **spinning coins** flies out from the earn-point. **It does NOT need to converge/settle onto the
   pile** — the owner: *"new coins don't need to physically settle on the pile — we're usually not on the home
   screen when we earn, and the coins flying out already evoke landing in the hoard."* So the earn-burst is a
   **standalone spinning-coin burst** (fired wherever earning happens — drills/Arena), and the persistent mound
   simply reflects the new **total** the next time the player is on the home screen. **No attractor/target motion
   needed** (simplifies the engine — drop the converge requirement).

## Engine work [B] (`fxgl.js`) — the new capabilities
- **(a) Beveled-coin splat — must really READ AS A COIN (owner emphasis):** enhance the disc-mask fragment → a
  struck coin (rim highlight + inner radial gradient + specular glint, 3 gold tones). **Not "just particles."**
  A `look:"coin"` flag on the scene/particles so it's opt-in (the existing soft-dot look stays default elsewhere).
- **(b) Per-coin rotation + aspect/squash → varied angles, AND animated SPIN (owner):** static rotation+squash
  for the hoard's settled coins (varied angles); **for the EARN-burst coins, an animated SPIN** — the coin
  rotates over its lifetime (at least *some* of them), so flying coins tumble/glint like real coins, not flat
  dots. (Per-particle phase exists; add a rotation attr + a spin-rate; spin animates in-shader from the static
  buffer like the existing wind-sway.)
- **(c) Hoard scene mode:** a settled-at-the-bottom mound layout (not the wind-swayed field) whose **coverage +
  density + height** are a function of a `hoard` amount (0..1, the saturated gold level — see Calibration). Re-seed
  the static buffer only when the level **tier** changes (cheap; not per-frame).
- **(d) Spinning-coin burst (NO attractor):** the earn-burst = the `look:"coin"` splat with **animated spin**,
  fired from `{x,y}`, flying out + tumbling + fading (extends T152 point-emission with the coin look + spin).
  **No target/converge motion** — dropped per the owner (the coins needn't land on the pile).
- ~~(was: attractor/converge burst)~~ — a burst variant that emits from `{x,y}` and **moves toward a target region**
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

## FILL-RATE CALIBRATION (owner asked: what gold = a full pile? ~a few months of play)
**The economy (from `main.js`):** gold comes from `questionGold` (~2–6 × combo × **mult** per correct Q),
`roundBonusGold` ((score + rank) × **mult**), and Arena `tierGold` (11→130 × **mult**). The driver is
**`goldMult = 1 + items·0.05 + mastered·0.5 + heroes·0.5 + tiers·1`** — which climbs from **~1 (new)** to **~145
(everything collected: ~27 masteries, ~12 heroes, 120 Arena tiers, 100+ items)**. So earning is **super-linear**:
hundreds/day early, tens-of-thousands/day once progressed (Arena tiers alone add +120 to the mult and pay
`130 × mult`). *(Screenshot reference: a fresh player showed 1.23K gold at 1 Momentum.)*
- **Estimate for "a few months" of regular play** (progresses well — most topics mastered, many Arena regions
  cleared): cumulative gold realistically reaches **several hundred thousand to low millions.**
- **Proposed targets (TUNABLE — the owner tunes the feel on the live build):**
  - **Pile visibly *present* early:** a few K gold → a small but real mound (a new player sees it start).
  - **~Half-full ≈ ~50K gold** (a few weeks of steady play).
  - **"Full" pile ≈ ~500K gold** (a committed few-months player) — past which the *mound silhouette* keeps
    creeping (Layer A), but the surface-coin count has plateaued (cap-safe).
- **Curve:** expose a single **`GOLD_FULL` constant (≈500K)** + a **sub-linear shape** so early gold shows without
  the curve saturating too fast — e.g. `level = clamp((gold/GOLD_FULL)^0.4, 0, 1)` (gives ~9% at 1.2K, ~40% at
  50K, 100% at 500K) **or** the saturating `1−1/(1+gold/K)` with `K≈55K`. Quantise into ~6–8 tiers; re-seed only
  on tier change. **`GOLD_FULL` is the one knob the owner dials.**
- **Want a precise number?** I can run a quick **Node economy simulation** (rounds/day × accuracy → questionGold +
  roundBonus + Arena wins, with `goldMult` growing as collection fills) to estimate gold-after-N-days under a few
  play-frequency assumptions, and set `GOLD_FULL` from real curves rather than a guess. Say the word.

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
