# L17 — "night has gone near-black": what was actually wrong — 2026-09-21

**Status: EXPERIMENT.** Code: `envTable` (night's `skyBelow`) and `skyDome` in
`prototype/src/grow.js`. `?nightGlow=0` is the night without it. The ban held throughout:
**night comes from colour, direction and contrast, never from raising exposure.**

## The diagnosis changed twice, and both earlier versions were wrong

1. *Recorded in the rulings brief:* a regression from the ground-darker-than-trunk rule.
   **No.** Sky L* is identical between the approved sheet and what ships.
2. *Mine, from screenshots:* the crown ships less legible than it was approved (17.8 vs 20.8 L*),
   because the level was judged on a bigger, denser crown. **Also no.** That came from a crude
   "bounding box minus sky" segmentation of PNGs. Measured properly (below), the shipping crown
   is as legible as the approved one, and an airy crown does not measure worse.
3. **What is actually lost is the ISLAND'S SOIL BODY**, and it was never a regression: **the
   night levels were judged on a gate frame cropped at the turf, so nobody had ever seen the
   soil at night.** The product frames the whole island.

## The instrument (`l17-probe.js`, kept here so this can be re-run)

Render the frame; then ONE ID pass of the same view — everything in place, each mesh flat-coloured
by kind (crown / wood / soil / turf), so occlusion is right (a first version rendered each part
alone and counted every branch hidden behind a leaf as wood). Box-average both to a 140px-wide
thumbnail in sRGB. A thumbnail pixel belongs to a kind if over half of it is that kind; its
BACKGROUND is the empty pixels within 6px. Reported: median separation from the background, and
the SILHOUETTE — the step across the part's own edge, and the share of that edge within 5 L* of
what is behind it, because a thumbnail is read by its outline. Use `wind=0` (the ID pass cannot
see the sway). On the product path run the camera refit by hand: a hidden pane never ticks.

## Measured — daringfireball.net's real DNA, through `mountTree`, product framing

| at 140px | approved (gate, level b) | SHIPS, before | SHIPS, after |
| --- | --- | --- | --- |
| crown: median separation from sky | 9.4 | 10.8 | 10.8 |
| crown: silhouette step / edge lost | 21.2 / 31.8% | 20.6 / 25.8% | 20.6 / 25.8% |
| wood: separation / edge lost | 12.1 / 23.4% | 13.8 / 29.3% | 13.8 / 29.3% |
| turf: separation / edge lost | 9.1 / 50% | 9.9 / 27.7% | 9.0 / 27.7% |
| **soil: median L\* / its background** | *not in frame* | **0.3 / 2.5** | 0.3 / 10.8 |
| **soil: silhouette step / edge lost** | *not in frame* | **-2.1 / 98.8%** | **-11.7 / 9.9%** |

Full-bleed 16:9 (1280x720): soil edge lost **88.9% -> 4.4%**, step -1.8 -> -11.1; crown 10.6 /
28.9% before and after. The top 45% of the 1:1 frame — 882,000 pixels, the crown and its sky —
hashes to `afa4df5` with and without the change.

Note what even the APPROVED night loses: half its crown pixels are within 10 L* of the sky and a
third of its silhouette is within 5. That is the deep shadow side, it was judged by a person and
accepted, and it is not touched here.

## Why it is a glow under the island, and not light on the island

- **The soil cannot be lit into view.** It faces away from the moon and sits at the dim edge of
  the pool by design. **Painted pure white it still rendered L\* 0.3.** Its night albedo (the
  ground grade's x0.25, meant for the moonlit LAWN) is ~3%, but raising it changes nothing,
  because there is no light on it to reflect.
- **An uplight fights the approved night.** From below only (a hemisphere light with a black sky
  colour) it lifts the crown's shadows nicely and leaves the lawn alone — and does nothing for
  the soil until it is strong enough to end the night, because a leaf reflects ten times what
  soil does. A dedicated under-spot blew out the pale trunk and the stones before it reached the
  band of soil that is actually in frame (the top of the flank, tucked under the turf's rim).
- **Raising the horizon band trades the soil for the lawn.** At `#1d2c52` the soil reads and the
  TURF's edge vanishes instead (edge lost 28% -> 75%): a mid-dark sky matches a mid-dark lawn.
  The two need different things behind them — and they sit at different heights in the frame.
- **So: a deep-blue glow that begins 17 degrees BELOW the horizon** (`#27396a`, from -0.3 to
  -0.6 in the dome's y) — under the island, where only the soil is. The sky behind the lawn
  stays dark. Only the VISIBLE dome takes it; the image-based light has its own dome, so the lit
  tree cannot change. It lands the soil at about the separation the crown and the lawn already
  have (~10 L\*), and no more.

It also makes true something the environment's own comment already claimed: the sky was meant to
be "a little lighter toward the horizon, because that band is what the shadow side is read
against", and it was not — `#111a31` through the ACES toe displays at L\* 2.5 against 1.9 overhead.

## For a person to look at

This changes how the night LOOKS, on the page where the scene is the whole background, and the
night is the human's own call (they rejected the first one as "too much light"). The glow adds
light to the bottom of the frame. It is restrained and measured, but it has not been seen by
anyone who owns the look. `A-*` / `B-*` are the pairs: 1:1, 140px, and full-bleed.
