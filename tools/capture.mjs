#!/usr/bin/env node
// Render the product's own pages to PNG, headlessly.
//
// Exists so BEFORE and AFTER are captured by an identical process rather than
// by whoever happened to be at the keyboard — a comparison is worthless if the
// two halves were shot differently.
//
//   node tools/capture.mjs <out-dir> [site ...]
//
// Requires the V0 server on :5170 and Playwright from analysis/node_modules.

import { chromium } from '../analysis/node_modules/playwright-core/index.mjs';
import { mkdir } from 'node:fs/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.PLANTS_BASE || 'http://localhost:5170';

// The eight states the comparison board must cover. Real corpus sites, so the
// board never drifts into testing only synthetic cases.
const DEFAULT_SITES = [
  'info.cern.ch',                    // raw HTML -> bare
  'bettermotherfuckingwebsite.com',  // deliberate minimalism -> sparse
  'en.wikipedia.org',                // text-heavy -> normal
  'stripe.com',                      // richly designed -> lush, flowering
  'github.com',                      // dark ground, dense
  'craigslist.org',                  // winter
  'apple.com',                       // image-led, dark
  'tailwindcss.com',                 // colourful accents
];

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: node tools/capture.mjs <out-dir> [site ...]');
  process.exit(1);
}
const sites = process.argv.slice(3).length ? process.argv.slice(3) : DEFAULT_SITES;

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 1100 }, deviceScaleFactor: 2 });

const shoot = async (name, url, { wait = 24000, fullPage = false } = {}) => {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `${outDir}/${name}.png`, fullPage });
    console.log('  captured', name);
  } catch (err) {
    console.log('  FAILED  ', name, '-', err.message.split('\n')[0]);
  }
};

for (const site of sites) {
  await shoot(site.replace(/[^a-z0-9.]/gi, '-'), `${BASE}/?site=${encodeURIComponent(site)}`);
}
await shoot('grid', `${BASE}/compare.html`, { wait: 28000, fullPage: true });

await browser.close();
console.log(`\ndone -> ${outDir}`);
