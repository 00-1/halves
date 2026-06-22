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

### T98 — [A] BUGFIX: audio is far too quiet (raise the volume) · status: DONE
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

### T112 — [A] FX pass 2: full-bleed backdrop + Arena backdrop + celebrate wins + fill the screen · status: DONE (`54820bd`)
Owner (screenshot of the live T110 home): "fx look good, but I only see them on this page. nothing on
arena, no celebrations. and the fx don't expand the full height and width of this page — shows where
we're wasting space." Three follow-ups to T110, all in the spirit of "put it everywhere."
- **Full-bleed the FX backdrop (fill the whole screen).** Today `#fxBackdrop` lives inside `#start`,
  which is clipped to the **padded, capped `.app` box** (`max-width:420` / `max-height:780` + body
  `16px` padding), so the backdrop exposes dead margins (top/sides/bottom). Make the home backdrop a
  **full-viewport** layer — e.g. a `position:fixed; inset:0` canvas behind `.app` (z-index below the
  app content), shown on the home screen, **stopped/idle off-home** — so the atmosphere reaches every
  edge. Keep it dim + `pointer-events:none` + `aria-hidden`; keep readability (AA).
- **Reduce the wasted space (fill height + width).** The owner keeps hitting dead margins (T99 top
  band, the bottom slack, now sides). On phones, let the home **fill the viewport**: drop/relax the
  `.app max-height:780px` cap at phone heights so the column fills vertically (coordinate with T106
  which absorbs the bottom slack into the tree), and trim the side dead-band (e.g. body horizontal
  padding 16→8, or let the backdrop bleed past it while content keeps a readable width). **Don't** make
  body text full-bleed/edge-to-edge where it hurts legibility; the goal is "no obvious wasted band,"
  not stretched text. 360px-safe; keep the top pinned (no T99 regression).
- **Arena backdrop (wire T108 now — no need to wait for the 3v3 UI).** The existing Arena screen
  (`#arena`, region/tier via T66/T68) gets a **full-bleed `deriveArenaScene` backdrop**: derive
  `{region, tier, bossProximity/facingBoss, mood}` from the **current live Arena position** (the region
  index + tier the player is on; `facingBoss`/proximity from the wayfinding state), mount a backdrop
  canvas on `#arena` behind its DOM, **start on the Arena screen, stop off it**. Region = sense of
  place; nearer a boss = hotter/denser (T108 already does this). Reduced-motion → static still.
