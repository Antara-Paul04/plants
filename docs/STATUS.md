# STATUS.md

> **Agent handoff document.** Describes the *present* state of the project.
>
> Keep it short — under a minute to read. Replace stale lines rather than appending.
> This is not a changelog; git history is the changelog. See
> [AGENTS.md](../AGENTS.md) R9.

---

## Phase

**Art-direction prototyping.** One hand-built tree exists to test the look. The
product specification is still unfinished, and no product code has been written.

---

## Working

- Repository infrastructure — docs, agent operating manual, reference directories
- **Tree prototype** (`prototype/`) — one hand-authored tree on a small island,
  running in the browser. Marked **EXPERIMENT**; awaiting human visual review.
  Run it: `cd prototype && python3 -m http.server 5188`

---

## In progress

- Product specification
- Visual mapping exploration

---

## Not started

- Frontend
- Website analysis
- Tree generator (the prototype is hand-authored, not procedural)
- Integration

---

## Current questions

Open and waiting on human decisions. Several are taste judgments and cannot be
resolved by an agent alone (AGENTS.md R7).

1. **Does the prototype tree look right?** Is this the visual direction, or a
   starting point to push? Nothing in it is approved.
2. Which properties of a website should affect the tree?
3. How should website colour map into the tree? (DECISIONS D5 — flowers as the
   carrier is still TENTATIVE and untested.)
4. How should minimal websites differ from expressive ones?
5. Is the island the right base? The prototype assumes one; that was never decided.
6. What 3D implementation approach should we commit to? The prototype's three.js
   setup was chosen to be disposable.
7. Should wind sway and drifting petals stay? Motion is still OPEN.

---

## Next

**Human visual review of the prototype**, then finish the V0 creative specification.

The generator should not be started until question 1 is answered — what varies is
only meaningful once we agree on what is being varied.
