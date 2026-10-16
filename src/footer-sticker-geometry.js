import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';

function backPrintTransform(contours, ratio) {
  const outlines = contours.map(contour => contour.map(([x, y]) => new THREE.Vector2(x, y)));
  const outline = outlines.reduce((largest, points) => Math.abs(THREE.ShapeUtils.area(points)) > Math.abs(THREE.ShapeUtils.area(largest)) ? points : largest, outlines[0]);
  const points = [...outline].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const halfHull = sorted => {
    const hull = [];
    for (const point of sorted) { while (hull.length > 1 && cross(hull.at(-2), hull.at(-1), point) <= 0) hull.pop(); hull.push(point); }
    return hull.slice(0, -1);
  };
  const hull = [...halfHull(points), ...halfHull([...points].reverse())];
  const bounds = angle => {
    const c = Math.cos(angle), s = Math.sin(angle);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const point of hull) {
      const x = point.x * c + point.y * s, y = -point.x * s + point.y * c;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const x = (minX + maxX) / 2, y = (minY + maxY) / 2;
    return { angle, area: (maxX - minX) * (maxY - minY), x: x * c - y * s, y: x * s + y * c };
  };
  let frame = bounds(0);
  for (let i = 0; i < hull.length; i++) {
    const edge = hull[(i + 1) % hull.length].clone().sub(hull[i]);
    let angle = Math.atan2(edge.y, edge.x); angle -= Math.round(angle / (Math.PI / 2)) * Math.PI / 2;
    const candidate = bounds(angle); if (candidate.area < frame.area) frame = candidate;
  }
  // Printed rectangles can already be tilted inside a transparent PNG. Reflect
  // within that frame so the reverse print stays inside the same paper outline.
  if (Math.abs(THREE.ShapeUtils.area(outline)) / frame.area < .88) frame = bounds(0);
  const c = Math.cos(2 * frame.angle), s = Math.sin(2 * frame.angle), x = frame.x + .5, y = frame.y / ratio + .5;
  const a = -c, b = -s * ratio, d = -s / ratio, e = c;
  return new THREE.Matrix3().set(a, b, x - a * x - b * y, d, e, y - d * x - e * y, 0, 0, 1);
}

