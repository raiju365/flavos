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
    const wipe = dialog.querySelector('.flavos-preview-wipe');
    const strips = dialog.querySelectorAll('.flavos-preview-image span');
    const words = dialog.querySelectorAll('.flavos-preview-title > span > span');
    const link = dialog.querySelector('.flavos-preview-link');
    const covered = 'polygon(100% 0%, 160% 0%, 160% 100%, 150% 100%)';
    const full = 'polygon(-35% 0%, 100% 0%, 100% 100%, 0% 100%)';

    motion = gsap.timeline({ onReverseComplete: finishClose });
    motion
      .fromTo(stage, { clipPath: covered }, { clipPath: full, duration: .68, ease: 'power3.inOut' }, 0)
      .fromTo(wipe, { xPercent: 0 }, { xPercent: -125, duration: .67, ease: 'power3.inOut' }, .13)
      .fromTo(strips, { xPercent: 16, yPercent: -22, scale: 1.12, opacity: 0 }, {
        xPercent: 0, yPercent: 0, scale: 1, opacity: 1,
        stagger: { each: .065, from: 'end' }, duration: .59, ease: 'power3.out'
      }, .28)
      .fromTo(words, { yPercent: 110, rotate: 5 }, {
        yPercent: 0, rotate: 0, stagger: .085, duration: .55, ease: 'power4.out'
      }, .42)
      .fromTo(link, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .34, ease: 'power2.out' }, .64);
  }

  function hide() {
    if (!dialog.open) return;
    if (!motion || reducedMotion.matches || motion.time() === 0) {
      finishClose();
      return;
    }
    motion.timeScale(1.65).reverse();
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
