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
const STABLE_HITS = 3;       // consecutive identical readings, not 2
const MIN_SETTLE  = 1500;    // stability cannot be accepted before this
const GROW_EPS    = 1.02;    // >2% more painted area counts as "still arriving"
const SHOT_MS     = 9000;    // the capture IS the measurement; do not starve it.
                             // Scales with the budget: a caller that grants 45s
                             // (a cold serverless browser) should not still be
                             // capturing on a ceiling tuned for a warm 20s one —
                             // monopo.london cleared navigation on the larger
                             // budget and then failed at the screenshot.
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
    // LOCAL first: a Chrome already on this machine, which is what every
    // measurement in this repo was taken against. SERVERLESS second: a lambda has
    // no browser and no writable filesystem outside /tmp, so @sparticuz/chromium
    // unpacks one at first launch and reports where it put it — which is why
    // PLANTS_CHROME is checked but deliberately NOT existence-tested.
    let exe = CHROME;
    let extra = [];
    let launchEnv;
    if (!exe) {
      // THE LIB BUNDLE IS ONLY EXTRACTED IF IT BELIEVES IT IS ON LAMBDA, and it
      // decides from AWS_EXECUTION_ENV / AWS_LAMBDA_JS_RUNTIME. Vercel runs on
      // Lambda but does not set either in the shape it looks for, so it unpacked
      // chromium WITHOUT its shared libraries and the browser died on
      // "libnss3.so: cannot open shared object file" — surfacing, unhelpfully, as
      // "Target page, context or browser has been closed".
      //
      // Declaring the runtime is what makes it extract al2023.tar.br. Node 20 and
      // 22 are both Amazon Linux 2023, which is what Vercel's Node runtime is.
      // Set BEFORE the import, because the module reads it at load.
      process.env.AWS_LAMBDA_JS_RUNTIME ??= 'nodejs20.x';
      const mod = await import('@sparticuz/chromium').catch(() => null);
      if (!mod) throw new Error('no Chrome binary found — set PLANTS_CHROME, or install @sparticuz/chromium');
      const pkg = mod.default ?? mod;
      exe = await pkg.executablePath();
      // ITS ARGS ARE FOR PUPPETEER AND TWO OF THEM BREAK PLAYWRIGHT.
      //
      //   --single-process   puppeteer tolerates it; playwright connects to a
      //                      separate browser process and the launch dies with
      //                      "Target page, context or browser has been closed".
      //   --headless='shell' playwright adds its own headless flag, and two
      //                      disagreeing ones is not a configuration.
      //
      // Everything else — /dev/shm, gpu, sandbox, the lambda's whole survival
      // kit — is kept. Their --disable-features ALREADY carries IsolateOrigins
      // and site-per-process, which is what ours used to add: a second
      // --disable-features does not merge with the first, it replaces it, so
      // appending ours silently threw away the rest of their list.
      extra = (pkg.args ?? []).filter((a) =>
        !a.startsWith('--single-process') && !a.startsWith('--headless'));
      // AND ITS SHARED LIBRARIES. executablePath() unpacks chromium AND a lib
      // bundle into /tmp and points process.env.LD_LIBRARY_PATH at it — but
      // playwright spawns the browser with an env of its own, so the child never
      // saw it and died with "libnss3.so: cannot open shared object file",
      // surfacing as the far less helpful "Target page, context or browser has
      // been closed". Pass it through explicitly.
      launchEnv = { ...process.env, LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH };
    }
    _browser = await chromium.launch({
      executablePath: exe, headless: true,
      ...(launchEnv ? { env: launchEnv } : {}),
      // Ours are appended only when they are not already covered: on the
      // serverless path IsolateOrigins/site-per-process come from the list above.
      args: [...extra, '--hide-scrollbars','--mute-audio','--font-render-hinting=none',
             ...(extra.length ? [] : ['--disable-features=IsolateOrigins,site-per-process'])]
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
  NOT_A_PAGE:    'That address is a file rather than a web page.',
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
  // A HOSTNAME IS LABELS, NOT PUNCTUATION. "..." contains a dot and passed, so we
  // went to the network for it and came back "We could not reach that website" —
  // which is false and unhelpful: we never should have tried. Every label must
  // carry at least one alphanumeric, and the last one (the TLD) must be letters.
  // An IP address is exempt: it is a valid host with no letters in it at all.
  const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname);
  if (!isIPv4) {
    const labels = u.hostname.split('.');
    if (labels.length < 2) return null;
    if (labels.some((l) => !/[a-z0-9]/i.test(l))) return null;
    if (!/^[a-z]{2,}$/i.test(labels[labels.length - 1])) return null;
  }
  // NOT OUR OWN NETWORK. A website is a thing on the public internet; every
  // private, loopback and link-local address is either a machine we are running
  // on or a machine next to it, and neither is a website someone can ask for.
  //
  // Nothing leaked when this was probed — 127.0.0.1 and 169.254.169.254 both
  // came back CONNECTION_REFUSED because nothing is listening in the sandbox —
  // but that is the runtime's accident, not our rule, and it would stop being
  // true on any host that does listen. 169.254.169.254 in particular is the
  // cloud metadata endpoint. The cost was already real and visible: 10.0.0.1 and
  // 192.168.1.1 each held a serverless function for 15.8 s waiting on a route
  // that cannot answer, which is a way to spend our budget from outside.
  if (isPrivateHost(u.hostname)) return null;
  // CREDENTIALS ARE NOT PART OF AN ADDRESS SOMEONE WANTS A TREE FROM.
  // http://user:pass@example.com grew perfectly well and handed the site a
  // username and password on the way. Whatever they are, they are not ours to
  // forward, and the tree is identical without them.
  u.username = '';
  u.password = '';
  return u;
}

