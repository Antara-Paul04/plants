// Foliage — the leaf CLUSTER is the authored unit.
//
// ART DIRECTION (the human's board, via docs/TASTE.md): large, individually
// readable teardrop leaves in two or three bright greens, gathered into
// clusters; matte like the wood; crown mass comes from clustered foliage, not
// from twig density. The two-distance rule decides everything here: the crown
// must resolve into a MASS at thumbnail size and into INDIVIDUAL LEAVES up
// close. The V0 foliage (thousands of small cards scattered over ellipsoids)
// gave the first and never the second.
//
// How the two distances are both served:
//   - each leaf is a real modelled shape — a folded, drooping teardrop with its
//     own colour — so up close there are leaves, not texture;
//   - each cluster's shading normals are bent toward the cluster's OUTWARD
//     direction, so at distance a cluster shades as one soft rounded form
//     rather than as a glitter of separately-lit planes.
//
// Why this is generated here rather than authored in Blender, which I had
// proposed: headless Blender is not authoring, it is procedural modelling in
// Python instead of JavaScript. The geometry would be code either way, and the
// price would be an export step, a loader, async assets and files to serve.
// Blender earns its place when a PERSON sculpts a cluster — and `clusterSource`
// below is the seam where a hand-made glTF cluster would be swapped in.
//
// Nothing here carries baked light. The V0 foliage had day-tuned emissive
// floors and glows at night; this is plain matte albedo, so it relights for
// free under any environment state.

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { rr, lerp, clamp, smoothstep, hash01, gustSlot, GUST } from './util.js';

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/**
 * One leaf: a teardrop, folded along its midrib, drooping toward its tip.
 * Local frame: base at the origin, length along +Y, upper face toward +Z.
 */
