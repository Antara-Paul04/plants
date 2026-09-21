#!/usr/bin/env node
// Compose the link-preview card from several real trees.
//
//   node tools/og-card.mjs
//
// A card showing ONE tree says "here is a tree". The product's whole claim is
// that every website grows differently, and that claim is unprovable from one
// specimen — so the card is three, side by side, at the extremes of the range:
// unstyled HTML, a designed page, and one that flowers. Each is a real tree from
// a real measurement (tools/thumbs.mjs) with the site named under it, so the
// card is evidence rather than an advertisement.
// Re-run when the trees change. Requires the thumbnails.
import { chromium } from '../analysis/node_modules/playwright-core/index.mjs';
import { readFileSync } from 'node:fs';

const PICK = ['info.cern.ch', 'gov.uk', 'linear.app'];
const b64 = (f) => readFileSync(`app/public/thumbs/${f}.jpg`).toString('base64');

const html = `<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;display:flex;flex-direction:column;
       font:400 16px/1.4 ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif;
       background:linear-gradient(#b9cfe0 0%,#d9e3e6 46%,#e8ebe7 100%);color:#2b2926;
       padding:44px 52px 36px}
  h1{font-size:40px;font-weight:620;letter-spacing:-.02em}
  p{font-size:21px;color:rgba(43,41,38,.62);margin-top:6px}
  .row{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:26px;align-items:end;margin-top:14px}
  figure{display:flex;flex-direction:column;align-items:center}
  img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:16px;
      border:1px solid rgba(43,41,38,.13);box-shadow:0 8px 26px rgba(43,41,38,.13)}
  figcaption{margin-top:10px;font-size:17px;font-weight:600;color:rgba(43,41,38,.72)}
</style>
<h1>Plants</h1><p>every website grows differently</p>
<div class="row">
  ${PICK.map(s => `<figure><img src="data:image/jpeg;base64,${b64(s)}"><figcaption>${s}</figcaption></figure>`).join('')}
</div>`;

const browser = await chromium.launch({
  executablePath: process.env.PLANTS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.setContent(html);
await page.waitForTimeout(400);
await page.screenshot({ path: 'app/public/og.png' });
await browser.close();
console.log('wrote app/public/og.png — 1200x630 @2x, ' + PICK.join(' / '));
