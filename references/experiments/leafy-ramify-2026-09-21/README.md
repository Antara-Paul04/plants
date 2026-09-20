# Ramification under foliage — and what it found instead — 2026-09-21

**RESULT: the hypothesis is NOT supported. Ramifying the tree under its leaves does not move bloom
into the crown's middle. But the measurement found something that matters more: "the wreath" and
"`medium` fails the ladder" were both judged on ONE SEED FROM ITS WORST FACE.**

Asked by Lead after Gate 1 (`../gate1-ramify-2026-09-21/`): ramification lost on the bare tree but
looked, on my own numbers, like the first thing ever to move the hollow-shell defects — so try it
where its twigs are hidden attachment points. Those numbers were mine, and they were wrong.

## 1. A correction to my own headline: "4 -> 14" was one view of one seed, at twice the leaf

I reported camera-facing attachment points in the crown's middle third going from 4 to 14. That was
the hero angle of seed 7, with the ramified tree carrying 2.2x the clusters. Measured properly —
8 azimuths, 3 seeds, EQUAL leaf:

| seed | today | ramified, same spacing (1.5–2x the leaf) | ramified, EQUAL leaf |
| --- | --- | --- | --- |
| 7 | 5.4 | 10.6 | 6.6 |
| 3 | 4.9 | 9.3 | 5.3 |
| 11 | 5.4 | 14.0 | 6.9 |

About **5.2 -> 6.3, +20%**. Real, small, and not what I said.

## 2. Bloom through the crown, measured round the tree

`bloom-probe.js`: one ID pass (leaf / bloom / wood flat-coloured by kind, so occlusion is right),
box-averaged to a true 140px; the crown's box cut in thirds both ways; MIDDLE = the centre cell,
RIM = the eight round it; averaged over 8 azimuths. `preset=bare`, equal leaf.

| | today: middle / rim | worst face | ramified: middle / rim | worst face |
| --- | --- | --- | --- | --- |
| abundant, seed 7 | 30.6 / 35.2 | 13.3 | 22.4 / 26.1 | 8.6 |
| abundant, seed 3 | 41.7 / 36.9 | 29.0 | 40.6 / 37.9 | 13.9 |
| abundant, seed 11 | 42.4 / 34.3 | 11.7 | 46.1 / 35.1 | 24.3 |
| medium, seed 7 | 21.8 / 22.0 | 6.3 | 16.4 / 16.2 | 1.2 |
| medium, seed 3 | 32.7 / 26.1 | 11.0 | 35.1 / 25.9 | 12.1 |

- **Ramification changes nothing that matters here.** Middle-to-rim 0.85 / 1.07 / 1.31 against
  0.87 / 1.13 / 1.23 at abundant; no consistent move in the worst face either.
- **Averaged round the tree, there is no wreath.** Today's `abundant` carries 31–42% bloom in the
  middle of the crown against 34–37% at its rim. The figure this whole line of work started from —
  "even approved `abundant` manages 8.6% in its middle third against 36% at the rim" — is the HERO
  ANGLE OF SEED 7, which is that tree's worst face (I reproduce it: 13.3 / 37.8 from that one view).
- **`medium`, seed 7, by view:** 6.8 · 27.2 · 29.4 · 31.2 · 6.3 · 23.0 · 30.4 · 20.4. The first is
  the hero angle. "A green tree with a pink rim; the crown's centre third is solid green" is true
  of two faces in eight. **Every bloom judgement on this project was made on
  `gate2.html?preset=bare&seed=7` from the default camera** — the debug page's defaults.

## 3. So what is actually wrong

Not a hollow shell that bloom cannot reach — a crown whose FACES differ. From most angles the bloom
is through the middle; from one or two the middle is bare, and the default angle of the default
seed is one of them. In the product the camera opens on the same hero position and then orbits, so
for some sites the FIRST frame is the bad face.

`chooseBloomSites` already stratifies by compass sector so every side carries its share, and
separately by height band. It does not stratify by sector AND band together — so a sector can have
all its bloom high and low and none at mid-height, which is exactly the part of the shell that is
face-on in the middle of a view. That is the next hypothesis, it is a change to which twigs flower
(never to where a flower sits — D8.5 stands), and it is cheap. **Not done here: one hypothesis at a
time, and this one deserved to be reported first.**

## 4. What was built, and left inert

`ramify=leafy` (ramify only a tree that will carry leaves; naked and winter trees keep today's
armature), per-structure shoot counts under `PRESETS.*.ram` (`bare` 200, `mid` 20, `sparse` 0 —
`mid` at 45 came out at 61–73 limbs, i.e. as the bare tree, which it must not be), and the foliage
ladder's compensation: leaf spacing x1.9 / x1.6 / x1.05 AND a cap at the judged amount, because
spacing alone cannot do it — every limb tip carries a cluster whatever the spacing, so a ramified
`bare` has a floor of ~106 clusters where today's sparse-foliage tree has 70, which would quietly
make "sparse" less sparse. Today's counts follow `clusters ~ K / spacing`, K = 56 / 42 / 30.
All behind `RAMIFY_DEFAULT = '0'`; `ramify=0` is untouched. No leafy panel was run: there was
nothing for it to judge that the numbers had not already answered.

## 5. The lesson, which is the same one for the fourth time tonight

A number that silently encodes the instrument as if it were the subject: the OS in a font list,
a square box in a framing constant, a bounding box in a legibility score — and here, ONE CAMERA
ANGLE OF ONE SEED in a bloom distribution. Two of those four were mine. **Anything measured about
a tree that is meant to be orbited has to be measured round the tree, on more than one seed.**
