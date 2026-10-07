const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };

/** A spatial timeline: reversing scroll retraces the exact same path. */
export function sampleNavGlyph(progress, glyph) {
  const t = clamp((progress - glyph.delay) / .76);
  const pull = t * t * (0.3 + 0.7 * t);
  const tension = Math.sin(Math.PI * clamp(t / .26)) ** 2;
  const flow = Math.sin(Math.PI * pull) ** 2;
  const intake = smooth((pull - .64) / .36);
  const side = Math.sign(glyph.dx);
  return {
    x: glyph.vertical
      ? glyph.groupDx * pull + (glyph.dx - glyph.groupDx) * intake
      : glyph.dx * pull - side * glyph.tension * tension,
    y: glyph.dy * pull + glyph.arc * flow,
    scaleX: (1 + flow * (glyph.vertical ? 0 : .9)) * (1 - intake * .985),
    scaleY: (1 + flow * (glyph.vertical ? .3 : 0)) * (1 - intake * .985),
    skew: glyph.vertical ? 0 : side * flow * -9,
    blur: flow * .65,
    hidden: t >= 1,
  };
}

/** Original DOM type flows into the mark; no canvas text or duplicate labels. */
export function initNavSuction(header, links, image) {
  let glyphs = [], current = 0, reducedMotion = false, lastProgress = -1;
  const reset = cell => {
    for (const key of ['transform', 'filter', 'opacity', 'visibility']) cell.style.removeProperty(key);
  };
  function measure() {
    glyphs.forEach(g => reset(g.cell));
    const target = image.getBoundingClientRect();
    const x = target.left + target.width / 2;
    const y = target.top + target.height / 2;
    glyphs = links.filter(link => link.getClientRects().length && getComputedStyle(link).display !== 'none')
      .flatMap(link => {
        const cells = [...link.querySelectorAll('.nav-letter')];
        const box = link.getBoundingClientRect();
        const left = box.left + box.width / 2 < x;
        const distance = Math.abs(x - box.left - box.width / 2);
        const vertical = Math.abs(y - box.top - box.height / 2) > Math.max(distance * 2, 100);
        const word = link.querySelector('.nav-letters').getBoundingClientRect();
        return cells.map((cell, index) => {
          const rect = cell.getBoundingClientRect();
          const order = left ? cells.length - 1 - index : index;
          return {
            cell, dx: x - rect.left - rect.width / 2, dy: y - rect.top - rect.height / 2,
            // Inner letters lead; distant words follow without delaying the CTA excessively.
            // The bottom mobile CTA travels as a word, avoiding a long vertical letter ladder.
            delay: vertical ? .1 : Math.min(distance / 300, 1) * .12 + order / Math.max(cells.length - 1, 1) * .11,
            tension: Math.min(distance * .022, 4),
            arc: vertical ? 0 : (left ? -1 : 1) * Math.min(10, distance * .035),
            vertical,
            groupDx: x - word.left - word.width / 2,
          };
        });
      });
    lastProgress = -1;
    render(current, reducedMotion);
  }
  function render(progress, reduced) {
    // Discard subpixel endpoint residue so resting links regain their hover state.
    current = progress < .000001 ? 0 : progress > .999999 ? 1 : clamp(progress);
    if (current === lastProgress && reduced === reducedMotion) return;
    lastProgress = current;
    reducedMotion = reduced;
    const active = current > 0 && !reduced;
    header.classList.toggle('is-nav-suction', active);
    header.dataset.navFlow = reduced ? 'reduced' : current === 0 ? 'rest' : current === 1 ? 'absorbed' : 'flowing';
    for (const g of glyphs) {
      if (!active) { reset(g.cell); continue; }
      const state = sampleNavGlyph(current, g);
      g.cell.style.transform = `translate3d(${state.x}px,${state.y}px,0) skewX(${state.skew}deg) scale(${state.scaleX},${state.scaleY})`;
      g.cell.style.filter = state.blur > .01 ? `blur(${state.blur}px)` : 'none';
      // Disappear inside the monogram, never fade along the route.
      g.cell.style.visibility = state.hidden ? 'hidden' : '';
    }
  }
  return { measure, render, destroy() {
    glyphs.forEach(g => reset(g.cell));
    delete header.dataset.navFlow;
    header.classList.remove('is-nav-suction');
  } };
}
