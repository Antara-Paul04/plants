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
| **Crown** | ~24 ellipsoid lobes: one per branch tip, plus 5 hand-placed fillers |
| **Leaves** | ~17,000 instanced cupped cards in 3 shape variants, scattered on the lobes, with air carved out by a noise field |
| **Blossoms** | ~215 clusters of 2–5 five-petal meshes, plus instanced warm centres |
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
7. **Air has to be carved through the whole crown, not left between lobes.** Gaps
   built out of lobe spacing get filled the moment there are enough lobes to make a
   convincing mass. A low-frequency noise field applied to leaf placement cuts across
   lobe boundaries, so the holes belong to the crown. Frequency matters far more than
   amount: high frequency thins the canopy evenly and reads moth-eaten; low frequency
   gives a few window-sized gaps with dense leaf between them.
8. **Lobe sizes have to vary hard, not narrowly.** Many similarly-sized bumps tiling a
   convex hull *is* the cauliflower. A roughly bimodal draw — a few large masses with
   small satellites — reads as a tree at the same lobe count.
9. **Nothing in the canopy may end up isolated against the sky.** The dark flecks were
   almost entirely blossoms whose jitter had thrown them clear of the leaf shell. Kept
   nested in leaves, the same blossoms read fine. See VISUAL-SYSTEM.md for the
   lighting half of that finding.
10. **Contact occlusion needs two falloffs, not one.** A single radius is either tight
    (reads as a painted ring) or wide (reads as a second cast shadow). A tight crevice
    term plus a wide soft pool reads as occlusion. The tight term's inner radius must
    clear the root flare, or the darkest part of it hides under the trunk.

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

Three earlier entries — dense crown, dark flecks, no ground contact — were worked on
in a later pass; what changed and what is left is in the section below.

- Leaf size distribution is narrow, so it looks slightly repetitive up close.
- Not profiled on mobile or low-end hardware.
- The soil body's flat-shaded facets read as a light/dark patchwork from low angles.
- Blossoms seen exactly edge-on are thin slivers. Rare, and no longer dark, but
  visible.

### Pass 2: crown density, silhouette flecks, ground contact — EXPERIMENT

**Status: EXPERIMENT. Hand-tuned by eye, nothing here is DECIDED, and the open
questions below need a human (AGENTS.md R7).**

Three recorded weaknesses were addressed. What was actually changed:

| Weakness | What was done |
| --- | --- |
| Crown too dense / cauliflower | Filler lobes cut 12 → 5; lobe sizes redrawn roughly bimodally instead of in a narrow band; lobes pushed out along their own limb; a low-frequency noise field carves air through the crown; a few leaves reach past the shell as sprigs so the edge is not a clean scallop |
| Dark flecks at the silhouette | Blossoms pulled back inside the leaf shell (they were being thrown clear of the canopy by jitter and hanging in the sky unlit); blossom normals now dominated by the up term and floored; outer-shell leaf normals tipped toward the sky and floored; blossom emissive floor warmed |
| No contact occlusion at the turf | Trunk bark darkens into the ground line via vertex colour; grass-dome rings bunched toward the centre so the shading has somewhere to live; grass blades flatten and go to duff in the crevice, with a collar of taller shaded tufts lapping the root flare; a wide soft pool around it all |

What it cost and what it taught:

- **Leaf count fell 19,000 → ~17,000; triangles 640k → 626k; draw calls unchanged at
  19.** The leaf loop now counts *attempts*, not leaves, because most of its
  rejections exist to remove leaves rather than to relocate them.
- **Opening the crown up immediately flattened it into a wide parasol.** Spreading
  lobes for air removes the thing that was doming the crown. Recovered with a small
  squeeze-inward / stretch-upward about a hub point rather than by adding fillers back
  — adding fillers is what made it a cauliflower.
- **Blossoms read as fewer once the leaves opened up**, so cluster count went 190 → 215
  to hold the same apparent amount of pink.
- **Flattening the grass all the way to the trunk made the contact *worse*.** With
  nothing lapping over the root flare, the bark still ended in a clean line. The taller
  shaded collar is what reads as contact; the bare duff alone does not.

**OPEN — needs human taste judgement:**

- Is the crown now *right*, or too airy? It is deliberately looser and scruffier than
  before. It is less "polished", and whether that is better is exactly the kind of call
  AGENTS.md R7 reserves for a human.
