import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { isTap, treeInteractions } from "../prototype/src/interaction.js";

test("drag, long press and multi-touch are never treated as taps", () => {
  const start = { x: 50, y: 50, time: 0 };
  assert.ok(isTap(start, { x: 52, y: 51, time: 150 }));
  assert.ok(!isTap(start, { x: 75, y: 50, time: 150 }));
  assert.ok(!isTap(start, { x: 50, y: 50, time: 700 }));
  assert.ok(!isTap({ ...start, cancelled: true }, { x: 50, y: 50, time: 150 }));
});
test("motion pause suppresses reactions and listeners are cleaned up", () => {
  const events = new Map(),
    canvas = {
      addEventListener: (n, f) => events.set(n, f),
      removeEventListener: (n) => events.delete(n),
    };
  const camera = new THREE.PerspectiveCamera(),
    controls = { target: new THREE.Vector3(), update() {} };
  let releases = 0;
  const uniforms = {},
    shown = {
      built: {
        tree: new THREE.Group(),
        shedLeaves() {
          releases++;
        },
        extents: { targetY: 3 },
        stats: {},
        season: "normal",
      },
    };
  const interaction = treeInteractions(
    canvas,
    camera,
    controls,
    uniforms,
    () => shown,
  );
  interaction.stir();
  interaction.update(0.1);
  assert.ok(uniforms.touchStrength.value > 0);
  assert.equal(releases, 1);
  interaction.setEnabled(false);
  interaction.stir();
  interaction.update(0.1);
  assert.equal(uniforms.touchStrength.value, 0);
  assert.equal(releases, 1);
  interaction.dispose();
  assert.equal(events.size, 0);
});
