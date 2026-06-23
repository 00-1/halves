# store-assets — Play Store submission assets (helper files, not part of the app)
- **feature-graphic.html** — renders the 1024×500 feature graphic (icon embedded). Open in a browser and
  screenshot the `#fg` element, OR run `capture.js` to export `feature-graphic.png`.
- **capture.js** — Playwright helper: exports `feature-graphic.png` + a couple of app screenshots.
  Run where Playwright is available: `npm i playwright && npx playwright install chromium && node capture.js`.
- **listing.md** — paste-ready store listing copy (name, short/full description) + the graphics checklist.
- App icon for the listing = `../gg1/dev/icon-512.png` (already correct; no work needed).
