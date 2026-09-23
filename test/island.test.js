import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildIsland } from '../prototype/src/island.js';
import { disposeObject } from '../prototype/src/util.js';

test('soil remains closed and outward-facing from rim to underside', () => {
  const island = buildIsland(() => 0.5);
  const { geometry } = island.getObjectByName('soilBody');
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const indices = geometry.index.array;
  const edges = new Map();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const normal = new THREE.Vector3(), centre = new THREE.Vector3();
  const inside = new THREE.Vector3(0, -0.7, 0);

  for (let i = 0; i < indices.length; i += 3) {
    const ids = Array.from(indices.slice(i, i + 3));
    a.fromBufferAttribute(positions, ids[0]);
    b.fromBufferAttribute(positions, ids[1]);
    c.fromBufferAttribute(positions, ids[2]);
    centre.copy(a).add(b).add(c).divideScalar(3).sub(inside);
    normal.subVectors(b, a).cross(c.sub(a));
    assert.ok(normal.lengthSq() > 1e-12, `degenerate triangle ${i / 3}`);
    assert.ok(normal.dot(centre) > 0, `inward triangle ${i / 3}`);
    for (let e = 0; e < 3; e++) {
      const from = ids[e], to = ids[(e + 1) % 3];
      const key = `${Math.min(from, to)},${Math.max(from, to)}`;
      const entry = edges.get(key) || { count: 0, direction: 0 };
      entry.count++;
      entry.direction += from < to ? 1 : -1;
      edges.set(key, entry);
    }
  }
  for (const edge of edges.values()) {
    assert.equal(edge.count, 2, 'open edge or non-manifold join');
    assert.equal(edge.direction, 0, 'adjacent faces disagree on winding');
  }
  for (let i = 0; i < normals.count; i++) {
    normal.fromBufferAttribute(normals, i);
    assert.ok(Math.abs(normal.length() - 1) < 1e-5, `invalid normal ${i}`);
  }
  disposeObject(island);
});
