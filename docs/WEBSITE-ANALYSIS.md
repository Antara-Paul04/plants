# WEBSITE-ANALYSIS.md

> **Status: UNRESOLVED.**
> How we inspect a website, and what we derive from it, has not been decided. This is
> the structure for working that out.
>
> **No mappings are final.** Do not implement an extraction pipeline on the basis of
> this document.

---

## Current hypothesis

**ASSUMPTION — the guiding idea for this whole area.**

We care about a website's **visual character**, not merely its measurable DOM
properties.

Counting elements, tags, colours-in-stylesheet or nesting depth is easy and mostly
produces numbers that do not correspond to how a site *feels* to look at. Two sites can
have near-identical DOM statistics and completely different visual personalities, and
the reverse is also true.

So the target output of this stage is something closer to a **visual impression** — a
few characteristics that would match how a person might describe the site at a glance
("airy and pale", "dense and loud", "severe, monospaced, high-contrast") — rather than a
feature vector of DOM measurements.

This is a hypothesis about what will produce good trees. It is not proven, and the
honest difficulty is that impressions are harder to extract reliably than statistics.
DOM measurements may well be *inputs* to an impression. They just should not be the
output.

Related: DECISIONS **D3** — we read how a site *looks*, never what it is *about*.

### Evidence from the first feasibility probe

