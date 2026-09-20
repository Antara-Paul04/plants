// Single-tree viewer — the product's ENTIRE contract with the 3D domain.
//
//     import { mountTree } from '/tree/main.js';
//     tree = mountTree(canvas, dna, { autoRotate: true });   // first grow
//     tree.setDNA(dna);                                      // every later grow
//
// This module EXPORTS a mount function and runs nothing at import time, so a
// frontend (or a test) can drive it.
//
// TWO ENGINES behind that one interface:
//   'new'  (default) the tree grown by grow.js — implicit-surface wood, clay bark,
//          authored leaf clusters, bloom grammars, winter, the environment states.
//          DNA reaches it through dnaToParams (dna-params.js).
//   'v0'   the shipped stylised tree (build.js), kept whole and selectable with
//          `opts.engine = 'v0'` or `?engine=v0` on the hosting page, so the two can
//          be compared on the same DNA and there is a way back.
//
// The new engine is ASYNCHRONOUS inside and synchronous outside. Its wood takes
// 1.5-2.5 s to build, which would freeze the page if mountTree blocked on it; so
// mountTree / setDNA return AT ONCE, the island appears immediately, the wood is
// built in ~10 ms slices between frames, and the tree is added when it is done.
// `handle.ready` (and the promise setDNA returns) resolve at that moment, for a
// host that wants to hold its "growing" state until the tree is really there.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildTreeScene } from './build.js';
import { makeRenderer, makeScene, fitCamera, animateDrift } from './viewer.js';
import { _orient } from './foliage.js';
import { DEFAULT_DNA } from './dna.js';
import { dnaToParams } from './dna-params.js';
import { loadModules, paramSource, resolveParams, createEnvironment, growTree, nominalExtents } from './grow.js';

const pageParams = () => (typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams());

/**
 * Mount an orbitable single tree into a canvas.
 * Returns a handle: `setDNA` swaps the tree, `dispose` frees everything.
 */
export function mountTree(canvas, dna = DEFAULT_DNA, opts = {}) {
  const engine = opts.engine ?? pageParams().get('engine') ?? 'new';
  return engine === 'v0' ? mountTreeV0(canvas, dna, opts) : mountTreeNew(canvas, dna, opts);
}

