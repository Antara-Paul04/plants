// Flowers and fruit — the second and third CLUSTER types.
//
// Same rule as the leaves (leaves.js): the authored unit is the cluster, not
// the petal, and it sits on the SAME attachment points the leaves use. A flower
// that is not on a twig is confetti, and TASTE #7 is explicit: "Flowers are
// deliberate. Botanical clusters and details — never confetti scattered through
// the canopy."
//
// What flowers are FOR in this product: they are how the website's accent
// colour reaches the tree (D5). So the two-distance rule bites twice as hard —
//   - at thumbnail size the colour must arrive as a few MASSES of bloom, which
//     is a placement problem (drifts, not scatter) and a VALUE problem: V0
//     found that a cool accent (gov.uk blue) sits at the same value as canopy
//     green and vanishes at any amount. Hue contrast cannot be relied on, so
//     every petal pales toward its edge: the bloom always carries a light value
//     the green does not have, whatever the hue;
//   - up close each flower has to be a flower. Three bloom GRAMMARS are built
//     (Lead ruling L3, docs/briefs/BLOOM-SYSTEM-RULINGS.md):
//       cluster    many small open blossoms grouped over a dome
//       statement  fewer, larger upright flowers
//       pendant    hanging, tapering clusters
//     GRAMMAR, never species: Plants makes a stylised botanical translation and
//     does not classify trees. The grammars were first named after real trees,
//     and were renamed because a name like that eventually gets a future agent
//     trying to make the tree BE one. (LEGACY_GRAMMAR below maps old -> new so
//     older renders and URLs stay readable.)
//     A grammar is a property of the tree; one tree carries one. WHICH one is
//     not in the DNA (L1): it is chosen from the grammars compatible with the
//     tree's morphology, by the seed, on its own stream — see chooseGrammar.
//
// Fruit carries accent colour that is CONCENTRATED (docs/BOTANICAL-DNA.md): few
// and large. V0's fruit was near-invisible at any size, so this is deliberately
// toy-scale — oversized, hung on the lower outside of the crown where fruit
// actually hangs and where it can be seen.
//
// Nothing here carries baked light: plain matte albedo, graded per environment
// state through the same `grade` hook as the foliage.

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { rr, lerp, clamp, smoothstep, noise3 } from './util.js';

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const UP = new THREE.Vector3(0, 1, 0);

/**
 * One petal. Local frame as for a leaf: base at the origin, length along +Y,
 * inner (upper) face toward +Z. Obovate — a narrow claw, widest past the
 * middle, a blunt rounded end — and cupped toward +Z both along and across.
 */
