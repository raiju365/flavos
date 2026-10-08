import { initPortfolio } from './portfolio'
import { initScrollRestoration } from './scroll-restoration'
import { createKineticLoader } from './loader-transition'
import { preparePageAssets, nextPaint } from './page-readiness'
import { initTvNoise } from './tv-noise'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { tsParticles } from "@tsparticles/engine"
import { loadSlim } from "@tsparticles/slim"

gsap.registerPlugin(ScrollTrigger)

// Trackpad pinch can emit Ctrl+wheel without a preceding keydown.
const preventZoom = (event) => {
  if (event.cancelable) event.preventDefault();
};
const zoomListenerOptions = { passive: false, capture: true };
window.addEventListener('wheel', (event) => {
  if (event.ctrlKey || event.metaKey) preventZoom(event);
}, zoomListenerOptions);
window.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && (
    ['+', '-', '=', '0'].includes(event.key) ||
    ['NumpadAdd', 'NumpadSubtract', 'Numpad0'].includes(event.code)
  )) preventZoom(event);
}, zoomListenerOptions);
// Safari gestures and multi-touch fallback preserve one-finger scrolling.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  window.addEventListener(type, preventZoom, zoomListenerOptions);
}
for (const type of ['touchstart', 'touchmove']) {
  window.addEventListener(type, (event) => {
    if (event.touches.length > 1) preventZoom(event);
  }, zoomListenerOptions);
}
const scrollRestoration = initScrollRestoration();
window.scrollTo(0, 0);

// Global reference for Lenis smooth scroll
let lenis = null;

// Universal reliable scroll reset helper
function forceResetScrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  if (lenis) {
    try {
      lenis.scrollTo(0, { immediate: true, force: true });
      lenis.velocity = 0;
      lenis.resize();
    } catch (e) { }
  }

  if (typeof ScrollTrigger !== 'undefined') {
    try {
      ScrollTrigger.clearScrollMemory();
      ScrollTrigger.refresh();
    } catch (e) { }
  }
}

// Handle prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
initTvNoise();

// Global flag to track loading state
window.isMainPageReady = false;
window.finishIntroGlobal = () => Promise.resolve();

// --- Custom Cursor Logic ---
{
  const cursor = document.createElement('div');
  cursor.id = 'custom-cursor';
  document.body.appendChild(cursor);

  let hasMoved = false;
  let isHovered = false;

  let mouseX = -100;
  let mouseY = -100;
  let cursorX = -100;
  let cursorY = -100;
  let cursorScale = 1;
  let targetScale = 1;

  function updateCursorPos(e) {
    if (e.clientX === undefined || e.clientX === null) return;
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!hasMoved) {
      cursorX = mouseX;
      cursorY = mouseY;
      hasMoved = true;
    }

    // Reveal custom cursor immediately on mouse move
    cursor.style.opacity = '1';
  }

  // Framerate-independent ultra-responsive physics loop
  let lastCursorTime = performance.now();
  function renderCursor(time) {
    if (!time) time = performance.now();
    const dt = Math.min(time - lastCursorTime, 50);
    lastCursorTime = time;

    if (hasMoved) {
      const lerp = 1 - Math.exp(-dt * 0.09);
      cursorX += (mouseX - cursorX) * lerp;
      cursorY += (mouseY - cursorY) * lerp;

      if (Math.abs(mouseX - cursorX) < 0.1 && Math.abs(mouseY - cursorY) < 0.1) {
        cursorX = mouseX;
        cursorY = mouseY;
      }

      const scaleLerp = 1 - Math.exp(-dt * 0.025);
      cursorScale += (targetScale - cursorScale) * scaleLerp;

      cursor.style.transform = `translate3d(${cursorX.toFixed(2)}px, ${cursorY.toFixed(2)}px, 0) rotate(-45deg) scale(${cursorScale.toFixed(3)})`;
    }
    requestAnimationFrame(renderCursor);
  }
  renderCursor();

  // Only track pointer moves on non-touch pointer devices
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', updateCursorPos, { passive: true });
    window.addEventListener('mousemove', updateCursorPos, { passive: true });
    window.addEventListener('mouseenter', updateCursorPos, { passive: true });

    // Hover feedback on clickable elements
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest('a, button, .project-card, .btn, input, textarea, .tool-item, .modal-close, .nav-btn, [role="button"], .dock-link, .dock-brand, .dock-mobile-toggle, .work-item');
      if (el) {
        isHovered = true;
        targetScale = 1.18;
      }
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
      const el = e.target.closest('a, button, .project-card, .btn, input, textarea, .tool-item, .modal-close, .nav-btn, [role="button"], .dock-link, .dock-brand, .dock-mobile-toggle, .work-item');
      if (el) {
        isHovered = false;
        targetScale = 1;
      }
    }, { passive: true });

    // Tactile click press feedback
    window.addEventListener('mousedown', () => {
      targetScale = 0.88;
    }, { passive: true });

    window.addEventListener('mouseup', () => {
      targetScale = isHovered ? 1.18 : 1;
    }, { passive: true });

    // Exit animation when leaving window
    document.addEventListener('mouseleave', () => {
      targetScale = 0;
      gsap.to(cursor, { opacity: 0, duration: 0.3, ease: 'power2.in' });
    });

    document.addEventListener('mouseenter', () => {
      if (hasMoved) {
        targetScale = 1;
        gsap.to(cursor, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      }
    });
  }
}

// --- Loading Screen Logic ---
const loadingScreen = document.getElementById('loading-screen');
document.body.style.overflow = 'hidden'; // Lock scrolling during loading

