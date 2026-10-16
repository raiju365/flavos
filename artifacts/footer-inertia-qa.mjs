import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /shader|webgl/i.test(m.text())) errors.push(m.text()); });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen'));
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => document.querySelector('.footer-signature')?.dataset.stickersLoaded === '6');
  const state = () => page.locator('.footer-signature').evaluate(el => ({
    rotation: el.dataset.rotation.split(',').map(Number),
    motion: el.dataset.motion.split(',').map(Number),
  }));
  const clip = { x: 230, y: 200, width: 980, height: 500 };
  await page.mouse.move(300, 300); await page.waitForTimeout(1600);
  const calm = await state();
  await page.mouse.move(1180, 620);
  await page.waitForTimeout(180);
  const right = await state();
  await page.screenshot({ path: 'artifacts/footer-inertia-turn.png', clip });
  assert.ok(right.motion[1] > .06, 'motion lifts the solid logo into depth');
  assert.ok(right.motion[0] < -.005, 'right turn banks with momentum');
  await page.waitForTimeout(2200);
  const settled = await state();
  assert.ok(settled.motion[1] < .025, 'depth response settles after input stops');
  assert.ok(Math.abs(settled.motion[0]) < .003, 'bank settles');
  await page.mouse.move(260, 240); await page.waitForTimeout(180);
  const reverse = await state();
  assert.ok(reverse.motion[0] > .005, 'reversing changes bank direction smoothly');
  await page.screenshot({ path: 'artifacts/footer-inertia-reverse.png', clip });
  await page.locator('.signature-footer').dispatchEvent('pointerleave');
  await page.waitForTimeout(2500);
  const released = await state();
  assert.ok(Math.abs(released.rotation[1]) < .04, 'release returns near the centre');
  assert.ok(released.motion[1] < .025, 'release settles the lift');
  await page.screenshot({ path: 'artifacts/footer-inertia-rest.png', clip });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(300);
  const reduced = await state();
  await page.mouse.move(1100, 800); await page.waitForTimeout(500);
  assert.deepEqual(await state(), reduced, 'reduced motion stays still under pointer input');
  assert.deepEqual(reduced.motion, [0, 0, 0]);
  assert.deepEqual(errors, []);
  const result = { calm, right, settled, reverse, released, reduced };
  await writeFile('artifacts/footer-inertia-qa.json', JSON.stringify(result, null, 2));
  console.log('PASS inertial turn, reversal, settling, pointer leave, reduced motion, shaders', result);
} finally { await browser.close(); }
