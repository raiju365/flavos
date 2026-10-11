import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  await page.route('**/__gradient-cycle', route => route.fulfill({ contentType: 'text/html', body: '<div class="signature-footer" style="width:1000px;height:700px;--folio-ink:#20235b;--folio-paper:#f8f7f3"></div>' }));
  await page.goto('http://localhost:5173/__gradient-cycle');
  const result = await page.evaluate(async () => {
    let callback;
    window.requestAnimationFrame = cb => { callback = cb; return 1; };
    window.cancelAnimationFrame = () => { callback = null; };
    window.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe() { this.cb([{ isIntersecting: true }]); } disconnect() {} };
    window.ResizeObserver = class { observe() {} disconnect() {} };
    const { initFooterGradient } = await import('/src/footer-gradient.js');
    const dispose = initFooterGradient();
    const canvas = document.querySelector('.footer-flow');
    const pixels = () => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const first = pixels(); let previous = first, maxStep = 0;
    const samples = [{ seconds: 0, image: canvas.toDataURL() }];
    const differences = [];
    callback(100);
    for (let i = 1; i <= 1200; i++) {
      callback(100 + i * 50);
      const next = pixels();
      for (let p = 0; p < next.length; p += 4) {
        maxStep = Math.max(maxStep, Math.abs(next[p] - previous[p]));
      }
      previous = next;
      if ([80, 160, 280, 400, 560, 800, 1200].includes(i)) {
        let difference = 0;
        for (let p = 0; p < next.length; p += 4) difference += Math.abs(next[p] - first[p]);
        differences.push({ seconds: i / 20, meanDifference: difference / (next.length / 4) });
        samples.push({ seconds: i / 20, image: canvas.toDataURL() });
      }
    }
    dispose();
    return { differences, maxStep, frames: 1200, samples };
  });
  // Evolving mesh should not reset to its starting composition at 14/28 seconds.
  for (const sample of result.differences) assert.ok(sample.meanDifference > 8, `composition evolves at ${sample.seconds}s`);
  assert.ok(result.maxStep < 16, `no abrupt gradient steps at 50ms sampling: ${result.maxStep}`);
  for (const sample of result.samples) await writeFile(`artifacts/footer-mesh-${sample.seconds}s.png`, Buffer.from(sample.image.split(',')[1], 'base64'));
  delete result.samples;
  console.log('PASS 60 seconds of continuous, varied motion', result);
} finally { await browser.close(); }
