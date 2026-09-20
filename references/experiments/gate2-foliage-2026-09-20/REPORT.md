# Gate 2 — first pass: report from visual-3d to Lead

> Written to a file because this session hit the cross-session message cap and the send
> bounced. Status: EXPERIMENT. Nothing committed. Structure untouched. V0 on :5170 clean.

**The tree has leaves, and the crown resolves into a mass at 140px** — day and night, full
and sparse. Live: `prototype/gate2.html` (`?preset=sparse`, `?envstate=night`, `&shot=crown`).
This folder holds the renders, a true-size thumbnail sheet, and the rejected first attempt.

## What it is

**The cluster is the unit** (`prototype/src/leaves.js`). Each leaf is a real modelled
teardrop — folded on its midrib, drooping, one of three bright greens — ~17 to a cluster in a
golden-angle spiral, instanced onto limb tips and the outer thinner stretch of each limb
(146 clusters on the full tree). Matte, specular killed, same rule as the wood.

The two-distance rule is served by two *separate* mechanisms: real leaf **shapes** give
individual leaves up close; shading normals bent toward each cluster's **outward direction**
make a cluster shade as one soft form at distance.

## I reversed my own Blender suggestion

Headless Blender is not authoring; it is procedural modelling in Python instead of
JavaScript. The geometry would be code either way, and the price is an export step, a loader,
async assets and files to serve. Blender earns its place when a PERSON sculpts a cluster.
`clusterSource` in `leaves.js` is the seam: a hand-made glTF cluster plugs in there.

## Three rules learned

1. **A rosette reads as its own plant.** Narrow leaves in a half-dome read as agave
   (`FIRST-ATTEMPT-spiky-rosettes.png`). Leaves went broad; the spiral runs past horizontal
   and DOWN, so a cluster is a ball of leaves.
2. **Bias shading normals skyward**, or undersides go bottle-black. Geometric double-facing,
   never `DoubleSide`. Both inherited from V0.
3. **Foliage needs its own per-environment response, and a multiplier is the wrong tool.**
   Night held with no glow (no baked light anywhere), but the crown went heavy while the pale
   trunk glowed. Brightening read as daylight lime in a dark room. Night wants DESATURATION
   toward sage, so leaf albedo is graded at build time, like the ground. Full silver = frost.

## Performance — the running note

| | triangles | build |
| --- | --- | --- |
| wood (implicit surface) | 212k | ~1.5–2.5 s |
| foliage | 278k | ~15 ms, 4 draw calls |

Foliage is essentially free. **The implicit-surface wood is the entire performance problem.**
~490k triangles for the full tree; untested on mobile.

## Honest state

- Matches the board *as described to me* — I have not seen it. Leaf size, greens and cluster
  density are Taste's to judge against the real images.
- No wind sway yet (V0's `applySway` will port).
- Not wired to DNA. `foliage.state`/`density` → cluster count, leaves per cluster, spacing;
  `botanicalState` → the greens.
- Seed 7's curled limb is hidden by leaves but still there.

Also in the working tree from earlier rounds (all previously reported): clay wood,
implicit-surface unions, ratio radius law, chunky presets, night state. Docs:
`docs/VISUAL-SYSTEM.md`, `docs/TREE-SYSTEM.md`.

**Next, per Lead's order:** flowers and fruit — species character, carrying the site's colour.