function petalGeometry(opts = {}) {
  const { length = 1, width = 0.8, cup = 0.3, rows = 4, wide = false } = opts;
  const cols = wide ? [-1, -0.5, 0, 0.5, 1] : [-1, 0, 1];
  const pos = [], tt = [], idx = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const w = width * 0.5 * Math.pow(Math.sin(Math.PI * Math.pow(t, 1.35)), 0.6);
    for (const u of cols) {
      const x = u * w * length;
      const z = cup * t * t * length + u * u * w * length * 0.4;
      pos.push(x, t * length, z);
      tt.push(t);
    }
  }
  const C = cols.length;
  for (let i = 0; i < rows; i++) for (let j = 0; j < C - 1; j++) {
    const a = i * C + j, b = a + C;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('petalT', new THREE.Float32BufferAttribute(tt, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Frame with +Y along `dir` and +Z turned toward `toward` (the flower's axis). */
function frame(dir, toward) {
  let face = toward.clone().sub(dir.clone().multiplyScalar(toward.dot(dir)));
  if (face.lengthSq() < 1e-4) face.set(1, 0, 0).sub(dir.clone().multiplyScalar(dir.x));
  face.normalize();
  const side = new THREE.Vector3().crossVectors(dir, face).normalize();
  return new THREE.Matrix4().makeBasis(side, dir, face);
}

/** Paint a petal: throat at the claw, the site's colour in the body, pale at the edge. */
function paintPetal(g, col, k = 1) {
  const T = g.attributes.petalT;
  const out = new Float32Array(T.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < T.count; i++) {
    const t = T.getX(i);
    c.copy(col.throat).lerp(col.body, smoothstep(0.0, 0.42, t)).lerp(col.edge, smoothstep(0.5, 1.0, t));
    c.multiplyScalar(k);
    out[i * 3] = c.r; out[i * 3 + 1] = c.g; out[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  g.deleteAttribute('petalT');
  return g;
}

function paintFlat(g, color) {
  const n = g.attributes.position.count;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { out[i * 3] = color.r; out[i * 3 + 1] = color.g; out[i * 3 + 2] = color.b; }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}

/**
 * The flower's centre. A round bright dot, concentric in a round dark disc, is
 * exactly how an EYE is drawn — and a canopy of dark blooms with round centres
 * read as dozens of eyes staring out of the tree (the human: "so fucking scary").
 * Colour alone does not cure that: a pale centre on a dark petal is still a pupil.
 * So the default centre is a small STAMEN STAR — five points, slightly domed —
 * which is a flower's centre and cannot be a pupil. `round` is kept for the A/B.
 */
function eyeGeometry(r, radius, shape = 'star') {
  if (shape === 'round') {
    const e = new THREE.SphereGeometry(radius, 7, 4);
    e.scale(1, 0.7, 1);
    e.translate(0, radius * 0.35, 0);
    return e;
  }
  const pts = 5, R = radius * 1.55, ri = radius * 0.62, hgt = radius * 0.7;
  const pos = [0, hgt, 0], idx = [];
  const a0 = r() * Math.PI * 2;
  for (let i = 0; i < pts * 2; i++) {
    const a = a0 + (i / (pts * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? R : ri;
    pos.push(Math.cos(a) * rad, i % 2 === 0 ? hgt * 0.15 : hgt * 0.45, Math.sin(a) * rad);
  }
  // Wound to face +Y (up the flower's axis): (centre, next, this).
  for (let i = 0; i < pts * 2; i++) idx.push(0, 1 + ((i + 1) % (pts * 2)), 1 + i);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * One flower: `petals` around an axis, `open` radians off it. Returns geometry
 * parts in the flower's own frame (+Y is the flower's axis, base at the origin).
 */
function flowerParts(r, col, o) {
  const parts = [];
  const axis = new THREE.Vector3(0, 1, 0);
  const whorl = (n, open, len, width, cup, phase, shade) => {
    for (let k = 0; k < n; k++) {
      const az = phase + (k / n) * Math.PI * 2 + rr(r, -0.12, 0.12);
      const pol = open + rr(r, -0.1, 0.1);
      const dir = new THREE.Vector3(Math.sin(pol) * Math.cos(az), Math.cos(pol), Math.sin(pol) * Math.sin(az));
      const g = petalGeometry({ length: len * rr(r, 0.9, 1.08), width, cup, rows: o.rows, wide: o.wide });
      g.applyMatrix4(frame(dir, axis));
      parts.push(paintPetal(g, col, shade * rr(r, 0.95, 1.04)));
    }
  };
  whorl(o.petals, o.open, o.length, o.width, o.cup, r() * 6.28, 1);
  if (o.inner) whorl(o.inner, o.open * 0.5, o.length * 0.86, o.width * 0.9, o.cup * 1.2, r() * 6.28, 0.94);
  if (o.eye > 0) parts.push(paintFlat(eyeGeometry(r, o.eye, col.eyeShape), col.eye));
  return parts;
}

const GRAMMARS = {
  // Open five-petalled flowers packed over a dome. The dome is the mass; the
  // flowers overlap, so the cluster is one pale mound and not nine separate discs.
  cluster(r, col, s) {
    const parts = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n;
      const pol = lerp(0.1, 1.45, Math.pow(f, 0.8));
      const az = i * GOLDEN + rr(r, -0.2, 0.2);
      const dir = new THREE.Vector3(Math.sin(pol) * Math.cos(az), Math.cos(pol), Math.sin(pol) * Math.sin(az));
      const m = frame(dir, UP).multiply(new THREE.Matrix4().makeRotationY(r() * 6.28));
      m.setPosition(dir.clone().multiplyScalar(0.2 * s).add(new THREE.Vector3(0, 0.05 * s, 0)));
      const ps = flowerParts(r, col, { petals: 5, open: 1.12, length: 0.2 * s * rr(r, 0.9, 1.1), width: 0.95, cup: 0.22, eye: 0.034 * s, rows: 4 });
      for (const p of ps) { p.applyMatrix4(m); parts.push(p); }
    }
    return { parts, centre: new THREE.Vector3(0, 0.02 * s, 0), hang: false };
  },

  // A few LARGE upright goblets: two whorls, barely open. The boldest grammar at
  // thumbnail size — one flower is nearly the size of a leaf.
  statement(r, col, s) {
    const parts = [];
    const n = r() < 0.45 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const az = i * (Math.PI * 2 / n) + rr(r, -0.4, 0.4);
      const pol = i === 0 ? rr(r, 0, 0.18) : rr(r, 0.55, 0.85);
      const dir = new THREE.Vector3(Math.sin(pol) * Math.cos(az), Math.cos(pol), Math.sin(pol) * Math.sin(az));
      const m = frame(dir, UP).multiply(new THREE.Matrix4().makeRotationY(r() * 6.28));
      m.setPosition(dir.clone().multiplyScalar((i === 0 ? 0.1 : 0.2) * s));
      const len = 0.44 * s * (i === 0 ? 1.08 : rr(r, 0.78, 0.95));
      const ps = flowerParts(r, col, { petals: 6, inner: 3, open: 0.62, length: len, width: 0.6, cup: 0.36, eye: 0.05 * s, rows: 6, wide: true });
      for (const p of ps) { p.applyMatrix4(m); parts.push(p); }
    }
    return { parts, centre: new THREE.Vector3(0, 0.2 * s, 0), hang: false };
  },

  // A hanging raceme. Built along +Y; the builder points +Y at the GROUND.
  // Open florets at the top, tapering to tight, deeper-coloured buds at the tip
  // — the taper is what makes it read as a raceme and not as a bottle-brush.
  pendant(r, col, s) {
    // First attempt was ONE thin raceme per site and read as a string of beads.
    // Pendant bloom hangs in bunches, and each raceme is a full column of overlapping
    // florets — so: three racemes of unequal length from one point, more and
    // larger florets, and buds that are a deeper tone of the SAME colour (the
    // throat colour made them maroon, which read as dead flowers).
    const parts = [];
    const bud = { throat: col.body, body: col.body.clone().lerp(col.throat, 0.35), edge: col.body, eye: col.eye, eyeShape: col.eyeShape };
    const spines = [];
    const count = 3;
    for (let k = 0; k < count; k++) {
      const len = (k === 0 ? 1.1 : rr(r, 0.62, 0.92)) * s;
      const a0 = k * 2.1 + r() * 0.6;
      const off = k === 0 ? 0 : 0.13 * s;
      const ox = Math.cos(a0) * off, oz = Math.sin(a0) * off;
      const n = Math.round(20 * (len / (1.1 * s)));
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1);
        const y = lerp(0.06, 1, Math.pow(f, 0.92)) * len;
        const az = i * GOLDEN + k;
        const lean = lerp(1.3, 0.75, f);      // florets splay at the top, close toward the tip
        const dir = new THREE.Vector3(Math.sin(lean) * Math.cos(az), Math.cos(lean), Math.sin(lean) * Math.sin(az));
        const m = frame(dir, UP);
        const rad = lerp(0.05, 0.01, f) * s;
        // The raceme sways out from the bunch as it drops.
        const sway = f * f * 0.12 * s * (k === 0 ? 0 : 1);
        m.setPosition(new THREE.Vector3(ox + Math.cos(a0) * sway + Math.cos(az) * rad, y, oz + Math.sin(a0) * sway + Math.sin(az) * rad));
        const size = lerp(0.25, 0.09, Math.pow(f, 0.85)) * s;
        const isBud = f > 0.7;
        const ps = flowerParts(r, isBud ? bud : col, { petals: 3, open: lerp(0.95, 0.4, f), length: size, width: 1.15, cup: 0.42, eye: 0, rows: 2 });
        for (const p of ps) { p.applyMatrix4(m); parts.push(p); }
      }
      spines.push({ len, ox, oz });
    }
    return { parts, centre: new THREE.Vector3(0, 0.5 * s, 0), hang: true, spine: 0 };
  },
};

export const BLOOM_GRAMMARS = Object.keys(GRAMMARS);

// The first names, kept ONLY so older render filenames and URLs stay readable.
export const LEGACY_GRAMMAR = { blossom: 'cluster', magnolia: 'statement', wisteria: 'pendant' };

/**
 * Which grammars can grow convincingly on which morphology. TASTE OWNS THIS
 * TABLE (ruling L2) and rules on it after looking at real geometry. `morphology`
 * has exactly one value today — 'broad', hardcoded in analysis — so the table
 * has one row; it is a real table anyway because it is the extension point.
 * `pendant` x `broad` is awaiting Taste's explicit ruling: if it is ruled out,
 * delete it from this row and pendant is dead code until a pendulous morphology.
 */
export const GRAMMAR_COMPAT = {
  broad: ['cluster', 'statement', 'pendant'],
};

export function compatibleGrammars(morphology) {
  return GRAMMAR_COMPAT[morphology] ?? GRAMMAR_COMPAT.broad;
}

/**
 * A stable index from the seed ALONE — its own stream. It must not advance any
 * shared RNG: if it did, adding or removing a grammar would re-roll every
 * downstream draw and every existing tree would change. Same seed (FNV-1a over
 * the domain) -> same grammar, always.
 */
export function stableIndex(seed, n, salt = 0x9e3779b9) {
  let h = ((seed >>> 0) ^ salt) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = (h ^ (h >>> 16)) >>> 0;
  return n > 0 ? h % n : 0;
}

export function chooseGrammar(morphology, seed) {
  const list = compatibleGrammars(morphology);
  return list[stableIndex(seed, list.length)];
}

/** Petal palette from the site's two colours. `grade` is the environment's. */
/**
 * `pale` — how far a petal lightens toward its edge — is a FUNCTION OF THE PETAL'S
 * OWN LIGHTNESS, not a constant (human ruling, 2026-09-20: "solid for only dark
 * colours and the gradient thingy for the lighter colours").
 *
 * It began as a constant 0.42, justified as buying VALUE contrast for cool
 * accents against canopy green. That was an overcorrection: it bought value by
 * destroying SATURATION, and against a mid-value green a solid deep blue already
 * differs in hue AND saturation AND value at once. On a dark petal the white
 * blend turned a deep saturated blue into a lavender smudge and the site's
 * colour stopped being recognisable. On a LIGHT petal the same edge is right —
 * solid pale pink reads flat and plasticky, like a poster.
 *
 * So the rule is physical rather than a legibility hack: the pale edge is a
 * HIGHLIGHT, and a highlight belongs on a light, thin, translucent surface. A
 * deep saturated petal does not catch light that way.
 *
 * KEEP IN SYNC: the ramp's dark end is PETAL_FLOOR = 0.40 in
 * analysis/lib/mapping.js — the darkest petal the pipeline can deliver — so
 * "solid" is exactly the floor case and there is no dead zone under it. If
 * PETAL_FLOOR moves, PALE_FROM moves with it. Taste owns the endpoints and curve.
 */
export const PALE_FROM = 0.40, PALE_TO = 0.70, PALE_MAX = 0.42;
export function paleFor(lightness) {
  return PALE_MAX * smoothstep(PALE_FROM, PALE_TO, lightness);
}

function flowerPalette(r, primary, secondary, opts) {
  const { lift = 0, grade = null } = opts;
  const body = new THREE.Color(primary);
  // Lightness is read BEFORE the per-variant jitter, so every variant of one
  // tree's bloom agrees about how solid it is.
  const petalL = body.getHSL({}).l;
  const pale = opts.pale ?? paleFor(petalL);
  body.offsetHSL(rr(r, -0.012, 0.012), 0, rr(r, -0.025, 0.025));
  if (lift > 0) {
    // DEBUG ONLY. Raising a dark accent's lightness is a standing ban (DECISIONS:
    // "bleaching dark accents" — for a dark accent the darkness IS the identity).
    const hsl = body.getHSL({});
    body.setHSL(hsl.h, hsl.s, Math.max(hsl.l, lerp(hsl.l, 0.66, lift)));
  }
  // THE CENTRE is the site's, not the renderer's. Analysis computes it on purpose
  // (mapping.js, CENTRE_GAP: driven away from the petal's lightness so the flower
  // reads at thumbnail size) and delivers it as `flowers.secondary`. The eye used
  // to be 82% hard-coded yellow whatever the site was — a blue site issued a
  // yellow eye it never earned, the renderer silently discarding meaning. Only
  // when NO centre arrives (the ?fc= debug path) is one derived here, from the
  // petal's own hue, pushed the same way the pipeline pushes it.
  let centre;
  if (secondary != null) centre = new THREE.Color(secondary);
  else {
    const h = body.getHSL({});
    centre = new THREE.Color().setHSL(h.h, h.s * 0.7, h.l < 0.55 ? Math.min(h.l + 0.35, 0.9) : Math.max(h.l - 0.35, 0.18));
  }
  // A small warm bias, so a centre reads as pollen rather than as paint. Taste's dial.
  const eye = centre.clone().lerp(new THREE.Color(0xf3cf5b), opts.eyeWarm ?? 0.14);
  // The claw: a deeper tone of the petal itself, with a hint of the centre only
  // where the petal is light enough to take a gradient. A dark petal stays solid.
  const throat = body.clone().offsetHSL(0, 0.03, -0.07).lerp(centre, 0.22 * (pale / PALE_MAX));
  const edge = body.clone().lerp(new THREE.Color(0xffffff), pale);
  for (const c of [body, throat, edge, eye]) if (grade) grade(c);
  return { body, throat, edge, eye, pale, petalL, eyeShape: opts.eyeShape ?? 'star' };
}

/** One cluster variant: merged, soft-normalled, double-faced. */
function flowerClusterGeometry(r, grammar, primary, secondary, opts) {
  const { size = 1, soft = 0.5 } = opts;
  const col = flowerPalette(r, primary, secondary, opts);
  const built = (GRAMMARS[grammar] || GRAMMARS.cluster)(r, col, size);
  if (built.spine) {
    const st = new THREE.CylinderGeometry(0.008 * size, 0.014 * size, built.spine, 4, 1, true);
    st.translate(0, built.spine / 2, 0);
    st.deleteAttribute('uv');
    const green = new THREE.Color(0x7fae4a);
    if (opts.grade) opts.grade(green);
    built.parts.push(paintFlat(st, green));
  }
  const g = BufferGeometryUtils.mergeGeometries(built.parts, false);

  // Shade the cluster as ONE soft form, exactly as the leaves do. `sky` is
  // which way the sky is in the cluster's own frame: a raceme is built hanging.
  const P = g.attributes.position, N = g.attributes.normal;
  const v = new THREE.Vector3(), n = new THREE.Vector3(), out = new THREE.Vector3();
  const sky = built.hang ? -0.3 : 0.3;
  for (let k = 0; k < P.count; k++) {
    v.fromBufferAttribute(P, k);
    n.fromBufferAttribute(N, k);
    out.copy(v).sub(built.centre);
    if (built.hang) out.y *= 0.25;         // a raceme is a column: outward is radial
    out.normalize();
    if (n.dot(out) < 0) n.negate();
    n.lerp(out, soft);
    n.y += sky;
    n.normalize();
    N.setXYZ(k, n.x, n.y, n.z);
  }
  const ix = Array.from(g.getIndex().array);
  const n0 = ix.length;
  for (let k = 0; k < n0; k += 3) ix.push(ix[k], ix[k + 2], ix[k + 1]);
  g.setIndex(ix);
  g.userData.hang = built.hang;
  g.userData.pale = col.pale;
  return g;
}

function matte(key) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, metalness: 0, side: THREE.FrontSide });
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_physical_fragment>',
      `#include <lights_physical_fragment>
       material.specularColor = vec3(0.0);
       material.specularF90 = 0.0;`
    );
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

function crownBox(spots) {
  const b = new THREE.Box3();
  for (const s of spots) b.expandByPoint(s.pos);
  const c = b.getCenter(new THREE.Vector3()), e = b.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  return { c, e };
}

/**
 * Which attachment points bloom. NOT a uniform sample: a low-frequency field
 * over the crown decides, so the bloom arrives in drifts — a flowering limb
 * here, a bare stretch there — and the chosen fraction is exact whatever the
 * field looks like. Outer, tip-ward sites are favoured: that is where a tree
 * flowers, and it is the only place a viewer can see it.
 */
export function pickSites(spots, r, opts = {}) {
  const { fraction = 0.3, freq = 0.42, outer = 0.5, low = 0, old = 0, field: fieldW = 1, strata = 0, exclude = null } = opts;
  if (!spots.length || fraction <= 0) return [];
  const { c, e } = crownBox(spots);
  const ox = r() * 50, oy = r() * 50, oz = r() * 50;
  let radMax = 1e-6;
  for (const s of spots) radMax = Math.max(radMax, s.rad ?? 0);
  const scored = [];
  spots.forEach((s, i) => {
    if (exclude && exclude.has(i)) return;
    const d = new THREE.Vector3((s.pos.x - c.x) / (e.x || 1), (s.pos.y - c.y) / (e.y || 1), (s.pos.z - c.z) / (e.z || 1));
    const field = noise3(s.pos.x * freq + ox, s.pos.y * freq + oy, s.pos.z * freq + oz);
    const score = fieldW * field + outer * d.length() + (s.tip ? 0.18 : 0) - low * d.y + old * ((s.rad ?? 0) / radMax) + rr(r, -0.08, 0.08);
    scored.push({ i, score });
  });
  const want = Math.max(1, Math.round(spots.length * fraction));
  if (!(strata > 1)) {
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, want).map((x) => x.i);
  }
  // STRATIFIED: the crown is cut into sectors of compass direction (and an upper
  // and lower band), and each takes its own share by score. Unstratified, a
  // 27% bloom could — and on the judged tree did — leave the whole camera-facing
  // side without a single flowering twig: debug view B showed the middle of the
  // frame empty of bloom, which no amount of foliage reduction can fix. The tree
  // is orbited, so EVERY side has to carry its share. Drifts survive inside a
  // sector; what is lost is only the chance of a side with nothing.
  const groups = new Map();
  for (const sIt of scored) {
    const s = spots[sIt.i];
    const az = Math.atan2(s.pos.z - c.z, s.pos.x - c.x);
    const k = (Math.floor(((az + Math.PI) / (2 * Math.PI)) * strata) % strata) * 2 + (s.pos.y > c.y ? 1 : 0);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(sIt);
  }
  const picked = [];
  const rest = [];
  for (const g of groups.values()) {
    g.sort((a, b) => b.score - a.score);
    const q = Math.floor(g.length * fraction);
    picked.push(...g.slice(0, q));
    rest.push(...g.slice(q).map((x, j) => ({ ...x, rank: j })));
  }
  // Largest-remainder top-up, best-scored first among each group's next-in-line.
  rest.sort((a, b) => (a.rank - b.rank) || (b.score - a.score));
  for (const x of rest) { if (picked.length >= want) break; picked.push(x); }
  return picked.slice(0, want).map((x) => x.i);
}

