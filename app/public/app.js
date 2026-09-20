// Plants V0 — UI state machine.
//
// IDLE -> ANALYZING -> GROWING -> READY | ERROR
//
// The renderer is imported straight from the 3D domain (served at /tree/), so
// this page can never drift from the prototype.

import { mountTree, mountEarth, mountIdle } from '/tree/main.js';
import { dnaToParams } from '/tree/dna-params.js';

const $ = (id) => document.getElementById(id);
const form = $('form'), input = $('url'), go = $('go');
const overlay = $('overlay'), spinner = $('spinner'), msg = $('msg');
const result = $('result'), domainEl = $('domain'), stampEl = $('stamp');
const whyList = $('whyList'), cacheNote = $('cacheNote'), retryBtn = $('retry'), sceneEl = $('scene');
const resultHead = $('resultHead');

let tree = null;
let busy = false;

// A LONG WAIT SHOULD SAY SOMETHING TRUE AS IT PASSES.
// bruno-simon.com takes 51s to reach the right verdict and gwern.net has been
// measured at 38s; a shared ?site= link spends all of it on an empty island
// with one unchanging line of copy. Silence that long reads as a hang. These
// are not fake progress — there is no progress to report, the analyzer does not
// stream — they are honest statements about where we are in a budget we know.
let reassureTimers = [];
function clearReassure() {
  for (const t of reassureTimers) clearTimeout(t);
  reassureTimers = [];
}
function reassure(steps) {
  clearReassure();
  for (const [after, line] of steps) {
    reassureTimers.push(setTimeout(() => { if (busy) msg.textContent = line; }, after));
  }
}

