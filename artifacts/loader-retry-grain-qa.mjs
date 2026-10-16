import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  let fail = true;
  await page.route('**/footer/stickers/web/SMILE.webp', route => fail ? route.abort('failed') : route.continue());
  await page.goto('http://127.0.0.1:4175/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#loading-screen')?.dataset.phase === 'error');
  const state = await page.evaluate(() => ({ opacity: getComputedStyle(document.querySelector('.tv-noise')).opacity,
    visibility: getComputedStyle(document.querySelector('.tv-noise')).visibility,
    renderer: document.querySelector('.tv-noise').dataset.noiseRenderer || null }));
  assert.deepEqual(state, { opacity: '0', visibility: 'hidden', renderer: null });
  await page.screenshot({ path: 'artifacts/loader-clean-error.png' });
  fail = false;
  await page.locator('.loader-retry').click();
  await page.waitForFunction(() => !document.querySelector('#loading-screen') && getComputedStyle(document.querySelector('.tv-noise')).opacity === '0.1');
  const firstPixels = await page.evaluate(() => Array.from(document.querySelector('.tv-noise-canvas').getContext('2d').getImageData(0,0,8,8).data));
  await page.waitForTimeout(150);
  const secondPixels = await page.evaluate(() => Array.from(document.querySelector('.tv-noise-canvas').getContext('2d').getImageData(0,0,8,8).data));
  assert.notDeepEqual(firstPixels, secondPixels, 'TV grain animates after loading');
  await page.locator('#projects').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.locator('#projects .orbit-card[data-index="0"]').focus();
  await page.keyboard.press('Home');
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('#project-gallery').open && document.querySelector('#project-gallery').dataset.scenePhase === 'idle');
  assert.equal(await page.locator('#project-gallery > .tv-noise.is-active').count(), 1);
  assert.equal(await page.locator('.tv-noise').count(), 1);
  assert.equal(await page.locator('.tv-noise').evaluate(el => getComputedStyle(el).opacity), '0.1');
  await page.screenshot({ path: 'artifacts/loader-grain-gallery-after.png' });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#project-gallery').open);
  assert.equal(await page.locator('body > .tv-noise.is-active').count(), 1);
  assert.deepEqual(errors, []);
  await writeFile('artifacts/loader-retry-grain-qa.json', JSON.stringify({ errorState: state, retry: true, animatedGrain: true, galleryRetainsGrain: true, errors }, null, 2));
  console.log('PASS clean loader on error/retry, animated grain after loading, gallery coverage');
} finally { await browser.close(); }
