import * as THREE from 'three';

export const STICKER_SKIN_OFFSET = .003;

// Invert the signature's actual unfolded UV charts. Each sheet vertex binds
// to a triangle on the front, bevel or side wall, rather than a flat proxy.
export function bindStickerSurface(geometry, signature, sticker, image, aspect) {
  const position = signature.attributes.position, normals = signature.attributes.normal;
  const uv = signature.attributes.signatureStickerUV, edge = signature.attributes.signatureStickerEdge;
  const ratio = image.naturalHeight / image.naturalWidth, size = sticker.width * 10;
  const angle = sticker.angle * Math.PI / 180, cosine = Math.cos(angle), sine = Math.sin(angle);
  const cx = (sticker.x - .5) * 10, cy = (.5 - sticker.y) * 10 / aspect;
  const local = (u, v) => {
    const x = u * 11.6 - 5.8 - cx, y = v * (10 / aspect + 1.6) - 5 / aspect - .8 - cy;
    return [(x * cosine - y * sine) / size, (x * sine + y * cosine) / size];
  };
  const alphaCanvas = document.createElement('canvas'); alphaCanvas.width = image.naturalWidth; alphaCanvas.height = image.naturalHeight;
  const context = alphaCanvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, alphaCanvas.width, alphaCanvas.height).data;
  const ink = (x, y) => {
    const px = Math.round((x + .5) * (alphaCanvas.width - 1)), py = Math.round((.5 - y / ratio) * (alphaCanvas.height - 1));
    return px >= 0 && py >= 0 && px < alphaCanvas.width && py < alphaCanvas.height ? pixels[(py * alphaCanvas.width + px) * 4 + 3] / 255 : 0;
  };
  const bins = new Map(), triangles = [], resolution = 40;
  const bin = (x, y) => [THREE.MathUtils.clamp(Math.floor((x + .5) * resolution), 0, resolution - 1), THREE.MathUtils.clamp(Math.floor((y / ratio + .5) * resolution), 0, resolution - 1)];
  for (let i = 0; i < position.count; i += 3) {
    if ((uv.getZ(i) + uv.getZ(i + 1) + uv.getZ(i + 2)) / 3 < .5) continue;
    const points = [0, 1, 2].map(k => local(uv.getX(i + k), uv.getY(i + k)));
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    if (Math.max(...xs) < -.51 || Math.min(...xs) > .51 || Math.max(...ys) < -ratio / 2 - .01 || Math.min(...ys) > ratio / 2 + .01) continue;
    const [a, b, c] = points;
    const det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(det) < 1e-10) continue;
    const id = triangles.push({ start: i, points, det }) - 1;
    const min = bin(Math.min(...xs), Math.min(...ys)), max = bin(Math.max(...xs), Math.max(...ys));
    for (let y = min[1]; y <= max[1]; y++) for (let x = min[0]; x <= max[0]; x++) {
      const key = y * resolution + x; if (!bins.has(key)) bins.set(key, []); bins.get(key).push(id);
    }
  }
  const weightsAt = (triangle, x, y) => {
    const [a, b, c] = triangle.points;
    const u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / triangle.det;
    const v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / triangle.det;
    return [u, v, 1 - u - v];
  };
  const validEdge = (triangle, weights) => {
    const i = triangle.start;
    if (weights.reduce((sum, w, k) => sum + w * edge.getZ(i + k), 0) < .05) return true;
    return ink(...local(weights.reduce((sum, w, k) => sum + w * edge.getX(i + k), 0), weights.reduce((sum, w, k) => sum + w * edge.getY(i + k), 0))) > .08;
  };
  const interpolate = (attribute, triangle, weights) => [0, 1, 2].map(channel => weights.reduce((sum, w, k) => sum + w * attribute.array[(triangle.start + k) * 3 + channel], 0));
  const output = new Float32Array(geometry.attributes.position.count * 3), outputNormals = new Float32Array(output.length), coverage = new Float32Array(output.length / 3);
  const cache = new Map(); let matched = 0, walls = 0;
  for (let i = 0; i < geometry.attributes.position.count; i++) {
    const x = geometry.attributes.position.getX(i), y = geometry.attributes.position.getY(i), key = `${Math.round(x * 1e6)},${Math.round(y * 1e6)}`;
    let bound = cache.get(key);
    if (!bound) {
      const cell = bin(x, y), nearby = bins.get(cell[1] * resolution + cell[0]) || [];
      let best, bestWeights, highest = -Infinity;
      for (const id of nearby) {
        const triangle = triangles[id], weights = weightsAt(triangle, x, y);
        if (Math.min(...weights) < -1e-5 || !validEdge(triangle, weights)) continue;
        const z = weights.reduce((sum, w, k) => sum + w * position.getZ(triangle.start + k), 0);
        if (z > highest) { highest = z; best = triangle; bestWeights = weights; }
      }
      const visible = best ? 1 : 0;
      if (!best) {
        const candidates = new Set(nearby);
        for (let radius = 1; radius <= 3 && candidates.size < 8; radius++) for (let yy = -radius; yy <= radius; yy++) for (let xx = -radius; xx <= radius; xx++) {
          if (cell[0] + xx < 0 || cell[0] + xx >= resolution || cell[1] + yy < 0 || cell[1] + yy >= resolution) continue;
          (bins.get((cell[1] + yy) * resolution + cell[0] + xx) || []).forEach(id => candidates.add(id));
        }
        let nearest = Infinity;
        const search = ids => {
          for (const id of ids) {
            const triangle = triangles[id];
            for (let k = 0; k < 3; k++) {
              const a = triangle.points[k], b = triangle.points[(k + 1) % 3], dx = b[0] - a[0], dy = b[1] - a[1];
              const t = THREE.MathUtils.clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy), 0, 1);
              const distance = (x - a[0] - t * dx) ** 2 + (y - a[1] - t * dy) ** 2;
              if (distance >= nearest) continue;
              const weights = [0, 0, 0]; weights[k] = 1 - t; weights[(k + 1) % 3] = t;
              if (!validEdge(triangle, weights)) continue;
              nearest = distance; best = triangle; bestWeights = weights;
            }
          }
        };
        search(candidates); if (!best) search(triangles.keys());
      }
      if (!best) throw new Error(`Sticker ${sticker.name} cannot bind to the signature`);
      bound = { position: interpolate(position, best, bestWeights), normal: interpolate(normals, best, bestWeights), visible };
      cache.set(key, bound);
    }
    output.set(bound.position, i * 3); outputNormals.set(bound.normal, i * 3); coverage[i] = bound.visible;
    if (bound.visible) { matched++; if (Math.abs(bound.normal[2]) < .9) walls++; }
  }
  geometry.userData.attachment = { positions: output, normals: outputNormals, matched, walls, total: coverage.length, paper: true };
  geometry.setAttribute('stickerAttachedPosition', new THREE.Float32BufferAttribute(output.slice(), 3));
  geometry.setAttribute('stickerAttachedNormal', new THREE.Float32BufferAttribute(outputNormals.slice(), 3));
  geometry.setAttribute('stickerAttachedCoverage', new THREE.Float32BufferAttribute(coverage, 1));
}

