// Small shared helpers for the tree prototype.
// Everything here is deterministic so the scene is identical on every reload —
// that makes visual iteration possible at all.

export const DEG = Math.PI / 180;

/** Seeded PRNG. Same seed => same tree, every time. */
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Random float in [lo, hi). */
export const rr = (r, lo, hi) => lo + r() * (hi - lo);

/** Ease that starts fast and settles — used for branch curvature. */
export const easeOut = (t) => 1 - Math.pow(1 - t, 2.1);

/** Cheap deterministic 3D value noise. Good enough for rock lumps. */
function hash3(x, y, z) {
  let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return h - Math.floor(h);
}

export function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
  let n = 0;
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++)
      for (let k = 0; k < 2; k++) {
        const wx = i ? u : 1 - u, wy = j ? v : 1 - v, wz = k ? w : 1 - w;
        n += wx * wy * wz * hash3(xi + i, yi + j, zi + k);
      }
  return n * 2 - 1;
}
const fade = (t) => t * t * (3 - 2 * t);

/**
 * Wind sway, injected into any instanced MeshStandardMaterial.
 * The offset is applied AFTER instanceMatrix, so it displaces in world-ish
 * space rather than twisting each instance around its own axis.
 */
export function applySway(material, uniforms, { amp = 0.045, speed = 0.85, yLo = 1.4, yHi = 4.4, local = false } = {}) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.time;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
    const mask = local
      // grass: bend from the blade's own root, scaled by local height
      ? `float m = clamp(position.y, 0.0, 1.0); m = m * m;`
      // canopy: only the upper part of the tree moves, and it eases in
      : `float m = smoothstep(${yLo.toFixed(2)}, ${yHi.toFixed(2)}, wp.y);`;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      /* glsl */ `
      vec4 wp = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        wp = instanceMatrix * wp;
      #endif
      ${mask}
      float ph = wp.x * 0.9 + wp.z * 1.25;
      float s = sin( uTime * ${speed.toFixed(2)} + ph ) * 0.6
              + sin( uTime * ${(speed * 1.57).toFixed(2)} + ph * 1.7 ) * 0.4;
      float c = cos( uTime * ${(speed * 0.77).toFixed(2)} + ph * 0.8 );
      wp.x += s * ${amp.toFixed(3)} * m;
      wp.z += c * ${(amp * 0.7).toFixed(3)} * m;
      vec4 mvPosition = modelViewMatrix * wp;
      gl_Position = projectionMatrix * mvPosition;
      `
    );
  };
  material.customProgramCacheKey = () => 'sway' + amp + speed + yLo + yHi + local;
}
