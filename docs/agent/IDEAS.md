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

---

## I3 — Tech-tree view — ✅ PROMOTED to BACKLOG (T83 + T84) on 2026-06-21

> Owner said "promote tech tree". Now BACKLOG **Phase 6.8**: **T83** (promote the guide to a
> first-class Play/Practice-peer button) → **T84** (the data-driven, icon-node, 360px-safe
> tech-tree view with a selected-node detail panel; renders from the live `unlockedBy`/`requires`/
> `isUnlocked`/`have-total` data, never a parallel edge list; a swappable `nodeIcon()` hook so
> richer node art from T82 drops in later). Sequenced after T82. **BACKLOG is authoritative**;
> notes below retained for provenance.

## I3 (original) — Tech-tree view for the topic selector (owner idea, 2026-06-21)

**The idea (owner).** Give the topic selector a **tech-tree / skill-tree visual**, reminiscent of
game unlock paths. We **already have a tech-tree-shaped unlock structure** — it's just not
*exposed* visually; today the only signal is the unlock text on a locked row.

**Why this is a good fit (and cheap-ish): the graph already exists in data.** The dependency
edges are already modelled, so a tree would *visualise existing truth*, not invent mechanics:
- each topic's **`unlockedBy`** = the previous topic in the importance chain (the trunk path);
- Part-2 topics carry **`requires: "mastery:<id>"`** = the gate from their Part-1 (a second kind
  of edge — "master P1 to branch into P2");
- `isUnlocked(mode)` already resolves both, and we already compute **per-topic `have/total`** and
  states (▶ playable · 🔒 locked + hint · ✓ 100%). A tree view is a **new render of this data.**

**Sketch.** Nodes = the 15 topics (grouped by the existing `group`/category: Core · Number ·
Fractions & % · Measures · Reasoning), edges = `unlockedBy` (chain) + `requires` (P1→P2 mastery
gate). Node shows the topic's pixel glyph (T56) + state (locked/unlocked/mastered/100%) +
progress. Tapping an unlocked node selects/starts it (preserve the current select→Start / tap
flow); locked nodes show the requirement. Could be an **alternative view toggle** on the picker
rather than a replacement (keep the scrollable grouped list — it's the accessible, 360px-proven
fallback).

**Constraints / watch-outs.**
- **360px phone-first.** A sprawling desktop tech-tree doesn't fit; needs a layout that reads on a
  narrow screen (vertical trunk with short branches? horizontal scroll? zoom/pan?). This is the
  main design risk.
- **Accessibility.** The current list is screen-reader / focus friendly; a canvas/SVG tree must
  not regress that — keep the list as the a11y path, or build the tree from focusable DOM nodes.
- **Don't fork the unlock logic.** Render from `isUnlocked`/`unlockedBy`/`requires`/`have-total` —
  never hand-maintain a parallel edge list (it would drift as topics are added in Phase 7).
- **Scales with Wave-2 topics.** After T59–T61 the tree grows to ~23 topics — the layout must
  cope (another reason to render from data, not a hardcoded diagram).

**Strong synergy with I2 / T82 (visual direction).** A tech tree is a prime surface for the
richer rendered aesthetic under research in **T82** (dithered backdrops, glyph nodes, animated
unlock "paths lighting up"). Natural to design the two together — the tree could be the first
real showcase of the new visual character, reusing our seeded generators (per the
build-on-existing-art guardrail). If both proceed, sequence the tree **with/after** the T82
direction so it's built once, in the chosen style.

**Owner refinements (2026-06-21, round 2 — with a Mindustry tech-tree screenshot as inspo).**
- **Icon-forward nodes, text on selection (not on every node).** For a cleaner, more visual tree,
  nodes should be **mostly just the topic's icon** (minimal/no inline text). The name, progress,
  unlock requirement, and detail move into a **detail panel for the SELECTED node** (the
  Mindustry pattern: tap a node → a panel shows its info; the tree itself stays uncluttered).
  This also helps the **360px** problem — icon-only nodes pack far better than text-laden rows.
- **Promote the guide/docs to a first-class action.** Today the "how to approach this" guide is
  reached via a small **`?`** on each picker row (`.mr-guide` → `openGuide` modal). Move it OUT of
  the `?` and make it a **button at the same level as Play and Practice** (`startBtn` "Start" +
  `practiceBtn` "Practice" → add e.g. a "Guide"/"How to" peer). So a selected topic offers
  **Play · Practice · Guide** as equals. *(This is a small, self-contained UX win that could even
  ship independently of the full tree — still parked, not queued.)*
- **Nodes show the topic icon — settle which asset.** Each node carries the topic's icon. Open
  question the owner flagged ("the icons we're due to update soon?"): we **just** pixel-arted the
  topic **operator glyphs** in **T56** (`glyphs.js`). Decide whether tree nodes use those T56
  glyphs, or a **richer per-topic emblem** designed as part of the visual direction — most
  naturally **settled in T82** (and built from our seeded generators per the build-on-existing-art
  guardrail). Don't design a throwaway node icon before T82 picks the style.
