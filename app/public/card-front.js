// The link preview always shows the front, irrespective of the visible card face.
export function paintFront(ctx, image, domain, seed) {
  ctx.fillStyle='#081613'; ctx.fillRect(0,0,1200,630);
  ctx.save(); ctx.translate(401,27);
  ctx.fillStyle='#d8e6d4';ctx.beginPath();ctx.roundRect(0,0,398,576,22);ctx.fill();
  ctx.strokeStyle='#72917a';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(8,8,382,560,16);ctx.stroke();
  ctx.fillStyle='#17372e';ctx.textAlign='left';ctx.font='12px monospace';ctx.fillText('SITE BONSAI',25,34);
  ctx.font='8px monospace';ctx.fillText('THE LIVING WEB',25,49);
  ctx.textAlign='right';ctx.font='11px monospace';ctx.fillText((seed>>>0).toString(16).toUpperCase(),373,37);
  ctx.drawImage(image,18,65,362,350);
  ctx.textAlign='left';ctx.fillStyle='#506958';ctx.font='9px monospace';ctx.fillText('ONE WEBSITE. ONE TREE.',25,439);
  ctx.fillStyle='#17372e';ctx.font='32px Georgia';ctx.fillText(domain,25,477,348);
  ctx.font='8px monospace';ctx.fillText('A LITTLE LIFE FROM THE INTERNET',25,499);
  ctx.strokeStyle='#72917a66';ctx.beginPath();ctx.moveTo(25,522);ctx.lineTo(373,522);ctx.stroke();
  ctx.font='9px monospace';ctx.fillText('SITEBONSAI.VERCEL.APP',25,544);
  ctx.restore();
}
export async function frontImage(world, snapshot) {
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;
  const ok=await world.capture({width:900,height:870,draw:frame=>paintFront(canvas.getContext('2d'),frame,snapshot.domain,snapshot.dna.seed)});
  if (!ok) throw new Error('Could not capture this tree. Please try again.');
  return canvas.toDataURL('image/png');
}
