// Tree SKELETON — space colonization + botanical radius law.
//
// This replaces hand-placed limb tables with a grown structure. The reason is
// not that procedural is better in principle: it is that the old tree had three
// levels (trunk -> 4 primaries -> 8 secondaries -> 7 twigs) placed by hand, and
// real hierarchy is what separates a tree from a Y with blobs on it.
//
// Two pieces of botany do the heavy lifting.
//
// 1. SPACE COLONIZATION (Runions, Lane & Prusinkiewicz 2007). Seed a crown
//    volume with attraction points; every point pulls the nearest branch tip
//    within its influence radius; each tip averages its pulls and grows one
//    fixed step; points falling inside the kill radius are consumed. Branching
//    emerges where a tip is pulled in two directions at once, which is why the
//    hierarchy it produces looks grown rather than authored.
//
//    The two radii are the whole character of the result. Influence radius must
//    exceed kill distance. A SMALL influence radius makes tips meander between
//    point clouds and produces gnarly, characterful limbs; a large one produces
//    smooth confident sweeps. A LARGE kill distance leaves more empty air around
//    each limb, which is what stops the crown filling in like a bush.
//
// 2. DA VINCI'S RULE for thickness: the cross-sections above a fork sum to the
//    cross-section below it, r_parent^a = sum(r_child^a). Da Vinci implies
//    a = 2; Murray's law for fluid transport gives 3; real trees measure
//    1.8-3.0, with woody trees near the bottom of that range because they are
//    built for mechanical support rather than flow. The exponent is not a
//    detail — it is the difference between a weeping willow and an oak.
//
//    Radius by law rather than by feel is most of why a tree reads as expensive.
//    Invented taper produces limbs that are individually plausible and
//    collectively wrong, because the thicknesses do not add up at the forks.

import * as THREE from 'three';
import { rr, lerp, clamp } from './util.js';

/**
 * Attraction cloud. The envelope is the crown's shape, so this is where the
 * tree's silhouette actually comes from — not from any later trimming.
 *
 * Deliberately NOT a sphere. A sphere of points grows a lollipop. This is a
 * flattened dome, wider than tall, hollowed underneath so the crown sits ON the
 * branch structure instead of swallowing it.
 */
export function crownCloud(r, opts = {}) {
  const {
    count = 900,
    cx = 0, cy = 4.0, cz = 0,
    rx = 2.7, ry = 1.85, rz = 2.7,
    hollow = 0.42,   // how much of the underside is emptied
    lift = 0.22,     // bias points upward inside the envelope
    // Push points toward the envelope's SURFACE. Shoots cluster where the
    // light is, which is the outside of the crown and the ends of branches —
    // a uniform cloud spaces them evenly along the wood instead, which is what
    // made the twigs read as regular thorns on a stem.
    shell = 0,
  } = opts;

  const pts = [];
  let guard = 0;
  while (pts.length < count && guard++ < count * 60) {
    // Rejection-sample the unit ball, then shape it.
    const x = rr(r, -1, 1), y = rr(r, -1, 1), z = rr(r, -1, 1);
    const d2 = x * x + y * y + z * z;
    if (d2 > 1) continue;

    // Hollow the underside: reject points low down and near the axis, so the
    // crown has a concave base and the limbs below it stay visible.
    const radial = Math.hypot(x, z);
    if (y < 0 && radial < hollow * (1 + y)) continue;

    let sx = x, sy = y, sz = z;
    if (shell > 0) {
      const d = Math.sqrt(d2) || 1e-6;
      const k = lerp(d, 1, shell) / d;
      sx *= k; sy *= k; sz *= k;
    }
    const yy = sy + lift * (1 - sy * sy);
    pts.push(new THREE.Vector3(cx + sx * rx, cy + yy * ry, cz + sz * rz));
  }
  return pts;
}

