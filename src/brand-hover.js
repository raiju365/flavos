/** Brief, irregular pixel reveals; accessible labels and glyph widths stay fixed. */
export function initBrandHover() {
  const brand = document.querySelector('.studio-brand');
  if (!brand) return () => {};
  const originals = [];
  const header = brand.closest('.studio-header');
  const abort = new AbortController();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const timers = new Set();
  const clear = () => {
    timers.forEach(clearTimeout); timers.clear();
    header.querySelectorAll('.is-pixel').forEach(cell => cell.classList.remove('is-pixel'));
  };
  header.classList.add('has-pixel-type');


  document.querySelectorAll('.studio-link .nav-word').forEach(word => {
    const label = word.querySelector('span:not([aria-hidden])')?.textContent;
    if (!label) return;
    originals.push([word, word.innerHTML]);
    word.replaceChildren();
    const accessible = document.createElement('span');
    accessible.className = 'nav-accessible';
    accessible.textContent = label;
    const visual = document.createElement('span');
    visual.className = 'nav-letters';
    visual.style.setProperty('--letter-count', Array.from(label).length);
    visual.setAttribute('aria-hidden', 'true');
    Array.from(label).forEach((letter, index) => {
      const cell = document.createElement('span');
      cell.className = 'nav-letter';
      cell.style.setProperty('--letter-index', index);
      for (let copy = 0; copy < 2; copy++) {
        const face = document.createElement('span');
        face.textContent = letter === ' ' ? '\u00a0' : letter;
        cell.append(face);
      }
      visual.append(cell);
    });
    word.append(accessible, visual);
    const link = word.closest('a');
    const play = () => {
      clear();
      if (motion.matches || document.documentElement.classList.contains('is-colonnade-transitioning')) return;
      const cells = [...visual.children].sort(() => Math.random() - .5);
      const later = (fn, ms) => { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); };
      cells.forEach((cell, index) => {
        later(() => cell.classList.add('is-pixel'), index * 22);
        later(() => cell.classList.remove('is-pixel'), 70 + index * 22);
      });
    };
    link.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') play(); }, { signal: abort.signal });
    link.addEventListener('focus', () => { if (link.matches(':focus-visible')) play(); }, { signal: abort.signal });
    link.addEventListener('pointerleave', clear, { signal: abort.signal });
    link.addEventListener('blur', clear, { signal: abort.signal });
  });
  motion.addEventListener('change', clear, { signal: abort.signal });
  window.addEventListener('portfolio:navigate', clear, { signal: abort.signal });
  document.addEventListener('visibilitychange', clear, { signal: abort.signal });

  return () => {
    clear(); abort.abort(); header.classList.remove('has-pixel-type');
    originals.forEach(([word, html]) => { word.innerHTML = html; });
  };
}
