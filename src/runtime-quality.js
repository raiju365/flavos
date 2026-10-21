// Rendering budgets change resolution, not interaction or animation speed.
export function runtimeQuality() {
  const compact=matchMedia('(pointer: coarse), (max-width: 820px)').matches;
  const limited=navigator.connection?.saveData
    || (navigator.deviceMemory>0&&navigator.deviceMemory<=4)
    || (navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4);
  return {
    compact,limited,
    pixelRatio:limited?1:compact?1.25:1.5,
    pixels:limited?700000:compact?1000000:1600000,
    noisePixels:limited?130000:compact?180000:400000,
    noiseRate:limited?12:compact?18:24,
    atlasWidth:limited||compact?1536:2048,
    bevelSegments:limited||compact?4:6,
    curveSegments:limited||compact?2:3,
  };
}
export function renderPixelRatio(width,height) {
  const quality=runtimeQuality();
  return Math.min(devicePixelRatio||1,quality.pixelRatio,Math.sqrt(quality.pixels/Math.max(1,width*height)));
}
export const logoAsset=id=>`/logoanimasi/optimized/logo${id}-${runtimeQuality().compact?512:960}.webp`;
