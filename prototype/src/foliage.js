// Canopy: leaves, blossoms, drifting petals.
//
// The brief's hard requirement was "not three green spheres". The approach:
// scatter thousands of small cupped leaf cards over a set of overlapping
// ellipsoid lobes that sit on the real branch tips.
//
// Three details do most of the work:
//   - each leaf's normal points OUTWARD from its lobe, not along its own face,
//     so the canopy shades like one soft volume instead of a glitter of cards
//   - density is biased toward each lobe's surface, leaving the interior open
//     so you can see through to the branches
//   - a low-frequency noise field carves air straight through the whole crown,
//     cutting across lobe boundaries. Without it, enough overlapping lobes to
//     make a convincing mass also make a cauliflower.

import * as THREE from 'three';
import { rr, lerp, clamp, smoothstep, noise3, applySway } from './util.js';

/** Duplicate every triangle with reversed winding, keeping the normals. */
function doubleFace(g) {
  const idx = g.getIndex().array;
  const out = Array.from(idx);
  for (let i = 0; i < idx.length; i += 3) out.push(idx[i], idx[i + 2], idx[i + 1]);
  g.setIndex(out);
  return g;
}

/** A small cupped blob. Irregular radius per vertex => no two leaves alike. */
function leafGeometry(r, segs) {
  const pos = [], idx = [];
  const radii = [];
  for (let i = 0; i < segs; i++) radii.push(rr(r, 0.84, 1.16));
  pos.push(0, 0, 0.15); // raised centre gives the card some volume
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pos.push(Math.cos(a) * radii[i] * 0.62, Math.sin(a) * radii[i] * 0.5, 0);
  }
  for (let i = 0; i < segs; i++) idx.push(0, 1 + i, 1 + ((i + 1) % segs));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return doubleFace(g);
}

/** Five rounded petals around a dimple. Reads as a blossom at camera distance. */
function blossomGeometry(r) {
  const pos = [], idx = [];
  const P = 5, LOB = 5;
  for (let p = 0; p < P; p++) {
    const base = pos.length / 3;
    const pa = (p / P) * Math.PI * 2 + rr(r, -0.1, 0.1);
    const cx = Math.cos(pa) * 0.4, cy = Math.sin(pa) * 0.4;
    pos.push(cx, cy, 0.055);
    for (let i = 0; i < LOB; i++) {
      const a = (i / LOB) * Math.PI * 2;
      const rad = 0.26 * rr(r, 0.84, 1.16);
      pos.push(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, -0.02);
    }
    for (let i = 0; i < LOB; i++) idx.push(base, base + 1 + i, base + 1 + ((i + 1) % LOB));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return doubleFace(g);
}

/** Orient +Z toward `dir`, then spin randomly around it. */
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 0, 1);
const _upY = new THREE.Vector3(0, 1, 0); // world up, for tipping normals skyward
function orient(obj, pos, dir, roll, scale) {
  _q.setFromUnitVectors(_up, dir);
  _q2.setFromAxisAngle(dir, roll);
  _q.premultiply(_q2);
  obj.compose(pos, _q, scale);
  return obj;
}

/**
 * Canopy lobes, derived from the tree's real branch tips plus a few fillers
 * that round out the top of the silhouette.
 */
