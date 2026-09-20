# Flowers in "Plants" — complete brief for outside discussion

**Written:** 2026-09-20 · **Audience:** an external reader with no context on this project.
Everything needed to reason about the open questions is in this document.

---

## 1 · What the product is

You paste a website URL. You get a stylised 3D tree grown from that website's **visual
design** — never its subject matter. A site about dogs does not get a dog tree. A site with a
dense, colourful, heavily-styled design gets a different *kind of plant* than a stark
text-only one.

The pipeline: **URL → headless browser capture → a measured "fingerprint" → "Botanical DNA"
(a frozen contract) → a three.js scene.** Analysis and rendering are separated by that
contract so neither side can reach into the other.

The aesthetic target is a hand-illustrated, matte, slightly toy-like tree — closer to a
children's-book illustration than to a game asset or a photoreal render. Two viewing
distances matter and are treated as separate design problems:

- **~140 px (thumbnail / feed size)** — the tree must be identifiable as *this* website's tree
- **full size** — every element must survive close inspection as a real botanical form

---

## 2 · What flowers are FOR

This is the load-bearing decision, referred to internally as **D5**:

> **Flowers are the primary way the website's accent colour reaches the tree.**

Everything else on the tree is in the natural palette — bark browns, canopy greens, soil,
grass, sky. The website's own brand colour arrives almost entirely as **bloom**. (Fruit
carries it too, in a different way — see §7.)

That makes flower legibility not a decorative concern but the mechanism by which the product's
core promise — *this tree is recognisably from that website* — is delivered.

---

## 3 · How a website decides its flowers today

### 3a. How MANY flowers — driven by visual richness, not colour

A measure called `stylingRichness` (R) — roughly, how much deliberate design work is visible
on the page — selects the amount:

| R | amount |
|---|---|
| < 0.20 | `none` — too little design to carry ornament |
| 0.20 – 0.40 | `few` |
| 0.40 – 0.55 | `medium` |
| ≥ 0.55 | `abundant` |

This was **changed deliberately**. Amount used to be gated on *colourfulness*, which was
wrong: across 23 measured sites, styling richness and colourfulness correlate at **r = 0.02** —
they are orthogonal axes. Gating ornament on chroma threw away an entire independent signal,
and produced the absurd result that a maximally sophisticated but achromatic site
(linear.app, the corpus maximum for styling richness) received **no ornament at all**.

So: **richness decides WHETHER there are flowers. Colour decides WHAT COLOUR they are.**

### 3b. Gates that can override the amount

- **No meaningful accent → `none`.** A site must have chromatic coverage above `0.002` to
  have an accent at all. (4 corpus sites measure exactly 0; 9 more below 0.002.)
- **Media masking.** Colour inside `<img>` content is stripped before the palette is taken, so
  a photo site's *photographs* don't become its brand colour. Consequence:
  unsplash.com — a site made of photographs — gets no flowers.
- **`bare` state or `winter` state → `none`.** (See §6 for why this is a problem.)
- **`autumn` → downgraded one step** (`abundant`→`medium`, `medium`→`few`). Autumn abundance
  *decreases* rather than vanishing. An earlier version zeroed flowers in autumn entirely;
  that was overruled.
- **Reverse coupling:** `medium` or `abundant` flowers *sets* the tree's botanical state to
  `flowering`. Amount doesn't just add flowers, it decides what season the tree is in.

### 3c. What COLOUR the flowers are

The site's palette primary becomes the petal; the secondary becomes the flower's centre. But
raw pixel colours can't be used directly — a dark accent produces a blossom indistinguishable
from bark.

**The first fix for that was wrong and is worth understanding**, because it's the most
instructive mistake in the project. The original code simply *bleached* dark petals to make
them legible: maroon `#723131` came out as dusty pink `#d27f7f`. Hue was preserved exactly.
The colour was still destroyed — because **for a dark accent, the darkness is part of the
identity.** Maroon, burgundy, oxblood, forest green, deep plum are not "dark versions of" a
hue; the darkness *is* the colour. A user with a maroon site saw pink and correctly said the
tree had lost their colour.

The current rule: **legibility comes from contrast AROUND the petal, not from lightening it.**

- Petal lightness may travel at most **0.22**, and only up to a floor of **0.40** that
  separates it from foliage. It is never pushed into the pastel range. Ceiling **0.86** keeps
  near-white accents off a light sky.
- **The flower's centre carries the remaining read.** A dark petal gets a bright centre; a
  light petal gets a deep one; the target contrast is **0.35** in lightness. This reads at
  distance, preserves the petal's actual colour, and is botanically ordinary — real flowers
  have contrasting centres.
- A near-grey accent (saturation < 0.08) is tinted gently rather than having a hue invented
  for it.

