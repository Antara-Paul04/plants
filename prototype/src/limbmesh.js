// Meshing a skeleton into limbs.
//
// The structure decides whether a tree is plausible; THIS file and bark.js
// decide whether it looks expensive. "Low-poly" is mostly a SURFACE reading,
// not a triangle count: a structurally excellent tree with flat colour and
// twelve-sided limbs looks like a game asset however good its branching is.
//
// What this file contributes to not looking like one:
//
//   1. ROUND LIMBS. Enough radial resolution that no silhouette shows facets.
//      The budget is spent where the radius is; twigs stay cheap.
//
//   2. JUNCTIONS. A branch collar is a MUTUAL swelling — trunk wood envelops
//      the branch base — so the parent bulges where the child leaves and the
//      child flares into it. Flaring only the child looks glued on.
//
//   3. SCULPTED, NOT TEXTURED. The surface language is smooth and clay-like
//      (human direction, with a reference: a warm light-tan trunk carrying only
//      broad soft grooves, matte, never polished wood — see docs/TASTE.md). Broad
//      soft grooves are low-frequency enough to BE geometry, so they are real
//      displacement here and are shaded by true normals. There is no bump map:
//      a sculpted surface reads as clay, a texture of one reads as a texture.
//
//   4. NO SEAM, NO MIRROR, NO TILE — by construction. Grooves are a sum of
//      cosines at INTEGER frequencies around the limb, so they close exactly,
//      with phases that drift along the limb so they wander and never repeat.
//      A smooth surface hides less than a busy one, so this matters more now.

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { lerp, clamp, smoothstep, rr, noise3 } from './util.js';

/** Radial resolution, spent where the radius actually is on screen. */
function radialFor(radius) {
  if (radius > 0.16) return 56;
  if (radius > 0.075) return 36;
  if (radius > 0.03) return 22;
  if (radius > 0.012) return 12;
  return 10;
}

/** Ring spacing along the limb, likewise. */
function stepFor(radius) {
  if (radius > 0.16) return 0.028;
  if (radius > 0.075) return 0.036;
  if (radius > 0.03) return 0.05;
  return 0.07;
}

/**
 * Broad soft grooves running with the grain. Returns 0 on the ridge, 1 in the
 * bottom of a groove.
 *
 * Periodic in theta by construction (integer frequencies), so the ring closes
 * exactly — no seam. The phases drift slowly with arc length, so grooves wander,
 * merge and fade rather than running rule-straight, and nothing repeats.
 */
function groove(theta, z, seed) {
  const p1 = noise3(z * 0.42, seed, 1.7) * 2.6;
  const p2 = noise3(z * 0.55, seed, 9.1) * 2.6;
  const p3 = noise3(z * 0.7, seed, 23.4) * 2.6;
  let v = 0.5 * Math.cos(8 * theta + p1)
        + 0.32 * Math.cos(13 * theta + p2 + 1.3)
        + 0.18 * Math.cos(19 * theta + p3 + 4.1);
  // Grooves come and go along the limb; a groove that never stops is a flute
  // on a column, and that is architecture, not a tree.
  v *= 0.6 + 0.4 * noise3(z * 0.8, seed + 40, 5.5);
  return smoothstep(0.05, -0.62, v);
}

/**
 * Where the NODES are along a shoot — the slight swellings where buds and
 * leaves attach. A smooth tapering tube is a tentacle; a shoot has joints.
 *
 * bark.js evaluates this same function on the same coordinate (arc length plus
 * the limb's offset), so the ring the shader darkens sits exactly on the
 * swelling the mesh raises. The jitter is a golden-ratio sequence rather than a
 * sin-hash on purpose: it has to give the same answer in float64 here and in
 * float32 on the GPU, and sin-hashes do not.
 */
export const NODE_SPACING = 0.21;
export function nodePulse(z) {
  const u = z / NODE_SPACING;
  const cell = Math.floor(u);
  const f0 = 0.3 + 0.4 * ((cell * 0.618034) % 1 + 1) % 1;
  const d = (u - cell - f0) / 0.075;
  return Math.exp(-d * d);
}

/**
 * Sweep one limb.
 *
 * `collarAt` is a list of { t, r } attachments in the limb's own parameter
 * space — where a child leaves and the parent therefore has to thicken.
 */