// How much of the crown blooms at each DNA amount. Exaggerated on purpose — the
// steps have to be different trees at thumbnail size, not degrees of one.
export const BLOOM_FRACTION = { none: 0, few: 0.1, medium: 0.33, abundant: 0.62 };

/**
 * L5 — bloom amount controls a FOLIAGE RELATIONSHIP, not just a count.
 *
 * The wreath (a green tree in a coloured outline) is OCCLUSION: the bloom is
 * evenly spread, and full-size leaf balls in front of it hide it everywhere but
 * the skyline. Moving the flowers was tried three times and is now banned
 * (DECISIONS D8.5). What changes instead is what the flowering twigs WEAR, and
 * the three amounts are three different relationships, not one number scaled:
 *
 *   few       the tree is in leaf; a few outer twigs carry touches of colour.
 *   medium    flowering twigs carry clearly reduced foliage, so bloom shows
 *             through the visible crown and not only on its edge.
 *   abundant  PEAK BLOOM, a different phase of the year: flowering twigs carry
 *             only a small tuft of emerging leaf, the rest of the tree is only
 *             part-way into leaf, and bloom is a major part of the crown's
 *             volume. Exposed wood between bloom clusters is correct and wanted.
 *
 * `atBloom` / `elsewhere` scale the leaf cluster on flowering / other twigs.
 * TASTE OWNS THESE NUMBERS (L4): the contract is the perceptual target at 140px.
 */
