# Halves — Content Extension Blueprint (T58)

> **Canonical guide for adding/restructuring topics without breaking the coupled
> systems — with genuinely NEW content, never dilution.** This is a design + process
> doc (no behaviour change). It is the single source of truth `T59`–`T61` build from.
> Accurate to the live code as of the T88 Arena team-sim (`enemies.js`),
> `collectibles.js`, `modes.js`, `guides.js`. When the code moves, update this doc.

---

## 0. The golden rules

1. **New content, not dilution.** A new topic/part ships its OWN procedural art
   (≥1 new icon category/archetype), OWN name-bank entries, OWN guide + OWN
   method-only hint branch. Adding items that just recycle the existing ~50
   categories / existing adjectives is a DoD failure.
2. **A new PART only where there is genuine depth.** The tech-tree (T106) renders
   varying depth fine — do **not** force a uniform 3-wide tree. `Halves`, `Doubles`,
   `Number Bonds` stay bounded (no new part).
3. **Every answer is numeric + numpad-enterable.** No colon/unit/letter keys.
   Time is minutes, money is a decimal of pounds (or pence), metric is the converted
   number. Decimals must be **terminating** and stored as **literals** (avoid IEEE
   drift — see `PV_*_SRC`/`BONDS_P2_SRC` which store the answer explicitly).
4. **The coupled TEXT moves with the content.** Re-curating a question set is not
   enough — see §6 (the doc/text cascade).
5. **Re-prove the invariants every time** via the CI gates (§7). The Arena
   auto-scales; you must confirm it still holds on the grown pool.

---

## 1. The current curriculum (live, in declaration / unlock order)

`modes.js` declares each topic with `id`, `name`, `tag`, `group`, a `masterSecs`
(gentle per-answer target), structured `glyphTokens` (T56), and an unlock relation:
a main-chain topic uses **`unlockedBy:"<prevId>"`**; a harder Part-2 sits OFF the
chain via **`requires:"mastery:<part1Id>"`**. Each `build()` shuffles a fixed,
curated `*_SRC` array (~17–26 entries) into `{p, a}` items.

| id | name | group | unlock | masterSecs | N | content today |
|----|------|-------|--------|-----------|---|---------------|
| `halves` | Halves | Core | *(start)* | 4 | 26 | halve real-world numbers |
| `times` | Times | Core | `unlockedBy:halves` | 3.5 | 21 | tables (hard 6/7/8/9 core + 12s) |
| `doubles` | Doubles | Core | `unlockedBy:times` | 4 | 21 | double |
| `addsub` | Add & Subtract | Number | `unlockedBy:doubles` | 5 | 21 | 2-digit ± within 100 |
| `addsub2` | Add & Subtract II | Number | `requires:mastery:addsub` | 5 | 21 | 3-digit ± 2-digit |
| `bonds` | Number Bonds | Number | `unlockedBy:addsub` | 3.5 | 21 | complements to 100 |
| `bonds2` | Number Bonds II | Number | `requires:mastery:bonds` | 3.5 | 21 | to 1000 & decimal bonds to 1 |
| `placevalue` | Place Value | Number | `unlockedBy:bonds` | 5 | 21 | whole **and simple decimal** ×÷ 10·100 |
| `placevalue2` | Place Value II | Number | `requires:mastery:placevalue` | 5 | 21 | decimal ×÷ powers of 10 |
| `fractionsof` | Fractions of | Fractions & % | `unlockedBy:placevalue` | 9 | 21 | ½ ¼ ⅓ ⅕ of (whole answers) |
| `fractionsof2` | Fractions of II | Fractions & % | `requires:mastery:fractionsof` | 9 | 21 | ⅔ ¾ ⅗ ⅝ of |
| `percentages` | Percentages of | Fractions & % | `unlockedBy:fractionsof` | 9 | 21 | 10/25/50% of ≤400 |
| `percentages2` | Percentages of II | Fractions & % | `requires:mastery:percentages` | 9 | 21 | 1/5/20/75% of ≤200 |
| `fractions` | Fractions | Fractions & % | `unlockedBy:percentages` | 3.5 | 21 | fraction → terminating decimal (incl. ⅛/1-20 stretch) |
| `squares` | Squares | Core | `unlockedBy:fractions` | 3.5 | 17 | 1²–12² recall **+ 13²–15², 20²/25²/30²** |

Five topics already have a Part 2 (`addsub`, `bonds`, `placevalue`, `fractionsof`,
`percentages`). The rest are single-part.

---

## 2. The coupling map (accurate to the code)

Adding a topic ripples through five systems. **One** is manual content; the rest
either auto-scale or must be updated in lockstep (§6).

