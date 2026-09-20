# Brief — wind, and what else moves

**From:** Lead · 2026-09-20 · **For:** `visual-3d` (unstaffed at time of writing)
**Asked for by the human:** *"I wanted to add some effects to the trees, maybe wind and shit."*

---

## The good news: most of it already exists

`applySway` in `prototype/src/util.js` is built, tested and shipping — it is what makes V0's
foliage move. It already solves the parts that are easy to get wrong:

- **Tuning values are uniforms, not baked literals.** They used to be interpolated into the
  GLSL, which compiled a separate shader per differently-sized tree — a hitch per tree and an
  unbounded program cache. Exactly two programs now exist no matter how many trees are on
  screen. **Do not undo this.**
- **Instancing-aware** (`#ifdef USE_INSTANCING`), which matters because the new foliage is
  instanced clusters.
- **Two masks.** `local` bends a grass blade from its own root scaled by local height;
  the default eases the canopy in by world height via `smoothstep(yLo, yHi, wp.y)`, so the
  trunk stays planted and the crown moves.
- **Two-frequency sway** — sines at 1× and 1.57×, plus a cosine at 0.77× on Z — so the motion
  never reads as a single pendulum.

## What is actually missing

**The new tree's foliage never calls it.** `uniforms.time` is already threaded into
`grow.js` and ticked every frame by `main.js`, and **the grass already sways** — so the
plumbing is in place and the leaves, flowers and fruit simply were never wired up.
`leaves.js` and `flowers.js` build their materials through `matte()` and no `applySway` call
was added when they were written.

So the first version of this is small — **but NOT as small as I first wrote here, and the
difference would have shipped broken.**

> **CORRECTION, from `visual-3d`, 2026-09-20.** I originally wrote "thread `uniforms` into the
> foliage builders and call `applySway` on the leaf, flower and fruit materials." That would
> silently break them.
>
> `applySway` **assigns** `material.onBeforeCompile` and `customProgramCacheKey`. So do
> `killSpecular()` in `leaves.js` and `matte()` in `flowers.js` — and that hook is the
> **zero-specular rule**, which exists because the human rejected polished wood by name
> ("roughness 1 alone still leaves a sheen"). Calling `applySway` afterwards overwrites it:
> leaves, flowers, fruit, buds and berries would all regain the sheen, **and nothing would
> error**. It would also collide cache keys, since `'sway-world'` is shared with V0's foliage
> materials, which carry no specular kill — whichever compiled first would win.
>
> The fix: make the sway hook **compose** with any existing `onBeforeCompile` and **append**
> to the existing key (`'leaf-matte-v1+sway-world'`). Program count stays bounded — one per
> matte key, not one per tree — so the uniforms-not-literals work above is preserved.
>
> Recorded because *"it should be a two-line change"* is exactly how this would have shipped
> broken, and because the failure is invisible: no error, no crash, just a sheen returning to
> a tree that was explicitly art-directed not to have one.

---

## Rulings

### W1 — Wind is AMBIENT. It is a property of the world, not of the website. DECIDED.

Do not drive wind speed or strength from anything measured. The obvious idea — a site with
motion gets a windier tree — was already investigated and **deliberately not shipped**: the
motion signal flipped on **17% of repeat runs** on the same URL, and a tree that moves
differently on different visits breaks *"same site, same tree"*, which is the promise the
whole product rests on.

That is the same failure that killed the mask fallback (unsplash swinging 1000× in chroma
between days) and it is worth naming as a pattern: **an input that is not stable across runs
cannot drive anything the user is supposed to recognise as theirs.**

Ambient wind is fine because it is the same for every tree — it is weather in the world the
trees live in, not a claim about the site.

### W2 — The crown moves, the trunk does not. DECIDED (it is what `applySway` already does).

The height mask is the reason the effect reads as a tree rather than as a wobbling object.
Keep `yLo`/`yHi` tuned to the tree's actual extents rather than V0's constants — the new tree
is a different size, and a mask calibrated for the old one will either move the trunk or
freeze the crown.

### W2b — Night must be LEGIBLE at 140 px. DECIDED, and it unblocks L17.

The tree has to separate from the sky at thumbnail size. That is a **floor, not a
preference** — whether night is moody *enough* is taste's call, whether you can see the tree
is not. `daringfireball.net` currently fails it with a near-black crown on a near-black sky.

So L17 is a legibility bug with a measurable test (crown-versus-sky separation at 140 px),
not an aesthetic question needing permission. The standing ban still holds: **night comes
from colour, direction and contrast, never from raising exposure.**

### W3 — Open, and genuinely a taste question: does the WOOD sway?

V0 moved only foliage. At V0's amplitude (0.045) nobody noticed that branches were rigid
while leaves moved. The new tree has **chunky, readable limbs** — so the same trick may not
survive. If the wood stays rigid, the leaves may look like they are sliding over it.

Not mine to decide. Whoever holds taste should look at both.

---

## Worth building after wind, in rough order of value

1. **Falling leaves in autumn.** The state exists, the leaf geometry exists, and autumn is
   currently the least animated state despite being the one where falling leaves are the
   whole idea. Cheap, and it makes the rarest state the most memorable.
2. **Petal fall at `abundant` bloom.** Same mechanism. Peak bloom is already a distinct
   botanical phase; shedding is what it *does*.
3. **Wind gusts rather than constant sway** — a slow envelope over the existing amplitude, so
   the tree is sometimes still. Constant motion reads as mechanical.

**Do not add:** anything that competes with the tree. TASTE #8 is that the tree is the hero
and the environment supports it; #9 bans props added merely to make a scene interesting.
Drifting particles, lens effects and animated skies all fail both.

---

## Sequencing constraint — read before starting

**Do not edit `prototype/src/*` while a capture sweep is running.** The product serves those
files statically, so a renderer edit mid-sweep means trees captured after it differ from
trees captured before — which silently contaminates a run that takes 90 minutes to produce.
Check with the test session before touching renderer files.

## Cost

`applySway` is a vertex-shader displacement with no geometry change, no extra draw calls, and
two shader programs total. It should be free. **Measure anyway and report the number** — the
tree build is already the dominant cost in a 8-second end-to-end grow, and "should be free"
has been wrong before on this project.
