# VISUAL-SYSTEM.md

> **Status: UNRESOLVED.**
> There is no visual system yet. This document is a structured place to put one.
>
> Every section below is an empty slot. Do **not** fill these in unilaterally — art
> direction is exactly the kind of subjective, taste-driven question that
> [AGENTS.md](../AGENTS.md) R7 says must be flagged for a human rather than decided by
> an agent. Propose, show, ask. Do not quietly establish a look by shipping one.

What we know so far is only this: the tree should read as **cute** and **visually
polished**. That is a feeling, not a system. Everything below is how we turn it into one.

---

## First prototype — EXPERIMENT

**Status: EXPERIMENT. Nothing here is approved, and none of it is DECIDED.**

`prototype/` contains one hand-authored tree on a small island, built purely to test
whether this look is achievable in a browser. It is an art-direction probe, not a
proposal, and it must not be read as the visual system. Everything below is a record
of what was tried and what it taught us — it is deliberately written as findings, not
as rules. Promotion of any of it is a human call (AGENTS.md R7).

### Approach attempted

- three.js, no framework, no build step, no post-processing. Geometry, vertex colour
  and three lights only. The look should survive being ported elsewhere later.
- Foliage as ~19,000 instanced cupped leaf cards scattered over ~25 overlapping
  ellipsoid "lobes" that sit on the real branch tips, rather than spheres of leaf
  texture.
- Grass as ~30,000 instanced blades, not a green surface.
- Blossoms as small five-petal meshes grown in clusters through the canopy.
- One key light, a cool rim, a hemisphere fill and a dim shadowless front fill.

### What appears to work

- **Lobe-scattered instanced cards.** Layering, irregular edges and real depth, at
  ~640k triangles in 19 draw calls. This answers the "not three green spheres"
  requirement convincingly.
- **Orienting each leaf's normal outward from its lobe.** This is what makes the
  crown shade as one soft volume instead of a glitter of separately-lit cards. It is
  probably the single most important technique found.
- **Thinning the crown's underside.** Dropping most downward-facing leaves is what
  lets the trunk and branches read. Without it the tree is a shrub on a stick.
- **Instanced grass blades.** Far more charm than a textured surface, and cheap.
- **A narrow field of view (~30°).** The main lever for the miniature-diorama feel.
- **Irregular, non-circular limb cross-sections with swelling junctions.** Keeps the
  trunk from reading as a cylinder or as intersecting tubes.

### A second pass on three of the weaknesses — EXPERIMENT

**Status: EXPERIMENT, and explicitly waiting on human taste (AGENTS.md R7).** Three
weaknesses recorded above — the cauliflower crown, the dark flecks at the silhouette
and the missing ground contact — were worked on in a later pass, and have been taken
out of the unresolved list below. [TREE-SYSTEM.md](TREE-SYSTEM.md) has the geometry
side and the full list of what changed; this is what it taught us about *look*.

- **The dark flecks were not a lighting problem.** They were blossoms that jitter had
  thrown clear of the leaf shell, hanging alone against the sky with no canopy around
  them. Keeping foliage nested fixed most of it; the emissive floor only ever hid it.
- **What remains of the problem is a real constraint on the lighting rig.** With a
  fixed key, a fixed rim and an orbiting camera, any surface whose normal points
  horizontally outward is unlit at *some* azimuth. The fix used is to bias outward
  normals skyward — strongly for blossoms, gently and only on the outer shell for
  leaves — because a sky-facing normal catches the key and the hemisphere from every
  direction. This costs a little of the canopy's volume shading, which is the
  technique we most want to keep, so it was applied only where it was needed.
- **Contact occlusion is two effects, not one.** A tight dark crevice reads as a
  painted ring on its own; a wide soft pool reads as a second cast shadow on its own.
  Together they read as occlusion. Both are painted into vertex colour — no AO pass,
  no post-processing.
- **Opening the crown for air also flattens it.** The lobe spread that creates gaps is
  the same thing that was doming the silhouette, so the two have to be retuned
  together.

**Still needs a human to look at it:**

- Whether the crown is now correctly airy or has gone scruffy. It is deliberately
  looser and less polished than it was.
- Whether the contact shading reads as occlusion or as dirt.

### What remains unresolved

- Everything in the sections below is still **OPEN**. The prototype demonstrates one
  point in the space; it does not define the space.
- Whether green foliage plus pink blossom is the right palette at all, or just the
  first thing tried.
- Soil colour is muddy and reads heavy at the bottom of the frame, and its flat-shaded
  facets read as a light/dark patchwork from low angles.
- A broad ambient darkening of the turf under the whole canopy footprint (as opposed to
  just at the trunk) was considered and **not** tried, to avoid making the bottom of
  the frame heavier still. Worth testing once the soil colour is resolved.
- Wind sway and drifting petals are in, and **Motion is still OPEN** — they are an
  experiment, not an approved decision.
- Untested on mobile, and not profiled on low-end hardware.

### What parameterising the tree taught us about the look — EXPERIMENT

**Status: EXPERIMENT, and most of it is waiting on human taste (R7).** The renderer now
varies with [BOTANICAL-DNA.md](BOTANICAL-DNA.md); the per-field results live there and
the geometry in [TREE-SYSTEM.md](TREE-SYSTEM.md). This is what it taught about *look*.

- **Colour is the only difference that reliably survives a thumbnail.** Autumn is
  unmistakable at social-feed size. So is a dark background. Every structural
  difference — branch count, crown density, even fairly large changes in foliage
  amount — is weaker than a hue shift, and some vanish entirely. If the project wants
  sites to look different at a glance, colour is where that gets spent.
- **Flower colour is legible in proportion to its contrast against the foliage green,
  not to how much of it there is.** A brand red at `medium` reads instantly; a brand
  blue at `abundant` disappears at the same size. This is the first real evidence
  bearing on **D5**, and it says flowers-as-carrier is a partial answer rather than a
  wrong one. The obvious follow-up — letting foliage hue shift away from an accent that
  is too close to it — is a real art-direction decision and is **not** taken here.
- **A leafless tree is a different art-direction problem from a foliated one.** With no
  canopy, everything the leaves were hiding becomes the subject: blunt limb ends read
  as amputation, and a branch structure that is perfectly adequate under leaves reads
  as bare and thin without them. BARE needed finer tips and two generations of
  ramification before it stopped looking like damage. Whether it now looks *beautiful*,
  which the concept requires, is not something an agent should answer.
- **The lighting rig does not follow the background.** The one dark-mode site in the
  corpus renders a brightly day-lit tree against a night sky. It is the most
  distinctive tree in the set and arguably the best-looking one, and it is also
  internally inconsistent. Whether the key, rim and hemisphere should shift with the
  site's ground colour is an open art-direction question — appealing, not free, and a
  human's to answer.
- **The background gradient is art direction, not analysis.** The contract supplies one
  colour; a flat fill of it makes the island look pasted onto a wall, which the first
  pass already established. The given colour is therefore pulled a limited distance
  toward a fixed cool sky and a fixed warm ground, so the vertical warm/cool that lets
  the island sit is preserved while the colour stays recognisably the site's.

**Still needs a human to look at it:**

- Is BARE beautiful, or does it still read as a dead tree?
- Do twelve trees from one family read as *one project* — or as one tree with settings?
- Is a blue-flowered or green-flowered tree charming or wrong? gov.uk is the test case.

### Bark and light: why the tree read as low-poly — EXPERIMENT

**Status: EXPERIMENT, waiting on Taste and the human.** The human's verdict on the Gate 1
tree was that it still read as low-poly. The cause was not triangle count: form had been
done and surface deliberately deferred, and **an unsurfaced tree looks exactly like a
low-poly asset however good its structure is.** "Low-poly" is mostly a surface reading.

**Approach: procedural bark evaluated in limb-local space** (`prototype/src/bark.js`) —
around the limb's axis in world units, along it in arc length. Chosen on merit over a
baked texture set: the two classic bark-texture failures are a seam up the back of every
limb and a tile repeating up the trunk, and a 3D function of limb-local coordinates has
neither *by construction*. The grain follows the limb, and scale holds from trunk to twig
with no texel-density bookkeeping. Height drives normals (forward differences over the
pixel footprint), cavity, roughness and colour; every layer fades at its own pixel
footprint so the same material serves the hero shot and the close-up without sparkling.

