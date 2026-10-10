import { initNavSuction } from './nav-suction';

/** One reversible scroll path: absorb, arrive, hold, dock, release. */
export function initLogoNavJourney(cycle) {
  const section = document.querySelector('.folio-logo-pause');
  const stage = section?.querySelector('.logo-style-cycle');
  const header = document.querySelector('.studio-header');
  const brand = header?.querySelector('.studio-brand');
  const image = brand?.querySelector('img');
  if (!stage || !image) return () => {};

  const links = [...header.querySelectorAll('.studio-link')];
  const footer = document.querySelector('.footer-sequence');
  const footerTarget = footer?.querySelector('.footer-logo-anchor');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const controller = new AbortController();
  const suction = initNavSuction(header, links, image);
  // One moving box owns every material. Travel never changes its opacity.
  const anchor = document.createElement('div');
  anchor.className = 'logo-journey-anchor';
  anchor.setAttribute('aria-hidden', 'true');
  stage.before(anchor);
  const mark = document.createElement('div');
  mark.className = 'logo-journey-mark';
  mark.setAttribute('aria-hidden', 'true');
  const base = document.createElement('img');
  base.src = image.getAttribute('src');
  base.alt = '';
  base.className = 'logo-journey-base';
  // Two identical, aligned silhouettes let the paper edge recolor only the
  // portion it has reached, without fading or switching the whole mark.
  base.style.filter = 'brightness(0) invert(1)';
  const paperInk = base.cloneNode();
  paperInk.classList.add('logo-journey-paper-ink');
  paperInk.style.filter = 'brightness(0)';
  mark.append(base, paperInk, stage);
  header.append(mark);
  header.classList.add('has-logo-journey');
  section.classList.add('has-logo-journey');
  let frame = 0, geometry, disposed = false;
  let lastFooterY = NaN, footerSettledFrames = 0;
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;

  function paintPaperInk(centerY, boxWidth, paperTop, footerTravel) {
    // Matches the SVG's inset inside the square material-logo box in CSS.
    const inkHeight = boxWidth * .67083333;
    const inkTop = centerY - inkHeight / 2;
    const cut = footerTravel > 0 ? 1 : clamp((paperTop - inkTop) / inkHeight);
    paperInk.style.clipPath = `inset(${cut * 100}% 0 0 0)`;
    mark.dataset.paper = String(cut < 1);
    mark.dataset.paperInkCut = cut.toFixed(5);
  }

  function measure() {
    cancelAnimationFrame(frame);
    frame = 0;
    // Offset dimensions are unaffected by the visual absorption transforms.
    links.forEach(link => link.style.removeProperty('transform'));
    suction.measure();
    // The link is the stable layout anchor; the image can have a hover transform.
    const nav = image.getBoundingClientRect();
    const inkWidth = Math.min(image.offsetWidth, image.offsetHeight * 150.44 / 123.3);
    const target = anchor.getBoundingClientRect();
    geometry = {
      x: nav.left + nav.width / 2, y: nav.top + nav.height / 2,
      width: inkWidth,
      targetX: target.left + target.width / 2, targetWidth: target.width
    };
    update();
  }

  function update() {
    frame = 0;
    if (disposed || !geometry || !section.offsetHeight) return;
    const rect = section.getBoundingClientRect();
    const height = window.innerHeight;
    // Begin the descent when paper enters, before it reaches the logo.
    const entered = clamp((height * .98 - rect.top) / (height * .36));
    const arrival = smooth((height * .98 - rect.top) / (height * .98));
    const departure = clamp((height - rect.bottom) / height);
    const returnToNav = smooth(departure / .66);
    const release = clamp((departure - .66) / (1 - .66));
    const reducedPause = rect.top <= height * .5 && rect.bottom >= height * .5;
    const footerTop = footer?.getBoundingClientRect().top ?? Infinity;
    // The footer's first visible edge starts the intake. Finish gathering the
    // letters before the mark follows the rising footer to its left corner.
    const footerProgress = footerTop >= height - 1 ? 0 : footerTop <= 1 ? 1 : clamp((height - footerTop) / height);
    const inFooter = motion.matches
      ? footerTop <= Math.min(height * .3, 220)
      : footerProgress > 0;
    const footerAbsorb = motion.matches ? Number(inFooter) : clamp(footerProgress / .3);
    const footerTravel = motion.matches ? Number(inFooter) : smooth((footerProgress - .3) / .7);
    const absorption = Math.max(footerAbsorb, motion.matches ? Number(reducedPause) : entered * (1 - release));
    header.classList.toggle('is-footer-journey', footerAbsorb > 0);
    header.dataset.footerJourney = footerTravel >= 1 ? 'docked' : footerTravel > 0 ? 'travelling' : footerAbsorb > 0 ? 'absorbing' : 'inactive';
    const travelling = !motion.matches && entered > 0 && departure < 1;
    const docked = !motion.matches && rect.top <= 0 && rect.bottom >= height;
    // Finish the monochrome arrival before revealing the first material.
    // A reversible blur conceals the opaque exchange at its midpoint.
    const materialProgress = motion.matches ? 0 : smooth((height * .06 - rect.top) / (height * .16));
    const cycling = !motion.matches && materialProgress >= .5;
    cycle.setDocked?.(materialProgress >= 1);
    if (!cycling) cycle.reset?.();
    stage.style.visibility = cycling ? 'inherit' : 'hidden';
    base.style.visibility = cycling ? 'hidden' : 'inherit';
    paperInk.style.visibility = base.style.visibility;
    section.dataset.journey = docked ? 'centered' : arrival < 1 ? 'arriving' : departure < 1 ? 'returning' : 'complete';
    header.classList.toggle('is-logo-journey', travelling || (motion.matches && reducedPause));
      brand.inert = travelling || inFooter || (motion.matches && reducedPause);
    brand.style.visibility = footerAbsorb > 0 ? 'hidden' : '';
    links.forEach(link => {
      if (absorption === 0) {
        for (const property of ['transform', 'opacity', 'visibility']) link.style.removeProperty(property);
          link.inert = inFooter;
        return;
      }
      link.style.removeProperty('transform');
      link.style.removeProperty('opacity');
      link.style.visibility = absorption >= .999 ? 'hidden' : '';
        link.inert = inFooter || absorption > .02;
    });
    suction.render(absorption, motion.matches);
    if (motion.matches) {
      const target = anchor.getBoundingClientRect();
      if (reducedPause) {
        const origin = header.getBoundingClientRect();
        mark.style.cssText = `width:${target.width}px;height:${target.height}px;` +
          `transform:translate3d(${target.left - origin.left}px,${target.top - origin.top}px,0);`;
        paintPaperInk(target.top + target.height / 2, target.width, rect.top, footerTravel);
        return;
      }
      stage.style.visibility = 'hidden';
      base.style.visibility = 'inherit';
      paperInk.style.visibility = 'inherit';
    }
    const g = geometry;
    const progress = motion.matches ? 0 : arrival * (1 - returnToNav);
    // Read the actual, untransformed image every frame. Cached coordinates can
    // predate font/layout settlement and make the first scroll lift the logo.
    const nav = image.getBoundingClientRect();
    const origin = header.getBoundingClientRect();
    const navWidth = Math.min(nav.width, nav.height * 150.44 / 123.3);
    // logo0.webp has transparent padding: its ink bounds are 393px wide
    // inside 480px. Match that same box for the SVG at every scroll position.
    let width = mix(navWidth * 480 / 393, g.targetWidth, progress);
    let x = mix(nav.left + nav.width / 2, g.targetX, progress);
    let y = mix(nav.top + nav.height / 2, height / 2, progress);
    if (footerTarget && footerTravel > 0) {
      footerTarget.style.setProperty('--footer-logo-size', `${navWidth * 480 / 393}px`);
      const destination = footerTarget.getBoundingClientRect();
      footerSettledFrames = Math.abs(destination.top - lastFooterY) < .001 ? footerSettledFrames + 1 : 0;
      lastFooterY = destination.top;
      width = mix(width, destination.width, footerTravel);
      x = mix(x, destination.left + destination.width / 2, footerTravel);
      y = mix(y, destination.top + destination.height / 2, footerTravel);
    }
    paintPaperInk(y, width, rect.top, footerTravel);
    mark.style.cssText = `width:${width}px;height:${width}px;` +
      `transform:translate3d(${x - origin.left - width / 2}px,${y - origin.top - width / 2}px,0);` +
      `filter:blur(${(Math.sin(Math.PI * materialProgress) ** 3 * Math.min(10,width*.025)).toFixed(3)}px);`;
    // Follow the footer's scrubbed reveal until it settles, even after scrolling stops.
    if (footerTravel > 0 && footerSettledFrames < 6 && !document.hidden) frame = requestAnimationFrame(update);
  }

  const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', queue, { passive: true, signal: controller.signal });
  document.addEventListener('visibilitychange', queue, { signal: controller.signal });
  for (const event of ['resize', 'portfolio:ready', 'portfolio:reveal']) {
    window.addEventListener(event, measure, { signal: controller.signal });
  }
  motion.addEventListener('change', measure, { signal: controller.signal });
  const observer = new ResizeObserver(measure);
  observer.observe(section);
  observer.observe(header.querySelector('.studio-bar'));
  document.fonts.ready.then(() => { if (!disposed) measure(); });
  measure();
  return () => {
    disposed = true;
    suction.destroy();
    controller.abort(); observer.disconnect(); cancelAnimationFrame(frame);
    cycle.setDocked?.(false);
    anchor.replaceWith(stage);
    mark.remove(); section.classList.remove('has-logo-journey');
    header.classList.remove('has-logo-journey');
    header.classList.remove('is-footer-journey');
    footerTarget?.style.removeProperty('--footer-logo-size');
    delete header.dataset.footerJourney;
    brand.style.removeProperty('visibility');
    delete section.dataset.journey; stage.style.removeProperty('opacity');
    stage.style.removeProperty('visibility');
    stage.style.removeProperty('transform');
    header.classList.remove('is-logo-journey'); brand.inert = false;
    links.forEach(link => {
      for (const property of ['transform', 'opacity', 'visibility']) link.style.removeProperty(property);
      link.inert = false;
    });
  };
}
