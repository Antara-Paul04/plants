// EXPERIMENT — disposable research probe orchestrator. Not product code.
// Page content is treated strictly as untrusted data: we measure it, never follow it.

import { chromium } from 'playwright-core';
import { measurePage } from './measure.js';
import { analysePixels, diffFrames } from './pixels.js';
import { CORPUS, CHECKPOINT } from './corpus.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = [
  '/Users/antarapaul/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  '/Users/antarapaul/.cache/puppeteer/chrome/mac_arm-152.0.7977.75/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
].find(p => fs.existsSync(p));

const VW = 1440, VH = 900;
const NAV_TIMEOUT = 25000, SETTLE_MS = 1800, MOTION_GAP = 700;

const now = () => Number(process.hrtime.bigint() / 1000000n);

async function probeSite(browser, site, scratch) {
  const t = {}; const T0 = now();
  const rec = { id: site.id, url: site.url, tags: site.tags, note: site.note, ok: false, failures: [] };
  const ctx = await browser.newContext({
    viewport: { width: VW, height: VH }, deviceScaleFactor: 1,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
    colorScheme: 'light', locale: 'en-US', ignoreHTTPSErrors: true
  });
  let bytes = 0, requests = 0;
  ctx.on('response', r => { requests++; const c = r.headers()['content-length']; if (c) bytes += parseInt(c, 10) || 0; });
  const page = await ctx.newPage();
  page.on('pageerror', () => {});
  page.on('dialog', d => d.dismiss().catch(() => {}));

  try {
    const tNav = now();
    const resp = await page.goto(site.url, { waitUntil: 'load', timeout: NAV_TIMEOUT }).catch(async e => {
      rec.failures.push('load:' + e.message.split('\n')[0]);
      return null;
    });
    t.load = now() - tNav;
    rec.httpStatus = resp ? resp.status() : null;
    rec.finalUrl = page.url();
    if (rec.finalUrl !== site.url) rec.redirected = true;

    // VALIDITY GATE. The probe's worst failure mode is not crashing: it is producing a
    // confident fingerprint of a page that is not the site (Cloudflare challenge,
    // Chrome's own error page). Those must never enter the corpus as data.
    const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return null; } };
    const probe = await page.evaluate(() => ({
      title: document.title || '',
      bodyStart: (document.body ? document.body.innerText || '' : '').slice(0, 400),
      isChromeError: location.protocol === 'chrome-error:' || !!document.querySelector('#main-frame-error')
    })).catch(() => ({ title: '', bodyStart: '', isChromeError: false }));
    const INTERSTITIAL = /attention required|just a moment|access denied|you have been blocked|security check|enable javascript and cookies|verifying you are human|site can.t be reached|err_connection/i;
    const v = { status: rec.httpStatus, intendedHost: host(site.url), finalHost: host(rec.finalUrl), reasons: [] };
    if (!resp) v.reasons.push('navigation-failed');
    if (probe.isChromeError) v.reasons.push('chrome-error-page');
    if (rec.httpStatus && rec.httpStatus >= 400) v.reasons.push('http-' + rec.httpStatus);
    if (INTERSTITIAL.test(probe.title) || INTERSTITIAL.test(probe.bodyStart)) v.reasons.push('interstitial-text');
    if (v.intendedHost && v.finalHost && v.intendedHost !== v.finalHost) v.reasons.push('host-changed:' + v.finalHost);
    v.valid = v.reasons.length === 0;
    v.observedTitle = probe.title.slice(0, 90);
    rec.validity = v;
    if (!v.valid) {
      rec.failures.push('INVALID:' + v.reasons.join(','));
      rec.ok = false;
      return rec;   // measured nothing; this site is a failure case, not a data point
    }

    const tSettle = now();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => rec.failures.push('networkidle-timeout'));
    await page.evaluate(() => document.fonts ? document.fonts.ready : null).catch(() => {});
    await page.waitForTimeout(SETTLE_MS);
    t.settle = now() - tSettle;

    // --- motion: 3 viewport frames AFTER settling, so lazy-load/network noise is behind us
    const tMotion = now();
    const frames = [];
    for (let i = 0; i < 3; i++) {
      if (i) await page.waitForTimeout(MOTION_GAP);
      frames.push((await page.screenshot({ type: 'png', animations: 'allow' })).toString('base64'));
    }
    t.motionCapture = now() - tMotion;

    // --- rendered DOM + computed style measurement
    const tDom = now();
    const m = await page.evaluate(measurePage, {});
    t.domEval = now() - tDom;

    // --- screenshots for palette: first viewport, and up to 3 viewports
    const tShot = now();
    const clipH = Math.min(m.docHeight, VH * 3);
    let fullShot = null;
    try {
      fullShot = await page.screenshot({ type: 'png', fullPage: true, clip: { x: 0, y: 0, width: VW, height: clipH }, animations: 'disabled' });
    } catch (e) {
      rec.failures.push('fullshot:' + e.message.split('\n')[0]);
      fullShot = await page.screenshot({ type: 'png', animations: 'disabled' });
    }
    t.screenshot = now() - tShot;
    fs.writeFileSync(path.join(ROOT, 'shots', site.id + '.png'), fullShot);

    // --- pixel analysis in a scratch page (canvas decode; no image library needed)
    const tPix = now();
    rec.pixels = {
      v3: await scratch.evaluate(analysePixels, {
        pngB64: fullShot.toString('base64'),
        maskRects: m.mediaRects.filter(r => r.y < clipH), docW: VW
      }),
      v1: await scratch.evaluate(analysePixels, {
        pngB64: frames[0], maskRects: m.mediaRects.filter(r => r.y < VH), docW: VW
      })
    };
    rec.motion = await scratch.evaluate(diffFrames, {
      frames, docW: VW,
      excludeRects: m.mediaRects.filter(r => r.y < VH)   // video/canvas excluded variant
    });
    t.pixels = now() - tPix;

    rec.dom = m;
    rec.network = { requests, contentLengthBytes: bytes };
    rec.ok = true;
  } catch (e) {
    rec.failures.push('fatal:' + String(e.message).split('\n')[0]);
  } finally {
    t.total = now() - T0;
    rec.timingMs = t;
    await ctx.close().catch(() => {});
  }
  return rec;
}

