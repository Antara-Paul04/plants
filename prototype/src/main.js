// Single-tree viewer.
//
// This module EXPORTS a mount function and runs nothing at import time, so a
// frontend (or the comparison grid, or a test) can drive it. It used to execute
// its whole body on import and export nothing, which made it impossible to show
// a second tree, or to replace the first one.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildTreeScene } from './build.js';
import { makeRenderer, makeScene, fitCamera, animateDrift } from './viewer.js';
import { _orient } from './foliage.js';
import { DEFAULT_DNA } from './dna.js';

/**
 * Mount an orbitable single tree into a canvas.
 * Returns a handle: `setDNA` swaps the tree, `dispose` frees everything.
 */
export function mountTree(canvas, dna = DEFAULT_DNA, opts = {}) {
  const { detail = 1, autoRotate = true } = opts;
  const uniforms = { time: { value: 0 } };
  const renderer = makeRenderer(canvas);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
  camera.position.set(7.2, 5.5, 8.8);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 8;
  controls.maxDistance = 22;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 0.42;

  const DIST0 = camera.position.length();

  let scene = null;
  let built = null;

  function setDNA(next) {
    // Teardown first. `scene.remove()` frees no GPU memory on its own, so a
    // swap without this leaks a whole tree — about fifty thousand instances
    // across eight instanced meshes — every time.
    if (built) built.dispose();
    if (scene) scene = null;

    built = buildTreeScene(next, uniforms, { detail });
    scene = makeScene(built.params.background);
    scene.add(built.group);
    controls.target.set(0, built.extents.targetY, 0);
    controls.update();
    return built;
  }

  setDNA(dna);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (
      canvas.width !== Math.round(w * renderer.getPixelRatio()) ||
      canvas.height !== Math.round(h * renderer.getPixelRatio())
    ) {
      renderer.setSize(w, h, false);
      fitCamera(camera, built.extents, w / h, DIST0);
    }
  }

  const clock = new THREE.Clock();
  let raf = 0;
  function tick() {
    const t = clock.getElapsedTime();
    uniforms.time.value = t;
    animateDrift(built.petals, t, _orient);
    resize();
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  // Pause the idle spin while the user is inspecting, resume shortly after.
  let resumeTimer = null;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    if (resumeTimer) clearTimeout(resumeTimer);
  });
  controls.addEventListener('end', () => {
    resumeTimer = setTimeout(() => (controls.autoRotate = autoRotate), 2500);
  });

  return {
    setDNA,
    get current() { return built; },
    scene: () => scene,
    camera,
    controls,
    renderer,
    dispose() {
      cancelAnimationFrame(raf);
      if (resumeTimer) clearTimeout(resumeTimer);
      controls.dispose();
      if (built) built.dispose();
      renderer.dispose();
    },
  };
}
