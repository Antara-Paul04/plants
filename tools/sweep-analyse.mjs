#!/usr/bin/env node
// Read a capture.mjs reliability sweep: failure rate and codes, end-to-end timing, and
// whether failure follows page WEIGHT, design RICHNESS, or the loading STAGE we wait for.
//
//   node tools/sweep-analyse.mjs <sweep-dir> [earlier-results.json ...]
//
// Needs a sweep made with --quiet (CPU per attempt) and a second --with-site pass
// (siteMetrics.stages). Earlier results files lend stylingRichness to sites that fail
// now but grew before, since a failed site has no fingerprint of its own.
import { readFile } from 'node:fs/promises';

const dir = process.argv[2];
const r = JSON.parse(await readFile(`${dir}/results.json`, 'utf8'));
// earlier runs supply stylingRichness for sites that fail NOW but passed before
const earlier = new Map();
for (const f of process.argv.slice(3)) {
  for (const e of JSON.parse(await readFile(f, 'utf8'))) if (e.ok && e.fingerprint) earlier.set(e.site, e.fingerprint);
}

const ok = r.filter((e) => e.ok), bad = r.filter((e) => !e.ok);
const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
const pct = (a, p) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null; };
const s1 = (ms) => ms == null ? '  –  ' : (ms / 1000).toFixed(1).padStart(5);

// Spearman rank correlation
const rank = (a) => { const o = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]); const k = Array(a.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; const avg = (i + j) / 2 + 1; for (let t = i; t <= j; t++) k[o[t][1]] = avg; i = j + 1; } return k; };
const spearman = (x, y) => { const p = x.map((v, i) => [v, y[i]]).filter(([a, b]) => a != null && b != null); const rx = rank(p.map((q) => q[0])), ry = rank(p.map((q) => q[1])); const n = p.length, mx = (n + 1) / 2; let num = 0, dx = 0, dy = 0; for (let i = 0; i < n; i++) { num += (rx[i] - mx) * (ry[i] - mx); dx += (rx[i] - mx) ** 2; dy += (ry[i] - mx) ** 2; } return { rho: num / Math.sqrt(dx * dy), n }; };

console.log(`SITES ${r.length} · grew ${ok.length} · failed ${bad.length} · failure rate ${(100 * bad.length / r.length).toFixed(0)}%`);
console.log(`first-try success ${ok.filter((e) => e.attempts === 1).length} · needed a 2nd try ${ok.filter((e) => e.attempts > 1).length}: ${ok.filter((e) => e.attempts > 1).map((e) => `${e.site} (${e.attemptLog?.[0]?.code})`).join(', ') || '—'}`);

