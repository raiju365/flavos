import gsap from 'gsap';

export function initExperience(main) {
  const canvas = main.querySelector('.composition-canvas');
  const spread = main.querySelector('#composition-spread');
  const turn = main.querySelector('#composition-turn');
  const palettes = [...main.querySelectorAll('.palette-options button')];
  const paletteNames = { ink: 'navy', clay: 'terracotta', olive: 'olive green' };
  const update = () => {
    canvas.style.setProperty('--spread', `${Number(spread.value) * 0.22}deg`);
    canvas.style.setProperty('--turn', `${turn.value}deg`);
    main.querySelector('#spread-value').value = `${spread.value}%`;
    main.querySelector('#turn-value').value = `${turn.value}°`;
    canvas.setAttribute('aria-label', `Seven ${paletteNames[canvas.dataset.palette]} arches, spread ${spread.value} percent, rotated ${turn.value} degrees`);
  };
  const setPalette = name => {
    canvas.dataset.palette = name;
    palettes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.palette === name)));
    update();
  };
  palettes.forEach(button => button.addEventListener('click', () => setPalette(button.dataset.palette)));
  spread.addEventListener('input', update);
  turn.addEventListener('input', update);
  main.querySelector('.composition-reset').addEventListener('click', () => {
    spread.value = '45';
    turn.value = '0';
    setPalette('ink');
  });
  update();
}

export function animateExperience(main) {
  // Each story occupies its own reading space; scrolling also assembles its visual.
  main.querySelectorAll('.about-story').forEach(story => {
    gsap.from(story.children, {
      y: 34, opacity: 0, stagger: 0.12, duration: 0.9,
      ease: 'power2.out', scrollTrigger: { trigger: story, start: 'top 75%', toggleActions: 'play none none reverse' }
    });
    gsap.from(story.querySelectorAll('.story-visual i'), {
      rotation: -35, scale: 0.55, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: story, start: 'top 85%', end: 'center center', scrub: 0.8 }
    });
  });
  gsap.fromTo('.journey-track i', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.about-journey', start: 'top center', end: 'bottom center', scrub: 0.5 } });
}