export const BLOOM_FOLIAGE = {
  none:     { atBloom: 1,    nearTo: 1,    nearRadius: 0,    elsewhere: 1,    outer: 0.65, field: 1 },
  // In leaf. Touches of colour on a few OUTER twigs; nothing else gives way.
  few:      { atBloom: 0.9,  nearTo: 1,    nearRadius: 0,    elsewhere: 1,    outer: 0.65, field: 1 },
  // A flowering LIMB, not a flowering twig: the foliage AROUND the bloom gives
  // way too. Reducing only the twig's own cluster was not enough — debug view C
  // showed its full-size NEIGHBOURS doing the hiding (they are 0.4 apart and
  // 0.55 across). Bloom also comes in off the rim, so it is there to be seen.
  medium:   { atBloom: 0.42, nearTo: 0.55, nearRadius: 1.1,  elsewhere: 0.88, outer: 0,    field: 0.8,  strata: 6 },
  // Peak bloom: the whole tree is in the phase. The field is nearly flat here —
  // with a strong one the 38% of twigs NOT flowering were one contiguous leafy
  // patch, which read as a second, green plant standing in a pink one.
  abundant: { atBloom: 0.26, nearTo: 0.5,  nearRadius: 0.8,  elsewhere: 0.72, outer: 0.1,  field: 0.35, strata: 6 },
};

