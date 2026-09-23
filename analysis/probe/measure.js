// EXPERIMENT — disposable research probe. Not product code.
// Runs INSIDE the page. Must be self-contained (no closures, no imports).
//
// Governing rule (Lead brief §3): every signal must reflect what ACTUALLY MANIFESTS
// on the page. Unused CSS, shipped JS, wrapper spam, hidden component libraries and
// tracking iframes must contribute nothing.

export function measurePage(opts) {
  const VW = window.innerWidth;
  const VH = window.innerHeight;
  const docH = Math.max(
    document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0
  );
  // Two analysis scopes so we can answer "how much page do we need?" (Q13) with data.
  const scopes = { v1: Math.min(docH, VH), v2: Math.min(docH, VH * 2), v3: Math.min(docH, VH * 3), full: docH };

  const SKIP = new Set(['SCRIPT','STYLE','META','LINK','HEAD','NOSCRIPT','TITLE','BASE','TEMPLATE','BR','WBR']);
  const UA_LINK_COLORS = new Set(['rgb(0, 0, 238)','rgb(0, 0, 255)','rgb(85, 26, 139)','rgb(0, 0, 204)']);
  // Chrome UA default heading sizes at 16px root (h1..h6) — presence of ONLY these
  // means the "type scale" is inherited from the browser, not authored.
  const UA_FONT_SIZES = new Set([32,24,18.72,16,13.28,10.72]);

  const px = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const isTransparent = c => !c || c === 'transparent' || /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(c);

  function visibleNow(el, cs) {
    if (cs.visibility !== 'visible') return false;
    if (px(cs.opacity) < 0.05) return false;
    try {
      if (el.checkVisibility) {
        return el.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true });
      }
    } catch (e) { /* older option names; fall through */ }
    return true;
  }

  // ---- collect every element with a real painted box in document coords -------
  const all = document.querySelectorAll('*');
  const nodes = [];
  let overlayArea = 0, overlaySuspects = [];

  for (const el of all) {
    if (SKIP.has(el.tagName)) continue;
    let cs; try { cs = getComputedStyle(el); } catch (e) { continue; }
    if (cs.display === 'none') continue;
    let r; try { r = el.getBoundingClientRect(); } catch (e) { continue; }
    if (!r || !(r.width > 0) || !(r.height > 0)) continue;
    if (!visibleNow(el, cs)) continue;
    const top = r.top + window.scrollY, left = r.left + window.scrollX;
    if (top >= scopes.full || top + r.height <= 0) continue;

    const bgCol = cs.backgroundColor;
    const bgImg = cs.backgroundImage;
    const hasBgColor = !isTransparent(bgCol) && bgCol !== 'rgb(255, 255, 255)';
    const hasBgImage = bgImg && bgImg !== 'none';
    const bw = ['borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth'].map(k => px(cs[k]));
    // border-width alone is NOT a visible border: `border-width:2px; border-style:none`
    // paints nothing. Independently found by the parallel probe (it reported 97.7% of
    // Stripe's viewport as bordered before the same fix).
    const bstyles = ['borderTopStyle','borderRightStyle','borderBottomStyle','borderLeftStyle'].map(k => cs[k]);
    const hasBorder = bw.some((w, i) => w > 0 && bstyles[i] !== 'none' && bstyles[i] !== 'hidden')
      && !isTransparent(cs.borderTopColor);
    const hasShadow = cs.boxShadow && cs.boxShadow !== 'none';
    const hasGradient = hasBgImage && /gradient/i.test(bgImg);
    const radii = ['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].map(k => px(cs[k]));
    const maxRadius = Math.max(...radii);
    const hasTransform = cs.transform && cs.transform !== 'none';
    const hasFilter = (cs.filter && cs.filter !== 'none') || (cs.backdropFilter && cs.backdropFilter !== 'none');
    const hasMask = (cs.maskImage && cs.maskImage !== 'none') || (cs.clipPath && cs.clipPath !== 'none');

    // direct text (not text of descendants) — this is what makes an element a leaf painter
    let ownText = '';
    for (const n of el.childNodes) if (n.nodeType === 3) ownText += n.nodeValue;
    ownText = ownText.trim();

    const paints = hasBgColor || hasBgImage || hasBorder || hasShadow || ownText.length > 0;

    // fixed/sticky full-bleed overlays (cookie banners, nav) — record, don't solve (§13)
    if ((cs.position === 'fixed' || cs.position === 'sticky') && r.width * r.height > VW * VH * 0.15) {
      overlayArea += r.width * r.height;
      overlaySuspects.push({ tag: el.tagName, z: cs.zIndex, w: Math.round(r.width), h: Math.round(r.height), pos: cs.position });
    }

    let depth = 0; for (let p = el.parentElement; p; p = p.parentElement) depth++;

    nodes.push({
      el, cs, top, left, w: r.width, h: r.height, depth, tag: el.tagName, ownText,
      paints, hasBgColor, hasBgImage, hasBorder, hasShadow, hasGradient, hasTransform,
      hasFilter, hasMask, maxRadius, bgCol,
      fontSize: px(cs.fontSize), fontFamily: cs.fontFamily, fontWeight: cs.fontWeight,
      color: cs.color, letterSpacing: cs.letterSpacing, lineHeight: cs.lineHeight,
      padT: px(cs.paddingTop), padL: px(cs.paddingLeft), padB: px(cs.paddingBottom),
      animName: cs.animationName, transProp: cs.transitionProperty, transDur: cs.transitionDuration,
      childEls: el.children.length
    });
  }

  // ---- wrapper collapse: an element that paints nothing and merely boxes one child
  // is structurally invisible to a viewer. Framework wrapper spam must not become wood.
  for (const n of nodes) {
    n.isWrapper = false;
    if (n.paints) continue;
    if (n.childEls !== 1) continue;
    const c = n.el.firstElementChild;
    if (!c) continue;
    let cr; try { cr = c.getBoundingClientRect(); } catch (e) { continue; }
    if (cr && Math.abs(cr.width - n.w) <= 2 && Math.abs(cr.height - n.h) <= 2) n.isWrapper = true;
  }

  function areaIn(n, limit) {
    const t = Math.max(0, n.top), b = Math.min(n.top + n.h, limit);
    if (b <= t) return 0;
    return (b - t) * Math.min(n.w, VW);
  }

  // An element's own paint is only visible where its painted children do not cover it.
  // Without this a single full-height wrapper with a 1px border reads as a heavily
  // bordered page (verified on threejs.org: 300x900 sidebar, 1px border, 21% of viewport).
  const nodeOf = new Map(nodes.map(n => [n.el, n]));
  function ownArea(n, limit) {
    const a = areaIn(n, limit);
    if (a <= 0) return 0;
    let covered = 0;
    for (const c of n.el.children) {
      const cn = nodeOf.get(c);
      if (cn && cn.paints) covered += areaIn(cn, limit);
    }
    return Math.max(0, a - Math.min(a, covered));
  }

  function analyse(limit, label) {
    const region = Math.max(1, limit) * VW;
    const inScope = nodes.filter(n => areaIn(n, limit) > 0);
    const painted = inScope.filter(n => n.paints && !n.isWrapper);
    const wA = n => areaIn(n, limit);
    // capped own-exposed area: no single element may dominate a styling fraction
    const CAP = region * 0.25;
    const sA = n => Math.min(ownArea(n, limit), CAP);
    const totalPaintedArea = painted.reduce((s, n) => s + wA(n), 0) || 1;
    const totalStyleArea = painted.reduce((s, n) => s + sA(n), 0) || 1;
    const frac = (pred) => clamp01(painted.filter(pred).reduce((acc, n) => acc + sA(n), 0) / totalStyleArea);

    // ---------- A: structure (visible, non-wrapper, substantial) ----------
    const SUBSTANTIAL = VW * VH * 0.004;
    const blocks = inScope.filter(n => !n.isWrapper && n.w * n.h >= SUBSTANTIAL);
    const landmarkSel = 'header,nav,main,footer,section,article,aside,h1,h2,h3,h4,h5,h6';
    const landmarks = inScope.filter(n => n.el.matches && n.el.matches(landmarkSel));
    const depths = blocks.map(n => n.depth).sort((a, b) => a - b);
    const medDepth = depths.length ? depths[Math.floor(depths.length / 2)] : 0;
    // vertical bands = visually separable horizontal strips of content
    const bandH = Math.max(40, VH / 8);
    const bands = new Set(blocks.map(n => Math.floor(n.top / bandH)));

    // ---------- B: styling richness (the §4 crux) ----------
    const textNodes = inScope.filter(n => n.ownText.length > 1);
    const textArea = textNodes.reduce((s, n) => s + wA(n), 0) || 1;
    const visibleChars = textNodes.reduce((s, n) => s + n.ownText.length, 0);
    const tfrac = pred => clamp01(textNodes.filter(pred).reduce((s, n) => s + wA(n), 0) / textArea);

    // "DID THE PAGE CHOOSE A FONT?" — asked of this browser, not of a list.
    //
    // This used to be a regex for Times / Times New Roman / serif, which is the
    // UA default ON MACOS. On Linux the same unstyled page computes something
    // else (Tinos, Liberation Serif, DejaVu Serif, whatever fontconfig resolves),
    // so every unstyled page there looked deliberately typeset. Measured on the
    // deployment against this laptop, info.cern.ch: stylingRichness 0.069 -> 0.125
    // and authored 0.1 -> 0.2, enough to move the crux site off BARE. One regex,
    // and the project's central claim changed with the operating system.
    //
    // The UA default is now READ OUT OF THE BROWSER: an element with `all:
    // initial` carries the initial font-family, whatever platform this is. A
    // generic keyword still counts as unstyled — asking for "serif" is not
    // choosing a typeface.
    let uaFontFamily = '';
    try {
      const probe = document.createElement('span');
      probe.style.all = 'initial';
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      document.documentElement.appendChild(probe);
      uaFontFamily = getComputedStyle(probe).fontFamily || '';
      probe.remove();
    } catch (e) { /* fall back to the generics below */ }
    const norm = (f) => String(f || '').split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
    const uaFirst = norm(uaFontFamily);
    const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
                             'system-ui', '-webkit-standard', '-webkit-body']);
    const isDefaultFont = (f) => { const v = norm(f); return !v || v === uaFirst || GENERIC.has(v); };
    const nonDefaultFontArea = tfrac(n => !isDefaultFont(n.fontFamily));
    const webfonts = document.fonts ? document.fonts.size : 0;
    let loadedWebfonts = 0;
    try { document.fonts.forEach(f => { if (f.status === 'loaded') loadedWebfonts++; }); } catch (e) {}

    const radiusArea = frac(n => n.maxRadius > 0);
    const shadowArea = frac(n => n.hasShadow);
    const gradientArea = frac(n => n.hasGradient);
    const borderArea = frac(n => n.hasBorder);
    const bgColorArea = frac(n => n.hasBgColor);
    const transformArea = frac(n => n.hasTransform);
    const maskFilterArea = frac(n => n.hasMask || n.hasFilter);
    const paddedArea = frac(n => n.padT > 0 || n.padL > 0);

    // authored type scale: sizes that are NOT the browser's default ladder
    const sizes = [...new Set(textNodes.map(n => Math.round(n.fontSize * 100) / 100))];
    const authoredSizes = sizes.filter(s => !UA_FONT_SIZES.has(s));
    const weights = [...new Set(textNodes.map(n => n.fontWeight))];
    const letterSpaced = tfrac(n => n.letterSpacing !== 'normal');
    const lineHeightSet = tfrac(n => n.lineHeight !== 'normal');

    // text measure: raw HTML runs edge-to-edge; designed pages constrain the column
    const textWidths = textNodes.filter(n => n.w > 80).map(n => n.w).sort((a, b) => a - b);
    const medTextW = textWidths.length ? textWidths[Math.floor(textWidths.length / 2)] : VW;
    const measureRatio = clamp01(medTextW / VW);

    // UA-default link styling
    const links = inScope.filter(n => n.tag === 'A');
    const uaLinks = links.filter(n => UA_LINK_COLORS.has(n.color)).length;
    const uaLinkFrac = links.length ? uaLinks / links.length : 0;

    const colors = new Set(textNodes.map(n => n.color));
    const bgColors = new Set(painted.filter(n => n.hasBgColor).map(n => n.bgCol));

    // pseudo-element ornament that actually renders a box
    let pseudoOrnament = 0;
    for (const n of blocks.slice(0, 400)) {
      for (const pe of ['::before','::after']) {
        try {
          const p = getComputedStyle(n.el, pe);
          if (!p || p.content === 'none' || p.content === 'normal') continue;
          if (px(p.width) > 2 || px(p.height) > 2 || !isTransparent(p.backgroundColor)) pseudoOrnament++;
        } catch (e) {}
      }
    }

    const stylingParts = {
      nonDefaultFontArea, webfontsPresent: loadedWebfonts > 0 ? 1 : 0,
      bgColorArea, radiusArea, shadowArea, gradientArea, borderArea, paddedArea,
      transformArea, maskFilterArea,
      authoredTypeScale: clamp01(authoredSizes.length / 6),
      weightVariety: clamp01((weights.length - 1) / 4),
      letterSpaced, lineHeightSet,
      constrainedMeasure: clamp01((1 - measureRatio) / 0.6),
      nonUaLinks: 1 - uaLinkFrac,
      colorVariety: clamp01((colors.size + bgColors.size - 2) / 10),
      ornament: clamp01(pseudoOrnament / 20)
    };
    const stylingRichness = clamp01(
      Object.values(stylingParts).reduce((a, b) => a + b, 0) / Object.keys(stylingParts).length
    );

    // Hard binary-ish discriminator for §4: how close is this to pure UA rendering?
    const uaMarkers = [
      loadedWebfonts === 0, nonDefaultFontArea < 0.05, radiusArea < 0.01, shadowArea < 0.01,
      gradientArea < 0.01, bgColorArea < 0.02, measureRatio > 0.85, uaLinkFrac > 0.5,
      authoredSizes.length === 0, paddedArea < 0.02
    ];
    const unstyledScore = uaMarkers.filter(Boolean).length / uaMarkers.length;

    // ---------- D/E/F/K/L: media ----------
    const imgs = inScope.filter(n => (n.tag === 'IMG' || n.tag === 'PICTURE' || (n.hasBgImage && !n.hasGradient)) && n.w > 24 && n.h > 24);
    const imageArea = clamp01(imgs.reduce((s, n) => s + wA(n), 0) / region);
    const svgs = inScope.filter(n => n.tag === 'SVG' || n.tag === 'svg');
    const bigSvgs = svgs.filter(n => Math.min(n.w, n.h) >= 48);
    const graphicArea = clamp01(bigSvgs.reduce((s, n) => s + wA(n), 0) / region);
    const vids = inScope.filter(n => n.tag === 'VIDEO');
    const videoArea = clamp01(vids.reduce((s, n) => s + wA(n), 0) / region);
    const canvases = inScope.filter(n => n.tag === 'CANVAS');
    const canvasArea = clamp01(canvases.reduce((s, n) => s + wA(n), 0) / region);
    const frames = inScope.filter(n => n.tag === 'IFRAME' && n.w > 80 && n.h > 60);
    const embedArea = clamp01(frames.reduce((s, n) => s + wA(n), 0) / region);
    const hiddenFrames = document.querySelectorAll('iframe').length - frames.length;

    // ---------- I: layout / silhouette ----------
    const xs = blocks.map(n => Math.round(n.left / 4) * 4);
    const xCounts = {}; xs.forEach(x => xCounts[x] = (xCounts[x] || 0) + 1);
    const topX = Object.values(xCounts).sort((a, b) => b - a).slice(0, 4).reduce((a, b) => a + b, 0);
    const regularity = blocks.length ? clamp01(topX / blocks.length) : 0;

    const rowH = Math.max(60, VH / 6);
    const rows = {};
    blocks.forEach(n => { const r = Math.floor(n.top / rowH); rows[r] = (rows[r] || 0) + 1; });
    const rowVals = Object.values(rows);
    const meanPerRow = rowVals.length ? rowVals.reduce((a, b) => a + b, 0) / rowVals.length : 0;
    // OPEN: 'verticality' has no agreed definition — a parallel probe found three
    // candidate definitions that rank the same sites in three different orders. This is
    // ONE definition (mean blocks per row band), reported as blocksPerRow, NOT as a
    // settled 'verticality' signal. A human must choose the meaning first.
    const verticality = clamp01(1 - (meanPerRow - 1) / 6);

    const contentL = blocks.length ? Math.min(...blocks.map(n => n.left)) : 0;
    const contentR = blocks.length ? Math.max(...blocks.map(n => n.left + n.w)) : VW;
    const contentWidthRatio = clamp01((contentR - contentL) / VW);
    const cx = blocks.reduce((s, n) => s + (n.left + n.w / 2) * wA(n), 0) / (blocks.reduce((s, n) => s + wA(n), 0) || 1);
    const centredness = clamp01(1 - Math.abs(cx - VW / 2) / (VW / 2));

    // ---------- N: control density ----------
    const controlSel = 'button,input,select,textarea,[role="button"],[role="tab"],[role="menuitem"],table,dialog,details,summary';
    const controls = inScope.filter(n => n.el.matches && n.el.matches(controlSel));
    const controlDensity = clamp01(controls.length / (40 * (limit / VH)));

    // ---------- G (declared half): declared != visible ----------
    const declaredAnim = inScope.filter(n => n.animName && n.animName !== 'none').length;
    const declaredTrans = inScope.filter(n => n.transProp && n.transProp !== 'none' && n.transProp !== 'all' && px(n.transDur) > 0).length;

    // ---------- J ----------
    const roundness = clamp01(
      painted.filter(n => n.maxRadius > 0)
        .reduce((s, n) => s + sA(n) * Math.min(1, n.maxRadius / (0.5 * Math.min(n.w, n.h))), 0) / totalStyleArea
    );

    const paintedAreaRatio = clamp01(totalPaintedArea / region); // NOTE: overlapping nested boxes double-count -> saturates. Not a density signal.

    return {
      scope: label, scopeHeightPx: Math.round(limit),
      structure: {
        blockCount: blocks.length, landmarkCount: landmarks.length,
        medianDepth: medDepth, maxDepth: depths.length ? depths[depths.length - 1] : 0,
        bandCount: bands.size,
        wrappersCollapsed: inScope.filter(n => n.isWrapper).length
      },
      stylingRichness, stylingParts, unstyledScore,
      layout: { verticalityUNDEFINED: verticality, blocksPerRow: +meanPerRow.toFixed(2), regularity, contentWidthRatio, centredness, paintedAreaRatio },
      roundness,
      media: {
        imageArea, imageCount: imgs.length,
        graphicArea, svgCount: svgs.length, bigSvgCount: bigSvgs.length,
        videoArea, videoCount: vids.length,
        canvasArea, canvasCount: canvases.length,
        embedArea, embedCount: frames.length, hiddenFrames
      },
      controls: { controlDensity, controlCount: controls.length },
      declared: { declaredAnim, declaredTrans },
      text: { visibleChars, charsPerMegapixel: Math.round(visibleChars / (region / 1e6)) },
      typography: {
        distinctSizes: sizes.length, authoredSizes: authoredSizes.length,
        distinctWeights: weights.length, medianTextWidthRatio: measureRatio,
        webfontsLoaded: loadedWebfonts, webfontsTotal: webfonts
      },
      // confounders — used to test whether a signal is just tracking page size (§6b)
      confounders: {
        visibleElements: inScope.length, paintedElements: painted.length,
        domNodes: all.length, docHeight: Math.round(docH),
        styleSheets: document.styleSheets.length
      }
    };
  }

  // author stylesheet rule count — used ONLY as a confounder, never as a signal
  let authorRules = 0, sheetErr = 0;
  for (const s of document.styleSheets) {
    try { authorRules += s.cssRules ? s.cssRules.length : 0; } catch (e) { sheetErr++; }
  }

  // regions to mask out of the palette so photography cannot corrupt accents (Q12)
  const mediaRects = [];
  for (const sel of ['img','picture','video']) {   // NOT canvas/svg: those are authored design, not photography
    for (const el of document.querySelectorAll(sel)) {
      let r; try { r = el.getBoundingClientRect(); } catch (e) { continue; }
      if (r && r.width > 24 && r.height > 24) {
        mediaRects.push({ x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height });
      }
    }
  }
  for (const n of nodes) {
    if (n.hasBgImage && !n.hasGradient && n.w > 60 && n.h > 60) {
      mediaRects.push({ x: n.left, y: n.top, w: n.w, h: n.h });
    }
  }

  // opts.only === 'v3' -> skip the v1 and full passes (the live path needs only v3).
  // Values are identical either way; this only avoids recomputing what nobody reads.
  const only = opts && ['v1', 'v2', 'v3'].includes(opts.only) ? opts.only : null;
  return {
    viewport: { w: VW, h: VH }, docHeight: Math.round(docH),
    title: document.title || '', url: location.href,
    scopes: only
      ? { [only]: analyse(scopes[only], 'viewport' + only.slice(1)) }
      : {
          v1: analyse(scopes.v1, 'viewport1'),
          v3: analyse(scopes.v3, 'viewport3'),
          full: analyse(scopes.full, 'fullpage')
        },
    mediaRects,
    overlays: { count: overlaySuspects.length, suspects: overlaySuspects.slice(0, 6) },
    authorRules, sheetErr
  };
}
