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
sufficient foliage. Fruit represents nothing analytical. That is intentional.

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

**Background is a weak differentiator** — 19 of 23 corpus grounds are pure white. The
rule preserves light/dark character and borrows the design accent's hue when the ground
is achromatic. **ASSUMPTION.**

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
| `skeleton.complexity` | Essentially invisible on any foliated tree; the canopy covers the branches. It reads only on BARE, so it is doing almost no work for 11 of 12 sites. |
| `foliage.density` | `airy` reads clearly; `normal` vs `dense` barely separates. Half a lever. |
| `fruit` | At ~8–12% a tree gets about 12 fruit, near-invisible at any size. Either it wants to be far more abundant and larger, or it is decoration nobody will notice. |
| `background`, the other 11 sites | All landed in `#e5e5eb`–`#ebe9e5`. Indistinguishable. Independently matches analysis's "19 of 23 grounds are pure white". |

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

2. **AUTUMN and WINTER sites express no website colour at all.** Both impose a fixed
   palette and carry no flowers, so the site's accent never appears anywhere.
   vercel.com's tree carries nothing site-derived except a background
   indistinguishable from everyone else's. A real hole in D5 for those two states.

3. **The renderer suppresses flowers in autumn and winter even when the contract says
   `few`.** synthetic-autumn.example asks for `few` and renders zero. This was a
   renderer judgement — a flowering autumn tree is botanically odd — but it overrides
   a contract field. Either the contract should say `botanicalState` dominates
   `flowers.amount`, or the renderer should stop doing it. **Lead's call.**

4. **A dark `background` is not matched by the lighting rig.** linear.app renders a
   brightly day-lit tree against a night sky. It is the most distinctive tree in the
   set and arguably the best-looking, but the light does not belong to the scene.
   Whether the rig follows the background is art direction, and a human's.

5. **`skeleton.complexity` is nearly inert.** To carry real signal it would need to
   affect something that survives having leaves on it — crown width or limb angle
   rather than branch count. Reported rather than changed, because altering what the
   field *means* is a contract question.