/**
 * Grow a skeleton into the cloud.
 *
 * Returns nodes with parent/child links. Radii are NOT set here — thickness is
 * a separate law applied afterwards, because it depends on the finished
 * topology and cannot be known while growing.
 */
export function growSkeleton(r, cloud, opts = {}, existing = null) {
  const {
    D = 0.17,            // segment length; everything else is relative to it
    influence = 16,      // x D. Large => confident sweeps, small => gnarly
    kill = 2.6,          // x D. Larger => more air around each limb
    trunkLean = 0.1,
    maxSteps = 900,
    wobble = 0.1,        // per-step direction noise: character, not realism
    // Minimum clear trunk before the crown is allowed to start. Without this
    // the trunk stops the instant any attraction point is within the influence
    // radius, which is almost immediately — and a tree that forks at knee
    // height reads as a shrub no matter how good the branching above it is.
    trunkMin = 11,
    // Most woody branching is BIFURCATION. Left uncapped, a node that is being
    // pulled by points in six directions grows six children at the same height,
    // and da Vinci's rule then makes all six thin at once — a pollarded broom
    // on a stick, with no primary limbs and no hierarchy worth the name.
    // Capping at two forces the tree to divide again and again over a range of
    // heights, which is where trunk -> primary -> secondary -> twig comes from.
    maxChildren = 2,
    // A later pass must not colonise the trunk. Given attraction points and a
    // trunk node with a free child slot, space colonization will happily grow a
    // full second stem out of the bole — which is what the twig pass did, and a
    // tree with two trunks is not a subtle defect.
    blockTrunk = false,
  } = opts;

  const di = influence * D;
  const dk = kill * D;

  const nodes = existing || [];
  const add = (pos, dir, parent) => {
    const n = { pos: pos.clone(), dir: dir.clone(), parent, children: [], r: 0 };
    nodes.push(n);
    if (parent) parent.children.push(n);
    return n;
  };

  // --- trunk ---------------------------------------------------------------
  // Grow straight up until the cloud is within reach. This is the standard
  // opening move for space colonization and it is also botanically right: a
  // sapling puts on height before it puts on crown.
  //
  // Skipped entirely on a continuation pass — a second pass grows twigs onto a
  // structure that already has a trunk.
  let tip = existing ? null : add(new THREE.Vector3(0, -0.35, 0), new THREE.Vector3(0, 1, 0), null);
  if (tip) tip.trunk = true;
  let lean = new THREE.Vector3(trunkLean, 0, trunkLean * 0.6).multiplyScalar(0.35);
  let guard = 0;
  while (tip && guard++ < 200) {
    if (guard > trunkMin) {
      let near = Infinity;
      for (const p of cloud) near = Math.min(near, p.distanceTo(tip.pos));
      if (near < di) break;
    }
    const dir = new THREE.Vector3(0, 1, 0)
      .add(lean)
      .add(new THREE.Vector3(rr(r, -0.05, 0.05), 0, rr(r, -0.05, 0.05)))
      .normalize();
    tip = add(tip.pos.clone().addScaledVector(dir, D), dir, tip);
    tip.trunk = true;
    lean.multiplyScalar(0.93);
  }

  // --- colonization --------------------------------------------------------
  // A uniform grid over the nodes. Naive nearest-node search is
  // O(points x nodes) per step, which is ~90M distance tests for a tree this
  // size — fine once, miserable when iterating on the look, which is the whole
  // activity here. Cell size is the influence radius, so a point only ever has
  // to look at its own cell and the 26 around it.
  const cell = di;
  const grid = new Map();
  const key = (x, y, z) => `${x}|${y}|${z}`;
  const cellOf = (v) => [Math.floor(v.x / cell), Math.floor(v.y / cell), Math.floor(v.z / cell)];
  const index = (n) => {
    const k = key(...cellOf(n.pos));
    let b = grid.get(k);
    if (!b) grid.set(k, (b = []));
    b.push(n);
  };
  for (const n of nodes) index(n);

  const live = cloud.slice();
  const _v = new THREE.Vector3();
  for (let step = 0; step < maxSteps && live.length; step++) {
    // Each attraction point votes for its single nearest node.
    const pulls = new Map();
    for (const p of live) {
      let best = null, bestD = di;
      const [cx, cy, cz] = cellOf(p);
      // A node that has already divided twice is closed for business; its
      // points should pull on something that can still grow.
      for (let ox = -1; ox <= 1; ox++)
        for (let oy = -1; oy <= 1; oy++)
          for (let oz = -1; oz <= 1; oz++) {
            const b = grid.get(key(cx + ox, cy + oy, cz + oz));
            if (!b) continue;
            for (const n of b) {
              if (n.children.length >= maxChildren) continue;
              if (blockTrunk && n.trunk) continue;
              const d = p.distanceTo(n.pos);
              if (d < bestD) { bestD = d; best = n; }
            }
          }
      if (!best) continue;
      let acc = pulls.get(best);
      if (!acc) pulls.set(best, (acc = new THREE.Vector3()));
      acc.add(_v.copy(p).sub(best.pos).normalize());
    }
    if (!pulls.size) break;

    // Every node with votes grows one step along the average pull. A node that
    // is pulled two ways grows once here and again next step from a slightly
    // different position — that is where forks come from.
    const grown = [];
    for (const [n, acc] of pulls) {
      if (acc.lengthSq() < 1e-9) continue;
      const dir = acc.normalize();
      // Keep a little of the parent's heading so limbs have momentum and do not
      // kink at every step, plus a touch of wobble so they are not arcs.
      dir.addScaledVector(n.dir, 0.72);
      dir.add(new THREE.Vector3(rr(r, -wobble, wobble), rr(r, -wobble, wobble) * 0.5, rr(r, -wobble, wobble)));
      dir.normalize();
      const g = add(n.pos.clone().addScaledVector(dir, D), dir, n);
      index(g);
      grown.push(g);
    }
    if (!grown.length) break;

    // Consume reached points.
    for (let i = live.length - 1; i >= 0; i--) {
      for (const g of grown) {
        if (live[i].distanceTo(g.pos) < dk) { live.splice(i, 1); break; }
      }
    }
  }

  return nodes;
}

