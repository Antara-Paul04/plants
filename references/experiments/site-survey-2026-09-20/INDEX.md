# Site survey — 2026-09-20

> **EXPERIMENT.** Observations from a test run, not decisions. Nothing was fixed — the
> renderer, analysis and mapping were left exactly as found.
>
> **This folder is the BEFORE.** It was captured ahead of the bloom-system rulings
> (`docs/briefs/BLOOM-SYSTEM-RULINGS.md`). Do not re-run into it; the after-run gets its own folder.

64 deliberately varied real websites run through the live product (`localhost:5170`).

**Start with [`_contact-sheet.png`](_contact-sheet.png)** — all 56 trees on one image. Then:

- [`pairs/`](pairs/) — **each website beside its tree**, one PNG per site. Judge these first,
  before any metric. The website shot is the harness's own visit under the analyzer's
  conditions (1440×900, light mode, same user agent and settle), so it is close to — not
  identical to — the frame that was measured. Raw site shots are in `_site/`.
- `<domain>.png` — the product page as a person sees it: tree plus "Why this tree?".
- [`_failed/`](_failed/) — the error state for the 8 sites that could not be analysed.
- `results.json` — the API's full answer per site (fingerprint, DNA, timing).
- `matrix-candidates.json` — 41 further sites probed through the API (no screenshots) while
  hunting for the bloom test-matrix cases. See the last section.

```bash
node tools/capture.mjs <new-folder> --survey --with-site \
  --sites-file references/experiments/site-survey-2026-09-20/sites.txt
```

Re-running into a folder skips sites already captured, so it retries only failures.

## What to look at first

1. **The extremes work.** Bare (`info.cern.ch`, `danluu.com`), winter (`gwern.net`),
   autumn (`ikea.com`), night sky, and strong flower colour (`pinterest.com`,
   `raycast.com`, `theverge.com`, `irs.gov`) are all distinct at thumbnail size.
2. **The middle collapses, at scale.** 41 of 56 trees are normal-or-lush with no season;
   32 of those sit on the same pale sky. `amazon.com`, `anthropic.com`,
   `openstreetmap.org`, `yahoo.co.jp` and `docs.python.org` are hard to tell apart on the
   contact sheet. The sparse band collapses too: 10 sparse trees, near-identical.
3. **Background carries almost no information.** Every light site lands in a luminance
   band of 0.89–0.92 — white, cream and tinted grounds all look like one pale sky. All 11
   dark sites, from slate `#4a525a` to pure black, get one identical teal night sky, so
   "Scene colour · drawn from the page background" is not visibly true.
4. **Some trees are portraits of a loading screen.** `lusion.co` and `play.grafana.org`
   were measured before they rendered anything — [`pairs/lusion.co.png`](pairs/lusion.co.png)
   shows a black preloader beside a "winter" tree. WebGL and app-UI sites are most exposed.
5. **10 of 56 trees wear the identical fallback flowers** (`#e5e5d1` / `#9d9d66`). Five have
   no accent at all (`openai.com`, `bbc.com`, `pentagram.com`, `species-in-pieces.com`,
   `paulgraham.com`); five have a measured accent that falls under the chromatic-coverage
   floor and is discarded (`anthropic.com` `#c86e51`, `newyorker.com`, `aesop.com`,
   `drudgereport.com`, `example.com`). The four with no accent and medium-or-abundant flowers (`openai.com`,
   `species-in-pieces.com`, `bbc.com`, `pentagram.com`) are also told "colour is central to how this
   site looks" / "a clear accent colour" — copy that contradicts the measurement.
6. **Green accents vanish.** A green brand colour becomes green petals on green foliage:
   `duolingo.com` (the brightest brand here → one of the plainest trees),
   `teenage.engineering`, `nothing.tech`. The bloom test matrix has no case for this.
7. **Maximalism made of images reads as ordinary.** `arngren.net`, `cameronsworld.net`
   and `dolekemp96.org` — the loudest sites here — got "a few flowers" or none.
8. **Framing.** The island's base is clipped by the bottom of the stage in every capture
   (1100×1100 viewport), and the widest canopy (`arngren.net`) clips the stage's left edge.
9. **Non-Latin scripts** (`yahoo.co.jp`, `aljazeera.net`, `kantei.go.jp`) analysed without
   trouble and had no visible effect of their own — as intended.

## Tally

- **56 grew a tree, 8 could not be analysed** (64 attempted)
- Foliage: normal 27 · lush 17 · sparse 10 · bare 2
- Density: normal 24 · airy 20 · dense 12
- Flowers: medium 22 · few 15 · none 10 · abundant 9
- Season: flowering 31 · normal 22 · winter 2 · autumn 1
- Skeleton: normal 32 · simple 14 · rich 10
- Fruit: 6 · cat: 0