/**
 * The leaf-cluster scale for every attachment point, given which of them bloom.
 * Flowering twig -> `atBloom`; a twig within `nearRadius` of one eases from
 * `nearTo` back up to `elsewhere`; the rest of the tree -> `elsewhere`.
 */
export function foliageScales(spots, bloomSites, rel) {
  const out = new Float32Array(spots.length).fill(rel.elsewhere);
  const bloom = bloomSites.map((i) => spots[i].pos);
  const on = new Set(bloomSites);
  for (let i = 0; i < spots.length; i++) {
    if (on.has(i)) { out[i] = rel.atBloom; continue; }
    if (!(rel.nearRadius > 0) || !bloom.length) continue;
    let d = Infinity;
    for (const b of bloom) d = Math.min(d, b.distanceTo(spots[i].pos));
    out[i] = lerp(Math.min(rel.nearTo, rel.elsewhere), rel.elsewhere, smoothstep(0.25 * rel.nearRadius, rel.nearRadius, d));
  }
  return out;
}

const lstar = (c) => 116 * Math.cbrt(Math.max(0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b, 1e-6)) - 16;

/**
 * L6 — LOCAL FOLIAGE CONTRAST ADAPTATION. We change the stage, never the subject.
 *
 * The website's colour is never repainted: maroon stays maroon, navy stays navy
 * (bleaching a dark accent preserves its hue exactly and destroys the colour —
 * for a dark accent the darkness IS the identity; DECISIONS, standing bans).
 * What adapts is the VALUE of the foliage right around a flowering twig:
 *
 *   flower darker than the leaves  -> nearby foliage somewhat LIGHTER. A dark
 *       bloom in mid-green reads as a HOLE in the canopy — a void, or damage —
 *       because dark-inside-green is what a gap looks like. On a paler ground its
 *       outline is a petal outline, and it reads as an object in front.
 *   flower lighter than the leaves -> nearby foliage somewhat DEEPER, the mirror
 *       case: near-white bloom on bright yellow-green washes out.
 *
 * Value only (an RGB multiply: chromaticity is untouched), local only (eased out
 * to nothing by `radius`; distant foliage is untouched — this is a stage, not a
 * grade). Returns a per-site multiplier for the leaf clusters' instance colour.
 */
export function foliageContrast(spots, bloomSites, opts = {}) {
  const {
    primary, secondary = null, pale = null, lift = 0, grade = null,
    greens = [0x86c440, 0xa6d84f, 0x63ad3a],
    radius = 0.85, lighten = 1.34, deepen = 0.72, strength = 1,   // 1.35 reached most of a medium crown: a grade, not a stage
  } = opts;
  const out = new Float32Array(spots.length).fill(1);
  if (!bloomSites.length || primary == null || !(strength > 0)) return { scale: out, target: 1, flowerL: 0, foliageL: 0 };
  const col = flowerPalette(() => 0.5, primary, secondary, { pale, lift, grade });
  const flowerL = lstar(col.body.clone().lerp(col.edge, 0.35));
  let foliageL = 0;
  for (const h of greens) { const c = new THREE.Color(h); if (grade) grade(c); foliageL += lstar(c) / greens.length; }
  const sep = flowerL - foliageL;
  // How hard to push: a flower far darker than the leaf gets the full lighten;
  // one only a little lighter gets a partial deepen. Nothing is ever pushed the
  // wrong way, and a flower sitting AT leaf value is pushed whichever way is
  // nearer its own side.
  const target = sep < 0
    ? lerp(1, lighten, smoothstep(2, 30, -sep))
    : lerp(1, deepen, smoothstep(2, 16, sep));
  const k = lerp(1, target, clamp(strength, 0, 1));
  const bloom = bloomSites.map((i) => spots[i].pos);
  for (let i = 0; i < spots.length; i++) {
    let d = Infinity;
    for (const b of bloom) d = Math.min(d, b.distanceTo(spots[i].pos));
    out[i] = lerp(k, 1, smoothstep(0.35 * radius, radius, d));
  }
  return { scale: out, target: k, flowerL: Math.round(flowerL), foliageL: Math.round(foliageL) };
}

/**
 * Which sites bloom, for a DNA amount. Separate from buildFlowers because the
 * LEAVES need the answer too: a twig that flowers carries a smaller leaf cluster.
 */
export function chooseBloomSites(spots, r, opts = {}) {
  const frac = opts.fraction ?? BLOOM_FRACTION[opts.amount] ?? 0;
  // A little bloom sits on the outermost twigs; a tree in FULL bloom flowers all
  // through. WHICH twigs flower is selection — it is not moving a flower.
  const rel = BLOOM_FOLIAGE[opts.amount] ?? BLOOM_FOLIAGE.medium;
  return pickSites(spots, r, { fraction: frac, outer: rel.outer, field: rel.field, strata: rel.strata ?? 0, exclude: opts.exclude ?? null });
}

