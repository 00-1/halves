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
├── index.html                 → FRANCHISE LANDING (redirect or tiny hub; see Decision 1)
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

2. **localStorage save collision + the gold-carryover mechanic.** All save keys are `halves.*` and
   localStorage is **origin-wide**, so without namespacing GG1-dev/prod/v1 and GG2 all read/write the SAME
   save. Two things to decide + plumb:
   - **Per-game namespace:** GG2 must use its own prefix (e.g. `gg2.*`) so it never clobbers GG1's
     `halves.*`/`gg1.*`. Within GG1, **dev should be ISOLATED** from prod/v1 (so experimentation/dev-mode
     gold-setting can't corrupt a real player's prod save) — i.e. dev uses a `gg1dev.*` prefix. Prod + the
     frozen v1 can share `gg1.*` (same game, same save) or be split — Decision 2.
   - **The franchise wallet (gold carries across every game — `FRANCHISE-DESIGN.md`).** Gold is the ONE
     value that must persist ACROSS games. Put it in a deliberate **shared franchise namespace**
     (e.g. `gg.wallet.gold`) that every GG game reads/writes, separate from each game's private save. This
     is the concrete plumbing behind "gold carries over" — it only works *because* the games share an
     origin (a real reason to keep them all on `00-1.github.io`). **This belongs in the P0 core refactor.**
   - **GG1 migration:** the existing live save is `halves.*` at the root URL. When GG1 moves to
     `/halves/gg1/prod/`, the player's progress is in the SAME origin's localStorage, so it's still
     readable — but the prefix may change (`halves.*` → `gg1.*`). Add a **one-time migration** (read legacy
     `halves.*`, copy to the new prefix if the new keys are empty) so no one loses gold/collection. *(The
     gold specifically should migrate into the franchise wallet.)*

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
The hosting split + per-app cache namespacing + the localStorage/franchise-wallet namespacing + GG1 save
migration are **prerequisite engine work** — they belong in **P0** (the core/pack refactor), not late. See
the completeness-pass additions appended to `GG2-MILESTONES.md`.

---

## DECISIONS for the owner (I have recommendations; say the word and I queue it)
1. **Root `index.html` (`/halves/`):** (a) **redirect** straight to `gg1/prod/` [simplest], or (b) a tiny
   **franchise landing/hub** listing the GG games (sets up cross-promo + the parental gate discussed for
   inter-game links). **Rec: (a) redirect now**, upgrade to (b) when GG2 is real.
2. **GG1 dev vs prod vs v1 saves:** **Rec: dev isolated (`gg1dev.*`); prod + v1 share `gg1.*`**; gold for
   all of them lives in the shared `gg.wallet.gold`. (Keeps dev experiments off real saves; prod/v1 are the
   same game so sharing a save is fine.)
3. **When to do the restructure:** **Rec: at the `gg1-v1` cut** (after current GG1 work lands) — one clean
   move, dev URL changes once, then GG2-dev is created in the same pass.
