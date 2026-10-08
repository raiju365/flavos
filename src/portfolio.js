import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initProjectGallery } from './project-gallery';
import { mountScrollTransitions, animateScrollTransitions } from './scroll-transitions';
import { animateAboutReading } from './about-reading';
import { animateFooterReveal } from './footer-reveal';
import { initBrandHover } from './brand-hover';
import { initLogoStyleCycle } from './logo-style-cycle';
import { initLogoNavJourney } from './logo-nav-journey';
import { initPageTransition } from './transition/transitionController';
import { createHeroScrollEntry } from './hero-scroll-entry';

export function initPortfolio({ getLenis }) {
  const main = document.getElementById('main-content');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const heroEntry = createHeroScrollEntry();
  if (import.meta.hot) import.meta.hot.dispose(heroEntry.destroy);
  const transitions = mountScrollTransitions(main);
  let animationsReady = reduceMotion.matches;
  let revealRequested = false;
  let heroPlayed = false;

  // Keep the link's hit area still while its seal tilts toward the pointer.
  const brand = document.querySelector('.folio-dock .folio-brand');
  if (brand) {
    const seal = brand.querySelector('.folio-brand-seal');
    const emblem = brand.querySelector('img');
    const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const resetSeal = () => {
      brand.classList.remove('is-tracking');
      gsap.to([seal, emblem], {
        x: 0, y: 0, rotationX: 0, rotationY: 0, rotation: 0, scale: 1,
        duration: reduceMotion.matches ? 0 : 0.85,
        ease: 'elastic.out(1, 0.45)', overwrite: true
      });
    };
    brand.addEventListener('pointermove', event => {
      if (reduceMotion.matches || !hoverPointer.matches || event.pointerType === 'touch') return;
      const rect = brand.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
      brand.classList.add('is-tracking');
      seal.style.setProperty('--seal-x', `${(x + 1) * 50}%`);
      seal.style.setProperty('--seal-y', `${(y + 1) * 50}%`);
      gsap.to(seal, {
        rotationX: -y * 16, rotationY: x * 20, rotation: x * 4,
        scale: 1.045, duration: 0.3, ease: 'power2.out', overwrite: true
      });
      gsap.to(emblem, {
        x: x * 5, y: y * 5, rotation: -x * 7,
        duration: 0.4, ease: 'power2.out', overwrite: true
      });
    });
    brand.addEventListener('pointerleave', resetSeal);
    brand.addEventListener('pointercancel', resetSeal);
    brand.addEventListener('blur', resetSeal);
    reduceMotion.addEventListener('change', resetSeal);
    hoverPointer.addEventListener('change', resetSeal);
  }

  const heroReveals = document.querySelectorAll('.imperial-hero [data-reveal]');
  // Prepare the first screen with initial values
  if (!reduceMotion.matches) {
    if (heroReveals.length) gsap.set(heroReveals, { y: 32, opacity: 0 });
  }

  const revealHero = () => {
    revealRequested = true;
    if (!animationsReady || heroPlayed) return;
    heroPlayed = true;
    heroEntry.enter();
    const landing = gsap.timeline({ defaults: { overwrite: 'auto' } });
    if (heroReveals.length) landing.to(heroReveals, { y: 0, opacity: 1, stagger: 0.1, duration: 1.0, ease: 'power3.out' }, 0.15);
  };
  window.addEventListener('portfolio:reveal', revealHero);
  window.addEventListener('portfolio:hero-enter', revealHero);
  initProjectGallery({ getLenis });
  const year = document.getElementById('copyright-year');
  if (year) year.textContent = new Date().getFullYear();

  // A visible, keyboard-operable alternative to the intro's hold gesture.
  const enter = document.getElementById('enter-portfolio');
  enter?.addEventListener('click', () => {
    if (enter.disabled) return;
    enter.disabled = true;
    Promise.resolve(window.finishIntroGlobal?.()).then(() => {
      const heading = document.getElementById('hero-heading');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
    });
  });

  // Initialize Designer-Grade Floating Island Navbar
  const designerNav = initDesignerNavbar({ getLenis, reduceMotion });
  const pageTransition = initPageTransition({ getLenis, reduceMotion });
  if (import.meta.hot) import.meta.hot.dispose(() => pageTransition.destroy());

  // Initialize Celestial Compass Brand Hover
  const cleanupBrandHover = initBrandHover();
  if (import.meta.hot) import.meta.hot.dispose(() => cleanupBrandHover?.());
  const cleanupLogoCycle = initLogoStyleCycle();
  const cleanupLogoJourney = initLogoNavJourney(cleanupLogoCycle);
  if (import.meta.hot) import.meta.hot.dispose(cleanupLogoJourney);
  if (import.meta.hot) import.meta.hot.dispose(cleanupLogoCycle);


  // In-page links and the footer return share the same quiet dust transition.
  document.querySelectorAll('#main-content a[href^="#"], .footer-back-to-top').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = document.getElementById(link.hash.slice(1));
      if (!target) return;
      event.preventDefault();
      if (document.documentElement.classList.contains('is-colonnade-transitioning')) return;

      if (designerNav?.closeMenu) {
        designerNav.closeMenu();
      }

      const runTransition = () => {
        pageTransition.navigate(target);
      };

      if (!window.isMainPageReady && typeof window.finishIntroGlobal === 'function') {
        window.finishIntroGlobal().then(() => {
          setTimeout(runTransition, 50);
        });
      } else {
        runTransition();
      }
    });
  });

  // Refresh section measurements after native, accessible disclosure interactions.
  main.querySelectorAll('details').forEach(detail => {
    detail.addEventListener('toggle', () => {
      getLenis()?.resize();
      ScrollTrigger.refresh();
    });
  });

  let started = false;
  const activate = () => {
    if (started || getComputedStyle(main).display === 'none') return;
    started = true;
    observer.disconnect();
    requestAnimationFrame(() => {
      heroEntry.mount();
      // About owns its reduced-motion mode and responsive copy; keep its
      // content controller mounted when decorative animations are disabled.
      const cleanupAbout = animateAboutReading({ getLenis });
      if (import.meta.hot) import.meta.hot.dispose(cleanupAbout);
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        animateScrollTransitions(transitions);
        const cleanupFooter = animateFooterReveal();
        main.querySelectorAll('[data-reveal]').forEach(element => {
          if (element.closest('#hero')) return;
          gsap.from(element, { y: 30, opacity: 0, duration: 0.85, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 92%', once: true } });
        });
        return () => { cleanupFooter(); };
      });


      getLenis()?.resize();
      ScrollTrigger.refresh();
      document.fonts.ready.then(() => {
        ScrollTrigger.refresh();
      });
      animationsReady = true;
      window.portfolioAnimationsReady = true;
      window.dispatchEvent(new Event('portfolio:ready'));
      if (revealRequested || (window.isMainPageReady && !document.documentElement.classList.contains('is-switching-scene'))) revealHero();
    });
  };
  const settleRestoredReveals = () => {
    // Already-visible content must not run another entrance after loading.
    ScrollTrigger.getAll().forEach(trigger => {
      if (trigger.trigger?.matches?.('[data-reveal]') && trigger.start <= window.scrollY) {
        trigger.animation?.progress(1);
      }
    });
  };
  window.addEventListener('portfolio:restore', settleRestoredReveals);
  if (import.meta.hot) import.meta.hot.dispose(() => window.removeEventListener('portfolio:restore', settleRestoredReveals));
  const observer = new MutationObserver(activate);
  observer.observe(main, { attributes: true, attributeFilter: ['style'] });
  activate();
}

