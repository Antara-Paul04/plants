# Bloom system — Lead rulings and work packages

**2026-09-20 · DECIDED. Not a discussion document.**
Source: the human's post-external-review directive. My job here is to turn it into decided
contracts so `visual-3d` and `taste` can execute without coming back to the human.

Terminology note used throughout: **grammar**, never *species*. Plants makes a stylised
botanical translation; it does not classify trees.

---

## The architecture, in one diagram

```
WEBSITE  ──► measured fingerprint ──► BOTANICAL DNA        (meaning)
                                          │
MORPHOLOGY (a DNA field) ─────────────────┼──► compatible bloom grammars   (constraint)
                                          │
SEED (a DNA field, FNV-1a over domain) ───┴──► one grammar chosen          (variation)
                                                    │
                                                    ▼
                                              RENDERER
```

Meaning lives in DNA. Variation lives in the renderer. **They never mix.**

---

## L1 — No new DNA field for flower form. DECIDED, and it costs nothing.

The renderer already has everything it needs. `morphology` and `seed` are **both already in
the contract**, and `seed` is FNV-1a over the normalised domain — `analysis/lib/mapping.js:21`
says "Same site → same seed, always." So:

```
grammar = compatibleGrammars(morphology)[ stableIndex(seed) ]
```

**The Botanical DNA contract does not change.** No `flowers.form`. No new metric. The
human's requirement that "the same domain must always receive the same choice" is satisfied
by a field that already exists, for free.

`stableIndex` must derive from `seed` **on its own stream** — not by advancing the shared RNG,
or adding a grammar re-rolls every downstream draw and every existing tree changes.

## L2 — `morphology` currently has exactly ONE value, and everyone needs to know that

`mapping.js:~305` emits `morphology: 'broad'` as a hardcoded string literal. The contract
documents the field as "BROAD only this round; the field exists so conifer / palm / other can
arrive later without reshaping the contract."

Consequences, stated plainly so nobody builds on a false assumption:

- The compatibility table has **one row today**. Build it as a real table anyway — it is the
  extension point and it costs nothing to write properly.
- **All of today's variation comes from seed choosing among grammars compatible with `broad`.**
  That is real, visible variation across sites, and it is what the human asked for.
- **PENDANT's survival depends entirely on whether Taste rules it compatible with `broad`.**
  If it is not, pendant is dead code until a pendulous morphology exists. Taste must rule on
  this explicitly and early — do not leave it implied.

## L3 — Rename the three forms to grammars. DECIDED.

| was | becomes | what it is |
|---|---|---|
| `blossom` | **`cluster`** | many small blossoms grouped together |
| `magnolia` | **`statement`** | fewer, larger flowers |
| `wisteria` | **`pendant`** | hanging, tapering clusters |

Rename in code, params, docs and render filenames. The old names invite exactly the error the
human forbade — a future agent reading `magnolia` will eventually try to make the tree *be* a
magnolia. Keep a one-line note mapping old→new so older renders stay readable.

## L4 — Bloom amount is a PERCEPTUAL contract. Fractions are tuning. DECIDED.

`BLOOM_FRACTION = { none: 0, few: 0.1, medium: 0.27, abundant: 0.62 }` is now an
implementation detail, not the definition. The definition, judged at **~140 px**:

| amount | perceptual target |
|---|---|
| `few` | touches of the website's colour |
| `medium` | unmistakably a flowering tree |
| `abundant` | the website's colour is one of the **dominant** characteristics of the crown |

Taste tunes the fractions to hit those targets and judges at 140 px **and** hero size. Nobody
optimises the numbers in isolation.

## L5 — Amount controls a FOLIAGE RELATIONSHIP, not just a count. DECIDED.

This is the fix for the wreath, and it is botanical rather than positional. The wreath is
**occlusion** — bloom is already evenly distributed; front leaf clusters hide it. Moving
flowers has been tried three times and does not work. **Do not try it a fourth time.**