- **Aesthetic = owner's call / open.** Mindustry's look (icon nodes · amber connector paths ·
  selected-node detail · a resource/summary panel + bottom button bar) is the reference, but the
  owner is **not tied to it** and invited a better direction. *Babysitter view:* the icon-node +
  detail-on-select pattern is genuinely a good fit — it's phone-friendly, shows off our procedural
  icons, and matches the dithered/atmospheric direction under T82 (imagine connector paths that
  "light up" as you unlock). Recommend deciding the tree's final look **as part of / right after
  T82**, then building it once in the chosen style.

*(Status: captured, NOT queued. When promoted: likely **(a)** a tiny standalone "guide becomes a
Play/Practice-peer button" change, and **(b)** the data-driven, 360px-safe, icon-node tree view
with a selected-node detail panel — coordinated with the T82 visual direction for node art + feel.)*

---

## I4 — Progressive feature gating / staged onboarding (owner idea, 2026-06-21)

**The idea (owner).** **Everything starts gated**; features unlock **one by one as you
progress**, so the staged reveal doubles as a **tutorial** (progressive disclosure — teach one
concept at a time). Inventory, Heroes, the current Event (banner), Arena, etc. are all **gated by
current progress**. **When a feature ungates, the game highlights where it's accessed.**

**The owner's opening flow.**
- **First play ever → drop straight into ONE easy maths problem** (a single question, *not* a
  whole topic round). Solving it **grants access to the Inventory**, which becomes the **first
  ungated + highlighted** screen — teaching the core loop "solve maths → earn things → here's
  where they live."
- Then unlock the rest at **good progress points**. Owner example: **don't ungate the Event
  banner until a few topic runs in** (a brand-new player shouldn't be met with the daily event
  before they understand the basics or have any buffs to care about).

**Why this fits us (machinery already exists).** We already gate *topics* by progress — the
unlock chain (`unlockedBy` · `isUnlocked` · `init:<id>` collectibles, T1) and the
genuine-engagement gate (T74, answered ≥ ceil(total/2)). I4 extends that idea from *topics* to
**app features/surfaces** (nav destinations + home-screen elements). Progress signals we already
track and can key feature-unlocks off: owned **collectibles** (`halves.collected`), **runs
completed**, first **mastery**/**loot**, **rank**, **momentum/localDay**, **Gold**.

**Draft unlock ladder (to refine when promoted — NOT final).**
| Gate point (progress signal) | Ungates | Highlight |
|---|---|---|
| First-run single easy question solved | **Inventory** (first reward lands here) | spotlight Inventory nav + coachmark |
| First full topic round finished (first `init:`) | **Practice** (per-question drill) | pulse Practice on the start screen |
| First **loot**/**mastery** earned, or ~2–3 runs | **Heroes** (you now have a hero/collection to care about) | spotlight Heroes nav |
| Enough collection that tier 1 is winnable (already true at 0 items) + a hero owned | **Arena** | spotlight Arena nav |
| **A few topic runs** in (owner's call) | **Event banner** (today's event) | reveal + highlight the banner |
| First Gold / first momentum earned | the **Gold / Momentum** readouts | brief toast |

**Highlight-on-ungate.** Reuse the **toast** system + add a one-time **pulse ring / spotlight** on
the newly-available nav button or surface, plus a short coachmark ("Inventory unlocked — your
rewards live here"). Keep it **calm** (consistent with the no-streak-anxiety momentum design); a
highlight fires **once**, never nags.

**Critical constraints / watch-outs.**
- **Migration safety (most important).** **Existing players must NOT be re-gated** — hiding a
  current player's inventory/heroes would be a serious regression. Treat any pre-existing profile
  (has collected items / completed runs) as **already past the gates it has earned** (ideally
  fully unlocked). Gate-state persists in localStorage like `collected`; first-run = no
  collected/no runs.
- **Never trap the user.** Every gate must be reachable through a **short** stretch of normal
  play; no dead-ends. Consider whether locked features are **fully hidden** until unlocked
  (cleaner first-run) vs **shown teased/disabled** (builds anticipation) — owner's call; default
  lean = hidden, then reveal+highlight.
- **Don't touch the underlying earn/collection/Arena logic.** This is an **access/presentation
  layer** on top — it hides/reveals surfaces; it must not change what's earned or the Arena
  buff-gating invariants (tiers 1–5 winnable at 0 items, def monotonic, no tier behind own loot).
- **The first-run intro question** is a *single* trivially easy problem (e.g. a small halve or a
  one-digit add), not a topic round; solving grants the first reward + the Inventory unlock.
- **Determinism/offline** — all gate state is local; no backend (consistent with the whole app).

**Synergy.** The "highlight where accessed" could later use the **T82** FX layer (a spotlight/
glow). The **tech-tree** (T84) is itself a candidate gated/revealed surface. The **Events** block
(T78–T81) already centralises the banner in `renderEventBanner()` — gating it is one added
condition there.

**Scope.** Cross-cutting (first-run flow + nav + home screen + each gated surface). When queued,
likely **a few tasks**: (1) the unlock-state model + first-run single-question intro + Inventory
unlock + the highlight/coachmark system (infra); (2) wire each feature gate (Practice/Heroes/
Arena/Events/Gold/Momentum) to its milestone; (3) polish the reveals. Behind a short ladder-design
decision (the table above, finalised with the owner).

*(Status: captured, NOT queued. Promote to BACKLOG when the owner says go — starting with the
agreed unlock ladder + migration policy.)*
