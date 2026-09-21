#!/usr/bin/env node
// Build the link-preview card.
//
//   node tools/og-card.mjs            (needs the local server on :5170)
//
// A HERO AND A FOOTNOTE, not a contact sheet. Three equal thumbnails in a row
// read as a spec sheet; one large tree is what makes someone stop scrolling, and
// the three small ones underneath carry the claim that they differ without
// competing with it.
//
// The hero is rendered at 5:4 rather than at the card's 1.9:1. The tree is
// HEIGHT-BOUND — the capped-lens fit sizes it to the frame's height — so in a
// wide frame it floats in a lake of empty sky, which is exactly what made the
// first two attempts feel unbalanced. Framed nearly square it fills its own half.
//
// The render carries its own sky, so its left edge is dissolved with a mask
// rather than covered by a panel: a panel needs an opaque colour, and that
// colour has its own edge somewhere else. The card background is the same sky
// the renderer paints, so there is nothing to see across the join.
import { chromium } from '../analysis/node_modules/playwright-core/index.mjs';
import { readFileSync } from 'node:fs';

const HERO = process.argv[2] || 'art.yale.edu';
const MINI = ['info.cern.ch', 'gov.uk', 'linear.app'];
const b64 = (f) => readFileSync(`app/public/thumbs/${f}.jpg`).toString('base64');

const browser = await chromium.launch({
  executablePath: process.env.PLANTS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});

const scene = await browser.newPage({ viewport: { width: 760, height: 630 }, deviceScaleFactor: 2 });
await scene.goto(`http://localhost:5170/?example=${encodeURIComponent(HERO)}&grow=0`, { waitUntil: 'commit' });
await scene.waitForFunction(() => {
  const r = document.getElementById('result');
  return r && !r.hidden && document.getElementById('domain').textContent.length > 0;
}, { timeout: 120000 });
await scene.waitForTimeout(1600);
await scene.mouse.move(380, 315); await scene.mouse.down(); await scene.mouse.up();  // stop the idle spin
await scene.waitForTimeout(250);
await scene.evaluate(() => { document.querySelector('.ui').style.display = 'none'; });
await scene.waitForTimeout(200);
const shot = (await scene.screenshot({ type: 'png' })).toString('base64');
await scene.close();

const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.setContent(`<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;position:relative;overflow:hidden;
    font:400 16px/1.4 ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif;color:#2b2926;
    background:linear-gradient(180deg,#cddbe7 0%,#dde5e5 54%,#e9ebe6 100%)}
  .scene{position:absolute;right:0;top:0;width:760px;height:630px;
    background:url(data:image/png;base64,${shot}) center/cover;
    -webkit-mask-image:linear-gradient(90deg,transparent 0%,#000 34%);
    mask-image:linear-gradient(90deg,transparent 0%,#000 34%)}
  .type{position:absolute;left:66px;top:96px;width:400px}
  h1{font-size:58px;font-weight:670;letter-spacing:-.03em;line-height:1}
  .tag{font-size:30px;line-height:1.2;color:rgba(43,41,38,.66);margin-top:16px;letter-spacing:-.018em}
  .foot{position:absolute;left:68px;bottom:62px}
  .lbl{font-size:12.5px;letter-spacing:.085em;text-transform:uppercase;color:rgba(43,41,38,.42);margin-bottom:14px}
  .mini{display:flex;gap:15px}
  .mini figure{width:92px}
  .mini img{width:92px;height:92px;object-fit:cover;border-radius:14px;display:block;
    border:1px solid rgba(255,255,255,.9);box-shadow:0 7px 18px rgba(43,41,38,.15)}
  .mini figcaption{margin-top:8px;font-size:10.5px;text-align:center;color:rgba(43,41,38,.5);
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
</style>
<div class="scene"></div>
<div class="type"><h1>Plants</h1><div class="tag">every website grows differently</div></div>
<div class="foot"><div class="lbl">same tool, three other sites</div>
  <div class="mini">${MINI.map(s => `<figure><img src="data:image/jpeg;base64,${b64(s)}"><figcaption>${s}</figcaption></figure>`).join('')}</div>
</div>`);
await page.waitForTimeout(400);
await page.screenshot({ path: 'app/public/og.png' });
await browser.close();
console.log(`wrote app/public/og.png — hero ${HERO}, footnote ${MINI.join(' / ')}`);
