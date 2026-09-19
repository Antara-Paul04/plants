# TREE-SYSTEM.md

> **Status: UNRESOLVED.**
> The tree generator has not been designed. This document is the structure for
> eventually designing it — not a specification to implement.
>
> Do not start building a generator, choosing a 3D library, or writing parameter
> defaults on the basis of this file. See [AGENTS.md](../AGENTS.md) R3.

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

Nothing chosen. No renderer, no library, no framework, no authoring pipeline, no
procedural-vs-authored decision. Deliberately left open — see
[PRODUCT.md](PRODUCT.md).

Do not install 3D libraries or scaffold a renderer before this is settled.

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

- _unresolved_
