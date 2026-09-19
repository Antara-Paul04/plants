// Scene, lighting, camera, loop.
//
// No post-processing. Everything you see is geometry, vertex colour and three
// lights — deliberately, so the look survives being ported anywhere later.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { rng } from './util.js';
import { buildTree } from './tree.js';
import { canopyLobes, buildFoliage, buildPetals, _orient } from './foliage.js';
import { buildIsland, buildGrass, buildRocks, radiusAt } from './island.js';

const SEED = 20260920;

const uniforms = { time: { value: 0 } };

// --- renderer -------------------------------------------------------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

// --- background -----------------------------------------------------------
// A soft vertical wash rather than a flat fill: flat colour makes the island
// look pasted on, a gradient gives it somewhere to sit.
{
  const g = new THREE.SphereGeometry(60, 32, 16);
  const top = new THREE.Color(0x6fb9db);
  const bot = new THREE.Color(0xf7efe0);
  const col = [];
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.smoothstep(pos.getY(i) / 60, -0.62, 0.04);
    const c = bot.clone().lerp(top, t);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false })));
}

// --- camera ---------------------------------------------------------------
// Narrow field of view. This is the main lever for the miniature feel: a wide
// lens makes a diorama look like a real place you are standing in.
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
camera.position.set(7.2, 5.5, 8.8);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 2.1, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 8;
controls.maxDistance = 22;
controls.minPolarAngle = 0.35;
controls.maxPolarAngle = Math.PI * 0.49;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.42;
controls.update();

// --- lighting -------------------------------------------------------------
// Key from front-left, a cool bounce from behind-right to separate the canopy
// from the background, and a hemisphere fill tinted sky-above / grass-below.
const key = new THREE.DirectionalLight(0xfff0d2, 3.0);
key.position.set(5.6, 9.2, 5.0);
key.castShadow = true;
key.shadow.mapSize.set(4096, 4096);
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
scene.add(key);
scene.add(key.target);
key.target.position.set(0, 1.6, 0);

const rim = new THREE.DirectionalLight(0xb9d8f0, 0.4);
rim.position.set(-6.0, 3.4, -5.2);
scene.add(rim);

// Shadowless front fill, kept low: enough to give the trunk a lit edge
// without flattening the key light's shaping everywhere else.
const fill = new THREE.DirectionalLight(0xffe9cf, 0.5);
fill.position.set(3.4, 2.2, 7.0);
scene.add(fill);

scene.add(new THREE.HemisphereLight(0xcde8ff, 0x88ad5c, 0.7));

// --- build ----------------------------------------------------------------
const r = rng(SEED);

const island = buildIsland(r);
scene.add(island);
scene.add(buildGrass(r, uniforms));
scene.add(buildRocks(r));

const tree = buildTree(r);
scene.add(tree.mesh);

const lobes = canopyLobes(tree.tips, r);
const foliage = buildFoliage(lobes, r, uniforms);
scene.add(foliage.group);

const petals = buildPetals(r, radiusAt, uniforms);
scene.add(petals.group);

// --- loop -----------------------------------------------------------------
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _d = new THREE.Vector3();

// Framing is composed for this much of the world; the field of view widens on
// narrow viewports so a portrait window does not crop the crown.
const FIT_H = 6.5;
const FIT_W = 6.8;
const DIST0 = camera.position.distanceTo(controls.target);

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) ||
      canvas.height !== Math.round(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    const half = Math.max(FIT_H / 2, FIT_W / (2 * aspect));
    camera.fov = 2 * Math.atan(half / DIST0) * (180 / Math.PI);
    camera.updateProjectionMatrix();
  }
}

const clock = new THREE.Clock();
function tick() {
  const t = clock.getElapsedTime();
  uniforms.time.value = t;

  // Drifting petals: fall, rotate, and loop back up to the canopy.
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
    petals.airMesh.setMatrixAt(i, _orient(_m, _p, _d, t * it.spin, new THREE.Vector3(it.s, it.s, it.s)));
  }
  petals.airMesh.instanceMatrix.needsUpdate = true;

  resize();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// Pause the idle spin while the user is inspecting, resume shortly after.
let resumeTimer = null;
controls.addEventListener('start', () => {
  controls.autoRotate = false;
  if (resumeTimer) clearTimeout(resumeTimer);
});
controls.addEventListener('end', () => {
  resumeTimer = setTimeout(() => (controls.autoRotate = true), 2500);
});

tick();
document.body.classList.add('ready');

// Exposed only so a screenshot can be taken at a fixed angle while iterating.
window.__scene = { scene, camera, controls, renderer };
