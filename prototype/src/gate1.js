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
const uniforms = { time: { value: 0 } };

// --- environment states ------------------------------------------------------
// An environment is an ART-DIRECTED STATE, not a sampled hex value. Translating
// a dark website's ground colour literally into a dark scene gives muddy gloom:
// a dark website does not mean a dark tree. Every value below moves together —
// sky, key, fill, rim, image-based light, exposure — because that is what makes
// it a lighting state rather than a background swap.
//
// NIGHT is "moonlit diorama, not brightness slider at 20%". The tree stays
// properly exposed; what says night is COLOUR (a cool key, an indigo sky),
// DIRECTION (the moon is a three-quarter backlight, so every limb carries a
// silver edge and shadows fall toward the viewer) and CONTRAST (a high
// key-to-fill ratio with shadows that are deep blue, never black). That is how
// day-for-night has always been shot, and it is why it reads as night rather
// than as an underexposed afternoon.
const ENVS = {
  day: {
    skyTop: 0x4f95c8, skyHorizon: 0xdfe6e4, skyGround: 0x6f6a55,
    glow: { color: 0xfff0d8, power: 14, size: 9, dir: [5.6, 8.4, 5.4] },
    key: { color: 0xfff0dc, intensity: 3.3, dir: [5.6, 8.4, 5.4], shadowRadius: 2.4 },
    fill: null,
    rim: { color: 0xbcd6ee, intensity: 0.75, dir: [-6.5, 4.2, -5.6] },
    env: 0.85, exposure: 1.0,
  },
  night: {
    // The sky sits DARKER than the lit tree, so the tree is the brightest thing
    // in the frame — a first attempt had it the other way round, and the tree
    // became a black cut-out on a bright blue card.
    skyTop: 0x04060d, skyHorizon: 0x151e38, skyGround: 0x070a12,
    glow: { color: 0xcdd9ff, power: 12, size: 7, dir: [-5.2, 7.4, 6.2] },
    // The moon LIGHTS the tree, from the front quarter. Two lessons in it:
    //  - a pure backlight fails, because rough dark bark returns almost nothing
    //    to the camera and a back-lit tree is simply a silhouette;
    //  - a SATURATED blue key fails too, because warm-brown bark has almost no
    //    blue reflectance, so the wood goes black with a wet blue sheen.
    // Real moonlight is near-white — reflected sunlight; the blue is
    // perceptual — so the key is only gently cool and the night colour is
    // carried by the sky, the shadows and the ground instead.
    // A soft-edged SPOT rather than a directional: the light pools on the
    // island and falls away at its rim, which is what makes it a diorama
    // rather than a landscape at night.
    key: { color: 0xc9d6ff, intensity: 4.4, dir: [-5.2, 7.4, 6.2], shadowRadius: 1.6, spot: { angle: 0.33, penumbra: 1.0 } },
    // The silver edge: a second light from behind, doing what a backlit moon
    // would do if bark were not so rough.
    fill: { color: 0xdfe8ff, intensity: 2.2, dir: [6.0, 4.2, -6.2] },
    // A faint warm kicker keeps the wood reading as WOOD rather than slate.
    rim: { color: 0xffc890, intensity: 0.3, dir: [7.0, 1.8, 3.0] },
    // Ground response is its own value, because no light can do it: turf that
    // is lit at all by a cool key stays daytime green and becomes the brightest
    // thing in the frame. At night colour drains toward blue-grey and value
    // drops; the tree is the hero, the ground is where it stands.
    // Over-graded, this reads as FROST — pale blue-white turf is snow, and
    // that is a season, not a time of day. It has to stay recognisably grass.
    ground: { sat: 0.5, value: 0.36, tint: 0x5f7fae, tintAmt: 0.2 },
    env: 1.0, exposure: 1.15,
  },
};
const ENV = ENVS[q.get('envstate')] || ENVS.day;
renderer.toneMappingExposure = ENV.exposure * P.exposure;