**Four failures on the way, each a recognisable man-made thing — worth knowing, because
crisp mathematical primitives read as whatever they most resemble:**

| Attempt | Read as | Why |
| --- | --- | --- |
| Ridged value-noise contours | melted wax | contour lines wander, vary wildly in width, and close into loops; bark does none of that |
| Stretched Voronoi, soft wide ramp | reptile scales | every plate a glossy pillow |
| Stretched Voronoi, hard narrow ramp | planks with ink outlines | straight Voronoi edges are vector lines; flat tops are boards |
| Regular `fract` breaks along ridges | woven rope | evenly spaced breaks are ladder rungs |

**What worked:** long interlocking Voronoi ridges (9:1 stretch), *warped at three scales*
so fissure edges are ragged; a V-shaped furrow with visible sloped walls; warm inner bark
on those walls (without it fissures are painted black lines); ridge breaks placed by noise
running along each ridge, slanted, on only some ridges; lumpy-and-fibrous ridge tops; pale
lichen in patches on old wood; smooth paler bark on thin limbs; specular cut to 30%
(bark is porous — at default F0 it has a varnish sheen). Once the tree was lit from
outside (see the winding bug in TREE-SYSTEM.md), furrow shadow had to come from the
normals rather than painted cavity, or the trunk turned to zebra stripes.

**Light.** Gate 1 carries its own rig: an image-based environment (a sky dome with a warm
soft sun, through PMREM) plus a key that *rakes* across the trunk. Bark relief is only
visible under grazing light, and without an environment every shadowed surface falls to
the same dead value. ACES tone mapping. The product rig is untouched.

**Still needs a human or Taste:**

- Is this the right bark — furrowed grey-brown — or the wrong species for the project?
- Furrow centre-lines are still slightly inked; young wood is plain, smooth tan.
- The stylised island and grass now visibly mismatch the tree's fidelity.
- Whether `botanicalState` should shift the bark palette (winter greyer, autumn warmer).

### Environment states, and a first NIGHT — EXPERIMENT

**Status: EXPERIMENT. Taste is specifying the environment set; this is a prototype for it
to judge, not a decision.** The human's second defect after "low-poly": the scene
environment was a *literal colour translation* — a dark site's ground colour became a dark
scene background, and the result was muddy gloom. **A dark website does not mean a dark
tree.** An environment is an art-directed STATE in which sky, key, fill, rim, image-based
light, ground response and exposure move together (`ENVS` in `prototype/src/gate1.js`,
`?envstate=day|night`). The brief for night: *moonlit diorama, not brightness slider at 20%.*

**Night comes from colour, direction and contrast — never from low exposure.** The tree
stays properly exposed, as in day-for-night cinematography. Three attempts; the two
failures are kept in `references/experiments/gate1-surface-2026-09-20/night-FAILED-*`:

1. **Moon as a backlight → a black cut-out on a bright blue card.** Rough dark bark
   returns almost nothing to the camera, so a back-lit tree is just a silhouette; and the
   sky was brighter than the subject. *The sky must sit darker than the lit tree.*
2. **Saturated blue key → black wood with a wet blue sheen.** Warm-brown bark has almost
   no blue reflectance, so a strongly coloured key is simply absorbed. Real moonlight is
   near-white (reflected sunlight); its blueness is perceptual. **The key stays near-white;
   the night colour is carried by the sky, the shadows and the ground.**
3. **What works:** a gently cool, strong moon from the front quarter, as a soft-edged SPOT
   so light pools on the island (the "diorama"); a second cool light from behind for the
   silver edge a real backlit moon would give smoother bark; a faint warm kicker so the
   wood stays wood rather than slate; a dark restrained sky, lighter at the horizon.

**The first night was rejected by the human: "too much light." (2026-09-20)** The rule
above was right and had been over-applied. "The tree stays properly exposed" had quietly
become "the tree is lit at daylight level in a blue room" — the key never came down at
all. Day-for-night still has FALLOFF: what makes a moonlit subject readable is that
everything around it is darker, not that the subject sits at daytime values. The correction
is parameters only, nothing structural: key down and contrast doing more of the work, a
tighter pool so more of the island is in shadow, less image-based ambient so the trunk has
a real shadow side, and turf and foliage carrying less light of their own. Three points on
that range are kept for Taste and the human to pick from (`?night=a|b|c`, `b` the default
until someone chooses), in `references/experiments/night-levels-2026-09-20/`. Mean frame
luminance, rejected → a / b / c: 42.8 → 25.7 / 18.5 / 13.4. All three still resolve at
140px, leafy and bare; `c` is the floor — below it the crown stops reading as green and the
first documented failure (black cut-out) is next. **Status: EXPERIMENT, awaiting a pick.**

**Ground response cannot come from the lights.** Turf lit at all by a cool key stays
daytime green and becomes the brightest thing in the frame. It needs its own per-state
grade — saturation drained, value dropped, pulled toward the state's tint — through the
same terrain-palette mechanism dormancy uses. Over-graded it reads as FROST, which is a
season, not a time of day.

**On designing materials for two lighting conditions (asked by Lead):** physically-based
materials are relightable for free — the bark needed zero changes for night. What breaks
is anything with light BAKED IN. The V0 foliage and blossom materials carry day-tuned
emissive floors, which will glow at night. At Gate 2, every emissive or baked-light term
must scale with the environment state, and foliage/flowers/fruit need a per-state grade
like the ground's. Cheap if designed in; a retrofit otherwise.

### Surface language changed: clay, not bark — EXPERIMENT

**Status: EXPERIMENT, to the human's direction (2026-09-20, with a reference; the
principle is in TASTE.md). Supersedes the detailed-bark section above.** Renders:
`references/experiments/gate1-clay-2026-09-20/`.

The detailed procedural bark fixed the low-poly reading and was then rejected as the wrong
direction: *"this is the sort of artstyle I want, not the detailed bark."* The target is a
warm light-tan trunk with only broad soft grooves, a smooth flowing buttress, matte
throughout — "clay or marzipan, never polished wood". **Form stays botanical; surface
simplifies.** Nothing structural was undone.

What that became, and why:

- **Grooves are sculpted, not textured.** Broad soft grooves are low-frequency enough to BE
  geometry, so they are real displacement shaded by true normals, and there is no bump map
  at all. A sculpted surface reads as clay; a texture of one reads as a texture.
- **No seam, no mirror, no tile — by construction.** Grooves are a sum of cosines at
  INTEGER frequencies around the limb (the ring closes exactly), with phases drifting along
  it (they wander and never repeat). The count comes from each limb's girth: fixed
  frequencies put nineteen grooves round a wrist-thick limb and aliased.
- **The material only tints** (`bark.js`): a deeper tone in the grooves, a slow drift of
  warmth so the tree is not one flat swatch, a deeper tone on thin wood so twigs hold
  against sky. **Zero specular** — roughness 1 alone still leaves a sheen, and that sheen is
  the "polished wood" being rejected.
- **Soft light still has to model.** The first clay render under "soft even light" was a
  featureless peach column: soft light needs MORE form to work with, not less. Grooves went
  deeper, the key came back up and round to the side, the fill came down. A pinker tan read
  as skin.
- **Smooth surfaces hide nothing, so the unions had to be rebuilt** — see TREE-SYSTEM.md.
  This was the largest consequence of the art-direction change.
- **Night needed no changes and got better.** Verified, not assumed: the light matte albedo
  takes moonlight as pale luminous wood, which fixes the "tree too dark" weakness the
  detailed bark had at night.

**Still needs Taste or the human:** the exact tan; whether grooves should be fewer and
broader still; twigs (now thin matte wires); and the island, which mismatches more than ever.

### Gate 2 — foliage as authored clusters — EXPERIMENT

**Status: EXPERIMENT, first pass, awaiting Taste.** `prototype/gate2.html` (the Gate 1
harness with foliage on). Renders, a true-size 140px sheet and the rejected first attempt:
`references/experiments/gate2-foliage-2026-09-20/`.

