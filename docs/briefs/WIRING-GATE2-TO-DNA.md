# Brief — wire the Gate 1/2 tree to DNA

**From:** Lead · 2026-09-20
**To:** `visual-3d` (owner of the seam and the bug), `web` (owner of the swap)
**Status:** the single biggest unblock left in the project.

---

## The situation in one paragraph

There are two trees alive. The **new** one (`prototype/gate2.html`, port 5188) has the
chunky SDF limbs, clay bark, root flare, foliage, flowers, fruit and the night state — it
is the tree we have been art-directing for a week. The **old** one (`prototype/src/tree.js`,
served by `app/server.js` on 5170) is what the product actually renders. Every tree in the
56-site survey is the old one. The new tree currently grows exactly one hand-authored seed
and does not know what website it is looking at. So: **the beautiful tree can't respond to a
URL, and the tree that responds to a URL isn't the beautiful one.** Closing that is this brief.

---

## Part 1 — the seam (visual-3d)

`prototype/src/gate1.js` is already configured entirely by a flat bag of values. Today that
bag is `URLSearchParams`, read through two helpers:

```js
const num  = (k, d) => (q.has(k) ? parseFloat(q.get(k)) : (k in preset ? preset[k] : d));
const hexq = (k, d) => (q.has(k) ? parseInt(q.get(k).replace('#',''), 16) : d);
```

Every tunable in the new tree already flows through those two functions plus `q.get(...)`.
**That is the seam, and it is a good one.** The job is not to rewrite the renderer — it is to
introduce one function that turns DNA into that bag, and to make `q` one of two possible
sources rather than the only one.

Proposed shape (name things as you see fit):

```
dnaToParams(dna) -> { preset, envstate, leaves, flowers, form, fc, fc2, fruit, fruitc,
                      seed, perCluster, leafSpacing, leafOuter, ... }
```

with `gate1.js` resolving `params = dnaToParams(dna) merged-under URLSearchParams`, so that
**query params still override** — that debug surface has been worth a great deal and must not
be lost. Keep `?leafHide=1`, `?shot=`, `?envstate=` working exactly as they do now.

The mappings 3D already named in `references/experiments/gate2-foliage-2026-09-20/REPORT.md`
are the starting point and are **not in dispute**:

| DNA | drives |
| --- | --- |
| `foliage.state` (bare/sparse/normal/lush) | cluster count, leaves per cluster, spacing, `leafOuter` |
| `foliage.density` | within-state variation of the same |
| `botanicalState` (summer/autumn/winter) | the leaf greens, and the ground grade |
| `skeleton.complexity` | which structure preset, and the space-colonization budget |
| `morphology` | limb angle, taper, crown shape — **the species lever, still the least wired** |
| `flowers.primary` / `.secondary` | `fc` / `fc2` |
| `flowers.amount` | `flowers=few\|medium\|abundant` |
| `fruit` | `fruit=1`, `fruitc`, `fruitSites` |
| `background` | `envstate` (`day` / `night`) |
| `seed` | `P.seed` — **and note `flowerRng` is `seed*7+101`, `fruit` is `seed*11+303`** |

**Open, and yours to propose rather than mine to decide:** nothing in the DNA contract
currently selects a flower **form**. `blossom` / `magnolia` / `wisteria` is a property of the
tree, and right now it defaults to `blossom` always. Either `morphology` implies it, or the
contract in `docs/BOTANICAL-DNA.md` needs a new field. Say which, with a reason — that is a
contract change and it comes to me before it lands.

---

## Part 2 — the swap (web)

Once `dnaToParams` exists, `app/server.js` serves `/tree/*` from `prototype/src` already.
The work is:

1. Point the product at the new renderer instead of `tree.js`.
2. Keep the state machine (`IDLE → ANALYZING → GROWING → READY|ERROR`) exactly as is.
3. **`GROWING` now has real work to do.** The old tree was instant. The new one spends
   1.5–2.5 s in the implicit-surface build (see Part 4). The loading state stops being
   decorative and becomes load-bearing — it must not look frozen, and the SDF build must not
   block the main thread hard enough to stall the spinner.
4. Re-run the 56-site survey against the new renderer. **The survey we have is now a
   historical document about the old tree.** Nothing in it should be cited as evidence about
   the new one, including by me.

Do not start 2 before 1 lands. Do 4 last.

---

## Part 3 — a ship-blocking bug, verified (visual-3d)

**The island is inside-out. You can see through it to its own far wall and to the trunk's
taproot hanging in the cavity.** The user caught this; I verified it numerically.

`prototype/src/island.js`, the soil body, line ~167:

```js
sideIdx.push(a0 + i, b0 + i, a0 + j,  b0 + i, b0 + j, a0 + j);
```

