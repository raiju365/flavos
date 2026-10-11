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
  let visible = false, frame = 0, previous = 0, elapsed = 0, pixels;
  const palette = getComputedStyle(footer);
  const rgb = (name, fallback) => {
    const hex = palette.getPropertyValue(name).trim() || fallback;
    return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
  };
  const ink = rgb('--folio-ink', '#20235b');
  const paper = rgb('--folio-paper', '#f8f7f3');
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const mix = (a, b, t) => a + (b - a) * t;
  // Alternating colour regions form a soft mesh. Different, continuous phase
  // rates keep the composition evolving without a shared short-loop reset.
  const regions = [
    [-.82, -.65, 0, .0, .83], [.15, -.85, 1, 1.7, .71],
    [.87, -.12, 0, 3.2, .91], [-.65, .35, 1, 4.6, .77],
    [.05, .85, 0, 2.4, .67], [.95, .85, 1, 5.5, .87],
  ];
  const draw = () => {
    const { width, height } = canvas;
    const time = elapsed * .00034;
    const fields = regions.map(([x, y, tone, phase, rate]) => {
      const angle = .55 * Math.sin(time * rate * .63 + phase);
      const radiusX = .66 + .13 * Math.sin(time * rate + phase);
      const radiusY = .83 + .16 * Math.cos(time * rate * .79 + phase);
      return {
        x: x + .42 * Math.sin(time * rate + phase) + .12 * Math.cos(time * .47 + phase),
        y: y + .38 * Math.cos(time * rate * .87 + phase) + .1 * Math.sin(time * .59 + phase),
        cos: Math.cos(angle), sin: Math.sin(angle),
        inverseX: 1 / (radiusX * radiusX), inverseY: 1 / (radiusY * radiusY), tone,
      };
    });
    const data = pixels.data;
    for (let y = 0; y < height; y++) {
      const v = y / height * 2 - 1;
      for (let x = 0; x < width; x++) {
        const u = x / width * 2 - 1;
        let weight = 0, colour = 0;
        for (const field of fields) {
          const dx = u - field.x, dy = v - field.y;
          const localX = dx * field.cos + dy * field.sin;
          const localY = dy * field.cos - dx * field.sin;
          const influence = Math.exp(-2 * (localX * localX * field.inverseX + localY * localY * field.inverseY));
          weight += influence;
          colour += influence * field.tone;
        }
        const blend = Math.max(0, Math.min(1, (colour / weight - .16) / .68));
        const smooth = fade(blend);
        const i = (y * width + x) * 4;
        data[i] = mix(ink[0], paper[0], smooth);
        data[i + 1] = mix(ink[1], paper[1], smooth);
        data[i + 2] = mix(ink[2], paper[2], smooth);
        data[i + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
  };
  const resize = () => {
    const ratio = (footer.clientWidth || innerWidth) / (footer.clientHeight || innerHeight);
    canvas.width = Math.max(1, Math.round(180 * Math.min(1, ratio)));
    canvas.height = Math.max(1, Math.round(180 / Math.max(1, ratio)));
    pixels = context.createImageData(canvas.width, canvas.height);
    draw();
  };
  const tick = now => {
    frame = 0;
    if (!visible || document.hidden || motion.matches) { previous = 0; return; }
    if (!previous) previous = now;
    if (now - previous >= 1000 / 24) {
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
