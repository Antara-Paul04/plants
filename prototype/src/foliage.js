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
export function canopyLobes(tips, r) {
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
    const k = big ? rr(r, 1.2, 1.54) : rr(r, 0.5, 0.82);

    const c = t.p.clone().add(new THREE.Vector3(rr(r, -0.16, 0.16), rr(r, 0.06, 0.54), rr(r, -0.18, 0.18)));
    const away = c.clone().sub(hub);
    away.y *= 0.62; // spread sideways a little more than upward, but not flat
    if (away.lengthSq() > 1e-6) c.addScaledVector(away.normalize(), rr(r, -0.14, 0.2));

    // Gently squeeze the crown inward and stretch it upward about the hub.
    // Spreading the lobes for air made the canopy read as a wide flat parasol;
    // this puts the dome back without adding filler lobes, which is what made
    // it a cauliflower in the first place. The lobes drift a little off their
    // branch tips as a result — under a tenth of a unit, and invisible.
    c.x *= 0.9;
    c.z *= 0.9;
    c.y = hub.y + (c.y - hub.y) * 1.16;

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
      c: new THREE.Vector3(f[0], f[1], f[2]),
      rx: f[3] * rr(r, 0.9, 1.1),
      ry: f[4] * rr(r, 0.9, 1.1),
      rz: f[5] * rr(r, 0.9, 1.1),
    });
  }
  return lobes;
}

// Palette. Deeper and cooler on the inside, warmer and brighter where light lands.
const LEAF_DEEP = new THREE.Color(0x2f6136);
const LEAF_MID = new THREE.Color(0x4e9142);
const LEAF_LIT = new THREE.Color(0x8cc44f);
const BLOSSOM_A = new THREE.Color(0xf7a6b8);
const BLOSSOM_B = new THREE.Color(0xe87b92);
const BLOSSOM_C = new THREE.Color(0xfdd6dc);

