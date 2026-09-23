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
import { treeInteractions } from './interaction.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildTreeScene } from './build.js';
import { makeRenderer, makeScene, fitCamera, animateDrift } from './viewer.js';
import { _orient } from './foliage.js';
import { DEFAULT_DNA } from './dna.js';
import { dnaToParams } from './dna-params.js';
import { loadModules, paramSource, resolveParams, createEnvironment, growTree, growEarth, nominalExtents } from './grow.js';

const pageParams = () => (typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams());

/**
 * Mount an orbitable single tree into a canvas.
 * Returns a handle: `setDNA` swaps the tree, `dispose` frees everything.
 */
export function mountTree(canvas, dna = DEFAULT_DNA, opts = {}) {
  const engine = opts.engine ?? pageParams().get('engine') ?? 'new';
  // Bare earth and idle exist only in the new engine, so asking for either selects it.
  return engine === 'v0' && !opts.earth && !opts.idle ? mountTreeV0(canvas, dna, opts) : mountTreeNew(canvas, dna, opts);
}

/**
 * Mount the IDLE state: sky and an empty island, before anyone has named a website.
 * The same bare-earth island as the failure state, framed as the tree scene a tree
 * will need — so when `handle.setDNA(dna)` grows one, the camera does not move. See
 * growEarth for why idle and failure share an island and differ only in framing.
 */
export function mountIdle(canvas, opts = {}) {
  return mountTreeNew(canvas, null, { ...opts, idle: true });
}

/**
 * Mount the FAILURE state: the bare-earth island, with no DNA at all. For a host
 * that could not read a site before any tree was ever mounted. The handle is the
 * same one mountTree returns, so a successful retry is just `handle.setDNA(dna)`.
 */
export function mountEarth(canvas, opts = {}) {
  return mountTreeNew(canvas, null, { ...opts, earth: true });
}

