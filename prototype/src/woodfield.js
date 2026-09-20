// The wood field's NUMERIC KERNEL — and nothing else.
//
// This file imports no `three`, on purpose. A module worker does not see the page's
// import map, so anything a worker runs has to be reachable by relative paths alone
// (util.js is: it has no imports at all). Everything that needs three — the limbs, the
// frames, the RNG draws, the BufferGeometry — stays in woodsdf.js, on the main thread,
// and hands this file plain numbers.
//
// THERE IS ONE IMPLEMENTATION. The main thread's sliced build and the workers' build
// both run `slabSteps`, so they cannot drift apart: the same arithmetic in the same
// order on the same doubles, and therefore the same mesh to the last bit (proved with
// Object.is against the build as it was, not assumed).
//
// A SLAB is a run of marching-cubes cells along z. The field is order-dependent at a
// voxel (each limb is smooth-blended onto what is already there, and the blend width
// is the limb's own) but independent BETWEEN voxels — so a slab evaluates every limb,
// in the tree's order, on its own slices only, plus one halo slice each side for the
// gradient that gives a vertex its normal. Slabs meshed separately and concatenated in
// z order are the triangles the whole-grid loop produced, in the order it produced them.
//
// Two things follow, and the second matters more than the first:
//   - slabs can be built in PARALLEL (woodfield-worker.js), which takes the build off
//     the main thread altogether;
//   - nothing ever allocates the whole grid. The build used to hold SEVEN dense
//     Float32Arrays over the tree's bounding box — 11.8 million voxels and 329 MB for
//     an ordinary tree, to fill a few percent of them. A slab holds four arrays over
//     its own slices, and the three per-limb scratch arrays cover one limb's box.

import { clamp, smoothstep, noise3 } from './util.js';

export const BIG = 1e9;

/** Polynomial smooth minimum; k is the blend width in world units. */
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/**
 * Bark grooves, as a function of the angle round a limb and the distance along it.
 * It lives here because the field needs it inside a worker; limbmesh.js re-exports it,
 * so the tubes and the field still share the one function.
 */
export function groove(theta, z, seed, f1 = 8, fine = true) {
  const p1 = noise3(z * 0.42, seed, 1.7) * 2.6;
  const p2 = noise3(z * 0.55, seed, 9.1) * 2.6;
  const p3 = noise3(z * 0.7, seed, 23.4) * 2.6;
  // Frequencies are per-limb (see grooveFreq) but always INTEGERS, so the ring
  // closes. Fixed frequencies put the same nineteen grooves round a wrist-thick
  // limb as round the trunk, which is under two voxels a cycle and aliased the
  // field into scalloped banding.
  const f2 = Math.round(f1 * 1.6), f3 = Math.round(f1 * 2.4);
  let v = 0.5 * Math.cos(f1 * theta + p1)
        + 0.32 * Math.cos(f2 * theta + p2 + 1.3)
        + (fine ? 0.18 * Math.cos(f3 * theta + p3 + 4.1) : 0);   // the finest harmonic is below what the voxel grid carries on a limb
  // Grooves come and go along the limb; a groove that never stops is a flute
  // on a column, and that is architecture, not a tree.
  v *= 0.6 + 0.4 * noise3(z * 0.8, seed + 40, 5.5);
  return smoothstep(0.05, -0.62, v);
}

/**
 * How to cut a grid of `nz` slices into slabs of about `cells` marching-cubes cells.
 * The thickness changes nothing in the output — only how much is held at once, and how
 * evenly the work divides.
 */
export function slabRanges(nz, cells) {
  const out = [];
  const n = Math.max(1, Math.round(cells));
  for (let z = 0; z < nz - 1; z += n) out.push([z, Math.min(nz - 1, z + n)]);
  return out;
}

