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
import { clamp, smoothstep, rr } from './util.js';
import { groove, grooveFreq, relaxedRadii } from './limbmesh.js';

// Below the chunky tips' minimum radius, so in the chunky style EVERY limb lives
// in the field to its tip: each tip is a smooth dome and there is no hand-over to
// a tube at all. (The hand-over showed as a chisel cut and a notch near the tips.)
// Tubes remain only for genuinely thin wood, which the chunky style does not have.
export const CUT = 0.02;
const BIG = 1e9;

/** Polynomial smooth minimum; k is the blend width in world units. */
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

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
 * The build, as a GENERATOR that yields at cheap, frequent checkpoints (after
 * every capsule segment of the field fill, after every z-slab of the marching
 * cubes). It is the single implementation; the two drivers below only differ in
 * what they do at a yield.
 *
 * Why: this build is 1.5-2.5 s and, once the tree is in the product, it is on the
 * critical path of a page with a "growing" state. Run in one go it freezes the
 * tab for that long. A worker would be the other answer, but module workers do
 * not see the page's import map, and this file leans on three and its
 * marching-cubes tables — time-slicing costs nothing and changes no output.
 *
 * @returns { geometry, cuts } — cuts maps each limb to the number of its chain
 *   nodes covered by the field, so the tube mesher can pick up where it stops.
 */
