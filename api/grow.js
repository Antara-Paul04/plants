// The grow endpoint, as a serverless function.
//
// Browser state can be reused within a warm function instance. Cold starts still
// need room to launch Chromium. Failures are explicit; no cached corpus fallback.
import { analyzeUrl, fingerprintToDna } from '../analysis/lib/analyze.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, failure: { code: 'METHOD', message: 'POST only.' } });
    return;
  }
  const started = Date.now();
  const abort = new AbortController();
  res.on?.('close', () => { if (!res.writableEnded) abort.abort(); });
  let url = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    url = String(body.url || '').trim();
  } catch { /* fall through to the invalid-URL answer below */ }

  if (!url) {
    res.status(200).json({ ok: false, failure: { code: 'INVALID_URL', message: 'That does not look like a website address.' } });
    return;
  }

  try {
    // Site work gets 50 seconds; the 55-second wall cap includes browser startup
    // and leaves room for an honest response before the platform's 60-second cap.
    const result = await analyzeUrl(url, { budgetMs: 50000, wallMs: 55000, signal: abort.signal });
    if (!result || result.ok === false) {
      res.status(200).json({
        ok: false, live: true,
        domain: result?.domain ?? url,
        failure: result?.failure ?? { code: 'INTERNAL', message: 'We could not read that website.' },
      });
      return;
    }
    const dna = fingerprintToDna(result.fingerprint, result.domain);
    res.status(200).json({
      ok: true, live: true,
      domain: result.domain,
      url: result.url,
      dna,
      captureScope: result.captureScope,
      timingMs: Date.now() - started,
    });
  } catch (err) {
    console.error('analyze failed:', err?.message);
    res.status(200).json({
      ok: false, live: true, domain: url,
      failure: { code: 'INTERNAL', message: 'Something went wrong on our side while reading that site.' },
    });
  }
}
