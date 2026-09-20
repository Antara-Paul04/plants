# BOTANICAL-DNA.md

> **Status: EXPERIMENT.** This is the contract between website analysis and the 3D
> renderer. The contract *shape* is fixed by Lead for this round so both domains build
> against the same thing. The *mappings and thresholds* inside it are experiments and
> are not DECIDED. See [AGENTS.md](../AGENTS.md) R11.

---

## Why this file exists

```
WEBSITE  →  ANALYSIS FINGERPRINT  →  BOTANICAL DNA  →  3D RENDERER
```

The middle arrow is a **shared product contract**, coordinated by Lead. It exists so
that:

- **Analysis never learns about three.js.** It emits DNA, not geometry.
- **3D never inspects a website.** It consumes DNA, not CSS.

This boundary is the point. If either side reaches across it, the experiment stops
telling us anything, because we will no longer know whether a tree looks the way it
does because of the website or because of an implementation detail.

---

## The contract

Frozen for this round. Do not add fields. If a field turns out to be needed, that is a
finding to report to Lead, not a change to make.

```jsonc
{
  "morphology": "broad",                  // BROAD only this round. The field exists so
                                          // conifer / palm / other can arrive later
                                          // without reshaping the contract.

  "skeleton": {
    "complexity": "simple" | "normal" | "rich"
  },

  "foliage": {
    "state":   "bare" | "sparse" | "normal" | "lush",
    "density": "airy" | "normal" | "dense"
  },

  "botanicalState": "normal" | "flowering" | "autumn" | "winter",

  "flowers": {
    "amount":    "none" | "few" | "medium" | "abundant",
    "primary":   "#rrggbb" | null,
    "secondary": "#rrggbb" | null
  },

  "fruit": {
    "enabled": true | false,
    "color":   "#rrggbb" | null
  },

  "terrain": "sparse" | "normal" | "lush" | "autumn" | "winter",

  "background": "#rrggbb",

  "seed": 0,                              // stable hash of the normalized domain

  "rareCat": false                        // reserved. NOT built this round. Cat is cat.
}
```

**Everything is a discrete state except `seed`, the three colours, and `fruit.enabled`.**
That is deliberate. Continuous 0–1 values leaking into the contract would let the
renderer interpolate its way to a hundred nearly-identical trees, which is the opposite
of what this round is testing. If 3D needs continuous values internally, it derives
them from the state — it does not ask for them here.

---

## The handoff file

Analysis writes `analysis/results/dna.json`. 3D reads it. That file is the interface.

```jsonc
{
  "generated": "<iso timestamp>",
  "sites": [
    {
      "domain": "example.com",
      "synthetic": false,          // true ONLY for hand-authored renderer test cases
      "fingerprint": { /* the V1 values this DNA was derived from */ },
      "dna": { /* exactly the contract above */ },
      "why": {
        "foliage":        "stylingRichness 0.59 is in the LUSH band (>0.45)",
        "botanicalState": "warm hues hold 61% of chromatic coverage",
        "flowers":        "colorfulness 0.42 → medium; primary from palette.primary"
      }
    }
  ]
}
```

`why` is **required**. Every non-default field must be attributable to either a
fingerprint value or the seed. This is not decoration — it is the round's
explainability test, and a tree whose look cannot be explained by (A) the website
fingerprint or (B) explicitly seeded personality should not exist.

`synthetic: true` records are permitted **only** to test renderer capability for a
state no real corpus site legitimately reaches. They must never be presented as
measurements of a real website, and must be visibly labelled in the comparison view.

---

## Ownership

| Owner | Responsible for |
| --- | --- |
| **Analysis** | fingerprint → DNA. Every threshold, every band boundary, the seed function, which states legitimately trigger. Writes `dna.json`. |
| **3D / Visual** | DNA → tree. Parameterising the renderer, the comparison view, preserving visual quality. Never reads a fingerprint. |
| **Lead** | This contract, review, integration, and the explainability check. |

### Where thresholds come from

**Analysis derives every threshold from the corpus distribution, not from intuition.**
The 23-site corpus exists precisely so these bands are evidence-based. Where the corpus
cannot support a threshold, say so and mark it ASSUMPTION rather than inventing a
number that looks principled.

Two constraints from Lead on band design:

1. **Exaggerate for legibility.** Differences must survive a social-feed thumbnail. A
   mapping that is visible only while orbiting close-up has failed.
2. **But no threshold cliffs.** Two nearly identical websites must not produce wildly
   unrelated trees. Where a site sits near a boundary, that is worth reporting.

---

## Approved V1 inputs

