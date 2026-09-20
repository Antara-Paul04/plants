// GATE 1 — the naked tree: structure AND surface.
//
// Zero foliage, on purpose. A bare HTML site already exposes the whole branch
// system, so if the tree is not beautiful without leaves, foliage would only be
// hiding the problem. This page exists to be judged.
//
// It carries its own lighting rig rather than the product's. The product rig
// was built to flatter a stylised tree under flat colour; a surfaced tree needs
// an environment to reflect and a key that rakes across the bark, or the
// material work is invisible.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const q = new URLSearchParams(location.search);

// Project modules are imported DYNAMICALLY with a cache-busting token.
//
// python's http.server serves ES modules with revalidation the browser is happy
// to skip, and a hard reload does not reliably re-fetch an already-imported
// module graph. Three consecutive edits once silently never reached the page —
// the node count coming back byte-identical was the only clue. Pass `&v=2`,
// `&v=3` ... while iterating and the page cannot lie to you.
const V = q.get('v');
const bust = V ? `?v=${encodeURIComponent(V)}` : '';
const { rng } = await import(`./util.js${bust}`);
const { buildSkeleton } = await import(`./branching.js${bust}`);
const { buildLimbs } = await import(`./limbmesh.js${bust}`);
const { makeBarkMaterial } = await import(`./bark.js${bust}`);
const { buildIsland, buildGrass } = await import(`./island.js${bust}`);
const { makeRenderer, fitCamera } = await import(`./viewer.js${bust}`);

// --- structure presets -------------------------------------------------------
// The two states the concept rests on. They are different ARCHITECTURE, not one
// tree at two densities: bare is the whole skeleton on display and gets MORE
// structure; sparse is a tree wearing few leaves and is the BROADEST in the set
// — few limbs held wide read as chosen, held narrow and high they read as
// starved. See docs/TREE-SYSTEM.md.
//
// minStub is 0.3 (about two segments) for both. The committed Gate 1 URLs said
// `minStub=5`, but that parameter was never wired into this page at the time,
// so it was silently ignored and the reviewed trees were pruned at the default.
// These presets reproduce the trees that were actually judged.
const PRESETS = {
  bare: {
    rx: 2.35, ry: 2.15, cy: 4.15, trunkMin: 8,
    c1: 230, k1: 5.0, c2: 1800, k2: 1.4, i2: 11, tip: 0.004, minStub: 0.3,
  },
  sparse: {
    rx: 2.75, ry: 1.55, cy: 3.45, trunkMin: 7,
    c1: 155, k1: 6.0, c2: 430, k2: 3.0, i2: 9, tip: 0.005, minStub: 0.3,
  },
};
const preset = PRESETS[q.get('preset')] || PRESETS.bare;
const num = (k, d) => (q.has(k) ? parseFloat(q.get(k)) : (k in preset ? preset[k] : d));

// Every knob is a query parameter so the look can be iterated without edits.
const P = {
  seed: num('seed', 7),
  alpha: num('alpha', 2.2),       // da Vinci exponent: 2 = area-preserving
  influence: num('influence', 16),
  kill: num('kill', 2.6),
  D: num('D', 0.17),
  points: num('points', 900),
  rx: num('rx', 2.35),
  ry: num('ry', 2.15),
  cy: num('cy', 4.15),
  hollow: num('hollow', 0.42),
  wobble: num('wobble', 0.16),
  tip: num('tip', 0.004),
  grow: num('grow', 3.4e-5),
  taper: num('taper', 0.013),
  smooth: num('smooth', 3),
  minStub: num('minStub', 0.3),
  maxChildren: num('kids', 2),
  trunkMin: num('trunkMin', 8),
  coarseCount: num('c1', 230),
  coarseKill: num('k1', 5.0),
  coarseInfluence: num('i1', 20),
  fineCount: num('c2', 1800),
  fineKill: num('k2', 1.4),
  fineInfluence: num('i2', 11),
  fineShell: num('s2', 0),
  tipCount: num('c3', 0),
  tipKill: num('k3', 1.5),
  tipInfluence: num('i3', 5),
  tipShell: num('s3', 0.72),
  tipD: num('d3', 0.62),
  tipWobble: num('w3', 1.15),
  // surface + light
  barkDepth: num('depth', 1.0),
  lichen: num('lichen', 0.55),
  env: num('env', 0.85),
  keyI: num('key', 3.3),
  exposure: num('exp', 1.0),
  showCloud: q.get('cloud') === '1',
  showGround: q.get('ground') !== '0',
  flat: q.get('flat') === '1',   // the old unsurfaced look, for A/B
};

