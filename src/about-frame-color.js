// A fixed organic field makes every scroll seek repeatable, including reversal.
export function createAboutFrameColor(showcase) {
  const source = showcase.querySelector('.portrait-frame');
  const canvas = document.createElement('canvas');
  canvas.className = 'portrait-frame-color';
  canvas.setAttribute('aria-hidden', 'true');
  source.after(canvas);
  const ctx = canvas.getContext('2d');
  const mask = document.createElement('canvas');
  mask.width = 256; mask.height = 384;
  const ink = mask.getContext('2d', { willReadFrequently: true });
  let pixels, cells = [], last = -1, pending = 0, disposed = false;
  const clamp = value => Math.max(0, Math.min(1, value));
  const hash = (x, y, seed) => {
    const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const noise = (x, y, size, seed) => {
    x /= size; y /= size;
    const ix = Math.floor(x), iy = Math.floor(y);
    const smooth = t => t * t * (3 - 2 * t);
    const tx = smooth(x - ix), ty = smooth(y - iy);
    const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed);
    const c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  };
  function render(progress) {
    pending = clamp(progress);
    if (!pixels || Math.abs(last - pending) < .0001) return;
    last = pending;
    let coverage = 0;
    for (const cell of cells) {
      const amount = clamp((pending - cell.threshold) / .035 + .5);
      pixels.data[cell.index + 3] = Math.round(amount * 255);
      coverage += amount;
    }
    ink.putImageData(pixels, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    canvas.dataset.progress = pending.toFixed(4);
    canvas.dataset.coverage = (coverage / cells.length).toFixed(4);
  }
  function initialize() {
    if (disposed || !source.naturalWidth) return;
    canvas.width = 512; canvas.height = 768;
    ink.drawImage(source, 0, 0, mask.width, mask.height);
    const alpha = ink.getImageData(0, 0, mask.width, mask.height);
    pixels = ink.createImageData(mask.width, mask.height);
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        const index = (y * mask.width + x) * 4;
        if (!alpha.data[index + 3]) continue;
        // Broad islands, broken edges, and fine flecks appear at every stage.
        const score = noise(x, y, 43, 2) * .44 + noise(x, y, 15, 7) * .34
          + noise(x, y, 5, 13) * .17 + hash(x, y, 19) * .05;
        cells.push({ index, score, threshold: 0 });
      }
    }
    cells.sort((a, b) => a.score - b.score);
    // Rank the field: fresh patches keep appearing evenly until the very end.
    cells.forEach((cell, index) => { cell.threshold = .02 + .96 * index / (cells.length - 1); });
    render(pending);
  }
  source.addEventListener('load', initialize, { once: true });
  if (source.complete) initialize();
  return { render, dispose() {
    disposed = true;
    source.removeEventListener('load', initialize);
    canvas.remove(); cells = [];
  } };
}
