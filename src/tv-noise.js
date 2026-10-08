// Refresh independent grain samples instead of translating a repeating image.
// Every pixel in the viewport buffer gets its own sample, without repeated tiles.
export function initTvNoise() {
  const overlay = document.querySelector('.tv-noise');
  if (!overlay) return () => {};
  const gallery = document.querySelector('#project-gallery');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  const connection = navigator.connection;
  const limitedDevice = (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4)
    || (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);
  const canvas = document.createElement('canvas');
  canvas.className = 'tv-noise-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return () => {};
  let frame, pixels;
  const littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
  const alpha = littleEndian ? 0xff000000 : 0xff;
  const grayMask = littleEndian ? 0x00010101 : 0x01010100;
  let raf = 0, lastDraw = 0, rate = 60, maxPixels = 800000;
  let pageActive = true, disposed = false, slowDraws = 0;
  overlay.append(canvas);

  function draw() {
    if (!pixels) return;
    // Fresh seed every frame; no finite animation clip or eight-pose loop.
    let seed = (Math.random() * 0xffffffff) >>> 0 || 19;
    for (let i = 0; i < pixels.length; i++) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const shade = ((seed >>> 24) + ((seed >>> 16) & 255)) >>> 1;
      pixels[i] = alpha | (shade * grayMask);
    }
    // Direct replacement prevents accumulation; neutral gray blending lives in CSS.
    ctx.putImageData(frame, 0, 0);
    overlay.dataset.noiseRenderer = 'canvas';
  }

  function tick(now) {
    if (disposed || document.hidden || !pageActive || reducedMotion.matches || gallery?.open) {
      raf = 0;
      return;
    }
    const interval = 1000 / rate;
    const elapsed = now - lastDraw;
    if (elapsed >= interval - 0.5) {
      lastDraw = now - (elapsed % interval);
      const start = performance.now();
      draw();
      // Back off if generating / submitting this effect repeatedly costs too much.
      slowDraws = performance.now() - start > 3 ? slowDraws + 1 : Math.max(0, slowDraws - 1);
      if (slowDraws >= 6 && rate > 30) {
        rate = rate > 60 ? 60 : 30;
        overlay.dataset.noiseRate = String(rate);
        slowDraws = 0;
      }
    }
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    overlay.setAttribute('data-noise-paused', '');
  }
  function syncPlayback() {
    stop();
    if (disposed || document.hidden || !pageActive || reducedMotion.matches || gallery?.open) return;
    overlay.removeAttribute('data-noise-paused');
    lastDraw = 0;
    raf = requestAnimationFrame(tick);
  }
  function resize() {
    // Never multiply by devicePixelRatio: retina screens must not quadruple work.
    const width = Math.max(1, overlay.clientWidth);
    const height = Math.max(1, overlay.clientHeight);
    const scale = Math.min(1, Math.sqrt(maxPixels / (width * height)));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    if (canvas.width === targetWidth && canvas.height === targetHeight) return;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    frame = ctx.createImageData(targetWidth, targetHeight);
    pixels = new Uint32Array(frame.data.buffer);
    if (!document.hidden && pageActive) draw();
  }
  function updateSettings() {
    const limited = limitedDevice || connection?.saveData;
    rate = limited ? 24 : 30;
    maxPixels = limited ? 600000 : coarsePointer.matches ? 800000 : 1500000;
    overlay.dataset.noiseRate = String(rate);
    slowDraws = 0;
    resize();
    syncPlayback();
  }
  function hidePage() { pageActive = false; stop(); }
  function showPage() { pageActive = true; syncPlayback(); }
  updateSettings();
  // The opaque modal covers the grain; resume it when the gallery closes.
  const galleryVisibility = new MutationObserver(syncPlayback);
  if (gallery) galleryVisibility.observe(gallery, { attributes: true, attributeFilter: ['open'] });
  coarsePointer.addEventListener('change', updateSettings);
  reducedMotion.addEventListener('change', syncPlayback);
  connection?.addEventListener('change', updateSettings);
  document.addEventListener('visibilitychange', syncPlayback);
  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', hidePage);
  window.addEventListener('pageshow', showPage);

  function dispose() {
    disposed = true;
    galleryVisibility.disconnect();
    stop();
    coarsePointer.removeEventListener('change', updateSettings);
    reducedMotion.removeEventListener('change', syncPlayback);
    connection?.removeEventListener('change', updateSettings);
    document.removeEventListener('visibilitychange', syncPlayback);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pagehide', hidePage);
    window.removeEventListener('pageshow', showPage);
    canvas.remove();
    overlay.removeAttribute('data-noise-renderer');
    overlay.removeAttribute('data-noise-rate');
    overlay.removeAttribute('data-noise-paused');
  }
  if (import.meta.hot) import.meta.hot.dispose(dispose);
  return dispose;
}
