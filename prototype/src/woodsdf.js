// Thick wood as an IMPLICIT SURFACE.
//
// Why this exists. The surface language is smooth clay (docs/TASTE.md), and on a
// smooth surface a union between two swept tubes cannot be made to look grown:
// two tubes meeting at fifty degrees leave a raw intersection crease with an
// undercut lip, and every tube-side trick tried — buried bases, hidden lead-ins,
// parent collars, trumpet flares — only moved the crease around. Detailed bark
// had been hiding it. "Smooth flowing" unions are the defining quality of the
// reference, so the thick wood is no longer tubes at all.
//
// It is a signed distance field: every thick limb is a chain of tapered
// capsules, limbs are combined with a SMOOTH minimum, and the zero level set is
// meshed with marching cubes. The consequences are exactly the ones wanted:
//
//   - unions fillet themselves, with a fillet sized to the thinner limb, and the
//     parent swells slightly around the child — which is a branch collar;
//   - buttress roots are just more capsules blended in with a wide radius, so
//     they FLOW into the trunk rather than being lobes pushed out of a tube;
//   - grooves live IN the field, so they soften into every union instead of two
//     groove patterns colliding at the join;
//   - the result is one closed watertight surface, which is also what the
//     shadow pass wants.
//
// Only wood thicker than CUT is handled here. Thin limbs stay swept tubes
// (limbmesh.js): their unions are below the size at which a crease can be seen,
// and a voxel grid fine enough for twigs would be enormous. A thick limb hands
// over to a tube where it thins past CUT; the field sinks slightly inside the
// tube at the hand-over so the two surfaces cross at a grazing angle.

import * as THREE from 'three';
import { edgeTable, triTable } from 'three/addons/objects/MarchingCubes.js';
import { clamp, rr } from './util.js';
import { grooveFreq, relaxedRadii } from './limbmesh.js';
import { slabSteps, slabRanges, slabRangesBalanced } from './woodfield.js';

// Below the chunky tips' minimum radius, so in the chunky style EVERY limb lives
// in the field to its tip: each tip is a smooth dome and there is no hand-over to
// a tube at all. (The hand-over showed as a chisel cut and a notch near the tips.)
// Tubes remain only for genuinely thin wood, which the chunky style does not have.
export const CUT = 0.02;

/** Parallel-transported frames along a polyline, so theta is stable along it. */
function frames(pts) {
  const out = [];
  let N = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const T = pts[i + 1].clone().sub(pts[i]).normalize();
    if (!N) {
      N = Math.abs(T.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      N = N.sub(T.clone().multiplyScalar(N.dot(T))).normalize();
    } else {
      N = N.clone().sub(T.clone().multiplyScalar(N.dot(T))).normalize();
    }
    out.push({ T, N: N.clone(), B: T.clone().cross(N).normalize() });
  }
  return out;
}

/**
 * Everything about a build that needs three, the limbs or the RNG: the capsule chains,
 * the buttress roots, the grid. Runs once, on the main thread, and draws from `r`
 * exactly what the build always drew, in the same order — so which thread then fills
 * the field cannot change a tree.
 *
 * The numeric part is woodfield.js (`slabSteps`): ONE implementation, run either here in
 * slices or in workers. This build used to be a single generator over the whole grid;
 * why it is slabs now — 329 MB of arrays for an ordinary tree, and a main thread that a
 * phone needs for drawing — is written at the top of that file.
 *
 * @returns { cuts, job } — cuts maps each limb to the number of its chain nodes covered
 *   by the field, so the tube mesher can pick up where it stops. job is null when no
 *   limb is thick enough to need a field at all.
 */
