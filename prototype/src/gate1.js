// GATE 1 — the naked tree: structure AND surface.
//
// Zero foliage, on purpose. A bare HTML site already exposes the whole branch
// system, so if the tree is not beautiful without leaves, foliage would only be
// hiding the problem. This page exists to be judged.
//
// It carries its own lighting rig rather than the product's. The product rig
// was built to flatter a stylised tree under flat colour; a surfaced tree needs
// an environment to reflect and a key that rakes across the bark, or the
// material work is invisible.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const q = new URLSearchParams(location.search);

// Project modules are imported DYNAMICALLY with a cache-busting token.
//
// python's http.server serves ES modules with revalidation the browser is happy
// to skip, and a hard reload does not reliably re-fetch an already-imported
// module graph. Three consecutive edits once silently never reached the page —
// the node count coming back byte-identical was the only clue. Pass `&v=2`,
// `&v=3` ... while iterating and the page cannot lie to you.
const V = q.get('v');
const bust = V ? `?v=${encodeURIComponent(V)}` : '';
const { rng } = await import(`./util.js${bust}`);
const { buildSkeleton } = await import(`./branching.js${bust}`);
const { buildLimbs } = await import(`./limbmesh.js${bust}`);
const { makeBarkMaterial } = await import(`./bark.js${bust}`);
const { buildThickWood } = await import(`./woodsdf.js${bust}`);
const { buildLeaves, leafAttachments } = await import(`./leaves.js${bust}`);
const { buildFlowers, buildFruit, chooseBloomSites, chooseGrammar, BLOOM_GRAMMARS, LEGACY_GRAMMAR, BLOOM_FOLIAGE, foliageScales, foliageContrast, buildBuds, buildBerries, chooseFruitSites, bloomExclusion } = await import(`./flowers.js${bust}`);
const { buildIsland, buildGrass } = await import(`./island.js${bust}`);
const { makeRenderer, fitCamera } = await import(`./viewer.js${bust}`);

// --- structure presets -------------------------------------------------------
// The two states the concept rests on. They are different ARCHITECTURE, not one
// tree at two densities: bare is the whole skeleton on display and gets MORE
// structure; sparse is a tree wearing few leaves and is the BROADEST in the set
// — few limbs held wide read as chosen, held narrow and high they read as
// starved. See docs/TREE-SYSTEM.md.
//
// minStub is 0.3 (about two segments) for both. The committed Gate 1 URLs said
// `minStub=5`, but that parameter was never wired into this page at the time,
// so it was silently ignored and the reviewed trees were pruned at the default.
// These presets reproduce the trees that were actually judged.
const PRESETS = {
  // CHUNKY, to the revised Gate 1 (references/tree-style/README.md): 4-5 orders,
  // limbs individually readable to the tip, never a wire haze; every child
  // 0.70-0.80 x its parent; a bare silhouette that reads as a deliberate
  // sculptural object at 140px. Crown MASS is no longer this gate's job — on the
  // human's references it comes from clustered foliage, not from twig density.
  //
  // Taste's width rule still holds: nothing narrow, width roughly constant,
  // density is what varies; buy air with width, never by flattening.
  bare: {
    rx: 2.9, ry: 2.15, cy: 4.15, trunkMin: 8,
    c1: 300, k1: 4.6, c2: 700, k2: 2.4, i2: 9, minStub: 0.62,
    trunk: 0.31,
  },
  sparse: {
    rx: 2.9, ry: 2.05, cy: 3.95, trunkMin: 7,
    c1: 170, k1: 6.0, c2: 220, k2: 3.6, i2: 9, minStub: 0.62,
    trunk: 0.23,
  },
};
const preset = PRESETS[q.get('preset')] || PRESETS.bare;
const num = (k, d) => (q.has(k) ? parseFloat(q.get(k)) : (k in preset ? preset[k] : d));

// Every knob is a query parameter so the look can be iterated without edits.
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

const canvas = document.getElementById('scene');
const renderer = makeRenderer(canvas);
const TM = { neutral: THREE.NeutralToneMapping, aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping };
// tone mapping is part of the environment state; set once ENV is known
const uniforms = { time: { value: 0 } };