export function canopyLobes(tips, r, params = {}) {
  const { lobeScale = 1, lobeSpread = 1, crownW = 1, crownH = 1 } = params;
  const lobes = [];
  // Where the crown radiates from. Only used to push clumps outward along
  // their own limb, so the canopy hangs off branches instead of forming a ball.
  const hub = new THREE.Vector3(0, 2.95, 0);

  for (const t of tips) {
    // Size varies hard from lobe to lobe. Lots of similar-sized bumps tiling a
    // convex hull is *exactly* what reads as cauliflower; a few big masses with
    // small satellites between them reads as a tree. So the draw is roughly
    // bimodal rather than a narrow band around 1.
    const big = r() < 0.38;
    const k = (big ? rr(r, 1.2, 1.54) : rr(r, 0.5, 0.82)) * lobeScale;

    const c = t.p.clone().add(new THREE.Vector3(rr(r, -0.16, 0.16), rr(r, 0.06, 0.54), rr(r, -0.18, 0.18)));
    const away = c.clone().sub(hub);
    away.y *= 0.62; // spread sideways a little more than upward, but not flat
    if (away.lengthSq() > 1e-6) c.addScaledVector(away.normalize(), rr(r, -0.14, 0.2) * lobeSpread);

    // Gently squeeze the crown inward and stretch it upward about the hub.
    // Spreading the lobes for air made the canopy read as a wide flat parasol;
    // this puts the dome back without adding filler lobes, which is what made
    // it a cauliflower in the first place.
    //
    // crownW / crownH ride on the same transform. This is the one crown change
    // that survives being shrunk to a thumbnail: a narrow upright tree and a
    // broad spreading one are different SHAPES, where more or fewer branches is
    // just more or less of the same shape.
    c.x *= 0.9 * crownW;
    c.z *= 0.9 * crownW;
    c.y = hub.y + (c.y - hub.y) * 1.16 * crownH;

    lobes.push({
      c,
      rx: t.w * k * rr(r, 0.76, 1.1),
      ry: t.w * k * rr(r, 0.62, 0.94), // a touch flattened: clumps, not balls
      rz: t.w * k * rr(r, 0.76, 1.1),
    });
  }

  // Fillers. These used to close every gap between limbs so the crown read as
  // one mass — which is what made it a cauliflower. Now there are five, and
  // they only give the crown a top and two shoulders. The gaps stay open.
  const fill = [
    [-0.04, 3.96, 0.04, 0.96, 0.76, 0.92],
    [-0.68, 3.5, 0.44, 0.78, 0.64, 0.74],
    [0.74, 3.56, -0.38, 0.8, 0.64, 0.76],
    [-1.0, 3.04, -0.2, 0.52, 0.46, 0.5],
    [0.96, 3.1, 0.24, 0.54, 0.46, 0.52],
  ];
  for (const f of fill) {
    lobes.push({
      c: new THREE.Vector3(f[0] * crownW, hub.y + (f[1] - hub.y) * crownH, f[2] * crownW),
      rx: f[3] * rr(r, 0.9, 1.1) * lobeScale,
      ry: f[4] * rr(r, 0.9, 1.1) * lobeScale,
      rz: f[5] * rr(r, 0.9, 1.1) * lobeScale,
    });
  }
  return lobes;
}

// Fallback palette — the NORMAL baseline. Real values arrive via params.
const LEAF = { deep: new THREE.Color(0x2f6136), mid: new THREE.Color(0x4e9142), lit: new THREE.Color(0x8cc44f) };
const BLOSSOM = [new THREE.Color(0xf7a6b8), new THREE.Color(0xe87b92), new THREE.Color(0xfdd6dc)];

// Leaf attempts at amount = 1. Attempts, not leaves: most of the rejections
// below exist to remove leaves rather than relocate them, so the accepted count
// is allowed to fall.
const BASE_ATTEMPTS = 41000;