function setup(limbs, r, opts = {}) {
  const { voxel = 0.026 } = opts;
  const h = voxel;

  // --- 1. the capsule chains -------------------------------------------------
  const chains = [];
  const cuts = new Map();
  for (const L of limbs) {
    const radii = relaxedRadii(L.chain);
    let c = radii.findIndex((x) => x < CUT);
    const whole = c === -1;                       // thick to the very tip: no tube takes over
    if (whole) c = radii.length - 1;
    if (c < 2 && !whole) { cuts.set(L, 0); continue; }   // barely thick: leave it to the tube mesher
    cuts.set(L, whole ? L.chain.length : c);

    const pts = [], rad = [];
    if (L.parentLimb) {
      // Reach back to the parent's axis so the field of the child meets the
      // field of the parent; the smooth minimum does the rest.
      const host = L.parentLimb.chain[L.parentIndex];
      pts.push(host.pos.clone());
      rad.push(radii[0]);
    }
    for (let i = 0; i <= c; i++) { pts.push(L.chain[i].pos.clone()); rad.push(radii[i]); }
    // Sink the last stretch inside the tube that takes over from here — only if
    // one does. A limb that is field to its tip ends in its own rounded dome.
    if (!whole) rad[rad.length - 1] *= 0.72;

    const isTrunk = !L.parentLimb;
    if (isTrunk) {
      // The whole base swells toward the ground; the roots below carry the character.
      for (let i = 0; i < pts.length; i++) rad[i] *= 1 + 0.2 * Math.exp(-Math.max(0, pts[i].y - 0.1) / 0.45);
    }
    chains.push({
      pts, rad, isTrunk,
      // `blend` is set only on the limbs of a RAMIFIED tree (branching.js: a collar sized from
      // the host). Without it this is the blend every tree has always had.
      k: L.blend ?? clamp(radii[0] * 0.95, 0.03, 0.2),
      seed: rr(r, 0, 20),
      grooves: true,
      f1: grooveFreq(radii[0]),
    });
  }

  // Buttress roots: capsules leaving the base of the trunk, outward and down,
  // blended in with a wide radius so they flow. Uneven spacing and size.
  const trunk = chains.find((c) => c.isTrunk);
  if (trunk) {
    const R0 = trunk.rad[0];
    const n = 5;
    const phase = rr(r, 0, Math.PI * 2);
    for (let i = 0; i < n; i++) {
      const a = phase + (i / n) * Math.PI * 2 + rr(r, -0.35, 0.35);
      const reach = rr(r, 0.78, 1.12) * (0.55 + R0 * 1.6);
      const dx = Math.cos(a), dz = Math.sin(a);
      const size = rr(r, 0.8, 1.1);
      chains.push({
        pts: [
          new THREE.Vector3(dx * R0 * 0.35, 0.62, dz * R0 * 0.35),
          new THREE.Vector3(dx * reach * 0.5, 0.26, dz * reach * 0.5),
          new THREE.Vector3(dx * reach * 0.85, 0.06, dz * reach * 0.85),
          new THREE.Vector3(dx * reach * 1.15, -0.2, dz * reach * 1.15),
        ],
        rad: [R0 * 0.34 * size, R0 * 0.36 * size, R0 * 0.26 * size, R0 * 0.12 * size],
        isTrunk: false, isRoot: true,
        k: 0.24,
        seed: rr(r, 0, 20),
        grooves: false,
      });
    }
  }
  if (!chains.length) return { cuts, job: null };

  // --- 2. grid ---------------------------------------------------------------
  const lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const c of chains) for (let i = 0; i < c.pts.length; i++) {
    const pad = c.rad[i] + c.k + 4 * h + 0.06;
    lo.min(c.pts[i].clone().subScalar(pad));
    hi.max(c.pts[i].clone().addScalar(pad));
  }
  const nx = Math.ceil((hi.x - lo.x) / h) + 1, ny = Math.ceil((hi.y - lo.y) / h) + 1, nz = Math.ceil((hi.z - lo.z) / h) + 1;

  // --- 3. the chains as plain doubles: what the kernel (and a worker) can read ----
  const plain = chains.map((c) => {
    const n = c.pts.length, fr = frames(c.pts);
    const px = new Float64Array(n), py = new Float64Array(n), pz = new Float64Array(n);
    for (let i = 0; i < n; i++) { px[i] = c.pts[i].x; py[i] = c.pts[i].y; pz[i] = c.pts[i].z; }
    const fN = new Float64Array(3 * (n - 1)), fB = new Float64Array(3 * (n - 1));
    fr.forEach((f, i) => { fN[3 * i] = f.N.x; fN[3 * i + 1] = f.N.y; fN[3 * i + 2] = f.N.z; fB[3 * i] = f.B.x; fB[3 * i + 1] = f.B.y; fB[3 * i + 2] = f.B.z; });
    return { n, px, py, pz, rad: Float64Array.from(c.rad), fN, fB, k: c.k, seed: c.seed, grooves: c.grooves, f1: c.f1, isTrunk: c.isTrunk };
  });
  return { cuts, job: { h, lo: [lo.x, lo.y, lo.z], nx, ny, nz, edgeTable, triTable, chains: plain } };
}