With `x = cos(a)`, `z = sin(a)` and `b0` the ring *below* `a0`, that winding makes every
triangle face **inward**. I replicated the ring construction standalone and tested facing
against the radial direction: **84 of 84 triangles inward.** Reversing to

```js
sideIdx.push(a0 + i, a0 + j, b0 + i,  b0 + i, a0 + j, b0 + j);
```

gives **84 of 84 outward**. The bottom tip fan on the next line has the same defect
(`last+i, tipI, last+j`) and wants the same treatment.

**Why it hid for so long, which is the interesting part:** the grass dome above it uses the
*identical* winding — and is immune, because it never calls `computeVertexNormals()`; it
pushes `(0,1,0)` for every normal by hand. The soil body uses the same winding and *does*
call `computeVertexNormals()`, so it inherits the error. Two meshes, one convention, only one
of them exposed. That is worth a line in `docs/VISUAL-SYSTEM.md`, because this is the
**fourth** time inside-out or unclosed geometry has cost us a day: the V0 trunk (1000/1000
inward), the Gate 1 trunk, the open limb tubes that read as "hollow branches" at the forks,
and now this.

Suggested standing rule, for you to word properly: *any geometry built by hand that calls
`computeVertexNormals()` gets a facing assertion in its build, counting triangles whose
normal disagrees with the expected outward direction, and logs if the count is non-zero.*
Cheap, runs once, and would have caught all four.

While you are in there: the trunk's taproot continues below the grass plane into the cavity.
Once the soil is opaque it is hidden, so it is not independently a defect — but confirm that
rather than assume it.

---

## Part 4 — the constraint that shapes everything above

| | triangles | build |
| --- | --- | --- |
| wood (implicit surface) | 212k | **~1.5–2.5 s** |
| foliage | 278k | ~15–25 ms, 4 draw calls |
| flowers | 76–90k | ~17–23 ms, 3 draw calls |

Foliage and flowers are free. **The implicit-surface wood is the entire performance problem**
and it is now on the product's critical path, not a prototype's. ~490k triangles for a full
tree, untested on mobile. This is not a request to optimize it today — it is a statement that
the number is now a product number, and that Part 2 step 3 exists because of it.

---

## Part 5 — two observations on the flowers, for Taste not for 3D

Not defects. Questions I do not have the authority to close.

1. ~~**The bloom sits almost entirely on the outer silhouette.**~~ **WITHDRAWN — I was wrong,
   and the correction matters.** I wrote that the ring was botanically right, blossom sitting
   on peripheral new growth, and possibly the reason the colour reads at thumbnail size.
   visual-3d had already diagnosed it properly and I confirmed their debug render myself:
   render `?flowers=abundant&leafHide=1` and the bloom is **evenly distributed over the whole
   crown, centre and front included**. Identical flower positions with leaves on produce the
   wreath. So the ring is not placement and it is not botany — it is **occlusion**: full-size
   leaf clusters on the few front-facing limbs cover the bloom behind them, and only the rim,
   which has no leaves in front of it, survives into the silhouette. Anyone reasoning about
   this from the hero render alone will reach my wrong conclusion. Use `leafHide=1`.
2. **Blue blossom reads measurably weaker than pink or red at 140 px.** The pale-toward-the-
   edge trick does work, but blue still sits closer to canopy green in value than the warm
   hues do. Since accent colour is how the *website* reaches the tree, and a lot of the web is
   blue, this matters more than one variant's worth.
3. Unprompted: **wisteria is the strongest thing in the set**, because it changes the tree's
   *silhouette* rather than its colour — it hangs below the crown and is identifiable at
   thumbnail size with the colour thrown away. Every other flower variant is a recolour. If
   morphology is ever to read at small size, that is the proof it can.

---

## One correction to something I told the user

I said the HUD reading `bare` over a full crown meant the state plumbing was broken. It does
not. `gate1.js:432` prints `q.get('preset') || 'bare'` — the *structure* preset, whose default
is named `bare`, meaning bare-tree **architecture**. It has nothing to do with foliage. The
label is confusing but the plumbing is fine. Renaming that preset would be kind; it is not a bug.

---

## Order of work

1. visual-3d: Part 3 (the island). It is a one-line fix plus a guard, and it blocks every
   capture we take from here on.
2. visual-3d: Part 1 (`dnaToParams`), and come back to me on the flower-form contract question.
3. web: Part 2, steps 1–3.
4. web: Part 2, step 4 — re-survey.

Report to Lead. Do not commit to `main`; I integrate.


---

## Lead rulings — 2026-09-20, in response to visual-3d's Gate 2 report

Three of these are mine to close and I am closing them. Where a call is Taste's I say so.

