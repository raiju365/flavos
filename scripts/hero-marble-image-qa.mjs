import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const before = process.argv.includes('--before');
const errors = [], results = [];
try {
  for (const [width, height, reduced, fallback] of before ? [[1742, 926, false, false]] : [[1742, 926, false, false], [820, 1000, false, false], [390, 844, false, false], [320, 700, false, false], [390, 844, true, false], [390, 844, false, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    if (fallback) await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) { return /^webgl/.test(type) ? null : getContext.call(this, type, ...args); };
    });
    await page.goto('http://127.0.0.1:5174/');
    await page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen'));
    await page.waitForTimeout(1100);
    for (const progress of [0, .3, .45, .55, .65, .75, .9, .65, .45, 0]) {
      await page.evaluate(y => scrollTo(0, y), height * (reduced ? .7 : 1.8) * progress);
      await page.waitForTimeout(400);
      const state = await page.locator('#hero').evaluate(hero => ({ ...hero.dataset, overflow: document.documentElement.scrollWidth - innerWidth, locked: document.body.style.overflow === 'hidden', top: hero.getBoundingClientRect().top, paintingOpacity: getComputedStyle(hero.querySelector('.hero-destination')).opacity }));
      assert.equal(state.overflow, 0);
      assert.equal(state.locked, false);
      assert.equal(state.paintingOpacity, '1');
      assert.ok(Math.abs(state.top) < 2);
      const coverage = await page.locator('.hero-destination-image').evaluate(image => {
        const r=image.getBoundingClientRect();
        return { src:decodeURIComponent(image.currentSrc), loaded:image.complete&&image.naturalWidth>0, left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:innerWidth, height:innerHeight };
      });
      assert.ok(coverage.loaded);
      assert.ok(coverage.src.endsWith('/Sidang Kekaisaran Romawi di Aula Marmer.png'));
      assert.ok(coverage.left<=0&&coverage.top<=0&&coverage.right>=coverage.width&&coverage.bottom>=coverage.height,JSON.stringify(coverage));
      results.push({ width, reduced, fallback, progress, state });
      if ([0,.45,.65,.9].includes(progress)) await page.screenshot({ path: `artifacts/marble-${before ? 'before' : 'after'}-${width}-${reduced}-${fallback}-${progress}.png` });
    }
    if (!before && width === 1742) {
      await page.mouse.move(400, 250); await page.mouse.move(520, 340);
      await page.waitForTimeout(100);
      assert.equal(await page.locator('.hero-aperture').getAttribute('data-trail-state'), 'active');
      await page.waitForTimeout(3500);
      assert.equal(await page.locator('.hero-aperture').getAttribute('data-trail-state'), 'idle');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.mouse.wheel(0, 850); await page.waitForTimeout(1200);
      assert.ok(Number(await page.locator('#hero').getAttribute('data-entry-progress')) > .1);
      await page.mouse.wheel(0, -850); await page.waitForTimeout(1200);
    }
    await page.evaluate(y => scrollTo(0, y), height * 3.4);
    await page.waitForTimeout(400);
    assert.ok(await page.locator('#hero').evaluate(hero => hero.getBoundingClientRect().bottom < innerHeight));
    console.log('PASS', width, { reduced, fallback });
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(`artifacts/marble-${before ? 'before' : 'after'}-qa.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}

