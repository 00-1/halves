// Store-asset capture helper. Run where Playwright is available (e.g. the flex-server):
//   npm i playwright && npx playwright install chromium && node capture.js
// Produces: feature-graphic.png (1024x500) + a few app screenshots.
const { chromium } = require('playwright');
const APP = process.env.APP_URL || 'https://00-1.github.io/halves/gg1/prod/';
(async () => {
  const b = await chromium.launch();
  // 1) Feature graphic — exact 1024x500 element
  const fg = await b.newPage({ viewport: { width: 1100, height: 560 } });
  await fg.goto('file://' + __dirname + '/feature-graphic.html');
  await fg.waitForTimeout(400);
  await fg.locator('#fg').screenshot({ path: 'feature-graphic.png' });
  console.log('wrote feature-graphic.png (1024x500)');
  // 2) App phone screenshots (portrait). The entry/home are deterministic; for the
  //    drill/arena screens, capturing on a real phone is easier + gives nicer frames.
  const p = await b.newPage({ viewport: { width: 1080, height: 1920, deviceScaleFactor: 1 }, isMobile: true });
  await p.goto(APP); await p.waitForTimeout(2500);
  await p.screenshot({ path: 'shot-1-splash.png' }); console.log('wrote shot-1-splash.png');
  try { await p.getByText(/tap to begin/i).click({ timeout: 4000 }); await p.waitForTimeout(1500);
        await p.screenshot({ path: 'shot-2-home.png' }); console.log('wrote shot-2-home.png'); } catch(e){ console.log('home shot skipped:', e.message); }
  await b.close();
})();