**R1 — No lightness lift on cool accents. DECIDED.** 3D built `lift` and reports it reads no
better at 140 px while making the bloom less the site's actual colour. D5 is that flowers are
how the website's colour reaches the tree; a lift trades the thing D5 exists to deliver for
no measured legibility gain. The pale-toward-the-edge petal gradient stays as the mechanism —
it buys value contrast without touching hue. Ship `lift=0`. Keep the parameter.

**R2 — `abundant` means the tree flowers BEFORE it leafs. DECIDED (semantics), Taste (number).**
This is the unpulled lever 3D named, and the `leafHide=1` render is the argument for it: it is
the most beautiful thing Gate 2 has produced. It is also botanically literal — Prunus,
Magnolia and Cercis all bloom on bare wood before foliage. So `abundant` is not "the same tree
with more flowers on it"; it is a **different phase of the year**, where bloom dominates and
foliage recedes hard. That widens the top of the ladder, which we need: 3D reports `few` vs
`medium` already differ less at 140 px than `medium` vs `abundant`, and the middle collapse is
the project's central problem. Pushing `abundant` further from `medium` is worth more than
tuning `few`.
*Mine:* what `abundant` means. *Taste's:* how far `leafAtBloom` actually drops, and whether it
ramps with amount or steps at `abundant`.

**R3 — Triangle budget is now a product number. NOTED, not yet decided.** Abundant magnolia is
+230k on top of the ~490k tree: **~720k triangles, untested on mobile**, on top of a 1.5–2.5 s
implicit-surface build that is now on the product's critical path. I am not asking anyone to
optimize today. I am recording that the most expensive DNA combination is one analysis can
legitimately produce, so "fine in the prototype" has stopped being the relevant test.

**R4 — Which forms stay: TASTE'S, with one input from me.** 3D reports magnolia and wisteria
are the most distinct at 140 px and blossom the most generic. That is an argument against
`blossom` as the universal default, which is what it is today. Note this couples to the open
contract question in Part 1 — if form rides on morphology, "which forms stay" and "what
selects a form" are one decision, not two.

**R5 — The wreath is not closed and should not be reported as closed.** `leafAtBloom=0.55`
improved it; 3D says so explicitly and I agree. R2 may close it at `abundant` specifically.
It remains open at `medium`.

---

## R6 — Foliage density SATURATES at 227 clusters, and the limiter is the skeleton

Added after the human said the trees "seem very scarce, like there are not a lot of leaves."
They are right, and the cause is not in `leaves.js`.

I ran a density ladder on `preset=chunky`, seed 7, varying only the attachment parameters:

| `leafSpacing` | `perCluster` | `leafMaxR` | `leafOuter` | **clusters** | leaf tris |
| --- | --- | --- | --- | --- | --- |
| 0.40 (default) | 17 | 0.12 | 0.78 | **146** | 278k |
| 0.26 | 24 | 0.18 | 0.62 | **190** | 511k |
| 0.17 | 30 | 0.26 | 0.48 | **227** | 763k |
| 0.12 | 34 | 0.34 | 0.34 | **227** | 864k |

**The last two rows produce the identical cluster count.** Below `leafSpacing ≈ 0.17` the
attachment generator stops finding new places to put a cluster; the extra 100k triangles in
the bottom row are purely `perCluster` and `leafLen` inflating clusters that were already
there. Density has a hard ceiling at 227, and it is not a foliage ceiling — with 47 limbs and
46 forks **the tree simply runs out of twig to hang leaves on.**

Two consequences, and the second is the serious one:

1. Pushing `perCluster` past ~30 buys triangles, not canopy. The honest lever above 227 is
   **leaf size**, and that changes species read, not density.
2. **This is the middle collapse, in geometry.** If foliage saturates at 227 clusters then
   `foliage.density` from DNA has very little room at the top of its range — `normal` and
   `lush` are being asked to differ along an axis that is already near its stop. 3D's own
   140 px finding (day full, day sparse, night full, night sparse all resolve as "a crown
   MASS") is the same fact seen from the other end. We have been trying to fix the middle
   collapse in analysis, in thresholds, in banding. **Part of it is that the renderer cannot
   express the top of the range**, and no amount of re-banding upstream fixes that.

**The real lever is terminal branching — more, finer twigs at the crown edge — which is
Gate 1, not Gate 2.** I am not reopening Gate 1 by fiat; the skeleton was signed off and that
sign-off stands. I am recording that `foliage.density`'s useful range is bounded by it, so
whoever tunes the DNA bands should know the top of the ladder is compressed before they
start. visual-3d: if raising terminal branch count is cheaper than I think, say so.

For now the best-looking full canopy in the ladder is row 3 (`leafSpacing=0.17`,
`perCluster=30`, `leafMaxR=0.26`, `leafOuter=0.48`) — solid, no see-through, still reads as
leaves rather than topiary. Row 4 costs 13% more triangles for no visible gain.
