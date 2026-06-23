# GG1 — Definition-of-Done Inventory (faithful-port reference)

> **Purpose.** GG1's functionality is "done" and must be ported **faithfully** to brickmap
> (and is the parity target for the Capacitor experiment). This is the canonical map of *what
> "done" is* — the subsystems, the content, and the engine↔game boundary — so a port can
> reproduce behaviour without reverse-engineering 600 KB of source.
> **Source of truth = the code on `origin/main:gg1/dev/`.** This doc is the index + the
> extracted content data. **v1 (2026-06-23):** the **mode catalogue is fully captured from
> source**; the economy/arena/meta systems are **mapped with their roles + key files** and
> flagged where a depth pass is still needed.

## 0. The single most port-relevant fact
**GG1 ships ZERO binary assets.** Every icon, sprite, bitmap-font glyph, brand emblem, scenery
backdrop, sound effect, music bed, and FX particle is **generated procedurally in code** — the
"generative 16-bit pixel / dither, no image or audio files" ethos. For a brickmap port this is
decisive: there are **no PNGs/WAVs to migrate, only algorithms**, and GG1's aesthetic DNA
(generative pixel + dither) is *already* brickmap's wheelhouse. The port is a re-implementation
of generators, not an asset migration.

## 1. Architecture — content is already data + pure transforms
The drill content is cleanly separated and trivially portable:
```
mode = { id, name, tag, group, glyph, eyebrow, expr, masterSecs,
         unlockedBy | requires, build() }
build() = shuffle(<MODE>_SRC).map(<transform>)     // data array + pure fn → [{p, a}]
```
- `<MODE>_SRC` = the literal question data (the calibrated 11+ ranges live here).
- `<transform>` (`addSubItem`, `sdtItem`, …) = a **pure** function `datum → {p:promptString, a:numericAnswer}`.
- Answers are **exact numbers** (fractions kept terminating); the numpad matches the typed value.
- **Port path:** lift each `*_SRC` to JSON and re-implement the ~40 pure transforms in the engine
  language. No DOM, no state, no side-effects in any transform → mechanical, testable port.

## 2. Mode catalogue — 46 topics, 959 questions/round-pool (authoritative dump)
Groups (picker order): **Core · Number · Fractions & % · Measures · Geometry · Reasoning**.
`unlock` = `by:<id>` (finish that topic once) or `mastery:<id>` (finish `<id>` with no skips
under its time gate). `ms` = `masterSecs` (per-answer mastery target, sec). `n` = pool size.

