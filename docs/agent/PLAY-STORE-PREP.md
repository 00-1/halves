# Play-Store submission package — PREP (Babysitter draft, for owner sign-off)

> Built while identity verification clears, so submission is paste-and-upload. Defaults: app name **"Halves"**,
> **free / non-trader** (no ads, no IAP → name+country public, NOT address). Owner: correct either if wrong.
> On sign-off this promotes into the real artifacts (privacy.html on Pages, the listing fields, the .aab) via the
> [A] task **T168**.

---

## 1. App identity
- **Play Store title: "Goblin Gold: The Void Throne"** ✅ (owner-locked 2026-06-22). Subtitle = the Arena endgame
  (region 10 / final boss The Void Sovereign) — metagame-forward by owner preference (sells the adventure, not
  the maths; the maths sells in the description/category). On-device label / manifest `short_name` = **"Goblin
  Gold"** (short for the home screen). Checked: no exact-title app on Play; Play doesn't enforce unique display
  names; Education category keeps it clear of the goblin idle-tycoon cluster. *(Currency is also "Goblin Gold" —
  intentional cohesion. The maths TOPIC "Halves" (x/2) keeps its name; only the PRODUCT is branded — see T171.)*
- **Developer (public):** Joshua Bradshaw / United Kingdom (Individual, non-trader → no address shown)
- **Package / application id (PERMANENT — cannot change after first publish):** proposed **`app.goblingold.maths`**
  *(reverse-DNS, doesn't expose a name; owner can swap before first upload — e.g. `io.github.<user>.goblingold`)*
- **TODO before lock:** optional UK IPO / EUIPO trademark glance on "Goblin Gold" (generic phrase → low risk,
  also low ownability — fine for a free app).
- **Category:** Education  ·  **Tags:** education, maths, kids, 11+
- **Default language:** English (UK)
- **Content / target age:** designed for ~9–11 (**Designed for Families** policy applies)
- **Support email (public):** `<the new Gmail you're creating>` — drop it in before submit
- **Privacy policy URL:** `https://00-1.github.io/halves/privacy.html` (hosted on the existing Pages site — see §3)

## 2. Store listing copy
**Short description (≤80 chars):**
> Fast 11+ mental-maths drills — tables, fractions, % — as a pixel RPG. No ads.

**Full description (≤4000 chars):**  *(brand = "Goblin Gold" throughout; the TOPIC "Halves & doubles" stays.)*
> **Goblin Gold** turns 11+ mental-maths practice into a fast, friendly pixel game. Short timed drills build the
> building blocks children actually need for the exam — and an RPG layer (collect, level up, battle) keeps them
> coming back.
>
> **What it drills**
> • Halves & doubles · times tables · squares & cubes
> • Fractions & percentages of an amount · fraction↔decimal
> • Number bonds · place value · add & subtract
> • Reasoning: proportion/scaling, ratio sharing, averages, LCM/HCF, time intervals, "complete the sum"
>
> **Why it works**
> • **Speed + accuracy:** bite-size rounds train recall to automaticity — the difference between knowing it and
>   knowing it *fast enough* under exam pressure.
> • **Mastery, not pressure:** gentle timers, mastery-gated unlocks, celebratory progress — built to avoid maths
>   anxiety.
> • **A reason to return:** earn collectibles and heroes, take on Arena battles — practice that feels like play.
>
> **Made for families**
> • **No ads. No in-app purchases. No accounts. No tracking.** Everything stays on the device.
> • Works **offline** after the first load. Installs like an app.
>
> Built for UK 11+ (GL-style) maths, useful for any child strengthening mental arithmetic.

## 3. Privacy policy (FULL TEXT — ready to host at /privacy.html)
> **Goblin Gold — Privacy Policy**  ·  Last updated: <DATE on publish>
>
> Goblin Gold is a free educational maths game for children. We have built it to collect **no personal data at
> all**. *(Remaining "Halves" product references in this policy → "Goblin Gold" at productionisation, T168.)*
>
> **What we collect:** Nothing. Halves does not ask for a name, email, age, or any account. We do not collect,
> store, or transmit any personal information.
>
> **Data stored on your device:** Your progress, best times, settings, and collected in-game items are saved
> **only in your browser/device's local storage**, on your device. This never leaves the device and is not sent
> to us or anyone else. Clearing the app's data (or uninstalling) removes it.
>
> **No tracking, no ads, no third parties:** Halves contains **no advertising, no analytics, no tracking, and no
> third-party SDKs**. We do not profile users or share data with anyone.
>
> **Network use:** The app downloads its own program files to run, and checks a small version file
> (`build.json`) to know when an update is available. These requests do not include any personal data. [If fonts
> are self-hosted per the recommendation, the app makes no third-party requests; otherwise: "The app loads web
> fonts from Google Fonts; Google may receive your device's IP address as part of serving those fonts."]
>
> **Children's privacy:** Halves is intended for children and complies with COPPA and UK/EU GDPR-K by collecting
> no personal data whatsoever.
>
> **Contact:** <support email>
>
> **Changes:** We'll update this page and the date above if the policy ever changes.

## 4. Data Safety form answers (Play Console)
- **Does your app collect or share any user data?** → **No.**
- Data types collected/shared → **none.**
- Data processed ephemerally → N/A (none).
- **Is all data encrypted in transit?** → N/A (no data collected/transmitted).
- **Can users request data deletion?** → N/A (no account / nothing collected); note local data is removed by
  clearing app data / uninstalling.
- **Designed for Families / target audience:** include children (~9–11); declare the app is suitable and follows
  the Families policy.
- ⚠ **The ONE honesty caveat:** if the **Google Fonts CDN** is still in use at submit time, the device sends its
  IP to Google to fetch fonts. That is not "data collection by the app," but for the cleanest kids-privacy
  posture **self-host the fonts** (see §8 / T169) so the answer is unambiguously "no data shared, no third-party
  requests."

## 5. Content rating (IARC questionnaire) — draft answers
- Violence: **Fantasy/cartoon only, non-graphic** — the Arena is turn-based pixel-monster battles with no blood,
  gore, or realistic violence. Answer the "cartoon/fantasy violence, mild" path honestly; everything else (real
  violence, sexual content, language, controlled substances, gambling, user interaction, shares location, digital
  purchases) → **No.**
- No user-to-user communication; no user-generated content; no location; no purchases.
- Expected result: **PEGI 3 / ESRB Everyone** (or the local equivalent).

## 6. Screenshots & graphics (assets to generate — §8/T168)
- **App icon:** 512×512 PNG (from the existing maskable `icon.svg` / pixel mark).
- **Feature graphic:** 1024×500 PNG (brand purple backdrop + "Halves" + a tagline).
- **Phone screenshots (≥2, up to 8):** home, a drill mid-round, the topic tree, an Arena battle, the results/
  celebration. Capture at a phone viewport via the Playwright harness (when up) → PNG.

## 7. The Android App Bundle (.aab)
- **Recommended (no SDK):** **PWABuilder.com** → point at `https://00-1.github.io/halves/` → download a signed
  **.aab** (+ a test **.apk** for sideload, + `assetlinks.json`). Owner uploads the .aab.
- **In-env alternative:** **Bubblewrap** — JDK 21 + Gradle are present; it would need to fetch the Android SDK
  (network-policy permitting). Configure **`display: fullscreen` / immersive** so the packaged app launches
  edge-to-edge (the T167 TWA branch). Babysitter can attempt this; PWABuilder is the reliable fallback.
- **Digital Asset Links:** host the generated `assetlinks.json` at `/.well-known/assetlinks.json` on Pages so the
  TWA verifies (removes the URL bar). [A] task.
- **Play App Signing:** opt in — Google holds the signing key; you only manage an upload key. Recommended.

## 8. Recommended pre-submit code cleanups (small [A] tasks)
- **T169 — self-host the web fonts** (drop the Google Fonts `<link>`s; bundle Space Grotesk + JetBrains Mono
  locally, cache-busted like the other assets). Makes the privacy/Data-safety story airtight (zero third-party
  requests) for a children's app. Small, high-value-for-trust.
- **`.well-known/assetlinks.json`** on Pages (for the TWA) — part of T168/packaging.

## 9. Submission checklist — [owner-action] vs [in-repo]
- [in-repo] **Verify DEV tools are gated/absent** (the `?dev` gold-setter etc. — not reachable in production) ·
  Privacy policy page live at /privacy.html · listing copy · screenshots + icon + feature graphic ·
  the .aab · (recommended) self-hosted fonts · assetlinks.json
- [owner] ✅ Pay $25 + ID verification (in progress) · create the support Gmail · create the app in Play Console ·
  choose the **permanent package id** · upload the .aab · paste listing copy + privacy URL · fill Data Safety
  (§4) + content rating (§5) + target-audience/Families · opt into Play App Signing · submit for review.

---
*Babysitter draft. On owner sign-off → [A] **T168** productionises (privacy.html, assetlinks, screenshots,
.aab) and optionally **T169** self-hosts fonts; the listing text/answers above are paste-ready.*
