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
 *
 * The tuning values are UNIFORMS, not literals baked into the source. They used
 * to be interpolated into the GLSL, which meant every differently-sized tree
 * compiled its own shader — a hitch per tree and an unbounded program cache.
 * The cache key now varies only on `local`, so exactly two programs ever exist
 * no matter how many trees are on screen.
 *
 * It COMPOSES with a hook the material already carries. It used to ASSIGN
 * onBeforeCompile and customProgramCacheKey outright, which was harmless only
 * because no V0 material had either. On the new tree every material has both,
 * and the hook that would have been overwritten is the zero-specular rule
 * (leaves.js killSpecular, flowers.js matte, bark.js): the leaves would have
 * regained the sheen the clay direction exists to remove, and nothing would have
 * errored. So the prior hook runs first, and the prior key is kept in front of
 * ours — one program per (material kind x sway kind), still never one per tree.
 * A material with no hook of its own gets exactly the key it always had.
 *
 * A tuning value may be a number, or a { value } uniform to SHARE: every
 * material of one tree then answers to one object, and a host can change the
 * wind on a finished tree without rebuilding it.
 *
 * `pin` (a length, instanced materials only): each instance PIVOTS ABOUT ITS SEAT
 * instead of drifting as a block — the offset grows linearly from nothing at the
 * instance's origin to the full sway at `pin` away from it, which for a small
 * sway is a rigid rotation about the point of attachment. It exists because the
 * new tree's wood does not move (ruling W3): a cluster that translates whole
 * slides across the twig it grows from, and on a winter tree, where nothing
 * hides the contact, buds were measured travelling 64% of their twig's width.
 * Pinned, nothing moves where it is attached, by construction — and a hanging
 * raceme or a fruit on its spur swings from the top, as they do. Without `pin`
 * the shader is what it always was, to the byte: V0 and the grass never see it.
 */
export function applySway(material, uniforms, { amp = 0.045, speed = 0.85, yLo = 1.4, yHi = 4.4, local = false, pin = null } = {}) {
  // GUSTS. If the host's uniform bag carries `gust` (see gustAt, below), the sway is
  // multiplied by it — every swaying thing in the scene answers to the one number, the
  // grass included, because it is the same weather. A bag without it (V0's) compiles
  // the shader it always did, to the byte.
  const gust = uniforms.gust ?? null;
  const AMP = gust ? '( uSwayAmp * uSwayGust )' : 'uSwayAmp';
  const prior = Object.hasOwn(material, 'onBeforeCompile') ? material.onBeforeCompile : null;
  const priorKey = Object.hasOwn(material, 'customProgramCacheKey') ? material.customProgramCacheKey
    // A hook with no key of its own is keyed by three on its SOURCE. Ours would
    // replace it, and two different prior hooks would then share one program.
    : prior ? () => prior.toString() : null;
  const U = (v) => (v !== null && typeof v === 'object' && 'value' in v ? v : { value: v });
  const pinned = pin !== null && !local;
  material.onBeforeCompile = (shader, renderer) => {
    if (prior) prior.call(material, shader, renderer);
    shader.uniforms.uTime = uniforms.time;
    shader.uniforms.uSwayAmp = U(amp);
    shader.uniforms.uSwaySpeed = U(speed);
    shader.uniforms.uSwayLo = U(yLo);
    shader.uniforms.uSwayHi = U(yHi);
    if (pinned) shader.uniforms.uSwayPin = U(pin);
    if (gust) shader.uniforms.uSwayGust = gust;
    shader.vertexShader =
      'uniform float uTime;\nuniform float uSwayAmp;\nuniform float uSwaySpeed;\n' +
      'uniform float uSwayLo;\nuniform float uSwayHi;\n' + (pinned ? 'uniform float uSwayPin;\n' : '') +
      (gust ? 'uniform float uSwayGust;\n' : '') + shader.vertexShader;
    const mask = local
      // grass: bend from the blade's own root, scaled by local height
      ? `float m = clamp(position.y, 0.0, 1.0); m = m * m;`
      // canopy: only the upper part of the tree moves, and it eases in
      : `float m = smoothstep(uSwayLo, uSwayHi, wp.y);` + (pinned ? `
      #ifdef USE_INSTANCING
        m *= clamp( length( wp.xyz - instanceMatrix[3].xyz ) / uSwayPin, 0.0, 1.0 );
      #endif` : '');
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      /* glsl */ `
      vec4 wp = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        wp = instanceMatrix * wp;
      #endif
      ${mask}
      float ph = wp.x * 0.9 + wp.z * 1.25;
      float s = sin( uTime * uSwaySpeed + ph ) * 0.6
              + sin( uTime * uSwaySpeed * 1.57 + ph * 1.7 ) * 0.4;
      float c = cos( uTime * uSwaySpeed * 0.77 + ph * 0.8 );
      wp.x += s * ${AMP} * m;
      wp.z += c * ${AMP} * 0.7 * m;
      vec4 mvPosition = modelViewMatrix * wp;
      gl_Position = projectionMatrix * mvPosition;
      `
    );
  };
  const swayKey = (local ? 'sway-local' : pinned ? 'sway-world-pin' : 'sway-world') + (gust ? '-gust' : '');
  material.customProgramCacheKey = priorKey ? () => `${priorKey.call(material)}+${swayKey}` : () => swayKey;
}