function* thickWoodSteps(limbs, r, opts = {}) {
  const { voxel = 0.026 } = opts;
  const h = voxel;
  const t0 = performance.now();

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
      k: clamp(radii[0] * 0.95, 0.03, 0.2),
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
  if (!chains.length) return { geometry: null, cuts };

  // --- 2. grid ---------------------------------------------------------------
  const lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const c of chains) for (let i = 0; i < c.pts.length; i++) {
    const pad = c.rad[i] + c.k + 4 * h + 0.06;
    lo.min(c.pts[i].clone().subScalar(pad));
    hi.max(c.pts[i].clone().addScalar(pad));
  }
  const nx = Math.ceil((hi.x - lo.x) / h) + 1, ny = Math.ceil((hi.y - lo.y) / h) + 1, nz = Math.ceil((hi.z - lo.z) / h) + 1;
  const N = nx * ny * nz;
  // Seven arrays of ~15 million floats. Allocating and filling them in one go was a
  // 300 ms stall BEFORE the first checkpoint — the longest frozen frame in the whole
  // build — so each is its own step.
  const field = new Float32Array(N).fill(BIG);   // smooth-blended distance
  yield 'alloc';
  const best = new Float32Array(N).fill(BIG);    // hard minimum: who OWNS this point
  yield 'alloc';
  const rField = new Float32Array(N);            // owner's local radius
  const gField = new Float32Array(N);            // owner's groove value
  yield 'alloc';
  const tmp = new Float32Array(N).fill(BIG);
  yield 'alloc';
  const tmpR = new Float32Array(N), tmpG = new Float32Array(N);
  yield 'alloc';
  const sx = 1, sy = nx, sz = nx * ny;

  // --- 3. evaluate, limb by limb ----------------------------------------------
  // Within ONE limb the distance is a hard minimum over its capsules — a smooth
  // minimum there would inflate the limb wherever consecutive capsules overlap.
  // BETWEEN limbs it is smooth, and that blend is the fillet.
  const touched = [];
  const ba = new THREE.Vector3();
  for (const c of chains) {
    touched.length = 0;
    const fr = frames(c.pts);
    let z0 = c.seed * 3.7;
    for (let s = 0; s < c.pts.length - 1; s++) {
      const A = c.pts[s], B = c.pts[s + 1], ra = c.rad[s], rb = c.rad[s + 1];
      ba.copy(B).sub(A);
      const l2 = ba.lengthSq(), len = Math.sqrt(l2);
      const { N: FN, B: FB } = fr[s];
      const pad = Math.max(ra, rb) + c.k + 3 * h + 0.06;
      const ix0 = Math.max(0, Math.floor((Math.min(A.x, B.x) - pad - lo.x) / h)), ix1 = Math.min(nx - 1, Math.ceil((Math.max(A.x, B.x) + pad - lo.x) / h));
      const iy0 = Math.max(0, Math.floor((Math.min(A.y, B.y) - pad - lo.y) / h)), iy1 = Math.min(ny - 1, Math.ceil((Math.max(A.y, B.y) + pad - lo.y) / h));
      const iz0 = Math.max(0, Math.floor((Math.min(A.z, B.z) - pad - lo.z) / h)), iz1 = Math.min(nz - 1, Math.ceil((Math.max(A.z, B.z) + pad - lo.z) / h));
      for (let iz = iz0; iz <= iz1; iz++) {
        const pz = lo.z + iz * h - A.z;
        for (let iy = iy0; iy <= iy1; iy++) {
          const py = lo.y + iy * h - A.y;
          let idx = ix0 + iy * sy + iz * sz;
          for (let ix = ix0; ix <= ix1; ix++, idx++) {
            const px = lo.x + ix * h - A.x;
            const t = clamp((px * ba.x + py * ba.y + pz * ba.z) / l2, 0, 1);
            const vx = px - ba.x * t, vy = py - ba.y * t, vz = pz - ba.z * t;
            const rl = ra + (rb - ra) * t;
            let d = Math.sqrt(vx * vx + vy * vy + vz * vz) - rl;
            if (d > c.k + 3 * h + 0.06) continue;   // beyond anything the blend or the mesh can see
            let g = 0;
            if (d < 0.1 && d > -0.12) {
              const th = Math.atan2(vx * FB.x + vy * FB.y + vz * FB.z, vx * FN.x + vy * FN.y + vz * FN.z);
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
            if (d < tmp[idx]) {
              if (tmp[idx] === BIG) touched.push(idx);
              tmp[idx] = d; tmpR[idx] = rl; tmpG[idx] = g;
            }
          }
        }
      }
      z0 += len;
      yield 'field';
    }
    for (const idx of touched) {
      const d = tmp[idx];
      if (d < best[idx]) { best[idx] = d; rField[idx] = tmpR[idx]; gField[idx] = tmpG[idx]; }
      field[idx] = field[idx] === BIG ? d : smin(field[idx], d, c.k);
      tmp[idx] = BIG;
    }
  }
  const tField = performance.now() - t0;

  // --- 4. marching cubes -------------------------------------------------------
  const pos = [], nor = [], col = [], grv = [], brk = [];
  const cornerOff = [0, sx, sx + sy, sy, sz, sx + sz, sx + sy + sz, sy + sz];       // Bourke order
  const cornerXYZ = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  const edgeV = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const val = new Float32Array(8);
  const vx_ = new Float32Array(12), vy_ = new Float32Array(12), vz_ = new Float32Array(12);
  const vnx = new Float32Array(12), vny = new Float32Array(12), vnz = new Float32Array(12);
  const vr = new Float32Array(12), vg = new Float32Array(12);

  const grad = (ix, iy, iz, out) => {
    const i = ix + iy * sy + iz * sz, c0 = field[i];
    const g1 = (a, b) => {
      const fa = a >= 0 ? field[a] : BIG, fb = b >= 0 ? field[b] : BIG;
      const A = fa < BIG / 2 ? fa : c0 + h, B = fb < BIG / 2 ? fb : c0 + h;
      return A - B;
    };
    out[0] = g1(ix + 1 < nx ? i + sx : -1, ix > 0 ? i - sx : -1);
    out[1] = g1(iy + 1 < ny ? i + sy : -1, iy > 0 ? i - sy : -1);
    out[2] = g1(iz + 1 < nz ? i + sz : -1, iz > 0 ? i - sz : -1);
  };
  const ga = [0, 0, 0], gb = [0, 0, 0];

  for (let iz = 0; iz < nz - 1; iz++) {
   if (iz) yield 'mesh';
   for (let iy = 0; iy < ny - 1; iy++) {
    let q = iy * sy + iz * sz;
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
        vx_[e] = lo.x + (ax + (bx - ax) * mu) * h;
        vy_[e] = lo.y + (ay + (by - ay) * mu) * h;
        vz_[e] = lo.z + (az + (bz - az) * mu) * h;
        grad(ax, ay, az, ga); grad(bx, by, bz, gb);
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
        for (const e of [e0, e1, e2]) {
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

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geometry.setAttribute('groove', new THREE.Float32BufferAttribute(grv, 1));
  geometry.setAttribute('barkR', new THREE.Float32BufferAttribute(brk, 1));
  geometry.userData.stats = {
    grid: [nx, ny, nz], voxels: N, triangles: pos.length / 9,
    fieldMs: Math.round(tField), totalMs: Math.round(performance.now() - t0),
  };
  return { geometry, cuts };
}

/** Synchronous driver: runs the build straight through. Same output as ever. */
export function buildThickWood(limbs, r, opts = {}) {
  const it = thickWoodSteps(limbs, r, opts);
  for (;;) { const s = it.next(); if (s.done) return s.value; }
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

/**
 * Time-sliced driver: works for `budgetMs` at a stretch, then hands the thread
 * back so the page can paint and respond. `signal` abandons the build (a newer
 * tree was asked for); it rejects with an AbortError.
 */
export async function buildThickWoodAsync(limbs, r, opts = {}) {
  const { budgetMs = 10, signal = null } = opts;
  const it = thickWoodSteps(limbs, r, opts);
  let t = performance.now();
  for (;;) {
    const s = it.next();
    if (s.done) return s.value;
    if (performance.now() - t >= budgetMs) {
      await nextTask();
      if (signal && signal.aborted) throw new DOMException('tree build superseded', 'AbortError');
      t = performance.now();
    }
  }
}
