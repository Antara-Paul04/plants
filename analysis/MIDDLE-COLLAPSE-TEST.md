# Pre-registered test: real spread, or a shuffle?

> Written **before** the sweep lands, deliberately. The point of pre-registering is that
> a criterion chosen after seeing data can always be made to pass.

---

## The trap this is written to avoid

**The corpus changed underneath the comparison.** Roughly a third of sites that previously
timed out may now be measurable. So "the middle was 41 of 56" and "the middle is now X of
56" are **not measurements of the same population**, and comparing them directly would
repeat the rank-confounding error I made earlier in this project — where a corpus that
happened to be ordered by complexity made every signal look like a disguised size metric
until dissociation pairs were added.

A marginal count cannot tell differentiation from composition change.

---

## Split before measuring anything

| set | definition | what it can answer |
| --- | --- | --- |
| **A — paired** | succeeded before AND after | **the only set that can answer "did the mapping differentiate more"** |
| **B — new entrants** | failed before, succeed now | describe only. Changes the marginal count with no differentiation having occurred |
| **C — regressions** | succeeded before, fail now | each one needs a justification: a bot wall correctly caught is a win, anything else is a bug |

Headline numbers get quoted for A. B and C get reported separately and never folded in.

---

## Four tests that separate a real spread from a shuffle

### 1. Attribution — the decisive one

For every site in **A** that changed band, there must be a **fingerprint value that crossed
a named threshold**. A tree that changed state while none of its inputs crossed a boundary
did not differentiate; it moved because the measurement is unstable.

- **Real spread:** ≥90% of band changes attributable to a specific crossing.
- **Shuffle:** a meaningful share of changes with no crossing behind them.

### 2. Distinct outcomes, not band counts

Count distinct DNA tuples `(foliage.state, density, botanicalState, flowers.amount,
skeleton.complexity)` across A, and their normalised entropy.

- **Real spread:** distinct tuples rise; entropy rises.
- **Shuffle:** the same number of tuples, relabelled. The middle can shrink while the
  number of genuinely different trees stays flat — that is the failure this catches.

### 3. Repeatability — the lesson already paid for

Re-measure ~10 sites from A **twice**. Same site, same code, different run.

- **Real spread:** every site lands in the same bands both times.
- **Shuffle:** bands flip between runs.

This is non-negotiable and it is the specific error I made three times tonight: within-run
stability is not across-run stability, and a one-shot test would clear a metric that
breaks in the wild. Motion died on exactly this.

### 4. The crux, which is a gate rather than a metric

`info.cern.ch` **bare**, `bettermotherfuckingwebsite.com` **sparse**.
If these collapse together, nothing else in the distribution matters.

---

## Predictions, stated now, each falsifiable

From the four changes that went live together:

| change | prediction | what falsifies it |
| --- | --- | --- |
| fruit is no longer a coin flip | fruit roughly doubles, and **every** fruited site has `accentConcentration ≥ 0.60` | fruit on any site below 0.60 |
| ikea no longer autumn | autumn count drops; **every** surviving autumn has `chromaticBins ≥ 2` | an autumn site with 1 bin |
| accents rank by chroma | `flowers.primary` changes **only** on sites with ≥2 chromatic bins | a 1-bin site whose primary changed |
| timeouts now measurable | new entrants land **across** bands, not piled in one | new entrants clustering in a single band — that is composition masquerading as spread |

---

## What I will not accept as evidence

- **"The middle shrank."** On its own this is compatible with sites leaving via *failure*
  (bot-wall rejections) rather than via differentiation. Rejections must be subtracted first.
- **A better-looking marginal distribution with unattributable movement.** That is a
  shuffle with a nicer shape.
- **Any improvement that costs the crux.**

---

## The honest null

If the middle still holds ~41 of 56 in set **A**, with movement attributable and stable,
then the four changes did what they were each designed to do and **the middle collapse is
not caused by any of them**. That is a real finding and it should be reported as one rather
than salvaged — it would mean the cause lies in the mapping's band structure, not in the
inputs, and that is a different investigation.
