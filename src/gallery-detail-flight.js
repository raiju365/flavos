const mix = (a, b, t) => a + (b - a) * t;
const radians = value => value * Math.PI / 180;

export function flightCorners(pose, plane) {
  const [cx, cy] = plane.perspectiveOrigin.split(' ').map(parseFloat);
  const yaw = radians(pose.rotationY || 0), pitch = radians(pose.rotationX || 0);
  const bank = radians(pose.rotationZ || 0), scale = pose.scale ?? 1;
  return [[-1,-1], [1,-1], [1,1], [-1,1]].map(([sx, sy]) => {
    const x = sx * pose.width / 2 * scale, y = sy * pose.height / 2 * scale;
    const bx = x * Math.cos(bank) - y * Math.sin(bank);
    const by = x * Math.sin(bank) + y * Math.cos(bank);
    const py = by * Math.cos(pitch), pz = by * Math.sin(pitch);
    const wx = pose.left + pose.x + pose.width / 2 + bx * Math.cos(yaw) + pz * Math.sin(yaw);
    const wy = pose.top + pose.y + pose.height / 2 + py;
    const wz = pose.z - bx * Math.sin(yaw) + pz * Math.cos(yaw);
    const perspectiveScale = plane.perspective / (plane.perspective - wz);
    return { x: wx, z: wz, screenX: cx + (wx - cx) * perspectiveScale,
      screenY: cy + (wy - cy) * perspectiveScale, perspectiveScale };
  });
}

// Separating axes in the horizontal/depth plane. Unlike centre-depth tests,
// this includes the width swept by a tilted or rotating artwork.
export function footprintsOverlap(a, b, margin = 12) {
  for (const polygon of [a, b]) {
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i], q = polygon[(i + 1) % polygon.length];
      const length = Math.hypot(q.x - p.x, q.z - p.z);
      if (length < .001) continue;
      const nx = -(q.z - p.z) / length, nz = (q.x - p.x) / length;
      const aa = a.map(v => v.x * nx + v.z * nz), bb = b.map(v => v.x * nx + v.z * nz);
      if (Math.max(...aa) + margin < Math.min(...bb) || Math.max(...bb) + margin < Math.min(...aa)) return false;
    }
  }
  return true;
}

export function createDetailFlight(rear, front, obstacles) {
  const direction = rear.x < 0 ? -1 : 1;
  const fences = obstacles.map(obstacle => ({ ...obstacle, corners: flightCorners(obstacle.pose, rear) }));
  const poseAt = (progress, lift = 0) => {
    const t = progress * progress * (3 - 2 * progress);
    const arc = Math.sin(Math.PI * progress) ** 2;
    const pose = { ...rear };
    for (const key of ['left', 'top', 'width', 'height', 'x', 'y', 'z', 'blur']) pose[key] = mix(rear[key], front[key], t);
    const depthTime = Math.max(0, Math.min(1, (progress - .12) / .6));
    const depthTravel = depthTime * depthTime * (3 - 2 * depthTime);
    pose.z = mix(rear.z, front.z, depthTravel) + 80 * arc;
    pose.y -= lift;
    pose.rotationY = rear.rotationY * (1 - t);
    pose.rotationX = -58 * arc;
    pose.rotationZ = direction * 7 * Math.sin(Math.PI * 2 * progress) * arc;
    pose.scale = mix(rear.scale ?? 1, 1, t) * (1 - .23 * arc);
    return pose;
  };
  const clearances = [];
  // Beyond 80% the opaque detail sheet covers the ring. The reverse flight
  // keeps it covered for that same part of the path.
  for (let sample = 1; sample <= 192; sample++) {
    const progress = sample / 240;
    const corners = flightCorners(poseAt(progress), rear);
    const arc = Math.sin(Math.PI * progress) ** 2;
    let required = 0;
    for (const obstacle of fences) {
      if (!footprintsOverlap(corners, obstacle.corners)) continue;
      for (const corner of corners) {
        required = Math.max(required, (corner.screenY - obstacle.rect.top + 36) / corner.perspectiveScale);
      }
    }
    if (required > 0) clearances.push({ progress, required, arc });
  }
  const elevation = progress => {
    const arc = Math.sin(Math.PI * progress) ** 2;
    return Math.max(90 * arc, ...clearances.map(point => point.required * arc / point.arc *
      Math.exp(-(((progress - point.progress) / .1) ** 2))));
  };
  return { poseAt: progress => poseAt(progress, elevation(progress)),
    lift: Math.max(90, ...clearances.map(point => point.required)), fences };
}
