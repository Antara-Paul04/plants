// EXPERIMENT — fingerprint -> Botanical DNA, per docs/BOTANICAL-DNA.md.
// Analysis owns every threshold here. Bands are derived from the 23-site corpus
// distribution (see BANDS below), not from intuition. Emits results/dna.json.
// This file knows nothing about three.js and must stay that way.
import fs from 'node:fs';
import { BANDS, buildDna } from '../lib/mapping.js';   // single source of truth for thresholds

const RESULTS = fs.readdirSync('results').filter(x => x.startsWith('run-full')).sort().pop();
const RUN = JSON.parse(fs.readFileSync('results/' + RESULTS));
const HUE = JSON.parse(fs.readFileSync('results/hue.json'));

// ---------------------------------------------------------------- fingerprint
function fingerprint(site){
  const v = site.dom.scopes.v3;
  const pxAll = site.pixels.v3.all, pxMask = site.pixels.v3.mediaMasked;
  const maskedFrac = site.pixels.v3.maskedFraction || 0;
  const hue = HUE[site.id] || { all:{}, masked:{} };
  // Where media covers a real share of the frame, the DESIGN palette is the masked one.
  // Evidence: unsplash colourfulness .44 -> .01 masked (the colour was photographs);
  // yale primary #95aedb -> #f72f2d masked (masking RECOVERED the true brand accent).
  const useMask = !!pxMask && maskedFrac > 0.05;
  const design = useMask ? pxMask : pxAll;
  const designChroma = useMask ? (hue.masked.chromaticRatio ?? design.chromaticRatio)
                               : (hue.all.chromaticRatio ?? design.chromaticRatio);
  return {
    authored:        +(1 - v.unstyledScore).toFixed(3),
    stylingRichness: +v.stylingRichness.toFixed(3),
    inkCoverage:     +(1 - pxAll.whitespaceRatio).toFixed(3),
    colorfulness:    +pxAll.colorfulness.toFixed(3),
    designColorfulness: +(design.colorfulness ?? 0).toFixed(3),
    designChromaticRatio: +(designChroma ?? 0).toFixed(4),
    warmShareOfChroma:  +((useMask ? hue.masked.warmShare : hue.all.warmShare) ?? 0).toFixed(3),
    imageArea:       +v.media.imageArea.toFixed(3),
    canvasArea:      +v.media.canvasArea.toFixed(3),
    textDensity:     +Math.min(1, v.text.charsPerMegapixel/2500).toFixed(3),
    palette: {
      ground:    pxAll.background,
      primary:   design.primary   || null,
      secondary: design.secondary || null
    },
    paletteSource: useMask ? 'media-masked' : 'whole-frame'
  };
}

// ---------------------------------------------------------------- selection
// 8-10 sites stressing the axes Lead named. Excludes everything the validity gate rejected.
const PICK = {
  'cern-first-web': 'raw / unstyled HTML',
  'better-mfw':     'intentionally minimalist, designed',
  'stripe':         'colourful polished marketing',
  'yale-art':       'maximalist / experimental',
  'unsplash':       'image-heavy (photography)',
  'wikipedia':      'text-heavy editorial',
  'vercel':         'light monochrome, restrained (WINTER case)',
  'linear':         'genuinely dark ground (#08090a at 72% coverage) — exercises the dark background branch',
  'threejs-example':'WebGL / canvas',
  'gov-uk':         'systematised, high chroma, plain',
  'figma':          'colourful, illustration-led'
};

const byId = Object.fromEntries(RUN.sites.filter(s => s.ok).map(s => [s.id, s]));
const sites = [];
for (const [id, role] of Object.entries(PICK)) {
  const s = byId[id];
  if (!s) { console.error('MISSING (not valid in run):', id); continue; }
  const domain = new URL(s.finalUrl || s.url).hostname.replace(/^www\./,'');
  const fp = fingerprint(s);
  const { dna, why } = buildDna(fp, domain);
  sites.push({ domain, corpusId: id, role, synthetic: false, sourceUrl: s.finalUrl || s.url, fingerprint: fp, dna, why });
}

// --- ONE synthetic record, permitted by the contract, for a state no real site reaches.
// Clearly labelled. Never presented as a measurement.
{
  const domain = 'synthetic-autumn.example';
  const seed = seedOf(domain);
  sites.push({
    domain, corpusId: null, role: 'SYNTHETIC — renderer capability test for AUTUMN',
    synthetic: true, sourceUrl: null,
    fingerprint: { note: 'HAND-AUTHORED. Not a measurement of any website. No corpus site legitimately reached AUTUMN — see FINDINGS.md §16.' },
    dna: {
      morphology: 'broad', skeleton: { complexity: 'normal' },
      foliage: { state: 'normal', density: 'normal' }, botanicalState: 'autumn',
      flowers: { amount: 'few', primary: '#c96a2b', secondary: '#8c4a1f' },
      fruit: { enabled: false, color: null }, terrain: 'autumn',
      background: '#e8e2d8', seed, rareCat: false
    },
    why: {
      synthetic: 'Hand-authored so 3D can test AUTUMN rendering. Zero of 23 corpus sites qualified: every site whose raw pixels looked warm-dominant lost it once photographic media was masked out, proving the warmth was content, not design.',
      botanicalState: 'SET BY HAND, not measured.'
    }
  });
}

const out = { generated: new Date().toISOString(),
  provenance: { run: RESULTS, corpusSize: RUN.sites.length, valid: RUN.sites.filter(s=>s.ok).length,
                bands: BANDS, note: 'EXPERIMENT. Thresholds derived from the 23-site corpus distribution; see analysis/FINDINGS.md.' },
  sites };
fs.writeFileSync('results/dna.json', JSON.stringify(out, null, 2));
console.log('wrote results/dna.json —', sites.length, 'records\n');
console.log('domain'.padEnd(24)+'foliage'.padEnd(10)+'density'.padEnd(9)+'state'.padEnd(11)+'flowers'.padEnd(10)+'skel'.padEnd(8)+'fruit  bg');
for (const s of sites) {
  const d = s.dna;
  console.log(s.domain.padEnd(24)+d.foliage.state.padEnd(10)+d.foliage.density.padEnd(9)+d.botanicalState.padEnd(11)+
    d.flowers.amount.padEnd(10)+d.skeleton.complexity.padEnd(8)+(d.fruit.enabled?'yes':'no').padEnd(7)+d.background);
}
