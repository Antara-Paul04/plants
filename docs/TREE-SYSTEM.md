# TREE-SYSTEM.md

> **Status: UNRESOLVED.**
> The tree generator has not been designed. This document is the structure for
> eventually designing it — not a specification to implement.
>
> Do not start building a generator, choosing a 3D library, or writing parameter
> defaults on the basis of this file. See [AGENTS.md](../AGENTS.md) R3.

---

## How the prototype tree is built — EXPERIMENT

**Status: EXPERIMENT.** `prototype/` holds one hand-authored tree. It is **not** the
generator, and its numbers are not defaults — they were tuned by eye until the render
looked right. Read this as a description of one artefact, not a specification.

### Construction

| Part | How |
| --- | --- |
| **Trunk** | 5 hand-placed control points forming a lazy S, swept as a tapered tube |
| **Branches** | 4 primaries → 8 secondaries → 7 twigs, each an explicit entry in a table of `(azimuth, start elevation, end elevation, length, radius, twist)` |
| **Roots** | 3 short buttresses angled down into the turf |
| **Crown** | ~25 ellipsoid lobes: one per branch tip, plus 12 hand-placed fillers |
| **Leaves** | ~19,000 instanced cupped cards in 3 shape variants, scattered on the lobes |
| **Blossoms** | ~190 clusters of 2–5 five-petal meshes, plus instanced warm centres |
| **Petals** | ~130 resting on the turf, 16 drifting (animated) |

### Techniques worth keeping regardless of what the generator becomes

These are the findings, as distinct from the numbers:

1. **Leaf normals point outward from the lobe**, not along the card's own face. This
   is what makes the canopy shade as a volume. Without it the crown is tinsel.
2. **Limb cross-sections are never circular** — a slow radial wobble that drifts along
   the limb — and **every junction swells**, with child limbs starting *inside* the
   parent. Together these stop the tree reading as intersecting tubes.
3. **The crown's underside is deliberately thinned** so branch structure reads through.
4. **Cards are double-faced geometrically, not via `DoubleSide`.** `DoubleSide` flips
   the normal on back faces, which turned leaves black and blossoms dead brown.
5. **Tubes must be capped at BOTH ends.** three.js renders back faces into the shadow
   map for front-side materials, which only cancels self-shadowing on closed solids.
   Open-based limbs produced severe shadow acne at exactly the branch junctions.
6. **A narrow camera FOV** does more for the miniature feel than any material choice.

### Currently hardcoded

Effectively everything: branch table, lobe positions and radii, all counts, every
colour, leaf and blossom sizes, lighting, camera, island shape, rock placement. One
seed constant in `main.js` drives all randomness, so the scene is reproducible.

### Observations about what could later become variable

**Speculative — not proposals, and not approved.** Noted only because building the
prototype made them visible:

- Crown proportions (width vs height) and lobe spread changed the tree's character
  more than any other single lever tried.
- Branch elevation — whether limbs spread outward or climb upward — was the second
  strongest.
- Blossom density and colour are trivially separable from everything else, which is
  mildly encouraging for DECISIONS D5, though it proves nothing about whether flowers
  are the right colour carrier.
- Leaf size and count trade silhouette detail against fill; both look acceptable
  across a reasonably wide range.
- Trunk thickness, taper and lean are independent of the crown and read clearly.
- Island radius and depth are independent of the tree entirely.

What has **not** been tested is whether these can vary *together* without producing
ugly trees. That is the real question for the generator, and the prototype says
nothing about it.

### Known weaknesses in the prototype

- Crown silhouette is dense; it wants more air and larger gaps.
- A few leaves and blossoms still shade to dark flecks at the silhouette edge.
- No contact occlusion where trunk meets turf.
- Leaf size distribution is narrow, so it looks slightly repetitive up close.
- Not profiled on mobile or low-end hardware.

---

## Invariant characteristics

**OPEN.**

What is true of *every* tree we generate, regardless of the website. This is what makes
all the outputs feel like one project rather than a random assortment.

Candidate axes to eventually pin down: overall proportions, silhouette family, level of
stylization, "cuteness" rules, what always reads as a tree no matter the input.

- _unresolved_

---

## Variable characteristics

**OPEN.**

What is allowed to change between websites — the actual expressive surface of the
system. The interesting design question is not "what *could* vary" but "what few things
varying produce the most recognisably different trees".

- _unresolved_

---

## Trunk

**OPEN.**

