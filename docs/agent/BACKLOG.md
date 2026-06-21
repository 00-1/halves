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

### T7 — Place value ×/÷ · status: DONE
P1: whole ×÷ 10·100. P2: decimals ×÷ 10·100·1000. **Fixed set.**

### T8 — Fractions of · status: DONE
P1: ½ ¼ ⅓ ⅕ of. P2: ⅔ ¾ ⅗ ⅝ of. **Fixed set.**
Curate per QUESTION-SETS.md. **Numpad/terminating rule:** every answer must be a
whole or terminating decimal that round-trips on the numpad — choose bases so
each P1 answer is exact (e.g. ⅓ of 18 = 6, never ⅓ of 20). P1 unitless fractions
(½ ¼ ⅓ ⅕) of curated amounts; P2 non-unit (⅔ ¾ ⅗ ⅝) of amounts whose answers stay
exact. Splice at importance position 7 (after Place Value): re-link
`percentages` later; for now `fractionsof.unlockedBy` = "placevalue"? **No** —
Place Value already links to `fractions` (the F→decimal mode). Insert "Fractions
of" between Place Value and the existing `fractions` mode: set
`fractionsof.unlockedBy:"placevalue"` and re-point `fractions.unlockedBy` →
"fractionsof" so the chain stays contiguous. P2 (`fractionsof2`) off-chain via
`requires:"mastery:fractionsof"`. Store answers as literals where division would
drift. Log curation rationale.

### T9 — Percentages of · status: DONE
P1: 10/25/50% of ≤400. P2: 1/5/20/75% of ≤200. **Fixed set.**
Curate per QUESTION-SETS.md. **Numpad/terminating rule:** choose bases so every
answer is whole or a clean terminating decimal that round-trips (e.g. 25% of 160
= 40, 75% of 60 = 45; avoid bases that yield ugly decimals like 20% of 25). Prompt
text form "p% of N". P1 uses {10,25,50}% only; P2 uses {1,5,20,75}%. Splice at
importance position 8 (after Fractions of, before the existing Fraction→decimal
mode): set `percentages.unlockedBy:"fractionsof"` and re-point
`fractions.unlockedBy`→"percentages" so the chain stays contiguous. P2
(`percentages2`) off-chain via `requires:"mastery:percentages"`. Store literal
answers where division would drift. masterSecs: Tier 3 (≈9) — multi-step. Log
curation rationale.