- Does the ground contact read as occlusion, or as a dirty smudge? It is subtle from
  the default hero angle, where the turf dome's shoulder hides much of it, and much
  clearer from lower angles.
- The sprigs reaching past the crown edge give it a slightly windswept, weeping-cherry
  character. Intentional, but a character choice, not a neutral one.

### Pass 3: parameterised against the Botanical DNA contract — EXPERIMENT

**Status: EXPERIMENT.** The renderer now consumes
[BOTANICAL-DNA.md](BOTANICAL-DNA.md) instead of being one fixed tree. Per-field
results are in that document's Findings; this records what it did to the *tree*.

**Structure.** `prototype/src/dna.js` is the only module that knows the contract's
vocabulary — it turns discrete states into plain numbers, and there is deliberately
nowhere in it to put a fingerprint. The hand-authored limb tables were not replaced by
rules: `skeleton.complexity` selects a SUBSET of them, so every tuned number survives.

**New modules.** `dna.js` (contract → parameters), `build.js` (one DNA → a Group plus
`dispose()` and measured extents), `viewer.js` (renderer, lights, background, framing,
shared by both pages so neither can light a tree differently), `compare.html` +
`compare.js` (the comparison grid), `dna-data.js` (a snapshot of `dna.json`, because
the prototype is served from `prototype/` and `../analysis/` is not reachable over
HTTP — regenerate it whenever analysis rewrites the file).

**Plumbing fixed in passing, all previously on record:**

- `applySway` now passes its tuning as **uniforms** rather than interpolating them into
  the GLSL. Twelve differently-tuned trees used to mean twelve shader compiles and an
  unbounded program cache keyed by bare string concatenation; there are now exactly two
  programs, and the key no longer collides.
- `disposeObject` frees geometries and materials through a **Set**. The leaf material
  is shared across three instanced meshes, the rock material across seven and the
  litter geometry across two, so a naive traverse-and-dispose double-frees.
- `main.js` **exports a mount function and runs nothing at import**, so more than one
  tree can exist and a frontend can drive it.
- The build **reports its own extents** and the camera solves its framing from them.
  The old `FIT_H`/`FIT_W`/`DIST0` constants were tuned to one tree and would have
  cropped a tall one and stranded a squat one.

**What parameterisation cost:**

- **The NORMAL baseline is no longer byte-identical to the reviewed tree.** Seeded
  branch wander is required by the brief (the seed drives branch bends), and consuming
  those draws shifts the whole RNG stream, so leaf and blossom placement moved.
  Proportion, silhouette, palette and character are preserved — but the artefact the
  human is reviewing has moved under them, and that is worth knowing.
- **BARE needed real work and is the weakest state.** The first attempt rendered
  info.cern.ch as an amputated stump: thick limbs ending in blunt caps, which reads as
  damage, not structure. Two compensations, both EXPERIMENT: limbs taper to a far finer
  tip when unfoliated (nothing hides a blunt branch end with no leaves on it), and
  extra ramification runs in **two generations** hosted on primaries and secondaries as
  well as twigs. Hosting it only on twigs put every fine branch at the outer tips,
  which read as a bottle-brush on a club — what was missing was the middle of the tree.
  It is now recognisably a bare tree rather than a broken one. **Whether it is
  *beautiful* is a human call and is not yet answered.**
- Nothing was done about the recorded weaknesses (leaf-size distribution, soil facets,
  edge-on blossoms). None got worse.

**Blossom distribution — the observation recorded in STATUS, in this domain's words.**
After the RNG stream shifted it is **reduced but not gone**: blossom still favours the
lower and outer crown, and the top of the canopy reads noticeably greener than the
underside. It is no longer the hard horizontal band it was. It is a consequence of the
cluster placement being volume-weighted over lobes whose mass sits low, not of anything
deliberate. **Not a verdict — it may well be charm.**

**Performance.** At grid detail 0.35, twelve trees measure 66k–282k triangles each
(~2.2M total); full detail is roughly 3× that. Frame rate was **not** reliably measured
— `requestAnimationFrame` is throttled while the preview pane is hidden, so no number
is quoted here rather than a fabricated one. Mobile remains untested.

### BARE vs SPARSE must be different architecture — EXPERIMENT

**Status: EXPERIMENT, recorded during the Gate 1 structural rebuild so it is not
rediscovered later.**

