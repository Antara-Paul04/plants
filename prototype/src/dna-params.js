// DNA -> the new tree's parameter bag.
//
// This is the whole of the wiring. The new tree (grow.js) already runs on a flat
// bag of values; until now that bag was a debug page's URL. `dnaToParams` is the
// other source of it. It INVENTS NOTHING: every line maps one contract field
// (docs/BOTANICAL-DNA.md) onto parameters that already existed and were already
// art-directed by hand. 3D still never reads a fingerprint.
//
// The shipped renderer's resolver (dna.js, resolveDNA) is REUSED, not re-derived,
// for everything the two trees must agree on — the terrain and stone palettes,
// scene dormancy, and the gates that decide whether a tree may flower or fruit at
// all. Two resolvers would drift, and then the same DNA would mean two things.

import * as THREE from 'three';
import { resolveDNA } from './dna.js';

// skeleton.complexity -> which ARCHITECTURE. Not a density dial: `simple` is few
// limbs held WIDE (few limbs held narrow read as starved), `rich` is the full
// judged structure. A BARE tree always gets the rich one — its skeleton is the
// whole show, and the judged Gate 1 tree is that preset.
const STRUCTURE = { simple: 'sparse', normal: 'mid', rich: 'bare' };

// foliage.state -> how much of each limb is in leaf and how full a cluster is.
// EXAGGERATED on purpose, like everything that has to survive a thumbnail: at
// subtler steps `sparse` and `normal` were the same tree at 140px.
const FOLIAGE_STATE = {
  sparse: { leafSpacing: 0.68, perCluster: 13, leafOuter: 0.56, leafLen: 0.48 },
  normal: { leafSpacing: 0.4, perCluster: 17, leafOuter: 0.78, leafLen: 0.5 },
  lush:   { leafSpacing: 0.33, perCluster: 19, leafOuter: 0.9, leafLen: 0.54 },
};
// foliage.density -> within-state variation of the same lever.
const FOLIAGE_DENSITY = { airy: 1.2, normal: 1, dense: 0.85 };

// `background` decides DAY or NIGHT and nothing else. It is NOT mapped to a scene
// colour: literal website-background -> scene colour is a standing ban (a dark
// site's ground colour made muddy gloom — a dark website is not a dark tree). A
// dark site gets the art-directed night state instead.
const NIGHT_BELOW = 0.06;  // relative (linear) luminance of the contract's background: about sRGB #454545

const hexStr = (c) => (c ? c.getHexString() : null);

/**
 * @returns {{ params: object, terrain: object, rocks: boolean, warnings: string[] }}
 *   `params` is a layer for grow.js's paramSource (put the URL's layer AFTER it so
 *   query parameters still win). `terrain` goes to growTree's `opts.terrain`.
 */
export function dnaToParams(dna) {
  const v0 = resolveDNA(dna);
  const { fState, fDens, bState, complexity, flowerAmt } = v0.labels;
  const bare = fState === 'bare';
  const winter = bState === 'winter';
  const params = {};

  // seed -> the tree, and (on its own stream, in flowers.js) the bloom grammar.
  params.seed = v0.seed;
  params.morphology = dna?.morphology ?? 'broad';

  // structure
  params.preset = bare ? 'bare' : (STRUCTURE[complexity] ?? 'mid');

  // foliage. `bare` is leafless AND unornamented: a bare tree is an unstyled site
  // and carries nothing, by definition.
  params.leaves = bare ? '0' : '1';
  if (!bare) {
    const f = FOLIAGE_STATE[fState] ?? FOLIAGE_STATE.normal;
    params.leafSpacing = +(f.leafSpacing * (FOLIAGE_DENSITY[fDens] ?? 1)).toFixed(3);
    params.perCluster = f.perCluster;
    params.leafOuter = f.leafOuter;
    params.leafLen = f.leafLen;
  }

  // botanicalState is a FOUR-value enum. `flowering` is ordinary (fresher) greens —
  // it is set BY the flower amount and is not a colour state of its own.
  params.season = ['normal', 'flowering', 'autumn', 'winter'].includes(bState) ? bState : 'normal';
  if (winter && !bare) {
    // Winter keeps a thin sage crown: "bare is the absence of styling, winter is
    // the presence of restraint", and leafless-with-pale-buds is very nearly a bare
    // tree at 140px. The buds (or berries) ride on top of it.
    params.winterLeaves = '1';
  }

  // flowers. The colours arrive ALREADY CONDITIONED by analysis (petal lightness
  // floor, computed centre) — they are passed through untouched. No accent means no
  // flowers, never a fallback colour.
  const primary = typeof dna?.flowers?.primary === 'string' ? new THREE.Color(dna.flowers.primary) : null;
  const secondary = typeof dna?.flowers?.secondary === 'string' ? new THREE.Color(dna.flowers.secondary) : null;
  const flowersOn = !bare && !winter && !!primary && flowerAmt !== 'none';
  params.flowers = flowersOn ? flowerAmt : 'none';
  if (primary) params.fc = hexStr(primary);
  if (secondary) params.fc2 = hexStr(secondary);
  // Autumn still flowers — abundance DECREASES, it does not vanish. Analysis has
  // already stepped the band down; this is the renderer's half (dna.js: x0.4), and
  // both halves are intended. "The contract decides how many flowers there are;
  // the renderer only decides how they look."
  if (bState === 'autumn') params.bloomMul = 0.4;
  // A winter site delivers no colour today (flowers: none => primary null), so its
  // buds are a natural bud tone rather than an accent nobody measured.
  if (winter && !primary) params.budNatural = '1';

  // fruit. V0's gate is reused for a tree in leaf; in winter the contract's own
  // flag is honoured directly, because persistent berries ARE winter's fruit (L8).
  const fruitOn = winter ? !!dna?.fruit?.enabled : v0.fruit.enabled;
  if (fruitOn && !bare) {
    params.fruit = '1';
    params.fruitc = hexStr(v0.fruit.color);
    // A sparse crown has fewer places to hang fruit and less leaf to hang it in.
    if (fState === 'sparse') params.fruitSites = 12;
  }

  // environment
  const bg = typeof dna?.background === 'string' ? new THREE.Color(dna.background) : null;
  const lum = bg ? 0.2126 * bg.r + 0.7152 * bg.g + 0.0722 * bg.b : 1;
  params.envstate = lum < NIGHT_BELOW ? 'night' : 'day';

  return { params, terrain: v0.terrain, rocks: true, warnings: v0.warnings };
}