export function buildFoliage(lobes, r, uniforms, params = {}) {
  const {
    amount = 1,
    airE0 = 0.24,
    airE1 = 0.05,
    palette = LEAF,
    emissive = 0x27491f,
    shellBias = 0.32,
    flowers = { clusters: 215, colors: BLOSSOM },
    fruit = { enabled: false, count: 0, color: null },
    detail = 1,
  } = params;

  const group = new THREE.Group();
  const swayOpts = { amp: 0.05, speed: 0.8, yLo: 1.5, yHi: 4.5 };

  // Total canopy volume, so leaf count follows the shape rather than the
  // lobe count (big lobes should not look sparse next to small ones).
  const vols = lobes.map((l) => l.rx * l.ry * l.rz);
  const totalVol = vols.reduce((a, b) => a + b, 0);
  const ATTEMPTS = Math.round(BASE_ATTEMPTS * amount * detail);

  let leafCount = 0;

  if (ATTEMPTS > 0) {
    // Three leaf shapes, so the canopy is not a repeat of one silhouette.
    const variants = [leafGeometry(r, 7), leafGeometry(r, 8), leafGeometry(r, 6)];
    const buckets = variants.map(() => []);

    let n = 0;
    for (let i = 0; i < ATTEMPTS; i++) {
      // Pick a lobe weighted by volume.
      let pick = r() * totalVol, li = 0;
      while (li < lobes.length - 1 && (pick -= vols[li]) > 0) li++;
      const L = lobes[li];

      // Random direction, then sit near the lobe's shell. The exponent keeps a
      // few leaves deep inside so the canopy has interior depth and occlusion.
      const th = r() * Math.PI * 2;
      const ph = Math.acos(2 * r() - 1);
      const d = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
      // Drop most downward-facing leaves: an open underside is what lets the
      // branch structure show, and it is the main thing separating this from
      // a shrub on a stick.
      if (d.y < -0.05 && r() < (0.34 - d.y * 0.92)) continue;
      // A few sprigs reach well past the shell. Without them the crown edge is
      // a clean scallop on every lobe, which is half of the cauliflower reading.
      const reach = r() < 0.055 ? rr(r, 1.1, 1.34) : r() < 0.12 ? rr(r, 1.0, 1.08) : 1.0;
      const shell = Math.pow(r(), shellBias) * reach;
      const p = new THREE.Vector3(
        L.c.x + d.x * L.rx * shell,
        L.c.y + d.y * L.ry * shell,
        L.c.z + d.z * L.rz * shell
      );

      // Carve air. A slow noise field punches channels and windows right
      // through the canopy, cutting across lobe boundaries so the holes belong
      // to the crown rather than to any one lobe. Soft-edged on purpose.
      //
      // The two edges are the DENSITY lever. Sliding the pair down opens
      // window-sized gaps; sliding it up closes them. Frequency is deliberately
      // left alone — raising it thins the canopy evenly, which reads moth-eaten
      // rather than airy, and that is not the difference we want to express.
      const airN = noise3(p.x * 0.92 + 4.2, p.y * 0.78, p.z * 0.92 - 1.7);
      if (r() > smoothstep(airE0, airE1, airN)) continue;

      // Outward normal of the lobe, jittered — this is what makes the canopy
      // shade as a volume. Straight card normals look like tinsel.
      const out = new THREE.Vector3(d.x / L.rx, d.y / L.ry, d.z / L.rz).normalize();
      out.x += rr(r, -0.42, 0.42);
      out.y += rr(r, -0.34, 0.5); // bias up: leaves present themselves to the sky
      out.z += rr(r, -0.42, 0.42);
      out.normalize();
      // Leaves out at the shell get tipped further toward the sky, and none of
      // them is allowed to point steeply down. A normal that faces neither the
      // key, the rim nor the sky is what produced the dark flecks along the
      // silhouette: those leaves had nothing left to catch.
      out.lerp(_upY, clamp((shell - 0.55) * 0.62, 0, 0.34));
      if (out.y < -0.12) out.y = -0.12;
      out.normalize();

      const s = rr(r, 0.082, 0.142) * lerp(0.78, 1.16, shell);
      const scale = new THREE.Vector3(s, s * rr(r, 0.88, 1.12), s);

      // Colour: brighter with height and with exposure, deeper in the interior.
      const up = clamp((p.y - 2.1) / 2.1, 0, 1);
      const expo = shell * 0.65 + up * 0.35;
      const col = palette.deep.clone().lerp(palette.mid, clamp(expo * 1.5, 0, 1));
      col.lerp(palette.lit, clamp((expo - 0.52) * 1.7, 0, 1) * rr(r, 0.55, 1.0));
      col.offsetHSL(rr(r, -0.022, 0.022), rr(r, -0.05, 0.05), rr(r, -0.035, 0.035));

      const v = (n * 7919) % 3;
      buckets[v].push({ p, out, roll: r() * Math.PI * 2, scale, col });
      n++;
    }
    leafCount = n;

    const leafMat = new THREE.MeshStandardMaterial({
      roughness: 0.78,
      metalness: 0,
      side: THREE.FrontSide,
      flatShading: false,
      emissive,
      emissiveIntensity: 0.52,
    });
    applySway(leafMat, uniforms, swayOpts);

    for (let v = 0; v < variants.length; v++) {
      const items = buckets[v];
      const im = new THREE.InstancedMesh(variants[v], leafMat, items.length);
      im.castShadow = true;
      im.receiveShadow = true;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        im.setMatrixAt(i, orient(_m, it.p, it.out, it.roll, it.scale));
        im.setColorAt(i, it.col);
      }
      im.instanceMatrix.needsUpdate = true;
      im.frustumCulled = false;
      group.add(im);
    }
  }

  // --- blossoms ----------------------------------------------------------
  // Grown in CLUSTERS, the way blossom actually appears. The clustering is what
  // stops brand colour reading as confetti scattered over a tree, so it holds
  // even when the colour itself is an unbotanical brand blue.
  const CLUSTERS = Math.round((flowers.clusters ?? 0) * detail);
  const cols = flowers.colors || BLOSSOM;
  const blossoms = [];
  for (let c = 0; c < CLUSTERS; c++) {
    let pick = r() * totalVol, li = 0;
    while (li < lobes.length - 1 && (pick -= vols[li]) > 0) li++;
    const L = lobes[li];
    const th = r() * Math.PI * 2;
    const ph = Math.acos(2 * r() - 1);
    const d = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
    if (d.y < -0.34) d.y = -0.34 + r() * 0.22;
    if (c % 3 === 0) d.y = Math.abs(d.y) * 0.9 + 0.25; // few blossoms on the underside
    d.normalize();
    const nb = 2 + Math.floor(r() * 4);
    const tone = r();
    for (let k = 0; k < nb; k++) {
      // Sit just proud of the leaf shell — nested in leaves, not out past them.
      // Jitter large enough to throw a blossom clear of the canopy is what made
      // the dark flecks: alone against the sky, with nothing to bounce light.
      const shell = rr(r, 0.94, 1.06);
      const jitter = new THREE.Vector3(rr(r, -0.2, 0.2), rr(r, -0.15, 0.15), rr(r, -0.2, 0.2));
      const p = new THREE.Vector3(
        L.c.x + d.x * L.rx * shell,
        L.c.y + d.y * L.ry * shell,
        L.c.z + d.z * L.rz * shell
      ).add(jitter);
      // Tilt toward the sky rather than straight out of the lobe. At the
      // silhouette the outward direction is roughly perpendicular to every
      // light in the scene, which is what rendered blossoms dead brown.
      const out = new THREE.Vector3(d.x / L.rx, d.y / L.ry, d.z / L.rz).normalize();
      out.multiplyScalar(0.5);
      out.y += 0.92;
      out.x += rr(r, -0.2, 0.2);
      out.y += rr(r, -0.05, 0.28);
      out.z += rr(r, -0.2, 0.2);
      if (out.y < 0.22) out.y = 0.22; // never face a blossom away from the sky
      out.normalize();
      const col = (tone < 0.46 ? cols[0] : tone < 0.86 ? cols[1] : cols[2])
        .clone()
        .offsetHSL(rr(r, -0.012, 0.012), rr(r, -0.07, 0.05), rr(r, -0.05, 0.05));
      blossoms.push({ p, out, roll: r() * Math.PI * 2, s: rr(r, 0.115, 0.185), col });
    }
  }

  if (blossoms.length) {
    const blossomGeo = blossomGeometry(r);
    const blossomMat = new THREE.MeshStandardMaterial({
      roughness: 0.62,
      metalness: 0,
      side: THREE.FrontSide,
      flatShading: true,
      // The floor a blossom falls to when turned away from every light. Derived
      // from the flower's own colour so a blue flower's shadow is a dark blue
      // rather than the hardcoded pink this used to be.
      emissive: cols[0].clone().offsetHSL(0, -0.1, -0.32).getHex(),
      emissiveIntensity: 0.4,
    });
    applySway(blossomMat, uniforms, swayOpts);
    const bm = new THREE.InstancedMesh(blossomGeo, blossomMat, blossoms.length);
    bm.castShadow = true;
    bm.frustumCulled = false;
    for (let i = 0; i < blossoms.length; i++) {
      const b = blossoms[i];
      bm.setMatrixAt(i, orient(_m, b.p, b.out, b.roll, new THREE.Vector3(b.s, b.s, b.s)));
      bm.setColorAt(i, b.col);
    }
    bm.instanceMatrix.needsUpdate = true;
    group.add(bm);

    // Tiny warm centres. Small, but they are what makes a blossom read as a
    // flower rather than a coloured dot — which matters more, not less, when
    // the colour is an arbitrary brand one.
    const coreGeo = new THREE.SphereGeometry(0.052, 6, 5);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xffd98a, roughness: 0.55 });
    applySway(coreMat, uniforms, swayOpts);
    const cm = new THREE.InstancedMesh(coreGeo, coreMat, blossoms.length);
    cm.frustumCulled = false;
    for (let i = 0; i < blossoms.length; i++) {
      const b = blossoms[i];
      const p = b.p.clone().addScaledVector(b.out, b.s * 0.1);
      cm.setMatrixAt(i, _m.compose(p, _q.identity(), new THREE.Vector3(b.s * 0.9, b.s * 0.9, b.s * 0.9)));
    }
    cm.instanceMatrix.needsUpdate = true;
    group.add(cm);
  }

  // --- fruit -------------------------------------------------------------
  // Stylised and abstract on purpose: small rounded forms hanging just under
  // the canopy shell, not a species. Fruit represents nothing analytical.
  let fruitCount = 0;
  if (fruit.enabled && fruit.count > 0) {
    const n = Math.max(6, Math.round(fruit.count * detail));
    const geo = new THREE.SphereGeometry(0.075, 8, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.42,
      metalness: 0,
      emissive: fruit.color.clone().offsetHSL(0, -0.05, -0.34).getHex(),
      emissiveIntensity: 0.3,
    });
    applySway(mat, uniforms, swayOpts);
    const im = new THREE.InstancedMesh(geo, mat, n);
    im.castShadow = true;
    im.frustumCulled = false;
    for (let i = 0; i < n; i++) {
      let pick = r() * totalVol, li = 0;
      while (li < lobes.length - 1 && (pick -= vols[li]) > 0) li++;
      const L = lobes[li];
      const th = r() * Math.PI * 2;
      const ph = Math.acos(2 * r() - 1);
      const d = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
      // Fruit hangs. Bias downward and sit just inside the shell so it is held
      // by leaves rather than stuck to the outside of the canopy.
      d.y = -Math.abs(d.y) * 0.85 - 0.18;
      d.normalize();
      const shell = rr(r, 0.72, 0.94);
      const p = new THREE.Vector3(
        L.c.x + d.x * L.rx * shell,
        L.c.y + d.y * L.ry * shell,
        L.c.z + d.z * L.rz * shell
      );
      const s = rr(r, 0.8, 1.22);
      _m.compose(p, _q.identity(), new THREE.Vector3(s, s * rr(r, 0.86, 1.04), s));
      im.setMatrixAt(i, _m);
      im.setColorAt(i, fruit.color.clone().offsetHSL(rr(r, -0.015, 0.015), rr(r, -0.08, 0.04), rr(r, -0.07, 0.05)));
    }
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
    fruitCount = n;
  }

  return { group, leafCount, blossomCount: blossoms.length, fruitCount };
}