/**
 * Flowers for one tree, on the leaves' own attachment points.
 * @returns {{group, stats, taken:Set<number>}}
 */
export function buildFlowers(spots, r, opts = {}) {
  const {
    grammar = 'cluster', amount = 'medium', fraction = null,
    primary = 0xf7a6b8, secondary = 0xe87b92,
    variants = 3, size = 1, grade = null, pale = null, lift = 0, soft = 0.5, eyeShape = 'star', eyeWarm = null,
    proud = 0.5,            // how far a bloom stands off its twig: the radius of the leaf ball under it
  } = opts;
  const t0 = performance.now();
  const group = new THREE.Group();
  const chosen = opts.sites ?? chooseBloomSites(spots, r, { amount, fraction });
  const taken = new Set(chosen);
  if (!chosen.length || primary == null) return { group, taken: new Set(), stats: { clusters: 0, triangles: 0, ms: 0 } };

  const geos = [];
  for (let v = 0; v < variants; v++) geos.push(flowerClusterGeometry(r, grammar, primary, secondary, { size, grade, pale, lift, soft, eyeShape, eyeWarm }));
  const hang = !!geos[0].userData.hang;
  // How far off the twig a bloom is SEATED, as a share of `proud`. A cluster is a
  // broad dome and beds into the leaf tuft under it; a statement flower has a
  // narrow base, and stood off by the same distance it visibly FLOATED — a goblet
  // hanging in the sky past the end of its twig. It sits on the wood.
  const seat = { cluster: 1, statement: 0.25, pendant: 1 }[grammar] ?? 1;
  const mat = matte('flower-matte-v1');

  const buckets = geos.map(() => []);
  chosen.forEach((si, k) => buckets[k % variants].push(spots[si]));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion();
  const sc = new THREE.Vector3(), p = new THREE.Vector3(), ax = new THREE.Vector3(), radial = new THREE.Vector3(), tint = new THREE.Color();
  const box = crownBox(spots);
  let triangles = 0;
  geos.forEach((geo, v) => {
    const items = buckets[v];
    if (!items.length) return;
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
    items.forEach((sp, i) => {
      const outward = new THREE.Vector3(sp.pos.x, 0, sp.pos.z);
      if (outward.lengthSq() > 1e-6) outward.normalize();
      if (hang) {
        // Hangs from the underside of the leaf cluster, a touch outward so it
        // drops down the OUTSIDE of the crown rather than into it.
        ax.set(0, -1, 0).addScaledVector(outward, 0.12).normalize();
        p.copy(sp.pos).addScaledVector(outward, 0.16 * sp.scale).addScaledVector(UP, -0.02);
      } else {
        // Sits proud of the leaf ball on the crown's OUTER SURFACE — pushed along
        // the radius from the crown's centre, not up the twig. Up-the-twig put
        // every bloom on the sky side of its leaf ball: visible on the skyline,
        // hidden everywhere else, so the bloom ringed the silhouette and left the
        // face of the crown plain green.
        radial.copy(sp.pos).sub(box.c).normalize();
        ax.copy(radial).multiplyScalar(0.8).addScaledVector(sp.axis, 0.45).normalize();
        p.copy(sp.pos).addScaledVector(ax, proud * seat * sp.scale);   // the leaf ball's own radius: ON it, not in it
      }
      q.setFromUnitVectors(UP, ax);
      q2.setFromAxisAngle(ax, r() * Math.PI * 2);
      q.premultiply(q2);
      sc.setScalar(sp.scale * rr(r, 0.9, 1.12));
      im.setMatrixAt(i, m.compose(p, q, sc));
      const k = rr(r, 0.94, 1.05);
      im.setColorAt(i, tint.setRGB(k, k, k));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    group.add(im);
    triangles += (geo.index.count / 3) * items.length;
  });
  return {
    group, taken,
    stats: { grammar, pale: +(geos[0].userData.pale ?? 0).toFixed(2), clusters: chosen.length, triangles: Math.round(triangles), drawCalls: group.children.length, ms: Math.round(performance.now() - t0) },
  };
}

/** One fruit: a lathed pome — broad shoulders, a sunk calyx, a dimpled base. */
function fruitGeometry(r, color, opts) {
  const { radius = 0.16, grade = null } = opts;
  const pts = [];
  const N = 11;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI;
    let x = Math.sin(a) * (1 + 0.1 * Math.sin(a));
    let y = -Math.cos(a) * 0.98;
    x *= lerp(0.9, 1.07, (y + 0.98) / 1.96);
    y += 0.16 * Math.exp(-Math.pow(x / 0.34, 2)) * (a < Math.PI / 2 ? 1 : -1.35);
    pts.push(new THREE.Vector2(Math.max(x, 0.0001) * radius, y * radius));
  }
  const body = new THREE.LatheGeometry(pts, 10);
  body.deleteAttribute('uv');
  body.computeVertexNormals();
  const base = new THREE.Color(color);
  const blush = base.clone().offsetHSL(0.035, -0.04, 0.13);
  const deep = base.clone().offsetHSL(-0.01, 0.04, -0.1);
  const stalkC = new THREE.Color(0x6e5138);
  for (const c of [base, blush, deep, stalkC]) if (grade) grade(c);
  const P = body.attributes.position, Nn = body.attributes.normal;
  const col = new Float32Array(P.count * 3), c = new THREE.Color();
  const bd = r() * 6.28;
  for (let i = 0; i < P.count; i++) {
    const y = P.getY(i) / radius;
    // A blush on one cheek and a deeper tone underneath: not one flat swatch.
    const cheek = 0.5 + 0.5 * (Nn.getX(i) * Math.cos(bd) + Nn.getZ(i) * Math.sin(bd));
    c.copy(deep).lerp(base, smoothstep(-0.9, 0.1, y)).lerp(blush, cheek * 0.55 * smoothstep(-0.3, 0.7, y));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  body.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stalk = new THREE.CylinderGeometry(radius * 0.06, radius * 0.09, radius * 1.5, 5, 1, false);
  stalk.translate(0, radius * (0.72 + 0.75), 0);
  paintFlat(stalk, stalkC);
  return BufferGeometryUtils.mergeGeometries([body, stalk], false);
}

/**
 * L11 — flowers and fruit COEXIST when the site earns both; a measured trait is
 * never deleted because composition is inconvenient. They are kept apart the way
 * a tree keeps them apart:
 *   fruit   hangs LOW, on the OLDER, heavier wood (`old` favours thick twigs);
 *   bloom   is on the fine new growth, toward the tips;
 *   and the twigs right around a fruiting site do not flower at all, so each
 *   fruit hangs in its own clearing of plain leaf instead of inside a bouquet.
 * Fruit is chosen FIRST; `bloomExclusion` is what the flowers must then avoid.
 */
export function chooseFruitSites(spots, r, opts = {}) {
  const { sites = 22, exclude = null } = opts;
  return pickSites(spots, r, { fraction: Math.min(1, sites / spots.length), freq: 0.6, outer: 0.6, low: 0.45, old: 0.5, field: 0.4, strata: 6, exclude });
}

export function bloomExclusion(spots, fruitSites, radius = 0.75) {
  const out = new Set(fruitSites);
  for (let i = 0; i < spots.length; i++) {
    if (out.has(i)) continue;
    for (const f of fruitSites) if (spots[f].pos.distanceTo(spots[i].pos) < radius) { out.add(i); break; }
  }
  return out;
}

/**
 * Fruit: few, LARGE, in ones and twos and threes, hung on the lower outside of
 * the crown. `exclude` keeps it off the sites that are flowering.
 */
export function buildFruit(spots, r, opts = {}) {
  const { color = 0xd8452f, sites = 22, radius = 0.16, grade = null, exclude = null } = opts;
  const t0 = performance.now();
  const group = new THREE.Group();
  if (!spots.length || color == null) return { group, stats: { fruit: 0, triangles: 0, ms: 0 } };
  const chosen = opts.chosen ?? chooseFruitSites(spots, r, { sites, exclude });
  const variants = 3;
  const geos = [];
  for (let v = 0; v < variants; v++) geos.push(fruitGeometry(r, color, { radius, grade }));
  const places = [];
  for (const si of chosen) {
    const sp = spots[si];
    const outward = new THREE.Vector3(sp.pos.x, 0, sp.pos.z);
    if (outward.lengthSq() > 1e-6) outward.normalize();
    const n = r() < 0.3 ? 1 : r() < 0.65 ? 2 : 3;
    const side = new THREE.Vector3().crossVectors(outward, UP).normalize();
    for (let k = 0; k < n; k++) {
      const pos = sp.pos.clone()
        .addScaledVector(outward, (0.3 + 0.06 * k) * sp.scale)
        .addScaledVector(UP, -(0.3 + rr(r, 0, 0.16) + 0.1 * k))
        .addScaledVector(side, (k - (n - 1) / 2) * radius * 1.7);
      places.push({ pos, scale: rr(r, 0.86, 1.14) });
    }
  }
  const mat = matte('fruit-matte-v1');
  const buckets = geos.map(() => []);
  places.forEach((pl, i) => buckets[i % variants].push(pl));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
  let triangles = 0;
  geos.forEach((geo, v) => {
    const items = buckets[v];
    if (!items.length) return;
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
    items.forEach((pl, i) => {
      q.setFromEuler(e.set(rr(r, -0.22, 0.22), r() * 6.28, rr(r, -0.22, 0.22)));
      im.setMatrixAt(i, m.compose(pl.pos, q, sc.setScalar(pl.scale)));
    });
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
    triangles += (geo.index.count / 3) * items.length;
  });
  return { group, stats: { fruit: places.length, sites: chosen.length, triangles: Math.round(triangles), drawCalls: group.children.length, ms: Math.round(performance.now() - t0) } };
}


// ---------------------------------------------------------------------------
// WINTER (ruling L8). Winter used to express nothing of the website: analysis
// sends it `flowers: none`, so the site's colour never reached a winter tree.
// The colour enters through living botanical detail (L7) — never bark, never
// soil — and winter gets its own two carriers:
//
//   site has the fruit trait  -> PERSISTENT BERRIES, bunches that hung on after
//                                the leaves went;
//   no fruit trait            -> accent-coloured BUDS on terminal and lateral
//                                twigs: next year's growth, already coloured.
//
// "Bare is the absence of styling; winter is the presence of restraint." Both
// are built; Taste rules. Sizes are a little exaggerated for 140px on purpose.
// ---------------------------------------------------------------------------

/** One bud: a pointed ovoid, brown bud-scales at the base, the site's colour swelling out of them. */
function budGeometry(r, col, scaleCol, opts = {}) {
  const { length = 0.26, width = 0.07 } = opts;
  const pts = [];
  const N = 7;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const rad = width * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.85);
    pts.push(new THREE.Vector2(Math.max(rad, 0.0002), t * length));
  }
  const g = new THREE.LatheGeometry(pts, 7);
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  const P = g.attributes.position, out = new Float32Array(P.count * 3), c = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    const t = P.getY(i) / length;
    c.copy(scaleCol).lerp(col.body, smoothstep(0.16, 0.42, t)).lerp(col.edge, smoothstep(0.62, 1, t) * 0.55);
    out[i * 3] = c.r; out[i * 3 + 1] = c.g; out[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return g;
}

/** A bud SPRAY: one leading bud and a few smaller ones splayed round it. `terminal` sprays are fuller. */
function budSprayGeometry(r, col, scaleCol, terminal, size) {
  const parts = [];
  const lead = budGeometry(r, col, scaleCol, { length: (terminal ? 0.34 : 0.24) * size, width: (terminal ? 0.088 : 0.07) * size });
  parts.push(lead);
  const n = terminal ? 3 + Math.floor(r() * 2) : 1 + Math.floor(r() * 2);
  for (let k = 0; k < n; k++) {
    const az = (k / n) * Math.PI * 2 + r() * 0.8;
    const pol = rr(r, 0.55, 0.95);
    const dir = new THREE.Vector3(Math.sin(pol) * Math.cos(az), Math.cos(pol), Math.sin(pol) * Math.sin(az));
    const g = budGeometry(r, col, scaleCol, { length: rr(r, 0.17, 0.24) * size, width: rr(r, 0.055, 0.07) * size });
    const m = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir));
    m.setPosition(0, -rr(r, 0.0, 0.05) * size, 0);
    g.applyMatrix4(m);
    parts.push(g);
  }
  return BufferGeometryUtils.mergeGeometries(parts, false);
}