/**
 * Slabs of about EQUAL WORK, for workers. Equal thickness is badly unequal work: the
 * trunk, the roots and the base of every primary limb stand in the middle of the grid,
 * and measured on an ordinary tree two of eight equal slabs held 62% of the build — so
 * four workers could not beat 2.5x. The work is predicted from what the kernel will
 * actually loop over — each segment's box, slice by slice, and twice that where the wood
 * is grooved (measured against real slab times, not assumed).
 * Where the cuts fall changes nothing in the mesh.
 */
export function slabRangesBalanced(job, slabs, minCells = 4, maxCells = 24) {
  const { h, lo, nx, ny, nz, chains } = job;
  const cost = new Float64Array(nz);
  for (const c of chains) for (let s = 0; s < c.n - 1; s++) {
    const pad = Math.max(c.rad[s], c.rad[s + 1]) + c.k + 3 * h + 0.06;
    const span = (a, b, l, n) => Math.min(n - 1, Math.ceil((Math.max(a, b) + pad - l) / h)) - Math.max(0, Math.floor((Math.min(a, b) - pad - l) / h)) + 1;
    const area = Math.max(0, span(c.px[s], c.px[s + 1], lo[0], nx)) * Math.max(0, span(c.py[s], c.py[s + 1], lo[1], ny));
    const z0 = Math.max(0, Math.floor((Math.min(c.pz[s], c.pz[s + 1]) - pad - lo[2]) / h)), z1 = Math.min(nz - 1, Math.ceil((Math.max(c.pz[s], c.pz[s + 1]) + pad - lo[2]) / h));
    // Wood thick enough to be grooved pays for the grooves at every voxel of its skin
    // (four noise lookups and an atan2): measured, such a slice costs about twice its box.
    const w = c.grooves && Math.max(c.rad[s], c.rad[s + 1]) > 0.085 ? 2 : 1;
    for (let z = z0; z <= z1; z++) cost[z] += area * w;
  }
  let total = 0; for (let z = 0; z < nz; z++) total += cost[z];
  const n = Math.max(1, Math.min(Math.round(slabs), Math.floor((nz - 1) / minCells) || 1));
  const out = []; let from = 0, acc = 0;
  for (let z = 0; total > 0 && z < nz - 1 && out.length < n - 1; z++) {
    acc += cost[z];
    const cells = z + 1 - from, left = (nz - 1) - (z + 1), need = (n - 1 - out.length) * minCells;
    if ((acc >= total * (out.length + 1) / n && cells >= minCells && left >= need) || left === need) { out.push([from, z + 1]); from = z + 1; }
  }
  out.push([from, nz - 1]);
  // ...and no slab thicker than `maxCells`, whatever it costs: the ends of the grid hold
  // a few twig tips, so equal work makes them THICK, and a slab's arrays are as big as
  // it is thick. This is the bound on what one worker holds (~24 MB on an ordinary tree).
  const capped = [];
  for (const [a, b] of out) {
    const k = Math.ceil((b - a) / maxCells);
    for (let i = 0; i < k; i++) capped.push([a + Math.floor(((b - a) * i) / k), a + Math.floor(((b - a) * (i + 1)) / k)]);
  }
  return capped;
}

const cornerXYZ = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const edgeV = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];

/**
 * One capsule segment of one limb, onto the limb's scratch box. Returns the segment's
 * length (the caller's running arc length). A plain function, called once a segment, so
 * that the engine optimises it — see the note in slabSteps.
 */
