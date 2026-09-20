// GROW — the new tree, as a library.
//
// One builder, two hosts. The debug pages (gate1.html / gate2.html, via gate1.js)
// and the product (main.js -> mountTree) both grow their tree HERE, from the same
// flat bag of parameters, so the tree that is art-directed and the tree a URL
// gets can never drift apart. Before this file existed the scene was the
// top-level body of gate1.js: it could only ever be one page.
//
// THE SEAM is that bag. Every tunable is read through `q.get` / `num` / `hexq`,
// exactly as it was when the bag was the page's URL. It is now LAYERED:
//
//     paramSource(dnaToParams(dna), new URLSearchParams(location.search))
//
// later layers win, so a query parameter still overrides anything derived from
// the DNA. That debug surface (?leafHide=1, ?debug=bloomleaves, ?grammar=,
// ?pale=, ?v= ...) has repeatedly been the difference between seeing a bug and
// inventing one, and it must survive any future change here.

import * as THREE from 'three';

// Project modules are loaded DYNAMICALLY so a host can pass a cache-busting token.
// python's http.server serves ES modules with revalidation the browser is happy to
// skip, and a hard reload does not reliably re-fetch an already-imported module
// graph: three consecutive edits once silently never reached the page. `?v=2`,
// `?v=3` ... on a debug page and the page cannot lie to you. (The product's
// server sends `cache-control: no-store`, so it needs no token.)
const MODULE_NAMES = ['util', 'branching', 'limbmesh', 'bark', 'woodsdf', 'leaves', 'flowers', 'island'];
export async function loadModules(bust = '') {
  const mods = await Promise.all(MODULE_NAMES.map((n) => import(`./${n}.js${bust}`)));
  return Object.fromEntries(MODULE_NAMES.map((n, i) => [n, mods[i]]));
}

/**
 * A layered, read-only parameter bag with the URLSearchParams reading interface.
 * Layers are plain objects or URLSearchParams; LATER layers win. null/undefined
 * values are skipped, so a layer can decline to have an opinion.
 */
export function paramSource(...layers) {
  const bag = new Map();
  for (const L of layers) {
    if (!L) continue;
    const entries = L instanceof URLSearchParams ? [...L.entries()] : Object.entries(L);
    for (const [k, v] of entries) if (v !== null && v !== undefined) bag.set(k, String(v));
  }
  return { get: (k) => (bag.has(k) ? bag.get(k) : null), has: (k) => bag.has(k), entries: () => [...bag.entries()] };
}

// --- structure presets -------------------------------------------------------
// They are different ARCHITECTURE, not one tree at several densities. `bare` is
// the whole skeleton on display and gets MORE structure; `sparse` is a tree
// wearing few leaves and is the BROADEST in the set — few limbs held wide read as
// chosen, held narrow and high they read as starved. See docs/TREE-SYSTEM.md.
//
// CHUNKY, to the revised Gate 1 (references/tree-style/README.md): 4-5 orders,
// limbs individually readable to the tip, never a wire haze; every child
// 0.70-0.80 x its parent. Taste's width rule holds across all of them: nothing
// narrow, width roughly constant, density is what varies; buy air with width,
// never by flattening.
//
// minStub: the committed Gate 1 URLs once said `minStub=5`, but that parameter
// was never wired at the time, so the reviewed trees were pruned at the default.
// These presets reproduce the trees that were actually judged.
export const PRESETS = {
  bare: {
    rx: 2.9, ry: 2.15, cy: 4.15, trunkMin: 8,
    c1: 300, k1: 4.6, c2: 700, k2: 2.4, i2: 9, minStub: 0.62,
    trunk: 0.31,
  },
  // Between the two judged ones, for `skeleton.complexity: normal`. NOT yet
  // judged by Taste — it exists because the product has three complexities and
  // the debug pages only ever had two.
  mid: {
    rx: 2.9, ry: 2.1, cy: 4.05, trunkMin: 8,
    c1: 235, k1: 5.3, c2: 440, k2: 3.0, i2: 9, minStub: 0.62,
    trunk: 0.27,
  },
  sparse: {
    rx: 2.9, ry: 2.05, cy: 3.95, trunkMin: 7,
    c1: 170, k1: 6.0, c2: 220, k2: 3.6, i2: 9, minStub: 0.62,
    trunk: 0.23,
  },
};

/** The parameter readers and the resolved structure/light bag, for one source. */
export function resolveParams(q) {
  const preset = PRESETS[q.get('preset')] || PRESETS.bare;
  const num = (k, d) => (q.has(k) ? parseFloat(q.get(k)) : (k in preset ? preset[k] : d));
  const hexq = (k, d) => (q.has(k) ? parseInt(q.get(k).replace('#', ''), 16) : d);
  // Every knob is a parameter so the look can be iterated without edits.
  const P = {
    seed: num('seed', 7),
    alpha: num('alpha', 2.2),       // da Vinci exponent: 2 = area-preserving
    influence: num('influence', 16),
    kill: num('kill', 2.6),
    D: num('D', 0.17),
    points: num('points', 900),
    rx: num('rx', 2.35),
    ry: num('ry', 2.15),
    cy: num('cy', 4.15),
    hollow: num('hollow', 0.42),
    wobble: num('wobble', 0.16),
    tip: num('tip', 0.004),
    // Re-matched by measurement after secondary thickening was gated off young
    // shoots: 2.8e-4 restores the reviewed tree's first-fork radius (0.2955).
    grow: num('grow', 2.8e-4),
    taper: num('taper', 0.013),
    shootR: num('shootR', 0.0055),
    rmax: num('rmax', 0.42),
    law: q.get('law') || 'ratio',
    trunk: num('trunk', 0.3),
    ratioLo: num('ratioLo', 0.7),
    ratioHi: num('ratioHi', 0.8),
    power: num('power', 0.5),
    tipMin: num('tipMin', 0.034),
    smooth: num('smooth', 3),
    minStub: num('minStub', 0.3),
    maxChildren: num('kids', 2),
    trunkMin: num('trunkMin', 8),
    coarseCount: num('c1', 230),
    coarseKill: num('k1', 5.0),
    coarseInfluence: num('i1', 20),
    fineCount: num('c2', 1800),
    fineKill: num('k2', 1.4),
    fineInfluence: num('i2', 11),
    fineShell: num('s2', 0),
    tipCount: num('c3', 0),
    tipKill: num('k3', 1.5),
    tipInfluence: num('i3', 5),
    tipShell: num('s3', 0.72),
    tipD: num('d3', 0.62),
    tipWobble: num('w3', 1.15),
    // surface + light
    barkDepth: num('depth', 1.0),
    lichen: num('lichen', 0.55),
    env: num('env', 0.85),
    keyI: num('key', 3.3),
    exposure: num('exp', 1.0),
    showCloud: q.get('cloud') === '1',
    showGround: q.get('ground') !== '0',
    flat: q.get('flat') === '1',   // the old unsurfaced look, for A/B
  };
  return { P, num, hexq, preset };
}

