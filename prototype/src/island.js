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

export function buildIsland(r) {
  const group = new THREE.Group();
  const SEG = 96;

  // --- grass dome --------------------------------------------------------
  const topPos = [], topNor = [], topIdx = [], topCol = [];
  const RINGS = 9;
  const gDeep = new THREE.Color(0x4a8a33);
  const gMid = new THREE.Color(0x74b540);
  topPos.push(0, topY(0), 0);
  topNor.push(0, 1, 0);
  topCol.push(gMid.r, gMid.g, gMid.b);
  for (let ri = 1; ri <= RINGS; ri++) {
    const f = ri / RINGS;
    for (let i = 0; i < SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const rad = radiusAt(a) * f * 0.995;
      const y = topY(radiusAt(a) * f);
      topPos.push(Math.cos(a) * rad, y, Math.sin(a) * rad);
      topNor.push(0, 1, 0);
      const c = gDeep.clone().lerp(gMid, clamp(0.35 + f * 0.75, 0, 1));
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
  const soilHi = new THREE.Color(0xa07b58);
  const soilLo = new THREE.Color(0x6a5663);
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

export function buildGrass(r, uniforms) {
  const COUNT = 30000;
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
  const lo = new THREE.Color(0x5e9e37);
  const mid = new THREE.Color(0x81c246);
  const hi = new THREE.Color(0xa8d95c);

  for (let i = 0; i < COUNT; i++) {
    const a = r() * Math.PI * 2;
    const edgeR = radiusAt(a);
    const rad = Math.sqrt(r()) * edgeR * 0.985;
    p.set(Math.cos(a) * rad, topY(rad) - 0.01, Math.sin(a) * rad);

    // Shorter and darker right under the trunk — reads as shade, and stops the
    // grass from fighting the roots for attention.
    const shade = clamp((Math.hypot(p.x, p.z) - 0.25) / 0.85, 0, 1);
    // Shorter at the rim too, so the island silhouette is not a hairy fringe.
    const edge = 1 - smoothstep(0.82, 1.0, rad / edgeR);

    const h = rr(r, 0.085, 0.155) * lerp(0.66, 1.0, shade) * lerp(0.55, 1.0, edge);
    s.set(rr(r, 0.85, 1.25), h, 1);
    q.setFromAxisAngle(axis, r() * Math.PI * 2);
    m.compose(p, q, s);
    im.setMatrixAt(i, m);

    const t = r();
    const c = lo.clone().lerp(mid, clamp(t * 1.4, 0, 1));
    c.lerp(hi, clamp((t - 0.62) * 2.2, 0, 1));
    c.lerp(lo, (1 - shade) * 0.38);
    c.lerp(lo, smoothstep(0.55, 1.0, rad / edgeR) * 0.3);
    if (r() < 0.14) c.lerp(lo, 0.45); // scattered darker tufts
    c.offsetHSL(rr(r, -0.02, 0.02), rr(r, -0.05, 0.05), rr(r, -0.03, 0.03));
    im.setColorAt(i, c);
  }
  im.instanceMatrix.needsUpdate = true;
  return im;
}

/** Chunky stones. Displaced icosahedra, flat shaded, partly sunk into the turf. */
export function buildRocks(r) {
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

  const hi = new THREE.Color(0xf0e0c2);
  const lo = new THREE.Color(0xb5a07f);

  for (const pl of placements) {
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
