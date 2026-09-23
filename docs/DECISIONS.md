# DECISIONS.md

A lightweight log of meaningful decisions and the reasoning behind them.

**What belongs here:** decisions that shape the product, the creative direction, or the
architecture — anything a future agent could otherwise undo by accident.

**What does not belong here:** implementation trivia. Variable names, file layout,
default numbers nobody argued about. See [AGENTS.md](../AGENTS.md) R10.

Do not edit or delete past entries. To reverse a decision, add a new entry that
supersedes it and note which one it replaces.

---

## D1 — The project is website → 3D tree

**Status:** DECIDED

A user enters a website URL and receives a stylized 3D tree derived from that site.

**Reasoning.** This is the premise of the experiment. Everything else is negotiable.

---

## D2 — V0 is intentionally small

**Status:** DECIDED

One page, one URL input, one tree, the ability to try another. Nothing else.

**Reasoning.** Small creative internet experiments succeed by being finished and
charming, not by being complete. A tight V0 keeps the interesting problem — the
mapping from visual design to botanical design — at the centre, instead of spending
the project's energy on accounts, galleries and mechanics.

See [PRODUCT.md](PRODUCT.md) for the full in/out-of-scope list.

---

## D3 — The tree represents visual design, not subject matter

**Status:** DECIDED

We translate a website's *visual design* into botanical design. We do not translate its
*content or topic* into literal objects: a photography site does not grow cameras, a
restaurant does not grow food, a developer's site does not grow laptops.

**Reasoning.** Content-to-object mapping is the obvious version of this idea and a much
weaker one — it produces novelty clip-art rather than a tree with a personality. The
interesting claim is that a website has a visual character, and that character can be
expressed botanically. This decision is load-bearing; treat proposals that drift toward
reading site topic as a conflict to surface.

---

## D4 — No growth or gardening mechanics in V0

**Status:** DECIDED

No growth animation, no watering or tending, no returning to a garden over time, no
decay, no persistence of trees between sessions.

**Reasoning.** Gardening mechanics are a different product with a different shape — they
need accounts, persistence and a reason to return, all of which contradict D2. The
appeal of V0 is immediate: paste, see, delight. Worth revisiting only after V0 exists
and is good.

---

## D5 — Website colour should meaningfully influence the tree

**Status:** DECIDED in principle — **carrier BROADENED and settled 2026-09-20, see D6.**
The "explicitly unresolved" list at the foot of this entry is kept as a historical record of
what was open in V0. Most of it is now answered by D6; read D6 first.

A website's colour must have a real, visible effect on the resulting tree. A tree that
looks the same regardless of the site's palette fails the premise.

**TENTATIVE (not decided):** primary and accent colours may be carried mainly by
**flowers**, rather than by recolouring the whole tree.

**Reasoning for the principle.** Colour is the most immediately legible part of a
website's visual identity, and the easiest for a viewer to recognise in the result.
If the mapping does nothing visible with colour, users will not believe the tree came
from their site.

**Reasoning for the tentative flower idea.** Recolouring an entire tree tends to break
the "tree" reading — a fully magenta trunk and magenta leaves stops looking botanical
and starts looking like a recoloured asset. Flowers are a natural place for saturated,
arbitrary colour to live in a plant, so brand colour may sit there without fighting the
form. This is an appealing hypothesis, **not a decision**, and it has not been tested.

**Explicitly unresolved:**

- whether flowers are in fact the right carrier
- what happens to sites with no strong accent colour
- what happens to monochrome, black-and-white or very muted sites
- whether foliage, bark or environment also shift with palette, and how far
- how many colours we extract and how we rank them

Do not implement the flower mapping as though it were settled. Promoting it to DECIDED
requires seeing it, and is a human taste judgment (AGENTS.md R7).


---

## D6 — The website's colour enters the tree through living botanical detail

**Status:** DECIDED — 2026-09-20, after external review of the whole flower system.

This supersedes D5's tentative "flowers are the carrier" hypothesis. The invariant is now:

> **The website's colour enters the tree through living botanical detail.**

- Flowers remain the primary and default carrier **in flowering leafy states**.
- Flowers need **not** carry the colour in every botanical state.
- Permitted carriers: **flowers, fruit, berries, buds**, and other restrained living detail.
- **Forbidden carriers: bark, trunk, soil, the entire foliage mass, the environment.**

**Reasoning.** D5's narrow form left real holes. A `winter` tree was forced to
`flowers: none` and therefore expressed *nothing* of its website — the site vanished
entirely, which is the one outcome the product cannot afford. Broadening the carrier fixes
that without reaching for the thing D5 was right to forbid: recolouring the tree itself. A
magenta trunk stops reading as botanical. A magenta *bud* does not.

