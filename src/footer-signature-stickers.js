import * as THREE from 'three';
import {runtimeQuality} from './runtime-quality';

// Positions use the original signature image's normalized coordinates.
export const signatureStickers = [
  { file: 'BIOLOGY.png', name: 'Biology', x: .115, y: .55, width: .08, angle: 31 },
  { file: 'MPAA-(6).png', name: 'MPAA', x: .27, y: .32, width: .12, angle: -3 },
  { file: 'DOPEMICKY-(3).png', name: 'Dope Micky', x: .457, y: .615, width: .086, angle: -22 },
  { file: 'SMILE.png', name: 'Smile', x: .662, y: .55, width: .052, angle: 4 },
  { file: 'THEKNIGHTS.png', name: 'The Knights', x: .838, y: .285, width: .085, angle: -8 },
  { file: 'HAPPYPIG.png', name: 'Happy Pig', x: .9, y: .955, width: .078, angle: -8 },
];

// Keep the part of a sticker outside the silhouette: it is needed on the
// folded side, including beyond the original image's bottom/right bounds.
const surfaceWidth = 10;
const padding = .8;

export function applySignatureStickerUVs(geometry, aspect, depth, bevelSize, bevelThickness) {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = new Float32Array(position.count * 3);
  const edgeUV = new Float32Array(position.count * 3);
  const width = surfaceWidth + padding * 2;
  const height = surfaceWidth / aspect + padding * 2;
  // Integrate the bevel's elliptical arc, so a millimetre of printed artwork
  // stays a millimetre as it bends from the front over the bevel and wall.
  const arc = [0], steps = 64;
  for (let i = 1; i <= steps; i++) {
    const angle = (i - .5) / steps * Math.PI / 2;
    arc[i] = arc[i - 1] + Math.hypot(bevelSize * Math.cos(angle), bevelThickness * Math.sin(angle)) * Math.PI / (2 * steps);
  }
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const nx = normal.getX(i), ny = normal.getY(i);
    const length = Math.hypot(nx, ny);
    let unfold = 0, horizontal = 0;
    if (length > .001) {
      const angle = Math.acos(THREE.MathUtils.clamp((z - depth / 2) / bevelThickness, 0, 1));
      const sample = angle / (Math.PI / 2) * steps;
      const index = Math.min(steps - 1, Math.floor(sample));
      const travelled = THREE.MathUtils.lerp(arc[index], arc[index + 1], sample - index);
      // Subtract the bevel's existing horizontal travel before unfolding it.
      horizontal = bevelSize * Math.sin(angle);
      unfold = travelled - horizontal + Math.max(0, depth / 2 - z);
    }
    uv[i * 3] = (x + (length ? nx / length * unfold : 0) + surfaceWidth / 2 + padding) / width;
    uv[i * 3 + 1] = (y + (length ? ny / length * unfold : 0) + surfaceWidth / aspect / 2 + padding) / height;
    uv[i * 3 + 2] = z < -depth / 2 && normal.getZ(i) < -.99 ? 0 : 1;
    edgeUV[i * 3] = (x - (length ? nx / length * horizontal : 0) + surfaceWidth / 2 + padding) / width;
    edgeUV[i * 3 + 1] = (y - (length ? ny / length * horizontal : 0) + surfaceWidth / aspect / 2 + padding) / height;
    edgeUV[i * 3 + 2] = length > .001 ? THREE.MathUtils.clamp((depth / 2 + bevelThickness - z) / bevelThickness, 0, 1) : 0;
  }
  geometry.setAttribute('signatureStickerUV', new THREE.Float32BufferAttribute(uv, 3));
  geometry.setAttribute('signatureStickerEdge', new THREE.Float32BufferAttribute(edgeUV, 3));
}

export function createSignatureStickers(aspect, onReady) {
  let disposed = false;
  const canvas = document.createElement('canvas');
  canvas.width = runtimeQuality().atlasWidth;
  const scale = canvas.width / (surfaceWidth + padding * 2);
  canvas.height = Math.round((surfaceWidth / aspect + padding * 2) * scale);
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  let loaded = [];
  const paint = (selected = null) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const item of loaded) {
      if (!item || selected === 'all' || item.index === selected) continue;
      const { sticker, image } = item;
      const width = sticker.width * surfaceWidth * scale;
      const height = width * image.naturalHeight / image.naturalWidth;
      ctx.save();
      ctx.translate((sticker.x * surfaceWidth + padding) * scale, (sticker.y * surfaceWidth / aspect + padding) * scale);
      ctx.rotate(sticker.angle * Math.PI / 180);
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
      ctx.restore();
    }
    texture.needsUpdate = true;
  };
  const ready = Promise.all(signatureStickers.map(async (sticker, index) => {
    const image = new Image();
    image.src = `/footer/stickers/web/${encodeURIComponent(sticker.file.replace(/\.png$/i, '.webp'))}`;
    try { await image.decode(); return { sticker, image, index }; }
    catch { console.warn(`Signature sticker unavailable: ${sticker.file}`); return null; }
  })).then(items => {
    if (disposed) return;
    loaded = items;
    paint();
    const count = items.filter(Boolean).length;
    onReady(count);
    return count;
  });
  return {
    texture, ready, expectedCount: signatureStickers.length,
    get items() { return loaded; },
    select(index) { if (!disposed) paint(index); },
    dispose() { disposed = true; texture.dispose(); },
  };
}
