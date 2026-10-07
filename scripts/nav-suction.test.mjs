import assert from 'node:assert/strict';
import { sampleNavGlyph, initNavSuction } from '../src/nav-suction.js';

// Check the full responsive distance range, including the mobile bottom CTA.
for (const dx of [-720, -90, 90, 720]) {
  const glyph = { dx, dy: -600, delay: .23, tension: 4, arc: 10 };
  const rest = sampleNavGlyph(0, glyph);
  assert.equal(rest.x, 0);
  assert.equal(rest.y, 0);
  assert.equal(rest.scaleX, 1);
  assert.equal(rest.scaleY, 1);
  assert.equal(rest.hidden, false);
  const end = sampleNavGlyph(1, glyph);
  assert.equal(end.x, dx);
  assert.equal(end.y, -600);
  assert.equal(end.hidden, true);
  const forward = Array.from({ length: 101 }, (_, i) => sampleNavGlyph(i / 100, glyph));
  for (let i = 100; i >= 0; i--) {
    assert.deepEqual(sampleNavGlyph(i / 100, glyph), forward[i], 'Reverse scroll must retrace without hysteresis');
    for (const key of ['x', 'y', 'scaleX', 'scaleY', 'skew', 'blur']) assert.ok(Number.isFinite(forward[i][key]));
    assert.ok(forward[i].scaleX > 0 && forward[i].scaleY > 0, 'Glyphs must not invert');
  }
}

const mobileWord = { dx: 30, groupDx: 0, dy: -740, delay: .1, tension: 1, arc: 0, vertical: true };
for (const p of [.25, .5, .75]) {
  assert.equal(sampleNavGlyph(p, mobileWord).y, sampleNavGlyph(p, { ...mobileWord, dx: -30 }).y);
  assert.equal(sampleNavGlyph(p, mobileWord).skew, 0, 'Mobile CTA must travel as one word');
}

function element(rect) {
  return {
    style: { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } },
    dataset: {},
    classList: { values: new Set(), toggle(k, on) { on ? this.values.add(k) : this.values.delete(k); }, remove(k) { this.values.delete(k); } },
    setAttribute() {}, remove() { this.removed = true; },
    append(child) { this.child = child; },
    getBoundingClientRect() { return rect; }, getClientRects() { return [rect]; },
  };
}
const cell = element({ left: 500, top: 35, width: 10, height: 20 });
const link = element({ left: 490, top: 25, width: 80, height: 40 });
link.querySelectorAll = () => [cell];
link.querySelector = () => link;
const header = element({ left: 0, top: 0 });
const image = element({ left: 703, top: 29, width: 34, height: 34 });
globalThis.document = { createElement: () => element({}) };
globalThis.getComputedStyle = () => ({ display: 'inline-flex' });
const suction = initNavSuction(header, [link], image);
suction.measure();
suction.render(.6, false);
const beforeResize = cell.style.transform;
assert.equal(header.dataset.navFlow, 'flowing');
suction.measure();
assert.equal(cell.style.transform, beforeResize, 'Remeasure must preserve the in-flight pose');
suction.render(.6, true);
assert.equal(cell.style.transform, undefined);
assert.equal(header.dataset.navFlow, 'reduced');
suction.render(1, false);
assert.equal(cell.style.visibility, 'hidden');
suction.render(0, false);
assert.equal(cell.style.visibility, undefined);
assert.equal(cell.style.filter, undefined);
suction.render(Number.EPSILON, false);
assert.equal(header.dataset.navFlow, 'rest', 'Floating point residue must not disable hover');
assert.equal(cell.style.transform, undefined);
suction.render(.5, false);
suction.destroy();
assert.equal(cell.style.transform, undefined);
assert.equal(header.dataset.navFlow, undefined);
assert.equal(header.classList.values.has('is-nav-suction'), false);
console.log('PASS: glyph endpoints, responsive distances, reverse continuity, resize, reduced motion and disposal');
