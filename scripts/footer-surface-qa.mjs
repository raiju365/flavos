import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /shader|webgl|three/i.test(message.text())) errors.push(message.text());
  });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen'));
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForSelector('.has-signature-3d');
  await page.waitForFunction(() => document.querySelector('.footer-signature')?.dataset.stickersLoaded === '6');
  await page.mouse.move(720, 450);
  await page.waitForTimeout(1500);
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(500);
    await page.screenshot({ path: `artifacts/footer-surface-${i}.png`, clip: { x: 250, y: 230, width: 940, height: 440 } });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(300);
  const canvas = page.locator('.footer-signature-canvas');
  const before = await canvas.screenshot();
  await page.waitForTimeout(900);
  assert.ok(before.equals(await canvas.screenshot()), 'reduced-motion canvas must stay static');
  assert.deepEqual(errors, []);
  console.log('PASS surface shader compilation, three motion samples, static reduced-motion canvas');
} finally { await browser.close(); }
