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
//
// Requires the V0 server on :5170 and Playwright from analysis/node_modules.

import { chromium } from '../analysis/node_modules/playwright-core/index.mjs';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';

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

// One survey attempt: load the product page, take the API's own answer off the
// wire, and wait for the state the human would see before shooting it.
const attempt = async (site) => {
  const reply = page.waitForResponse((r) => r.url().endsWith('/api/grow'), { timeout: 90000 });
  await page.goto(`${BASE}/?site=${encodeURIComponent(site)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const data = await (await reply).json();
  await page.waitForSelector(data.ok ? '#result:not([hidden])' : '#msg.err', { timeout: 30000 });
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

const shootSite = async (url, path) => {
  const p = await siteCtx.newPage();
  try {
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await p.waitForLoadState('load', { timeout: 4500 }).catch(() => {});
    await p.waitForLoadState('networkidle', { timeout: 1500 }).catch(() => {});
    await p.waitForTimeout(600);
    await p.screenshot({ path, animations: 'disabled', timeout: 10000 });
    return true;
  } catch { return false; } finally { await p.close().catch(() => {}); }
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
    if (!(await exists(`${outDir}/_site/${name}.png`))) {
      const shot = await shootSite(r.url || `https://${r.site}`, `${outDir}/_site/${name}.png`);
      if (!shot) { console.log(tag, 'no site ', r.site, '- the harness could not load it'); return; }
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
    if (prior && await exists(`${outDir}/${name}.png`)) {
      console.log(tag, 'skip    ', site, '(already captured)');
      if (withSite) await addSite(name, prior, tag);
      continue;
    }

    let data = null, error = null, attempts = 0;
    while (attempts < 2 && !(data && data.ok)) {
      attempts++;
      try { data = await attempt(site); error = null; }
      catch (err) { error = err.message.split('\n')[0]; }
    }

    const ok = Boolean(data && data.ok);
    await page.screenshot({ path: ok ? `${outDir}/${name}.png` : `${outDir}/_failed/${name}.png`, fullPage: true })
      .catch((err) => { error = error || err.message.split('\n')[0]; });

    const entry = {
      site, category: category.get(site) || '', file: ok ? `${name}.png` : `_failed/${name}.png`,
      ok, attempts, harnessError: error,
      failure: data && !data.ok ? data.failure : null,
      domain: data?.domain ?? null, url: data?.url ?? null, live: data?.live ?? null,
      timingMs: data?.timingMs ?? null, fingerprint: data?.fingerprint ?? null, dna: data?.dna ?? null,
    };
    results = results.filter((r) => r.site !== site);
    results.push(entry);
    await writeFile(resultsPath, JSON.stringify(results, null, 2));

    const d = data?.dna;
    console.log(tag, ok ? 'captured' : 'FAILED  ', site, '-', ok
      ? `${d.foliage?.state}/${d.foliage?.density} flowers:${d.flowers?.amount} ${d.botanicalState} bg:${d.background} ${data.timingMs}ms`
      : (data?.failure?.code || error));
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
