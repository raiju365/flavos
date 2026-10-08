// Ink erodes through a continuous, warped ignition field, not directional wipes.
// Arrival times and turbulent flights are seeded and scroll-seekable in reverse.
export function createAboutTextDust(stage, showcase, copies, wordGroups) {
  const canvas = document.createElement('canvas');
  canvas.className = 'about-absorb-dust';
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  const ctx = canvas.getContext('2d');
  const enabled = matchMedia('(prefers-reduced-motion: no-preference)');
  const clamp = t => Math.max(0, Math.min(1, t));
  const noise = seed => {
    const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const smoothNoise = (x, y, seed) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const sx = x - ix, sy = y - iy;
    const u = sx * sx * (3 - 2 * sx), v = sy * sy * (3 - 2 * sy);
    const a = noise(ix * 37 + iy * 157 + seed), b = noise((ix + 1) * 37 + iy * 157 + seed);
    const c = noise(ix * 37 + (iy + 1) * 157 + seed), d = noise((ix + 1) * 37 + (iy + 1) * 157 + seed);
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
  };
  const grain = (x, y, seed) => smoothNoise(x, y, seed) * .57
    + smoothNoise(x * 2.1, y * 2.1, seed + 47) * .29
    + smoothNoise(x * 4.3, y * 4.3, seed + 113) * .14;
  function burnArrival(x, y, region) {
    const scale = Math.max(1, region.height);
    const u = (x - region.x) / scale, v = (y - region.y) / scale;
    const wx = u + (grain(u * 1.7, v * 1.7, region.seed) - .5) * .95;
    const wy = v + (grain(u * 1.7, v * 1.7, region.seed + 211) - .5) * .95;
    const distance = Math.min(...region.ignitions.map(p => Math.hypot(wx - p.x, wy - p.y) + p.delay));
    return distance + (grain(u * 4.6, v * 4.6, region.seed + 401) - .5) * .62;
  }
  let fields = [];
  let dpr = 1;
  let lastProgress = -1;
  let layoutKey = '';
  let dirty = true;
  let opacityHidden = false;
  let state = { complete: false };
  const readLayoutKey = () => copies.map(copy => {
    const style = getComputedStyle(copy);
    return [style.textAlign, style.font, style.letterSpacing, copy.clientWidth, copy.clientHeight].join('|');
  }).join(';');
  const strip = 2;
  const start = 0.045;
  const sweep = 0.20;
  const flight = 0.26;

  // Frosted facets are baked once, never blurred individually in the frame loop.
  const glass = document.createElement('canvas');
  const tile = 48;
  glass.width = tile * 8; glass.height = tile;
  const glassInk = glass.getContext('2d');
  for (let i = 0; glassInk && i < 8; i++) {
    glassInk.save();
    glassInk.translate(i * tile + tile / 2, tile / 2);
    glassInk.rotate(noise(i + 15) * Math.PI);
    const tint = glassInk.createLinearGradient(-10, -10, 12, 12);
    tint.addColorStop(0, 'rgba(248,246,239,.88)');
    tint.addColorStop(.38, 'rgba(110,120,148,.55)');
    tint.addColorStop(1, 'rgba(35,43,81,.5)');
    glassInk.fillStyle = tint;
    glassInk.shadowColor = 'rgba(75,84,119,.52)';
    glassInk.shadowBlur = 3 + i % 4 * 2;
    glassInk.beginPath();
    glassInk.moveTo(-10, -5); glassInk.lineTo(3, -12);
    glassInk.lineTo(11, 2); glassInk.lineTo(-2, 10);
    glassInk.closePath(); glassInk.fill();
    glassInk.shadowBlur = 0;
    glassInk.strokeStyle = 'rgba(255,253,247,.8)';
    glassInk.lineWidth = 1.2;
    glassInk.beginPath(); glassInk.moveTo(-9, -5);
    glassInk.lineTo(3, -11); glassInk.lineTo(10, 2); glassInk.stroke();
    glassInk.restore();
  }
  const glassSource = document.createElement('canvas');
  glassSource.width = glass.width; glassSource.height = glass.height;
  glassSource.getContext('2d')?.drawImage(glass, 0, 0);
  if (glassInk) {
    glassInk.clearRect(0, 0, glass.width, glass.height);
    for (let i = 0; i < 8; i++) {
      glassInk.filter = `blur(${i % 4 * 1.5}px)`;
      glassInk.drawImage(glassSource, i * tile, 0, tile, tile, i * tile, 0, tile, tile);
    }
    glassInk.filter = 'none';
  }
  const lowerBound = (particles, birth) => {
    let lo = 0, hi = particles.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (particles[mid].birth < birth) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  function restore() {
    if (!opacityHidden) return;
    copies.forEach(copy => copy.style.removeProperty('opacity'));
    opacityHidden = false;
  }

  function measure() {
    dirty = false;
    lastProgress = -1;
    fields = [];
    if (!ctx || !enabled.matches) { restore(); return; }
    layoutKey = readLayoutKey();
    const stageRect = stage.getBoundingClientRect();
    const photo = showcase.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(stageRect.width * dpr);
    canvas.height = Math.round(stageRect.height * dpr);
    canvas.style.width = `${stageRect.width}px`;
    canvas.style.height = `${stageRect.height}px`;

    fields = copies.map((copy, groupIndex) => {
      const rect = copy.getBoundingClientRect();
      const left = rect.left - stageRect.left - 3;
      const top = rect.top - stageRect.top - 3;
      const width = Math.ceil(rect.width + 6);
      const height = Math.ceil(rect.height + 6);
      const rightward = rect.left + rect.width / 2 < photo.left + photo.width / 2;
      const stacked = rect.bottom <= photo.top || rect.top >= photo.bottom;
      const above = rect.bottom <= photo.top;
      const atlas = document.createElement('canvas');
      atlas.width = Math.ceil(width * dpr);
      atlas.height = Math.ceil(height * dpr);
      const ink = atlas.getContext('2d', { willReadFrequently: true });
      ink.scale(dpr, dpr);
      const color = getComputedStyle(copy).color;
      ink.fillStyle = color;
      ink.textBaseline = 'alphabetic';

      const words = wordGroups[groupIndex];
      const bounds = words.map(word => word.getBoundingClientRect());
      const order = words.map((_, index) => index).sort((a, b) => noise(a + groupIndex * 97 + 31) - noise(b + groupIndex * 97 + 31));
      const regions = bounds.map((box, index) => ({
        x: box.left - stageRect.left - left,
        y: box.top - stageRect.top - top,
        width: box.width, height: box.height,
        birth: start + .48 * order.indexOf(index) / Math.max(1, words.length - 1),
        seed: index * 17 + groupIndex * 101 + 7,
        ignitions: Array.from({ length: 3 }, (_, point) => ({
          x: noise(index * 31 + groupIndex * 101 + point * 47) * box.width / Math.max(1, box.height),
          y: noise(index * 43 + groupIndex * 107 + point * 59),
          delay: point * .09,
        })),
        minArrival: Infinity, maxArrival: -Infinity,
        bendX: (noise(index * 23 + groupIndex * 107 + 11) - .5) * 100,
        bendY: (noise(index * 29 + groupIndex * 109 + 19) - .5) * 160,
      }));
      const style = getComputedStyle(words[0]);
      ink.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ink.fontKerning = style.fontKerning;
      if ('letterSpacing' in ink) ink.letterSpacing = style.letterSpacing;
      // Batch all writes, then all reads: one baseline layout per paragraph.
      const probes = words.map(word => {
        // Capture the live aligned position before the baseline probe can
        // influence inline layout (especially right-aligned final words).
        // A zero-height inline box exposes the actual CSS baseline; guessing
        // from font size shifts the dust away from the letter strokes.
        const probe = document.createElement('span');
        probe.style.cssText = 'display:inline-block;width:0;height:0;padding:0;margin:0;vertical-align:baseline';
        word.append(probe);
        return probe;
      });
      const baselines = probes.map(probe => probe.getBoundingClientRect().top - stageRect.top - top);
      probes.forEach(probe => probe.remove());
      words.forEach((word, index) => {
        ink.fillText(word.textContent, bounds[index].left - stageRect.left - left, baselines[index]);
      });

      const pixels = ink.getImageData(0, 0, atlas.width, atlas.height).data;
      const particles = [];
      const cells = [];
      const targetX = (rightward ? photo.left + photo.width * .10 : photo.right - photo.width * .10) - stageRect.left;
      const centerY = photo.top + photo.height * .5 - stageRect.top;
      for (let y = 0; y < height; y += strip) {
        for (let x = 0; x < width; x += strip) {
          const px = Math.min(atlas.width - 1, Math.floor((x + 1) * dpr));
          const py = Math.min(atlas.height - 1, Math.floor((y + 1) * dpr));
          let alpha = pixels[(py * atlas.width + px) * 4 + 3] / 255;
          // Keep antialiased edges even when the cell's center misses a stroke.
          if (alpha < .12) {
            for (let ay = Math.floor(y * dpr); ay < Math.min(atlas.height, Math.ceil((y + strip) * dpr)); ay++) {
              for (let ax = Math.floor(x * dpr); ax < Math.min(atlas.width, Math.ceil((x + strip) * dpr)); ax++) {
                alpha = Math.max(alpha, pixels[(ay * atlas.width + ax) * 4 + 3] / 255);
              }
            }
          }
          if (alpha === 0) continue;
          const seed = x * 13 + y * 71 + groupIndex * 991;
          const n = noise(seed);
          const word = regions.find(region => x + 1 >= region.x && x + 1 <= region.x + region.width && y + 1 >= region.y && y + 1 <= region.y + region.height);
          if (!word) continue;
          const arrival = burnArrival(x + 1, y + 1, word);
          word.minArrival = Math.min(word.minArrival, arrival);
          word.maxArrival = Math.max(word.maxArrival, arrival);
          const cell = { x, y, arrival, word, birth: 0 };
          cells.push(cell);
          particles.push({
            x: left + x + 1, y: top + y + 1,
            cell, birth: 0,
            targetX: stacked ? photo.left - stageRect.left + photo.width * (.15 + .7 * x / width) : targetX,
            targetY: stacked ? (above ? photo.top + photo.height * .08 : photo.bottom - photo.height * .08) - stageRect.top : centerY + (top + y - centerY) * .22 + (n - .5) * 20,
            radius: .45 + noise(seed + 1) * .65,
            drift: (noise(seed + 2) - .5) * 34,
            bendX: word.bendX, bendY: word.bendY,
            phase: n * Math.PI * 2, alpha,
            glass: noise(seed + 5) > .84 ? Math.floor(noise(seed + 6) * 8) : -1,
            glassSize: 9 + noise(seed + 7) * 12,
          });
        }
      }
      cells.forEach(cell => {
        const region = cell.word;
        cell.birth = region.birth + sweep * (cell.arrival - region.minArrival) / Math.max(.00001, region.maxArrival - region.minArrival);
      });
      particles.forEach(particle => { particle.birth = particle.cell.birth; delete particle.cell; });
      cells.sort((a, b) => a.birth - b.birth);
      const remaining = document.createElement('canvas');
      remaining.width = atlas.width; remaining.height = atlas.height;
      const remainingInk = remaining.getContext('2d');
      remainingInk.drawImage(atlas, 0, 0);
      // A stable spatial sample bounds work even on very wide/high-DPI screens.
      const stride = Math.max(1, particles.length / 2400);
      const sampled = stride === 1 ? particles : particles.filter((_, i) => Math.floor(i / stride) !== Math.floor((i - 1) / stride));
      sampled.sort((a, b) => a.birth - b.birth);
      return { atlas, remaining, remainingInk, erased: 0, cells, left, top, width, height, particles: sampled, color };
    });
    canvas.dataset.particles = String(fields.reduce((sum, field) => sum + field.particles.length, 0));
    canvas.dataset.erosion = 'organic-ignition';
  }

  const resize = new ResizeObserver(() => { dirty = true; });
  [stage, showcase, ...copies].forEach(element => resize.observe(element));
  const invalidate = () => {
    dirty = true;
    if (!enabled.matches) {
      restore();
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  document.fonts.addEventListener('loadingdone', invalidate);
  enabled.addEventListener('change', invalidate);

  function render(progress) {
    if (!ctx) return { complete: progress >= 1, receivedProgress: clamp(progress) };
    const amount = enabled.matches ? clamp(progress) : 0;
    state = {
      complete: amount >= start + .48 + sweep + flight,
      receivedProgress: clamp((amount - start - flight) / (.48 + sweep))
    };
    // Resize/font events invalidate the atlas. Check CSS once at the handoff,
    // avoiding computed-style/layout reads throughout the particle flight.
    if (dirty || (amount > start && lastProgress <= start && readLayoutKey() !== layoutKey)) {
      measure();
    }
    if (Math.abs(amount - lastProgress) < .00001) return state;
    lastProgress = amount;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (amount <= start || !fields.length) { restore(); return state; }
    // Opacity keeps the paragraph's accessible label available during erosion.
    if (!opacityHidden) {
      copies.forEach(copy => { copy.style.opacity = '0'; });
      opacityHidden = true;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fields.forEach(field => {
      const { atlas, remaining, remainingInk, cells, left, top, width, height, particles, color } = field;
      // Incremental removal touches only newly burned cells. Reverse seeks
      // rebuild from the original atlas, preserving the exact same contour.
      if (amount < start + .48 + sweep) {
        const removed = lowerBound(cells, amount);
        if (removed < field.erased) {
          remainingInk.clearRect(0, 0, atlas.width, atlas.height);
          remainingInk.drawImage(atlas, 0, 0);
          field.erased = 0;
        }
        if (removed > field.erased) {
          remainingInk.globalCompositeOperation = 'destination-out';
          remainingInk.beginPath();
          for (let i = field.erased; i < removed; i++) {
            const cell = cells[i];
            remainingInk.rect(cell.x * dpr, cell.y * dpr, strip * dpr, strip * dpr);
          }
          remainingInk.fill();
          remainingInk.globalCompositeOperation = 'source-over';
          field.erased = removed;
        }
        ctx.drawImage(remaining, left, top, width, height);
      }
      ctx.fillStyle = color;
      const first = lowerBound(particles, amount - flight);
      const end = lowerBound(particles, amount);
      for (let i = first; i < end; i++) {
        const particle = particles[i];
        const t = (amount - particle.birth) / flight;
        // Small initial disintegration accelerates into a narrowing stream.
        const pull = t * t * (1.65 - .65 * t);
        const flutter = Math.sin(Math.PI * t) * (1 - t);
        const turbulenceX = (Math.sin(t * 23 + particle.phase) - Math.sin(particle.phase)) * 13
          + (Math.sin(t * 41 + particle.phase * 2) - Math.sin(particle.phase * 2)) * 5;
        const turbulenceY = (Math.cos(t * 19 + particle.phase) - Math.cos(particle.phase)) * 15
          + (Math.sin(t * 37 + particle.phase * 3) - Math.sin(particle.phase * 3)) * 6;
        const x = particle.x + (particle.targetX - particle.x) * pull + (particle.bendX + turbulenceX) * flutter;
        const y = particle.y + (particle.targetY - particle.y) * pull
          + (particle.drift + particle.bendY + turbulenceY) * flutter;
        const radius = particle.radius * (1 - .88 * pull);
        ctx.globalAlpha = particle.alpha * (1 - Math.pow(t, 4));
        if (particle.glass >= 0) {
          const size = (2 + particle.glassSize * Math.sin(Math.PI * t)) * (1 - .65 * pull);
          ctx.drawImage(glass, particle.glass * tile, 0, tile, tile, x - size / 2, y - size / 2, size, size);
        } else {
          ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
      }
      ctx.globalAlpha = 1;
    });
    return state;
  }

  return { measure, render, dispose() {
    resize.disconnect();
    document.fonts.removeEventListener('loadingdone', invalidate);
    enabled.removeEventListener('change', invalidate);
    restore(); canvas.remove(); fields = [];
  } };
}
