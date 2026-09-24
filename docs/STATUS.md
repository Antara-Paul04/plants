# STATUS.md

## Current work

**EXPERIMENT — local preview.** `/card-preview.html` explores a portrait, two-sided
collectible share card from the human’s references, with a centred rotating Pinterest
tree and a green colour variation of the selected holographic back. Page-wide mouse movement
tilts the card and moves its foil highlight. Clicking the card flips it; the separate rotation buttons are removed. A large Share button below the flip hint saves the front PNG and exposes copy-link,
X and image-download actions. Creators see “Share this card” only. Saved `/t/:id`
links open the recipient view with the saved DNA and “Plant your tree” instead of
sharing controls; that link returns home. This remains local, not deployed;
the main garden’s existing share dialog/video exporter is still separate. See `design-qa.md`.

**DECIDED.** Public name: **Site Bonsai** (D12), live at `sitebonsai.vercel.app`.

**EXPERIMENT — implemented on `codex/living-trees`, 2026-09-23.** A quieter responsive
shell, explicit reading/building/error states, leaf hover response, tap/keyboard
reactions. Taps now reuse autumn’s individual-leaf flight and
landing on every leafy tree; the ambient breeze has a stronger calm floor. The old tree stays visible while another loads.
The island's soil body now has a smooth curved profile and continuous shading.
Night stars are sparse and faint; a brighter blue sky and diffuse fill restore
tree visibility while retaining the soft rim. Flower meshes use smaller open
cluster sprays and finer centres (visual tuning remains experimental).
Laptop controls sit to the left of a larger tree; mobile retains the bottom dock.
The visible drag hint is removed. Butterflies and fireflies were removed at the
human's request; ambient breeze and tap-triggered leaf fall remain (D11).
Public trait explanations and debug navigation have been removed (D11).
A matching 404 page handles unknown routes and missing tree links, with a home link
that works without JavaScript and a decorative living island. Blob misses
are recognized by SDK error type; storage failures retain their error response.

**EXPERIMENT.** Share creates a 1200×630 PNG of the displayed tree and stores its DNA,
full URL and camera. The redesigned card uses a left text column, tree on the right,
and sitebonsai.vercel.app. Sharing also offers a six-second video download with playback
preview (MP4 where supported, WebM fallback). Pause controls and OS reduced-motion
handling are removed at the human’s request. `/t/:id` opens saved data without re-analysis and supplies initial
HTML OG/X metadata. Blob storage is connected; local development uses `tmp/shared-trees`.

**EXPERIMENT — verified.** Automated regressions cover analysis scopes, optional
motion sampling, browser recovery, cancellation/deadlines, URL handling, same-brand
checks, link-free pages, stale renderer builds, capture queues,
share validation, storage and metadata. Leaf-fall regressions cover original colour/size,
landing, frame-rate independence, bounded repeated taps and automatic autumn shedding. Browser checks cover live HN generation,
share/reopen, desktop, 390×844 and 320×568 layouts, and day/night scenes. Blob write/read
was also exercised with an actual renderer postcard. The Vercel preview passed live
generation, rotated-tree sharing, public initial-HTML metadata and PNG retrieval. See `npm test` and the PR checks.

## Known limits / next work

- **OPEN.** Review the new visual and interaction tuning on a real phone. Browser
  viewport checks are not measurements of a phone’s GPU or CPU.
- **OPEN.** Complete DNS/redirect/subresource egress protection for arbitrary website
  analysis (D10); hostname filtering is not a complete SSRF boundary.
- **OPEN.** Configure durable upload rate limits before a high-volume launch. Share
  payloads are bounded and validated; the endpoint is intentionally anonymous.
- **OPEN.** Freeze/version renderer assets before future geometry changes reinterpret
  saved DNA. The social PNG itself is immutable.
- **OPEN.** X controls when cards are fetched/cached. Metadata and image endpoints are
  checked directly; no actual tweet was posted during testing.
- **DECIDED.** One broad tree family; no accounts, public garden or gardening mechanics.
