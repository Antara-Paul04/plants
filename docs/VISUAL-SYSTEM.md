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

**OPEN:** no wind sway yet; foliage is not wired to DNA (`foliage.state`/`density`,
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

- _unresolved_

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

- _unresolved_

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
- **The stones move with the state** (`stonesForGround`): a step lighter than the turf they
  lie on, capped well under the trunk. They were +23–27% BRIGHTER than the trunk in every day
  state — the brightest thing in a picture whose subject is the tree — and are now within
  ±3% of it. The cap is lower in albedo than it looks like it needs to be, because a stone's
  facets face the sky and the trunk's do not.
- **Night is NOT fixed by this:** at the sampled point the turf is still ~20% brighter than the
  trunk's shadow side. That is the moon's direction, and it follows whichever night level is
  picked.
- **`few` is a floor, not a point on a scale.** Multipliers may scale `medium` and `abundant`;
  nothing may take a flowering tree below `few`. A CLAMP applied after all scaling
  (`chooseBloomSites`), never an exemption inside one season's branch: a clamp covers every
  future multiplier by construction. Plus a minimum cluster COUNT (6) — "touches" is plural,
  and 10% of a small crown's twigs is two. The explicit `bloom=` debug fraction is not clamped.
- **What the clamp does NOT fix, stated plainly:** ikea went 6 → 15 clusters and its accent
  still barely arrives. Yellow bloom inside an amber crown is a HUE COLLAPSE, not a count
  problem, and the value-only local contrast (L6) cannot reach it by design. Any accent inside
  the foliage's own hue family has this problem; autumn just makes it common, because autumn
  foliage occupies the whole warm half of the wheel.
