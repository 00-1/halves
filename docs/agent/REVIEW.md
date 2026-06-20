# Review (Babysitter-owned) — Builder reads, does not edit

**Current verdict:** `APPROVED — T21`. **Next is T22 (Heroes screen `#/heroes`)** —
full spec in `docs/agent/DESIGN-heroes.md`. Roster grouped by type (Brawn/Cunning/
Arcane), locked/unlocked with the unlock hint, each hero's procedural pixel
portrait + **effective** stats (via `Heroes.effectiveStats`) and the items boosting
them; start-screen link + hash route. Use the `window.Heroes` API from T21 and the
menu music style. DoD: renders all 12 (locked + unlocked) at 360px without
overflow; routing + back work; no regressions; deploy green. **Display note:** the
currency is labelled **"Gold Stars" (⭐)** anywhere it appears.

When you (Builder) hand off a task, I will replace this with one of:

- `APPROVED — T<n>` + a note, then I flip T<n> to `DONE` in BACKLOG and open the
  next task. Continue to the next `OPEN` task.
- `CHANGES REQUESTED — T<n>` + a numbered list. Address **every** point fully
  (no deferrals), re-verify, re-handoff.

I review against the task's Definition of Done and the Quality bar in
`PROTOCOL.md`. Pull this file (`git pull --rebase`) after each push and before
starting new work.

---

## Log of verdicts

### T21 — Heroes module + stats → APPROVED
New `heroes.js`→`window.Heroes`. Independently verified (Node, real catalogue): node -c OK; no TODO/stub; loaded in index.html after collectibles.js. **All 12 heroes match the DESIGN-heroes table exactly** — type + base power/guard/speed/focus, ids bram…roon; names sourced from collectibles `HERO_NAMES` (in sync). `effectiveStats` = base when nothing owned, **grows for every hero** with the full collection; `rating`/`ratingOf` **monotonic non-decreasing** as boost items are added (weights power1/focus.8/speed.5/guard.3). **Every one of the 12 unlock predicates fires exactly on its listed condition and is locked just below it** — bram(1st init), greta(≥3 init), tovar(any mastery), mo(rank:darkwizard), wisp(collector:25), mira(≥3 flawless), nim(topics:one100), zeph(rank:archmage), pip(speed:*:3 Lightning), vex(meta:allmodes), sela(collector:75), roon(tier:10). RPS `matchup` correct (Brawn>Cunning ×1.5, reverse ×0.6, same ×1.0). Pure, no DOM. No regressions.

### T20 — Item layer: styles, names, boosts → APPROVED
First Phase-3 task. Independently verified (Node, stub canvas): node -c (collectibles/main) OK; main.js id cross-check clean (45, 0 missing); `.u-boost`/`.inv-name` CSS present; no TODO/stub; catalogue unchanged (775). Over **every** catalogue item: `style` is an integer in [0,10); `name` non-empty; `boost` references a real hero + real stat with rarity-correct amount (common1/unc2/rare3/epic5/leg8) — 0 violations. Boosts **spread across all 12 heroes** (per-hero 57–77 items) and **all 10 styles** used (69–88 each). **Deterministic across fresh reloads** (0 drift in style/name/boost per id). `drawIcon` runs for all 10 style routines without error; `boostLabel` formats ("+1 Guard · Pip Quickfingers"). HERO_IDS/STAT_NAMES match DESIGN-heroes exactly (bram…roon; power/guard/speed/focus). Additive fields — no regression to collectible earning. UI: toasts/modal/inventory show flavour names + boost line + earning achievement.

### T17 — Generative chiptune music (12 styles + menu) → APPROVED
Extends `window.Sound` with a look-ahead scheduler. Independently verified (stub AudioContext + captured timer + controllable clock): node -c (sound/modes/main) OK; main.js id cross-check clean (45, 0 missing); catalogue unchanged (775); no TODO/stub. **STYLES = exactly 13** (12 topic + menu@12), distinct names, all params present (bpm>0, non-empty scale, arp/bass/drums/density/waves). `styleIndexFor`: number→mod13, "menu"→12, any string→deterministic hash%12 **always in [0,12)**. `degMidi` **in-scale** for every style across degrees −3..15 × octaves −1..1. `stepVoices` **deterministic given a seed, varies across seeds**, all voices valid (f>0, d>0, type, g>0). Scheduler: does NOT start before `unlock()`; starts on unlock+setMusic; schedules oscillators across look-ahead ticks; keeps scheduling after a topic-style switch; **`setMuted(true)` stops it (no oscillators), unmute resumes**; suspends/stops when hidden; own low gain (0.07) off the shared master; only-timer-while-playing (low CPU). `show()` follows the screen (topic style in-game via `mode.music`/`mode.id`, menu elsewhere), guarded. All 15 modes carry an explicit `music` index. No game-clock impact. No regressions.

