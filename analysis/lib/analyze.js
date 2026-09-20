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

// WHERE CHROME IS. The list below is this laptop's two cached copies — which is
// fine for local development and is the reason the analyzer cannot leave it.
// PLANTS_CHROME overrides, so the same code runs anywhere a Chrome exists
// without editing source: a Linux CI box, a container, or a serverless build
// that unpacks its own binary. Checked first and NOT existence-tested, because
// on some hosts the binary is materialised at first launch.
//
// Deployment is gated on more than this (see docs/DEPLOYMENT.md) — a Chrome that
// runs is necessary, not sufficient — but the hardcoded paths were the part that
// made the question unaskable.
const CHROME = process.env.PLANTS_CHROME || [
  '/Users/antarapaul/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  '/Users/antarapaul/.cache/puppeteer/chrome/mac_arm-152.0.7977.75/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
].find(p => fs.existsSync(p));

const VW = 1440, VH = 900;
const BUDGET_MS   = 20000;   // hard ceiling for the whole analysis
// 'commit' — response headers received. NOT 'domcontentloaded', which does not fire
// until every deferred and module script has DOWNLOADED AND EXECUTED. Measured on
// github.com across three visits: HTML complete 1.2-2.2s and domInteractive 2.0-2.5s
// EVERY time, while DOM-ready was 5.3s / 12s / >30s. All the variance is in the script
// tail, and we measure pixels from a screenshot — the site's JS finishing is not a
// precondition for that. Raising the old timeout only waited longer for the wrong event.
// Generous ON PURPOSE, and this is not the trap of waiting longer for the wrong event.
// 'commit' is a NETWORK event that reliably arrives (HTML complete measured 1.2-2.2s on
// every github visit); it is slow here only because the CPU is starved. Waiting longer
// for DOM-ready was futile because that event may never fire. These are different.
const NAV_MS      = 15000;
const LOAD_MS     = 4500;    // bounded wait for subresources AFTER dom-ready. Needed:
                             // without it figma.com measured before its imagery painted
                             // and classified as WINTER — a colourful site read as
                             // colourless. A fast wrong tree is worse than a slow one.