| amount | foliage on flowering twigs | intent |
|---|---|---|
| `few` | mostly normal | small touches; outer growth bias is fine here |
| `medium` | **clearly reduced** | bloom penetrates the visible crown |
| `abundant` | **dramatically reduced — a peak-bloom / pre-leaf phase** | bloom is a major part of crown volume; colour reads through the **middle**, not the rim; exposed wood between bloom clusters is correct and wanted |

`abundant` stops being "a leafy tree with more flower meshes on it" and becomes **a different
phase of the year**. Inspired by trees that bloom heavily before or during leaf emergence —
but *not* a simulation of any species.

Bonus this buys us: the human has flagged that `few`/`medium` sit too close at 140 px while
`medium`/`abundant` sit too far apart. Giving each amount its own foliage relationship
re-spaces the whole ladder along an axis that is far more visible than count.

## L6 — Local foliage contrast adaptation. DECIDED, new renderer mechanism.

**Never repaint the website's colour.** Maroon stays maroon, burgundy burgundy, blue blue,
deep green deep green. The existing pale-toward-the-petal-edge mechanism stays if it still
earns its place.

Added on top: around flowering twigs only, when flower value sits too close to nearby foliage
value, move the **foliage's** value away from the flower.

- dark or cool flower → nearby foliage becomes somewhat **lighter**
- very light flower → nearby foliage becomes somewhat **deeper**
- **hue is not meaningfully changed.** Value only.
- **distant foliage is untouched** — this is a local stage, not a global grade.

We change the stage, never the subject. Taste compares warm / cool / dark / very-light accents
at 140 px. **A blue site must not end up with a weaker identity than a red one.** That is the
acceptance test.

## L7 — D5 is broadened. DECIDED.

Old: *"Flowers are the primary way the website's accent colour reaches the tree."*

New invariant: **the website's colour enters the tree through living botanical detail.**

- Flowers remain the primary/default carrier **in flowering leafy states**.
- Flowers need **not** carry colour in every botanical state.
- Permitted carriers: flowers, fruit, berries, buds, other restrained living detail.
- **Forbidden carriers: bark, trunk, soil, the whole foliage mass, the environment.** The tree
  stays botanically coherent.

## L8 — Winter gets its own botanical colour language. DECIDED.

Winter currently sets `flowers: none` and so expresses nothing of the website. Fix it, without
putting ordinary blossom on a dormant tree and without tinting bark.

- **Site has the fruit trait → winter expresses it as persistent fruit / berries.**
- **No fruit trait → accent-coloured BUDS carry the colour.** Buds attach botanically to
  terminal and lateral twigs, stay restrained, may be slightly exaggerated for 140 px, and
  must still look right at hero size.

Build both; Taste rules. A winter tree must read **sculptural, intentional, beautiful,
specific** — never empty, unfinished, or as though analysis failed. The project's own line
holds: *bare is the absence of styling; winter is the presence of restraint.*

## L9 — Remove the fruit lottery. DECIDED. This is an analysis change and it is mine to order.

`analysis/lib/mapping.js` currently reads:

```js
const roll = rng();
const fruitOn = eligible && roll < B.fruit.rate;   // rate = 0.50
```

with the comment *"seeded personality, represents nothing analytical (by design)."*

The directive is explicit: **do not make fruit random.** A seeded coin-flip is still random
from the website's point of view — **half of all genuinely fruit-eligible sites silently lose
a measured trait.** Concentration is the measurement; if a site is concentrated and eligible,
it fruits.

- **Delete the roll.** `fruitOn = eligible`.
- Keep `B.fruit.concentration = 0.60` — that threshold *is* measured and the corpus gap is
  real (gov.uk 0.874, stripe 0.752, figma 0.695, then a drop to 0.326).
- Keep the canvas-dominant exclusion — bruno-simon reading 1.0 because the page is one canvas
  is degenerate, not concentrated.
- Side benefit: this roughly doubles fruit prevalence, which pushes against the middle collapse.

## L10 — Widen fruit eligibility. DECIDED.

Current gate:

