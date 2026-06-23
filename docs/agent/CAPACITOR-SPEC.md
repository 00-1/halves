# CAPACITOR-SPEC — alternative Android wrapper for GG1 (parallel experiment)

> **Status: DRAFT — awaiting owner approval before assigning to Builder A.**
> Strand 2 of the post-launch architecture plan (owner, 2026-06-23). **TWA remains the
> shipping path and is NOT deprecated.** Capacitor is a parallel experiment to see whether an
> in-process WebView wrapper removes the TWA browser-handoff fragility (the "Open with /
> address-bar" class of problem). We may or may not adopt it.

## Why
A TWA hands web content off to Chrome over Custom Tabs; that cross-app seam is what shows the
address bar / "Open with" chooser on atypical device setups (work profiles, no default browser,
no Chrome). A Capacitor app bundles the web assets **inside** the app and renders them in an
**in-process Android System WebView** — no browser handoff, no asset-links dependency, no
"Open with", no address bar, on any device. Cost: we lose "update web content without a new
build", the app is a few MB larger, and we take on a real Gradle/CI build pipeline.

## Goal (what "done" means for the experiment)
A signed `.aab` that:
1. Loads the **existing `gg1/prod` web app unchanged** from **locally-bundled assets** in a
   WebView (offline-first; no network needed to launch).
2. Launches **fullscreen** (immersive, portrait, splash `#0E1116`) with **no address bar and no
   "Open with" chooser — including on the owner's work-profile phone** (the whole point).
3. Reaches **full GG1 parity**: the drill loop, numpad input, audio (gated behind the splash
   "Tap to begin" gesture — verify WebView autoplay policy), FX/particles render, `localStorage`
   persistence works, fonts are crisp, full offline.
4. Is buildable & signable **in CI (GitHub Actions)** so no local Android Studio is required.

## Non-goals
- **Do NOT touch the web app** (`gg1/*` source) — Capacitor consumes a copy of `gg1/prod`.
- **Do NOT replace or remove the TWA / PWABuilder flow** — it stays as the shipping path.
- Not a native rewrite; not adding native plugins beyond what splash/status-bar/back-button need.

## Footprint (Builder A — NEW files only; integration task)
- A new top-level **`capacitor/`** project directory (Capacitor app + Android platform). Nothing
  under `gg1/` changes. A small **sync step** copies `gg1/prod/*` into the Capacitor `www`/webDir
  (script in `capacitor/`), so `gg1/prod` stays the single source of truth.
- A **GitHub Actions workflow** (`.github/workflows/capacitor-android.yml`) that: installs the
  Android SDK, runs the sync, `cap sync android`, Gradle `bundleRelease`, signs, and uploads the
  `.aab` as a build artifact. **Kept OUT of the Pages deploy workflow** (`pages.yml` unchanged).

## Build / signing / Play isolation (important)
- **Use a SEPARATE experiment package id** — `app.goblingold.voidthrone.exp` — and a **separate
  internal-testing app** in Play Console. This keeps the real shipping listing
  (`app.goblingold.voidthrone`, TWA) untouched while we compare. A throwaway signing key is fine
  for the experiment.
- App name "Goblin Gold (Cap)" for the experiment so it's distinguishable on-device.
- **If Capacitor wins:** we rebuild under the REAL package `app.goblingold.voidthrone` signed
  with the REAL upload keystore (the PWABuilder one), bump `versionCode`, and replace the TWA
  build in the real listing. (Same package + Play App Signing ⇒ must reuse the real upload key.)

## Acceptance checks (Builder A reports these)
- ✅ Clean fullscreen launch on the owner's phone — **no "Open with", no address bar**.
- ✅ GG1 parity smoke test: start a drill, answer via numpad, trigger a celebration/coin burst
   (confirm particles render — and note that in a WebView the builder can screenshot to verify),
   earn/spend gold, reopen app and confirm progress persisted, airplane-mode launch works.
- 📋 Record: app size, cold-start time, WebView audio behaviour, font crispness, and **TalkBack/
   a11y** behaviour in the WebView (the DOM a11y tree should survive in a WebView, unlike a
   canvas engine — worth confirming as a point in the TWA-vs-Capacitor-vs-brickmap comparison).

## Decision inputs (Babysitter + owner choose after the spike)
TWA vs Capacitor on: clean launch everywhere · app size · cold start · update workflow (web-push
vs rebuild) · build/maintenance burden · a11y. Recorded in `REVIEW.md` when the experiment lands.

## Risks / open questions
- WebView ≠ Chrome on the margins (autoplay, some web APIs) — parity smoke test must catch it.
- CI Android build + signing-secret handling (store the experiment keystore as a base64 GH
  Actions secret; the REAL keystore is **never** committed — see keystore-backup notes).
- Larger app; loss of instant web-content updates (becomes app-update cadence).
