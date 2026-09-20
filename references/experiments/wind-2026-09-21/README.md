# Wind on the new tree — 2026-09-21

**Status: EXPERIMENT.** Brief and rulings: `docs/briefs/WIND-AND-MOTION.md` (W1 ambient, W2 the
crown moves and the trunk does not, W3 foliage only — the wood is rigid). Code:
`applySway` in `prototype/src/util.js`, the wind block in `growTree` (`prototype/src/grow.js`).
Amplitude (0.045) and speed (0.85) are V0's numbers carried over. They are not a judgement.

Everything below was measured on `gate2.html?preset=bare&seed=7`, reading pixels back from the
canvas with the wind's clock driven by hand, so every comparison is of the same tree at the same
two instants (`t = 0` and `t = 3.33`).

## The finding: on rigid wood, a cluster that DRIFTS slides across its twig

`applySway` moves each instance as a block. That was invisible in V0 (thin dark twigs, small
amplitude). The new tree's wood is chunky, pale and — by ruling — does not move, so anything
growing on it that translates is translating *relative to the thing it is attached to*.

- **Leafy crown:** the offset is up to 0.041 units, a median of 23% of the twig's diameter and up
  to 61%. It does not read, because the seat is buried inside the leaf ball: there is no visible
  contact to slide against.
- **Winter is where it breaks.** Buds sit on bare twigs with nothing hiding the contact. At the top
  of the crown a bud travelled **0.043 units on a twig 0.068 across — 64% of its width.**
  `winter-buds-DRIFT-vs-PIVOT.png`, top row: every bud carries a thick crescent in the difference
  image while the twig under it is black. In motion that is buds sliding to and fro on a still twig.

This was reported rather than tuned away. Lowering the amplitude until it stops showing would hide
it in winter by removing the wind from every other tree.

## The fix: everything PIVOTS ABOUT ITS SEAT (`pin`)

Every leaf cluster, flower, fruit, bud spray and berry cluster is an instance whose origin IS its
seat on the twig. So the offset is scaled by the distance from that origin — nothing at the seat,
the full sway at `pin` (0.5, a leaf's length) away from it. For a small sway that is a rigid
rotation about the point of attachment. One term, every carrier, and nothing can slide, by
construction. A hanging raceme and a fruit on its spur now swing from the top, which is what they do.

Same tree, same two instants, the pin toggled LIVE (it is a shared uniform — no rebuild):

| | pixels changing within 7px of a bud's SEAT | pixels changing, whole frame |
| --- | --- | --- |
| winter, DRIFT | **25.1%** | 67,192 |
| winter, PIVOT | **4.4%** (neighbouring tips crossing the disc) | 26,626 |

| | share of the tree's pixels that change |
| --- | --- |
| leafy (medium bloom + fruit), DRIFT | 16.6% |
| leafy, PIVOT | 12.6% |

So the leafy crown keeps about three quarters of its visible motion — a leaf is as long as the pin
length, so its tip still gets the whole sway — while a winter tree calms to 40%, because a bud is
short and stiff. That ordering is the physically right one, and it was not tuned for.

`windPin=0` restores the drift, for an A/B. `wind=0` installs no hook at all.

## What was verified, and how

- **The zero-specular rule survived.** Read out of the COMPILED fragment shaders, not our source:
  `leaf-`, `flower-`, `fruit-` and `bud-matte-v1+sway-world-pin` all still contain
  `material.specularF90 = 0.0`. This is the thing that would have broken silently: `applySway` used
  to ASSIGN `onBeforeCompile`, and on the new tree the hook it would have overwritten is the matte.
  It now composes. (Reproduced on the old code first: the old function does strip it.)
- **The wood is rigid (W3).** Foliage hidden, two wind phases: **0 pixels differ.**
- **The trunk does not move (W2).** The mask is each tree's own — still at the first real fork
  (y 2.19 here), full sway at the top of the finished tree (7.04). V0's constants were 1.4 / 4.4.
- **One program per material KIND, never per tree.** Keys: `leaf-matte-v1+sway-world-pin` and so on.
  V0 and the grass are byte-identical to before (`sway-world`, `sway-local`), proven headlessly.
- **The wind can be changed on a finished tree.** Amplitude to zero: 0 pixels differ between phases.
- **The instrument is deterministic.** The same instant rendered twice: 0 pixels differ.

## Known, stated rather than fixed

- **The foliage's cast shadow is its rest pose.** three's shadow pass uses a depth material that
  never sees the sway. V0 shipped the same way. With rigid wood the trunk's shadow is simply correct.
- **Cost is NOT in this file yet.** The machine was at load average 35–39 while this was done, and
  a frame time measured then is a measurement of the machine.

## Files

- `winter-buds-DRIFT-vs-PIVOT.png` — the finding and the fix in one image (x2, nearest-neighbour).
- `leafy-crown-top-DRIFT-vs-PIVOT.png` — the worst camera-facing spot of a leafy crown. The limb is
  black in both rows; the crown still moves in the second.
- `hero-leafy-medium-fruit.png`, `hero-winter-buds.png` — whole frames, wind pinned at `t = 2`.
