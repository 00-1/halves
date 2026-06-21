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

### T45 — Performance / CPU / memory audit + fixes · status: DONE
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

---

## Phase 6 — Accessibility (owner-requested, post-completion)

### T46 — Fix low-contrast secondary text (WCAG AA) · status: DONE
Owner: "a lot of small dark grey text on a grey background." **Babysitter audit
(WCAG, computed):** the culprit is **`--muted: #6B7480`** — used for nearly all
secondary/label text (tags, sub-labels, `.build`, inventory captions, holders,
fractions, etc.). It **fails AA for normal text on every background**: 3.99:1 on
`--bg`, 3.65:1 on `--surface`, 3.26:1 on `--surface-2`, **2.73:1 on `--line`**
(AA needs **4.5:1** for normal text; muted only scrapes the relaxed 3:1 large-text
bar, and fails even that on `--line`). `--text`, amber, mint, coral all pass
(6–15:1) — leave them.
- **Fix 1 — raise `--muted` to AA-compliant.** Change `--muted` to a value that is
  **≥4.5:1 on every background it actually sits on** (bg / surface / surface-2 /
  line). **Suggested `#939CAB`** (verified: 6.83:1 bg · 6.24:1 surface · 5.57:1
  surface-2 · 4.66:1 line) — still clearly "secondary", just legible. Builder may
  pick any value meeting the bar; **keep the visual hierarchy** (muted must stay
  visibly dimmer than `--text`).
- **Fix 2 — bump sub-10px text.** The smallest captions are tiny (e.g.
  `.inv-cell .inv-name` at **8px**); raise any text below **10px** to ≥10px (11px
  preferred for body labels) so it's legible regardless of contrast. Don't break
  the 360px grid (the inv tile caption already wraps).
- **Scope:** colour/size only — no structural/markup change. Re-check that the
  amber/mint/coral status colours and the rank/heat-map palettes still read well on
  their backgrounds (they pass, but sanity-check the new muted against them).
- **DoD:** a **Node contrast assertion** (compute WCAG ratio) proving the new
  `--muted` is **≥4.5:1 on bg, surface, surface-2 AND line**; grep confirms no text
  rule under 10px remains; muted still visibly dimmer than `--text`; 360px-safe; no
  regressions; deploy green. **Wire the contrast assertion into the Pages workflow**
  as a third gate so contrast can't regress. (Babysitter re-computes the ratios.)