### 2a. Collectibles — auto-generated per topic (`collectibles.js`)
For each mode `m` with `N` curated questions the catalogue auto-adds (`MODES.forEach`,
~line 116):

- **1 × Initiation** (`init:<id>`, uncommon) — answer ≥ half a round.
- **1 × Flawless** (`flawless:<id>`, rare) — no skips.
- **4 × Speed** (`speed:<id>:0..3`, the `SPEED` brackets Quick→Lightning) — clean
  round under each avg.
- **1 × Mastery** (`mastery:<id>`, epic) — no skips AND `totalTime ≤ masterSecs·N`.
  **This is the item that gates the Part-2 (`requires:"mastery:<id>"`).**
- **2 × per question** — `solve:<id>:<p>` (common "Beat") + `spark:<id>:<p>`
  (uncommon "Spark", under `SPARK`s).

**Count = `7 + 2N` per topic** (halves 26Q → 59; a 21Q topic → 49; squares 17Q → 41).
So a new ~21-question topic adds ≈ **49 collectibles**.

### 2b. Boosts → hero ratings (the bridge to the Arena)
Every collectible carries a deterministic **boost** (`itemBoost(id, rarity)`,
~line 1002):
```js
return { hero: HERO_IDS[hashStr(id) % 12], stat: STAT_KEYS[hashStr(id+"§") % 4],
         amount: BOOST_AMOUNT[rarity] || 1 };   // common1 uncommon2 rare3 epic5 legendary8
```
Owning an item raises one stat (power/guard/speed/focus) of one of the 12 heroes →
raises that hero's **rating** → raises the **best-team product** the Arena calibrates
against. **More content ⇒ a higher achievable team ceiling.**

### 2c. The Arena auto-scales (`enemies.js`, T88 team sim)
The live Arena is the **T88 deterministic 1–3-vs-3 team sim** (`simulateTeams`,
`teamBattle`, `teamBattleLog`) — zero RNG, same inputs → same outcome.
`TIER_COUNT = 120` (10 regions × `REGION_SIZE = 12`; hand-named BANDS/BOSSES/
RANK_TITLES).

The per-tier enemy budget `FOE_BUDGET` is **computed at load** by
`calibrateTeamCurve()` (~line 273), so it **re-derives from the live collectible
pool every deploy**:

1. **Forward pass** — for each tier `n`, `advProd[n] = teamProduct(bestTeamVs(owned,
   3, type))` over the drill items + the loot of tiers `< n` (so a tier is judged on
   what you could own *before* clearing it).
2. **Suffix-min envelope** `capEnv[n] = min(advProd[n..])` — keeps the curve
   non-decreasing ⇒ **no tier is gated behind its own loot**.
3. **Budget** `fb[n] = min(lb0·LG^(n-1), capEnv[n]·CAPF)` — a geometric ramp
   (`LG=1.065`) clamped under the achievable team product (`CAPF=0.07`).
4. **Early-floor pin** — binary-search `lb0` to the largest ramp where a **single
   starter hero at 0 items** still clears **tiers 1–5**.
5. **Final-tier pin** — set tier 120 between the **near-full** and **85%-loadout**
   win edges, so the top falls **only to a near-full collection**.

Hero combatant: `hp = HB + guard·HG + power·HPP`, `atk = power + 0.8·focus`
(`HB=22,HG=1.4,HPP=0.5`); enemy from a budget via `HPR=2.2`, adds at `tier−K` (`K=10`).

**⇒ Adding drill items with boosts raises the achievable ceiling, so the ramp + the
boss budgets rise automatically and "tier 120 ⇔ near-full" keeps holding — with NO
manual difficulty edit.** You only re-RUN the proofs (§7), you don't re-tune.

*(Legacy note: `statBattle` (the 1v1 `power ≥ tier.def` check, ~line 181) is preserved
for migration but is **not** the live model. Any older doc text describing a static
`def`-formula / `ADV_MULT` boss-def is superseded by the team-sim calibration above.)*

### 2d. Guides + hints (`guides.js`)
Each topic needs a `Guides.get(id)` entry (`intro` + 2–4 `tips` + `example`) and a
branch in **`Guides.explain(modeId, question)`** (~line 173) that returns a
**method-only, number-specific** hint for the questions that part NOW contains.

### 2e. Glyphs (`glyphs.js` / T56)
Each mode's `glyphTokens` feed the procedural pixel mark. A new operator/representation
needs its tokens; unknown tokens hash to a generic glyph (so it never breaks, but add
real tokens for a crafted mark).

---

## 3. What auto-scales (NO manual change)
- **Arena difficulty** — the dynamic `FOE_BUDGET` (§2c); the boss budgets and the
  ramp rise with the pool. The 120-tier structure is fixed; budgets adapt.