const smoothstepJS = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/**
 * Thickness by da Vinci's rule, applied leaf-to-root.
 *
 * `alpha` is the character dial. 2.0 is area-preserving (da Vinci); 3.0 is
 * Murray's law and gives skinny limbs off a fat trunk; real woody trees sit
 * around 2.0-2.5. Below 2 the tree reads spindly and top-heavy.
 *
 * `grow` is a small addition per segment so that a long unbranched limb still
 * thickens toward its base. Without it a chain of single-child nodes has
 * constant radius — the rule alone only says what happens AT a fork, and a
 * tree whose limbs are perfect cylinders between forks looks like plumbing.
 */
export function assignRadii(nodes, opts = {}) {
  const { tip = 0.006, alpha = 2.2, grow = 2.8e-4, taper = 0.013, max = 0.34, shootR = 0.0055 } = opts;

  // Children are always added after their parent, so reverse order is
  // leaf-to-root without needing a sort.
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (!n.children.length) { n.r = tip; continue; }
    let s = 0;
    for (const c of n.children) s += Math.pow(c.r, alpha);
    // Da Vinci's rule says what happens AT a fork. It says nothing about the
    // wood between forks, and on its own it produces limbs that are perfect
    // cylinders from one fork to the next — measured: the first trunk ran
    // 0.1554 to 0.1534 over its entire length, a 1.3% taper.
    //
    // The correction has to be PROPORTIONAL, not a constant addition. Adding a
    // fixed cross-section per segment is negligible on a trunk and enormous on
    // a twig (it quadrupled tip radius in one step), so secondary growth is
    // modelled as a small percentage per segment instead. That thickens
    // everything toward its base at the same relative rate, which is what
    // actually happens as a limb lays down another year of wood.
    //
    // `grow` is secondary thickening, and it must NOT apply to a current-year
    // shoot. Applied everywhere, a constant addition dominates thin wood:
    // measured on an unbranched shoot, radius ran 0.0257 -> 0.004 over nine
    // segments, jumping 0.004 -> 0.0101 in the first one. Every shoot was a
    // 6:1 cone, which is precisely the thorn the twigs kept reading as — and no
    // amount of tip shaping or material could fix it, because it was the radius
    // law. A shoot holds its diameter; wood thickens as it ages. So `grow`
    // fades in with thickness instead of applying from the tip.
    const r0 = Math.pow(s, 1 / alpha);
    const g = grow * smoothstepJS(shootR, shootR * 3.2, r0);
    n.r = Math.min(max, Math.pow(s + g, 1 / alpha) * (1 + taper));
  }
  return nodes;
}

