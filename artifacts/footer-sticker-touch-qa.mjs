import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [], results = [];
try {
  for (const touch of [true, false]) {
    const width = touch ? 390 : 1440, height = touch ? 844 : 900;
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' || /inspection unavailable/i.test(message.text())) errors.push(message.text()); });
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen'));
    await page.locator('#contact').scrollIntoViewIfNeeded(); await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(500);
    const button = page.locator('.footer-sticker-trigger').first();
    const rect = await button.boundingBox();
    if (touch) await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
    else { await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.waitForTimeout(80); await button.click(); }
    await page.waitForFunction(() => document.querySelector('.sticker-viewer').dataset.phase === 'open');
    const before = await page.locator('.sticker-viewer').getAttribute('data-rotation');
    if (touch) {
      const client = await page.context().newCDPSession(page);
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: width / 2, y: height / 2, id: 1, radiusX: 2, radiusY: 2, force: .6 }] });
      assert.equal(await page.locator('.sticker-viewer').getAttribute('data-dragging'), 'true');
      for (let i = 1; i <= 14; i++) {
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: width / 2 + i * 8, y: height / 2 + i * 2, id: 1, radiusX: 2, radiusY: 2, force: .6 }] });
        await page.waitForTimeout(20);
      }
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(350);
      assert.notEqual(await page.locator('.sticker-viewer').getAttribute('data-rotation'), before);
      assert.equal(await page.locator('.sticker-viewer').getAttribute('data-dragging'), null);
      await page.screenshot({ path: 'artifacts/sticker-viewer-touch-drag.png' });
      await page.touchscreen.tap(8, height / 2);
    } else await page.locator('.sticker-viewer-close').click();
    await page.waitForFunction(() => !document.querySelector('.sticker-viewer').open);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    const source = page.locator('.footer-signature');
    if (!touch) {
      await page.mouse.move(width * .13, height * .15); await page.waitForTimeout(700);
      const left = await source.getAttribute('data-rotation');
      await page.mouse.move(width * .87, height * .85); await page.waitForTimeout(700);
      const right = await source.getAttribute('data-rotation');
      assert.notEqual(left, right, 'original logo pointer motion resumes after closing');
    }
    const light = await source.getAttribute('data-light'); await page.waitForTimeout(350);
    assert.notEqual(await source.getAttribute('data-light'), light);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    results.push({ touch, sourceResumed: true, overflowRestored: true });
    console.log('PASS', touch ? 'real browser touch input, drag, outside tap and recovery' : 'desktop close restores logo pointer response');
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile('artifacts/sticker-viewer-touch-qa.json', JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
