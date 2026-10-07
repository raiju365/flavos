import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const errors = [], results = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(`${m.text()} ${m.location().url}`); });
const state = () => page.evaluate(() => {
  const d = document.querySelector('#project-gallery'), b = document.querySelector('#open-projects');
  const r = b.getBoundingClientRect();
  return { open: d.open, phase: d.dataset.entryPhase, clip: getComputedStyle(d).clipPath, overflow: document.documentElement.scrollWidth - innerWidth, locked: document.documentElement.classList.contains('lenis-stopped'), bodyOverflow: document.body.style.overflow, focus: document.activeElement.id || document.activeElement.className, button: { x: r.x, y: r.y, width: r.width, height: r.height }, scroll: scrollY };
});
const textMotion = () => page.locator('#open-projects').evaluate(b => ({
  first: getComputedStyle(b.querySelector('.work-entry-first')).transform,
  last: getComputedStyle(b.querySelector('.work-entry-last')).transform,
  extraElements: b.querySelectorAll('.work-entry-meta, .work-entry-foot, .work-entry-rule, svg').length,
}));
async function settled() { await page.waitForFunction(() => document.querySelector('#project-gallery').dataset.entryPhase === 'idle'); }
async function closed() { await page.waitForFunction(() => !document.querySelector('#project-gallery').open); await page.waitForTimeout(80); }
try {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.isMainPageReady && document.body.style.overflow !== 'hidden', { timeout: 60000 });
  results.push({ test: 'real loader', ready: true });
  await page.locator('.studio-link[href="#projects"]').click();
  await page.waitForFunction(() => !document.documentElement.classList.contains('is-colonnade-transitioning'));
  await page.waitForTimeout(600);
  await page.mouse.move(40, 300);
  results.push({ test: 'desktop entry', ...await state() });
  await page.screenshot({ path: 'artifacts/work-entry-desktop.png' });
  await page.locator('#open-projects').hover();
  await page.waitForTimeout(850);
  const hover = await textMotion();
  assert.equal(hover.extraElements, 0);
  assert.notEqual(hover.first, 'matrix(1, 0, 0, 1, 0, 0)');
  assert.notEqual(hover.last, 'matrix(1, 0, 0, 1, 0, 0)');
  results.push({ test: 'text hover', ...hover });
  await page.screenshot({ path: 'artifacts/work-entry-hover.png' });
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(5, 5);
    await page.locator('#open-projects').hover();
  }
  await page.mouse.move(5, 5);
  await page.waitForTimeout(1000);
  const returned = await textMotion();
  assert.equal(returned.first, 'matrix(1, 0, 0, 1, 0, 0)');
  assert.equal(returned.last, 'matrix(1, 0, 0, 1, 0, 0)');
  results.push({ test: 'rapid hover / return', ...returned });
  await page.locator('#open-projects').click();
  await page.waitForTimeout(490);
  results.push({ test: 'opening intermediate', ...await state() });
  await page.screenshot({ path: 'artifacts/work-entry-transition.png' });
  await settled();
  results.push({ test: 'opened', ...await state() });
  await page.screenshot({ path: 'artifacts/work-entry-gallery.png' });
  await page.keyboard.press('Escape'); await closed();
  results.push({ test: 'escape close', ...await state() });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await closed();
  results.push({ test: 'interrupt opening / repeated Escape', ...await state() });
  await page.keyboard.press('Space'); await settled();
  await page.keyboard.press('Home'); await page.keyboard.press('Enter');
  await page.waitForTimeout(850);
  results.push({ test: 'keyboard detail', title: await page.locator('#orbit-detail-title').textContent(), ...await state() });
  await page.keyboard.press('Escape'); await page.waitForTimeout(850);
  await page.locator('.orbit-close').click(); await closed();
  for (const [width, height] of [[820,1180],[390,844],[360,640]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(500);
    await page.locator('#open-projects').evaluate(b => window.scrollTo({ top: scrollY + b.getBoundingClientRect().top + b.offsetHeight / 2 - innerHeight / 2, behavior: 'instant' }));
    await page.waitForTimeout(800);
    await page.mouse.move(0, 0);
    results.push({ test: `entry ${width}`, ...await state() });
    await page.screenshot({ path: `artifacts/work-entry-${width}.png` });
    await page.locator('#open-projects').click(); await settled();
    results.push({ test: `gallery ${width}`, ...await state() });
    await page.locator('.orbit-close').click(); await closed();
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#open-projects').hover();
  const reduced = await textMotion();
  assert.equal(reduced.first, 'none'); assert.equal(reduced.last, 'none');
  results.push({ test: 'reduced motion text', ...reduced });
  await page.locator('#open-projects').focus(); await page.keyboard.press('Enter');
  results.push({ test: 'reduced motion open', ...await state(), rotationDisabled: await page.locator('.orbit-toggle').isDisabled() });
  await page.keyboard.press('Escape'); await closed();
  results.push({ test: 'reduced motion close', ...await state() });
} finally {
  await writeFile('artifacts/work-entry-qa.json', JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
