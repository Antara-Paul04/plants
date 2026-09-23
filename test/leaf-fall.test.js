import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildLeafFall } from "../prototype/src/leaves.js";
import { gustAt, disposeObject } from "../prototype/src/util.js";
const instances = [
  {
    variant: 0,
    matrix: new THREE.Matrix4().makeTranslation(0, 3, 0),
    tint: new THREE.Color(0.9, 0.95, 0.85),
  },
];
const seats = [
  [
    {
      matrix: new THREE.Matrix4().makeTranslation(0.1, 0.2, 0),
      size: 0.45,
      color: new THREE.Color("#86c440"),
      shade: 0.95,
    },
  ],
];
const make = (extra = {}) =>
  buildLeafFall(instances, seats, {
    count: 21,
    automatic: false,
    ground: () => 0,
    ...extra,
  });
const poses = (fall) => Array.from(fall.group.children[0].instanceMatrix.array);
const position = (fall, i = 0) => {
  const matrix = new THREE.Matrix4();
  fall.group.children[0].getMatrixAt(i, matrix);
  return new THREE.Vector3().setFromMatrixPosition(matrix);
};

test("tap shedding uses individual leaves and autumn flight, then rests on the ground", () => {
  const fall = make(),
    mesh = fall.group.children[0];
  fall.update(20);
  assert.equal(mesh.visible, false);
  fall.burst(20, new THREE.Vector3(0, 3, 0));
  fall.update(20.4);
  assert.equal(mesh.visible, true);
  assert.equal(mesh.geometry.attributes.position.count, 80);
  const first = position(fall);
  assert.ok(first.y > 3 && first.y < 3.2);
  const tint = new THREE.Color();
  mesh.getColorAt(0, tint);
  const expected = seats[0][0].color
    .clone()
    .multiply(instances[0].tint)
    .multiplyScalar(0.95);
  for (const key of ["r", "g", "b"])
    assert.ok(Math.abs(tint[key] - expected[key]) < 1e-6);
  fall.update(22);
  assert.ok(position(fall).y < first.y);
  assert.ok(position(fall).x > first.x);
  fall.update(26);
  assert.equal(position(fall).y, 0);
  fall.update(40);
  assert.equal(mesh.visible, false);
  disposeObject(fall.group);
});

test("leaf flight is independent of frame count and repeated taps stay bounded", () => {
  const a = make(),
    b = make();
  a.burst(10);
  b.burst(10);
  a.update(12);
  for (let t = 10; t < 12; t += 0.01) b.update(t);
  b.update(12);
  assert.deepEqual(poses(a), poses(b));
  const mesh = a.group.children[0],
    geometry = mesh.geometry,
    material = mesh.material;
  for (let i = 0; i < 100; i++) {
    a.burst(12 + i * 0.1);
    a.update(12 + i * 0.1 + 0.05);
  }
  assert.equal(a.group.children.length, 1);
  assert.equal(mesh.count, 21);
  assert.equal(mesh.geometry, geometry);
  assert.equal(mesh.material, material);
  assert.ok(poses(a).every(Number.isFinite));
  disposeObject(a.group);
  disposeObject(b.group);
});

test("autumn sheds without any tap and ambient breeze stays above its calm floor", () => {
  const fall = make({ automatic: true, rate: 1 });
  fall.update(12);
  assert.equal(fall.group.children[0].visible, true);
  assert.ok(poses(fall).some((v) => v !== 0));
  for (let t = 0; t < 60; t += 0.25)
    assert.ok(gustAt(t) >= 0.65 && gustAt(t) <= 1.5);
  disposeObject(fall.group);
});


test('a full tap pool keeps existing leaves instead of popping them out mid-flight', () => {
  const fall = make();
  fall.burst(10); fall.burst(10.1); fall.burst(10.2); fall.update(11);
  const before = poses(fall);
  fall.burst(11);
  assert.deepEqual(poses(fall), before);
  disposeObject(fall.group);
});