**The leaf CLUSTER is the unit** (`prototype/src/leaves.js`). Each leaf is a real modelled
teardrop — folded on its midrib, drooping, with its own one of three greens — and ~17 of
them form a cluster in a golden-angle spiral, instanced ~146 times onto limb tips and the
outer, thinner stretch of each limb. The two-distance rule is served by two separate
things: real leaf SHAPES give individual leaves up close, and shading normals bent toward
each cluster's outward direction make a cluster shade as one soft form at distance.

- **A rosette reads as its own plant.** The first attempt was narrow leaves splayed in a
  half-dome and read as agave on a tree. Leaves went broad (teardrop, width ≈ ⅔ length) and
  the spiral now runs past the horizontal and DOWN, so a cluster is a ball of leaves.
- **Bias shading normals skyward.** A leaf whose normal points at the ground catches
  nothing from a sky-lit scene and goes bottle-black; V0 found the same thing.
- **Geometric double-facing, never `DoubleSide`** — it flips back-face normals and back-lit
  leaves go black. Also inherited from V0.
- **No baked light, at all.** V0's foliage carried day-tuned emissive floors and would glow
  at night. This is plain matte albedo with specular killed, so it relights for free.
- **Foliage needs its own per-environment response, like the ground.** Under the moon,
  saturated green returns little light: the crown went heavy while the pale trunk glowed,
  and the crown must not be the darkest thing on the hero. A brightness multiplier fixed
  value but read as daylight lime in a dark room — night wants DESATURATION toward sage,
  which a multiplier cannot do, so leaf albedo is graded at build time. Taken all the way
  to silver it reads as frost, which is a season and not a time of day.
- **Generated, not Blender-authored — a reversal of my own earlier suggestion.** Headless
  Blender is procedural modelling in Python rather than JavaScript; the geometry is code
  either way, and the price is an export step, a loader and async assets. Blender earns its
  place when a PERSON sculpts a cluster, and `clusterSource` in `leaves.js` is the seam
  where a hand-made glTF would be swapped in.

**Measured at 140px:** day full, day sparse, night full and night sparse all resolve into a
crown MASS (the criterion that closes the gate); day/night are unmistakable, full/sparse
distinguishable by openness and visible limbs.

**Cost:** 146 clusters, 278k triangles, 4 draw calls, ~15 ms to build. Foliage is cheap;
the implicit-surface wood (~1.5–2.5 s) is still the whole performance problem.

**OPEN:** ~~no wind sway yet~~ (in — see *Wind on the new tree*); foliage is not wired to DNA (`foliage.state`/`density`,
`botanicalState` palettes); flowers and fruit — which carry the website's colour — are next;
cluster greens and leaf size are Taste's to judge against the actual board.

---

## Overall art direction

**OPEN.**

The one-line description of the look we are going for, and the two or three adjectives
that decide arguments.

- _unresolved_

---

## Tree aesthetic

**OPEN.**

What kind of tree this is as an object — toy-like, illustrative, diorama, miniature,
naturalistic, abstract. How stylized, and in which direction.

- _unresolved_

---

## Geometry language

**OPEN.**

The vocabulary of forms: low-poly, smooth, faceted, blobby, hand-modelled, procedural,
rounded, angular. Silhouette rules. How much detail, and where it is spent.

- _unresolved_

---

## Materials

**OPEN.**

Surface treatment: flat/unlit, toon-shaded, physically-based, matte, waxy, papery,
fabric, clay. Whether materials vary between trunk, foliage and flowers.

- _unresolved_

---

## Lighting

**OPEN.**

Lighting model and mood. Key/fill setup, softness, shadow treatment, time of day,
whether lighting is fixed or responds to the analysed website.

- _unresolved_

---

## Camera

**OPEN.**

Framing, lens character, perspective vs orthographic, default angle, whether the camera
moves, whether the user can move it.

- **A frame too narrow for the tree is answered by stepping BACK, never by a wider lens —
  EXPERIMENT (2026-09-21).** `fitCamera` used to fit with the lens alone, which is only safe in
  a roughly square frame; on a phone it opened to 72°, the one thing TASTE #1 names as the way to
  lose the miniature. The lens is now capped at what the SQUARE stage gives the tree, and the
  camera dollies instead. Square and wider frames are pixel-identical to before, by construction
  and by measurement (every pixel hashed at 1:1 and 16:9). A wide frame was never the problem:
  it is height-bound, so it carries the square stage's lens and the tree is exactly as tall in it.
  Evidence: `references/experiments/framing-2026-09-21/`.
- _otherwise unresolved_

---

## Environment / background

**OPEN.**

What surrounds the tree: void, gradient, sky, room, vignette, colour field. Whether the
background derives from the website or stays constant.

- _unresolved_

---

## Terrain / base

**OPEN**, with one principle now settled by evidence.

**Dormancy is a scene property, not a tree property.** A bare tree standing in vivid
summer turf reads as *dead*, not as *wintering* — leaflessness is judged against its
surroundings rather than on its own. When the tree goes dormant the ground goes with
it, including the stones: quieting only the turf promotes whatever is left at full
summer value to the brightest thing in a frame whose whole point is to be quiet.

Established by `taste` from live renders and implemented for the bare and winter
states. Full statement and its second-order corollary in
[TASTE.md](TASTE.md) — this is a pointer, not a second copy.

Whether the tree sits on anything at all — soil, a pot, a floating island, a disc, a
shadow, nothing. Closely tied to the same question in
[TREE-SYSTEM.md](TREE-SYSTEM.md) and listed as open in [PRODUCT.md](PRODUCT.md).

- _unresolved_

---

## Motion

**OPEN.**

Any movement: idle sway, wind, settling on appearance, entrance transition, hover
response. Note that *growth* animation is explicitly out of scope for V0 (DECISIONS D4)
— this section is about everything else.

- **Wind is in on the new tree — EXPERIMENT.** Three things about it are DECIDED, by ruling
  rather than by being built (`docs/briefs/WIND-AND-MOTION.md`): it is **ambient** — weather
  in the world, never a property of the website (W1); **the crown moves and the trunk does
  not** (W2); and **only what grows on the wood sways — the wood is rigid** (W3, the human:
  "leaves swaying is enough"). Its amplitude and speed are V0's numbers carried over and are
  still open. What building it taught is in *Wind on the new tree*, below.
- _otherwise unresolved_

---

## Colour treatment

**OPEN.**

How colour behaves globally: saturation range, value range, harmony rules, how much of
the frame the website's palette is allowed to occupy, and what keeps wildly different
palettes all looking like they belong to the same project.

Related: DECISIONS **D5** establishes that website colour must meaningfully influence
the tree, and records the **TENTATIVE** idea that flowers may be the primary carrier of
brand and accent colour. That idea is not settled and must not be treated as the
visual system.

- _unresolved_

---

## References

**OPEN.**

Point at what we actually like, with a sentence on *why* — the specific quality being
referenced, not just a link.

Reference material lives in [`references/`](../references/README.md):

- `references/inspiration/` — general inspiration and related projects
- `references/tree-style/` — specifically the 3D tree look we want
- `references/websites/` — example sites used to test the mapping
- `references/experiments/` — our own outputs and visual tests

Do not fabricate references or cite from memory. Only list things actually collected.

- **A low-poly cherry-blossom-tree-on-an-island render**, supplied by the human as the
  structure/composition/proportion benchmark for the first prototype. It has not been
  saved into `references/tree-style/` yet — **it should be**, so later agents can see
  what was actually being aimed at. Referenced for: canopy-to-island proportion, the
  crown overhanging its base, chunky stone placement, and the dark-trunk-against-bright-
  canopy contrast. It was explicitly a quality benchmark, not something to reproduce.

---

## Things to avoid

**OPEN.**

The anti-references. What would make this project feel generic, dated, cold, or like
everything else.

One entry exists already, inherited from DECISIONS **D3**:

- **Literal objects.** No cameras, food, laptops, or other content-derived props
  growing on the tree. The tree expresses visual design, never subject matter.

- _otherwise unresolved_

### Gate 2 — flowers and fruit, first pass — EXPERIMENT