/**
 * Relax the skeleton.
 *
 * Space colonization tips wander when only a few attraction points are left in
 * range, and the spline through that zigzag comes out as a hook or a curl at
 * the end of otherwise good limbs. Laplacian smoothing along each chain fixes
 * it without touching topology. Forks are pinned — moving them would slide
 * junctions off the limbs they belong to, which is the one thing here that
 * must stay exact.
 */
export function smoothChains(nodes, iterations = 3, strength = 0.42) {
  const mid = new THREE.Vector3();
  for (let it = 0; it < iterations; it++) {
    const moved = [];
    for (const n of nodes) {
      if (!n.parent || n.children.length !== 1) continue;      // fork or root: pinned
      if (n.parent.children.length !== 1) continue;            // just after a fork: pinned
      mid.copy(n.parent.pos).add(n.children[0].pos).multiplyScalar(0.5);
      moved.push([n, n.pos.clone().lerp(mid, strength)]);
    }
    for (const [n, p] of moved) n.pos.copy(p);
  }
  // Directions have to follow, or the mesh sweep frames disagree with the path.
  for (const n of nodes) {
    if (n.parent) n.dir.copy(n.pos).sub(n.parent.pos).normalize();
  }
  return nodes;
}

/**
 * Drop stubs: short dead-end chains that never got anywhere.
 *
 * Space colonization always leaves some. They are the difference between a tree
 * and a tree with whiskers, and they are far more visible with no leaves on.
 */
export function pruneStubs(nodes, minLength = 0.34) {
  const keep = new Set(nodes);
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of nodes) {
      if (!keep.has(n) || n.children.length) continue;
      // Walk back to the nearest fork, accumulating WORLD LENGTH.
      //
      // This used to count segments, which silently broke the moment a growth
      // pass used a different segment length: the terminal pass runs at 0.62x
      // the base step, so a stub threshold of 5 segments deleted every shoot
      // that pass produced and the whole order vanished with no error. Length
      // is the thing actually meant, and it is invariant across passes.
      let len = 0, cur = n;
      while (cur.parent && cur.parent.children.filter((c) => keep.has(c)).length === 1) {
        len += cur.pos.distanceTo(cur.parent.pos);
        cur = cur.parent;
      }
      if (len < minLength && cur.parent) {
        let x = n;
        while (x !== cur.parent) { keep.delete(x); x = x.parent; }
        changed = true;
      }
    }
  }
  const out = nodes.filter((n) => keep.has(n));
  for (const n of out) n.children = n.children.filter((c) => keep.has(c));
  return out;
}

/**
 * Split the node tree into LIMBS.
 *
 * A limb runs CONTINUOUSLY from where it leaves its parent all the way to a
 * tip, always following the thickest child at each fork. Laterals leave as
 * their own limbs, recorded against their position ALONG the parent chain.
 *
 * This matters more than it sounds. Ending a limb at every fork and starting a
 * new one makes the trunk a STACK of separate tubes: every join is a radius
 * discontinuity and every one gets its own collar bulge, so the leader comes
 * out as a spine of vertebrae with a hard step at each junction — which is
 * exactly what the render showed. Following the dominant child makes the trunk
 * one unbroken sweep from the ground to the top, which is what it is
 * botanically.
 */
