// The island: soil body, grass, rocks.
//
// It has one job — frame the tree — so it stays low-contrast and low-detail.
// The outline is a gently irregular rounded polygon rather than a hexagon or a
// circle: a circle reads as a plate, a hexagon reads as a game tile.

import * as THREE from 'three';
import { rr, lerp, clamp, smoothstep, noise3, applySway } from './util.js';

export const ISLAND_R = 2.25;
const TOP_DOME = 0.185; // how much the grass mounds up at the centre
const DEPTH = 1.95;

/** Radius of the island outline at a given angle. */
export function radiusAt(a) {
  return (
    ISLAND_R *
    (1 + 0.072 * Math.sin(3 * a + 0.7) + 0.045 * Math.sin(5 * a - 1.9) + 0.028 * Math.sin(7 * a + 2.6))
  );
}

/** Height of the grass surface at a given distance from centre. */
export function topY(rad) {
  const t = clamp(rad / ISLAND_R, 0, 1);
  return TOP_DOME * (1 - t * t);
}

/**
 * Contact occlusion at the foot of the trunk: 1 down in the crevice where
 * bark, root and turf meet, 0 out on the open lawn.
 *
 * Without this the tree reads as *placed on* the island — the turf runs
 * cleanly up to the bark and stops, which is what a prop on a table does, not
 * what a trunk growing out of soil does. A cast shadow does not substitute:
 * it comes from one direction and leaves the other side of the trunk bright
 * right at the seam, which is precisely where the eye looks for contact.
 *
 * Deliberately lobed rather than a circle, with the three maxima landing on
 * the root buttresses in tree.js (azimuth 80, 200 and 325 degrees), so the
 * shading follows the roots out instead of drawing a suspicious ring.
 */
function contactFalloff(x, z, r0, r1) {
  const rad = Math.hypot(x, z);
  const a = Math.atan2(z, x);
  const lobe = 1 + 0.3 * Math.sin(3 * a - 2.618) + 0.11 * Math.sin(5 * a + 1.2);
  return 1 - smoothstep(r0 * lobe, r1 * lobe, rad);
}

/**
 * The tight, dark crevice itself: bare earth and deep shade.
 *
 * The inner radius has to clear the trunk's root flare (about 0.6 at the
 * ground) or the darkest part of this is hidden under the trunk and nothing
 * shows at all — which is exactly what the first attempt did.
 */
export const trunkContact = (x, z) => contactFalloff(x, z, 0.5, 1.05);

/**
 * The wide, soft pool around it. Two terms rather than one because a single
 * falloff can only be tight (reads as a painted ring) or wide (reads as a
 * second cast shadow); the pair reads as occlusion.
 */
export const trunkPool = (x, z) => contactFalloff(x, z, 0.7, 2.0);

// Terrain is restrained on purpose. These states shift the island's TONE and
// GROWTH and nothing else — the island's vocabulary (irregular rounded outline,
// grass dome, soil body, chunky stones) is part of the project's identity and
// does not vary. No props, ever.
const TERRAIN_FALLBACK = {
  grass: 30000, height: 1,
  lo: new THREE.Color(0x5e9e37), mid: new THREE.Color(0x81c246), hi: new THREE.Color(0xa8d95c),
  soilHi: new THREE.Color(0xa07b58), soilLo: new THREE.Color(0x6a5663),
};

