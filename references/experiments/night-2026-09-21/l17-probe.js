// L17 — night legibility at thumbnail size, measured on a LIVE scene.  (v2: occlusion-correct)
//
// One ID PASS: everything stays visible and in place, but every mesh is flat-coloured by KIND
// (crown / wood / soil / turf+stones) on a magenta ground, tone mapping off. So a thumbnail
// pixel is "crown" only if crown is what you actually SEE there — v1 rendered each part alone
// and counted every branch hidden behind a leaf as wood.
// Then picture and IDs are box-averaged to a 140px-wide thumbnail in sRGB (what a browser or an
// image pipeline does to a screenshot). A thumbnail pixel belongs to a kind if more than half of
// it is that kind. Its BACKGROUND is what it is read against: thumbnail pixels with nothing of
// the scene in them, within 6px.
// Use wind=0: the ID pass cannot see the sway.
window.__l17 = (ctx, opts = {}) => {
  const { THREE, renderer, scene, camera, tree, ground } = ctx;
  const gl = renderer.getContext();
  const W = renderer.domElement.width, H = renderer.domElement.height;
  const TW = opts.thumb || 140, F = Math.max(1, Math.floor(W / TW)), TH = Math.floor(H / F), TWp = Math.floor(W / F);
  const read = () => { renderer.render(scene, camera); const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const Lstar = (r, g, b) => { const Y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; };
  const pic = read();

  const under = (root) => (o) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
  const inTree = under(tree), inGround = under(ground);
  const KIND = { crown: [1, 0, 0], wood: [0, 1, 0], soil: [0, 0, 1], turf: [1, 1, 0] };
  const mats = Object.fromEntries(Object.entries(KIND).map(([k, c]) => [k, new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), toneMapped: false })]));
  // The soil body is the one ground mesh that reaches well below the lawn (the dome, the grass and the stones do not).
  const isSoil = (o) => { if (o.isInstancedMesh) return false; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); return o.geometry.boundingBox.min.y < -0.6; };
  const saved = [];
  scene.traverse((o) => {
    if (!o.isMesh && !o.isPoints) return;
    saved.push([o, o.material, o.visible, o.isInstancedMesh ? o.instanceColor : undefined]);
    const kind = inTree(o) ? (o.isInstancedMesh ? 'crown' : 'wood') : inGround(o) ? (isSoil(o) ? 'soil' : 'turf') : null;
    if (!kind) { o.visible = false; return; }
    o.material = mats[kind];
    if (o.isInstancedMesh) o.instanceColor = null;          // or the instance tint shifts the ID colour
  });
  const bg0 = scene.background, tm0 = renderer.toneMapping;
  scene.background = new THREE.Color(1, 0, 1); renderer.toneMapping = THREE.NoToneMapping;
  const ids = read();
  for (const [o, m, v, ic] of saved) { o.material = m; o.visible = v; if (ic !== undefined) o.instanceColor = ic; }
  scene.background = bg0; renderer.toneMapping = tm0; renderer.render(scene, camera);
  Object.values(mats).forEach((m) => m.dispose());
  const kindAt = (i) => { const r = ids[i] > 127, g = ids[i + 1] > 127, b = ids[i + 2] > 127; return r && !g && !b ? 0 : !r && g && !b ? 1 : !r && !g && b ? 2 : r && g && !b ? 3 : -1; };  // magenta (r,b) -> -1

  const names = ['crown', 'wood', 'soil', 'turf'];
  const L = new Float32Array(TWp * TH), cov = names.map(() => new Float32Array(TWp * TH));
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TWp; tx++) {
    let r = 0, g = 0, b = 0; const c = [0, 0, 0, 0];
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) { const i = ((ty * F + y) * W + tx * F + x) * 4; r += pic[i]; g += pic[i + 1]; b += pic[i + 2]; const k = kindAt(i); if (k >= 0) c[k]++; }
    const n = F * F, k = ty * TWp + tx; L[k] = Lstar(r / n, g / n, b / n); for (let j = 0; j < 4; j++) cov[j][k] = c[j] / n;
  }
  const empty = (k) => cov[0][k] + cov[1][k] + cov[2][k] + cov[3][k] < 0.02;
  const f = (x) => +x.toFixed(1);
  const measure = (cv) => {
    const part = [], near = new Set();
    for (let k = 0; k < cv.length; k++) if (cv[k] > 0.5) part.push(k);
    for (const k of part) { const x0 = k % TWp, y0 = (k / TWp) | 0; for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= TWp || y >= TH) continue; const j = y * TWp + x; if (empty(j)) near.add(j); } }
    if (!part.length || !near.size) return null;
    const bg = [...near].map((j) => L[j]).sort((a, b) => a - b), obj = part.map((j) => L[j]).sort((a, b) => a - b);
    const q = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))], B = q(bg, 0.5);
    return { px: part.length, against: f(B), p10: f(q(obj, 0.1)), median: f(q(obj, 0.5)), p90: f(q(obj, 0.9)), sep: f(q(obj, 0.5) - B), lost10: f(100 * obj.filter((v) => Math.abs(v - B) < 10).length / obj.length), lost5: f(100 * obj.filter((v) => Math.abs(v - B) < 5).length / obj.length) };
  };
  // THE SILHOUETTE is what a thumbnail is read by: only the part's pixels that TOUCH background.
  const edge = (cv) => { const e = []; for (let k = 0; k < cv.length; k++) { if (cv[k] <= 0.5) continue; const x0 = k % TWp, y0 = (k / TWp) | 0; let bgL = [], n = 0; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]]) { const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= TWp || y >= TH) continue; const j = y * TWp + x; if (empty(j)) bgL.push(L[j]); } if (bgL.length) e.push(L[k] - bgL.reduce((a, b) => a + b) / bgL.length); } if (!e.length) return null; e.sort((a, b) => a - b); const q = (p) => e[Math.min(e.length - 1, Math.floor(p * e.length))]; return { px: e.length, stepMedian: f(q(0.5)), stepP25: f(q(0.25)), under5: f(100 * e.filter((v) => Math.abs(v) < 5).length / e.length) }; };
  const out = { buffer: [W, H], thumb: [TWp, TH] };
  names.forEach((n, j) => { out[n] = measure(cov[j]); if (out[n]) out[n].edge = edge(cov[j]); });
  return out;
};
'installed';
