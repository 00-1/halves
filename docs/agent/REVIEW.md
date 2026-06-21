# Review (Babysitter-owned) — Builder reads, does not edit

**Current verdict:** `APPROVED — T81` (event presentation — emblem art · music · home banner) ·
live build **`4990953`**. **🎉 Completes the Phase 6.5 Events block (T78→T81).** New standalone
`eventart.js` (`window.EventArt`): a seeded **heraldic-crest emblem** generator — its own visual
language (anti-dilution, not a reskin), static draw. `sound.js` adds a dedicated calm event
theme **"Festival Day" (EVENT_STYLE 17, 92 BPM)**, routed in during the gauntlet (`eventCtx ?
"event"`). `main.js` `renderEventBanner()` puts a **prominent banner on the home screen (`#start`,
above the picker)** with the emblem art, name/blurb, a **Play CTA that routes into the live
event**, and a **live countdown to 00:00 UTC** (ticks only while home is visible; re-renders on
rollover; owned-today reads "reward earned"). The **T80 tint fixup** is done properly: new
`--amber-weak: rgba(245,181,68,.12)` token replaces the invalid `var(--amber)1f`. Verified
**independently**: EventArt is **14/14 unique (100% pairwise distinct)**, deterministic, valid
hex, static (no RAF/timers); event theme **92 BPM ≤95 + density 0.30 ≤0.4** (calm/volume hold,
max BPM across all styles still 95); the banner is gated to live inside `#start` before the picker
(home-screen prominence locked in), countdown targets `(epochDaysUTC+1)*DAY_MS`, CTA → `startEvent`;
old invalid CSS **gone**; no Arena event-gate UI. `node -c` clean; **full 20-gate suite green**
(`events.test.js` now 77, `sound.test.js` extended). T81 → DONE.

**Previously approved (done):** `T80` (best-attempt board: event entries + live-window lockout) ·
live build **`135b9a6`**. Events now appear on the Best Times board: a new **event best-attempt
store keyed by EVENT id** (`halves.eventBest`, same `rank` order as topic boards) so the best
**persists across the 14-day recurrence**; `finishEvent` records it. A "Daily Events" section
renders **today's** event **LIVE + routable** (`data-event`, amber, shows its best) and the other
13 **LOCKED** (visible, "Live in N days", **no `data-event`** → not routable). `isRetryable(id) =
Events.isLive(id)`; the `sumList` tap routes only live `data-event` rows into `startEvent`. Good
defensive fix: `start()`/`startPractice()` now clear `eventCtx` so an abandoned event can't
misroute a later `finish()`. `EventPlay` gains `isRetryable` + `bestOf`. Verified
**independently**: full **20-gate suite green** (`events.test.js` now 62), incl. a DOM drive that
proves lockout/routing AND **best-persistence across a simulated 14-day recurrence** (prior best
survives the gap, routable again, beating it updates the stored best, reward stays owned). `node
-c` clean; migration-safe (new key, additive). **Non-blocking nit (tracked → fixed in T81):** the
live row's inline `background:var(--amber)1f` is invalid (resolves to `#F5B544 1f`, dropped), so
the subtle amber tint silently doesn't apply — purely cosmetic (the row is still marked by its
amber rankdot + "Live today"); added as a **required carry-over fixup in T81's DoD**. T80 → DONE.

**Previously approved (done):** `T79` (Event play mode — cross-topic gauntlet) · live build
**`67f9fe2`**. `events.js` gains a pure, dependency-injected **`buildGauntlet(eventId, modes)`** —
a **deterministic** per-event set (seed = `hashStr(id) ^ artSeed`): each topic's fixed pool is
**canonicalised to a TOTAL order** (numeric collator + raw-string tie-break) so `build()`'s
per-round shuffle can't leak, then a seeded pick takes `n`, then a seeded interleave. `main.js`
adds `startEvent()` (live-only, tags each question with its source `_mode`, reuses the round
engine) and `finishEvent()` (branched in `finish()`): grants `event:<id>` **only while still
live at finish** and **once** (idempotent), pays **no Gold**, and `correct()` **suppresses Gold +
topic Beat/Spark** during events (no item leakage). A "Live today" play strip on the Events tab
is the entry; `window.EventPlay` exposed for T80/T81. Verified **independently** across all 14:
**byte-stable** across calls *and* a fresh module boot; set length = Σ min(n,pool); **14/14
distinct**; **zero** NaN/negative/non-number answers — the 29 non-integers are legit decimals
(bonds-to-1, decimal place value, fractions-as-decimal, odd halving), each **native to its
topic's `build()`** so numpad-safe by construction. The hint/eyebrow use the per-question
`_mode` (`qm = it._mode || mode`), so cross-topic events show the **right** method. `node -c`
clean; **full 20-gate suite green** (`events.test.js` now 45 checks, incl. a DOM end-to-end:
reward-on-complete, idempotent replay, off-day cannot start). T79 → DONE.

