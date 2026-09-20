# Re-check of the 00:36 build — 2026-09-21

> **EXPERIMENT.** Observations, not decisions. Nothing in the renderer, analysis or mapping was
> changed by this session. Per-site detail: [`report.txt`](report.txt).

24 sites — the acceptance set, every regression and false rejection from the AFTER, the four
chips — plus `bbc.com` five times. **Build:** server started 00:36:37, after `analyze.js` (00:29)
and `measure.js` (00:16); both committed (`a1ad5de`). **Conditions:** load average 4–6, every
attempt started at 28–50% CPU. The first genuinely quiet run of the night.

## Verdict

| | AFTER build (23:14) | This build (00:36) | |
| --- | --- | --- | --- |
| `info.cern.ch` | bare, ink 0.018 | bare, ink 0.018 — identical | ✅ |
| **`bettermotherfuckingwebsite.com`** | `TIMEOUT` | **sparse** | ✅ crux restored — but analysis takes **15.9 s of a 20 s budget** (https black-holes first); thin margin |
| `danluu.com` | bare | bare — identical | ✅ |
| Chips ×4 | 4/4 | 4/4, all first attempt | ✅ but slower, see below |
| `tesla.com` · `imdb.com` | `BLOCKED` | `BLOCKED` ("Access Denied", "Human Verification") | ✅ |
| **`adidas.com`** | grew bare from a blank frame | `NOT_RENDERED` | ✅ fixed |
| `dribbble.com` | `BLOCKED` | `EMPTY_PAGE` | ✅ rejected; "nothing on dribbble.com to read" is an odd thing to say about Dribbble |
| `tiktok.com` | `NOT_RENDERED` | grows normal/medium/flowering | ➖ **not a bot wall**: TikTok sends logged-out visitors to its About page, which now paints. An honest tree of what we are served |
| **`craigslist.org`** | falsely `NOT_RENDERED` | **winter**, ink 0.061 | ✅ fixed |
| **`pinterest.com`** | falsely `BLOCKED` | grows, ink 0.28 | ✅ fixed |
| `booking.com` | `BLOCKED` | `EMPTY_PAGE` (3 elements, 0 chars) | ➖ it serves us an empty shell; honest |
| `isitchristmas.com` | `EMPTY_PAGE` | `EMPTY_PAGE` | ➖ unchanged — a one-word site; product question |
| `raycast.com` | winter, ink 0.045 | **lush / abundant / fruit**, ink 0.165 | ✅ fixed |
| `stripe.com` | lost its fruit | abundant + fruit | ✅ fixed |
| `microsoft.com` | sparse, ink 0.022 | **lush / abundant / fruit**, ink 0.332 | ✅ fixed |
| `magnumphotos.com` | no photographs | ink 0.527, flowering | ✅ fixed (second attempt) |
| `walmart.com` · `europa.eu` | analyzer crashes | both grow | ✅ fixed |
| `play.grafana.org` | `BLOCKED` (wrong word) | 1st try `NOT_RENDERED` "…it is not refusing us" → 2nd try lush, ink 0.439 | ➖ honest wording now; a coin-flip between rejection and a real dashboard |
| **`lusion.co`** | `NOT_RENDERED` | **grows WINTER again, ink 0.013** | ❌ **re-opened** — still a black preloader ("006" counter), see `pairs/lusion.co.png` |
| `youtube.com` | ink 0.046 | ink 0.046 — identical to three decimals | ➖ **my earlier call was wrong**: that is YouTube's real logged-out home (an empty feed), not early measurement |

## `bbc.com` ×5 — no more winter; 4 of 5 identical

| Run | richness | ink | colourfulness | accent | foliage |
| --- | --- | --- | --- | --- | --- |
| 1, 2, 3, 5 | 0.513 | 0.440 | 0.297 | `#2479b6` | lush |
| 4 | **0.499** | 0.344 | 0.255 | `#2177b6` | **normal** |

All five: medium flowers, flowering, same blue. The capture fix worked — the measurement moved
from "0.055 or 0.313, nothing between" to four byte-identical runs and one near miss. The
remaining difference is small, but **0.513 and 0.499 straddle the 0.50 foliage band**, so a 3%
wobble flips lush to normal. OPEN, not a regression. Third band-edge flip seen tonight
(`openai.com` at 0.55, `drudgereport.com` at 0.20, `bbc.com` at 0.50).

## The cost: every site got slower

On a quiet machine, sites that grew on both builds (n = 10): analysis median **6.4 s → 10.2 s**,
on screen **8.3 s → 11.9 s**. The chips: `info.cern.ch` 3.0 → 4.4 s · `news.ycombinator.com`
3.1 → 6.5 s · `arxiv.org` 3.6 → 8.4 s · `gwern.net` 6.4 → 10.2 s. CPU was 28–50% before each
attempt, so this is the build, not the machine — presumably the page walk that fixed bbc.
Still well inside the budget, but the fix for image-heavy pages is being paid for by a 16-node
page with no images.

## Open

1. `lusion.co` — a preloader measured as winter, again. It sits at 1.3% ink; `info.cern.ch` at
   1.8%. An ink threshold alone cannot separate them. What does: `lusion.co` is a full-frame
   canvas (canvasArea 1.0) with colourfulness 0; `info.cern.ch` has text and 25 links.
2. `bbc.com` 4 of 5 — and the band edges that turn small wobbles into different trees.
3. `bettermotherfuckingwebsite.com` works with 4 s of budget to spare.
4. Analysis time up ~60% across the board.
5. `isitchristmas.com` — is a one-word page a website? Product question.
6. Brand-to-own-regional-domain redirects (`nike.in`, `airbnb.co.in`…) — not re-tested here.