### T16 — Audio core + 8-bit SFX → APPROVED
New `sound.js`→`window.Sound`. Independently verified (stubbed AudioContext that counts oscillators): node -c (sound.js, main.js) OK; id cross-check clean incl new `#soundBtnMenu`; no TODO/stub. All 9 SFX specs (+unknown→empty) are pure and **bounded** (every voice f>0 finite, d>0, t≥0, known waveform, gain>0, end<0.6s). `correct` pitch **rises with combo and caps at +12**; `item` note count **scales 3→7 by rarity** (monotonic). **Gesture-gated**: 0 oscillators before `unlock()`; 7 for legendary item after. **Mute silences everything** (0 oscillators across all events while muted) and `isMuted` tracks; unmute resumes. Integration: `combo` resets on skip AND round start (does NOT reopen the T12 speed-skip exploit — speed brackets still require mistakes===0), single shared button-sync path (entry + menu, no double-binding), `halves.sound` persisted, all SFX fire-and-forget on the Web Audio timeline (never touches the `performance.now()` game clock/input), context suspends when hidden. Round-end stinger references real ids/cats (`topics:one100|all100`, `cat:"Mastery"`) → topic100>mastery>roundComplete. `gold` method exists but unwired = documented forward-hook for T26 (system not built yet), not an in-scope stub. No regressions.

### T9 — Percentages of → APPROVED
Completes Phase-2 topic core (T5–T9). Independently verified: node -c OK; no new DOM ids; no TODO/stub in diff. Node harness on real modes.js — `percentages` P1: 21 fixed items, stable unique prompt-set, pct set exactly {10,25,50}, every base ≤400, answer = base×pct/100 within 1e-9 of stored literal, non-negative, numpad-round-trips, max length 3. `percentages2` P2: 21 fixed, stable, pct set exactly {1,5,20,75}, bases ≤200, clean terminating answers (0.5, 4.5…) round-trip exactly. Chain contiguous: …fractionsof→**percentages**→fractions→squares; percentages2 off-chain via `requires:"mastery:percentages"`; `fractions.unlockedBy` re-pointed fractionsof→percentages. Catalogue 677→775 (Beat/Spark generated). masterSecs 9 (Tier 3) accepted. No regressions.

### T8 — Fractions of → APPROVED
Independently verified (not from log): node -c OK; no new DOM ids; no TODO/stub in diff. Node harness on the real modes.js — `fractionsof` P1: 21 fixed items, stable unique prompt-set across rounds, fraction set is exactly {1/2,1/3,1/4,1/5}, every answer = base×num/den exactly, whole, non-negative, numpad-round-trips, max length 2. `fractionsof2` P2: 21 fixed, stable, fraction set exactly {2/3,3/4,3/5,5/8}, all answers correct/whole/safe. Chain contiguous: …placevalue→**fractionsof**→fractions→squares; fractionsof2 off-chain via `requires:"mastery:fractionsof"`; `fractions.unlockedBy` correctly re-pointed placevalue→fractionsof. Catalogue 579→677 (Beat/Spark generated). masterSecs 9 (Tier 3, multi-step) accepted. Text-form "a/b of N" prompts (renders everywhere) accepted. No regressions.

### T7 — Place value ×/÷ → APPROVED
First educational topic of the chain. Independently verified (not from log): node -c OK; no new DOM ids; no TODO/stub in diff. Node logic harness loading the real modes.js — `placevalue` P1: 21 fixed items, stable prompt-set across rounds, every answer recomputed from prompt is correct, whole, non-negative, round-trips on numpad, max answer length 4. `placevalue2` P2: 21 fixed items, stable, every decimal answer correct within 1e-9 AND `parseFloat(String(a))===a` (literal-stored, no float drift), answers <1 present. Chain contiguous: halves→times→doubles→addsub→bonds→**placevalue**→fractions→squares; pv2 off-chain via `requires:"mastery:placevalue"`; `fractions.unlockedBy` correctly re-linked bonds→placevalue. Catalogue 481→579 (Beat/Spark per question generated). masterSecs 5 for both parts accepted (same operation class). No regressions.

### T29 — Scroll indicator → APPROVED
.picker wrapped in .picker-wrap; edge-fade ::before/::after + bobbing ▾ cue toggled by updateScrollCues() (scroll geometry), wired to render + passive scroll + resize. pointer-events:none; hidden when it fits; reduced-motion opt-out. JS ok, ids ok, no stubs.

### T28 — Remove start blurb → APPROVED
.hint block + .hint/.hint kbd CSS removed; no <kbd> refs left; clean small diff; JS ok.

