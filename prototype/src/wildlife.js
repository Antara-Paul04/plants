import * as THREE from 'three';
import { rng } from './util.js';

// Scene life, independent of the website's measurements and the tree RNG stream.
// All motion is a function of the renderer's pausable clock.
export function buildWildlife({ seed, night, width, height }) {
  const group = new THREE.Group();
  group.name = night ? 'fireflies' : 'butterflies';
  const random = rng(seed ^ 0x51f15e);
  const actors = [];
  const count = night ? 10 : 3;
  let wingGeometry, bodyGeometry, bodyMaterial, glow;
  if (night) {
    const n = 32, pixels = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const d = Math.hypot((x + 0.5) / n * 2 - 1, (y + 0.5) / n * 2 - 1);
      const i = (y * n + x) * 4;
      pixels.set([255, 255, 255, Math.round(255 * Math.pow(Math.max(0, 1 - d), 2.6))], i);
    }
    glow = new THREE.DataTexture(pixels, n, n);
    glow.needsUpdate = true;
    glow.magFilter = glow.minFilter = THREE.LinearFilter;
  } else {
    const wing = new THREE.Shape();
    wing.moveTo(0, 0.05);
    wing.bezierCurveTo(0.09, 0.23, 0.27, 0.22, 0.23, 0.06);
    wing.bezierCurveTo(0.21, 0.01, 0.14, -0.015, 0.1, -0.02);
    wing.bezierCurveTo(0.23, -0.08, 0.14, -0.21, 0.045, -0.14);
    wing.lineTo(0, -0.08);
    wing.closePath();
    wingGeometry = new THREE.ShapeGeometry(wing, 12);
    bodyGeometry = new THREE.CapsuleGeometry(0.018, 0.2, 3, 6);
    bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x514634, roughness: 1 });
  }
  for (let i = 0; i < count; i++) {
    const actor = new THREE.Group();
    let left, right, light;
    if (night) {
      light = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glow, color: 0xffefa3, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false,
      }));
      actor.add(light);
    } else {
      const material = new THREE.MeshStandardMaterial({
        color: [0xe9aa63, 0xffedc0, 0xd5b86b][i], side: THREE.DoubleSide, roughness: 1,
      });
      const wings = new THREE.Group();
      wings.rotation.x = -Math.PI / 2;
      left = new THREE.Mesh(wingGeometry, material);
      right = new THREE.Mesh(wingGeometry, material);
      left.scale.x = -1;
      wings.add(left, right, new THREE.Mesh(bodyGeometry, bodyMaterial));
      actor.add(wings);
    }
    group.add(actor);
    actors.push({ actor, left, right, light, phase: random() * Math.PI * 2,
      speed: (night ? 0.11 : 0.22) + random() * 0.09,
      radius: Math.min(width * 0.45, 3.2) * (0.8 + random() * 0.18),
      altitude: 0.7 + height * (0.15 + random() * 0.52),
    });
  }
  function update(t) {
    for (const { actor, left, right, light, phase, speed, radius, altitude } of actors) {
      const a = t * speed + phase;
      actor.position.set(
        radius * Math.cos(a) + 0.12 * Math.sin(3 * a + phase),
        altitude + 0.25 * Math.sin(t * 0.7 + phase) + 0.09 * Math.sin(t * 1.9 + phase),
        radius * Math.sin(a) * 0.82,
      );
      if (light) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.5 + phase * 3);
        light.material.opacity = 0.3 + pulse * 0.7;
        light.scale.setScalar(0.18 + pulse * 0.1);
      } else {
        actor.rotation.y = Math.atan2(radius * Math.sin(a) - 0.36 * Math.cos(3 * a + phase), -radius * Math.cos(a) * 0.82);
        actor.rotation.z = Math.sin(t * 1.2 + phase) * 0.15;
        const flap = 0.15 + (0.5 + 0.5 * Math.sin(t * 15 + phase)) * 1.15;
        left.rotation.y = flap;
        right.rotation.y = -flap;
      }
    }
  }
  update(0);
  return { group, update };
}
