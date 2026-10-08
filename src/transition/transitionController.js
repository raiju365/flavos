import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TRANSITION_CONFIG as config } from './transition.config';
import { createOverlay } from './TransitionOverlay';

export function initPageTransition({ getLenis, reduceMotion }) {
  const root = document.documentElement;
  const header = document.querySelector('.studio-header');
  const links = [...header.querySelectorAll('a[href^="#"]')];
  const main = document.getElementById('main-content');
  const baseTitle = document.title;
  const { overlay, status, dust } = createOverlay();
  const label = overlay.querySelector('.colonnade-label');
  const abort = new AbortController();
  const options = { signal: abort.signal };
  let busy = false, timeline, guard, cancelled = false;
  let pendingHistory = false;
  root.style.setProperty('--nav-hover-duration', `${config.hover.duration}s`);
  root.style.setProperty('--nav-hover-ease', config.hover.cssEase);

  const position = target => {
    const rect = target.getBoundingClientRect();
    const offset = header.querySelector('.studio-bar').offsetHeight + 16;
    // Center the orbit's stage, including short screens where Work is taller.
    const workStage = target.id === 'projects' ? target.querySelector('.orbit-stage')?.getBoundingClientRect() : null;
    // During the About handoff the orbit plane is fixed to the viewport.
    // Its top is then zero even though the actual Work section is far below.
    // Anchor navigation to the section's document position in both states.
    const top = workStage ? scrollY + rect.top + workStage.height / 2 - innerHeight / 2
      : target.id === 'hero' ? 0 : target.id === 'contact' && target.classList.contains('is-animated')
      ? rect.bottom + scrollY - innerHeight
      : rect.top + scrollY - (target.id === 'about' || target.id === 'contact' ? 0 : offset);
    return Math.max(0, Math.min(top, document.documentElement.scrollHeight - innerHeight));
  };
  const focus = target => {
    const el = target.querySelector('h1, h2') || target;
    const previous = el.getAttribute('tabindex');
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    el.addEventListener('blur', () => previous === null ? el.removeAttribute('tabindex') : el.setAttribute('tabindex', previous), { once: true });
  };
  const assets = target => {
    const images = [...target.querySelectorAll('img')].slice(0, 2);
    images.forEach(img => { img.loading = 'eager'; });
    return Promise.allSettled([document.fonts.load('48px "Gaia Display"'), ...images.map(img => img.decode())]);
  };
  const settleScroll = target => {
    getLenis()?.resize();
    ScrollTrigger.refresh();
    const top = position(target);
    getLenis()?.scrollTo(top, { immediate: true, force: true });
    window.scrollTo({ top, behavior: 'instant' });
    ScrollTrigger.update();
    ScrollTrigger.getAll().forEach(trigger => {
      if (trigger.vars.scrub) trigger.getTween()?.progress?.(1);
      else if (trigger.animation && trigger.progress > 0) trigger.animation.progress(1);
    });
  };

  async function navigate(target, { historyNavigation = false } = {}) {
    if (busy || cancelled || !config.labels[target.id]) return;
    const same = links.some(link => link.hash === `#${target.id}` && link.hasAttribute('aria-current'));
    if (same && !historyNavigation) {
      if (location.hash !== `#${target.id}`) history.pushState(null, '', `#${target.id}`);
      document.title = baseTitle;
      if (getLenis()) getLenis().scrollTo(position(target), { duration: reduceMotion.matches ? 0 : config.sameSection.duration });
      else window.scrollTo({ top: position(target), behavior: reduceMotion.matches ? 'instant' : 'smooth' });
      focus(target);
      return;
    }
    busy = true;
    root.classList.add('is-colonnade-transitioning');
    header.dataset.transitionTarget = target.id;
    links.forEach(link => link.hash === `#${target.id}` ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current'));
    document.getElementById('project-gallery')?.close();
    getLenis()?.stop();
    const oldOverflow = root.style.overflow;
    const oldInert = main.inert;
    main.inert = true;
    root.style.overflow = 'hidden';
    const [name, , page] = config.labels[target.id];
    label.textContent = name;
    const reduced = reduceMotion.matches || !dust.available;
    overlay.classList.toggle('is-reduced', reduced);
    overlay.classList.add('is-active');
    overlay.dataset.phase = 'cover';
    if (!reduced) dust.start();
    let finished = false, swapped = false, assetTimer;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(guard);
      clearTimeout(assetTimer);
      dust.reset();
      overlay.classList.remove('is-active', 'is-reduced');
      overlay.dataset.phase = 'idle';
      gsap.set([overlay, label], { clearProps: 'transform,opacity,willChange' });
      root.style.overflow = oldOverflow;
      main.inert = oldInert;
      root.classList.remove('is-colonnade-transitioning');
      delete header.dataset.transitionTarget;
      getLenis()?.start();
      busy = false;
      if (swapped) { focus(target); status.textContent = `Sekarang di halaman: ${page}`; }
      window.dispatchEvent(new Event('scroll'));
      if (pendingHistory && !cancelled) {
        pendingHistory = false;
        const next = document.getElementById(location.hash.slice(1) || 'hero');
        if (next && config.labels[next.id]) navigate(next, { historyNavigation: true });
      }
    };
    const swap = async () => {
      overlay.dataset.phase = 'covered';
      try {
        await Promise.race([assets(target), new Promise(resolve => { assetTimer = setTimeout(resolve, config.swapTimeoutMs); })]);
        clearTimeout(assetTimer);
        if (finished || cancelled) return;
        settleScroll(target);
        swapped = true;
        if (!historyNavigation && !pendingHistory) history.pushState(null, '', `#${target.id}`);
        document.title = baseTitle;
      } catch (error) {
        console.error('Navigation transition failed:', error);
      } finally {
        if (!finished && !cancelled) timeline.play();
      }
    };
    timeline = gsap.timeline({ paused: true, onComplete: finish, onInterrupt: finish });
    if (reduced) {
      gsap.set(overlay, { opacity: 0 });
      timeline.to(overlay, { opacity: 1, duration: config.reducedMotion.fadeDuration / 2 })
        .addPause('>', swap)
        .to(overlay, { opacity: 0, duration: config.reducedMotion.fadeDuration / 2 });
    } else {
      const grains = { cover: 0, reveal: 0 };
      gsap.set(label, { opacity: 0 });
      timeline.to(grains, {
        cover: 1, duration: config.cover.duration, ease: 'none',
        onUpdate: () => dust.render(grains.cover, 'cover'),
      }, 0)
        .addPause(config.cover.duration, swap)
        .to(label, { opacity: 1, duration: config.label.duration, ease: 'sine.out' }, config.label.start)
        .to(label, { opacity: 0, duration: config.label.outDuration, ease: 'sine.in' }, config.label.outAt)
        .to(grains, {
          reveal: 1, duration: config.reveal.duration, ease: 'none',
          onStart: () => { overlay.dataset.phase = 'reveal'; },
          onUpdate: () => dust.render(grains.reveal, 'reveal'),
        }, config.reveal.start);
    }
    guard = setTimeout(() => timeline.kill(), config.completionGuardMs);
    timeline.play();
  }

  header.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download')) return;
    if (link.origin !== location.origin || link.pathname !== location.pathname || !link.hash) return;
    const target = document.getElementById(link.hash.slice(1));
    if (!target || !config.labels[target.id]) return;
    event.preventDefault();
    if (!busy && window.isMainPageReady && !root.classList.contains('is-switching-scene')) navigate(target);
  }, options);
  links.forEach(link => {
    const warm = () => { const target = document.getElementById(link.hash.slice(1)); if (target) assets(target); };
    link.addEventListener('pointerenter', warm, options);
    link.addEventListener('focus', warm, options);
  });
  const arrow = header.querySelector('.studio-arrow');
  const mask = document.createElement('span');
  mask.className = 'studio-arrow-mask'; mask.setAttribute('aria-hidden', 'true');
  if (arrow) { arrow.replaceWith(mask); mask.append(arrow, arrow.cloneNode(true)); }

  const onHistory = () => {
    if (!window.isMainPageReady) return;
    if (busy) { pendingHistory = true; return; }
    const target = document.getElementById(location.hash.slice(1) || 'hero');
    if (target && config.labels[target.id]) navigate(target, { historyNavigation: true });
  };
  window.addEventListener('popstate', onHistory, options);
  const oldRestoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  const destroy = () => {
    cancelled = true; timeline?.kill(); abort.abort();
    dust.destroy(); overlay.remove(); status.remove();
    if (arrow) mask.replaceWith(arrow);
    history.scrollRestoration = oldRestoration;
  };
  window.addEventListener('pagehide', () => timeline?.kill(), options);
  return { navigate, destroy };
}
