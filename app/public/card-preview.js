import { frontImage } from '/card-front.js';
import { mountTree } from '/tree/main.js';
const card = document.getElementById('card');
const tilt = document.getElementById('cardTilt');
let pointerX = 0, pointerY = 0, tiltX = 0, tiltY = 0;
// Use the whole page as the pointer surface, not just the card.
window.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
  pointerX = Math.max(-1, Math.min(1, event.clientX / innerWidth * 2 - 1));
  pointerY = Math.max(-1, Math.min(1, event.clientY / innerHeight * 2 - 1));
}, { passive: true });
const resetTilt = () => { pointerX = 0; pointerY = 0; };
document.documentElement.addEventListener('pointerleave', resetTilt);
window.addEventListener('blur', resetTilt);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetTilt(); });
const note = document.getElementById('note');
let snapshot, sharedUrl, sharedFile;
let world, current = 0, target = 0, last = performance.now();
let backVisible = false;
tilt.setAttribute('aria-pressed', 'false');
function flipCard() {
  backVisible = !backVisible;
  target += 180;
  tilt.setAttribute('aria-pressed', String(backVisible));
  note.textContent = 'Click the card to turn it over.';
}
tilt.addEventListener('click', flipCard);
tilt.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault(); flipCard();
  }
});
function animate(now) {
  const dt = Math.min((now-last)/1000,.05); last=now;
  if (!document.hidden) {
    const follow = 1 - Math.exp(-dt * 6);
    tiltX += (-pointerY * 9 - tiltX) * follow;
    tiltY += (pointerX * 13 - tiltY) * follow;
    tilt.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    tilt.style.setProperty('--shine-x', `${50 + tiltY * 2.5}%`);
    tilt.style.setProperty('--shine-y', `${50 - tiltX * 3}%`);
    tilt.style.setProperty('--foil-shift', `${50 + tiltY * 3}%`);
    current += (target-current)*Math.min(1,dt*7);
    card.style.transform = `rotateY(${current}deg)`;
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
try {
  const data = window.__PLANTS_TREE__ || await (await fetch('/card-preview-data.json')).json();
  snapshot = data;
  const serial = (data.dna.seed >>> 0).toString(16).toUpperCase();
  document.getElementById('serial').textContent=serial;
  document.getElementById('domain').textContent=data.domain;
  document.getElementById('tree').setAttribute('aria-label', `Rotating bonsai grown from ${data.domain}`);
  world = mountTree(document.getElementById('tree'),data.dna,{allowQueryParams:false,motion:true,autoRotate:true,reveal:false});
  await world.ready;
  if (data.camera) world.setPose(data.camera);
  world.controls.autoRotateSpeed=1.4;
  document.getElementById('shareCard').disabled=false;
  document.getElementById('loading').hidden=true;
} catch { document.getElementById('loading').textContent='The tree couldn’t load. Refresh to try again.'; }
addEventListener('pagehide',()=>world?.dispose(),{once:true});

const shareButton = document.getElementById('shareCard');
const shareMessage = document.getElementById('shareMessage');
shareButton.addEventListener('click', async () => {
  if (!world || !snapshot) return;
  shareButton.disabled=true;
  try {
    if (!sharedUrl) {
      shareButton.textContent='Preparing your card…';
      world.setMotion(false);
      const camera=world.getPose();
      const image=await frontImage(world,snapshot);
      const response=await fetch('/api/share',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:snapshot.url,dna:snapshot.dna,camera,image,rendererVersion:1}),signal:AbortSignal.timeout(30000)});
      const saved=await response.json();
      if (!response.ok || !saved.ok) throw new Error('Could not save the card. Please try again.');
      sharedUrl=new URL(saved.path,location.origin).href;
      sharedFile=new File([await (await fetch(image)).blob()],`site-bonsai-${snapshot.domain}.png`,{type:'image/png'});
      document.getElementById('postCard').href=`https://x.com/intent/tweet?text=${encodeURIComponent(`${snapshot.domain} grew this little world.`)}&url=${encodeURIComponent(sharedUrl)}`;
    }
    // Explicit destination actions avoid losing the browser's share permission
    // while the new card is being saved over the network.
    document.getElementById('shareOptions').hidden=false;
    shareMessage.textContent='Your tree’s front is ready to share. The link opens this living card.';
  } catch(error) { shareMessage.textContent=error.message || 'Please try again.'; }
  finally { world?.setMotion(true);shareButton.disabled=false;shareButton.textContent='Share this card'; }
});
document.getElementById('copyCard').addEventListener('click',async()=>{
  try { await navigator.clipboard.writeText(sharedUrl);shareMessage.textContent='Link copied.'; }
  catch { shareMessage.textContent=sharedUrl; }
});
document.getElementById('downloadCard').addEventListener('click',()=>{
  if(!sharedFile)return;
  const a=document.createElement('a');a.href=URL.createObjectURL(sharedFile);a.download=sharedFile.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);
});