console.log('\nFAILURES BY CODE');
const byCode = new Map();
for (const e of bad) { const k = e.failure?.code || 'HARNESS'; byCode.set(k, [...(byCode.get(k) || []), e]); }
for (const [k, v] of [...byCode].sort((a, b) => b[1].length - a[1].length)) console.log(`  ${k.padEnd(12)} ${v.length}  ${v.map((e) => e.site).join(', ')}`);
console.log('\nFAILURE DETAIL STRINGS');
const byDetail = new Map();
for (const e of bad) for (const a of e.attemptLog || []) { const k = `${a.code}: ${(a.detail || '').slice(0, 90)}`; byDetail.set(k, (byDetail.get(k) || 0) + 1); }
for (const [k, n] of [...byDetail].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)} × ${k}`);

console.log('\nTIMING (successes)');
console.log(`  analysis only : median ${s1(med(ok.map((e) => e.timingMs)))}s · p90 ${s1(pct(ok.map((e) => e.timingMs), 0.9))}s · max ${s1(Math.max(...ok.map((e) => e.timingMs)))}s`);
console.log(`  on screen     : median ${s1(med(ok.map((e) => e.e2eMs)))}s · p90 ${s1(pct(ok.map((e) => e.e2eMs), 0.9))}s · max ${s1(Math.max(...ok.map((e) => e.e2eMs)))}s`);
console.log(`  tree build    : median ${s1(med(ok.map((e) => e.e2eMs - e.timingMs)))}s (on screen minus analysis)`);
console.log(`  on screen > 15s: ${ok.filter((e) => e.e2eMs > 15000).length} of ${ok.length} · > 20s: ${ok.filter((e) => e.e2eMs > 20000).length}`);
const stampGap = ok.map((e) => { const m = /([\d.]+)s/.exec(e.stamp || ''); return m ? e.e2eMs - 1000 * +m[1] : null; });
console.log(`  product stamp vs harness: stamp under-reports by median ${s1(med(stampGap))}s (page load + harness overhead)`);
console.log(`  time to FAIL  : median ${s1(med(bad.map((e) => e.attemptLog?.[0]?.ms)))}s for the first attempt · max ${s1(Math.max(...bad.map((e) => e.attemptLog?.[0]?.ms || 0)))}s`);

console.log('\nHYPOTHESIS — does analysis time follow DOM WEIGHT or DESIGN RICHNESS? (Spearman, successes)');
const t = ok.map((e) => e.timingMs);
for (const [label, f] of [['DOM nodes', (e) => e.siteMetrics?.nodes], ['scripts', (e) => e.siteMetrics?.scripts], ['transfer KB', (e) => e.siteMetrics?.transferKB], ['requests', (e) => e.siteMetrics?.requests], ['HTML KB', (e) => e.siteMetrics?.htmlKB], ['plain-visit DCL ms', (e) => e.siteMetrics?.dclMs], ['plain-visit load ms', (e) => e.siteMetrics?.loadMs], ['stylingRichness', (e) => e.fingerprint?.stylingRichness], ['inkCoverage', (e) => e.fingerprint?.inkCoverage], ['authored', (e) => e.fingerprint?.authored]]) {
  const { rho, n } = spearman(ok.map(f), t); console.log(`  ${label.padEnd(20)} rho ${rho.toFixed(2).padStart(5)}  (n=${n})`);
}
const rn = spearman(ok.map((e) => e.fingerprint?.stylingRichness), ok.map((e) => e.siteMetrics?.nodes));
console.log(`  richness vs DOM nodes: rho ${rn.rho.toFixed(2)} (n=${rn.n}) — how separable the two explanations are`);

console.log('\nPASS vs FAIL — weight of the page (plain visit, same conditions as the analyzer)');
const tmo = bad.filter((e) => e.failure?.code === 'TIMEOUT');
for (const [label, f] of [['DCL ms', (e) => e.siteMetrics?.dclMs], ['load ms', (e) => e.siteMetrics?.loadMs], ['DOM nodes', (e) => e.siteMetrics?.nodes], ['scripts', (e) => e.siteMetrics?.scripts], ['transfer KB', (e) => e.siteMetrics?.transferKB], ['HTML KB', (e) => e.siteMetrics?.htmlKB], ['TTFB ms', (e) => e.siteMetrics?.ttfbMs]]) {
  console.log(`  ${label.padEnd(12)} pass median ${String(med(ok.map(f))).padStart(6)} · TIMEOUT median ${String(med(tmo.map(f))).padStart(6)}`);
}
console.log(`\n  richness of sites that TIMEOUT now (from earlier runs where they passed): ${tmo.map((e) => earlier.get(e.site) ? `${e.site} ${earlier.get(e.site).stylingRichness}` : null).filter(Boolean).join(', ') || 'none known'}`);
console.log(`  median richness of passes: ${med(ok.map((e) => e.fingerprint?.stylingRichness))}`);

console.log('\nTIMEOUTS — is the SITE slow, or are WE? (plain-visit DCL against the 8000ms limit)');
for (const e of tmo.sort((a, b) => (a.siteMetrics?.dclMs ?? 1e9) - (b.siteMetrics?.dclMs ?? 1e9))) {
  const m = e.siteMetrics || {};
  console.log(`  ${e.site.padEnd(22)} plain DCL ${s1(m.dclMs)}s ${m.dclMs != null && m.dclMs < 8000 ? '← WE timed out; a plain visit did not' : m.dclMs == null ? `← plain visit failed too: ${m.error}` : '← genuinely over 8s'} · ${m.nodes ?? '?'} nodes · ${m.scripts ?? '?'} scripts · ttfb ${m.ttfbMs ?? '?'}ms · ${m.finalUrl && !m.finalUrl.includes(e.site.replace(/^www\./, '')) ? 'redirected → ' + m.finalUrl : ''}`);
}

console.log('\nHEAVIEST PASSES / LIGHTEST FAILURES (DOM nodes)');
console.log('  heaviest passes :', ok.filter((e) => e.siteMetrics?.nodes).sort((a, b) => b.siteMetrics.nodes - a.siteMetrics.nodes).slice(0, 6).map((e) => `${e.site} ${e.siteMetrics.nodes}n/${s1(e.timingMs).trim()}s`).join(', '));
console.log('  lightest failures:', bad.filter((e) => e.siteMetrics?.nodes).sort((a, b) => a.siteMetrics.nodes - b.siteMetrics.nodes).slice(0, 6).map((e) => `${e.site} ${e.siteMetrics.nodes}n [${e.failure?.code}]`).join(', '));

console.log('\nSLOWEST ON SCREEN');
for (const e of ok.slice().sort((a, b) => b.e2eMs - a.e2eMs).slice(0, 8)) console.log(`  ${e.site.padEnd(24)} on screen ${s1(e.e2eMs)}s · analysis ${s1(e.timingMs)}s · ${e.siteMetrics?.nodes ?? '?'} nodes`);

// ---- loading STAGES, every site (plain visit, quiet machine) ----
const st = (e) => e.siteMetrics?.stages || {};
const has = r.filter((e) => e.siteMetrics?.stages?.ttfb != null);
console.log(`\nLOADING STAGES — plain visit under the analyzer's conditions (n=${has.length} sites with stage data)`);
const grp = [['grew a tree', has.filter((e) => e.ok)], ['TIMEOUT', has.filter((e) => e.failure?.code === 'TIMEOUT')]];
console.log('  stage (ms)            ' + grp.map(([l, g]) => `${l} n=${g.length}`.padEnd(34)).join(''));
for (const k of ['ttfb', 'htmlDone', 'firstContentfulPaint', 'domInteractive', 'domReady']) {
  console.log('  ' + k.padEnd(22) + grp.map(([, g]) => { const v = g.map((e) => st(e)[k]); return `median ${String(med(v)).padStart(6)} · p90 ${String(pct(v, 0.9)).padStart(6)} · missing ${v.filter((x) => x == null).length}`.padEnd(34); }).join(''));
}
const tm = has.filter((e) => e.failure?.code === 'TIMEOUT');
const under = (k, ms) => tm.filter((e) => st(e)[k] != null && st(e)[k] < ms).length;
console.log(`\n  Of ${tm.length} TIMEOUT sites, in a plain visit: HTML complete < 8s: ${under('htmlDone', 8000)} · first contentful paint < 8s: ${under('firstContentfulPaint', 8000)} · domInteractive < 8s: ${under('domInteractive', 8000)} · DOM-ready < 8s: ${under('domReady', 8000)} · never DOM-ready in 30s: ${tm.filter((e) => e.siteMetrics?.dclTimedOut).length}`);
console.log('\n  per TIMEOUT site:  ttfb / html / FCP / interactive / DOM-ready   · scripts before DOM-ready');
for (const e of tm.sort((a, b) => (st(a).domReady ?? 1e9) - (st(b).domReady ?? 1e9))) {
  const s = st(e), m = e.siteMetrics;
  console.log(`   ${e.site.padEnd(20)} ${[s.ttfb, s.htmlDone, s.firstContentfulPaint, s.domInteractive, s.domReady].map((v) => String(v ?? '—').padStart(6)).join(' /')}   · ${m.scriptsBeforeDomReady ?? '?'} scripts, ${m.scriptKBBeforeDomReady ?? '?'} KB · cpu ${m.cpuBefore}→${m.cpuDuring}`);
}
const gap = has.filter((e) => st(e).domReady && st(e).domInteractive).map((e) => st(e).domReady - st(e).domInteractive);
console.log(`\n  DOM-ready minus domInteractive (the script tail): median ${med(gap)}ms · p90 ${pct(gap, 0.9)}ms · max ${Math.max(...gap)}ms`);
const sk = spearman(has.map((e) => e.siteMetrics.scriptKBBeforeDomReady), has.map((e) => st(e).domReady));
const nk = spearman(has.map((e) => e.siteMetrics.nodes), has.map((e) => st(e).domReady));
console.log(`  DOM-ready time vs script KB before it: rho ${sk.rho.toFixed(2)} (n=${sk.n}) · vs DOM nodes: rho ${nk.rho.toFixed(2)} (n=${nk.n})`);

