import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const sharp = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json')('sharp');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, options, ...rest) {
      return original.call(this, type, /webgl/.test(type) ? { ...options, preserveDrawingBuffer: true } : options, ...rest);
    };
  });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen'));
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => document.querySelector('.footer-signature')?.dataset.stickersLoaded === '6');
  await page.waitForTimeout(500);
  const image = await page.locator('.footer-signature-canvas').evaluate(canvas => canvas.toDataURL('image/png'));
  const logo = await sharp(Buffer.from(image.split(',')[1], 'base64')).trim().resize({ width: 1200, height: 430, fit: 'inside' }).png().toBuffer();
  await sharp({ create: { width: 1236, height: 444, channels: 4, background: '#00000000' } }).composite([{ input: logo, gravity: 'centre' }]).webp({ quality: 94, alphaQuality: 100 }).toFile('public/footer/signature-3d-poster.webp');
  console.log('Exported transparent 3D render: public/footer/signature-3d-poster.webp');
} finally { await browser.close(); }
