// GATE pages — the debug HOST for the new tree (gate1.html: the naked tree;
// gate2.html: foliage, bloom, fruit, winter).
//
// This file used to BE the tree: the whole scene was its top-level body, so the
// tree could only ever exist on this page. The tree now lives in grow.js, which
// the product also grows from (main.js -> mountTree). What stays here is what
// belongs to a page that exists to be judged: reproducible camera shots, the
// HUD, and `window.__gate1` for probes and capture scripts.
//
// Every parameter is a query parameter. See grow.js for what they are.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const url = new URLSearchParams(location.search);

// `?v=N` reaches every project module through grow.js — see loadModules there.
const V = url.get('v');
const bust = V ? `?v=${encodeURIComponent(V)}` : '';
const { loadModules, paramSource, resolveParams, createEnvironment, growTree } = await import(`./grow.js${bust}`);
const { makeRenderer, fitCamera } = await import(`./viewer.js${bust}`);
const M = await loadModules(bust);

// The page's own default (gate2.html turns leaves on) sits UNDER the URL.
const q = paramSource({ leaves: window.__LEAVES_DEFAULT ?? '0' }, url);
const { P } = resolveParams(q);

const canvas = document.getElementById('scene');
const renderer = makeRenderer(canvas);
// `gust` makes the wind weather (util.js gustAt). `gust=0` is the constant sway; `wind=0`
// drops it too, so that the grass, like the tree, is then exactly what it was before wind.
const GUSTS = q.get('gust') !== '0' && q.get('wind') !== '0';
const uniforms = { time: { value: 0 }, ...(GUSTS ? { gust: { value: 1 } } : {}) };

const env = createEnvironment(renderer, q, P);
env.apply();
const scene = env.scene;

// Straight through, no slicing: this page is a measuring instrument and its
// timings should be the build's, not the scheduler's.
const built = await growTree(M, q, env, { uniforms, budgetMs: Infinity });
const { tree, ground, skel, geo, thick, stats } = built;
scene.add(tree, ground);
if (built.cloud) scene.add(built.cloud);

// --- camera: reproducible shots ------------------------------------------------
// Judged at two distances or not judged at all. A tree that holds up in the hero
// shot and falls apart at the trunk is a thumbnail, not a tree.
const extents = built.extents;

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
const tris = stats.tris;
const forks = skel.nodes.filter((n) => n.children.length > 1).length;
const hud = document.getElementById('hud');
hud.textContent =
  `${q.get('preset') || 'bare'} · seed ${P.seed} · a=${P.alpha} · shot ${shot} · ${built.season} · ${env.name}\n` +
  `${skel.nodes.length} nodes · ${skel.limbs.length} limbs · ${forks} forks\n` +
  `${(tris / 1000).toFixed(0)}k tri · grow ${stats.growMs.toFixed(0)}ms · mesh ${stats.meshMs.toFixed(0)}ms` +
  (stats.field ? `\nfield ${JSON.stringify(stats.field)}` : '') +
  (stats.leaves ? `\nleaves ${JSON.stringify(stats.leaves)}` : '') +
  (stats.flowers ? `\nflowers ${JSON.stringify(stats.flowers)}` : '') +
  (stats.fruit ? `\nfruit ${JSON.stringify(stats.fruit)}` : '') +
  (stats.winter ? `\nwinter ${JSON.stringify(stats.winter)}` : '') +
  (stats.wind ? `\nwind ${JSON.stringify(stats.wind)}` : '');
if (q.get('hud') === '0') hud.style.display = 'none';

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) ||
      canvas.height !== Math.round(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    // `fit=lens` is the fit as it was before the lens was capped (no controls handed
    // over: fitCamera is then the old function, bit for bit) — the BEFORE of an A/B.
    if (SH.fit) fitCamera(camera, extents, w / h, DIST0, undefined, q.get('fit') === 'lens' ? null : controls);
    else { camera.aspect = w / h; camera.updateProjectionMatrix(); }
  }
}

// `t=SECONDS` pins the wind's clock. This page is a measuring instrument, and once
// the crown sways two captures of one tree differ by wherever the wind happened to
// be — so a pixel comparison needs either a pinned time or `wind=0` (no wind at all,
// and byte-identical shaders to the tree before wind existed).
const T_FIXED = q.has('t') ? parseFloat(q.get('t')) : null;
const clock = new THREE.Clock();
function tick() {
  const t = T_FIXED ?? clock.getElapsedTime();
  uniforms.time.value = t;
  if (uniforms.gust) uniforms.gust.value = M.util.gustAt(t);
  if (built.update) built.update(t);
  resize();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
document.body.classList.add('ready');
window.__gate1 = { skel, geo, thick, tris, wind: built.wind, uniforms, update: built.update, leafFall: stats.leafFall, faces: built.faces, leafStats: stats.leaves, flowerStats: stats.flowers, fruitStats: stats.fruit,
  spots: built.spots, bloomSites: built.bloomSites, contrastStats: stats.contrast, winterStats: stats.winter, P, camera, controls, scene, renderer,
  orders: Math.max(...skel.limbs.map((l) => l.depth)) + 1,
  primaries: skel.limbs.filter((l) => l.depth === 1).length };