// --- environment states ------------------------------------------------------
// An environment is an ART-DIRECTED STATE, not a sampled hex value. Translating
// a dark website's ground colour literally into a dark scene gives muddy gloom:
// a dark website does not mean a dark tree. Every value below moves together —
// sky, key, fill, rim, image-based light, exposure — because that is what makes
// it a lighting state rather than a background swap.
//
// NIGHT is "moonlit diorama, not brightness slider at 20%". The tree stays
// properly exposed; what says night is COLOUR (a cool key, an indigo sky),
// DIRECTION (the moon is a three-quarter backlight, so every limb carries a
// silver edge and shadows fall toward the viewer) and CONTRAST (a high
// key-to-fill ratio with shadows that are deep blue, never black). That is how
// day-for-night has always been shot, and it is why it reads as night rather
// than as an underexposed afternoon.
const ENVS = {
  // DAY: soft, even light with gentle occlusion and no harsh shadow — the
  // reference's lighting, and the right light for a matte clay surface. The
  // rig this replaces raked a hard key across the trunk to bring out fissured
  // bark; with broad sculpted grooves that just made hard terminator lines.
  // Most of the light is now the environment, the key only shapes, and a warm
  // fill from the camera side keeps the shadow side luminous rather than grey.
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
  // So: the key comes down and CONTRAST does more of the work; the pool is
  // tighter, leaving more of the island in shadow; the ambient drops so the
  // trunk has a real shadow side; and the turf and foliage carry less light of
  // their own. `?night=a|b|c` is three points on that range, brightest first,
  // so the choice is a pick rather than a guess. The two documented failures
  // bound it: a black cut-out on a bright card at one end, this rejected
  // near-daylight version at the other.
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
const ENV = ENVS[q.get('envstate')] || ENVS.day;
renderer.toneMappingExposure = ENV.exposure * P.exposure;
renderer.toneMapping = TM[q.get('tm') || ENV.tone] ?? THREE.NeutralToneMapping;

function skyDome(radius, withGround) {
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
const dirOf = (a) => new THREE.Vector3(...a).normalize();

// Grade a ground colour for the environment state: drain saturation toward its
// own luminance, pull it toward the state's tint, drop its value.
function gradeColor(c, G) {
  if (!G) return c;
  const l = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
  c.lerp(new THREE.Color(l, l, l), 1 - G.sat);
  c.lerp(new THREE.Color(G.tint).multiplyScalar(l * 1.4), G.tintAmt);
  return c.multiplyScalar(G.value);
}
const gradeGround = (hex) => gradeColor(new THREE.Color(hex), ENV.ground);

// Image-based light. Without an environment a rough dielectric has nothing to
// reflect and every shadowed surface falls to the same dead value. The env
// carries a soft glow in the key direction so the ambient has a direction too.
let envTex;
{
  const envScene = new THREE.Scene();
  envScene.add(skyDome(50, true));
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(ENV.glow.size, 24, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(ENV.glow.color).multiplyScalar(ENV.glow.power), toneMapped: false })
  );
  glow.position.copy(dirOf(ENV.glow.dir)).multiplyScalar(42);
  envScene.add(glow);
  const pm = new THREE.PMREMGenerator(renderer);
  envTex = pm.fromScene(envScene, 0.03).texture;
  pm.dispose();
}

const scene = new THREE.Scene();
scene.add(skyDome(60, false));
scene.environment = envTex;
scene.environmentIntensity = ENV.env * (P.env / 0.85);

// Key. By day it rakes across the trunk from the side — bark relief is only
// visible under grazing light, and a frontal key flattens it completely.
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

for (const L of [ENV.fill, ENV.rim]) {
  if (!L) continue;
  const d = new THREE.DirectionalLight(L.color, L.intensity);
  d.position.copy(dirOf(L.dir)).multiplyScalar(12);
  scene.add(d);
}