/** The slabs' triangles, in z order, as one geometry. */
function assemble(job, parts, stats) {
  const join = (key) => {
    let n = 0; for (const p of parts) n += p[key].length;
    const out = new Float32Array(n); let o = 0;
    for (const p of parts) { out.set(p[key], o); o += p[key].length; }
    return out;
  };
  const geometry = new THREE.BufferGeometry();
  const pos = join('pos');
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(join('nor'), 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(join('col'), 3));
  geometry.setAttribute('groove', new THREE.BufferAttribute(join('grv'), 1));
  geometry.setAttribute('barkR', new THREE.BufferAttribute(join('brk'), 1));
  geometry.userData.stats = { grid: [job.nx, job.ny, job.nz], voxels: job.nx * job.ny * job.nz, triangles: pos.length / 9, ...stats };
  return geometry;
}

// Cells per slab on the main thread. Thicker is a little less repeated work (three
// slices are evaluated twice at every boundary) and more held at once: 32 cells of an
// ordinary tree's grid is ~31 MB, where the whole grid was 329.
const SLAB_MAIN = 32;

/** Every slab, one after another, as a generator the two main-thread drivers share. */
function* mainSteps(job) {
  const parts = [], scratch = {};
  for (const [a, b] of slabRanges(job.nz, SLAB_MAIN)) parts.push(yield* slabSteps(job, a, b, scratch));
  return parts;
}

/** Synchronous driver: runs the build straight through. Same output as ever. */
export function buildThickWood(limbs, r, opts = {}) {
  const t0 = performance.now();
  const { cuts, job } = setup(limbs, r, opts);
  if (!job) return { geometry: null, cuts };
  const it = mainSteps(job);
  for (;;) { const s = it.next(); if (s.done) return { geometry: assemble(job, s.value, { how: 'main', totalMs: Math.round(performance.now() - t0) }), cuts }; }
}

// A macrotask that is NOT a timer: timers are clamped to 4 ms when nested and to
// a second or more in a background tab, which would turn a 2 s build into minutes.
function nextTask() {
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => { ch.port1.close(); resolve(); };
    ch.port2.postMessage(0);
  });
}

const aborted = () => new DOMException('tree build superseded', 'AbortError');

/** The main thread's sliced build: `budgetMs` of work, then a breath. */
async function mainSliced(job, budgetMs, signal) {
  const it = mainSteps(job);
  let t = performance.now();
  for (;;) {
    const s = it.next();
    if (s.done) return s.value;
    if (performance.now() - t >= budgetMs) {
      await nextTask();
      if (signal && signal.aborted) throw aborted();
      t = performance.now();
    }
  }
}

// --- the worker pool ---------------------------------------------------------------
// The field is 63-84% of the time from "grow" to a tree, and on the main thread it
// shares that thread with the render loop: measured on a phone six times slower than a
// laptop, the opening tree took 15-20 s to arrive. Slabs are independent, so they go to
// workers — the same kernel, the same mesh to the bit — and the main thread is left to
// draw the island. Anything at all going wrong (no Worker, a policy that refuses one, a
// module that will not load, a worker that dies or never answers) leaves the main thread
// building the slabs ON THE SAME SETUP — so the RNG is never drawn from twice.
let pool = null;
let jobId = 0;
const IDLE_MS = 20000;   // then the threads, and their scratch memory, are let go

