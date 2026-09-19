// Fingerprint -> Botanical DNA. SINGLE SOURCE OF TRUTH for every threshold.
// Extracted verbatim from probe/dna.js so the batch probe and the live server cannot
// drift apart. Bands are evidence-based and committed — do not re-tune them here.
// Knows nothing about three.js, and nothing about browsers.

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
export const BANDS = {
  // stylingRichness sorted: .02 .02 .07 | .16 .17 .18 .24 | .33 .38 .42 .42 .43 .44 .45 .45 .48 .49 .49 .49 | .57 .58 .59 .61
  foliageState: { bare: 0.10, sparse: 0.30, normal: 0.50 },   // gaps at .07|.16, .24|.33, .49|.57
  // inkCoverage sorted: .04 .05 .05 .07 .07 | .11 .13 .14 .17 .18 .21 .24 .28 .29 .31 .37 .44 | .48 .53 .58 .72 .75 .80
  density:      { airy: 0.15, normal: 0.45 },
  // design colourfulness (media-masked where masking applies).
  // RECALIBRATED 2026-09-20 (Lead ruling): the original .08/.20/.40 were derived from the
  // UNMASKED corpus distribution and then applied to MASKED values, which run about half
  // (median .205 unmasked vs .095 masked). Intended spread was 5/6/7/5; delivered was
  // 12/6/3/2. These are the natural gaps in the MASKED distribution.
  flowers:      { none: 0.03, few: 0.10, medium: 0.25 },
  skeleton:     { simple: 0.15, normal: 0.45 },
  // WINTER means deliberate RESTRAINT. Added 2026-09-20 (Lead ruling): winter now also
  // requires low UNMASKED colourfulness, so colour anywhere on the page blocks it even
  // when we cannot credit that colour to design rather than content. Without this,
  // figma.com — visibly colourful, but with its colour inside <img> brand illustration
  // that the mask strips — rendered as the restraint state.
  // Threshold 0.10 chosen from live measurement: craigslist 0.03 and vercel 0.00 (the
  // only legitimate wild WINTER cases) keep a 3x margin; figma at 0.165 is excluded.
  winter:       { authored: 0.60, colorfulness: 0.06, unmaskedColorfulness: 0.10, ink: 0.20, styling: 0.35 },
  autumn:       { warmShare: 0.55, chromatic: 0.05 },
  fruitRate:    0.10,
  // below this chromatic coverage there is no meaningful accent.
  // RECALIBRATED 2026-09-20 (Lead ruling): 0.01 was set by judgment, never from the
  // distribution, and gated out 12 of 23 sites before colourfulness was consulted —
  // tailwindcss.com excluded by 0.0002 despite a real brand colour, while genuinely
  // colourless sites sit an order of magnitude lower (4 at exactly 0, 9 below 0.002).
  accentFloor:  0.002
};

// ---------------------------------------------------------------- flower conditioning
// Raw accent hexes are emitted straight from rendered pixels, and a dark one produces a
// blossom indistinguishable from bark (github.com: #0b0d40, a near-black navy, at
// `medium` amount). Flower legibility tracks hue CONTRAST, not amount — independently
// observed by visual-3d from the renderer side.
//
// Same treatment `background` already gets under Rule 11: display-safe and aesthetically
// controlled rather than raw. HUE IS PRESERVED EXACTLY — that is the site's colour and
// the whole of D5. Only lightness and chroma move, and only far enough that a blossom
// reads as a blossom against green foliage and against its own bark.
function conditionFlower(hexIn, role) {
  if (!hexIn) return null;
  const [h, s, l] = rgb2hsl(...hex2rgb(hexIn));
  // A near-grey accent has no hue worth preserving; give it a gentle tint rather than
  // inventing a colour it does not have.
  const sat = s < 0.08
    ? (role === 'secondary' ? 0.22 : 0.30)
    : Math.max(role === 'secondary' ? 0.38 : 0.48, Math.min(s, 0.92));
  // Petals sit ABOVE foliage in lightness so they separate from it; centres sit below
  // the petals so the flower still reads as a flower rather than a flat dot.
  const lit = role === 'secondary'
    ? Math.max(0.40, Math.min(0.62, l < 0.40 ? 0.44 : l))
    : Math.max(0.60, Math.min(0.82, l < 0.60 ? 0.66 : l));
  return rgb2hex(...hsl2rgb(h, sat, lit));
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
export function buildDna(fp, domain){
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
      && (fp.colorfulness ?? fp.designColorfulness) < B.winter.unmaskedColorfulness
      && fp.inkCoverage < B.winter.ink && fp.stylingRichness >= B.winter.styling) {
    botanicalState = 'winter';
    why.botanicalState = `authored ${fp.authored} >= ${B.winter.authored} AND stylingRichness ${fp.stylingRichness} >= ${B.winter.styling} (clearly authored) AND design colourfulness ${fp.designColorfulness} < ${B.winter.colorfulness} AND inkCoverage ${fp.inkCoverage} < ${B.winter.ink} AND unmasked colourfulness ${fp.colorfulness} < ${B.winter.unmaskedColorfulness} (no colour anywhere on the page, not merely none we can credit to design) → WINTER (restraint, not absence — distinct from BARE)`;
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
    // Lead ruling: Rule 6 says autumn abundance DECREASES, not vanishes. Floor at FEW so
    // an autumn tree that had flowers still carries some. (WINTER separately emits none.)
    amount = { abundant: 'medium', medium: 'few', few: 'few' }[amount];
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
  if (amount !== 'none' && fp.palette.primary) {
    why.flowers += `; colour conditioned for legibility — hue preserved exactly from ${fp.palette.primary}, lightness and chroma lifted so the blossom reads against foliage`;
  }
  why.background = `derived from rendered ground ${fp.palette.ground} (${fp.palette.ground.toLowerCase()==='#ffffff'||fp.palette.ground.toLowerCase()==='#fbfbfb'?'achromatic, so hue borrowed from the design accent '+fp.palette.primary:'own hue kept'}); light/dark character preserved, saturation held low → ${background}`;

  return {
    dna: {
      morphology: 'broad',
      skeleton: { complexity },
      foliage: { state, density },
      botanicalState,
      flowers: {
        amount,
        primary:   amount === 'none' ? null : conditionFlower(fp.palette.primary, 'primary'),
        secondary: amount === 'none' ? null : conditionFlower(fp.palette.secondary, 'secondary')
      },
      fruit: { enabled: fruitOn, color: fruitOn ? (conditionFlower(fp.palette.primary, 'primary') || '#c0392b') : null },
      terrain,
      background,
      seed,
      rareCat: false
    },
    why
  };
}

