# STATUS.md

> **Agent handoff document.** Describes the *present* state of the project.
>
> Keep it short — under a minute to read. Replace stale lines rather than appending.
> This is not a changelog; git history is the changelog. See
> [AGENTS.md](../AGENTS.md) R9.

---

## Phase

**Website-analysis research.** Testing whether a useful visual fingerprint can be
extracted from arbitrary sites, before committing to any website → tree rules.

The 3D domain is deliberately idle during this phase.

---

## Working

- Repository infrastructure, docs, and the Lead + specialist operating model
- **Tree prototype** (`prototype/`) — one hand-authored tree, two visual passes done,
  build stable. Marked **EXPERIMENT**. Run: `cd prototype && python3 -m http.server 5188`

---

## In progress

- **Website analysis research** — probe under `analysis/` (untracked so far),
  testing hypotheses A–N against a diverse corpus. Checkpoint due after ~5
  extreme-spanning sites, before the full corpus.

---

## Not started

- Tree generator (the prototype is hand-authored; two seeds produce near-identical trees)
- Frontend / product UI
- Integration

---

## Current questions

Waiting on human decisions. Several are taste judgments an agent cannot settle (R7).

1. **Does the prototype tree look right?** This gates everything — the generator, and
   therefore the product. Three specific taste calls are open from the second pass:
   is the looser crown better or now too airy; does the ground contact read as
   occlusion or as a smudge; is the windswept character of the edge sprigs wanted?
2. Which website properties should affect the tree? (Research in progress.)
3. How should website colour map into the tree? (D5 — flowers as carrier is TENTATIVE.)
4. Is the island the right base? Also decides the teardown boundary when trees are
   replaced.
5. Should wind sway and drifting petals stay? Motion is still OPEN.
6. Bundle vs CDN for three.js — the prototype deliberately avoided committing.

---

## Known, recorded, not yet acted on

- Blossoms read as a horizontal band across the crown rather than distributing
  through it. Observation only, not a verdict.
- No `dispose()` anywhere in the prototype; several materials and geometries are
  shared between meshes, so naive teardown would double-free.
- `applySway` bakes options into GLSL as literals and builds its program-cache key by
  bare concatenation — a fresh shader compile per differently-sized tree, and a
  silent collision risk once sway varies.
- `main.js` runs at import time and exports nothing, so a frontend cannot drive it.
- The build must report its own extents; camera framing constants are tuned to this
  one tree.

---

## Next

**Human visual review of the tree** (question 1), and the analysis checkpoint.

The generator must not start until question 1 is answered — what varies is only
meaningful once we agree what is being varied.
