// Capture the wood job the page hands its workers, as JSON, for offline benchmarking in Node.
import { chromium } from '/Users/antarapaul/Desktop/plants/analysis/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
const site = process.argv[2] || 'gov.uk';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.addInitScript(() => { const orig = Worker.prototype.postMessage; Worker.prototype.postMessage = function (m, t) { if (m && m.type === 'job' && !window.__job) window.__job = m.job; return orig.call(this, m, t); }; });
await page.goto(`http://localhost:5188/wired.html?site=${site}&hud=0&woodWorkers=2&nocache=${Date.now()}`);
const job = await page.evaluate(async () => { while (!window.__wired) await new Promise((r) => setTimeout(r, 10)); await window.__wired.tree.ready; const j = window.__job; const arr = (a) => Array.from(a);
  return { ...j, edgeTable: arr(j.edgeTable), triTable: arr(j.triTable), chains: j.chains.map((c) => ({ ...c, px: arr(c.px), py: arr(c.py), pz: arr(c.pz), rad: arr(c.rad), fN: arr(c.fN), fB: arr(c.fB) })) }; });
writeFileSync(new URL(`./job-${site}.json`, import.meta.url), JSON.stringify(job)); console.log(site, job.nx, job.ny, job.nz, job.chains.length); await browser.close();
