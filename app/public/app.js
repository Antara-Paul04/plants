// Plants V0 — UI state machine.
//
// IDLE -> ANALYZING -> GROWING -> READY | ERROR
//
// The renderer is imported straight from the 3D domain (served at /tree/), so
// this page can never drift from the prototype.

import { mountTree } from '/tree/main.js';

const $ = (id) => document.getElementById(id);
const form = $('form'), input = $('url'), go = $('go');
const overlay = $('overlay'), spinner = $('spinner'), msg = $('msg');
const result = $('result'), domainEl = $('domain'), stampEl = $('stamp');
const whyList = $('whyList'), cacheNote = $('cacheNote'), retryBtn = $('retry');

let tree = null;
let busy = false;

function state(s, text, retryable) {
  retryBtn.hidden = !(s === 'error' && retryable);
  const showOverlay = s !== 'ready';
  overlay.hidden = !showOverlay;
  spinner.hidden = !(s === 'analyzing' || s === 'growing');
  msg.textContent = text || '';
  msg.className = s === 'error' ? 'err' : '';
  go.disabled = busy = (s === 'analyzing' || s === 'growing');
  for (const b of document.querySelectorAll('#examples button')) b.disabled = busy;
  go.textContent = busy ? 'Growing…' : 'Grow my website';
  if (s !== 'ready') result.hidden = true;
}

// --- "Why this tree?" -----------------------------------------------------
// Product copy, deliberately owned here rather than by the renderer or the
// analyzer: it explains the metaphor to a person, which is neither domain's job.
const FOLIAGE = {
  bare:   ['Bare structure', 'this site is essentially unstyled HTML, so its tree shows its skeleton'],
  sparse: ['Sparse foliage', 'restrained, deliberate visual styling'],
  normal: ['Full foliage', 'a conventionally developed visual design'],
  lush:   ['Lush foliage', 'a richly styled, heavily designed page'],
};
const DENSITY = {
  airy:   ['Airy canopy', 'lots of open space on the page'],
  normal: ['Balanced canopy', 'an even amount of visual coverage'],
  dense:  ['Dense canopy', 'the page fills most of its frame'],
};
const FLOWERS = {
  none:     ['No flowers', 'no meaningful colour accent of its own'],
  few:      ['A few flowers', 'one restrained accent colour'],
  medium:   ['Flowering', 'a clear accent colour running through the design'],
  abundant: ['Heavily flowering', 'colour is central to how this site looks'],
};
const STATE = {
  autumn: ['Autumn', 'warm hues dominate the design palette'],
  winter: ['Winter', 'clearly designed, but extremely restrained and almost colourless'],
};
const SKELETON = { simple: ['Simple branching', 'a light, uncomplicated page'], rich: ['Intricate branching', 'a dense, text-heavy page'] };

function renderWhy(dna) {
  const rows = [];
  const add = (pair, swatches) => pair && rows.push({ label: pair[0], text: pair[1], swatches });

  add(FOLIAGE[dna.foliage?.state]);
  add(DENSITY[dna.foliage?.density]);
  add(STATE[dna.botanicalState]);

  const cols = [dna.flowers?.primary, dna.flowers?.secondary].filter(Boolean);
  add(FLOWERS[dna.flowers?.amount], cols.length ? cols : null);

  add(SKELETON[dna.skeleton?.complexity]);
  // Fruit is MEASURED, not a quirk. It used to be a seeded lottery and the copy
  // said so honestly; it is now connected-component analysis over the accent
  // pixels, and the distinction it draws against flowers is the point: flowers
  // are the site's colour DISTRIBUTED, fruit is the same colour CONCENTRATED.
  if (dna.fruit?.enabled) rows.push({
    label: 'Fruit',
    text: 'the accent colour sits in a few large areas rather than scattered through the page',
    swatches: dna.fruit.color ? [dna.fruit.color] : null,
  });
  if (dna.background) rows.push({ label: 'Scene colour', text: 'drawn from the page background', swatches: [dna.background] });

  whyList.replaceChildren(...rows.map((r) => {
    const li = document.createElement('li');
    const b = document.createElement('b'); b.textContent = r.label;
    const s = document.createElement('span'); s.textContent = r.text;
    li.append(b, s);
    if (r.swatches) {
      const wrap = document.createElement('span'); wrap.className = 'swatches';
      for (const c of r.swatches) {
        const d = document.createElement('i'); d.className = 'sw'; d.style.background = c; wrap.append(d);
      }
      li.append(wrap);
    }
    return li;
  }));
}

