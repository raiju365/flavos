import assert from 'node:assert/strict';
import { initFooterGradient } from '../src/footer-gradient.js';

// Exercise scheduling without a browser preference change or real timers.
const callbacks = new Map(), events = new Map(), motionEvents = new Map();
let serial = 0, draws = 0, uploads = 0, removed = false, intersection, sizing, creations = 0;
const context = {
  fillRect() { draws++; }, save() {}, restore() {}, setTransform() {},
  createLinearGradient() { return { addColorStop() {} }; },
  drawImage() { draws++; },
  createImageData(width,height) { return {data:new Uint8ClampedArray(width*height*4)}; },
  putImageData() { uploads++; },
};
const canvas = { getContext: () => context, setAttribute() {}, remove() { removed = true; } };
const footer = { clientWidth: 1440, clientHeight: 900, prepend() {} };
const motion = {
  matches: false,
  addEventListener(name, fn) { motionEvents.set(name, fn); },
  removeEventListener(name) { motionEvents.delete(name); },
};
globalThis.document = {
  hidden: false, querySelector: () => footer,
  createElement: () => creations++ === 0 ? canvas : {getContext:()=>context},
  addEventListener(name, fn) { events.set(name, fn); },
  removeEventListener(name) { events.delete(name); },
};
globalThis.matchMedia = () => motion;
globalThis.getComputedStyle = () => ({ getPropertyValue: name => name === '--folio-ink' ? '#20235b' : '#f8f7f3' });
globalThis.devicePixelRatio = 2;
globalThis.requestAnimationFrame = fn => { callbacks.set(++serial, fn); return serial; };
globalThis.cancelAnimationFrame = id => callbacks.delete(id);
globalThis.IntersectionObserver = class {
  constructor(fn) { intersection = fn; }
  observe() {} disconnect() {}
};
globalThis.ResizeObserver = class {
  constructor(fn) { sizing = fn; }
  observe() {} disconnect() {}
};
const advance = now => {
  const pending = [...callbacks.values()]; callbacks.clear();
  pending.forEach(fn => fn(now));
};
const dispose = initFooterGradient();
assert.ok(draws > 0, 'initial static prism paints');
assert.equal(callbacks.size, 0, 'offscreen startup schedules no animation');
assert.equal(canvas.width, 1600, 'large canvas respects resolution cap');
assert.equal(uploads,1,'gradient atlas uploads once');
intersection([{ isIntersecting: true, intersectionRatio:.01 }]);
assert.equal(callbacks.size,0,'entry waits for a visible portion of the footer');
intersection([{ isIntersecting: true, intersectionRatio:.2 }]);
advance(100); const initial = draws; advance(150);
assert.ok(draws > initial, 'visible prism animates');
assert.equal(uploads,1,'animation reuses the cached atlas');
intersection([{ isIntersecting: false }]);
const stopped = draws; advance(200);
assert.equal(draws, stopped, 'offscreen prism pauses');
motion.matches = true; motionEvents.get('change')();
intersection([{ isIntersecting: true }]);
assert.equal(callbacks.size, 0, 'reduced motion remains static when visible');
footer.clientWidth = 320; footer.clientHeight = 640; sizing();
assert.equal(canvas.width, 480, 'mobile resize retains sharp facets');
assert.ok(draws > stopped, 'reduced motion repaints on resize');
motion.matches = false; motionEvents.get('change')();
assert.equal(callbacks.size, 1, 'motion resumes after preference change');
document.hidden = true; events.get('visibilitychange')();
assert.equal(callbacks.size, 0, 'hidden tab pauses');
document.hidden = false; events.get('visibilitychange')();
assert.equal(callbacks.size, 1, 'visible tab resumes');
dispose();
assert.equal(callbacks.size, 0);
assert.equal(events.size, 0);
assert.equal(motionEvents.size, 0);
assert.equal(removed, true);
console.log('PASS prism animation, offscreen pause, reduced-motion scheduling, resize, hidden-tab pause, resume, disposal');
