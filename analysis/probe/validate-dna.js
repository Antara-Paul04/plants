// Validates results/dna.json against the frozen contract in docs/BOTANICAL-DNA.md.
import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('results/dna.json'));
const E = {
  morphology:['broad'], complexity:['simple','normal','rich'],
  state:['bare','sparse','normal','lush'], density:['airy','normal','dense'],
  botanicalState:['normal','flowering','autumn','winter'],
  amount:['none','few','medium','abundant'],
  terrain:['sparse','normal','lush','autumn','winter']
};
const HEX=/^#[0-9a-f]{6}$/i;
let errs=[], warns=[];
const FIELDS=['morphology','skeleton','foliage','botanicalState','flowers','fruit','terrain','background','seed','rareCat'];
if(!d.generated) errs.push('missing generated');
for(const s of d.sites){
  const t=s.domain, x=s.dna;
  const extra=Object.keys(x).filter(k=>!FIELDS.includes(k));
  if(extra.length) errs.push(`${t}: EXTRA contract fields (shape is frozen): ${extra}`);
  for(const f of FIELDS) if(!(f in x)) errs.push(`${t}: missing ${f}`);
  if(!E.morphology.includes(x.morphology)) errs.push(`${t}: morphology ${x.morphology}`);
  if(!E.complexity.includes(x.skeleton?.complexity)) errs.push(`${t}: complexity`);
  if(!E.state.includes(x.foliage?.state)) errs.push(`${t}: foliage.state`);
  if(!E.density.includes(x.foliage?.density)) errs.push(`${t}: foliage.density`);
  if(!E.botanicalState.includes(x.botanicalState)) errs.push(`${t}: botanicalState`);
  if(!E.amount.includes(x.flowers?.amount)) errs.push(`${t}: flowers.amount`);
  if(!E.terrain.includes(x.terrain)) errs.push(`${t}: terrain`);
  if(!HEX.test(x.background||'')) errs.push(`${t}: background not hex: ${x.background}`);
  if(!Number.isInteger(x.seed)) errs.push(`${t}: seed not int`);
  if(x.rareCat!==false) errs.push(`${t}: rareCat must be false this round`);
  for(const k of ['primary','secondary']){
    const v=x.flowers[k];
    if(v!==null && !HEX.test(v)) errs.push(`${t}: flowers.${k} ${v}`);
    if(x.flowers.amount==='none' && v!==null) errs.push(`${t}: flowers.${k} set while amount=none`);
  }
  if(x.fruit.enabled && !HEX.test(x.fruit.color||'')) errs.push(`${t}: fruit enabled without colour`);
  if(!x.fruit.enabled && x.fruit.color!==null) errs.push(`${t}: fruit.color set while disabled`);
  // consistency the contract implies
  if(x.foliage.state==='bare' && x.flowers.amount!=='none') errs.push(`${t}: bare tree has flowers`);
  if(x.botanicalState==='winter' && x.flowers.amount!=='none') errs.push(`${t}: winter tree has flowers`);
  if(x.botanicalState==='winter' && x.foliage.state==='bare') errs.push(`${t}: winter must stay distinct from bare`);
  if(x.fruit.enabled && (x.foliage.state==='bare'||x.botanicalState==='winter')) errs.push(`${t}: fruit on bare/winter`);
  // why coverage
  if(!s.why||!Object.keys(s.why).length) errs.push(`${t}: no why`);
  for(const need of ['foliage','density','flowers','skeleton','botanicalState','terrain','background']){
    if(!s.synthetic && !s.why[need]) errs.push(`${t}: why.${need} missing`);
  }
  if(x.fruit.enabled && !s.why.fruit) errs.push(`${t}: fruit enabled without why`);
  if(s.synthetic && !s.why.synthetic) errs.push(`${t}: synthetic without why.synthetic`);
  if(!s.synthetic && !s.fingerprint) errs.push(`${t}: no fingerprint`);
}
// seed determinism
const bySeed={}; for(const s of d.sites){ if(bySeed[s.domain]&&bySeed[s.domain]!==s.dna.seed) errs.push('seed unstable '+s.domain); bySeed[s.domain]=s.dna.seed; }
const syn=d.sites.filter(s=>s.synthetic);
if(syn.length>1) warns.push(`${syn.length} synthetic records (contract allows at most one per untriggered state)`);
console.log(`validated ${d.sites.length} records — ${errs.length} error(s), ${warns.length} warning(s)`);
errs.forEach(e=>console.log('  ERROR  '+e)); warns.forEach(w=>console.log('  warn   '+w));
if(!errs.length) console.log('\nPASS — dna.json conforms to the frozen contract.');
process.exit(errs.length?1:0);
