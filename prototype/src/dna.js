// DNA -> renderer parameters.
//
// This is the ONLY module that knows the Botanical DNA vocabulary
// (docs/BOTANICAL-DNA.md). Everything downstream takes plain numbers and
// colours, which is what keeps the 3D side from quietly growing opinions about
// websites: there is no fingerprint in here, and there is nowhere to put one.
//
// The contract is discrete on purpose. Continuous values are derived HERE, from
// the states — never requested from analysis.

import * as THREE from 'three';
import { clamp } from './util.js';

const C = (hex) => new THREE.Color(hex);

// The two poles the background gradient is pulled toward. Art direction, not
// analysis: these are the sky and ground tones the reviewed prototype used.
const SKY_COOL = C(0x6fb9db);
const GROUND_WARM = C(0xf7efe0);

/**
 * The NORMAL baseline: the DNA whose output is the hand-authored tree that the
 * second visual pass left behind. Every band below is expressed relative to it,
 * so "normal" everywhere must reproduce the reviewed tree.
 */
export const DEFAULT_DNA = {
  morphology: 'broad',
  skeleton: { complexity: 'normal' },
  foliage: { state: 'normal', density: 'normal' },
  botanicalState: 'normal',
  flowers: { amount: 'medium', primary: '#f7a6b8', secondary: '#e87b92' },
  fruit: { enabled: false, color: null },
  terrain: 'normal',
  background: '#9fd0e8',
  seed: 20260920,
  rareCat: false,
};

// --- foliage ---------------------------------------------------------------

// How much leaf there is at all.
const STATE_AMOUNT = { bare: 0, sparse: 0.3, normal: 1, lush: 1.42 };

// How that leaf is distributed. These are the two edges of the noise field that
// carves air through the crown: leaves survive where the field is below the low
// edge, and are increasingly rejected up to the high edge. Sliding the pair
// down opens windows; sliding it up closes them.
//
// This is deliberately a SEPARATE lever from amount. A developed-but-airy crown
// has to read differently from a lush-and-dense one, and it only does if the
// gaps are structural rather than the whole canopy being thinned evenly.
//
// Deliberately EXAGGERATED beyond what the measurement implies. At the first
// tuning, `normal` and `dense` were indistinguishable at thumbnail size, and a
// difference that only exists close up has failed. The ordering and meaning of
// the signal are unchanged — only its amplitude.
const DENSITY_AIR = {
  airy: { e0: 0.06, e1: -0.16, lobe: 0.82, spread: 1.3, leafMul: 0.8 },
  normal: { e0: 0.24, e1: 0.05, lobe: 1.0, spread: 1.0, leafMul: 1.0 },
  dense: { e0: 0.58, e1: 0.3, lobe: 1.22, spread: 0.76, leafMul: 1.3 },
};

// --- botanical state -------------------------------------------------------
//
// AUTUMN and WINTER are not "normal, recoloured". Winter in particular has to
// stay clearly distinct from BARE — bare is the absence of styling, winter is
// the presence of restraint — so it keeps real foliage and merely mutes it.
const BOTANY = {
  normal: {
    leaf: { deep: C(0x2f6136), mid: C(0x4e9142), lit: C(0x8cc44f) },
    amount: 1,
    emissive: 0x27491f,
    bark: { light: C(0xa8806a), dark: C(0x3d2b21) },
  },
  flowering: {
    // A touch fresher and yellower than normal: blossom reads better against a
    // slightly lighter leaf, and a flowering tree is a spring tree.
    leaf: { deep: C(0x33693a), mid: C(0x559a45), lit: C(0x9ace57) },
    amount: 1,
    emissive: 0x2a4f21,
    bark: { light: C(0xa8806a), dark: C(0x3d2b21) },
  },
  autumn: {
    leaf: { deep: C(0x7d3a16), mid: C(0xc2701f), lit: C(0xecb141) },
    amount: 0.88, // a little thinner: some of it is on the ground
    emissive: 0x5a2a0d,
    bark: { light: C(0x9a7360), dark: C(0x36251d) },
  },
  winter: {
    // Desaturated sage over grey-green. NOT brown, and not dying — the reading
    // wanted is restraint, so the hue stays green and the saturation drops.
    leaf: { deep: C(0x414f3f), mid: C(0x66755c), lit: C(0x93a07f) },
    // Sparse but INTENTIONAL. The floor matters: if a winter site also lands on
    // a thin foliage state, winter must not collapse into bare.
    amount: 0.5,
    amountFloor: 0.3,
    emissive: 0x2f3a2c,
    bark: { light: C(0x9c8577), dark: C(0x382e29) },
  },
};

