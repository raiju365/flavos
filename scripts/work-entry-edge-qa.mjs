import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const results = [], errors = [];
try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:5173/#projects', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.isMainPageReady && document.body.style.overflow !== 'hidden');
    // Use the actual navigation after loading; direct-hash handling is also recorded.
    results.push({ test: `direct hash / ${reducedMotion}`, hash: await page.evaluate(() => location.hash) });
    await page.locator('.studio-link[href="#projects"]').tap();
    await page.waitForTimeout(reducedMotion === 'reduce' ? 200 : 3200);
    await page.locator('#open-projects').tap();
    await page.waitForFunction(() => document.querySelector('#project-gallery').dataset.entryPhase === 'idle');
    assert.equal(await page.locator('#project-gallery').evaluate(d => d.open), true);
    if (reducedMotion === 'reduce') {
      const angle = await page.locator('.orbit-stage').getAttribute('data-angle');
      await page.waitForTimeout(400);
      assert.equal(await page.locator('.orbit-stage').getAttribute('data-angle'), angle);
      assert.equal(await page.locator('#project-gallery').evaluate(d => getComputedStyle(d).clipPath), 'none');
      await page.screenshot({ path: 'artifacts/work-entry-reduced-mobile.png' });
    }
    await page.locator('.orbit-close').tap();
    await page.waitForFunction(() => !document.querySelector('#project-gallery').open && document.body.style.overflow !== 'hidden');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'open-projects');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lenis-stopped')), false);
    results.push({ test: `touch open and close / ${reducedMotion}`, passed: true });
    if (reducedMotion === 'no-preference') {
      await page.locator('#open-projects').tap();
      await page.waitForTimeout(150);
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForFunction(() => document.querySelector('#project-gallery').dataset.entryPhase === 'idle');
      assert.equal(await page.locator('#project-gallery').evaluate(d => getComputedStyle(d).clipPath), 'none');
      await page.locator('.orbit-close').tap();
      await page.waitForTimeout(100);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => !document.querySelector('#project-gallery').open && !document.documentElement.classList.contains('lenis-stopped'));
      results.push({ test: 'resize during opening and closing', passed: true });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  console.log(JSON.stringify({ results, errors }, null, 2));
  await writeFile('artifacts/work-entry-edge-qa.json', JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
