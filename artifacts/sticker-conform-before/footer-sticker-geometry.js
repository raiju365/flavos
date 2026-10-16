import * as THREE from 'three';

// Trace the actual alpha contour, including cutouts. No rectangular card is
// visible behind an irregular sticker when it turns edge-on or faces away.
export function createStickerGeometry(image) {
  const canvas = document.createElement('canvas');
  const ratio = image.naturalHeight / image.naturalWidth;
  const resolution = 256;
  canvas.width = Math.max(8, Math.round(resolution / Math.max(1, ratio)));
  canvas.height = Math.max(8, Math.round(canvas.width * ratio));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < width && y < height && pixels[(y * width + x) * 4 + 3] > 96;
  const edges = new Map();
  const key = (x, y) => y * (width + 1) + x;
  const add = (x, y, xx, yy) => {
    const start = key(x, y);
    if (!edges.has(start)) edges.set(start, []);
    edges.get(start).push(key(xx, yy));
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!solid(x, y)) continue;
    if (!solid(x, y - 1)) add(x, y, x + 1, y);
    if (!solid(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!solid(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!solid(x - 1, y)) add(x, y + 1, x, y);
  }
  const paths = new THREE.ShapePath();
  while (edges.size) {
    const start = edges.keys().next().value;
    const points = [];
    let current = start;
    for (let guard = 0; guard < width * height * 4; guard++) {
      points.push(new THREE.Vector2((current % (width + 1)) / width - .5, (.5 - Math.floor(current / (width + 1)) / height) * ratio));
      const next = edges.get(current);
      if (!next?.length) break;
      const end = next.pop();
      if (!next.length) edges.delete(current);
      current = end;
      if (current === start) break;
    }
    if (points.length < 8 || Math.abs(THREE.ShapeUtils.area(points)) < .00015) continue;
    // Remove collinear raster points, then round the remaining tiny corners.
    const corners = points.filter((point, i) => {
      const previous = points[(i + points.length - 1) % points.length], next = points[(i + 1) % points.length];
      return Math.abs((point.x - previous.x) * (next.y - point.y) - (point.y - previous.y) * (next.x - point.x)) > 1e-10;
    });
    if (corners.length < 3) continue;
    const first = corners[0].clone().lerp(corners.at(-1), Math.min(.5, .0015 / corners[0].distanceTo(corners.at(-1))));
    paths.moveTo(first.x, first.y);
    corners.forEach((point, i) => {
      const previous = corners[(i + corners.length - 1) % corners.length];
      const next = corners[(i + 1) % corners.length];
      const begin = point.clone().lerp(previous, Math.min(.5, .0015 / point.distanceTo(previous)));
      const end = point.clone().lerp(next, Math.min(.5, .0015 / point.distanceTo(next)));
      paths.lineTo(begin.x, begin.y);
      paths.quadraticCurveTo(point.x, point.y, end.x, end.y);
    });
    paths.currentPath.closePath();
  }
  const geometry = new THREE.ExtrudeGeometry(paths.toShapes(), {
    depth: .008, bevelEnabled: true, bevelSegments: 3,
    bevelSize: .0012, bevelThickness: .0015, curveSegments: 2, steps: 1,
  });
  geometry.translate(0, 0, -.004);
  const position = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) + .5, position.getY(i) / ratio + .5);
  return geometry;
}