- **Celebrate WINS, not just collectible gains.** T110 only bursts via `showUnlocks` (a new
  collectible/loot/event reward) — so a normal good round, or a win that drops no loot, shows nothing
  (the owner "no celebrations"). **Broaden the burst to real win moments:** on the **results screen**
  scale a burst to the **rank earned** (a bigger/warmer burst for a higher rank; little/none for a poor
  run) and on an **Arena victory** (`finishBattle` win) — in ADDITION to the existing reward-gain
  bursts. Keep it tasteful (don't fire on every trivial finish — gate on a decent rank / a win), capped,
  reduced-motion-safe, **never covering the question/result text**, respecting the toast queue.
- **DoD:** the home backdrop visibly **fills the screen edge-to-edge** (no dead FX margins) and still
  idles off-home; the home **no longer shows an obvious wasted band** (top/sides/bottom) on the Poco-X3
  viewport; the **Arena screen shows a region/tier-driven backdrop** (changes by region; intensifies
  near a boss) that idles off-Arena; a **celebration burst fires on a real win** (good-rank round finish
  AND Arena victory), reduced-motion-safe, never over key text; reading stays AA (contrast gate green);
  360px-safe; `node -c` clean; all gates green (extend `fx-wiring.test.js` to cover the Arena-backdrop
  start/stop, the full-bleed layer, and the win-burst path reading real rank/win state). (Babysitter:
  on the live build confirm the FX fills the screen, the Arena has its own backdrop, and winning a round
  pops a celebration — and that nothing animates off-screen.)

### T111 — [A] UI polish: COMPLETE the T100 pixel restyle (every screen) + tidy the nav · status: DONE (`4843824`)
Owner (3 screenshots, and counting): T100 shipped the `[data-ui="pixel"]` restyle but only covered a
**subset** of selectors, so several screens still show rounded "web-2.0" boxes. **Do a full sweep — do
NOT just patch the two/three screens named here.** Grep EVERY screen's render + `styles.css` for any
container with a non-token `border-radius` and/or a soft blur `box-shadow` that should read as game
chrome, and bring them all under the pixel tokens in one pass.
- **Known gaps to fix (non-exhaustive — find the rest):**
  - **Hero-DETAIL screen (`#heroDetail`):** `.hd-head` (the big hero card), `.hd-port` (radius:10px
    port), `.hero-stat` stat chips (`23 PWR…`), the boost rows `.hb-row`/`.hb-name`/`.hb-amt`.
  - **Results screen (`#results`):** **`.slow-item`** (the "Slowest Answers" rows — still rounded) and
    **`.rankline canvas`** (the rank-badge box, `border-radius:8px` → the "Kobold" emblem).
  - Then **audit the remaining screens** — `#summary`, `#inventory`, `#arena`, `#practice`,
    `#settings`, the collectible/rank **modal** — for any other rounded card/row/chip/badge and cover
    it too. The goal: **no screen still reads soft/rounded** under `data-ui="pixel"`.
- **How:** extend the T100 `[data-ui="pixel"]` block — squared radius (`--ui-radius`) + hard 1–2px
  frame / `box-shadow:none`, matching T100's panels. **Every rule stays gated on `[data-ui="pixel"]`**
  (so `data-ui="classic"` is byte-for-byte the old look) and **clean-text** (no pixel font; labels/
  numerals keep `--display`/`--mono`). Pixel-art badge canvases may keep `image-rendering:pixelated`;
  just square their frame.
- **Nav: no orphaned Exit + shorter "Settings".** The home `#navRow` has 7 labelled buttons (Best/
  Items/Heroes/Arena/Sound/Settings/Screen); **"Settings" (8 chars) overflows**, pushing the 7th button
  (**Screen/Exit**, the fullscreen toggle) onto its **own row**. Fix BOTH: **rename the Settings label
  to a shorter word — default `Setup`** (owner asked for a shorter word; `Setup`/`Config`/`Opts`/`Gear`
  all fine — owner's pick overrides) and lay the 7 buttons so **none is orphaned** — fit all seven on
  **one row** if they fit at 360px (7×44px + gaps ≈ 344px < 360, so short labels should fit), else a
  **balanced 2-row grid** (e.g. 4+3), never a single button alone. Keep the fullscreen button's
  emoji/label sync working (⛶ Screen ⇄ Exit) and gating-hide intact.
- **DoD:** **every screen** reads squared/hard-framed under `data-ui="pixel"` — hero-detail (card/port/
  stat chips/boost rows), results (`.slow-item`, `.rankline canvas`), and a swept `#summary`/
  `#inventory`/`#arena`/`#practice`/`#settings`/modal with **no remaining rounded card/row/chip/badge**
  (a grep for non-token `border-radius` on chrome containers should come back clean or justified); all
  of it **reverts byte-for-byte under `classic`**; the nav shows **no orphaned single button** (Exit/
  Screen inline) and the **Settings label fits** (shortened); AA contrast holds (gate green), ≥44px
  targets, 360px-safe, reversible; `node -c` clean; all gates green (extend `ui-restyle.test.js` to
  assert the newly-covered selectors are gated + the nav has no lone-button row / shortened label).
  (Babysitter: spot-check hero-detail, results, summary, inventory, arena all read consistent; nav is
  one tidy block.)

### T110 — [A] FX wiring pass 1: mount FXGL + home backdrop + celebration bursts · status: DONE (`349fcf7`)
**Make B's built-but-unwired FX engine VISIBLE** (owner's "bring the grit / put it everywhere"
vision). The engine (`fxgl.js`) ships four capabilities — ambient scene (T93), celebration burst
(T94), semantic home backdrop (T95), Arena biome (T108) — **none wired**. This task wires the **home
backdrop + celebration bursts**; the Arena biome wiring waits for the T89/T90 Arena UI.
- **Mount the engine.** Add `<script src="fxgl.js">` to `index.html` (the T107 cache-bust auto-versions
  it). **Register `test/fxgl.test.js` as a CI gate** in `pages.yml`. Add a backdrop `<canvas>` behind
  the home/`#start` DOM: `aria-hidden="true"`, `pointer-events:none`, sits under the UI (z-order), never
  intercepts taps.
- **Home backdrop (T95).** `FXGL.mount(canvas, …)` then `Controller.setHomeState(state)` where `state`
  is the **real** live home state: today's event `{seed,palette,name,mood}` (from `Ev`/events.js) +
  `progress` (a real 0–1 momentum/mastery measure) + `streak`. Re-derive when the day/event rolls or
  progress/streak change. **Start on the home screen; `stop()` when off-home** (idle, no RAF) — hook the
  existing screen-show/hide path. Respect reduced-motion + no-WebGL2 (the engine already falls back to a
  static still). **Must stay behind the compact one-screen home (T91/T99); never competes with text or
  the tree** (keep it dim/low-contrast under the DOM).
- **Celebration bursts (T94 — subsumes T94w).** Fire `FXGL.burst({x,y,count,seed,palette})` on the
  **existing** reward moments — Arena win, and **collectible / loot / event-reward** gains (inventory
  gains). Don't invent new moments. Seed from the event/item so it's deterministic; **reduced-motion →
  the calm flourish**; **never obscure the question/result text** (T64 spirit); respect the toast queue.
  A burst can fire as a standalone overlay (no ambient scene needed) or over the home backdrop.
- **No-build + a11y + perf.** Plain `<script>` + canvas; **idle when not visible** (the single-RAF
  budget must hold — verify no leak when navigating away); 360px-safe; keep `contrast.test.js` AA (the
  backdrop must not drag text contrast under AA — test the worst case).
- **DoD:** the home shows the **live-state** backdrop (changes with event/progress/streak — verify it
  reads the real sources, not constants); a celebratory **burst** fires on real Arena wins AND
  collectible/loot/event gains, reduced-motion-safe, never covering key text; `FXGL` **idles off-home**
  (no RAF when not shown — Node-checkable via the controller); `fxgl.test.js` registered as a gate;
  `node -c` clean; **all gates green incl. contrast AA**; no console errors; 360px-safe. (Babysitter:
  confirm on the live build that the backdrop encodes real state + stays readable, bursts fire on real
  gains without covering text, and nothing animates when the home/Arena is off-screen.)

### T107 — [A] Asset cache-busting so deploys actually ship fresh CSS/JS · status: DONE (`f1d4d6d`)
Owner (`a3608c0` screenshot): a freshly-deployed build still rendered the **pre-T99 centered layout**
AND the **old "Reward earned" banner tag** — both behaviours the deployed code can no longer produce.
Diagnosis: the browser/CDN serves **stale cached `styles.css` + `main.js`** (bare `href="styles.css"`
/ `src="main.js"` with GH-Pages default `max-age`), while `build.json` is fetched `cache:"no-store"`
so the **build stamp reads fresh** — the deploy *looks* live but the assets are old. The T54
version-check only **offers a manual refresh**; it does not bust the asset cache. Consequence: deploys
silently appear unchanged for ~the cache window, and **every owner/babysitter review of the live site
is untrustworthy** until this is fixed. This blocks shipping and blocks trustworthy review — do it
FIRST.
- **Ship fresh assets deterministically on every deploy.** Make the asset URLs carry the build
  identity so a new deploy is a new URL the cache can't shadow. Preferred (no-build-friendly): the CI
  `pages.yml` step rewrites `index.html` to append `?v=<shortSha>` to **the stylesheet link and every
  module `<script>`** (`glyphs/modes/events/guides/collectibles/heroes/enemies/monsters/scenery/
  eventart/fx/sound/main` — and `fxgl.js` once it's wired). `index.html` itself is the entry doc;
  ensure it isn't long-cached (it's the one file that must revalidate — confirm GH-Pages serves it
  with a short/again-revalidate policy, else rely on the version-check + `?v` on assets).
- **Cooperate with T54.** When `checkForUpdate` detects a new `build.json` sha and the user taps the
  refresh bar, the reload must land on the **new** asset URLs (the `?v=<sha>` rewrite handles this
  because the new `index.html` references the new query). No silent stale reload.
- **DoD:** after a deploy, a normal (non-hard) browser load fetches the **new** `styles.css`/`main.js`
  (verify the live `index.html` asset refs all carry the current `?v=<sha>`); the owner's home-screen
  band/banner reflect the deployed code without a hard-refresh; no-build preserved (CI does the
  rewrite, source stays clean — `node -c`/Node-verify unaffected); a **CI gate** asserts the built
  `index.html` has versioned refs for the stylesheet + every module script (no bare asset ref ships);
  all existing gates green; 360px-safe (no visual change). (Babysitter: after this lands, re-confirm
  on the live site that a fresh deploy changes the page without a hard-refresh — this is the gate that
  makes all later visual reviews trustworthy.)

### T99 — [A] Reclaim the wasted top space on ALL screens + tidy the home nav · status: DONE (`a3608c0`)
Owner (screenshot): **every screen wastes a band at the top.** Cause: `.app{height:100dvh;
max-height:780px}` — on a tall phone (Poco-X3 floor) the app is **capped at 780px** and the
leftover (+ `env(safe-area-inset-top)`) becomes a dead band at the top of every `position:absolute;
inset:0` screen. **Owner confirmed it's worse in FULLSCREEN:** non-fullscreen the content is almost
at the top, but **entering fullscreen makes the viewport taller** (browser chrome gone → `100dvh`
grows), so the 780px-capped, centered app leaves an **even bigger** top band. **The fix must
fill/top-align the app at the fullscreen (taller) viewport too** — so verify it both
non-fullscreen AND in fullscreen on the Poco X3. Reclaim it; pin the event banner to the very top
of `#start`; tidy the nav.
- **Reclaim top space globally.** Let `.app` use the **full viewport height on phones** so screens
  start at the very top (e.g. raise/drop the `max-height:780px` cap for phone widths, or top-align
  the app so any leftover falls to the bottom, not the top). Account for `env(safe-area-inset-top)`.
  All screens (esp. `#start`'s tree and the event banner) gain the reclaimed height.
- **Pin the event banner to the top** of `#start` (in the band the owner circled) — flush to the
  top, no gap above it.
- **Fix the premature "Reward earned" tag (owner).** After T92 each event has **3 reward tiers**
  (`event:<id>` · `:well` · `:ace`), but the banner shows "Reward earned" as soon as the
  **participation** tier is owned (`owned = !!col["event:"+ev.id]`) — misleading. Show **progress**
  instead, e.g. **"N/3 rewards earned"** (count owned tiers: `event:<id>`, `:well`, `:ace`); only
  read fully-done at 3/3. Keep the strip compact (T91).
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

### T104 — [A] Fix unreadable fraction glyphs (½, ¾) in the pixel font · status: DONE (`c6a96da`)
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

### T100 — [A] Gamey UI restyle, buttons-first (pixel-bevel, reversible) · status: DONE (`6fc8f99`)
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

### T113 — [A] Audio: live Volume + Tempo sliders in Settings (owner-calibrated) · status: DONE (`8d6e42f`)
**A different approach — stop tuning blind.** Audio volume + in-level tempo have had multiple passes
(T69/T71/T98) and STILL don't match what the owner hears on the Poco X3. Instead of guessing constants,
**instrument the app**: give the owner real-time sliders to find the right values by ear, **display the
exact value**, and the owner reports them back → a tiny follow-up (T114) bakes them as defaults. The
sliders also stay as genuine user settings (good UX for kids/parents).
**ROOT-CAUSE the babysitter found (act on it — this is why past passes failed):** the engine runs at
**~half scale**. Per-voice SFX gains are ~0.10–0.16 and `musicGain` is 0.09, so at master `VOL=0.80`
the output **peaks ≈0.51** — the brickwall limiter (−1.5 dB, on `master→limiter→destination`) **never
engages**. ~6 dB of headroom is unused, so small `VOL` bumps changed almost nothing. The fix is a
**much wider gain range** with the limiter as the safety net — NOT another tiny constant tweak.
- **Volume slider (Settings).** A real `<input type="range">` that sets the **master gain live** (you
  hear it change as you drag). **Range must reach genuinely LOUD** — map it so the top end pushes the
  output to/above full scale (e.g. master gain up to ~2.0–2.5×; the existing limiter clamps the peaks,
  so it's loud-but-safe, never clipping). The owner must be able to reach "too loud" and dial back.
  **Persist** it (localStorage) and apply on load; mute/unmute still works alongside it. **Display a
  precise, reportable value** next to the slider (show the underlying multiplier, e.g. `1.60×`, AND/OR a
  0–100 readout — the owner will read this off and tell the babysitter the good level).
- **Tempo slider (Settings).** A real slider that sets a **global music-tempo multiplier live** (scales
  every style's BPM: `mNext += (60 / (bpm × tempoMult)) / 4`). The owner says in-level music is "too
  fast/stressful" — so the range must go **clearly slower** (e.g. **0.4×–1.0×**, default ≤ current).
  Applies live to whatever music is playing (menu music in Settings, so it's audible there) and
  persists. **Display the exact multiplier** (e.g. `0.70×`) so the owner can report it. (If slowing the
  tempo alone doesn't fix "stressful," a later pass can also thin density — but tempo first, owner-led.)
- **Make it calibratable from Settings.** Both sliders must produce **audible change immediately** while
  on the Settings screen. Add a small **"Test sound"** button (plays a representative SFX, e.g. a
  correct-answer chime) so the owner can judge volume without entering a level; menu music covers tempo.
- **No-build + a11y + safety.** Plain `<input type="range">`; label each ("Volume", "Tempo") with the
  live value; ≥44px touch target; keyboard-operable; works under `data-ui="pixel"` (style the track/
  thumb to match, squared); the limiter stays wired so the louder range cannot clip. Reduced-motion
  irrelevant. Keep the existing Sound on/off toggle.
- **DoD:** Settings has a **Volume** slider and a **Tempo** slider, each with a **visible exact value**;
  dragging either changes the audio **in real time** (volume audibly louder/quieter across a wide range
  that reaches clearly louder than today; tempo audibly slower); both **persist** across reloads and
  apply on boot; a **Test-sound** button plays a sample; the limiter prevents clipping at max volume;
  `node -c` clean; the sound test asserts the volume slider maps to master gain over a wide range
  (reaching > today's 0.80, capped by the limiter) and the tempo multiplier scales the scheduler step;
  all gates green; 360px-safe; pixel-styled. (Babysitter: confirm the slider range genuinely reaches
  loud and the tempo genuinely slows; then the **owner reports the two values** → T114 sets them as
  defaults.)

### T114 — [A] Audio: set the owner-calibrated Volume + Tempo defaults + extend the volume range · status: DONE (`fdaeb25`)
**Owner's calibrated values (2026-06-21):** "volume definitely 2.5× **or more** as default; tempo 0.4
to 0.6." The owner **hit the slider max (2.5×) and still wanted more**, so the *range* is too low, not
just the default. Act on both:
- **Raise `VOL_MAX` 2.5 → 4.0** (sound.js) so the slider reaches "or more"; update the `volRange` `max`
  attribute (250 → **400**) in index.html to match. The −1.5 dB limiter still keeps it clip-safe.
- **Default master volume = 3.0×** (comfortably "2.5× or more", with headroom to 4×). Set the
  `loadVol()` fallback **80 → 300** (main.js) and the `volRange` initial `value` **80 → 300**
  (index.html). *(If 3.0× still isn't loud enough for the owner with the extended slider, bump the
  default further — owner to confirm; note: past ~3× it's mostly the limiter compressing harder, so if
  louder-still is wanted the deeper lever is raising the per-voice source gains / the limiter ceiling
  `LIMIT_DB`.)*
- **Default music tempo = 0.5×** (middle of the owner's 0.4–0.6). Set the `loadTempo()` fallback
  **100 → 50** (main.js) and the `tempoRange` initial `value` **100 → 50** (index.html). *(Re-confirm
  after T115 reworks the music — the calm-solve redesign may shift the ideal tempo.)*
- The sliders still let users adjust; a legacy profile with a saved `halves.vol`/`halves.tempo` keeps
  its value (only the **fallback default** changes for fresh installs).
- **DoD:** fresh-profile defaults are **volume 3.0× (300), tempo 0.5× (50)**; `VOL_MAX = 4.0` and the
  volume slider reaches it; existing saved prefs are untouched; `node -c` clean; **update
  `sound.test.js`** (the default-volume band + `VOL_MAX` assertion: default ≈ 3.0× in a ~2.5–4.0 band,
  `VOL_MAX = 4.0`); all gates green. (Babysitter: confirm a cleared profile boots loud (~3×) + calm
  (0.5×) and the slider now goes past 2.5×.)

### T118 — [A] BUGFIX: #game overflows (Skip key cut off below the fold) — T112 regression · status: DONE (`7a271a8`)
Owner (screenshot, timed level): the Skip key is **cut off at the bottom** of the game/solve screen,
with a large empty gap above the keypad. **Root cause (T112 regression):** `body` pads by the
safe-area insets (`padding: env(safe-area-inset-top) 16px env(safe-area-inset-bottom)`) AND T112 set
`.app{height:100dvh}` (dropping the old `max-height:780px` cap). So the app box is a full `100dvh`
**inside** an inset-padded body → `app + insets > 100dvh viewport`; the app's bottom is pushed below the
fold by ≈`top-inset + bottom-inset`. Non-scrolling screens (`#game` has no `overflow-y:auto`) clip their
last element — the **Skip** key. The old 780px cap accidentally masked this on tall phones; uncapped, it
bites (worse with an Android gesture-nav inset). The `flex:1` stage absorbing the slack is the empty gap.
- **Fix the app height to the *available* space.** Size `.app` so `app + body padding == viewport`,
  e.g. `.app{ height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom)) }` (keep
  the desktop `@media(min-height:1000px)` cap). The whole app — esp. `#game` — must fit with the
  **Skip key fully visible** and tappable. Keep T99's top-pin (no wasted top band) and T112's
  fill-the-screen win (no dead bottom band) intact — this is purely accounting for the insets.
- **Belt-and-braces for #game.** Ensure `#game` can never clip its bottom: the keypad+skip block is
  `flex:0 0 auto` and fully on-screen; if space is ever tight, the **stage** (the question area with the
  big gap) gives first (it already `flex:1`) — never the pad/skip. (Optional: cap the stage's grown
  height so the gap isn't cavernous, but the must-fix is Skip visible.)
- **Verify across the screens that don't scroll** (`#game`, `#arena` result, modals) — none should clip
  a bottom control; the scrolling ones (`#start`, `#results`, `#inventory`) stay fine.
- **DoD:** on the game screen the **Skip key is fully visible + tappable** at the Poco-X3 viewport
  (and with a bottom safe-area inset present); no screen clips its bottom control; no wasted top band
  (T99) and the home still fills the screen (T112); 360px-safe; `node -c` clean; all gates green
  (extend `home-layout`/a layout test to assert `.app` height subtracts the safe-area insets, so this
  can't silently regress again). (Babysitter: confirm Skip is reachable on the live build + the home
  still fills top-to-bottom.)

### T120 — [B] BUILD the `synth.js` generative-audio engine (phased, per T119) · status: DONE (`deb2e07`→`976e575`, all 5 phases)
Build the engine T119 recommends: a **new standalone B-owned `synth.js` → `window.Synth`** (no-build,
headless-testable, mirroring `fxgl.js`; feeds the **existing limiter** → destination). Work the §8
phased path, **one reviewable [B] increment per push** (Babysitter reviews each on a "does it sound
*good*, not just different" bar):
1. **Engine core** — `AudioContext`/bus setup, the `adsr` + filter/LFO **voice renderer**, the **patch
   table** (pad/pluck/bass/bell/lead/kit + the wub), Node test (patch→graph, ADSR shape). *(Biggest
   quality jump #1: real patches.)*
2. **Space** — **FDN reverb** (4–8 delay lines + damping LP) + sends + stereo width + **ducking**.
   *(Biggest quality jump #2: our sound is bone-dry today.)*
3. **Harmony** — key/mode, chord **progressions**, **voice-leading**, bass-follows-root.
4. **Rhythm/variation** — **Euclidean** kit, **Markov**/2nd-order melody, **motif development**,
   evolving + phrase-seeded density (no obvious loops).
5. **Contexts** — author the per-context specs: the **calm solve** set, menu, **Arena + `intensity()`**
   (intensifies toward the boss, shared signal with the FX layer), event, **victory wub-sting** — with
   the **calm-vs-energetic invariants as tests** (the firm rule, enforced).
- **Scope/ownership:** B-owned files ONLY — `synth.js`, `test/synth.test.js` (+ the research doc).
  **NEVER touch `sound.js`/any existing Halves file.** No sample assets; no-build; single lookahead
  scheduler (no timer/RAF leak); honour the existing master/limiter + the T113 volume/tempo (the [A]
  wire connects these). Log = `BUILDER-LOG-FX.md`/`BUILDER-LOG-AUDIO.md`.
- **Phase 6 = [A] wiring (separate task, Babysitter specs after the engine lands):** mount `Synth`,
  route screens/contexts (mirror `fxSetScreen`), fire the win-sting + duck music under SFX, keep/migrate
  the `Sound` SFX, retire the old music scheduler — all honouring mute + the T113 sliders + limiter.
- **DoD (per increment + overall):** `synth.js` is standalone (`window.Synth`, no existing-file edits),
  `node -c` clean, headless-tested (graph structure, one scheduler/no leak, deterministic from seed,
  patch distinctness, the calm-solve budget invariants); the engine demonstrably delivers **distinct
  patches + reverb/space + harmony + evolving variation** (the T119 quality levers), so it sounds
  **good**, not just different; all gates green. (Babysitter: review each phase; gate the whole on real
  audible-quality design, then spec the [A] wire.)

### T119 — [B] DEEP generative-audio research → principles + recommended engine architecture · status: DONE (`2e0a708`)
Owner: "can we do a task of deep research into generative audio and apply some principles here? what we
have so far is too simple and doesn't seem to be progressing." Routed to **Builder B** (idle; built the
`fxgl.js` engine — deep engine/research is its strength). Deliverable: **`docs/research-generative-
audio.md`** — an *applied* survey + a concrete recommendation, then the engine that follows.
- **Diagnosis to build on:** our synth is bare oscillators + linear-ramp gain envelopes, no filters/
  ADSR/reverb/harmony/variation. A's T115 improved per-context *config* (scale/density/timbre) but the
  *synthesis* is still simple, so distinct configs still risk sounding samey. Real depth needs new
  techniques, not more tweaks.
- **Research agenda (concrete WebAudio mappings, with references where possible):** (1) **synthesis
  depth** — ADSR via gain automation, `BiquadFilter` LP/HP with envelope + LFO mod (the wub is one
  case), detune/unison, FM/AM, additive, noise percussion, waveshaping; (2) **patch/instrument design**
  — distinct timbres (pad/pluck/bass/bell/lead/kit) so contexts differ by *instrument*; (3) **harmony**
  — chord progressions, voice-leading, bass-follows-root, modes-for-mood, harmonic rhythm; (4)
  **variation** — Markov/Euclidean/probability/seeded-evolving patterns/motif development (no obvious
  loops); (5) **calm vs energetic** — exactly what makes solve music calm vs Arena driving (our firm
  rule); (6) **MIXING & SPACE** — bus structure, **reverb** (algorithmic FDN or synth-impulse
  Convolver) + stereo width (likely the biggest quality lever vs our dry sound), duck-music-under-SFX,
  per-context balance; (7) **constraints** — pure WebAudio, **NO sample assets**, no-build, single
  lookahead scheduler, Android-Chrome CPU budget (Poco X3), headless-testability.
- **Recommendation (the point of the doc):** evolve `sound.js` vs a **new standalone B-owned audio-
  engine module** (mirror `fxgl.js`; A wires it) — with the voice/patch abstraction and how calm-solves
  + the wub + distinct Arena + genuine per-context character fall out. This decides the build path.
- **Scope/ownership:** **B-owned files ONLY** — the doc (+ a NEW module + headless test if B
  prototypes). **NEVER touch `sound.js`/any existing Halves file** (integration is an [A] task, like the
  FX wiring). No sample assets. Keep no-build + Node-verifiable.
- **DoD:** `docs/research-generative-audio.md` exists and is **substantive + applied** (concrete
  WebAudio techniques + references, not generic), covers the 7 areas, and ends with a **clear,
  actionable recommendation + architecture** Halves can build to (distinct patches, reverb/space,
  harmony, evolving variation, calm-solve + wub + Arena). If B prototypes, the module is B-owned + has a
  headless test (graph/scheduler/determinism/patch-distinctness) and touches no existing file. `node -c`
  clean on any new JS; all gates green. (Babysitter: judge the doc for genuine depth/applicability — it
  must give a builder enough to make the audio sound *good*, not just different — then sequence the
  build.)

### T115 — [A] Music with CHARACTER: calm solves · real variety · a "wub" win-sting · distinct Arena · status: DONE (`8d3f2b0`) · *(config-level pass; the principled rebuild is the T119 [B] track)*
Owner: the generative music "all sounds the same," there are no interesting variations, and **during
solves it's too fast/stressful**. Make the music **context-appropriate and distinctive** — not one
samey texture. **FIRM DESIGN RULE (record it): SOLVE music must be CALM** — solving is the
stress-sensitive moment; the in-game music must never add pressure. Different contexts should have
**different energy and character** (calm solve ≠ punchy celebration ≠ epic Arena ≠ pleasant menu).
- **Calm solve music (hard requirement).** The in-game/solve style (`setMusic` while on `#game`) must
  be genuinely **calm**: slow, **sparse** (low note density), soft timbre, **no driving/fast drums or
  busy arps**. Slower than the menu, gentle pad/bell feel. It should fade into the background, never
  race the solver. (This is independent of T113's tempo slider — calm BY DESIGN, the slider only fine-
  tunes.) Re-check every per-topic in-game style against this bar.
- **Real variety across contexts (fix "all sounds the same").** Differentiate the styles by **timbre
  (waveform mix), scale/mode, rhythm, and density** so menu / solve / Arena / event / celebration each
  have a **recognisable character** — not the same square-wave arp at a different BPM. Keep them
  pleasant + ≤ the calm budget where it matters (solves).
- **A "wub" celebration sting (owner's ask).** On **completing a topic** (a mastery/level-up moment)
  and on a **battle win**, play a short, fun **dubstep-flavoured bass-wobble** flourish — a synthesised
  LFO-modulated low-pass on a bass note (oscillator → biquad lowpass with an LFO on cutoff → a couple
  of "wub"s), **no audio sample files** (stay no-build/no-asset; pure WebAudio). Fire it on the real
  win/complete hooks (the same surfaces T112's FX burst uses — `finishBattle` win, the round-complete /
  mastery moment), capped/short, **respects mute + the master volume + the limiter**, reduced-stress
  (it's a reward, fun not harsh). Pairs with the existing celebration FX burst.
- **Distinct Arena music (owner: "something new in the arena").** Give the Arena its own recognisable
  character — more driving/epic than the calm solve music (the Arena is combat; energy is wanted here,
  unlike solves), distinct from the menu/event themes. May intensify subtly with region/boss to match
  the T108 Arena backdrop (optional, tasteful).
- **Stay synth + no-build + calibratable.** All WebAudio synthesis (no sample assets); the single-timer
  scheduler stays single-timer (no extra RAF/timer leaks); everything honours mute, the T113 master
  volume + tempo multiplier, and the limiter. Don't regress `sound.test.js`.
- **DoD:** solve music is **audibly calmer/sparser** than today (and than the menu) — verify a Node
  check that the in-game styles sit under a calm budget (low density / no fast-drum pattern / slow);
  the contexts are **measurably distinct** (different waveform/scale/rhythm signatures — not identical
  configs); a **"wub" sting fires on topic-complete AND battle-win** (Node check it's wired to those
  hooks, is bounded, and routes through the master/limiter, honouring mute); the **Arena theme is
  distinct** from menu/solve; no sample assets added (no-build preserved); single scheduler (no leak);
  `node -c` clean; all gates green (extend `sound.test.js` for the calm-solve budget, the per-context
  distinctness, and the win-sting wiring). (Babysitter: confirm solves are calm, the contexts sound
  different, and completing a topic/battle gives the fun wub — then owner ear-checks on the Poco X3.)

### T116 — [A] Restore the tree's scroll-affordance (the "more below" fade + cue) · status: DONE (`b184896`)
Owner: "one thing we've lost is the scrollable indicators — i.e. the gradient that shows the topic
tree can be scrolled." **Regression:** the scroll-fade affordance (`.picker-wrap.can-scroll-up/down`
edge gradients + the bobbing `.scroll-cue`) was wired to the **old list `.picker-wrap`**; when **T96**
made the home **tree-only**, the toggling JS was dropped and `#modeTree` (which scrolls via
`overflow-y:auto`) never got its own affordance. The CSS for the fades still exists — it just isn't
applied to the tree. It's now obvious because T112/T106 make the tree taller/more scrollable.
- **Re-wire the affordance to the tree.** Give `#modeTree` (or a thin wrapper around it) the top/bottom
  **edge-fade gradients** + the **bobbing down-cue**, shown **only when there's more to scroll** — reuse
  the existing `can-scroll-up`/`can-scroll-down`/`.scroll-cue` CSS pattern (don't invent a new one).
- **Toggle from real scroll state.** Add `updateTreeScroll()` that sets `can-scroll-up` when
  `scrollTop > 0` and `can-scroll-down` when `scrollTop + clientHeight < scrollHeight - 1`; call it on
  the tree's `scroll` (passive), **after `renderTree()`** (content changes height), and on
  `resize`/`orientationchange`/fullscreen-change (the T112 fill-height changes the clientHeight).
- **Keep it clean.** Fades are `pointer-events:none` (never block taps on nodes); honour reduced-motion
  (the cue animation already `@media`-guards); style under `data-ui="pixel"` consistently; 360px-safe;
  must not reintroduce a layout shift or cover the top/bottom nodes' tap targets.
- **DoD:** when the tree overflows, a **bottom fade + cue** shows "there's more below" and a **top fade**
  appears once scrolled down; both **disappear** when there's nothing more that way; works after the
  tree re-renders and on resize/fullscreen toggle; taps still hit nodes; reduced-motion safe; 360px-safe;
  `node -c` clean; all gates green (a small check that `updateTreeScroll` toggles the classes from
  scroll metrics). (Babysitter: confirm the fade/cue appears only when scrollable and tracks scroll.)

### T122 — [A] WIRE the `synth.js` engine into the app (make it audible) — phase 6 · status: DONE (`a4e81b8`)
The B-built `synth.js` (`window.Synth`) generative-audio engine is **complete** (T120 #1–#5: patches,
FDN reverb/space, harmony, rhythm/variation, contexts; 107 headless checks) but **standalone — nothing
plays it yet.** This [A] wiring makes it the live **music** engine (the moment the owner finally HEARS
it). Mirror the FX-wiring pattern; consume `Synth`'s API only (never edit `synth.js`).
- **Mount on the EXISTING audio context (one master/limiter).** Add `<script src="synth.js">` (before
  `main.js`; T107 versions it; register `test/synth.test.js` as a CI gate). On the audio-unlock gesture,
  **`Synth.mount({ ctx, dest })` reusing `sound.js`'s `AudioContext` + master/limiter** (the API takes
  `opts.ctx`) so music + SFX share one chain — the **T113 volume slider keeps controlling everything**
  and the **limiter still guards** the louder range. Guarded no-op if `Synth` is absent.
- **Synth is the MUSIC; `sound.js` keeps the SFX.** **Retire the old `sound.js` music scheduler**
  (`STYLES`/`startScheduler`/the 16th-note `setMusic` loop) so there's **only ONE music scheduler**
  (Synth's). Keep `sfx()` for game sound effects (don't regress them); the T115 `wub()` in `sound.js`
  is superseded by `Synth`'s `wub` patch/victory — remove the duplicate so the wub fires once.
- **Route each screen to a context** (mirror `fxSetScreen(name)`): `#game` → **`solve`** (the calm
  context — seed/vary per topic so topics still differ, but all CALM by construction); home/menu →
  **`menu`**; `#arena` → **`arena`** with **`Synth.intensity()`** driven by the same live boss-proximity
  the FX uses (`arenaFxState`); an event gauntlet → **`event`**. **Start on enter, `Synth.stop()` on
  leave** (one scheduler, idle off-screen — no leak).
- **Wins + ducking.** Fire the **wub win-sting** on the real win moments (Arena victory + topic-complete/
  mastery — the same hooks T112/T115 use) via `Synth` (victory context or `Synth.play("wub")`). **Duck
  the music under SFX/stings** (`Synth.duck()`), so effects cut through.
- **Sliders + mute.** The **T113 tempo slider** now drives `Synth`'s tempo (`setTempo`/context tempo ×
  mult); **volume** controls the shared master; **mute** silences both; **persisted prefs respected**.
  The **calm-solve firm rule holds** (solve context is calm by construction — don't re-introduce speed).
- **No-build + a11y + perf.** Plain `<script>`; ONE scheduler total (drop the old one — verify no double
  scheduler / no leak when navigating); reduced-motion is irrelevant to audio but keep autoplay-unlock;
  Android-Chrome CPU budget (the FDN reverb runs on the Poco X3 — `Synth.setQuality()` degrade if
  needed). Keep `contrast`/all gates green.
- **DoD:** the app's **music is `Synth`** (old `sound.js` music scheduler removed — only one scheduler
  runs); each screen plays its context (solve **calm**, Arena **drives** + intensifies near a boss, menu/
  event distinct); a **wub fires once** on a real win; **music ducks** under SFX; the **T113 volume/
  tempo sliders + mute** control the combined output and persist; SFX still fire; no double-scheduler/no
  leak (Node-checkable); `node -c` clean; **all gates green** incl. registering `synth.test.js`; 360-safe.
  (Babysitter: confirm on the live build there's ONE music engine = Synth, solves are calm, Arena drives,
  a win wubs, ducking works, and the sliders/mute still rule it — then it's owner ear-check time.)

### T127 — [A] BUG: "&amp;" shows literally in locked-topic text (double-escape) · status: DONE (`ed16b68`)
Owner (screenshot): the topic-info subline reads **"Master Add &amp; Subtract first"** — the `&` in the
topic name "Add & Subtract" renders as the literal entity. **Cause = double-escape:** `unlockReq(m)`
(`main.js:449`) already returns **escaped HTML** (`'Master '+esc(req.name)+' first'`), but
`renderTopicInfo` (`main.js:572`) escapes it **again** — `esc(unlockReq(m))` → `&amp;amp;` → renders as
`&amp;`. (The other caller, `:727`, correctly uses `unlockReq(m)` un-escaped.)
- **Fix:** at `main.js:572` drop the redundant `esc()` — `meta = ic("lock")+' '+unlockReq(m);` (consistent
  with `:727`, since `unlockReq` already escapes its dynamic parts and returns HTML).
- **Quick audit** for the same pattern: any `esc(...)` wrapped around a helper that ALREADY returns
  escaped HTML (e.g. `unlockHint`/`unlockReq`/similar). Don't touch the legit single-escapes of raw text
  (e.g. `:1065 esc(h.unlockHint)` where the hint is a plain string).
- **DoD:** "Add & Subtract" (and any name with `&`/`<`/`>`) renders **correctly** in the locked-topic
  subline (and anywhere unlockReq/unlockHint show) — no literal `&amp;`; still properly escaped (no XSS
  regression); `node -c` clean; all gates green (add a small check that a name with `&` renders a single
  `&` in the topic-info HTML, not `&amp;amp;`). (Babysitter: confirm the subline reads "Add & Subtract".)

### T125 — [A] FIX the celebration burst (it didn't render) + fire BIG on EVERY win/run/item · status: DONE (`c2296cf`)
**FIRST — the burst likely doesn't render at all (owner: "nothing at all, not even a small one" on an
Arena win).** Babysitter diagnosis: the burst controller `fxBurst` is built once in `setupFx()` (on the
ENTRY screen, **pre-fullscreen**) and is **never `resize()`d** — unlike the backdrop `fxBg`, which gets
`resize()` on every screen change. `burst()` self-starts its RAF, so the path runs, **but it renders
into a stale/wrong-sized (likely ~0/1×1) drawing buffer** after the Start→fullscreen viewport change →
invisible. (If `#fxBurst` had no layout size at construction, the backend inits at 1×1 and never
recovers.) **Fix the rendering:**
- **Resize the burst controller.** Call `fxBurst.resize()` after construction (once laid out), on
  **`window` resize**, on **`fullscreenchange`**, and **right before each `burst()`** (so the buffer
  always matches the current viewport — esp. across the Start→fullscreen transition). Do the same audit
  for `fxBg` if it's only resized on screen-change (a window/fullscreen resize should update it too).
- **Verify it's actually firing + ready.** Confirm `fxBurst` is non-null and `ready` when
  `fxCelebrateWin`/`fxCelebrate`/`fxCelebrateRank` run; confirm the RAF kicks and the backend draws.
  Add an integration check (stub FXGL) that an Arena win + a run finish + a new item each invoke a
  *rendering* burst on a correctly-sized controller (not a 1×1 buffer).
**THEN — make it BIG + on EVERY moment (owner: "loads of particles", constant):** Celebration bursts are
the **overlay** (`#fxBurst`, z-58) — **NO contrast dependency**, so this doesn't wait on T123.
Owner (revised): "we need a LOT more celebration. **every arena victory** is a celebration. **every
topic run** is a celebration. **every new inventory item.** I want loads of particles etc. I'm not
seeing anything like that, unless it's super subtle." (Owner confirmed the Arena *backdrop* does exist
— that's fine; this task is about the **celebration bursts**, which are currently over-gated + small.)
Pairs with **T126 [B]** (the engine's bigger "celebration" burst). Celebration bursts are the
**overlay** (`#fxBurst`, z-58) — **NO contrast dependency** (that's the backdrop), so this does NOT
wait on T123.
- **Fire on EVERY moment — remove the gates.** **Delete the `FX_RANK_MIN=6` rank gate** so **every
  completed topic run** celebrates (scale the size by rank — bigger for a great run — but **always fire
  something**, even a modest run). **Every Arena victory** celebrates (big). **Every new inventory item**
  (the `showUnlocks` path already covers collectible/loot/event gains) celebrates. No "decent run only"
  gating — the owner wants it constant.
- **Make it BIG — loads of particles.** Use **T126's celebration burst** at high count (the raised cap),
  bright palettes, a real shower/firework feel — not the brief faint flicker today. A topic-complete /
  Arena win should read as an unmistakable celebration. (If T126 isn't merged yet, A may ship an interim
  using the current `FXGL.burst` at max count, then adopt T126's bigger mode.)
- **Keep it usable.** Never covers the question/result text (T64 — the burst is sparse/overlaid, fades
  fast enough to not obscure); respects mute? (visual, so no) reduced-motion → a calmer reduced shower
  (engine handles it); idle when off-screen; perf budget holds on the Poco X3 (the higher cap is the
  T126 concern — A just fires it).
- **DoD:** **(0) the burst RENDERS** — `fxBurst` is resized (construction + window/fullscreenchange +
  before each burst) so it draws into a correctly-sized buffer across the Start→fullscreen transition
  (the root of "nothing at all"); a stub-FXGL integration check proves a win/run/item invokes a burst on
  a non-1×1 controller. **(1)** a **noticeable, particle-rich celebration fires on EVERY topic-run
  completion, EVERY Arena victory, and EVERY new inventory item** (verified live — the owner's "loads of
  particles" is the bar); scaled by rank but never absent on a completed run; never covers key text;
  reduced-motion-safe; idle off-screen; `node -c` clean; all gates green (`fx-wiring.test` updated: the
  `FX_RANK_MIN` gate removed → fires on every run/win/item, uses T126's big burst, + the resize wiring).
  (Babysitter: confirm on the live build that finishing ANY run and winning ANY Arena fight throws a big
  **visible** burst — the rendering fix is the crux.)

### T126 — [B] FXGL: a bigger "celebration" burst mode (loads of particles, real shower) · status: DONE (`2815188`)
Owner wants celebrations with **"loads of particles"** — the T94 burst was deliberately *brief + capped*
(`BURST_CAP=256`), which now reads as too subtle. Beef up the engine's celebration capability (B-owned
`fxgl.js`; A wires it via T125). Mirror the existing burst discipline.
- **A bigger, denser, longer celebration burst.** Add a celebration mode (or extend `burst()` opts):
  **raise the particle ceiling** well above 256 (e.g. a `CELEBRATE_CAP` ~600–1000) for the celebration
  path, **bigger + longer-lived particles**, a **firework/shower feel** (upward launch + gravity fall, or
  radial spray), brighter/peak palette. It must still read as a *burst that ends* (auto-stops), not an
  ambient loop.
- **Keep the invariants:** capped (the new higher cap), **seeded + deterministic**, **auto-stops + no
  RAF leak**, single-RAF, reduced-motion → a calmer/shorter shower, GPU→CPU fallback intact. Don't
  regress the existing ambient/`burst()` callers.
- **Perf:** the higher cap must stay within the Poco-X3 budget — instanced/animated-in-shader (no
  per-particle JS per frame), `setQuality` degrades the count. Confirm headless that one celebration is
  bounded and frees its buffer.
- **Scope/ownership:** B-owned files ONLY — `fxgl.js`, `test/fxgl.test.js`; never touch existing Halves
  files (the [A] wire is T125). Log `BUILDER-LOG-FX.md`.
- **DoD:** a `FXGL` celebration burst that's **visibly big (hundreds of particles, shower/firework)**,
  capped at the new ceiling, seeded/deterministic, auto-stopping, leak-free, reduced-motion-safe,
  `setQuality`-degradable; `node -c` clean; the fxgl gate extends to cover it; all gates green.
  (Babysitter: verify capped/deterministic/auto-stop/no-leak as for T94, just bigger.)

### T124 — [A] Fraction tree-glyphs still illegible — make them bigger/clearer using the node width · status: DONE (`583130c`, CI green, BROWSER-VERIFIED)
**DONE 2026-06-21** — APPROVED (REVIEW.md). `glyphs.js` draws the `f12`-style slashed vulgar fractions
full-size/legible at node size. Babysitter browser-verified (screenshot @ dpr 2.75): the `x/2` Halves node,
`1/2n`, and `a/b` fractions all render as crisp readable slashed fractions. `glyphs.test` updated; CI green.
Owner (screenshot, tech-tree): the fraction topic glyphs are **still bad at node size** — esp. the
**second** (the standalone Fractions node), and "there's a lot of horizontal space for it to take up
that could make it more clear." T104 replaced the stacked vulgar-fraction with a **5-wide diagonal
slash** + SMALL (3×4) digits — better than the stack, but at the ~node glyph size it's still a tiny
cramped blob, and the **wider tree-v2 nodes (96px)** leave the fraction under-using the available room.
- **Affected glyphs:** `fractionsof` (`½n`) and `fractions` (the standalone `¾`/`½`), and any other
  fraction token (`f12`/`f34`). The slashed `a/b` (Fractions II) reads fine — it uses full-size chars.
- **Make the fraction read clearly at node size — use the space.** Draw the fraction **larger** (bigger
  numerator/denominator — ideally the full-size digit set, not the 3×4 SMALL one — with a clear slash or
  bar), scaling to use the node's horizontal width instead of a cramped 5-cell box. For `½n`, the `½`
  should be an unambiguous, legible fraction sitting beside a full-size `n`. Whatever reads cleanly as
  the right fraction; keep the amber accent.
- **Check the worst case = the tree node (~the size in the screenshot)**, plus the topic-info row + any
  other place the glyph renders. Other (non-fraction) glyphs unchanged.
- **DoD:** the Fractions (`¾`) and Fractions-of (`½n`) marks are **unambiguously readable as fractions
  at the tree-node size** (the owner can tell which fraction at a glance), using the node's width; the
  slashed `a/b` still fine; favicon/other marks unaffected; `node -c` clean; `glyphs.test` updated for
  the new fraction rendering; all gates green; 360-safe. (Babysitter: compare the fraction nodes at the
  live node size — must read as the fraction, not a blob — this is the 2nd attempt after T104, get it
  clearly right.)

### T130 — [B] Golden-snapshot harness for deterministic engine output (brickmap-style render regression) · status: DONE (`ba919db`, CI green)
**DONE 2026-06-21** — APPROVED (REVIEW.md). Harness landed: `test/golden-util.js` (`check()` +
`UPDATE_GOLDEN=1` regen + "first change at line N" hint), `test/golden-fx.test.js` (FXGL CPU-still: home/
frost/arena-boss/burst/celebrate signatures — 16 checks), `test/golden-synth.test.js` (per-context scores
+ distinctness `{distinct:4, all_distinct:true}` — 10 checks), `test/golden/*.json`. Babysitter verified
**independently**: both gates green AND a **mutation test** (tampered a synth golden) → harness CAUGHT it
(non-zero exit). The distinctness golden directly guards T128's "all contexts sound the same."
**Caveat — DoD's "gates wired into `pages.yml`" is split out:** B can't touch `pages.yml` (A-owned,
collision rule), so registration is **[A] `T131`** below. Until T131 the gates run locally only (correct
+ green, not yet enforced per-push).
Owner: "brickmap uses a golden render — checks the render of various things stays consistent and new
things show up. Could be learned from." This is the structural fix for our recurring **"green gates,
broken feature"** gap (T118/T125/T128 — see ORCHESTRATION's output-feature rule): source-grep gates
don't catch output regressions; **golden snapshots of actual output do.** Builder B has brickmap access
and owns the engines — study brickmap's golden-render, then build the Halves-adapted, no-build version.
- **Study brickmap's golden-render** (in `00-1/brickmap`): how it captures reference renders, compares,
  and updates them; what's worth porting vs what's GPU/native-specific.
- **Build a no-build, Node golden harness** (B-owned new files — a small helper + golden fixtures +
  tests; never touch existing Halves files). An `UPDATE_GOLDEN=1` (env) path **regenerates** the goldens
  (the "new things show up" workflow); the default run **compares** and **fails** on an unexpected
  change. Goldens are small, committed, diff-reviewable (hashes or compact serialisations, not huge
  binaries).
- **Apply to what's deterministic + headless (no GPU/browser):**
  - **FXGL CPU-still backend** — render a few representative scenes + a `burst()` + a `celebrate()` at
    fixed seeds to the CPU ImageData path; snapshot a compact pixel signature (downsampled grid / hash).
    Catches FX render-logic regressions.
  - **Synth scores** — snapshot the deterministic scheduled-event "score" (the first N steps' notes/
    times/patches) for **each context (solve/menu/arena/event)** at a fixed seed; assert each is
    **stable** AND **mutually distinct**. *(This class of golden would have caught T128's "every context
    sounds the same" — make distinctness an explicit golden assertion.)*
- **Scope note (don't over-reach):** GPU-only paths (WebGL/WebGPU) and full-page layout need a real
  browser (Puppeteer) — **out of scope here** (keep CI light/Node-only); note them as a possible future
  opt-in. Glyphs/icons goldens are a possible later [A] adoption of this harness.
- **DoD:** a committed golden harness + gates wired into `pages.yml` that (a) **fail** when an FXGL CPU
  render or a synth context-score changes unexpectedly, (b) **pass** after an intentional `UPDATE_GOLDEN`
  regen, (c) include a **synth context-distinctness** golden (solve≠menu≠arena≠event); goldens are
  compact + diff-reviewable; `node -c` clean; all gates green; B-owned files only. (Babysitter: confirm
  the harness actually catches a deliberately-mutated render/score, and that the distinctness golden is
  real — this is the gate that starts closing the output-verification gap.)

### T131 — [A] Register the golden gates (`golden-fx` + `golden-synth`) in `pages.yml` · status: DONE (`406acfe`, CI green)
**DONE 2026-06-21** — APPROVED (REVIEW.md). 4 lines added at `pages.yml:93–96`: `node test/golden-fx.test.js`
+ `node test/golden-synth.test.js` in compare mode (no `UPDATE_GOLDEN`). CI run `27916460481` for `406acfe`
green → both golden steps ran + passed; the T130 harness is now enforced on every push. Only `pages.yml`
touched.

> Follow-on from T130 (B built the harness but can't touch `pages.yml` — collision rule keeps it [A]-owned).
The two golden gates currently run only locally; enforce them on every push.
- **Add to the CI gate list in `.github/workflows/pages.yml`** the two new tests **`node test/golden-fx.test.js`**
  and **`node test/golden-synth.test.js`** (same pattern as the existing `fxgl.test`/`synth.test` gate
  lines — run them with the other `node test/*.js` gates, fail the deploy on non-zero exit).
- **Do NOT set `UPDATE_GOLDEN`** in CI — CI must run in **compare-and-fail** mode (regen is a local,
  intentional, diff-reviewed action only).
- **DoD:** `pages.yml` runs both golden gates on every push (compare mode); a green CI run shows both
  executing + passing; no other gate dropped; `.github/workflows/pages.yml` is the only file touched
  ([A]-owned). (Babysitter: confirm in the CI logs that both golden gates actually ran, not just that the
  file was edited.)

### T129 — [A] Settings: a MUSIC SWITCHER to sample every style + test switching · status: DONE (`8cfa11d`, CI green)
**DONE 2026-06-21** — APPROVED (REVIEW.md). Settings now has a labelled a11y button group (Menu·Solve·
Arena·Event, `aria-pressed`, ≥44px grid) beside Volume/Tempo; `synthSwitchContext(name)` drives the
engine's **distinct** built-in context via `Synth.setContext(name)` (own progression/patches/reverb incl.
Arena wub — not the flat `musicSpec()`) + T113 tempo; a transient `musicPreview` previews in Settings and
reverts to per-screen music on exit. Babysitter verified independently: `node -c` clean, 3 new ids
present, `synth-wiring.test` 25→45 (each pick calls setContext live; Event=lydian/own-progression; own
reverb; reverts on exit), full 36-gate suite green. **The switcher did its diagnostic job — it surfaced
T128(1): the swap is distinct but lags to a phrase boundary (synth.js adopts `M.spec=M.want` only at
`synth.js:395`; A can't fix synth.js — [B]-owned). Filed [B] `T132` for the immediate-swap lever
(`setContext(name,{now:true})`); A wires `{now:true}` from the switcher + per-screen routing once it
lands.** *(Owner: each style is genuinely different now; it'll feel instant once T132 lands.)*

### T132 — [B] `synth.js` immediate-context-swap lever (`setContext(name,{now:true})` / `swapNow()`) · status: DONE (`995cd28`, CI green)
**DONE 2026-06-21** — APPROVED (REVIEW.md). `Synth.setContext(name,{now:true})` + `Synth.swapNow()` force
`M.spec = M.want` immediately, re-align to a downbeat (`M.step`/`M.phrase`→0), reset melodic state +
reseed → new context takes effect on the next scheduled step (≤1 step), no click/dropout (lookahead notes
finish, only the generator switches). Default no-`now` phrase-boundary swap unchanged. Added
`Synth.musicState()`. Babysitter verified independently: `node -c` clean; `synth.test` 111→120 with
assertions that **genuinely distinguish ≤1-step from ≤1-phrase** (default test: mid-phrase stays old mode,
flips only after the boundary; `{now}` test: flips mode/tempo + `step===0` immediately, next step plays
from new generator); `golden-synth` 10/10 **unchanged** → default path not perturbed. **Unblocks [A] T128:
wire `{now:true}` from the T129 switcher + per-screen routing.** *(Original spec below.)*
- Surfaced by T129's switcher: styles ARE distinct but the scheduler adopts `M.spec = M.want` **only at a
  phrase boundary** (`synth.js:395`; the immediate path fires only on first-ever music, `!M.spec`), so a
deliberate `setContext` lags up to ~one phrase (~8–11s) — which the owner reads as **"music never
changes."** This is the true root of that complaint; A wired T129 correctly but cannot touch synth.js
(B-owned), so the fix is here.
- **Add an immediate-adopt path:** `Synth.setContext(name, { now: true })` (and/or a `Synth.swapNow()`):
  when `now`, set `M.want` then **force `M.spec = M.want` immediately** and re-align the phrase counter
  (reset `M.step` to a bar/phrase start) so the new context's harmony/patches/reverb take effect on the
  **next scheduled step**, not the next phrase.
- **No click/dropout:** respect the existing lookahead window; don't tear down voices mid-note — let
  already-scheduled notes finish, switch the *generator* now. The default (no `now`) must keep the
  current musical phrase-boundary swap unchanged.
- **DoD:** `setContext(name,{now:true})` makes the next scheduled step already reflect the new context's
  score (≤1 step, not ≤1 phrase); default behaviour unchanged; a golden/unit assertion proves the
  immediate swap (extend `test/golden-synth.test.js` or `synth.test.js` — e.g. next-step events after a
  `{now:true}` switch match the target context and differ from the prior); `node -c` clean; all gates
  green; B-owned files only (`synth.js` + tests + `BUILDER-LOG-FX.md`). (Babysitter: confirm the test
  actually distinguishes ≤1-step from ≤1-phrase, and that A can then wire `{now:true}` for an instant
  switch.)

### T129-superseded-marker — (kept for history; original DoD below)
Owner: "add a music switcher to Settings next to the other audio settings, so I can sample all our
audio styles and test the switching works." Both a real feature AND the **diagnostic instrument for the
T128 music-swap bug** — if this switcher audibly changes the music, the engine swap works and T128(1) is
just the per-screen routing; if it doesn't, the bug is deeper (engine/`setContext`). Build it FIRST.
- **A switcher row in Settings** (beside the Volume / Tempo sliders + Test-sound button). Lets the owner
  pick a music style and **hear it immediately** — at minimum the engine's distinct contexts: **Menu ·
  Solve · Arena · Event** (use the real `Synth.setContext("menu"/"solve"/"arena"/"event")`, the distinct
  built-in contexts with their own progressions/patches — NOT the `musicSpec()` partial specs). Show
  which is selected. (Optional: a "Topic ▸" cycle to sample the per-topic seeded solve variations.)
- **It must actually switch live.** Tapping a style calls `setContext` (+ the T113 tempo) so the running
  music swaps **promptly** (if the engine only swaps at a phrase boundary and that feels too slow/never,
  that's the T128(1) bug surfaced here — fix so a deliberate switch is near-immediate). While in
  Settings the switcher drives the music; on leaving Settings, normal per-screen music resumes.
- **No-build + a11y:** plain buttons/`<select>`, labelled, ≥44px, keyboard-operable, `data-ui="pixel"`
  styled; honours mute (no sound when muted); guarded no-op if `Synth` absent.
- **DoD (LIVE-verified — output feature, gates necessary-not-sufficient):** Settings has a music
  switcher that **audibly plays each distinct style** and **switches promptly** when you pick one;
  reverts to per-screen music on exit; each style is genuinely different (proves/forces the per-context
  distinctness from T128(1)); `node -c` clean; all gates green (assert the switcher calls
  `Synth.setContext` with each of the 4 contexts; assert the contexts it uses are the engine's distinct
  ones). (Babysitter: confirm on the live build that picking each style changes the music — this is also
  how the owner verifies T128.)

### T128 — [A] LIVE BUGS: music never swaps context · no wub on win · no celebration visuals · status: DONE (1)+(2) (`61654ed`); (3)→[B] T133 · OWNER-PRIORITY · BUG
**(1)+(2) DONE 2026-06-21** — APPROVED (REVIEW.md). **(1)** `musicForScreen` now routes every screen
through `synthSwitchContext` → `Synth.setContext(name)` (distinct built-in contexts — own progression/
reverb/patches incl. Arena wub bass; solve varies per topic via seed), dead `musicSpec()`/`SYNTH_BPM`
removed, **T132 `swapNow()`** wired → instant ≤1-step swap. **(2)** `wubSting()` now calls
`Synth.sting("victory")` (wub swell + bell arp on the **un-ducked sfx bus**) instead of the old
self-ducking wub-on-music-bus bug. Babysitter verified independently: `node -c` clean; distinct contexts
backed by `golden-synth` distinctness + T132 ≤1-step test; `sting("victory")` confirmed a real un-ducked
engine path (`synth.js:458`); `synth-wiring.test` 45→52 + `events.test` updated; full 34-gate suite green.
**🔊 owner ear-check pending** (output features — necessary-not-sufficient gates). **(3) celebration →
split to [B] `T133`** (overlay-context render, engine/device — A's `fxBigBurst`/`celebrate()` wiring is
correct + tested, waiting on the overlay context). *(Original spec below.)*

> Owner tested the live build (synth music is loud + nice): **"music never changes — same as menu in
topics/arena (I expected different); no dubstep wub on victory; no celebration visuals, not even
subtle."** All THREE pass our headless gates yet fail live — **the gates verify the wiring *calls*
exist in source, not that music swaps / the wub sounds / pixels render.** ⇒ **This task MUST be verified
in a real browser (the owner's symptoms are the bar), not by green gates.** Babysitter leads below.
- **(1) Music never changes per screen.** `show(name)→musicForScreen(name)` looks correct (game→solve,
  arena→arena), and the engine swaps `M.spec=M.want` at a phrase boundary. BUT the wiring builds partial
  specs via `musicSpec()` that pass **no `progression`**, so the engine falls back to the SAME default
  `[0,5,3,4]` for every context → solve/menu/arena share harmony and differ only by mode/tempo/density
  (too subtle / maybe not swapping at all). **Fix:** drive the engine's **distinct built-in contexts**
  — prefer **`Synth.setContext("solve"|"menu"|"arena"|"event")`** (synth.js CONTEXTS already define
  per-context `progression`/reverb/patches — incl. the Arena's **wub bass**) instead of
  `setMusic(musicSpec())`; apply the T113 tempo multiplier on top (a tempo override / `Synth.setTempo`).
  Then **confirm LIVE** the music is audibly different in a topic vs the Arena vs the menu, and that it
  actually swaps on screen change (if the phrase-boundary swap is too slow/never fires, make a context
  change swap promptly).
- **(2) No wub on victory.** `wubSting()→Sy.play("wub", null, {midi:36,dur:0.6,bus:"music"})` is wired
  on Arena win + topic-complete. Verify **live** it actually fires AND sounds like a wub: check
  `Synth.play` honours `opts.midi`/`dur`/`bus`, and that the **`wub` patch's LFO→filter wobble** actually
  triggers via `play()` (the patch defines the LFO, but `play()` may not run the ambient-style LFO path —
  if the wobble only happens in the scheduler, `play("wub")` gives a flat bass, not a "wub wub"). If the
  patch/engine needs a change to wobble on a one-shot, that's a **[B] fxgl/synth** fix — flag it.
- **(3) No celebration visuals (still, after T125's resize fix).** The burst overlay renders nothing
  live. Repro in-browser and find why: is `fxBurst` actually `ready` with a live backend when
  `celebrate()` fires? Does a **second WebGL context** (`#fxBurst` separate from the working `#fxBackdrop`)
  fail/never present on the device? Is the canvas occluded / 0-opacity / mis-stacked? Likely fixes: share
  ONE canvas/context for backdrop+burst (composite the burst over the backdrop), or ensure the burst
  context initialises + presents. (If it's an engine limitation, the burst-on-shared-context may be a
  **[B]** change — flag it.) The bar: a **visible** shower on a real win/run/item.
- **DoD:** verified **on the live build** (state which device/how): (1) topic / Arena / menu music are
  **audibly distinct** and swap on screen change; (2) a **wub fires + wobbles** on an Arena win and a
  topic-complete; (3) a **visible particle celebration** appears on a win/run/new-item. `node -c` clean;
  all gates green; **and** add checks that are more than source-greps where feasible (e.g. assert the
  wiring calls `setContext`/distinct progressions per screen; a headless check the burst controller is
  `ready` + sized before `celebrate`). (Babysitter: I will treat green gates as necessary-not-sufficient
  here — confirm against the owner's three live symptoms.)

### T141 — [B] RESEARCH pass: musical styles → a concrete, distinct 12-style palette (precedes T139) · status: DONE (`02d2d6f`) — palette out for OWNER thumbs-up
**DONE 2026-06-21** — APPROVED (REVIEW.md). `docs/research-music-styles.md`: genre DNA → engine-recipe for
10 new styles + the 2 kept, cited, with the small patch additions flagged (tempo-synced wub wobble, `chip`
square-pluck, optional swing, victory drop). Concrete 12-style palette table (menu+arena kept; 10 new incl.
dubstep victory; ≥2 calm, ≥2 festive; spread tempo 60→174, 8 modes, reverb 0.04→0.55). Doc-only,
collision-clean; included in green HEAD `42aac3b` (own run auto-cancelled by T142's push). **Babysitter
surfaced the palette to the owner for approval before T139 builds it.**

> Original task below.
Owner: **"we should probably do a research pass on musical styles to really get those 10 new styles unique/
interesting."** Same pattern as T119 (audio research) → T120 (engine): research first so the styles are
genuinely characterful, not parameter nudges.
- **Research the genre DNA** of a spread of styles (≥ the ~10–12 we'll ship), each: defining **tempo range,
  mode/scale & typical progressions, rhythmic feel (straight/swung/half-time/breakbeat/Euclid pattern),
  instrumentation/register, and the production tricks that make it recognisable** (e.g. dubstep = half-time
  ~140 with a LFO-wobble sub on the off-beats + a drop; chiptune = fast square/pulse arps, no reverb; lo-fi
  = swung ~75, jazzy 7th chords, soft, wow/flutter; synthwave = ~110 gated saw arp + bright lead; DnB =
  ~174 breakbeat + sub; ambient = drone, very wet, no kit; etc.). Cite/borrow recipes (brickmap-style: take
  the technique, not the asset).
- **Map each to THIS engine's levers** — what's achievable with the current patches (pad/pluck/bass/bell/
  lead/wub), modes, Euclid kit, ADSR, FDN reverb — and **call out any small engine additions** a style needs
  (e.g. a pulse/square patch for chiptune, a half-time wobble for dubstep, a noise-sweep) so T139 can build
  them. Keep it no-build / Node-verifiable / a11y-safe.
- **Output:** a **B-owned research doc** (e.g. `docs/research-music-styles.md`) ending in a **concrete
  proposed style table** — the final **12** (menu + arena kept; 10 new incl. the **dubstep victory** + ≥1
  calm for solves + ≥1 festive), each with its name/label and its engine-parameter recipe (mode/root/tempo/
  density/progression/kit/patches/reverb). This table is the spec T139 implements.
- **DoD:** the research doc + the 12-row proposed palette table (distinct, characterful, engine-mappable,
  any needed patch additions flagged); `node -c` clean if any code touched (doc-only is fine); **B-owned
  files only**. **The Babysitter surfaces the proposed palette to the owner for a quick thumbs-up before
  T139 builds it** (owner may swap a style). Then → **T139** implements.

### T160 — [A] Arena: per-enemy-death VFX (localised) + slow the battle playout a touch · status: DONE (`1c949e0`) · APPROVED· OWNER-REQUESTED
Owner (2026-06-22, on the live Arena 3v3): **"add some VFX on each enemy death, localised at the location of the
defeated enemy. And slow down the battle animation a touch."** Both are small, contained tweaks to the **T90
playout** (`playBattle`/`applyEvent` in `main.js`, ~L1421-1486) — **no engine change** (T152[B] already gave us
localised small bursts; reuse the existing `fxBigBurst` + the `elCentre(el)` helper at main.js:266). **[A]-only.**
- **(1) Death VFX, localised.** The KO is already detected in `applyEvent(ev)` (main.js:1468):
  `if(ev.ko && cellEl[k]) cellEl[k].classList.add("ko")`. **There** — when a **FOE** is KO'd (`ev.tSide === 1`)
  — fire a **localised burst at that foe's cell**: `const c = elCentre(cellEl[k]); fxBigBurst({ x:c.x, y:c.y,
  count: <modest, ~140-220>, palette: <enemy-type colour + a bright impact white>, sizePx: FX_SMALL, spread:
  <~0.7 so it HUGS the cell, not the screen> });` Use the foe's **type palette** (the `t-<type>` colour already
  on the cell, or `HERO_PAL`/monster type colour) so a Brawn death reads differently from a Mind death; a brief
  impact-white core is nice. Keep it SMALL + tight (this is a death puff at a 36px portrait, not a victory
  shower). The existing `.ko` dim stays. **Scope: ENEMY deaths only** (owner said "each enemy death"); a subtler
  hero-death cue is OPTIONAL/out-of-scope — don't add screen-wide noise.
- **(2) Slow the playout a touch.** The pace is one line (main.js:1474):
  `STEP_MS = Math.max(90, Math.min(360, Math.round(2600 / log.length)))`. Bump it modestly — e.g. budget
  **2600 → ~3800-4200**, floor **90 → ~130**, ceiling **360 → ~480** — so each strike/KO is easier to read.
  "A touch", not sluggish; keep it **skippable** (the Skip button) and keep the **reduced-motion/headless
  instant path** untouched. Tune to feel on the live build.
- **Timing nuance:** fire the death burst at the MOMENT the KO event is applied during playout (inside
  `applyEvent`), at the cell's live `getBoundingClientRect` (cells don't move, so the rect is stable). Guard for
  `fxBurst` absent (the helper already no-ops). Don't fire on the final instant-resolve path (that still uses
  `fxCelebrateWin` for the overall victory — keep that; the per-death puffs are additive *during* the fight).
- **DoD:** each foe KO during the watchable playout spawns a small, tight, type-coloured burst centred on that
  foe's cell (not screen-centre); the playout is perceptibly-but-modestly slower; Skip + reduced-motion paths
  intact; `node -c` clean; `$("id")`/selectors valid; a `fx-wiring`/`arena3` assertion that a foe-KO event
  triggers a localised burst at the foe cell (centroid ≈ the cell, small `sizePx`) — turn it into a gate, not
  just a visual. **[A]-only** (`main.js`, arena tests). **Verify:** browser-confirm the per-death bursts fire
  from the foe cells when the harness is back; until then the owner confirms on the live build + the wiring gate.
  **⚠ Sequence after the trust fixes** — land **T161** (truthful build marker) + **T158** (no-store nav) first so
  this VFX actually reaches the owner's clients and they can confirm via a truthful build number. Sequence:
  T161 → T158 → T160.

### T159 — [A]-led / [B]-support: fix the foghorn on AudioContext resume (app-switch / cold-start) · status: DONE (`aa583b8`) · APPROVED· 🔴 BUG (now REPRODUCIBLE)
**Owner (2026-06-22): "the foghorn came back on PWA when switching between apps."** (Earlier: foghorn on first
launch, gone on relaunch.) **Upgraded from transient-investigation to a real, reproducible bug** with a clear
trigger: **backgrounding the PWA and returning** (app-switch) → the OS **suspends the AudioContext**, and on
resume the engine comes back **in a bad state** → a loud sustained low drone (a voice/reverb tail that survived
the suspend and blasts on resume, or the context resuming mid-scheduled-note). The repro is now an **app-switch /
`visibilitychange` resume**, not just cold start — so it's testable by simulating suspend→resume, not only a
fresh install.
- **[A] (wiring/timing — `main.js`):** audit the cold-start audio path — `audioUnlock()` / `warmAudio` (T101) /
  `musicForScreen` / `applySoundPref`. On a cold PWA launch the `AudioContext` may start **suspended** or resume
  late; ensure (a) **nothing schedules/sounds before `ctx.state === "running"`** and the synth is fully wired
  (no voice started against a not-yet-running/garbage context), (b) the music start is **idempotent** — a
  re-entrant `warmAudio`/`musicForScreen` can't stack a second droning context or leave an unreleased pad, (c)
  on `visibilitychange`/resume the engine **re-syncs cleanly** (no stuck tail). Add a guard: if `ctx.sampleRate`
  is unexpected/0 or the context isn't running, defer the first note rather than playing into a bad context.
- **[B] (engine robustness — `synth.js`, only if the wiring audit points here):** make the engine **safe against
  a bad/again-init**: a `panic()`/all-notes-off that releases every active voice + zeroes the FDN state, called
  on (re)start; ensure no voice is created with a non-finite freq/gain; confirm the master **limiter** can't be
  driven into a sustained buzz by a single runaway input (hard-clip ceiling). These are cheap insurance even if
  the root cause is timing.
- **DoD:** a concrete, reasoned hardening of the cold-start path (idempotent start + running-context guard +,
  if warranted, an engine `panic`/voice-cap) with a Node test simulating a re-entrant/suspended-context start and
  asserting no duplicate/stuck voice is scheduled; `node -c` clean; owner confirms no first-launch foghorn on a
  fresh install. Respect the partition: **[A] owns the `main.js` wiring**; any `synth.js` change is **[B]** — I'll
  split it into a [B] line if the audit lands there. *(If the audit finds nothing actionable + it never recurs,
  close as NOT-REPRODUCIBLE with the hardening guards kept.)*

### T166 — [A] **BUG (live regression):** config submenus EXIT the config instead of navigating (T157 back-nav) · status: DONE (`0aca3ee`) · APPROVED· 🔴 DO-FIRST
**Owner (2026-06-22, on PWA): "the menus in the config are now broken — they just exit the config instead of
going to that menu. Maybe related to the work done around supporting the back arrow? Assuming that changed
routing."** Almost certainly a **T157** (`1a3e3fb`) regression: T157 made **every `show()` push a history
sentinel** AND routes the config submenus through the hash (`#/audio`/`#/graphics`/`#/settings`), so a single
forward nav now creates **TWO history entries** (the hash entry + the sentinel) and the `popstate` handler
re-navigates by `BACK_PARENT` and **pushes more state during the popstate** — the cursor/stack gets inconsistent,
so a back (system gesture or the in-app `audioBack`/`graphicsBack` `←`) **over-shoots its parent and exits the
config** (audio → should go to settings, instead drops to home/out). *(The forward routing in `applyRoute`
reads correct in isolation; the bug is the sentinel ↔ hash ↔ popstate interaction.)*
- **Repro (builder, in a browser — harness was flaky for the Babysitter this session):** home → Settings →
  Sound (audio) → press the in-app `←` (and the Android/system back): assert you land on **settings**, not home;
  then settings-back → home; then home-back → confirm-exit. Currently it skips straight out.
- **Fix direction:** the **sentinel-on-every-`show()`** + **double-stacking (hash entry + sentinel)** is the
  smell. Rework so forward nav and back are **consistent** — e.g. keep **exactly ONE trailing sentinel** (don't
  push one on every `show()`; manage a single sentinel and re-push exactly one after a popstate-driven nav), OR
  drive the whole screen stack from the hash/route as the single source of truth (no separate sentinel). Ensure
  `audio`/`graphics` back → `settings`, `settings` back → `start`, `start` back → confirm-exit, in BOTH the
  system-back and in-app-`←` paths.
- **DoD:** config submenus navigate correctly (forward AND back) in a browser tab AND standalone; a **Node test
  simulating the history/popstate sequence** (mock `history` + `popstate`) asserts `settings→audio→back==settings`
  (not home) and the full chain; `node -c` clean; browser-tab + headless unaffected; **[A]-only** (`main.js`,
  a nav test). **Verify in a real browser** (the harness; or owner confirms on PWA).

### T167 — [A] Launch/fullscreen behaviour by runtime context (entry screen kept in ALL modes) · status: DONE (`9722cb4`) · APPROVED· owner-spec (revised 2026-06-22)
**Owner REVISED the design: KEEP THE LAUNCH/ENTRY SCREEN IN ALL MODES** (browser, PWA, and the packaged app) —
*"we don't want to miss the music"* (the entry tap is the Web-Audio unlock gesture; without it the music starts
late). The only thing that varies by context is **how fullscreen is reached:**
1. **Browser tab → a CHOICE** (the original): keep BOTH entry options — **"Play in fullscreen"** (`#entryFs` →
   `requestFullscreen()` + audio unlock) AND a windowed **"Tap to begin"** (`#entryPlay` → audio unlock only).
   *(T156 already leaves both in a browser tab — just confirm windowed still works + the FS one enters fullscreen.)*
2. **Installed PWA → ONE option:** a single "Tap to begin" (T156 already hides `#entryFs` when installed) whose
   tap does **audio unlock + `requestFullscreen()`** (gesture-required; the manifest `display:"fullscreen"` alone
   didn't hide the owner's Android bars).
3. **Packaged app (TWA) → ENTRY SCREEN STILL SHOWN** (for the audio gesture), but the window is **ALREADY in
   native immersive fullscreen at launch — no button press needed for fullscreen.** The entry tap just unlocks
   audio. Fullscreen here comes from the **TWA wrapper's native immersive config, NOT from the web code** — so it
   is fullscreen *before* and *independent of* the tap. *(Owner: "twa will still start in fullscreen without the
   button press if that's possible" — yes: configure the TWA for immersive/`display:fullscreen` at the packaging
   step.)*
- **Web-app code (this task):** entry screen shown in every mode; **browser** = 2-way choice; **installed/
  standalone** (PWA or TWA) = single "Tap to begin" → audio + best-effort `requestFullscreen()` (harmless/
  redundant inside a TWA that's already immersive). A `launchMode()` helper (`"browser"` vs installed via
  `display-mode` matchMedia) is enough; distinguishing TWA via `document.referrer` `android-app://` is OPTIONAL
  (only if we want to skip the redundant `requestFullscreen` in a TWA — not required, the call is a harmless
  no-op there).
- **Packaging note (moves to T72/T103, NOT this task):** the TWA must be built with **immersive / edge-to-edge
  fullscreen** (Bubblewrap/PWABuilder `display: "fullscreen"` + Android immersive sticky) so it launches
  fullscreen with the entry screen already covering a fullscreen window. Capture this requirement there.
- **DoD:** entry screen appears in browser AND installed/standalone (NOT skipped anywhere); browser keeps the
  2-way choice; installed PWA = single tap → audio + fullscreen; no stray FS button reappears; `node -c` clean; a
  Node test asserts `launchMode()` mapping + that the entry is shown in every mode; **[A]-only** (`main.js`,
  `index.html`). **Verify:** owner confirms browser (both options) + installed PWA (single tap → fullscreen). The
  TWA launch-fullscreen is confirmed once packaged (T72/T103, immersive config).

### T164 — [A] Audio: only switch music when the TRACK actually changes (no restart between same-music screens) · status: DONE (`9722cb4`) · APPROVED· 🔴 owner-flagged (also the likely foghorn root)
**Owner (2026-06-22): "we need to make sure it only switches when the track actually changes. E.g. moving
between the main screen and the config menu the music restarts, but it's the same music, right?"** **Right —
confirmed in code.** `musicForScreen` (main.js:380) maps **home/settings/audio/graphics/inventory/heroes ALL to
the `"menu"` context**, but it **unconditionally** calls `synthSwitchContext` → `setContext`+`setMusic`+`swapNow`
+`start` on every screen change — so moving between same-music screens **rebuilds + restarts the identical
track**. That needless restart is also the **most likely cause of the recurring foghorn on screen change** (the
owner hit it again "moving between screens where there is a change in music" — but for menu↔menu there is NO real
change; the code just re-triggers).
- **Fix:** make music switching **idempotent**. Track the currently-playing music key `curMusicKey = context +
  ":" + seed`. In `musicForScreen` compute the target `(context, seed)`; **if it equals `curMusicKey` and music
  is already playing, RETURN — do not setContext/setMusic/swapNow/start.** Only switch on a real change. Update
  `curMusicKey` on a successful switch; clear it when music stops. **Keep `musicPreview` (Audio-menu picker)
  always switching**, and keep the **per-topic `lofi` seed** distinct (game topic A→B IS a real change → switch).
- **DoD:** navigating between same-context screens (home↔settings↔audio↔inventory↔heroes) does **NOT** restart
  the music (no audible re-trigger); a real change (menu→lofi on game start, →arena, a different solve topic, a
  picker preview) DOES switch; a Node test asserts `musicForScreen` skips the redundant `setContext/swapNow` when
  the key is unchanged and fires it when changed; `node -c` clean; **[A]-only** (`main.js`, a music-wiring test).
  Pairs with **T165** (B cleans the actual switch). **Verify:** owner confirms no restart between menu screens +
  the foghorn-on-screen-change is gone.

### T165 — [B] Audio engine: a context SWITCH must fully stop the previous generator (no tail / no foghorn) · status: DONE (`4a10a4b`) · APPROVED· 🔴 pairs with T164
**Owner (recurring): the music "switcher doesn't fully switch — elements of the previous music continue," and
the FOGHORN keeps returning on switches.** Even after T164 stops the *needless* switches, a **real** switch
(menu→lofi→arena, or a picker change) must swap **cleanly**. In `synth.js`, ensure `setContext`/`setMusic`/
`swapNow` **fully release the previous context's voices + reset/flush the FDN reverb tail** before/while the new
generator starts — so nothing from the old track bleeds through and no runaway/overlapping tail builds into the
sustained low drone (the foghorn). Make `setContext(name)` **idempotent** too (asked for the current context →
no-op, defence-in-depth with T164).
- **DoD:** on a context switch the previous generator's scheduled voices are cancelled and the reverb state is
  flushed (no audible overlap/tail carryover); `setContext(current)` is a no-op; a headless/`OfflineAudioContext`
  check shows the post-switch output is **bounded** (no divergence) and the old context's signature doesn't
  persist past the swap; `golden-synth` still green; **B-owned (`synth.js` + tests) only**. I'll measure the
  switch transient via OfflineAudioContext when the harness is up. Pairs with **T164** (A stops the needless
  switches).

### T178 — [A] Economy: ramp mid/late-game wealth to ABSURD levels (millions → billions/trillions) — the goblin-hoard humour · status: OPEN · owner-feature (pairs with the hoard)
**Owner (2026-06-22): "I'd like coins to reach higher numbers than 500K — at least millions, but billions/
trillions would be funny too. This is part of the humour/character — building up inordinate/pointless wealth. So
ramp up the wealth accumulation in MID/LATE game. Early accumulation is already good."** *(Cookie-Clicker /
AdVenture-Capitalist absurd-number comedy. The PLAYER is an adventurer/mage (rises Adept→Archmage→Runelord,
fields a hero party) — **NOT a goblin**; "Goblin Gold" is just the **currency** (gold plundered from goblins —
Goblin King/Warren are the first foes). The comedy = an adventurer amassing an absurd pile of goblin gold.)*
- **The infra ALREADY supports it** (no new plumbing): `fmtGold` suffix ladder goes **K→M→B→T→Qa…Qad (~10⁴⁵)**;
  the wealth **milestones already climb to 1e15** ("Coin Purse" 1K → "Gold Hoard" 1M → "Croesus" 1B → "Midas
  Touch" 1T → "Cosmic Fortune" 1e15). **Only the EARNING RATE is the bottleneck:** `goldMult` is **additive/linear**
  (`1 + items·0.05 + mastered·0.5 + heroes·0.5 + tiers·1`, max ~145) → you'd crawl to a few M but never reach the
  B/T the milestones promise.
- **Fix — add an EXPONENTIAL mid/late ramp, keep early as-is:** introduce a **multiplicative** wealth factor tied
  to **deep Arena progress** (the late-game grind = the wealth engine). E.g. a **"Hoard Multiplier" = `g^(bosses
  defeated)`** (10 region bosses; `g`≈2–2.5 → ×~1k–9k at full clear) **multiplied onto** the existing additive
  `goldMult`. Net: early game unchanged (no bosses yet → ×1); mid game accelerates; late game pays **millions per
  Arena win** → cumulative **billions/trillions**. Tune `g` so a committed few-months player lands in the **B–T**
  range (and a completionist tips into Qa for the laugh). **Gold is decoupled from Arena difficulty** (`tierGold`
  is the payoff; foe `def` is separate) — so ramping gold does NOT unbalance the Arena.
- **Hoard tie-in (decouples NUMBER from PILE):** the **NUMBER** is the joke (→B/T/Qa on the gold pill); the visual
  **PILE** "fills" at the **1M "Gold Hoard" milestone** (`GOLD_FULL`≈1e6 in `GOLD-HOARD-DESIGN.md`, not 500K) and
  then just stays a big glinting hoard while the number explodes past it. (Optional later: a tiny comedic
  "obscene overflow" flourish at extreme wealth.)
- **DoD:** mid/late gold escalates exponentially (a committed player reaches **≥ millions**, deep play **B/T**);
  early-game earning unchanged; `fmtGold` renders the big tiers correctly (it already does — add a test for B/T/Qa
  formatting); the wealth milestones become reachable in sane time; Arena difficulty/`FOE_BUDGET` invariants
  unaffected; `Gold` unit tests updated (`questionGold`/`roundBonusGold`/`tierGold`/the new factor); `node -c`
  clean; **[A]-only** (`main.js`, gold tests). **Sequence:** feeds the hoard `GOLD_FULL` (T173) — do before/with
  T173; behind the live bugs. **✅ ECONOMY SIM RUN** (`docs/agent/economy-sim.js`): **recommended `g` ≈ 2.0–2.2**
  (regular player → millions in weeks, **billions by ~2 months**, trillions long-term; full table in
  `GOLD-HOARD-DESIGN.md`). The boss multiplier is a single tunable constant; the owner dials the final feel.

### T177 — [A] **BUG (live):** PWA loses fullscreen on minimize + no way back (T156 removed the button) · status: OPEN · 🔴 DO-FIRST
**Owner (2026-06-22): "the PWA loses fullscreen every time I minimise it, and the fullscreen button is gone from
the config menu now."** **Root cause:** T167's `requestFullscreen()` (the JS Fullscreen API) is **dropped by
Android whenever the app is backgrounded/minimised** — and it **cannot be re-entered without a user gesture** — so
on return the PWA is windowed; meanwhile **T156 hid the manual fullscreen toggle when installed**, so there's no
way back. The owner is stuck windowed.
- **Fix (two parts):**
  1. **Auto re-enter fullscreen on the first gesture after resume.** On `visibilitychange`→visible (installed/
     standalone, and we were fullscreen before), arm a **one-shot**: the **next `pointerdown`/click** calls
     `requestFullscreen()`. The user always taps to resume play, so fullscreen restores **transparently** on that
     first tap (satisfies the gesture requirement without a visible button).
  2. **Restore a MANUAL fullscreen toggle in the installed PWA** — **walk back T156's full hiding**: the owner
     wants the button back as the explicit fallback. Keep it in **Setup/config** (or a small re-enter affordance)
     when installed; the entry-screen launch behaviour (T167) is unchanged. *(T156's instinct — "installed is
     already fullscreen so hide it" — was wrong precisely because the PWA loses fullscreen on minimize.)*
- **The real, robust fix is the TWA** (native **immersive-sticky** mode survives minimize without a gesture) —
  note for the packaging track (T168/T72). For the raw PWA, (1)+(2) is the best achievable.
- **DoD:** after minimising + returning, the first tap restores fullscreen (installed); a manual fullscreen
  toggle is available in the installed PWA's Setup; browser-tab behaviour unchanged; `node -c` clean; `home-layout`
  intact; **[A]-only** (`main.js`, `index.html` if needed, tests). **Verify:** owner confirms on the PWA
  (minimise → return → tap → fullscreen; and the manual button is back).

### T176 — [A] **BUG (live):** black bar in the notch/cutout area on PWA (purple backdrop doesn't reach the top) · status: OPEN · 🔴 DO-FIRST
**Owner (2026-06-22): "black bar at the top of the screen in PWA, whereas in Firefox the purple background goes
all the way to the top. This is the phone's notch area."** **Root cause:** the viewport meta (`index.html:7`) is
`width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no` — **missing `viewport-fit=cover`.**
Without it, an installed/standalone PWA won't paint into the display **cutout (notch)** area, so that strip shows
the dark **`theme-color` `#0E1116`** (= the black bar). A browser tab has no cutout to fill → Firefox looks fine.
- **Fix:** add **`viewport-fit=cover`** to the viewport meta so content extends edge-to-edge into the cutout; the
  full-bleed **`.fx-backdrop`** (already `position:fixed; inset:0; 100vw/100dvh`) + body `--bg` then fill the notch
  with the **purple backdrop**. The interactive UI **stays inset-aware** — body padding + `.app` height already use
  `env(safe-area-inset-*)` (T112), and those insets become *non-zero* once `viewport-fit=cover` is set, so verify
  the home/game layout still lays out correctly under real insets (the `home-layout` invariant must hold; the Skip
  key etc. must not clip). Optionally revisit `theme-color` (the purple reads better than near-black behind the
  cutout, but the backdrop bleeding is the real fix).
- **DoD:** with `viewport-fit=cover`, the purple backdrop reaches the very top (no black notch bar) in
  standalone/PWA; the UI respects the safe-area insets (nothing clipped under the notch); `home-layout` invariants
  intact; `node -c` clean; **[A]-only** (`index.html`, `styles.css` if needed, tests). **Verify:** owner confirms
  on the PWA (notch fills purple); browser-tab unaffected.

### T175 — [B] **BUG (live, recurring):** the FOGHORN is back — music BUILDS UP to a sustained drone over time · status: OPEN · 🔴 DO-FIRST (ahead of the hoard T172)
**🔑 SHARPENED (owner, 2026-06-22): "totally reproducible — EVERY time a new song starts (e.g. via the switcher)
it starts nice then ramps up to foghorn/pain."** This is the key: it's **NOT context-specific** (every song) and
it **ramps over the reverb's fill time** → the **common reverb path is accumulating too much energy from the new
(louder, longer-sustained) T155 PADS**. Could be true divergence (decay effectively ≥1 in the live path) OR a
**too-hot STEADY STATE** — a *stable* reverb still ramps to its steady level over its multi-second tail, and if
the new pads feed it too much, that steady level rails the −1.5 dB limiter = the foghorn/pain. Either way: **bound
the reverb energy under the REAL pad input.** Trivial repro for B: **start any song (or use the switcher) and
wait ~15–30 s.** Prime suspect for the regression: **T155 pad gains / reverb sends**, and/or **T165's `flush`/
`setDecay` leaving the FDN feedback hotter than safe** — re-verify the FDN feedback gains are `coef·curDecay` with
`curDecay` ≤ the measured-safe cap after every switch.
**Owner (orig, build `7df7699`): "got foghorn on latest build. Music started nice then BUILT UP to foghorn."** The "**built up**" is the key tell: a **gradual divergence** — the output grows **unboundedly over
time** until the **−1.5 dB brickwall limiter** rails it into a sustained ceiling-level drone (= the foghorn).
Recurs despite T151 (FDN cap) / T159 (resume) / T165 (switch flush).
- **Why the gate MISSED it:** `test/browser/audio.test.js` renders the **reverb ALONE, with white noise, for only
  5 s**, asserting peak ≤ 2. A buildup still <2 at 5 s but diverging by **20–30 s**, OR appearing only when the
  **real sustained PADS (T155: `padglass`/`padep`/`padpwm`/`padorgan` — long sustain/release) feed the FDN through
  the actual music path**, is invisible to a 5-s reverb+noise test.
- **Likely roots (B confirms by measurement):** (a) a **sustained pad continuously feeding the FDN** accumulates
  past the stability point over >5 s; (b) **T165's `reverb.flush()` restoring the feedback gain wrong** (`curDecay`
  restore) → FDN left hotter than safe after a switch; (c) a per-style `reverbDecay` near the cliff under
  sustained (not impulse) input; (d) **voice accumulation** (pad voices not released). The new T155 pads are the
  most-changed variable since the last clean state.
- **FIX:** (1) **Reproduce/measure with a LONG render of the REAL music path** — `setContext`+`setMusic`+`start`
  in a real `AudioContext` sampled via `AnalyserNode` over **~25–30 s** per context (the scheduler is real-time,
  not offline-renderable) → find the **diverging context(s) + timescale**; (2) **root-cause + bound it** (lower the
  offending decay / cut the pad's reverb send / fix voice release / verify the flush restores `curDecay` correctly
  / add a pre-limiter safety so a runaway DECAYS not rails); (3) **EXTEND THE GATE** — assert bounded over a LONG
  real-music render (not just 5 s reverb+noise). **DoD:** no unbounded buildup on any context over ≥30 s
  (measured); root identified + fixed; gate extended; `golden-synth` green; **B-owned (`synth.js` + tests) only.**
  I'll independently re-measure the long-render peaks before DONE. Owner confirms on device.

### T174 — [B] RESEARCH/ART pass: representing an accumulating COIN HOARD (impression, not physics) · status: DONE (`7df7699`) · APPROVED· research-first (gold-hoard feature)
**Owner wants a Smaug/Scrooge gold hoard that piles up organically on the home screen** with **individual coins
visible** ("circles at different angles, with the bevel"), fed by **coins that fly in from the earn-point** — but
**"not literally thousands of particles with physics, just the overall impression of amassed coins"** + *"do a
search pass on art style of representing a mass like this (e.g. it's done with leaves and other piled items)."*
Full vision/spec in **`docs/agent/GOLD-HOARD-DESIGN.md`**. **This task = the RESEARCH pass that precedes the
build.**
- **Survey** how stylized **accumulating masses of small items** are rendered WITHOUT per-item physics: shaped
  **silhouette/heightfield + surface-scatter** (poisson/blue-noise placement) + dither/palette shading + lit
  **bevels**; "render only the surface you'd see, imply the bulk." Reference real examples (leaf piles, Spyro gem
  hoards, DuckTales money bin, Clash gold storages, snow/gravel drifts) and **borrow applicable `brickmap` dither/
  scatter recipes** (B has brickmap access; ORCHESTRATION §brickmap — port techniques, not the engine).
- **Output:** a short doc + a **recommended technique** for the coin hoard — how the mound **silhouette grows on a
  saturating curve** (gold→level, plateaus gracefully under the 512 `PARTICLE_CAP`), how many **surface coins** to
  scatter + their **bevel/angle** treatment, and the **reduced-motion still**. Note the wins/limits honestly.
- **DoD:** the research doc + recommended technique (engine-mappable into `fxgl.js`, fits the cap + degrade ladder
  + reduced-motion); **B-owned doc only** (no engine change yet); `node -c` clean if any code/test touched.
  **The Babysitter surfaces the recommended technique to the owner for a thumbs-up before T172 builds it.**

### T172 — [B] Gold-hoard ENGINE: beveled-coin splat + hoard scene mode + attractor burst (`fxgl.js`) · status: OPEN · after T174 + owner-bless
Build the **owner-blessed** technique from T174 into `fxgl.js` (spec in `GOLD-HOARD-DESIGN.md` §engine): (a)
**beveled-coin splat** (enhance the disc-mask fragment — rim highlight + inner gradient + specular glint, gold
palette; opt-in `look:"coin"`), (b) **per-particle rotation + aspect/squash** (coins at varied angles), (c) a
**hoard scene mode** (settled silhouette + surface scatter driven by a saturating `hoard` level; re-seed only on
tier change), (d) an **attractor/converge burst** (emit from `{x,y}` → move to a target region → settle, vs
today's disperse). Respect `PARTICLE_CAP` (512) + degrade ladder; **prefers-reduced-motion → static pile**;
DPR-crisp. **DoD:** headless tests on the pure math (coin instance attrs, saturating curve, converge path) like
the other `fxgl` tests; defaults for existing scenes byte-identical (opt-in); `golden-fx` updated as needed;
**B-owned (`fxgl.js` + tests) only.** Babysitter browser-verifies it renders + is bounded; owner tunes the feel.

### T173 — [A] Gold-hoard WIRING: feed gold→hoard + fire the earn-burst from the earn-point (`main.js`) · status: OPEN · after T172
Wire B's gold-hoard engine into the home backdrop (spec in `GOLD-HOARD-DESIGN.md` §wiring): add the **hoard level**
to `homeFxState` (a saturating curve over `loadGold()`), pass it into the home scene so the mound renders + grows;
on `addGold(amount)` fire the **standalone spinning-coin burst from the earn-point** (gold pill / answer point /
reward toast), **scaled by `amount`** (log/saturating + capped; small→few coins, huge→capped shower + extra juice —
design §3; **NO settling** on the pile); the persistent mound reflects the new total. **Keep it behind the UI +
verify text legibility** over it (home a11y/contrast); **reduced-motion → static**; stays **T153 fixed-purple**
compliant (gold-on-purple).
- **Graphics-menu FX tester (owner, 2026-06-22):** expose **EVERY gold-celebration TIER** (small / medium / large /
  huge earn-burst) as fire-buttons in the existing `#fxTest` group in the **Graphics** menu (alongside the current
  item/rank/win testers, `main.js:2428-2441`), so the owner can **fire each tier on-device and check it's
  PERFORMANT** (no frame drops). Fire from a default point (screen-centre is fine in the tester).
- **DEV gold-setter (owner, 2026-06-22 — "set my gold temporarily to see the different gold levels; remove before
  publishing"):** a **DEV-ONLY** control in the Graphics menu to **set the gold total** to test values (e.g.
  buttons 0 / 1K / 100K / 1M / 100M / 1B / 1T, or an input) so the owner can preview every hoard fill-level + the
  big-number display. **Gate it behind a DEV flag so it's invisible in production** — recommended a `?dev` URL-param
  gate (`/[?&]dev\b/.test(location.search)`): hidden for normal users (they never use `?dev`), the owner appends
  `?dev=1`. Mark the block clearly (`// DEV TOOLS — gated, do not ship enabled`). **Add to the T168 publish
  checklist: verify the dev tools are gated/absent before release.** (Persisting a test value writes
  `halves.gold` — the owner can reset it via the 0 button.)
- **DoD:** the hoard grows with gold + the amount-scaled spinning-coin burst fires on earn; **each gold tier is
  fireable from the Graphics FX tester** for perf testing; legibility intact; reduced-motion static; `node -c`
  clean; `$("id")`/home-layout invariants hold; **[A]-only** (`main.js`, `index.html` for the test buttons, tests).
  Browser-verify; owner signs off the feel + confirms the tiers are smooth on his device.

### T171 — [A] Rename the PRODUCT to "Goblin Gold" (keep the "Halves" topic) · status: OPEN · owner-chosen brand
**Owner chose the app name: "Goblin Gold"** (the in-game currency — intentional cohesion). Rename the **product/
brand**, NOT the maths topic: `manifest.webmanifest` `name`/`short_name` → **"Goblin Gold"** (short_name kept
short for the home-screen label); `index.html` `<title>` → "Goblin Gold"; any in-app product-name branding
(entry/about/header, the manifest description) → "Goblin Gold". **KEEP** the **topic "Halves" (x/2 drill)** and
"Halves & doubles" exactly as-is — only the *app* is renamed. *(The Play STORE listing title may carry a
SUBTITLE —  "Goblin Gold: The Void Throne" (owner-locked) — but that's a listing field in T168, not necessarily the
manifest short_name.)*
- **DoD:** product reads "Goblin Gold" in manifest + `<title>` + in-app branding; the "Halves" topic name is
  unchanged; `node -c` clean; `pwa.test` updated if it pins the manifest `name`; **[A]-only** (`manifest.webmanifest`,
  `index.html`, `main.js` branding if any, tests). Small. Slots after `T170`/`T169`.

### T170 — [A] **BUG (live):** topic tree overflows — rows now 4 nodes abreast clip off-screen · status: DONE (`f73443c`) · APPROVED· 🔴 DO-FIRST
**Owner (2026-06-22, screenshot): "our tree is now four deep, which doesn't fit. The plan was 3, but we can do 4
if needed — needs to fit though."** The 12 new T162 modes pushed some unlock tiers to **4 nodes in a row**, but
`.tree-row` (styles.css:116, T106 "1–3 parts abreast") lays fixed-width nodes at `gap:0` inside `.tree`
(`max-width:360px`), so 4 nodes exceed the row width and **clip off both edges** (visible in the screenshot:
left/right nodes cut off).
- **Fix:** make a `.tree-row`'s nodes **fit the row width at ANY count up to 4** (the owner's allowed max) without
  horizontal overflow — e.g. nodes `flex:1 1 0; min-width:0` so they share the width and **scale down** as the
  count grows; a small gap; and step the node's glyph/count font + padding down at the 4-up size so it stays
  legible (the `x/y` progress + the topic glyph must still read). 1–2-up rows shouldn't balloon — cap the node
  max-width so a sparse row still looks like the current size.
- **Keep the `home-layout` invariants** (the `.app`/safe-area/height assertions) — this is a shared layout
  primitive; don't regress them; extend the gate with a "no `.tree-row` overflows its `.tree` width / ≤4 abreast
  fit" assertion.
- **DoD:** every tree row (1–4 nodes) fits within the tree width with **no horizontal clipping**, glyph + count
  legible at 4-up; `home-layout` invariants intact + a new no-overflow assertion; `node -c` clean; **[A]-only**
  (`styles.css`, maybe `main.js`/`renderTree`, `test/home-layout.test.js`). **Verify in a real browser** (the
  harness, or owner confirms) — read that the 4-up row's nodes don't clip the `.tree` box.

### T169 — [A] Self-host the web fonts (drop Google Fonts CDN) — privacy + offline · status: DONE (`d6fbae3`) · APPROVED· owner-requested
**Owner: "let's bake the fonts in."** `index.html` loads **Space Grotesk + JetBrains Mono from
`fonts.googleapis.com`/`fonts.gstatic.com`** (the app's ONLY third-party request → a child's device IP goes to
Google). **Self-host** the needed weights locally (woff2), drop the three Google `<link>`s, add `@font-face`
rules, and let the cachebust/`?v=` + SW cache them like the other assets. Then the app makes **zero third-party
requests** — the kids-privacy / Data-Safety "no data shared" story is airtight, and fonts also work fully offline
(no FOUT waiting on a CDN).
- **DoD:** no `fonts.g*` references remain; the two type families render identically self-hosted (same weights:
  Space Grotesk 400/500/700, JetBrains Mono 400/700/800); fonts are `?v=`-busted + SW-cached; `node -c`/build
  gate clean (cachebust verifier still passes — no bare refs); **[A]-only** (`index.html`, `styles.css`, the
  font files, maybe `sw.js`/cachebust). **Verify:** no network request to `fonts.g*` on load.

### T168 — [A] Play-Store productionisation (privacy page, assets, .aab, assetlinks) · status: OPEN · HELD until ID-verify + name decided
Productionise the `docs/agent/PLAY-STORE-PREP.md` draft once the owner signs off the **app name** (rename pending
— see the "Goblin…"-themed naming discussion) and ID verification clears. Scope: create **`privacy.html`** on
Pages (from the prep §3 text), generate the **store assets** (512² icon, 1024×500 feature graphic, ≥2
screenshots via the Playwright harness), attempt/produce the **`.aab`** (PWABuilder, or Bubblewrap in-env with
`display:fullscreen`/immersive), and host **`/.well-known/assetlinks.json`** for the TWA. **Keep the version
check** (a TWA loads live GH-Pages content + SW cache — updates ship via git push, no Play resubmission; the
check is meaningful there). Listing copy / Data-Safety / content-rating answers are paste-ready in the prep doc.
**[A]-only.** Hold until the owner is verified + the name is locked (the name feeds the listing + the permanent
package id).

### T163 — [B] Firm up + re-bless the brittle `visual_arena` golden · status: DONE (`461fddc`) · APPROVED· small (B follow-up to T154)
The harness recovered; `test/browser/visual.test.js` now reports **1/13 FAIL — `visual_arena` golden mismatch**
(the Arena gained 3v3 + death-VFX after the baseline was captured). NOT a CI gate (absent from `pages.yml`) so
NOT deploy-blocking — but it violates T154's own "robust signature, not a brittle pixel diff" principle. **Make
the arena region signature robust to the Arena's DYNAMIC content** (enemy team, gold, transient VFX vary), then
**re-bless** the golden (`UPDATE_*`). The flagship home-backdrop-hue check (the one that matters) already passes.
**DoD:** `visual.test` green again with a stable arena signature; the gate still HAS TEETH (a real hue/layout
flip still fails); B-owned (`test/browser/*`, `test/golden/*`); `node -c`/skip-clean intact.

### T162 — [A] Mock-exam-driven drill gaps: 12 new building-block modes · status: DONE (`8528658`) · APPROVED· ✅ OWNER-BLESSED (build all, in tiers) · content · after the trust/audio fixes
**Owner (2026-06-22) supplied a REAL mock** (target student Luke, SEP 11+ Mock 7 / BWS — scored 11/27). Frame:
**"we're not trying to reproduce 11+ style questions, just drill the building blocks needed to answer these
quickly."** Full per-question decomposition + the analysis live in **IDEAS I9**. **Findings:** one-step
"X% / fraction OF an amount" is already strong (existing `fractionsof`/`percentages`/`squares` are landing);
the misses cluster into **(A) complement / "the rest" / % decrease, (B) proportion / unit-rate / scaling,
(C) ratio sharing, (D) un-drilled procedures: divisibility rules, time intervals, LCM/factors, averages** —
and many wrongs are **near-misses** (fluency under time, not pure concept).
- **✅ Step 1 DONE — calibration pass blessed.** Full spec (calibrated ~21-item sets, mock evidence, ranges,
  `masterSecs`, unlock slots) in **`docs/agent/T162-calibration.md`**. **Owner (2026-06-22): build ALL 12 modes**,
  with **`digitsum`** as the divisibility answer (no new engine answer type), **delivered in TIERS**.
- **Step 2 — BUILD (the 11 modes, in 3 tiered pushes — re-read the calibration doc for each set's items/ranges):**
  - **Tier P1** (push 1): `scaling` (unit-rate), `percentoff` (% decrease / the-rest), `partwhole` (reverse part→whole),
    **`balance`** ("Complete the Sum" — evaluate one side, inverse to find the missing number; from the Verbal
    report's maths section, a whole exam section Luke got 4/7 wrong; confirm numpad accepts a negative entry —
    else ship positive-answer set + flag negatives).
  - **Tier P2** (push 2): `ratioshare`, `timegap` (answer in minutes), `lcmhcf`, `mean` (+ reverse).
  - **Tier P3** (push 3): `cubes` (mirror `squares`), `money` (£ totals + change, 2dp), `digitsum` (+ remainder ÷9),
    and the **doubles/halves range check** (reach 2-digit; extend SRC only if needed).
- **Each mode:** a fixed `*_SRC` array → `build()` mapping to `{p,a}` (match the existing mode shape); numeric,
  non-negative, numpad-enterable answers within the length guard; sensible `unlockedBy`/`requires` mastery gate;
  new **"Reasoning"** picker group for `scaling`/`ratioshare`/`timegap`/`mean`. A **Node logic gate per mode**
  (answers numeric/in-range/numpad-length-OK, like the existing mode tests) + register it in `pages.yml`.
- **DoD (per tier):** the tier's modes built with passing logic gates; no regressions to existing modes/unlock
  chain; `node -c` clean; `docs/research-11plus.md` calibration table updated for the new modes; **[A]-only**
  (`modes.js`, `index.html` if a group/label is needed, `docs/research-11plus.md`, new mode tests, `pages.yml`).
  **Sequence:** content, NOT a live bug — lands **after** the trust/audio fixes (T161/T158/T159) + the Arena VFX
  (T160). Babysitter reviews each tier push (Node gates + a sample of items in-range); owner feels P1 early.


**Owner (2026-06-22): "while they show the same build number — so we have cache problems. The build number
should be an absolute marker of what you're looking at, but I don't think it is. I think that has caused us a
lot of problems through this."** **He's exactly right, and it's a confirmed code bug.** `main.js` (lines
2445-2448) sets the displayed build + `bootSha` from a **fresh `fetch("build.json", {cache:"no-store"})`** —
i.e. from the network, **decoupled from the code actually executing.** So the pill always shows the LATEST
deployed sha even when the running `main.js` is an older cached bundle → **two clients running different code
show the SAME number** (the owner's Firefox-no-3v3 vs PWA-3v3). Worse, the **update-check** (line 2440-2442)
compares the fresh `build.json` sha against `bootSha` — **which was itself set from the same fresh fetch** — so
it compares fresh-vs-fresh, **always matches, and NEVER fires** even when the running code is stale. The marker
and the staleness detector are both blind to what's really running. *(This — not a SW cache-strategy flaw — is
the thing that made live review untrustworthy all session. Note T107/`scripts/cachebust.js` already appends
`?v=<sha>` to every deployed script URL, so deployed assets ARE versioned/immutable; the gap is purely that the
marker reads build.json instead of the running bundle.)*
- **THE FIX (minimal, no CI change):** derive the **running** version from **`main.js`'s OWN `?v=<sha>`** — the
  cachebust-injected query on its own `<script src="main.js?v=…">`. At the top of the IIFE capture
  `RUNNING_V = (document.currentScript && /[?&]v=([^&]+)/.exec(document.currentScript.src) || [])[1] || null`
  (main.js is a normal sync script, so `document.currentScript` is valid during its execution; fall back to
  `document.querySelector('script[src*="main.js"]')` if needed). This is the sha of the code **actually
  executing**.
- **Pill shows `RUNNING_V`** (truthful: a stale cached bundle shows its OWN old sha, NOT build.json's). No `?v=`
  (local/dev) → keep "local build".
- **Update-check compares `RUNNING_V` vs the FRESH `build.json` sha** → if they differ, **you are running stale
  code → `showUpdate()`** (and the reload lands on fresh `?v=` assets). This makes the "update available" bar
  actually fire when stale — the safety net that was silently broken. Keep `build.json` for the *latest-available*
  sha + the "ago" time; just stop using it as the *running* identity.
- **DoD:** the build pill reflects the RUNNING asset version (from `main.js`'s own `?v=`), so two clients on
  different code show different numbers; the update-check fires when `RUNNING_V !== build.json.sha`; local build
  still reads "local build"; extend **`test/version.test.js`** (and/or `cache-bust.test.js`) to assert (a) the
  pill/`bootSha` come from the script `?v=` not the fetch, and (b) `showUpdate` fires on a `RUNNING_V`≠fetched-sha
  mismatch and does NOT fire when equal. `node -c` clean; **[A]-only** (`main.js`, `test/version.test.js`).
  **This is the highest-value fix in the queue** — once it lands, every subsequent live review is trustworthy.

### T158 — [A] SW: make the navigation/`build.json` fetch bypass the HTTP cache (so a stale `index.html` can't shadow a deploy) · status: DONE (`41bd1d8`) · APPROVED· IMPORTANT (likely the Firefox-staleness root) · pairs with T161
**Re-scoped 2026-06-22 (earlier diagnosis CORRECTED).** My first take — "the SW cache-firsts *un-versioned* JS"
— was **wrong**: T107/`scripts/cachebust.js` appends `?v=<sha>` to **every** deployed script URL (and gates that
no bare ref survives), so deployed assets ARE versioned + immutable, and the SW cache-firsting those `?v=` URLs
is **correct** (fast, offline-safe; a new deploy = new URL = cache miss = fresh). **So the staleness is NOT the
asset cache.** The remaining real risk is the **navigation document (`index.html`) itself**: the SW's
network-first nav does a plain `fetch(req)` (sw.js:36) which **goes through the browser HTTP cache** — GH-Pages
serves `index.html` with a max-age, so Firefox can hand the SW a **stale `index.html`** (old `?v=` refs → old
JS) even "online." That fits the owner's Firefox-frozen-pre-3v3.
- **THE FIX (sw.js):** in the network-first branch (nav + `build.json`), fetch with **`cache:"no-store"`** (or
  `"reload"`) so the freshest `index.html`/`build.json` is always retrieved, defeating the HTTP-cache shadow; on
  network failure still fall back to the cached copy (offline unaffected). Leave the cache-first branch for the
  immutable `?v=` assets + fonts **as-is** (it's correct).
- **Cache-version bump** `halves-static-v1`→`v2` so `activate` purges any index.html cached under the old policy.
  Keep `skipWaiting`+`clients.claim`.
- **GATE:** extend `test/pwa.test.js` to assert the nav/`build.json` fetch uses a no-store/reload cache mode (not
  default), and the cache name bumped.
- **DoD:** SW nav + `build.json` fetched no-store (offline fallback intact); cache-first for `?v=`/fonts
  unchanged; `CACHE` bumped; `pwa.test` asserts the no-store nav + bump; `node -c` clean; **[A]-only** (`sw.js`,
  `test/pwa.test.js`). **Sequence: `T161` first** (truthful marker — so we can SEE whether this actually clears
  the owner's Firefox staleness), then this. **Verify:** with T161 live, the owner reloads Firefox and the pill
  shows the running sha advancing to match the deploy + 3v3 appears. *(Headless SW re-check blocked — harness
  OOM-down; lean on the `pwa.test` logic gate + owner confirmation.)*

### T156 — [A] Hide the fullscreen affordances when running installed/standalone (TWA/PWA) · status: DONE (`eaf40bd`) · APPROVED· OWNER-REQUESTED · Play-Store track
Owner (2026-06-22, exploring the Android wrap): *"one difference will be the full-screen buttons will no longer
be needed. It'll be locked full screen presumably."* Correct — in a **TWA / installed PWA** the app launches
**locked fullscreen** (no browser chrome), so the in-app fullscreen controls are **redundant there**. But the
SAME build still runs in a plain **browser tab**, where they ARE useful — so **don't delete them; conditionally
hide them by display-mode.**
- **Detect installed/standalone:** `window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true`. Wrap it in a small
  helper (e.g. `isInstalledDisplay()`).
- **When installed/standalone → HIDE** both fullscreen affordances: the entry-screen **"Play in fullscreen"**
  button (`#entryFs`) and the Settings **Fullscreen toggle** row (`#fsToggle`). (The entry screen still serves
  the **audio user-gesture** unlock — keep that gesture; just drop the fullscreen *wording/button* when already
  fullscreen, e.g. entry becomes a plain "Tap to begin".) In a browser tab → leave them exactly as today.
- **Manifest:** bump `display` from `"standalone"` to **`"fullscreen"`** so the wrapped/installed app also hides
  the **status bar** (true game fullscreen). Keep `orientation: "portrait"`. (`display_override` may list
  `["fullscreen","standalone"]` for graceful fallback.) Re-check the **safe-area insets** still hold under true
  fullscreen (T112 invariant — the `.app` height must still subtract insets; don't regress it).
- **DoD:** display-mode helper + conditional hide of `#entryFs`/`#fsToggle` (browser-tab behaviour unchanged);
  manifest `display:"fullscreen"`; the **`home-layout` safe-area invariant still asserts** (no regression);
  `node -c` clean; `$("id")` refs still valid; pwa.test updated if it pins `display`. **[A]-only** (existing
  Halves files). **Verify:** confirm in a browser tab the buttons still show + work; the installed/standalone
  hide is best browser-verified (matchMedia display-mode) when the harness is back — until then assert the
  helper's logic in a Node test + the owner confirms on his installed PWA.

### T157 — [A] Handle the Android back button / back-gesture (don't exit the app mid-game) · status: DONE (`1a3e3fb`) · APPROVED· OWNER-track (Babysitter-caught) · Play-Store track
The classic **TWA surprise**: our navigation is **JS screen-state, not URL history**, so the Android system
**back gesture** finds no web-history to pop and **exits the app** instead of going "back one screen." To a
10-year-old mid-Arena, hitting back to leave a fight would **quit the game** — feels broken. Make back navigate
our screens.
- **Integrate our screen nav with history:** on each `showScreen(...)`/screen transition push a
  `history.pushState({screen})` (except the root/home), and add a `popstate` handler that **navigates our screen
  stack back** (e.g. Arena→home, a sub-menu→its parent) instead of unloading. At the **home/root** screen, back
  should **confirm-exit** (or allow the default exit) rather than dropping straight out mid-session — pick the
  least-surprising behaviour (a "press back again to exit" or a small confirm).
- **Must not break browser-tab play or deep state:** guard for environments without `history` (try/catch);
  don't fight the T54 update-check or the service worker; pushState `url` should stay same-document (no
  navigation, no new network). Don't leak state across a hard reload.
- **DoD:** Android/system back navigates the app's screen stack (Arena/menus → parent → home), and only
  exits (or confirms) from home — verified by a Node test that drives `showScreen` + simulates `popstate` and
  asserts the resulting screen, plus the owner confirming on his installed PWA/wrapped build. Browser-tab
  back-button behaviour stays sane (no traps, no infinite loops). `node -c` clean; **[A]-only**.

### T155 — [B] Distinct PAD/bed timbre per style (kill the shared "synth string" sound) · status: DONE (`493d875`) · APPROVED· OWNER-PRIORITY
Owner (2026-06-22): **"The music styles are now a lot better. One thing I don't quite like is that every style
seems to share the same synth string sound — that would be great to vary a lot more. It makes them feel a little
samey, though they're definitely more distinct than they were."** **Root cause (Babysitter, confirmed in
`synth.js`):** all **12** contexts set **`pad: "pad"`** (synth.js:464-476) — the **identical** lush detuned-
**sawtooth** unison pad (`PATCHES.pad`, synth.js:74). The *leads* already vary per style (bell/lead/pluck/chip)
and the *bass* varies (bass/wub), but the **pad — the sustained harmonic BED, the most continuously-audible
voice — is the same sawtooth in every style.** That shared saw bed is the "synth string sound." So the fix is
**pad-timbre diversity**, not more leads.
- **Add several genuinely-distinct PAD-class patches** to `PATCHES` (different oscillator topology / waveform /
  filter character / envelope feel — not just a cutoff tweak). All achievable with the EXISTING engines
  (`unison`/`fm`/`mono`/`sub`); a `PeriodicWave` additive engine is an OPTIONAL stretch for a true organ/choir.
  Suggested set (B may refine — the goal is ≥4–5 distinct beds, characterful, not samey):
  | new pad patch | engine / wave | character | feel (env) |
  |---|---|---|---|
  | `pad` (keep) | unison saw, detuned | classic warm analog bed | slow swell |
  | `padglass` | unison **triangle/sine**, gentle detune, soft lowpass | airy, glassy, pure | very slow attack, long release |
  | `padep` | **fm** (low ratio/index, sustained, lowpass) | electric-piano / Rhodes-ish bed | medium attack, bell-ish decay→sustain |
  | `padpwm` | unison/mono **square** (PWM-ish via slight detune), brighter filter | retro/chip sustained bed | snappier attack |
  | `padorgan` | detuned **squares** through a **bandpass** (hollow), or additive | hollow organ/stab bed | fast attack, stabby |
- **Assign a context-appropriate pad to each of the 12 styles** so the harmonic bed timbre is **distinct per
  style** (suggested mapping — B may adjust for taste): synthwave/bigroom/arena → `pad` (saw suits them);
  ambient/tropical → `padglass`; lofi/dnb → `padep`; chiptune/boss8bit → `padpwm`; techno/dubstep → `padorgan`;
  menu → `padpwm` or `padglass` (bright lobby). Vary attack/release too so a stabby organ bed vs a slow choir
  swell vs a plucky EP bed *feel* different, not just spectrally.
- **DoD:** new pad patches + per-context pad assignment; **`golden-synth` re-blessed** (`UPDATE_GOLDEN=1` — the
  score's patch names change intentionally; the **distinctness** assertion must still hold and is now stronger);
  patch-spec signature (`patchSig`) covers the new patches; **`node -c` clean**; **B-owned (`synth.js` + its
  tests) only** — never touch existing Halves files; the picker/`STYLE_IDS` list is unchanged (same 12 styles,
  new timbres). **Output-feature rule:** the golden pins patch *names*, NOT rendered timbre — so **B must
  verify the beds actually SOUND different** (render each pad patch via `OfflineAudioContext` and show the
  spectral content / centroid genuinely differs across the assigned pads; ideally add a headless check that the
  pad patches are spectrally distinct, not just differently-named). **The Babysitter independently measures the
  per-style pad spectra** (OfflineAudioContext centroid/harmonic comparison) before DONE. Audible final polish
  still falls to the owner's ear.

### T154 — [B] Key-screen VISUAL-REGRESSION gate (extend the T150 browser harness) · status: DONE (`2b8f1e0`) · APPROVED· proactive (catches the owner's recurring class)
B's engine queue is exhausted; this is the high-value structural follow-up to T150. The whole session's
recurring pain is **visual things regressing that only the owner notices** (the blue backdrop today; the
celebration `0×0`; layout clips). T150's `render.test.js` proved the browser can catch these — generalise it
into a **per-key-screen visual-regression gate**.
- **Render each key screen in the real browser** (via the existing `test/browser/_harness.js`) at a fixed
  viewport + dpr 2.75 + a seeded/mocked state: **home (`#start`), the Audio menu, Arena, Results**.
- **Capture a ROBUST signature per screen — NOT a brittle full-image pixel diff** (those are noisy): e.g.
  (a) **dominant colour per region** (top band / backdrop / content column — downsampled average or a small
  histogram), (b) **presence + bounding box of critical elements** (the topic-tree nodes, the Start button,
  the nav row, the music picker, …), (c) overall lit/coverage. Commit these as goldens; an `UPDATE_*` env
  re-blesses (intentional changes like T153 just re-bless).
- **Flagship invariant (would've caught today):** the **home backdrop's dominant hue** — sample the backdrop
  canvas region and assert it matches the committed baseline; a hue drift (e.g. purple→blue) FAILS. *(Baseline
  the home backdrop as PURPLE only after [A] `T153` lands — until then it's event-coloured; coordinate by
  blessing the home golden post-T153.)*
- **Save screenshots as artifacts** (for eyeballing); **skip clean with no browser** (like T150 — Node-only
  CI unaffected).
- **DoD:** a runnable visual-regression gate over the 4 key screens with robust per-region signatures (incl.
  home-backdrop hue) that **FAILS on a colour/layout regression** — prove the teeth (tamper a baseline / mock a
  blue backdrop → it fails); screenshots saved; `node -c` clean; B-owned (`test/browser/*` only); never touch
  existing Halves files. *(This is the structural guard so the owner stops being the visual-regression
  detector.)*

### T153 — [A] Home backdrop = FIXED brand purple (no event-based colour at all) · status: DONE (`c942859`) · OWNER-PRIORITY · owner-confirmed visually
Owner (refined): **"I prefer the background just to stay purple rather than being event based. Maybe an event-
specific screen could change like that, but let's keep the main screen fixed purple."** **Diagnosed:** the
home backdrop "wears today's event colours" — `homeFxState()` (`main.js:221`) passes the event's
`paletteFor(ev.rarity)`; `epic` = purple `#9a5cf6`, `rare` = **blue** `#3f97d8` → today's rare event made it
blue. (No-event default is also a cool blue-slate ramp.) **Owner wants the main/home backdrop FIXED PURPLE,
not state/event-driven.**
- **Fix ([A]-only):** make `homeFxState()` ALWAYS pass a **fixed brand-purple palette** (the epic family,
  e.g. base `#0E1116` → `#3a2a5e`/`#9a5cf6` → `#cda9ff`) — **drop the event-rarity palette from the home
  backdrop entirely** (don't read `ev.rarity` for the backdrop). Since `homeFxState` always supplies the
  palette, the `fxgl` no-event default ramp never applies → stays [A]-only, no `fxgl` change needed. A gentle
  progress→brightness shimmer WITHIN purple is fine but optional; the **hue is fixed purple**. *(The event
  banner already shows the event's own colour, so no info is lost.)*
- **Optional follow-up (NOT now):** the event-coloured backdrop could move to an **event-specific screen/
  context** (e.g. the event play screen) where the colour shift makes sense — note it, don't build it unless
  the owner asks.
- **DoD (browser-verified):** the home backdrop renders **purple** in a rare-event state, a no-event state,
  AND an epic-event state (it no longer changes with the event); `node -c` clean; all gates green; [A]-owned
  (`main.js` only). (Babysitter browser-verifies purple across states + owner confirms.)

### T152 — [A]+[B] Celebration particles: small size + emit from the point of interest + colour by context (PLANNED) · status: [B] DONE (`a2f9475`) · [A] DONE (`bdd0e6a`) · OWNER-PRIORITY
**[B] part DONE 2026-06-21** — APPROVED. `fxgl.js` gains `sizePx`/`sizeScale` (small/fine, DPR-aware),
`spreadMul` (hug the source), arbitrary `{x,y}` emission + `palette`; defaults byte-identical. Babysitter
browser-verified: a `{x:0.25,y:0.30,sizePx:4,spread:0.6}` burst rendered small + off-centre (lit centroid
cx=0.25 exact). `golden-fx` 35 (new `fx_small_offcentre` golden). **[A] part (T152[A]) now UNBLOCKED:** wire
each `fxCelebrate*` to fire from the source element's normalized centre + the contextual palette + small size,
per the table below.
Owner: **"I'd be interested in seeing very small particle sizes, and having them emanate from the point of
interest (e.g. where the inventory toast appears), and colour-coded — e.g. by inventory rarity. Exactly what
position or colour makes sense for arena victories or topic completions I'm not sure, maybe you can think
about it and plan it."** **State today:** the celebrations ALREADY colour by rarity/rank (`fxCelebrate` uses
`collectibles.paletteFor(rarity)`; `fxCelebrateRank` uses the rank colour; `fxCelebrateWin` uses gold) — but
they all fire from **`x:0.5, y:0.55`** (screen centre) at the bold ~18px size, so the colour-coding doesn't
read as "from the thing." So the new work is **(1) small/fine particles** and **(2) emit from the source
element**; colour is mostly already there (refine per below).
- **Babysitter's design (the plan the owner asked for):**
  | trigger | EMIT FROM (normalized centre of…) | COLOUR | size/feel |
  |---|---|---|---|
  | **inventory item gained** | the **reward/unlock toast** element | the item's **rarity** palette (already: common grey→legendary gold) | small/fine; count scales with rarity (legendary = denser) |
  | **topic run complete (rank)** | the **rank badge** on the results screen (`rank:` icon / the "Archmage · 61.4s" row) | the **rank's** colour (already `rk.color`) + gold accent | small/fine spray upward |
  | **topic mastery** (a topic fully done) | the **topic's node** in the tree if visible, else the mastery banner | the **topic's accent** colour (`paletteFor(m.pal)`) | a slightly fuller sparkle |
  | **arena victory** | the **defeated enemy's portrait** (burst from the vanquished foe), expanding outward | **gold** + the enemy's/hero's accent | the biggest of the set — more particles, wider spread, still finer than today |
  Rationale: particles **come from the thing that caused them** (toast / rank / foe / topic) and **wear that
  thing's colour**, so a reward reads instantly; magnitude scales with significance (common puff → legendary/
  boss shower). Keep it tasteful (the a11y/reduced-motion + `setQuality` budgets still apply).
- **[B] engine (`fxgl.js`):** add a **particle-size option** (small/fine — `sizePx`/`scale`, **DPR-aware via
  T138** so "small" is crisp on-screen, never sub-pixel) + a **spread** control; confirm arbitrary `{x,y}`
  emission + `palette` (both already accepted) work from off-centre points; extend the T138/T150 visibility
  check to an **off-centre, small-size** burst (in-bounds, on-screen size ≥ a small-but-real floor).
- **[A] wiring (`main.js`):** at each call site replace `x:0.5,y:0.55` with the **source element's normalized
  centre** (`el.getBoundingClientRect()` → `/innerWidth,/innerHeight`) per the table, pass the small-size
  option + the existing rarity/rank/topic palette; arena win → the enemy portrait rect + gold/hero palette.
- **DoD (browser-verified):** each celebration **emanates from its source element**, is **small/fine**, and
  **wears the contextual colour**; verified in the browser (fire each, assert the burst centroid is near the
  source rect, not screen-centre, and particles are small-but-visible); `node -c` clean; all gates green;
  collision-clean ([B] `fxgl.js`+tests; [A] `main.js`). (Babysitter browser-verifies positions/colours; owner
  eyeballs the feel.) *(Polish — sequence after the audio bug T151 + the harness T150.)*

### T151 — [B] Synth output DIVERGES exponentially (feedback instability) — the real "audio sounds bad" · status: DONE (`44ea919`, CI green, BABYSITTER-RE-MEASURED)
**DONE 2026-06-21** — APPROVED (REVIEW.md). Two fixes: (1) non-resonant Butterworth-Q damping (`2f8d1a9`);
(2) dropped `ambient`'s `reverbDecay:0.9` + capped FDN decay below the measured ~0.82 stability cliff
(`44ea919`). **Babysitter re-measured (AnalyserNode, 5s/style): every style now BOUNDED** — ambient
**1096→~1.2**, menu ~1.3, dnb ~1.35, ambient→dubstep switch ~1.5 and CLEARS cleanly (resolves both "sounds
bad" + "doesn't fully switch"). The first attempt `2f8d1a9` was PARTIAL (ambient still diverged; B's analytic
gate false-greened it) — caught by re-measurement, bounced, completed. Real `OfflineAudioContext` peak-bound
gate added (`test/browser/audio.test.js`). *(Original diagnosis below.)*

> Original spec:
Owner: **"the audio switching sounds bad. but I think the problem may be the switching rather than the
audio. I wonder if this is something you can confirm yourself too?"** **Confirmed autonomously — and it's
worse than the switch:** the Babysitter tapped an `AnalyserNode` on `Synth.output()` in headless Chromium and
measured the peak amplitude over time. **The synth master output grows EXPONENTIALLY in every context, even
with no switch** (normal audio peaks ≤ 1.0):
- `menu`, NO switch, peaks over 3s: `0.36 · 0.48 · 0.82 · 0.61 · 0.92 · 1.93 · 7.42 · 33.6 · 159.5` → ~×4.5
  every 0.33 s (doubles ~every 0.14 s) = a runaway feedback blowup.
- `menu→menu {now}` → 55.9; `lofi→dubstep {now}` → 33.4 (switching actually diverges a bit *less* — the
  voice-release resets some energy — so the **switch is not the cause**; continuous play is worst).
The brickwall limiter (sound.js, after `Synth.output()`) then clamps a 30–160×-too-hot signal → escalating
distortion/pumping = what the owner hears as "sounds bad," most noticeable around a switch.
**Corroboration — owner: "the switcher doesn't fully switch, seems like elements of the previous music
continue."** Consistent with the same root cause: an **unstable/growing reverb tail never decays**, so after a
switch the previous context's energy lingers (T134's voice-release clears the dry voices but cannot clear a
runaway reverb). The fix below must therefore ALSO make a switch **fully clear** the old context.
- **Find + fix the instability in `synth.js`.** Exponential growth ⇒ a feedback path with effective gain > 1.
  Prime suspects: **(a) the FDN reverb** — verify the feedback **spectral radius < 1** (the Hadamard matrix
  scaled by `0.5×decay` should be unitary×decay≈0.78, but the **damping lowpass or summing may add gain**;
  the tail must decay, not grow); **(b) a send/return LOOP** — confirm the reverb RETURN goes to `master`
  only, NOT back into a bus that feeds the reverb SEND (music bus → reverb → … → music bus would self-feed);
  **(c) voice/gain accumulation** — voices or a gain node not being cleaned up so energy piles up. Render a
  single context for ~5 s and confirm the tail **settles to a bounded steady state**.
- **Add a headless RMS/peak-BOUND gate** (this class was invisible to all Node gates): render/measure the
  engine output (offline render, or via the T150 browser harness / an `AnalyserNode`) for several seconds per
  context and **assert peak stays bounded** (e.g. ≤ ~2.0, never the 30–160 measured here) — so a divergence
  can never ship again.
- **DoD (browser/offline-MEASURED):** the synth output stays **bounded** (peak ≤ ~2) over ≥5 s in every
  context and across switches; a peak-bound gate proves it (and FAILS on today's build); **AND a switch fully
  clears** — after a `{now}` swap the previous context's energy/tail decays to near-zero within ~1–2 s (no
  lingering old material — the owner's "doesn't fully switch"); `node -c` clean; all gates green; **B-owned
  only** (`synth.js` + tests + `BUILDER-LOG-FX.md`). (Babysitter re-measures with the AnalyserNode probe; bar
  = bounded output + a clean switch + the owner's ear.)

### T138 — [B] Celebration invisible: CPU-path particles shrank under the DPR downscale · status: DONE (`8145505`, CI green) — OWNER RE-TEST
**DONE 2026-06-21** — APPROVED (REVIEW.md). **Real cause (DPR downscale):** the 2D buffer is `dpr×res×CSS`
(~2.75× on the Poco X3) and the browser downscales it, so 6–18 buffer-px particles showed at ~2–6 screen px =
invisible. **Fix:** CPU 2D path scales draw size by `pxScale = dpr×res` (set on resize) → constant ~6–18
SCREEN px (floor 2); celebration sizes bumped to 6–18. `_ignite` re-fit + `canPresent()` kept as defence.
**Stronger visibility gate** now measures lit coverage AND on-screen particle size (`{litPx:572000 ≈24%,
screenPx:18}` at 1038×2305; fails on 1×1/blank AND if particles drop below ~8 screen px). Verified: `node -c`
clean, `fxgl.test` 124, `golden-fx` 28, CI green. **🎆 OWNER RE-TEST:** the tester / in-game wins should now
show a bold shower. *(First pass `cda6fd6` was the cautious 1×1+floor fix; this refines to the true DPR cause
+ bold sizes.)*

> Original (diagnosed) spec below.
Owner gave the tester readout (screenshot): **`Test celebration` → `1038×2305`** (no "not ready"). **DIAGNOSED
— this is NOT resize/occlusion:** the `#fxBurst` 2D canvas is **ready and full-size** (1038×2305 = the Poco
X3 viewport × dpr≈2.75). The fns fire (the buttons restart the music) and `renderFrame` draws — yet nothing
is visible because **the particles are far too small for that backing buffer**:
- `seedCelebrate` (`fxgl.js:276`) sizes particles `lerp(4, szMax, …)` and `seedBurst` (`:236`) `lerp(2, …)`
  — i.e. **4–8 device px**. The CPU backend draws them as literal `fillRect(…, ceil(s), ceil(s))` in the
  **1038×2305** buffer, which the browser then **downscales ~2.75× to the ~378×838 CSS canvas** → each
  particle becomes **~1.5–3 screen px**: technically drawn (so the T133 fillRect-**count** golden passes) but
  too small/faint to see. That's the whole "I see nothing."
- **Fix (engine, `fxgl.js` CPU/2D backend):** make the particles **boldly visible** at the real backing
  scale — scale the draw `size` up for the CPU path (e.g. proportional to the canvas / multiply by the
  effective DPR, or size as a fraction of `min(w,h)`), targeting a clearly-visible mote (the owner wants
  "loads of particles" — they must read on a phone). Keep the cap/seed/determinism/reduced-motion/`setQuality`
  invariants. Sanity-check brightness/alpha too (bright palette, alpha not ~0).
- **Add a REAL visibility golden (not a count).** The T133 golden only counts `fillRect` calls — that's why
  it stayed green while invisible. Add a check that asserts **actual visible coverage**: a non-trivial number
  of drawn particles are **in-bounds** with an on-screen size **≥ a real threshold** (e.g. ≥ ~0.4% of canvas
  height, so it can't regress to sub-pixel) and alpha>0. This is the structural guard.
- **⚠ Don't tunnel on the size theory.** The owner (fairly) is skeptical 3px particles would be *fully*
  invisible — "I feel like I would see 3px particles." So size is the **leading** hypothesis (and the
  bolder-particle fix is worth it regardless), but **also verify, on a real device/headless, that the render
  loop ACTUALLY runs and presents for the full burst** — not just one frame. Concretely confirm: after
  `celebrate()`, `_pump()` schedules `_frame`, `_needsFrame()` stays true while `burst_.active`, the RAF keeps
  firing for the burst lifetime, and each frame `clearRect`+`fillRect`s onto the SAME context that's on
  screen; check `globalAlpha`/colour aren't washing them out, the burst lifetime isn't a sub-second blink, and
  particles aren't all expiring on frame 1. **If bolder particles STILL show nothing live, the cause is the
  loop/present/lifetime — fix that, not size.** Instrument if needed (the tester can surface burst-active /
  frame-count alongside `dimensions()`).
- **DoD (LIVE-verified):** tapping a celebration tester button shows a **clearly visible, animating** particle
  shower on the owner's phone (size AND a running loop confirmed); the new visibility golden fails on
  too-small/zero-coverage frames; `node -c` clean; all gates green; **B-owned only** (`fxgl.js` + tests/goldens
  + `BUILDER-LOG-FX.md`). (Babysitter: bar = the owner SEEING it — this has hidden behind green gates three
  times.) *(The tester's music-restart side-effect is a separate [A] fix in T143.)*

### T139 — [B] Music styles: keep menu+arena, replace solve/event, cut to 12 DISTINCT styles incl. a dubstep VICTORY (implements T141) · status: DONE (`efef4b4`, CI green)
**DONE 2026-06-21** — APPROVED (REVIEW.md). `CONTEXTS` = the 12 approved styles: `menu`, `arena`, `lofi`,
`ambient`, `chiptune`, `synthwave`, `dubstep`, `dnb`, `bigroom`, `boss8bit`, `tropical`, `techno` (solve/event
dropped). Distinctness golden = `{styles:12, pairs_compared:66, all_distinct:true}`. T139 pt1's engine
additions (wobble-sync, chip patch, victory drop) underpin them. Babysitter verified: 12 keys match the
palette; `node -c` clean; `synth.test` 144; `golden-synth` 19 (12 per-style + distinctness); CI green. **A's
T140 lists/routes them (names+labels in B's log).** *(Original spec below.)*

> Original spec:
**Owner approved the T141 palette (2026-06-21): "move ahead with those music styles, and add them to the
song picker."** Build the 12 exactly as proposed in `docs/research-music-styles.md` §2 (menu+arena kept; the
10 new: Lo-Fi Study, Ambient Drift, Chiptune Rush, Synthwave Cruise, Liquid DnB, Festival, 8-Bit Boss March,
Tropical Pluck, Hypno Techno, + **Dubstep Victory**). The owner did not request swaps.
Owner (live, switching now works): **"I like the menu and arena music. the others are a bit samey. the
dubstep victory doesn't seem to exist (victory or switcher). Keep the two I like, ditch the others, then
cut 10 NEW music styles (keep them distinct) including the dubstep victory. Put them all in the launcher."**
- **Engine side ([B], `synth.js` `CONTEXTS` + any new patches/drum patterns).** Final set = **12 named,
  mutually-distinct styles**: **keep `menu` + `arena` exactly** (owner likes them) and **add 10 NEW** ones,
  removing the current `solve`/`event` (owner finds them samey — design fresh replacements rather than
  keeping those two). Use every lever to make them **obviously different by ear** (mode · root/register ·
  progression · tempo · density · drum kit/Euclid · patch selection · reverb), per the T120 principles.
- **Aim for a varied palette** (B picks the specifics — these are suggestions, not a spec): e.g. a real
  **dubstep VICTORY** (REQUIRED — half-time, heavy LFO **wub** wobble bass, a drop), a calm/ambient one, a
  chiptune/8-bit, a lo-fi/swung groove, a synthwave arp, a driving DnB/breakbeat, an epic/cinematic pad, a
  funky/syncopated, a mysterious/minor, a bright/festive. **Must include ≥1 genuinely CALM style** (the game
  routes it to the solve screen — owner's standing "calm during solves" rule) and ≥1 festive (events).
- **Dubstep victory must be real + reusable two ways:** (1) a selectable looping style in the switcher so
  the owner can audition it; (2) the engine exposes a way for the win moment to fire it as a short
  **drop/sting** (extend/replace `sting("victory")` so it's an actual audible wub drop, not the current
  subtle wub+bell — the owner says it "doesn't seem to exist" on a win). Keep it on the un-ducked sfx bus
  (the T128 lesson) so it isn't self-ducked.
- **Distinctness GATE (extend the golden):** update `golden-synth.test.js` so the per-context score goldens
  cover **all 12** and the distinctness golden asserts they're **mutually distinct** (no two collapse to the
  same score) — this is the structural guard against "samey" returning. Regenerate the goldens (intentional).
- **DoD:** 12 distinct styles in `CONTEXTS` (menu+arena kept; solve/event replaced; 10 new incl. dubstep
  victory + ≥1 calm + ≥1 festive); a real audible dubstep victory drop reusable by the win sting; the golden
  distinctness gate covers all 12 + passes; `node -c` clean; all gates green; **B-owned files only**
  (`synth.js` + tests/goldens + `BUILDER-LOG-FX.md`). **Hand A the final list of style names/labels** (in
  the log) so T140 can list + route them. (Babysitter + owner audition each in the switcher — output
  feature, gates necessary-not-sufficient.)

### T149 — [A] THE celebration bug: `#fxBurst` is trapped inside the `display:none` reset modal — move it to top level · status: DONE (`9c211a3`, CI green, BROWSER-VERIFIED)
**DONE 2026-06-21** — APPROVED (REVIEW.md). A moved `<canvas id="fxBurst">` out of `#resetModal` to top-level
(body sibling of `.app`); `fx-wiring.test` +9 asserts it's not inside a modal. **Babysitter BROWSER-VERIFIED**
(headless Chromium, 393×852 @ dpr 2.75): on load parent=`BODY`, clientSize `393×852` (was `0×0`); clicking the
REAL "Item" tester paints **21.8% lit coverage**, no errors. `node -c` clean, `fx-wiring` 77, full suite + CI
green. **The 6-round celebration saga is closed — the engine (T133/T138) was always correct; one misplaced
`<canvas>` was the whole bug.**
**Found by an actual headless-browser render (Playwright), not a guess — after T125/T126/T133/T136/T137/T138
all missed it.** `<canvas id="fxBurst">` (index.html:321) is the **last child of `#resetModal`** (`<div class=
"modal hidden">`, the "Clear all data?" confirm modal). `.modal.hidden{display:none}` → the celebration
canvas is **removed from rendering** except while the reset modal is open (≈never). So the engine painted a
perfect ~20%-coverage shower into a canvas the browser never displayed — `clientWidth/Height = 0×0`. The
backing buffer looked fine (sized via the innerWidth fallback → why `dimensions()` read `1038×2305`), which is
how every headless gate + the owner-readout stayed misleading. **The engine work (T133/T138) was all correct;
this is the only thing wrong.**
- **Fix (one line):** move `<canvas id="fxBurst" class="fx-burst" aria-hidden="true">` OUT of `#resetModal` to
  a **top-level** position — e.g. directly after `#fxBackdrop` (index.html:19) / as a body-level sibling of
  `.app`, exactly like the working backdrop. (Verify `#fxCanvas` and `#fxBackdrop` are also top-level.)
- **Browser-proven:** in headless Chromium at the Poco-X3 viewport (393×852 @ dpr 2.75), the canvas reads
  `0×0` inside the modal and **`393×852` once moved to `document.body`**, and `FXGL.celebrate()` then paints
  **19.6% lit coverage** — a bold visible shower. (Same screenshot the owner was sent.)
- **DoD (browser-verified, not headless-only):** `#fxBurst` is top-level; a real-browser check (T150) shows
  its `clientWidth>0` and a celebration paints visible coverage; on the owner's device a win/run/item/tester
  shows the shower; `node -c` clean; all gates green; [A]-owned (index.html; maybe a styles tweak). (Babysitter
  confirms via the Playwright harness + the owner's eyes.)

### T150 — [B] Autonomous BROWSER-RENDER test harness (Playwright) — catch "rendered but invisible" for real · status: DONE (`44ea919`, CI green)
**DONE 2026-06-21** — APPROVED (delivered alongside T151). `test/browser/_harness.js` (self-serves the repo
read-only, resolves Playwright at `/opt/node22/lib/node_modules/playwright` + `/opt/pw-browsers`, **skips
clean with no browser so Node-only CI is unaffected**); `test/browser/render.test.js` (loads the real app @
dpr 2.75, fires the real celebration, asserts `#fxBurst.clientWidth>0` AND lit coverage ≥2000 — would've
caught T149's `0×0`/`display:none` modal); `test/browser/audio.test.js` (OfflineAudioContext peak-bound
gate). Babysitter verified the files are real (read them) + `node -c` clean. The autonomous render+audio
gates now guard the "green-but-invisible/inaudible" class. *(Original spec below.)*

> Original spec:
Owner: **"these iterations are getting nowhere and going round and round… step back and take a new approach…
or somehow test it autonomously with playwright or similar."** Right: our entire suite is **Node-only** and
can't see a rendered pixel, layout, or `display:none` — which is exactly how the celebration bug (T149) hid
through SIX rounds (every "drawn/sized?" gate passed while the canvas was `display:none`, `0×0`). A real
headless browser closes that gap. **The Babysitter confirmed this works in-env:** global `playwright`
(`/opt/node22/lib/node_modules/playwright`) + a Chromium at `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH=
/opt/pw-browsers`); it launches headless, loads the static app over a local `http.server`, reads canvas
pixels, and screenshots.
- **Build a B-owned browser-render harness** (new file, e.g. `test/browser/render.test.js` + a tiny runner;
  loads the app **read-only** — no edits to existing Halves files). It must, at a **phone viewport + dpr 2.75**:
  (1) load the app, capture **console/page errors** (fail on any); (2) drive the **real celebration** (click
  the FX tester, or fire it) and assert **`#fxBurst.clientWidth>0` AND visible lit-pixel coverage above a
  threshold** (would have caught T149 instantly via `clientWidth===0`); (3) assert the **FX backdrop** renders;
  (4) save screenshots as artifacts. Keep the existing Node gates; this is an **additional** browser gate.
- **Wire it as an opt-in/guarded gate** (skips cleanly if no browser is present so the Node-only CI path still
  works), and document how to run it locally (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node test/browser/…`).
  Optionally add a GitHub-Actions job that `npx playwright install chromium` + runs it.
- **DoD:** a runnable browser-render gate that loads the app, fires a celebration, and **fails if the canvas
  is 0-size / display:none / zero-coverage** (verify by temporarily re-nesting `#fxBurst` in the modal → the
  gate FAILS); screenshots saved; existing gates intact; B-owned files only. (This is the structural fix so we
  stop round-tripping rendering bugs through the owner.) *(Coordinates with A's T149: after T149, this gate
  goes green; it's the regression guard.)*

### T148 — [A] SFX volume can't go loud enough: the slider uses the music's 0–0.10× scale, but the SFX bus goes to 1.0 · status: DONE (`8a2b1a9`, CI green)
**DONE 2026-06-21** — APPROVED (REVIEW.md). SFX slider remapped to the real `SFX_MAX=1.0` range (was capped
at 0.10); louder default; `halves.sfxVol` migrated. CI green; `sound.test` updated. *(Loudness itself is
audio — owner's ear; structurally the range is opened.)*

> Original spec below.
Owner: **"sound fx volume doesn't go high enough. probably cos it's using the old sound system which was
always super quiet. probably sound effects should move to the new system that music moved to."** **Diagnosed
— NO re-engineering needed:** the root cause is the **slider mapping**, not the SFX engine. `sound.js`'s
`sfxBus` accepts up to **`SFX_MAX = 1.0`** (0 dBFS, limiter-protected), but T143's `sfxVolRange` is `0–10`
and `main.js` calls `setSfxVolume(slider / 100)` → SFX gain tops out at **0.10** (−20 dB). With per-note gains
~0.10–0.16, max SFX peak ≈ 0.10×0.16 ≈ **0.016 (−36 dB)** — i.e. ~**10× of headroom is left unused**. (So
moving SFX into the synth engine is unnecessary; just open up the range.)
- **Map the SFX slider to the real SFX range (0 → `SFX_MAX` = 1.0×)**, not `/100`. Keep it a clearly-labelled
  "×" control, but with a max of **1.0×** (vs music's 0.10×) — the asymmetry reflects that SFX are
  intrinsically quieter. E.g. `sfxVolRange` `min=0 max=100 step=5` → `/100` = 0–1.0× (or `0–10 step` → `/10`);
  pick a **louder sensible default** (e.g. ~0.5–0.8×, clearly audible over the music) and **migrate** the
  stored `halves.sfxVol` (old 0–10 value → the new scale so returning users get the louder mapping, not 8/100
  = 0.08×). Update `fmtVol`/the readout so it shows the new value.
- **Sanity:** the brickwall limiter still governs the SFX+music SUM, so a higher SFX gain stays clip-safe;
  confirm mute still zeroes both and the music volume is unaffected.
- **If 1.0× still isn't loud enough by ear** (unlikely — it's a +20 dB jump), the follow-up is to lift the
  per-note `g` values in `sound.js` (still [A], still clip-safe via the limiter) — note it, don't pre-do it.
- **DoD (LIVE-verified):** the SFX slider reaches a genuinely loud level (SFX clearly cut over the music at
  the top of the range); sensible louder default; old stored value migrates; music volume + mute unchanged;
  `node -c` clean; all gates green (assert the SFX slider maps to ~`SFX_MAX`, not 0.10); [A]-owned files.
  (Babysitter + owner confirm by ear.)

### T146 — [A] Declutter the home nav: drop the Sound icon + move Exit INTO Setup · status: DONE (`8a2b1a9`, CI green, BROWSER-VERIFIED)
**DONE 2026-06-21** — APPROVED (REVIEW.md). Sound + Fullscreen/Exit removed from the home nav (Audio reachable
from Setup; Fullscreen moved into Setup). Babysitter browser-verified: no `soundBtnMenu`/`exitBtn` ids on
home; nav row = Best·Items·Heroes·Arena·Setup; Settings has the Audio link; no page errors.

> Original spec below.
Owner (live, after T143): **"if sound is now a sub menu of setup, we can get rid of the sound icon from the
main screen. let's also get rid of the exit button and add that to setup too."** Now that audio has its own
menu, the home bottom row (Best · Items · Heroes · Arena · **Sound** | Setup · **Exit**) is cluttered.
- **Remove the home `Sound` nav button** (`#soundBtnMenu`). Its only job was to open `#/audio` — so **make
  the Audio menu reachable from inside Setup** (an "Audio" / "Sound" row in Settings that routes to `#/audio`)
  so audio is genuinely a sub-menu of Setup. (Keep the entry-screen `#soundBtn` mute toggle as-is.)
- **Remove the home `Exit` button** and **add an Exit action inside Setup** (e.g. a row in Settings, near or
  in the danger area, that does what the old home Exit did — confirm the exact behaviour, full-screen exit /
  back-to-entry).
- Re-balance the home nav row (now Best · Items · Heroes · Arena · Setup) so spacing/centring still looks
  right (it was built for the old count — see the home-layout/T96 work).
- **DoD (LIVE-verified):** the home bottom row no longer shows Sound or Exit; the Audio menu is reachable
  from Setup; an Exit action lives in Setup and works; no orphaned route/handler/`$("id")`; `node -c` clean;
  all gates green (cross-check no dangling `soundBtnMenu`/home-Exit refs; assert Setup links to `#/audio`);
  [A]-owned. (Babysitter + owner confirm via screenshot.)

### T147 — [A] Move the FX/celebration tester out of the Audio menu into a GRAPHICS section · status: DONE (`ae0b7e4`, CI green, BROWSER-VERIFIED)
**DONE 2026-06-21** — APPROVED (REVIEW.md). FX/celebration tester moved out of `#audio` into a Graphics
section. Babysitter browser-verified: Settings shows a Graphics section; the FX tester is no longer in the
Audio menu; no page errors.

> Original spec below.
Owner (live): **"the fx test is now in the sound menu which seems wrong. should be in a graphics section."**
Correct — the celebration tester is a *visual* test, not audio.
- **Move the celebration tester** (Item / Rank up / Arena win / Big burst + the `dimensions()`/`isReady()`
  readout) **out of `#audio`** into a **Graphics/Visual section** — either a new `#graphics` sub-menu of Setup
  (mirroring the Audio menu pattern, scrollable, Back reachable) or a clearly-labelled "Graphics" block in
  Settings. Keep the `ensureAudioReady`-style guard so firing a test doesn't disturb music.
- Leave room to grow (future graphics toggles — reduced-motion, FX quality — can live here later).
- **DoD:** the FX/celebration tester is in a Graphics section (not the Audio menu); still fires each
  celebration + shows the size readout; reachable + Back works; `node -c` clean; all gates green; [A]-owned.
  (Babysitter + owner confirm.) *(Note for the owner: the celebration RENDER fix is `8145505`/in HEAD
  `daa64f5` — if they tested an older build they wouldn't have seen it; re-test on the current build.)*

### T140 — [A] Music switcher + routing for the 12 styles (audition all incl. dubstep victory; victory fires) · status: DONE (`9e706f3`, CI green, BROWSER-VERIFIED)
**DONE 2026-06-21** — APPROVED (REVIEW.md). The music picker lists all **12 styles**; per-screen routing +
dubstep-victory wiring. Babysitter browser-verified: the picker renders 12 buttons (Neon Lobby · Lo-Fi Study
· Ambient Drift · Chiptune Rush · Synthwave Cruise · Tropical Pluck · Festival · Hypno Techno · Liquid DnB ·
Phrygian Onslaught · 8-Bit Boss March · Dubstep Victory); no page errors. *(Switching the styles exposed the
T151 synth-divergence bug — separate [B] fix; the picker itself is correct.)*

> Original spec below.
Depends on T139 (B's final style list). The owner wants **all 12 styles in the launcher** to audition, and
the **dubstep victory to actually fire on a win**.
- **Switcher (Settings)** — extend the T129 music switcher from 4 buttons to **all 12 styles** B defines
  (use B's names/labels from its log; same pixel-button a11y, ≥44px, keyboard, scroll/wrap as needed for 12;
  each calls `Synth.setContext(name, {now:true})` so it swaps instantly + cleanly via T134). Include the
  **dubstep victory** as an auditionable entry (if it's a sting not a loop, a button that triggers the
  drop). Show the selected one; revert to per-screen music on exit.
- **Per-screen routing** (`musicForScreen`) — decoupled from style names now there are more styles than
  screens: menu screen → `menu`, arena → `arena`, **game/solve → one of the new CALM styles** (preserve
  calm-during-solves), event → a festive style. Keep the T113 tempo + T132 `{now:true}` instant swap.
- **Victory** — on a real Arena win / topic-complete, fire B's **dubstep victory drop** (via the engine
  hook T139 exposes) so the owner actually hears it (it currently "doesn't seem to exist" on a win); keep it
  on the sfx bus (un-ducked).
- **DoD (LIVE-verified — output feature):** all 12 styles audition in the picker and each is
  audibly distinct; picking one swaps instantly + cleanly; per-screen routing plays sensible (calm solve,
  energetic arena) styles; **a dubstep wub drop lands on a win**; reverts to per-screen on exit; `node -c`
  clean; all gates green (assert the switcher offers all 12 contexts; assert the win path triggers the
  victory drop); [A]-owned files. (Babysitter + owner confirm by ear.) *(The picker now lives in the
  dedicated Audio menu from T143.)*

### T143 — [A] Audio gets its OWN scrollable menu (Sound button opens it) + separate Music/SFX volumes + fixes · status: DONE (`59e2c28`, CI green)
**DONE 2026-06-21** — APPROVED (REVIEW.md). New scrollable `#audio` menu opened by the home Sound button
(`#/audio`); mute toggle moved inside; Settings + Audio bodies are `.scroll-body overflow-y:auto` → Back
always reachable. Separate `#musicVolRange` (def 5=0.05×, Synth music path) + `#sfxVolRange` (def 8=0.08×,
louder) volumes; `halves.vol` migrates; mute silences both. `ensureAudioReady` unlocks audio without
`musicForScreen` (FX tester no longer restarts music). Babysitter verified: node -c clean, new ids present,
full suite + CI green. *(Owner follow-ups → T146/T147.)*

> Original spec below.
Owner (live): **(a)** "we need separate volume controls for sounds and music, cos the sounds are getting
lost now." **(b)** "the config menu now goes off the bottom of the page, and it's not possible to scroll. so
I can't go back. maybe sound controls should live in their own menu. our sound button can open that menu
instead of toggling. and the toggle can live inside the menu." **(c)** [from T138] the celebration tester
restarts the music when tapped.
- **Dedicated Audio menu.** The home **Sound button** (bottom row) currently toggles mute — change it to
  **open a new Audio settings screen/menu** (hash route + back button, same chrome as Settings). **Move the
  mute toggle INSIDE** this menu, plus all audio controls: music style picker (→ T140's 12), tempo, the
  volume sliders (below), and the celebration tester. This declutters the main Settings (which had grown too
  tall) and gives audio a clear home.
- **SCROLLABLE (the navigation-trap fix).** Make the Audio menu **and** the main Settings screen
  `overflow-y:auto` within the safe-area height so the **Back button is ALWAYS reachable** — no control can
  push it off the bottom. (Audit other long screens too.) This is the priority: the owner is currently
  trapped (can't go back).
- **Separate Music + SFX volumes.** Replace the single master-volume slider (T135) with **two**: **Music**
  (a gain on the Synth music path — `Synth.output()` is consumed by [A], insert a GainNode there) and **SFX**
  (sound.js's SFX gain — A owns `sound.js`). Keep the louder-engine scale + a sensible default each (SFX
  higher relative to music so sounds aren't lost); migrate the old single `halves.vol`. Mute still silences
  both.
- **Fix the tester music-restart** (T138(b)): `fireCelebrationTest` should unlock audio **without** calling
  `musicForScreen` (which re-routes/restarts the music) — just ensure the context is unlocked + `setupFx`.
- **DoD (LIVE-verified):** the Sound button opens a scrollable Audio menu with the mute toggle inside, the
  music picker, tempo, and **independent Music + SFX volume sliders** (sounds audible over music); **Back is
  always reachable** on both the Audio menu and Settings (no off-screen trap); the celebration tester no
  longer restarts the music; `node -c` clean; all gates green (assert the Sound button routes to the menu;
  assert two volume params; assert the scroll container); [A]-owned files. (Babysitter + owner confirm live.)

### T144 — [A] Move the Goblin-Gold/Momentum readout pill to the TOP of the home page · status: DONE (`daa64f5`, CI green)
**DONE 2026-06-21** — APPROVED. `.readouts` is now a header stat bar at the very top of `#start` (above the
event banner), keeping its T142 pill backing. Verified: ids present, full suite + CI green.

> Original spec below.
Owner (live): **"the goblin gold / momentum pill should move to the top of the page."** Currently the
`.readouts` row sits low (above the Start row). Move it to the **top** of the home screen (above the event
banner / topic tree, as a header stat bar) while keeping its T142 local dark pill backing (so it stays
legible over the backdrop) and a11y/layout intact.
- **DoD:** the gold/momentum readout renders at the **top** of `#start`; still legible (keeps its pill
  backing); no layout/scroll regression (respects the T112 safe-area height); `node -c` clean; all gates
  green; [A]-owned files. (Babysitter + owner confirm via screenshot.)

### T145 — [A] Drop the build-stamp pill (dev-only — owner accepts low contrast) · status: DONE (`daa64f5`, CI green)
**DONE 2026-06-21** — APPROVED. `.build` pill backing removed (plain text); `contrast.test` exempts `.build`
while keeping `.readouts`/`res-label` protected (still fails if those lose backing). Verified: full suite + CI
green.

> Original spec below.
Owner (live): **"I don't like the build info pill at the bottom. maybe get rid of the black pill and leave
those hard to read. they're just for me anyway."** The `.build` stamp ("build <sha> · <ago>") is dev-only
info, so the owner explicitly opts it OUT of the contrast floor.
- **Remove the `.build` pill backing** that T142 added (`background:rgba(14,17,22,.88)` + radius/padding) so
  the stamp is plain/unstyled again (low-contrast is fine here).
- **Exempt `.build` from the honest contrast gate** — `contrast.test` (reworked in T142) asserts the
  floating-on-backdrop elements have a local AA backing; **drop `.build` from that per-element set** (it's
  dev-only, intentionally low-contrast) while KEEPING the assertion for the real UI floating text (the
  `.readouts` gold/momentum row, `#arena .res-label`). The gate must still FAIL if `.readouts`/`res-label`
  lose their backing.
- **DoD:** the build stamp has no pill (plain text); `.readouts`/`res-label` keep their backing + the gate;
  `node -c` clean; all gates green; [A]-owned files. *(Pairs with T144 — both small home-screen pill tweaks;
  do them together.)*

### T134 — [B] Clean immediate context-swap (no layered overlap) + audible distinctness · status: DONE (`ea1ed5c`, CI green)
**DONE 2026-06-21** — APPROVED (REVIEW.md). Clean swap: `renderVoice` hands its amp param back, scheduler
tracks live voices on `M.active`, `releaseMusic()` on `swapNow()` ~75ms-releases active voices + music-bus
fade + reverb dip → clean cut-in; default phrase swap unchanged. Distinctness: reworked all 4 contexts.
Verified: `node -c` clean, `synth.test` 130 (swap drives activeVoices→0; default doesn't release early),
`golden-synth` regenerated + still 10/10 distinct, CI green. **Owner confirms switching now works + likes
menu/arena.** *(The distinctness rework is superseded by the owner's 12-style request — T139/T140.)*

> Owner live (sampling the T129 switcher): **"it sounds like the songs play over each other rather than
switching. or do they just sound really similar…?"** Both hypotheses are partly true and BOTH are
engine-side (`synth.js`):
- **(a) Overlap on the immediate swap.** `swapNow()` (T132) / `setContext(name,{now:true})` resets the
  generator but does **not** release the currently-sounding music voices, and the FDN reverb has a
  multi-second tail — so the old context's pad chord + reverb **ring over** the new context for several
  seconds; rapidly tapping the switcher piles up tails ("songs over each other"). This is a side-effect of
  the instant swap we just shipped (T132/T128) and now affects **every** per-screen transition, not just the
  switcher. **Fix:** on the **immediate** swap path only, quickly release/fade the active music voices +
  tame the reverb carryover (e.g. a short ~60–120ms music-bus fade-out→in across the swap, and/or release
  held voices + briefly cut the reverb send) so a switch **cuts in cleanly**. Leave the default
  phrase-boundary swap's natural ring intact (it's musical there).
- **(b) Contexts sound similar.** `solve`/`menu`/`event` share instrumentation (pad + bass + pluck/bell),
  close tempo (80/88/100) and density, differing mainly by mode — so to the ear they're alike (`arena` is
  the clear outlier with its wub bass + dense fast dark aeolian). **Strengthen the audible contrast** between
  solve·menu·event (vary register / instrumentation / tempo / density / drum kit), keeping the firm
  calm-solve-vs-energetic-arena rule and the `golden-synth` distinctness gate.
- **DoD (LIVE-verified — output feature):** on a real browser, rapidly switching via the Settings switcher
  **cuts each style in cleanly** (no audible pile-up of the previous track) and **each of the four styles is
  clearly different** by ear; the default (non-`now`) phrase swap is unchanged; add the strongest feasible
  headless check (e.g. after an immediate swap, no more than one context's worth of music voices is active;
  per-context scores stay mutually distinct — extend `synth.test.js`/`golden-synth.test.js`); `node -c`
  clean; all gates green; **B-owned files only** (`synth.js` + tests + `BUILDER-LOG-FX.md`). (Babysitter:
  confirm against the owner's ear — green gates necessary-not-sufficient.)

### T137 — [A] Celebration TESTER in Settings + diagnose why the burst is still invisible · status: DONE (`41016d4`, CI green) — tester built + occlusion fixed; owner live-check pending
**DONE 2026-06-21** — APPROVED (REVIEW.md). (1) Settings tester (Item/Rank up/Arena win/Big burst) fires
each celebration on demand (audioUnlock→setupFx→fxResizeAll) AND writes `fxBurst.isReady()`+`dimensions()`
into the row → on-device diagnosis without DevTools. (2) **Occlusion fix:** `#fxBurst` (z58) was UNDER the
older confetti `#fxCanvas` (z59) → swapped (celebration z59 above confetti z58, below toasts z60) — a
plausible root cause of the invisibility. Babysitter verified: `node -c` clean, new ids referenced,
`fx-wiring.test` 58→75, full suite + CI green. **Owner live-check pending:** if the tester now shows a
shower, occlusion was it; if not, the dimensions() readout pins it to **[B] `T138`** (engine particle
visibility — a count golden can't catch transparent/sub-pixel/off-canvas draws).

> Original task below.
Owner (live, after T136): **"I don't see celebrations. Add a celebration tester to the setup menu where I
can trigger different celebrations."** This is BOTH the requested feature AND the diagnostic instrument for
the still-live invisibility (T133+T136 passed every gate — incl. the golden — yet nothing shows; the golden
only **counts** drawn rects, it does not prove they are **visible**). Build the tester, then USE it to find
the cause.
- **Tester UI** (Settings, beside Sound/Volume/Tempo/Music-switcher; same pixel-button a11y as the music
  switcher — labelled group, ≥44px, keyboard, guarded no-op): buttons that **fire each celebration on
  demand** — at least **Item unlock** (`fxCelebrate([...])`), **Rank up** (`fxCelebrateRank`), **Arena win**
  (`fxCelebrateWin`), and a **Big burst** (`fxBigBurst`). Ensure `setupFx()`/`audioUnlock()` has run so
  `fxBurst` is mounted before firing. Each should be visibly distinct (count/palette).
- **Then DIAGNOSE live (the real point).** The Babysitter already ruled OUT the easy causes statically:
  the CSS layer is correct (`#fxBurst` is `z-index:58`, in front of `.app`), `Controller` sets `ready=true`
  synchronously for `{backend:"2d"}`, and `CPUBackend.renderFrame` draws particles correctly in code. So
  check, on a real device, in this order:
  1. **Is `fxBurst` live?** `fxBurst` non-null, `fxBurst.isReady() === true`, and **`fxBurst.dimensions()`
     returns the real viewport size** (not 0×0 / 1×1). If 0/1, the canvas had no size when `_applyResize`
     ran → fix the resize/`_cssSize` timing ([A]) — note `#fxBurst`'s parent/`_cssSize` source.
  2. **Is something occluding it?** There is a SECOND overlay canvas **`#fxCanvas` (`z-index:59`, the older
     `window.FX` system) stacked ABOVE `#fxBurst` (z-58)** — if `#fxCanvas` is present/opaque/covering, it
     hides the burst. Reconcile the two systems: confirm which one wins, and either layer `#fxBurst` above
     it or route everything through one canvas. (Two parallel celebration stacks is itself a smell.)
  3. **Do particles draw but invisibly?** If `fxBurst` is ready+sized and unoccluded yet nothing shows,
     inspect the live `#fxBurst` canvas in DevTools during a tester fire — particles may render
     transparent / sub-pixel / off-canvas (which a fillRect-**count** golden can't catch). If so, that's a
     **[B] engine** fix in `CPUBackend.renderFrame`/seed sizing — flag it precisely (with the observed
     dimensions/alpha/size) as **T138 [B]**, and have B add a golden that asserts particle **visibility**
     (on-canvas coords + non-zero alpha + ≥1px device size), not just a draw count.
- **DoD (LIVE-verified):** Settings has a working celebration tester that fires each type on demand; AND the
  invisibility is **root-caused** — fixed here if it's [A] (occlusion / resize-timing / wrong-canvas), or
  precisely handed to **[B] T138** with the live evidence if it's engine-side particle visibility. `node -c`
  clean; all gates green; [A]-owned files. (Babysitter: the bar is the owner SEEING a celebration via the
  tester — green gates are necessary-not-sufficient; do not mark DONE on gates alone.)

### T136 — [A] Wire the celebration overlay: mount `#fxBurst` with `{backend:"2d"}` · status: DONE (`f4040e6`, CI green)
**DONE 2026-06-21** — APPROVED (REVIEW.md). `setupFx` now mounts `#fxBurst` with `{backend:"2d"}` (backdrop
`#fxBackdrop` stays WebGL); T125 resize-before-fire kept. Babysitter verified: `node -c` clean, both canvas
ids present, `fx-wiring.test` 54→58 (burst mounts 2d, backdrop does not), full suite + CI green. **Owner
live-confirmation pending** — finishing a run / Arena win / new item should now show a particle shower.

> Activation of T133. B shipped the engine fix (`FXGL.mount(canvas, {backend:"2d"})` → Canvas2D overlay,
> no 2nd-GL-context, always presents). The celebration still won't render live until A re-points the burst
> overlay to it.
- **Change only the `#fxBurst` mount** (in `setupFx`) to pass **`{backend:"2d"}`** so the overlay uses the
  Canvas2D backend. **Leave the backdrop `#fxBg` on its WebGL path** (the first/working context). Keep the
  T125 resize-before-fire + `fxResizeAll` behaviour.
- **DoD (LIVE-verified — output feature):** on a real device, finishing a topic run / winning an Arena
  fight / gaining a new inventory item throws a **visible particle shower** over the UI (z-58); `node -c`
  clean; all gates green (the T133 `fx_celebrate_2d_frame` golden + `ready`+sized assertions already guard
  the engine side); only [A]-owned files touched. (Babysitter: confirm against the owner's live "I finally
  see celebrations.")

### T135 — [A] Volume recalibration for the louder synth engine (default 0.05×, max 0.10×) · status: DONE (`09b6d9b`, CI green)
**DONE 2026-06-21** — APPROVED (REVIEW.md). `#volRange` → `min=0 max=10 step=1 value=5` (0.00×–0.10×,
default 0.05×); `loadVol()` fresh default → 5; **migration**: `loadVol` returns 5 for fresh OR any stored
`v>10` (old `300`=3.0× → 5) — a clamp-on-read (idempotent; every reader goes through `loadVol`, no bypass).
master gain/`fmtVol`/limiter unchanged. Babysitter verified: `node -c` clean; `sound.test` 38 pass; CI
green; migration logic-checked (fresh→5, 300→5, 10→10, 0→0, 11→5 — none deafening). *(Original spec below.)*

> Owner: "volume is much higher now that we have the new audio. that's good, but let's move the default to
0.05× and adjust the volume slider range to make the new max." **Owner confirmed the new MAX = `0.10×`**
(2026-06-21). The new synth engine is intrinsically far louder than the old SFX-calibrated scale, so the
3.0× default is now too hot.
- **New numbers** (master gain stays `vol/100`; `fmtVol` = `(v/100).toFixed(2)+"×"` already shows
  `0.05×`/`0.10×` fine): `index.html` `#volRange` → **`min=0 max=10 step=1 value=5`** (range 0.00×–0.10×
  in 0.01× steps; default 0.05× sits mid-slider). `loadVol()` default → **5** (was 300).
- **⚠ Migration (don't skip):** existing players have `halves.vol` = old-scale values (e.g. `300` = 3.0×)
  in localStorage. On load, **clamp a stored value above the new max down to the new default** (treat any
  `vol > 10` as the old scale → reset to 5, or clamp into `[0,10]`) so a returning user is NOT hit with a
  deafening 3.0×, and the slider (max 10) isn't fed an out-of-range value. Persist the migrated value.
- **DoD (LIVE-verified — output feature):** default volume is 0.05× on a fresh load AND for a user who had
  the old 3.0× stored (migrated, not deafening); the slider runs 0.00×–0.10× in fine steps and the readout
  matches; `node -c` clean; all gates green; add/adjust a check for the new default + the migration clamp;
  only [A]-owned files. (Babysitter: confirm the migration actually clamps a pre-seeded `halves.vol=300`.)

### T133 — [B] FXGL: make the overlay CELEBRATION actually render on-device (the z-58 burst) · status: DONE (`3e7da28`, CI green)
**DONE 2026-06-21** — APPROVED (REVIEW.md). Route (b): `FXGL.mount(canvas, {backend:"2d"})` forces the
Canvas2D backend (no per-document GL-context-count limit → always inits + presents), sidestepping the 2nd
WebGL context mobile GPUs refuse. CPUBackend's `renderFrame` animates `burst()`/`celebrate()` via
`fillRect`; added `dimensions()`/`isReady()` for the ready+sized assertion; new `fx_celebrate_2d_frame`
golden snapshots a real drawn frame (`drawn:600` spread across an 8×6 grid). Babysitter verified
independently: `node -c` clean; `fxgl.test` 124 + `golden-fx` 19 pass; **mutation test** — tampered the 2D
golden → harness CAUGHT it (non-zero exit), so "renders nothing" now fails CI. **Activation = [A] `T136`**
(mount `#fxBurst` with `{backend:"2d"}`). *(Original spec below.)*

> Split from T128(3). The owner badly wants celebration ("a LOT more celebration… loads of particles") but
> sees **nothing** live, even after T125's resize fix. A's app-side wiring (`fxBigBurst` → resize +
`FXGL.celebrate()` on every win / topic-run / new item) is correct + tested — the gap is in the engine/
device render path, which is B-owned.
- **The diagnosis (from A's T128 handoff):** `#fxBurst` is a **second WebGL/WebGPU context**, separate
  from the working `#fxBackdrop`, and it presents nothing on-device — the leading cause is the **2nd GL
  context failing to initialise/present** (mobile GPUs, e.g. the Poco X3 target, commonly refuse or lose a
  second context). It **cannot** be solved by drawing on the backdrop canvas: that canvas is `z-index:-1`
  (behind `.app`), so a burst there renders **behind the UI panels** — the celebration must present at the
  **z-58 overlay**, in front of the panels.
- **Fix (engine-owner's call) — must end with particles visibly on top of the UI on a real mobile browser.**
  Candidate routes (pick/justify): (a) diagnose + repair the 2nd overlay context so it reliably inits +
  presents, with a graceful fallback when a 2nd GL context is refused; (b) a **Canvas2D overlay** particle
  renderer (no GL-context-count limit → always renders) that FXGL can mount at overlay z; (c) a
  single-context scheme that still lands the burst in front of the UI. Keep the engine's
  reduced-motion / `setQuality` budget / determinism rules.
- **Verify for real (break the "green-but-invisible" trap):** confirm **on a real mobile browser** that a
  win/run/item throws a visible shower; and add the **strongest feasible headless check** — e.g. assert the
  overlay controller reaches `ready` + non-1×1 sized on the chosen backend before it draws, and a CPU-still
  **golden** of the celebrate frame (extend `test/golden-fx.test.js`) so a regression to "renders nothing"
  fails CI.
- **DoD:** a visible particle celebration presents at the overlay layer (in front of the UI) on a real
  device; the chosen backend has a refusal/loss fallback that still renders; headless `ready`+sized
  assertion + a celebrate-frame golden added; `node -c` clean; all gates green; **B-owned files only**
  (`fxgl.js` + its tests/goldens + `BUILDER-LOG-FX.md`) — A re-points `#fxBurst` at the working overlay
  once it lands. (Babysitter: confirm the headless check actually fails on a non-rendering backend, and
  confirm against the owner's live observation — green gates are necessary-not-sufficient here.)

### T142 — [A] Restore the FX backdrop that T123's scrim killed — keep AA via LOCAL protection, not a global slab · status: DONE (`42aac3b`, CI green)
**DONE 2026-06-21** — APPROVED (REVIEW.md). Removed the global `.app` scrim (backdrop reads again) + added
local translucent-dark pills only on the floating rows (`.readouts` stat row, `.build` stamp, `#arena
.res-label`) keeping AA (~4.93:1 over white) with the backdrop visible around them. `contrast.test` reworked
per-element (still honest, fails on an unprotected floating row). Babysitter verified: `.readouts` wired in
index.html, `.app` slab gone, `contrast.test` 14 + full suite + CI green. **Owner: backdrop restored.**

> Original task below.
Owner (screenshot, build `63876e4`): **"this build killed the nice background :-("**. T123's a11y fix put a
**semi-opaque dark scrim on `.app`** (`background:rgba(14,17,22,.88)`) — but `.app` is ~the full phone width,
so the full-bleed FX backdrop (which the owner loves) is now a near-solid dark slab with only thin purple
gutters. A **uniform** scrim can't keep BOTH (a light scrim fails AA over the backdrop's bright pixels;
verified: even ~40% over white → ~mid-grey, muted text fails). **Almost all text is ALREADY inside dark
cards** (event banner, tree nodes, Halves summary, every button) and never needed the global scrim — so:
- **Remove the global `.app` scrim** → the full backdrop reads again (owner's "nice background" back).
- **Protect only the genuinely floating-on-backdrop text** with a LOCAL treatment (a translucent-dark
  pill/backing behind the element, ample for AA): audit the home + other screens for text that sits directly
  on the backdrop — at least the **stat row** ("24.0K Goblin Gold · N Momentum") and the **`build` stamp**;
  check screen titles/subtitles, the tree's connector gaps (nodes are carded — fine), and any settings/
  results text not in a card. The cards already give the rest its contrast.
- **Keep the honest gate** but reframe it for the new mechanism: `contrast.test` should assert the
  floating-text elements have a **local** dark backing sufficient for `--muted`/`--text` AA over the
  worst-case (white) backdrop pixel — NOT that a global `.app` scrim exists. It must still FAIL if a
  floating row is left unprotected. (Shared-primitive change — removing the `.app` background — ships with
  its invariant.)
- **DoD (LIVE-verified):** the FX backdrop is fully visible again (owner confirms the "nice background" is
  back) AND all body/label text clears AA (floating rows have local backing; carded text unchanged); honest
  `contrast.test` updated to the per-element mechanism + still fails on an unprotected floating row; `node -c`
  clean; all gates green; [A]-owned files. (Babysitter: confirm against the owner's screenshot — green gates
  necessary-not-sufficient; the bar is the owner seeing the backdrop AND readable text.)

### T123 — [A] Accessibility pass: text legibility over the FX backdrop (AA floor + honest gate) · status: DONE (`63876e4`, CI green) — superseded by T142 (scrim too heavy)
**DONE 2026-06-21** — APPROVED (REVIEW.md). Dark scrim `background:rgba(14,17,22,.88)` on `.app` pulls the
worst-case bright backdrop pixel under text dark enough for `--muted` to clear AA (~4.95:1 over white);
backdrop still reads in gutters + faintly through + the z-58 celebration; dropped `.build` `opacity:.7`.
**Honest gate:** `contrast.test` derives the scrim, composites over the brightest backdrop pixel (white),
asserts AA against THAT (fails on no/weak scrim). Shared-primitive (`.app`) change ships with its invariant.
Verified: `node -c` clean, `contrast.test` 10 (fail without scrim), CI green. *(Owner: backdrop now dimmed
~88% behind text for legibility — say if you want it brighter.)*

> Owner: "we may need another accessibility pass — we have light grey text on light purple now." **Root
cause (the recurring backdrop theme):** T112's full-bleed FX backdrop replaced the near-black
background behind text with a **light purple** scene, but all `--muted`/grey text was tuned for AA
against the dark `--bg`, and **`contrast.test.js` still tests against `--bg` (dark) — so it passes while
the *rendered* contrast fails**. (Same class as the black scroll-fade: the backdrop invalidated the
dark-bg assumption; see ORCHESTRATION's "shared quality rule".) Do a real pass.
- **Audit every text element that renders directly over the backdrop** (not on an opaque panel) — esp.
  `--muted` text: the gold-bar labels ("Goblin Gold"/"Momentum"), the `build` stamp, topic-info
  subline, node sublabels/`tn-prog`, the `#game` eyebrow, any `--muted` row on `#start`/`#arena`. List
  which fail AA against the backdrop's *brightest* state.
- **Guarantee a contrast FLOOR behind text while KEEPING the atmosphere.** Preferred: a **dark scrim**
  between the backdrop and the DOM content — e.g. dim/darken the backdrop behind the central content
  column (a semi-opaque dark gradient/vignette, or cap the backdrop's luminance, or lower
  `.fx-backdrop opacity` where text sits) so muted text clears **AA (≥4.5:1 body / 3:1 large)** over the
  worst-case backdrop. The backdrop should still read at the edges/behind non-text. Don't flatten it to
  solid black. (Alternative per-element: give text-bearing rows a subtle dark backing.) Keep the gamey
  look + `data-ui="pixel"`.
- **Make the contrast gate HONEST (so this can't silently regress).** Update `contrast.test.js` to test
  the at-risk text colours against the **worst-case backdrop luminance** (the brightest the home/Arena
  backdrop can render — derive it, don't hardcode dark `--bg`), asserting AA; and/or assert the scrim
  exists with enough opacity to pull any backdrop pixel under text below the AA threshold. The gate must
  *fail* on today's grey-on-purple and *pass* after the fix.
- **DoD:** all body/muted text over the backdrop clears **AA** on the Poco-X3 backdrop (home AND Arena,
  brightest state); the atmosphere is still visible (not blacked out); ≥44px targets + focus rings
  unaffected; the **`contrast` gate now reflects the real rendered condition** (would have caught this);
  `node -c` clean; all gates green; 360-safe. (Babysitter: eyeball the home/Arena text is readable over
  the backdrop, and confirm the contrast gate genuinely tests against the backdrop, not the dark token.)

### T121 — [A] Small visual polish: scroll-fade reveals the backdrop + coloured status icons (coin gold, calendar green) · status: DONE (scroll-fade `0972c77` + icons `b662840`)
**(b) Status icons take their text colour (owner).** The T117 pixel icons all render in the muted/grey
inherited colour, which is fine **except the two status icons that sit beside coloured amounts**: the
**coin** (next to the gold amount — "keep that gold like the text") and the **momentum calendar** (next
to the green/mint "N Momentum" — "make it green to match its accompanying text, same as the gold
coin"). Give **`.px-ic.coin` = `var(--amber)`** (gold) and **`.px-ic.calendar` = `var(--mint)`** (green)
so each mask fills its status colour (per the mask technique icons.js uses); **all other icons stay
muted**. They appear in the home gold/momentum bars (+ coin in results `resGold` / reward toasts) — set
it globally so they're coloured everywhere. **(a) Scroll-fade (below) — the original T121.**
Owner (screenshot): the T116 scroll-fade is back but it's a **black band** over the new purple FX
backdrop — "should either fade to transparent (if possible) or be light purple matching the bg."
**Cause:** `.picker-wrap::before/::after` paint `linear-gradient(var(--bg), transparent)` and `--bg` is
`#0E1116` (near-black); the tree/`#start` are transparent so the FX backdrop shows through everywhere
*except* the fade, which reads as a black smear.
- **Preferred fix — fade the CONTENT to transparent (reveal the backdrop).** Use a **CSS mask** on the
  scroll container `.tree` (`-webkit-mask-image`/`mask-image: linear-gradient(...)`) so the tree's own
  pixels alpha-fade at the scrollable edge and the **purple backdrop shows through** — no coloured
  overlay at all. Tie it to the existing **`can-scroll-up`/`can-scroll-down`** state (fade only the edge
  that has more content; fade both when both; none when it fits). Replace/!disable the black
  `::before/::after` colour-overlays (keep the `.scroll-cue ▾`).
- **Fallback (if a mask is problematic):** recolour the gradient from `var(--bg)` to a transparent→
  **light-purple** that matches the backdrop, so it blends instead of going black. (The mask is better —
  it tracks the live backdrop colour; a fixed purple only approximates the dithered/animated scene.)
- **DoD:** **(a)** when the tree scrolls, the top/bottom edge **fades into the purple backdrop (no black
  band)**, appears only where there's more to scroll, and tracks scroll state; taps still hit nodes; the
  cue still shows; reduced-motion safe; 360px-safe; works under `data-ui="pixel"`; assert the fade no
  longer uses the opaque `--bg` overlay / uses a mask. **(b)** the **coin icon renders gold**
  (`.px-ic.coin` = `var(--amber)`) and the **momentum calendar renders green** (`.px-ic.calendar` =
  `var(--mint)`) everywhere they appear; all other icons unchanged (still muted). `node -c` clean; all
  gates green (keep `tech-tree.test`'s scroll-toggle; extend `icons.test` to assert coin=amber +
  calendar=mint). (Babysitter: confirm the fade blends into the backdrop not black, the coin reads gold,
  and the calendar reads green.)

### T117 — [A] Replace ALL chrome emoji with house generative pixel icons · status: DONE (`3e72581`)
Owner: "do a pass where we replace all the emojis we're using with our own icons, in the style of our
existing generative icons … padlock, audio, settings cog, coin, calendar … do a pass to pick up
everything." Build the missing icons in the **existing procedural pixel-icon style** (the `glyphs.js`
pixel-mark system / the T50 nav-icon canvases / T56 topic glyphs) — small, crisp, on-brand — and swap
**every** emoji for one.
- **Babysitter's emoji audit (starting inventory — NOT exhaustive; sweep for more, e.g. ▶ and other
  Geometric-Shapes/Misc-Symbols my scan missed):** 🔒 padlock (×8, locked nodes/features) · 🔊/🔇
  speaker on·off (×10, sound) · ⚙ cog (×1, settings) · 🪙 coin (×6, gold) · 🗓 calendar (×2,
  momentum/events) · ⚔ swords (×4, boss/battle) · 🏁 flag (×1, boss/finish) · 🗺 map (×1, journey) ·
  ⭐/★ star (×7, rating/badge) · ✨ sparkles (×1) · ⛶ fullscreen (×3) · ⌫ backspace (×2, numpad) · ✕
  close (×1, modal) · ✓ check (×4, owned/correct) · ▶ play (CTA + node badge). **Do a fresh sweep of
  `index.html` + all `*.js` to catch every pictographic/symbol char, not just this list.**
- **KEEP (do NOT replace — these are semantic content, not chrome):** the **`→` flow/answer arrow
  (×118)** in hints/answers (e.g. "6 × 7 → 42") and the inline **`↑`/`↓`** in hint text. They're maths/
  reading content; leave them. (The scroll-cue `↓` is T116's concern, not this.)
- **Two contexts, handle both.** (a) **Standalone icon slots** (nav buttons, gold bar, momentum bar,
  rank/badge) → a small procedural pixel-icon canvas (like the T50 nav icons). (b) **Inline-in-text**
  (e.g. `'🔒 '+unlockHint`, `'⚔ Boss next'`) → either a pixel-glyph token rendered inline or a tiny
  inline canvas/`<span>` icon — keep the line readable and aligned.
- **Preserve a11y + state semantics.** Buttons keep their `aria-label` (the icon is decorative →
  `aria-hidden`); the **node-state badges (✓ done / 🔒 locked / ▶ playable)** must keep conveying state
  AND stay non-colour-only (the T100/a11y rule). Don't break the sound on/off swap, the fullscreen
  ⛶⇄Exit sync, or the numpad ⌫ key behaviour.
- **House style + no-build.** Pixel-art, crisp at small size, matching the existing palette/aesthetic;
  pure procedural canvas / glyph tokens (no image assets, no-build); style under `data-ui="pixel"`
  consistently; 360px-safe; legible (kid audience).
- **DoD:** every targeted chrome emoji is replaced by an on-style generative pixel icon (padlock,
  speaker on/off, cog, coin, calendar, swords, flag, map, star, fullscreen, backspace, close, check,
  play, + any others the sweep finds); the `→` answer-arrows and hint `↑/↓` are **untouched**; icons
  carry `aria-hidden` while their controls keep `aria-label`; node-state badges still read state +
  a11y-safe; mute/fullscreen/numpad still work; no image assets added; `node -c` clean; all gates
  green + **a new gate asserting NONE of the targeted emoji remain** in `index.html`/the icon-render
  source (allow-list the kept `→`/`↑`/`↓`) and that the new icon renderers produce non-empty output.
  (Babysitter: grep the served output for leftover emoji; eyeball the icons read clearly + on-brand.)

### T106 — [A] Tech-tree v2: use the full width + a clearer relationship visual language · status: DONE (`10e3000`)
Owner: the tree nodes **don't use the full screen width** (only ~2 abreast in a ~360px column) and
the **relationship between nodes isn't clear** — improve the connector visual language. Make the
home tech tree read like a real game tech tree. Builds on T84 (data-driven graph) + T100 (gamey
tokens); coordinate the node/connector style with the `data-ui` look.
- **Use the width.** Lay the tree **wider — ~3 abreast** (owner's suggestion) or a snaking/grid
  layout that fills the 360px width, instead of the current narrow 2-wide column. Bigger or
  better-packed nodes; the tree should feel like it occupies the screen.
- **Clearer relationships.** Improve the connector language so **"X unlocks Y" reads at a glance**:
  clear directional **paths/pipes** (not a thin ambiguous line), and **visually distinguish the two
  edge kinds** — the **chain** (`unlockedBy`, the main progression) vs the **mastery-gate branch**
  (`requires:"mastery:<id>"` → Part-2). Consider **state-colouring the connectors** (the path you've
  unlocked reads "lit"/amber; locked paths dim) so progression is obvious. Optionally the path can
  "complete"/light as you advance (CSS/canvas, no-build).
- **Keep the invariants from T84:** rendered **from live data** (`unlockedBy`/`requires`/
  `isUnlocked`/`have-total`) — **never a parallel edge list**; **focusable `<button>` nodes**
  (a11y); **locked nodes preview-only, never start**; the **Best-Times list stays the a11y
  fallback**. Must scale to the Wave-2 topics (~23 nodes) since it renders from data.
- **Handle VARYING depth gracefully (don't assume uniform 3-wide).** Topics may have 1, 2, or 3
  parts (a Part 3 only exists where the curriculum has genuine depth — see IDEAS I6; **not** every
  topic gets one). The layout must read well whether a topic row is 1-, 2-, or 3-wide — render
  whatever depth the live `requires` chain shows, never force a fixed 3 columns.
- **Reclaim the bottom slack too (owner, T99 follow-up).** After T99 the home top-aligns, so leftover
  height now pools at the **bottom** (owner: "a little wasted space at the bottom… live with it for
  now"). A wider/taller tree is the natural place to absorb it: let the tree (the `flex:1 1 auto`
  picker) **grow to fill** the reclaimed vertical space (e.g. relax the `.app max-height:780px` cap on
  tall phones, or let the tree flex to the available height) so the home fills the viewport with no
  dead band top **or** bottom. Keep it 360px-safe and don't reintroduce a top band.
- **DoD:** the tree visibly **uses the full width** (≈3-abreast / filled layout, not a narrow
  column); the connectors **clearly convey unlock direction** and **distinguish chain vs
  mastery-gate** edges (and ideally lit/dim by state); still **data-driven** (grep/inspect confirms
  it reads live `unlockedBy`/`requires`, no parallel edge list); nodes stay **focusable**, **locked
  nodes never start**, 360px-safe, scales with more topics; coordinates with the `data-ui` tokens;
  `node -c` clean; all gates green (keep/extend `tech-tree.test.js`). (Babysitter: verify it fills
  the width, the relationships read clearly at a glance, the graph is still derived from live data,
  locked-start is impossible, and it holds at 360px + with an enlarged topic set.)

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

### T102 — [A] Installable Android build: PWA + TWA foundation (parity) · status: PWA CORE DONE (`ba5fd26`, CI green) · TWA/store = T103/T72
**PWA CORE DONE 2026-06-21** — APPROVED (REVIEW.md). Installable `manifest.webmanifest` (standalone, maskable
icon) + `icon.svg` + apple-touch-icon + an **update-safe service worker** (`sw.js`: network-first for
navigations/`build.json` so deploys/version-check still work, never caches build.json, cache-first only for
immutable `?v=` assets; guarded http(s)-only lazy registration). `pwa.test` 21 + gate in `pages.yml`.
Babysitter verified: SW strategy correct (no version-lock), manifest valid+installable, node -c clean, CI
green. **TWA wrapper / Play-Store signing deferred to `T103`/`T72` (need owner creds — owner away).**

> Pulled forward from `T72` so we get a **real installable Android app soon** to confirm web↔Android
> **parity** on the Poco-X3 floor. (T72's *Play-Store-submission* research/prep stays later.)
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

### T88 — Arena 3v3: deterministic battle model + enemy teams + re-calibration + invariant proofs · status: DONE
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

### T89 — Arena 3v3: team-selection UI (1–3 heroes) + enemy-team display · status: DONE (`9197265`) · owner-accepted
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

### T90 — Arena 3v3: watchable deterministic turn playout + result · status: DONE (`dffa345`) · owner-accepted
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

### T94 — Celebration FX: wins + collectible/loot/event gains · status: [B] engine DONE (`4a58b3f`) · [A] wiring (T94w) PENDING
**Purpose = amplify reward.** Heightened, *brief* particle/flourish moments so earning *feels* like
something — on **Arena wins** (the T90 playout's victory) and on **earning a collectible / loot /
event reward** (inventory gains). Builds on the T93 layer (GPU particles) and/or extends `fx.js`.
> **Two-builder split:** **T94 [B] — DONE (`4a58b3f`):** `FXGL.burst({x,y,count,seed,palette})` — a
> brief, capped (`BURST_CAP=256`), seeded/deterministic, auto-stopping particle burst on the B-owned
> engine (closed-form drag trajectory, single-RAF, reduced-motion-safe; 67-check gate). **T94w [A]
> (PENDING):** wire that burst onto the real win/collectible-gain hooks (`main.js`) once `FXGL` is
> mounted — fire on Arena wins + collectible/loot/event-reward gains, reduced-motion → calm flourish,
> never covers key text. Sequence after the FX-mount wiring; Babysitter to slot into A's queue.
- Fire on the existing win/unlock moments (don't invent new ones); reduced-motion → a calm
  reduced flourish; never obscures the question/result text; respects the toast system.
- **DoD:** a distinct celebratory burst on Arena wins AND on collectible/loot/event-reward gains
  (the effect **names its purpose: celebration**); reduced-motion safe; perf budget holds (capped,
  single loop, idle when done); doesn't cover key text (T64 spirit); 360px-safe; `node -c` clean;
  all gates green (+ a Node check that the burst fires on the win/gain hooks and is capped).
  (Babysitter: confirm it triggers on real win/gain events, stays within budget, and never blocks
  readability.)

### T95 — Semantic home/menu backdrop · status: [B] engine DONE (`beedfd8`) · [A] wiring PENDING
**Purpose = ambient status.** A living home backdrop that **reflects real state** — e.g. **today's
event theme** (palette/emblem seed) and/or **momentum/progress** — rendered through the T93 layer
(dither + palette + gentle motes). **Not generic noise.** Stays behind the (now compact, T91) home
UI; never competes with text or the topic picker.
> **[B] engine DONE (`beedfd8`):** `FXGL.deriveHomeScene(state)` + `Controller.setHomeState(state)` —
> event palette/seed dominate, progress raises the horizon glow, streak ≥3 → warm embers; deterministic
> per state, single-RAF, idle off-home, reduced-motion still. **[A] wiring PENDING:** mount `FXGL` on a
> home backdrop canvas (behind the DOM, `aria-hidden`/`pointer-events:none`) and call `setHomeState`
> with the real live state (today's event + progress + streak); stop it when off-home.
- **DoD:** the home backdrop is **driven by live state** (today's event / progress — verify it
  reads the real source; the effect **names its purpose: status**); behind the DOM UI, legible,
  360px-safe, reduced-motion + no-WebGL2 fallbacks; perf budget holds (idle when off-home); `node
  -c` clean; all gates green. (Babysitter: confirm it encodes real state, not decoration, and the
  home screen stays readable + one-screen per T91.)

### T108 — [B] Semantic Arena-biome backdrop derivation (the Arena sibling of T95) · status: DONE (`86a7094`)
**Purpose = sense of place + status (Arena).** Serves the owner's locked vision — atmosphere as a
*purposeful* layer in the Arena (sense of place per region; intensify near a boss; amplify the win).
Engine-side only; the [A] Arena wiring will call it (after T89/T90). Mirror T95's discipline exactly.
- **`FXGL.deriveArenaScene(state)` → a `setScene`-shaped backdrop from LIVE Arena state.** Inputs:
  region (1–10), tier within region, boss-proximity / facing-boss, and a mood (neutral / victory /
  defeat). **Region** drives the palette + scenery mood (a distinct sense of place per region — reuse
  the `scenery.js` region grid shape the engine already consumes); **tier + boss-proximity** raise
  intensity (denser particles / hotter glow as the boss nears, peak at the boss); **victory** mood
  briefly warms/brightens (pairs with a T94 `burst()` the [A] side fires). Deterministic from a
  state-derived seed (same state → same backdrop; shifts as you advance), capped, single-RAF,
  reduced-motion → static still, idle when off-Arena.
- **Scope:** B-owned files ONLY — `fxgl.js` (+ `test/fxgl.test.js`) + brickmap if a recipe is
  borrowed. **Never** edit existing Halves files. Headless-tested like T95 (deterministic per state,
  encodes real region/tier/boss as status not noise, textures-once, single-RAF, idles, reduced-motion
  still). Log = `BUILDER-LOG-FX.md`.
- **DoD:** `deriveArenaScene` returns a valid `setScene` shape that **demonstrably encodes region +
  tier + boss-proximity** (a Node check: different regions → different palette/mood; nearer-boss →
  higher intensity; deterministic per state); capped + single-RAF + idle + reduced-motion still;
  `node -c` clean; the fxgl gate extends to cover it; all gates green. (Babysitter: confirm it's
  state-driven sense-of-place, not decoration, and matches T95's budget discipline. **If the [A] FX
  wiring lands first and surfaces an engine gap, that work preempts T108.**)

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
> intact. **COMBINED (owner, 2026-06-21):** this phase now also **restructures existing
> topics** — scaling back over-hard Part 1s and adding Part 2/3 deepenings where there's
> genuine depth — **designed together with the new topics** as one curriculum (T58 = the
> unified blueprint; **T59–T61 will be re-batched to match it**). Anti-dilution still rules:
> a new part only where the curriculum has real depth (T106's tree handles varying depth).

### T58 — UNIFIED content blueprint: existing-topic rebalance + Part-3s + new topics (`docs/CONTENT-EXTENSION.md`) · status: DONE (`c89eebc`) · APPROVED
Write the canonical doc for **how to extend the game with new topics/content** without
breaking the coupled systems, with **new content, not dilution** — **AND** (owner, 2026-06-21:
"combine this work with the introduction of the new topics") design the **existing-topic
restructuring together with the new topics as ONE curriculum map**, resolving overlaps. Doc
only (plus reading the code to be accurate); no behaviour change. **Reflect the CURRENT Arena
calibration** — the **T88 team-sim `FOE_BUDGET`** auto-derives from the live collectible pool, so
adding content auto-scales the Arena (re-prove invariants on the grown set); the older
`statBattle`/def-formula text below is legacy and should be updated to the team model.

**Existing-topic restructuring (combine with the new topics — Babysitter analysis from the live
question sets, 2026-06-21):** two levers — **(a)** where **Part 1 is overly hard, scale it back**
(gentler on-ramp) and move the harder content to **Part 2/3**; **(b)** where a topic has **lots of
content / real depth, add a Part 3**. Per the **anti-dilution rule**, add a part ONLY for genuine
depth — NOT to force a uniform 3-wide tree (T106 handles varying depth).
- **Rebalance candidates (P1 currently too hard → split):**
  - **Place Value** — P1 today blends whole **AND** decimal ×÷10/100. Scale **P1 → whole ×÷10/100
    only** (on-ramp); **P2 → decimal ×÷10/100**; **P3 → ×÷100/1000, answers <1, 3-dp**.
  - **Fractions (→decimal)** — P1 today includes eighths/twentieths/sixteenths. Scale **P1 →
    common (½ ¼ ⅕ tenths)**; **P2 → eighths/twentieths/sixteenths**; **P3 → equivalent / ordering**.
  - **Squares** — P1 today runs to 13²–15² + 20²/25²/30². Scale **P1 → 2²–12² recall**; **P2 →
    extension squares (13²–15², 20²/25²/30²)**; **P3 → cubes &/or √ of perfect squares**.
  - **Times** (softer) — P1 is the deliberately-hard 6/7/8/9 core; consider a **gentler on-ramp**
    + push 2-digit× to P2/P3 *(coordinate with Larger ×/÷)*.
- **Part-3 deepenings (genuine depth, from IDEAS I6):** **Fractions of → reverse / find-the-whole**;
  **Percentages of → % increase/decrease**; **Add & Subtract → decimal ± / 4-digit / multi-step**.
- **Leave bounded (no new part — dilution):** **Halves · Doubles · Number Bonds**.
- **RESOLVE OVERLAPS (each skill in ONE place, not both):** Add&Sub decimal-P3 ↔ **Money** (Wave-2);
  Place-Value ×÷1000-P3 ↔ **Larger ×/÷** (Wave-2); Times-extension ↔ **Larger ×/÷**. The blueprint
  must decide each.
- **Deliverable = the FINAL topic map:** every topic with its **P1/P2/P3** (rebalanced) **+ the new
  Wave-2 topics**, the unlock chain, which skill lives where, and a build order (re-batch T59–T61
  to match). Each existing-P1 rebalance is a **content edit** (curated set changes) → re-curate per
  `QUESTION-SETS.md`; each new part/topic = the full anti-dilution kit (icons/names/guide/glyph/
  `explain`/`masterSecs`).
- **DOC/TEXT CASCADE — when content moves between parts/topics, the coupled TEXT must move with it
  (owner, 2026-06-21).** Re-curating a part's question set is **not** enough — every part's wording
  must match its NEW content: **(1)** the **`mode.tag`/description** (e.g. Place Value P1 "Whole ×÷
  10·100" must drop the decimals once they move to P2; the new P2/P3 need their own tags); **(2)**
  the **topic guide** (`guides.js` — the "how to approach this" text per part); **(3)** the
  **`Guides.explain()` hint branch** for that part — it must produce method-only, number-specific,
  **place-value-honest** hints for the questions the part NOW contains and **not** reference cases
  it no longer holds (and never leak the answer in digits OR words — the `hints.test.js` gate);
  **(4)** the **glyph tokens** (T56) if a part's operator/representation changes. The blueprint must
  **list, per moved skill, every text artifact that has to change**, and each build task must update
  them in lockstep — re-run `hints.test.js` + the guide/contrast gates so the docs can't drift from
  the content.
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