async function main() {
  const which = process.argv[2] === 'full' ? CORPUS : CHECKPOINT;
  const only = process.argv[3];
  const sites = (only ? which.filter(s => s.id === only) : which)
    .map(s => ({ ...s, url: s.url.replace('file://LOCAL', 'file://' + ROOT) }));

  if (!CHROME) throw new Error('No cached Chrome binary found');
  console.log(`probe: ${sites.length} site(s) @ ${VW}x${VH}\nchrome: ${CHROME.split('/').slice(-5, -4)}\n`);

  const browser = await chromium.launch({
    executablePath: CHROME, headless: true,
    args: ['--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
           '--disable-features=IsolateOrigins,site-per-process', '--font-render-hinting=none']
  });
  const scratchCtx = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const scratch = await scratchCtx.newPage();
  await scratch.goto('about:blank');

  const out = [];
  for (const site of sites) {
    process.stdout.write(`→ ${site.id.padEnd(16)} `);
    const r = await probeSite(browser, site, scratch);
    out.push(r);
    const s = r.ok ? r.dom.scopes.v3 : null;
    console.log(r.ok
      ? `ok ${String(r.timingMs.total + 'ms').padStart(7)}  style=${s.stylingRichness.toFixed(2)} unstyled=${s.unstyledScore.toFixed(2)} ink=${(1 - r.pixels.v3.all.whitespaceRatio).toFixed(2)} colr=${r.pixels.v3.all.colorfulness.toFixed(2)} motion=${r.motion.sustained.toFixed(3)}${r.failures.length ? '  [' + r.failures.length + ' warn]' : ''}`
      : `INVALID  ${r.failures.join('; ')}${r.validity ? '  (saw: "' + r.validity.observedTitle + '")' : ''}`);
  }
  await browser.close();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(ROOT, 'results', `run-${process.argv[2] === 'full' ? 'full' : 'checkpoint'}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify({ meta: { viewport: { VW, VH }, settleMs: SETTLE_MS, motionGapMs: MOTION_GAP, when: new Date().toISOString() }, sites: out }, null, 2));
  fs.writeFileSync(path.join(ROOT, 'results', 'latest.json'), JSON.stringify({ file, sites: out }, null, 2));
  console.log(`\nwrote ${path.relative(ROOT, file)}`);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
