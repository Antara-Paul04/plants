import { readFile } from 'node:fs/promises';

export async function sendNotFound(req, res) {
  const html = await readFile(new URL('../app/public/404.html', import.meta.url));
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(req.method === 'HEAD' ? undefined : html);
}