export function projectStickerAttachment(geometry, model, sourceCamera, sourceRect, camera) {
  camera.updateMatrixWorld(true); sourceCamera.updateMatrixWorld(true);
  const attached = geometry.userData.attachment, destination = geometry.attributes.stickerAttachedPosition, normals = geometry.attributes.stickerAttachedNormal;
  const world = new THREE.Vector3(), projected = new THREE.Vector3(), normal = new THREE.Vector3(), normalMatrix = new THREE.Matrix3().getNormalMatrix(model.matrixWorld);
  const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); let error = 0;
  for (let i = 0; i < destination.count; i++) {
    world.fromArray(attached.positions, i * 3).applyMatrix4(model.matrixWorld);
    normal.fromArray(attached.normals, i * 3).applyNormalMatrix(normalMatrix);
    if (attached.paper) world.addScaledVector(normal, STICKER_SKIN_OFFSET);
    projected.copy(world).project(sourceCamera);
    const x = sourceRect.left + (projected.x + 1) * sourceRect.width / 2, y = sourceRect.top + (1 - projected.y) * sourceRect.height / 2;
    const distance = (sourceCamera.position.z - world.z) / sourceCamera.position.z * camera.position.z;
    const px = (x / innerWidth * 2 - 1) * distance * tangent * camera.aspect, py = (1 - y / innerHeight * 2) * distance * tangent;
    destination.setXYZ(i, px, py, camera.position.z - distance); normals.setXYZ(i, normal.x, normal.y, normal.z);
    if (i % 100 === 0) { projected.set(px, py, camera.position.z - distance).project(camera); error = Math.max(error, Math.hypot((projected.x + 1) * innerWidth / 2 - x, (1 - projected.y) * innerHeight / 2 - y)); }
  }
  destination.needsUpdate = true; normals.needsUpdate = true; attached.projectedError = error;
}
