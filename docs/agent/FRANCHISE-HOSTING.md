# Franchise Hosting & Repo Structure — one GitHub Pages site for all GG games (Babysitter, 2026-06-22)

> Owner: *"prepare the repo for the GG2 unattended run. Tag GG1 v1 once current work is done. Add GHP
> folders: GG1 should have a tagged v1 folder, a live dev folder (as now), and a prod folder we promote
> to (the Play Store app points here); plus a GG2 dev folder so sequels live on the same GHP."*
> This doc is the PLAN + the gotchas + the decisions. Execution = Builder A, **sequenced after GG1 v1
> work lands** (it moves the dev URL the owner is live-testing — don't do it mid-flight). Companion to
> `FRANCHISE-DESIGN.md` (locked decisions) + `GG2-MILESTONES.md` (the GG2 roadmap).

---

## Where we are today (verified)
- **GH Pages source = `main` branch, `/` (root).** No workflow, no `gh-pages` branch, no `/docs` Pages
  source. The app's `index.html` + all JS sit at repo root and serve at **`https://00-1.github.io/halves/`**.
  *(Side note: `/halves/docs/agent/*` is therefore PUBLICLY served too — pre-existing, low-sensitivity, but
  be aware when writing in these docs.)*
- **The app is already portable into subfolders — NO per-file path edits needed.** `manifest.webmanifest`
  uses `start_url:"./"` + `scope:"./"`; `sw.js` is registered at the relative path `"sw.js"`; every
  `<script>`/`<link>`/asset href is relative. Copy the file set into `/halves/gg1/dev/` and it just works,
  scoped to that folder.

## Target layout (recommended)
```
halves/  (repo root = GH Pages site root, https://00-1.github.io/halves/)
├── index.html                 → FRANCHISE LANDING — scans apps.json, links to each app (Decision 1)
├── apps.json                  → registry of deployed apps [{path,name,tag}] the landing reads
├── gg1/
│   ├── v1/      ← frozen snapshot of the gg1-v1 tag (never touched again)
│   ├── dev/     ← the live build (what we push to continuously, as now)
│   └── prod/    ← promoted-when-ready; the Play Store TWA (T168) points HERE
├── gg2/
│   └── dev/     ← GG2 built here from P0 onward (same dev model)
└── docs/        ← agent/research docs (unchanged)
```
- **URL scheme:** GG1 prod = `/halves/gg1/prod/`, GG1 dev = `/halves/gg1/dev/`, frozen v1 =
  `/halves/gg1/v1/`, GG2 dev = `/halves/gg2/dev/`. Each is an independent PWA scope.
- **Timing is good for the URL move:** nothing is on the Play Store yet (T168 held on Google ID-verify),
  and the PWA URL the owner shares can just be updated — so changing the served path is low-risk *now*.

## The TWO origin-shared collisions (MUST fix in `sw.js` + the save layer before multi-folder)
Folders give each app its own **SW scope** and **HTTP path**, but **Cache Storage and localStorage are
partitioned by ORIGIN, not by path** — all four+ variants share one bucket on `00-1.github.io`.

1. **Service-worker cache cross-eviction.** Today `activate` runs
   `caches.keys().filter(k => k !== CACHE).map(caches.delete)` — that deletes EVERY other cache on the
   origin. With >1 app live, each deploy's SW would wipe the others' offline caches on activate (and they'd
   fight forever). **Fix:** give each app a **namespaced cache name** (e.g. `gg1-dev-static-v4`,
   `gg1-prod-static-v1`, `gg2-dev-static-v1`) AND make the cleanup **prefix-scoped** — delete only keys
   that start with *this app's* prefix and aren't the current CACHE (`k.startsWith(MY_PREFIX) && k !== CACHE`).
   Then apps never touch each other's caches. *(One small `sw.js` change, carried into CORE.)*

2. **localStorage save collision.** All save keys are `halves.*` and localStorage is **origin-wide**, so
   without namespacing GG1-dev/prod/v1 and GG2 all read/write the SAME save. **Saves are fully ISOLATED per
   scope** (Decision 2) — each gets its own prefix and nothing is shared:
   - **Per-scope namespace:** `gg1dev.*`, `gg1prod.*`, `gg1v1.*`, `gg2dev.*` — independent. Dev experiments /
     dev-mode gold-setting can never touch a real prod save; the frozen v1 stays pristine; GG2 can't clobber
     GG1.
   - **NO cross-game gold transfer (owner-clarified).** Gold is a per-game CONCEPT (the meta-joke — it just
     goes up, buys nothing) but **does NOT carry between games**: every game is a fresh session, **a new
     player starts at 0 gold**. There is **no shared wallet, no import** — gold lives entirely inside each
     game's own isolated save. *(This simplifies hosting: no cross-app shared key at all.)*
   - **GG1 migration:** the existing live save is `halves.*` at the root URL. When GG1 moves to
     `/halves/gg1/prod/`, the player's progress is in the SAME origin's localStorage, so it's still
     readable — but the prefix changes (`halves.*` → `gg1prod.*`). Add a **one-time migration** (read legacy
     `halves.*`, copy to `gg1prod.*` — and `gg1dev.*` — if those keys are empty) so the current player keeps
     gold/collection/progress on the move.

## The dev → prod promote flow (manual gate)
- **dev** = continuous Builder pushes (today's behaviour, just relocated under `gg1/dev/`).
- **prod** = a deliberate promotion: when a dev build is owner-approved, copy `gg1/dev/*` → `gg1/prod/*`
  (a single sync commit). The Play Store TWA points at `prod`, so prod only moves when WE choose — players
  never get a half-finished dev state. *(Mechanism: a simple script/Make target or a Builder task "promote
  dev→prod"; keep it dumb — a file copy + a `prod/build.json` stamp.)*
- **v1** = a one-time frozen copy taken at the `gg1-v1` tag; never updated. It's the "what shipped first"
  reference / rollback.

## Tagging
- **`gg1-v1`** — annotated git tag on `main` at the commit where GG1 v1 work is DONE (current splash
  iterations + T219 all-topics + the post-T219 quality pass + Collector rebalance complete). Cut the tag,
  then copy that tree into `gg1/v1/`. *(A tag is a pointer, not a branch push — but per protocol the
  Babysitter doesn't write to main; this is a Builder-A or owner step, flagged in BACKLOG.)*
- Sequels get their own tags later (`gg2-v1`, …).

## What this means for `GG2-MILESTONES.md` / P0
The hosting split + per-app cache namespacing + per-scope (isolated) localStorage namespacing + GG1 save
migration are **prerequisite engine work** — they belong in **P0** (the core/pack refactor), not late. See
the completeness-pass additions appended to `GG2-MILESTONES.md`.

---

## DECISIONS — RESOLVED by owner (2026-06-22)
1. **Root `index.html` = a FRANCHISE LANDING PAGE** (not a redirect). It **scans a manifest file** to
   discover the deployed apps and renders links to whatever folders currently exist. → spec a root
   **`apps.json`** registry: `[{ "path":"gg1/prod/", "name":"Goblin Gold", "tag":"…" }, …]`; the landing
   fetches it and, for each entry, reads that folder's own **`manifest.webmanifest`** for the display
   **name / icon / theme_color** (so a card = the app's real identity, and adding an app = one line in
   `apps.json`). Static, no build step.
2. **Saves = ISOLATED per folder.** Each scope gets its own localStorage prefix — `gg1dev.*`, `gg1prod.*`,
   `gg1v1.*`, `gg2dev.*` — nothing shared-mutable, so dev experiments / dev-mode gold-setting can never
   touch a real prod save, and the frozen v1 stays pristine.
3. **Move NOW** (not deferred to the `gg1-v1` cut). Restructure first, then the remaining GG1 work (T221
   splash, the rest of T219) lands in the new `gg1/dev/` location. *(The `gg1/v1/` snapshot still waits for
   the tag — T223 — but the folder STRUCTURE + dev/prod/gg2-dev + landing move now.)*

### Gold does NOT carry between games (owner-clarified)
Gold is present in every game only as a **concept** (the brand meta-joke — it just goes up, buys nothing).
Each game is a **totally isolated, fresh session**: **a new player starts at 0 gold**, and gold never
transfers between games. So there is **no shared wallet and no import** — gold lives entirely inside each
game's own isolated save (Decision 2). Hosting stays maximally simple: no cross-app shared state of any kind.