### T47 — Arena: pure stat check, NOT a maths drill · status: DONE
Owner correction: the Arena currently makes you **play a maths round** to fight a
tier — but "this is also a maths drill; that wasn't the intention. You should just
win if your hero stats are good enough." The maths drilling belongs in the
**topics** (that's where buffs are earned); the Arena is the **payoff** that
rewards how much you've collected + climbed — a stat check, not extra drilling.
- **Remove the drill round from the Arena.** Delete the `BATTLE_MODE` synthetic
  mode and the question round from the Arena flow; "Fight" resolves **instantly**
  from hero stats — no questions.
- **Stat-only outcome.** Win **iff** `effectiveRating(hero, collected) ×
  matchup(hero.type, tier.type) ≥ tier.def`. Drop `perf`/`computePerf` from the
  Arena win path entirely (it's mathematically the old `perf = 1` case — see note),
  so the **def calibration and all T23/T43 buff-gating invariants are unchanged**.
- **Arena UI rework.** Pick a hero → show its **effective power** (with buffs), the
  **RPS matchup** vs the tier, and the tier's **defence**; **Fight** → instant
  **Victory** (grant `tier:n` + its loot + advance + any hero unlock) or **Defeat**
  with a clear "not strong enough — collect more buffs (drill topics) or pick the
  advantage-type hero" message. The *choice of hero/type* is the decision; the
  outcome is deterministic.
- **Buffs still come from drilling the topics (collectibles) + tier loot** —
  unchanged. The Arena adds **no** drilling.
- **The owner's core rule, now purely buff-dependent:** you **cannot beat the
  final enemy (The Void Sovereign) without unlocking all/most buffs**, and can't
  reach it without clearing each prior tier. (Holds by construction — see note.)
- **Note (why invariants hold):** old `battlePower = rating × matchup ×
  (0.4 + 0.6·perf)`; at `perf=1` that's `rating × matchup`. Stat-only win
  (`rating × matchup ≥ def`) == the old max-perf win, which is exactly what the
  buff-gating was proven at. So no tier becomes unbeatable and the final-tier ⇔
  full-collection invariant is preserved.
- **DoD:** Node proof on the new stat-only path — (a) win == `rating×matchup ≥ def`
  with **no perf/question input**; (b) tiers 1–5 winnable by the starter hero's
  stats; (c) **no tier gated behind its own loot**; (d) tier 100 **unbeatable
  without a near-complete collection**, beatable at near-full, **one missing
  champion boost flips it to a loss**; (e) `canAttempt` still requires `tier:n-1`.
  The Arena **never invokes a question round** (assert `BATTLE_MODE` gone / no
  drill started from `#/arena`); **normal topic drills unaffected**; def values
  unchanged from T43; no regressions; deploy green. (Babysitter re-runs the full
  buff-gating suite against the new path.)

### T48 — Inventory regression: show item tiles + bars-at-top on every tab · status: DONE
Owner: "inventory regressed. The **Topics tab no longer shows any inventory items,
only the progress bars**. On the **other pages the progress bars should be all
brought to the top, the same as the Topics tab, not above each individual section.**"
Babysitter diagnosis (`main.js` ~466–555): (a) `invTopicsHtml` renders only the
per-topic `tp-row` bars and **no `invCell` tiles** — that's the missing-items
regression. (b) `invAwardsHtml`/`invLootHtml` call `invSection`, which emits each
section's bar **interspersed above its own tiles**, instead of collecting all bars
into one block at the top of the tab.
- **One consistent layout for all three tabs** — match the Topics-tab pattern:
  1. a **progress block at the very top** of the tab: one labelled bar-row per
     section (reuse the existing `tp-row`/`tp-head`/`tp-bar`/`topic-prog` styles —
     section name + `got/total` + the graded `tp-fill` bar via `topicBarColor`);
  2. **below it, the item tiles** (`invCell`) grouped by the same sections, each
     under a plain `<h4>` header **with no second bar** (bars live only in the top
     block now — no per-section bar duplicated beside the tiles).
- **Topics tab** — fix the regression: keep the per-topic progress block at top,
  then render each topic's tiles below it, grouped per topic with a header
  (`C.modeItems(m.id)` for the items, in the same `MODES` order as the bars).
- **Awards tab** — move all `AWARD_CATS` bars into the top block; render each
  category's tiles below under a header, no per-category bar beside the tiles.
- **Loot tab** — move all 10 region bars into the top block; render each region's
  tiles below under a header, no per-region bar beside the tiles. Keep the region
  grouping/labels and the lazy-render (Loot tiles still only built when the Loot
  tab is opened).
- **Preserve everything else:** the `invCell` owned/locked markup + rarity classes,
  `drawInvCanvases` over `.inv-cell.owned canvas`, jump-to-top (`updateInvTop`),
  `invList.scrollTop = 0` on tab switch, the `invMeta` total, `r-<rarity>` styling,
  and the bar grading (`topicBarColor`). Section ordering identical between the top
  bar-block and the tiles block. No change to collectibles data or earning logic.
- **DoD:** all three tabs show (i) a single progress-bar block at the top and
  (ii) the item tiles below — **Topics included** (regression fixed: real
  `invCell` tiles appear, owned ones drawing their icon, locked ones a `?`); **no
  section renders a bar beside its tiles** (bars only in the top block); section
  order matches between the two blocks; bar counts equal the owned/total per
  section; canvases draw for owned tiles on every tab; lazy-render preserved (Loot
  not built until opened); jump-to-top + scroll-reset still work; renders at 360px
  without overflow; no console errors; no regressions; deploy green. (Babysitter
  verifies every `$("id")` still exists, tiles render on all three tabs, the bar
  block sits above the tiles, and no per-section bar remains beside tiles.)

### T49 — Practice mode: promote the button, fix the hints, surface the guide · status: DONE
Owner played Practice and found three problems (screenshot: "half of **5**" showed
the hint *"Halve the tens and ones separately, then add — half of 5 is 2.5 (odd…)"*).
The hint **gave away the answer** (`2.5`) and **talked about tens when 5 has none**.
Root cause: `Guides.explain(modeId, q)` in `guides.js` (~158–207) ends every branch
with `" is " + a` (reveals the answer) and uses one generic template per topic,
ignoring the actual number's structure. Four parts:

- **(1) Promote Practice to a primary action.** Move `#practiceBtn` out of the
  `.linkrow` (it's a small `linkbtn` at `index.html:41`) and make it a **primary
  button beside Start** on the `#start` screen — same visual weight as `#startBtn`,
  e.g. a two-button row. It **acts on the currently-selected topic**, exactly like
  Start, and is **gated by `isUnlocked(mode)`** the same way (a locked topic can't be
  practised). Keep the existing `openPractice()` wiring. Don't break the 360px
  layout or the topic picker above it.
- **(2) Hint = tap-to-reveal aside (owner picked model A).** On the **practice
  answering screen**, the method note (`#practiceNote`) must be **hidden by default**
  behind a clearly-separated **"How to approach this"** toggle the player taps to
  reveal — it is NOT shown inline with the live question, and **normal rounds show no
  hint at all** (unchanged). Reset to hidden on each new practice question.
- **(3) Rewrite EVERY topic's hint — method only, number-specific (the core work).**
  Rework `explain()` for all 15 modes so each hint:
  - **Never states or contains the answer.** State the *method applied to these
    numbers* and stop **before** computing the result (e.g. "Divide 18 by 3 to find
    one third, then take 2 of those" — do **not** write "= 12"). Delete the
    `"…the answer is " + a` fallback; the fallback must also be answer-free.
  - **Matches the actual number's structure**, not a fixed template. Examples of the
    branching required: **halves/doubles** — single-digit vs multi-digit (no "tens and
    ones" when the operand < 10); **odd → ends in ·5 / even → splits evenly /
    decimals**; **times** — surface the right trick for *these* operands (×9, ×5, ×4,
    ×11, square, ×1, commute) and otherwise a tables cue; **percentages** — keyed to
    the actual % (50/25/10/20/5/1/75…); **fractions-of** — unit vs non-unit, the real
    denominator/numerator; **place value** — the real direction (×/÷) and number of
    places for 10/100/1000, decimals included; **bonds** — to 10/100/1000 and decimal
    bonds to 1, whole-tens vs with-ones. Mathematically correct, British,
    10-yo-appropriate, and **concise — one short sentence, not a paragraph.**
- **(4) Surface the topic guide on the practice list + audit the guides.** Under the
  practice **question-selection** grid (`renderPractice`), render that topic's overall
  guide (`Guides.get(modeId)` → intro + tips + example) so the documentation sits
  beneath the list. Then **audit all 15 `GUIDES`** for method coverage and
  correctness (e.g. halves already covers odds/·5 — confirm each topic names its key
  methods); fix any gap. **Keep guides concise — do not let them get verbose**
  (intro ≤ ~1 line, 2–4 tips, one example). The guide *example* may show a worked
  answer (it's documentation); the **per-question hint** in part 3 must not.
- **DoD:** Practice is a primary button beside Start, acts on the selected topic, and
  is unlock-gated (locked topic → can't practise). The practice hint is hidden until
  the player taps "How to approach this"; normal rounds show no hint. **Node assertion
  over EVERY question in EVERY topic's curated set:** `explain()` returns a non-empty
  hint that (a) does **not** contain the question's answer as a token (numeric value
  and its `.5`/decimal form), and (b) does not reference absent structure — at minimum
  asserts **no "ten"/"tens" in any single-operand-<10 halves/doubles hint** and the
  "half of 5" case reads as an odd/half note with no `2.5`. The practice list shows
  the topic guide below the grid. Guides audited (Babysitter spot-checks wording +
  maths across all topics). 360px-safe; no console errors; no regressions; normal
  rounds unaffected; deploy green. (Babysitter re-runs the no-answer-leak +
  no-phantom-structure assertion across all topics and reads a sample of hints/guides
  for quality and mathematical correctness.)

### T51 — Restore the varied hero portraits (un-regress the "weird faces") · status: DONE
(Built **before T50** so the hero art is already correct when T50 adds portraits to the
Arena.) Owner: "the hero icons regressed — they used to look like weird faces, now
they're all the same turtle creature. Bring the old ones back." **Babysitter root
cause (confirmed in git history):** pre-T36 the hero portrait forced
`s_sprite` — a per-hero **mirrored creature blob** (symmetric, seeded, varied → the
distinctive "weird faces"), called as `drawIcon(cv,"hero:"+id,pal,0)` (style 0). The
T36 icon overhaul (`f1d8e92`) replaced the 10 fixed styles with ~50 category presets
and re-pointed heroes at the **`"familiar"` critter preset**, which has *fixed* body
params (`bodyW:5,bodyH:5,feet:2,tail:1`) — so every hero is the same turtle shape with
only tiny seed jitter. The old drawer lives at `git show f1d8e92~1:collectibles.js`
(`s_sprite`, ~line 246: left half filled with a centre-weighted probability, mirrored,
~30% accent).
- **Restore a dedicated hero-portrait drawer** = the old mirrored-creature-blob,
  **adapted to the current `G = 16` grid** (the falloff/mirror generalise from G), in
  `collectibles.js`. Seed it from the hero id so **each of the 12 heroes is visibly
  distinct** ("weird faces"), painted with the per-type `HERO_PAL` (class colour) via
  the existing `paintGrid`/`shiftPalette`.
- **Route hero portraits to it, NOT the item category.** Heroes must stop using the
  `"familiar"` critter preset. Detect the `"hero:"` id prefix inside `buildIcon`/
  `drawIcon` (or add a dedicated `catId`/entry point) so `drawIcon(cv,"hero:"+id,
  HERO_PAL[type], …)` produces the blob portrait. **Do NOT modify the `"familiar"`
  category itself or any of the ~50 item archetypes/presets — item icons must be
  byte-for-byte unchanged.**
- **Both hero surfaces use the one path:** the Heroes screen (`renderHeroes`, ~611) and
  the Arena picker/result (post-T50) — fixing the draw path fixes them together.
- **DoD:** the 12 hero portraits are **visibly varied** (not one repeated critter) and
  render in the restored creature-blob/face style, deterministic per hero (stable
  across loads), class-coloured; **item icons are unchanged** (assert the role/colour
  grids for a sample of catalogue ids — incl. the `"familiar"` *item* category — are
  identical before/after, and the icon-variation CI gate still passes); Heroes screen +
  Arena both show the varied faces; `node -c` clean; no console errors; no regressions;
  deploy green. (Babysitter diffs item-icon grids pre/post to prove items untouched and
  eyeballs that the 12 hero grids differ from one another.)

### T50 — Generated icons on nav buttons + hero portrait in the Arena picker · status: DONE
Owner: "the Best times / Inventory / Hero / Arena buttons are very subtle and boring
— nice if they get generated icons. Selecting a hero doesn't show the hero's icon —
let's include that." Two parts, both using the **existing procedural pixel-icon
system** (`C.drawIcon(canvas, id, pal, catId)` in `collectibles.js`) — no new art
engine, same 8-bit aesthetic.

- **(1) Procedural icons on the four menu buttons.** Give `#statsBtn` (Best times),
  `#invBtn` (Inventory), `#heroesBtn` (Heroes), `#arenaBtn` (Arena) a small generated
  pixel icon before the label. Reuse a **fitting existing category preset** per button
  with a **fixed deterministic seed** (so each is stable across loads), e.g. a
  blade/`sword` or `shield` for Arena, a `helm`/`familiar` for Heroes, a `gem`/`coin`
  for Inventory, an `orb`/`scroll` for Best times — Builder picks the best-reading
  match. Add a `<canvas class="pix">` to each and draw it when the `#start` screen is
  shown (and on boot); icons must be legible at the small menu size and use a sensible
  palette (`C.paletteFor(...)` or a fixed pal). **Do not break the `.linkrow` layout
  or wrap** at 360px; keep the text label (icon + text). The `🔊 Sound` / `⛶ Fullscreen`
  utility toggles are out of scope (leave as-is) unless trivially consistent.
- **(2) Hero portrait in the Arena hero picker.** The Arena "choose your champion"
  cards (`.arena-hero`, built in `renderArena`) currently show only name/rating/matchup
  — **no portrait**, unlike the Heroes-list cards. Add the hero portrait to each pick
  card: a `<canvas class="pix">` drawn with the **same call the Heroes screen uses** —
  `C.drawIcon(cv, "hero:"+h.id, HERO_PAL[h.type], …)` — via a post-render
  `querySelectorAll` loop (mirror `renderHeroes` lines ~609–611). **Note:** T51 (done
  first) restores the varied hero-face draw path, so this call produces the proper
  per-hero portrait, not the old repeated critter — use the same call `renderHeroes`
  uses after T51, don't re-pin `"familiar"`. Also show the chosen
  hero's portrait in the **battle/Victory result** header if it fits cleanly. **Build
  on the post-T47 Arena** (T47 reworks the Arena flow/UI first; add portraits to the
  reworked picker, do not reintroduce anything T47 removed).
- **Scope:** presentation only — no change to icon data, hero data, battle maths, or
  the catalogue. Deterministic (fixed seeds → stable icons). Lazy where it already is.
- **DoD:** the four menu buttons each render a stable procedural pixel icon beside the
  label, legible and non-wrapping at 360px; the Arena pick cards each draw the correct
  hero portrait (matching that hero's Heroes-screen portrait), and the result header
  shows the chosen hero's portrait; every `$("id")` referenced exists; `node -c` clean;
  no console errors; no regressions to the menu, Heroes screen, or the (post-T47)
  Arena; deploy green. (Babysitter verifies the icon draw-calls target real canvases,
  the hero portrait id/pal matches the Heroes screen, and the menu layout holds at
  360px.)

### T52 — Procedural enemy sprites in the Arena (new generator, high variation) · status: DONE
Owner: "add an icon for the enemies in the Arena — a new image gen, something with lots
of variation." The Arena tier card (`.arena-tier`, `main.js` ~702) shows only the
enemy's name/type/def — **no art**. Add a **new procedural monster-sprite generator**
(separate from the item-icon archetypes — do NOT reuse/alter the collectibles icon
system) and draw the current tier's enemy on its card.
- **New generator module.** A standalone, pure, deterministic pixel-sprite drawer
  (e.g. `monsters.js`, loaded in `index.html`, exposing `window.Monsters` with a
  `draw(canvas, tier)`-style API and a pure grid builder for testing). Seed from the
  tier (`tier.n`/`tier.name`) so a given enemy always looks the same.
- **Lots of variation, themed.** Vary body silhouette, eyes (count/placement), horns,
  limbs/appendages, mouth, spots/texture across enemies — clearly distinct from the
  hero "creature blob". **Theme by the 10 regions** (`BANDS`: Goblin Warren … The Void
  Throne) and tint by the tier's RPS **type** (Brawn/Cunning/Arcane palette). **Bosses**
  (tiers 10/20/…/100, named in `BOSSES`) must read as **bigger/special** (extra
  features or a larger frame), not just a recoloured grunt.
- **Where shown.** The current-tier card in `renderArena`, and the **battle result**
  header (the enemy you just fought). Locked/cleared states still render sensibly.
- **Performance (T45).** Sprites are **static** — draw once to a canvas on render, no
  per-frame RAF loop; deterministic so no recompute churn. 360px-safe; pixelated
  (`image-rendering:pixelated`) to match the aesthetic.
- **DoD:** every tier's card shows a distinct, deterministic enemy sprite; a **Node
  variation assertion** (mirroring `icon-variation.test.js`) proves a sample of enemy
  sprites across regions/types produce **visibly different grids** (e.g. ≥90% of a
  sampled set are pairwise distinct, bosses differ from grunts in the same region);
  region/type theming is applied; bosses render larger/special; item icons + hero
  portraits untouched; `node -c` clean; no RAF/loop added; no console errors; 360px-safe;
  no regressions; deploy green. **Wire the enemy-variation assertion into the Pages
  workflow** as another gate. (Babysitter re-runs the variation assertion and eyeballs
  that bosses differ from grunts and regions differ from one another.)

### T53 — Procedural region scenery in the Arena (per-location backdrop) · status: DONE
Owner: "add some scenery image gen for each location in the Arena." Give each of the
**10 Arena regions** (`BANDS`) a generated **scenery backdrop** behind the tier card so
each location feels distinct. Build on T52 (enemy sprites land first).
- **New scenery generator.** A pure, deterministic procedural backdrop drawer (e.g. in
  `monsters.js`/a `scenery.js`, `window.Scenery.draw(canvas, region)`), seeded by the
  region index (0–9) so each region's scene is stable. Layered silhouettes / horizon /
  themed motifs (e.g. warren mounds, gallows, gloam trees, marsh, frost peaks, drowned
  spires, cinder dunes, storm towers, dragon crags, void rifts) — **a distinct palette +
  silhouette per region**, evoking the `BANDS` name. Keep it tasteful and low-detail
  (it's a backdrop, not the focus).
- **Readability first (ties to T46).** The backdrop must sit **behind** the enemy sprite
  and the tier text and **never hurt legibility** — dim/low-contrast wash, or an overlay
  scrim, so `--text`/`--muted` keep their WCAG-AA contrast over it. The enemy sprite and
  all controls stay clearly on top.
- **Performance (T45).** Static — draw once per region change to a cached canvas; **no
  per-frame animation/RAF**. Redraw only when the region (tier band) actually changes.
  360px-safe.
- **DoD:** each of the 10 regions shows a distinct, deterministic backdrop matching its
  theme; advancing into a new region swaps the scene; text/sprite remain clearly legible
  over it (spot-check contrast holds); no RAF/animation loop added (static draw, redrawn
  only on region change); `node -c` clean; no console errors; 360px-safe; no regressions
  to the Arena flow; deploy green. (Babysitter checks the 10 region grids differ, the
  draw is static/idle, and text contrast over the backdrop is preserved.)

### T54 — Version check + "Update" button (poll build.json) · status: DONE
Owner: "add a version check — poll a version.json and give the user a button to update
(refresh) when we see a new version." **Reuse the existing `build.json`** (already
written at deploy time with `{sha, shortSha, time}` and fetched once at load,
`main.js` ~1244) as the version source — don't add a parallel file.
- **Record the loaded version.** On first load, remember the sha the app booted with
  (the `build.json` already fetched). On `local build` (no `build.json`), the check is a
  no-op.
- **Poll for a newer deploy.** Periodically re-fetch `build.json` with `cache:"no-store"`
  (e.g. every few minutes — pick a sensible interval; reuse/extend the existing
  `setInterval`, don't add a tight loop). If the fetched `sha` **differs** from the
  booted sha, a new version is live.
- **Offer an update.** Show an unobtrusive **"Update available — Refresh"** control (e.g.
  a small banner/button) that, on click, calls `location.reload()`. Dismissible; never
  auto-reloads (don't interrupt a round). Must not steal focus or block input mid-drill.
  Style consistent with the app; legible (WCAG-AA, no sub-10px text).
- **Robustness.** A failed/404 fetch is ignored (offline-safe, no console spam); the
  poll never throws; works on GitHub Pages (the `no-store` fetch already defeats most
  caching).
- **DoD:** with a simulated sha change the app surfaces the Update control and clicking
  it triggers a reload; identical sha shows nothing; missing `build.json`/offline is a
  silent no-op; no auto-reload, no focus theft, no tight polling loop (interval only);
  the control is AA-legible and 360px-safe; `node -c` clean; no console errors; no
  regressions to the existing build-info line; deploy green. (Babysitter verifies the
  sha-compare logic, that reload is user-initiated only, and that failures are swallowed.)

### T55 — Extend the Collector award ladder to 10,000 items · status: DONE
Owner: "the Collector awards category only goes up to 150 items — it needs to go up to
10× that; actually go up to **10k**, since we'll add more over time." Today the
`Collector` category has just **3** tiers — `collector:25` (Curator), `collector:75`
(Hoarder), `collector:150` (Completionist) — in `collectibles.js` (~167). With the
catalogue already at **1045 items**, the ladder dead-ends at 150 and "Completionist" is
a misnomer (only ~14%). Extend it into a long ladder up to **10,000**.
- **Add tiers up to 10,000.** Replace the 3-entry list with a full ladder, e.g.
  thresholds **25, 75, 150, 300, 500, 750, 1000, 1500, 2500, 5000, 7500, 10000** (Builder
  may tune spacing, but it must start at 25 and **top out at 10000**). Rarity climbs with
  depth (rare → epic → legendary; the high tiers — ~1000+ — are legendary). Headroom
  above the current 1045 is intentional (future items).
- **Migration-safe.** **Keep the existing ids** `collector:25/75/150` so players who
  already earned them keep them (the milestone is keyed by id). You may **rename** the
  150 tier (it's no longer "completion") — that only changes the display name, not the
  id. New ids (`collector:300` … `collector:10000`) are purely additive.
- **Names + desc.** Characterful, British, **varied** names (no repeated
  adjective/noun construction — consistent with the project's naming standard); keep
  Curator/Hoarder. Descriptions read naturally with thousands formatted (e.g. "Collect
  **2,500** items.").
- **No logic change needed.** `evaluateCollector(count, has)` is already threshold-based
  (`count >= it.n`) — confirm it still grants every newly-passed tier and never
  re-awards an owned one; the Awards-tab Collector section (post-T48: bars-at-top) shows
  all tiles fine. Icons auto-generate from the new ids.
- **DoD:** the Collector category exposes the full ladder ending at **10000**; existing
  `collector:25/75/150` ids are unchanged (migration intact); a Node check confirms
  `evaluateCollector` grants exactly the tiers with `n ≤ count` (spot values, incl. a
  large count like 3000 → all tiers ≤3000, none above) and never re-awards owned ones;
  the Awards tab renders the longer Collector section without overflow at 360px; names
  are varied + correctly formatted; the icon-variation gate still passes; `node -c`
  clean; no regressions; deploy green. (Babysitter recomputes the granted set at several
  counts and checks the ids/migration + naming.)

### T56 — Pixel-art the app mark + topic glyphs (keep the maths operators) · status: DONE
Owner: "the main app icon and the individual topic icons look too sleek for the pixel
image-gen style of the other images in the game. I **do** like the relevant
mathematical operators being shown — is there a way to replace these with pixel
image-gen but keep the operators in them?" Today the brand **mark** and every topic
**glyph** are typographic HTML — `mode.glyph` strings like
`x<span class="slash">/</span>2`, `a<span class="slash">×</span>b`, `n%`, `x²`,
`½n` — styled by `.mark`/`.slash` (`styles.css` ~43) and rendered on the entry +
start marks, the guide/practice titles (`.g-glyph`), and toasts (`.t-glyph`). They
read as clean vector type, not pixel art. **Re-render the operators as pixel art while
keeping each operator clearly recognisable.**
- **New pixel-glyph renderer.** A small procedural **pixel bitmap font** for exactly
  the symbols the glyphs use — digits `0-9`, the compound tokens `100`/`1k`, letters
  `x a b n`, and operators `× ÷ + − ± / % ½ ¾ ²` — drawn chunky on a pixel grid to a
  canvas (`image-rendering:pixelated`), in the game palette (operator in `--amber`
  accent, operands in `--text`, matching the old mark's amber-slash look). It must
  compose the multi-token marks (`x/2`, `a×b`, `+100`, `n%`, `x²`, `¾`, `½n`, …) into
  one legible pixel mark. Live in its own module (e.g. `glyphs.js`/`window.Glyphs`,
  loaded in `index.html`); pure + deterministic.
- **Drive it from structured glyph data.** Parsing the HTML `glyph` strings is brittle;
  prefer adding a structured token list per mode in `modes.js` (e.g. `glyphTokens`)
  that the renderer consumes, while keeping the existing `glyph` HTML as a fallback so
  nothing else breaks. The pixel mark must visually match each topic's current operator.
- **Apply everywhere the mark/glyph shows:** the **entry** brand mark (static `x/2`),
  the **start** per-topic mark (`renderMark`, `main.js` ~268), the **guide title** and
  **practice title** glyphs, and the **toast** glyph — all become the pixel rendering.
- **Real app icon (favicon / home-screen).** There is **no favicon today**. Generate one
  procedurally from the same renderer — draw the `x/2` mark to an offscreen canvas and
  set it as the page icon via a `<link rel="icon">` data-URL at runtime (plus
  `apple-touch-icon` + a `theme-color`). No binary asset / build step needed.
- **Quality bars.** Pixel marks are **static** (draw once per render; no RAF), legible
  and **WCAG-AA** on their background (the amber/text on `--bg` already pass — keep it),
  **360px-safe**, and crisp at the big entry/start size *and* the small title/toast
  size (scale the grid, stay pixelated). Don't regress layout where the marks sit.
- **DoD:** the entry + start marks, the guide/practice titles, and the toast all render
  the operators as pixel art that still **clearly shows the correct operator for each of
  the 15 topics** (spot-checked: `x/2`, `a×b`, `2×x`, `a+b`, `a±b`, `+100`, `+1k`, `×÷`,
  `÷×`, `½n`, `a/b`, `%`, `n%`, `¾`, `x²`); a procedurally-generated favicon +
  apple-touch-icon are set (visible page icon); the renderer is its own module, pure,
  deterministic, static (no RAF); contrast holds (AA), 360px-safe, crisp/pixelated at
  both sizes; `node -c` clean; no console errors; no regressions to the marks/titles/
  toasts; deploy green. (Babysitter checks each topic's pixel mark encodes the right
  operator, the favicon is set, and the draw is static/contrast-safe.)

---

## Phase 6.5 — Events (owner brought this forward, 2026-06-21 — "I like it a lot")

> **What it is.** Daily, time-limited maths challenges with **today-only rewards**. A
> roster of **14 events cycles daily at 00:00 UTC** — one event is live each UTC day, so
> the full set recurs every 14 days. Each event is a distinct, compelling thing (its own
> art, copy, music, reward) — never a reskin. Rewards are **real buffs** in a **new
> "Events" inventory tab**; they're full collection members and feed Arena power. Events
> also appear on the **best-attempt board**, but are only playable during their live
> window (so beating your score waits for the recurrence, ~14 days).
>
> **Hard design constraints (static site, no backend).** Everything is **deterministic
> from the device's UTC date** — no server. "What's live today" = a baked-in rotating
> calendar indexed by the UTC day. "Today-only" keys off the device clock at 00:00 UTC.
>
> **Owner decisions (final, 2026-06-21):**
> - **14 events**, **daily rotation at 00:00 UTC** (each recurs every 14 days).
> - Rewards are **REAL buffs** (carry hero boosts, feed Arena power), in a **new dedicated
>   "Events" inventory tab / collectible category**.
> - **Event buffs MAY gate high Arena tiers** — and there is **NO need for any Arena UI
>   that explains "this foe needs an event buff / next event in N days."** Owner was
>   explicit: an event is live *every day*, so daily buffs are obviously available — do
>   **not** add that explanatory UI (earlier Babysitter note to add it is **withdrawn**).
> - Each event needs **compelling unique graphics + text** and **new event music**.
> - **An attractive event banner, prominent on the home screen — NOT hidden in menus**
>   (owner, 2026-06-21). It's a top-level call-to-action, the first thing you see. (T81.)
> - The game played is a **predetermined mix of questions from across the topics**.
> - Events appear on the **best-attempt board**; retry only during the live window;
>   **outside the live window the entry is locked** on the best-of screen (visible, not
>   playable). Best attempt persists across recurrences so you can beat it next time.
>
> **Invariants that still must hold** (difficulty-curve shape, independent of event-gating):
> tiers **1–5 winnable at 0 items**; **def monotonic non-decreasing**; **no tier gated
> behind its OWN loot** (T23/T43/T47/T66). Adding event buffs to the collection only
> raises the high-end ceiling — re-prove these on the grown pool (the `arena.test.js`
> suite already does). This block is **T78 → T79 → T80 → T81**, in order.

### T78 — Events foundation: UTC-daily scheduler + data model + "Events" tab + reward items · status: DONE
The deterministic backbone everything else builds on. **No backend; pure + offline.**
- **Scheduler (its own module, e.g. `events.js`, pure/deterministic).** A fixed roster of
  **14 event definitions**. Today's event = `roster[ floor(epochDaysUTC) % 14 ]`, where
  `epochDaysUTC = floor(Date.now()/86400000)` (UTC day index — **must** use UTC so the
  rollover is 00:00 UTC, not local). Expose helpers: `Events.today()`, `Events.isLive(id)`
  (true iff that event is today's), `Events.daysUntilLive(id)` (0..13), and the roster.
  Pure functions of a passed-in timestamp (inject the clock so it's testable).
- **Event definition shape** (data, all 14 fully specified — real, distinct, compelling):
  `{ id, name, theme, blurb, questionMix, rewardId, artSeed, musicSeed }`. `name`+`blurb`
  are real, evocative copy (each event feels unique). `questionMix` is the spec T79 reads
  (which topics + how many each — see T79). `rewardId` = `event:<id>`.
- **New collectible category "Events"** with **14 reward items** (`event:<id>`), as **full
  collection members**: they carry **hero buffs** like loot/awards and therefore **feed
  Arena power** (no special-casing — they join the same collection the Arena reads). Stable
  ids, migration-safe (existing profiles simply don't own them yet).
- **New "Events" inventory tab** alongside the existing inventory categories
  (Topics/Awards/Loot/…): lists the 14 event rewards with owned/locked state, consistent
  with the existing inventory UI and copy. (Showing locked ones is fine — match how the
  rest of the inventory treats unowned items.)
- **DoD:** Node test (`events.test.js`, added to the Pages workflow) proves: same UTC date
  → same event; the index is always `0..13`; the roster **cycles every 14 days** and each
  event recurs every 14 days; the **00:00 UTC boundary** flips the event (test a timestamp
  at `23:59:59Z` vs `00:00:01Z`); scheduler is pure/offline (no network, no `Date.now`
  baked in — clock injected). The 14 rewards are **real collection members** (they appear
  in the global collected/total counts and carry buffs — verify one feeds a hero boost).
  New tab renders owned + unowned at **360px** with no overflow; routing/back work.
  Migration-safe (a pre-existing profile loads unchanged; new category only *adds*). No
  answer/secret leaks in names/blurbs. `node -c` clean; **all existing gates stay green**.

### T79 — Event play mode: the cross-topic gauntlet + today-only reward grant · status: DONE
The actual game. Reuses the existing round/clock/scoring engine; adds the event ruleset.
- **Question set = a predetermined, deterministic mix drawn from across existing topics**,
  per each event's `questionMix`. **Deterministic per event** (seeded from `id`/`artSeed`)
  so the set is the **same every time the event is played or recurs** — this is what makes
  the best-attempt board fair across plays and across the 14-day recurrence. **Not**
  fresh-random each entry. Curate the mix to feel themed (the spec may say e.g. "N from
  each of these topics"); answers are pulled from the existing curated topic sets so they
  stay calibrated.
- **Engine reuse:** same numpad, length guard, elapsed-clock (no per-question countdown),
  and scoring as a normal round. Every question must be **numeric, non-negative, in the
  calibrated ranges** (`docs/research-11plus.md`) and **numpad-enterable** within the
  length guard.
- **Entry + reward:** the event is playable only when **live today**; **completing today's
  live event grants its `event:<id>` reward** (the buff). Outside the live window it is not
  playable (ties to T80's lockout). Replaying a live event is allowed (improve your score);
  the reward grant is idempotent (own-once).
- **DoD:** Node logic check across **all 14 events**: the gauntlet generator yields valid
  numeric/non-negative/in-range/numpad-safe questions; the question set is **deterministic
  per event** (same set on replay — assert byte-stable); the reward is granted **only when
  that event is live** and is **idempotent**; offline-safe; no leaks. Extend `events.test.js`.
  `node -c` clean; every `$("id")` used exists in `index.html`; **all gates green**.

### T80 — Best-attempt board: event entries + live-window lockout · status: DONE
- Events appear on the **best-attempt board**. An event entry is **playable/retryable only
  during its live window** (today, recurring every 14 days). **Outside the window it renders
  locked** on the best-of screen — visible (so the player knows it exists / recurs) but
  **not routable into play**.
- **Best attempt persists across recurrences** — playing the event next time it comes
  around lets you **beat your prior score** (the stored best survives the 14-day gap).
- **DoD:** Node check — the board lists event entries; `isRetryable(event)` is **true iff
  the event is live today**, **false otherwise**; a locked entry renders but **does not
  route** into a round; the stored best attempt **persists and compares correctly across a
  simulated 14-day recurrence** (set the clock forward 14 days → same event live again →
  prior best still present and beatable). Migration-safe; `node -c` clean; gates green.

### T81 — Event presentation: compelling art + copy + event music + home banner · status: DONE
Make events *feel* special. **New procedural art set** (anti-dilution rule — do not reskin
existing art).
- **Per-event procedural graphics:** a new, standalone procedural art generator for events
  (its own module), producing a **distinct** mark/scene per event across all 14 (variation,
  like the monster/icon/scenery gates). Static draw (no RAF), deterministic from `artSeed`.
- **Copy:** surface each event's real `name`/`blurb` (from T78) wherever the event is
  presented — it should read as a unique, compelling challenge.
- **New event music:** a dedicated **event music theme** wired into the existing audio
  engine, honouring the **calm + volume** rules (T69/T71 — ≤95 BPM band, master/music
  levels, no clipping). Per-event variation is welcome but **at least one distinct event
  theme** is required.
- **Prominent home-screen event banner (owner requirement — NOT hidden in menus).** The
  banner is a **front-and-centre element on the main/home screen** — the first thing a
  player sees, **not** tucked behind a tab, the inventory, or a sub-menu. It must be
  **attractive**: today's event art + name/blurb, an obvious **call-to-action to play**
  (routes straight into the live event), and a **countdown to the 00:00 UTC rollover**.
  When the player already owns today's reward, the banner stays but reads as
  done/come-back-tomorrow (still visible, not nagging). **Do NOT** add any Arena
  event-gate-explanation UI (owner: unnecessary — see phase note).
- **Carry-over fixup from T80 (required).** The live-event row on the best-attempt board uses an
  invalid inline style `background:var(--amber)1f` — after `var()` substitution this is
  `#F5B544 1f` (two tokens), so it's **dropped** and the intended subtle amber tint never
  applies. Replace it with a valid low-alpha amber (e.g. an `rgba()`/`color-mix()` token or a
  predefined `--amber-weak` custom property) so the live row gets its tint. Confirm the value
  actually parses.
- **DoD:** the per-event art is **distinct across all 14** (assert variation, e.g. ≥90%
  pairwise-distinct grids) and **static/deterministic**; the event music **passes the sound
  gate** (calm/volume invariants hold; extend `sound.test.js` or the music gate); the
  **event banner is a prominent home/main-screen element (top-level, not inside a tab or
  menu)** — verify in code that it renders on the home screen container, carries the
  event's art + copy + a play CTA + a live UTC countdown, and **routes into the live event**
  on tap; it renders cleanly at **360px**; **no Arena explanatory UI was added**; `node -c`
  clean; no console errors; contrast AA on the new surfaces; **all gates green**.
  (Babysitter: confirm the banner is genuinely on the home screen — not buried — is
  attractive + actionable, the 14 event marks are distinct, the event theme is calm + in the
  volume envelope, the countdown targets 00:00 **UTC**, and no event-gate UI crept in.)

---

## Phase 6.7 — Visual direction (deep research; promoted from IDEAS I2, 2026-06-21)

> Owner refined the renderer idea: **learn FROM brickmap, don't necessarily use its engine.**
> What's wanted is brickmap's **highly-performant, distinctive visual character** brought into
> Halves — **NOT voxels**. Owner also clarified strategy: **Halves is primarily an Android app;
> web is just a convenient dev/preview surface.** And a guardrail (owner, 2026-06-21): **our
> existing generative art is already a real strength — the procedural icons, hero portraits,
> monsters, region scenery and pixel glyphs must NOT be lost in this review; the new direction
> builds ON them.** This is research only (a doc) — no engine commitment yet.
>
> Aesthetic reference (owner-shared brickmap screenshots): tight **monochromatic per-biome
> palettes** (frost-blue · rust/neon-magenta · magma-amber), heavy **ordered/Bayer dithering**,
> thousands of cheap **particle "splats"**, **atmospheric depth gradients**, chunky geometric
> forms, and an **exposed-tech monospace HUD** — all at ~95–111 fps / ~10 ms. The portrait
> (phone) shots show the look working as a **menu backdrop**: a dithered, particle-rich field
> under a gradient sky. None of this needs voxels.

### T82 — Deep research: bring brickmap's performant visual character into Halves (doc only) · status: DONE
Produce a rigorous research + design doc (e.g. `docs/VISUAL-DIRECTION-RESEARCH.md`) on how to
give Halves a brickmap-grade visual character **without** adopting a voxel engine, with
**Android as the primary target** and web as the dev surface. **Doc only — read code/repos to be
accurate; ZERO code/behaviour change.** Be concrete and honest (name real techniques, libraries,
APIs, perf targets, delivery mechanisms) — a hand-wavy survey is a DoD failure.
- **(1) Aesthetic teardown → transferable techniques.** From the brickmap look (and its repo,
  `00-1/brickmap`), name the **specific, voxel-free techniques** worth adopting and map each to
  Halves surfaces (menu/home backdrop, Arena scenes, battle FX, screen transitions, toasts,
  loading): **ordered/Bayer dithering** post-process; **palette quantisation + per-theme
  monochrome ramps**; **instanced particle "splats"**; **atmospheric gradient/depth fog**;
  banding-as-a-feature; the **exposed-tech mono HUD** (we already lean pixel/mono). For each:
  what it'd look like on a 2D maths game and a rough cost.
- **(2) Build ON our existing generative art — do NOT discard it.** Explicitly inventory what we
  already have as visual character — the procedural **icons** (`collectibles.js`), **hero
  portraits**, **monsters** (`monsters.js`), **region scenery** (`scenery.js`), **pixel glyphs**
  (`glyphs.js`) — and show how the new direction **composes with / elevates** them (e.g. the
  same seeded generators rendered through a dithered, palette-driven, particle-augmented layer)
  rather than replacing them. Losing these is a non-goal.
- **(3) Rendering-stack options for "Android-primary, web-for-dev."** Evaluate at least: (a) DOM
  + a **WebGL2/canvas FX layer** (hybrid — keep DOM for text/input, GPU for atmosphere);
  (b) a full **2D WebGL renderer** (PixiJS or hand-rolled); (c) a **cross-platform engine**
  targeting native Android + web (Rust/wgpu+Bevy like brickmap; Godot web/Android export;
  Flutter+Flame; Unity); (d) **native Android** (Kotlin + GL/Vulkan) with a separate web dev
  build; (e) **PWA/TWA wrap** of the current app + an FX layer. Score each on **perf, aesthetic
  ceiling, effort, risk**, and — critically — impact on our **three crown jewels**: DOM-grade
  **text/input accessibility** (kids' app), the **no-build deploy velocity**, and the
  **JS-logic-in-Node verification model** that the two-agent loop relies on.
- **(4) Android delivery specifics.** For the leading options: how it ships to **Play Store**
  (TWA/Bubblewrap vs engine export vs native), **bundle size**, **cold-start**, min-SDK /
  device reach on **cheap tablets**, availability of **WebGPU/WebGL/Vulkan** across the long
  tail, and **"Designed for Families"/COPPA** implications. Tie back to T72.
- **(5) Performance principles to adopt regardless of stack.** Brickmap's "move less data" —
  instancing/batching, palette compression, static draws, a real **frame budget on mid-range
  Android** — and how we keep the `perf.test.js` gate meaningful for a GPU/particle layer.
- **(6) Keep vs rebuild + how verification adapts.** What's portable (content/logic/calibration,
  the seeded generators) vs what's rewritten (UI layer); an **accessibility plan** for text/input
  if rendering moves off DOM; and how the **two-agent gates** adapt (can logic still gate in
  Node? how do we gate visuals/perf — golden images? frame-time budgets?).
- **(7) Recommendation + phased, reversible plan.** Rank the options; give a **clear pick**; and
  define a **small, reversible first spike** — almost certainly the **hybrid FX layer**: a
  dithered, palette-driven, particle-rich **atmospheric backdrop behind the existing menu**,
  reusing our seeded generators, proven on a **real mid-range Android device**. State explicit
  **success criteria and a kill criterion** for the spike. Plus risks/unknowns + open questions
  for the owner.
- **DoD:** the doc exists and **substantively answers (1)–(7)** — concrete techniques, named
  libraries/APIs/engines, real perf targets and Android-delivery mechanisms, each stack option
  weighed honestly against the three crown jewels, an explicit inventory of our existing
  generative art with a **build-on-not-replace** plan, and a **ranked recommendation + a
  reversible first-spike definition with success/kill criteria.** **Doc only:** no `.js`/CSS/
  HTML behaviour change, every existing gate still green, deploy safe. (Babysitter: verify each
  of (1)–(7) is genuinely addressed — not a listicle — the existing-art guardrail is honoured,
  Android-primary is treated seriously, and the recommendation is concrete + reversible, not a
  fork-in-the-road punt.)

---

## Phase 6.8 — Topic selector: tech-tree view (promoted from IDEAS I3, 2026-06-21)

> Owner: expose our **existing unlock chain as a tech/skill tree** (reminiscent of game unlock
> paths). Key insight — **the graph already exists in data**, so the tree *visualises existing
> truth*, never new mechanics: edges are `unlockedBy` (the importance chain) + `requires:
> "mastery:<id>"` (the Part-1 → Part-2 gate); `isUnlocked()` + per-topic `have/total` + states
> (▶/🔒/✓) are already computed. Owner refinements (with a Mindustry screenshot as inspo):
> **icon-forward nodes** (minimal text on the tree; details in a **selected-node panel**), and
> **promote the guide out of the per-row `?` into a first-class button** alongside Play +
> Practice. Aesthetic is open (not tied to Mindustry); node art coordinates with **T82**.
>
> **Two tasks: T83 (the small guide-button change) → T84 (the tree).** T83 is self-contained and
> ships value immediately; T84 builds the tree in our **current proven idiom** (DOM + our
> procedural canvas icons + the T56 pixel glyphs), **data-driven** and **360px-safe**, with a
> **swappable `nodeIcon()` hook** so richer node art from the T82 direction can drop in later
> without a rewrite. (Sequenced after T82 so the node-art question is informed; reorderable on
> owner's word.)

### T83 — Promote the topic guide to a first-class action (Play · Practice · Guide) · status: DONE
Small, self-contained UX change. Today the "how to approach this" guide is reached via a tiny
**`?`** on each picker row (`.mr-guide` → `openGuide` modal); Start ("Play") and Practice are the
two first-class buttons (`startBtn` + `practiceBtn`, `index.html` ~39–40).
- **Add a third peer button — "Guide"** — next to Start/Practice for the **currently selected
  topic**, opening that topic's guide (`openGuide(mode)`); disabled/hidden when the topic has no
  guide (`window.Guides.has(id)` is false) or is locked, mirroring how `renderStartState()`
  gates Start/Practice.
- **Remove the per-row `?`** (`.mr-guide`) from the picker rows now that the guide is a
  first-class action — OR keep it only if there's a clear reason (Babysitter's call in review);
  default is **remove** for a cleaner row (the selected-topic Guide button replaces it). Don't
  break locked-topic guide previews if the `?` is removed — the Guide button must still open a
  guide for a selected (incl. locked-preview) topic per current behaviour.
- **DoD:** a "Guide" button sits at the **same level as Play/Practice**, opens the selected
  topic's guide, and is gated (no guide / locked → unavailable, consistent with Start/Practice);
  the modal still works (`guideClose`); no orphaned handlers if `.mr-guide` is removed (grep
  clean); 360px-safe; every `$("id")`/listener resolves; `node -c` clean; no console errors; all
  gates green. A Node/DOM check covers the gating (selected topic with/without a guide, locked).
  (Babysitter: confirm the guide is now a peer action, the `?`-removal left no dangling refs, and
  locked-preview guides still open.)

### T84 — Tech-tree view for the topic selector (data-driven, icon-node, 360px-safe) · status: DONE
Render the existing unlock chain as a **visual tech tree** — a new view of data we already
compute, **never a hand-maintained parallel edge list** (it must not drift as Phase-7 topics are
added). Built in the current idiom (DOM + our canvas icons); coordinated with T82 for feel.
- **Graph from data.** Nodes = the modes; edges from each mode's **`unlockedBy`** (chain) and
  **`requires:"mastery:<id>"`** (Part-1 → Part-2 gate). Read unlock state from **`isUnlocked()`**
  and progress from the existing per-topic **`have/total`**; node state ∈ {locked · unlocked/▶ ·
  mastered · 100%/✓}. If a mode field is missing an edge, degrade gracefully (no crash).
- **Icon-forward nodes (minimal text).** Each node is primarily the topic's **icon** via a single
  **`nodeIcon(mode)` indirection** (today: the T56 pixel glyph / our procedural canvas icon — so
  a richer per-topic emblem from T82 can replace it later without touching layout). Node shows
  state (lock/▶/✓) + a compact progress hint; **no long labels on the node**.
- **Selected-node detail panel.** Tapping a node selects it and shows a panel with the **name,
  `have/total` progress, unlock requirement (if locked), and the Play/Practice/Guide actions**
  (reuse T83's actions). Tapping an **unlocked** node's Play starts it; **locked** nodes show the
  requirement, never start (mirror the current picker's locked behaviour).
- **360px phone-first + a11y.** The main design risk: a desktop-sprawl tree won't fit a phone —
  choose a layout that reads narrow (e.g. a vertical trunk with short branches, or zoom/pan).
  **Keep the existing scrollable grouped list as an accessible fallback** — ship the tree as a
  **toggle/alternate view on the picker**, not a hard replacement, so the focusable-list a11y
  path survives. Build tree nodes from **focusable DOM elements** (not an opaque canvas blob).
- **Scales with Wave-2.** After T59–T61 the tree grows to ~23 nodes; because it renders from data
  it must just work — verify it lays out with the current 15 AND tolerates more.
- **DoD:** the tree renders all node states correctly for the current 15 modes from
  `unlockedBy`/`requires`/`isUnlocked`/`have-total` (**no parallel edge list** — grep/inspect
  confirms it reads the live data); icon-forward nodes via a single `nodeIcon()` hook; a
  selected-node detail panel with working Play/Practice/Guide; **locked nodes never start**;
  toggle preserves the **accessible list fallback**; **no layout overflow at 360px**; routing/back
  intact; `node -c` clean; no console errors; all gates green; a Node/DOM test asserts the graph
  is built from the data (edges match `unlockedBy`/`requires`) and that locked nodes aren't
  startable. (Babysitter: verify edges are derived from live data not hardcoded, locked-start is
  impossible, the list fallback remains, and it holds at 360px + with an enlarged topic set.)

---

## Phase 6.9 — Settings + data reset, and progressive onboarding gating (owner, 2026-06-21)

> Two linked owner asks. (1) **A Settings screen with "Clear all data"** behind a *serious*
> confirmation (countdown + numpad-entered code) — a genuine privacy/reset feature **and** the
> tool needed to **reset to first-run to test the onboarding gating**. (2) **Progressive feature
> gating** (promoted from IDEAS I4): everything starts gated and unlocks one-by-one as you
> progress, doubling as a tutorial; on first play you're dropped into ONE easy problem whose
> solve ungates the Inventory; the event banner waits until a few topic runs in; each ungate
> highlights where it's accessed.
>
> **Order: `T85` (settings + clear-data) → `T86` (gating engine + first-run + Inventory gate) →
> `T87` (wire the remaining gates).** Clear-data ships first so the gating can be QA'd by
> resetting to first-run. *(Sequenced after the tech-tree T84; reorderable — say the word to move
> this block ahead of T84.)*
>
> **Cross-cutting guardrails for the whole block (non-negotiable):**
> - **MIGRATION SAFETY.** Existing players must **never be re-gated** — hiding a current player's
>   Inventory/Heroes/etc. would be a serious regression. A pre-existing profile (any collected /
>   completed runs / stats) is treated as **legacy → fully unlocked**. Only a genuinely fresh
>   profile enters onboarding.
> - **Access layer only.** Gating hides/reveals *surfaces*; it must **not** change what's earned,
>   the collection logic, or the **Arena buff-gating invariants** (tiers 1–5 winnable at 0 items,
>   def monotonic, no tier behind own loot).
> - **Never trap the user** — every gate reachable in a short stretch of normal play; calm, no
>   streak-anxiety; highlights fire **once**.
> - **Static/offline/local** — all settings + unlock state in `localStorage` (`halves.*`), no
>   backend.

### T85 — Settings screen + "Clear all data" (serious confirmation) · status: DONE
There is **no settings screen** today (only a sound/mute pref via `applySoundPref`). Add one,
housing a **destructive "Clear all data"** action — a real reset/privacy feature **and** the way
to return to a genuine first-run state to test the T86/T87 onboarding gating.
- **Settings screen**, reachable from the home screen (a small **gear/settings control** on
  `#start`, or a nav button) — 360px-safe, routing/back consistent with the other screens.
- **"Clear all data" / "Reset progress"** wipes **every `halves.*` localStorage key**
  (`halves.collected`, `halves.stats`, `halves.eventBest`, `halves.qbest`, the sound pref, the
  T54 version-dismiss, the T86 unlock-state, …) → the app returns to a **genuine first-run
  state** (so onboarding can be re-tested). Clear by enumerated list **or** `halves.` prefix scan;
  don't leave an app key behind.
- **Serious confirmation (destructive, irreversible).** A blunt warning ("This permanently
  deletes ALL your progress — heroes, items, scores, events. It cannot be undone."), plus
  **deliberate friction**: a **countdown** (Confirm disabled for ~5s) **and** a **numpad-entered
  confirmation code** (reuse the existing numpad — show a code, e.g. a 4-digit number, the user
  must re-enter it). Confirm stays disabled until **both** the countdown has elapsed **and** the
  correct code is entered. **Cancel** is always safe (no wipe). On confirm → wipe → reset to
  first-run (reload or re-init), landing on `#start` (or the T86 first-run intro once it exists).
- Optionally fold the existing **mute toggle** into Settings (Babysitter's call in review).
- **DoD:** a Settings screen reachable from home (360px-safe, routing/back work); the Clear action
  is gated behind warning + countdown + correct numpad code (Confirm impossible until BOTH met —
  verify wrong code and early-press do nothing); confirming **clears every `halves.*` key**
  (verify none survive → genuine first-run) and resets the app; cancel/back leave data intact;
  every `$("id")`/listener resolves; `node -c` clean; no console errors; all gates green; a
  Node/DOM test covers the confirm gating (wrong code / countdown-not-elapsed → no wipe; correct →
  all keys cleared) and that an untouched profile is unharmed by merely opening Settings.
  (Babysitter: confirm the wipe is total + first-run-true, the confirmation can't be fat-fingered,
  and cancel is safe.)

### T91 — BUGFIX: the event banner breaks the home-screen layout (priority) · status: DONE
Owner-reported (screenshot): the T81 event banner is **far too tall** and breaks the `#start`
layout. Three concrete symptoms: **(a)** the home page now **scrolls** (should fit one screen);
**(b)** the topic **picker is starved to ~nothing** (the `picker-wrap`/`picker` is `flex:1 1
auto; min-height:0`, so the oversized banner collapses it); **(c)** the **selected-topic mark**
(`#mark`, the big `×÷`) sits **above** the banner, stranded away from the selector. Live order is
`#mark` → `#tag` → `#eventBanner` (big card: 96×64 art + tag + **2-line blurb** + a large
**`.eb-play`** block + countdown) → `#pickerViews` → `#picker-wrap`.
- **Make the banner a COMPACT strip** while keeping it **prominent + functional** (T81 owner rule:
  front-and-centre, not hidden; must keep the **emblem art + event name + a Play CTA that routes to
  the live event + the UTC countdown**). Concretely: shrink the art, **drop or 1-line-clamp the
  blurb on the home banner** (the full blurb already shows on the event/play screen), make Play a
  **normal inline button** beside the countdown (not a big block), trim padding/margins. Target a
  **bounded banner height** (≈ ≤96px) so it stops dominating.
- **The `#start` screen must fit one viewport (no page scroll)** at representative phone sizes
  (e.g. **360×640** and **390×844**), and the **picker must keep a usable minimum height** showing
  **≥3 topic rows** and scrolling for the rest (give `.picker`/`.picker-wrap` a sensible
  `min-height` so it can't collapse to zero).
- **Fix the stranded mark (symptom c).** Reorder so the selected-topic indicator reads sensibly —
  recommend **move `#eventBanner` to the very top of `#start` (above `#mark`)** so it's
  `event banner → topic mark/tag → toggle → picker` (banner is genuinely first; the mark stays
  adjacent to its selector). Alternatively shrink `#mark` on `#start`. Builder's call within the
  one-screen-fit requirement; Babysitter checks it reads cleanly.
- **Don't regress the Events guarantees.** The banner must still render on `#start`, carry art +
  name + Play CTA → `startEvent`, and the live **00:00 UTC** countdown; owned-today still reads
  "reward earned". Keep `events.test.js`'s banner assertions passing (update them if the DOM
  order/structure changes, but preserve "banner on home · routes · UTC countdown").
- **DoD:** the event banner is a compact strip (bounded height, no 2-line blurb hogging space,
  inline Play); the `#start` screen **fits one screen without scrolling** at 360×640 and 390×844;
  the **picker keeps ≥3 rows of usable height** (can't collapse to nothing); the selected-topic
  mark no longer reads as stranded (banner reordered above the mark, or mark shrunk); the banner
  keeps art + name + Play-routes-to-live-event + UTC countdown (Events gates still green); 360px-
  safe; `node -c` clean; no console errors; **all gates green** (extend a test to assert the
  banner has a bounded height / no home-banner blurb overflow and the picker has a min-height, as
  far as the headless model allows). (Babysitter: verify on the live build that the home screen
  fits one viewport, the topic list shows multiple rows, the banner is compact-but-prominent, and
  the Play CTA + countdown still work.)

### T86 — Onboarding gating I: unlock-state model + first-run intro + Inventory gate + highlight · status: DONE
The onboarding engine + the first gate (promoted from IDEAS I4). Pure, local, migration-safe.
- **Unlock-state model** in `localStorage` (e.g. `halves.unlocked`) with pure helpers
  `isFeatureUnlocked(id)` / `unlockFeature(id)`. **Migration-safe:** a **legacy profile** (has any
  collected / completed runs / stats) is treated as **all-unlocked** — never re-gated. Only a
  genuinely fresh profile (no progress, no unlock record) enters onboarding.
- **First-run flow:** a fresh profile, on launch, is **dropped straight into ONE easy single
  question** — *not* a topic round (a trivially easy problem, e.g. halve a small even number or a
  one-digit add; numeric, non-negative, numpad-safe). **Solving it grants the first reward and
  unlocks the Inventory**, which becomes the **first ungated + highlighted** surface. (The topic
  picker/Halves remains available afterwards per the existing T1 chain; only the *extra features*
  are gated.)
- **Gating mechanism:** establish the pattern for **hiding a nav/surface until unlocked** and
  revealing it after; gate the **Inventory** here as the first feature (the rest land in T87).
- **Highlight-on-ungate:** a one-time **pulse/spotlight** on the newly-available nav control + a
  short **coachmark toast** ("Inventory unlocked — your rewards live here"); reuse the toast
  system, persist "highlight shown" so it **fires once**, calm and non-nagging.
- **DoD:** a fresh profile is dropped into a single easy question (not a full topic; valid/numpad-
  safe), and solving it **unlocks + highlights the Inventory** and grants the first reward; a
  **legacy profile is NEVER re-gated** (all features available — verify in Node with a seeded
  pre-existing profile); unlock-state persists; the highlight fires once; gating hides the feature
  until unlocked then reveals it; **earn/collection logic + Arena invariants untouched** (access
  layer only — re-run `arena.test.js`); `node -c` clean; all gates green; a Node/DOM test proves
  first-run → Inventory-unlock and the legacy-not-re-gated migration. (Babysitter: verify the
  fresh-vs-legacy branch, the single-question intro, the one-time highlight, and zero logic/Arena
  regression.)

### T87 — Onboarding gating II: wire the remaining feature gates + reveals · status: DONE
Hang the rest of the features on the T86 engine, each revealed + highlighted at a **good progress
point**. Draft ladder (owner delegated "add good points"; confirm/adjust in review):
- **Practice** ← first full topic round finished (first `init:`).
- **Heroes** ← first **loot**/**mastery** earned (≈2–3 runs) — you now have a hero/collection to
  care about.
- **Arena** ← a hero owned (tier 1 is already winnable at 0 items, so this gates on having a
  champion to send, not on collection).
- **Event banner** ← **a few topic runs in** (owner's explicit example) — a brand-new player isn't
  met with the daily event before the basics; gating is one added condition in `renderEventBanner()`
  (must not break the live-event/countdown logic).
- **Gold / Momentum** readouts ← first earned.
- Each ungate fires the T86 highlight/coachmark.
- **DoD:** each feature is gated to its milestone and revealed+highlighted on reaching it; a
  brand-new player does **not** see the event banner until the run threshold; **legacy profiles see
  everything** (no re-gate); no gate **traps** the user (each reachable in a short stretch); the
  Events-banner gate doesn't break its live/countdown behaviour; `node -c` clean; all gates green
  (incl. `arena.test.js` — access layer only); a Node/DOM test covers each gate's unlock condition
  + the legacy bypass. (Babysitter: verify each milestone unlocks its feature, the event banner is
  withheld from brand-new players, legacy profiles bypass all gates, and nothing is trapped.)

---

## Phase 6.13 — Home-screen layout overhaul (owner-reported, 2026-06-21)

### T96 — Rework the home (`#start`) layout: top-align, tree-only picker, fix banner button, one-line nav · status: DONE
Owner-reported (screenshot): the home screen wastes a big empty band at the very top, the event
banner's Play/"Again" button "looks really bad" (an oversized amber block), the tech tree is
cramped (~4 nodes visible), and the nav links sprawl over two rows. Rebalance `#start` so the
**tree gets real space** and everything still fits one screen (per T91).
- **Reclaim the top.** Top-align `#start` content (kill the empty band the owner circled) so the
  banner sits **near the top** and the reclaimed height goes to the tree.
- **Move the selected-topic mark DOWN into the topic-info row (de-duplicate).** Today the selected
  topic is shown **twice**: the **big `#mark` glyph + `#tag`** up top *and* the tree's detail panel
  (name + `have/total`) below. Owner: drop the **large top mark/tag** and put the topic **icon
  beside its info** — i.e. consolidate into **one compact selected-topic row** below the tree:
  `[glyph icon] name · have/total · best · gold · momentum` (the empty space the owner circled).
  This frees a big band at the top so the **tree expands upward**. (Keep the glyph via the existing
  `paintGlyph`/`nodeIcon` path; the tag line can fold into the row or be dropped.)
- **Banner button.** Redesign the Play/"Again" CTA — it's far too big/clunky. Make it a tidy,
  proportionate button within the compact strip (keep art + name + countdown + Play→`startEvent`;
  owned → a small "Again"). Keep the bounded-height strip (T91).
- **Tree-only home picker — REMOVE the List/Tree toggle.** Go all-in on the **tech tree** as the
  home selector (owner). Delete `#pickerViews`/`setPickerView` toggling on `#start`; the tree is
  always shown and **takes the freed vertical space** (show clearly more than ~4 nodes). The
  **list-style selector remains available on Best Times** (already tap-to-play), which is the
  accessible alternative — so the a11y path is preserved there; ensure the tree itself stays
  keyboard/focus navigable (its nodes are `<button role=tab>`). Update `tech-tree.test.js` (the
  toggle/list-fallback assertions change — the fallback now lives on Best Times, not a home toggle).
- **One-line nav.** Collapse the two-row link list (Best Times · Inventory · Heroes · Arena · Sound
  · Exit) into a **single row of bigger icon buttons**, **icon-forward with little/no text** (or
  text moved/below) — reusing the procedural pixel icons. Must **degrade gracefully when gating
  hides some** (T86/T87 hide Inventory/Heroes/Arena until unlocked — the row stays balanced/centred
  with fewer items).
- **DoD:** `#start` is top-aligned (no big empty top band); the **big top mark/tag is gone** and
  the selected topic shows as **one compact icon+info row** below the tree (no duplicate display);
  the **tree is the only home picker** (toggle removed) and visibly gets more space (more nodes
  shown, expanding into the reclaimed top); the banner CTA is a tidy proportionate button (still
  art+name+countdown+Play→event); the nav is **one row of bigger icon-buttons** that stays balanced
  as gating hides items; **still fits one screen** at 360×640 &
  390×844 with the picker keeping a usable height; the Best Times list still plays topics (a11y
  alternative); 360px-safe; `node -c` clean; no console errors; **all gates green** (update
  `tech-tree.test.js` for the removed toggle / Best-Times fallback; keep `events.test.js` banner
  guarantees). (Babysitter: verify on the live build that the top band is gone, the tree breathes,
  the banner button looks right, the nav is one tidy row that survives gating, and it fits one
  screen.)

---

## Phase 6.14 — UI direction research (owner-requested, 2026-06-21)

### T97 — Deep research: a "gamey, less web-2.0" UI direction that fits our aesthetic (doc only) · status: DONE
Owner: **not convinced by the current rounded buttons** — wants the UI **more "gamey", less "web
2.0"**, and asked to **research what UI options fit our aesthetic before committing**. Produce a
rigorous design-research doc (e.g. `docs/UI-DIRECTION-RESEARCH.md`). **Doc only — read the code/CSS
to be accurate; ZERO behaviour/style change ships.** Be concrete (name styles, real techniques,
component-by-component treatments, references) — a vague survey is a DoD failure.
- **(1) Honest audit of the current UI.** Characterise the "web 2.0" feel precisely from the live
  CSS: heavy **`border-radius`** everywhere, soft drop-shadows, flat dark-mode "cards", pill/rounded
  buttons (`.btn`, `.btn.alt`, `.pv-btn`, link buttons), rounded panels/modals/numpad keys. Say
  where it reads generic-web-app vs game.
- **(2) What "gamey" means for US — candidate UI languages.** Evaluate options that fit *our*
  specific aesthetic (pixel glyphs/icons, chiptune SFX, RPG metagame, the brickmap-grit FX
  direction, 10–11yo audience): **(a) pixel/8-bit UI** (chunky beveled/`9-slice` borders, hard or
  pixel-stepped corners, dithered edges/shadows — matches our pixel art); **(b) 16-bit JRPG menu**
  (bordered "window" panels, double-line frames, corner ornaments); **(c) exposed-tech / terminal
  HUD** (mono, hairline rules, tabular readouts, telemetry framing — brickmap's language, and we
  already lean mono); **(d) modern "juicy" game UI** (bold, high-contrast, **angular/beveled**, low
  rounding — clean but not pixel). For each: how it maps to our components, and how it harmonises
  with the **existing pixel generators** + the **T82/Phase-6.12 FX grit** (they must read as one
  language).
- **(3) Component-by-component treatments.** Show the range for each: **buttons** (the owner's
  gripe — pill → rounded-rect → **beveled-pixel** → sharp-bordered), **panels/cards**, **modals**,
  the **numpad keys**, **nav**, **toasts**, the **tree nodes** (T84). Concrete CSS/canvas approaches
  for each (e.g. CSS pixel-bevel via box-shadows / hard borders / `image-rendering`; a 9-slice
  border image drawn procedurally; `clip-path` for angular corners). No-build only.
- **(4) Constraints (weigh honestly).** Must stay **legible/readable** (kids — pixel UI can hurt
  text legibility; keep body text clean), **accessible** (visible focus, **≥44px tap targets**,
  contrast **AA**), **no-build** (CSS/canvas, no asset pipeline), **360px-safe**, and **theme-able/
  reversible** (drive via CSS variables so it can be toggled/rolled back). Flag the legibility-vs-
  pixel tension explicitly.
- **(5) Recommendation + phased, reversible restyle plan.** Rank the options; give a **clear pick**
  (or a coherent blend — e.g. "beveled, low-radius buttons + bordered panels + mono HUD, body text
  stays clean"); define a **buttons-first** first step (the owner's specific gripe), then panels →
  modals → numpad → nav → tree nodes; keep it CSS-variable-driven so it's reversible. Note how it
  must **co-design with the FX layer** (Phase 6.12) so UI + atmosphere read as one.
- **DoD:** the doc **substantively answers (1)–(5)** — a real audit, named UI languages with
  concrete per-component CSS/canvas techniques, options weighed against legibility/a11y/no-build/
  360px + consistency with our pixel art and the FX direction, ending in a **ranked recommendation +
  a buttons-first reversible phased plan**. **Doc only:** no CSS/JS/HTML change, all gates green,
  deploy-safe. (Babysitter: verify it's concrete not a listicle, the recommendation is real +
  reversible + harmonises with the FX direction, and the kid-legibility/a11y constraints are
  honoured.)

---

## Phase 6.11 — Event reward tiers (owner-reported, 2026-06-21)

### T92 — Events: tier the reward by performance (participation · did well · did extremely well) · status: DONE
Owner-reported: today **completing** an event grants its reward **regardless of performance** — so
**skipping through most of it still pays out the full reward** (same exploit class as T74's
all-skipped topic unlock). `finishEvent` grants `event:<id>` on completion with no score check.
Keep an easy **participation** reward, but add **two more performance-gated tiers**.
- **Three reward tiers per event (each a real buff / collection member):**
  1. **Participation** — **keep the existing `event:<id>`** id (migration-safe) for **completing**
     the live event (owner: this low bar is fine — "a participation reward like that").
  2. **Did well** (NEW, e.g. `event:<id>:well`) — gated on a genuine performance threshold.
  3. **Did extremely well** (NEW, e.g. `event:<id>:ace`) — gated on a high threshold.
- **Skip-proof metric.** Gate the two new tiers on **clean-score fraction `score/total`** where
  `score = times.filter(miss===0).length` (clean first-try answers) and `total = order.length` —
  **skips never enter `times`** (T74), so skipping *lowers* the fraction and **cannot** reach the
  higher tiers. Suggested thresholds (Babysitter's call; owner may tune): **well ≥ ~0.7**,
  **extremely well = flawless / `score===total`** (optionally + a speed bracket). Reuse the
  existing rank machinery (`C.rankIndex`) if cleaner.
- **Progressive rarity + real buffs.** participation ≈ rare/epic, well ≈ epic, extremely well ≈
  **legendary** — all **full collection members** carrying hero buffs that **feed Arena power**
  (consistent with the owner's "event buffs are full collection members" decision). So each event
  now contributes **3** collectibles (14×3 = 42).
- **Grant logic.** In `finishEvent`, evaluate performance and grant **every tier earned this run**,
  **only while live**, **idempotent per tier** (own-once). **Improving on a replay (still live) or
  on the 14-day recurrence earns the higher tiers** you hadn't reached — never downgrades/removes.
  Participation is still granted on completion.
- **Surfacing.** The Events inventory tab shows the **3 tiers per event** (owned/locked); the
  home banner / results can hint which tiers you earned.
- **Arena.** The 28 new reward collectibles join the collection the Arena reads → **re-prove the
  buff-gating invariants on the grown pool** (`arena.test.js`): tiers 1–5 winnable at 0 items, def
  monotonic, no tier behind own loot, top ⇔ near-full (now including the hardest event rewards).
  *(This is why T92 is sequenced BEFORE the Arena 3v3 re-calibration in T88 — so T88 calibrates
  against the full event-reward set.)*
- **DoD:** three reward tiers per event; **participation = complete** (low bar, kept id);
  **well/extremely-well gated on `score/total`** (skip-proof — a Node test proves a **skip-through
  earns ONLY participation**, a **good run adds `well`**, a **flawless run adds `ace`**); grants
  are **live-only + idempotent per tier**; improving on replay/recurrence earns higher tiers
  without removing earned ones; the Events tab shows 3/event; the new items are real buffs;
  **Arena invariants re-proved on the grown pool**; `node -c` clean; all gates green (`events.test.js`
  + `arena.test.js` extended). (Babysitter: verify skip-through → participation only, the two
  thresholds, per-tier idempotency, recurrence upgrades, and zero Arena-invariant regression.)

---

## Phase 6.15 — Front-end polish: audio, wasted top space, gamey UI (owner-reported, 2026-06-21)

> All **[A]** (Builder A; existing files). Prioritised ahead of the Arena 3v3 — these are live
> annoyances the owner just flagged. Order: **`T98` (audio) → `T99` (reclaim top space + nav) →
> `T100` (gamey UI restyle)**.

### T98 — [A] BUGFIX: audio is far too quiet (raise the volume) · status: OPEN
Owner: "the audio is insanely low, barely audible." Live levels (`sound.js`): **`VOL = 0.30`**
master, SFX voices peak ~`0.16`, `musicGain 0.09` — the master is the bottleneck (≈0.048 effective
per SFX voice). **Raise it to clearly audible.**
- Raise master **`VOL`** substantially (e.g. **~0.8**) and re-balance SFX/music so the game is
  comfortably loud, **without clipping** — the worst-case simultaneous-voice sum at the master
  input must stay **≤ 1.0** (the T69/T33 headroom math: bump VOL, and trim per-voice gains only if
  the worst-case sum would exceed 1.0). Mute/unmute still works.
- **DoD:** the game is clearly audible (master raised, e.g. ~0.8); **no clipping** (worst-case
  voice sum × VOL ≤ 1.0 — prove it in the sound gate); mute/unmute restores the new VOL;
  `sound.test.js` updated for the new VOL + the no-clip bound; `node -c` clean; all gates green.
  (Babysitter: recompute the worst-case voice sum × VOL ≤ 1.0 and confirm the new VOL is much
  higher than 0.30.)

### T99 — [A] Reclaim the wasted top space on ALL screens + tidy the home nav · status: OPEN
Owner (screenshot): **every screen wastes a band at the top.** Cause: `.app{height:100dvh;
max-height:780px}` — on a tall phone (Poco-X3 floor) the app is **capped at 780px** and the
leftover (+ `env(safe-area-inset-top)`) becomes a dead band at the top of every `position:absolute;
inset:0` screen. Reclaim it; pin the event banner to the very top of `#start`; tidy the nav.
- **Reclaim top space globally.** Let `.app` use the **full viewport height on phones** so screens
  start at the very top (e.g. raise/drop the `max-height:780px` cap for phone widths, or top-align
  the app so any leftover falls to the bottom, not the top). Account for `env(safe-area-inset-top)`.
  All screens (esp. `#start`'s tree and the event banner) gain the reclaimed height.
- **Pin the event banner to the top** of `#start` (in the band the owner circled) — flush to the
  top, no gap above it.
- **Tidy the home nav (`#navRow`).** Today Best/Items/Heroes/Arena have icon+label but **Sound
  (🔊) and Settings (⚙) are icon-only (look weird)** and the **fullscreen "Exit" button sits on its
  own wrapped row.** Make the row **consistent**: give Sound + Settings the same **icon+label**
  treatment, and bring **fullscreen inline** with the rest (one coherent set; tidy wrap into ≤2
  balanced rows is fine — the reclaimed top space more than pays for it). Keep gating-hide working.
- **DoD:** no dead band at the top of **any** screen (verify `#start`, `#game`, `#inventory`, etc.
  start at the top); the event banner is **pinned to the top** of `#start`; the **tree visibly
  expands** into the reclaimed space; the nav is **consistent** (Sound/Settings labelled like the
  rest, fullscreen inline, no orphan row) and still **degrades under gating**; fits the Poco-X3
  viewport without a wasted band; 360px-safe; `node -c` clean; all gates green (keep the
  `events.test.js` banner + `tech-tree` checks). (Babysitter: verify on the live build that the top
  band is gone across screens, the banner is pinned top, the tree breathes, and the nav is tidy.)

### T104 — [A] Fix unreadable fraction glyphs (½, ¾) in the pixel font · status: OPEN
Owner (screenshot): the **fraction topic icons are hard to read** — esp. **`¾`** (the Fractions
node) which reads as a pixel blob, and the **`½`** in **`½n`** (Fractions of). Cause: the T56
`glyphs.js` **stacked vulgar-fraction** tokens (`f12`/`f34` → 3×4 SMALL numerator · bar ·
denominator) are illegible at the tree-node size (~22px). The operator glyphs and the **slashed
`a/b`** (Fractions of II) read fine — it's specifically the **stacked** fractions.
- **Make the fraction glyphs legible at small sizes.** Prefer the approach that already works — a
  **slashed/diagonal fraction** (like `a/b`): e.g. render `½` as a small `1⁄2` and `¾` as `3⁄4`
  using the legible BIG digits + the slash, **or** redesign the stacked form to be clearly readable
  (taller, more separation, a clear bar). Whatever reads cleanly. Keep the **amber-accent** on the
  fraction (the operator role) consistent with today.
- **Check every size the glyph appears at:** the **tree node** (~22px, the worst case), the
  **`#topicInfo` row**, the **start mark / guide / practice title**, and the **toast**. It must be
  unambiguously readable as the right fraction at all of them.
- **Scope:** `glyphs.js` (+ the `TOPIC_GLYPHS` tokens in `modes.js` if the representation changes,
  e.g. `½n` → a slashed half + `n`). Keep the favicon/marks working.
- **DoD:** the `¾` (Fractions) and `½n` (Fractions of) marks are **clearly readable** at the
  tree-node size (and the other sizes); the chosen representation is legible + consistent (amber
  accent kept); `glyphs.test.js` still passes (font covers every symbol; if tokens change, update
  it) + a check that the fraction glyphs render distinctly; `node -c` clean; no console errors; all
  gates green. (Babysitter: eyeball/compare the fraction marks at node size — they must read as the
  right fraction, not a blob — and confirm the favicon/other marks are unaffected.)

### T100 — [A] Gamey UI restyle, buttons-first (pixel-bevel, reversible) · status: OPEN
Owner: "go with your leans." Implement **T97's recommendation** (`docs/UI-DIRECTION-RESEARCH.md`):
a **gamey, less-web-2.0** look — **pixel-bevel low-radius buttons + squared panels/cards, body text
kept clean**, all **reversible via `data-ui` CSS tokens**. (JRPG window-framing on big RPG screens
is deferred to a later step.)
- **Token system + switch.** Add `:root` UI tokens (`--ui-radius`, `--ui-border`, `--ui-bevel-hi/
  -lo`, `--focus`) with a `:root[data-ui="pixel"]` override; `data-ui="classic"` = today. One
  attribute flip reverts the whole restyle.
- **Buttons-first (the owner's gripe).** Restyle `.btn`/`.btn.alt`/`.btn.ghost`/`.navbtn`/`.eb-play`/
  `.key`: **low/zero radius**, **bevel** (`inset` light-top-left + dark-bottom-right; **invert on
  `:active`** for a real press), a **visible 2px amber focus ring** (`:focus-visible`), keep the
  amber-primary / outlined-secondary distinction.
- **Panels/cards** (`.inv-cat`/`.hero-card`/`.sum-row`/`.topic-info`/`.event-banner`/`.tnode`):
  radius → token (0–3), **hard 1–2px frame instead of the blur drop-shadow**, keep the dark fill.
- **Clean text rule (owner-confirmed).** **No pixel font for labels/numbers** — keep `--display`/
  `--mono` for all text; the bitmap `Glyphs` font stays **decorative marks only**.
- **No-build + a11y.** CSS (+ the procedural canvas we already use) only; **keep `contrast.test.js`
  AA**, **≥44px** tap targets, **visible focus**, and never state-by-colour-only (keep ✓/🔒/▶ badges).
- **DoD:** a `data-ui` token system where **`"classic"` = today and `"pixel"` = the new look**, one
  flip reverts everything; buttons + panels read **gamey/low-radius/beveled** with a **real press
  state + a visible focus ring**; **body text stays clean** (no pixel-font labels/numbers); **AA
  contrast holds** (gate green), ≥44px targets, 360px-safe; `node -c` clean; no console errors; all
  gates green (add a small test asserting the `data-ui` tokens exist + classic-vs-pixel differs, as
  far as headless allows). (Babysitter: confirm it reads "game not web-app", the focus ring +
  contrast + tap targets survive, body text is unaffected, and `data-ui="classic"` restores today.)

---

## Phase 6.16 — Shipping & perf: Android parity + perf pass + the start delay (owner, 2026-06-21)

> Owner intent: **launch ASAP** (after working through the queue), get an **installable Android
> build soon to confirm web↔Android parity**, a **deep perf pass now including Android**, and the
> **start→fullscreen delay** removed-or-masked. All **[A]**. Prioritised **ahead of the Arena
> 3v3** (these are shipping/quality; the Arena is a feature). Order: `T101` (delay) → `T102`
> (Android build) → `T103` (perf research).

### T101 — [A] Remove (or mask with a loader) the delay after Start + fullscreen · status: OPEN
Owner: "a bit of a delay after hitting Start with fullscreen — nice to not have that, or at least
show loading." Diagnose the `Start → fsEnter() → round` path and either **eliminate the blocking
work** or **show a brief loading state** so it never feels janky.
- **Diagnose** what blocks between the tap and the first question: the **fullscreen request +
  reflow**, the **AudioContext resume/unlock**, `mode.build()` + first render, font/canvas layout,
  etc. (the entry flow runs `audioUnlock()`/`applySoundPref()`/`fsEnter()` then `start()`).
- **Fix:** make the transition feel instant — e.g. **enter the round first, do fullscreen/audio
  async** so they don't block first paint; pre-warm `mode.build()` / the first question; defer
  non-critical work to after first paint. **If a delay is unavoidable, show a brief loading
  indicator** (a calm "Loading…" / spinner overlay) so it reads intentional, never frozen.
- **DoD:** tapping Start no longer feels janky — either no perceptible delay before the first
  question, **or** a clear loading state covers it; fullscreen + audio still work (gesture
  requirements respected — fullscreen/audio must still be triggered by the user tap, not lost);
  no regression to the round/clock; `node -c` clean; all gates green; a Node/DOM check that the
  start path doesn't block on fullscreen/audio (or shows the loader). (Babysitter: confirm the
  user-gesture requirements still hold, the round starts correctly, and the delay is gone/masked.)

### T102 — [A] Installable Android build: PWA + TWA foundation (parity) · status: OPEN
Pulled forward from `T72` so we get a **real installable Android app soon** to confirm web↔Android
**parity** on the Poco-X3 floor. (T72's *Play-Store-submission* research/prep stays later.)
- **PWA core:** a `manifest.webmanifest` (name, **maskable icons** from our procedural mark,
  `display:standalone`, theme/background colour — `installFavicon()` + `theme-color` already seed
  this), a **service worker** (offline cache of the static assets — must coexist with the T54
  version-check/`build.json` poll without breaking updates), and the `<link rel=manifest>`/SW
  registration.
- **TWA scaffold:** a **Trusted Web Activity** wrapper (Bubblewrap-generated Android project →
  signed AAB) + **`/.well-known/assetlinks.json`** for the site↔app association. Keep it **no-build
  for the web** (the TWA just wraps the static site). Document the build/run steps so the owner can
  produce an APK/AAB and side-load onto the Poco X3.
- **Parity:** the goal is to **confirm the same build runs identically** in the browser and the
  Android TWA — note any divergence (fullscreen, audio-unlock, safe-area, WebGL/WebGPU availability)
  for follow-up.
- **DoD:** a valid `manifest.webmanifest` + maskable icons + a working **service worker** (offline
  load; doesn't break the T54 update flow); the site is installable as a PWA; a **TWA project +
  assetlinks** with documented steps to produce a side-loadable AAB/APK; the web stays **no-build**;
  `node -c` clean; all gates green (+ a check that the manifest/SW/registration are present + valid).
  (Babysitter: verify the manifest is valid, the SW caches + still honours the version check, the
  TWA/assetlinks steps are real, and nothing about the web build regressed. **Owner** confirms it
  installs + runs at parity on the Poco X3.)

### T103 — [A] Deep perf research, now including Android (doc only) · status: OPEN
A second perf deep-dive (after the early `perf.test.js` work) **including the Poco-X3 Android
target** and the incoming FX layer. **Doc only** (read code; produce `docs/PERF-RESEARCH-2.md`);
zero behaviour change.
- **Cover:** cold-load + first-paint cost; the **Start→fullscreen delay** root cause (cross-ref
  T101); the **FX-layer frame budget** on Adreno-618 (WebGPU vs WebGL2 vs CPU-still paths,
  particle caps, the degrade ladder); RAF/listener/leak audit across screens; canvas/redraw cost
  (the procedural generators, the tree, toasts); memory; the TWA/WebView differences vs Chrome;
  what `perf.test.js` can and can't catch and how to extend it.
- **Deliver:** concrete findings + a prioritised fix list + an **on-device measurement plan** the
  owner runs on the Poco X3 (since the Builder can't measure real hardware) + targets (stable 60fps;
  acceptable cold start).
- **DoD:** the doc substantively covers the above with **concrete** findings/targets/measurement
  steps (not a listicle), names the real hot paths from the live code, and ties to T101 (delay) +
  the FX budget; **doc only**, all gates green. (Babysitter: verify it's concrete, Android-aware,
  and gives an actionable on-device plan + prioritised fixes.)

---

## Phase 6.10 — Arena 3v3: party battles (promoted from IDEAS I5, 2026-06-21)

> Owner: deepen the Arena — pick **1–3 heroes** vs a **3-foe team** (the tier foe + 2 weaker
> lower-tier "adds"), resolved by a **deterministic auto-resolve** turn-attrition sim. Decisions
> LOCKED: **deterministic, zero-RNG**; **variable team size 1–3** (owner: "still possible to send
> less than 3 heroes, e.g. early game" — allow 1–3, **don't gate** the mode on owning 3). The
> owner **delegated the calibration** to the Babysitter; the full design lives in **IDEAS I5** and
> is the spec for T88.
>
> **Non-negotiable guardrails (the calibrated-Arena guarantee must survive):**
> - **Deterministic / no RNG** — same inputs → same outcome (so it gates in Node like today's
>   `statBattle`). Any randomness must be seeded.
> - **Every invariant re-proved over the SIM**, across team sizes **and** the loadout lattice:
>   **tiers 1–5 winnable with a SINGLE starter hero at 0 items** (the binding early floor — a new
>   player owns one hero); **curve monotonic**; **no tier behind its own loot**; **top region
>   beatable only near-max** (tier 120 ⇔ near-full, one champion boost flips it).
> - **Monotone in loadout AND team size** — more buffs / more heroes never worsens the result;
>   damp any anti-monotone mechanic (speed turn-order swing, overkill).
> - **Migration-safe** — existing `tier:N` progress carries over; 1-hero is the special case of
>   the same sim.
>
> **Three tasks: `T88` (battle model + calibration + proofs — the crux) → `T89` (team-selection
> UI) → `T90` (watchable playout).**

### T88 — Arena 3v3: deterministic battle model + enemy teams + re-calibration + invariant proofs · status: OPEN
**The crux.** Generalise the single-hero `statBattle` (T47) to a **deterministic 1–3 vs 3
auto-resolve** sim, re-derive the difficulty curve, and **re-prove every invariant by simulation**.
Full design = **IDEAS I5 "Calibration design"**; this task implements it.
- **Battle sim (zero RNG).** Combatants `{atk, hp, spd, type}`; turn order by `spd` (fixed index
  tie-break); on a turn the actor picks a target by a **fixed rule** (best type-matchup; tie →
  lowest current `hp`; tie → index) and deals `damage = max(1, round(atk × matchup − mitigation))`;
  remove at `hp ≤ 0`; loop until one side is wiped; **win = ≥1 hero alive**. Same inputs → same
  result.
- **Teams.** Player: **1–3 heroes** (owner: allow fewer — early game; **do not gate** on owning 3).
  Enemy: **always 3** = the tier foe (scales on the existing curve) **+ 2 adds at `tier−k`** (define
  `k`; weaker; **floor at tier 1** so low-tier adds are near-trivial). Hero `atk/hp/spd` are
  **monotone-increasing in the collected loadout** (extends today's buff→`rating`).
- **Re-calibration (preserve the guarantee).** Tune the enemy-team curve so the **sim** yields:
  **tiers 1–5 winnable with a SINGLE starter hero at 0 items**; **curve strictly monotonic**; **no
  tier gated behind its own loot**; **top region near-max-only** with **tier 120 ⇔ near-full** and
  **removing any one champion boost flips it**. The sim must be **monotone in loadout AND team
  size** — damp any anti-monotone mechanic (cap `spd`'s turn-order swing; keep damage smooth;
  avoid overkill flips).
- **Migration.** Existing `tier:N` wins carry over; the 1-hero path is the 1v1 special case (note
  any intentional difference from today's `statBattle` outcomes).
- **Proofs.** Extend `arena.test.js` to **simulate every tier across {team size 1/2/3} × {loadout
  lattice: 0 · partial · near-full · full · full-minus-one-champion-boost}** and assert all four
  invariants **+ monotonicity in loadout and team size**. The **sim is the source of truth**; if a
  non-monotone/off-curve outcome appears, **fix the mechanic, not the test.**
- **DoD:** deterministic sim (no RNG; same inputs → same result); player team 1–3, enemy = foe + 2
  `tier−k` adds; **tiers 1–5 winnable by a single starter hero at 0 items**; curve monotonic; no
  tier behind own loot; top near-max-only with the one-boost flip; **monotone in loadout + team
  size**, all proven by the lattice simulation; migration-safe; battle answers/stats numeric +
  sane; `node -c` clean; every `$("id")` resolves; all gates green (extended `arena.test.js`).
  (Babysitter: re-run the FULL invariant sweep across team sizes × loadout lattice, verify
  monotonicity, the single-starter-hero floor, the tier-120 one-boost flip, and migration.)

### T89 — Arena 3v3: team-selection UI (1–3 heroes) + enemy-team display · status: OPEN
Let the player assemble the party and see what they're up against. Built on T88's sim.
- Select **1–3 heroes** from **owned** heroes for a tier attempt (can send fewer — down to 1);
  **can't pick locked/unowned**; show the **3-foe enemy team** with their **type matchups** vs the
  chosen party; "Fight" runs the T88 sim. Gracefully handle owning <3 heroes.
- Preserve existing Arena flow (tier gating via `canAttempt`, the wayfinding/region UI, T65
  scroll-to-top after a fight). 360px-safe.
- **DoD:** select 1–3 owned heroes (not more than owned/3, locked excluded); enemy team of 3 shown
  with matchups; "Fight" resolves via the T88 sim and records the result/tier progress as today;
  routing/back intact; 360px-safe; `node -c` clean; all gates green; a Node/DOM test covers the
  selection rules (1–3 allowed, can't exceed owned or 3, locked excluded) and that a fight routes
  through `statBattle`-team. (Babysitter: verify 1-hero and 3-hero attempts both work, locked/
  unowned can't be fielded, and tier progress still records.)

### T90 — Arena 3v3: watchable deterministic turn playout + result · status: OPEN
Make the fight *readable* — show the deterministic sim resolving, calmly.
- Render the sim **turn by turn** (who strikes whom, HP draining, KOs) then the result — a **calm,
  watchable** playout (consistent with the no-anxiety design), not a wall of numbers. Reuse/extend
  `fx.js` where cheap; **no new RNG** (it only visualises the T88 sim, which is the source of
  truth). Keep T65 scroll-to-top after the fight.
- **DoD:** the playout deterministically visualises the T88 sim's turns and its result **matches**
  the sim; calm + skippable/quick; **no RAF leak** (perf gate holds — single loop, cancels on
  leave); 360px-safe; `node -c` clean; no console errors; all gates green; a Node check confirms
  the playout's resolved outcome equals `statBattle`-team for sampled tiers/teams. (Babysitter:
  confirm the shown result always equals the sim, the loop cleans up, and it stays calm/legible.)

---

## Phase 6.12 — Visual character: the FX layer (brickmap-borrowed, ALWAYS semantic) — owner mandate 2026-06-21

> Owner: **"don't be too tentative — put it in everywhere we can think of, whatever is actually a
> good idea. Borrow from brickmap (it's *provably* highly performant on web + Android on midrange
> devices — 120fps). Where it sits in the queue is your call; you drive it."** So this is the
> Babysitter-driven rollout of the T82 hybrid FX layer — **bolder than a single menu spike**.
>
> **Non-negotiable guardrails (carry into EVERY task's DoD):**
> - **ALWAYS SEMANTIC — never a passive screensaver.** Every effect must **name the purpose it
>   serves** (sense of place / status / celebration). "Looks cool" alone is a DoD failure. Stays
>   true even as we render more (owner: "visuals should remain semantic even as we move away from
>   markup").
> - **Keep the DOM UI crisp + readable + the pixel icons.** Text, numpad, menus stay DOM; the FX is
>   an **additive, `aria-hidden`, `pointer-events:none`** layer behind/around them (a11y untouched).
> - **Perf floor = a midrange smartphone (Poco X3 NFC · Snapdragon 732G · Adreno 618).** Budget for
>   **stable 60fps** on that class (brickmap shows 120fps headroom); **WebGL2 baseline**, WebGPU
>   only as progressive enhancement; resolution + particle **degrade ladder**; honour
>   `prefers-reduced-motion`.
> - **Borrow from brickmap (`00-1/brickmap`) — RECIPES, not the engine (Babysitter decision,
>   2026-06-21).** Recon confirms brickmap is **Rust + wgpu / WGSL → WASM** (FX in its `bm-render`
>   crate). **PORT its techniques** (Bayer dither, palette-ramp LUT, instanced particles) into our
>   **own no-build JS WebGL2/WebGPU layer** — do **NOT** bolt brickmap's Rust/WASM renderer into
>   Halves (that reintroduces a build step + breaks Node-verification + risks a11y — the wins we
>   chose to keep). **Access:** the Builder needs **read** scope on `00-1/brickmap` to read its WGSL
>   (owner adding it); T93 resolves this first. Because brickmap is *provably* 120fps on a midrange
>   Poco-X3-class device via **WebGPU**, WebGPU is viable on our floor → **WebGPU-first with a
>   WebGL2 fallback** is acceptable (not WebGL2-only). *(Reserve option, NOT now: a third agent /
>   direct brickmap-engine work — only if we later decide deeper reuse beats porting, accepting a
>   build step; decide on evidence after reading brickmap.)*
> - **Verification stays Node-friendly** (T82 §6): pure-function tests (dither/palette/particle-seed
>   math), budget invariants (single RAF, capped buffers, idle-when-hidden, reduced-motion), and a
>   **WebGL stub** (assert one instanced draw, textures uploaded once) — like `sound.test.js` stubs
>   AudioContext. Keep `perf.test.js` meaningful.
> - **Reversible.** The layer is additive and deletable; ship behind a capability/feature check so
>   a device without WebGL2 falls back to today's static look.
>
> **Tasks (Babysitter sequencing — after the Arena 3v3 so it dresses a finished Arena): `T93`
> (foundation + Arena biome ambience) → `T94` (celebration FX) → `T95` (semantic home backdrop).**
> More surfaces ("everywhere it's a good idea": screen transitions, in-round topic atmosphere,
> tech-tree path glow) come as follow-ups once the foundation proves out on a real Poco-X3-class
> device.

### T93 — [B] FX engine `fxgl.js` (standalone, brickmap-borrowed, headless-tested) · status: DONE
**Builder B; NEW files only — does NOT edit any existing Halves file** (wiring it into the Arena is
a later **[A]** task). **First: resolve brickmap access** (read `00-1/brickmap`'s `bm-render` WGSL)
and record what was borrowed in `docs/agent/BUILDER-LOG-FX.md`.
- **`fxgl.js` / `window.FXGL`** — a **self-contained** WebGL2/WebGPU module (inline GLSL/WGSL
  strings; **no bundler, no new deps**) exposing a clean API the game can later mount on a canvas:
  e.g. `FXGL.mount(canvas, opts)`, `FXGL.setScene({ palette, grid, particles, seed })`,
  `FXGL.start()/stop()`. Techniques **borrowed/ported from brickmap**: **ordered/Bayer dithering**,
  **palette quantisation to a per-theme ramp**, **atmospheric gradient/fog**, **instanced particle
  splats**. Static texture uploads; animate in-shader. **WebGPU-first with a WebGL2 fallback**
  (brickmap proves WebGPU on the Poco-X3 floor); **no-GPU → a static dithered still**.
- **Purpose hook (proven standalone).** The engine must accept a **scenery-style theme**
  (palette + silhouette grid + accent particles, the shape `scenery.js` emits) and render it as a
  biome scene — so the [A] wiring task can later feed it the live Arena region. Ship a **headless
  proof** (the FX math + a stub-GL render) — NOT a live Arena mount (that's [A]).
- **Perf + budget.** Target **60fps on Adreno-618-class** with a resolution/particle **degrade
  ladder**; single RAF (caller controls start/stop); capped particle buffer; honour
  `prefers-reduced-motion` (static still).
- **DoD:** `fxgl.js` is standalone (new file; **zero edits to existing Halves files**; no bundler/
  deps); a clean documented `window.FXGL` API; renders a `scenery.js`-shaped theme as a dithered,
  palette-quantised, particle scene (purpose: **place** — provable on a stub/offscreen canvas);
  WebGPU+WebGL2 paths + reduced-motion/no-GPU fallbacks; **NEW `test/fxgl.test.js`** (pure dither/
  palette/particle-seed math · budget invariants: single loop, capped buffer, idle when stopped · a
  WebGL/WebGPU **stub** asserting one instanced draw + one-time texture upload) **passes via
  `node test/fxgl.test.js`**; brickmap borrowing recorded in `BUILDER-LOG-FX.md`; `node -c` clean;
  **does not touch `pages.yml`** (gate registration is the [A] wiring task). (Babysitter: confirm
  zero edits to A's files, the API is clean + mountable, the engine renders a real scenery theme
  not noise, fallbacks exist, and the headless tests are substantive.)

> **Follow-up [A] wiring tasks (Builder A, after T93 + the surface exists):** *T93w* mount `FXGL`
> on the **Arena** backdrop (feed the live region's `scenery.js` theme → biome sense-of-place; add
> the `<script src>` + the CI gate; `aria-hidden`/`pointer-events:none`; idle off-screen). The
> engine sides of **T94** (celebration) / **T95** (home backdrop) are likewise [B] (FX logic) →
> [A] (mount on the win/gain hooks + home). Babysitter specs each [A] wiring task when ready.

### T94 — Celebration FX: wins + collectible/loot/event gains · status: OPEN
**Purpose = amplify reward.** Heightened, *brief* particle/flourish moments so earning *feels* like
something — on **Arena wins** (the T90 playout's victory) and on **earning a collectible / loot /
event reward** (inventory gains). Builds on the T93 layer (GPU particles) and/or extends `fx.js`.
> **Two-builder split:** **T94 [B] (NEXT for Builder B):** add a **celebration-burst capability** to
> `fxgl.js` (a brief, capped, seeded particle-burst mode — new API on the B-owned engine; NEW-file-
> only, no edits to existing Halves files; headless test). **T94w [A]:** wire that burst onto the
> real win/collectible-gain hooks (`main.js`) once T93 is mounted. Babysitter specs T94w when ready.
- Fire on the existing win/unlock moments (don't invent new ones); reduced-motion → a calm
  reduced flourish; never obscures the question/result text; respects the toast system.
- **DoD:** a distinct celebratory burst on Arena wins AND on collectible/loot/event-reward gains
  (the effect **names its purpose: celebration**); reduced-motion safe; perf budget holds (capped,
  single loop, idle when done); doesn't cover key text (T64 spirit); 360px-safe; `node -c` clean;
  all gates green (+ a Node check that the burst fires on the win/gain hooks and is capped).
  (Babysitter: confirm it triggers on real win/gain events, stays within budget, and never blocks
  readability.)

### T95 — Semantic home/menu backdrop · status: OPEN
**Purpose = ambient status.** A living home backdrop that **reflects real state** — e.g. **today's
event theme** (palette/emblem seed) and/or **momentum/progress** — rendered through the T93 layer
(dither + palette + gentle motes). **Not generic noise.** Stays behind the (now compact, T91) home
UI; never competes with text or the topic picker.
- **DoD:** the home backdrop is **driven by live state** (today's event / progress — verify it
  reads the real source; the effect **names its purpose: status**); behind the DOM UI, legible,
  360px-safe, reduced-motion + no-WebGL2 fallbacks; perf budget holds (idle when off-home); `node
  -c` clean; all gates green. (Babysitter: confirm it encodes real state, not decoration, and the
  home screen stays readable + one-screen per T91.)

---

### T57 — Scrub the specific school/town/county references from the docs · status: DONE
Owner: remove the named-school and place references from the codebase, keeping only the
generic "11+" and the exam board. Babysitter sweep: the only occurrences are in
**`docs/research-11plus.md`** — the **parenthetical at lines ~4–5** (two named grammar
schools + a town/county) and the **first "Exam context" bullet (~line 17)** (the same two
named schools). No user-facing/code references exist. (NB: this spec deliberately does
**not** spell the names out — see the verification note below.)
- **Remove** the two named grammar schools and the town/county name wherever they appear
  in that doc; replace with neutral phrasing such as "UK 11+ grammar-school prep".
- **Keep** the generic context: **"11+"** and the **exam board ("GL Assessment")** —
  including the line that the relevant 11+ maths paper uses GL Assessment (≈50 q/50 min,
  no calculator). The "switched from CEM in 2023" provenance may stay (exam-board
  context, not a place) or be trimmed — Builder's call — but it must not reattach to a
  named school.
- **Scope:** doc-only edit; **no code/UX change**. Don't alter the design content,
  calibrations, or topic specs — only the identifying school/place names.
- **DoD:** after the edit, grep the **whole repo** (working tree) for the removed
  school/town/county identifiers → **zero** matches **in every tracked file, including
  `docs/agent/*`** (do not reintroduce the names into BACKLOG/REVIEW — refer to them
  obliquely, as this task does); "11+" and "GL Assessment" remain; the doc still reads
  coherently (no dangling "both"/broken sentences); no other file changed; deploy green.
  (Babysitter re-greps the repo and confirms the exam-board/11+ context survived. Note:
  earlier commit *messages* in history may still contain the names — see REVIEW for the
  history-rewrite decision; this task only cleans the working tree.)

---

## Phase 7 — Content extension (new topics + the playbook for adding them)

> Owner intent: add more topics over time, but **add genuinely new content** (new
> procedural art, new names, new guides) rather than diluting what exists. The
> inventory grows → the Arena auto-scales (see below) → we must keep the invariants
> intact. T58 documents the process; T59–T61 add the Wave-2 topics following it. **All
> of Phase 7 comes AFTER T50/T52–T56** (the current improvements).

### T58 — Content-extension playbook (`docs/CONTENT-EXTENSION.md`) · status: OPEN
Write the canonical doc for **how to extend the game with new topics/content** without
breaking the coupled systems, and how to do it with **new content, not dilution**. Doc
only (plus reading the code to be accurate); no behaviour change.
- **The coupling map (explain, accurate to the code).** A new topic adds collectibles
  (`init` · `mastery` · `flawless` · `4×speed` · per-question `Solved`+`Spark`, ≈ 7+2N
  for N questions). Collectibles carry **boosts** (hero+stat) → raise **hero ratings** →
  the **Arena def calibration** (forward pass in `enemies.js`, ~123–171) recomputes at
  load: per-tier caps = `bestAdvRating(type, owned)×ADV_MULT`, suffix-min envelope, and
  the **final boss def = `round(bestRating(all drill + loot 1..99) × ADV_MULT)`**.
- **What auto-scales (NO manual change):** the Arena **difficulty** — because the
  calibration is dynamic, adding drill items with boosts raises the ceiling and the
  boss def automatically, so "tier 100 ⇔ near-full collection" keeps holding; the
  **Collector ladder** (to 10k, T55); lazy inventory; per-topic completion milestones.
  **Decision (owner-confirmed):** the Arena stays **near 100 tiers** — owner reconsidered
  the ~1000 idea and chose to keep tiers meaningful/earned. **Target 120 tiers (10 regions
  × 12)** — keeps all 10 hand-named regions + 10 bosses, just adds ~2 rank titles; 120 is a
  nicely composite number, +20% over 100. Difficulty auto-scales via the dynamic
  calibration; **naming stays hand-crafted at this scale — procedural generation is shelved**
  (only needed if we ever go to many hundreds). The re-tiering itself is **T66**.
- **What needs intentional NEW content per wave (the anti-dilution rule):** new
  **procedural icon categories/archetypes** (so new items don't recycle the existing
  ~50); new **name templates / word banks** (so names stay diverse — no new repeated
  adjectives); a **guide** + a **method-only, number-specific `explain()` branch** (T49
  standard); structured **glyph tokens** for the pixel mark (T56); unlock-chain
  placement; a `masterSecs` difficulty tier.
- **The add-a-topic checklist** (ordered, copy-pasteable) + **the invariants to
  re-verify every time** (the CI gates: arena buff-gating, hints method-only+grammar,
  icon-variation, contrast AA, perf; plus numpad-enterable numeric answers in the
  calibrated ranges from `docs/research-11plus.md`).
- **DoD:** `docs/CONTENT-EXTENSION.md` exists, is accurate to the current code (coupling
  map + auto-scale list + checklist + invariants + anti-dilution rule + the 100-tier
  decision), and is referenced by T59–T61; no code/behaviour change; deploy green.
  (Babysitter checks the coupling description matches `enemies.js`/`collectibles.js` and
  that the checklist is complete.)

### T59 — Wave-2 topics, Batch A: Rounding + Larger ×/÷ (with new content) · status: OPEN
Add two topics **following T58**, with genuinely new content. Specs/calibration come
from `docs/research-11plus.md` (these are already researched). Topics: **Rounding** (to
10/100/1000 and decimal places) and **Larger ×/÷** (2-digit × 1-digit, ÷ with
remainders-as-decimals where appropriate — numeric, numpad-enterable).
- **Per topic:** fixed curated question set (calibrated, numeric answers within the
  numpad length guard); unlock-chain placement (append after the current last topic);
  `masterSecs` tier; a **guide** + a **method-only, number-specific `explain()` branch**
  (T49 standard — gated by `hints.test.js`); structured **glyph + glyph tokens** (T56).
- **New content (anti-dilution):** add **≥1 new procedural icon category/archetype** and
  **new name-bank entries** so this batch's collectibles draw on fresh art + names, not
  only the existing pools. (Document what's new.)
- **Re-verify the coupled systems:** the Arena gates must still pass with the larger item
  pool — tiers 1–5 winnable at 0 items, no tier behind its own loot, tier 100 ⇔
  near-full, one champion boost flips it; plus hints/icon-variation/contrast/perf gates.
- **DoD:** both topics playable + unlock in chain; mastery/flawless/speed/per-question
  collectibles registered with fresh icons/names; guide + hints correct (method-only,
  no answer leak, grammar-clean) for every question; **all CI gates green** (arena
  invariants re-proven on the grown pool); 360px-safe; no regressions; deploy green.
  (Babysitter re-runs the arena buff-gating suite + hints scan on the new questions and
  checks the new icon category/names are actually new.)

### T60 — Wave-2 topics, Batch B: Measures — Money, Time, Metric (with new content) · status: OPEN
As T59, for the **measures** group: **Money** (£/p, change, totals), **Time** (durations
in minutes, elapsed — numeric/minutes per the existing no-colon-key constraint), and
**Metric units** (mm/cm/m/km, g/kg, ml/l conversions — numeric). Same per-topic
deliverables, the **anti-dilution new-content rule** (new icon category + names for this
batch), and the **same re-verification of all gates**. DoD mirrors T59. (Babysitter
checks the answers are numpad-enterable and the time/metric framings respect the
numeric-only numpad — no colon/unit keys.)

### T61 — Wave-2 topics, Batch C: Reasoning — Ratio, Mean, Sequences (with new content) · status: OPEN
As T59, for the **reasoning** group: **Ratio** (simplify / share in a ratio → numeric
parts), **Mean** (average of a small set), and **Sequences** (next term / nth-term
value — numeric). Same per-topic deliverables, the **anti-dilution new-content rule**
(new icon category + names), and the **same re-verification of all gates**. DoD mirrors
T59. (Babysitter re-checks the maths of each curated set + the hints, and the new
content.)

---

## Phase 8 — Hint quality (deep, methodical, EVERY question) — do EARLY (after T57)

### T62 — Methodical, question-by-question hint audit across ALL topics · status: DONE
Owner: "I'm **not only talking about halves — we need to fix every bit of advice across
all topics.** We may need to spend real time on this, methodically thinking about each
question. I don't mind burning time on this — an agent needs to go through them one by
one." So this is **not** a quick branch tweak: it's a deliberate, **per-question pass over
every topic's full curated set**, checking that the hint `explain()` produces for *that
exact question* describes the *actual operation the student performs* — correct, specific,
appropriately framed, method-only.
- **Method (mandatory): go through them one by one.** For **every topic**, enumerate its
  **entire** question set (`mode.build()`), and for **each question** read the current
  hint and judge it against the real operation; rewrite the topic's `explain()` branch
  (adding number-aware sub-branches as needed) until **every** question in that topic gets
  an apt hint. Record the per-topic pass in BUILDER-LOG (topic → issues found → fixes), so
  the Babysitter can verify topic-by-topic. Do not stop at halves.
- **The worst exemplar — halves (screenshot "half of 500"):** the hint said *"Split 500
  into tens and ones…"* but **500 is 5 hundreds (an odd count), so its half lands on a
  250-style half-hundred** — no tens or ones involved. The T49 fix only guarded operands
  `<10`; `100/180/360/500/1000` are all wrong. Rebuild halves to be **place-value-aware**:
  - **Single digit:** even → halve directly; odd → the half ends in ·5 (as now).
  - **Round numbers (trailing zeros — 90, 100, 500, 1000, 250…):** work in the largest
    unit actually present (tens / hundreds / thousands); if the **count of that unit is
    odd**, say the half lands on a 5 / 50 / 500 (e.g. 500 = 5 hundreds → odd → a 250-style
    half-hundred; 90 = 9 tens → odd → ends in 5). **Never name a place finer than the
    number has** (no "tens and ones" for a round hundred/thousand).
  - **Mixed numbers (48, 45, 144, 360, 524…):** split into the **place chunks that are
    actually present** (e.g. 360 → 300 + 60; 45 → 40 + 5; 144 → 100 + 40 + 4), halve each,
    add; flag the ·5 ending only when the **ones digit is odd**.
  - Method only — never state the answer (T49 standard); one concise British sentence.
- **EVERY other topic, question by question (the bulk of the work).** Apply the same
  rigour to all 15 topics — times, doubles, add/subtract, bonds, place value, fractions-of,
  fractions→decimal, percentages, squares, etc. For each, check the hint fits the *specific*
  operands: e.g. doubles of round hundreds/thousands shouldn't imply absent places; ×-tricks
  must be the *best* one for those factors; %/fraction hints must match the actual values;
  place-value hints must state the right direction + number of places for the real operands;
  bonds must reflect whole-ten vs with-ones, decimal bonds, etc. Fix every mismatch; keep
  each hint concise, British, 10-yo-appropriate, mathematically correct, method-only.
- **Strengthen the gate (`hints.test.js`) for ALL magnitudes:** assert no halves/doubles
  hint names a place value **finer than the number's smallest nonzero place** — concretely
  (a) a multiple of 100 must not say "tens and ones"/"ones"/"tens" as split targets, (b) a
  multiple of 10 must not say "ones", and add explicit must-pass cases for **`half of 500`**
  (reads as hundreds, odd-count, no "tens and ones", no `250`) and **`half of 1000`**.
  Keep the existing no-answer-leak (token + words) and singular/plural checks.
- **DoD:** **every question in every one of the 15 topics** yields a hint that fits its
  specific operation — verified by dumping the **full** hint set (every `mode.build()`
  question → its `explain()` output) and reading them all; halves place-value cases
  (500/1000/100/180/360/90) are correct; no hint names a place the number lacks or gives a
  mismatched approach; the extended Node gate proves no phantom place-value at any magnitude
  + no answer leak (token & words) + no plural slips across every question; a BUILDER-LOG
  per-topic record of issues-found→fixes; concise, British, mathematically correct;
  method-only; all CI gates green; no regressions; deploy green. (Babysitter independently
  dumps and reads **every** topic's full hint set, not a sample, and confirms the gate now
  fails on a phantom-place hint at the hundreds magnitude. Expect this to take real time —
  that's the point.)

### T63 — Surface the "how to approach this" hint in normal rounds too · status: DONE
Owner: "add these hints to the **normal topic questions** (hidden by default, in the same
way)." Today the tap-to-reveal hint (`#practiceHintToggle` + `#practiceNote`) only appears
in **Practice** mode (gated on `practiceCtx` in `beginRound`/`renderInput`, `main.js`).
Make the same hidden-by-default, tap-to-reveal hint available in **normal drill rounds**.
- **Show the toggle + note in normal rounds**, using the same `Guides.explain(mode.id, it)`
  for the current question; **collapsed by default**, reset to hidden on every new question,
  label flips on reveal — identical UX to Practice. (Practice mode is unchanged.)
- **Build on T62** (do it after) so the hints surfaced widely are already high-quality.
- **No scoring change / no gaming:** the clock keeps running while a hint is revealed, so it
  naturally costs time — Mastery/Speed brackets/Flawless stay earned by real performance;
  do **not** disable or alter any achievement based on hint use, and do not pause the timer.
- **DoD:** in a normal round the hint toggle shows, the note is hidden until tapped, resets
  per question, and reveals the correct method note; Practice mode still behaves as before;
  the round clock is unaffected by revealing a hint; achievements unchanged; every `$("id")`
  exists; 360px-safe; `node -c` clean; no console errors; no regressions; deploy green.
  (Babysitter checks the toggle appears in a normal round, hidden-by-default + per-question
  reset, the timer/scoring is untouched, and Practice is unchanged.)

---

## Phase 9 — In-round readability

### T64 — Mid-round item toasts must not obscure the question · status: DONE
Owner: "when you get **multiple inventory items at the same time** it can **obscure the
question** until they disappear. I still want to see them prominently, but not hiding the
question." Cause: `.toasts` (`styles.css` ~437) is a **fixed, top-anchored vertical stack**
(`top: 10px`, grows downward, `z-index:60`); when several items unlock on one answer (e.g.
Solved + Spark + Beat + a Collector/Gold milestone), the column grows **down into the
`#stage`/`#prompt`/`#answer`** and covers the question until they fade. `showToast`
(`main.js` ~447) appends each toast immediately with a 2000ms hold.
- **Keep them prominent, but never cover the question.** The `#prompt` and `#answer` (and
  the eyebrow) must remain **fully visible at all times**, even with many simultaneous
  unlocks. Each toast stays full-size, animated, legible (icon + name + rarity) — do not
  shrink them into illegibility.
- **Suggested approach (Builder may choose another that meets the DoD):** **cap** the
  number of concurrently-visible mid-round toasts (e.g. ≤2) and **queue** the rest, showing
  each as a slot frees; **bound the toast band's vertical extent** (a max-height in the top
  safe area) so the stack can *never* reach `#stage`; when a backlog exists, use a brisker
  hold so the queue drains promptly without lingering over play; optionally a small "+N"
  indicator while items are queued.
- **No item lost, no double-count.** Every unlocked item still appears (queued if needed),
  and the **end-of-round unlock modal** (`showUnlocks`) still lists the full set — leave
  that modal as-is. Don't change what gets awarded, only how the toasts are paced/placed.
- **Perf (T45):** queuing must not leak timers/nodes or stack RAFs; reuse `dismissToast`;
  the toast canvases still release.
- **DoD:** with **N=5+ simultaneous** mid-round unlocks the question (`#prompt`/`#answer`)
  is never covered/obscured; toasts stay prominent and **every** item is still shown
  (queued, none dropped); a Node check of the queue logic proves it caps the visible count
  and drains **all** items in order with no loss; the end-of-round modal is unchanged; no
  timer/node/RAF leaks across repeated bursts; 360px-safe (incl. short screens); `node -c`
  clean; no console errors; no regressions; deploy green. (Babysitter verifies the cap/queue
  logic drains all items, the band is height-bounded above the stage, and the modal still
  lists the full set.)

### T65 — Scroll the Arena back to top after a fight resolves · status: DONE
Owner: "each time you have a **victory** in the Arena you should be **scrolled back to the
top** — otherwise you're just looking at your heroes and missing the information at the top
about who you're challenging/beating." Cause: `#arenaBody` is the scroll container
(`.arena-body{…overflow-y:auto}`, `styles.css` ~340); after you scroll down to pick a hero
and Fight, `finishBattle` (`main.js` ~790) calls `renderArena()` which rewrites
`#arenaBody` (new result block prepended at the top) but **never resets `scrollTop`**, so
the browser keeps you parked at the hero list — the Victory/Defeat result + the current
tier sit above the fold.
- **Fix:** after a fight resolves, set `$("arenaBody").scrollTop = 0` so the result and the
  tier you're challenging/beating are shown. Put it in **`finishBattle`** (after
  `renderArena()`), applying to **both Victory and Defeat** (both surface a result the
  player should read).
- **Do NOT reset scroll on hero-selection re-renders.** Selecting a hero card also calls
  `renderArena()` (the `#arenaBody` click handler, ~1178) — that must **keep** the player's
  current scroll (no jump while picking). So the reset belongs in `finishBattle`, not in
  `renderArena` itself.
- **DoD:** after a fight (win *or* loss) the Arena is scrolled to the top showing the result
  + current tier; **selecting a hero does not jump-scroll**; entering the Arena starts at the
  top; `node -c` clean; no console errors; no regressions; deploy green. (Babysitter
  confirms the reset is in `finishBattle` only and hero-pick re-renders preserve scroll.)

---

## Phase 10 — Arena length + hero detail

### T66 — Set the Arena to 120 tiers (10 regions × 12) · status: DONE
Owner reconsidered the ~1000 idea and chose **120 tiers** — close to the current 100,
keeps every tier earned, and keeps **all hand-crafted names** (no procedural generation).
Structure: **10 regions × 12 tiers**, a named boss at each region's **12th** tier.
- **`enemies.js`:** `TIER_COUNT` 100 → **120**; `tierName` uses 12-tier regions
  (`region = floor((n-1)/12)`, `pos = (n-1)%12`, **boss at `pos === 11`**). Extend
  `RANK_TITLES` from the current set to **11 entries** (positions 0–10 are rank-titled,
  pos 11 = boss) — add ~2 new titles that fit the power ladder (Babysitter reviews the
  names). Keep the 10 `BANDS` + 10 `BOSSES` exactly as-is.
- **Recalibrate the ramp** so difficulty spreads smoothly over 120 (not 100): adjust
  `DEF_GROWTH` so the geometric ramp still rises into the cap envelope across all 120 tiers
  (def monotonic non-decreasing, tier 1 winnable by the starter at 0 items, the final tier
  **120** pinned to full collection). The dynamic calibration + final-boss recalibration
  already do the heavy lifting — just retune the growth constant for the new length.
- **Loot:** 250 loot now spreads over 120 tiers (was 100) — keep the existing
  per-depth `lootCount` rule; confirm the totals/regions still make sense (loot regions in
  the inventory follow `tierRegion`, which auto-updates). No procedural naming needed.
- **Tests:** update `arena.test.js` to the new count — assert 120 tiers, def monotonic
  across all 120, tiers 1–5 winnable at 0 items, **no tier gated behind its own loot**,
  the **final tier 120** unbeatable at 0 items / beatable at near-full collection / **one
  champion boost flips it**, `canAttempt` still needs `tier:n-1`, boss every 12th tier
  named from `BOSSES`. Update any other test/constant that hard-codes 100.
- **DoD:** `TIER_COUNT === 120`; 10 regions × 12 with bosses at 12/24/…/120 (the 10 named
  bosses); rank ladder has enough titles (no undefined/blank names — Babysitter dumps all
  120 tier names); def monotonic; tier-1 winnable at 0 items; tier-120 ⇔ near-full
  collection (one boost flips); no tier behind own loot; loot distribution sane; perf fine
  (arena renders only the current tier — 120 is trivial); all gates green; no regressions;
  deploy green. (Babysitter dumps all 120 tier names + the full def array, and re-runs the
  buff-gating suite at the new length.)

### T67 — Hero detail view (full boost list; decide unowned display) · status: DONE
Owner: "heroes in the hero list need to be **expandable or have their own separate page** —
the list of [boost] items is very long and partially hidden. Also I'm not sure if we should
show items there that they **don't have yet**?" Today `heroCard` (`main.js` ~578) crams the
hero's owned boost items into `.hero-items` as chips capped at 12 with a **"+N more"** that
**hides the rest**.
- **Give heroes a detail view.** Tapping an unlocked hero card opens a **hero detail**
  (recommended: a dedicated screen/route like the others, e.g. `#/hero/<id>`; an expanding
  card is acceptable if cleaner) showing the **big portrait** (the T51 creature-blob via
  `C.drawIcon(cv,"hero:"+id,HERO_PAL[type],"familiar")`), full stats (PWR/GRD/SPD/FOC), and
  the **complete owned boost list scrollable, untruncated** (no "+N more" cut-off).
- **Unowned boosts (owner-confirmed — REQUIRED):** show the **owned** boosts in full, plus
  a **progress summary** stating **how many boost-items exist for this hero in total and how
  many are collected** — e.g. "44 / 93 boosts collected" (the real per-hero total ranges
  ~74–103; compute it, don't hard-code). **Do NOT render a long list of locked/unowned
  tiles** (each hero is boosted by ~80+ items). A small **collapsible "still to find"** is
  optional but the default surface is: owned boosts in full + the `X / Y` count. Goal: show
  what you have prominently and make the full scope legible, without clutter.
- **Keep the list view tidy:** the hero *list* card can show a compact summary (portrait,
  name, rating, stats, "Boosted by N — tap for details") instead of the long chip overflow.
- **DoD:** an unlocked hero opens a detail view with its portrait + full stats + the
  **complete owned boost list, untruncated and scrollable**; the unowned-display follows the
  decided approach; the list card no longer hides items behind a cramped "+N more"; portrait
  draws via the T51 path; every `$("id")` exists; 360px-safe; lazy (detail built on open);
  no regressions to the Heroes screen or routing; `node -c` clean; deploy green. (Babysitter
  checks the full owned list shows, the detail opens/closes cleanly, and the unowned summary
  matches the real counts.)

---

## Phase 11 — Arena wayfinding (sense of journey)

### T68 — Arena wayfinding: regions, boss anticipation, a simple journey map · status: DONE
Owner (screenshot, "ARENA TIER 29 / 100"): "give more sense of **where we are** in the
Arena. I guess I'm on the penultimate enemy in this region, but nothing tells me. Maybe a
simple **map**. I need to feel **compelled to keep going to the next stage**, not just
ticking up to 100." The data is all there but invisible: tier 29 = *Gloamwood Warlord*
(9th of 10 in **Gloamwood**, region 3 of 10), and tier 30 is the region **boss** *Old
Mother Bramble*. The **regions + named bosses are the real milestones** — surface them.
- **(1) Region wayfinding on the tier card.** Replace/augment the bare "TIER 29/100" with
  the **region (name + "N of 10")** and the **position within the region** — e.g.
  "Gloamwood · region 3/10 · tier 9/12" plus a **row of per-region pips** (cleared /
  current / boss marked distinctly). Use the real region size (don't hard-code; post-T66
  it's 12/region).
- **(2) Boss anticipation.** When the next tier is the region's **final/boss** tier, flag
  it prominently as a mini-goal/climax — e.g. "⚔ Region boss next: **Old Mother Bramble**"
  — and mark boss tiers distinctly in the pips/map. The boss is the payoff for the region.
- **(3) A simple journey map/overview.** A lightweight view (inline panel or a toggle on
  the Arena) of the **10 regions as a path/list**: **conquered** (✓), **current** ("you are
  here"), and **locked-ahead** regions teased by **name + boss landmark** (so the player
  sees the destinations to come — "Dragon's Roost", "The Void Throne"). Keep it simple
  (a vertical list/path, not a heavy graphic); each region shows its boss as the landmark.
- **(4) Region-clear moment.** Beating a region's boss surfaces a short **"Region conquered
  — next: <Region>"** celebration (reuse the result/toast/modal style + sfx), revealing the
  next region — a deliberate hook to the next stage.
- **Mechanics:** drive everything from the existing `Enemies` helpers (`tierRegion`,
  `regionLabel`, `BANDS`, `BOSSES`, the per-region tier count) — **structure-agnostic** so
  it works at the post-T66 120-tier (10×12) layout (compute region size from the data, not
  a literal 10). No change to battle logic, def, or loot.
- **Quality:** legible WCAG-AA (T46 palette), 360px-safe, **static** (no RAF), don't bloat
  the arena render or break the post-T65 scroll-to-top.
- **DoD:** the Arena shows the current region (name + N/10) and in-region position with
  boss-marked pips; **boss-next is clearly flagged** when applicable; a **journey overview**
  of all regions (conquered / current / locked-ahead with boss landmarks) is accessible;
  **clearing a region's boss shows a region-clear moment** naming the next region; all of it
  computed from the region helpers so it's correct at 120 tiers (12/region) and at 100;
  contrast AA; 360px-safe; `node -c` clean; no console errors; no regressions; deploy green.
  (Babysitter checks the region/position maths against `tierRegion`/`regionLabel` at several
  tiers incl. a boss-next case and a region boundary, and that the map lists all regions with
  correct status.)

### T69 — Raise the audio volume (SFX + music) · status: DONE
Owner: "the volume seems quite low." In `sound.js` the master is `VOL = 0.16` (governs
everything; SFX route straight to `master`, peak ≈ 0.024) and music is **additionally**
attenuated via `musicGain.gain.value = 0.07` (effective ≈ 0.011 — very quiet).
- **Raise the master** `VOL` to a clearly-louder but safe level (~**0.28–0.32**). Keep
  music a **balanced background** under the SFX/feedback (nudge `musicGain` proportionally
  if needed — ~0.08–0.10 — so it's audible without drowning the answer blips).
- **No clipping.** With the T33 per-tick voice caps the summed peak must stay well under
  1.0 — reason through the worst case (max simultaneous SFX + music voices) and keep
  headroom (≤ ~0.9). If raising significantly, a `DynamicsCompressorNode`/limiter on the
  master (before `destination`) is a safe option — recommended if the worst case gets close.
- **Preserve behaviour:** mute still sets `master.gain = 0`; music still stops on mute /
  tab-hidden and resumes on unmute/visible; the unlock-on-gesture flow is unchanged.
- **DoD:** master `VOL` raised to a clearly-louder level; music stays balanced (audible,
  not dominating the SFX); no clipping at max voice load (worst case reasoned, ≤ ~0.9, or a
  limiter added); mute + visibility behaviour intact; `node -c` clean; no regressions;
  deploy green. (Babysitter checks the new `VOL`/`musicGain` values, the worst-case
  headroom, and that the mute/visibility + balance logic is unchanged.)

### T70 — Hint clarity pass: make every explanation actually helpful · status: DONE
Owner: "tidy [the twentieths] if it's not useful or clear. **Try to explain everything in
a way that's actually helpful.**" T62 made every hint correct + method-only; this pass
raises the bar from *correct* to *genuinely clear & useful to a 10-year-old*.
- **Fix the twentieths (the flagged case).** `fractions` `n/20` currently says "A
  twentieth is half a tenth — find 11/10, then halve" — an awkward improper fraction for
  `11/20`,`17/20`. Replace with the **scale-to-hundredths** method that works cleanly for
  **all** n/20: e.g. *"Scale 11/20 up to hundredths (×5 top and bottom), then read off two
  decimal places."* (verified leak-free: 55/100 etc., never states the answer). Concrete,
  general, no improper fractions.
- **Re-read EVERY hint for clarity/helpfulness**, not just correctness. Replace anything
  vague, cute, or assuming hidden knowledge with a concrete instruction the student can
  follow. Known suspects to judge: times' fallback *"build it from a fact next door"*
  (vague — say what, e.g. "use the fact one row up/down"); the eighths *"count 7 eighths"*
  (assumes you know 1/8 = an eighth's value — make the step explicit); any terse phrasing
  like percentages' *"take both of 80"*. Each hint should name the concrete action.
- **Keep all T62 properties:** correct, **method-only** (no token or word answer-leak),
  place-honest, concise (one short sentence), British, 10-yo-appropriate. The
  `hints.test.js` gate must stay green.
- **DoD:** the twentieths use the clean hundredths method (no improper fractions; helpful
  for all n/20); a full clarity re-read fixed any unclear/vague/knowledge-assuming hints
  (Babysitter dumps the full hint set again and reads for **clarity**, not just
  correctness); all gates green (no new leaks/phantom/plural); concise; no regressions;
  deploy green. (Babysitter re-reads every topic's full hint set for genuine helpfulness.)

### T71 — Calmer music + more per-topic variation + an Arena theme · status: DONE
Owner: "the music is still sometimes a bit fast/stressful — make it more **calming**. Add
more **variation** in music style across topics. Maybe **Arena-specific** music." Context
(`sound.js`): 12 topic styles + 1 menu style; **tempo is static** per style
(`mNext += (60/bpm)/4`, no dynamic speed-up), so "fast" = the high-BPM styles
(**109–115**: Sky Castle, Neon Arcade, Lava Run, Bubble Pop, Mecha March, Clockwork,
Victory Hall). Topics → styles by `hashStr(id)%12` (15 topics, 12 styles → collisions).
The **Arena plays the *menu* style** (main.js routes all non-`game` screens to "menu").
- **(1) Calming pass.** Bring every style's **bpm into a relaxed range — cap the max at
  ~95** (keep the gentle 76–88 ones); **soften the busy styles** — lower `density` (the
  lead-note probability), ease drum intensity (the `DRUM` gains / patterns), favour the
  triangle lead where it suits. The music must never feel rushed at any topic.
- **(2) More per-topic variation.** Give **each of the 15 current topics a distinct
  style** — an explicit `mode.music` index per mode (in `modes.js`) or expand + map so
  **no two topics share** and the variety is intentional (different scale/mood/instrumentation
  per topic). Add new styles as needed (all within the calm range). (Wave-2 topics get a
  style when added — note the rule in the T58 playbook.)
- **(3) Arena-specific music.** Add a dedicated **Arena theme** (adventurous/heroic but
  still calm, within the bpm cap) and **route the Arena screen to it** (change `main.js` so
  `#/arena` uses the arena style, not "menu"). **Optional/nice-to-have:** vary it by region
  (the 10 regions pick from a small flavoured set) — keep bounded.
- **Preserve:** the look-ahead scheduler, the T33 voice caps (`MAX_STEPS_PER_TICK`/per-event
  caps), mute + tab-hidden behaviour, and the T45 "music idles when not playing".
- **DoD:** **no style's `bpm` exceeds ~95** (Babysitter checks every value); the busy styles
  are softened (lower density/drums); **each of the 15 topics maps to a distinct style**
  (verify zero collisions); a dedicated **Arena theme exists and the Arena screen plays it**
  (not the menu style); scheduler / voice-cap / mute / idle behaviour unchanged; `node -c`
  clean; no console errors; no regressions; deploy green. (Babysitter verifies the bpm cap,
  the distinct per-topic mapping, and the arena-music routing; "calmer" itself is the owner's
  ear.)

---

## Phase 12 — Distribution (Google Play readiness)

### T72 — Play Store readiness: research doc + PWA foundation for an Android package · status: OPEN
Owner: "generate an Android APK + the required package of files for Play Store submission;
in general research and get ready for Play Store; create a doc explaining how we can get
there." The game is a **static PWA-able site on GitHub Pages** with **no manifest, no
service worker, no icons, no privacy page** today — so this is (a) a thorough **research/
readiness doc** and (b) the concrete **PWA foundation** that makes the app packageable. Be
honest about which steps the Builder can do in-repo vs which are **owner-gated** (a Play
Console account, a signing keystore, the actual upload).
- **(1) The doc — `docs/PLAY-STORE.md` (the primary deliverable).** A complete, accurate
  path to the Play Store for this static web app:
  - **Recommended path: a Trusted Web Activity (TWA)** wrapping the deployed PWA — lightest
    for a static site. Two ways to build the Android **App Bundle (AAB)**: **PWABuilder.com**
    (point it at the Pages URL → download a signed AAB + `assetlinks.json`; no local Android
    SDK) — recommended; or **Bubblewrap** CLI (`@bubblewrap/cli`, needs JDK + Android SDK) —
    give the exact commands. Note **Capacitor** as the heavier alternative (bundles assets,
    true offline) and when it'd be worth it.
  - **Clarify APK vs AAB:** new Play apps require an **AAB**; an APK is fine for
    sideload/testing. Cover **Play App Signing** (Google holds the upload key).
  - **Play Console setup:** the one-time $25 account; store listing assets (**512×512 icon**,
    **1024×500 feature graphic**, ≥2 phone **screenshots**, short + full description);
    **content rating** (IARC questionnaire); **Data safety** form; **target audience &
    content**.
  - **KIDS app — call this out prominently:** the app targets ~10–11-year-olds, so Google
    Play's **Designed for Families** / families policy applies (COPPA / GDPR-K). Our data
    story is simple (only `localStorage`, **no collection/transmission, no ads, no
    third-party SDKs**) — document exactly how to declare that (Data safety: "no data
    collected/shared"), and that a **privacy policy URL is mandatory**.
  - A **step-by-step checklist** from "PWA ready" → "live on Play", marking each step
    **[in-repo]** vs **[owner-action]**.
- **(2) PWA foundation (the concrete code so the app is actually packageable).**
  - **`manifest.json`** — `name`/`short_name`, `start_url`, `display:standalone`,
    `theme_color`/`background_color`, `orientation`, and **icons** (incl. 192 & 512,
    `purpose:"any maskable"`); link it from `index.html`. Pull the look from the T56 pixel
    mark.
  - **A service worker** (`sw.js`) for installability + offline of the static assets —
    **must coexist with the T54 update-check**: use a **versioned cache + network-first (or
    stale-while-revalidate)** so it never serves stale builds or fights `build.json`; register
    it defensively (no-op if unsupported). **Do not break the live game** (carefully scope
    what's cached; the app must still load + update normally).
  - **Icons**: provide the required PNG icon(s) (≥192 & 512, maskable-safe) — generate from
    the T56 mark (a small committed generator/script or committed PNGs); document how they're
    produced.
  - **`/.well-known/assetlinks.json`** — a placeholder + clear instructions to drop in the
    app's signing-cert SHA-256 (TWA domain verification).
  - **A privacy policy page** (e.g. `privacy.html` on the Pages site) — "no data collected,
    stored only on your device," kid-appropriate; linked from the doc as the policy URL.
- **DoD:** `docs/PLAY-STORE.md` exists and is **complete + accurate** (TWA/PWABuilder/
  Bubblewrap, AAB-vs-APK, Play Console listing, content rating, **Data safety = no data**,
  **Designed for Families / COPPA**, privacy-policy requirement, a [in-repo]/[owner-action]
  checklist); the site is a **valid installable PWA** (manifest linked + parseable with 192
  & 512 icons; a registered service worker that **doesn't break load or the T54 update flow**
  — verify the app still boots and updates); `assetlinks.json` placeholder + a privacy page
  exist; `node -c` clean on any JS; **no regression to the running game** (all existing gates
  green; the SW must not serve stale assets); deploy green. (Babysitter checks the manifest
  validates, the SW is update-safe/non-breaking, the doc covers the kids/Families + data-safety
  requirements, and clearly separates owner-gated steps.)

---

## Phase 13 — Visual polish

### T73 — Replace the coloured left-border accents with a coloured square · status: DONE
Owner (screenshot, hero detail): "we've got **AI-smell left borders** again. I prefer a
**coloured square or something else — not a curved border**." (Recurring — the owner
flagged the same pattern earlier for the topic picker, which was fixed by dropping the
left stripe.) Two places reintroduced the rarity/status-coloured `border-left-width:3px`
on a rounded row:
- **`.hd-boost`** (T67 hero-detail boost rows, `styles.css` ~354–358) — rarity colour on
  `border-left-color` (uncommon/rare/epic/legendary).
- **`.map-row`** (T68 journey-map rows, ~388–390) — status colour on `border-left-color`
  (done = mint, cur = amber).
- **Fix:** remove the coloured `border-left` accent from both; show the rarity/status with a
  small **solid coloured square** swatch (sharp corners — *not* a curved/rounded stripe) at
  the start of each row, in the same colour. Keep the row's uniform thin `--line` border.
  Apply the **same square pattern to both** lists for consistency. The square must stay
  legible/AA on its background and not break the 360px layout.
- **Anti-recurrence:** this colour-coded **left-border-on-a-rounded-row** pattern is a
  known owner-rejected "AI smell" — avoid it in future styling (note for the T58 playbook).
- **DoD:** no `border-left`-colour accent remains on `.hd-boost` / `.map-row` (grep clean);
  each row shows its rarity/status via a small solid coloured **square** (sharp corners),
  consistent across both lists; legible, 360px-safe; no other restyle/regression; `node -c`
  clean (CSS-only, no JS change expected — or trivial markup if a swatch element is needed);
  deploy green. (Babysitter greps for residual `border-left` colour accents and checks both
  lists use the square.)

---

## Phase 14 — Progression integrity

### T74 — Topic unlock must require genuine engagement (not all-skipped) · status: DONE
Owner: "if you **skip all** the questions on a topic you still **unlock the next topic** —
that doesn't seem right. Maybe some skips are OK, but not 100%." Cause: the `init:<mode>`
collectible (whose ownership unlocks the next topic via `isUnlocked`) has **`test: () =>
true`** (`collectibles.js` ~109) — so finishing a round by skipping every question still
grants it. (`skip()` increments `mistakes` and advances but does **not** push to `times`, so
skipped questions just aren't "answered".)
- **Gate `init:<mode>` on genuine engagement.** Require the player to have **answered** (not
  skipped) at least a threshold of the round. **Recommended default: at least half** the
  questions answered (skipped < 50%) — define it as a single named constant so the bar is
  trivially tunable. **Measure ANSWERED, not clean-first-try `score`** — a question the
  player got right *after a mistake* still counts (the game only advances on a correct entry
  or a skip, so "answered" = `times.length` = got-right questions).
- **Expose the count in the finish `ctx`** (e.g. `answered`/`skipped`) and change the init
  `test` to `ctx => ctx.answered >= THRESHOLD(ctx.total)`. Don't touch flawless/speed/mastery.
- **Migration-safe:** players who already own `init:<mode>` keep it (only *new* grants gated);
  **Practice** never grants `init`; the unlock chain (T1) still fires for a genuinely-played round.
- **OWNER DECISION (flag):** the exact bar — "at least half" (default), gentler ("a third" /
  "at least one", just not 100% skipped), or stricter. Implement as one constant + name the value.
- **DoD:** a **Node logic check** proving: (a) `init` NOT granted when every question skipped
  (`answered===0`); (b) granted on a normal round meeting the threshold; (c) the topic-chain
  unlock (T1) fires for a genuinely-played round but **not** after an all-skipped round; (d)
  a player who already owns `init` keeps it; (e) Practice still grants no `init`. No
  regressions to scoring/rank/other collectibles; `node -c` clean; deploy green.

### T75 — (UNPLANNED, owner-prompted Builder directly) Rename results "Modes" → "Back" · status: DONE
Owner prompted the Builder directly (outside this queue). `6c84af8`: the results-screen
`#menuBtn` label "Modes" → "Back" (text-only; id + `navStart` handler unchanged). Babysitter
reviewed retroactively: trivial, safe, no regressions; all gates green. Recorded for ledger.

### T76 — (UNPLANNED, owner-prompted Builder directly) Rank rewards backfill lower ranks · status: DONE
Owner prompted the Builder directly (outside this queue). `8af41a5`: each Rank collectible's
`test` changed `ctx.rankIndex === i` → `>= i`, so reaching a rank also grants every lower
rank in one round. Babysitter reviewed retroactively: a genuine **fix** (ranks are a ladder;
old exact-match needed playing worse to backfill + could skip the `rank:darkwizard`/`archmage`
hero unlocks). Verified: rankIndex 10 → 11 ranks, rankIndex 2 → 3; additive, migration-safe,
no Arena-calibration impact (full-drill-set ceiling unchanged). All 16 gates green. Ledger record.

### T77 — (UNPLANNED, owner-prompted Builder directly) Drop "Play again" from results · status: DONE
Owner prompted the Builder directly (outside this queue). `74ac75e`: removed the results-
screen `#againBtn` ("Play again") + its click wiring; only "Back" (`#menuBtn`, now a solid
primary) remains. Babysitter reviewed retroactively: `node -c` clean, **no dangling
references** to `againBtn` anywhere (no test/handler refs); replay still reachable via Best
Times. Safe; no regressions. Ledger record.

---

> **Future ideas** the owner wants captured but **not yet queued** live in
> `docs/agent/IDEAS.md` (a parking lot — NOT tasks; the Builder never builds from it).
