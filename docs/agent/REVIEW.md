# Review (Babysitter-owned) — Builder reads, does not edit

**Current verdict:** `APPROVED — T224 (audio) + T219 topics (batches 4–7, ALL ~10)` · `⚠ T219 Collector-ladder
rebalance OUTSTANDING (the last T219 step)` — live `d1f2e27`; **63/63 + `node -c` clean** (verified @ worktree, in
`gg1/dev/`). A pushed a big run; verified independently:
- **🟢 `T224` (`0dc3067`) — APPROVED, exactly per spec.** Tempo slider REMOVED + `synthTempoMult()→1`; both volumes on
  ONE `0–11` scale (`fmtLevel`→"N / 11", no `×`); fresh default **6 = midpoint** → `musicGain 0.20×6/11 = 0.109`
  (≈0.10×) and `sfxGain 1.0×6/11 = 0.545` (≈0.50×) = the screenshot levels; `11`≈2× the midpoint, `0`=silent;
  per-level keys + migration. Matches the owner's screenshot.
- **🟢 `T219` topics — batch 4 `959b5fa` (×-tricks, Negatives-P1), batch 5 `8d019ef` (NEW Geometry: Area&Perimeter,
  Volume, Angles), batch 6 `7ffe23e` (Median·Mode·Range, Speed·Distance·Time), batch 7 `d1f2e27`
  (Factors&Multiples/prime-factorisation) — APPROVED.** Enumerated all 8 pools (21 each), **every answer recomputed
  by hand** — all correct, unambiguous, numpad-safe. **`negatives` is correctly P1-safe** (prompts show negative
  intermediates like `−5+17`, `6−11+9`; every ANSWER ≥ 0). `mmr` medians use odd-count sets (clean middle, no
  fractions); `sdt` all clean integers; `area` covers rectangles + `△` triangles; `angles` line/point/triangle. All 8
  have guide + `explain()` (coverage 15/15). Batch 4 also hardened **arena monotonicity** — arena tests green.
