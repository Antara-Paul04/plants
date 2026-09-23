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

// Keep the comparison grid available for internal rendering checks. The product
// no longer links to debug views.
//
// It was copied verbatim and its one script tag says `./src/compare.js`. That is
// correct where the prototype is served, because there the prototype root IS the
// server root. Here the renderer lands at /tree/, so the tag 404'd and the page
// rendered its heading, one checkbox, and nothing else. Rewrite the path as it is
// copied rather than editing the prototype, which must keep working where it lives.
import { readFile, writeFile } from 'node:fs/promises';
try {
  const html = await readFile('prototype/compare.html', 'utf8');
  await writeFile(`${OUT}/compare.html`, html.replaceAll('./src/', '/tree/'));
} catch { /* no comparison grid in this tree; the link will 404 rather than break the build */ }

console.log(`built ${OUT}/ — shell + renderer`);
