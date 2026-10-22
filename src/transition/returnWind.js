const smooth = value => value * value * (3 - 2 * value);
function random(index, seed) {
  let value = Math.imul(index ^ seed, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295 * 2 - 1;
}
function noise(time, seed) {
  const index = Math.floor(time), blend = smooth(time - index);
  return random(index, seed) * (1 - blend) + random(index + 1, seed) * blend;
}

// Slowly correlated gusts rather than a repeated left/right sine loop. Both
// the cloud layers and the paper respond to the same scales of air movement.
export function sampleReturnWind(time) {
  return {
    side: noise(time * .62 + 2, 73) * .72 + noise(time * 1.53 + 5, 119) * .28,
    lift: noise(time * .83 + 3, 37) * .76 + noise(time * 2.1, 91) * .24,
    roll: noise(time * 1.9 + 7, 53),
  };
}
