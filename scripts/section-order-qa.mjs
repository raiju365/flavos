import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const results = [], errors = [];
try {
  const cases = process.env.QA_REDUCED_ONLY ? [[390,844,'reduce']] : [[1440,900,'no-preference'],[390,844,'no-preference'],[390,844,'reduce']];
  for (const [width, height, reducedMotion] of cases) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.isMainPageReady && document.body.style.overflow !== 'hidden');
    const order = await page.evaluate(() => ({
      sections: [...document.querySelectorAll('#main-content > section[id]')].map(e => e.id),
      nav: [...document.querySelectorAll('.studio-desktop > a')].map(e => e.hash),
      chapter: document.querySelector('.about-chapter-title')?.textContent ?? null,
    }));
    assert.deepEqual(order.sections, ['hero','about','projects','tools']);
    assert.deepEqual(order.nav, ['#hero','#about','#hero','#projects','#tools']);
    if (reducedMotion === 'no-preference') assert.equal(order.chapter, 'Work.');
    results.push({ test: 'order', width, reducedMotion, ...order });
    for (const id of ['about','projects','tools','hero','contact']) {
      await page.locator(`.studio-link[href="#${id}"]`).click();
      await page.waitForFunction(id => location.hash === `#${id}` && !document.documentElement.classList.contains('is-colonnade-transitioning'), id);
      await page.waitForTimeout(200);
      const state = await page.evaluate(id => {
        const logo = document.querySelector('.studio-brand').getBoundingClientRect();
        return {
          id, current: document.querySelector('.studio-link[aria-current]')?.hash,
          locked: document.documentElement.classList.contains('lenis-stopped'),
          overflow: document.documentElement.scrollWidth - innerWidth,
          brandOffset: logo.left + logo.width / 2 - innerWidth / 2,
          photoTransform: getComputedStyle(document.querySelector('.portrait-core')).transform,
        };
      }, id);
      assert.equal(state.current, `#${id}`);
      assert.equal(state.locked, false);
      assert.equal(state.overflow, 0);
      assert.ok(Math.abs(state.brandOffset) < 1);
      assert.equal(state.photoTransform, 'none');
      results.push({ test: 'navigation', width, reducedMotion, ...state });
      if (id === 'projects') {
        await page.mouse.move(0, 0);
        await page.screenshot({ path: `artifacts/section-order-work-${width}-${reducedMotion}.png` });
        await page.locator('#open-projects').click();
        await page.waitForFunction(() => document.querySelector('#project-gallery').dataset.entryPhase === 'idle');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('#project-gallery').open && !document.documentElement.classList.contains('lenis-stopped'));
      }
      if (id === 'about') await page.screenshot({ path: `artifacts/section-order-about-${width}-${reducedMotion}.png` });
    }
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(`artifacts/section-order${process.env.QA_REDUCED_ONLY ? '-reduced' : ''}-qa.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
