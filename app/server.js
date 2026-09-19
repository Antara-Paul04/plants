// Plants V0 — the smallest server that makes the pipeline real.
//
//   URL -> analysis -> fingerprint -> botanical DNA -> 3D tree
//
// Zero dependencies of its own. Analysis brings Playwright; the renderer is
// static ES modules served straight from prototype/src.
//
// Run:  node app/server.js      then open http://localhost:5170

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const PORT = Number(process.env.PORT) || 5170;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

// --- analysis -------------------------------------------------------------
// Loaded lazily and tolerantly: the analysis domain owns this module, and the
// server must still boot (serving cached DNA) if it is absent or broken.
let analysis = null;
let analysisError = null;

async function loadAnalysis() {
  if (analysis || analysisError) return analysis;
  try {
    const mod = await import('../analysis/lib/analyze.js');
    if (typeof mod.analyzeUrl !== 'function' || typeof mod.fingerprintToDna !== 'function') {
      throw new Error('analyze.js loaded but does not export analyzeUrl + fingerprintToDna');
    }
    analysis = mod;
    console.log('  live analysis: ready');
  } catch (err) {
    analysisError = err;
    console.log(`  live analysis: UNAVAILABLE (${err.message.split('\n')[0]})`);
    console.log('  falling back to cached corpus DNA — /api/grow will report live:false');
  }
  return analysis;
}

// --- cached fallback ------------------------------------------------------
// Real fingerprints measured from real sites, just not measured *now*. Used
// only when live analysis is unavailable, and always labelled as such so we
// never pretend arbitrary-URL support works when it does not.
let cache = null;
async function cachedDna(domain) {
  if (!cache) {
    try {
      cache = JSON.parse(await readFile(join(ROOT, 'analysis/results/dna.json'), 'utf8'));
    } catch { cache = { sites: [] }; }
  }
  const hit = cache.sites.find((s) => s.domain === domain || s.domain.endsWith(`.${domain}`));
  return hit || null;
}

// --- helpers --------------------------------------------------------------
function normalizeUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u;
  try { u = new URL(s); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (!u.hostname.includes('.') || /\s/.test(u.hostname)) return null;
  return u;
}

const send = (res, code, body, type = 'application/json; charset=utf-8') => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

async function serveStatic(res, baseDir, relPath) {
  const safe = normalize(relPath).replace(/^(\.\.[/\\])+/, '');
  const file = join(baseDir, safe);
  if (!file.startsWith(baseDir)) return send(res, 403, { error: 'forbidden' });
  try {
    const s = await stat(file);
    if (s.isDirectory()) return serveStatic(res, baseDir, join(safe, 'index.html'));
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    send(res, 404, { error: 'not found' });
  }
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let n = 0;
    const chunks = [];
    req.on('data', (c) => {
      n += c.length;
      if (n > 64 * 1024) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

// --- the one real endpoint ------------------------------------------------
async function grow(req, res) {
  let payload;
  try { payload = JSON.parse(await readBody(req) || '{}'); }
  catch { return send(res, 400, { ok: false, failure: { code: 'bad_request', message: 'Could not read that request.' } }); }

  const u = normalizeUrl(payload.url);
  if (!u) {
    return send(res, 400, {
      ok: false,
      failure: { code: 'invalid_url', message: "That doesn't look like a website address. Try something like stripe.com." },
    });
  }
  const domain = u.hostname.replace(/^www\./, '');
  const started = Date.now();

  const mod = await loadAnalysis();

  if (mod) {
    try {
      const result = await mod.analyzeUrl(u.toString());
      if (!result || result.ok === false) {
        const f = (result && result.failure) || { code: 'analysis_failed', message: 'We could not read that website.' };
        return send(res, 200, { ok: false, live: true, domain, failure: f });
      }
      const dna = mod.fingerprintToDna(result.fingerprint, domain);
      return send(res, 200, {
        ok: true, live: true, domain,
        url: result.url || u.toString(),
        fingerprint: result.fingerprint,
        dna,
        timingMs: Date.now() - started,
      });
    } catch (err) {
      console.error('analyze failed:', err.message);
      return send(res, 200, {
        ok: false, live: true, domain,
        failure: { code: 'analysis_error', message: 'Something went wrong while reading that website.' },
      });
    }
  }

  // Fallback: cached real fingerprints. Never silently pretends to be live.
  const hit = await cachedDna(domain);
  if (!hit) {
    return send(res, 200, {
      ok: false, live: false, domain,
      failure: {
        code: 'no_live_analysis',
        message: 'Live analysis is unavailable, and this site is not in the cached corpus.',
      },
    });
  }
  return send(res, 200, {
    ok: true, live: false, domain,
    fingerprint: hit.fingerprint || null,
    dna: hit.dna,
    why: hit.why || null,
    timingMs: Date.now() - started,
  });
}

// --- routing --------------------------------------------------------------
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (req.method === 'POST' && path === '/api/grow') return grow(req, res);

  if (path === '/api/health') {
    await loadAnalysis();
    return send(res, 200, { ok: true, liveAnalysis: Boolean(analysis), reason: analysisError?.message ?? null });
  }

  // Cached corpus DNA, for the comparison view.
  if (path === '/api/corpus') {
    try {
      const raw = await readFile(join(ROOT, 'analysis/results/dna.json'), 'utf8');
      return send(res, 200, raw);
    } catch {
      return send(res, 200, { sites: [] });
    }
  }

  // The renderer is served straight out of the 3D domain — no copies, so the
  // app can never drift from the prototype.
  if (path.startsWith('/tree/')) return serveStatic(res, join(ROOT, 'prototype/src'), path.slice('/tree/'.length));

  return serveStatic(res, join(ROOT, 'app/public'), path === '/' ? 'index.html' : path);
});

server.listen(PORT, () => {
  console.log(`\n  Plants V0  →  http://localhost:${PORT}\n`);
  loadAnalysis();
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    try { await analysis?.closeBrowser?.(); } catch {}
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
