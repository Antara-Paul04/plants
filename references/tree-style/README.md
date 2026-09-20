# tree-style/

Reference material for the 3D tree aesthetic. Owned by `taste`.

**Status: EXPERIMENT.** This board defines the *target* for the high-fidelity phase. It
is not an approved visual system — [VISUAL-SYSTEM.md](../../docs/VISUAL-SYSTEM.md) is
still OPEN, and nothing here overrides [TASTE.md](../../docs/TASTE.md).

Per [references/README.md](../README.md): nothing is listed here that was not actually
looked at. No references cited from memory.

---

## The question this phase turns on

> **What makes an expensive-looking 3D tree look expensive?**

**Answer: it is proportion and topology, not resolution.** Every way the current tree
reads as an asset-store model is an error you could not fix by adding a single triangle
— and every one of them is fixable at low polygon count.

The three defects below were measured against the baseline in
[`../experiments/before-2026-09-20/hero-cern-bare.png`](../experiments/before-2026-09-20/hero-cern-bare.png),
and each has a published botanical target rather than an opinion behind it.

### 1 · The taper law is broken

Leonardo da Vinci's rule: **the summed cross-sectional area of the daughter branches
equals the cross-sectional area of the mother branch.** Area-preserving, so the
exponent is 2.

For a two-way split that means each child radius ≈ **0.71 × parent** (1/√2). Real trees
deviate — the PLOS study finds the daughter/mother ratio drifts from 1.0 as branching
angles and lateral daughter weight increase — so **0.70–0.80 × parent is the usable art
-direction band**, with the lower end for symmetric forks and the upper end for a
dominant leader with a small lateral.

*Baseline fails this.* The two limbs leaving the main fork are roughly 0.85–0.90 × the
trunk. Children nearly as thick as their parent is the single largest reason the tree
reads as welded tubes rather than as something grown.

### 2 · Junctions are steps, not unions

Real branch attachments have two features, both absent:

- a **branch collar** — a swollen area at the base of the branch formed by interlocking,
  overlapping layers of branch and trunk wood. It *flows and swells*; it does not step.
- a **branch bark ridge** — raised, roughened, usually darker bark at the top of the
  union, running from the crotch down both sides of it.

*Baseline fails this.* Junctions telescope: a visible collar-like flange and an abrupt
diameter step where one tube enters another. That is the opposite shape from a real
collar, which is continuous.

### 3 · There is nowhere near enough ramification

