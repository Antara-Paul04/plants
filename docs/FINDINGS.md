# Findings

Things that turned out to be true, that we did not expect. Kept out of the
README because a README should show what the thing is, not how it was made.

Most of these are about MEASUREMENT rather than about trees. That is the pattern:
a number gets separated from the instrument that produced it, and then real work
gets aimed at a problem that was never there. See R12 in [AGENTS.md](../AGENTS.md).

---

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

---

The experiment records with the numbers behind them are in
[references/experiments/](../references/experiments/).
