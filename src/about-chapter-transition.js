// Scroll-seekable adaptation of Codrops' layered clip-path page reveal:
// https://tympanus.net/codrops/2026/02/26/building-async-page-transitions-in-vanilla-javascript/
// Paper carries the transition; the portrait retains its original geometry.
export function createAboutChapterTransition(stage) {
  const layer = document.createElement('div');
  layer.className = 'about-chapter';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `
    <div class="about-chapter-shutter about-chapter-shutter--left"></div>
    <div class="about-chapter-shutter about-chapter-shutter--right"></div>
    <div class="about-chapter-page">
      <div class="about-chapter-title-mask">
        <div class="about-chapter-title">Work<span>.</span></div>
      </div>
    </div>`;
  stage.append(layer);
  const page = layer.querySelector('.about-chapter-page');
  const title = layer.querySelector('.about-chapter-title');
  const titleMask = layer.querySelector('.about-chapter-title-mask');
  const leftShutter = layer.querySelector('.about-chapter-shutter--left');
  const rightShutter = layer.querySelector('.about-chapter-shutter--right');
  const portrait = stage.querySelector('.about-art-showcase');
  let geometryDirty = true, photoLeft = 0, photoRight = 0;
  const resize = new ResizeObserver(() => { geometryDirty = true; previous = -1; });
  resize.observe(stage);
  if (portrait) resize.observe(portrait);
  const motion = matchMedia('(min-width: 768px) and (min-height: 651px) and (prefers-reduced-motion: no-preference)');
  const clamp = n => Math.max(0, Math.min(1, n));
  // Zero velocity and acceleration at both ends, including reverse scrolling.
  const ease = n => { const t = clamp(n); return t * t * t * (t * (t * 6 - 15) + 10); };
  let previous = -1, current = 0, workVisible = false;
  function render(progress) {
    current = clamp(progress);
    const t = motion.matches ? current : 0;
    const visible = t >= .55;
    if (visible !== workVisible) {
      workVisible = visible;
      layer.dataset.workVisible = String(visible);
      window.dispatchEvent(new Event('portfolio:chapterchange'));
    }
    if (Math.abs(t - previous) < .00001) return;
    previous = t;
    if (geometryDirty && portrait) {
      const bounds = portrait.getBoundingClientRect();
      const origin = layer.getBoundingClientRect().left;
      photoLeft = bounds.left - origin;
      photoRight = bounds.right - origin;
      geometryDirty = false;
    }
    // Paper closes only across the portrait's footprint. Once closed, a
    // stationary word opens from a narrow central slit, like printed ink.
    const cover = ease(t / .44);
    const enter = ease((t - .44) / .42);
    const middle = (photoLeft + photoRight) / 2;
    leftShutter.style.width = `${photoLeft + (middle - photoLeft) * cover}px`;
    rightShutter.style.left = `${photoRight - (photoRight - middle) * cover}px`;
    layer.style.visibility = t > 0 ? 'visible' : 'hidden';
    page.style.clipPath = 'none';
    title.style.transform = 'none';
    const edge = ((1 - enter) * 50).toFixed(4);
    titleMask.style.clipPath = `inset(${edge}% 0 ${edge}% 0)`;
    titleMask.style.willChange = t > .44 && t < .86 ? 'clip-path' : 'auto';
    layer.dataset.phase = t < .44 ? 'paper-close' : t < .86 ? 'ink-reveal' : 'settle';
  }
  const onMedia = () => { previous = -1; render(current); };
  motion.addEventListener('change', onMedia);
  render(0);
  return { render, dispose() {
    render(0);
    resize.disconnect();
    motion.removeEventListener('change', onMedia);
    layer.remove();
  } };
}
