/** Masked type rolls for the navbar links. Logo pause lives with its cycle. */
export function initBrandHover() {
  const brand = document.querySelector('.studio-brand');
  if (!brand) return () => {};
  const originals = [];


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
  });

  return () => {
    originals.forEach(([word, html]) => { word.innerHTML = html; });
  };
}