### T11 — Entry / tap-to-begin screen → APPROVED
#entry shown on load (in the screens map; show("entry")). "Play in fullscreen" +
quieter "Play" both call enter(): guarded audioUnlock() + applySoundPref() +
optional fsEnter() + applyRoute() (reveals menu, honours deep-link AFTER the
gesture). Sound toggle persists halves.sound + syncs label. Graceful single-"Play"
where fullscreen unsupported. T18 button refactored onto shared fs helpers. JS
clean, ids ok, no stubs (the audio hooks are intentional guarded forward-compat).

### T12 — Speed-achievement skip exploit → APPROVED
Speed bracket test is now `mistakes === 0 && avg < lv.avg` (desc → "clean round").
Node-verified: skip-spam (21 skips, avg 0.3) earns 0 brackets; 1 skip earns 0;
clean avg 1.0 earns all four incl Lightning; clean avg 2.0 earns Quick only. No
other collectible touched.

### T19 — Juicy unlock celebration → APPROVED
Canvas confetti engine (fx.js): single full-screen overlay (pointer-events:none,
z-index 59), FX.init wired at startup, toastBurst→FX.celebrate(rarity,colors).
Node-verified: rarity counts 30→130, allowed() clamps to CAP, gravity/aging in
stepParticle, **global cap holds at 250 under burst-spam**, and the **RAF idles**
(after ~100 frames: running:false, live:0, no pending raf — no constant loop/leak).
Shockwave ring + vignette glow + epic/legendary flair (edge confetti + 2nd pop);
prefers-reduced-motion opt-out. JS clean, ids ok, no stubs.

### T18 — Fullscreen toggle → APPROVED
Feature-detected (requestFullscreen + webkit/moz/ms); hides the button where
unsupported (iOS Safari) — no error. enter/exit wrapped in try/catch with promise
.catch; fullscreenchange (all vendor events) syncs the label; click is the user
gesture. linkrow wraps/centres so it fits 360px. JS clean, ids ok, no stubs.

### T15 — Best Times heat-map + tap-to-retry → APPROVED
renderSummary now renders three distinct states: played (rank-coloured left accent
+ bg tint + coloured rank label), not-played (dashed/muted, still tappable), locked
(dimmed, 🔒 + requirement, NO data-mode → not startable). Tap handler matches only
`.sum-row[data-mode]`, guards isUnlocked, then selectMode+start(); start() also
guards. 44px tap targets, 360px-safe, routing intact. JS clean, ids ok, no stubs.

### T14 — Remove Hall of Fame + Clear-all → APPROVED
All 7 elements (nameEntry/nameInput/missNote/hof/hofList/hofMeta/sumClear) removed
from HTML + JS + CSS; renderHOF/commitName/pendingEntry deleted (no dead code);
id cross-check clean. Best Times still works: finish() unconditionally saves the
round to the per-mode top-10 board, so new bests/ranks/picker update — just no
name prompt. No stubs, no regressions.

### T10 — Celebratory particles → APPROVED (after 1 fix)
The undeclared-`pal` ReferenceError in `showTopicToast` is fixed (now
`C.paletteFor("epic")`; epic palette resolves). fx.js is pure/capped/leak-free,
particles are pointer-events:none (non-blocking), "+1" flourish + reduced-motion
opt-out present. JS clean, ids ok, no stubs. Item AND topic/Part-2 unlocks now
both burst without error.

### T5b — Convert all generated modes to fixed → APPROVED
Re-verified on main: zero gen modes remain; genRound/randInt/addSubP1·P2/bond
generators + the `if(m.gen) return` guard all removed (the `bondP1Item/P2Item`
left are fixed-set mappers, not generators). addsub/addsub2/bonds/bonds2 each = a
fixed 21-item shuffled set with 21 Beat + 21 Spark. Number-bonds curation hits the
checklist (round/near-round/awkward/quarters/small-large for P1; to-1000 + exact
decimal-bonds-to-1 for P2). All answers numeric, ≥0, ≤5 digits, exact. Doc’s
stale "Generated modes" wording fixed. addsub work intact. Complete.

### T6 — Number bonds → WIRING APPROVED (generator superseded → T5b)
Verified the wiring on main: `bonds` at importance slot #5 (`unlockedBy:addsub`),
`bonds2` mastery-gated side branch (`requires:mastery:bonds`), fractions re-linked
to bonds, main chain contiguous, masterSecs 3.5 (tier 1 recall) + group Number.
JS clean. The questions were built with generators, which the fixed-set design
change supersedes — folded into the broadened **T5b**.

