// EXPERIMENT — PHASE ONE structural measurement. Deliberately knows nothing about what
// the output is for. Measures page ARCHITECTURE only: how a page is composed, not how
// much of it there is. Amount-like values (counts, totals) are recorded ONLY as
// confounders, to test afterwards whether any cluster is really size in disguise.
export function measureStructure() {
  const VW = window.innerWidth, VH = window.innerHeight;
  const docH = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
  const LIMIT = Math.min(docH, VH * 3);
  const REGION = LIMIT * VW;
  const SKIP = new Set(['SCRIPT','STYLE','META','LINK','HEAD','NOSCRIPT','TITLE','BASE','TEMPLATE','BR','WBR']);
  const px = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  const isTransparent = c => !c || c === 'transparent' || /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(c);

  const nodes = [];
  for (const el of document.querySelectorAll('*')) {
    if (SKIP.has(el.tagName)) continue;
    let cs; try { cs = getComputedStyle(el); } catch (e) { continue; }
    if (cs.display === 'none' || cs.visibility !== 'visible' || px(cs.opacity) < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    const top = r.top + window.scrollY, left = r.left + window.scrollX;
    if (top >= LIMIT || top + r.height <= 0) continue;
    try { if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true })) continue; } catch (e) {}
    let ownText = ''; for (const n of el.childNodes) if (n.nodeType === 3) ownText += n.nodeValue;
    ownText = ownText.trim();
    const hasBg = !isTransparent(cs.backgroundColor) && cs.backgroundColor !== 'rgb(255, 255, 255)';
    const bgImg = cs.backgroundImage && cs.backgroundImage !== 'none' && !/gradient/i.test(cs.backgroundImage);
    const bw = ['borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth'].map(k => px(cs[k]));
    const bs = ['borderTopStyle','borderRightStyle','borderBottomStyle','borderLeftStyle'].map(k => cs[k]);
    const hasBorder = bw.some((w,i) => w > 0 && bs[i] !== 'none' && bs[i] !== 'hidden');
    let depth = 0; for (let p = el.parentElement; p; p = p.parentElement) depth++;
    nodes.push({ el, tag: el.tagName, top, left, w: r.width, h: r.height, depth, ownText,
      paints: hasBg || bgImg || hasBorder || !!cs.boxShadow && cs.boxShadow !== 'none' || ownText.length > 0,
      isMedia: /^(IMG|PICTURE|VIDEO|CANVAS|SVG)$/i.test(el.tagName) || bgImg,
      isCanvas: el.tagName === 'CANVAS', childEls: el.children.length });
  }
  // collapse wrappers: a non-painting box around one identically-sized child is not architecture
  for (const n of nodes) {
    n.isWrapper = false;
    if (n.paints || n.childEls !== 1) continue;
    const c = n.el.firstElementChild; if (!c) continue;
    const cr = c.getBoundingClientRect();
    if (Math.abs(cr.width - n.w) <= 2 && Math.abs(cr.height - n.h) <= 2) n.isWrapper = true;
  }
  const clip = n => { const t = Math.max(0, n.top), b = Math.min(n.top + n.h, LIMIT); return b <= t ? 0 : (b - t) * Math.min(n.w, VW); };
  const SUBSTANTIAL = VW * VH * 0.004;
  const blocks = nodes.filter(n => !n.isWrapper && n.w * n.h >= SUBSTANTIAL && clip(n) > 0);

  // ---- REPETITION: is the page many copies of one unit, or a few distinct ones?
  // Shape classes on a coarse grid so near-identical cards collapse together.
  const shape = n => Math.round(n.w / 16) + 'x' + Math.round(n.h / 16);
  const classes = {};
  for (const n of blocks) (classes[shape(n)] = classes[shape(n)] || []).push(n);
  const sizes = Object.values(classes).map(a => a.length).sort((a, b) => b - a);
  const repeated = Object.values(classes).filter(a => a.length >= 3).reduce((s, a) => s + a.length, 0);
  const repetitionRatio = blocks.length ? repeated / blocks.length : 0;
  const largestClassShare = blocks.length ? sizes[0] / blocks.length : 0;

  // ---- COLUMNS: distinct left-edge alignments carrying two or more substantial blocks
  const xs = {};
  for (const n of blocks) { const k = Math.round(n.left / 8) * 8; xs[k] = (xs[k] || 0) + 1; }
  const columnCount = Object.values(xs).filter(c => c >= 2).length;

  // ---- DOMINANCE: does one element own the frame?
  const largestUnitShare = blocks.length ? Math.max(...blocks.map(n => clip(n))) / REGION : 0;

  // ---- SIZE ENTROPY: uniform units vs varied ones (normalised 0-1)
  const tot = blocks.length || 1;
  let H = 0;
  for (const a of Object.values(classes)) { const p = a.length / tot; if (p > 0) H -= p * Math.log2(p); }
  const sizeEntropy = Object.keys(classes).length > 1 ? H / Math.log2(Object.keys(classes).length) : 0;

  // ---- COMPOSITION: what the painted surface is MADE OF (shares, not amounts)
  const areaOf = list => list.reduce((s, n) => s + clip(n), 0);
  const textArea = areaOf(nodes.filter(n => n.ownText.length > 1 && !n.isWrapper));
  const mediaArea = areaOf(nodes.filter(n => n.isMedia));
  const canvasArea = areaOf(nodes.filter(n => n.isCanvas));
  const paintedTotal = textArea + mediaArea || 1;

  // ---- TEXT COLUMN: modal width of text-bearing blocks (a real column, not a bbox)
  const tw = nodes.filter(n => n.ownText.length > 20 && n.w > 60).map(n => Math.round(n.w / 32) * 32);
  const twCount = {}; tw.forEach(w => twCount[w] = (twCount[w] || 0) + 1);
  const modalTextWidth = Object.keys(twCount).length
    ? +Object.entries(twCount).sort((a, b) => b[1] - a[1])[0][0] : 0;

  // ---- VERTICAL RHYTHM: are section breaks evenly spaced or irregular?
  const tops = [...new Set(blocks.map(n => Math.round(n.top / 24) * 24))].sort((a, b) => a - b);
  const gaps = []; for (let i = 1; i < tops.length; i++) gaps.push(tops[i] - tops[i-1]);
  const gMean = gaps.length ? gaps.reduce((a,b)=>a+b,0)/gaps.length : 0;
  const gapCV = gMean ? Math.sqrt(gaps.reduce((s,g)=>s+(g-gMean)**2,0)/gaps.length) / gMean : 0;

  // ---- DEPTH SPREAD: uniform hierarchy vs mixed
  const ds = blocks.map(n => n.depth);
  const dMean = ds.length ? ds.reduce((a,b)=>a+b,0)/ds.length : 0;
  const depthSpread = ds.length ? Math.sqrt(ds.reduce((s,d)=>s+(d-dMean)**2,0)/ds.length) : 0;

  return {
    // --- architecture (shares, ratios, shapes: all size-independent by construction)
    repetitionRatio: +repetitionRatio.toFixed(3),
    largestClassShare: +largestClassShare.toFixed(3),
    columnCount,
    largestUnitShare: +largestUnitShare.toFixed(3),
    sizeEntropy: +sizeEntropy.toFixed(3),
    textShare: +(textArea / paintedTotal).toFixed(3),
    mediaShare: +(mediaArea / paintedTotal).toFixed(3),
    canvasShare: +(canvasArea / REGION).toFixed(3),
    modalTextWidthRatio: +(modalTextWidth / VW).toFixed(3),
    gapCV: +gapCV.toFixed(3),
    depthSpread: +depthSpread.toFixed(2),
    pageAspect: +(docH / VW).toFixed(2),
    // --- confounders ONLY (never cluster on these; used to test the clusters)
    _blocks: blocks.length, _nodes: nodes.length, _docH: Math.round(docH)
  };
}
