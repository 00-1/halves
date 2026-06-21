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

## I4 — Progressive feature gating — ✅ PROMOTED to BACKLOG (T86 + T87) on 2026-06-21

> Owner: "promote the feature gating" + add a **clear-all-data** reset (needed to test the early
> gating). Now BACKLOG **Phase 6.9**: **T85** (Settings screen + Clear-all-data behind a serious
> countdown + numpad-code confirmation) → **T86** (unlock-state model + first-run single-question
> intro + Inventory gate + highlight system) → **T87** (wire the remaining gates:
> Practice/Heroes/Arena/Event-banner/Gold). Cross-cutting guardrails locked in the BACKLOG —
> esp. **migration safety** (never re-gate existing players) and **access-layer-only** (don't
> touch earn/collection logic or Arena invariants). **BACKLOG is authoritative**; notes below
> retained for provenance.

## I4 (original) — Progressive feature gating / staged onboarding (owner idea, 2026-06-21)

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

---

## I5 — Arena 3v3 — ✅ PROMOTED to BACKLOG (T88 + T89 + T90) on 2026-06-21

> Owner: "promote 3 hero arena." Now BACKLOG **Phase 6.10**: **T88** (deterministic 3v3 battle
> model + enemy teams + re-calibration + invariant sim-proofs — the crux) → **T89** (team-selection
> UI, 1–3 heroes) → **T90** (watchable turn playout). Decisions LOCKED below: **deterministic
> auto-resolve**, **variable team size 1–3** (owner: must allow sending fewer, e.g. early game),
> calibration authored below. **BACKLOG is authoritative**; notes retained for provenance.

## I5 (original) — Arena 3v3: party of heroes vs a team of foes (owner musing, 2026-06-21)

**The idea (owner).** Deepen the Arena: pick **3 heroes**, fight **3 enemies** — the tier's
current foe **plus two weaker "assistant" enemies pulled from lower levels**. Resolution leans
**turn-based**: each side takes turns hitting an enemy until one team is wiped. Owner is **unsure
how the win is decided** (open).

**Why it's appealing.** Party building + type-matchup tactics across 3v3 is a classic, engaging
RPG mechanic. It makes the **12 heroes** and the **whole collection** matter far more than today's
single-hero check, and the enemy-team idea reuses existing lower-tier enemy defs (scales for free).
Genuinely additive and in-domain — worth doing well.