**Primary:** `authored` · `stylingRichness` · `inkCoverage` · `colorfulness` ·
`palette.ground` · `palette.primary` · `palette.secondary`

**Weak / experimental:** `imageArea` · `textDensity` — both may legitimately end up
with no visible effect. If so, report that rather than manufacturing one.

**Deterministic:** normalized domain seed.

**Excluded this round:** `motion` (repeatability was 0.291/0.015/0.028/0.016 on the
same URL — unusable while the same URL must give the same tree). Do not resurrect
`roundness`, `regularity`, `embedArea`, or declared animation counts. Do not invent
`verticality` to justify a tree shape.

---

## The two states that matter most

The whole concept rests on these being *visibly* different, not merely numerically so.

**BARE / SKELETON** — essentially unstyled HTML. Trunk and branches, effectively no
foliage, no flowers, no fruit, exposed structure, restrained terrain.

This must be **beautiful**. Not broken, dead, diseased or punished. The metaphor is
"HTML is a website's skeleton, so this website's tree shows its skeleton." A sparse
tree does not mean a bad website.

**WINTER / RESTRAINED** — clearly authored, highly restrained, very low colourfulness,
visually sparse. Sparse but *intentional* foliage, elegant exposed branches, muted
tones, no flowers.

The difference in one line: **bare is the absence of styling; winter is the presence of
restraint.** Analysis measured that distinction successfully — the corpus ladder runs
control 0.02 / cern 0.02 / motherfucking 0.07 / bettermotherfucking 0.16 / stripe 0.59
— and the renderer must not collapse it.

Note the risk Analysis flagged: on a 0–1 magnitude, designed-minimal (0.16) sits much
nearer raw HTML (0.02) than either does to a rich site (0.59). A linear
styling-to-foliage mapping would erase the distinction *through the mapping* even
though the measurement holds. This is why `authored` is carried as its own near-binary
axis.

---

## Do not force a state

If no corpus site legitimately qualifies for AUTUMN or WINTER, **report that** and
optionally add one clearly-labelled synthetic record. Do not lower a threshold to
produce a nice demo. The same applies to fruit: it is a seeded trait at roughly
8–12% (EXPERIMENT), eligible only when the tree is not bare, not winter, and has
sufficient foliage. ~~Fruit represents nothing analytical. That is intentional.~~

> **SUPERSEDED 2026-09-20 — EXPERIMENT.** The struck sentence above is left visible
> rather than deleted, because it was true when written: no signal existed that fruit
> could honestly represent. One does now.
>
> **Fruit represents accent colour that is CONCENTRATED — few, large areas. Flowers
> represent accent colour that is DISTRIBUTED — many, small ones.** Measured by
> connected-component analysis over accent pixels (`analysis/probe/accent-regions.js`):
> concentration is the share of accent area held by the largest connected region, gated
> on that region covering at least 1% of the frame.
>
> This was tested before being adopted. The decisive pair is `gov.uk` (one hero band —
> largest region holds **87%** of accent area) against `craigslist.org` (thousands of tiny
> link texts — largest region holds **0.7%**). Coverage-by-hue scored *both* at ~0.97
> "concentrated" and could not tell them apart; it measures how much of a colour exists,
> never how it is laid out.
>
> **Eligibility is now measured; the seeded roll remains as the personality layer.** So
> fruit is no longer a lottery — when someone asks why their site grew fruit, the answer
> is a property of their page, not "your domain won".
>
> **Excluded: canvas-dominant pages.** `bruno-simon.com` scores concentration 1.00 only
> because its entire page is one canvas. That is degenerate, not concentrated.
>
> **Known cliff, flagged not smoothed:** `stripe.com` sits at largest-region fraction
> **0.0103** against a 0.01 gate. Recorded the same way as gov.uk's 0.006 styling cliff.
>
> Adopted on the human's instruction — *"Fruit still needs MEANING. Do not use fruit as a
> consolation prize"* — and on their request to test exactly this hypothesis. It is
> **EXPERIMENT**, not DECIDED.

---

## Findings

To be filled in by the specialists as the round proceeds — which mappings worked, which
failed, which thresholds moved, and what remains an open human decision.

### Analysis — fingerprint → DNA (2026-09-20)

**EXPERIMENT.** `analysis/results/dna.json`: 10 real sites + 1 synthetic, validating
clean against this contract and deterministic across runs. Full detail in
`analysis/FINDINGS.md` §16.

**Bands are corpus-derived.** Boundaries sit at natural gaps in the sorted 23-site
`stylingRichness` distribution (`.07|.16`, `.24|.33`, `.49|.57`), not round numbers.
NORMAL holds 12 of 23 sites, matching "the canonical tree is roughly NORMAL".