| # | id | name | group | unlock | ms | n | examples |
|--|----|------|-------|--------|----|---|----------|
| 1 | halves | Halves | Core | —(root) | 4 | 27 | 12=6 · 50=25 |
| 2 | times | Times | Core | by:halves | 3.5 | 21 | 11×12=132 · 12×12=144 |
| 3 | doubles | Doubles | Core | by:times | 4 | 22 | 250=500 · 12=24 |
| 4 | addsub | Add & Subtract | Number | by:doubles | 5 | 21 | 36+29=65 |
| 5 | addsub2 | Add & Subtract II | Number | mastery:addsub | 5 | 21 | 928−49=879 |
| 6 | bonds | Number Bonds | Number | by:addsub | 3.5 | 21 | 80+?=100 → 20 |
| 7 | bonds2 | Number Bonds II | Number | mastery:bonds | 3.5 | 21 | 0.2+?=1 → 0.8 |
| 8 | placevalue | Place Value | Number | by:bonds | 5 | 21 | 24×100=2400 |
| 9 | placevalue2 | Place Value II | Number | mastery:placevalue | 5 | 21 | 45÷100=0.45 |
| 10 | fractionsof | Fractions of | Fractions & % | by:placevalue | 9 | 21 | ½ of 60=30 |
| 11 | fractionsof2 | Fractions of II | Fractions & % | mastery:fractionsof | 9 | 21 | ⅔ of 30=20 |
| 12 | percentages | Percentages of | Fractions & % | by:fractionsof | 9 | 21 | 50% of 140=70 |
| 13 | percentages2 | Percentages of II | Fractions & % | mastery:percentages | 9 | 21 | 75% of 60=45 |
| 14 | fractions | Fractions | Fractions & % | by:percentages | 3.5 | 16 | ¼=0.25 |
| 15 | fractions2 | Fractions II | Fractions & % | mastery:fractions | 5 | 12 | 11/16=0.6875 |
| 16 | squares | Squares | Core | by:fractions | 3.5 | 17 | 14²=196 |
| 17 | rounding | Rounding | Number | by:squares | 6 | 21 | 962→nearest100=1000 |
| 18 | largermd | Larger ×/÷ | Number | by:rounding | 7 | 22 | 85÷5=17 |
| 19 | metric | Metric Units | Measures | by:largermd | 7 | 21 | 3L in mL=3000 |
| 20 | sequences | Sequences | Reasoning | by:metric | 9 | 21 | next 10,8,6,4 → 2 |
| 21 | sequences2 | Sequences II | Reasoning | mastery:sequences | 10 | 21 | 6n−2, term7=40 |
| 22 | scaling | Scaling | Reasoning | mastery:percentoff | 10 | 21 | 5→45, 8→? =72 |
| 23 | percentoff | Percent Off | Fractions & % | mastery:percentages2 | 9 | 21 | 45% off 360=198 |
| 24 | partwhole | Part → Whole | Fractions & % | mastery:fractionsof2 | 8 | 21 | ¼ of ?=7 → 28 |
| 25 | balance | Balance | Reasoning | mastery:addsub2 | 9 | 21 | 27+36=100−? → 37 |
| 26 | lcmhcf | LCM / HCF | Core | mastery:times | 8 | 21 | HCF 18,24=6 |
| 27 | mean | Mean | Reasoning | mastery:balance | 9 | 21 | mean 12,15,?=13 → 12 |
| 28 | timegap | Time Gap | Reasoning | mastery:placevalue2 | 7 | 21 | 10:45→12:40=115 |
| 29 | ratioshare | Ratio Share | Reasoning | mastery:partwhole | 10 | 21 | 40 in 3:5 → bigger 25 |
| 30 | cubes | Cubes & Roots | Core | mastery:squares | 5 | 24 | ∛27=3 · 2³=8 |
| 31 | money | Money | Core | mastery:bonds2 | 9 | 21 | 5×£1.20=6 |
| 32 | digitsum | Digit Sum | Core | mastery:lcmhcf | 6 | 21 | rem 845÷9=8 |
| 33 | roman | Roman Numerals | Number | mastery:rounding | 6 | 21 | CMXC=990 |
| 34 | primes | Primes | Number | mastery:digitsum | 7 | 21 | next prime>18=19 |
| 35 | pctup | Percent Increase | Fractions & % | mastery:fdp | 9 | 21 | 200+25%=250 |
| 36 | fdp | F·D·P | Fractions & % | mastery:fractions2 | 8 | 21 | 90% as decimal=0.9 |
| 37 | bodmas | Order of Operations | Reasoning | mastery:sequences2 | 9 | 21 | 2×3+4×5=26 |
| 38 | algebra | Function Machines | Reasoning | mastery:bodmas | 9 | 21 | 7→×2→−5=9 |
| 39 | xtricks | ×-Tricks | Number | mastery:largermd | 7 | 21 | 45×11=495 |
| 40 | negatives | Negatives | Number | mastery:doubles | 8 | 21 | −5+17=12 |
| 41 | area | Area & Perimeter | Geometry | mastery:metric | 9 | 21 | △ 9×6=27 |
| 42 | volume | Volume | Geometry | mastery:area | 8 | 21 | vol 4×5×5=100 |
| 43 | angles | Angles | Geometry | mastery:volume | 8 | 21 | △ 100,40→?=40 |
| 44 | mmr | Median·Mode·Range | Reasoning | mastery:timegap | 8 | 21 | median 11,7,9,13,5=9 |
| 45 | sdt | Speed·Distance·Time | Measures | mastery:money | 9 | 21 | 160km in 2h=80 |
| 46 | factors | Factors & Multiples | Number | mastery:xtricks | 9 | 21 | biggest prime of 45=5 |

*(Regenerate this table any time with the harness: stub `window`, `eval` `modes.js`, walk
`window.MODES`, call each `build()`. Used here to guarantee accuracy over hand-transcription.)*

