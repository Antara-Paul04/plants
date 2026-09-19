# Analysis probe — checkpoint findings

> **EXPERIMENT.** Nothing here is DECIDED. Every number is a measurement from one run
> of a disposable research probe, not a proposal for how the tree should work.
> Confidence labels per AGENTS.md R11.
>
> Run: 2026-09-20 · **full corpus: 25 URLs, 23 valid, 2 blocked** · Chrome 152 headless
> · 1440×900 · raw data in `results/`, screenshots in `shots/`, probe in `probe/`.
>
> **The canonical write-up is now folded into `docs/WEBSITE-ANALYSIS.md`**, section
> "Second probe — instrumented corpus". This file is the working record behind it.
> Sections below were written at the 8-site checkpoint; the full-corpus results that
> revise them are in §15 at the end.

---

## 1. The checkpoint question: do the signals separate?

**Yes.** EXPERIMENT. Eight deliberately extreme sites, ordered as measured:

| | raw | cern | better-mfw | bruno | threejs-ex | craigslist | yale | unsplash |
|---|---|---|---|---|---|---|---|---|
| stylingRichness | 0.02 | 0.02 | 0.16 | 0.17 | 0.24 | 0.38 | 0.46 | 0.45 |
| unstyledScore | 1.00 | 1.00 | 0.80 | 0.70 | 0.50 | 0.40 | 0.30 | 0.10 |
| inkCoverage | 0.04 | 0.05 | 0.07 | 0.31 | 0.53 | 0.37 | 0.31 | 0.72 |
| colorfulness | 0.02 | 0.12 | 0.04 | **0.57** | 0.30 | 0.25 | 0.26 | 0.42 |
| canvasArea | 0 | 0 | 0 | **1.00** | **1.00** | 0 | 0 | 0 |
| imageArea | 0 | 0 | 0 | 0.00 | 0 | 0 | 0.22 | **0.71** |
| motion | 0 | 0 | 0 | **0.29** | 0.01 | 0 | 0.08 | 0 |
| textDensity | 0.19 | 0.30 | 0.36 | 0.00 | 0.03 | **0.56** | 0.41 | 0.04 |

All seven of Lead's §10 pairings separate. The corpus is small (n=8) and every number
below inherits that limit.

---

## 2. §4 crux — unstyled vs intentionally minimal

**It works, but by a narrow margin, and only because of three specific signals.**
EXPERIMENT.

`control-raw` (zero author CSS) and `bettermotherfuckingwebsite.com` (deliberate,
argued minimalism) are the crux pair. Of 18 styling sub-signals, **15 are identical
(0.00 on both)**. The entire discrimination is carried by three:

| sub-signal | raw | designed-minimal | what it detects |
|---|---|---|---|
| `constrainedMeasure` | 0.02 | **0.91** | a max-width on the text column |
| `lineHeightSet` | 0.00 | **1.00** | line-height authored rather than `normal` |
| `authoredTypeScale` | 0.00 | **0.67** | font sizes off the browser's default ladder |

**ASSUMPTION.** Those three are exactly the moves a designer makes when deliberately
minimising — set a measure, set a rhythm, set a scale. That they are the discriminator
is encouraging rather than accidental.

**The risk, stated plainly.** On a 0–1 magnitude the pair sits at **0.02 vs 0.16**.
Designed minimalism is much nearer raw HTML (0.02) than either is to a rich site
(0.45). *If the tree maps `stylingRichness` linearly to foliage, raw HTML and designed
minimalism will produce near-identical near-bare trees* — the §4 failure Lead asked
about, arriving through the mapping rather than through the measurement.

**RECOMMENDATION (analysis-side, not a mapping decision).** Treat "is this page
authored at all" as a **separate near-binary axis** from "how rich is the styling".
`unstyledScore` already behaves that way: 1.00 / 1.00 for the two unstyled pages and
≤0.80 for everything else. What that axis *means botanically* is Lead's and the
human's call, not mine.

---

## 3. The most important process finding: invalid pages measure as plausible sites

**The probe's worst failure mode is not crashing.** In the first run, 2 of 5 real sites
were invalid and **both produced confident, believable fingerprints**:

