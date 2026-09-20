# TASTE.md

> The Plants visual constitution. Owned by the `taste` specialist, who judges every
> render against it. Kept deliberately short — a constitution nobody finishes reading
> governs nothing.
>
> Principles here are **durable**: they outlive any one render. Notes on a single
> image do not belong here. See [AGENTS.md](../AGENTS.md) §7.

---

## Where these came from

Derived from repository evidence, not invented: `docs/VISUAL-SYSTEM.md` (the
prototype's recorded findings), `docs/TREE-SYSTEM.md` (construction and known
weaknesses), `docs/DECISIONS.md` (D3 especially), the human's reference image, and the
two visual passes on the prototype.

Where a principle below contradicts repository evidence, the evidence wins and the
principle changes.

---

## The fifteen

**1 · Miniature diorama.** A deliberately designed miniature object, not a generic
environment asset. The prototype found the single strongest lever for this is a narrow
camera field of view — more than any material choice.

**2 · Cute, not childish.** Charm and toy-like softness are wanted. Children's-game
aesthetics, excessive whimsy and decorative clutter are not.

**3 · Authored, not procedural.** Even when generated, the result must feel
art-directed. No visible scatter patterns, uniform randomness or algorithmic
repetition.

**4 · Clean silhouette.** The tree reads as an object at a glance. Branching and canopy
masses stay understandable.

**5 · Controlled detail.** Detail rewards looking closer. It must not become noise at
normal viewing size.

**6 · Foliage as masses first.** The canopy reads as intentional volume and clusters;
individual leaves support those forms. The image must never become thousands of
equally important leaf cards.

**7 · Flowers are deliberate.** Botanical clusters and details — never confetti
scattered through the canopy.

**8 · The tree is the hero.** Island, grass, rocks and environment support it. They
never compete with it.

**9 · Restraint in props.** Nothing added merely to make a scene "interesting". No
benches, mushrooms, fences, lanterns, signs or ponds.

**10 · Family resemblance.** Generated trees may differ dramatically but must clearly
belong to one universe.

**11 · Variation must survive small scale.** This project lives on social media. Major
differences stay visible at feed-thumbnail size. A difference visible only while
orbiting close-up does not exist.

**12 · No generic low-poly game asset language.** Stylised geometry is allowed.
Looking like an asset-store tree is not.

**13 · Softness without mushiness.** Soft and charming, but forms keep deliberate
structure.

**14 · Preserve strong things.** Do not redesign something that works merely because
another iteration is possible. Overworking is a real failure mode.

**15 · References outrank generic conventions.** Where project references establish a
direction, follow them over general design advice.

---

## Learned from evidence so far

Findings from the prototype passes that behave as durable principles. Each earned its
place by being observed, not assumed.

- **Air must be carved *through* a canopy, not left between its lobes.** Frequency
  matters more than amount — high-frequency gaps read moth-eaten rather than airy.
- **Contact with the ground needs two falloffs**, a tight crevice and a wide pool. One
  radius alone reads as either a painted ring or a second cast shadow.
- **Opening a canopy for air flattens it** unless the lobes are also squeezed inward
  and stretched up. Spread is what domes a crown.
- **A leaf's shading normal should follow the mass it belongs to, not its own face.**
  Otherwise a canopy reads as tinsel instead of a volume.
- **A bare tree in a living scene reads as death, not as winter.** Leaflessness is
  judged against its surroundings, not on its own. Standing in vivid summer turf, the
  same skeleton that would look architectural reads as the one dead thing in a healthy
  garden. If the tree goes dormant, the scene goes dormant with it.
- **A seasonal state has to reach every element of the scene, or the ones it misses
  become the loudest thing in the frame.** Quieting the turf under a bare tree works,
  and it immediately promotes whatever was left at full summer value — stones, sky —
  to the brightest object in a picture whose whole point was to be quiet.
- **What makes a tree look expensive is proportion and topology, not resolution.**
  Broken taper, junctions that step instead of swelling, and too few branch orders are
  the whole of the asset-store look, and no amount of subdivision touches any of them.
  The one thing that legitimately needs *more* is count at the fine end of the
  hierarchy — three hundred three-triangle twigs, never a smoother trunk. Targets and
  the Gate 1 checklist: [references/tree-style](../references/tree-style/README.md).
- **A difference must be exaggerated to the magnitude that survives a thumbnail, and
  the corpus itself says what that magnitude is.** Wherever one generated tree *does*
  read as distinct at feed size, that is the calibration — anything subtler than the
  thing that already works will not survive either.

---

## Open, and waiting on the human

Questions the constitution cannot answer because they are genuine creative forks.

- Is the looser, scruffier crown from the second pass better, or now too airy?
- Does the ground contact read as occlusion, or as a smudge?
- Is the windswept character introduced by the edge sprigs wanted?
- Should wind sway and drifting petals stay at all? Motion remains OPEN.

---

## How this file changes

When the human gives visual feedback, `taste` decides whether it is **local** (about
one render) or **general** (should govern future work). Only general principles are
added here.

One instance is local. A repeated pattern is a principle. Speculative readings of the
human's taste are not added without evidence, and this file never becomes a log of
every comment — if it grows past the point where a fresh agent will read it end to
end, it has failed at its job.
