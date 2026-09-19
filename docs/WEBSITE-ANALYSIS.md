# WEBSITE-ANALYSIS.md

> **Status: UNRESOLVED.**
> How we inspect a website, and what we derive from it, has not been decided. This is
> the structure for working that out.
>
> **No mappings are final.** Do not implement an extraction pipeline on the basis of
> this document.

---

## Current hypothesis

**ASSUMPTION — the guiding idea for this whole area.**

We care about a website's **visual character**, not merely its measurable DOM
properties.

Counting elements, tags, colours-in-stylesheet or nesting depth is easy and mostly
produces numbers that do not correspond to how a site *feels* to look at. Two sites can
have near-identical DOM statistics and completely different visual personalities, and
the reverse is also true.

So the target output of this stage is something closer to a **visual impression** — a
few characteristics that would match how a person might describe the site at a glance
("airy and pale", "dense and loud", "severe, monospaced, high-contrast") — rather than a
feature vector of DOM measurements.

This is a hypothesis about what will produce good trees. It is not proven, and the
honest difficulty is that impressions are harder to extract reliably than statistics.
DOM measurements may well be *inputs* to an impression. They just should not be the
output.

Related: DECISIONS **D3** — we read how a site *looks*, never what it is *about*.

---

## What can be extracted from a website

**OPEN.**

An inventory of what is realistically obtainable, and by what means — static HTML/CSS
parsing, headless rendering, screenshotting, or some combination. Each method has very
different cost, reliability and fidelity.

- _unresolved_

---

## Palette extraction

**OPEN.**

How we determine a site's colours, and which ones matter. Questions: source (CSS
declarations vs rendered pixels vs screenshot quantisation); how to distinguish
background from primary from accent; how to weight by area vs by prominence; how many
colours to keep; how to handle images that dominate the frame.

Feeds the palette mapping in [TREE-SYSTEM.md](TREE-SYSTEM.md), and constrained by
DECISIONS **D5**.

- _unresolved_

---

## Layout

**OPEN.**

Structural impression: grid vs freeform, alignment and regularity, column structure,
symmetry, rhythm, how ordered or chaotic the arrangement reads.

- _unresolved_

---

## Whitespace

**OPEN.**

How much breathing room the design has. Margin and padding scale, spacing between
sections, whether the design feels generous or tight. Probably closely related to
visual density, and possibly the same axis viewed from the other end.

- _unresolved_

---

## Visual density

**OPEN.**

How much is on screen at once — element count, text volume, information per viewport,
how busy or sparse the page feels.

- _unresolved_

---

## Shape language

**OPEN.**

Corner radii, use of circles and pills, hard vs soft edges, borders, presence of organic
or geometric forms. One of the more plausibly direct routes to botanical form — soft,
round sites and sharp, angular sites suggest genuinely different trees.

- _unresolved_

---

## Typography

**OPEN.**

Typeface character (serif, sans, mono, display), weight, scale contrast, letter spacing,
line length, how much of the page's personality lives in the type. For many sites,
typography *is* the visual identity.

- _unresolved_

---

## Imagery

**OPEN.**

Presence, volume and character of images: photography vs illustration vs none, treatment
(full-bleed, contained, masked), whether imagery dominates or supports. Note D3 — we
read images for visual qualities such as tone and contrast, never for their subject.

- _unresolved_

---

## Possible normalized characteristics

**OPEN.**

The intended output of this stage: a small set of normalized characteristics that the
tree system consumes, each on a defined scale, stable across very different sites.

The design constraint is that this set must be **small**. It is the interface between
the two halves of the project, and the appeal of the idea rests on a handful of
characteristics producing recognisably different trees.

- _unresolved_

---

## Mapping to the tree system

**OPEN.**

The actual translation: which website characteristics drive which tree parameters, and
how strongly.

**Nothing here is decided.** The single tentative idea on record is that colour may be
carried primarily by flowers — see DECISIONS [D5](DECISIONS.md) and the Flowers section
of [TREE-SYSTEM.md](TREE-SYSTEM.md). It is TENTATIVE and must not be hardened into a
mapping by being implemented.

- _unresolved_

---

## Technical feasibility

**OPEN.**

What is actually achievable, and at what cost. Considerations: CORS and same-origin
limits on fetching third-party sites; client-side vs server-side analysis; whether
headless rendering is needed and where it would run; JavaScript-rendered sites that are
empty without execution; time budget from URL submission to result; rate limits.

Feasibility will constrain the creative ambition here more than anywhere else in the
project. Surface those constraints early and explicitly rather than quietly narrowing
the idea to fit them (AGENTS.md R6).

- _unresolved_

---

## Edge cases

**OPEN.**

Inputs that will break naive approaches. An initial list to expand, not to solve yet:

- sites that fail to load, time out, or block automated access
- login walls, paywalls, cookie and consent interstitials covering the page
- single-colour, monochrome or near-greyscale sites
- extremely minimal sites (a single line of text on white)
- extremely maximalist or deliberately chaotic sites
- sites that are one full-bleed image or video
- dark-mode-by-default sites
- sites that render nothing without JavaScript
- non-website URLs (a PDF, an image, a raw file)
- invalid, malformed or non-existent URLs
- very slow sites
- sites whose appearance differs at mobile vs desktop widths — which do we analyse?

**OPEN.** What the experience does when analysis fails: refuse, fall back to a default
tree, or produce something deliberately strange. A product question as much as a
technical one.
