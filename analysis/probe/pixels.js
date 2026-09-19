// EXPERIMENT — disposable research probe. Not product code.
// Runs INSIDE a blank scratch page. Screenshots are decoded via canvas so the probe
// needs no image library. Rendered pixels are the source of truth for colour (§C).

export async function analysePixels(arg) {
  const { pngB64, maskRects, cropH, docW } = arg;
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + pngB64; });

  const MAXW = 420;
  const s = Math.min(1, MAXW / img.width);
  const W = Math.max(1, Math.round(img.width * s));
  const H = Math.max(1, Math.round(img.height * s));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;

  // scale from document CSS px -> screenshot px -> downscaled px
  const docToPx = (img.width / (docW || img.width)) * s;
  const mask = new Uint8Array(W * H);
  let maskedCount = 0;
  for (const r of (maskRects || [])) {
    const x0 = Math.max(0, Math.floor(r.x * docToPx)), y0 = Math.max(0, Math.floor(r.y * docToPx));
    const x1 = Math.min(W, Math.ceil((r.x + r.w) * docToPx)), y1 = Math.min(H, Math.ceil((r.y + r.h) * docToPx));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { if (!mask[y * W + x]) { mask[y * W + x] = 1; maskedCount++; } }
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0; const l = (mx + mn) / 2;
    const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, sat, l];
  }
  const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

  function palette(useMask) {
    const bins = new Map();          // coarse colour buckets -> {n, r,g,b}
    const hueBins = new Map();       // chromatic clusters
    let n = 0, neutral = 0, chromatic = 0;
    let sRG = 0, sRG2 = 0, sYB = 0, sYB2 = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (useMask && mask[i]) continue;
        const o = i * 4;
        if (data[o + 3] < 16) continue;
        const r = data[o], g = data[o + 1], b = data[o + 2];
        n++;
        const rg = r - g, yb = 0.5 * (r + g) - b;
        sRG += rg; sRG2 += rg * rg; sYB += yb; sYB2 += yb * yb;
        const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        const e = bins.get(key); if (e) { e.n++; e.r += r; e.g += g; e.b += b; } else bins.set(key, { n: 1, r, g, b });
        const [h, sat, l] = rgbToHsl(r, g, b);
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        if (sat < 0.18 || chroma < 28 || l < 0.06 || l > 0.96) { neutral++; }
        else {
          chromatic++;
          const hk = Math.floor(h / 15) * 15;
          const he = hueBins.get(hk); if (he) { he.n++; he.r += r; he.g += g; he.b += b; } else hueBins.set(hk, { n: 1, r, g, b });
        }
      }
    }
    if (!n) return null;
    const mRG = sRG / n, mYB = sYB / n;
    const vRG = Math.max(0, sRG2 / n - mRG * mRG), vYB = Math.max(0, sYB2 / n - mYB * mYB);
    const colorfulnessRaw = Math.sqrt(vRG + vYB) + 0.3 * Math.sqrt(mRG * mRG + mYB * mYB);

    const sorted = [...bins.values()].sort((a, b) => b.n - a.n);
    const bg = sorted[0];
    const bgHex = hex(bg.r / bg.n, bg.g / bg.n, bg.b / bg.n);
    // "whitespace" = share of the frame occupied by the dominant background colour
    let bgLike = 0;
    const br = bg.r / bg.n, bgg = bg.g / bg.n, bb = bg.b / bg.n;
    for (let i = 0; i < W * H; i++) {
      if (useMask && mask[i]) continue;
      const o = i * 4; if (data[o + 3] < 16) continue;
      if (Math.abs(data[o] - br) + Math.abs(data[o + 1] - bgg) + Math.abs(data[o + 2] - bb) < 36) bgLike++;
    }
    const accents = [...hueBins.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 3)
      .map(([hk, e]) => ({ hex: hex(e.r / e.n, e.g / e.n, e.b / e.n), hue: hk, coverage: +(e.n / n).toFixed(4) }));
    // WARM share of chromatic coverage (bin centres 22.5/37.5/52.5 -> amber..rust).
    // Same definition as probe/hue.js so live and batch agree. Feeds the AUTUMN gate.
    let warm = 0;
    for (const [hk, e] of hueBins) { const c = hk + 7.5; if (c >= 10 && c <= 55) warm += e.n; }

    return {
      background: bgHex,
      backgroundCoverage: +(bgLike / n).toFixed(4),
      whitespaceRatio: +(bgLike / n).toFixed(4),
      neutralRatio: +(neutral / n).toFixed(4),
      chromaticRatio: +(chromatic / n).toFixed(4),
      colorfulnessRaw: +colorfulnessRaw.toFixed(2),
      colorfulness: +Math.min(1, colorfulnessRaw / 110).toFixed(4),
      accents,
      primary: accents[0] ? accents[0].hex : null,
      secondary: accents[1] ? accents[1].hex : null,
      tertiary: accents[2] ? accents[2].hex : null,
      warmShare: chromatic ? +(warm / chromatic).toFixed(4) : 0,
      distinctBuckets: bins.size,
      sampledPixels: n
    };
  }

  return {
    imageSize: { w: img.width, h: img.height }, sampled: { w: W, h: H },
    maskedFraction: +(maskedCount / (W * H)).toFixed(4),
    all: palette(false),
    mediaMasked: maskedCount > 0 ? palette(true) : null
  };
}

// Multi-frame diffing (§G). Continuous motion must change BOTH frame pairs;
// a one-shot lazy-load or late network paint changes only one.
export async function diffFrames(arg) {
  const { frames, excludeRects, docW } = arg;
  const GW = 96, GH = 60;
  const grids = [];
  for (const b64 of frames) {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas'); cv.width = GW; cv.height = GH;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, GW, GH);
    grids.push({ d: ctx.getImageData(0, 0, GW, GH).data, w: img.width, h: img.height });
  }
  const ex = new Uint8Array(GW * GH);
  let exN = 0;
  const sx = GW / (docW || grids[0].w);
  for (const r of (excludeRects || [])) {
    const x0 = Math.max(0, Math.floor(r.x * sx)), y0 = Math.max(0, Math.floor(r.y * sx));
    const x1 = Math.min(GW, Math.ceil((r.x + r.w) * sx)), y1 = Math.min(GH, Math.ceil((r.y + r.h) * sx));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (!ex[y * GW + x]) { ex[y * GW + x] = 1; exN++; }
  }
  function cmp(a, b, useEx) {
    let changed = 0, total = 0;
    for (let i = 0; i < GW * GH; i++) {
      if (useEx && ex[i]) continue;
      total++;
      const o = i * 4;
      const d = Math.abs(a[o] - b[o]) + Math.abs(a[o + 1] - b[o + 1]) + Math.abs(a[o + 2] - b[o + 2]);
      if (d > 24) changed++;
    }
    return total ? changed / total : 0;
  }
  const d12 = cmp(grids[0].d, grids[1].d, false), d23 = cmp(grids[1].d, grids[2].d, false);
  const e12 = cmp(grids[0].d, grids[1].d, true), e23 = cmp(grids[1].d, grids[2].d, true);
  return {
    diff12: +d12.toFixed(4), diff23: +d23.toFixed(4),
    sustained: +Math.min(d12, d23).toFixed(4),
    oneShot: +Math.max(0, Math.max(d12, d23) - Math.min(d12, d23)).toFixed(4),
    diff12ExMedia: +e12.toFixed(4), diff23ExMedia: +e23.toFixed(4),
    sustainedExMedia: +Math.min(e12, e23).toFixed(4),
    excludedCells: exN, gridCells: GW * GH
  };
}
