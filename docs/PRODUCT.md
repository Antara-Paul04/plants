# PRODUCT.md

What this project is. Seeded with **only** what we currently know — the gaps below are
real gaps, not omissions to be helpfully filled in.

See [AGENTS.md](../AGENTS.md) for the confidence labels used throughout
(**DECIDED / EXPERIMENT / TENTATIVE / ASSUMPTION / OPEN**).

---

## Concept

**DECIDED.** Enter a website URL and receive a unique, stylized 3D tree derived from
that website's visual design.

The tree should be cute and visually polished. It is a small creative internet
experiment — something people try once, enjoy, and maybe show someone. It is not a
product, a tool, or a platform.

---

## Core conceptual pipeline

**DECIDED** at this level of abstraction. Every stage below is unresolved internally.

```
Website URL
  → inspect visual design
  → derive a small set of visual characteristics
  → translate those characteristics into tree parameters
  → render tree
```

"A small set" is meant literally. The appeal of this idea is that a handful of
well-chosen characteristics produce recognizably different trees — not that we model a
website exhaustively.

---

## The central principle

**DECIDED.** We are translating **VISUAL DESIGN → BOTANICAL DESIGN.**

We are **not** translating website subject matter or content into literal objects.

| Website | Wrong | Right |
| --- | --- | --- |
| A photography portfolio | grows cameras | grows a tree shaped by its palette, spacing and restraint |
| A restaurant | grows food | grows a tree shaped by its warmth, density and shape language |
| A developer's site | grows laptops | grows a tree shaped by its monospace austerity and contrast |

This is the load-bearing idea of the project. A tree that grows literal objects is a
different, worse, much more obvious project. If a proposed feature starts reading the
site's *topic* rather than its *look*, that is a conflict to surface (AGENTS.md R2).

**ASSUMPTION.** Two websites in the same industry with different visual personalities
should produce visibly different trees, and two websites in different industries with
similar visual personalities should produce similar trees. This is the behaviour we
believe we want; it has not been tested.

---

## V0 scope

**DECIDED.** V0 is intentionally small — one experience, done well.

**In scope:**

- one simple experience, one page
- a URL input
- the resulting 3D tree
- the ability to try another website

**Explicitly NOT in V0:**

- accounts or sign-in
- a public garden or gallery of others' trees
- growth animation (a tree growing over time)
- gardening mechanics (watering, tending, returning, decay)
- a social network of any kind
- complex botanical simulation
- a large collection of plant species
- content-based AI imagery

The "not" list is not a roadmap. These are things we decided against *for V0*
specifically so the first version stays small enough to actually finish and be good.
Some are genuinely appealing later; none of them are now.

---

## Unresolved

**OPEN.** None of the following are decided. Do not decide them unilaterally.

| Question | Notes |
| --- | --- |
| Which website characteristics we extract | See [WEBSITE-ANALYSIS.md](WEBSITE-ANALYSIS.md) |
| Which tree parameters exist, and their ranges | See [TREE-SYSTEM.md](TREE-SYSTEM.md) |
| The visual style / art direction | See [VISUAL-SYSTEM.md](VISUAL-SYSTEM.md) — requires human taste judgment |
| The technology and 3D approach | Nothing chosen. No framework, no renderer, no libraries. |
| Interaction details | Can the user orbit the tree? Zoom? Is it static? Is there any input beyond the URL? |
| Whether terrain or a base is represented | Is the tree floating, potted, on soil, on an island, on nothing? |

Additional open questions live in [STATUS.md](STATUS.md).

---

## What "done" looks like for V0

**OPEN.** Not yet defined — but the intended feeling is: you paste a URL, a charming
little tree appears, and it feels like it genuinely belongs to that website.

If we ever have to choose between "the mapping is rigorous" and "the tree is
delightful", the delight wins. That is the point of the project.
