import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { measureStructure } from './structure.js';
import { CORPUS } from './corpus.js';
const CHROME='/Users/antarapaul/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const ROOT=process.cwd();
// PHASE-ONE EXTENSION. The committed corpus was selected for VISUAL variety (minimal,
// maximalist, dark, colourful) — the wrong axis for a structural question. These are
// chosen for ARCHITECTURE: page shapes the corpus had no example of. Same lesson as the
// dissociation pairs: select for the axis under test, or the result is about selection.
const STRUCTURAL_EXTRA=[
  {id:'hn',           url:'https://news.ycombinator.com/',      tags:['dense-list']},
  {id:'lobsters',     url:'https://lobste.rs/',                 tags:['dense-list']},
  {id:'paulgraham',   url:'https://paulgraham.com/articles.html',tags:['single-column-index']},
  {id:'danluu',       url:'https://danluu.com/',                tags:['single-column-prose']},
  {id:'python-docs',  url:'https://docs.python.org/3/',         tags:['documentation-nav']},
  {id:'mdn',          url:'https://developer.mozilla.org/en-US/',tags:['documentation-nav']},
  {id:'github-app',   url:'https://github.com/',                tags:['app-chrome']},
  {id:'npr-text',     url:'https://text.npr.org/',              tags:['text-only-list']},
  {id:'xkcd',         url:'https://xkcd.com/',                  tags:['single-object']},
  {id:'w3c',          url:'https://www.w3.org/',                tags:['institutional-doc']},
  {id:'archive-org',  url:'https://archive.org/',               tags:['mixed-portal']},
  {id:'sqlite',       url:'https://sqlite.org/index.html',      tags:['plain-document']}
];
const sites=[...CORPUS.filter(s=>!s.tags.includes('FAILS')),...STRUCTURAL_EXTRA].map(s=>({...s,url:s.url.replace('file://LOCAL','file://'+ROOT)}));
const b=await chromium.launch({executablePath:CHROME,headless:true,args:['--hide-scrollbars','--mute-audio']});
const out=[];
for(const s of sites){
  const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,colorScheme:'light',locale:'en-US',ignoreHTTPSErrors:true});
  const p=await ctx.newPage(); p.on('pageerror',()=>{}); p.on('dialog',d=>d.dismiss().catch(()=>{}));
  let rec={id:s.id,tags:s.tags,ok:false};
  try{
    const resp=await p.goto(s.url,{waitUntil:'domcontentloaded',timeout:20000});
    await p.waitForLoadState('load',{timeout:6000}).catch(()=>{});
    await p.waitForLoadState('networkidle',{timeout:3000}).catch(()=>{});
    await p.waitForTimeout(1200);
    const t=await p.evaluate(()=>({title:document.title||'',err:location.protocol==='chrome-error:'}));
    const st=resp?resp.status():null;
    if(!resp||t.err||st>=400||/attention required|just a moment|are you a robot|blocked/i.test(t.title)){
      rec.fail='invalid:'+(st||'nav');
    } else { rec.s=await p.evaluate(measureStructure); rec.ok=true; }
  }catch(e){ rec.fail=String(e.message).split('\n')[0].slice(0,50); }
  await ctx.close();
  out.push(rec);
  console.log((rec.ok?'ok  ':'FAIL')+' '+rec.id.padEnd(17)+(rec.ok?JSON.stringify(rec.s).slice(0,110):rec.fail));
}
await b.close();
fs.writeFileSync('results/structure-extended.json',JSON.stringify(out,null,1));
console.log('\nwrote results/structure.json — '+out.filter(r=>r.ok).length+' valid');
