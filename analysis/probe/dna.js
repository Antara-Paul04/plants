// EXPERIMENT — fingerprint -> Botanical DNA, per docs/BOTANICAL-DNA.md.
// Analysis owns every threshold here. Bands are derived from the 23-site corpus
// distribution (see BANDS below), not from intuition. Emits results/dna.json.
// This file knows nothing about three.js and must stay that way.
import fs from 'node:fs';

const RESULTS = fs.readdirSync('results').filter(x => x.startsWith('run-full')).sort().pop();
const RUN = JSON.parse(fs.readFileSync('results/' + RESULTS));
const HUE = JSON.parse(fs.readFileSync('results/hue.json'));

// ---------------------------------------------------------------- colour utils
const hex2rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const rgb2hex = (r,g,b) => '#' + [r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
function rgb2hsl(r,g,b){ r/=255;g/=255;b/=255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn; let h=0; const l=(mx+mn)/2;
  const s=d===0?0:d/(1-Math.abs(2*l-1));
  if(d){ if(mx===r)h=(((g-b)/d)%6+6)%6; else if(mx===g)h=(b-r)/d+2; else h=(r-g)/d+4; h*=60; }
  return [h,s,l]; }
function hsl2rgb(h,s,l){ const c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2;
  let r=0,g=0,b=0; const i=Math.floor(h/60)%6;
  if(i===0)[r,g,b]=[c,x,0]; else if(i===1)[r,g,b]=[x,c,0]; else if(i===2)[r,g,b]=[0,c,x];
  else if(i===3)[r,g,b]=[0,x,c]; else if(i===4)[r,g,b]=[x,0,c]; else [r,g,b]=[c,0,x];
  return [(r+m)*255,(g+m)*255,(b+m)*255]; }

// ---------------------------------------------------------------- seed
// FNV-1a over the normalized domain. Same site -> same seed, always.
function seedOf(domain){
  let h = 0x811c9dc5;
  for (const ch of domain.toLowerCase().replace(/^www\./,'')) {
    h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
// deterministic 0-1 stream from a seed (mulberry32)
function rngOf(seed){ let a=seed>>>0; return ()=>{ a=(a+0x6D2B79F5)>>>0;
  let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }

// ---------------------------------------------------------------- BANDS
// Derived from the 23-site corpus. Boundaries placed at NATURAL GAPS in the sorted
// distribution, not at round numbers, so no site sits on a cliff where avoidable.
const BANDS = {
  // stylingRichness sorted: .02 .02 .07 | .16 .17 .18 .24 | .33 .38 .42 .42 .43 .44 .45 .45 .48 .49 .49 .49 | .57 .58 .59 .61
  foliageState: { bare: 0.10, sparse: 0.30, normal: 0.50 },   // gaps at .07|.16, .24|.33, .49|.57
  // inkCoverage sorted: .04 .05 .05 .07 .07 | .11 .13 .14 .17 .18 .21 .24 .28 .29 .31 .37 .44 | .48 .53 .58 .72 .75 .80
  density:      { airy: 0.15, normal: 0.45 },
  // design colourfulness (media-masked where masking applies)
  flowers:      { none: 0.08, few: 0.20, medium: 0.40 },
  skeleton:     { simple: 0.15, normal: 0.45 },
  winter:       { authored: 0.60, colorfulness: 0.06, ink: 0.20, styling: 0.35 },
  autumn:       { warmShare: 0.55, chromatic: 0.05 },
  fruitRate:    0.10,
  accentFloor:  0.01    // below this chromatic coverage there is no meaningful accent
};

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

// ---------------------------------------------------------------- background
// Not the raw ground hex: aesthetically controlled and display-safe so the tree stays
// legible against it. Keeps the site's hue, tames saturation and lightness extremes.
function backgroundFrom(groundHex, state, accentHex){
  let [h, sat, l] = rgb2hsl(...hex2rgb(groundHex));
  // Preserve the site's light/dark decision — a dark site must not become a light one.
  const isDark = l <= 0.5;
  let lit = isDark ? 0.10 + l * 0.30        // dark grounds -> [0.10, 0.25]
                   : 0.86 + (l - 0.5) * 0.10; // light grounds -> [0.86, 0.91]
  // 19 of 23 corpus grounds are pure white, which would give every site the same
  // background. Borrow the DESIGN accent's hue at low saturation so they differ.
  if (sat < 0.05 && accentHex) {
    const [ah, asat] = rgb2hsl(...hex2rgb(accentHex));
    // Tint must be VISIBLE at thumbnail size (Lead: exaggerate for legibility) while
    // staying a background. 0.14 reads as a tint; 0.07 was indistinguishable from grey.
    if (asat > 0.10) { h = ah; sat = isDark ? 0.16 : 0.14; }
  } else {
    sat = Math.min(sat, 0.18);
  }
  if (state === 'winter') { sat = Math.min(sat, 0.05); lit = isDark ? lit : Math.min(lit, 0.90); }
  return rgb2hex(...hsl2rgb(h, sat, lit));
}

// ---------------------------------------------------------------- mapping
function toDNA(fp, domain){
  const why = {};
  const seed = seedOf(domain);
  const rng = rngOf(seed);
  const B = BANDS;

  // --- foliage state. BARE requires BOTH low authored and low styling, so that
  // designed minimalism (better-mfw: authored .20 / styling .16) cannot fall in.
  let state;
  if (fp.authored <= 0.15 && fp.stylingRichness < B.foliageState.bare) {
    state = 'bare';
    why.foliage = `stylingRichness ${fp.stylingRichness} < ${B.foliageState.bare} AND authored ${fp.authored} <= 0.15 → BARE (unstyled: the page has no authored design to express as foliage)`;
  } else if (fp.stylingRichness < B.foliageState.sparse) {
    state = 'sparse';
    why.foliage = `stylingRichness ${fp.stylingRichness} in [${B.foliageState.bare}, ${B.foliageState.sparse}) → SPARSE; authored ${fp.authored} > 0.15 keeps it out of BARE (restraint, not absence)`;
  } else if (fp.stylingRichness < B.foliageState.normal) {
    state = 'normal';
    why.foliage = `stylingRichness ${fp.stylingRichness} in [${B.foliageState.sparse}, ${B.foliageState.normal}) → NORMAL (the corpus midband, 12 of 23 sites)`;
  } else {
    state = 'lush';
    why.foliage = `stylingRichness ${fp.stylingRichness} >= ${B.foliageState.normal} → LUSH (top of the corpus; 4 of 23 sites)`;
  }

  // --- density: ink carries visual mass, styling says how much of it is design
  let density;
  if (fp.inkCoverage < B.density.airy) density = 'airy';
  else if (fp.inkCoverage < B.density.normal) density = 'normal';
  else density = 'dense';
  let damped = false;
  if (fp.stylingRichness < 0.30 && density === 'dense') { density = 'normal'; damped = true; }
  why.density = damped
    ? `inkCoverage ${fp.inkCoverage} alone reads DENSE, but stylingRichness ${fp.stylingRichness} < 0.30 — visible mass without much authored design → damped to NORMAL (restrained foliage despite mass)`
    : `inkCoverage ${fp.inkCoverage} → ${density.toUpperCase()}` +
      (state === 'lush' && density === 'airy' ? ' (high styling + low ink = developed but AIRY)' : '');

  // --- flowers: design colour only. A flowerless tree is a valid result.
  let amount;
  const c = fp.designColorfulness;
  if (fp.designChromaticRatio < B.accentFloor) {
    amount = 'none';
    why.flowers = `design chromatic coverage ${fp.designChromaticRatio} < ${B.accentFloor} — no meaningful accent colour exists, so no flowers are forced (flowerless is a valid result)`;
  } else if (c < B.flowers.none)   { amount='none';     why.flowers = `design colourfulness ${c} < ${B.flowers.none} → NONE`; }
  else if (c < B.flowers.few)      { amount='few';      why.flowers = `design colourfulness ${c} in [${B.flowers.none}, ${B.flowers.few}) → FEW`; }
  else if (c < B.flowers.medium)   { amount='medium';   why.flowers = `design colourfulness ${c} in [${B.flowers.few}, ${B.flowers.medium}) → MEDIUM`; }
  else                             { amount='abundant'; why.flowers = `design colourfulness ${c} >= ${B.flowers.medium} → ABUNDANT`; }
  if (amount !== 'none' && fp.paletteSource === 'media-masked') {
    why.flowers += `; colour taken from the media-masked palette (photography excluded from the accent)`;
  }

  // --- skeleton: gentle. Text is deliberately the lesser term so text-heavy sites
  // do not become giant trees.
  const sk = 0.7 * fp.inkCoverage + 0.3 * fp.textDensity;
  const complexity = sk < B.skeleton.simple ? 'simple' : sk < B.skeleton.normal ? 'normal' : 'rich';
  why.skeleton = `0.7·inkCoverage(${fp.inkCoverage}) + 0.3·textDensity(${fp.textDensity}) = ${sk.toFixed(3)} → ${complexity.toUpperCase()}; text weighted lower so text-heavy sites do not become oversized trees`;

  // --- botanical state
  let botanicalState = 'normal';
  if (fp.authored >= B.winter.authored && fp.designColorfulness < B.winter.colorfulness
      && fp.inkCoverage < B.winter.ink && fp.stylingRichness >= B.winter.styling) {
    botanicalState = 'winter';
    why.botanicalState = `authored ${fp.authored} >= ${B.winter.authored} AND stylingRichness ${fp.stylingRichness} >= ${B.winter.styling} (clearly authored) AND design colourfulness ${fp.designColorfulness} < ${B.winter.colorfulness} AND inkCoverage ${fp.inkCoverage} < ${B.winter.ink} → WINTER (restraint, not absence — distinct from BARE)`;
  } else if (fp.warmShareOfChroma >= B.autumn.warmShare && fp.designChromaticRatio >= B.autumn.chromatic
             && fp.canvasArea < 0.5) {
    botanicalState = 'autumn';
    why.botanicalState = `warm hues hold ${(fp.warmShareOfChroma*100).toFixed(0)}% of design chromatic coverage (>= ${B.autumn.warmShare*100}%) over ${fp.designChromaticRatio} coverage → AUTUMN`;
  } else if (amount === 'medium' || amount === 'abundant') {
    botanicalState = 'flowering';
    why.botanicalState = `flower amount ${amount.toUpperCase()} → FLOWERING`;
  } else {
    why.botanicalState = `no special state qualifies → NORMAL`;
  }
  if (botanicalState === 'winter' || state === 'bare') amount = 'none';
  if (botanicalState === 'autumn' && amount !== 'none') {
    amount = amount === 'abundant' ? 'medium' : amount === 'medium' ? 'few' : 'none';
    why.flowers += `; reduced because AUTUMN shifts palette into foliage rather than flowers`;
  }

  // --- fruit: seeded personality, represents nothing analytical (by design)
  const eligible = state !== 'bare' && botanicalState !== 'winter'
                && (state === 'normal' || state === 'lush') && amount !== 'abundant';
  const roll = rng();
  const fruitOn = eligible && roll < BANDS.fruitRate;
  if (fruitOn) why.fruit = `seeded trait: seed ${seed} → roll ${roll.toFixed(3)} < ${BANDS.fruitRate} and the tree is eligible (not bare, not winter, foliage ${state}). Represents nothing about the website, deliberately.`;

  const terrain = state === 'bare' ? 'sparse'
    : botanicalState === 'winter' ? 'winter'
    : botanicalState === 'autumn' ? 'autumn'
    : state === 'lush' ? 'lush' : state === 'sparse' ? 'sparse' : 'normal';
  why.terrain = `follows foliage state ${state.toUpperCase()}${botanicalState!=='normal'&&botanicalState!=='flowering'?` and botanical state ${botanicalState.toUpperCase()}`:''} → ${terrain.toUpperCase()}`;

  const background = backgroundFrom(fp.palette.ground, botanicalState, fp.palette.primary);
  why.background = `derived from rendered ground ${fp.palette.ground} (${fp.palette.ground.toLowerCase()==='#ffffff'||fp.palette.ground.toLowerCase()==='#fbfbfb'?'achromatic, so hue borrowed from the design accent '+fp.palette.primary:'own hue kept'}); light/dark character preserved, saturation held low → ${background}`;

  return {
    dna: {
      morphology: 'broad',
      skeleton: { complexity },
      foliage: { state, density },
      botanicalState,
      flowers: {
        amount,
        primary:   amount === 'none' ? null : fp.palette.primary,
        secondary: amount === 'none' ? null : fp.palette.secondary
      },
      fruit: { enabled: fruitOn, color: fruitOn ? (fp.palette.primary || '#c0392b') : null },
      terrain,
      background,
      seed,
      rareCat: false
    },
    why
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
  'vercel':         'dark / monochrome',
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
  const { dna, why } = toDNA(fp, domain);
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
