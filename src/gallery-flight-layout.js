const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };

export function getGalleryFlightLayout({ progress, count, angle, radius, size, gap,
  photoWidth, originX, originY, portraitLift, landingY, viewportHeight, desktop }) {
  const step = Math.PI * 2 / count;
  const initialScale = Math.min(.85, photoWidth * .5 / size);
  // Expand the destination ring; each delayed card joins it from the portrait.
  const formation = ease(progress / .88);
  const launchRadius = Math.min(radius, Math.max(size * .2, photoWidth * .3));
  const flightRadius = launchRadius + (radius - launchRadius) * formation;
  // Use lane spacing for the settled ring. During departure, layered artwork
  // keeps a readable size instead of shrinking to fit the tiny launch circle.
  const clearance = Math.max(5, size * .022);
  const laneDistance = 2 * flightRadius * Math.sin(Math.PI / count);
  const safeScale = Math.max(0, (laneDistance - clearance) / (Math.SQRT2 * size));
  const poses = Array.from({ length: count }, (_, i) => {
    const departure = count > 1 ? i / (count - 1) * .45 : 0;
    const arrival = clamp((progress - departure) / (1 - departure));
    const spread = ease((arrival - .24) / .76);
    const exit = ease(arrival / .3);
    const drop = ease(arrival / .55);
    const theta = angle + i * step;
    const desiredScale = Math.min(initialScale + (1 - initialScale) * spread,
      Math.max(initialScale, spread * (1 + gap / size) * .9));
    // The stagger must delay the whole trajectory, not just visibility. Each
    // card starts inside the opaque photo window before joining its ring lane.
    const lane = ease((arrival - .08) / .58);
    const launchLift = portraitLift * (1 - drop);
    const laneScale = Math.min(desiredScale, safeScale);
    const exitScale = initialScale + (Math.max(initialScale, desktop ? .65 : .72) - initialScale) * exit;
    return {
      x: originX * (1 - lane) + Math.sin(theta) * flightRadius * lane,
      y: (originY - launchLift + photoWidth * .65 * exit + viewportHeight * .2 * drop) * (1 - spread) + landingY * spread,
      z: radius * (1 - formation) + Math.cos(theta) * radius * formation,
      // Use the shortest orientation, rather than unwinding several radians
      // as soon as a tightly packed sheet gains clearance.
      yaw: Math.atan2(Math.sin(angle + i * step), Math.cos(angle + i * step)),
      pitch: Math.sin(Math.PI * arrival) * -.18,
      bank: Math.sin(Math.PI * arrival) * (i % 2 ? .09 : -.09),
      scale: exitScale + (Math.max(exitScale, laneScale) - exitScale) * lane,
      progress: arrival,
      depth: Math.max(0, -Math.cos(theta)),
    };
  });
  // Expand depth as one formation. Per-card Z interpolation lets parallel
  // sheets exchange front/back order between frames while they still overlap.
  // A common clock and a stable stack rank preserve that order in both scroll
  // directions; individual X/Y departures retain their stagger.
  const ordered = poses.map((pose, i) => ({ pose, i,
    depth: Math.cos(angle + i * step) })).sort((a, b) => b.depth - a.depth || a.i - b.i);
  ordered.forEach(({ pose }, rank) => {
    pose.z -= rank * 3 * (1 - formation);
  });
  // Overlapping departures are a stack of parallel sheets. Only turn a sheet
  // in 3D once its entire bounding sphere clears every neighbouring sheet;
  // independently tilting overlapping planes makes the artwork cut through.
  return poses.map((pose, i) => {
    let separation = Infinity;
    poses.forEach((other, j) => {
      if (i === j || other.progress <= 0) return;
      const distance = Math.hypot(pose.x - other.x, pose.y - other.y, pose.z - other.z);
      separation = Math.min(separation, distance - size * (pose.scale + other.scale) / Math.SQRT2);
    });
    // Clearance is a safety guard, not the animation clock. Reserve a broad
    // final scroll interval for the bend, with zero speed at both endpoints.
    const turn = ease((progress - .78) / .22) * ease((separation - 2) / (size * .03));
    return { ...pose, yaw: pose.yaw * turn, pitch: pose.pitch * turn, bank: pose.bank * turn };
  });
}

