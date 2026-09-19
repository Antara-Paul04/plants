# DECISIONS.md

A lightweight log of meaningful decisions and the reasoning behind them.

**What belongs here:** decisions that shape the product, the creative direction, or the
architecture — anything a future agent could otherwise undo by accident.

**What does not belong here:** implementation trivia. Variable names, file layout,
default numbers nobody argued about. See [AGENTS.md](../AGENTS.md) R10.

Do not edit or delete past entries. To reverse a decision, add a new entry that
supersedes it and note which one it replaces.

---

## D1 — The project is website → 3D tree

**Status:** DECIDED

A user enters a website URL and receives a stylized 3D tree derived from that site.

**Reasoning.** This is the premise of the experiment. Everything else is negotiable.

---

## D2 — V0 is intentionally small

**Status:** DECIDED

One page, one URL input, one tree, the ability to try another. Nothing else.

**Reasoning.** Small creative internet experiments succeed by being finished and
charming, not by being complete. A tight V0 keeps the interesting problem — the
mapping from visual design to botanical design — at the centre, instead of spending
the project's energy on accounts, galleries and mechanics.

See [PRODUCT.md](PRODUCT.md) for the full in/out-of-scope list.

---

## D3 — The tree represents visual design, not subject matter

**Status:** DECIDED

We translate a website's *visual design* into botanical design. We do not translate its
*content or topic* into literal objects: a photography site does not grow cameras, a
restaurant does not grow food, a developer's site does not grow laptops.

**Reasoning.** Content-to-object mapping is the obvious version of this idea and a much
weaker one — it produces novelty clip-art rather than a tree with a personality. The
interesting claim is that a website has a visual character, and that character can be
expressed botanically. This decision is load-bearing; treat proposals that drift toward
reading site topic as a conflict to surface.

---

## D4 — No growth or gardening mechanics in V0

**Status:** DECIDED

No growth animation, no watering or tending, no returning to a garden over time, no
decay, no persistence of trees between sessions.

**Reasoning.** Gardening mechanics are a different product with a different shape — they
need accounts, persistence and a reason to return, all of which contradict D2. The
appeal of V0 is immediate: paste, see, delight. Worth revisiting only after V0 exists
and is good.

---

## D5 — Website colour should meaningfully influence the tree

**Status:** DECIDED in principle — **exact mapping is OPEN**

A website's colour must have a real, visible effect on the resulting tree. A tree that
looks the same regardless of the site's palette fails the premise.

**TENTATIVE (not decided):** primary and accent colours may be carried mainly by
**flowers**, rather than by recolouring the whole tree.

**Reasoning for the principle.** Colour is the most immediately legible part of a
website's visual identity, and the easiest for a viewer to recognise in the result.
If the mapping does nothing visible with colour, users will not believe the tree came
from their site.

**Reasoning for the tentative flower idea.** Recolouring an entire tree tends to break
the "tree" reading — a fully magenta trunk and magenta leaves stops looking botanical
and starts looking like a recoloured asset. Flowers are a natural place for saturated,
arbitrary colour to live in a plant, so brand colour may sit there without fighting the
form. This is an appealing hypothesis, **not a decision**, and it has not been tested.

**Explicitly unresolved:**

- whether flowers are in fact the right carrier
- what happens to sites with no strong accent colour
- what happens to monochrome, black-and-white or very muted sites
- whether foliage, bark or environment also shift with palette, and how far
- how many colours we extract and how we rank them

Do not implement the flower mapping as though it were settled. Promoting it to DECIDED
requires seeing it, and is a human taste judgment (AGENTS.md R7).