function skyDome(radius, withGround) {
  const top = new THREE.Color(ENV.skyTop), hor = new THREE.Color(ENV.skyHorizon), gnd = new THREE.Color(ENV.skyGround);
  const g = new THREE.SphereGeometry(radius, 48, 24);
  const pos = g.attributes.position;
  const col = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / radius;
    if (y >= 0) c.copy(hor).lerp(top, Math.pow(y, 0.42));
    else c.copy(hor).lerp(withGround ? gnd : hor, Math.min(1, -y * 3.2));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false }));
}
const dirOf = (a) => new THREE.Vector3(...a).normalize();

// Grade a ground colour for the environment state: drain saturation toward its
// own luminance, pull it toward the state's tint, drop its value.
function gradeGround(hex) {
  const c = new THREE.Color(hex);
  const G = ENV.ground;
  if (!G) return c;
  const l = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
  c.lerp(new THREE.Color(l, l, l), 1 - G.sat);
  c.lerp(new THREE.Color(G.tint).multiplyScalar(l * 1.4), G.tintAmt);
  return c.multiplyScalar(G.value);
}

// Image-based light. Without an environment a rough dielectric has nothing to
// reflect and every shadowed surface falls to the same dead value. The env
// carries a soft glow in the key direction so the ambient has a direction too.
let envTex;
{
  const envScene = new THREE.Scene();
  envScene.add(skyDome(50, true));
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(ENV.glow.size, 24, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(ENV.glow.color).multiplyScalar(ENV.glow.power), toneMapped: false })
  );
  glow.position.copy(dirOf(ENV.glow.dir)).multiplyScalar(42);
  envScene.add(glow);
  const pm = new THREE.PMREMGenerator(renderer);
  envTex = pm.fromScene(envScene, 0.03).texture;
  pm.dispose();
}

const scene = new THREE.Scene();
scene.add(skyDome(60, false));
scene.environment = envTex;
scene.environmentIntensity = ENV.env * (P.env / 0.85);

// Key. By day it rakes across the trunk from the side — bark relief is only
// visible under grazing light, and a frontal key flattens it completely.
const keyI = ENV.key.intensity * (P.keyI / 3.3);
const key = ENV.key.spot
  ? new THREE.SpotLight(ENV.key.color, keyI, 0, ENV.key.spot.angle, ENV.key.spot.penumbra, 0) // decay 0: a moon does not fall off
  : new THREE.DirectionalLight(ENV.key.color, keyI);
key.position.copy(dirOf(ENV.key.dir)).multiplyScalar(ENV.key.spot ? 17 : 14);
key.castShadow = true;
key.shadow.mapSize.set(4096, 4096);
key.shadow.camera.near = 1;
key.shadow.camera.far = 34;
const S = 6.2;
if (!ENV.key.spot) Object.assign(key.shadow.camera, { left: -S, right: S, top: S, bottom: -S });
key.shadow.bias = -0.0002;
key.shadow.normalBias = 0.028;
key.shadow.radius = ENV.key.shadowRadius;
key.target.position.set(0, 2.6, 0);
scene.add(key, key.target);

for (const L of [ENV.fill, ENV.rim]) {
  if (!L) continue;
  const d = new THREE.DirectionalLight(L.color, L.intensity);
  d.position.copy(dirOf(L.dir)).multiplyScalar(12);
  scene.add(d);
}

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
  // The product's NORMAL terrain palette, graded for the environment state.
  const terrain = {
    lo: gradeGround(0x5e9e37), mid: gradeGround(0x81c246), hi: gradeGround(0xa8d95c),
    soilHi: gradeGround(0xa07b58), soilLo: gradeGround(0x6a5663),
  };
  scene.add(buildIsland(r, terrain));
  scene.add(buildGrass(r, uniforms, { ...terrain, detail: 0.6 }));
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