function state(s, text, retryable) {
  clearReassure();
  retryBtn.hidden = !(s === 'error' && retryable);
  const showOverlay = s !== 'ready';
  overlay.hidden = !showOverlay;
  overlay.classList.toggle('failed', s === 'error');
  overlay.classList.toggle('busy', s === 'analyzing' || s === 'growing');
  spinner.hidden = !(s === 'analyzing' || s === 'growing');
  msg.textContent = text || '';
  msg.className = s === 'error' ? 'err' : '';
  busy = (s === 'analyzing' || s === 'growing');
  // NOT DISABLED WHILE BUSY. Locking the controls meant a second address typed
  // during a 15s read was dropped in silence, and the input went on showing it
  // while somebody else's tree arrived underneath — the interface asserting a
  // site that did not grow this. A person who types a second address has
  // changed their mind, so the second one supersedes the first (see grow()).
  go.textContent = busy ? 'Growing…' : 'Grow my website';
  // THE PANEL DESCRIBES THE TREE THAT IS ON SCREEN, not the request in flight.
  // While a read runs, the previous tree is still standing — the renderer holds
  // it until the new one is whole — so hiding its label left a beautiful
  // unattributed tree up for 10-30s that was not the visitor's, and for the
  // first grow of a session that tree is our example. Keeping the caption is
  // the honest state: this is still X, and something new is on its way. It
  // clears on ERROR, where the scene really does become bare earth, and on IDLE,
  // where there is nothing to describe.
  if (s === 'error' || s === 'idle') { result.hidden = true; result.classList.remove('example'); }
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
// Is the bloom carrying a real accent, or the pale fallback? Analysis synthesises
// an ivory petal from the site's GROUND when no accent survives the media mask,
// and the product must not then claim "a clear accent colour running through the
// design" — ente.com has no accent at all and was being told it had one.
//
// Read off the COLOUR ITSELF rather than re-testing the chroma threshold here:
// the accent floor lives in analysis/lib/mapping.js and copying it into a second
// file is how the two drift apart. A synthesised petal is near-grey by
// construction; a real accent that survived the floor is not.
function isPaleFallback(hex) {
  if (typeof hex !== 'string') return false;
  const n = parseInt(hex.replace('#', ''), 16);
  if (!Number.isFinite(n)) return false;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  // CHROMA (max - min), not HSL saturation. Saturation is divided by how close
  // the colour sits to black or white, so it inflates for light near-neutrals:
  // the ivory #e5e5d1 reports 0.28, which looks like a real accent and is not.
  // Chroma separates them by an order of magnitude — measured across the corpus,
  // synthesised petals land at 14-20 and real conditioned accents at 140-200.
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  return chroma < 45;
}

// The pale-bloom copy says what WE DID, not what the site IS — and the
// distinction is load-bearing.
//
// "No colour of its own" is an assertion about the website, and for stripe.com,
// ente.com and figma.com it is false: those sites are vividly coloured, and
// their colour lives inside imagery, which D3 reads as content rather than
// design. We saw it and declined to credit it. Measured on stripe: masked
// chroma 0.002, unmasked 0.097 — the brand is right there in the frame.
//
// We cannot tell that case apart from a genuinely monochrome site, and analysis
// established why: the only real discriminator is whether the colour is stable
// across days (a brand gradient) or changes with the content (a photo grid),
// and that is not measurable in a single visit. unsplash.com swung 1000x in
// chroma between two days with a completely different accent.
//
// So the copy stops claiming to know. "No colour we could read as part of its
// design" is true in BOTH cases, and it needs no threshold to decide between
// them — which matters, because a threshold here would be guessing on exactly
// the measurements least able to support it.
const PALE = {
  few:      ['A few flowers', 'no colour we could read as part of its design, so the bloom is ivory'],
  medium:   ['Flowering', 'richly designed, but with no colour we could read as part of that design'],
  abundant: ['Heavily flowering', 'a great deal of visual design, and no colour we could credit to it'],
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

  // Describe the tree that actually GREW, not the raw contract. An autumn site
  // still carries flowers.amount in its DNA, but autumn trees carry no flowers
  // — their accent arrives as fruit — so reading the contract here told the
  // user "Flowering", with swatches, under a tree that has none. dnaToParams is
  // the single place that decides, so ask it rather than restating the rule.
  let effective = dna.flowers?.amount;
  try { effective = dnaToParams(dna).params.flowers ?? effective; } catch { /* keep the contract's */ }
  const pale = isPaleFallback(dna.flowers?.primary);
  const cols = [dna.flowers?.primary, dna.flowers?.secondary].filter(Boolean);
  add((pale && PALE[effective]) || FLOWERS[effective],
      effective !== 'none' && cols.length ? cols : null);

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
  // github.com/<nonexistent> answered "We could not find a page at github.com",
  // which reads as though the DOMAIN were missing. github.com is fine; the path
  // is not, and the difference is the whole of what the person needs to know.
  NOT_FOUND:   [(d) => hasPath(lastUrl) ? `We could not find that page on ${d}.`
                                        : `We could not find a page at ${d}.`, false],
  REDIRECTED:  [(d) => `${d} sent us somewhere else, so we stopped.`, false],
  EMPTY_PAGE:  [(d) => `There was nothing on ${d} to read.`, false],
  // A PDF or an image is not a failure of the site and not a failure of ours —
  // there is simply no design there to grow a tree from.
  NOT_A_PAGE:  [() => 'That address is a file rather than a web page, so there is no design to read.', false],
};

// Did the person ask for a particular page, or just for a site?
function hasPath(raw) {
  try {
    const u = new URL(/^https?:\/\//i.test(raw || '') ? raw : 'https://' + raw);
    return u.pathname.length > 1 || !!u.search;
  } catch { return false; }
}

function failureText(failure, domain) {
  const entry = FAILURE_COPY[failure?.code];
  const d = domain || 'that site';
  if (!entry) return ['We could not read that website.', true];
  return [entry[0](d), entry[1]];
}

// --- grow -----------------------------------------------------------------
let lastUrl = null;
// Which grow is the live one. A superseded grow must not write the UI when it
// returns — otherwise the older request, arriving later, overwrites the newer
// tree with its own and the page settles on the address the user abandoned.
let growToken = 0;
let inflight = null;

async function grow(raw) {
  const mine = ++growToken;
  if (inflight) inflight.abort();       // stop waiting on the read they replaced
  const ac = (inflight = new AbortController());
  lastUrl = raw;
  // Timed from here, not from the server's analysis alone. The wood is built by
  // marching cubes AFTER /api/grow returns, and that is the larger half of the
  // wait — reporting the analysis time told the user 2.9s while they sat for 13.
  const t0 = performance.now();
  state('analyzing', 'Reading your website…');
  // The numbers are the real ones: a warm read is 4-8s, a cold function 15-30s,
  // and 45s is where the budget ends and a TIMEOUT is returned.
  reassure([
    [9000,  'Still reading. Richly built sites take longer than plain ones.'],
    [22000, 'This one is a heavy site. Giving it a little longer.'],
    [38000, 'Almost at our limit for this one.'],
  ]);

  let data;
  try {
    const res = await fetch('/api/grow', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: raw }),
      signal: ac.signal,
    });
    data = await res.json();
  } catch (err) {
    // An abort is not a failure: the person asked for something else.
    if (mine !== growToken || err?.name === 'AbortError') return;
    return state('error', 'Could not reach the Plants server. Is it still running?');
  }
  if (mine !== growToken) return;

  if (!data.ok) {
    const [text, retryable] = failureText(data.failure, data.domain);
    // BARE EARTH, not the last site's tree. The canvas keeps whatever it drew,
    // so a failure after a success printed "we could not read X" across a fully
    // grown tree belonging to something else. Taste's ruling: show the island
    // with grass, stones and tree all suppressed — terrain is MEASURED too, so
    // a full lawn under a failure fabricates data we never obtained, and a seed
    // or a stunted tree would assert a measurement we do not have. It is the
    // stage without the content.
    try {
      if (tree) await tree.setEarth();
      else tree = mountEarth(sceneEl, { autoRotate: true });
    } catch (err) { console.error(err); }
    if (mine !== growToken) return;     // superseded while the island came up
    return state('error', text, retryable);
  }

  state('growing', 'Growing something…');
  // The wood is marching cubes over a signed distance field, 1.5-2.5s warm and
  // longer on a phone. It is the half of the wait nobody expects, because by
  // now the website has already been read.
  reassure([[4000, 'Building the wood — this is the last part.']]);
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
    // The renderer aborts a build in flight when a newer setDNA arrives; that is
    // the expected path when a second address superseded this one.
    if (mine !== growToken || err?.name === 'AbortError') return;
    console.error(err);
    return state('error', 'The tree failed to grow. See the console.');
  }
  if (mine !== growToken) return;

  state('ready');
  result.classList.remove('example');   // from here it is theirs, not ours
  setSky(tree?.envName ?? null);
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
  if (!b) return;
  input.value = b.dataset.site;
  grow(b.dataset.site);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = input.value.trim();
  if (v) grow(v);
});

