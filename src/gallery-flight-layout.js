const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };

export function getGalleryFlightLayout({ progress, count, angle, radius, size, gap,
  photoWidth, originX, originY, portraitLift, landingY, viewportHeight, desktop }) {
  const step = Math.PI * 2 / count;
  const opening = ease(progress);
  const initialScale = Math.min(.72, photoWidth * .64 / size);
  // All cards occupy fixed angular lanes on ONE expanding circle. Independent
  // radial interpolations from a depth stack let adjacent paths cut each other.
  const formation = ease(progress / .88);
  const launchRadius = Math.min(radius, Math.max(size * .2, photoWidth * .3));
  const flightRadius = launchRadius + (radius - launchRadius) * formation;
  const centerX = originX * (1 - formation);
  const centerZ = (radius - launchRadius) * (1 - formation);
  // Circumscribed spheres contain every corner, at every yaw/pitch/bank.
  // Their diameters stay below the neighbouring lane distance, including a
  // small air gap. Vertical departure offsets can only increase separation.
  const clearance = Math.max(5, size * .022);
  const laneDistance = 2 * flightRadius * Math.sin(Math.PI / count);
  const safeScale = Math.max(0, (laneDistance - clearance) / (Math.SQRT2 * size));
  return Array.from({ length: count }, (_, i) => {
    const departure = count > 1 ? i / (count - 1) * .45 : 0;
    const arrival = clamp((progress - departure) / (1 - departure));
    const spread = ease((arrival - .2) / .8);
    const drop = 1 - (1 - clamp(arrival / .45)) ** 3;
    const theta = angle + i * step + (1 - opening) * Math.PI * 1.5;
    const desiredScale = Math.min(initialScale + (1 - initialScale) * spread,
      Math.max(initialScale, spread * (1 + gap / size) * .9));
    const launchLift = portraitLift * (desktop ? 1 - drop : 1);
    return {
      x: centerX + Math.sin(theta) * flightRadius,
      y: (originY - launchLift + viewportHeight * (desktop ? .32 : .55) * drop) * (1 - spread) + landingY * spread,
      z: centerZ + Math.cos(theta) * flightRadius,
      yaw: theta * spread,
      pitch: Math.sin(Math.PI * arrival) * -.18,
      bank: Math.sin(Math.PI * arrival) * (i % 2 ? .09 : -.09),
      scale: Math.min(desiredScale, safeScale),
      progress: arrival,
      depth: Math.max(0, -Math.cos(theta)),
    };
  });
}