function evalSegment(S, c, s, z0, ix0, ix1, iy0, iy1, iz0, iz1) {
  const h = S.h, lox = S.lox, loy = S.loy, loz = S.loz, sy = S.sy, sz = S.sz, s0 = S.s0;
  const cx0 = S.cx0, cy0 = S.cy0, cz0 = S.cz0, cnx = S.cnx, cny = S.cny;
  const tmp = S.tmp, tmpR = S.tmpR, tmpG = S.tmpG, touchedL = S.touchedL, touchedG = S.touchedG;
  const Ax = c.px[s], Ay = c.py[s], Az = c.pz[s];
  const ra = c.rad[s], rb = c.rad[s + 1];
  const bax = c.px[s + 1] - Ax, bay = c.py[s + 1] - Ay, baz = c.pz[s + 1] - Az;
  const l2 = bax * bax + bay * bay + baz * baz, len = Math.sqrt(l2);
  const FNx = c.fN[3 * s], FNy = c.fN[3 * s + 1], FNz = c.fN[3 * s + 2];
  const FBx = c.fB[3 * s], FBy = c.fB[3 * s + 1], FBz = c.fB[3 * s + 2];
  for (let iz = iz0; iz <= iz1; iz++) {
    const pz = loz + iz * h - Az;
    for (let iy = iy0; iy <= iy1; iy++) {
      const py = loy + iy * h - Ay;
      let idx = ix0 + iy * sy + (iz - s0) * sz;
      let l = (ix0 - cx0) + (iy - cy0) * cnx + (iz - cz0) * cnx * cny;
      for (let ix = ix0; ix <= ix1; ix++, idx++, l++) {
        const px = lox + ix * h - Ax;
        const t = clamp((px * bax + py * bay + pz * baz) / l2, 0, 1);
        const vx = px - bax * t, vy = py - bay * t, vz = pz - baz * t;
        const rl = ra + (rb - ra) * t;
        let d = Math.sqrt(vx * vx + vy * vy + vz * vz) - rl;
        if (d > c.k + 3 * h + 0.06) continue;   // beyond anything the blend or the mesh can see
        let g = 0;
        if (d < 0.1 && d > -0.12) {
          const th = Math.atan2(vx * FBx + vy * FBy + vz * FBz, vx * FNx + vy * FNy + vz * FNz);
          const arc = (z0 - c.seed * 3.7) + t * len;
          // A cross-section is never a circle; integer frequencies close the ring.
          d -= rl * (0.05 * Math.cos(3 * th + c.seed) + 0.03 * Math.cos(5 * th - c.seed * 1.7 + arc * 1.3));
          if (c.grooves) {
            // Grooves only where the grid can carry them. On thinner limbs they
            // are narrower than a couple of voxels and alias into a zipper; the
            // named target is broad soft grooves on the TRUNK in any case.
            const depth = clamp((rl - 0.085) * 0.24, 0, 0.05) * (c.isTrunk ? 1 : smoothstep(0.08, 0.6, arc));
            if (depth > 0) { g = groove(th, z0 + t * len, c.seed, c.f1, c.isTrunk); d += depth * g; g *= clamp(depth / 0.02, 0, 1); }
          }
        }
        if (d < tmp[l]) {
          if (tmp[l] === BIG) { touchedL.push(l); touchedG.push(idx); }
          tmp[l] = d; tmpR[l] = rl; tmpG[l] = g;
        }
      }
    }
  }
  return len;
}

// Marching cubes' per-cell working set. Module-level is safe: a slab is meshed slice by
// slice and nothing here outlives a cell.
const val = new Float32Array(8);
const vx_ = new Float32Array(12), vy_ = new Float32Array(12), vz_ = new Float32Array(12);
const vnx = new Float32Array(12), vny = new Float32Array(12), vnz = new Float32Array(12);
const vr = new Float32Array(12), vg = new Float32Array(12);
const ga = [0, 0, 0], gb = [0, 0, 0];