// --- build -------------------------------------------------------------------
const t0 = performance.now();
const r = rng(P.seed);
const skel = buildSkeleton(r, {
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

const t1 = performance.now();
const DEBUG_LIMBS = q.get('debug') === 'limbs';
// Thick wood is an implicit surface (smooth-blended unions, flowing buttress);
// thin wood stays swept tubes and picks up where the field stops. `sdf=0` falls
// back to tubes everywhere, for comparison.
const useField = q.get('sdf') !== '0';
const thick = useField ? buildThickWood(skel.limbs, r, { voxel: num('voxel', 0.026) }) : { geometry: null, cuts: new Map() };
const geo = buildLimbs(skel.limbs, r, { debugColors: DEBUG_LIMBS, cuts: thick.cuts });
const tMesh = performance.now() - t1;

const bark = DEBUG_LIMBS
  ? new THREE.MeshBasicMaterial({ vertexColors: true })
  : P.flat
  ? new THREE.MeshStandardMaterial({ color: 0x6b5443, roughness: 0.82, metalness: 0 })
  : makeBarkMaterial();
const tree = new THREE.Group();
for (const gm of [geo, thick.geometry]) {
  if (!gm) continue;
  const m = new THREE.Mesh(gm, bark);
  m.castShadow = true;
  m.receiveShadow = true;
  tree.add(m);
}
// GATE 2 — foliage, as authored clusters on the judged structure. Off on the
// Gate 1 page (the naked tree is still its own test); gate2.html turns it on.
const LEAVES = q.get('leaves') ?? window.__LEAVES_DEFAULT ?? '0';
// WINTER (ruling L8): leafless, the scene dormant with it, and the website's
// colour carried by BUDS — or by persistent BERRIES where the site has the fruit
// trait. `?season=winter`, `?winter=buds|berries` (default follows `?fruit=1`).
const WINTER = q.get('season') === 'winter';
let leafStats = null, flowerStats = null, fruitStats = null, winterStats = null, dbgSpots = null, dbgBloom = null, contrastStats = null;
if (WINTER) {
  const attach = { spacing: num('leafSpacing', 0.4), maxRadius: num('leafMaxR', 0.12), outerFraction: num('leafOuter', 0.78) };
  const spots = leafAttachments(skel.limbs, r, attach);
  const hexq = (k, d) => (q.has(k) ? parseInt(q.get(k).replace('#', ''), 16) : d);
  const bloomGrade = ENV.bloom ? (c) => gradeColor(c, ENV.bloom) : null;
  const carrier = q.get('winter') ?? (q.get('fruit') === '1' ? 'berries' : 'buds');
  const w = carrier === 'berries'
    ? buildBerries(spots, rng(P.seed * 11 + 303), { color: hexq('fruitc', hexq('fc', 0xd8452f)), grade: bloomGrade, fraction: num('berryFrac', 0.42), size: num('berrySize', 1) })
    : buildBuds(spots, rng(P.seed * 7 + 101), { primary: hexq('fc', 0xf7a6b8), secondary: q.has('fc2') ? hexq('fc2', 0) : null, grade: bloomGrade, size: num('budSize', 1) });
  tree.add(w.group);
  winterStats = w.stats;
} else if (LEAVES !== '0') {
  // Order matters. Attachment points first (same RNG draws as before, so no leaf
  // moves); then WHICH of them flower, on a separate stream; then the leaves,
  // which need to know, because a flowering twig carries a smaller leaf cluster.
  const attach = { spacing: num('leafSpacing', 0.4), maxRadius: num('leafMaxR', 0.12), outerFraction: num('leafOuter', 0.78) };
  const spots = leafAttachments(skel.limbs, r, attach);
  const FLOWERS = q.get('flowers') ?? 'none';
  // The bloom GRAMMAR is not in the DNA (ruling L1): it is chosen from the
  // grammars compatible with the morphology, by the seed, on its own stream.
  // `?grammar=` overrides for debugging; `?form=` and the first names still resolve.
  const askedGrammar = q.get('grammar') ?? q.get('form');
  const GRAMMAR = BLOOM_GRAMMARS.includes(askedGrammar) ? askedGrammar
    : (LEGACY_GRAMMAR[askedGrammar] ?? chooseGrammar(q.get('morphology') ?? 'broad', P.seed));
  const flowerRng = rng(P.seed * 7 + 101);
  // L11: fruit is planned FIRST (low, on older wood), and the bloom keeps off the
  // twigs around it. Its own stream, so fruit never re-rolls a flower.
  const FRUIT = q.get('fruit') === '1';
  const fruitRng = rng(P.seed * 11 + 303);
  const fruitSites = FRUIT ? chooseFruitSites(spots, fruitRng, { sites: num('fruitSites', 22) }) : [];
  const keepOff = FRUIT && FLOWERS !== 'none' ? bloomExclusion(spots, fruitSites, num('fruitClear', 0.75)) : null;
  const bloomSites = FLOWERS === 'none' ? [] : chooseBloomSites(spots, flowerRng, { amount: FLOWERS, fraction: q.has('bloom') ? num('bloom', 0.33) : null, exclude: keepOff });

  // L5: the amount decides what the flowering twigs — and their neighbours —
  // WEAR. Every number in the table can be overridden from the URL for tuning.
  const folT = BLOOM_FOLIAGE[bloomSites.length ? FLOWERS : 'none'] ?? BLOOM_FOLIAGE.medium;
  const FOL = {
    ...folT,
    atBloom: num('leafAtBloom', folT.atBloom), nearTo: num('leafNear', folT.nearTo),
    nearRadius: num('leafNearR', folT.nearRadius), elsewhere: num('leafElsewhere', folT.elsewhere),
  };

  const hexq = (k, d) => (q.has(k) ? parseInt(q.get(k).replace('#', ''), 16) : d);
  const bloomGrade = ENV.bloom ? (c) => gradeColor(c, ENV.bloom) : null;
  const leafGrade = ENV.foliage ? (c) => gradeColor(c, ENV.foliage) : null;
  // WARNING FOR ANYONE JUDGING COLOUR FROM A URL: `?fc=` and `?fc2=` go straight to
  // the renderer and BYPASS conditionFlower in analysis/lib/mapping.js (the petal
  // lightness floor, the computed centre). No real site can deliver, say, a raw
  // #0b0d40 petal — so a URL-driven render is NOT representative of a real tree
  // unless the colours passed are already-conditioned ones (e.g. github arrives as
  // petal #1b20a0 + centre #989ad5). Lead reached a false conclusion this way once.
  const FC = hexq('fc', 0xf7a6b8);
  const FC2 = q.has('fc2') ? hexq('fc2', 0xe87b92) : (q.has('fc') ? null : 0xe87b92);
  // L6: the local stage. `?contrast=0` turns it off, for the A/B.
  const contrast = foliageContrast(spots, bloomSites, {
    primary: FC, secondary: FC2, pale: q.has('pale') ? num('pale', 0) : null, lift: num('lift', 0), grade: bloomGrade,
    strength: num('contrast', 1), radius: num('contrastR', 1.35),
  });
  contrastStats = { target: +contrast.target.toFixed(2), flowerL: contrast.flowerL, foliageL: contrast.foliageL };

  const lv = buildLeaves(skel.limbs, r, {
    spots,
    cluster: {
      leaves: num('perCluster', 17), leafLength: num('leafLen', 0.5), soft: num('soft', 0.62),
      grade: leafGrade,
    },
    siteValue: contrast.scale,
    siteScale: foliageScales(spots, bloomSites, FOL), shrink: new Set(bloomSites.map((i) => spots[i])),
    debugShrink: q.get('debug') === 'bloomleaves',
  });
  tree.add(lv.group);
  leafStats = lv.stats;
  dbgSpots = spots; dbgBloom = bloomSites;
  if (q.get('leafHide') === '1') lv.group.visible = false;   // debug: see where the bloom actually is

  // Flowers and fruit: their own cluster types, on the leaves' attachment points.
  let taken = null;
  if (bloomSites.length) {
    const fl = buildFlowers(spots, flowerRng, {
      sites: bloomSites,
      grammar: GRAMMAR,
      primary: FC, secondary: FC2,
      size: num('flowerSize', 1), pale: q.has('pale') ? num('pale', 0) : null, lift: num('lift', 0), grade: bloomGrade,
      eyeShape: q.get('eye') === 'round' ? 'round' : 'star', eyeWarm: q.has('eyeWarm') ? num('eyeWarm', 0.14) : null,
      proud: 0.5 * FOL.atBloom + 0.07,   // stands off its OWN leaf tuft; this is not a move, the tuft shrank
    });
    tree.add(fl.group);
    taken = fl.taken;
    flowerStats = fl.stats;
  }
  if (FRUIT) {
    const fr = buildFruit(spots, fruitRng, {
      chosen: fruitSites,
      color: hexq('fruitc', 0xd8452f), sites: num('fruitSites', 22), radius: num('fruitR', 0.16),
      grade: bloomGrade,
    });
    tree.add(fr.group);
    fruitStats = fr.stats;
  }
}
scene.add(tree);

if (P.showGround) {
  // The product's NORMAL terrain palette, graded for the environment state — and,
  // in winter, taken dormant first: "if the tree goes dormant, the scene goes
  // dormant with it" (TASTE). V0's DORMANT palette (dna.js), at the dormancy V0
  // uses under a LEAFLESS tree (0.82) — this winter tree is leafless, and leafless
  // wood in living turf reads as death rather than as winter.
  const NORMAL_T = { lo: 0x5e9e37, mid: 0x81c246, hi: 0xa8d95c, soilHi: 0xa07b58, soilLo: 0x6a5663 };
  const DORMANT_T = { lo: 0x6b6f54, mid: 0x838661, hi: 0x9d9d79, soilHi: 0x8a7d6d, soilLo: 0x5d5859 };
  const dormancy = WINTER ? num('dormancy', 0.82) : 0;
  const T = {};
  for (const k of Object.keys(NORMAL_T)) T[k] = new THREE.Color(NORMAL_T[k]).lerp(new THREE.Color(DORMANT_T[k]), dormancy).getHex();
  const terrain = {
    lo: gradeGround(T.lo), mid: gradeGround(T.mid), hi: gradeGround(T.hi),
    soilHi: gradeGround(T.soilHi), soilLo: gradeGround(T.soilLo),
  };
  scene.add(buildIsland(r, terrain));
  scene.add(buildGrass(r, uniforms, { ...terrain, detail: 0.6 }));
}
if (P.showCloud) {
  const g = new THREE.BufferGeometry().setFromPoints(skel.cloud);
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.04, color: 0xd06a6a })));
}

