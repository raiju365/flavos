import gsap from 'gsap';

// Content stays in document flow, with a fine rule connecting each chapter.
export function mountScrollTransitions(main) {
  main.querySelectorAll('.scroll-composition, .chapter-transition').forEach(element => element.remove());
  return [...main.querySelectorAll('#projects')];
}

export function animateScrollTransitions(sections) {
  sections.forEach(section => {
    gsap.fromTo(section, { '--section-rule': 0 }, {
      '--section-rule': 1, ease: 'none',
      scrollTrigger: { trigger: section, start: 'top 90%', end: 'top 45%', scrub: 0.5 }
    });
  });
}