export function buildIsland(r, params = {}) {
  const tp = { ...TERRAIN_FALLBACK, ...params };
  const group = new THREE.Group();
  const SEG = 96;

  // --- grass dome --------------------------------------------------------
  const topPos = [], topNor = [], topIdx = [], topCol = [];
  // More rings than the shape needs, bunched toward the centre, purely so the
  // contact shading at the trunk has somewhere to live. On the old even rings
  // the nearest vertex to the trunk was a quarter of a unit out, which is
  // wider than the whole effect.
  const RINGS = 14;
  const ringF = (ri) => Math.pow(ri / RINGS, 1.75);
  // The dome sits a shade under the blades standing on it, so the lawn reads as
  // grass on soil rather than as a green plate with grass glued to it.
  const gDeep = tp.lo.clone().offsetHSL(0, 0.02, -0.05);
  const gMid = tp.mid.clone().offsetHSL(0, 0, -0.03);
  // Bare earth under the tree. The blades go almost flat here (see buildGrass),
  // so this is what actually shows, and it wants to read as duff, not lawn.
  const duff = tp.soilHi.clone().offsetHSL(0, 0.12, -0.24);

  const topColourAt = (x, z, f) => {
    const c = gDeep.clone().lerp(gMid, clamp(0.35 + f * 0.75, 0, 1));
    c.lerp(gDeep, trunkPool(x, z) * 0.7);
    return c.lerp(duff, clamp(trunkContact(x, z) * 1.05, 0, 1) * 0.92);
  };

  topPos.push(0, topY(0), 0);
  topNor.push(0, 1, 0);
  {
    const c = topColourAt(0, 0, 0);
    topCol.push(c.r, c.g, c.b);
  }
  for (let ri = 1; ri <= RINGS; ri++) {
    const f = ringF(ri);
    for (let i = 0; i < SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const rad = radiusAt(a) * f * 0.995;
      const y = topY(radiusAt(a) * f);
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      topPos.push(x, y, z);
      topNor.push(0, 1, 0);
      const c = topColourAt(x, z, f);
      topCol.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < SEG; i++) topIdx.push(0, 1 + i, 1 + ((i + 1) % SEG));
  for (let ri = 0; ri < RINGS - 1; ri++) {
    const a0 = 1 + ri * SEG, b0 = a0 + SEG;
    for (let i = 0; i < SEG; i++) {
      const j = (i + 1) % SEG;
      topIdx.push(a0 + i, b0 + i, a0 + j, b0 + i, b0 + j, a0 + j);
    }
  }
  const topGeo = new THREE.BufferGeometry();
  topGeo.setAttribute('position', new THREE.Float32BufferAttribute(topPos, 3));
  topGeo.setAttribute('normal', new THREE.Float32BufferAttribute(topNor, 3));
  topGeo.setAttribute('color', new THREE.Float32BufferAttribute(topCol, 3));
  topGeo.setIndex(topIdx);
  const topMesh = new THREE.Mesh(
    topGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 })
  );
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // --- soil body ---------------------------------------------------------
  // Holds its width for a shoulder before tapering to a soft point. Tapering
  // immediately made the island read as a lawn floating on a shadow.
  const sidePos = [], sideIdx = [], sideCol = [];
  const LV = [
    { t: 0.0, yy: 0.0, k: 1.0 },
    { t: 0.1, yy: -0.26, k: 1.01 },
    { t: 0.24, yy: -0.58, k: 0.99 },
    { t: 0.42, yy: -0.96, k: 0.9 },
    { t: 0.64, yy: -1.38, k: 0.72 },
    { t: 0.84, yy: -1.74, k: 0.46 },
    { t: 1.0, yy: -DEPTH, k: 0.18 },
  ];
  const soilHi = tp.soilHi;
  const soilLo = tp.soilLo;
  const SSEG = 42; // chunkier than the grass ring — we want visible facets
  for (const lv of LV) {
    for (let i = 0; i < SSEG; i++) {
      const a = (i / SSEG) * Math.PI * 2;
      const n = noise3(Math.cos(a) * 2.1, lv.t * 3.4, Math.sin(a) * 2.1);
      const rad = radiusAt(a) * lv.k * (1 + n * 0.085 * (0.25 + lv.t));
      sidePos.push(Math.cos(a) * rad, lv.yy + n * 0.05, Math.sin(a) * rad);
      const c = soilHi.clone().lerp(soilLo, clamp(lv.t * 1.35, 0, 1));
      sideCol.push(c.r, c.g, c.b);
    }
  }
  for (let l = 0; l < LV.length - 1; l++) {
    const a0 = l * SSEG, b0 = a0 + SSEG;
    for (let i = 0; i < SSEG; i++) {
      const j = (i + 1) % SSEG;
      sideIdx.push(a0 + i, b0 + i, a0 + j, b0 + i, b0 + j, a0 + j);
    }
  }
  const tipI = sidePos.length / 3;
  sidePos.push(0, -DEPTH - 0.14, 0);
  sideCol.push(soilLo.r, soilLo.g, soilLo.b);
  const last = (LV.length - 1) * SSEG;
  for (let i = 0; i < SSEG; i++) sideIdx.push(last + i, tipI, last + ((i + 1) % SSEG));

  const sideGeo = new THREE.BufferGeometry();
  sideGeo.setAttribute('position', new THREE.Float32BufferAttribute(sidePos, 3));
  sideGeo.setAttribute('color', new THREE.Float32BufferAttribute(sideCol, 3));
  sideGeo.setIndex(sideIdx);
  sideGeo.computeVertexNormals();
  const sideMesh = new THREE.Mesh(
    sideGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, flatShading: true })
  );
  sideMesh.castShadow = true;
  sideMesh.receiveShadow = true;
  group.add(sideMesh);

  return group;
}