const canvas = document.getElementById('scene');
const renderer = makeRenderer(canvas);
const TM = { neutral: THREE.NeutralToneMapping, aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping };
renderer.toneMapping = TM[q.get('tm')] ?? THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = P.exposure;
const uniforms = { time: { value: 0 } };

// --- sky, used twice: as the backdrop and as the thing the bark reflects -----
const SKY_TOP = new THREE.Color(0x4f95c8);
const SKY_HORIZON = new THREE.Color(0xdfe6e4);
const SKY_GROUND = new THREE.Color(0x6f6a55);
function skyDome(radius, withGround) {
  const g = new THREE.SphereGeometry(radius, 48, 24);
  const pos = g.attributes.position;
  const col = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / radius;
    if (y >= 0) c.copy(SKY_HORIZON).lerp(SKY_TOP, Math.pow(y, 0.42));
    else c.copy(SKY_HORIZON).lerp(withGround ? SKY_GROUND : SKY_HORIZON, Math.min(1, -y * 3.2));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false }));
}

const KEY_DIR = new THREE.Vector3(5.6, 8.4, 5.4).normalize();

// Image-based light. Without an environment a rough dielectric has nothing to
// reflect and every shadowed surface goes to the same dead value — which is a
// large part of why unsurfaced renders read as plastic. The env carries a warm
// soft "sun" in the key direction so the fill has a direction too.
{
  const envScene = new THREE.Scene();
  envScene.add(skyDome(50, true));
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(9, 24, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0d8).multiplyScalar(14), toneMapped: false })
  );
  sun.position.copy(KEY_DIR).multiplyScalar(42);
  envScene.add(sun);
  const pm = new THREE.PMREMGenerator(renderer);
  var envTex = pm.fromScene(envScene, 0.03).texture;
  pm.dispose();
}

const scene = new THREE.Scene();
scene.add(skyDome(60, false));
scene.environment = envTex;
scene.environmentIntensity = P.env;

// Key: warm, high and to the side, so it RAKES across the trunk. Bark relief is
// only visible under grazing light; a frontal key flattens it completely.
const key = new THREE.DirectionalLight(0xfff0dc, P.keyI);
key.position.copy(KEY_DIR).multiplyScalar(14);
key.castShadow = true;
key.shadow.mapSize.set(4096, 4096);
key.shadow.camera.near = 1;
key.shadow.camera.far = 34;
const S = 6.2;
Object.assign(key.shadow.camera, { left: -S, right: S, top: S, bottom: -S });
key.shadow.bias = -0.0002;
key.shadow.normalBias = 0.028;
key.shadow.radius = 2.4;
key.target.position.set(0, 2.6, 0);
scene.add(key, key.target);

// Cool rim from behind, to lift the shadow-side silhouette off the sky.
const rim = new THREE.DirectionalLight(0xbcd6ee, 0.75);
rim.position.set(-6.5, 4.2, -5.6);
scene.add(rim);

// --- build -------------------------------------------------------------------
const t0 = performance.now();
const r = rng(P.seed);
const skel = buildSkeleton(r, {
  cloud: { count: P.points, cy: P.cy, rx: P.rx, ry: P.ry, rz: P.rx, hollow: P.hollow },
  grow: { D: P.D, influence: P.influence, kill: P.kill, wobble: P.wobble, maxChildren: P.maxChildren, trunkMin: P.trunkMin },
  radii: { tip: P.tip, alpha: P.alpha, grow: P.grow, taper: P.taper },
  smooth: P.smooth,
  minStub: P.minStub,
  coarseCount: P.coarseCount, coarseKill: P.coarseKill, coarseInfluence: P.coarseInfluence,
  fineCount: P.fineCount, fineKill: P.fineKill, fineInfluence: P.fineInfluence, fineShell: P.fineShell,
  tipCount: P.tipCount, tipKill: P.tipKill, tipInfluence: P.tipInfluence, tipShell: P.tipShell, tipD: P.tipD, tipWobble: P.tipWobble,
});
const tGrow = performance.now() - t0;