### T5 — Add / Subtract → APPROVED
Independently verified on main (6000-sample stress test):
- P1 (addsub, gen): two-digit ±, result 1..100, both operands ≥10, integer & ≥0.
  P2 (addsub2, gen): 3-digit ± 2-digit, answers 9..1095 (≤4 digits, numpad-safe).
  Round size 20; all prompts well-formed; "−" is display-only (answers numeric).
- Generated-mode guard correct: `if(m.gen) return` in collectibles → addsub/
  addsub2 carry ONLY Init/Flawless/Speed/Mastery (0 stray Beat/Spark). Catalogue
  299.
- Chain re-linked at the right importance slot (#4): doubles→addsub→fractions;
  addsub2 is a mastery-gated side branch (requires mastery:addsub, off-chain).
  Main chain contiguous. masterSecs 5 (tier 2), group Number. No stubs; ids ok.

### T4 — Per-topic completion + milestones → APPROVED (Phase 1 complete)
Verified independently on `main`:
- `node -c` clean; ids present; no stubs.
- Topic milestones added: `topics:unlock3/8/16`, `topics:one100`, `topics:all100`.
  They carry a `need` field and are correctly **excluded from the main `evaluate`
  pass** and handled by a new `evaluateTopics(counts, has)` run in `finish()`
  **after** the round's items are saved — so a topic taken to 100% this round
  counts immediately (verified the threshold table in Node: unlock-3, one-100,
  all-100, owned-skip, total>0 guard on all100).
- `isModeComplete` requires the full per-mode set → 100% genuinely demands the
  hard items. Inventory now shows a per-topic completion overview.
- Non-blocking nit (do NOT fix now): `topics:one100` lacks a `total>0` guard, but
  `complete ≤ total` and `total ≥ 5` always, so it's unreachable in practice.

### T3 — Mode-picker redesign → APPROVED
Verified independently on `main`:
- `node -c` clean; ids present; no stale `.mode-tab/.modes/.lk` refs.
- Scrollable grouped picker (`.picker`, 42vh scroll, max-width 360). `MODE_GROUPS`
  exported (`Core, Number, Fractions & %, Measures, Reasoning`); confirmed **every
  mode's group is in the list — 5/5 render, none orphaned** (the main risk).
  Empty groups skipped.
- Rows show name, subline (rank·score / "No best yet" / unlock requirement),
  `have/total` progress, and a state glyph (▶ / 🔒 / ✓). Locked rows are not
  selectable (click guard). 100% (`done`) only when have===total of the full
  per-mode set (halves 59 incl. all Beat/Spark + Lightning + Mastery) → matches
  "100% = mastery". `renderTabs()` re-runs on nav-back and init, so routing works.
- No TODO/placeholder/stub; no regressions. Complete work.
- Non-blocking nit (future cleanup, do NOT fix now): `renderBest`'s locked branch
  is now effectively unreachable since `mode` is always unlocked; harmless.

### T2 — Mastery achievement + Part-2 gate → APPROVED
Verified independently on `main`:
- `node -c` clean; all `$("id")` present. Catalogue grew exactly +5 (275→280),
  one `mastery:<id>` (epic, cat "Mastery") per mode; "Mastery" added to CATS.
- Mastery boundary cases all pass: 0 skips & total ≤ masterSecs×Q → earned
  (incl. exactly at threshold); just over → not; any skip → not. `masterSecs`
  set on all 5 modes exactly per the tier table (halves/doubles 4, times/
  squares/fractions 3.5).
- `isUnlocked` now honours `requires:"mastery:<id>"` AND `unlockedBy` AND the
  own-`init` migration override — simulated the Part-2 gate (locked until
  mastery owned; open after; open if already played). No Part-2 modes added
  prematurely (correct — those are T5+).
- Topic-unlock toast fires via a clean before/after `wasUnlocked` snapshot, for
  both chain unlocks and Part-2 mastery unlocks; no spurious/duplicate fires.
- No TODO/placeholder/stub introduced; no regressions. Complete work.

### T1 — Topic-chain unlock → APPROVED
Verified independently on `main` after merge:
- `node -c` clean (modes/main/collectibles); all `$("id")` present in index.html.
- Importance order correct: halves → times → doubles → fractions → squares; every
  `unlockedBy` = the previous topic. Fresh profile → only Halves; `isUnlocked`
  honours the migration clause (own `init:` keeps a played topic open).
- Locked topics can't start (`start()` guard), Start is disabled, and the lock
  requirement shows on the best-line. Richer picker correctly deferred to T3 (not
  stubbed). No regressions to routing/inventory/collectibles/build-info.
Good, complete work. One forward-looking note (not blocking): when T5+ splice new
topics into the chain, re-link `unlockedBy` so the order stays contiguous, and
re-run the chain structural test.
