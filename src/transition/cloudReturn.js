import './cloudReturn.css';

const WHITE = '#fff';
const MAX_PIXELS = 1800000;
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smooth = (low, high, value) => {
  const p = clamp((value - low) / (high - low));
  return p * p * (3 - 2 * p);
};
const hash = (x, y, seed) => {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 73.17) * 43758.5453;
  return value - Math.floor(value);
};
const noise = (x, y, seed) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(0, 1, x - ix);
  const fy = smooth(0, 1, y - iy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
};

// Each cached strip has an opaque white upper edge and a transparent lower edge.
// Unequal low-frequency contours avoid repeating scallops or individual circles.
function makeCloudBand(width, height, seed) {
  const texture = document.createElement('canvas');
  texture.width = width;
  texture.height = height;
  const context = texture.getContext('2d', { alpha: true });
  if (!context) return null;
  const image = context.createImageData(width, height);
  const profiles = new Float32Array(width);
  for (let x = 0; x < width; x += 1) {
    const u = x / (width - 1);
    profiles[x] = 0.52
      + (noise(u * 2.4, 0.6, seed) - 0.5) * 0.33
      + (noise(u * 6.7, 1.2, seed + 1) - 0.5) * 0.16
      + (noise(u * 15.2, 0.3, seed + 2) - 0.5) * 0.045;
  }
  for (let y = 0; y < height; y += 1) {
    const v = y / (height - 1);
    for (let x = 0; x < width; x += 1) {
      const u = x / (width - 1);
      const volume = noise(u * 5.1, v * 3.7, seed + 3);
      const fine = noise(u * 13.3, v * 7.1, seed + 4);
      const boundary = profiles[x] + (volume - 0.5) * 0.055;
      const density = smooth(-0.115, 0.115, boundary - v);
      const edgeShade = smooth(0.13, 0.42, v) * smooth(-0.1, 0.22, boundary - v);
      const shade = edgeShade * (3 + volume * 12 + fine * 2.5);
      const index = (y * width + x) * 4;
      image.data[index] = 255 - shade;
      image.data[index + 1] = 255 - shade * 0.78;
      image.data[index + 2] = 255 - shade * 0.42;
      image.data[index + 3] = Math.round(density * 255);
    }
  }
  context.putImageData(image, 0, 0);
  return texture;
}

function makeCloudPassage(width, height, seed) {
  const texture = document.createElement('canvas');
  texture.width = width;
  texture.height = height;
  const context = texture.getContext('2d', { alpha: true });
  if (!context) return null;
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    const v = y / (height - 1);
    const endFeather = smooth(0, 0.18, v) * (1 - smooth(0.79, 1, v));
    for (let x = 0; x < width; x += 1) {
      const u = x / (width - 1);
      const distance = Math.abs(u - 0.5) * 2;
      const depth = 0.16 + smooth(0.14, 0.88, distance) * 0.84;
      // Clouds remain broad in x but stretched in the direction of travel.
      const large = noise(u * 5.1, v * 2.4, seed);
      const detail = noise(u * 12.7, v * 4.1, seed + 1);
      const density = smooth(0.31, 0.73, large * 0.78 + detail * 0.22);
      const shade = (1 - large) * 11;
      const index = (y * width + x) * 4;
      image.data[index] = 255 - shade;
      image.data[index + 1] = 255 - shade * 0.65;
      image.data[index + 2] = 255 - shade * 0.15;
      image.data[index + 3] = Math.round(density * endFeather * depth * 185);
    }
  }
  context.putImageData(image, 0, 0);
  return texture;
}