```js
eligible = concentrated && state !== 'bare' && botanicalState !== 'winter'
        && (state === 'normal' || state === 'lush');
```

Two clauses now contradict the directive and come out:

- `botanicalState !== 'winter'` — **L8 explicitly wants winter to express fruit.** Remove.
- `(state === 'normal' || state === 'lush')` — this silently denies fruit to every `sparse`
  tree, which is "deleting meaningful DNA because composition is inconvenient." Remove;
  `sparse` may fruit, at a count the renderer suits to a sparse crown.

`state !== 'bare'` **stays**: a bare tree is an unstyled site and carries no ornament by
definition.

*Correction to my own earlier note:* I previously recorded an `amount !== 'abundant'` clause in
this gate. It is not in the code. Flowers and fruit are already able to co-occur; L11 is about
making them compose, not about unblocking them.

## L11 — Flowers and fruit coexist when both are earned. DECIDED; composition is Taste's.

Do not prohibit fruit because a tree flowers. If the site earns both, both ship. Tools
available — Taste and visual-3d pick: separate crown zones, different branch levels, fruit
lower and on heavier/older wood, flowers on finer/newer growth, reduced counts, size
hierarchy, bloom reduction around fruit-bearing twigs. Fruit stays visually distinct from
flowers. Avoid clutter — but never solve clutter by deleting a measured trait.

## L12 — Standing bans, recorded so they are not rediscovered

Rejected, with reasons, for `docs/DECISIONS.md`:

- **Morphology directly selecting one fixed flower form** — expresses the same signal twice.
- **A new analysis metric for flower form** — reverse-engineering meaning to justify geometry
  that happens to exist.
- **Random fruit** — see L9.
- **Bleaching dark accents** — maroon `#723131` → pink `#d27f7f` preserved hue exactly and
  destroyed the colour. For a dark accent, the darkness *is* the identity.
- **Moving flowers outward to solve the wreath** — tried three times; the cause is leaf
  occlusion.
- **Literal website-background-colour → scene mapping.**
- **Colourfulness as a proxy for design richness** — measured r = 0.02 across 23 sites. They
  are orthogonal. This is the Linear failure and it must not return.

---

# Work packages

## visual-3d

1. **L3 rename** first — cheap, and everything else reads better afterwards.
2. **L5 foliage relationship per amount.** The single highest-impact change. Hypothesis to
   test: reducing flowering-twig foliage hard at `abundant` kills the wreath and makes peak
   bloom a real phase.
3. **L7 debug views**, one per amount: (A) normal (B) foliage hidden (C) flowering-twig
   foliage highlighted (D) 140 px thumbnail (E) hero. Taste cannot verify the wreath without
   C and D, and neither can I.
4. **L1 grammar selection** — `compatibleGrammars(morphology)` + `stableIndex(seed)` on its
   own RNG stream.
5. **L6 local contrast adaptation.** Value only, local only.
6. **L8 winter** — persistent fruit/berries path and accent-buds path, both built.
7. **L11 composition** for flowers + fruit.
8. **Performance LAST** (§15): petal tessellation where silhouette is unaffected, instancing,
   shared geometry, LOD, hidden geometry. Not before Taste passes the visuals. Current cost
   is ~490k triangles for the tree plus up to +230k for abundant bloom, on a 1.5–2.5 s build.

## taste

- Rule on **pendant × broad compatibility** early (L2). It gates whether a third grammar exists.
- Own the compatibility table (L1/L2) after looking at real geometry.
- Own the L4 perceptual targets and the fractions that hit them.
- Verify the wreath honestly against debug views C and D: bloom exists through the crown, and
  **visible** bloom exists through the crown.
- Run the L6 comparison: warm / cool / dark / very-light at 140 px.
- Make winter desirable (L8).
- All routine aesthetics are yours — sizes, scales, counts, tones. Do not escalate them.

## analysis

