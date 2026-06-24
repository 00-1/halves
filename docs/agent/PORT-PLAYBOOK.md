# PORT PLAYBOOK — porting a "done" game onto the brickmap engine (living doc)

> Distilled from the **GG1-on-brickmap** port (2026-06-23/24). **Purpose:** a reusable method +
> a gotchas log so the NEXT port (GG2+, or any re-base) starts from hard-won lessons, not a blank
> page. **Living:** the Babysitter appends findings as the port continues (phases 4–5 + device tests).
> Companions: `BRICKMAP-GG1.md` (the original plan/research), `BRICKMAP-GG1-SPEC.md` (the spike spec),
> `GG1-INVENTORY.md` (the source-of-truth inventory).

---

## A. THE METHOD (what worked — reuse this order)

1. **Inventory the source FIRST** (`GG1-INVENTORY.md`). Before any porting, document subsystems, the
   **save schema**, and the exact mechanics, read off the source. The single most load-bearing find
   was *"GG keeps ONE central `collected` map and derives everything from it"* — that one sentence
   drove the whole save/progression port cleanly. **Inventory pays for itself many times over.**
2. **Content as DATA + PARITY VECTORS** (the core technique). Extract content/logic into
   engine-agnostic JSON (`modes/guides/collectibles/balance.json`) **plus `parity-vectors.json`** =
   `input → expected output` generated FROM the source. Re-implement logic in the target language;
   the vectors **prove byte-identical behaviour** (every `{p,a}` matched, answers <1e-9). **Share
   DATA, not code** — do NOT embed a JS runtime in the native binary (bloat, forks behaviour, kills
   the self-verify win). Parity was proven for all 46 transforms this way. **Export EARNING/economy rules too, not just content+structure** — the
   first pass exported the *catalogue* but not the *earning thresholds* (Speed/Rank/event tiers), blocking the
   reward port mid-stream. Extend the parity-vector trick to earning: run the live award evaluators over a synthetic
   `ctx` battery → `{ctx → awarded keys}` vectors. (A good builder will REFUSE to fabricate the missing rules — design
   the export to feed it, don't make it guess.) **When the rules live in a NON-pure module** (the gold
   formulas are inside `main.js`'s DOM-coupled IIFE, not an importable module), don't hand-copy them —
   **LIFT the exact function source by name (brace-matched) and run it headlessly over the real loaded
   modules**, so the vectors are generated FROM the source text and a `*.includes(formulaString)`
   source-fidelity test forces a regen if the source ever changes (see `tools/gold-export.js`).
3. **SPIKE-gate before committing** (`BRICKMAP-GG1-SPEC.md`). A tightly-scoped spike on the riskiest
   unknowns — **legible text · the core loop · one self-verified FX · a clean DEVICE launch** — with
   a go/no-go gate, BEFORE the full port. De-risks in hours, not the weeks the human estimate implied.
4. **Gate on SELF-VERIFICATION, not a human eyeball.** Golden-PNG diffs that **catch regressions
   ("test the test" — inject a break, assert the golden fails)** + the parity vectors for logic. This
   let the port run *ungated* by the owner. Reserve the human for genuinely device-only / by-ear checks.
5. **PHASE the full port, bank reusable services into the ENGINE as you go.** Order that worked:
   **engine services** (text/UI/save → `bm-render::text2d`/`ui2d`, `bm-platform::save`) → **logic**
   (vs parity vectors) → **content** (data) → **audio** → **polish**. Banking text/UI/save into the
   engine crates means the *next* game inherits them (the owner's "bank reusable text+menus").

## B. FINDINGS / GOTCHAS (the expensive lessons — check these every port)

1. **Headless ≠ device — the killer.** All CI was green and it *still* frame-1-crashed on real
   hardware (`create_buffer_init` on an **empty buffer** — empty text run on the first frame).
   **Root cause: the live windowed render path had no golden** (the headless bins only rendered
   *populated* states). **FIX PATTERN:** unify the live renderer and the golden via ONE shared frame
   builder (`drill_frame()`), and add goldens for **empty/initial states**, not just busy snapshots.
   **And always do a real-device launch** — it's the one gate that catches what green CI cannot.
2. **On-device debugging with no desktop.** A Rust `panic→abort` on Android does **not** put the
   message in logcat by default. **FIX:** `std::panic::set_hook(|i| log::error!("PANIC: {i}"))` via
   `android_logger`; then capture logcat from **Termux via adb-over-Wireless-Debugging** (`adb pair`/
   `connect 127.0.0.1:<port>`) — or an on-device agent. That turned a raw native trace into an exact
   `file:line` in minutes.
3. **Embed assets** (`include_bytes!` / `include_str!`) — never `std::fs` paths. A path exists on
   desktop/headless but **not inside the APK** → `unwrap` panic on launch.
4. **Verify mechanics against the SOURCE — parity vectors don't cover progression/economy.** GG's
   mastery test reads `mistakes===0`, but `mistakes` *only increments in `skip()`* — so it counts
   **skips**, not wrong answers. A name-based assumption would have shipped a wrong gate. **Read the
   code, don't trust variable names.**
5. **Native fullscreen is explicit.** A winit/android-activity app shows the **status + nav bars**
   unless you set **immersive-sticky** on the activity. (Same class as the TWA notch / Capacitor
   cutout fix.) **cargo-apk ships a bare `NativeActivity` with no Java of yours**, so set it from the native side
   over **JNI** (`FLAG_FULLSCREEN` + legacy `setSystemUiVisibility(IMMERSIVE_STICKY)` + API-30 `WindowInsetsController
   .hide(systemBars())`), re-applied on every `resumed` (flags clear on focus loss). **Guard every JNI call to no-op
   on failure** (wrong-thread/missing-method/exception) so built-blind native code can't add a new launch crash.
6. **Input-UX parity is subtle & surfaces on-device.** GG auto-accepts the instant `input==answer`
   (no submit button; "Enter"=skip), with a 5-digit guard + decimal support. Easy to miss until a
   real play session.
7. **Stale-sync / stale-read hazards (cost real cycles, twice).** The one-way content sync: **re-sync
   `content/gg1/` from `origin/main` before declaring data "missing"** (a stale feature-branch tree
   caused a false blocker). Generally: **re-fetch `origin/main` + the task channel before acting** —
   a halted builder doesn't auto-resume; it needs a nudge.
8. **Immersive built-blind fails QUIETLY because of the UI-THREAD rule, not bad flags.** The native
   immersive code was thorough (FLAG_FULLSCREEN + legacy `setSystemUiVisibility` + API-30
   `WindowInsetsController.hide`) and *still* left the bars visible on-device. Android requires
   decor-view / window-insets calls to run on the **UI thread**, but the winit/android-activity game
   loop runs on a **different** thread → `CalledFromWrongThreadException`, which the defensive
   exception-clear swallowed → silent no-op. **FIX PATTERN: marshal UI calls onto the UI thread
   (`runOnUiThread`); and don't only catch JNI exceptions — LOG them at warn (the owner's logcat is
   the only window into built-blind native code).** Same "headless/host ≠ device" class as gotcha #1.
9. **Put the BUILD SHA on-screen (watermark) from day one.** A small low-contrast corner watermark of
   the short git SHA on *every* screen makes owner screenshots self-identifying — you know exactly
   which build a "this looks wrong" shot came from, instead of guessing. Cheap (`env!`/`include_str!`
   the SHA at build, one shared overlay helper); pays for itself the first time feedback arrives.
8. **A halted builder needs a wake.** No scheduler/self-wake: when a builder hits a *stop* (blocker/
   question) it idles until nudged. Keep the unblock IN the channel (its task line) so a nudged
   builder self-resolves; don't rely on a relay.

## C. BRICKMAP-SPECIFIC (carries to the next brickmap game)

- A flat 2-D game uses the engine's **presentation half** (render overlays · `palette` dither ·
  `particles` · text · audio · input · platform), almost **none of the voxel half**.
