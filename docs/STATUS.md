# STATUS.md

> **Agent handoff document.** Describes the *present* state of the project.
>
> Keep it short — under a minute to read. Replace stale lines rather than appending.
> This is not a changelog; git history is the changelog. See
> [AGENTS.md](../AGENTS.md) R9.

---

## Phase

**Working V0.** The whole chain runs end to end. Paste a URL, get your tree.

```bash
node app/server.js     # → http://localhost:5170
```

---

## Working

- **The pipeline.** URL → live headless-Chrome analysis → fingerprint → Botanical
  DNA → 3D tree, in the browser. Verified against real sites, not fixtures.
- **The crux, live.** `info.cern.ch` grows a bare sculptural tree;
  `bettermotherfuckingwebsite.com` grows a sparse leafy one. Unstyled HTML and
  deliberate minimalism produce visibly different trees — the claim the whole
  project rests on.
- **Validity gate.** Invalid URLs, unreachable hosts, HTTP ≥400, error pages and
  interstitials are rejected with readable messages. No tree is ever grown from a
  Cloudflare challenge.
- **Comparison grid** at `/compare.html` — 12 corpus trees, thumbnail toggle.
- Browser reuse: ~3–8s warm, ~14–21s cold.

---

## Not started

- Forest, sharing, accounts, deployment, mobile
- Additional tree species — one broad family only
- Cat

---

## Known limitations

- **The middle collapses.** Sites in the NORMAL band render near-identically at
  thumbnail size, and NORMAL holds 12 of 23 corpus sites. The single biggest
  threat to "your tree is yours".
- `linear.app` times out on the live path (it measured fine in the corpus).
- Analysis runs in **light mode only**. For sites respecting
  `prefers-color-scheme` that decides what the site *is* — vercel.com measures
  white in light mode and black in dark. Same URL, more than one true appearance.
- `motion` is excluded: never repeatable (0.291/0.015/0.028/0.016 on one URL).
- `imageArea` earns no role; `roundness`, `regularity`, `embedArea` were cut.
- Autumn is reachable but **no real site triggers it** — warm dominance in the
  corpus was always photographs, never design. One synthetic record exists.
- No `dispose` audit under repeated growth; leaks unproven either way.

---

## Current questions

1. **Does the tree look right?** Still the open art-direction question, now
   answerable against many real sites rather than one.
2. Is the V0 fingerprint accepted? `authored`, `stylingRichness`, `inkCoverage`,
   `colorfulness`, `palette{ground,primary,secondary}`, weak `imageArea` /
   `textDensity`.
3. `textDensity` measured as one of our *strongest* signals but is deliberately
   weighted weak on instruction. Give it more room?
4. Which measurement conditions are canonical — light mode? desktop width?
5. Should the lighting rig follow a dark background? Currently a day-lit tree
   against a night sky.

---

## Next

**Human review**, then the middle-collapse problem — making NORMAL sites
distinguishable is worth more than any new feature.