// `iz` is the GRID's slice; the slab's arrays start at slice s0. A neighbour exists if
// the GRID has it — the halo is there so that the slab has it too.
function grad1(field, c0, h, a, b) {
  const fa = a >= 0 ? field[a] : BIG, fb = b >= 0 ? field[b] : BIG;
  const A = fa < BIG / 2 ? fa : c0 + h, B = fb < BIG / 2 ? fb : c0 + h;
  return A - B;
}
function grad(S, ix, iy, iz, out) {
  const field = S.field, sy = S.sy, sz = S.sz, h = S.h;
  const i = ix + iy * sy + (iz - S.s0) * sz, c0 = field[i];
  out[0] = grad1(field, c0, h, ix + 1 < S.nx ? i + 1 : -1, ix > 0 ? i - 1 : -1);
  out[1] = grad1(field, c0, h, iy + 1 < S.ny ? i + sy : -1, iy > 0 ? i - sy : -1);
  out[2] = grad1(field, c0, h, iz + 1 < S.nz ? i + sz : -1, iz > 0 ? i - sz : -1);
}

/** Marching cubes over the cells of one z-slice. Plain, for the same reason. */
function meshSlice(S, iz, out) {
  const { h, lox, loy, loz, nx, ny, sy, sz, s0, edgeTable, triTable, field, rField, gField } = S;
  const { pos, nor, col, grv, brk } = out;
  const sx = 1;
  const cornerOff = [0, sx, sx + sy, sy, sz, sx + sz, sx + sy + sz, sy + sz];       // Bourke order
  for (let iy = 0; iy < ny - 1; iy++) {
    let q = iy * sy + (iz - s0) * sz;
    for (let ix = 0; ix < nx - 1; ix++, q++) {
      if (field[q] > BIG / 2) continue;
      let ci = 0, ok = true;
      for (let k = 0; k < 8; k++) {
        const v = field[q + cornerOff[k]];
        if (v > BIG / 2) { ok = false; break; }
        val[k] = v;
        if (v < 0) ci |= 1 << k;
      }
      if (!ok) continue;
      const bits = edgeTable[ci];
      if (bits === 0) continue;

      for (let e = 0; e < 12; e++) {
        if (!(bits & (1 << e))) continue;
        const a = edgeV[e][0], b = edgeV[e][1];
        const mu = clamp(val[a] / (val[a] - val[b]), 0, 1);
        const ax = ix + cornerXYZ[a][0], ay = iy + cornerXYZ[a][1], az = iz + cornerXYZ[a][2];
        const bx = ix + cornerXYZ[b][0], by = iy + cornerXYZ[b][1], bz = iz + cornerXYZ[b][2];
        vx_[e] = lox + (ax + (bx - ax) * mu) * h;
        vy_[e] = loy + (ay + (by - ay) * mu) * h;
        vz_[e] = loz + (az + (bz - az) * mu) * h;
        grad(S, ax, ay, az, ga); grad(S, bx, by, bz, gb);
        let gx = ga[0] + (gb[0] - ga[0]) * mu, gy = ga[1] + (gb[1] - ga[1]) * mu, gz = ga[2] + (gb[2] - ga[2]) * mu;
        const gl = Math.hypot(gx, gy, gz) || 1;
        vnx[e] = gx / gl; vny[e] = gy / gl; vnz[e] = gz / gl;
        const ia = q + cornerOff[a], ib = q + cornerOff[b];
        vr[e] = rField[ia] + (rField[ib] - rField[ia]) * mu;
        vg[e] = gField[ia] + (gField[ib] - gField[ia]) * mu;
      }

      for (let t = ci * 16; triTable[t] !== -1; t += 3) {
        let e0 = triTable[t], e1 = triTable[t + 1], e2 = triTable[t + 2];
        // Orient by the field, not by the table's convention: the face normal
        // must agree with the distance gradient, which points OUT of the wood.
        const ux = vx_[e1] - vx_[e0], uy = vy_[e1] - vy_[e0], uz = vz_[e1] - vz_[e0];
        const wx = vx_[e2] - vx_[e0], wy = vy_[e2] - vy_[e0], wz = vz_[e2] - vz_[e0];
        const fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx;
        if (fx * vnx[e0] + fy * vny[e0] + fz * vnz[e0] < 0) { const s = e1; e1 = e2; e2 = s; }
        for (let v = 0; v < 3; v++) {
          const e = v === 0 ? e0 : v === 1 ? e1 : e2;
          pos.push(vx_[e], vy_[e], vz_[e]);
          nor.push(vnx[e], vny[e], vnz[e]);
          grv.push(vg[e]); brk.push(vr[e]);
          // Gentle, warm contact with the ground. No crotch shading here: a
          // filleted union does not have a crease to shade.
          const low = 1 - smoothstep(-0.05, 0.55, vy_[e]);
          const ao = 1 - low * 0.4;
          col.push(ao, ao, ao);
        }
      }
    }
  }
}

