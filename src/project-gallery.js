import gsap from 'gsap';
import { createDetailFlight } from './gallery-detail-flight';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { galleryWorks } from './project-gallery-data';
import './project-gallery.css';
import { createGalleryArtColor } from './gallery-art-color';
import { DESKTOP_HANDOFF_QUERY, getWorkHandoffDistances } from './about-work-handoff';
import { getGalleryFlightLayout } from './gallery-flight-layout';
import imageVariants from './gallery-image-variants.json';

export function initProjectGallery({ getLenis }) {
  const dialog = document.getElementById('project-gallery');
  const section = document.getElementById('projects');
  if (!dialog || !section) return;
  const $ = selector => dialog.querySelector(selector) || section.querySelector(selector);
  const stage = $('.orbit-stage'), overview = $('.orbit-overview');
  const about = document.querySelector('#about');
  const portrait = about.querySelector('.portrait-orbit');
  const readingStage = portrait.closest('.about-reading-stage');
  const detail = $('.orbit-detail'), media = $('.orbit-detail-media');
  const title = $('#orbit-detail-title');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const compactDetail = matchMedia('(pointer: coarse), (max-width: 760px)');
  const detailSource = src => imageVariants[src]?.[compactDetail.matches ? 1280 : 1920] || src;
  function setDetailImage(image, src) {
    const dimensions = imageVariants[src];
    if (dimensions) { image.width = dimensions.width; image.height = dimensions.height; }
    image.decoding = 'async';
    image.src = detailSource(src);
  }
  function restoreCursor() {
    const cursor = dialog.querySelector('#custom-cursor');
    if (cursor) document.body.append(cursor);
  }
  const desktopHandoff = matchMedia(DESKTOP_HANDOFF_QUERY);
  const abort = new AbortController(), options = { signal: abort.signal };
  const count = galleryWorks.length, step = Math.PI * 2 / count;
  const ring = $('.orbit-cards'), camera = $('.orbit-camera');
  stage.setAttribute('aria-label', `${count} karya, geser horizontal atau gunakan tombol panah untuk menjelajah`);
  let angle = 0, target = 0, frame = 0, lastTime = 0, geometry, velocity = 0;
  let wind = 0, windImpulse = 0, windDirection = 1, previousScrollY = window.scrollY;
  let hovered = null, focused = null, selected = null;
  let busy = false, animation, resumeScroll = false, drag, suppressClick = 0;
  let returnIndex = 0, restoringFocus = false;
  let returnState = null, operation = 0, returnHold = false;
  const imageCache = new Map(), detailStates = new Map();
  let previousOverflow = '', entered = false, inView = false, sceneVisible = false, entrance;
  let centerIndex = 0;
  let wheelSettle = 0;
  let travellingArt = null;
  let turntableControls = null;
  const detailParts = () => [$('.orbit-detail-copy'), $('.orbit-detail-context'), $('.orbit-detail-controls'), $('.orbit-back')];
  function removeTravel() {
    travellingArt?.remove(); travellingArt = null;
    if (turntableControls) {
      const { controls, spacer } = turntableControls;
      spacer.replaceWith(controls); controls.classList.remove('orbit-turntable-controls');
      turntableControls = null;
    }
    gsap.set([media, ...cards], { clearProps: 'visibility' });
  }
  function activeImage() {
    const viewport = media.querySelector('.orbit-image-viewport');
    const index = viewport ? Math.round(viewport.scrollLeft / (viewport.clientWidth || 1)) : 0;
    return media.querySelectorAll('img')[index] || media;
  }
  function loadImage(src) {
    src = detailSource(src);
    if (!imageCache.has(src)) {
      const image = new Image(); image.src = src;
      imageCache.set(src, { image, ready: image.decode().catch(() => {}) });
    }
    return imageCache.get(src);
  }
  function prepareWork(i) {
    const work = galleryWorks[wrap(i)];
    const assets = work.images || (work.src ? [{ src: work.src }] : []);
    const asset = assets[detailStates.get(wrap(i))?.slide || 0] || assets[0];
    return asset ? loadImage(asset.src).ready : Promise.resolve();
  }
  function setImageSize(image) {
    const source = imageCache.get(image.getAttribute('src'))?.image;
    if (source?.naturalWidth) { image.width = source.naturalWidth; image.height = source.naturalHeight; }
  }
  function cardEndpoint(i) {
    const card = cards[i], cameraRect = camera.getBoundingClientRect();
    const matrix = new DOMMatrix(getComputedStyle(card).transform);
    return {
      left: cameraRect.left + card.offsetLeft, top: cameraRect.top + card.offsetTop,
      width: card.offsetWidth, height: card.offsetHeight,
      x: matrix.m41, y: matrix.m42, z: matrix.m43 - geometry.radius,
      rotationY: Math.atan2(-matrix.m13, matrix.m11) * 180 / Math.PI,
      scale: Math.hypot(matrix.m11, matrix.m12, matrix.m13),
      perspective: geometry.perspective,
      perspectiveOrigin: `${cameraRect.left + cameraRect.width / 2}px ${cameraRect.top + cameraRect.height / 2}px`,
      blur: parseFloat(card.style.getPropertyValue('--orbit-depth-blur')) || 0,
    };
  }
  const flatEndpoint = element => ({ ...rectVars(element), x: 0, y: 0, z: 0, rotationY: 0, scale: 1, blur: 0 });
  function rearJump(i, origin) {
    if (!origin || Number(cards[i].dataset.depth) < .35) return null;
    const obstacles = cards.flatMap((card, index) => index === i ? [] : [{
      pose: cardEndpoint(index), rect: rectVars(card),
    }]);
    const maskCache = new Map();
    const maskAt = depth => {
      const nearer = obstacles.filter(obstacle => obstacle.pose.z > depth + 1);
      if (!nearer.length) return 'none';
      const key = nearer.map(obstacle => obstacle.pose.z).join(',');
      if (!maskCache.has(key)) {
        const holes = nearer.map(({ rect: r }) => `<rect x="${r.left}" y="${r.top}" width="${r.width}" height="${r.height}" fill="black"/>`).join('');
        maskCache.set(key, `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${innerWidth}" height="${innerHeight}"><rect width="100%" height="100%" fill="white"/>${holes}</svg>`)}")`);
      }
      return maskCache.get(key);
    };
    return { obstacles, maskAt, mask: maskAt(origin.z) };
  }
  function animateRearFlight(flight, rear, front, jump, returning = false) {
    const route = createDetailFlight(rear, front, jump.obstacles);
    const progress = { rearFlight: returning ? 1 : 0 };
    const scene = flight.proxy.parentElement;
    scene.style.maskMode = 'luminance'; scene.style.maskRepeat = 'no-repeat';
    const draw = () => {
      Object.assign(flight.state, route.poseAt(progress.rearFlight));
      scene.style.maskImage = jump.maskAt(flight.state.z);
      flight.proxy.dataset.flightProgress = progress.rearFlight.toFixed(4);
      flight.proxy.dataset.flightDepth = flight.state.z.toFixed(2);
      flight.proxy.dataset.flightSpin = flight.state.rotationY.toFixed(2);
      flight.proxy.dataset.flightLift = route.lift.toFixed(2);
      flight.render();
    };
    draw();
    return { target: progress, vars: { rearFlight: returning ? 0 : 1, duration: 1.25, ease: 'none', onUpdate: draw } };
  }
  function travelArtwork(source, endpoint, plane) {
    const scene = document.createElement('div'); scene.className = 'orbit-travelling-art';
    scene.setAttribute('aria-hidden', 'true'); scene.inert = true;
    scene.style.perspective = `${plane.perspective}px`;
    scene.style.perspectiveOrigin = plane.perspectiveOrigin;
    const proxy = document.createElement('div'); proxy.className = 'orbit-travelling-surface';
    const image = source.matches('img') ? source : source.querySelector('img');
    if (image) { const copy = new Image(); copy.src = image.currentSrc || image.src; copy.alt = ''; proxy.append(copy); }
    else proxy.textContent = 'asset';
    scene.append(proxy); dialog.append(scene); travellingArt = scene;
    const state = { ...endpoint };
    const render = () => {
      const { left, top, width, height, x, y, z, rotationY, rotationX = 0, rotationZ = 0, scale = 1, blur } = state;
      Object.assign(proxy.style, {
        left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`,
        transform: `translate3d(${x}px,${y}px,${z}px) rotateY(${rotationY}deg) rotateX(${rotationX}deg) rotateZ(${rotationZ}deg) scale(${scale})`,
        filter: `blur(${blur}px)`,
      });
    };
    render();
    return { proxy, state, render };
  }
  function rectVars(element) {
    const r = element.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }
  function turntableCard(source, scene, role) {
    const bounds = rectVars(source);
    const card = document.createElement('div');
    card.className = 'orbit-turntable-card'; card.dataset.role = role;
    Object.assign(card.style, {
      left: `${bounds.left}px`, top: `${bounds.top}px`,
      width: `${bounds.width}px`, height: `${bounds.height}px`,
    });
    if (source.matches('img')) {
      const image = new Image(); image.src = source.currentSrc || source.src;
      image.alt = ''; image.decoding = 'async'; card.append(image);
    } else { card.textContent = 'asset'; card.classList.add('is-empty'); }
    scene.append(card);
    return { card, bounds };
  }
  const wrap = value => (value + count) % count;
  const label = i => galleryWorks[i].title || `Asset ${String(i + 1).padStart(2, '0')}`;
  const cards = galleryWorks.map((work, i) => {
    const card = document.createElement('button');
    card.type = 'button'; card.className = 'orbit-card'; card.dataset.index = String(i);
    card.setAttribute('aria-label', `${String(i + 1).padStart(2, '0')}. ${label(i)} — lihat detail`);
    const surface = document.createElement('span'); surface.className = 'orbit-card-surface';
    if (work.src) {
      const image = new Image();
      image.decoding = 'async';
      image.src = `/karya/thumbs/${work.src.split('/').pop()}.webp`;
      image.alt = work.title || '';
      image.addEventListener('error', () => { image.src = work.src; }, { ...options, once: true });
      image.draggable = false; surface.append(image);
    } else surface.textContent = 'asset';
    card.append(surface);
    $('.orbit-cards').append(card);
    return card;
  });
  const artColors = cards.map((card, index) => createGalleryArtColor(card.firstElementChild, index + 1, motion));
  const auto = () => emergence >= 1 && !motion.matches && hovered === null && focused === null && !drag && !returnHold;
  let emergence = 0, landingY = 0, originX = 0, originY = 0, portraitLift = 0;
  let entranceDirty = false, entryGeometry;
  function paint() {
    if (!geometry) return;
    const { radius } = geometry;
    ring.style.transform = `translateZ(${-radius}px)`;
    centerIndex = ((Math.round(-angle / step) % count) + count) % count;
    const poses = getGalleryFlightLayout({
      progress: emergence, count, angle, radius, size: geometry.size, gap: geometry.gap,
      photoWidth: entryGeometry.photoWidth, originX, originY, portraitLift, landingY,
      viewportHeight: innerHeight, desktop: desktopHandoff.matches,
    });
    cards.forEach((card, i) => {
      const { x, y, z, yaw, pitch, bank, scale, progress, depth } = poses[i];
      // Frost builds continuously towards the rear; the front stays clear.
      const frost = depth * depth * (3 - 2 * depth);
      const blur = frost * 7.5;
      card.style.setProperty('--orbit-depth-blur', `${blur.toFixed(3)}px`);
      card.style.setProperty('--orbit-glass-opacity', (frost * .48).toFixed(3));
      card.dataset.depth = depth.toFixed(3);
      card.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateY(${yaw}rad) rotateX(${pitch}rad) rotateZ(${bank}rad) scale(${scale})`;
      card.style.visibility = progress <= 0 ? 'hidden' : '';
      card.dataset.arrival = progress.toFixed(4);
      card.dataset.center = String(i === centerIndex);
    });
    camera.style.transform = 'translate3d(0,0,0)';
    stage.dataset.angle = angle.toFixed(4);
    stage.dataset.centerIndex = String(centerIndex);
  }
  function tick(now) {
    frame = 0;
    if (entranceDirty) { entranceDirty = false; beginEntrance(false); }
    if (!sceneVisible || selected !== null || busy || document.hidden) { lastTime = 0; return; }
    const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0;
    lastTime = now;
    // Respond to scroll and deliberate orbit movement, not the idle rotation.
    const angularWind = Math.min(1, Math.max(0, Math.abs(target - angle) - .018) * 2.4);
    if (angularWind > .05) windDirection = Math.sign(target - angle) || windDirection;
    const demand = motion.matches ? 0 : Math.max(Math.abs(windImpulse), angularWind);
    wind += (demand - wind) * (1 - Math.exp(-dt * (demand > wind ? 18 : 5)));
    windImpulse *= Math.exp(-dt * 6);
    if (motion.matches || wind < .001) wind = 0;
    if (Math.abs(windImpulse) < .001) windImpulse = 0;
    // Scroll light belongs to the scene plane, never the rotating artwork surface.
    stage.style.setProperty('--orbit-wind-sheen', (wind * .3).toFixed(3));
    stage.style.setProperty('--orbit-wind-shift', `${(wind * windDirection * 24).toFixed(3)}%`);
    stage.dataset.wind = wind.toFixed(3);
    const desiredVelocity = auto() ? Math.PI * 2 / 85 : 0;
    // Keep the integrator alive through lift-off: only its demand changes.
    // Starting takes ~1.7s to reach 95%; braking takes ~1s to shed 95%.
    const response = desiredVelocity > velocity ? 1.8 : 3;
    velocity = motion.matches ? 0 : velocity + (desiredVelocity - velocity) * (1 - Math.exp(-dt * response));
    if (Math.abs(velocity) < .00005) velocity = 0;
    stage.dataset.rotationVelocity = velocity.toFixed(6);
    stage.dataset.rotationDemand = desiredVelocity.toFixed(6);
    target += dt * velocity;
    angle = motion.matches ? target : angle + (target - angle) * (1 - Math.exp(-dt * 12));
    if (Math.abs(target - angle) < .00001) angle = target;
    paint();
    if (auto() || velocity !== 0 || angle !== target || wind !== 0 || windImpulse !== 0) frame = requestAnimationFrame(tick);
    else lastTime = 0;
  }
  function start() {
    if (!frame && sceneVisible && selected === null && !busy && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function measure() {
    if (!stage.clientWidth || !stage.clientHeight) return;
    // Scroll locking may change the document gutter. Keep the opening orbit
    // geometry until the original page is restored, unless the viewport changed.
    if (returnState && returnState.width === innerWidth && returnState.height === innerHeight) return;
    // Cache document coordinates on resize/refresh, not after every scroll
    // transform write. Entry then needs no synchronous layout measurements.
    const sectionBounds = section.getBoundingClientRect();
    const photoBounds = portrait.getBoundingClientRect();
    const readingBounds = readingStage.getBoundingClientRect();
    entryGeometry = {
      top: sectionBounds.top + scrollY,
      sectionHeight: section.clientHeight,
      aboutBottom: about.getBoundingClientRect().bottom + scrollY,
      readingHeight: readingStage.offsetHeight,
      photoWidth: photoBounds.width,
      photoCenterX: photoBounds.left + photoBounds.width / 2,
      localPhotoCenterY: photoBounds.top - readingBounds.top + photoBounds.height / 2,
    };
    const heightLimit = stage.clientHeight * (stage.clientHeight < 600 ? .425 : .475);
    const size = Math.min(475, Math.max(287.5, stage.clientWidth * .31875), heightLimit, stage.clientWidth * .8);
    // Keep enough chord distance for each card's diagonal, also on mobile.
    const gap = size * .55;
    const radius = (size + gap) / (2 * Math.tan(Math.PI / count));
    const perspective = radius * 3.4;
    stage.style.setProperty('--orbit-size', `${size}px`);
    camera.style.perspective = `${perspective}px`;
    // Eye-level orbit: front and rear cards share one horizontal centreline.
    ring.style.transform = `translateZ(${-radius}px)`;
    geometry = { radius, size, gap, perspective, height: stage.clientHeight };
    stage.dataset.radius = radius.toFixed(3);
    stage.dataset.gap = gap.toFixed(3);
    beginEntrance();
    start();
  }
  function caption() {
    stage.dataset.paused = String(!auto());
  }
  function hold() { caption(); start(); }
  function highlight(i, active, immediate = false) {
    artColors[i]?.setActive(active, immediate);
    const surface = cards[i].firstElementChild;
    cards[i].classList.toggle('is-highlighted', active);
    gsap.killTweensOf(surface);
    gsap.set(surface, { clearProps: 'filter,transform' });
  }
  cards.forEach((card, i) => {
    card.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch' || drag || busy || selected !== null) return;
      hovered = i; prepareWork(i); highlight(i, true); hold();
    }, options);
    card.addEventListener('pointerleave', () => { if (hovered === i) hovered = null; highlight(i, focused === i); caption(); start(); }, options);
    card.addEventListener('focus', () => {
      if (!restoringFocus && card.matches(':focus-visible')) {
        prepareWork(i);
        focused = i;
        target = -i * step + Math.round((angle + i * step) / (2 * Math.PI)) * 2 * Math.PI;
        highlight(i, true); hold();
      }
    }, options);
    card.addEventListener('blur', () => { if (focused === i) focused = null; highlight(i, hovered === i); caption(); start(); }, options);
    card.addEventListener('click', () => { if (performance.now() > suppressClick) openDetail(i); }, options);
  });
  function updateDetail(i) {
    if (selected !== null) {
      const viewport = media.querySelector('.orbit-image-viewport');
      detailStates.set(selected, { slide: viewport ? Math.round(viewport.scrollLeft / (viewport.clientWidth || 1)) : 0, scrollTop: detail.scrollTop });
    }
    selected = wrap(i);
    const work = galleryWorks[selected];
    title.textContent = label(selected);
    $('.orbit-detail-count').textContent = `${String(selected + 1).padStart(2, '0')} / ${count}`;
    $('.orbit-detail-description').textContent = work.description || 'Karya sedang dibuat. Aset dan penjelasannya akan ditampilkan di sini.';
    media.replaceChildren();
    media.classList.toggle('has-image', Boolean(work.src));
    if (work.src) {
      if (work.images?.length > 1) renderImageSlides(work);
      else {
        const image = new Image(); setDetailImage(image, work.src); image.alt = work.title || label(selected);
        setImageSize(image);
        // Detail keeps natural proportions; the rotating thumbnails are square.
        media.append(image);
      }
    } else {
      const placeholder = document.createElement('span'); placeholder.textContent = 'asset'; media.append(placeholder);
    }
    detail.scrollTop = detailStates.get(selected)?.scrollTop || 0;
  }
  function renderImageSlides(work) {
    const carousel = document.createElement('div'); carousel.className = 'orbit-image-carousel';
    carousel.setAttribute('role', 'region'); carousel.setAttribute('aria-label', `Gambar ${work.title}`);
    const viewport = document.createElement('div'); viewport.className = 'orbit-image-viewport';
    viewport.tabIndex = 0; viewport.setAttribute('aria-label', 'Geser atau gunakan panah untuk melihat gambar karya');
    work.images.forEach((asset, index) => {
      const slide = document.createElement('div'); slide.className = 'orbit-image-slide';
      slide.setAttribute('role', 'group'); slide.setAttribute('aria-label', `${index + 1} dari ${work.images.length}: ${asset.label}`);
      const image = new Image(); setDetailImage(image, asset.src); image.alt = asset.alt;
      setImageSize(image);
      image.draggable = false; slide.append(image); viewport.append(slide);
    });
    const controls = document.createElement('div'); controls.className = 'orbit-image-controls';
    const previous = document.createElement('button'), next = document.createElement('button');
    previous.type = next.type = 'button'; previous.textContent = '←'; next.textContent = '→';
    previous.setAttribute('aria-label', 'Gambar sebelumnya'); next.setAttribute('aria-label', 'Gambar berikutnya');
    const status = document.createElement('span'); status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true');
    let current = 0;
    const sync = () => {
      current = Math.max(0, Math.min(work.images.length - 1, Math.round(viewport.scrollLeft / (viewport.clientWidth || 1))));
      status.textContent = `${String(current + 1).padStart(2, '0')} / ${String(work.images.length).padStart(2, '0')} — ${work.images[current].label}`;
      previous.disabled = current === 0; next.disabled = current === work.images.length - 1;
    };
    const move = index => viewport.scrollTo({ left: Math.max(0, Math.min(work.images.length - 1, index)) * viewport.clientWidth, behavior: motion.matches ? 'instant' : 'smooth' });
    previous.addEventListener('click', () => move(current - 1), options);
    next.addEventListener('click', () => move(current + 1), options);
    viewport.addEventListener('scroll', sync, { ...options, passive: true });
    carousel.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      move(event.key === 'Home' ? 0 : event.key === 'End' ? work.images.length - 1 : current + (event.key === 'ArrowLeft' ? -1 : 1));
    }, options);
    controls.append(previous, status, next); carousel.append(viewport, controls); media.append(carousel);
    viewport.scrollLeft = (detailStates.get(selected)?.slide || 0) * viewport.clientWidth;
    sync();
  }
  function resetHighlights() {
    hovered = null; focused = null;
    cards.forEach((card, i) => highlight(i, false, true));
  }
  function clearTransition() {
    removeTravel();
    gsap.set([$('.orbit-shell'), detail, media, $('.orbit-detail-layout'), ...detailParts()], { clearProps: 'opacity,filter,transform,clipPath,visibility' });
    dialog.dataset.scenePhase = 'idle';
    dialog.classList.remove('is-orbit-transitioning');
    busy = false; animation = null;
  }
  async function openDetail(i) {
    if (busy || selected !== null) return;
    busy = true; target = angle; velocity = 0; lastTime = 0; returnIndex = i;
    const ticket = ++operation;
    clearTimeout(wheelSettle);
    returnState = { angle, width: innerWidth, height: innerHeight,
      endpoints: compactDetail.matches || motion.matches ? null : cards.map((_, index) => cardEndpoint(index)) };
    const origin = returnState.endpoints?.[i];
    const jump = rearJump(i, origin);
    const sourceColor = Number(cards[i].querySelector('img')?.dataset.colorProgress || 0);
    updateDetail(i); resetHighlights();
    resumeScroll = Boolean(getLenis() && !getLenis().isStopped);
    getLenis()?.stop();
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    detail.hidden = false; detail.inert = true; detail.scrollTop = 0;
    overview.inert = true;
    if (!motion.matches && !compactDetail.matches) {
      gsap.set($('.orbit-shell'), { clipPath: 'inset(100% 0 0 0)' });
      gsap.set(detailParts(), { y: 22, clipPath: 'inset(0 0 100% 0)' });
    }
    dialog.showModal();
    const cursor = document.getElementById('custom-cursor');
    if (cursor) dialog.append(cursor);
    const finish = () => {
      detail.inert = false; clearTransition();
      title.focus({ preventScroll: true });
    };
    dialog.classList.add('is-orbit-transitioning'); dialog.dataset.scenePhase = 'loading-detail';
    const flight = motion.matches || compactDetail.matches ? null : travelArtwork(cards[i], origin, origin);
    if (flight && jump) {
      travellingArt.style.maskImage = jump.mask;
      travellingArt.style.maskMode = 'luminance';
      travellingArt.style.maskRepeat = 'no-repeat';
    }
    if (flight) gsap.set([media, cards[i]], { visibility: 'hidden' });
    await prepareWork(i);
    if (ticket !== operation || !dialog.open) return;
    media.querySelectorAll('img').forEach(setImageSize);
    const viewport = media.querySelector('.orbit-image-viewport');
    if (viewport) viewport.scrollLeft = (detailStates.get(i)?.slide || 0) * viewport.clientWidth;
    detail.scrollTop = detailStates.get(i)?.scrollTop || 0;
    if (motion.matches) { finish(); return; }
    if (compactDetail.matches || !flight) {
      // Touch devices reveal the real detail directly: no full-size duplicate,
      // per-frame layout resizing, grayscale filter or fullscreen clip mask.
      dialog.dataset.scenePhase = 'to-detail';
      animation = gsap.timeline({ onComplete: finish })
        .fromTo(media, { opacity: .65, y: 8 }, { opacity: 1, y: 0, duration: .24, ease: 'power2.out' });
      return;
    }
    const destination = flatEndpoint(activeImage());
    const { proxy, state, render } = flight;
    const proxyImage = proxy.querySelector('img');
    // Use one full-resolution image: its centred cover crop matches the square
    // thumbnail, then opens continuously to the natural detail proportions.
    if (proxyImage) {
      proxyImage.src = activeImage().getAttribute('src');
      await proxyImage.decode().catch(() => {});
      if (ticket !== operation || !dialog.open) return;
      gsap.set(proxyImage, { filter: `grayscale(${1 - sourceColor})` });
    }
    dialog.dataset.scenePhase = 'to-detail';
    if (jump) {
      const route = animateRearFlight(flight, origin, destination, jump);
      animation = gsap.timeline({ onComplete: finish })
        .to(route.target, route.vars, 0)
        .to($('.orbit-shell'), { clipPath: 'inset(0% 0 0 0)', duration: .35, ease: 'power3.inOut' }, .65)
        .to(detailParts(), { y: 0, clipPath: 'inset(0 0 0% 0)', duration: .4, stagger: .05, ease: 'power3.out' }, .94);
      if (proxyImage) animation.to(proxyImage, { filter: 'grayscale(0)', duration: .85, ease: 'power2.out' }, .08);
      return;
    }
    animation = gsap.timeline({ onComplete: finish })
      .to($('.orbit-shell'), { clipPath: 'inset(0% 0 0 0)', duration: .8, ease: 'power3.inOut' }, .12)
      .to(state, { ...destination, duration: 1.05, ease: 'power3.inOut', onUpdate: render }, 0)
      .to(detailParts(), { y: 0, clipPath: 'inset(0 0 0% 0)', duration: .65, stagger: .07, ease: 'power3.out' }, .55);
    if (proxyImage) animation.to(proxyImage, { filter: 'grayscale(0)', duration: .7, ease: 'power2.inOut' }, .2);
  }
  function back() {
    if (busy || selected === null) return;
    busy = true; detail.inert = true;
    const source = activeImage(), origin = flatEndpoint(source);
    returnIndex = selected;
    // Keep the orbit where it paused, even after browsing other works in detail.
    angle = target = returnState?.angle ?? angle;
    resetHighlights(); measure(); caption();
    const finish = () => {
      clearTransition(); dialog.close();
    };
    if (motion.matches) { finish(); return; }
    dialog.classList.add('is-orbit-transitioning');
    dialog.dataset.scenePhase = 'to-overview';
    if (compactDetail.matches) {
      animation = gsap.timeline({ onComplete: finish })
        .to($('.orbit-shell'), { opacity: 0, duration: .18, ease: 'power2.in' });
      return;
    }
    const sameViewport = returnState?.width === innerWidth && returnState?.height === innerHeight;
    const destination = sameViewport && returnState.endpoints ? returnState.endpoints[returnIndex] : cardEndpoint(returnIndex);
    const flight = travelArtwork(source, origin, destination);
    const { proxy, state, render } = flight;
    const proxyImage = proxy.querySelector('img');
    gsap.set([media, cards[returnIndex]], { visibility: 'hidden' });
    const jump = rearJump(returnIndex, destination);
    if (jump) {
      const route = animateRearFlight(flight, destination, origin, jump, true);
      animation = gsap.timeline({ onComplete: finish })
        .to(route.target, route.vars, 0)
        .to(detailParts(), { y: -12, clipPath: 'inset(0 0 100% 0)', duration: .25, stagger: .02, ease: 'power2.in' }, 0)
        .to($('.orbit-shell'), { clipPath: 'inset(0 0 100% 0)', duration: .35, ease: 'power3.inOut' }, .25);
      if (proxyImage) animation.to(proxyImage, { filter: 'grayscale(1)', duration: .8, ease: 'power2.inOut' }, .3);
      return;
    }
    animation = gsap.timeline({ onComplete: finish })
      .to(detailParts(), { y: -18, clipPath: 'inset(0 0 100% 0)', duration: .35, stagger: .03, ease: 'power2.in' }, 0)
      .to($('.orbit-shell'), { clipPath: 'inset(0 0 100% 0)', duration: .85, ease: 'power3.inOut' }, .12)
      .to(state, { ...destination, duration: 1.05, ease: 'power3.inOut', onUpdate: render }, .05);
    if (proxyImage) animation.to(proxyImage, { filter: 'grayscale(1)', duration: .7, ease: 'power2.inOut' }, .25);
  }
  async function changeDetail(direction) {
    if (busy || selected === null) return;
    const nextIndex = wrap(selected + direction), ticket = ++operation;
    busy = true; dialog.dataset.scenePhase = 'loading-work';
    await prepareWork(nextIndex);
    if (ticket !== operation || !dialog.open) return;
    if (motion.matches) { updateDetail(nextIndex); clearTransition(); title.focus({ preventScroll: true }); return; }
    dialog.dataset.scenePhase = 'change-work';
    dialog.classList.add('is-orbit-transitioning');
    const copy = [$('.orbit-detail-copy'), $('.orbit-detail-context')];
    animation = gsap.timeline()
      .to(copy, { opacity: 0, x: direction > 0 ? 10 : -10, y: -8, duration: .16, stagger: .025, ease: 'power2.in' })
      .call(() => { if (ticket === operation && dialog.open) turnDetail(nextIndex, direction); });
  }
  function turnDetail(nextIndex, direction) {
    const scene = document.createElement('div');
    scene.className = 'orbit-travelling-art orbit-turntable';
    scene.setAttribute('aria-hidden', 'true'); scene.inert = true;
    dialog.append(scene); travellingArt = scene;
    const outgoing = turntableCard(activeImage(), scene, 'outgoing');
    const copy = [$('.orbit-detail-copy'), $('.orbit-detail-context')];
    gsap.set([media, ...copy], { visibility: 'hidden' });
    updateDetail(nextIndex);
    const incoming = turntableCard(activeImage(), scene, 'incoming');
    const centers = [outgoing, incoming].map(({ bounds }) => ({
      x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2,
    }));
    const sweep = Math.PI * 2 / 3;
    const halfDiagonal = Math.max(...[outgoing, incoming].map(({ bounds }) => Math.hypot(bounds.width, bounds.height) / 2));
    // Keep the compact wheel geometry, but let art sink behind a feathered
    // glass layer instead of cutting it off at a hard rectangular edge.
    const windowBottom = Math.min(innerHeight - 84,
      Math.max(...[outgoing, incoming].map(({ bounds }) => bounds.top + bounds.height)) + 16);
    const radius = Math.max(innerWidth * .32,
      (windowBottom - Math.min(...centers.map(center => center.y)) + halfDiagonal + 16) / (1 - Math.cos(sweep)));
    const wheel = document.createElement('div'); wheel.className = 'orbit-turntable-wheel';
    scene.append(wheel);
    // Keep real navigation crisp and clickable above the glass. A spacer
    // preserves the scroll geometry of mobile detail content during the turn.
    const controls = $('.orbit-detail-controls'), spacer = document.createElement('div');
    const controlStyle = getComputedStyle(controls);
    spacer.style.height = `${controls.offsetHeight}px`;
    spacer.style.marginTop = controlStyle.marginTop;
    if (controlStyle.position === 'absolute') spacer.style.display = 'none';
    controls.replaceWith(spacer); dialog.append(controls);
    controls.classList.add('orbit-turntable-controls');
    turntableControls = { controls, spacer };
    const sign = direction > 0 ? 1 : -1;
    [outgoing, incoming].forEach((item, index) => {
      const { card, bounds } = item;
      const sharp = document.createElement('span'); sharp.className = 'orbit-turntable-texture';
      sharp.append(...card.childNodes);
      const frost = sharp.cloneNode(true); frost.classList.add('is-frosted');
      card.append(sharp, frost); item.sharp = sharp; item.frost = frost;
      const theta = index ? -sign * sweep : 0;
      wheel.append(card);
      Object.assign(card.style, {
        left: `${-bounds.width / 2}px`, top: `${-bounds.height / 2}px`,
        transform: `rotate(${theta}rad) translateY(${-radius}px)`,
      });
    });
    scene.dataset.radius = String(radius);
    scene.dataset.angularGap = String(sweep);
    const state = { progress: 0 };
    const render = () => {
      const p = state.progress;
      scene.dataset.progress = p.toFixed(4);
      // Move a single rigid wheel: both works share one radius, one angular
      // speed and an invariant 120-degree spacing. Their orientation stays
      // tangent to the circle rather than tilting independently.
      // Recenter the whole assembly only to accommodate different detail
      // aspect ratios; no individual card leaves the circular track.
      const x = centers[0].x + (centers[1].x - centers[0].x) * p;
      const y = centers[0].y + (centers[1].y - centers[0].y) * p + radius;
      wheel.style.transform = `translate3d(${x}px,${y}px,0) rotate(${sign * sweep * p}rad)`;
      [outgoing, incoming].forEach(({ card, bounds, sharp, frost }, index) => {
        const theta = sign * sweep * (index ? p - 1 : p);
        const travel = Math.abs(theta) / sweep;
        const contact = ease((travel - .08) / .92);
        // The soft contact front lives in the artwork's coordinates, so it
        // travels AND rotates with the sheet. A broad curved feather avoids
        // the screen-horizontal seam of the previous inverse-rotated mask.
        const cx = 50 - Math.sign(theta) * 20 * contact;
        const cy = 45 - 25 * contact;
        const edge = 165 * (1 - contact), feather = 65;
        const shape = `ellipse ${bounds.width * .9}px ${bounds.height * 1.05}px at ${cx}% ${cy}%`;
        sharp.style.maskImage = `radial-gradient(${shape}, #000 ${edge - feather}%, transparent ${edge + feather}%)`;
        frost.style.maskImage = `radial-gradient(${shape}, transparent ${edge - feather}%, #000 ${edge + feather}%)`;
        card.style.opacity = String(1 - ease((travel - .68) / .32));
        card.dataset.glassOverlap = contact.toFixed(4);
      });
    };
    render();
    gsap.set(copy, { visibility: 'visible', opacity: 0, x: -sign * 12, y: 16 });
    const duration = compactDetail.matches ? .78 : 1;
    animation = gsap.timeline({ onComplete: () => { clearTransition(); title.focus({ preventScroll: true }); } })
      .to(state, { progress: 1, duration, ease: 'power2.inOut', onUpdate: render }, 0)
      .to(copy, { opacity: 1, x: 0, y: 0, duration: .28, stagger: .05, ease: 'power3.out' }, duration * .64);
  }
  $('.orbit-detail-prev').addEventListener('click', () => changeDetail(-1), options);
  $('.orbit-detail-next').addEventListener('click', () => changeDetail(1), options);
  $('.orbit-back').addEventListener('click', back, options);
  stage.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey || busy || !entered || selected !== null) return;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    if (!horizontal && !event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    returnHold = false;
    const delta = horizontal ? event.deltaX : event.deltaY;
    target -= Math.max(-180, Math.min(180, delta * (event.deltaMode === 1 ? 16 : 1))) / (geometry?.radius || 600);
    clearTimeout(wheelSettle);
    wheelSettle = setTimeout(() => { target = Math.round(target / step) * step; start(); }, 180);
    start();
  }, { ...options, passive: false });
  stage.addEventListener('pointerdown', event => {
    if (event.button !== 0 || busy || !entered) return;
    clearTimeout(wheelSettle);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, angle, moved: false,
      sensitivity: event.pointerType === 'touch' ? 1.6 : 1 };
  }, options);
  stage.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) { drag = null; return; }
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    velocity = 0;
    drag.moved = true; stage.setPointerCapture(event.pointerId);
    returnHold = false;
    stage.classList.add('is-dragging'); resetHighlights();
    target = drag.angle + dx * drag.sensitivity / (geometry?.radius || 600);
    caption(); start();
  }, options);
  const endDrag = event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.moved) {
      suppressClick = performance.now() + 350;
      target = Math.round(target / step) * step;
    }
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    drag = null; stage.classList.remove('is-dragging'); caption(); start();
  };
  stage.addEventListener('pointerup', endDrag, options);
  stage.addEventListener('pointercancel', endDrag, options);
  window.addEventListener('pointerup', endDrag, options);
  const onKey = event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (busy) return;
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    if (selected !== null) {
      changeDetail(event.key === 'Home' ? -selected : event.key === 'End' ? count - 1 - selected : direction);
      return;
    }
    const activeIndex = cards.indexOf(document.activeElement);
    const currentIndex = focused ?? (activeIndex >= 0 ? activeIndex : centerIndex);
    const i = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : wrap(currentIndex + direction);
    returnHold = false;
    cards[i].focus({ preventScroll: true }); focused = i;
    target = -i * step;
    target += Math.round((angle - target) / (2 * Math.PI)) * 2 * Math.PI;
    caption(); start();
  };
  dialog.addEventListener('keydown', onKey, options);
  section.addEventListener('keydown', onKey, options);
  function close() {
    if (!dialog.open) return;
    if (busy) { ++operation; returnIndex = selected ?? returnIndex; animation?.kill(); clearTransition(); dialog.close(); }
    else back();
  }
  $('.orbit-close').addEventListener('click', close, options);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }, options);
  dialog.addEventListener('close', () => {
    restoreCursor();
    ++operation;
    clearTimeout(wheelSettle);
    animation?.kill(); clearTransition();
    document.body.style.overflow = previousOverflow;
    const viewport = media.querySelector('.orbit-image-viewport');
    if (selected !== null) detailStates.set(selected, { slide: viewport ? Math.round(viewport.scrollLeft / (viewport.clientWidth || 1)) : 0, scrollTop: detail.scrollTop });
    detail.hidden = true; detail.inert = true;
    resetHighlights();
    angle = target = returnState?.angle ?? angle;
    returnState = null; returnHold = true;
    busy = false; drag = null; selected = null; velocity = 0; lastTime = 0;
    measure(); paint();
    if (resumeScroll) getLenis()?.start();
    restoringFocus = true;
    cards[returnIndex].focus({ preventScroll: true });
    restoringFocus = false;
    caption(); start();
  }, options);
  // A return lands on the exact frozen orbit. Resume only when the visitor
  // deliberately leaves the gallery or navigates it again.
  stage.addEventListener('pointerleave', () => { returnHold = false; caption(); start(); }, options);
  stage.addEventListener('pointermove', () => {
    if (returnHold && !busy && selected === null) { returnHold = false; caption(); start(); }
  }, options);

  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };
  function beginEntrance(render = true) {
    if (!geometry || !entryGeometry) return;
    const { sectionHeight, readingHeight } = entryGeometry;
    const bounds = { top: entryGeometry.top - scrollY, bottom: entryGeometry.top + sectionHeight - scrollY };
    // Reserve a longer descent after absorption, shared with about-reading.
    const { descent, orbitHold } = getWorkHandoffDistances();
    const span = innerHeight * descent;
    const holdDistance = innerHeight * orbitHold;
    // Allow both mobile passages to pass through the viewport before pinning.
    // Centering the portrait early strands the lower paragraph below the fold.
    const readingPinTop = Math.min(0, innerHeight - readingHeight);
    // A large phone portrait needs its own framing once the copy dissolves.
    // Keep both paragraphs reachable first, then centre the actual photo for
    // the card departure without resizing it or changing the release boundary.
    const portraitPinTop = about.classList.contains('has-mobile-copy')
      ? Math.min(0, (innerHeight + 64) / 2 - entryGeometry.localPhotoCenterY)
      : readingPinTop;
    const pinTop = readingPinTop + (portraitPinTop - readingPinTop)
      * ease(Number(about.dataset.absorbProgress) || 0);
    const endTop = Math.max(innerHeight, readingHeight + readingPinTop);
    // Desktop has a longer departure, then a settled orbit that keeps rotating
    // for two more viewport lengths before Work returns to document flow.
    const raw = clamp((endTop + span + holdDistance - bounds.top) / span);
    // Organic scrolling waits for the ink. A direct Work navigation seeks
    // past About and must land on usable cards immediately.
    const absorptionComplete = about.dataset.absorbComplete === 'true' || entryGeometry.aboutBottom <= scrollY;
    const progress = motion.matches ? 1 : !absorptionComplete || raw < .0005 ? 0 : raw;
    emergence = progress;
    // First descend out of the back of the frame; then follow the works down
    // as the portrait recedes. Every seek uses the same world-space path.
    // Follow the first departing cards on desktop. Waiting until 42% leaves
    // their flight below the viewport behind the full-height portrait frame.
    const cameraProgress = desktopHandoff.matches ? progress / .75 : (progress - .22) / .75;
    const cameraY = motion.matches ? 0 : innerHeight * 1.25 * ease(cameraProgress);
    portraitLift = cameraY;
    readingStage.style.setProperty('--gallery-stage-top', `${pinTop}px`);
    readingStage.style.translate = `0 ${-cameraY}px`;
    readingStage.style.willChange = progress > 0 && progress < 1 ? 'translate' : '';
    document.querySelector('#about').style.setProperty('--gallery-copy-opacity', '1');
    const travelling = progress > 0 && bounds.top > 0 && !motion.matches;
    sceneVisible = bounds.bottom > 0 && (travelling || bounds.top < innerHeight);
    overview.classList.toggle('is-emerging', travelling);
    overview.style.height = travelling ? `${sectionHeight}px` : '';
    // Stagger departures across the first 45% of the handoff. The remaining
    // flight time is per card, so the final work still lands at exactly 100%.
    const ringProgress = ease(progress);
    originX = entryGeometry.photoCenterX - innerWidth / 2;
    originY = entryGeometry.localPhotoCenterY + pinTop - geometry.height / 2;
    landingY = motion.matches ? 0 : innerHeight * (desktopHandoff.matches ? .18 : .34) * Math.sin(Math.PI * ringProgress);
    // The ring is already settled while its viewport plane is still fixed.
    // Enable input here instead of waiting for the Work section to catch up.
    entered = progress >= 1 && sceneVisible;
    overview.classList.toggle('is-interactive', entered);
    overview.inert = !entered || selected !== null;
    section.dataset.entryPhase = entered ? 'idle' : travelling ? 'emerging' : 'waiting';
    section.dataset.entryProgress = progress.toFixed(4);
    caption();
    if (render) { paint(); start(); }
  }
  function scheduleEntrance() {
    entranceDirty = true;
    if (!frame) frame = requestAnimationFrame(tick);
  }
  section.dataset.entryPhase = 'waiting';
  overview.inert = true;
  const visible = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (entrance) inView ? entrance.resume() : entrance.pause();
    if (inView) { measure(); beginEntrance(); start(); }
    else if (!sceneVisible) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; velocity = 0; }
  }, { threshold: [0, .2, .5, .8, 1] });
  visible.observe(section);
  let lastAbsorbProgress = about.dataset.absorbProgress;
  const navigation = new MutationObserver(records => {
    const absorptionChanged = about.dataset.absorbProgress !== lastAbsorbProgress;
    lastAbsorbProgress = about.dataset.absorbProgress;
    if (records.some(record => record.target !== about)
      || (absorptionChanged && about.classList.contains('has-mobile-copy'))) scheduleEntrance();
  });
  navigation.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  navigation.observe(about, { attributes: true, attributeFilter: ['data-absorb-progress'] });
  window.addEventListener('scroll', scheduleEntrance, { ...options, passive: true });
  window.addEventListener('scroll', () => {
    const delta = window.scrollY - previousScrollY;
    previousScrollY = window.scrollY;
    if (!inView || !entered || busy || selected !== null || motion.matches ||
      document.documentElement.classList.contains('is-colonnade-transitioning')) return;
    if (Math.abs(delta) > .1) {
      windDirection = Math.sign(delta);
      windImpulse = Math.min(1, Math.abs(windImpulse) + Math.abs(delta) * .012);
      start();
    }
  }, { ...options, passive: true });
  window.addEventListener('portfolio:restore', measure, options);
  window.addEventListener('portfolio:ready', measure, options);
  window.addEventListener('portfolio:reveal', measure, options);
  ScrollTrigger.addEventListener('refresh', measure);
  const resize = new ResizeObserver(measure);
  [stage, readingStage, about].forEach(element => resize.observe(element));
  window.addEventListener('resize', () => {
    // Finish a viewport-dependent aperture if the viewport changes mid-flight.
    if (busy) animation?.progress(1);
  }, options);
  const mediaChange = () => {
    artColors.forEach((effect, index) => effect?.setActive(hovered === index || focused === index, true));
    if (motion.matches) {
      target = angle; velocity = 0; animation?.progress(1); entrance?.progress(1);
      cards.forEach(card => { gsap.killTweensOf(card.firstElementChild); gsap.set(card.firstElementChild, { clearProps: 'filter,transform' }); });
    }
    beginEntrance(); caption(); start();
  };
  motion.addEventListener('change', mediaChange, options); mediaChange();
  document.addEventListener('visibilitychange', () => { lastTime = 0; start(); }, options);
  if (import.meta.hot) import.meta.hot.dispose(() => {
    restoreCursor();
    clearTimeout(wheelSettle);
    animation?.kill(); entrance?.kill();
    removeTravel(); visible.disconnect(); navigation.disconnect();
    gsap.killTweensOf([dialog, overview, detail, $('.orbit-shell'), $('.orbit-detail-layout')]);
    if (dialog.open) {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (resumeScroll) getLenis()?.start();
    }
    gsap.set(dialog, { clearProps: 'clipPath,willChange' });
    abort.abort(); resize.disconnect(); cancelAnimationFrame(frame);
    ScrollTrigger.removeEventListener('refresh', measure);
    overview.classList.remove('is-emerging');
    overview.classList.remove('is-interactive');
    overview.style.removeProperty('height');
    overview.style.removeProperty('clip-path');
    document.querySelector('#about')?.style.removeProperty('--gallery-copy-opacity');
    document.querySelector('.about-reading-stage')?.style.removeProperty('--gallery-stage-top');
    document.querySelector('.about-reading-stage')?.style.removeProperty('translate');
    document.querySelector('.about-reading-stage')?.style.removeProperty('will-change');
    artColors.forEach(effect => effect?.dispose());
    cards.forEach(card => card.remove());
  });
}



