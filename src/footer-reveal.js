import gsap from 'gsap';

export function animateFooterReveal() {
  const sequence = document.querySelector('.footer-sequence');
  if (!sequence) return () => {};
  const footer = sequence.querySelector('.signature-footer');
  const media = gsap.matchMedia();
  const heading = sequence.querySelector('.footer-headline');
  const originalMarkup = heading?.innerHTML;
  const originalLabel = heading?.getAttribute('aria-label');
  let arrivalObserver;
  let arrivalFrame = 0;
  let arrival;
  let settleArrival;

  if (heading && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heading.setAttribute('aria-label', 'Get in touch');
    heading.replaceChildren();
    ['Get in', 'touch'].forEach((word, index) => {
      if (index) heading.append(document.createTextNode(' '));
      const group = document.createElement('span');
      group.className = 'contact-word';
      group.setAttribute('aria-hidden', 'true');
      for (const letter of word) {
        if (letter === ' ') { group.append(document.createTextNode('\u00a0')); continue; }
        const glyph = document.createElement('span');
        glyph.className = 'contact-letter';
        glyph.textContent = letter;
        group.append(glyph);
      }
      heading.append(group);
    });
    const letters = heading.querySelectorAll('.contact-letter');
    gsap.set(letters, {
      yPercent: 48, rotation: index => index % 2 ? 5 : -5,
      opacity: 0, filter: 'blur(12px)', transformOrigin: '50% 90%'
    });
    heading.dataset.arrival = 'waiting';
    settleArrival = event => {
      if (event.detail.target.id !== 'contact') return;
      arrivalObserver?.disconnect();
      cancelAnimationFrame(arrivalFrame);
      arrival?.kill();
      gsap.set(letters, { clearProps: 'transform,transformOrigin,opacity,filter' });
      heading.dataset.arrival = 'complete';
    };
    window.addEventListener('portfolio:navigate', settleArrival);
    const playArrival = () => {
      if (heading.dataset.arrival === 'complete') return;
      // Navigation can cover the destination: reveal after its curtain clears.
      if (document.documentElement.classList.contains('is-colonnade-transitioning')) {
        arrivalFrame = requestAnimationFrame(playArrival);
        return;
      }
      heading.dataset.arrival = 'playing';
      arrival = gsap.to(letters, {
        yPercent: 0, rotation: 0, opacity: 1, filter: 'blur(0px)',
        duration: 1.25, stagger: 0.055, ease: 'power3.out',
        onComplete: () => {
          gsap.set(letters, { clearProps: 'transform,transformOrigin,opacity,filter' });
          heading.dataset.arrival = 'complete';
        }
      });
    };
    arrivalObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      arrivalObserver.disconnect();
      playArrival();
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.25 });
    arrivalObserver.observe(heading);
  }
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
  return () => {
    arrivalObserver?.disconnect();
    cancelAnimationFrame(arrivalFrame);
    arrival?.kill();
    if (settleArrival) window.removeEventListener('portfolio:navigate', settleArrival);
    media.revert();
    if (heading && originalMarkup !== undefined) {
      heading.innerHTML = originalMarkup;
      if (originalLabel === null) heading.removeAttribute('aria-label');
      else heading.setAttribute('aria-label', originalLabel);
      delete heading.dataset.arrival;
    }
  };
}
