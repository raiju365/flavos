// Source-space calibration for fotosebelahabout/selfphoto.png (736 × 1119).
// Only the eye interiors are remapped; the original portrait remains untouched.
const PATCH = { x: 307, y: 472, width: 126, height: 23 };
const EYES = [
  { x: 334, y: 483, rx: 20, ry: 6.5 },
  { x: 407, y: 482.5, rx: 19, ry: 6 },
];
const MAX_X = 5;
const MAX_Y = 2;

export function initPortraitGaze() {
  const photo = document.querySelector('#about .portrait-core');
  if (!photo) return () => {};
  const preference = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const layer = document.createElement('div');
  layer.className = 'portrait-gaze';
  layer.setAttribute('aria-hidden', 'true');
  layer.hidden = true;
  const canvas = document.createElement('canvas');
  canvas.width = PATCH.width;
  canvas.height = PATCH.height;
  canvas.style.cssText = `left:${PATCH.x / 736 * 100}%;top:${PATCH.y / 1119 * 100}%;width:${PATCH.width / 736 * 100}%;height:${PATCH.height / 1119 * 100}%;`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  layer.append(canvas);
  photo.after(layer);

  let disposed = false, visible = false, ready = false, frame = 0, previousTime = 0;
  let source, output, weights;
  let x = 0, y = 0, targetX = 0, targetY = 0;
  const enabled = () => ready && visible && preference.matches && !document.hidden;

  function paint() {
    const original = source.data;
    const dest = output.data;
    for (let i = 0; i < weights.length; i++) {
      const weight = weights[i];
      const index = i * 4;
      if (!weight) {
        dest.set(original.subarray(index, index + 4), index);
        continue;
      }
      const sx = i % PATCH.width - x * MAX_X * weight;
      const sy = Math.floor(i / PATCH.width) - y * MAX_Y * weight;
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const fx = sx - x0, fy = sy - y0;
      const a = (y0 * PATCH.width + x0) * 4;
      const b = a + PATCH.width * 4;
      for (let c = 0; c < 4; c++) {
        dest[index + c] = (original[a + c] * (1 - fx) + original[a + 4 + c] * fx) * (1 - fy)
          + (original[b + c] * (1 - fx) + original[b + 4 + c] * fx) * fy;
      }
    }
    ctx.putImageData(output, 0, 0);
    layer.dataset.gazeX = x.toFixed(3);
    layer.dataset.gazeY = y.toFixed(3);
  }

  function tick(time) {
    frame = 0;
    if (!enabled()) return;
    const dt = previousTime ? Math.min(time - previousTime, 50) : 16;
    previousTime = time;
    const ease = 1 - Math.exp(-dt / 85);
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    const settled = Math.abs(targetX - x) + Math.abs(targetY - y) < .001;
    if (settled) { x = targetX; y = targetY; }
    paint();
    if (!settled) frame = requestAnimationFrame(tick);
    else previousTime = 0;
  }

  function requestPaint() {
    if (enabled() && !frame) frame = requestAnimationFrame(tick);
  }

  function reset(immediate = false) {
    targetX = targetY = 0;
    if (immediate || !enabled()) {
      cancelAnimationFrame(frame);
      frame = previousTime = 0;
      x = y = 0;
      if (ready) paint();
    } else requestPaint();
  }

  function sync() {
    layer.hidden = !enabled();
    reset(true);
  }

  function follow(event) {
    if (!enabled() || event.pointerType === 'touch') return;
    const box = photo.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const centerX = box.left + 370.5 / 736 * box.width;
    const centerY = box.top + 483 / 1119 * box.height;
    // Both eyes share a distant gaze target, avoiding a cross-eyed look.
    targetX = Math.tanh((event.clientX - centerX) / Math.max(160, innerWidth * .26));
    targetY = Math.tanh((event.clientY - centerY) / Math.max(130, innerHeight * .3));
    requestPaint();
  }

  function initialize() {
    if (disposed || ready || photo.naturalWidth !== 736 || photo.naturalHeight !== 1119) return;
    try {
      ctx.drawImage(photo, PATCH.x, PATCH.y, PATCH.width, PATCH.height, 0, 0, PATCH.width, PATCH.height);
      source = ctx.getImageData(0, 0, PATCH.width, PATCH.height);
      output = ctx.createImageData(PATCH.width, PATCH.height);
      weights = new Float32Array(PATCH.width * PATCH.height);
      for (let py = 0; py < PATCH.height; py++) {
        for (let px = 0; px < PATCH.width; px++) {
          for (const eye of EYES) {
            const dx = (px + PATCH.x - eye.x) / eye.rx;
            const dy = (py + PATCH.y - eye.y) / eye.ry;
            const radius = Math.sqrt(dx * dx + dy * dy);
            const t = Math.max(0, Math.min(1, (1 - radius) / .7));
            weights[py * PATCH.width + px] = Math.max(weights[py * PATCH.width + px], t * t * (3 - 2 * t));
          }
        }
      }
      ready = true;
      sync();
    } catch {
      // A failed decode or inaccessible image must leave the normal photo intact.
      layer.hidden = true;
    }
  }

  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  });
  observer.observe(photo);
  const onLeave = () => reset();
  const onBlur = () => reset(true);
  photo.addEventListener('load', initialize);
  window.addEventListener('pointermove', follow, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onBlur);
  window.addEventListener('resize', onBlur, { passive: true });
  document.addEventListener('visibilitychange', sync);
  preference.addEventListener('change', sync);
  if (photo.complete && photo.naturalWidth) initialize();

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    photo.removeEventListener('load', initialize);
    window.removeEventListener('pointermove', follow);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('resize', onBlur);
    document.removeEventListener('visibilitychange', sync);
    preference.removeEventListener('change', sync);
    layer.remove();
  };
}