/**
 * Build the cells iz in [zc0, zc1) of the grid described by `job`.
 *
 * job = { h, lo: [x, y, z], nx, ny, nz, edgeTable, triTable, chains }
 * chain = { n, px, py, pz, rad, fN, fB, k, seed, grooves, f1, isTrunk } — the points of
 *   one limb's capsule chain, its radii, and the parallel-transported frame of each
 *   segment (N and B, three numbers each), all as doubles.
 *
 * A GENERATOR, yielding after every capsule segment and every slice of the mesh, so
 * the main thread can slice it. A worker simply runs it through.
 *
 * @returns { pos, nor, col, grv, brk } — Float32Arrays, this slab's triangles.
 */
export function* slabSteps(job, zc0, zc1, scratch = {}) {
  const { h, lo, nx, ny, nz, edgeTable, triTable, chains } = job;
  const lox = lo[0], loy = lo[1], loz = lo[2];
  // The slices this slab needs: its cells' corners, and one more each side where the
  // grid has one — a vertex's normal is a central difference of the field.
  const s0 = Math.max(0, zc0 - 1), s1 = Math.min(nz - 1, zc1 + 1);
  const ns = s1 - s0 + 1;
  const sx = 1, sy = nx, sz = nx * ny;
  const M = nx * ny * ns;

  const field = new Float32Array(M).fill(BIG);   // smooth-blended distance
  const best = new Float32Array(M).fill(BIG);    // hard minimum: who OWNS this point
  yield 'alloc';
  const rField = new Float32Array(M);            // owner's local radius
  const gField = new Float32Array(M);            // owner's groove value
  yield 'alloc';

  const touchedL = [], touchedG = [];
  // The hot loops are PLAIN FUNCTIONS (evalSegment, meshSlice), not the body of this
  // generator, and that is a measured decision: an engine does not optimise a generator
  // in the middle of a call, so a slab whose loops lived here ran start to finish in
  // baseline code — four times slower in a fresh worker, and on a page's FIRST tree.
  // Same statements, same order, same doubles; only where they live.
  const S = {
    h, lox, loy, loz, nx, ny, nz, sy, sz, s0, edgeTable, triTable,
    field: null, rField: null, gField: null,
    tmp: null, tmpR: null, tmpG: null, cx0: 0, cy0: 0, cz0: 0, cnx: 0, cny: 0,
    touchedL, touchedG,
  };

  // --- evaluate, limb by limb ---------------------------------------------------
  // Within ONE limb the distance is a hard minimum over its capsules — a smooth
  // minimum there would inflate the limb wherever consecutive capsules overlap.
  // BETWEEN limbs it is smooth, and that blend is the fillet.
  const box = [];
  for (const c of chains) {
    // This limb's boxes on the grid, segment by segment, and the box of all of them:
    // the scratch arrays are that big and no bigger.
    const nseg = c.n - 1;
    let cx0 = Infinity, cx1 = -Infinity, cy0 = Infinity, cy1 = -Infinity, cz0 = Infinity, cz1 = -Infinity;
    box.length = 0;
    for (let s = 0; s < nseg; s++) {
      const ax = c.px[s], ay = c.py[s], az = c.pz[s], bx = c.px[s + 1], by = c.py[s + 1], bz = c.pz[s + 1];
      const ra = c.rad[s], rb = c.rad[s + 1];
      const pad = Math.max(ra, rb) + c.k + 3 * h + 0.06;
      const ix0 = Math.max(0, Math.floor((Math.min(ax, bx) - pad - lox) / h)), ix1 = Math.min(nx - 1, Math.ceil((Math.max(ax, bx) + pad - lox) / h));
      const iy0 = Math.max(0, Math.floor((Math.min(ay, by) - pad - loy) / h)), iy1 = Math.min(ny - 1, Math.ceil((Math.max(ay, by) + pad - loy) / h));
      const iz0 = Math.max(s0, Math.floor((Math.min(az, bz) - pad - loz) / h)), iz1 = Math.min(s1, Math.ceil((Math.max(az, bz) + pad - loz) / h));
      box.push(ix0, ix1, iy0, iy1, iz0, iz1);
      if (iz0 > iz1 || ix0 > ix1 || iy0 > iy1) continue;
      if (ix0 < cx0) cx0 = ix0; if (ix1 > cx1) cx1 = ix1;
      if (iy0 < cy0) cy0 = iy0; if (iy1 > cy1) cy1 = iy1;
      if (iz0 < cz0) cz0 = iz0; if (iz1 > cz1) cz1 = iz1;
    }
    if (cz0 > cz1) continue;                       // this limb does not reach this slab
    const cnx = cx1 - cx0 + 1, cny = cy1 - cy0 + 1, cn = cnx * cny * (cz1 - cz0 + 1);
    if (!scratch.tmp || scratch.tmp.length < cn) {
      // Grown, never shrunk, and BIG everywhere between limbs: a limb resets exactly
      // the entries it touched, as it always has.
      scratch.tmp = new Float32Array(cn).fill(BIG);
      scratch.tmpR = new Float32Array(cn);
      scratch.tmpG = new Float32Array(cn);
    }
    const tmp = scratch.tmp, tmpR = scratch.tmpR, tmpG = scratch.tmpG;

    touchedL.length = 0; touchedG.length = 0;
    S.cx0 = cx0; S.cy0 = cy0; S.cz0 = cz0; S.cnx = cnx; S.cny = cny;
    S.tmp = tmp; S.tmpR = tmpR; S.tmpG = tmpG;
    let z0 = c.seed * 3.7;
    for (let s = 0; s < nseg; s++) {
      const iz0 = box[6 * s + 4], iz1 = box[6 * s + 5];
      z0 += evalSegment(S, c, s, z0, box[6 * s], box[6 * s + 1], box[6 * s + 2], box[6 * s + 3], iz0, iz1);
      if (iz0 <= iz1) yield 'field';
    }
    for (let i = 0; i < touchedL.length; i++) {
      const l = touchedL[i], idx = touchedG[i];
      const d = tmp[l];
      if (d < best[idx]) { best[idx] = d; rField[idx] = tmpR[l]; gField[idx] = tmpG[l]; }
      field[idx] = field[idx] === BIG ? d : smin(field[idx], d, c.k);
      tmp[l] = BIG;
    }
  }

  // --- marching cubes -----------------------------------------------------------
  const out = { pos: [], nor: [], col: [], grv: [], brk: [] };
  const { pos, nor, col, grv, brk } = out;
  S.field = field; S.rField = rField; S.gField = gField;
  for (let iz = zc0; iz < zc1; iz++) {
    if (iz > zc0) yield 'mesh';
    meshSlice(S, iz, out);
  }

  return {
    pos: new Float32Array(pos), nor: new Float32Array(nor), col: new Float32Array(col),
    grv: new Float32Array(grv), brk: new Float32Array(brk),
  };
}

/** Run a slab straight through. What a worker does; the main thread slices instead. */
export function buildSlab(job, zc0, zc1, scratch) {
  const it = slabSteps(job, zc0, zc1, scratch);
  for (;;) { const s = it.next(); if (s.done) return s.value; }
}
