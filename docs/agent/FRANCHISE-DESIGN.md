# FRANCHISE-DESIGN — the Goblin Gold series (living doc)

> Strategy/architecture for turning GG into a multi-game 11-plus franchise on a shared base.
> **LOCKED** items are decided; **OPEN** items are parked for the owner. Created 2026-06-22.
> This is forward-looking — **GG1 (Maths: The Void Throne) ships first; none of this diverts the
> launch.** Engine/sequel work begins *post-GG1-launch*.

---

## 1. The vision
One brand — **Goblin Gold** — covering the four pillars of the UK 11-plus, each a standalone game
built on a shared base, sharing the franchise identity (the "drill the *atomic building blocks*, don't
just reproduce 11-plus questions" philosophy + the "answer → collect → simple metagame" loop), but each
with its own subject, **input system**, assets, subtitle, and metagame fantasy.

The four subjects: **Maths · English · Verbal Reasoning · Non-Verbal Reasoning.**

## 2. LOCKED — the games & order
Order is by **tractability × value** (validate the engine on the cheapest sequel before the hard input
problems), NOT by exam prestige:

| # | Game | Subject | Status |
|---|------|---------|--------|
| GG1 | *The Void Throne* | **Maths** | shipping · **VOID/gold aesthetic** · HOARD/battle metagame |
| **GG2** | (subtitle TBD) | **Verbal Reasoning** | **LOCKED 1st sequel** · **PLANT/NATURE aesthetic** · **"Plants & Beasts" metagame (§6a, owner's strongest idea — provisional)** |
| GG3 | (subtitle TBD) | **English** | after GG2 |
| GG4 | (subtitle TBD) | **Non-Verbal Reasoning** | last |

- **VR is GG2 (LOCKED).** Rationale: easiest second game — atomic, short answers, closest to the existing
  model; mostly multiple-choice + letter-tiles; lets us prove the engine cheaply before tackling
  English's hard input (spelling/grammar/comprehension) and NVR's hard *generation* (valid procedural
  shape puzzles).
- **GG2 aesthetic = PLANT / NATURE throughout (owner, 2026-06-22)** — the counterpoint to GG1's void/gold.
  Drives the palette, icon, subtitle, backdrops/biomes, music, and the brand creature (nature beasts). The
  VR *content* sits inside that wrapper exactly as Maths sits inside GG1's void wrapper — content and
  aesthetic don't need to be thematically unified; the **metagame + aesthetic** carry the flavour.
- **GG2 metagame = "Plants & Beasts" (§6a) — owner's strongest idea, provisionally assigned** ("unless a
  stronger idea comes"). It pairs perfectly with the nature aesthetic (grow crops → pacify nature beasts).
  This **supersedes** the earlier deduce/decode candidate for VR.
- **GOLD is in EVERY game as a CONCEPT, but BUYS NOTHING and does NOT carry between games (owner, 2026-06-22,
  clarified).** "Goblin Gold" is the brand + the signature **meta-joke**: gold just **goes UP** (the
  absurd-wealth comedy + the hoard pile) — it is **NOT a spendable currency**, in any game. **Each game is a
  totally isolated, fresh session — every new player starts from 0 gold; gold does NOT transfer between games**
  (the earlier "carries across" phrasing was a misread of "gold exists in all games" — corrected). Every game
  *earns* its own gold from drilling (the vanity/score that ramps to billions for laughs), and the per-game
  **metagame economy is SEPARATE** — e.g. in GG2 seeds come from **drilling drops** and plots unlock from
  **progression**, NOT bought with gold. So §6's metagames run *alongside* that game's own ever-climbing hoard.
- VR and NVR stay **separate games** (not combined) — completely different content + input systems.
- GG3/GG4 are **not pre-committed** — decide based on how GG1 + GG2 land. (Four games is a large
  undertaking; build to demand.)

## 3. LOCKED — the engine approach
**Extract the engine, don't build it speculatively.** Sequence:
1. **Ship GG1.** (No engine work before launch.)
2. **Post-launch: refactor GG1 into CORE + CONTENT-PACK.** ~80% of GG1 is already subject-agnostic.
3. **Build GG2 (VR) on that split** — it stress-tests and validates the boundary.
4. **The engine crystallises through use** ("rule of three" — only by GG2/GG3 do you know what's truly
   shared). Do not over-abstract for games not yet designed.

**CORE (shared, subject-agnostic):** the PWA shell + service worker/manifest scaffolding; `fxgl`
(FX/backdrop/celebration/the generative-art engine); `synth` (audio); the round loop + timer +
scoring/ranks; progression/mastery/streak; the collection/inventory system; the economy/currency +
hoard-style reward; dev mode; the guide framework; settings/onboarding; the update/version flow.

**CONTENT-PACK (per game, swappable):**
- **Questions** — the topic generators + calibration (per-subject research).
- **Input system** — see §4 (the key investment).
- **Answer-checker** — per input mode.
- **Assets** — palette, icon, subtitle, items/collectibles, backdrops, music style, brand creature.
- **Metagame module** — §6 (OPEN).

**Repo shape (TBD at refactor time, not now):** likely a monorepo `core/` + `games/{maths,vr,english,nvr}/`
where each game is a no-build static PWA composed of core modules + its pack. Decide when refactoring.

## 4. LOCKED — pluggable INPUT system (the make-or-break investment)
The single most important architectural change. The numpad is baked into GG1's assumptions; the
franchise needs **input as a pluggable module**: a question declares its *input mode*, the shell renders
the right widget + answer-checker.

- **Multiple choice** (tap 1 of 2–5) — the universal workhorse: most VR, all NVR, most English. **Build
  first; it unlocks the whole franchise.**
- **Letter tiles / on-screen keys** — VR codes, spelling, single-word English answers.
- **Tap-a-target** — NVR (tap the matching shape), English (tap the error/odd word).
- **Numpad** — stays for Maths.

Get this abstraction right → sequels are *content + art* work, not rebuilds. Get it wrong → every sequel
is a fork. Design it most carefully.

## 5. LOCKED — the "atomic drilling" identity (per-subject building blocks)
Keep the franchise philosophy: **drill the atomic sub-skills**, not full exam questions. Per subject
(content-research task per game; refine at build time):
- **VR (GG2):** synonyms/antonyms, alphabet arithmetic (letter ±positions), simple codes/ciphers,
  analogies, odd-one-out, hidden words, letter/number sequences, word-pairs.
- **English (GG3):** vocabulary-in-context, spelling patterns, homophones, plurals/tenses, punctuation,
  sentence-completion. *Comprehension → drill the sub-skills* (inference, main-idea, vocab-in-context on
  short snippets), not full passages.
- **NVR (GG4):** rotation, reflection, symmetry, counting, shape attributes, sequence completion, simple
  matrices, odd-one-out shapes.

## 6. OPEN — the metagames (owner is thinking about this; NOT locked)
Constraint (locked): each game keeps the **"collect items → quick, simple metagame"** shape, but should
**feel distinct** (not a reskinned Arena). The trick is to **change the core verb**. These are *candidate
ideas only* — the owner will decide:

- **GG1 Maths → HOARD / battle** (existing): Goblin Gold, item-boosted heroes, Arena ladder, the pile.
- **GG2 VR → PLANTS & BEASTS (cultivate/pacify)** — **provisionally chosen** (owner: strongest idea), plant/
  nature aesthetic. See §6a. *(Earlier deduce/decode detective idea = superseded, kept only as a fallback.)*
- **GG3 English → CRAFT / scribe** *(candidate)*: a wordsmith restoring a library / forging a grimoire;
  collect letter-runes, inks, rare words; **forge words into spells**, fill a spellbook / restore tomes.
- **GG4 NVR → BUILD / assemble** *(candidate)*: a shape-smith; collect tiles/gems/shards; **assemble** a
  growing structure — crystal palace / stained-glass / constellations.

Unifying pattern (if adopted): **hoard → deduce → craft → build** — same loop, four fantasies. All must
stay *simple* (fill a board / spellbook / structure — not a deep sim). **STATUS: open — owner deciding.**

### 6a. CANDIDATE (owner's, 2026-06-22) — "Plants & Beasts" (CULTIVATE / PACIFY)
A fleshed-out, owner-originated metagame — **provisionally GG2 (VR), plant/nature aesthetic.** It's an **Arena-adjacent
reskin with a fresh farming layer** — the owner: *"almost the same arena challenge, but a different
flavour."*
- **Collectibles = SEEDS / tubers** (instead of loot). You **plant** them; after a **growth duration**
  you **harvest the crop/fruit**.
- **Crops are TYPED + spec'd** (like items have rarity/boost): a crop's type + spec determine its effect.
- **Beasts** (replacing arena enemies) are organised into **REALMS** — the **same region/ladder structure
  as GG1's Arena.** Beasts have **TYPES.**
- **Pacify, don't fight:** you **feed crops to beasts** to **pacify them one at a time** up the realm
  ladder. **Type matchup** (crop type vs beast type) sets the pacification level — directly reuses GG1's
  rock-paper-scissors hero/enemy triangle. The "feeding/pacifying" replaces the battle playout.
- **Why it's strong:** (1) reuses a LOT of the engine — realm/ladder structure, the type-matchup, the
  collection system — so it's *cheap on the core* (good for the engine thesis); (2) the **plant→grow→
  harvest** loop is a genuinely new layer + a natural **retention hook** (a reason to come back); (3)
  **"pacify by nurturing" is a lovely gentler reframe** of the combat ladder (good tone for a kids' app).
- **GROWTH = WALL-CLOCK (owner decision, 2026-06-22):** crops ripen on **real time, 2–10 hours depending on
  rarity** (rarer seed → longer grow). Plus **LIMITED PLANTING PLOTS** — a finite number of slots, so you
  choose *what* to grow and *when* (light resource strategy). This is the classic Farmville/Hay-Day daily
  loop (plant before bed/school → harvest later) → strong return cadence.
  - *Loop integrity (Babysitter note):* keep **DRILLING the way you earn SEEDS** (answer questions → seeds),
    so practice stays the engine and farming is the reward/retention layer on top. The earlier pay-to-skip
    worry is **moot** under our **free / no-IAP** model — no skip-the-timer purchases exist, so the
    wall-clock is a clean "come back" hook, not a monetisation gate. (Open detail: do unused plots / a full
    harvest ever block progress? Keep it generous so a kid is never *stuck* waiting — they can always drill.)
- **Subject fit:** mechanically subject-agnostic; thematically nature/growth. Could slot into any sequel —
  owner to assign (it doesn't have an obvious lock to VR/English/NVR). **STATUS: provisionally ASSIGNED to GG2 (VR), with a PLANT/NATURE aesthetic (owner 2026-06-22) — the
  strongest idea so far; could change only if a stronger one comes. Supersedes the deduce/decode VR candidate.**

## 7. Per-game asset re-roll (each game)
The brand "Goblin Gold" stays; each game re-rolls: **subtitle** (Void Throne → per-game), **icon**,
**palette/theme**, **collectible items**, **backdrops/biomes**, **music style**, and the **brand creature**
(GG1's is the beast/Magnar lineage). On-device label & store naming per `BACKLOG`/the naming notes
(umbrella "Goblin Gold"; numbered sequels for successors, subject-labels if ever parallel).

## 8. Practical next steps (all POST-GG1-LAUNCH)
1. Finish + launch **GG1**. *(current focus — do not divert)*
2. **Core/pack refactor** + the **pluggable input system** (§3–4) — mostly invisible; GG1 keeps working.
3. Build **GG2 (VR)** as the proof — cheapest sequel, validates the engine, second product.
4. Owner decides metagames (§6) and whether/when to do GG3/GG4.

---
*Living doc — update as decisions land. Babysitter-owned (`docs/agent/`). Cross-ref: BACKLOG naming/
trader notes, IDEAS I10 (franchise), PLAY-STORE-PREP.*
