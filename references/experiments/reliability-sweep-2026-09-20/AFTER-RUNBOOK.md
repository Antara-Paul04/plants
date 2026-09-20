# Runbook — the combined AFTER run

> Written 2026-09-20 by the test session so that **whoever is here** when analysis lands
> can run it. Agreed with Lead as the plan of record. EXPERIMENT tooling, not product code.

## When to run

Only after **all three** analysis changes are live on a **restarted** `:5170`:

1. navigation no longer waits for `domcontentloaded`
2. the bot-wall gate
3. rulings L9 + L10 (fruit: no coin-flip; winter and sparse may fruit)

Node loads `analysis/lib` once, so an edit on disk is **not live** until the server restarts.
Check rather than assume: `ps -Ao lstart,args | grep app/server.js` against the files' mtimes.
Lead restarts the server and says so. Nobody else does.

## Before starting

- **Nothing else may touch `:5170`** for the ~90 minutes this takes. Two sessions testing at
  once collide inside the analyzer; eight simultaneous requests fail 3 of the 4 lightest
  sites on the web (`concurrency-test.log`).
- Close any Browser-pane tab showing a tree — it keeps rendering and loads the machine.
- `--quiet` is not optional. Without it a timeout measures this laptop, not the site.

## Run

```bash
cd /Users/antarapaul/Desktop/plants
R=references/experiments
A79=$R/reliability-sweep-AFTER-<date>     # new folders — never re-run into a BEFORE
A64=$R/site-survey-AFTER-<date>

# pass 1: product only, quiet machine
node tools/capture.mjs $A79 --survey --quiet --keep-failures --sites-file $R/reliability-sweep-2026-09-20/sites.txt
node tools/capture.mjs $A64 --survey --quiet --keep-failures --sites-file $R/site-survey-2026-09-20/sites.txt
# pass 2: weigh each site, record loading stages, compose website-beside-tree pairs
node tools/capture.mjs $A79 --survey --quiet --with-site --keep-failures --sites-file $R/reliability-sweep-2026-09-20/sites.txt
node tools/capture.mjs $A64 --survey --quiet --with-site --keep-failures --sites-file $R/site-survey-2026-09-20/sites.txt
```

An interrupted run resumes: re-issue the same command. Read the failure **detail strings**
before believing a failure — `ERR_INTERNET_DISCONNECTED` is this machine, not the site (the
harness now waits those out, but check).

## Read the answers

```bash
node tools/sweep-analyse.mjs  $A79 $R/site-survey-2026-09-20/results.json            > $A79/analysis.txt
node tools/survey-compare.mjs $R/reliability-sweep-2026-09-20 $A79 --sheet $A79/_before-after.png > $A79/compare.txt
node tools/survey-compare.mjs $R/site-survey-2026-09-20       $A64 --sheet $A64/_before-after.png > $A64/compare.txt
```

## What the AFTER has to answer

| Question | BEFORE | Expectation | Where to read it |
| --- | --- | --- | --- |
| Pass rate, 79 sites | 47/79 | up | `compare.txt` PASS RATE |
| Sites with painted content inside the budget | 20 of 26 timed-out sites had it | most of those now grow | `analysis.txt` LOADING STAGES |
| Fruit prevalence, 56 sites | 6/56 | **12** with L9, **13** with L10 (`news.ycombinator.com`) | `compare.txt` FRUIT |
| Winter **with** fruit | 0 | **stays 0** — winter's colourfulness ceiling and fruit's 1%-of-frame floor exclude each other. Non-zero would be the surprise | `compare.txt` FRUIT |
| `tesla.com`, `adidas.com`, `dribbble.com` | grew BARE from a block page | **fail honestly** | `compare.txt` ACCEPTANCE |
| `info.cern.ch`, `danluu.com` | bare | **still grow bare** — the other half of the same test; neither half is optional | `compare.txt` ACCEPTANCE |
| `lusion.co`, `play.grafana.org` | measured as preloaders (ink 0.012 / 0.001) | ink well above 0. An earlier navigation event makes this **worse** unless the settle stage detects visual stability | `compare.txt` ACCEPTANCE |
| Any new cluster of identical fingerprints | `adidas`/`dribbble`/`tesla` | none | `compare.txt` IDENTICAL FINGERPRINTS |

The two BEFORE folders were captured differently: the 64-site survey ran in the afternoon on the
old tree renderer and without `--quiet`; the 79-site sweep ran at night on the new renderer with
it. DNA is comparable across both (10 shared sites produced identical DNA hours apart); **timings
and pass rates are only comparable against the 79-site sweep.**
