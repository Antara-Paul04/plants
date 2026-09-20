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

---

# TASTE RULINGS — 2026-09-20. Judged against real geometry, not descriptions.

Recorded here because they are decisions, not opinions, and three of them move authority
off me and onto the person who should hold it.

## T1 — `pendant` x `broad`: COMPATIBLE. All three grammars stay.

**GRAMMAR_COMPAT.broad is now a Taste ruling, not Lead authority.** The comment in
`flowers.js` must be updated to say so — it currently says the opposite.

The reasoning is specific rather than permissive, and belongs in the file: **a broad crown
has a wide horizontal underside, which is exactly what hanging clusters need somewhere to
hang from.** A columnar or conical morphology would be the incompatible one. Broad is
arguably pendant's *best* host, not its marginal one. The racemes attach under the limbs and
at the rim, taper correctly, and read as one plant with the foliage. It is also the most
distinctive of the three at a glance, which matters for the middle collapse.

**Guard:** it reads strongly of wisteria. Fine as FORM — laburnum and Indian bean tree do the
same thing — but the L3 naming discipline matters more here than anywhere else. Nobody should
ever tune this toward *being* a wisteria.

## T2 — The ladder: `few` PASSES, `abundant` PASSES, `medium` FAILS.

At 140 px `medium` reads as a green tree with a pink rim. That is not "unmistakably a
flowering tree" and it sits far too close to `few`.

**I confirm this independently, and I had wrongly signed it off.** I verified the wreath was
gone at *abundant* and let that stand for the whole ladder. It does not. A fresh cache-busted
render of `medium` shows a solid green centre third.

**The mechanism, which Taste could not see from outside the code:**

```
medium: { atBloom: 0.42, nearTo: 0.55, nearRadius: 1.1, elsewhere: 0.88 }
```

`atBloom` and `nearTo` only bite where there *is* bloom. At a 0.27 fraction most of the
crown's centre is neither — it is `elsewhere`, and **`elsewhere: 0.88` is a 12% reduction,
which is nothing.** Cross that with visual-3d's measurement that only **7 of 146** attachment
points face the camera at the centre of the crown, and the middle of a medium tree is almost
entirely full-size non-flowering foliage. The wreath at medium is arithmetic, not bad luck.

**Ordered fix, Taste's, endorsed — re-judge between each step:**
1. Make the reduction bite in the crown's middle third. `elsewhere` is the lever, not the
   fraction. "Clearly reduced" must mean visibly see-through to bloom in the centre.
2. *Then* set medium's fraction to **0.40**, not 0.33 — 0.27→0.33 is a 22% move across a gap
   currently reading as near-zero.
3. Re-judge at 140 px before touching anything else. **If step 1 lands, 0.40 may prove too
   HIGH — and that is the good outcome**, because the ladder should be spaced by foliage
   relationship rather than by count.

`few` 0.10 and `abundant` 0.62 are not in question.

## T3 — Accents: PASS. Blue is not weaker than red.

Judged at 140 px across the conditioned set. Conditioned blues hold their own; red is
marginally punchier because red-green is a stronger opposition, but the gap is small. For 18
of 56 sites, a pass.

**The dependency belongs in the file: blue passes BECAUSE OF THE CONDITIONER.** Raw `#1b20a0`
navy fails badly — a dark flower reads as a hole punched in the canopy and no amount of chroma
rescues it. Blossom must be lighter in value than the foliage it sits in. So `conditionFlower`
is not a nicety, **it is what makes a third of the corpus work**, and anything that bypasses
it (`?fc=`, `?fc2=`) is not merely "unrepresentative" — it is the failing case.

Taste explicitly prefers L6 to its own earlier proposal, because L6 preserves the brand colour
instead of tinting it.

## T4a — Winter: PASS, with one fix.

Reads sculptural, intentional and specific; not empty, not failed. **Berries on bare tan wood
is the strongest winter image in the set** and outperform buds — denser, more obviously
ornament. The ornament also flatters the bare limbs, giving the crown something to read that
the naked structure does not yet have on its own.

**THE FIX — `K4-buds-cream` fails at 140 px.** Pale buds vanish against both sky and tan wood;
it is very nearly a bare tree, which is exactly the "as though analysis failed" outcome the
requirement forbids — **and it fires on precisely the achromatic sites that already have the
weakest identity** (see L14). `K3-buds-navy` has the mirror problem: dark buds read as blight
rather than growth. Pale ornament needs more of it, a shift to the berry form, or both.

