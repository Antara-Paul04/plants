// EXPERIMENT — winter's colourfulness ceiling and fruit's accent-area floor mutually
// exclude: any region large enough to be fruit (>=1% of frame) drags whole-frame
// colourfulness to ~0.16, well over winter's 0.06. So no winter tree can carry a berry.
// Proposal under test: measure winter's colourfulness with the LARGEST ACCENT REGION
// REMOVED, so "a monochrome page with one small saturated element" reads as monochrome
// AND carries a berry — without moving either threshold.
export async function winterMeasure(arg) {
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
    const x0=Math.max(0,Math.floor(r.x*scale)), y0=Math.max(0,Math.floor(r.y*scale));
    const x1=Math.min(W,Math.ceil((r.x+r.w)*scale)), y1=Math.min(H,Math.ceil((r.y+r.h)*scale));
    for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) blocked[y*W+x]=1;
  }
  // chromatic mask (same definition as the palette, so regions and accents agree)
  const chrom = new Uint8Array(W * H);
  for (let i = 0; i < W*H; i++) {
    if (blocked[i]) continue;
    const o=i*4; if (d[o+3]<16) continue;
    const r=d[o],g=d[o+1],b=d[o+2];
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b),c=mx-mn,l=(mx+mn)/2/255;
    const sat=c===0?0:(c/255)/(1-Math.abs(2*l-1)||1);
    if (sat>=0.18 && c>=28 && l>0.06 && l<0.96) chrom[i]=1;
  }
  // largest connected chromatic region
  const labels=new Int32Array(W*H).fill(-1); const stack=new Int32Array(W*H);
  let best=-1,bestSize=0;
  for(let start=0;start<W*H;start++){
    if(!chrom[start]||labels[start]!==-1)continue;
    const id=start; let sp=0,size=0; stack[sp++]=start; labels[start]=id;
    while(sp>0){const p=stack[--sp];size++;const x=p%W,y=(p/W)|0;
      if(x>0&&chrom[p-1]&&labels[p-1]===-1){labels[p-1]=id;stack[sp++]=p-1;}
      if(x<W-1&&chrom[p+1]&&labels[p+1]===-1){labels[p+1]=id;stack[sp++]=p+1;}
      if(y>0&&chrom[p-W]&&labels[p-W]===-1){labels[p-W]=id;stack[sp++]=p-W;}
      if(y<H-1&&chrom[p+W]&&labels[p+W]===-1){labels[p+W]=id;stack[sp++]=p+W;}}
    if(size>bestSize){bestSize=size;best=id;}
  }
  // Hasler-Susstrunk colourfulness, with and without that one region
  const colourfulness = (skipLargest) => {
    let n=0,sRG=0,sRG2=0,sYB=0,sYB2=0;
    for(let i=0;i<W*H;i++){
      if(blocked[i])continue;
      if(skipLargest&&best>=0&&labels[i]===best)continue;
      const o=i*4; if(d[o+3]<16)continue;
      const r=d[o],g=d[o+1],b=d[o+2];
      n++; const rg=r-g, yb=0.5*(r+g)-b;
      sRG+=rg;sRG2+=rg*rg;sYB+=yb;sYB2+=yb*yb;
    }
    if(!n)return 0;
    const mRG=sRG/n,mYB=sYB/n;
    const vRG=Math.max(0,sRG2/n-mRG*mRG), vYB=Math.max(0,sYB2/n-mYB*mYB);
    return Math.min(1,(Math.sqrt(vRG+vYB)+0.3*Math.sqrt(mRG*mRG+mYB*mYB))/110);
  };
  return {
    colourfulness: +colourfulness(false).toFixed(4),
    colourfulnessExAccent: +colourfulness(true).toFixed(4),
    largestRegionFrac: +(bestSize/(W*H)).toFixed(4)
  };
}
