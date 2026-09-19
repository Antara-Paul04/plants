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

**OPEN.**

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
