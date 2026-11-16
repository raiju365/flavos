import gsap from 'gsap';
import './flavos-dock.css';

export function initFlavosPreview({ getLenis, reducedMotion }) {
  const trigger = document.querySelector('.flavos-dock-toggle');
  const dialog = document.getElementById('flavos-preview');
  const close = dialog.querySelector('.flavos-preview-close');
  const events = new AbortController();
  const options = { signal: events.signal };
  let motion;
  let previousOverflow;
  let resumeScroll = false;

  const clearMotion = () => {
    motion?.revert();
    motion = null;
  };

  function restorePage() {
    if (previousOverflow === undefined) return;
    document.body.style.overflow = previousOverflow;
    previousOverflow = undefined;
    if (resumeScroll) getLenis()?.start();
    trigger.setAttribute('aria-expanded', 'false');
  }

  function finishClose() {
    const cursor = dialog.querySelector('#custom-cursor');
    if (cursor) document.body.append(cursor);
    dialog.close();
    restorePage();
    clearMotion();
    trigger.focus({ preventScroll: true });
  }

  function show() {
    if (dialog.open) return;
    const lenis = getLenis();
    dialog.showModal();
    // The modal's top layer paints above the cursor in the document body.
    const cursor = document.getElementById('custom-cursor');
    if (cursor) dialog.append(cursor);
    trigger.setAttribute('aria-expanded', 'true');
    previousOverflow = document.body.style.overflow;
    resumeScroll = Boolean(lenis && !lenis.isStopped);
    lenis?.stop();
    document.body.style.overflow = 'hidden';

    if (reducedMotion.matches) return;
    const stage = dialog.querySelector('.flavos-preview-stage');
    motion = gsap.fromTo(stage, { y: -8, opacity: 0 }, {
      y: 0,
      opacity: 1,
      duration: .22,
      ease: 'power2.out',
      onReverseComplete: finishClose
    });
  }

  function hide() {
    if (!dialog.open) return;
    if (!motion || reducedMotion.matches || motion.time() === 0) {
      finishClose();
      return;
    }
    motion.timeScale(1.25).reverse();
  }

  trigger.addEventListener('click', show, options);
  close.addEventListener('click', hide, options);
  dialog.addEventListener('click', event => {
    if (event.target === dialog) hide();
  }, options);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    hide();
  }, options);
  reducedMotion.addEventListener('change', () => {
    if (motion?.reversed()) finishClose();
    else clearMotion();
  }, options);

  return () => {
    events.abort();
    if (dialog.open) finishClose();
  };
}