/**
 * Ground litter: a scatter resting on the grass, and a few drifting down.
 * Restrained on purpose — this is atmosphere, not confetti. Only exists where
 * something is actually falling: blossom in flower, leaf in autumn, nothing
 * on a bare or wintering tree.
 */
export function buildPetals(r, islandRadiusAt, uniforms, params = {}) {
  const { litter = 'petal', litterColor = null, detail = 1 } = params;
  const group = new THREE.Group();
  if (litter === 'none') return { group, airMesh: null, drift: [] };

  const base = litterColor || BLOSSOM[0];
  const tintA = base.clone();
  const tintB = base.clone().offsetHSL(0, -0.12, litter === 'leaf' ? -0.08 : 0.14);

  const geo = doubleFace(new THREE.CircleGeometry(0.035, 5));
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.68,
    side: THREE.FrontSide,
    flatShading: false,
  });

  const FALLEN = Math.round((litter === 'leaf' ? 210 : 130) * detail);
  const fm = new THREE.InstancedMesh(geo, mat, FALLEN);
  fm.receiveShadow = true;
  for (let i = 0; i < FALLEN; i++) {
    // Denser near the trunk, thinning toward the rim — litter falls inward.
    const a = r() * Math.PI * 2;
    const rad = Math.pow(r(), 0.62) * islandRadiusAt(a) * 0.94;
    const p = new THREE.Vector3(Math.cos(a) * rad, 0.0, Math.sin(a) * rad);
    p.y = 0.235 * (1 - Math.pow(rad / 2.25, 2)) + 0.055;
    const up = new THREE.Vector3(rr(r, -0.3, 0.3), 1, rr(r, -0.3, 0.3)).normalize();
    const s = rr(r, 0.65, 1.1) * (litter === 'leaf' ? 1.35 : 1);
    fm.setMatrixAt(i, orient(_m, p, up, r() * Math.PI * 2, new THREE.Vector3(s, s, s)));
    fm.setColorAt(i, (r() < 0.5 ? tintA : tintB).clone().offsetHSL(0, rr(r, -0.06, 0.02), rr(r, -0.04, 0.04)));
  }
  fm.instanceMatrix.needsUpdate = true;
  group.add(fm);

  // Airborne. Animated in the viewer — a still scene of floating petals looks
  // wrong. Unlit on purpose: back-lit against the sky, a shaded petal reads as
  // a dead fly. Few of them — this is atmosphere, not weather.
  const AIR = 16;
  const airMat = new THREE.MeshBasicMaterial({ side: THREE.FrontSide, toneMapped: true });
  const am = new THREE.InstancedMesh(geo, airMat, AIR);
  am.frustumCulled = false;
  const drift = [];
  for (let i = 0; i < AIR; i++) {
    drift.push({
      a: r() * Math.PI * 2,
      rad: rr(r, 0.7, 3.1),
      y: rr(r, 0.35, 3.6),
      fall: rr(r, 0.13, 0.3),
      spin: rr(r, 0.5, 1.6) * (r() < 0.5 ? -1 : 1),
      orbit: rr(r, 0.05, 0.16) * (r() < 0.5 ? -1 : 1),
      s: rr(r, 0.45, 0.8),
      ph: r() * Math.PI * 2,
    });
    am.setColorAt(i, (r() < 0.5 ? tintA : tintB).clone());
  }
  group.add(am);

  return { group, airMesh: am, drift };
}

export { orient as _orient };
