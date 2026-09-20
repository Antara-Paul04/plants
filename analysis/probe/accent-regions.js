// EXPERIMENT — separates flowers from fruit by SPATIAL distribution of accent colour.
// Coverage-by-hue cannot do this: craigslist's blue (thousands of tiny link texts) and
// gov.uk's blue (one large hero band) both score ~0.97 "concentrated" on coverage alone.
// Connected components answer the question coverage cannot: how is the colour laid out?
export async function measureAccentRegions(arg) {
  const { pngB64, maskRects, docW } = arg;
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + pngB64; });
  const W = Math.min(420, img.width), H = Math.round(img.height * (W / img.width));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;

  // exclude photographic media, consistent with the palette rule (canvas/svg stay in)
  const scale = (img.width / (docW || img.width)) * (W / img.width);
  const blocked = new Uint8Array(W * H);
  for (const r of (maskRects || [])) {
    const x0 = Math.max(0, Math.floor(r.x * scale)), y0 = Math.max(0, Math.floor(r.y * scale));
    const x1 = Math.min(W, Math.ceil((r.x + r.w) * scale)), y1 = Math.min(H, Math.ceil((r.y + r.h) * scale));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) blocked[y * W + x] = 1;
  }

  // chromatic mask: the same definition the palette uses, so regions and accents agree
  const mask = new Uint8Array(W * H);
  let accentPixels = 0;
  for (let i = 0; i < W * H; i++) {
    if (blocked[i]) continue;
    const o = i * 4; if (d[o + 3] < 16) continue;
    const r = d[o], g = d[o + 1], b = d[o + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn;
    const l = (mx + mn) / 2 / 255;
    const sat = c === 0 ? 0 : (c / 255) / (1 - Math.abs(2 * l - 1) || 1);
    if (sat >= 0.18 && c >= 28 && l > 0.06 && l < 0.96) { mask[i] = 1; accentPixels++; }
  }
  if (!accentPixels) return { accentPixels: 0, regions: 0, topShare: 0, meanRegionPx: 0, concentration: 0, largestRegionFrac: 0 };

  // 4-connected components, iterative (no recursion depth limit)
  const labels = new Int32Array(W * H).fill(-1);
  const sizes = [];
  const stack = new Int32Array(W * H);
  for (let start = 0; start < W * H; start++) {
    if (!mask[start] || labels[start] !== -1) continue;
    const id = sizes.length; let sp = 0, size = 0;
    stack[sp++] = start; labels[start] = id;
    while (sp > 0) {
      const p = stack[--sp]; size++;
      const x = p % W, y = (p / W) | 0;
      if (x > 0     && mask[p-1] && labels[p-1]===-1) { labels[p-1]=id; stack[sp++]=p-1; }
      if (x < W - 1 && mask[p+1] && labels[p+1]===-1) { labels[p+1]=id; stack[sp++]=p+1; }
      if (y > 0     && mask[p-W] && labels[p-W]===-1) { labels[p-W]=id; stack[sp++]=p-W; }
      if (y < H - 1 && mask[p+W] && labels[p+W]===-1) { labels[p+W]=id; stack[sp++]=p+W; }
    }
    sizes.push(size);
  }
  sizes.sort((a, b) => b - a);
  const MIN = 6;                                   // ignore antialiasing speckle
  const real = sizes.filter(s => s >= MIN);
  const realTotal = real.reduce((a, b) => a + b, 0) || 1;
  const topShare = real.length ? real[0] / realTotal : 0;
  const meanRegionPx = real.length ? realTotal / real.length : 0;
  const frame = W * H;

  // CONCENTRATION: high when accent colour lives in FEW LARGE areas, low when it is
  // scattered across MANY SMALL ones. Deliberately combines both, because either alone
  // is foolable — one big region plus noise, or many medium regions.
  const bigRegions = real.filter(s => s / frame > 0.004).length;
  const concentration = Math.max(0, Math.min(1,
      0.55 * topShare
    + 0.45 * (1 - Math.min(1, real.length / 40))
    - (bigRegions > 6 ? 0.15 : 0)));

  return {
    accentPixels, regions: real.length,
    topShare: +topShare.toFixed(3),
    meanRegionPx: +meanRegionPx.toFixed(1),
    largestRegionFrac: +(real.length ? real[0] / frame : 0).toFixed(4),
    bigRegions,
    concentration: +concentration.toFixed(3)
  };
}