/** Minimal portfolio navigation with restrained motion and accessible disclosure. */
function initDesignerNavbar({ getLenis, reduceMotion }) {
  const header = document.querySelector('.studio-header');
  if (!header) return null;
  const links = [...header.querySelectorAll('a[href^="#"]')];
  const sections = ['hero', 'about', 'projects', 'contact']
    .map(id => document.getElementById(id)).filter(Boolean);
  const bar = header.querySelector('.studio-bar');
  let previousActive;
  let queued = false;
  const update = () => {
    queued = false;
    // Read the scene once before changing classes. Rewriting every link on
    // every scroll invalidates navigation styles throughout the Work descent.
    const barHeight = bar?.offsetHeight || 72;
    const bounds = sections.map(section => ({ id: section.id, rect: section.getBoundingClientRect() }));
    const hero = bounds.find(section => section.id === 'hero')?.rect;
    const contact = bounds.find(section => section.id === 'contact')?.rect;
    const overHero = hero && hero.bottom > barHeight;
    const overFooter = contact && contact.top < barHeight;
    header.classList.toggle('is-scrolled', window.scrollY > 40);
    header.classList.toggle('is-in-footer', Boolean(contact && contact.top < barHeight + 24));
    const insideHero = overHero && Number(document.querySelector('#hero')?.dataset.entryProgress || 0) > .48;
    header.classList.toggle('is-light-section', !overFooter && !insideHero);
    header.classList.toggle('is-hero-surface', Boolean(overHero));
    const marker = Math.min(window.innerHeight * .3, 220);
    let active = 'hero';
    bounds.forEach(section => {
      if (section.rect.top <= marker) active = section.id;
    });
    if (header.dataset.transitionTarget) active = header.dataset.transitionTarget;
    header.classList.toggle('is-over-about', active === 'about');
    if (active !== 'about') {
      document.body.classList.remove('is-about-cinematic');
    }
    if (active !== previousActive) {
      links.forEach(link => {
        if (link.hash === '#' + active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      previousActive = active;
    }

  };
  window.addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('portfolio:ready', update);
  window.addEventListener('resize', update);
  update();
  header.classList.remove('is-hidden');
  return { closeMenu() { } };
}
