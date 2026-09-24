# Collectible card preview QA

final result: passed

## Target
User-provided references: mint front/back digital trading card; portrait Forgotten
Ruins card with fine ornamental border; white-framed character card. This preview
combines the requested features rather than reproducing any character illustration.
The live Pinterest tree supplies the central artwork. Generated botanical/circuit
texture supplies the back. Preview only; production sharing remains unchanged.

## Checks
- Front: portrait frame, centred live tree, website name, restrained specimen details.
- Back: matching portrait proportions, patterned botanical/circuit border, Site Bonsai
  typography and site address; no tree-trait explanations.
- Front, Back and Auto rotate controls work. Both faces get a readable hold during
  the automatic turn. Tree rotates independently of the card.
- Browser checks at the default panel size and 390×844. Initial grid layout placed
  the card over the controls; replaced with centred flex positioning and rechecked.
  Latest mobile back has clear space above controls, no clipped card or page overflow.
- Mint/pine palette adapts the digital reference toward the existing garden palette.
  Georgia display type preserves Site Bonsai; monospace metadata echoes the references.
- No browser console errors; module syntax and static build passed.

## Limits
This is a local visual prototype using the saved Pinterest specimen. Image/video
export and replacement of the production share dialog are the next integration step
once this direction is reviewed. Tiny decorative print is intentional; primary
website title and view controls remain prominent. No claim of exact pixel matching.

## Pink reverse revision
User rejected the botanical/engraved back and requested cute pink sci-fi styling.
Replaced its texture with pixel hearts, sparkles, orbit marks and technical border
panels in blush/hot pink. Rounded berry typography replaces the back's serif mark.
Browser screenshot of the Back state confirms text stays inside the clear central
area, the border is intact, and controls remain clear below the card. Front styling
is unchanged. This revision remains a local design preview.
final result: passed

## Selected holographic reverse + page-wide tilt
User selected the holographic pink reference. The back now uses that exact image
with restrained moving foil and light overlays. An independent outer transform
follows pointer movement across the whole page; the inner transform retains the
front/back turn. Mouse exit/window blur returns tilt to neutral; touch scrolling
is not captured. Browser check used points outside the card at x=30 and x=510 in
a 540px viewport: DOM styles settled at opposite Y rotations (~−11.56 / +11.56deg)
and opposite highlight positions (~21 / 79 percent). Screenshots confirm legible
branding and intact borders. Module syntax, static build and diff checks pass.
final result: passed

## Green colourway and click-to-flip
User requested another colour variation and removal of rotation buttons. Browser
verified the green treatment, unchanged front, click flip and Enter flip. The card
starts on its green back for this review. Mouse-following tilt remains independent;
the tree continues rotating. No automatic card turns or view buttons remain.
final result: passed

## Stronger holographic finish
Back now has a full-face rainbow foil layer, stronger travelling specular sheen,
and reflective edges driven by the existing pointer position. The front and click
flip stay intact. Browser-checked the back for readable title and URL.
final result: passed

## Share interaction — local verification

**EXPERIMENT — verified.** Created a saved Pinterest card through the new Share button, opened its `/t/:id` route, and checked that the tree renders and clicking flips the card. The stored 1200×630 PNG shows the front tree card. Plant your tree points to `/`. Existing 26 tests and the static build pass. No X post was sent. This iteration remains local; main garden share dialog/video integration is separate.