function sweepLimb(pts, radii, opts = {}) {
  const {
    seed = 0,
    collarAt = [],
    rootFlare = 0,
    baseBlend = 0,      // flare INTO the parent at t=0
    // Terminal limbs taper to effectively nothing. A tree whose every shoot
    // ends in a flat disc reads as PRUNED — managed rather than grown.
    terminal = false,
    forkShade = 0,      // occlusion in the crotch where this limb leaves its parent
    leadIn = 0,         // arc length hidden inside the parent before the union
  } = opts;

  // Centripetal avoids the cusps and overshoot plain catmull-rom produces on
  // sparse, sharply-turning control points — which is what curled limb tips.
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const length = curve.getLength();
  const rMax = Math.max(...radii);
  const steps = clamp(Math.round(length / stepFor(rMax)), 8, 260);
  const radial = radialFor(rMax);
  const frames = curve.computeFrenetFrames(steps, false);

  const pos = [], col = [], grooveAttr = [], barkR = [], idx = [];
  const _o = new THREE.Vector3();
  const zOff = seed * 3.7; // de-correlate the bark pattern from limb to limb

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const c = curve.getPointAt(t);
    const N = frames.normals[Math.min(i, steps - 1)];
    const B = frames.binormals[Math.min(i, steps - 1)];
    const arc = t * length;

    // Radius interpolated along the chain the skeleton actually produced.
    const f = t * (radii.length - 1);
    const i0 = Math.floor(f);
    let rad = lerp(radii[i0], radii[Math.min(i0 + 1, radii.length - 1)], f - i0);

    // --- collar ----------------------------------------------------------
    // Width scales with the CHILD's radius: a twig barely disturbs a trunk,
    // a major limb visibly deforms it. Capped as a fraction of the limb's own
    // radius — an unbounded sum turned the trunk top into a knot of lumps.
    let bulge = 0;
    for (const a of collarAt) {
      const w = clamp(a.r * 5.0 / Math.max(length, 1e-4), 0.04, 0.4);
      const d = (t - a.t) / w;
      bulge += a.r * 0.5 * Math.exp(-d * d);
    }
    rad += Math.min(bulge, rad * 0.24);

    if (baseBlend > 0) rad *= 1 + baseBlend * Math.exp(-t * 14);
    // A shoot holds its diameter and ends in a BUD. Tapering over a fraction
    // of the limb's length made long shoots into needles and, earlier, every
    // shoot into a cone — a tree covered in cones is a thorn bush. So the end
    // is shaped in WORLD units from the tip: a short narrowing, a small ovoid
    // bud, then closed to a point.
    if (terminal) {
      const toTip = length - arc;
      rad *= 0.5 + 0.5 * smoothstep(0.0, 0.16, toTip);
      const bd = (toTip - 0.034) / 0.026;
      rad *= 1 + 1.15 * Math.exp(-bd * bd);
      rad *= smoothstep(0.0, 0.014, toTip);
    }

    // Nodes: young wood swells slightly where buds and leaves attach.
    const young = 1 - smoothstep(0.01, 0.034, rad);
    if (young > 0) rad *= 1 + 0.12 * young * nodePulse(arc + zOff);

    // Root buttress, in WORLD height above the turf rather than as a fraction
    // of the limb (the trunk limb now runs to the top of the tree, so a
    // fraction of it is metres). The target is a smooth FLOWING buttress: the
    // whole base swells, and a few broad roots run out of it into the ground.
    const above = Math.max(0, c.y - 0.14);
    const flare = rootFlare > 0 ? Math.exp(-above / 0.36) : 0;

    // Groove depth scales with the wood: broad and visible on the trunk, gone
    // on thin limbs, which stay smooth.
    // Deep enough to MODEL under soft light. At the first attempt they were so
    // shallow that an evenly lit trunk was a featureless column: soft light
    // needs more form to work with, not less.
    const grooveDepth = clamp((rad - 0.018) * 0.17, 0, 0.05);

    // Occlusion, carried as vertex colour and multiplied into the bark:
    // the base darkens into the ground, and crotches are shaded where a limb
    // leaves its parent. Neither is light the rig can find on its own.
    const crotch = 1 - forkShade * Math.exp(-Math.max(0, arc - leadIn) * 7);

    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      // Coherent drift, not per-ring noise: the SAME wobble shape slides along
      // the limb, which is what makes a cross-section read as wood. Integer
      // multipliers only — a non-integer one does not close the ring and
      // leaves a crease the full length of the limb.
      const wob =
        1 +
        0.07 * Math.sin(3 * a + seed + t * 1.6) +
        0.04 * Math.sin(5 * a - seed * 1.7 + t * 2.4) +
        0.022 * Math.sin(7 * a + seed * 0.6 - t * 1.2);
      // Five broad roots at uneven spacing (integer frequencies keep the ring
      // closed). The overall swell is gentle; the roots carry the character.
      let butt = 0;
      if (flare > 0) {
        const roots = 0.5 + 0.5 * Math.cos(5 * a + seed);
        const uneven = 0.75 + 0.25 * Math.cos(2 * a + seed * 1.9);
        butt = flare * 0.34 + Math.pow(flare, 1.6) * 0.95 * Math.pow(roots, 2.2) * uneven;
      }
      const base = rad * wob * (1 + butt);

      const gv = grooveDepth > 0 ? groove(a, arc + zOff, seed) : 0;
      const rr_ = base - gv * grooveDepth;

      _o.set(0, 0, 0).addScaledVector(N, ca * rr_).addScaledVector(B, sa * rr_);
      const px = c.x + _o.x, py = c.y + _o.y, pz = c.z + _o.z;
      pos.push(px, py, pz);
      grooveAttr.push(gv * clamp(grooveDepth / 0.02, 0, 1));
      barkR.push(rad);

      const low = 1 - smoothstep(-0.05, 0.6, py);
      const tuck = 1 - smoothstep(0.3, 1.0, Math.hypot(px, pz));
      const ground = 1 - clamp(low * lerp(0.45, 1, tuck), 0, 1) * 0.42;
      const ao = ground * crotch;
      col.push(ao, ao, ao);
    }
  }

  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      // WINDING. Rings advance N -> B and three's Frenet frames have
      // B = T x N, so (a, b, a+1) has normal T x phi, which points INWARD.
      // That order was inherited from tree.js and it rendered the entire tree
      // inside-out: what was on screen was the inner face of each tube's far
      // wall. Under flat colour a convex tube looks the same either way, which
      // is how it survived — but anything INSIDE a limb (base caps, hidden
      // lead-ins) showed straight through, and every junction looked like
      // tubes passing through each other. Measured: 1000 of 1000 trunk
      // triangles faced inward. Outward is (a, a+1, b).
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  // Cap BOTH ends. three.js renders back faces into the shadow map for
  // front-side materials, which only cancels self-shadowing on a CLOSED solid —
  // open-ended limbs break out in shadow acne exactly at the junctions.
  const ring = radial + 1;
  const tipP = curve.getPointAt(1);
  const ti = pos.length / 3;
  pos.push(tipP.x, tipP.y, tipP.z); grooveAttr.push(0); barkR.push(0); col.push(1, 1, 1);
  for (let j = 0; j < radial; j++) idx.push(steps * ring + j, steps * ring + j + 1, ti);   // faces +T

  const baseP = curve.getPointAt(0);
  const bi = pos.length / 3;
  pos.push(baseP.x, baseP.y, baseP.z); grooveAttr.push(0); barkR.push(radii[0]); col.push(1, 1, 1);
  for (let j = 0; j < radial; j++) idx.push(j, bi, j + 1);                                  // faces -T

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('groove', new THREE.Float32BufferAttribute(grooveAttr, 1));
  g.setAttribute('barkR', new THREE.Float32BufferAttribute(barkR, 1));
  g.setIndex(idx);
  g.computeVertexNormals();

  // Close the normal seam. Each ring's first and last vertices coincide in
  // space but are separate vertices, so computeVertexNormals gives them
  // different normals and a lit crease runs the whole length of the limb.
  const nor = g.attributes.normal;
  for (let i = 0; i <= steps; i++) {
    const a = i * ring, b = i * ring + radial;
    const nx = nor.getX(a) + nor.getX(b), ny = nor.getY(a) + nor.getY(b), nz = nor.getZ(a) + nor.getZ(b);
    const l = Math.hypot(nx, ny, nz) || 1;
    nor.setXYZ(a, nx / l, ny / l, nz / l);
    nor.setXYZ(b, nx / l, ny / l, nz / l);
  }
  return g;
}

