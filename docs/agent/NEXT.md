# NEXT — canonical task pointers (Builders read THIS first, fresh, every task)

> Single source of truth for "what do I build right now." **Re-fetch
> `origin/claude/agent` and re-read this IMMEDIATELY before each task and before you
> push.** Rationale/details live in `REVIEW.md` / `BACKLOG.md`.

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
   profile phone — does not affect normal single-profile users.)
2. **Capacitor experiment (Builder A).** In-process-WebView wrapper to remove the TWA browser-handoff fragility.
   **Spec drafted → `CAPACITOR-SPEC.md` (awaiting owner approval before A starts).** Parallel; may or may not adopt.
3. **GG1-on-brickmap (Builder B).** Re-base GG1 on the brickmap render engine (native APK, engine-native aesthetic,
   self-verifiable FX). **IN DISCUSSION with owner — not yet spec'd/assigned.** Architecture reassessment: the
   original "stay on the web/DOM" call is now judged a mistake (we traded free text/deploy for unbounded game-feel
   whack-a-mole + "mask slips" web fragility); brickmap already renders on web + native APK and needs text/menus
   anyway. GG2 is intended brickmap-native; GG1-on-brickmap is the proving ground.

- ✅ **GG1 v1 COMPLETE & RELEASED** (46 topics, T225 clean, tag `v1.0.0`).
- ⏳ **`T226` ← CURRENT (gates the store URL).** (1) Generic path-derived per-folder scope (existing
  `gg1dev`/`gg1prod`/`gg2dev`/`halves` scopes UNCHANGED — migration-critical + test). (2) Frozen **`gg1/v1.0.0/`**
  archive (lean v1 runtime from `525ba87`, fixed `?v=525ba87`, NOT in the per-deploy loop) + `apps.json`. (3)
  **Promote `gg1/dev → gg1/prod` to v1** — this makes the **store URL `…/gg1/prod/`** correct + live. *(BACKLOG T226.)*
- ⏳ **`T168` — Play-Store productionisation (UNBLOCKED — owner Play ID verified).** privacy.html on Pages;
  **`assetlinks.json` at the ORIGIN ROOT** `00-1.github.io/.well-known/` (🔴 needs the `00-1.github.io` user-pages repo
  or a custom domain — owner decision); the **.aab** via PWABuilder pointed at **`…/halves/gg1/prod/`**; store listing
  assets/copy (drafted in `PLAY-STORE-PREP.md` — **update its URLs to the `/gg1/prod/` path**). Then closed testing
  (12 testers / 14 continuous days — schedule long pole). *(BACKLOG T168 + PLAY-STORE-PREP.md.)*

**GG2 P0 — PARKED** (`GG2-MILESTONES.md` / `GG2-P0-EXTRACTION.md` / `GG2-P0-INPUT.md` stand ready for when the owner
un-parks it after the store launch). Do NOT start GG2 now.

**Builder A → `T226` → `T168`. (GG2 parked.)**

**Builder B → STAND BY.** `T103` (perf pass) + `T211`/`T207` **APPROVED** (live `951e532`); queue clear. Hold until
the Babysitter points you at a task. *(Open thread: the perf **on-device measurement plan** in `PERF-RESEARCH-2.md`
is for the OWNER to run on a low-end phone; if it surfaces jank, the follow-up fixes come back to B.)*
**Re-read this line fresh before each task + push.**

---

**Owner device-confirm (live `951e532`):** perf on-device plan **DEFERRED by owner** (not now) — parked as a pre-launch check / covered by the 12-tester window; resurface only if a tester reports jank. Title position + void font → feeding T216. Earlier ✅: lofi, icon/
splash, coin shine, hoard home-only, install identity, app-switch backdrop, 1k pile, Collector (15), "i" fix.

*Maintained by the Babysitter on `claude/agent`, updated on every review.*
