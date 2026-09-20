// Time from navigation to a whole tree, on the PRODUCT path (wired.html -> mountTree, budgetMs 10),
// in a headless Chrome that is NOT a backgrounded tab, with DevTools CPU throttling.
//   node time-to-tree.mjs <rate> <site> <reps> <variant...>      variant = query string suffix, e.g. "woodWorkers=0"
import { chromium } from '/Users/antarapaul/Desktop/plants/analysis/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PLANTS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE || 'http://localhost:5188';
const [rate = '1', site = 'gov.uk', reps = '2', ...variants] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--enable-precise-memory-info'] });
const out = [];
for (let rep = 0; rep < +reps; rep++) for (const v of variants.length ? variants : ['woodWorkers=0']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: +rate });
  await page.addInitScript(() => {
    window.__lt = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ entryTypes: ['longtask'] }); } catch {}
    // rAF cadence while the tree builds: what the visitor's island does meanwhile
    window.__raf = []; let last = performance.now(); const f = () => { const n = performance.now(); window.__raf.push(n - last); last = n; requestAnimationFrame(f); }; requestAnimationFrame(f);
  });
  const t0 = Date.now();
  await page.goto(`${BASE}/wired.html?site=${site}&spin=1&hud=0&${v}&nocache=${Date.now()}`, { waitUntil: 'commit' });
  const r = await page.evaluate(async () => {
    while (!window.__wired) await new Promise((res) => setTimeout(res, 10));
    const tMount = performance.now();
    const built = await window.__wired.tree.ready; const tReady = performance.now();
    const raf = window.__raf.slice(); const gaps = raf.filter((g) => g > 50);
    const lt = window.__lt.map((e) => e[1]);
    return { readyAt: Math.round(tReady), mountAt: Math.round(tMount), phases: built.stats.phases, field: built.stats.field, tris: built.stats.field && built.stats.field.triangles,
      longTasks: { n: lt.length, sum: lt.reduce((a, b) => a + b, 0), worst: Math.max(0, ...lt) }, frames: { n: raf.length, worstGap: Math.round(Math.max(0, ...raf)), over50: gaps.length },
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null };
  });
  out.push({ rate: +rate, site, v, rep, wallMs: Date.now() - t0, ...r });
  const f = r.field || {};
  console.log(`x${rate} ${site} [${v}] rep${rep}: tree at ${r.readyAt} ms | phases ${JSON.stringify(r.phases)} | wood how=${f.how}${f.workers ? ` ${f.workers}w/${f.slabs}s slabMs=[${f.slabMs}]` : ''}${f.fellBack ? ' FELLBACK: ' + f.fellBack : ''} | long tasks n=${r.longTasks.n} sum=${r.longTasks.sum} worst=${r.longTasks.worst} | frames n=${r.frames.n} worstGap=${r.frames.worstGap} >50ms:${r.frames.over50}`);
  await ctx.close();
}
await browser.close();
