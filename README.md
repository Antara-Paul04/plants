# plants

Paste a website. Watch a tree grow out of it.

Not a tree *about* it — we are not going to grow you a camera because you run a
photography blog. A tree grown from how the site **looks**: how much styling it
carries, how densely it fills its frame, whether it has a colour of its own and
whether that colour is scattered about or pooled in a few big places.

A real headless browser goes and looks at the site. What it sees becomes a
fingerprint, the fingerprint becomes **Botanical DNA**, and the DNA grows a tree.
Same address, same tree, every time — no database, no accounts, nothing stored.
The seed is the domain name.

**Live:** <https://plants-three-eta.vercel.app>

---

## Run it

```bash
node app/server.js
```

Open <http://localhost:5170> and paste something in.

Needs Node and a Chrome on the machine (`PLANTS_CHROME` overrides the path). The
browser is reused between reads, so the first site is slow and the rest are not.

**Start with `info.cern.ch`.** The first website ever published is unstyled HTML,
and it grows a bare sculptural tree — no leaves at all, just structure. Then try
`stripe.com` and watch what a designed page does. That pair is the whole idea in
about forty seconds.

---

## Things we did not expect to learn

This started as "make a pretty tree". Most of what we actually found was about
measurement.

**The wreath was a camera angle.** For days the blossom was believed to form a
ring around the outside of the crown, leaving the middle green. A great deal of
work went into fixing it. Measured properly — eight views, five seeds — there is
no ring: the bloom was always through the middle. Every judgement had been read
off the same debug page at the same default azimuth, which happens to be that
tree's worst face. Same seed, by view: `6.8 · 27.2 · 29.4 · 31.2 · 6.3 · 23.0 ·
30.4 · 20.4`. A thing that is meant to be orbited has to be measured round.

**Red was not a warm colour.** There is a complete autumn in here — burnt
sienna into amber into gold, turf with leaves lying on it, leaves that let go
when the wind gusts — and for a long time almost nothing triggered it. The
thresholds were blamed. Then the web was blamed for not being autumn-coloured.
Both wrong: `warm` had been defined as hue 10–55, which is amber and orange.
Autumn is made of rust and crimson and burnt sienna, which live at 345–10, and
none of them were counted. Not counted *lightly* — counted as **zero**.
`cnn.com`'s `#801e1e` sits at hue 0 and scored 0.000 warm. `pinterest.com` at
351: 0.000. An orange-red masthead like Smashing Magazine's managed 0.143
against a bar of 0.55.

The band wraps through red now, and `smashingmagazine.com` became the first real
website to grow an autumn tree. It did not flood the world with them — of
sixteen sites measured, three qualify. `cnn.com` scores a perfect warm share
under the new band and *still* does not get autumn, because it is a white page
with a red logo and the colour-coverage floor catches it. That floor was always
working. The band was not.

`ikea.com` is the other joke about measurement: blue and yellow to look at, but
mask out the photography and what remains reads as 100% warm. It measured ten
hue bins on one machine and one hue bin on the server minutes later — same site,
different pictures in the carousel.

**A website cannot always express its colour.** Photographs are content, not
design, so they are masked out before the palette is read — otherwise every
media-led site grows the same tree as every other media-led site. The cost is
that some sites genuinely have no colour left once you remove their pictures,
and the tree says so.

**The budget was spent in the wrong place.** For a while the timer started before
the browser did, so on a cold server the time spent *unpacking Chrome* was
charged to the website being read. Sites failed for being visited first.

---

## The one rule

**Visual design → botanical design.** Never subject matter → objects.

It is the line that keeps this from becoming a novelty generator. A tree is
allowed to be bare because a page is unstyled. A tree is not allowed to grow
cameras.

---

## State of things

It works end to end and it is deployed. You can paste a URL into the live site
and get your tree.

It is also rough in specific, documented ways. The analyser is a research probe
that got promoted to a service. The tree is one hand-authored family driven by
parameters, not a general plant generator — `morphology` still has exactly one
value. There is no forest and no accounts. 41 of 56 surveyed sites land in the
middle two of four states, which is the biggest standing threat to "your tree is
yours".

[docs/STATUS.md](docs/STATUS.md) is the honest list, including the defects
someone could meet today.

---

## How a site becomes a tree

```
website
  → a browser goes and looks at it
  → measurements (ink, styling richness, palette, colour concentration, motion)
  → a fingerprint
  → Botanical DNA   (foliage, density, botanical state, flowers, fruit, terrain, sky)
  → a stylised 3D tree
```

---

## Where things are written down

Read in this order if you are joining — human or agent.

| File | What it holds |
| --- | --- |
| [AGENTS.md](AGENTS.md) | The operating manual. Agents read this first. |
| [docs/PRODUCT.md](docs/PRODUCT.md) | What this is, and what it is deliberately not |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Settled decisions, with the reasoning attached |
| [docs/STATUS.md](docs/STATUS.md) | Present state and known defects |
| [docs/VISUAL-SYSTEM.md](docs/VISUAL-SYSTEM.md) | Art direction |
| [docs/TREE-SYSTEM.md](docs/TREE-SYSTEM.md) | How a tree is actually built |
| [docs/WEBSITE-ANALYSIS.md](docs/WEBSITE-ANALYSIS.md) | How a website is actually read |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | The gate deployment had to pass |
| [references/](references/README.md) | Visual references, test sites, experiment records |
| [prototype/](prototype/README.md) | The tree art-direction prototype |
| `.claude/agents/` | The four specialist roles: analysis, visual-3d, web, taste |

`references/experiments/` is worth a browse. It is where the things that did not
work are kept, with the numbers that killed them — including a crown
ramification that was judged nine times by blind panels and passed none of them.

`/compare.html` renders the corpus all at once. It is an instrument, not a page
for visitors, which is why nothing links to it.
