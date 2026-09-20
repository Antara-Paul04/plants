// Bark — a procedural material evaluated in LIMB-LOCAL space.
//
// Why procedural rather than a texture set: the two classic bark failures are a
// seam running up the back of every limb and a tile that repeats up the trunk.
// Both come from wrapping a finite rectangle around a cylinder. Evaluating the
// bark as a 3D function of each limb's own coordinates (around the axis in
// world units, along it in arc length) has neither problem by construction,
// keeps the grain running WITH the limb, and holds the same physical scale on
// a trunk and a twig without any texel-density bookkeeping.
//
// What the material actually does, in order of how much each one matters:
//
//   1. HEIGHT. Flat plates separated by narrow furrows that run with the grain
//      and braid into each other. Everything else derives from this.
//   2. NORMALS from that height, by forward differences across the pixel
//      footprint. This is what kills the "smooth plastic tube" reading.
//   3. CAVITY. Furrows are dark because light cannot get into them. There is
//      no AO pass here, so it is baked into the albedo where it belongs.
//   4. COLOUR AT THREE SCALES: furrow-to-plate, plate-to-plate, and a slow
//      drift over the whole tree, plus pale lichen in patches. Uniform brown
//      is the other half of why a procedural tree looks like plastic.
//   5. ROUGHNESS that follows the relief, and YOUNG WOOD that is smooth, paler
//      and tighter — thin limbs do not carry trunk bark.
//
// Octaves fade as they approach the pixel footprint, so the bark does not
// sparkle at distance; the hero shot and the close-up use the same material.

import * as THREE from 'three';

const GLSL_COMMON = /* glsl */ `
  varying vec3 vBark;
  varying float vBarkR;
  varying vec3 vBarkW;
  varying vec3 vBarkWN;
`;