**Previously approved (done):** `T78` (Events foundation) · live build **`fe004d7`**. New
standalone `events.js` (`window.Events`): a **pure, offline, deterministic UTC-daily scheduler**
— `indexFor(now)=((floor(now/86.4e6) % 14)+14)%14`, `today/isLive/daysUntilLive`, clock
**injected** (no `Date.now` baked in, no network/storage/timers). A **14-event roster** with
real, distinct, evocative copy (no answer leaks), each carrying a themed **cross-topic
`questionMix`** (T79 reads it) + reward + art/music seeds. `collectibles.js` adds an **"Events"
category** registering one `event:<id>` reward per event as a **real collection member** (guarded
on `window.Events`); `evaluate()` skips the Events cat (granted by completing the live event in
T79). `main.js` adds the **"Events" inventory tab** (ordered by the roster); Awards excludes
Loot + Events. Verified **independently**: all 14 `questionMix` topics are valid mode ids;
each reward carries a real hero **`boost:{hero,stat,amount}`** (e.g. Solstice Keystone →
roon/power/8) so they feed Arena power; the **UTC boundary flips exactly at 00:00 UTC**
(23:59:59Z vs 00:00:01Z), holds across the day, and **recurs every 14 days**; `indexFor` stays
0..13 incl. negative epochs; **no `=`/answer leaks** in names/blurbs; catalogue 804→818 (+14).
**Arena re-proved on the grown pool** — `arena.test.js` now loads `events.js`, and still proves
tiers 1–5 winnable at 0 items, no tier behind its own loot across all 120, and the final-tier
near-full flip. `node -c` clean; **full 20-gate suite green** (new `events.test.js`, 28 checks).
Migration-safe (additive, guarded). T78 → DONE.

**Previously approved (done):** `T56` (pixel-art app mark + topic glyphs + favicon) · live
build **`a700348`**. New standalone `glyphs.js` (`window.Glyphs`) — a pure, deterministic
5×7 (+3×4) pixel bitmap font covering exactly the symbols the glyphs use (`0-9 x a b n k`,
`× ÷ + − ± / %`, stacked fractions `½ ¾`, superscript `²`); ink codes 0/1/2 (empty/body/accent),
static draw (no RAF). Driven by structured `glyphTokens` added to all 15 modes (the old
`glyph` HTML kept as a fallback). `paintGlyph()` wires it into the start mark, entry brand,
guide/practice titles and the topic toast; `installFavicon()` mints a runtime favicon +
apple-touch-icon + theme-color from the same renderer (data-URL, try/catch-guarded). Verified
**independently**: built all 15 grids — **pairwise distinct**, **zero missing chars**, **every
glyph carries the amber accent**; each `glyphTokens` mirrors the original operator (incl. the
place-value pair, both `×÷` differing only by which symbol is accented — the DoD's "÷×"
shorthand). amber/text inks on `--bg` keep the existing AA. `node -c` clean (glyphs/modes/main);
the **full 19-gate suite is green** (new `glyphs.test.js`, 27 checks, wired into CI); no
regressions. T56 → DONE.

