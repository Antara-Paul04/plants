# A tall frame is answered by stepping back, not by a wider lens — 2026-09-21

**Status: EXPERIMENT**, ordered by Lead ahead of the full-bleed page. Code: `fitCamera` in
`prototype/src/viewer.js`; the two product mounts and the gate page hand it their controls.

## What was wrong

`fitCamera` was a CONTAIN fit made entirely with the LENS, at a fixed camera distance. That is only
safe in a frame about as wide as it is tall — and every frame on this project was (`.stage` is
`aspect-ratio: 1/1`). In a TALL frame the tree is bound by its width, and fitting it with the lens
WIDENS the lens.

TASTE #1: the narrow field of view is "the single strongest lever" for the miniature, and a wide
lens "makes a diorama look like a real place you are standing in". So a phone would have shipped
the one thing the constitution names as the way to lose the look. It was already true on any narrow
stage; nobody had seen it because mobile is not started.

## What it does now

The lens is CAPPED at what the SQUARE stage gives this tree — `max(h, w) / 2` — and a frame too
narrow for that lens is answered by stepping the camera BACK. The orbit limits scale with it, a
resize re-scales rather than compounding, and the viewer's own zoom survives a resize.

The cap is "the square stage's lens", not "the height-bound lens", on purpose: a squat tree is
width-bound even at 1:1, and the height-bound definition would have moved it. This one cannot move
a square-or-wider frame for ANY tree, by construction.

## Measured

`gate2.html?preset=bare&seed=7&flowers=medium&t=2`, every pixel of the canvas hashed (FNV-1a).
BEFORE is `?fit=lens`, which hands `fitCamera` no controls — it is then the old function, bit for
bit (proved headlessly across 7 aspects x 4 extents).

| frame | BEFORE | AFTER | |
| --- | --- | --- | --- |
| 1:1, 1400x1400 px | fov 40.08, `91f3a845` | fov 40.08, `91f3a845` | **pixel-identical** (and a control reload: `91f3a845`) |
| 16:9, 2560x1440 px | fov 40.08, `88eba0e3` | fov 40.08, `88eba0e3` | **pixel-identical** |

Note the wide frame carries the SAME lens as the square one: it is height-bound. A tree in a 16:9
page is exactly as tall, relative to the viewport, as it is in the square stage — it just has sky
either side of it.

Through the PRODUCT path (`wired.html?site=gov.uk&spin=0`, `mountTree`, the tree's real nominal
extents 8.75 x 7.56), phone frame 375x812:

| | lens | camera distance | orbit limits |
| --- | --- | --- | --- |
| BEFORE | **68.8°** | 12.3 | 8 – 22 |
| AFTER | **40.2°** — the square stage's lens for this tree, exactly | 23.0 (x1.87) | 15 – 41.2 |

`phone-govuk-BEFORE-lens-fit.png` / `phone-govuk-AFTER-capped-lens.png`. The tree is the same WIDTH
on screen in both — both fit it. What changes is the object: before, the island is a wide bowl seen
from above it and the near leaves swell; after, it is the compact miniature the desktop shows.

**A measurement trap, recorded because it cost a wrong number first.** The preview pane was hidden,
and a hidden pane never fires `requestAnimationFrame`. `main.js` refits inside its `tick`, so the
refit that follows a tree's arrival never ran, and the first captures were framed on `mountTree`'s
PLACEHOLDER extents (8 x 8) — 71.9° / 37.0°, numbers that belong to no tree. The figures above were
taken by running exactly what that tick runs (the same `viewer.js` module instance, the same
`nominalExtents`, the same call). The gate pages do not have the trap: they fit synchronously, after
the build. **Anything measured on the product path in a hidden pane needs its refit run by hand.**

## Known

- The sky dome's radius is 60 and the farthest a viewer can now pull back on a phone is ~41. Inside
  it with room; a frame much narrower than 9:19 would want the dome checked.
- On a phone the tree fills the width and only about half the height. That is a composition
  question for the page, not a lens one.
- `DIST0` is measured from the origin (12.67) but the camera orbits the target (~11.87 away), so
  every fit is ~6% tighter than its pad says. Known, harmless, and deliberately left: fixing it
  would move every frame ever judged. The number is in a comment where `DIST0` is defined.

---

# IDLE — the page before anyone has named a website (same day, ordered by Lead)

`mountIdle(canvas, opts)` / `opts.idle` / `handle.setIdle()`; `growEarth(M, q, env, { idle })`.
Look at it: `wired.html?idle=1`, and `wired.html?idle=1&then=<site>`.