- `lingscars.com` → HTTP 403 Cloudflare challenge, redirected to `motorleaseplatform.com`.
  Measured as `stylingRichness 0.42`, `density 1.00`. We fingerprinted Cloudflare.
- `bettermotherfuckingwebsite.com` (https) → `ERR_CONNECTION_RESET`. We measured
  **Chrome's own error page** and scored it `stylingRichness 0.29`.

Neither threw. Both looked like data. A corpus built without a validity gate would have
been quietly poisoned, and in production a user would get a tree of a Cloudflare page.

**Mitigation, implemented and now in the probe:** a validity gate refusing any page that
fails navigation, returns ≥400, lands on `chrome-error:`, changes host, or matches
known interstitial text. Invalid sites are excluded from results rather than scored.

**ASSUMPTION.** This gate is necessary, not sufficient — a soft-blocked page returning
200 with "please enable JavaScript" would still pass. Not yet tested.

---

## 4. Canvas / WebGL (hypothesis K)

**Confirmed as a genuine hole in DOM inspection, and cheaply detectable.** EXPERIMENT.

`threejs-example` and `bruno-simon` are visually rich and structurally almost empty:

| | structure (DOM) | inkCoverage (pixels) | colorfulness |
|---|---|---|---|
| threejs-example | **0.07** | 0.53 | 0.30 |
| bruno-simon | **0.06** | 0.31 | **0.57** (highest of all 8) |

DOM-derived structure ranks both *last*; pixel-derived signals rank them high.

**The detector is their disagreement, not a `<canvas>` tag.** `structure` low +
`inkCoverage` high identifies "the DOM does not represent this page" without needing to
know why — so it should also catch full-bleed video or image-only pages, which a
canvas-tag check would miss. **ASSUMPTION** — only the canvas case was actually tested.

**Corollary, learned the hard way:** my first pass masked `<canvas>` and `<svg>` out of
the palette as "media". That erased 100% of the WebGL page and returned no palette at
all. Canvas and SVG are *authored design* and must never be masked. Fixed.

---

## 5. Palette, and photography corruption (Q12)

**Yes — accents can be recovered from photography-heavy sites, by masking `<img>`,
`<picture>` and `<video>` (never canvas/svg).** EXPERIMENT. The masked/unmasked pair is
decisive:

| site | unmasked primary | masked primary | reading |
|---|---|---|---|
| unsplash | `#8e7148` brown, colr **0.42** | `#c8b497`, colr **0.01** | The brown was *a photograph*. Unsplash's actual UI is monochrome — and the masked number says so. |
| yale-art | `#95aedb` washed blue-grey | **`#f72f2d` vivid red** | Masking didn't just denoise, it **recovered the real brand accent** the unmasked pass missed. |

**TENTATIVE.** The *difference* between masked and unmasked colourfulness is itself a
signal — it measures how much of a site's colour is photography versus design. Unsplash
0.42→0.01 (all photography); yale 0.26→0.26 (all design). That distinction may matter
more for D5 than either number alone.

Ground/background colour was unambiguous on all 8 sites and is the single most reliable
colour value obtained. This independently **confirms the open ASSUMPTION** currently
recorded in `docs/WEBSITE-ANALYSIS.md` — that driver-side screenshots escape canvas
tainting. They do; all pixel numbers here came that way, on sites where in-page canvas
reads are tainted.

---

## 6. Motion (hypothesis G, Q11)

**Detectable cheaply and with a true-zero noise floor.** EXPERIMENT.

Three viewport screenshots ~700 ms apart, downscaled, diffed; sustained motion =
`min(diff12, diff23)` so a one-shot lazy-load cannot register as animation.

- Static pages return **exactly 0.0000** — not near-zero. No false positives on 5 static sites.
- Real motion: bruno-simon **0.291**, yale 0.078, threejs-example 0.014.
- **Grid resolution barely matters**: 96×60 ≈ 384×240 (0.0208 vs 0.0212). The cheap version is fine.

**Declared ≠ visible, demonstrated:** `unsplash` declares 6 CSS animations and 54
transitions and measures **0.000** visible motion. A DOM-derived animation count would
have called the stillest site in the corpus animated.