Form, thickness, taper, curvature, height, surface treatment, whether it branches low or
high, whether it is straight or characterful.

- _unresolved_

---

## Branches

**OPEN.**

Branching model, angles, count, depth, recursion or hand-authored structure, symmetry vs
irregularity, how branching relates to overall silhouette.

- _unresolved_

---

## Foliage

**OPEN.**

What leaves are made of and how they are placed: clusters, canopy volumes, cards,
instanced geometry, blobs. Density, distribution, edge quality of the canopy.

- _unresolved_

---

## Flowers

**OPEN.**

Whether flowers exist at all, what form they take, how many, where they sit, how they
scale with the rest of the tree.

**TENTATIVE — not finalized.** Primary and accent colours extracted from a website may
be expressed primarily through **flowers**, rather than by recolouring the entire tree.

The thinking: flowers are a natural home for saturated, arbitrary colour in a plant, so
brand colour can live there without breaking the botanical reading — whereas a fully
recoloured trunk and canopy tends to stop looking like a tree. This is an appealing
hypothesis we have not tested.

This is recorded as **TENTATIVE** in DECISIONS [D5](DECISIONS.md). Do not implement it
as though it were settled, and do not let implementing it be what turns it into a
decision. Promoting it requires seeing it and a human taste judgment (AGENTS.md R7).

Open sub-questions: what happens to sites with no accent colour; what happens to
monochrome or very muted sites; whether a tree can have zero flowers; whether flowers
are the *only* colour carrier or the *primary* one.

---

## Terrain / base

**OPEN.**

Whether the tree has a base at all, and if so what it is: soil, pot, disc, island,
shadow, nothing. Whether the base itself varies with the website.

Mirrors the same open question in [VISUAL-SYSTEM.md](VISUAL-SYSTEM.md) and
[PRODUCT.md](PRODUCT.md) — resolve them together.

- _unresolved_

---

## Palette mapping

**OPEN.**

How extracted website colours become tree colours. Which tree elements are colour-driven
and which are fixed. How we keep results harmonious across wildly different inputs, and
what we do with palettes that are hostile to botanical form.

Constrained by DECISIONS **D5**: website colour must meaningfully influence the tree.
The exact mapping is explicitly unresolved.

Depends on the extraction side — see [WEBSITE-ANALYSIS.md](WEBSITE-ANALYSIS.md).

- _unresolved_

---

## Parameter ranges

**OPEN.**

Once parameters exist, each needs a usable range. The ranges are a creative decision as
much as a technical one: they define the space of possible trees, and therefore how
varied *and* how consistently good the outputs are. Extremes must still look intentional.

- _unresolved_

---

## Determinism and randomness

**OPEN.**

Key questions:

- Does the same URL always produce the same tree? (**ASSUMPTION:** yes — a tree that
  changes on reload is hard to feel ownership of. Unverified and undecided.)
- Is there any randomness at all, or is every variation derived from the site?
- If there is randomness, is it seeded from the URL?
- How much natural irregularity does the tree need to avoid looking mechanical, and
  where does that irregularity come from?

- _unresolved_

---

## 3D implementation approach

**OPEN.**

Still undecided. The prototype uses three.js from a CDN with no build step, no
framework and no post-processing — but that was chosen as the *smallest thing that
could prove the visual*, not as an architecture. It commits us to nothing.

What the prototype does establish is a feasibility floor: this look runs in a browser
at ~640k triangles in 19 draw calls using nothing but instanced geometry, vertex
colour and three lights. Any approach we pick should clear that bar.

Open: whether to stay on raw three.js or adopt a framework layer; whether geometry is
authored, procedural, or a mix; whether generation happens on the client or server.

- _unresolved_

---

## Performance constraints

**OPEN.**

What the experience has to run on and how fast it has to feel. Target devices, whether
mobile is in scope, acceptable time from URL submission to visible tree, polygon and
draw-call budgets, whether generation happens client- or server-side.

Worth settling reasonably early — performance limits shape what the generator can be,
and discovering the constraint late usually means flattening the visual idea to fit it,
which AGENTS.md R6 exists to prevent.

**One measurement exists.** The prototype renders ~640k triangles in 19 draw calls on
desktop: ~30,000 grass blades, ~19,000 leaves, ~630 blossoms, all instanced. Geometry
builds in well under a second. Mobile and low-end hardware are **untested**, and the
4096² shadow map is the most likely first casualty there.

- _target devices, budgets and time-to-tree still unresolved_
