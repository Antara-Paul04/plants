#!/usr/bin/env node
// Render the product's own pages to PNG, headlessly.
//
// Exists so BEFORE and AFTER are captured by an identical process rather than
// by whoever happened to be at the keyboard — a comparison is worthless if the
// two halves were shot differently.
//
//   node tools/capture.mjs <out-dir> [site ...]
//
// Survey mode runs many arbitrary sites and keeps what the API said about each:
//
//   node tools/capture.mjs <out-dir> --survey [--sites-file <file>] [site ...]
//
// It waits for the page's real READY / ERROR state instead of a fixed delay,
// shoots the full page (tree plus "Why this tree?"), retries a failure once,
// and writes results.json. Failures are shot into _failed/ and recorded, never
// dropped. Re-running skips sites already captured, so it doubles as a retry.
// The default mode above is untouched — before/after boards depend on it.
//
// Add --with-site to also shoot each website (_site/) and compose it beside its
// tree (pairs/), because a tree can only be judged against the site it came from.
// The site shot is the harness's OWN visit under the analyzer's conditions — the
// analyzer does not keep its frame — so it is close to, not identical to, what was
// measured. Works on an already-captured folder: trees are skipped, pairs are added.
// That visit also WEIGHS the page (time to domcontentloaded, DOM nodes, scripts,
// transfer size) into results.json, so failures have numbers too.
//
// Add --quiet for any run whose TIMINGS or FAILURES matter: it waits for the whole
// machine's CPU to fall under 50% before each attempt and records CPU before and
// during it. Without that, a timeout says more about this machine than about the site.
// For the same reason run a sweep WITHOUT --with-site first, and add the sites and
// pairs in a second pass, so nothing of ours competes with the analysis.
//
// Add --keep-failures when resuming an interrupted sweep: recorded failures are kept
// instead of being re-attempted. Each result carries e2eMs — the whole wait a person
// sits through, tree build included — beside the API's analysis-only timingMs.
//
// Requires the V0 server on :5170 and Playwright from analysis/node_modules.

import { chromium } from '../analysis/node_modules/playwright-core/index.mjs';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { loadavg, cpus } from 'node:os';

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
  console.error('usage: node tools/capture.mjs <out-dir> [--survey] [--sites-file <file>] [site ...]');
  process.exit(1);
}

const rest = process.argv.slice(3);
const survey = rest.includes('--survey');
const withSite = rest.includes('--with-site');
const keepFailures = rest.includes('--keep-failures');
const quiet = rest.includes('--quiet');
const fileAt = rest.indexOf('--sites-file');
const sitesFile = fileAt >= 0 ? rest[fileAt + 1] : null;
const named = rest.filter((a, i) => !a.startsWith('--') && !(fileAt >= 0 && i === fileAt + 1));

