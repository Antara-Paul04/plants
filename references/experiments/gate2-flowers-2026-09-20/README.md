# Gate 2 — flowers and fruit, first pass — 2026-09-20

**Status: EXPERIMENT.** Nothing here is wired to the DNA; `mountTree` is untouched. Open
`prototype/gate2.html` with the parameters below.

New: `prototype/src/flowers.js`. Flowers and fruit are their own CLUSTER types, sitting on the
same attachment points as the leaves (`leafAttachments`, now shared). Matte, no baked light,
graded per environment state through a `bloom` entry in `ENVS`.

## What was built

Three flower FORMS — a form is a property of the tree, one tree carries one:

| `grammar=` | what it is | tris / cluster |
|---|---|---|
| `cluster` | open five-petalled flowers packed over a dome (cherry, apple) | ~1.9k |
| `statement` | two or three large upright goblets, two whorls | ~2.5k |
| `pendant` | a bunch of three hanging racemes, tapering to buds | ~2.3k |

Fruit: a lathed pome with a blush cheek and a stalk, oversized on purpose (radius 0.16),
hung in ones, twos and threes on the lower outside of the crown, kept off flowering sites.

Parameters: `flowers=none|few|medium|abundant`, `grammar=`, `fc=` / `fc2=` (hex, the site's two
colours), `fruit=1`, `fruitc=`, `lift=`, `pale=`, `leafAtBloom=`, `bloom=` (explicit fraction),
`leafHide=1` (debug).

## Findings

1. **A cool accent now survives the thumbnail, without restating the hue.** V0's gov.uk blue
   `#2d7abc` vanished at any amount because it sits at canopy green's VALUE. Every petal here
   pales toward its edge, so bloom always carries a light value the green lacks. `07` (as
   given) reads at 140px; `08` (`lift=1`, lightness raised) reads no better and is less the
   site's colour. Recommendation: no lift. That is a colour-fidelity call (D5) — Lead's.
2. **Bloom must arrive in drifts, and the count must be exact.** Sites are ranked by a
   low-frequency field over the crown and the top fraction taken: a flowering limb here, a
   plain stretch there, never confetti (TASTE #7), and the fraction is exact whatever the
   field looks like.
3. **The crown is a SHELL, so in projection bloom piles up at the rim.** Every amount first
   read as a green tree in a pink wreath. Moving the bloom (up the twig → out along the
   radius → further out) did not fix it; the debug render with leaves hidden
   (`leafHide=1`) showed why — the bloom was evenly spread, and full-size leaf balls on the
   few front limbs covered the face. What helps is botanical: **a twig that flowers carries a
   smaller leaf cluster** (`leafAtBloom`, 0.55). It is better and NOT solved — see Open.
4. **First wisteria failed as a string of beads**: one thin raceme per site, maroon buds.
   Wisteria hangs in bunches of full columns; buds are a deeper tone of the same colour.
5. **Fruit first bunched under the trunk** (too much "low" bias plus the drift field). It now
   spreads round the lower crown.

## Open — for Taste and the human

- **The wreath.** `abundant` is still rim-heavy from the hero angle. Levers not yet pulled:
  `leafAtBloom` lower still at high amounts (toward a tree that flowers before it leafs —
  `leafHide=1` shows that tree, and it is handsome), or more front-facing structure, which is
  a Gate 1 question and not mine to reopen.
- **Which forms stay?** Magnolia and wisteria are the most distinct at 140px; blossom is the
  most generic and the most "flowering tree".
- **few vs medium** differ less at 140px than medium vs abundant.
- **Night bloom** reads as dusty mauve under night `b`. It follows the night level picked.
- Fruit scale is toy-scale on purpose. Too big, or right?
- Cost: abundant blossom +178k tris, abundant magnolia +230k. Fine here, heavy for product.

## Files

`SHEET-all.png` everything; `thumbnail-140px.png` the same at feed size; `01`–`14` full frames.
