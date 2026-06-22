# Research — representing an accumulating COIN HOARD (impression, not physics) · T174

Owner vision (full spec: `docs/agent/GOLD-HOARD-DESIGN.md`): a Smaug/Scrooge gold hoard
that **piles up organically** on the home backdrop as Goblin Gold accrues, with
**individual beveled coins** visible ("circles at different angles, with the bevel"),
fed by coins that **fly in from the earn-point**. Crucially — **NOT thousands of physics
particles**, just *"the overall impression of amassed coins."* This doc is the
research/art pass that **precedes** the T172 engine build; it picks the technique and
surfaces it for the owner's thumbs-up.

The hard constraints it must fit: `fxgl.js`'s `PARTICLE_CAP = 512`, the low/med/high
degrade ladder, `prefers-reduced-motion` → a static still, and DPR-aware crispness
(`pxScale`, the T138 lesson). And it must stay T153-purple-compliant (gold-on-purple).

---

## 1. The core trick the genre uses: imply the bulk, render only the surface

Every stylised "big pile of small things" you can think of shares ONE move: **they do
not model the pile — they model the SILHOUETTE and scatter detail only on the skin you'd
actually see.** The buried interior is never drawn or simulated; it's a shaded shape. The
eye infers "thousands" from a believable surface over a solid mass.

| Reference | How the mass is implied (not simulated) | What we borrow |
|---|---|---|
| **DuckTales money bin** (NES + 2013) | a flat gold **silhouette** with a sparse scatter of coin/gem glyphs and a few specular sparkles; the "depth" is pure shading | mound silhouette + sparse surface glyphs + glints |
| **Spyro gem hoards / Crash Wumpa piles** | a low **heap mesh** with a handful of full-detail gems on the crest; bulk is a textured/shaded gradient | crest-weighted surface scatter; detail only on the lit top |
| **Clash of Clans gold storage** | the fill **level rises on a curve**; coins are a banded silhouette that grows in height, a few coins on the rim | saturating level→height curve; banded shading |
| **Leaf / gravel / snow drifts (stylised)** | a **heightfield profile** (a smooth mound curve) + **blue-noise surface scatter** of a few hero leaves/stones + dither shading down the slope | heightfield profile + poisson-ish surface scatter + dither |
| **Scrooge's vault dive (DuckTales movie)** | giant gold **mass** = a lit gradient; individual coins only where light hits the surface, the rest is a glow | 3-tone gold ramp; coins concentrated in the lit band |

The throughline (and the owner's stated instinct): **a shaped, lit silhouette + dither
shading + a thin layer of individually-rendered SURFACE items with per-item variation.**
This is also exactly brickmap's house style ("expose the tech": a luminance gradient-map
with ordered dithering + a splat scatter), so the recipes port cleanly.

---

## 2. Brickmap recipes that map directly (port the technique, not the engine)

Surveyed `00-1/brickmap` (B has access). Three of its shipped techniques are a near-1:1
fit — we already borrowed the dither + splat ideas for `fxgl.js`'s scene/particles, so
this extends the same lineage:

- **Seeded surface-scatter via `hash01` (foliage `scatter()`, `bm-world/src/foliage.rs`).**
  Brickmap scatters grass/undergrowth by hashing each surface column with several *salts*
  → deterministic per-item **jitter / size / angle / variation**, and **thins a hashed
  subset** ("a hashed subset thin it for a natural look") with density scaled by a slow
  `lushness` hash. → Our hoard's surface coins: hash the (cell, tier, salt) for each
  coin's **position jitter, radius, rotation, squash, gold-tone, glint phase**; density
  scales with the gold level. Deterministic ⇒ the static buffer only re-seeds on a tier
  change (cheap), and it's headless-testable like the existing `seedParticles`.
- **Disc-mask splat + centre-bright shading (`splat.wgsl`).** Brickmap's splat FS discards
  outside a disc (`length(uv) > r`) and adds a "slight centre-bright shading so blades
  aren't flat discs." → The **beveled coin** is this plus a rim highlight + a small
  off-centre specular dot: 3 gold tones (highlight / mid / shadow) by radius, an elliptical
  squash for angle. Same single-quad instanced splat we already render — just a richer mask.
- **Ordered Bayer dither over a luminance→palette ramp (`palette.wgsl`; already in `fxgl.js`
  as `BAYER`/`buildRamp`/`quantizePixel`).** → Shade the **mound body** behind the surface
  coins with the existing gold ramp + dither, so the bulk reads as amassed metal at low-fi
  without a single extra particle. The mound is *scenery shading*, not particles.