/**
 * An exact integer hash of two integers -> [0, 1). Deliberately NOT a sin-hash:
 * Math.sin is not bit-identical across engines, and `fract(sin(x) * 43758)` turns
 * the last bit into a different answer. The weather has to be the same weather on
 * every machine, or a capture pinned at `t=` is not reproducible.
 */
export function hash01(a, b = 0) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(((b | 0) + 0x7f4a7c15) | 0, 0xc2b2ae35);
  h ^= h >>> 16; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 15; h = Math.imul(h, 0x165667b1); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * GUSTS — the wind is weather, so it comes and goes. Constant sway reads as a
 * mechanism; a tree that is sometimes nearly still and then moves reads as air.
 *
 * AMBIENT (ruling W1): every number here is a constant or a hash of a SLOT NUMBER.
 * Nothing measured, and not the site's seed either — the weather is the world's and
 * is the same for every tree.
 *
 * Gusts are ENUMERABLE, and that is the design. Time is cut into slots; slot n holds
 * one gust (sometimes none) whose moment and strength are a hash of n. So anything
 * that wants to be CAUSED by a gust — autumn's falling leaves (leaves.js) — can ask
 * "which gusts have there been, and how hard", as a pure function of time. No state,
 * no integration, nothing that depends on how often a frame was drawn; a clock pinned
 * at `t=` pins the weather exactly.
 *
 * These numbers are visual-3d's defaults, NOT an art-direction decision: `calm` and
 * `peak` multiply the sway's amplitude, `slot` is how often a gust comes, `attack` and
 * `decay` shape it (it arrives faster than it leaves), `skip` is how often a slot is
 * simply still.
 */
export const GUST = { slot: 8, attack: 1.2, decay: 4.4, calm: 0.35, peak: 1.5, skip: 0.12 };

/** Gust number n: when it peaks and how hard (0 = this slot is still). */
export function gustSlot(n, G = GUST) {
  const strength = hash01(n, 3) < G.skip ? 0 : 0.35 + 0.65 * hash01(n, 2);
  return { n, at: (n + 0.2 + 0.6 * hash01(n, 1)) * G.slot, strength };
}

/** How much of gust `g` is blowing at time t: 0..1, fast up, slower down. */
export function gustShape(t, g, G = GUST) {
  const x = t - g.at;
  const u = x < 0 ? 1 + x / G.attack : 1 - x / G.decay;
  return u <= 0 ? 0 : g.strength * u * u * (3 - 2 * u);
}

/** The wind at time t, as a multiplier on the sway's amplitude: calm..peak. */
export function gustAt(t, G = GUST) {
  const N = Math.floor(t / G.slot);
  let k = 0;
  for (let n = N - 1; n <= N + 1; n++) k = Math.max(k, gustShape(t, gustSlot(n, G), G));
  return G.calm + (G.peak - G.calm) * k;
}

/**
 * Free everything under a root object exactly once.
 *
 * `scene.remove()` releases no GPU memory at all, and a naive
 * traverse-and-dispose double-frees: the leaf material is shared across three
 * instanced meshes, the rock material across seven, and the petal geometry
 * across two. Disposing a resource twice is not merely wasteful — the second
 * call acts on an already-released handle. Hence the Sets.
 */
export function disposeObject(root) {
  const geoms = new Set();
  const mats = new Set();
  root.traverse((o) => {
    if (o.geometry) geoms.add(o.geometry);
    const m = o.material;
    if (m) (Array.isArray(m) ? m : [m]).forEach((x) => mats.add(x));
    if (o.isInstancedMesh) {
      o.dispose(); // releases the instance colour/matrix buffers
    }
  });
  for (const g of geoms) g.dispose();
  for (const m of mats) {
    for (const k in m) {
      const v = m[k];
      if (v && v.isTexture) v.dispose();
    }
    m.dispose();
  }
  root.parent?.remove(root);
  return { geometries: geoms.size, materials: mats.size };
}
