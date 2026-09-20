// Today's bloom selection vs `bloomEven=1`, the SAME tree from the SAME face, full size and at 140px.
import { chromium } from '/Users/antarapaul/Desktop/plants/analysis/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
const OUT = '/Users/antarapaul/Desktop/plants/references/experiments/bloom-faces-2026-09-21';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const shot = async (seed, grade, even, view) => {
  const ctx = await browser.newContext({ viewport: { width: 700, height: 700 }, deviceScaleFactor: 2 }); const page = await ctx.newPage();
  await page.goto(`http://localhost:5188/gate2.html?preset=bare&seed=${seed}&flowers=${grade}&wind=0&bloomEven=${even}&nocache=${Date.now()}`);
  const data = await page.evaluate(async (k) => { while (!window.__gate1) await new Promise((r) => setTimeout(r, 20)); const g = window.__gate1; const T = g.controls.target.clone(), off = g.camera.position.clone().sub(T); const a = k * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
    g.camera.position.set(T.x + off.x * c + off.z * s, T.y + off.y, T.z - off.x * s + off.z * c); g.camera.lookAt(T); g.camera.updateMatrixWorld(); for (const el of document.querySelectorAll('#hud, .hud, pre')) el.style.display = 'none';
    g.renderer.render(g.scene, g.camera); return { png: g.renderer.domElement.toDataURL('image/png'), sites: g.bloomSites.length }; }, view);
  await ctx.close(); return data; };
const cases = [[7, 'medium', 4, '6.3 -> 18.8'], [7, 'medium', 0, '6.8 -> 17.2 (the default camera)'], [5, 'medium', 7, '4.7 -> 13.2'], [5, 'medium', 1, '6.0 -> 9.9'], [19, 'medium', 2, '13.5 -> 9.9 — the seed that got WORSE'], [7, 'abundant', 0, '13.3 -> 28.4']];
const cells = [];
for (const [seed, grade, view, note] of cases) { const a = await shot(seed, grade, 0, view), b = await shot(seed, grade, 1, view); cells.push({ seed, grade, view, note, a: a.png, b: b.png, sites: a.sites, sitesB: b.sites }); console.log('shot', seed, grade, view, a.sites, b.sites); }
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#f4f1ea;font:14px/1.35 -apple-system,Helvetica,sans-serif;color:#222;padding:24px;width:1500px}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 18px;color:#555;max-width:1200px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:26px}.cell{position:relative}.cell img.big{width:100%;display:block;border-radius:6px}.cell img.th{position:absolute;right:10px;bottom:10px;width:140px;height:140px;border:3px solid #fff;border-radius:4px;box-shadow:0 1px 6px rgba(0,0,0,.35)}
.cap{font-weight:600;margin:0 0 6px}.lab{position:absolute;left:10px;top:10px;background:rgba(255,255,255,.88);padding:3px 8px;border-radius:4px;font-weight:600}</style>
<h1>WHICH twigs flower: today's selection (left) vs even-inside-each-stratum, <code>bloomEven=1</code> (right)</h1>
<p>Same tree, same face, same number of flowering twigs in every pair — only which ones. The inset is the same frame at 140px, which is the size this is judged at. The figure is bloom as a share of the crown's middle third (occlusion-correct, at 140px), today -> even. Faces are the WORST of eight round each tree under today's selection, plus the one seed where even made the worst face worse.</p>
${cells.map((c) => `<div class="cap">seed ${c.seed} · ${c.grade} · view ${c.view} of 8 · middle-third bloom ${c.note} · ${c.sites} flowering twigs both sides</div><div class="row"><div class="cell"><img class="big" src="${c.a}"><img class="th" src="${c.a}"><div class="lab">today</div></div><div class="cell"><img class="big" src="${c.b}"><img class="th" src="${c.b}"><div class="lab">even</div></div></div>`).join('')}`;
const SHEET = '/tmp/bloom-pair-sheet.html'; writeFileSync(SHEET, html);   // 47 MB of data URIs: a scratch file, never evidence
const page = await (await browser.newContext({ viewport: { width: 1548, height: 1000 }, deviceScaleFactor: 1 })).newPage(); await page.goto(`file://${SHEET}`); await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/today-vs-even-worst-faces.png`, fullPage: true });
for (let i = 0; i < cases.length; i++) { const el = (await page.$$('.row'))[i]; await el.screenshot({ path: `${OUT}/pair-seed${cases[i][0]}-${cases[i][1]}-view${cases[i][2]}.png` }); }
await browser.close(); console.log('done');
