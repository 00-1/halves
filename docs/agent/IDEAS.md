# Ideas — parking lot (NOT tasks; do NOT build)

> Babysitter-owned. A holding place for **future ideas the owner wants captured but
> not yet queued**. Nothing here is a task. The Builder must **not** pick anything up
> from this file — work is only ever the topmost `OPEN` task in `BACKLOG.md`. When the
> owner decides to proceed with an idea, the Babysitter promotes it into `BACKLOG.md`
> as a properly-specced task (or tasks) at that point.

---

## I1 — Events — ✅ PROMOTED to BACKLOG (Phase 6.5, T78–T81) on 2026-06-21

> **No longer a parked idea.** The owner brought Events forward ("I decided I like it a
> lot") and locked the design. It now lives as real tasks **T78–T81** in `BACKLOG.md`
> (Phase 6.5). Final owner decisions captured there: **14 events, daily rotation at
> 00:00 UTC** (each recurs every 14 days), real-buff rewards in a **new "Events" inventory
> tab**, **new event music**, a **cross-topic predetermined question mix**, best-attempt
> board entries that are **locked outside the live window**, and **no Arena UI** to explain
> event-gated foes (owner: unnecessary — an event is live every day). The notes below are
> the original sketch, retained only for provenance; **the BACKLOG is authoritative.**

**Concept.** Limited-time "challenges with rewards you can only get *today*" — a sense
of "be here now". They **rotate** (owner suggested roughly a **two-week cycle**) so a
given event comes around again later (FOMO, but not permanent loss).

**Owner's sketch.**
- Some kind of **special maths challenge** (a distinct mode/ruleset, not just a normal
  round), with **its own compelling graphics + text** (events should feel special, not
  reskinned).
- Possibly an **accompanying limited-time Arena** (or similar) tied to the event —
  e.g. a special foe / boss / region available only during the event.
- **Today-only rewards** that you miss if you don't play, but the event recurs on the
  cycle so the reward is obtainable again next time around.

**Key constraint to design around (important).** The game is a **static site, no
backend**. So events **cannot** be server-driven — the schedule and "what's live today"
must be **computed deterministically from the date** (a baked-in rotating calendar +
the device's local day). We already have a local-day signal (the T31 momentum
day-counter / `localDay`) to reuse. "Today-only" therefore keys off the device clock.

**Owner decisions (2026-06-21):**
- **Rewards are REAL buffs** (not cosmetic) — they carry hero boosts and feed Arena
  power, same as drill/loot collectibles.
- **A new dedicated tab** for event rewards (alongside Topics / Awards / Loot in the
  inventory), and they likely form their own **collectible category** ("Events").

**Owner decision (2026-06-21) — event buffs MAY gate Arena tiers:** event buffs are
**full collection members** and it's **fine for high tiers to require them**. Rationale
(owner): it's only a **~2-week recurring gate** (events cycle, so the buff is always
obtainable again — never a permanent lock), and we **already** gate collectibles behind
much longer time investments — e.g. the **75-day "Peak Momentum"** milestone. So event
buffs simply join the collection the Arena calibration considers; the top tiers naturally
come to need near-full (including events). *(Babysitter had suggested excluding them —
owner overruled, correctly: the 75-day precedent makes a 2-week gate mild.)*

**Invariants that still hold regardless (NOT about event-gating):** these are about the
difficulty-curve shape and are independent of whether events are required —
- **tiers 1–5 still winnable at 0 items** (a brand-new player can always start climbing);
- **def monotonic non-decreasing**; **no tier gated behind its OWN loot** (T23/T43/T47/T66).
  Adding event buffs to the collection only raises the high-end ceiling; it doesn't touch
  these. Just re-prove them when events ship (the `arena.test.js` suite already does).
- One thing to confirm at build time: a tier whose `def` rises because of event buffs must
  not become **un-attemptable** for a player who hasn't done the event yet *and can't until
  it recurs* — acceptable per the owner (come back in ≤2 weeks), just make the UI **explain
  it** ("this foe needs an event buff — next event in N days") so it doesn't read as a bug.

