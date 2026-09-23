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
 * The top of a BARE-EARTH island (the product's failure state).
 *
 * The lawn's dome was never designed to be seen: smooth-shaded, convex, rolling
 * straight into the faceted soil with no edge. Undressed, it read as "a potato or a
 * bread roll — a pillow on a crystal". This is the island's own form instead, in the
 * soil's own language:
 *   - a nearly FLAT plateau (ground is not convex), in chunky FLAT-SHADED facets on
 *     the soil body's own 42 segments, gently worked so it is a surface, not a plate;
 *   - the RIM LIP that identifies our island — the cap overhangs the drum, with a
 *     shaded underside — which a lawn gives for free and bare earth has to build.
 * It asserts nothing about any website: it is the stage.
 */
function earthCap(tp) {
  const SSEG = 42, RINGF = [0.34, 0.62, 0.84, 1.0];
  const LIP = 1.05, TOP = 0.1, UNDER = -0.015;
  const pos = [], col = [], idx = [];
  const hi = tp.soilHi.clone().offsetHSL(0, -0.03, 0.06), lo = tp.soilHi.clone().offsetHSL(0, 0, -0.02);
  const wall = tp.soilHi.clone().multiplyScalar(0.74), under = tp.soilHi.clone().multiplyScalar(0.42);
  const push = (x, y, z, c) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); return pos.length / 3 - 1; };
  const topAt = (x, z, f) => TOP + 0.025 * (1 - f * f) + 0.06 * noise3(x * 1.15 + 7.1, 0.7, z * 1.15 - 2.3);   // enough relief that the facets READ
  const tone = (x, z) => lo.clone().lerp(hi, clamp(0.5 + 0.6 * noise3(x * 0.8 - 3.3, 1.9, z * 0.8 + 5.1), 0, 1));

  const c0 = push(0, topAt(0, 0, 0), 0, tone(0, 0));
  const ring = [];
  RINGF.forEach((f, ri) => {
    ring.push([]);
    for (let s = 0; s < SSEG; s++) {
      // Alternate rings are turned half a segment, so the facets are triangles of a
      // worked surface and not a spider's web of radial quads.
      const a = ((s + (ri % 2 ? 0.5 : 0)) / SSEG) * Math.PI * 2;
      const rad = radiusAt(a) * f * LIP;
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      ring[ri].push(push(x, ri === RINGF.length - 1 ? TOP : topAt(x, z, f), z, tone(x, z)));
    }
  });
  // Wound to face UP — (centre, next, this) — and then MEASURED, not assumed: this
  // file has shipped inside-out twice.
  for (let s = 0; s < SSEG; s++) idx.push(c0, ring[0][(s + 1) % SSEG], ring[0][s]);
  for (let ri = 0; ri < RINGF.length - 1; ri++) for (let s = 0; s < SSEG; s++) {
    const a = ring[ri][s], b = ring[ri][(s + 1) % SSEG], c = ring[ri + 1][s], d = ring[ri + 1][(s + 1) % SSEG];
    idx.push(a, b, c, b, d, c);
  }
  // The lip: a short wall down from the rim, then an underside back in to the drum.
  const rimTop = ring[RINGF.length - 1];
  const rimLow = [], inner = [];
  for (let s = 0; s < SSEG; s++) {
    const a = ((s + ((RINGF.length - 1) % 2 ? 0.5 : 0)) / SSEG) * Math.PI * 2;
    const R = radiusAt(a);
    rimLow.push(push(Math.cos(a) * R * LIP, UNDER, Math.sin(a) * R * LIP, wall));
    inner.push(push(Math.cos(a) * R * 0.97, UNDER, Math.sin(a) * R * 0.97, under));
  }
  for (let s = 0; s < SSEG; s++) {
    const t = (s + 1) % SSEG;
    idx.push(rimTop[s], rimTop[t], rimLow[s], rimTop[t], rimLow[t], rimLow[s]);      // wall, facing out
    idx.push(rimLow[s], rimLow[t], inner[s], rimLow[t], inner[t], inner[s]);        // underside, facing down
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, flatShading: true }));
  m.castShadow = true;
  m.receiveShadow = true;
  m.name = 'earthCap';
  return m;
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

  // BARE EARTH (`params.bareEarth`): the island with nothing growing on it — the
  // product's FAILURE state, where terrain was never measured, so turf would be
  // fabricated data. The top is soil, gently varied so it is a surface and not a
  // plate, and it carries NO contact shading: a dark pool where a trunk would stand
  // draws the missing tree, and a failure is never drawn as something missing from
  // the site.
  const earthHi = tp.soilHi.clone().offsetHSL(0, -0.02, 0.07);
  const earthLo = tp.soilHi.clone().offsetHSL(0, 0.02, -0.035);
  const topColourAt = (x, z, f) => {
    if (params.bareEarth) {
      const n = noise3(x * 0.9 + 11.3, 0.4, z * 0.9 - 4.7) * 0.5 + 0.5;
      return earthLo.clone().lerp(earthHi, clamp(0.2 + n * 0.75 - f * 0.12, 0, 1));
    }
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
  // WINDING. Every triangle in this island was wound the wrong way round — the
  // turf dome faced DOWN (0 of 2,592 triangles up) and the soil body faced INWARD
  // (0 of 546 out), measured, the same family of bug the trunk had. Back faces are
  // culled, so from any low angle the near wall vanished and the island was an
  // open bowl: you looked through it at the inside of the far wall, with the
  // tree's shadow falling into it and the trunk's buried base hanging under the
  // turf. From above it hid well — the blades cover the missing dome — which is
  // how it survived. The dome's contact shading had never once been on screen.
  const flip = (ix) => { for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; } return ix; };
  flip(topIdx);
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
  if (params.bareEarth) { topGeo.dispose(); topMesh.material.dispose(); group.add(earthCap(tp)); }
  else group.add(topMesh);

  // --- soil body ---------------------------------------------------------
  // Holds its width for a shoulder before tapering to a soft point. Tapering
  // immediately made the island read as a lawn floating on a shadow.
  const sidePos = [], sideIdx = [], sideCol = [];
  // Interpolate the shoulder and belly instead of joining seven coarse bands.
  // The last controls flatten the underside's tangent into a rounded tip.
  const profile = new THREE.CatmullRomCurve3([
    [1.01, 0], [1.01, -0.26], [0.99, -0.58], [0.9, -0.96],
    [0.72, -1.38], [0.46, -1.74], [0.18, -1.99],
    [0.075, -2.073], [0, -DEPTH - 0.14],
  ].map(([k, y]) => new THREE.Vector3(k * ISLAND_R, y, 0)));
  const soilHi = tp.soilHi;
  const soilLo = tp.soilLo;
  const SSEG = SEG, SIDE_RINGS = 32;
  for (let l = 0; l < SIDE_RINGS; l++) {
    const p = profile.getPointAt(l / SIDE_RINGS);
    const t = clamp(-p.y / (DEPTH + 0.14), 0, 1);
    const relief = smoothstep(0, 0.16, t) * (1 - smoothstep(0.8, 1, t));
    for (let i = 0; i < SSEG; i++) {
      const a = (i / SSEG) * Math.PI * 2;
      const n = noise3(Math.cos(a) * 2.1, t * 3.4, Math.sin(a) * 2.1);
      // The TOP ring meets the turf exactly: no noise, the dome's own rim height,
      // and a hair wider than the dome (0.995). Matching its angular samples
      // keeps their outlines together. Fade relief away at the rim and tip.
      const rad = radiusAt(a) * (p.x / ISLAND_R) * (1 + n * 0.045 * relief);
      const y = p.y + topY(radiusAt(a)) * (1 - smoothstep(0, 0.16, t)) + n * 0.025 * relief;
      sidePos.push(Math.cos(a) * rad, y, Math.sin(a) * rad);
      const c = soilHi.clone().lerp(soilLo, clamp(t * 1.35, 0, 1));
      sideCol.push(c.r, c.g, c.b);
    }
  }
  for (let l = 0; l < SIDE_RINGS - 1; l++) {
    const a0 = l * SSEG, b0 = a0 + SSEG;
    for (let i = 0; i < SSEG; i++) {
      const j = (i + 1) % SSEG;
      sideIdx.push(a0 + i, b0 + i, a0 + j, b0 + i, b0 + j, a0 + j);
    }
  }
  const tipI = sidePos.length / 3;
  sidePos.push(0, -DEPTH - 0.14, 0);
  sideCol.push(soilLo.r, soilLo.g, soilLo.b);
  const last = (SIDE_RINGS - 1) * SSEG;
  for (let i = 0; i < SSEG; i++) sideIdx.push(last + i, tipI, last + ((i + 1) % SSEG));
  // A CAP under the turf. The turf's rim (0.995) and this body's top ring (1.01)
  // do not share triangles, so between them there is a thin open slot all the way
  // round; with the body open at the top, anything seen through it was sky. Now
  // it is soil. Wound like everything else here and flipped with it: faces UP.
  const capI = sidePos.length / 3;
  sidePos.push(0, -0.02, 0);
  sideCol.push(soilHi.r, soilHi.g, soilHi.b);
  for (let i = 0; i < SSEG; i++) sideIdx.push(i, (i + 1) % SSEG, capI);

  const sideGeo = new THREE.BufferGeometry();
  sideGeo.setAttribute('position', new THREE.Float32BufferAttribute(sidePos, 3));
  sideGeo.setAttribute('color', new THREE.Float32BufferAttribute(sideCol, 3));
  sideGeo.setIndex(flip(sideIdx));
  sideGeo.computeVertexNormals();
  const sideMesh = new THREE.Mesh(
    sideGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })
  );
  sideMesh.name = 'soilBody';
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
    // `rockPush` moves the composed ring outward as a whole: the new tree's root
    // flare is far wider than the trunk these stones were composed around.
    pl.rad *= rr(r, 0.94, 1.08) * (params.rockPush ?? 1);
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
