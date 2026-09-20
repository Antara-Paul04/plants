// Dedicated repeatability test for the motion BOOLEAN (Lead ruling 3).
// Prior stability evidence was incidental. This is designed: N independent loads per
// site, fresh context each time, recording whether ANY visible motion was observed.
import { chromium } from 'playwright-core';
import { diffFrames } from './pixels.js';
const CHROME='/Users/antarapaul/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const TRIALS=Number(process.argv[2]||5);
const SITES=[
  ['static: control',  'file://'+process.cwd()+'/fixtures/raw.html'],
  ['static: cern',     'http://info.cern.ch/hypertext/WWW/TheProject.html'],
  ['static: wikipedia','https://en.wikipedia.org/wiki/Tree'],
  ['moving: fixture',  'file://'+process.cwd()+'/fixtures/motion.html'],
  ['moving: figma',    'https://www.figma.com/'],
  ['moving: cosmos',   'https://www.cosmos.so/']
];
const b=await chromium.launch({executablePath:CHROME,headless:true,args:['--hide-scrollbars','--mute-audio','--autoplay-policy=no-user-gesture-required']});
const sc=await (await b.newContext({viewport:{width:800,height:600}})).newPage(); await sc.goto('about:blank');
console.log('motion BOOLEAN repeatability — '+TRIALS+' independent loads each\n');
console.log('site'.padEnd(20)+'observations'.padEnd(34)+'boolean stable?');
for(const [label,url] of SITES){
  const vals=[];
  for(let t=0;t<TRIALS;t++){
    const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,colorScheme:'light'});
    const p=await ctx.newPage(); p.on('pageerror',()=>{});
    try{
      await p.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
      await p.waitForLoadState('load',{timeout:5000}).catch(()=>{});
      await p.waitForTimeout(1500);
      const fr=[];
      for(let i=0;i<3;i++){ if(i) await p.waitForTimeout(700); fr.push((await p.screenshot({type:'png',animations:'allow'})).toString('base64')); }
      const r=await sc.evaluate(diffFrames,{frames:fr,docW:1440,excludeRects:[]});
      vals.push(r.sustained);
    }catch(e){ vals.push(null); }
    await ctx.close();
  }
  const ok=vals.filter(v=>v!==null);
  const bools=ok.map(v=>v>0);
  const stable=bools.every(x=>x===bools[0]);
  console.log(label.padEnd(20)+ok.map(v=>v.toFixed(4)).join(' ').padEnd(34)+(stable?'YES ('+(bools[0]?'moving':'static')+')':'NO  <-- UNSTABLE'));
}
await b.close();
