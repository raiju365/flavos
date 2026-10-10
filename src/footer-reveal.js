import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// The closing page rises over Work; the signature settles with the same scroll.
// Reversing scroll reverses the composition rather than replaying an entrance.
export function animateFooterReveal() {
  const footer = document.querySelector('#contact');
  if (!footer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  let arrival;
  const context = gsap.context(() => {
    arrival = gsap.timeline({
      scrollTrigger: { trigger: footer, start: 'top bottom', end: 'top top', scrub: .4 },
      defaults: { ease: 'none' }
    })
      .fromTo('.footer-signature', { y: 36 }, { y: 0, duration: 1 }, 0)
      .fromTo('.signature-bottom', { y: 16 }, { y: 0, duration: .4 }, .6);
  }, footer);
  const settleArrival = event => {
    if (event.detail?.target?.id !== 'contact') return;
    // Navigation must uncover a finished, readable destination.
    arrival.scrollTrigger?.getTween()?.progress(1);
    arrival.progress(1);
  };
  window.addEventListener('portfolio:navigate', settleArrival);
  return () => {
    window.removeEventListener('portfolio:navigate', settleArrival);
    context.revert();
  };
}