These numbers come from the 19 real design accents in the corpus (lightness 0.21–0.84,
median 0.66, **only one below 0.40**).

---

## 4 · What is actually built

Flowers and fruit are **cluster types** that sit on the same attachment points as leaf
clusters. The authored unit is the *cluster*, never the individual petal — a flower that is
not on a twig reads as confetti, and the project's visual constitution forbids that
explicitly ("Flowers are deliberate. Botanical clusters and details — never confetti
scattered through the canopy").

### Three forms exist. A form belongs to the tree; one tree carries one.

| form | what it is | real-world analogue | cost/cluster |
|---|---|---|---|
| `blossom` | open five-petalled flowers packed over a dome (a corymb) | cherry, apple | ~1.9k tris |
| `magnolia` | two or three large upright goblets in two whorls | magnolia, tulip tree | ~2.5k tris |
| `wisteria` | a bunch of three hanging racemes, tapering to buds | wisteria, laburnum | ~2.3k tris |

### How many twigs bloom

`amount` maps to a fraction of available attachment points:

| amount | fraction of sites |
|---|---|
| `none` | 0 |
| `few` | 0.10 |
| `medium` | 0.27 |
| `abundant` | 0.62 |

Sites are chosen by ranking a **low-frequency noise field** over the crown and taking the top
fraction — so bloom arrives in **drifts** (a flowering limb here, a plain stretch there)
rather than as even scatter, while the count stays exact. An outer-twig bias starts at 0.65
for small amounts and **relaxes to 0.1 as the amount rises** — a little bloom sits on the
outermost twigs, a tree in full bloom flowers all through.

### The value-not-hue mechanism

A cool accent (e.g. gov.uk blue `#2d7abc`) used to vanish entirely against canopy green at
*any* amount, because it sits at roughly the same **value** as the foliage. Hue contrast alone
does not survive being shrunk to 140 px.

Current solution: **every petal pales toward its edge.** Bloom therefore always carries a
light value that canopy green lacks, whatever its hue. Tested: the blue now reads at 140 px
*as given*. A tested alternative — raising the colour's lightness outright (`lift`) — reads no
better and makes the bloom less the site's actual colour. **Ruled: no lift.**

---

## 5 · The unsolved visual problem — "the wreath"

Every flower amount first read as **a green tree wearing a pink wreath**: colour around the
rim, plain green in the middle.

The important part is the diagnosis, because the obvious explanation is wrong:

- The bloom placement was adjusted three times (up the twig, out along the radius, further
  out). **None of it helped.**
- A debug render with **leaves hidden** showed the bloom was *already evenly distributed over
  the entire crown*, centre and front included.
- The rim appearance is therefore **not placement and not botany. It is occlusion.** A crown
  is a shell; the few front-facing limbs carry full-size leaf clusters that cover the bloom
  behind them, and only the rim — which has no leaves in front of it — survives into the
  silhouette.

(The project lead initially recorded this as "botanically correct, blossom sits on peripheral
new growth, possibly a feature." That was **withdrawn** once the debug render was checked. Any
reasoning from the normal render alone reaches the same wrong conclusion.)

**What partly helps is botanical:** a twig that flowers carries a *smaller* leaf cluster
(scaled to 0.55). Better. **Not solved** — `abundant` is still rim-heavy from the hero angle.

**The unpulled lever:** drop the flowering twig's leaf cluster much further at high amounts —
toward **a tree that flowers before it leafs.** This is botanically literal (Prunus, Magnolia
and Cercis all bloom on bare wood ahead of foliage), the debug render of it is the most
beautiful output the project has produced, and it would make `abundant` a genuinely different
*phase of the year* rather than "the same tree with more flowers on it."

---

## 6 · Known problems, measured

1. **Nothing selects the form.** `blossom` is hardcoded as the default and the DNA contract has
   no field for it. **Every website on earth currently gets cherry blossom.** Magnolia and
   wisteria exist as finished geometry that nothing can ever choose. This is the primary
   open question — see §8.

2. **Cool accents are still weaker than warm ones.** The pale-toward-the-edge trick works, but
   blue still sits closer to canopy green in value than red or pink does. Measured: gov.uk at
   `abundant` (663 blossoms, brand blue) vs art.yale.edu at only `medium` (333 blossoms, red
   `#f62e2b`) — the red reads instantly at 140 px, the blue reads but weakly. **A cool-branded
   site gets a weaker colour signal than a warm-branded one at identical amount.** Much of the
   web is blue. This partly undermines D5.

3. **`few` and `medium` differ less at 140 px than `medium` and `abundant` do.** The ladder is
   not evenly spaced perceptually.

4. **Winter sites carry no website colour at all.** `winter` forces `flowers: none`, so nothing
   site-derived reaches the tree — a winter site's tree is a bare silhouette on a background
   that is nearly identical to everyone else's. A straight hole in D5.

5. **Triangle cost.** Abundant blossom is +178k triangles; abundant magnolia +230k — on top of
   a ~490k-triangle tree whose wood alone takes 1.5–2.5 s to build. Fine in a prototype, heavy
   for a product, untested on mobile.

6. **Foliage density saturates, which caps everything.** Below a certain leaf spacing the
   generator stops finding new places to put a cluster — the tree runs out of twig. Measured
   ceiling: **227 clusters**, reached well before the parameters stop being pushed. This means
   the *top* of every density-like range is compressed, which is the same shape as the
   project's central unsolved problem: across a 56-site survey, **41 of 56 sites landed in the
   middle two of four states.** Most websites produce nearly the same tree.

---

## 7 · Fruit, briefly

Fruit is the *other* carrier of the site's accent, and it means something different from
flowers:

- **Flowers = small, distributed accents. Fruit = fewer, larger, concentrated ones.**
- Decided by **connected-component analysis over accent pixels** — a site whose accent appears
  as a few large blocks (a hero button, a filled card) rather than scattered small marks
  crosses a concentration threshold of 0.60. Corpus: gov.uk 0.874, stripe 0.752, figma 0.695
  sit above; the next site down is 0.326, so the gap is real.
- Fruit is deliberately **toy-scale / oversized**, because an earlier realistically-scaled
  version was invisible at every viewing size. It hangs on the lower outside of the crown,
  and never on a twig that is already flowering.
- **Open: is toy-scale right, or too big?**

---

## 8 · The questions actually open for discussion

**Q1 — the main one. What should select the flower form?** Three candidate answers:

- **(a) Morphology implies it.** Each tree already has a structural archetype from earlier
  species research. Let the archetype carry its own flower — a pendulous/weeping structure
  gets wisteria, a stout upright one gets magnolia, a spreading one gets blossom. Form becomes
  a *consequence* of structure. Nothing new enters the contract.
- **(b) A new measured DNA field.** `flowers.form`, chosen by analysis from some property of
  the website. The problem: **nobody can say what property of a website means "wisteria."**
  This risks inventing a mapping to justify geometry that happens to exist — the exact failure
  the project's species research was explicitly told to avoid.
- **(c) Seed.** Drawn from the site's hash. Stable per site, but unrelated to anything measured
  — decoration pretending to be meaning.

*The in-house lean is (a)*, for a specific reason: **wisteria is the only form that changes the
tree's silhouette rather than its colour.** It hangs below the crown and is identifiable at
140 px with the colour thrown away entirely. Every other form is a recolour of the same green
ball. If form rides on morphology it reinforces a signal the tree is already carrying; if it
rides on a separate axis the two can contradict (pendulous flowers on an upright tree).
Counter-arguments welcome — this is not settled.

**Q2 — Which forms should survive at all?** Magnolia and wisteria are the most distinct at
140 px; blossom is the most generic but also the most legibly "a flowering tree." Is a generic
default worth keeping? Note Q2 and Q1 may be one decision, not two.

**Q3 — Should `abundant` mean "flowers before it leafs"?** See §5. It would solve the wreath at
the top of the range, widen a ladder that is too compressed, and is botanically real. Risk: it
makes `abundant` a large discontinuity rather than one more step.

**Q4 — What to do about cool accents?** The value trick works but not equally. Options nobody
has costed: shift the *foliage* away from the accent's value instead of shifting the flower;
give cool accents a warmer centre; accept the asymmetry as honest.

**Q5 — Winter's colour hole.** A winter tree currently expresses nothing of its website.
Something else must carry the accent — bark undertone? berries? the light? — or winter must
stop being colourless.

**Q6 — Is the perceptual ladder worth re-spacing?** `few`/`medium` are too close;
`medium`/`abundant` too far.

---

## 9 · Constraints any proposal must respect

1. **Flowers are botanical clusters on twigs. Never confetti.** Non-negotiable.
2. **Never restate the site's hue to make it legible.** Darkness and coolness are part of a
   brand colour's identity. Contrast must come from *around* the petal, not from repainting it.
3. **Must work at 140 px and at full size**, as two separate problems.
4. **All generated trees must read as one family** — they may differ dramatically but must
   belong to one universe.
5. **The tree is the hero.** Nothing added merely to make a scene interesting.
6. **Analysis and rendering are separated by a frozen contract.** A proposal that needs a new
   DNA field is allowed, but that is a contract change and must be argued for explicitly, not
   assumed.
7. **The tree must be beautiful.** A bare or restrained tree is not a punished tree — "bare is
   the absence of styling; winter is the presence of restraint," and both must be handsome.
