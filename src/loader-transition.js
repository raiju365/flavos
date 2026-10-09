import gsap from 'gsap';
import './loader.css';

export function createKineticLoader({ loader, reducedMotion = false, restoring = false }) {
  if (!loader) return { setProgress() { }, clearError() { }, showError() { }, reveal: () => Promise.resolve() };

  const mark = loader.querySelector('.loader-mark');
  const track = loader.querySelector('.loader-travel-track');
  const progressEl = loader.querySelector('.loader-progress');
  const percent = loader.querySelector('.loader-percent');
  const blurElem = loader.querySelector('#loader-blur-elem');
  const status = loader.querySelector('.loader-status');
  const retry = loader.querySelector('.loader-retry');

  const state = { progress: 0 };
  let target = 0;
  let ready = false;
  let disposed = false;
  let exiting = false;
  let exit;
  let resolveReveal;
  let currentBlur = 0;
  let currentCounterSkew = 0; // Gaia is naturally upright.
  let lastVal = -1;
  let cachedTrackWidth = 0;
  let cachedProgressWidth = 0;
  const completion = new Promise(resolve => { resolveReveal = resolve; });
  const startedAt = performance.now();

  function updateMeasurements() {
    if (track) cachedTrackWidth = track.clientWidth || track.offsetWidth;
    if (progressEl) cachedProgressWidth = progressEl.offsetWidth;
  }
  updateMeasurements();
  window.addEventListener('resize', updateMeasurements);

  // Entrance: Logo appears in exact center, percentage starts at bottom left (0)
  if (reducedMotion) {
    if (mark) gsap.set(mark, { opacity: 1 });
    if (progressEl) gsap.set(progressEl, { opacity: 1 });
  } else {
    if (mark) {
      gsap.fromTo(mark,
        { opacity: 0, scale: 0.94 },
        { opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out' }
      );
    }
    if (progressEl) {
      gsap.fromTo(progressEl,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, delay: 0.08, ease: 'power2.out' }
      );
    }
  }

  function paint() {
    const rounded = Math.round(state.progress);
    if (percent && rounded !== lastVal) {
      percent.textContent = String(rounded);
      lastVal = rounded;
      if (progressEl) cachedProgressWidth = progressEl.offsetWidth;
    }

    if (progressEl) {
      if (cachedTrackWidth === 0) updateMeasurements();
      // Compensate for skewX making text visually narrower than its layout width
      // Visual width ≈ layoutWidth * cos(skewAngle), so the gap = layoutWidth * (1 - cos(skew))
      const skewRad = (currentCounterSkew * Math.PI) / 180;
      const skewCompensation = cachedProgressWidth * (1 - Math.cos(skewRad));
      const maxTravel = Math.max(0, cachedTrackWidth - cachedProgressWidth + skewCompensation);
      const currentX = (state.progress / 100) * maxTravel;
      progressEl.style.transform = `translate3d(${currentX.toFixed(1)}px, 0, 0)`;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    window.removeEventListener('resize', updateMeasurements);
    gsap.ticker.remove(tick);
    exit?.kill();
    loader.remove();
    resolveReveal();
  }

  function leave() {
    if (exiting) return;
    exiting = true;
    state.progress = 100;
    currentBlur = 0;
    if (blurElem) blurElem.setAttribute('stdDeviation', '0 0');
    if (percent) {
      percent.textContent = '100';
      percent.style.textShadow = 'none';
      percent.style.transform = 'translateZ(0)';
      percent.style.filter = 'none';
    }
    paint();
    loader.dataset.phase = 'opening';

    const tl = gsap.timeline({ onComplete: dispose });

    if (restoring) {
      // Resume the settled destination without replaying the white Hero handoff.
      tl.to([mark, progressEl].filter(Boolean), { opacity: 0, duration: reducedMotion ? .1 : .25, ease: 'power2.out' });
      tl.call(() => window.dispatchEvent(new Event('portfolio:hero-enter')));
      tl.to(loader, { opacity: 0, duration: reducedMotion ? .25 : .95, ease: 'power2.inOut' }, reducedMotion ? .1 : .3);
    } else if (reducedMotion) {
      tl.to(loader, { opacity: 0, duration: 0.3 });
    } else {
      // 1. Brief pause at 100 so user sees the completed right-aligned 100
      // 2. Traveling counter gracefully fades
      if (progressEl) {
        tl.to(progressEl, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out'
        }, 0.2);
      }

      // Complete the existing loader, then hand off through a clean white field.
      tl.to(mark, { opacity: 0, duration: .25 }, .2);
      tl.to(loader, { backgroundColor: '#ffffff', duration: .45, ease: 'power2.inOut' }, .35);
      tl.call(() => window.dispatchEvent(new Event('portfolio:hero-enter')), [], .85);
      tl.to(loader, {
        opacity: 0,
        duration: .2,
        ease: 'power2.inOut'
      }, .85);
      tl.to({}, { duration: 1.55 });
    }

    exit = tl;
  }

  function tick(_time, delta) {
    if (disposed || exiting) return;
    const elapsed = (performance.now() - startedAt) / 1000;
    const ceiling = ready ? 100 : Math.min(99, target);
    const paced = reducedMotion ? ceiling : Math.min(ceiling, (elapsed / 2.0) * 100);
    const prev = state.progress;
    state.progress += (paced - state.progress) * (1 - Math.exp(-Math.min(delta, 80) / 90));
    if (ready && 100 - state.progress < 0.2) state.progress = 100;

    // Calculate count velocity (% per second)
    const dt = Math.max(delta, 1) / 1000;
    const speed = Math.abs(state.progress - prev) / dt;

    // Universal motion blur intensity (normalized so mobile, iPad, and desktop all get full impact)
    // Counting speed typically reaches 35 - 55 %/s
    const speedIntensity = Math.min(1.0, Math.max(0, speed / 32));
    // Edge proximity factor: smoothly fade blur to 0 near 0% and 100%
    // Uses a bell-shaped curve that's 0 at edges, 1 in the middle zone (5%-95%)
    const edgeDist = Math.min(state.progress, 100 - state.progress) / 5; // 0→1 over first/last 5%
    const edgeFade = Math.min(1, edgeDist);
    const targetBlur = (reducedMotion || exiting) ? 0 : speedIntensity * 7.5 * edgeFade;
    currentBlur += (targetBlur - currentBlur) * 0.38;
    if (currentBlur < 0.05) currentBlur = 0;

    // Cross-platform horizontal motion blur (works on iOS Safari, iPadOS, Android, Desktop):
    if (blurElem) {
      blurElem.setAttribute('stdDeviation', `${currentBlur.toFixed(2)} 0`);
    }
    if (percent) {
      // Gaia stays upright at the endpoints, leaning slightly during travel.
      // Flat zone: stay fully upright for the first/last 10% so the fast
      // initial acceleration doesn't cause a visible snap
      const p = state.progress / 100;
      const FLAT = 0.10; // 10% flat zone at each edge
      const t = Math.max(0, Math.min(1, (p - FLAT) / (1 - 2 * FLAT))); // 10%-90% → 0→1
      const s = t * t * t * (t * (6 * t - 15) + 10); // quintic smootherstep (C2 continuous)
      const italicAmount = 4 * s * (1 - s); // bell: 0 at edges, 1 at center
      const counterSkew = -8 * italicAmount; // Slight travel lean, upright at rest.
      currentCounterSkew = counterSkew;

      if (currentBlur > 0.2) {
        const b = currentBlur;
        // Directional horizontal trail behind (negative X) + forward dispersion + scaleX elongation
        percent.style.textShadow = [
          `-${(b * 2.2).toFixed(1)}px 0 ${(b * 1.5).toFixed(1)}px rgba(255, 255, 255, 0.25)`,
          `-${(b * 1.3).toFixed(1)}px 0 ${(b * 0.9).toFixed(1)}px rgba(255, 255, 255, 0.5)`,
          `-${(b * 0.6).toFixed(1)}px 0 ${(b * 0.4).toFixed(1)}px rgba(255, 255, 255, 0.8)`,
          `${(b * 0.6).toFixed(1)}px 0 ${(b * 0.5).toFixed(1)}px rgba(255, 255, 255, 0.35)`
        ].join(', ');
        percent.style.transform = `skewX(${counterSkew.toFixed(2)}deg) scaleX(${(1 + b * 0.032).toFixed(3)}) translateZ(0)`;
        percent.style.filter = `blur(${(b * 0.32).toFixed(2)}px)`;
      } else {
        percent.style.textShadow = 'none';
        percent.style.transform = Math.abs(counterSkew) > 0.1 ? `skewX(${counterSkew.toFixed(2)}deg) translateZ(0)` : 'none';
        percent.style.filter = 'none';
      }
    }

    paint();
    if (ready && state.progress === 100) leave();
  }

  paint();
  gsap.ticker.add(tick);
  if (import.meta.hot) import.meta.hot.dispose(dispose);

  return {
    setProgress(value) { target = Math.max(target, Math.min(100, Number(value) || 0)); },
    clearError() {
      loader.dataset.phase = 'loading';
      loader.setAttribute('aria-busy', 'true');
      if (status) status.textContent = '';
      if (retry) { retry.hidden = true; retry.onclick = null; }
    },
    showError(onRetry) {
      loader.dataset.phase = 'error';
      loader.setAttribute('aria-busy', 'false');
      if (status) status.textContent = 'Some images could not load. Check your connection and try again.';
      if (retry) {
        retry.hidden = false;
        retry.onclick = () => { retry.hidden = true; onRetry(); };
      }
    },
    reveal() { ready = true; return completion; }
  };
}