- **⚠ `T219` Collector-ladder REBALANCE — NOT DONE (route back to A — the final T219 step before T219 closes).** The
  catalogue is now **2310 items** (Rank 23 · Initiation 46 · Flawless 46 · Speed 184 · Mastery 46 · Solved 959 ·
  Spark 959 · Milestone 32 · Collector 15), but the Collector ladder still tops at **1900** ("Keeper of the Myriad" =
  "the full collection"). So the top award unlocks ~410 items early. **A: re-space the 12 count-rungs so the top ≈ the
  full collection (~2300); keep 15 awards (12 rungs + 3 emblems); migration-safe** (don't strand earned rungs). Per
  BACKLOG T219 DoD.

**🟢 `T218` (`e61d3b0`) — APPROVED.** Nav notification badges: reusable new-since-seen tracker, monotonic per-surface
tallies (collectibles/hero-unlocks only grow), **seen-marker seeded on first sight → no false badges for pre-existing
collections**, persisted (`halves.navSeen`, scope-shadowed), clears on view, wired Items (`#invBtn`) + Heroes
(`#heroesBtn`) via `renderNavBadges` from `applyGates`. New `test/nav-badges.test.js` (28 checks) + suite **64/64**;
`node -c` clean; both ids exist. DoD met. **→ A's build queue is CLEAR. Only `T225` (final quality gate, Babysitter-run)
remains before v1. B: STAND BY.**

**🟢 `T219` capstone (`0b01bce`) — ACCEPTED.** A acted on my (mistaken) flag and moved the capstone `2350→2300` + added
a guard. My flag was wrong (2350 was reachable), but **2300 is ALSO valid** (≤ 2352 total, within the test's band) and
the guard is a net positive — so accepted, not reverted (no churn). T219 fully closed. **64/64.**

**🟢 `T225` — DONE, the final gate is CLEAN. ✅ GG1 v1 SIGNED OFF (Babysitter, owner-delegated), commit `525ba87`.**
Ran 3 fan-out assessors (questions 1–23, questions 24–46, all text) over **46 topics / 959 questions** + every guide/
explain/tag, then double-checked every finding myself:
- **Questions: ZERO issues.** All 959 answers independently recomputed correct, all numpad-safe (no negative/
  non-terminating/ambiguous answers; negatives topic shows negative operands but answers ≥0). Only minor LOW
  notation-key polish suggestions (ratioshare `→bigger`, angles `point`, factors `biggest prime`) — non-blocking.
- **Text: 2 issues found → both FIXED (Babysitter take-over, `525ba87`, owner-authorised):** 🔴 `cubes` guide tip
  `"4³ = 4 × 4 = 16…"` falsely chained `4³ = 16` → `"for 4³, do 4 × 4 = 16, then × 4 = 64"`; 🟠 `area` perimeter tip
  `"6 × 4 → 2 × 10 = 20"` (reads as 24) → `"A 6 by 4 rectangle → …"`. Re-verified: 64/64 + `node -c` clean; text pass
  now clean.
- **🔴 `T223` TAG/RELEASE — BLOCKED, needs the OWNER.** I cannot create the tag: `git push origin gg1-v1` → **HTTP
  403** (I have branch-push, NOT tag-push access), and the GitHub MCP has **no create-tag/create-release** tool (read
  only). **Owner must cut `gg1-v1` at `525ba87`** (GitHub UI → Releases → Draft → tag `gg1-v1`, target `525ba87`; or
  `git tag -a gg1-v1 525ba87 && git push origin gg1-v1` from an authed env). The v1 SIGN-OFF + the commit are
  recorded; the tag is the only outstanding piece and it's the owner's to push.
- **Deploy follow-ups (not v1-blocking; Play not live yet):** promote `gg1/dev → gg1/prod` to the v1 build; populate
  the frozen `gg1/v1/` snapshot. → [A]/next.
- **→ Next: GG2 P0** (`GG2-MILESTONES.md` → `GG2-P0-EXTRACTION.md` + `GG2-P0-INPUT.md`).

> **CORRECTION ×2 — `T219` Collector rebalance is CORRECT; `🟢 APPROVED`; T219 DONE.** Two of MY errors, both now
> resolved: (a) the verdict above reviewed `d1f2e27` (one commit STALE) and said the rebalance was missing — it was
> actually pushed in **`c5151e5`** (capstone `1900→2350`); (b) I then flagged the capstone `2350` as UNREACHABLE vs a
> "2310" total — **but that count OMITTED `events.js`**. Recomputed the way `collector.test.js` does (modes + events +
> collectibles): **real total = 2352**, capstone **2350 ≤ 2352 → REACHABLE (gap 2)**, and the test already has a
> `top <= total && top >= total-60` reachability guard that PASSES (26/26 collector checks; 63/63 suite). So A's
> rebalance is right, migration-safe, with a regression guard. **No take-over needed. T219 = DONE (all topics +
> capstone). → A: T218 next.** *(Lesson logged: verify catalogue counts via the test's full load — modes+events+
> collectibles — before flagging reachability.)*

---

**Prior:** `APPROVED — T222 (franchise restructure)` — live `16c441a`; **59/59 tests + `node -c` clean**
(verified at a detached worktree). Built out of order (A jumped to T222 before the queued T221-fix/T224 — NEXT.md had
a stale contradictory block, now rewritten to one clean ordered queue; **A's current task is `T221` readability**).
- **🟢 `T222` (`9ea9046`+`16c441a`) — APPROVED.** Multi-app GHP restructure per `FRANCHISE-HOSTING.md`. Verified:
  layout `gg1/dev` (app, git-mv history preserved) + `gg1/prod` (lean, no test/scripts — TWA target) + `gg2/dev`
  placeholder + root **franchise landing** (`index.html` reads `apps.json` → each app's `manifest.webmanifest` for
  name/icon; unregisters the legacy root SW). **Storage isolated** per scope (`SCOPE`-derived prefix; transparent
  `halves.*`→`<scope>.*` shadow; root→`halves` unchanged = byte-identical legacy; one-time **prod** migration from the
  legacy save; **dev = clean room**; clear-data sweeps by prefix). **No cross-game gold** (per-game). **SW cache
  scoped** (`<scope>-static-v4`; `activate` evicts only `SCOPE-*` — no cross-app wipe; handles `gg1/v1` too). CI:
  test gates run from `gg1/dev/test/`, build.json stamped per app, cache-bust per app; new `franchise-landing.test.js`
  gate; **59/59**. **NEW DEV URL: `https://00-1.github.io/halves/gg1/dev/`** (root = the landing now). `gg1/v1/` waits
  for the tag (T223).
- **🔴 `T221` still CHANGES (do now):** void line unreadable → ~2× height (see prior verdict + BACKLOG T221).
- **`T224` (audio) still pending.** Both T221+T224 are owner-facing and were queued BEFORE T222 — A skipped them; they
  are next (T221 first).

---

**Prior:** `APPROVED — T219 batch 2 + batch 3` · `🔴 CHANGES — T221 (void line UNREADABLE)` — live
`e523996`; **58/58 tests + `node -c` clean** (verified at a detached worktree).

- **🟢 `T219` batch 2 (`5b50266`) + batch 3 (`e523996`) — APPROVED.** Four new topics, all in the chain:
  **`pctup`** (Percent Increase), **`fdp`** (F·D·P conversions), **`bodmas`** (Order of Operations), **`algebra`**
  (Function Machines). Enumerated all four pools (21 each); **every answer recomputed** — pctup (`40+15%=46`,
  `80+25%=100`), fdp (`4/5=80%`, `0.07=7%`, all clean terminating decimals), bodmas (precedence + brackets + the
  `2×3+4×5=26` two-product case), algebra (every machine output positive, no negative intermediate) — **all correct,
  unambiguous, numpad-safe.** All four have a **full guide + tailored `explain()`** (guides-coverage test passes,
  15/15); guide content verified correct (bodmas teaches `3+4×2=11 NOT 7×2`; algebra warns "left-to-right, **not**
  BODMAS" — the exact trap). Tests 58/58. **T219 progress:** ✅ Roman, Primes, Percent-Increase, F·D·P, BODMAS,
  Function-Machines (+ Roots via cubes). **Remaining:** ×-tricks, Negatives-P1; Area&Perimeter, Volume, Angles,
  Speed-Distance-Time, Median/Mode/Range, Prime-factorisation; then the Collector rebalance LAST.
- **🔴 `T221` (`e879629`) — CHANGES (failed owner device-confirm).** The wide letter-spacing + Star-Wars skew made
  "THE VOID THRONE" **unreadable** — it collapsed into a splayed fan of purple streaks (owner screenshot). Cause: the
  perspective ramp crushes the TOP rows to `0.6×` width (`rs = 0.6 + 0.4·depth`) while the glyphs are only `PXY=3`
  tall — too little vertical resolution to survive the skew. **Owner fix: ~2× the void-line HEIGHT (more stretch)**
  so the letters have the resolution to read. → **back to A (see BACKLOG T221 reopened).**

---

**Prior:** `APPROVED — T213 (content loop CONVERGED) · T220 · T219 batch 1` — live `efb1abf`; **56/56
tests + `node -c` clean** (independently verified at a detached worktree). Three things landed together:

- **🟢 `T213` — DONE (the content quality loop has CONVERGED).** Every round-1 + round-2 item is resolved and
  verified by re-enumerating the affected pools:
  - **`digitsum` HIGH bug FIXED** (both the guide tip AND `explain()`): now "…keep adding to a single digit — that's
    the remainder; **but if you reach 9 the number divides exactly, so the remainder is 0.**" ✓ (the ×9 live Qs
    `567/7263/999 ÷ 9 = 0` are now taught correctly.)
  - **`partwhole` guide** generalised: "50% → ×2, 25% → ×4, 20% → ×5, 10% → ×10." ✓ (was 10%-only.)
  - **`sequences` nth-term SPLIT** into a locked Part-2 **`sequences2`** ("Evaluate the nth-term rule", gated) — base
    `sequences` is now next-term-only; verified no nth-term leaks into P1. nth-term answers recomputed (`6n−2 t7=40`,
    `5n+1 t8=41` …) all correct. ✓
  - **`fractions` eighths/16ths SPLIT** into locked Part-2 **`fractions2`** (incl. `1/16=0.0625`); base `fractions`
    has no /8 or /16 left. ✓
  - **`rounding` 560-tie REMOVED** → `638→600` (non-tie). ✓  **`cubes`→"Cubes & Roots"**: +√/∛ (√225=15, ∛1000=10,
    ∛64=4 …), pool 9→24, all recomputed correct. ✓
  - **De-dup:** `placevalue` `3.5×100` dropped from P1 (kept in P2). ✓
  - **Regression GATE added** (`test/question-integrity.test.js`): asserts (a) every answer non-negative + terminating
    + numpad-clean, (b) no identical prompt with two differing answers, (c) no duplicate slot within a topic. Passes.
    ✓ — this locks the question bank against future regressions.
- **🟢 `T220` — DONE (pending owner device-confirm).** Void line now uses **taller-than-wide cells** (`PXX=2,
  PXY=3`; gold stays `2×2` square) → "THE VOID THRONE" is vertically stretched; the glitch flickers **faster + more
  random** (`~35–105ms`/frame ≈ 9–28fps jittery, was fixed ~11fps) with a **~20% whole-line dropout** (full
  `clearRect` → cuts fully OFF) and shorter idle gaps (1.6–4.2s). Reduced-motion → whole block skipped (static). Gold
  line unchanged.
- **🟢 `T219` batch 1 — APPROVED (T219 continues).** `roman` + `primes` (group Number, chained: roman `requires
  mastery:rounding`, primes `requires mastery:digitsum`). Enumerated both pools (21 each), **every answer recomputed
  by hand** — Roman (`CMXC=990`, `MCMLXXXIV=1984`, `CD=400` …) and Primes ("next prime > N": `50→53`, `24→29`,
  `48→53` …) all correct, unambiguous, numpad-safe. **Both have a full guide + tailored `explain()`** (the T213 bar).
  Built as single gated topics (not P1/P2 sub-modes) — accepted: pools are curated + chained deep, and splitting all
  15 would balloon the menu to ~30 modes. **NB: `Roots` is already delivered** (folded into `cubes`→"Cubes & Roots"
  in T213) — strike it from the remaining T219 list.

**→ A: CONTINUE `T219` in batches by group** (push each batch on its own for re-assessment). Remaining: Part-1
BODMAS, ×-tricks, Negatives-P1, Algebra/function-machines; Part-2 Area&Perimeter, Volume, Angles (new Geometry
group), Speed-Distance-Time, Median/Mode/Range, F↔D↔P, Percentage-increase, Prime-factorisation/factors&multiples;
then the Collector-ladder rebalance LAST. **B: STAND BY.**

---

**Prior verdict:** `T213 Phase 2a + 2b-1 APPROVED` (1e6ab1f, 5eac801; 54/54 + node -c green) **+ Phase-3 round 2
re-assessed:** calibration clean (bonds2/metric/mean verified), 9/11 new guides solid; **2 fixes back to A — 🔴
`digitsum` guide HIGH bug (remainder-by-digital-root gives 9 not 0 for ×9; live Qs hit it) + `partwhole` LOW**.
A continues the T213 loop. *(See QUESTION-QUALITY-AUDIT.md round 2.)* Prior: `T217 [A]` (void line ALL CAPS + intermittent bursting interference; live `cc1f202`, 53/53 green). Prior: `T216 [A]` (entry: title repositioned off the top + Void Throne in a distinct
JetBrains-Mono face with animated glitch). Live build **`2f55fad`**; suite **53/53** + `node -c` green.
- **`T216`** (`2f55fad`, [A]) — `#entry` padding-top `clamp(40px,11vh,120px)` (title no longer pinned to the top,
  actions still bottom); the void line uses a **distinct self-hosted JetBrains-Mono** face; the corruption
  **animates** (`cseed` re-rolls ~7 fps, reduced-motion off). Owner: good → tweaks → **`T217`** (ALL CAPS +
  **intermittent** glitch bursts, not continual).
**Verified:** worktree at `2f55fad`; `node -c` clean; **53/53** green. **→ A: → `T217` (void ALL-CAPS + intermittent
interference) → then `T213` Phase 2 (content quality, high-priority, batched + my re-assess loop). B: STAND BY.**

> **Prior verdict:** `APPROVED — T214 [A] · T103 [B]` (title polish #3 + perf pass). Live build **`951e532`**.
- **`T214`** (`951e532`, [A]) — tighter title↔subtitle, transparency-dithered void corruption, **action block moved
  to the bottom** (`margin-top:auto`). Owner: actions "moved nicely" but the **title jumped to the top** + wants
  the **void font different + animated** → **`T216`**.
- **`T103`** (`c14a876`, [B]) — perf pass DONE: hot-path table from live `fxgl`; **fixed** the over-budget
  coin-shower (was re-rasterising the static pile ~16–22k `fillRect`/frame → now a **cached offscreen pile** +
  **60 Hz overlay cap** + cache freed when idle); audited `_pileGlint` (already coin-only + ~5 Hz → within budget,
  kept); reduced-motion gates + context/listener count verified; **`docs/PERF-RESEARCH-2.md`** with an **owner
  on-device measurement plan**. Solid. *(Owner: run the on-device plan on your lowest-end phone.)*
**Verified:** worktree at `951e532`; `node -c` clean; **53/53** green. **→ A: → `T216` (reposition the title +
new/animated void font). B: STAND BY** (perf on-device plan pending owner; `T213` Phase-2 content fixes queued for
A). Owner device-confirm: perf (the on-device plan), and the title position/void (feeding T216).

> **Prior verdict:** `APPROVED — T212 [A]` (title polish #2). Live build **`ce69b69`**; **53/53** + `node -c` green.
green. Owner: "good" → more title tweaks → **`T214`** (tighter title↔subtitle gap; further-corrupted void with
**transparency dithering**). **→ A: → `T214` (title polish #3). B: → `T103` (perf pass, in progress).**

> **Prior verdict:** `APPROVED — T210 [A] · T211 [B]` (title 3× + lighter void; hoard overlay now home-only). Live
build **`b8ad4c9`**; suite **53/53** + `node -c` green.
- **`T210`** (`c6e9f68`, [A]) — titles 3× bigger, Void Throne lightened, void glint dropped (gold glint kept).
  Owner: "looks good" → more polish → **`T212`** (the "i" reads as "l"; corrupt/distinct void font; tighter spacing;
  0.9×).
- **`T211`** (`b8ad4c9`, [B]) — the hoard overlay now **owns its visibility**: `visibility:hidden` + clear on
  `stop()`, reveal on `start()` → the gold pile is **home-only**, not behind every screen. *(owner device-confirm.)*
**Verified:** worktree at `b8ad4c9`; `node -c` clean; **53/53** green. **→ A: → `T212` (title polish #2). B: → `T103` (low-end-Android PERF pass — owner-mandated, not optional). Owner device-confirm: hoard home-only (T211).

> **Prior verdict:** `APPROVED — T205 [B] · T206 [A] · T207 [B] · T208 [A] · T209 [A]` (emblems→Collector rejig(15),
coin shine, entry fixes, stylised title). Live build **`632804d`**; suite **53/53** + `node -c` green.
`node -c` green. Both builders cleared their queues. **Owner: title "looks good" → tweaks filed as `T210`.**
- **`T205`** (`26e45a4`, [B]) — `emblems.js` IDS = `[beast, goblinking, voidbeast]` (6 abstract scrapped); creatures
  re-fit to fill the cell.
- **`T206`** (`4c7426c`, [A]) — Collector ladder recalibrated: top tiers 2,500–10,000 → **1,600/1,700/1,800/1,900**
  (final ≈ catalogue) + the **3 creatures absorbed** (earned by felling bosses, tier 12/48/120) = **15 total**;
  Codex Emblems section removed; `collector:25/75/150` kept migration-safe.
- **`T207`** (`2300ac6`, [B]) — coin shine: shower glints + throttled pile sparkles + clearer rotation. *(owner
  device-confirm.)*
- **`T208`** (`034a6c5`, [A]) — static `.mark` emptied (no x/2 flash, height reserved) + `.subtitle` "The Void
  Throne" added; maths tag stays.
- **`T209`** (`632804d`, [A]) — `paintPixelTitle`: pixel-gold "Goblin Gold" (gold ramp + Bayer-4 dither) + dithered
  void "The Void Throne", each with a throttled glint sweep. **Owner refinements → `T210`** (3× bigger, lighten the
  void, drop the void's sparkle).
**Verified:** worktree at `632804d`; `node -c` clean; **53/53** green. **→ A: → `T210` (title refinements). B: → `T211` 🔴 (gold hoard shows behind every screen — overlay doesn't hide with the backdrop). Owner device-confirm: coin shine (pile sparkles + shower glints),
the 15-award Collector tab, and the title (feeding T210).

> **Prior verdict:** `APPROVED — T201 [A] · T202 [A] · T198 [A] · T204 [B]` (cache fix, Magnar splash, fill curve,
backdrop self-heal). Live build **`b4eead7`**.
+ `node -c` green. **Builder A is healthy — it cleared T201/T202/T198 in two pushes (not stuck).**
- **`T201`** (`52a9684`, [A]) — `sw.js`: `CACHE` v3→**v4**, `FRESH_RE = /(manifest\.webmanifest|icon\.svg|icon-\d+\.png)$/`
  served **network-first** (cached only as offline fallback) → the install name+icon unfreeze and propagate on the
  next visit. Exactly the fix.
- **`T202`** (`9fb4df1`, [A]) — `renderBrand()` paints **Magnar** (`C.iconColorGrid("hero:mo", HERO_PAL.Brawn)`) on
  the entry `.mark`; halves glyph kept only as a fallback. Splash now matches the icon.
- **`T198`** (`9fb4df1`, [A]) — floor-offset curve `GOLD_EMPTY=500, GOLD_FULL=1e15` → **1k ≈ 2.45%** (the owner's
  "tenth" of the old ~25%), 1M≈27%, 1Bn≈51%, 1T≈76%. Visual only.
- **`T204`** (`b4eead7`, [B]) — fxgl handles `webglcontextlost` (`preventDefault` → clear to dark) +
  `webglcontextrestored` (re-init+redraw) + a `visibilitychange` redraw (covers WebGPU device-loss, which has no
  restore event); listeners cleaned up on dispose. The app-switch light-grey backdrop is fixed.
**Verified:** worktree at `b4eead7`; `node -c` clean; **53/53** green; deploy = success. **→ A: → `T206` (Collector
awards rejig — 15 total, recalibrate to ~1,900, absorb the 3 creatures). B: → `T205` (trim emblems to the 3
creatures + fix cropping).** Owner device-confirm: install identity (revisit → Install shows Goblin Gold + Magnar),
the splash Magnar, the gentler 1k pile, and the app-switch backdrop.

> **Prior verdict:** `APPROVED — T203 [B]` (coin shower bigger + rain down). Live build **`90db0f6`**.
**🔴 NEW BUG filed: `T204` — purple backdrop lost on PWA app-switch (WebGL context loss, no restore).**
- **`T203`** (`90db0f6`, [B]) — coins `sizeRange 7–15` (~+20%), `vy` suppressed ×0.3 + gentle pop, `p.grav =
  BURST_GRAVITY×1.9` (coin-only, NOT the global shader uniform — celebrations unchanged); coins render on the 2D
  overlay so `p.grav` applies on every backend. Clean.
- **🔴 `T204`** (owner, live `90db0f6`) — backgrounding the PWA loses the dark backdrop → **light-grey** home. Root
  cause: WebGL **context loss** + **no `webglcontextlost/restored` handling** in `fxgl`, and `visibilitychange` only
  manages audio (no backdrop redraw). Light-grey tell = a lost canvas presents ~white × `opacity:.85` over `#0E1116`.
  Fix [B]: handle context lost/restored (clear→dark on loss, re-init+redraw on restore) + re-render on
  foreground/visibility; degrade to dark bg never white.
**Verified:** worktree at `90db0f6`; `node -c` clean; **53/53** green. **→ A: → `T201` 🔴 (stale manifest/icon
cache) → `T202` (entry mark = Magnar) → `T198` (fill curve — owner sharpened: 1k ≈ a tenth, ~2.5%). B: → `T204` 🔴
(backdrop self-heal) → `T205` trim emblems. A also → `T206` collector-awards rejig (15 total, recalibrate to ~1900, absorb the 3 creatures).** A has not pushed yet (still on T201).

> **Prior verdict:** `APPROVED — T193 [B] (re-open fix) · T197 [B] · T199 [B] · T200 [B]` (the coin shower bug fixed
+ coins dithered + pile reaches the top + coins coloured by height). Live build **`b498216`**.
`node -c` green. **Owner confirms the pile + shower "look pretty good now."**
- **`T193`** (`77a1b87` fix, [B]) — RE-OPEN RESOLVED: `seedBurst`/`seedCelebrate` now tag `look:"coin"` → `look:1`
  + spin fields, so the money-gain shower renders real spinning cylinder coins (was squares). Owner-confirmed coins
  show now. *(The gate that was missing is in.)*
- **`T197`** (`2c696e4`, [B]) — the cylinder coins now get the brickmap pixelate+dither too (matched the pile).
- **`T199`** (`c9bab5d`, [B]) — a maxed pile reaches the top of the screen.
- **`T200`** (`b498216`, [B]) — coin colour by height (dark low → light high, mixed at each level).
**Verified:** worktree at `b498216`; `node -c` clean; **53/53** suite green. *Visuals owner-confirmed.* **→ A: →
`T201` 🔴 (stale manifest/icon cache) → `T202` (entry mark = Magnar) → `T198` (fill curve). B: → `T203` (coin
shower polish — slightly bigger + more gravity/rain-down).** Owner device-confirm pending: the Magnar install
identity (after T201).

> **Prior verdict:** `APPROVED — T192 [B] · T195 [B] · T196 [B] · T194 [A]` (the hoard pile look + Magnar icon).
- **`T194`** (`2a186dd`, [A]) — **app icon = Magnar** (`ICON_HERO="hero:mo"`, brand bg `#1a102e`, 0.80 safe zone);
  committed **`icon-512.png`/`icon-192.png`** + `manifest.webmanifest` wired + `installFavicon` renders Magnar.
- **`T195`** (`8d26c22`, [B]) — hoard **brickmap halftone-dither**: a real `bayer4()` 4×4 ordered matrix, luminance
  quantise + Bayer offset, posterised palette — replaces the smooth gradient. *(Owner: filtered the SHAPE but not
  the COINS → `T197`.)*
- **`T196`** (`751cbe7`, [B]) — **stable accumulation**: each coin placed by a level-independent **fill-rank**, so
  raising wealth only *appends* higher coins (existing never move); ~480 fine steps, the 8-tier re-seed removed.
- **⚠️ `T193`** (`b58458b`, [B]) — **RE-OPENED (CHANGES REQUESTED).** I approved on the renderer being present, but
  it never fires: the money-gain shower uses `burst()`→**`seedBurst`, which never sets `look:1`** from `opts.look`,
  so coins render as **squares** (owner: "still no coins, unchanged" on PWA — NOT a cache issue). `drawCoinParticle`
  is correct but receives no coin-tagged particles. Fix: `seedBurst` honors `opts.look==="coin"` → `look:1` (+ spin
  fields) + a gate. *(My miss — verified code-presence, not the seeding path.)*
**Verified:** worktree at `751cbe7`; `node -c` clean; **53/53** suite green *(the suite did NOT catch T193 — no test
asserts a `look:"coin"` ballistic burst tags coin particles; that gate is part of the re-open).* *Visual/icon
confirmation is the owner's.* **→ A: → `T201` 🔴 (stale manifest/icon cache → install shows old Halves name + x/2 icon; SW serves them cache-first under bare URLs) → `T198` (fill-curve too fast). B: → `T193` 🔴 (re-open: coins
still squares) → `T197` (dither the coins) → `T199` (full pile reaches the top) → `T200` (coin colour by height).**
Owner device-confirm: the Magnar icon (reinstall PWA), and force-refresh the PWA for any hoard re-test.

> **Prior verdict:** `APPROVED — T185 [B] · T190 [B] · T191 [B] · T188 [B] · T189 [A]` (the hoard renders on the
device, calmer/clean audio, creature icon art, fixed Back button). Live build **`ee118d3`** (all deployed); full
suite **52/52** + `node -c` green.
- **`T185`** (`709c75f`, [B]) — **the gold pile now draws on the owner's device.** Root cause was real: the hoard
  rendered **only on `CPUBackend`**; the fix factors `drawHoard` out and the Controller composites it on a
  **`pointer-events:none` 2D overlay canvas** inserted just above the backdrop (same z, **below the UI**) and
  redrawn on `setData`/resize — so WebGL2/WebGPU devices get the pile **over the purple backdrop, behind the
  buttons** (exactly the owner's spec). CPU still draws inline. `golden-fx` extended, green. *(Owner device-confirm
  the mound is now visible.)*
- **`T190`** (`91596dd`, [B]) — lofi implements `research-study-music.md`: **`dorian`→`mixolydian`** (major-family,
  the cortisol/"dark" lever), progression **`[0,5,3,4]`→`[0,5,3,0]`** (resolves **home**, kills the looping
  tension), soft **`croon`** lead (triangle, gain 0.22) replacing the `pluck` ping; ~78 BPM kept. Golden-synth +
  distinctness green. *(Owner device-confirm it's warm/calm now.)*
- **`T191`** (`495f954`, [B]) — declick: a tiny **linear ramp to TRUE zero** (exp ramps can't reach 0) before each
  voice tears down → no end-of-note pop; + a **6 dB soft limiter knee** (was a hard 0-knee brickwall that clipped
  dense-style transient peaks → crackle). T175 reverb safety intact. `synth` green. *(Owner device-confirm.)*
- **`T188`** (`ee118d3`, [B]) — **3 character-forward CREATURE candidates** in the bestiary style (`beast` horned
  brute, `goblinking` crowned bust, `voidbeast` smooth 3-eyed cosmic head) via a shared `creature()` helper;
  existing 6 kept (9 total). Maskable. `emblems` test covers the new ids, green. *(Owner reviews in Codex ▸ Emblems
  + picks the launcher icon.)*
- **`T189`** (`02cd993`, [A]) — **Back is fixed bottom-left on every subscreen:** all 10 back buttons get
  `.back-btn`; `.screen .res-actions{margin-top:auto;flex:0 0 auto;…}` pins the row to the bottom (`.screen` is a
  flex column — confirmed), `.back-btn{order:-1;margin-right:auto}` floats Back to the left regardless of DOM order
  (Arena's Fight goes right). `back-nav` green.
**Verified:** worktree at `ee118d3`; `node -c` clean on every changed `.js`; **52/52** suite (golden-fx/synth/
emblems/back-nav incl.) green; deploy confirmed (pages.yml `ee118d3` = success). *Browser/audio/visual confirmation
is the owner's (harness is OOM-flaky) — all four owner-reported items are code-correct + gated; flagged for device
confirm.* **`T192`** (`61efcc6`, [B]) APPROVED — cylinder coins (flat top-face + darker flat edge band, no outline, `aspect`/
`rot` spin) + a taller (`HOARD_MAX_H` 0.34→0.82) fuller (`HOARD_CAP`→480) wall-banked `moundProfile`; gates green;
owner "looks a bit better" → refinement filed **T195** (the pile uses a smooth analog gradient while the rest of
the scene is ordered-Bayer dithered — bring it into the dithered/pixelated look + many fine gradation steps).
**→ A: → `T194` (app ICON = Magnar/hero `mo`). B: → `T195` (pile FILTER — brickmap halftone-dither, SHADING only) +
`T196` (pile rises GRADUALLY — ~100 height levels not 8, via stable accumulation) → `T193` (gain-burst cylinder
coins). Owner split T195/T196 apart: filter ≠ height-gradation. Earlier B note: `T192` (hoard look overhaul:
cell-shaded cylinder coins + taller wall-banked pile) → `T193` (the same spinning cylinder coins in the gain
burst). Owner saw the now-visible hoard (T185 ✓) and gave art direction via screenshot.**

> **Prior verdict:** `APPROVED — T187 [A]` (Codex items now open a detail popup). Live build **`39459e7`**
(deployed); full suite **52/52** + `node -c` green.
- **`T187`** (`39459e7`, [A]) — tapping any Codex cell opens a detail popup reusing the `#unlockModal` chrome:
  `codexCell` now carries `data-cname`/`data-sub` (+ the existing `data-codex`/`n`/`type`/`region`/`seed`/`emblem`),
  `drawCodexInto` re-draws the **enlarged art** off the dataset (grid AND detail), the click handler routes
  `.codex-cell` → `openCodexDetail` (owned → name + category/where-found; locked → "???" tease). `codex` test green.
- **Owner field reports on `39459e7` (NOT regressions — expected):** (1) *"no gold piles"* — **T185 still open**
  (B's do-first; root-caused: only the CPU backend draws the hoard, WebGL2/WebGPU don't). (2) *"nothing new in
  codex"* — correct: `39459e7`'s Codex change is the **clickable popup** (an interaction, tap a cell), **not new
  art**; the new beasts/heroes icon candidates are **T188**, still queued for B. (3) lofi *"still dark/stressful"*
  → filed **T190** (T183 left the mode minor — needs a bright/major mode + home-resolving progression).
**Verified:** worktree at `39459e7`; `node -c` clean; **52/52** suite + codex gate green; deploy confirmed.
**→ A: `T189` (fixed Back-button location — owner-reported) → then HOLD for the icon pick.  → B: `T185` 🔴 (pile
not drawing) → `T190` (calm the lofi — IMPLEMENT `research-study-music.md`) → `T191` (declick the crackle/pop) →
`T188` (beasts/heroes icon candidates).**
**Babysitter research pass:** owner rejected "blind/deaf nudges" on the lofi → I ran a cited research pass and
wrote **`docs/agent/research-study-music.md`** (tempo/mode/consonance/predictability/timbre for low-stress drills);
T190 now = *implement the findings* (headline: it's still **`dorian`/minor** = the "dark"; go major + resolve home
+ soft low-passed lead). New crackle/pop report → **T191** (declick envelopes; pairs with T190's soft-attack work).

> **Prior verdict:** `APPROVED — T184 [A] · T182 [A] · T186 [A]` + the Codex **Emblems** wiring (T179 remnant).
Live build **`8cbfa68`** (all deployed); full suite **52/52** + `node -c` green; arena gates green.
- **`T184`** (`d47685d`, [A]) — DEV MODE from the menu: **tap the build pill 7×** (1.5 s window) toggles a
  persisted `halves.dev` flag (`?dev` kept as fallback); a **Developer** section in Setup (hidden by default)
  houses the **gold-setter** (real `saveGold()` 0/1K/…/1T), the **reveal-all** view-only toggle, and the FX/hoard
  testers. Off by default — normal users never see it. `dev-reveal` test 31 green. **Remove for publish (T168).**
- **`T182`** (`d47685d`, [A]) — hoard **log curve**: `hoardLevel = clamp(log10(1+gold)/log10(1e12),0,1)` →
  visible across K/M/B/T (1K≈25%, 1M≈50%, 1B≈75%, 1T≈full), replacing the old power curve that read 0.17% at real
  gold. `hoard-wiring` test 47 green. *(Curve only — the pile **still doesn't draw** on the owner's device; that's
  a separate engine bug, **T185 [B]**, root-caused below.)*
- **`T186`** (`8cbfa68`, [A]) — region bosses now **vary by region**: `TYPES[floor((n-1)/REGION_SIZE) % 3]` →
  Brawn/Arcane/Cunning cycle across the 10 bosses (no longer all Cunning/green); Void Sovereign stays adaptive.
  `arena`/`arena3` green.
- **Codex EMBLEMS wiring** (`317b086`, [A]) — B's `emblems.js` candidates now render as a Codex **Emblems**
  section, unlocking by conquest (emblem *i* once *i* bosses are felled; dev reveal-all shows all). `codex` test
  green. *(This was the outstanding T179 remnant.)*
**Verified:** worktree at `8cbfa68`; `node -c` clean on every changed `.js`; **52/52** suite + arena/codex/fxgl/
gold gates green; deploy confirmed (pages.yml run for `8cbfa68` = success). **→ A: `T187` (Codex items clickable →
detail popup, owner-requested) → then icon-direction (owner reviewing).  → B: `T185` 🔴 (hoard pile not drawing —
ROOT-CAUSED: only `CPUBackend` draws it; WebGL2/WebGPU don't).**

> **Prior verdict:** `APPROVED — T181 [B] · T183 [B] · T179 [A]` (emblems, brighter lofi, the Codex) + the
`T173` follow-ups. Live build **`5633895`**; full suite + `node -c` green.
- **`T181`** (`8f077cb`, [B]) — `emblems.js`: all candidates (`coin`/`crowncoin`/`hoard`/`goblin`/`voidthrone` +
  a bonus `sigil`), beveled coin with a goblin-profile stamp + glint, gold-on-purple, maskable-safe; `emblems.test`
  45 green. Ready for the owner to review + pick the launcher icon.
- **`T183`** (`5633895`, [B]) — `lofi` brightened (root +5, lead octave +1, reverb 0.42→0.32) → less dark/bassy,
  per the owner; + a study-music research note. *(Stability: gates green; I'll re-measure the long-render if the
  harness recovers — the T175 cap holds.)*
- **`T179`** (`688d142`, [A]) — Codex bestiary tab: Beasts (region×type) / Bosses / Realms / Events, encounter-
  unlocked, reusing `Monsters`/`Scenery`/`eventart`. **Follow-up: wire the EMBLEMS section** (from B's new
  `emblems.js`) into the Codex — that part of T179's DoD wasn't built (emblems landed same-batch).
- **`T173` follow-ups** (`95dc896`, [A]) — earn-burst now standalone/outward (converge dropped) ✓; the dev
  gold-setter is now **`?dev`-gated** (`?dev&gold=` — inert without `?dev`) ✓.
**Verified:** node -c clean; full suite + `emblems` 45 green. **→ A: `T182` (hoard log-curve + the real
`saveGold()` menu buttons — STILL PENDING, do-first) → wire Codex Emblems → `T180` reveal-all. → B: queue clear
(emblems + lofi done) → STAND BY.** Owner device-verify: lofi brighter; emblems to pick from.

> **Previously approved (done):** `APPROVED — T172 [B] · T173 · T178 · T60 · T61 [A]` (the GOLD HOARD is built + the absurd
economy + content), with **2 small T173 follow-ups for [A]**. Live build **`1d1f193`**; full suite + `node -c` green.
- **`T172`** (`7283fad`, [B]) — gold-hoard ENGINE, **faithful to the T174 research**: impression-not-physics
  (dithered mound silhouette + crest-scattered SURFACE coins only), beveled coins (per-coin angle/squash/tone/
  glint), `HOARD_CAP` 340 (≪ 512), 8 re-seed tiers, opt-in (`scene.hoard`/`look:"coin"`; existing scenes
  byte-identical). Clean.
- **`T178`** (`7c3a14d`, [A]) — **`HOARD_G` = 2.5** ✓ (the changes-requested bump). Economy ramp complete.
- **`T173`** (`1d1f193`, [A]) — hoard WIRING: `hoardLevel = (gold/GOLD_FULL)^0.4`, `GOLD_FULL = 1e10` ✓; the
  **amount-scaled spinning-coin earn-burst** (`earnBurstSpec`: log-count capped at 88, 4 juice tiers, wider
  spread+brighter palette past the cap) ✓; a **Graphics-menu `#hoardTest` tester** (fire levels) ✓. **2 FOLLOW-UPS:**
  1. ⚠ **The earn-burst CONVERGES to the hoard** (`tx:0.5, ty:0.93` — coins fly DOWN to bottom-centre) — but the
     **owner DROPPED converge/settle** ("coins flying *out* already evoke it; we're not on the home screen when we
     earn"). It fires on **results** (off-home), so coins fly down to a hoard that isn't shown. **[A]: make it a
     standalone OUTWARD spinning-coin burst from the earn-point (drop `tx/ty` converge).** *(Owner can also judge
     on-device — but it contradicts the explicit spec, so default to fixing it.)*
  2. ⚠ **The dev gold-setter is an always-active `?gold=<n>` param** ("harmless in production" — but the owner
     said **gate/remove before publish**, and it lets any user set their gold). **[A]: gate it behind `?dev`** (so
     it's inert in production) — same `?dev` panel as T180's reveal-all. (Already on the T168 publish checklist.)
- **`T60`/`T61`** (`4f3113c`, [A]) — Wave-2 content: Metric + Sequences spine topics; suite green.
**Verified:** node -c clean; full suite green; the engine/wiring/economy inspected. **Owner device-verify:** the
hoard renders + grows (try `?gold=1e9`), the earn-burst feel, the tiers are performant. All → DONE; the 2 T173
follow-ups are small [A] fixes. **→ A: the 2 T173 fixes → `T179` Codex → `T180` dev-reveal. → B: hoard engine
done → STAND BY (Codex is [A]); hold for an engine need.**

> **Previously approved (done):** `T175 [B]` (the recurring foghorn — KILLED) · `T178` g→2.5 etc.
2.1→2.5). Live build **`e55cf47`**; full suite + `node -c` green.
- **`T175`** (`2072b22`, [B]) — **the recurring foghorn is fixed, and B MEASURED the exact cause** (validating the
  "every song ramps up" diagnosis): the 0.78 FDN decay cap was **noise-safe but TONAL-marginal** — a *sustained
  tonal* pad (T155 `padglass`, low-freq + long sustain) sits on an FDN comb peak where loop gain ≈ 1, so over the
  multi-second reverb fill it ramps to a rail. Measured: 16 s sustained `padglass` chord → decay 0.78 **diverges
  to 143**, ≤0.70 stays ~0.5. **Fix: cap lowered to 0.66** (subcritical for tonal input, with margin) **+ a safety
  compressor on the reverb return** so any residual buildup decays to a ceiling instead of railing (defence in
  depth). **Gate extended** (`audio.test` +33: a long *tonal-pad* render, not just 5 s noise) — closes the blind
  spot that let this recur. `golden-synth` 19 green. **This should END the foghorn saga.** *(Owner: confirm on
  device — start any song / use the switcher, wait 20–30 s, no ramp-up.)*
- **`T178`** (`e55cf47`, [A]) — economy ramp mechanism is **correct**: `hoardMult = g^(bossesDefeated)` multiplied
  onto the additive `goldMult`; early game (0 bosses) → ×1 (earning unchanged); decoupled from Arena difficulty.
  `gold.test` 22 green. **BUT `HOARD_G = 2.1`, and the owner chose `2.5`** (A built against the earlier 2.0–2.2
  rec before 2.5 was locked). **→ CHANGES: bump `HOARD_G` 2.1 → 2.5** (one line). Otherwise approved.
**→ B: foghorn cleared → `T172` (gold-hoard ENGINE) is now UNBLOCKED + owner-greenlit. → A: bump `T178` g→2.5,
then content `T60`/`T61`, then `T173` hoard wiring (after B's `T172`).**

> **Previously approved (done):** `T177 · T176 · T171 · T59 [A]` (PWA fullscreen-restore, notch fix, Goblin Gold
rename, content batch). Live build **`90422c5`**. Full suite + `node -c` green.
- **`T177`** (`90422c5`) — PWA fullscreen-lost-on-minimise fixed: `wasFs` tracked on hide; on resume (installed +
  lost it) a **one-shot capture-phase `pointerdown`** re-enters fullscreen on the first tap (removes itself; never
  forces if not previously FS; browser tab never arms); **`#fsToggle` restored when installed** (walked back T156).
  `install-display.test` 14→18 (asserts the one-shot re-enter, no double-fire, no-force, tab-never, toggle-shown).
- **`T176`** (`ff20cae`) — notch black bar fixed: **`viewport-fit=cover`** added → the full-bleed backdrop paints
  the purple into the cutout; UI stays inset-aware. *(Owner device-verify: purple to the top.)*
- **`T171`** (`1a4bcf5`) — product renamed **"Goblin Gold"** (manifest `name`/`short_name`, `<title>`); the
  **`halves` topic keeps `name:"Halves"`** ✓.
- **`T59`** (`1ba6f62`) — Wave-2 content: 2 new spine topics (`rounding`, `largermd`); `t59-modes.test` 26 green.
**Verified:** node -c clean; full suite + `t59-modes` + `install-display` 18 pass; the 4 fixes inspected.
**Owner device-verify pending:** notch fills purple; minimise→return→tap restores fullscreen + the manual toggle
is back in Setup. All 4 → DONE. **→ A: `T178` (economy ramp — NOW fully specced, sim done, `g`≈2.0–2.2) → content
`T60`/`T61` → `T173` hoard wiring (after B's `T172`).**

> **Previously approved (done):** `T162(P2+P3) · T170 · T169 [A] · T174 [B]` (drill modes complete, tree-overflow
fixed, fonts self-hosted, coin-hoard research done). Live build **`7df7699`**. Full suite + all new gates green.
- **`T162` COMPLETE** (`2510e55` P2 + `8528658` P3) — all **12 mock-driven drill modes** built across P1/P2/P3
  (`scaling`/`percentoff`/`partwhole`/`balance` · `ratioshare`/`timegap`/`lcmhcf`/`mean` · `cubes`/`money`/
  `digitsum`/doubles-halves range). Three logic gates green: `t162-p1` 61, `t162-p2` 61, `t162-p3` 50 (answers
  numeric/in-range/numpad). The mock-driven curriculum gaps are now drillable.
- **`T170`** (`f73443c`) — the live tree-overflow fixed: `.tpart{flex:3 1 0; min-width:0}` shares the row width,
  `.tnode{max-width:96px}` keeps sparse rows current-size + shrinks dense rows, `data-parts="3"/"4"` trim
  padding/icons. `home-layout` gained a **data-driven "any row ≤4 fits, no clip" gate** (not a pixel snapshot).
- **`T169`** (`d6fbae3`) — fonts self-hosted: **no `fonts.g*` refs remain**, `fonts/{space-grotesk,jetbrains-mono}.woff2`
  shipped, `@font-face` + cachebust/SW. Zero third-party requests → the kids-privacy story is airtight.
- **`T174`** (`7df7699`, [B]) — coin-hoard RESEARCH pass. Strong: surveys the "imply-the-bulk, render-only-the-
  surface" genre trick, **borrows 3 brickmap recipes**, and recommends a **three-layer composite** (A: dithered
  mound silhouette as scenery, 0 particles · B: `hash01`-scattered beveled-coin splats w/ per-coin rotation+squash,
  count on a saturating curve · C: attractor earn-burst), with the gold→level curve, the cap/degrade (~120/220/340
  ≤ 512), reduced-motion still, and honest open visual choices. Doc-only, no engine change. **→ SURFACED to the
  owner for thumbs-up before `T172` builds it.** (`docs/research-coin-hoard.md`.)
**Verified:** node -c clean; full suite + `t162-p1/p2/p3` + the home-layout tree-fit gate pass; T169 grep-clean.
**Owner-confirm pending (device):** the tree now fits on the phone. All 4 → DONE; `T174` → awaiting owner-bless.
**→ A: `T171` (Goblin Gold rename) → content `T59`–`T61` (+ `T173` hoard wiring once `T172` lands). → B: hold
for the owner's thumbs-up on the hoard technique, then `T172`.**

> **Previously approved (done):** `T166 · T164 · T167 [A] · T165 · T163 [B]` (the owner's live-bug batch — config
nav, music/foghorn, fullscreen, audio-switch tail, visual golden). Live build **`9722cb4`**. Full suite + new
gates green; footprints disjoint.
- **`T166`** (`0aca3ee`) — config submenus EXIT fixed. Root cause confirmed = my diagnosis: the
  **sentinel-pushed-on-every-`show()`** double-stacked history so back over-shot its parent. Fix removes that;
  keeps **ONE trailing exit-trap sentinel** and lets the hash route handle back (`lastSeenHash` distinguishes a
  routed pop from the exit-trap pop). `back-nav.test` (22 checks, CI) asserts **settings→audio→back == settings
  (not home)**, the full audio→settings→home chain, AND the in-app `←` buttons. Strong behavioural gate.
- **`T164`** (`9722cb4`) — music switching now **idempotent**: `curMusicKey = context+":"+seed`; if unchanged +
  `Sy.musicPlaying()`, `musicForScreen` **returns early** (no setContext/setMusic/swapNow/start), still ticking
  arena intensity. `music-idempotent.test` (15, CI) proves **5 same-music screen changes → ZERO setContext + ZERO
  start** (was 5+). Directly fixes the owner's "same track restarts" + the likely foghorn-on-screen-change root.
- **`T167`** (`9722cb4`) — launch/fullscreen per the owner's revised spec: **entry screen kept in ALL modes**;
  browser keeps the 2-way choice (`#entryFs` FS + `#entryPlay` windowed); installed/standalone → the single
  "Tap to begin" calls `enter(isInstalledDisplay())` = audio unlock **+ `requestFullscreen()`** (the one gesture
  we get). `install-display.test` 14 (CI). *(TWA native-immersive launch is a packaging concern on T72/T103, as
  noted — not web code.)*
- **`T165`** (`4a10a4b`, [B]) — a real context switch now **fully stops the previous generator**: dips the wet
  reverb output AND **`reverb.flush()` drains the FDN feedback** (the dip alone left ~37% of the tail), so nothing
  bleeds past the swap → no carryover drone; `setContext(current)` is now a **no-op** (idempotent, defence with
  T164). `synth` 174 + `audio.test` extended. Kills the "switcher doesn't fully switch" + the foghorn tail.
- **`T163`** (`461fddc`, [B]) — the brittle `visual_arena` golden is now a **robust signature**: static screens =
  presence + 5%-bucketed bbox; **dynamic Arena = presence-boolean only** (stable across 3v3 teams / death-VFX /
  gold reflow). Re-blessed; the gate still has teeth (hue/layout flips fail).
**Verified:** node -c clean; full suite + the 3 new CI gates (`back-nav` 22, `music-idempotent` 15, `install-
display` 14) + `synth` 174 all pass; T165's flush/idempotency + T164's guard inspected (not just "suite green").
**Owner-confirm pending (device):** the foghorn-on-switch gone, config menus navigate, PWA single-tap fullscreen.
All 5 → DONE. **→ A: `T162` P2/P3 (drill modes) → content `T59`–`T61`. → B: STAND BY** (engine queue clear).

> **Previously approved (done):** `T161 · T158 · T159 · T160 · T156 · T157 · T58` [A] (a 7-task batch A pushed
ahead of review; all independently verified, full suite + `node -c` green). Live build **`c89eebc`**.
- **`T161`** (`555464f`) — **the trust fix, verified.** `RUNNING_V` is read from **`main.js`'s own `?v=<sha>`**
  (`document.currentScript.src`, with a `querySelector` fallback); the pill shows the **running** sha (truthful
  per client; "local build" with no `?v=`); the update-check compares `RUNNING_V` vs the fresh `build.json` sha
  and fires **only on mismatch**. `version.test` rebuilt with a controllable boot — asserts running-comes-from-`?v=`
  + update-fires-on-stale + no-op when equal. This ends the "same build number, different code" trap.
- **`T158`** (`41bd1d8`, rescoped — the earlier network-first `e454208` is cleanly **superseded**, no hybrid
  left). Net `sw.js`: nav + `build.json` are **network-first with `cache:"no-store"`** (defeats the HTTP-cache
  shadow that froze the owner's Firefox), immutable `?v=` assets + fonts stay **cache-first** (correct — new
  deploy = new URL), `build.json` never cached, **`CACHE` bumped v1→v3** so `activate` purges. `pwa.test` has
  real teeth: a simulated fetch handler asserts the no-store nav, never-cache-build.json, cache-first-`?v=`, bump.
- **`T159`** (`aa583b8`) — the **foghorn-on-resume** fix. A guard refuses to schedule into a `suspended`/
  `sampleRate:0` context (main.js:371); `visibilitychange` **stops** the scheduler on hide and **clean-resyncs**
  (`resyncMusic`, drop the surviving tail, restart only once running) on return. Addresses the app-switch drone.
- **`T160`** (`1c949e0`) — Arena death VFX + calmer pace. Foe KO (`ev.tSide===1`) fires a tight localised
  `fxBigBurst` at `elCentre(cellEl[k])` (foe-type palette + impact white, count 180, `FX_SMALL`, spread 0.7);
  pace budget 2600→4000, floor 130, ceil 480; reduced-motion path intact. **Exemplary behavioural gate**
  (`arena-playout-fx.test`, CI-registered): drives a real fight with non-centre foe rects and asserts the burst
  emits **AT the foe cell** (x=0.564, not the 0.5/0.55 fallback) with the right signature+palette — proves
  localised emission, not just a setter call.
- **`T156`** (`eaf40bd`) — `isInstalledDisplay()` (`display-mode: standalone|fullscreen` / `navigator.standalone`)
  hides the Settings `#fsToggle` and drops the entry "Play in fullscreen" wording → "Tap to begin" (keeps the
  audio gesture) when installed; **manifest → `display:"fullscreen"` + `display_override`**, `orientation`
  portrait. Browser-tab behaviour unchanged.
- **`T157`** (`1a3e3fb`) — Android back-gesture trapped via a `history.pushState` sentinel kept on top + a
  `popstate` handler that navigates our screen stack (`stay`/`nav`/`exit`), confirm-exit at home; guarded for no-`history` envs.
- **`T58`** (`c89eebc`) — content-extension blueprint **doc only** (`docs/CONTENT-EXTENSION.md`); no code risk.

**Verification:** full gate suite + `node -c` (main/sw/modes/synth) green on `c89eebc`; each task's gate teeth
inspected (not just "suite passed"). **Honest caveat:** `T156`/`T157`/`T159` are *visible/device* behaviours
(installed display-mode, the real Android back gesture, mobile audio resume) the **OOM-down headless harness
can't confirm** this session — logic + Node gates are sound; **final confirmation is the owner's on the installed
PWA**. All 7 → DONE. **⚠ A again built far ahead of the `NEXT.md` order** (shipped T161→T58 in a burst) — re-flagged
"re-read NEXT before each task". **→ A: `T162` drill modes (Tier P1 first).**

> **Previously approved (done):** `T89 + T90` [A] (Arena 3v3: team-selection UI + watchable deterministic turn
playout) · live builds **`9197265`** (T89) + **`dffa345`** (T90). **All gates green** (full suite + `arena3`
27 checks); `node -c` clean; **owner-accepted live** ("arena 3v3 looks good"). T89 fields a 1–3 hero party vs
the tier's 3-foe enemy team with per-foe matchup chips; T90 plays the EXACT `teamBattleLog` sim turn-by-turn
(HP bars drain, KO dims the cell via `applyEvent`'s `ev.ko`), single cancelable RAF (no leak), reduced-motion/
headless → instant resolve. Clean, deterministic, no new RNG. T89/T90 → DONE. **⚠ A is not strictly following
the `NEXT.md` order** (built Arena 3v3 while `T158`/`T156`/`T157` sat queued — a staleness race; re-read NEXT
fresh before each task). **→ Owner gave two new directives (now queued): `T160`** (Arena enemy-death VFX +
slower playout) **and `T158` is RE-UPGRADED to DO-FIRST** — the owner sees "3v3 in PWA but not Firefox," which
**proves the un-versioned cache-first SW bug is ACTIVELY pinning stale code per-client** (Firefox frozen pre-3v3).
`T158` must land before `T160` or the VFX won't even reach the owner's installed PWA.

> **Previously approved (done):** `T153` [A] (home backdrop = FIXED brand purple, not event-coloured) · live
build **`c942859`**. **All gates green; collision-clean** ([A]-owned: `main.js`, `test/fx-wiring.test.js`,
`BUILDER-LOG.md`). Fixes the owner's repeated flag (the home backdrop went **blue** on a rare-event day because
`homeFxState` wore `paletteFor(ev.rarity)`). Now `homeFxState()` (`main.js:215`) **always** returns a fixed
`HOME_PALETTE = ["#0E1116", "#9a5cf6", "#cda9ff"]` (the epic/brand-purple family) and **deliberately does NOT
read the event** — only the player's own collection progress + Momentum streak modulate brightness/density, hue
is fixed purple in every state (no-event, rare, epic). Event-specific *screens* may still theme; the home/main
screen is locked purple (owner's refinement). **Verified:** `node -c` clean; full suite green; the **`fx-wiring`
boot gate (84 checks) drives the REAL boot path and asserts (a) the home state carries exactly the purple
`["#0E1116","#9a5cf6","#cda9ff"]`, and (b) `homeFxState` reads NO `Ev.today()`/`ev.rarity`** — "fixed purple,
not event-based" proven behaviorally, not by grep. **🧑 Owner-confirmed visually** ("it fixed the BG a while
ago" — the human renderer saw purple). *(My own headless pixel-hue probe could NOT run: the in-env Chromium
harness is OOM-killing on launch this session — see ORCHESTRATION note; covered by the owner's visual
confirmation + the boot-path palette assertion.)* T153 → DONE. **→ A: roadmap — `T89`/`T90` (Arena 3v3,
no creds needed) → content `T58`–`T61` → `T72` (held for owner creds).**

> **Previously approved (done):** `T152[A]` [A] (celebrations emit from the source element — small/fine,
context-coloured) · live build **`bdd0e6a`**. **36/36 gates green; collision-clean** ([A]-owned: `main.js`,
`test/fx-wiring.test.js`, `test/synth-wiring.test.js`, `BUILDER-LOG.md`). Clean implementation: `elCentre(el)`
(`main.js:266`) reads a source element's `getBoundingClientRect()` → normalized centre with a screen-centre
fallback; each `fxCelebrate*` routes through it with the engine's new small `sizePx` (5–6) + the contextual
palette — inventory→the **unlock card** (`#unlockGrid`, rarity colour), topic run→the **rank badge**
(`#rankLine`, rank colour), arena win→the **defeated foe portrait** (`.at-enemy`, gold+accent, widest spread).
**Verified:** `node -c` clean; **`fx-wiring` gate (line 192) drives the REAL boot path with a non-centre source
rect and asserts the celebration centroid lands at the source's rect centre (0.205,0.154), NOT screen-centre,
with small `sizePx`** — point-emission proven deterministically (the codified strong check, not a source-grep).
`showUnlocks` opens the modal first so the card has a rect. Full suite + CI green. T152[A] → DONE.
**⚠ A skipped `T153` (the fixed-purple backdrop the owner flagged TWICE) and did T152[A] instead — another
staleness race.** `homeFxState` (`main.js:219-221`) **still wears today's event palette** (`paletteFor(ev.rarity)`
→ blue on rare-event days). **→ A: `T153` is now DO-FIRST/absolute** (keep the home backdrop FIXED PURPLE).

> **Previously approved (done):** `T102` [A] (Android PWA core — installable manifest + offline service worker)
· live build **`ba5fd26`**. **CI green; collision-clean** ([A]-owned: `index.html`, `main.js`, `sw.js`,
`manifest.webmanifest`, `icon.svg`, `.github/workflows/pages.yml`, `test/pwa.test.js`, `BUILDER-LOG.md`).
A handled the **service-worker version-lock risk correctly** — the #1 SW danger: `sw.js` is **network-first
for navigations + `build.json`** (a new deploy is always picked up online; the T54 version-check reads fresh;
**never caches build.json**) and **cache-first only for the immutable `?v=<sha>` assets** + fonts (safe,
fast, offline). `skipWaiting` + `clients.claim` + drops superseded caches. **Registration is guarded** (`main.js:2283`:
only `http(s)`, `try/catch`, lazy — won't break unsupported browsers/`file://`; that guard is why a `file://`
load won't register it). Manifest valid + **installable** (standalone, hex theme/bg, a **maskable** icon that
exists). Verified: `node -c` clean (`sw.js`+`main.js`); `pwa.test` 21 (gates the network-first strategy +
maskable-icon-exists + manifest fields) + registered in `pages.yml`; manifest is valid JSON; full suite + CI
green. *(Browser SW-registration re-check skipped — needs https/localhost, and the http+chromium harness was
flaky this session; the SW logic is verified by `pwa.test` + code read.)* A kept it to the **no-credentials
scope** as asked (the TWA wrap / Play-Store signing is `T103`/`T72`). T102 → DONE. **→ A: `T152[A]` (the
celebration point-emission wiring) is unblocked + owner-keen — do it next** (A skipped it via a staleness race
while mid-T102).

> **Previously approved (done):** `T152[B]` [B] (small/fine particles + spread + off-centre emission) · live
> build **`a2f9475`**. **CI green; collision-clean** (B-owned: `fxgl.js`, `test/golden-fx.test.js`,
> `test/golden/fx_small_offcentre.json`, `BUILDER-LOG-FX.md`). `sizePx`/`sizeScale` (small/fine, DPR-aware),
> `spreadMul` (<1 hugs the source), `{x,y}` emission + `palette`; **defaults byte-identical**. **🌐 Browser-
> verified** (`{x:0.25,y:0.30,sizePx:4,spread:0.6}`, dpr 2.75): lit centroid **cx=0.25** (off-centre works),
> particles small (~25 device-px runs vs bold ~18px default). `golden-fx` 35; `fxgl.test` 124. T152[B] → DONE;
> B → STAND BY.

> **Previously approved (done):** `T124` [A] (full-size slashed fraction glyphs — legible at node size) · live
> build **`583130c`**. **CI green; collision-clean** ([A]-owned: `glyphs.js`, `test/glyphs.test.js`,
> `BUILDER-LOG.md`). The `f12`-style slashed vulgar fractions are now full-size. **🌐 Browser-verified
> (screenshot @ dpr 2.75):** the `x/2` Halves node, `1/2n`, and `a/b` nodes all render as crisp readable
> slashed fractions. T124 → DONE. *(Same render confirmed T142 backdrop, T146 nav, T145 build stamp, T144
> readout-at-top.)*

> **Previously approved (done):** `T151 + T150` [B] (synth divergence fixed across ALL styles + a real
> browser/audio test harness) · live build **`44ea919`**. **CI green; collision-clean** (B-owned: `synth.js`,
> `test/synth.test.js`, `test/browser/*`, `BUILDER-LOG-FX.md`). **Audio "sounds bad" FIXED:** Butterworth-Q
> damping + dropped `ambient`'s `reverbDecay:0.9` + capped FDN decay below the ~0.82 cliff. **🌐 Babysitter
> re-measured (AnalyserNode, 5 s/style): every style BOUNDED** — `ambient` 1096→~1.2, switches clear cleanly
> (the partial `2f8d1a9` left ambient diverging; I bounced it, B completed it). **`T150` too:**
> `audio.test.js` (real `OfflineAudioContext`, peak ≤ 2) + `render.test.js` (real app, fires celebration,
> asserts `#fxBurst.clientWidth>0` + coverage — catches the T149 class) + `_harness.js` (self-serves,
> skips-clean w/o browser). `synth.test` 161; `node -c` clean. **T151 → DONE; T150 → DONE.**

> **`APPROVED — T101` (with the fix `9d6175b`)** [A] (defer the audio-graph off first paint + restore the
> music-start). The original `d795031` jank-defer dropped the music-start (`warmAudio` wired the synth but
> never called `musicForScreen`; the old `audioUnlock()` it replaced did) → music silent after Start; I
> **CHANGES-REQUESTED** it (static trace). A's fix `9d6175b` sets `warmAudio = () => { audioUnlock();
> applySoundPref(); musicForScreen(curScreen); }` — `audioUnlock()` mounts AND starts the music, exactly the
> dropped call, restoring the pre-T101 working sequence. **Verified the diff + `node -c`/`synth-wiring` green.**
> **⚠ Honest caveat:** unlike the celebration (reliable pixel check), **headless can't confirm audio
> *playback* — the AudioContext is inconsistent without a real audio device** (`S.ctx()` came back `null` in
> my Start-flow probe; audio *analysis* like the T151 divergence works only once the ctx is forced up). So the
> code is right but **music-after-Start playback is owner-ear-pending**, and there's a possible **async-resume
> race** (the deferred `audioUnlock` may try to start the scheduler before the ctx finishes resuming → if the
> owner reports no music after Start, that's the cause: await the resume / retry on `ready`). **[B] `T150`
> should add an `OfflineAudioContext` start test** (reliable) since live-ctx headless is flaky. T101 → DONE
> (code restores the working path; flagged for the owner's ear).

> **Previously approved (done):** `T149` [A] (THE celebration fix — `#fxBurst` moved out of the `display:none`
> reset modal) · live build **`9c211a3`**. **CI green; collision-clean** ([A]-owned: `index.html`,
> `test/fx-wiring.test.js`, `BUILDER-LOG.md`). `<canvas id="fxBurst">` was the last child of `#resetModal`
> (`.modal.hidden{display:none}`) → painted into a never-displayed `0×0` canvas. Moved **top-level**;
> `fx-wiring.test` +9 asserts it's not inside a modal. **🌐 BROWSER-VERIFIED:** parent=`BODY`, `clientSize
> 393×852` (was `0×0`), real "Item" tester click → 21.8% lit coverage, no errors. T149 → DONE. *(Engine
> T133/T138 was correct all along; one misplaced `<canvas>` was the bug.)*

> **Previously approved (done):** `T143` [A] (dedicated scrollable Audio menu + separate Music/SFX volumes —
> nav-trap fix) · live build **`59e2c28`** (in green HEAD `daa64f5`). **CI green; collision-clean** ([A]-owned:
`index.html`, `main.js`, `sound.js`, `styles.css`, `home-layout.test`, `sound.test`, `synth-wiring.test`,
> `BUILDER-LOG.md`). Fixes the **navigation trap**: Settings + the new **`#audio`** menu bodies are now
> `.scroll-body` (`overflow-y:auto`) so **Back is always reachable**. The home Sound button opens the Audio
> menu (mute toggle inside, + music picker, tempo, FX tester) and **separate Music + SFX volume sliders**
> (`#musicVolRange` 0.05×, `#sfxVolRange` louder); `halves.vol` migrates; mute silences both;
> `ensureAudioReady` stops the tester restarting music. Verified: `node -c` clean, new ids present, full suite
> + CI green. T143 → DONE.
> **Plus `APPROVED — T144`+`T145`** [A] · live build **`daa64f5`**. **CI green; collision-clean**
> (`index.html`/`styles.css`/`contrast.test`/`home-layout.test`). **T144:** the `.readouts` gold/momentum
> readout is now a header stat bar at the **very top** of `#start` (above the event banner), keeping its T142
> pill backing. **T145:** the `.build` dev stamp is **plain (no pill)** — owner opted it out of the contrast
> floor; `contrast.test` now exempts `.build` while keeping `.readouts`/`res-label` protected (still fails if
> those lose backing). Verified: ids present, full suite + CI green. **T144/T145 → DONE.**

> **Previously approved (done):** `T138` [B] (celebration visible on-device — the real cause was DPR downscale)
> · live build **`8145505`** (refines `cda6fd6`). **CI green; collision-clean** (B-owned: `fxgl.js`,
> `test/golden-fx.test.js`, `fx_celebrate_visibility.json`, `fx_celebrate_2d_frame.json`, `BUILDER-LOG-FX.md`).
> **Real cause (DPR downscale):** the 2D buffer is `dpr×res×CSS` (~2.75× on the Poco X3) and the browser
> downscales it back, so 6–18 buffer-px particles showed at ~2–6 screen px and faded = invisible. **Fix:** the
> CPU 2D path scales draw size by `pxScale = dpr×res` → constant ~6–18 SCREEN px (floor 2); sizes bumped to
> 6–18. `_ignite` re-fit + `canPresent` kept as defence. **Stronger gate:** measures lit coverage AND
> on-screen particle size (`{litPx:572000≈24%, screenPx:18}`; fails on 1×1/blank AND below ~8 screen px).
> Verified: `node -c` clean; `fxgl.test` 124 + `golden-fx` 28; full suite + CI green. T138 → DONE. **🎆 owner
> re-test → a BOLD shower.**

> **Previously approved (done):** `T139` [B] (the owner-approved 12-style music palette) · live build
> **`efef4b4`**. **CI green; collision-clean** (B-owned: `synth.js`, `test/synth.test.js`, 12
> `test/golden/synth_score_*.json`, distinctness golden, `BUILDER-LOG-FX.md`). Builds the T141 palette as the
> owner approved: `CONTEXTS` = the **12 styles** (`menu`+`arena` kept; `solve`/`event` dropped; 10 new — lofi/
> ambient/chiptune/synthwave/dubstep/dnb/bigroom/boss8bit/tropical/techno). **Distinctness golden =
> `{styles:12, pairs_compared:66, all_distinct:true}`** (all 66 pairs distinct). Verified: keys match; `node
> -c` clean; `synth.test` 144; `golden-synth` 19; full suite + CI green. T139 → DONE. **🎵 owner HEARS them
> once A's `T140` lists/routes the 12 + fires the dubstep victory.**

> **Previously approved (done):** `T142` [A] (restore the FX backdrop — local backings, not T123's global
> slab) · live build **`42aac3b`**. **CI green; collision-clean** ([A]-owned: `styles.css`,
`test/contrast.test.js`, `BUILDER-LOG.md`). Fixes the owner's "killed the nice background" regression
> exactly as scoped: **removes the global `.app` scrim** (the backdrop reads again) and adds **local
> translucent-dark pills** only on the rows that float on the backdrop (`.readouts`, `.build`, `#arena
> .res-label`), backdrop visible around them; `contrast.test` reworked per-element (still honest). Verified:
> `.readouts` wired; `.app` slab gone; `contrast.test` 14; full suite + CI green. T142 → DONE. *(Owner: purple
> backdrop restored. The `.build` pill is being removed next — T145, owner opted it out.)*

> **Previously approved (done):** `T141` [B] (RESEARCH: musical styles → a concrete 12-style palette) ·
> live build **`02d2d6f`** (doc-only; its own CI run was auto-cancelled by T142's push seconds later — the
> green HEAD `42aac3b` includes it; no gates touched). **Collision-clean** (B-owned: `docs/research-music-
> styles.md`, `BUILDER-LOG-FX.md`). A genuinely strong research pass (the T119→T120 pattern): genre DNA
> (tempo · mode/progression · rhythmic feel · instrumentation · the recognisable production trick) for 10
> new styles, **mapped to this engine's real levers**, with cited references and the small patch additions a
> few styles need (tempo-synced wub wobble, a `chip` square-pluck, optional swing, a noise-sweep/drop for
> the victory). Ends in a **concrete 12-style palette table** (`CONTEXTS` recipes): menu+arena kept; 10 new
> incl. the **dubstep victory**, ≥2 calm (lofi/ambient), ≥2 festive (chiptune/festival); spread-checked
> (tempo 60→174, 8 modes, drone→breakbeat→four-floor, reverb 0.04→0.55). T141 → DONE. **→ Babysitter is
> surfacing the palette to the owner for a thumbs-up BEFORE `T139` builds it (as committed).**

> **Previously approved (done):** `T137` [A] (celebration TESTER in Settings + fix the overlay occlusion) ·
> live build **`41016d4`**. **CI green; collision-clean** (all [A]-owned: `index.html`, `main.js`,
> `styles.css`, `test/fx-wiring.test.js`, `test/synth-wiring.test.js`, `BUILDER-LOG.md`). **(1) Tester** —
> Settings buttons (Item/Rank/Win/Big burst) fire each celebration on demand AND write `fxBurst.isReady()`+
> `dimensions()` into the row (on-device diagnosis, no DevTools). **(2) Occlusion fix** — `#fxBurst` (z58)
> was UNDER the older confetti `#fxCanvas` (z59) → swapped (celebration z59 over confetti z58, below toasts
> z60), a plausible root cause of the invisibility. Verified: `node -c` clean; `fx-wiring.test` 58→75; full
> suite + CI green. T137 → DONE. **🎆 owner to live-check via the tester; if still nothing, the size readout
> → [B] `T138`.**

> **Previously approved (done):** `T123` [A] (a11y contrast floor over the FX backdrop — dark scrim + honest
> gate) · live build **`63876e4`**. **CI green; collision-clean** ([A]-owned: `styles.css`,
> `test/contrast.test.js`, `BUILDER-LOG.md`). Fixed the backdrop-a11y theme honestly: a `.app` dark scrim
> `rgba(14,17,22,.88)` so `--muted` clears AA over the worst-case bright backdrop pixel, + an honest
> `contrast.test` (composites the scrim over white, fails on no/weak scrim). Shared-primitive change with its
> invariant. Verified: `node -c` clean; `contrast.test` 10; CI green. T123 → DONE. **⚠ But the 88% scrim was
> TOO heavy — owner: "killed the nice background." Superseded by `T142`** (remove the global scrim; protect
> only floating text locally; keep the honest gate per-element).

> **Previously approved (done):** `T134` [B] (clean immediate swap — no overlap — + audible distinctness) ·
> live build **`ea1ed5c`**. **CI green; collision-clean** (B-owned: `synth.js`, `test/synth.test.js`,
> `test/golden/synth_score_*.json`, `BUILDER-LOG-FX.md`). Fixes exactly the owner's switcher complaint.
> **(a) Clean swap:** `renderVoice` now hands its amp param back; the scheduler registers live voices on
> `M.active`; **`releaseMusic()` on `swapNow()`** ~75ms-releases every active voice
> (`cancelAndHoldAtTime`→`setTargetAtTime`, no click) + a brief music-bus fade-out→in + a reverb-output dip
> — so an immediate switch **cuts in cleanly** instead of the old pad + multi-second FDN tail ringing over
> the new context (rapid taps no longer pile up). The **default** phrase-boundary swap keeps its natural
> ring (unchanged). **(b) Distinctness:** reworked all four contexts across every lever (register/instrument/
> tempo/density/kit). Verified independently: `node -c` clean; `synth.test` 130 (+10 — immediate swap drives
> `activeVoices→0` + bus/reverb fade; default swap does NOT release early; four distinct tempos/roots/modes;
> solve drumless); `golden-synth` scores regenerated (intentional) **+ still mutually distinct** (10/10);
> full suite + CI green. T134 → DONE. **(Owner confirms switching now works + likes menu/arena. The
> distinctness rework is about to be superseded by the owner's 12-style request — see `T139`/`T140`.)**

> **Previously approved (done):** `T135` [A] (recalibrate volume for the louder synth — default 0.05×, max
0.10×, migrate) · live build **`09b6d9b`**. **CI green; collision-clean** (all [A]-owned: `index.html`,
> `main.js`, `test/sound.test.js`, `BUILDER-LOG.md`). `#volRange` → `min=0 max=10 step=1 value=5`
> (0.00×–0.10×, default 0.05×); `loadVol()` fresh default → 5; **migration**: `loadVol()` returns 5 for a
> fresh profile or any stored `v > 10` (old `300` = 3.0× → 5) — a clamp-on-read (idempotent; no bypass).
> Verified: `node -c` clean; `sound.test` 38; CI green; migration logic-checked (300→5, 10→10, 0→0, 11→5).
> T135 → DONE.

> **Previously approved (done):** `T136` [A] (wire the celebration overlay — mount `#fxBurst` with
> `{backend:"2d"}`) · live build **`f4040e6`**. **CI green; collision-clean** ([A]-owned: `main.js`,
> `test/fx-wiring.test.js`, `BUILDER-LOG.md`). One-line activation of B's T133 — `setupFx` mounts the burst
> overlay with `{backend:"2d"}` (Canvas2D, always presents) while the backdrop stays WebGL; T125
> resize-before-fire kept. Verified: `node -c` clean; both canvas ids present; `fx-wiring.test` 54→58 (burst
> mounts `2d`, backdrop does not); full suite + CI green. T136 → DONE. **🎆 closes "no celebration visuals"
> (owner to confirm live).**

> **Previously approved (done):** `T133` [B] (Canvas2D overlay so the celebration renders on-device) · live
> build **`3e7da28`**. **CI green; collision-clean** (B-owned only: `fxgl.js`, `test/fxgl.test.js`,
> `test/golden-fx.test.js`, `test/golden/fx_celebrate_2d_frame.json`, `BUILDER-LOG-FX.md`). Robust **route
> (b)**: `FXGL.mount(canvas, {backend:"2d"})` selects the Canvas2D backend up front — no per-document
> GL-context-count limit, so it always inits + presents, sidestepping the 2nd-WebGL-context mobile GPUs
> refuse (why the z-58 `#fxBurst` overlay rendered nothing). CPUBackend's `renderFrame` animates
> `burst()`/`celebrate()` via `fillRect`; added `dimensions()`/`isReady()` for the ready+sized assertion.
> Verified independently: `node -c` clean; `fxgl.test` 124 + `golden-fx` 19 pass; the new
> **`fx_celebrate_2d_frame` golden is a real drawn frame** (`drawn:600` spread across an 8×6 grid); a
> **mutation test** caught a tampered golden → "renders nothing" now fails CI. T133 → DONE. **→ activated by
> [A] `T136`** (now done). B → `T134` (clean swap + distinctness — current).

> **Previously approved (done):** `T131` [A] (register the golden gates in CI) · live build **`406acfe`**.
> **CI green; collision-clean** (only `.github/workflows/pages.yml`). Adds two gate steps — `node
> test/golden-fx.test.js` + `node test/golden-synth.test.js` — in **compare mode** (no `UPDATE_GOLDEN`),
> alongside the existing `node test/*.js` gates. The T130 golden harness is now **enforced on every push**.
> Verified: the 4 lines at `pages.yml:93–96`; **CI run `27916460481` for `406acfe` green** → both golden
> steps ran + passed. T131 → DONE.

> **Previously approved (done):** `T128 (1)+(2)` [A] (per-screen music = distinct contexts + instant swap;
victory wub on the un-ducked SFX bus) · live build **`61654ed`**. **CI green; collision-clean** (all
> [A]-owned: `main.js`, `test/synth-wiring.test.js`, `test/events.test.js`, `BUILDER-LOG.md`). Both bugs
> **root-caused**, not patched: **(1) "music never changes"** — `musicForScreen` drove
> `setMusic(musicSpec())` and `musicSpec()` passed **no `progression`** → the engine defaulted the **same
> `[0,5,3,4]` chords for every context**, so solve/menu/arena differed only by tempo. Now every screen
> routes through `synthSwitchContext` → **`Synth.setContext(name)`** (DISTINCT built-in contexts — own
> progression/reverb/patches incl. Arena's **wub bass**) + the T113 tempo; **solve still varies per topic**;
> dead `musicSpec()`/`SYNTH_BPM` removed; **T132's `swapNow()`** wired (≤1-step swap). **(2) "no wub on
> victory"** — the old `wubSting()` played the wub on `bus:"music"` then `duck()`ed that **same** bus → **the
> wub ducked itself**; now it calls **`Synth.sting("victory")`** (wub + bell arp on the **un-ducked sfx
> bus**, confirmed at `synth.js:458`). Verified independently: `node -c` clean; `synth-wiring.test` 45→52,
> `events.test` updated, full 34-gate suite green. T128 (1)+(2) → DONE. **(3) celebration → [B] `T133`**
> (overlay-context render on-device — A's wiring is correct + waiting). *(Owner feedback after this:
> switcher transitions overlap / sound similar → filed [B] `T134`; volume recalibration → [A], pending the
> owner's new max.)*

> **Previously approved (done):** `T132` [B] (`synth.js` immediate-context-swap lever) · live build
**`995cd28`**. **CI green; collision-clean** (B-owned only: `synth.js`, `test/synth.test.js`,
> `BUILDER-LOG-FX.md`). Fixes the true root of the owner's "music never changes" that T129's switcher
> exposed: the scheduler adopted `M.spec = M.want` only at a **phrase boundary** (~8–11s lag). Now
> **`Synth.setContext(name, {now:true})`** (and a standalone **`Synth.swapNow()`**) force `M.spec = M.want`
> immediately, **re-align to a downbeat** (`M.step`/`M.phrase`→0), reset melodic state + reseed → the new
> context's harmony/patches/reverb take effect on the **next scheduled step (≤1 step)**, not the next
> phrase. **No click/dropout** (already-scheduled lookahead notes finish; only the *generator* switches);
> **the default no-`now` phrase-boundary swap is untouched** (good musical behaviour preserved). Also adds
> `Synth.musicState()` introspection (for tests + the [A] wire). Verified **independently**: `node -c`
> clean; **`synth.test` 111→120** — and the new assertions genuinely **distinguish ≤1-step from ≤1-phrase**:
> the *default* test confirms a mid-phrase `setContext` stays on the old mode (`dorian`) and only flips
> (`aeolian`) after crossing the boundary, while the `{now:true}` test flips mode/tempo + `step===0`
> **immediately** and the very next scheduled step plays from the new generator; `swapNow()` adopts a
> pending want; `{now}` lands exactly the target context's normalized spec. **`golden-synth` still passes
> 10/10 unchanged** → the per-context score goldens prove the default path wasn't perturbed. T132 → DONE.
> **→ unblocked [A] `T128`** (now done: `{now:true}` wired into the switcher + per-screen routing).

> **Previously approved (done):** `T129` [A] (Settings MUSIC SWITCHER — sample + test-switch each distinct
> context) · live build **`8cfa11d`**. **CI green; collision-clean** (all [A]-owned: `index.html`,
> `styles.css`, `main.js`, `test/synth-wiring.test.js`, `BUILDER-LOG.md`). The owner's requested sampler IS
> built — a labelled a11y button group (Menu·Solve·Arena·Event, `role="group"`/`aria-labelledby`/
> `aria-pressed`, **≥44px** `min-height:44px` grid, focus-visible, pixel-squared) beside Volume/Tempo. The
> crux: `synthSwitchContext(name)` drives the engine's **distinct built-in context** via
> **`Synth.setContext(name)`** (its own progression/patches/reverb incl. Arena's **wub** bass — NOT the flat
> `musicSpec()` default), with the **T113 tempo** applied on top; a transient `musicPreview` holds the pick
> in Settings and `show()` clears it on leave → **per-screen music resumes**; the tempo slider re-applies
> the active preview. Guarded no-op without Synth; honours mute. Verified **independently**: `node -c`
> clean; the 3 new ids present; **`synth-wiring.test` 25→45** proves each pick calls `setContext` for its
> context **live**, the **Event** pick drives the event harmony (**lydian**, its own progression — not a
> default), each applies its **own reverb**, and leaving Settings reverts to menu; **full 36-gate suite
> green**. T129 → DONE. *(The switcher did its diagnostic job — exposed the phrase-boundary swap lag, now
> fixed by [B] T132's `{now:true}` lever above.)*

> **Previously approved (done):** `T130` [B] (golden-snapshot render-regression harness — brickmap-style) ·
> live build **`ba919db`**. **CI green; collision-clean** (only B-owned NEW files: `test/golden-util.js`,
> `test/golden-fx.test.js`, `test/golden-synth.test.js`, `test/golden/*.json`, `BUILDER-LOG-FX.md` — and
> correctly **did NOT touch `pages.yml`**, leaving CI-gate registration to [A] per the collision rule).
> Delivers what the owner asked ("brickmap's golden render could be learned from"): a no-build **Node**
> harness — `golden-util.js` `check(name,value)` serialises a value, `UPDATE_GOLDEN=1` regenerates,
> default **compares + fails with a "first change at line N" hint**. Two deterministic, headless output
> families are pinned: **(a) FXGL CPU-still** — `deriveHomeScene`/`deriveArenaScene` + `burst()` +
> `celebrate()` at **fixed seeds** → compact pixel signatures (home/frost/arena-boss/burst/celebrate); and
> **(b) synth context scores** — per-context scheduled-event scores (`solve`/`menu`/`arena`/`event`) **plus
> a distinctness golden** `{"distinct":4,"pairs_compared":6,"all_distinct":true}`. Verified
> **independently**: gates run **"ALL 16 FX-GOLDEN CHECKS PASSED"** + **"ALL 10 SYNTH-GOLDEN CHECKS
> PASSED"**; **mutation test** — I tampered a synth golden and the harness **CAUGHT it (non-zero exit)**, so
> it is a real regression net, not a rubber stamp. Crucially the **synth-distinctness golden directly
> guards the T128 "all contexts sound the same" failure mode** — it would have failed had the four contexts
> collapsed to one score. GPU/browser/full-layout golden correctly **out of scope** (CI stays Node-only).
> T130 → DONE. **→ filed [A] `T131`: register `golden-fx.test.js` + `golden-synth.test.js` as CI gates in
> `pages.yml` (B couldn't — collision rule; same pattern as the fxgl/synth gate registration).**

> **Previously approved (done):** `T127` [A] (BUG: literal "&amp;" in locked-topic text — double-escape) ·
> live build **`ed16b68`**. **CI green.** The one-line fix exactly as diagnosed: `renderTopicInfo`
> (`main.js:572`) was `esc(unlockReq(m))` but `unlockReq()` **already** returns escaped HTML → `&amp;amp;`
> → rendered "&amp;"; now `unlockReq(m)` un-escaped (matching the correct `:727` caller). Verified: `node
> -c` clean; **full 33-gate suite green**; `tech-tree.test` (36) adds a check that a gating name with `&`
> ("Add & Subtract") renders a **single** entity (not `&amp;amp;`) **and** a source guard that no
> `esc(unlockReq(` remains. No XSS regression (dynamic parts still escaped inside `unlockReq`). All
> **[A]-owned files**. T127 → DONE. *(Owner: the locked-topic subline now reads "Add & Subtract".)*

> **Previously approved (done):** `T125` [A] (celebrations FIXED — they render now + fire BIG on every
win/run/item) · live build **`c2296cf`**. **CI green.** Fixes the bug I diagnosed **and** delivers the
owner's "loads of particles, constant." **Render fix (the crux of "nothing at all"):** all three
celebration fns route through a new `fxBigBurst(opts)` that **`.resize()`s the controller THEN fires**,
plus `fxResizeAll()` (resizes `fxBg`+`fxBurst`) on **construction**, a post-layout **RAF**, **window
resize/orientation**, and **all `fullscreenchange` variants** — so the burst canvas is never left at the
stale/1×1 buffer that made it invisible after the Start→fullscreen transition. **Big + constant:** the
**`FX_RANK_MIN` gate is DELETED** (test asserts it's gone) → **EVERY completed topic run** (rank-scaled
but always), **EVERY Arena victory**, and **EVERY new inventory item** fire **`FXGL.celebrate()`**
(T126's 800-particle shower; `burst()` fallback). Verified **independently**: `node -c` clean; **full
33-gate suite green**; **`fx-wiring.test` (54)** pins the resize-before-fire, sized-after-construction
(not 1×1), fullscreen-resize, the gate removal, and each fn routing through `fxBigBurst`. All
**[A]-owned files**. T125 → DONE. **→ 🎆 OWNER: finishing ANY run + winning ANY Arena fight should now
throw a big visible particle shower — confirm it actually shows (the bug was invisibility).**

> **Previously approved (done):** `T126` [B] (FXGL big "celebration" burst — loads of particles) · live
build **`2815188`**. **CI green; collision-clean** (only `fxgl.js`, `test/fxgl.test.js`, log). Adds
`Controller.celebrate(opts)` + `CELEBRATE_CAP = 800` (>3× the brief `BURST_CAP` 256): a real firework/
shower — strong **upward launch + gravity fall**, **bigger/longer-lived** particles (life ~2.4s vs the
brief burst), bright multi-colour. **Invariants kept** (shares burst's `_ignite` path): capped at 800,
**seeded/deterministic**, **single-RAF + auto-stops + no leak**, reduced-motion → a calmer/shorter
shower, **`setQuality` degrades the count** (Poco-X3 budget). Verified **independently**: `node -c`
clean; **full 33-gate suite green**; `fxgl.test` (116) pins `CELEBRATE_CAP ≥600 > BURST_CAP`, the 800
cap, determinism, reduced-motion-smaller, **celebrate() fires >256 particles on a single RAF**, and the
quality degrade. The engine side of "loads of particles" is ready. T126 → DONE. **→ [A] `T125` wires
`celebrate()` on EVERY win/run/item — AND fixes the rendering bug (the burst controller is never
resized → likely why the owner sees "nothing at all"; that's the crux, before size).** B → stand by.

> **Also confirmed done:** `T121` [A] FULLY DONE — scroll-fade **`0972c77`** (masks the `.tree` content
to transparent at the scroll edges via `mask-image`, 3 can-scroll rules → reveals the purple backdrop,
no black `--bg` smear; 34-check tech-tree gate) + coloured icons **`b662840`** (coin gold / calendar
green). *(Record correction: I'd mis-tracked the scroll-fade as "pending" after reviewing the icons —
it had actually landed first in `0972c77`. Verified now: correct, gates green, ancestor of green CI.
That stale pointer is why A had nothing to pick up; fixed — A → T125.)*

> **Previously approved (done):** `T122` [A] (🎙 the new synth engine is WIRED & AUDIBLE) · live build
**`a4e81b8`**. **CI green.** The payoff: B's `synth.js` is now the **live music engine**. **One audio
chain:** `Synth.mount({ctx})` reuses `sound.js`'s **existing AudioContext** and its output routes **into
sound.js's master** → so the **T113 volume slider + the brickwall limiter apply to everything** (music +
SFX), and **mute silences both** (`applySoundPref` sets `Sound.setMuted` AND `Synth.setMuted`). **One
scheduler:** sound.js's old music scheduler (`STYLES`/`startScheduler`/`musicTick`/the old `wub`) is
**deleted** (−219 lines → sound.js is SFX-only) — verified no second scheduler/`setInterval` remains.
**Context routing** (`musicForScreen` mirrors `fxSetScreen`): `#game`→**solve** (CALM **by
construction** — `kickK:0`, no snare, tempo 60 < menu 80), event→**event**, `#arena`→**arena**
(phrygian/driving) with **`Synth.intensity()` driven by live boss-proximity**, else **menu**;
start-on-enter, **`Synth.stop()` when the tab is hidden** (no off-screen drain). **Wins:** `wubSting()`
fires **Synth's wub** on a real Arena victory + topic-complete/mastery (replacing the removed sound.js
wub), **ducking** the music; louder SFX stings also **`Synth.duck()`** (`DUCK_SFX`). **Tempo slider** now
re-derives the per-context spec (`synthTempoMult` × context BPM). Verified **independently**: `node -c`
clean; **full 33-gate suite green** incl. the new **`synth-wiring.test` (25)** (mount-on-shared-ctx,
routed-into-master, no-second-scheduler, context routing, calm-solve, arena-intensity, wub-on-win, duck,
mute-both, tempo→Synth) + `synth.test` (107) + `sound.test` (38, SFX-only); both synth gates registered
in `pages.yml`; `cache-bust` versions `synth.js`. All **[A]-owned files** (consumes Synth's API only).
T122 → DONE. **→ 🔊 OWNER EAR-CHECK on the Poco X3:** calm solves · driving Arena that swells near a
boss · a wub on wins · real reverb/space — all under your volume/tempo sliders + mute. **Tell me how it
sounds + any tuning** (per-context levels/tempo/reverb are easy dials now).
> **Plus `APPROVED — synth mute-idle fix`** [B] · live build **`8e1317e`** — a real gap the T122 wiring
> surfaced (B self-continued off stand-by to fix it, correctly): `Synth.setMuted` now **idles the
> scheduler** (`clearInterval`) when muted — not just zeroing the gain — so a **muted app spawns no
> silent voices** (Poco-X3 CPU/battery), and **unmute resumes** the current context. `synth.test` 111;
> CI green; collision-clean. **B back on STAND BY** (engine reactive-only now).

> **Previously approved (done):** `T120 COMPLETE` [B] (`synth.js` generative-audio engine — all 5 phases)
· live build **`976e575`** (#5 contexts). **CI green; collision-clean throughout** (only `synth.js`,
`test/synth.test.js`, `BUILDER-LOG-FX.md` across all 5 pushes — never an existing file). The principled
rebuild the owner asked for is **built**: **#1** ADSR + a 6-patch table (materially distinct graphs) +
filter-envelopes + supersaw; **#2** a real **FDN reverb** (4 damped delay lines, stable feedback, stereo
tail, music/drum sends, ducking) — the dry-sound fix; **#3** modes-by-mood + chord **progressions** +
**voice-leading** + bass-root; **#4** a single leak-free **lookahead scheduler** + Euclid + Markov +
evolving density; **#5 contexts** — `solve`/`menu`/`event`/`arena` bundling tempo·mode·density·reverb·
patches·kit so the **firm calm-vs-energetic rule holds BY CONSTRUCTION** and is **tested** (Arena denser/
faster/drier/dark-mode/wub-bass vs solve wetter/calm/soft-attack). Verified **independently** each phase;
`node -c` clean; **full 32-gate suite green**; **`synth.test` = 107 checks**. Genuinely raises the
ceiling — patches + space + harmony + groove + mood. T120 → DONE. **🎙 Engine COMPLETE but standalone —
the payoff is the [A] wiring: filed `T122` (mount `Synth` on the existing context, route contexts, fire
the wub, duck, retire the old music scheduler) as A's next; that's the moment the owner HEARS it.**

> **Previously approved (done):** `T117` [A] (all chrome emoji → house generative pixel icons) · live
build **`3e72581`**. **CI green.** New A-owned **`icons.js`** (`window.Icons`): 9×9 hand-pixelled
bitmaps rendered as **1-bit SVG `mask-image`s** so each icon **inherits its context colour** via
`currentColor` (gold coin, muted lock, mint check…) — on-brand, no image assets, no-build. `span(name)`
emits a **decorative `aria-hidden`** `.px-ic` span; `installCSS()` injects a mask rule per icon at boot;
a safe `ic()` helper no-ops if `icons.js` is absent. Covers the full swept set (lock/soundOn/soundOff/
cog/coin/calendar/swords/flag/map/star/…/backspace/close/check/play). **a11y/behaviour preserved:**
node-state badges still map **distinct icons per state** (locked=lock · unlocked=play · mastered=star ·
done=check), the Sound/Settings/Fullscreen buttons keep their `aria-label`, the numpad **⌫→backspace
icon** keeps `data-k="back"`. Verified **independently**: my own emoji sweep of every shipped file →
**0 targeted chrome emoji remain** (only `▾` left = the allow-listed T116 scroll-cue); the **`→`
answer/flow arrows + hint `↑`/`↓` are untouched** (content, not chrome); `node -c` clean; **full 32-gate
suite green** incl. the new **`icons.test` (47)** (API + each icon renders a non-empty SVG mask + the
no-emoji-remains sweep + the content-arrow allow-list) and `cache-bust` updated (icons.js versioned).
All **[A]-owned files** (icons.js is UI chrome — A's domain; no collision with B's engines). T117 → DONE.
*(Owner: the padlock/speaker/cog/coin/calendar etc. are now house pixel icons; eyeball they read clearly
on the Poco X3.)*

> **Previously approved (done):** `T120 #1+#2+#3+#4` [B] (`synth.js` engine — core+space+harmony+rhythm)
· + **`53e86e6`** (#4 rhythm/variation). **#4:** the **single lookahead scheduler** ("two clocks" — one
guarded `setInterval`, `TICK_MS 25` / `LOOKAHEAD 0.1`; `start()` won't double-fire, `stop()`
`clearInterval`s → **no leak**; one-shots use no timer); **Euclidean** kit (`euclid(k,n)` places exactly
k onsets, evenly), a deterministic **2nd-order Markov** melody walk, **motif** transforms, and **density
that evolves across a phrase**; voice-leading stays smooth (no jump > a tritone). `synth.test` **92**;
CI green; collision-clean. *(B continues → #5 contexts = the calm-solve set, menu, Arena+intensity,
event, the wub — the last phase; then the engine's complete and I spec the [A] wiring.)*
**Earlier #1+#2+#3 — #3 harmony:** `MODES` are
musically correct (`lydian` ♯4, `phrygian` ♭2, `dorian` ♮6 vs `minor` ♭6), **grouped by mood**
(bright/calm/dark for context selection); octave-aware `degToMidi`, diatonic `chordMidi` triads, chord
**progressions** with **voice-leading** (nearest-tone) + **bass-follows-root**. `synth.test` now **72**;
CI green; collision-clean. *(B continues → #4 rhythm/variation → #5 contexts.)* **Earlier (#1+#2)** below.
**CI green; collision-clean** (only `synth.js`,
`test/synth.test.js`, `BUILDER-LOG-FX.md` — no existing file touched). This is the **real principled
engine** from the T119 research, running ahead per owner ("keep pushing B"). **#1 core:** a proper
**`adsr()`** (cancel → ramp → release-end), a data-driven **patch table** (6 patches with
*materially different node graphs* — not one wave at different pitches), `renderVoice` with
**BiquadFilter + filter-envelope**, **supersaw detune/unison**, stereo pan, feeding the existing
limiter; **no scheduler/timer yet** (no leak — that's a later phase). **#2 space (the biggest quality
lever the research named):** a genuine **FDN reverb** — 4 `createDelay` lines + pre-delay, **each damped
by a lowpass** (dark tail), a unitary/Hadamard feedback matrix scaled by `decay<1` (dense but stable),
**stereo-spread** tail via panners, **music + drum reverb sends** (drums kept dryer), return to master,
and **`duck()`** dipping the music bus under a cue. Verified **independently**: `node -c` clean; **full
31-gate suite green**; **`synth.test` (55)** pins the ADSR shape, **6 distinct patch signatures /
≥4 distinct graph shapes**, the 4-line damped FDN + recirculation + sends + ducking, and no-timer-leak.
Genuinely raises the audio ceiling (patches + space — exactly the dry-sound fix). **B continues
T120 phases 3 (harmony) → 4 (rhythm/variation) → 5 (contexts) continuously; I review each as it lands.**
*(Still engine-only; the [A] wiring — mount `Synth`, route contexts, fire the wub, duck, retire the old
scheduler — is phase 6, a later [A] task I'll spec once the engine's complete.)*

> **Previously approved (done):** `T114` [A] (audio defaults baked: loud + calm out of the box) · live
build **`fdaeb25`**. **CI green.** The owner's calibration is now the default for fresh installs:
**`VOL_MAX` 2.5→4.0** (owner maxed 2.5 and wanted more → range now reaches 4×, limiter-safe); default
**volume 3.0×** (`loadVol` fallback 80→**300**, `volRange` `value` 80→300, `max` 250→**400**); default
**tempo 0.5×** (`loadTempo` fallback 100→**50**, `tempoRange` `value`→50). Saved `halves.vol`/
`halves.tempo` prefs are **untouched** (only the fresh-install fallback changed). Verified: `node -c`
clean; **full suite green**; `sound.test` (66) updated for the new default band + `VOL_MAX=4.0`. All
**[A]-owned files**. T114 → DONE. *(Owner: a cleared profile now boots ~3× loud + 0.5× tempo; nudge the
Volume slider toward 4× if 3× still isn't enough and tell me.)*

> **Previously approved (done):** `T118` [A] (BUGFIX: Skip key no longer cut off on `#game`) · live build
**`7a271a8`**. **CI green.** The core-loop bug is fixed exactly as diagnosed: `.app` height is now
`calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))`, so **app + body safe-area
padding == the viewport** and the non-scrolling `#game` can no longer push the Skip key below the fold;
the desktop `@media(min-height:1000px)` cap stays; T99 top-pin + T112 fill-screen preserved. Verified
**independently**: **full 30-gate suite green**; `home-layout.test` (28) gained a **regression-guard
assertion** that `.app` height subtracts both insets — so this can't silently come back. All
**[A]-owned files**. T118 → DONE. *(Owner: Skip should be reachable on the game screen now.)* **A
picked it up right after the `NEXT.md` canonical pointer + the direct nudge — the staleness fix is
working.**

> **Previously approved (done):** `T119` [B] (deep generative-audio research + recommended engine) · live
build **`2e0a708`** (doc). The owner's "too simple / not progressing → deep research" ask, delivered
**well**. `docs/research-generative-audio.md` (556 lines) is **substantive + applied**, not filler:
real WebAudio mappings for **ADSR** (gain automation), **filters with env+LFO** (the wub is one case),
**FM/AM**, **noise percussion**, **waveshaping**; **patch design** (contexts differ by *instrument*);
**harmony** (progressions, voice-leading, modes-for-mood, harmonic rhythm); **variation** (Markov,
Euclidean, density envelopes, seeded-evolving, motif); **calm-vs-energetic made precise**; and **mixing
& space** — correctly naming **reverb/stereo width as the single biggest quality lever** (our sound is
bone-dry) with a concrete **FDN reverb** recommendation + ducking. Ends in a clean recommendation: a
**new standalone B-owned `synth.js` → `window.Synth`** engine (harmony+rhythm → one two-clock scheduler
→ music/drum/sfx buses → reverb → the **existing limiter** → out), justified by the same collision/
reversibility logic that made `fxgl.js` work 4×, with a **6-phase build path** (front-loading patches
then space) and a headless test plan. Every owner ask (calm solves · wub · distinct intensifying Arena ·
genuine per-context character · "not progressing" → progressions/motif/evolving density) maps to the
design. **B-owned doc only; no existing file touched.** Genuinely raises the ceiling. T119 → DONE. **→
B proceeds to BUILD it: `T120` (the `synth.js` engine, phased) — pointer below.**

> **Previously approved (done):** `T116` [A] (restore the tree scroll-affordance) · live build
**`b184896`**. **CI green.** `#modeTree` is wrapped in `.picker-wrap` (reusing the existing
can-scroll-up/down fades + `.scroll-cue` ▾) and a new `updateTreeScroll()` toggles them from real scroll
metrics (`scrollTop`/`clientHeight`/`scrollHeight`), wired to tree `scroll` (passive) + `resize` +
`orientationchange` + `fullscreenchange` + **after `renderTree()`** (content-height change). Reuses the
T29 pattern (no new affordance). `node -c` clean; **full 30-gate suite green**; `tech-tree.test` (33)
covers the toggling from metrics. The "more below" fade/cue is back. T116 → DONE.

> **Previously approved (done):** `T115` [A] (music with character — calm solves, wub, distinct Arena) ·
live build **`8d3f2b0`**. **CI green.** A real increment (not trivial): a genuine **`wub()`** — saw bass
→ lowpass with a ~7 Hz **LFO on the cutoff** (Q 9, 600 Hz sweep) = a dubstep wobble — wired to **both**
win moments (`sfx("wub")` on Arena victory `:1262` and on a topic-complete/mastery unlock `:1611`). The
15 topic = **solve** styles are reworked **calm by design** (the firm rule): bpm 58–68 (slower than the
menu), density ≤0.18, **no driving kick/snare** (rests + soft hats only), **soft sine/triangle pad/bell
leads** (never a harsh square), modal scales; the **Arena** theme is the opposite — driving kick/snare,
denser, punchy square lead. Verified **independently**: `node -c` clean; **full 30-gate suite green**;
`sound.test` (now 61) asserts every solve style calm-slow + sparse + no-driving-drums + soft-timbre +
slower-than-menu, the Arena driving/distinct, and all 15 styles distinct. All **[A]-owned files**. T115
→ DONE.

> **BUT — the owner wants MORE (and is right): "too simple, doesn't seem to be progressing → do deep
> research into generative audio + apply principles."** T115 improves the *config* (scale/density/
> timbre per context) but the **synthesis is still basic** — bare oscillators + linear-ramp envelopes,
> **no ADSR depth, no filter/space/reverb, no harmony/chord-progression, no evolving variation**. So
> distinct *configs* still risk sounding samey. The real next tier needs a **principled rebuild** →
> filed **`T119` [B] (deep generative-audio research)** and routed to **Builder B** (idle; built the FX
> engine; engine/research is its wheelhouse). See B's pointer.

> **⚠ Builder A SKIPPED `T118` AGAIN** (built T115 while T118 was pointer #1 — 2nd skip of T118; the
> core-loop **Skip-key-cut-off bug is STILL LIVE on `main`**). T115 is correct so approved, **but T118
> is now urgent** — hard re-pointed below. *(Owner: if A keeps slipping past it, a one-line "build ONLY
> T118 next" nudge to A would force it, like T107.)*

---

**Previously approved (done):** `T113` [A] (live Volume + Tempo sliders — the audio finally instrumented)
· live build **`8d6e42f`**. **CI green.** The **different approach** the owner asked for: stop guessing,
let the owner calibrate. Acts on the root cause I found — `VOL_MAX = 2.5` so the **volume slider reaches
genuinely LOUD** (well past full scale; the −1.5 dB limiter keeps it clip-safe), fixing the "tiny bump
did nothing" problem. `setVolume(v)` clamps 0–2.5 and applies to `master.gain` **live**; `setTempo(m)`
clamps **0.40–1.0×** and the scheduler scales `bpm × tempoMult` **live**. Settings has a **Volume**
slider (0–250 → 0–2.50×) and a **Music-tempo** slider (40–100 → 0.40–1.00×), each with a **live numeric
readout**, plus a **Test-sound** button (`sfx("correct")` + menu music) so it's calibratable right
there. **Persisted** (`halves.vol`/`halves.tempo`, applied on boot) and cleared by Settings-reset.
Verified **independently**: `node -c` clean; **full 30-gate suite green**; `sound.test` (now 44) asserts
`VOL_MAX ≥ 2×`, `setVolume(1.6)` sets gain live, clamps to `VOL_MAX`, `bpm × tempoMult` scaling,
`setTempo(0.5)` slows + clamps to `TEMPO_MIN`, the slider rows + test button exist, and dragging applies
live. All **[A]-owned files**. T113 → DONE. **→ OWNER ACTION: open Settings, drag Volume + Tempo to
what sounds right on the Poco X3, and tell me the two values — I'll set them as defaults via `T114`**
(ideally after `T115` so the music is final when you calibrate).

---

**Previously approved (done):** `T106` [A] (tech-tree v2 — uses the width + clear relationships) · live
build **`10e3000`**. **CI green.** Each main-chain topic is now a **row** whose 1–3 **parts** run
left-to-right, derived by following the **live `requires`/`branchOf` chain** (`topicParts()` — no
parallel edge list; also fixes a latent depth-3 drop), so rows are 1/2/3-wide **as the data dictates**
(never a forced grid). Two distinct **directional, state-coloured** connectors make relationships read
at a glance: a **vertical amber CHAIN** arrow between topics (`unlockedBy`, lit when the next is
unlocked) and a **horizontal purple MASTERY** arrow between parts (`requires:mastery`, lit when the
later part is unlocked; **stretches** so multi-part rows fill toward the edges). Bigger nodes (84→96),
old `.tlink/.tcol/spine` removed, and the `flex:1` tree **grows to fill T112's reclaimed height**
(absorbs the bottom slack). `techGraph()/nodeState()/.tnode/click handler/window.TechTree` **unchanged**
— T84 invariants intact. Verified **independently**: `node -c` clean; **full 30-gate suite green**; the
**tech-tree gate (27 checks)** pins **data-driven** (spine = `unlockedBy`, branch = `requires:mastery`,
**no parallel edge list** — `:95`), **both connectors state-coloured by live unlock**, **varying-width
rows / no empty rows**, and **locked-never-start** (tap does nothing, Start stays disabled — `:80/81`).
All **[A]-owned files**. T106 → DONE. *(Owner: the tree should now fill the width with clear amber-down/
purple-across arrows and breathe into the full height.)*

> **A built T106 while T113 (owner-priority audio) was newly pointer #1 — but A was already mid-T106
> when the audio task was inserted, so this isn't a skip.** T106 is correct → approved. **`T113` (the
> live Volume+Tempo sliders) is A's next, unchanged.** Re-pointed below.

---

**Previously approved (done):** `T112` [A] (FX pass 2 — fills the screen · Arena backdrop · celebrate
wins) · live build **`54820bd`**. **CI green.** Addresses all of the owner's live-T110 feedback,
consuming B's API only. (1) **Full-bleed backdrop:** `#fxBackdrop` moved to a body-level
`position:fixed; inset:0; 100vw×100dvh; z-index:-1` layer behind the (transparent) `.app`/screens, so
the atmosphere reaches **every edge** (no dead FX margins); toggled `.hidden` per screen. (2) **Fill
the screen:** the `.app max-height:780px` phone cap is **dropped** (only a `960px` cap at
`min-height:1000px` desktop) so the column fills `100dvh` and the flex tree absorbs the slack — **no
dead band top OR bottom**; `home-layout.test` updated to assert fill-100dvh **with the top still
pinned** (`body align-items:flex-start`, not `center` — no T99 regression). (3) **Arena backdrop now**
(no wait for the 3v3 UI): `arenaFxState()` reads the **live** Enemies position
(`currentTier`/`tierRegion`/`REGION_SIZE` → region, `tierFrac`, `facingBoss` at the 12th tier) and
feeds T108 `deriveArenaScene`; `fxSetScreen(name)` paints the **home** scene on `#start`, the **Arena**
scene on `#arena`, and **stops + hides** (no RAF, no stale bleed) on every other screen. (4)
**Celebrate WINS:** `fxCelebrateWin(tier.n)` on an Arena victory (`res.win`) and
`fxCelebrateRank(rankIdx)` on a round finish, **rank-scaled with a floor (`FX_RANK_MIN=6`)** so a poor
run doesn't pop — the reward-gain burst (`showUnlocks`) stays. Verified **independently** (API names
checked against the codebase — `Enemies.currentTier/REGION_SIZE/tierRegion`, `res.win`, `tier.n`,
`rankIdx` all real + in scope): `node -c` clean; **full 30-gate suite green** incl. **`fx-wiring.test`
now 39 checks** (full-bleed layer, Arena-backdrop start, win bursts, off-screen stop+hide),
**`home-layout` 26** (fills 100dvh, top pinned), **`contrast` AA** still green. All **[A]-owned files**.
T112 → DONE. *(Owner: the FX should now fill the screen on home AND Arena, and winning a round / Arena
fight should pop a burst. Tune `.fx-backdrop opacity:.85` if it's too strong.)*

> **Builder B stays on STAND BY** — T112 wired the Arena backdrop via the existing `setArenaState`/
> `deriveArenaScene`, so it surfaced **no** new engine need. (If the owner later wants scene
> *transitions/crossfades* or a tuning hook, that'd be the next [B] task.)

---

**Previously approved (done):** `T111` [A] (complete the pixel restyle on EVERY screen + nav tidy) ·
live build **`4843824`**. **CI green.** Finishes the T100 restyle properly — a **full sweep**, not just
the 3 flagged screens: the `[data-ui="pixel"]` block now also covers hero-detail (`.hd-head`/`.hd-port`/
`.hero-stat`/`.hd-boost`/`.hero-chip`), results (`.slow-item` + `.rankline canvas`), and a wide swath
of the rest (`.inv-tab`/`.inv-cell`/`.mode-row`/`.tp-row`/`.map-row`/`.arena-map-btn`/`.ar-port`/
`.ar-enemy`/`.ah-port`/`.u-cell canvas`/`.toast`/`.pq-tile`/`.set-danger`/`.practice-hint-toggle`/
`.jump-top` …) — squared + hard-framed, **all gated on `[data-ui="pixel"]`** (classic byte-for-byte
unchanged), clean-text kept. **Nav tidy:** label **Settings → `Setup`** (long label gone — asserted),
and `.navbtn min-width 44→60px` so the 7 buttons wrap **balanced (5+2 / 4+3), never the orphaned
6+1** (test pins min-width ≥58 → "never 6+1", so the lone Exit is fixed). Verified **independently**:
**full 30-gate suite green** incl. **`contrast.test.js` AA still green** (the sweep didn't drag any
text contrast) and **`ui-restyle.test.js` now 40 checks** (the new selectors are gated + the nav
label/layout). All **[A]-owned files**. T111 → DONE. *(Owner: the hero-detail, results, inventory,
arena, toasts should all read squared now, and the nav is one tidy block with no lone Exit.)*

> **Next: `T112` — FX pass 2 (owner's live-T110 feedback):** full-bleed the backdrop (fill the
> screen), wire the **Arena** backdrop (T108, no need to wait for the 3v3 UI), **celebrate WINS** (not
> just collectible gains), and reduce the wasted margins. Re-pointed below.

---

**Previously approved (done):** `T110` [A] (FX wiring pass 1 — the engine is now VISIBLE) · live build
**`349fcf7`**. **CI green.** 🎉 **First integration of Builder-B's FX engine into the live app** — and
it consumes B's API only (`fxgl.js` **not** edited). Mounts two guarded controllers (no-op if FXGL
absent): a home **backdrop** (`#fxBackdrop`, inside `#start`, `z-index:-1` under an `isolation:isolate`
context so it sits behind the DOM, `opacity:.85`, `pointer-events:none`, `aria-hidden`) driven by
**`setHomeState(homeFxState())`** and a fixed app-level **burst** overlay (`#fxBurst`, `z-index:58`
under toasts, tap-transparent). **`homeFxState()` reads REAL sources** (verified the API names against
the codebase): collection progress `have/total` ∈[0,1], `loadMomentum().count` streak, and
`Events.today()` → `{seed:artSeed, name, palette:paletteFor(rarity), mood}` — **never constants**.
`show()` starts the backdrop **only** on `#start` and **stops it (idle, no RAF) on every other
screen**. `fxCelebrate()` hangs off **`showUnlocks()`** — the single surface **every** reward gain
routes through (`finishBattle` Arena-win loot `:1206`, normal collectible gains `:1332`, event rewards
`:1568`) — firing `FXGL.burst()` **seeded + palette-coloured from the gained items**, capped, over the
unlock modal; reduced-motion handled by the engine. Verified **independently**: `node -c` clean; **full
30-gate suite green** incl. B's `fxgl.test.js` (102) + the new **`fx-wiring.test.js` (29)** which boots
real `main.js` with a stub FXGL and proves 2 controllers, **home derives from live state + starts**
(progress **>0** from a seeded collection — not a constant), **leaving home stops the RAF**, and a
**real Arena-win loot gain fires a burst** with valid `{x,y,count,seed}`; `cache-bust.test.js` correctly
bumped 14→15 refs (the bust versions `fxgl.js` too). All **[A]-owned files**; collision rule intact.
T110 → DONE. *(Owner: eyeball the live home — a subtle state-driven backdrop should sit behind the
tree without hurting readability, and earning a collectible/loot/event reward should pop a brief burst.
Flag if the backdrop is too strong; the `.fx-backdrop opacity:.85` is the dial.)*

> **Note — A skipped `T111` again** (built T110 while T111 was pointer #1; pulled the queue before the
> re-point). T110 is correct + high-value so approved on merits. **T111 (the full pixel-restyle sweep +
> nav tidy) is still A's next** — re-pointed below.

---

**Previously approved (done):** `T107` [A] (asset cache-busting — SHIPPING BLOCKER cleared) · live
build **`f1d4d6d`**. **CI green** (the bust runs inside the deploy job → the uploaded `index.html` is
versioned). **A finally did T107 after the owner's direct nudge.** Clean, no-build-preserving design:
`scripts/cachebust.js` exposes a **pure** `bust(html, ver)` that appends `?v=<ver>` to every **local**
`.css`/`.js` `href`/`src` (regex skips schemes + existing queries → Google-Fonts/preconnect untouched,
idempotent); as a CLI it rewrites in place **and verifies no bare local ref survives** (exit 1). The
`pages.yml` step runs it with **`${GITHUB_SHA:0:7}` — the same short sha `build.json` stamps** — **after
the node gates** (they see clean bare refs) and **before upload** (the deployed copy is fully
versioned). **Source `index.html` stays bare** (no-build intact). Verified **independently**: ran the
rewriter on the real `index.html` → **all 14 local refs versioned** (`styles.css` + 13 module scripts),
**zero bare refs left**, **externals untouched**; `node -c` clean; **full 29-gate suite green** incl.
the new **`cache-bust.test.js` (38 checks)** which pins source-stays-bare, no-bare-after, same-sha-as-
build.json, and the **CI ordering** (bust after the last `test/` gate, before `upload-pages-artifact`).
Because the `?v=` matches `build.json`'s shortSha, the **T54 refresh bar now lands users on fresh
assets**. (Residual GH-Pages edge — `index.html` itself can soft-cache up to its max-age — is the known
platform limit the DoD explicitly allowed the `?v=`+version-check fallback for; a network-first SW is
T102 territory.) **No more stale deploys / hard-refreshes — every future visual review is now
trustworthy.** T107 → DONE.

> **Now wiring the FX (owner's "put it everywhere" vision).** With T107 done, deploys are trustworthy,
> so it's the moment to make B's four built-but-unwired capabilities **visible**. Queued **`T110`** as
> A's next (ahead of T106): **FX wiring pass 1** — mount `FXGL`, the **home backdrop** (`setHomeState`
> from live event/progress/streak), and **celebration bursts** (`FXGL.burst()`) on wins + collectible/
> loot/event gains (subsumes `T94w`). Arena biome wiring stays later (needs the T89/T90 Arena UI).
> *(Owner: this is me driving the visual mandate; say the word if you'd rather I hold FX behind the
> shipping/perf block.)*

---

**Previously approved (done):** `T108` [B] (semantic Arena-biome derivation) · live build
**`86a7094`**. **CI green.** Fourth Builder-B handoff (self-continued, no nudge). **Collision rule
honoured** (only `fxgl.js`, `test/fxgl.test.js`, `BUILDER-LOG-FX.md`). Adds `deriveArenaScene(state)`
+ `Controller.setArenaState` — a `setScene`-shaped backdrop from **live Arena state** (place + status,
not noise): **10 distinct region palettes** + accent kinds (Cinderwaste embers / Frostpeak snow…) for
sense of place; **boss-proximity dominates intensity** (denser particles + hotter/brighter glow as the
boss nears; `facingBoss` pins it to 1.0), **tier lifts the baseline** (deeper = tenser); **victory**
warms/brightens + adds embers, **defeat** dims. Accepts the **real `scenery.js` region grid** and
**recolours it** by the live palette. Verified **independently**: `node -c` clean; **full fxgl gate
green (102 checks, +20 for T108)** — deterministic per state, all-10-palettes-distinct, capped
(`ARENA_PARTICLE_MAX`), out-of-range region clamps, single-RAF, idles when stopped, textures-once;
**full 28-gate suite green**. Standalone — the **[A] side** feeds it region/tier/boss/mood. T108 →
DONE. *(Engine-side only; nothing visible until [A] wiring.)*

> **B's FX-engine queue is now EXHAUSTED — and intentionally NOT extended.** B has shipped four
> collision-free engine capabilities (T93 ambient · T94 burst · T95 home backdrop · T108 Arena biome),
> **all headless-perfect but ALL UNWIRED** — none is visible in the app yet. Manufacturing a 5th
> engine task would be padding (anti-dilution rule). **The real lever now is the FX [A] WIRING**, which
> B cannot do. So B's pointer is set to **STAND BY / optional brickmap hardening** (below), and I'm
> recommending to the owner that a **first FX-wiring [A] task jump the queue right after `T107`** so
> all of B's work becomes visible and B's future work is grounded in real integration needs.

---

**Previously approved (done):** `T100` [A] (gamey pixel-bevel restyle, reversible) · live build
**`6fc8f99`**. **CI green.** Implements the T97-researched, owner-approved direction. `<html
data-ui="pixel">` ships the look **on**; **every** new rule is gated on `[data-ui="pixel"]` (the
classic CSS above is the untouched fallback) so **one attribute flip → `"classic"` fully reverts** —
verified: no ungated selector was added (grep), classic `.btn`/`.event-banner` rules intact, and the
only `index.html` change is the attribute. Token block `:root[data-ui="pixel"]{--ui-radius:2px;
--ui-bevel-hi/-lo; --focus}`. Buttons (`.btn/.eb-play/.el-play/.key/.navbtn/.ub-refresh/.set-row`):
squared radius + **pixel-bevel** inset shadows + **invert-on-`:active`** (a real press) + a **2px amber
`:focus-visible` ring** (a11y). Panels (`.event-banner/.topic-info/.tnode/.sum-row/.inv-cat/
.hero-card/.arena-*/.modal-card/.u-cell`): squared + `box-shadow:none` hard frame. **Clean-text rule
honoured** — no `font-family` in the block, so labels/numerals stay `--display`/`--mono` (kid
legibility); the bitmap font stays decorative-only. Verified **independently**: **full 28-gate suite
green** incl. **`contrast.test.js` AA still green** (bevels are inset shadows — text/bg contrast
unchanged) and the new **`ui-restyle.test.js` (18 checks)** asserting ships-on, the token block,
reversibility (every selector gated; classic intact), bevel+invert-press+focus-ring, squared
hard-framed panels, and the clean-text rule. All **[A]-owned files**. T100 → DONE. *(Owner: eyeball
that it reads "game, not web-app"; `data-ui="classic"` restores today if you dislike it.)*

> **⚠⚠ SEQUENCING — A has now skipped `T107` TWICE** (built `T104`, then `T100`, each time the
> pointer's #1 item was `T107`). Likely A picks the lowest-numbered / most-visible OPEN task and
> `T107` (infra, higher id) keeps losing. Both builds were correct so approved on merits — **but the
> cache-busting SHIPPING BLOCKER is still undone.** Re-pointed below as the SOLE next item; owner also
> offered a direct one-line prompt to enforce it. (See owner note.)

---

**Previously approved (done):** `T95` [B] (semantic home backdrop on `fxgl.js`) · live build
**`beedfd8`**. **CI green.** Third Builder-B handoff, and **picked up with NO human nudge** (the
self-continue is working). **Collision rule honoured** (only `fxgl.js`, `test/fxgl.test.js`,
`BUILDER-LOG-FX.md`). Adds `deriveHomeScene(state)` → a `setScene`-shaped ambient backdrop **driven by
LIVE home state, not noise** (the effect names its purpose: **status**): today's-event palette/seed
**dominate**; **progress raises the horizon glow** (momentum); a **streak ≥3 flips calm motes → warm
embers** ("on a roll"); seed is state-derived so **same state → same backdrop, and it shifts because
the state changed**. `Controller.setHomeState(state)` wires it through `setScene`. Verified
**independently**: `node -c` clean; **full fxgl gate green (82 checks, +15 for T95)** — deterministic
per state, textures uploaded **once**, **single RAF** (one draw/frame), **idles when stopped**
(off-home → no RAF), **reduced-motion → static still** (no loop); **full 27-gate suite green**.
Standalone — the **[A] side** reads real home state (event/progress/streak) and calls `setHomeState`.
T95 → DONE. **Builder B's specced engine trio (T93·T94·T95) is COMPLETE.** Pointer advances to **T108**
(semantic Arena-biome derivation — the Arena sibling of T95) to keep B on collision-free work while
the FX **[A] wiring** is sequenced. *(Note: nothing FX is visible until [A] mounts `FXGL`; the wiring
is the real payoff — see the owner note below.)*

---

**Previously approved (done):** `T104` [A] (legible fraction glyphs ½/¾) · live build **`c6a96da`**.
**CI green.** Replaces the T56 **stacked** vulgar-fraction (a 3-wide vertical num·bar·den that turned
to mud at the ~22px tree-node size) with a **5-wide diagonal slashed** form — numerator top-left
(cols 0–2, rows 0–3), denominator bottom-right (cols 2–4, rows 5–8), a clean staircase slash from
bottom-left to top-right. Only `parse()` frac `w:3→5` and the `stamp()` frac branch change; the token
DSL is **unchanged** (`f12`/`f34`), so `modes.js` `TOPIC_GLYPHS` correctly needs no edit. Verified
**independently** (rendered the actual grids, not just the test): `f12`→`1/2`, `f34`→`3/4` both
`missing:[]`, **visibly distinct**, slash legible, numerator/denominator separated (no crammed
stack); confirmed `f12`/`f34` are the **only** fraction tokens in `modes.js` (no glyph references a
digit outside `SMALL`). `node -c` clean; **full 27-gate suite green** (the width 3→5 change didn't
regress the tech-tree node layout); `glyphs.test.js` (32 checks) asserts the new diagonal form
(5-wide, diagonal corners inked, **no full horizontal mid-bar**, num upper-left / den lower-right,
½≠¾). T104 → DONE. *(Owner: eyeball the Fractions `¾` + Fractions-of `½n` marks at node size — should
now read as the fraction, not a blob.)*

> **Sequencing note:** A built **T104** while I'd re-pointed it to **T107** (the cache-busting
> shipping blocker) — it pulled the queue in the window before the T107 insert was visible. T104 is
> correct, so approved on merits — **but T107 is still undone and is the priority.** Re-pointed below.

---

**Previously approved (done):** `T94` [B] (celebration-burst capability for `fxgl.js`) · live build
**`4a58b3f`**. **CI green.** Second Builder-B handoff — **collision rule honoured** (only the 3
B-owned files: `fxgl.js`, `test/fxgl.test.js`, `BUILDER-LOG-FX.md`; **zero edits to any existing
Halves file**). Adds a brief, transient **celebration burst** to the engine: new public
`FXGL.burst({ x, y, count, seed, palette })` (plus internal `seedBurst`/`burstPos`/`burstMaxDeath`)
animated **in-shader from a static buffer** via a **closed-form drag trajectory** (`exp(-k·lt)` — same
recipe in both the GLSL and WGSL paths), so a burst is a one-time upload + one instanced draw/frame.
Verified **independently** (not just trusting the log): `node -c` clean; **full fxgl gate green (67
checks, +21 for the burst)**. The three spec-critical invariants are each pinned by a test, and I
re-ran them:
- **Capped** — `seedBurst` and a live controller `burst()` both clamp to **`BURST_CAP = 256`** even at
  `count: 99999` (separate budget from the `PARTICLE_CAP = 512` ambient field).
- **Seeded + deterministic** — same seed → byte-identical buffer; different seed → different burst
  (closed-form trajectory, no per-frame RNG).
- **Auto-stops, no leak** — particles self-expire (`alpha 0` before birth / after `birth+life`); the
  controller idles the RAF and **releases the burst buffer** on completion (`burstCount() → 0`,
  `rafId → 0`); a burst **over a running ambient scene** still keeps **one** RAF in flight and **never
  re-uploads** the scene textures; reduced-motion fires a calmer (scaled-down) flourish that also
  auto-stops cleanly.
Standalone (no edits to Halves needed); **[A] wiring is a later task** (fire on reward/loot/event
gains). T94 → DONE. Builder B pointer advances to the **T95 engine side** (semantic home backdrop).

---

**Previously approved (done):** `T99` [A] (home top-band + nav + banner N/3) · live build
**`a3608c0`**. Landed in two passes: the layout/nav came in `d1ac5e0` (good), I changes-requested the
missing third deliverable (premature "Reward earned" tag), and the fix landed in `a3608c0`. **CI
green on `a3608c0`.** All three deliverables now correct:
- **Top-band reclaim** — `body` flips `align-items:center → flex-start` while `.app` keeps its
  `max-height:780px` cap, so on a tall (fullscreen) viewport the leftover falls to the **bottom** and
  every `inset:0` screen starts flush at the top (correct read of the owner's fullscreen-correlation
  note). **Banner pinned** (`#start` pad `20→12`, `.event-banner` margin-top `14→0`, `.tree` `14→12`).
- **Tidy nav** — icon-only `.navbtn.util` dropped; Sound/Settings/Screen become labelled
  `.nav-emoji`+`.nav-lbl` buttons matching the four primary ones (gap `8→6`, one uniform row);
  `syncSoundButtons` flips only the `.nav-emoji` span, fullscreen sync only the `.nav-lbl` span (both
  keep the text label, `innerHTML` fallback).
- **Banner N/3 (the fix)** — `renderEventBanner()` now counts owned tiers across the **exact** keys
  `award()` writes (`["", ":well", ":ace"]` → `got`) and renders
  `got>=3 ? 'All rewards earned' : got>0 ? got+'/3 rewards earned' : 'Today’s event'`; Play CTA flips
  to "Again" only once `got>0`. **No more "Reward earned" on mere show-up** (grep confirms the binary
  string is gone). Verified **independently**: `node -c` clean; **full 27-gate suite green**; the new
  `home-layout.test.js` (now 26 checks) boots the home with a frozen UTC day and seeds **0 / 1 / 3**
  owned tiers, asserting the tag reads `Today’s event → 1/3 rewards earned → All rewards earned`
  (never "Reward earned" at 0), plus a source check the old binary tag is removed. All **[A]-owned
  files only** (no collision). T99 → DONE.

> **⚠ Owner screenshot at `a3608c0` showed the band STILL present + the OLD "Reward earned" tag —
> diagnosed as a STALE-ASSET CACHE artifact, not a T99 regression.** Tell-tale: the content is
> *centered* (≈equal dead bands top AND bottom) = the pre-T99 `align-items:center`; the new
> `flex-start` would push all slack to the **bottom only**. And the banner shows the **old** binary
> tag — which `a3608c0`'s code can no longer produce. Both old behaviours appearing **together** at a
> fresh build stamp ⇒ the browser is serving cached `styles.css` + `main.js`, while `build.json`
> (`cache:"no-store"`) reports the new SHA. Root cause: **assets have NO cache-busting** (bare
> `href="styles.css"` / `src="main.js"`; GH-Pages default `max-age`), and the T54 version-check only
> *offers a manual refresh* — it does not bust the asset cache. **A hard-refresh (or private tab)
> will show the real T99 result.** Filed **`T107` (asset cache-busting)** at the FRONT of Builder A's
> queue: every future owner review is untrustworthy until a deploy reliably ships fresh assets. T99
> itself stands approved.

---

**Previously approved (done):** `T98` [A] (audio too quiet — raised + limiter) · live build
**`5c26f9b`**. `VOL` **0.30 → 0.80** (≈2.7× louder; mute/unmute still toggles 0↔VOL) **plus a
brickwall LIMITER** (DynamicsCompressor, −1.5 dB, knee 0, ratio 20, 3 ms attack) on
`master→limiter→destination` — so clipping is impossible **by construction**, not by estimate;
graceful direct-wire fallback if `createDynamicsCompressor` is unavailable. Verified: `node -c`
clean; **full 26-gate suite green**; `sound.test.js` (+ limiter assertions) confirms `VOL=0.80` in
the 0.70–0.85 band, exactly one compressor wired master→limiter→out (no direct master→destination),
brickwall config (ratio≥20, hard knee, −1.5 dB, fast attack), and **worst-case pre-limiter peak
≈0.508 < 1.0** (limiter is a backstop, not a crutch). T98 → DONE. *(Owner to confirm it's
comfortably loud on the Poco X3.)*

**Previously approved (done):** `T88` [A] (Arena 3v3 battle model + calibration — the crux) · live
build **`f5b44fa`**. (A finished this in-flight before switching to the front-end polish, as noted.)
Faithfully implements the **IDEAS I5** calibration: a deterministic `simulateTeams` (spd order,
fixed targeting best-matchup→lowest-hp→ord, `max(1,round(atk×matchup))`, wipe-to-decision, **zero
RNG**, guard-capped); enemy budget model (`atk×hp=budget`); `FOE_BUDGET` computed at load =
`min(geometric ramp, suffix-min envelope × CAPF)` — **ramp pinned so one starter clears tiers 1–5**,
**tier-120 pinned between near-full & 85% edges**; enemy team = tier foe + 2 `tier−K` adds.
**Additive — `statBattle` (1v1) UNCHANGED, live Arena untouched until T89.** Verified
**independently** (my own lattice via the public API, not just their test): **deterministic**;
**tiers 1–5 winnable by a SINGLE starter at 0 items**; foe budget **monotonic non-decreasing**
(plateaus OK — invariant is non-decreasing); **0 violations of monotonicity in loadout AND team
size**; **tier-120 near-max-only** (full wins · 50% loses · 0 loses); `statBattle` preserved.
`node -c` clean; **full 26-gate suite green** (new `arena3.test.js` 24-check lattice + the 1v1
`arena.test.js`). The literal "one-item flips tier 120" is reframed as the **chunk-flip** (one item
<0.1% of a 3-hero team) with the 1-item flip kept proven for the 1-hero case — sound. T88 → DONE.
**Perf note (→ T103):** `FOE_BUDGET` runs ~hundreds of sims at module **load** — candidate to
memoize. **`T89`/`T90`** (team UI + playout, which wire `teamBattle` into the live Arena) remain,
**after the shipping block** per owner priority.

**Previously approved (done):** `T93` [B] (FX engine `fxgl.js`) · live build **`f3eb20e`**. **🎉
First Builder-B handoff — collision rule honoured perfectly** (only the 3 new B-owned files:
`fxgl.js`, `test/fxgl.test.js`, `BUILDER-LOG-FX.md`; **zero edits to any existing Halves file**).
A standalone WebGPU→WebGL2→CPU-still FX engine: clean `window.FXGL` API (`mount/setScene/start/
stop/setQuality/dispose/capabilities`); Bayer dither + luminance-ramp palette quantise + capped
**deterministic** particle field; `setScene({grid,palette,particles,seed})` where **`grid` is the
exact COLS×ROWS shape `scenery.js` emits** (drop-in for the [A] wiring). Verified **independently**:
`node -c` clean; **zero deps/bundler**; `fxgl.test.js` (**46 checks**) passes — single RAF / one
instanced draw per frame / textures uploaded once / idle when stopped / quality-clamp degrade /
**no-GPU→CPU still** / **reduced-motion→static** / **bundles NO brickmap Rust/WASM** (recipes
ported). brickmap borrowing recorded in `BUILDER-LOG-FX.md`. Correctly **does NOT touch
`pages.yml`** (gate registration is the [A] wiring task). Existing 24 gates still green (B touched
nothing). T93 → DONE. *(The `fxgl.test.js` gate gets CI-registered by the first [A] FX-wiring task.)*

**Previously approved (done):** `T97` [A] (UI-direction research · **doc only**) · build
**`793d7fa`**. `docs/UI-DIRECTION-RESEARCH.md` (241 lines); **doc + BUILDER-LOG only** — no code/
gates touched (verified). Substantively answers (1)–(5), grounded in the **live CSS**: §1 audit
(real `border-radius` tallies, the `.btn radius:14px` pill, 13 soft shadows, Space-Grotesk →
diagnosis "pixel/RPG content in a soft rounded web-app frame"); §2 four UI languages (pixel/8-bit ·
JRPG window · exposed-tech mono HUD · modern angular) each w/ **no-build CSS** (bevel box-shadows,
`clip-path`, procedural 9-slice `border-image`) + harmony + legibility risk; §3 per-component
treatments (buttons-first, real bevel CSS); §4 honest constraints (**pixel-bevel frames NOT body
text** for kid legibility · focus ring · ≥44px · AA · no-build · **`data-ui` token reversibility**);
§5 ranked **pick** (exposed-tech HUD + pixel-bevel low-radius buttons + JRPG framing on big screens;
clean text) + a **buttons-first reversible phased plan** + **FX co-design** + success/kill criteria.
Concrete + reversible, not a punt. T97 → DONE. **4 open questions raised for the owner** (relayed in
chat) — the restyle itself is a later task pending the owner's direction pick.

**Previously approved (done):** `T96` [A] (home-screen overhaul) · live build **`0d19c72`**.
Addresses both owner screenshots. `#start` is now **`justify-content:flex-start`** (top-aligned —
kills the empty top band); the **big top `#mark`/`#tag` are gone**, consolidated into **one compact
`#topicInfo` row** (glyph · name · have/total · best — no more duplicate top-mark + detail panel);
the **List/Tree toggle + home list (`#modeTabs`) are removed → tree-only home picker** (`.tree` is
the `flex:1 1 auto; min-height:150` element, takes the freed space); the banner Play CTA is a small
**pill**; the nav is **one `#navRow`** of icon buttons (Best/Items/Heroes/Arena + util sound/
settings/fullscreen) with `.navbtn.hidden` so it **degrades under gating**. A big, clean deletion
(`-148` main.js: `renderTabs`/`modeRow`/`renderMark`/`renderBest`/`setPickerView`/`updateScrollCues`/
the toggle). Verified **independently**: `node -c` clean; **ZERO orphan references** to the removed
ids/functions (grep clean — no dangling `$("mark")`/`renderBest`/etc.); **full 24-gate suite green**
(tech-tree updated to **tree-only + Best-Times list fallback**, events banner-above-tree, glyphs
`.ti-glyph`, practice/guide-action select-via-tree). T96 → DONE. *(Headless can't judge the final
look/one-screen fit — **owner to eyeball** that the tree now breathes and it fits.)*

**Previously approved (done):** `T92` (event reward tiers) · live build **`dff92ea`**. **⚠️ Built
OUT OF ORDER** — `T96` (home overhaul, owner-active) was queued ahead but the Builder pulled `T92`
(race: started it before the T96 insert was visible). T92's work is sound, so approving; **`T96`
is firmly next.** Closes the skip-to-win exploit: each event now has **3 tiers** —
**participation** (kept `event:<id>` id/name/rarity, migration-safe; = completion), **`:well`**
(rarity +1; ≥0.7 clean-score) and **`:ace`** (legendary; flawless `score===total`). `eventTiersEarned`
is **skip-proof** (skips never enter `times`/`score`, so they can't reach the higher tiers);
`finishEvent` grants every earned tier **live-only + idempotent per tier**, **upgrading on replay/
recurrence** without removing owned. 42 event collectibles (14/14/14), all carrying buffs (feed
Arena). Verified **independently**: 42 items, ascending rarity per event (ace=legendary), **0**
missing buffs, **0** digit leaks; tier logic 0/12→participation, 9/12→+well, 12/12→+ace; **Arena
re-proved on the grown pool** (`arena.test.js` green, def auto-scaled 523→583); catalogue 818→846;
`node -c` clean; **full 24-gate suite green** (`events.test.js`→87). T92 → DONE.

**⚠️ Sequencing note:** Builder skipped the higher-priority `T96` (second slip from a queue-pull
race). No harm — T92 is correct — but `T96` (home-screen overhaul the owner is actively iterating)
is now firmly the next task.

**Previously approved (done):** `T87` (onboarding gating II) · live build **`ad0e6cc`**. **🎉
Completes the gating block (T86+T87).** Wires the full ladder on the T86 engine: Practice←first
`init:`, Heroes←first loot/mastery, Arena←a hero owned, Gold/Momentum readouts←first earned, the
**event banner←≥3 games** (owner's "a few runs"), each revealed with a **one-time coachmark**
(highlights now a **queue paced by the toast cap** — no spam). `checkGates()` evaluates on
return-home/init; `applyGates()` hides each gated control (multi-element, e.g. Gold+Momentum);
`renderEventBanner()` withholds the banner until unlocked (live/countdown unchanged once shown);
deep-link guards added for `#/heroes`, `#/arena`, `#/hero/*`. **Migration-safe** (legacy = all
unlocked, never re-gated). **Access layer only** — `arena.test.js` green. Verified independently:
`isHeroUnlocked` exported by `heroes.js`; `node -c` clean; **full 24-gate suite green** incl.
`onboarding.test.js` extended to 50 checks (each milestone's unlock, the ≥3-games banner withhold,
deep-link blocks, full legacy bypass). T87 → DONE.

**Previously approved (done):** `T91` (BUGFIX: compact event banner) · live build **`303c072`**.
Fixes the owner-reported home-layout break: `renderEventBanner()` is now a **compact strip** —
84×54 emblem · tag+name+inline countdown · an **inline Play** button — with the **multi-line blurb
dropped** from the home banner (still on the play screen). `.event-banner` is bounded
(**`max-height:84px`**, ~280px→84px), `.picker-wrap` gains **`min-height:148px` (~3 rows)** so the
banner can't starve it, margins tightened throughout, and `#eventBanner` **moved above `#mark`**
(order: banner → mark/tag → toggle → picker) so the selected-topic mark isn't stranded. Keeps art
+ name + **Play→`startEvent`** + the **00:00-UTC countdown** (owned → "Reward earned"/"Again"); bumped
`.eb-tag` to 10px (contrast gate). **T86's `applyGates`/gated `invBtn` still intact.** Verified:
`node -c` clean; **full 24-gate suite green** incl. `events.test.js` +5 T91 checks (bounded height,
no home blurb, picker min-height, banner-above-mark, Play+countdown preserved). T91 → DONE.
*(Headless can't measure true pixel-fit; the CSS budget reclaims ~240px so `#start` should now fit
one screen — **owner to confirm on-device** it no longer scrolls on their phone.)*

**Previously approved (done):** `T86` (onboarding gating I) · live build **`0fe0608`**. **⚠️
Built OUT OF ORDER** — `T91` (the priority banner-layout bugfix) was queued ahead of it but the
Builder pulled `T86` (it pulled the queue before the T91 insert was visible). T86's *work* is
sound, so approving it; **`T91` is still OPEN and is now firmly the next task.** The onboarding
engine: `halves.unlocked` model with `isFeatureUnlocked`/`unlockFeature`/`needsIntro`.
**Migration-safe (verified):** `profileHasProgress()` (any collected / `stats.games>0` / any board)
stamps `{legacy:1}` → **all features unlocked, never re-gated**; only a genuinely empty profile is
gated. First-run: `startIntro()` runs **ONE** trivial question ("half of 12"→6, numpad-safe, not a
topic round); solving grants its reward (`solve:halves:12`) + `unlockFeature("inventory")` + a
**one-time** pulse/coachmark; skipping still completes (never traps). `applyGates()` hides the
Inventory nav until unlocked; the `#/inventory` deep-link is guarded. **Access layer only** — earn/
collection/Arena untouched (`arena.test.js` green). Verified independently: `node -c` clean; **full
24-gate suite green** incl. new `onboarding.test.js` (23 checks: fresh-vs-**legacy migration**,
single-question intro, Inventory unlock+reveal+reward, once-only highlight, deep-link block,
reload persistence). T86 → DONE.

**⚠️ Sequencing note:** Builder skipped the higher-priority `T91`. No harm (T86 is correct), but
`T91` must come next — and T91 now also needs to account for T86's home-screen additions
(`applyGates`, the gated `invBtn`). Recorded so the ledger stays accurate.

**Previously approved (done):** `T85` (Settings + "Clear all data") · live build **`ebc4182`**.
A new **Settings screen** (reachable via a `⚙ Settings` link on home; mute toggle folded in) with a
**Danger-zone "Clear all data"** behind real friction: a `#resetModal` needing **BOTH** a 5s
**countdown** AND re-entering a shown random **4-digit code** on the numpad — `resetCanConfirm()`
gates the button, with a **double-guard** on the Confirm click; cancel/backdrop safe.
`clearAllData()` wipes via a **`halves.` prefix scan** (catches every key) + enumerated + per-mode
`halves.hof:*` board fallbacks, drops in-memory caches, and **reloads to first-run**. Verified
**independently**: **every** localStorage key the app writes is `halves.*` (incl. `LAST_KEY=
"halves.mode"`, `boardKey="halves.hof:"+id`) so the scan is total; `node -c` clean; all new ids
resolve; **full 23-gate suite green** incl. new `settings-reset.test.js` (16 checks: wrong-code →
no wipe, early-press → no wipe, **both-conditions enable**, confirming clears **every** key incl.
an **unknown future key + per-mode board** → first-run + reload). T85 → DONE. *(Note: the Settings
screen's own access will be folded into the T86/T87 onboarding gating; not a T85 issue.)*

**Previously approved (done):** `T84` (tech-tree view) · live build **`82cf48a`**. **🎉 Completes
the Phase 6.8 tech-tree block (T83+T84).** A toggleable, **data-driven** tech tree on the picker:
`techGraph()` derives the spine from `unlockedBy` and Part-2 branches from `requires:"mastery:<id>"`
(live mode fields, graceful on orphans — **no parallel edge list**); `nodeState()` =
locked/unlocked/mastered/done from `isUnlocked()`+progress. Nodes are **focusable `<button
role=tab>`** with the topic icon via a **single swappable `nodeIcon()` hook** (T56 glyph today,
richer T82 art later), a badge, and `have/total`; a selected-node detail panel reuses the shared
T83 Play/Practice/Guide actions. **Locked nodes select-for-preview but never start.**
`setPickerView()` toggles **List⇆Tree and persists** (`halves.pickerView`); the grouped **list
stays the default a11y fallback**. Verified **independently**: data carries the edges (15 modes,
single `halves` root, 9 `unlockedBy`, 5 `requires:mastery`, none dangling); `node -c` clean; **full
22-gate suite green** incl. new `tech-tree.test.js` (20 checks: spine/branch edges = live data,
every mode once, fresh-profile states, toggle+persist, **locked-not-startable**, list-fallback
restored, `nodeIcon` hook). 360px-safe (≤2-wide rows, 84px nodes). T84 → DONE.

**Previously approved (done):** `T83` (guide → first-class Play·Practice·Guide action) · live
build **`fdd9313`**. A third **"Guide"** button joins Start + Practice in `.start-actions`;
`renderStartState` gates it on `Guides.has(mode.id)` (enabled even for **locked** topics so
their guide can still be previewed — Start/Practice stay lock-gated). The per-row **`?`**
(`.mr-guide`) markup + handler are **removed**; picker rows (incl. locked) are now **selectable**
for preview, and `start()` still hard-guards `isUnlocked`. CSS resized the action row
(`flex:1 1 0; min-width:0`, gap 12→10, padding trimmed) so **three buttons fit at 360px**.
Verified **independently**: `node -c` clean; **zero `mr-guide`/`data-guide` orphans** in
js/css/html; **full 21-gate suite green** incl. the new `guide-action.test.js` (11 checks:
peer placement, enable-with-guide, disable-without-guide, **locked-topic preview still opens**,
modal open/close, orphan-removal). T83 → DONE.

**Previously approved (done):** `T82` (visual-direction deep research · doc only) · build
**`7278b94`**. New `docs/VISUAL-DIRECTION-RESEARCH.md` (339 lines); **only the doc + BUILDER-LOG
changed** — zero `.js`/CSS/HTML/gate touched (verified), so all gates stand. Substantively
answers (1)–(7): §1 aesthetic teardown → 7 voxel-free techniques w/ real impl + cost (Bayer
dither, palette-ramp LUTs, instanced particle splats, atmospheric fog, banding, mono HUD, chunky
forms); §2 a build-ON inventory of every generator + a grid→texture→shader composition plan
(guardrail honoured); §3 all 5 stacks scored vs the **3 crown jewels** w/ a scorecard; §4 real
Android delivery (TWA/Bubblewrap → AAB, manifest+SW+assetlinks, API 26, **WebGL2 baseline /
WebGPU progressive**, cheap-tablet fill-rate, clean COPPA) tied to T72; §5 perf principles +
degrade ladder + keeping `perf.test` meaningful; §6 a **Node-verification-preserving** gating
plan (pure-fn + budget-invariant + WebGL-stub tests) w/ honest limits; §7 ranked pick + phased
A/B/C plan w/ explicit **spike success AND kill criteria** ("revert = one commit"). **Recommends
(a) hybrid DOM + WebGL2 FX layer + (e) TWA delivery**, composing — never replacing — our seeded
generators. **Honesty noted + correct:** discloses `00-1/brickmap` is out of the Builder's GitHub
scope (halves-only), so it didn't read the source — teardown is from the owner screenshots +
standard techniques, inventing no internals, flagging re-verification if the repo is scoped in.
Doc-only, deploy-safe, all gates green. T82 → DONE. **Open questions raised for the owner** (relayed
in chat): primary cert device; strictly-Node vs one elective Playwright visual check; WebGPU
appetite; confirm the brickmap=Rust/wgpu attribution.

**Previously approved (done):** `T81` (event presentation — emblem art · music · home banner) ·
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
### Two-Builder queue (see `ORCHESTRATION.md`)
- **Builder A — next: `T124` (fraction glyphs) → then the roadmap (`T101` → Android → Arena 3v3 → content).**
  [A] (**`T149`/`T140`/`T146`/`T147`/`T148`/`T143`/… all DONE — browser-verified**). *(Read `NEXT.md` fresh —
  canonical.)* The whole audio/FX/menu block is cleared: celebration renders (T149, browser-verified), 12-style
  picker (T140), home declutter (T146), FX tester→Graphics (T147), SFX range (T148), backdrop (T142),
  nav-trap (T143). **`T124`** — fraction tree-glyphs bigger/clearer using node width (owner-flagged
  illegible). Then → **`T101`** (Start delay) → **`T102`/`T103`** (Android) → **`T89`/`T90`** (Arena 3v3) →
  content
  **`T58`–`T61`** → **`T72`**.
  **SEQUENCE LOCKED (Babysitter owns it — owner delegated 2026-06-21 "you choose order, you own
  that"). Theme: finish-what's-visible → install & perform on Android → deepen gameplay & content →
  submit.** Authoritative order — **BUGFIX FIRST, then AUDIO/POLISH BLOCK** (owner is focused on it):
  **`T118`** (BUG: Skip cut off on `#game` — T112 safe-area regression) → **`T114`** (owner-calibrated
  audio defaults: volume 3.0×/max 4.0×, tempo 0.5×) → **`T115`**
  (music with CHARACTER) → **`T116`** (restore the tree's scroll-affordance fade/cue — a small T96
  regression the owner spotted) → **`T117`** (replace ALL chrome emoji with house generative pixel
  icons — owner pass; padlock/speaker/cog/coin/calendar + the full swept set) → **`T101`**
  (Start→fullscreen delay — quick, owner-flagged, leads the perf work) →
  **`T102`** (Android PWA+TWA — installable parity build, now that the web UI is
  stable) → **`T103`** (Android-inclusive perf research — needs T102 to profile) → **`T89`/`T90`**
  (Arena 3v3 team UI + playout) → content **`T58`** blueprint (Babysitter drafts it **in the background
  now** → owner approves → build) → **`T59`/`T60`/`T61`** → **`T72`** (Play-Store submission). The
  Arena-biome FX (T108) is already wired (T112); celebration/home FX done. **`T114`** (set the
  owner-calibrated volume/tempo as defaults) slots in once the owner reports values — ideally **after
  T115** so the music is final when they calibrate. Owns ALL existing Halves
  files; log = `BUILDER-LOG.md`. *(Do them in this order; don't pull a later task forward.)*
- **Builder B — next: `T151` (synth output DIVERGES — the real "audio sounds bad") → `T150` (browser-render
  harness).** *(`T139`/`T138`/`T141`/`T134` DONE; celebration fully fixed via [A] `T149`.)* **`T151` FIRST —
  Babysitter BROWSER-MEASURED it:** an `AnalyserNode` on `Synth.output()` shows the master output growing
  **exponentially in every context, even with no switch** — `menu` peaks `0.36→1.93→7.42→33.6→159` over 3 s
  (~×4.5 / 0.33 s; switching diverges *less*, so the switch isn't the cause). The limiter clamps a 30–160×
  signal → escalating distortion = "sounds bad." **Fix the feedback instability** (suspects: FDN reverb
  spectral radius ≥ 1 via the damping/summing; a reverb send→return LOOP back into a bus; or voice/gain
  accumulation — render one context ~5 s, the tail must SETTLE). **Add a peak-BOUND gate** (offline render /
  the T150 harness / `AnalyserNode`: peak ≤ ~2 over ≥5 s, fails on today's build). **Then `T150`** — the
  Playwright browser-render harness (loads the app @ dpr 2.75, fires the real celebration, asserts
  `#fxBurst.clientWidth>0` + lit coverage — would've caught T149; guarded/opt-in so Node CI still passes).
  Full DoD: `BACKLOG.md` T151/T150. **B-owned only** (`synth.js`/`fxgl.js` + new `test/browser/…` + tests +
  `BUILDER-LOG-FX.md`); never touch existing Halves files; never push `claude/agent`.
  - *(Future opt-in, not queued: GPU/browser/full-layout golden if we ever add a headless browser to CI —
    kept out of scope to keep CI Node-only.)*

**Gating block (T86+T87) COMPLETE; `T92` event tiers DONE.** **Builder A: do `T96` next** (was
skipped once — do it NOW; owner is actively iterating the home screen). Home-screen overhaul —
owner-reported via screenshot: top-align `#start` (kill the empty top band + consolidate the selected-topic mark into
the info row), **remove the List/Tree toggle → tree-only home picker** (list stays on Best Times)
so the tree gets real space, **fix the oversized banner Play/"Again" button**, and collapse the nav
into **one row of bigger icon-buttons** (degrading as gating hides items); still fits one screen
(T91). Then **`T97`** (UI-direction **research**, doc only — a "gamey, less web-2.0" UI that fits
our aesthetic; **buttons-first** restyle plan; the actual restyle is a later task on owner go).
Then **`T92`** (event reward tiers: keep an easy participation reward but add **skip-proof**
"did well" + "extremely well" tiers — **sequenced before the Arena** so its re-calibration sees the
full reward set). Then the **Arena 3v3 block** (Phase 6.10): **`T88`** (deterministic 1–3 vs 3
battle model + enemy teams + re-calibration + invariant sim-proofs — the crux; design in IDEAS I5)
→ **`T89`** (team-selection UI, 1–3 heroes) → **`T90`** (watchable turn playout). Then the **FX
layer** (Phase 6.12 — owner mandate: bold, brickmap-borrowed, **always semantic**): **`T93`**
(`fxgl.js` WebGL2 foundation + **Arena biome ambience** — sense of place) → **`T94`** (celebration
FX on wins + collectible/loot/event gains) → **`T95`** (semantic home backdrop). *(Brickmap access:
`00-1/brickmap` likely needs adding to the Builder's scope so T93 can borrow its shaders — owner
action; flagged.)* Then content extension `T58`→`T59`/`T60`/`T61`, then **`T72`** (Play Store; folds
in the T82 TWA/manifest/SW plan). Specs in BACKLOG; this line is authoritative.

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

---

## APPROVED — T229 (GG1 content-as-data export) · Builder A · `2dfcca7`
Independently verified: 46 modes / **959 parity vectors** (matches the Babysitter's own enumeration),
every committed vector reproduces from the live `build()` (parity test 16/16). **Additive only —
zero `gg1/` runtime files modified; runtime suite still 64/64.** The `pages.yml` change inserts the
parity test as a CI gate between two existing gate steps (no effect on deploy/upload). `modes.json`
shape is correct (`{id,name,tag,group,expr,masterSecs,unlock,pool,transform}`). Clean seam for the
brickmap port. **A also correctly self-reverted the stale `T226(1)` it had started before re-syncing.**
→ A next: **T230** (guides/collectibles/balance export — same non-destructive pattern).

---

## APPROVED — BRICKMAP-GG1 research pass · Builder B · `00-1/brickmap:docs/gg1-port-research.md`
Excellent, honest, well-cited. Confirms the architecture bets: workspace + engine↔game boundary
already done (M9); **share DATA not code — JS reuse rejected** (re-impl in Rust vs T229 parity
vectors); `gg-kit` deferred; FX recipes are brickmap's originals (don't port `fxgl.js`); audio DSP
(`Drone`) already in Rust; **headless render-to-PNG works today** (golden-diff layer is the gap GG-web
fills). Correctly frames it a **re-platform, not a port** (GG uses the presentation half, not voxel).
Real new ENGINE work = legible **text (#1 blocker)**, UI/menus/keypad, save, golden-diff, **a11y (an
honest school-distribution risk)**. → Turned into **`BRICKMAP-GG1-SPEC.md`** (the de-risking spike +
go/no-go gate), **awaiting owner approval + 2 owner decisions (a11y stance, font path)** before B builds.

---

## GATE PASS — BRICKMAP-GG1 spike mini-gate #1 (legible font path) · Builder B · `00-1/brickmap:5bf7ef0`
Process evidence strong: baked-TTF (Instrument Sans, OFL) → AA grayscale coverage atlas + word-wrap,
rendered through the **real wgpu path** (offscreen llvmpipe) at 28/34/42px on a 1080-wide canvas; CI
green (CPU AA-bake + wrap unit tests, clippy -D warnings, fmt); **no engine/voxel code touched**;
uses the reusable `bm-render::hud` texture pattern (sinks into the engine later). **Legibility is a
visual call the Babysitter can't see (no brickmap access) → owner-confirmed: "all very readable, third
sample is best."** The #1 blocker (the founding concern of the pivot) is **cleared.** → B GO mini-gate
#2 (keypad + one drill via the T229 data seam); "third sample" = prose baseline. Font path choice
(baked-TTF over SDF) accepted — right for GG's fixed reading sizes.

## CONFIRMED GO — T231 Capacitor wrapper (track 2) · Builder A
Owner: "yes build capacitor" (2026-06-23). A proceeds per `CAPACITOR-SPEC.md` (separate `.exp`
package, additive, CI `.aab`). T230 stays deferred.

---

## APPROVED — T231 (Capacitor wrapper experiment) · Builder A · `0f77a83`
Additive only (zero `gg1/` touched, `pages.yml` untouched, sync is read-only on `gg1/prod`).
Isolation correct: package **`app.goblingold.voidthrone.exp`**, name "Goblin Gold (Cap)", throwaway
keystore (real upload key never used), CI **manual-only** (`workflow_dispatch`, out of the Pages
deploy). Bundles `gg1/prod` offline in an in-process WebView (no Custom-Tabs handoff → no "Open
with"/address bar by construction). **Bakes in the notch fix** the TWA still lacks
(`windowLayoutInDisplayCutoutMode=shortEdges` + translucent bars + `StatusBar.overlaysWebView`).
Good README + on-device acceptance checklist. **Two things outside my reach (inherent to the task):**
the CI build hasn't been *dispatched* yet (first run will surface any toolchain hiccup), and the
on-device behaviour (the whole point) is the owner's judgment — owner sets the 4 keystore secrets,
dispatches the workflow, installs the artifact, runs the checklist. → A resumes **T230** (content seam).

---

## GATE PASS — BRICKMAP-GG1 spike mini-gate #2 (keypad + drill over the T229 seam) · Builder B · `00-1/brickmap:227c5e8`
Stronger than #1 — **mechanically proven, not just visual.** `Drill::from_seam` reads mode meta from
`modes.json` + `{p,a}` from `parity-vectors.json`; **the JS transform is NEVER run — the parity
vectors are the correctness contract** (exactly the designed architecture). The seam IS the test: a
unit test feeds **every** halves vector's expected answer (incl `.5`) → 27/27 accepted; wrong answers
marked Wrong + don't advance; a **2nd topic (`times`)** loads → proves data-driven not hardcoded.
Keypad = data-free no-leakage widget (engine-candidate). 2-D painter via real wgpu. 9 tests, clippy
-D warnings, fmt; no engine/voxel code touched. Evidence PNGs (mid/correct/wrong) snapshot the real
model; framed Q "Half of 100" = first vector `100→50`, seam visibly live. **Gated PASS on the test
evidence (the cross-repo DATA SEAM is proven end-to-end) — owner's keypad screenshots are an optional
feel-check, not a blocker.** → B GO mini-gate #3 (self-verified golden-PNG FX).

---

## GATE PASS — BRICKMAP-GG1 spike mini-gate #3 (engine-native FX + golden-PNG diff) · Builder B · `00-1/brickmap:f0c6879`
**The self-verify keystone — the founding reason for the pivot, demonstrated.** Correct-answer FX =
gold spark burst from `bm-render::particles::ParticleSystem` + `palette::PalettePass` (Bayer-4×4
dither over a gold ramp) — **brickmap's OWN recipes, NOT an `fxgl.js` port** (per research). Deterministic
(fixed seed/slice) → pixel-stable. Golden layer (`rgba_from_png`/`diff`/`matches`) runs **pure-CPU in
CI**. **"Test the test" complete:** asserts the FX MATCHES the golden AND that **two injected regressions
(burst suppressed / palette collapsed) FAIL** — proving the golden catches breakage. 14 pure tests +
GPU golden (lavapipe); clippy -D warnings workspace-wide; no engine/voxel code touched. **Gated PASS on
the test evidence (self-verifying by definition).** → B GO mini-gate #4 (clean APK — the FINAL spike
gate, owner device-judges). Note B's heads-up: keep the brickmap APK package distinct from the halves
Capacitor `.exp` experiment.