// --- environment states ------------------------------------------------------
// An environment is an ART-DIRECTED STATE, not a sampled hex value. Translating
// a dark website's ground colour literally into a dark scene gives muddy gloom:
// a dark website does not mean a dark tree. Every value below moves together —
// sky, key, fill, rim, image-based light, exposure — because that is what makes
// it a lighting state rather than a background swap.
//
// NIGHT is "moonlit diorama, not brightness slider at 20%". What says night is
// COLOUR (a cool key, an indigo sky), DIRECTION and CONTRAST (a high key-to-fill
// ratio with shadows that are deep blue, never black).
function envTable(q) {
  return {
    // DAY: soft, even light with gentle occlusion and no harsh shadow — the
    // reference's lighting, and the right light for a matte clay surface. Most of
    // the light is the environment, the key only shapes, and a warm fill from the
    // camera side keeps the shadow side luminous rather than grey.
    day: {
      skyTop: 0x5d9fd0, skyHorizon: 0xe6ebe6, skyGround: 0x8a8468,
      glow: { color: 0xfff2dc, power: 7, size: 14, dir: [5.6, 8.4, 5.4] },
      key: { color: 0xfff1de, intensity: 2.7, dir: [7.2, 7.4, 3.6], shadowRadius: 4, shadowMap: 2048 },
      fill: { color: 0xffe9d2, intensity: 0.42, dir: [-3.0, 3.2, 7.5] },
      rim: { color: 0xcfe2f2, intensity: 0.55, dir: [-6.5, 4.2, -5.6] },
      env: 0.95, exposure: 0.97, tone: 'neutral',
    },
    // NIGHT. The human rejected the first version outright: "too much light."
    // The rule it was built on still holds — night comes from colour, direction
    // and contrast, never from a lowered exposure — but it had been applied so
    // strictly that the key never came down at all, and "properly exposed" had
    // quietly become "brightly lit". Day-for-night still has falloff: a moon is a
    // weak source, and what makes its subject readable is that everything around
    // it is darker, not that the subject sits at daylight levels.
    //
    // `night=a|b|c` is three points on that range, brightest first, so the choice
    // is a pick rather than a guess. The two documented failures bound it: a
    // black cut-out on a bright card at one end, the rejected near-daylight
    // version at the other.
    night: (() => {
      const LV = {
        a: { key: 2.9, angle: 0.29, edge: 1.5, kick: 0.2, env: 0.52, exp: 1.04, ground: 0.3, leaf: 1.26 },
        b: { key: 2.1, angle: 0.26, edge: 1.15, kick: 0.15, env: 0.36, exp: 1.0, ground: 0.25, leaf: 1.12 },
        c: { key: 1.5, angle: 0.235, edge: 0.85, kick: 0.1, env: 0.25, exp: 1.0, ground: 0.2, leaf: 1.0 },
      };
      const L = LV[q.get('night')] || LV.b;
      return {
        // The sky sits DARKER than the lit tree, so the tree is the brightest thing
        // in the frame; still a little lighter toward the horizon, because that
        // band is what the shadow side is read against.
        skyTop: 0x03050b, skyHorizon: 0x111a31, skyGround: 0x05070d,
        glow: { color: 0xcdd9ff, power: 9, size: 6, dir: [-5.2, 7.4, 6.2] },
        // Near-white, from the front quarter: a saturated blue key is absorbed by
        // warm wood (black wood, wet blue sheen), and a pure backlight leaves a
        // silhouette. A soft-edged SPOT, so the light pools and falls away.
        key: { color: 0xc9d6ff, intensity: L.key, dir: [-5.2, 7.4, 6.2], shadowRadius: 1.6, spot: { angle: L.angle, penumbra: 1.0 } },
        // The silver edge, from behind — an EDGE, not a second key.
        fill: { color: 0xdfe8ff, intensity: L.edge, dir: [5.2, 4.6, -7.0] },
        // A faint warm kicker keeps the wood reading as wood rather than slate.
        rim: { color: 0xffc890, intensity: L.kick, dir: [7.0, 1.8, 3.0] },
        ground: { sat: 0.5, value: L.ground, tint: 0x5f7fae, tintAmt: 0.2 },
        // Desaturated toward sage, but kept clearly GREEN: all the way to silver
        // reads as frost, which is a season and not a time of day.
        foliage: { sat: 0.64, value: L.leaf, tint: 0xa9c6dc, tintAmt: 0.26 },
        // Bloom and fruit carry the WEBSITE's colour, so they keep more of it than the
        // leaves do: a little cooled, barely desaturated.
        bloom: { sat: 0.9, value: L.leaf * 1.2, tint: 0xa9c6dc, tintAmt: 0.06 },
        env: L.env, exposure: L.exp, tone: 'aces',
      };
    })(),
  };
}

const TONE = { neutral: THREE.NeutralToneMapping, aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping };
const dirOf = (a) => new THREE.Vector3(...a).normalize();