// --- flowers ---------------------------------------------------------------

const FLOWER_CLUSTERS = { none: 0, few: 70, medium: 215, abundant: 430 };

// --- terrain ---------------------------------------------------------------
//
// Restrained on purpose. The island is part of the project's identity, so these
// shift its tone and growth, never its vocabulary. No props, ever.
const TERRAIN = {
  sparse: {
    grass: 15000, height: 0.78,
    lo: C(0x6f9448), mid: C(0x88a659), hi: C(0xa6bd72),
    soilHi: C(0x9c8265), soilLo: C(0x6a5c5a), rocks: 1.0,
  },
  normal: {
    grass: 30000, height: 1.0,
    lo: C(0x5e9e37), mid: C(0x81c246), hi: C(0xa8d95c),
    soilHi: C(0xa07b58), soilLo: C(0x6a5663), rocks: 1.0,
  },
  lush: {
    grass: 38000, height: 1.12,
    lo: C(0x4e9530), mid: C(0x76bd3c), hi: C(0xa2d955),
    soilHi: C(0x9a7550), soilLo: C(0x63505e), rocks: 1.0,
  },
  autumn: {
    grass: 26000, height: 0.9,
    lo: C(0x8a8a3c), mid: C(0xb09a44), hi: C(0xd0b45e),
    soilHi: C(0x9c7148), soilLo: C(0x64514f), rocks: 1.0,
  },
  winter: {
    grass: 19000, height: 0.74,
    lo: C(0x6b7a5c), mid: C(0x869070), hi: C(0xa3ab8c),
    soilHi: C(0x8e8076), soilLo: C(0x615a60), rocks: 1.0,
  },
};

// --- dormancy --------------------------------------------------------------
//
// Taste's finding, and it reframes the bare state entirely: **a bare tree in a
// living scene reads as death, not as winter.** Leaflessness is judged against
// its surroundings, not on its own. The same skeleton that looks architectural
// on out-of-season turf becomes the one dead thing in a healthy garden when the
// grass around it is vivid summer green.
//
// So dormancy keys off THE TREE, not off `terrain`. That is deliberate and it is
// what Taste actually said — "if the tree goes dormant, the scene goes dormant
// with it". Keying it off `terrain: "sparse"` instead would have been wrong:
// three sites share that terrain, and one of them (threejs.org) is FLOWERING
// with 329 blossoms. A flowering tree on dead winter ground is a worse
// incoherence than the one being fixed.
const DORMANT = {
  lo: C(0x6b6f54), mid: C(0x838661), hi: C(0x9d9d79),
  soilHi: C(0x8a7d6d), soilLo: C(0x5d5859),
};

// Straw-olive, not brown. The reading wanted is "out of season", and brown turf
// reads as dead just as loudly as green turf reads as summer.
const DORMANCY = { bare: 0.82, winter: 0.4 };

// --- skeleton --------------------------------------------------------------
//
// Silhouette variation, not literal content quantity. The hand-authored branch
// tables stay exactly as tuned; complexity selects a SUBSET of them, and only
// `rich` adds anything. Subsetting preserves the tuning, generating would not.
// Branch COUNT is the part nobody can see — measured: simple / normal / rich
// were indistinguishable at thumbnail size on every foliated tree, because the
// canopy covers the branches. So complexity now drives the tree's SHAPE as well:
// `simple` is spare and upright, `rich` is broad and spreading. Same family,
// different posture — which is what survives being shrunk.
const SKELETON = {
  simple: {
    primaries: 3, secondaries: [0, 2, 4, 6], twigs: [0, 1, 2], extra: 0,
    spread: 0.84, rise: 10, crownW: 0.86, crownH: 1.14,
  },
  normal: {
    primaries: 4, secondaries: null, twigs: null, extra: 0,
    spread: 1, rise: 0, crownW: 1, crownH: 1,
  },
  rich: {
    primaries: 4, secondaries: null, twigs: null, extra: 8,
    spread: 1.18, rise: -8, crownW: 1.16, crownH: 0.93,
  },
};