> Phase-2 core topics (T5–T9) are **all DONE**. Drills and metagame are **equal
> priority** (owner's call). Babysitter-chosen order from here:
> **T16→T17 (audio)** — ready & independent, big feel/retention win, runs while a
> metagame-engagement research pass lands → then fold that research into the
> Phase-3 design docs → **T20–T26 (hero metagame)**, research-informed.
> Interleaved after: **T27 (guides)**, **T13/T30 (content audit/review)**, and a
> **Wave-2 topic block** (equivalences, rounding, money, time, metric, ratio,
> mean, sequences, multiply-big, …) appended as its own phase. Do not invent
> topics early — wait for the appended phase.

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

### T12 — Fix Speed-achievement skip exploit · status: DONE
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

### T28 — Remove the how-to-play blurb on the start screen · status: DONE
The game is self-explanatory (auto-advancing answers + a labelled "skip" key), so
the instructional blurb on the topic-selection screen isn't needed. Remove the
`.hint` block from the start screen in index.html, and remove the now-unused
`.hint` / `.hint kbd` CSS (and the `<kbd>` styling if used nowhere else). Keep the
start screen tidy and balanced after removal.
- **DoD:** blurb gone; no dead CSS left; start screen still lays out cleanly at
  360px; no regressions; deploy green.

### T11 — Entry / "tap to begin" screen (fullscreen + audio gesture) · status: DONE
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

### T29 — Scroll indicator on the topic picker · status: DONE
It isn't obvious the topic list scrolls (the `.picker` is `max-height:42vh;
overflow-y:auto`, but mobile scrollbars are hidden). Add a clear affordance.
- A **bottom fade gradient** over the picker when there's more content below, and
  a **top fade** once scrolled down — toggled dynamically from a (passive) scroll/
  resize listener comparing `scrollTop` / `scrollHeight` / `clientHeight` (e.g.
  `can-scroll-down` / `can-scroll-up` classes driving `::before`/`::after`
  overlays). Optionally a small "▾" hint at the bottom edge.
- No indicator when the list fits without scrolling. Overlays are
  `pointer-events:none` (never block taps). Recompute when the list re-renders.
- **DoD:** when the topic list overflows, a clear "more below" indicator shows and
  disappears at the end; updates on scroll/resize/re-render; none when it fits;
  works at 360px; no tap interference; no regressions; deploy green.

---

## Phase 2.6 — Content quality

### T13 — Question-set audit pass · status: DONE
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

### T30 — Deep content review (do AFTER the educational core is built) · status: DONE
> Open only once the planned topics are all built (the educational core). The
> Babysitter will run a research-backed 11+ difficulty pass first to inform the
> concrete changes, then the Builder applies them.
A holistic review of the **whole** topic catalogue against the real GL 11+
expectations (`docs/research-11plus.md`, `docs/agent/QUESTION-SETS.md`):
1. **Completeness — are we missing topics?** Compare built topics to the
   researched catalogue + GL frequency; add any genuinely high-value gaps; drop or
   demote anything that doesn't earn its place.
2. **Question selection — is each topic's set good?** Representative, common
   real-world values, full concept coverage (per the checklists); fix weak/
   arbitrary/duplicate entries.
3. **Difficulty calibration — is it right?** Every question must sit **within the
   Year 5/6 11+ band**. **Remove questions too hard to plausibly appear on the 11+**
   (and trivial padding); keep a realistic spread; ensure each Part 1 / Part 2
   split lands at the right level (Part 2 = harder-but-still-11+, not beyond).
- **DoD:** a written per-topic verdict (keep / trim / add, with reasoning) in
  BUILDER-LOG; no question exceeds the 11+ difficulty band; no obvious topic gaps
  vs the researched catalogue; all sets meet QUESTION-SETS.md; Node-verified answer
  validity (exact/numeric/non-negative/numpad-safe); Beat/Spark counts updated; no
  regressions; deploy green.

---

## Phase 2.7 — Generative 8-bit audio

Full spec: **`docs/agent/DESIGN-audio.md`** (Web Audio API, all synthesised — no
audio files). Queued; Babysitter will open when sequenced.

### T16 — Audio core + 8-bit SFX · status: DONE
`sound.js` → `window.Sound`: single `AudioContext` resumed on first user gesture;
master gain + **mute toggle persisted (`halves.sound`, default ON)** with a 🔊/🔇
button on the start screen; procedural SFX (<300 ms) wired to events per the
design (correct — pitch rises with combo; skip; item unlock scaled by rarity;
gold; topic/Part-2 unlock; mastery; topic 100%; round start/complete; Arena
win/loss later). Non-blocking; respects mute; stops when hidden.
- **DoD:** Node-test the pure SFX-spec builders + mute persistence logic (stub
  the context); audio never affects game timing/input; first gesture unlocks
  sound; mute persists and silences everything; no regressions; deploy green.

### T17 — Generative chiptune music (12 styles + menu) · status: DONE
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

### T27 — Per-topic "how to beat it" guides · status: DONE
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

## Hotfixes (jump the queue — do these before resuming Phase 3)

### T33 — Music: cap tempo + stop fast bursts (live UX) · status: DONE
Owner reports the generative chiptune (T17) **"sometimes goes way too fast —
stressful."** Two distinct causes; **fix both**:
1. **Anti-burst (the "sometimes" — primary).** The look-ahead scheduler
   `musicTick()` advances `mNext` by the 16th-note duration and schedules every
   step up to `ctx.currentTime + LOOKAHEAD`. When the 25ms timer is delayed (heavy
   render e.g. the heroes screen, GC pause, tab refocus, confetti), the audio clock
   `ctx.currentTime` races ahead of `mNext`, so the `while` loop **floods a backlog
   of notes at once** → an audible fast burst. Fix: if `mNext` has fallen behind
   `ctx.currentTime`, **resync** (`mNext = ctx.currentTime + smallEpsilon`) and
   **drop** the missed steps rather than cramming them; also **cap steps scheduled
   per tick** as a backstop. Tempo must stay steady across render hitches, refocus,
   and SFX.
2. **Tempo ceiling (steady-state).** The fastest styles feel frantic at 16th-note
   arps (current bpm incl. Lava Run 150, Neon Arcade 140, Sky Castle 132,
   Clockwork 128, Bubble Pop 124). **Cap every style's bpm to a calm ceiling
   (≤ 116)** and rescale the over-ceiling styles down, preserving their relative
   order/character; leave already-gentle styles as-is. (Calm > frantic — ties to
   the anxiety-mitigation stance in RESEARCH-metagame.md.)
- **DoD:** Node test (stub AudioContext + controllable clock + captured timer):
  (a) **anti-burst** — simulate a timer stall where `ctx.currentTime` jumps well
  ahead, then one `musicTick()` schedules at most a small bounded number of voices
  (no flood) and `mNext` resyncs to ≈`currentTime`; normal steady ticking still
  schedules as before; (b) **tempo cap** — `max(style.bpm)` over all 13 styles
  ≤ 116, and the effective 16th-note interval `(60/bpm)/4` ≥ ~0.13 s for every
  style; (c) music still loops/varies/switches and respects mute. No regressions;
  deploy green.

### T34 — Place Value: bring decimals into Part 1 · status: DONE
Owner: *"shouldn't the Place Value topic include decimals?"* — correct. Right now
**Part 1 (`placevalue`, `PV_P1_SRC`) is whole-numbers only**; decimals live solely
in **Part 2 (`placevalue2`)**, which is mastery-gated — so a typical player who
hasn't mastered P1 **never sees decimal place value at all**, even though it's core
11+ content. Fix: **blend decimals into Part 1** so the base topic covers both,
keeping the harder cases as the Part-2 stretch.
- **Part 1 (`PV_P1_SRC`)** = a mix of whole-number AND **simple decimal** ×/÷ by
  10/100 — e.g. `3.5 × 10 = 35`, `4.2 × 10 = 42`, `60 ÷ 100 = 0.6`, `7 ÷ 10 = 0.7`,
  alongside the existing whole-number items. Keep ~21 items, balanced across × and
  ÷ and across whole/decimal. All answers **exact, numpad-enterable, stored as
  literals** (no float drift — the existing P2 pattern), non-negative.
- **Part 2 (`PV_P2_SRC`)** keeps the harder material: ÷1000, answers < 1 (0.06,
  0.08…), `×1000`, 3-decimal-place results — i.e. the genuine stretch.
- Keep the chain/links and `masterSecs` as-is; this is a content swap of the P1
  set, not a structural change.
- **DoD:** Node logic check — P1 now contains **both** whole and decimal items
  (assert ≥ ~6 decimal prompts and ≥ ~6 whole prompts); every P1 answer correct
  (recompute = stored, within 1e-9), whole-or-terminating, round-trips on the numpad
  (`parseFloat(String(a))===a`), non-negative; set is ~21, fixed (stable prompts
  across rounds), no `gen`; P2 still all-decimal and within its harder range; Beat/
  Spark regenerate; no regression to the chain or other topics; deploy green.
  (Babysitter re-verifies the P1 arithmetic and the whole/decimal balance.)

### T37 — Visual polish: Best-Times rank indicator + Inventory topic progress · status: DONE
Two related "show it with colour, not an AI-smell border" fixes (owner screenshots).
1. **Best Times rows (`.sum-row`).** Today each card has a rounded coloured
   `border-left:4px` strip tinted by rank — the textbook "AI CSS" left-border-on-a-
   rounded-card look. **Remove it**; convey rank colour with a small **filled
   bullet/dot** before the rank/holder label (colour = rank colour) OR a crisp
   **square (non-rounded) accent** — pick the cleaner result; keep the colour map.
   Keep any subtle row tint (the "highlight" the owner likes). Update the
   `.notplayed` dashed-left treatment to match. Locked rows: no/muted dot.
2. **Inventory topic rows.** Each topic row (Halves 32/59 …) shows only a bare
   fraction. Add a **coloured progress bar / heatmap** = owned/total fill, colour
   graded by completeness (cool/low → warm/high, or an accent that deepens toward
   100% with a distinct 100% colour). Keep the fraction text.
- **DoD:** no rounded coloured left-border remains on `.sum-row`; rank colour shown
  via a non-card-border element; inventory topic rows show a fill matching
  owned/total with sensible colour grading; both 360px-safe; no regressions; deploy
  green.

### T38 — Start screen fits the viewport (picker is the flexible scroll region) · status: DONE
Owner: the topic-selection (start) screen slightly overflows the bottom (build info
clipped). Make `#start` a flex **column** bounded by the app/viewport height so the
header (mark/tag), best-line, **Start**, link row, sound/exit and build info always
stay on-screen; the **picker** (`.picker-wrap`/`.picker`) becomes the flexible
region (`flex:1 1 auto; min-height:0; overflow-y:auto`) that shrinks and scrolls
when the column is too tall — the *topic list* scrolls, not the whole page. Keep
the scroll-cue (▾) working with the picker's own scroll.
- **DoD:** at a short viewport the start screen shows Start + links + build info
  with **no page overflow**; only the picker scrolls; scroll cue still toggles;
  360px-safe; other screens unaffected; no regressions; deploy green.

### T39 — Floating Back on the Inventory (and other long-scroll screens) · status: DONE
Owner: on the Inventory you must scroll all the way to the bottom to reach Back.
Give it an **always-visible Back** — a floating/sticky control that stays put while
the list scrolls (e.g. a sticky top bar with Back, or a fixed button pinned to a
screen corner, positioned within the app frame, 360px-safe, not overlapping the
"INVENTORY 143/1443" count or the first tiles). Keep it reachable without
scrolling; the existing bottom Back can stay or be removed. **Apply the same
pattern to any other scroll-long screen with a bottom-only Back — Best Times and
the Heroes screen** — so they're consistent.
- **DoD:** Back is reachable on the Inventory without scrolling; same for Best
  Times + Heroes; doesn't overlap their headers/content at 360px; tapping it
  returns to the menu/prev screen as before; no regressions; deploy green.

### T40 — Heroes cards: kill the AI-smell coloured left border · status: DONE
Owner: the Heroes cards have the **same rounded type-coloured `border-left:4px`**
that T37 removed from Best Times (`.hero-card` was explicitly left out of T37).
Apply the **identical fix**: remove the coloured rounded left strip (make the
border uniform like `.sum-row` now is) and convey the **type** (Brawn/Arcane/
Cunning) with the same **crisp pixel-square dot** treatment as the rank dot —
type-coloured square near the hero name (reuse the `.rankdot` styling / a sibling
class), keeping the exact type colours (`#d05a4a`/`#8a5cf6`/`#3fce8c`). Keep any
subtle card tint. (Leave the item-chip pills as they are — the owner's only after
the card's curved left border.)
- **DoD:** no `border-left`/inline `border-left-color` remains on `.hero-card`;
  type shown via a non-card-border square dot in the type colours; 360px-safe; no
  regressions to the heroes layout; deploy green.

### T41 — Rename heroes to more authentic names (display-only) · status: DONE
Owner-approved rename — **display names only**. The hero `id`s
(`bram,greta,tovar,mo,wisp,mira,nim,zeph,pip,vex,sela,roon`) **MUST NOT change** —
they key item boosts, `HERO_NAMES`, and `heroes.js`. Change **only the display names
in `HERO_NAMES`** in `collectibles.js` (the single source `heroes.js` reads). **Do
NOT touch `DESIGN-heroes.md`** (babysitter-owned; already updated).
- **FINAL MAPPING (apply exactly):**
  `bram→Brannon · greta→Valeska · tovar→Ser Aldric · mo→Magnar · wisp→Wisp ·
  mira→Maerwen · nim→Emrys · zeph→Aerin · pip→Pocket · vex→Vesh · sela→Selwen ·
  roon→Rendel`.
- **DoD:** `HERO_NAMES` has exactly these 12 names against the **unchanged** ids;
  ids untouched everywhere (boosts / heroes.js / unlock predicates); Node check:
  every catalogue boost's `HERO_NAMES[boost.hero]` is non-empty and matches the
  mapping; heroes screen + inventory boost labels show the new names; no logic
  change/regression; deploy green.

### T35 — Diverse item names + fix inventory truncation · status: DONE
Owner: item names are too samey (today: **14 adjectives, ~36 nouns → only 167
unique names for 775 items**; "Whispering" used 68×) and **get cut off on the
inventory screen**; they should NOT all follow the rigid `<Adj> <Noun>` mould (cf.
the lost "Cooked Goblin Leg"). Replace the naming system and fix the layout.
- **New naming system** from `docs/agent/DESIGN-names.md` (Babysitter will write it
  from the research output): multiple **name templates** (varied grammar — `{adj}
  {noun}`, `{noun} of {epithet}`, `The {adj} {noun}`, `{creature}'s {noun}`,
  `{cookadj} {creature} {part}` e.g. "Cooked Goblin Leg", plus whole **fixed**
  funny names) + large deduped word banks (600+ adjectives, big shared noun pool,
  epithets, creatures, places, cook-words, fixed names). Pick the template + words
  **deterministically from the item id** (stable across reloads).
- **Decoupled from icon category.** Names are generated independently of the
  T36 icon category (so the two scale separately); a category's theme may *lightly*
  bias noun choice but names are not locked to 50 per-category pools.
- **Diversity guarantees:** every item's full name is **unique**; **no adjective
  repeats** while the adjective bank exceeds the catalogue (size the bank for the
  post-loot catalogue; when exceeded, the templates' epithet/creature/place tails
  keep names unique and adjective reuse minimal). Names stay kid-appropriate,
  British, title-case.
- **Truncation fix:** owned-item names must **not be cut off** in the inventory —
  allow the tile caption to wrap (e.g. 2 lines) and/or size tiles so the full name
  shows; the unlock modal + detail already show the full name — keep that. 360px-safe.
- **Run AFTER T23** so the tier loot items are named by the new system too.
- **DoD:** Node test over the FULL catalogue (incl. T23 loot): every item name
  non-empty + **globally unique**; adjective-position words do not repeat across the
  catalogue (or, if catalogue > adjective bank, document the exact overflow and show
  names still unique); template usage is spread (not one structure); deterministic
  across reloads; no offensive/inappropriate words (Babysitter audits a sample).
  DOM/CSS check: inventory captions render the full name without ellipsis clipping
  at 360px; no regressions; deploy green.

### T36 — Pixel icons: ~50 categories + per-item variation · status: DONE
Owner: more icon categories (~50, same chunky 16-bit look) AND **stronger variation
within a category** (the old mirrored-sprite generator varied a lot; T20 made items
look templated). Full spec: **`docs/agent/DESIGN-icons.md`** — 12 parameterized
archetype renderers → ~50 category presets; grid `G` 12→16; per-item variation
(structural jitter + 6 generic levers: palette hue/lum shift within rarity, accent
scatter, silhouette jitter, symmetry-break, decorative marks, internal-line
rotation) capped + `locked` identity cells so categories stay recognizable; a Node
`icon-variation` test (stub-canvas role-grid: cross-category distinct ≥0.18,
within-category combined ≥0.22, no duplicates, identity ≥95%, determinism) wired
into the Pages workflow. **Run after T23 (loot)**; then remap name nouns to the
archetype family (12) per the DESIGN-names coupling note (add Tool + Garment pools).
- **DoD:** ~50 categories registered; all render; the `icon-variation` Node test
  passes every threshold; determinism holds; inventory/modal/toasts render the new
  icons; collectible earning unaffected; 360px-safe; no regressions; deploy green.
  (Babysitter re-runs the variation test + eyeballs a montage.)

### T42 — Inventory tabs + per-category progress bars + jump-to-top · status: DONE
Owner: the inventory is unwieldy (1443 items, 668 of them loot). Restructure it.
1. **Tabs.** A tab bar under the "INVENTORY x/total" header splits the content;
   **Loot gets its own tab.** Suggested: **Topics** (the existing per-topic
   collection rows), **Awards** (the drill-earned categories: Rank, Initiation,
   Flawless, Speed, Mastery, Solved, Spark, Milestone, Collector), **Loot** (the
   tier-loot). Exact grouping is builder's discretion **provided Loot is its own
   tab** and the tabs keep each view manageable. **Lazy-render**: only the active
   tab's tiles are in the DOM (so the 668-tile Loot tab costs nothing until opened
   — also helps perf). Default to the first tab; remembering the last tab is
   optional.
2. **Per-category progress bars.** Generalise the T37 topic bars to **every
   category**: each category section (incl. **Loot**, which has none today) gets a
   colour-graded owned/total bar (reuse `.tp-bar`/`.tp-fill` + `topicBarColor`).
   The Topics tab keeps its per-topic bars.
   **Loot sub-grouped by tier-region.** The 668 loot items belong to the 10 themed
   tier-regions (10 tiers each): Goblin Warren (1–10) … The Void Throne (91–100).
   In the Loot tab, sub-group loot by region (derive from the `loot:<n>:<k>` tier:
   `region = floor((n-1)/10)`; label from the enemy band name) with a **per-region
   progress bar** — so the Loot tab reads as 10 navigable regions, not one flat 668.
   *(If the owner trims loot counts — see note — this still holds.)*
3. **Jump-to-top.** A floating "↑ top" control on the inventory that appears once
   the (T39) list is scrolled down and snaps it back to the top; hidden at the top;
   360px-safe; doesn't overlap the always-visible Back or the header. (If trivial,
   apply the same to the other long lists — Best Times/Heroes — but inventory is the
   ask.)