/**
 * Mesh a whole skeleton.
 *
 * Children are started INSIDE their parent and flared, and the parent is bulged
 * where they leave. Those two have to be done together: either alone looks
 * worse than neither.
 */
export function buildLimbs(limbs, r, opts = {}) {
  const geos = [];
  let limbNo = 0;
  for (const L of limbs) {
    const chain = L.chain;
    if (chain.length < 2) continue;
    // Limbs arrive parent-first, so a skipped limb takes its whole subtree with
    // it — otherwise its children are meshed hanging in mid-air.
    if (L.parentLimb && L.parentLimb.skipped) { L.skipped = true; continue; }

    const pts = chain.map((n) => n.pos.clone());
    const radii = chain.map((n) => n.r);
    const last = chain.length - 1;

    // Da Vinci's rule drops the radius ACROSS A FORK, i.e. within one segment:
    // 0.287 to 0.228 over 0.17 units at the first union, which meshes as a
    // shelf running round the trunk. Wood does not do that — the taper through
    // a union is spread over the length of the union. Relaxing the radii along
    // the chain keeps every fork's totals while turning the step into a slope.
    for (let pass = 0; pass < 4; pass++) {
      const prev = radii.slice();
      for (let i = 1; i < last; i++) radii[i] = prev[i - 1] * 0.25 + prev[i] * 0.5 + prev[i + 1] * 0.25;
    }

    let baseBlend = 0, forkShade = 0, leadIn = 0, lead = 0;
    if (L.parentLimb) {
      const host = L.parentLimb.chain[L.parentIndex];
      // Start the child INSIDE the parent, running along the PARENT'S OWN AXIS
      // for one segment before it curves out.
      //
      // Two earlier constructions both failed once a real material was on:
      // backing the start off past the axis put the base cap on the far surface
      // of the trunk, and starting on the axis still left a flared base disc
      // that, at a major fork, is simply WIDER than the parent and pokes out of
      // both sides as a cobbled plate. Flat colour had been hiding both.
      //
      // Along the parent's axis the hidden stretch cannot escape: da Vinci's
      // rule makes every child thinner than its parent, so a child-radius tube
      // on the parent's centreline is always buried. It is also how a real
      // union is built — the branch flows out of the parent, it is not stuck on.
      const hostPrev = L.parentIndex > 0 ? L.parentLimb.chain[L.parentIndex - 1] : host.parent;
      // PREPEND the lead-in; never replace the limb's own first node. Replacing
      // it took that node off this limb's meshed path, so any grandchild that
      // attached near the start ran its "hidden" lead-in through a point that
      // was now outside its parent — sawn-off stubs below the first union.
      // Every chain node must stay on its own limb's path, because every
      // child's lead-in is built from its parent's chain nodes.
      //
      // Real clearance, not just "thinner than the parent": both surfaces carry
      // cross-section wobble and grooves, so a lead-in near the parent's radius
      // breaks through its skin in patches.
      pts.unshift(host.pos.clone());
      radii.unshift(Math.min(chain[0].r, host.r * 0.62));
      lead = 1;
      leadIn = host.pos.distanceTo(chain[0].pos) * 0.5;
      if (hostPrev) {
        pts.unshift(hostPrev.pos.clone());
        radii.unshift(Math.min(chain[0].r, hostPrev.r * 0.42));
        lead = 2;
        leadIn += hostPrev.pos.distanceTo(host.pos);
      }
      // A branch is fattest where it leaves its parent — but a twig on a trunk
      // is a COLLAR, not a cone.
      // Fine shoots do not grow straight out of thick wood in any number. Space
      // colonization happily sprouts them from the bole, and up close they are
      // rose thorns on a trunk. Skipped at MESH time, not pruned from the
      // skeleton, so da Vinci's thickness sums are left exactly as they were.
      if (host.r > 0.07 && chain[0].r < host.r * 0.16) { L.skipped = true; continue; }
      // No flare on the child any more: its base is hidden, and the visible
      // swelling at the union is the PARENT'S collar, which is the right way
      // round anatomically.
      baseBlend = 0;
      forkShade = clamp(chain[0].r / 0.05, 0.1, 0.3);
    }

    // Collars for this limb's OWN children, positioned where they actually
    // leave. Tiny children are ignored: a collar per twig made vertebrae.
    const collarAt = (L.attach || [])
      .filter((a) => a.r > chain[Math.min(a.index, last)].r * 0.28)
      .map((a) => ({ t: (a.index + lead) / (last + lead), r: a.r }));

    const isTrunk = !L.parentLimb;
    const g = sweepLimb(pts, radii, {
      seed: rr(r, 0, 20),
      collarAt,
      baseBlend,
      forkShade,
      leadIn,
      rootFlare: isTrunk ? 1 : 0,
      terminal: (L.attach || []).length === 0 && !isTrunk,
    });
    if (opts.debugColors) {
      // One flat colour per limb, so a stray piece of geometry can be traced
      // to the limb that owns it instead of guessed at.
      const hue = (limbNo * 0.618034) % 1;
      const c = new THREE.Color().setHSL(hue, 0.85, isTrunk ? 0.25 : 0.55);
      const col = g.attributes.color;
      for (let i = 0; i < col.count; i++) col.setXYZ(i, c.r, c.g, c.b);
    }
    limbNo++;
    geos.push(g);
  }

  // Normals are already correct per limb (and seam-closed). Recomputing them on
  // the merged mesh would reopen every seam.
  return BufferGeometryUtils.mergeGeometries(geos, false);
}
