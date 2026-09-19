# plants

**Website as a Tree** — enter a website URL, get a cute, visually polished 3D tree whose
appearance is derived from that website's *visual design*.

This is a small creative internet experiment, not a SaaS product.

## Run it

```bash
node app/server.js
```

Then open **http://localhost:5170**, paste a website address, and press *Grow my
website*. A real headless browser measures the site, the measurements become a
fingerprint, the fingerprint becomes Botanical DNA, and the DNA grows a tree.

Try `info.cern.ch` first — essentially unstyled HTML, so it grows a bare
sculptural tree. Then `stripe.com` for the contrast.

`http://localhost:5170/compare.html` shows every corpus tree at once, with a
thumbnail toggle. That view is for us, not for users.

Requires Node and a local Chrome. First run of a given site takes ~8–20s; the
browser is reused, so later ones are faster.

---

## Status

**Working V0.** The whole chain runs end to end — paste a URL, get your tree.

It is rough on purpose. The analysis is a research probe promoted to a service,
the tree is one hand-authored family with parameters rather than a general
generator, and there is no Forest, no sharing and no accounts. See
[docs/STATUS.md](docs/STATUS.md) for what is and is not done.

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
