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

### T4 — Per-topic completion + new milestones  · status: OPEN
- Helper for per-mode collected/total; surface on the picker (T3) and inventory.
- New milestone collectibles: "unlock N topics", "clear every topic",
  "100% a topic" (all auto-evaluated). Ensure a topic's 100% genuinely requires
  the hard items (Lightning speed bracket + Mastery + Flawless + all Beat/Spark
  for fact modes).
- **DoD:** counts correct; 100%-a-topic only fires after the hard set; Node check.

---

## Phase 2 — Topics (importance order; each = Part 1 + Part 2, P2 `requires` P1 mastery)

Build one topic per task, fully (both parts), with generators verified in Node
against the calibrated ranges in the research doc. Slot each into the chain at
its importance position. Status starts `OPEN` only after Phase 1 is `DONE`.

### T5 — Add / Subtract  · status: BLOCKED (await Phase 1)
P1: 2-digit ± within 100. P2: 3-digit ± 2-digit. Generated.

### T6 — Number bonds · status: BLOCKED
P1: to 100. P2: to 1000 + decimal bonds to 1. Generated.

### T7 — Place value ×/÷ · status: BLOCKED
P1: whole ×÷ 10·100. P2: decimals ×÷ 10·100·1000. Generated.

### T8 — Fractions of · status: BLOCKED
P1: ½ ¼ ⅓ ⅕ of. P2: ⅔ ¾ ⅗ ⅝ of. Generated.

### T9 — Percentages of · status: BLOCKED
P1: 10/25/50% of ≤400. P2: 1/5/20/75% of ≤200. Generated.

> Further topics (equivalences, rounding, money, time, metric, ratio, …) will be
> appended by the Babysitter once T5–T9 are `DONE`. Do not invent them early.

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

### T23 — Enemy tiers + battle logic · status: BLOCKED
Add the 24-tier list + RPS matchup + pure `resolveBattle(hero, tier, perf)` per
design; compute `tier24.def` from max-possible rating at load.
- **DoD:** Node test proves early tiers winnable with the starter hero at good
  perf, and **tier 24 is unwinnable unless all boosts are owned** (and winnable
  when they are, with advantage + perfect perf). Pure logic, no DOM.

### T24 — Arena mode (`#/arena`) · status: BLOCKED
Pick an unlocked hero → see tier + matchup hint → play a battle round (reuse the
drill engine over unlocked topics) → resolve → show the result maths → on win
grant `tier:n` + trophy item + advance (+ any hero unlock). Start-screen link.
- **DoD:** full flow works on existing content; win/loss correct vs the logic;
  trophies/tier ownership persist locally; no regressions; deploy green.

### T25 — Balance + milestone wiring · status: BLOCKED
Hero-unlock collectibles/milestones for "unlock all heroes", "defeat tier N",
"defeat the final tier". Balance pass so the curve is fair and the final tier
matches "needs ~everything". Update docs/research-11plus.md note that Phase 3 is
the engagement layer.
- **DoD:** Node test of the full progression curve; milestones evaluate
  correctly; final-tier ⇔ full-collection invariant holds.