// Private, loopback, link-local, and the names that resolve to them. IPv6 is
// handled by its prefix: ::1 loopback, fc00::/7 unique-local, fe80::/10
// link-local, plus ::ffff: IPv4-mapped forms.
function isPrivateHost(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.home.arpa')) return true;
  if (h.includes(':')) {
    if (h === '::1' || h === '::') return true;
    if (/^f[cd][0-9a-f]{2}:/.test(h)) return true;          // fc00::/7
    if (/^fe[89ab][0-9a-f]:/.test(h)) return true;          // fe80::/10
    const mapped = h.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
    return mapped ? isPrivateIPv4(mapped[1]) : false;
  }
  // An integer or hex literal is still an IP address, just spelled to avoid a
  // filter: 2130706433 and 0x7f000001 are both 127.0.0.1.
  if (/^\d+$/.test(h) && h.length > 4) {
    const n = Number(h);
    if (Number.isSafeInteger(n) && n <= 0xffffffff) {
      return isPrivateIPv4([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'));
    }
  }
  if (/^0x[0-9a-f]+$/.test(h)) return true;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(h) ? isPrivateIPv4(h) : false;
}

function isPrivateIPv4(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127
      || (a === 169 && b === 254)                  // link-local, incl. cloud metadata
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127)        // carrier-grade NAT
      || a >= 224;                                 // multicast and reserved
}
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return null; } };
// A brand redirecting to its own country site is the same brand. From this network every
// global brand sends us to .in, so without this no global brand can grow a tree at all.
// Compare the first label only; a parked page or squatter will not match it.
// Suffixes that are two labels long, so the registrable domain is three.
// Without these, example.co.uk and other.co.uk would share a "brand".
const TWO_PART_SUFFIX = new Set([
  'co.uk','org.uk','ac.uk','gov.uk','me.uk','net.uk','sch.uk','nhs.uk',
  'co.jp','ne.jp','or.jp','ac.jp','go.jp',
  'com.au','net.au','org.au','edu.au','gov.au',
  'co.nz','net.nz','org.nz','govt.nz','co.za','org.za',
  'com.br','com.cn','com.mx','com.ar','com.tr','com.sg','com.hk','com.tw',
  'com.pl','com.ua','com.ng','com.pk','com.ph','com.vn','com.my',
  'co.kr','co.id','co.th','co.il','co.ke','co.ve',
  'co.in','net.in','org.in','gov.in','ac.in','edu.in','res.in',
]);
// The part of a hostname that identifies who owns it: the last two labels,
// or three when the last two are a public suffix rather than a name.
const registrable = (host) => {
  const p = String(host || '').toLowerCase().split('.').filter(Boolean);
  if (p.length <= 2) return p.join('.');
  const lastTwo = p.slice(-2).join('.');
  return TWO_PART_SUFFIX.has(lastTwo) ? p.slice(-3).join('.') : lastTwo;
};
const sameBrand = (a, b) => {
  if (!a || !b) return false;
  if (a === b || a.endsWith('.' + b) || b.endsWith('.' + a)) return true;
  // SAME OWNER IS THE SAME BRAND, whatever the subdomain does. The first-label
  // test below has a three-character floor — it stops "en.foo.com" matching
  // "en.bar.com" — and that floor was rejecting en.m.wikipedia.org when it
  // redirected to en.wikipedia.org, its own desktop site. Every two-letter
  // language subdomain was caught by it, which is most of Wikipedia.
  const ra = registrable(a);
  if (ra && ra === registrable(b)) return true;
  const la = a.split('.')[0], lb = b.split('.')[0];
  if (!la || !lb || la.length < 3 || lb.length < 3) return false;
  // A global brand redirecting to its own country site: nike.com -> nike.in.
  return la === lb || la.includes(lb) || lb.includes(la);
};

