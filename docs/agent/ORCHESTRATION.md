# Orchestration — 3-agent setup (Babysitter + 2 Builders)

Babysitter-owned. Defines how **two Builders** work the same repo without colliding.
The whole design rests on **disjoint file footprints**: each Builder only ever writes
files the other never touches, so `main` never conflicts.

> ## ⚡ AUTONOMY GRANT (owner, 2026-06-22) — overrides the "never write to main" rule below
> The owner authorised the Babysitter to **run unattended through to GG2 completion** and to **TAKE OVER
> Builder A's work — writing directly to `main`** — **if Builder A stops responding**. Trigger: A's top task
> stays OPEN/CHANGES with no progress push across ~2+ auto-review cycles (~30–45 min). On take-over the
> Babysitter becomes the builder for `[A]` files: implement → full suite + `node -c` → **strict self-review vs
> DoD** → commit → update `BUILDER-LOG.md` → resume driving. Quality bar unchanged. Escalate to the owner only
> for true blockers, GG1 *redesign* questions, or the v1/GG2 milestone FYIs. Full standing order: `NEXT.md` top.
> *(While A is responding, the normal partition below still holds — take-over is the fallback, not the default.)*

## Roles

- **Babysitter (me).** Owns `claude/agent` (`BACKLOG.md`, `REVIEW.md`, `IDEAS.md`, this
  file). **Reviews BOTH** Builders' pushes to `main`. Maintains the **two next-task
  pointers** and the **[A]/[B] task tags**. Enforces the partition below.
- **Builder A (existing) — Halves gameplay/UI + all integration.** Access: `00-1/halves`.
  Owns **every EXISTING Halves file** and does **all wiring/integration**. Works **[A]**
  tasks. Handoff log: `docs/agent/BUILDER-LOG.md`.
- **Builder B (new) — ENGINE & RESEARCH (FX · audio · brickmap).** Access: `00-1/halves` **and**
  `00-1/brickmap`. Creates **NEW standalone modules** in Halves (the WebGL2/WebGPU FX engine `fxgl.js`;
  and — from 2026-06-21 — the **generative-audio research + engine**, a NEW B-owned module, never
  `sound.js`) and does **brickmap** work + deep technical **research docs**. Works **[B]** tasks.
  Handoff logs: `docs/agent/BUILDER-LOG-FX.md` (and may add `BUILDER-LOG-AUDIO.md`). **Never edits an
  existing Halves file** (`sound.js` included) — integration of any B engine is an **[A]** task.

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

## Queue (canonical pointer = `NEXT.md`)

**`NEXT.md` is the CANONICAL pointer** (added 2026-06-21): two crisp lines — Builder A's and Builder
B's current task — that each Builder **re-reads FRESH before every task and again before pushing**,
obeying it over anything they had in mind (a `BUILD ONLY`/`BUG` line is absolute). `REVIEW.md` keeps the
verbose **"Builder A — next"** / **"Builder B — next"** rationale; `NEXT.md` is the one-line truth
derived from it. Each Builder reads **ONLY its own** line. Tasks in `BACKLOG.md` are tagged **[A]**/
**[B]**. The Babysitter updates `NEXT.md` on **every** review and watches `main` for commits, reviewing
by task id.

*Why:* Builder A repeatedly built its previously-queued task instead of a fresh DO-FIRST insert — a
**staleness race** (A pulled its next task before the insert was visible) **compounded by shallow
reading** (A read only the approval line + next-task and skimmed past the escalation warnings buried in
verdict prose — A's own post-mortem). Fix = the fresh-re-read rule + this unambiguous one-line channel;
the owner's direct nudge is the backstop for a live bug.

**Babysitter rule (codified from the T118 miss):** **all BUG / DO-FIRST / priority escalations go in
`NEXT.md` as the Builder's current task line — never only inside a verdict paragraph.** If a Builder
reads fast, the signal must *be* in the pointer it reads. Verdict prose is rationale, not instruction.

**Shared quality rule (codified from the T112→T118 regression):** the T112 safe-area overflow was a
*rendered-layout* bug invisible to Node gates (it needs a real device with insets) — and BOTH the
Builder and the Babysitter approved it. Defense: **any change to a shared layout primitive (`.app`,
`body`, `.screen`, app-wide height/inset/overflow rules) must carry/keep an invariant assertion** (e.g.
`home-layout.test`'s "`​.app` height subtracts the safe-area insets"), turning that class of invisible
regression into a gate failure. Builders add the assertion with the change; the Babysitter rejects a
shared-layout change that ships without one.

**Output-feature rule (codified from T118 → T125 → T128 — "green gates, broken feature"):** our
source-grep / stub headless gates verify that wiring *calls exist*, NOT that audio actually swaps, a
sound actually plays, or pixels actually render. Three times a task shipped green while the live feature
was broken (T118 layout, T125 invisible burst, T128 music/wub/celebration). **For any feature whose
result is rendered pixels or audible sound, "all gates green" is NECESSARY-NOT-SUFFICIENT** — the
Builder must **verify on the live build** (and say which device / how) and, where feasible, add a check
stronger than a source-grep (e.g. assert the controller is `ready`+sized before it draws; assert
distinct per-context specs, not just that a setter is called).

**BROWSER-VERIFY rule (codified from the celebration saga T125→T138→T149; owner mandate 2026-06-21 "going
forward you can test fixes autonomously").** The celebration was patched **six times** and stayed broken
because every gate was **Node-only** and could not see a rendered pixel, layout, or `display:none` — the
real bug (T149) was `#fxBurst` trapped in a `display:none` modal (`clientWidth:0`), invisible to all of
them. **A real headless browser is now part of review.** It runs in-env: global `playwright`
(`/opt/node22/lib/node_modules/playwright`) + Chromium at `/opt/pw-browsers`
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`); serve the app via a local `http.server`, load at a phone
viewport @ **dpr 2.75**, fail on console/page errors, drive the real UI, and read canvas pixels /
`clientWidth` / screenshots. **The Babysitter independently browser-verifies any RENDER/LAYOUT/visible-UI
task (FX, celebrations, canvases, home/menu layout, a11y-over-backdrop) before marking it DONE** — it no
longer relies on the owner as the renderer, and no longer accepts "drawn/sized" as proof of "visible"
(check `clientWidth>0` + real lit coverage, not just the backing buffer). **`T150`** makes this a
committed, B-owned browser-render gate (skips cleanly with no browser so Node-only CI still passes);
until then the Babysitter uses ad-hoc Playwright probes. Audible-only features still fall back to the
owner's ear; everything visible is now ours to confirm.

**⚠ Harness-availability caveat (observed 2026-06-22):** the in-env Chromium launch is **not reliable** — it
worked earlier in the session but later began **OOM-killing on launch** (the whole shell call dies with zero
output, sandbox on or off). When the headless browser won't launch, the Babysitter does NOT block a render/
colour task indefinitely; it falls back to the strongest available proxy **in this priority order**: (1) a
**boot-path gate assertion** that drives the real code path and pins the rendered-relevant value (e.g.
`fx-wiring` asserting the home state carries the exact purple palette + reads no event) — this is much stronger
than a source-grep; (2) the **owner's own visual confirmation** if given; (3) honest disclosure in the verdict
that the pixel-level probe could not run + WHY. T153 was approved on (1)+(2). Re-attempt the live probe when the
harness recovers (clearing `/tmp/playwright_chromiumdev_profile-*` + `pkill -9 -f headless_shell` sometimes
helps; an OOM kill does not).

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