- **Collector ladder** (T55, to 10k) and **lazy inventory** rendering.
- **Per-topic completion milestones** and the tech-tree depth (T106).
- **Icon + name rendering** — deterministic from each item id; new ids just render.

## 4. What needs intentional NEW content per wave (anti-dilution)
- **≥1 new procedural icon category/archetype** in `collectibles.js` (the 12
  archetypes × ~4–5 categories + per-item jitter are the existing pool; a wave adds
  fresh ones so its loot is visibly new — document which).
- **New name-bank entries** (ADJECTIVES / per-archetype NOUNS / EPITHETS / CREATURES
  / PLACES / FIXED) so names stay diverse — no new repeated adjective.
- A **guide** + a **method-only, number-specific `explain()` branch** (T49 standard).
- Structured **glyph tokens** (T56) for the pixel mark.
- Unlock-chain placement + a `masterSecs` tier.

---

## 5. The add-a-topic checklist (ordered, copy-pasteable)

```
[ ] modes.js   — curated <TOPIC>_SRC array (~17–21 numeric items, calibrated to
                 docs/research-11plus.md ranges; decimals terminating + stored as
                 literals). Add the mode: id, name, tag, group, eyebrow, expr,
                 masterSecs, unlockedBy (chain) OR requires:"mastery:<p1>" (Part 2/3),
                 build(), glyphTokens.
[ ] collectibles.js — add ≥1 NEW icon category/archetype + NEW name-bank entries for
                 this wave (anti-dilution). (The 7+2N kit auto-generates from the mode;
                 boosts auto-assign.) Document what art/names are new.
[ ] guides.js  — Guides.get: intro + tips + example. Guides.explain: a method-only,
                 number-specific branch for THIS part's questions (no answer leak in
                 digits OR words; place-value-honest; singular/plural-clean).
[ ] glyphs.js  — glyph tokens if a new operator/representation is introduced.
[ ] re-curate the COUPLED TEXT for any moved skill (see §6).
[ ] tests      — extend/run the gates in §7; arena3 lattice must re-prove on the grown
                 pool; hints scan must be clean for every new question.
[ ] no new keys on the numpad; every answer numpad-enterable in the calibrated range.
```

---

## 6. The doc/text cascade (when a skill moves between parts/topics)

Moving content is **not** just re-curating the array. For **every moved skill**, list
and update in lockstep:

1. **`mode.tag` / description** — must describe the NEW content (e.g. once decimals
   leave Place-Value P1, its tag drops "decimals"; the new P2/P3 get their own tags).
2. **The topic guide** (`guides.js` `get`) — the "how to approach this" text per part.
3. **The `Guides.explain()` branch** — must produce hints for what the part NOW holds
   and **not** reference cases it no longer contains; never leak the answer (digits or
   words); place-value-honest (only name a place the number actually has).
4. **Glyph tokens** (T56) if the operator/representation changed.

Each build task updates these together and **re-runs `hints.test.js` + the guide/
contrast gates** so the docs can't drift from the content.

---

## 7. The invariants to re-verify every time (CI gates)

| Gate | What it proves (re-run on the grown pool) |
|------|-------------------------------------------|
| `arena3.test.js` | The T88 sim is deterministic; **tiers 1–5 winnable by a single starter at 0 items**; curve monotonic; **no tier behind its own loot**; **tier 120 near-full-only**; monotone in loadout + team size. |
| `arena.test.js` | Legacy `statBattle` preserved; the team UI (T89) selection rules + the T90 playout resolve correctly + record tier progress. |
| `hints.test.js` | Every question's hint is **method-only**, leaks no answer (digit OR word), is place-value-honest, singular/plural-clean. |
| `icon-variation.test.js` | New icon categories are genuinely distinct (cross-category role grids) yet identity-preserving + deterministic. |
| `glyphs.test.js` | Each mode's glyph tokens render; topic glyphs stay pairwise distinct. |
| `contrast.test.js` | AA contrast holds for any new text/badges. |
| `perf.test.js` | No RAF/listener leak; single loop; idle when hidden. |

Plus: `node -c` clean; every `$("id")` resolves; numpad-enterable numeric answers.

---

## 8. Existing-topic restructuring (designed WITH the new topics — owner 2026-06-21)

Two levers, governed by the anti-dilution rule (a new part only for genuine depth):

### Rebalance (P1 too hard → gentler on-ramp, harder content to P2/P3)
- **Place Value** — today P1 blends whole **and** decimal ×÷10·100.
  → **P1 = whole ×÷10·100 only** · **P2 = decimal ×÷10·100** · **P3 = ×÷100/1000,
  answers <1, 3-dp** (the current `placevalue2` becomes the basis of P2; the harder
  stretch becomes P3).
