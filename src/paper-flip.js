import gsap from 'gsap';

// A flexible sheet built from adjoining two-sided strips. Each strip follows
// the tangent of the same curve, so the printed faces bend with the paper.
export function initPaperFlip(card) {
  const front = card.querySelector('.footer-card-front');
  const back = card.querySelector('.footer-card-back');
  const shadow = card.querySelector('.footer-paper-shadow');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const sheet = document.createElement('span');
  sheet.className = 'paper-sheet';
  sheet.setAttribute('aria-hidden', 'true');
  const count = 32;
  const strips = Array.from({ length: count }, (_, index) => {
    const strip = document.createElement('span');
    strip.className = 'paper-strip';
    for (const [source, side] of [[front, 'front'], [back, 'back']]) {
      const face = document.createElement('span');
      face.className = `paper-strip-side paper-strip-${side}`;
      const print = source.cloneNode(true);
      // Each bending face needs its own mask: the flat face is hidden in 3D.
      const masks = print.querySelectorAll('.footer-card-signature mask');
      masks.forEach(mask => {
        const oldId = mask.id;
        mask.id = `${oldId}-strip-${index}`;
        print.querySelectorAll(`[mask="url(#${oldId})"]`).forEach(el => {
          el.setAttribute('mask', `url(#${mask.id})`);
        });
      });
      print.removeAttribute('aria-hidden');
      print.classList.add('paper-print');
      face.append(print);
      strip.append(face);
    }
    sheet.append(strip);
    return strip;
  });
  card.append(sheet);
  card.classList.add('has-flexible-paper');
  let isFlipped = false;
  let activeDirection = 'forward'; // 'forward' = CCW to note, 'backward' = CW to logo
  const animState = { t: 0 };
  let width = 0;
  let height = 0;
  let tween;

  function render() {
    const t = animState.t;
    const lift = Math.sin(Math.PI * t);
    // The free edge leads the middle; curvature disappears softly at rest.
    const bend = lift * (0.95 + 0.18 * Math.sin(t * Math.PI * 2));
    const step = width / count;
    const points = [{ x: 0, z: 0 }];
    const angles = [];

    const isForward = activeDirection === 'forward';

    for (let i = 0; i < count; i++) {
      // Click 1 (forward): Left edge (i=0) lifts and curls up
      // Click 2 (backward): Right edge (i=count-1) lifts and curls up, reversing naturally
      const u = isForward
        ? (i + 0.5) / count              // Klik 1: Angkat sisi kanan kertas
        : (count - 1 - i + 0.5) / count; // Klik 2: Angkat sisi kiri (karena posisi kertas sedang terbalik)

      const angle = isForward
        ? bend * (u * 2 - 0.72)
        : -bend * (u * 2 - 0.72);

      angles.push(angle);
      points.push({
        x: points[i].x + Math.cos(angle) * step,
        z: points[i].z - Math.sin(angle) * step
      });
    }

    const center = points[count].x / 2;

    // Click 1: 0deg -> -180deg (counter-clockwise)
    // Click 2: -180deg -> 0deg (clockwise, "sebaliknya")
    const rotY = isForward ? 180 * t : 180 + (180 * t);

    sheet.style.transform = `translate3d(0,${-lift * height * 0.09}px,${lift * width * 0.17}px) rotateX(${lift * -8}deg) rotateY(${rotY}deg)`;
    strips.forEach((strip, i) => {
      const angle = angles[i];
      strip.style.transform = `translate3d(${points[i].x - center + width / 2}px,0,${points[i].z}px) rotateY(${angle * 180 / Math.PI}deg)`;
      // Keep filters out of the 3D surface; a face overlay provides lighting
      // without flattening layers or producing separate filter-edge seams.
      const shade = lift * (0.04 + Math.abs(Math.sin(angle)) * 0.09);
      strip.style.setProperty('--paper-shade', shade.toFixed(3));
    });

    const shadowX = 12 + (lift * 28);
    shadow.style.opacity = String(0.25 - lift * 0.1);
    shadow.style.transform = `translate(${shadowX}px,${18 + lift * 30}px) scale(${1 - lift * 0.22},${1 - lift * 0.08})`;
    shadow.style.filter = `blur(${22 + lift * 20}px)`;
  }

  function resize() {
    width = card.clientWidth;
    height = card.clientHeight;
    if (!width || !height) return;
    const step = width / count;
    strips.forEach((strip, i) => {
      strip.style.width = `${step + 1}px`;
      strip.querySelectorAll('.paper-print').forEach((print, side) => {
        print.style.width = `${width}px`;
        print.style.height = `${height}px`;
        print.style.left = `${-(side ? width - (i + 1) * step : i * step)}px`;
      });
    });
    render();
  }

  function finish() {
    card.setAttribute('aria-pressed', String(isFlipped));
    front.setAttribute('aria-hidden', String(isFlipped));
    back.setAttribute('aria-hidden', String(!isFlipped));
    card.classList.remove('is-paper-moving');
    shadow.style.removeProperty('opacity');
    shadow.style.removeProperty('transform');
    shadow.style.removeProperty('filter');
    card.dispatchEvent(new CustomEvent('paper:flipend', { detail: { flipped: isFlipped } }));
  }

  card.addEventListener('click', () => {
    if (tween?.isActive()) return;
    card.dispatchEvent(new CustomEvent('paper:flipstart', { detail: { flipped: !isFlipped } }));
    const ink = [...front.querySelectorAll('.sig-mask-stroke')];
    strips.forEach(strip => {
      strip.querySelectorAll('.sig-mask-stroke').forEach((stroke, index) => {
        stroke.setAttribute('style', ink[index].getAttribute('style') || '');
      });
    });
    isFlipped = !isFlipped;
    activeDirection = isFlipped ? 'forward' : 'backward';

    if (reduceMotion.matches) {
      animState.t = 1;
      render();
      finish();
      return;
    }

    card.classList.add('is-paper-moving');
    animState.t = 0;
    render();

    tween = gsap.to(animState, {
      t: 1,
      duration: 1.65,
      ease: 'sine.inOut',
      onUpdate: render,
      onComplete: finish
    });
  });

  reduceMotion.addEventListener('change', () => {
    if (!reduceMotion.matches) return;
    tween?.kill();
    animState.t = 1;
    render();
    finish();
  });
  new ResizeObserver(resize).observe(card);
  resize();
}
