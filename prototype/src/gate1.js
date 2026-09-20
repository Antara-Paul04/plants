// GATE 1 — the naked structure.
//
// Zero foliage, on purpose. A bare HTML site already exposes the whole branch
// system, so if the tree is not beautiful without leaves the structural model
// is wrong and foliage would only hide it. This page exists to be judged.
//
// The island is here because "rooted, not placed" is part of the gate — a tree
// floating in a void cannot be judged for whether it grows out of the ground.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const q = new URLSearchParams(location.search);

// Project modules are imported DYNAMICALLY with a cache-busting token.
//
// python's http.server serves ES modules with revalidation the browser is happy
// to skip, and a hard reload does not reliably re-fetch an already-imported
// module graph. Three consecutive edits to branching.js silently never reached
// the page, and the renders "verifying" them were of the previous build — the
// node count was identical each time, which was the only clue. Pass `&v=2`,
// `&v=3` ... while iterating and the page cannot lie to you.
const V = q.get('v');
const bust = V ? `?v=${encodeURIComponent(V)}` : '';
const { rng } = await import(`./util.js${bust}`);
const { buildSkeleton } = await import(`./branching.js${bust}`);
const { buildLimbs } = await import(`./limbmesh.js${bust}`);
const { buildIsland, buildGrass } = await import(`./island.js${bust}`);
const { makeRenderer, makeScene, fitCamera } = await import(`./viewer.js${bust}`);
const num = (k, d) => (q.has(k) ? parseFloat(q.get(k)) : d);

// Every knob is a query parameter so the look can be iterated without edits.
const P = {
  seed: num('seed', 7),
  alpha: num('alpha', 2.2),       // da Vinci exponent: 2 = area-preserving
  influence: num('influence', 16),
  kill: num('kill', 2.6),
  D: num('D', 0.17),
  points: num('points', 900),
  rx: num('rx', 2.7),
  ry: num('ry', 1.85),
  cy: num('cy', 4.0),
  hollow: num('hollow', 0.42),
  wobble: num('wobble', 0.16),
  tip: num('tip', 0.006),
  grow: num('grow', 3.4e-5),
  taper: num('taper', 0.013),
  smooth: num('smooth', 3),
  minStub: num('minStub', 0.3),
  maxChildren: num('kids', 2),
  trunkMin: num('trunkMin', 11),
  coarseCount: num('c1', 190),
  coarseKill: num('k1', 5.5),
  coarseInfluence: num('i1', 20),
  fineCount: num('c2', 950),
  fineKill: num('k2', 2.0),
  fineInfluence: num('i2', 7),
  fineShell: num('s2', 0.35),
  tipCount: num('c3', 1600),
  tipKill: num('k3', 1.5),
  tipInfluence: num('i3', 5),
  tipShell: num('s3', 0.72),
  tipD: num('d3', 0.62),
  tipWobble: num('w3', 1.15),
  showCloud: q.get('cloud') === '1',
  showGround: q.get('ground') !== '0',
};

const canvas = document.getElementById('scene');
const renderer = makeRenderer(canvas);
const uniforms = { time: { value: 0 } };
const scene = makeScene({
  top: new THREE.Color(0x8fc4de),
  bottom: new THREE.Color(0xf2ece1),
});

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
const geo = buildLimbs(skel.limbs, r);
const tMesh = performance.now() - t1;

const bark = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 0.82,
  metalness: 0,
  flatShading: false,
});
const tree = new THREE.Mesh(geo, bark);
tree.castShadow = true;
tree.receiveShadow = true;
scene.add(tree);

if (P.showGround) {
  scene.add(buildIsland(r, {}));
  scene.add(buildGrass(r, uniforms, { detail: 0.6 }));
}

// Debug: show what the structure was grown into.
if (P.showCloud) {
  const g = new THREE.BufferGeometry().setFromPoints(skel.cloud);
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.04, color: 0xd06a6a })));
}

// --- framing ---------------------------------------------------------------
const box = new THREE.Box3().setFromObject(tree);
const size = box.getSize(new THREE.Vector3());
const extents = {
  height: size.y * 1.12,
  width: Math.max(size.x, size.z) * 1.12,
  targetY: box.min.y + size.y * 0.55,
};

const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
camera.position.set(7.4, 4.6, 9.2);
const DIST0 = camera.position.length();

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, extents.targetY, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI * 0.52;
controls.update();

// --- stats -----------------------------------------------------------------
const tris = geo.index.count / 3;
const forks = skel.nodes.filter((n) => n.children.length > 1).length;
const depth = Math.max(...skel.limbs.map((l) => l.depth));
document.getElementById('hud').textContent =
  `seed ${P.seed} · a=${P.alpha} · infl ${P.influence}D · kill ${P.kill}D\n` +
  `${skel.nodes.length} nodes · ${skel.limbs.length} limbs · ${forks} forks · depth ${depth}\n` +
  `${(tris / 1000).toFixed(0)}k tri · grow ${tGrow.toFixed(0)}ms · mesh ${tMesh.toFixed(0)}ms`;

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) ||
      canvas.height !== Math.round(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    fitCamera(camera, extents, w / h, DIST0);
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
window.__gate1 = { skel, geo, P };