// --- camera: reproducible shots ------------------------------------------------
// Judged at two distances or not judged at all. A tree that holds up in the hero
// shot and falls apart at the trunk is a thumbnail, not a tree.
const box = new THREE.Box3().setFromObject(tree);
const size = box.getSize(new THREE.Vector3());
const extents = { height: size.y * 1.12, width: Math.max(size.x, size.z) * 1.12, targetY: box.min.y + size.y * 0.55 };

// First real fork: follow the thickest child up from the root.
let fork = skel.nodes.find((n) => !n.parent);
while (fork.children.length === 1) fork = fork.children[0];

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
const controls = new OrbitControls(camera, canvas);
const shot = q.get('shot') || 'hero';
const SHOTS = {
  hero: { pos: [7.4, 4.6, 9.2], target: [0, extents.targetY, 0], fit: true },
  trunk: { pos: [1.55, 1.15, 2.15], target: [0, 0.95, 0], fov: 30 },
  fork: { pos: [fork.pos.x + 1.9, fork.pos.y + 0.35, fork.pos.z + 2.3], target: [fork.pos.x, fork.pos.y + 0.25, fork.pos.z], fov: 30 },
  crown: { pos: [3.4, 4.9, 4.2], target: [0.5, 4.5, 0], fov: 30 },
};
const SH = SHOTS[shot] || SHOTS.hero;
camera.position.set(...SH.pos);
controls.target.set(...SH.target);
if (SH.fov) camera.fov = SH.fov;
const DIST0 = camera.position.length();
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 0.6;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI * 0.52;
controls.update();

