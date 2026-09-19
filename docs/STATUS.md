# STATUS.md

> **Agent handoff document.** Describes the *present* state of the project.
>
> Keep it short — under a minute to read. Replace stale lines rather than appending.
> This is not a changelog; git history is the changelog. See
> [AGENTS.md](../AGENTS.md) R9.

---

## Phase

**Two things are built and both are waiting on human review.** Nothing is blocked on
an agent. The project cannot move until questions 1 and 2 below are answered.

---

## Working

- Repository infrastructure, docs, and the Lead + specialist operating model
- **Tree prototype** (`prototype/`) — one hand-authored tree, two visual passes, build
  stable. EXPERIMENT. `cd prototype && python3 -m http.server 5188`
- **Analysis probe** (`analysis/`) — Playwright research probe, 25-URL corpus, 23
  valid. EXPERIMENT. Findings in [WEBSITE-ANALYSIS.md](WEBSITE-ANALYSIS.md) and
  `analysis/FINDINGS.md`. Screenshots kept local, gitignored.

---

## Not started

- Tree generator (the prototype is hand-authored; two seeds give near-identical trees)
- Fingerprint → tree mapping (deliberately not designed yet)
- Frontend / product UI
- Integration

---

## Current questions

Waiting on human decisions. Most are taste or product calls an agent cannot settle (R7).

1. **Does the prototype tree look right?** Gates the generator and therefore the
   product. Three specific calls from the second pass: is the looser crown better or
   now too airy; does the ground contact read as occlusion or as a smudge; is the
   windswept character of the edge sprigs wanted?
2. **Is the proposed V1 fingerprint accepted?** Eight values, TENTATIVE:
   `authored`, `stylingRichness`, `inkCoverage`, `colorfulness`, `imageArea`,
   `textDensity`, `motion`, `palette{ground,primary,secondary}`.
3. **Motion is not repeatable** — 0.291 / 0.015 / 0.028 / 0.016 across four runs of
   the same URL. Same URL must give the same tree. Keep it, fix it, or cut it?
4. **`roundness` fails as defined.** Area-weighted sampling ranks visibly rounded
   sites at 0.02–0.07. Adopt the control-scoped method from the first probe, or cut.
5. **What does "verticality" mean?** Three reasonable definitions rank the same sites
   in three different orders. It cannot be measured until someone picks one.
6. **Sites with no accent colour exist** (paulgraham.com: zero chromatic hue bins).
   Bears directly on D5's flowers-as-carrier idea.
7. Is the island the right base? Also decides the teardown boundary between trees.
8. Should wind sway and drifting petals stay? Motion is still OPEN.
9. Bundle vs CDN for three.js.

---

## Known, recorded, not yet acted on

- Blossoms read as a horizontal band across the crown. Observation, not a verdict.
- No `dispose()` anywhere in the prototype; several materials and geometries are
  shared between meshes, so naive teardown would double-free.
- `applySway` bakes options into GLSL as literals and builds its program-cache key by
  bare concatenation — a fresh shader compile per differently-sized tree.
- `main.js` runs at import time and exports nothing, so a frontend cannot drive it.
- The build must report its own extents; camera framing is tuned to this one tree.
- Analysis must run **server-side**: cross-origin `fetch` and iframe access both fail,
  and `cssRules` throws on cross-origin stylesheets (zero CSS readable from Stripe).
- Analysis cost: median 7.8s, p90 14.8s, max 24.6s per site.

---

## Next

**Human review of the tree (Q1) and the fingerprint (Q2).**

The mapping from fingerprint to tree is deliberately undesigned — that is the next
piece of work, and it needs both answers first.
