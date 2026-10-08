/** Opaque material swaps concealed by a short, centered motion-blur impulse. */
export function initLogoStyleCycle() {
  const section = document.querySelector('.folio-logo-pause');
  const stage = section?.querySelector('.logo-style-cycle');
  if (!stage) return () => { };
  const layers = [...stage.querySelectorAll('img')];
  const brand = document.querySelector('.studio-brand');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const styleIds = [1, 4, 5, 6, 8, 9, 10, 11, 12, 13];
  const holds = [1200, 1500, 1200, 1800, 1200, 1500, 1800, 1500, 1800, 1500, 1500, 1800, 1800];
  const holdFor = id => holds[id - 1] ?? 2000;
  let assets = [], loading = false, docked = false, disposed = false;
  let timer, index = 0, front = 0;
  let frame = 0;
  let paused = false, pointerInside = false, keyboardFocus = false;
  let resumeFrame = null, lastFrameTime = 0, holdUntil = 0, remainingHold = 0;
  const active = () => docked && !document.hidden && !motion.matches && !disposed && !paused;
  const stop = () => {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    frame = 0;
    resumeFrame = null;
    lastFrameTime = 0;
    holdUntil = 0;
    stage.style.removeProperty('filter');
    stage.style.removeProperty('will-change');
    delete stage.dataset.swapping;
  };

  function swap() {
    if (!active()) return;
    holdUntil = 0;
    const nextIndex = (index + 1) % assets.length;
    const next = 1 - front;
    layers[next].src = assets[nextIndex].src;
    let elapsed = 0;
    lastFrameTime = performance.now();
    // Scale blur with the rendered mark, including its small navbar state.
    const blur = Math.min(10, stage.getBoundingClientRect().width * 0.025);
    let exchanged = false;
    stage.dataset.swapping = 'true';
    stage.style.willChange = 'filter';
    const render = now => {
      if (!active()) { stop(); return; }
      elapsed += lastFrameTime ? now - lastFrameTime : 0;
      lastFrameTime = now;
      const progress = Math.min(1, elapsed / 650);
      // Zero velocity at either end and at the opaque material exchange.
      const pulse = Math.sin(Math.PI * progress) ** 3;
      stage.style.filter = `blur(${(blur * pulse).toFixed(3)}px)`;
      if (!exchanged && progress >= 0.5) {
        layers[next].classList.add('is-visible');
        layers[front].classList.remove('is-visible');
        front = next;
        index = nextIndex;
        stage.dataset.style = String(assets[index].id);
        exchanged = true;
      }
      if (progress < 1) frame = requestAnimationFrame(render);
      else schedule();
    };
    resumeFrame = render;
    frame = requestAnimationFrame(render);
  }

  function schedule(delay = holdFor(assets[index]?.id ?? 1)) {
    stop();
    remainingHold = delay;
    if (!active() || assets.length < 2) return;
    holdUntil = performance.now() + delay;
    timer = setTimeout(swap, delay);
  }

  // Freeze the exact hold or blur frame; leaving continues its remaining time.
  const syncPause = () => {
    const next = pointerInside || keyboardFocus;
    if (paused === next) return;
    paused = next;
    stage.dataset.paused = String(paused);
    if (paused) {
      if (holdUntil) remainingHold = Math.max(0, holdUntil - performance.now());
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      frame = 0;
      lastFrameTime = 0;
    } else if (active()) {
      if (resumeFrame) frame = requestAnimationFrame(resumeFrame);
      else schedule(remainingHold);
    }
  };
  brand?.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    pointerInside = true; syncPause();
  }, options);
  const leave = () => { pointerInside = false; syncPause(); };
  brand?.addEventListener('pointerleave', leave, options);
  brand?.addEventListener('pointercancel', leave, options);
  brand?.addEventListener('focus', () => {
    keyboardFocus = brand.matches(':focus-visible'); syncPause();
  }, options);
  brand?.addEventListener('blur', () => { keyboardFocus = false; syncPause(); }, options);

  async function load() {
    if (loading || motion.matches) return;
    loading = true;
    const results = await Promise.allSettled(styleIds.map(async id => {
      const image = new Image();
      image.src = `/logoanimasi/web/logo${id}.webp`;
      await image.decode();
      return { id, src: image.src, image };
    }));
    if (disposed) return;
    assets = results.filter(result => result.status === 'fulfilled').map(result => result.value);
    schedule();
  }

  const observer = new IntersectionObserver(entries => {
    // Intersection only preloads. The logo remains onscreen in the navbar
    // after this section leaves, so section visibility cannot pause the cycle.
    if (entries[0].isIntersecting) load();
  }, { threshold: 0 });
  observer.observe(section);
  const update = () => {
    stop();
    if (motion.matches) {
      front = 0; index = 0;
      layers[0].src = '/logoanimasi/web/logo1.webp';
      layers[0].classList.add('is-visible');
      layers[1].classList.remove('is-visible');
      stage.dataset.style = '1';
    } else if (active()) { load(); schedule(); }
  };
  document.addEventListener('visibilitychange', update);
  motion.addEventListener('change', update);
  const cleanup = () => {
    disposed = true;
    controller.abort();
    delete stage.dataset.paused;
    stop(); observer.disconnect();
    document.removeEventListener('visibilitychange', update);
    motion.removeEventListener('change', update);
  };
  // Scroll choreography owns arrival; mere intersection must not start a style.
  cleanup.setDocked = value => {
    if (docked === value) return;
    docked = value;
    stage.dataset.docked = String(value);
    if (value) { load(); schedule(holds[0]); }
    else stop();
  };
  cleanup.reset = () => {
    stop();
    if (index === 0 && front === 0 && stage.dataset.style === '1') return;
    front = 0; index = 0;
    layers[0].src = '/logoanimasi/web/logo1.webp';
    layers[0].classList.add('is-visible');
    layers[1].classList.remove('is-visible');
    stage.dataset.style = '1';
  };
  return cleanup;
}