- **DoD:** inventory shows a working tab bar; switching tabs swaps content; **Loot
  is its own tab**; only the active tab's tiles are in the DOM (Loot tiles absent
  until its tab is opened); **every category incl. Loot** shows an owned/total
  graded progress bar; jump-to-top appears when scrolled and returns to top (hidden
  at top); header count still correct; Back (T39) still always-visible; names (T35)
  + icons (T36) render inside tabs unchanged; 360px-safe; no regressions; deploy
  green. (Babysitter checks tab switching + lazy-render + the Loot bar in a DOM
  harness.)

### T43 — Trim tier loot to ~250 (recalibrate; keep all battle invariants) · status: DONE
Owner: 668 loot is too many — trim to **~250**, keeping the "deeper tiers drop more
& rarer" feel. Change the loot **batch formula** in `enemies.js` (currently `3 +
floor((n-1)/12)` = 668). Suggested: **`1 + floor((n-1)/25)`** → batch grows 1
(tiers 1–25) → 4 (tiers 76–100), **total 250**. Builder may use any growing formula
landing **~230–260** (confirm the exact total via Node). Keep the existing
rarer-with-depth rarity logic.
- **Recalibrate & RE-VERIFY (critical):** loot drives hero ratings, so `def_n` /
  `def100` recompute from the smaller set. Re-run the **full T23 battle-invariant
  suite on the new loot** — all must still hold: (a) tiers 1–5 winnable by the
  starter hero (bram, 0 items) at good perf; (b) **no tier gated behind its own
  loot**; (c) tier 100 unwinnable with nothing, winnable only at near-full
  collection; **def monotonic non-decreasing**; loot still `test()===false`
  (drill-unearnable) + T20-stamped; loot boosts still cover **all 12 heroes**.
- **DoD:** Node reports loot total ≈250; **every T23 invariant re-passes** on the
  trimmed set; loot stamped + covers 12 heroes; catalogue shrinks accordingly
  (base + ~250); no regression; deploy green. **Run before T24** so Arena grants the
  final set. (Babysitter re-runs the full battle-invariant harness.)

### T44 — Rename enemy tiers (regions + rank-titles + named bosses) · status: DONE
Display-only — tier numbers / `def` / loot ids (`loot:<n>:<k>`) and all battle logic
are **unchanged**; only the name strings in `enemies.js` change.
- **FINAL — Regions (index 0→9, weakest→strongest):** Goblin Warren · Gallowmarch ·
  Gloamwood · Haunted Marsh · Frostpeak Caverns · Drownholm · Cinderwaste ·
  Stormspire · Dragon's Roost · The Void Throne.
- **FINAL — Rank-titles (position 0→9 within a region):** Runt · Sentry · Brute ·
  Raider · Warden · Champion · Reaver · Dread · Warlord · Overlord.
- **FINAL — Named bosses** (override each region's 10th tier — i.e. tiers
  10/20/…/100 — instead of "<Region> Overlord"):
  10 **Goblin King** · 20 **The Highwayman** · 30 **Old Mother Bramble** ·
  40 **Gurgle, King of the Bog** · 50 **The Frost Jarl** · 60 **Bonecaller** ·
  70 **Cindermaw** · 80 **Voltan, Lord of Storms** · 90 **the Elder Wyrm** ·
  100 **The Void Sovereign**.
- **Naming rule:** for tier `n` (1-indexed): `region = floor((n-1)/10)`,
  `pos = (n-1)%10`. If `pos === 9` (a region boss, every 10th tier) → the named
  boss for that region; else → `"<Region[region]> <RankTitle[pos]>"` (e.g.
  "Gloamwood Reaver"). So "Overlord" is superseded by the named bosses but stays in
  the ladder as the conceptual boss rank.
- **DoD:** the 10 regions + 10 rank-titles + 10 named bosses match the FINAL set
  exactly; tier numbering / `def` / loot / battle logic untouched; the Arena/tier UI
  shows the new names; Node: every tier 1–100 has a non-empty name, tiers ≡0 mod 10
  use the named boss, others use "<Region> <Rank>", and the T23 loot/def invariants
  are unaffected; no regression; deploy green.

---

## Phase 3 — Hero / Enemy metagame

Full spec: **`docs/agent/DESIGN-heroes.md`** (read it fully before starting; ask in
BUILDER-LOG.md if anything is ambiguous — do not guess). Each task is complete
only with the Node tests its DoD names. Status `OPEN` only after Phase 2 is `DONE`
(unless the Babysitter pulls Phase 3 forward in REVIEW.md).

### T20 — Item layer: styles, names, boosts · status: DONE
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

### T21 — Heroes module + stats · status: DONE
Add `heroes.js`: the 12 heroes (data per design), `effectiveStats(hero,
collected)` = base + owned boosts, `rating(hero)`, and `isHeroUnlocked(hero,
collected, stats)`. Export on `window.Heroes`.
- **DoD:** Node test — bram unlocks on first `init`; effective stats grow as
  items are owned; rating monotonic; each hero's unlock predicate fires on its
  listed condition and not before.

### T22 — Heroes screen (`#/heroes`) · status: DONE
Roster grouped by type, locked/unlocked with unlock hints, per-hero effective
stats and the items boosting them; procedural pixel portraits. Start-screen link.
- **DoD:** renders all 12 (locked/unlocked) at 360px without overflow; routing
  + back work; deploy green.