/** Winter carrier 1: accent-coloured buds on every twig — terminal sprays at the tips, lateral pairs along the wood. */
export function buildBuds(spots, r, opts = {}) {
  const { primary = 0xf7a6b8, secondary = null, grade = null, size = 1, pale = null } = opts;
  const t0 = performance.now();
  const group = new THREE.Group();
  if (!spots.length || primary == null) return { group, stats: { buds: 0, triangles: 0, ms: 0 } };
  const col = flowerPalette(r, primary, secondary, { pale, grade });
  const scaleCol = new THREE.Color(0x7b5b40);
  if (grade) grade(scaleCol);
  const mat = matte('bud-matte-v1');
  const sets = [
    { terminal: true, items: spots.filter((s) => s.tip) },
    { terminal: false, items: spots.filter((s) => !s.tip) },
  ];
  let triangles = 0, count = 0;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), ax = new THREE.Vector3();
  for (const set of sets) {
    const variants = 3;
    const geos = Array.from({ length: variants }, () => budSprayGeometry(r, col, scaleCol, set.terminal, size));
    const buckets = geos.map(() => []);
    set.items.forEach((s, i) => buckets[i % variants].push(s));
    geos.forEach((geo, v) => {
      const items = buckets[v];
      if (!items.length) return;
      const im = new THREE.InstancedMesh(geo, mat, items.length);
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
      items.forEach((sp, i) => {
        // The leaf attachment sits a leaf-ball's offset off the wood; a bud sits ON it.
        ax.copy(sp.axis);
        p.copy(sp.pos);
        if (!sp.tip) p.addScaledVector(sp.axis, -0.04);
        q.setFromUnitVectors(UP, ax);
        q2.setFromAxisAngle(ax, r() * Math.PI * 2);
        q.premultiply(q2);
        im.setMatrixAt(i, m.compose(p, q, sc.setScalar(rr(r, 0.88, 1.15))));
      });
      im.instanceMatrix.needsUpdate = true;
      group.add(im);
      triangles += (geo.index.count / 3) * items.length;
      count += items.length;
    });
  }
  return { group, stats: { carrier: 'buds', sprays: count, triangles: Math.round(triangles), drawCalls: group.children.length, ms: Math.round(performance.now() - t0) } };
}

