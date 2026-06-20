# Backlog (Babysitter-owned)

Work the **topmost `OPEN` task only**. Do not skip or reorder. Each task lists a
Definition of Done (DoD); all DoD points are mandatory. Full spec lives in
`docs/research-11plus.md` (read it before starting).

Status legend: `OPEN` → ready to build · `IN-REVIEW` → awaiting Babysitter ·
`CHANGES` → fixes requested in REVIEW.md · `DONE` → approved.

---

## Phase 1 — Engine (on the existing 5 modes)

### T1 — Topic-chain unlock  · status: DONE
Make topics unlock in importance order; a fresh profile sees only the first.
- Reorder `MODES` to the importance order in research doc §"Unlock chain":
  Halves, Times, Doubles, (then new ones appended later).
- Add per-mode `unlockedBy` (the previous topic's id) — first mode has none.
- `isUnlocked(mode)`: true if it's the first, OR `collected["init:"+unlockedBy]`
  exists, OR the player already owns `init:<thisMode>` (migration: already played
  stays unlocked).
- Locked modes cannot be started; selecting one shows the requirement.
- **DoD:** fresh profile → only Halves playable; finishing Halves unlocks Times;
  finishing Times unlocks Doubles. Existing players keep access to anything they
  have an `init` for. Node logic check included. No regressions. Deploy-safe.

### T2 — Mastery achievement + Part-2 gate plumbing  · status: DONE
- Add a `mastery:<id>` collectible per mode (category "Mastery"): earned when a
  round is finished with **0 skips AND total time ≤ `mode.masterSecs ×
  questions`**. Evaluate in `finish()`. (We intentionally show only an elapsed
  clock, never a per-question countdown — keep it that way; accuracy-first.)
- `masterSecs` = a gentle per-answer target chosen by the mode's difficulty tier
  (evidence-based for a 10yo; deliberately at the relaxed end so it's attainable):
  - **Tier 1 — single facts** (tables, doubles, halves, bonds, recall): `3.5`
  - **Tier 2 — simple multi-digit** (2-digit ±, ×÷ powers of 10, place value): `5`
  - **Tier 3 — multi-step** (% of, fractions of, rounding, ratio, mean, metric,
    time, money): `9`
  - **Tier 4 — complex multi-step**: `14`
  - Existing modes: halves `4`, doubles `4`, times `3.5`, squares `3.5`,
    fractions `3.5`.
- Support `requires:"mastery:<id>"` on a mode; fold into `isUnlocked` (a Part-2
  mode is locked until its Part-1 mastery is owned). No Part-2 modes exist yet —
  this is plumbing + a Node test proving the gate.
- **DoD:** mastery awarded exactly per rule (verify boundary cases in Node — at,
  just under, and just over the target, and with 1 skip); `isUnlocked` honors both
  `unlockedBy` and `requires`; unlocking fires a toast. `masterSecs` set on all 5
  existing modes per the table.

### T3 — Mode-picker redesign  · status: DONE
Replace the wrapping pills with a scrollable, grouped list.
- Group by category (Core · Number · Fractions & % · Measures · Reasoning — add a
  `group` field per mode). Each row: name, best score/rank, **collectible
  progress `have/total` for that mode**, and state (▶ play · 🔒 + unlock hint ·
  ✓ when 100%). Locked rows not selectable.
- Keep current select-then-Start flow (or tap-to-start — Babysitter's call in
  review). Must stay usable on a phone screen.
- **DoD:** renders all unlocked/locked states correctly with the 5 modes; no
  layout overflow at 360px wide; routing/back still work; deploy green.

### T4 — Per-topic completion + new milestones  · status: DONE
- Helper for per-mode collected/total; surface on the picker (T3) and inventory.
- New milestone collectibles: "unlock N topics", "clear every topic",
  "100% a topic" (all auto-evaluated). Ensure a topic's 100% genuinely requires
  the hard items (Lightning speed bracket + Mastery + Flawless + all Beat/Spark
  for fact modes).
- **DoD:** counts correct; 100%-a-topic only fires after the hard set; Node check.

---

## Phase 2 — Topics (importance order; each = Part 1 + Part 2, P2 `requires` P1 mastery)

**Design rule: every topic is a FIXED, pre-generated question set** — a curated
`*_SRC` array (~21 entries) that `build()` shuffles each round, exactly like
Halves/Times/Squares/Fractions. **No infinite random generators.** Fixed sets keep
best-times comparable and give every topic its per-question Beat/Spark
collectibles.

**Curate each set per `docs/agent/QUESTION-SETS.md`** — common real-world values
first, representative coverage of the topic's concept cases, a spread of
difficulty (Halves is the benchmark). Arbitrary or filler sets are a DoD failure.
**In BUILDER-LOG, note the rationale** (which common values, which cases covered)
for each set you build. Build one topic per task, fully (both parts), each
verified in Node (answers correct/numeric/non-negative/numpad-safe; stable set
across rounds). Slot each into the chain at its importance position.

### T5 — Add / Subtract  · status: DONE (superseded by T5b — convert to fixed)
P1: 2-digit ± within 100. P2: 3-digit ± 2-digit.

### T5b — Convert ALL generated modes to fixed sets · status: DONE
T5 (Add/Subtract) and T6 (Number bonds) were built with infinite generators;
per the design rule above, convert **all four** modes to **fixed curated sets**:
`addsub`, `addsub2`, `bonds`, `bonds2`.
- Replace each `build()` with shuffles of fixed `*_SRC` arrays (~21 each):
  addsub P1 = 2-digit ± within 100 (mix of bridging/non-bridging); addsub2 P2 =
  3-digit ± 2-digit; bonds P1 = to 100; bonds2 P2 = to 1000 + decimal bonds to 1.
- Remove every `gen` flag plus `genRound`, `randInt`, `addSubP1/P2`, the bonds
  generators, and the `if(m.gen) return` guard in collectibles.js. No dead code.
- With `gen` gone, all four modes now get per-question Beat/Spark — confirm they
  appear in the catalogue.
- Update `docs/research-11plus.md` to drop the generated/fixed distinction (all
  fixed).
- **Curate the sets per docs/agent/QUESTION-SETS.md** (cover the Add/Subtract and
  Number-bonds case checklists; common values first); log the rationale.
- **DoD:** Node — all four build() return fixed shuffled sets (~21), prompts
  stable across rounds, answers correct/numeric/non-negative/numpad-safe;
  catalogue contains solve/spark for addsub*, bonds*; no `gen`/`genRound` left
  anywhere; sets satisfy the curation checklist; no regressions; deploy green.

### T6 — Number bonds · status: DONE (wiring; fixed conversion in T5b)
P1: to 100. P2: to 1000 + decimal bonds to 1. **Fixed set** (curated array,
shuffled — not generated).

### T7 — Place value ×/÷ · status: BLOCKED
P1: whole ×÷ 10·100. P2: decimals ×÷ 10·100·1000. **Fixed set.**

### T8 — Fractions of · status: BLOCKED
P1: ½ ¼ ⅓ ⅕ of. P2: ⅔ ¾ ⅗ ⅝ of. **Fixed set.**

### T9 — Percentages of · status: BLOCKED
P1: 10/25/50% of ≤400. P2: 1/5/20/75% of ≤200. **Fixed set.**

> Further topics (equivalences, rounding, money, time, metric, ratio, …) will be
> appended by the Babysitter once T5–T9 are `DONE`. Do not invent them early.

---

## Phase 2.5 — Engagement polish

### T10 — Celebratory in-play unlock effects (particles) · status: DONE
> Babysitter intends to open this **right after T6** (high-impact, low-risk polish
> to the everyday loop), ahead of the remaining topics.
Make the existing non-blocking in-play unlock toast (`showToast`) more celebratory
with a **pixel particle burst** (a handful of small coloured squares that fly out
and fade, matching the pixel aesthetic) plus a subtle pop/scale on the toast, and
a non-blocking floating "+N" style flourish. Rarity-tinted.
- **DoD:** particles fire on each in-play unlock **without** interrupting the
  round — no pause, no stolen input/focus, timer/typing unaffected; capped
  particle count; auto-clean (no DOM/canvas leak, verified by node-checking the
  cleanup path or a teardown function); works at 360px on a phone; no regressions;
  deploy green.

### T14 — Remove Hall of Fame + Clear-all (single-player cleanup) · status: DONE
It's single-player (you only compete with yourself), and Best Times already covers
records — so drop the per-round Hall of Fame and the Clear-all button.
- Remove from the **results** screen: the name-entry (`#nameEntry`/`#nameInput`),
  the `#missNote`, and the Hall of Fame block (`#hof`/`#hofList`/`#hofMeta`).
- Remove from the **best-times** screen: the **Clear all** button (`#sumClear`).
- Remove the now-dead JS: `renderHOF`, `commitName`, the `nameInput` listeners,
  the `sumClear` handler, `pendingEntry`, and the qualify/name logic in `finish()`.
- **Keep best-times working**: still save each finished round to the per-mode
  board (top-10, `saveBoard`) so Best Times / ranks / the picker subline update on
  a new record — entries simply have no name now.
- Keep everything else on results (final time, rank, accuracy, skipped count,
  slowest answers, Play again / Modes, the unlock modal + toasts).
- **DoD:** results shows no HOF/name-entry; best-times has no Clear-all; finishing
  a better round still updates the best time/rank; id cross-check clean (no
  `$("…")` referencing removed elements; no orphaned element ids in index.html);
  no dead code; no regressions; deploy green.

### T15 — Best Times: colour-coded heat-map + tap-to-retry · status: DONE
Make the Best Times (`#/best-times`) page read at a glance and act as a launchpad.
- **Colour-code each topic row by the rank tier of its best** (use the rank's
  colour/rarity): a left-edge accent + subtle background tint + the rank label
  coloured, so strong topics (gold/purple) and weak ones (grey/green) pop. Topics
  **not yet played** show muted/dashed with "Not played"; **locked** topics show
  🔒 + their unlock requirement and are visually de-emphasised.
- **Tap a topic to retry it:** tapping an **unlocked** row starts that topic's
  round immediately (set it active + `start()`); locked rows are not startable
  (show the requirement). Give rows clear tap affordance and ≥44px targets.
- Keep it readable at 360px; works with the full (growing) topic list via the
  existing scroll.
- **DoD:** rows are colour-coded by rank with played/unplayed/locked states
  distinct; tapping an unlocked topic launches its round; locked topics don't
  start; routing/back still work; no regressions; deploy green.

### T18 — Fullscreen toggle · status: DONE
Add a fullscreen toggle button (Fullscreen API) on the start screen, near the
existing links/controls. Tapping requests fullscreen on the document element;
tapping again exits. Update its icon (⛶ enter / ⛶ exit) from a `fullscreenchange`
listener. Use a user gesture (the click). **Handle unsupported browsers
gracefully** (e.g. iOS Safari has no element fullscreen) — feature-detect and hide
or disable the button rather than erroring; wrap calls in try/catch and use the
vendor-prefixed fallbacks if present.
- **DoD:** button enters/exits fullscreen where supported; icon reflects state;
  on unsupported browsers it's hidden/disabled with no console error; works at
  360px; no regressions; deploy green.

### T19 — Make the unlock celebration genuinely juicy · status: DONE
The current burst (a handful of small squares) is nowhere near celebratory enough.
Upgrade it to a real confetti/spark **explosion**.
- Move the effect to a single full-screen **`<canvas>` overlay** (pointer-events:
  none, above content), with a RAF particle engine that **idles (stops the RAF)
  when no particles are alive** — never a constant loop.
- On an item unlock, emit a **rarity-scaled** burst (e.g. common ~30 → uncommon
  ~45 → rare ~65 → epic ~90 → legendary ~130 particles), with **variety**: mixed
  shapes (squares + sparkle/star + streamers), sizes ~2–9px, the rarity palette +
  white/gold sparkles; **physics**: outward velocity + gravity + drag so they arc
  and fall like confetti, with rotation and twinkle (opacity flicker), ~1.0–1.6 s
  life with fade.
- Add a **radial shockwave ring** + a brief glow/flash behind the toast, and a
  stronger pop/scale on the toast itself.
- **Rarity flair**: epic/legendary add extra (a second delayed pop, golden
  sparkles, a few screen-edge confetti, a subtle vignette glow).
- **Performance & safety**: a global cap on live particles (~250, reuse/coalesce
  when many unlocks land at once — no jank); fully **non-blocking** (overlay never
  intercepts taps, no game-timer/input impact); keep the **prefers-reduced-motion**
  opt-out (minimal/no particles). Self-cleaning (no leaks; RAF stops at idle).
- **DoD:** visibly dramatic, clearly rarity-scaled celebration; Node-test the pure
  emitter math (per-rarity counts, global cap, idle/teardown) with stubbed
  canvas/RAF; no constant RAF when idle; reduced-motion respected; no input/timer
  interference; works at 360px; no regressions; deploy green.

### T12 — Fix Speed-achievement skip exploit · status: OPEN
Exploit: the **Speed** bracket collectibles (Quick/Swift/Blazing/Lightning) test
only `ctx.avg < lv.avg`, so skipping every question (which advances fast) earns
them without solving anything. Fix: require **zero skips** too — change each Speed
item's test from `ctx => ctx.avg < lv.avg` to
`ctx => ctx.mistakes === 0 && ctx.avg < lv.avg` (in collectibles.js; `mistakes`
is the skip count in the current model). Mastery already does this; ranks are
already safe (speed ranks need a perfect score).
- **DoD:** Node test — a round with ≥1 skip earns **0** Speed brackets regardless
  of how low its avg is; a clean (0-skip) round under a threshold still earns the
  appropriate brackets; no other collectible affected; no regressions; deploy green.

### T11 — Entry / "tap to begin" screen (fullscreen + audio gesture) · status: OPEN
A first splash screen that gives the best experience from the start and provides
the single user gesture both fullscreen and Web Audio require.
- New `#entry` screen shown **on load**, before the menu: brand mark + tagline.
- **Primary button "Play in fullscreen"** (prominent) → request fullscreen on the
  document element (reuse T18's feature-detected/vendor-prefixed/try-catch
  helpers), then reveal the menu (start screen).
- **Secondary, less prominent "Play"** (small/ghost link) → reveal the menu
  **without** fullscreen.
- **Both buttons are the audio-unlock gesture**: call `window.Sound &&
  window.Sound.unlock && window.Sound.unlock()` (guarded — a no-op until the audio
  phase T16 ships) and apply the saved mute pref.
- **Audio on/off toggle** on this screen (🔊/🔇) that reads/writes the persisted
  `halves.sound` key (default ON) so the user can disable sound before entering.
  (Until T16 it just persists the preference; T16's engine will respect it and
  the same gesture will resume the AudioContext.)
- If fullscreen is unsupported (iOS Safari), show a single "Play" (no fullscreen
  variant) — no error.
- After entering, the rest of the session uses the menu; honour any deep-link
  hash route after the gesture. The existing in-menu fullscreen button (T18) and
  this stay consistent.
- **DoD:** entry shows on load; "Play in fullscreen" enters fullscreen where
  supported + reveals the menu; "Play" reveals it without; both call the guarded
  audio-unlock and apply the mute pref; the audio toggle persists `halves.sound`;
  graceful where fullscreen unsupported; routing works after entry; 360px; no
  regressions; deploy green.
> Babysitter note: open **T16 (audio core)** soon after T11 so the entry screen's
> sound toggle/unlock are backed by real audio.

---

## Phase 2.6 — Content quality

### T13 — Question-set audit pass · status: BLOCKED
> Babysitter will open this once a few topics exist (and may run a frequency/
> curation research pass first to inform it). Goal: make every topic's set as
> well-considered as Halves.
Audit **every** topic's `*_SRC` set against `docs/agent/QUESTION-SETS.md`:
common real-world values, representative concept-case coverage, sensible
difficulty spread; fix weak/arbitrary/duplicate entries. Re-check the original
modes too (Halves is the benchmark; sanity-check Times/Doubles/Squares/Fractions).
- **DoD:** for each topic, BUILDER-LOG records the covered cases + key common
  values; sets meet the checklist; answers still exact/numpad-safe; per-question
  Beat/Spark counts updated accordingly; no regressions; deploy green.

---

## Phase 2.7 — Generative 8-bit audio

Full spec: **`docs/agent/DESIGN-audio.md`** (Web Audio API, all synthesised — no
audio files). Queued; Babysitter will open when sequenced.

### T16 — Audio core + 8-bit SFX · status: BLOCKED
`sound.js` → `window.Sound`: single `AudioContext` resumed on first user gesture;
master gain + **mute toggle persisted (`halves.sound`, default ON)** with a 🔊/🔇
button on the start screen; procedural SFX (<300 ms) wired to events per the
design (correct — pitch rises with combo; skip; item unlock scaled by rarity;
gold; topic/Part-2 unlock; mastery; topic 100%; round start/complete; Arena
win/loss later). Non-blocking; respects mute; stops when hidden.
- **DoD:** Node-test the pure SFX-spec builders + mute persistence logic (stub
  the context); audio never affects game timing/input; first gesture unlocks
  sound; mute persists and silences everything; no regressions; deploy green.

### T17 — Generative chiptune music (12 styles + menu) · status: BLOCKED
Look-ahead scheduler driving lead/bass/arp/percussion; **12 topic styles + 1 menu
style**, generative within each style's scale/patterns (seeded PRNG). Assign a
style per topic (explicit `music` field, deterministic `hash(id)%12` fallback);
menu/best-times/inventory/heroes use the menu style; switch cleanly on
screen/topic change. Honour mute; stop when hidden.
- **DoD:** Node-test the style table (exactly 12 + menu, each with required
  params) and the note/scale helpers (no real AudioContext); music loops, varies
  in-style, switches with the topic, and respects mute; low CPU; no regressions;
  deploy green.

---

## Phase 2.8 — Topic guides

### T27 — Per-topic "how to beat it" guides · status: BLOCKED
Add a short, friendly guide for **every** topic (incl. Part-2 variants), reachable
from the **topic-selection screen**, aimed at a British 10-year-old — concise, not
verbose. Full content standard + tone + seed examples + per-topic strategy hints:
**`docs/agent/DESIGN-guides.md`** (read it fully).
- **Content as data**: a `guides.js` (or a `guide` field per mode) holding
  `{ intro, tips:[2–4], example }` per mode — so it's easy to audit/edit. Draft
  every guide in the seed style; **British English; mathematically correct;
  punchy**.
- **UI**: a clear help affordance on the picker (e.g. a "?"/"Guide" control on
  each topic row, or a Guide button by Start for the selected topic) opens a guide
  panel/modal for that topic. Viewable for **locked** topics too (a preview of
  what's coming). Readable at 360px; back/close returns cleanly; routing intact.
- **DoD:** every mode (including Part-2s) has a guide in the seed structure;
  guides are concise, British-English, **mathematically correct**, and
  10-yr-old-appropriate; openable from topic selection for locked & unlocked
  topics; 360px-safe; no regressions; deploy green. (Babysitter audits every
  guide's wording + correctness before approval.)

---

## Phase 3 — Hero / Enemy metagame

Full spec: **`docs/agent/DESIGN-heroes.md`** (read it fully before starting; ask in
BUILDER-LOG.md if anything is ambiguous — do not guess). Each task is complete
only with the Node tests its DoD names. Status `OPEN` only after Phase 2 is `DONE`
(unless the Babysitter pulls Phase 3 forward in REVIEW.md).

### T20 — Item layer: styles, names, boosts · status: BLOCKED (await Phase 2)
Give every catalogue item a `style` (1 of 10), a flavour `name`, and a `boost`
{hero,stat,amount} — all deterministic from id+rarity per the design. Implement
all 10 pixel `drawIcon` style routines (keep pixelated; rarity palette). Update
inventory tiles, the unlock modal, and toasts to show the flavour name; the
inventory detail also shows the earning achievement + the boost.
- **DoD:** every item has style∈[0,10), a non-empty name, and a valid boost
  referencing a real hero+stat; boosts spread across all 12 heroes (Node: each
  hero is targeted by ≥1 item); all 10 styles render without error (Node-smoke
  the generators via a canvas stub or pure-function guard); no regressions to
  existing collectible earning; deploy-safe.

### T21 — Heroes module + stats · status: BLOCKED
Add `heroes.js`: the 12 heroes (data per design), `effectiveStats(hero,
collected)` = base + owned boosts, `rating(hero)`, and `isHeroUnlocked(hero,
collected, stats)`. Export on `window.Heroes`.
- **DoD:** Node test — bram unlocks on first `init`; effective stats grow as
  items are owned; rating monotonic; each hero's unlock predicate fires on its
  listed condition and not before.

### T22 — Heroes screen (`#/heroes`) · status: BLOCKED
Roster grouped by type, locked/unlocked with unlock hints, per-hero effective
stats and the items boosting them; procedural pixel portraits. Start-screen link.
- **DoD:** renders all 12 (locked/unlocked) at 360px without overflow; routing
  + back work; deploy green.

### T23 — Enemy tiers + battle logic + tier loot · status: BLOCKED
Add the **100-tier** list (generated programmatically, extendable) + RPS matchup
+ pure `resolveBattle(hero, tier, perf)` per design. Generate each tier's **loot
batch** as catalogue items (`loot:<n>:<k>`) with style/name/boost (batches grow &
rarer with depth — generate liberally, no cap). Compute `def_n` so it is beatable
only with items obtainable before tier `n` (never gate a tier behind its own
loot); `def100` from max rating excluding tier-100 loot.
- **DoD:** Node test proves (a) early tiers winnable with the starter hero at
  good perf; (b) **no tier is gated behind its own loot**; (c) tier 100 is
  unwinnable until every non-final-loot boost is owned and winnable once it is.
  Pure logic, no DOM.

### T24 — Arena mode (`#/arena`) · status: BLOCKED
Pick an unlocked hero → see tier + matchup hint → play a battle round (reuse the
drill engine over unlocked topics) → resolve → show the result maths → on win
grant `tier:n` + its **loot batch** (in the unlock modal) + advance (+ any hero
unlock). Start-screen link.
- **DoD:** full flow works on existing content; win/loss correct vs the logic;
  tier ownership + loot persist locally; loot appears in inventory and boosts
  heroes; no regressions; deploy green.

### T25 — Balance + milestone wiring · status: BLOCKED
Hero-unlock collectibles/milestones for "unlock all heroes", "defeat tier N",
"defeat the final tier". Balance pass so the curve is fair and the final tier
matches "needs ~everything". Update docs/research-11plus.md note that Phase 3 is
the engagement layer.
- **DoD:** Node test of the full progression curve; milestones evaluate
  correctly; final-tier ⇔ full-collection invariant holds.

### T26 — Currency (Gold): fun accumulation · status: BLOCKED
Implement the Gold economy per `DESIGN-heroes.md` §"Currency & economy" — **earn,
display, persist; NO spending (build no spend mechanic yet).** Make the
accumulation itself fun and able to reach **billions/trillions+**:
- Base earn hooks (per clean question scaled by speed; per round; first Mastery;
  first topic 100%; enemy-tier depth — skipped = 0), all multiplied by the
  **escalating global multiplier** + in-round **combo streak** from the design.
- **`fmtGold(n)`** big-number formatter with the full suffix ladder
  (K/M/B/T/Qa/Qi/Sx/Sp/Oc/No/Dc…), 3 sig figs, never NaN/Infinity.
- **Animated ticking Gold counter** + non-blocking "+N" flourish; Gold shown on
  start + results.
- **Wealth-milestone collectibles** at 1K…1T…1Qa (auto-evaluated vs the total).
- **DoD:** Node tests — earn/multiplier/combo (skipped=0; faster→more; multiplier
  grows with progress) AND `fmtGold` across the whole ladder (1, 999, 1e3, 1.23e6,
  1e9, 1e12, 1e15, 1e21, 1e33 → correct suffixes, no NaN/Infinity); wealth
  milestones fire at the right thresholds; Gold persists; no spend mechanic; no
  regressions; deploy green.
