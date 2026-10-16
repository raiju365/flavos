import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const recordingStart = Date.now(), errors = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: 'artifacts/sticker-duplex-clean-video', size: { width: 1280, height: 800 } } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen'), undefined, { timeout: 45000 });
  await page.locator('#contact').scrollIntoViewIfNeeded(); await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(600);
  const start = (Date.now() - recordingStart) / 1000;
  await page.waitForTimeout(600);
  for (const index of [2, 4]) {
    const button = page.locator(`.footer-sticker-trigger[data-sticker="${index}"]`), rect = await button.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2, { steps: 8 }); await page.waitForTimeout(120); await button.click();
    await page.waitForFunction(() => document.querySelector('.sticker-viewer').dataset.phase === 'open');
    await page.waitForTimeout(700);
    if (index === 2) {
      await page.mouse.move(640, 400); await page.mouse.down();
      await page.mouse.move(850, 440, { steps: 28 }); await page.mouse.up(); await page.waitForTimeout(700);
      await page.locator('.sticker-viewer-canvas').focus(); await page.keyboard.press('Home'); await page.waitForTimeout(700);
    }
    await page.locator('.sticker-viewer-close').click();
    await page.waitForFunction(() => !document.querySelector('.sticker-viewer').open);
    await page.waitForTimeout(700);
  }
  const duration = (Date.now() - recordingStart) / 1000 - start;
  const video = page.video(); await page.close(); await video.saveAs('artifacts/sticker-duplex-clean-preview-raw.webm');
  await writeFile('artifacts/sticker-duplex-clean-preview.json', JSON.stringify({ start, duration, errors }, null, 2));
  assert.deepEqual(errors, []);
  console.log('Saved live peel, 360 inspection and conforming return', JSON.stringify({ start, duration }));
} finally { await browser.close(); }