function mountTreeNew(canvas, dna, opts = {}) {
  const { autoRotate = true } = opts;
  const uniforms = { time: { value: 0 } };
  const renderer = makeRenderer(canvas);
  const url = pageParams();
  const bust = url.get('v') ? `?v=${encodeURIComponent(url.get('v'))}` : '';
  const modules = loadModules(bust);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  camera.position.set(7.4, 4.6, 9.2);
  const DIST0 = camera.position.length();
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 8;
  controls.maxDistance = 22;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 0.42;

  // What is on screen now, and what is being grown to replace it.
  let shown = null;     // { env, built, extents }
  let pending = null;   // { abort }
  let extents = { height: 8, width: 8, targetY: 3.4 };
  let lastFit = '';
  let reveal = null;    // { t0, group }

  function frame(ex) {
    extents = ex;
    lastFit = '';
    controls.target.set(0, ex.targetY, 0);
    controls.update();
  }

  function setDNA(next) {
    if (pending) pending.abort.abort();
    const abort = new AbortController();
    const mine = (pending = { abort });

    const mapped = dnaToParams(next);
    // The page's query parameters sit OVER the DNA, so the whole debug surface
    // (?leafHide=1, ?debug=bloomleaves, ?grammar=, ?pale=, ?night= ...) still works
    // in the product, on a real site's tree.
    const q = paramSource(mapped.params, url);
    const { P } = resolveParams(q);
    const env = createEnvironment(renderer, q, P);
    // Framed from the crown the tree is ASKED to fill, known before it is grown —
    // so the camera does not jump when the tree arrives two seconds later.
    const ex = nominalExtents(q);

    const promise = (async () => {
      const M = await modules;
      let groundShown = false;
      const built = await growTree(M, q, env, {
        uniforms, budgetMs: opts.budgetMs ?? 10, signal: abort.signal,
        leavesDefault: '1', terrain: mapped.terrain, rocks: mapped.rocks,
        onGround(ground) {
          // First tree only: show the island at once, so the canvas is never blank
          // while the wood is built. On a swap the OLD tree stays up until the new
          // one is whole — a half-swapped scene is worse than a late one.
          if (shown || abort.signal.aborted) return;
          env.scene.add(ground);
          shown = { env, built: null, ground };
          groundShown = true;
          frame(ex);
        },
      });
      if (abort.signal.aborted) { built.dispose(); throw new DOMException('tree build superseded', 'AbortError'); }

      const old = shown;
      env.scene.add(built.tree);
      if (!groundShown) env.scene.add(built.ground);
      shown = { env, built };
      frame(ex);
      reveal = opts.reveal === false ? null : { t0: performance.now(), group: built.tree };
      // Free what was on screen. `scene.remove()` frees no GPU memory on its own, so
      // a swap without this leaks a whole tree every time. An island that was shown
      // early for a build that was then superseded has no `built` — only a ground.
      if (old) {
        if (old.built) old.built.dispose();
        else if (old.ground && old.ground !== built.ground) M.util.disposeObject(old.ground);
        if (old.env !== env) old.env.dispose();
      }
      if (pending === mine) pending = null;
      return built;
    })();
    promise.catch((e) => {
      // A superseded build is not an error anyone needs to hear about.
      if (e?.name !== 'AbortError') console.error(e);
      // Its environment is freed — unless its island is what is on screen right now.
      if (!shown || shown.env !== env) env.dispose();
    });
    handle.ready = promise;
    return promise;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const key = `${w}x${h}`;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) ||
        canvas.height !== Math.round(h * renderer.getPixelRatio()) || lastFit !== key) {
      renderer.setSize(w, h, false);
      fitCamera(camera, extents, w / Math.max(h, 1), DIST0);
      lastFit = key;
    }
  }

  const clock = new THREE.Clock();
  let raf = 0;
  function tick() {
    uniforms.time.value = clock.getElapsedTime();
    if (reveal) {
      // The tree SETTLES in rather than popping: 0.4 s, a few percent of scale.
      // Not a growth animation — there is none this round — just not a jump cut.
      const k = Math.min(1, (performance.now() - reveal.t0) / 420);
      const e = 1 - Math.pow(1 - k, 3);
      reveal.group.scale.setScalar(0.94 + 0.06 * e);
      if (k >= 1) reveal = null;
    }
    resize();
    controls.update();
    if (shown) renderer.render(shown.env.scene, camera);
    raf = requestAnimationFrame(tick);
  }

  // Pause the idle spin while the user is inspecting, resume shortly after.
  let resumeTimer = null;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    if (resumeTimer) clearTimeout(resumeTimer);
  });
  controls.addEventListener('end', () => {
    resumeTimer = setTimeout(() => (controls.autoRotate = autoRotate), 2500);
  });

  const handle = {
    engine: 'new',
    setDNA,
    ready: null,
    get current() { return shown ? shown.built : null; },
    scene: () => (shown ? shown.env.scene : null),
    camera,
    controls,
    renderer,
    dispose() {
      cancelAnimationFrame(raf);
      if (resumeTimer) clearTimeout(resumeTimer);
      if (pending) pending.abort.abort();
      controls.dispose();
      if (shown) { shown.built?.dispose(); shown.env.dispose(); }
      renderer.dispose();
    },
  };

  setDNA(dna);
  tick();
  return handle;
}

/** The shipped stylised tree, exactly as it was. */
function mountTreeV0(canvas, dna = DEFAULT_DNA, opts = {}) {
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
    engine: 'v0',
    ready: Promise.resolve(),
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
