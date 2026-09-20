// The instrument behind every number in this folder. Paste into a page served from prototype/
// (any gate page), after installing the probe (../leafy-ramify-2026-09-21/bloom-probe.js) as
// window.__probeSrc. Each configuration is grown in its own same-origin iframe, so every tree is
// a fresh page; the probe then renders an occlusion-correct ID pass (leaf / bloom / wood, flat
// colours, ground and sky hidden) from 8 azimuths, box-averages it to 140px, and reports bloom as
// a share of the crown box's MIDDLE THIRD per view.  R12: round the tree, several seeds, worst view.
//
// Identity checks may be run in the Browser pane. TIMINGS MAY NOT (it is a backgrounded tab —
// see ../wood-workers-2026-09-21/README.md); these are pixel counts, which do not care.
window.__runCfg = async (c) => {
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:900px;height:900px;border:0;z-index:99999;background:#fff';
  f.src = `/gate2.html?preset=${c.preset || 'bare'}&seed=${c.seed}&flowers=${c.g}&wind=0&bloomEven=${c.even}${c.extra || ''}`;
  document.body.appendChild(f);
  const t0 = performance.now();
  while (!(f.contentWindow && f.contentWindow.__gate1)) { await new Promise((r) => setTimeout(r, 250)); if (performance.now() - t0 > 120000) { f.remove(); return { ...c, error: 'timeout' }; } }
  const w = f.contentWindow; w.eval(window.__probeSrc);
  const THREE = await w.eval('import("three")');
  const g = w.__gate1;
  const off = g.camera.position.clone().sub(g.controls.target); const az0 = Math.atan2(off.z, off.x);
  const r = w.__bloomOrbit(THREE, g, 8);
  // view k looks from azimuth az0 - k*pi/4 (atan2(z, x) round the trunk): what `faces` is compared against
  const az = r.middleBloomByView.map((_, k) => +(((az0 - k * Math.PI / 4) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)).toFixed(3));
  const out = { ...c, buf: [g.renderer.domElement.width, g.renderer.domElement.height], sites: g.bloomSites ? g.bloomSites.length : null, spots: g.spots ? g.spots.length : null, faces: g.faces, per: r.middleBloomByView, az, mid: r.middleBloom, rim: r.rimBloom, worst: r.worstView };
  f.remove(); return out;
};
// for (const seed of [7,3,11,5,19]) for (const g of ['medium','abundant']) for (const even of [0,1]) results.push(await __runCfg({ seed, g, even }));
// A: extra '&bloomField=0.35'   B: extra '&bloomFreq=1.4'   C+A: even 1 + '&bloomField=0.35'
