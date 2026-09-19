// Internal comparison grid. NOT product UI — deliberately unstyled beyond what
// it takes to read. It exists to answer one question: do these trees actually
// feel meaningfully different?
//
// Every cell shares one renderer and one lighting rig, and every camera sits at
// the SAME angle. A grid where cells rotate independently shows differences
// that are really just rotation phase, which would make the answer worthless.

import * as THREE from 'three';
import { buildTreeScene } from './build.js';
import { makeRenderer, makeScene, fitCamera, animateDrift } from './viewer.js';
import { _orient } from './foliage.js';
import { describeDNA } from './dna.js';
import { DNA_SITES, DNA_SNAPSHOT_GENERATED } from './dna-data.js';

// Eleven full-detail trees is roughly 7M triangles and eleven 4096² shadow
// maps. Detail is reduced EQUALLY across every cell, so it cannot bias a
// comparison — and the thumbnail test is about what survives at small size
// anyway, which is exactly what this budget preserves.
const GRID_DETAIL = 0.35;
const SHADOW_MAP = 1024;

const CAM = new THREE.Vector3(7.2, 5.5, 8.8);
const DIST0 = CAM.length();

const canvas = document.getElementById('gl');
const renderer = makeRenderer(canvas);
const uniforms = { time: { value: 0 } };
const grid = document.getElementById('grid');
const cells = [];

function cell(site) {
  const wrap = document.createElement('article');
  wrap.className = 'cell';

  const head = document.createElement('header');
  const name = document.createElement('h2');
  name.textContent = site.domain;
  head.appendChild(name);
  if (site.synthetic) {
    const tag = document.createElement('span');
    tag.className = 'synthetic';
    tag.textContent = 'SYNTHETIC — not a real website';
    head.appendChild(tag);
  }
  wrap.appendChild(head);

  const view = document.createElement('div');
  view.className = 'view';
  view.title = 'open full size';
  view.addEventListener('click', () => {
    location.href = `./index.html?site=${encodeURIComponent(site.domain)}`;
  });
  wrap.appendChild(view);

  const cap = document.createElement('p');
  cap.className = 'dna';
  cap.textContent = describeDNA(site.dna);
  wrap.appendChild(cap);

  const stat = document.createElement('p');
  stat.className = 'stat';
  wrap.appendChild(stat);

  grid.appendChild(wrap);

  const built = buildTreeScene(site.dna, uniforms, { detail: GRID_DETAIL });
  const scene = makeScene(built.params.background, { shadowMap: SHADOW_MAP });
  scene.add(built.group);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
  camera.position.copy(CAM);
  camera.lookAt(0, built.extents.targetY, 0);

  stat.textContent =
    `${built.stats.leaves.toLocaleString()} leaves · ` +
    `${built.stats.blossoms} blossom · ` +
    `${built.stats.fruit} fruit · ` +
    `${(built.stats.triangles / 1000).toFixed(0)}k tri`;

  if (built.params.warnings.length) {
    const w = document.createElement('p');
    w.className = 'warn';
    w.textContent = '⚠ ' + built.params.warnings.join('; ');
    wrap.appendChild(w);
  }

  return { site, view, scene, camera, built };
}

for (const site of DNA_SITES) cells.push(cell(site));

document.getElementById('meta').textContent =
  `${DNA_SITES.length} trees · DNA snapshot ${DNA_SNAPSHOT_GENERATED} · detail ${GRID_DETAIL}`;

// --- render ---------------------------------------------------------------
// One renderer, one canvas pinned to the viewport, a scissored viewport per
// cell. Eleven WebGL contexts would hit the browser's context limit; this does
// not, and it also means the cells genuinely share a rig.
const clock = new THREE.Clock();

function tick() {
  const t = clock.getElapsedTime();
  uniforms.time.value = t;

  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) ||
      canvas.height !== Math.round(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
  }

  // Clear the whole canvas to the page colour first. Cells paint their own
  // background sphere inside their scissor rect; everything between cells has
  // to be cleared or the previous frame smears across the gaps.
  renderer.setScissorTest(false);
  renderer.setClearColor(0xf2f2f0, 1);
  renderer.clear();

  renderer.setScissorTest(true);
  for (const c of cells) {
    const rect = c.view.getBoundingClientRect();
    // Skip anything off screen — scrolling past eight trees should not cost
    // eight trees' worth of rendering.
    if (rect.bottom < 0 || rect.top > h || rect.right < 0 || rect.left > w) continue;

    const bottom = h - rect.bottom;
    renderer.setViewport(rect.left, bottom, rect.width, rect.height);
    renderer.setScissor(rect.left, bottom, rect.width, rect.height);
    fitCamera(c.camera, c.built.extents, rect.width / rect.height, DIST0);
    c.camera.lookAt(0, c.built.extents.targetY, 0);
    animateDrift(c.built.petals, t, _orient);
    renderer.render(c.scene, c.camera);
  }
  renderer.setScissorTest(false);
  requestAnimationFrame(tick);
}
tick();

// --- thumbnail test -------------------------------------------------------
// The brief's actual acceptance check: differences that only survive close up
// have failed. This is a CSS class, not a separate page, so it is the same
// render at a different size.
const toggle = document.getElementById('thumbs');
toggle.addEventListener('change', () => {
  document.body.classList.toggle('thumbs', toggle.checked);
});
