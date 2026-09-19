// EXPERIMENT — answers Lead's §4(b): is AUTUMN decidable from the V1 fingerprint?
// Recomputes full hue-coverage histograms from the SAVED screenshots (no re-crawl).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const CHROME='/Users/antarapaul/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function hueProfile(arg){
  const {pngB64, maskRects, docW} = arg;
  const img=new Image();
  await new Promise((r,j)=>{img.onload=r;img.onerror=j;img.src='data:image/png;base64,'+pngB64;});
  const MAXW=420, s=Math.min(1,MAXW/img.width);
  const W=Math.round(img.width*s), H=Math.round(img.height*s);
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,W,H);
  const d=ctx.getImageData(0,0,W,H).data;
  const scale=(img.width/(docW||img.width))*s;
  const mask=new Uint8Array(W*H);
  for(const r of (maskRects||[])){
    const x0=Math.max(0,Math.floor(r.x*scale)),y0=Math.max(0,Math.floor(r.y*scale));
    const x1=Math.min(W,Math.ceil((r.x+r.w)*scale)),y1=Math.min(H,Math.ceil((r.y+r.h)*scale));
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)mask[y*W+x]=1;
  }
  // 24 hue bins of 15 degrees, chromatic pixels only
  const prof=(useMask)=>{
    const bins=new Array(24).fill(0); let chrom=0, tot=0;
    for(let i=0;i<W*H;i++){
      if(useMask&&mask[i])continue;
      const o=i*4; if(d[o+3]<16)continue; tot++;
      const r=d[o],g=d[o+1],b=d[o+2];
      const mx=Math.max(r,g,b),mn=Math.min(r,g,b),c=mx-mn;
      const l=(mx+mn)/2/255;
      const sat=c===0?0:c/255/(1-Math.abs(2*l-1)||1);
      if(sat<0.18||c<28||l<0.06||l>0.96)continue;
      chrom++;
      let h=0;
      if(mx===r)h=(((g-b)/c)%6+6)%6; else if(mx===g)h=(b-r)/c+2; else h=(r-g)/c+4;
      h*=60; if(h<0)h+=360;
      bins[Math.floor(h/15)%24]++;
    }
    if(!chrom)return {chromaticRatio:0,warmShare:0,bins:bins,topHue:null};
    // WARM = amber/ochre/orange/rust/warm red/warm brown -> hue 10..55 deg.
    // Deliberately NARROW: pink/magenta reds and yellows-into-green are not autumn.
    let warm=0; for(let i=0;i<24;i++){const h=i*15+7.5; if(h>=10&&h<=55)warm+=bins[i];}
    const top=bins.indexOf(Math.max(...bins));
    return {chromaticRatio:+(chrom/tot).toFixed(4), warmShare:+(warm/chrom).toFixed(4),
            warmCoverage:+(warm/tot).toFixed(4), bins, topHue:top*15+7.5};
  };
  return {all:prof(false), masked:prof(true)};
}

const f=fs.readdirSync('results').filter(x=>x.startsWith('run-full')).sort().pop();
const data=JSON.parse(fs.readFileSync('results/'+f));
const b=await chromium.launch({executablePath:CHROME,headless:true});
const sc=await (await b.newContext({viewport:{width:800,height:600}})).newPage();
await sc.goto('about:blank');
const out={};
console.log('site'.padEnd(17)+'chromRatio'.padStart(11)+'warmShare'.padStart(11)+'warmCov'.padStart(10)+'topHue'.padStart(8)+'   autumn?');
for(const s of data.sites.filter(x=>x.ok)){
  const p='shots/'+s.id+'.png'; if(!fs.existsSync(p))continue;
  const png=fs.readFileSync(p).toString('base64');
  const clipH=Math.min(s.dom.docHeight,900*3);
  const r=await sc.evaluate(hueProfile,{pngB64:png,maskRects:s.dom.mediaRects.filter(m=>m.y<clipH),docW:1440});
  out[s.id]=r;
  const a=r.all;
  const verdict = (a.chromaticRatio>=0.04 && a.warmShare>=0.55) ? 'YES' : (a.warmShare>=0.40?'near':'no');
  console.log(s.id.padEnd(17)+String(a.chromaticRatio).padStart(11)+String(a.warmShare).padStart(11)+String(a.warmCoverage).padStart(10)+String(a.topHue).padStart(8)+'   '+verdict);
}
fs.writeFileSync('results/hue.json',JSON.stringify(out,null,2));
await b.close();