- **Don't port the web FX** (`fxgl.js`) — its recipes ARE brickmap's WGSL originals; author scenes
  against `bm-render` `palette`/`splat`/`particles` directly.
- **Audio DSP already exists** in Rust (`scraped-again`'s `Drone`: oscillators/SVF/FDN-reverb) — the
  port re-authors GG's instruments onto it; parity is **perceptual (by-ear), not vector-provable**.
- **Engine↔game boundary** holds (PACK-contract shape): bank generic services DOWN into the engine
  crates; keep game content (font face, palettes, data) in the game crate. `gg-kit` (the GG-genre
  framework) is **deferred** until a 2nd brickmap game justifies extracting it (avoid speculative
  abstraction — see `BRICKMAP-GG1.md` "design-for-extraction").
- **a11y is a real gap** (opaque GPU canvas, no screen reader) — deferred for GG1 (web covers it);
  decide per game if school distribution is a goal.

## D. WHAT THE NEXT PORT INHERITS
- Engine services already banked: `bm-render::text2d` (legible prose), `bm-render::ui2d`
  (RectRun/TextRun + keypad), `bm-platform::save` (FileStore + WebStore).
- The **data-as-spec + parity-vector** method (and the export tooling pattern in `halves:tools/`).
- This findings log — extend it; don't relearn it.

*Maintained by the Babysitter on `claude/agent`. Append findings as phases 4–5 + further device tests land.*
