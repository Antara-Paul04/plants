# Night levels — 2026-09-20

The human rejected the first night: **"too much light."** These are three points on a
darker range, so the answer is a pick rather than another guess.

Parameters in the `ENVS.night` entry of `prototype/src/gate1.js` only. Nothing structural,
no material or geometry change. `?envstate=night&night=a|b|c` — `b` is the default until
someone chooses.

| | key | spot angle | back edge | warm kick | env | exposure | turf value | leaf value | mean lum. |
|---|---|---|---|---|---|---|---|---|---|
| rejected | 4.4 | 0.33 | 2.2 | 0.30 | 1.00 | 1.15 | 0.36 | 1.42 | 42.8 |
| **a** brightest | 2.9 | 0.29 | 1.5 | 0.20 | 0.52 | 1.04 | 0.30 | 1.26 | 25.7 |
| **b** middle | 2.1 | 0.26 | 1.15 | 0.15 | 0.36 | 1.00 | 0.25 | 1.12 | 18.5 |
| **c** darkest | 1.5 | 0.235 | 0.85 | 0.10 | 0.25 | 1.00 | 0.20 | 1.00 | 13.4 |

Held constant: near-white key from the front quarter (a saturated blue key blacks out warm
wood), sky darker than the lit tree, pale matte clay, sculpted grooves, ACES.

- `SHEET-rejected-a-b-c.png` — side by side, rejected first.
- `thumbnail-140px.png` — all of them at feed size, leafy above, bare below.
- `a-brightest.png`, `b-middle.png`, `c-darkest.png` — full crown (gate2.html).
- `bare-a.png`, `bare-b.png`, `bare-c.png` — bare wood (gate1.html).

What I see: in all three the trunk now has a real shadow side and the far half of the
island falls away. `c` is the floor — the crown is close to losing its green, and the next
step down is the documented black-cut-out failure. My own lean is `b`, but this is a taste
call and not mine.