## Trees

| Site | Category | Foliage | Flowers | Season | Skeleton | Background | Time | Looked wrong? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [info.cern.ch](info.cern.ch.png) | continuity · raw HTML | bare / airy | none | normal | simple | #e5e5eb | 7.9s |  |
| [bettermotherfuckingwebsite.com](bettermotherfuckingwebsite.com.png) | continuity · deliberately minimal | sparse / airy | none | normal | normal | #e5e5eb | 17.0s |  |
| [stripe.com](stripe.com.png) | continuity · rich, animated | lush / normal | abundant #fcdfb0 #432fca | flowering | normal + fruit | #ebe9e5 | 21.0s |  |
| [github.com](github.com.png) | continuity · dark | lush / dense | abundant #1b20a0 #9d98d6 | flowering | rich | #15151e | 10.2s | Abundant flowers are blue-violet and nearly vanish against the night sky at thumbnail size |
| [en.wikipedia.org](en.wikipedia.org.png) | continuity · text-heavy | normal / normal | medium #9fb9e6 #30a369 | flowering | normal | #e5e7eb | 4.5s |  |
| [danluu.com](danluu.com.png) | raw/unstyled · personal blog | bare / airy | none | normal | normal | #e5e5eb | 6.9s | Near-twin of info.cern.ch — the two bare trees differ only by seed |
| [text.npr.org](text.npr.org.png) | raw/unstyled · news | sparse / airy | none | normal | simple | #e5e5eb | 3.8s |  |
| [example.com](example.com.png) | raw/unstyled · microsite | sparse / airy | few #e5e5d1 #9d9d66 | normal | simple | #e3e4ea | 2.2s | Has a measured accent (#9ea5c2) but chromatic coverage is under the floor, so it gets the shared ivory fallback flowers — see note 5 |
| [paulgraham.com](paulgraham.com.png) | minimal · very old web | sparse / airy | few #e5e5d1 #9d9d66 | normal | simple | #e8e8e8 | 6.5s | No accent of its own; carries the shared ivory fallback flowers — see note 5 |
| [gwern.net](gwern.net.png) | minimal · text-heavy, designed | normal / airy | none | winter | normal | #e6e6e6 | 12.1s |  |
| [daringfireball.net](daringfireball.net.png) | minimal · dark slate blog | normal / airy | few #6a6ae9 #32356e | normal | normal | #2d3237 | 13.4s | Slate ground (#4a525a) gets the same teal night sky as pure-black sites |
| [raycast.com](raycast.com.png) | dark · very new web | lush / normal | abundant #c7273a #e8b9c8 | flowering | normal + fruit | #171e21 | 17.7s |  |
| [netflix.com](netflix.com.png) | dark · image-led | normal / dense | medium #3a448f #e6959a | flowering | normal | #15161e | 17.7s | Geo-redirected — measured the India page (/in/) |
| [brittanychiang.com](brittanychiang.com.png) | dark · portfolio | normal / airy | medium #3b5591 #a0c8df | flowering | normal | #1c2028 | 22.2s |  |
| [nothing.tech](nothing.tech.png) | monochrome · dark | normal / dense | medium #d1e5db #669d82 | flowering | rich | #e4ece8 | 15.1s | Flowers are a pale mint fallback (#d1e5db) tinted from the ground colour, not an accent — and pale green petals on green foliage barely read |
| [teenage.engineering](teenage.engineering.png) | monochrome · light, product | normal / dense | few #25a769 #98e7c1 | normal | normal | #161e1a | 8.6s | Measured a black ground (#010101), imageArea 1.0 — a full-bleed dark hero; most people would call this site light. Unverified. Petals are green (#25a769) on green foliage |
| [arngren.net](arngren.net.png) | maximalist · e-commerce chaos | normal / dense | few #e3e38b #302d8f | normal | rich | #ebebe5 | 11.7s | **Canopy clips the left edge of the stage.** The web's most chaotic shop is described as 'conventionally developed… one restrained accent colour' |
| [cameronsworld.net](cameronsworld.net.png) | maximalist · geocities collage, animated | normal / dense | few #510699 #de73b4 | normal | rich | #1a151e | 6.7s | GeoCities GIF collage reads as 'normal', 'a few flowers'. Maximalism made of images does not register |
| [lusion.co](lusion.co.png) | webgl · studio | normal / airy | none | winter | simple | #1a1a1a | 11.1s | **Tree of a loading screen.** Measured the black preloader (ink 0.012, canvas 1.0) → Winter, 'a light, uncomplicated page' |
| [earth.nullschool.net](earth.nullschool.net.png) | webgl/canvas · full-frame visualisation | normal / normal | few #2856a4 #98a4e7 | normal | normal | #16161f | 6.4s | Full-frame canvas globe, generic tree. canvasArea 1.0 has no visible effect |
| [pinterest.com](pinterest.com.png) | image-led · grid | normal / airy | medium #e91d3c | flowering | simple | #ecece4 | 12.1s |  |
| [pentagram.com](pentagram.com.png) | image-led · portfolio | normal / dense | medium #e5e5d1 #9d9d66 | flowering | rich | #e8e8e8 | 9.0s | Flower copy contradicts measurement — see note 5 (designColorfulness 0.003, fallback beige flowers) |
| [news.ycombinator.com](news.ycombinator.com.png) | text-heavy · app-ish | sparse / airy | few #f37b2b | normal | normal | #ebebe2 | 5.6s |  |
| [plato.stanford.edu](plato.stanford.edu.png) | text-heavy · institutional | normal / normal | medium #c06765 | flowering | normal | #ebe5e5 | 9.5s |  |
| [arxiv.org](arxiv.org.png) | giant archive · old institutional | normal / normal | few #a1a1f8 #4570a1 | normal | normal | #e5e5eb | 4.0s |  |
| [newyorker.com](newyorker.com.png) | editorial | normal / normal | medium #e5e5d1 #9d9d66 | flowering | normal | #e5e9eb | 10.5s | Has a measured accent (#56a2d0) but chromatic coverage is under the floor, so it gets the shared ivory fallback flowers — see note 5 |
| [pudding.cool](pudding.cool.png) | editorial · illustration-led | normal / normal | medium #f1b24c #1c6672 | flowering | normal | #ebe9e5 | 6.4s |  |
| [theverge.com](theverge.com.png) | editorial · dark, loud | lush / normal | abundant #3bf5c8 #371b74 | flowering | normal | #e5ebea | 14.8s |  |
| [bbc.com](bbc.com.png) | news | normal / normal | medium #e5e5d1 #9d9d66 | flowering | normal | #e8e8e8 | 14.7s | Flower copy contradicts measurement — see note 5 (designColorfulness 0.005, fallback beige flowers) |
| [drudgereport.com](drudgereport.com.png) | news · very old web | sparse / normal | few #e5e5d1 #9d9d66 | normal | normal | #ebe5e5 | 13.0s | Has a measured accent (#f48a8a) but chromatic coverage is under the floor, so it gets the shared ivory fallback flowers — see note 5 |
| [developer.mozilla.org](developer.mozilla.org.png) | docs · modern | lush / normal | medium #6f0fbd #da99e6 | flowering | rich | #e8e5eb | 3.4s |  |
| [docs.python.org](docs.python.org.png) | docs · classic | normal / normal | few #8abed7 #8d7821 | normal | normal | #e5e9eb | 2.1s |  |
| [play.grafana.org](play.grafana.org.png) | dashboard · dark | sparse / airy | none | normal | simple | #1d2126 | 5.1s | **Tree of an empty shell.** Measured before the dashboard rendered (ink 0.001, text 0) → sparse/airy. Arguably should have been EMPTY_PAGE |
| [excalidraw.com](excalidraw.com.png) | app UI · canvas | normal / airy | few #8d88d6 #432f7d | normal | simple | #e5e5eb | 4.7s |  |
| [openstreetmap.org](openstreetmap.org.png) | app UI · map | normal / dense | medium #aad3df #608d49 | flowering | rich | #dde5e7 | 7.5s |  |
| [amazon.com](amazon.com.png) | e-commerce · dense | lush / dense | medium #f7d945 #2b4864 | flowering | rich | #ebeae5 | 13.0s |  |
| [ikea.com](ikea.com.png) | e-commerce · image-led | normal / dense | few #f5d30a | autumn | rich | #ece9e4 | 7.4s | **First real site to trigger Autumn** (STATUS.md says none does). Driven by brand yellow #feda01, not photographs. Grass turns ochre too. The most distinctive tree in the set — needs a human eye |
| [aesop.com](aesop.com.png) | e-commerce · restrained | lush / normal | medium #e5e5d1 #9d9d66 | flowering | normal | #ecebe3 | 5.0s | Has a measured accent (#c8ac8b) but chromatic coverage is under the floor, so it gets the shared ivory fallback flowers — see note 5 |
| [irs.gov](irs.gov.png) | government | lush / airy | medium #1671b6 #98bce7 | flowering | simple | #e4e8eb | 8.0s |  |
| [india.gov.in](india.gov.in.png) | government | lush / dense | medium #261ab2 #e7989e | flowering | rich | #e5e5ea | 7.3s |  |
| [mit.edu](mit.edu.png) | institutional | lush / normal | medium #ad1f35 #e798a4 | flowering | normal + fruit | #ebe5e6 | 5.0s |  |
| [maggieappleton.com](maggieappleton.com.png) | personal blog · illustration-led | lush / airy | medium #74cad4 #623450 | flowering | simple | #ebeae3 | 2.4s |  |
| [joshwcomeau.com](joshwcomeau.com.png) | personal blog · playful, animated | normal / normal | medium #a2d5ef #b42a66 | flowering | normal + fruit | #e5e9eb | 4.1s |  |
| [rauno.me](rauno.me.png) | portfolio · very new web | normal / normal | few #f5f50a | normal | simple | #eaeae3 | 3.0s |  |
| [duolingo.com](duolingo.com.png) | illustration-led · bright | normal / airy | few #72d42a #c0e1f0 | normal | simple | #e8ebe5 | 21.5s | **Green on green.** Brightest brand in the survey, but its accent #72d42a becomes green petals on green foliage → one of the plainest trees. Slowest success (21.5s) |
| [mailchimp.com](mailchimp.com.png) | illustration-led · yellow | lush / normal | abundant #cdb523 #bce7e6 | flowering | normal | #ebeae5 | 7.6s |  |
| [species-in-pieces.com](species-in-pieces.com.png) | animation-heavy · microsite | lush / normal | abundant #e5e5d1 #9d9d66 | flowering | normal | #212122 | 10.8s | Flower copy contradicts measurement — see note 5 (designColorfulness 0.013, fallback beige flowers) |
| [berkshirehathaway.com](berkshirehathaway.com.png) | very old web · near-unstyled | sparse / airy | none | normal | normal | #ebe5eb | 3.6s | Near-unstyled HTML (authored 0.3) but sparse, not bare — indistinguishable from the designed-minimal sites |
| [dolekemp96.org](dolekemp96.org.png) | very old web · 1996 | sparse / airy | none | normal | simple | #e5e5eb | 4.0s | Red-white-and-blue 1996 campaign site → 'No flowers, no meaningful colour accent'. Its colour lives in images |
| [anthropic.com](anthropic.com.png) | very new web · warm, restrained | lush / dense | medium #e5e5d1 #9d9d66 | flowering | normal | #ebe9e2 | 16.9s | Has a measured accent (#c86e51) but chromatic coverage is under the floor, so it gets the shared ivory fallback flowers — see note 5 |
| [openai.com](openai.com.png) | very new web · likely bot-blocked | lush / normal | abundant #e5e5d1 #9d9d66 | flowering | normal | #e8e8e8 | 10.5s | **Copy contradicts measurement.** 'Heavily flowering — colour is central to how this site looks', yet designColorfulness = 0 and the palette has no primary. Not a bot-wall: a real page was measured |
| [yahoo.co.jp](yahoo.co.jp.png) | non-Latin · Japanese, dense portal | normal / normal | medium #a1afd9 #2a4b9e | flowering | normal | #e5e6eb | 11.2s |  |
| [aljazeera.net](aljazeera.net.png) | non-Latin · Arabic, RTL news | lush / normal | abundant #3e329a #e798a4 | flowering | normal | #e6e5eb | 10.3s |  |
| [kantei.go.jp](kantei.go.jp.png) | non-Latin · Japanese government | lush / normal | abundant #bcd1fb #5d64a8 | flowering | normal + fruit | #e4e4ec | 12.2s |  |
| [isitchristmas.com](isitchristmas.com.png) | microsite | sparse / airy | none | normal | simple | #e8e8e8 | 6.3s |  |
| [zombo.com](zombo.com.png) | microsite · very old web | normal / normal | medium #3758a3 #a3b4e9 | flowering | normal + fruit | #e5e7eb | 5.6s |  |