const GLSL_FRAG_LIB = /* glsl */ `
  uniform vec3 uBarkPlate;
  uniform vec3 uBarkFurrow;
  uniform vec3 uBarkInner;
  uniform vec3 uBarkYoung;
  uniform vec3 uBarkLichen;
  uniform float uBarkDepth;
  uniform float uBarkLichenAmt;

  float bkHash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float bkNoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(bkHash(i), bkHash(i + vec3(1,0,0)), f.x),
          mix(bkHash(i + vec3(0,1,0)), bkHash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(bkHash(i + vec3(0,0,1)), bkHash(i + vec3(1,0,1)), f.x),
          mix(bkHash(i + vec3(0,1,1)), bkHash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  vec3 bkHash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453123);
  }

  // Cellular noise: x = distance to nearest site, y = second nearest, z = a
  // random value identifying the nearest cell. (y - x) is ~0 on cell borders.
  vec3 bkCells(vec3 x) {
    vec3 n = floor(x), f = fract(x);
    float f1 = 8.0, f2 = 8.0, id = 0.0;
    for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec3 g = vec3(float(i), float(j), float(k));
      vec3 o = bkHash3(n + g);
      vec3 r = g + o - f;
      float d = dot(r, r);
      if (d < f1) { f2 = f1; f1 = d; id = o.x; }
      else if (d < f2) { f2 = d; }
    }
    return vec3(sqrt(f1), sqrt(f2), id);
  }

  // Plates and fissures.
  //
  // Furrowed bark is a CELLULAR structure: long plates separated by narrow
  // fissures of fairly even width, the plates broken again by finer cross
  // cracks. A first attempt built it from ridged value-noise contours and it
  // read as melted wax — contour lines wander, vary wildly in width and close
  // into loops, none of which bark does. Stretched Voronoi gives plates.
  //
  // fp is the pixel footprint in bark space: each layer fades to its own mean
  // as it approaches the pixel, so the bark neither sparkles nor brightens at
  // distance. plateRnd identifies the plate, for plate-to-plate colour.
  float bkHeight(vec3 p, float fp, out float plateRnd) {
    // Warp at three scales. The finest one matters most: raw Voronoi borders
    // are straight line segments, and straight fissures read as vector
    // outlines drawn onto planks. Bark tears; its edges are ragged.
    vec3 w = vec3(p.xy, p.z * 0.25);
    vec2 wa = vec2(bkNoise(w * 2.7 + 11.3), bkNoise(w * 2.7 + 37.9)) - 0.5;
    vec2 wb = vec2(bkNoise(w * 10.0 + 3.1), bkNoise(w * 10.0 + 71.7)) - 0.5;
    vec2 wc = vec2(bkNoise(w * 36.0 + 5.7), bkNoise(w * 36.0 + 19.1)) - 0.5;
    float kFine = 1.0 - smoothstep(0.25, 0.7, fp * 36.0);
    vec3 pw = vec3(p.xy + wa * 0.07 + wb * 0.024 + wc * 0.011 * kFine,
                   p.z + wa.x * 0.25 + wb.y * 0.07);

    // Long interlocking ridges, nine times longer than wide.
    const float S1 = 15.0;
    vec3 c1 = bkCells(vec3(pw.xy * S1, pw.z * S1 * 0.11));
    float e1 = c1.y - c1.x;
    plateRnd = c1.z;
    float k1 = 1.0 - smoothstep(0.22, 0.6, fp * S1);

    // A furrow is a V with visible sloped WALLS, not a line. Too wide a ramp
    // and every ridge is a pillow (reptile skin); too narrow and the furrows
    // are ink outlines (planks). Its width also varies over the tree.
    float wv = mix(0.13, 0.3, bkNoise(w * 1.7 + 23.0));
    float ramp = smoothstep(0.0, wv, e1);

    // Ridges break into blocks — IRREGULARLY. Evenly spaced breaks turn every
    // ridge into a ladder, and the trunk into woven rope. The break positions
    // come from noise running along each ridge (so spacing varies), slanted a
    // little (so they are not ruled lines), and only some ridges break at all.
    float bn = bkNoise(vec3(c1.z * 91.0, pw.x * 5.0 + pw.y * 3.0, pw.z * 7.5 + c1.z * 40.0));
    float brk = smoothstep(0.0, 0.07, abs(bn - 0.5));
    brk = mix(1.0, brk, step(0.35, fract(c1.z * 3.77)));
    float kb = 1.0 - smoothstep(0.25, 0.7, fp * 40.0);

    // The ridge top is neither flat nor domed: it is lumpy along its length and
    // fibrous across it. Each octave fades at its own pixel footprint.
    float lump = (bkNoise(vec3(p.xy * 9.0, p.z * 5.0) + 2.0) - 0.5)
               + (bkNoise(vec3(p.xy * 26.0, p.z * 9.0) + 8.0) - 0.5) * 0.7 * (1.0 - smoothstep(0.25, 0.7, fp * 26.0));
    float grain =
        (bkNoise(vec3(p.xy * 70.0, p.z * 7.0)) - 0.5)  * 0.5 * (1.0 - smoothstep(0.25, 0.7, fp * 70.0))
      + (bkNoise(vec3(p.xy * 160.0, p.z * 16.0)) - 0.5) * 0.3 * (1.0 - smoothstep(0.25, 0.7, fp * 160.0))
      + (bkNoise(vec3(p.xy * 380.0, p.z * 40.0)) - 0.5) * 0.2 * (1.0 - smoothstep(0.25, 0.7, fp * 380.0));

    float top = 0.74 + (c1.z - 0.5) * 0.28 + lump * 0.3 + grain * 0.5;
    top *= mix(1.0, mix(0.66, 1.0, brk), kb);
    return clamp(mix(0.72, ramp * top, k1), 0.0, 1.0);
  }

  // Bump from a height field via surface derivatives (Mikkelsen).
  vec3 bkPerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
    vec3 sx = dFdx(surfPos);
    vec3 sy = dFdy(surfPos);
    vec3 r1 = cross(sy, surfNorm);
    vec3 r2 = cross(surfNorm, sx);
    float det = dot(sx, r1) * faceDir;
    vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
    return normalize(abs(det) * surfNorm - grad);
  }
`;

/**
 * @param opts.palette  { plate, furrow, young, lichen } as hex or THREE.Color
 * @param opts.depth    relief strength multiplier
 * @param opts.lichen   0..1 — how much pale lichen patches the old wood
 */
