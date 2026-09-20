# Structural archetypes — phase one (BLIND)

> **EXPERIMENT.** Clustered with no reference to what the output is for. Groups carry
> letters, not names. No target list was consulted while measuring or clustering.
> n=34 sites. Probe: `probe/structure.js`, raw data `results/structure-extended.json`.

---

## Headline

**Real websites do not form discrete structural archetypes. Structure is a continuum
with exactly one genuine discontinuity.**

This is a negative result and it is well supported.

| test | result |
| --- | --- |
| Silhouette, all k from 2–7 | **0.21–0.52** — never reaches "reasonable" (0.5) except at k=2, which is only "canvas vs everything" |
| Best partition | k=2, and it isolates **2 sites** from 32 |
| k=4 / k=5 on n=34 | one blob of 26–31 sites plus singletons |

### The corpus extension is the strongest evidence

My own standing method finding is that corpus composition decides whether a clustering
test means anything. The committed corpus was selected for **visual** variety (minimal,
maximalist, dark, colourful) — the wrong axis for a structural question. So I added 12
sites chosen purely for **architecture**: dense link lists, single-column prose,
documentation with nav, app chrome, text-only lists, a single-object page, institutional
documents.

If discrete archetypes existed, deliberately diverse additions should have formed new
groups. They did the opposite:

- Silhouette got **worse**: k=5 fell 0.382 → 0.215, k=4 fell 0.334 → 0.247.
- New sites landed at mean distance **0.77** from their nearest pre-existing site, while
  pre-existing sites sat **0.86** from each other. **The new sites landed inside the
  existing spread.**

Deliberately different architectures filled the gaps rather than creating regions. That
is the signature of a continuum.

---

## What is real

### Group γ — the one genuine discontinuity

**Definition:** `canvasShare >= 0.4` **and** substantial-block count below ~20.

| site | canvasShare | blocks |
| --- | --- | --- |
| threejs.org/examples | 1.00 | **5** |
| bruno-simon.com | 1.00 | **4** |

Corpus median is **73 blocks**. These pages have 4 and 5.

**Confidence: HIGH that the class is real, LOW on its boundary.** It is real because it
is not a position on an axis — it is the *absence* of the thing every other page has.
There is no DOM architecture to measure; the visible content is one painted surface.
n=2 is too few to place the boundary, and `cosmos.so` (canvasShare 0.54 but 33 blocks)
sits between this class and the rest.

Coverage: **6%** of corpus.

### The composition axis — bimodal, but only as a binary

`textShare` (text area ÷ text+media area) has a genuinely two-humped distribution:

```
0.0-0.3  ############## 14 sites
0.3-0.6  ###             3 sites   <-- real trough
0.6-1.0  ################# 17 sites
```

**Group α — text-dominant** (`textShare >= 0.6`), n=19, **56%**
control-raw, cern, better-mfw, mfw, yale-art, craigslist, sive-rs, gov-uk, figma,
wikipedia, hn, lobsters, danluu, python-docs, mdn, npr-text, xkcd, w3c, sqlite

**Group β — media-dominant** (`textShare <= 0.3`), n=12, **35%**
threejs, spacejam-1996, stripe, apple, awwwards, nasa, linear, vercel, cosmos-so,
paulgraham, github-app, archive-org

**Confidence: MEDIUM.** The trough is real, but see the failure mode below — one member
of β is misclassified for a reason that will recur.

### Repetition — a continuum, not a division

`repetitionRatio` (share of blocks belonging to a repeated shape class) spreads smoothly
from 0.00 to 1.00 with no clean gap. Inside group α alone it runs xkcd 0.00 · craigslist
0.22 · wikipedia 0.23 · sqlite 0.30 · mdn 0.57 · gov.uk 0.65 · hn 0.81 · danluu 0.85.

A modular list and a bespoke prose page sit at opposite ends of one axis, with every
intermediate value occupied. **This is a dial, not a type.**

---

## The failure mode that will recur

**Composition-by-rendered-area cannot distinguish images *of text* from images.**

`paulgraham.com` measures `mediaShare 0.93` and lands in group β. It renders **238 visible
GIFs**, including its headings (`essays-8.gif alt="Essays"`) and decorative 12×14 spacers.
A human reads it as one of the purest text pages on the web; the measurement reads it as
media-dominant.

This matters beyond one site: it is the exact shape of result a user could not explain
about their own page. Any structural claim built on composition inherits it.

---

## Values: what carries structure, what does not

**New, and carrying real signal** (all size-independent by construction, worst |r| vs
page-size proxies in brackets):
`repetitionRatio` [0.26] · `textShare` / `mediaShare` [0.15] · `canvasShare` [0.32] ·
`modalTextWidthRatio` [0.37]

**Size in disguise — excluded after testing:**

| value | worst \|r\| | against |
| --- | --- | --- |
| `columnCount` | **0.90** | block count |
| `depthSpread` | **0.79** | node count |
| `pageAspect` | **1.00** | document height — it *is* page height |

**Dead as defined — two found this phase:**

- **`contentWidthRatio` = 1.00 on all 34 sites.** Some element is always full-bleed, so
  the bounding box always spans the viewport. It has never carried information.
- **`largestUnitShare` saturates at 1.00** — my own new metric, killed on arrival, same
  bug class.

**Not resurrected:** `regularity` (still inverts), `roundness` (failed on the full
corpus), `embedArea` (0.00 on all 23).

### `verticality`

**Excluded, and there is now a second reason.** The old blocker stands: three reasonable
definitions ranked the same sites in three different orders. The new one is empirical —
the natural structural candidate, `pageAspect`, correlates **r = 1.00** with document
height. Page-length "verticality" is not an architectural property at all; it is page
size wearing a shape word.

---

## What a genuinely new measurement would have to do

One gap is load-bearing: **distinguishing text rendered as text from text rendered as an
image.** Candidate approach — OCR-free heuristics on image regions (aspect ratio, edge
density, palette depth, GIF/PNG with few colours) to flag "image is probably lettering".
Not attempted. Without it, group β is unreliable at its edge.

Nothing else in this phase was blocked by missing measurement. The blocker was not
instrumentation — it was that the structure genuinely is not there.

---

## Honest answer to the phase-one question

> Do real websites form recognisable structural archetypes?

**One does.** Pages whose visible content is a single painted surface are topologically
different from everything else, and they are 6% of the corpus.

**Everything else differs by degree, not kind.** Composition splits into two humps and
repetition is a smooth dial. Two axes and one outlier class is not a taxonomy, and the
evidence actively resists being made into one: the harder I selected for architectural
diversity, the more continuous the space became.

**Any proposal for more than one special form should expect to fail this evidence.**