**Caveat (ASSUMPTION).** Magnitude is not perceived liveliness. A full-page 3D scene
(threejs-example, 0.014) scores far *below* a page with small hover/marquee bits
(yale, 0.078), because the metric counts changed screen area. It is a good detector and
a poor magnitude. Cost: ~1.7 s of pure waiting, ~22% of total latency.

---

## 7. Lead's §6a — does hypothesis A add anything over I?

**Very little, and it actively misleads on canvas pages.** EXPERIMENT.

`structure` correlates 0.70 with visible-element count. It ranks unsplash and yale at
1.00 and both WebGL pages last — i.e. it measures *how much DOM furniture exists*,
which for a canvas page is nothing and for a framework page is plenty.

Where it earns its place is **only in disagreement with `inkCoverage`** (§4 above).
As a standalone "how much wood" magnitude it looks redundant with layout and density.
**Consistent with Lead's constraint (b) and D3.** Recommend carrying it as a
*disagreement flag*, not as a trunk magnitude — but this is one corpus and the finding
deserves the full corpus before anyone acts on it.

---

## 8. Lead's §6b — are these just page-size metrics?

**The first run could not answer this, because the corpus was rank-confounded** — the
six sites happened to order by complexity, so every signal correlated with every size
proxy (worst |r| up to 0.99).

Adding two deliberate dissociation sites (`craigslist`: many nodes, visually flat;
`bruno-simon`: tiny DOM, visually rich) broke most of it:

| signal | worst \|r\| before | after |
|---|---|---|
| stylingRichness | 0.96 | 0.78 |
| unstyledScore | 0.89 | 0.78 |
| chromaticRatio | 0.92 | 0.75 |
| structure | 0.87 | 0.70 |
| canvasArea | 0.39 | **0.53** (uncorrelated throughout) |

**Method finding, and the one I'd most want carried forward:** corpus composition
determines whether this test means anything. Any future corpus must contain explicit
dissociation pairs, or §6b silently returns "everything is suspect".

Still flagged after dissociation: `roundness` (r=0.95 vs docHeight), `imageArea`
(r=0.97 vs docHeight), `controlDensity` (r=0.94 vs authorRules). **OPEN** — all three
are plausibly real correlations (taller pages *do* hold more images), but n=8 cannot tell.

---

## 9. Q13 — how much of the page?

**First viewport is enough for the styling/crux axis; three viewports matter for
density and imagery.** EXPERIMENT. Mean |v1 − v3| drift:

- `unstyledScore` **0.000**, `stylingRichness` **0.004** — scope-invariant.
- `inkCoverage` 0.070, `imageArea` 0.047, `controlDensity` 0.047 — and the drift is
  concentrated entirely in the long scrolling pages (unsplash 0.224, yale 0.180).

**RECOMMENDATION.** Analyse three viewports. It is nearly free (the cost is capture, not
computation) and only the long-page density signals need it.

---

## 10. §12 — where the time goes

Mean 11.6 s/site over 8 sites (4.1 s median-ish; craigslist 22.9 s and bruno-simon
25.7 s are the tail). Breakdown of the mean:

| stage | ms | note |
|---|---|---|
| page load | 4005 | network-bound, dominates |
| settle (networkidle + fonts + 1.8 s) | 4122 | **tunable — pure waiting** |
| motion capture (3 frames) | 3066 | **pure waiting; ~22% of total** |
| screenshot | 160 | |
| pixel processing | 112 | |
| **DOM + computed-style measurement** | **12** | **essentially free** |

**The headline: measurement costs nothing; waiting costs everything.** 12 ms of the
11.6 s is actual analysis. Every lever that matters is a waiting policy — settle time,
motion sampling, load timeout — not algorithmic cost.

Comfortably inside Lead's 45 s ceiling. Sites parallelise trivially; within one site the
sequence is inherently serial. Dropping motion would save ~1.7–3 s.

---

## 11. Q15 — smallest fingerprint I'd recommend for V1

**TENTATIVE.** Eight values that each separated the corpus, are cheap, and are not
redundant with each other:

```json
{ "authored":      0.0-1.0,   // near-binary; the §4 crux axis (from unstyledScore)
  "stylingRichness":0.0-1.0,  // rendered styling magnitude
  "inkCoverage":   0.0-1.0,   // pixel density — how much of the frame is not ground
  "colorfulness":  0.0-1.0,   // Hasler-Süsstrunk, from rendered pixels
  "imageArea":     0.0-1.0,   // visible photographic area (area, not count)
  "textDensity":   0.0-1.0,   // visible chars per megapixel
  "motion":        0.0-1.0,   // sustained frame diff; true-zero floor
  "palette": { "ground": "#hex", "primary": "#hex", "secondary": "#hex" } }
```

**Cut for V1, with reasons:**

| signal | why |
|---|---|
| `graphicArea` (SVG) | 0.000 on all 8 sites. Corpus had no illustration-led site — **untested, not disproven**. |
| `embedArea` | 0.000 on all 8. Same — untested. |
| `roundness` | 0.000–0.024. The corpus contains no rounded site (yale is brutalist, two are canvas). **Untested, not disproven** — `tailwind`/`figma` in the full corpus would test it. |
| `centredness` | range 0.167 — genuinely flat. Nearly everything is centred. |
| `controlDensity` | range 0.156, r=0.94 with authorRules. Weak and suspect. |
| `regularity` | separates (0.62–1.00) but inverts oddly: raw HTML scores 1.00 "perfectly regular" because one column is trivially aligned. **Needs redefinition before use.** |
| declared animation counts | actively wrong — see §6. |

The three "FLAT — cut" verdicts printed by `compare.js` for `roundness`, `graphicArea`
and `embedArea` are **corpus artefacts, not verdicts**. The tool's label is too
confident; do not act on it.

---

## 12. §13 — failure cases observed (documented, not solved)

| case | observed | severity |
|---|---|---|
| Bot blocking | `lingscars.com` → CF 403 + host change. **Scored as a normal site.** | **high** |
| Connection reset on https | `bettermotherfuckingwebsite.com` https resets; **http works**. Chrome's error page scored 0.29. | **high** |
| Domain ≠ content | `threejs.org` is a thumbnail grid, not a canvas page. My own corpus tag was wrong until I looked at the screenshot. | medium — corpus tags are hypotheses, verify visually |
| Slow sites | craigslist 22.9 s, bruno-simon 25.7 s — 2–6× the median | medium |
| networkidle never fires | several sites; 8 s timeout needed | low, handled |
| Cookie/consent overlays | detector present (fixed/sticky >15% viewport); **fired once, on threejs.org — not investigated** | OPEN |

**Not tested at all:** login walls, paywalls, infinite scroll, lazy-load-on-scroll,
delayed animation, mobile-only layouts, dark-mode-default sites, non-HTML URLs, dead
URLs, cross-origin iframe content (invisible to top-frame inspection — `threejs.org`
has 1 iframe we cannot read into).

---

## 13. What I did not do

- No mapping from any signal to any tree property. Out of scope by §16 and not mine.
- No full corpus — stopped at the checkpoint as instructed (§15).
- `docs/WEBSITE-ANALYSIS.md` untouched; a background agent holds it.
- Nothing committed.

## 14. Open questions for Lead

1. Proceed to the full corpus, and should it be rebuilt around **dissociation pairs**
   (§8) rather than the current "one of each kind" list?
2. The corpus lacks a **rounded** and an **illustration-led** site, so `roundness` and
   `graphicArea` are untested rather than dead. Add `tailwind`/`figma` before cutting?
3. §4 separation is real but narrow (0.02 vs 0.16). Is a separate near-binary
   `authored` axis the right shape? **This touches the analysis→tree interface and is
   Lead's boundary call, not mine.**
4. `regularity` needs redefinition (raw HTML scores a perfect 1.00). Worth the work?
5. Cookie-overlay handling is a product question as much as a technical one.


---

## 15. Full corpus results (25 URLs, 23 valid)

**EXPERIMENT.** Supersedes the checkpoint numbers above where they differ.