**The BARE/WINTER distinction holds through the mapping.** BARE is a *two-condition*
gate — low `authored` AND low `stylingRichness` — so designed minimalism cannot fall in:
info.cern.ch (authored 0.00 / styling 0.02) → BARE, bettermotherfuckingwebsite.com
(0.20 / 0.16) → SPARSE. This neutralises the linear-mapping risk this file records: the
distinction is carried by a gate, not by a point on a magnitude.

**WINTER: exactly one site qualifies** — vercel.com (authored 0.70, styling 0.44, ink
0.05, colourfulness 0.00). linear.app is a near-miss failing only on inkCoverage
(0.28 vs a 0.20 ceiling); five more fail only on colourfulness. The winter gate is
currently carried almost entirely by its colourfulness condition. **OPEN.**

**AUTUMN: not decidable from the V1 inputs, and no real site reaches it.** Three hex
colours cannot express hue *coverage*. Measured from full hue histograms, every autumn
candidate collapses once photographic media is masked (unsplash warm share 0.897 → 0.177;
apple 0.391 → 0.000; sive.rs 0.474 → 0.000). Zero of 23 sites has a warm-dominant
*design* palette. One clearly-labelled `synthetic: true` record is included so 3D can
test the state. **A fourth fingerprint value would make autumn decidable but would buy an
untriggered state — that is a contract question for Lead, not a change made here.**

**Threshold cliff found and flagged:** gov.uk `stylingRichness` 0.494 sits **0.006** below
the NORMAL|LUSH boundary.

**Deviation surfaced (R2):** flower amount and colour are taken from the **media-masked**
palette rather than the whole-frame `colorfulness`. Unmasked, unsplash.com reads
colourfulness 0.44 with primary `#8e7148` — a colour from a photograph someone uploaded;
masked it reads 0.01. Masking also *recovered* art.yale.edu's true accent
(`#95aedb` → `#f72f2d`). Consequence: **unsplash.com gets no flowers.** Lead's call.

**`textDensity` is not weak.** Range 0.87 across the corpus and the **lowest** confounder
correlation of any V1 signal (worst |r| 0.42, against 0.78 for `stylingRichness` and 0.97
for `imageArea`). Its *effect* is nonetheless kept small by deliberate choice, per the
human's instruction that text-heavy sites must not become gigantic trees.

**Background — corrected.** This section originally read "background is a weak
differentiator — 19 of 23 corpus grounds are pure white". **That figure was wrong and is
retracted.** Measured properly: **5 of 23 grounds are genuinely dark** (nasa `#000000`,
apple `#010101`, spacejam-1996 `#030303`, linear `#08090a` at 72% coverage, bruno-simon
`#2b113d`); 18 of 23 are near-white (L >= 0.9).

The retraction is left visible rather than silently rewritten because the wrong number was
**load-bearing**: it was the evidence for calling the background rule weak and for
defending its output as "deliberately subtle". Both conclusions rested on a corpus that
was more monotone than the corpus actually is.

What the rule does: preserves the site's light/dark decision, and borrows the design
accent's hue at low saturation when the ground is achromatic. **ASSUMPTION** — that
hue-borrowing is preferable to leaving achromatic sites neutral.

**The renderer has since strengthened this.** With one dark-ground site in the set,
`visual-3d` reports linear.app as the single most instantly distinguishable tree in the
12-record grid at thumbnail size — a dark background differentiating harder than any
structural lever available to the renderer. So the rule was not weak; it was **starved by
a corpus assumption that turned out to be false**. If dark grounds are roughly a fifth of
the web rather than a curiosity, background is a stronger channel than this section first
claimed, and the lighting-rig question `visual-3d` raises below stops being an edge case.

