# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> Single source of truth for "what do I build right now." **Re-fetch
> `origin/claude/agent` and re-read this IMMEDIATELY before each task and before you
> push.** Rationale/details live in `REVIEW.md` / `BACKLOG.md`.

> 🛑 **FRESHNESS CHECK (`git fetch origin claude/agent` + check `origin/main` before EVERY task).** **Current truth:**
> GG1 ship PAUSED; **brickmap = GO (owner pre-approved); the GG1-on-brickmap FULL PORT is IN PROGRESS** (spike done +
> all 4 gates passed incl. on-device). Babysitter drives **ungated** (gates on tests/goldens/code-review). **Builder B
> = the brickmap full port — read your line below for the CURRENT phase** (don't trust any phase number quoted up
> here; it drifts). **Builder A = content seam DONE (T229/T230/T232) → holds; remaining A work owner-gated.** Capacitor
> scaffold (`T231`) DONE; GG2-on-web is dead. *(Stale markers → RE-FETCH: "A→T226/T168", "B→STAND BY/research pass",
> "Capacitor awaits approval", "metagame data missing" [it's a stale sync — re-sync `content/gg1/` from `origin/main`].)*

---

## ⚡ STANDING ORDER — AUTONOMOUS MODE (owner grant, 2026-06-22) — read EVERY cycle
**The owner has handed off: "nothing now needs human review. Push through until GG2 completion. If Builder A stops
responding you may have to take over the work yourself."** So the Babysitter now runs the WHOLE programme unattended:
1. **Drive the queue to completion** — GG1 v1 (T221 → T224 → T219 remaining + Collector rebalance → T218 → **T225
   final gate**) → **sign off v1 + cut/push `gg1-v1` + Release (T223)** → **GG2 P0…M12** per `GG2-MILESTONES.md`.
2. **Review every Builder A push** with full independent verification (worktree@SHA, `node -c`, full suite,
   re-enumerate/recompute content). Approve or send precise CHANGES. Keep this file to ONE clean current task.
3. **TAKE OVER if Builder A stalls (owner-authorised — the Babysitter MAY now write to `main`).** If A has not
   pushed progress on the top task across **~2+ auto-review cycles (~30–45 min)** with the task still OPEN/CHANGES,
   **become the builder:** implement the task on `main` (the relevant `[A]` files), run the FULL suite + `node -c`,
   **self-review against the DoD** (strict — same bar), commit with a clear message, update `BUILDER-LOG.md`, then
   resume reviewing/driving. Maintain quality exactly as if reviewing someone else. *(This supersedes the old
   "Babysitter never writes to main" rule — ONLY because the owner explicitly authorised take-over.)*
4. **Run T225 (final gate) yourself**, sign off v1 yourself, cut the tag/Release yourself — all owner-delegated.
5. **Escalate to the owner ONLY for:** a genuine blocker you cannot resolve, something that would *redesign* GG1
   (vs execute), or the two milestone FYIs ("v1 signed off + tagged", "GG2 P0 underway"). **GG2 creative calls:
   proceed with the defaults in `GG2-MILESTONES.md`, log in `GG2-CREATIVE-LOG.md`, do NOT block.**
6. **Quality bar is absolute:** do NOT sign off v1 until T225 is genuinely clean (zero correctness errors, zero
   typos, no regressions). If not ready, HOLD the tag and record why — never ship to hit a deadline.

⚠️ **SCHEDULING REALITY (corrected 2026-06-23):** there is **NO cron / ScheduleWakeup** in this environment — the
Babysitter CANNOT self-wake on a timer, so **truly-unattended overnight operation is not achievable**. The only wake
primitive is **`Monitor`** (an in-session poll of `origin/main`, best-effort while the session stays warm — it does
NOT survive container reclamation during long idle). **Realistic model:** when the session is active/woken, drive
HARD — review every pending push AND take over any stalled task immediately (don't leave work parked). Between active
periods, progress pauses until the owner (or a Monitor event) wakes the session. *(Do not promise unattended
multi-hour runs the environment can't deliver.)*

---

> ▶️ **BRICKMAP PARITY WORK RESUMED — GO (owner, 2026-06-25: "push on with brickmap parity work until completion. I'll wake up builder b").** The gg-web combat redesign + UI is DONE and stable (`main` `b164fde`), so the port is no longer a moving target. **B: RESUME the full port — build the Arena screen + event-play against the CURRENT exports.** **Before anything: re-sync `content/gg1/` from `origin/main` and re-run `combat.rs`** — the combat model + export schema changed (see the 🔧 block). The Babysitter (this session) is driving autonomously: reviewing every B push with full independent verification, keeping exports/docs current, and taking over [A]-domain export gaps as they surface. *(Was PAUSED 2026-06-24 — that hold is now LIFTED.)*
>
> 🔒 **RELEASE GATE — `PARITY-LEDGER.md` (owner, 2026-06-25).** Every unresolved parity issue (visual or otherwise) is recorded in `docs/agent/PARITY-LEDGER.md`. **GG1-on-brickmap v1 CANNOT be marked complete until that ledger has zero open issues** — each RESOLVED (fixed + re-verified) or owner-ACCEPTED with a sign-off — AND every screen has passed the screenshot-compare gate. Log new issues there on every review pass; the Babysitter holds the tag until it's clean.
>
> 🔧 **COMBAT MODEL REDESIGNED — `main` `b49e62b` (2026-06-25), + hero-unlock gating `b164fde`.** Bigger than the earlier rebalance: the 3v3 sim was reworked so **all 4 stats have one distinct role** and the **vestigial 1v1 path is fully gone**. **Re-sync `content/gg1/combat.json` + `combat-vectors.json` (both regenerated) into brickmap and re-run `combat.rs` — and update the Rust combatant/sim to the new model below.** What changed:
> - **Combatant shape** `{atk,hp,spd,type}` → **`{pow,grd,spd,foc,hp,type}`**. Heroes: `{pow:power, grd:guard, spd:speed, foc:focus, hp:HP_FLAT(120), type}`. Foes: `{pow:√(budget/HPR), grd:0, spd:ESPD(4), foc:0, hp:√(budget·HPR), type}`.
> - **Stat roles:** PWR = `round(pow·matchup)` damage · FOC = `round(foc·FOC_FLAT)` flat damage (matchup-independent floor) · GRD = per-hit mitigation `round(grd·MIT)` (min 1 through) over flat HP · SPD = one-time **opening strike** `round(speed·SPD_ALPHA·matchup)` for any HERO (side 0) that outspeeds its target, BEFORE the rounds.
> - **Constants:** `HP_FLAT=120, MIT=0.6, FOC_FLAT=1.2, SPD_ALPHA=0.5`; foe-budget curve `FLOOR=300, WALL=240000, STEEP=0.18` (boss tier 120 auto-repinned). Damage per hit = `max(1, round(pow·mu) + round(foc·FOC_FLAT) − round(target.grd·MIT))`.
> - **Log flags** for the playout: each entry now carries `{open, adv:matchup>1, blocked:mit≥half}` (animation callouts).
> - **REMOVED:** `Enemies.statBattle`, the tier `def` field + its calibration, `def` in combat.json/balance.json tiers, and `arena.test.js`. The `combat.json` `constants.combat` block + `_resolution` doc are the authoritative recipe. Balance verified: ~1 topic → 9 tiers, full → 120, monotone; all 4 stats positive-leverage (tool: `tools/analyze-arena.js`).
> - **HERO-UNLOCK GATING now exportable (`b164fde`) — the Arena roster fields only UNLOCKED heroes (no more "all 12 interim").** Each hero's unlock is a serialisable spec on `combat.json` `heroes[].unlock`, one of: `hasKey{key}` (key present) · `countPrefix{prefix,min}` (≥min keys start with prefix) · `keyMatch{prefix,suffix,min}` (≥min keys start-with prefix AND end-with suffix, ≥1 char between — the `speed:<mode>:3` Lightning bracket). Port `compileUnlock` the same way; `combat-vectors.json` `heroUnlock` is an 18-state battery (isHeroUnlocked per state, incl. count boundaries + keyMatch rejects) to prove your interpreter byte-identical.

## Builder A — work the TOP ⏳ item ONLY. Do not skip or reorder. Push it alone → wait for review → next.

**▶ FOCUS = STORE LAUNCH + 3 PARALLEL ARCHITECTURE STRANDS (owner, 2026-06-23).** GG1 v1 is shipped (Release
`v1.0.0` @ `525ba87`) and the **TWA `.aab` is built, uploaded to Internal testing, and asset-links–verified
(launches fullscreen)**. The TWA wraps PROD `https://00-1.github.io/halves/gg1/prod/`.

**Three strands now run in parallel — do NOT let any deprecate another:**
1. **TWA = the shipping path. NOT deprecated.** Until further notice this is what we ship; keep prod = v1 and the
   PWABuilder/assetlinks flow intact. (Known edge case: an "Open with"/work-profile chooser on the owner's own dual-
   profile phone — does not affect normal single-profile users.) **TWA/splash polish:** ✅ `T227` splash
   horizontal-scroll FIXED (Babysitter take-over `61650f5`, headless-verified; reaches the TWA via prod deploy) ·
   ⏸ `T228` truly-immersive notch-fill + drop the JS-fullscreen toast — **PARKED, needs the owner's `.aab` rebuild**
   ("Fullscreen sticky"/cutout) BEFORE dropping JS-FS, else the black notch strip returns. *(BACKLOG T227 DONE / T228.)*
2. **Capacitor experiment (Builder A).** In-process-WebView wrapper to remove the TWA browser-handoff fragility.
   **✅ scaffold DONE (`T231`, `0f77a83`) — on-device test = owner** (`OWNER-EYEBALL.md`). Parallel; may or may not adopt.
3. **GG1-on-brickmap (Builder B) — ✅ GO, FULL PORT UNDERWAY.** Spike complete (all 4 mini-gates passed; #4 launch crash
   fixed + self-verified). Now the full port, phase-gated on tests/goldens: ✅ phase 1 engine services banked
   (`bm-render::text2d`/`ui2d` + `bm-platform::save`) → **phase 2 logic re-impl vs the T229 parity vectors** → phase 3
   content → phase 4 audio → phase 5 polish. GG2 is brickmap-native; this is the proving ground (now proven).

> ⚡ **AUTONOMY GRANT — owner stepped away (2026-06-23 eve): "continue unattended and ungated; don't gate steps on my
> approval; I'm happy this will work out — and we have the web version if not."** ⇒ **brickmap = GO** (full port,
> owner pre-approved). **Babysitter drives ungated, gating each step on SELF-VERIFICATION (tests / goldens / code
> review read off the public brickmap repo) — NOT owner approval.** The Babysitter has **no device**, so: (a) where a
> headless golden/test can cover it (incl. the live render path's empty/initial states), gate on THAT; (b) genuinely
> device-only / aesthetic / audio-by-ear checks → **QUEUE for the owner's return (don't block)** in an "OWNER EYEBALL
> ON RETURN" list. Web GG1 is the fallback. **Reality:** no scheduler/self-wake — the Babysitter progresses on each
> builder push (background watch wakes it); between pushes it idles. Drive the brickmap port phases on every B review.

- ✅ **GG1 v1 COMPLETE & RELEASED** (46 topics, T225 clean, tag `v1.0.0`).
- ✅ **`T226` — DONE / CLOSED.** (2) `gg1/v1.0.0/` archive + `apps.json` ✅ on `main`. (3) `gg1/dev → gg1/prod`
  promoted to v1 ✅ (prod == dev). (1) **generic path-derived scope — DROPPED:** the hardcoded per-folder scope
  (`/gg1/dev/→gg1dev`, …) works and is migration-safe, and the **brickmap pivot means there are NO future *web*
  apps (gg2/dev…) to generalise for** — refactoring migration-critical scope code would be pure risk for zero value.
- ⏸ **`T168` — Play-Store productionisation — PAUSED (owner paused GG1 ship, 2026-06-23).** Already DONE & verified:
  privacy.html, `assetlinks.json` (both fingerprints live), the `.aab` built + uploaded to Internal testing,
  asset-links verified (fullscreen). REMAINING (on hold until un-pause): store listing copy/assets, App-content
  declarations, closed testing (12/14). Plus the parked TWA polish `T227`(done)/`T228`.

**GG2 P0 — PARKED & its web-extraction plan SUPERSEDED** by the brickmap pivot (`BRICKMAP-GG1.md`; `GG2-P0-EXTRACTION.md`
carries a superseded banner). Do NOT start GG2-on-web.

**Builder A → HOLD (all exports done by Babysitter take-over; A idle).** ✅ `T229/T230/T232` content seam + ✅ `T233`
earning (`fde819a`) + ✅ `T233b`-gold (`4ae14b3`/`7c74439`) + ✅ **`T233b`-combat** (`cdedb6c`) + ✅ **`T233c`** events
(`06a5d9d`) — all Babysitter take-overs, A stalled throughout. **No export gaps remain.** A's other work is owner-gated
(TWA `T228`, store, Capacitor on-device test).

> 🎯 **▶ NOW — BUILDER B: VISUAL-PARITY REMEDIATION PASS (owner side-by-side review, 2026-06-28).** The owner
> reviewed the six best `examine`-passing screens side-by-side and they "look almost nothing alike" — the ΔE gate
> was too lenient. **Systemic gaps to close across ALL rendered screens (see `PARITY-LEDGER.md` §A V25–V28):**
> **(V25) TYPOGRAPHY** — match GG1's PIXEL/BITMAP monospace font; B currently uses a smooth vector sans (the #1
> driver). *If bm-render's text path can't do a bitmap font, FLAG IT — don't fake it.* **(V26) BACKGROUND** — drop
> the purple/violet cast on non-home screens; use near-black `#0E1116` (purple is HOME_PALETTE only). **(V27) TYPE
> SCALE** — match web's tall headline ramp (results timer / drill number DOMINATE) + denser body rows. **(V28)**
> use the filled ★ rank glyph, not `*`. **OWNER DECISIONS LANDED:** event-play **D1+D2 → MATCH WEB** — show the
> progress counter (not the event title) during the question, and use the neutral near-black bg + white question
> text (drop the purple theme + gold prompt). **D3 → ADD best-time tracking:** extend the save schema so
> `finish_round` records a per-topic best time/score, then build the Best Times screen (`#/best-times`) + wire the
> datum into the home `<topic> · best…` line and Practice qbest (one datum, three surfaces). **PROCESS:** after
> fixing, re-render → re-compare → and the change
> only counts once the side-by-side reads alike (ΔE alone is not the bar). Capture-state must match the web ref
> (heroes-partial was 7/12 vs 3/12 — N6; seed `capture-states.json` first).
>
> ✅ **WAVE 1 LANDED (`1eebcf4`+`fdb18ea`): V25/V26/V27 (font/bg/scale) + D1/D2/D3 genuinely fixed — verified.**
> 🔴 **WAVE 2 — the agent-review gate then found a SECOND layer the ΔE missed (PARITY-LEDGER §A V28–V39, gate doc in
> VISUAL-PARITY.md). FAILs: summary, hero-detail, heroes-partial. EXAMINE-systemic: drill, home.** B's punch-list:
> **V29/N2** hero-detail + all ordered lists show the EXPORT's catalog order, not web's live `CATALOG` order →
> coordinated N2 fix (Babysitter imposes a stable `CATALOG.sort(by id)` + regens + re-captures order-dependent refs;
> B re-syncs). **V28** rank glyph is a pixel sprite, not ★ — use a filled ★. **V30** stat chips = pills w/ bg, not
> plain text. **V31** add `Boosted by N · tap for details ›`. **V32** rebuild summary: subtitle + per-row play ▶ +
> score column + "Not played" line + Back button + padded cards. **V33** (Babysitter) re-capture summary-web in a
> best-times-seeded state. **V34** drill: restore `half of ↓` prompt cue + gold arrow + `– –` answer slot. **V35**
> drill: drop gold from How-to/Skip button frames (neutral) + bigger headline number. **V36** home coin-hoard denser.
> **V37** home tree directional arrows + branch connectors + corner-badge checks. **V38/V39** minor glyphs (nav
> icons, banner thumbnail, coin/calendar/subscript). **Babysitter owns V29(stable-sort+regen+recapture) + V33.**
>
> 🟢 **WAVE-2 SIGNED: summary + drill PASS.** 🔵 **FIRST-PASS SWEEP DONE (11 screens) → also SIGNED arena-cleared,
> event-play, settings, audio (6 total).** **WAVE 3 for B — the 5 SYSTEMIC fixes clear the most screens at once
> (PARITY-LEDGER V42–V46):** V42 ALL-CAPS letter-spaced headers/tabs (not title-case) · V43 secondary/**Back** buttons
> NEUTRAL grey not gold (gold = primary CTA only) · V44 MIXED type (proportional-bold for content NAMES, mono for
> numbers/chrome — V25 over-corrected to all-mono) · V45 inventory rows = bordered padded CARDS, bar on its own line ·
> V46 WRAP long labels (don't clip) + keep `· Brawn/Cunning/Arcane` suffixes. **Then per-screen:** V47 arena-prefight
> (ENEMY TEAM cards + region panel + top Journey btn + boxed "how battles work") · V48 arena-map (CTA overflow, foe
> scenery backdrop, ⚔ ASCII fallback, progress dots, `/10`) · V49 inventory-loot bottom carousel · V36/37/38 home ·
> V28 clean ★ no-collision · V30 chip pills · V31 "tap for details ›". **Babysitter is doing V29 (N2 fix).**
>
> 🩺 **ROOT CAUSE (waves 3–5) — B IS ITERATING BLIND. Two required changes (see REVIEW.md pm-5 + VISUAL-PARITY):**
> **(1) Run the agent-review gate in your OWN loop before pushing** — you're an agent; spawn a sub-agent with your
> render + the `…-web.png` + the VISUAL-PARITY rubric, and only declare a screen done on an agent-PASS. The render
> path is SHARED + re-renders fine; the misses are because you can't SEE the output (★ took 4 tries, hoard 3,
> pills still a no-op). Stop pushing blind. **(2) Implement the Babysitter's PIXEL specs** for V30 pill / V28 ★ /
> V36 hoard / V42 title size (geometry, not adjectives — in REVIEW.md pm-5). V42/V43/V50 are confirmed DONE.

**Builder B → phase 5 PARITY. The entire Arena + event-play LOGIC layer is DONE + APPROVED (brickmap `main`
`c6083f5`): combat re-sync to the redesign (`75051b8`, combat.rs spot-verified) · event-play core T233c (`8dc2077`,
gauntlets byte-exact incl. the ICU-collation catch) · hero-unlock port (`038d0ce`, vs the 18-state battery) · event
save grant (`c6083f5`). NOW: the two SCREENS — UNBLOCKED by the F1+F2 art export below.**
- ✅ **P0 results screen** (`161f5fe`) · ✅ **P0 build-SHA watermark** (`161f5fe`) · ✅ **P0a round-gold parity fix**
  (`9143b35` — live `accrue_round` over `Play::Solve/Skip`, proven vs the `roundGold` vectors) · ✅ **P1 immersive**
  (UI-thread `run_on_java_main_thread` + cutout; built-blind → owner device-confirms) · ✅ **P1 drill-downs**
  (every Collection row clickable; new Heroes/Events/Items screens, golden-gated).
- ✅ **phase 4 — AUDIO COMPLETE** (`9ada429`→`f838fa9`): SFX + music score (vector-proven vs 12 goldens) + renderer
  with GG1's real patches + cpal playback wiring, all approved. On-device feel + WAV A/B → `OWNER-EYEBALL.md`.
- ✅ **phase 5 polish — topic grid fits 46** (`80a696c`) + screen audit (only topic-select was broken). APPROVED.
- ✅ **DEADLOCK CLEARED — all 4 portrait/art generators exported (`main` `8397e8b` + `4e72bd7`).** The screens were
  blocked on portraits/backdrops; landed every one. **F1** (`art.json`/`art-vectors.json`): `iconRoleGrid` + resolved
  {body,accent,outline} LUT (via the new `iconPalette`) over all 12 hero portraits + one item per category (50).
  **F2**: `monsters.js buildGrid` role grids (0..4 incl. eyes) + typed palette over 15 tiers. **F3+F4**
  (`scenes.json`/`scenes-vectors.json`): `scenery.js buildGrid` 28×11 backdrops for all 10 regions (Arena `at-scene` +
  codex + home) + `eventart.js buildGrid` 24×16 banner crests for all 14 events (palette-packed, lossless). Gates:
  `test/art-parity.test.js` + `test/scene-parity.test.js` (drift + source fidelity + invariants + determinism round-trip).
  **B: port the four generators (read collectibles/monsters/scenery/eventart; prove vs the *-vectors.json), then every
  portrait, foe, backdrop and banner is available.** A parity-gap audit confirmed these were the LAST unexported generators.
- **▶ NOW: BUILD THE TWO SCREENS to the VISUAL-PARITY bar (logic + portraits both ready).** Web GG1 ships both;
  brickmap-v1 must too. All exports DONE + on `main` (combat/events/gold/hero-unlock/art):
  - **Arena (T233b-combat, `cdedb6c`)** — `content/gg1/combat.json` (120-tier ladder + per-tier enemy combatants
    [full f64] + loot + loot-boosts; the resolution recipe) + `combat-vectors.json` (heroCombatant, effectiveStats,
    the headline `teamBattle` {win,heroesAlive,foesAlive,rounds}, + one full turn-by-turn log). **Build the 3v3 Arena
    screen:** party-pick (≤3 owned heroes) → `teamBattle` (reproduce effectiveStats→heroCombatant→simulateTeams,
    prove vs the vectors) → on win grant `tier:n`+loot, `tierGold` payoff (gold.json), region-clear. Use the
    DATA ladder/enemyTeams as-is (don't re-derive FOE_BUDGET). Gate the screen on a golden, the sim on the vectors.
  - **Event-play (T233c, `06a5d9d`)** — `content/gg1/events.json` (14-event roster + questionMix + well/ace + the
    UTC-day schedule) + `events-vectors.json` (the deterministic `buildGauntlet` per event [reproduce mulberry32 —
    you already proved it for synth — + the total-order sort], the schedule sweep, reward tiers). **Build event-play:**
    today's live event → its gauntlet → drill → `eventTiersEarned` (participation/well≥0.7/ace=flawless) into the
    save; no gold (the reward IS the buff). Surface "today's event" entry + countdown.
  Flag anything underspecified rather than guessing. **Build these NEW screens to the VISUAL-PARITY bar from the
  start** (hero/foe portraits, type colours, ratings — see below), not plain-then-redo. Device/by-ear → `OWNER-EYEBALL.md`.
- **▶ NEW WORKSTREAM: VISUAL PARITY (owner-requested 2026-06-24) — see `VISUAL-PARITY.md`.** The data parity is good;
  the screens are visually bare vs web GG1 (Heroes is the worked example: web has type section headers, pixel
  portraits, type colours, `★rating`, effective-stat chips, `Boosted by N · tap for details ›` + a hero-detail
  screen — the port shows a flat text list, and shows BASE stats where web shows EFFECTIVE = a real bug). ✅ **FOUNDATION
  DONE: the procedural icon/foe generators are exported (F1+F2, `main` `8397e8b` — `art.json`/`art-vectors.json`),
  unblocking portraits on every screen.** Then B: Heroes visual pass (per the spec) → Items → Collection → Events → Results.
  **THE LOOP (owner's idea):
  render your screen headlessly → compare against the committed web reference `content/gg1/visual-ref/<screen>-web.png`
  → iterate until it reads like it → golden it. THEN commit your render to halves as
  `content/gg1/visual-ref/<screen>-brickmap.png`** (you have write access; overwrite same filename; render at the
  430×880 aspect) **so the Babysitter can fetch both + review the side-by-side.** Perceptual compare (two renderers,
  not a pixel diff). Build the NEW Arena/event-play screens against `arena-web.png` from the start. *(Parity, not polish.)*
- ⚠️ **ARENA COMBAT REDESIGN landed (`main` `b49e62b`, supersedes the `11ef041` rebalance) — RE-SYNC before/with the Arena screen.** First the owner found the arena far too easy (1 topic cleared ~57/120 → rebalanced to ~9); then we reworked the whole combat model so all 4 stats matter and removed the dead 1v1 path. **The combatant shape, stat roles, constants, and the export schema ALL changed — see the 🔧 COMBAT MODEL REDESIGNED block at the top of this file for the full new spec.** Re-sync `content/gg1/combat.json` + `combat-vectors.json` into brickmap, update `combat.rs` to the new `{pow,grd,spd,foc,hp}` sim, re-run (on the OLD data/model you'd ship the OLD arena). Analysis/retune tool: `tools/analyze-arena.js`.
- ✅ **Hero-unlock export = Babysitter take-over DONE (`main` `b164fde`).** heroes' `unlock` is now a serialisable spec on `combat.json` `heroes[].unlock` + an 18-state `heroUnlock` parity battery — the Arena roster fields only UNLOCKED heroes (drop the 'all 12 interim'). Spec kinds + porting note: see the 🔧 block at the top.
**Export status — Babysitter-owned: ALL DONE, no open [A] export gaps (audit-confirmed 2026-06-25).** ✅
content/transforms · ✅ earning · ✅ gold · ✅ combat (redesigned `b164fde`) · ✅ events (T233c) · ✅ hero-unlock
(`b164fde`) · ✅ F1+F2 art icons+foes (`8397e8b`) · ✅ F3+F4 scenes backdrops+banners (`4e72bd7`). Progression/
milestone logic is already ported by B with thresholds in structured data (no prose seam). **The remaining port work
is purely B BUILDING the Arena + event-play screens** (logic proven, all art exported). If a NEW screen surfaces a
missing datum, flag it and the Babysitter exports it on the spot. APK feel + audio-by-ear + device-confirm → `OWNER-EYEBALL.md`.
*(Prior B: `T103`/`T211`/`T207` APPROVED, live `951e532`.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm (live `951e532`):** perf on-device plan **DEFERRED by owner** (not now) — parked as a pre-launch check / covered by the 12-tester window; resurface only if a tester reports jank. Title position + void font → feeding T216. Earlier ✅: lofi, icon/
splash, coin shine, hoard home-only, install identity, app-switch backdrop, 1k pile, Collector (15), "i" fix.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
