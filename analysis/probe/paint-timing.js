// How long does each site need to reach stable paint? Measured UNCONTENDED, because the
// question is a property of the site, not of this laptop under eight-way load.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const CHROME=process.env.PLANTS_CHROME||'/Users/antarapaul/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const CAP=25000, POLL=250;
const SITES=['stripe.com','github.com','en.wikipedia.org','gov.uk','linear.app','figma.com','tailwindcss.com','vercel.com',
 'raycast.com','bbc.com','pinterest.com','nasa.gov','apple.com','unsplash.com','craigslist.org','news.ycombinator.com',
 'info.cern.ch','motherfuckingwebsite.com','sive.rs','danluu.com','paulgraham.com','sqlite.org','w3.org','xkcd.com',
 'developer.mozilla.org','docs.python.org','archive.org','lobste.rs','threejs.org','cosmos.so'];
const b=await chromium.launch({executablePath:CHROME,headless:true,args:['--hide-scrollbars','--mute-audio']});
const out=[];
for(const site of SITES){
  const ctx=await b.newContext({viewport:{width:1440,height:900},colorScheme:'light'});
  const p=await ctx.newPage(); p.on('pageerror',()=>{}); p.on('dialog',d=>d.dismiss().catch(()=>{}));
  const t0=Date.now(); const series=[];
  try{
    await p.goto('https://'+site,{waitUntil:'commit',timeout:15000});
    while(Date.now()-t0<CAP){
      const painted=await p.evaluate(()=>{
        let painted=0,scanned=0; const VW=innerWidth,LIM=innerHeight*3;
        for(const el of document.querySelectorAll('body *')){
          const r=el.getBoundingClientRect();
          if(scanned<600&&r.width>=4&&r.height>=4&&r.top<LIM&&r.bottom>0){
            scanned++; const cs=getComputedStyle(el);
            let own=''; for(const c of el.childNodes) if(c.nodeType===3) own+=c.nodeValue;
            const bg=cs.backgroundColor;
            if((bg&&bg!=='rgba(0, 0, 0, 0)'&&bg!=='rgb(255, 255, 255)')||(cs.backgroundImage&&cs.backgroundImage!=='none')||own.trim().length)
              painted+=Math.min(r.width,VW)*Math.min(r.height,LIM);
          }
        }
        return painted;
      }).catch(()=>null);
      if(painted===null)break;
      series.push({t:Date.now()-t0,painted});
      await p.waitForTimeout(POLL);
    }
  }catch(e){}
  await ctx.close();
  if(series.length<3){ out.push({site,err:true}); console.log(site.padEnd(26)+'ERR'); continue; }
  const finalPaint=Math.max(...series.map(s=>s.painted));
  // time to reach 95% of the final painted area
  const hit=series.find(s=>s.painted>=finalPaint*0.95);
  const t95=hit?hit.t:CAP;
  // still climbing at the cap?
  const last=series[series.length-1].painted, mid=series[Math.floor(series.length*0.6)].painted;
  const climbing=last>mid*1.02;
  out.push({site,t95,finalPaint,climbing});
  console.log(site.padEnd(26)+'t95 '+String(t95+'ms').padStart(8)+(climbing?'   still climbing at cap':''));
}
await b.close();
fs.writeFileSync('results/paint-timing.json',JSON.stringify(out,null,1));
const ok=out.filter(o=>!o.err);
const slow=ok.filter(o=>o.t95>15000), mid=ok.filter(o=>o.t95>8000&&o.t95<=15000);
console.log('\nn='+ok.length);
console.log('  >15s (raycast-class): '+slow.length+'  ('+(100*slow.length/ok.length).toFixed(0)+'%)  '+slow.map(o=>o.site).join(', '));
console.log('  8-15s:                '+mid.length+'  ('+(100*mid.length/ok.length).toFixed(0)+'%)  '+mid.map(o=>o.site).join(', '));
console.log('  <=8s:                 '+(ok.length-slow.length-mid.length)+'  ('+(100*(ok.length-slow.length-mid.length)/ok.length).toFixed(0)+'%)');
const ts=ok.map(o=>o.t95).sort((a,b)=>a-b);
console.log('  median '+ts[Math.floor(ts.length/2)]+'ms   p90 '+ts[Math.floor(ts.length*0.9)]+'ms   max '+ts[ts.length-1]+'ms');
