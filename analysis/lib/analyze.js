// URL in -> validated fingerprint out. The callable interface behind the V0 server.
//
// Refactored from probe/run.js (capture + validity), probe/pixels.js (colour) and
// lib/mapping.js (thresholds). No motion sampling: repeatability never held, and it was
// ~2s of pure waiting. No thresholds live here — they are in lib/mapping.js.
//
// Page content is untrusted data. It is measured, never followed.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { measurePage } from '../probe/measure.js';
import { analysePixels, diffFrames } from '../probe/pixels.js';
import { measureAccentRegions } from '../probe/accent-regions.js';
import { buildDna } from './mapping.js';

const CHROME = [
  '/Users/antarapaul/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  '/Users/antarapaul/.cache/puppeteer/chrome/mac_arm-152.0.7977.75/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
].find(p => fs.existsSync(p));

const VW = 1440, VH = 900;
const BUDGET_MS   = 20000;   // hard ceiling for the whole analysis
const NAV_MS      = 8000;    // domcontentloaded, not load: 'load' waits on every
                             // subresource and was timing linear.app out entirely
const LOAD_MS     = 4500;    // bounded wait for subresources AFTER dom-ready. Needed:
                             // without it figma.com measured before its imagery painted
                             // and classified as WINTER — a colourful site read as
                             // colourless. A fast wrong tree is worse than a slow one.
const IDLE_MS     = 1500;    // networkidle never fires on many SPAs — cap it low
const SETTLE_MS   = 600;     // fixed settle after that
const SHOT_MS     = 5000;
const MOTION_GAP  = 1000;    // validated protocol: 5 frames at 1s. A SHORT 3-frame check
const MOTION_MAX  = 5;       // is a subset of it, so stopping early when it already reads
                             // non-zero is faithful, not a different method.

const now = () => Number(process.hrtime.bigint() / 1000000n);

// ---------------------------------------------------------------- browser reuse
let _browser = null, _scratch = null, _starting = null;

async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;
  if (_starting) return _starting;
  _starting = (async () => {
    if (!CHROME) throw new Error('no cached Chrome binary found');
    _browser = await chromium.launch({
      executablePath: CHROME, headless: true,
      args: ['--hide-scrollbars','--mute-audio','--disable-features=IsolateOrigins,site-per-process','--font-render-hinting=none']
    });
    _browser.on('disconnected', () => { _browser = null; _scratch = null; });
    _starting = null;
    return _browser;
  })();
  return _starting;
}

// one blank page that decodes screenshots to pixels, reused across requests
async function getScratch() {
  if (_scratch && !_scratch.isClosed()) return _scratch;
  const b = await getBrowser();
  const ctx = await b.newContext({ viewport: { width: 800, height: 600 } });
  _scratch = await ctx.newPage();
  await _scratch.goto('about:blank');
  return _scratch;
}

export async function closeBrowser() {
  const b = _browser;
  _browser = null; _scratch = null; _starting = null;
  if (b) await b.close().catch(() => {});
}

// ---------------------------------------------------------------- failure codes
// The server turns these into something a person reads, so they must distinguish
// "that site blocked us" from "that URL doesn't exist" from "it took too long".
export const FAILURES = {
  INVALID_URL:   'That does not look like a valid website address.',
  UNREACHABLE:   'We could not reach that website.',
  NOT_FOUND:     'That page does not exist.',
  BLOCKED:       'That website blocked us from looking at it.',
  TIMEOUT:       'That website took too long to load.',
  REDIRECTED:    'That address sent us somewhere else.',
  EMPTY_PAGE:    'There was nothing on that page to look at.',
  INTERNAL:      'Something went wrong while looking at that website.'
};
const fail = (domain, code, detail) => ({ ok: false, domain, failure: { code, message: FAILURES[code] || FAILURES.INTERNAL, detail: detail || null } });

function normalizeUrl(input) {
  let raw = String(input || '').trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (!u.hostname.includes('.') || /\s/.test(u.hostname)) return null;
  return u;
}
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return null; } };

const INTERSTITIAL = /attention required|just a moment|access denied|you have been blocked|security check|enable javascript and cookies|verifying you are human|are you a robot|site can.t be reached|err_connection/i;