## T4b — Flower size: NO CHANGE. The unattributed note is withdrawn.

"Way too big" was Taste's own remark, from the blue github sheet, and **Taste has revised it
having looked again.** Individual blooms are comparable to individual leaves, which is right;
clusters are 2–3x a leaf, which is also right — a lilac or hydrangea truss is bigger than its
leaf. What it was reacting to was dark saturated blue making each bloom read as a heavy blob:
**a value problem, which L6 is the correct fix for.** `statement` is explicitly "fewer,
larger", so if anything reads oversized it will be that grammar, and it is supposed to.

Worth recording as process: this note reached visual-3d second-hand and unattributed, neither
of us could corroborate it, and **nobody acted on it**. That was the right call — it turned
out to be a correct observation with a wrong diagnosis, and acting on it would have shrunk the
flowers instead of fixing the value.

## Still open after this round

- **Gate 1 remains REVISE on crown ramification.** Criterion with numbers is in
  `references/tree-style/README.md`. This is the same ceiling as L6: the tree runs out of twig.
- **Winter's berry path should be reachable** — Taste's view, and I agree: winter's whole
  colour language is the berries, and buds alone are the weakest variants. A state that can
  only ever express itself through its two weakest ornament forms is built on its worst case.
  Whether `MIN_FRAC` or the winter colourfulness ceiling moves is **analysis's call**.
- **The achromatic collapse (L14) is analysis's**, and Taste frames it usefully: *boring is a
  property of the MAPPING, not the tree.* It means the site's richness found no channel to
  arrive through. openai.com being light and species-in-pieces.com being dark and receiving
  the same petal is the same bug as Linear was.

---

# L15 — ACCENTS ARE RANKED BY PIXEL COUNT. One root cause, two visible failures.

**For ANALYSIS. Found 2026-09-20 from two human reports on real product output.**

`analysis/probe/pixels.js:85`:

```js
const accents = [...hueBins.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 3)
...
primary: accents[0] ? accents[0].hex : null,
```

**Hue bins are ranked purely by pixel count — coverage and nothing else.** The largest area
of a hue becomes the site's "primary accent". That is backwards for what an accent IS: a
brand colour is typically **small and saturated**, and this ranks for **large and any
saturation**. It selects the biggest wash on the page, which is usually a background tint.

## Failure 1 — stripe.com grows a cream tree with no blue in it

Reported by the human: *"stripe.com has blue accents but the tree has none."* Correct.

```
palette   primary  #fcdfb0   (pale cream — a large hero wash)
          secondary #735ffd  (Stripe's actual brand purple-blue)
designChromaticRatio 0.0301   imageArea 0.427   paletteSource media-masked
```

The petal takes `primary`, so the whole tree — blossom AND fruit, since fruit colour is the
petal colour — comes out cream. The real brand colour lands in `secondary`, which only paints
the flower **centre**, invisible at any normal size. A site whose identity is one of the most
recognisable colours on the web renders as an ivory tree.

Note `designChromaticRatio` is **0.0301**: the winning "accent" is 3% chromatic, i.e. very
nearly neutral. A near-neutral won on area against a saturated brand colour.

## Failure 2 — ikea.com scores `warmShareOfChroma: 1.0` and grows an autumn tree

Reported by the human: *"ikea's website isn't warm enough to get an autumn tree."* Also correct.

`warmShare` is computed over **the same coverage-weighted hue bins**. ikea is a white page
with a single yellow accent (`#feda01`), so 100% of its chromatic coverage is warm — and the
autumn gate (`warmShare >= 0.55`) is cleared by a mile. But a site with ONE accent colour
scores trivially 0 or 1 on a share metric regardless of what it looks like. The metric answers
*"is the chroma warm"* when the gate needs *"is the palette warm"*, and those are the same
question only on a site with several colours. `designChromaticRatio` is 0.36, so 64% of the
design is neutral.

## Why these are one bug

Both are **raw pixel count standing in for salience**. Fixing the ranking fixes the accent;
adding a coverage condition to the warm gate fixes the season. Suggested directions, for
analysis to weigh rather than adopt:

- Rank accent candidates by something like **chroma × coverage**, or gate candidates on a
  minimum saturation before ranking, so a 3%-chromatic wash cannot outrank a saturated brand
  colour. The existing `accentFloor` already accepts that near-neutrals are not accents — this
  is the same principle applied to *ranking* rather than to *admission*.
