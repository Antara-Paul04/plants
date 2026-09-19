// EXPERIMENT: is screenshot diffing sensitive enough, and at what grid/threshold?
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const CHROME='/Users/antarapaul/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function grids(arg){
  const {frames, GW, GH, THRESH} = arg;
  const gs=[];
  for(const b64 of frames){
    const img=new Image();
    await new Promise((r,j)=>{img.onload=r;img.onerror=j;img.src='data:image/png;base64,'+b64;});
    const cv=document.createElement('canvas');cv.width=GW;cv.height=GH;
    const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0,GW,GH);
    gs.push(c.getImageData(0,0,GW,GH).data);
  }
  const cmp=(a,b)=>{let ch=0;for(let i=0;i<GW*GH;i++){const o=i*4;
    if(Math.abs(a[o]-b[o])+Math.abs(a[o+1]-b[o+1])+Math.abs(a[o+2]-b[o+2])>THRESH)ch++;}
    return ch/(GW*GH);};
  return {d12:cmp(gs[0],gs[1]),d23:cmp(gs[1],gs[2])};
}

const b=await chromium.launch({executablePath:CHROME,headless:true,args:['--hide-scrollbars','--mute-audio','--autoplay-policy=no-user-gesture-required']});
const sc=await (await b.newContext({viewport:{width:800,height:600}})).newPage(); await sc.goto('about:blank');
const targets=[
  ['threejs-example','https://threejs.org/examples/webgl_animation_keyframes.html'],
  ['yale-art','https://www.art.yale.edu/'],
  ['unsplash','https://unsplash.com/'],
  ['control-raw','file://'+process.cwd()+'/fixtures/raw.html']
];
const configs=[[96,60,24],[192,120,24],[192,120,12],[384,240,12]];
for(const [id,url] of targets){
  const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const p=await ctx.newPage();
  await p.goto(url,{waitUntil:'load',timeout:25000}).catch(()=>{});
  await p.waitForLoadState('networkidle',{timeout:8000}).catch(()=>{});
  await p.waitForTimeout(1800);
  const frames=[];
  for(let i=0;i<3;i++){ if(i) await p.waitForTimeout(700); frames.push((await p.screenshot({type:'png',animations:'allow'})).toString('base64')); }
  const row=[];
  for(const [GW,GH,TH] of configs){
    const r=await sc.evaluate(grids,{frames,GW,GH,THRESH:TH});
    row.push(`${GW}x${GH}/t${TH}: sust=${Math.min(r.d12,r.d23).toFixed(4)}`);
  }
  console.log(id.padEnd(17)+row.join('  '));
  await ctx.close();
}
await b.close();