/**
 * A single blade: tapering, bent, and built double-faced.
 *
 * The faces are duplicated with reversed winding and ALL normals forced
 * straight up. Using DoubleSide instead would flip the normal on back faces,
 * so every blade seen from behind shaded black — which is exactly what the
 * first render did. Up-facing normals on both sides read soft and lawn-like.
 */
function bladeGeometry() {
  const pos = [], W = 0.062;
  const levels = [
    { y: 0.0, w: 1.0, z: 0.0 },
    { y: 0.42, w: 0.76, z: 0.06 },
    { y: 0.76, w: 0.44, z: 0.17 },
  ];
  for (const l of levels) pos.push(-W * l.w, l.y, l.z, W * l.w, l.y, l.z);
  pos.push(0, 1.0, 0.32); // tip

  const front = [0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6];
  const idx = front.slice();
  for (let i = 0; i < front.length; i += 3) idx.push(front[i], front[i + 2], front[i + 1]);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const n = [];
  for (let i = 0; i < pos.length / 3; i++) n.push(0, 1, 0);
  g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
  return g;
}

export function buildGrass(r, uniforms, params = {}) {
  const tp = { ...TERRAIN_FALLBACK, ...params };
  const detail = params.detail ?? 1;
  const COUNT = Math.max(2000, Math.round(tp.grass * detail));
  const geo = bladeGeometry();
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.93,
    metalness: 0,
    side: THREE.FrontSide,
  });
  applySway(mat, uniforms, { amp: 0.03, speed: 1.35, local: true });

  const im = new THREE.InstancedMesh(geo, mat, COUNT);
  im.receiveShadow = true;
  im.frustumCulled = false;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const axis = new THREE.Vector3(0, 1, 0);
  const lo = tp.lo;
  const mid = tp.mid;
  const hi = tp.hi;
  // Deep shade at the trunk, and the earth showing through it. Both derived so
  // that an autumn or winter lawn does not sit in a summer-green shadow.
  const shadeG = tp.lo.clone().offsetHSL(0, 0.08, -0.2);
  const duffG = tp.soilHi.clone().offsetHSL(0, 0.12, -0.24);

  for (let i = 0; i < COUNT; i++) {
    const a = r() * Math.PI * 2;
    const edgeR = radiusAt(a);
    const rad = Math.sqrt(r()) * edgeR * 0.985;
    p.set(Math.cos(a) * rad, topY(rad) - 0.01, Math.sin(a) * rad);

    // Contact occlusion at the trunk. The blades do most of the work here:
    // in the crevice they go nearly flat and drop to a shaded, earthy tone,
    // so the lawn gives way to bare duff instead of running clean up to the
    // bark, and the wider pool keeps the whole base from sitting in full sun.
    const ao = trunkContact(p.x, p.z);
    const pool = trunkPool(p.x, p.z);
    // A collar of taller, shaded tufts right where the turf meets the bark.
    // Flattening the grass all the way in was a mistake on its own: with
    // nothing lapping over the root flare the trunk still ended in a clean
    // line. Blades standing against the bark are what actually reads as
    // contact. Peaks at the half-falloff, so it follows the same lobes.
    const collar = 4 * ao * (1 - ao);
    // Shorter at the rim too, so the island silhouette is not a hairy fringe.
    const edge = 1 - smoothstep(0.82, 1.0, rad / edgeR);

    const h = rr(r, 0.085, 0.155) * tp.height * lerp(1.0, 0.22, ao * ao) * (1 + collar * 0.42) * lerp(0.55, 1.0, edge);
    s.set(rr(r, 0.85, 1.25), h, 1);
    q.setFromAxisAngle(axis, r() * Math.PI * 2);
    m.compose(p, q, s);
    im.setMatrixAt(i, m);

    const t = r();
    const c = lo.clone().lerp(mid, clamp(t * 1.4, 0, 1));
    c.lerp(hi, clamp((t - 0.62) * 2.2, 0, 1));
    c.lerp(shadeG, clamp(pool * 0.52 + ao * 0.62, 0, 1) * 0.84); // shade, then
    c.lerp(duffG, clamp((ao - 0.58) * 2.4, 0, 1) * 0.7); // bare earth in the crevice
    c.lerp(lo, smoothstep(0.55, 1.0, rad / edgeR) * 0.3);
    if (r() < 0.14) c.lerp(lo, 0.45); // scattered darker tufts
    c.offsetHSL(rr(r, -0.02, 0.02), rr(r, -0.05, 0.05), rr(r, -0.03, 0.03));
    im.setColorAt(i, c);
  }
  im.instanceMatrix.needsUpdate = true;
  return im;
}

