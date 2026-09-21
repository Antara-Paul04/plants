#!/usr/bin/env node
// Render one small PNG per gallery site, from the real renderer.
//
//   node tools/thumbs.mjs
//
// These are the trees shown WHILE someone waits for their own. They have to be
// real trees from real measurements or the wait is advertising something we do
// not do — so they come out of the same page a visitor sees, via ?example=,
// with the interface hidden. Square viewport so the capped-lens fit centres the
// tree instead of leaving it in a wide letterbox.
// `grow=0` because the tree now GROWS when it arrives: without it a capture
// is a photograph of a half-grown tree and nothing in the file says so.
// Re-run when the tree's look changes, or the strip quietly shows an old one.
import { chromium } from '../analysis/node_modules/playwright-core/index.mjs';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const gallery = JSON.parse(readFileSync('app/public/gallery.json', 'utf8'));
const sites = Object.keys(gallery.sites);
mkdirSync('app/public/thumbs', { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLANTS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
for (const site of sites) {
  const page = await browser.newPage({ viewport: { width: 460, height: 460 }, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:5170/?example=${encodeURIComponent(site)}&grow=0`, { waitUntil: 'commit' });
  // Wait for the TREE, never for a panel — the caption exists long before the wood does.
  await page.waitForFunction(() => {
    const r = document.getElementById('result');
    return r && !r.hidden && document.getElementById('domain').textContent.length > 0;
  }, { timeout: 120000 });
  await page.waitForTimeout(1600);
  // Stop the idle spin so every thumbnail is shot from the same azimuth.
  await page.mouse.move(230, 230); await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(220);
  await page.evaluate(() => { document.querySelector('.ui').style.display = 'none'; });
  await page.waitForTimeout(160);
  const png = `app/public/thumbs/${site}.png`;
  await page.screenshot({ path: png });
  // 920px of PNG sky gradient is half a megabyte each and these are shown at
  // ~100px. Down to 360 and JPEG: ~35 KB, and the whole strip is 348 KB rather
  // than 4.5 MB — which matters because it loads during a wait, on a phone,
  // exactly when the connection is already busy fetching someone's tree.
  execFileSync('sips', ['-Z', '360', png, '--setProperty', 'format', 'jpeg',
    '--setProperty', 'formatOptions', '80', '--out', `app/public/thumbs/${site}.jpg`],
    { stdio: 'ignore' });
  rmSync(png, { force: true });
  console.log(`  ${site}`);
  await page.close();
}
await browser.close();
console.log(`${sites.length} thumbnails`);