function mountTreeNew(canvas, dna, opts = {}) {
  const { autoRotate = true } = opts;
  const renderer = makeRenderer(canvas);
  const url = opts.allowQueryParams === false ? new URLSearchParams() : pageParams();
  // `gust` makes the wind WEATHER — it comes and goes (util.js, gustAt) — and every
  // swaying thing in the scene answers to the one number, the grass included. `?gust=0`
  // is the constant sway; `?wind=0` drops it too, so the lawn, like the tree, is then
  // exactly what it was before there was any wind.
  const uniforms = { time: { value: 0 }, ...(url.get('gust') !== '0' && url.get('wind') !== '0' ? { gust: { value: 1 } } : {}) };
  const bust = url.get('v') ? `?v=${encodeURIComponent(url.get('v'))}` : '';
  const modules = loadModules(bust);
  let gustAt = null;
  modules.then((M) => { gustAt = M.util.gustAt; });

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  camera.position.set(7.4, 4.6, 9.2);
  // KNOWN, AND LEFT ALONE ON PURPOSE: this is the distance from the ORIGIN (12.67), but
  // the camera orbits the target at (0, targetY, 0), which is ~11.87 away. So every fit
  // comes out ~6% tighter than fitCamera's `pad = 1.06` says — the pad is effectively
  // nil, and the margin on screen is nominalExtents' own 1.08. Nothing is clipped.
  // "Fixing" it moves every frame ever judged, for no visible gain. Do not.
  const DIST0 = camera.position.length();
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 8;
  controls.maxDistance = 22;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.autoRotate = autoRotate && opts.motion !== false;
  controls.autoRotateSpeed = 0.42;

  // What is on screen now, and what is being grown to replace it.
  let shown = null;     // { env, built, extents }
  let pending = null;   // { abort }
  let extents = { height: 8, width: 8, targetY: 3.4 };
  let lastFit = '';
  let reveal = null;    // { t0, group }
  let motionEnabled = opts.motion !== false;
  const interaction = treeInteractions(canvas, camera, controls, uniforms, () => shown);
  interaction.setEnabled(motionEnabled);

  // Everything that goes on screen goes through here, so a host hears about the SKY
  // changing at the moment it changes. The shell sets its own text against that sky
  // (pale by day, near-black at night) and must not reach into the scene to ask. It
  // follows what is SHOWN, not what was asked for: on a swap the old scene stays up
  // until the new tree is whole, and its sky stays with it.
  function show(next) {
    const was = shown ? shown.env.name : null;
    interaction.reset();
    shown = next;
    if (next.env.name !== was && opts.onEnv) opts.onEnv(next.env.name);
  }

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
          env.apply();
          show({ env, built: null, ground });
          groundShown = true;
          frame(ex);
        },
      });
      if (abort.signal.aborted) { built.dispose(); throw new DOMException('tree build superseded', 'AbortError'); }

      const old = shown;
      env.scene.add(built.tree);
      if (!groundShown) env.scene.add(built.ground);
      env.apply();
      show({ env, built });
      frame(ex);
      reveal = opts.reveal === false || !motionEnabled ? null : { t0: performance.now(), group: built.tree };
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

  /**
   * Show the bare-earth island — the failure state (see growEarth). Same swap
   * discipline as setDNA: a build in flight is abandoned, the old scene stays up
   * until this one is ready, and whatever it replaces is freed.
   */
  function setEarth(idle = false) {
    if (pending) pending.abort.abort();
    const abort = new AbortController();
    const mine = (pending = { abort });
    // No DNA, so nothing measured: always the day state, never the page's own
    // `envstate` — but the rest of the debug surface still applies.
    // IDLE is framed as the tree scene of the NORMAL structure (`mid`). The three
    // structures ask for nearly one frame — lens 39.5 to 40.9 degrees, target 2.48 to
    // 2.63 — so whichever tree arrives, the camera has at most a fraction of a degree
    // to give. Under the URL, so the debug surface can still ask for another.
    const q = paramSource(idle ? { preset: 'mid' } : null, url, { envstate: 'day' });
    const { P } = resolveParams(q);
    const env = createEnvironment(renderer, q, P);
    const promise = (async () => {
      const M = await modules;
      if (abort.signal.aborted) throw new DOMException('superseded', 'AbortError');
      const built = growEarth(M, q, env, { idle, uniforms });
      const old = shown;
      env.scene.add(built.ground);
      env.apply();
      show({ env, built });
      reveal = null;
      frame(built.extents);
      if (old) {
        if (old.built) old.built.dispose();
        else if (old.ground) M.util.disposeObject(old.ground);
        if (old.env !== env) old.env.dispose();
      }
      if (pending === mine) pending = null;
      return built;
    })();
    promise.catch((e) => {
      if (e?.name !== 'AbortError') console.error(e);
      if (!shown || shown.env !== env) env.dispose();
    });
    handle.ready = promise;
    return promise;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const inset = opts.viewportInsets?.() || { top: 0, bottom: 0 };
    const available = Math.max(h * .4, h - inset.top - inset.bottom);
    const availableWidth = Math.max(w * .4, w - (inset.left || 0) - (inset.right || 0));
    const key = `${w}x${h}:${available}:${availableWidth}:${inset.left || 0}:${inset.top}`;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) ||
        canvas.height !== Math.round(h * renderer.getPixelRatio()) || lastFit !== key) {
      renderer.setSize(w, h, false);
      // A TALL frame is answered by stepping back, never by a wider lens (viewer.js).
      // `?fit=lens` is the fit as it was before that, for an A/B on a real site's tree.
      fitCamera(camera, extents, availableWidth / Math.max(available, 1), DIST0, 1.14, url.get('fit') === 'lens' ? null : controls);
      camera.fov = 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * h / available) * 180 / Math.PI;
      camera.aspect = w / Math.max(h, 1);
      camera.setViewOffset(w, h, ((inset.right || 0) - (inset.left || 0)) / 2, (inset.bottom - inset.top) / 2, w, h);
      camera.updateProjectionMatrix();
      lastFit = key;
    }
  }

  let raf = 0;
  let captureRequests = [];
  let motionTime = 0, lastTick = performance.now();
  let disposed = false;
  function tick() {
    if (disposed) return;
    const stamp = performance.now();
    const dt = Math.min(.05, (stamp - lastTick) / 1000); lastTick = stamp;
    if (document.hidden) { raf = requestAnimationFrame(tick); return; }
    if (motionEnabled) motionTime += dt;
    const t = motionTime;
    uniforms.time.value = t;
    interaction.update(motionEnabled ? dt : 0);
    if (uniforms.gust && gustAt) uniforms.gust.value = gustAt(t);
    // A tree with per-frame work of its own (autumn's falling leaves). A pure function
    // of t, so a frame that is late or skipped costs nothing but that frame.
    if (motionEnabled && shown && shown.built && shown.built.update) shown.built.update(t);
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
    // A CAPTURE MUST HAPPEN IN THE SAME TASK AS THE DRAW. The context is created
    // without preserveDrawingBuffer — deliberately, it costs on exactly the
    // phones this project spent a night measuring — so the drawing buffer is
    // gone once we return to the event loop, and a toDataURL from outside the
    // render loop reads black. Serviced here, synchronously after render, it
    // costs nothing on any frame that did not ask.
    const queue = captureRequests; captureRequests = [];
    for (const request of queue) {
      try {
        if (!shown) { request.resolve(null); continue; }
        if (!request.options?.width) { request.resolve(canvas.toDataURL('image/png')); continue; }
        const width = request.options.width, height = request.options.height;
        const shot = camera.clone(); shot.clearViewOffset();
        const rig = { target: controls.target.clone(), minDistance: 8, maxDistance: 22 };
        shot.position.sub(controls.target).normalize().multiplyScalar(DIST0).add(controls.target);
        fitCamera(shot, extents, width / height, DIST0, 1.2, rig);
        shot.lookAt(rig.target);
        shot.setViewOffset(width, height, 0, 24, width, height); // leave room for the postcard caption
        const ratio = renderer.getPixelRatio();
        try {
          renderer.setPixelRatio(1); renderer.setSize(width, height, false);
          renderer.render(shown.env.scene, shot);
          request.resolve(canvas.toDataURL('image/png'));
        } finally {
          renderer.setPixelRatio(ratio); lastFit = ''; resize();
          renderer.render(shown.env.scene, camera);
        }
      } catch (error) { request.resolve(null); }
    }
    raf = requestAnimationFrame(tick);
  }

  // Pause the idle spin while the user is inspecting, resume shortly after.
  let resumeTimer = null;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    if (resumeTimer) clearTimeout(resumeTimer);
  });
  controls.addEventListener('end', () => {
    resumeTimer = setTimeout(() => (controls.autoRotate = autoRotate && motionEnabled), 2500);
  });

  const handle = {
    engine: 'new',
    setDNA,
    setEarth: () => setEarth(false),
    setIdle: () => setEarth(true),
    ready: null,
    get current() { return shown ? shown.built : null; },
    /** 'day' | 'night' — the environment ON SCREEN; null before the first frame. See `show`. */
    get envName() { return shown ? shown.env.name : null; },
    scene: () => (shown ? shown.env.scene : null),
    /**
     * The scene as a PNG data URL, taken on the next frame. Resolves null if
     * nothing is drawn. Used by the product's share button, so the image a
     * person posts is the tree they are actually looking at.
     */
    capture(options) { return disposed ? Promise.resolve(null) : new Promise(resolve => captureRequests.push({ resolve, options })); },
    cancelPending() { if (pending) { pending.abort.abort(); pending = null; } },
    setMotion(enabled) { motionEnabled = enabled; controls.autoRotate = autoRotate && enabled; interaction.setEnabled(enabled); if (!enabled && reveal) { reveal.group.scale.setScalar(1); reveal = null; } },
    getPose() { return { position: camera.position.toArray(), target: controls.target.toArray() }; },
    setPose(pose) { if (!pose) return; camera.position.fromArray(pose.position); controls.target.fromArray(pose.target); controls.update(); },
    stir() { interaction.stir(); },
    camera,
    controls,
    renderer,
    dispose() {
      disposed = true; interaction.dispose();
      for (const request of captureRequests) request.resolve(null);
      captureRequests = [];
      cancelAnimationFrame(raf);
      if (resumeTimer) clearTimeout(resumeTimer);
      if (pending) pending.abort.abort();
      controls.dispose();
      if (shown) {
        // An island shown early, for a tree that never finished, has no `built` —
        // only a ground that HAS been rendered and so is on the GPU.
        const s = shown; shown = null;
        if (s.built) s.built.dispose();
        else if (s.ground) modules.then((M) => M.util.disposeObject(s.ground));
        s.env.dispose();
      }
      renderer.dispose();
    },
  };

  if (opts.idle) setEarth(true); else if (opts.earth) setEarth(false); else setDNA(dna);
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
      fitCamera(camera, built.extents, w / h, DIST0, undefined, controls);
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

  // ONE CONTRACT for every handle: setDNA(), setEarth() and setIdle() all return
  // promises and may be called in any order. The shipped engine has no bare-earth state, so a
  // failure hands the canvas over to the new engine, which does; after that the
  // handle is the new engine's (a later setDNA grows the new tree — the way back to
  // v0 is a fresh mount). Without this a `?engine=v0` page threw on its first failure.
  let takeover = null;
  const v0Dispose = () => {
    cancelAnimationFrame(raf);
    if (resumeTimer) clearTimeout(resumeTimer);
    controls.dispose();
    if (built) built.dispose();
    renderer.dispose();
  };
  return {
    engine: 'v0',
    ready: Promise.resolve(),
    setEarth() {
      if (!takeover) { v0Dispose(); takeover = mountTreeNew(canvas, null, { ...opts, earth: true }); return takeover.ready; }
      return takeover.setEarth();
    },
    setIdle() {
      if (!takeover) { v0Dispose(); takeover = mountTreeNew(canvas, null, { ...opts, idle: true }); return takeover.ready; }
      return takeover.setIdle();
    },
    // The shipped engine has no environment states — its background is the site's own
    // colour — so it reports nothing, and a host treats nothing as day.
    get envName() { return takeover ? takeover.envName : null; },
    setDNA: (next) => (takeover ? takeover.setDNA(next) : Promise.resolve(setDNA(next))),
    get current() { return built; },
    scene: () => scene,
    camera,
    controls,
    renderer,
    dispose() { if (takeover) takeover.dispose(); else v0Dispose(); },
  };
}
