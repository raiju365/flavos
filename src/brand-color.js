// Read the same CSS pigment for canvas/WebGL and CSS-driven surfaces.
export function getBrandBlue() {
  return getComputedStyle(document.documentElement).getPropertyValue('--brand-blue').trim() || '#20235b';
}

export function getBrandBlueChannels() {
  const hex = getBrandBlue();
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
}
