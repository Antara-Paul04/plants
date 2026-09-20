// TEMPORARY (removed after the leafy measurements). Bloom through the crown at a true 140px.
// One ID pass: leaves / flowers+fruit / wood flat-coloured by KIND, ground and sky hidden, so a
// thumbnail pixel is "bloom" only if bloom is what you SEE there. The crown's box (leaf + bloom
// pixels) is cut in thirds both ways: MIDDLE = the centre cell, RIM = the eight round it.
window.__bloomProbe = (THREE, g, thumb = 140) => {
  const { renderer, scene, camera } = g; const gl = renderer.getContext(); const el = renderer.domElement; const W = el.width, H = el.height;
  const tree = scene.children.find((o) => o.isGroup && o.children.some((c) => c.isMesh && !c.isInstancedMesh && c.geometry.attributes.barkR));
  const kindOf = (o) => { let p = o, inTree = false; for (; p; p = p.parent) if (p === tree) inTree = true; if (!inTree) return null; if (!o.isInstancedMesh) return 'wood'; const k = o.material.customProgramCacheKey ? o.material.customProgramCacheKey() : ''; return /^leaf/.test(k) ? 'leaf' : 'bloom'; };
  const COL = { leaf: [0, 1, 0], bloom: [1, 0, 0], wood: [0, 0, 1] };
  const mats = Object.fromEntries(Object.entries(COL).map(([k, c]) => [k, new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), toneMapped: false })]));
  const saved = []; scene.traverse((o) => { if (!o.isMesh && !o.isPoints) return; saved.push([o, o.material, o.visible, o.isInstancedMesh ? o.instanceColor : undefined]); const k = kindOf(o); if (!k) { o.visible = false; return; } o.material = mats[k]; if (o.isInstancedMesh) o.instanceColor = null; });
  const bg0 = scene.background, tm0 = renderer.toneMapping; scene.background = new THREE.Color(1, 0, 1); renderer.toneMapping = THREE.NoToneMapping;
  renderer.render(scene, camera); const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  for (const [o, m, v, ic] of saved) { o.material = m; o.visible = v; if (ic !== undefined) o.instanceColor = ic; } scene.background = bg0; renderer.toneMapping = tm0; renderer.render(scene, camera); Object.values(mats).forEach((m) => m.dispose());
  const F = Math.max(1, Math.floor(Math.min(W, H) / thumb)), TW = Math.floor(W / F), TH = Math.floor(H / F);
  const cov = { leaf: new Float32Array(TW * TH), bloom: new Float32Array(TW * TH), wood: new Float32Array(TW * TH) };
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) { let l = 0, b = 0, w = 0; for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) { const i = ((ty * F + y) * W + tx * F + x) * 4; const R = px[i] > 127, G = px[i + 1] > 127, Bl = px[i + 2] > 127; if (G && !R && !Bl) l++; else if (R && !G && !Bl) b++; else if (Bl && !R && !G) w++; } const n = F * F, k = ty * TW + tx; cov.leaf[k] = l / n; cov.bloom[k] = b / n; cov.wood[k] = w / n; }
  let x0 = TW, x1 = 0, y0 = TH, y1 = 0; for (let k = 0; k < TW * TH; k++) if (cov.leaf[k] + cov.bloom[k] > 0.25) { const x = k % TW, y = (k / TW) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const cell = (cx, cy) => { let l = 0, b = 0, w = 0, n = 0; const ax = x0 + (x1 - x0 + 1) * cx / 3, bx = x0 + (x1 - x0 + 1) * (cx + 1) / 3, ay = y0 + (y1 - y0 + 1) * cy / 3, by = y0 + (y1 - y0 + 1) * (cy + 1) / 3; for (let y = Math.floor(ay); y < by; y++) for (let x = Math.floor(ax); x < bx; x++) { const k = y * TW + x; l += cov.leaf[k]; b += cov.bloom[k]; w += cov.wood[k]; n++; } return { l, b, w, n }; };
  const mid = cell(1, 1); const rim = { l: 0, b: 0, w: 0, n: 0 }; for (let cy = 0; cy < 3; cy++) for (let cx = 0; cx < 3; cx++) if (!(cx === 1 && cy === 1)) { const c = cell(cx, cy); rim.l += c.l; rim.b += c.b; rim.w += c.w; rim.n += c.n; }
  const pct = (a, n) => +(100 * a / Math.max(n, 1)).toFixed(1);
  return { thumb: [TW, TH], crownBox: [x1 - x0 + 1, y1 - y0 + 1], middle: { bloom: pct(mid.b, mid.n), leaf: pct(mid.l, mid.n), wood: pct(mid.w, mid.n), sky: pct(mid.n - mid.l - mid.b - mid.w, mid.n) }, rim: { bloom: pct(rim.b, rim.n), leaf: pct(rim.l, rim.n), wood: pct(rim.w, rim.n) }, middleOverRim: +((mid.b / Math.max(mid.n, 1)) / Math.max(rim.b / Math.max(rim.n, 1), 1e-6)).toFixed(2) };
};
// The same, averaged round the tree: one view of one seed is mostly where the bloom's drift
// field happened to land (seed 7 and seed 3 gave OPPOSITE answers from the hero angle alone).
window.__bloomOrbit = (THREE, g, views = 8) => {
  const { camera, controls } = g; const T = controls.target.clone(), P0 = camera.position.clone(); const off = P0.clone().sub(T);
  const acc = { mb: 0, ml: 0, mw: 0, rb: 0, rl: 0 }; const per = [];
  for (let k = 0; k < views; k++) { const a = k * 2 * Math.PI / views, c = Math.cos(a), s = Math.sin(a); camera.position.set(T.x + off.x * c + off.z * s, T.y + off.y, T.z - off.x * s + off.z * c); camera.lookAt(T); camera.updateMatrixWorld();
    const p = window.__bloomProbe(THREE, g); acc.mb += p.middle.bloom; acc.ml += p.middle.leaf; acc.mw += p.middle.wood; acc.rb += p.rim.bloom; acc.rl += p.rim.leaf; per.push(p.middle.bloom); }
  camera.position.copy(P0); camera.lookAt(T); camera.updateMatrixWorld(); g.renderer.render(g.scene, camera);
  const f = (x) => +(x / views).toFixed(1);
  return { middleBloom: f(acc.mb), rimBloom: f(acc.rb), middleOverRim: +(acc.mb / Math.max(acc.rb, 1e-6)).toFixed(2), middleLeaf: f(acc.ml), middleWood: f(acc.mw), rimLeaf: f(acc.rl), middleBloomByView: per, worstView: Math.min(...per) };
};
'ready';