function leafGeometry(opts = {}) {
  const { length = 1, width = 0.66, fold = 0.26, droop = 0.22, rows = 7 } = opts;
  const cols = [-1, -0.5, 0, 0.5, 1];
  const pos = [], tt = [], idx = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    // Teardrop: a fast-rising rounded base, widest about a third along, then a
    // straight run to a point. The pointed tip is what reads as "leaf".
    const w = width * 0.5 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.74)), 0.72);
    for (const u of cols) {
      const x = u * w * length;
      const z = Math.abs(u) * w * length * fold - droop * t * t * length;
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
  g.setAttribute('leafT', new THREE.Float32BufferAttribute(tt, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * One cluster: leaves in a phyllotactic spiral about +Y, upright at the centre
 * and splaying outward toward the rim.
 *
 * Colour and shading normals are baked per vertex. Geometry is double-faced
 * (both faces share the same normals): `DoubleSide` would flip the normal on
 * back faces, and a back-lit leaf would go black — V0 already found that out.
 */
function clusterGeometry(r, opts = {}) {
  const {
    leaves = 17,
    leafLength = 0.5,
    // Bright and a little yellow. Deeper greens went to bottle-green in shadow
    // and made the crown heavy; the board's foliage is light and fresh.
    greens = [0x86c440, 0xa6d84f, 0x63ad3a],
    soft = 0.62,            // how far shading normals bend toward the cluster's outward direction
    // Per-environment foliage response: a function that grades a leaf's ALBEDO
    // in place (desaturate, cool, lift). Not baked light — the leaves are still
    // lit entirely by the scene — and a multiplier alone cannot desaturate.
    grade = null,
  } = opts;
  const palette = greens.map((h) => new THREE.Color(h));
  const parts = [];
  // Where each leaf sits in the cluster, its size and its colour — so that a leaf
  // which FALLS (buildLeafFall) can be born exactly where a real one is. Recording
  // it draws nothing from the RNG and changes no vertex: every existing tree is the
  // same tree.
  const seats = [];
  const centre = new THREE.Vector3(0, leafLength * 0.32, 0);

  for (let i = 0; i < leaves; i++) {
    const f = (i + 0.5) / leaves;
    // Upright at the centre, splaying out and then DOWN at the rim, so the
    // cluster is a ball of leaves rather than a rosette seen from the side —
    // a rosette reads as its own plant (agave), a ball reads as foliage.
    const polar = lerp(0.15, 2.25, Math.pow(f, 0.85));
    const az = i * GOLDEN + rr(r, -0.25, 0.25);
    const dir = new THREE.Vector3(Math.sin(polar) * Math.cos(az), Math.cos(polar), Math.sin(polar) * Math.sin(az));
    const size = leafLength * lerp(0.78, 1.12, f) * rr(r, 0.88, 1.12);

    const g = leafGeometry({
      length: size,
      width: rr(r, 0.6, 0.74),
      fold: rr(r, 0.18, 0.32),
      droop: rr(r, 0.12, 0.3) + f * 0.16,
    });

    // Leaf frame: +Y along dir, upper face turned up and outward.
    const up = new THREE.Vector3(0, 1, 0);
    let face = up.clone().sub(dir.clone().multiplyScalar(up.dot(dir)));
    if (face.lengthSq() < 1e-4) face.set(1, 0, 0);
    face.normalize();
    const side = new THREE.Vector3().crossVectors(dir, face).normalize();
    const m = new THREE.Matrix4().makeBasis(side, dir, face);
    m.premultiply(new THREE.Matrix4().makeRotationAxis(dir, rr(r, -0.45, 0.45)));
    m.setPosition(dir.clone().multiplyScalar(leafLength * 0.1));
    g.applyMatrix4(m);
    const seat = { matrix: m.clone(), size, color: null, shade: lerp(1.04, 0.93, f) };
    seats.push(seat);

    // Colour: one of the greens per leaf, deeper at the base (it sits inside the
    // cluster), lighter toward the tip, and the rim leaves a little deeper than
    // the crown ones — form that survives perfectly even light.
    const base = palette[Math.floor(r() * palette.length)].clone();
    base.offsetHSL(rr(r, -0.012, 0.012), rr(r, -0.04, 0.04), rr(r, -0.03, 0.03));
    if (grade) grade(base);
    seat.color = base.clone();
    const P = g.attributes.position, N = g.attributes.normal, T = g.attributes.leafT;
    const col = new Float32Array(P.count * 3);
    const c = new THREE.Color(), v = new THREE.Vector3(), n = new THREE.Vector3(), out = new THREE.Vector3();
    for (let k = 0; k < P.count; k++) {
      const t = T.getX(k);
      c.copy(base).multiplyScalar(lerp(0.84, 1.06, smoothstep(0, 0.85, t)) * lerp(1.04, 0.93, f));
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;

      v.fromBufferAttribute(P, k);
      n.fromBufferAttribute(N, k);
      out.copy(v).sub(centre).normalize();
      if (n.dot(out) < 0) n.negate();
      n.lerp(out, soft);
      // Bias toward the sky: a leaf whose shading normal points at the ground
      // catches nothing from a sky-lit scene and goes nearly black. Leaves
      // present themselves to the light.
      n.y += 0.4;
      n.normalize();
      N.setXYZ(k, n.x, n.y, n.z);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.deleteAttribute('leafT');

    // Double-face, keeping the normals.
    const ix = Array.from(g.getIndex().array);
    const n0 = ix.length;
    for (let k = 0; k < n0; k += 3) ix.push(ix[k], ix[k + 2], ix[k + 1]);
    g.setIndex(ix);
    parts.push(g);
  }
  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  merged.userData.leafSeats = seats;
  return merged;
}

/**
 * Where clusters go: at every limb tip, and along the outer, thinner part of
 * each limb. Leaves grow on young wood, not on the bole — and the crown has to
 * be filled from the branch structure that exists, or the mass floats free of
 * the tree ("a mass in the canopy has to exist in the branches first").
 */
export function leafAttachments(limbs, r, opts = {}) {
  const { spacing = 0.4, maxRadius = 0.12, outerFraction = 0.78 } = opts;
  const out = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (const L of limbs) {
    const ch = L.chain;
    if (ch.length < 2) continue;
    const s = [0];
    for (let i = 1; i < ch.length; i++) s.push(s[i - 1] + ch[i].pos.distanceTo(ch[i - 1].pos));
    const total = s[s.length - 1];
    let k = 0;
    for (let d = 0; d <= total * outerFraction; d += spacing * rr(r, 0.8, 1.25), k++) {
      const at = total - d;
      let i = s.findIndex((x) => x >= at);
      if (i <= 0) i = 1;
      const a = ch[i - 1], b = ch[i];
      const u = clamp((at - s[i - 1]) / Math.max(s[i] - s[i - 1], 1e-6), 0, 1);
      const rad = lerp(a.r, b.r, u);
      if (rad > maxRadius) break;
      const pos = a.pos.clone().lerp(b.pos, u);
      const tan = b.pos.clone().sub(a.pos).normalize();
      const outward = new THREE.Vector3(pos.x, 0, pos.z);
      if (outward.lengthSq() > 1e-6) outward.normalize();

      let axis;
      if (k === 0) {
        // At the tip: continue the limb, leaning up toward the light.
        axis = tan.clone().multiplyScalar(0.7).addScaledVector(up, 0.75).addScaledVector(outward, 0.25).normalize();
      } else {
        // Along the limb: leave it sideways, stepping round by the golden angle,
        // and sit ON the wood rather than being skewered by it.
        let side = new THREE.Vector3().crossVectors(tan, up);
        if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
        side.normalize().applyAxisAngle(tan, k * GOLDEN);
        axis = side.multiplyScalar(0.7).addScaledVector(up, 0.8).addScaledVector(outward, 0.3).normalize();
        pos.addScaledVector(axis, rad + 0.05);
      }
      out.push({ index: out.length, pos, axis, tip: k === 0, rad, scale: rr(r, 0.85, 1.2) * (k === 0 ? 1.08 : 1) });
    }
  }
  return out;
}

/** Matte: no specular at all, direct or image-based. Same rule as the wood. */
function killSpecular(mat, key) {
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

/**
 * Foliage for one tree.
 *
 * `clusterSource(r, variantIndex)` is the seam: it returns a BufferGeometry for
 * one cluster variant (position, normal, color). The default generates them; a
 * hand-authored glTF cluster would be plugged in here and nothing else changes.
 */
export function buildLeaves(limbs, r, opts = {}) {
  const {
    variants = 4,
    cluster = {},
    attach = {},
    clusterSource = (rng) => clusterGeometry(rng, cluster),
    // Per-environment foliage response, as a multiplier on the leaf albedo. NOT
    // baked light: it is a grade of the material, like the ground's, and the
    // leaves are still lit entirely by the scene. Values above 1 are allowed.
    albedoTint = null,
    // A per-site scale for the leaf cluster (Float32Array over `spots`). Bloom
    // amount controls a FOLIAGE RELATIONSHIP (flowers.js, BLOOM_FOLIAGE): the
    // crown is a shell, so in projection bloom piles up at the rim and full-size
    // leaf balls cover the rest — every amount read as a green tree in a coloured
    // wreath until the foliage gave way. `shrink` marks the flowering twigs, for
    // the debug view only.
    siteScale = null, shrink = null,
    // A per-site VALUE multiplier for the cluster's colour (flowers.js,
    // foliageContrast): the local stage for a bloom whose value fights the leaf.
    siteValue = null,
    // Debug view C: paint flowering-twig foliage hot orange and everything else
    // grey, ignoring the leaf colours. It answers the question the wreath hid for
    // three rounds — not "is there bloom through the crown" but "what is in
    // front of it".
    debugShrink = false,
    // Hand back every cluster's matrix, variant and tint (autumn's falling leaves
    // need to know where the real ones are). Off unless asked for.
    keepInstances = false,
  } = opts;

  const t0 = performance.now();
  const group = new THREE.Group();
  // The attachment points are shared: flowers and fruit (flowers.js) sit on the
  // same twigs the leaves do, so they are returned, and may be passed in.
  const spots = opts.spots ?? leafAttachments(limbs, r, attach);
  if (!spots.length) return { group, spots, stats: { clusters: 0, triangles: 0, ms: 0 } };

  const mat = killSpecular(new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: 1, metalness: 0, side: THREE.FrontSide,
  }), 'leaf-matte-v1');
  if (albedoTint) mat.color.copy(albedoTint);
  if (debugShrink) { mat.vertexColors = false; mat.needsUpdate = true; }

  const geos = [];
  for (let v = 0; v < variants; v++) geos.push(clusterSource(r, v));
  const buckets = geos.map(() => []);
  spots.forEach((sp, i) => buckets[i % variants].push(sp));

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion();
  const Y = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), tint = new THREE.Color();
  const instances = keepInstances ? [] : null;
  let triangles = 0;
  for (let v = 0; v < variants; v++) {
    const items = buckets[v];
    if (!items.length) continue;
    const im = new THREE.InstancedMesh(geos[v], mat, items.length);
    im.castShadow = true;
    im.receiveShadow = true;
    im.frustumCulled = false;
    items.forEach((sp, i) => {
      q.setFromUnitVectors(Y, sp.axis);
      q2.setFromAxisAngle(sp.axis, r() * Math.PI * 2);
      q.premultiply(q2);
      sc.setScalar(sp.scale * (siteScale ? siteScale[sp.index] : 1));
      im.setMatrixAt(i, m.compose(sp.pos, q, sc));
      // Cluster-to-cluster drift in value, so the crown is not one flat green.
      const k = rr(r, 0.9, 1.08) * (siteValue ? siteValue[sp.index] : 1);
      tint.setRGB(k, k * rr(r, 0.98, 1.03), k * rr(r, 0.94, 1.0));
      if (debugShrink) tint.set(shrink && shrink.has(sp) ? 0xff6a00 : 0xb9bcc0);
      im.setColorAt(i, tint);
      if (instances) instances.push({ variant: v, matrix: m.clone(), tint: tint.clone() });
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    group.add(im);
    triangles += (geos[v].index.count / 3) * items.length;
  }
  return {
    group,
    spots,
    instances,
    seats: instances ? geos.map((g) => g.userData.leafSeats ?? null) : null,
    stats: { clusters: spots.length, triangles: Math.round(triangles), drawCalls: group.children.length, ms: Math.round(performance.now() - t0) },
  };
}

// --- autumn: leaves fall when the wind blows --------------------------------------

/** One free leaf, unit length. Truly two-sided: a tumbling leaf shows both faces to the light. */
function fallingLeafGeometry() {
  const front = leafGeometry({ length: 1 });
  const T = front.attributes.leafT, col = new Float32Array(T.count * 3);
  // The cluster leaf's own base-to-tip gradient, on white: the instance colour is the leaf's.
  for (let k = 0; k < T.count; k++) col.fill(lerp(0.84, 1.06, smoothstep(0, 0.85, T.getX(k))), k * 3, k * 3 + 3);
  front.setAttribute('color', new THREE.BufferAttribute(col, 3));
  front.deleteAttribute('leafT');
  const back = front.clone();
  const ix = back.getIndex().array;
  for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; }
  const N = back.attributes.normal;
  for (let k = 0; k < N.count; k++) N.setXYZ(k, -N.getX(k), -N.getY(k), -N.getZ(k));
  return BufferGeometryUtils.mergeGeometries([front, back], false);
}

/**
 * AUTUMN: leaves come off the tree WHEN THE WIND BLOWS (the human, 2026-09-21).
 *
 * They are the tree's OWN leaves. Each one is born coincident with a real leaf of a
 * real cluster — same place, same angle, same size, same colour, the same
 * leafGeometry — and then separates. Its twin stays behind: with seventeen leaves in
 * a ball nobody can see that, and actually removing one would mean a per-vertex leaf
 * index and a per-instance mask in the material EVERY tree uses, to serve one season.
 * What they must never become is drifting particles with a life of their own (TASTE
 * #8, #9): in autumn shedding is what the tree DOES.
 *
 * CAUSED BY THE GUST, not by a timer: leaf i sheds in gust n if hash(i, n) is under
 * `rate` x that gust's strength. A strong gust takes several, a weak one one or
 * none, and nothing falls in the calm.
 *
 * STATELESS. A leaf's whole life — on the twig, torn off, swinging down, at rest —
 * is a function of (t, i). Nothing is integrated, nothing depends on the frame rate,
 * and `t=` pins the leaves exactly as it pins the wind. (What IS kept per leaf is a
 * cache of the life it is currently in, recomputed whenever that changes.)
 *
 * THE GROUND IS BOUNDED BY CONSTRUCTION. The pool is fixed. A leaf that comes down
 * over the island rests on the turf; one shed from the rim — most of them, the crown
 * overhangs the island — falls past the edge and out of the frame. A resting leaf
 * stays until its pool slot sheds again, and shrinks away just before, while the eye
 * is on the gust. So the most that can ever lie on the lawn is the pool: a scatter,
 * not a pile. And because history is only a function of time, at t = 0 a few leaves
 * are already down from gusts "before" the page opened.
 *
 * AMBIENT (W1): nothing here is measured, and nothing is the site's seed.
 *
 * Every number below is visual-3d's default, not an art-direction decision.
 *
 * @param instances  buildLeaves(...).instances — { variant, matrix, tint } per cluster
 * @param seats      buildLeaves(...).seats     — per variant, { matrix, size, color, shade } per leaf
 * @param opts.automatic false => only shed on burst(t, point); use the same flight and landing
 * @param opts.ground (x, z) => the height a leaf rests at, or null where there is no ground
 */
export function buildLeafFall(instances, seats, opts = {}) {
  const {
    count = 32, rate = 0.16, fallSpeed = 0.78, drift = 1.15, swing = 0.24,
    ground = () => null, floor = -4.2, G = GUST, automatic = true,
  } = opts;
  const group = new THREE.Group();
  if (!instances || !instances.length || !seats || seats.some((s) => !s || !s.length)) return { group, material: null, update() {}, burst() {}, stats: { pool: 0 } };

  const material = killSpecular(new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: 1, metalness: 0, side: THREE.FrontSide,
  }), 'leaf-matte-v1');
  const mesh = new THREE.InstancedMesh(fallingLeafGeometry(), material, count);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  // The colour buffer must exist BEFORE the first compile, or the program is built
  // without instance colour and every leaf that later sheds comes out white.
  mesh.setColorAt(0, new THREE.Color(1, 1, 1));
  group.add(mesh);

  const WIND = new THREE.Vector3(1, 0, 0.45).normalize();   // the sway's own dominant axis
  const UP = new THREE.Vector3(0, 1, 0);
  const SEARCH = 48;                                         // gusts to look back through for a leaf's last shed
  const TAU = 0.55;                                          // it accelerates off the twig; it does not start at speed
  const ease = (a) => a - TAU * (1 - Math.exp(-a / TAU));    // = 0 with zero slope at a = 0, then ~ a - TAU

  const sheds = (i, n) => { const g = gustSlot(n, G); return g.strength > 0 && hash01(i * 7919 + 13, n) < rate * g.strength ? g : null; };
  // Torn off around the gust's peak, not all at one instant.
  const shedAt = (i, g) => g.at - 0.5 + 1.9 * hash01(i * 31 + 5, g.n);

  const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), ax = new THREE.Vector3(), c = new THREE.Color();

  /** Where a life is at `age`, before any landing: position into `out`. */
  function flight(L, age, out) {
    const k = 1 - Math.exp(-age / 0.8);                      // the swing builds; it is not there at the twig
    const d = L.strength * drift * (1 - Math.exp(-age / 2.4));
    out.copy(L.p0).addScaledVector(WIND, d);
    out.x += Math.sin(L.w1 * age + L.f1) * L.swing * k;
    out.z += Math.cos(L.w2 * age + L.f2) * L.swing * 0.8 * k;
    out.y -= fallSpeed * L.heavy * ease(age);
    return out;
  }

  /** Everything about the life leaf i began in gust g — computed once per life. */
  function lifeOf(i, g, origins = instances) {
    const h = (salt) => hash01(i * 101 + salt, g.n);
    const inst = origins[Math.floor(h(1) * origins.length)];
    const pool = seats[inst.variant];
    const seat = pool[Math.floor(h(2) * pool.length)];
    const L = { n: g.n, t0: shedAt(i, g), strength: g.strength, p0: new THREE.Vector3(), q0: new THREE.Quaternion(), s0: 1,
      color: seat.color.clone().multiply(inst.tint).multiplyScalar(seat.shade),
      w1: lerp(2.3, 3.6, h(3)), w2: lerp(2.0, 3.2, h(4)), f1: h(5) * 6.283, f2: h(6) * 6.283,
      swing: swing * lerp(0.6, 1.4, h(7)), heavy: lerp(0.8, 1.25, h(8)),
      spinAxis: new THREE.Vector3(h(9) - 0.5, (h(10) - 0.5) * 0.6, h(11) - 0.5).normalize(), spin: lerp(1.6, 3.4, h(12)) * (h(13) < 0.5 ? -1 : 1),
      landAge: Infinity, rest: new THREE.Vector3(), restQ: new THREE.Quaternion() };
    m4.multiplyMatrices(inst.matrix, seat.matrix).decompose(L.p0, L.q0, sc);
    L.s0 = sc.x * seat.size;
    // Where and when it comes down. March the flight until it meets the ground under it,
    // then bisect; past the island's edge there is no ground and it simply keeps falling.
    const over = (a) => { flight(L, a, p); const gy = ground(p.x, p.z); return gy === null ? -1 : gy - p.y; };
    let a0 = 0, hit = false;
    for (let a = 0.1; a < 22; a += 0.1) { if (over(a) >= 0) { hit = true; a0 = a - 0.1; break; } if (p.y < floor) break; }
    if (hit) {
      let lo = a0, hi = a0 + 0.1;
      for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (over(mid) >= 0) hi = mid; else lo = mid; }
      L.landAge = hi;
      flight(L, hi, L.rest); L.rest.y = ground(L.rest.x, L.rest.z);
      // Lying on the grass: upper face to the sky, any way round, never quite flat.
      L.restQ.setFromAxisAngle(UP, h(14) * 6.283)
        .multiply(qa.setFromAxisAngle(ax.set(1, 0, 0), -Math.PI / 2 + lerp(-0.22, 0.22, h(15))))
        .multiply(qb.setFromAxisAngle(ax.set(0, 1, 0), lerp(-0.3, 0.3, h(16))));
    }
    return L;
  }

  const lives = new Array(count).fill(null);
  let burstId = 0, cursor = 0;
  // Taps use the same leaf seats, flight and landing as autumn. A separate bounded
  // pool means the ambient autumn cycle cannot overwrite a leaf halfway down.
  function burst(t, point = null, amount = 7) {
    if (automatic) return;
    update(t);
    let origins = instances;
    if (point) {
      origins = [...instances].sort((a, b) => {
        const distance = item => point.distanceToSquared(p.setFromMatrixPosition(item.matrix));
        return distance(a) - distance(b);
      }).slice(0, Math.min(24, instances.length));
    }
    const event = { n: ++burstId + 100000, at: t, strength: 1 };
    let released = 0;
    for (let tried = 0; tried < count && released < Math.min(amount, count); tried++) {
      const i = cursor++ % count;
      if (lives[i]) continue; // rapid taps never erase a leaf in mid-flight
      const j = released++;
      const L = lives[i] = lifeOf(i, event, origins);
      L.t0 = t + .32 * hash01(j, event.n);
      mesh.setColorAt(i, L.color);
    }
    mesh.instanceColor.needsUpdate = true;
    update(t);
  }

  const HIDE = new THREE.Matrix4().makeScale(0, 0, 0);

  function update(t) {
    const N = Math.floor(t / G.slot);
    let colourChanged = false;
    for (let i = 0; i < count; i++) {
      let L = lives[i], keep = 1;
      if (automatic) {
        // Latest natural gust at or before now; preserve autumn's deterministic cycle.
        let g = null;
        for (let n = N + 1; n > N - SEARCH && !g; n--) { const s = sheds(i, n); if (s && shedAt(i, s) <= t) g = s; }
        if (!g) { lives[i] = null; mesh.setMatrixAt(i, HIDE); continue; }
        if (!L || L.n !== g.n) { L = lives[i] = lifeOf(i, g); mesh.setColorAt(i, c.copy(L.color)); colourChanged = true; }
        let next = Infinity;
        for (let n = g.n + 1; n <= N + 3 && next === Infinity; n++) { const s = sheds(i, n); if (s) next = shedAt(i, s); }
        // Never evaluate smoothstep(Infinity, Infinity, t): it yields NaN geometry.
        keep = next === Infinity ? 1 : 1 - smoothstep(next - 1.4, next - 0.3, t);
      } else {
        if (!L || t < L.t0) { mesh.setMatrixAt(i, HIDE); continue; }
        // A few seconds on the grass, then give the slot back without piling up.
        const end = L.t0 + Math.min(18, L.landAge + 4);
        if (t >= end) { lives[i] = null; mesh.setMatrixAt(i, HIDE); continue; }
        keep = 1 - smoothstep(end - 1.4, end, t);
      }

      const age = t - L.t0;
      if (age >= L.landAge) {
        p.copy(L.rest); q.copy(L.restQ);
      } else {
        flight(L, age, p);
        if (p.y < floor) { if (!automatic) lives[i] = null; mesh.setMatrixAt(i, HIDE); continue; }
        q.setFromAxisAngle(L.spinAxis, L.spin * ease(age)).multiply(L.q0);
        // It settles onto the grass over its last third of a second rather than snapping flat.
        if (L.landAge !== Infinity) q.slerp(L.restQ, smoothstep(L.landAge - 0.35, L.landAge, age));
      }
      mesh.setMatrixAt(i, m4.compose(p, q, sc.setScalar(L.s0 * keep)));
    }
    mesh.visible = automatic || lives.some(Boolean);
    mesh.instanceMatrix.needsUpdate = true;
    if (colourChanged && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  update(0);
  return { group, material, update, burst, stats: { pool: count, rate, fallSpeed } };
}