Involved only for L9 and L10, both of which are gating-rule changes I have ordered, not
measurement changes. **Verify, do not redesign:** confirm `accentConcentration` still behaves
on the corpus, and confirm removing the roll and the two eligibility clauses does not let
something absurd through. If a measurement genuinely looks wrong, say so; otherwise make the
change and report the new fruit prevalence across the 56-site survey.

## lead (me)

Integration, sequencing, docs (§18) once stable, and keeping the loop moving. I do not
implement and I do not overrule Taste on aesthetics.

---

# Test matrix (§16)

Deterministic, and judged **website screenshot beside tree**, before anyone looks at metrics.

| # | case | what it proves |
|---|---|---|
| A | warm red/pink accent | baseline legibility |
| B | deep maroon / burgundy | darkness survives |
| C | blue / cool | L6 works; no systematic weakness |
| D | orange / yellow | mid-value accents |
| E | near-achromatic, sophisticated | Linear case — rich but monochrome |
| F/G/H | few / medium / abundant | L4 + L5 ladder is perceptually spaced |
| I | fruit only | fruit reads alone |
| J | flower + fruit | L11 composition |
| K | winter, no fruit | accent buds |
| L | winter, with fruit | persistent fruit/berries |
| M | ≥2 compatible grammars on comparable sites | L1 variation is visible and stable |

---

# Loop discipline (§19)

One hypothesis, one change, one review. Not twenty changes at once. Reverting something that
makes the tree worse is expected and costs nothing. Rewriting the existing flower
implementation is allowed — **do not preserve bad architecture because work has already gone
into it.**

Report to Lead. Do not commit to `main`; I integrate.

---

# Re-sequencing and two new rulings — after test-session data, 2026-09-20

The test session measured the 56-site corpus against this directive. Two findings change the
order of work.

## L13 — L6 is promoted to the HIGHEST-priority item. Blue is 18 of 56 accents.

I had L6 (local foliage contrast adaptation) fifth in visual-3d's package, filed under
fairness. It is not a fairness item. **Blue is the single most common accent on the web
corpus — 18 of 56 sites, very nearly a third.** A systematic weakness in cool accents is
therefore not an edge case affecting a few unlucky sites; it is a defect affecting a third of
every tree the product will ever make.

Measured cool-accent sites available for the matrix: irs.gov `#1465a2`, github.com `#0b0d40`,
aljazeera.net `#201a50`, india.gov.in `#160f67`, newyorker.com `#56a2d0`, and at the very
light end kantei.go.jp `#dde8fd` and openstreetmap.org `#aad3df` — which also give us case
(D-adjacent) *very light* accents, where L6 must push local foliage **deeper** rather than
lighter.

**Revised visual-3d order: L3 rename → L5 foliage relationship → L7 debug views → L6 local
contrast → L1 grammar selection → L8 winter → L11 composition → performance.** L5 and L7 stay
ahead of L6 only because L7's debug views are how L6 gets judged at all.

## L14 — The achromatic palette collapses to a single cream. Analysis item.

The test session found that **all four near-achromatic sites — openai.com,
species-in-pieces.com, bbc.com, pentagram.com — receive the identical flower pair
`#e5e5d1` / `#9d9d66`.**

This is by construction, and the construction was a reasonable fix for a worse bug.
`achromaticPetal()` in `analysis/lib/mapping.js` borrows the ground's hue only when the
ground has saturation ≥ 0.05; otherwise it uses a fixed warm cream at hue 42. The comment
records why: a greyscale ground reports hue 0, which is **red**, and borrowing it "gave four
unrelated sites the same pink ivory." So the pink was fixed by substituting one constant for
another — and every truly greyscale site now converges on that constant.

Why this matters rather than being cosmetic: §13 of the directive is explicit that a
sophisticated monochrome site must not look boring, and that it may take "white / ivory /
grey botanical accents **where the source palette supports that**." The palette is not being
asked to support it. Note in particular that **openai.com is light and species-in-pieces.com
is dark**, and they currently receive the same petal — two sites that look nothing alike,
issued identical bloom.