/**
 * Grade a colour for an environment state: drain saturation toward its own
 * luminance, pull it toward the state's tint, scale its value. NOT baked light —
 * a lit scene cannot make turf or foliage respond to "night" through its lights
 * alone, so the ALBEDO is graded and the lights still do all the lighting.
 */
export function gradeColor(c, G) {
  if (!G) return c;
  const l = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
  c.lerp(new THREE.Color(l, l, l), 1 - G.sat);
  c.lerp(new THREE.Color(G.tint).multiplyScalar(l * 1.4), G.tintAmt);
  return c.multiplyScalar(G.value);
}

function skyDome(ENV, radius, withGround) {
  const top = new THREE.Color(ENV.skyTop), hor = new THREE.Color(ENV.skyHorizon), gnd = new THREE.Color(ENV.skyGround);
  const g = new THREE.SphereGeometry(radius, 48, 24);
  const pos = g.attributes.position;
  const col = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / radius;
    if (y >= 0) c.copy(hor).lerp(top, Math.pow(y, 0.42));
    else c.copy(hor).lerp(withGround ? gnd : hor, Math.min(1, -y * 3.2));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false }));
}

/**
 * The lit, empty scene for one environment state: sky, image-based light, key,
 * fill and rim. It also SETS the renderer's tone mapping and exposure, because
 * those are part of the state. `dispose()` frees everything it made.
 */
export function createEnvironment(renderer, q, P) {
  const ENVS = envTable(q);
  const name = ENVS[q.get('envstate')] ? q.get('envstate') : 'day';
  const ENV = ENVS[name];
  // Tone mapping and exposure are part of the state — but they are RENDERER state,
  // so they are applied when this environment goes ON SCREEN (`apply`), not when it
  // is created. A host builds the next environment up front and keeps the old scene
  // up until the new tree is whole; applied here, the old scene was re-rendered under
  // the NEXT state's tone mapping for the whole build (a day island under night's
  // ACES, every material recompiled), and for good if that build then failed.
  const exposure = ENV.exposure * P.exposure;
  const toneMapping = TONE[q.get('tm') || ENV.tone] ?? THREE.NeutralToneMapping;

  // Image-based light. Without an environment a rough dielectric has nothing to
  // reflect and every shadowed surface falls to the same dead value. The env
  // carries a soft glow in the key direction so the ambient has a direction too.
  const envScene = new THREE.Scene();
  const envSky = skyDome(ENV, 50, true);
  envScene.add(envSky);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(ENV.glow.size, 24, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(ENV.glow.color).multiplyScalar(ENV.glow.power), toneMapped: false })
  );
  glow.position.copy(dirOf(ENV.glow.dir)).multiplyScalar(42);
  envScene.add(glow);
  const pm = new THREE.PMREMGenerator(renderer);
  const envRT = pm.fromScene(envScene, 0.03);
  pm.dispose();
  for (const m of [envSky, glow]) { m.geometry.dispose(); m.material.dispose(); }

  const scene = new THREE.Scene();
  const sky = skyDome(ENV, 60, false);
  scene.add(sky);
  scene.environment = envRT.texture;
  scene.environmentIntensity = ENV.env * (P.env / 0.85);

  // Key. By day the ENVIRONMENT is most of the light and the key only shapes.
  const keyI = ENV.key.intensity * (P.keyI / 3.3);
  const key = ENV.key.spot
    ? new THREE.SpotLight(ENV.key.color, keyI, 0, ENV.key.spot.angle, ENV.key.spot.penumbra, 0) // decay 0: a moon does not fall off
    : new THREE.DirectionalLight(ENV.key.color, keyI);
  key.position.copy(dirOf(ENV.key.dir)).multiplyScalar(ENV.key.spot ? 17 : 14);
  key.castShadow = true;
  key.shadow.mapSize.set(ENV.key.shadowMap || 4096, ENV.key.shadowMap || 4096);   // a smaller map is a softer PCF edge
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 34;
  const S = 6.2;
  if (!ENV.key.spot) Object.assign(key.shadow.camera, { left: -S, right: S, top: S, bottom: -S });
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.028;
  key.shadow.radius = ENV.key.shadowRadius;
  key.target.position.set(0, 2.6, 0);
  scene.add(key, key.target);

  const lights = [key];
  for (const L of [ENV.fill, ENV.rim]) {
    if (!L) continue;
    const d = new THREE.DirectionalLight(L.color, L.intensity);
    d.position.copy(dirOf(L.dir)).multiplyScalar(12);
    scene.add(d);
    lights.push(d);
  }

  return {
    name, ENV, scene,
    apply() { renderer.toneMappingExposure = exposure; renderer.toneMapping = toneMapping; },
    gradeGround: (hex) => gradeColor(new THREE.Color(hex), ENV.ground),
    dispose() {
      sky.geometry.dispose(); sky.material.dispose();
      envRT.dispose();
      for (const l of lights) { if (l.shadow && l.shadow.map) l.shadow.map.dispose(); l.dispose?.(); }
    },
  };
}