- The warm gate needs a **coverage** condition alongside the share one, so "warm" means the
  palette is warm rather than that the site's one accent happens to be.

**Do not add a new DNA field for either** (§14). Both are fixes to how existing measurements
are computed, not new information about the website.

## Consequences worth stating before anyone tunes

- Fixing the ranking will change `flowers.primary` on an unknown number of sites, and fruit
  colour with it (`fruit.color = flowers.petal`). The 56-site before/after is the way to see
  it — the test session has the "before" captured and can re-run.
- Fixing the warm gate may leave **autumn with no corpus site at all**. It is currently 1 of
  64 and that one is this false positive. That does not make autumn wrong to have built, but
  it should be known.
- This is also a candidate cause for part of **L14** (ten trees sharing one cream fallback):
  if ranking picks near-neutral washes, more sites end up with a "primary" that the accent
  floor then rejects.

---

# L16 — THE 8-SECOND TIMEOUT MEASURES OUR MACHINE, NOT THE WEBSITE

**Found by the test session, 2026-09-20. The most important diagnosis of the day, and it
invalidates several of my own findings.**

## The evidence

The four chips, requested simultaneously against the same server:

| concurrent | result |
| --- | --- |
| 1 | 1/1 pass, 3.8 s |
| 2 | 2/2 pass, ≤3.7 s |
| 4 | 4/4 pass, but analysis **doubles** — arxiv 7.1 s, gwern 7.2 s, at the 8 s cliff |
| 8 | **5/8 pass.** HN fails; gwern fails twice. All `page.goto: Timeout 8000ms exceeded` |

At load average 29, news.ycombinator.com, google, youtube, netflix and instagram all timed
out twice each — every one of which I had measured passing an hour earlier. Minutes later on
a quiet machine: news.ycombinator.com 3.9 s, google.com 4.2 s. Same sites, same server.

**`NAV_MS = 8000` is therefore a reading of our CPU and bandwidth at that instant.** Tonight
"busy" was several Claude sessions and a test harness. In production, "busy" is eight
visitors. **A product whose failure rate scales with its own popularity is a worse problem
than one that cannot read heavy sites.**

## It is NOT heavy-DOM versus light-DOM

That was Taste's sharpened hypothesis and mine before it, and the test session killed it:
**news.ycombinator.com — 817 nodes, ONE script, 6 KB — failed.** Nothing about that page is
heavy.

The real gate: **`domcontentloaded` does not fire until every deferred and module script has
been downloaded AND EXECUTED.** Measured on github.com across three plain visits: DOM-ready
at 5.3 s, 12.0 s and >30 s, each time waiting on bundles from `github.githubassets.com`.

