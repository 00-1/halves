# Orchestration — 3-agent setup (Babysitter + 2 Builders)

Babysitter-owned. Defines how **two Builders** work the same repo without colliding.
The whole design rests on **disjoint file footprints**: each Builder only ever writes
files the other never touches, so `main` never conflicts.

## Roles

- **Babysitter (me).** Owns `claude/agent` (`BACKLOG.md`, `REVIEW.md`, `IDEAS.md`, this
  file). **Reviews BOTH** Builders' pushes to `main`. Maintains the **two next-task
  pointers** and the **[A]/[B] task tags**. Enforces the partition below.
- **Builder A (existing) — Halves gameplay/UI + all integration.** Access: `00-1/halves`.
  Owns **every EXISTING Halves file** and does **all wiring/integration**. Works **[A]**
  tasks. Handoff log: `docs/agent/BUILDER-LOG.md`.
- **Builder B (new) — FX engine + brickmap.** Access: `00-1/halves` **and**
  `00-1/brickmap`. Creates **NEW standalone modules** in Halves (the WebGL2/WebGPU FX
  engine) and does **brickmap** work (borrow its `bm-render` WGSL dither/palette/particle
  techniques). Works **[B]** tasks. Handoff log: `docs/agent/BUILDER-LOG-FX.md` (NEW file).

## Collision-avoidance rules (non-negotiable)

1. **FILE OWNERSHIP — the core rule.**
   - **Builder A only:** all existing Halves files — `main.js`, `index.html`, `styles.css`,
     `.github/workflows/pages.yml`, every existing module (`modes.js`, `events.js`, …), and
     `docs/agent/BUILDER-LOG.md`. **All integration** (script tags, CI gate registration,
     mounting B's modules, `main.js` hooks) is A's.
   - **Builder B only:** **NEW** standalone files in Halves — the FX engine (`fxgl.js`),
     its tests (`test/fxgl.test.js`), any new FX-only modules — **plus the whole `brickmap`
     repo**. B writes `docs/agent/BUILDER-LOG-FX.md`.
   - **Builder B must NEVER edit an existing Halves file.** The engine is self-contained
     (exposes `window.FXGL`, testable headless with a GL stub) and needs **no** edit to
     A's files to be built or tested. Wiring it into the app is an **[A]** task.
2. **SERIALIZE shared files.** The Babysitter never has two concurrently-active tasks that
   touch the same existing file. Only one Builder edits a given file at a time.
3. **REBASE before push.** Each Builder: `git fetch origin main && git rebase origin/main`,
   then push; on non-fast-forward, rebase + retry. Disjoint footprints → always clean.
4. **SEPARATE LOGS.** A → `BUILDER-LOG.md`; B → `BUILDER-LOG-FX.md`. Never the same file.
5. **PUSH TARGETS.** Both push to Halves `main` (deploys). B also pushes to `brickmap` (its
   own repo flow). Neither Builder writes `claude/agent` (Babysitter-only).

## Queue (two pointers)

`REVIEW.md` carries **two** next-task pointers — **"Builder A — next"** and **"Builder B —
next"**. Each Builder reads **ONLY its own**. Tasks in `BACKLOG.md` are tagged **[A]** or
**[B]**. The Babysitter watches `main` for commits from either and reviews by task id.

## brickmap

Borrow **recipes, not the engine** (see BACKLOG Phase 6.12): B reads brickmap's `bm-render`
WGSL and **ports** the dither/palette/particle techniques into the Halves JS FX engine. Do
**not** pull brickmap's Rust/WASM renderer into Halves (keeps no-build + Node-verify + a11y).
Babysitter reviews B's Halves FX code fully; brickmap-side (Rust) review is lighter (logic/
structure) — keep brickmap edits minimal unless a task says otherwise.

## Current assignment

- **Builder A — next:** `T96` (home overhaul) → `T97` → `T88`–`T90` (Arena 3v3) → content
  (`T58`–`T61`) → `T72`, **plus the FX *wiring* tasks** (mount `FXGL` into Arena/home) once
  the engine (B) and the surfaces exist.
- **Builder B — next:** `T93` (the `fxgl.js` FX engine — standalone, brickmap-borrowed,
  headless-tested, `window.FXGL` API), then the engine sides of `T94`/`T95`.
