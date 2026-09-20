# STATUS.md

> **Agent handoff document.** Describes the *present* state of the project.
>
> Keep it short — under a minute to read. Replace stale lines rather than appending.
> This is not a changelog; git history is the changelog. See
> [AGENTS.md](../AGENTS.md) R9.

---

## Phase

**The product grows the real tree.** Paste a URL into `:5170` and you get the
Gate 1/2 tree — chunky SDF limbs, clay bark, bloom grammars, the foliage ladder,
autumn, winter, night — grown from that site's Botanical DNA.

```bash
node app/server.js     # → http://localhost:5170
```

`?engine=v0` still serves the old tree, whole, on identical DNA.

---

## Working

- **8 concurrent requests pass** (was 0 of 8 on this machine). The navigation
  waits for `commit` plus a readable document rather than the script tail, and a
  contention bug — frame comparison routed through one shared page — is gone.
  stripe.com went 16.8 s → 4.4 s on a *single* request; that cost had been there
  all along.
- **Bot walls are rejected, and info.cern.ch still grows bare.** The
  discriminator is LINKS, not size: a page with zero links is not a website,
  while cern has 25. A second validity gate runs on the *settled* document,
  after the navigation the blocks arrive by.
- **Fruit is measured, not a coin flip.** `rng()` is now drawn zero times in
  `mapping.js`, so no DNA can shift from a seeded roll.

- **The pipeline, end to end.** URL → live headless-Chrome analysis → fingerprint
  → Botanical DNA → the new renderer, in the browser.
- **The crux, live.** `info.cern.ch` grows a bare sculptural tree;
  `news.ycombinator.com` grows a sparse leafy one with an orange accent. Unstyled
  HTML and deliberate minimalism produce visibly different trees.
- **Bloom grammars** — `cluster` / `statement` / `pendant`, chosen from the
  grammars compatible with the morphology, by the domain seed, on its own stream.
  **No DNA field**: meaning lives in the contract, artistic variation in the
  renderer (D7).
- **Seasons.** autumn (fruit is its carrier, no flowers), winter (buds and
  persistent berries), night. The ground now sits clearly darker in value than the
  trunk standing on it, by construction rather than by palette.
- **Failure is a real state.** Bare-earth island, copy that blames us rather than
  the site, and a retry where the failure is genuinely ours.
- Browser reuse: ~3–8 s warm, ~14–21 s cold — **on a quiet machine**; see below.

---

## Not started

- Forest, sharing, accounts, mobile
- **Deployment** — gated, not started. The instruction is to deploy once the
  product works independently of this laptop; `docs/DEPLOYMENT.md` makes that
  testable. The gate is the timeout, not the browser.
- Additional tree species — one broad family, and `morphology` still has one value
- Cat

---

## Known limitations

- **The 8-second navigation timeout measures OUR machine, not the website.**
  The four chips requested at once: 1 passes in 3.8 s, 4 pass with analysis
  *doubled* to the cliff, 8 gives 5/8. `domcontentloaded` waits for every deferred
  script to download *and execute*, so the limit gates on the site's JS payload
  over our CPU at that instant. **A product whose failure rate rises with its own
  popularity.** The fix (measure an earlier, stable event) is blocked on visual
  stability detection, because we already measure loading screens as pages.
  See L16 in `docs/briefs/BLOOM-SYSTEM-RULINGS.md`.
- **The 59% pass rate and the bot-wall defect are both FIXED in the tree but not
  yet re-measured.** Committed, and the server must be restarted for them to be
  live. The BEFORE numbers stand until the post-change sweep runs: 47 of 79 grew,
  and tesla/adidas/dribbble "succeeded" on block pages.
- **Any reliability number measured while anything else runs on this machine is a
  measurement of the machine.** Several findings were discarded for this.
- **The middle still collapses.** 41 of 56 surveyed sites land in the middle two
  of four states. Still the biggest threat to "your tree is yours".
- **`medium` fails the bloom ladder** — reads as a green tree with a coloured rim
  at 140 px. Fix is in flight: `elsewhere` before fraction.
- **Accents are ranked by pixel count** (`probe/pixels.js`), so the biggest wash
  beats the actual brand colour — stripe.com grows a cream tree and its real blue
  reaches only the flower centre. Same root cause as ikea's false autumn. See L15.
- **Gate 1 is still REVISE** on crown ramification — the crown reads as antlers,
  and it now ships.
- The skeleton is a 90–200 ms block, the longest remaining stall. End-to-end
  growth is 15–21 s, most of it the tree build, not analysis.
- Analysis runs in **light mode only**; `motion` is excluded as unrepeatable.
- An **autumn site without the fruit trait carries no accent at all** — ikea is
  one. Open contract question.

---

## Roles

`test` and `analysis` are staffed. **`taste` is not** — its rulings are recorded
in `docs/briefs/BLOOM-SYSTEM-RULINGS.md` and `docs/TASTE.md`, but nobody is
holding visual judgement. `visual-3d` churned late in the session; check with
`ListAgents` rather than trusting this line, and expect a fresh session to need
STATUS.md, `references/tree-style/README.md` and the rulings brief before it can
pick anything up.

---

## Current questions

1. **Does the tree look right?** Still the open art-direction question.
2. Should the analyzer wait for an earlier event than `domcontentloaded`, and what
   detects "the page has settled" without waiting on the script tail?
3. Which measurement conditions are canonical — light mode? desktop width?
4. May a season express no website colour at all (autumn without fruit)?

---

## Next

**The timeout**, because it silently filters the corpus every aesthetic judgement
is formed on: a site that times out produces no tree, so it never reaches a sheet
anyone judges. Then `medium`, then the middle collapse.