Validity gate rejected 2: `bloomberg` (HTTP 403, "Are you a robot?") and `lings-cars`
(HTTP 403, Cloudflare). Both would previously have been scored as ordinary sites.

### What the larger corpus changed

| signal | checkpoint verdict | full-corpus verdict |
| --- | --- | --- |
| `unstyledScore` | separates (0.10–1.00) | **confirmed, spans full 0.00–1.00** across 23 sites, ordered sensibly |
| `stylingRichness` | separates (0.02–0.46) | **confirmed, 0.02–0.61**; stripe/tailwind/linear top out at 0.58–0.61 |
| `roundness` | "untested — corpus has no rounded site" | **tested and it fails.** tailwind 0.02, figma 0.04, linear 0.05, stripe 0.07 — sites that look rounded. Area-weighting is the wrong sample. The parallel probe's control-scoped method is correct; adopt or cut. |
| `graphicArea` | "untested" | **tested, weak.** 0.00 on 21/23; tailwind 0.21, linear 0.06. |
| `embedArea` | "untested" | **0.00 on all 23.** Cut for V1. |
| `motion` | "separates" | **confirmed** (figma 0.22, cosmos 0.16) **but not repeatable** — bruno-simon gave 0.291/0.015/0.028/0.016 across four runs of the same URL. |
| `textDensity` | separates | **confirmed**: wikipedia 0.87, mfw 0.82, craigslist 0.56 vs image sites 0.01–0.07 |
| `canvasArea` | separates | **confirmed**: threejs-ex 1.00, bruno 1.00, cosmos 0.54, stripe 0.27, vercel 0.20 |

### Crux ladder across five sites (the §4 result, extended)

| | control (no CSS) | info.cern.ch | motherfucking- | bettermotherfucking- | stripe |
| --- | --- | --- | --- | --- | --- |
| `stylingRichness` | 0.02 | 0.02 | 0.07 | 0.16 | 0.59 |
| `unstyledScore` | 1.00 | 1.00 | 0.90 | 0.80 | 0.00 |

The ladder is monotonic and the two genuinely-unstyled pages sit together at the extreme.

### Cost at corpus scale

Median **7.8 s**, p90 **14.8 s**, max **24.6 s** (craigslist). DOM measurement mean
**20 ms**. Inside Lead's 45 s ceiling on every site measured.

### Revised recommendation for the smallest V1 fingerprint

Unchanged from §11 except: **drop `roundness`** (tested, fails as defined) and
**drop `embedArea`** (0.00 everywhere). `graphicArea` is weak but real — Lead's call.

---

## 16. Botanical DNA round — fingerprint → DNA

**EXPERIMENT.** `results/dna.json`, 10 real sites + 1 synthetic. Validates clean against
the frozen contract (`probe/validate-dna.js`, 0 errors) and is deterministic — re-running
produces a byte-identical file.

### Where the bands came from

Boundaries sit at **natural gaps in the sorted 23-site distribution**, not round numbers:

```
stylingRichness: .02 .02 .07 | .16 .17 .18 .24 | .33 .38 .42 .42 .43 .44 .45 .45 .48 .49 .49 .49 | .57 .58 .59 .61
                  BARE ≤0.10 |    SPARSE <0.30 |                        NORMAL <0.50            |   LUSH ≥0.50
```

The gaps `.07|.16`, `.24|.33` and `.49|.57` are real features of the corpus. NORMAL holds
12 of 23 sites, which matches the contract's "the canonical tree is roughly NORMAL".

### The crux survives into DNA

The thing this whole phase was built to protect:

| | authored | stylingRichness | → foliage |
| --- | --- | --- | --- |
| info.cern.ch (no CSS) | 0.00 | 0.02 | **BARE** |
| bettermotherfuckingwebsite.com (designed minimal) | 0.20 | 0.16 | **SPARSE** |

BARE requires **both** low `authored` and low `stylingRichness`, so designed minimalism
cannot fall into it. The 0.02-vs-0.16 magnitude risk flagged earlier is neutralised by
making BARE a two-condition gate rather than a point on a line.

### AUTUMN is not decidable from the V1 fingerprint — and no real site reaches it