const t1 = performance.now();
const DEBUG_LIMBS = q.get('debug') === 'limbs';
const geo = buildLimbs(skel.limbs, r, { debugColors: DEBUG_LIMBS });
const tMesh = performance.now() - t1;

const bark = DEBUG_LIMBS
  ? new THREE.MeshBasicMaterial({ vertexColors: true })
  : P.flat
  ? new THREE.MeshStandardMaterial({ color: 0x6b5443, roughness: 0.82, metalness: 0 })
  : makeBarkMaterial({ depth: P.barkDepth, lichen: P.lichen });
const tree = new THREE.Mesh(geo, bark);
tree.castShadow = true;
tree.receiveShadow = true;
scene.add(tree);

if (P.showGround) {
  scene.add(buildIsland(r, {}));
  scene.add(buildGrass(r, uniforms, { detail: 0.6 }));
}
if (P.showCloud) {
  const g = new THREE.BufferGeometry().setFromPoints(skel.cloud);
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.04, color: 0xd06a6a })));
}

// --- camera: reproducible shots ------------------------------------------------
// Judged at two distances or not judged at all. A tree that holds up in the hero
// shot and falls apart at the trunk is a thumbnail, not a tree.
const box = new THREE.Box3().setFromObject(tree);
const size = box.getSize(new THREE.Vector3());
const extents = { height: size.y * 1.12, width: Math.max(size.x, size.z) * 1.12, targetY: box.min.y + size.y * 0.55 };

// First real fork: follow the thickest child up from the root.
let fork = skel.nodes.find((n) => !n.parent);
while (fork.children.length === 1) fork = fork.children[0];

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
const controls = new OrbitControls(camera, canvas);
const shot = q.get('shot') || 'hero';
const SHOTS = {
  hero: { pos: [7.4, 4.6, 9.2], target: [0, extents.targetY, 0], fit: true },
  trunk: { pos: [1.55, 1.15, 2.15], target: [0, 0.95, 0], fov: 30 },
  fork: { pos: [fork.pos.x + 1.9, fork.pos.y + 0.35, fork.pos.z + 2.3], target: [fork.pos.x, fork.pos.y + 0.25, fork.pos.z], fov: 30 },
  crown: { pos: [3.4, 4.9, 4.2], target: [0.5, 4.5, 0], fov: 30 },
};
const SH = SHOTS[shot] || SHOTS.hero;
camera.position.set(...SH.pos);
controls.target.set(...SH.target);
if (SH.fov) camera.fov = SH.fov;
const DIST0 = camera.position.length();
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 0.6;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI * 0.52;
controls.update();

// --- stats -----------------------------------------------------------------
const tris = geo.index.count / 3;
const forks = skel.nodes.filter((n) => n.children.length > 1).length;
const hud = document.getElementById('hud');
hud.textContent =
  `${q.get('preset') || 'bare'} · seed ${P.seed} · a=${P.alpha} · shot ${shot}\n` +
  `${skel.nodes.length} nodes · ${skel.limbs.length} limbs · ${forks} forks\n` +
  `${(tris / 1000).toFixed(0)}k tri · grow ${tGrow.toFixed(0)}ms · mesh ${tMesh.toFixed(0)}ms`;
if (q.get('hud') === '0') hud.style.display = 'none';

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) ||
      canvas.height !== Math.round(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    if (SH.fit) fitCamera(camera, extents, w / h, DIST0);
    else { camera.aspect = w / h; camera.updateProjectionMatrix(); }
  }
}

const clock = new THREE.Clock();
function tick() {
  uniforms.time.value = clock.getElapsedTime();
  resize();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
document.body.classList.add('ready');
window.__gate1 = { skel, geo, P, camera, controls, scene, renderer };