/** Parse a '#rrggbb' from the contract, tolerating null. */
function hex(v, fallback = null) {
  if (typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v)) return fallback;
  return new THREE.Color(v);
}

/**
 * Turn one DNA record into the numbers the builders actually want.
 *
 * Unknown or missing states fall back to the baseline rather than throwing:
 * a malformed record should still render something reviewable, and the
 * comparison view says which fields it had to fall back on.
 */
export function resolveDNA(input) {
  const warn = [];
  const pick = (obj, key, fallback, label) => {
    if (key in obj) return obj[key];
    warn.push(`${label} "${key}" unknown, using ${fallback}`);
    return obj[fallback];
  };

  const dna = { ...DEFAULT_DNA, ...(input || {}) };
  const fState = input?.foliage?.state ?? DEFAULT_DNA.foliage.state;
  const fDens = input?.foliage?.density ?? DEFAULT_DNA.foliage.density;
  const bState = dna.botanicalState ?? 'normal';
  const complexity = input?.skeleton?.complexity ?? DEFAULT_DNA.skeleton.complexity;
  const flowerAmt = input?.flowers?.amount ?? DEFAULT_DNA.flowers.amount;
  const terrainKey = dna.terrain ?? 'normal';

  const botany = pick(BOTANY, bState, 'normal', 'botanicalState');
  const air = pick(DENSITY_AIR, fDens, 'normal', 'foliage.density');
  const terrain = pick(TERRAIN, terrainKey, 'normal', 'terrain');
  const skel = pick(SKELETON, complexity, 'normal', 'skeleton.complexity');

  const stateAmt = fState in STATE_AMOUNT
    ? STATE_AMOUNT[fState]
    : (warn.push(`foliage.state "${fState}" unknown, using normal`), 1);

  const bare = fState === 'bare';

  // How dormant the SCENE is. Driven by the tree's own state: a leafless tree
  // needs the ground to be out of season with it, or it reads as the only dead
  // thing in a living garden. A tree in leaf never triggers this, whatever its
  // terrain state says.
  const dormancy = bare ? DORMANCY.bare : bState === 'winter' ? DORMANCY.winter : 0;

  // Leaf volume. Winter applies a floor so it can never reach zero — that
  // distinction is the whole concept, and a thin winter site must not silently
  // become a bare one.
  let amount = stateAmt * botany.amount * (air.leafMul ?? 1);
  if (!bare && botany.amountFloor != null) amount = Math.max(amount, botany.amountFloor);

  // BARE is a headline state and it has to be BEAUTIFUL, not punished. The
  // first attempt at it rendered as an amputated stump: `simple` + `bare`
  // (which info.cern.ch actually is) left three thick limbs ending in blunt
  // caps, which reads as a tree that was cut apart rather than one showing its
  // structure.
  //
  // Two compensations, both EXPERIMENT and both flagged in the report:
  //   - far more ramification, in two generations, so there is filigree to
  //     carry the silhouette
  //   - much finer limb tips, because nothing hides a blunt branch end when
  //     there are no leaves on it
  const extraTwigs = skel.extra + (bare ? (complexity === 'simple' ? 16 : 11) : 0);
  const subTwigs = bare ? 3 : complexity === 'rich' ? 1 : 0;
  const tipTaper = bare ? 0.3 : amount < 0.55 ? 0.62 : 1;

  // Flower colour comes straight from the contract. It is NOT nudged toward a
  // botanical hue: whether a brand blue reads as a flower is exactly what this
  // round is meant to find out, and pre-correcting it would hide the answer.
  const fp = hex(input?.flowers?.primary);
  const fs = hex(input?.flowers?.secondary);

  // No accent colour means no flowers — never a fallback pink. A site with no
  // chromatic accent (paulgraham.com has literally zero) must render flowerless
  // rather than borrow a colour it does not have, or the comparison is showing
  // the renderer's taste instead of the website's.
  //
  // Autumn and winter are NOT suppressed here. The renderer used to zero them on
  // the grounds that a flowering autumn tree is botanically odd; Lead ruled that
  // autumn abundance decreases rather than vanishes, and that winter needs no
  // override because analysis already sends it `none`. The contract decides how
  // many flowers there are; the renderer only decides how they look.
  const flowersOff = bare || !fp;
  const stateMul = bState === 'flowering' ? 1.25 : bState === 'autumn' ? 0.4 : 1;
  const clusters = flowersOff
    ? 0
    : Math.round((FLOWER_CLUSTERS[flowerAmt] ?? FLOWER_CLUSTERS.medium) * stateMul);

  const flowerCols = clusters > 0
    ? [fp, fs || fp.clone().offsetHSL(0.02, -0.06, -0.08), fp.clone().offsetHSL(0, -0.22, 0.2)]
    : null;

  // Fruit is eligible only where the contract says it can be, and carries no
  // analytical meaning at all. That is intentional.
  const fruitOn = !!input?.fruit?.enabled && !bare && bState !== 'winter' && amount >= 0.28;
  const fruitCol = hex(input?.fruit?.color, C(0xd8452f));

  // Background. The contract gives ONE colour and we do not re-derive it — but
  // a flat fill makes the island look pasted onto a wall, which the first pass
  // already established. So the given colour becomes the horizon and a gradient
  // is built AROUND it.
  //
  // The gradient is not a lightness ramp of the same hue. The reviewed look was
  // cool above and warm below, and that vertical warm/cool is what gives the
  // island somewhere to sit — a same-hue ramp leaves it floating on a wall of
  // one colour. So the given colour is pulled a limited distance toward a fixed
  // cool sky and a fixed warm ground. It stays clearly the site's colour; it
  // just stops being a flat field.
  const bg = hex(dna.background, C(0xe0e0e0));
  const bgTop = bg.clone().lerp(SKY_COOL, 0.32).offsetHSL(0, 0, -0.05);
  const bgBot = bg.clone().lerp(GROUND_WARM, 0.42);

  return {
    seed: (dna.seed >>> 0) || 1,
    warnings: warn,
    labels: { fState, fDens, bState, complexity, flowerAmt, terrain: terrainKey },

    background: { top: bgTop, bottom: bgBot },
    bark: botany.bark,

    skeleton: {
      primaries: skel.primaries,
      secondaries: skel.secondaries,
      twigs: skel.twigs,
      extraTwigs,
      subTwigs,
      tipTaper,
      spread: skel.spread,
      rise: skel.rise,
    },

    foliage: {
      amount,                       // 0 = bare
      airE0: air.e0,
      airE1: air.e1,
      lobeScale: air.lobe,
      lobeSpread: air.spread,
      crownW: skel.crownW,
      crownH: skel.crownH,
      palette: botany.leaf,
      emissive: botany.emissive,
      // Winter foliage clings closer to the branch: restraint reads as tidy,
      // not as a thinned-out version of summer.
      shellBias: bState === 'winter' ? 0.46 : 0.32,
    },

    flowers: { clusters, colors: flowerCols },
    fruit: { enabled: fruitOn, color: fruitCol, count: fruitOn ? 34 : 0 },

    terrain: {
      // Dormancy is applied here, on top of whatever terrain state the contract
      // asked for, so it shifts tone and growth without replacing the state.
      grass: Math.round(terrain.grass * (1 - 0.18 * dormancy)),
      height: terrain.height * (1 - 0.25 * dormancy),
      lo: terrain.lo.clone().lerp(DORMANT.lo, dormancy),
      mid: terrain.mid.clone().lerp(DORMANT.mid, dormancy),
      hi: terrain.hi.clone().lerp(DORMANT.hi, dormancy),
      soilHi: terrain.soilHi.clone().lerp(DORMANT.soilHi, dormancy),
      soilLo: terrain.soilLo.clone().lerp(DORMANT.soilLo, dormancy),
      // Fallen petals only exist where there is blossom to fall. Autumn gets
      // fallen leaf instead, in the canopy's own colour.
      litter: clusters > 0 ? 'petal' : bState === 'autumn' ? 'leaf' : 'none',
      litterColor: bState === 'autumn' ? botany.leaf.mid : (flowerCols ? flowerCols[0] : null),
    },
  };
}