## 3. Progression / session mechanics (the "game" around the drills)
- **Unlock chain.** `halves` is the only root. Every other topic unlocks via `unlockedBy`
  (finish the prior topic once → its `init:` achievement) or the harder gate `requires:
  mastery:<id>`. Part-2 topics are mastery-gated off their Part-1. The chain forms a tree
  (the tech-tree screen renders it; invariant: ≤4 abreast).
- **Round.** `build()` yields a shuffled pool; the player numpad-enters each answer; skips allowed.
- **Achievements per topic:** `init` (finished once) and `mastery` (no skips AND total time ≤
  `masterSecs × questions`). These drive unlocks **and** gold/collectible rewards.
- **Hall of Fame** per mode (best time), keyed by mode `id` in localStorage.

## 4. Subsystem map (file → role · engine-portable vs game-specific)
**Content / logic (game):**
- `modes.js` — the 46 drills (§2). *Port: data + pure transforms.*
- `guides.js` — per-topic "how to beat it" help text (British, Y5/6). *Data only.*
- `events.js` + `eventart.js` — **daily Events**: fixed roster of **14** time-limited
  challenges, cycles once per UTC day; today-only rewards; each has seeded crest art.
- `collectibles.js` — **ranks, the collectible catalogue, and procedural 16-bit item icons**;
  "data + pure functions" (main.js owns persistence/DOM). Includes the **Collector ladder**:
  a **12-tier collect-N reward ladder**; top tier (capstone) re-pointed to track the live
  catalogue total and **must stay strictly below it to remain reachable** (old 2.5k/5k/7.5k/10k
  tiers were dropped as unreachable — `collector.test.js` guards this).
- `heroes.js` (12 heroes: power/guard/speed/focus + item boosts), `enemies.js` (**120-tier**
  Arena ladder, rock-paper-scissors types + loot), Arena battle resolution. *Meta/economy.*

**Engine-portable subsystems (these are the reusable wins — build into the brickmap engine):**
- **Audio:** `sound.js` (procedural 8-bit SFX, one resumed AudioContext, `window.Sound`) +
  `synth.js` (the **generative-audio engine**, self-contained Web-Audio, the "music"). *Owner:
  port faithfully — it's good. Best-path question for B's research: native audio vs web-audio
  layer.*
- **FX:** `fx.js` (full-screen confetti/spark canvas, celebrations) + `fxgl.js` (the
  **WebGPU-first / WebGL2-fallback backdrop FX engine**, "sense of place"). *Engine candidate;
  brickmap likely supersedes fxgl with native particles.*
- **Generative art (all procedural pixel/dither — the aesthetic to carry into the engine):**
  `glyphs.js` (pixel bitmap-font for topic glyphs + app mark), `icons.js` (house chrome icons),
  `emblems.js` (brand emblems / app-icon candidates, maskable-safe), `monsters.js` (Arena enemy
  sprites), `scenery.js` (per-region backdrops, deterministic), plus the splash generators in
  `main.js` (`paintPixelTitle`, `paintVoidThrone`, `paintAppIcon`). *These are the "generative
  images" the owner wants in the engine or the game.*

**Integration / shell (game, A-owned):** `main.js` (198 KB — all wiring, persistence, DOM,
screens, splash, nav), `index.html`, `styles.css`, `sw.js` (offline cache), `manifest`.

## 5. Persistence — FULL save schema (v2, enumerated from source 2026-06-23)
All state is **localStorage**, **per-scope namespaced**. In code every key is written as `halves.*`
and rewritten to `<scope>.*` by a `localStorage` *shadow* (`resc()`); the **stored** prefix is
`<scope>.` where `SCOPE` is path-derived: `gg1/dev/`→`gg1dev`, `gg1/prod/`→`gg1prod`,
`gg1/v1/`→`gg1v1`, `gg2/dev/`→`gg2dev`, else `halves`. Every loader **degrades to an in-memory
var** when storage is unavailable. The port must reproduce these keys + shapes (and ideally read
the existing ones for a migration).

