import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the real orchestration and scrub functions with controlled network,
// paint, and input boundaries. These tests do not substitute for browser QA.
const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const loadingCode = source.slice(source.indexOf('// --- Loading Screen Logic ---'), source.indexOf('function startFrameSequence()'));
const scrubCode = source.slice(source.indexOf('  function updateFrameScrub('), source.indexOf('  function renderDustParticles('));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = () => new Promise(resolve => setImmediate(resolve));

function harness() {
  const frames = deferred(), page = deferred(), painted = deferred(), opening = deferred();
  const calls = [];
  const loader = { dataset: {} };
  const context = vm.createContext({
    document: { getElementById: () => loader, body: { style: {} } },
    window: { innerWidth: 1440, addEventListener() {}, removeEventListener() {}, playHoldIndicatorEntrance() {} },
    prefersReducedMotion: { matches: false },
    createKineticLoader: () => ({
      clearError() {}, setProgress() {},
      reveal: () => { calls.push('reveal'); return opening.promise; },
      showError: retry => { calls.push('error'); context.retry = retry; }
    }),
    createFrameBuffer: () => ({ load: () => frames.promise }),
    preparePageAssets: () => page.promise,
    nextPaint: () => painted.promise,
    forceResetScrollToTop() {},
    lenis: { start: () => calls.push('unlock') },
    render: async () => { calls.push('draw'); return true; },
    queueMicrotask: callback => { context.start = callback; },
    console: { error() {} }
  });
  vm.runInContext(`${loadingCode}\nrenderFrame = render;`, context);
  return { context, frames, page, painted, opening, calls };
}

test('all frames alone cannot dismiss the loader while the next page is still loading', async () => {
  const h = harness();
  const done = h.context.start();
  h.frames.resolve();
  await flush();
  assert.deepEqual(h.calls, []);
  h.page.resolve();
  await flush();
  assert.deepEqual(h.calls, ['draw']);
  h.painted.resolve();
  await flush();
  assert.deepEqual(h.calls, ['draw', 'reveal']);
  assert.equal(vm.runInContext('introInputReady', h.context), false);
  h.opening.resolve();
  await done;
  assert.deepEqual(h.calls, ['draw', 'reveal', 'unlock']);
  assert.equal(vm.runInContext('introInputReady', h.context), true);
});

test('failed assets leave input locked and allow an explicit retry', async () => {
  const h = harness();
  const done = h.context.start();
  h.frames.reject(new Error('Unavailable image'));
  h.page.resolve();
  await done;
  assert.deepEqual(h.calls, ['error']);
  assert.equal(typeof h.context.retry, 'function');
  assert.equal(vm.runInContext('introInputReady', h.context), false);
  assert.equal(vm.runInContext('introAssetsReady', h.context), false);
});

test('jumping scroll to the end cannot hand off a half-rendered sequence', () => {
  let handoffs = 0;
  const context = vm.createContext({
    isIntroCompleted: false, introInputReady: true,
    targetFrameProgress: 1, smoothedFrameProgress: 0.4,
    TOTAL_FRAMES: 758, lastDrawnFrame: 300, renderingFrame: false,
    lastRenderedFrameFloat: 300, currentFrameFloat: 300,
    canvas: { style: {} }, dustCanvas: null,
    document: { getElementById: () => null },
    renderFrame() {}, finishIntro() { handoffs++; }
  });
  vm.runInContext(scrubCode, context);
  context.updateFrameScrub(16);
  assert.equal(handoffs, 0);
  context.smoothedFrameProgress = 1;
  context.updateFrameScrub(16);
  assert.equal(handoffs, 0, 'raw scroll cannot override the actually drawn frame');
  context.lastDrawnFrame = 757;
  context.renderingFrame = true;
  context.updateFrameScrub(16);
  assert.equal(handoffs, 0, 'wait for the final decode/draw task to settle');
  context.renderingFrame = false;
  context.updateFrameScrub(16);
  assert.equal(handoffs, 1);
});
