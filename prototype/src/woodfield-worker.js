// A worker that builds slabs of the wood field. See woodfield.js for why this can be
// parallel at all, and woodsdf.js (the pool) for who talks to it.
//
// No `three` anywhere under this file: a module worker does not see the page's import
// map. The kernel is imported with this worker's own query string, so a page opened
// with `?v=N` gets the matching kernel rather than a cached one.
//
//   in   { type: 'job',  id, job }               the grid and the limbs, once per build
//        { type: 'slab', id, slab, zc0, zc1, repeat? }   build these cells of it
//        { type: 'drop', id }                    that build is over (done, or abandoned)
//   out  { type: 'ready' }
//        { type: 'slab', id, slab, ms, out }     out = { pos, nor, col, grv, brk }, transferred
//        { type: 'error', id, slab, message }

const kernel = import(`./woodfield.js${self.location.search}`);
const jobs = new Map();
const scratch = {};

self.onmessage = async (ev) => {
  const m = ev.data;
  try {
    if (m.type === 'job') { jobs.set(m.id, m.job); return; }
    if (m.type === 'drop') { jobs.delete(m.id); return; }
    if (m.type !== 'slab') return;
    const job = jobs.get(m.id);
    if (!job) return;                                  // dropped while this was queued
    const { buildSlab } = await kernel;
    const t0 = performance.now();
    // `repeat` is an INSTRUMENT, never a product setting: DevTools' CPU throttle slows the
    // main thread and leaves workers at full speed, so a throttled measurement flatters a
    // worker build by exactly the throttle. Building each slab N times puts it back.
    for (let i = 1; i < (m.repeat || 1); i++) buildSlab(job, m.zc0, m.zc1, scratch);
    const out = buildSlab(job, m.zc0, m.zc1, scratch);
    self.postMessage({ type: 'slab', id: m.id, slab: m.slab, ms: performance.now() - t0, out },
      [out.pos.buffer, out.nor.buffer, out.col.buffer, out.grv.buffer, out.brk.buffer]);
  } catch (e) {
    self.postMessage({ type: 'error', id: m.id, slab: m.slab, message: String(e && e.message || e) });
  }
};

kernel.then(() => self.postMessage({ type: 'ready' }),
  (e) => self.postMessage({ type: 'error', id: null, slab: null, message: `kernel failed to load: ${e && e.message || e}` }));
