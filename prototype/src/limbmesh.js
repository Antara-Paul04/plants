// Meshing a skeleton into limbs.
//
// The structure decides whether a tree is plausible; THIS file decides whether
// it looks expensive. Three things do that work, and none of them is polygon
// count:
//
//   1. JUNCTIONS. A branch must have grown out of its parent. The anatomy is a
//      branch collar: trunk wood envelops the base of the branch, so the
//      swelling is MUTUAL — the parent bulges where the child leaves, and the
//      child flares into it. Flaring only the child is what produces a limb
//      that looks glued on, and it is the single most common tell.
//
//   2. CROSS-SECTIONS THAT ARE NOT CIRCLES. A drifting radial wobble, carried
//      coherently along the limb rather than re-randomised per ring.
//
//   3. LARGE-SCALE FORM BEFORE DETAIL. Root flare and buttresses are shape, not
//      noise. Noise added to a cylinder still reads as a noisy cylinder.

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { lerp, clamp, smoothstep, rr } from './util.js';

/** Radial resolution scaled to how big the limb actually is on screen. */
function radialFor(radius) {
  if (radius > 0.16) return 14;
  if (radius > 0.075) return 10;
  if (radius > 0.03) return 8;
  return 6;
}

/**
 * Sweep one limb.
 *
 * `collarAt` is a list of { t, r, dir } attachments in the limb's own parameter
 * space — the places where a child leaves and the parent therefore has to
 * thicken. `rootFlare` shapes the very base of the trunk.
 */
function sweepLimb(pts, radii, opts = {}) {
  const {
    seed = 0,
    collarAt = [],
    rootFlare = 0,
    baseBlend = 0,      // flare INTO the parent at t=0
    steps: stepsIn = 0,
  } = opts;

  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const length = curve.getLength();
  const rMax = Math.max(...radii);
  const steps = stepsIn || clamp(Math.round(length / 0.09), 6, 46);
  const radial = radialFor(rMax);
  const frames = curve.computeFrenetFrames(steps, false);

  const pos = [], nor = [], col = [], idx = [];
  const _o = new THREE.Vector3();

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const c = curve.getPointAt(t);
    const N = frames.normals[Math.min(i, steps - 1)];
    const B = frames.binormals[Math.min(i, steps - 1)];

    // Radius interpolated along the chain the skeleton actually produced.
    const f = t * (radii.length - 1);
    const i0 = Math.floor(f);
    let rad = lerp(radii[i0], radii[Math.min(i0 + 1, radii.length - 1)], f - i0);

    // --- collar ----------------------------------------------------------
    // Local swelling where children leave. Width scales with the CHILD's
    // radius, because a twig leaving a trunk barely disturbs it while a major
    // limb visibly deforms the parent around itself.
    // A limb can carry many children, and an unbounded SUM of bulges turns the
    // top of the trunk into a knot of angular lumps — measured the hard way.
    // The collar is capped as a fraction of the limb's own radius: a branch
    // deforms its parent, it does not double it.
    let bulge = 0;
    for (const a of collarAt) {
      const w = clamp(a.r * 3.0 / Math.max(length, 1e-4), 0.05, 0.4);
      const d = (t - a.t) / w;
      bulge += a.r * 0.5 * Math.exp(-d * d);
    }
    rad += Math.min(bulge, rad * 0.42);

    // Flare into the parent: the first fraction of a child limb widens to meet
    // the collar it is growing out of, so the two surfaces merge instead of
    // intersecting.
    if (baseBlend > 0) rad *= 1 + baseBlend * Math.exp(-t * 14);

    // Root flare and buttresses. Angular, not radial — a cone reads as a
    // funnel, whereas lobes that run down into the ground read as roots.
    const flare = rootFlare > 0 ? rootFlare * Math.exp(-t * 7.5) : 0;

    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      // Coherent drift, not per-ring noise: the SAME wobble shape slides along
      // the limb, which is what makes a cross-section read as wood.
      const wob =
        1 +
        0.085 * Math.sin(3 * a + seed + t * 1.6) +
        0.05 * Math.sin(5 * a - seed * 1.7 + t * 2.4) +
        0.03 * Math.sin(7 * a + seed * 0.6 - t * 1.2);
      // Buttress lobes: three of them, deepening toward the ground.
      // Three buttresses. The multiplier MUST be an integer or the
      // cross-section does not close: sin(1.5a) is not 2*pi-periodic, so the
      // first and last vertices of every ring disagreed and left a crease
      // running the full height of the trunk that read as a second stem.
      const butt = flare > 0 ? flare * (0.5 + 0.5 * Math.pow(Math.max(0, Math.sin(3 * a + seed)), 2)) : 0;
      const rr_ = rad * wob * (1 + butt);
      _o.set(0, 0, 0).addScaledVector(N, Math.cos(a) * rr_).addScaledVector(B, Math.sin(a) * rr_);
      pos.push(c.x + _o.x, c.y + _o.y, c.z + _o.z);
      const n = _o.clone().normalize();
      nor.push(n.x, n.y, n.z);
      col.push(0, 0, 0); // filled by the caller's bark pass
    }
  }

  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  // Cap BOTH ends. three.js renders back faces into the shadow map for
  // front-side materials, which only cancels self-shadowing on a CLOSED solid —
  // open-ended limbs break out in shadow acne exactly at the junctions.
  const capTip = curve.getPointAt(1), tv = curve.getTangentAt(1);
  const ti = pos.length / 3;
  pos.push(capTip.x, capTip.y, capTip.z); nor.push(tv.x, tv.y, tv.z); col.push(0, 0, 0);
  for (let j = 0; j < radial; j++) idx.push(steps * (radial + 1) + j, ti, steps * (radial + 1) + j + 1);

  const capBase = curve.getPointAt(0), bv = curve.getTangentAt(0);
  const bi = pos.length / 3;
  pos.push(capBase.x, capBase.y, capBase.z); nor.push(-bv.x, -bv.y, -bv.z); col.push(0, 0, 0);
  for (let j = 0; j < radial; j++) idx.push(j + 1, bi, j);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

