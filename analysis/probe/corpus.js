// EXPERIMENT — test corpus. Every URL recorded so runs are reproducible (brief §7).
// `tags` are the human expectation we are testing the metrics AGAINST. They are the
// hypothesis, not ground truth produced by the probe.

export const CORPUS = [
  // --- checkpoint set: the extremes (brief §15) ---
  { id: 'control-raw',      url: 'file://LOCAL/fixtures/raw.html',            tags: ['near-raw-html','control'],            note: 'Synthetic zero-CSS control. Ground truth for "unstyled".', checkpoint: true },
  { id: 'cern-first-web',   url: 'http://info.cern.ch/hypertext/WWW/TheProject.html', tags: ['near-raw-html'],             note: 'The first website. Genuinely unstyled real page.',        checkpoint: true },
  { id: 'better-mfw',       url: 'http://bettermotherfuckingwebsite.com/',   tags: ['intentional-minimal'],                note: 'Deliberate, argued minimalism. The crux-test twin of raw HTML. NOTE: https resets; http works.', checkpoint: true },
  { id: 'yale-art',         url: 'https://www.art.yale.edu/',                tags: ['maximalist','brutalist'],             note: 'Famously chaotic institutional site. Maximalist extreme.', checkpoint: true },
  { id: 'threejs-example',  url: 'https://threejs.org/examples/webgl_animation_keyframes.html', tags: ['canvas-webgl','animation-heavy'], note: 'Full-page live WebGL canvas, no iframe. DOM cannot represent this.', checkpoint: true },
  { id: 'unsplash',         url: 'https://unsplash.com/',                    tags: ['photography-heavy'],                  note: 'Photography grid; palette-corruption test.',             checkpoint: true },

  // --- dissociation pair: added to make Lead's §6b test answerable. The other six
  //     sites happen to rank-order by complexity, so everything correlates with
  //     everything. These two break that ordering deliberately. ---
  { id: 'craigslist',       url: 'https://craigslist.org/',                  tags: ['text-heavy','very-dense','dissociation'], note: 'MANY DOM nodes, visually flat/sparse. Tests whether signals track size.', checkpoint: true },
  { id: 'bruno-simon',      url: 'https://bruno-simon.com/',                 tags: ['canvas-webgl','dissociation'],           note: 'TINY DOM, visually rich. The inverse dissociation case.',                checkpoint: true },

  // --- full corpus remainder (run only after Lead confirms) ---
  { id: 'mfw',              url: 'http://motherfuckingwebsite.com/',         tags: ['near-raw-html','intentional-minimal'], note: 'Between raw and designed; deliberately near-default.' },
  { id: 'threejs',          url: 'https://threejs.org/',                     tags: ['image-heavy','grid'],                  note: 'Thumbnail grid — NOT a canvas page, despite the domain. Retagged after inspection.' },
  { id: 'spacejam-1996',    url: 'https://www.spacejam.com/1996/',           tags: ['maximalist','retro'],                  note: 'Preserved 1996 site. Maximalist/retro, table layout.' },
  { id: 'sive-rs',          url: 'https://sive.rs/',                         tags: ['intentional-minimal','text-heavy'],    note: 'Deliberately plain, fast, personal site.' },
  { id: 'stripe',           url: 'https://stripe.com/',                      tags: ['conventional-marketing','gradient'],   note: 'Polished conventional marketing with gradients.' },
  { id: 'bloomberg',        url: 'https://www.bloomberg.com/',               tags: ['editorial','very-dense'],              note: 'Dense editorial.' },
  { id: 'gov-uk',           url: 'https://www.gov.uk/',                      tags: ['intentional-minimal','text-heavy'],    note: 'Severe, systematised, deliberately plain.' },
  { id: 'apple',            url: 'https://www.apple.com/',                   tags: ['spacious','image-heavy'],              note: 'Extremely spacious product marketing.' },
  { id: 'awwwards',         url: 'https://www.awwwards.com/',                tags: ['maximalist','image-heavy'],            note: 'Busy showcase grid.' },
  { id: 'nasa',             url: 'https://www.nasa.gov/',                    tags: ['image-heavy','dark'],                  note: 'Dark, imagery-led.' },
  { id: 'tailwind',         url: 'https://tailwindcss.com/',                 tags: ['rounded','dashboard-like'],            note: 'Rounded, systematised component look.' },
  { id: 'figma',            url: 'https://www.figma.com/',                   tags: ['colourful','rounded','svg-illustration'], note: 'Colourful, illustration-led.' },
  { id: 'linear',           url: 'https://linear.app/',                      tags: ['dark','spacious','animation-heavy'],   note: 'Dark monochrome with motion.' },
  { id: 'wikipedia',        url: 'https://en.wikipedia.org/wiki/Tree',       tags: ['text-heavy','editorial'],              note: 'Text-dominant reference page.' },
  { id: 'vercel',           url: 'https://vercel.com/',                      tags: ['dark','geometric'],                    note: 'Dark, geometric, high-contrast.' },
  { id: 'cosmos-so',        url: 'https://www.cosmos.so/',                   tags: ['image-heavy','spacious'],              note: 'Image-mosaic product.' },
  // --- known failure cases: kept deliberately so the blocklist stays documented ---
  { id: 'lings-cars',       url: 'https://www.lingscars.com/',               tags: ['maximalist','FAILS'],                  note: 'BLOCKED: Cloudflare 403 challenge, redirects to motorleaseplatform.com. Kept as a documented bot-blocking case.' }
];

export const CHECKPOINT = CORPUS.filter(s => s.checkpoint);
