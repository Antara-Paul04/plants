# Visual richness — investigation and proposal

> **EXPERIMENT. Nothing implemented.** Measured on the committed 23-site corpus plus
> synthetic controls. Probe: `probe/richness.js`, data `results/richness.json`.

---

## 1. The two cases are NOT the same bug

Lead's brief unified Linear and Bruno as "botanical richness gated on DOM-measured
styling". **The measurements do not support that.** They are two different defects that
happen to share a symptom family.

| | DOM `stylingRichness` | pixel richness | design chroma | what is actually wrong |
| --- | --- | --- | --- | --- |
| **linear.app** | **0.614 — highest in corpus** | 0.38 | 0.000 | Richness is measured **correctly**. Only decoration is broken. |
| **bruno-simon.com** | 0.167 → SPARSE | **0.832** | 0.993 | Richness is measured **wrongly**. Foliage is broken. |

**Linear needs no new measurement.** Its foliage is already `lush` and that is right. Its
`stylingRichness` of 0.614 is the highest of 23 sites. The only thing failing is that
every decoration — flowers, the flowering state, and fruit via the flowers gate — hangs
off chroma, and Linear has none. This is a **wiring** defect, not a measurement gap.

**Bruno needs the detector that already exists.** Its DOM has 4 blocks and 0 landmarks
because the site is one canvas, so `stylingRichness` reads near-unstyled while the pixels
are the richest in the corpus. This is the DOM/pixel disagreement case documented during
the corpus research and never wired in.

Fixing only Linear's wiring leaves Bruno broken, and vice versa. They need separate fixes.

---

## 2. I could not build a general "visual richness from pixels"

**Reporting this as a negative result because the caution was explicit and correct.**

I built a composite from edge density, tonal levels, region variety and contrast range.
It behaves well on the cases and on synthetic controls:

| | edgeDensity | toneLevels | regionCount | composite |
| --- | --- | --- | --- | --- |
| synthetic wall texture | **0.000** | 3 | 7 | — |
| synthetic blank | 0.000 | 1 | 1 | — |
| control-raw (genuinely sparse) | 0.066 | **1** | **3** | 0.16 |
| linear.app | 0.104 | 4 | 6 | 0.38 |
| bruno-simon | 0.099 | **12** | **20** | **0.83** |

It is independent of everything it needed to be independent of — colourfulness r=0.19,
chroma r=0.23, page height r=**−0.00**, DOM styling r=0.14.

**But it correlates r = 0.86 with `inkCoverage`, so it is substantially ink in disguise** —
precisely the failure Lead warned against. Component by component:

| component | r vs ink | verdict |
| --- | --- | --- |
| `toneLevels` | **0.90** | it *is* ink |
| `regionCount` | **0.81** | mostly ink |
| `contrastRange` | 0.74 | mostly ink |
| `edgeDensity` | 0.44 | partly independent |
| `axisAlignedRatio` | **0.23** | genuinely independent, r=0.46 with DOM styling |

Only `axisAlignedRatio` (share of strong edges that are horizontal/vertical — designed
layouts are built from boxes and text lines, photographs are isotropic) is both
ink-independent and design-correlated. **On its own it does not separate sophisticated
from sparse**: control-raw scores 0.547 and linear 0.557, because a page of plain text
lines is also strongly axis-aligned.

**Conclusion: "visually rich" from pixels alone is not solved.** A normalised
(per-unit-ink) variant saturated and was abandoned. I do not recommend shipping the
composite — it would swap a chroma gate for an ink gate, which is the same mistake in a
new coat.

---

## 3. Are these genuinely separate signals?

Measured across 23 sites:

```
              styling   colour     ink    edge    axis     img
styling          1.00     0.02    0.22   -0.20    0.46    0.32
colour           0.02     1.00    0.08   -0.01    0.17   -0.42
ink              0.22     0.08    1.00    0.44    0.23    0.58
```

**`stylingRichness` and colourfulness are r = 0.02 — completely independent.**

