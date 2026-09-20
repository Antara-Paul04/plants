# Reliability sweep — 2026-09-20

> **EXPERIMENT.** Observations from a test run, not decisions. Nothing in the renderer,
> analysis or mapping was changed. Full numbers: [`analysis.txt`](analysis.txt), [`results.json`](results.json).

79 real websites through the live product — weighted towards what an ordinary person types —
to find what passes, what fails, and **why**.

## What was measured, exactly

- **The analyzer build the server loaded at 21:32:15**: `NAV_MS = 8000`, navigation waits for
  `domcontentloaded`. Every timeout string says so. `analysis/lib/analyze.js` was edited on disk
  at 22:44 (commit-based navigation, `NAV_MS = 15000`) but the server was not restarted, so that
  edit is **not** in these results. This sweep is the BEFORE for it.
- **On a quiet machine, and provably so.** Every attempt waited for whole-machine CPU < 50% and
  recorded CPU before and during. Failed attempts started at median 0.43 busy; successful ones
  at 0.43. CPU does not explain these failures.
- **Two passes.** Pass 1: product only (analysis + tree). Pass 2: a plain browser visit under the
  analyzer's exact conditions, recording each loading stage, page weight, and a screenshot.
- Two attempts per site; both are logged in `attemptLog`.

Three earlier attempts were thrown out and **kept as evidence**, because the way they failed is
itself the main finding:

| Folder / file | What went wrong |
| --- | --- |
| `_run1-machine-overloaded/` | Load average 29. The 6 KB `news.ycombinator.com` timed out twice; minutes later it analysed in 3.9 s. |
| `_run2-harness-contended/` | My own harness (tree build, PNG encoding) was competing with the analyzer. `arxiv.org` failed 2/2. |
| `_our-internet-dropped.json` | This machine lost internet for ~2 min: 14 consecutive sites failed in 2 s with `ERR_INTERNET_DISCONNECTED`. Re-run. |
| `concurrency-test.log` | The four chips requested at once: 1, 2, 4 → all pass (analysis time doubles at 4). **8 at once → 3 of 8 fail.** |

## Headline

**47 of 79 grew a tree (59%). 32 failed (41%).** 9 of the 47 needed the second attempt.

| Group | Grew | |
| --- | --- | --- |
| Example chips | 4/4 | `arxiv.org` needed its second attempt |
| What people type | **25/46** | video 0/3 · e-commerce 0/4 · news 1/3 · search 2/3 · social 4/6 · brands 10/11 |
| Design-led | 7/10 | `github.com`, `theverge.com`, `awwwards.com` fail |
| Designed, light | 4/4 | `daringfireball.net`, `kottke.org`, `simonwillison.net`, `jvns.ca` |
| Docs · government · institutional | 6/10 | |

Time on screen (tree build included): **median 14.0 s**, p90 18.8 s, max 26.5 s. Analysis alone
9.2 s; the tree build adds a median 4.8 s. 14 of 47 took over 15 s. The product's own "grown in"
stamp is honest (within 0.6 s of the harness). A failure arrives in a median 8.5 s.

## Why things fail

| Code | Sites | What it really is |
| --- | --- | --- |
| `TIMEOUT` | 27 | `page.goto: Timeout 8000ms exceeded`, every time |
| `BLOCKED` | 3 | HTTP 403 — `stackoverflow.com`, `nytimes.com`, `lingscars.com` |
| `UNREACHABLE` | 1 | `reddit.com` — fails in ~5 s with **no detail recorded**. Reddit is up; this is a refusal, mislabelled |
| `EMPTY_PAGE` | 1 | `archive.org` — client-rendered; looks like a false rejection |
| `INTERNAL` | 2 attempts | `amazon.com`, `tesla.com`: *"Execution context was destroyed, most likely because of a navigation"* — the page redirected itself mid-measurement and the analyzer crashed |

### It is not DOM weight, and it is not design richness. It is the script tail.