## Could not be analysed

Each was tried twice. Screenshots of the error state are in `_failed/`.

| Site | Category | Code | Message shown to the user | Note |
| --- | --- | --- | --- | --- |
| [lingscars.com](_failed/lingscars.com.png) | continuity · maximalist | BLOCKED | That website blocked us from looking at it. | **In the corpus, measured fine there.** New bot-blocking, or a regression |
| [store.steampowered.com](_failed/store.steampowered.com.png) | dark · e-commerce | TIMEOUT | That website took too long to load. | Machine was loaded; may pass on a quiet one |
| [shadertoy.com](_failed/shadertoy.com.png) | webgl · dark gallery | BLOCKED | That website blocked us from looking at it. | Expected — sits behind a bot challenge |
| [magnumphotos.com](_failed/magnumphotos.com.png) | photography | TIMEOUT | That website took too long to load. | Machine was loaded; may pass on a quiet one |
| [archive.org](_failed/archive.org.png) | giant archive | EMPTY_PAGE | There was nothing on that page to look at. | Probably a false rejection, not blocking: the homepage is rendered client-side by web components |
| [nytimes.com](_failed/nytimes.com.png) | news | BLOCKED | That website blocked us from looking at it. | Expected — blocks automated browsers |
| [spacejam.com/1996](_failed/spacejam.com-1996.png) | very old web · 1996 (corpus) | TIMEOUT | That website took too long to load. | **In the corpus, measured fine there.** Only URL with a path in this survey |
| [baidu.com](_failed/baidu.com.png) | non-Latin · Chinese, minimal | TIMEOUT | That website took too long to load. | Likely latency from this network rather than blocking |

