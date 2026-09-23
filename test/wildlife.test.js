import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWildlife } from '../prototype/src/wildlife.js';
import { disposeObject } from '../prototype/src/util.js';

const pose = ({ group }) => {
  group.updateMatrixWorld(true);
  const values = [];
  group.traverse(o => values.push(...o.matrixWorld.elements, o.material?.opacity ?? 1));
  return values;
};
test('wildlife flight is deterministic, bounded and independent of frame rate', () => {
  for (const night of [false, true]) {
    const options = { seed: 121, night, width: 6, height: 8 };
    const direct = buildWildlife(options), stepped = buildWildlife(options);
    const count = direct.group.children.length;
    for (const time of [0, 4, 40, 400]) {
      for (let t = 0; t < time; t += 0.1) stepped.update(t);
      stepped.update(time);
      direct.update(time);
      assert.deepEqual(pose(direct), pose(stepped));
      assert.equal(direct.group.children.length, count);
      for (const actor of direct.group.children) {
        assert.ok(Math.hypot(actor.position.x, actor.position.z) < 3.1);
        assert.ok(actor.position.y > 0 && actor.position.y < 8);
      }
    }
    assert.equal(direct.group.name, night ? 'fireflies' : 'butterflies');
    assert.ok(direct.group.children.every(actor => night
      ? actor.children[0].isSprite
      : actor.children[0].children.some(o => o.isMesh)));
    disposeObject(direct.group);
    disposeObject(stepped.group);
  }
});
