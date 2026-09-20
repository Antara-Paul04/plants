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
  flowers:      { none: 0.03, few: 0.10, medium: 0.25 },   // retained: colour bands, no longer gate amount
  // DECORATION AMOUNT is gated on visual RICHNESS, not colour (Lead ruling 2026-09-20).
  // stylingRichness and colourfulness measure r=0.02 across 23 sites — orthogonal axes —
  // so gating decoration on chroma discarded an entire independent signal. A maximally
  // sophisticated achromatic site (linear.app, stylingRichness 0.614, the corpus maximum) got
  // no ornament at all.
  // PROVISIONAL BANDS — mechanism first. `taste` owes the restrained-vs-boring
  // definition, which is the acceptance test for "rich enough to earn decoration".
  decoration:   { none: 0.20, few: 0.40, medium: 0.55 },
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
  // FRUIT now carries meaning (EXPERIMENT, 2026-09-20). Flowers represent small,
  // distributed accents; fruit represents FEWER, LARGER, CONCENTRATED ones. Measured by
  // connected-component analysis over accent pixels — see probe/accent-regions.js.
  // Threshold 0.60 from the corpus: gov.uk 0.874, stripe 0.752, figma 0.695 sit above it
  // and nothing else with a real accent comes close (next is 0.326).
  fruit:        { concentration: 0.60, rate: 0.50 },
  fruitRate:    0.10,   // retained for reference; superseded by fruit.rate
  // below this chromatic coverage there is no meaningful accent.
  // RECALIBRATED 2026-09-20 (Lead ruling): 0.01 was set by judgment, never from the
  // distribution, and gated out 12 of 23 sites before colourfulness was consulted —
  // tailwindcss.com excluded by 0.0002 despite a real brand colour, while genuinely
  // colourless sites sit an order of magnitude lower (4 at exactly 0, 9 below 0.002).
  accentFloor:  0.002
};

// ---------------------------------------------------------------- flower conditioning
// Raw accent hexes come straight from rendered pixels, and a dark one produces a blossom
// indistinguishable from bark. But the first version of this fixed that by BLEACHING the
// petal: #723131 (maroon) came out #d27f7f (dusty pink). Hue was preserved exactly and
// the colour was still lost, because FOR A DARK ACCENT THE DARKNESS IS PART OF THE
// IDENTITY — maroon, burgundy, oxblood, forest green, deep plum.
//
// So legibility now comes from contrast AROUND the petal, not from lightening it:
//   * petal lightness may travel only a bounded distance, and only up to a floor that
//     separates it from foliage — it is never pushed into the pastel range;
//   * the flower CENTRE carries the remaining read. A dark petal gets a bright centre,
//     which reads at distance, keeps the petal's colour, and is botanically ordinary.
//
// Numbers are taken from the 19 real design accents in the corpus (lightness 0.21-0.84,
// median 0.66, only ONE below 0.40). PETAL_FLOOR sits just under that lone dark accent's
// neighbourhood so genuinely dark brand colours survive as dark.
const PETAL_FLOOR = 0.40;   // minimum lightness that still separates a petal from foliage
const PETAL_LIFT  = 0.22;   // maximum distance lightness may travel, ever
const PETAL_CEIL  = 0.86;   // keep near-white accents off a light background
const CENTRE_GAP  = 0.35;   // lightness contrast the centre must achieve against the petal

function conditionFlower(hexIn, role, petalHex, achromatic) {
  if (!hexIn) return null;
  const [h, s, l] = rgb2hsl(...hex2rgb(hexIn));

  if (role === 'primary') {
    // lift only as far as the floor, and never further than PETAL_LIFT
    const lit = Math.min(PETAL_CEIL, Math.max(l, Math.min(l + PETAL_LIFT, PETAL_FLOOR)));
    // a near-grey accent has no hue worth preserving; tint gently rather than invent one
    const sat = s < 0.08 ? 0.28 : Math.max(0.42, Math.min(s, 0.92));
    return rgb2hex(...hsl2rgb(h, sat, lit));
  }

  // CENTRE: hue stays the site's secondary, lightness is driven by contrast with the
  // petal so the flower reads at thumbnail size whatever colour the petal ended up.
  const petalL = petalHex ? rgb2hsl(...hex2rgb(petalHex))[2] : 0.6;
  const lit = petalL < 0.50
    ? Math.max(0.62, Math.min(0.90, petalL + CENTRE_GAP))   // dark petal -> bright centre
    : Math.max(0.28, Math.min(0.58, petalL - CENTRE_GAP));  // light petal -> deep centre
  // a centre is subordinate to the petal: it supplies contrast, it does not compete.
  // Uncapped, stripe's #735ffd centre came out an electric #2b0feb.
  //
  // The saturation FLOOR must not apply to a deliberately colourless flower. It did, and
  // it invented a colour: ente.com has no accent, so its petal is a pale cream (hue 60,
  // L 0.93). Darkening that cream for the centre while forcing saturation up to 0.30
  // produced #9d9d66 — OLIVE GREEN — on a site with no green in it. A dark yellow is
  // khaki; only a pale yellow is cream. For an achromatic flower the centre should stay
  // near-neutral, because grey is the honest answer when the site gave us no hue.
  const sat = achromatic ? Math.min(s, 0.09)
            : s < 0.08   ? 0.22
            : Math.max(0.30, Math.min(s, 0.62));
  return rgb2hex(...hsl2rgb(h, sat, lit));
}