## Bloom test matrix — can each case exist? (94 sites measured)

Asked by Lead for `BLOOM-SYSTEM-RULINGS.md` §16. Survey (56) plus 38 probed candidates
(`matrix-candidates.json`). Read from the rules in `analysis/lib/mapping.js` as they stood
on 2026-09-20, before rulings L9/L10 — nothing there was edited.

| Case | Verdict | Real sites |
| --- | --- | --- |
| **B** deep maroon | **Sampling gap — real sites exist.** But the DNA never carries the darkness: `PETAL_FLOOR = 0.40` lifts every dark accent to lightness 0.40. | `tamu.edu` `#5c1111`→petal `#ac2020` · `umn.edu` `#7d051d`→`#c4082e` (abundant) · `vt.edu` `#892546`→`#a12b52` (burgundy) · `stanford.edu` `#891414`→`#b21a1a` |
| **I** fruit only | **Impossible by construction today.** Fruit requires foliage normal/lush ⇒ richness ≥ 0.30 ⇒ at least FEW flowers; the only states that zero flowers (winter, bare) are both barred from fruit. After L10 it is reachable only by a sparse tree with richness < 0.20 *and* a concentrated accent — **0 of 94**: all nine sites under 0.20 have concentration exactly 0. | none. Nearest: `openbsd.org` (richness 0.212, conc 0.923) · `sqlite.org` (0.237, 0.644) · `debian.org` (0.298, 0.826) — each will be sparse + FEW flowers + fruit |
| **L** winter + fruit | **Impossible today; near-impossible after L10.** Winter needs design colourfulness < 0.06; fruit needs an accent region ≥ 1% of the frame. Colourfulness here is Hasler–Süsstrunk ÷ 110, so a vivid accent must stay under ~0.15% of the frame to keep a page winter — the two exclude each other. Only a *muted* accent covering ~1–4% fits both. **All 7 winter sites measured have concentration 0**, including `rsms.me`, whose accent is vivid orange. | none. Every L would also be an I (winter emits no flowers) |
| **K** winter, no fruit | Exists. Four have an accent for L8's buds; three have **no accent at all** — L8 gives their buds no colour source. | accent: `rsms.me` `#ff6425` · `are.na` `#222874` · `craigslist.org` `#a2a2ee` · `stephango.com` `#f1d5ba` — none: `gwern.net`, `vercel.com` (`lusion.co` is a false winter) |
| **E** achromatic, rich | Exists, including the named case: **`linear.app` now analyses on the live path** (STATUS.md says it times out) → lush, abundant, fallback petal `#d1dbe5`. | `linear.app` · `openai.com` · `species-in-pieces.com` · `harvard.edu` (crimson not detected; petal `#d1d1e5`) |
| *(missing)* green accent | Not in the matrix. Petal hue collides with foliage. | `duolingo.com` `#72d42a` · `textfiles.com` `#004e00`→`#08b708` · `teenage.engineering` |

**Predicted fruit after L9 + L10, measurements held fixed:** 6 → **12** with the coin-flip
removed (gains `github.com`, `cameronsworld.net`, `developer.mozilla.org`, `ikea.com`,
`irs.gov`, `rauno.me`), → **13** with eligibility widened (`news.ycombinator.com`, sparse).
Winter-with-fruit stays at **0**. `earth.nullschool.net` stays excluded by the canvas rule.
In every fruiting tree today, fruit colour is identical to petal colour
(`fruit.color = flowers.petal`), which L11's "fruit stays visually distinct" will run into.
