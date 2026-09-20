#!/usr/bin/env node
// BEFORE vs AFTER for two capture.mjs survey folders: what changed, and a contact
// sheet of each tree beside its earlier self — the artefact a person actually looks at.
//
//   node tools/survey-compare.mjs <before-dir> <after-dir> [--sheet <out.png>]
//
// Reads both results.json files. Sites are matched by name, so the two folders may
// cover different lists; only shared sites are compared. Prints to stdout; redirect it
// into the AFTER folder to keep it.

import { chromium } from '../analysis/node_modules/playwright-core/index.mjs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [beforeDir, afterDir] = process.argv.slice(2, 4).map((d) => d && resolve(d));
if (!beforeDir || !afterDir) { console.error('usage: node tools/survey-compare.mjs <before-dir> <after-dir> [--sheet <out.png>]'); process.exit(1); }
const sheetAt = process.argv.indexOf('--sheet');
const sheet = sheetAt > 0 ? resolve(process.argv[sheetAt + 1]) : null;

const load = async (d) => new Map(JSON.parse(await readFile(`${d}/results.json`, 'utf8')).map((e) => [e.site, e]));
const B = await load(beforeDir), A = await load(afterDir);
const shared = [...A.keys()].filter((s) => B.has(s));
const both = shared.filter((s) => B.get(s).ok && A.get(s).ok);
const list = (a) => a.join(', ') || '—';
const tally = (m, sites, key) => { const t = {}; for (const s of sites) { const k = key(m.get(s).dna); t[k] = (t[k] || 0) + 1; } return Object.entries(t).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} ${n}`).join(' · '); };

console.log(`BEFORE ${beforeDir}\nAFTER  ${afterDir}\nshared sites ${shared.length} · grew in both ${both.length}`);

console.log('\nPASS RATE (shared sites)');
console.log(`  before ${shared.filter((s) => B.get(s).ok).length}/${shared.length} · after ${shared.filter((s) => A.get(s).ok).length}/${shared.length}`);
console.log('  now grows :', list(shared.filter((s) => !B.get(s).ok && A.get(s).ok).map((s) => `${s} (was ${B.get(s).failure?.code})`)));
console.log('  now fails :', list(shared.filter((s) => B.get(s).ok && !A.get(s).ok).map((s) => `${s} (${A.get(s).failure?.code})`)));
console.log('  code moved:', list(shared.filter((s) => !B.get(s).ok && !A.get(s).ok && B.get(s).failure?.code !== A.get(s).failure?.code).map((s) => `${s} ${B.get(s).failure?.code}→${A.get(s).failure?.code}`)));

// Fruit is counted over every site that grew in each run, and separately over sites that
// grew in both, so a change in pass rate cannot masquerade as a change in prevalence.
const fruit = (m, sites) => sites.filter((s) => m.get(s).dna?.fruit?.enabled);
const okB = shared.filter((s) => B.get(s).ok), okA = shared.filter((s) => A.get(s).ok);
console.log('\nFRUIT');
console.log(`  prevalence: before ${fruit(B, okB).length}/${okB.length} · after ${fruit(A, okA).length}/${okA.length} · among sites that grew in both: ${fruit(B, both).length} → ${fruit(A, both).length} of ${both.length}`);
console.log('  gained:', list(both.filter((s) => !B.get(s).dna.fruit?.enabled && A.get(s).dna.fruit?.enabled).map((s) => `${s} (${A.get(s).dna.foliage.state}, ${A.get(s).dna.botanicalState})`)));
console.log('  lost  :', list(both.filter((s) => B.get(s).dna.fruit?.enabled && !A.get(s).dna.fruit?.enabled)));
const conc = (e) => (e.fingerprint?.accentConcentration ?? 0) >= 0.6 && (e.fingerprint?.canvasArea ?? 0) < 0.5 && e.dna.foliage.state !== 'bare';
console.log('  concentrated, not bare, not canvas — yet NO fruit after:', list(okA.filter((s) => conc(A.get(s)) && !A.get(s).dna.fruit?.enabled).map((s) => `${s} ${A.get(s).fingerprint.accentConcentration}`)));
console.log('  winter WITH fruit after:', list(okA.filter((s) => A.get(s).dna.botanicalState === 'winter' && A.get(s).dna.fruit?.enabled)));
console.log('  fruit WITHOUT flowers after:', list(okA.filter((s) => A.get(s).dna.fruit?.enabled && A.get(s).dna.flowers?.amount === 'none')));
console.log('  winter sites after, with their accent concentration:', list(okA.filter((s) => A.get(s).dna.botanicalState === 'winter').map((s) => `${s} ${A.get(s).fingerprint.accentConcentration}`)));

console.log('\nDNA DISTRIBUTION (sites that grew in both)');
for (const [label, key] of [['foliage', (d) => d.foliage?.state], ['flowers', (d) => d.flowers?.amount], ['season ', (d) => d.botanicalState]]) {
  console.log(`  ${label} before: ${tally(B, both, key)}\n  ${label} after : ${tally(A, both, key)}`);
}
console.log('  DNA changed:', list(both.filter((s) => { const p = B.get(s).dna, q = A.get(s).dna; return p.foliage.state !== q.foliage.state || p.flowers.amount !== q.flowers.amount || p.botanicalState !== q.botanicalState; })
  .map((s) => { const p = B.get(s).dna, q = A.get(s).dna; return `${s} [${p.foliage.state}/${p.flowers.amount}/${p.botanicalState} → ${q.foliage.state}/${q.flowers.amount}/${q.botanicalState}]`; })));

// Several unrelated domains with one fingerprint is never several websites: it is one
// block page served to all of them.
console.log('\nIDENTICAL FINGERPRINTS among AFTER successes (a bot wall measured as the site)');
const byFp = new Map();
for (const s of [...A.keys()].filter((k) => A.get(k).ok)) { const { palette, ...fp } = A.get(s).fingerprint; const k = JSON.stringify([fp.authored, fp.stylingRichness, fp.textDensity, fp.imageArea]); byFp.set(k, [...(byFp.get(k) || []), s]); }
const clones = [...byFp].filter(([, v]) => v.length > 1);
for (const [k, v] of clones) console.log(`  ${v.join(', ')}  ← authored/richness/text/image ${k}`);
if (!clones.length) console.log('  none');

// The acceptance pairs. Neither half of a pair is optional.
const show = (s) => { const e = A.get(s), b = B.get(s); if (!e) return `${s}: not in AFTER`; const was = b ? (b.ok ? `${b.dna.foliage.state}, ink ${b.fingerprint.inkCoverage}` : b.failure?.code) : 'not in BEFORE'; return `${s}: ${e.ok ? `GREW ${e.dna.foliage.state}/${e.dna.botanicalState}, ink ${e.fingerprint.inkCoverage}, richness ${e.fingerprint.stylingRichness}` : `FAILED ${e.failure?.code}${e.shown ? ` — "${e.shown}"` : ''}`}  (before: ${was})`; };
console.log('\nACCEPTANCE — bot walls must now FAIL honestly …');
for (const s of ['tesla.com', 'adidas.com', 'dribbble.com', 'imdb.com', 'tiktok.com']) console.log('  ' + show(s));
console.log('… while genuinely unstyled sites must still GROW BARE');
for (const s of ['info.cern.ch', 'danluu.com']) console.log('  ' + show(s));
console.log('ACCEPTANCE — must no longer be measured as a loading screen (ink near 0 = still a preloader)');
for (const s of ['lusion.co', 'play.grafana.org']) console.log('  ' + show(s));

if (sheet) {
  // Stage rectangle inside a 2200px-wide capture.mjs product-page capture.
  const SRC_W = 2200, X = 340, Y = 458, W = 1520, H = 1364, CELL = 250, k = CELL / W, cellH = Math.round(H * k);
  const crop = (dir, e) => `<div class="shot" style="background-image:url('file://${dir}/${e.file}')"></div>`;
  const cap = (d) => `${d.foliage?.state} · ${d.flowers?.amount}${d.botanicalState !== 'normal' ? ` · ${d.botanicalState}` : ''}${d.fruit?.enabled ? ' · FRUIT' : ''}`;
  const cells = both.map((s) => `<figure><div class="pair">${crop(beforeDir, B.get(s))}${crop(afterDir, A.get(s))}</div>
    <figcaption><b>${s}</b><span>${cap(B.get(s).dna)}</span><span class="to">→ ${cap(A.get(s).dna)}</span></figcaption></figure>`).join('\n');
  const html = `<!doctype html><meta charset="utf-8"><style>
    body { margin: 24px; background: #f6f2ec; font: 12px/1.35 -apple-system, system-ui, sans-serif; color: #26221d; }
    h1 { font-size: 16px; margin: 0 0 4px; } p { margin: 0 0 16px; color: #6d665c; }
    .grid { display: grid; grid-template-columns: repeat(3, ${CELL * 2 + 4}px); gap: 18px; }
    figure { margin: 0; } .pair { display: flex; gap: 4px; }
    .shot { width: ${CELL}px; height: ${cellH}px; border-radius: 8px; background-repeat: no-repeat;
            background-size: ${SRC_W * k}px auto; background-position: ${-X * k}px ${-Y * k}px; }
    figcaption { padding: 5px 2px 0; } b { display: block; } span { color: #6d665c; display: block; } .to { color: #26221d; }
  </style><h1>Before → after · ${both.length} sites that grew in both runs</h1><p>left: before · right: after</p><div class="grid">${cells}</div>`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 3 * (CELL * 2 + 4) + 2 * 18 + 48, height: 800 }, deviceScaleFactor: 1 });
  // file:// images only load from a file:// page, so the sheet is written beside its output first.
  const tmp = `${sheet}.html`;
  await (await import('node:fs/promises')).writeFile(tmp, html);
  await page.goto(`file://${tmp}`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: sheet, fullPage: true });
  await browser.close();
  await (await import('node:fs/promises')).unlink(tmp);
  console.log(`\ncontact sheet → ${sheet}`);
}