// --- seasons -------------------------------------------------------------------
// `botanicalState` is a FOUR-value enum, not a winter flag. Leaf colours per
// state, in the new tree's brighter register for the two green states, and
// PORTED from the shipped renderer (dna.js, BOTANY) for autumn and winter so the
// two trees stay one family:
//   flowering  a touch fresher and yellower — a flowering tree is a spring tree.
//              It is set BY the flower amount; it is not a colour state of its own.
//   autumn     burnt sienna -> orange -> amber. The only warm state there is.
//   winter     desaturated sage. NOT brown and not dying: the reading wanted is
//              restraint, so the hue stays green and the saturation drops.
export const SEASON_LEAVES = {
  normal:    { greens: [0x86c440, 0xa6d84f, 0x63ad3a], amount: 1 },
  flowering: { greens: [0x8fca45, 0xb0de58, 0x6cb33d], amount: 1 },
  autumn:    { greens: [0xc2701f, 0xecb141, 0x7d3a16], amount: 0.88 },   // "a little thinner: some of it is on the ground"
  winter:    { greens: [0x66755c, 0x93a07f, 0x414f3f], amount: 0.5 },
};
// --- the ground answers to the trunk ---------------------------------------------
// RULE (Taste, 2026-09-20): the ground must sit CLEARLY DARKER IN VALUE than the
// trunk standing on it. A root buttress only reads as gripping the earth if the
// earth is darker than the wood; at equal value the tree's base dissolves into the
// lawn and the footing disappears.
//
// ROOT CAUSE, and the reason this is a rule and not a palette fix: the trunk went
// from dark brown to PALE TAN in the clay restyle, and every terrain palette
// predates that. They were authored against a dark trunk and the trunk moved out
// from under them. Measured in albedo: autumn turf L* 69.3 against a trunk at 70.1
// — the same value. Summer survives only because a saturated green separates from
// tan by HUE; straw, sage and dormant olive sit in the trunk's own hue family and
// have nothing but value to separate them.
//
// So the rule is applied to the RELATIONSHIP, per state, by construction: the
// closer the turf's chroma is to the trunk's, the more value separation it owes.
// Value only (one RGB scale across lo/mid/hi, so hue and saturation are untouched
// and the turf's own internal ramp survives). It deliberately does NOT restore any
// authored hex: a straw-gold lawn under an amber canopy collapses into one hue
// family, so this goes down until it is clearly darker and stops.
const linOf = (c) => [c.r, c.g, c.b];
function labOf(c) {
  const [r, g, b] = linOf(c);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return { L: 116 * f(Y) - 16, a: 500 * (f(X) - f(Y)), b: 200 * (f(Y) - f(Z)), Y };
}
const sstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const yOfL = (L) => Math.pow((L + 16) / 116, 3);

/**
 * @param turf   { lo, mid, hi } THREE.Colors — scaled IN PLACE
 * @param wood   the trunk's albedo (hex)
 * @param gap    L* the turf owes the trunk when it shares its hue family
 * @returns { k, turfL, trunkL, owes } for the HUD / a report
 */
export function groundForTrunk(turf, wood, gap = 13) {
  const trunk = labOf(new THREE.Color(wood));
  const mean = turf.mid.clone().lerp(turf.hi, 0.5);
  const t = labOf(mean);
  const dab = Math.hypot(t.a - trunk.a, t.b - trunk.b);
  const owes = gap * (1 - sstep(24, 40, dab));      // a hue-distant lawn (summer green) owes nothing
  let k = 1;
  // Guarded: an absurd `groundGap` must not drive the target below where L* is a
  // cube (k went negative at gap 90), and a black lawn must not divide by zero.
  if (owes > 0 && trunk.L - t.L < owes) k = Math.min(1, yOfL(Math.max(trunk.L - owes, 8)) / Math.max(t.Y, 1e-4));
  for (const key of ['lo', 'mid', 'hi']) turf[key].multiplyScalar(k);
  const after = labOf(turf.mid.clone().lerp(turf.hi, 0.5)).L;
  return { k: +k.toFixed(3), turfLBefore: +t.L.toFixed(1), turfLAfter: +after.toFixed(1), trunkL: +trunk.L.toFixed(1), owes: +owes.toFixed(1), dab: +dab.toFixed(0) };
}

/**
 * The island keeps its own value ORDER: grass is lighter than the soil cliff it
 * grows on. Taking the turf down without the soil inverted it — in winter and bare
 * the lawn rendered DARKER than the vertical face beneath it, which is backward.
 * The soil follows only as far as the order needs; it is not regraded.
 */
export function soilForTurf(soilHi, soilLo, turfMeanL, margin = 8) {
  const cur = labOf(soilHi);
  if (cur.L <= turfMeanL - margin) return 1;
  const k = Math.min(1, yOfL(Math.max(turfMeanL - margin, 6)) / Math.max(cur.Y, 1e-4));
  soilHi.multiplyScalar(k); soilLo.multiplyScalar(k);
  return +k.toFixed(3);
}

/**
 * The stones are never the brightest thing in a picture whose subject is the tree.
 * They were: L* ~92 in every daylight state, +23-27% over the trunk in the render —
 * "scattered popcorn that yanks the eye off the hero". Their VALUE is capped under
 * the trunk. Their STATE still arrives, through the host's palette (warm cream in
 * summer, grey when dormant), which a value scale leaves alone.
 *
 * Honest about what this is: in daylight the cap always binds, so this is a cap and
 * not a "step lighter than the turf" — that term was dead code and is gone. The
 * stones still READ lighter than the lawn, because their facets face the sky and
 * grass blades mostly do not (measured: ~21 L* over the turf in the render, at equal
 * albedo). The cap sits well under the trunk for the same reason: at trunk-5 they
 * still rendered 12% brighter than it.
 *
 * NOT applied at night — see the caller.
 */
export function stonesForGround(rockHi, rockLo, turfMeanL, wood) {
  const trunkL = labOf(new THREE.Color(wood)).L;
  const hiL = Math.max(trunkL - 13, 10);
  for (const [c, L] of [[rockHi, hiL], [rockLo, hiL - 14]]) {
    const cur = labOf(c);
    c.multiplyScalar(yOfL(Math.max(L, 8)) / Math.max(cur.Y, 1e-4));
  }
}

const NORMAL_TERRAIN = { lo: 0x5e9e37, mid: 0x81c246, hi: 0xa8d95c, soilHi: 0xa07b58, soilLo: 0x6a5663 };
// The debug pages' ground follows the season too. The PRODUCT hands in the shipped
// resolver's palette (opts.terrain); a debug page has no DNA, so without these a
// `season=winter` tree stood on a summer lawn and could not be judged. Same numbers
// as dna.js (TERRAIN.autumn / TERRAIN.winter) — one family.
const SEASON_TERRAIN = {
  autumn: { lo: 0x8a8a3c, mid: 0xb09a44, hi: 0xd0b45e, soilHi: 0x9c7148, soilLo: 0x64514f },
  winter: { lo: 0x6b7a5c, mid: 0x869070, hi: 0xa3ab8c, soilHi: 0x8e8076, soilLo: 0x615a60 },
};
const DORMANT_TERRAIN = { lo: 0x6b6f54, mid: 0x838661, hi: 0x9d9d79, soilHi: 0x8a7d6d, soilLo: 0x5d5859 };