**Every ground figure above was measured in light mode** — see the colour-scheme
assumption in [WEBSITE-ANALYSIS.md](WEBSITE-ANALYSIS.md#measurement-conditions-colour-scheme-is-pinned-to-light).

### 3D / renderer — DNA → tree (2026-09-20)

**EXPERIMENT. Nothing here is DECIDED.** The renderer expresses the contract, and
`prototype/compare.html` renders every record in `dna.json` side by side at one fixed
camera angle. All 12 records parsed with no fallbacks.

**Fields that produce a difference which survives a thumbnail:**

| Field | What it does visibly |
| --- | --- |
| `foliage.state` | The strongest lever by a wide margin. bare / sparse / normal / lush are four obviously different trees. |
| `botanicalState` autumn, winter | The strongest *colour* lever. Autumn is unmistakable at any size. |
| `background` — **only when dark** | linear.app (`#191c1f`) is the most instantly distinguishable tree in the set. |
| `flowers.primary` | Visible, but **conditionally** — see finding 1. |

**Fields that produce little or nothing:**

| Field | Why |
| --- | --- |
| ~~`skeleton.complexity`~~ **addressed** | *Was* invisible on any foliated tree — the canopy covers the branches, so branch count is the one thing nobody can see. It now drives crown **shape** as well: `simple` is spare and upright, `rich` broad and spreading. Posture survives a thumbnail where branch count does not. |
| ~~`foliage.density`~~ **addressed** | `normal` vs `dense` was half a lever. The bands were exaggerated and now also move lobe size and crown spread. Ordering and meaning unchanged; amplitude raised. |
| `fruit` | At ~8–12% a tree gets about 12 fruit, near-invisible at any size. Either it wants to be far more abundant and larger, or it is decoration nobody will notice. |
| `background`, the other 11 sites | All landed in `#e5e5eb`–`#ebe9e5`. Indistinguishable from each other. |

**BARE vs WINTER reads as clearly distinct.** Bare is a leafless sculptural silhouette;
winter is a muted, sparse, sage-green tree with visible structure. They do not read as
degrees of the same thing.

#### Needing a decision — surfaced, not resolved (R2, R7)

1. **Flower legibility depends on hue contrast against foliage, not on `amount`.**
   gov.uk is `abundant` (663 blossoms) in brand blue `#2d7abc` and its flowers
   **vanish entirely at thumbnail size** — blue sits too close to canopy green in
   value. art.yale.edu is only `medium` (333 blossoms) in red `#f62e2b` and reads
   instantly at the same size. A cool-branded site therefore gets a weaker colour
   signal than a warm-branded one at identical `amount`. This bears directly on
   **D5**: flowers-as-carrier holds for warm palettes and partly fails for cool ones.

2. **~~AUTUMN and WINTER sites express no website colour at all.~~ Partly closed.**
   Both used to impose a fixed palette and carry no flowers, so the site's accent
   never appeared. Lead ruled that autumn abundance *decreases* rather than vanishes,
   so **autumn now carries the site's accent in its flowers** (synthetic-autumn renders
   38 clusters where it rendered 0). **Winter is still colourless** — analysis sends it
   `flowers: none`, so nothing site-derived reaches a winter tree at all. vercel.com
   carries nothing but a background indistinguishable from everyone else's. Still a
   hole in D5, now a smaller one.

3. **RESOLVED — the renderer no longer suppresses flowers by botanical state.** It
   used to zero them for autumn and winter even when the contract asked for `few`, on
   the grounds that a flowering autumn tree is botanically odd. Lead ruled against it:
   autumn abundance decreases rather than vanishes, and winter needs no override
   because analysis already sends it `none`. The contract now decides how many flowers
   there are and the renderer only decides how they look. Autumn is scaled to 0.4.

4. **A dark `background` is not matched by the lighting rig.** linear.app renders a
   brightly day-lit tree against a night sky. It is the most distinctive tree in the
   set and arguably the best-looking, but the light does not belong to the scene.
   Whether the rig follows the background is art direction, and a human's.

   Scope note: exactly **one of the 12 DNA records** has a dark ground, which is all
   this domain can verify for itself. Analysis has since reported that its earlier
   "19 of 23 grounds are pure white" was wrong and that 5 of 23 are genuinely dark —
   that figure is theirs, not measured here, and an earlier draft of this section
   cited the retracted number as corroboration. If it holds, dark grounds are roughly
   a fifth of the corpus rather than a curiosity, and the lighting question above stops
   being an edge case.

5. **RESOLVED — `skeleton.complexity` now affects crown shape, not just branch count.**
   It was nearly inert: branch count is invisible under foliage. It now also drives
   limb length and elevation, so `simple` reads as a spare upright tree and `rich` as a
   broad spreading one. The field's *meaning* is unchanged — still "silhouette
   variation, not literal content quantity" — but it is now actually visible, which is
   what the contract always said it was for. **EXPERIMENT**; deliberately exaggerated
   under Lead's authorisation, and Taste has not seen it.

### 3D / renderer — DNA → the NEW tree (2026-09-20, wired to the product)

`prototype/src/dna-params.js`. The new tree (`grow.js`) runs on a flat parameter bag;
`dnaToParams(dna)` is now one source of that bag and the hosting page's query string is the
other, layered OVER it, so every debug parameter still works on a real site's tree. **It
invents nothing** — each line maps one contract field onto a parameter that already existed.
The shipped resolver (`dna.js`, `resolveDNA`) is REUSED for what the two trees must agree on:
terrain and stone palettes, scene dormancy, the gates that decide whether a tree may flower
or fruit. **The contract is unchanged.**