**Owner decisions (2026-06-21, round 2) — LOCKED:** **deterministic auto-resolve** (decisions
#1 win-by-attrition, #2 no-RNG, #4 auto-resolve below are all settled this way); **variable team
size 1–3** (decision #5 — owner: "it should still be possible to send less than 3 heroes, e.g.
early game" → **allow 1–3, do NOT gate the mode** on owning 3); and the owner **delegated the
calibration** to the Babysitter ("you figure out how to keep it levelled… beatable only with
near-max loadouts"). Calibration design authored below.

### Calibration design (Babysitter-authored, owner-delegated 2026-06-21)
Goal: a deterministic 3v3 auto-resolve whose **top is beatable only with near-max loadouts**,
while **every existing invariant still holds**. With **variable team size 1–3**, the binding
early-game floor tightens: **tiers 1–5 must be winnable with a SINGLE starter hero at 0 items**
(a brand-new player owns only one), even though the enemy is always 3 (the 2 adds are near-trivial
at low tiers). Also: curve monotonic · no tier behind its own loot · final tier ⇔ near-full, one
boost flips it. Monotone in **loadout AND team size** (more buffs / more heroes never worse).

**Battle model (deterministic, zero RNG).** 6 combatants — 3 heroes + 3 foes — each `{atk, hp,
spd, type}`. Turn order by `spd` (fixed index tie-break). On a combatant's turn it picks a target
by a **fixed rule** (best type-matchup vs the target; tie → lowest current `hp`; tie → index) and
deals `damage = max(1, round(atk × matchup(att,tgt) − tgt_mitigation))`; a combatant at `hp ≤ 0`
is removed. Loop rounds until one side has no survivors. **Win = ≥1 hero alive.** Same inputs →
same result, so it simulates + gates in Node exactly like today's stat check.

**Stat sourcing.** Each hero's `atk/hp/spd` are **monotone-increasing functions of the collected
loadout** (extends today's buff→`rating`). Enemy team = the **tier foe** (scales with tier on the
existing power/`def` curve) **+ 2 "adds" at `tier−k`** (weaker, but they scale *relative* to the
tier, so the top stays hard; floor at tier 1, so low tiers' adds are near-trivial).

**Leveling recipe (how "near-max only" is guaranteed).**
1. Define a **monotone** `BestTeamPower(loadout)` = max over 3-hero subsets of a team aggregate of
   `atk/hp/spd`. Monotone in the loadout (more buffs ⇒ never weaker).
2. Tune the enemy-team strength curve `E(tier)` (foe scaling + the 2 adds) so the **deterministic
   sim** yields: `E(1..5)` < starter-team-at-0-items ⇒ early-winnable; `E` strictly increasing ⇒
   monotone curve; the **top region (~109–120)** wins **only** near-max, with **tier 120 ⇔
   near-full** and **removing any one champion boost flips it**; and for **every tier n**, beatable
   with power earnable from tiers `< n` + non-tier sources ⇒ **no tier behind its own loot**.
3. **Monotonicity is the linchpin** (it's what makes the curve well-defined): damage monotone in
   `atk`, survival monotone in `hp`; the targeting + turn-order rules must **not** be anti-monotone
   — so **cap `spd`'s swing on turn order** and keep damage a smooth monotone function. Where a
   buff could *flip a win to a loss* (overkill waste, a turn-order inversion), **damp that
   mechanic** until the sim is monotone in the loadout.
4. **The sim is the source of truth; the scalar only guides tuning.** Extend `arena.test.js` to
   **simulate every tier across a loadout lattice** (0 · partial · near-full · full · full-minus-
   one-champion-boost) and assert all four invariants. If a non-monotone or off-curve outcome
   appears, **fix the mechanic, not the test.**

**Net effect (what the owner asked for).** With 3 heroes, "near-max" now means *your three best
heroes each near-fully buffed* — a genuine team-wide **collection-completion** check, so the
ceiling rises (more depth) while tiers 1–5 stay open to newcomers. The single-hero `statBattle`
becomes the 1v1 special case of the same sim, so migration is clean.

**What it changes (and the care it needs).** Today a battle is a **pure, deterministic stat check**
(`statBattle`: win iff `round(rating×matchup) ≥ def`, T47) — and *that determinism is exactly what
lets the Arena invariants be PROVEN in `arena.test.js`*. A 3v3 turn-based fight must preserve that
provability. Key decisions to resolve **before queuing**:

1. **Win condition (the open question) — recommend deterministic turn-based attrition.** Give each
   combatant an HP-like stat; **turn order by `speed`**; on a turn, attacker hits a target for
   `damage = f(power, type-matchup, target guard)`; repeat until one team has no survivors. Win =
   your team has ≥1 survivor. Needs a **fixed targeting rule** (e.g. focus the type-disadvantaged
   or lowest-HP foe) so the sim is reproducible. *(Alternatives: a simple aggregate-power compare
   — closest to today, least drama; or simultaneous-damage rounds.)*
2. **Keep it DETERMINISTIC (or seeded).** **No unseeded RNG** — crits/misses/random targeting would
   break the Node-verifiable gate model. If randomness is wanted, it must be **seeded** (per
   battle, like our other generators) so outcomes are reproducible and the invariants stay testable.
3. **Re-express + re-prove the invariants for TEAMS.** They must still hold, now over a fight sim:
   **tiers 1–5 winnable with a STARTER team at 0 items**; **difficulty curve monotonic**; **no tier
   gated behind its own loot**; **final tier ⇔ near-full collection** (one missing boost flips it).
   Calibration is no longer a scalar compare — it's a **fight-sim outcome** over 3v3, so the curve
   (enemy team HP/power vs achievable team power) must be **re-derived** and `arena.test.js`
   extended to simulate and assert the invariants. This is the hard part, not the UI.
4. **Auto-resolve vs interactive.** *Team-building puzzle* (you pick 3, the fight auto-resolves,
   strategy is in composition/matchup) vs *active turn-by-turn* (player chooses targets/abilities
   each turn — much more scope + UI). For a 10–11yo audience + the calm design, **lean auto-resolve
   with a watchable playout** (the strategy is the team you bring); owner's call.
5. **Fewer than 3 heroes early game.** Hero unlocks are progressive, so a new player may own 1–2.
   Options: allow 1–3, auto-fill, or **gate 3v3 until 3 heroes are owned** (ties to hero-unlock
   progression + the I4 onboarding gating). Don't soft-lock early players out of the Arena.
6. **Enemy team composition.** Tier foe + 2 lower-tier "adds" (weaker) — reuse existing
   `enemies.js` defs; define the rule for *which* lower tiers (e.g. tier−k) so it scales 1→120.
7. **Migration.** Existing Arena progress (`tier:N`) must carry over; the mode shift can't
   invalidate past wins.

**Synergy.** The turn playout is a natural showcase for the **T82** FX layer; it raises the stakes
of **hero detail/unlocks** and the **I4** gating; loot/buffs become team-wide power.

**Scope.** Substantial. When queued, likely several tasks behind a **design doc** that nails the
win condition + determinism first: (1) the deterministic 3v3 battle model + re-calibration +
invariant proofs (the crux); (2) team-selection UI; (3) the watchable turn playout/FX; (4) the
<3-heroes / early-game handling. Don't queue until 1–7 above are decided.

*(Status: captured, NOT queued — but **design-resolved**: deterministic auto-resolve is LOCKED and
the calibration approach is authored above. **Ready to promote on the owner's "go"** (then it
becomes: design-doc → deterministic battle model + re-calibration + invariant sim-proofs → team
UI → playout/FX → early-game <3-heroes handling). The crux remains keeping the sim monotone so the
invariants stay provable.)*
