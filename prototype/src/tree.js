// Trunk and branches.
//
// Every limb below is hand-placed. This is not a generator — the numbers were
// tuned by looking at the result, not derived from rules. See docs/TREE-SYSTEM.md.
//
// Two things keep this from reading as "a pile of cylinders":
//   1. the cross-section is never a circle (a slow radial wobble rides along it)
//   2. every junction swells, so branches grow OUT of their parent instead of
//      poking through it.

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { DEG, lerp, easeOut, rr } from './util.js';

/**
 * Walk a branch outward from an origin, curling toward `elev1` as it goes.
 * Returns control points for a smooth curve.
 */
function branchPath(origin, azDeg, elev0, elev1, len, twistDeg = 0, segs = 5) {
  const p = origin.clone();
  const pts = [p.clone()];
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const el = lerp(elev0, elev1, easeOut(t)) * DEG;
    const az = (azDeg + twistDeg * t) * DEG;
    const ch = Math.cos(el);
    p.add(new THREE.Vector3(ch * Math.cos(az), Math.sin(el), ch * Math.sin(az)).multiplyScalar(len / segs));
    pts.push(p.clone());
  }
  return pts;
}

/** Sweep an irregular, tapering cross-section along a curve. */
function limbGeometry(pts, r0, r1, opts = {}) {
  const { rootFlare = 0, startFlare = 0, seed = 0, radial = 9, steps = 26 } = opts;
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const frames = curve.computeFrenetFrames(steps, false);
  const pos = [], nor = [], idx = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const c = curve.getPointAt(t);
    const N = frames.normals[Math.min(i, steps - 1)];
    const B = frames.binormals[Math.min(i, steps - 1)];

    // Taper is non-linear: branches hold their mass then thin out near the tip.
    let r = lerp(r0, r1, Math.pow(t, 0.72));
    // Flare where the trunk meets the ground, and where a branch leaves its parent.
    r *= 1 + rootFlare * Math.exp(-t * 11);
    r *= 1 + startFlare * Math.exp(-t * 10);

    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      // The wobble drifts along the limb, so no two cross-sections match.
      const wob =
        1 +
        0.13 * Math.sin(3 * a + seed + t * 2.1) +
        0.075 * Math.sin(5 * a - seed * 1.7 + t * 3.4) +
        0.05 * Math.sin(7 * a + seed * 0.6 - t * 1.6);
      const rr_ = r * wob;
      const off = new THREE.Vector3()
        .addScaledVector(N, Math.cos(a) * rr_)
        .addScaledVector(B, Math.sin(a) * rr_);
      pos.push(c.x + off.x, c.y + off.y, c.z + off.z);
      const n = off.clone().normalize();
      nor.push(n.x, n.y, n.z);
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  // Cap BOTH ends. Closing the tip stops twigs reading as open pipes — but
  // closing the base matters far more, and for a non-obvious reason: three.js
  // renders back faces into the shadow map for front-side materials, which
  // only cancels self-shadowing if the solid is actually closed. With open
  // bases the back-face set had holes exactly where limbs meet, and the
  // junctions broke out in jagged shadow acne.
  const tip = curve.getPointAt(1);
  const tipIdx = pos.length / 3;
  pos.push(tip.x, tip.y, tip.z);
  const tv = curve.getTangentAt(1);
  nor.push(tv.x, tv.y, tv.z);
  for (let j = 0; j < radial; j++) {
    const a = steps * (radial + 1) + j;
    idx.push(a, tipIdx, a + 1);
  }

  const start = curve.getPointAt(0);
  const baseIdx = pos.length / 3;
  pos.push(start.x, start.y, start.z);
  const bv = curve.getTangentAt(0);
  nor.push(-bv.x, -bv.y, -bv.z);
  for (let j = 0; j < radial; j++) {
    idx.push(j + 1, baseIdx, j); // reversed winding: this cap faces backward
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

export function buildTree(r) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // --- trunk -------------------------------------------------------------
  // A lazy S, leaning very slightly. Perfectly straight reads as a pole.
  const trunkPts = [
    V(0.02, -0.18, 0.02),
    V(0.0, 0.3, 0.06),
    V(-0.07, 0.72, 0.03),
    V(-0.04, 1.14, -0.05),
    V(0.02, 1.5, -0.08),
    V(0.05, 1.68, -0.06),
  ];
  const geos = [limbGeometry(trunkPts, 0.29, 0.165, { rootFlare: 1.15, seed: 1.2, steps: 30 })];

  const crotch = V(0.05, 1.62, -0.06);
  // Primaries begin *inside* the trunk so the junction reads as a swelling.
  const primRoot = V(0.04, 1.42, -0.06); // where the trunk opens into the crown
  const tips = [];

  // --- primaries ---------------------------------------------------------
  // Three unequal limbs. Deliberately not 120 degrees apart, and not the same
  // length — even spacing is the fastest way to look machine-made.
  const primaries = [
    { az: 152, e0: 24, e1: 64, len: 1.72, r0: 0.15, tw: -26 },
    { az: 292, e0: 18, e1: 60, len: 1.88, r0: 0.165, tw: 30 },
    { az: 44, e0: 30, e1: 68, len: 1.5, r0: 0.134, tw: -18 },
    { az: 218, e0: 38, e1: 72, len: 1.24, r0: 0.108, tw: 20 },
  ];
  const primPaths = [];
  for (let i = 0; i < primaries.length; i++) {
    const p = primaries[i];
    const pts = branchPath(primRoot, p.az, p.e0, p.e1, p.len + 0.2, p.tw);
    primPaths.push(pts);
    geos.push(limbGeometry(pts, p.r0, p.r0 * 0.42, { startFlare: 0.42, seed: 2 + i * 1.7 }));
  }

  // --- secondaries -------------------------------------------------------
  // Each hangs off a point partway along its primary, so the crown fans out.
  const secondaries = [
    { p: 0, at: 0.44, az: 190, e0: 34, e1: 60, len: 1.0, r0: 0.08, tw: -22 },
    { p: 0, at: 0.78, az: 118, e0: 44, e1: 68, len: 0.82, r0: 0.062, tw: 26 },
    { p: 1, at: 0.4, az: 254, e0: 30, e1: 56, len: 1.1, r0: 0.09, tw: -24 },
    { p: 1, at: 0.74, az: 330, e0: 42, e1: 66, len: 0.9, r0: 0.068, tw: 22 },
    { p: 2, at: 0.46, az: 4, e0: 38, e1: 64, len: 0.88, r0: 0.068, tw: 28 },
    { p: 2, at: 0.8, az: 84, e0: 48, e1: 72, len: 0.72, r0: 0.054, tw: -20 },
    { p: 3, at: 0.5, az: 180, e0: 46, e1: 70, len: 0.76, r0: 0.058, tw: 24 },
    { p: 3, at: 0.82, az: 250, e0: 52, e1: 76, len: 0.62, r0: 0.046, tw: -18 },
  ];
  const secPaths = [];
  for (let i = 0; i < secondaries.length; i++) {
    const s = secondaries[i];
    const base = new THREE.CatmullRomCurve3(primPaths[s.p], false, 'catmullrom', 0.5).getPointAt(s.at);
    const pts = branchPath(base, s.az, s.e0, s.e1, s.len, s.tw);
    secPaths.push(pts);
    geos.push(limbGeometry(pts, s.r0, s.r0 * 0.4, { startFlare: 0.5, seed: 9 + i * 2.3, radial: 8, steps: 20 }));
  }

  // --- twigs -------------------------------------------------------------
  // Thin, short, and mostly hidden. They exist so the canopy has something to
  // sit on near its edge, and so the silhouette is not a clean shell.
  const twigs = [
    { s: 0, at: 0.58, az: 226, e0: 42, e1: 70, len: 0.56, r0: 0.036 },
    { s: 2, at: 0.56, az: 284, e0: 38, e1: 66, len: 0.62, r0: 0.04 },
    { s: 3, at: 0.6, az: 16, e0: 44, e1: 72, len: 0.5, r0: 0.032 },
    { s: 4, at: 0.62, az: 336, e0: 48, e1: 74, len: 0.48, r0: 0.03 },
    { s: 1, at: 0.64, az: 146, e0: 46, e1: 72, len: 0.48, r0: 0.03 },
    { s: 5, at: 0.6, az: 62, e0: 50, e1: 76, len: 0.44, r0: 0.027 },
    { s: 6, at: 0.62, az: 200, e0: 48, e1: 74, len: 0.45, r0: 0.028 },
  ];
  for (let i = 0; i < twigs.length; i++) {
    const t = twigs[i];
    const base = new THREE.CatmullRomCurve3(secPaths[t.s], false, 'catmullrom', 0.5).getPointAt(t.at);
    const pts = branchPath(base, t.az, t.e0, t.e1, t.len, rr(r, -20, 20));
    geos.push(limbGeometry(pts, t.r0, t.r0 * 0.35, { startFlare: 0.45, seed: 20 + i * 3.1, radial: 7, steps: 14 }));
    tips.push({ p: pts[pts.length - 1], w: 0.62 });
  }

  for (const pts of secPaths) tips.push({ p: pts[pts.length - 1], w: 1.0 });
  for (const pts of primPaths) tips.push({ p: pts[pts.length - 1], w: 0.85 });

  // --- surface roots -----------------------------------------------------
  // Three small buttresses. They stop the trunk from looking like it was
  // pushed into the ground like a birthday candle.
  const roots = [
    { az: 200, len: 0.5, r0: 0.13 },
    { az: 325, len: 0.44, r0: 0.115 },
    { az: 80, len: 0.4, r0: 0.1 },
  ];
  for (let i = 0; i < roots.length; i++) {
    const rt = roots[i];
    const pts = branchPath(V(0.02, 0.06, 0.02), rt.az, -14, -52, rt.len, 14);
    geos.push(limbGeometry(pts, rt.r0, rt.r0 * 0.3, { startFlare: 1.1, seed: 30 + i * 2.6, radial: 7, steps: 12 }));
  }

  const merged = BufferGeometryUtils.mergeGeometries(geos, false);
  merged.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0xa8806a,
    roughness: 0.86,
    metalness: 0.0,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return { mesh, tips, crotch };
}