- **Fractions (→decimal, `fractions`)** — today P1 includes ⅛ / 1-20 / 1-16.
  → **P1 = common (½ ¼ ⅕ tenths)** · **P2 = eighths / twentieths / sixteenths** ·
  **P3 = equivalent / ordering**.
- **Squares** — today P1 runs to 13²–15² + 20²/25²/30².
  → **P1 = 2²–12² recall** · **P2 = extension squares (13²–15², 20²/25²/30²)** ·
  **P3 = cubes &/or √ of perfect squares**.
- **Times** — keep the deliberately-hard 6/7/8/9 core but add a **gentler on-ramp**;
  push 2-digit× to a later part *(coordinate with Larger ×/÷, §9 overlap)*.

### Part-3 deepenings (genuine depth, IDEAS I6)
- **Fractions of → P3 reverse / find-the-whole** ("⅗ of ? = 18").
- **Percentages of → P3 % increase/decrease**.
- **Add & Subtract → P3 decimal ± / 4-digit / multi-step**.

### Leave bounded (NO new part — would dilute)
- **Halves · Doubles · Number Bonds**.

### Resolve overlaps (each skill lives in ONE place)
- Add&Sub decimal-P3 ↔ **Money** (Wave-2) → keep money-as-decimals in **Money**;
  Add&Sub P3 stays integer 4-digit / multi-step.
- Place-Value ×÷1000-P3 ↔ **Larger ×/÷** (Wave-2) → ×÷ powers-of-ten lives in **Place
  Value**; Larger ×/÷ is genuine multiplication/division (14×7, 24×15), not shifts.
- Times-extension (2-digit×) ↔ **Larger ×/÷** → 2-digit× lives in **Larger ×/÷**;
  Times stays tables fluency.

---

## 9. The FINAL topic map + build order (re-batches T59–T61)

Ranges per `docs/research-11plus.md` (Wave-2 table + "Calibrated value ranges").
Unlock chain stays importance-ordered; new topics **append after the current last
chain topic** (Wave-1 chain is already built through `squares`).

### Existing topics — final part shape
| Topic | P1 (rebalanced) | P2 | P3 (new, if depth) |
|-------|-----------------|----|----|
| Halves | halve (bounded) | — | — |
| Doubles | double (bounded) | — | — |
| Times | tables + gentler on-ramp | *(2-digit× → Larger ×/÷)* | — |
| Add & Subtract | 2-digit within 100 | 3-digit ± 2-digit | **decimal ± / 4-digit / multi-step** |
| Number Bonds | to 100 (bounded) | to 1000 & to 1 | — |
| Place Value | **whole ×÷10·100** | **decimal ×÷10·100** | **×÷100/1000, <1, 3-dp** |
| Fractions of | ½ ¼ ⅓ ⅕ of | ⅔ ¾ ⅗ ⅝ of | **reverse / find-the-whole** |
| Percentages of | 10/25/50% | 1/5/20/75% | **% increase/decrease** |
| Fractions (→dec) | **common (½ ¼ ⅕ tenths)** | **⅛ / 1-20 / 1-16** | **equivalent / ordering** |
| Squares | **2²–12²** | **13²–15², 20²/25²/30²** | **cubes &/or √** |

### New Wave-2 topics (each = the full anti-dilution kit; re-batched)
- **`T59` Batch A — Number depth:** **Rounding** (P1 nearest 10/100/1000 · P2 to 1–2 dp)
  + **Larger ×/÷** (P1 2-digit×1-digit · P2 2-digit×2-digit; ÷ with decimal remainders
  where clean).
- **`T60` Batch B — Measures:** **Money** (£/p, change, totals), **Time** (unit convert
  + elapsed minutes — numeric minutes, no colon key), **Metric** (mm/cm/m/km, g/kg,
  ml/l — the converted number).
- **`T61` Batch C — Reasoning:** **Ratio** (share 2-part ≤100 → numeric parts),
  **Mean** (average of a small set), **Sequences** (term-to-term next · linear nth-term
  value).

**Build order:** rebalances + Part-3s land alongside their Wave-2 batch where they
share a skill (resolve the §8 overlaps in the same task) so no skill is ever live in
two places. Each batch re-runs §7 in full.

---

## 10. The tier decision (owner-confirmed)
The Arena stays **120 tiers** (10 regions × 12) — meaningful/earned, not ~1000. All 10
hand-named regions + 10 bosses are kept (≈2 extra rank titles vs 100). **Naming stays
hand-crafted at this scale; procedural tier-naming is shelved** (only needed beyond a
few hundred). Difficulty auto-scales via §2c. The re-tiering itself was **T66**.
