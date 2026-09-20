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

## Cost — measured once the machine was quiet (load ~5, no sweep running)

`gate2.html?preset=bare&seed=7&flowers=medium&fruit=1`, 2048x1536 buffer, 819k triangles. Frames
rendered back to back with a forced GPU sync (a hidden pane never fires `requestAnimationFrame`, so
a frame counter measures nothing). `wind=0` installs no hook at all, so it is a true baseline;
runs were interleaved off / on / off / on.

| | programs | draw calls | triangles | best ms/frame |
| --- | --- | --- | --- | --- |
| `wind=0` | 14 | 15 | 819,320 | 4.29 |
| wind on (pivot) | 14 | 15 | 819,320 | 4.33 |

**+0.04 ms, inside a run-to-run spread of about 0.3 ms: not measurable.** No geometry, no draw
call and no extra program — a swaying material's program REPLACES its matte one, one for one. While
the machine was still loaded, "wind on" once measured FASTER than "wind off" (4.6 vs 7.0 ms), which
is what a number taken on a busy machine is worth.

Sway is per-VERTEX, so it costs the same in a 140px thumbnail as on a full-bleed page. The page's
size is a separate, per-FRAGMENT cost, measured on the same tree (pixel ratio capped at 2, as
`viewer.js` already does):

| frame | buffer | ms/frame |
| --- | --- | --- |
| today: the 62vh square stage on a 900px-tall retina screen | 1116x1116 · 1.25 MP | 3.33 |
| full-bleed 1440x900 @1.5x | 2160x1350 · 2.92 MP | 4.00 |
| full-bleed 1440x900 @2x | 2880x1800 · 5.18 MP | 5.03 |
| full-bleed 1920x1080 @2x | 3840x2160 · 8.29 MP | 6.09 |

About 2.9 ms fixed plus 0.39 ms per megapixel, on THIS machine (a fast one): full-bleed is 4.1x the
pixels for 1.5x the frame time. Nothing needs doing here. On a GPU that only just holds 60 fps on
today's stage the same ratio gives ~40 fps full-bleed, and a pixel BUDGET (cap total pixels, let the
ratio float between 1.5 and 2) is the answer if that is ever seen. Not built: no evidence it is needed.

*A trap, recorded:* `renderer.setSize(w, h)` multiplies by the pixel ratio. A first pass of this
table benched buffers four times the size it labelled them. Set the pixel ratio to 1 before sizing
a buffer by hand.

## The wind is WEATHER, and autumn sheds when it blows (same day)

The human, on autumn: *"I want leaves falling when wind blows."* That one phrase joins two things
that had been separate — gusts instead of constant sway, and falling leaves — and makes the second
CAUSED by the first. Code: `hash01` / `gustSlot` / `gustAt` and the `gust` multiplier in
`applySway` (`util.js`); `buildLeafFall` (`leaves.js`); `built.update(t)` (`grow.js`); the hosts
tick both. **Every number is visual-3d's default, exposed as a debug parameter, and none of it is
an art-direction decision** — the human is to judge the whole weather at once.

- **Gusts are ENUMERABLE.** Time is cut into 8 s slots; slot n holds one gust (12% hold none) whose
  moment and strength are a hash of n. So "which gusts have there been, and how hard" is a pure
  function of time. Calm 54% of the time; a gust about every 10 s, arriving faster than it leaves;
  the longest calm in an hour is 21 s. (The first constants were calm 68% of the time — a
  20-second visitor might have seen one weak gust.)
- **The hash is an exact INTEGER hash, not a sin-hash.** `Math.sin` is not bit-identical across
  engines; a sin-hash would make `t=` pin different weather on different machines.
- **The grass gusts too** — it is the same weather — but only where the host's uniform bag carries
  `gust`. V0's bag does not, and compiles the shader it always did, to the byte (32/32 headless).
- **Every falling leaf starts as a real one.** The crown is 146 instances of a seventeen-leaf
  CLUSTER, so there is no leaf instance to remove; taking one out would mean a per-vertex leaf
  index and a per-instance mask in the material every tree uses, for one season. Instead each
  cluster remembers where its leaves sit (no RNG draw added, no vertex changed), and a shed leaf
  is born coincident with a real one — same place, angle, size, colour, the same `leafGeometry`.
- **Caused by the gust:** leaf i sheds in gust n if `hash(i, n) < rate x strength(n)`. Measured
  over a simulated hour: weak gusts take 2.3, middling 3.2, strong 4.7; nothing sheds in the calm.
- **STATELESS.** A leaf's whole life is a function of (t, i). The same instant, re-asked after
  jumping around in time, is identical to the last digit. `t=` pins the leaves as it pins the wind.
- **The lawn is bounded by construction:** a pool of 32. Mean 20 lying on the lawn, never more than
  30; 21 already down at t = 0, from gusts "before" the page opened. A resting leaf stays a median
  of 58 s, then shrinks away just before its pool slot sheds again.
- **Autumn only.** One InstancedMesh, one draw call, and one extra program (the leaf's plain matte
  shader, no sway: a leaf that has left the tree is moved by its fall). Nothing else pays anything.

**Two bugs of mine, both found by LOOKING rather than counting.** (1) With no shed in sight —
the common case — `smoothstep(Infinity, Infinity, t)` is NaN, so those leaves had a NaN scale:
invisible leaves, a NaN bounding box, and through the extents a NaN CAMERA and a black frame. My
statistics had counted them as present. Fixed at the source, and an hour of weather now holds no
NaN in any matrix. (2) It exposed a fragility in the capped-lens fit, already committed: because
stepping back MOVES the camera by a relative factor, one NaN (or a canvas with no size) is
permanent, where the old lens-only fit recovered on the next resize. `fitCamera` now leaves the
camera alone when the aspect or the extents are not finite and positive; four regression checks.

Defaults: `wind` 0.09 (V0's 0.045 could not be seen at all on the new tree, whose clusters pivot
rather than drift; with gusts that is ~0.03 calm, ~0.135 at the top of a strong one) · gust calm
x0.35 / peak x1.5 / slot 8 s / attack 1.2 s / decay 4.4 s / 12% still · `fallPool` 32 ·
`fallRate` 0.16 · `fallSpeed` 0.78 · `fallDrift` 1.15 · `fallSwing` 0.24 · `gust=0` constant sway ·
`leafFall=0` no shedding · `wind=0` none of it, and the lawn exactly as before wind existed.

Look at it: `gate2.html?preset=mid&season=autumn&fruit=1` (add `&t=152` to pin a strong gust).

## Files

- `autumn-leaf-fall-one-instant.png` — one frame at the height of a gust: three leaves in the air,
  in the tree's own colours and the tree's own leaf shape; a scatter in the grass.
- `autumn-leaf-fall-multiple-exposure-4_8s.png` — twelve exposures 0.4 s apart with the crown's sway
  held still, so each falling leaf draws its own path: off the crown, tumbling, swinging, drifting
  downwind, onto the lawn or past the island's edge. (A first version kept the LIGHTEST channel per
  pixel, which against a day sky turns an orange leaf pink. A changed pixel now wins.)

- `winter-buds-DRIFT-vs-PIVOT.png` — the finding and the fix in one image (x2, nearest-neighbour).
- `leafy-crown-top-DRIFT-vs-PIVOT.png` — the worst camera-facing spot of a leafy crown. The limb is
  black in both rows; the crown still moves in the second.
- `hero-leafy-medium-fruit.png`, `hero-winter-buds.png` — whole frames, wind pinned at `t = 2`.