// Trace a filtered alpha isocontour at subpixel positions. Raster alpha no
// longer supplies the die-cut edge of either the paper or its glossy bevel.
export function createStickerSurface(image) {
  const width = image.naturalWidth, height = image.naturalHeight, ratio = height / width, pad = 4;
  const mask = document.createElement('canvas'); mask.width = width + pad * 2; mask.height = height + pad * 2;
  const context = mask.getContext('2d', { willReadFrequently: true });
  context.filter = 'blur(1.15px)'; context.drawImage(image, pad, pad);
  const alpha = context.getImageData(0, 0, mask.width, mask.height).data;
  const value = (x, y) => alpha[(y * mask.width + x) * 4 + 3] / 255;
  const edgePoint = (x, y, edge, values) => {
    const pairs = [[0, 1], [1, 2], [3, 2], [0, 3]], corners = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
    const [a, b] = pairs[edge], t = (.5 - values[a]) / (values[b] - values[a]);
    return new THREE.Vector2((THREE.MathUtils.lerp(corners[a][0], corners[b][0], t) + .5 - pad) / width - .5,
      (.5 - (THREE.MathUtils.lerp(corners[a][1], corners[b][1], t) + .5 - pad) / height) * ratio);
  };
  const cases = { 1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]], 9: [[0, 2]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[3, 0]] };
  const segments = [];
  for (let y = 0; y < mask.height - 1; y++) for (let x = 0; x < mask.width - 1; x++) {
    const values = [value(x, y), value(x + 1, y), value(x + 1, y + 1), value(x, y + 1)];
    const code = values.reduce((result, v, i) => result | (v >= .5 ? 1 << i : 0), 0);
    let pairs = cases[code];
    if (code === 5 || code === 10) pairs = (code === 5) === (values.reduce((sum, v) => sum + v, 0) / 4 >= .5) ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]];
    for (const [a, b] of pairs || []) segments.push([edgePoint(x, y, a, values), edgePoint(x, y, b, values)]);
  }
  const key = p => `${Math.round(p.x * 1e7)},${Math.round(p.y * 1e7)}`, adjacency = new Map();
  segments.forEach((segment, index) => segment.forEach(point => {
    const id = key(point); if (!adjacency.has(id)) adjacency.set(id, []); adjacency.get(id).push(index);
  }));
  const used = new Set(), paths = new THREE.ShapePath(), contours = [];
  for (let i = 0; i < segments.length; i++) {
    if (used.has(i)) continue;
    const points = [], start = key(segments[i][0]); let current = i, end = segments[i][0];
    while (!used.has(current)) {
      used.add(current); const segment = segments[current]; points.push(end);
      end = key(segment[0]) === key(end) ? segment[1] : segment[0];
      if (key(end) === start) break;
      const next = (adjacency.get(key(end)) || []).find(index => !used.has(index));
      if (next === undefined) break; current = next;
    }
    if (points.length < 12 || Math.abs(THREE.ShapeUtils.area(points)) < .0003) continue;
    const smooth = points.map((_, index) => {
      const point = new THREE.Vector2(); let weight = 0;
      for (let k = -4; k <= 4; k++) { const w = Math.exp(-k * k / 7); point.addScaledVector(points[(index + k + points.length) % points.length], w); weight += w; }
      return point.multiplyScalar(1 / weight);
    });
    const lengths = [0];
    for (let j = 0; j < smooth.length; j++) lengths.push(lengths[j] + smooth[j].distanceTo(smooth[(j + 1) % smooth.length]));
    const count = Math.max(48, Math.ceil(lengths.at(-1) * 160)), sampled = []; let segment = 0;
    for (let j = 0; j < count; j++) {
      const distance = j / count * lengths.at(-1);
      while (segment < smooth.length - 1 && lengths[segment + 1] < distance) segment++;
      sampled.push(smooth[segment].clone().lerp(smooth[(segment + 1) % smooth.length], (distance - lengths[segment]) / (lengths[segment + 1] - lengths[segment])));
    }
    contours.push(sampled.map(p => p.toArray()));
    const first = sampled.at(-1).clone().lerp(sampled[0], .5); paths.moveTo(first.x, first.y);
    sampled.forEach((point, j) => { const end = point.clone().lerp(sampled[(j + 1) % sampled.length], .5); paths.quadraticCurveTo(point.x, point.y, end.x, end.y); });
    paths.currentPath.closePath();
  }
  let geometry = new THREE.ExtrudeGeometry(paths.toShapes(), { depth: .003, bevelEnabled: true, bevelSegments: 4, bevelSize: .0007, bevelThickness: .0007, curveSegments: 2, steps: 1 });
  geometry.translate(0, 0, -.0015);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  geometry.groups.forEach(group => { for (let i = group.start; i < group.start + group.count; i++) colors[i * 3] = group.materialIndex === 0 ? 1 : 0; });
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.scale(1000, 1000, 1000);
  const creased = toCreasedNormals(geometry, Math.PI / 3); geometry.dispose(); geometry = creased;
  geometry.scale(.001, .001, .001);
  const dense = new TessellateModifier(.035, 12).modify(geometry); geometry.dispose(); geometry = dense;
  const position = geometry.attributes.position, uv = geometry.attributes.uv, normals = geometry.attributes.normal;
  geometry.clearGroups(); let start = 0, materialIndex = -1;
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, position.getX(i) + .5, position.getY(i) / ratio + .5);
    const cap = geometry.attributes.color.getX(i) > .5;
    if (cap) normals.setXYZ(i, 0, 0, position.getZ(i) > 0 ? 1 : -1);
    if (i % 3) continue;
    const next = cap ? 0 : 1;
    if (next !== materialIndex) { if (materialIndex !== -1) geometry.addGroup(start, i - start, materialIndex); start = i; materialIndex = next; }
  }
  geometry.addGroup(start, position.count - start, materialIndex); geometry.deleteAttribute('color'); geometry.userData.contours = contours;

  // Extend print colors under the clean contour, so transparent texture pixels
  // cannot introduce a dark fringe or re-cut a serrated edge into the mesh.
  const print = document.createElement('canvas'); print.width = width; print.height = height;
  const paint = print.getContext('2d', { willReadFrequently: true }); paint.drawImage(image, 0, 0);
  const pixels = paint.getImageData(0, 0, width, height), queue = new Int32Array(width * height), visited = new Uint8Array(width * height);
  let head = 0, tail = 0;
  for (let i = 0; i < visited.length; i++) if (pixels.data[i * 4 + 3] > 128) { visited[i] = 1; queue[tail++] = i; }
  while (head < tail) {
    const cell = queue[head++], x = cell % width, y = Math.floor(cell / width);
    for (const neighbor of [x > 0 ? cell - 1 : -1, x < width - 1 ? cell + 1 : -1, y > 0 ? cell - width : -1, y < height - 1 ? cell + width : -1]) {
      if (neighbor < 0 || visited[neighbor]) continue;
      visited[neighbor] = 1; queue[tail++] = neighbor;
      for (let channel = 0; channel < 3; channel++) pixels.data[neighbor * 4 + channel] = pixels.data[cell * 4 + channel];
    }
  }
  for (let i = 0; i < visited.length; i++) pixels.data[i * 4 + 3] = 255;
  paint.putImageData(pixels, 0, 0);
  return { geometry, print, backPrintUv: backPrintTransform(contours, ratio) };
}