### T23 — Enemy tiers + battle logic + tier loot · status: DONE
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

### T24 — Arena mode (`#/arena`) · status: DONE
Pick an unlocked hero → see tier + matchup hint → play a battle round (reuse the
drill engine over unlocked topics) → resolve → show the result maths → on win
grant `tier:n` + its **loot batch** (in the unlock modal) + advance (+ any hero
unlock). Start-screen link.
- **Owner requirement — the Arena must only be *beatable* once (all/most) inventory
  buffs are unlocked.** This is already guaranteed by the T23 calibration
  (`def100` needs near-full collection; no tier gated behind its own loot) — T24
  must **not weaken it**: the win check must use the player's *real owned* boosts
  via `Enemies.resolveBattle(hero, tier, perf, collected)` (the actual collected
  set), with **no perf-only shortcut** that lets a strong drill round beat a tier
  the hero's rating can't. So clearing the Arena (beating tier 100 / The Void
  Sovereign) genuinely demands having collected almost everything (drills + loot).
- **DoD:** full flow works on existing content; win/loss matches `resolveBattle`
  exactly **on the real collected set** (perf scales within a band but cannot
  substitute for missing rating); tier ownership + loot persist locally; loot
  appears in inventory and boosts heroes; **Node re-proof on the live wiring** that
  the final tier is unbeatable without a near-complete collection and that no tier
  is winnable without the buffs earnable before it; no regressions; deploy green.
  (Babysitter re-runs the full battle-invariant suite against the Arena's actual
  win path.)