// ---------------------------------------------------------------- fingerprint
// V0 set, frozen by Lead. The design-palette fields exist because the media-masked
// palette ruling stands: photographs are content (D3), not a site's brand colour.
function toFingerprint(m, pixels, accent, hasMotion) {
  const v = m.scopes.v3;
  const all = pixels.all, masked = pixels.mediaMasked;
  const useMask = !!masked && (pixels.maskedFraction || 0) > 0.05;
  const design = useMask ? masked : all;
  return {
    authored:             +(1 - v.unstyledScore).toFixed(3),
    stylingRichness:      +v.stylingRichness.toFixed(3),
    inkCoverage:          +(1 - all.whitespaceRatio).toFixed(3),
    colorfulness:         +all.colorfulness.toFixed(3),
    designColorfulness:   +(design.colorfulness ?? 0).toFixed(3),
    designChromaticRatio: +(design.chromaticRatio ?? 0).toFixed(4),
    warmShareOfChroma:    +(design.warmShare ?? 0).toFixed(3),
    imageArea:            +v.media.imageArea.toFixed(3),
    canvasArea:           +v.media.canvasArea.toFixed(3),
    textDensity:          +Math.min(1, v.text.charsPerMegapixel / 2500).toFixed(3),
    accentConcentration:  +((accent && accent.concentration) || 0).toFixed(3),
    hasVisibleMotion:     !!hasMotion,
    palette: { ground: all.background, primary: design.primary || null, secondary: design.secondary || null },
    paletteSource: useMask ? 'media-masked' : 'whole-frame'
  };
}

// ---------------------------------------------------------------- public API
async function scratchDiff(frames) {
  const sc = await getScratch();
  const r = await sc.evaluate(diffFrames, { frames, docW: VW, excludeRects: [] }).catch(() => null);
  return r ? r.sustained : 0;
}

export async function analyzeUrl(url, opts = {}) {
  const budget = opts.budgetMs || BUDGET_MS;
  const T0 = now();
  const left = () => budget - (now() - T0);

  const u = normalizeUrl(url);
  if (!u) return fail(hostOf(url) || String(url || '').slice(0, 80), 'INVALID_URL');
  const domain = u.hostname.replace(/^www\./,'');

  // The per-step timeouts below are best-effort; this race is what actually guarantees
  // the ceiling. Without it stripe.com ran 34s against a 20s budget.
  let timer;
  const deadline = new Promise(res => { timer = setTimeout(() => res(fail(domain, 'TIMEOUT', `exceeded ${budget}ms`)), budget); });
  try {
    return await Promise.race([runAnalysis(u, domain, budget, T0, left), deadline]);
  } finally { clearTimeout(timer); }
}

