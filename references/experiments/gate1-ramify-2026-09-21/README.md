# Gate 1 — crown ramification — 2026-09-21

**RESULT: NOT PASSED. Three critique→revision cycles (the project's limit), nine blind verdicts,
and no candidate met the bar in any of them.** The work is in the tree behind a switch that is
OFF by default (`ramify=1` to see it), and `ramify=0` is today's tree bit for bit. This file is
the record: what was found, what was built, what the panel said, and why more tuning of this
generator is the wrong next step.

Code: `ramifyLimbs` in `prototype/src/branching.js`; the `ramify` block and `RAMIFY_DEFAULT` in
`prototype/src/grow.js`; one line in `prototype/src/woodsdf.js` (`L.blend`).

## 1. Cost — measured FIRST, and it is not the problem

Bare tree, seed 7, quiet machine (load 3.3), URL parameters only:

| limbs | segments | field ms | wood ms | triangles |
| --- | --- | --- | --- | --- |
| 47 (today) | 456 | 885 | 1628 | 212k |
| 100 | 735 | 997 | 1821 | 292k |
| 166 | 938 | 1052 | 1418 | 341k |
| 227 | 1636 | 1333 | 1924 | 446k |

The wood field splats each capsule segment into a box sized by its own radius, so the trunk and
the primaries ARE the cost and a thin limb is nearly free: 2.1x the limbs is +13% field. (Wood ms
wobbles ±200 between loads; read the field column.) The final cycle-3 tree is 93 limbs / 231k
triangles. **Its build time was never re-measured on a quiet machine** — every later load ran at
load 10–40 — so that number is still owed.

## 2. Where the antlers come from — one line of the radius law

`assignRadiiRatio` caps a limb's base at 16% of its LENGTH ("a short limb cannot carry a fat
base"). 16% of length as a RADIUS is a length:diameter of **3.1:1** — so the law permitted a 3:1
stub, and 3.1 was exactly the worst shoot measured. Today's bare tree: 47 limbs, 4 orders,
terminal shoots median **5.4:1**, **59% under the 6:1 floor**.

And the count cannot be bought with more attractors — that makes it WORSE: 59% of shoots under
6:1 at 47 limbs, **79% at 100, 89% at 166**. More attractors buys more short prongs.

Criteria 1 and 3 also pull against each other (now noted beside the criteria in
`references/tree-style/README.md`): "child 0.70–0.80 x parent" plus "6:1" means a shoot leaving
radius 0.15 must be 1.35 long. Space colonization sprouts short laterals off thick wood all the
time; those satisfy neither rule. They are the prongs.

## 3. What was built (all behind `ramify=1`)

1. a terminal shoot may grow on, to earn the thickness its host gives it;
2. its base is capped by its OWN length — 7–11:1 drawn per shoot, **6:1 by construction**;
3. a lateral the cap leaves under half its host is a thorn on a bole, and is dropped;
4. new shoots are SPROUTED on thin wood, born the right length — acrotonic (crowding toward the
   host's tip, the nearest the most vigorous), on a loose phyllotactic spiral, never a comb;
5. nothing grown here may leave the crown's asked-for envelope (`reach`);
6. every tip tapers; a shoot bends more the further it has grown; a shoot leaves its host through
   a collar sized from the HOST (`L.blend`, read by the wood field);
7. hooks and rings are cut where a limb has turned ~112° from its first heading, and REGROWN;
8. terminal shoots may end in a fork.

Measured, cycle-3 tree, seeds 7 / 3: **93 / 90 limbs, 6 orders, 0% of shoots under 6:1**
(min 6.3 / 6.0, median 7.5 / 7.9, measured from the host's SURFACE, because that is what an eye
measures), crown exactly on its asked envelope (top 6.15 of 6.3, radius 2.89 of 2.9). The count is
just under "roughly 100–150": cutting hooks costs limbs. Cycle 2 reached 124 before that.

**The way back is proven, twice** (after cycle 1 and again after cycle 3): HEAD's `branching.js`
and `woodsdf.js` run beside the new ones in the page, 3 structures x 3 seeds — every node position
and radius `Object.is`-identical, the RNG stream left in the same place (so wood, leaves and bloom
downstream cannot move), and the wood mesh vertex-for-vertex identical on the five tested.

`envelope` is 1 by default ON PURPOSE. Drawing the growth cloud in (0.9) regrows a different
skeleton: on `sparse` it took the crown from radius 2.57 to 2.32, and narrow is the one thing
sparse may never be. At 1 the architecture is today's to the node — a site keeps its trunk and
primaries when the switch flips.

## 4. The panel — blind, three lenses, three cycles

Independent read-only judges, told nothing about how a candidate was made or which was today's
tree (it was in every round under a different letter). Four azimuths at hero size, the same four
at a true 140px, one close view. `candidate-*.png` are the sheets they saw.

| cycle | criteria | thumbnail & feel | adversary |
| --- | --- | --- | --- |
| 1 | T › M › P › **today** | M › T › **today** › P | T › M › **today** › P |
| 2 | H › W › R › **today** | W › H › **today** › R | R › W › **today** › H |
| 3 | B=F › Q › **today** | **today** › Q › B=F | Q › B › F › **today** |

- **Nothing passed, in any of the nine.** "Would any make you stop scrolling? No. Not one."
- Today's tree was last or second-last in 8 of 9, and named every time: "antlers", "coral",
  "a hat rack with foliage", "clubbed, hook-ended tips in a repeated motif". A ramified tree was
  first in 8 of 9.
- **One judge measured instead of looking** (cycle 2, criteria: erosion granulometry and
  skeletonisation on the masked silhouettes) and confirmed the shoot numbers from the pixels
  alone: today's tree "median 3.7:1 — 100% of its free shoots fall below the 6:1 minimum… the
  only one I'd call a failure against the written criteria"; the second-seed ramified tree
  "median 7.9:1, max 13.2:1 — PASS, the only one". Its one change: **a leader.** "Every one
  resolves from trunk into a symmetric vase of three to five co-dominant limbs… nothing that got
  shaded out and stalled, no history. Give it apical control." 
- **The exception is the most useful verdict of the lot.** Cycle 3's thumbnail judge put today's
  tree FIRST: at 140px the ramified trees are "a grey fuzz — every twig is the same weight as
  every branch", and today's is "the only one that reads as a tree, and as an object". The same
  judge called the ramified tree the BEST skeleton for a foliated crown and today's the worst
  ("a hollow shell with foliage only at the rim") — "exactly inverted… which is the real story".
- Moved from FAIL to PASS between cycle 1 and cycle 3 (criteria judge): **junctions**, **terminations**.
- B and F (forks on / off) were called "the same image" by all three. Terminal forks do not read.
  A negative result, kept.

## 5. Why it did not pass, and why tuning will not fix it

Three things, and every judge of the last round found them from a different side:

1. **One calibre beyond order 2.** "The size gradient stops after the first fork." A lateral takes
   0.75 of its host's LOCAL radius, and it leaves from the outer, already-tapered part of the
   host — so the effective step per order is about 0.45, and from a 0.31 trunk the tree reaches
   the floor (`tipMin` 0.034, the art direction's "chunky to the tip") in two or three orders.
   Everything outward of that is one thickness: macaroni at hero size, haze at 140px. **This is
   the art direction's own tension** — chunky to the tip versus a gradient that continues all the
   way out — and it is not a parameter.
2. **The crown is a shell.** From azimuth 180 every candidate is "a hollow bowl". The growth cloud
   is hollowed underneath by design and colonization fills the shell; shoots lean outward.
3. **Hooks, and no shoot that bends and thins in one stroke.** They come from colonization's tips
   circling their last few attractors. Cutting and regrowing removes some and costs limbs.
4. **No leader.** Space colonization with two children per node and a symmetric cloud grows a vase
   of co-dominant limbs by construction. Growth history — a winning axis, laterals subordinate to
   it, some stalled — is criterion 6, was never passed by any candidate including today's, and is
   an ARCHITECTURE property that no amount of work on the shoots can reach.

The adversary's closing judgement, which I think is right: "four different points in the parameter
space are failing identically — a signature of the growth model, not of its parameters… More
tuning of this generator will produce a fifth sheet with the same close view."

## 6. What it IS good for — measured, not yet judged

Foliage, same seed, same leaf spacing (0.40):

| | clusters | attachment points in the crown's middle third on screen | …facing the camera |
| --- | --- | --- | --- |
| today | 146 | 15 | **4** |
| ramified (124 limbs) | **323** | 40 | **14** |
| ramified, spacing 0.86 (same leaf, same cost) | 174 | 22 | **9** |

The ramified tree no longer runs out of twig (the old ceiling was 227 clusters), and it puts two
to three times as many camera-facing attachment points in the middle of the crown — the hollow
shell behind the wreath, behind `medium` failing the bloom ladder, and behind foliage density
saturating. **At unchanged spacing it also doubles the leaf triangles (278k → 615k) and buries the
structure**, so the foliage ladder in `dna-params.js` would have to be re-calibrated (about x2.15
on spacing for `bare`) before this could ship for leafy trees. No leafy tree was put to a panel.

## 7. Recommendation

- **Do not flip `RAMIFY_DEFAULT`.** Nothing passed, and the one judge who looked hardest at the
  feed preferred today's tree there.
- The bare tree and the leafy tree want OPPOSITE skeletons — a bold armature for the 140px
  silhouette, many fine twigs through the volume for a crown. One structure will not serve both.
  Whether ramification ships only under foliage (where its twigs are attachment points, mostly
  hidden) is a product decision, and it needs its own panel on LEAFY trees against Gate 2.
- If the bare tree is pursued, the next hypothesis is CALIBRE, not count — and because it sits on
  the chunky-versus-gradient tension it should start with the human's eye, not end with it.
- `sparse` keeps its count (Lead's ruling). The shoot rule alone barely touches it: its limbs are
  already long (median 9.6:1, 17% under 6:1).
