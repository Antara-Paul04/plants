# prototype/

**Art-direction prototype — EXPERIMENT, not product code.**

One hand-authored tree on a small island, built to answer a single question:

> Can we make a 3D tree in the browser that looks good enough to want to build
> the project around it?

This is **not** the tree generator. Nothing here is parameterised, nothing reads a
website, and there is no product UI. Values were tuned by eye. See
[docs/TREE-SYSTEM.md](../docs/TREE-SYSTEM.md) for what is hardcoded and what might
later become variable.

## Running it

Any static file server works — there is no build step and nothing to install.

```bash
cd prototype && python3 -m http.server 5188
```

Then open `http://localhost:5188`. Drag to orbit, scroll to zoom; the idle spin
pauses while you interact.

The repo also has a `.claude/launch.json` entry (`tree-prototype`) that serves this
folder on the same port.

## Dependencies

three.js `0.169.0`, loaded from a CDN via an import map in `index.html`. No package
manager, no bundler, no framework — deliberately, so this prototype commits us to
nothing. It needs a network connection on first load.

## Files

| File | What it does |
| --- | --- |
| `src/main.js` | Renderer, camera, lights, background, animation loop |
| `src/tree.js` | Trunk, branches, roots — hand-placed skeleton swept into tapered tubes |
| `src/foliage.js` | Leaves, blossoms and petals, scattered over canopy lobes |
| `src/island.js` | Soil body, grass, rocks |
| `src/util.js` | Seeded RNG, noise, the wind-sway shader injection |

Everything is seeded from one constant in `main.js`, so the scene is identical on
every reload. That was necessary to iterate on it visually at all.