This also answers D5's open question "what happens to monochrome, black-and-white or very
muted sites": they receive ivory/white/grey botanical accents drawn from their own palette.
Low chroma is not low richness, and a restrained tree is not a punished one.

---

## D7 — Meaning lives in the DNA; artistic variation lives in the renderer

**Status:** DECIDED — 2026-09-20.

```
WEBSITE   → measured fingerprint → BOTANICAL DNA     (meaning)
MORPHOLOGY (a DNA field)         → which bloom grammars are compatible   (constraint)
SEED (a DNA field, FNV-1a over the domain) → which compatible grammar is used   (variation)
```

**Morphology CONSTRAINS the bloom grammar. It does not dictate it.** It answers "what kinds
of bloom can grow convincingly on this tree?", not "this tree always gets this flower."

Where more than one grammar is compatible, the **stable domain seed** chooses among them.
This is an acceptable use of seed **because the seed decides nothing meaningful**: whether a
site flowers, how much, and in what colour all come from measurement. The seed only picks
between artistic embodiments that are all equally valid. The same domain always gets the
same choice.

The three built grammars are **not species**. Plants makes a stylised botanical translation
and never performs species classification:

| grammar | what it is |
|---|---|
| `cluster` | many small blossoms grouped together |
| `statement` | fewer, larger flowers |
| `pendant` | hanging, tapering clusters |

Plants must never claim "this is a cherry tree."

---

## D8 — Rejected approaches, recorded so they are not rediscovered

**Status:** DECIDED — do not re-litigate without new evidence.

1. **Morphology directly selecting one fixed flower form.** Morphology already encodes
   structural information about the website; binding form to it one-to-one expresses the
   same signal twice. Superseded by D7.
2. **A new analysis metric for flower form.** Reverse-engineering website "meaning" to
   justify geometry that happens to already exist. No property of a website means
   "wisteria." See also D8.7.
3. **Random fruit.** A seeded coin-flip (`roll < 0.50`) silently denied fruit to half of all
   genuinely fruit-eligible sites — random from the website's point of view, and it deleted a
   measured trait. Concentration is the measurement; eligibility follows from it.
4. **Bleaching dark or cool accents to make them legible.** Maroon `#723131` became dusty
   pink `#d27f7f`: hue preserved exactly, colour destroyed. **For a dark accent, the darkness
   is part of the identity** — maroon, burgundy, oxblood, forest green, deep plum. Legibility
   comes from contrast *around* the petal (the flower centre, and local foliage value), never
   from repainting the source colour.
5. **Moving flowers outward to solve "the wreath".** Tried three times and it does not work.
   The bloom is *already* evenly distributed through the crown — a debug render with foliage
   hidden proves it. The rim appearance is **leaf occlusion**: front-facing leaf clusters
   cover the bloom behind them. The fix is botanical (flowering twigs carry less foliage),
   not positional.
6. **Literal website-background-colour → scene mapping.** Environment states are
   art-directed, not colour-translated.
7. **Colourfulness as a proxy for design richness.** Measured **r = 0.02 across 23 sites** —
   the two are orthogonal axes. Gating ornament on chroma discarded an entire independent
   signal and gave the corpus's most sophisticated site (linear.app, maximum styling
   richness, achromatic) *no ornament at all*. Richness decides **whether** there is bloom;
   colour decides **what colour** it is. This is the Linear failure and it must not return.

---

## D9 — The page opens on a real tree, labelled as an example

**Status:** DECIDED, 2026-09-21. Reverses an earlier reasoned decision; both are recorded.

The immersive shell opened on an empty island: sky, bare earth, and an invitation card.
The argument for it was sound and is kept in `app/public/app.js` beside the code that
overturns it — a DEFAULT tree would draw a `DEFAULT_DNA` belonging to no website, which
breaks the rule that we never draw a value we did not measure; and it would compete with
the tree the user is about to ask for.

**What changed is that the frame was looked at rather than reasoned about.** Framed for a
tree and given none, it is a cropped brown disc filling the lower third with the
invitation floating in dead centre — the same place the status card sits. It does not
read as a planter waiting for something. It reads as a page that failed to load, and it
is also, precisely, what our FAILURE state looks like. A visitor arriving from a link has
no idea yet that trees are the point.

So the page opens on DNA measured by the ordinary analyzer from an ordinary site
(`app/public/gallery.json`), with the same "Why this tree?" panel a live result gets,
**because it is the same kind of object**. The first objection does not apply: nothing
unmeasured is drawn. The second is answered by the renderer rather than by argument —
`setDNA` aborts a build in flight and holds the old scene until the new one is whole, so
a visitor who types while it is still building simply takes it over.

