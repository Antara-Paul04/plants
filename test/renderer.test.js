import test from "node:test";
import * as THREE from "three";
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const source = fs
  .readFileSync(new URL("../prototype/src/main.js", import.meta.url), "utf8")
  .replace(/^import .*;\n/gm, "")
  .replace(/^export /gm, "");
const defer = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const flush = () => new Promise((r) => setImmediate(r));
function setup(options = {}) {
  const fits = [];
  const builds = [],
    frames = [];
  class Vector {
    set() {}
    length() {
      return 12;
    }
  }
  class Camera {
    constructor() {
      this.position = new Vector();
    }
  }
  class Controls {
    constructor() {
      this.target = new THREE.Vector3();
    }
    update() {}
    addEventListener() {}
    dispose() {}
  }
  const canvas = {
    clientWidth: 800,
    clientHeight: 600,
    width: 800,
    height: 600,
    toDataURL: () => "data:image/png;base64,fixture",
  };
  let ratio = 1;
  const renderer = {
    getPixelRatio: () => ratio,
    setPixelRatio: (r) => (ratio = r),
    setSize(w, h) {
      canvas.width = w * ratio;
      canvas.height = h * ratio;
    },
    render() {},
    dispose() {},
  };
  const built = (site) => ({
    site,
    tree: { scale: { setScalar() {} } },
    ground: {},
    extents: { height: 8, width: 8, targetY: 3.4 },
    dispose() {},
  });
  const context = {
    console,
    performance,
    URLSearchParams,
    AbortController,
    DOMException,
    setTimeout,
    clearTimeout,
    location: { search: "?engine=v0" },
    DEFAULT_DNA: {},
    THREE,
    OrbitControls: Controls,
    document: { hidden: false },
    treeInteractions: () => ({
      setEnabled() {},
      reset() {},
      update() {},
      dispose() {},
    }),
    makeRenderer: () => renderer,
    loadModules: async () => ({
      util: { gustAt: () => 1, disposeObject() {} },
    }),
    paramSource: (params) => params || {},
    resolveParams: () => ({ P: {} }),
    createEnvironment: () => ({
      name: "day",
      scene: { add() {} },
      apply() {},
      dispose() {},
    }),
    nominalExtents: () => ({ height: 8, width: 8, targetY: 3.4 }),
    dnaToParams: (dna) => ({ params: dna }),
    growTree: async (_M, q, _env, opts) => {
      const d = defer();
      builds.push({ q, opts, ...d });
      await d.promise;
      return built(q.site);
    },
    growEarth: () => built("earth"),
    fitCamera(_camera, _extents, aspect) { fits.push(aspect); },
    requestAnimationFrame: (fn) => {
      frames.push(fn);
      return frames.length;
    },
    cancelAnimationFrame() {},
  };
  vm.createContext(context);
  vm.runInContext(source + "\nthis.audit={mountIdle};", context);
  const handle = context.audit.mountIdle(canvas, options);
  return { handle, builds, frames, canvas, fits };
}
test('side controls reserve horizontal room and mobile returns to a centred frame', async () => {
  let insets = { left: 320, right: 24, top: 40, bottom: 24 };
  const t = setup({ viewportInsets: () => insets });
  await t.handle.ready;
  t.frames.shift()();
  assert.equal(t.fits.at(-1), 456 / 536);
  assert.equal(t.handle.camera.view.offsetX, -148);
  insets = { top: 94, bottom: 200 };
  t.frames.shift()();
  assert.equal(t.fits.at(-1), 800 / 306);
  assert.equal(t.handle.camera.view.offsetX, 0);
  t.handle.dispose();
});
test("superseding a request cancels its renderer build before it swaps the scene", async () => {
  const t = setup();
  await t.handle.ready;
  const previous = t.handle.current;
  const a = t.handle.setDNA({ site: "a.example" });
  await flush();
  t.handle.cancelPending();
  assert.equal(t.builds[0].opts.signal.aborted, true);
  t.builds[0].resolve();
  await assert.rejects(a, { name: "AbortError" });
  assert.equal(t.handle.current, previous);
  t.handle.dispose();
});
test("overlapping captures both resolve and capture size restores the live canvas", async () => {
  const t = setup();
  await t.handle.ready;
  const a = t.handle.capture(),
    b = t.handle.capture({ width: 1200, height: 630 });
  t.frames.shift()();
  assert.match(await a, /^data:image/);
  assert.match(await b, /^data:image/);
  assert.equal(t.canvas.width, 800);
  assert.equal(t.canvas.height, 600);
  t.handle.dispose();
});
test("disposing resolves outstanding captures and cancels pending builds", async () => {
  const t = setup();
  await t.handle.ready;
  const a = t.handle.capture();
  t.handle.dispose();
  assert.equal(await a, null);
  assert.equal(await t.handle.capture(), null);
});
test("video frames are drawn at export size before restoring the live canvas", async () => {
  const t = setup();
  await t.handle.ready;
  let captured;
  const frame = t.handle.capture({ width: 1200, height: 630, card: true,
    draw: canvas => { captured = [canvas.width, canvas.height]; } });
  t.frames.shift()();
  assert.equal(await frame, true);
  assert.deepEqual(captured, [1200, 630]);
  assert.equal(t.canvas.width, 800);
  assert.equal(t.canvas.height, 600);
  t.handle.dispose();
});
