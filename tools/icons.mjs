#!/usr/bin/env node
// Raster the favicon from app/public/favicon.svg.
//
//   node tools/icons.mjs
//
// The SVG is the source of truth; these exist because it is not enough on its
// own. Safari has never reliably used an SVG favicon, browsers and crawlers ask
// for /favicon.ico whatever the markup says, and iOS wants apple-touch-icon.png
// when someone adds the page to their home screen — all three were 404s.
// Re-run if favicon.svg changes.
import { chromium } from '../analysis/node_modules/playwright-core/index.mjs';
import { readFileSync } from 'node:fs';

const svg = readFileSync('app/public/favicon.svg', 'utf8');
const browser = await chromium.launch({
  executablePath: process.env.PLANTS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
for (const [size, out] of [[180, 'app/public/apple-touch-icon.png'], [32, 'app/public/favicon.png']]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  // No page margin and no transparency: an iOS home-screen icon is composited
  // onto whatever the user's wallpaper is, and a transparent one looks broken.
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:#dbe4ea}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
  );
  await page.screenshot({ path: out, omitBackground: false });
  await page.close();
  console.log(`wrote ${out} — ${size}x${size}`);
}
await browser.close();