// What is at this address, according to the server rather than the browser?
// Used only when Chrome aborts a navigation without rendering: HEAD first because
// it costs nothing, then a one-byte ranged GET for the servers that answer HEAD
// with 405. Any failure returns '' and the caller keeps its original verdict —
// this may only ever turn an UNREACHABLE into something more specific, never the
// other way round.
async function headContentType(href, budgetMs) {
  const read = async (method) => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), budgetMs);
    try {
      const r = await fetch(href, {
        method,
        redirect: 'follow',
        signal: ac.signal,
        headers: method === 'GET' ? { range: 'bytes=0-0' } : undefined
      });
      if (!r.ok && r.status !== 206) return '';
      if (method === 'GET' && r.body) await r.body.cancel().catch(() => {});
      return String(r.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
    } catch { return ''; }
    finally { clearTimeout(timer); }
  };
  return (await read('HEAD')) || (await read('GET'));
}

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
    // GROUND COMES FROM THE DESIGN, NOT FROM THE WHOLE FRAME — same rule the
    // accent already follows, and for the same reason (D3: photographs are
    // content). `ground` was the commonest pixel ANYWHERE, so a page whose
    // pictures outweigh its own background got its pictures' colour.
    // awwwards.com is the case: body background #f8f8f8, 78% of the frame taken
    // by an embedded near-black screenshot of somebody else's site, ground read
    // as #0f0f0f, and a light page grew a night tree. Falls back to the whole
    // frame when there is no meaningful mask, exactly as the accent does.
    palette: { ground: (useMask && masked.background) || all.background,
               primary: design.primary || null, secondary: design.secondary || null },
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
  // The capture keeps its share of whatever budget it was given, rather than a
  // constant tuned for the default one.
  const shotMs = Math.round(SHOT_MS * (budget / BUDGET_MS));
  const invoked = now();

  const u = normalizeUrl(url);
  if (!u) return fail(hostOf(url) || String(url || '').slice(0, 80), 'INVALID_URL');
  const domain = u.hostname.replace(/^www\./,'');

  // THE BUDGET IS FOR READING THE SITE, NOT FOR STARTING A BROWSER.
  //
  // The clock used to start here, before getBrowser(), so a cold serverless
  // start — where @sparticuz/chromium unpacks a browser into /tmp before Chrome
  // can even launch — was charged to the website. Measured on a freshly deployed
  // function: 9.2 s for info.cern.ch cold against 4.8 s warm, so the first
  // visitor after a quiet period silently gave their site 4.4 s less than the
  // next one. The budget is meant to bound how long we look at a page; it was
  // bounding look-plus-launch, and launch varies by an order of magnitude.
  //
  // So launch first, then start the clock. `wallMs` is the separate, absolute
  // cap from invocation: the platform kills the function at maxDuration and a
  // killed function returns NOTHING, which is worse than our own TIMEOUT — the
  // visitor gets a dead request instead of copy that explains itself.
  try {
    await getBrowser();
  } catch (e) {
    return fail(domain, 'INTERNAL', 'browser did not start: ' + String(e?.message || e).slice(0, 70));
  }

  const T0 = now();
  const wallLeft = () => (opts.wallMs ? opts.wallMs - (now() - invoked) : Infinity);
  const left = () => Math.min(budget - (now() - T0), wallLeft());
  // Whichever runs out first is the real ceiling, and it is what the TIMEOUT says.
  const ceiling = Math.max(1000, Math.min(budget, wallLeft()));

  // The per-step timeouts below are best-effort; this race is what actually guarantees
  // the ceiling. Without it stripe.com ran 34s against a 20s budget.
  let timer;
  const deadline = new Promise(res => { timer = setTimeout(() => res(fail(domain, 'TIMEOUT', `exceeded ${ceiling}ms`)), ceiling); });
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
      // A timeout BEFORE commit means nothing answered — the port may be dead, and http
      // is the only thing that can help. A timeout AFTER commit means the site answered
      // and is merely slow, where http would change nothing. `commit` makes the two
      // distinguishable, so the retry can be aimed precisely.
      // bettermotherfuckingwebsite.com black-holes on 443 (no TCP in 25s) and answers on
      // 80 in 0.64s. With info.cern.ch it is the crux the project rests on.
      const firstNav = Math.min(NAV_MS, Math.max(2500, left() - 9000));
      try {
        resp = await page.goto(u.href, { waitUntil: 'commit', timeout: firstNav });
      } catch (e1) {
        const preCommit = /Timeout|ERR_CONNECTION_TIMED_OUT|ERR_ADDRESS_UNREACHABLE/.test(String(e1.message));
        if (preCommit && u.protocol === 'https:' && left() > 6000) {
          const httpUrl = 'http://' + u.host + u.pathname + u.search;
          resp = await page.goto(httpUrl, { waitUntil: 'commit', timeout: Math.max(3000, Math.min(8000, left() - 5000)) });
          t.httpFallback = true;
        } else { throw e1; }
      }
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
      // A NAVIGATION THE BROWSER REFUSED TO RENDER. ERR_ABORTED means Chrome
      // decided this was not a page to display — almost always a download or a
      // content type it has no viewer for. On this laptop Chrome opens a PDF in
      // its built-in viewer, so the content-type check further down catches it;
      // the serverless build has no such viewer and aborts the navigation before
      // a single header reaches us. Same URL, two different failures, and the
      // server's was a lie: "we could not reach arxiv.org" about a paper that
      // answered immediately. So ask the network directly what it is. Costs one
      // request and only on this branch, which no ordinary website takes.
      if (/ERR_ABORTED/.test(e)) {
        const ctype = await headContentType(u.href, Math.min(4000, Math.max(1500, left())));
        if (ctype && !/^(text\/html|application\/xhtml)/.test(ctype)) {
          return fail(domain, 'NOT_A_PAGE', ctype);
        }
      }
      return fail(domain, 'UNREACHABLE', e || 'no response and no error reported');
    }
    if (status >= 400) {
      const code = status === 404 || status === 410 ? 'NOT_FOUND'
                 : (status === 403 || status === 401 || status === 429) ? 'BLOCKED' : 'UNREACHABLE';
      return fail(domain, code, 'HTTP ' + status);
    }
    // NOT A WEB PAGE. A PDF, an image or a download answers perfectly well and
    // has no design to read — Chrome renders a PDF in a viewer with no page text,
    // so it used to come back EMPTY_PAGE: "there was nothing to read", which is
    // both wrong and faintly insulting about a 30-page paper. Say what it is.
    try {
      const ctype = String((await resp.headerValue('content-type')) || '').toLowerCase();
      if (ctype && !/^\s*(text\/html|application\/xhtml)/.test(ctype)) {
        return fail(domain, 'NOT_A_PAGE', ctype.split(';')[0].trim());
      }
    } catch { /* no headers to read; carry on and judge it on what renders */ }
    if (INTERSTITIAL.test(probe.title) || INTERSTITIAL.test(probe.text)) {
      return fail(domain, 'BLOCKED', 'interstitial: ' + probe.title.slice(0, 80));
    }
    const finalHost = hostOf(finalUrl);
    if (finalHost && !sameBrand(finalHost, domain)) {
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
    // PAGE-DEFINED EVENT FIRST, sampling second.
    // The BEFORE build produced identical DNA on 10 of 10 sites measured hours apart
    // because it waited for an event the PAGE defines. My settle waits for a condition I
    // define by sampling, and sampling is inherently less repeatable — raycast flipped
    // between flowering and winter across identical runs. So take both: a bounded wait
    // for 'load', which is where raycast's imagery actually arrives, then stability
    // sampling for what 'load' misses. Bounded, so it cannot reintroduce the timeout that
    // made us abandon 'load' as the navigation condition in the first place.
    await page.waitForLoadState('load', { timeout: Math.max(1500, Math.min(6000, left() * 0.35)) }).catch(() => {});
    let prev = null, lastSig = null, stable = 0, settled = false, peakPaint = 0;
    // Settle gets a SHARE of what remains, never all of it. Waiting for paint is right;
    // waiting for paint until the deadline passes is not — under 8-way contention that
    // turned a passing concurrency test into 0/8.
    const settleCap = Math.max(1200, Math.min(STABLE_MS, left() * 0.55));
    while (left() > 5000 && now() - tSettle < settleCap) {
      const sig = await page.evaluate(() => {
        const all = document.querySelectorAll('body *');
        let geo = 0, n = 0, painted = 0, scanned = 0;
        const VW = innerWidth, LIM = innerHeight * 3;
        for (const el of all) {
          let r; try { r = el.getBoundingClientRect(); } catch (e) { continue; }
          if (!r) continue;   // walmart.com: getBoundingClientRect returned undefined
          if (r.width > 40 && r.height > 20) {
            geo += (Math.round(r.x) + Math.round(r.y) * 3 + Math.round(r.width) * 7 + Math.round(r.height) * 11) % 1000003;
            n++;
          }
          // painted area: the cheap DOM stand-in for "how dark is this page yet".
          // Capped so a huge DOM cannot make polling expensive.
          if (scanned < 600 && r.width >= 4 && r.height >= 4 && r.top < LIM && r.bottom > 0) {
            scanned++;
            const cs = getComputedStyle(el);
            let own = ''; for (const c of el.childNodes) if (c.nodeType === 3) own += c.nodeValue;
            const bg = cs.backgroundColor;
            if ((bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgb(255, 255, 255)') ||
                (cs.backgroundImage && cs.backgroundImage !== 'none') || own.trim().length) {
              painted += Math.min(r.width, VW) * Math.min(r.height, LIM);
            }
          }
          if (n > 400 && scanned >= 600) break;
        }
        return { els: all.length, text: (document.body.innerText || '').trim().length, geo, boxes: n, painted };
      }).catch(() => null);
      if (!sig) break;
      lastSig = sig;                                  // ALWAYS the most recent reading
      // a preloader is a page with almost nothing on it; do not accept it as settled
      const hasContent = sig.text >= 40 || sig.boxes >= 8;
      // STILL ARRIVING? A page whose painted area is climbing is not finished, whatever
      // its DOM signature says. Without this the loop settled during a PAUSE: raycast.com
      // was photographed at ~18% of its own final ink and grew a colourless winter tree
      // from a vivid red site — fast, stable-looking and wrong.
      const roomLeft = (now() - tSettle) < settleCap * 0.92;
      if (roomLeft && sig.painted > peakPaint * GROW_EPS) { peakPaint = sig.painted; stable = 0; prev = sig; await page.waitForTimeout(POLL_MS); continue; }
      if (sig.painted > peakPaint) peakPaint = sig.painted;
      const same = prev && sig.els === prev.els && sig.text === prev.text && sig.geo === prev.geo;
      stable = same ? stable + 1 : 0;
      // three consecutive agreements, and never before MIN_SETTLE — two frames matching
      // inside a loading pause is not evidence that loading has stopped.
      const minSettle = Math.min(MIN_SETTLE, settleCap * 0.5);
      if (hasContent && stable >= STABLE_HITS && (now() - tSettle) >= minSettle) { settled = true; break; }
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
    // PIXEL-LEVEL arrival check, because the DOM proxy above cannot see it.
    // bbc.com's layout boxes exist early and its imagery fills in afterwards without
    // moving a single rect, so painted-area plateaus while the page is still arriving —
    // the same DOM-versus-pixels trap that measured stripe at ink 0.042 against 0.122.
    // PNG byte size is a free proxy for how much has actually been drawn: a page still
    // painting compresses larger. Grow => not finished, whatever the DOM says.
    // Runs WHETHER OR NOT the DOM loop settled. Gating it on `settled` was a hole: the
    // runs that produced bbc's winter tree were the FAST ones, where the DOM loop hit its
    // deadline, skipped this check entirely and photographed a half-painted page. The
    // pixel check is the authoritative one, so it must not be conditional on the proxy.
    {
      let lastFrame = null, lastSize = 0, quiet = 0;
      for (let i = 0; i < 10 && left() > 5500; i++) {
        let f;
        try { f = await page.screenshot({ type: 'png', timeout: 4000 }); }
        catch (e) { break; }
        const grew = lastSize && f.length > lastSize * 1.03;
        const identical = lastFrame && Buffer.compare(lastFrame, f) === 0;
        if (grew) quiet = 0;                       // still arriving
        else if (identical) quiet++;               // nothing moved at all
        else quiet = Math.max(quiet, 0);
        lastSize = Math.max(lastSize, f.length);
        lastFrame = f;
        if (quiet >= 2) break;                     // two consecutive identical frames
        await page.waitForTimeout(450);
      }
      if (quiet < 2) t.settleReason = 'deadline';  // never went quiet; say so
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
        let r; try { r = el.getBoundingClientRect(); } catch (e) { continue; }
        if (r && r.width > 40 && r.height > 20) boxes++;
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
      if (h2 && !sameBrand(h2, domain)) {
        return fail(domain, 'REDIRECTED', 'navigated to ' + h2);
      }
      // A page with NO LINKS AT ALL is not a website. This is the discriminator that
      // survives info.cern.ch, which is the case that must survive: cern is genuinely
      // unstyled HTML and has 25 links, 49 elements, 983 characters. The block pages have
      // ZERO links — tesla 3 elements / 191 chars, adidas 15 boxes / 1127 chars.
      // "Small" cannot be the test; "not a site" can.
      if (post.links === 0 && post.chars < 1500 && post.boxes < 20) {
        // A notice page has PAINTED its notice. An app shell that never rendered has not,
        // and calling that "blocked" tells the user something false about the site.
        const painted = (lastSig && lastSig.painted) || 0;
        const unpainted = painted < (VW * VH * 0.02);
        return fail(domain, unpainted ? 'NOT_RENDERED' : 'BLOCKED',
          unpainted ? `nothing painted (${post.chars} chars, ${post.boxes} boxes) — the page did not render, it is not refusing us`
                    : `no links, ${post.chars} chars, ${post.boxes} boxes — a notice page, not a website`);
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
    let clipH = Math.min(m.docHeight, VH * 3);
    // WALK THE REGION BEFORE CAPTURING IT.
    // bbc.com serves an identical page every time — 15k characters, ~71 of 136 images
    // loaded — yet measured ink 0.055 or 0.313 with nothing in between. The page was
    // never the variable: its lazy images render into a full-page capture on some runs
    // and not others. Scrolling the analysed region first makes them load and decode, so
    // the capture stops being a coin flip. Same cause as magnumphotos' blank frames.
    try {
      const steps = Math.min(3, Math.ceil(Math.min(m.docHeight, VH * 3) / VH));
      for (let i = 1; i <= steps && left() > 6000; i++) {
        await page.evaluate(y => window.scrollTo(0, y), i * VH);
        await page.waitForTimeout(350);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    } catch (e) { /* scrolling is best-effort */ }

    // The analysis region is three viewports. If we can only capture one, we are
    // measuring a different thing and must say so: magnumphotos.com's full capture timed
    // out, silently fell back to the viewport, and reported colourfulness 0.000 — because
    // its first screen is a white hero and all its photography is below it. A photography
    // site with no photographs. Degrade in steps, and record which step we reached.
    let shot = null, captureScope = 'v3';
    const clipAt = h => ({ x: 0, y: 0, width: VW, height: Math.max(VH, Math.min(m.docHeight, h)) });
    const attempts = [
      ['v3', () => page.screenshot({ type: 'png', fullPage: true, clip: clipAt(VH * 3), animations: 'disabled', timeout: Math.max(3000, Math.min(shotMs, left() - 1500)) })],
      ['v2', () => page.screenshot({ type: 'png', fullPage: true, clip: clipAt(VH * 2), animations: 'disabled', timeout: Math.max(4000, Math.min(7000, left() - 1000)) })],
      ['v1', () => page.screenshot({ type: 'png', animations: 'disabled', timeout: Math.max(3500, left() - 600) })]
    ];
    for (const [scope, take] of attempts) {
      try { shot = await take(); captureScope = scope; break; } catch (e) { /* try a smaller region */ }
    }
    if (!shot) return fail(domain, 'NOT_RENDERED', 'could not capture the page within the time budget');
    t.captureScope = captureScope;
    if (captureScope === 'v2') clipH = Math.min(m.docHeight, VH * 2);
    else if (captureScope === 'v1') clipH = VH;
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
    // Two questions, not one.
    //  (a) Did we see ANYTHING? A frame under 0.5% ink is blank — there is nothing to
    //      measure whatever the DOM claims. cern sits at 1.8% and craigslist at 1.5%,
    //      three times this floor, so a deliberately sparse text page is safe.
    //  (b) Otherwise, sparse is only suspicious while the page is STILL MUTATING. A page
    //      that painted a little and then stopped has finished; an app shell that painted
    //      a little and is still changing has not. `settled` already records which.
    if (!after.unknown && inkNow < 0.005) {
      return fail(domain, 'NOT_RENDERED',
        `the frame is ${(inkNow * 100).toFixed(1)}% inked — blank, nothing was captured`);
    }
    if (!after.unknown && inkNow < 0.02 && after.boxes >= 50 && !settled) {
      return fail(domain, 'NOT_RENDERED',
        `${after.boxes} boxes, frame ${(inkNow * 100).toFixed(1)}% inked and still changing at the deadline`);
    }

    t.total = now() - T0;
    return { ok: true, domain, url: finalUrl, settleReason: t.settleReason, captureScope, httpFallback: !!t.httpFallback, fingerprint: toFingerprint(m, pixels, accent, hasMotion), timingMs: t };
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
