# The wood field: slabs, workers, and what was actually slow — 2026-09-21

**Status: EXPERIMENT, output-neutral.** Every path below builds the SAME tree to the last bit
(proved, not assumed — see "Identity"). Workers are **off by default**
(`WOOD_WORKERS_DEFAULT` in `prototype/src/grow.js`); `?woodWorkers=1` turns them on, in the
product too. Code: `prototype/src/woodfield.js` (the kernel), `woodfield-worker.js`,
`woodsdf.js` (setup, pool, drivers), and the sliced skeleton in `branching.js`.

## What was asked, and what was true

The opening example tree took 15–20 s to arrive at 6x CPU throttle (plants-36). I had named
"the non-yielding skeleton phase" as the cause, and Lead re-prioritised on that. **It was wrong,
and it was mine.** Measured on the product path with each long task's START time:

| site (opening examples) | mountTree, synchronous | ground | skeleton | wood | foliage |
| --- | --- | --- | --- | --- | --- |
| gov.uk | 383 | 26 | 44 | 2471 | 50 |
| art.yale.edu | 304 | 24 | 35 | 1015 | 16 |
| en.wikipedia.org | 202 | 32 | 67 | 1952 | 19 |
| threejs.org | 182 | 46 | 92 | 2396 | 17 |

- The **wood field is 63–84%** of the time from "grow" to a tree; the skeleton is **2–4%**.
- The worst single long task is not the skeleton either. It starts at t = 23–66 ms and is
  `mountTree`'s own synchronous part (renderer, environment, first shaders). It barely scales
  with CPU throttle (461 ms at 4x, 500 ms at 6x) because it is mostly GPU-process wait. I had
  matched "90–200 ms x throttle" to those two figures: a coincidence of magnitudes.
- **The ms in that table are inflated and only its RATIOS are to be trusted** — see the next
  section. It is kept because it is the table the decision was made on.

## The instrument lied, twice (R12)

1. **The Browser pane is a BACKGROUNDED tab, and macOS runs a backgrounded tab's worker threads
   and its short main-thread bursts on slow cores.** The same arithmetic loop, same page: 400 ms
   as one long main-thread task, **1600 ms** in 10 ms slices, **2400–3600 ms** in a worker. So in
   that pane every SLICED or WORKER timing is 3–6x too slow while a straight-through build looks
   normal — which made workers look slower than the main thread, and the sliced wood phase look
   like 2.4 s when it is 0.6 s. Identity checks are unaffected; timings taken there are void.
   Everything below was re-measured in a headless Chrome that is not backgrounded
   (`time-to-tree.mjs`: the product path, 390x844 @2x, `tree.ready` as the finish line).
2. **DevTools' CPU throttle slows the main thread and NOT workers.** At "6x" the workers' slab
   times were identical to 1x, so a throttled run flatters a worker build by exactly the
   throttle: "5.2 s -> 1.4 s" is not a number. `woodWorkerRepeat=N` (an instrument, never a
   setting) makes each worker build its slab N times to put the throttle back.

## What changed

- **One numeric kernel with no `three` in it** (`woodfield.js`), because a module worker cannot
  see the page's import map. `groove()` moved there; `limbmesh.js` re-exports it, so the tubes
  and the field still share one function. Setup — limbs, frames, RNG draws, the grid — stays in
  `woodsdf.js` on the main thread and runs ONCE, so which thread fills the field cannot change
  what is drawn from the RNG.
- **Slabs.** The field is order-dependent AT a voxel (each limb is smooth-blended onto what is
  there, with its own blend width) and independent BETWEEN voxels. A slab evaluates every limb in
  the tree's order on its own z-slices, plus one halo slice each side for the normals' central
  difference, and the slabs' triangles concatenated in z order are the old loop's triangles in
  the old loop's order.
- **Memory.** The build held SEVEN dense Float32Arrays over the tree's bounding box: gov.uk is a
  204 x 272 x 212 grid, 11.8 M voxels, **329 MB**, to fill a few percent of them. Now four arrays
  per slab and three per-limb scratch arrays the size of one limb's box: **~31 MB** on the main
  thread (32-cell slabs), **<= ~24 MB per worker** (slabs capped at 24 cells). Computed from the
  array sizes, not measured as process memory. Nothing we have pointed at the page can see a tab
  being killed for memory, which is why this matters more than its line count.
- **The hot loops are plain functions, not the generator's body.** An engine does not optimise a
  generator mid-call, so a slab whose loops lived in the generator ran start to finish in
  baseline code in a fresh worker.
- **Slabs of equal WORK.** Two of eight equal-thickness slabs held 62% of the build (the trunk,
  the roots and the base of every primary stand in the middle of the grid), which caps four
  workers at 2.5x. Cuts are placed by predicted work (each segment's box per slice, doubled where
  the wood is grooved). In Node, single-threaded, clean: the slabs sum to 608 ms against 593 ms
  for the whole grid (the halo costs 2.5%), and handed to four workers in order that is 176 ms —
  **3.4x**, 14% off the ideal (`profile.mjs`).
