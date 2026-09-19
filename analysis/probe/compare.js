// EXPERIMENT — reads a run and answers brief §10 (do sites separate?), §6b (is a signal
// just tracking page size?), Q13 (how much page?) and §12 (time).
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2] || 'results/latest.json';
const d = JSON.parse(fs.readFileSync(file));
const S = d.sites.filter(s => s.ok);
const bad = d.sites.filter(s => !s.ok);

const sig = (s, scope = 'v3') => {
  const v = s.dom.scopes[scope], px = s.pixels[scope === 'v1' ? 'v1' : 'v3'];
  const st = v.structure;
  return {
    structure: Math.min(1, (st.blockCount / 60) * 0.5 + (st.bandCount / 12) * 0.3 + (st.landmarkCount / 25) * 0.2),
    stylingRichness: v.stylingRichness,
    unstyledScore: v.unstyledScore,
    inkCoverage: +(1 - px.all.whitespaceRatio).toFixed(3),
    colorfulness: px.all.colorfulness,
    chromaticRatio: px.all.chromaticRatio,
    verticalityUNDEF: v.layout.verticalityUNDEFINED,
    regularity: v.layout.regularity,
    centredness: v.layout.centredness,
    roundness: v.roundness,
    imageArea: v.media.imageArea,
    graphicArea: v.media.graphicArea,
    canvasArea: v.media.canvasArea,
    embedArea: v.media.embedArea,
    motion: s.motion.sustained,
    controlDensity: v.controls.controlDensity,
    textDensity: Math.min(1, v.text.charsPerMegapixel / 2500)
  };
};
const conf = s => ({
  domNodes: s.dom.scopes.v3.confounders.domNodes,
  docHeight: s.dom.docHeight,
  bytes: s.network.contentLengthBytes,
  requests: s.network.requests,
  visibleEls: s.dom.scopes.v3.confounders.visibleElements,
  authorRules: s.dom.authorRules
});

const SIGK = Object.keys(sig(S[0]));
const pad = (x, n = 11) => String(x).padStart(n);

console.log('# Fingerprint comparison   (n=' + S.length + ' valid' + (bad.length ? ', ' + bad.length + ' INVALID' : '') + ')\n');
console.log('signal'.padEnd(17) + S.map(s => pad(s.id.slice(0, 11))).join(''));
console.log('-'.repeat(17 + 11 * S.length));
const M = {};
for (const k of SIGK) { M[k] = S.map(s => sig(s)[k]); console.log(k.padEnd(17) + M[k].map(v => pad(v.toFixed(3))).join('')); }

// ---- separation: does each signal actually spread the corpus? ----
console.log('\n# Separation (spread of each signal across the corpus)\n');
console.log('signal'.padEnd(17) + pad('min') + pad('max') + pad('range') + pad('stdev') + '   verdict');
for (const k of SIGK) {
  const v = M[k], mn = Math.min(...v), mx = Math.max(...v);
  const mu = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / v.length);
  const verdict = (mx - mn) < 0.1 ? 'FLAT — cut' : (mx - mn) < 0.25 ? 'weak' : 'separates';
  console.log(k.padEnd(17) + pad(mn.toFixed(3)) + pad(mx.toFixed(3)) + pad((mx - mn).toFixed(3)) + pad(sd.toFixed(3)) + '   ' + verdict);
}

// ---- §6b: is a signal merely tracking page size? ----
const pearson = (a, b) => {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return (da && db) ? num / Math.sqrt(da * db) : 0;
};
const CONFK = Object.keys(conf(S[0]));
const C = {}; for (const k of CONFK) C[k] = S.map(s => conf(s)[k]);
console.log('\n# §6b Confounder correlation  (|r| vs page-size proxies; n=' + S.length + ' — indicative only)\n');
console.log('signal'.padEnd(17) + CONFK.map(k => pad(k.slice(0, 10))).join('') + '   worst');
for (const k of SIGK) {
  const rs = CONFK.map(c => pearson(M[k], C[c]));
  const worst = Math.max(...rs.map(Math.abs));
  console.log(k.padEnd(17) + rs.map(r => pad(r.toFixed(2))).join('') + '   ' + (worst > 0.85 ? 'SUSPECT ' + worst.toFixed(2) : worst.toFixed(2)));
}

// ---- Q13: how much of the page do we need? ----
console.log('\n# Q13 Scope stability  (|v1 - v3| per signal; large = first viewport is not enough)\n');
console.log('signal'.padEnd(17) + S.map(s => pad(s.id.slice(0, 11))).join('') + pad('mean'));
for (const k of SIGK) {
  const ds = S.map(s => Math.abs(sig(s, 'v1')[k] - sig(s, 'v3')[k]));
  console.log(k.padEnd(17) + ds.map(v => pad(v.toFixed(3))).join('') + pad((ds.reduce((a, b) => a + b, 0) / ds.length).toFixed(3)));
}

// ---- §12 timing ----
console.log('\n# §12 Timing (ms)\n');
const TK = ['load', 'settle', 'motionCapture', 'domEval', 'screenshot', 'pixels', 'total'];
console.log('site'.padEnd(17) + TK.map(k => pad(k, 14)).join(''));
for (const s of S) console.log(s.id.padEnd(17) + TK.map(k => pad(s.timingMs[k] ?? '-', 14)).join(''));
const mean = k => Math.round(S.reduce((a, s) => a + (s.timingMs[k] || 0), 0) / S.length);
console.log('MEAN'.padEnd(17) + TK.map(k => pad(mean(k), 14)).join(''));

// ---- palette + crux ----
console.log('\n# Palette (rendered pixels)  — all vs media-masked (Q12)\n');
for (const s of S) {
  const a = s.pixels.v3.all, m = s.pixels.v3.mediaMasked;
  console.log(s.id.padEnd(17) + 'bg=' + a.background + ' primary=' + String(a.primary).padEnd(8) +
    ' colr=' + a.colorfulness.toFixed(2) + '  | masked(' + (s.pixels.v3.maskedFraction * 100).toFixed(0) + '%): ' +
    (m ? 'bg=' + m.background + ' primary=' + String(m.primary).padEnd(8) + ' colr=' + m.colorfulness.toFixed(2) : 'n/a'));
}
if (bad.length) {
  console.log('\n# INVALID (excluded from all numbers above)\n');
  for (const s of bad) console.log('  ' + s.id.padEnd(17) + (s.validity ? s.validity.reasons.join(',') + '  saw: "' + s.validity.observedTitle + '"' : s.failures.join(';')));
}
