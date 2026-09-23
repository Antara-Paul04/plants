# STATUS.md

## Current work

**EXPERIMENT — implemented on `codex/living-trees`, 2026-09-23.** A quieter responsive
shell, explicit reading/building/error states, leaf hover response, tap/keyboard
reactions, and motion controls. Taps now reuse autumn’s individual-leaf flight and
landing on every leafy tree; the ambient breeze has a stronger calm floor. The old tree stays visible while another loads.
Public trait explanations and debug navigation have been removed (D11).

**EXPERIMENT.** Share creates a 1200×630 PNG of the displayed tree and stores its DNA,
full URL and camera. `/t/:id` opens saved data without re-analysis and supplies initial
HTML OG/X metadata. Blob storage is connected; local development uses `tmp/shared-trees`.

**EXPERIMENT — verified.** Automated regressions cover analysis scopes, optional
motion sampling, browser recovery, cancellation/deadlines, URL handling, same-brand
checks, link-free pages, stale renderer builds, capture queues, reduced motion,
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
