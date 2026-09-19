// Assemble one tree scene from one DNA record.
//
// This is the seam the rest of the world uses. It takes DNA in and hands back a
// Group, a dispose(), and the scene's own measured extents — the last of those
// because camera framing used to be three constants tuned to one hand-authored
// tree, which silently crops a tall tree and strands a squat one.

import * as THREE from 'three';
import { rng, disposeObject } from './util.js';
import { resolveDNA } from './dna.js';
import { buildTree } from './tree.js';
import { canopyLobes, buildFoliage, buildPetals } from './foliage.js';
import { buildIsland, buildGrass, buildRocks, radiusAt } from './island.js';

/**
 * @param dna  one Botanical DNA record (docs/BOTANICAL-DNA.md)
 * @param uniforms  shared { time } for the sway shader
 * @param opts.detail  geometry budget multiplier. 1 is the reviewed tree; the
 *   comparison grid runs lower because eleven full-detail trees is ~7M
 *   triangles. Applied EQUALLY to every cell, so it cannot bias a comparison.
 */
export function buildTreeScene(dna, uniforms, opts = {}) {
  const { detail = 1 } = opts;
  const p = resolveDNA(dna);
  const r = rng(p.seed);

  const group = new THREE.Group();
  const terrain = { ...p.terrain, detail };

  group.add(buildIsland(r, terrain));
  group.add(buildGrass(r, uniforms, terrain));
  group.add(buildRocks(r, terrain));

  const tree = buildTree(r, { ...p.skeleton, bark: p.bark });
  group.add(tree.mesh);

  const lobes = canopyLobes(tree.tips, r, p.foliage);
  const foliage = buildFoliage(lobes, r, uniforms, {
    ...p.foliage,
    flowers: p.flowers,
    fruit: p.fruit,
    detail,
  });
  group.add(foliage.group);

  const petals = buildPetals(r, radiusAt, uniforms, {
    litter: p.terrain.litter,
    litterColor: p.terrain.litterColor,
    detail,
  });
  group.add(petals.group);

  // --- extents -----------------------------------------------------------
  // Measured, not assumed. The soil body reaches well below the waterline, so
  // the framing target is biased up the box rather than sitting at its centre
  // — otherwise every tree is composed around a point underground.
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const extents = {
    box,
    height: size.y,
    width: Math.max(size.x, size.z),
    targetY: box.min.y + size.y * 0.63,
  };

  let triangles = 0;
  group.traverse((o) => {
    const g = o.geometry;
    if (!g || !g.index) return;
    triangles += (g.index.count / 3) * (o.isInstancedMesh ? o.count : 1);
  });

  return {
    group,
    extents,
    params: p,
    stats: {
      leaves: foliage.leafCount,
      blossoms: foliage.blossomCount,
      fruit: foliage.fruitCount,
      grass: Math.max(2000, Math.round(p.terrain.grass * detail)),
      triangles: Math.round(triangles),
    },
    petals,
    dispose: () => disposeObject(group),
  };
}