const READY_MS    = 7000;    // poll for a parseable document after commit
const STABLE_MS   = 9000;    // ceiling on visual-stability settling
const POLL_MS     = 250;
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
    if (!CHROME) throw new Error('no Chrome binary found — set PLANTS_CHROME to one');
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
  NOT_RENDERED:  'That website did not finish drawing for us.',
  REFUSED:       'That website refused to let us look at it.',
  OFFLINE:       'We could not reach the internet just now — this is our problem, not that site\'s.',
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
    chromaticBins:        (design.chromaticBins ?? 0),
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
      resp = await page.goto(u.href, { waitUntil: 'commit', timeout: Math.min(NAV_MS, Math.max(2500, left() - 6000)) });
      // commit only means headers; wait for a document we can actually read
      await page.waitForFunction(() => document.readyState !== 'loading' && !!document.body,
        { timeout: Math.max(1000, Math.min(READY_MS, left() - 5000)), polling: 200 }).catch(() => {});
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
      const e = navErr || '';
      // "we are offline" is not "your site is down". During a two-minute outage every
      // site a user tried was blamed for it.
      if (/ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|ERR_PROXY_CONNECTION_FAILED/.test(e)) {
        return fail(domain, 'OFFLINE', e);
      }
      if (/Timeout|timeout/.test(e)) return fail(domain, 'TIMEOUT', e);
      // a site that hangs up on us is REFUSING, not unreachable — telling a user
      // "we could not reach reddit.com" invites a retry that can never work.
      if (/ERR_CONNECTION_(RESET|REFUSED|CLOSED)|ERR_EMPTY_RESPONSE|ERR_HTTP2_PROTOCOL_ERROR|ERR_SSL/.test(e)) {
        return fail(domain, 'REFUSED', e);
      }
      if (!probe && resp) {
        // the document went away under us mid-probe: a post-response navigation, which
        // is how the bot walls arrive
        return fail(domain, 'REFUSED', 'page navigated away while being read' + (e ? ' — ' + e : ''));
      }
      return fail(domain, 'UNREACHABLE', e || 'no response and no error reported');
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
    // Settle by MEASURED VISUAL STABILITY rather than a fixed wait. Two things have to
    // be true before we measure: the page has actual content, and it has stopped
    // changing. Waiting on a clock instead is how lusion.co's black preloader was
    // measured as the site (false WINTER, ink 0.012) and play.grafana.org's spinner too.
    // Moving navigation earlier makes that failure MORE likely, so this is the part that
    // has to carry it.
    const tSettle = now();
    let prev = null, lastSig = null, stable = 0, settled = false;
    while (left() > 6000 && now() - tSettle < STABLE_MS) {
      const sig = await page.evaluate(() => {
        const all = document.querySelectorAll('body *');
        let geo = 0, n = 0;
        for (const el of all) {
          const r = el.getBoundingClientRect();
          if (r.width > 40 && r.height > 20) {
            geo += (Math.round(r.x) + Math.round(r.y) * 3 + Math.round(r.width) * 7 + Math.round(r.height) * 11) % 1000003;
            if (++n > 400) break;
          }
        }
        return { els: all.length, text: (document.body.innerText || '').trim().length, geo, boxes: n };
      }).catch(() => null);
      if (!sig) break;
      lastSig = sig;                                  // ALWAYS the most recent reading
      // a preloader is a page with almost nothing on it; do not accept it as settled
      const hasContent = sig.text >= 40 || sig.boxes >= 8;
      const same = prev && sig.els === prev.els && sig.text === prev.text && sig.geo === prev.geo;
      stable = same ? stable + 1 : 0;
      if (hasContent && stable >= 2) { settled = true; break; }
      prev = sig;
      await page.waitForTimeout(POLL_MS);
    }
    t.settleReason = settled ? 'stable' : 'deadline';
    await Promise.race([
      page.evaluate(() => document.fonts ? document.fonts.ready : null).catch(() => {}),
      page.waitForTimeout(600)
    ]);

    // DOM-geometry stability is NOT visual stability: an image finishing its load changes
    // pixels without moving a single rect. Using the DOM proxy alone measured stripe.com
    // at ink 0.042 against 0.122 when fully painted — a materially different tree.
    // So confirm with actual frames, which is what "successive frame diffs until the page
    // stops changing" means. Bounded, and it reuses the diff we already have.
    // Compared as raw PNG buffers in Node. PNG encoding is deterministic, so identical
    // bytes means an identical frame — exact, free, and crucially it touches no shared
    // resource. Routing this through the one scratch page deadlocked 8 concurrent
    // requests contending on a single page.
    if (settled) {
      let lastFrame = null;
      for (let i = 0; i < 4 && left() > 7000; i++) {
        let f;
        try { f = await page.screenshot({ type: 'png', timeout: 4000 }); }
        catch (e) { break; }
        if (lastFrame && Buffer.compare(lastFrame, f) === 0) break;   // visually settled
        lastFrame = f;
        await page.waitForTimeout(450);
      }
    }
    t.settle = now() - tSettle;

    // ---- SECOND VALIDITY GATE, on the settled document.
    // tesla.com, adidas.com and dribbble.com all grew trees and were told they are
    // "essentially unstyled HTML" — they were Akamai block pages. The block arrives by a
    // navigation after the first response, so the early gate matched an empty document.
    const post = await page.evaluate(() => {
      const txt = (document.body ? document.body.innerText || '' : '').trim();
      let boxes = 0;
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect(); if (r.width > 40 && r.height > 20) boxes++;
      }
      return { title: document.title || '', text: txt.slice(0, 600), chars: txt.length,
               links: document.querySelectorAll('a[href]').length,
               els: document.querySelectorAll('body *').length, boxes, url: location.href };
    }).catch(() => null);

    if (post) {
      if (INTERSTITIAL.test(post.title) || INTERSTITIAL.test(post.text)) {
        return fail(domain, 'BLOCKED', 'interstitial after load: ' + post.title.slice(0, 60));
      }
      const h2 = hostOf(post.url);
      if (h2 && h2 !== domain && !h2.endsWith('.' + domain) && !domain.endsWith('.' + h2)) {
        return fail(domain, 'REDIRECTED', 'navigated to ' + h2);
      }
      // A page with NO LINKS AT ALL is not a website. This is the discriminator that
      // survives info.cern.ch, which is the case that must survive: cern is genuinely
      // unstyled HTML and has 25 links, 49 elements, 983 characters. The block pages have
      // ZERO links — tesla 3 elements / 191 chars, adidas 15 boxes / 1127 chars.
      // "Small" cannot be the test; "not a site" can.
      if (post.links === 0 && post.chars < 1500 && post.boxes < 20) {
        return fail(domain, 'BLOCKED',
          `no links, ${post.chars} chars, ${post.boxes} boxes — a notice page, not a website`);
      }
    }

    // Post-settle emptiness. The early gate runs before content has had a chance; this
    // one runs after. play.grafana.org delivers 20 elements, 25 characters and ZERO
    // painted boxes and never changes — measuring that produces a confident fingerprint
    // of a spinner, which is the worst failure mode this probe has.
    // Use the LATEST reading, never `prev` — when the loop exits early under contention
    // `prev` is stale or null, and treating that as the page's final state rejected
    // stripe, github, wikipedia, linear and tailwind as empty. Only judge emptiness on a
    // reading we actually took.
    const after = lastSig || { text: 0, boxes: 0, els: 0, unknown: true };
    if (!after.unknown && after.text < 50 && after.boxes < 5) {
      return fail(domain, 'EMPTY_PAGE', `after settling: ${after.els} elements, ${after.text} chars, ${after.boxes} boxes`);
    }

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
    const shotMs = Math.max(3000, Math.min(SHOT_MS, left() - 1200));
    try {
      shot = await page.screenshot({ type: 'png', fullPage: true, clip: { x: 0, y: 0, width: VW, height: clipH }, animations: 'disabled', timeout: shotMs });
    } catch {
      // a tall/complex page can blow the clip budget — fall back to the viewport alone
      shot = await page.screenshot({ type: 'png', animations: 'disabled', timeout: Math.max(2500, left() - 500) });
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

    const inkNow = 1 - (pixels.all ? pixels.all.whitespaceRatio : 1);
    if (!after.unknown && inkNow < 0.02 && after.boxes >= 50) {
      return fail(domain, 'NOT_RENDERED',
        `DOM has ${after.boxes} boxes and ${after.text} chars but the frame is ${(inkNow * 100).toFixed(1)}% inked — the page did not paint`);
    }

    t.total = now() - T0;
    return { ok: true, domain, url: finalUrl, settleReason: t.settleReason, fingerprint: toFingerprint(m, pixels, accent, hasMotion), timingMs: t };
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
