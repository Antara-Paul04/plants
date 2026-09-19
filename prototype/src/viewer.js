// Renderer, lighting rig, background and framing — shared by the single-tree
// page and the comparison grid.
//
// This exists because the two pages must light and frame trees IDENTICALLY.
// If the grid had its own rig, every difference it showed would be partly the
// rig's, and the grid's whole job is to answer whether the trees differ.

import * as THREE from 'three';

export function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

/**
 * A soft vertical wash rather than a flat fill: flat colour makes the island
 * look pasted on, a gradient gives it somewhere to sit. The two colours come
 * from the DNA background — the contract's colour is the horizon, and the
 * gradient is built around it rather than replacing it.
 */
function backgroundSphere(bg) {
  const g = new THREE.SphereGeometry(60, 32, 16);
  const col = [];
  const pos = g.attributes.position;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.smoothstep(pos.getY(i) / 60, -0.62, 0.04);
    c.copy(bg.bottom).lerp(bg.top, t);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(
    g,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false })
  );
}

/**
 * Key from front-left, a cool bounce from behind-right to separate the canopy
 * from the background, and a hemisphere fill tinted sky-above / grass-below.
 *
 * `shadowMap` drops for the grid: eleven 4096² maps is roughly 1.5 GB of depth
 * texture, which is the first thing that falls over.
 */
export function makeScene(bg, { shadowMap = 4096 } = {}) {
  const scene = new THREE.Scene();
  scene.add(backgroundSphere(bg));

  const key = new THREE.DirectionalLight(0xfff0d2, 3.0);
  key.position.set(5.6, 9.2, 5.0);
  key.castShadow = true;
  key.shadow.mapSize.set(shadowMap, shadowMap);
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 26;
  const S = 5.2;
  key.shadow.camera.left = -S;
  key.shadow.camera.right = S;
  key.shadow.camera.top = S;
  key.shadow.camera.bottom = -S;
  key.shadow.bias = -0.00015;
  key.shadow.normalBias = 0.055;
  key.shadow.radius = 2.2;
  key.target.position.set(0, 1.6, 0);
  scene.add(key);
  scene.add(key.target);

  const rim = new THREE.DirectionalLight(0xb9d8f0, 0.4);
  rim.position.set(-6.0, 3.4, -5.2);
  scene.add(rim);

  // Shadowless front fill, kept low: enough to give the trunk a lit edge
  // without flattening the key light's shaping everywhere else.
  const fill = new THREE.DirectionalLight(0xffe9cf, 0.5);
  fill.position.set(3.4, 2.2, 7.0);
  scene.add(fill);

  scene.add(new THREE.HemisphereLight(0xcde8ff, 0x88ad5c, 0.7));
  return scene;
}

/**
 * Narrow field of view. This is the main lever for the miniature feel: a wide
 * lens makes a diorama look like a real place you are standing in. The FOV is
 * solved from the scene's own measured extents so a tall tree is not cropped
 * and a squat one does not float in the middle of an empty frame.
 */
export function fitCamera(camera, extents, aspect, distance, pad = 1.06) {
  const h = extents.height * pad;
  const w = extents.width * pad;
  const half = Math.max(h / 2, w / (2 * Math.max(aspect, 0.001)));
  camera.aspect = aspect;
  camera.fov = 2 * Math.atan(half / distance) * (180 / Math.PI);
  camera.updateProjectionMatrix();
}

/** Drifting litter: fall, rotate, and loop back up to the canopy. */
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _d = new THREE.Vector3();
const _s = new THREE.Vector3();
export function animateDrift(petals, t, orient) {
  if (!petals.airMesh) return;
  const d = petals.drift;
  for (let i = 0; i < d.length; i++) {
    const it = d[i];
    let y = it.y - t * it.fall;
    const span = 3.9;
    y = ((y - 0.15) % span + span) % span + 0.15;
    const a = it.a + t * it.orbit;
    const wob = Math.sin(t * 1.2 + it.ph) * 0.16;
    _p.set(Math.cos(a) * (it.rad + wob), y, Math.sin(a) * (it.rad + wob));
    _d.set(Math.sin(t * it.spin + it.ph), 0.45, Math.cos(t * it.spin * 0.8 + it.ph)).normalize();
    _s.set(it.s, it.s, it.s);
    petals.airMesh.setMatrixAt(i, orient(_m, _p, _d, t * it.spin, _s));
  }
  petals.airMesh.instanceMatrix.needsUpdate = true;
}