- **Nothing waits for a worker.** The main thread builds slabs too, in `budgetMs` slices, for
  exactly as long as no worker is ready to: before they load, if they never load, after one
  dies. A first version waited and fell back on a timeout — a page whose workers silently never
  answered stood still for six seconds.
- **The skeleton is sliced** (`buildSkeletonAsync`). Written before the diagnosis was retracted;
  kept because it is proven identical and removes one 0.1–0.15 s task at 6x. Not the launch frame.

## Identity — what "the same tree" means here

In-page, `Object.is` on every float, against git snapshots served on loopback:

- vs **HEAD**: wood (every attribute + index), tubes, field/tube hand-over cuts, leaf spots, bloom
  sites, every InstancedMesh's matrices and geometry, extents — **8 configs x 6 paths, 48 of 48
  identical**: straight-through, sliced, 4 workers cold, 4 warm, 3 workers, and workers under a
  straight-through host; including slabs shared between main thread and workers ("2 of 12 on
  main"). Configs: bare / mid / sparse, five seeds, few / medium / abundant, fruit, autumn,
  winter, `ramify=1`, `sdf=0`, and two other voxel sizes.
- vs **328b746**, the commit BEFORE Gate 1's ramification: the wood mesh, 7 configs — `ramify=0`
  is still bit-for-bit after the leafy edits.
- Every way a worker can fail (`fallbacks.mjs`, by FNV hash of the wood's bytes): no `Worker`,
  constructor throws, worker script 404s, a worker killed mid-build, workers that never answer,
  and a newer tree asked for mid-build — **identical tree every time**, and none of them waits
  (the silent case: 6885 ms -> 928 ms once the main thread stopped waiting).

## Timings that can be trusted (headless Chrome, gov.uk, product path, 3 runs each)

| | wood phase | tree at |
| --- | --- | --- |
| HEAD, 1x | 619–639 ms | 1224–1227 ms |
| this, main thread, 1x | 593–633 ms | 1214–1225 ms |
| this, 4 workers, 1x | **248–281 ms** | **727–839 ms** |
| HEAD, 6x (main thread throttled) | 4036–4234 ms | 5036–5333 ms |
| this, main thread, 6x | 4039–4385 ms | 5149–5642 ms |

- The main-thread path is the same speed as before; what it gained is memory, and at 6x its long
  tasks fell from 8–9 (684–781 ms) to 3–5 (276–417 ms): the big allocations and the skeleton.
- **Workers: 2.4x on the phase, a third off the time to a tree, with cores to spare** — and the
  machine these were taken on was running other sessions; the workers' slabs summed to ~1.0 s
  against 0.6 s single-threaded in Node.
- **What a slow PHONE gets is not measured.** With the throttle put back on the workers
  (`woodWorkerRepeat=6`) two runs gave a tree at 3967 and 5048 ms against 5182 and 5642 on the
  main thread — but that is four busy threads for several seconds on a shared laptop, and the
  spread says so. The honest claim: on a phone whose cores are all slow but are several, the wood
  phase should land near the 1x ratio; on a phone with one usable core it is the main thread's
  time, plus nothing. **It wants one run on a real device before the default is flipped.**
- The 15–20 s seen on the product page is more than the build: this instrument reads ~5 s at 6x
  for the same trees. The rest is the page (shell, CDN, fonts, a cold cache), and is not here.

## Not done, and why

- **A resolution tier** — the only thing that cuts the WORK rather than spreading it. A phone
  draws ~97 device px per scene unit against a desktop's ~230, so voxel 0.026 is 2.5 px there and
  6 px here: the phone builds wood 2.4x finer than anyone can see. But twigs enter the field at
  0.04 across, already ~1.5 voxels; coarser and they bead unless the tube hand-over moves too.
  It changes what a tree IS. Lead's ruling: not tonight.
- **Cheaper grooves.** `groove()` is four 3-D noise lookups (32 `Math.sin`) per skin voxel of
  thick wood and most of the kernel's time. Three of them depend only on the distance along the
  limb and could be interpolated once per limb — but summed in a different order, so NOT
  bit-identical. Worth doing when "visually identical" is an acceptable contract; tonight it was not.
- **y-slabs.** The work is flatter along y than along z (the trunk's cost spreads up its height),
  but triangles are emitted z-major, so y-slabs need re-interleaving on assembly. 14% off ideal
  did not justify it.

## Files

- `time-to-tree.mjs <rate> <site> <reps> <query...>` — the instrument. `BASE=` points it at
  another server (a `git archive HEAD prototype` on a loopback port is the baseline).
- `fallbacks.mjs` — every failure mode, by hash. `profile.mjs` / `dump-job.mjs` — the kernel in
  Node, per slab, for cutting strategies.