/** Chunky stones. Displaced icosahedra, flat shaded, partly sunk into the turf. */
export function buildRocks(r, params = {}) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.88,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
  });

  const placements = [
    { a: 0.5, rad: 0.92, s: 0.36, sq: 0.68 },
    { a: 1.25, rad: 0.7, s: 0.21, sq: 0.9 },
    { a: 2.3, rad: 1.06, s: 0.3, sq: 0.62 },
    { a: 3.45, rad: 0.78, s: 0.25, sq: 0.8 },
    { a: 4.4, rad: 1.3, s: 0.18, sq: 0.85 },
    { a: 5.4, rad: 0.98, s: 0.32, sq: 0.66 },
    { a: 2.85, rad: 1.52, s: 0.15, sq: 0.9 },
  ];

  // Defaults are the full-value summer stone; a dormant scene passes muted ones
  // so the rocks do not become the brightest thing in a quiet frame.
  const hi = params.rockHi || new THREE.Color(0xf0e0c2);
  const lo = params.rockLo || new THREE.Color(0xb5a07f);

  for (const pl of placements) {
    // Seeded personality only: the stones shuffle a little around the trunk
    // from tree to tree, but the arrangement stays the one that was composed.
    pl.a += rr(r, -0.22, 0.22);
    pl.rad *= rr(r, 0.94, 1.08);
    const g = new THREE.IcosahedronGeometry(1, 1);
    const pos = g.attributes.position;
    const col = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const n = noise3(x * 1.7 + pl.a * 4, y * 1.7, z * 1.7);
      const k = 1 + n * 0.3;
      pos.setXYZ(i, x * k, y * k * pl.sq, z * k);
      const c = lo.clone().lerp(hi, clamp(y * 0.5 + 0.55, 0, 1));
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();

    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(Math.cos(pl.a) * pl.rad, topY(pl.rad) + pl.s * pl.sq * 0.3, Math.sin(pl.a) * pl.rad);
    mesh.scale.setScalar(pl.s);
    mesh.rotation.set(rr(r, -0.3, 0.3), r() * Math.PI * 2, rr(r, -0.3, 0.3));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