export function buildFoliage(lobes, r, uniforms) {
  const group = new THREE.Group();
  const swayOpts = { amp: 0.05, speed: 0.8, yLo: 1.5, yHi: 4.5 };

  // Total canopy volume, so leaf count follows the shape rather than the
  // lobe count (big lobes should not look sparse next to small ones).
  const vols = lobes.map((l) => l.rx * l.ry * l.rz);
  const totalVol = vols.reduce((a, b) => a + b, 0);
  // Attempts, not leaves. Most of the rejections below exist to carve air out
  // of the crown, so the accepted count has to be allowed to fall — refilling
  // every rejected leaf elsewhere would just move the density around.
  const ATTEMPTS = 41000;

  // Three leaf shapes, so the canopy is not a repeat of one silhouette.
  const variants = [leafGeometry(r, 7), leafGeometry(r, 8), leafGeometry(r, 6)];
  const buckets = variants.map(() => []);

  let n = 0;
  for (let i = 0; i < ATTEMPTS; i++) {
    // Pick a lobe weighted by volume.
    let pick = r() * totalVol, li = 0;
    while (li < lobes.length - 1 && (pick -= vols[li]) > 0) li++;
    const L = lobes[li];

    // Random direction, then sit near the lobe's shell. The cube root keeps a
    // few leaves deep inside so the canopy has interior depth and occlusion.
    const th = r() * Math.PI * 2;
    const ph = Math.acos(2 * r() - 1);
    const d = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
    // Drop most downward-facing leaves: an open underside is what lets the
    // branch structure show, and it is the main thing separating this from
    // a shrub on a stick.
    if (d.y < -0.05 && r() < (0.34 - d.y * 0.92)) continue;
    // A few sprigs reach well past the shell. Without them the crown edge is a
    // clean scallop on every lobe, which is half of the cauliflower reading.
    const reach = r() < 0.055 ? rr(r, 1.1, 1.34) : r() < 0.12 ? rr(r, 1.0, 1.08) : 1.0;
    const shell = Math.pow(r(), 0.32) * reach;
    const p = new THREE.Vector3(
      L.c.x + d.x * L.rx * shell,
      L.c.y + d.y * L.ry * shell,
      L.c.z + d.z * L.rz * shell
    );

    // Carve air. A slow noise field punches channels and windows right through
    // the canopy, cutting across lobe boundaries so the holes belong to the
    // crown rather than to any one lobe. Soft-edged on purpose — a hard cut
    // leaves a suspiciously clean rim around every gap.
    //
    // The frequency matters more than the amount: at a high frequency this
    // thins the whole canopy evenly, which reads as moth-eaten rather than
    // airy. Low frequency plus a fairly sharp cut gives a few window-sized
    // gaps with dense leaf between them, which is what was wanted.
    const airN = noise3(p.x * 0.92 + 4.2, p.y * 0.78, p.z * 0.92 - 1.7);
    if (r() > smoothstep(0.24, 0.05, airN)) continue;

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
    // silhouette: those leaves had nothing left to catch. Tipping only the
    // outer shell keeps the interior's volume shading intact.
    out.lerp(_upY, clamp((shell - 0.55) * 0.62, 0, 0.34));
    if (out.y < -0.12) out.y = -0.12;
    out.normalize();

    const s = rr(r, 0.082, 0.142) * lerp(0.78, 1.16, shell);
    const scale = new THREE.Vector3(s, s * rr(r, 0.88, 1.12), s);

    // Colour: brighter with height and with exposure, deeper in the interior.
    const up = clamp((p.y - 2.1) / 2.1, 0, 1);
    const expo = shell * 0.65 + up * 0.35;
    const col = LEAF_DEEP.clone().lerp(LEAF_MID, clamp(expo * 1.5, 0, 1));
    col.lerp(LEAF_LIT, clamp((expo - 0.52) * 1.7, 0, 1) * rr(r, 0.55, 1.0));
    col.offsetHSL(rr(r, -0.022, 0.022), rr(r, -0.05, 0.05), rr(r, -0.035, 0.035));

    const v = (n * 7919) % 3;
    buckets[v].push({ p, out, roll: r() * Math.PI * 2, scale, col });
    n++;
  }

  const leafMat = new THREE.MeshStandardMaterial({
    roughness: 0.78,
    metalness: 0,
    side: THREE.FrontSide,
    flatShading: false,
    emissive: 0x27491f,
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

  // --- blossoms ----------------------------------------------------------
  // Grown in clusters, the way blossom actually appears, and pushed slightly
  // proud of the leaf shell so they read without floating free of the canopy.
  // A few more clusters than before, because the canopy around them is now
  // thinner: the same number of blossoms read as fewer once the leaves opened up.
  const CLUSTERS = 215;
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
      // Sit just proud of the leaf shell — close enough to be nested in
      // leaves, not out past them. The old jitter was large enough to throw
      // blossoms clear of the canopy entirely, where they hung in the sky as
      // unlit specks with nothing around them to bounce light or to read them
      // against. That, not the material, was what made the dark flecks.
      const shell = rr(r, 0.94, 1.06);
      const jitter = new THREE.Vector3(rr(r, -0.2, 0.2), rr(r, -0.15, 0.15), rr(r, -0.2, 0.2));
      const p = new THREE.Vector3(
        L.c.x + d.x * L.rx * shell,
        L.c.y + d.y * L.ry * shell,
        L.c.z + d.z * L.rz * shell
      ).add(jitter);
      // Tilt blossoms toward the sky rather than straight out of the lobe.
      // Purely outward-facing flowers on the shaded side rendered dead brown,
      // which reads as rot. A blossom wants to catch light from almost
      // anywhere — and tilting up is what real blossom does anyway. The up
      // term now dominates: at the silhouette the outward direction is roughly
      // perpendicular to every light in the scene, which is the whole problem.
      const out = new THREE.Vector3(d.x / L.rx, d.y / L.ry, d.z / L.rz).normalize();
      out.multiplyScalar(0.5);
      out.y += 0.92;
      out.x += rr(r, -0.2, 0.2);
      out.y += rr(r, -0.05, 0.28);
      out.z += rr(r, -0.2, 0.2);
      if (out.y < 0.22) out.y = 0.22; // never face a blossom away from the sky
      out.normalize();
      const col = (tone < 0.46 ? BLOSSOM_A : tone < 0.86 ? BLOSSOM_B : BLOSSOM_C)
        .clone()
        .offsetHSL(rr(r, -0.012, 0.012), rr(r, -0.07, 0.05), rr(r, -0.05, 0.05));
      blossoms.push({ p, out, roll: r() * Math.PI * 2, s: rr(r, 0.115, 0.185), col });
    }
  }

  const blossomGeo = blossomGeometry(r);
  const blossomMat = new THREE.MeshStandardMaterial({
    roughness: 0.62,
    metalness: 0,
    side: THREE.FrontSide,
    flatShading: true,
    // Warmer and a little stronger than before: this is the floor a blossom
    // falls to when it is turned away from every light, so the floor has to be
    // a plausible shaded pink rather than a brown. Not the fix on its own —
    // the geometry above is what actually stopped them going dark — but it
    // keeps the worst-case petal inside the palette.
    emissive: 0xb0625f,
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
  // flower rather than a pink dot.
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

  return { group, blossomCount: blossoms.length };
}

/**
 * Petals: a scatter resting on the grass, and a few drifting down.
 * Restrained on purpose — this is atmosphere, not confetti.
 */
export function buildPetals(r, islandRadiusAt, uniforms) {
  const group = new THREE.Group();
  const geo = doubleFace(new THREE.CircleGeometry(0.035, 5));
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.68,
    side: THREE.FrontSide,
    flatShading: false,
  });

  const FALLEN = 130;
  const fm = new THREE.InstancedMesh(geo, mat, FALLEN);
  fm.receiveShadow = true;
  for (let i = 0; i < FALLEN; i++) {
    // Denser near the trunk, thinning toward the rim — petals fall inward.
    const a = r() * Math.PI * 2;
    const rad = Math.pow(r(), 0.62) * islandRadiusAt(a) * 0.94;
    const p = new THREE.Vector3(Math.cos(a) * rad, 0.0, Math.sin(a) * rad);
    p.y = 0.235 * (1 - Math.pow(rad / 2.25, 2)) + 0.055;
    const up = new THREE.Vector3(rr(r, -0.3, 0.3), 1, rr(r, -0.3, 0.3)).normalize();
    const s = rr(r, 0.65, 1.1);
    fm.setMatrixAt(i, orient(_m, p, up, r() * Math.PI * 2, new THREE.Vector3(s, s, s)));
    fm.setColorAt(i, (r() < 0.5 ? BLOSSOM_A : BLOSSOM_C).clone().offsetHSL(0, rr(r, -0.06, 0.02), rr(r, -0.04, 0.04)));
  }
  fm.instanceMatrix.needsUpdate = true;
  group.add(fm);

  // Airborne. Animated in main.js — a still scene of floating petals looks wrong.
  // Unlit on purpose: back-lit against the sky, a shaded petal reads as a dead
  // fly. Fewer of them, too — this is atmosphere, not weather.
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
    am.setColorAt(i, (r() < 0.5 ? BLOSSOM_A : BLOSSOM_B).clone());
  }
  group.add(am);

  return { group, airMesh: am, drift };
}

export { orient as _orient };
