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

- _pending_