`prototype/src/flowers.js`; renders and a fuller write-up in
`references/experiments/gate2-flowers-2026-09-20/`. Not wired to the DNA.

- **Flowers and fruit are cluster types on the leaves' own attachment points.** A flower
  that is not on a twig is confetti. Three forms built for Taste to choose between —
  `blossom` (corymb of open flowers), `magnolia` (large upright goblets), `wisteria` (bunches
  of hanging racemes). A form belongs to the tree; one tree carries one.
- **Value, not hue, is what carries an accent colour against foliage.** V0 found a cool
  accent vanishes against canopy green at any amount. Paling every petal toward its edge
  gives bloom a light value the green does not have, and the site's blue then reads at 140px
  *as given*. Raising the colour's lightness instead reads no better and is less the site's
  colour.
- **Bloom is chosen by a low-frequency field, top fraction taken** — drifts, not scatter, and
  an exact count.
- **A crown is a shell, so in projection bloom piles up at the rim** and every amount reads as
  a green tree in a pink wreath. Moving the bloom does not fix it (tried three times; hiding
  the leaves showed the bloom was already evenly spread). What helps is botanical: a twig that
  flowers carries a smaller leaf cluster. Improved, not solved — `abundant` is still rim-heavy
  from the hero angle.
- **Fruit is toy-scale on purpose** — V0's was invisible at any size — and hangs on the lower
  outside of the crown, off the flowering sites.

### Bloom system — L1 to L11, built against Lead's rulings — EXPERIMENT

Rulings: `docs/briefs/BLOOM-SYSTEM-RULINGS.md`. Code: `prototype/src/flowers.js`. Renders:
`references/experiments/bloom-{L5,L6,L8-winter,L11-composition,matrix}-2026-09-20/`.
**Every number here is a proposal; Taste owns sizes, counts, fractions and tones.**

- **Grammars, never species (L3); chosen by seed, not by DNA (L1).** `cluster`, `statement`,
  `pendant`. `chooseGrammar(morphology, seed)` = the grammars compatible with the morphology,
  indexed by a pure hash of the seed on its own stream — it never advances a shared RNG, so
  adding a grammar re-rolls nothing. Seeds 3 / 7 / 10 give three visibly different trees.
  `GRAMMAR_COMPAT.broad` lists all three **pending Taste's pendant × broad ruling**.
- **Bloom amount is a foliage relationship (L5) — this is what killed the wreath.** The wreath
  was occlusion, not placement. Three relationships, not one number scaled: `few` is a tree in
  leaf with touches on outer twigs; `medium` is a flowering LIMB — the foliage *around* a bloom
  gives way too, because debug view C showed the full-size NEIGHBOURS doing the hiding; and
  `abundant` is peak bloom, a different phase of the year, with foliage reduced tree-wide and
  wood showing between clusters.
- **Two things the debug views found that reading the code never would.** (1) A 27% bloom could
  leave the whole camera-facing side without one flowering twig, so selection is now
  stratified by compass sector — the tree is orbited and every side carries its share.
  (2) Measured in the hero view, only **7 of 146** attachment points face the camera at the
  centre of the crown: the face of a crown is mostly other sides seen *through* it. So colour
  through the middle depends on the foliage opening, which is why `abundant` succeeds outright
  and `medium` only partly.
- **At high amounts the drift field must be nearly flat.** With a strong one the twigs NOT
  flowering were one contiguous patch, which read as a second, green plant inside a pink one.
- **Local foliage contrast (L6): the stage moves, the subject never does.** The leaf clusters
  within 0.85 of a flowering twig take a VALUE multiply (an RGB scale, chromaticity untouched):
  lighter around a bloom darker than the leaf, deeper around one lighter. Navy stays navy. At
  1.35 the radius reached most of a medium crown and became a grade, not a stage.
- **Winter carries the site's colour in buds, or in persistent berries where the site fruits
  (L8).** Leafless, on V0's dormant ground at the leafless dormancy (0.82). Reads at 140px in
  every test colour, navy and cream included, and is the cheapest tree in the set.
- **Flowers and fruit coexist (L11)** by zoning, the way a tree does it: fruit is planned first,
  low and on older wood; bloom keeps off the twigs within 0.75 of a fruiting site. Red bloom
  with red fruit still reads as two things, because form and zone differ.
- **A narrow-based flower must sit on the wood.** Statement flowers stood off their twig by the
  same distance as a cluster dome visibly FLOATED. Seating is per grammar.
- **Cost, honestly:** leaf clusters are scaled, not culled, so `abundant` is the MOST expensive
  state today (~668k tris vs ~519k for `few`). A small-tuft variant for shrunken clusters would
  bring it to about parity; that is the deferred performance pass.

### The island was inside-out — FIXED (2026-09-20, reported by the human)

*"lower place is still hollow i can see the tree roots."* Every triangle in `island.js` was
wound backwards: the turf dome faced DOWN (0 of 2,592 triangles up) and the soil body faced
INWARD (0 of 546 out) — measured, and the same family of bug as the trunk's winding. Back
faces are culled, so from any low angle the near wall vanished and the island was an open
bowl: the inside of the far wall, the tree's shadow falling into it, the trunk's buried base
hanging under the turf. It survived because from the hero angle the grass blades cover the
missing dome. Two consequences worth keeping: **the dome's contact shading at the trunk had
never once been on screen**, and **the soil colour everyone had judged was the unlit inside
of the far wall** — the real, lit flank is warmer and lighter. Fixed by flipping the winding;
the top ring of the soil now meets the turf rim exactly (its noise left a hairline crack that
only showed once the island was solid). `island.js` is shared, so the live V0 is fixed too —
checked before/after, crown and turf unchanged. Renders:
`references/experiments/island-inside-out-2026-09-20/`.

**Rule, now earned twice:** any hand-indexed mesh gets its facing MEASURED (share of
triangles whose geometric normal points away from the form), not eyeballed from the hero
angle.

### A canopy of eyes — the flower centre and the pale edge, corrected (2026-09-20)

The human, on a dark-accent tree: it read as dozens of eyes staring out of the canopy. Two
renderer decisions of mine caused it, and both are reversed. Renders:
`references/experiments/bloom-eye-and-pale-2026-09-20/` (`CLOSEUP-eye-old-vs-new.png` is the
whole argument in one image).

