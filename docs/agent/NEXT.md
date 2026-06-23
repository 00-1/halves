# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> Single source of truth for "what do I build right now." **Re-fetch
> `origin/claude/agent` and re-read this IMMEDIATELY before each task and before you
> push.** Rationale/details live in `REVIEW.md` / `BACKLOG.md`.

> 🛑 **FRESHNESS CHECK (as of 2026-06-23, post-pivot — `git show origin/claude/agent`).** If your copy says
> **"Builder A → T226 → T168"** or **"Builder B → STAND BY"**, it is **STALE — `git fetch origin claude/agent` and
> re-read.** Current truth: **GG1 ship is PAUSED**; the project has PIVOTED to **3 parallel strands** (TWA ships /
> Capacitor experiment / **GG1-on-brickmap**). **Builder A = HOLD** (T226 done/closed, T168 paused; Capacitor awaits
> owner approval). **Builder B = the `BRICKMAP-GG1` research pass** (NOT "done" — read your line below). GG2-on-web is
> dead. *(This block exists because A nearly rebuilt the dropped T226(1) and B thought it was idle — both from stale reads.)*

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
   **Spec drafted → `CAPACITOR-SPEC.md` (awaiting owner approval before A starts).** Parallel; may or may not adopt.
3. **GG1-on-brickmap (Builder B).** Re-base GG1 on the brickmap render engine (native APK, engine-native aesthetic,
   self-verifiable FX). **IN DISCUSSION with owner — not yet spec'd/assigned.** Architecture reassessment: the
   original "stay on the web/DOM" call is now judged a mistake (we traded free text/deploy for unbounded game-feel
   whack-a-mole + "mask slips" web fragility); brickmap already renders on web + native APK and needs text/menus
   anyway. GG2 is intended brickmap-native; GG1-on-brickmap is the proving ground.

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

**Builder A → `T230` — content export part 2: guides + collectibles (+ balance).** ✅ `T229` DONE/APPROVED (`2dfcca7`
— 46 modes/959 vectors, parity 16/16, runtime 64/64). Continue the seam, **same non-destructive/additive rules**
(suite stays 64/64; runtime untouched). *(BACKLOG T230.)* Capacitor stays parked (owner GO required).

**Builder B → GO: spike mini-gate #1 — the FONT PROTOTYPE (owner-approved 2026-06-23).** Research DONE/APPROVED;
spec = **`BRICKMAP-GG1-SPEC.md`** (a11y DEFERRED, JS-reuse rejected, font = prototype-first). **Do ONLY mini-gate #1
now:** in `00-1/brickmap`, build a **legible font path** (try **SDF-atlas** [recommended] and/or baked-TTF) and prove
**crisp prose on a real phone** (web + APK). The #1 blocker — if it can't be made crisp, STOP and report before
building anything else. Deliver **phone screenshots** of guide-length prose at reading size. Then HOLD for the
Babysitter to gate → mini-gates #2 keypad+drill (consume T229 data) · #3 golden-PNG FX · #4 clean APK. *(Ignore the
research's week estimates — ordered mini-gates, not time-boxed.)*
*(Prior B work: `T103`/`T211`/`T207` APPROVED, live `951e532`. Perf on-device plan deferred by owner.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm (live `951e532`):** perf on-device plan **DEFERRED by owner** (not now) — parked as a pre-launch check / covered by the 12-tester window; resurface only if a tester reports jank. Title position + void font → feeding T216. Earlier ✅: lofi, icon/
splash, coin shine, hoard home-only, install identity, app-switch backdrop, 1k pile, Collector (15), "i" fix.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