That single number is the strongest support for Lead's structural principle. Sophistication
and chroma are orthogonal in real websites, so gating decoration on colour discards an
entirely independent axis. **Richness should gate whether there is decoration; colour
should only decide what colour it is.** Linear then gets flowers, and they come out white
or ivory because it has no chroma to give them.

**Correction to my own earlier finding:** I previously reported `imageArea` as
r = 0.97 with page height and recommended cutting it. On the full 23-site corpus it is
**r = 0.05**. The 0.97 came from the 8-site checkpoint, which was rank-confounded — the
same trap I documented and then fell into myself. **`imageArea` is not size-confounded and
is available for use.**

---

## 4. Motion: usable as a binary, not as a magnitude

The old metric was rejected for non-repeatability: bruno-simon returned
0.291 / 0.015 / 0.028 / 0.016 on four runs of one URL. That is fatal for a magnitude.

**But the instability is entirely in the magnitude. The zero is exact.**

- Static pages returned **exactly 0.0000** — at every grid resolution (96×60 through
  384×240) and every threshold tested, across every run.
- Moving pages returned a non-zero value on **every** run. Bruno was never 0.
- Declared animation remains actively wrong: unsplash declares 6 animations and 54
  transitions and observes exactly zero.

So `hasVisibleMotion` (boolean) was stable in 100% of observations while
`motionAmount` (float) varied by 19×. **Recommend: a binary, sampled as now, with no
magnitude exposed.** Confidence MEDIUM — stability is from existing runs, not from a
dedicated repeatability test, which is one afternoon of work if Lead wants it before use.

---

## 5. Fruit: the hypothesis is right-shaped but not yet measurable

Hypothesis under test — flowers are small distributed accents, fruit is fewer, larger,
concentrated elements.

Tested against accent coverage, it **appears** to work:

| site | top accent | concentration | reading |
| --- | --- | --- | --- |
| gov.uk | `#2d7abc` @ 0.188 | 0.97 | concentrated |
| craigslist | `#a1a1f7` @ 0.074 | 0.98 | concentrated |

**But craigslist is a false positive, and it exposes the real gap.** Its blue is thousands
of tiny link texts; gov.uk's is one large hero band. Both score 0.97 because
coverage-by-hue measures *how much of one colour*, never *how it is distributed in space*.

**The needed measurement is well defined and small:** connected-component analysis over
accent-coloured pixels, yielding the **size distribution of chromatic regions**. Many
small components → distributed (flowers). Few large components → concentrated (fruit).
That would put craigslist in flowers and gov.uk in fruit, matching the hypothesis.

Not implemented. It is the only genuinely new measurement this investigation found to be
both necessary and tractable.

---

## 6. Smallest robust set, with confidence

| signal | role | confidence | note |
| --- | --- | --- | --- |
| `stylingRichness` | gates **whether** there is decoration | **HIGH** | already measured; r=0.02 with colour, so it is a real independent axis |
| `designColorfulness` + palette | decides **what colour** decoration is, never whether | **HIGH** | Lead's principle; needs only rewiring |
| DOM/pixel **disagreement** | overrides foliage where DOM cannot see the page | **HIGH** on canvas, **UNTESTED** elsewhere | n=2 (bruno, threejs-example); should also catch full-bleed video/image pages but that is unverified |
| `hasVisibleMotion` (boolean) | a richness contributor | **MEDIUM** | binary stable in all observations; magnitude must stay unexposed |
| accent **region-size distribution** | separates flowers from fruit | **NOT BUILT** | the one new measurement worth building |
| pixel "visual richness" composite | — | **DO NOT SHIP** | r=0.86 with ink |

**What is mis-weighted:** decoration is 100% chroma-gated and 0% richness-gated. That is
the defect, and it is one wiring change plus the disagreement override.

**What is missing:** nothing, for Linear. For fruit, one measurement. For a general
pixel-sophistication metric — that remains unsolved, and I would rather report it unsolved
than ship ink wearing a new name.