// --- stats -----------------------------------------------------------------
const tris = (geo ? geo.index.count / 3 : 0) + (thick.geometry ? thick.geometry.attributes.position.count / 3 : 0);
const forks = skel.nodes.filter((n) => n.children.length > 1).length;
const hud = document.getElementById('hud');
hud.textContent =
  `${q.get('preset') || 'bare'} · seed ${P.seed} · a=${P.alpha} · shot ${shot}\n` +
  `${skel.nodes.length} nodes · ${skel.limbs.length} limbs · ${forks} forks\n` +
  `${(tris / 1000).toFixed(0)}k tri · grow ${tGrow.toFixed(0)}ms · mesh ${tMesh.toFixed(0)}ms` +
  (thick.geometry ? `\nfield ${JSON.stringify(thick.geometry.userData.stats)}` : '') +
  (leafStats ? `\nleaves ${JSON.stringify(leafStats)}` : '') +
  (flowerStats ? `\nflowers ${JSON.stringify(flowerStats)}` : '') +
  (fruitStats ? `\nfruit ${JSON.stringify(fruitStats)}` : '') +
  (winterStats ? `\nwinter ${JSON.stringify(winterStats)}` : '');
if (q.get('hud') === '0') hud.style.display = 'none';

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) ||
      canvas.height !== Math.round(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    if (SH.fit) fitCamera(camera, extents, w / h, DIST0);
    else { camera.aspect = w / h; camera.updateProjectionMatrix(); }
  }
}

const clock = new THREE.Clock();
function tick() {
  uniforms.time.value = clock.getElapsedTime();
  resize();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
document.body.classList.add('ready');
window.__gate1 = { skel, geo, thick, tris, leafStats, flowerStats, fruitStats, spots: dbgSpots, bloomSites: dbgBloom, contrastStats, winterStats, P, camera, controls, scene, renderer,
  orders: Math.max(...skel.limbs.map((l) => l.depth)) + 1,
  primaries: skel.limbs.filter((l) => l.depth === 1).length };