function workerCount(asked) {
  const hc = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2;
  return Math.max(1, Math.min(8, Math.floor(asked ?? Math.min(4, hc - 1))));
}

function killPool() {
  if (!pool) return;
  const P = pool; pool = null;
  clearTimeout(P.idle);
  P.dead = P.dead || 'wood workers were shut down';
  for (const w of P.workers) { try { w.worker.terminate(); } catch { /* already gone */ } }
  for (const j of [...P.jobs.values()]) j.fail(new Error(P.dead));
}

/** Start the workers now, so they are loaded by the time the skeleton is grown. */
export function warmWoodWorkers(asked) {
  if (typeof Worker === 'undefined') return null;
  const n = workerCount(asked);
  if (pool && !pool.dead && pool.workers.length === n) { clearTimeout(pool.idle); return pool; }
  killPool();
  const mine = (pool = { workers: [], jobs: new Map(), dead: null, idle: null, pump: () => {} });
  const die = (why) => { if (mine.dead) return; mine.dead = why; if (pool === mine) killPool(); else for (const j of [...mine.jobs.values()]) j.fail(new Error(why)); };
  try {
    const url = new URL(`./woodfield-worker.js${new URL(import.meta.url).search}`, import.meta.url);
    for (let i = 0; i < n; i++) {
      const w = { worker: new Worker(url, { type: 'module' }), ready: false, busy: null, sent: new Set() };
      w.worker.onmessage = (ev) => {
        const m = ev.data;
        if (m.type === 'ready') { w.ready = true; mine.pump(); return; }
        if (m.type === 'error') return die(`wood worker: ${m.message}`);
        if (m.type !== 'slab') return;
        w.busy = null;
        const j = mine.jobs.get(m.id);
        if (j) j.got(m.slab, m.out, m.ms);
        mine.pump();
      };
      w.worker.onerror = (e) => die(`wood worker failed: ${e && e.message || 'could not start'}`);
      w.worker.onmessageerror = () => die('wood worker: a message could not be read');
      mine.workers.push(w);
    }
  } catch (e) { die(`wood workers could not be created: ${e && e.message || e}`); }
  return mine;   // possibly dead already; `dead` says why
}

/**
 * The slabs, built by whoever can. Workers take them as they come free; and the MAIN
 * THREAD takes them too, in `budgetMs` slices, for exactly as long as no worker is ready
 * to — before they have loaded, if they never load, and after they die. So nothing here
 * waits on a worker, and no failure of one can cost a tree: a worker that never starts
 * is a build that happened on the main thread, as it always used to, a slab at a time.
 * (An earlier version waited for the workers and fell back on a timeout: a page whose
 * workers silently never answered stood still for six seconds first.)
 */