/**
 * Grow one tree.
 *
 * @param M     the module bag from loadModules()
 * @param q     a paramSource
 * @param env   the createEnvironment() result the tree will stand in (for grades)
 * @param opts  uniforms        — shared { time } uniform for the grass
 *              budgetMs        — slice length for the wood build; Infinity (the
 *                                debug pages) runs it straight through
 *              signal          — AbortSignal: a newer tree was asked for
 *              onGround(group) — called as soon as the island exists, BEFORE the
 *                                slow part, so a host can show it while the tree grows
 *              leavesDefault   — what `leaves` means when nobody says ('0' | '1')
 *              terrain         — optional palette {lo,mid,hi,soilHi,soilLo,grass,height,
 *                                rockHi,rockLo} as hex/THREE.Color, overriding the default
 *              rocks           — add V0's composed stones
 * @returns {{ tree, ground, skel, geo, thick, stats, extents, dispose }}
 */
export async function growTree(M, q, env, opts = {}) {
  const { uniforms = { time: { value: 0 } }, budgetMs = Infinity, signal = null, onGround = null, leavesDefault = '0' } = opts;
  const { P, num, hexq } = resolveParams(q);
  const { rng } = M.util;
  const ENV = env.ENV;
  const throwIfAborted = () => { if (signal && signal.aborted) throw new DOMException('tree build superseded', 'AbortError'); };
  // Phase timings (ms of main-thread work per phase). When the build is time-sliced
  // each phase also ends with a breath, so the longest STALL a page can see is the
  // longest single phase — which makes this table the thing to read when a host
  // reports a frozen frame.
  const phases = {};
  let tPhase = performance.now();
  const endPhase = async (name) => {
    phases[name] = Math.round(performance.now() - tPhase);
    if (budgetMs !== Infinity) { await new Promise((res) => { const ch = new MessageChannel(); ch.port1.onmessage = () => { ch.port1.close(); res(); }; ch.port2.postMessage(0); }); throwIfAborted(); }
    tPhase = performance.now();
  };

  // `season` is the four-value botanicalState. Winter is the one that changes the
  // TREE (leafless or near it, buds or berries); the others change its colours.
  const SEASON = ['normal', 'flowering', 'autumn', 'winter'].includes(q.get('season')) ? q.get('season') : 'normal';
  const WINTER = SEASON === 'winter';
  const season = SEASON_LEAVES[SEASON];
  const LEAVES = q.get('leaves') ?? leavesDefault;
  // A leafless tree takes the scene dormant with it ("a bare tree in a living
  // scene reads as death, not as winter" — TASTE). Winter is leafless unless
  // `winterLeaves=1` keeps a thin sage crown on it, so it is dormant either way,
  // but less so with leaves: V0's two dormancies (dna.js, DORMANCY).
  const leafless = LEAVES === '0' || (WINTER && q.get('winterLeaves') !== '1');
  const dormancyDefault = leafless ? 0.82 : WINTER ? 0.4 : 0;

  // --- ground: first, because it is instant and a host can show it at once -----
  const ground = new THREE.Group();
  let groundInfo = null;
  if (P.showGround) {
    const T0 = opts.terrain || {};
    const hexOf = (v, d) => (v == null ? d : (v.isColor ? v.getHex() : v));
    const dormancy = num('dormancy', dormancyDefault);
    const terrain = {};
    for (const k of Object.keys(NORMAL_TERRAIN)) {
      const base = new THREE.Color(hexOf(T0[k], (SEASON_TERRAIN[SEASON] ?? NORMAL_TERRAIN)[k]));
      // A palette handed in by the host already has its own dormancy mixed in.
      if (!opts.terrain) base.lerp(new THREE.Color(DORMANT_TERRAIN[k]), dormancy);
      terrain[k] = base;
    }
    // The ground answers to the trunk, in ALBEDO and before the environment grade —
    // the relationship is a property of the scene, and night then grades both alike.
    const wood = M.bark.WOOD_TAN ?? 0xc7a67e;
    const gv = q.get('groundRule') === '0' ? null : groundForTrunk(terrain, wood, num('groundGap', 13));
    groundInfo = gv;
    const turfMeanL = labOf(terrain.mid.clone().lerp(terrain.hi, 0.5)).L;
    if (gv) gv.soilK = soilForTurf(terrain.soilHi, terrain.soilLo, turfMeanL);
    for (const k of Object.keys(NORMAL_TERRAIN)) terrain[k] = gradeColor(terrain[k], ENV.ground);
    if (T0.grass) terrain.grass = T0.grass;
    if (T0.height) terrain.height = T0.height;
    // Its OWN stream. On the shared one the lawn came after the foliage branches,
    // which draw different amounts — so the grass changed with leaves, flowers or
    // winter, which is how a debug toggle ends up "moving" something it never touched.
    const groundRng = rng(P.seed * 13 + 505);
    ground.add(M.island.buildIsland(groundRng, terrain));
    ground.add(M.island.buildGrass(groundRng, uniforms, { ...terrain, detail: num('grassDetail', 0.6) }));
    if (opts.rocks) {
      const rk = { rockPush: num('rockPush', 1.32) };
      const rHi = new THREE.Color(hexOf(T0.rockHi, 0xf0e0c2)), rLo = new THREE.Color(hexOf(T0.rockLo, 0xb5a07f));
      // Day only. At night the moonlit trunk is already the brightest object by a
      // wide margin, so the stones were never the offence there — and capped, under
      // a weak ambient that their sky-facing facets cannot use, they rendered DARKER
      // than the lawn and read as holes punched in the grass instead of pebbles.
      if (q.get('groundRule') !== '0' && env.name !== 'night') stonesForGround(rHi, rLo, turfMeanL, wood);
      rk.rockHi = gradeColor(rHi, ENV.ground);
      rk.rockLo = gradeColor(rLo, ENV.ground);
      ground.add(M.island.buildRocks(rng(P.seed * 17 + 707), rk));
    }
  }
  if (onGround) onGround(ground);
  await endPhase('ground');

  // --- structure ---------------------------------------------------------------
  const t0 = performance.now();
  const r = rng(P.seed);
  const skel = M.branching.buildSkeleton(r, {
    cloud: { count: P.points, cy: P.cy, rx: P.rx, ry: P.ry, rz: P.rx, hollow: P.hollow },
    grow: { D: P.D, influence: P.influence, kill: P.kill, wobble: P.wobble, maxChildren: P.maxChildren, trunkMin: P.trunkMin },
    radii: { tip: P.tip, alpha: P.alpha, grow: P.grow, taper: P.taper, shootR: P.shootR, max: P.rmax },
    smooth: P.smooth,
    minStub: P.minStub,
    radiusLaw: P.law,
    ratio: { trunk: P.trunk, ratioLo: P.ratioLo, ratioHi: P.ratioHi, power: P.power, tipMin: P.tipMin },
    coarseCount: P.coarseCount, coarseKill: P.coarseKill, coarseInfluence: P.coarseInfluence,
    fineCount: P.fineCount, fineKill: P.fineKill, fineInfluence: P.fineInfluence, fineShell: P.fineShell,
    tipCount: P.tipCount, tipKill: P.tipKill, tipInfluence: P.tipInfluence, tipShell: P.tipShell, tipD: P.tipD, tipWobble: P.tipWobble,
  });
  const tGrow = performance.now() - t0;
  await endPhase('skeleton');

  // --- wood ----------------------------------------------------------------------
  const t1 = performance.now();
  const DEBUG_LIMBS = q.get('debug') === 'limbs';
  // Thick wood is an implicit surface (smooth-blended unions, flowing buttress);
  // thin wood stays swept tubes and picks up where the field stops. `sdf=0` falls
  // back to tubes everywhere, for comparison.
  const useField = q.get('sdf') !== '0';
  const woodOpts = { voxel: num('voxel', 0.026), budgetMs, signal };
  const thick = !useField ? { geometry: null, cuts: new Map() }
    : budgetMs === Infinity ? M.woodsdf.buildThickWood(skel.limbs, r, woodOpts)
    : await M.woodsdf.buildThickWoodAsync(skel.limbs, r, woodOpts);
  phases.wood = Math.round(performance.now() - tPhase); tPhase = performance.now();
  throwIfAborted();
  const geo = M.limbmesh.buildLimbs(skel.limbs, r, { debugColors: DEBUG_LIMBS, cuts: thick.cuts });
  const tMesh = performance.now() - t1;

  const bark = DEBUG_LIMBS
    ? new THREE.MeshBasicMaterial({ vertexColors: true })
    : P.flat
    ? new THREE.MeshStandardMaterial({ color: 0x6b5443, roughness: 0.82, metalness: 0 })
    : M.bark.makeBarkMaterial();
  const tree = new THREE.Group();
  for (const gm of [geo, thick.geometry]) {
    if (!gm) continue;
    const m = new THREE.Mesh(gm, bark);
    m.castShadow = true;
    m.receiveShadow = true;
    tree.add(m);
  }

  await endPhase('limbs');

  // --- foliage, bloom, fruit -------------------------------------------------------
  const F = M.flowers;
  const stats = { leaves: null, flowers: null, fruit: null, winter: null, contrast: null };
  let dbgSpots = null, dbgBloom = null;
  const bloomGrade = ENV.bloom ? (c) => gradeColor(c, ENV.bloom) : null;
  const leafGrade = ENV.foliage ? (c) => gradeColor(c, ENV.foliage) : null;
  // Leaf amount for the season (autumn is a little thinner, winter much) arrives
  // as wider spacing: fewer clusters, each still a full, authored cluster.
  const leafAmount = Math.max(0.2, num('leafAmount', season.amount));
  const attach = {
    // Winter's thinning is applied to its LEAVES below, not here: its buds belong on
    // every twig, and thinning the attachment points would halve them too.
    spacing: num('leafSpacing', 0.4) / (WINTER ? 1 : leafAmount),
    maxRadius: num('leafMaxR', 0.12), outerFraction: num('leafOuter', 0.78),
  };
  const greens = q.has('greens') ? q.get('greens').split(',').map((h) => parseInt(h.replace('#', ''), 16)) : season.greens;
  const cluster = {
    leaves: num('perCluster', 17), leafLength: num('leafLen', 0.5), soft: num('soft', 0.62),
    greens, grade: leafGrade,
  };

  if (WINTER) {
    // WINTER (ruling L8). The website's colour is carried by BUDS — or by
    // persistent BERRIES where the site has the fruit trait. `winter=buds|berries`
    // overrides; the default follows `fruit=1`.
    const spots = M.leaves.leafAttachments(skel.limbs, r, attach);
    if (!leafless) {
      // A thin sage crown. V0's winter kept real foliage for a reason that still
      // holds: winter must stay clearly distinct from BARE.
      // Thinned by taking every n-th twig, evenly, rather than by a random draw: a
      // winter crown is sparse all over, not moth-eaten in patches.
      const stride = Math.max(1, Math.round(1 / leafAmount));
      const lv = M.leaves.buildLeaves(skel.limbs, r, { spots: spots.filter((_, i) => i % stride === 0), cluster });
      tree.add(lv.group);
      stats.leaves = lv.stats;
    }
    const carrier = q.get('winter') ?? (q.get('fruit') === '1' ? 'berries' : 'buds');
    // A winter site may deliver NO colour at all (flowers: none => primary null, and
    // today every winter site in the corpus does). `budNatural=1` then asks for buds
    // in a natural, uncoloured bud tone instead of inventing an accent.
    const natural = !q.has('fc') && q.get('budNatural') === '1';
    const w = carrier === 'berries'
      ? F.buildBerries(spots, rng(P.seed * 11 + 303), { color: hexq('fruitc', hexq('fc', 0xd8452f)), grade: bloomGrade, fraction: num('berryFrac', 0.42), size: num('berrySize', 1) })
      : F.buildBuds(spots, rng(P.seed * 7 + 101), {
          primary: natural ? 0xc9c3a4 : hexq('fc', 0xf7a6b8),
          secondary: natural ? 0x9a9a78 : (q.has('fc2') ? hexq('fc2', 0) : null),
          grade: bloomGrade, size: num('budSize', 1),
        });
    tree.add(w.group);
    stats.winter = w.stats;
    dbgSpots = spots;
  } else if (LEAVES !== '0') {
    // Order matters. Attachment points first (same RNG draws as before, so no leaf
    // moves); then WHICH of them flower, on a separate stream; then the leaves,
    // which need to know, because a flowering twig carries a smaller leaf cluster.
    const spots = M.leaves.leafAttachments(skel.limbs, r, attach);
    const FLOWERS = q.get('flowers') ?? 'none';
    // The bloom GRAMMAR is not in the DNA (ruling L1): it is chosen from the
    // grammars compatible with the morphology, by the seed, on its own stream.
    // `grammar=` overrides for debugging; `form=` and the first names still resolve.
    const askedGrammar = q.get('grammar') ?? q.get('form');
    const GRAMMAR = F.BLOOM_GRAMMARS.includes(askedGrammar) ? askedGrammar
      : (F.LEGACY_GRAMMAR[askedGrammar] ?? F.chooseGrammar(q.get('morphology') ?? 'broad', P.seed));
    const flowerRng = rng(P.seed * 7 + 101);
    // L11: fruit is planned FIRST (low, on older wood), and the bloom keeps off the
    // twigs around it. Its own stream, so fruit never re-rolls a flower.
    const FRUIT = q.get('fruit') === '1';
    const fruitRng = rng(P.seed * 11 + 303);
    const fruitSites = FRUIT ? F.chooseFruitSites(spots, fruitRng, { sites: num('fruitSites', 22) }) : [];
    const keepOff = FRUIT && FLOWERS !== 'none' ? F.bloomExclusion(spots, fruitSites, num('fruitClear', 0.75)) : null;
    // `bloomMul` scales the amount's fraction WITHOUT changing its band. Nothing
    // uses it today: it was autumn's x0.4, and autumn no longer flowers at all (see
    // dna-params.js). It stays because the `few` floor is defined against it — any
    // future state multiplier arrives here and is clamped, by construction.
    // The multiplier is handed over UN-applied: the `few` floor is clamped inside
    // chooseBloomSites, after all scaling, so no caller can scale beneath it.
    const bloomSites = FLOWERS === 'none' ? [] : F.chooseBloomSites(spots, flowerRng, {
      amount: FLOWERS, mul: num('bloomMul', 1), fraction: q.has('bloom') ? num('bloom', 0.33) : null, exclude: keepOff,
      bands: q.has('bands') ? q.get('bands').split(',').map(Number) : undefined, tip: q.has('tipBonus') ? num('tipBonus', 0.18) : undefined,
    });

    // L5: the amount decides what the flowering twigs — and their neighbours —
    // WEAR. Every number in the table can be overridden for tuning.
    const folT = F.BLOOM_FOLIAGE[bloomSites.length ? FLOWERS : 'none'] ?? F.BLOOM_FOLIAGE.medium;
    const FOL = {
      ...folT,
      atBloom: num('leafAtBloom', folT.atBloom), nearTo: num('leafNear', folT.nearTo),
      nearRadius: num('leafNearR', folT.nearRadius), elsewhere: num('leafElsewhere', folT.elsewhere),
    };

    // WARNING FOR ANYONE JUDGING COLOUR FROM A URL: `fc` and `fc2` given by hand go
    // straight to the renderer and BYPASS conditionFlower in analysis/lib/mapping.js
    // (the petal lightness floor, the computed centre). No real site can deliver,
    // say, a raw #0b0d40 petal — so a hand-driven render is NOT representative of a
    // real tree unless the colours passed are already-conditioned ones (github
    // arrives as petal #1b20a0 + centre #8a8de4). Lead reached a false conclusion
    // this way once. Through dnaToParams the colours are the conditioned ones.
    //
    // AND IT IS NOT MERELY "UNREPRESENTATIVE" (Taste): the conditioner is what makes a
    // THIRD OF THE CORPUS work. Blue passes the accent test BECAUSE of conditionFlower.
    // A raw dark navy fails badly — a dark flower reads as a hole punched in the
    // canopy, and no amount of chroma rescues it. So bypassing the conditioner does not
    // give you a neutral preview of a site's colour; it gives you the FAILING case.
    const FC = hexq('fc', 0xf7a6b8);
    const FC2 = q.has('fc2') ? hexq('fc2', 0xe87b92) : (q.has('fc') ? null : 0xe87b92);
    const pale = q.has('pale') ? num('pale', 0) : null;
    // L6: the local stage. `contrast=0` turns it off, for the A/B.
    const contrast = F.foliageContrast(spots, bloomSites, {
      primary: FC, secondary: FC2, pale, lift: num('lift', 0), grade: bloomGrade, foliageGrade: leafGrade, greens,
      // No fallback for the radius ON PURPOSE: it is ruled in flowers.js (0.85). A
      // caller once passed 1.35 — the rejected value — so the ruled one never ran.
      strength: num('contrast', 1), radius: q.has('contrastR') ? num('contrastR', 0.85) : undefined,
    });
    stats.contrast = { target: +contrast.target.toFixed(2), flowerL: contrast.flowerL, foliageL: contrast.foliageL };

    const lv = M.leaves.buildLeaves(skel.limbs, r, {
      spots, cluster,
      siteValue: contrast.scale,
      siteScale: F.foliageScales(spots, bloomSites, FOL), shrink: new Set(bloomSites.map((i) => spots[i])),
      debugShrink: q.get('debug') === 'bloomleaves',
    });
    tree.add(lv.group);
    stats.leaves = lv.stats;
    dbgSpots = spots; dbgBloom = bloomSites;
    if (q.get('leafHide') === '1') lv.group.visible = false;   // debug: see where the bloom actually is

    if (bloomSites.length) {
      const fl = F.buildFlowers(spots, flowerRng, {
        sites: bloomSites,
        grammar: GRAMMAR,
        primary: FC, secondary: FC2,
        size: num('flowerSize', 1), pale, lift: num('lift', 0), grade: bloomGrade,
        eyeShape: q.get('eye') === 'round' ? 'round' : 'star', eyeWarm: q.has('eyeWarm') ? num('eyeWarm', 0.14) : null,
        proud: 0.5 * FOL.atBloom + 0.07,   // stands off its OWN leaf tuft; this is not a move, the tuft shrank
      });
      tree.add(fl.group);
      stats.flowers = fl.stats;
    }
    if (FRUIT) {
      const fr = F.buildFruit(spots, fruitRng, {
        chosen: fruitSites,
        color: hexq('fruitc', 0xd8452f), sites: num('fruitSites', 22), radius: num('fruitR', 0.16),
        grade: bloomGrade,
      });
      tree.add(fr.group);
      stats.fruit = fr.stats;
    }
  }

  await endPhase('foliage');

  const box = new THREE.Box3().setFromObject(tree);
  const size = box.getSize(new THREE.Vector3());
  const extents = { height: size.y * 1.12, width: Math.max(size.x, size.z) * 1.12, targetY: box.min.y + size.y * 0.55 };
  const tris = (geo ? geo.index.count / 3 : 0) + (thick.geometry ? thick.geometry.attributes.position.count / 3 : 0);

  return {
    tree, ground, skel, geo, thick, P, extents, season: SEASON,
    cloud: P.showCloud ? new THREE.Points(new THREE.BufferGeometry().setFromPoints(skel.cloud), new THREE.PointsMaterial({ size: 0.04, color: 0xd06a6a })) : null,
    spots: dbgSpots, bloomSites: dbgBloom,
    stats: { ...stats, phases, ground: groundInfo, tris, growMs: tGrow, meshMs: tMesh, field: thick.geometry ? thick.geometry.userData.stats : null },
    dispose() {
      M.util.disposeObject(tree);
      M.util.disposeObject(ground);
    },
  };
}

