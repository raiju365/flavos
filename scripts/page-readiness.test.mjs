import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePageAssets } from '../src/page-readiness.js';

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

function documentFixture(t, image, fontPromise = Promise.resolve()) {
  const originalDocument = globalThis.document;
  const originalStyle = globalThis.getComputedStyle;
  globalThis.document = {
    querySelectorAll: selector => selector.endsWith('img') ? [image] : [{ textContent: 'Heading' }],
    fonts: { load: () => fontPromise, ready: Promise.resolve() }
  };
  globalThis.getComputedStyle = () => ({ fontStyle: 'normal', fontWeight: '400', fontFamily: 'Instrument Serif' });
  t.after(() => {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalStyle === undefined) delete globalThis.getComputedStyle;
    else globalThis.getComputedStyle = originalStyle;
  });
}

test('hidden/lazy page images and fonts must both finish before the page is ready', async t => {
  const imageDecode = deferred(), font = deferred();
  const image = { loading: 'lazy', naturalWidth: 1920, src: '/hero.png', decode: () => imageDecode.promise };
  documentFixture(t, image, font.promise);
  let ready = false;
  const preparation = preparePageAssets().then(() => { ready = true; });
  assert.equal(image.loading, 'eager');
  font.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ready, false);
  imageDecode.resolve();
  await preparation;
  assert.equal(ready, true);
});

test('a failed hero image is retried and never reported as a ready page', async t => {
  let attempts = 0;
  const image = {
    loading: 'lazy', naturalWidth: 0, src: '/hero.png',
    decode: async () => { attempts++; throw new Error('Image unavailable'); }
  };
  documentFixture(t, image);
  await assert.rejects(preparePageAssets(), /not ready/);
  assert.equal(attempts, 3);
});
