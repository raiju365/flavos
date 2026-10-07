// Ultra-high-performance frame buffer optimized for scroll-driven sequences.
// Strategy: keep ALL 758 frames decoded in memory (~758 × ~8MB ImageBitmap ≈
// but actual JPEG→bitmap at 1920×1080 is ~8MB RGBA, so 758 = ~6GB). That's too
// much, so instead we use a LARGE sliding window (200 frames) centered on the
// current position, with aggressive background decoding using ALL available
// idle time. The key insight: we decode into ImageBitmap which lives in GPU
// texture memory and is zero-copy for canvas drawImage.

export async function decodeFrame(blob) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function fetchFrame(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Frame request failed (${response.status}): ${url}`);
    return await response.blob();
  } finally {
    clearTimeout(timeout);
  }
}

export function createFrameBuffer({
  urls, onProgress = () => {}, concurrency = 8, cacheSize = 200,
  fetchImage = fetchFrame, decodeImage = decodeFrame
}) {
  const totalFrames = urls.length;
  const blobs = new Map();       // index → Blob (compressed JPEG, ~150KB each)
  const decoded = new Map();     // index → ImageBitmap (decoded, GPU-ready)
  const pending = new Map();     // index → Promise (in-flight decodes)
  let disposed = false;
  let loading;

  // --- LRU eviction: only evict frames far from current position ---
  let currentCenter = 0;
  function evictFarFrames() {
    if (decoded.size <= cacheSize) return;
    // Build array of decoded indices sorted by distance from center
    const indices = [...decoded.keys()];
    indices.sort((a, b) => Math.abs(a - currentCenter) - Math.abs(b - currentCenter));
    // Keep the closest cacheSize frames, evict the rest
    for (let i = cacheSize; i < indices.length; i++) {
      const idx = indices[i];
      const bmp = decoded.get(idx);
      bmp?.close?.();
      decoded.delete(idx);
    }
  }

  async function validate(index) {
    if (blobs.has(index)) return;
    let failure;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const blob = await fetchImage(urls[index]);
        const bitmap = await decodeImage(blob);
        const valid = (bitmap.width || bitmap.naturalWidth) > 0;
        if (!valid) {
          bitmap?.close?.();
          throw new Error(`Empty frame: ${urls[index]}`);
        }
        if (disposed) { bitmap?.close?.(); return; }
        blobs.set(index, blob);
        // Keep first 80 frames pre-decoded for instant start
        if (index < 80) {
          decoded.set(index, bitmap);
        } else {
          bitmap?.close?.();
        }
        onProgress(blobs.size, urls.length);
        return;
      } catch (error) {
        failure = error;
      }
    }
    throw failure;
  }

  // --- Core decode function: returns bitmap from cache or decodes ---
  function decodeSingle(index) {
    if (disposed) return Promise.resolve(null);
    if (decoded.has(index)) {
      return Promise.resolve(decoded.get(index));
    }
    if (pending.has(index)) return pending.get(index);
    if (!blobs.has(index)) return Promise.resolve(null);

    const task = decodeImage(blobs.get(index)).then(bitmap => {
      if (disposed) { bitmap?.close?.(); return null; }
      decoded.set(index, bitmap);
      return bitmap;
    }).catch(err => {
      console.warn(`Frame decode failed for ${index}:`, err);
      return null;
    }).finally(() => {
      pending.delete(index);
    });

    pending.set(index, task);
    return task;
  }

  // --- Background decode worker: continuously decodes frames near center ---
  let warmTarget = 0;
  let warmDirection = 1;
  let warmRunning = false;
  const WARM_CONCURRENCY = 6; // Aggressive: 6 parallel decodes

  async function warmLoop() {
    if (warmRunning || disposed) return;
    warmRunning = true;

    while (!disposed) {
      const target = warmTarget;
      const dir = warmDirection;
      const half = Math.floor(cacheSize / 2);

      // Build list of frames to decode: priority order from target outward in direction
      const needed = [];

      if (dir <= 0) {
        // Going backward: prioritize behind, then ahead
        for (let d = 0; d <= half; d++) {
          const idx = target - d;
          if (idx >= 0 && !decoded.has(idx) && !pending.has(idx) && blobs.has(idx)) {
            needed.push(idx);
          }
        }
        for (let d = 1; d <= 30; d++) {
          const idx = target + d;
          if (idx < totalFrames && !decoded.has(idx) && !pending.has(idx) && blobs.has(idx)) {
            needed.push(idx);
          }
        }
      } else {
        // Going forward: prioritize ahead, then behind
        for (let d = 0; d <= half; d++) {
          const idx = target + d;
          if (idx < totalFrames && !decoded.has(idx) && !pending.has(idx) && blobs.has(idx)) {
            needed.push(idx);
          }
        }
        for (let d = 1; d <= 30; d++) {
          const idx = target - d;
          if (idx >= 0 && !decoded.has(idx) && !pending.has(idx) && blobs.has(idx)) {
            needed.push(idx);
          }
        }
      }

      if (needed.length === 0) {
        // Nothing to decode right now, wait a bit then check again
        await new Promise(r => setTimeout(r, 50));
        continue;
      }

      // Decode in batches of WARM_CONCURRENCY
      const batch = needed.slice(0, WARM_CONCURRENCY);
      await Promise.all(batch.map(idx => decodeSingle(idx)));

      // Evict far frames to keep memory bounded
      evictFarFrames();

      // Yield to main thread briefly so we don't block rAF
      await new Promise(r => setTimeout(r, 0));
    }

    warmRunning = false;
  }

  return {
    get readyCount() { return blobs.size; },
    get decodedCount() { return decoded.size; },

    load() {
      if (loading) return loading;
      loading = (async () => {
        let next = 0;
        const failures = [];
        await Promise.all(Array.from({ length: concurrency }, async () => {
          while (next < urls.length && !disposed && failures.length === 0) {
            const index = next++;
            try { await validate(index); } catch (error) { failures.push(error); }
          }
        }));
        if (failures.length) throw new AggregateError(failures, 'Intro assets are not ready');
        // Start background warm loop after all blobs are loaded
        warmLoop();
      })().finally(() => { loading = null; });
      return loading;
    },

    get(index) {
      return decodeSingle(index);
    },

    // SYNCHRONOUS cache lookup — the only function called from the rAF hot path.
    // Returns the exact frame if decoded, or the closest cached neighbor.
    // NEVER returns null for reasonable scroll speeds (200-frame window).
    getSync(index) {
      if (disposed) return null;
      currentCenter = index;

      // Exact hit (most common case)
      if (decoded.has(index)) {
        return decoded.get(index);
      }

      // Nearest neighbor scan: check ±1, ±2, ... up to ±20
      for (let d = 1; d <= 20; d++) {
        if (decoded.has(index - d)) return decoded.get(index - d);
        if (decoded.has(index + d)) return decoded.get(index + d);
      }

      // Extreme case: return any cached frame (should never happen with 200 cache)
      if (decoded.size > 0) {
        let bestIdx = 0, bestDist = Infinity;
        for (const k of decoded.keys()) {
          const dist = Math.abs(k - index);
          if (dist < bestDist) { bestDist = dist; bestIdx = k; }
        }
        return decoded.get(bestIdx);
      }

      return null;
    },

    // Update the warm target so the background loop decodes in the right direction
    setTarget(index, direction) {
      warmTarget = Math.round(index);
      warmDirection = direction;
      currentCenter = warmTarget;
      // Kick the warm loop if it stopped
      if (!warmRunning && !disposed) warmLoop();
    },

    dispose() {
      disposed = true;
      decoded.forEach(bitmap => bitmap?.close?.());
      decoded.clear();
      blobs.clear();
      pending.clear();
    }
  };
}