Analysis predicted that raw HTML (`info.cern.ch`, BARE) and designed minimalism
(`bettermotherfuckingwebsite.com`, SPARSE) are the pair most likely to die quietly in a
fidelity rebuild, because both are sparse trees and a better renderer makes sparse trees
prettier *in the same direction*. Same risk for BARE vs WINTER. This is the crux the
concept rests on: unstyled HTML must not read as deliberate minimalism.

**Tested on the new structural model, same seed, only architecture varied:**

| | nodes | limbs | crown | reads as |
| --- | --- | --- | --- | --- |
| BARE | 1273 | 213 | rx 2.35 / ry 2.15 / cy 4.15, trunk 8 | a mature tree with its whole branch system exposed |
| SPARSE | 402 | 61 | rx 2.75 / ry 1.55 / cy 3.45, trunk 7 | an open, wide-spreading tree carrying few limbs |

**Sparse is the BROADEST tree in the set, not the thinnest.** That inverts the obvious
move and it is the whole fix — see below.

Renders: `references/experiments/gate1-2026-09-20/pair-{bare,sparse}-architecture.png`.

**The distinction survives, and the direction is counter-intuitive: BARE gets MORE
structure, SPARSE gets LESS.** Bare is the whole skeleton on display, so its ramification
*is* the subject and it wants maximum twig order and a full crown. Sparse is a tree
wearing few leaves, so it wants fewer, shorter shoots and a smaller crown. Treating bare
as "sparse minus foliage" would collapse them — which is exactly the failure mode
predicted, and it is the same lesson the first bare attempt taught when an amputated
stump was fixed by adding ramification rather than removing it.

The levers are the second growth pass and the crown envelope: attractor count and kill
distance for the fine pass, plus crown width/height. They are independent of foliage
entirely, so the two states cannot converge by both being given fewer leaves.

#### Sparse must be broad, or it reads as deprivation — EXPERIMENT

The first attempt made sparse *small and thin*, which is the instinctive move and is
wrong. Taste's diagnosis: **losing the lower limbs is what a tree does when it is starved
of light by competition, so a tall bare column with a tuft on top says "this specimen
lost" before any other reading gets a chance.** Sparseness plus a high narrow crown is
not restraint, it is deprivation — which inverts the product's meaning, because a sparse
tree must never mean a bad website.

The fix is entirely in the crown envelope; no new logic was needed. Widen the crown past
even the bare tree's, flatten it, lower its centre, and shorten the clear trunk. **Few
limbs held WIDE read as airy and chosen; the same few limbs held narrow and high read as
stunted.** Before and after at
`references/experiments/gate1-2026-09-20/sparse-{A-stunted-BEFORE,B-broad-AFTER}.png`.

Bare was checked for the same disease and has a milder case: its clear trunk was also
long, but a dense crown compensates, and lowering its branching a little was enough. It
reads as a mature specimen rather than a deprived one.

**OPEN:** whether broad-and-open still reads as *designed restraint* rather than merely
*a different tree* once foliage returns. That is a Gate 5 question and a human one.
### Gate 1 surface pass — what a real material exposed — EXPERIMENT

**Status: EXPERIMENT.** Renders: `references/experiments/gate1-surface-2026-09-20/`.
Putting a real bark material on the tree (see VISUAL-SYSTEM.md) immediately exposed
geometry problems flat colour had been hiding. Recorded because each one will bite again.

1. **The tree was being rendered INSIDE-OUT.** Ring vertices advance N→B and three's
   Frenet frames have B = T × N, so the inherited index order `(a, b, a+1)` has its
   normal pointing *into* the limb. Measured: 1000 of 1000 trunk triangles faced inward.
   What was on screen was the inner face of each tube's far wall. A convex tube under
   flat colour looks the same either way, which is how it survived — but anything
   *inside* a limb (base caps, hidden lead-ins) showed straight through, every union
   looked like tubes passing through each other, and the lighting was wrong throughout.
   Fixed in `limbmesh.js`. **`tree.js` (the live V0 tree) uses the identical index order
   and almost certainly has the same bug** — not touched here, flagged to Lead.
