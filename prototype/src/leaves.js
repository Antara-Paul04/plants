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
import { rr, lerp, clamp, smoothstep } from './util.js';

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

    // Colour: one of the greens per leaf, deeper at the base (it sits inside the
    // cluster), lighter toward the tip, and the rim leaves a little deeper than
    // the crown ones — form that survives perfectly even light.
    const base = palette[Math.floor(r() * palette.length)].clone();
    base.offsetHSL(rr(r, -0.012, 0.012), rr(r, -0.04, 0.04), rr(r, -0.03, 0.03));
    if (grade) grade(base);
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
  return BufferGeometryUtils.mergeGeometries(parts, false);
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
      out.push({ index: out.length, pos, axis, tip: k === 0, scale: rr(r, 0.85, 1.2) * (k === 0 ? 1.08 : 1) });
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
    // Debug view C: paint flowering-twig foliage hot orange and everything else
    // grey, ignoring the leaf colours. It answers the question the wreath hid for
    // three rounds — not "is there bloom through the crown" but "what is in
    // front of it".
    debugShrink = false,
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
      const k = rr(r, 0.9, 1.08);
      tint.setRGB(k, k * rr(r, 0.98, 1.03), k * rr(r, 0.94, 1.0));
      if (debugShrink) tint.set(shrink && shrink.has(sp) ? 0xff6a00 : 0xb9bcc0);
      im.setColorAt(i, tint);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    group.add(im);
    triangles += (geos[v].index.count / 3) * items.length;
  }
  return {
    group,
    spots,
    stats: { clusters: spots.length, triangles: Math.round(triangles), drawCalls: group.children.length, ms: Math.round(performance.now() - t0) },
  };
}
