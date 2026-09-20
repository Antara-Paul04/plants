// EXPERIMENT — "what does VISUALLY RICH mean from pixels alone?"
// Deliberately NOT ink coverage: a full-bleed photograph of a wall must not score high.
// Runs in a scratch page against a saved screenshot; no re-crawl.
export async function measureRichness(arg) {
  const { pngB64 } = arg;
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + pngB64; });
  const W = Math.min(480, img.width), H = Math.round(img.height * (W / img.width));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const lum = i => 0.2126 * d[i*4] + 0.7152 * d[i*4+1] + 0.0722 * d[i*4+2];

  // ---- edges: Sobel, separated into axis-aligned vs oblique -------------------
  // A designed layout is built from boxes, rules and text lines, so its strong edges
  // are overwhelmingly horizontal/vertical. Photographic texture is isotropic.
  let edges = 0, axis = 0, gsum = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx = -lum(i-W-1) - 2*lum(i-1) - lum(i+W-1) + lum(i-W+1) + 2*lum(i+1) + lum(i+W+1);
      const gy = -lum(i-W-1) - 2*lum(i-W) - lum(i-W+1) + lum(i+W-1) + 2*lum(i+W) + lum(i+W+1);
      const g = Math.hypot(gx, gy);
      gsum += g;
      if (g > 60) {
        edges++;
        const ang = Math.atan2(Math.abs(gy), Math.abs(gx)) * 180 / Math.PI; // 0=vert edge,90=horiz
        if (ang < 18 || ang > 72) axis++;
      }
    }
  }
  const px = (W - 2) * (H - 2);
  const edgeDensity = edges / px;
  const axisAlignedRatio = edges ? axis / edges : 0;

  // ---- tonal structure: how many distinct luminance plateaus the design uses ----
  const hist = new Array(32).fill(0);
  for (let i = 0; i < W * H; i++) hist[Math.min(31, Math.floor(lum(i) / 8))]++;
  const tot = W * H;
  const toneLevels = hist.filter(c => c / tot > 0.01).length;
  const sorted = [...Array(W*H).keys()].map(lum).sort((a,b)=>a-b);
  const contrastRange = (sorted[Math.floor(sorted.length*0.95)] - sorted[Math.floor(sorted.length*0.05)]) / 255;

  // ---- visual variety: distinct colour regions holding real area ---------------
  const buckets = new Map();
  for (let i = 0; i < W * H; i++) {
    const k = ((d[i*4]>>4)<<8) | ((d[i*4+1]>>4)<<4) | (d[i*4+2]>>4);
    buckets.set(k, (buckets.get(k) || 0) + 1);
  }
  const regionCount = [...buckets.values()].filter(c => c / tot > 0.005).length;

  // ---- multi-scale: does detail survive downscaling? Texture dies, structure lives
  const small = document.createElement('canvas'); small.width = Math.round(W/4); small.height = Math.round(H/4);
  const sctx = small.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(cv, 0, 0, small.width, small.height);
  const sd = sctx.getImageData(0, 0, small.width, small.height).data;
  const slum = i => 0.2126*sd[i*4] + 0.7152*sd[i*4+1] + 0.0722*sd[i*4+2];
  let sEdges = 0;
  for (let y = 1; y < small.height-1; y++) for (let x = 1; x < small.width-1; x++) {
    const i = y*small.width+x;
    const gx = -slum(i-small.width-1)-2*slum(i-1)-slum(i+small.width-1)+slum(i-small.width+1)+2*slum(i+1)+slum(i+small.width+1);
    const gy = -slum(i-small.width-1)-2*slum(i-small.width)-slum(i-small.width+1)+slum(i+small.width-1)+2*slum(i+small.width)+slum(i+small.width+1);
    if (Math.hypot(gx,gy) > 60) sEdges++;
  }
  const coarseEdgeDensity = sEdges / ((small.width-2)*(small.height-2));
  // structure persists at coarse scale; noise does not
  const scalePersistence = edgeDensity ? Math.min(1, coarseEdgeDensity / edgeDensity) : 0;

  return {
    edgeDensity: +edgeDensity.toFixed(4),
    axisAlignedRatio: +axisAlignedRatio.toFixed(3),
    toneLevels,
    contrastRange: +contrastRange.toFixed(3),
    regionCount,
    coarseEdgeDensity: +coarseEdgeDensity.toFixed(4),
    scalePersistence: +scalePersistence.toFixed(3),
    meanGradient: +(gsum / px).toFixed(2)
  };
}