2. **Unions.** A child limb now starts one segment back along its PARENT'S axis and
   curves out. Da Vinci's rule makes every child thinner than its parent, so that
   hidden stretch can never escape; starting the child at the union with a flared base
   put a disc wider than the trunk through both sides of every major fork. The lead-in
   needs real clearance (≤ 0.42–0.62 of the parent's radius): both surfaces carry ±13%
   cross-section wobble. The visible swelling at a union is now the parent's collar,
   which is the right way round anatomically.
3. **Da Vinci's rule meshes as a shelf.** It drops the radius *across* a fork — 0.287 to
   0.228 within one 0.17 segment at the first union. Radii are now relaxed along each
   chain before sweeping, which turns the step into a slope through the union.
4. **Fine shoots are not meshed on thick wood** (child radius < 16% of a host thicker
   than 0.07). Space colonization sprouts them straight from the bole and up close they
   are rose thorns. Skipped at mesh time, with their subtrees, so da Vinci's thickness
   sums are untouched. Terminal limbs taper only over their last fifth, not from the
   midpoint, which had turned every shoot into a cone.
5. **`minStub` in the committed Gate 1 URLs never did anything.** The parameter was not
   wired into the page when those renders were made, so `minStub=5` was ignored and the
   reviewed trees were pruned at the 2-segment default. The presets in `gate1.js`
   (`?preset=bare|sparse`) reproduce the trees that were actually judged: 1273 nodes /
   213 limbs and 402 / 61.
6. **OPEN: the trunk base is a cylinder again.** `assignRadii` clamps at 0.34 and the
   bare tree's tip count now exceeds it, so the bottom five trunk nodes are all 0.34 and
   the proportional taper is flattened exactly where root flare should begin. Raising
   the clamp thickens the whole base, which is a proportion call — not taken here.
7. **Twigs remain the weakest part**, now more visibly so: smooth, uniform, all curving
   alike. Unchanged by this pass, and still coupled to trunk thickness through da Vinci.

Resolution is now spent where the radius is: 56 radial segments on the trunk down to 8
on shoots; 167k triangles for the bare tree, 76k for sparse (was 37k / 12k).

### Shoots: the thorns were the RADIUS LAW, not the twigs — EXPERIMENT

**Status: EXPERIMENT.** Renders, with before/after:
`references/experiments/gate1-twigs-2026-09-20/`.

Twigs had read as thorns, then tentacles, through every Gate 1 pass, and good bark made
them the worst thing in the frame. Tip shaping and a young-wood material changed nothing
visible, and the unchanged triangle count was the clue: no limb was ever thin enough to
reach the thin-shoot code paths. Measured on an UNBRANCHED shoot:

> base-to-tip radii 0.0257, 0.0240, 0.0223, 0.0204, 0.0184, 0.0161, 0.0135, 0.0101, 0.0040

A 6.4:1 cone, jumping 0.004 → 0.0101 in its first segment. The cause was the constant
`grow` term in `assignRadii` — added in the first radius pass so unbranched limbs would
thicken toward their base, noted at the time as "enormous on a twig" when the proportional
`taper` was introduced, and never removed. **No material or tip treatment can fix a
silhouette that comes from the radius law.**

**Fix:** secondary thickening fades in with thickness (`shootR`) instead of applying from
the tip — a current-year shoot holds its diameter; wood thickens as it ages. Shoots now
run 0.0044 → 0.0040, parallel-sided. Because that term had been doing most of the
thickening, the trunk collapsed (first fork 0.296 → 0.118) and `grow` was **re-matched by
measurement** to the reviewed trees rather than by eye: 2.8e-4 for bare (fork 0.2944 vs
0.2955), 1.48e-4 for sparse (0.166 vs 0.1656 — fewer segments to accumulate over, so it
needs its own value). Proportions are as judged; only the shoots changed.

Shoots also gained what the uncoupled brief asked for: a world-unit tip (short narrowing,
ovoid bud, closed point) rather than a fraction-of-length taper that made long shoots into
needles; node swellings, which `bark.js` darkens at the same positions via a shared
`nodePulse` (golden-ratio jitter, because a sin-hash disagrees between float64 on the CPU
and float32 on the GPU); and a young-wood material that darkens and reddens toward the
newest growth, with striation and lenticels. Against sky a twig reads DARK — pale tan
shoots were half of the tentacle reading.

**OPEN — for the twig/proportion joint tuning Taste holds:**

- **A missing middle order.** Thick limbs now carry hair-thin shoots with little between.
  That is honest — a branchlet bearing five twigs *is* thin — and real trees close the gap
  with far more twigs per branch. It is a density question, so it is coupled.
- Shoots at radius 0.004 may drop out at thumbnail size. `tip` sets the whole thickness
  ladder, so that too belongs to the joint tuning.
- The trunk-base clamp (0.34) still flattens the bottom of the bare trunk.

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
