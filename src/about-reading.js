import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createAboutTextDust } from './about-text-dust';
import { createAboutFrameColor } from './about-frame-color';
import { DESKTOP_HANDOFF_QUERY, getWorkHandoffDistances } from './about-work-handoff';

export function animateAboutReading({ getLenis = () => null } = {}) {
  const section = document.querySelector('#about');
  if (!section) return () => {};
  const copies = [...section.querySelectorAll('.about-reading-copy')];
  const stage = section.querySelector('.about-reading-stage');
  const showcase = section.querySelector('.about-art-showcase');
  const contentLeft = section.querySelector('.about-reading-content--left');
  const contentRight = section.querySelector('.about-reading-content--right');
  const canvas = section.querySelector('canvas.portrait-canvas-bg');
  if (copies.length < 2 || !stage || !showcase || !contentLeft || !contentRight) return () => {};
  const ctx = canvas ? canvas.getContext('2d', { alpha: false, desynchronized: true }) : null;
  const originals = copies.map(copy => copy.textContent.trim().replace(/\s+/g, ' '));
  const wordGroups = copies.map((copy, groupIndex) => {
    const tokens = originals[groupIndex].split(' ');
    copy.setAttribute('aria-label', originals[groupIndex]);
    copy.replaceChildren();
    return tokens.map((word, index) => {
      const wrapper = document.createElement('span');
      wrapper.className = 'about-reading-word';
      wrapper.setAttribute('aria-hidden', 'true');
      wrapper.textContent = word;
      copy.append(wrapper, index === tokens.length - 1 ? '' : ' ');
      return wrapper;
    });
  });
  const words = wordGroups.flat();
  const lastWordProgress = [-1, -1];
  const dust = createAboutTextDust(stage, showcase, copies, wordGroups);
  const frameColor = createAboutFrameColor(showcase);
  const cinematicMedia = window.matchMedia('(prefers-reduced-motion: no-preference)');
  const desktopHandoffMedia = window.matchMedia(DESKTOP_HANDOFF_QUERY);

  // Keep the reading rhythm and release directly into the Work section.
  const leftScrollDistance = Math.round(wordGroups[0].length * 5.5);
  const rightScrollDistance = Math.round(wordGroups[1].length * 5.5);
  const textScrollDistance = leftScrollDistance + rightScrollDistance;
  const motionScrollDistance = canvas ? 260 : 0;
  let handoffDistances = getWorkHandoffDistances();
  let LEFT_COMPLETE, TEXT_COMPLETE, FILM_COMPLETE, ABSORB_COMPLETE;
  function configureDistance() {
    const absorbDistance = cinematicMedia.matches ? textScrollDistance : 0;
    handoffDistances = getWorkHandoffDistances();
    const { descent, orbitHold } = handoffDistances;
    const clearPortraitDistance = cinematicMedia.matches ? (descent + orbitHold) * 100 : 0;
    const total = textScrollDistance + motionScrollDistance + absorbDistance + clearPortraitDistance;
    section.style.setProperty('--about-word-count', String(words.length));
    section.style.setProperty('--about-scroll-distance', `${total}svh`);
    section.style.setProperty('--about-scroll-distance-mobile', `${total}svh`);
    LEFT_COMPLETE = leftScrollDistance / total;
    TEXT_COMPLETE = textScrollDistance / total;
    FILM_COMPLETE = (textScrollDistance + motionScrollDistance) / total;
    ABSORB_COMPLETE = (textScrollDistance + motionScrollDistance + absorbDistance) / total;
  }
  configureDistance();

  // ==========================================
  // 120-FRAME PRELOADER & CANVAS RENDERER
  // Provides 0ms seek latency and 60-120fps hardware rendering
  // ==========================================
  const TOTAL_FRAMES = 120;
  const frames = new Array(TOTAL_FRAMES);
  let targetFrame = 0;
  let displayedFrame = 0;
  let lastDrawnIndex = -1;

  function renderFrame(index) {
    if (!ctx || !canvas) return;
    const idx = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(index)));
    if (idx === lastDrawnIndex) return;
    const img = frames[idx];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.dataset.frameReady = 'true';
      canvas.dispatchEvent(new Event('portrait:frame'));
      lastDrawnIndex = idx;
    }
  }

  // Preload frames asynchronously
  for (let i = 1; canvas && i <= TOTAL_FRAMES; i++) {
    const pad = String(i).padStart(3, '0');
    const img = new Image();
    img.src = `/fotosebelahabout/frames/frame_${pad}.webp`;
    img.onload = () => {
      if (i === 1 && lastDrawnIndex === -1) {
        renderFrame(0);
      }
    };
    frames[i - 1] = img;
  }

  let progress = 0;
  let displayedProgress = 0;
  let active = false;
  let speed = 1;
  let targetSpeed = 1;
  let cinematicActive = false;
  let gateArmed = false, repositioning = false, clearTime = 0;
  const revealSpan = 3.6;
  const hiddenOpacity = 0;
  const MAX_BLUR = 9.0;
  const clamp01 = value => Math.max(0, Math.min(1, value));

  // Fit both passages to the proportional frame with one shared font and line
  // count. Keep the existing word nodes for reveal and dust.
  function alignPassageLines() {
    const paired = window.matchMedia('(min-width: 700px)').matches;
    stage.style.removeProperty('--about-paired-font');
    stage.style.removeProperty('--about-paired-leading');
    const readLayouts = () => wordGroups.map((group, index) => {
      const copy = copies[index];
      const probe = document.createElement('span');
      probe.textContent = '\u00a0';
      copy.append(probe);
      const space = probe.getBoundingClientRect().width;
      probe.remove();
      const widths = group.map(word => word.getBoundingClientRect().width);
      const available = copy.clientWidth - 1;
      let lines = 1, used = 0;
      widths.forEach(width => {
        if (used && used + space + width > available) { lines++; used = width; }
        else used += (used ? space : 0) + width;
      });
      return { widths, space, available, lines };
    });
    let layouts = readLayouts();
    if (paired) {
      const frameHeight = showcase.querySelector('.portrait-orbit').getBoundingClientRect().height;
      const baseSize = parseFloat(getComputedStyle(copies[0]).fontSize);
      const scaledLineCount = scale => Math.max(...layouts.map(layout => {
        let lines = 1, used = 0;
        layout.widths.forEach(width => {
          const next = width * scale, gap = layout.space * scale;
          if (used && used + gap + next > layout.available) { lines++; used = next; }
          else used += (used ? gap : 0) + next;
        });
        return lines;
      }));
      // Keep the largest shared type size that fits beside the proportional frame.
      let low = .4, high = 1;
      for (let iteration = 0; iteration < 20; iteration++) {
        const scale = (low + high) / 2;
        if (scaledLineCount(scale) * baseSize * scale * 1.12 <= frameHeight) low = scale;
        else high = scale;
      }
      stage.style.setProperty('--about-paired-font', `${baseSize * low}px`);
      layouts = readLayouts();
      const lines = Math.max(...layouts.map(layout => layout.lines));
      stage.style.setProperty('--about-paired-leading', `${frameHeight / lines}px`);
    }
    const lineCount = Math.max(...layouts.map(layout => layout.lines));
    wordGroups.forEach((group, index) => {
      const breaks = new Set();
      if (paired) {
        const { widths, space, available } = layouts[index];
        const n = widths.length;
        const target = (widths.reduce((sum, width) => sum + width, 0) + space * (n - lineCount)) / lineCount;
        const cost = Array.from({ length: lineCount + 1 }, () => Array(n + 1).fill(Infinity));
        const previous = Array.from({ length: lineCount + 1 }, () => Array(n + 1).fill(-1));
        cost[0][0] = 0;
        for (let line = 1; line <= lineCount; line++) {
          for (let end = line; end <= n; end++) {
            let width = 0;
            for (let start = end - 1; start >= line - 1; start--) {
              width += widths[start] + (start < end - 1 ? space : 0);
              if (width > available) break;
              const next = cost[line - 1][start] + (width - target) ** 2;
              if (next < cost[line][end]) {
                cost[line][end] = next;
                previous[line][end] = start;
              }
            }
          }
        }
        if (Number.isFinite(cost[lineCount][n])) {
          let end = n;
          for (let line = lineCount; line > 1; line--) {
            end = previous[line][end];
            breaks.add(end);
          }
        }
      }
      copies[index].replaceChildren(...group.flatMap((word, wordIndex) =>
        wordIndex ? [breaks.has(wordIndex) ? document.createElement('br') : ' ', word] : [word]));
    });
  }

  function measureCinematicGeometry() {
    alignPassageLines();
    dust.measure();
  }

  function setCinematicState(absorbProgress) {
    const dustState = dust.render(absorbProgress);
    frameColor.render(cinematicMedia.matches ? dustState.receivedProgress : 1);
    const shouldBeActive = active && absorbProgress > 0.001;
    if (shouldBeActive !== cinematicActive) {
      cinematicActive = shouldBeActive;
      section.classList.toggle('is-about-cinematic', cinematicActive);
      document.body.classList.toggle('is-about-cinematic', cinematicActive);
    }
    section.dataset.cinematicPhase = absorbProgress >= 1 ? 'portrait-hold' : absorbProgress > 0.001 ? 'absorb' : 'reading';
    section.dataset.absorbProgress = absorbProgress.toFixed(4);
    section.dataset.absorbComplete = String(dustState.complete);
  }

  // Hold the actual sticky viewport as well as the animation timeline. Without
  // this boundary a fast scroll can release About while dust is still flying.
  function holdAbsorption(self) {
    const navigating = document.documentElement.classList.contains('is-colonnade-transitioning');
    if (!window.isMainPageReady || navigating || !cinematicMedia.matches || repositioning) return false;
    if (self.isActive && self.progress < ABSORB_COMPLETE) gateArmed = true;
    if (!gateArmed) return false;
    const pendingAbsorb = displayedProgress < ABSORB_COMPLETE || clearTime < .18;
    const boundary = pendingAbsorb ? ABSORB_COMPLETE : null;
    if (boundary === null || self.progress < boundary) return false;
    const top = Math.ceil(self.start + (self.end - self.start) * boundary);
    repositioning = true;
    progress = boundary;
    active = true;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo({ top, behavior: 'instant' });
    // Native scroll offsets are rounded to pixels; keep the held timeline at
    // the exact endpoint so the completion pause cannot stall below 100%.
    progress = boundary;
    repositioning = false;
    return true;
  }

  const trigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: self => {
      progress = self.progress;
      if (holdAbsorption(self)) return;
      targetSpeed = 1 + Math.min(Math.abs(self.getVelocity()) / 450, 1.5);
    },
    onRefresh: self => {
      progress = self.progress;
      measureCinematicGeometry();
    },
    onToggle: self => {
      active = self.isActive;
      if (!self.isActive) {
        cinematicActive = false;
        section.classList.remove('is-about-cinematic');
        document.body.classList.remove('is-about-cinematic');
      }
    },
    onLeave: self => {
      if (holdAbsorption(self)) return;
      dust.render(1);
      frameColor.render(1);
      active = false;
      cinematicActive = false;
      section.classList.remove('is-about-cinematic');
      document.body.classList.remove('is-about-cinematic');
    },
    onLeaveBack: () => {
      gateArmed = false; clearTime = 0;
      frameColor.render(cinematicMedia.matches ? 0 : 1);
      active = false;
      cinematicActive = false;
      section.classList.remove('is-about-cinematic');
      document.body.classList.remove('is-about-cinematic');
    }
  });

  const draw = (time, deltaMs) => {
    if (!active) {
      const bounds = section.getBoundingClientRect();
      if (bounds.top >= window.innerHeight) {
        displayedProgress = progress;
        setCinematicState(0);
        return;
      }
      if (bounds.bottom <= 0) {
        displayedProgress = progress;
        if (cinematicActive) {
          cinematicActive = false;
          section.classList.remove('is-about-cinematic');
          document.body.classList.remove('is-about-cinematic');
        }
        return;
      }
    }
    const dt = Math.min(deltaMs / 1000, 0.05);
    speed += (targetSpeed - speed) * (1 - Math.exp(-dt * 8));
    targetSpeed += (1 - targetSpeed) * (1 - Math.exp(-dt * 5));
    
    // Smooth, responsive interpolation following user scroll
    const convergenceRate = progress > 0.85 ? 16 : 10;
    const nextProgress = displayedProgress + (progress - displayedProgress) * (1 - Math.exp(-dt * convergenceRate));
    // Interpolation approaches a held endpoint without ever reaching it.
    // Commit the final half-pixel so the completion pause can finish and
    // release native/Lenis scrolling into Works in either direction.
    const endpointTolerance = .5 / Math.max(1, trigger.end - trigger.start);
    displayedProgress = Math.abs(progress - nextProgress) <= endpointTolerance ? progress : nextProgress;
    clearTime = displayedProgress >= ABSORB_COMPLETE ? clearTime + dt : 0;

    // ==========================================
    // Finish every word on the left before revealing the right paragraph.
    // ==========================================
    const leftProgress = Math.min(1, Math.max(0, displayedProgress / LEFT_COMPLETE));
    const rightProgress = Math.min(1, Math.max(0, (displayedProgress - LEFT_COMPLETE) / (TEXT_COMPLETE - LEFT_COMPLETE)));
    wordGroups.forEach((group, groupIndex) => {
      const textProgress = !cinematicMedia.matches ? 1 : groupIndex === 0 ? leftProgress : rightProgress;
      if (Math.abs(textProgress - lastWordProgress[groupIndex]) < .00001) return;
      lastWordProgress[groupIndex] = textProgress;
      const revealed = textProgress * (group.length + revealSpan);
      group.forEach((word, index) => {
        if (textProgress >= 1) {
          word.style.filter = 'blur(0px)';
          word.style.opacity = '1';
          return;
        }
        const amount = Math.max(0, Math.min(1, (revealed - index) / revealSpan));
        const clarity = amount * amount * amount * (amount * (amount * 6 - 15) + 10);
        const unrevealed = 1 - clarity;
        const blur = (unrevealed * unrevealed) * MAX_BLUR;
        const opacity = hiddenOpacity + clarity * (1 - hiddenOpacity);

        word.style.transform = 'none';
        const filterValue = blur < 0.05 ? 'blur(0px)' : `blur(${blur.toFixed(2)}px)`;
        const opacityValue = opacity >= 0.99 ? '1' : opacity.toFixed(3);
        if (word.style.filter !== filterValue) word.style.filter = filterValue;
        if (word.style.opacity !== opacityValue) word.style.opacity = opacityValue;
      });
    });

    // ==========================================
    // PHASE 2: SCROLL-DRIVEN MOTION PICTURE
    // User scroll directly scrubs the 120-frame animation behind selfphoto!
    // ==========================================
    if (displayedProgress <= TEXT_COMPLETE) {
      targetFrame = 0;
    } else {
      // User has finished reading text, and further scroll advances the motion picture!
      const motionProgress = motionScrollDistance ? Math.min(1, Math.max(0, (displayedProgress - TEXT_COMPLETE) / (FILM_COMPLETE - TEXT_COMPLETE))) : 0;
      targetFrame = motionProgress * (TOTAL_FRAMES - 1);
    }

    // 60fps/120fps fluid frame interpolation (Apple-style spring lerp)
    displayedFrame += (targetFrame - displayedFrame) * (1 - Math.exp(-dt * 18));
    renderFrame(displayedFrame);

    const cinematicEnabled = cinematicMedia.matches;
    const absorbProgress = cinematicEnabled ? clamp01((displayedProgress - FILM_COMPLETE) / (ABSORB_COMPLETE - FILM_COMPLETE)) : 0;
    setCinematicState(absorbProgress);
  };

  // Boundary changes use the same smoothing while the paragraph is visible.
  progress = displayedProgress = trigger.progress;
  gsap.set(words, {
    filter: `blur(${MAX_BLUR}px)`,
    opacity: hiddenOpacity,
    transform: 'none'
  });
  renderFrame(0);
  measureCinematicGeometry();
  draw(0, 0);
  gsap.ticker.add(draw);
  // Reload restoration is a seek, not a new scroll gesture. Commit the exact
  // reading/dust state behind the loader instead of replaying it.
  const restoreState = () => {
    progress = displayedProgress = trigger.progress;
    active = trigger.isActive;
    gateArmed = false;
    clearTime = displayedProgress >= ABSORB_COMPLETE ? 1 : 0;
    speed = targetSpeed = 1;
    lastWordProgress.fill(-1);
    measureCinematicGeometry();
    draw(0, 0);
  };
  window.addEventListener('portfolio:restore', restoreState);
  const onMediaChange = () => {
    configureDistance();
    ScrollTrigger.refresh();
  };
  const onDesktopHandoffChange = () => {
    // Keep the current scene when resizing across the desktop breakpoint.
    // Removing four screen lengths above Work must not send the user to Contact.
    const boundary = scrollY + section.getBoundingClientRect().top
      + (section.offsetHeight - innerHeight) * ABSORB_COMPLETE;
    const offset = scrollY - boundary;
    const previous = handoffDistances;
    configureDistance();
    getLenis()?.resize();
    ScrollTrigger.refresh();
    if (!cinematicMedia.matches || offset <= 0) return;
    const oldDescent = previous.descent * innerHeight;
    const oldHold = previous.orbitHold * innerHeight;
    const newDescent = handoffDistances.descent * innerHeight;
    const newHold = handoffDistances.orbitHold * innerHeight;
    const nextOffset = offset <= oldDescent
      ? offset / oldDescent * newDescent
      : offset <= oldDescent + oldHold
        ? newDescent + (offset - oldDescent) / oldHold * newHold
        : newDescent + newHold + offset - oldDescent - oldHold;
    repositioning = true;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(boundary + nextOffset, { immediate: true, force: true });
    else window.scrollTo({ top: boundary + nextOffset, behavior: 'instant' });
    ScrollTrigger.update();
    progress = displayedProgress = trigger.progress;
    repositioning = false;
  };
  cinematicMedia.addEventListener('change', onMediaChange);
  desktopHandoffMedia.addEventListener('change', onDesktopHandoffChange);
  const onFontsLoaded = () => ScrollTrigger.refresh();
  document.fonts.addEventListener('loadingdone', onFontsLoaded);

  return () => {
    window.removeEventListener('portfolio:restore', restoreState);
    gsap.ticker.remove(draw);
    cinematicMedia.removeEventListener('change', onMediaChange);
    desktopHandoffMedia.removeEventListener('change', onDesktopHandoffChange);
    document.fonts.removeEventListener('loadingdone', onFontsLoaded);
    frameColor.dispose();
    stage.style.removeProperty('--about-paired-font');
    stage.style.removeProperty('--about-paired-leading');
    trigger.kill();
    section.classList.remove('is-about-cinematic');
    document.body.classList.remove('is-about-cinematic');
    section.removeAttribute('data-cinematic-phase');
    section.removeAttribute('data-absorb-progress');
    section.removeAttribute('data-absorb-complete');
    dust.dispose();
    [contentLeft, contentRight].forEach(content => {
      content.style.removeProperty('--about-copy-x');
      content.style.removeProperty('--about-copy-scale');
    });
    gsap.set([contentLeft, contentRight, showcase], { clearProps: 'transform,opacity,filter,transformOrigin' });
    section.style.removeProperty('--about-word-count');
    section.style.removeProperty('--about-scroll-distance');
    section.style.removeProperty('--about-scroll-distance-mobile');
    copies.forEach((copy, index) => {
      copy.textContent = originals[index];
      copy.removeAttribute('aria-label');
    });
  };
}
