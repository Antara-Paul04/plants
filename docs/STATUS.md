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

**It is also live**, at <https://sitebonsai.vercel.app>, growing trees from
a browser it does not own. The page opens on a real tree from `app/public/
gallery.json` — DNA measured by the ordinary analyzer — labelled as an example
until the visitor grows their own.

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

- Forest, sharing, accounts
- **Mobile — never built, and holding anyway.** Measured on the deployment at
  390x844 (plants-36, 2026-09-21): canvas fills the viewport, no horizontal
  overflow, no scroll, input and chips legible, island centred. Nothing has been
  designed for a phone; the full-bleed shell simply survives one. Treat it as
  untested rather than done — and note that a launch on X is mostly phones.
- Additional tree species — one broad family, and `morphology` still has one value
- Cat

---

## Known limitations

- **The opening frame is ~4-9 s on a budget phone, down from ~13 s.** Measured
  against the deployment, 6x CPU throttle, cold cache, 390x844, 3 runs each, on a
  quiet machine:

  ```
  workers OFF (what shipped before tonight)          13.0 s
  workers ON, throttle NOT reaching workers           3.6 s   ← flattered
  workers ON, throttle put back (woodWorkerRepeat=6)  8.8 s
  ```

  **Do not quote the 3.6 s.** DevTools CPU throttling does not throttle workers,
  so any throttled measurement of a worker build is flattered by exactly the
  throttle. A real budget phone has several genuinely slow cores, so the truth
  sits between the second and third rows: several usable cores tends toward
  3.6 s, one usable core toward the main thread's time and no worse. **Nobody
  has run this on a real device** and that is the open item.
  The earlier "15-20 s" figure was real and matches the workers-OFF row.
- **Halving three.js does NOT help.** `three.module.min.js` is the same pinned
  version at 687 KB against 1304 KB (170 KB against 261 KB over the wire), one
  import-map line, no build step. Measured at 6x on localhost: 3.4 s → 3.3 s,
  i.e. noise. Parse volume was not the constraint, so the "ship less JavaScript"
  lead is closed unless someone has a better reason than byte count.
- **Every asset finishes at ~1.6 s; the network was never the bottleneck.**
  preconnect + modulepreload moved three's *start* from 520 ms to 278 ms and left
  total asset time unchanged. Worth having, not a fix.
- **`medium`'s wreath was one camera angle.** Averaged round the tree, approved
  `abundant` carries 31-42% of its bloom in the crown's middle third against
  34-37% at the rim. Every bloom judgement on this project was read off
  `gate2.html?preset=bare&seed=7` from the default camera, which is that tree's
  *worst* face. The real defect is a crown whose FACES DIFFER, and only 4-7
  attachment points project into the middle of any view (mean 5.0), so a bare
  middle is a coin flip over a handful of twigs. See R12 in `AGENTS.md`.
- **A login wall can grow a tree.** `x.com/home` and `instagram.com` are measured
  and presented as those sites — a false result rather than an error. Open
  product question: is a login wall "that site's design"?
- **DNS rebinding is not closed.** Private address literals are refused (D10),
  but a public hostname whose A record points into private space still gets one
  navigation, because the check is on the name and not on what it resolves to.
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
- **Gate 1 is NOT PASSED and the work is inert.** Three cycles, nine blind
  verdicts, nothing passed; today's tree placed last or second-last in 8 of 9
  ("antlers", "a hat rack with foliage") and a ramified tree first in 8 of 9, so
  what ships is worse than work that is still not good enough. Four causes, none
  a parameter: one calibre beyond order 2, a crown that is a shell, colonization
  hooks, and no leader. `RAMIFY_DEFAULT` is `'0'`; flipping it is the ship.
  **The bare tree and the leafy tree want opposite skeletons** — the same
  armature judged best for a foliated crown is worst at 140 px.
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
