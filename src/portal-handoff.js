import gsap from 'gsap';

// Keep the real last frame intact while the live page is prepared underneath.
// An irregular ink edge then travels upward, revealing the page from below.
export function createPortalHandoff(source, { reducedMotion = false } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'portal-handoff';
  overlay.dataset.transition = 'ink-rise';
  overlay.setAttribute('aria-hidden', 'true');

  const canvas = document.createElement('canvas');
  overlay.append(canvas);
  document.body.append(overlay);

  const context = canvas.getContext('2d');
  const snapshot = document.createElement('canvas');
  const snapshotContext = snapshot.getContext('2d');
  const state = { progress: 0 };
  const capturedWidth = window.innerWidth;
  const capturedHeight = window.innerHeight;
  const pixelRatio = Math.min(
    window.devicePixelRatio || 1,
    1.5,
    Math.sqrt(2200000 / Math.max(1, capturedWidth * capturedHeight))
  );
  let width = capturedWidth;
  let height = capturedHeight;
  let animation;
  let disposed = false;
  let resolveReveal;
  const completed = new Promise(resolve => { resolveReveal = resolve; });

  const hash = (index, seed) => {
    const value = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const noise = (x, scale, seed) => {
    const position = x / scale;
    const index = Math.floor(position);
    const fraction = position - index;
    const eased = fraction * fraction * (3 - 2 * fraction);
    return (hash(index, seed) * (1 - eased) + hash(index + 1, seed) * eased) * 2 - 1;
  };

  function sizeBuffer(target, targetContext, targetWidth, targetHeight) {
    target.width = Math.max(1, Math.round(targetWidth * pixelRatio));
    target.height = Math.max(1, Math.round(targetHeight * pixelRatio));
    targetContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  sizeBuffer(snapshot, snapshotContext, capturedWidth, capturedHeight);
  snapshotContext.fillStyle = '#ffffff';
  snapshotContext.fillRect(0, 0, capturedWidth, capturedHeight);

  if (source?.width && source?.height) {
    // getBoundingClientRect includes the final intro zoom and overscan. Drawing
    // this exact rectangle prevents a scale snap when the source is removed.
    const sourceRect = source.getBoundingClientRect();
    snapshotContext.drawImage(
      source,
      sourceRect.left,
      sourceRect.top,
      sourceRect.width,
      sourceRect.height
    );
  }

  const preventInput = event => event.preventDefault();
  overlay.addEventListener('wheel', preventInput, { passive: false });
  overlay.addEventListener('touchmove', preventInput, { passive: false });

  function draw() {
    if (disposed || !context) return;

    const progress = Math.max(0, Math.min(1, state.progress));
    overlay.dataset.progress = progress.toFixed(3);

    // If fully completed, ensure canvas is completely cleared and hidden
    if (progress >= 1) {
      context.clearRect(0, 0, width, height);
      overlay.style.opacity = '0';
      return;
    }

    const snapshotScale = 1 + progress * 0.025;
    const drawWidth = width * snapshotScale;
    const drawHeight = height * snapshotScale;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, width, height);
    context.drawImage(
      snapshot,
      -(drawWidth - width) * 0.5,
      -(drawHeight - height) * 0.5,
      drawWidth,
      drawHeight
    );

    if (progress <= 0 || reducedMotion) {
      overlay.style.opacity = '1';
      return;
    }

    // The actual final intro frame is nearly white. Let ink gather over that
    // same frame before the tear passes; otherwise white-on-paper is invisible.
    context.globalAlpha = Math.min(1, progress / 0.18);
    context.fillStyle = '#0d0d0f';
    context.fillRect(0, 0, width, height);
    context.globalAlpha = 1;

    const amplitude = Math.min(150, height * 0.17);
    const overscan = amplitude + 36;
    const baseline = height + overscan - (height + overscan * 2) * progress;
    const edgeAt = x => baseline + amplitude * (
      0.56 * noise(x, width * 0.38, 3) +
      0.25 * noise(x, width * 0.12, 8) +
      0.13 * noise(x, 67, 15) +
      0.06 * noise(x, 17, 21)
    );
    const clearBelow = (offset, alpha) => {
      context.globalAlpha = alpha;
      context.beginPath();
      context.moveTo(-8, height + 40);
      for (let x = -8; x <= width + 8; x += 7) {
        context.lineTo(x, edgeAt(x) + offset);
      }
      context.lineTo(width + 8, edgeAt(width + 8) + offset);
      context.lineTo(width + 8, height + 40);
      context.closePath();
      context.fill();
    };

    // The lower paper surface emerges first; a few translucent passes make
    // the torn, uneven boundary feel inked rather than digitally clipped.
    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = '#000';
    clearBelow(-12, 0.16);
    clearBelow(-7, 0.22);
    clearBelow(-2, 0.34);
    clearBelow(3, 1);

    // Small detached flecks break the edge without introducing another image.
    for (let index = 0; index < 26; index += 1) {
      const x = hash(index, 37) * width;
      const y = edgeAt(x) - 8 - hash(index, 41) * 30;
      if (y < -15 || y > height + 15) continue;
      context.beginPath();
      context.ellipse(x, y, 1.5 + hash(index, 43) * 5, 1 + hash(index, 47) * 3, hash(index, 51), 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    overlay.style.opacity = '1';
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    sizeBuffer(canvas, context, width, height);
    draw();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    animation?.kill();
    window.removeEventListener('resize', resize);
    overlay.remove();
    snapshot.width = snapshot.height = canvas.width = canvas.height = 1;
    resolveReveal?.();
  }

  resize();
  window.addEventListener('resize', resize);
  if (import.meta.hot) import.meta.hot.dispose(dispose);

  return {
    reveal() {
      if (animation || disposed) return completed;
      animation = reducedMotion
        ? gsap.to(overlay, { opacity: 0, duration: 0.25, onComplete: dispose })
        : gsap.to(state, {
            progress: 1,
            duration: 1.8,
            ease: 'power2.inOut',
            onUpdate: draw,
            onComplete: dispose
          });
      return completed;
    },
    dispose
  };
}