const kineticLoader = createKineticLoader({ loader: loadingScreen, reducedMotion: prefersReducedMotion.matches });

let pageProgress = 0;
const updateLoadingProgress = () => kineticLoader.setProgress(pageProgress * 100);

// Lock native keyboard/touch scroll as well as Lenis until the page paints.
const preventLoadingScroll = event => {
  if (event.type === 'keydown' && event.target.closest?.('button, input, textarea, select, a')) return;
  if (event.type === 'keydown' && !['Space', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.code)) return;
  if (event.cancelable) event.preventDefault();
};
window.addEventListener('wheel', preventLoadingScroll, { passive: false, capture: true });
window.addEventListener('touchmove', preventLoadingScroll, { passive: false, capture: true });
window.addEventListener('keydown', preventLoadingScroll, { capture: true });

function waitForPortfolio() {
  if (window.portfolioAnimationsReady) return Promise.resolve();
  return new Promise(resolve => window.addEventListener('portfolio:ready', resolve, { once: true }));
}

async function prepareAndReveal() {
  kineticLoader.clearError();
  try {
    await preparePageAssets(progress => {
      pageProgress = progress;
      updateLoadingProgress();
    });

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.style.visibility = 'hidden';
      mainContent.style.display = 'block';
      mainContent.style.opacity = '1';
    }
    const folioNav = document.querySelector('.folio-nav');
    if (folioNav) {
      folioNav.style.display = '';
      folioNav.style.opacity = '1';
      gsap.to(folioNav, { opacity: 1, duration: 0.5 });
    }

    forceResetScrollToTop();
    gsap.set('#tsparticles', { opacity: 1, pointerEvents: 'none' });

    window.dispatchEvent(new Event('resize'));
    await waitForPortfolio();
    // Settle the final scrollbar/sticky layout while the loader still covers it.
    // Input remains blocked by preventLoadingScroll until the reveal finishes.
    document.body.style.overflow = '';
    lenis?.start();
    await nextPaint();
    ScrollTrigger.refresh();
    await nextPaint();

    // Restore behind the loader, after pinned sections and fonts have settled.
    lenis?.resize();
    lenis?.scrollTo(scrollRestoration.top, { immediate: true, force: true });
    window.scrollTo({ top: scrollRestoration.top, behavior: 'instant' });
    ScrollTrigger.update();
    window.dispatchEvent(new Event('scroll'));
    await nextPaint();
    window.dispatchEvent(new Event('portfolio:restore'));
    await nextPaint();

    window.isMainPageReady = true;
    sessionStorage.setItem('introFinished', 'true');
    if (mainContent) mainContent.style.visibility = '';

    loadingScreen.dataset.assetsReady = 'true';
    await kineticLoader.reveal();

    window.removeEventListener('wheel', preventLoadingScroll, { capture: true });
    window.removeEventListener('touchmove', preventLoadingScroll, { capture: true });
    window.removeEventListener('keydown', preventLoadingScroll, { capture: true });

    window.dispatchEvent(new Event('portfolio:reveal'));
    scrollRestoration.activate();
  } catch (error) {
    console.error('Portfolio preparation failed:', error);
    kineticLoader.showError(prepareAndReveal);
  }
}

// Run after portfolio setup below
queueMicrotask(prepareAndReveal);

// Initialize Lenis smooth scroll
if (!prefersReducedMotion.matches) {
  lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.0,
    infinite: false,
  });

  lenis.stop(); // Lock input until loader reveals
  lenis.on('scroll', ScrollTrigger.update);

  const tsparticlesEl = document.getElementById('tsparticles');
  let particleCurrentY = 0;

  gsap.ticker.add((time) => {
    if (lenis) {
      lenis.raf(time * 1000);

      // Parallax on background particles
      if (tsparticlesEl && Math.abs(lenis.velocity) > 0.01) {
        const targetParticleY = -lenis.velocity * 0.35;
        particleCurrentY += (targetParticleY - particleCurrentY) * 0.1;
        tsparticlesEl.style.transform = `translate3d(0, ${particleCurrentY.toFixed(2)}px, 0)`;
      } else if (tsparticlesEl && particleCurrentY !== 0) {
        particleCurrentY += (0 - particleCurrentY) * 0.1;
        if (Math.abs(particleCurrentY) < 0.05) particleCurrentY = 0;
        tsparticlesEl.style.transform = `translate3d(0, ${particleCurrentY.toFixed(2)}px, 0)`;
      }
    }
  });
  gsap.ticker.lagSmoothing(0);
}

// Initialize tsParticles (Dust / Marble flakes)
(async () => {
  try {
    await loadSlim(tsParticles);
    await tsParticles.load({
      id: "tsparticles",
      options: {
        background: { color: { value: "transparent" } },
        particles: {
          color: { value: "#1a1f5c" },
          links: { enable: false },
          move: { enable: true, speed: 0.5, direction: "bottom" },
          number: { value: 30, density: { enable: true, area: 800 } },
          opacity: { value: 0.15 },
          size: { value: { min: 1, max: 3 } }
        }
      }
    });
  } catch (_) {
    // Ignored if already loaded during HMR reload
  }
})();

// Global Meander border animation (drawn over scroll progress)
const meanderPaths = document.querySelectorAll('.meander-path');
if (meanderPaths.length) gsap.to(meanderPaths, {
  scrollTrigger: {
    trigger: 'body',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
  },
  strokeDashoffset: 0,
  ease: 'none'
});

initPortfolio({ getLenis: () => lenis });
