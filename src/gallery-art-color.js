import gsap from 'gsap';

// Develop the color channels on the same image, preserving its exact crop.
export function createGalleryArtColor(surface, seed, motion) {
  const source = surface.querySelector('img');
  if (!source) return null;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'orbit-color-filter');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const filter = document.createElementNS(ns, 'filter');
  const id = `orbit-develop-${seed}`;
  filter.id = id;
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  filter.setAttribute('x', '0'); filter.setAttribute('y', '0');
  filter.setAttribute('width', '100%'); filter.setAttribute('height', '100%');
  const matrix = document.createElementNS(ns, 'feColorMatrix');
  matrix.setAttribute('type', 'matrix');
  filter.append(matrix); svg.append(filter); surface.append(svg);
  const state = { progress: 0 };
  const orders = [[0, 1, 2], [1, 0, 2], [2, 1, 0], [0, 2, 1], [1, 2, 0]];
  const order = orders[(seed - 1) % orders.length];
  const luminance = [.2126, .7152, .0722];
  const smooth = t => t * t * (3 - 2 * t);
  function paint() {
    // The resting artwork needs a single native grayscale pass. Keep the SVG
    // channel filter only while its color reveal is actually interpolating.
    // This avoids nested SVG + blur surfaces on every falling card.
    if (state.progress <= 0 || state.progress >= 1) {
      source.style.filter = state.progress <= 0 ? 'grayscale(1)' : 'none';
      source.dataset.colorProgress = state.progress.toFixed(4);
      return;
    }
    source.style.filter = `url(#${id})`;
    const rows = luminance.map((_, channel) => {
      const delay = order.indexOf(channel) * .12;
      const gain = smooth(Math.max(0, Math.min(1, (state.progress - delay) / (1 - delay))));
      return [...luminance.map((weight, component) =>
        weight * (1 - gain) + (component === channel ? gain : 0)), 0, 0];
    });
    matrix.setAttribute('values', [...rows.flat(), 0, 0, 0, 1, 0].join(' '));
    source.dataset.colorProgress = state.progress.toFixed(4);
  }
  paint();
  return {
    setActive(value, immediate = false) {
      gsap.killTweensOf(state);
      if (immediate || motion.matches) {
        state.progress = value ? 1 : 0; paint();
      } else {
        gsap.to(state, { progress: value ? 1 : 0, duration: value ? .95 : .45,
          ease: 'power1.inOut', onUpdate: paint });
      }
    },
    dispose() {
      gsap.killTweensOf(state); svg.remove(); source.style.removeProperty('filter');
      delete source.dataset.colorProgress;
    }
  };
}
