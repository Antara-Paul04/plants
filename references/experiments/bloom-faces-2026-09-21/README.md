# The bloom's faces — which twigs flower, measured round the tree — 2026-09-21

**Status: DECIDED by Lead (2026-09-21), flagged to the human to re-judge by eye.** `even` is ON
for `medium` and `abundant` (`BLOOM_FOLIAGE`, `prototype/src/flowers.js`); `?bloomEven=0` is the
selection as it was. It changes WHICH twigs flower and never where a flower sits (D8.5), draws
nothing from the RNG, and leaves `few` alone. The camera finding (`faces`) is measured and NOT wired.

## What was wrong, and what was not

Averaged round the tree there is no "wreath". The figure that started the structural work — bloom
missing from the middle of the crown — was **one seed from its worst face**, and that face is the
debug page's default camera (`gate2.html?preset=bare&seed=7`), the instrument of every bloom
judgement made on this project. What IS wrong: **a crown's faces differ**, and some are nearly bare.

Why: only about 5 of ~146 attachment points face the camera in the middle third of any view. At a
40% bloom that is two flowering twigs, give or take two — a lottery. And `medium`'s drift field
(weight 0.8, wavelength ~2.4) leaves bare stretches about 1.2 across by DESIGN, where a view's
middle third is about 1.9 across: the gap the field exists to make is the size of a face's middle.

**A premise of mine that was false, corrected before anything was built on it:** I told Lead that
selection stratifies by compass sector and by height band *separately*. It does not; `pickSites`
already stratifies by both together (6 sectors x 3 bands, per-stratum quotas). What it did inside a
stratum was take the top SCORES — and the drift field makes the top scores neighbours.

## C — even inside each stratum

A stratum's share is taken spread out: its best-scored twig first (so the field, the outer bias and
the tip bonus still say where that stratum's bloom starts), then, each time, the twig farthest from
everything already taken.

### The acceptance test (Lead's): worst face of 8, >= 3 seeds; a mean that rises while the worst does not is a FAIL

Instrument (R12): `orbit-harness.js` + `../leafy-ramify-2026-09-21/bloom-probe.js` —
`gate2.html?preset=bare&wind=0`, 1800x1800 buffer, occlusion-correct ID pass box-averaged to 140px,
bloom as a share of the crown box's middle third, 8 views, 5 seeds. Checked first: `bloomEven=0`
reproduces the earlier seed-7 table to the digit. The number of flowering twigs is the same in
every pair.

`medium` — middle-third bloom %, by view, today then even:

| seed | today | worst | even | worst |
| --- | --- | --- | --- | --- |
| 7 | 6.8 27.2 29.4 31.2 6.3 23.0 30.4 20.4 | **6.3** | 17.2 23.3 17.3 23.7 18.8 23.2 16.7 29.5 | **16.7** |
| 3 | 36.1 11.0 42.5 30.6 36.9 30.7 32.3 41.4 | **11.0** | 24.4 24.6 29.3 35.1 30.4 28.9 29.8 37.3 | **24.4** |
| 11 | 6.9 23.2 26.4 10.3 25.9 57.6 30.7 42.8 | **6.9** | 33.2 37.5 13.0 8.0 40.3 46.1 41.3 28.8 | **8.0** |
| 5 | 49.9 6.0 32.5 17.9 9.0 23.8 14.2 4.7 | **4.7** | 34.0 9.9 26.0 11.0 10.9 18.9 17.0 13.2 | **9.9** |
| 19 | 15.9 21.8 13.5 12.9 24.3 16.0 15.8 16.6 | **12.9** | 25.4 14.1 9.9 16.1 15.5 17.8 10.3 20.6 | **9.9** |

`abundant`:

| seed | today | worst | even | worst |
| --- | --- | --- | --- | --- |
| 7 | 13.3 42.9 37.0 25.9 25.2 30.1 37.8 32.4 | **13.3** | 28.4 37.6 36.7 41.0 36.4 32.1 31.7 34.2 | **28.4** |
| 3 | 29.0 30.9 52.6 51.1 33.8 33.2 43.5 59.5 | **29.0** | 40.2 33.1 44.2 53.7 37.1 50.3 35.7 58.7 | **33.1** |
| 11 | 39.5 42.9 44.0 11.7 56.6 54.5 43.9 46.0 | **11.7** | 49.1 52.3 45.0 22.6 54.1 45.1 64.4 50.7 | **22.6** |
| 5 | 61.6 7.7 33.3 29.8 16.1 19.9 24.4 27.2 | **7.7** | 46.3 30.6 33.6 27.2 31.4 31.0 31.0 24.2 | **24.2** |
| 19 | 26.1 21.0 11.3 36.1 30.3 24.0 21.1 24.2 | **11.3** | 31.4 28.3 20.9 26.2 26.9 22.5 13.0 23.6 | **13.0** |