### T25 — Balance + milestone wiring · status: DONE
Hero-unlock collectibles/milestones for "unlock all heroes", "defeat tier N",
"defeat the final tier". Balance pass so the curve is fair and the final tier
matches "needs ~everything". Update docs/research-11plus.md note that Phase 3 is
the engagement layer.
- **DoD:** Node test of the full progression curve; milestones evaluate
  correctly; final-tier ⇔ full-collection invariant holds.

### T26 — Currency (Goblin Gold): fun accumulation · status: DONE
Implement the currency per `DESIGN-heroes.md` §"Currency & economy" — **earn,
display, persist; NO spending (build no spend mechanic yet).** **Display name is
"Goblin Gold"** (owner-chosen) — keep it in ONE constant (internal
`gold`/`fmtGold`/`halves.gold` keys are fine). Make the accumulation itself fun and
able to reach **billions/trillions+**:
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
- **Owner decision (RESEARCH-metagame.md):** Gold is **deliberately** just a
  number that goes up — a comedic nod to incremental games, climbing to absurd
  quantities. **Heroes + inventory buffs are the real drivers; Gold is side fun**,
  and that's exactly why it's safe (it can't crowd out the maths when progression
  lives elsewhere). **No sink/spend is required or wanted right now** — keep T26 as
  earn/display/persist only. The single rule: Gold **only grows by playing** and
  earning is **performance-scaled** (skips=0, faster→more), so the number still
  tracks doing maths well. **No student-facing real-money spending, ever.**

