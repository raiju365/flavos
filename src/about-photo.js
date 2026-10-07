import { createPortraitShader } from './portrait-shader';

export function initAboutPhoto() {
  const showcase = document.getElementById('about-art-showcase');
  const card = document.getElementById('art-photo-card');
  if (!showcase || !card) return () => {};
  const object = card.querySelector('.portrait-object');
  const source = card.querySelector('.portrait-core');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const filters = [
    { id: 'archive', name: 'Archive Grain' },
    { id: 'ink', name: 'Ink Tide' },
    { id: 'prism', name: 'Prismatic Lens' },
    { id: 'relief', name: 'Kinetic Relief' },
    { id: 'raster', name: 'Raster Bloom' },
    { id: 'dust', name: 'Chromatic Dust' }
  ];

  let activeFilter = 0;
  const shader = createPortraitShader(card, source, reduceMotion);
  let isDragging = false;
  let didHold = false;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let distance = 0;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let rafId = 0;
  let holdTimer = 0;
  let holdInterval = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function setFilter(nextIndex, { direction = 1, immediate = false } = {}) {
    const normalized = (nextIndex + filters.length) % filters.length;
    const previous = filters[activeFilter];
    const next = filters[normalized];
    activeFilter = normalized;
    shader?.select(normalized);

    card.classList.remove(...filters.map(filter => `filter-${filter.id}`));
    card.classList.add(`filter-${next.id}`);
    card.classList.remove('is-expanded');
    card.dataset.filter = next.id;
    card.style.setProperty('--filter-direction', direction < 0 ? '-1' : '1');
    card.setAttribute('aria-label', `Portrait of Fahmi Aufa. Current treatment: ${next.name}. Tap for the next treatment or hold to scan the collection.`);

    if (!immediate && previous.id !== next.id && !reduceMotion.matches) {
      card.classList.remove('is-filter-transitioning');
      void card.offsetWidth;
      card.classList.add('is-filter-transitioning');
    }
  }

  function clearHold() {
    window.clearTimeout(holdTimer);
    window.clearInterval(holdInterval);
    holdTimer = 0;
    holdInterval = 0;
    card.classList.remove('is-holding');
  }

  function aimFromPointer(event) {
    if (reduceMotion.matches) return;
    const rect = card.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    targetX = clamp(-y * 9, -10, 10);
    targetY = clamp(x * 13, -14, 14);
    card.style.setProperty('--light-x', `${clamp((x + 1) * 50, 0, 100)}%`);
    card.style.setProperty('--light-y', `${clamp((y + 1) * 50, 0, 100)}%`);
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    isDragging = true;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    distance = 0;
    didHold = false;
    card.classList.add('is-dragging');
    card.setPointerCapture?.(event.pointerId);
    aimFromPointer(event);
    holdTimer = window.setTimeout(() => {
      if (!isDragging || distance >= 7) return;
      didHold = true;
      card.classList.add('is-holding');
      setFilter(activeFilter + 1);
      holdInterval = window.setInterval(() => setFilter(activeFilter + 1), 1500);
    }, 440);
  }

  function onPointerMove(event) {
    if (reduceMotion.matches) return;
    if (isDragging) {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      distance = Math.max(distance, Math.hypot(dx, dy));
      if (distance >= 7 && !didHold) window.clearTimeout(holdTimer);
      targetY = clamp(dx * 0.12, -28, 28);
      targetX = clamp(-dy * 0.1, -18, 18);
      card.style.setProperty('--light-x', `${clamp(50 + dx * 0.35, 0, 100)}%`);
      card.style.setProperty('--light-y', `${clamp(50 + dy * 0.35, 0, 100)}%`);
      return;
    }
    if (finePointer.matches) aimFromPointer(event);
  }

  function onPointerUp(event) {
    if (!isDragging || (pointerId !== null && event.pointerId !== pointerId)) return;
    isDragging = false;
    pointerId = null;
    card.classList.remove('is-dragging');
    card.releasePointerCapture?.(event.pointerId);
    clearHold();
    if (distance < 7 && !didHold) setFilter(activeFilter + 1);
    targetX = 0;
    targetY = 0;
  }

  function onPointerCancel(event) {
    if (!isDragging || (pointerId !== null && event.pointerId !== pointerId)) return;
    isDragging = false;
    pointerId = null;
    card.classList.remove('is-dragging');
    clearHold();
    targetX = 0;
    targetY = 0;
  }

  function resetAim() {
    if (isDragging) return;
    targetX = 0;
    targetY = 0;
    card.style.setProperty('--light-x', '50%');
    card.style.setProperty('--light-y', '18%');
  }

  function render() {
    const rotationEase = isDragging ? 0.24 : 0.11;
    currentX += (targetX - currentX) * rotationEase;
    currentY += (targetY - currentY) * rotationEase;
    card.style.setProperty('--rotate-x', `${currentX.toFixed(3)}deg`);
    card.style.setProperty('--rotate-y', `${currentY.toFixed(3)}deg`);
    rafId = requestAnimationFrame(render);
  }

  function onKeyDown(event) {
    if (!['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    setFilter(activeFilter + (event.key === 'ArrowLeft' ? -1 : 1), { direction: event.key === 'ArrowLeft' ? -1 : 1 });
  }

  function onMotionChange() {
    targetX = 0;
    targetY = 0;
    clearHold();
  }


  card.addEventListener('pointermove', onPointerMove);
  card.addEventListener('pointerleave', resetAim);
  card.addEventListener('pointerdown', onPointerDown);
  card.addEventListener('pointerup', onPointerUp);
  card.addEventListener('pointercancel', onPointerCancel);
  card.addEventListener('keydown', onKeyDown);
  reduceMotion.addEventListener('change', onMotionChange);
  setFilter(0, { immediate: true });
  rafId = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(rafId);
    shader?.destroy();
    clearHold();
    card.classList.remove('is-sliced', 'is-expanded', 'is-dragging', 'is-holding', 'is-filter-transitioning', ...filters.map(filter => `filter-${filter.id}`));
    delete card.dataset.filter;
    card.style.removeProperty('--rotate-x');
    card.style.removeProperty('--rotate-y');
    card.removeEventListener('pointermove', onPointerMove);
    card.removeEventListener('pointerleave', resetAim);
    card.removeEventListener('pointerdown', onPointerDown);
    card.removeEventListener('pointerup', onPointerUp);
    card.removeEventListener('pointercancel', onPointerCancel);
    card.removeEventListener('keydown', onKeyDown);
    reduceMotion.removeEventListener('change', onMotionChange);
  };
}