export function extractLimbs(nodes) {
  const root = nodes.find((n) => !n.parent);
  if (!root) return [];
  const limbs = [];

  const walk = (start, depth, parentLimb, parentIndex) => {
    const chain = [start];
    const laterals = [];
    let cur = start;
    while (cur.children.length) {
      // Dominant child: the heaviest subtree when weights exist (ratio law),
      // otherwise the thickest (da Vinci law).
      const kids = cur.children.slice().sort((a, b) => (b.w ?? b.r) - (a.w ?? a.r));
      for (let i = 1; i < kids.length; i++) laterals.push([kids[i], chain.length - 1]);
      chain.push(kids[0]);
      cur = kids[0];
    }
    const limb = { chain, depth, parentLimb: parentLimb || null, parentIndex, attach: [] };
    limbs.push(limb);
    if (parentLimb) parentLimb.attach.push({ index: parentIndex, r: start.r, limb });
    for (const [k, idx] of laterals) walk(k, depth + 1, limb, idx);
  };

  walk(root, 0, null, 0);
  return limbs;
}

/**
 * Subtree weight: the total length of wood each node carries. Decides which
 * child CONTINUES a limb at a fork — the leader is the one with the most tree
 * beyond it — without needing radii first.
 */
export function assignWeights(nodes) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    n.w = 0;
    for (const c of n.children) n.w += c.w + c.pos.distanceTo(n.pos);
  }
  return nodes;
}

/**
 * Thickness by RATIO — the stylised law, and the one the art direction wants.
 *
 * The human's references are chunky: every limb stays individually readable to
 * its tip, and the revised Gate 1 asks that every child be 0.70-0.80 x its
 * parent. Da Vinci's rule cannot give that. It conserves cross-section, so a
 * small lateral is a small FRACTION of its parent and terminal shoots come out
 * hair-thin — a fine winter-tree haze, which was the right answer to the wrong
 * reference (a photograph of a real tree).
 *
 * Here each limb tapers along ITS OWN length, from its base radius to a rounded
 * tip, and every lateral starts at a fixed fraction of its parent's radius at
 * the point it leaves. Two consequences worth having:
 *   - every tip tapers, by construction — no flat cuts anywhere;
 *   - trunk thickness is a FREE parameter. Under da Vinci the trunk was the sum
 *     of its tips, so shoot density and proportion could not be tuned apart;
 *     that coupling does not exist here.
 *
 * `power` < 1 keeps a limb thick for most of its length and tapers it late —
 * chunky — where 1 would be a cone and a cone is a thorn.
 */
export function assignRadiiRatio(limbs, opts = {}, r = Math.random) {
  const { trunk = 0.3, ratioLo = 0.7, ratioHi = 0.8, power = 0.62, tipMin = 0.016 } = opts;
  for (const L of limbs) {
    const chain = L.chain;
    const s = [0];
    for (let i = 1; i < chain.length; i++) s.push(s[i - 1] + chain[i].pos.distanceTo(chain[i - 1].pos));
    const total = Math.max(s[s.length - 1], 1e-6);

    let base = trunk;
    if (L.parentLimb) {
      const host = L.parentLimb.chain[L.parentIndex];
      base = host.r * (ratioLo + (ratioHi - ratioLo) * r());
      // A short limb cannot carry a fat base: it would be a wart, not a twig.
      base = Math.min(base, Math.max(tipMin * 1.6, total * 0.16));
    }
    for (let i = 0; i < chain.length; i++) {
      chain[i].r = Math.max(tipMin, base * Math.pow(1 - s[i] / total, power));
    }
    if (L.parentLimb) {
      const a = L.parentLimb.attach.find((x) => x.limb === L);
      if (a) a.r = chain[0].r;
    }
  }
  return limbs;
}

