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
import { DEG, lerp, clamp, smoothstep, easeOut, rr } from './util.js';

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
      // WINDING. Rings advance N -> B and three's Frenet frames have
      // B = T x N, so the order this used to have — (a, b, a+1) — has its normal
      // pointing INTO the limb. The whole tree rendered inside-out: what was on
      // screen was the inner face of each tube's far wall, with every normal
      // reversed. A convex tube under flat colour looks the same either way,
      // which is how it survived two visual passes; it was found in Gate 1,
      // where a real material showed geometry INSIDE the limbs straight through
      // them (1000 of 1000 trunk triangles measured inward). Outward is
      // (a, a+1, b). See docs/TREE-SYSTEM.md.
      idx.push(a, a + 1, b, b, a + 1, b + 1);
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
    idx.push(a, a + 1, tipIdx);          // faces +T, out of the tip
  }

  const start = curve.getPointAt(0);
  const baseIdx = pos.length / 3;
  pos.push(start.x, start.y, start.z);
  const bv = curve.getTangentAt(0);
  nor.push(-bv.x, -bv.y, -bv.z);
  for (let j = 0; j < radial; j++) {
    idx.push(j, baseIdx, j + 1);         // faces -T, out of the base
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

// Hand-authored limb tables. `skeleton.complexity` selects a SUBSET of these
// rather than generating new ones — subsetting keeps every tuned number intact,
// generating would quietly replace the tuning with a rule.
const PRIMARIES = [
  { az: 152, e0: 24, e1: 64, len: 1.72, r0: 0.15, tw: -26 },
  { az: 292, e0: 18, e1: 60, len: 1.88, r0: 0.165, tw: 30 },
  { az: 44, e0: 30, e1: 68, len: 1.5, r0: 0.134, tw: -18 },
  { az: 218, e0: 38, e1: 72, len: 1.24, r0: 0.108, tw: 20 },
];

const SECONDARIES = [
  { p: 0, at: 0.44, az: 190, e0: 34, e1: 60, len: 1.0, r0: 0.08, tw: -22 },
  { p: 0, at: 0.78, az: 118, e0: 44, e1: 68, len: 0.82, r0: 0.062, tw: 26 },
  { p: 1, at: 0.4, az: 254, e0: 30, e1: 56, len: 1.1, r0: 0.09, tw: -24 },
  { p: 1, at: 0.74, az: 330, e0: 42, e1: 66, len: 0.9, r0: 0.068, tw: 22 },
  { p: 2, at: 0.46, az: 4, e0: 38, e1: 64, len: 0.88, r0: 0.068, tw: 28 },
  { p: 2, at: 0.8, az: 84, e0: 48, e1: 72, len: 0.72, r0: 0.054, tw: -20 },
  { p: 3, at: 0.5, az: 180, e0: 46, e1: 70, len: 0.76, r0: 0.058, tw: 24 },
  { p: 3, at: 0.82, az: 250, e0: 52, e1: 76, len: 0.62, r0: 0.046, tw: -18 },
];

const TWIGS = [
  { s: 0, at: 0.58, az: 226, e0: 42, e1: 70, len: 0.56, r0: 0.036 },
  { s: 2, at: 0.56, az: 284, e0: 38, e1: 66, len: 0.62, r0: 0.04 },
  { s: 3, at: 0.6, az: 16, e0: 44, e1: 72, len: 0.5, r0: 0.032 },
  { s: 4, at: 0.62, az: 336, e0: 48, e1: 74, len: 0.48, r0: 0.03 },
  { s: 1, at: 0.64, az: 146, e0: 46, e1: 72, len: 0.48, r0: 0.03 },
  { s: 5, at: 0.6, az: 62, e0: 50, e1: 76, len: 0.44, r0: 0.027 },
  { s: 6, at: 0.62, az: 200, e0: 48, e1: 74, len: 0.45, r0: 0.028 },
];

export function buildTree(r, params = {}) {
  const {
    primaries: nPrim = PRIMARIES.length,
    secondaries: secSel = null,
    twigs: twigSel = null,
    extraTwigs = 0,
    subTwigs = 0,
    // Silhouette levers. Branch COUNT is invisible once the canopy covers it —
    // measured, not assumed: simple / normal / rich were indistinguishable at
    // thumbnail size on every foliated tree. What does survive is the shape the
    // limbs put the crown in, so complexity drives these instead:
    //   spread — limb length, so the crown is narrow or broad
    //   rise   — limb elevation, so limbs climb upright or reach outward
    // TREE-SYSTEM.md already recorded these as the two strongest levers tried.
    spread = 1,
    rise = 0,
    // How fine every limb ends. A foliated tree hides its branch ends under
    // leaves; a leafless one does not, and a limb that stops at 40% of its base
    // radius ends in a visible blunt cap. Twelve blunt caps read as a tree that
    // was cut apart, which is the opposite of what BARE is supposed to be.
    tipTaper = 1,
    bark = { light: new THREE.Color(0xa8806a), dark: new THREE.Color(0x3d2b21) },
  } = params;

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
  // Three or four unequal limbs. Deliberately not evenly spaced, and not the
  // same length — even spacing is the fastest way to look machine-made.
  const primaries = PRIMARIES.slice(0, Math.max(2, nPrim));
  const primPaths = [];
  for (let i = 0; i < primaries.length; i++) {
    const p = primaries[i];
    // Seeded personality: a couple of degrees of wander, nothing more. The
    // website has to stay the thing that decides what this tree is.
    const pts = branchPath(
      primRoot,
      p.az + rr(r, -4, 4),
      clamp(p.e0 + rise, 6, 80),
      clamp(p.e1 + rise + rr(r, -3, 3), 12, 84),
      (p.len + 0.2) * spread,
      p.tw
    );
    primPaths.push(pts);
    geos.push(limbGeometry(pts, p.r0, p.r0 * 0.42 * tipTaper, { startFlare: 0.42, seed: 2 + i * 1.7 }));
  }

  // --- secondaries -------------------------------------------------------
  // Each hangs off a point partway along its primary, so the crown fans out.
  // Kept sparse (indexed by their ORIGINAL position) so twigs can still find
  // their parent after a subset has been taken.
  const secPaths = [];
  for (let i = 0; i < SECONDARIES.length; i++) {
    const s = SECONDARIES[i];
    if (secSel && !secSel.includes(i)) continue;
    if (s.p >= primPaths.length) continue; // its primary was not built
    const base = new THREE.CatmullRomCurve3(primPaths[s.p], false, 'catmullrom', 0.5).getPointAt(s.at);
    const pts = branchPath(
      base,
      s.az + rr(r, -5, 5),
      clamp(s.e0 + rise * 0.7, 8, 80),
      clamp(s.e1 + rise * 0.7, 14, 84),
      s.len * spread,
      s.tw
    );
    secPaths[i] = pts;
    geos.push(limbGeometry(pts, s.r0, s.r0 * 0.4 * tipTaper, { startFlare: 0.5, seed: 9 + i * 2.3, radial: 8, steps: 20 }));
  }

  // --- twigs -------------------------------------------------------------
  // Thin, short, and mostly hidden. They exist so the canopy has something to
  // sit on near its edge, and so the silhouette is not a clean shell.
  const twigPaths = [];
  for (let i = 0; i < TWIGS.length; i++) {
    const t = TWIGS[i];
    if (twigSel && !twigSel.includes(i)) continue;
    if (!secPaths[t.s]) continue; // its secondary was not built
    const base = new THREE.CatmullRomCurve3(secPaths[t.s], false, 'catmullrom', 0.5).getPointAt(t.at);
    const pts = branchPath(base, t.az, t.e0, t.e1, t.len, rr(r, -20, 20));
    twigPaths.push(pts);
    geos.push(limbGeometry(pts, t.r0, t.r0 * 0.35 * tipTaper, { startFlare: 0.45, seed: 20 + i * 3.1, radial: 7, steps: 14 }));
    tips.push({ p: pts[pts.length - 1], w: 0.62 });
  }

  // --- extra ramification ------------------------------------------------
  // Two callers want these: RICH, which wants a busier silhouette, and BARE,
  // which has nothing BUT silhouette.
  //
  // A leafless tree is carried entirely by its filigree, and filigree means
  // branches dividing and dividing again — not wires stuck onto thick limbs.
  // So this runs in two generations, and each new limb is scaled to the one it
  // grows out of. Hosting them only on twigs put every fine branch at the far
  // tips, which read as a bottle-brush on the end of a club: what was missing
  // was the middle of the tree, so primaries and secondaries host them too.
  const hosts = [];
  for (const pts of primPaths) hosts.push({ pts, r: 0.052, lo: 0.34, hi: 0.76 });
  for (const pts of secPaths) if (pts) hosts.push({ pts, r: 0.036, lo: 0.3, hi: 0.82 });
  for (const pts of twigPaths) hosts.push({ pts, r: 0.022, lo: 0.28, hi: 0.86 });

  const gen1 = [];
  for (let i = 0; i < extraTwigs && hosts.length; i++) {
    const h = hosts[i % hosts.length];
    const curve = new THREE.CatmullRomCurve3(h.pts, false, 'catmullrom', 0.5);
    const base = curve.getPointAt(rr(r, h.lo, h.hi));
    const len = rr(r, 0.34, 0.72) * (h.r / 0.036);
    const pts = branchPath(base, rr(r, 0, 360), rr(r, 30, 56), rr(r, 60, 84), len, rr(r, -26, 26), 4);
    gen1.push({ pts, r: h.r * 0.6 });
    geos.push(limbGeometry(pts, h.r * 0.62, h.r * 0.09, { startFlare: 0.44, seed: 44 + i * 1.9, radial: 6, steps: 10 }));
    tips.push({ p: pts[pts.length - 1], w: 0.46 });
  }
  let sub = 0;
  for (const g of gen1) {
    const curve = new THREE.CatmullRomCurve3(g.pts, false, 'catmullrom', 0.5);
    for (let k = 0; k < subTwigs; k++) {
      const base = curve.getPointAt(rr(r, 0.26, 0.84));
      const pts = branchPath(base, rr(r, 0, 360), rr(r, 40, 64), rr(r, 68, 90), rr(r, 0.16, 0.38), rr(r, -30, 30), 3);
      geos.push(limbGeometry(pts, g.r * 0.5, g.r * 0.07, { startFlare: 0.36, seed: 71 + sub * 2.3, radial: 5, steps: 7 }));
      tips.push({ p: pts[pts.length - 1], w: 0.3 });
      sub++;
    }
  }

  for (const pts of secPaths) if (pts) tips.push({ p: pts[pts.length - 1], w: 1.0 });
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

  // --- contact occlusion -------------------------------------------------
  // The other half of making the tree grow out of the ground rather than
  // stand on it: the bark darkens into the turf line, deepest down in the
  // crevices between the root buttresses where no light could reach anyway.
  // Painted as vertex colour, so the bark colour lives here and the material
  // stays white — otherwise the two multiply and the whole trunk goes dark.
  {
    const pos = merged.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const rad = Math.hypot(pos.getX(i), pos.getZ(i));
      // Gone by knee height, and weaker out along the roots than in the hollow
      // between them — an even band of dark around the base reads as a painted
      // stripe rather than as occlusion.
      const low = 1 - smoothstep(-0.02, 0.58, y);
      const tuck = 1 - smoothstep(0.3, 0.92, rad);
      const ao = clamp(low * lerp(0.5, 1.0, tuck), 0, 1);
      c.copy(bark.light).lerp(bark.dark, ao * 0.85);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.86,
    metalness: 0.0,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return { mesh, tips, crotch };
}
