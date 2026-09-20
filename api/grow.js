// The grow endpoint, as a serverless function.
//
// app/server.js stays the local development server; this is the same call for a
// platform that gives us one request and no process to keep. Two differences
// matter and both are about not having a machine:
//
//   - THE BROWSER IS NOT REUSED ACROSS REQUESTS. Locally a warm browser reads in
//     3-8s against 14-21s cold, and every latency number in this repo assumes the
//     warm path. A lambda may or may not be warm and we do not control which, so
//     expect the cold figure until measured against the deployment.
//   - THERE IS NO CACHED-CORPUS FALLBACK. Locally that exists so the product
//     degrades honestly when the analyzer is unavailable; here, if analysis fails
//     the honest answer is the failure itself.
import { analyzeUrl, fingerprintToDna } from '../analysis/lib/analyze.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, failure: { code: 'METHOD', message: 'POST only.' } });
    return;
  }
  const started = Date.now();
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
    const result = await analyzeUrl(url);
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
      fingerprint: result.fingerprint,
      dna,
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