Lead's §4(b), answered with measurement rather than eyeballing hexes. I recomputed full
24-bin hue histograms from the saved screenshots (`probe/hue.js`, no re-crawl).

**Three hex colours cannot express hue *coverage*.** `#c96a2b` tells you a colour is
warm; it cannot tell you whether warm hues *dominate the chromatic character*. So autumn
is not decidable from the contract's V1 fields. It **is** decidable from pixels with one
extra value — warm-hue share of chromatic coverage.

**But adding that field would buy an untriggered state.** Measuring it, every apparent
autumn candidate collapses once photographic media is masked out:

| site | warm share (raw pixels) | warm share (media masked) |
| --- | --- | --- |
| unsplash.com | 0.897 over 0.47 coverage | **0.177 over 0.0013** |
| apple.com | 0.391 | **0.000** |
| sive.rs | 0.474 | **0.000** |
| threejs.org | 0.246 | **0.000** |
| stripe.com | 0.401 | 0.690 over only 0.030 coverage |

The warmth was always photographs. **Zero of 23 sites has a warm-dominant *design*
palette.** Per contract §"Do not force a state", one clearly-labelled `synthetic: true`
record is included so 3D can test autumn rendering.

**A false positive worth recording.** Before gating, `threejs.org/examples` triggered
AUTUMN on accents `#a67f69` / `#ac6153` / `#b79e78` — the **skin tones of a rendered 3D
character**. That is reading content, not design, and is exactly what **D3** forbids.
Autumn now additionally requires `canvasArea < 0.5`, because on a canvas-dominated page
the pixels are rendered content rather than design language. **ASSUMPTION** — one case.

### WINTER: exactly one site qualifies

`vercel.com` — authored 0.70, stylingRichness 0.44, inkCoverage 0.05, colourfulness 0.00.
Clearly authored, highly restrained, colourless, sparse. It is distinct from BARE by
construction (winter requires *high* authored; bare requires low).

**Near-miss worth Lead's attention:** `linear.app` fails on one condition only —
inkCoverage 0.28 against a 0.20 ceiling — while being the most colourless authored site
in the corpus (colourfulness 0.02, authored 1.00). Five further sites fail on
colourfulness alone. The winter gate is currently carried almost entirely by the
colourfulness condition.

### Threshold cliffs (Lead's "no cliffs" constraint)

One genuine cliff found:

- **gov.uk `stylingRichness` 0.494 is 0.006 below the NORMAL|LUSH boundary (0.50).**
  A hair's difference flips its foliage state. Flagged, not silently rounded.

Softer proximities: stripe inkCoverage 0.171 (+0.021 over airy|normal); wikipedia
inkCoverage 0.211 (+0.011 over the winter ink ceiling); figma and cern sit ~0.04 from the
flowers none|few edge.

### Deviation from the brief, surfaced rather than absorbed (AGENTS.md R2)

**The brief says `colorfulness` drives flower amount. I used the *media-masked*
colourfulness instead**, and flower colour from the masked palette.

Justification is this phase's own evidence: unmasked, unsplash.com reads colourfulness
0.44 with primary `#8e7148` — a brown taken from *a photograph someone else uploaded*.
Masked, it reads 0.01. Conversely masking **recovered** art.yale.edu's true accent
(`#95aedb` → `#f72f2d`). Under D3 and D5, a site whose colour is entirely other people's
photographs arguably has no brand colour to carry into flowers.

**Consequence:** unsplash.com gets **no flowers**. That is the "flowerless tree is a
valid result" case, reached on the most photographically colourful site in the corpus.
**This is Lead's call to accept or reject** — it changes which sites flower.

### `textDensity` is not a weak signal (Lead's §4(a))

The brief lists it as weak/experimental. **The corpus disagrees, and I am saying so
plainly as asked.** Across 23 sites:

- **Range 0.87** (wikipedia 0.87, motherfuckingwebsite 0.82, craigslist 0.56 against
  0.01–0.07 for image-led sites) — among the widest of any signal measured.
- **The lowest confounder correlation of any signal** — worst |r| 0.42 against every
  page-size proxy, where `stylingRichness` is 0.78 and `imageArea` is 0.97. It is the
  *least* likely of all V1 signals to be a disguised page-size metric.