| Plain visit, median | Grew a tree | Timed out |
| --- | --- | --- |
| First byte | 576 ms | **576 ms** |
| HTML complete | 1.0 s | 0.9 s |
| First contentful paint | 1.5 s | 2.5 s |
| domInteractive (parsed) | 1.7 s | 4.2 s |
| **DOM-ready** | **2.3 s** | **12.4 s** |
| DOM nodes | 954 | 1,111 |
| Scripts | 17 | **49** |
| Transfer | 526 KB | 1,193 KB |

Servers answer equally fast and the documents are the same size. What differs is how long the
page takes to reach DOM-ready, and that tracks **script weight loaded before DOM-ready**
(ρ = 0.56) far better than DOM nodes (ρ = 0.30). `linear.app` (5,160 nodes), `theguardian.com`
(4,899) and `stripe.com` pass; `duckduckgo.com` (343 nodes) and `x.com` (212) do not.

**Of the 26 timed-out sites with stage data, 20 had painted content within 8 s and 22 had
complete HTML — only 8 had reached DOM-ready.** The page was there to be photographed; the
analyzer was waiting for its JavaScript to finish. Per-site stages are in `analysis.txt`.

Caveat, stated plainly: a plain visit is one sample, and the script tail varies wildly visit to
visit (`github.com`: 5.3 s, 12 s, >30 s in `chips-dom-ready-probe.json`). Eight sites timed out in
the analyzer yet reached DOM-ready in under 8 s in my visit an hour later; that is this variance,
not proof of analyzer overhead.

## Trees that grew and are wrong — the most serious finding

| Site | Tree | What was actually measured |
| --- | --- | --- |
| **`tesla.com`** | bare | Akamai **"Access Denied"** page — see [`pairs/tesla.com.png`](pairs/tesla.com.png) |
| **`adidas.com`** | bare | a 34-node block page |
| **`dribbble.com`** | bare | same fingerprint as the two above (richness 0.056, authored 0.1) |
| `imdb.com` | normal | ink 0.016 — a near-empty page |
| `tiktok.com` | winter | ink 0 — a blank frame, after a redirect to `/about` |
| `disney.com` | normal | geo-redirected (`disney.in` from this network) |

The first three are told *"this site is essentially unstyled HTML, so its tree shows its
skeleton."* STATUS.md says no tree is ever grown from a block page. These got through because the
block arrives as a redirect after the first response, which is also what crashes the analyzer
with `INTERNAL` on the first attempt. **A confident wrong answer is worse than a failure.**

## The example chips

All four grew. Margin to the 8 s limit, plain visits on a quiet machine:
`arxiv.org` 0.4–1.3 s · `news.ycombinator.com` 1.2–1.6 s · `info.cern.ch` 0.7–2.1 s ·
**`gwern.net` 2.6–5.7 s** — the chip nearest the cliff, and the first to fail under concurrency.
`arxiv.org` still needed a second attempt in the clean run.

## User-reported: `heisenbergg.com`

Failed for the human while run 2 was loading the machine. Afterwards: **5 of 5 succeeded, first
attempt each** (analysis 5.2–8.1 s, on screen 10.7–14.5 s). Its cold visit took 7.1 s to reach
DOM-ready during the sweep and 4.8 s after it — a small site (382 nodes, 294 KB) that sits close
enough to the limit that any contention tips it over. Runs in `_user-reported-heisenbergg.com/`.

## Files

`pairs/` website beside tree (47) · `<domain>.png` product page · `_site/` raw site shots ·
`_failed/` error states · `results.json` everything per site, including `attemptLog`,
`e2eMs`, `siteMetrics.stages` · `sites.txt` the input list.

```bash
# pass 1 — product only, on a quiet machine
node tools/capture.mjs <dir> --survey --quiet --keep-failures --sites-file <dir>/sites.txt
# pass 2 — weigh each site, record loading stages, compose pairs
node tools/capture.mjs <dir> --survey --quiet --with-site --keep-failures --sites-file <dir>/sites.txt
```