async function runAnalysis(u, domain, budget, T0, left) {

  let ctx, page;
  const t = {};
  try {
    const browser = await getBrowser();
    ctx = await browser.newContext({
      viewport: { width: VW, height: VH }, deviceScaleFactor: 1,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
      // ASSUMPTION, documented in docs/WEBSITE-ANALYSIS.md: light is pinned so the same
      // URL gives everyone the same tree. It changes what adaptive sites look like.
      colorScheme: 'light', locale: 'en-US', ignoreHTTPSErrors: true
    });
    page = await ctx.newPage();
    page.on('pageerror', () => {});
    page.on('dialog', d => d.dismiss().catch(() => {}));

    // ---- navigate
    const tNav = now();
    let resp = null, navErr = null;
    try {
      resp = await page.goto(u.href, { waitUntil: 'domcontentloaded', timeout: Math.min(NAV_MS, Math.max(2500, left() - 6000)) });
    } catch (e) { navErr = String(e.message || e).split('\n')[0]; }
    t.load = now() - tNav;

    // ---- VALIDITY GATE. Never grow a tree from an error page or a bot challenge.
    const status = resp ? resp.status() : null;
    const finalUrl = page.url();
    const probe = await page.evaluate(() => ({
      title: document.title || '',
      text: (document.body ? document.body.innerText || '' : '').slice(0, 400),
      isChromeError: location.protocol === 'chrome-error:' || !!document.querySelector('#main-frame-error'),
      bodyLen: (document.body ? (document.body.innerText || '').trim().length : 0),
      els: document.querySelectorAll('body *').length
    })).catch(() => null);

    if (!probe || probe.isChromeError || !resp) {
      const timedOut = /Timeout|timeout/.test(navErr || '');
      return fail(domain, timedOut ? 'TIMEOUT' : 'UNREACHABLE', navErr);
    }
    if (status >= 400) {
      const code = status === 404 || status === 410 ? 'NOT_FOUND'
                 : (status === 403 || status === 401 || status === 429) ? 'BLOCKED' : 'UNREACHABLE';
      return fail(domain, code, 'HTTP ' + status);
    }
    if (INTERSTITIAL.test(probe.title) || INTERSTITIAL.test(probe.text)) {
      return fail(domain, 'BLOCKED', 'interstitial: ' + probe.title.slice(0, 80));
    }
    const finalHost = hostOf(finalUrl);
    if (finalHost && finalHost !== domain && !finalHost.endsWith('.' + domain) && !domain.endsWith('.' + finalHost)) {
      return fail(domain, 'REDIRECTED', 'landed on ' + finalHost);
    }
    if (probe.els < 3 && probe.bodyLen < 2) return fail(domain, 'EMPTY_PAGE');

    // ---- settle (bounded by whatever budget remains)
    // Settle is best-effort and strictly bounded. If the page never goes quiet we
    // measure what is on screen at the deadline: a slightly-early tree beats no tree.
    const tSettle = now();
    // 'load' as a BOUNDED wait rather than the navigation condition: we get images and
    // fonts when they are quick, and give up on them when they are not.
    await page.waitForLoadState('load', { timeout: Math.max(500, Math.min(LOAD_MS, left() - 7000)) }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: Math.max(300, Math.min(IDLE_MS, left() - 6500)) }).catch(() => {});
    await Promise.race([
      page.evaluate(() => document.fonts ? document.fonts.ready : null).catch(() => {}),
      page.waitForTimeout(800)
    ]);
    await page.waitForTimeout(Math.max(150, Math.min(SETTLE_MS, left() - 7000)));
    t.settle = now() - tSettle;

    // ---- measure rendered DOM (~20ms) — no motion sampling
    const tDom = now();
    const m = await page.evaluate(measurePage, { only: 'v3' });
    t.domEval = now() - tDom;

    // ---- motion (boolean only; the magnitude is NOT exposed — it was rejected at 19x
    // run-to-run variation and one stabilised test does not reverse that).
    // Sampling matters more than thresholding: a 1.4s window read figma at 0.001 on some
    // loads and 0.0000 on others, not because its motion is weak but because the window
    // fell between animation events. Over ~4s it reads 0.22 every time.
    // Early exit: static pages return EXACTLY 0.0000 and never a false positive, so a
    // non-zero short read already proves motion. Only the ambiguous zero pays full price.
    // DISABLED BY DEFAULT (opts.motion === true to enable). Live testing found the
    // boolean still flips on figma.com: 5 true / 1 false over 6 identical runs. That
    // breaks "same URL gives everyone the same tree", and nothing in the mapping consumes
    // it, so sampling is not worth 3-5s of every request. See VISUAL-RICHNESS.md.
    const tMotion = now();
    let hasMotion = false, motionFrames = 0;
    try {
      if (!opts.motion) throw new Error('motion sampling disabled');
      const frames = [];
      for (let i = 0; i < MOTION_MAX && left() > 6000; i++) {
        if (i) await page.waitForTimeout(MOTION_GAP);
        frames.push((await page.screenshot({ type: 'png', animations: 'allow', timeout: 3000 })).toString('base64'));
        motionFrames = frames.length;
        if (frames.length >= 3) {
          const r = await scratchDiff(frames.slice(-3));
          if (r > 0) { hasMotion = true; break; }      // proven; stop paying
        }
      }
    } catch (e) { /* motion is best-effort; never fails the analysis */ }
    t.motion = now() - tMotion;

    // ---- one screenshot for colour
    const tShot = now();
    const clipH = Math.min(m.docHeight, VH * 3);
    let shot;
    const shotMs = Math.max(1500, Math.min(SHOT_MS, left() - 1500));
    try {
      shot = await page.screenshot({ type: 'png', fullPage: true, clip: { x: 0, y: 0, width: VW, height: clipH }, animations: 'disabled', timeout: shotMs });
    } catch {
      // a tall/complex page can blow the clip budget — fall back to the viewport alone
      shot = await page.screenshot({ type: 'png', animations: 'disabled', timeout: Math.max(1200, left() - 600) });
    }
    t.screenshot = now() - tShot;

    const tPix = now();
    const scratch = await getScratch();
    const pixels = await scratch.evaluate(analysePixels, {
      pngB64: shot.toString('base64'),
      maskRects: m.mediaRects.filter(r => r.y < clipH), docW: VW
    });
    // spatial layout of the accent colour: separates flowers (many small) from fruit
    // (few large). Same masked frame as the palette, so the two agree.
    const accent = await scratch.evaluate(measureAccentRegions, {
      pngB64: shot.toString('base64'),
      maskRects: m.mediaRects.filter(r => r.y < clipH), docW: VW
    }).catch(() => null);
    t.pixels = now() - tPix;

    t.total = now() - T0;
    return { ok: true, domain, url: finalUrl, fingerprint: toFingerprint(m, pixels, accent, hasMotion), timingMs: t };
  } catch (e) {
    const msg = String(e && e.message || e).split('\n')[0];
    return fail(domain, /Timeout|timeout/.test(msg) ? 'TIMEOUT' : 'INTERNAL', msg);
  } finally {
    if (ctx) await ctx.close().catch(() => {});
  }
}

// fingerprint -> Botanical DNA. Thresholds live in lib/mapping.js, nowhere else.
export function fingerprintToDna(fingerprint, domain) {
  return buildDna(fingerprint, domain).dna;
}
// same, but keeps the per-field explanations (the contract's explainability test)
export function fingerprintToDnaWithWhy(fingerprint, domain) {
  return buildDna(fingerprint, domain);
}
