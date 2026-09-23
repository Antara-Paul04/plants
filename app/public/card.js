// Shared composition for the saved image and each video frame.
export function paintCard(ctx, image, domain, night) {
  ctx.drawImage(image, 0, 0, 1200, 630);
  const ink = night ? '#eeefdf' : '#2e3b2e';
  const muted = night ? '#b8c7ac' : '#56654f';
  const wash = ctx.createLinearGradient(0, 0, 540, 0);
  wash.addColorStop(0, night ? 'rgba(8,15,22,.94)' : 'rgba(240,241,223,.94)');
  wash.addColorStop(1, night ? 'rgba(8,15,22,0)' : 'rgba(240,241,223,0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 560, 630);
  ctx.textAlign = 'left';
  ctx.fillStyle = ink;
  ctx.font = '30px Georgia, serif';
  ctx.fillText('site bonsai.', 48, 61);
  ctx.fillStyle = muted;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('A WEBSITE, REIMAGINED', 50, 183);
  ctx.fillStyle = ink;
  ctx.font = '54px Georgia, serif';
  ctx.fillText('From pixels', 46, 247);
  ctx.fillText('to petals.', 46, 307);
  ctx.fillStyle = muted;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('GROWN FROM', 50, 370);
  ctx.fillStyle = ink;
  ctx.font = '23px Georgia, serif';
  const name = domain.length > 38 ? domain.slice(0, 35) + '…' : domain;
  ctx.fillText(name, 48, 406, 340);
  ctx.strokeStyle = night ? '#b8c7ac44' : '#56654f44';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(48, 537); ctx.lineTo(350, 537); ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('sitebonsai.vercel.app', 48, 579);
}
export async function makeCard(frame, domain, night) {
  if (!frame) throw new Error('Capture unavailable');
  const image = new Image(); image.src = frame; await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 630;
  paintCard(canvas.getContext('2d'), image, domain, night);
  return canvas.toDataURL('image/png');
}