| DNA | drives |
|---|---|
| `seed` | the tree, and — on its own hash stream — the bloom grammar |
| `morphology` | `chooseGrammar(morphology, seed)` |
| `skeleton.complexity` | structure preset: `simple`→`sparse` (few limbs held WIDE), `normal`→`mid`, `rich`→`bare` (the full judged structure). A `bare` tree always gets the rich one — its skeleton is the whole show |
| `foliage.state` | `bare` → leafless and unornamented; else cluster spacing, leaves per cluster, how far down the limb is in leaf. Exaggerated: subtler steps were one tree at 140px |
| `foliage.density` | within-state variation of spacing (airy ×1.2, dense ×0.85) |
| `botanicalState` | FOUR values. `flowering` = fresher greens; `autumn` = V0's ported palette, leaf amount 0.88, **no flowers — fruit is its carrier**; `winter` = thin sage crown + buds (berries if fruiting), dormant ground |
| `flowers.amount` | the bloom ladder AND its foliage relationship |
| `flowers.primary` / `.secondary` | petal / centre, passed through UNTOUCHED — they arrive conditioned |
| `fruit` | the contract's flag, honoured directly; only `bare` refuses it. V0's extra gate (leaf amount ≥ 0.28, not winter) is deliberately NOT reused — see below |
| `terrain` | V0's palette and grass, via `resolveDNA`, then graded by the environment state |
| `background` | **day or night, nothing else** (linear luminance < 0.06). Never a scene colour — that mapping is a standing ban. 11 of 56 surveyed sites are night; the split is cleanly bimodal |

**Findings for Lead — surfaced, not resolved:**

1. **A winter site delivers NO colour.** `flowers: none` ⇒ `primary: null`, and every winter
   site in the corpus (vercel, gwern, lusion) is one. L8's "accent-coloured buds" therefore
   have no accent to carry: the renderer falls back to a natural bud tone rather than invent
   one. If winter is to express the site, **analysis has to emit a colour for it** — that is a
   contract question, not a renderer one.
2. **V0's `flowering ×1.25` cluster boost is NOT ported.** The ladder is a perceptual contract
   now (L4) and Taste owns its fractions; a hidden multiplier would fight that. Autumn's ×0.4
   IS ported, deliberately, as Lead ruled.
3. **`mid` is a new, unjudged structure preset.** The debug pages only ever had two
   architectures; the contract has three complexities.
4. **Night + a dark accent is dim.** github (navy bloom, night) and lusion (winter, night) are
   the weakest trees in the acceptance set. It follows whichever night level is picked.

**Autumn carries no flowers; fruit is its carrier (the human, 2026-09-20).** *"i hate the green
flowers on it, autumn trees do not have flowers on them."* This WITHDRAWS Lead's earlier ruling
(autumn bloom decreases ×0.4 rather than vanishing; finding 3 above) — withdrawn, not deleted,
because its reasoning explains the replacement: it existed so an autumn site could still
express its accent when flowers were the only carrier anyone had in mind. Autumn is the
fruiting season, so fruit is botanically right rather than a workaround, and it is the only
thing that works: an autumn crown owns the whole warm half of the hue wheel, so a warm accent
in bloom is a hue collapse that no count fixes (ikea, 6 → 15 clusters: 2% of a thumbnail
changed) and that the value-only local contrast cannot reach by design. Fruit reads by size,
form and placement — **even ikea's own yellow reads at 140px as fruit**
(`references/experiments/autumn-fruit-and-bare-earth-2026-09-20/SHEET-autumn-fruit.png`).

5. **THE HOLE — an autumn site WITHOUT the fruit trait carries no accent at all**, and ikea,
   the only real site that reaches autumn, is one. Not papered over: which carrier an
   unfruiting autumn tree gets (winter's buds?) is a contract question, not the renderer's.
6. **The shipped renderer's fruit gate is not reused by the new tree.** It demands leaf amount
   ≥ 0.28 on top of the contract's flag, which by arithmetic denies fruit to `sparse/airy` in
   any season (0.24), `sparse/airy/autumn` (0.211) and `sparse/normal/autumn` (0.264). With
   fruit now autumn's only carrier, a sparse autumn site that EARNED the trait would have got
   neither flowers nor fruit. The new tree honours `fruit.enabled` directly; only `bare`
   refuses it. (V0, behind `?engine=v0`, is unchanged and still blooms in autumn.)
