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

**Builder A → HOLD (the exports keep being done by Babysitter take-over; A idle).** ✅ `T229/T230/T232` content seam
+ ✅ `T233` earning export (`fde819a`) + ✅ **`T233b`-gold** export (`4ae14b3`) — both Babysitter take-overs, A stalled.
**Remaining if woken: `T233b`-combat** (`enemies.js` battle resolve → Arena fight math; deferred till B ports the
Arena) + **`T233c`** events content/thresholds/schedule (`events.js`, same additive method). Otherwise A's work is
owner-gated (TWA `T228`, store, Capacitor on-device test).

**Builder B → CLOSE THE OWNER-FOUND METAGAME GAPS (on-device feedback 2026-06-24). Work in priority order.** Drill +
earning + persistence + Collection summary + Collector Ladder drill-down are DONE/approved (latest `602f2bd`). Owner
played it; skip parity ✅. Four gaps, prioritised:
- **P0 — RESULTS SCREEN at end of a run.** `finish_round()` currently jumps straight to the topic list; GG1 shows a
  per-run summary: **rank** (`rankIndex`), **awards earned this run**, **time/accuracy**, and **gold earned**. Build it
  now with rank/awards/time; wire the **gold figure from the NEW gold export** (`content/gg1/gold.json` +
  `gold-vectors.json`, on `main` `4ae14b3` — round gold = Σ`questionGold(masterSecs,dt,combo,mult)` over clean Qs +
  `roundBonusGold(score,rankIdx,mult)`; see `gold.json:_round`). Golden the screen.
- **P0 — BUILD-SHA WATERMARK on EVERY screen** (owner request): small, low-contrast corner text = the short git SHA
  (+ maybe pkg/version) so screenshots are traceable. `include_str!`/`env!` the SHA at build time; one shared overlay
  helper drawn by every `*_frame`. Tiny; keep it out of the hit-test.
- **P1 — IMMERSIVE: it still shows the system bars on-device.** `immersive.rs` is thorough but has NO effect.
  **Likely cause: the UI calls (decorView/WindowInsetsController) must run on the Android UI thread, but the
  winit/android-activity loop runs on another thread → `CalledFromWrongThreadException`, caught→silent no-op.**
  Capture logcat on resume to CONFIRM (your warn/debug lines will show the throw), then **marshal the calls onto the
  UI thread** (`runOnUiThread` via JNI) and set `layoutInDisplayCutoutMode` for the notch. Crash-safe as before.
- **P1 — METAGAME DRILL-DOWNS: STOP holding them.** The owner gave the eyeball you were waiting for ("nothing
  clickable"). Build the **Heroes / Events / Topics / Items** detail screens, matching the Collection/Ladder layout
  (shared row consts + `*_row_at` hit-test). Gate each on a golden.
**Export status:** ✅ **T233b-gold DONE** (Babysitter `4ae14b3`) — economy unblocked. Still open, flag if you hit them:
**T233b-combat** (enemies.js battle resolve — deferred till you port the Arena), **T233c** events content/thresholds/
schedule (events.js — for the Events drill-down). → phase 4 audio · 5 polish. APK/feel + audio-by-ear → `OWNER-EYEBALL.md`.
*(Prior B: `T103`/`T211`/`T207` APPROVED, live `951e532`.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm (live `951e532`):** perf on-device plan **DEFERRED by owner** (not now) — parked as a pre-launch check / covered by the 12-tester window; resurface only if a tester reports jank. Title position + void font → feeding T216. Earlier ✅: lofi, icon/
splash, coin shine, hoard home-only, install identity, app-switch backdrop, 1k pile, Collector (15), "i" fix.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