By both of this phase's own quality tests it is one of the **strongest** signals we have.

I have nonetheless kept its *effect* deliberately small in the DNA (weight 0.3 in
skeleton complexity, against 0.7 for inkCoverage), because the human's instruction was
explicit that text-heavy sites must not become gigantic trees. **The measurement being
strong and the effect being small is a deliberate choice, not an oversight** — but if the
human wants text character to show, the evidence supports giving it more room than
"weak/experimental" implies.

### `imageArea` confirmed weak, as suspected

Used only to modulate nothing in this round. Its r=0.97 with `docHeight` stands. It
earns no role in DNA and I have not manufactured one.

### Background is a weak differentiator, and that is a fact about the web

> **RETRACTED — see §17.** The "19 of 23" figure below is wrong: 5 of 23 grounds are
> genuinely dark. The paragraph is left standing because the wrong number was
> load-bearing for the "deliberately subtle" defence it supports.

**19 of 23 corpus grounds are pure white.** Deriving background from `palette.ground`
alone gives every site an identical page. The current rule preserves the site's
light/dark decision and, when the ground is achromatic, borrows the *design accent's*
hue at low saturation — giving 9 distinct backgrounds across 11 records. Even so the
spread is subtle by construction: a background that competes with the tree has failed.
**ASSUMPTION** — that borrowing the accent hue is the right move rather than leaving
achromatic sites neutral.

### Observed failure case

`gov.uk`'s capture includes a **cookie/consent banner** across the top of the frame. It
does not dominate, but it is being measured as part of the page. First observed instance
of that documented edge case.

---

## 17. Dark grounds — correction, and a product-level finding

### Correction to §16

I wrote "19 of 23 corpus grounds are pure white". **That was wrong.** Measured properly:

| | count | sites |
| --- | --- | --- |
| genuinely dark (L < 0.5) | **5 of 23** | nasa `#000000`, apple `#010101`, spacejam-1996 `#030303`, linear `#08090a`, bruno-simon `#2b113d` |
| near-white (L >= 0.9) | 18 of 23 | the rest |

The corpus was never as monotone as I claimed. `linear.app` has a dark ground at **72%
coverage** — as unambiguous a dark site as exists.

### The dark background branch is now exercised

`linear.app` added to the DNA test set (added, not swapped, so `vercel.com` keeps the only
WINTER case). It produces background `#191c1f` against `#e5e5eb`-ish for the light sites:
lightness spread across the set goes from ~0.03 to **0.800**, and 10 of 12 backgrounds are
now distinct. The dark branch is no longer an untested assertion.

### The finding underneath it: "what a website looks like" is not single-valued

`vercel.com` was chosen as the dark/monochrome site and measured `#fbfbfb` — light. The
cause is not the site and not the metric. **It is a setting in my own harness.**

| site | `colorScheme: light` | `colorScheme: dark` | |
| --- | --- | --- | --- |
| vercel.com | `rgb(250,250,250)` | `rgb(0,0,0)` | **changes completely** |
| linear.app | `rgb(8,9,10)` | `rgb(8,9,10)` | dark by design |
| github.com | `rgb(13,17,23)` | `rgb(13,17,23)` | dark by design |

The probe pins `colorScheme: 'light'`. For any site that respects
`prefers-color-scheme`, **that single harness setting decides what the website *is*** —
and in production it would be decided by the visitor's OS preference, which we do not
control and the site owner did not choose.

**This is a product question, not a probe bug.** It belongs with the existing OPEN edge
cases (dark-mode-by-default sites; mobile vs desktop width). The same URL has more than
one true appearance, and something has to pick one.

**ASSUMPTION, now explicit:** every number in this document was measured in light mode.
That was never stated before and it should have been.

**Caveat this places on the WINTER result:** `vercel.com` is the only corpus site
reaching WINTER, and it reaches it *in light mode*. In dark mode its ground is pure black
and its ink and colour measures would differ. The one triggered WINTER case is therefore
partly an artefact of a harness choice. It still demonstrates the state for the renderer,
but it should not be read as "vercel.com is a winter website" without qualification.