function slabsByAnyone(job, asked, signal, repeat, budgetMs) {
  const P = warmWoodWorkers(asked);
  const alive = () => !!P && !P.dead;
  // Two slabs a worker, of about equal WORK (see slabRangesBalanced), handed out as
  // workers come free: a phone's cores are not equally fast, and the prediction is not
  // exact. More slabs would balance better and repeat more — three slices are evaluated
  // twice at every cut, and the cuts crowd into the middle where the work is.
  const ranges = slabRangesBalanced(job, workerCount(asked) * 2);
  const slice = Number.isFinite(budgetMs) ? budgetMs : 10;   // workers were ASKED for: never block them out
  const id = ++jobId;
  return new Promise((resolve, reject) => {
    const n = ranges.length, parts = new Array(n), slabMs = new Array(n);
    const queue = ranges.map((_, i) => i), inflight = new Map();
    let done = 0, workMs = 0, mainSlabs = 0, over = false, helping = false, why = P ? P.dead : 'no Worker here';
    const finish = (err) => {
      if (over) return; over = true;
      if (signal) signal.removeEventListener('abort', onAbort);
      if (P) {
        P.jobs.delete(id);
        if (alive()) for (const w of P.workers) if (w.sent.delete(id)) { try { w.worker.postMessage({ type: 'drop', id }); } catch { /* dying */ } }
        if (pool === P && !P.jobs.size) { clearTimeout(P.idle); P.idle = setTimeout(() => { if (pool === P && !P.jobs.size) killPool(); }, IDLE_MS); }
      }
      if (err) reject(err);
      else resolve({ parts, slabs: n, workers: mainSlabs === n ? 0 : P.workers.length, mainSlabs, workMs: Math.round(workMs), slabMs, why: why || null });
    };
    const got = (slab, out, ms) => {
      if (over || parts[slab]) return;
      parts[slab] = out; slabMs[slab] = Math.round(ms); workMs += ms;
      if (++done === n) finish(null);
    };
    const onAbort = () => finish(aborted());
    if (signal) { if (signal.aborted) return finish(aborted()); signal.addEventListener('abort', onAbort); }

    const scratch = {};
    const help = async () => {
      if (helping) return; helping = true;
      try {
        while (!over && queue.length && !(alive() && P.workers.some((w) => w.ready))) {
          const slab = queue.shift(), t0 = performance.now();
          const it = slabSteps(job, ranges[slab][0], ranges[slab][1], scratch);
          let t = performance.now(), r;
          for (;;) {
            r = it.next();
            if (r.done) break;
            if (performance.now() - t >= slice) { await nextTask(); if (over) return; t = performance.now(); }
          }
          mainSlabs++; got(slab, r.value, performance.now() - t0);
        }
      } catch (e) { finish(e); } finally { helping = false; }
    };

    if (P) {
      P.jobs.set(id, {
        // The pool died (killPool, or a worker's error): what it was holding goes back in
        // the queue, in order, and the main thread carries on.
        fail: (e) => { why = String(e && e.message || e); for (const slab of [...inflight.keys()].sort((a, b) => b - a)) queue.unshift(slab); inflight.clear(); help(); },
        got: (slab, out, ms) => { inflight.delete(slab); got(slab, out, ms); },
        give: (w) => {
          if (over || !queue.length) return false;
          if (!w.sent.has(id)) { w.worker.postMessage({ type: 'job', id, job }); w.sent.add(id); }
          const slab = queue.shift();
          inflight.set(slab, w); w.busy = id;
          w.worker.postMessage({ type: 'slab', id, slab, zc0: ranges[slab][0], zc1: ranges[slab][1], repeat });
          return true;
        },
      });
      P.pump = () => { if (P.dead) return; for (const w of P.workers) { if (!w.ready || w.busy !== null) continue; for (const j of P.jobs.values()) if (j.give(w)) break; } };
      P.pump();
    }
    help();
  });
}

/**
 * The product's driver. In workers when it can (`workers`: how many; 0 = never), and
 * otherwise — or the moment anything about them fails — on the main thread in
 * `budgetMs` slices, as it always was. Either way the mesh is the same, to the bit.
 * `signal` abandons the build (a newer tree was asked for) with an AbortError.
 */
export async function buildThickWoodAsync(limbs, r, opts = {}) {
  const { budgetMs = 10, signal = null, workers = 0 } = opts;
  const t0 = performance.now();
  const { cuts, job } = setup(limbs, r, opts);
  if (!job) return { geometry: null, cuts };
  if (workers !== 0) {
    const w = await slabsByAnyone(job, workers === true ? undefined : workers, signal, opts.workerRepeat || 1, budgetMs);
    if (w.why) console.warn(`[wood] ${w.mainSlabs} of ${w.slabs} slabs were built on the main thread: ${w.why}`);
    const stats = { how: w.workers ? 'workers' : 'main', workers: w.workers, slabs: w.slabs, mainSlabs: w.mainSlabs, workMs: w.workMs, slabMs: w.slabMs, ...(w.why ? { fellBack: w.why } : {}) };
    return { geometry: assemble(job, w.parts, { ...stats, totalMs: Math.round(performance.now() - t0) }), cuts };
  }
  const parts = await mainSliced(job, budgetMs, signal);
  return { geometry: assemble(job, parts, { how: 'main', totalMs: Math.round(performance.now() - t0) }), cuts };
}