const preset = new URLSearchParams(location.search).get('site');
if (preset) { input.value = preset; grow(preset); }
else state('idle', 'Paste a website address to grow its tree.');

// Retry re-runs the same address. Worth offering because the failure really is
// transient: a warm browser reads in 3-8s where a cold one takes 14-21s.
retryBtn.addEventListener('click', () => { if (!busy && lastUrl) grow(lastUrl); });

resultHead.addEventListener('click', () => {
  const open = result.classList.toggle('open');
  resultHead.setAttribute('aria-expanded', String(open));
});

// THE SKY IS NOW THE PAGE BACKGROUND, so the interface has to survive both ends
// of it: pale daylight and a near-black night. 11 of 56 corpus sites go to
// night, and without this the entire UI vanishes on them.
//
// The environment state is READ FROM THE DNA rather than guessed from the
// rendered pixels, and via dnaToParams rather than by re-deriving the
// luminance rule here — that rule lives in one place and a second copy would
// drift, which is the same mistake this file already made once with the
// accent floor.
function setSky(name) {
  // The renderer reports the sky that is ON SCREEN, not the one requested — on a
  // swap that is the moment the new tree is whole. So the interface changes with
  // the picture behind it rather than ahead of it. `null` (before the first
  // frame, and always on ?engine=v0) means day.
  document.body.classList.toggle('night', name === 'night');
}

