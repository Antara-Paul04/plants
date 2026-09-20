// Wood — a matte clay material.
//
// ART DIRECTION (human, 2026-09-20, with a reference; see docs/TASTE.md): the
// surface language is smooth and clay-like, not rugged. A warm light-tan trunk
// carrying only broad soft grooves; matte throughout, zero specular sheen —
// "clay or marzipan, never polished wood". Deep fissured bark is explicitly NOT
// wanted. Form stays botanical; surface simplifies.
//
// This file previously held a detailed procedural bark (plates, fissures,
// lichen, derivative bump). It fixed the "low-poly" reading and was then
// rejected as the wrong direction — it is in git history at `aeef882` if it is
// ever wanted. What that work taught is kept in docs/VISUAL-SYSTEM.md.
//
// The division of labour now:
//
//   - FORM is in the mesh. The grooves, the buttress and the unions are real
//     geometry (limbmesh.js) and are shaded by true normals. There is no bump
//     map here at all: a sculpted surface reads as clay, and a texture of a
//     sculpted surface reads as a texture.
//   - This material only TINTS: a slightly deeper, warmer tone down in the
//     grooves, a slow drift of warmth over the whole tree so it is not one flat
//     swatch, a deeper tone on thin wood so fine twigs still read against a
//     pale sky, and the mesher's gentle occlusion (ground contact, crotches).
//   - ZERO specular. Roughness 1 is not enough — a dielectric at roughness 1
//     still returns a broad sheen from a strong key or a bright environment,
//     and that sheen is exactly the "polished wood" being rejected.
//
// Physically-based and light-agnostic, so it relights for free: nothing here is
// tuned to the day rig, and the night state needs no changes to it.

import * as THREE from 'three';

/**
 * @param opts.palette  { wood, groove, shoot } as hex or THREE.Color
 */
// The clay's own tone. EXPORTED because the ground is judged against it: the turf
// under a tree has to sit clearly darker in value than the trunk standing on it
// (grow.js, groundForTrunk), and that rule must follow this colour if it moves.
export const WOOD_TAN = 0xc7a67e;

export function makeBarkMaterial(opts = {}) {
  const { palette = {} } = opts;
  const C = (v, d) => new THREE.Color(v ?? d);

  const uniforms = {
    uWood: { value: C(palette.wood, WOOD_TAN) },     // warm light TAN — a pinker value read as skin
    uGroove: { value: C(palette.groove, 0x9d7c58) }, // the same clay, deeper and a little warmer
    uShoot: { value: C(palette.shoot, 0x94765a) },   // thin wood: deeper, so twigs hold against sky
  };

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,      // gentle occlusion from the mesher
    roughness: 1,
    metalness: 0,
  });
  mat.userData.barkUniforms = uniforms;

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float groove;
        attribute float barkR;
        varying float vGroove;
        varying float vBarkR;
        varying vec3 vWoodW;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vGroove = groove;
        vBarkR = barkR;
        vWoodW = (modelMatrix * vec4(transformed, 1.0)).xyz;`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', /* glsl */ `#include <common>
        uniform vec3 uWood;
        uniform vec3 uGroove;
        uniform vec3 uShoot;
        varying float vGroove;
        varying float vBarkR;
        varying vec3 vWoodW;

        float wdHash(vec3 p) {
          p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float wdNoise(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(wdHash(i), wdHash(i + vec3(1,0,0)), f.x),
                mix(wdHash(i + vec3(0,1,0)), wdHash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(wdHash(i + vec3(0,0,1)), wdHash(i + vec3(1,0,1)), f.x),
                mix(wdHash(i + vec3(0,1,1)), wdHash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }`)
      .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
        // Thin wood is a deeper tone of the same clay.
        float wdThin = 1.0 - smoothstep(0.006, 0.05, vBarkR);
        vec3 wdCol = mix(uWood, uShoot, wdThin);
        // Down in a groove: a little deeper and warmer. Low contrast on purpose —
        // the groove is already carried by the geometry and the light.
        wdCol = mix(wdCol, uGroove, vGroove * 0.85 * (1.0 - wdThin));
        // Gentle occlusion: a groove is a little shaded whatever the light does.
        wdCol *= 1.0 - 0.2 * vGroove * (1.0 - wdThin);
        // A slow drift of warmth and value across the whole tree, in world
        // space so it crosses limbs. Without it the tree is one flat swatch,
        // which is what "plastic" is; with too much it is mottled.
        float wdDrift = wdNoise(vWoodW * 0.55 + 3.0);
        wdCol *= mix(0.93, 1.06, wdDrift);
        wdCol = mix(wdCol, wdCol * vec3(1.04, 0.99, 0.93), wdNoise(vWoodW * 0.3 + 40.0));
        diffuseColor.rgb *= wdCol;`)
      .replace('#include <lights_physical_fragment>', /* glsl */ `#include <lights_physical_fragment>
        // Matte means NO specular, direct or image-based. Clay, not varnish.
        material.specularColor = vec3(0.0);
        material.specularF90 = 0.0;`);
  };
  mat.customProgramCacheKey = () => 'wood-clay-v2';
  return mat;
}