- The worst face rises in **9 of 10** seed x amount runs, with the orbit's mean flat (medium 23.9 ->
  23.2; abundant 33.3 -> 36.6). Worst over all seeds: medium 4.7 -> 8.0, abundant 7.7 -> 13.0.
  Faces under 10%: medium 6 of 40 -> 3 of 40; abundant 1 of 40 -> 0.
- **One regression, stated:** seed 19 medium, 12.9 -> 9.9 — a low-bloom tree (50 flowering twigs;
  every face 10–25% under every variant). And seed 11 medium still has an 8% face. It is an
  improvement in the distribution, not a guarantee.

### A and B, rendered on the same seeds (medium, worst face per seed 7 · 3 · 11 · 5 · 19)

| | worst faces | over all seeds |
| --- | --- | --- |
| today | 6.3 · 11.0 · 6.9 · 4.7 · 12.9 | 4.7 |
| A — flatter drift field (`bloomField=0.35`) | 12.5 · 20.4 · 10.9 · **1.1** · 8.1 | 1.1 |
| B — finer drift field (`bloomFreq=1.4`) | 10.9 · 13.7 · 10.9 · **2.0** · 5.9 | 2.0 |
| **C — even** | 16.7 · 24.4 · 8.0 · 9.9 · 9.9 | **8.0** |
| C + A | 13.5 · 24.7 · 9.7 · 10.1 · 9.5 | 9.5 |

A and B each make two seeds WORSE than today; C + A is C within noise. The drift field was never
the lever. A is the change with precedent behind it (abundant's field was flattened once already),
which is the reason it was measured rather than shipped.

### A cheap proxy, retired

A no-render count ("flowering attachment points facing the camera in the middle third") was used to
rank these first. Two definitions of it disagreed about TODAY's own count (4 of 64 bare faces vs 2
of 64), and with the real `pickSites` on 8 seeds it TIED A with C (0 of 64 each) where the render
separates them by a whole grade. One instrument that disagrees with itself is not a cheap version
of the real one. Only the render counts.

### The look

`today-vs-even-worst-faces.png`, and one PNG per pair (`pair.mjs` makes them, in a headless Chrome):
the worst faces under today's selection, the default camera, and the one tree whose worst face got
worse. One fact, not a taste: in the today frames the bloom sits in one or two contiguous drifts
with a contiguous green stretch between; in the even frames neither survives as a shape. **Lead's
judgement, made before reading that sentence:** it does not read as salt-and-pepper — flowers group
at the twig, so evenness between twigs is not evenness between flowers — and the shape being lost
most often was a bare green face. Approved; the human to re-judge.

## The camera — `faces`, measured, NOT wired

`growTree` reports `faces: { best, worst, score[16] }`: the compass direction (atan2(z, x) round the
trunk) from which the most, and the least, bloom sits face-on at mid-height. No render; ~1 ms.

Against the rendered probe, 20 runs (5 seeds x 2 amounts x today/even): the face score tracks a
view's middle-third bloom at **r = 0.70** (0.11–0.91; the 0.11 is a tree `even` had already
flattened — nothing left to choose). Under TODAY's selection the default camera averaged 28.5% with
a floor of **6.8%**; opening on `faces.best` averaged 43.9% with a floor of **21.8%**, and was the
best, second or third of 8 views in every run; `faces.worst` landed on the 7th or 8th in 8 of 10.

So the camera alone lifts the OPENING face — and only the opening: the orbit still passes the bare
one. C fixes the face, the camera picks the side; they compose. Lead's ruling: wire it after C has
been looked at, and with its own look. Where an orbit starts is framing, not fabrication.

## Files

- `today-vs-even-worst-faces.png`, `pair-seed*-view*.png`, `pair.html` (references the PNGs), `pair.mjs`.
- `orbit-harness.js` — the instrument. `after-flip.mjs` — proves the flipped default IS `bloomEven=1`,
  that `bloomEven=0` IS the old selection, and that `few` is untouched.