// Sites file: one per line, `site  free-text category`, # for comments.
const category = new Map();
if (sitesFile) {
  for (const line of (await readFile(sitesFile, 'utf8')).split('\n')) {
    const [site, ...label] = line.replace(/#.*/, '').trim().split(/\s+/);
    if (!site) continue;
    named.push(site);
    category.set(site, label.join(' '));
  }
}
const sites = named.length ? named : DEFAULT_SITES;
// zsh does not word-split an unquoted $VAR: a whole list arrives as one argument.
const joined = sites.find((s) => /\s/.test(s));
if (joined) {
  console.error(`not a site: "${joined.slice(0, 60)}…" — pass sites as separate arguments, or use --sites-file`);
  process.exit(1);
}
const fileName = (site) => site.replace(/[^a-z0-9.]/gi, '-');

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

// WHOLE-MACHINE CPU, not ours. The analyzer's 8s navigation limit is a reading of how
// busy this machine is (8 simultaneous requests fail 3 of the 4 lightest sites on the
// web), so a timeout is only evidence about a SITE if the machine was quiet when it
// happened. --quiet waits for that before every attempt, and every attempt records it.
const cpuSnap = () => cpus().reduce((a, c) => {
  const total = Object.values(c.times).reduce((x, y) => x + y, 0);
  return { idle: a.idle + c.times.idle, total: a.total + total };
}, { idle: 0, total: 0 });
const busyBetween = (a, b) => +(1 - (b.idle - a.idle) / Math.max(1, b.total - a.total)).toFixed(2);
const waitQuiet = async (limit = 0.5, maxMs = 45000) => {
  const t0 = Date.now();
  let busy;
  do { const a = cpuSnap(); await new Promise((r) => setTimeout(r, 1500)); busy = busyBetween(a, cpuSnap()); }
  while (busy > limit && Date.now() - t0 < maxMs);
  return { busy, waitedMs: Date.now() - t0 };
};

// One survey attempt: load the product page, take the API's own answer off the
// wire, and wait for the state the human would see before shooting it.
const attempt = async (site) => {
  const t0 = Date.now();
  const reply = page.waitForResponse((r) => r.url().endsWith('/api/grow'), { timeout: 90000 });
  await page.goto(`${BASE}/?site=${encodeURIComponent(site)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const data = await (await reply).json();
  await page.waitForSelector(data.ok ? '#result:not([hidden])' : '#msg.err', { timeout: 60000 });
  // END TO END: the wait a person sits through, tree build included — not timingMs,
  // which is the analysis alone. `stamp` is the product's own claim, kept to compare.
  data.e2eMs = Date.now() - t0;
  data.stamp = data.ok ? await page.textContent('#stamp').catch(() => null) : null;
  data.shown = data.ok ? null : await page.textContent('#msg').catch(() => null);
  // Fixed settle from READY, so every tree is shot at the same auto-rotate angle.
  if (data.ok) await page.waitForTimeout(3000);
  return data;
};

const exists = (p) => access(p).then(() => true, () => false);

// The website itself, shot under the conditions analysis/lib/analyze.js measures in
// (mirrored, not imported: that module owns its own browser). Same viewport, light
// mode, user agent and settle sequence, so a preloader it measured is one we see too.
const siteCtx = withSite ? await browser.newContext({
  viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
  colorScheme: 'light', locale: 'en-US', ignoreHTTPSErrors: true,
}) : null;
const composer = withSite ? await browser.newPage({ viewport: { width: 2260, height: 1000 }, deviceScaleFactor: 1 }) : null;

// Also weighs the page, independently of the analyzer, so a site the analyzer gave up
// on still has numbers: how long a plain visit takes to reach domcontentloaded (the
// event the analyzer's 8s navigation limit waits for) and how heavy the document is.
//
// It records the four STAGES of a page load separately — first byte, HTML complete,
// domInteractive (parsed), DOM-ready — because they are not equally stable: on
// github.com the first three landed within 2.5s on every visit while DOM-ready ran
// 5s, 12s, >30s. Navigation waits only for 'commit', so a site that never reaches
// DOM-ready still reports the stages it did reach, which are the ones that matter most.
const shootSite = async (url, path) => {
  const p = await siteCtx.newPage();
  const calm = quiet ? await waitQuiet() : { busy: null };
  const m = { url, dclMs: null, error: null, cpuBefore: calm.busy, load1: +loadavg()[0].toFixed(1) };
  try {
    const t0 = Date.now(), cpu0 = cpuSnap();
    await p.goto(url, { waitUntil: 'commit', timeout: 30000 });
    m.commitMs = Date.now() - t0;
    await p.waitForLoadState('domcontentloaded', { timeout: 30000 })
      .then(() => { m.dclMs = Date.now() - t0; }, () => { m.dclTimedOut = true; });
    m.cpuDuring = busyBetween(cpu0, cpuSnap());
    m.nodesAtDcl = await p.evaluate(() => document.getElementsByTagName('*').length).catch(() => null);
    await p.waitForLoadState('load', { timeout: 4500 }).then(() => { m.loadMs = Date.now() - t0; }, () => { m.loadMs = null; });
    await p.waitForLoadState('networkidle', { timeout: 1500 }).catch(() => {});
    await p.waitForTimeout(600);
    Object.assign(m, await p.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const res = performance.getEntriesByType('resource');
      const paint = Object.fromEntries(performance.getEntriesByType('paint').map((e) => [e.name, Math.round(e.startTime)]));
      const q = (s) => document.querySelectorAll(s).length;
      const at = (v) => (v ? Math.round(v) : null);   // 0 means "has not happened"
      const dcl = nav.domContentLoadedEventStart || Infinity;
      const tail = res.filter((r) => r.responseEnd <= dcl + 5 && (r.initiatorType === 'script' || /\.m?js(\?|$)/.test(r.name)));
      return {
        stages: { ttfb: at(nav.responseStart), htmlDone: at(nav.responseEnd), domInteractive: at(nav.domInteractive),
          domReady: at(nav.domContentLoadedEventStart), load: at(nav.loadEventStart),
          firstPaint: paint['first-paint'] ?? null, firstContentfulPaint: paint['first-contentful-paint'] ?? null },
        scriptsBeforeDomReady: tail.length, scriptKBBeforeDomReady: Math.round(tail.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024),
        finalUrl: location.href, nodes: q('*'), scripts: q('script'), blockingScripts: q('head script[src]:not([async]):not([defer]):not([type=module])'),
        deferredScripts: q('script[defer][src], script[type=module]'),
        stylesheets: q('link[rel=stylesheet]'), images: q('img'), iframes: q('iframe'), canvases: q('canvas'),
        htmlKB: Math.round((nav.decodedBodySize || 0) / 1024), ttfbMs: Math.round(nav.responseStart || 0),
        requests: res.length, transferKB: Math.round(res.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024),
      };
    }).catch(() => ({})));
    await p.screenshot({ path, animations: 'disabled', timeout: 10000 });
    m.shot = true;
  } catch (err) { m.error = err.message.split('\n')[0]; m.shot = false; }
  finally { await p.close().catch(() => {}); }
  return m;
};

// Website on the left, its tree and explanation on the right, one PNG per site.
const composePair = async (name, r) => {
  const uri = async (f) => `data:image/png;base64,${(await readFile(f)).toString('base64')}`;
  const d = r.dna;
  const summary = [`${d.foliage?.state} / ${d.foliage?.density}`, `flowers ${d.flowers?.amount}`,
    d.botanicalState, d.fruit?.enabled ? 'fruit' : null].filter(Boolean).join(' · ');
  await composer.setContent(`<style>
    body { margin: 30px; background: #f6f2ec; font: 22px/1.3 -apple-system, system-ui, sans-serif; color: #26221d; }
    header { display: flex; gap: 18px; align-items: baseline; margin-bottom: 18px; }
    header span { color: #6d665c; }
    main { display: flex; gap: 0; align-items: flex-start; }
    img { width: 1100px; display: block; }
    .site { border: 1px solid rgba(0,0,0,.14); border-radius: 10px; margin-top: 190px; box-sizing: border-box; }
  </style>
  <header><b>${r.site}</b><span>${summary}</span><span>${r.url || ''}</span></header>
  <main><img class="site" src="${await uri(`${outDir}/_site/${name}.png`)}"><img src="${await uri(`${outDir}/${name}.png`)}"></main>`);
  await composer.screenshot({ path: `${outDir}/pairs/${name}.png`, fullPage: true });
};

if (survey) {
  const resultsPath = `${outDir}/results.json`;
  await mkdir(`${outDir}/_failed`, { recursive: true });
  if (withSite) { await mkdir(`${outDir}/_site`, { recursive: true }); await mkdir(`${outDir}/pairs`, { recursive: true }); }
  let results = [];
  try { results = JSON.parse(await readFile(resultsPath, 'utf8')); } catch {}

  // Site shot + pair for one results entry; fills in only what is missing.
  const addSite = async (name, r, tag) => {
    if (!(await exists(`${outDir}/_site/${name}.png`)) && !r.siteMetrics) {
      r.siteMetrics = await shootSite(r.url || `https://${r.site}`, `${outDir}/_site/${name}.png`);
      await writeFile(resultsPath, JSON.stringify(results, null, 2));
      if (!r.siteMetrics.shot) { console.log(tag, 'no site ', r.site, '-', r.siteMetrics.error); return; }
      console.log(tag, 'weighed ', r.site, `dcl ${r.siteMetrics.dclMs}ms · ${r.siteMetrics.nodes} nodes · ${r.siteMetrics.scripts} scripts · ${r.siteMetrics.transferKB}KB`);
    }
    if (r.ok && !(await exists(`${outDir}/pairs/${name}.png`))) {
      await composePair(name, r);
      console.log(tag, 'paired  ', r.site);
    }
  };

  for (const [i, site] of sites.entries()) {
    const name = fileName(site);
    const tag = `[${i + 1}/${sites.length}]`;
    const prior = results.find((r) => r.site === site);
    // --keep-failures: a recorded failure is a result too. Without it a resumed run
    // re-attempts every failure, which is what you want for a retry and not for a sweep.
    if (prior && (await exists(`${outDir}/${name}.png`) || (keepFailures && prior.failure))) {
      console.log(tag, 'skip    ', site, prior.ok ? '(already captured)' : '(failure kept)');
      if (withSite) await addSite(name, prior, tag);
      continue;
    }

    let data = null, error = null, attempts = 0;
    const attemptLog = [];
    let offlineWaits = 0;
    while (attempts < 2 && !(data && data.ok)) {
      attempts++;
      const calm = quiet ? await waitQuiet() : { busy: null, waitedMs: 0 };
      const t0 = Date.now(), cpu0 = cpuSnap();
      try { data = await attempt(site); error = null; }
      catch (err) { error = err.message.split('\n')[0]; }
      const cpuDuring = busyBetween(cpu0, cpuSnap());
      // OUR connection dropping is not a fact about the site. Wait it out, uncounted.
      if (/ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED/.test(data?.failure?.detail || '') && offlineWaits < 6) {
        offlineWaits++; attempts--; data = null;
        console.log(tag, 'offline ', site, '- this machine has no internet; waiting 20s');
        await new Promise((r) => setTimeout(r, 20000));
        continue;
      }
      // load1: this machine's 1-minute load average. The analyzer's 8s navigation limit is
      // CPU-sensitive on OUR side, so a timeout means little without knowing how busy we were.
      attemptLog.push({ ok: Boolean(data?.ok), code: data?.ok ? null : (data?.failure?.code || 'HARNESS'),
        detail: data?.ok ? null : (data?.failure?.detail || error), ms: Date.now() - t0,
        analysisMs: data?.timingMs ?? null, load1: +loadavg()[0].toFixed(1),
        cpuBefore: calm.busy, cpuDuring, waitedForQuietMs: calm.waitedMs });
    }

    const ok = Boolean(data && data.ok);
    await page.screenshot({ path: ok ? `${outDir}/${name}.png` : `${outDir}/_failed/${name}.png`, fullPage: true })
      .catch((err) => { error = error || err.message.split('\n')[0]; });

    const entry = {
      site, category: category.get(site) || '', file: ok ? `${name}.png` : `_failed/${name}.png`,
      ok, attempts, attemptLog, harnessError: error,
      failure: data && !data.ok ? data.failure : null, shown: data?.shown ?? null,
      domain: data?.domain ?? null, url: data?.url ?? null, live: data?.live ?? null,
      timingMs: data?.timingMs ?? null, e2eMs: data?.e2eMs ?? null, stamp: data?.stamp ?? null,
      fingerprint: data?.fingerprint ?? null, dna: data?.dna ?? null,
    };
    results = results.filter((r) => r.site !== site);
    results.push(entry);
    await writeFile(resultsPath, JSON.stringify(results, null, 2));

    const d = data?.dna;
    console.log(tag, ok ? 'captured' : 'FAILED  ', site, '-', ok
      ? `${d.foliage?.state}/${d.foliage?.density} flowers:${d.flowers?.amount} ${d.botanicalState} bg:${d.background} analysis ${data.timingMs}ms · on screen ${data.e2eMs}ms · try ${attempts} · cpu ${attemptLog.at(-1).cpuBefore}→${attemptLog.at(-1).cpuDuring}`
      : `${data?.failure?.code || error} (${attemptLog.map((a) => `${a.code} ${a.ms}ms cpu ${a.cpuBefore}→${a.cpuDuring}`).join(', ')})`);
    // The tree keeps auto-rotating in software GL; leave it up and it starves the visit below.
    await page.goto('about:blank').catch(() => {});
    if (withSite) await addSite(name, entry, tag);
  }
} else {
  for (const site of sites) {
    await shoot(fileName(site), `${BASE}/?site=${encodeURIComponent(site)}`);
  }
  await shoot('grid', `${BASE}/compare.html`, { wait: 28000, fullPage: true });
}

await browser.close();
console.log(`\ndone -> ${outDir}`);
