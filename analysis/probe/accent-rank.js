// EXPERIMENT — how should accent hue bins be RANKED? Currently by raw pixel count, which
// gives stripe.com a pale cream hero wash as `primary` and demotes its brand purple.
export async function binStats(arg) {
  const { pngB64, maskRects, docW } = arg;
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + pngB64; });
  const W = Math.min(420, img.width), H = Math.round(img.height * (W / img.width));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const scale = (img.width / (docW || img.width)) * (W / img.width);
  const blocked = new Uint8Array(W * H);
  for (const r of (maskRects || [])) {
    const x0 = Math.max(0, Math.floor(r.x * scale)), y0 = Math.max(0, Math.floor(r.y * scale));
    const x1 = Math.min(W, Math.ceil((r.x + r.w) * scale)), y1 = Math.min(H, Math.ceil((r.y + r.h) * scale));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) blocked[y * W + x] = 1;
  }
  // OKLab chroma: perceptual, and unlike HSL saturation it does not inflate near white.
  // HSL reports stripe's pale cream at 0.93 saturation, which is why HSL cannot be used.
  const okChroma = (r, g, b) => {
    const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const R = f(r), G = f(g), B = f(b);
    const l = Math.cbrt(0.4122214708*R + 0.5363325363*G + 0.0514459929*B);
    const m = Math.cbrt(0.2119034982*R + 0.6806995451*G + 0.1073969566*B);
    const s = Math.cbrt(0.0883024619*R + 0.2817188376*G + 0.6299787005*B);
    const A = 1.9779984951*l - 2.4285922050*m + 0.4505937099*s;
    const Bb = 0.0259040371*l + 0.7827717662*m - 0.8086757660*s;
    return Math.sqrt(A*A + Bb*Bb);
  };
  const bins = new Map(); let n = 0;
  for (let i = 0; i < W * H; i++) {
    if (blocked[i]) continue;
    const o = i * 4; if (d[o+3] < 16) continue;
    const r = d[o], g = d[o+1], b = d[o+2];
    n++;
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b), c = mx - mn;
    const l = (mx + mn) / 2 / 255;
    const sat = c === 0 ? 0 : (c/255) / (1 - Math.abs(2*l - 1) || 1);
    if (sat < 0.18 || c < 28 || l <= 0.06 || l >= 0.96) continue;
    let h = 0;
    if (mx === r) h = (((g-b)/c) % 6 + 6) % 6; else if (mx === g) h = (b-r)/c + 2; else h = (r-g)/c + 4;
    h = (h * 60 + 360) % 360;
    const k = Math.floor(h / 15) * 15;
    const e = bins.get(k) || { k, n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b; bins.set(k, e);
  }
  const hex = (r,g,b) => '#' + [r,g,b].map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
  return [...bins.values()].map(e => {
    const R = e.r/e.n, G = e.g/e.n, B = e.b/e.n;
    return { hue: e.k, hex: hex(R,G,B), coverage: +(e.n/n).toFixed(5),
             rgbChroma: Math.round(Math.max(R,G,B) - Math.min(R,G,B)),
             okChroma: +okChroma(R,G,B).toFixed(4) };
  }).sort((a,b) => b.coverage - a.coverage);
}