**The label is the whole of its honesty.** The panel names the site and says "an example",
and it persists through the read that replaces it, because the caption describes the
picture on screen and not the request in flight. Without that, the first grow of a
session shows a stranger's tree, unattributed, for ten to thirty seconds.

Consequences accepted: the opening costs a wood build (~2.0s of blocked main thread on a
4x-throttled CPU), and the crown's fixed opening azimuth now greets every visitor — which
is why "a crown whose faces differ" was promoted from a rendering curiosity to a live
product defect.

**Not chosen:** a night example. `linear.app` measures as a lush, abundantly flowering
night tree and would be striking, but the human has rejected a night scene once before on
taste grounds, and Taste owns that call. The pool is day trees until someone with the
authority looks at it.

---

## D10 — A website is on the public internet

**Status:** DECIDED, 2026-09-21.

Loopback, private ranges, link-local (including the cloud metadata address), carrier-grade
NAT, multicast, the IPv6 equivalents, the names `localhost`, `*.local`, `*.internal`, and
the integer and hex spellings that exist to get past exactly this check are not websites
and are refused before any navigation. Credentials in a URL are stripped rather than
forwarded.

Nothing leaked when this was probed — the sandbox had nothing listening — but that is the
runtime's accident and not our rule. The cost was already real and visible: `10.0.0.1`
held a serverless function for 15.8s waiting on a route that cannot answer, which is our
budget, spendable from outside, one request at a time.

**Known and not closed:** DNS rebinding. A public hostname whose A record points into
private space still gets one navigation, because the check is on the name rather than on
what it resolves to.


---

## D11 — A living tree and its own share card

**Status: DECIDED, human direction, 2026-09-23.** The human requested small animations,
hover interactions, a tree-specific X card, UI that suits the tree, and removal of
public explanations. This supersedes D9’s “Why this tree?” panel and the earlier
exclusion of persistence for the narrow purpose of shared snapshots. Accounts,
public galleries and gardening mechanics remain outside the current scope.

**DECIDED.** Sharing captures the actual renderer output into a 1200×630 PNG. A saved
`/t/:id` URL serves per-tree metadata in initial HTML so social crawlers do not need
JavaScript. DNA, source URL and camera are saved alongside the image; opening the link
does not repeat analysis. Vercel Blob stores shared assets; local development uses disk.

**EXPERIMENT.** Hover adds local foliage movement. Taps and Space produce a brief
foliage response; flowering/autumn trees release a few petals/leaves. Dragging and
multi-touch do not count as taps. Reduced-motion preference disables automatic and
reactive movement; the person can explicitly enable it. Trunks stay rigid.

**EXPERIMENT.** Matte cream/moss/clay controls and a serif wordmark fit the existing
miniature scenes. This is an implementation for human review, not a new fixed art rule.

**OPEN.** Saved images are immutable; saved interactive geometry uses renderer
contract version 1. Future changes to DNA interpretation or geometry need a versioned
renderer/migration policy before shipping. Do not silently reinterpret old snapshots.


### D11 motion refinement — 2026-09-23

**DECIDED — human request.** Tap-triggered leaves should fall like the existing autumn
leaves, with a breeze that is visible without cursor interaction.

**EXPERIMENT.** Every leafy tree now uses the same individual-leaf seats, geometry,
colours, accelerating fall, sideways flutter, tumbling and turf contact as autumn.
The earlier cluster/petal tap overlay is removed. A separate 21-leaf pool accepts
seven leaves per tap, so tapping cannot interrupt the automatic autumn pool and
repeated taps cannot grow an unbounded pile. Pausing freezes both on the renderer clock.

**EXPERIMENT.** Foliage sway amplitude is 0.16 and the calm gust multiplier is 0.65;
the existing gust timing and peak multiplier remain. These are visual tuning values,
not website measurements. They keep a gentle breeze visible between stronger gusts.
Wood remains rigid, and reduced-motion preferences still start paused.

### D11 base refinement — 2026-09-23

**DECIDED — human request.** Remove the low-poly appearance of the tree's base.
This supersedes the soil body's deliberately visible facets. The grassy rim,
irregular island outline and restrained earth palette remain the visual direction.

**EXPERIMENT.** A curved soil profile with continuous normals replaces the coarse
bands and flat shading. Broad, subtle irregularity keeps the surface organic.

### D11 laptop layout and wildlife — 2026-09-24

**DECIDED — human request.** Give the tree more space on laptops by moving controls
to the side, remove the visible drag instruction, and add small wildlife to scenes.
This permits ambient animals despite the earlier restriction on decorative props.

**EXPERIMENT.** At 1000px and wider, controls occupy a left rail and the camera fits
the remaining screen. Day scenes have three butterflies; night scenes have ten
softly glowing fireflies. These are atmosphere, not website measurements. They use
the shared motion clock and pause/reduced-motion settings; no new public explanations.