/**
 * Roughly name a colour so a panel can say "the site's blue" rather than
 * "#2d7abc". Coarse on purpose — this is prose, not a colour picker.
 */
function colourWord(c) {
  const hsl = c.getHSL({ h: 0, s: 0, l: 0 });
  if (hsl.s < 0.12) return hsl.l > 0.6 ? 'pale grey' : 'grey';
  const h = hsl.h * 360;
  const name =
    h < 15 ? 'red' : h < 40 ? 'orange' : h < 65 ? 'yellow' : h < 160 ? 'green' :
    h < 200 ? 'teal' : h < 250 ? 'blue' : h < 290 ? 'violet' : h < 335 ? 'pink' : 'red';
  return (hsl.l > 0.72 ? 'pale ' : hsl.l < 0.3 ? 'deep ' : '') + name;
}

/**
 * Short human phrases describing THE TREE, for a "Why this tree?" panel.
 *
 * Boundary note, and it matters: these describe the tree, never the website.
 * This module cannot see a fingerprint, so it cannot honestly say *why* a site
 * produced this DNA — that half of the sentence lives in each record's `why`
 * field, which analysis writes and which is deliberately stripped out of the
 * renderer's snapshot. A panel that wants "sparse foliage BECAUSE the styling is
 * restrained" must join these phrases to `why`; the renderer inventing the
 * causal half would be fabricating the one thing the contract exists to prove.
 */
