import gsap from 'gsap';

export function animateFooterReveal() {
  const sequence = document.querySelector('.footer-sequence');
  if (!sequence) return () => {};
  const footer = sequence.querySelector('.signature-footer');
  const media = gsap.matchMedia();
  media.add('(min-width: 769px) and (min-height: 651px) and (prefers-reduced-motion: no-preference)', () => {
    // Uncover one complete surface, without an interstitial or pinned pause.
    gsap.fromTo(footer, { yPercent: -16 }, {
      yPercent: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: sequence,
        start: 'top bottom',
        end: 'top top',
        scrub: 0.45,
        invalidateOnRefresh: true
      }
    });
  });
  return () => media.revert();
}