export function createCloudReturn(overlay) {
  const canvas = document.createElement('canvas');
  canvas.className = 'cloud-return-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gradeLayer = document.createElement('div');
  gradeLayer.className = 'cloud-return-grade';
  gradeLayer.setAttribute('aria-hidden', 'true');
  const coolGrade = document.createElement('i');
  coolGrade.className = 'cloud-return-grade-cool';
  const warmGrade = document.createElement('i');
  warmGrade.className = 'cloud-return-grade-warm';
  gradeLayer.append(coolGrade, warmGrade);
  overlay.append(canvas, gradeLayer);
  const context = canvas.getContext('2d', { alpha: true, desynchronized: true });
  let width = 1;
  let height = 1;
  let ratio = 1;
  let textures = [];
  let passages = [];
  let textureSize = '';
  let phase = 'idle';
  let progress = 0;
  let gradeIntensity = 0;
  let destroyed = false;

  const setOpaque = (value) => {
    overlay.dataset.cloudOpaque = value ? 'true' : 'false';
  };
  const paintGrade = () => {
    if (destroyed) return;
    const opaque = overlay.dataset.cloudOpaque === 'true';
    const warmth = phase === 'reveal' ? 1 : smooth(0.4, 0.9, progress);
    const whiteGate = phase === 'idle' || opaque ? 0 : phase === 'cover' ? 1 - smooth(0.86, 1, progress) : 1;
    const strength = gradeIntensity * whiteGate;
    gradeLayer.style.opacity = String(strength * 0.46);
    coolGrade.style.opacity = String(1 - warmth);
    warmGrade.style.opacity = String(warmth);
    // Color transforms only: no full-screen blur, source mutation or mask.
    // The opacity envelope removes this layer completely at opaque white.
    gradeLayer.style.backdropFilter = strength > 0
      ? `saturate(${1 - strength * 0.1}) sepia(${strength * warmth * 0.12}) hue-rotate(${strength * (1 - warmth) * 7}deg)`
      : 'none';
    overlay.dataset.cloudGrade = gradeIntensity.toFixed(4);
    overlay.dataset.cloudGradeVisible = strength.toFixed(4);
    overlay.dataset.cloudGradeWarmth = (phase === 'idle' ? 0 : warmth).toFixed(4);
  };
  const drawBand = (texture, edge, alpha, drift = 0) => {
    const bandHeight = Math.max(height * 0.76, width * 0.32);
    const bleed = width * 0.08;
    const top = edge - bandHeight * 0.52;
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = WHITE;
    if (top > -bandHeight) context.fillRect(-bleed, -bandHeight, width + bleed * 2, top + bandHeight + 1);
    context.drawImage(texture, -bleed + drift, top, width + bleed * 2, bandHeight);
    context.restore();
  };

  const drawPassage = (texture, layer, travel, speed) => {
    const tileHeight = height * (1.18 + layer * 0.18);
    const parallax = [0.48, 0.83, 1.36][layer];
    const offset = (travel * parallax) % tileHeight;
    const stretch = 1 + speed * (0.11 + layer * 0.075);
    const drawHeight = tileHeight * stretch;
    const bleed = width * (0.08 + layer * 0.045);
    const alpha = [0.28, 0.38, 0.48][layer];
    const envelope = smooth(0, 0.1, progress) * (1 - smooth(0.72, 0.96, progress));
    const tail = height * speed * (0.025 + layer * 0.018);
    context.save();
    for (let copy = -2; copy <= 1; copy += 1) {
      const y = offset + copy * tileHeight - tileHeight * 0.2;
      // A short translucent tail gives directional softness without per-frame filters.
      context.globalAlpha = alpha * envelope * 0.25;
      context.drawImage(texture, -bleed, y - tail, width + bleed * 2, drawHeight);
      context.globalAlpha = alpha * envelope * 0.75;
      context.drawImage(texture, -bleed, y, width + bleed * 2, drawHeight);
    }
    context.restore();
  };

  const paint = () => {
    if (destroyed) return;
    const opaque = (phase === 'cover' && progress === 1)
      || (phase === 'reveal' && progress === 0);
    setOpaque(opaque);
    overlay.dataset.cloudPhase = phase;
    overlay.dataset.cloudProgress = progress.toFixed(4);
    overlay.dataset.cloudMotion = 'upward-flight';
    overlay.dataset.cloudTravelVh = (phase === 'idle' ? 0 : phase === 'cover' ? progress * 480 : 480).toFixed(2);
    overlay.dataset.cloudReveal = 'geometric-clear';
    paintGrade();
    if (!context || textures.length !== 3 || passages.length !== 3) {
      canvas.style.background = WHITE;
      canvas.style.opacity = String(opaque ? 1 : phase === 'cover' ? smooth(0.25, 1, progress) : 0);
      return;
    }
    canvas.style.opacity = '';
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (phase === 'idle') return;
    if (opaque) {
      context.fillStyle = WHITE;
      context.fillRect(0, 0, width, height);
      return;
    }
    // The hero owns its intact geometric growth. The cloud canvas clears on
    // the first reveal frame rather than fading over or slicing the monogram.
    if (phase === 'reveal' || progress === 0) return;
    const travel = height * progress * 4.8;
    const speed = smooth(0.08, 0.94, progress);
    passages.forEach((texture, layer) => drawPassage(texture, layer, travel, speed));
    const bandHeight = Math.max(height * 0.76, width * 0.32);
    // Starting and ending outside the viewport also works on very wide screens.
    const margin = Math.max(height * 0.48, bandHeight * 0.65);
    const coverage = smooth(0.24, 1, progress);
    const edge = -margin + coverage * (height + margin * 2);
    drawBand(textures[0], edge + height * 0.21, 0.32, width * 0.018 * (progress - 0.5));
    drawBand(textures[1], edge + height * 0.075, 0.7, -width * 0.012 * (progress - 0.5));
    drawBand(textures[2], edge - height * 0.055, 1);
  };

  const resize = () => {
    if (destroyed) return;
    const bounds = overlay.getBoundingClientRect();
    width = Math.max(1, Math.ceil(bounds.width || window.innerWidth));
    height = Math.max(1, Math.ceil(bounds.height || window.innerHeight));
    ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(MAX_PIXELS / (width * height)));
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    if (context) {
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      // The soft contours are intentionally cached below display resolution.
      const tw = Math.round(clamp(width * 0.6, 420, 860));
      const th = Math.round(clamp(height * 0.38, 230, 380));
      const size = `${tw}:${th}`;
      if (textureSize !== size) {
        [...textures, ...passages].forEach((texture) => { texture.width = 0; texture.height = 0; });
        textures = [17, 53, 89].map((seed) => makeCloudBand(tw, th, seed)).filter(Boolean);
        passages = [23, 71, 113].map((seed) => makeCloudPassage(Math.round(tw * 0.65), th, seed)).filter(Boolean);
        textureSize = size;
      }
    }
    overlay.dataset.cloudRenderer = context && textures.length === 3 && passages.length === 3 ? 'canvas-2d' : 'fallback';
    paint();
  };

  const update = (nextPhase, value) => {
    phase = nextPhase;
    progress = clamp(Number.isFinite(value) ? value : 0);
    paint();
  };

  window.addEventListener('resize', resize, { passive: true });
  resize();
  return {
    get available() { return Boolean(context && textures.length === 3 && passages.length === 3); },
    start() {
      if (destroyed) return;
      phase = 'cover';
      progress = 0;
      gradeIntensity = 0;
      resize();
    },
    cover(value) { update('cover', value); },
    reveal(value) { update('reveal', value); },
    grade(value) {
      gradeIntensity = clamp(Number.isFinite(value) ? value : 0);
      paintGrade();
    },
    reset() {
      phase = 'idle';
      progress = 0;
      gradeIntensity = 0;
      paint();
    },
    destroy() {
      destroyed = true;
      window.removeEventListener('resize', resize);
      canvas.remove();
      gradeLayer.remove();
      [...textures, ...passages].forEach((texture) => { texture.width = 0; texture.height = 0; });
      textures = [];
      passages = [];
      delete overlay.dataset.cloudOpaque;
      delete overlay.dataset.cloudPhase;
      delete overlay.dataset.cloudProgress;
      delete overlay.dataset.cloudRenderer;
      delete overlay.dataset.cloudMotion;
      delete overlay.dataset.cloudTravelVh;
      delete overlay.dataset.cloudReveal;
      delete overlay.dataset.cloudGrade;
      delete overlay.dataset.cloudGradeVisible;
      delete overlay.dataset.cloudGradeWarmth;
    },
  };
}