// NO DEFAULT TREE ON LOAD, and the reason is worth keeping.
//
// The obvious immersive move is to open on a tree. Two things kill it. A default
// tree pays the full 1.5-2.5s wood build, so the page would open on sky and
// island anyway and then grow a tree nobody asked for, competing with the one
// the user is about to request. And DEFAULT_DNA belongs to no website, which
// sits badly beside the failure-state rule that we never draw a value we did
// not measure.
//
// visual-3d proposed the elegant version — make the default tree PLANTS' OWN
// PAGE, measured like any other site, so nothing on screen is ever unmeasured.
// It cannot work, and this redesign is why: our page is now a full-bleed canvas,
// so the analyzer would read canvasArea ~1.0 and hit the canvas-dominant
// exclusion, the same degenerate reading that made bruno-simon score 1.0. The
// product becomes unable to measure itself by becoming what it renders.
//
// So the page opens on sky and an empty island, with the idle copy as the
// invitation. An empty planter waiting for something is a better first frame
// than a stranger's tree.
//
// IDLE IS ITS OWN STATE, not a reuse of the failure island. Both are bare soil,
// but failure frames TIGHT on the island on purpose — framed like a tree scene
// it would draw a tree-shaped void, the very thing it is saying it could not
// produce. Idle wants exactly that void, because here it is the invitation. So
// idle is framed as a TREE scene: the island sits low with sky above it where
// the tree will go, and measured through the handle the camera moves by ZERO
// when the real tree arrives. Nothing jumps. That stillness is the whole idea.
// ALWAYS, even when ?site= means a grow starts immediately. The analysis takes
// 4-15s, and without this the page is the body's flat background for all of it —
// on a full-bleed page that is not a loading state, it is a blank website. The
// island goes up in ~60ms and the tree swaps into it when whole, so there is
// never a frame with nothing in it. The grow path finds `tree` already set and
// takes the setDNA branch, which is the same swap the renderer uses everywhere.
try { tree = mountIdle(sceneEl, { autoRotate: true, onEnv: setSky }); }
catch (err) { console.error(err); }

// THE OPENING FRAME IS A REAL TREE, and this is a reversal of the note above.
//
// That note is still right about what it rejects. What it rejected was a
// DEFAULT tree: DEFAULT_DNA belonging to no website, which would draw a value
// we never measured. This is not that. Every number in gallery.json came out of
// the ordinary analyzer reading an ordinary site, and the panel that opens
// underneath it is the same "Why this tree?" panel a live result gets, because
// it is the same kind of object.
//
// What changed is that the empty island was looked at rather than reasoned
// about. Framed for a tree and given none, it is a cropped brown disc filling
// the lower third with an invitation card floating in dead centre — the same
// place the status card sits. It does not read as a planter waiting for
// something. It reads as a page that failed to load, which is the one thing a
// first frame must never do: a visitor arriving from a link has no idea yet
// that trees are the point, and the frame that is supposed to tell them says
// nothing at all. It is also, exactly, what our FAILURE state looks like.
//
// The other objection — that a default tree competes with the one the user is
// about to ask for — is answered by the renderer rather than by argument.
// setDNA aborts a build in flight and keeps the old scene up until the new one
// is whole, so a person who types while the example is still building simply
// takes it over; their tree wins every race, and the UI guards below make sure
// the example never writes over their result.
//
// It is LABELLED, always, and the label is the whole of its honesty: the panel
// names the site and says "an example". It is never presented as the visitor's.
const EXAMPLE_POOL = ['gov.uk', 'art.yale.edu', 'en.wikipedia.org', 'threejs.org'];

async function showExample() {
  let gallery;
  // Cached DNA, shipped with the page: no analyzer, no network beyond this file,
  // so the opening tree costs the wood build alone and cannot fail the way a
  // live read can. An opening frame that depends on a site being up is not an
  // opening frame.
  try { gallery = await (await fetch('/gallery.json')).json(); }
  catch { return; }                       // no gallery: the island stands, as before
  const pool = EXAMPLE_POOL.filter((s) => gallery?.sites?.[s]);
  if (!pool.length || busy || lastUrl) return;
  const site = pool[Math.floor(Math.random() * pool.length)];

  try {
    await (tree ? tree.setDNA(gallery.sites[site])
                : (tree = mountTree(sceneEl, gallery.sites[site], { autoRotate: true })).ready);
  } catch (err) {
    // AbortError is the expected outcome when the visitor beat us to it.
    if (err?.name !== 'AbortError') console.error(err);
    return;
  }
  if (busy || lastUrl) return;            // they got there first — leave their state alone

  state('ready');
  setSky(tree?.envName ?? null);
  domainEl.textContent = site;
  stampEl.textContent = 'an example — grow your own';
  result.classList.add('example');
  renderWhy(gallery.sites[site]);
  cacheNote.hidden = true;
  result.hidden = false;
}

if (!preset) showExample();

