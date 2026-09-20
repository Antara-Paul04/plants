# The combined AFTER — 2026-09-20, 23:16 → 00:30

> **EXPERIMENT.** Observations from a test run, not decisions. Nothing in the renderer,
> analysis or mapping was changed by this session.

One analyzer build, measured twice over: the 79-site reliability list (this folder) and the
original 64-site survey ([`../site-survey-AFTER-2026-09-20/`](../site-survey-AFTER-2026-09-20/)).

**Build measured:** server started 23:14:22, after `analyze.js` (23:06) and `mapping.js` (23:08)
were last written — navigation on `commit` + readyState, the bot-wall gate, the frame-comparison
contention fix, `REFUSED`/`OFFLINE` codes, rulings L9 + L10. Every tree here came from that
build; tree capture ended 23:58, before anything else was released. Quiet-gated: every attempt
started under 50% CPU (median 0.43).

**Look first:** [`_before-after.png`](_before-after.png) (40 sites) and
[`../site-survey-AFTER-2026-09-20/_before-after.png`](../site-survey-AFTER-2026-09-20/_before-after.png)
(48 sites) — each tree beside its earlier self. Numbers: `compare.txt` and `analysis.txt` in each folder.

## What the AFTER was asked, and the answer

| Question | Before | After | Verdict |
| --- | --- | --- | --- |
| Pass rate, 79 sites | 47 | **59** | ✅ `TIMEOUT` 27 → 2 |
| Second attempts needed | 9 | 3 | ✅ |
| On screen, median | 14.0 s | **10.3 s** (64-site list: 8.0 s) | ✅ |
| Time to be told "no" | 8.5 s | 5.2 s | ✅ |
| Fruit, 64-site list | 6/56 | **13/50** (6 → 13 among the 48 that grew in both) | ✅ exactly Lead's prediction |
| Winter **with** fruit | 0 | 0 | ✅ as predicted — the thresholds exclude each other |
| Identical-fingerprint clusters | `adidas`/`dribbble`/`tesla` | none | ✅ |
| `tesla`, `dribbble`, `imdb` fail honestly | grew from block pages | `BLOCKED` | ✅ |
| **`adidas.com` fails honestly** | grew bare | **still grows bare — from a frame with ink 0.000** | ❌ slipped past all three gates |
| `info.cern.ch`, `danluu.com` still bare | bare | bare, ink unchanged | ✅ |
| `lusion.co`, `play.grafana.org` | trees of loading screens | rejected | ✅ `lusion` `NOT_RENDERED` · ⚠️ `grafana` `BLOCKED` is the wrong word — it is not refusing us, it has not painted |
| Pass rate, 64 sites | 56 | **50** | ❌ see regressions |

8 simultaneous requests for the chips were 5/8 before; analysis reports 8/8 on this build (not re-tested here).

## Regressions

**1. The crux site fails.** `bettermotherfuckingwebsite.com` → `TIMEOUT "exceeded 20000ms"`, twice.
Its `https://` black-holes (no TCP connection in 25 s); `http://` answers in 0.6 s. It used to
work because a `TIMEOUT` fell through to an http retry. That retry was removed earlier tonight —
**on this session's recommendation**, which was right for `nike.com` and wrong for a dead port 443.
The useful distinction: timed out *before* commit (nothing answered — try http) versus *after*
(the site is slow — http will not help).

**2. Pages measured before they paint.** Bounded — about 4 in 50 — but each one is a confident
wrong tree, which is worse than the honest timeout it replaced.

| Site | Ink at measurement | Result |
| --- | --- | --- |
| `raycast.com` | 0.254 → **0.045**, colourfulness 0.737 → 0.065 | vivid red site → colourless **winter**, lost flowers and fruit |
| `stripe.com` | 0.222 → **0.122**, canvas 0.273 → 0 | lost its fruit; *consistently* so — identical in both halves |
| `magnumphotos.com` | colourfulness 0, imageArea 0.001 | a photography site measured with no photographs |
| `microsoft.com` | **0.022** | colourful hero called "a light, uncomplicated page… no meaningful colour accent" — see [`pairs/microsoft.com.png`](pairs/microsoft.com.png) |
| `youtube.com` · `reddit.com` · `duckduckgo.com` | 0.046 · 0.040 · 0.034 | now "grow", under-painted |
| **`bbc.com`** | **0.056 at 23:2x → 0.317 at 23:4x** | **winter, then lush and flowering — same build, thirty minutes apart** |

The `NOT_RENDERED` gate fires at ~1.5% ink; these sit at 2–12%.

**3. False rejections from the new gates.**
- `craigslist.org` → `NOT_RENDERED "1.5% inked"`. A real, deliberately sparse page — and
  **`info.cern.ch` measures 1.8%**. The crux site is 0.3 points from "the page did not paint".
- `pinterest.com` → `BLOCKED "no links, 0 chars, 1 boxes"`. An app shell not yet rendered. Grew
  beautifully in the BEFORE; the user is now told Pinterest refuses us.
- `isitchristmas.com` → `EMPTY_PAGE "36 chars"`. Its whole design is one word. Whether that is a
  website is a product question; the gate now answers no.
- `booking.com` → `BLOCKED` notice-page; it grew in the BEFORE.

**4. `REDIRECTED` ×5, all brand-to-own-brand.** `nike.com`→`nike.in`, `airbnb.com`→`airbnb.co.in`,
`espn.com`→`espn.in`, `disney.com`→`disney.in`, `zoom.us`→`zoom.com`. Previously hidden behind
`TIMEOUT`. From this network no global brand with a regional domain can grow.

**5. Two new analyzer crashes.** `walmart.com` → `INTERNAL "Cannot read properties of undefined
(reading 'width')"` · `europa.eu` → `TIMEOUT "page.screenshot: Timeout 2500ms exceeded"`.

## Still stable

On this build, 19 sites were measured twice, ~30 minutes apart: **18 identical**, `bbc.com` the
exception. Among sites that grew before and after: 38 of 40 (79-list) and 42 of 48 (64-list) kept
identical DNA; the rest are the early-measurement cases above plus two band-edge flips
(`openai.com` richness 0.555 → 0.541 across the 0.55 line; `drudgereport.com` 0.201 → 0.189
across 0.20).

Honest failures, no action: `stackoverflow`/`nytimes`/`lingscars`/`etsy`/`aesop` HTTP 403 ·
`species-in-pieces.com` `ERR_SSL_PROTOCOL_ERROR` · `amazon.com`/`archive.org` `EMPTY_PAGE` ·
`tiktok.com` `NOT_RENDERED` (0.0% inked — correct) · `spacejam.com/1996` `TIMEOUT`.

## Next

The build served after 00:16 is a different one (analysis's crux-site, pinterest and
viewport-fallback fixes). It needs only a short re-test — not all 143:
`bettermotherfuckingwebsite.com` `pinterest.com` `adidas.com` `tesla.com` `dribbble.com`
`info.cern.ch` `danluu.com` `craigslist.org` `isitchristmas.com` `raycast.com` `stripe.com`
`bbc.com` `microsoft.com` `youtube.com` `magnumphotos.com` `walmart.com` `europa.eu`
`play.grafana.org` `lusion.co` + the four chips. Commands: `../reliability-sweep-2026-09-20/AFTER-RUNBOOK.md`.