export function explainDNA(dna) {
  const out = [];
  const f = dna.foliage || {};
  const b = dna.botanicalState || 'normal';
  const fl = dna.flowers || {};

  if (f.state === 'bare') {
    out.push('No leaves — the bare structure is the whole tree');
  } else {
    const amount = { sparse: 'Sparse foliage', normal: 'An even canopy', lush: 'Lush foliage' }[f.state] || 'An even canopy';
    const dens = { airy: 'open and full of gaps', normal: null, dense: 'packed tight' }[f.density];
    out.push(dens ? `${amount}, ${dens}` : amount);
  }

  if (b === 'winter') out.push('Muted winter colour, foliage held back');
  else if (b === 'autumn') out.push('Turned to autumn colour');
  else if (b === 'flowering') out.push('In flower');

  const primary = hex(fl.primary);
  if (primary && fl.amount && fl.amount !== 'none' && f.state !== 'bare') {
    const many = { few: 'A scattering of', medium: 'Blossom in', abundant: 'Heavy blossom in' }[fl.amount] || 'Blossom in';
    out.push(`${many} the site's ${colourWord(primary)}`);
  } else if (f.state !== 'bare') {
    out.push('No flowers — this site has no accent colour to carry');
  }

  const shape = { simple: 'A spare, upright crown', normal: null, rich: 'A broad, heavily branched crown' }[dna.skeleton?.complexity];
  if (shape) out.push(shape);

  if (dna.fruit?.enabled) out.push('Carrying fruit');

  const ground = { sparse: 'Thin ground cover', lush: 'Thick grass', autumn: 'Autumn ground', winter: 'Winter ground' }[dna.terrain];
  if (ground) out.push(ground);

  return out;
}

/** A one-line human summary, for the comparison view's caption. */
export function describeDNA(dna) {
  const f = dna.foliage || {};
  const parts = [
    dna.skeleton?.complexity,
    `${f.state}/${f.density}`,
    dna.botanicalState,
    `flowers:${dna.flowers?.amount}`,
  ];
  if (dna.fruit?.enabled) parts.push('fruit');
  parts.push(`terrain:${dna.terrain}`);
  return parts.join(' · ');
}

export { clamp };