console.log('\nCPU AT THE MOMENT OF EACH ATTEMPT');
const att = r.flatMap((e) => (e.attemptLog || []).map((a) => ({ ...a, site: e.site })));
console.log(`  attempts ${att.length} · cpu before: median ${med(att.map((a) => a.cpuBefore))} max ${Math.max(...att.map((a) => a.cpuBefore ?? 0))} · failed attempts' cpu before: median ${med(att.filter((a) => !a.ok).map((a) => a.cpuBefore))} · ok attempts': ${med(att.filter((a) => a.ok).map((a) => a.cpuBefore))}`);
console.log(`  attempts that started above 0.55 busy: ${att.filter((a) => a.cpuBefore > 0.55).map((a) => a.site + ' ' + a.cpuBefore).join(', ') || 'none'}`);

console.log('\nSUSPICIOUS TREES (grew, but look wrong)');
for (const e of ok) {
  const f = e.fingerprint, d = e.dna, m = e.siteMetrics || {};
  const why = [];
  if (d.foliage.state === 'bare' && (m.nodes ?? 0) > 200) why.push(`BARE but the real page has ${m.nodes} nodes — likely measured a challenge/error page`);
  if (f.inkCoverage < 0.02 && (m.nodes ?? 0) > 150) why.push(`ink ${f.inkCoverage} — almost nothing on screen when measured`);
  if (m.finalUrl && e.url && new URL(m.finalUrl).host.replace(/^www\./, '') !== new URL(e.url).host.replace(/^www\./, '')) why.push(`redirects: analyzer ${e.url} vs plain visit ${m.finalUrl}`);
  if (why.length) console.log(`  ${e.site.padEnd(22)} ${d.foliage.state}/${d.foliage.density} ${d.botanicalState} · rich ${f.stylingRichness} · ${why.join(' · ')}`);
}