**This is not a request for a new metric** (§14 stands). The information already exists in
the fingerprint — ground lightness, ink colour, the unmasked palette. Analysis: use what is
already measured to differentiate achromatic sites, or report back that the existing
measurements genuinely cannot separate them, which would itself be a finding worth having.

## Test-matrix status, measured

| case | status |
|---|---|
| A warm | raycast `#c7273a` abundant · pinterest `#e91d3c` · anthropic `#c86e51` · drudgereport `#f48a8a` few |
| B maroon/burgundy | **no real site in 56.** Nearest is mit.edu's *fruit* colour `#ad1f35`. Hand-picked site needed |
| C cool | 18 available — see L13 |
| D orange/yellow | mailchimp `#cdb523` · amazon `#f7d945` · pudding.cool `#f1b24c` · rauno.me `#fbfb04` · ikea `#feda01` (autumn) |
| E achromatic-rich | openai · species-in-pieces · bbc · pentagram — **all four identical, see L14** |
| F/G/H ladder | blue: daringfireball/arxiv → irs.gov/newyorker → github/aljazeera. Red: drudgereport → pinterest → raycast |
| I fruit only | **none.** May be structurally unreachable — fruit needs a concentrated accent, which almost always clears the richness floor that grants flowers. Test session to determine which |
| J flower + fruit | 6 sites, all flowering: stripe, raycast, mit, joshwcomeau, kantei, zombo |
| K winter no fruit | gwern.net. **lusion.co is a FALSE winter** — the analyzer measured its black preloader (ink 0.012). Keep it out |
| L winter + fruit | **none — impossible by construction today.** The gate reads `botanicalState !== 'winter'`. L10 removes it, so this case should APPEAR. If it does not, something else is wrong |
| M ≥2 grammars | blue-medium group: irs.gov, newyorker, india.gov.in, yahoo.co.jp, zombo, en.wikipedia |

**Falsifiable predictions for the post-change re-survey**, both mine:

1. Fruit prevalence roughly **doubles from 6/56 (10.7%) to ~12/56**, because L9 deletes a
   coin-flip that was denying a measured trait to half of all eligible sites.
2. Winter-with-fruit goes from **0 to non-zero**, per L10.

If either fails it is a more useful result than if it succeeds.

---

# Two integration notes, verified — for whoever holds analysis

## L9 is a clean deletion. Verified, not assumed.

I ordered the fruit coin-flip deleted. Before anyone worries about knock-on effects on other
sites' DNA: **`rng` is drawn exactly once in the whole of `analysis/lib/mapping.js`.**

- created once — `const rng = rngOf(seed)`, line 176
- drawn once — `const roll = rng()`, line 282, the fruit roll
- nothing else in the file advances the stream

So deleting the roll shifts **no** downstream draw, because there is no downstream draw.
Every other site's DNA is bit-identical afterwards. This is a genuinely isolated change and
should not be treated as a risky one.

(The renderer is a separate matter and already does the right thing: `gate1.js` derives a
distinct stream per concern — flowers `rng(seed*7+101)`, fruit `rng(seed*11+303)`. Grammar
selection under L1 must follow that pattern with its own offset, or adding a grammar re-rolls
every existing tree.)

## L8 will be validated against effectively ONE real winter site. Known risk.

Of 56 surveyed sites only **two** reach `winter`, and one of them — lusion.co — is a **false
winter**: the analyzer captured its black preloader rather than the page (ink 0.012). That is
the open "loading screens measured as pages" bug, and it also affects play.grafana.org.

So the entire winter botanical colour language — persistent fruit/berries, accent buds, the
requirement that a winter tree read sculptural and intentional rather than punished — will be
judged against **gwern.net and nothing else** unless more winter sites are found.

This is not a reason to delay L8. It *is* a reason to treat "it looks good on gwern" as weak
evidence, and a reason for the test session's site hunt to prioritise real winter sites
alongside case B. Fixing the preloader bug would also likely *remove* lusion.co from winter
entirely, taking the real sample to one.
