import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [], errors = [];
const brand = 'rgb(32, 35, 91)';
try {
  for (const [width, height] of [[1440,900],[820,1000],[390,844],[320,640]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: width === 320 ? 'reduce' : 'no-preference' });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen'));
    const config = await page.evaluate(async () => (await import('/src/transition/transition.config.js')).TRANSITION_CONFIG);
    assert.equal(config.colors.surface, '#20235b');
    assert.deepEqual(config.dust.color, [32/255,35/255,91/255]);
    // The navbar intentionally reveals only after leaving the painting hero.
    await page.locator('#about').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await page.locator('.studio-link[href="#about"]').click();
    await page.waitForFunction(() => location.hash === '#about' && !document.documentElement.classList.contains('is-colonnade-transitioning'));
    await page.waitForTimeout(500);
    const about = await page.locator('.about-reading-copy').first().evaluate(el => getComputedStyle(el).color);
    assert.equal(about, brand, 'About uses solid brand ink');
    assert.equal(await page.locator('.studio-link').first().evaluate(el => getComputedStyle(el).color), brand, 'light-surface navbar uses the same blue');
    await page.screenshot({ path: `artifacts/brand-blue-${width}-about.png` });
    await page.locator('.studio-link[href="#projects"]').click();
    await page.waitForFunction(() => location.hash === '#projects' && !document.documentElement.classList.contains('is-colonnade-transitioning'));
    await page.locator('#projects .orbit-card[data-index="0"]').focus();
    await page.keyboard.press('Home'); await page.waitForTimeout(700);
    assert.equal(await page.locator('#projects').evaluate(el => getComputedStyle(el).color), brand);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#project-gallery').open && document.querySelector('#project-gallery').dataset.scenePhase === 'idle');
    assert.equal(await page.locator('#orbit-detail-title').evaluate(el => getComputedStyle(el).color), brand, 'gallery title uses the same blue');
    const copy = await page.locator('.orbit-detail-description').evaluate(el => getComputedStyle(el).color);
    assert.equal(copy, brand, 'gallery body copy is not a faded blue');
    await page.screenshot({ path: `artifacts/brand-blue-${width}-detail.png` });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#project-gallery').open);
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(1300);
    const footerInk = await page.locator('.signature-footer').evaluate(el => getComputedStyle(el).getPropertyValue('--folio-ink').trim());
    assert.equal(footerInk, '#20235b');
    assert.equal(await page.locator('#contact').evaluate(el => getComputedStyle(el).backgroundColor), brand, 'footer base uses the same blue');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `artifacts/brand-blue-${width}-footer.png` });
    results.push({ width, about, gallery: copy, footerInk });
    console.log('PASS blue palette', width);
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile('artifacts/brand-blue-qa.json', JSON.stringify(results, null, 2));
} finally { await browser.close(); }