Deliberately **not** ported: brickmap's 3D world-space billboarding / camera recession —
our hoard is a 2D screen-space band at the bottom of the backdrop.

---

## 3. Recommended technique for the coin hoard

A **three-layer composite**, cheapest-first, all inside the existing home backdrop:

**Layer A — the mound SILHOUETTE (scenery, 0 particles).** A screen-space heightfield at
the bottom of the backdrop: a smooth profile `h(x) = level · base(x)` where `base(x)` is a
gentle dune curve (a couple of summed cosines + a hashed micro-roughness so it's organic,
not a parabola). Fill below the profile with the **gold ramp + Bayer dither** (darker at
the base, brighter near the crest — fake AO). This is the "bulk," drawn as shaded scenery
in the scene fragment path — it costs nothing per-coin and carries 90% of the "amassed"
read.

**Layer B — the SURFACE coins (particles, the hero detail).** Scatter `N(level)` beveled
coins on a thin band hugging the profile crest (poisson-ish: a jittered grid via `hash01`
to avoid clumps/grid-lines — blue-noise feel without a real poisson pass). Each coin:
disc + rim highlight + inner radial gradient + one specular glint, 3 gold tones, a
**per-coin rotation + vertical squash (ellipse)** so they lie at varied angles. Weight the
scatter density toward the **lit crest** (where the eye looks); sparse on the flanks. Only
the surface is ever drawn — never the interior.

**Layer C — EARN converge burst (transient, T172(d)).** On banking gold, emit a small
burst from the earn-point that **arcs toward the hoard band and settles** (an attractor
path: emit → converge on the target region → land), then the mound ticks up a tier. This
extends the T152 point-emission with directed/attractor motion (vs today's disperse-fade).

### The growth curve (gold → level)
A **saturating** map so early gold visibly shows and big totals plateau gracefully under
the cap:  `level = 1 − 1 / (1 + gold / K)`  (or `level = log(1+gold)/log(1+K_max)`,
clamped 0..1). `level` drives, in order of visual weight: **mound height → footprint width
→ surface-coin count → glint rate**. Quantise `level` into ~6–8 **tiers**; re-seed the
static coin buffer only when the tier changes (not per frame, not per coin earned).

### Budget / cap / degrade
Surface coins are the only particles: cap them low — suggested **~120 (low) / 220 (med) /
340 (high)** at full level, all well under `PARTICLE_CAP = 512` (leaves headroom for the
existing home motes + the transient earn burst). Coverage/height/density — not raw count —
is what grows, so the mound keeps feeling richer after the coin count plateaus (Layer A
keeps scaling). **DPR-aware** coin sizing via `pxScale` (coins stay crisp, never sub-pixel).

### Reduced motion
`prefers-reduced-motion` → a **static pile**: Layer A + Layer B rendered once as a still
(no glint shimmer, no flying earn coins — the earn just snaps the mound to the new tier).
The deterministic seed makes the still identical to a paused animated frame.

---

## 4. Honest wins / limits

**Wins:** looks like a hoard of thousands while drawing ≤ a few hundred coins; reuses the
instanced-splat + dither + scatter machinery we already ship (low risk, headless-testable
pure math: the profile, the saturating curve, the scatter attrs, the converge path);
plateaus gracefully (no cap blow-out); gold-on-purple stays T153-compliant; degrades and
reduces-motion cleanly.

**Limits / things only the owner's eye can settle (open choices for the LIVE build):**
mound shape + position (full-width shallow drift vs a centred heap) and max height; the
saturating curve's *feel* (how fast early gold shows vs the plateau — tune `K`); coin size
range, glint rate, and how strongly to crest-weight the scatter; the earn-point source
(gold pill vs answer point vs reward toast) and the converge arc's feel. The mound must
stay **low + behind** the tree/buttons with text contrast preserved (home a11y bar) — a
hard legibility constraint, not a taste call. A true blue-noise/poisson scatter is
overkill; the hashed jitter-grid reads the same and is cheaper + deterministic.

**Recommendation:** build T172 as the three-layer composite above — Layer A (dithered
mound silhouette as scenery) + Layer B (`hash01`-scattered beveled-coin splats, count on
the saturating curve) + Layer C (attractor earn-burst) — with the cap/degrade/reduced-
motion behaviour specified here. Surface-only, impression-first, fully within the existing
engine. **Owner thumbs-up on §3 + the open choices in §4 before T172 builds.**
