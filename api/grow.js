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
    // A LARGER BUDGET THAN LOCAL, because the browser here is always cold.
    //
    // BUDGET_MS is 20s and was tuned against a laptop that keeps one browser warm
    // between requests: 3-8s warm against 14-21s cold. A lambda gets no such
    // reuse, so a site this laptop reads in 13s can exceed 20s here purely on the
    // launch — monopo.london was exactly that, growing locally and timing out
    // deployed.
    //
    // 45s sits inside maxDuration 60 with room for the response, and it is raised
    // HERE rather than in analyze.js so the local default — and every measurement
    // ever taken against it — is unchanged by construction.
    // 45s was the whole of the 60s maxDuration we dared use, and it was the
    // wrong 45s: it started before the browser did. Reproduced on a freshly
    // deployed (cold) function at concurrency 4 — 5 of 8 heavy sites grew, and
    // all three failures were cut off EXACTLY at 45000ms with fifteen seconds of
    // maxDuration unused. Concurrent invocations share an instance's CPU, so a
    // site that reads in 24s alone takes 32s beside three others, and the budget
    // was tuned on the warm, serial case.
    //
    // budgetMs is now the time the SITE gets, starting after the browser is up;
    // wallMs is the absolute cap from invocation, which exists because the
    // platform kills the function at maxDuration and a killed function returns
    // nothing at all — no failure copy, no retry button, a dead request.
    // 50 + a cold launch (~4.4s measured) + the response sits inside 55, which
    // sits inside 60.
    const result = await analyzeUrl(url, { budgetMs: 50000, wallMs: 55000 });
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
