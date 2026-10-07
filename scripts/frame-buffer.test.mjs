import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameBuffer } from '../src/frame-buffer.js';

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const bitmap = () => ({ width: 1920, height: 1080, close() { this.closed = true; } });

test('a delayed middle frame holds readiness; all 758 consecutive frames are required', async () => {
  const stalled = deferred();
  const reached = deferred();
  const urls = Array.from({ length: 758 }, (_, i) => String(i));
  const requested = new Set();
  let progress = 0;
  let finished = false;
  const buffer = createFrameBuffer({
    urls,
    fetchImage: async url => {
      requested.add(url);
      if (url === '92') { reached.resolve(); await stalled.promise; }
      return url;
    },
    decodeImage: async () => bitmap(),
    onProgress: ready => { progress = ready; }
  });
  const loading = buffer.load().then(() => { finished = true; });
  await reached.promise;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(finished, false);
  assert.equal(progress, 757);
  stalled.resolve();
  await loading;
  assert.equal(progress, 758);
  assert.equal(requested.size, 758);
  buffer.dispose();
});

test('download is not readiness: a pending decode holds the loader', async () => {
  const decoding = deferred();
  const entered = deferred();
  const buffer = createFrameBuffer({
    urls: ['last'], fetchImage: async () => 'bytes',
    decodeImage: async () => { entered.resolve(); await decoding.promise; return bitmap(); }
  });
  const loading = buffer.load();
  await entered.promise;
  assert.equal(buffer.readyCount, 0);
  decoding.resolve();
  await loading;
  assert.equal(buffer.readyCount, 1);
  buffer.dispose();
});

test('a missing or corrupt frame blocks completion; retry preserves successful downloads', async () => {
  let broken = true;
  const attempts = { good: 0, bad: 0 };
  const buffer = createFrameBuffer({
    urls: ['good', 'bad'],
    fetchImage: async url => { attempts[url]++; return url; },
    decodeImage: async url => {
      if (url === 'bad' && broken) throw new Error('Corrupt image');
      return bitmap();
    }
  });
  await assert.rejects(buffer.load(), /not ready/);
  assert.equal(buffer.readyCount, 1);
  assert.deepEqual(attempts, { good: 1, bad: 3 });
  await assert.rejects(buffer.get(1), /not ready/);
  broken = false;
  await buffer.load();
  assert.equal(buffer.readyCount, 2);
  assert.deepEqual(attempts, { good: 1, bad: 4 });
  buffer.dispose();
});

test('decoded working set stays bounded and playback reuses local bytes without a network request', async () => {
  let requests = 0;
  const buffer = createFrameBuffer({
    urls: ['0', '1', '2'], cacheSize: 2,
    fetchImage: async url => { requests++; return url; },
    decodeImage: async () => bitmap()
  });
  await buffer.load();
  const first = await buffer.get(0);
  const second = await buffer.get(1);
  await buffer.get(2);
  assert.equal(first.closed, true);
  assert.equal(buffer.decodedCount, 2);
  const redecoded = await buffer.get(0);
  assert.notEqual(redecoded, first);
  assert.equal(second.closed, true);
  assert.equal(requests, 3);
  buffer.dispose();
  assert.equal(redecoded.closed, true);
  assert.equal(buffer.decodedCount, 0);
  assert.equal(buffer.readyCount, 0);
});

test('dispose closes a decode still in flight instead of repopulating the cache', async () => {
  const late = deferred();
  let validation = true;
  const result = bitmap();
  const buffer = createFrameBuffer({
    urls: ['0'], fetchImage: async () => 'bytes',
    decodeImage: async () => validation ? bitmap() : late.promise
  });
  await buffer.load();
  validation = false;
  const pending = buffer.get(0);
  buffer.dispose();
  late.resolve(result);
  assert.equal(await pending, null);
  assert.equal(result.closed, true);
  assert.equal(buffer.decodedCount, 0);
});
