// Every way a worker build can go wrong must still end in a whole, IDENTICAL tree.
import { chromium } from '/Users/antarapaul/Desktop/plants/analysis/node_modules/playwright-core/index.mjs';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const STUBS = {
  'reference (main thread)': { q: 'woodWorkers=0', init: () => {} },
  'workers, healthy': { q: 'woodWorkers=3', init: () => {} },
  'no Worker at all': { q: 'woodWorkers=3', init: () => { delete window.Worker; window.Worker = undefined; } },
  'constructor throws (policy)': { q: 'woodWorkers=3', init: () => { window.Worker = class { constructor() { throw new DOMException('refused', 'SecurityError'); } }; } },
  'worker script fails to load': { q: 'woodWorkers=3', init: () => { const W = window.Worker; window.Worker = class extends W { constructor(u, o) { super(String(u).replace('woodfield-worker.js', 'nope-404.js'), o); } }; } },
  'worker dies mid-build': { q: 'woodWorkers=3', init: () => { const W = window.Worker; let n = 0; window.Worker = class extends W { constructor(u, o) { super(u, o); const me = ++n; const post = this.postMessage.bind(this); let slabs = 0; this.postMessage = (m, t) => { if (me === 1 && m && m.type === 'slab' && ++slabs === 2) { this.terminate(); setTimeout(() => this.onerror && this.onerror({ message: 'killed by the test' }), 0); return; } return post(m, t); }; } }; } },
  'workers never answer': { q: 'woodWorkers=3', init: () => { window.Worker = class { constructor() {} postMessage() {} terminate() {} }; } },
};
const hashOf = async (page) => page.evaluate(async () => {
  while (!window.__wired) await new Promise((r) => setTimeout(r, 10));
  const t0 = performance.now(); const built = await window.__wired.tree.ready; const ms = Math.round(performance.now() - t0);
  const g = built.thick.geometry; let h = 2166136261 >>> 0;
  for (const k of ['position', 'normal', 'color', 'groove', 'barkR']) { const u = new Uint8Array(g.attributes[k].array.buffer, g.attributes[k].array.byteOffset, g.attributes[k].array.byteLength); for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619) >>> 0; } }
  return { hash: h.toString(16), tris: g.attributes.position.count / 3, how: g.userData.stats.how, fellBack: g.userData.stats.fellBack || null, ms };
});
let ref = null;
for (const [name, { q, init }] of Object.entries(STUBS)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(init);
  await page.goto(`http://localhost:5188/wired.html?site=gov.uk&hud=0&${q}&nocache=${Date.now()}`);
  const r = await hashOf(page); if (!ref) ref = r.hash;
  console.log(`${r.hash === ref ? 'IDENTICAL' : 'DIFFERENT'}  ${name.padEnd(30)} how=${r.how} tris=${r.tris} ${r.ms} ms${r.fellBack ? `  fell back: "${r.fellBack}"` : ''}${errors.length ? `  PAGE ERRORS: ${errors.join(' | ')}` : ''}`);
  await ctx.close();
}
// A newer tree asked for while the workers are busy: the first build must be abandoned, the second whole.
{ const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:5188/wired.html?site=gov.uk&hud=0&woodWorkers=3&woodWorkerRepeat=4&nocache=${Date.now()}`);
  const r = await page.evaluate(async () => { while (!window.__wired) await new Promise((r) => setTimeout(r, 10)); const tree = window.__wired.tree; const first = tree.ready; let firstOutcome = 'pending'; first.then(() => { firstOutcome = 'resolved' }, (e) => { firstOutcome = e.name; });
    await new Promise((r) => setTimeout(r, 250)); const { DNA_SITES } = await import('./src/dna-data.js'); const dna = DNA_SITES.find((s) => s.domain === 'threejs.org').dna; const built = await tree.setDNA(dna); await new Promise((r) => setTimeout(r, 50));
    return { firstOutcome, second: built.thick.geometry.userData.stats.how, tris: built.thick.geometry.attributes.position.count / 3 }; });
  console.log(`abort mid-build: first build -> ${r.firstOutcome}; second -> ${r.second}, ${r.tris} tris${errors.length ? `  PAGE ERRORS: ${errors.join(' | ')}` : '  (no page errors)'}`); await ctx.close(); }
await browser.close();