/**
 * BARE EARTH — the product's failure state. The island's own form and nothing
 * else: no grass, no stones, no tree.
 *
 * Why it is this and not a seed, a sprout or a stunted tree (Taste): A FAILURE MUST
 * NEVER BE DRAWN AS A DEFICIENCY IN THE SITE. When a big site times out, the site
 * has not failed — we have; a sad little plant would say "there was too little here
 * to grow anything" about exactly the richest sites on the web. And why it is BARE:
 * terrain is measured too, so an empty island wearing a lawn and its usual stones
 * fabricates data that was never obtained — the same lie, told more quietly. Strip
 * everything unmeasured and what is left, honestly, is the stage and not the content.
 *
 * It must be unmistakable from a SUCCESSFUL bare tree (info.cern.ch: a sculptural
 * leafless tree on dormant turf with stones). That tree has turf AND stones AND a
 * trunk; this has none of the three. That separation is the acceptance test.
 *
 * Always the day state and the default soil: no background was measured either.
 */
export function growEarth(M, q, env) {
  const { P } = resolveParams(q);
  const ground = new THREE.Group();
  const terrain = {};
  // OUR earth: the soil of a successful island, not a different substance. The first
  // version used the summer soil undarkened and came out a quarter lighter and twice
  // as chromatic as the soil under a successful bare tree — "the hue of a baked
  // potato". This is halfway between the summer and the dormant soil, which is the
  // family every successful island's soil already lives in.
  for (const k of Object.keys(NORMAL_TERRAIN)) {
    terrain[k] = gradeColor(new THREE.Color(NORMAL_TERRAIN[k]).lerp(new THREE.Color(DORMANT_TERRAIN[k]), 0.55).multiplyScalar(0.86), env.ENV.ground);
  }
  ground.add(M.island.buildIsland(M.util.rng(P.seed * 13 + 505), { ...terrain, bareEarth: true }));
  const tree = new THREE.Group();   // empty on purpose: hosts treat every result alike
  return {
    tree, ground, earth: true, skel: null, stats: { earth: true }, season: null,
    // Framed on the ISLAND. Framed like a tree scene it is a small island under a
    // tree-shaped void — which draws the missing tree, the very thing this is not.
    extents: { height: 3.3, width: 5.6, targetY: -0.55 },
    dispose() { M.util.disposeObject(tree); M.util.disposeObject(ground); },
  };
}

/**
 * The frame a tree of this parameter set will need, known BEFORE it is grown —
 * from the crown volume it is asked to fill, not from its finished bounding box.
 * A host that frames on the finished box has to re-fit when the tree arrives,
 * which is a visible camera jump; and per-tree framing also hides the one thing
 * the thumbnail is meant to show, that trees differ in size and spread.
 */
export function nominalExtents(q) {
  const { P } = resolveParams(q);
  const top = P.cy + P.ry + 0.45;          // crown top, with a leaf cluster on it
  // The ISLAND is in the frame, whole. It is part of the object — a miniature on
  // its own ground — and the first wired frame cropped it at the turf, which turns
  // a diorama into a tree standing in a field. 1.5 of its 1.95 depth: the point
  // below is soil-coloured and may fall out of frame.
  const bottom = P.showGround ? -1.5 : -0.35;
  const width = Math.max(P.rx * 2 + 1.2, P.showGround ? 5.2 : 0);
  return { height: (top - bottom) * 1.08, width: width * 1.08, targetY: (top + bottom) / 2 };
}