**Progression / core state**
| key (`<scope>.`…) | shape | meaning |
|---|---|---|
| `collected` | object `{ <entryKey>: {ts:number} }` | **THE central progression map** (achievements live here, NOT in separate keys). Entry keys: **`<collectibleId>`** (owned item) · **`init:<modeId>`** (topic played once → unlock gate) · **`mastery:<modeId>`** (topic mastered → harder gate + reward) · **`event:<id>` / `event:<id>:well` / `event:<id>:ace`** (event tiers) · **`tier:<n>`** (collector-ladder tier → boss trigger). |
| `gold` | string(float ≥0) | Goblin Gold balance. |
| `stats` | `{games:int, byMode:{}, flawless:{}}` | cumulative play stats. |
| `streak` | `{count:int, lastDay:int\|null, best:int}` | daily Momentum (lastDay = local-day index). |
| `unlocked` | object \| null | explicit access grants — an **ACCESS layer only**, *never re-gated*. |
| `hof:<modeId>` | array `[{score,time,ts}]` | per-mode Hall of Fame; rank = score↓, time↑, ts↑. |
| `qbest` | `{ <modeId>: { <promptString>: bestTimeMs } }` | per-question best solve times. |
| `eventBest` | `{ <eventId>: {score,time,ts} }` | best event attempt, keyed by **event id** (survives the 14-day recurrence). |

**UI / preferences**
| key | shape | meaning |
|---|---|---|
| `mode` | string | last-played mode id (`LAST_KEY`). |
| `navSeen` | object | nav-badge "new-since-seen" tracking (T218). |
| `pickerView` | string | mode-picker view preference (tree / list). |

**Audio / settings** (canonical + one-way value migration)
| key | shape | meaning |
|---|---|---|
| `sound` | `"on"`/`"off"` | mute toggle (default on). |
| `musLv11` | `"0"`..`"11"` | music level (canonical, default 6). Migrates from legacy `musicVol` (0–10). |
| `sfxLv11` | `"0"`..`"11"` | SFX level (canonical, default 6). Migrates from legacy `sfxLvl` (0–100) or `sfxVol` (0–10). |
| *legacy (read-only migration sources, no longer written)* | — | `musicVol`, `sfxLvl`, `sfxVol`, `vol`, `tempo`. |

**Dev flags:** `dev` (`"1"` → developer mode) · `devReveal` (`"1"` → reveal-all view override).

**Migrations to preserve:** (1) on `gg1prod` first run, if `gg1prod.gold` is absent but
`halves.gold` exists, **all `halves.*` keys are copied to `gg1prod.*`** (keeps the original live
player's save when prod went live). (2) Audio levels migrate old scales → 0–11 (above).
**Reset** (`clearAllData`) removes every key with the scope prefix **plus** the per-mode `hof:<id>`
board keys.

> **Port note:** `collected` is the keystone — collectibles *and* all achievement/unlock state are
> one map of `{key:{ts}}`. A faithful port models that single map + the eight other keys above.
> Web-GG1 and brickmap-GG1 should share this schema so a player's save is portable between them.

## 6. Content-as-data spec (the seam shared by all three strands)
Recommended portable format the engine consumes (web-GG1 can adopt it too, killing drift):
- `modes.json` — array of `{id,name,tag,group,expr,masterSecs,unlock:{by|mastery},
  data:[…], transform:"<name>"}` (lift each `*_SRC`; name the transform).
- `transforms` — the ~40 pure `datum→{p,a}` functions, re-implemented per engine, with a shared
  test vector (`{input → expected p,a}`) generated from the current JS so parity is provable.
- `guides.json`, `events.json`, `collectibles.json`, `collector-ladder.json` — straight data lifts.
- **Balance constants** (masterSecs, gold rewards, collector tiers, enemy tiers/defs, hero stats)
  → one `balance.json` so tuning is data, not code.

## 7. Honest scope (v1 + v2 passes)
- ✅ **Fully captured from source:** the 46-mode catalogue (metadata + pools + samples), the
  unlock/mastery mechanics, the subsystem map, the procedural-asset fact, **and (v2, 2026-06-23)
  the full save schema (§5)**.
- 🔶 **Still mapped-only, needs a depth pass for faithful port:** (b) **economy tuning** —
  gold earn/spend rates, the collector reward amounts per tier,
  enemy tier defs, hero stats/boosts; (c) the **Arena** loop rules; (d) the **Events** roster
  specifics + reward table; (e) the **audio cue inventory** (which SFX/music fire when). Each is a
  bounded grep-and-document task — queue as v2 once B's brickmap capability matrix tells us which
  of these the engine already covers.
