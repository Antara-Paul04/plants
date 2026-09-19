# prototype/

**Art-direction prototype — EXPERIMENT, not product code.**

One tree on a small island, built to answer a single question:

> Can we make a 3D tree in the browser that looks good enough to want to build
> the project around it?

It is now **parameterised against the Botanical DNA contract**
([docs/BOTANICAL-DNA.md](../docs/BOTANICAL-DNA.md)), so it renders a different tree per
website — but it is still not a general tree generator. The limb tables are the same
hand-tuned ones; DNA selects among them and sets colour, density and state. It never
reads a website, and there is still no product UI. See
[docs/TREE-SYSTEM.md](../docs/TREE-SYSTEM.md) for what varies and what does not.

## Running it

Any static file server works — there is no build step and nothing to install.

```bash
cd prototype && python3 -m http.server 5188
```

Then open:

| Page | What it is |
| --- | --- |
| `http://localhost:5188/` | One tree. Drag to orbit, scroll to zoom; the idle spin pauses while you interact. No query string renders the NORMAL baseline; `?site=gov.uk` renders that site's DNA. |
| `http://localhost:5188/compare.html` | **The comparison grid** — every DNA record side by side at one fixed camera angle, with a thumbnail-size toggle. Internal debug page, not product UI. Click a tree to open it full size. |

The repo also has a `.claude/launch.json` entry (`tree-prototype`) that serves this
folder on the same port.

## Dependencies

three.js `0.169.0`, loaded from a CDN via an import map in `index.html`. No package
manager, no bundler, no framework — deliberately, so this prototype commits us to
nothing. It needs a network connection on first load.

## Files

| File | What it does |
| --- | --- |
| `src/dna.js` | Botanical DNA → renderer parameters. The **only** module that knows the contract's vocabulary |
| `src/build.js` | One DNA record → a scene Group, a `dispose()`, and the scene's measured extents |
| `src/viewer.js` | Renderer, lighting rig, background, camera framing — shared by both pages |
| `src/main.js` | `mountTree()` — an orbitable single tree. Exports; runs nothing on import |
| `src/compare.js` | The comparison grid |
| `src/dna-data.js` | Snapshot of `analysis/results/dna.json` (generated — see below) |
| `src/tree.js` | Trunk, branches, roots — hand-placed skeleton swept into tapered tubes |
| `src/foliage.js` | Leaves, blossoms, fruit and litter, scattered over canopy lobes |
| `src/island.js` | Soil body, grass, rocks |
| `src/util.js` | Seeded RNG, noise, the wind-sway shader injection, disposal |

Randomness is seeded from `dna.seed`, so the same DNA always gives the same tree.

## The DNA snapshot

`src/dna-data.js` is a **copy** of `analysis/results/dna.json`, not the interface. It
exists only because this folder is what gets served, so `../analysis/` is not reachable
over HTTP. `fingerprint` and `why` are stripped on purpose — the renderer must never
read a fingerprint.

**Regenerate it whenever analysis rewrites `dna.json`.** It moved three times during the
round this was built in. The page prints the snapshot's timestamp so you can tell.