- **The centre is the site's, not the renderer's.** Analysis computes a centre colour on
  purpose (driven away from the petal's lightness so the flower reads small) and delivers it as
  `flowers.secondary`. The renderer painted every eye 82% fixed yellow regardless — a blue site
  issued a yellow eye it never earned. The eye now follows the delivered centre, with a small
  warm bias (`eyeWarm`, 0.14). A centre is only derived here when none arrives (the `?fc=`
  debug path).
- **Colour alone does not cure an eye.** A round bright dot concentric in a round dark disc is
  how an eye is drawn, whatever its hue. The centre is now a small five-point STAMEN STAR,
  which is a flower's centre and cannot be a pupil. It must sit clear of the petal claws: at
  the flower's origin it intersected them and showed as cut-up outlines.
- **`pale` is a function of the petal's own lightness, not a constant** (human: "solid for only
  dark colours and the gradient thingy for the lighter colours"). 0 at l ≤ 0.40, 0.42 at
  l ≥ 0.70, smoothstep between. The constant had been justified as buying value contrast for
  cool accents; it bought it by destroying saturation, and turned a deep blue into a lavender
  smudge. On a pale petal the same edge is right — solid pink is a poster. Physically: the pale
  edge is a highlight, and a highlight belongs on a light, thin surface. **The dark end is
  `PETAL_FLOOR` in `analysis/lib/mapping.js`; the two numbers move together.**
- **Solid is not flat.** With no gradient at all a dark bloom lost its petals and became a
  blob. A solid petal is still modelled — deeper claw, an edge a shade lighter — strictly
  inside its own hue. Lightness moves; nothing blends toward white.
- **`?fc=` / `?fc2=` bypass the analysis conditioner**, so a URL-driven render is not
  representative of a real site unless already-conditioned colours are passed. Conditioned
  corpus pairs used for judging: github `#1b20a0`/`#8a8de4`, irs `#1671b6`/`#98c5e7`, gov.uk
  `#2d7abc`/`#b0d0ec`, tamu `#ac2020`/`#e79898`, raycast `#c7273a`/`#edb3ba`.

### Wired to the product (2026-09-20) — the new tree responds to a URL

The product's whole contract with 3D is `mountTree(canvas, dna, opts)` → `{ setDNA, dispose … }`
(`prototype/src/main.js`, served at `/tree/`). That interface is unchanged, so **`app/` was
not touched**. Behind it there are now two engines: `new` (default — `grow.js`) and `v0` (the
shipped tree, whole, selectable with `opts.engine` or `?engine=v0`: a way back, and a
side-by-side on the same DNA). Renders and numbers: `references/experiments/wiring-2026-09-20/`.

- **One builder, two hosts.** The scene used to be the top-level body of `gate1.js`, so the
  tree could only exist on that page. It is now `grow.js`; the gate pages and the product both
  grow from it, from the same parameter bag. Verified by pixel diff: the refactor changed
  **0 pixels** of the tree on seven debug renders.
- **Asynchronous inside, synchronous outside.** The wood is a 1.5–2.5 s build. Blocking on it
  would freeze the page, so `mountTree`/`setDNA` return at once (~60 ms), the island shows
  immediately, the wood is built in ~10 ms slices between frames, and the tree is added when
  whole. `handle.ready` resolves then. The wood builder is a generator with a synchronous and
  a time-sliced driver — one implementation, identical output. A worker was the other answer;
  module workers do not see the page's import map.
- **Measured:** longest frozen frame ~2000 ms → ~100 ms (gov.uk). Two stalls had to be found
  by timing, not guessed: seven 15-million-float grid arrays allocated in one go (300 ms,
  now stepped), and the skeleton, which is still one ~90–200 ms block on the rich structure —
  **the longest remaining stall**. Time-slicing roughly doubles wall time under load (each
  slice yields to a rendered frame).
- **Framed before it is grown.** The camera fits the crown the tree is ASKED to fill, known
  from its parameters, so there is no jump when the tree arrives; and the island is in frame
  whole — cropped at the turf, a diorama becomes a tree in a field.
- **On a swap the old tree stays up until the new one is whole**, a superseded build is
  aborted, and everything replaced is disposed.
- **A leafless tree takes the ground dormant on the debug pages too** now (it always did in the
  product): the one visible change to `gate1.html`, and not to the tree.
- `prototype/wired.html` is the product's renderer path without the product: any DNA record
  through `mountTree`, with the frozen-frame measurement on screen.

**Known, not yet fixed:** pendant florets read as flat squares now that dark petals are solid;
`abundant` on a real site is nearly leafless by design and wants Taste's eye; the build is
2–7 s under load, which is what the deferred performance pass is for.

### The ground answers to the trunk, and `few` is a floor (Taste rulings, 2026-09-20)

Renders and measurements: `references/experiments/ground-value-2026-09-20/`.

- **RULE: the ground sits clearly darker in value than the trunk standing on it.** A root
  buttress only reads as gripping the earth if the earth is darker than the wood. **Root
  cause (Taste's):** the trunk went from dark brown to pale tan in the clay restyle and every
  terrain palette predates that — authored against a dark trunk, and the trunk moved out from
  under them. In albedo, autumn turf was L* 69.3 against a trunk at 70.1: the same value.
  Summer survives only because saturated green separates from tan by HUE; straw, sage and
  dormant olive share the trunk's hue family and have nothing but value.
- **Implemented as the relationship, not as palettes** (`grow.js`, `groundForTrunk`): the
  closer the turf's Lab chroma is to the trunk's, the more value it owes (up to 13 L*), paid
  with ONE RGB scale across lo/mid/hi — hue, saturation and the turf's own ramp untouched —
  in albedo, before the environment grade. It restores no authored hex on purpose: straw-gold
  under an amber canopy collapses into one hue family, so it goes down until clearly darker
  and stops. Measured in renders, turf vs trunk luma: autumn −16% → −34%, winter → −31%, bare
  −20% → −33%, sparse −9% → −25%; summer green is untouched by construction. `WOOD_TAN` is
  exported from `bark.js` so the rule follows the clay if it moves.
- **The stones are capped under the trunk** (`stonesForGround`). They were L* ~92 in every
  daylight state, +23–27% over the trunk in the render — the brightest thing in a picture whose
  subject is the tree — and are now within ±3% of it. It is a CAP, stated honestly: an earlier
  "a step lighter than the turf" term never fired for any shipped palette and was removed. The
  stones still read lighter than the lawn because their facets face the sky and grass blades
  do not (~21 L* in the render at equal albedo). Their STATE arrives through the host's palette
  (cream → grey with dormancy), which a value scale leaves alone.
- **Two regressions of this change, caught by independent review and fixed:** (1) the island's
  own value order — taking the turf down without the soil left the grass DARKER than the soil
  cliff under it in winter and bare, which is backward; the soil now follows only as far as the
  order needs (`soilForTurf`). (2) **Night is exempt from the stone cap:** the moonlit trunk is
  already the brightest object there, and capped stones under a weak ambient rendered darker
  than the lawn — holes punched in the grass instead of pebbles.
- **Dissent on record:** the independent judge FAILED summer on a strict reading — sunlit grass
  blades tie the trunk's brightest value. Taste's ruling says summer passes because saturated
  green separates from tan by hue, and the rule leaves it untouched by construction. Noted for
  Taste rather than acted on.
- **Night's turf is not fixed by this** (the rule runs in albedo, and at the sampled point the
  turf is brighter than the trunk's shadow side). That is the moon's direction, and it follows
  whichever night level is picked.
- **`few` is a floor, not a point on a scale.** Multipliers may scale `medium` and `abundant`;
  nothing may take a flowering tree below `few`. A CLAMP applied after all scaling
  (`chooseBloomSites`), never an exemption inside one season's branch: a clamp covers every
  future multiplier by construction — including a multiplier of ZERO, which an earlier version
  let through. Plus a minimum cluster COUNT (6) — "touches" is plural, and 10% of a small
  crown's twigs is two — and `few` is now lightly STRATIFIED, because more clusters otherwise
  only extend the one drift already chosen (one real tree had all its touches on one side).
  The explicit `bloom=` debug fraction is not clamped.
- **What the clamp does NOT fix, stated plainly:** ikea went 6 → 15 clusters and its accent
  still barely arrives. Yellow bloom inside an amber crown is a HUE COLLAPSE, not a count
  problem, and the value-only local contrast (L6) cannot reach it by design. Any accent inside
  the foliage's own hue family has this problem; autumn just makes it common, because autumn
  foliage occupies the whole warm half of the wheel.

### Bare earth — the failure state (2026-09-20)

`growEarth` (grow.js), `handle.setEarth()` and `mountEarth(canvas, opts)` (main.js),
`bareEarth` in `buildIsland`. Renders: `references/experiments/autumn-fruit-and-bare-earth-2026-09-20/`.

- **A failure must never be drawn as a deficiency in the site** (Taste). When a big site times
  out the site has not failed, we have; a seed, a sprout or a stunted tree would say "there was
  too little here to grow anything" about exactly the richest sites on the web.
- **It is BARE because terrain is measured too.** An empty island wearing a lawn and its usual
  stones fabricates data that was never obtained — the same lie, told more quietly. So: the
  island's own form, no grass, no stones, no tree; always the day state (no background was
  measured either).
- **It shares nothing with a SUCCESSFUL bare tree** (info.cern.ch: leafless, on dormant turf
  with stones). That tree has turf AND stones AND a trunk; this has none of the three. That
  separation is the acceptance test.
- **Nothing in it draws a missing tree.** No contact shading where a trunk would stand, and it
  is framed on the ISLAND — framed like a tree scene it is a small island under a tree-shaped
  void, which is the very thing it must not say.
- **But not TIGHT on the island (2026-09-21, found by the human on the deployed page).** The tight
  fit was judged in a 62vh square box; with the scene as the whole window it filled 83% of a
  2000px-wide screen and stopped being an object — "why is my screen brown", with the failure card
  stuck on it like a label. It is now a small plot in a world (about a third of a desktop window's
  width, in the lower half, the host's centred message floating clear above it), under a sky too
  short to hold a tree. **A framing number carries the frame it was judged in**; every one here
  was judged in a square box. It now sits close to idle, which is recorded, not hidden:
  `references/experiments/framing-2026-09-21/`.
- **IDLE is the same island, framed the opposite way (2026-09-21) — EXPERIMENT.** Before anyone
  has named a website the page shows sky and this island (`mountIdle` / `handle.setIdle()`).
  For failure the tree-shaped void is a lie, so failure frames on the island; for idle the same
  void is the INVITATION, so idle is framed as the tree scene a normal tree will ask for — and
  when the tree arrives the camera does not move (measured: 0). Only the framing, and the page's
  copy, tell the two apart. Bare soil for the same reason failure is: a lawn at idle is terrain
  nobody measured. Evidence: `references/experiments/framing-2026-09-21/`.
- The handle is the same one a tree gets, so a retry that succeeds is `handle.setDNA(dna)`, and
  a tree followed by a failure is `handle.setEarth()`. Both verified, with the same swap
  discipline as `setDNA`: a build in flight is abandoned, the old scene stays up until the new
  one is ready, everything replaced is freed. **The product does not call it yet — that is
  `app/`, and web's.**

### "Half of the flowers are in the air" — a bloom is ATTACHED (2026-09-20, the human)

On a `few` tree in the product a third of the blooms hung detached in the sky. **Measured, not
eyeballed** (distance from each bloom's origin to the nearest attachment point on the wood):
median **0.58** at `few`, against 0.29 at `medium` and 0.21 at `abundant` — which is why only
`few` broke. The bloom's base is about a quarter of a unit across, so past that there is sky
between flower and twig. Cause: the stand-off was tied to the radius of the leaf ball under
the bloom — a leftover of the three banned attempts to beat occlusion by pushing flowers
outward — and at `few` that ball is nearly full size. Now clamped INSIDE the builder
(`SEAT_MAX`, flowers.js), so no caller can float a bloom: `few` is back to 0.29. A flower
nestles in its leaves; the foliage relationship is what makes it visible, never distance.
Renders: `references/experiments/floating-bloom-2026-09-20/`.

### Independent review of the autumn and failure-state work — what it found against me

- **Craft, failure island:** the first version "reads as a potato or a bread roll" — a smooth
  convex lawn-dome on a faceted drum, the rim overhang gone, a soil a quarter lighter and twice
  as chromatic as a successful island's. Rebuilt as `earthCap`: a nearly flat, flat-shaded,
  gently worked plateau on the soil body's own 42 segments, with the RIM LIP that identifies
  our island, in the soil family every successful island already uses. Facing MEASURED: 294/294
  top facets up, 84/84 wall out, 84/84 underside down.
- **Craft, fruit:** nine fruit shoulder to shoulder in one arc ("a grape bunch, the loudest
  object in the image") and every fruit the same radius. Fruiting sites now keep 0.95 apart
  (a preference — the count still wins), and each spur has its own size with one leading fruit.
- **Code:** the environment's tone mapping was applied when it was CREATED rather than when it
  went on screen, so during a build the old scene was re-rendered under the next state's tone
  mapping (a day island under night's ACES). `dispose()` leaked an island shown early for a
  tree that never finished. The `v0` handle had no `setEarth`, so a `?engine=v0` page threw on
  its first failure — it now hands the canvas to the new engine.
- **Passed without change:** every interleaving of `setDNA` / `setEarth` the reviewer traced —
  an aborted build can never add itself to the scene or free the environment on screen.
- **Judge recommendations NOT acted on, because they are not mine to decide:** "take blue fruit
  dark — a bright cool brand colour arrives as a shade of itself". That repaints the website's
  colour, which the rulings forbid for bloom; whether fruit is different is Lead's and the
  human's call. And: "the render can only refuse to pass judgment; 'we could not read this' has
  to be carried by the failure card's copy" — a scoping question for Lead.

### Medium bloom, re-tuned to Taste's ruling — and what the ruling could not reach (2026-09-20)

`references/experiments/medium-2026-09-20/` (`SHEET-medium-sweep.png`, `SHEET-medium-result.png`,
`SHEET-medium-final.png`, `BLIND-*.png` + `BLIND-key.txt`). Taste failed `medium`: "a green tree
with pink around the edges; the crown's centre third is solid green". Ordered fix: make the
foliage reduction bite in the middle third FIRST (`elsewhere`), THEN fraction 0.40, re-judge at
140px. Done in that order, MEASURED at a true 140px, then judged blind by three independent
read-only judges (ladder / tree health / adversary).

- **`elsewhere` opens the middle — onto WOOD, not bloom.** Across the sweep leaf cover in the
  crown's middle third fell 70% → 41% while bloom there moved 3.8% → 6.1%. The crown is a
  hollow shell: behind the leaf in the middle of any view is limb and the far side. **Even the
  approved `abundant` has only 8.6% bloom in its middle third against 36% at its rim.** So the
  literal complaint describes something no amount of thinning achieves, and below about 0.7 the
  tree reads thin and unwell before its centre ever reads pink.
- **The fraction is what moves total bloom:** 13.6% of the crown at 0.27, ~19% at 0.40.
- **Blind panel:** the old setting came LAST with all three. D (0.40 / 0.62) and C (0.40 / 0.75)
  tied on Borda. C taken: the health judge's objection to D is disqualifying — its crown is
  thinner than `abundant`'s and the two converge at 70px — and the ladder judge called C "the
  safe alternative with no other cost" and the best-spaced.
- **All three judges independently named the real remaining problem: DISTRIBUTION.** Bloom
  arrived as a cap on top and a fringe below; the height band where the scaffold limbs fork
  carried the least. Fixed as "which twigs flower" — `bands`, a per-height-band quota weight in
  the stratified selection — never by moving a flower: middle-band bloom 22% → 27% of the band.
- **A hidden cost, found by measurement:** at 40% bloom nearly every twig is "near" one, so the
  near-bloom reduction (`nearTo` 0.55, radius 1.1) was quietly thinning the WHOLE crown. Now
  0.7 / 0.8, which keeps the crown mass the panel judged healthy (leaf cover 30%, unchanged).
- **Result, crown bloom share at 140px: few 6% / medium 21% / abundant 33%**; leaf cover
  61% / 30% / 15%. Holds in all three grammars and on real conditioned colours.
- **Dead lever removed:** an "inner foliage" scale measured zero effect — a hollow crown has
  no inner foliage. **Step 4 (re-judge scaled seasons) is moot:** autumn was the only state
  that scaled bloom and it no longer flowers.
- **Still true, and NOT fixed:** the adversarial judge passed no candidate — the middle of the
  frame is wood and far-shell in every amount. Putting bloom THERE needs flowering twigs on
  the camera-facing middle of the shell, which is crown STRUCTURE (Gate 1's ramification,
  already REVISE), not bloom tuning.

### Small queue, same day

- `GRAMMAR_COMPAT`: pendant × broad is now recorded as TASTE's ruling, with its reasoning
  (a broad crown's wide underside is what hanging clusters hang from) and its guard.
- The `?fc=` warning now says what Taste said: bypassing the conditioner is not merely
  unrepresentative, it is the FAILING case — blue passes because of `conditionFlower`.
- **Winter buds follow their own lightness.** Pale buds vanished (cream on tan wood against
  pale sky: "as though analysis failed"): now bigger, more numerous, in a deep dark scale cup —
  a two-tone object that reads on any ground. Dark buds read as blight: now swell to a lighter
  tip inside their own hue, in a pale cup. Improved, still wants Taste's eye on cream.
- **Pendant florets are folded bells.** Three wide two-row petals were flat diamonds — harmless
  while petals paled to the edge, a column of flat squares once dark petals went solid.
- The debug pages get V0's autumn and winter ground (the product always had them via
  `resolveDNA`); a `season=winter` tree had been standing on a summer lawn.

### Wind on the new tree — EXPERIMENT (2026-09-21)

Rulings: `docs/briefs/WIND-AND-MOTION.md`. Code: `applySway` (`util.js`), the wind block in
`growTree` (`grow.js`). Evidence and every number below: `references/experiments/wind-2026-09-21/`.
**Amplitude (0.045) and speed (0.85) are V0's, carried over — not a judgement. They are Taste's.**

- **`applySway` used to ASSIGN `onBeforeCompile` and `customProgramCacheKey`; it now COMPOSES.**
  Harmless in V0, where no swaying material had a hook. On the new tree every material does, and
  the hook that would have been overwritten is the zero-specular rule: leaves, flowers, fruit,
  buds and berries would all have regained the sheen, with no error anywhere. The prior hook now
  runs first and the prior key stays in front (`leaf-matte-v1+sway-world-pin`). Still one program
  per material KIND, never per tree; a material with no hook of its own gets byte-identical
  shaders and key, so V0 and the grass are untouched. **Verified in the COMPILED shaders**, not
  in our source — this is a failure that reports nothing.
- **It is applied once, in `growTree`, over whatever the builders returned** — not inside each
  builder. The new foliage shipped without wind because every builder had to remember to ask for
  it and none did; a builder added later now cannot forget.
- **On rigid wood, nothing growing on it may DRIFT.** `applySway` moves each instance as a block.
  The wood does not move (W3), so a block that translates is sliding across the twig it grows
  from. In a leafy crown the seat is buried in the leaf ball and it does not read. **In winter it
  does:** buds were measured travelling 0.043 units on a twig 0.068 across — 64% of its width,
  with nothing hiding the contact. Reported, not tuned away: lowering the amplitude until winter
  stopped showing it would have taken the wind off every other tree.
- **So everything PIVOTS ABOUT ITS SEAT (`pin`).** Every cluster, flower, fruit, bud and berry is
  an instance whose origin IS its seat, so the offset is scaled by distance from that origin:
  nothing at the seat, the whole sway a leaf's length (0.5) away. For a small sway that is a rigid
  rotation about the point of attachment — one term, every carrier, and nothing can slide, by
  construction. Pixels changing within 7px of a bud's seat: 25.1% drifting, 4.4% pivoting. A
  hanging raceme and a fruit on its spur now swing from the top.
- **The pivot sorts the states without being asked to.** A leafy crown keeps ~3/4 of its visible
  motion (a leaf is as long as the pin, so its tip still gets everything); a winter tree calms to
  40%, because a bud is short and stiff. A BARE tree does not move at all — it has nothing on it
  that sways. Stillness is what a leafless tree does in a light wind, and the grass still moves,
  so the scene is not dead. **Whether a still winter tree is right is Taste's to look at.**
- **The height mask is each tree's own (W2):** still at the first real fork, full sway at the top
  of the finished tree. V0's constants (1.4 / 4.4) belonged to a shorter tree and would have moved
  this trunk. Measured: foliage hidden, two wind phases, **0 pixels differ**.
- **The wind's uniforms are shared per tree and handed back** (`built.wind`), so amplitude, speed
  and the pin change on a finished tree with no rebuild — which is how every A/B here was made.
- **`wind=0` installs no hook at all** (shaders, keys and pixels as before wind existed);
  `windPin=0` is the drift; **`t=SECONDS` on the gate pages pins the wind's clock.** A page that
  is a measuring instrument cannot have two captures of one tree differ by where the wind was.
- **Known, stated rather than fixed:** three's shadow pass uses a depth material that never sees
  the sway, so the foliage's cast shadow is its rest pose. V0 shipped the same way; with rigid
  wood the trunk's own shadow is simply correct.
- **Cost: not measurable.** 14 programs with and without, 15 draw calls with and without, best
  frame 4.29 ms without and 4.33 ms with, inside a 0.3 ms run-to-run spread. It is per-VERTEX
  work, so it is the same in a 140px thumbnail as on a full-bleed page — whose own per-FRAGMENT
  cost, measured on the same tree, is 3.3 ms (today's stage) against 5.0 ms (1440x900 @2x).
  Measured on a quiet machine: taken under load, "wind on" once came out FASTER than "wind off".

### Night: the island's underside was never seen, and it cannot be lit — EXPERIMENT (2026-09-21)

L17, "night has gone near-black". Evidence, the probe and every number:
`references/experiments/night-2026-09-21/`. **The look changes, on the page where the scene is
the background: this wants the human's eye.**

- **It was not a regression, and it was not the crown.** Measured with an occlusion-correct mask
  at a true 140px, the shipping crown is as legible as the approved one (median separation from
  the sky 10.8 L* against 9.4). What vanishes is the **soil body** — L* 0.3 on a sky of 2.5, 99%
  of its silhouette lost — and the cause is that **the night levels were judged on a frame
  cropped at the turf.** Nobody had seen the soil at night; the product frames the whole island.
- **A surface that receives no light cannot be fixed with albedo.** Painted pure white the soil
  still rendered 0.3. And it cannot be lit without ending the night: soil reflects a tenth of
  what a leaf does, so any light strong enough to reach it hits the crown's underside, the pale
  trunk and the stones first.
- **So it is given something to be dark AGAINST:** a deep-blue glow in the VISIBLE sky that
  begins 17 degrees below the horizon — under the island, where only the soil is. The sky behind
  the LAWN stays dark, because raising the whole horizon trades the soil for the lawn's edge.
  Silhouette lost 98.8% -> 9.9% (full-bleed 88.9% -> 4.4%); the top 45% of the frame is
  pixel-identical. Colour and contrast, not exposure. `?nightGlow=0` is the night without it.
- **Two wrong diagnoses came first, one of them mine,** from a bounding-box segmentation of
  screenshots that said the crown had lost 3 L*. A number from a crude instrument is worse than
  no number: it sent the fix toward the foliage.

### The wind is weather, and autumn sheds when it blows — EXPERIMENT (2026-09-21)

The human: *"for autumn trees I want leaves falling when wind blows."* Evidence, numbers and every
default: `references/experiments/wind-2026-09-21/`. **All constants are visual-3d's defaults and
are waiting on the human's weather review — sway, gust and shedding judged together.**

- **One gust, two effects.** A slow envelope over the sway (the tree is sometimes nearly still,
  then moves — constant motion reads as a mechanism), and autumn's leaves come off on its peaks. The
  shedding is CAUSED by something visible instead of running on its own timer.
- **Gusts are enumerable: slot n holds a gust whose moment and strength are a hash of n.** That is
  what lets anything be caused by one, and it makes the whole weather a pure function of time —
  nothing integrated, nothing that depends on the frame rate, `t=` pins it. It paid at once: an hour
  of weather was checked arithmetically on a machine nothing was allowed to render on.
- **AMBIENT (W1) all the way down:** constants and hashes of slot numbers. Not the DNA, and not the
  site's seed either — the weather is the world's, the same for every tree.
- **A falling leaf is the tree's own leaf, born where a real one is.** The crown is instanced
  CLUSTERS, so honest removal would cost every tree a shader branch to serve one season; the twin
  stays behind and with seventeen in a ball nobody can tell. What they must never become is
  particles with a life of their own (TASTE #8, #9): in autumn, shedding is what the tree DOES.
- **The lawn is bounded by construction** (a fixed pool; a resting leaf gives up its slot just
  before it sheds again, while the eye is on the gust) and it is **autumn only** — one draw call,
  one extra program, nothing for any other tree.
- **Look before you count.** The shedding statistics were right while a third of the leaves had a
  NaN scale, an invisible leaf counts as a leaf, and the same NaN had blacked out the frame through
  the camera. `fitCamera` now refuses a fit it cannot trust, because a camera that is moved by a
  RELATIVE factor never recovers from one bad number.

### The wreath is a FACE, not a shell — every bloom judgement was made from one angle of one seed (2026-09-21)

Evidence, the probe and every number: `references/experiments/leafy-ramify-2026-09-21/`.

- **Averaged round the tree there is no wreath.** Today's `abundant`, 8 azimuths, 3 seeds, at a
  true 140px: 31–42% bloom in the crown's middle third against 34–37% at its rim. The figure that
  started the structural work — "8.6% in the middle against 36% at the rim" — is the HERO ANGLE OF
  SEED 7, which is that tree's worst face. `medium`, seed 7, by view: 6.8 · 27.2 · 29.4 · 31.2 ·
  6.3 · 23.0 · 30.4 · 20.4 — the first is the angle it was judged from.
- **`gate2.html?preset=bare&seed=7` from the default camera is the debug page's default, and it
  has been the instrument for every bloom judgement here.** A tree that is orbited has to be
  measured round the tree, on more than one seed.
- **Ramification under foliage does not help** (middle-to-rim 0.85 / 1.07 / 1.31 against 0.87 /
  1.13 / 1.23), and my own "4 -> 14 attachment points facing the camera" was one view at twice the
  leaf: properly, 5.2 -> 6.3. The `ramify=leafy` path and the foliage ladder's compensation exist,
  inert, and are not recommended on this evidence.
- **What is wrong is that the crown's faces differ**, and for some sites the product's first frame
  is the bad one. ~~Bloom selection is stratified by compass sector and, separately, by height
  band — not by both together.~~ **That sentence was false, and was mine:** `pickSites` already
  stratifies by both together (6 sectors x 3 bands). What it did INSIDE a stratum was take the top
  scores, and the drift field makes the top scores neighbours. Corrected before anything was built
  on it; what followed is the next section.

### Which twigs flower: even inside each stratum — DECIDED by Lead, the human to re-judge (2026-09-21)

Evidence, tables, the pairs and the instrument: `references/experiments/bloom-faces-2026-09-21/`.

- **Why a face goes bare:** only ~5 of ~146 attachment points face the camera in the middle third
  of any view — at a 40% bloom, two twigs give or take two — and `medium`'s drift field leaves bare
  stretches ~1.2 across by design where a view's middle third is ~1.9. The gap the field exists to
  make is the size of a face's middle.
- **`even` (ON for medium and abundant; `bloomEven=0` is the selection as it was):** a stratum's
  share is its best-scored twig, then each time the twig farthest from those already taken. Which
  twigs, never where a flower sits (D8.5); no RNG draw; `few` untouched.
- **Rendered, 5 seeds x 8 views, middle-third bloom at 140px:** the worst face rose in 9 of 10
  seed x amount runs with the orbit's mean flat (medium: worst over all seeds 4.7 -> 8.0; faces
  under 10%, 6 of 40 -> 3). One regression, stated: seed 19 medium 12.9 -> 9.9. A flatter or a finer
  drift field, measured the same way, each made two seeds WORSE than today — the field was never
  the lever.
- **A cheap no-render proxy was retired:** two definitions of it disagreed about today's own count
  and it tied a losing variant with the winner. Only the render counts (R12).
- **The camera, measured and NOT wired:** `growTree` reports `faces.best` / `faces.worst`. It tracks
  the rendered middle bloom at r = 0.70, and opening on `best` lifted the opening face's floor from
  6.8% to 21.8% under the old selection — but only the opening; the orbit still passes the bare
  face. Lead: wire it after `even` has been looked at, with its own look.

### The wood is built in slabs, and in workers — output-neutral (2026-09-21)

Evidence, instruments and every number: `references/experiments/wood-workers-2026-09-21/`.

- **What is slow about growing a tree is the wood field: 63–84% of the time, the skeleton 2–4%.**
  The "non-yielding skeleton" diagnosis was visual-3d's own and was wrong; the worst single long
  task is `mountTree`'s synchronous part, which barely scales with CPU throttle (GPU-process wait).
- **The field is a kernel with no `three` in it** (`woodfield.js`) run over z-SLABS — by the main
  thread in slices, or by workers — ON wherever the host slices the build, by Lead's ruling on the
  identity proof and without a run on a real slow device, because the downside is bounded at the
  main-thread build (`?woodWorkers=0`, always). One implementation, the same mesh to the bit on every path: 48 of 48 against HEAD, and
  every way a worker can fail still ends in the identical tree without waiting for anything.
- **Nothing allocates the whole grid any more:** 329 MB of typed arrays for an ordinary tree became
  ~31 MB (main thread) or <= ~24 MB a worker. No instrument we have can see a tab killed for memory.
- **Four workers: 2.4x on the wood phase and a third off the time to a tree** (1224 -> ~780 ms,
  headless Chrome, cores shared with other sessions; 3.4x in clean single-thread arithmetic).
- **Two traps in the instruments, both now written down (R12):** the Browser pane is a BACKGROUNDED
  tab, where worker threads and sliced work run 3–6x slow while a straight-through build looks
  normal; and DevTools' CPU throttle does not slow workers at all, so a throttled run flatters a
  worker build by exactly the throttle (`woodWorkerRepeat=N` puts it back, as an instrument only).
- **Not done:** a resolution tier for small screens (the only thing that cuts the work; it changes
  what a tree is — Lead: not tonight), and cheaper grooves (not bit-identical).


### Tap leaves share autumn’s motion — EXPERIMENT (2026-09-23)

**DECIDED.** The human requested the existing autumn fall for tap interactions and a
visible ambient breeze even without the cursor. See the D11 motion refinement.

**EXPERIMENT.** `buildLeafFall` now has an explicit-release mode using the exact same
individual leaves, flight and ground contact. Ordinary foliage and winter foliage
record their leaf seats too. Autumn keeps its automatic gust-driven pool alongside
the bounded tap pool. Detached leaves never receive the canopy sway shader.

**EXPERIMENT.** The breeze’s calm multiplier is 0.65 and tree sway amplitude 0.16.
Both are ambient constants. Browser checks use the saved Hacker News tree and the
repository’s `synthetic-autumn.example` fixture; these are visual checks on a desktop,
not a performance measurement on a phone.

### Smooth soil body — EXPERIMENT (2026-09-23)

**DECIDED.** The human rejected the base's low-poly appearance (D11 base refinement).

**EXPERIMENT.** The soil uses a curved shoulder and rounded underside, sampled in
32 rings with 96 angular segments, and smooth normals. The turf seam retains its
matched height and slight overlap; low-amplitude relief fades out at rim and tip.
The soil palette and matte material remain. A geometry regression checks every face's
orientation, every shared edge and every normal to prevent another hollow island.
Browser checks cover the saved Hacker News tree from the front and a low orbit angle,
plus the Linear night example. These are desktop visual checks, not GPU benchmarks.

### A path back from 404 — EXPERIMENT (2026-09-23)

**DECIDED — human request.** Provide a custom 404 page.

**EXPERIMENT.** Unknown routes and missing shared-tree pages show the same garden
sky, serif typography, living idle island and moss action. The copy and home link
are static HTML; the decorative WebGL scene is optional, pausable and respects
reduced motion. Responses retain status 404 and the page declares `noindex`.

### Larger laptop scenes and wildlife — EXPERIMENT (2026-09-24)

**DECIDED.** The human requested side controls on laptops, larger trees, no visible
drag instruction and wildlife, with fireflies suggested for night scenes.

**EXPERIMENT.** At 1000px the controls move to a 320px left rail. The full-screen
canvas reserves horizontal space for that rail and uses the available height;
postcards still use their own centred camera. Mobile keeps the bottom dock.

**EXPERIMENT.** Three butterflies use curved wings and independent wing beats;
ten night fireflies use small depth-tested glow sprites with slow drift and pulses.
Separate seeded randomness leaves tree generation unchanged. They are added after
foliage bounds and sway are measured and share the pausable renderer clock. Their
geometry, materials and texture are released with the scene.

**EXPERIMENT — checked.** Browser review covers Hacker News and Linear at 1366×768,
the night scene at 390×844, and a centred shared postcard from the laptop layout.
Regressions cover horizontal camera insets and deterministic, bounded wildlife flight.
Real-phone GPU performance remains unmeasured.

**DECIDED — superseding human request, 2026-09-24.** The wildlife experiment above
is removed, including its renderer module. The larger laptop composition and
existing tree motion remain.

**EXPERIMENT — human-requested focus refinement, 2026-09-24.** The website field
uses a softly tinted rounded surface and accent underline on focus, replacing the
hard rectangular outline. The underline remains visible for keyboard navigation
in both day and night themes.
