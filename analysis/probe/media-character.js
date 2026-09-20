// EXPERIMENT for P3 — can what we ALREADY measure separate brand illustration from
// photography? Lead's instinct: illustration = few hues, large flat regions;
// photography = many hues, no flat regions. Measured INSIDE the media rects only.
export async function mediaCharacter(arg) {
  const { pngB64, maskRects, docW } = arg;
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + pngB64; });
  const W = Math.min(420, img.width), H = Math.round(img.height * (W / img.width));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const scale = (img.width / (docW || img.width)) * (W / img.width);
  const inMedia = new Uint8Array(W * H); let mediaPx = 0;
  for (const r of (maskRects || [])) {
    const x0 = Math.max(0, Math.floor(r.x*scale)), y0 = Math.max(0, Math.floor(r.y*scale));
    const x1 = Math.min(W, Math.ceil((r.x+r.w)*scale)), y1 = Math.min(H, Math.ceil((r.y+r.h)*scale));
    for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++) if(!inMedia[y*W+x]){inMedia[y*W+x]=1;mediaPx++;}
  }
  if (mediaPx < 500) return { mediaPx, hueBins: 0, flatShare: 0, gradientShare: 0 };
  // distinct hue bins inside media, and how much of it is FLAT (neighbours identical)
  const bins = new Set(); let flat = 0, near = 0, counted = 0;
  for (let y = 1; y < H-1; y++) for (let x = 1; x < W-1; x++) {
    const i = y*W+x; if (!inMedia[i]) continue;
    const o = i*4; const r=d[o],g=d[o+1],b=d[o+2];
    counted++;
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b),c=mx-mn;
    if (c >= 28) { let h=0; if(mx===r)h=(((g-b)/c)%6+6)%6; else if(mx===g)h=(b-r)/c+2; else h=(r-g)/c+4;
      bins.add(Math.floor(((h*60)+360)%360/15)); }
    // flat = identical to right/below neighbour; nearFlat = within a hair (gradients)
    const o2=(i+1)*4, o3=(i+W)*4;
    const dr=Math.abs(r-d[o2])+Math.abs(g-d[o2+1])+Math.abs(b-d[o2+2]);
    const db=Math.abs(r-d[o3])+Math.abs(g-d[o3+1])+Math.abs(b-d[o3+2]);
    if (dr === 0 && db === 0) flat++;
    else if (dr <= 6 && db <= 6) near++;
  }
  return { mediaPx, hueBins: bins.size,
           flatShare: +(flat/(counted||1)).toFixed(4),
           gradientShare: +((flat+near)/(counted||1)).toFixed(4) };
}