/**
 * Everything, in the order it has to happen.
 *
 * TWO GROWTH PASSES, and this is the single most important structural decision
 * here. One uniform attraction cloud cannot give both long primary limbs and
 * fine twigs: long primaries need FEW, widely-spaced attractors so a tip runs a
 * long way before it is pulled apart, while twigs need MANY close ones. Tuned
 * for one, measured: sparse gives a clean five-stick sapling, dense gives a
 * pollarded broom where everything divides at the same height.
 *
 * So architecture is grown first from a sparse cloud, and then a dense cloud is
 * colonised by the structure that already exists. Trunk -> primary -> secondary
 * -> twig falls out of the two scales rather than being asserted.
 */
export function buildSkeleton(r, opts = {}) {
  const g = opts.grow || {};
  const D = g.D ?? 0.17;

  // PASS 1 — architecture. Few, widely spaced attractors so a tip runs a long
  // way before anything pulls it apart.
  const coarseCloud = crownCloud(r, { ...opts.cloud, count: opts.coarseCount ?? 190 });
  let nodes = growSkeleton(r, coarseCloud, {
    ...g,
    kill: opts.coarseKill ?? 5.5,
    influence: opts.coarseInfluence ?? 20,
  });

  // PASS 2 — twigs onto that architecture.
  const fineCloud = crownCloud(r, {
    ...opts.cloud,
    count: opts.fineCount ?? 950,
    shell: opts.fineShell ?? 0,   // shell bias belongs to the unconverged twig work; off by default
  });
  nodes = growSkeleton(r, fineCloud, {
    ...g,
    kill: opts.fineKill ?? 2.0,
    influence: opts.fineInfluence ?? 7,
    wobble: (g.wobble ?? 0.1) * 1.3,
    blockTrunk: true,
  }, nodes);

  // PASS 3 — terminal growth on the twigs.
  //
  // This is the order that stops the eye finding "the last branch". A twig
  // that leaves its parent and simply stops reads as a thorn; real terminal
  // growth forks again two or three times, each order finer than the last.
  // Shorter segments AND a strong shell bias, so this order appears at the
  // outside of the crown and at the ends of branches, where shoots actually
  // are, rather than evenly along the wood.
  // OFF by default. The mechanism works, but shoot density is coupled to trunk
  // thickness through da Vinci's rule and no parameter set has yet beaten the
  // two-pass tree. The default build must be the best KNOWN tree, not the most
  // recent experiment.
  if ((opts.tipCount ?? 0) > 0) {
    const tipCloud = crownCloud(r, {
      ...opts.cloud,
      count: opts.tipCount ?? 0,
      shell: opts.tipShell ?? 0.72,
    });
    nodes = growSkeleton(r, tipCloud, {
      ...g,
      D: D * (opts.tipD ?? 0.62),
      kill: opts.tipKill ?? 1.5,
      influence: opts.tipInfluence ?? 5,
      // Wobble has to come DOWN at this scale, not up. Short segments plus a
      // large per-step turn produced hooks and claws rather than shoots: the
      // same angular variation that gives a metre-long limb character bends a
      // ten-centimetre shoot into a fishhook.
      wobble: (g.wobble ?? 0.1) * (opts.tipWobble ?? 1.15),
      blockTrunk: true,
    }, nodes);
  }

  nodes = pruneStubs(nodes, opts.minStub ?? 0.3);
  smoothChains(nodes, opts.smooth ?? 3);
  if (opts.radiusLaw === 'davinci') {
    assignRadii(nodes, opts.radii);
    return { nodes, limbs: extractLimbs(nodes), cloud: fineCloud };
  }
  assignWeights(nodes);
  const limbs = extractLimbs(nodes);
  assignRadiiRatio(limbs, opts.ratio, r);
  return { nodes, limbs, cloud: fineCloud };
}

export { clamp, lerp };
