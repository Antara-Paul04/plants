# Bloom system — test matrix index — 2026-09-20

Renders for the matrix in `docs/briefs/BLOOM-SYSTEM-RULINGS.md` (§16). All on
`prototype/gate2.html`; every case is a URL, so every case is reproducible. **EXPERIMENT —
numbers are proposals; Taste owns sizes, counts, fractions and tones.** Website screenshots
are not beside these trees: that comparison is Lead's / Taste's to make.

| # | case | where |
|---|---|---|
| A | warm red | `../bloom-L6-2026-09-20/1-red-f62e2b-on.png` |
| B | deep maroon `#723131` | `../bloom-L6-2026-09-20/4-maroon-723131-on.png` |
| C | blue: gov.uk `#2d7abc`, github `#1b20a0` | `../bloom-L6-2026-09-20/2-…`, `3-…`, `navy-closeup-off-vs-on.png` |
| D | orange `#f2a23a`, yellow `#f5f50a` | `D1-…`, `D2-…` here |
| E | near-achromatic `#e5e5d1` (anthropic, bbc, newyorker, pentagram all measure this) | `../bloom-L6-2026-09-20/5-cream-e5e5d1-on.png` |
| F/G/H | few / medium / abundant | `../bloom-L5-2026-09-20/LADDER-few-medium-abundant.png` + `*-DEBUG-VIEWS.png` |
| I | fruit only | `../bloom-L11-composition-2026-09-20/I-fruit-only.png` |
| J | flower + fruit | `../bloom-L11-composition-2026-09-20/J1…J4`, `SHEET-composition.png` |
| K | winter, no fruit → buds | `../bloom-L8-winter-2026-09-20/K1…K4` |
| L | winter, fruit → berries | `../bloom-L8-winter-2026-09-20/L1…L3`, `SHEET-winter.png` |
| M | grammars chosen by seed alone | `M1-seed3` cluster, `M2-seed7` statement, `M3-seed10` pendant; `SHEET-D-and-M.png` |

Determinism (M): seed 7 rendered twice — **0 differing pixels in the tree**; the only
differences are in the grass, which sways.

## URL surface

`flowers=none|few|medium|abundant` · `grammar=cluster|statement|pendant` (default: chosen by
seed; `form=` and the first names still resolve) · `morphology=` · `fc=` `fc2=` · `fruit=1`
`fruitc=` `fruitSites=` `fruitClear=` · `season=winter` `winter=buds|berries` `budSize=`
`berrySize=` `berryFrac=` `dormancy=` · `contrast=0..1` `contrastR=` · `leafAtBloom=`
`leafNear=` `leafNearR=` `leafElsewhere=` `bloom=` · debug: `leafHide=1`, `debug=bloomleaves`.