**The same bare-earth island as the FAILURE state, framed the opposite way — and only the framing
tells them apart.** For failure a tree-shaped void is a lie: it draws the thing we are saying we
could not produce, so failure frames on the island. For idle the same void is the invitation, so
idle is framed as the tree scene a normal tree will ask for. It is bare soil for the failure
state's own reason: terrain is measured too, and a lawn at idle is ground nobody measured.

Measured at 1280x720, through `mountTree`'s own handle:

| step | lens | target y | sky (`envName`) |
| --- | --- | --- | --- |
| idle | 40.2° | 2.55 | day |
| → `setDNA(linear.app)` | 40.2° | 2.55 | night |
| → `setEarth()` (failure) | **15.7°** | -0.55 | day |
| → `setIdle()` | 40.2° | 2.55 | day |

**Idle → first tree: the camera moved by 0** — lens, position and target all unchanged
(`idle-16x9.png`, `idle-then-first-tree-16x9.png`: the island is in the same place in both). A
`mid` tree is an exact match; the other two structures ask for 39.5° and 40.9°, so the most the
camera ever has to give is 0.7 of a degree. Had idle reused the failure framing, the first thing
the product did in front of a person would have been a zoom-out from 15.7° to 40.2°
(`failure-16x9.png` is what 15.7° looks like on a wide page: the island IS the page).

`opts.onEnv(name)` logged `day, night, day` — once per change of sky, at the moment it went ON
SCREEN (for a swap, when the new tree is whole, not when it was asked for). `handle.envName` is the
same fact as a getter. Both exist so the shell can set its text against the sky without reaching
into the scene. `?engine=v0` has no environment states and reports `null`; treat that as day.

**Same as the square stage, and worth knowing for a full-bleed page:** the tip of the soil body
falls below the bottom edge. `nominalExtents` frames 1.5 of the island's 1.95 depth on purpose
("the point below is soil-coloured and may fall out of frame"), and a wide frame is height-bound,
so it crops exactly what the square one crops — no more.

---

# FAILURE on a full-bleed page: "why is my screen brown" (found by the human on the deployed product)

`growEarth`'s failure extents (`prototype/src/grow.js`). **EXPERIMENT.**

The failure state was framed TIGHT on the island (3.3 x 5.6, centred on the soil) so that it would
not draw a tree-shaped void — a failure must not picture the tree it is saying it could not
produce. That reasoning stands. The NUMBERS were judged in a 62vh square box. With the scene as the
whole window a tight fit is height-bound, the lens closes to 16.7°, and on the human's ~2000x1250
window **the island fills 83% of the width and 80% of the height**: it stops being an object in a
world and becomes a texture, with the failure card stuck on it like a label
(`failure-2000x1250-A-today.png`). It was predicted here (`failure-16x9.png`, "the island IS the
page") and then shipped anyway, on the state it was true of.

**Now: 7.8 x 8.6, aimed at y 1.5 — a small plot in a world.** The shell CENTRES its failure
message, so the island cannot be centred too (the card becomes a sticker again) and cannot sit
just under it (`...-B-object-in-a-world.png`: the card clips the island's far rim, which reads as
an accident). The frame is aimed ABOVE the soil so the message floats clear of the island and
captions it (`...-K-card-centred.png`). Measured through the handle's own `setEarth()`:

| window | lens | island: share of width | island: from / to, down the frame |
| --- | --- | --- | --- |
| 2000x1250, BEFORE | 16.7° | **83%** | 13% – 93% |
| 2000x1250 | 36.1° | **37%** | 57% – 94% |
| 1280x720 | 36.1° | 34% | 57% – 94% |
| 700x700 | 39.6° | 54% | 57% – 90% |
| 375x812 phone | 39.6° (camera stepped back to 26.4) | 54% | 53% – 68% |

The sky above the island is about 5 units; a tree stands about 6.8. It is not the void idle draws.

**What this costs, stated plainly: failure now sits close to IDLE.** At 2000x1250 idle is 34% of
the width at 68%–100%; failure is 37% at 57%–94%. Same island, nearly the same size, a tenth of
the frame higher, with its whole body in view where idle crops the tip. With a centred message
there is no frame that is BOTH "a small island in a world, clear of the card" AND far from idle:
they are told apart by the copy, the card's colour, and a small move of the camera. If they must
differ more, the lever is the shell's, not the lens: put the failure message somewhere other than
the centre and the island can be centred and small (try 8.4 x 9.4 aimed at -0.55).

On a phone the card's lower edge just touches the island's far rim (island top at 53%).

