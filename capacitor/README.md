# Goblin Gold — Capacitor Android wrapper (experiment · T231)

**Parallel experiment, NOT the shipping path.** The TWA (`app.goblingold.voidthrone`,
built via PWABuilder) remains how Goblin Gold ships. This wraps the **same `gg1/prod`
web build** in an **in-process Android System WebView** (Capacitor) to test whether
that removes the TWA browser-handoff fragility — the "Open with" chooser / address bar
seen on atypical setups (work profiles, no default browser). See
`docs/agent/CAPACITOR-SPEC.md` for the rationale and the decision criteria.

A WebView renders the page **in-process**: there is no Custom-Tabs handoff, so **no
address bar and no "Open with" chooser on any device**, and no asset-links dependency.
Trade-off: the web assets are bundled (a few MB larger; content updates need an app
rebuild, not a web push).

## Isolation (so the real listing is never touched)
- **Experiment package id:** `app.goblingold.voidthrone.exp` (app name **"Goblin Gold (Cap)"**).
- Upload to a **separate internal-testing app** in Play Console — never the real listing.
- A **throwaway** signing key is fine. The real upload keystore is **never** used here.
- *If Capacitor wins:* rebuild under the real `app.goblingold.voidthrone`, signed with the
  **real** upload keystore (Play App Signing requires reusing it), bump `versionCode`, and
  replace the TWA in the real listing.

## How it's built — GitHub Actions (no local Android Studio needed)
The build runs entirely in CI: **Actions → "Capacitor Android (experiment)" → Run workflow**
(`.github/workflows/capacitor-android.yml`, manual `workflow_dispatch` only; it is kept
out of the Pages deploy). It: `npm install` → `sync:www` (copies `gg1/prod` → `www/`) →
`npx cap add android` (scaffolds the native project) → applies the fullscreen/cutout theme
(`android-overrides/`) → `cap sync` → Gradle `bundleRelease` + `assembleRelease` → signs →
uploads **`goblin-gold-cap-android`** (a `.aab` for Play + a sideload `.apk`).

Nothing under `gg1/` is modified — `gg1/prod` stays the single source of truth; `www/`,
`android/`, and `node_modules/` are all generated in CI (git-ignored).

### Required repository secrets (for signed artifacts)
Set these under **Settings → Secrets and variables → Actions**. Without them the workflow
still builds, but uploads **unsigned** artifacts (Play upload needs a signed `.aab`).

| Secret | What |
| --- | --- |
| `CAP_EXP_KEYSTORE_B64` | the throwaway keystore, base64-encoded |
| `CAP_EXP_KEYSTORE_PASSWORD` | keystore password |
| `CAP_EXP_KEY_ALIAS` | key alias |
| `CAP_EXP_KEY_PASSWORD` | key password |

Generate a throwaway keystore locally and copy the base64 into the secret:
```sh
keytool -genkeypair -v -keystore exp.jks -alias gg-exp -keyalg RSA -keysize 2048 \
  -validity 10000 -storepass <pw> -keypass <pw> -dname "CN=Goblin Gold Cap Experiment"
base64 -w0 exp.jks      # → paste into CAP_EXP_KEYSTORE_B64 (then delete exp.jks; never commit it)
```

## On-device acceptance checks (owner)
Install the artifact into the separate internal-testing app (or sideload the `.apk`), then:
- [ ] **Clean fullscreen launch — no "Open with", no address bar** (incl. the work-profile phone — the point).
- [ ] Start a drill, answer via the **numpad**, trigger a **coin/celebration burst** (particles render).
- [ ] Earn/spend **gold**; **reopen** the app → progress **persisted** (`localStorage`).
- [ ] **Airplane-mode** launch works (offline-first, bundled assets).
- [ ] Fonts crisp; audio plays after the splash "Tap to begin" gesture (WebView autoplay).
- [ ] Note: app size, cold-start time, and **TalkBack** behaviour (the DOM a11y tree should
      survive in a WebView) — inputs to the TWA-vs-Capacitor-vs-brickmap decision.

## Local build (optional, if you have the Android SDK)
```sh
cd capacitor
npm install
npm run sync:www
npx cap add android      # first time only
npx cap sync android
cd android && ./gradlew bundleRelease
```
