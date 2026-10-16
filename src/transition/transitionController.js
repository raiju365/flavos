import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TRANSITION_CONFIG as config } from './transition.config';
import { createOverlay } from './TransitionOverlay';
import { nextPaint } from '../page-readiness';
import { createCloudReturn } from './cloudReturn';
import { createFooterReturnSticker } from '../footer-return-sticker';

export function initPageTransition({ getLenis, reduceMotion, heroEntry }) {
  const root = document.documentElement;
  const header = document.querySelector('.studio-header');
  const links = [...header.querySelectorAll('a[href^="#"]')];
  const main = document.getElementById('main-content');
  const baseTitle = document.title;
  const { overlay, status, dust } = createOverlay();
  const clouds = createCloudReturn(overlay);
  const returnSticker = createFooterReturnSticker(overlay);
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
    const images = [...target.querySelectorAll('img')];
    images.forEach(img => { img.loading = 'eager'; });
    return Promise.all([document.fonts.ready, ...images.map(img => img.decode())]);
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

  async function navigate(target, { historyNavigation = false, effect } = {}) {
    if (busy || cancelled || !config.labels[target.id]) return;
    const cloudReturn = effect === 'cloud-return' && target.id === 'hero';
    const same = links.some(link => link.hash === `#${target.id}` && link.hasAttribute('aria-current'));
    if (same && !historyNavigation && !cloudReturn) {
      if (location.hash !== `#${target.id}`) history.pushState(null, '', `#${target.id}`);
      document.title = baseTitle;
      if (getLenis()) getLenis().scrollTo(position(target), { duration: reduceMotion.matches ? 0 : config.sameSection.duration });
      else window.scrollTo({ top: position(target), behavior: reduceMotion.matches ? 'instant' : 'smooth' });
      focus(target);
      return;
    }
    const returnPose = cloudReturn && !reduceMotion.matches ? returnSticker.capture() : null;
    busy = true;
    // Begin decoding during the cover, and retain a handled result for swap.
    const prepared = assets(target).then(() => null, error => error);
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
    const reduced = reduceMotion.matches || !(cloudReturn ? clouds.available : dust.available);
    overlay.classList.toggle('is-reduced', reduced);
    overlay.classList.toggle('is-cloud-return', cloudReturn);
    overlay.classList.add('is-active');
    overlay.dataset.phase = 'cover';
    if (cloudReturn) clouds.start();
    else if (!reduced) dust.start();
    const withPeel = cloudReturn && !reduced && returnSticker.start(returnPose);
    // Keep the living gradient edge-to-edge while the foreground drops away.
    const departureElements = cloudReturn ? [...document.querySelectorAll('.signature-footer > .footer-editorial, .signature-footer > .signature-bottom, .signature-footer > .footer-back-to-top')].filter(element => !withPeel || !element.classList.contains('footer-return-sticker')) : [];
    const departureProperties = ['translate', 'scale', 'filter', 'willChange', 'transformOrigin'];
    const oldDeparture = departureElements.map(element => Object.fromEntries(departureProperties.map(key => [key, element.style[key]])));
    const restoreDeparture = () => departureElements.forEach((element, index) => Object.assign(element.style, oldDeparture[index]));
    const preventScrollKeys = event => {
      if (cloudReturn && !event.ctrlKey && !event.metaKey && !event.altKey
        && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) event.preventDefault();
    };
    window.addEventListener('keydown', preventScrollKeys, true);
    const preventWheel = event => { if (cloudReturn) event.preventDefault(); };
    overlay.addEventListener('wheel', preventWheel, { passive: false });
    let finished = false, swapped = false, skipMotion = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(guard);
      dust.reset();
      clouds.reset(); returnSticker.reset(); restoreDeparture();
      if (cloudReturn) heroEntry?.finishReturn();
      reduceMotion.removeEventListener('change', settleReduced);
      window.removeEventListener('keydown', preventScrollKeys, true);
      overlay.removeEventListener('wheel', preventWheel);
      overlay.classList.remove('is-active', 'is-reduced', 'is-cloud-return');
      overlay.dataset.phase = 'idle';
      if (cloudReturn) overlay.dataset.cloudBeat = 'idle';
      gsap.set([overlay, label], { clearProps: 'transform,opacity,willChange' });
      root.style.overflow = oldOverflow;
      main.inert = oldInert;
      root.classList.remove('is-colonnade-transitioning', 'is-colonnade-ready');
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
      const coveredAt = performance.now();
      overlay.dataset.phase = 'covered';
      if (cloudReturn) overlay.dataset.cloudBeat = 'white';
      // The animation watchdog must not reveal an unprepared destination.
      clearTimeout(guard);
      try {
        const assetError = await prepared;
        if (assetError) throw assetError;
        if (finished || cancelled) return;
        // Restore the final gutter while still covered, then commit scroll-
        // driven scenes and one-time entrances before revealing any pixels.
        root.style.overflow = oldOverflow;
        restoreDeparture();
        settleScroll(target);
        if (cloudReturn && !reduced && !skipMotion) heroEntry?.prepareReturn();
        window.dispatchEvent(new Event('portfolio:restore'));
        window.dispatchEvent(new CustomEvent('portfolio:navigate', { detail: { target } }));
        window.dispatchEvent(new Event('scroll'));
        await nextPaint();
        // Destination preparation already counts toward the short white beat.
        // Only wait for the remainder, so a slow decode never adds a second hold.
        if (cloudReturn && !reduced && !skipMotion) {
          const remaining = config.cloudReturn.whiteBreath * 1000 - (performance.now() - coveredAt);
          if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
        }
        if (finished || cancelled) return;
        root.classList.add('is-colonnade-ready');
        swapped = true;
        if (!historyNavigation && !pendingHistory) history.pushState(null, '', `#${target.id}`);
        document.title = baseTitle;
      } catch (error) {
        console.error('Navigation transition failed:', error);
      } finally {
        if (!finished && !cancelled) {
          guard = setTimeout(() => timeline.kill(), config.completionGuardMs);
          if (skipMotion) timeline.progress(1);
          else timeline.play();
        }
      }
    };
    const settleReduced = () => {
      if (!cloudReturn || !reduceMotion.matches || finished) return;
      skipMotion = true;
      if (swapped) timeline.progress(1);
      else if (overlay.dataset.phase !== 'covered') { timeline.pause(); clouds.cover(1); swap(); }
    };
    reduceMotion.addEventListener('change', settleReduced);
    timeline = gsap.timeline({ paused: true, onComplete: finish, onInterrupt: finish });
    if (reduced) {
      gsap.set(overlay, { opacity: 0 });
      timeline.to(overlay, { opacity: 1, duration: config.reducedMotion.fadeDuration / 2 })
        .addPause('>', swap)
        .to(overlay, { opacity: 0, duration: config.reducedMotion.fadeDuration / 2,
          onStart: () => { overlay.dataset.phase = 'reveal'; } });
    } else if (cloudReturn) {
      const tempo = config.cloudReturn;
      const passage = { cover: 0, assembly: 0, anticipation: 0 };
      const launchStart = withPeel ? tempo.peel + tempo.launchLead : 0;
      const launchDuration = launchStart + tempo.anticipation + tempo.lift + tempo.flight + tempo.arrival;
      const beat = name => { overlay.dataset.cloudBeat = name; };
      if (withPeel) {
        const sheet = { peel: 0, flight: 0 };
        timeline.to(sheet, {
          peel: 1, duration: tempo.peel, ease: 'sine.inOut',
          onStart: () => beat('sticker-peel'), onUpdate: () => returnSticker.peel(sheet.peel),
        }, 0).to(sheet, {
          flight: 1, duration: tempo.stickerFlight, ease: 'power2.in',
          onStart: () => beat('sticker-flight'), onUpdate: () => returnSticker.fly(sheet.flight),
          onComplete: () => returnSticker.hide(),
        }, tempo.peel);
      }
      departureElements.forEach(element => {
        const bounds = element.getBoundingClientRect();
        element.style.transformOrigin = `${innerWidth / 2 - bounds.left}px ${innerHeight / 2 - bounds.top}px`;
        element.style.willChange = 'translate, scale, filter';
      });
      const paintDeparture = () => {
        const travel = passage.cover;
        clouds.cover(travel);
        clouds.grade((.2 + Math.sin(Math.PI * travel) * .8) * passage.anticipation);
        const thrust = Math.sin(Math.PI * travel) * 1.5;
        const tremor = Math.sin(travel * 94) * thrust;
        const tension = passage.anticipation * (1 - Math.min(1, travel / .16));
        departureElements.forEach(element => {
          element.style.translate = `${tremor}px ${innerHeight * (.86 * travel - .004 * tension)}px`;
          element.style.scale = String(1 + tension * .008 - travel * .1);
          element.style.filter = `blur(${travel * 4}px)`;
        });
      };
      const paintGrowth = () => {
        clouds.reveal(passage.assembly);
        clouds.grade(.2 * Math.sin(Math.PI * passage.assembly));
        heroEntry?.assembleReturn(passage.assembly);
      };
      // The end/start velocities of lift, flight and arrival match closely.
      // Their tempo changes without stopping the camera at each named beat.
      timeline.to(passage, {
        anticipation: 1, duration: tempo.anticipation, ease: 'sine.inOut',
        onStart: () => beat('anticipation'), onUpdate: paintDeparture,
      }, launchStart)
        .to(passage, {
          cover: .16, duration: tempo.lift, ease: 'power2.in',
          onStart: () => beat('lift'), onUpdate: paintDeparture,
        })
        .to(passage, {
          cover: .84, duration: tempo.flight, ease: 'none',
          onStart: () => beat('flight'), onUpdate: paintDeparture,
        })
        .to(passage, {
          cover: 1, duration: tempo.arrival, ease: 'power2.out',
          onStart: () => beat('arrival'), onUpdate: paintDeparture,
        })
        .addPause(launchDuration, swap)
        .to(passage, {
          assembly: .12, duration: tempo.growthIn, ease: 'power2.in',
          onStart: () => { overlay.dataset.phase = 'reveal'; beat('growth-in'); },
          onUpdate: paintGrowth,
        }, launchDuration)
        .to(passage, {
          assembly: .88, duration: tempo.growthTravel, ease: 'none',
          onStart: () => beat('growth'), onUpdate: paintGrowth,
        })
        .to(passage, {
          assembly: 1, duration: tempo.growthSettle, ease: 'power2.out',
          onStart: () => beat('growth-settle'), onUpdate: paintGrowth,
        })
        .to({}, { duration: tempo.settle, onStart: () => beat('settle') });
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
    const warm = () => { const target = document.getElementById(link.hash.slice(1)); if (target) assets(target).catch(() => {}); };
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
    returnSticker.destroy(); clouds.destroy(); dust.destroy(); overlay.remove(); status.remove();
    if (arrow) mask.replaceWith(arrow);
    history.scrollRestoration = oldRestoration;
  };
  window.addEventListener('pagehide', () => timeline?.kill(), options);
  return { navigate, destroy };
}