/** A bunch of persistent berries: a loose drooping corymb on fine stalks. */
function berryBunchGeometry(r, color, opts) {
  const { radius = 0.062, grade = null, size = 1 } = opts;
  const base = new THREE.Color(color);
  const hi = base.clone().offsetHSL(0.02, -0.03, 0.12);
  const lo = base.clone().offsetHSL(-0.01, 0.03, -0.12);
  const stalkC = new THREE.Color(0x6e5138);
  for (const c of [base, hi, lo, stalkC]) if (grade) grade(c);
  const parts = [];
  const n = 7 + Math.floor(r() * 4);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n;
    const pol = lerp(0.2, 1.25, Math.pow(f, 0.8));
    const az = i * GOLDEN + rr(r, -0.3, 0.3);
    // Built hanging: -Y is down the bunch.
    const dir = new THREE.Vector3(Math.sin(pol) * Math.cos(az), -Math.cos(pol), Math.sin(pol) * Math.sin(az));
    const len = rr(r, 0.13, 0.22) * size;
    const rad = radius * size * rr(r, 0.85, 1.15);
    const end = dir.clone().multiplyScalar(len);
    const b = new THREE.SphereGeometry(rad, 8, 6);
    b.deleteAttribute('uv');
    const P = b.attributes.position, col = new Float32Array(P.count * 3);
    for (let k = 0; k < P.count; k++) {
      const y = P.getY(k) / rad;
      c.copy(lo).lerp(base, smoothstep(-1, 0, y)).lerp(hi, smoothstep(0.1, 1, y) * 0.7);
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    b.setAttribute('color', new THREE.BufferAttribute(col, 3));
    b.translate(end.x, end.y, end.z);
    parts.push(b);
    const st = new THREE.CylinderGeometry(0.006 * size, 0.009 * size, len, 4, 1, true);
    st.deleteAttribute('uv');
    st.translate(0, len / 2, 0);
    st.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir)));
    parts.push(paintFlat(st, stalkC));
  }
  return BufferGeometryUtils.mergeGeometries(parts, false);
}

/** Winter carrier 2: persistent berries, where the site has the fruit trait. */
export function buildBerries(spots, r, opts = {}) {
  const { color = 0xd8452f, grade = null, fraction = 0.42, size = 1 } = opts;
  const t0 = performance.now();
  const group = new THREE.Group();
  if (!spots.length || color == null) return { group, stats: { bunches: 0, triangles: 0, ms: 0 } };
  const chosen = pickSites(spots, r, { fraction, freq: 0.5, outer: 0.25, low: 0.1, field: 0.7, strata: 6 });
  const variants = 3;
  const geos = Array.from({ length: variants }, () => berryBunchGeometry(r, color, { grade, size }));
  const mat = matte('berry-matte-v1');
  const buckets = geos.map(() => []);
  chosen.forEach((si, k) => buckets[k % variants].push(spots[si]));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  let triangles = 0;
  geos.forEach((geo, v) => {
    const items = buckets[v];
    if (!items.length) return;
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
    items.forEach((sp, i) => {
      q.setFromEuler(e.set(rr(r, -0.25, 0.25), r() * 6.28, rr(r, -0.25, 0.25)));
      p.copy(sp.pos);
      if (!sp.tip) p.addScaledVector(sp.axis, -0.04);
      im.setMatrixAt(i, m.compose(p, q, sc.setScalar(sp.scale * rr(r, 0.9, 1.15))));
    });
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
    triangles += (geo.index.count / 3) * items.length;
  });
  return { group, stats: { carrier: 'berries', bunches: chosen.length, triangles: Math.round(triangles), drawCalls: group.children.length, ms: Math.round(performance.now() - t0) } };
}