---

## Phase 4 — Retention (research-driven; see RESEARCH-metagame.md)

Two tasks the metagame research surfaced as high-value-yet-missing. Sequenced by
the Babysitter; both are deploy-safe, self-contained, and respect the doc's red
lines (no purchases, no public leaderboards, no guilt/loss-aversion dark
patterns, no push notifications).

### T31 — Daily-practice momentum counter · status: DONE
A forgiving habit signal — **not** a fragile streak with freezes (owner redesign).
A single number that **goes up 1 for each day you play and down 1 for each day you
don't**, floored at 0 and **capped at 75** (owner: 100 is unrealistic to reach).
So a week of play (7) minus two missed days = 5; you only reach 0 after missing as
many days as you'd banked (≈ a week off). No guilt, no countdowns, no "about to
lose it" pressure, no notifications — it just drifts. Store `halves.streak`:
`{ count, lastDay, best }`, `lastDay` = local calendar day. Small indicator on the
start screen + a **non-blocking** acknowledgement when it goes up. Migration-safe
(absent = 0, no crash).
- **Reducer rules** (pure, given today's local day vs `lastDay`):
  - first ever play → `count = 1`.
  - same day (gap 0) → no change.
  - gap N ≥ 1 (N days since last play; N−1 of them missed) → subtract the missed
    days then add today, then clamp: `count = min(75, max(0, count − (N − 1)) + 1)`.
    (gap 1 → +1; gap 3 → −2 then +1 = net −1; a 7-day-then-miss-2 example: 7 → on
    return `min(75, max(0,7−2)+1)` = 6 the day you come back, i.e. you kept ~5 plus
    today.)
  - `best = min(75, max(best, count))`.
- **Cap = 75.** `count` and `best` never exceed 75; reaching 75 is the ceiling
  (the top milestone is the "maxed" reward).
- **Item unlocks (owner-confirmed):** milestone collectibles at **3 / 7 / 14 / 30 /
  50 / 75** (the unreachable 100 replaced; **75 = the cap / "maxed" item**), fired
  off the **high-water mark `best`** (so dipping and re-climbing never re-awards or
  revokes them), through the existing catalogue/milestone system (their own small
  set; rarity climbs with the milestone — 75 the rarest).
- **Display name:** this isn't really a "streak" anymore — pick a calm label with
  the owner (e.g. "rhythm", "momentum", "day count"); keep it in one constant.
- **DoD:** Node test of the pure reducer — first play =1; same-day no change; each
  gap computes `min(75, max(0,count−(N−1))+1)` (incl. the worked examples above, the
  floor at 0 after a long absence, AND the **clamp at 75** — many consecutive play
  days never exceed 75); `best` monotonic and ≤ 75; milestones fire off `best`
  exactly at threshold, once each, including 75 at the cap, and never revoke on a
  dip. No timers/notifications; no regressions; deploy green.

### T32 — Per-question Practice / Review view · status: DONE
Replaces the old "relaxed mode" idea (owner-chosen). Mitigates the one
well-documented harm of timed drills (TTRS's main critique; Boaler on timed-test
anxiety) **and** doubles as a precise mastery tool. **Depends on T27** (for the
approach-note method text) and on **storing per-question best times** (see below) —
sequence it **after T27**.
- **Per-question best-time store.** Add `halves.qbest` (per `modeId` → per question
  key → best solve time in seconds; a question is keyed by its prompt string, which
  is stable within a fixed set). Update it at the end of every **normal** round
  from that round's per-question times. Migration-safe (absent = empty).
- **The view.** From a topic (e.g. a "Practice" button on the start screen for the
  selected topic), open a grid of **all** that topic's fixed questions. Each tile
  shows the prompt and is **heat-mapped by the player's best solve time** for that
  question — reuse the Best Times palette; **skipped/never-solved tiles stand out**
  (grey/red) so weak spots are obvious.
- **Attempt one at a time.** Tap a tile → answer just that question, self-paced, no
  flurry. It is **still timed per question** (so rewards stay honest). On a clean
  solve, grant that question's **Beat**; on a fast clean solve, its **Spark** —
  through the existing per-question collectible path — and update `qbest`.
- **Round-level achievements stay round-only.** Flawless, the four Speed brackets,
  and Mastery are **never** awarded here — this is a training ground, not a
  shortcut; "100% still requires real mastery" via actual rounds.
- **Approach note.** Each question surfaces a short **"how to approach this"** line:
  the topic guide's general method (T27) applied to the specific numbers, produced
  by a per-topic `explain(question)` helper (generated from the method + values —
  NOT hand-written per item). British, 10-yo-appropriate, mathematically correct.
- **DoD:** Node/logic checks — `qbest` reducer records/keeps the **min** time per
  question and is migration-safe; the practice path awards **only** Beat/Spark for
  the attempted question and **never** a best-time, Speed bracket, Flawless, rank,
  or Mastery item; normal rounds are unchanged; `explain()` returns a correct,
  non-empty note for every question in every topic (spot-checked across topics for
  mathematical correctness by the Babysitter); the grid renders at 360px without
  overflow; no regressions; deploy green.

---

## Phase 5 — Final hardening (do LAST, after every other task is DONE)

### T45 — Performance / CPU / memory audit + fixes · status: OPEN
Owner: once everything is built, a final pass to ensure no CPU/memory/performance
problems. Audit the whole running app and fix anything found.
- **RAF / timers idle correctly.** The confetti canvas (`fx.js`) must stop its
  `requestAnimationFrame` loop when no particles are alive; the music look-ahead
  scheduler (`sound.js`) must run **only while playing** and stop on mute/hidden;
  no stray `setInterval`/RAF left running on menus. Verify each idles.
- **No leaks across navigation.** Repeatedly routing between screens
  (start↔game↔results↔inventory↔heroes↔arena) must not accumulate listeners,
  detached nodes, oscillators, or canvases. Tabs/inventory lazy-render must release
  the previous tab's DOM. Check event-listener add/remove balance.
- **Large-list rendering.** The inventory (~1025 items) + the Loot tab (250 tiles)
  must render/scroll smoothly on a mid-range phone; lazy-render already helps —
  confirm no full-catalogue re-render on every interaction; debounce scroll
  handlers (jump-to-top, scroll cues) if needed.
- **Audio voice budget.** SFX + music never schedule an unbounded number of
  oscillators (the T33 `MAX_STEPS_PER_TICK` + per-event caps hold); long sessions
  don't degrade.
- **localStorage size.** `collected`/`qbest`/best-times/streak/gold stay bounded
  and parse fast; guard against quota errors (already has in-memory fallback).
- **Method:** profile in a real browser (DevTools Performance + Memory) across a
  full play session; record findings + fixes in BUILDER-LOG. Where a pure check is
  possible (RAF/scheduler idling, listener balance), add a Node/headless assertion.
- **DoD:** documented audit with before/after for anything fixed; RAF + scheduler
  provably idle when nothing is animating/playing; no listener/node/oscillator
  growth over repeated navigation; inventory + Arena smooth at 1025 items; no
  console errors/warnings in a full session; no regressions; deploy green.
  (Babysitter verifies the idling/listener-balance assertions + reviews the audit.)
