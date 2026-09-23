// Card typography is composited over a clean renderer capture, never over the UI.
export async function makeCard(frame, domain, night) {
  if (!frame) throw new Error("Capture unavailable");
  const image = new Image();
  image.src = frame;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, 1200, 630);
  ctx.fillStyle = night ? "#eeeede" : "#2e3b2e";
  ctx.font = "42px Georgia, serif";
  ctx.fillText("site bonsai.", 50, 62);
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillStyle = night ? "#cbd6c0" : "#52644d";
  ctx.fillText("a little life from any website", 52, 93);
  // A quiet ground-coloured strip protects text against every generated scene.
  ctx.fillStyle = night ? "rgba(23,31,30,.9)" : "rgba(246,246,233,.9)";
  ctx.beginPath();
  ctx.roundRect(36, 553, 1128, 53, 16);
  ctx.fill();
  ctx.fillStyle = night ? "#eceedd" : "#354331";
  ctx.font = "22px Georgia, serif";
  const name = domain.length > 65 ? domain.slice(0, 62) + "…" : domain;
  ctx.fillText(name, 58, 587, 790);
  ctx.textAlign = "right";
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillText("What will yours become?", 1140, 586);
  return canvas.toDataURL("image/png");
}
