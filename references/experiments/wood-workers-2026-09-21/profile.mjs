import { readFileSync } from 'node:fs';
const K = await import('/Users/antarapaul/Desktop/plants/prototype/src/woodfield.js');
const site = 'gov.uk';
const j = JSON.parse(readFileSync(new URL(`./job-${site}.json`, import.meta.url)));
const job = { ...j, edgeTable: Int32Array.from(j.edgeTable), triTable: Int32Array.from(j.triTable), chains: j.chains.map((c) => ({ ...c, px: Float64Array.from(c.px), py: Float64Array.from(c.py), pz: Float64Array.from(c.pz), rad: Float64Array.from(c.rad), fN: Float64Array.from(c.fN), fB: Float64Array.from(c.fB) })) };
const time = (ranges) => { const scratch = {}; for (const [a, b] of ranges) K.buildSlab(job, a, b, scratch); return ranges.map(([a, b]) => { let best = 1e9; for (let k = 0; k < 3; k++) { const t0 = performance.now(); K.buildSlab(job, a, b, scratch); best = Math.min(best, performance.now() - t0); } return Math.round(best); }); };
const show = (name, ranges) => { const t = time(ranges); const sum = t.reduce((a, b) => a + b, 0); const W = 4; // greedy in-order dispatch to W workers = what the pool does
  const free = new Array(W).fill(0); for (const x of t) { const i = free.indexOf(Math.min(...free)); free[i] += x; } const wall = Math.max(...free);
  console.log(`${name}: ${ranges.length} slabs, cells [${ranges.map(([a, b]) => b - a)}]\n   ms [${t}]  sum ${sum}  -> 4 workers wall ~${wall} ms (x${(593 / wall).toFixed(2)} vs whole-grid 593)`); };
show('balanced x8 (current)', K.slabRangesBalanced(job, 8));
show('balanced x6', K.slabRangesBalanced(job, 6));
show('balanced x4', K.slabRangesBalanced(job, 4));
show('balanced x8, cap 48', K.slabRangesBalanced(job, 8, 4, 48));
show('balanced x4, cap 64', K.slabRangesBalanced(job, 4, 4, 64));
show('equal 27 cells', K.slabRanges(job.nz, 27));
