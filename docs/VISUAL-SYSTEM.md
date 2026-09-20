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
