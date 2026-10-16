import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const require = createRequire('C:/Users/Fahmi Aufa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const ready = () => page.waitForFunction(() => window.isMainPageReady && !document.querySelector('#loading-screen'));
  await page.goto('http://127.0.0.1:4175/', { waitUntil: 'domcontentloaded' });
  await ready();
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(700);
  const saved = await page.evaluate(() => scrollY);
  await page.addInitScript(({ saved }) => {
    // Simulate the browser-provided flag; real tab eviction is nondeterministic.
    Object.defineProperty(document, 'wasDiscarded', { value: true });
    history.replaceState({ ...history.state, portfolioScrollY: saved }, '');
  }, { saved });
  await page.goto('http://127.0.0.1:4175/?discard-qa', { waitUntil: 'commit' });
  await page.waitForFunction(() => document.querySelector('#loading-screen')?.dataset.reveal === 'lift');
  const opening = await page.evaluate(() => ({
    navigation: performance.getEntriesByType('navigation')[0].type,
    discarded: document.wasDiscarded,
    restoring: document.documentElement.classList.contains('is-restoring-visit'),
    signature: document.querySelector('.footer-signature').dataset.signatureReady,
    y: scrollY,
  }));
  assert.equal(opening.navigation, 'navigate');
  assert.equal(opening.discarded, true);
  assert.equal(opening.restoring, true);
  assert.equal(opening.signature, 'true');
  assert.ok(Math.abs(opening.y - saved) < 3);
  await ready();
  assert.equal(await page.locator('.loader-reveal-shield').count(), 0);
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, -500);
  await page.waitForFunction(previous => scrollY < previous - 100, before);
  const after = await page.evaluate(() => scrollY);
  // Ordinary tab suspension resumes the settled page without another loader.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
  await cdp.send('Page.setWebLifecycleState', { state: 'active' });
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#loading-screen').count(), 0);
  assert.deepEqual(errors, []);
  const result = { opening, saved, scrollUnlocked: { before, after }, simulatedDiscard: true, ordinaryResumeReplaysLoader: false, errors };
  await writeFile('artifacts/loader-discarded-qa.json', JSON.stringify(result, null, 2));
  console.log('PASS production discarded flag, complete 3D, restored scroll, input unlock, ordinary resume', JSON.stringify(result));
} finally { await browser.close(); }