So the limit gates on **(the site's JS payload) ÷ (our bandwidth and CPU at that moment)** —
which cuts across design quality exactly as Taste said, but points at a completely different
fix from "prefer lighter sites".

## We are waiting for an event we do not need

The analyzer measures **pixels from a screenshot**. The site's JavaScript finishing is not a
precondition for that. This also explains why my `NAV_MS` 8→20 experiment failed: **it waited
longer for the same wrong event**, so it bought seconds rather than reliability.

The direction the evidence points: navigate with `waitUntil: 'commit'` (the response has
started) and spend the budget in the settle/screenshot stage that already exists.

**NOT DONE, deliberately, and this is the caveat that matters.** It interacts with a live
bug: we already measure loading screens as pages — lusion.co's tree came from its black
preloader (ink 0.012, a false WINTER) and play.grafana.org from a spinner. Moving to
`'commit'` makes measuring an unpainted page **more** likely. The change is only safe
alongside real **visual-stability detection** in the settle stage. That is a piece of
analysis work, not a constant swap.

## Findings this invalidates — mine, and they were presented with confidence

1. **"nike.com, hm.com and samsung.com time out; adidas, zara and uniqlo pass."** Measured
   concurrently with the sweep on a loaded machine. Almost certainly our load. **Discarded.**
2. **"github.com is intermittent"** — true, but the cause was us, not github.
3. **"6 of 8 popular sites pass"** — a reading of one moment's machine load, not a rate.
4. **The whole heavy-DOM framing**, which I relayed to two sessions as if settled.

**The standing lesson: any site-reliability number measured on this machine while anything
else is running is a measurement of the machine.** The sweep now records load average beside
every attempt so each failure can be read as "site" or "us". Nothing measured without it
should be quoted.

## L16b — What this means for TASTE, who is currently unstaffed

Taste's sharpened hypothesis — that the bias is **heavy DOM versus light DOM** rather than
rich versus simple — is **dead**, killed by news.ycombinator.com: 817 nodes, one script,
6 KB, and it failed. Taste's instinct that it "cuts across design quality rather than along
it" was right; the reason is different, and the difference changes the fix.

**The chip ruling survives, but its foundation moved.** Chips must be fast, reliable, then
different, and all four must be sites we know succeed — still correct. But "reliable" is now
partly a property of **our own load** rather than of the site. Two consequences:

1. **No chip can be certified by passing once.** It has to pass on a busy machine.
2. **A popular launch would make the chips fail at exactly the moment most people are
   looking.** The failure rate rises with concurrent users.

`gwern.net` is the marginal chip — it waits on its own script plus a tag manager and failed
first under concurrency. Not changed on one night's data; flagged for the clean sweep.

### The epistemic point, which is the serious one

Taste observed that this was the fourth time a "the trees look the same" symptom turned out
to be a site's richness failing to arrive — Linear was wiring, bruno-simon was measurement,
the achromatic palette is a constant. **This is the fifth, and it is the first where the
failure is invisible in the output.**

A site that times out produces **no tree at all**, so it never appears in any sheet anyone
judges. **The corpus Taste has been forming its eye on is silently filtered by our own CPU** —
and filtered hardest against script-heavy sites, which correlates with, without being the
same as, ambitious design.

Every aesthetic judgement made on that corpus — the bloom ladder, the environment set, the
restrained-versus-boring band — was formed on a sample we now know to be biased by an
accident of measurement. Nothing is necessarily wrong. But the standing check Taste asked
for is now overdue, and it should run against a corpus captured on a quiet machine.

---

# L17 — NIGHT HAS GONE NEAR-BLACK. Open, unowned, and a regression.

Visible in `references/experiments/reliability-sweep-2026-09-20/_same-dna-old-vs-new-renderer.png`
— the same ten sites, **identical DNA**, afternoon renderer beside tonight's.

`daringfireball.net` is the case. In the old renderer it was a daylit tree on a blue-grey
ground. In the new one the sky is near-black and the tree is **dark on dark**: at thumbnail
size the crown barely separates from the background, and the pale trunk is the only thing
reading at all.

This matters more than one site, for two reasons:

1. **11 of 56 corpus sites go to night.** It is the single most distinguishing environment
   state we have — Taste called the night tree "the best-looking thing in the product" and
   said that if you needed one image to show someone what this project is, it was that one.
   That was hours before this render.
2. **It is a regression, not a known limitation.** The night work passed its own review. What
   changed since is the ground-darker-than-trunk rule, which deliberately takes turf value
   DOWN — and visual-3d flagged at the time that "night turf is not fixed by this rule (turf
   brighter than the trunk's SHADOW side); it follows the night level pick." That note was
   about night turf being too *light*. The composite result appears to be too dark.

**Unowned.** No `visual-3d` session is reachable, and `taste` — who would rule on whether it
is too dark or correctly moody — is also gone. Recorded so the next session holding either
role finds it rather than rediscovering it from a screenshot.

**Do not fix this by raising exposure.** The project's night was built day-for-night on
purpose: night comes from colour, direction and contrast, never from a dim image. That ban
stands; the question is which of the three has drifted.

## Also unowned: Gate 1 crown ramification

Still REVISE, still shipping, and now the bottleneck for four separate problems — bloom
cannot reach the crown's middle (even approved `abundant` manages 8.6% there against 36% at
the rim), foliage density saturates at 227 clusters because the tree runs out of twig, only 7
of 146 attachment points face the camera at the crown's centre, and Taste's antler verdict.

The criterion is precise and written down in `references/tree-style/README.md`: **4–5 orders
and roughly 100–150 limbs** (the tree has 47), with **terminal shoots at 6:1 minimum**
long-to-thick. Taste's own note records why those two numbers exist — its first revision
constrained orders and thickness but set no floor on count and said nothing about aspect
ratio, "so a 47-limb tree of short thick prongs was fully compliant and read as antlers".

**The tension to name before starting:** more limbs feed the implicit-surface wood, which is
already the dominant cost. Growth is 15–21 s end-to-end and most of it is the build, not the
analysis. Measure early and report the number even if the tree is unfinished.
