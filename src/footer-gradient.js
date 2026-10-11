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
  // Seeded spatial noise: independent patches merge and separate without
  // imposing parallel bands or a common direction across the whole canvas.
  const seed = Math.random() * 1000;
  const hash = (x, y, z) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed) * 43758.5453;
    return n - Math.floor(n);
  };
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const mix = (a, b, t) => a + (b - a) * t;
  const noise = (x, y, z) => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = fade(x - ix), fy = fade(y - iy), fz = fade(z - iz);
    const plane = dz => mix(
      mix(hash(ix, iy, iz + dz), hash(ix + 1, iy, iz + dz), fx),
      mix(hash(ix, iy + 1, iz + dz), hash(ix + 1, iy + 1, iz + dz), fx), fy);
    return mix(plane(0), plane(1), fz);
  };
  const targets = [...footer.querySelectorAll('.footer-direct, .footer-back-to-top')];
  const updateContrast = () => {
    const bounds = footer.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const mark = document.querySelector('.logo-journey-mark');
    for (const element of [...targets, ...(mark ? [mark] : [])]) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom < bounds.top || rect.top > bounds.bottom) {
        delete element.dataset.footerContrast; element.style.removeProperty('--footer-auto-ink'); continue;
      }
      let luminance = 0;
      for (const fraction of [.1, .3, .5, .7, .9]) {
        const x = Math.max(0, Math.min(canvas.width - 1, Math.round((rect.left + rect.width * fraction - bounds.left) / bounds.width * canvas.width)));
        const y = Math.max(0, Math.min(canvas.height - 1, Math.round((rect.top + rect.height / 2 - bounds.top) / bounds.height * canvas.height)));
        const offset = (y * canvas.width + x) * 4;
        const channels = [0, 1, 2].map(i => {
          const channel = pixels.data[offset + i] / 255;
          return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
        });
        luminance += channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
      }
      luminance /= 5;
      // A narrow dead band prevents flicker while the gradient crosses a label.
      const threshold = element.dataset.footerContrast === 'light' ? .205 : .175;
      const tone = luminance < threshold ? 'light' : 'dark';
      element.dataset.footerContrast = tone;
      element.style.setProperty('--footer-auto-ink', tone === 'light' ? '#f8f7f3' : '#081624');
    }
  };
  const clearContrast = () => {
    document.querySelectorAll('[data-footer-contrast]').forEach(element => {
      delete element.dataset.footerContrast; element.style.removeProperty('--footer-auto-ink');
    });
  };
  const draw = () => {
    const { width, height } = canvas;
    const time = elapsed * .0001;
    const data = pixels.data;
    for (let y = 0; y < height; y++) {
      const v = y / height * 2 - 1;
      for (let x = 0; x < width; x++) {
        const u = x / width * 2 - 1;
        const warpX = noise(u * 1.15 + 8, v * 1.15, time * .63);
        const warpY = noise(u * 1.3, v * 1.3 + 17, time * .57 + 9);
        const a = u * 1.45 + (warpX - .5) * 2.6;
        const b = v * 1.45 + (warpY - .5) * 2.6;
        const field = noise(a + 31, b + 7, time) * .78
          + noise(a * 1.9 - 12, b * 1.9 + 5, time * .81) * .22;
        const blend = Math.max(0, Math.min(1, (field - .32) / .36));
        const smooth = fade(blend);
        const i = (y * width + x) * 4;
        data[i] = mix(ink[0], paper[0], smooth);
        data[i + 1] = mix(ink[1], paper[1], smooth);
        data[i + 2] = mix(ink[2], paper[2], smooth);
        data[i + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
    updateContrast();
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
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) updateContrast(); else clearContrast(); sync(); });
  const sizing = new ResizeObserver(resize);
  resize(); observer.observe(footer); sizing.observe(footer);
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  const refreshStaticContrast = () => { if (visible && motion.matches) updateContrast(); };
  window.addEventListener('scroll', refreshStaticContrast, { passive: true });
  return () => {
    cancelAnimationFrame(frame); observer.disconnect(); sizing.disconnect();
    motion.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
    window.removeEventListener('scroll', refreshStaticContrast);
    clearContrast(); canvas.remove();
  };
}
