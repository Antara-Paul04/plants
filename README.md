# plants

**Website as a Tree** — enter a website URL, get a cute, visually polished 3D tree whose
appearance is derived from that website's *visual design*.

This is a small creative internet experiment, not a SaaS product.

## Status

**Art-direction prototyping.** There is one hand-built tree in `prototype/`, made to
test whether the look is achievable in a browser. It is marked **EXPERIMENT** and is
awaiting human review — nothing in it is an approved decision.

There is still no frontend, no website analysis, no tree generator and no framework,
and that is deliberate. The creative and product specification is being settled first,
so that the thing we build is the thing we actually want.

```bash
cd prototype && python3 -m http.server 5188
```

## Conceptual pipeline (V0)

```
Website URL
  → inspect visual design
  → derive a small set of visual characteristics
  → translate those characteristics into tree parameters
  → render a stylized 3D tree
```

## Where to find project context

If you are an agent or a human joining this repository, read in this order:

| File | What it holds |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Operating manual — read this first if you are an AI agent |
| [docs/PRODUCT.md](docs/PRODUCT.md) | What the product is, what is in and out of scope |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decisions that are actually settled, and why |
| [docs/STATUS.md](docs/STATUS.md) | Current state, open questions, what happens next |
| [docs/VISUAL-SYSTEM.md](docs/VISUAL-SYSTEM.md) | Art direction (unresolved — placeholders) |
| [docs/TREE-SYSTEM.md](docs/TREE-SYSTEM.md) | Tree generation system (unresolved — placeholders) |
| [docs/WEBSITE-ANALYSIS.md](docs/WEBSITE-ANALYSIS.md) | Website interpretation (unresolved — placeholders) |
| [references/](references/README.md) | Visual references, test websites, experiment output |
| [prototype/](prototype/README.md) | The 3D tree art-direction prototype (EXPERIMENT) |
| `.claude/agents/` | Native subagent definitions for the three specialist roles |

Most of the domain documents are deliberately structured-but-empty. They are
scaffolding for decisions we have not made yet, not descriptions of decisions we have.

## A note on the core idea

We translate **visual design → botanical design**.

We do *not* translate a website's subject matter into literal objects. A photography
site does not grow cameras.