**EXPERIMENT** — four sites measured in a real browser, 2026-09-20. Method and full
numbers in [Technical feasibility](#technical-feasibility) below.

The hypothesis **survives, and gets stronger** — but it needs one correction.

Source-level statistics are not merely weakly related to visual character. On this
sample several are *inverted*:

| Statistic | Unsplash | Stripe | Reading |
| --- | --- | --- | --- |
| Distinct CSS colour tokens | **112** | **0** | Unsplash has the most monochrome UI of the four; Stripe is the most colourful. The statistic ranks them backwards. |
| DOM nodes | 1472 | 2891 | paulgraham.com (2431) is within 16% of Stripe (2891). They share no visual quality whatsoever. |
| Max nesting depth | 27 | 31 | paulgraham.com is 12. This tracks the site's *era and framework*, not its appearance. |
| Visible chars / megapixel | 283 | 618 | Hacker News is 2509 with the **fewest** DOM nodes (810) of any site tested. |

So "count the DOM" is not a weak signal to be improved; it is measuring engineering
practice rather than design.

**The correction.** The doc's current framing opposes "visual impression" to
"measurement", and that is the wrong axis. What separated these four sites cleanly was
still numbers — just numbers taken from **rendered geometry** rather than from source:
area-weighted colour over the painted viewport, ink coverage, characters per megapixel,
text/background contrast. Those tracked how the sites look.

**ASSUMPTION.** The thing to discard is *source-level* statistics (DOM counts, tag
counts, stylesheet colour counts), not quantification. The target output stays a small
set of numbers; they must be measured on the **rendered page**, and for some
characteristics on the **rendered pixels** (see failure modes F2 and F4 below).

---

## What can be extracted from a website

**OPEN.**

An inventory of what is realistically obtainable, and by what means — static HTML/CSS
parsing, headless rendering, screenshotting, or some combination. Each method has very
different cost, reliability and fidelity.

**EXPERIMENT** — measured on four sites, 2026-09-20. What each method actually yielded:

| Method | Result | Evidence |
| --- | --- | --- |
| **Static HTML fetch (server-side)** | Gets structure, never appearance. Blocked outright on 1 of 4 sites. | Static-tag-count ÷ rendered-node-count was 1.00 / 1.00 / 0.84 for paulgraham / HN / Stripe. unsplash.com returned **HTTP 401** to a server-side fetch even with a full browser header set. |
| **Static CSS parsing** | Unreliable. Cross-origin stylesheets are unreadable. | Stripe: **0 of 5** stylesheets readable (`SecurityError` on `cssRules`) → 0 colour tokens recovered from the most colourful site tested. paulgraham.com has **0 stylesheets at all** yet visibly has a palette. |
| **Client-side fetch from the user's browser** | **Impossible.** | See F1 below — 4 of 4 cross-origin fetches blocked, iframe `contentDocument` null. |
| **Headless render + computed styles** | Works, and is the only route that worked on all four. | All numbers in this document came from it. Cost: 1.2–3.1 s page load; the measurement itself runs in 22–29 ms. |
| **Screenshot / pixel reading** | **Required** for anything involving images, canvas or gradients, and not obtainable from inside the page. | Canvas pixel read was tainted (`SecurityError`) on 3 of 4 sites; it succeeded only on HN, whose single image is same-origin. |

**VERIFIED 2026-09-20 by the second probe.** A screenshot taken by the *driver* is not
subject to canvas tainting, so the pixel route **is** open to a server-side analyser.
Tested directly: a Playwright-captured PNG handed to a separate blank page, drawn to a
canvas and read with `getImageData`, returns real pixel data. The capture arrives as a
`data:` URL and carries no origin, so it cannot taint. Every pixel number in the
[Second probe](#second-probe--instrumented-corpus-2026-09-20) section below was obtained
this way, including on sites where the in-page canvas read throws.

This **unblocks F2 and F4**: Stripe's gradient canvas and Unsplash's photographs, recorded
above as invisible to analysis, are measurable — just not from inside the page.

---

## Palette extraction

**OPEN.**

How we determine a site's colours, and which ones matter. Questions: source (CSS
declarations vs rendered pixels vs screenshot quantisation); how to distinguish
background from primary from accent; how to weight by area vs by prominence; how many
colours to keep; how to handle images that dominate the frame.

Feeds the palette mapping in [TREE-SYSTEM.md](TREE-SYSTEM.md), and constrained by
DECISIONS **D5**.

**EXPERIMENT** — measured 2026-09-20. Method: every element's opaque background colour
painted into a 120-cell-wide grid over the viewport in approximate stacking order, then
tallied by cell. This is a cheap stand-in for quantising a screenshot.

| | paulgraham | Hacker News | Stripe | Unsplash |
| --- | --- | --- | --- | --- |
| Ground colour (area share) | `#ffffff` 1.00 | `#f6f6ef` 0.82 | `#ffffff` 0.91 | `#ffffff` 0.66 |
| Second surface | — | `#ff6600` 0.034 | `#533afd` 0.008 | `#260c0c` 0.10 |
| Distinct chromatic hue bins | 0 | 1 | 1 | 2 |
| Area-weighted HSL saturation | 0.00 | 0.31 | 0.01 | 0.12 |
| Top text colours (by area) | `#000099` .95, `#000000` .05 | `#000000` .57, `#828282` .42 | `#ddd600` .35, `#000eff` .35, `#061b31` .16 | `#111111` .57, `#767676` .40 |
| Mean text/background contrast (WCAG) | 14.7 | 12.3 | 7.9 | 13.2 |
| Accent — link colour | `#000099` | `#000000` | `#533afd` | `#111111` |
| Accent — largest button background | none | none | `#533afd` | `#ffffff` |
| Accent — most chromatic surface | none | `#ff6600` | `#533afd` | `#40260c` |

**What works.** Ground colour is the single most reliable value obtained in this probe —
unambiguous on all four sites. Where a site has a real brand accent, the three
independent accent heuristics agree (Stripe: all three returned `#533afd`; HN's orange
`#ff6600` was found by the chromatic-surface heuristic at 3.4% of the viewport).
Area-weighted text contrast separated the sites sensibly (7.9–14.7).

**What breaks.**

- **Computed text colour is not perceived text colour.** Stripe's top *two* text colours
  by area — `#ddd600` (yellow) and `#000eff` (blue) — are compositing layers of the hero
  headline. `.hero-section__title-copy` spans carry those colours; the headline a human
  sees is dark navy. A palette built from `getComputedStyle().color` would confidently
  report a yellow-and-blue site.
- **Accent detection returns content colour on image-led sites.** Unsplash's "most
  chromatic surface" was `#40260c`, a brown — it is a photo's dominant colour, which
  Unsplash sets as the placeholder background behind each thumbnail. Not a brand colour.
- **HSL saturation is meaningless near the lightness extremes.** HN's ground `#f6f6ef`
  reports `s = 0.28` and drives its area-weighted saturation to 0.31, the highest of the
  four, while being visually a near-white cream. Any saturation/chroma measure needs a
  perceptual space (LCh / OKLCh chroma), not HSL.
- **Colour inside images, canvas and gradients is invisible to this method.** Stripe's
  entire signature gradient is `<canvas id="hero-wave-animation__canvas">` plus a large
  `<img>`, together covering 81% of the viewport. Its colours contributed *nothing*.

**ASSUMPTION.** A usable palette needs the rendered pixels, not the DOM. The DOM route
gets the ground colour and the UI accent; it cannot get the palette of a site whose
colour lives in imagery.

---

## Layout

**OPEN.**

Structural impression: grid vs freeform, alignment and regularity, column structure,
symmetry, rhythm, how ordered or chaotic the arrangement reads.

**EXPERIMENT** — only the coarsest layout properties were attempted, 2026-09-20.

| | paulgraham | Hacker News | Stripe | Unsplash |
| --- | --- | --- | --- | --- |
| Content column fraction (widest inked row ÷ viewport) | 0.40 | 0.53 | 1.00 | 0.98 |
| Page height in viewports | 6.45 | 1.54 | 18.11 | 6.01 |
| Area-weighted box tallness `h/(w+h)` | 0.725 | 0.435 | 0.518 | 0.640 |
| Fixed/sticky chrome, share of viewport | 0.00 | 0.00 | 0.03 | 0.20 |

**"Verticality" is not yet a defined quantity — this is the finding.** The three
candidate definitions above rank the four sites in three *different* orders:

- by page height: HN 1.54 < Unsplash 6.01 < paulgraham 6.45 < Stripe 18.11
- by box tallness: HN 0.435 < Stripe 0.518 < Unsplash 0.640 < paulgraham 0.725
- by column narrowness: paulgraham 0.40 < HN 0.53 < Unsplash 0.98 < Stripe 1.00

paulgraham.com is last on one, first on another and lowest on the third. Until somebody
says which of these "verticality" means, it cannot be measured — the obstacle is
definitional, not technical. **OPEN**, and it needs a human or Lead to pick a meaning.

**NOT MEASURED — grid vs freeform, alignment regularity, symmetry, rhythm.** These were
not attempted and are not single computed properties. What it would take: cluster the
left/right/top edges of visible boxes into candidate alignment lines and score the
residual spread — sites on a strict grid should show few lines with near-zero residuals.
That is a real piece of work, not a one-line measurement.

---

## Whitespace

**OPEN.**

How much breathing room the design has. Margin and padding scale, spacing between
sections, whether the design feels generous or tight. Probably closely related to
visual density, and possibly the same axis viewed from the other end.

**EXPERIMENT** — measured 2026-09-20 as the complement of "ink coverage": the fraction of
viewport grid cells carrying any mark (text, real media, borders, shadows, gradients, or
a background colour different from the page ground).

| | paulgraham | Hacker News | Stripe | Unsplash |
| --- | --- | --- | --- | --- |
| Ink coverage | 0.181 | 0.358 | **0.980** | 0.611 |
| Whitespace ratio | 0.819 | 0.642 | **0.020** | 0.389 |
| Ink excluding media | not measured | not measured | not measured | **0.194** |

**Whitespace is measurable, but only once media is separated out.** Stripe's 0.02
whitespace ratio is wrong as a description of the page: it is an airy hero, but a
full-bleed decorative canvas and image cover 81% of the viewport and every cell counts as
ink. Unsplash shows the fix working — 0.611 ink overall, but **0.194** once media cells
are excluded, which is the number that actually describes its sparse chrome.

**ASSUMPTION.** Two values are needed, not one: *chrome whitespace* (ink excluding
media) and *media coverage*. A single "whitespace" scalar cannot distinguish a busy page
from a spacious page with one big picture on it. The metric was only added late in the
probe, so it exists for Unsplash only and should be re-run across all sites.

Margin and padding scale were **not measured**.

---

## Visual density

**OPEN.**

How much is on screen at once — element count, text volume, information per viewport,
how busy or sparse the page feels.

**EXPERIMENT** — measured 2026-09-20 at a pinned 1280x800 viewport.

| | paulgraham | Hacker News | Stripe | Unsplash |
| --- | --- | --- | --- | --- |
| Visible chars / megapixel | 714 | **2509** | 618 | 283 |
| Text coverage (grid) | 0.119 | **0.334** | 0.246 | 0.070 |
| Visible elements / megapixel | 297 | **530** | 158 | 172 |
| Boxed elements / megapixel | 1.0 | 23.4 | 10.7 | 12.7 |
| Text nodes in viewport | 38 | 288 | 36 | 22 |
| DOM nodes (whole document) | 2431 | **810** | 2891 | 1472 |

**Characters per megapixel is the best density signal found.** It ranks the four sites
the way they look — HN densest at 2509, Unsplash sparsest at 283, a 8.9x spread — and it
does so while HN has the *fewest* DOM nodes of any site tested. Raw DOM node count ranks
them almost backwards, which is the clearest single piece of evidence for the hypothesis
at the top of this document.

**Caveat.** All density values are for one above-the-fold viewport. Stripe's page is
18.1 viewports tall and its first screen is a hero; 618 chars/megapixel describes the
hero, not the site. **OPEN:** whether density should be sampled from the whole page,
from several viewports, or deliberately from the first screen only.

---

## Shape language

**OPEN.**

Corner radii, use of circles and pills, hard vs soft edges, borders, presence of organic
or geometric forms. One of the more plausibly direct routes to botanical form — soft,
round sites and sharp, angular sites suggest genuinely different trees.

**EXPERIMENT** — measured 2026-09-20.

| | paulgraham | Hacker News | Stripe | Unsplash |
| --- | --- | --- | --- | --- |
| Boxed elements found in viewport | **1** | 24 | 11 | 13 |
| Mean radius, area-weighted over boxes | 0.00 px | 0.00 px | 0.04 px | 1.56 px |
| Normalized roundness (0–1) | 0.000 | 0.000 | 0.002 | 0.041 |
| Pill / circle elements | 0 | 0 | 0 | 2 |
| **Controls scanned** | not measured | not measured | **43** | **42** |
| **Mean control radius** | not measured | not measured | **0.7 px** | **3.6 px** |
| **Controls with radius >= 4px** | not measured | not measured | **0.19** | **0.45** |

**Corner radius is genuinely measurable, but the sample must be scoped to controls.**
Counting "every element with a visible box" gave samples of **1, 24, 11 and 13** — far
too few and too arbitrary to be stable, because most elements on modern sites have
transparent backgrounds and so never enter the sample. Scoping to buttons, links,
inputs and card-like elements gave n≈42 on both sites where it was tried, and a more
meaningful number.

**Measurement beat impression here, and is worth recording.** Stripe *looks* like a
soft, rounded site; it measures at 4 px radius on 40 px-tall buttons (normalized 0.2),
with 81% of controls at radius 0. It is a hard-cornered site with slightly softened
buttons. Unsplash is the rounder of the two by every measure. Neither is a "round" site.

**Metric bug found.** The border detection counted `border-width: 2px` together with
`border-style: none` as a visible border, which reported 97.7% of Stripe's viewport as
bordered. Fixed mid-probe by also requiring `border-style !== 'none'`; Stripe's
`borderedAreaFrac` of 0.977 is a known false positive and Unsplash's 0.067 is correct.

**NOT MEASURABLE from the DOM — organic vs geometric form.** Corner radius is the only
part of "shape language" that is a CSS property. Whether a site uses blobs, waves,
angular cuts or hard rectangles lives in SVG path data, images and canvas drawing. What
it would take: rasterise the page and measure edge orientation statistics and contour
curvature — a pixel-level operation, not a DOM one.

---

## Typography

**OPEN.**

Typeface character (serif, sans, mono, display), weight, scale contrast, letter spacing,
line length, how much of the page's personality lives in the type. For many sites,
typography *is* the visual identity.

**EXPERIMENT** — measured 2026-09-20.

| | paulgraham | Hacker News | Stripe | Unsplash |
| --- | --- | --- | --- | --- |
| Top family (area-weighted) | verdana | Verdana | sohne-var | ui-sans-serif |
| Webfonts loaded | 0 | 0 | 2 | 0 |
| Median font size, area-weighted | 13.0 px | 13.3 px | 48 px | 18 px |
| Median font size, **char-weighted** | not measured | not measured | 48 px | **14 px** |
| Largest font in viewport | 13.0 px | 13.3 px | 48 px | 40 px |
| Scale contrast (largest ÷ char-weighted median) | 1.00 | 1.00 | **1.00** | 2.86 |
| Font weight, area-weighted | 400 | 402 | 303 | 534 |
| Line-height ratio | 1.20 | 1.19 | 1.15 | 1.53 |
| Letter-spacing (em) | 0.000 | 0.000 | −0.020 | 0.000 |
| Monospace text fraction | 0.00 | 0.00 | 0.00 | 0.00 |
| Chars per line (paragraphs) | n/a | n/a | 40.3 | n/a |

**Measurable and reliable:** font size distribution, weight, line-height, letter-spacing,
webfont count, and **monospace detection** — the last is a real measurement, not a name
lookup (render `iiiiiiiiii` and `WWWWWWWWWW` to a canvas in the page's own font and
compare advance widths; ratio > 0.9 means fixed-pitch). None of the four sites was
monospaced, so this arm is untested against a positive case.

**Weight by characters, not by area.** Unsplash's area-weighted median font size is
18 px; its char-weighted median is **14 px**, which is the actual body size. Area
weighting lets a few large words outvote a paragraph. Char-weighting was added late and
exists for Stripe and Unsplash only.

**Scale contrast cannot be measured from one viewport.** Stripe scores 1.00 — its first
screen contains only hero text, so the median *is* the maximum. It obviously has a type
hierarchy. paulgraham.com and HN score 1.00 for the opposite and genuine reason: they
really do use one size for everything. The metric cannot currently distinguish "no
hierarchy" from "only the top of the hierarchy is on screen". Fix: sample the whole
document, not the viewport.

**NOT MEASURABLE — serif vs sans vs display.** This was attempted and abandoned. The
computed `font-family` string is a *stack*, not a classification: `ui-sans-serif`,
`sohne-var` and `verdana` say nothing reliable about letterform character, and a
name-matching heuristic is a lookup table pretending to be a measurement. Monospace is
the one class with a metric signature. What it would take: rasterise a sample string and
measure stroke-contrast and terminal features, or carry a font-metadata database. Given
the doc's own note that "for many sites, typography *is* the visual identity", this is
the most significant gap found in the probe.

**Type rendered as images is invisible.** paulgraham.com renders its headings as GIFs —
709 `<img>` elements, of which 62 in-viewport were 1x1 spacers and 34 were real. Its
measured scale contrast of 1.00 is therefore true of its *HTML* text and false of the
page as a viewer sees it.

---

## Imagery

**OPEN.**

Presence, volume and character of images: photography vs illustration vs none, treatment
(full-bleed, contained, masked), whether imagery dominates or supports. Note D3 — we
read images for visual qualities such as tone and contrast, never for their subject.

**EXPERIMENT** — measured 2026-09-20.

| | paulgraham | Hacker News | Stripe | Unsplash |
| --- | --- | --- | --- | --- |
| Real media elements in viewport (>= 4px) | 34 | 1 | 18 | 25 |
| Tiny / spacer media discarded | 62 | 1 | 0 | 0 |
| Media coverage of viewport | 0.068 | 0.001 | **0.812** | **0.418** |
| CSS background-image coverage | 0.000 | 0.009 | 0.000 | 0.300 |
| Page-level background image present | **yes** | no | no | no |
| Canvas pixel read | TAINTED | **readable** | TAINTED | TAINTED |

**Presence and volume are measurable. Character is not.**

Media *coverage* separates the sites well (0.001 to 0.812) and is one of the more useful
numbers found. But every question about what the imagery is *like* — tone, contrast,
colourfulness, photography vs illustration, light vs dark — requires reading pixels, and
pixels are unavailable from inside the page on 3 of the 4 sites tested
(`SecurityError` on `getImageData`, because the images are cross-origin without CORS
headers). Only HN's single same-origin logo could be read.

**Two counting traps, both hit during the probe:**

- **Page-level background images.** The first run reported paulgraham.com at 0.977 image
  coverage — a page that is visually plain white text on white. The cause is a
  background-image GIF on `<body>` spanning the full 687x5140 document. Fixed by
  excluding background-images on `html`/`body` or on any element covering >= 85% of the
  viewport, and flagging them separately. **This heuristic has a known failure**: a
  genuine full-bleed hero set as a CSS background on `body` will be wrongly discounted.
  Distinguishing the two needs the pixels.
- **Spacer images.** paulgraham.com serves 709 `<img>` elements, most of them 1x1
  transparent spacer GIFs from a 1990s table layout. Filtering media below 4x4 px cut
  the in-viewport count from 96 to 34.

**ASSUMPTION.** Anything in this section beyond presence and coverage depends on the
screenshot route existing. See F4 in Technical feasibility.

---

## Possible normalized characteristics

**OPEN.**

The intended output of this stage: a small set of normalized characteristics that the
tree system consumes, each on a defined scale, stable across very different sites.

The design constraint is that this set must be **small**. It is the interface between
the two halves of the project, and the appeal of the idea rests on a handful of
characteristics producing recognisably different trees.

**EXPERIMENT — candidates only.** The probe produced values that are stable and that
separated four very different sites. Listing them here is *not* a proposal for the
interface and *not* a mapping (that is D5 and belongs to Lead, see
[Mapping to the tree system](#mapping-to-the-tree-system) below). It is a note of what
is currently obtainable, so that whoever defines the interface knows what exists.

| Candidate | Range observed | Confidence |
| --- | --- | --- |
| `groundColor` (hex) | `#ffffff`, `#f6f6ef` | Most reliable value found. Unambiguous on 4/4. |
| `accentColor` (hex) + `accentArea` | `#ff6600` @ 0.034, `#533afd` @ 0.008 | Reliable where a brand accent exists; returns content colour on image-led sites, and nothing at all on paulgraham.com. |
| `textDensity` (chars/megapixel) | 283 – 2509 | Strong separator. Viewport-dependent. |
| `chromeWhitespace` (1 − ink excluding media) | 0.806 (Unsplash) | Promising, measured on one site only. |
| `mediaCoverage` (0–1) | 0.001 – 0.812 | Reliable. |
| `textContrast` (WCAG mean) | 7.9 – 14.7 | Reliable. |
| `controlRoundness` (mean px, and fraction >= 4px) | 0.7–3.6 px, 0.19–0.45 | Reliable when scoped to controls; needs re-running on all sites. |
| `bodyFontSize` (char-weighted px) | 13 – 48 | Reliable; must be char-weighted. |
| `fontWeight` (area-weighted) | 303 – 534 | Reliable. |
| `pageLength` (viewports) | 1.54 – 18.11 | Reliable but see the verticality problem under Layout. |

**Not available** at present: typeface class beyond monospace, imagery character, layout
regularity, and any perceptual colour measure (everything above is sRGB/HSL).

**OPEN.** How many of these survive into the interface, what their normalized scales
are, and what they are called. Not decided here.

---

## Mapping to the tree system

**OPEN.**

The actual translation: which website characteristics drive which tree parameters, and
how strongly.

**Nothing here is decided.** The single tentative idea on record is that colour may be
carried primarily by flowers — see DECISIONS [D5](DECISIONS.md) and the Flowers section
of [TREE-SYSTEM.md](TREE-SYSTEM.md). It is TENTATIVE and must not be hardened into a
mapping by being implemented.

- _unresolved_

---

## Technical feasibility

**OPEN.**

What is actually achievable, and at what cost. Considerations: CORS and same-origin
limits on fetching third-party sites; client-side vs server-side analysis; whether
headless rendering is needed and where it would run; JavaScript-rendered sites that are
empty without execution; time budget from URL submission to result; rate limits.

Feasibility will constrain the creative ambition here more than anywhere else in the
project. Surface those constraints early and explicitly rather than quietly narrowing
the idea to fit them (AGENTS.md R6).

### Feasibility probe, 2026-09-20

**EXPERIMENT.** Four sites chosen for genuinely different visual personalities, visited
in a real desktop Chrome at a pinned **1280x800** viewport, DPR 2. Measurements came
from throwaway inline scripts run against the loaded page (computed styles, client rects,
and a 120-cell-wide grid rasterisation of the viewport). **No extraction pipeline was
built and none should be inferred from this.**

| | Site | Why chosen |
| --- | --- | --- |
| 1 | `paulgraham.com/articles.html` | Minimal, typographic, no CSS at all |
| 2 | `news.ycombinator.com` | Dense, utilitarian, one strong accent |
| 3 | `stripe.com` (redirected to `/in`) | Polished marketing, gradient-led |
| 4 | `unsplash.com` | Image-led, monochrome chrome |

#### Capture cost and reliability

| | paulgraham | Hacker News | Stripe | Unsplash |
| --- | --- | --- | --- | --- |
| Page load (navigation duration) | 1239 ms | 1932 ms | 2206 ms | 3134 ms |
| Document transfer | 7.7 KB | 5.9 KB | 186 KB | 87 KB |
| In-page measurement runtime | 25 ms | 22 ms | 23 ms | 29 ms |
| DOM nodes / max depth | 2431 / 12 | 810 / 14 | 2891 / 31 | 1472 / 27 |
| Stylesheets readable / total | 0 / 0 | 1 / 1 | **0 / 5** | 5 / 5 |
| CSS rules readable | 0 | 63 | **0** | 1393 |
| Distinct CSS colour tokens | 0 | 13 | **0** | **112** |
| Static fetch, server-side | 200 | 200 | 200 | **401** |
| Static tags ÷ rendered nodes | 1.00 | 1.00 | 0.84 | n/a |
| Canvas pixel read | TAINTED | readable | TAINTED | TAINTED |

**Time budget.** Loading dominates completely: 1.2–3.1 s to load, 22–29 ms to measure.
The analysis itself is free; the page visit is the entire cost. A 5 s timeout would have
caught all four.

#### Failure modes hit

- **F1 — There is no client-side path. This is the hard constraint.** From a page on one
  origin, `fetch()` of all four target sites failed, in both `cors` and `no-cors` mode
  (4/4 `TypeError`). Loading a target in an `<iframe>` gave `contentDocument === null`.
  A browser cannot read a third-party site, so **analysis must run server-side in a
  headless browser**. This answers the "client-side vs server-side" question in this
  section's own preamble: it is not a trade-off, only one option exists.
- **F2 — Static HTML and CSS are not sufficient.** Stripe serves 5 of 5 stylesheets
  cross-origin: `cssRules` throws `SecurityError`, so **zero** CSS was readable from the
  most colourful site tested. Separately, `unsplash.com` returns **HTTP 401** to a
  server-side fetch even with a complete browser header set — bot protection that a real
  browser passes and a fetcher does not. Rendering is mandatory, not an optimisation.
- **F3 — Computed style lies about what is on screen.** Stripe's two highest-area text
  colours are `#ddd600` and `#000eff`; the headline a human sees is dark navy. They are
  compositing layers. Any value read from `getComputedStyle` is a *declaration*, not an
  observation.
- **F4 — Cross-origin images cannot be pixel-read from inside the page.** 3 of 4 sites
  threw `SecurityError` on `getImageData`. Since Stripe's signature gradient is a
  `<canvas>` + `<img>` covering 81% of the viewport, and Unsplash is 42% photographs,
  the DOM route is blind to the most visually dominant element of two of four sites.
- **F5 — Full-bleed media destroys coverage metrics.** Stripe measured 0.02 whitespace on
  an airy page. Mitigated by reporting ink-excluding-media separately (Unsplash: 0.611
  total ink vs 0.194 chrome ink).
- **F6 — Page-level background images and spacer GIFs poison image counts.** First run
  scored paulgraham.com at 0.977 image coverage. See [Imagery](#imagery).
- **F7 — Viewport is load-bearing and was unstable in this harness.** The emulated
  viewport silently reverted to the pane's own 703x843 between calls, twice. Stripe
  measured at 703 px wide vs 1280 px wide gave: 112 vs 162 visible elements, 0.00 vs 0.02
  whitespace, 40 px vs 48 px median font. **Every number in this document is void unless
  the viewport is pinned and re-asserted immediately before measuring.** The probe
  therefore reports its own viewport in every result, and runs were discarded and redone
  when it drifted.
- **F8 — The same URL is not the same page.** `stripe.com` geo-redirected to
  `stripe.com/in`. Region, and presumably also A/B assignment and consent state, change
  what gets measured.
- **F9 — Repeatability is partial.** Two consecutive loads of unsplash.com: ground colour
  0.659 → 0.663 and media coverage 0.418 → 0.416 (stable to ~0.005), but one of the top
  surface colours changed identity entirely (`#f3f3f3` → `#a6a68c`) because the photo grid
  rotated. **Structural measures are repeatable; content-derived colour slots are not.**
- **F10 — Metric bugs are easy to write and hard to see.** Three were found and fixed
  mid-probe: border-width counted without checking border-style (reported 97.7% of Stripe
  bordered); area-weighting of font size (18 px vs the true 14 px body on Unsplash);
  roundness sampled over "any boxed element", giving samples of size 1 to 24.

#### Verdict per characteristic

| Characteristic | Measurable? | Note |
| --- | --- | --- |
| Ground / background colour | **Yes** | Most reliable value found. |
| Accent colour | **Partly** | Good where a brand accent exists; returns photo colour on image-led sites; absent entirely on paulgraham.com. |
| Full perceived palette | **No, from the DOM** | Needs rendered pixels. F4. |
| Visual density (chars/megapixel) | **Yes** | Best single separator found; 8.9x spread. |
| Whitespace | **Yes, if split** | Chrome whitespace and media coverage must be separate numbers. F5. |
| Text contrast | **Yes** | 7.9–14.7 across the four. |
| Corner radius / roundness | **Yes, if scoped to controls** | Whole-page sampling is too small and arbitrary. |
| Organic vs geometric form | **No** | Lives in SVG paths and pixels. |
| Font size, weight, line-height, letter-spacing | **Yes** | Must be char-weighted, and sampled beyond one viewport. |
| Monospace | **Yes** | Genuine canvas metric test. Untested against a positive case. |
| Serif vs sans vs display | **No** | Family names are a stack, not a classification. Biggest gap. |
| Type scale contrast | **Not from one viewport** | Stripe scores 1.00 for the wrong reason. |
| Imagery presence and volume | **Yes** | 0.001–0.812 coverage. |
| Imagery character (tone, contrast, photo vs illustration) | **No** | Needs pixels. F4. |
| Layout regularity, grid vs freeform | **Not attempted** | Would need edge-alignment clustering. |
| Verticality | **Definitionally blocked** | Three candidate definitions rank the sites three different ways. See [Layout](#layout). |

#### What this implies

**ASSUMPTION.** A workable capture is: server-side headless browser, pinned desktop
viewport, page load with a timeout of a few seconds, then **both** a computed-style pass
(cheap, exact, good for type, spacing, radius, density and UI colour) **and** a
screenshot pass (needed for palette and anything about imagery). Neither pass alone was
sufficient on all four sites. The screenshot half was **not verified in this probe** —
it requires driving a headless browser from outside the page, which was out of scope.

**OPEN.** Rate limits and per-visit cost were not investigated at all.

---

## Second probe — instrumented corpus (2026-09-20)

**EXPERIMENT.** A second, independent probe run after the four-site feasibility probe
above, using a different instrument: **headless Chrome 152 driven by Playwright**, pinned
1440x900, 25 URLs, **23 valid**. Probe source, corpus, raw JSON and screenshots are in
`analysis/`. Nothing here is DECIDED.

Where the two probes overlap they **agree**. This section records what the second probe
adds, and the two places it corrects the first.

### Measurement conditions: colour scheme is pinned to light

**ASSUMPTION — and it was never stated before, which it should have been.**

Every number produced by this probe was measured with the browser pinned to
`colorScheme: 'light'`. Nothing in this document was measured in dark mode.

That is not a neutral harness detail. **For any site that respects
`prefers-color-scheme`, this one setting decides what the website *is*:**

| site | `colorScheme: light` | `colorScheme: dark` | |
| --- | --- | --- | --- |
| vercel.com | `rgb(250, 250, 250)` | `rgb(0, 0, 0)` | **changes completely** |
| linear.app | `rgb(8, 9, 10)` | `rgb(8, 9, 10)` | dark by design |
| github.com | `rgb(13, 17, 23)` | `rgb(13, 17, 23)` | dark by design |

In production this would not be our setting at all — it would be **the visitor's OS
preference**, which neither we nor the site's owner chose. The same URL would produce
different trees for different people.

**This is the same shape of problem as two edge cases already listed below** —
dark-mode-by-default sites, and sites whose appearance differs at mobile versus desktop
width. In each, *the same URL has more than one true appearance and something has to
choose one*. It is a product question, not a measurement bug.

**What it costs us right now.** `vercel.com` is the only corpus site reaching **WINTER**,
and it reaches it *in light mode*. In dark mode its ground is pure black and its ink and
colour measures would differ. The rendered grid cell demonstrates the state for the
renderer, but **"vercel.com is a winter website" is not a claim this measurement supports
unqualified.**

**OPEN — what the product should do.** Pin one scheme, follow the visitor's, or offer
both. Lead's recorded recommendation is to keep pinning light and document it: for
something people share, determinism beats fidelity — the same URL must give everyone the
same tree — and the pin only affects sites that genuinely adapt. That reasoning is sound
and it is *not* recorded here as settled: it changes what a user receives, so it is a
human call (AGENTS.md R7).

---

### The crux test: unstyled HTML vs intentional minimalism

The first probe had no raw-HTML control, so this was untested. It is the single most
important question in this area: *a page with no CSS and a deliberately minimal designed
page both look sparse — do they measure the same?*

**They do not.** Two independent measures separate them, across a ladder of five sites
from zero-CSS to fully designed:

| | control (no CSS) | info.cern.ch | motherfucking- | bettermotherfucking- | stripe.com |
| --- | --- | --- | --- | --- | --- |
| `stylingRichness` | **0.02** | **0.02** | 0.07 | 0.16 | **0.59** |
| `unstyledScore` | **1.00** | **1.00** | 0.90 | 0.80 | **0.00** |

`unstyledScore` counts how many of ten rendered UA-default markers a page still matches
(browser-default font, default link colour, unconstrained measure, no radius/shadow/
gradient/background, default type ladder). Across all 23 sites it spans the **full 0.00
to 1.00 range** and orders them sensibly.

**What actually does the separating.** Of 18 styling sub-signals, **15 are identical
(0.00) between raw HTML and designed minimalism.** The entire discrimination rests on
three:

| sub-signal | raw HTML | designed-minimal | detects |
| --- | --- | --- | --- |
| `constrainedMeasure` | 0.02 | **0.91** | a max-width on the text column |
| `lineHeightSet` | 0.00 | **1.00** | line-height authored, not `normal` |
| `authoredTypeScale` | 0.00 | **0.67** | font sizes off the browser's default ladder |

**ASSUMPTION.** Those three are exactly the moves a designer makes when minimising
deliberately — set a measure, set a rhythm, set a scale. That they are the discriminator
looks principled rather than accidental, but it is three signals carrying one conclusion.

**The risk, stated plainly.** On magnitude the pair sits at **0.02 vs 0.16**, while
designed sites sit at 0.45–0.61. Designed minimalism is far nearer raw HTML than either
is to a rich site. Any *linear* use of `stylingRichness` would collapse the distinction
again. **OPEN:** whether "is this authored at all" should be carried as a separate
near-binary axis from "how rich is the styling". That question touches the analysis→tree
interface and is not the analysis domain's to settle.

### Validity: invalid pages measure as plausible websites

**The most important operational finding, and it is not about any metric.**

In the first run, 2 of 5 real sites failed to load and **both produced confident,
believable fingerprints**:

- `lingscars.com` — HTTP 403 Cloudflare challenge, host silently changed to
  `motorleaseplatform.com`; scored `stylingRichness 0.42`, density 1.00.
- `bettermotherfuckingwebsite.com` over https — `ERR_CONNECTION_RESET`; **Chrome's own
  error page** was measured and scored `stylingRichness 0.29`.

Neither threw. Both looked like data. `better-mfw` is one of the two designed-minimal
controls, so the crux comparison was briefly resting on a browser error page.

A **validity gate** now rejects any page that fails navigation, returns >=400, lands on
`chrome-error:`, changes host, or matches known interstitial text. On the full corpus it
caught `bloomberg.com` ("Are you a robot?", 403) and `lingscars.com` (Cloudflare 403).

**ASSUMPTION.** The gate is necessary but not sufficient — a soft block returning 200
with "please enable JavaScript" would still pass. Untested.

This extends **F8**: the same URL is not only not the same page, it may not be the site
at all, and the failure is silent.

### Colour: photography can be separated from design

Confirms and extends the first probe's finding that accent detection returns *content*
colour on image-led sites. Measuring the palette twice — once whole, once with `<img>`,
`<picture>` and `<video>` regions masked out — separates the two:

| site | unmasked primary | masked primary | reading |
| --- | --- | --- | --- |
| unsplash.com | `#8e7148` brown, colourfulness **0.44** | `#c8b497`, colourfulness **0.01** | The brown was a photograph. Unsplash's real UI is monochrome, and the masked number says so. |
| art.yale.edu | `#95aedb` washed blue-grey | **`#f72f2d` vivid red** | Masking did not merely denoise — it **recovered the true brand accent** the unmasked pass missed. |

**TENTATIVE.** The *difference* between masked and unmasked colourfulness is itself a
signal: it measures how much of a site's colour is photography rather than design.
Unsplash 0.44 -> 0.01 (nearly all photography); Yale 0.26 -> 0.26 (all design). For **D5**
that distinction may matter more than either number alone — a site whose colour is
entirely other people's photographs arguably has no brand colour to carry.

**Correction to method:** `<canvas>` and `<svg>` must **never** be masked. An early pass
treated them as media and erased 100% of a WebGL page, returning no palette at all. They
are authored design, not photographic content.

Ground/background colour was unambiguous on all 23 sites — the single most reliable
colour value either probe has obtained, agreeing with the first probe's conclusion.

### Canvas / WebGL pages

The first probe flagged this as a hole; the second measured it. Two pages that are
visually rich and structurally almost empty:

| | DOM `structure` | pixel `inkCoverage` | colourfulness |
| --- | --- | --- | --- |
| threejs.org/examples (live WebGL) | **0.07** | 0.53 | 0.30 |
| bruno-simon.com (WebGL portfolio) | **0.06** | 0.48 | 0.41 |

DOM structure ranks both *last* of 23; pixel measures rank them high.

**TENTATIVE — the detector is the disagreement, not a `<canvas>` tag.** Low `structure`
with high `inkCoverage` identifies "the DOM does not represent this page" without needing
to know why, so it should also catch full-bleed video or image-only pages that a
tag-check would miss. Only the canvas case was actually tested.

Measured `canvasArea`: threejs-example 1.00, bruno-simon 1.00, cosmos.so 0.54,
**stripe.com 0.27**, vercel 0.20 — independently confirming the first probe's observation
that Stripe's signature gradient is a canvas.

### Motion

Not attempted by the first probe. Three viewport screenshots ~700 ms apart, downscaled
and diffed; sustained motion = `min(diff12, diff23)`, so a one-shot lazy-load cannot
register as animation.

- **True-zero noise floor.** Static pages return *exactly* 0.0000. No false positives.
- Measured: figma 0.22, cosmos.so 0.16, yale 0.08, apple 0.07, nasa 0.05, stripe 0.04.
- **Resolution barely matters** — a 96x60 grid gives the same answer as 384x240
  (0.0208 vs 0.0212), so the cheap version is the right one.

**Declared animation is not visible animation — demonstrated.** unsplash.com declares 6
CSS animations and 54 transitions and measures **0.000** visible motion. A DOM-derived
animation count would call the stillest site in the corpus animated. Do not count
declarations.

**ASSUMPTION — magnitude is not liveliness.** A full-page 3D scene (threejs-example,
0.011) scores *below* a page with small hover ornament (yale, 0.081), because the metric
counts changed screen area. It is a good detector and a poor magnitude.

**Extends F9 (repeatability).** Motion is the *least* repeatable value found by either
probe: bruno-simon.com measured 0.291, 0.015, 0.028 and 0.016 on four runs of the same
URL. Structural measures were stable to ~0.01 across the same runs. A single motion
sample should not be trusted as a magnitude.

### Signals that did not survive the full corpus

| signal | result | verdict |
| --- | --- | --- |
| `roundness` | 0.00–0.07 across all 23 sites. tailwind 0.02, figma 0.04, linear 0.05 — sites that *look* rounded. | **Confirms the first probe independently.** Area-weighting over painted elements does not work. The first probe's fix — scope the sample to controls — is the right one and was not adopted here in time. Redefine or cut. |
| `embedArea` | **0.00 on all 23 sites.** No visible meaningful embed anywhere in the corpus. | Cut for V1. Untested rather than disproven. |
| `graphicArea` (SVG) | 0.00 on 21 of 23; tailwind 0.21, linear 0.06. | Real but rare. Weak. |
| `centredness` | range 0.167. Nearly everything is centred. | Cut. |
| `regularity` | Separates (0.62–1.00) but **inverts**: raw HTML scores a perfect 1.00 because one column is trivially aligned. | Needs redefinition before any use. |
| `verticality` | Not reported. | The first probe showed three candidate definitions rank sites in three different orders. The second probe's own definition is emitted as `verticalityUNDEFINED` / `blocksPerRow` specifically so it cannot be mistaken for a settled quantity. **Still OPEN, still needs a human to choose a meaning.** |

### How much of the page is needed

The first probe left this OPEN. Measured as mean drift between a one-viewport and a
three-viewport scope:

- `unstyledScore` **0.000**, `stylingRichness` **0.004** — effectively scope-invariant.
- `inkCoverage` 0.070, `imageArea` 0.047 — and the drift is concentrated entirely in long
  scrolling pages (unsplash 0.224, yale 0.180).

**TENTATIVE.** Three viewports. The crux/styling axis is free at any scope; only the
density and imagery measures need the extra height, and the cost is capture, not
computation.

### Cost

23 sites: **median 7.8 s, p90 14.8 s, max 24.6 s.** Breakdown of the mean:

| stage | ms | |
| --- | --- | --- |
| page load | ~4000 | network-bound |
| settle (networkidle + fonts + fixed wait) | ~4100 | **pure waiting, tunable** |
| motion capture (3 frames) | ~1700–3000 | **pure waiting, ~22%** |
| screenshot | 160 | |
| pixel processing | 112 | |
| **DOM + computed-style measurement** | **20** | **free** |

**This agrees exactly with the first probe** (22–29 ms to measure, 1.2–3.1 s to load) at
5x the corpus size: *measurement costs nothing, waiting costs everything.* Every lever
that matters is a waiting policy — settle time, motion sampling, load timeout — not an
algorithm. Dropping motion saves ~2 s.

### Method finding: a corpus can invalidate its own confounder test

Worth recording because it nearly produced a wrong conclusion. The first six sites
happened to rank-order by complexity, so **every** signal correlated with page-size
proxies (worst |r| up to 0.99) and all of them looked like disguised size metrics.

Adding two sites chosen to *dissociate* visual richness from page size — craigslist.org
(many DOM nodes, visually flat) and bruno-simon.com (tiny DOM, visually rich) — dropped
`stylingRichness` from 0.96 to 0.78 and `structure` from 0.87 to 0.70.

**ASSUMPTION.** Any corpus used to test whether a signal is "really" measuring visual
character must contain explicit dissociation pairs, or the test silently returns
"everything is suspect".

### Bugs found, and one shared with the first probe

- **Border-width without border-style.** Independently reproduced: `border-width: 2px`
  with `border-style: none` paints nothing but counted as a border. This is the first
  probe's **F10** bug, written a second time in a separate codebase. It did not change
  any checkpoint number here, but it is clearly easy to write.
- **A giant ancestor dominating area-weighted fractions.** A 300x900 sidebar with a *1px*
  border contributed its entire 21%-of-viewport area to "bordered area". Fixed by
  weighting each element by its own *exposed* area (its box minus its painted children)
  and capping any single element's contribution.

Both belong to **F10**'s class, and the recurrence is the point: two independent probes
wrote the same false-positive. **ASSUMPTION.** Rendered-geometry metrics need a control
page with known-correct values as a standing regression test. The zero-CSS control page
used here (`analysis/fixtures/raw.html`) served exactly that purpose and is why the crux
result can be trusted.

---

## Edge cases

**OPEN.**

Inputs that will break naive approaches. An initial list to expand, not to solve yet:

- sites that fail to load, time out, or block automated access
- login walls, paywalls, cookie and consent interstitials covering the page
- single-colour, monochrome or near-greyscale sites
- extremely minimal sites (a single line of text on white)
- extremely maximalist or deliberately chaotic sites
- sites that are one full-bleed image or video
- dark-mode-by-default sites — **partly measured**: see
  [Measurement conditions](#measurement-conditions-colour-scheme-is-pinned-to-light).
  The probe pins light, so adaptive sites are currently recorded in one of their two
  appearances without that being stated in the result
- sites that render nothing without JavaScript
- non-website URLs (a PDF, an image, a raw file)
- invalid, malformed or non-existent URLs
- very slow sites
- sites whose appearance differs at mobile vs desktop widths — which do we analyse?

**EXPERIMENT — confirmed by measurement, 2026-09-20.** Several of the above stopped
being hypothetical during the feasibility probe:

| Edge case | Status | Evidence |
| --- | --- | --- |
| Sites that block automated access | **Confirmed, and it bites** | `unsplash.com` returns HTTP 401 to a server-side fetch with full browser headers. A real browser loads it fine. |
| Sites that render nothing without JavaScript | **Milder than feared, on this sample** | Static-tag ÷ rendered-node was 1.00, 1.00 and 0.84. Structure survives; *appearance* does not — Stripe's CSS is 0/5 readable and its hero is a canvas. |
| Sites that are one full-bleed image or video | **Confirmed to break metrics** | Stripe's canvas+image cover 81% of the viewport and drove whitespace to 0.02 on an airy page. |
| Extremely minimal sites | **Confirmed measurable** | paulgraham.com: 1 boxed element, 1 surface colour, 1 font size. The numbers are degenerate but correct, and the site is genuinely like that. |
| Single-colour / near-greyscale sites | **Confirmed** | paulgraham.com returned 0 chromatic hue bins and no accent candidate at all. Whatever the mapping does, it must cope with "there is no accent colour". |
| Mobile vs desktop width | **Confirmed to matter a lot** | Stripe at 703 px vs 1280 px: 112 vs 162 visible elements, whitespace 0.00 vs 0.02, median font 40 px vs 48 px. **Still OPEN which width we analyse — but it must be pinned, not incidental.** |
| **New: the same URL is not the same page** | Not previously listed | `stripe.com` geo-redirected to `stripe.com/in`. Region, A/B assignment and consent state all change the measurement. |
| **New: content rotation makes colour unstable** | Not previously listed | Two loads of unsplash.com kept ground colour and media coverage to within 0.005 but swapped one top surface colour entirely (`#f3f3f3` → `#a6a68c`). The same site can yield a different accent on two consecutive visits. |

No cookie or consent interstitial appeared on any of the four sites from this location,
so that edge case remains **untested**.

**OPEN.** What the experience does when analysis fails: refuse, fall back to a default
tree, or produce something deliberately strange. A product question as much as a
technical one.
