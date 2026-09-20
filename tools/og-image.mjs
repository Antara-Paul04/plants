#!/usr/bin/env node
// Render the social link-preview image from the product itself.
//
//   node tools/og-image.mjs [example-domain]
//
// The card X and every other platform shows for a shared link is, for a product
// that is entirely a picture, the whole of the first impression. It has to BE
// the product rather than a drawing of it, so this shoots the real renderer at
// 1200x630 with the interface hidden — the same tree, from the same DNA, that a
// visitor gets. Re-run it whenever the tree's look changes, or the card will
// quietly go on advertising an older one.
//
// Requires the local server on :5170.
import { chromium } from '../analysis/node_modules/playwright-core/index.mjs';

const SITE = process.argv[2] || 'art.yale.edu';
const OUT = 'app/public/og.png';
const CHROME = process.env.PLANTS_CHROME ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
});
await page.goto(`http://localhost:5170/?example=${encodeURIComponent(SITE)}`, { waitUntil: 'load' });

// Wait for the tree ITSELF, not for a panel: the caption is present long before
// the wood is, which is the same trap that cost a testing session a whole round.
await page.waitForFunction(() => {
  const r = document.getElementById('result');
  return r && !r.hidden && document.getElementById('domain').textContent.length > 0;
}, { timeout: 60000 });
await page.waitForTimeout(1200);          // the 420ms settle, plus margin

await page.evaluate(() => { document.querySelector('.ui').style.display = 'none'; });
await page.waitForTimeout(250);
await page.screenshot({ path: OUT });
await browser.close();
console.log(`wrote ${OUT} — 1200x630 @2x, ${SITE}`);