// A dark petal with no secondary accent would have no centre to carry the read, so one is
// derived from the petal's own hue. Legibility necessity, flagged in `why`.
// A site with no chromatic accent still earns flowers (richness gates whether, colour
// gates only what colour). They come out pale — ivory carrying a whisper of the site's
// own ground hue, so achromatic sites are not all issued the same white.
function achromaticPetal(groundHex) {
  const [h, sat] = rgb2hsl(...hex2rgb(groundHex || '#ffffff'));
  // A greyscale ground reports hue 0, which is RED — borrowing it gave four unrelated
  // sites the same pink ivory. Only borrow a hue the ground actually has; otherwise use
  // a neutral warm cream.
  const hue = sat >= 0.05 ? h : 42;
  return rgb2hex(...hsl2rgb(hue, sat >= 0.05 ? 0.07 : 0.05, 0.93));
}

function flowerPair(primaryHex, secondaryHex, achromatic) {
  const petal = conditionFlower(primaryHex, 'primary');
  if (!petal) return { petal: null, centre: null, derivedCentre: false };
  const petalL = rgb2hsl(...hex2rgb(petal))[2];
  if (!secondaryHex && petalL < 0.45) {
    return { petal, centre: conditionFlower(primaryHex, 'secondary', petal, achromatic), derivedCentre: true };
  }
  return { petal, centre: conditionFlower(secondaryHex, 'secondary', petal, achromatic), derivedCentre: false };
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

  // --- visual richness. Normally the DOM-measured value. But where the DOM cannot see
  // the page at all — a canvas-dominant site has a handful of blocks and no landmarks —
  // stylingRichness reads near-unstyled while the pixels are dense. In that case the
  // pixels win, because the pixels are what a person sees.
  // SCOPED DELIBERATELY to the canvas case: n=2 (bruno-simon, threejs.org/examples).
  // It should in principle also catch full-bleed video and image-only pages; that is
  // UNTESTED and the gate is not widened to cover it.
  const domBlind = (fp.canvasArea ?? 0) >= 0.5 && fp.stylingRichness < 0.30;
  const richness = domBlind
    ? Math.max(fp.stylingRichness, Math.min(1, (fp.inkCoverage ?? 0) + 0.15))
    : fp.stylingRichness;
  if (domBlind) {
    why.richness = `canvasArea ${fp.canvasArea} with stylingRichness ${fp.stylingRichness}: the DOM cannot represent this page, so richness is taken from rendered pixels (${richness.toFixed(3)}) instead. Scoped to canvas-dominant pages only; n=2.`;
  }

  // --- foliage state. BARE requires BOTH low authored and low styling, so that
  // designed minimalism (better-mfw: authored .20 / styling .16) cannot fall in.
  let state;
  if (fp.authored <= 0.15 && richness < B.foliageState.bare) {
    state = 'bare';
    why.foliage = `visual richness ${richness.toFixed(3)} < ${B.foliageState.bare} AND authored ${fp.authored} <= 0.15 → BARE (unstyled: the page has no authored design to express as foliage)`;
  } else if (richness < B.foliageState.sparse) {
    state = 'sparse';
    why.foliage = `visual richness ${richness.toFixed(3)} in [${B.foliageState.bare}, ${B.foliageState.sparse}) → SPARSE; authored ${fp.authored} > 0.15 keeps it out of BARE (restraint, not absence)`;
  } else if (richness < B.foliageState.normal) {
    state = 'normal';
    why.foliage = `visual richness ${richness.toFixed(3)} in [${B.foliageState.sparse}, ${B.foliageState.normal}) → NORMAL (the corpus midband, 12 of 23 sites)`;
  } else {
    state = 'lush';
    why.foliage = `visual richness ${richness.toFixed(3)} >= ${B.foliageState.normal} → LUSH (top of the corpus; 4 of 23 sites)`;
  }

  // --- density: ink carries visual mass, styling says how much of it is design
  let density;
  if (fp.inkCoverage < B.density.airy) density = 'airy';
  else if (fp.inkCoverage < B.density.normal) density = 'normal';
  else density = 'dense';
  let damped = false;
  if (richness < 0.30 && density === 'dense') { density = 'normal'; damped = true; }
  why.density = damped
    ? `inkCoverage ${fp.inkCoverage} alone reads DENSE, but visual richness ${richness.toFixed(3)} < 0.30 — visible mass without much authored design → damped to NORMAL (restrained foliage despite mass)`
    : `inkCoverage ${fp.inkCoverage} → ${density.toUpperCase()}` +
      (state === 'lush' && density === 'airy' ? ' (high styling + low ink = developed but AIRY)' : '');

  // --- DECORATION: richness decides WHETHER, palette decides only WHAT COLOUR.
  // `richness` is stylingRichness, raised by the disagreement override where the DOM
  // cannot see the page (see visualRichness above).
  let amount;
  const R = richness;
  if (R < B.decoration.none)        { amount='none';     why.flowers = `visual richness ${R.toFixed(3)} < ${B.decoration.none} → NONE (too little design to carry ornament)`; }
  else if (R < B.decoration.few)    { amount='few';      why.flowers = `visual richness ${R.toFixed(3)} in [${B.decoration.none}, ${B.decoration.few}) → FEW`; }
  else if (R < B.decoration.medium) { amount='medium';   why.flowers = `visual richness ${R.toFixed(3)} in [${B.decoration.few}, ${B.decoration.medium}) → MEDIUM`; }
  else                              { amount='abundant'; why.flowers = `visual richness ${R.toFixed(3)} >= ${B.decoration.medium} → ABUNDANT`; }
  // colour, and ONLY colour, comes from the palette. No chroma is not a reason for no
  // flowers — it is a reason for pale ones.
  const hasChroma = fp.designChromaticRatio >= B.accentFloor;
  if (!hasChroma && amount !== 'none') {
    why.flowers += `; the site has no meaningful chromatic accent (chromatic coverage ${fp.designChromaticRatio} < ${B.accentFloor}), so the flowers are pale rather than absent`;
  } else if (amount !== 'none' && fp.paletteSource === 'media-masked') {
    why.flowers += `; colour from the media-masked palette (photography excluded from the accent)`;
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
  // Eligibility is now MEASURED, not a lottery: the site's accent colour must live in a
  // few large concentrated areas rather than be scattered in many small ones.
  // Canvas-dominant pages are excluded — bruno-simon reads concentration 1.0 only because
  // its whole page is one canvas, which is degenerate rather than concentrated.
  const conc = fp.accentConcentration ?? 0;
  const canvasDominant = (fp.canvasArea ?? 0) >= 0.5;
  const concentrated = conc >= B.fruit.concentration && !canvasDominant;
  const eligible = concentrated && state !== 'bare' && botanicalState !== 'winter'
                && (state === 'normal' || state === 'lush');
  const roll = rng();
  const fruitOn = eligible && roll < B.fruit.rate;
  if (fruitOn) {
    why.fruit = `accent concentration ${conc.toFixed(3)} >= ${B.fruit.concentration}: this site's colour sits in a few large areas rather than many small ones, which is what fruit represents (flowers represent the distributed case). Seeded personality then decides: seed ${seed} → roll ${roll.toFixed(3)} < ${B.fruit.rate}.`;
  } else if (concentrated && !eligible) {
    why.fruit = `accent is concentrated (${conc.toFixed(3)}) but the tree is not fruit-eligible (foliage ${state}, state ${botanicalState})`;
  }

  // colour source: the site's accent when it has one, ivory when it does not.
  const petalSource   = hasChroma ? fp.palette.primary   : achromaticPetal(fp.palette.ground);
  const centreSource  = hasChroma ? fp.palette.secondary : achromaticPetal(fp.palette.ground);
  const flowers = flowerPair(petalSource, centreSource, !hasChroma);

  const terrain = state === 'bare' ? 'sparse'
    : botanicalState === 'winter' ? 'winter'
    : botanicalState === 'autumn' ? 'autumn'
    : state === 'lush' ? 'lush' : state === 'sparse' ? 'sparse' : 'normal';
  why.terrain = `follows foliage state ${state.toUpperCase()}${botanicalState!=='normal'&&botanicalState!=='flowering'?` and botanical state ${botanicalState.toUpperCase()}`:''} → ${terrain.toUpperCase()}`;

  const background = backgroundFrom(fp.palette.ground, botanicalState, fp.palette.primary);
  if (amount !== 'none' && fp.palette.primary) {
    why.flowers += `; petal keeps the site's accent ${fp.palette.primary} — hue exact, lightness moved at most ${PETAL_LIFT} so a dark accent stays dark` +
      (flowers.derivedCentre ? `; centre derived from the petal hue because the site has no secondary accent and a dark petal needs one to read` : `; contrast carried by the flower centre`);
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
        primary:   amount === 'none' ? null : flowers.petal,
        secondary: amount === 'none' ? null : flowers.centre
      },
      fruit: { enabled: fruitOn, color: fruitOn ? (flowers.petal || '#c0392b') : null },
      terrain,
      background,
      seed,
      rareCat: false
    },
    why
  };
}