**Previously approved (done):** `T55` (Collector ladder → 10,000) · live build **`d35b2aa`**.
The 3-tier list became a **12-tier ramp** (25, 75, 150, 300, 500, 750, 1000, 1500, 2500,
5000, 7500, 10000). Existing ids `collector:25/75/150` preserved with their rarities
(migration-safe); the 150 tier renamed `Completionist`→`Magpie` (display only). New 300+ tiers
additive + legendary, varied British names (Antiquarian/Archivist/Loremaster/Vaultkeeper/
Reliquarian/Hoard-Lord/Treasure Dragon/Grand Conservator/Keeper of the Myriad), comma-formatted
descs ("Collect 2,500 items."). `evaluateCollector` unchanged. Verified **independently** (not
the Builder's test): recomputed the granted set at 0/24/25/150/1045/3000/10000/250000 →
0/0/1/3/7/9/12/12, **exactly tiers ≤ count**, never re-awards owned, all icons auto-generate
(0 errors). Gates green: new `collector.test.js` (20) wired into the workflow, `hero-icons`
catalogue 795→804 with **item icons byte-identical** (baseline 0 changed), `icon-variation`
(5), `inventory` (24, no 360px overflow). `node -c` clean. T55 → DONE.

**Previously approved (done):** `T73` (AI-smell left-borders → coloured square) · build
`0f7796f` — removed `border-left-color` accents from `.hd-boost` + `.map-row` (zero
`border-left` rules remain), replaced with a sharp 10×10 `.row-sq`; hero-detail (13) +
wayfinding (13) green.

**Previously approved (done):** `T74` (topic unlock requires genuine engagement) · build
`e7905c0` — skipping every question no longer grants `init`/unlocks; gate `answered ≥
ceil(total/2)` (`INIT_ANSWER_FRAC = 0.5`, tunable); all-skipped stays LOCKED, migration-safe,
Practice unaffected; `init-gate.test.js` (11) + full 17-gate suite green.

**Previously approved (done):** `T54` (version check + Update button) · build `8af41a5` —
`build.json` poll + dismissible Update bar, user-tap reload only, offline/local no-op; 9 checks.
Plus two **off-script** owner-prompted changes reviewed & blessed: `6c84af8` results "Modes"→
"Back" (text-only); `8af41a5` rank rewards `rankIndex===i`→`>=i` (genuine fix — backfills lower
ranks, un-skips darkwizard/archmage hero unlocks; verified additive + migration-safe + no
Arena-calib impact); and `74ac75e` dropped results "Play again" (clean, no dangling refs).

**Previously approved (done):** `T53` (procedural region scenery) · build `a6e6583` —
standalone `scenery.js`, 10 themed backdrops behind the tier card; the `rgba(8,10,14,0.64)`
scrim keeps text AA over the brightest scene cell (`--text` 13.3:1, `--muted` 5.83:1); 7 checks.

**(Note re off-script work:** prompting the Builder directly bypasses this review queue; the
four direct changes so far were all sound + gate-green, recorded as T75/T76/T77 DONE in
BACKLOG. Flagging only so the ledger stays accurate.)

**Previously approved (done):** `T52` (procedural enemy sprites) · build `f3cc9ae` — standalone
`monsters.js`, high variation (≥90% distinct), region/type-themed, bosses bigger+crowned;
9 checks.

**Previously approved (done):** `T68` (Arena wayfinding) · build `6efff87` — region header
(region N/10 · tier P/12) + pips, "⚔ Boss next" + facing-boss banners, a toggleable journey
map (10 regions: conquered/here/locked + boss landmarks), and a region-clear moment naming
the next region. All from the Enemies region API; `wayfinding.test.js` (13) green. (Minor
non-blocking: locked map rows `opacity:.7` dims `--muted` slightly under AA — owner may bump
to `.85`.)

**Earlier approvals — all DONE on `main` (build SHA · summary):**
- `T66` · `2eb669a` — Arena → 120 tiers (10 regions × 12); every buff-gating invariant
  re-proved at 120 (no tier behind own loot, tier 120 ⇔ near-full, one boost flips); 29 checks.
- `T67` · `d7eb533` — hero detail view: full owned boost list untruncated + "X/Y collected"
  (real per-hero total); 13 checks.
- `T71` — calmer music (all styles ≤95 BPM, busy ones softened) + 15 distinct per-topic
  styles + a dedicated "Hero's Arena" theme; 20 sound checks.
- `T69` — audio volume raised (master 0.30, music 0.09), no clipping (worst-case ~0.19); 11 checks.
- `T65` — Arena scrolls to top after a fight (in `finishBattle` only); 26 arena checks.
- `T70` — hint clarity pass (twentieths → scale-to-hundredths; vague phrasings made concrete).
- `T64` — mid-round toasts capped (2) + queued + band height-bounded; 7 checks.
- `T63` — tap-to-reveal hint surfaced in normal rounds (clock/scoring untouched); 14 checks.
- `T62` — methodical place-value-aware hint audit across all 15 topics (every hint read); 13 checks.
- `T57` — scrubbed the school/town/county names (repo-wide grep zero); doc-only.
- `T50` — procedural icons on the 4 menu buttons + Arena hero portraits; 16 checks.

**Next-task order:** **`T55` → `T56` → Events block `T78`→`T79`→`T80`→`T81`**, then content
extension (`T58` playbook → Wave-2 batches `T59`/`T60`/`T61`), then **`T72`** (Play Store
readiness). *(Events brought forward by the owner 2026-06-21 — slotted after the two small
polish tasks, ahead of the content wave; reorderable on owner's word.)*
**Events block (T78→T81) COMPLETE.** **Do `T82` next** — visual-direction **deep research**
(Phase 6.7, **doc only**): learn FROM brickmap's performant visual character (no voxels),
Android-primary; weigh rendering-stack options against our 3 crown jewels (a11y / no-build /
Node-verification); **build ON our existing generative art**; end with a ranked recommendation +
a reversible first-spike. Then the **tech-tree** block (Phase 6.8): **`T83`** (promote the guide
to a Play/Practice-peer button) → **`T84`** (data-driven, icon-node, 360px-safe tech-tree view +
selected-node panel; renders from live `unlockedBy`/`requires`/`isUnlocked`/`have-total`, never a
parallel edge list; swappable `nodeIcon()` for later T82 art). Then content extension
`T58`→`T59`/`T60`/`T61`, then **`T72`** (Play Store). Specs in BACKLOG; this line is authoritative.

**Batching — LOCKED (owner delegated the call).** The 8 Wave-2 topics ship in **3 thematic
batches**: **T59** Rounding + Larger ×/÷ · **T60** Money/Time/Metric (measures) · **T61**
Ratio/Mean/Sequences (reasoning). Rationale (reconsidered): the *measures* group is
strongly coherent (shared coin/clock/ruler art + name theme), A and C are clean splits of
the rest, and the batch order doubles as a sensible unlock-chain / difficulty progression
(core number → measures → reasoning). Each batch is one reviewable unit that re-proves the
Arena buff-gating once on the grown pool. Not per-topic (too much overhead) nor one mega
task (unreviewable).

**Final state:** 15 educational topics (Part-1/Part-2, fixed curated sets, mastery
gates), procedural SFX + chiptune, 12 heroes, a 120-tier Arena with battle/loot
(beatable only at near-full collection), 50 procedural icon categories with
per-item variation, ~1045 collectibles with unique characterful names, Goblin Gold,
a forgiving day-counter, a per-question practice/review view, per-topic guides, and
two CI gates (icon-variation + perf). Quality bar held throughout: every task
independently re-verified; the last 16 approved first-pass.

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

### T45 — Performance / CPU / memory audit → APPROVED — 🎉 BACKLOG COMPLETE
Final task. Honest, thorough audit: 4 long-lived resources proven already bounded, 1 real leak found and fixed. Verified (Node): node -c main.js OK; no stub; **main.js diff is exactly the 3-line `show()` guard** (`if(name !== "game" && raf){ cancelAnimationFrame(raf); raf = 0; }`) — no scope creep. **`node test/perf.test.js` → ALL 8 PASS**: fx RAF idle before/at/after a burst (80 frames → liveCount 0); **0 listeners added** over 4× full nav cycles + 18 tab switches (35→35); Loot lazy-render renders-then-releases; game-clock RAF present in-game then **cancelled on leave (1→0)**. The fix is correct (game loop re-arms via `start()`→`loop()`; only non-game navigation cancels) — normal rounds unaffected. fx + music scheduler idle (scheduler stops on mute/hidden, voices capped at MAX_STEPS_PER_TICK=4, oscillators start/stop paired); localStorage bounded (fixed key set, overwrite not append). **Both Node gates (icon-variation + perf) wired into the Pages workflow.** Catalogue 1045. No regressions.

### T30 — Deep content review → APPROVED
Written review + 2 justified fixes. Verified (Node): node -c (modes/guides) OK; no stub. **Squares trimmed to 17** (16²–19² removed — beyond GL recall band; 2²–15² + 20²/25²/30² kept) → within the 11+ difficulty cap. **Decimal glyph normalised to "."**: **0 "·" remain** in any guide text or `explain()` output (all topics scanned). No duplicate prompts; all answers exact/numpad-safe; explain() non-empty + correct for all 316 questions; catalogue 1053→**1045** (−8 = squares Beat/Spark for 16²–19²); names still globally unique; icon test green. **Completeness gaps flagged (not built, per scope):** rounding, ratio/proportion, mean, money/change, time durations, metric conversion, sequences, larger ×/÷ — the natural Wave-2 block for the owner to decide on. Difficulty otherwise within band (upper-but-legit kept: placevalue2 6÷1000, fractions 1/16). No regressions.

### T13 — Question-set audit pass → APPROVED
Conservative, well-judged content pass. Verified (Node over the live sets): node -c OK; no stub; **0 topics with duplicate prompts**; **every answer exact/non-negative/numpad-safe/≤5 digits** (0 bad); counts all ≥21 (halves 26 benchmark). The 3 targeted changes confirmed: fractions +9/20/11/20/17/20 (0.45/0.55/0.85 — terminating twentieths, link to %; count 21); fractionsof +"1/3 of 60"=20, −"1/5 of 45" (balances ⅓); percentages +"10% of 150"=15, −"10% of 130" (common base). Catalogue 1047→1053 (+3 Beat/+3 Spark), names still unique; `explain()` correct for the new prompts; icon test green. Builder correctly left the already-strong sets unchanged. No regressions.

### T32 — Per-question Practice / Review view → APPROVED — Phase 4 complete
New `#practice` screen + `explain()` + `halves.qbest` store. Verified (Node + DOM shim): node -c OK; no stub. **`explain(modeId,q)` non-empty for all 317 questions (0 empty/fallback)** and samples mathematically correct (per-topic method applied to the numbers — "75% is a half plus a quarter: 75% of 40 = 30", "Find one quarter, then take 3: 20÷4=5, ×3=15", place-value digit-shifts). **`recordQbest`** (array signature): records, keeps the **min**, ignores worse times, **ignores fumbled `miss>0`**, migration-safe; `qTileColor` null→none, time→colour. **Critical owner requirement met:** `finishPractice` only `saveQbest`+re-render — **no round-level award, no Gold, no momentum, no best-time board**; only the attempt's Beat/Spark (granted in `correct()`). Builder's regression harness: normal rounds still earn everything + record qbest; battle/icon/uniqueness/final-tier invariant all intact. **Non-blocking nit (→T30):** guides use "·" decimals, explain()/prompts use "." — normalise. No regressions.

### T27 — Per-topic "how to beat it" guides → APPROVED
New `guides.js` (`window.Guides`), guideModal added, "?" control on every picker row (incl. locked = preview). Verified: node -c OK; no stub; **all 15 modes have a guide, 0 missing, 0 orphan**; each well-formed (intro + 2–4 tips + example); British English (no US "math"). **Babysitter maths audit (every guide, line-by-line): ALL correct** — e.g. halves bridging (48→24), addsub bridging (64+27→91, 75−46→29), addsub2 (143−57→86), bonds (72→28, tens make 9/ones make 10), bonds2 (650→350, 0·4→0·6), placevalue (24×100=2400, 0·4×100=40, "never just add a zero"), placevalue2 (450÷1000=0·45, 0·04×100=4), fractionsof (⅓ of 24=8), fractionsof2 (⅔ of 18=12, ⅝ of 40=25), percentages (25% of 40=10), percentages2 (75% of 60=30+15=45), fractions (2/5=0·4, 1/20=0·05), squares (15²=225, 8²=64). Pedagogy well-pitched for Year 5/6. DOM harness: "?" opens the modal for unlocked + locked topics, all 15 render. No regressions. Unblocks T32.

### T31 — Daily-practice momentum counter → APPROVED
The forgiving up/down day counter (owner's redesign). Verified via `window.Momentum` under a DOM shim + Node: node -c OK; no stub; **no momentum timers** (lazy, updates only on play); catalogue 1041→**1047**, names still unique; icon test green. **Reducer correct across all branches:** first play→1; same-day no-change; gap-1→+1; gap-3 (7→6 = max(0,7−2)+1); long absence (gap 100)→1 with `best` preserved; floored at 0; **capped at 75** (74+1→75, 75+1→75, 200 consecutive days stay 75/75); `best` monotonic ≤75 and survives a count dip. 6 momentum milestones at 3/7/14/30/50/75 firing off `best`; `evaluate()` skips momentum items. Label "Momentum", MAX 75. No regressions.

### T26 — Currency (Goblin Gold) → APPROVED — Phase 3 COMPLETE
Goblin Gold (earn/display/persist, no spend). Verified via `window.Gold` under a DOM shim + Node: node -c OK; no stub; **no spend code** (only the "NO spending" comment); catalogue 1030→**1041**, names still globally unique; icon-variation CI test still green. **`fmtGold` correct across the whole ladder** (0/999/1.00K/12.3K/1.23M/1.00B/1.00T/1.00Qa/1.00Qi/1.00Sx…1.00Dc and beyond) and **NaN/Infinity/negative all → 0** (never NaN/∞). label="Goblin Gold". Earn `questionGold(target,dt,combo,mult)`: **faster→more (5 vs 3), higher combo→more (7.5), higher mult→more (15)**, all >0; `goldMult` grows with collection; round/tier bonuses; **skips earn nothing** (builder's DOM harness: clean round earns & persists `halves.gold`>0; all-skipped round earns 0). 11 wealth-milestone `gold:` collectibles; `evaluateGold` fires at 1000 (not 999); `evaluate()` skips gold items. No regressions.

### T25 — Balance + milestone wiring → APPROVED
5 new Milestone collectibles (`meta:tier10/25/50` Climber/Breaker/Crusher, `meta:tier100` Realm Champion, `meta:allheroes` Legendary Roster) + `evaluateMeta(heroesUnlocked, total, has)`; balance unchanged (already proven in T24/T43). Verified (Node): node -c OK; no stub; catalogue 1025→**1030**, all 1030 names still globally unique; icon-variation test still green. **All 5 milestones registered.** `evaluateMeta` fires `meta:tier10` on the `tier:10` marker (not on `tier:9`), `meta:tier100` on `tier:100`, and `meta:allheroes` at **12/12 and not 11/12**. `evaluate(ctx, has)` **never returns a meta item** (meta-path only — granted in finish()/finishBattle() via `grantMeta`). Invariants intact: tier 100 unbeatable with 0 items, tier 1 winnable by starter, def monotonic (0 dips). No regressions.

### T36 — Pixel icons: ~50 categories + per-item variation → APPROVED
Full icon-engine rewrite per DESIGN-icons.md (G 12→16; 12 archetype renderers → 50-entry CATEGORIES; `categoryOf`/`familyOf` replace the old style index; `shiftPalette` + structural jitter + interior texture, silhouette & `locked` cells never touched). Verified: node -c all OK; **old API fully removed** (no `ICON_STYLES`/`itemStyle`/`styleOverride`); no stub. **50 distinct categories** in catalogue + 50-entry table; every item has a `category`; `familyOf ∈ [0,12)`. **`test/icon-variation.test.js` PASSES all 5** (ran it: cross-category role ≥0.18 [closest staff/wand 0.237]; within-category combined ≥0.22 [worst key 0.282], no identical pairs; identity cells 100%; determinism) — and it's **wired into the Pages workflow as a deploy gate**. `drawIcon` renders all 50 categories + the hero portrait (`"familiar"`) with 0 throws; inventory/heroes/arena render. **Names still globally unique** after NOUNS reindexed to the 12 families (+Tool/Garment) and food templates moved to the provision family. Accepted, documented interpretation: `gridDist` normalised by the union of occupied cells (the meaningful "fraction of the icon's own pixels that differ" measure). No regressions.

### T24 — Arena mode (`#/arena`) → APPROVED — KEYSTONE (metagame now playable)
The Arena: `BATTLE_MODE` (mixed questions from unlocked topics), `renderArena`/`startBattle`/`finishBattle`, `finish()` battle-branch (guarded by `battleCtx` — normal drills unaffected). Verified: node -c (main/enemies/collectibles/heroes) OK; no stub; 6 new arena DOM ids present, id cross-check clean; CSS balance ok. **Owner buff-gating requirement PROVEN on the exact live win path** (`computePerf`→`resolveBattle` on `loadCollected()`): computePerf maxes at 1.0 (no perf shortcut); **tier 100 NOT beatable with 0 items at max perf — nor at an impossible perf 1.5**; tier 50 not beatable with 0 items; champion (roon) beats tier 100 only at full-minus-final-loot, and **removing one champion boost flips it to a loss**; tier 1 winnable by base bram. Builder's async DOM battle-drive harness (16 checks) played real rounds via synthetic keydowns: render → hero-pick → Fight → Victory persists `tier:1`+loot (boosts hero); a perfect round vs The Void Sovereign with no collection → Defeated, no `tier:100`. Loss → no progress. No regressions to normal drills.

### T44 — Rename enemy tiers (regions + rank-titles + named bosses) → APPROVED
Display-only rename in enemies.js (`BANDS`/`RANK_TITLES`/`BOSSES` + `tierName` rule). Verified (Node, real enemies.js): node -c OK; no stub. **All 100 tier names match the FINAL approved set exactly** — non-boss tiers `"<Region> <Rank>"`, every 10th tier the named boss (Goblin King · The Highwayman · Old Mother Bramble · Gurgle, King of the Bog · The Frost Jarl · Bonecaller · Cindermaw · Voltan, Lord of Storms · the Elder Wyrm · The Void Sovereign). `regionLabel` now returns the new regions (Gallowmarch, Gloamwood, Drownholm, Cinderwaste…) → T42 inventory loot-regions update automatically. **Invariants intact:** 100 tiers, loot still 250, `def` monotonic (0 dips), boss hardest, tier 1 still winnable by base bram — battle logic untouched. No regressions.

### T42 — Inventory tabs + per-category bars + jump-to-top → APPROVED
`renderInventory` rewritten into a tabbed, lazy-rendered view. Verified: node -c (main/enemies/collectibles) OK; no TODO/stub; new ids `#invTabs`/`#invTop` present, main.js id cross-check clean (52, 0 missing); `.inv-tabs`/`.inv-tab`/`.jump-top` CSS present. enemies.js exports `tierRegion`(1→0,10→0,11→1,100→9 ✓) + `regionLabel`; loot groups into **exactly 10 regions** with correct labels and counts (10+10+15+20+20+30+30+35+40+40 = 250). Loot-region labels read via `Enemies.regionLabel` ⇒ T44-proof. Builder's DOM-shim harness (19 checks): 3 tabs (Topics default), **lazy-render** (Topics/Awards build no loot tiles; Loot tiles only on opening the Loot tab), a progress bar on every Awards category + every Loot region, jump-to-top hidden at top / shows >200px / returns to top, header count over whole catalogue, inv-cell tap-to-inspect intact. Back (T39) + names (T35) untouched; 360px-safe. No regressions.

### T43 — Trim tier loot to 250 → APPROVED
Batch formula `3+floor((n-1)/12)` (668) → `1+floor((n-1)/25)` (**250**); rarer-with-depth unchanged; defs recompute from the smaller set. Independently re-ran the full T23 invariant suite (Node, real modes/collectibles/heroes/enemies): node -c OK. **loot=250**, catalogue 775→**1025**, all 1025 item names **still globally unique**. Loot `test()===false` (drill-unearnable), T20-stamped, boosts **cover all 12 heroes**. **(a)** tiers 1–5 winnable by bram/0 items/perf .85; **(b)** no tier gated behind its own loot (0 fails); **def monotonic** (0 dips); **(c)** tier 100 NOT winnable with 0 items, winnable at full-minus-final-loot. Defs 11→392 (t99 291 < t100 392). main.js inventory totals adapt from `CATALOG.length`. No regressions.

### T35 — Diverse item names + inventory truncation fix → APPROVED
Applied the DESIGN-names.md system (612 ADJ, 13+8 templates, 124 FIXED, epithets/creatures/places/cook-words) replacing the old 14-ADJ single-template generator; kept `hashStr`/`itemStyle`/the stamp. Independently verified (Node, full 1443-item catalogue incl. T23 loot): node -c OK; old ADJ constant gone; no TODO/stub. **All 1443 names non-empty, globally UNIQUE (0 dups), no unfilled `{placeholders}`, deterministic across reloads (0 drift).** Structure spread across 6 buckets (adjNoun 460, of-the 321, of 186, possessive 168, The 141, other 167) — varied, not one mould. Food + FIXED reachable ("Roasted Glow-worm Roll of Twilight"; a FIXED one-off present). **Truncation fixed:** `.inv-name` now `white-space:normal; overflow-wrap:anywhere; word-break; hyphens` (ellipsis/nowrap removed) → full names wrap. **Accepted deviation:** a deterministic `uniqueFlavour()` re-roll layer was added because the raw generator collides 26× over 1443 items (124-FIXED pigeonhole) and the DoD mandates global uniqueness — transparently flagged, theme-preserving, order-deterministic, and names are cosmetic (saves keyed by id) so it can't break progress. No regressions.

### T41 — Rename heroes (display-only) → APPROVED
Owner-approved cast applied. Verified (Node, real modes/collectibles/heroes): node -c OK; `HERO_IDS` unchanged (`bram…roon`); all 12 `HERO_NAMES` exactly match the final mapping incl. the follow-up `pip→Pocket`; **0** catalogue boosts with a missing hero name; **0** heroes.js↔HERO_NAMES mismatches. Display-only — no logic touched. Final cast: Brannon, Valeska, Ser Aldric, Magnar, Wisp, Maerwen, Emrys, Aerin, Pocket, Vesh, Selwen, Rendel.

### T40 — Heroes cards: kill the AI-smell coloured left border → APPROVED
Visual-only. Verified: node -c main.js OK; CSS brace-balance OK; no TODO/stub; grep confirms **no `border-left` on `.hero-card`** (now uniform 1px) and the three `.hero-card.t-*{border-left-color}` rules deleted. Type now shown via `.hero-name .typedot` — a **9px square** (no border-radius, mirrors T37 `.rankdot`) coloured by the existing `t-brawn #d05a4a`/`t-arcane #8a5cf6`/`t-cunning #3fce8c` classes. main.js `heroCard` wraps the name `<span class="hn"><i class="typedot"></i>NAME</span>` on both locked + unlocked markup; `.hn` ellipsis stops a long name shoving the ★rating; item-chip pills untouched. Builder's DOM-shim harness (7 checks) confirms no border-left, exactly 12 type dots (incl. locked cards), all three type classes, rating shown. 360px-safe; no regressions. Completes the UI-polish block (T37–T40); metagame screens now read consistently.

### T39 — Always-visible Back (Inventory/Best Times/Heroes) → APPROVED
CSS-only, scoped to the three long-scroll screens. Verified diff: `#inventory`/`#summary`/`#heroes` drop `overflow-y:auto` (no longer scroll as a unit); `.invlist`/`.sumlist`/`.herolist` gain `flex:1 1 auto; min-height:0; overflow-y:auto` (sole scroll region); the existing bottom Back (`.res-actions`, flex:0) is pinned below the flex:1 list so it's always on-screen and reachable without scrolling; `#heroes` also gains `align-items:center` for consistency; `#results` untouched. node -c main.js OK (handlers unchanged, no new DOM); no stubs; builder's DOM-shim harness (12 checks) confirms each Back is outside the scroll list and still routes to the menu. 360px-safe (widths unchanged). Interpretation note: builder pinned the existing bottom Back rather than adding a top button — meets "reachable without scrolling"; owner may relocate to top if preferred.

### T38 — Start screen fits the viewport → APPROVED
CSS-only, start-scoped. Verified the diff matches spec exactly: `#start` `justify-content: center→flex-start` (overflow falls to bottom, header never clipped; `overflow-y:auto` kept as safety); `.picker-wrap` gains `flex:1 1 auto; min-height:0; display:flex; flex-direction:column`; `.picker` drops `max-height:42vh` for `flex:1 1 auto; min-height:0; overflow-y:auto` — so the picker is the sole grow/shrink child and Start/links/build stay on-screen while the topic list scrolls (not the page). Selectors are start-screen-only (no other screen uses `#start`/`.picker-wrap`/`.picker`). node -c main.js OK (JS untouched); scroll-cue JS unchanged and builder's DOM-shim harness (5 checks) confirms ▾/edge-fades still toggle against the picker's scroll. 360px-safe (widths unchanged). No regressions.

### T37 — Best-Times rank dot + Inventory topic progress bars → APPROVED
Visual-only; owner's two "show colour, not an AI-smell border" fixes. Verified: node -c main.js OK; no TODO/stub; no new DOM ids. **Best Times:** `.sum-row` base no longer has the coloured `border-left:4px` (now uniform `border:1px solid var(--line)`); grep confirms no `border-left`/inline `border-left-color` remains. Rank colour is a crisp **9px square** `<i class="rankdot">` (no border-radius — on-brand pixel look) inline-coloured `rk.color`; not-played = `.rankdot.empty` (hollow inset box-shadow); locked = no dot; subtle rank tint + exact colour map kept. **Inventory:** topic rows gain `.tp-bar`/`.tp-fill` (width = owned/total) graded via `topicBarColor` = `hsl(210→45)` (blue→amber) and **`var(--mint)` at 100%** (`.tp-row.done` mint border); fraction text retained. Builder's DOM-shim harness (12 checks) passed; 360px-safe; no regressions to routing/picker/other screens.

### T23 — Enemy tiers + battle logic + tier loot → APPROVED
New `enemies.js` (window.Enemies), loaded after heroes.js. Independently verified (Node, real modes/collectibles/heroes/enemies): node -c all OK; no TODO/stub; loot never earned via drills. **100 tiers**, def 11→551, **monotonic non-decreasing (0 dips)**. Battle invariants over the real data: **(b) no tier gated behind its own loot** — every tier's def beatable with the best advantage hero on drill-items + loot 1..n−1 at perfect perf (0 failures); **(a)** tiers 1–5 winnable by starter bram with 0 items at perf 0.85; **(c)** tier 100 **not** winnable by any hero with 0 items, **winnable** at full-minus-final-loot collection. **668 loot items** all `test()===false` (drill-unearnable), all T20-stamped (style∈[0,10), flavour, valid hero+stat boost) with boosts covering **all 12 heroes**; `registerItem` idempotent; "Loot" added to CATS. Catalogue 775→**1443**. `evaluate()` excludes loot (regression-checked). Pure logic, no DOM. (Arena UI + loot-granting = T24.)

### T34 — Place Value: bring decimals into Part 1 → APPROVED
Owner-raised content fix. Independently verified (Node): node -c (modes/collectibles/main) OK; no TODO/stub; clean rename to one `pvItem` builder, no dead `pvP1Item`/`pvP2Item` refs; catalogue unchanged (775); chain/masterSecs unchanged (bonds→placevalue→fractionsof→percentages; placevalue2 requires mastery:placevalue). **P1** = 21 fixed, stable; **7 decimal-operand prompts + 14 whole** (both ≥6), plus whole÷10/100 yielding decimal answers (0.6/0.7) — decimals now visible in the base topic; targets only 10/100; every answer correct (recompute=stored within 1e-9), literal/round-trips on numpad, non-negative. **P2** = 21 fixed, stable; targets only **100/1000 (no bare ×/÷10)**, answers <1 present (10 of them) incl. 3-dp (0.006); all correct/safe. Beat/Spark regenerated. No regressions.

### T33 — Music: cap tempo + stop fast bursts → APPROVED
Live hotfix for the owner's "music sometimes races / stressful". Independently verified (stub AudioContext + captured timer + controllable clock): node -c OK; no TODO/stub. **Tempo cap** — max bpm over all 13 styles = 115 (≤116); every style's `(60/bpm)/4` ≥ 0.13s; rescaled styles keep ascending order. **Anti-burst** — `musicTick` resyncs `mNext = now+0.02` when behind and caps `MAX_STEPS_PER_TICK=4`: after a simulated **5s clock jump** ONE tick scheduled just **1** voice (no flood); over 20 random multi-second jumps the **max voices in any single tick was 4** (cap holds); normal ticking still schedules a few; music loops/switches and mute stops/resumes. The fast-burst path is closed and even the fastest style is now calm.

### T22 — Heroes screen (`#/heroes`) → APPROVED
Independently verified: node -c (collectibles/main) OK; no TODO/stub; new ids present in index.html (`heroes`,`heroList`,`heroesBtn`,`heroesBack`) and main.js id cross-check clean (50, 0 missing); 13 heroes-screen CSS rules present. `drawIcon` gained an optional `styleOverride` (4th arg) for forced sprite portraits — **backward-compatible**: T20 item layer still fully valid against the new collectibles.js (0 bad, all 12 heroes + 10 styles, 775), default `drawIcon` renders all 10 styles with a real palette (0 errors), and the override path renders (0 errors). Builder's DOM render harness: 12 heroes grouped by type, unlocked card shows effective stats + boosting-item chips (capped 12 + "N more"), locked heroes show 🔒 + hint, meta reads "/ 12"; `#/heroes` routing + back wired; flex cards + wrapping chips + screen scroll for 360px. Heroes screen uses menu music via existing `show()`. No regressions.

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