/**
 * Mesh a whole skeleton.
 *
 * Children are started slightly INSIDE their parent and flared, and the parent
 * is bulged where they leave. Those two have to be done together: either alone
 * looks worse than neither.
 */
export function buildLimbs(limbs, r, opts = {}) {
  const { bark = { light: new THREE.Color(0x9a7a62), dark: new THREE.Color(0x35271f) } } = opts;

  const geos = [];
  for (const L of limbs) {
    const chain = L.chain;
    if (chain.length < 2) continue;

    const pts = chain.map((n) => n.pos.clone());
    const radii = chain.map((n) => n.r);
    const last = chain.length - 1;

    let baseBlend = 0;
    if (L.parentLimb) {
      const host = L.parentLimb.chain[L.parentIndex];
      const back = pts[0].clone().sub(host.pos);
      if (back.lengthSq() > 1e-9) {
        // Bury the base cap, but only as deep as the CHILD justifies. Backing a
        // thin twig a full trunk-radius into the trunk swallows the twig whole.
        const depth = Math.min(host.r * 1.0, chain[0].r * 3.0);
        pts[0] = host.pos.clone().addScaledVector(back.normalize(), -depth);
      }
      // A branch is fattest where it leaves its parent — but a twig on a trunk
      // is a COLLAR, not a cone. Inflating small limbs hard at the base is what
      // turned the twigs into flat wedges.
      radii[0] = Math.min(chain[0].r * 1.45, lerp(chain[0].r, host.r, 0.22));
      baseBlend = 0.1;
    }

    // Collars for this limb's OWN children, positioned where they actually
    // leave rather than all piled at the tip. Tiny children are ignored: a
    // collar for every twig is what produced the vertebrae up the leader.
    const collarAt = (L.attach || [])
      .filter((a) => a.r > chain[Math.min(a.index, last)].r * 0.28)
      .map((a) => ({ t: a.index / last, r: a.r }));

    const isTrunk = !L.parentLimb;
    const g = sweepLimb(pts, radii, {
      seed: rr(r, 0, 20),
      collarAt,
      baseBlend,
      rootFlare: isTrunk ? 1.25 : 0,
    });

    // --- bark colour -----------------------------------------------------
    // Macro variation first: young wood is lighter and warmer than old trunk
    // wood, and the base darkens into the ground. Uniform bark is the other
    // half of why a procedural tree reads as plastic.
    const pos = g.attributes.position;
    const colAttr = g.attributes.color;
    const c = new THREE.Color();
    const rMax = Math.max(...radii);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const rad = Math.hypot(pos.getX(i), pos.getZ(i));
      const young = clamp(1 - rMax / 0.22, 0, 1);
      c.copy(bark.dark).lerp(bark.light, clamp(0.34 + young * 0.5, 0, 1));
      const low = 1 - smoothstep(-0.05, 0.62, y);
      const tuck = 1 - smoothstep(0.32, 1.0, rad);
      c.lerp(bark.dark, clamp(low * lerp(0.45, 1, tuck), 0, 1) * 0.82);
      colAttr.setXYZ(i, c.r, c.g, c.b);
    }
    geos.push(g);
  }

  const merged = BufferGeometryUtils.mergeGeometries(geos, false);
  merged.computeVertexNormals();
  return merged;
}