// --- failure, as product copy ---------------------------------------------
// A FAILURE MUST NEVER BE DRAWN AS A DEFICIENCY IN THE SITE (Taste, 2026-09-20).
// When stripe.com times out, stripe.com has not failed — we have. The 8s
// navigation budget is OUR limit, not a property of their website, and the
// sites that trip it are the big, rich, well-built ones. The analyzer's own
// strings blamed the site ("That website took too long to load."), which is an
// accusation pointed at the wrong party, so the product overrides them here.
//
// Owned in this file for the same reason the "Why this tree?" copy is: it
// explains a situation to a person, which is neither the analyzer's job nor
// the renderer's.
const FAILURE_COPY = {
  // Ours. Transient, and honest about why — the true reason is flattering.
  TIMEOUT:     [(d) => `We could not finish reading ${d}. Big, richly built sites often outrun us.`, true],
  UNREACHABLE: [(d) => `We could not reach ${d} just now.`, true],
  INTERNAL:    [() => 'Something went wrong on our side while reading that site.', true],
  BLOCKED:     [(d) => `${d} does not allow us to look at it.`, false],
  // Genuinely about the address the person typed. No retry: it would fail again.
  INVALID_URL: [() => 'That does not look like a website address.', false],
  NOT_FOUND:   [(d) => `We could not find a page at ${d}.`, false],
  REDIRECTED:  [(d) => `${d} sent us somewhere else, so we stopped.`, false],
  EMPTY_PAGE:  [(d) => `There was nothing on ${d} to read.`, false],
};

function failureText(failure, domain) {
  const entry = FAILURE_COPY[failure?.code];
  const d = domain || 'that site';
  if (!entry) return ['We could not read that website.', true];
  return [entry[0](d), entry[1]];
}

// --- grow -----------------------------------------------------------------
let lastUrl = null;
async function grow(raw) {
  lastUrl = raw;
  // Timed from here, not from the server's analysis alone. The wood is built by
  // marching cubes AFTER /api/grow returns, and that is the larger half of the
  // wait — reporting the analysis time told the user 2.9s while they sat for 13.
  const t0 = performance.now();
  state('analyzing', 'Reading your website…');

  let data;
  try {
    const res = await fetch('/api/grow', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: raw }),
    });
    data = await res.json();
  } catch {
    return state('error', 'Could not reach the Plants server. Is it still running?');
  }

  if (!data.ok) {
    const [text, retryable] = failureText(data.failure, data.domain);
    return state('error', text, retryable);
  }

  state('growing', 'Growing something…');
  await new Promise((r) => requestAnimationFrame(r));

  // WAIT FOR THE MESH. mountTree returns in ~60ms with the island up and the
  // wood still building, so resolving the result here announced success about
  // ten seconds before the tree existed: caption, "grown in Xs" and a Why panel
  // reading "its tree shows its skeleton" — over an empty patch of grass. That
  // is worse than a spinner, because it does not read as waiting, it reads as
  // finished and wrong. Worst precisely on BARE sites, where a user may believe
  // the empty island IS their tree.
  try {
    const settled = tree
      ? tree.setDNA(data.dna)
      : (tree = mountTree($('scene'), data.dna, { autoRotate: true })).ready;
    await settled;          // null/undefined for engines that build synchronously
  } catch (err) {
    console.error(err);
    return state('error', 'The tree failed to grow. See the console.');
  }

  state('ready');
  domainEl.textContent = data.domain;
  stampEl.textContent = `grown in ${((performance.now() - t0) / 1000).toFixed(1)}s`;
  renderWhy(data.dna);
  cacheNote.hidden = data.live !== false;
  if (data.live === false) {
    cacheNote.textContent =
      'Live analysis is unavailable, so this tree came from a previously measured fingerprint for this domain — not a fresh reading.';
  }
  result.hidden = false;
  history.replaceState(null, '', `?site=${encodeURIComponent(data.domain)}`);
}

// Example chips. The first two are the pair the whole concept rests on —
// unstyled HTML against deliberate minimalism — so they sit first on purpose.
$('examples').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-site]');
  if (!b || busy) return;
  input.value = b.dataset.site;
  grow(b.dataset.site);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = input.value.trim();
  if (v && !busy) grow(v);
});

const preset = new URLSearchParams(location.search).get('site');
if (preset) { input.value = preset; grow(preset); }
else state('idle', 'Paste a website address to grow its tree.');

// Retry re-runs the same address. Worth offering because the failure really is
// transient: a warm browser reads in 3-8s where a cold one takes 14-21s.
retryBtn.addEventListener('click', () => { if (!busy && lastUrl) grow(lastUrl); });
