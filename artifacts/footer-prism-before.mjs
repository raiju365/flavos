const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, amount) => a + (b - a) * amount;
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

function toOklab(rgb) {
  const [r, g, b] = rgb.map(value => {
    const channel = value / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [
    .2104542553 * l + .793617785 * m - .0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + .4505937099 * s,
    .0259040371 * l + .7827717662 * m - .808675766 * s,
  ];
}

function fromOklab([l, a, b]) {
  const x = (l + .3963377774 * a + .2158037573 * b) ** 3;
  const y = (l - .1055613458 * a - .0638541728 * b) ** 3;
  const z = (l - .0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * x - 3.3077115913 * y + .2309699292 * z,
    -1.2684380046 * x + 2.6097574011 * y - .3413193965 * z,
    -.0041960863 * x - .7034186147 * y + 1.707614701 * z,
  ].map(value => Math.round(255 * clamp(value <= .0031308
    ? value * 12.92 : 1.055 * Math.max(0, value) ** (1 / 2.4) - .055)));
}

export function initFooterGradient() {
  const footer = document.querySelector('.signature-footer');
  if (!footer) return () => { };
  const canvas = document.createElement('canvas');
  canvas.className = 'footer-flow';
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return () => { };
  footer.prepend(canvas);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false, frame = 0, previous = 0, elapsed = 0;
  const palette = getComputedStyle(footer);
  const rgb = (name, fallback) => {
    const hex = palette.getPropertyValue(name).trim() || fallback;
    return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
  };
  const ink = rgb('--folio-ink', '#20235b');
  const paper = rgb('--folio-paper', '#f8f7f3');
  const inkLab = toOklab(ink), paperLab = toOklab(paper);
  // Cobalt pearl's five stops at 10/30/50/70/90%, remapped to the site's
  // ink and paper. Keep the reference's relative lightness and Oklab blending.
  const tones = [0, .303, .664, .922, 1];
  const colors = Array.from({ length: 256 }, (_, index) => {
    const stop = clamp((index / 255 - .1) / .8) * 4;
    const lower = Math.min(3, Math.floor(stop));
    const amount = mix(tones[lower], tones[lower + 1], stop - lower);
    return fromOklab(inkLab.map((value, channel) => mix(value, paperLab[channel], amount)));
  });
  const sample = amount => {
    const position = clamp(amount) * 255, index = Math.floor(position);
    return colors[index].map((value, channel) =>
      mix(value, colors[Math.min(255, index + 1)][channel], position - index));
  };

  // Adapted from the supplied PRISM2 renderer: 16 facets per half, crest,
  // direction 2, size 180, height 100, position 42, blend 65, speed 100.
  const draw = () => {
    const { width, height } = canvas;
    const time = 87.39223534400392 + elapsed * .0012;
    const travel = time * .48;
    context.fillStyle = `rgb(${ink.join(',')})`;
    context.fillRect(0, 0, width, height);
    context.save();
    context.setTransform(-width, 0, 0, -height, width, height);
    // Draw from left to right, with one physical pixel of overlap at each seam.
    for (const side of [-1, 1]) {
      const first = Math.floor(-travel), last = Math.ceil(16 - travel);
      for (let facet = side < 0 ? last - 1 : first;
        side < 0 ? facet >= first : facet < last; facet += side) {
        const inner = Math.max(0, (facet + travel) / 16);
        const outer = Math.min(1, (facet + 1 + travel) / 16);
        if (outer <= inner) continue;
        const start = side < 0 ? (1 - outer) / 2 : (1 + inner) / 2;
        const end = side < 0 ? (1 - inner) / 2 : (1 + outer) / 2;
        const center = (start + end) / 2;
        const offset = (center - .5) * 2 / 1.8;
        const crest = .5 - .5 * Math.cos(Math.min(1, Math.abs(offset)) * Math.PI);
        const horizon = .28 + crest * .6 - .072 + .015 * Math.sin(time * .32);
        const tint = .025 * Math.sin(facet * 1.8) + .012 * Math.sin(facet * .73 + time * .24);
        const gradient = context.createLinearGradient(0, 0, 0, 1);
        for (let row = 0; row < 96; row++) {
          const y = row / 95;
          const tone = clamp(.02 + .96 * smooth((y - horizon + .22) / .74) + tint);
          const color = sample(tone).map(value => value.toFixed(3));
          gradient.addColorStop(y, `rgb(${color.join(',')})`);
        }
        context.fillStyle = gradient;
        context.fillRect(start, 0, end - start + 1 / width, 1);
      }
    }
    context.restore();
  };
  const resize = () => {
    const width = footer.clientWidth || innerWidth;
    const height = footer.clientHeight || innerHeight;
    const scale = Math.min(devicePixelRatio || 1, 1.5, 1920 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    draw();
  };
  const tick = now => {
    frame = 0;
    if (!visible || document.hidden || motion.matches) { previous = 0; return; }
    if (!previous) previous = now;
    if (now - previous >= 1000 / 30) {
      elapsed += Math.min(now - previous, 100);
      previous = now;
      draw();
    }
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    if (visible && !document.hidden && !motion.matches) frame = requestAnimationFrame(tick);
  };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  const sizing = new ResizeObserver(resize);
  resize(); observer.observe(footer); sizing.observe(footer);
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  return () => {
    cancelAnimationFrame(frame); observer.disconnect(); sizing.disconnect();
    motion.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
    canvas.remove();
  };
}
