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

if (survey) {
  const resultsPath = `${outDir}/results.json`;
  await mkdir(`${outDir}/_failed`, { recursive: true });
  let results = [];
  try { results = JSON.parse(await readFile(resultsPath, 'utf8')); } catch {}

  for (const [i, site] of sites.entries()) {
    const name = fileName(site);
    const tag = `[${i + 1}/${sites.length}]`;
    const done = await access(`${outDir}/${name}.png`).then(() => true, () => false);
    if (done) { console.log(tag, 'skip    ', site, '(already captured)'); continue; }

    let data = null, error = null, attempts = 0;
    while (attempts < 2 && !(data && data.ok)) {
      attempts++;
      try { data = await attempt(site); error = null; }
      catch (err) { error = err.message.split('\n')[0]; }
    }

    const ok = Boolean(data && data.ok);
    await page.screenshot({ path: ok ? `${outDir}/${name}.png` : `${outDir}/_failed/${name}.png`, fullPage: true })
      .catch((err) => { error = error || err.message.split('\n')[0]; });

    results = results.filter((r) => r.site !== site);
    results.push({
      site, category: category.get(site) || '', file: ok ? `${name}.png` : `_failed/${name}.png`,
      ok, attempts, harnessError: error,
      failure: data && !data.ok ? data.failure : null,
      domain: data?.domain ?? null, url: data?.url ?? null, live: data?.live ?? null,
      timingMs: data?.timingMs ?? null, fingerprint: data?.fingerprint ?? null, dna: data?.dna ?? null,
    });
    await writeFile(resultsPath, JSON.stringify(results, null, 2));

    const d = data?.dna;
    console.log(tag, ok ? 'captured' : 'FAILED  ', site, '-', ok
      ? `${d.foliage?.state}/${d.foliage?.density} flowers:${d.flowers?.amount} ${d.botanicalState} bg:${d.background} ${data.timingMs}ms`
      : (data?.failure?.code || error));
  }
} else {
  for (const site of sites) {
    await shoot(fileName(site), `${BASE}/?site=${encodeURIComponent(site)}`);
  }
  await shoot('grid', `${BASE}/compare.html`, { wait: 28000, fullPage: true });
}

await browser.close();
console.log(`\ndone -> ${outDir}`);
