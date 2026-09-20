// Assemble the static half of the deployment into public/.
//
// Locally, app/server.js serves app/public at / and prototype/src at /tree/ —
// straight from the working tree, which is why a renderer edit is live instantly
// and why capture sweeps have to freeze those directories. A platform has no
// working tree, so the same two directories are copied into one output.
//
// The renderer is copied WHOLE rather than bundled: app.js imports /tree/main.js
// and /tree/dna-params.js as ES modules, and those import each other by relative
// path. There is no build step in this project and adding one here would mean the
// deployed renderer could differ from the one every measurement was taken against.
import { cp, rm, mkdir } from 'node:fs/promises';

const OUT = 'public';
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

await cp('app/public', OUT, { recursive: true });
await cp('prototype/src', `${OUT}/tree`, { recursive: true });

// The comparison grid is an internal view and the page links to it.
await cp('prototype/compare.html', `${OUT}/compare.html`).catch(() => {});

console.log(`built ${OUT}/ — shell + renderer`);