Branching orders in real crowns: **3–5 for old, mature, shaded trees; 7–15 for young,
vigorous, full-sun trees.** Branch counts between successive orders hold a roughly
constant bifurcation ratio (Horton's law of stream numbers), so twig count grows
geometrically with depth — at a ratio of 3–4, six orders gives several hundred terminal
twigs.

*Baseline fails this.* It resolves in about **three orders and roughly thirty visible
twigs**, and the terminal twigs are single straight unsubdivided segments. Three orders
is the *bottom* of the range for an old shaded tree, which is not the subject.

### The correction to "it is never polygon count"

The prior is right in substance and slightly wrong in wording. Fixing defects 1 and 2
adds no geometry at all. But defect 3 genuinely does mean *more elements* — going from
30 twigs to 300 is more stuff in the scene.

The distinction that matters: **count at the fine end of the hierarchy, never resolution
anywhere.** A convincing twig can be three triangles. What is missing is three hundred
of them, not a smoother trunk. Subdividing any existing surface would buy nothing.

---

## What the target actually looks like

**`Winter tree`** — Christine Johnstone, 2011-01-09, CC BY-SA 2.0, via Wikimedia
Commons / geograph.org.uk (file `Winter tree - geograph.org.uk - 2225248.jpg`,
1024 × 768).
<https://commons.wikimedia.org/wiki/File:Winter_tree_-_geograph.org.uk_-_2225248.jpg>

A solitary bare deciduous tree in a field. Referenced for **four specific qualities**,
not as something to reproduce:

- **The crown reads as a mass at small size.** At roughly 300px the twigs resolve into a
  soft, dense, rounded envelope — you can see where the leaves would be. This is the
  Gate 1 test in one image: our bare tree at the same size reads as a Y with spikes.
- **A continuous size gradient** from trunk through major limbs to a peripheral haze,
  with no step at which you can say "this is where the twigs start".
- **A short thick trunk dividing low**, so the crown sits close over its own base.
- **Honest asymmetry** — one flank is fuller, the outline is not a circle. It reads as a
  growth history, not a generated envelope.

> Not saved locally. The file is freely licensed and could be, but downloading third-
> party images into the repository is the human's call, not an agent's. Cite the URL.

**Also on record but still not collected:** the human's original low-poly
cherry-blossom-tree-on-an-island render, referenced in
[VISUAL-SYSTEM.md](../../docs/VISUAL-SYSTEM.md) for canopy-to-island proportion, crown
overhang, chunky stone placement and dark-trunk-against-bright-canopy contrast. It
should live here.

---

## Human-supplied direction — 2026-09-20

**This supersedes the bark direction the surface work was heading toward.**

### 1 · A stylised 3D tree (image supplied in conversation, not yet saved)

The named target for surface language. Referenced for:

- **warm light-tan trunk** carrying only broad, soft, low-contrast grooves — no deep
  fissuring
- **smooth flowing root buttress** into the ground
- **large, individually readable leaves** — clear teardrop shapes in two or three bright
  greens, not a uniform green mass
- **matte throughout, zero specular sheen** — clay or marzipan, never polished wood
- soft even light with gentle occlusion; no harsh shadow

Explicitly rejected by the same direction: **deep fissured veteran-oak bark.**

### 2 · Pinterest board "foliage props" — 24 pins, `pinterest.com/justo409/foliage-props`

Supplied as component inspiration. A login wall blocked all but ~6 pins; those seen
were lupine and foxglove flower spires (purple / pink / white / cream), ivy and vine
leaf sheets with small pink flowers, a wildflower meadow sheet, pink blossom clusters,
and a faceted mossy rock cluster on a grass base. Board keywords: *cartoon tree assets,
tree game asset, toon tree*.

The consistent quality across them, and the reason it is here:

- **componentised** — flowers, leaf clusters, vines and rocks authored as identifiable
  units, not scattered primitives
- **flowers have species character** — lupine spires, blossom clusters — rather than
  generic five-petal dots
- **leaf clusters are the unit**, not the individual leaf card
- hand-painted, soft-shaded, clean silhouettes, saturated but not garish

### The reconciliation, which matters

This does **not** reverse the structural work, and it does not contradict the earlier
rejection of "asset-store look". The earlier direction rejected *crude* simplification;
these references are *refined* simplification. Correct taper, real junction anatomy and
deep ramification are all visible in reference 1 and all still required.

> **Form stays botanical. Surface simplifies.** What simplifies is material and detail,
> never proportion or topology.

**Neither reference is saved locally.** Reference 1 was pasted into conversation;
reference 2 is behind a login. Both should be captured into this folder — as should the
human's original cherry-blossom render, still uncollected. That is the human's call to
make, not an agent's.

---

## GATE 1 — the naked structure

**The tree is rendered with zero foliage and must stand alone as a sculptural object.**
Signed off by `taste` before foliage is allowed to hide anything. A bare tree that is
merely better than the baseline is not a pass.

Judged at **three sizes** — thumbnail (~140px), hero, and close — and from **at least
four azimuths**, because the baseline's predecessor was strong from two angles and
lopsided from a third.

| # | Criterion | Fails if |
| --- | --- | --- |
| 1 | **Taper** — every child 0.70–0.80 × its parent radius, no exceptions along any path root-to-tip | any junction where a child reads as thick as its parent |
| 2 | **Junctions** — swell and flow out of the parent, with a ridge at the top of the union | any visible telescoping step or floating flange |
| 3 | **Ramification** — 6+ orders, several hundred terminal twigs, continuous size gradient | you can count the twigs; or a visible step where "twigs" begin |
| 4 | **Terminations** — every tip tapers to a point or a bud | any flat or blunt-chopped end anywhere |
| 5 | **Crown envelope at thumbnail** — resolves into a soft rounded mass, not a spray of sticks | reads as a Y with spikes at 140px |
| 6 | **Growth history** — asymmetry, a dominant leader, stunted and out-competed limbs | limbs leave at similar angles with similar lengths |
| 7 | **Root flare** — the trunk widens into the ground | the trunk enters the turf as a cylinder |
| 8 | **Bark** — describes the form's curvature | flat-shaded facet patches reading as modelling errors, or noise for its own sake |

**Two standing constraints this phase may not trade away:** the tree must work at two
distances (silhouette at thumbnail, real reward close up), and the narrow-FOV miniature
feel — the prototype's strongest single discovery — is not discarded casually.

**The bar:** something you would stop scrolling to look at. Not "improved".

### Result, as of `db716de` — **REVISE**

Held by `taste`. Foliage may not start. Recorded here because a verdict that lives only
in messages keeps getting lost.

| Criterion | | Note |
| --- | --- | --- |
| 1 taper | **PASS** | da Vinci holds along every path traced |
| 2 junctions | **PASS** | collars swell and flow; no telescoping |
| 3 ramification | FAIL | depth 4–5, ~290 tips at best |
| 4 terminations | FAIL | flat cuts |
| 5 crown mass at thumbnail | FAIL | too sparse reads as a post; too dense reads as a solid knot |
| 6 growth history | partial | asymmetry present, twig spacing too regular |
| 7 root flare | untested | grass height |
| 8 bark | untested | no material strategy yet, by design |

Criterion 5 is the blocker. The constraint is **shoot shape, not shoot count** — see the
note on terminal-order mechanism in `docs/TASTE.md`.

---

## KIND vs STATE — the test for whether a proposed species is real

**Status: TENTATIVE.** Reasoned from branching architecture, not yet used on a real
case. Written down so the species proposal is judged against a criterion set in
advance rather than one invented to fit whatever arrives.

> **Strip both trees to bare wood. If they still read as different, they are different
> KINDS. If they become the same tree, they were one kind in two STATES.**

A **state** leaves the architecture untouched and changes only what hangs on it, or
what colour it is: bare, sparse, lush, flowering, autumn, winter, fruiting.

A **kind** is a different branching architecture. The load-bearing differences:

- whether a **central leader persists** — *excurrent* (one dominant axis its whole life,
  subordinate laterals, conical silhouette) versus *decurrent* (the leader gives up
  early, the crown is built of co-dominant forks, rounded silhouette)
- whether branching is **rhythmic** (regular whorls at intervals) or **opportunistic**
  (wherever light allows)
- or, for palms, **no branching at all** — an unbranched column with a terminal rosette,
  which is neither of the above rather than a variant of one

**Why this criterion and not another:** it is decidable by looking, it cannot be faked
by colour, flowers or season, and we already own the instrument — it is exactly the
Gate 1 naked-structure view.

**The rule it produces:** *any proposed new species must justify itself at Gate 1, with
no foliage, no flowers and no colour.* If an archetype cannot produce a visibly
different **bare** tree, it is not a species — it is a state, and the effort belongs in
the state machinery instead.

It also filters the forbidden mappings for free. A species must be argued from branch
architecture, which is a structural claim about a site. "This site is a restaurant" or
"this site is Japanese" cannot produce a bare-tree justification, so it cannot get
through this gate wearing a lab coat.

---

## Rejected, on the human's instruction

asset-store look · generic game vegetation · procedural broccoli · cauliflower canopy ·
random foliage scatter · fake realism · plastic leaves · noisy bark · bad flower
placement · branches hidden by foliage because the structure is weak · obvious repeated
meshes · over-detailed clutter · realistic elements clashing with the diorama
presentation · **anything merely "technically better"**.

---

## Sources

- Leonardo da Vinci's rule and the pipe model — <https://pmc.ncbi.nlm.nih.gov/articles/PMC5906905/>
- Deviation from da Vinci's rule with branch angle and load — <https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0093535>
- Branch collar and branch bark ridge — <https://www.pubs.ext.vt.edu/430/430-456/430-456.html>
- Branching orders per crown type; Horton's law of stream numbers — <https://bugwoodcloud.org/resource/files/25401.pdf>, <https://arxiv.org/pdf/0910.4795>
- Reference photograph — <https://commons.wikimedia.org/wiki/File:Winter_tree_-_geograph.org.uk_-_2225248.jpg>