export function makeBarkMaterial(opts = {}) {
  const {
    palette = {},
    depth = 1.0,
    lichen = 0.55,
  } = opts;
  const C = (v, d) => new THREE.Color(v ?? d);

  // Real bark is greyer than "tree brown". The warmth lives in the furrows and
  // the young wood; the weathered plates are a warm grey.
  const uniforms = {
    uBarkPlate: { value: C(palette.plate, 0x6e645a) },
    uBarkFurrow: { value: C(palette.furrow, 0x33271f) },
    uBarkInner: { value: C(palette.inner, 0x553c2c) },
    uBarkYoung: { value: C(palette.young, 0x75665a) },
    uBarkLichen: { value: C(palette.lichen, 0xa3ab92) },
    uBarkDepth: { value: depth },
    uBarkLichenAmt: { value: lichen },
  };

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,      // occlusion from the mesher: ground contact, crotches
    roughness: 0.9,
    metalness: 0,
  });
  mat.userData.barkUniforms = uniforms;

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 barkCoord;
        attribute float barkR;
        ${GLSL_COMMON}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vBark = barkCoord;
        vBarkR = barkR;
        vBarkW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vBarkWN = normalize(mat3(modelMatrix) * objectNormal);`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        ${GLSL_COMMON}
        ${GLSL_FRAG_LIB}`)
      .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
        // Young wood: thin limbs carry smooth, tight, paler bark.
        float bkYoung = 1.0 - smoothstep(0.016, 0.07, vBarkR);
        vec3 bkDx = dFdx(vBark);
        vec3 bkDy = dFdy(vBark);
        float bkFp = max(length(bkDx), length(bkDy));
        float bkPlate;
        float bkH = bkHeight(vBark, bkFp, bkPlate);

        // Fissure floor -> warm inner bark on the fissure walls -> weathered
        // grey plate. The middle term matters: inner bark is redder than either
        // the shadowed floor or the weathered surface, and without it the
        // fissures read as painted black lines.
        vec3 bkCol = mix(uBarkFurrow, uBarkInner, smoothstep(0.0, 0.3, bkH));
        bkCol = mix(bkCol, uBarkPlate, smoothstep(0.26, 0.62, bkH));
        // Weathering sits on the high points: tops are paler and greyer.
        bkCol = mix(bkCol, uBarkPlate * 1.16, smoothstep(0.7, 0.95, bkH) * 0.5);
        // Plate-to-plate: each plate weathers a little differently.
        bkCol *= mix(0.8, 1.16, bkPlate);
        bkCol = mix(bkCol, bkCol * vec3(1.07, 0.98, 0.88), step(0.62, bkPlate) * 0.6);
        // Slow drift over the whole tree, in world space so it crosses limbs.
        float bkMacro = bkNoise(vBarkW * 0.85 + 3.0);
        bkCol *= mix(0.8, 1.14, bkMacro);
        bkCol = mix(bkCol, bkCol * vec3(1.06, 0.99, 0.9), bkNoise(vBarkW * 0.4 + 40.0));

        // Lichen: pale grey-green, in patches, on old wood, favouring surfaces
        // that face up and one side of the tree — it follows damp and light.
        float bkSide = dot(normalize(vBarkWN.xz + 1e-4), normalize(vec2(-0.55, 0.83)));
        float bkExpose = clamp(0.5 + 0.35 * bkSide + 0.4 * vBarkWN.y, 0.0, 1.0);
        float bkPatch = bkNoise(vBarkW * 2.6 + 9.0) * 0.65 + bkNoise(vBarkW * 9.0 + 2.0) * 0.35;
        float bkLichen = smoothstep(0.56, 0.7, bkPatch * (0.55 + 0.6 * bkExpose))
                       * (1.0 - bkYoung) * smoothstep(0.25, 0.7, bkH) * uBarkLichenAmt;
        bkCol = mix(bkCol, uBarkLichen * mix(0.85, 1.1, bkPlate), bkLichen * 0.7);

        vec3 bkYoungCol = uBarkYoung * mix(0.88, 1.1, bkPlate) * mix(0.9, 1.08, bkMacro);
        bkCol = mix(bkCol, bkYoungCol, bkYoung);

        // Cavity: furrows are dark because light cannot reach into them.
        // The shadow in a furrow is carried mostly by the NORMALS now that the
        // tree is lit from outside; painting it in as well made zebra stripes.
        float bkCavity = mix(0.62, 1.0, smoothstep(0.0, 0.5, bkH));
        bkCol *= mix(bkCavity, 1.0, bkYoung * 0.75);

        diffuseColor.rgb *= bkCol;`)
      .replace('#include <roughnessmap_fragment>', /* glsl */ `#include <roughnessmap_fragment>
        roughnessFactor = mix(1.0, 0.94, bkH);
        roughnessFactor = mix(roughnessFactor, 0.66, bkYoung * 0.8);
        roughnessFactor = mix(roughnessFactor, 0.93, bkLichen);`)
      .replace('#include <lights_physical_fragment>', /* glsl */ `#include <lights_physical_fragment>
        // Bark is porous and self-shadowing at the micro scale; left at the
        // default dielectric F0 it picks up a satin sheen that reads as varnish.
        material.specularColor *= 0.3;
        material.specularF90 *= 0.3;`)
      .replace('#include <normal_fragment_maps>', /* glsl */ `#include <normal_fragment_maps>
        {
          float depth = clamp(vBarkR * 0.2, 0.001, 0.04) * uBarkDepth * (1.0 - 0.82 * bkYoung);
          float bkTmp;
          float hx = bkHeight(vBark + bkDx, bkFp, bkTmp);
          float hy = bkHeight(vBark + bkDy, bkFp, bkTmp);
          normal = bkPerturb(-vViewPosition, normal, vec2(hx - bkH, hy - bkH) * depth, faceDirection);
        }`);
  };
  mat.customProgramCacheKey = () => 'bark-v7';
  return mat;
}
