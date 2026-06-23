# Goblin Gold v1.0.0 — Play Store Submission Checklist
Single source of truth — work top to bottom. Everything you need is here or linked.

## Reference values (use these everywhere)
| Field | Value |
|---|---|
| App name (≤30) | `Goblin Gold: The Void Throne` |
| Package id (PERMANENT) | `app.goblingold.voidthrone` |
| App / TWA URL | `https://00-1.github.io/halves/gg1/prod/` |
| Privacy policy URL | `https://00-1.github.io/halves/privacy.html` |
| Support email | `jppgpnng@gmail.com` |
| Default language | English (UK) — en-GB |
| App or game | Game · Category **Educational** |
| Price | Free (one-way door — can't become paid later) |
| Icon (512×512) | `gg1/dev/icon-512.png` — upload as-is |
| Feature graphic | `store-assets/feature-graphic.html` → PNG (via `capture.js` or browser screenshot) |
| Listing copy | `store-assets/listing.md` |

## DONE already
- ✅ App created in Play Console · ✅ Google Play identity verified
- ✅ v1 built, tagged `v1.0.0` @ `525ba87`, quality-gated
- ✅ `gg1/prod` = v1 (the TWA URL) · ✅ frozen `gg1/v1.0.0/` archive
- ✅ asset-links hosting live: `https://00-1.github.io/.well-known/assetlinks.json` (placeholders pending the fingerprint)
- ✅ fonts self-hosted → no third-party requests · ✅ privacy.html live

## 1 · Finish setting up your game (Play Console)
- **Privacy policy** → `https://00-1.github.io/halves/privacy.html`
- **Sign-in details** → No login; all features available without signing in (no test credentials)
- **Ads** → **No**
- **Content rating** (IARC) → email `jppgpnng@gmail.com`; **cartoon/fantasy violence only, non-realistic** (Arena pixel battles, no blood); everything else **No** → expect **PEGI 3 / Everyone**
- **Target audience** → include age bands **9–12** (and 6–8 if offered); designed for children → **Designed for Families**
- **Data safety** → **No data collected, No data shared**; no third-party SDKs/requests (fonts self-hosted); deletion N/A
- **Government apps** → No · **Financial features** → No · **Health** → No
- **App category + contact** → Category **Educational**; email `jppgpnng@gmail.com`; website `https://00-1.github.io/halves/gg1/prod/`
- **Store listing** → name + short + full description from `listing.md`; icon `gg1/dev/icon-512.png`; feature graphic PNG; ≥2 phone screenshots

## 2 · Build the .aab (PWABuilder)
1. Go to **pwabuilder.com** → enter `https://00-1.github.io/halves/gg1/prod/` → Start.
2. **Package for stores → Android → Google Play.**
3. **Application ID = `app.goblingold.voidthrone`** (MUST match the Console exactly — permanent).
4. App name `Goblin Gold: The Void Throne`; launcher/short name `Goblin Gold`.
5. Display mode: **fullscreen/standalone** (immersive).
6. **Signing key → "Create new".** ⚠️ **SAVE the generated signing key (.keystore) + passwords somewhere safe — you need the SAME key for every future update; lose it and you can never update the app.**
7. Download the zip → it contains the **.aab** (upload this) and an **assetlinks.json** (has your SHA-256 fingerprint — step 3).

## 3 · Finish the asset-links (the fingerprint swap)
- Open the `assetlinks.json` from PWABuilder → copy the `sha256_cert_fingerprints` value.
- In the **`00-1.github.io`** repo, edit `.well-known/assetlinks.json`:
  - `package_name` → `app.goblingold.voidthrone`
  - `sha256_cert_fingerprints` → `["<that fingerprint>"]`
- Commit. Verify `https://00-1.github.io/.well-known/assetlinks.json` shows the real values.
- *(This is what removes the browser URL bar in the installed app.)*

## 4 · Closed testing — the 14-day gate (start ASAP)
- Create the **closed testing** track; pick countries (UK + any others).
- Add your **12 testers'** Google emails (or a Google Group).
- Upload the **.aab** as a closed-testing release → roll out.
- Send the **opt-in link** to all 12; they must **install AND actually use it**.
- Requirement: **≥12 testers opted in, for ≥14 continuous days.** The clock effectively starts once you have 12 in — keep ≥12 the whole time.

## 5 · Production
- After the 14 days (+ a few days' review): **Apply for production** → answer the closed-test questionnaire.
- Create the **production release** (the .aab) → roll out → Google review → **live.**

## Notes
- **Play App Signing:** accept it (Google holds the app-signing key); keep your *upload* key (step 2.6) safe.
- **Teacher Approved:** apply *after* publishing — strong discovery/trust boost for an education title.
- **Updates later:** rebuild the PWA → re-promote `gg1/dev → gg1/prod` → re-run PWABuilder with the SAME signing key → upload a new .aab (bump versionCode).