**Open questions to resolve before queuing (don't decide now):**
- **Rotation schedule.** A fixed ordered list of N events cycling every 2 weeks,
  indexed by `floor(daysSinceEpoch / 14) % N`? Deterministic, offline-safe, recurs.
- **Surfacing.** A home-screen **"Event live!" banner / entry** with a countdown
  ("ends in 3 days"); its own art + copy.
- **The challenge itself.** A new ruleset (e.g. a themed mixed-topic gauntlet, a
  speed/accuracy gauntlet, a "boss maths" fight) — needs its own generator + a new
  procedural art set (per the anti-dilution rule).
- **Engagement, not pressure.** Keep it calm/forgiving (consistent with the momentum
  design — no streak-anxiety); a missed event recurs, never punished.
- **Scope.** Could be large (new mode engine + art + scheduler + Arena variant +
  banner). When queued, likely **several** tasks (scheduler/infra → one event template
  → art/copy → optional event-Arena), behind a short design doc.

*(Status: captured, NOT queued. Promote to BACKLOG when the owner says go.)*

---

## I2 — Visual character from brickmap — ✅ PROMOTED to BACKLOG (research, T82) on 2026-06-21

> **Owner refined + promoted (2026-06-21, round 2).** Pivot is **learn FROM brickmap, not use
> its engine**: bring its **performant, distinctive visual character** into Halves — **no
> voxels**. Strategy clarified: **Halves is primarily an Android app; web is dev convenience.**
> Guardrail: **our existing generative art (icons, hero portraits, monsters, scenery, glyphs) is
> already a strength and must NOT be lost — build ON it.** Aesthetic targets (owner screenshots):
> monochrome per-biome palettes, ordered dithering, particle splats, atmospheric gradients,
> exposed-tech mono HUD — at ~95–111 fps. Now a **deep-research doc task: BACKLOG T82** (Phase
> 6.7). This lands almost exactly on the "hybrid FX layer" kernel below — the recommended first
> spike. Notes below retained for provenance; **BACKLOG T82 is authoritative.**

## I2 (original) — Renderer rethink: move the UI into a graphical engine (e.g. brickmap)? (owner musing, 2026-06-21)

**The idea (owner).** Move Halves out of HTML/DOM and into a graphical renderer for a more
unique aesthetic + more graphical options — possibly **brickmap** (`00-1/brickmap`, our own
public Rust/wgpu voxel engine). Brickmap also *needs* a menu system; Halves is menu-driven, so
one could build a reusable engine menu system that serves both. Possibly a **third agent** with
access to both repos, babysat alongside the Builder. Owner explicitly invited a "shoot it down".

**Babysitter assessment — recommend AGAINST a wholesale UI pivot (esp. into a voxel engine).**
Reasoning, weighted against *our* constraints (kids' 11+ app, weak/school devices, no-build
Pages deploy, the independent-verification model):
- **Tool mismatch.** Brickmap renders vast 3D voxel worlds; Halves is a 2D, near-static
  text-and-grid app (numpad, question, topic lists, inventory grid, pixel sprites). Importing a
  camera/meshing/WGSL/chunk-streaming engine to draw flat sprites + text is the dog being wagged.
- **Regressions land on our core constraints:**
  - *Text/input/accessibility* — DOM gives crisp scalable text, the numpad, scrolling, focus,
    screen-reader, IME, responsive layout **for free**; a wgpu canvas reimplements all of it.
    For a kids' maths app, legible text + a11y **are** the product.
  - *Weak/school devices* — DOM/PWA degrades gracefully; WASM+WebGPU risks **failing to start**
    (WebGPU not universal; heavy first-load blobs) on exactly the cheap tablets this audience
    uses. Also complicates the Play Store "Designed for Families" path (T72).
  - *No-build deploy* — today a Builder pushes one `.js` and it's live; Rust→WASM means a
    toolchain, big artifacts, a real pipeline — trading away our biggest velocity edge.
  - *Verification model* — the two-agent system works because logic is plain JS runnable in Node
    with stubs (20 gates, Arena invariants, contrast). Logic in Rust dissolves that leverage.
  - *Solves a non-problem* — no perf issue exists; canvas draws are cheap + static.
- **"Don't throw away work."** Content/logic (modes/guides/collectibles/enemies + question sets +
  calibration) is portable in principle, but the **UI/UX layer** — much of this session's work
  (glyphs, hero detail, wayfinding, toasts, inventory tabs, Events tab/banner) — would be largely
  rewritten. So a pivot *does* discard a lot of recent effort.

**The kernel worth keeping (the right-sized version of the instinct).** A **hybrid presentation
layer**, not an engine swap: keep DOM for everything interactive (text, numpad, menus, lists),
and add a **full-screen 2D canvas / WebGL layer** behind/around it for atmosphere — animated
backdrops, battle FX, transitions, particles, shader-style dithering. We already render
procedural pixel art to canvas (icons/monsters/scenery/glyphs), so this extends our own grain.
≈80% of the "bespoke rendered feel" at ≈5% of the cost, zero a11y/deploy regression. **This is
the version that could become a real BACKLOG task** if the owner wants more graphical juice.

**Brickmap menu-system synergy — honest take.** Real *for brickmap* (a 3D game that needs
menus), but it only pays off if the Halves pivot is justified, and it isn't: building a menu
system *inside a voxel engine* to host a 2D maths app helps brickmap more than Halves. If we want
to help brickmap, do it on brickmap's own merits, as separate work.

**The only framing where an engine makes sense** = a *different, much bigger product*: Halves
becomes an explorable **3D voxel RPG world** (the Arena as a realm you traverse). Years-out,
different scope; even then the maths core still wants DOM-grade text/input. Dream, don't refactor.

**Third agent.** Mechanically fine to babysit a third agent across both repos — but only for a
**concrete, bounded task** (e.g. "prototype the hybrid canvas FX layer in Halves" or "build
brickmap's menu system *for brickmap*"), never an open-ended "port Halves into the engine".

*(Status: captured, NOT queued. If the owner wants to proceed, the recommended first step is the
hybrid canvas FX layer — a small, reversible Halves task — NOT an engine port.)*
